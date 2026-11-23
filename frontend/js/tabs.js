// Tab navigation for the dashboard: five sections, each with its own address
// (#/inicio, #/inmersiones, #/mapa, #/estadisticas, #/perfil) so the back
// button, reloads and shared bookmarks land on the same section.

export const TABS = [
  { id: "inicio", label: "Inicio", depth: "0 m" },
  { id: "inmersiones", label: "Inmersiones", depth: "10 m" },
  { id: "mapa", label: "Mapa", depth: "20 m" },
  { id: "estadisticas", label: "Estadísticas", depth: "30 m" },
  { id: "perfil", label: "Perfil", depth: "40 m" }
];

export const DEFAULT_TAB = TABS[0].id;

export function tabFromHash(hash = "") {
  const match = /^#\/([a-z]+)\/?$/.exec(hash);
  const id = match?.[1];
  return TABS.some((tab) => tab.id === id) ? id : DEFAULT_TAB;
}

export function hashForTab(id) {
  return `#/${TABS.some((tab) => tab.id === id) ? id : DEFAULT_TAB}`;
}

// Only "#/<section>" hashes belong to the router; others such as the skip
// link's "#main-content" are left to the browser.
export function isTabHash(hash = "") {
  return hash.startsWith("#/");
}

export function createTabs({ root = document, onChange = () => {} } = {}) {
  const links = [...root.querySelectorAll("[data-tab-link]")];
  const panels = [...root.querySelectorAll("[data-tab-panel]")];
  let current = null;

  function show(id, { focus = false } = {}) {
    const previous = current;
    current = id;
    links.forEach((link) => {
      const active = link.dataset.tabLink === id;
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.tabPanel !== id;
    });
    const panel = panels.find((item) => item.dataset.tabPanel === id);
    if (focus && panel) {
      const heading = panel.querySelector("[data-tab-heading]") || panel;
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
      window.scrollTo({ top: 0 });
    }
    if (previous !== id) onChange(id, previous);
  }

  function handleHashChange() {
    if (!isTabHash(location.hash)) return;
    show(tabFromHash(location.hash), { focus: true });
  }

  window.addEventListener("hashchange", handleHashChange);

  return {
    get current() {
      return current;
    },
    start() {
      show(tabFromHash(isTabHash(location.hash) ? location.hash : ""));
    },
    // Skip link target: the current panel's heading, without touching the hash.
    focusCurrent() {
      if (current) show(current, { focus: true });
    },
    go(id) {
      const hash = hashForTab(id);
      if (location.hash === hash) show(tabFromHash(hash), { focus: true });
      else location.hash = hash;
    }
  };
}
