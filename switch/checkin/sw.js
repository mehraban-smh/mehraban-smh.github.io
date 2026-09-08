/* SWITCH comfort check-in - service worker.
 * Shows the hourly reminder when a push arrives and opens the app when it is tapped.
 * On Android the notification also has a "Not home" button, which pauses reminders for two hours
 * without opening the app. iPhone shows the notification without buttons.
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
  if (e.action === 'away') { e.waitUntil(pauseReminders(data.participant, 120)); return; }
  const url = new URL(data.url || './?from=push', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) {
      if (c.url.startsWith(self.registration.scope) && 'focus' in c) { c.navigate(url); return c.focus(); }
    }
    return self.clients.openWindow(url);
  }));
});

async function pauseReminders(participant, minutes) {
  if (!participant || !CFG.supabaseUrl || !CFG.supabaseAnonKey) return;
  const until = new Date(Date.now() + minutes * 60000).toISOString();
  try {
    await fetch(`${CFG.supabaseUrl.replace(/\/$/, '')}/rest/v1/${CFG.pushTable || 'push_subscriptions'}?participant=eq.${encodeURIComponent(participant)}`, {
      method: 'PATCH',
      headers: { apikey: CFG.supabaseAnonKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ paused_until: until, updated_at: new Date().toISOString() })
    });
  } catch (err) { /* offline: the next reminder will simply arrive on schedule */ }
}
