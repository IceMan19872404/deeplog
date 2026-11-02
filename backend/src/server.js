const app = require("./app");
const env = require("./config/env");
const { checkDatabaseConnection } = require("./config/database");
const runMigrations = require("./database/migrate");
const logger = require("./config/logger");
require("./config/monitoring");

async function startServer() {
  try {
    await checkDatabaseConnection();
    await runMigrations();

    app.listen(env.port, () => {
      logger.info({ event: "server_started", port: env.port }, "DeepLog API started");
    });
  } catch (error) {
    logger.fatal({ event: "startup_failed", errorName: error.name }, "Unable to start DeepLog API");
    process.exit(1);
  }
}

startServer();
