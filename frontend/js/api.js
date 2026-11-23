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

async function renewSession() {
  if (!refreshPromise) {
    refreshPromise = fetch("/api/v1/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
      headers: { "X-CSRF-Token": readCookie("deeplog_csrf") || "" }
    }).then(async (response) => {
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message || "Session refresh failed");
      setToken(body.data.accessToken);
      return body;
    }).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

async function authenticatedFetch(path, options = {}, allowRefresh = true) {
  const headers = new Headers(options.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  let response = await fetch(path, { ...options, headers, credentials: "same-origin" });
  if (response.status === 401 && allowRefresh) {
    try {
      await renewSession();
      headers.set("Authorization", `Bearer ${accessToken}`);
      response = await fetch(path, { ...options, headers, credentials: "same-origin" });
    } catch (_error) {
      clearToken();
    }
  }
  return response;
}

async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers);
  const allowRefresh = options.allowRefresh !== false;
  const requestOptions = { ...options };
  delete requestOptions.allowRefresh;

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await authenticatedFetch(path, { ...requestOptions, headers }, allowRefresh);

  if (response.status === 204) {
    return null;
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      body?.error?.message || "No se pudo completar la operación"
    );
    error.status = response.status;
    error.code = body?.error?.code;
    error.details = body?.error?.details;
    throw error;
  }

  return body;
}

async function downloadRequest(path) {
  const response = await authenticatedFetch(path);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const error = new Error(body?.error?.message || "No se pudo preparar la descarga");
    error.status = response.status;
    error.code = body?.error?.code;
    throw error;
  }
  return response.blob();
}

export async function downloadAccountExport(format) {
  const blob = await downloadRequest(`/api/v1/account/export.${format}`);
  const names = {
    json: "deeplog-export.json",
    csv: "deeplog-dives.csv",
    zip: "deeplog-complete-export.zip"
  };
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = names[format];
  anchor.click();
  URL.revokeObjectURL(url);
}

export function deleteAccount(data) {
  return apiRequest("/api/v1/account", {
    method: "DELETE",
    body: JSON.stringify(data)
  });
}

export function registerUser(data) {
  return apiRequest("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function loginUser(data) {
  return apiRequest("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
    allowRefresh: false
  });
}

export function restoreUserSession() {
  return renewSession();
}

async function closeSession(path) {
  const headers = { "X-CSRF-Token": readCookie("deeplog_csrf") || "" };
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
  return apiRequest("/api/v1/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function resetPassword(data) {
  return apiRequest("/api/v1/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function getCurrentUser() {
  return apiRequest("/api/v1/auth/me");
}

export function getProfile() {
  return apiRequest("/api/v1/profile");
}

export function updateProfile(data) {
  return apiRequest("/api/v1/profile", { method: "PUT", body: JSON.stringify(data) });
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
  return apiRequest("/api/v1/dives", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function getDive(diveId) {
  return apiRequest(`/api/v1/dives/${diveId}`);
}

export function updateDive(diveId, data) {
  return apiRequest(`/api/v1/dives/${diveId}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export function deleteDive(diveId) {
  return apiRequest(`/api/v1/dives/${diveId}`, {
    method: "DELETE"
  });
}

export function saveDiveReflection(diveId, data) {
  return apiRequest(`/api/v1/dives/${diveId}/reflection`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export function deleteDiveReflection(diveId) {
  return apiRequest(`/api/v1/dives/${diveId}/reflection`, { method: "DELETE" });
}

export function uploadDivePhotos(diveId, files) {
  const body = new FormData();
  files.forEach((file) => body.append("photos", file));
  return apiRequest(`/api/v1/dives/${diveId}/photos`, {
    method: "POST",
    body
  });
}

export function deleteDivePhoto(diveId, photoId) {
  return apiRequest(`/api/v1/dives/${diveId}/photos/${photoId}`, {
    method: "DELETE"
  });
}

export function createDiveShare(diveId, data) {
  return apiRequest(`/api/v1/dives/${diveId}/shares`, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function getDiveShares(diveId) {
  return apiRequest(`/api/v1/dives/${diveId}/shares`);
}

export function revokeDiveShare(diveId, shareId) {
  return apiRequest(`/api/v1/dives/${diveId}/shares/${shareId}`, { method: "DELETE" });
}

async function publicRequest(path, options = {}, accessToken) {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(path, { ...options, headers });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.error?.message || "No se pudo abrir el enlace");
    error.status = response.status;
    error.code = body?.error?.code;
    throw error;
  }
  return body;
}

export function getPublicDive(token, accessToken) {
  return publicRequest(`/api/v1/public/dives/${token}`, {}, accessToken);
}

export function unlockPublicDive(token, password) {
  return publicRequest(`/api/v1/public/dives/${token}/access`, {
    method: "POST", body: JSON.stringify({ password })
  });
}

export async function getPublicPhotoBlob(url, accessToken) {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error("No se pudo cargar la fotografía compartida");
  return response.blob();
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
