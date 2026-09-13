/* Lot Calculator — service worker
   Версию меняй при каждом обновлении файлов: старые кеши удаляются сами. */
const VERSION = 'lot-calc-v4';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html');

  if (isPage) {
    /* Страница — сначала сеть: так правки доезжают сразу, а офлайн работает из кеша */
    event.respondWith(
      fetch(req)
        .then(res => {
          caches.open(VERSION).then(cache => cache.put('./index.html', res.clone()));
          return res;
        })
        .catch(() => caches.match('./index.html').then(hit => hit || caches.match('./')))
    );
    return;
  }

  /* Остальное — из кеша, с тихим обновлением в фоне */
  event.respondWith(
    caches.match(req).then(hit => {
      const network = fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            caches.open(VERSION).then(cache => cache.put(req, res.clone()));
          }
          return res;
        })
        .catch(() => hit);
      return hit || network;
    })
  );
});
