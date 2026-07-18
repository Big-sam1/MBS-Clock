/* MBS Smart Clock - Service Worker for PWA Offline Support */

const CACHE_NAME = 'mbs-clock-v2';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favi.png',
  '/icon-192.png',
  '/icon-512.png'
];

// Install — pre-cache core assets individually so one failure doesn't break the whole SW
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching core assets...');
      // Use individual add() with catch so one failed asset does not abort install
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] Failed to cache:', url, err);
          })
        )
      );
    }).then(() => {
      console.log('[SW] Install complete — skipping wait');
      return self.skipWaiting();
    })
  );
});

// Activate — remove old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activated — claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch — bypass API routes, cache-first for static assets
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Always bypass API routes — never cache live data
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request).catch(() => {
      return new Response(JSON.stringify({ error: 'Offline' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }));
    return;
  }

  // Bypass external resources (CDN, fonts, weather)
  if (url.origin !== self.location.origin) {
    e.respondWith(fetch(e.request).catch(() => new Response('')));
    return;
  }

  // Cache-first strategy for local static assets
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;

      return fetch(e.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, toCache));
        return response;
      });
    }).catch(() => {
      if (e.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});
