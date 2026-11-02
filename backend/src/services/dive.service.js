const diveRepository = require("../repositories/dive.repository");
const buddyRepository = require("../repositories/dive-buddy.repository");
const photoRepository = require("../repositories/dive-photo.repository");
const reflectionRepository = require("../repositories/dive-reflection.repository");
const photoService = require("./dive-photo.service");
const AppError = require("../errors/app-error");

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

async function createDive(userId, input) {
  const dive = await diveRepository.create(userId, input);
  await buddyRepository.replaceAll(dive.id, input.buddies);
  return (await attachRelations([dive]))[0];
}

async function getDive(userId, diveId) {
  const dive = await diveRepository.findByIdAndUserId(diveId, userId);

  if (!dive) {
    throw new AppError(404, "DIVE_NOT_FOUND", "Dive not found");
  }

  return (await attachRelations([dive]))[0];
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

async function saveReflection(userId, diveId, input) {
  const dive = await diveRepository.findByIdAndUserId(diveId, userId);
  if (!dive) throw new AppError(404, "DIVE_NOT_FOUND", "Dive not found");
  return reflectionRepository.upsert(diveId, normalizeReflection(input));
}

async function deleteReflection(userId, diveId) {
  const dive = await diveRepository.findByIdAndUserId(diveId, userId);
  if (!dive) throw new AppError(404, "DIVE_NOT_FOUND", "Dive not found");
  return reflectionRepository.remove(diveId);
}

async function updateDive(userId, diveId, input) {
  const dive = await diveRepository.update(diveId, userId, input);

  if (!dive) {
    throw new AppError(404, "DIVE_NOT_FOUND", "Dive not found");
  }
  await buddyRepository.replaceAll(dive.id, input.buddies);
  return (await attachRelations([dive]))[0];
}

async function deleteDive(userId, diveId) {
  const storageKeys = await photoRepository.findStorageKeysByDiveId(diveId);
  const deleted = await diveRepository.remove(diveId, userId);

  if (!deleted) {
    throw new AppError(404, "DIVE_NOT_FOUND", "Dive not found");
  }
  await photoService.removeFiles(storageKeys);
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
