const CACHE_NAME = 'maps-explorer-v4';
const urlsToCache = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('SW install:', err))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const sameOrigin = e.request.url.startsWith(self.location.origin);
  const isAppAsset = sameOrigin && !e.request.url.includes('maps.googleapis.com');
  const isHtml = isAppAsset && (e.request.url.endsWith('.html') || e.request.url.endsWith('/') || e.request.mode === 'navigate');

  if (isHtml) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone();
          if (res.ok) caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html').then((x) => x || caches.match('./'))))
    );
  } else if (isAppAsset) {
    e.respondWith(
      caches.match(e.request)
        .then((cached) => {
          if (cached) return cached;
          return fetch(e.request).then((res) => {
            const clone = res.clone();
            if (res.ok) caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
            return res;
          });
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
  } else {
    e.respondWith(fetch(e.request).catch(() => caches.match('./index.html')));
  }
});
