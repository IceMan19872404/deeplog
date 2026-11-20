// Superficie (light) / Abismo (dark) / Automático (follow the system).
// The preference is a per-device convenience, so it lives in localStorage and
// the app works the same if storage is unavailable.

export const THEME_KEY = "deeplog.theme";
export const PREFERENCES = ["light", "dark", "auto"];
const THEME_COLORS = { light: "#f5fbff", dark: "#071a33" };

export function resolveTheme(preference, systemPrefersDark) {
  if (preference === "light" || preference === "dark") return preference;
  return systemPrefersDark ? "dark" : "light";
}

export function readPreference(storage = globalThis.localStorage) {
  try {
    const value = storage?.getItem(THEME_KEY);
    return PREFERENCES.includes(value) ? value : "auto";
  } catch (_error) {
    return "auto";
  }
}

function writePreference(preference, storage = globalThis.localStorage) {
  try {
    if (preference === "auto") storage?.removeItem(THEME_KEY);
    else storage?.setItem(THEME_KEY, preference);
  } catch (_error) {
    // Storage blocked: the choice still applies to this visit.
  }
}

export function createTheme({ root = document } = {}) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const meta = root.querySelector('meta[name="theme-color"]');
  let preference = readPreference();

  function sync() {
    const theme = resolveTheme(preference, media.matches);
    root.documentElement.dataset.theme = theme;
    if (meta) meta.content = THEME_COLORS[theme];
    root.querySelectorAll("[data-theme-choice]").forEach((control) => {
      const choice = control.dataset.themeChoice;
      if (control.type === "radio") control.checked = choice === preference;
      else control.setAttribute("aria-pressed", String(choice === theme));
    });
    root.dispatchEvent(new CustomEvent("deeplog:themechange", { detail: { theme, preference } }));
  }

  function set(next) {
    if (!PREFERENCES.includes(next) || next === preference) return sync();
    preference = next;
    writePreference(preference);
    sync();
  }

  root.addEventListener("click", (event) => {
    const control = event.target.closest("button[data-theme-choice]");
    if (control) set(control.dataset.themeChoice);
  });
  root.addEventListener("change", (event) => {
    if (event.target.matches('input[type="radio"][data-theme-choice]')) set(event.target.dataset.themeChoice);
  });
  media.addEventListener("change", () => {
    if (preference === "auto") sync();
  });

  sync();
  return {
    get preference() {
      return preference;
    },
    get theme() {
      return root.documentElement.dataset.theme;
    },
    set
  };
}
