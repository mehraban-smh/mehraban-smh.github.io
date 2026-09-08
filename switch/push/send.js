/* SWITCH comfort study - reminder sender.
 * Runs at the top of every hour from the GitHub Actions workflow in .github/workflows/push-reminders.yml.
 * For every registered phone it decides whether a check-in reminder is due right now, and sends a
 * web push if so. All the "smart" rules live in decide() below. A phone is sent to when:
 *   - reminders are on and not paused (the participant has not said they are out),
 *   - at least an hour has passed since they said they had just got in (settled_at),
 *   - at least 30 minutes have passed since their last check-in (last_vote_at),
 *   - at least half an interval (30 minutes for the hourly interval) has passed since the last
 *     reminder (last_prompt_at): the cron is not punctual and consecutive runs can be anywhere
 *     from about 48 to 70 minutes apart, so a guard close to the full interval skipped whole hours,
 *   - the phone's local time is inside the participant's home hours.
 *
 * Secrets (GitHub repository secrets, see switch/README.md):
 *   SUPABASE_SERVICE_ROLE_KEY  a Supabase secret key (sb_secret_...)
 *   VAPID_PRIVATE_KEY          the 43-character private key that pairs with vapidPublicKey in config.js
 * The project URL, the VAPID public key and the reminder interval (reminderIntervalMin) are public
 * and are read from ../config.js.
 * Optional:
 *   FORCE_PARTICIPANT  send to this code right now, ignoring every rule (manual test run)
 *   DRY_RUN=1          decide and log, but send nothing
 */
const fs = require('fs');
const path = require('path');
const webpush = require('web-push');

const config = fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8');
const cfgVal = k => (config.match(new RegExp(k + ':\\s*"([^"]*)"')) || [])[1] || '';
const cfgNum = k => { const m = config.match(new RegExp(k + ':\\s*(\\d+)')); return m ? +m[1] : null; };
const PUB = cfgVal('vapidPublicKey');
const TABLE = cfgVal('pushTable') || 'push_subscriptions';
const INTERVAL = cfgNum('reminderIntervalMin');   // minutes between reminders; the same value the app shows
const cleanUrl = u => (u || '').trim().replace(/\/+$/, '').replace(/\/(rest|auth)\/v1$/, '');
const looksLikeProject = u => /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(u);
const envUrl = cleanUrl(process.env.SUPABASE_URL);
const URL_ = looksLikeProject(envUrl) ? envUrl : cleanUrl(cfgVal('supabaseUrl'));

// Secrets are trimmed and normalised so a copy-paste slip gives a clear message instead of a mystery.
const rawKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const KEY = (rawKey.match(/sb_secret_[A-Za-z0-9_-]+/) || rawKey.match(/eyJ[A-Za-z0-9_.-]+/) || [rawKey])[0];
const rawPriv = process.env.VAPID_PRIVATE_KEY || '';
const PRIV = rawPriv.split(/\s+/).filter(l => /^[A-Za-z0-9_-]{43}$/.test(l)).pop() || rawPriv.trim();
const FORCE = (process.env.FORCE_PARTICIPANT || '').trim().toUpperCase();
const DRY = process.env.DRY_RUN === '1';
const SUBJECT = 'mailto:info@mehraban.uk';

function fail(msg) { console.error('ERROR: ' + msg); process.exit(1); }
const mask = s => s ? s.slice(0, 12) + '...(' + s.length + ' chars)' : '(empty)';
console.log(`Supabase URL: ${URL_ || '(empty)'}`);
console.log(`Secret key:   ${mask(KEY)}`);
console.log(`VAPID key:    ${PRIV ? PRIV.length + ' chars' : '(empty)'}${DRY ? ' (dry run)' : ''}`);
console.log(`Interval:     ${INTERVAL ? INTERVAL + ' min (config.js)' : 'not in config.js, using each phone\'s interval_min'}`);
if (!URL_) fail('supabaseUrl is empty in switch/config.js');
if (!looksLikeProject(URL_)) fail(`supabaseUrl in switch/config.js does not look like a project URL: "${URL_}"`);
if (!KEY) fail('SUPABASE_SERVICE_ROLE_KEY secret is empty. Create a secret key under Settings > API Keys > Secret keys');
if (KEY.startsWith('sb_publishable_')) fail('SUPABASE_SERVICE_ROLE_KEY contains the publishable key. It needs a secret key (sb_secret_...) from Settings > API Keys > Secret keys');
if (!PUB) fail('vapidPublicKey is empty in switch/config.js');
if (!PRIV && !DRY) fail('VAPID_PRIVATE_KEY secret is empty. Paste the whole content of switch-vapid-private-key.txt');
if (!DRY && !/^[A-Za-z0-9_-]{43}$/.test(PRIV)) fail(`VAPID_PRIVATE_KEY should be the 43-character key from switch-vapid-private-key.txt (got ${PRIV.length} characters). Open the file, select all, copy, and paste it as the secret`);
if (!DRY) {
  // Derive the public key from the private one and compare, so a mismatched pair fails here, not at the push service.
  try {
    const ecdh = require('crypto').createECDH('prime256v1');
    ecdh.setPrivateKey(Buffer.from(PRIV, 'base64url'));
    const derived = ecdh.getPublicKey().toString('base64url');
    if (derived !== PUB) fail('VAPID_PRIVATE_KEY does not match vapidPublicKey in switch/config.js. Paste the current content of switch-vapid-private-key.txt into the secret');
    webpush.setVapidDetails(SUBJECT, PUB, PRIV);
  } catch (e) { if (e && e.message && !/does not match/.test(e.message)) fail('VAPID keys were rejected: ' + e.message); }
}

// New-style secret keys (sb_secret_...) go in the apikey header only; legacy service_role JWTs also need Bearer.
const headers = KEY.startsWith('sb_secret_')
  ? { apikey: KEY, 'Content-Type': 'application/json' }
  : { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
const rest = q => `${URL_}/rest/v1/${TABLE}${q}`;
const MIN = 60000;

const toMin = hhmm => { const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };

/* Returns 'send' or the reason for skipping. */
function decide(sub, now) {
  if (FORCE) return sub.participant === FORCE ? 'send' : 'not the test participant';
  if (!sub.enabled) return 'reminders off';
  if (sub.paused_until && new Date(sub.paused_until) > now) return 'paused (away)';
  if (sub.settled_at && now - new Date(sub.settled_at) < 60 * MIN) return 'settling in after arriving home';
  if (sub.last_vote_at && now - new Date(sub.last_vote_at) < 30 * MIN) return 'checked in recently';
  const interval = INTERVAL || sub.interval_min || 60;
  // Half the interval, not "interval minus a few minutes": GitHub's cron jitter would otherwise skip hours.
  if (sub.last_prompt_at && now - new Date(sub.last_prompt_at) < Math.round(interval / 2) * MIN) return 'reminded recently';
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
  if (r.status === 401 || r.status === 403) fail(`Supabase refused the secret key (${r.status}). Check the SUPABASE_SERVICE_ROLE_KEY secret: ${await r.text()}`);
  if (r.status === 404) fail(`table ${TABLE} was not found. Run supabase-setup.sql again in the SQL editor: ${await r.text()}`);
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
      } else if (err.statusCode === 401 || err.statusCode === 403) {
        console.error(`send failed for ${sub.participant}: the push service rejected the signature (${err.statusCode}). This phone registered with a different public key; ask them to turn reminders off and on again in the app`);
      } else {
        console.error(`send failed for ${sub.participant}: ${err.statusCode || ''} ${err.body || err.message}`);
      }
    }
  }
  console.log(`${now.toISOString()} - ${subs.length} registered phone(s), sent ${sent}, removed ${removed}`);
  for (const [k, v] of Object.entries(summary)) console.log(`  ${v} x ${k}`);
}
main().catch(err => fail(err.message));
