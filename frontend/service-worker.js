const CACHE = "deeplog-shell-v5";
const SHELL = [
  "/", "/index.html", "/styles.css?v=20261030-2",
  "/js/app.js?v=20261030-2", "/js/api.js?v=20260930-1",
  "/js/dive-form.js?v=20261019-1",
  "/js/dive-map.js?v=20261030-1", "/js/world-map-data.js?v=20261030-1",
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
