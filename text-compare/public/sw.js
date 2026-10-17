// Offline support: pages are fetched network-first, assets cache-first.
const PREFIX = 'vcl-text-compare-';
const CACHE = `${PREFIX}BUILD_VERSION`;
const SCOPE = self.registration.scope;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || !url.href.startsWith(SCOPE)) return;
  // the usage/admin server's answers must always be fresh
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin/")) return;
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.open(CACHE).then(async (cache) => await cache.match(req) || await cache.match(SCOPE) || Response.error())),
    );
    return;
  }
  e.respondWith(
    caches.open(CACHE).then((cache) => cache.match(req)).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
