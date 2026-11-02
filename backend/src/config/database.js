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

module.exports = {
  query,
  checkDatabaseConnection,
  pool
};
