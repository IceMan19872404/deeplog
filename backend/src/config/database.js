const { Pool, types } = require("pg");
const env = require("./env");

// PostgreSQL DATE (OID 1082) has no time zone: keep it as "YYYY-MM-DD" instead of
// a JS Date at local midnight, which shifts the day when the server is not in UTC.
types.setTypeParser(1082, (value) => value);

const pool = new Pool({
  host: env.dbHost,
  port: env.dbPort,
  database: env.dbName,
  user: env.dbUser,
  password: env.dbPassword
});

async function query(text, params) {
  return pool.query(text, params);
}

async function checkDatabaseConnection() {
  await pool.query("SELECT 1");
}

// Runs `work(client)` inside BEGIN/COMMIT on a dedicated pool client and rolls
// back if it throws. Returning early (for example "nothing to do") commits.
async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  query,
  checkDatabaseConnection,
  withTransaction,
  pool
};
