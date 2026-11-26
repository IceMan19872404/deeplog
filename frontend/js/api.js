// HTTP client for the DeepLog API. Sessions (TD-026): the access token lives
// only in memory; the refresh token is an httpOnly cookie, and renewing or
// closing a session needs the readable deeplog_csrf cookie echoed in
// X-CSRF-Token. There is no offline write queue (TD-030): every write needs
// the server. Errors thrown here carry the API envelope's `status`, `code`
// and `details` so callers can branch on the code and show field messages.

let accessToken = null;
let refreshPromise = null;

export function getToken() {
  return accessToken;
}

export function setToken(token) {
  accessToken = token;
}

export function clearToken() {
  accessToken = null;
}

function readCookie(name) {
  const prefix = `${name}=`;
  const part = document.cookie.split(";").map((value) => value.trim())
    .find((value) => value.startsWith(prefix));
  return part ? decodeURIComponent(part.slice(prefix.length)) : null;
}

const csrfToken = () => readCookie("deeplog_csrf") || "";

const readJson = (response) => response.json().catch(() => null);

function responseError(response, body, fallbackMessage) {
  const error = new Error(body?.error?.message || fallbackMessage);
  error.status = response.status;
  error.code = body?.error?.code;
  error.details = body?.error?.details;
  return error;
}

const jsonBody = (method, data) => ({ method, body: JSON.stringify(data) });

// Concurrent 401s share one renewal: the refresh token rotates on every use,
// so a second parallel refresh would present a revoked secret and end the
// whole session family.
async function renewSession() {
  if (!refreshPromise) {
    refreshPromise = fetch("/api/v1/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
      headers: { "X-CSRF-Token": csrfToken() }
    }).then(async (response) => {
      const body = await readJson(response);
      if (!response.ok) throw new Error(body?.error?.message || "Session refresh failed");
      setToken(body.data.accessToken);
      return body;
    }).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

// Sends the access token and, on a 401, renews the session once and retries.
// If the renewal fails the token is dropped and the original 401 response is
// returned, so the caller reports it like any other error.
async function authenticatedFetch(path, options = {}, allowRefresh = true) {
  const headers = new Headers(options.headers);
  const send = () => {
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    return fetch(path, { ...options, headers, credentials: "same-origin" });
  };
  let response = await send();
  if (response.status === 401 && allowRefresh) {
    try {
      await renewSession();
      response = await send();
    } catch (_error) {
      clearToken();
    }
  }
  return response;
}

// JSON request: resolves to the parsed body (null for 204), throws on errors.
async function apiRequest(path, { allowRefresh = true, ...options } = {}) {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const response = await authenticatedFetch(path, { ...options, headers }, allowRefresh);
  if (response.status === 204) return null;
  const body = await readJson(response);
  if (!response.ok) throw responseError(response, body, "No se pudo completar la operación");
  return body;
}

async function downloadRequest(path) {
  const response = await authenticatedFetch(path);
  if (!response.ok) throw responseError(response, await readJson(response), "No se pudo preparar la descarga");
  return response.blob();
}

const exportFileNames = {
  json: "deeplog-export.json",
  csv: "deeplog-dives.csv",
  zip: "deeplog-complete-export.zip"
};

export async function downloadAccountExport(format) {
  const blob = await downloadRequest(`/api/v1/account/export.${format}`);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = exportFileNames[format];
  anchor.click();
  URL.revokeObjectURL(url);
}

export function deleteAccount(data) {
  return apiRequest("/api/v1/account", jsonBody("DELETE", data));
}

// Sessions

export function registerUser(data) {
  return apiRequest("/api/v1/auth/register", jsonBody("POST", data));
}

export function loginUser(data) {
  return apiRequest("/api/v1/auth/login", { ...jsonBody("POST", data), allowRefresh: false });
}

export function restoreUserSession() {
  return renewSession();
}

// A 401 means the session was already gone: logging out still succeeds.
async function closeSession(path) {
  const headers = { "X-CSRF-Token": csrfToken() };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  try {
    const response = await fetch(path, { method: "POST", headers, credentials: "same-origin" });
    if (!response.ok && response.status !== 401) throw new Error("Session logout failed");
  } finally {
    clearToken();
  }
}

export function logoutUser() {
  return closeSession("/api/v1/auth/logout");
}

export function logoutAllSessions() {
  return closeSession("/api/v1/auth/logout-all");
}

export function requestPasswordReset(data) {
  return apiRequest("/api/v1/auth/forgot-password", jsonBody("POST", data));
}

export function resetPassword(data) {
  return apiRequest("/api/v1/auth/reset-password", jsonBody("POST", data));
}

export function getCurrentUser() {
  return apiRequest("/api/v1/auth/me");
}

// Profile

export function getProfile() {
  return apiRequest("/api/v1/profile");
}

export function updateProfile(data) {
  return apiRequest("/api/v1/profile", jsonBody("PUT", data));
}

export function uploadProfilePhoto(file) {
  const body = new FormData();
  body.append("photo", file);
  return apiRequest("/api/v1/profile/photo", { method: "PUT", body });
}

export function deleteProfilePhoto() {
  return apiRequest("/api/v1/profile/photo", { method: "DELETE" });
}

export async function getProfilePhotoBlob() {
  const response = await authenticatedFetch("/api/v1/profile/photo");
  if (!response.ok) throw new Error("Profile photo unavailable");
  return response.blob();
}

// Dives

export function getDives(page = 1, limit = 6) {
  return apiRequest(`/api/v1/dives?page=${page}&limit=${limit}`);
}

export function getDiveStats() {
  return apiRequest("/api/v1/dives/stats");
}

// `priority: "low"` when the data is for a tab that is not on screen.
export function getDiveMap({ priority } = {}) {
  return apiRequest("/api/v1/dives/map", { priority });
}

export function getDiveInsights({ priority } = {}) {
  return apiRequest("/api/v1/dives/insights", { priority });
}

export function getConfigurationMemory(filters) {
  const query = new URLSearchParams(filters);
  return apiRequest(`/api/v1/dives/configuration-memory?${query}`);
}

export function createDive(data) {
  return apiRequest("/api/v1/dives", jsonBody("POST", data));
}

export function getDive(diveId) {
  return apiRequest(`/api/v1/dives/${diveId}`);
}

export function updateDive(diveId, data) {
  return apiRequest(`/api/v1/dives/${diveId}`, jsonBody("PUT", data));
}

export function deleteDive(diveId) {
  return apiRequest(`/api/v1/dives/${diveId}`, { method: "DELETE" });
}

export function saveDiveReflection(diveId, data) {
  return apiRequest(`/api/v1/dives/${diveId}/reflection`, jsonBody("PUT", data));
}

export function deleteDiveReflection(diveId) {
  return apiRequest(`/api/v1/dives/${diveId}/reflection`, { method: "DELETE" });
}

export function uploadDivePhotos(diveId, files) {
  const body = new FormData();
  files.forEach((file) => body.append("photos", file));
  return apiRequest(`/api/v1/dives/${diveId}/photos`, { method: "POST", body });
}

export function deleteDivePhoto(diveId, photoId) {
  return apiRequest(`/api/v1/dives/${diveId}/photos/${photoId}`, { method: "DELETE" });
}

export async function getDivePhotoBlob(photoUrl) {
  const response = await authenticatedFetch(photoUrl);
  if (!response.ok) {
    const error = new Error("No se pudo cargar la fotografía");
    error.status = response.status;
    throw error;
  }
  return response.blob();
}

// Share links

export function createDiveShare(diveId, data) {
  return apiRequest(`/api/v1/dives/${diveId}/shares`, jsonBody("POST", data));
}

export function getDiveShares(diveId) {
  return apiRequest(`/api/v1/dives/${diveId}/shares`);
}

export function revokeDiveShare(diveId, shareId) {
  return apiRequest(`/api/v1/dives/${diveId}/shares/${shareId}`, { method: "DELETE" });
}

// Public share page (TD-020): never sends the owner's session; the only
// credential is the short-lived token issued when a password link is unlocked.
async function publicRequest(path, options = {}, shareAccessToken) {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (shareAccessToken) headers.set("Authorization", `Bearer ${shareAccessToken}`);
  const response = await fetch(path, { ...options, headers });
  const body = await readJson(response);
  if (!response.ok) throw responseError(response, body, "No se pudo abrir el enlace");
  return body;
}

export function getPublicDive(token, shareAccessToken) {
  return publicRequest(`/api/v1/public/dives/${token}`, {}, shareAccessToken);
}

export function unlockPublicDive(token, password) {
  return publicRequest(`/api/v1/public/dives/${token}/access`, jsonBody("POST", { password }));
}

export async function getPublicPhotoBlob(url, shareAccessToken) {
  const headers = shareAccessToken ? { Authorization: `Bearer ${shareAccessToken}` } : {};
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error("No se pudo cargar la fotografía compartida");
  return response.blob();
}
