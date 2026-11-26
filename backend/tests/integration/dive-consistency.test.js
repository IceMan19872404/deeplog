const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const path = require("path");
const request = require("supertest");
const app = require("../../src/app");
const database = require("../../src/config/database");
const runMigrations = require("../../src/database/migrate");
const env = require("../../src/config/env");
const buddyRepository = require("../../src/repositories/dive-buddy.repository");

const runId = `${Date.now()}-${process.pid}`;
const email = `consistency-${runId}@example.com`;
const password = "DeepLog2026";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);
const baseDive = {
  name: "Consistency dive",
  date: "2025-03-10",
  durationMinutes: 40,
  maxDepthMeters: 14
};
let token;
let userId;

const authed = (req) => req.set("Authorization", `Bearer ${token}`);

async function createDive(overrides = {}) {
  const response = await authed(request(app).post("/api/v1/dives"))
    .send({ ...baseDive, ...overrides });
  assert.equal(response.status, 201);
  return response.body.data.dive.id;
}

function uploadPhotos(diveId, count) {
  let req = authed(request(app).post(`/api/v1/dives/${diveId}/photos`));
  for (let index = 0; index < count; index += 1) {
    req = req.attach("photos", png, { filename: `p${index}.png`, contentType: "image/png" });
  }
  return req;
}

async function storageKeys(diveId) {
  const result = await database.query(
    "SELECT storage_key FROM dive_photos WHERE dive_id = $1", [diveId]
  );
  return result.rows.map((row) => row.storage_key);
}

async function withFailingBuddyWrite(work) {
  const original = buddyRepository.replaceAll;
  buddyRepository.replaceAll = async () => { throw new Error("simulated buddy failure"); };
  try {
    return await work();
  } finally {
    buddyRepository.replaceAll = original;
  }
}

before(async () => {
  await runMigrations();
  const registered = await request(app).post("/api/v1/auth/register")
    .send({ firstName: "Consistency", lastName: "Check", email, password });
  assert.equal(registered.status, 201);
  userId = registered.body.data.user.id;
  const login = await request(app).post("/api/v1/auth/login").send({ email, password });
  token = login.body.data.accessToken;
});

after(async () => {
  await database.query("DELETE FROM users WHERE email = $1", [email]);
  await database.pool.end();
});

test("a failed buddy write does not leave a half-created dive", async () => {
  const before = await database.query("SELECT COUNT(*)::int AS n FROM dives WHERE user_id = $1", [userId]);
  const response = await withFailingBuddyWrite(() =>
    authed(request(app).post("/api/v1/dives")).send({ ...baseDive, buddies: ["Ana López"] })
  );
  assert.equal(response.status, 500);
  const afterwards = await database.query("SELECT COUNT(*)::int AS n FROM dives WHERE user_id = $1", [userId]);
  assert.equal(afterwards.rows[0].n, before.rows[0].n);
});

test("a failed buddy write leaves an updated dive as it was", async () => {
  const diveId = await createDive({ buddies: ["Ana López"] });
  const response = await withFailingBuddyWrite(() =>
    authed(request(app).put(`/api/v1/dives/${diveId}`))
      .send({ ...baseDive, name: "Renamed dive", buddies: ["Marcos Ruiz"] })
  );
  assert.equal(response.status, 500);

  const dive = await authed(request(app).get(`/api/v1/dives/${diveId}`));
  assert.equal(dive.body.data.dive.name, "Consistency dive");
  assert.deepEqual(dive.body.data.dive.buddies, ["Ana López"]);
});

test("concurrent uploads never store more than five photos on a dive", async () => {
  const diveId = await createDive();
  await fs.mkdir(env.uploadsDir, { recursive: true });
  const filesBefore = (await fs.readdir(env.uploadsDir)).length;
  const responses = await Promise.all([uploadPhotos(diveId, 3), uploadPhotos(diveId, 3)]);
  const statuses = responses.map((response) => response.status).sort();
  assert.deepEqual(statuses, [201, 400]);
  const rejected = responses.find((response) => response.status === 400);
  assert.equal(rejected.body.error.code, "PHOTO_LIMIT_EXCEEDED");

  const keys = await storageKeys(diveId);
  assert.equal(keys.length, 3);
  const files = await fs.readdir(env.uploadsDir);
  const accepted = responses.find((response) => response.status === 201);
  assert.equal(accepted.body.data.photos.length, 3);
  keys.forEach((key) => assert.ok(files.includes(key)));
  // The rejected upload removed the files it had already written.
  assert.equal(files.length, filesBefore + 3);
});

test("deleting a dive removes its photo files and rows", async () => {
  const diveId = await createDive();
  assert.equal((await uploadPhotos(diveId, 2)).status, 201);
  const keys = await storageKeys(diveId);
  assert.equal(keys.length, 2);

  const deleted = await authed(request(app).delete(`/api/v1/dives/${diveId}`));
  assert.equal(deleted.status, 204);
  assert.deepEqual(await storageKeys(diveId), []);
  for (const key of keys) {
    await assert.rejects(fs.access(path.join(env.uploadsDir, key)));
  }
});

test("shared photo URLs keep working after the owner deletes one of them", async () => {
  const diveId = await createDive();
  const uploaded = await uploadPhotos(diveId, 2);
  assert.equal(uploaded.status, 201);
  const [first, second] = uploaded.body.data.photos;

  const created = await authed(request(app).post(`/api/v1/dives/${diveId}/shares`))
    .send({ visibility: { photoIds: [Number(first.id), Number(second.id)] } });
  assert.equal(created.status, 201);
  const rawToken = new URL(created.body.data.shareUrl).searchParams.get("share");

  const removed = await authed(request(app).delete(`/api/v1/dives/${diveId}/photos/${first.id}`));
  assert.equal(removed.status, 204);

  const view = await request(app).get(`/api/v1/public/dives/${rawToken}`);
  assert.equal(view.status, 200);
  assert.equal(view.body.data.dive.photos.length, 1);
  assert.equal(view.body.data.dive.photos[0].originalName, second.originalName);

  const content = await request(app).get(view.body.data.dive.photos[0].url);
  assert.equal(content.status, 200);
  assert.equal(content.headers["content-type"], "image/png");
  const beyond = await request(app).get(`/api/v1/public/dives/${rawToken}/photos/2/content`);
  assert.equal(beyond.status, 404);
  assert.equal(beyond.body.error.code, "PHOTO_NOT_FOUND");
});
