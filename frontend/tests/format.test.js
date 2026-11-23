import test from "node:test";
import assert from "node:assert/strict";
import { formatNumber } from "../js/format.js";

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
