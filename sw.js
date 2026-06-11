// MAS Dental Lab — Service Worker
const CACHE = 'mas-dental-v1';
const ASSETS = [
  '/BAN-dental/dental-app-charts.html',
  '/BAN-dental/manifest.json',
  '/BAN-dental/icon-192.png',
  '/BAN-dental/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
