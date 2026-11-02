const { checkDatabaseConnection } = require("../config/database");

function getHealth(_req, res) {
  res.status(200).json({
    status: "ok",
    service: "deeplog-api",
    timestamp: new Date().toISOString()
  });
}

async function getReadiness(_req, res) {
  try {
    await checkDatabaseConnection();
    return res.status(200).json({
      status: "ready",
      service: "deeplog-api",
      dependencies: { database: "ok" },
      timestamp: new Date().toISOString()
    });
  } catch (_error) {
    return res.status(503).json({
      status: "unavailable",
      service: "deeplog-api",
      dependencies: { database: "unavailable" },
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = {
  getHealth,
  getReadiness
};
