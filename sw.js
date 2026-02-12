const CACHE_NAME = "miaocarb-v2";
const ASSETS = [
  "/miaocarb/",
  "/miaocarb/index.html",
  "/miaocarb/manifest.json",
  "/miaocarb/icon-192.png",
  "/miaocarb/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
