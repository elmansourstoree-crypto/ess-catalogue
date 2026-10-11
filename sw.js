/* Service worker ESS Catalogue : coquille en network-first, images en cache-first */
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest',
  'libs/jspdf.umd.min.js', 'img/icon-192.png', 'img/icon-512.png', 'img/logo-header.png'];
const V_SHELL = 'ess-shell-v11', V_IMG = 'ess-img-v3';

self.addEventListener('install', e => {
  /* Safari : si la mise en cache de la coquille echoue, on active quand meme le SW,
     sinon une vieille version reste bloquee sur le telephone. */
  e.waitUntil(caches.open(V_SHELL)
    .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null))))
    .catch(() => null)
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(
    ks.filter(k => k !== V_SHELL && k !== V_IMG).map(k => caches.delete(k))))
    .catch(() => null).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  /* Les fichiers de donnees ne passent jamais par le cache (trop gros pour Safari) */
  if (url.pathname.indexOf('/data/') >= 0) return;
  if (url.pathname.indexOf('/images/') >= 0) {
    e.respondWith(caches.open(V_IMG).then(async c => {
      const hit = await c.match(e.request).catch(() => null);
      if (hit) return hit;
      try { const r = await fetch(e.request); if (r.ok) c.put(e.request, r.clone()); return r; }
      catch (er) { return hit || Response.error(); }
    }));
    return;
  }
  e.respondWith(fetch(e.request).then(r => {
    const cp = r.clone(); caches.open(V_SHELL).then(c => c.put(e.request, cp)).catch(() => {}); return r;
  }).catch(() => caches.match(e.request).then(m => m || caches.match('index.html'))));
});
