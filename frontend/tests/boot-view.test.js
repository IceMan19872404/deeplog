import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const script = await readFile(new URL("../js/theme-init.js", import.meta.url), "utf8");

// Runs the pre-paint script and returns the data-boot it chose (or null).
function bootFor({ search = "", cookie = "" } = {}) {
  const attributes = {};
  const documentElement = { dataset: {}, setAttribute: (name, value) => { attributes[name] = value; } };
  vm.runInNewContext(script, {
    document: { documentElement, cookie },
    location: { search },
    localStorage: { getItem: () => null },
    window: {}
  });
  return attributes["data-boot"] ?? null;
}

test("a session hint paints the dashboard shell instead of the login", () => {
  assert.equal(bootFor({ cookie: "deeplog_csrf=abc123" }), "session");
  assert.equal(bootFor({ cookie: "other=1; deeplog_csrf=abc123" }), "session");
});

test("without a session hint the login stays the first view", () => {
  assert.equal(bootFor(), null);
  assert.equal(bootFor({ cookie: "deeplog_csrf=" }), null);
  assert.equal(bootFor({ cookie: "x_deeplog_csrf=abc" }), null);
});

test("share links paint the share view; reset links always show the login", () => {
  assert.equal(bootFor({ search: "?share=TOKEN" }), "share");
  assert.equal(bootFor({ search: "?share=TOKEN", cookie: "deeplog_csrf=abc" }), "share");
  assert.equal(bootFor({ search: "?share=" }), null);
  assert.equal(bootFor({ search: "?resetToken=T", cookie: "deeplog_csrf=abc" }), null);
});

test("app.js clears the boot hint whenever it shows a real view", async () => {
  const app = await readFile(new URL("../js/app.js", import.meta.url), "utf8");
  for (const name of ["showDashboard", "showAuth"]) {
    const body = app.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`))?.[0] || "";
    assert.match(body, /removeAttribute\("data-boot"\)/, `${name} must remove data-boot`);
  }
});
