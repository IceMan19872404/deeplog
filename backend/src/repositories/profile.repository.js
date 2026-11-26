const database = require("../config/database");
const { withTransaction } = require("./transaction");

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

// Sets the new photo and returns the profile row plus the key it replaced
// (previous_photo_storage_key). The old key is read under a row lock in the
// same transaction, so concurrent uploads each remove the file they replaced.
async function replacePhoto(userId, photo) {
  return withTransaction(async (client) => {
    const previous = await client.query(
      "SELECT photo_storage_key FROM user_profiles WHERE user_id = $1 FOR UPDATE",
      [userId]
    );
    const result = await client.query(
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
    return {
      ...result.rows[0],
      previous_photo_storage_key: previous.rows[0]?.photo_storage_key || null
    };
  });
}

// Clears the photo in one statement and returns the removed key, or null when
// there was no photo.
async function removePhoto(userId) {
  const result = await database.query(
    `UPDATE user_profiles p
        SET photo_storage_key = NULL, photo_mime_type = NULL,
            photo_size_bytes = NULL, updated_at = NOW()
       FROM (
         SELECT user_id, photo_storage_key
           FROM user_profiles
          WHERE user_id = $1 AND photo_storage_key IS NOT NULL
            FOR UPDATE
       ) previous
      WHERE p.user_id = previous.user_id
      RETURNING previous.photo_storage_key`,
    [userId]
  );
  return result.rows[0]?.photo_storage_key || null;
}

module.exports = { findByUserId, upsert, replacePhoto, removePhoto };
