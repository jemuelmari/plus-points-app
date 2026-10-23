const CACHE_NAME = 'plus-points-v2'; // Binago ko sa v2 para ma-force refresh
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  self.skipWaiting(); // Pinipilit agad mag-activate ang bagong service worker
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key); // Binubura ang lumang cache
        }
      }));
    })
  );
});

self.addEventListener('fetch', (e) => {
  // Bypass cache for API calls to Google Apps Script
  if (e.request.url.includes('script.google.com')) {
    return;
  }
  
  // Network-first strategy: Kunin muna sa internet, kung wala, saka sa cache
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // I-save ang bagong version sa cache
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Kung walang internet, gamitin ang naka-cache
        return caches.match(e.request);
      })
  );
});
