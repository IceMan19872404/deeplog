import test from "node:test";
import assert from "node:assert/strict";

// api.js reads document.cookie (CSRF) and calls fetch; both are faked here.
// Each test sets its own fetch handler. `calls` records what was sent.
globalThis.document = { cookie: "theme=x; deeplog_csrf=csrf%20value" };
let handler = () => json(200, {});
const calls = [];
globalThis.fetch = async (path, options = {}) => {
  const headers = new Headers(options.headers);
  calls.push({ path, method: options.method || "GET", headers, options });
  return handler(path, options, headers);
};

function json(status, body) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

const api = await import("../js/api.js");

function reset(next) {
  calls.length = 0;
  handler = next;
  api.clearToken();
}

test("JSON requests send the bearer token, JSON content type and same-origin credentials", async () => {
  reset(() => json(201, { data: { id: 1 } }));
  api.setToken("access-1");
  const body = await api.createDive({ name: "Medas" });
  assert.deepEqual(body, { data: { id: 1 } });
  assert.equal(calls.length, 1);
  const [call] = calls;
  assert.equal(call.path, "/api/v1/dives");
  assert.equal(call.method, "POST");
  assert.equal(call.options.body, JSON.stringify({ name: "Medas" }));
  assert.equal(call.options.credentials, "same-origin");
  assert.equal(call.headers.get("authorization"), "Bearer access-1");
  assert.equal(call.headers.get("content-type"), "application/json");
});

test("without a token no Authorization header is sent; FormData keeps its own content type", async () => {
  reset(() => json(200, { data: {} }));
  await api.uploadDivePhotos(7, [new Blob(["x"], { type: "image/png" })]);
  const [call] = calls;
  assert.equal(call.path, "/api/v1/dives/7/photos");
  assert.equal(call.headers.get("authorization"), null);
  assert.equal(call.headers.get("content-type"), null);
  assert.ok(call.options.body instanceof FormData);
});

test("204 responses resolve to null", async () => {
  reset(() => new Response(null, { status: 204 }));
  api.setToken("t");
  assert.equal(await api.deleteDive(3), null);
  assert.equal(calls[0].method, "DELETE");
});

test("API errors carry message, status, code and details from the error envelope", async () => {
  reset(() => json(400, { error: { code: "VALIDATION_ERROR", message: "Invalid request data", details: [{ field: "name" }] } }));
  api.setToken("t");
  await assert.rejects(api.updateDive(5, {}), (error) => {
    assert.equal(error.message, "Invalid request data");
    assert.equal(error.status, 400);
    assert.equal(error.code, "VALIDATION_ERROR");
    assert.deepEqual(error.details, [{ field: "name" }]);
    return true;
  });
});

test("an error without a JSON body falls back to the Spanish message", async () => {
  reset(() => new Response("<html>bad gateway</html>", { status: 502 }));
  await assert.rejects(api.getDives(), (error) => {
    assert.equal(error.message, "No se pudo completar la operación");
    assert.equal(error.status, 502);
    assert.equal(error.code, undefined);
    return true;
  });
});

test("a 401 renews the session once (with the CSRF cookie) and retries with the new token", async () => {
  reset((path, _options, headers) => {
    if (path === "/api/v1/auth/refresh") return json(200, { data: { accessToken: "fresh" } });
    return headers.get("authorization") === "Bearer fresh" ? json(200, { data: path }) : json(401, {});
  });
  api.setToken("expired");
  const [stats, dives] = await Promise.all([api.getDiveStats(), api.getDives(2, 6)]);
  assert.deepEqual(stats, { data: "/api/v1/dives/stats" });
  assert.deepEqual(dives, { data: "/api/v1/dives?page=2&limit=6" });
  const refreshes = calls.filter((call) => call.path === "/api/v1/auth/refresh");
  assert.equal(refreshes.length, 1, "concurrent 401s share one refresh (the refresh token rotates)");
  assert.equal(refreshes[0].method, "POST");
  assert.equal(refreshes[0].headers.get("x-csrf-token"), "csrf value");
  assert.equal(refreshes[0].options.credentials, "same-origin");
  assert.equal(api.getToken(), "fresh");
});

test("a failed renewal drops the token and returns the original 401 as an error", async () => {
  reset((path) => path === "/api/v1/auth/refresh"
    ? json(401, { error: { message: "Refresh token is invalid" } })
    : json(401, { error: { code: "UNAUTHORIZED", message: "Authentication required" } }));
  api.setToken("expired");
  await assert.rejects(api.getProfile(), (error) => error.status === 401 && error.code === "UNAUTHORIZED");
  assert.equal(api.getToken(), null);
  assert.deepEqual(calls.map((call) => call.path), ["/api/v1/profile", "/api/v1/auth/refresh"]);
});

test("login never tries to renew the session", async () => {
  reset(() => json(401, { error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } }));
  await assert.rejects(api.loginUser({ email: "a@b.c", password: "x" }), (error) => error.code === "INVALID_CREDENTIALS");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.allowRefresh, undefined, "allowRefresh is not forwarded to fetch");
});

test("restoreUserSession stores the new token; a failed refresh rejects", async () => {
  reset(() => json(200, { data: { accessToken: "restored" } }));
  const body = await api.restoreUserSession();
  assert.equal(body.data.accessToken, "restored");
  assert.equal(api.getToken(), "restored");
  reset(() => json(401, { error: { message: "No session" } }));
  await assert.rejects(api.restoreUserSession(), /No session/);
});

test("logout sends CSRF and bearer, clears the token, and tolerates a 401", async () => {
  reset(() => json(401, {}));
  api.setToken("t");
  await api.logoutUser();
  assert.equal(calls[0].path, "/api/v1/auth/logout");
  assert.equal(calls[0].headers.get("x-csrf-token"), "csrf value");
  assert.equal(calls[0].headers.get("authorization"), "Bearer t");
  assert.equal(api.getToken(), null);

  reset(() => json(500, {}));
  api.setToken("t");
  await assert.rejects(api.logoutAllSessions(), /Session logout failed/);
  assert.equal(calls[0].path, "/api/v1/auth/logout-all");
  assert.equal(api.getToken(), null);
});

test("photo blobs: authenticated photos report the status; errors use Spanish messages", async () => {
  reset(() => new Response("png", { status: 200 }));
  api.setToken("t");
  const blob = await api.getDivePhotoBlob("/api/v1/dives/1/photos/2/file");
  assert.equal(await blob.text(), "png");
  reset(() => new Response(null, { status: 404 }));
  api.setToken("t");
  await assert.rejects(api.getDivePhotoBlob("/x"), (error) => error.message === "No se pudo cargar la fotografía" && error.status === 404);
});

test("public share requests never send the owner's session, only the share token", async () => {
  reset(() => json(200, { data: { dive: {} } }));
  api.setToken("owner-token");
  await api.getPublicDive("abc");
  await api.getPublicDive("abc", "share-token");
  await api.getPublicPhotoBlob("/api/v1/public/dives/abc/photos/1", "share-token");
  assert.equal(calls[0].path, "/api/v1/public/dives/abc");
  assert.equal(calls[0].headers.get("authorization"), null);
  assert.equal(calls[0].options.credentials, undefined);
  assert.equal(calls[1].headers.get("authorization"), "Bearer share-token");
  assert.equal(calls[2].headers.get("authorization"), "Bearer share-token");

  reset(() => json(403, { error: { code: "SHARE_PASSWORD_REQUIRED", message: "Password required" } }));
  await assert.rejects(api.unlockPublicDive("abc", "secreto12"), (error) => {
    assert.equal(error.code, "SHARE_PASSWORD_REQUIRED");
    assert.equal(error.status, 403);
    return true;
  });
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].options.body, JSON.stringify({ password: "secreto12" }));
  assert.equal(calls[0].headers.get("content-type"), "application/json");

  reset(() => new Response(null, { status: 500 }));
  await assert.rejects(api.getPublicDive("abc"), /No se pudo abrir el enlace/);
});

test("low-priority reads pass fetch priority through", async () => {
  reset(() => json(200, { data: {} }));
  await api.getDiveMap({ priority: "low" });
  await api.getDiveInsights();
  assert.equal(calls[0].options.priority, "low");
  assert.equal(calls[1].options.priority, undefined);
  assert.equal(calls[0].path, "/api/v1/dives/map");
});

test("configuration memory turns filters into a query string", async () => {
  reset(() => json(200, { data: {} }));
  await api.getConfigurationMemory({ suitType: "wetsuit", waterType: "salt" });
  assert.equal(calls[0].path, "/api/v1/dives/configuration-memory?suitType=wetsuit&waterType=salt");
});

test("download errors use the download message", async () => {
  reset(() => json(429, { error: { code: "RATE_LIMITED", message: "Too many exports" } }));
  api.setToken("t");
  globalThis.URL.createObjectURL ??= () => "blob:x";
  await assert.rejects(api.downloadAccountExport("json"), (error) => error.status === 429 && error.code === "RATE_LIMITED" && error.message === "Too many exports");
  reset(() => new Response(null, { status: 500 }));
  api.setToken("t");
  await assert.rejects(api.downloadAccountExport("csv"), /No se pudo preparar la descarga/);
  assert.equal(calls[0].path, "/api/v1/account/export.csv");
});
