const CACHE_NAME = "alameen-pwa-v4";
const API_CACHE_NAME = "alameen-api-v4";

const API_CACHE_PATHS = [
  '/api/admin/workshop/orders',
  '/api/admin/inventory/items',
  '/api/admin/customers',
  '/api/admin/invoices',
  '/api/admin/suppliers',
  '/api/admin/reports/summary',
  '/api/admin/reports/expenses-income',
  '/api/admin/reports/suppliers',
  '/api/admin/payment-methods',
  '/api/admin/digital-fee',
  '/api/admin/treasuries',
  '/api/admin/inventory/categories'
];

function shouldCacheApi(url) {
  return API_CACHE_PATHS.some(p => url.includes(p));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME && k !== API_CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = event.request.url;
  const isApi = url.includes("/api/");

  if (event.request.method !== "GET") return;

  if (isApi && shouldCacheApi(url)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok && response.status === 200) {
            const clone = response.clone();
            caches.open(API_CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached || new Response(JSON.stringify({ error: "offline" }), {
            status: 503,
            headers: { "Content-Type": "application/json" }
          }))
        )
    );
    return;
  }

  if (isApi) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && !url.includes("/api/")) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((r) => r || caches.match("/"))
      )
  );
});
