const database = require("../config/database");

const shareColumns = `
  s.id, s.public_id, s.dive_id, s.token_hash, s.password_hash,
  s.visibility, s.expires_at, s.revoked_at, s.created_at
`;

async function create(diveId, share) {
  const result = await database.query(
    `INSERT INTO dive_shares (
       public_id, dive_id, token_hash, password_hash, visibility, expires_at
     ) VALUES ($1, $2, $3, $4, $5::jsonb, $6)
     RETURNING public_id, dive_id, password_hash, visibility,
               expires_at, revoked_at, created_at`,
    [share.publicId, diveId, share.tokenHash, share.passwordHash,
      JSON.stringify(share.visibility), share.expiresAt]
  );
  return result.rows[0];
}

async function listOwned(diveId, userId) {
  const result = await database.query(
    `SELECT s.public_id, s.dive_id, s.password_hash, s.visibility,
            s.expires_at, s.revoked_at, s.created_at
       FROM dive_shares s
       JOIN dives d ON d.id = s.dive_id
      WHERE s.dive_id = $1 AND d.user_id = $2
      ORDER BY s.created_at DESC`,
    [diveId, userId]
  );
  return result.rows;
}

async function revokeOwned(publicId, diveId, userId) {
  const result = await database.query(
    `UPDATE dive_shares s SET revoked_at = COALESCE(s.revoked_at, NOW())
       FROM dives d
      WHERE s.public_id = $1 AND s.dive_id = $2
        AND s.dive_id = d.id AND d.user_id = $3
      RETURNING s.public_id`,
    [publicId, diveId, userId]
  );
  return Boolean(result.rows[0]);
}

async function findByTokenHash(tokenHash) {
  const result = await database.query(
    `SELECT ${shareColumns}, d.name, d.dive_date, d.duration_minutes,
            d.max_depth_meters, d.ballast_kg, d.equipment_ownership,
            d.suit_type, d.suit_thickness_mm, d.cylinder_material,
            d.cylinder_volume_liters, d.water_type,
            d.dive_center, d.comments, u.first_name, u.last_name
       FROM dive_shares s
       JOIN dives d ON d.id = s.dive_id
       JOIN users u ON u.id = d.user_id
      WHERE s.token_hash = $1`,
    [tokenHash]
  );
  return result.rows[0] || null;
}

async function findVisiblePhotos(diveId, photoIds) {
  if (photoIds.length === 0) return [];
  const result = await database.query(
    `SELECT id, storage_key, original_name, mime_type, size_bytes, created_at
       FROM dive_photos
      WHERE dive_id = $1 AND id = ANY($2::bigint[])
      ORDER BY array_position($2::bigint[], id)`,
    [diveId, photoIds]
  );
  return result.rows;
}

module.exports = { create, listOwned, revokeOwned, findByTokenHash, findVisiblePhotos };
