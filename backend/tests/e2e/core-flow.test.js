const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../../src/app");
const database = require("../../src/config/database");
const runMigrations = require("../../src/database/migrate");

const email = `e2e-${Date.now()}-${process.pid}@example.com`;
const password = "DeepLog2026";

before(runMigrations);

after(async () => {
  await database.query("DELETE FROM users WHERE email = $1", [email]);
  await database.pool.end();
});

test("a new diver can register, sign in, create and retrieve a dive", async () => {
  const registration = await request(app).post("/api/v1/auth/register").send({
    firstName: "E2E",
    lastName: "Diver",
    email,
    password
  });
  assert.equal(registration.status, 201);
  assert.equal(registration.body.data.user.email, email);

  const login = await request(app).post("/api/v1/auth/login").send({ email, password });
  assert.equal(login.status, 200);
  assert.match(login.body.data.accessToken, /^[^.]+\.[^.]+\.[^.]+$/);

  const authorization = `Bearer ${login.body.data.accessToken}`;
  const created = await request(app)
    .post("/api/v1/dives")
    .set("Authorization", authorization)
    .send({
      name: "E2E Mediterranean Dive",
      date: "2025-08-12",
      durationMinutes: 47,
      maxDepthMeters: 18.5,
      ballastKg: 5,
      equipmentOwnership: "owned",
      buddies: ["Alex Mar"],
      waterType: "salt"
    });
  assert.equal(created.status, 201);
  const diveId = created.body.data.dive.id;

  const retrieved = await request(app)
    .get(`/api/v1/dives/${diveId}`)
    .set("Authorization", authorization);
  assert.equal(retrieved.status, 200);
  assert.equal(retrieved.body.data.dive.name, "E2E Mediterranean Dive");
  assert.equal(retrieved.body.data.dive.maxDepthMeters, 18.5);
  assert.deepEqual(retrieved.body.data.dive.buddies, ["Alex Mar"]);
});
