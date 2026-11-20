// Runs before the stylesheet paints (classic script in <head>, allowed by the
// CSP because it is served from our own origin) so the page never flashes the
// wrong theme. Keep it tiny and dependency-free; js/theme.js owns the logic.
(function () {
  var preference = "auto";
  try {
    preference = localStorage.getItem("deeplog.theme") || "auto";
  } catch (_error) {
    // Private mode or blocked storage: follow the system.
  }
  var dark = preference === "dark" ||
    (preference !== "light" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
})();
