// Dual-environment SW (localhost + GitHub Pages)
const CACHE_PREFIX = "miaocarb";
const CACHE_VERSION = "20260214121500";
const CACHE_NAME = `${CACHE_PREFIX}-static-${CACHE_VERSION}`;

const SCOPE_URL = new URL(self.registration.scope);
const BASE_PATH = SCOPE_URL.pathname.endsWith("/") ? SCOPE_URL.pathname : (SCOPE_URL.pathname + "/");
const p = (rel) => new URL(rel, SCOPE_URL).pathname;

const APP_SHELL = p("index.html");
const PRECACHE_URLS = [
  p(""),
  p("index.html"),
  p("styles.css"),
  p("manifest.json"),
  p("js/storage.js"),
  p("js/idb.js"),
  p("js/app.js"),
  p("assets/icon-192.png"),
  p("assets/icon-512.png"),
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_URLS);
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
        .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || (await fetchPromise) || Response.error();
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    return (await cache.match(APP_SHELL)) || (await cache.match(request)) || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(BASE_PATH)) return;

  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req));
    return;
  }

  const isStatic =
    url.pathname.startsWith(p("js/")) ||
    url.pathname.startsWith(p("assets/")) ||
    url.pathname === p("styles.css") ||
    url.pathname === p("manifest.json");

  if (isStatic) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  event.respondWith(caches.match(req).then(c => c || fetch(req)));
});
