/* SWITCH comfort study - reminder sender.
 * Runs every half hour from the GitHub Actions workflow in .github/workflows/push-reminders.yml.
 * For every registered phone it decides whether a check-in reminder is due right now, and sends a
 * web push if so. All the "smart" rules live in decide() below.
 *
 * Environment (set as GitHub secrets, see switch/README.md):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PRIVATE_KEY
 * Optional:
 *   FORCE_PARTICIPANT  send to this code right now, ignoring every rule (manual test run)
 *   DRY_RUN=1          decide and log, but send nothing
 * The VAPID public key is read from ../config.js so there is one copy of it.
 */
const fs = require('fs');
const path = require('path');
const webpush = require('web-push');

const URL_ = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const PRIV = process.env.VAPID_PRIVATE_KEY || '';
const FORCE = (process.env.FORCE_PARTICIPANT || '').trim().toUpperCase();
const DRY = process.env.DRY_RUN === '1';
const SUBJECT = 'mailto:info@mehraban.uk';

const config = fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8');
const PUB = (config.match(/vapidPublicKey:\s*"([^"]+)"/) || [])[1] || '';
const TABLE = (config.match(/pushTable:\s*"([^"]+)"/) || [])[1] || 'push_subscriptions';

function fail(msg) { console.error('ERROR: ' + msg); process.exit(1); }
if (!URL_ || !KEY) fail('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
if (!PUB) fail('vapidPublicKey is empty in switch/config.js');
if (!PRIV && !DRY) fail('VAPID_PRIVATE_KEY must be set');
if (!DRY) webpush.setVapidDetails(SUBJECT, PUB, PRIV);

const headers = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
const rest = q => `${URL_}/rest/v1/${TABLE}${q}`;
const MIN = 60000;

const toMin = hhmm => { const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };

/* Returns 'send' or the reason for skipping. */
function decide(sub, now) {
  if (FORCE) return sub.participant === FORCE ? 'send' : 'not the test participant';
  if (!sub.enabled) return 'reminders off';
  if (sub.paused_until && new Date(sub.paused_until) > now) return 'paused (away)';
  if (sub.settled_at && now - new Date(sub.settled_at) < 60 * MIN) return 'settling in after arriving home';
  if (sub.last_vote_at && now - new Date(sub.last_vote_at) < 20 * MIN) return 'checked in recently';
  const interval = sub.interval_min || 30;
  if (sub.last_prompt_at && now - new Date(sub.last_prompt_at) < (interval - 5) * MIN) return 'reminded recently';
  const local = new Date(now.getTime() + (sub.tz_offset_min || 0) * MIN);
  const weekend = local.getUTCDay() === 0 || local.getUTCDay() === 6;
  const start = toMin(weekend ? sub.weekend_start : sub.weekday_start);
  const end = toMin(weekend ? sub.weekend_end : sub.weekday_end);
  const hm = local.getUTCHours() * 60 + local.getUTCMinutes();
  if (start !== null && end !== null && (hm < start || hm > end)) return 'outside home hours';
  return 'send';
}

async function main() {
  const now = new Date();
  const r = await fetch(rest('?select=*&order=participant'), { headers });
  if (!r.ok) fail(`could not read subscriptions (${r.status}): ${await r.text()}`);
  const subs = await r.json();
  const summary = {};
  let sent = 0, removed = 0;
  for (const sub of subs) {
    const verdict = decide(sub, now);
    summary[verdict] = (summary[verdict] || 0) + 1;
    if (verdict !== 'send') continue;
    const payload = JSON.stringify({
      title: 'How does your home feel?',
      body: 'A quick comfort check-in, under twenty seconds.',
      url: './?from=push',
      participant: sub.participant,
      tag: 'switch-checkin',
      sentAt: now.toISOString()
    });
    if (DRY) { console.log(`[dry run] would send to ${sub.participant}`); continue; }
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 25 * 60, urgency: 'high' });
      sent++;
      await fetch(rest(`?endpoint=eq.${encodeURIComponent(sub.endpoint)}`), { method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify({ last_prompt_at: now.toISOString() }) });
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        removed++;
        await fetch(rest(`?endpoint=eq.${encodeURIComponent(sub.endpoint)}`), { method: 'DELETE', headers });
        console.log(`removed a phone for ${sub.participant} that no longer accepts reminders`);
      } else {
        console.error(`send failed for ${sub.participant}: ${err.statusCode || ''} ${err.body || err.message}`);
      }
    }
  }
  console.log(`${now.toISOString()} - ${subs.length} registered phone(s), sent ${sent}, removed ${removed}`);
  for (const [k, v] of Object.entries(summary)) console.log(`  ${v} x ${k}`);
}
main().catch(err => fail(err.message));
