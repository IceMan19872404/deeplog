const database = require("../config/database");

const EXPORT_BATCH_SIZE = 100;

async function findDiveBatch(userId, afterId = 0) {
  const result = await database.query(
    `SELECT d.id, d.name, d.dive_date, d.duration_minutes,
            d.max_depth_meters, d.ballast_kg, d.equipment_ownership,
            d.suit_type, d.suit_thickness_mm, d.cylinder_material,
            d.cylinder_volume_liters, d.water_type, d.dive_center,
            d.latitude, d.longitude, d.location_precision,
            d.comments, d.created_at, d.updated_at,
            COALESCE(
              (SELECT jsonb_agg(b.name ORDER BY b.position)
                 FROM dive_buddies b WHERE b.dive_id = d.id), '[]'::jsonb
            ) AS buddies,
            COALESCE(
              (SELECT jsonb_agg(jsonb_build_object(
                 'id', p.id, 'originalName', p.original_name,
                 'mimeType', p.mime_type, 'sizeBytes', p.size_bytes,
                 'createdAt', p.created_at
               ) ORDER BY p.created_at, p.id)
                 FROM dive_photos p WHERE p.dive_id = d.id), '[]'::jsonb
            ) AS photos,
            (SELECT jsonb_build_object(
                'wentWell', r.went_well, 'improveNext', r.improve_next,
                'practicedSkill', r.practiced_skill, 'comfort', r.comfort,
                'incidents', r.incidents, 'nextGoal', r.next_goal,
                'createdAt', r.created_at, 'updatedAt', r.updated_at
              ) FROM dive_reflections r WHERE r.dive_id = d.id) AS reflection
       FROM dives d
      WHERE d.user_id = $1 AND d.id > $2
      ORDER BY d.id
      LIMIT $3`,
    [userId, afterId, EXPORT_BATCH_SIZE]
  );
  return result.rows;
}

async function findAllPhotoFiles(userId) {
  const result = await database.query(
    `SELECT p.id, p.dive_id, p.storage_key, p.original_name,
            p.mime_type, p.size_bytes
       FROM dive_photos p
       JOIN dives d ON d.id = p.dive_id
      WHERE d.user_id = $1
      ORDER BY d.id, p.id`,
    [userId]
  );
  return result.rows;
}

module.exports = {
  findDiveBatch,
  findAllPhotoFiles
};
