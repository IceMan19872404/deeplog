// Motion helpers. Every animation in DeepLog is decorative, so all of them
// are skipped when the system asks for reduced motion or the diver turns
// animations down in Perfil > Apariencia (stored per device).

export const MOTION_KEY = "deeplog.motion";

export function prefersReducedMotion(root = document.documentElement) {
  return root.dataset.motion === "reduced" ||
    Boolean(globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

export function easeOutCubic(progress) {
  return 1 - (1 - progress) ** 3;
}

// Integers only: counts of dives, years, totals.
export function countUp(element, value, { duration = 700 } = {}) {
  const target = Number(value);
  if (!element) return;
  if (!Number.isInteger(target) || target <= 0 || prefersReducedMotion()) {
    element.textContent = String(value);
    return;
  }
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    element.textContent = String(Math.round(target * easeOutCubic(progress)));
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Runs `update` inside a View Transition when the browser supports it, so the
// new theme spreads as a circle from `origin` (the button that was pressed).
export function withRevealTransition(update, origin) {
  const root = document.documentElement;
  if (!document.startViewTransition || prefersReducedMotion()) {
    update();
    return;
  }
  if (origin) {
    root.style.setProperty("--reveal-x", `${Math.round(origin.x)}px`);
    root.style.setProperty("--reveal-y", `${Math.round(origin.y)}px`);
  }
  document.startViewTransition(update);
}

export function createMotionPreference({ root = document } = {}) {
  const toggles = () => root.querySelectorAll("[data-motion-toggle]");
  const sync = () => {
    const reduced = root.documentElement.dataset.motion === "reduced";
    toggles().forEach((toggle) => { toggle.checked = reduced; });
  };
  root.addEventListener("change", (event) => {
    if (!event.target.matches("[data-motion-toggle]")) return;
    const reduced = event.target.checked;
    if (reduced) root.documentElement.dataset.motion = "reduced";
    else delete root.documentElement.dataset.motion;
    try {
      if (reduced) localStorage.setItem(MOTION_KEY, "reduced");
      else localStorage.removeItem(MOTION_KEY);
    } catch (_error) {
      // Storage blocked: the choice still applies to this visit.
    }
  });
  sync();
}
