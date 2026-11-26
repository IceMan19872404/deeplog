const AppError = require("../errors/app-error");
const diveRepository = require("../repositories/dive.repository");
const photoRepository = require("../repositories/dive-photo.repository");
const { withTransaction } = require("../repositories/transaction");
const { assertDiveOwner, diveNotFound } = require("./dive-ownership");
const {
  hasValidSignature,
  newStorageKey,
  photoPath,
  removeFiles,
  sanitizeOr,
  writeFiles
} = require("./photo-files");

const invalidPhotoContent = () => new AppError(
  400,
  "INVALID_PHOTO_CONTENT",
  "Photo content does not match its declared format"
);

const MAX_PHOTOS_PER_DIVE = 5;

function assertPhotoRoom(existingCount, addedCount) {
  if (existingCount + addedCount > MAX_PHOTOS_PER_DIVE) {
    throw new AppError(
      400,
      "PHOTO_LIMIT_EXCEEDED",
      "A dive can contain a maximum of 5 photos"
    );
  }
}

async function addPhotos(userId, diveId, files = []) {
  await assertDiveOwner(userId, diveId);
  if (files.length === 0) {
    throw new AppError(400, "PHOTOS_REQUIRED", "At least one photo is required");
  }
  if (files.some((file) => !hasValidSignature(file))) throw invalidPhotoContent();

  // Early answer before the costly re-encoding; repeated under lock below.
  assertPhotoRoom(await photoRepository.countByDiveId(diveId), files.length);

  const cleanBuffers = await Promise.all(
    files.map((file) => sanitizeOr(file, invalidPhotoContent))
  );
  const storedPhotos = files.map((file, index) => ({
    storageKey: newStorageKey(file.mimetype),
    originalName: file.originalname.slice(0, 255),
    mimeType: file.mimetype,
    sizeBytes: cleanBuffers[index].length,
    buffer: cleanBuffers[index]
  }));

  try {
    await writeFiles(storedPhotos);
    // Lock the dive so two concurrent uploads cannot both pass the limit.
    return await withTransaction(async (client) => {
      if (!(await diveRepository.lockForUser(diveId, userId, client))) {
        throw diveNotFound();
      }
      assertPhotoRoom(await photoRepository.countByDiveId(diveId, client), files.length);
      return photoRepository.createMany(diveId, storedPhotos, client);
    });
  } catch (error) {
    await removeFiles(storedPhotos.map((photo) => photo.storageKey));
    throw error;
  }
}

async function getPhoto(userId, diveId, photoId) {
  const photo = await photoRepository.findOwnedPhoto(photoId, diveId, userId);
  if (!photo) throw new AppError(404, "PHOTO_NOT_FOUND", "Photo not found");
  return {
    ...photo,
    absolutePath: photoPath(photo.storage_key)
  };
}

async function deletePhoto(userId, diveId, photoId) {
  const photo = await photoRepository.removeOwnedPhoto(photoId, diveId, userId);
  if (!photo) throw new AppError(404, "PHOTO_NOT_FOUND", "Photo not found");
  await removeFiles([photo.storage_key]);
}

module.exports = {
  addPhotos,
  getPhoto,
  deletePhoto
};
