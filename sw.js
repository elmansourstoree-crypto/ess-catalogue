/* Service worker ESS Catalogue : coquille en network-first, images en cache-first */
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest',
  'data/products.json', 'libs/jspdf.umd.min.js', 'img/icon-192.png', 'img/icon-512.png', 'img/logo-header.png'];
const V_SHELL = 'ess-shell-v10', V_IMG = 'ess-img-v2';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V_SHELL).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(
    ks.filter(k => k !== V_SHELL && k !== V_IMG).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  /* Safari gere mal la mise en cache des gros fichiers de donnees : on laisse passer */
  if (url.pathname.includes('/data/')) return;
  if (url.pathname.includes('/images/')) {
    e.respondWith(caches.open(V_IMG).then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      try { const r = await fetch(e.request); if (r.ok) c.put(e.request, r.clone()); return r; }
      catch { return hit || Response.error(); }
    }));
    return;
  }
  e.respondWith(fetch(e.request).then(r => {
    const cp = r.clone(); caches.open(V_SHELL).then(c => c.put(e.request, cp)); return r;
  }).catch(() => caches.match(e.request).then(m => m || caches.match('index.html'))));
});
