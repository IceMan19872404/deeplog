const CACHE = "deeplog-shell-v13";
const SHELL = [
  "/", "/index.html",
  "/styles/01-tokens.css?v=20261122-3",
  "/styles/02-base.css?v=20261122-3",
  "/styles/03-auth-and-forms.css?v=20261122-3",
  "/styles/04-account-and-learning.css?v=20261122-3",
  "/styles/05-app-shell.css?v=20261122-3",
  "/styles/06-inicio.css?v=20261122-3",
  "/styles/07-profile.css?v=20261122-3",
  "/styles/08-stats.css?v=20261122-3",
  "/styles/09-logbook.css?v=20261122-3",
  "/styles/10-dialogs.css?v=20261122-3",
  "/styles/11-keyframes.css?v=20261122-3",
  "/styles/12-responsive.css?v=20261122-3",
  "/styles/13-reduced-motion.css?v=20261122-3",
  "/styles/14-sharing-and-insights.css?v=20261122-3",
  "/styles/15-theme-abismo.css?v=20261122-3",
  "/styles/16-animations.css?v=20261122-3",
  "/styles/17-dive-number.css?v=20261122-3",
  "/styles/18-theme-superficie.css?v=20261122-3",
  "/js/app.js?v=20261122-2", "/js/api.js?v=20260930-1",
  "/js/dive-form.js?v=20261019-1",
  "/js/dive-map.js?v=20261030-1", "/js/tabs.js?v=20261121-1", "/js/theme.js?v=20261122-1", "/js/theme-init.js?v=20261121-2", "/js/dive-profile.js?v=20261121-2", "/js/motion.js?v=20261121-1",
  "/fonts/sora-latin-variable.woff2", "/fonts/ibm-plex-mono-latin-400.woff2",
  "/fonts/ibm-plex-mono-latin-500.woff2", "/fonts/ibm-plex-mono-latin-600.woff2", "/js/world-map-data.js?v=20261030-1",
  "/js/validation-messages.js?v=20261019-2",
  "/js/client-monitoring.js?v=20260916-1", "/js/dive-pdf.js?v=20260902-2",
  "/js/public-share.js?v=20260902-2", "/assets/deeplog-mark.svg",
  "/manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
  )));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.url.includes("/api/")) return;
  event.respondWith(fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("/index.html"))));
});
