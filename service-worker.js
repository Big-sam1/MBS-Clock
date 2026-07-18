/* Smart Alarm Pro - Service Worker for Offline Execution */

const CACHE_NAME = 'smart-alarm-pro-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/themes.css',
  './css/main.css',
  './css/components.css',
  './css/responsive.css',
  './js/app.js',
  './js/utils/helpers.js',
  './js/services/storage.js',
  './js/services/alarmService.js',
  './js/services/audioService.js',
  './js/services/voiceService.js',
  './js/services/weatherService.js',
  './js/services/notificationService.js',
  './js/services/pwaService.js',
  './js/components/dashboard.js',
  './js/components/clock.js',
  './js/components/calendar.js',
  './js/components/timer.js',
  './js/components/analytics.js',
  './js/components/settings.js'
];

// Install Service Worker and cache all static resources
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW caching local static assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate event (clean up old caches)
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('SW cleaning outdated cache database:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event listener
self.addEventListener('fetch', (e) => {
  // Bypasses weather fetches or external assets to avoid caching errors
  if (e.request.url.includes('api.open-meteo.com')) {
    e.respondWith(fetch(e.request));
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached asset immediately
        return cachedResponse;
      }
      
      // Fallback to fetch from network if missing
      return fetch(e.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Cache newly fetched assets dynamically
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });

        return networkResponse;
      });
    }).catch(() => {
      // Offline fallback for index page if network fails and cache is empty
      if (e.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
