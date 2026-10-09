const CACHE_NAME = "avencia-mobile-v2";
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
// Only intercept same-origin requests to prevent intercepting external Cloudflare/S3/CDN resources
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Skip browser extensions, schemes other than http/https
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // Skip cross-origin requests (e.g. Cloudflare R2, AWS S3, Google Fonts, external CDNs)
  // Let the browser handle external requests natively without service worker interception
  if (url.origin !== self.location.origin) {
    return;
  }

  // API calls: Network first with safe offline JSON response
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request)
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return new Response(
            JSON.stringify({ success: false, error: "Network request failed. Offline mode.", offline: true }),
            {
              status: 503,
              statusText: "Service Unavailable",
              headers: { "Content-Type": "application/json" },
            }
          );
        })
    );
    return;
  }

  // Shell assets & navigations: Stale-While-Revalidate with safe fallback Response
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(event.request);

      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      } catch (err) {
        // Network failed - return cached response if present
        if (cachedResponse) {
          return cachedResponse;
        }

        // Navigation fallback to /mobile
        if (event.request.mode === "navigate") {
          const fallback = await caches.match("/mobile");
          if (fallback) return fallback;
        }

        // Return a valid Response object so Service Worker never rejects with
        // "TypeError: Failed to convert value to 'Response'"
        return new Response(null, {
          status: 504,
          statusText: "Gateway Timeout",
        });
      }
    })()
  );
});
