const CACHE = "deeplog-shell-v17";
const SHELL = [
  "/", "/index.html",
  "/styles/01-tokens.css?v=20261123-2",
  "/styles/02-base.css?v=20261123-2",
  "/styles/03-auth-and-forms.css?v=20261123-2",
  "/styles/04-account-and-learning.css?v=20261123-2",
  "/styles/05-app-shell.css?v=20261123-2",
  "/styles/06-inicio.css?v=20261123-2",
  "/styles/07-profile.css?v=20261123-2",
  "/styles/08-stats.css?v=20261123-5",
  "/styles/09-logbook.css?v=20261123-2",
  "/styles/10-dialogs.css?v=20261123-2",
  "/styles/11-keyframes.css?v=20261123-2",
  "/styles/12-responsive.css?v=20261123-4",
  "/styles/13-reduced-motion.css?v=20261123-2",
  "/styles/14-sharing-and-insights.css?v=20261123-2",
  "/styles/15-theme-abismo.css?v=20261123-2",
  "/styles/16-animations.css?v=20261123-2",
  "/styles/17-dive-number.css?v=20261123-2",
  "/styles/18-theme-superficie.css?v=20261123-2",
  "/js/app.js?v=20261123-4", "/js/api.js?v=20261123-2",
  "/js/dive-form.js?v=20261123-2", "/js/dialogs.js?v=20261123-2",
  "/js/dive-map.js?v=20261123-2", "/js/tabs.js?v=20261123-2", "/js/theme.js?v=20261123-2", "/js/theme-init.js?v=20261123-2", "/js/dive-profile.js?v=20261121-2", "/js/motion.js?v=20261121-1",
  "/fonts/sora-latin-variable.woff2", "/fonts/ibm-plex-mono-latin-400.woff2",
  "/fonts/ibm-plex-mono-latin-500.woff2", "/fonts/ibm-plex-mono-latin-600.woff2", "/js/world-map-data.js?v=20261030-1",
  "/js/validation-messages.js?v=20261123-2",
  "/js/client-monitoring.js?v=20261123-2", "/js/format.js?v=20261123-2", "/js/stats-detail.js?v=20261123-5", "/js/dive-pdf.js?v=20261123-2",
  "/js/public-share.js?v=20261123-2", "/assets/deeplog-mark.svg",
  "/js/text.js?v=20261126-1", "/js/dive-labels.js?v=20261126-1", "/js/dive-form-data.js?v=20261126-1",
  "/js/offline.js?v=20261126-1", "/js/photos.js?v=20261126-1", "/js/forms.js?v=20261126-1",
  "/js/view-auth.js?v=20261126-1", "/js/view-account.js?v=20261126-1", "/js/view-profile.js?v=20261126-1",
  "/js/view-home.js?v=20261126-1", "/js/view-logbook.js?v=20261126-1", "/js/view-dive-editor.js?v=20261126-1",
  "/js/view-dive-detail.js?v=20261126-1", "/js/view-share.js?v=20261126-1", "/js/view-map.js?v=20261126-1",
  "/js/view-stats.js?v=20261126-1",
  "/manifest.webmanifest"
];

// Runtime caching only ever stores versioned static files. Navigations are
// never stored: their URL can carry a share or password-reset token
// (?share=, ?resetToken=), and those must not outlive the visit (TD-020).
const STATIC_PATH = /^\/(?:js|styles|fonts|assets)\//;

function isCacheableUrl(url) {
  if (url.origin !== self.location.origin || !STATIC_PATH.test(url.pathname)) return false;
  const keys = [...url.searchParams.keys()];
  return keys.every((key) => key === "v");
}

function isVersioned(url) {
  return url.searchParams.has("v") || url.pathname.startsWith("/fonts/");
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

// Delete old caches, and from the current one any entry an older worker may
// have stored at runtime that is not a plain static file (token URLs, pages).
async function purgeCaches() {
  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
  const cache = await caches.open(CACHE);
  const requests = await cache.keys();
  await Promise.all(requests.map((request) => {
    const url = new URL(request.url);
    const keep = SHELL.includes(url.pathname + url.search) || isCacheableUrl(url);
    return keep ? null : cache.delete(request);
  }));
}

self.addEventListener("activate", (event) => {
  event.waitUntil(purgeCaches());
  self.clients.claim();
});

// A fetched static file is stored only if it is a real same-origin file at a
// clean static URL (no tokens) and not the HTML fallback of a missing path.
function isStorable(response, url) {
  const html = (response.headers.get("content-type") || "").includes("text/html");
  return response.ok && response.type === "basic" && !html && isCacheableUrl(url);
}

// Versioned files (?v=) and fonts never change under the same URL: cache
// first, then network, keeping a copy of what the network returned.
async function cacheFirst(event, url) {
  const { request } = event;
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (isStorable(response, url)) {
    const copy = response.clone();
    event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
  }
  return response;
}

// The API is never handled here (always network, never cached), nor are
// other origins or anything but GET.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // HTML: network first, the precached shell only when offline. Only
  // navigations fall back to index.html; a missing script must fail as a
  // script, not be parsed as HTML.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/index.html")));
    return;
  }

  if (isVersioned(url)) {
    event.respondWith(cacheFirst(event, url).catch(() => Response.error()));
    return;
  }

  // Unversioned files (manifest, icons): network first, precached copy offline.
  event.respondWith(fetch(request).catch(() => caches.match(request).then((cached) => cached || Response.error())));
});
