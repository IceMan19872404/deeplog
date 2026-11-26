const database = require("../config/database");
const { groupByDive } = require("./group-by-dive");

// Metadata the API returns; storage_key stays server-side.
const photoColumns = "id, dive_id, original_name, mime_type, size_bytes, created_at";

async function findByDiveIds(diveIds) {
  if (diveIds.length === 0) return new Map();

  const result = await database.query(
    `SELECT ${photoColumns}
       FROM dive_photos
      WHERE dive_id = ANY($1::bigint[])
      ORDER BY dive_id, created_at, id`,
    [diveIds]
  );
  return groupByDive(result.rows);
}

async function countByDiveId(diveId, db = database) {
  const result = await db.query(
    "SELECT COUNT(*)::INTEGER AS total FROM dive_photos WHERE dive_id = $1",
    [diveId]
  );
  return result.rows[0].total;
}

async function createMany(diveId, photos, db = database) {
  if (photos.length === 0) return [];

  const values = [];
  const placeholders = photos.map((photo, index) => {
    const offset = index * 5;
    values.push(
      diveId,
      photo.storageKey,
      photo.originalName,
      photo.mimeType,
      photo.sizeBytes
    );
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
  });
  const result = await db.query(
    `INSERT INTO dive_photos (
       dive_id, storage_key, original_name, mime_type, size_bytes
     ) VALUES ${placeholders.join(", ")}
     RETURNING ${photoColumns}`,
    values
  );
  return result.rows;
}

async function findOwnedPhoto(photoId, diveId, userId) {
  const result = await database.query(
    `SELECT p.id, p.dive_id, p.storage_key, p.original_name,
            p.mime_type, p.size_bytes, p.created_at
       FROM dive_photos p
       JOIN dives d ON d.id = p.dive_id
      WHERE p.id = $1 AND p.dive_id = $2 AND d.user_id = $3`,
    [photoId, diveId, userId]
  );
  return result.rows[0] || null;
}

async function removeOwnedPhoto(photoId, diveId, userId) {
  const result = await database.query(
    `DELETE FROM dive_photos p
      USING dives d
      WHERE p.id = $1
        AND p.dive_id = $2
        AND p.dive_id = d.id
        AND d.user_id = $3
      RETURNING p.storage_key`,
    [photoId, diveId, userId]
  );
  return result.rows[0] || null;
}

async function findStorageKeysByDiveId(diveId, db = database) {
  const result = await db.query(
    "SELECT storage_key FROM dive_photos WHERE dive_id = $1",
    [diveId]
  );
  return result.rows.map((row) => row.storage_key);
}

module.exports = {
  findByDiveIds,
  countByDiveId,
  createMany,
  findOwnedPhoto,
  removeOwnedPhoto,
  findStorageKeysByDiveId
};
