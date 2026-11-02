const fs = require("fs/promises");
const path = require("path");
const { pool } = require("../config/database");

const migrationsDirectory = path.join(__dirname, "migrations");

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getPendingMigrations(client) {
  const files = (await fs.readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const result = await client.query("SELECT filename FROM schema_migrations");
  const executed = new Set(result.rows.map((row) => row.filename));

  return files.filter((file) => !executed.has(file));
}

async function runMigrations() {
  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);
    const pendingMigrations = await getPendingMigrations(client);

    for (const filename of pendingMigrations) {
      const sql = await fs.readFile(
        path.join(migrationsDirectory, filename),
        "utf8"
      );

      await client.query("BEGIN");

      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1)",
          [filename]
        );
        await client.query("COMMIT");
        console.log(`Applied migration: ${filename}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    client.release();
  }
}

module.exports = runMigrations;
