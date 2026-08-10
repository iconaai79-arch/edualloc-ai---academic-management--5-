// EduAI OS Service Worker — Network First with Stale Chunk Protection

const CACHE_NAME = 'eduai-cache-v3';

// Install Event
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate Event
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

// Fetch Event
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = event.request.url;
  // Ignore non-http(s) schemes (e.g. chrome-extension://, moz-extension://)
  if (!url.startsWith('http://') && !url.startsWith('https://')) return;

  // Let browser natively handle JS/CSS bundle chunks & API calls to prevent MIME type & stale chunk errors
  if (url.includes('/api/') || url.includes('.js') || url.includes('.css')) return;

  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          try {
            cache.put(event.request, responseToCache);
          } catch (e) {
            // Ignore unsupported request schemes
          }
        });
      }
      return networkResponse;
    }).catch(() => {
      return caches.match(event.request).then((cached) => cached || Promise.reject('offline'));
    })
  );
});
