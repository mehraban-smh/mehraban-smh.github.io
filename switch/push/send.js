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
 *   - the phone's local time is inside the participant's home hours: the weekday or weekend window
 *     (weekday_start/end, weekend_start/end), or the optional second window for that kind of day
 *     (weekday2_start/end, weekend2_start/end), which only counts when both of its bounds are set
 *     and the start is before the end.
 *
 * Secrets (GitHub repository secrets, see switch/README.md):
 *   SUPABASE_SERVICE_ROLE_KEY  a Supabase secret key (sb_secret_...)
 *   VAPID_PRIVATE_KEY          the 43-character private key that pairs with vapidPublicKey in config.js
 * The project URL, the VAPID public key and the reminder interval (reminderIntervalMin) are public
 * and are read from ../config.js.
 * Optional:
 *   FORCE_PARTICIPANT  send to this code right now, ignoring every rule (manual test run)
 *   DRY_RUN=1          decide and log, but send nothing
 *   SELFTEST=1         check the rules in decide() against known cases and exit. Needs no secrets,
 *                      reads and sends nothing:  SELFTEST=1 node send.js
 */
const fs = require('fs');
const path = require('path');

/* ---- the rules. Kept free of secrets and network so the self-test below can run them anywhere ---- */
const MIN = 60000;
const toMin = hhmm => { const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };

/* True when the phone's local time (now shifted by tz_offset_min, read with the UTC getters) is inside
 * the participant's home hours for that kind of day. The main window works as it always has: the time
 * must lie between start and end, and a bound that does not parse means no restriction. The second
 * window is optional and only counts when both of its bounds are present and the start is before the end. */
function insideHomeHours(sub, local) {
  const weekend = local.getUTCDay() === 0 || local.getUTCDay() === 6;
  const k = weekend ? 'weekend' : 'weekday';
  const hm = local.getUTCHours() * 60 + local.getUTCMinutes();
  const start = toMin(sub[k + '_start']), end = toMin(sub[k + '_end']);
  if (start === null || end === null || (hm >= start && hm <= end)) return true;
  const start2 = toMin(sub[k + '2_start']), end2 = toMin(sub[k + '2_end']);
  return start2 !== null && end2 !== null && start2 < end2 && hm >= start2 && hm <= end2;
}

/* Returns 'send' or the reason for skipping. opts.force is FORCE_PARTICIPANT (a code, or empty) and
 * opts.interval the reminder interval in minutes from config.js (null: the phone's own interval_min). */
function decide(sub, now, opts) {
  const force = (opts && opts.force) || '';
  if (force) return sub.participant === force ? 'send' : 'not the test participant';
  if (!sub.enabled) return 'reminders off';
  if (sub.paused_until && new Date(sub.paused_until) > now) return 'paused (away)';
  if (sub.settled_at && now - new Date(sub.settled_at) < 60 * MIN) return 'settling in after arriving home';
  if (sub.last_vote_at && now - new Date(sub.last_vote_at) < 30 * MIN) return 'checked in recently';
  const interval = (opts && opts.interval) || sub.interval_min || 60;
  // Half the interval, not "interval minus a few minutes": GitHub's cron jitter would otherwise skip hours.
  if (sub.last_prompt_at && now - new Date(sub.last_prompt_at) < Math.round(interval / 2) * MIN) return 'reminded recently';
  const local = new Date(now.getTime() + (sub.tz_offset_min || 0) * MIN);
  if (!insideHomeHours(sub, local)) return 'outside home hours';
  return 'send';
}

/* ---- self-check of the rules:  SELFTEST=1 node send.js  ---- */
function selfTest() {
  // Wednesday 9 and Saturday 12 September 2026. The phone is on UTC unless a case says otherwise, so
  // its local clock reads the same as the time written in the case.
  const weekday = hhmm => new Date(`2026-09-09T${hhmm}:00Z`);
  const weekend = hhmm => new Date(`2026-09-12T${hhmm}:00Z`);
  if (weekday('12:00').getUTCDay() !== 3 || weekend('12:00').getUTCDay() !== 6) { console.error('FAIL: the test dates are not a Wednesday and a Saturday'); process.exit(1); }
  const one = { participant: 'P01', enabled: true, tz_offset_min: 0, weekday_start: '17:00', weekday_end: '22:30', weekend_start: '09:00', weekend_end: '22:30' };
  const two = { ...one, weekday_start: '06:00', weekday_end: '09:00', weekday2_start: '17:00', weekday2_end: '23:00', weekend2_start: '06:00', weekend2_end: '08:30' };
  const iso = d => d.toISOString();
  const cases = [
    // one window only: unchanged
    ['one window, weekday 16:59', one, weekday('16:59'), 'outside home hours'],
    ['one window, weekday 17:00', one, weekday('17:00'), 'send'],
    ['one window, weekday 22:30', one, weekday('22:30'), 'send'],
    ['one window, weekday 22:31', one, weekday('22:31'), 'outside home hours'],
    ['one window, weekend 08:59', one, weekend('08:59'), 'outside home hours'],
    ['one window, weekend 09:00', one, weekend('09:00'), 'send'],
    ['one window, phone at UTC+1, 16:30Z is 17:30 local', { ...one, tz_offset_min: 60 }, weekday('16:30'), 'send'],
    ['one window, phone at UTC+1, 21:45Z is 22:45 local', { ...one, tz_offset_min: 60 }, weekday('21:45'), 'outside home hours'],
    ['one window, empty second-window columns', { ...one, weekday2_start: null, weekday2_end: null }, weekday('18:00'), 'send'],
    // two windows, 06:00-09:00 and 17:00-23:00 on weekdays
    ['two windows, weekday 08:30', two, weekday('08:30'), 'send'],
    ['two windows, weekday 12:00', two, weekday('12:00'), 'outside home hours'],
    ['two windows, weekday 17:00', two, weekday('17:00'), 'send'],
    ['two windows, weekday 23:30', two, weekday('23:30'), 'outside home hours'],
    ['two windows, weekend 07:00 (second window 06:00-08:30)', two, weekend('07:00'), 'send'],
    ['two windows, weekend 08:45 (between the windows)', two, weekend('08:45'), 'outside home hours'],
    // a half-filled or inverted second window is ignored
    ['second window with only a start', { ...one, weekday2_start: '06:00' }, weekday('07:00'), 'outside home hours'],
    ['second window with start after end', { ...one, weekday2_start: '09:00', weekday2_end: '06:00' }, weekday('07:00'), 'outside home hours'],
    ['second window with start equal to end', { ...one, weekday2_start: '07:00', weekday2_end: '07:00' }, weekday('07:00'), 'outside home hours'],
    // the other rules
    ['reminders off', { ...one, enabled: false }, weekday('18:00'), 'reminders off'],
    ['paused', { ...one, paused_until: iso(weekday('20:00')) }, weekday('18:00'), 'paused (away)'],
    ['settling in', { ...one, settled_at: iso(weekday('17:30')) }, weekday('18:00'), 'settling in after arriving home'],
    ['checked in recently', { ...one, last_vote_at: iso(weekday('17:45')) }, weekday('18:00'), 'checked in recently'],
    ['reminded recently', { ...one, last_prompt_at: iso(weekday('17:45')) }, weekday('18:00'), 'reminded recently'],
    ['reminded 30 minutes ago', { ...one, last_prompt_at: iso(weekday('17:30')) }, weekday('18:00'), 'send'],
    ['forced test participant, every rule ignored', { ...one, enabled: false }, weekday('03:00'), 'send', { force: 'P01' }],
    ['forced, another participant', one, weekday('18:00'), 'not the test participant', { force: 'P02' }]
  ];
  let bad = 0;
  for (const [name, sub, now, want, extra] of cases) {
    const got = decide(sub, now, { interval: 60, ...(extra || {}) });
    if (got !== want) bad++;
    console.log(`${got === want ? 'ok  ' : 'FAIL'} ${name}: ${got}${got === want ? '' : ` (expected: ${want})`}`);
  }
  console.log(bad ? `${bad} of ${cases.length} checks failed` : `all ${cases.length} checks passed`);
  process.exit(bad ? 1 : 0);
}
if (process.env.SELFTEST) selfTest();

/* ---- the real run: configuration, secrets, and the phones in the database ---- */
const webpush = require('web-push');   // after the self-test, which needs neither the package nor any secret

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
    const verdict = decide(sub, now, { force: FORCE, interval: INTERVAL });
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
