// Uni Manager Progressive Web App Service Worker
const CACHE_NAME = "uni-manager-cache-v1";

const PRECACHE_URLS = [
  "/",
  "/dashboard",
  "/schedule",
  "/tasks",
  "/courses",
  "/settings",
  "/login",
  "/icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/my-university-logo.png",
  "/my-university-logo-dark.png",
  "/favicon.ico",
  "/manifest.json",
];

// Install: precache the core shell and static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        // Use Promise.allSettled so an individual asset failure doesn't break installation
        return Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            fetch(url, { cache: "reload" })
              .then((res) => {
                if (res.ok) return cache.put(url, res);
              })
              .catch((err) => {
                console.warn("[SW] Precache skipped for:", url, err);
              })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old cache versions and claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: handle offline caching strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Let Supabase API requests pass through directly; offline data layer handles DB caching
  if (url.hostname.includes("supabase.co")) {
    return;
  }

  // 1. Navigation requests (HTML pages)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          // Offline fallback for navigation
          const cache = await caches.open(CACHE_NAME);
          const cachedMatch = await cache.match(request);
          if (cachedMatch) return cachedMatch;

          // If specific URL isn't cached, return cached dashboard or root
          const fallback = (await cache.match("/dashboard")) || (await cache.match("/"));
          if (fallback) return fallback;

          return new Response(
            "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Offline - Uni Manager</title><meta name='viewport' content='width=device-width,initial-scale=1'></head><body style='font-family:sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#09090b;color:#f4f4f5;text-align:center;'><div><h1>You are offline</h1><p>Please reconnect to the internet to load new views, or reopen a previously visited page.</p><button onclick='location.reload()' style='padding:10px 20px;border-radius:8px;background:#c8102e;color:#fff;border:none;cursor:pointer;font-weight:600;'>Retry</button></div></body></html>",
            { headers: { "Content-Type": "text/html" } }
          );
        })
    );
    return;
  }

  // 2. Next.js static assets, fonts, icons, images (Stale-While-Revalidate / Cache-First)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|css|js)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse.ok) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default: Network with cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

