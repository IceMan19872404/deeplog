const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const env = require("../config/env");
const AppError = require("../errors/app-error");
const photoRepository = require("../repositories/dive-photo.repository");
const { assertDiveOwner } = require("./dive-ownership");
const { sanitizeImage } = require("../utils/image-sanitizer");

const extensionByMimeType = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};

function photoPath(storageKey) {
  return path.join(env.uploadsDir, storageKey);
}

function hasValidSignature(file) {
  if (file.mimetype === "image/jpeg") {
    return file.buffer.length >= 3 &&
      file.buffer[0] === 0xff &&
      file.buffer[1] === 0xd8 &&
      file.buffer[2] === 0xff;
  }
  if (file.mimetype === "image/png") {
    return file.buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
  }
  if (file.mimetype === "image/webp") {
    return file.buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      file.buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }
  return false;
}

async function removeFiles(storageKeys) {
  await Promise.all(
    storageKeys.map((key) => fs.unlink(photoPath(key)).catch(() => undefined))
  );
}

async function addPhotos(userId, diveId, files = []) {
  await assertDiveOwner(userId, diveId);
  if (files.length === 0) {
    throw new AppError(400, "PHOTOS_REQUIRED", "At least one photo is required");
  }
  if (files.some((file) => !hasValidSignature(file))) {
    throw new AppError(
      400,
      "INVALID_PHOTO_CONTENT",
      "Photo content does not match its declared format"
    );
  }

  const existingCount = await photoRepository.countByDiveId(diveId);
  if (existingCount + files.length > 5) {
    throw new AppError(
      400,
      "PHOTO_LIMIT_EXCEEDED",
      "A dive can contain a maximum of 5 photos"
    );
  }

  let cleanBuffers;
  try {
    cleanBuffers = await Promise.all(
      files.map((file) => sanitizeImage(file.buffer, file.mimetype))
    );
  } catch (_error) {
    throw new AppError(
      400,
      "INVALID_PHOTO_CONTENT",
      "Photo content does not match its declared format"
    );
  }

  await fs.mkdir(env.uploadsDir, { recursive: true });
  const storedPhotos = files.map((file, index) => ({
    storageKey: `${crypto.randomUUID()}${extensionByMimeType[file.mimetype]}`,
    originalName: file.originalname.slice(0, 255),
    mimeType: file.mimetype,
    sizeBytes: cleanBuffers[index].length,
    buffer: cleanBuffers[index]
  }));

  try {
    await Promise.all(
      storedPhotos.map((photo) =>
        fs.writeFile(photoPath(photo.storageKey), photo.buffer, { flag: "wx" })
      )
    );
    return await photoRepository.createMany(diveId, storedPhotos);
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
  deletePhoto,
  removeFiles
};
