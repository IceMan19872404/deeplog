// Characterisation tests for the HTTP platform layer (error envelope, security
// headers, request IDs, upload limits, rate limiting, auth header parsing).
// None of these requests reach PostgreSQL, so they run without infrastructure.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");
const { z } = require("zod");
const app = require("../../src/app");
const AppError = require("../../src/errors/app-error");
const { errorHandler, notFoundHandler } = require("../../src/middlewares/error.middleware");
const authenticate = require("../../src/middlewares/auth.middleware");
const validate = require("../../src/middlewares/validate.middleware");
const uploadDivePhotos = require("../../src/middlewares/photo-upload.middleware");
const uploadProfilePhoto = require("../../src/middlewares/profile-photo-upload.middleware");
const { sharePasswordLimiter } = require("../../src/middlewares/share-rate-limit.middleware");

function miniApp(...handlers) {
  const mini = express();
  mini.use(express.json());
  mini.post("/target", ...handlers, (req, res) => {
    res.status(200).json({ files: req.files?.length ?? (req.file ? 1 : 0), body: req.body });
  });
  mini.use(notFoundHandler);
  mini.use(errorHandler);
  return mini;
}

const jpeg = (size = 16) => ({ buffer: Buffer.alloc(size, 0xff), options: { filename: "a.jpg", contentType: "image/jpeg" } });

test("error envelope covers app errors, malformed and oversized JSON, unknown routes and crashes", async () => {
  const mini = express();
  mini.get("/with-details", (_req, _res, next) => next(new AppError(409, "CONFLICT", "Busy", [{ field: "a" }])));
  mini.get("/plain", (_req, _res, next) => next(new AppError(403, "FORBIDDEN", "No")));
  mini.get("/crash", () => { throw new Error("secret detail"); });
  mini.use(notFoundHandler);
  mini.use(errorHandler);

  const detailed = await request(mini).get("/with-details");
  assert.equal(detailed.status, 409);
  assert.deepEqual(detailed.body, { error: { code: "CONFLICT", message: "Busy", details: [{ field: "a" }] } });

  const plain = await request(mini).get("/plain");
  assert.deepEqual(plain.body, { error: { code: "FORBIDDEN", message: "No" } });

  const crash = await request(mini).get("/crash");
  assert.equal(crash.status, 500);
  assert.deepEqual(crash.body, { error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" } });

  const invalidJson = await request(app).post("/api/v1/auth/login")
    .set("Content-Type", "application/json").send("{not json");
  assert.equal(invalidJson.status, 400);
  assert.deepEqual(invalidJson.body, { error: { code: "INVALID_JSON", message: "Request body must contain valid JSON" } });

  const tooLarge = await request(app).post("/api/v1/auth/login")
    .send({ email: "a@example.com", password: "x".repeat(110 * 1024) });
  assert.equal(tooLarge.status, 413);
  assert.deepEqual(tooLarge.body, { error: { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large" } });

  const missing = await request(app).get("/api/v1/does-not-exist?x=1");
  assert.equal(missing.status, 404);
  assert.deepEqual(missing.body, { error: { code: "ROUTE_NOT_FOUND", message: "Route GET /api/v1/does-not-exist?x=1 not found" } });
});

test("errors raised after the response has started do not corrupt it", async () => {
  const mini = express();
  mini.get("/stream", (_req, res, next) => {
    res.status(200).write("partial");
    next(new Error("stream failed"));
  });
  mini.use(errorHandler);

  // Express closes the connection; the client never sees a JSON error body.
  await assert.rejects(request(mini).get("/stream"));
});

test("every API response carries security headers and a safe request ID", async () => {
  const response = await request(app).get("/api/v1/health").set("X-Request-ID", "trace.id-123_ok");
  assert.equal(response.status, 200);
  assert.equal(response.headers["x-request-id"], "trace.id-123_ok");
  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.equal(response.headers["x-frame-options"], "SAMEORIGIN");
  assert.equal(response.headers["strict-transport-security"], undefined);
  assert.equal(response.headers["content-security-policy"], undefined);
  assert.equal(response.headers["x-powered-by"], undefined);

  const unsafe = await request(app).get("/api/v1/health").set("X-Request-ID", "bad id with spaces");
  assert.match(unsafe.headers["x-request-id"], /^[a-f0-9-]{36}$/);
});

test("validation middleware reports issues and replaces input with parsed data", async () => {
  const schema = z.object({ count: z.coerce.number().int().min(1) });
  const mini = miniApp(validate(schema));

  const ok = await request(mini).post("/target").send({ count: "3", ignored: true });
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.body.body, { count: 3 });

  const bad = await request(mini).post("/target").send({ count: 0 });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error.code, "VALIDATION_ERROR");
  assert.equal(bad.body.error.message, "Invalid request data");
  assert.equal(bad.body.error.details[0].field, "count");
});

test("authentication rejects missing, malformed and invalid bearer tokens", async () => {
  const mini = miniApp(authenticate);
  const cases = [
    [undefined, "AUTHENTICATION_REQUIRED"],
    ["Basic abc", "INVALID_AUTHORIZATION_HEADER"],
    ["Bearer", "INVALID_AUTHORIZATION_HEADER"],
    ["Bearer one two", "INVALID_AUTHORIZATION_HEADER"],
    ["Bearer not-a-jwt", "INVALID_ACCESS_TOKEN"]
  ];
  for (const [header, code] of cases) {
    const call = request(mini).post("/target");
    if (header) call.set("Authorization", header);
    const response = await call;
    assert.equal(response.status, 401, header);
    assert.equal(response.body.error.code, code, header);
  }
});

test("dive photo uploads enforce type, size, count and field limits", async () => {
  const mini = miniApp(uploadDivePhotos);

  const one = jpeg();
  const ok = await request(mini).post("/target").attach("photos", one.buffer, one.options);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.files, 1);

  const wrongType = await request(mini).post("/target")
    .attach("photos", Buffer.from("gif"), { filename: "a.gif", contentType: "image/gif" });
  assert.equal(wrongType.status, 400);
  assert.deepEqual(wrongType.body.error, { code: "UNSUPPORTED_PHOTO_TYPE", message: "Photos must use JPEG, PNG, or WebP" });

  const big = jpeg(8 * 1024 * 1024 + 1);
  const tooLarge = await request(mini).post("/target").attach("photos", big.buffer, big.options);
  assert.deepEqual(tooLarge.body.error, { code: "PHOTO_TOO_LARGE", message: "Each photo must be 8 MB or smaller" });

  let tooMany = request(mini).post("/target");
  for (let index = 0; index < 6; index += 1) tooMany = tooMany.attach("photos", one.buffer, one.options);
  const tooManyResponse = await tooMany;
  assert.equal(tooManyResponse.status, 400);
  assert.deepEqual(tooManyResponse.body.error, { code: "PHOTO_UPLOAD_LIMIT", message: "A maximum of 5 photos can be uploaded at once" });

  const extraField = await request(mini).post("/target").field("note", "x").attach("photos", one.buffer, one.options);
  assert.equal(extraField.body.error.code, "PHOTO_UPLOAD_LIMIT");
});

test("profile photo uploads enforce type, size and a single file", async () => {
  const mini = miniApp(uploadProfilePhoto);
  const one = jpeg();

  const ok = await request(mini).post("/target").attach("photo", one.buffer, one.options);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.files, 1);

  const wrongType = await request(mini).post("/target")
    .attach("photo", Buffer.from("gif"), { filename: "a.gif", contentType: "image/gif" });
  assert.deepEqual(wrongType.body.error, { code: "UNSUPPORTED_PROFILE_PHOTO", message: "Profile photo must use JPEG, PNG, or WebP" });

  const big = jpeg(3 * 1024 * 1024 + 1);
  const tooLarge = await request(mini).post("/target").attach("photo", big.buffer, big.options);
  assert.deepEqual(tooLarge.body.error, { code: "PROFILE_PHOTO_TOO_LARGE", message: "Profile photo must be 3 MB or smaller" });

  // Any other multer limit currently maps to the same code.
  const two = await request(mini).post("/target").attach("photo", one.buffer, one.options).attach("photo", one.buffer, one.options);
  assert.equal(two.status, 400);
  assert.equal(two.body.error.code, "PROFILE_PHOTO_TOO_LARGE");
});

test("rate limiters answer with the JSON error envelope and standard headers", async () => {
  const mini = express();
  mini.post("/unlock", sharePasswordLimiter, (_req, res) => res.status(401).json({ ok: false }));

  let limited;
  for (let attempt = 0; attempt < 11; attempt += 1) {
    limited = await request(mini).post("/unlock");
  }
  assert.equal(limited.status, 429);
  assert.deepEqual(limited.body, { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many attempts. Please try again later" } });
  assert.match(limited.headers["ratelimit-policy"], /shared_dive_passwords/);
  assert.ok(limited.headers["retry-after"]);
  assert.equal(limited.headers["x-ratelimit-limit"], undefined);
});

test("only unexpected errors are reported, by name and without their message", async () => {
  const logger = require("../../src/config/logger");
  const monitoring = require("../../src/config/monitoring");
  const originals = { error: logger.error, captureException: monitoring.captureException };
  const logged = [];
  const captured = [];
  logger.error = (fields, message) => logged.push([fields, message]);
  monitoring.captureException = (error, context) => captured.push([error.message, context]);

  const mini = express();
  mini.use((req, _res, next) => { req.requestId = "req-1"; next(); });
  mini.get("/expected", (_req, _res, next) => next(new AppError(400, "BAD", "Bad")));
  mini.get("/charset", (_req, _res, next) => next(Object.assign(new Error("charset"), { type: "charset.unsupported", status: 415 })));
  mini.get("/stream", (_req, res, next) => { res.status(200).write("partial"); next(new TypeError("stream failed")); });
  mini.get("/crash/:id", () => { throw new RangeError("private detail carlos@example.com"); });
  mini.use(notFoundHandler);
  mini.use(errorHandler);

  try {
    assert.equal((await request(mini).get("/expected")).status, 400);
    assert.equal((await request(mini).get("/missing")).status, 404);
    assert.equal(logged.length, 0);

    // Other body-parser failures are still treated as unexpected.
    const charset = await request(mini).get("/charset");
    assert.equal(charset.status, 500);

    const crash = await request(mini).get("/crash/7");
    assert.equal(crash.status, 500);
    assert.doesNotMatch(crash.text, /private detail/);

    await assert.rejects(request(mini).get("/stream"));

    assert.deepEqual(logged.map(([fields]) => fields.errorName), ["Error", "RangeError", "TypeError"]);
    assert.deepEqual(logged[1], [{ event: "unhandled_error", requestId: "req-1", errorName: "RangeError" }, "Unhandled request error"]);
    assert.deepEqual(captured[1], ["private detail carlos@example.com", { requestId: "req-1", method: "GET", route: "/crash/:id" }]);
    assert.equal(captured[2][1].route, "/stream");
  } finally {
    logger.error = originals.error;
    monitoring.captureException = originals.captureException;
  }
});
