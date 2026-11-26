import test from "node:test";
import assert from "node:assert/strict";
import {
  countLabel,
  daysAgoLabel,
  escapeHtml,
  formatDate,
  formatLongToday,
  formatMonthYear
} from "../js/text.js";

test("escapeHtml neutralises every character that can open markup or an attribute", () => {
  assert.equal(escapeHtml(`<img src="x" onerror='y'>&`), "&lt;img src=&quot;x&quot; onerror=&#039;y&#039;&gt;&amp;");
  assert.equal(escapeHtml(5), "5");
});

test("API dates are local calendar days in Spanish", () => {
  assert.equal(formatDate("2026-11-01"), "01 nov 2026");
  assert.equal(formatDate("2026-01-31"), "31 ene 2026");
  assert.equal(formatMonthYear("2026-09-14"), "sept 26");
  assert.equal(formatLongToday(new Date(2026, 10, 26, 23, 30)), "jueves, 26 de noviembre");
});

test("days ago counts calendar days, whatever the time of day", () => {
  const now = new Date(2026, 10, 26, 23, 59);
  assert.equal(daysAgoLabel("2026-11-26", now), "hoy");
  assert.equal(daysAgoLabel("2026-11-27", now), "hoy");
  assert.equal(daysAgoLabel("2026-11-25", now), "ayer");
  assert.equal(daysAgoLabel("2026-11-16", now), "hace 10 días");
  assert.equal(daysAgoLabel("2026-11-25", new Date(2026, 10, 26, 0, 1)), "ayer");
});

test("countLabel picks singular only for exactly one", () => {
  assert.equal(countLabel(1, "foto", "fotos"), "1 foto");
  assert.equal(countLabel(0, "foto", "fotos"), "0 fotos");
  assert.equal(countLabel(3, "inmersión", "inmersiones"), "3 inmersiones");
});
