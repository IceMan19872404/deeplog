import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("background API reads forward a fetch priority", async () => {
  const calls = [];
  globalThis.document = { cookie: "" };
  globalThis.fetch = async (path, options) => {
    calls.push({ path, priority: options.priority });
    return new Response(JSON.stringify({ data: {} }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const { getDiveMap, getDiveInsights } = await import("../js/api.js");
  await getDiveMap({ priority: "low" });
  await getDiveInsights({ priority: "low" });
  await getDiveMap();
  assert.deepEqual(calls.map((call) => call.priority), ["low", "low", undefined]);
  delete globalThis.fetch;
  delete globalThis.document;
});

test("telemetry is sent with low priority", async () => {
  const source = await readFile(new URL("../js/client-monitoring.js", import.meta.url), "utf8");
  assert.match(source, /priority: "low"/);
});
