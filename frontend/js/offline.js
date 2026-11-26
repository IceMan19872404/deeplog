// Read-only offline mode (TD-030, TD-032). The last synchronised page of the
// logbook and the map are kept in localStorage so the app can still be
// consulted without network; every control that writes is disabled meanwhile.
// The copy holds no tokens and is removed when the session ends.

export const SNAPSHOT_KEY = "deeplog.offline.v1";

export const ONLINE_ONLY_SELECTOR = [
  "[data-open-dive-form]", ".dive-card [data-action]", "#open-share-dialog",
  "#reflection-form button[type=\"submit\"]", "#delete-reflection", "#open-profile",
  "[data-export-format]", "#logout-all-button", "#open-delete-account", "#refresh-button"
].join(", ");

const OFFLINE_HINT = "Disponible al recuperar la conexión";

let offline = false;

export function isOffline() {
  return offline;
}

export function setOffline(value, root = document) {
  offline = value;
  applyOfflineMode(root);
}

// Also called after rendering, so freshly drawn controls get the same state.
export function applyOfflineMode(root = document) {
  root.body.classList.toggle("is-offline", offline);
  root.querySelectorAll(ONLINE_ONLY_SELECTOR).forEach((control) => {
    control.disabled = offline;
    if (offline) control.title = OFFLINE_HINT;
    else control.removeAttribute("title");
  });
}

// fetch() rejects with a TypeError when the request never reaches the server.
export function isNetworkError(error, online = navigator.onLine) {
  return !online || error instanceof TypeError;
}

// Storage can be unavailable (private browsing, blocked site data): reads
// then return null and writes are skipped.
export function readOfflineSnapshot(storage) {
  try { return JSON.parse((storage ?? globalThis.localStorage).getItem(SNAPSHOT_KEY)); } catch (_error) { return null; }
}

// Merges `patch` (dives and meta, or map) into the stored copy.
export function updateOfflineSnapshot(patch, user, storage) {
  try {
    const snapshot = { ...(readOfflineSnapshot(storage) || {}), ...patch, user, savedAt: Date.now() };
    (storage ?? globalThis.localStorage).setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch (_error) { /* Storage unavailable: nothing to keep. */ }
}

export function clearOfflineSnapshot(storage) {
  try { (storage ?? globalThis.localStorage).removeItem(SNAPSHOT_KEY); } catch (_error) { /* Nothing stored. */ }
}
