import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DEFAULT_TAB, TABS, hashForTab, isTabHash, tabFromHash } from "../js/tabs.js";

test("each section has its own address and unknown ones fall back to Inicio", () => {
  assert.equal(tabFromHash("#/mapa"), "mapa");
  assert.equal(tabFromHash("#/perfil/"), "perfil");
  assert.equal(tabFromHash("#/no-existe"), DEFAULT_TAB);
  assert.equal(tabFromHash(""), DEFAULT_TAB);
  assert.equal(hashForTab("estadisticas"), "#/estadisticas");
  assert.equal(hashForTab("otra"), "#/inicio");
});

test("the router ignores in-page anchors such as the skip link", () => {
  assert.equal(isTabHash("#main-content"), false);
  assert.equal(isTabHash("#/inmersiones"), true);
});

test("every tab has a link and a panel in the page, in depth order", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const links = [...html.matchAll(/data-tab-link="([a-z]+)"/g)].map((m) => m[1]);
  const panels = [...html.matchAll(/data-tab-panel="([a-z]+)"/g)].map((m) => m[1]);
  const ids = TABS.map((tab) => tab.id);
  assert.deepEqual(links, ids);
  assert.deepEqual(panels, ids);
  assert.deepEqual(TABS.map((tab) => tab.depth), ["0 m", "10 m", "20 m", "30 m", "40 m"]);
});
