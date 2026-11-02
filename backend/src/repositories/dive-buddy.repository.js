const database = require("../config/database");

async function replaceAll(diveId, names) {
  const client = await database.pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM dive_buddies WHERE dive_id = $1", [diveId]);

    if (names.length > 0) {
      await client.query(
        `INSERT INTO dive_buddies (dive_id, name, position)
         SELECT $1, entry.name, entry.ordinality - 1
           FROM unnest($2::text[]) WITH ORDINALITY AS entry(name, ordinality)`,
        [diveId, names]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
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
  const grouped = new Map();

  result.rows.forEach((row) => {
    const key = String(row.dive_id);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row.name);
  });

  return grouped;
}

module.exports = {
  replaceAll,
  findByDiveIds
};
