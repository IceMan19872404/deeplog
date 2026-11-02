const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createAccessToken,
  verifyAccessToken,
  createShareToken,
  verifyShareTokenSafely
} = require("../../src/services/token.service");

test("access tokens preserve the user and revocable session family", () => {
  const payload = verifyAccessToken(createAccessToken(42, "family-42"));
  assert.equal(payload.sub, "42");
  assert.equal(payload.sid, "family-42");
  assert.equal(payload.iss, "deeplog-api");
  assert.equal(payload.aud, "deeplog-web");
});

test("share access tokens are scoped to one share", () => {
  const token = createShareToken("share-a");
  assert.equal(verifyShareTokenSafely(token, "share-a"), true);
  assert.equal(verifyShareTokenSafely(token, "share-b"), false);
  assert.equal(verifyShareTokenSafely("not-a-jwt", "share-a"), false);
  assert.equal(verifyShareTokenSafely(null, "share-a"), false);
});
