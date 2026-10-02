/* SWITCH comfort check-in - service worker.
 * Shows the hourly reminder when a push arrives and opens the app when it is tapped.
 * On Android the notification also has a "Not home" button, which pauses reminders for two hours
 * without opening the app (the app shows the pause next time it is opened). iPhone shows the
 * notification without buttons.
 */
importScripts('../config.js');
const CFG = self.SWITCH_CONFIG || {};

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
  const options = {
    body: d.body || 'A quick comfort check-in, under twenty seconds.',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: d.tag || 'switch-checkin',
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
