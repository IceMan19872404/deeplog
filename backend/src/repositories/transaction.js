const database = require("../config/database");

// Runs `work(client)` inside BEGIN/COMMIT on one pooled connection and rolls
// back if it throws. Repository functions accept that client as their last
// argument (defaulting to the pool) so services can group several of them.
async function withTransaction(work) {
  const client = await database.pool.connect();

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

module.exports = { withTransaction };
