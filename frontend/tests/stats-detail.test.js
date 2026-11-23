import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bandsMarkup, columnsMarkup, formatMinutes, formatMinutesCompact, yearComparison } from "../js/stats-detail.js";

test("minutes read as hours and minutes", () => {
  assert.equal(formatMinutes(0), "0 min");
  assert.equal(formatMinutes(45), "45 min");
  assert.equal(formatMinutes(120), "2 h");
  assert.equal(formatMinutes(185), "3 h 5 min");
  assert.equal(formatMinutesCompact(55), "55m");
  assert.equal(formatMinutesCompact(105), "1h45");
  assert.equal(formatMinutesCompact(120), "2h");
  assert.equal(formatMinutesCompact(185), "3h05");
});

test("this year is compared with the same stretch of last year", () => {
  assert.equal(yearComparison(14, 10, 2026), "14 inmersiones en 2026: 4 más que en el mismo periodo de 2025 (10).");
  assert.equal(yearComparison(1, 3, 2026), "1 inmersión en 2026: 2 menos que en el mismo periodo de 2025 (3).");
  assert.equal(yearComparison(5, 5, 2026), "5 inmersiones en 2026: las mismas que en el mismo periodo de 2025 (5).");
});

test("bars scale to the largest value and empty bands stay empty", () => {
  const bands = bandsMarkup([{ label: "0–12 m", total: 2 }, { label: "12–18 m", total: 0 }, { label: "18–30 m", total: 4 }]);
  assert.match(bands, /--band: 50%/);
  assert.match(bands, /--band: 0%/);
  assert.match(bands, /--band: 100%/);
  const columns = columnsMarkup([{ month: "2026-01", value: 0, label: "0" }, { month: "2026-02", value: 3, label: "3" }]);
  assert.match(columns, /--bar-height: 5%/);
  assert.match(columns, /--bar-height: 100%/);
});

test("labels from the API are escaped", () => {
  assert.doesNotMatch(bandsMarkup([{ label: "<img src=x>", total: 1 }]), /<img/);
});

test("initial tab state is rendered in the HTML (one selected tab, other panels hidden)", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const tabs = [...html.matchAll(/role="tab" id="stat-tab-(\w+)"[^>]*aria-selected="(true|false)"/g)];
  assert.deepEqual(tabs.map((match) => match[2]), ["true", "false", "false", "false"]);
  const panels = [...html.matchAll(/role="tabpanel" id="stat-panel-(\w+)"[^>]*>/g)].map((match) => match[0]);
  assert.equal(panels.length, 4);
  assert.doesNotMatch(panels[0], /hidden/);
  panels.slice(1).forEach((panel) => assert.match(panel, /hidden="until-found"/));
  assert.doesNotMatch(html, /aria-controls="stat-panel/);
});
