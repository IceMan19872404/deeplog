const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const spec = JSON.parse(fs.readFileSync(path.join(__dirname, "../../openapi.json"), "utf8"));
const documented = new Set();
const operationIds = [];

for (const [route, pathItem] of Object.entries(spec.paths)) {
  for (const method of ["get", "post", "put", "delete", "patch"]) {
    if (!pathItem[method]) continue;
    documented.add(`${method.toUpperCase()} ${route}`);
    operationIds.push(pathItem[method].operationId);
  }
}

const runtimeOperations = [
  "GET /health", "GET /health/ready", "POST /telemetry/client-errors",
  "GET /profile", "PUT /profile", "GET /profile/photo", "PUT /profile/photo",
  "DELETE /profile/photo",
  "POST /auth/register", "POST /auth/login",
  "POST /auth/refresh", "POST /auth/logout", "POST /auth/logout-all",
  "POST /auth/forgot-password", "POST /auth/reset-password", "GET /auth/me",
  "POST /dives", "GET /dives", "GET /dives/stats", "GET /dives/map", "GET /dives/insights",
  "GET /dives/configuration-memory", "GET /dives/{diveId}", "PUT /dives/{diveId}",
  "DELETE /dives/{diveId}", "POST /dives/{diveId}/photos",
  "GET /dives/{diveId}/photos/{photoId}/content", "DELETE /dives/{diveId}/photos/{photoId}",
  "PUT /dives/{diveId}/reflection", "DELETE /dives/{diveId}/reflection",
  "POST /dives/{diveId}/shares", "GET /dives/{diveId}/shares",
  "DELETE /dives/{diveId}/shares/{shareId}", "GET /public/dives/{token}",
  "POST /public/dives/{token}/access", "GET /public/dives/{token}/photos/{position}/content",
  "GET /account/export.json", "GET /account/export.csv", "GET /account/export.zip",
  "DELETE /account"
];

test("OpenAPI identifies the v1 contract and documents every runtime operation", () => {
  assert.match(spec.openapi, /^3\./);
  assert.equal(spec.info.version, "1.0.0");
  assert.deepEqual([...documented].sort(), runtimeOperations.sort());
});

test("OpenAPI operation identifiers are present and unique", () => {
  assert.equal(operationIds.every(Boolean), true);
  assert.equal(new Set(operationIds).size, operationIds.length);
});

test("protected resources declare bearer authentication", () => {
  for (const [route, pathItem] of Object.entries(spec.paths)) {
    if (!route.startsWith("/dives") && !route.startsWith("/account") && !route.startsWith("/profile") && !["/auth/me", "/auth/logout-all"].includes(route)) continue;
    for (const method of ["get", "post", "put", "delete"]) {
      if (!pathItem[method]) continue;
      assert.deepEqual(pathItem[method].security, [{ bearerAuth: [] }], `${method.toUpperCase()} ${route}`);
    }
  }
});
