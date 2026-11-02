const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const env = require("../config/env");
const AppError = require("../errors/app-error");
const repository = require("../repositories/profile.repository");
const { sanitizeImage } = require("../utils/image-sanitizer");

const extensionByMime = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

function absolutePath(key) {
  return path.join(env.uploadsDir, path.basename(key));
}

function validSignature(file) {
  if (file.mimetype === "image/jpeg") return file.buffer.length >= 3 && file.buffer[0] === 0xff && file.buffer[1] === 0xd8 && file.buffer[2] === 0xff;
  if (file.mimetype === "image/png") return file.buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (file.mimetype === "image/webp") return file.buffer.subarray(0, 4).toString("ascii") === "RIFF" && file.buffer.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}

function response(profile) {
  return {
    bio: profile?.bio || null,
    certificationLevel: profile?.certification_level || null,
    divingSince: profile?.diving_since || null,
    shareNameByDefault: profile?.share_name_by_default || false,
    photoUrl: profile?.photo_storage_key ? "/api/v1/profile/photo" : null,
    updatedAt: profile?.updated_at || null
  };
}

async function get(userId) {
  return response(await repository.findByUserId(userId));
}

async function update(userId, input) {
  return response(await repository.upsert(userId, input));
}

async function savePhoto(userId, file) {
  if (!file) throw new AppError(400, "PROFILE_PHOTO_REQUIRED", "Profile photo is required");
  if (!validSignature(file)) throw new AppError(400, "INVALID_PROFILE_PHOTO", "Profile photo content does not match its format");
  let cleanBuffer;
  try {
    cleanBuffer = await sanitizeImage(file.buffer, file.mimetype);
  } catch (_error) {
    throw new AppError(400, "INVALID_PROFILE_PHOTO", "Profile photo content does not match its format");
  }
  const previous = await repository.findByUserId(userId);
  const storageKey = `profile-${crypto.randomUUID()}${extensionByMime[file.mimetype]}`;
  await fs.mkdir(env.uploadsDir, { recursive: true });
  await fs.writeFile(absolutePath(storageKey), cleanBuffer, { flag: "wx" });
  try {
    const saved = await repository.replacePhoto(userId, {
      storageKey, mimeType: file.mimetype, sizeBytes: cleanBuffer.length
    });
    if (previous?.photo_storage_key) await fs.unlink(absolutePath(previous.photo_storage_key)).catch(() => undefined);
    return response(saved);
  } catch (error) {
    await fs.unlink(absolutePath(storageKey)).catch(() => undefined);
    throw error;
  }
}

async function getPhoto(userId) {
  const profile = await repository.findByUserId(userId);
  if (!profile?.photo_storage_key) throw new AppError(404, "PROFILE_PHOTO_NOT_FOUND", "Profile photo not found");
  return { path: absolutePath(profile.photo_storage_key), mimeType: profile.photo_mime_type };
}

async function deletePhoto(userId) {
  const profile = await repository.removePhoto(userId);
  if (!profile) throw new AppError(404, "PROFILE_PHOTO_NOT_FOUND", "Profile photo not found");
  await fs.unlink(absolutePath(profile.photo_storage_key)).catch(() => undefined);
}

module.exports = { get, update, savePhoto, getPhoto, deletePhoto };
