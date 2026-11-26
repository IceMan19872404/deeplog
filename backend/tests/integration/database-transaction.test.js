const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const database = require("../../src/config/database");

const probeTable = `tx_probe_${process.pid}`;

after(async () => {
  await database.query(`DROP TABLE IF EXISTS ${probeTable}`);
  await database.pool.end();
});

async function probeExists() {
  const result = await database.query("SELECT to_regclass($1) AS name", [probeTable]);
  return result.rows[0].name !== null;
}

test("withTransaction commits the work and returns its result", async () => {
  const result = await database.withTransaction(async (client) => {
    await client.query(`CREATE TABLE ${probeTable} (id INT)`);
    return "done";
  });
  assert.equal(result, "done");
  assert.equal(await probeExists(), true);
  await database.query(`DROP TABLE ${probeTable}`);
});

test("withTransaction rolls everything back when the work throws", async () => {
  await assert.rejects(database.withTransaction(async (client) => {
    await client.query(`CREATE TABLE ${probeTable} (id INT)`);
    throw new Error("abort");
  }), /abort/);
  assert.equal(await probeExists(), false);
  assert.equal(database.pool.totalCount - database.pool.idleCount, 0, "client released");
});
