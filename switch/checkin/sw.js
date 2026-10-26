/* HomePulse (SWITCH home comfort study) - check-in app service worker (scope /switch/checkin/).
 * Shows the hourly reminder when a push arrives and opens the app when it is tapped. On Android the
 * notification also has a "Not home" button, which pauses reminders for two hours without opening the
 * app (the app shows the pause next time it is opened). iPhone shows the notification without buttons.
 * It also keeps a copy of the app's own files, network first, so the app still opens without a connection
 * (check-ins made offline wait in the app's queue). Network-first caching as in the sister study's worker. */
importScripts('../config.js');
const CFG = self.SWITCH_CONFIG || {};
const APP = CFG.appName || 'HomePulse';
const CACHE = 'switch-checkin-v16';
const BASE = new URL('../', self.registration.scope).pathname;   // /switch/

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(k => k.startsWith('switch-checkin-') && k !== CACHE).map(k => caches.delete(k)));
  await self.clients.claim();
})()));

/* Network first for this study's own files (always the newest when online), the saved copy when offline.
 * Fonts and the study database are never touched here, nor the dashboard. */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE) || url.pathname.startsWith(BASE + 'dashboard/')) return;
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

/* The reminder's words come with the push (send.js: title, body, lang, actions, in the participant's language).
 * Without them (an older sender), the words of the language this phone uses: the app keeps it in the 'switch-prefs'
 * cache. The action ids never change: 'open' and 'away'. */
const TEXTS = {
  en: { title: `${APP}: how does your home feel?`, body: 'A quick comfort check-in, under a minute.',
        actions: [{ action: 'open', title: "I'm home" }, { action: 'away', title: 'Not home' }] },
  cy: { title: `${APP}: sut mae'ch cartref yn teimlo?`, body: "Cofnodwch sut rydych chi'n teimlo — llai na munud.",
        actions: [{ action: 'open', title: 'Rydw i gartref' }, { action: 'away', title: 'Dydw i ddim gartref' }] }
};
async function phoneLang() {
  try { const c = await caches.open('switch-prefs'), r = await c.match('lang'); return r && (await r.text()) === 'cy' ? 'cy' : 'en'; }
  catch (err) { return 'en'; }
}
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil((async () => {
    const lang = d.lang === 'cy' || d.lang === 'en' ? d.lang : await phoneLang(), T = TEXTS[lang];
    const acts = Array.isArray(d.actions) && d.actions.length ? d.actions.filter(a => a && (a.action === 'open' || a.action === 'away') && a.title) : [];
    await self.registration.showNotification(d.title || T.title, {
      body: d.body || T.body,
      lang: lang === 'cy' ? 'cy' : 'en-GB',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: /^switch/.test(d.tag || '') ? d.tag : 'switch-checkin',   // never another study's tag: both apps live on one site
      renotify: true,
      data: { url: d.url || './?from=push', participant: d.participant || '', sentAt: d.sentAt || '' },
      actions: acts.length ? acts : T.actions
    });
  })());
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
