/* Home Comfort NY (SUNY ESF) - check-in app service worker (scope /homecomfort-ny/checkin/).
 * Shows the hourly reminder when a push arrives and opens the app when it is tapped. On Android the
 * notification also has a "Not home" button, which pauses reminders for two hours without opening the
 * app (the app shows the pause next time it is opened). iPhone shows the notification without buttons.
 * It also keeps a copy of the app's own files, network first, so the app still opens without a
 * connection (check-ins made offline wait in the app's queue). Ported from the SWITCH app's sw.js. */
importScripts('../config.js');
const CFG = self.HC_CONFIG || {};
const CACHE = 'hcny-checkin-v1';
const BASE = new URL('../', self.registration.scope).pathname;   // /homecomfort-ny/

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(k => k.startsWith('hcny-checkin-') && k !== CACHE).map(k => caches.delete(k)));
  await self.clients.claim();
})()));

/* Network first for this study's own files (always the newest when online), the saved copy when offline.
 * Fonts and the study database are never touched here. */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;
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

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
  const options = {
    body: d.body || 'A quick comfort check-in, under a minute.',
    icon: 'icon-192.png',
    badge: 'badge-96.png',                                     // Android's status bar uses only the alpha: a white house on transparent
    tag: /^hcny/.test(d.tag || '') ? d.tag : 'hcny-checkin',     // never another study's tag: both apps live on one site
    renotify: true,
    data: { url: d.url || './?from=push', participant: d.participant || '', sentAt: d.sentAt || '' },
    actions: [
      { action: 'open', title: "I'm home" },
      { action: 'away', title: 'Not home' }
    ]
  };
  e.waitUntil(self.registration.showNotification(d.title || 'How does your home feel?', options));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const data = e.notification.data || {};
  if (e.action === 'away') { e.waitUntil(pauseReminders(120)); return; }
  const url = new URL(data.url || './?from=push', self.registration.scope).href;
  // Only windows this worker controls: navigate() refuses any other, which left the app open on the
  // wrong screen. Without one, a fresh window opens.
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(list => {
    for (const c of list) {
      if (c.url.startsWith(self.registration.scope) && 'focus' in c) { c.navigate(url).catch(() => {}); return c.focus(); }
    }
    return self.clients.openWindow(url);
  }));
});

/* "Not home": pauses reminders on this phone through update_push_schedule (supabase-setup.sql). The
 * phone's push endpoint identifies its row; the public key cannot change the table directly. */
async function pauseReminders(minutes) {
  if (!CFG.supabaseUrl || !CFG.supabaseAnonKey) return;
  const until = new Date(Date.now() + minutes * 60000).toISOString();
  try {
    const sub = await self.registration.pushManager.getSubscription();
    if (!sub) return;
    await fetch(`${CFG.supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/update_push_schedule`, {
      method: 'POST',
      headers: { apikey: CFG.supabaseAnonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_endpoint: sub.endpoint, p_changes: { paused_until: until } })
    });
  } catch (err) { /* offline: the next reminder will simply arrive on schedule */ }
}
