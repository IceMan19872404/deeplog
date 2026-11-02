const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../../src/app");
const database = require("../../src/config/database");
const runMigrations = require("../../src/database/migrate");

const email = `sessions-${Date.now()}-${process.pid}@example.com`;
const password = "DeepLog2026";

function cookieValue(response, name) {
  const cookie = response.headers["set-cookie"]?.find((value) => value.startsWith(`${name}=`));
  return cookie?.split(";", 1)[0].slice(name.length + 1);
}

before(async () => {
  await runMigrations();
  const registration = await request(app).post("/api/v1/auth/register").send({
    firstName: "Session",
    lastName: "Tester",
    email,
    password
  });
  assert.equal(registration.status, 201);
});

after(async () => {
  await database.query("DELETE FROM users WHERE email = $1", [email]);
  await database.pool.end();
});

test("login sets protected refresh and readable CSRF cookies", async () => {
  const login = await request(app).post("/api/v1/auth/login").send({ email, password });
  assert.equal(login.status, 200);
  const cookies = login.headers["set-cookie"];
  assert.equal(cookies.length, 2);
  assert.match(cookies.find((value) => value.startsWith("deeplog_refresh=")), /HttpOnly/);
  assert.match(cookies.find((value) => value.startsWith("deeplog_refresh=")), /SameSite=Strict/);
  assert.match(cookies.find((value) => value.startsWith("deeplog_refresh=")), /Path=\/api\/v1\/auth/);
  const csrfCookie = cookies.find((value) => value.startsWith("deeplog_csrf="));
  assert.doesNotMatch(csrfCookie, /HttpOnly/);
  assert.match(csrfCookie, /Path=\/(?:;|$)/);
});

test("refresh requires CSRF, rotates once, and detects token reuse", async () => {
  const login = await request(app).post("/api/v1/auth/login").send({ email, password });
  const refresh = cookieValue(login, "deeplog_refresh");
  const csrf = cookieValue(login, "deeplog_csrf");
  const cookieHeader = `deeplog_refresh=${refresh}; deeplog_csrf=${csrf}`;

  const missingCsrf = await request(app).post("/api/v1/auth/refresh").set("Cookie", cookieHeader);
  assert.equal(missingCsrf.status, 403);
  assert.equal(missingCsrf.body.error.code, "CSRF_VALIDATION_FAILED");

  const rotated = await request(app)
    .post("/api/v1/auth/refresh")
    .set("Cookie", cookieHeader)
    .set("X-CSRF-Token", csrf);
  assert.equal(rotated.status, 200);
  assert.notEqual(cookieValue(rotated, "deeplog_refresh"), refresh);
  assert.notEqual(cookieValue(rotated, "deeplog_csrf"), csrf);

  const reused = await request(app)
    .post("/api/v1/auth/refresh")
    .set("Cookie", cookieHeader)
    .set("X-CSRF-Token", csrf);
  assert.equal(reused.status, 401);
  assert.equal(reused.body.error.code, "REFRESH_TOKEN_REUSED");

  const revokedAccess = await request(app)
    .get("/api/v1/auth/me")
    .set("Authorization", `Bearer ${rotated.body.data.accessToken}`);
  assert.equal(revokedAccess.status, 401);
});

test("logout revokes only the current session family", async () => {
  const first = await request(app).post("/api/v1/auth/login").send({ email, password });
  const second = await request(app).post("/api/v1/auth/login").send({ email, password });
  const refresh = cookieValue(first, "deeplog_refresh");
  const csrf = cookieValue(first, "deeplog_csrf");

  const logout = await request(app)
    .post("/api/v1/auth/logout")
    .set("Cookie", `deeplog_refresh=${refresh}; deeplog_csrf=${csrf}`)
    .set("X-CSRF-Token", csrf);
  assert.equal(logout.status, 204);

  const revoked = await request(app).get("/api/v1/auth/me")
    .set("Authorization", `Bearer ${first.body.data.accessToken}`);
  const stillActive = await request(app).get("/api/v1/auth/me")
    .set("Authorization", `Bearer ${second.body.data.accessToken}`);
  assert.equal(revoked.status, 401);
  assert.equal(stillActive.status, 200);
});

test("logout-all revokes every session family for the user", async () => {
  const first = await request(app).post("/api/v1/auth/login").send({ email, password });
  const second = await request(app).post("/api/v1/auth/login").send({ email, password });
  const firstRefresh = cookieValue(first, "deeplog_refresh");
  const firstCsrf = cookieValue(first, "deeplog_csrf");

  const response = await request(app)
    .post("/api/v1/auth/logout-all")
    .set("Authorization", `Bearer ${first.body.data.accessToken}`)
    .set("Cookie", `deeplog_refresh=${firstRefresh}; deeplog_csrf=${firstCsrf}`)
    .set("X-CSRF-Token", firstCsrf);
  assert.equal(response.status, 204);

  for (const accessToken of [first.body.data.accessToken, second.body.data.accessToken]) {
    const me = await request(app).get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);
    assert.equal(me.status, 401);
  }
});
