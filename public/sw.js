// SpeechBuddy AI Service Worker — Cache First Offline Strategy

const CACHE_NAME = 'speechbuddy-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/?view=speechbuddy',
  '/manifest.json',
  '/favicon.ico',
];

// Install Event
self.addEventListener('install', (event: any) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  (self as any).skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event: any) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  (self as any).clients.claim();
});

// Fetch Event
self.addEventListener('fetch', (event: any) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Fallback for offline mode when asset isn't in cache
        return caches.match('/?view=speechbuddy');
      });
    })
  );
});
