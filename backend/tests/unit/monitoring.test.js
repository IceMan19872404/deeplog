const { test } = require("node:test");
const assert = require("node:assert/strict");
const { sanitizeText, beforeSend } = require("../../src/config/monitoring");

test("monitoring sanitizes common identifiers and credentials", () => {
  const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature";
  const token = "a".repeat(64);
  const result = sanitizeText(`carlos@example.com ${jwt} ${token}`);

  assert.equal(result, "[email] [jwt] [token]");
});

test("Sentry events discard request, user, and breadcrumb context", () => {
  const event = beforeSend({
    message: "Failure for carlos@example.com",
    user: { id: "42", email: "carlos@example.com" },
    request: { cookies: { session: "secret" } },
    breadcrumbs: [{ message: "private navigation" }],
    exception: { values: [{ value: `token ${"b".repeat(64)}` }] }
  });

  assert.equal(event.user, undefined);
  assert.equal(event.request, undefined);
  assert.equal(event.breadcrumbs, undefined);
  assert.equal(event.message, "Failure for [email]");
  assert.equal(event.exception.values[0].value, "Unhandled server exception");
});
