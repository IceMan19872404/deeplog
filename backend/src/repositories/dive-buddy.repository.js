const database = require("../config/database");
const { groupByDive } = require("./group-by-dive");

// Replaces the dive's buddy list, keeping the given order. Two statements:
// call it inside a transaction (see transaction.js) together with the dive
// write it belongs to.
async function replaceAll(diveId, names, db = database) {
  await db.query("DELETE FROM dive_buddies WHERE dive_id = $1", [diveId]);

  if (names.length > 0) {
    await db.query(
      `INSERT INTO dive_buddies (dive_id, name, position)
       SELECT $1, entry.name, entry.ordinality - 1
         FROM unnest($2::text[]) WITH ORDINALITY AS entry(name, ordinality)`,
      [diveId, names]
    );
  }
}

async function findByDiveIds(diveIds) {
  if (diveIds.length === 0) return new Map();

  const result = await database.query(
    `SELECT dive_id, name
       FROM dive_buddies
      WHERE dive_id = ANY($1::bigint[])
      ORDER BY dive_id, position`,
    [diveIds]
  );
  return groupByDive(result.rows, (row) => row.name);
}

module.exports = {
  replaceAll,
  findByDiveIds
};
