const fs = require("fs/promises");
const path = require("path");
const { pool, withTransaction } = require("../config/database");
const logger = require("../config/logger");

const migrationsDirectory = path.join(__dirname, "migrations");

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getPendingMigrations() {
  const files = (await fs.readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const result = await pool.query("SELECT filename FROM schema_migrations");
  const executed = new Set(result.rows.map((row) => row.filename));

  return files.filter((file) => !executed.has(file));
}

// Applies each pending .sql file in name order, each one in its own
// transaction together with its schema_migrations row.
async function runMigrations() {
  await ensureMigrationsTable();

  for (const filename of await getPendingMigrations()) {
    const sql = await fs.readFile(path.join(migrationsDirectory, filename), "utf8");
    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
    });
    logger.info({ event: "migration_applied", filename }, "Applied migration");
  }
}

module.exports = runMigrations;
