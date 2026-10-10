/* Home Comfort NY (SUNY ESF) - reminder sender.
 * Runs every hour from the GitHub Actions workflow in .github/workflows/homecomfort-ny-reminders.yml, which the
 * Supabase clock (homecomfort-ny/supabase-reminder-clock.sql) starts at the top of the hour; GitHub's own
 * schedule starts it too, as a backup. For every registered phone it decides whether a check-in
 * reminder is due right now, and sends a web push if so. All the "smart" rules live in decide() below.
 * A phone is sent to when:
 *   - reminders are on and not paused (the participant has not said they are out),
 *   - at least an hour has passed since they said they had just got in (settled_at),
 *   - at least 30 minutes have passed since their last check-in (last_vote_at),
 *   - it has not had a reminder yet in this clock hour, nor in the last 45 minutes (last_prompt_at), so
 *     the clock and the backup runs at :07 and :37 never double up, and a late run followed by an early
 *     one does not send two in a row,
 *   - the phone's local time is inside the participant's home hours: the weekday or weekend window
 *     (weekday_start/end, weekend_start/end, the app's defaults when a bound is missing), or the
 *     optional second window for that kind of day (weekday2_start/end, weekend2_start/end), which only
 *     counts when both of its bounds are set. An end at or before the start (an older copy of the app
 *     let people save "until 00:00") means until 23:59, as the app reads it; a second window that still
 *     does not end after it starts is ignored. A run in the first few minutes of the hour is judged at
 *     the top of the hour, so a window ending at 09:00 still gets its 09:00 reminder when the run starts late.
 * Local time is read in the phone's own time zone (tz, e.g. America/New_York), so summer and winter time
 * take care of themselves; a phone that has not reported one is read in timeZone from config.js.
 * Phones whose endpoint is not at a browser push service are skipped (the database refuses new ones).
 *
 * Secrets (GitHub repository secrets, see homecomfort-ny/README.md):
 *   SUPABASE_SERVICE_ROLE_KEY  a Supabase secret key (sb_secret_...)
 *   VAPID_PRIVATE_KEY          the 43-character private key that pairs with vapidPublicKey in config.js
 * The project URL, the VAPID public key, the reminder interval (reminderIntervalMin) and the study's
 * time zone (timeZone) are public and are read from ../config.js.
 * Optional:
 *   FORCE_PARTICIPANT  send to this code right now, ignoring every rule (manual test run). A forced
 *                      reminder is not recorded, so it never holds back a scheduled one.
 *   DRY_RUN=1          decide and log, but send nothing
 *   SELFTEST=1         check the rules in decide() against known cases and exit. Needs no secrets,
 *                      reads and sends nothing:  SELFTEST=1 node send.js
 */
const fs = require('fs');
const path = require('path');

/* ---- the rules. Kept free of secrets and network so the self-test below can run them anywhere ---- */
const MIN = 60000;
const STUDY_ZONE = 'America/New_York';                 // when config.js has no timeZone
// The app's defaults (DEFAULT_HOURS in checkin/app.js), used for a main-window bound that is missing.
const DEFAULT_HOURS = { weekday_start: '17:00', weekday_end: '22:30', weekend_start: '09:00', weekend_end: '22:30' };
const toMin = hhmm => { const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(hhmm || '').trim()); return m ? (+m[1]) * 60 + (+m[2]) : null; };
const LATE_START_MIN = 5;                            // grace for a run that starts late; below the :07 backup run
// The browser push services (the same list as push_endpoint_ok() in supabase-setup.sql).
const PUSH_SERVICE = /^https:\/\/(fcm\.googleapis\.com|android\.googleapis\.com|web\.push\.apple\.com|[a-z0-9-]+(\.[a-z0-9-]+)*\.push\.services\.mozilla\.com|[a-z0-9-]+(\.[a-z0-9-]+)*\.notify\.windows\.com)\//;

/* The phone's wall clock at `now` in time zone `zone`: { day: 0 (Sunday) to 6, hm: minutes after midnight, text }. */
const clocks = new Map();                            // a Map: a zone named "constructor" must not find Object's own keys
function clockFor(zone) {
  if (typeof zone !== 'string' || !zone) return null;
  if (!clocks.has(zone)) {
    try { clocks.set(zone, new Intl.DateTimeFormat('en-GB', { timeZone: zone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })); }
    catch (e) { clocks.set(zone, null); }            // not a time zone this Node knows
  }
  return clocks.get(zone);
}
const DAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
function localClock(now, tz, fallbackZone) {
  const zone = (tz && clockFor(tz)) ? tz : (fallbackZone && clockFor(fallbackZone)) ? fallbackZone : STUDY_ZONE;
  const p = {}; for (const x of clockFor(zone).formatToParts(now)) p[x.type] = x.value;
  const h = (+p.hour) % 24, m = +p.minute;
  return { day: DAY[p.weekday], hm: h * 60 + m, text: `${zone} ${p.weekday} ${String(h).padStart(2, '0')}:${p.minute}` };
}

/* True when the phone's local time is inside the participant's home hours for that kind of day: the
 * main window (a bound that is missing or does not parse takes the app's default, as the app does; an
 * end at or before the start means until 23:59), or the optional second window, which only counts when
 * both of its bounds are present (an end of 00:00 means 23:59) and it then ends after it starts. The
 * same reading as hours() in checkin/app.js. */
const LAST_MINUTE = 23 * 60 + 59;
function insideHomeHours(sub, clock) {
  const k = clock.day === 0 || clock.day === 6 ? 'weekend' : 'weekday';
  let start = toMin(sub[k + '_start']) ?? toMin(DEFAULT_HOURS[k + '_start']);
  let end = toMin(sub[k + '_end']) ?? toMin(DEFAULT_HOURS[k + '_end']);
  if (end <= start) end = LAST_MINUTE;
  if (end <= start) { start = toMin(DEFAULT_HOURS[k + '_start']); end = toMin(DEFAULT_HOURS[k + '_end']); }   // started at 23:59
  if (clock.hm >= start && clock.hm <= end) return true;
  const start2 = toMin(sub[k + '2_start']);
  let end2 = toMin(sub[k + '2_end']);
  if (end2 === 0) end2 = LAST_MINUTE;
  return start2 !== null && end2 !== null && start2 < end2 && clock.hm >= start2 && clock.hm <= end2;
}

/* Returns 'send' or the reason for skipping. opts.force is FORCE_PARTICIPANT (a code, or empty),
 * opts.interval the reminder interval in minutes from config.js (null: the phone's own interval_min)
 * and opts.zone the time zone for phones that have not reported theirs (timeZone in config.js). */
function decide(sub, now, opts) {
  const force = (opts && opts.force) || '';
  if (force) return sub.participant === force ? 'send' : 'not the test participant';
  if (!sub.enabled) return 'reminders off';
  if (sub.paused_until && new Date(sub.paused_until) > now) return 'paused (away)';
  if (sub.settled_at && now - new Date(sub.settled_at) < 60 * MIN) return 'settling in after arriving home';
  if (sub.last_vote_at && now - new Date(sub.last_vote_at) < 30 * MIN) return 'checked in recently';
  const interval = (opts && opts.interval) || sub.interval_min || 60;
  if (sub.last_prompt_at) {
    const last = new Date(sub.last_prompt_at);
    // Never two within three quarters of an interval (45 minutes), and at most one per interval-long slot
    // of the clock (one per hour). The 45 minutes still leave room for a clock run up to 15 minutes late.
    if (now - last < Math.round(interval * 3 / 4) * MIN) return 'reminded recently';
    if (Math.floor(last / (interval * MIN)) === Math.floor(now / (interval * MIN))) return 'already reminded this hour';
  }
  // The clock starts a run at the top of the hour, and a runner can take a minute or more to get here.
  const at = now % (60 * MIN) < LATE_START_MIN * MIN ? new Date(now - now % (60 * MIN)) : now;
  if (!insideHomeHours(sub, localClock(at, sub.tz, opts && opts.zone))) return 'outside home hours';
  return 'send';
}

/* ---- self-check of the rules:  SELFTEST=1 node send.js  ---- */
function selfTest() {
  // Wednesday 9 and Saturday 12 September 2026. The phone is on UTC unless a case says otherwise, so
  // its local clock reads the same as the time written in the case.
  const weekday = hhmm => new Date(`2026-09-09T${hhmm}:00Z`);
  const weekend = hhmm => new Date(`2026-09-12T${hhmm}:00Z`);
  // Wednesday 28 October 2026: UK clocks went back on Sunday 25 October, so London is on UTC again.
  const winter = hhmm => new Date(`2026-10-28T${hhmm}:00Z`);
  if (weekday('12:00').getUTCDay() !== 3 || weekend('12:00').getUTCDay() !== 6 || winter('12:00').getUTCDay() !== 3) { console.error('FAIL: the test dates are not a Wednesday and a Saturday'); process.exit(1); }
  const one = { participant: 'P01', enabled: true, tz: 'UTC', tz_offset_min: 0, weekday_start: '17:00', weekday_end: '22:30', weekend_start: '09:00', weekend_end: '22:30' };
  const two = { ...one, weekday_start: '06:00', weekday_end: '09:00', weekday2_start: '17:00', weekday2_end: '23:00', weekend2_start: '06:00', weekend2_end: '08:30' };
  const london = { ...one, tz: 'Europe/London' };
  const iso = d => d.toISOString();
  const cases = [
    // one window only: unchanged
    ['one window, weekday 16:59', one, weekday('16:59'), 'outside home hours'],
    ['one window, weekday 17:00', one, weekday('17:00'), 'send'],
    ['one window, weekday 22:30', one, weekday('22:30'), 'send'],
    ['one window, weekday 22:31', one, weekday('22:31'), 'outside home hours'],
    ['one window, weekend 08:59', one, weekend('08:59'), 'outside home hours'],
    ['one window, weekend 09:00', one, weekend('09:00'), 'send'],
    ['one window, empty second-window columns', { ...one, weekday2_start: null, weekday2_end: null }, weekday('18:00'), 'send'],
    // the phone's own time zone, through the change back from summer time on 25 October 2026
    ['London in September (UTC+1), 16:30Z is 17:30 local', london, weekday('16:30'), 'send'],
    ['London in September (UTC+1), 21:45Z is 22:45 local', london, weekday('21:45'), 'outside home hours'],
    ['London in late October (UTC+0), 16:30Z is 16:30 local', london, winter('16:30'), 'outside home hours'],
    ['London in late October (UTC+0), 17:00Z is 17:00 local', london, winter('17:00'), 'send'],
    ['London in late October (UTC+0), 22:45Z is 22:45 local', london, winter('22:45'), 'outside home hours'],
    ['no time zone stored, stale summer offset ignored: read in New York', { ...one, tz: null, tz_offset_min: 60 }, winter('16:30'), 'outside home hours'],
    ['no time zone stored, September: read in New York (UTC-4)', { ...one, tz: null, tz_offset_min: 0 }, weekday('21:30'), 'send'],
    ['no time zone stored, 16:30Z is 12:30 in New York', { ...one, tz: null }, weekday('16:30'), 'outside home hours'],
    ['unknown time zone: read in New York', { ...one, tz: 'Mars/Olympus_Mons' }, weekday('21:30'), 'send'],
    ['config time zone used when the phone has none', { ...one, tz: null }, weekday('12:30'), 'send', { zone: 'Asia/Tokyo' }],
    ['London Friday 23:30Z is Saturday 00:30: weekend rules', { ...london, weekend2_start: '00:00', weekend2_end: '01:00' }, new Date('2026-09-11T23:30:00Z'), 'send'],
    ['New York phone, 21:30Z is 17:30 local', { ...one, tz: 'America/New_York' }, weekday('21:30'), 'send'],
    ['New York after 1 November (UTC-5), 21:30Z is 16:30 local', { ...one, tz: 'America/New_York' }, new Date('2026-11-04T21:30:00Z'), 'outside home hours'],
    ['New York after 1 November (UTC-5), 22:30Z is 17:30 local', { ...one, tz: 'America/New_York' }, new Date('2026-11-04T22:30:00Z'), 'send'],
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
    // main-window bounds: seconds are fine, a missing or broken bound takes the app's default, never "any time"
    ['main window stored as HH:MM:SS', { ...one, weekday_start: '17:00:00', weekday_end: '22:30:00' }, weekday('03:00'), 'outside home hours'],
    ['main window stored as HH:MM:SS, inside', { ...one, weekday_start: '17:00:00', weekday_end: '22:30:00' }, weekday('18:00'), 'send'],
    ['main window bounds missing: default 17:00-22:30', { ...one, weekday_start: null, weekday_end: '' }, weekday('03:00'), 'outside home hours'],
    ['main window bounds broken: default 17:00-22:30', { ...one, weekday_start: 'teatime', weekday_end: 'late' }, weekday('18:00'), 'send'],
    // "until midnight" saved by an older app as 00:00, or a window past midnight: until 23:59, as the app reads it
    ['main window 18:00-00:00 (older app): 23:30 is inside', { ...one, weekday_start: '18:00', weekday_end: '00:00' }, weekday('23:30'), 'send'],
    ['main window 18:00-00:00 (older app): 17:30 is outside', { ...one, weekday_start: '18:00', weekday_end: '00:00' }, weekday('17:30'), 'outside home hours'],
    ['main window 22:00-06:00: until 23:59, so 23:00 is inside', { ...one, weekday_start: '22:00', weekday_end: '06:00' }, weekday('23:00'), 'send'],
    ['main window 22:00-06:00: 03:00 is outside', { ...one, weekday_start: '22:00', weekday_end: '06:00' }, weekday('03:00'), 'outside home hours'],
    ['second window 21:00-00:00: until 23:59', { ...one, weekday2_start: '21:00', weekday2_end: '00:00', weekday_end: '20:00' }, weekday('23:30'), 'send'],
    // a run that reaches the sender a little after the top of the hour is judged at the top of the hour
    ['window ends 09:00, clock run reaches the sender at 09:01:30', two, new Date('2026-09-09T09:01:30Z'), 'send'],
    ['window ends 09:00, run at 09:04:59', two, new Date('2026-09-09T09:04:59Z'), 'send'],
    ['window ends 09:00, run at 09:05', two, new Date('2026-09-09T09:05:00Z'), 'outside home hours'],
    ['window ends 09:00, backup run at 09:07', two, new Date('2026-09-09T09:07:00Z'), 'outside home hours'],
    ['window starts 17:00, run at 16:59:30 is still outside', one, new Date('2026-09-09T16:59:30Z'), 'outside home hours'],
    // a time zone named after one of Object's own keys must not break anything
    ['tz "constructor": read in New York', { ...one, tz: 'constructor' }, weekday('21:30'), 'send'],
    ['tz "__proto__": read in New York', { ...one, tz: '__proto__' }, weekday('21:30'), 'send'],
    ['tz not a string: read in New York', { ...one, tz: 42 }, weekday('21:30'), 'send'],
    // the other rules
    ['reminders off', { ...one, enabled: false }, weekday('18:00'), 'reminders off'],
    ['paused', { ...one, paused_until: iso(weekday('20:00')) }, weekday('18:00'), 'paused (away)'],
    ['pause over', { ...one, paused_until: iso(weekday('17:59')) }, weekday('18:00'), 'send'],
    ['settling in', { ...one, settled_at: iso(weekday('17:30')) }, weekday('18:00'), 'settling in after arriving home'],
    ['checked in recently', { ...one, last_vote_at: iso(weekday('17:45')) }, weekday('18:00'), 'checked in recently'],
    ['reminded recently', { ...one, last_prompt_at: iso(weekday('17:45')) }, weekday('18:00'), 'reminded recently'],
    ['reminded 30 minutes ago, in the previous hour', { ...one, last_prompt_at: iso(weekday('17:30')) }, weekday('18:00'), 'reminded recently'],
    ['reminded at 17:01, backup run at 17:37', { ...one, last_prompt_at: iso(weekday('17:01')) }, weekday('17:37'), 'reminded recently'],
    ['reminded at 17:01 (very late clock run), backup run at 17:59', { ...one, last_prompt_at: iso(weekday('17:01')), weekday_end: '23:59' }, weekday('17:59'), 'already reminded this hour'],
    ['reminded at 17:01, clock run at 18:00', { ...one, last_prompt_at: iso(weekday('17:01')) }, weekday('18:00'), 'send'],
    ['clock run at 17:14 (late), next one at 18:00', { ...one, last_prompt_at: iso(weekday('17:14')) }, weekday('18:00'), 'send'],
    ['clock missed 17:00, backup reminded at 17:07, clock run at 18:00', { ...one, last_prompt_at: iso(weekday('17:07')) }, weekday('18:00'), 'send'],
    ['backup run reminded at 17:37, clock run at 18:00', { ...one, last_prompt_at: iso(weekday('17:37')) }, weekday('18:00'), 'reminded recently'],
    ['backup run reminded at 17:37, backup run at 18:07 (30 min)', { ...one, last_prompt_at: iso(weekday('17:37')) }, weekday('18:07'), 'reminded recently'],
    ['backup run reminded at 17:37, backup run at 18:37', { ...one, last_prompt_at: iso(weekday('17:37')) }, weekday('18:37'), 'send'],
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
const ZONE = cfgVal('timeZone') || STUDY_ZONE;     // home hours of phones that have not reported a time zone
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
const SUBJECT = 'mailto:info@mehraban.uk';   // contact the push services may use (placeholder: the study's contact address)

function fail(msg) { console.error('ERROR: ' + msg); process.exit(1); }
const mask = s => s ? s.slice(0, 12) + '...(' + s.length + ' chars)' : '(empty)';
console.log(`Supabase URL: ${URL_ || '(empty)'}`);
console.log(`Secret key:   ${mask(KEY)}`);
console.log(`VAPID key:    ${PRIV ? PRIV.length + ' chars' : '(empty)'}${DRY ? ' (dry run)' : ''}`);
console.log(`Interval:     ${INTERVAL ? INTERVAL + ' min (config.js)' : 'not in config.js, using each phone\'s interval_min'}`);
console.log(`Time zone:    ${ZONE}${clockFor(ZONE) ? '' : ' (unknown, using ' + STUDY_ZONE + ')'} for phones that have not reported one`);
if (!URL_) fail('supabaseUrl is empty in homecomfort-ny/config.js');
if (!looksLikeProject(URL_)) fail(`supabaseUrl in homecomfort-ny/config.js does not look like a project URL: "${URL_}"`);
if (!KEY) fail('SUPABASE_SERVICE_ROLE_KEY secret is empty. Create a secret key under Settings > API Keys > Secret keys');
if (KEY.startsWith('sb_publishable_')) fail('SUPABASE_SERVICE_ROLE_KEY contains the publishable key. It needs a secret key (sb_secret_...) from Settings > API Keys > Secret keys');
if (!PUB) fail('vapidPublicKey is empty in homecomfort-ny/config.js');
if (!PRIV && !DRY) fail('VAPID_PRIVATE_KEY secret is empty. Paste the whole content of homecomfort-ny-vapid-private-key.txt');
if (!DRY && !/^[A-Za-z0-9_-]{43}$/.test(PRIV)) fail(`VAPID_PRIVATE_KEY should be the 43-character key from homecomfort-ny-vapid-private-key.txt (got ${PRIV.length} characters). Open the file, select all, copy, and paste it as the secret`);
if (!DRY) {
  // Derive the public key from the private one and compare, so a mismatched pair fails here, not at the push service.
  try {
    const ecdh = require('crypto').createECDH('prime256v1');
    ecdh.setPrivateKey(Buffer.from(PRIV, 'base64url'));
    const derived = ecdh.getPublicKey().toString('base64url');
    if (derived !== PUB) fail('VAPID_PRIVATE_KEY does not match vapidPublicKey in homecomfort-ny/config.js. Paste the current content of homecomfort-ny-vapid-private-key.txt into the secret');
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
  // Page by page: Supabase returns at most "max rows" (1000 by default) per request, and a short read must
  // never leave the participants at the end of the list without reminders.
  const subs = [];
  for (let from = 0; ;) {
    const r = await fetch(rest(`?select=*&order=participant,endpoint&limit=1000&offset=${from}`), { headers });
    if (r.status === 401 || r.status === 403) fail(`Supabase refused the secret key (${r.status}). Check the SUPABASE_SERVICE_ROLE_KEY secret: ${await r.text()}`);
    if (r.status === 404) fail(`table ${TABLE} was not found. Run supabase-setup.sql again in the SQL editor: ${await r.text()}`);
    if (!r.ok) fail(`could not read subscriptions (${r.status}): ${await r.text()}`);
    const page = await r.json();
    if (!page.length) break;
    subs.push(...page);
    from += page.length;
  }
  const summary = {};
  let sent = 0, removed = 0;
  for (const sub of subs) {
    let verdict;
    if (!PUSH_SERVICE.test(sub.endpoint || '')) verdict = 'not a push service endpoint';
    else try { verdict = decide(sub, now, { force: FORCE, interval: INTERVAL, zone: ZONE }); }
    catch (e) { verdict = 'could not decide'; console.error(`could not decide for ${sub.participant}: ${e.message}`); }   // one odd row never stops the rest
    summary[verdict] = (summary[verdict] || 0) + 1;
    if (verdict !== 'send') continue;
    const payload = JSON.stringify({
      title: 'How do you feel at home?',
      body: 'A quick comfort check-in, under twenty seconds.',
      url: './?from=push',
      participant: sub.participant,
      tag: 'switch-checkin',
      sentAt: now.toISOString()
    });
    const at = rest(`?endpoint=eq.${encodeURIComponent(sub.endpoint)}`);
    if (DRY) { console.log(`[dry run] would send to ${sub.participant} (${localClock(now, sub.tz, ZONE).text})`); continue; }
    try {
      // timeout: a push service that never answers must not hold up everyone after this phone
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 25 * 60, urgency: 'high', timeout: 15000 });
      sent++;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        const del = await fetch(at, { method: 'DELETE', headers }).catch(e => ({ ok: false, status: e.message, text: async () => '' }));
        if (del.ok) { removed++; console.log(`removed a phone for ${sub.participant} that no longer accepts reminders (the app registers it again when next opened)`); }
        else console.error(`a phone for ${sub.participant} no longer accepts reminders, but removing it failed (${del.status}): ${await del.text()}`);
      } else if (err.statusCode === 401 || err.statusCode === 403) {
        console.error(`send failed for ${sub.participant}: the push service rejected the signature (${err.statusCode}). This phone registered with a different public key; ask them to turn reminders off and on again in the app`);
      } else {
        console.error(`send failed for ${sub.participant}: ${err.statusCode || ''} ${err.body || err.message}`);
      }
      continue;
    }
    // Record the reminder (the "one per hour" rule reads it). A forced test reminder is not recorded.
    if (FORCE) continue;
    const st = await fetch(at, { method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify({ last_prompt_at: now.toISOString() }) })
      .catch(e => ({ ok: false, status: e.message, text: async () => '' }));
    if (!st.ok) console.error(`sent to ${sub.participant}, but could not record it (${st.status}), so the next run may remind again: ${await st.text()}`);
  }
  console.log(`${now.toISOString()} - ${subs.length} registered phone(s), sent ${sent}, removed ${removed}`);
  for (const [k, v] of Object.entries(summary)) console.log(`  ${v} x ${k}`);
}
main().catch(err => fail(err.message));
