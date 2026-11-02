const database = require("../config/database");

async function findByUserId(userId) {
  const result = await database.query(
    `SELECT user_id, bio, certification_level, diving_since,
            share_name_by_default, photo_storage_key, photo_mime_type,
            photo_size_bytes, created_at, updated_at
       FROM user_profiles
      WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function upsert(userId, profile) {
  const result = await database.query(
    `INSERT INTO user_profiles (
       user_id, bio, certification_level, diving_since, share_name_by_default
     ) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE SET
       bio = EXCLUDED.bio,
       certification_level = EXCLUDED.certification_level,
       diving_since = EXCLUDED.diving_since,
       share_name_by_default = EXCLUDED.share_name_by_default,
       updated_at = NOW()
     RETURNING *`,
    [
      userId,
      profile.bio || null,
      profile.certificationLevel || null,
      profile.divingSince || null,
      profile.shareNameByDefault
    ]
  );
  return result.rows[0];
}

async function replacePhoto(userId, photo) {
  const result = await database.query(
    `INSERT INTO user_profiles (
       user_id, photo_storage_key, photo_mime_type, photo_size_bytes
     ) VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE SET
       photo_storage_key = EXCLUDED.photo_storage_key,
       photo_mime_type = EXCLUDED.photo_mime_type,
       photo_size_bytes = EXCLUDED.photo_size_bytes,
       updated_at = NOW()
     RETURNING *`,
    [userId, photo.storageKey, photo.mimeType, photo.sizeBytes]
  );
  return result.rows[0];
}

async function removePhoto(userId) {
  const current = await findByUserId(userId);
  if (!current?.photo_storage_key) return null;
  await database.query(
    `UPDATE user_profiles
        SET photo_storage_key = NULL, photo_mime_type = NULL,
            photo_size_bytes = NULL, updated_at = NOW()
      WHERE user_id = $1`,
    [userId]
  );
  return current;
}

module.exports = { findByUserId, upsert, replacePhoto, removePhoto };
