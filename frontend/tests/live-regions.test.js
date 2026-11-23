import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const tagOf = (selector) => html.match(new RegExp(`<[a-z]+\\b[^>]*${selector}[^>]*>`))?.[0] || "";

test("lists and loading states are not live regions", () => {
  for (const selector of ['id="dives-list"', 'class="stats-grid"', 'id="dives-loading"', 'id="stats-loading"', 'id="advanced-insights-loading"']) {
    const tag = tagOf(selector);
    assert.ok(tag, selector);
    assert.doesNotMatch(tag, /aria-live|role="status"/, `${selector} should not be announced`);
  }
});

test("pagination announces only the page label", () => {
  assert.match(tagOf('id="page-label"'), /role="status"/);
});
