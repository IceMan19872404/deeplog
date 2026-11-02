const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../../src/app");
const database = require("../../src/config/database");
const runMigrations = require("../../src/database/migrate");

const runId = `${Date.now()}-${process.pid}`;
const emails = [`profile-${runId}@example.com`, `profile-other-${runId}@example.com`];
const password = "DeepLog2026";
let token;
let otherToken;

async function createSession(email, firstName) {
  await request(app).post("/api/v1/auth/register").send({ firstName, lastName: "Profile", email, password });
  const login = await request(app).post("/api/v1/auth/login").send({ email, password });
  return login.body.data.accessToken;
}

before(async () => {
  await runMigrations();
  token = await createSession(emails[0], "Marina");
  otherToken = await createSession(emails[1], "Ona");
});

after(async () => {
  await database.query("DELETE FROM users WHERE email = ANY($1::text[])", [emails]);
  await database.pool.end();
});

test("a profile is private and stores experience and sharing preference", async () => {
  const saved = await request(app).put("/api/v1/profile")
    .set("Authorization", `Bearer ${token}`)
    .send({
      bio: "Me interesan la fotografía submarina y los pecios.",
      certificationLevel: "advanced",
      divingSince: 2019,
      shareNameByDefault: true
    });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.data.profile.certificationLevel, "advanced");
  assert.equal(saved.body.data.profile.shareNameByDefault, true);

  const own = await request(app).get("/api/v1/profile").set("Authorization", `Bearer ${token}`);
  const other = await request(app).get("/api/v1/profile").set("Authorization", `Bearer ${otherToken}`);
  assert.equal(own.body.data.profile.bio, "Me interesan la fotografía submarina y los pecios.");
  assert.equal(other.body.data.profile.bio, null);
});

test("profile photo validates content and remains owner-only", async () => {
  const invalid = await request(app).put("/api/v1/profile/photo")
    .set("Authorization", `Bearer ${token}`)
    .attach("photo", Buffer.from("not an image"), { filename: "avatar.png", contentType: "image/png" });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.code, "INVALID_PROFILE_PHOTO");

  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  const uploaded = await request(app).put("/api/v1/profile/photo")
    .set("Authorization", `Bearer ${token}`)
    .attach("photo", png, { filename: "avatar.png", contentType: "image/png" });
  assert.equal(uploaded.status, 200);
  assert.equal(uploaded.body.data.profile.photoUrl, "/api/v1/profile/photo");

  const content = await request(app).get("/api/v1/profile/photo").set("Authorization", `Bearer ${token}`);
  assert.equal(content.status, 200);
  assert.equal(content.headers["content-type"], "image/png");
  const otherContent = await request(app).get("/api/v1/profile/photo").set("Authorization", `Bearer ${otherToken}`);
  assert.equal(otherContent.status, 404);

  const removed = await request(app).delete("/api/v1/profile/photo").set("Authorization", `Bearer ${token}`);
  assert.equal(removed.status, 204);
});

test("profile rejects unknown fields and future experience dates", async () => {
  const response = await request(app).put("/api/v1/profile")
    .set("Authorization", `Bearer ${token}`)
    .send({ shareNameByDefault: false, divingSince: 2099, ranking: 1 });
  assert.equal(response.status, 400);
});
