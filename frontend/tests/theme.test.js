import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readAllStyles } from "./styles.js";
import { THEME_KEY, readPreference, resolveTheme } from "../js/theme.js";

const memory = (value) => ({ getItem: (key) => (key === THEME_KEY ? value : null) });

test("Automático follows the system; Superficie and Abismo override it", () => {
  assert.equal(resolveTheme("auto", true), "dark");
  assert.equal(resolveTheme("auto", false), "light");
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
});

test("a missing, unknown or unreadable preference means Automático", () => {
  assert.equal(readPreference(memory(null)), "auto");
  assert.equal(readPreference(memory("sepia")), "auto");
  assert.equal(readPreference({ getItem() { throw new Error("blocked"); } }), "auto");
  assert.equal(readPreference(memory("dark")), "dark");
});

test("the theme is applied before the stylesheet to avoid a flash", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const init = html.indexOf("/js/theme-init.js");
  assert.ok(init > 0 && init < html.indexOf("/styles/"));
  const script = await readFile(new URL("../js/theme-init.js", import.meta.url), "utf8");
  assert.match(script, new RegExp(THEME_KEY.replace(".", "\\.")));
});

test("no hard-coded colours remain outside the token blocks", async () => {
  const css = await readAllStyles();
  const rules = css.replace(/:root(\[data-theme="dark"\])?\s*\{[^}]*\}/g, "");
  const literals = rules.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d/g) || [];
  assert.deepEqual(literals, []);
});
