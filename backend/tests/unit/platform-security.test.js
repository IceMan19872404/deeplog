// Characterisation tests for security-sensitive platform behaviour: rate-limit
// policies, session cookies, CSRF checks, session rotation outcomes,
// production configuration guards, trust proxy and HSTS. They pin the current
// behaviour so refactors of config, middlewares and auth cannot change it.
// None of them needs PostgreSQL: repositories are replaced by in-memory stubs.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const express = require("express");
const request = require("supertest");
const app = require("../../src/app");
const env = require("../../src/config/env");
const authLimiters = require("../../src/middlewares/auth-rate-limit.middleware");
const shareLimiters = require("../../src/middlewares/share-rate-limit.middleware");
const {
  setSessionCookies,
  clearSessionCookies,
  readSessionCredentials
} = require("../../src/utils/auth-cookies");
const authService = require("../../src/services/auth.service");
const tokenService = require("../../src/services/token.service");
const sessionRepository = require("../../src/repositories/auth-session.repository");
const userRepository = require("../../src/repositories/user.repository");
const passwordResetRepository = require("../../src/repositories/password-reset.repository");

const backendRoot = path.join(__dirname, "..", "..");
// Hashing cost is read on every call; a low cost keeps these tests fast.
env.bcryptRounds = 4;
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

// Runs `code` in a fresh Node process so modules read a different environment.
function runIsolated(code, extraEnv) {
  const childEnv = { ...process.env, LOG_LEVEL: "silent", ...extraEnv };
  for (const [key, value] of Object.entries(childEnv)) {
    if (value === undefined) delete childEnv[key];
  }
  try {
    return { ok: true, output: execFileSync(process.execPath, ["-e", code], {
      cwd: backendRoot, env: childEnv, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]
    }).trim() };
  } catch (error) {
    return { ok: false, output: String(error.stderr) };
  }
}

// Replaces methods of a module object for the duration of `body`.
async function withStubs(target, stubs, body) {
  const originals = Object.fromEntries(Object.keys(stubs).map((key) => [key, target[key]]));
  Object.assign(target, stubs);
  try {
    return await body();
  } finally {
    Object.assign(target, originals);
  }
}

// Limiters are module singletons that count per client IP, so each mini app
// claims its own address to start from an empty counter.
let nextClientAddress = 1;
function limitedApp(limiter, routes) {
  const mini = express();
  mini.set("trust proxy", 1);
  const address = `198.51.100.${nextClientAddress++}`;
  for (const [route, status] of Object.entries(routes)) {
    mini.post(route, limiter, (_req, res) => res.status(status).json({}));
  }
  return (route) => request(mini).post(route).set("X-Forwarded-For", address);
}

async function rejectsWith(promise, statusCode, code) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.name, "AppError");
    assert.equal(error.statusCode, statusCode);
    assert.equal(error.code, code);
    return true;
  });
}

test("every rate limiter keeps its policy, window and standard headers", async () => {
  const expected = {
    loginLimiter: ["login_attempts", 10, 900],
    registerLimiter: ["registrations", 5, 3600],
    passwordRecoveryLimiter: ["password_recovery", 5, 900],
    passwordResetLimiter: ["password_reset", 10, 900],
    refreshLimiter: ["session_refresh", 60, 900],
    shareViewLimiter: ["shared_dive_views", 120, 900],
    sharePasswordLimiter: ["shared_dive_passwords", 10, 900]
  };
  const limiters = { ...authLimiters, ...shareLimiters };
  assert.deepEqual(Object.keys(limiters).sort(), Object.keys(expected).sort());

  for (const [name, [identifier, limit, windowSeconds]] of Object.entries(expected)) {
    const call = limitedApp(limiters[name], { "/target": 204 });
    const response = await call("/target");
    assert.equal(response.status, 204, name);
    assert.match(
      response.headers["ratelimit-policy"],
      new RegExp(`^"${identifier}"; q=${limit}; w=${windowSeconds}; pk=`),
      name
    );
    assert.equal(response.headers["ratelimit"], `"${identifier}"; r=${limit - 1}; t=${windowSeconds}`, name);
    assert.equal(response.headers["x-ratelimit-limit"], undefined, name);
  }
});

test("login and password limiters only count failed attempts", async () => {
  for (const [limiter, limit] of [[authLimiters.loginLimiter, 10], [authLimiters.passwordResetLimiter, 10], [shareLimiters.sharePasswordLimiter, 10]]) {
    const call = limitedApp(limiter, { "/ok": 200, "/fail": 401 });
    for (let attempt = 0; attempt < limit + 5; attempt += 1) {
      assert.equal((await call("/ok")).status, 200);
    }
    for (let attempt = 0; attempt < limit; attempt += 1) {
      assert.equal((await call("/fail")).status, 401);
    }
    assert.equal((await call("/fail")).status, 429);
  }
});

test("registration and recovery limiters count every attempt", async () => {
  for (const [limiter, limit] of [[authLimiters.registerLimiter, 5], [authLimiters.passwordRecoveryLimiter, 5]]) {
    const call = limitedApp(limiter, { "/ok": 200 });
    for (let attempt = 0; attempt < limit; attempt += 1) {
      assert.equal((await call("/ok")).status, 200);
    }
    const limited = await call("/ok");
    assert.equal(limited.status, 429);
    assert.deepEqual(limited.body, { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many attempts. Please try again later" } });
  }
});

test("client error telemetry is limited to 20 reports per 15 minutes", async () => {
  const signal = { kind: "error", source: "/js/app.js", line: 1, column: 2 };
  let response;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    response = await request(app).post("/api/v1/telemetry/client-errors").send(signal);
    assert.equal(response.status, 202);
  }
  assert.match(response.headers["ratelimit-policy"], /^"20-in-15min"; q=20; w=900; pk=/);

  const limited = await request(app).post("/api/v1/telemetry/client-errors").send(signal);
  assert.equal(limited.status, 429);
  assert.ok(limited.headers["retry-after"]);
  // OpenAPI documents this 429 as the JSON error envelope, like every limiter.
  assert.match(limited.headers["content-type"], /^application\/json/);
  assert.deepEqual(limited.body, { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many attempts. Please try again later" } });
});

test("session cookies keep their names, scope and flags", () => {
  const originalNodeEnv = env.nodeEnv;
  const capture = (nodeEnv, write) => {
    env.nodeEnv = nodeEnv;
    const headers = [];
    write({ append: (name, value) => headers.push([name, value]) });
    return headers;
  };
  try {
    const tokens = { refreshToken: "r".repeat(64), csrfToken: "c".repeat(64) };
    assert.deepEqual(capture("development", (res) => setSessionCookies(res, tokens)), [
      ["Set-Cookie", `deeplog_refresh=${"r".repeat(64)}; Path=/api/v1/auth; SameSite=Strict; HttpOnly; Max-Age=2592000`],
      ["Set-Cookie", `deeplog_csrf=${"c".repeat(64)}; Path=/; SameSite=Strict; Max-Age=2592000`]
    ]);
    assert.deepEqual(capture("production", (res) => setSessionCookies(res, { refreshToken: "a b", csrfToken: "x;y" })), [
      ["Set-Cookie", "deeplog_refresh=a%20b; Path=/api/v1/auth; SameSite=Strict; HttpOnly; Secure; Max-Age=2592000"],
      ["Set-Cookie", "deeplog_csrf=x%3By; Path=/; SameSite=Strict; Secure; Max-Age=2592000"]
    ]);
    assert.deepEqual(capture("development", clearSessionCookies), [
      ["Set-Cookie", "deeplog_refresh=; Path=/api/v1/auth; SameSite=Strict; HttpOnly; Max-Age=0"],
      ["Set-Cookie", "deeplog_csrf=; Path=/; SameSite=Strict; Max-Age=0"]
    ]);
    assert.deepEqual(capture("production", clearSessionCookies), [
      ["Set-Cookie", "deeplog_refresh=; Path=/api/v1/auth; SameSite=Strict; HttpOnly; Secure; Max-Age=0"],
      ["Set-Cookie", "deeplog_csrf=; Path=/; SameSite=Strict; Secure; Max-Age=0"]
    ]);
  } finally {
    env.nodeEnv = originalNodeEnv;
  }
});

test("session credentials come from both cookies and the CSRF header", () => {
  const fakeRequest = (headers) => ({ get: (name) => headers[name.toLowerCase()] });

  assert.deepEqual(readSessionCredentials(fakeRequest({})), {
    refreshToken: undefined, csrfCookie: undefined, csrfHeader: undefined
  });
  assert.deepEqual(readSessionCredentials(fakeRequest({
    cookie: "theme=dark; deeplog_refresh=a%20b;deeplog_csrf=c=d; flag",
    "x-csrf-token": "c=d"
  })), { refreshToken: "a b", csrfCookie: "c=d", csrfHeader: "c=d" });
  // Malformed percent-encoding yields an empty value instead of throwing.
  assert.deepEqual(readSessionCredentials(fakeRequest({ cookie: "deeplog_refresh=%E0%A4%A; deeplog_csrf=ok" })), {
    refreshToken: "", csrfCookie: "ok", csrfHeader: undefined
  });
});

test("session endpoints check the refresh cookie, then CSRF, and always clear cookies on failure", async () => {
  const cleared = [
    "deeplog_refresh=; Path=/api/v1/auth; SameSite=Strict; HttpOnly; Max-Age=0",
    "deeplog_csrf=; Path=/; SameSite=Strict; Max-Age=0"
  ];
  const cases = [
    ["/api/v1/auth/refresh", {}, 401, "REFRESH_TOKEN_REQUIRED"],
    ["/api/v1/auth/refresh", { Cookie: "deeplog_csrf=abc" }, 401, "REFRESH_TOKEN_REQUIRED"],
    ["/api/v1/auth/refresh", { Cookie: "deeplog_refresh=r; deeplog_csrf=abc" }, 403, "CSRF_VALIDATION_FAILED"],
    ["/api/v1/auth/refresh", { Cookie: "deeplog_refresh=r; deeplog_csrf=abc", "X-CSRF-Token": "abd" }, 403, "CSRF_VALIDATION_FAILED"],
    ["/api/v1/auth/refresh", { Cookie: "deeplog_refresh=r; deeplog_csrf=abc", "X-CSRF-Token": "abcd" }, 403, "CSRF_VALIDATION_FAILED"],
    ["/api/v1/auth/refresh", { Cookie: "deeplog_refresh=r", "X-CSRF-Token": "abc" }, 403, "CSRF_VALIDATION_FAILED"],
    ["/api/v1/auth/logout", {}, 401, "REFRESH_TOKEN_REQUIRED"],
    ["/api/v1/auth/logout", { Cookie: "deeplog_refresh=r; deeplog_csrf=abc" }, 403, "CSRF_VALIDATION_FAILED"]
  ];
  for (const [url, headers, status, code] of cases) {
    const response = await request(app).post(url).set(headers);
    const label = `${url} ${JSON.stringify(headers)}`;
    assert.equal(response.status, status, label);
    assert.equal(response.body.error.code, code, label);
    assert.deepEqual(response.headers["set-cookie"], cleared, label);
  }

  const noBearer = await request(app).post("/api/v1/auth/logout-all");
  assert.equal(noBearer.status, 401);
  assert.equal(noBearer.body.error.code, "AUTHENTICATION_REQUIRED");
  assert.equal(noBearer.headers["set-cookie"], undefined);
});

test("refresh rotates with hashes of the cookie and header and maps every outcome", async () => {
  const credentials = { refreshToken: "refresh-secret", csrfCookie: "csrf-secret", csrfHeader: "csrf-secret" };
  const calls = [];
  const rotatedUser = { id: 7, email: "diver@example.com" };
  let outcome = { status: "rotated", session: { user_id: 7, family_id: "family-7" }, user: rotatedUser };
  await withStubs(sessionRepository, {
    rotate: async (...args) => { calls.push(args); return outcome; }
  }, async () => {
    const before = Date.now();
    const result = await authService.refresh(credentials);
    const [currentHash, csrfHash, replacement] = calls[0];
    assert.equal(currentHash, sha256("refresh-secret"));
    assert.equal(csrfHash, sha256("csrf-secret"));
    assert.match(replacement.id, /^[0-9a-f-]{36}$/);
    assert.equal(replacement.tokenHash, sha256(result.refreshToken));
    assert.equal(replacement.csrfHash, sha256(result.csrfToken));
    const lifetime = replacement.expiresAt.getTime() - before;
    assert.ok(Math.abs(lifetime - env.refreshTokenDays * 86400000) < 5000);
    assert.match(result.refreshToken, /^[0-9a-f]{64}$/);
    assert.match(result.csrfToken, /^[0-9a-f]{64}$/);
    assert.notEqual(result.refreshToken, result.csrfToken);
    assert.equal(result.user, rotatedUser);
    assert.equal(result.tokenType, "Bearer");
    assert.equal(result.expiresIn, env.jwtExpiresIn);
    const payload = tokenService.verifyAccessToken(result.accessToken);
    assert.equal(payload.sub, "7");
    assert.equal(payload.sid, "family-7");

    outcome = { status: "reused" };
    await rejectsWith(authService.refresh(credentials), 401, "REFRESH_TOKEN_REUSED");
    outcome = { status: "expired" };
    await rejectsWith(authService.refresh(credentials), 401, "INVALID_REFRESH_TOKEN");
    outcome = { status: "invalid" };
    await rejectsWith(authService.refresh(credentials), 401, "INVALID_REFRESH_TOKEN");
    assert.equal(calls.length, 4);
  });
});

test("logout revokes the current family and logout-all also every other session", async () => {
  const credentials = { refreshToken: "refresh-secret", csrfCookie: "csrf-secret", csrfHeader: "csrf-secret" };
  const calls = [];
  let familyFound = true;
  await withStubs(sessionRepository, {
    revokeFamily: async (...args) => { calls.push(["revokeFamily", ...args]); return familyFound; },
    revokeAllForUser: async (...args) => { calls.push(["revokeAllForUser", ...args]); }
  }, async () => {
    assert.equal(await authService.logout(credentials), undefined);
    await authService.logoutAll(9, credentials);
    familyFound = false;
    await rejectsWith(authService.logout(credentials), 401, "INVALID_REFRESH_TOKEN");
    await rejectsWith(authService.logoutAll(9, credentials), 401, "INVALID_REFRESH_TOKEN");
    await rejectsWith(authService.logoutAll(9, { ...credentials, csrfHeader: "other" }), 403, "CSRF_VALIDATION_FAILED");
  });
  const revoke = ["revokeFamily", sha256("refresh-secret"), sha256("csrf-secret")];
  assert.deepEqual(calls, [revoke, revoke, ["revokeAllForUser", 9], revoke, revoke]);
});

test("login creates a new session family and rejects unknown accounts the same way", async () => {
  const bcrypt = require("bcryptjs");
  const passwordHash = await bcrypt.hash("DeepLog2026", 4);
  const created = [];
  const user = { id: 5, email: "diver@example.com", password_hash: passwordHash };
  await withStubs(userRepository, {
    findByEmail: async (email) => (email === "diver@example.com" ? user : null)
  }, () => withStubs(sessionRepository, {
    create: async (session) => { created.push(session); }
  }, async () => {
    const result = await authService.login({ email: "  Diver@Example.com ", password: "DeepLog2026" });
    assert.equal(result.user, user);
    const [session] = created;
    assert.equal(session.userId, 5);
    assert.match(session.id, /^[0-9a-f-]{36}$/);
    assert.match(session.familyId, /^[0-9a-f-]{36}$/);
    assert.notEqual(session.id, session.familyId);
    assert.equal(session.tokenHash, sha256(result.refreshToken));
    assert.equal(session.csrfHash, sha256(result.csrfToken));
    assert.equal(tokenService.verifyAccessToken(result.accessToken).sid, session.familyId);
    assert.deepEqual(Object.keys(result), ["user", "accessToken", "tokenType", "expiresIn", "refreshToken", "csrfToken"]);

    await rejectsWith(authService.login({ email: "diver@example.com", password: "Wrong2026" }), 401, "INVALID_CREDENTIALS");
    await rejectsWith(authService.login({ email: "nobody@example.com", password: "DeepLog2026" }), 401, "INVALID_CREDENTIALS");
    assert.equal(created.length, 1);
  }));
});

test("registration normalises the email and maps duplicates to 409", async () => {
  const bcrypt = require("bcryptjs");
  let existing = null;
  let insertError = null;
  const inserted = [];
  await withStubs(userRepository, {
    findByEmail: async () => existing,
    create: async (user) => {
      if (insertError) throw insertError;
      inserted.push(user);
      return { id: 1, email: user.email };
    }
  }, async () => {
    const input = { firstName: "Ana", lastName: "Mar", email: " Ana@Example.COM ", password: "DeepLog2026" };
    assert.deepEqual(await authService.register(input), { id: 1, email: "ana@example.com" });
    assert.equal(inserted[0].email, "ana@example.com");
    assert.equal(inserted[0].firstName, "Ana");
    assert.ok(await bcrypt.compare("DeepLog2026", inserted[0].passwordHash));

    insertError = Object.assign(new Error("duplicate"), { code: "23505" });
    await rejectsWith(authService.register(input), 409, "EMAIL_ALREADY_REGISTERED");
    insertError = new Error("connection lost");
    await assert.rejects(authService.register(input), /connection lost/);
    existing = { id: 2 };
    await rejectsWith(authService.register(input), 409, "EMAIL_ALREADY_REGISTERED");
  });
});

test("password reset tokens are opaque, hashed, short-lived and single-use", async () => {
  const bcrypt = require("bcryptjs");
  const stored = [];
  let consumed = true;
  await withStubs(userRepository, {
    findByEmail: async (email) => (email === "diver@example.com" ? { id: 3 } : null),
    findById: async (id) => (id === 3 ? { id: 3 } : null)
  }, () => withStubs(passwordResetRepository, {
    replaceForUser: async (...args) => { stored.push(args); },
    consume: async (...args) => { stored.push(args); return consumed; }
  }, async () => {
    assert.equal(await authService.requestPasswordReset({ email: "nobody@example.com" }), null);
    const before = Date.now();
    const token = await authService.requestPasswordReset({ email: " DIVER@example.com" });
    assert.match(token, /^[0-9a-f]{64}$/);
    const [userId, tokenHash, expiresAt] = stored[0];
    assert.equal(userId, 3);
    assert.equal(tokenHash, sha256(token));
    assert.ok(Math.abs(expiresAt.getTime() - before - 30 * 60 * 1000) < 5000);

    await authService.resetPassword({ token, password: "NewPass2026" });
    assert.equal(stored[1][0], sha256(token));
    assert.ok(await bcrypt.compare("NewPass2026", stored[1][1]));

    consumed = false;
    await assert.rejects(authService.resetPassword({ token, password: "NewPass2026" }), (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.code, "INVALID_OR_EXPIRED_RESET_TOKEN");
      assert.deepEqual(error.details, [{ field: "token", message: "Password reset token is invalid or expired" }]);
      return true;
    });

    assert.deepEqual(await authService.getCurrentUser(3), { id: 3 });
    await rejectsWith(authService.getCurrentUser(4), 401, "INVALID_ACCESS_TOKEN");
  }));
});

test("production refuses unsafe public origins and JWT secrets", () => {
  const strongSecret = "s".repeat(32);
  const load = (extraEnv) => runIsolated(
    "const env = require('./src/config/env'); process.stdout.write(JSON.stringify(env));",
    { NODE_ENV: "production", PUBLIC_APP_URL: "https://deeplog.example", JWT_SECRET: strongSecret, ...extraEnv }
  );

  const valid = load({ PUBLIC_APP_URL: "https://deeplog.example//" });
  assert.equal(valid.ok, true, valid.output);
  assert.equal(JSON.parse(valid.output).publicAppUrl, "https://deeplog.example");

  for (const publicAppUrl of [undefined, "http://deeplog.example", "https://deeplog.example/app", "deeplog.example"]) {
    const result = load({ PUBLIC_APP_URL: publicAppUrl });
    assert.equal(result.ok, false, publicAppUrl);
    assert.match(result.output, /PUBLIC_APP_URL must be the public https origin in production/);
  }
  for (const jwtSecret of [undefined, "development-only-change-me", "s".repeat(31), `replace-with-${"x".repeat(40)}`]) {
    const result = load({ JWT_SECRET: jwtSecret });
    assert.equal(result.ok, false, jwtSecret);
    assert.match(result.output, /JWT_SECRET must contain at least 32 random characters in production/);
  }

  const development = runIsolated(
    "process.stdout.write(JSON.stringify(require('./src/config/env')));",
    { NODE_ENV: "development", PUBLIC_APP_URL: undefined, JWT_SECRET: undefined, TRUST_PROXY_HOPS: undefined, PORT: undefined }
  );
  assert.equal(development.ok, true, development.output);
  const parsed = JSON.parse(development.output);
  assert.equal(parsed.jwtSecret, "development-only-change-me");
  assert.equal(parsed.publicAppUrl, "");
  assert.equal(parsed.trustProxyHops, 0);
  assert.equal(parsed.port, 3000);
  assert.equal(parsed.refreshTokenDays, 30);
  assert.equal(parsed.jwtExpiresIn, "15m");
});

test("trust proxy and HSTS follow the configuration", () => {
  const probe = `
    const request = require("supertest");
    const app = require("./src/app");
    request(app).get("/api/v1/health").set("X-Forwarded-For", "203.0.113.9").then((response) => {
      process.stdout.write(JSON.stringify({
        trustProxy: app.get("trust proxy"),
        queryParser: app.get("query parser"),
        hsts: response.headers["strict-transport-security"] || null,
        csp: response.headers["content-security-policy"] || null,
        poweredBy: response.headers["x-powered-by"] || null
      }));
    });
  `;
  const production = { NODE_ENV: "production", PUBLIC_APP_URL: "https://deeplog.example", JWT_SECRET: "s".repeat(32) };

  const behindProxy = runIsolated(probe, { ...production, TRUST_PROXY_HOPS: "1" });
  assert.equal(behindProxy.ok, true, behindProxy.output);
  assert.deepEqual(JSON.parse(behindProxy.output), {
    trustProxy: 1,
    queryParser: "simple",
    hsts: "max-age=31536000; includeSubDomains",
    csp: null,
    poweredBy: null
  });

  const direct = runIsolated(probe, { NODE_ENV: "development", TRUST_PROXY_HOPS: undefined });
  assert.equal(direct.ok, true, direct.output);
  assert.deepEqual(JSON.parse(direct.output), {
    trustProxy: false,
    queryParser: "simple",
    hsts: null,
    csp: null,
    poweredBy: null
  });
});

test("session endpoints answer with fresh cookies or cleared cookies and no-store", async () => {
  const cookieHeader = "deeplog_refresh=refresh-secret; deeplog_csrf=csrf-secret";
  const user = { id: 11, first_name: "Ana", last_name: "Mar", second_last_name: null, email: "ana@example.com", created_at: "2026-01-01", updated_at: "2026-01-01" };
  const accessToken = tokenService.createAccessToken(11, "family-11");
  await withStubs(sessionRepository, {
    rotate: async () => ({ status: "rotated", session: { user_id: 11, family_id: "family-11" }, user }),
    revokeFamily: async () => true,
    revokeAllForUser: async () => {},
    hasActiveFamily: async (userId, familyId) => userId === "11" && familyId === "family-11"
  }, async () => {
    const refreshed = await request(app).post("/api/v1/auth/refresh")
      .set("Cookie", cookieHeader).set("X-CSRF-Token", "csrf-secret");
    assert.equal(refreshed.status, 200);
    assert.equal(refreshed.headers["cache-control"], "no-store");
    const [refreshCookie, csrfCookie] = refreshed.headers["set-cookie"];
    assert.match(refreshCookie, /^deeplog_refresh=[0-9a-f]{64}; Path=\/api\/v1\/auth; SameSite=Strict; HttpOnly; Max-Age=2592000$/);
    assert.match(csrfCookie, /^deeplog_csrf=[0-9a-f]{64}; Path=\/; SameSite=Strict; Max-Age=2592000$/);
    assert.deepEqual(Object.keys(refreshed.body.data), ["user", "accessToken", "tokenType", "expiresIn"]);
    assert.equal(refreshed.body.data.user.email, "ana@example.com");
    assert.equal(refreshed.body.data.tokenType, "Bearer");

    const cleared = [
      "deeplog_refresh=; Path=/api/v1/auth; SameSite=Strict; HttpOnly; Max-Age=0",
      "deeplog_csrf=; Path=/; SameSite=Strict; Max-Age=0"
    ];
    for (const url of ["/api/v1/auth/logout", "/api/v1/auth/logout-all"]) {
      const response = await request(app).post(url)
        .set("Authorization", `Bearer ${accessToken}`)
        .set("Cookie", cookieHeader).set("X-CSRF-Token", "csrf-secret");
      assert.equal(response.status, 204, url);
      assert.equal(response.headers["cache-control"], "no-store", url);
      assert.deepEqual(response.headers["set-cookie"], cleared, url);
      assert.equal(response.text, "", url);
    }
  });
});
