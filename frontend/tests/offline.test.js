import test from "node:test";
import assert from "node:assert/strict";
import {
  ONLINE_ONLY_SELECTOR,
  SNAPSHOT_KEY,
  applyOfflineMode,
  clearOfflineSnapshot,
  isNetworkError,
  isOffline,
  readOfflineSnapshot,
  setOffline,
  updateOfflineSnapshot
} from "../js/offline.js";

function memoryStorage() {
  const map = new Map();
  return {
    map,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key)
  };
}

const brokenStorage = {
  getItem() { throw new Error("SecurityError"); },
  setItem() { throw new Error("SecurityError"); },
  removeItem() { throw new Error("SecurityError"); }
};

test("the snapshot merges dives and map under the current user", () => {
  const storage = memoryStorage();
  assert.equal(readOfflineSnapshot(storage), null);
  updateOfflineSnapshot({ dives: [1], meta: { page: 1 } }, { firstName: "Ana" }, storage);
  updateOfflineSnapshot({ map: [2] }, { firstName: "Ana" }, storage);
  const snapshot = readOfflineSnapshot(storage);
  assert.deepEqual(snapshot.dives, [1]);
  assert.deepEqual(snapshot.map, [2]);
  assert.deepEqual(snapshot.user, { firstName: "Ana" });
  assert.equal(typeof snapshot.savedAt, "number");
  assert.ok(!/token/i.test(storage.map.get(SNAPSHOT_KEY)));
  clearOfflineSnapshot(storage);
  assert.equal(readOfflineSnapshot(storage), null);
});

test("blocked storage never throws", () => {
  assert.equal(readOfflineSnapshot(brokenStorage), null);
  assert.doesNotThrow(() => updateOfflineSnapshot({ dives: [] }, null, brokenStorage));
  assert.doesNotThrow(() => clearOfflineSnapshot(brokenStorage));
});

test("network errors: offline navigator or a fetch TypeError", () => {
  assert.equal(isNetworkError(new TypeError("Failed to fetch"), true), true);
  assert.equal(isNetworkError(Object.assign(new Error("x"), { status: 500 }), false), true);
  assert.equal(isNetworkError(Object.assign(new Error("x"), { status: 500 }), true), false);
});

test("offline mode disables every write control and explains why", () => {
  const control = () => ({ disabled: false, title: "", removeAttribute(name) { this[name] = ""; } });
  const controls = [control(), control()];
  const classes = new Set();
  const root = {
    body: { classList: { toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)) } },
    querySelectorAll(selector) {
      assert.equal(selector, ONLINE_ONLY_SELECTOR);
      return controls;
    }
  };
  setOffline(true, root);
  assert.equal(isOffline(), true);
  assert.ok(classes.has("is-offline"));
  assert.ok(controls.every((item) => item.disabled && item.title === "Disponible al recuperar la conexión"));
  setOffline(false, root);
  applyOfflineMode(root);
  assert.equal(isOffline(), false);
  assert.ok(!classes.has("is-offline"));
  assert.ok(controls.every((item) => !item.disabled && item.title === ""));
});

test("the selector covers every control that writes", () => {
  for (const selector of ["[data-open-dive-form]", ".dive-card [data-action]", "#open-share-dialog", "#delete-reflection",
    "#open-profile", "[data-export-format]", "#logout-all-button", "#open-delete-account", "#refresh-button"]) {
    assert.ok(ONLINE_ONLY_SELECTOR.split(", ").includes(selector), selector);
  }
});
