// ============================================================================
// PINTOREX DOCUMENT GENERATOR - SERVICE WORKER
// Enables offline use of the quotation generator PWA
// ============================================================================

const CACHE_NAME = 'pintorex-site-v10';
const OFFLINE_URL = '/quotation-generator.html';

// Assets to cache for offline use (full site + quotation generator)
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/script/first.js',
  '/quotation-generator.html',
  '/styles.css',
  '/script/quotation-generator-script.js',
  '/script/lib/jspdf.umd.min.js',
  '/script/lib/jspdf.plugin.autotable.min.js',
  '/script/lib/qrcode.min.js',
  '/script/lib/tailwind.min.css',
  '/images/logo_pint.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/manifest.json',
  '/verify.html'
];

// Google Fonts to cache
const FONT_URLS = [
  'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap'
];

// ============================================================================
// INSTALL EVENT - Pre-cache essential assets
// ============================================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pre-caching essential assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        // Activate immediately without waiting for old SW to finish
        return self.skipWaiting();
      })
  );
});

// ============================================================================
// ACTIVATE EVENT - Clean up old caches
// ============================================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        // Take control of all pages immediately
        return self.clients.claim();
      })
      .then(() => {
        // Notify all open tabs that the SW has been updated
        return self.clients.matchAll({ type: 'window' });
      })
      .then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
        });
      })
  );
});

// ============================================================================
// FETCH EVENT - Serve from cache, fallback to network
// ============================================================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests (POST for auth, etc.)
  if (event.request.method !== 'GET') {
    return;
  }

  // Strategy for API calls: network only (don't cache API responses)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Protect sensitive documents — never cache
  if (url.pathname.includes('/docs/')) {
    return;
  }

  // Strategy for Google Fonts: cache first, then network
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request)
        .then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          });
        })
        .catch(() => {
          // Fonts fail silently - system fonts will be used
          return new Response('', { status: 200, headers: { 'Content-Type': 'text/css' } });
        })
    );
    return;
  }

  // Strategy for local assets: stale-while-revalidate
  // Serve cached version immediately, update cache in background
  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        // Start a network fetch in the background to update cache
        const networkFetch = fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // Network failed, that's ok if we have cache
            return null;
          });

        // Return cached version immediately, or wait for network
        return cached || networkFetch;
      })
      .then((response) => {
        if (response) return response;
        // If both cache and network fail, show offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      })
  );
});

// ============================================================================
// MESSAGE EVENT - Handle update messages from client
// ============================================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
