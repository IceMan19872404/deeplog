import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import vm from "node:vm";
import { readAllStyles } from "./styles.js";
import { THEME_KEY, headerPreference, readPreference, resolveTheme } from "../js/theme.js";

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

test("the header buttons go back to Automático when they match the system", () => {
  assert.equal(headerPreference("light", false), "auto");
  assert.equal(headerPreference("dark", true), "auto");
  assert.equal(headerPreference("dark", false), "dark");
  assert.equal(headerPreference("light", true), "light");
});

// Runs js/theme-init.js against a minimal fake document.
async function runThemeInit({ stored = null, systemDark = false } = {}) {
  const source = await readFile(new URL("../js/theme-init.js", import.meta.url), "utf8");
  const metas = { "theme-color": { content: "#c9f6f1" }, "color-scheme": { content: "light dark" } };
  const documentElement = { dataset: {} };
  const matchMedia = (query) => ({ matches: query.includes("dark") && systemDark });
  const context = {
    localStorage: { getItem: (key) => (key === THEME_KEY ? stored : null) },
    matchMedia,
    location: { search: "" },
    document: {
      documentElement,
      cookie: "",
      querySelector: (selector) => metas[/name="([^"]+)"/.exec(selector)[1]]
    }
  };
  context.window = context;
  vm.runInNewContext(source, context);
  return { theme: documentElement.dataset.theme, themeColor: metas["theme-color"].content, scheme: metas["color-scheme"].content };
}

test("the pre-paint script sets both browser-UI metas for the resolved theme", async () => {
  assert.deepEqual(await runThemeInit({ systemDark: true }), { theme: "dark", themeColor: "#071a33", scheme: "light dark" });
  assert.deepEqual(await runThemeInit({ systemDark: false }), { theme: "light", themeColor: "#c9f6f1", scheme: "light dark" });
  assert.deepEqual(await runThemeInit({ stored: "light", systemDark: true }), { theme: "light", themeColor: "#c9f6f1", scheme: "light" });
  assert.deepEqual(await runThemeInit({ stored: "dark", systemDark: false }), { theme: "dark", themeColor: "#071a33", scheme: "dark" });
});

test("theme-init.js and theme.js use the same toolbar colours", async () => {
  const init = await readFile(new URL("../js/theme-init.js", import.meta.url), "utf8");
  const theme = await readFile(new URL("../js/theme.js", import.meta.url), "utf8");
  const colours = /THEME_COLORS = \{ light: "(#[0-9a-f]{6})", dark: "(#[0-9a-f]{6})" \}/.exec(theme);
  assert.ok(colours, "THEME_COLORS not found in theme.js");
  assert.ok(init.includes(`"${colours[1]}"`) && init.includes(`"${colours[2]}"`));
});

test("Sora is preloaded with the same URL as its @font-face", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readAllStyles();
  const face = /font-family: "Sora";\s*src: url\("([^"]+)"\)/.exec(css);
  assert.ok(face, "Sora @font-face not found");
  const preload = /<link rel="preload" href="([^"]+)" as="font" type="font\/woff2" crossorigin>/.exec(html);
  assert.ok(preload, "font preload with crossorigin not found");
  assert.equal(preload[1], face[1]);
});

test("every var(--name) without a fallback refers to a declared property", async () => {
  const css = await readAllStyles();
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const dir = new URL("../js/", import.meta.url);
  const scripts = await Promise.all((await readdir(dir)).map((name) => readFile(new URL(name, dir), "utf8")));
  const declared = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]));
  // Properties set from JS or inline styles (e.g. --bar-height, --reveal-x).
  for (const source of [html, ...scripts]) {
    for (const match of source.matchAll(/(--[\w-]+)/g)) declared.add(match[1]);
  }
  const missing = [...css.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)].map((match) => match[1]).filter((name) => !declared.has(name));
  assert.deepEqual([...new Set(missing)], []);
});
