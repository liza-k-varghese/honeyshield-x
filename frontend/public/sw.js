// HoneyShield X PWA Service Worker
// Security Policy: Never cache live SOC telemetry, authenticated endpoints, or sensitive security alerts.

const CACHE_NAME = 'hsx-shell-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // STRICT SECURITY CHECK:
  // Live API endpoints, telemetry streams, and backend services MUST NEVER BE CACHED.
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/health') ||
    event.request.method !== 'GET' ||
    event.request.headers.has('Authorization')
  ) {
    // Pass straight to the network without caching
    event.respondWith(fetch(event.request));
    return;
  }

  // Static UI shell handling: network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Network error (offline)', { status: 503 });
        });
      })
  );
});

