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
  try {
    if (localStorage.getItem("deeplog.motion") === "reduced") document.documentElement.dataset.motion = "reduced";
  } catch (_error) {
    // Same as above: the system setting still applies through CSS.
  }
})();

// Boot view (independent of the theme block above): choose the first view
// before paint, so a signed-in reload or a share link does not flash the
// login screen. deeplog_csrf is set and cleared with the refresh cookie, so
// it only hints that a session probably exists. app.js removes data-boot as
// soon as it shows the real view; a stale hint ends on the login screen.
(function () {
  var query = location.search;
  var boot = /[?&]share=[^&]/.test(query) ? "share"
    : !/[?&]resetToken=/.test(query) && /(?:^|;\s*)deeplog_csrf=[^;]/.test(document.cookie) ? "session" : "";
  if (boot) document.documentElement.setAttribute("data-boot", boot);
})();
