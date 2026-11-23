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
  // Browser UI before the CSS arrives: toolbar colour and canvas scheme.
  // Keep the colours in sync with THEME_COLORS in js/theme.js.
  var themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.content = dark ? "#071a33" : "#c9f6f1";
  var scheme = document.querySelector('meta[name="color-scheme"]');
  if (scheme) scheme.content = preference === "light" || preference === "dark" ? preference : "light dark";
  try {
    if (localStorage.getItem("deeplog.motion") === "reduced") document.documentElement.dataset.motion = "reduced";
  } catch (_error) {
    // Same as above: the system setting still applies through CSS.
  }
})();
