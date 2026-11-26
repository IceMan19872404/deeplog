import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

// Browsers compile `pattern` as ^(?:pattern)$ with the `v` flag and ignore it
// silently when it does not compile, so a typo either blocks every value or
// none. Check each one against the same rules the API applies.
const newPasswordPatterns = [...html.matchAll(/<input[^>]*>/g)]
  .map(([tag]) => tag)
  .filter((tag) => /autocomplete="new-password"/.test(tag) && /\bpattern=/.test(tag))
  .map((tag) => new RegExp(`^(?:${tag.match(/\bpattern="([^"]*)"/)[1]})$`, "v"));

test("every pattern attribute compiles with the v flag", () => {
  const patterns = [...html.matchAll(/\bpattern="([^"]*)"/g)].map((match) => match[1]);
  assert.ok(patterns.length >= 2);
  for (const source of patterns) assert.doesNotThrow(() => new RegExp(`^(?:${source})$`, "v"), source);
});

test("new passwords accept what the API accepts (8-72, upper, lower, digit)", () => {
  assert.equal(newPasswordPatterns.length, 2, "register and reset password fields");
  newPasswordPatterns.forEach((pattern, index) => {
    const id = ["register", "reset"][index];
    assert.ok(pattern.test("DeepLog2026!"), `${id} accepts a valid password`);
    assert.ok(pattern.test("Abcdefg1"), `${id} accepts 8 characters`);
    assert.ok(pattern.test(`Ab1${"x".repeat(69)}`), `${id} accepts 72 characters`);
    assert.ok(!pattern.test(`Ab1${"x".repeat(70)}`), `${id} rejects 73 characters`);
    assert.ok(!pattern.test("Abcdef1"), `${id} rejects 7 characters`);
    assert.ok(!pattern.test("deeplog2026"), `${id} needs an uppercase letter`);
    assert.ok(!pattern.test("DEEPLOG2026"), `${id} needs a lowercase letter`);
    assert.ok(!pattern.test("DeepLogDive"), `${id} needs a digit`);
  });
});
