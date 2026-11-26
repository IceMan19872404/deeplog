const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  registerSchema,
  resetPasswordSchema
} = require("../../src/validations/auth.validation");
const {
  createDiveSchema,
  listDivesSchema,
  configurationMemorySchema
} = require("../../src/validations/dive.validation");
const { reflectionSchema } = require("../../src/validations/dive-reflection.validation");
const { profileSchema } = require("../../src/validations/profile.validation");

test("registration accepts a strong account and rejects unknown fields", () => {
  const valid = registerSchema.safeParse({
    firstName: "Carlos",
    lastName: "Cano",
    email: "carlos@example.com",
    password: "DeepLog2026"
  });
  assert.equal(valid.success, true);

  const invalid = registerSchema.safeParse({
    firstName: "Carlos",
    lastName: "Cano",
    email: "carlos@example.com",
    password: "DeepLog2026",
    role: "admin"
  });
  assert.equal(invalid.success, false);
});

test("password rules are shared by registration and recovery", () => {
  const weakRegistration = registerSchema.safeParse({
    firstName: "Carlos",
    lastName: "Cano",
    email: "carlos@example.com",
    password: "onlylowercase"
  });
  const weakReset = resetPasswordSchema.safeParse({
    token: "a".repeat(64),
    password: "onlylowercase"
  });
  assert.equal(weakRegistration.success, false);
  assert.equal(weakReset.success, false);
});

test("dive validation enforces physical and product limits", () => {
  const base = {
    name: "Cala Azul",
    date: "2025-07-16",
    durationMinutes: 50,
    maxDepthMeters: 24
  };
  assert.equal(createDiveSchema.safeParse({ ...base, ballastKg: 20 }).success, true);
  assert.equal(createDiveSchema.safeParse({ ...base, ballastKg: 20.01 }).success, false);
  assert.equal(createDiveSchema.safeParse({
    ...base, latitude: 41.7021, longitude: 2.9946, locationPrecision: "approximate"
  }).success, true);
  assert.equal(createDiveSchema.safeParse({ ...base, latitude: 41.7 }).success, false);
  assert.equal(createDiveSchema.safeParse({
    ...base, latitude: 91, longitude: 2.9, locationPrecision: "exact"
  }).success, false);
  assert.equal(createDiveSchema.safeParse({ ...base, date: "2025-02-30" }).success, false);
  assert.equal(createDiveSchema.safeParse({ ...base, durationMinutes: 301 }).success, false);
});

test("list filters reject inverted ranges and apply pagination defaults", () => {
  const defaults = listDivesSchema.parse({});
  assert.deepEqual(defaults, { page: 1, limit: 20 });
  assert.equal(listDivesSchema.safeParse({ dateFrom: "2025-02-01", dateTo: "2025-01-01" }).success, false);
  assert.equal(listDivesSchema.safeParse({ minDepth: "30", maxDepth: "10" }).success, false);
});

test("configuration memory requires context and reflection requires content", () => {
  assert.equal(configurationMemorySchema.safeParse({}).success, false);
  assert.equal(configurationMemorySchema.safeParse({ waterType: "salt" }).success, true);
  assert.equal(reflectionSchema.safeParse({ wentWell: "" }).success, false);
  assert.equal(reflectionSchema.safeParse({ nextGoal: "Mejorar el trim" }).success, true);
});

test("profile preferences are explicit and experience remains plausible", () => {
  assert.equal(profileSchema.safeParse({
    bio: "Fotografía submarina",
    certificationLevel: "advanced",
    divingSince: 2019,
    shareNameByDefault: false
  }).success, true);
  assert.equal(profileSchema.safeParse({ shareNameByDefault: false, divingSince: 2099 }).success, false);
  assert.equal(profileSchema.safeParse({ shareNameByDefault: false, ranking: 1 }).success, false);
});

test("share schemas fill visibility defaults and reject malformed path values", () => {
  const {
    createShareSchema,
    shareIdSchema,
    publicPhotoSchema
  } = require("../../src/validations/dive-share.validation");
  const { divePhotoIdSchema } = require("../../src/validations/dive.validation");

  const expected = {
    includeDiverName: false,
    includeCenter: true,
    includeEquipment: true,
    includeBuddies: true,
    includeComments: true,
    photoIds: []
  };
  assert.deepEqual(createShareSchema.parse({}).visibility, expected);
  assert.deepEqual(createShareSchema.parse({ visibility: {} }).visibility, expected);
  assert.equal(createShareSchema.parse({}).expiresInDays, 7);

  assert.equal(shareIdSchema.safeParse({ diveId: "07", shareId: "8c1f1f5e-3b7a-4c2e-9d55-1d2b3c4d5e6f" }).success, false);
  assert.equal(publicPhotoSchema.safeParse({ token: "A".repeat(64), position: "1" }).success, false);
  assert.deepEqual(publicPhotoSchema.parse({ token: "a".repeat(64), position: "2" }).position, 2);
  const photoId = divePhotoIdSchema.safeParse({ diveId: "1", photoId: "0" });
  assert.equal(photoId.error.issues[0].message, "Photo ID must be a positive integer");
});
