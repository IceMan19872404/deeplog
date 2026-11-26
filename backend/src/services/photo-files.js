const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const env = require("../config/env");
const { sanitizeImage } = require("../utils/image-sanitizer");

// Private image files (dive photos and the profile photo) live in the uploads
// volume under random names; PostgreSQL only keeps the storage key (TD-013).

const extensionByMimeType = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};

// basename keeps every path inside the uploads directory.
function photoPath(storageKey) {
  return path.join(env.uploadsDir, path.basename(storageKey));
}

function newStorageKey(mimeType, prefix = "") {
  return `${prefix}${crypto.randomUUID()}${extensionByMimeType[mimeType]}`;
}

// The declared MIME type must match the file's magic bytes.
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

// Re-encodes without metadata (TD-032). An image that cannot be decoded gets
// the caller's error instead of sharp's.
async function sanitizeOr(file, invalidError) {
  try {
    return await sanitizeImage(file.buffer, file.mimetype);
  } catch (_error) {
    throw invalidError();
  }
}

// Never overwrites: storage keys are fresh UUIDs.
async function writeFiles(photos) {
  await fs.mkdir(env.uploadsDir, { recursive: true });
  await Promise.all(
    photos.map((photo) =>
      fs.writeFile(photoPath(photo.storageKey), photo.buffer, { flag: "wx" })
    )
  );
}

// Best effort: a file that is already gone is not an error.
async function removeFiles(storageKeys) {
  await Promise.all(
    storageKeys.map((key) => fs.unlink(photoPath(key)).catch(() => undefined))
  );
}

module.exports = {
  photoPath,
  newStorageKey,
  hasValidSignature,
  sanitizeOr,
  writeFiles,
  removeFiles
};
