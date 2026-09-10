// EduAI OS Service Worker — Network First with Stale Chunk Protection

const CACHE_NAME = 'eduai-cache-v5';

// Install Event
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Skip waiting message listener
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate Event - wipe out all previous caches immediately
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

  // Only intercept same-origin requests; never intercept third-party APIs, gateways, or cross-domain endpoints
  if (!url.startsWith(self.location.origin)) return;

  // Let browser natively handle JS/CSS bundle chunks, assets & API calls to prevent MIME type & stale chunk errors
  if (url.includes('/api/') || url.includes('.js') || url.includes('.css') || url.includes('/assets/')) return;

  // For HTML navigation requests, ALWAYS fetch fresh from network to guarantee latest script bundle hashes
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' }).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            try { cache.put(event.request, responseToCache); } catch (_) {}
          });
        }
        return networkResponse;
      }).catch(() => {
        return caches.match(event.request).then((cached) => cached || caches.match('/index.html'));
      })
    );
    return;
  }

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
      return caches.match(event.request).then((cached) => cached || new Response('Offline', { status: 503, statusText: 'Service Unavailable' }));
    })
  );
});
