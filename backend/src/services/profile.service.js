const AppError = require("../errors/app-error");
const repository = require("../repositories/profile.repository");
const {
  hasValidSignature,
  newStorageKey,
  photoPath,
  removeFiles,
  sanitizeOr,
  writeFiles
} = require("./photo-files");

const invalidProfilePhoto = () => new AppError(
  400,
  "INVALID_PROFILE_PHOTO",
  "Profile photo content does not match its format"
);
const profilePhotoNotFound = () => new AppError(
  404,
  "PROFILE_PHOTO_NOT_FOUND",
  "Profile photo not found"
);

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
  if (!hasValidSignature(file)) throw invalidProfilePhoto();
  const cleanBuffer = await sanitizeOr(file, invalidProfilePhoto);
  const previous = await repository.findByUserId(userId);
  const storageKey = newStorageKey(file.mimetype, "profile-");
  await writeFiles([{ storageKey, buffer: cleanBuffer }]);
  try {
    const saved = await repository.replacePhoto(userId, {
      storageKey, mimeType: file.mimetype, sizeBytes: cleanBuffer.length
    });
    if (previous?.photo_storage_key) await removeFiles([previous.photo_storage_key]);
    return response(saved);
  } catch (error) {
    await removeFiles([storageKey]);
    throw error;
  }
}

async function getPhoto(userId) {
  const profile = await repository.findByUserId(userId);
  if (!profile?.photo_storage_key) throw profilePhotoNotFound();
  return { path: photoPath(profile.photo_storage_key), mimeType: profile.photo_mime_type };
}

async function deletePhoto(userId) {
  const profile = await repository.removePhoto(userId);
  if (!profile) throw profilePhotoNotFound();
  await removeFiles([profile.photo_storage_key]);
}

module.exports = { get, update, savePhoto, getPhoto, deletePhoto };
