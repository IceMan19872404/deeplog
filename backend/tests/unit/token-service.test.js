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

test("tokens are HS256, bound to issuer and audience, and short-lived", () => {
  const jwt = require("jsonwebtoken");
  const env = require("../../src/config/env");
  const access = jwt.decode(createAccessToken(1, "family-1"), { complete: true });
  const share = jwt.decode(createShareToken("share-a"), { complete: true });
  assert.equal(access.header.alg, "HS256");
  assert.equal(share.header.alg, "HS256");
  assert.equal(access.payload.exp - access.payload.iat, 15 * 60);
  assert.equal(share.payload.exp - share.payload.iat, 15 * 60);
  assert.deepEqual([share.payload.iss, share.payload.aud, share.payload.sub], ["deeplog-api", "deeplog-web", undefined]);

  const foreignAudience = jwt.sign({ sid: "f" }, env.jwtSecret, { algorithm: "HS256", issuer: "deeplog-api", audience: "other", subject: "1" });
  assert.throws(() => verifyAccessToken(foreignAudience), /audience/);
  const unsigned = jwt.sign({ sid: "f" }, null, { algorithm: "none", issuer: "deeplog-api", audience: "deeplog-web", subject: "1" });
  assert.throws(() => verifyAccessToken(unsigned));
  // An access token never unlocks a share.
  assert.equal(verifyShareTokenSafely(createAccessToken(1, "share-a"), "share-a"), false);
});
