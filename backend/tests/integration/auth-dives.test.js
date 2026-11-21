const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const path = require("path");
const request = require("supertest");
const app = require("../../src/app");
const database = require("../../src/config/database");
const runMigrations = require("../../src/database/migrate");
const { sanitizePath } = require("../../src/middlewares/request-logger.middleware");
const env = require("../../src/config/env");

const runId = `${Date.now()}-${process.pid}`;
const firstEmail = `integration-first-${runId}@example.com`;
const secondEmail = `integration-second-${runId}@example.com`;
const password = "DeepLog2026";

let firstToken;
let secondToken;
let firstDiveId;

async function register(email, firstName) {
  return request(app).post("/api/v1/auth/register").send({
    firstName,
    lastName: "Integration",
    email,
    password
  });
}

async function login(email) {
  const response = await request(app).post("/api/v1/auth/login").send({
    email,
    password
  });

  assert.equal(response.status, 200);
  return response.body.data.accessToken;
}

before(async () => {
  await runMigrations();

  assert.equal((await register(firstEmail, "First")).status, 201);
  assert.equal((await register(secondEmail, "Second")).status, 201);

  firstToken = await login(firstEmail);
  secondToken = await login(secondEmail);
});

after(async () => {
  await database.query("DELETE FROM users WHERE email = ANY($1::text[])", [
    [firstEmail, secondEmail]
  ]);
  await database.pool.end();
});

test("protected dive routes reject anonymous requests", async () => {
  const response = await request(app).get("/api/v1/dives");

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "AUTHENTICATION_REQUIRED");
  assert.match(response.headers["x-request-id"], /^[a-f0-9-]{36}$/);
  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.equal(response.headers["x-powered-by"], undefined);
  assert.equal(response.headers["access-control-allow-origin"], undefined);

  const statsResponse = await request(app).get("/api/v1/dives/stats");
  assert.equal(statsResponse.status, 401);
});

test("password recovery does not reveal whether an account exists", async () => {
  const response = await request(app)
    .post("/api/v1/auth/forgot-password")
    .send({ email: `missing-${runId}@example.com` });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.resetToken, undefined);
});

test("a reset token changes the password and can only be used once", async () => {
  const forgotResponse = await request(app)
    .post("/api/v1/auth/forgot-password")
    .send({ email: secondEmail });

  assert.equal(forgotResponse.status, 200);
  assert.match(forgotResponse.body.data.resetToken, /^[a-f0-9]{64}$/);

  const resetPayload = {
    token: forgotResponse.body.data.resetToken,
    password: "NewDeepLog2026"
  };
  const resetResponse = await request(app)
    .post("/api/v1/auth/reset-password")
    .send(resetPayload);
  assert.equal(resetResponse.status, 204);

  const revokedSession = await request(app)
    .get("/api/v1/auth/me")
    .set("Authorization", `Bearer ${secondToken}`);
  assert.equal(revokedSession.status, 401);

  const reuseResponse = await request(app)
    .post("/api/v1/auth/reset-password")
    .send(resetPayload);
  assert.equal(reuseResponse.status, 400);
  assert.equal(
    reuseResponse.body.error.code,
    "INVALID_OR_EXPIRED_RESET_TOKEN"
  );

  const oldLogin = await request(app).post("/api/v1/auth/login").send({
    email: secondEmail,
    password
  });
  assert.equal(oldLogin.status, 401);

  const newLogin = await request(app).post("/api/v1/auth/login").send({
    email: secondEmail,
    password: resetPayload.password
  });
  assert.equal(newLogin.status, 200);
  secondToken = newLogin.body.data.accessToken;
});

test("a user can create and retrieve a dive", async () => {
  const createResponse = await request(app)
    .post("/api/v1/dives")
    .set("Authorization", `Bearer ${firstToken}`)
    .send({
      name: "Integration Reef",
      date: "2025-06-15",
      durationMinutes: 52,
      maxDepthMeters: 21.75,
      ballastKg: 6.5,
      equipmentOwnership: "rented",
      suitType: "wetsuit",
      suitThicknessMm: 5,
      cylinderMaterial: "steel",
      cylinderVolumeLiters: 12,
      waterType: "salt",
      buddies: ["Ana López", "Marcos Ruiz"],
      diveCenter: "Integration Center",
      latitude: 41.70214,
      longitude: 2.99468,
      locationPrecision: "approximate",
      comments: "Automated test dive"
    });

  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body.data.dive.date, "2025-06-15");
  assert.equal(createResponse.body.data.dive.ballastKg, 6.5);
  assert.equal(
    createResponse.body.data.dive.equipmentOwnership,
    "rented"
  );
  assert.deepEqual(createResponse.body.data.dive.buddies, [
    "Ana López",
    "Marcos Ruiz"
  ]);
  assert.equal(createResponse.body.data.dive.suitType, "wetsuit");
  assert.equal(createResponse.body.data.dive.suitThicknessMm, 5);
  assert.equal(createResponse.body.data.dive.cylinderMaterial, "steel");
  assert.equal(createResponse.body.data.dive.cylinderVolumeLiters, 12);
  assert.equal(createResponse.body.data.dive.waterType, "salt");
  assert.deepEqual(createResponse.body.data.dive.location, {
    latitude: 41.7,
    longitude: 2.99,
    precision: "approximate"
  });
  firstDiveId = createResponse.body.data.dive.id;

  const getResponse = await request(app)
    .get(`/api/v1/dives/${firstDiveId}`)
    .set("Authorization", `Bearer ${firstToken}`);

  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.body.data.dive.name, "Integration Reef");
  assert.deepEqual(getResponse.body.data.dive.buddies, [
    "Ana López",
    "Marcos Ruiz"
  ]);
});

test("the private map returns only the authenticated user's rounded locations", async () => {
  const response = await request(app)
    .get("/api/v1/dives/map")
    .set("Authorization", `Bearer ${firstToken}`);
  assert.equal(response.status, 200);
  const point = response.body.data.dives.find((dive) => dive.id === firstDiveId);
  assert.equal(point.latitude, 41.7);
  assert.equal(point.longitude, 2.99);
  assert.equal(point.precision, "approximate");

  const otherUser = await request(app)
    .get("/api/v1/dives/map")
    .set("Authorization", `Bearer ${secondToken}`);
  assert.equal(otherUser.status, 200);
  assert.equal(otherUser.body.data.dives.some((dive) => dive.id === firstDiveId), false);
});

test("photos are private and can be removed by their owner", async () => {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64"
  );
  const uploadResponse = await request(app)
    .post(`/api/v1/dives/${firstDiveId}/photos`)
    .set("Authorization", `Bearer ${firstToken}`)
    .attach("photos", png, {
      filename: "reef.png",
      contentType: "image/png"
    });

  assert.equal(uploadResponse.status, 201);
  assert.equal(uploadResponse.body.data.photos.length, 1);
  const photo = uploadResponse.body.data.photos[0];

  const ownerContent = await request(app)
    .get(photo.url)
    .set("Authorization", `Bearer ${firstToken}`);
  assert.equal(ownerContent.status, 200);
  assert.equal(ownerContent.headers["content-type"], "image/png");

  const otherUserContent = await request(app)
    .get(photo.url)
    .set("Authorization", `Bearer ${secondToken}`);
  assert.equal(otherUserContent.status, 404);

  const deleteResponse = await request(app)
    .delete(`/api/v1/dives/${firstDiveId}/photos/${photo.id}`)
    .set("Authorization", `Bearer ${firstToken}`);
  assert.equal(deleteResponse.status, 204);

  const deletedContent = await request(app)
    .get(photo.url)
    .set("Authorization", `Bearer ${firstToken}`);
  assert.equal(deletedContent.status, 404);
});

test("another user cannot read, update, or delete the dive", async () => {
  const authorization = ["Authorization", `Bearer ${secondToken}`];

  const getResponse = await request(app)
    .get(`/api/v1/dives/${firstDiveId}`)
    .set(...authorization);
  assert.equal(getResponse.status, 404);

  const updateResponse = await request(app)
    .put(`/api/v1/dives/${firstDiveId}`)
    .set(...authorization)
    .send({
      name: "Unauthorized update",
      date: "2025-06-15",
      durationMinutes: 40,
      maxDepthMeters: 15
    });
  assert.equal(updateResponse.status, 404);

  const deleteResponse = await request(app)
    .delete(`/api/v1/dives/${firstDiveId}`)
    .set(...authorization);
  assert.equal(deleteResponse.status, 404);
});

test("the owner can update the dive", async () => {
  const response = await request(app)
    .put(`/api/v1/dives/${firstDiveId}`)
    .set("Authorization", `Bearer ${firstToken}`)
    .send({
      name: "Updated Integration Reef",
      date: "2025-06-16",
      durationMinutes: 55,
      maxDepthMeters: 22.5,
      ballastKg: 4,
      equipmentOwnership: "owned",
      suitType: "wetsuit",
      suitThicknessMm: 5,
      cylinderMaterial: "steel",
      cylinderVolumeLiters: 12,
      waterType: "salt",
      buddies: ["Lucía Martín"],
      diveCenter: "Updated Center",
      comments: "Updated by automated test"
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.dive.name, "Updated Integration Reef");
  assert.equal(response.body.data.dive.maxDepthMeters, 22.5);
  assert.equal(response.body.data.dive.ballastKg, 4);
  assert.equal(response.body.data.dive.equipmentOwnership, "owned");
  assert.deepEqual(response.body.data.dive.buddies, ["Lucía Martín"]);
});

test("a reflection is qualitative, private, and attached to its dive", async () => {
  const reflection = {
    wentWell: "Mantuve una flotabilidad estable.",
    improveNext: "Preparar antes la señalización.",
    practicedSkill: "Flotabilidad",
    comfort: "comfortable",
    incidents: "Sin incidencias.",
    nextGoal: "Practicar el ascenso con mayor regularidad."
  };
  const saved = await request(app)
    .put(`/api/v1/dives/${firstDiveId}/reflection`)
    .set("Authorization", `Bearer ${firstToken}`)
    .send(reflection);
  assert.equal(saved.status, 200);
  assert.deepEqual(saved.body.data.dive.reflection.wentWell, reflection.wentWell);
  assert.equal(saved.body.data.dive.reflection.comfort, "comfortable");

  const otherUser = await request(app)
    .put(`/api/v1/dives/${firstDiveId}/reflection`)
    .set("Authorization", `Bearer ${secondToken}`)
    .send({ nextGoal: "Should not be stored" });
  assert.equal(otherUser.status, 404);

  const empty = await request(app)
    .put(`/api/v1/dives/${firstDiveId}/reflection`)
    .set("Authorization", `Bearer ${firstToken}`)
    .send({ wentWell: "" });
  assert.equal(empty.status, 400);

  const dive = await request(app)
    .get(`/api/v1/dives/${firstDiveId}`)
    .set("Authorization", `Bearer ${firstToken}`);
  assert.equal(dive.body.data.dive.reflection.practicedSkill, "Flotabilidad");
});

test("configuration memory returns only the owner's matching dives", async () => {
  const response = await request(app)
    .get("/api/v1/dives/configuration-memory?waterType=salt&suitType=wetsuit&suitThicknessMm=5&cylinderMaterial=steel&cylinderVolumeLiters=12")
    .set("Authorization", `Bearer ${firstToken}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.data.dives.length, 1);
  assert.equal(response.body.data.dives[0].id, firstDiveId);
  assert.equal(response.body.data.dives[0].ballastKg, 4);

  const excluded = await request(app)
    .get(`/api/v1/dives/configuration-memory?waterType=salt&excludeDiveId=${firstDiveId}`)
    .set("Authorization", `Bearer ${firstToken}`);
  assert.equal(excluded.status, 200);
  assert.equal(excluded.body.data.dives.length, 0);

  const otherUser = await request(app)
    .get("/api/v1/dives/configuration-memory?waterType=salt")
    .set("Authorization", `Bearer ${secondToken}`);
  assert.equal(otherUser.status, 200);
  assert.equal(otherUser.body.data.dives.length, 0);

  const noCriteria = await request(app)
    .get("/api/v1/dives/configuration-memory")
    .set("Authorization", `Bearer ${firstToken}`);
  assert.equal(noCriteria.status, 400);
});

test("private share links expose only selected data and can be revoked", async () => {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64"
  );
  const upload = await request(app)
    .post(`/api/v1/dives/${firstDiveId}/photos`)
    .set("Authorization", `Bearer ${firstToken}`)
    .attach("photos", png, { filename: "shared-reef.png", contentType: "image/png" });
  assert.equal(upload.status, 201);
  const photoId = Number(upload.body.data.photos[0].id);

  const anonymousCreate = await request(app)
    .post(`/api/v1/dives/${firstDiveId}/shares`)
    .send({});
  assert.equal(anonymousCreate.status, 401);

  const created = await request(app)
    .post(`/api/v1/dives/${firstDiveId}/shares`)
    .set("Authorization", `Bearer ${firstToken}`)
    .send({
      expiresInDays: 7,
      visibility: {
        includeDiverName: true,
        includeCenter: false,
        includeEquipment: true,
        includeBuddies: true,
        includeComments: false,
        photoIds: [photoId]
      }
    });
  assert.equal(created.status, 201);
  assert.match(created.body.data.shareUrl, /\?share=[a-f0-9]{64}$/);
  assert.match(created.body.data.qrDataUrl, /^data:image\/png;base64,/);
  const rawToken = new URL(created.body.data.shareUrl).searchParams.get("share");
  const stored = await database.query(
    "SELECT token_hash FROM dive_shares WHERE public_id = $1",
    [created.body.data.share.id]
  );
  assert.notEqual(stored.rows[0].token_hash, rawToken);

  const publicView = await request(app).get(`/api/v1/public/dives/${rawToken}`);
  assert.equal(publicView.status, 200);
  const publicDive = publicView.body.data.dive;
  assert.equal(publicDive.name, "Updated Integration Reef");
  assert.equal(publicDive.diverName, "First Integration");
  assert.equal(publicDive.diveCenter, undefined);
  assert.equal(publicDive.comments, undefined);
  assert.equal(publicDive.id, undefined);
  assert.deepEqual(publicDive.buddies, ["Lucía Martín"]);
  assert.equal(publicDive.photos.length, 1);

  const photoContent = await request(app).get(publicDive.photos[0].url);
  assert.equal(photoContent.status, 200);
  assert.equal(photoContent.headers["content-type"], "image/png");

  const otherList = await request(app)
    .get(`/api/v1/dives/${firstDiveId}/shares`)
    .set("Authorization", `Bearer ${secondToken}`);
  assert.equal(otherList.status, 404);

  const revoke = await request(app)
    .delete(`/api/v1/dives/${firstDiveId}/shares/${created.body.data.share.id}`)
    .set("Authorization", `Bearer ${firstToken}`);
  assert.equal(revoke.status, 204);
  const revokedView = await request(app).get(`/api/v1/public/dives/${rawToken}`);
  assert.equal(revokedView.status, 410);
  assert.equal(revokedView.body.error.code, "SHARE_REVOKED");
});

test("password-protected shares require a scoped temporary token", async () => {
  const created = await request(app)
    .post(`/api/v1/dives/${firstDiveId}/shares`)
    .set("Authorization", `Bearer ${firstToken}`)
    .send({ expiresInDays: null, password: "Oceano-2026" });
  assert.equal(created.status, 201);
  const rawToken = new URL(created.body.data.shareUrl).searchParams.get("share");

  const locked = await request(app).get(`/api/v1/public/dives/${rawToken}`);
  assert.equal(locked.status, 401);
  assert.equal(locked.body.error.code, "SHARE_PASSWORD_REQUIRED");

  const wrong = await request(app)
    .post(`/api/v1/public/dives/${rawToken}/access`)
    .send({ password: "Incorrecta-2026" });
  assert.equal(wrong.status, 401);
  assert.equal(wrong.body.error.code, "INVALID_SHARE_PASSWORD");

  const unlocked = await request(app)
    .post(`/api/v1/public/dives/${rawToken}/access`)
    .send({ password: "Oceano-2026" });
  assert.equal(unlocked.status, 200);
  assert.ok(unlocked.body.data.accessToken);

  const authorized = await request(app)
    .get(`/api/v1/public/dives/${rawToken}`)
    .set("Authorization", `Bearer ${unlocked.body.data.accessToken}`);
  assert.equal(authorized.status, 200);
});

test("request log paths redact share tokens and omit query strings", () => {
  const token = "a".repeat(64);
  assert.equal(
    sanitizePath(`/api/v1/public/dives/${token}/photos/1/content?size=full`),
    "/api/v1/public/dives/[redacted]/photos/1/content"
  );
});

test("readiness verifies the database dependency", async () => {
  const response = await request(app).get("/api/v1/health/ready");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ready");
  assert.equal(response.body.dependencies.database, "ok");
});

test("client telemetry accepts only the technical allowlist", async () => {
  const accepted = await request(app)
    .post("/api/v1/telemetry/client-errors")
    .send({ kind: "error", source: "/dashboard", line: 42, column: 7 });
  assert.equal(accepted.status, 202);
  assert.equal(accepted.body.data.accepted, true);

  const rejected = await request(app)
    .post("/api/v1/telemetry/client-errors")
    .send({
      kind: "error",
      source: "/dashboard",
      line: 42,
      column: 7,
      message: "carlos@example.com"
    });
  assert.equal(rejected.status, 400);
});

test("filters and pagination only consider the authenticated user", async () => {
  const secondDiveResponse = await request(app)
    .post("/api/v1/dives")
    .set("Authorization", `Bearer ${firstToken}`)
    .send({
      name: "Shallow Bay",
      date: "2024-05-10",
      durationMinutes: 35,
      maxDepthMeters: 10,
      diveCenter: "Other Center"
    });
  assert.equal(secondDiveResponse.status, 201);

  const filteredResponse = await request(app)
    .get(
      "/api/v1/dives?dateFrom=2025-01-01&diveCenter=updated&minDepth=20&page=1&limit=1"
    )
    .set("Authorization", `Bearer ${firstToken}`);

  assert.equal(filteredResponse.status, 200);
  assert.equal(filteredResponse.body.meta.total, 1);
  assert.equal(filteredResponse.body.meta.totalPages, 1);
  assert.equal(filteredResponse.body.data.dives[0].id, firstDiveId);
  // Logbook numbers are chronological over every dive: the older Shallow Bay
  // is nº 1 even though the filter hides it.
  assert.equal(filteredResponse.body.data.dives[0].diveNumber, 2);

  const allResponse = await request(app)
    .get("/api/v1/dives")
    .set("Authorization", `Bearer ${firstToken}`);
  assert.deepEqual(
    allResponse.body.data.dives.map((dive) => dive.diveNumber),
    [2, 1]
  );
  const detailResponse = await request(app)
    .get(`/api/v1/dives/${secondDiveResponse.body.data.dive.id}`)
    .set("Authorization", `Bearer ${firstToken}`);
  assert.equal(detailResponse.body.data.dive.diveNumber, 1);

  const outOfRangeResponse = await request(app)
    .get("/api/v1/dives?page=99&limit=1")
    .set("Authorization", `Bearer ${firstToken}`);

  assert.equal(outOfRangeResponse.status, 200);
  assert.equal(outOfRangeResponse.body.data.dives.length, 0);
  assert.equal(outOfRangeResponse.body.meta.total, 2);
  assert.equal(outOfRangeResponse.body.meta.totalPages, 2);

  const secondUserResponse = await request(app)
    .get("/api/v1/dives")
    .set("Authorization", `Bearer ${secondToken}`);

  assert.equal(secondUserResponse.status, 200);
  assert.equal(secondUserResponse.body.meta.total, 0);
});

test("dashboard stats aggregate only the authenticated user's dives", async () => {
  const response = await request(app)
    .get("/api/v1/dives/stats")
    .set("Authorization", `Bearer ${firstToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.data.stats.totalDives, 2);
  assert.equal(response.body.data.stats.totalMinutes, 90);
  assert.equal(response.body.data.stats.maxDepthMeters, 22.5);
  assert.equal(response.body.data.stats.averageDepthMeters, 16.3);
  assert.equal(response.body.data.stats.longestDurationMinutes, 55);
  assert.equal(response.body.data.stats.favoriteCenter.name, "Updated Center");
  assert.equal(response.body.data.stats.favoriteCenter.total, 1);
  assert.equal(response.body.data.stats.monthlyActivity.length, 6);

  const emptyResponse = await request(app)
    .get("/api/v1/dives/stats")
    .set("Authorization", `Bearer ${secondToken}`);

  assert.equal(emptyResponse.status, 200);
  assert.equal(emptyResponse.body.data.stats.totalDives, 0);
  assert.equal(emptyResponse.body.data.stats.totalMinutes, 0);
  assert.equal(emptyResponse.body.data.stats.maxDepthMeters, null);
  assert.equal(emptyResponse.body.data.stats.longestDurationMinutes, null);
  assert.equal(emptyResponse.body.data.stats.favoriteCenter, null);
});

test("advanced insights explain personal patterns without mixing users", async () => {
  const response = await request(app)
    .get("/api/v1/dives/insights")
    .set("Authorization", `Bearer ${firstToken}`);

  assert.equal(response.status, 200);
  const insights = response.body.data.insights;
  assert.equal(insights.evolution.length, 2);
  assert.equal(insights.ballastConfigurations.length, 1);
  assert.equal(insights.ballastConfigurations[0].sampleSize, 1);
  assert.equal(insights.ballastConfigurations[0].averageBallastKg, 4);
  assert.equal(insights.equipmentOwnership.length, 1);
  assert.equal(insights.equipmentOwnership[0].type, "owned");
  assert.equal(insights.frequentBuddies[0].name, "Lucía Martín");
  assert.equal(insights.frequentCenters.length, 2);
  assert.equal(insights.reflectionEvolution.length, 1);
  assert.equal(insights.reflectionEvolution[0].practicedSkill, "Flotabilidad");
  assert.match(insights.methodology.warning, /not safety recommendations/i);

  const emptyResponse = await request(app)
    .get("/api/v1/dives/insights")
    .set("Authorization", `Bearer ${secondToken}`);
  assert.equal(emptyResponse.status, 200);
  assert.deepEqual(emptyResponse.body.data.insights.evolution, []);
  assert.deepEqual(emptyResponse.body.data.insights.ballastConfigurations, []);
  assert.deepEqual(emptyResponse.body.data.insights.frequentBuddies, []);
  assert.deepEqual(emptyResponse.body.data.insights.reflectionEvolution, []);
});

test("invalid filter ranges are rejected", async () => {
  const response = await request(app)
    .get("/api/v1/dives?minDepth=30&maxDepth=10")
    .set("Authorization", `Bearer ${firstToken}`);

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("ballast above 20 kg is rejected", async () => {
  const response = await request(app)
    .post("/api/v1/dives")
    .set("Authorization", `Bearer ${firstToken}`)
    .send({
      name: "Invalid Ballast Dive",
      date: "2025-06-15",
      durationMinutes: 40,
      maxDepthMeters: 15,
      ballastKg: 20.01,
      equipmentOwnership: "owned"
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
  assert.equal(response.body.error.details[0].field, "ballastKg");
});

test("account exports are portable and cross database batch boundaries", async () => {
  const userResult = await database.query("SELECT id FROM users WHERE email = $1", [firstEmail]);
  const userId = userResult.rows[0].id;
  const values = [];
  const placeholders = Array.from({ length: 205 }, (_, index) => {
    const offset = index * 6;
    values.push(
      userId,
      `Batch dive ${index + 1}`,
      "2024-01-01",
      40,
      15,
      "Large export test"
    );
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`;
  });
  await database.query(
    `INSERT INTO dives (user_id, name, dive_date, duration_minutes, max_depth_meters, comments)
     VALUES ${placeholders.join(",")}`,
    values
  );

  const jsonResponse = await request(app)
    .get("/api/v1/account/export.json")
    .set("Authorization", `Bearer ${firstToken}`);
  assert.equal(jsonResponse.status, 200);
  assert.equal(jsonResponse.body.formatVersion, 1);
  assert.equal(jsonResponse.body.user.email, firstEmail);
  assert.ok(jsonResponse.body.dives.length >= 205);
  assert.equal(
    jsonResponse.body.dives.find((dive) => dive.sourceId === String(firstDiveId))
      .reflection.practicedSkill,
    "Flotabilidad"
  );
  assert.equal(jsonResponse.headers["cache-control"], "no-store");

  const csvResponse = await request(app)
    .get("/api/v1/account/export.csv")
    .set("Authorization", `Bearer ${firstToken}`);
  assert.equal(csvResponse.status, 200);
  assert.match(csvResponse.text, /sourceId,name,date/);
  assert.match(csvResponse.text, /Batch dive 205/);

  await database.query(
    "DELETE FROM dives WHERE user_id = $1 AND comments = 'Large export test'",
    [userId]
  );
});

test("complete ZIP contains structured exports and private photos", async () => {
  const binaryParser = (response, callback) => {
    const chunks = [];
    response.on("data", (chunk) => chunks.push(chunk));
    response.on("end", () => callback(null, Buffer.concat(chunks)));
  };
  const response = await request(app)
    .get("/api/v1/account/export.zip")
    .set("Authorization", `Bearer ${firstToken}`)
    .buffer(true)
    .parse(binaryParser);

  assert.equal(response.status, 200);
  assert.equal(response.headers["content-type"], "application/zip");
  assert.equal(response.body.subarray(0, 2).toString("ascii"), "PK");
  assert.ok(response.body.includes(Buffer.from("deeplog-export.json")));
  assert.ok(response.body.includes(Buffer.from("deeplog-dives.csv")));
});

test("account deletion verifies the password and removes rows and photo files", async () => {
  const email = `integration-delete-${runId}@example.com`;
  assert.equal((await register(email, "Delete")).status, 201);
  const token = await login(email);
  const diveResponse = await request(app)
    .post("/api/v1/dives")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Disposable dive", date: "2025-01-01",
      durationMinutes: 30, maxDepthMeters: 10, buddies: []
    });
  const diveId = diveResponse.body.data.dive.id;
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64"
  );
  await request(app)
    .post(`/api/v1/dives/${diveId}/photos`)
    .set("Authorization", `Bearer ${token}`)
    .attach("photos", png, { filename: "delete.png", contentType: "image/png" });
  const photoResult = await database.query(
    "SELECT storage_key FROM dive_photos WHERE dive_id = $1", [diveId]
  );
  const photoPath = path.join(env.uploadsDir, photoResult.rows[0].storage_key);

  const wrongPassword = await request(app)
    .delete("/api/v1/account")
    .set("Authorization", `Bearer ${token}`)
    .send({ password: "WrongPassword", confirmation: "ELIMINAR" });
  assert.equal(wrongPassword.status, 400);
  assert.equal(wrongPassword.body.error.code, "INVALID_ACCOUNT_PASSWORD");

  const deleted = await request(app)
    .delete("/api/v1/account")
    .set("Authorization", `Bearer ${token}`)
    .send({ password, confirmation: "ELIMINAR" });
  assert.equal(deleted.status, 204);
  assert.equal((await database.query("SELECT 1 FROM users WHERE email = $1", [email])).rowCount, 0);
  await assert.rejects(fs.access(photoPath));

  const staleToken = await request(app)
    .get("/api/v1/auth/me")
    .set("Authorization", `Bearer ${token}`);
  assert.equal(staleToken.status, 401);
});

test("the owner can remove a reflection without deleting the dive", async () => {
  const deleted = await request(app)
    .delete(`/api/v1/dives/${firstDiveId}/reflection`)
    .set("Authorization", `Bearer ${firstToken}`);
  assert.equal(deleted.status, 204);

  const dive = await request(app)
    .get(`/api/v1/dives/${firstDiveId}`)
    .set("Authorization", `Bearer ${firstToken}`);
  assert.equal(dive.status, 200);
  assert.equal(dive.body.data.dive.reflection, null);
});

test("the owner can delete the dive", async () => {
  const deleteResponse = await request(app)
    .delete(`/api/v1/dives/${firstDiveId}`)
    .set("Authorization", `Bearer ${firstToken}`);

  assert.equal(deleteResponse.status, 204);

  const getResponse = await request(app)
    .get(`/api/v1/dives/${firstDiveId}`)
    .set("Authorization", `Bearer ${firstToken}`);

  assert.equal(getResponse.status, 404);
});

test("repeated invalid logins are rate limited", async () => {
  let limitedResponse;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const response = await request(app).post("/api/v1/auth/login").send({
      email: `rate-limit-${runId}@example.com`,
      password: "WrongPassword2026"
    });
    if (response.status === 429) {
      limitedResponse = response;
      break;
    }
  }

  assert.ok(limitedResponse, "Expected login attempts to be rate limited");
  assert.equal(limitedResponse.body.error.code, "RATE_LIMIT_EXCEEDED");
  assert.ok(limitedResponse.headers.ratelimit);
  assert.ok(limitedResponse.headers["retry-after"]);
});
