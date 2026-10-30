/* MouldCast - the resident app's service worker (scope /mouldcast/app/). Keeps a copy of the app's own files and the
 * twin (network first), so the app opens without a connection. Notifications will come here once the study sends
 * them; the demo sends none. Network-first caching as in HomePulse's worker. */
const CACHE = 'mouldcast-app-v1';
const BASE = new URL('../', self.registration.scope).pathname;   // /mouldcast/

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(k => k.startsWith('mouldcast-app-') && k !== CACHE).map(k => caches.delete(k)));
  await self.clients.claim();
})()));

/* Network first for this project's own files (always the newest when online), the saved copy when offline.
 * Fonts and the housing team view are never touched here. */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE) || url.pathname.startsWith(BASE + 'staff/')) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
      return res;
    } catch (err) {
      const hit = await caches.match(req) || (req.mode === 'navigate' ? await caches.match(self.registration.scope, { ignoreSearch: true }) : null);
      return hit || Response.error();
    }
  })());
});
