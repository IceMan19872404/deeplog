import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readAllStyles } from "./styles.js";
import { MOTION_KEY, countUp, easeOutCubic, prefersReducedMotion } from "../js/motion.js";
import { profileSvg } from "../js/dive-profile.js";

test("easeOutCubic starts at 0, ends at 1 and front-loads the movement", () => {
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  assert.ok(easeOutCubic(0.5) > 0.5);
});

test("Reducir animaciones in Perfil wins even if the system allows motion", () => {
  assert.equal(prefersReducedMotion({ dataset: { motion: "reduced" } }), true);
  assert.equal(prefersReducedMotion({ dataset: {} }), false);
});

test("countUp writes the final value straight away when it cannot animate", () => {
  const element = { textContent: "—" };
  countUp(element, "—");
  assert.equal(element.textContent, "—");
  const same = { textContent: "21" };
  countUp(same, 21);
  assert.equal(same.textContent, "21");
  assert.doesNotThrow(() => countUp(null, 5));
});

test("the motion preference is applied before the first paint", async () => {
  const script = await readFile(new URL("../js/theme-init.js", import.meta.url), "utf8");
  assert.match(script, new RegExp(MOTION_KEY.replace(".", "\\.")));
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /data-motion-toggle/);
});

test("reduced motion also stops transitions and covers the in-app setting", async () => {
  const css = await readAllStyles();
  assert.match(css, /:root\[data-motion="reduced"\] \*/);
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduced.slice(0, 400), /transition-duration/);
});

test("the profile line is normalised so it can draw itself at any size", () => {
  assert.match(profileSvg(18, 45), /class="dive-profile-line"[^>]*pathLength="1"/);
});
