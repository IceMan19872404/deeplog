const diveRepository = require("../repositories/dive.repository");
const buddyRepository = require("../repositories/dive-buddy.repository");
const photoRepository = require("../repositories/dive-photo.repository");
const reflectionRepository = require("../repositories/dive-reflection.repository");
const { withTransaction } = require("../config/database");
const { removeFiles } = require("./photo-files");
const { assertDiveOwner, diveNotFound } = require("./dive-ownership");

// Buddies, photos and reflection for a whole page of dives: one query per
// relation, whatever the page size.
async function attachRelations(dives) {
  const diveIds = dives.map((dive) => dive.id);
  const [buddiesByDive, photosByDive, reflectionsByDive] = await Promise.all([
    buddyRepository.findByDiveIds(diveIds),
    photoRepository.findByDiveIds(diveIds),
    reflectionRepository.findByDiveIds(diveIds)
  ]);

  return dives.map((dive) => ({
    ...dive,
    buddies: buddiesByDive.get(String(dive.id)) || [],
    photos: photosByDive.get(String(dive.id)) || [],
    reflection: reflectionsByDive.get(String(dive.id)) || null
  }));
}

async function withRelations(dive) {
  return (await attachRelations([dive]))[0];
}

// The dive row and its buddies are written together: a failure leaves neither.
async function createDive(userId, input) {
  const dive = await withTransaction(async (client) => {
    const created = await diveRepository.create(userId, input, client);
    await buddyRepository.replaceAll(created.id, input.buddies, client);
    return created;
  });
  return withRelations(dive);
}

async function getDive(userId, diveId) {
  const dive = await diveRepository.findByIdAndUserId(diveId, userId);

  if (!dive) throw diveNotFound();

  return withRelations(dive);
}

async function listDives(userId, filters) {
  const result = await diveRepository.findAllByUserId(userId, filters);
  return {
    ...result,
    dives: await attachRelations(result.dives)
  };
}

async function getDiveStats(userId) {
  return diveRepository.getStatsByUserId(userId);
}

async function getDiveMap(userId) {
  return diveRepository.findMapByUserId(userId);
}

async function getDiveInsights(userId) {
  return diveRepository.getInsightsByUserId(userId);
}

async function getConfigurationMemory(userId, filters) {
  return diveRepository.findConfigurationMemory(userId, filters);
}

function normalizeReflection(input) {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, value || null])
  );
}

// Saves the reflection and returns the whole dive, as the endpoint responds.
async function saveReflection(userId, diveId, input) {
  await assertDiveOwner(userId, diveId);
  await reflectionRepository.upsert(diveId, normalizeReflection(input));
  return getDive(userId, diveId);
}

async function deleteReflection(userId, diveId) {
  await assertDiveOwner(userId, diveId);
  return reflectionRepository.remove(diveId);
}

async function updateDive(userId, diveId, input) {
  const dive = await withTransaction(async (client) => {
    const updated = await diveRepository.update(diveId, userId, input, client);
    if (!updated) throw diveNotFound();
    await buddyRepository.replaceAll(updated.id, input.buddies, client);
    return updated;
  });
  return withRelations(dive);
}

// The dive is locked before its photo keys are read, so a concurrent upload
// cannot add a file that the cascade would orphan. Files go after COMMIT.
async function deleteDive(userId, diveId) {
  const storageKeys = await withTransaction(async (client) => {
    if (!(await diveRepository.lockForUser(diveId, userId, client))) {
      throw diveNotFound();
    }
    const keys = await photoRepository.findStorageKeysByDiveId(diveId, client);
    await diveRepository.remove(diveId, userId, client);
    return keys;
  });
  await removeFiles(storageKeys);
}

module.exports = {
  createDive,
  getDive,
  listDives,
  getDiveStats,
  getDiveMap,
  getDiveInsights,
  getConfigurationMemory,
  saveReflection,
  deleteReflection,
  updateDive,
  deleteDive
};
