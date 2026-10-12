/* Service worker ESS Catalogue : coquille + donnees en network-first, images en cache-first */
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest',
  'libs/jspdf.umd.min.js', 'img/icon-192.png', 'img/icon-512.png', 'img/logo-header.png'];
const V_SHELL = 'ess-shell-v13', V_IMG = 'ess-img-v5', V_DATA = 'ess-data-v1';
const GARDER = [V_SHELL, V_IMG, V_DATA];

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
    ks.filter(k => GARDER.indexOf(k) < 0).map(k => caches.delete(k))))
    .catch(() => null).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  /* ----- donnees (catalogue, descriptions) : reseau d'abord, cache en secours -----
     La cle de cache ignore le ?e=1 de la boucle de tentatives, sinon chaque
     essai cree une entree differente et le hors-connexion ne retrouve rien. */
  if (url.pathname.indexOf('/data/') >= 0) {
    const cle = new Request(url.pathname);
    e.respondWith((async () => {
      let c = null;
      try { c = await caches.open(V_DATA); } catch (er) {}
      if (!navigator.onLine && c) { const h = await c.match(cle); if (h) return h; }
      try {
        const r = await fetch(e.request);
        if (r.ok && c) c.put(cle, r.clone()).catch(() => {});
        return r;
      } catch (er) {
        const h = c ? await c.match(cle) : null;
        if (h) return h;
        return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    })());
    return;
  }

  /* ----- images : cache d'abord (elles ne changent jamais) ----- */
  if (url.pathname.indexOf('/images/') >= 0) {
    e.respondWith(caches.open(V_IMG).then(async c => {
      const hit = await c.match(e.request).catch(() => null);
      if (hit) return hit;
      try { const r = await fetch(e.request); if (r.ok) c.put(e.request, r.clone()); return r; }
      catch (er) { return hit || Response.error(); }
    }));
    return;
  }

  /* ----- coquille : reseau d'abord, cache en secours ----- */
  e.respondWith(fetch(e.request).then(r => {
    const cp = r.clone(); caches.open(V_SHELL).then(c => c.put(e.request, cp)).catch(() => {}); return r;
  }).catch(() => caches.match(e.request).then(m => m || caches.match('index.html'))));
});
