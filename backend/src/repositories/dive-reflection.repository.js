const database = require("../config/database");

const columns = `dive_id, went_well, improve_next, practiced_skill, comfort,
  incidents, next_goal, created_at, updated_at`;

async function findByDiveIds(diveIds) {
  if (diveIds.length === 0) return new Map();
  const result = await database.query(
    `SELECT ${columns} FROM dive_reflections WHERE dive_id = ANY($1::bigint[])`,
    [diveIds]
  );
  return new Map(result.rows.map((row) => [String(row.dive_id), row]));
}

async function upsert(diveId, reflection) {
  const result = await database.query(
    `INSERT INTO dive_reflections (
       dive_id, went_well, improve_next, practiced_skill, comfort, incidents, next_goal
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (dive_id) DO UPDATE SET
       went_well = EXCLUDED.went_well, improve_next = EXCLUDED.improve_next,
       practiced_skill = EXCLUDED.practiced_skill, comfort = EXCLUDED.comfort,
       incidents = EXCLUDED.incidents, next_goal = EXCLUDED.next_goal,
       updated_at = NOW()
     RETURNING ${columns}`,
    [diveId, reflection.wentWell, reflection.improveNext,
      reflection.practicedSkill, reflection.comfort,
      reflection.incidents, reflection.nextGoal]
  );
  return result.rows[0];
}

async function remove(diveId) {
  const result = await database.query(
    "DELETE FROM dive_reflections WHERE dive_id = $1 RETURNING dive_id", [diveId]
  );
  return Boolean(result.rows[0]);
}

module.exports = { findByDiveIds, upsert, remove };
