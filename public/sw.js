const CACHE_NAME = "avencia-mobile-v1";
const SHELL_ASSETS = [
  "/mobile",
  "/mobile/sell",
  "/mobile/products",
  "/mobile/customers",
  "/mobile/sales",
  "/mobile/more",
  "/manifest.json",
  "/logo/Avencia gold icon logo.png",
  "/apple-icon.png",
  "/icon.png",
];

// 1. Install & Cache Shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS).catch((err) => {
        console.warn("Service worker cache pre-fetch warning:", err);
      });
    })
  );
  self.skipWaiting();
});

// 2. Activate & Clean Old Caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch Strategy:
// For API calls: Network first
// For Static assets / Pages: Stale-While-Revalidate with offline fallback
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // API calls: Network first
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Shell assets & navigations: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If network fails and no cached response, fallback to /mobile
          if (event.request.mode === "navigate") {
            return caches.match("/mobile");
          }
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
