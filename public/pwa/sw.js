/* CO-C1-EMPLOYEE-PWA-001 — Catalyst One employee shell cache only. */
const CACHE_NAME = "catalyst-one-employee-pwa-shell-v1";
const OFFLINE_URL = "/pwa/offline.html";
const SHELL_URLS = [
  "/pwa/offline.html",
  "/pwa/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ).then(() => self.clients.claim()),
  );
});

function isSensitive(request) {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) return true;
  if (url.pathname.includes("otp") || url.pathname.includes("token")) return true;
  if (url.pathname.includes("binary") || url.pathname.includes("download")) return true;
  if (request.headers.has("Authorization")) return true;
  return false;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  if (isSensitive(request)) return;

  const url = new URL(request.url);
  const isShellAsset = SHELL_URLS.includes(url.pathname);
  const isPwaDocument =
    request.mode === "navigate" && url.pathname.startsWith("/pwa");

  if (isShellAsset) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request)),
    );
    return;
  }

  if (isPwaDocument) {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification && event.notification.data && event.notification.data.url) || "/pwa/work/notifications";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
      return undefined;
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
