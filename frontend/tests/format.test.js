import test from "node:test";
import assert from "node:assert/strict";
import {
  cylinderSummary,
  escapeHtml,
  formatCalendarDate,
  formatMinutes,
  formatMinutesCompact,
  formatNumber,
  suitSummary,
  waterSummary
} from "../js/format.js";

test("numbers use a decimal comma", () => {
  assert.equal(formatNumber(38.9), "38,9");
  assert.equal(formatNumber("5.50"), "5,5");
  assert.equal(formatNumber(4.25), "4,25");
  assert.equal(formatNumber(18), "18");
  assert.equal(formatNumber(0), "0");
});

test("values that are not numbers pass through unchanged", () => {
  assert.equal(formatNumber(null), "");
  assert.equal(formatNumber(undefined), "");
  assert.equal(formatNumber("abc"), "abc");
});

test("escapeHtml escapes text and attribute values; null and undefined become empty", () => {
  assert.equal(escapeHtml(`<a href="x" title='y'>&</a>`), "&lt;a href=&quot;x&quot; title=&#039;y&#039;&gt;&amp;&lt;/a&gt;");
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(undefined), "");
  assert.equal(escapeHtml(0), "0");
  assert.equal(escapeHtml(12), "12");
});

test("calendar dates are read as local days, whatever the time zone", () => {
  // 2026-01-01T00:00 local: a UTC parse would show 31 December west of UTC.
  assert.equal(formatCalendarDate("2026-01-01", { day: "numeric", month: "long", year: "numeric" }), "1 de enero de 2026");
  assert.equal(formatCalendarDate("2026-09-03", { day: "2-digit", month: "long", year: "numeric" }), "03 de septiembre de 2026");
  assert.equal(formatCalendarDate("2026-03-01", { month: "narrow" }), "M");
});

test("durations read as hours and minutes, compact for narrow charts", () => {
  assert.equal(formatMinutes(null), "0 min");
  assert.equal(formatMinutes("75"), "1 h 15 min");
  assert.equal(formatMinutesCompact(undefined), "0m");
  assert.equal(formatMinutesCompact(65), "1h05");
});

test("equipment summaries for the printable story and the share page", () => {
  assert.equal(suitSummary({ suitType: "wetsuit", suitThicknessMm: 5 }), "Húmedo · 5 mm");
  assert.equal(suitSummary({ suitType: "drysuit", suitThicknessMm: null }), "Seco");
  assert.equal(suitSummary({ suitType: null, suitThicknessMm: 7.5 }), "7,5 mm");
  assert.equal(suitSummary({ suitType: null, suitThicknessMm: null }), "No indicado");
  assert.equal(cylinderSummary({ cylinderMaterial: "aluminum", cylinderVolumeLiters: "11.10" }), "Aluminio · 11,1 L");
  assert.equal(cylinderSummary({ cylinderMaterial: null, cylinderVolumeLiters: null }), "No indicada");
  assert.equal(waterSummary("salt"), "Salada");
  assert.equal(waterSummary("fresh"), "Dulce");
  assert.equal(waterSummary(null), "No indicada");
});
