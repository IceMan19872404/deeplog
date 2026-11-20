const { ZipArchive } = require("archiver");
const fs = require("fs");
const path = require("path");
const { once } = require("events");
const { PassThrough } = require("stream");
const env = require("../config/env");
const accountRepository = require("../repositories/account.repository");
const userRepository = require("../repositories/user.repository");
const profileRepository = require("../repositories/profile.repository");
const toUserResponse = require("../utils/user-response");

const CSV_COLUMNS = [
  "sourceId", "name", "date", "durationMinutes", "maxDepthMeters",
  "ballastKg", "equipmentOwnership", "suitType", "suitThicknessMm",
  "cylinderMaterial", "cylinderVolumeLiters", "waterType", "diveCenter",
  "latitude", "longitude", "locationPrecision",
  "buddies", "comments", "photoNames", "createdAt", "updatedAt",
  "reflectionWentWell", "reflectionImproveNext", "reflectionPracticedSkill",
  "reflectionComfort", "reflectionIncidents", "reflectionNextGoal"
];

function dateOnly(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function mapProfile(profile) {
  if (!profile) return null;
  return {
    bio: profile.bio,
    certificationLevel: profile.certification_level,
    divingSince: profile.diving_since,
    shareNameByDefault: profile.share_name_by_default,
    hasPhoto: Boolean(profile.photo_storage_key),
    updatedAt: profile.updated_at
  };
}

function mapDive(row) {
  return {
    sourceId: String(row.id),
    name: row.name,
    date: dateOnly(row.dive_date),
    durationMinutes: row.duration_minutes,
    maxDepthMeters: Number(row.max_depth_meters),
    ballastKg: row.ballast_kg === null ? null : Number(row.ballast_kg),
    equipmentOwnership: row.equipment_ownership,
    suitType: row.suit_type,
    suitThicknessMm: row.suit_thickness_mm === null
      ? null : Number(row.suit_thickness_mm),
    cylinderMaterial: row.cylinder_material,
    cylinderVolumeLiters: row.cylinder_volume_liters === null
      ? null : Number(row.cylinder_volume_liters),
    waterType: row.water_type,
    diveCenter: row.dive_center,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    locationPrecision: row.location_precision,
    buddies: row.buddies,
    comments: row.comments,
    reflection: row.reflection,
    photos: row.photos.map((photo) => ({
      ...photo,
      sourceId: String(photo.id),
      archivePath: `photos/dive-${row.id}/${photo.id}-${safeName(photo.originalName)}`
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function* divesForUser(userId) {
  let afterId = 0;
  while (true) {
    const rows = await accountRepository.findDiveBatch(userId, afterId);
    if (rows.length === 0) return;
    for (const row of rows) yield mapDive(row);
    afterId = rows[rows.length - 1].id;
  }
}

async function writeChunk(stream, value) {
  if (!stream.write(value)) await once(stream, "drain");
}

function csvCell(value) {
  if (value === null || value === undefined) return "";
  let text = String(value);
  // Spreadsheet apps execute cells that start with = + - @ (CSV injection).
  // Only free text is prefixed; numbers such as negative longitudes stay intact.
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function writeJson(stream, user) {
  const header = {
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    source: "DeepLog",
    user: toUserResponse(user),
    profile: mapProfile(user.profile)
  };
  await writeChunk(stream, `${JSON.stringify(header).slice(0, -1)},"dives":[`);
  let first = true;
  for await (const dive of divesForUser(user.id)) {
    await writeChunk(stream, `${first ? "" : ","}${JSON.stringify(dive)}`);
    first = false;
  }
  stream.end("]}");
}

async function writeCsv(stream, userId) {
  await writeChunk(stream, `\ufeff${CSV_COLUMNS.join(",")}\r\n`);
  for await (const dive of divesForUser(userId)) {
    const values = {
      ...dive,
      buddies: dive.buddies.join(" | "),
      photoNames: dive.photos.map((photo) => photo.originalName).join(" | "),
      reflectionWentWell: dive.reflection?.wentWell,
      reflectionImproveNext: dive.reflection?.improveNext,
      reflectionPracticedSkill: dive.reflection?.practicedSkill,
      reflectionComfort: dive.reflection?.comfort,
      reflectionIncidents: dive.reflection?.incidents,
      reflectionNextGoal: dive.reflection?.nextGoal
    };
    await writeChunk(
      stream,
      `${CSV_COLUMNS.map((column) => csvCell(values[column])).join(",")}\r\n`
    );
  }
  stream.end();
}

function safeName(name) {
  const sanitized = path.basename(name).replace(/[^a-zA-Z0-9._-]+/g, "-");
  return sanitized || "photo";
}

async function appendPhotoFiles(archive, userId) {
  const photos = await accountRepository.findAllPhotoFiles(userId);
  photos.forEach((photo) => {
    const absolutePath = path.join(env.uploadsDir, photo.storage_key);
    archive.file(absolutePath, {
      name: `photos/dive-${photo.dive_id}/${photo.id}-${safeName(photo.original_name)}`
    });
  });
}

function appendProfilePhoto(archive, profile) {
  if (!profile?.photo_storage_key) return;
  archive.file(path.join(env.uploadsDir, profile.photo_storage_key), {
    name: `profile/${safeName(profile.photo_storage_key)}`
  });
}

async function streamArchive(response, user) {
  const archive = new ZipArchive({ zlib: { level: 6 } });
  archive.on("warning", (error) => archive.destroy(error));
  archive.on("error", (error) => response.destroy(error));
  archive.pipe(response);

  const jsonStream = new PassThrough();
  const csvStream = new PassThrough();
  archive.append(jsonStream, { name: "deeplog-export.json" });
  archive.append(csvStream, { name: "deeplog-dives.csv" });

  await Promise.all([
    writeJson(jsonStream, user),
    writeCsv(csvStream, user.id),
    appendPhotoFiles(archive, user.id),
    appendProfilePhoto(archive, user.profile)
  ]);
  await archive.finalize();
}

async function getUser(userId) {
  const [user, profile] = await Promise.all([
    userRepository.findById(userId),
    profileRepository.findByUserId(userId)
  ]);
  return { ...user, profile };
}

module.exports = {
  getUser,
  writeJson,
  writeCsv,
  streamArchive
};
