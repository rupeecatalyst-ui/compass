/* COMPASS PWA service worker — public assets only. Never cache API or customer data. */
const CACHE_VERSION = "__PWA_CACHE_VERSION__";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGES_CACHE = `${CACHE_VERSION}-pages`;

const PRECACHE_URLS = ["/offline.html", "/pwa/icons/icon-192x192.png", "/pwa/icons/icon-512x512.png"];

/** Public marketing/legal pages only — never journey or API routes. */
const PUBLIC_PAGE_PATHS = new Set([
  "/",
  "/about",
  "/borrow",
  "/contact",
  "/privacy",
  "/terms",
  "/disclaimer",
  "/invest",
  "/loan-products",
]);

function isSensitiveRequest(request) {
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return true;
  if (url.pathname.startsWith("/api/")) return true;
  if (request.method !== "GET") return true;
  if (request.headers.has("authorization")) return true;
  if (url.pathname.includes("/journey")) return true;
  if (url.searchParams.has("discovery")) return true;
  if (url.searchParams.has("product")) return true;
  return false;
}

function isPublicPagePath(pathname) {
  if (!PUBLIC_PAGE_PATHS.has(pathname)) return false;
  return true;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (isSensitiveRequest(request)) {
    event.respondWith(fetch(request));
    return;
  }

  const url = new URL(request.url);

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  if (url.pathname.startsWith("/pwa/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && isPublicPagePath(url.pathname) && !url.search) {
            const copy = response.clone();
            caches.open(PAGES_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.open(PAGES_CACHE).then((c) => c.match(request));
          if (cached) return cached;
          return caches.match("/offline.html");
        }),
    );
    return;
  }

  event.respondWith(fetch(request));
});
