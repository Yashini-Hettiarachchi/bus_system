const APP_CACHE = 'osuri-app-v2';
const RUNTIME_CACHE = 'osuri-runtime-v2';
const OSURI_BASE = '/osuri';

const APP_SHELL = [
  `${OSURI_BASE}/`,
  `${OSURI_BASE}/index.html`,
  `${OSURI_BASE}/manifest.json`,
  `${OSURI_BASE}/offline.html`,
];

self.addEventListener('install', (event) => {
  // Save core app files so the app can still open when the network is down.
  event.waitUntil(caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Remove old cache versions after updates so users see the latest logic.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== APP_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    // For page loads: try network first, fallback to cached app if offline.
    event.respondWith(handleNavigation(request));
    return;
  }

  if (url.origin === self.location.origin) {
    // Static assets (js/css/icons): cache-first for faster loading.
    event.respondWith(cacheFirst(request));
    return;
  }

  if (
    url.pathname.startsWith('/ads') ||
    url.pathname.startsWith('/current_status') ||
    url.pathname.startsWith('/admin/ads') ||
    url.pathname.startsWith('/control_simulation')
  ) {
    // Live API data: network-first so ads/status refresh quickly.
    event.respondWith(networkFirst(request));
  }
});

async function handleNavigation(request) {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(APP_CACHE);
    cache.put(`${OSURI_BASE}/index.html`, networkResponse.clone());
    return networkResponse;
  } catch {
    const cache = await caches.open(APP_CACHE);
    return (
      (await cache.match(`${OSURI_BASE}/index.html`)) ||
      (await cache.match(`${OSURI_BASE}/offline.html`)) ||
      Response.error()
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(APP_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || networkPromise || Response.error();
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    const networkResponse = await fetch(request, { cache: 'no-store' });
    if (networkResponse && networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await cache.match(request);
    return cached || Response.error();
  }
}
