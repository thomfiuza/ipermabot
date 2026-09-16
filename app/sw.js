/* IMP-BOT — Service Worker
   Cache-first para performance offline. v1.0
*/
const CACHE = 'impbot-v1.0';
const ARQUIVOS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './manifest.json'
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ARQUIVOS).catch(() => null))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys().then((ks) => ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  ev.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((resp) => {
      const clone = resp.clone();
      if (resp.status === 200 && req.url.startsWith('http')) {
        caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => null);
      }
      return resp;
    }).catch(() => cached))
  );
});
