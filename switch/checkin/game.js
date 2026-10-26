/* HomePulse game layer: points, badges and the Bay Race (window.GAME). Self-contained: it reads SWITCH_CONFIG at
 * call time, returns HTML strings, and emits only these data-act values for app.js to handle:
 *   race-period (data-v="week|last_week|month"), race-how, tab (data-to="race|today|history|settings"), badges.
 * Points follow EXACTLY the rules the database uses (supabase-setup.sql, spec section 5); change both together:
 *   - rows with a ts more than 5 min in the future are ignored (they count once that time has come);
 *   - a check-in that the database has (it carries created_at, when the database received it) counts only if it
 *     arrived on time: created_at - 48 h <= ts <= created_at + 5 min (a back-dated or forward-dated row stays a
 *     check-in of its day, and still starts the gap for the next one, but scores nothing). A row made here and
 *     not synced yet has no created_at and skips this rule;
 *   - a check-in counts if it is >= checkinGapMin after the previous check-in (any row, counted or not, by ts)
 *     and is among the first dailyCap such check-ins of its UK day (Europe/London, whatever the phone's zone);
 *   - points.checkin per counted check-in; points.goalDay for every UK day with >= dailyGoal counted;
 *     points.fullWeek for every Monday-Sunday week whose 7 days are all goal days, booked on its Sunday.
 * Everything is wrapped in one function so nothing leaks into the shared global scope of the classic scripts. */
(function(root){
'use strict';
const LONDON = 'Europe/London', MIN = 60000, DAYMS = 864e5, FUTURE_MIN = 5;
const num = (v, d) => (typeof v === 'number' && isFinite(v)) ? v : d;
function rules(){
  const c = root.SWITCH_CONFIG || {}, p = c.points || {};
  return { checkin: num(p.checkin, 10), goalDay: num(p.goalDay, 20), fullWeek: num(p.fullWeek, 50),
    dailyCap: num(p.dailyCap, 15), gapMin: num(c.checkinGapMin, 45), goal: num(c.dailyGoal, 4) };
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* The words, in the app's language (i18n.js: I18N, loaded before this file); English as written here without it.
 * tr('English with {name}', { name }) and trn(n, 'one form', 'other form') as in app.js; Welsh plurals and mutations
 * live in i18n.js. */
const I = () => root.I18N || null;
const fill = (s, v) => v ? String(s).replace(/\{(\w+)\}/g, (m, k) => k in v ? String(v[k]) : m) : String(s);
const tr = (s, v) => I() ? I().t(s, v) : fill(String(s).replace(/^seg:/, '').replace(/:vowel$/, ''), v);   // markers: see i18n.js
const trn = (n, one, other, v) => I() ? I().tn(n, one, other, v) : fill(n === 1 ? one : other, Object.assign({ n: nf(n) }, v || {}));
const ord = n => I() ? I().ordinal(n) : (t => n + ((t >= 11 && t <= 13) ? 'th' : ({1:'st', 2:'nd', 3:'rd'}[n % 10] || 'th')))(n % 100);
const nf = n => I() ? I().numf(n) : Math.round(n || 0).toLocaleString('en-GB');
/* the runner's name as shown: the English alias of the database, or its Welsh in the Welsh app (portraits stay keyed by
 * the English alias) */
const aliasName = a => I() && I().alias ? I().alias(a) : String(a || '');
/* Counted phrases: one literal per form (the Welsh forms are in i18n.js). */
const nPoints = n => trn(n, '{n} point', '{n} points');
const nRunners = n => trn(n, '{n} runner', '{n} runners');
const nCheckins = n => trn(n, '{n} check-in', '{n} check-ins');
const nGoalDays = n => trn(n, '{n} goal day', '{n} goal days');
const pointWord = n => trn(n, 'point', 'points');
const toMs = t => t == null ? Date.now() : t instanceof Date ? t.getTime() : typeof t === 'string' ? Date.parse(t) : +t;
const reduced = () => { try{ return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); }catch(e){ return false; } };

/* ---------- UK calendar ---------- */
/* Day numbers (days since 1970-01-01) do the calendar arithmetic, so no step depends on the phone's zone. */
let FMT = null; const UKC = new Map();               // per-minute cache: the clocks only change on the hour
function uk(ms){
  const k = Math.floor(ms / MIN), hit = UKC.get(k); if(hit) return hit;
  if(UKC.size > 50000) UKC.clear();
  FMT = FMT || new Intl.DateTimeFormat('en-GB', {timeZone:LONDON, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23'});
  const o = {};
  for(const p of FMT.formatToParts(new Date(ms))) o[p.type] = p.value;
  const y = +o.year, mo = +o.month, d = +o.day;
  const r = { dn: Math.round(Date.UTC(y, mo - 1, d) / DAYMS), h: (+o.hour) % 24, m: +o.minute, y, mo, d };
  UKC.set(k, r); return r;
}
const dnKey = dn => new Date(dn * DAYMS).toISOString().slice(0, 10);
const keyDn = k => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(k || '')); return m ? Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAYMS) : null; };
const dow = dn => ((dn + 3) % 7 + 7) % 7;          // 0 = Monday ... 6 = Sunday (day 0 was a Thursday)
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const monthName = (i, short) => I() ? I().monthName(i, short) : (short ? MONTHS_SHORT : MONTHS)[i];
const dnDate = dn => new Date(dn * DAYMS);
const shortDate = dn => { const d = dnDate(dn); return `${d.getUTCDate()} ${monthName(d.getUTCMonth(), true)}`; };

/* ---------- the ledger: every rule in one place, shared by points() and badges() ---------- */
function ledger(votes, now){
  const R = rules(); now = toMs(now); if(!isFinite(now)) now = Date.now();
  const rows = [];
  (Array.isArray(votes) ? votes : []).forEach((v, i) => {
    if(!v || !v.ts) return;
    const t = Date.parse(v.ts);
    if(!isFinite(t) || t > now + FUTURE_MIN * MIN) return;
    const ca = v.created_at ? Date.parse(v.created_at) : NaN;
    rows.push({ v, t, id: String(v.client_id ?? v.id ?? ('#' + i)), onTime: !isFinite(ca) || (t >= ca - 48 * 60 * MIN && t <= ca + 5 * MIN) });
  });
  rows.sort((a, b) => a.t - b.t || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const days = new Map();                            // dn -> {dn, n counted, all rows, goalRow}
  let prev = null;
  for(const r of rows){
    r.u = uk(r.t);
    let d = days.get(r.u.dn);
    if(!d){ d = { dn:r.u.dn, n:0, all:0, goalRow:null }; days.set(r.u.dn, d); }
    d.all++;
    r.counted = false; r.bonus = 0;
    if((prev === null || r.t - prev >= R.gapMin * MIN) && r.onTime && d.n < R.dailyCap){
      d.n++; r.counted = true;
      if(d.n === R.goal){ d.goalRow = r; r.bonus += R.goalDay; }
    }
    prev = r.t;                                      // the gap runs from the previous row, counted or not
  }
  const isGoal = dn => { const d = days.get(dn); return !!d && d.n >= R.goal; };
  const fullSundays = new Set();                     // Sunday day numbers of full weeks
  days.forEach(d => {
    if(dow(d.dn) !== 6 || !isGoal(d.dn)) return;
    for(let k = 1; k < 7; k++) if(!isGoal(d.dn - k)) return;
    fullSundays.add(d.dn); d.goalRow.bonus += R.fullWeek; d.goalRow.week = true;
  });
  const dayPts = d => R.checkin * d.n + (d.n >= R.goal ? R.goalDay : 0) + (fullSundays.has(d.dn) ? R.fullWeek : 0);
  const sum = (a, b) => { let s = 0; days.forEach(d => { if(d.dn >= a && d.dn <= b) s += dayPts(d); }); return s; };
  return { R, now, rows, days, isGoal, fullSundays, dayPts, sum, today: uk(now) };
}

function points(votes, now){
  const L = ledger(votes, now), R = L.R, td = L.today.dn;
  const ws = td - dow(td);
  const m0 = Math.round(Date.UTC(L.today.y, L.today.mo - 1, 1) / DAYMS), m1 = Math.round(Date.UTC(L.today.y, L.today.mo, 0) / DAYMS);
  const goalDays = new Set(), perVote = new Map();
  let counted = 0, all = 0;
  L.days.forEach(d => { if(d.n >= R.goal) goalDays.add(dnKey(d.dn)); counted += d.n; all += L.dayPts(d); });
  L.rows.forEach(r => perVote.set(r.id, { counted:r.counted, pts: r.counted ? R.checkin + r.bonus : 0, bonus:r.bonus, day:dnKey(r.u.dn) }));
  // streak: goal days in a row up to today; today still counts as "not yet broken" until it ends
  const end = L.isGoal(td) ? td : td - 1; let streak = 0;
  while(L.isGoal(end - streak)) streak++;
  let best = 0, run = 0, last = null;
  [...L.days.keys()].sort((a, b) => a - b).forEach(dn => { if(!L.isGoal(dn)) return; run = (last !== null && dn === last + 1) ? run + 1 : 1; last = dn; if(run > best) best = run; });
  let weekGoalDays = 0;
  for(let k = 0; k < 7; k++) if(L.isGoal(ws + k)) weekGoalDays++;
  const t = L.days.get(td);
  return {
    all_time: all, week: L.sum(ws, ws + 6), last_week: L.sum(ws - 7, ws - 1), month: L.sum(m0, m1), today: t ? L.dayPts(t) : 0,
    streak, best, goalDays, perVote,
    counted, checkins: L.rows.length,
    todayCount: t ? t.n : 0, todayAll: t ? t.all : 0, weekGoalDays,
    fullWeeks: new Set([...L.fullSundays].map(dnKey)),
    day: dnKey(td), weekFrom: dnKey(ws), weekTo: dnKey(ws + 6), rules: R
  };
}

/* ---------- badges ----------
 * 36 badges in nine groups, all worked out here from the participant's own check-ins (every device), never from what
 * they answered: only that a question was answered (the outside wall), never where it was answered from. Days and
 * times are UK time, as for the points. The first ten ids are the original badges, so earned badges carry over.
 * count/need: the countable badges, with their progress ("37 of 50 check-ins"); tier: bronze, silver or gold rim. */
const BADGE_GROUPS = [
  { id:'start',     name:'Getting started' },
  { id:'checkins',  name:'Check-ins' },
  { id:'good',      name:'Good days' },
  { id:'streaks',   name:'Streaks' },
  { id:'weeks',     name:'Full weeks' },
  { id:'times',     name:'Times of day' },
  { id:'reminders', name:'Reminders' },
  { id:'part',      name:'Taking part' },
  { id:'season',    name:'Season' }
];
const BADGE_META = [
  { id:'croeso',   group:'start' },
  { id:'goal',     group:'start' },
  { id:'week',     group:'start',     count:'fullWeeks', need:1 },
  { id:'c10',      group:'checkins',  count:'checkins',  need:10,  tier:'bronze' },
  { id:'c25',      group:'checkins',  count:'checkins',  need:25,  tier:'bronze' },
  { id:'fifty',    group:'checkins',  count:'checkins',  need:50,  tier:'silver' },
  { id:'c75',      group:'checkins',  count:'checkins',  need:75,  tier:'silver' },
  { id:'hundred',  group:'checkins',  count:'checkins',  need:100, tier:'gold' },
  { id:'c150',     group:'checkins',  count:'checkins',  need:150, tier:'gold' },
  { id:'c200',     group:'checkins',  count:'checkins',  need:200, tier:'gold' },
  { id:'g5',       group:'good',      count:'goodDays',  need:5,   tier:'bronze' },
  { id:'g10',      group:'good',      count:'goodDays',  need:10,  tier:'silver' },
  { id:'g20',      group:'good',      count:'goodDays',  need:20,  tier:'gold' },
  { id:'g31',      group:'good',      count:'goodDays',  need:31,  tier:'gold' },
  { id:'streak3',  group:'streaks',   count:'streak',    need:3,   tier:'bronze' },
  { id:'s7',       group:'streaks',   count:'streak',    need:7,   tier:'silver' },
  { id:'s14',      group:'streaks',   count:'streak',    need:14,  tier:'silver' },
  { id:'s21',      group:'streaks',   count:'streak',    need:21,  tier:'gold' },
  { id:'s31',      group:'streaks',   count:'streak',    need:31,  tier:'gold' },
  { id:'w2',       group:'weeks',     count:'fullWeeks', need:2,   tier:'bronze' },
  { id:'w3',       group:'weeks',     count:'fullWeeks', need:3,   tier:'silver' },
  { id:'w4',       group:'weeks',     count:'fullWeeks', need:4,   tier:'gold' },
  { id:'early',    group:'times' },
  { id:'owl',      group:'times' },
  { id:'mnn',      group:'times' },
  { id:'clock',    group:'times',     count:'hours',     need:12 },
  { id:'weekend',  group:'times' },
  { id:'quick10',  group:'reminders', count:'reminders', need:10,  tier:'bronze' },
  { id:'quick50',  group:'reminders', count:'reminders', need:50,  tier:'gold' },
  { id:'days10',   group:'part',      count:'days',      need:10 },
  { id:'fortnight', group:'part',     count:'days',      need:14 },
  { id:'wall10',   group:'part',      count:'walls',     need:10 },
  { id:'solstice', group:'season' },
  { id:'xmas',     group:'season' },
  { id:'newyear',  group:'season' },
  { id:'diolch',   group:'season' }
];
const BADGE_TIER = Object.fromEntries(BADGE_META.map(b => [b.id, b.tier || '']));
/* "15 January" from a UK date key (2027-01-15) */
const longDate = k => { const dn = keyDn(k); if(dn === null) return ''; const d = dnDate(dn); return `${d.getUTCDate()} ${monthName(d.getUTCMonth())}`; };
/* The words for each badge: name, what it was for (desc) and how to earn it (how), one sentence each. */
function badgeWords(R, end){
  return {
    croeso:   { name:tr('Croeso!'), desc:tr('Your first check-in, welcome to the study.'), how:tr('Do your first check-in.') },
    goal:     { name:tr('Da iawn!'), desc:tr('Your first day with {g} check-ins.', { g: R.goal }), how:tr('Check in {g} times in one day.', { g: R.goal }) },
    week:     { name:tr('Full week'), desc:tr('Your daily goal every day from Monday to Sunday.'), how:tr('Reach your daily goal every day from Monday to Sunday.') },
    c10:      { name:tr('Ten up'), desc:tr('10 check-ins.'), how:tr('Reach 10 check-ins.') },
    c25:      { name:tr('Twenty-five'), desc:tr('25 check-ins.'), how:tr('Reach 25 check-ins.') },
    fifty:    { name:tr('Half century'), desc:tr('50 check-ins.'), how:tr('Reach 50 check-ins.') },
    c75:      { name:tr('Seventy-five'), desc:tr('75 check-ins.'), how:tr('Reach 75 check-ins.') },
    hundred:  { name:tr('Centurion'), desc:tr('100 check-ins.'), how:tr('Reach 100 check-ins.') },
    c150:     { name:tr('Hundred and fifty'), desc:tr('150 check-ins.'), how:tr('Reach 150 check-ins.') },
    c200:     { name:tr('Double century'), desc:tr('200 check-ins.'), how:tr('Reach 200 check-ins.') },
    g5:       { name:tr('Five good days'), desc:tr('Your daily goal on 5 days.'), how:tr('Reach your daily goal on 5 different days.') },
    g10:      { name:tr('Ten good days'), desc:tr('Your daily goal on 10 days.'), how:tr('Reach your daily goal on 10 different days.') },
    g20:      { name:tr('Twenty good days'), desc:tr('Your daily goal on 20 days.'), how:tr('Reach your daily goal on 20 different days.') },
    g31:      { name:tr('Every single day'), desc:tr('Your daily goal on 31 days.'), how:tr('Reach your daily goal on 31 different days.') },
    streak3:  { name:tr('Three in a row'), desc:tr('Your daily goal three days running.'), how:tr('Reach your daily goal three days in a row.') },
    s7:       { name:tr('A week in a row'), desc:tr('Your daily goal seven days running.'), how:tr('Reach your daily goal seven days in a row.') },
    s14:      { name:tr('Two weeks in a row'), desc:tr('Your daily goal fourteen days running.'), how:tr('Reach your daily goal fourteen days in a row.') },
    s21:      { name:tr('Three weeks in a row'), desc:tr('Your daily goal twenty-one days running.'), how:tr('Reach your daily goal twenty-one days in a row.') },
    s31:      { name:tr('The whole month'), desc:tr('Your daily goal thirty-one days running.'), how:tr('Reach your daily goal thirty-one days in a row.') },
    w2:       { name:tr('Two full weeks'), desc:tr('Your daily goal every day of two weeks, Monday to Sunday.'), how:tr('Reach your daily goal every day of two weeks, Monday to Sunday.') },
    w3:       { name:tr('Three full weeks'), desc:tr('Your daily goal every day of three weeks, Monday to Sunday.'), how:tr('Reach your daily goal every day of three weeks, Monday to Sunday.') },
    w4:       { name:tr('Lighthouse keeper'), desc:tr('Your daily goal every day of four weeks, Monday to Sunday.'), how:tr('Reach your daily goal every day of four weeks, Monday to Sunday.') },
    early:    { name:tr('Early bird'), desc:tr('A check-in before 08:00.'), how:tr('Check in before 08:00 in the morning.') },
    owl:      { name:tr('Night owl'), desc:tr('A check-in after 22:00.'), how:tr('Check in after 22:00 at night.') },
    mnn:      { name:tr('Morning, noon and night'), desc:tr('Check-ins in the morning, the afternoon and the evening of one day.'), how:tr('On one day, check in before 12:00, between 12:00 and 17:00, and after 17:00.') },
    clock:    { name:tr('Round the clock'), desc:tr('Check-ins in 12 different hours of the day.'), how:tr('Check in during 12 different hours of the day.') },
    weekend:  { name:tr('Weekend warrior'), desc:tr('Your daily goal on both days of a weekend.'), how:tr('Reach your daily goal on a Saturday and the Sunday after it.') },
    quick10:  { name:tr('Quick reply'), desc:tr('10 check-ins started from a reminder.'), how:tr('Start 10 check-ins from a reminder.') },
    quick50:  { name:tr('On the ball'), desc:tr('50 check-ins started from a reminder.'), how:tr('Start 50 check-ins from a reminder.') },
    days10:   { name:tr('Rain or shine'), desc:tr('Check-ins on 10 different days.'), how:tr('Check in on 10 different days.') },
    fortnight:{ name:tr('Fortnight'), desc:tr('Check-ins on 14 different days.'), how:tr('Check in on 14 different days.') },
    wall10:   { name:tr('Wall watcher'), desc:tr('You answered the outside wall question 10 times.'), how:tr('Answer the outside wall question 10 times.') },
    solstice: { name:tr('Midwinter'), desc:tr('A check-in on 21 December, the shortest day.'), how:tr('Check in on 21 December.') },
    xmas:     { name:tr('Nadolig Llawen'), desc:tr('A check-in on Christmas Day.'), how:tr('Check in on 25 December.') },
    newyear:  { name:tr('Blwyddyn Newydd Dda'), desc:tr("A check-in on New Year's Day."), how:tr('Check in on 1 January.') },
    diolch:   { name:tr('Diolch!'), desc:tr('A check-in on the last day of the study.'), how: end ? tr('Check in on {date}, the last day of the study.', { date: longDate(end) }) : tr('Check in on the last day of the study.') }
  };
}
/* Progress on a countable badge, as a short label. */
const PROGRESS = {
  checkins:  (h, n) => tr('{h} of {n} check-ins', { h, n }),
  goodDays:  (h, n) => tr('{h} of {n} good days', { h, n }),
  streak:    (h, n) => tr('{h} of {n} days in a row', { h, n }),
  fullWeeks: (h, n) => tr('{h} of {n} full weeks', { h, n }),
  hours:     (h, n) => tr('{h} of {n} hours of the day', { h, n }),
  reminders: (h, n) => tr('{h} of {n} from a reminder', { h, n }),
  days:      (h, n) => tr('{h} of {n} days', { h, n }),
  walls:     (h, n) => tr('{h} of {n} answers', { h, n })
};
const studyEnd = () => { const c = root.SWITCH_CONFIG || {}; return typeof c.studyEnd === 'string' && keyDn(c.studyEnd) !== null ? c.studyEnd : null; };
/* Early bird is 04:00-07:59 and night owl 22:00-03:59 (UK time), so a check-in at 01:00 is a night owl's.
 * Morning, noon and night: before 12:00, 12:00-16:59 and from 17:00, all on one UK day. Diolch! is left out when
 * config has no studyEnd (nobody could earn it). */
function badges(votes, now){
  const L = ledger(votes, now), R = L.R, at = {}, end = studyEnd(), endDn = end ? keyDn(end) : null;
  const mark = (id, t) => { if(!(id in at)) at[id] = t; };
  const at1 = (n, list, t) => { for(const b of BADGE_META) if(b.count === list && b.need === n) mark(b.id, t); };
  const seen = new Set(), hours = new Set(), parts = new Map();
  let n = 0, walls = 0, rem = 0;
  for(const r of L.rows){
    const v = r.v, u = r.u;
    at1(++n, 'checkins', r.t);
    if(n === 1) mark('croeso', r.t);
    if(!seen.has(u.dn)){ seen.add(u.dn); at1(seen.size, 'days', r.t); }
    if(!hours.has(u.h)){ hours.add(u.h); at1(hours.size, 'hours', r.t); }
    if(v.wall != null && v.wall !== '') at1(++walls, 'walls', r.t);
    if(v.type === 'scheduled') at1(++rem, 'reminders', r.t);
    if(u.h >= 4 && u.h < 8) mark('early', r.t);
    if(u.h >= 22 || u.h < 4) mark('owl', r.t);
    const pt = parts.get(u.dn) || 0, bit = u.h < 12 ? 1 : u.h < 17 ? 2 : 4;
    parts.set(u.dn, pt | bit); if((pt | bit) === 7) mark('mnn', r.t);
    if(u.mo === 12 && u.d === 21) mark('solstice', r.t);
    if(u.mo === 12 && u.d === 25) mark('xmas', r.t);
    if(u.mo === 1 && u.d === 1) mark('newyear', r.t);
    if(endDn !== null && u.dn === endDn) mark('diolch', r.t);
  }
  const goals = [...L.days.values()].filter(d => d.n >= R.goal).sort((a, b) => a.dn - b.dn);
  if(goals.length) mark('goal', goals[0].goalRow.t);
  goals.forEach((d, i) => at1(i + 1, 'goodDays', d.goalRow.t));
  let run = 0, last = null;
  for(const d of goals){ run = (last !== null && d.dn === last + 1) ? run + 1 : 1; last = d.dn; at1(run, 'streak', d.goalRow.t); }
  for(const d of goals) if(dow(d.dn) === 6 && L.isGoal(d.dn - 1)){ mark('weekend', d.goalRow.t); break; }
  [...L.fullSundays].sort((a, b) => a - b).forEach((dn, i) => at1(i + 1, 'fullWeeks', L.days.get(dn).goalRow.t));
  // progress now: the current streak (today does not break it until it ends), as on Today
  const td = L.today.dn, top = L.isGoal(td) ? td : td - 1; let streak = 0;
  while(L.isGoal(top - streak)) streak++;
  const have = { checkins:n, goodDays:goals.length, streak, fullWeeks:L.fullSundays.size, hours:hours.size, reminders:rem, days:seen.size, walls };
  const W = badgeWords(R, end);
  return BADGE_META.filter(b => b.id !== 'diolch' || end).map(b => {
    const got = b.id in at, h = b.count ? Math.min(have[b.count], b.need) : 0;
    return Object.assign({ id:b.id, group:b.group, tier:b.tier || '' }, W[b.id], {
      got, at: got ? new Date(at[b.id]).toISOString() : null,
      count: b.count || null, need: b.need || 0, have: b.count ? (got ? b.need : h) : 0,
      progress: b.count && !got && b.need > 1 ? PROGRESS[b.count](h, b.need) : ''
    });
  });
}
function newBadges(beforeVotes, afterVotes, now){
  now = toMs(now);
  const had = new Set(badges(beforeVotes, now).filter(b => b.got).map(b => b.id));
  return badges(afterVotes, now).filter(b => b.got && !had.has(b.id));
}
/* The closest countable badge not yet earned: the smallest share still to go, then the fewest to go. null when there
 * is none. */
/* "Next badge: Twenty-five · 4 to go" for a nextBadge() result (the done screen; Today can use it too) */
const nextBadgeText = nb => nb && nb.badge ? tr('Next badge: {name} · {n} to go', { name: esc(nb.badge.name), n: nf(nb.need - nb.have) }) : '';
function nextBadge(votes, now){
  const list = badges(votes, now).filter(b => !b.got && b.count && b.need > 0);
  if(!list.length) return null;
  list.sort((a, b) => (a.need - a.have) / a.need - (b.need - b.have) / b.need || (a.need - a.have) - (b.need - b.have));
  const b = list[0];
  return { badge: b, have: b.have, need: b.need };
}

/* ---------- small art ---------- */
const SV = (vb, body, cls='') => `<svg class="${cls}" viewBox="${vb}" aria-hidden="true" focusable="false">${body}</svg>`;
const LP = {   // line icons in icons.js style (24 box), used when icons.js is not loaded
  chev:'<path d="M9 5l7 7-7 7"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  star:'<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
  medal:'<circle cx="12" cy="15" r="5.5"/><path d="M8.5 10.5L6 3h4l2 5 2-5h4l-2.5 7.5"/>',
  wifi:'<path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0"/><path d="M12 19h.01"/><path d="M3 3l18 18"/>',
  flag:'<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>'
};
function icon(n, cls=''){
  // icons.js keeps P and ic as top-level consts (not window properties), so look them up by name
  try{ if(typeof ic === 'function' && typeof P === 'object' && P[n]) return ic(n, cls); }catch(e){}
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LP[n] || ''}</svg>`;
}

/* Medal for 1st-3rd: a teal Swansea ribbon over a gold, silver or bronze disc. */
function medal(rank, joint){
  return SV('0 0 28 28', `<path class="gm-rib1" d="M8 1h5l2.4 8.5h-5z"/><path class="gm-rib2" d="M20 1h-5l-2.4 8.5h5z"/>` +
    `<circle class="gm-disc" cx="14" cy="17.5" r="8.6"/><circle class="gm-disc2" cx="14" cy="17.5" r="6.4"/>` +
    `<text x="14" y="17.6" dy=".36em" text-anchor="middle">${rank}</text>`, `gm-medal gm-m${rank}${joint ? ' gm-joint' : ''}`);
}

/* Drawing kit shared by the badges and the runners' portraits (the same style as the app's pictures, icons.js):
 * natural colours and a thin dark contour that stays 1 px on screen at every size. */
const INK = '#3B342E', OL = ` stroke="${INK}" stroke-width="1" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"`;
const kc = (x, y, r, f, o=OL) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"${o}/>`;
const kp = (d, f, o=OL) => `<path d="${d}" fill="${f}"${o}/>`;
const kr = (x, y, w, h, f, rx=0, o=OL) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"${rx ? ` rx="${rx}"` : ''} fill="${f}"${o}/>`;
const kt = (d, c, w=.9) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/>`;
const FLAME = 'M12 3c.5 3.5 4.5 5 4.5 9.5a4.5 4.5 0 0 1-9 0c0-2 1-3.5 2-4.5 0 1.5 1 2.5 2 2.5.5-2-.5-4 .5-7.5z';
const kflame = (tr) => `<g transform="${tr}">${kp(FLAME, '#F5A623')}${kp('M12 8.4c.4 1.8 2.5 2.7 2.5 5a2.5 2.5 0 0 1-5 0c0-1.2.6-2.1 1.3-2.7.1.9.6 1.4 1.1 1.4.2-1.2-.2-2.2.1-3.7z', '#FFD36B', '')}</g>`;
/* Badge emblems (48 box): a medallion with a small scene of what the badge is for. The rim tells the tier: bronze,
 * silver or gold for the counted series, a plain cream rim for one-off badges. No words in the pictures: digits
 * appear only where an object carries them (a phone screen, a calendar page, a ribbon, a reminder's count). */
const ENUM = (x, y, t, size, fill) => `<text class="gm-etext" x="${x}" y="${y}" dy=".36em" text-anchor="middle" style="font-size:${size}px;fill:${fill}">${t}</text>`;
const eseg = (y, f, o) => { const w = Math.sqrt(19.6 * 19.6 - (y - 24) * (y - 24)).toFixed(2);
  return kp(`M${(24 - w).toFixed(2)} ${y}H${(24 + +w).toFixed(2)}A19.6 19.6 0 0 1 ${(24 - w).toFixed(2)} ${y}Z`, f, o); };
const etick = (x, y) => kc(x, y, 4.2, '#2E8B57') + kt(`M${x - 2} ${y}l1.4 1.5 2.7-3`, '#FFFFFF', 1.3);
const ephone = t => kr(14.8, 9.6, 18.4, 28.6, '#2F3A45', 3.4) + kr(16.6, 13, 14.8, 20.6, '#E8F3F0', 1) + kt('M22.4 11.4h3.2', '#8A96A2', .9) +
  ENUM(24, 22.8, t, t.length > 2 ? 6 : 8.6, '#1F4E46') + etick(32, 34);
const epage = t => kr(13.6, 12, 20.8, 23.6, '#FFFFFF', 2) + kp('M13.6 18V14a2 2 0 0 1 2-2h16.8a2 2 0 0 1 2 2v4z', '#D84A3A') +
  kc(18.6, 12, 1.3, '#5F6973') + kc(29.4, 12, 1.3, '#5F6973') + ENUM(24, 26.6, t, 10, '#3B342E') + etick(32.8, 34.2);
const ESTREAK = t => kflame('translate(10.2 5.6) scale(1.15)') + kp('M11.6 28.4h24.8l-2.2 3.6 2.2 3.6H11.6l2.2-3.6z', '#C8402B') + ENUM(24, 32, t, 6.6, '#FFFFFF');
const egrid = rows => kr(12, 12.4, 24, 23.4, '#FFFFFF', 2) + kp('M12 18.4v-4a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2v4z', '#D84A3A') +
  [0, 1, 2, 3].map(j => [0, 1, 2, 3, 4, 5, 6].map(i => kc(+(14.8 + i * 3.07).toFixed(2), +(22 + j * 3.75).toFixed(2), 1.15, j < rows ? '#2E8B57' : '#D9DEE3', '')).join('')).join('');
const ebell = t => kt('M13.4 16.6a12 12 0 0 1 3-4.4M34.6 16.6a12 12 0 0 0-3-4.4', '#8A6A2E', 1.2) +
  kp('M24 12.6c-4.6 0-7.2 3.4-7.2 8v5.2l-2.6 3.6h19.6l-2.6-3.6v-5.2c0-4.6-2.6-8-7.2-8z', '#E3B23C') + kc(24, 11.6, 1.5, '#C9952A') + kc(24, 31.4, 2.2, '#C9952A') +
  kt('M20.2 17.4c-.8 1-1.2 2.2-1.2 3.6', '#F7DC8A', 1.2) + kc(32.6, 14.4, 5.6, '#D84A3A') + ENUM(32.6, 14.4, t, 6, '#FFFFFF');
const EMBLEM = {
  croeso: kp('M13 24l11-9 11 9z', '#5F6973') + kr(15, 24, 18, 12, '#B9583C') + kt('M15 28h18M15 32h18M20 24v4M27 28v4M23 32v4', '#E8D5C4', .7) + kr(21.6, 29, 4.8, 7, '#0E7B72', .4) + kr(16.6, 26.4, 3.6, 3.4, '#BFE1F4', .3) +
    kp('M33 21.4s-4.2-2.6-4.2-5.4a2.1 2.1 0 0 1 4.2-.8 2.1 2.1 0 0 1 4.2.8c0 2.8-4.2 5.4-4.2 5.4z', '#D84A3A'),
  goal: kr(18.6, 33, 10.8, 3, '#9E6E3E', .6) + kr(22.6, 28, 2.8, 5, '#E3B23C', 0) + kp('M15 13h18v6a9 9 0 0 1-18 0z', '#E3B23C') +
    kp('M15 15h-3a3 3 0 0 0 3 5', 'none') + kp('M33 15h3a3 3 0 0 1-3 5', 'none') + kt('M18 15.4v4', '#FFFFFF', 1.4) + kt('M20.6 19.6l2.4 2.4 4.6-5', '#2E8B57', 1.6),
  week: egrid(1),
  c10: ephone('10'), c25: ephone('25'), fifty: ephone('50'), c75: ephone('75'), hundred: ephone('100'), c150: ephone('150'), c200: ephone('200'),
  g5: epage('5'), g10: epage('10'), g20: epage('20'), g31: epage('31'),
  streak3: ESTREAK('3'), s7: ESTREAK('7'), s14: ESTREAK('14'), s21: ESTREAK('21'), s31: ESTREAK('31'),
  w2: egrid(2), w3: egrid(3),
  w4: eseg(36.4, '#4A8FE7') + kp('M11.6 36.4c3-2.2 7.6-3.2 12.4-3.2s9.4 1 12.4 3.2z', '#5F6973') + kp('M28 18.4l12-5v10.4z', '#F7E08A', '') +
    kp('M19.8 35L21.4 18.4H26.6L28.2 35Z', '#FFFFFF') + kp('M20.8 24.6h6.4l.4 4.4h-7.2z', '#D84A3A', '') + kp('M20.2 31.4h7.6l.3 3.6h-8.2z', '#D84A3A', '') + kp('M19.8 35L21.4 18.4H26.6L28.2 35Z', 'none') +
    kr(21.2, 14, 5.6, 4.4, '#F5C54A', .6) + kp('M20.4 14L24 10.4 27.6 14z', '#3B342E') + kr(19.8, 18, 8.4, 1.4, '#3B342E', .3),
  early: kc(24, 27, 7.6, '#F5A623') + eseg(27, '#4A8FE7') + kt('M9 31h6M19 34h8M30 31h7M12 37h5M27 38h7', '#BFE1F4', 1.1) +
    kt('M24 15.6v-3M15.4 19.4l-2-2M32.6 19.4l2-2', '#F5A623', 1.6),
  owl: kc(35, 14, 3.6, '#F4E3A2', '') + kp('M15.6 18l-1-5.4 4.6 3.4a10 10 0 0 1 9.6 0l4.6-3.4-1 5.4c1.4 2 2.2 4.4 2.2 7 0 6-4.8 10.4-10.6 10.4S13.4 31 13.4 25c0-2.6.8-5 2.2-7z', '#9A6B43') +
    kp('M24 19c-2-2.4-8-1.6-8 3.6 0 3.6 3.8 6.2 8 6.6 4.2-.4 8-3 8-6.6 0-5.2-6-6-8-3.6z', '#F1E3C8') + kc(20.6, 23, 2.6, '#F5A623') + kc(27.4, 23, 2.6, '#F5A623') + kc(20.6, 23, 1.3, '#1E1A16', '') + kc(27.4, 23, 1.3, '#1E1A16', '') + kp('M24 25.4l-1.2 1.8h2.4z', '#5A3A28'),
  mnn: eseg(31.6, '#8DBF6A') + kt('M11.4 30.4C14 19 20 15.4 24 15.4s10 3.6 12.6 15', '#B9A27A', .9) +
    kp('M7 31.6a4.4 4.4 0 0 1 8.8 0z', '#F5A623') + kc(24, 15.4, 4.4, '#F7C23B') + kt('M24 8.6v1.6M17.2 15.4h1.6M29.2 15.4h1.6M19.2 10.6l1.1 1.1M28.8 10.6l-1.1 1.1', '#F5A623', 1.3) +
    kp('M37.8 23.8a4.2 4.2 0 1 0 2.4 7.4 3.4 3.4 0 1 1-2.4-7.4z', '#F4E3A2'),
  clock: kc(24, 24, 12.6, '#FBF7EE') + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => { const a = i * Math.PI / 6, r1 = i % 3 ? 10.2 : 9.2, r2 = 11.2;
      return kt(`M${(24 + r1 * Math.sin(a)).toFixed(2)} ${(24 - r1 * Math.cos(a)).toFixed(2)}L${(24 + r2 * Math.sin(a)).toFixed(2)} ${(24 - r2 * Math.cos(a)).toFixed(2)}`, '#3B342E', i % 3 ? .8 : 1.4); }).join('') +
    kt('M24 24l-5.2-3', '#3B342E', 1.8) + kt('M24 24l4.6-7.4', '#3B342E', 1.4) + kt('M24 24l2.6 7', '#D84A3A', .9) + kc(24, 24, 1.3, '#D84A3A', ''),
  weekend: kc(24, 11.6, 3.6, '#F7C23B', '') + kr(10.4, 16.4, 12.4, 17.6, '#FFFFFF', 1.6) + kp('M10.4 21v-3a1.6 1.6 0 0 1 1.6-1.6h9.2a1.6 1.6 0 0 1 1.6 1.6v3z', '#F08A3C') +
    kr(25.2, 16.4, 12.4, 17.6, '#FFFFFF', 1.6) + kp('M25.2 21v-3a1.6 1.6 0 0 1 1.6-1.6h9.2a1.6 1.6 0 0 1 1.6 1.6v3z', '#F08A3C') +
    kt('M13.4 27.6l2.4 2.6 4.4-5', '#2E8B57', 1.8) + kt('M28.2 27.6l2.4 2.6 4.4-5', '#2E8B57', 1.8),
  quick10: ebell('10'), quick50: ebell('50'),
  days10: kc(19, 18, 5.6, '#F7C23B') + kt('M19 9.6v2M11 18h2M13.4 12.4l1.4 1.4M24.6 12.4l-1.4 1.4', '#F5A623', 1.4) +
    kp('M17 32a5 5 0 0 1-.4-10 7 7 0 0 1 13.4-1.4 5.4 5.4 0 0 1 .6 11.4z', '#FFFFFF') + kt('M19 35.4l-1 2M24 35.4l-1 2M29 35.4l-1 2', '#3D8CE6', 1.4),
  fortnight: kr(13.6, 12, 20.8, 23.6, '#FFFFFF', 2) + kp('M13.6 18V14a2 2 0 0 1 2-2h16.8a2 2 0 0 1 2 2v4z', '#3D8CE6') +
    kc(18.6, 12, 1.3, '#5F6973') + kc(29.4, 12, 1.3, '#5F6973') + ENUM(24, 27, '14', 10, '#3B342E') + kt('M17.4 32.6h13.2', '#9AA6B2', .9),
  wall10: (() => {   // the back of an open right hand pressed on a brick wall: the same hand as the check-in's wall pictures (icons.js)
    const hw = y => Math.sqrt(Math.max(0, 19.6 * 19.6 - (y - 24) * (y - 24)));
    let d = '';
    for(let y = 3.8, row = 0; y < 44; y += 5.4, row++){
      const w = hw(y), wm = Math.min(w, hw(y + 5.4)) - .6;
      if(w > 0) d += `M${(24 - w).toFixed(2)} ${y.toFixed(2)}H${(24 + w).toFixed(2)}`;
      for(let x = row % 2 ? 9 : 4; x < 44; x += 10) if(Math.abs(x - 24) < wm) d += `M${x} ${y.toFixed(2)}v5.4`;
    }
    const H = 'M18.4 47.6L18.6 40C17.4 38.6 16.4 37.6 15.6 36.4C13.6 33.8 11.2 30.2 9.8 27.2C9 25.4 10.6 24 12 24.8C13.6 25.8 15 28.6 16.2 30.4' +
      'C16 27.6 15.8 25 16 22.4L16.2 11.4C16.2 9.6 17.2 8.6 18.2 8.6C19.2 8.6 20.2 9.4 20.2 10.8L20.3 8.8C20.3 7.2 21.2 6.4 22.2 6.4C23.2 6.4 24.2 7.2 24.2 8.8' +
      'L24.2 9.4C24.4 8.2 25.2 7.8 26.1 7.8C27.1 7.8 28 8.6 28 10L28 13.6C28.2 12.6 29 12.2 29.8 12.2C30.8 12.2 31.6 13 31.6 14.4' +
      'L31.8 24.6C32.4 28 32.4 33 31.6 36.6C31 38.6 30.4 39.6 30.4 41L30.6 47.6Z';
    const nail = ` stroke="#CF9B76" stroke-width=".6" vector-effect="non-scaling-stroke"`;
    return kc(24, 24, 19.6, '#B9583C') + kt(d, '#E8D5C4', .8) + '<g transform="translate(9.73 7.02) scale(.7)">' +
      kp(H, INK, '').replace('/>', ' opacity=".2" transform="translate(1.3 1.1)"/>') + kp(H, '#E8BC98') +
      kp('M31.4 15.2L31.6 24.6C32.2 28 32.2 33 31.4 36.6C30.8 38.6 30.2 39.6 30.2 41L30.4 47.4H28C28.2 41 29.6 37 29.8 31C30 27 29.6 20 29.2 14.2z', '#CF9B76', '').replace('/>', ' opacity=".45"/>') +
      kt('M20.2 11v11.6M24.2 9.4v13.4M28 13.6v11', '#CF9B76', .8) + kt('M16.8 24c.9-.8 2.2-.8 3 0M20.8 23.6c1-.8 2.2-.8 3 0M24.8 24c1-.8 2.2-.8 3 0M28.6 25.2c.9-.7 1.9-.7 2.6 0', '#CF9B76', .7) +
      [[16.9, 9.6, 2.6], [20.9, 7.4, 2.6], [24.8, 8.8, 2.5], [28.7, 13.2, 2.2]].map(([x, y, w]) => kr(x, y, w, 3, '#F3D3BD', 1.1, nail)).join('') +
      `<ellipse cx="11.4" cy="26.4" rx="1.1" ry="1.6" fill="#F3D3BD"${nail} transform="rotate(-32 11.4 26.4)"/></g>` +
      kp('M21.4 36.6C24.6 35.6 29.6 35.6 32.8 36.6L33.6 41.09A19.6 19.6 0 0 1 20.8 43.34Z', '#6F8FAF') + kt('M23.4 36.1v6.6M25.8 35.8v7M28.2 35.8v6.8M30.6 36v5.8', '#56708C', .7);
  })(),
  solstice: eseg(34, '#E9F0F6') + kp('M17 34a7 7 0 0 1 14 0z', '#F5A623') +
    [0, 1, 2, 3, 4, 5].map(i => { const a = i * Math.PI / 3, x = 24 + 8.6 * Math.sin(a), y = 20 - 8.6 * Math.cos(a), bx = 24 + 5.4 * Math.sin(a), by = 20 - 5.4 * Math.cos(a);
      return kt(`M24 20L${x.toFixed(2)} ${y.toFixed(2)}M${bx.toFixed(2)} ${by.toFixed(2)}l${(2.2 * Math.sin(a - .9)).toFixed(2)} ${(-2.2 * Math.cos(a - .9)).toFixed(2)}M${bx.toFixed(2)} ${by.toFixed(2)}l${(2.2 * Math.sin(a + .9)).toFixed(2)} ${(-2.2 * Math.cos(a + .9)).toFixed(2)}`, '#FFFFFF', 1.7); }).join('') +
    kc(24, 20, 1.6, '#CFE6F7', ''),
  xmas: kr(22.2, 32.4, 3.6, 4.6, '#7A5634', .4) + kp('M24 11.4l-6.4 8.4h3l-5.4 6.8h3.4l-5.2 6.4h21.2l-5.2-6.4h3.4l-5.4-6.8h3z', '#2E7D4F') +
    kp('M24 7.6l1 2.2 2.4.3-1.8 1.6.5 2.4-2.1-1.2-2.1 1.2.5-2.4-1.8-1.6 2.4-.3z', '#F2C230') +
    kc(21.4, 19.6, 1.1, '#D84A3A', '') + kc(26.6, 24.4, 1.1, '#F2C230', '') + kc(20.6, 27.6, 1.1, '#F2C230', '') + kc(28.6, 30.2, 1.1, '#D84A3A', '') + kc(23.6, 30.8, 1.1, '#4A8FE7', ''),
  newyear: [[18.4, 19.4, 7.2, '#F7C23B'], [30.4, 27.4, 6.2, '#F07AA8']].map(([cx, cy, r, c]) => [0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = i * Math.PI / 4;
      return kt(`M${(cx + 2.2 * Math.cos(a)).toFixed(2)} ${(cy + 2.2 * Math.sin(a)).toFixed(2)}L${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`, c, 1.5); }).join('') + kc(cx, cy, 1.4, c, '')).join('') +
    kt('M30.4 38v-4.4M18.4 38v-11.4', '#8A96A2', .8) + kc(34, 15, .9, '#FFFFFF', '') + kc(13.4, 31, .9, '#FFFFFF', '') + kc(38, 21, .7, '#F7C23B', ''),
  diolch: kt('M24 24.4c0 5 .6 9 2 14', '#3E8E41', 1.8) + kp('M25 37.6c-3.4-1.4-6.4-5-7-9.6 3.4 1.6 6 4.6 7 9.6z', '#5FAE57') +
    [0, 1, 2, 3, 4, 5].map(i => `<ellipse cx="24" cy="12.6" rx="3.2" ry="6.2" fill="#F7E26B"${OL} transform="rotate(${i * 60} 24 18.4)"/>`).join('') +
    kc(24, 18.4, 4.4, '#F2A81D') + kc(24, 18.4, 2.4, '#E08A12', '') + kt('M20.6 16.2l1 .8M27.4 16.2l-1 .8M24 14v1.2', '#FBD26A', .9)
};
const EMBLEM_FIELD = { croeso:'#DCEFFB', goal:'#E7F3E3', week:'#EAF1F8', w2:'#EAF1F8', w3:'#EAF1F8', w4:'#BFE0F5', early:'#FCE3C0', owl:'#2B3A5C', mnn:'#DCEFFB',
  clock:'#E6EEF4', weekend:'#DCEFFB', days10:'#DCEFFB', fortnight:'#DCEFFB', wall10:'#F6EBD6', solstice:'#2B3A5C', xmas:'#F6E7E4', newyear:'#22304A', diolch:'#E3F1F7',
  c10:'#E6F2EF', c25:'#E6F2EF', fifty:'#E6F2EF', c75:'#E6F2EF', hundred:'#E6F2EF', c150:'#E6F2EF', c200:'#E6F2EF',
  g5:'#EEF6E8', g10:'#EEF6E8', g20:'#EEF6E8', g31:'#EEF6E8', streak3:'#FDEBD3', s7:'#FDEBD3', s14:'#FDEBD3', s21:'#FDEBD3', s31:'#FDEBD3', quick10:'#FFF3DA', quick50:'#FFF3DA' };
/* rim and bevel by tier; one-off badges get a cream rim */
const RIM = { bronze:['#B87440', '#E2A76E'], silver:['#9EA8B2', '#E3E8EC'], gold:['#D2A332', '#F6DB82'], '':['#E6D9C2', '#F8F1E4'] };
function emblem(id, got){
  const tier = BADGE_TIER[id] || '', [rim, bev] = RIM[tier];
  return SV('0 0 48 48', kc(24, 24, 22.6, rim) + `<circle cx="24" cy="24" r="21.1" fill="none" stroke="${bev}" stroke-width="1.4"/>` + kc(24, 24, 19.6, EMBLEM_FIELD[id] || '#F6EBD6') + (EMBLEM[id] || '') +
    (got ? '' : `<g class="gm-lock">${kc(38, 38, 7.5, '#FFFFFF')}${kt('M35.9 37.2v-1.6a2.1 2.1 0 0 1 4.2 0v1.6', INK, 1.3)}${kr(34.6, 37.2, 6.8, 5.2, '#E3B23C', 1.2)}</g>`),
    `gm-emb gm-e-${id}${tier ? ' gm-t-' + tier : ''}${got ? '' : ' gm-off'}`);
}

/* ---------- the runners' portraits: each alias's animal (sw_alias_names in supabase-setup.sql) ----------
 * A portrait in natural colours, 32 units across centred on 0,0, inside a light disc tinted and ringed in the
 * runner's colour, so runners are still told apart. "Red Kite 2" draws the Red Kite with a small 2; an alias that is
 * not one of the forty falls back to its initials. */
const AV = (() => {
  const K = '#26231F', W = '#FFFFFF', AOL = ` stroke="${INK}" stroke-width=".8" vector-effect="non-scaling-stroke" stroke-linejoin="round"`;
  const c = (x, y, r, f) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"${r >= 2.2 ? AOL : ''}/>`;
  const e = (x, y, rx, ry, f, rot) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}"${Math.min(rx, ry) >= 1.6 ? AOL : ''}${rot ? ` transform="rotate(${rot} ${x} ${y})"` : ''}/>`;
  const p = (d, f) => `<path d="${d}" fill="${f}"${AOL}/>`;
  const ln = (d, s, w=1) => `<path d="${d}" fill="none" stroke="${s}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const ring = (x, y, r, s, w=.7) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${s}" stroke-width="${w}"/>`;
  const eye = (x, y, r=1.3) => c(x, y, r, K) + c(+(x - r * .35).toFixed(2), +(y - r * .35).toFixed(2), +(r * .38).toFixed(2), W);
  const eyeC = (x, y, r, iris) => c(x, y, r, iris) + c(x, y, +(r * .55).toFixed(2), K) + c(+(x - r * .3).toFixed(2), +(y - r * .3).toFixed(2), +(r * .25).toFixed(2), W);
  /* shoulders: from a point on the left edge up over the body to the right edge, closed along the disc */
  const cut = (d, f, xl=-13, yl=7.6) => `<path d="M${xl} ${yl}${d}A15.2 15.2 0 0 1 ${xl} ${yl}Z" fill="${f}"${AOL}/>`;
  const birdBody = f => cut('C-11 2 -5 0 0 .8C5 1.6 9 4.6 13 7.6', f);
  const mamBody = f => cut('C-9 5 -5 4 0 4C5 4 9 5 12 9', f, -12, 9);
  /* a bird of prey's hooked beak at x0 (top of the beak's base), with a yellow cere */
  const hook = (x0, y0, f, cere) => p(`M${x0} ${y0}L${x0 + 3.8} ${y0 + 1.2}C${x0 + 4.8} ${y0 + 1.8} ${x0 + 4.6} ${y0 + 3.2} ${x0 + 3.6} ${y0 + 3.4}L${x0 + 2.8} ${y0 + 3.6}V${y0 + 2.6}L${x0 + .2} ${y0 + 2.2}Z`, f) +
    (cere ? p(`M${x0 - .2} ${y0 - .2}L${x0 + 1.4} ${y0 + .4}L${x0 + 1.2} ${y0 + 2.2}L${x0 - .2} ${y0 + 2.2}Z`, cere) : '');
  const whisk = (y, s='#F4EBDD') => ln(`M-3 ${y}l-6.2-.8M-3 ${y + 1}l-5.8 1.2M3 ${y}l6.2-.8M3 ${y + 1}l5.8 1.2`, s, .5);
  const A = {
    'Red Kite':      birdBody('#B5532C') + ln('M-7 5.6l2.6 1.8M-1.6 4.4l2.4 2.4M3.6 4.8l2 2.4', '#7A3418', .8) + c(0, -3, 7, '#DCD5CA') +
                     ln('M-4.4 -6.6l2.4 1M-5.4 -3.6l2.6.8M-3.8 -.6l2 .6', '#8F8578', .7) + hook(5.4, -5.2, '#E9B52A') + p('M9.2 -2L10.4 -2.4C11.2 -2.9 11.2 -3.6 10.9 -4L9.6 -3.2Z', K) + eyeC(2.8, -4, 1.7, '#F2C230'),
    'Puffin':        birdBody('#23262A') + e(3.4, 11, 5.2, 3.6, '#F7F6F2') + c(-1, -3.2, 7.6, '#23262A') + e(.4, -2.6, 5.6, 5.2, '#EEEDE7') +
                     p('M5 -6.6L12.6 -2.4L5 1.6Z', '#EE7A2C') + p('M5 -6.6L6.8 -5.6V.6L5 1.6Z', '#7C8B98') + ln('M8.6 -4.6V-.2', '#F2C230', .9) + p('M10.2 -3.7L12.6 -2.4L10.2 -1.1Z', '#D2452F') +
                     ring(1.6, -3.8, 1.75, '#D2452F', .6) + eye(1.6, -3.8, 1.2),
    'Otter':         mamBody('#5E3F28') + e(0, 10.4, 5.6, 4, '#CDAE8C') + c(-9.8, -4.4, 2.2, '#5E3F28') + c(9.8, -4.4, 2.2, '#5E3F28') + c(-9.8, -4.4, 1, '#3A2718') + c(9.8, -4.4, 1, '#3A2718') +
                     e(0, -.6, 11.2, 8.4, '#6E4A30') + e(-2.7, 3.4, 3.5, 2.8, '#D8BB97') + e(2.7, 3.4, 3.5, 2.8, '#D8BB97') + e(0, 6, 2.4, 1.3, '#D8BB97') +
                     p('M-2.7 .5h5.4c0 1.7-1.2 2.7-2.7 2.7s-2.7-1-2.7-2.7z', K) + c(-3.6, 3.8, .3, '#5E3F28') + c(-2.4, 4.6, .3, '#5E3F28') + c(3.6, 3.8, .3, '#5E3F28') + c(2.4, 4.6, .3, '#5E3F28') +
                     eye(-4.8, -3.4, 1.45) + eye(4.8, -3.4, 1.45) + ln('M-5 3.2l-8-1.4M-5 4.4l-7.6 1.2M5 3.2l8-1.4M5 4.4l7.6 1.2', '#F4EBDD', .5),
    'Grey Seal':     mamBody('#7B848B') + e(0, -1, 10, 10.6, '#8E979E') + c(-6, -7, 1, '#6A737A') + c(5.6, -6.6, .8, '#6A737A') + c(7.2, -1, 1.1, '#6A737A') + c(-7.6, 1.2, .9, '#6A737A') +
                     e(0, 4.2, 6, 5, '#AEB6BC') + e(0, 2.4, 2, 1.3, K) + ln('M0 3.6v1.6', '#4A5157', .6) + eye(-4.6, -3, 2) + eye(4.6, -3, 2) + whisk(5.2, '#E6EAED'),
    'Dolphin':       p('M-6 -7.8C-5.6 -11 -3.4 -13 -1 -13.6C-1.6 -11.6 -1.4 -9.6 -.6 -8.2Z', '#5C7D95') +
                     p('M-14.6 4C-13.4 -5 -5 -9.6 3 -8C7.6 -7.2 9.4 -4.4 9.8 -2L13.8 -.6C14.6 -.3 14.6 .9 13.8 1.2L9.6 2.2C6 6 -4 8.4 -14.6 6Z', '#6F90A8') +
                     p('M-14.6 6C-6 7.2 2 5.4 9.6 2.2C5.6 7 -4 9.4 -12.8 8.2Z', '#D3DEE6') + eye(4.6, -3.6, 1.1) + ln('M9.8 .6C8.4 1.6 6.8 1.8 5.4 1.4', '#3D5466', .7) + ln('M-1.6 -8.4l1.2.2', '#3D5466', .6),
    'Curlew':        birdBody('#A8865F') + ln('M-7 5l1.2.8M-3 3.8l1.2.8M2 4.6l1.2.8M-5 8.6l1.2.6M0 8.4l1.2.6M5 8.8l1 .6', '#6E5338', .8) + c(-1, -3, 6.8, '#B08D66') +
                     ln('M-5 -5.4l1 .6M-3 -7.8l1 .5M-6 -1.6l1 .5M-3.2 -3.2l.8.5M-1 -6.8l.8.6', '#6E5338', .8) + ln('M-.8 -6.2C.8 -6.8 2.6 -6.6 3.8 -5.8', '#EFE4CF', .9) +
                     ln('M5 -3.4C8.6 -2.8 11.4 -.4 12.8 3.6', '#4A3A2A', 1.5) + eye(2.2, -3.6, 1.1),
    'Kingfisher':    birdBody('#E27A2E') + p('M-14.2 5C-12 0 -8 -1 -4 .6C-6 4 -8.4 8 -10.6 10.8A15.2 15.2 0 0 1 -14.2 5Z', '#1C7BBE') + c(-1, -3.2, 7, '#1E86C8') +
                     ln('M-6 -6.4l1.4.5M-6.6 -3.8l1.4.3M-4.4 -8.2l1.2.6M-2 -9.2l1 .6', '#86CBEF', .8) + e(1.2, -2, 3.6, 1.9, '#EE7F33') + e(-1.6, 1.8, 2.4, 1.5, W) +
                     p('M5 -4.2L13.8 -2L5 -.6Z', K) + eye(2.2, -4.6, 1.1),
    'Badger':        mamBody('#7E8186') + c(-8.6, -7.4, 2.4, K) + c(8.6, -7.4, 2.4, K) + e(-8.6, -8.8, 1.4, .7, W) + e(8.6, -8.8, 1.4, .7, W) +
                     p('M0 -11C6.4 -11 9.6 -6 9.6 -1C9.6 4 5.6 9 0 10.4C-5.6 9 -9.6 4 -9.6 -1C-9.6 -6 -6.4 -11 0 -11Z', '#F3F1EC') +
                     p('M-6.2 -9.6C-4.4 -4 -3.4 1 -1.6 8.6L-.4 8.4C-1.2 2 -2.2 -4 -3.6 -10.6Z', K) + p('M6.2 -9.6C4.4 -4 3.4 1 1.6 8.6L.4 8.4C1.2 2 2.2 -4 3.6 -10.6Z', K) +
                     c(-3.4, -1.8, .5, W) + c(3.2, -1.8, .5, W) + e(0, 8.4, 1.8, 1.2, K),
    'Brown Hare':    mamBody('#9C6E45') + e(-4, -8, 2.4, 5.8, '#A9774A', -12) + e(4, -8, 2.4, 5.8, '#A9774A', 12) + e(-4, -7.6, 1.1, 4, '#E8C9A8', -12) + e(4, -7.6, 1.1, 4, '#E8C9A8', 12) +
                     c(-5, -12.6, 1.4, K) + c(5, -12.6, 1.4, K) + e(0, 0, 8.6, 8, '#A9774A') + e(0, 3.2, 4.6, 3.4, '#E3C8A4') +
                     eyeC(-4.8, -1.6, 1.8, '#E0A030') + eyeC(4.8, -1.6, 1.8, '#E0A030') + p('M-1.2 1.4h2.4L0 2.8Z', '#C77A6E') + ln('M0 2.8v1.2M0 4c-.8.8-1.8.8-2.4.2M0 4c.8.8 1.8.8 2.4.2', '#7A5235', .6),
    'Heron':         birdBody('#9AA3AA') + ln('M-6 5.6l2 3M-2 4.4l1.6 3.4', '#7C858C', .8) + c(-.6, -3.4, 6.4, '#F0F2F3') + ring(-.6, -3.4, 6.4, '#B5BCC2') +
                     p('M1.6 -7.6C-1.6 -7.8 -6 -6.6 -11.6 -3.4C-6.8 -4.6 -3 -5.2 1.2 -5.4Z', K) + p('M4.4 -4.8L14 -2.6L4.4 -1.2Z', '#E5B32B') +
                     ln('M1.2 -.8l-1.2 3.4M2.8 -1.2l-1 3', '#3C3C3C', .6) + eye(2.2, -4.4, 1),
    'Oystercatcher': birdBody('#23262A') + e(4, 11, 6, 3.6, '#F7F6F2') + c(-1, -3, 7, '#23262A') + p('M5 -4.2L14 -2.6L13.8 -1.2L5 -1Z', '#E85A2C') +
                     c(2.4, -3.8, 1.7, '#EE8A3E') + c(2.4, -3.8, 1, '#B8231C') + c(2.1, -4.1, .35, W),
    'Barn Owl':      mamBody('#D2A15A') + c(-5, 8, .6, '#8E8A84') + c(3, 9, .6, '#8E8A84') + c(7, 7, .6, '#8E8A84') +
                     p('M0 -12C7 -12 11 -7 11 -1C11 5 6 10 0 11C-6 10 -11 5 -11 -1C-11 -7 -7 -12 0 -12Z', '#DBA85E') +
                     p('M0 -6.4C-2.4 -9.6 -9 -8.6 -9.2 -2C-9.2 4.4 -3.6 8 0 9.2C3.6 8 9.2 4.4 9.2 -2C9 -8.6 2.4 -9.6 0 -6.4Z', '#FCFAF4') +
                     ln('M0 -6.4C-2.4 -9.6 -9 -8.6 -9.2 -2C-9.2 4.4 -3.6 8 0 9.2C3.6 8 9.2 4.4 9.2 -2C9 -8.6 2.4 -9.6 0 -6.4Z', '#C99A55', .7) +
                     eye(-3.8, -1.6, 1.8) + eye(3.8, -1.6, 1.8) + p('M-.9 .8H.9L0 4Z', '#E3C49A'),
    'Pine Marten':   mamBody('#4E3222') + p('M-6 4.6C-3 7 3 7 6 4.6C6 9 3 12 0 13C-3 12 -6 9 -6 4.6Z', '#F2CA7A') +
                     c(-7.2, -8.2, 3.6, '#EAD6AE') + c(7.2, -8.2, 3.6, '#EAD6AE') + c(-6.9, -7.8, 2.2, '#3A2418') + c(6.9, -7.8, 2.2, '#3A2418') +
                     p('M-9 -4.6C-9 -9.4 -4.4 -11 0 -11C4.4 -11 9 -9.4 9 -4.6C9 -.6 4.4 4.2 0 5.8C-4.4 4.2 -9 -.6 -9 -4.6Z', '#5B3A26') +
                     p('M-3 -.6C-1.6 -1.4 1.6 -1.4 3 -.6C2.6 2.2 1.4 4.4 0 5.2C-1.4 4.4 -2.6 2.2 -3 -.6Z', '#755039') + e(0, 3.6, 1.5, 1.05, K) + eye(-3.9, -4.2, 1.5) + eye(3.9, -4.2, 1.5),
    'Red Fox':       mamBody('#C9622A') + e(0, 9.8, 4.4, 3.4, '#F7F2EA') +
                     p('M-10 -3L-8.6 -13.2L-2.6 -8Z', '#E07A2F') + p('M-8.8 -5L-8.4 -11.4L-4.8 -8.2Z', '#F4E3CF') + p('M-8.9 -11.2L-8.6 -13.2L-7.2 -12Z', K) +
                     p('M10 -3L8.6 -13.2L2.6 -8Z', '#E07A2F') + p('M8.8 -5L8.4 -11.4L4.8 -8.2Z', '#F4E3CF') + p('M8.9 -11.2L8.6 -13.2L7.2 -12Z', K) +
                     p('M0 -9C6 -9 10 -5.6 10.4 -1.4C10.6 2 6 6.6 0 8.6C-6 6.6 -10.6 2 -10.4 -1.4C-10 -5.6 -6 -9 0 -9Z', '#E07A2F') +
                     p('M-10.4 -1C-8 1.4 -4.4 2.6 -2 3.2C-1 5.4 -.4 7 0 8.6C-6 6.6 -10.6 2 -10.4 -1Z', '#F7F2EA') + p('M10.4 -1C8 1.4 4.4 2.6 2 3.2C1 5.4 .4 7 0 8.6C6 6.6 10.6 2 10.4 -1Z', '#F7F2EA') +
                     e(0, 6.4, 1.5, 1.1, K) + eyeC(-4, -2.2, 1.5, '#E8A33A') + eyeC(4, -2.2, 1.5, '#E8A33A'),
    'Wren':          p('M-6 2L-12.6 -7.6L-10.4 -8.6L-3.4 .4Z', '#7E5634') + ln('M-10.6 -5.6l1.4-.8M-9 -3.2l1.4-.8', '#4E3826', .7) + e(0, 3, 9.4, 8.4, '#9A6B43') + e(2.4, 6, 5.6, 4.4, '#C9A27A') +
                     ln('M-5 6l1.4 1M-3 8.4l1.4.8M-6.4 3l1.2.8M-7 7.6l1.2.6', '#5E4026', .7) + c(3, -3.4, 5.4, '#9A6B43') + ln('M1.2 -5.4C2.8 -6.4 5 -6.4 6.6 -5.4', '#EEDFC3', .9) +
                     p('M8.2 -3.6L12 -2.6L8.2 -1.8Z', '#4A3A2A') + eye(5, -3.6, 1),
    'Robin':         p('M-9.6 2C-6.6 -1 -2.6 0 -.6 3C-2.6 6 -6.6 8 -10.2 7Z', '#7A5A3E') + e(-.6, 3.4, 10, 9, '#8B6A4C') +
                     p('M8.4 -5.6C9.8 -1 9.4 5 5 9.6C1.6 11 -1.8 10 -3 6.6C-2.2 2.6 .4 -1 2 -4.8C3.6 -7.4 6.6 -7.8 8.4 -5.6Z', '#E2652C') +
                     ln('M2 -4.8C.4 -1 -2.2 2.6 -3 6.6', '#AEB3B6', .9) + p('M-.4 -4C.4 -8.4 4.4 -10 7.6 -8.2C8.4 -7.6 8.6 -6.6 8.4 -5.6C6.6 -7.8 3.6 -7.4 2 -4.8Z', '#8B6A4C') +
                     e(1.6, 10.4, 3.6, 1.8, '#F2ECE2') + p('M9 -4.4L11.8 -3.4L9 -2.6Z', '#4A3A2A') + eye(6, -4.6, 1.1),
    'Gannet':        birdBody('#F7F7F4') + ln('M-13 7.6C-11 2 -5 0 0 .8C5 1.6 9 4.6 13 7.6', '#C3C9CE', .7) + c(-1, -3, 7, '#F7F7F4') + ring(-1, -3, 7, '#C3C9CE') +
                     p('M-7.6 -4C-7.4 -8.6 -3.6 -10.6 0 -10C3 -9.6 5 -7.6 5.6 -5.4C2 -6.6 -2.6 -6.6 -7.6 -4Z', '#F0D58A') +
                     p('M4.6 -4.6L14 -2.2L4.6 -.6Z', '#A9BBCB') + ln('M4.6 -2.6L13.4 -2.2M4.6 -.6L2.6 1.2M1.4 -4.8L4.8 -4.6', K, .7) + eyeC(2.4, -4.2, 1.3, '#BFD8E8'),
    'Peregrine':     birdBody('#F1EDE4') + ln('M-6 6.4h2M-2 7.4h2M2 6.8h2M-4 10h2M0 10.6h2M4 10h2', '#6B7480', .8) +
                     p('M-7 -1C-7.4 -7 -3.6 -10.6 1 -10.4C5.4 -10.2 8 -7.2 8 -3.6L7 -3C5.4 -3 4 -2 3.4 0C3 2.6 1.4 4.6 -.6 5L-2.6 4.4C-4 3 -6.6 1.6 -7 -1Z', '#3E4A57') +
                     p('M3.4 0C4 -2 5.4 -3 7 -3L7.6 1.6C6.6 3.6 4.6 5 2.4 5.2C2.6 3.6 3 1.6 3.4 0Z', '#F7F5F0') + hook(7.8, -3.6, '#5F6B78', '#F2C230') + eyeC(4, -4.8, 1.8, '#F2C230'),
    'Salmon':        p('M-1.6 -7L-.6 -10.2L2.6 -7.4Z', '#5F7383') + p('M-14.4 0C-10 -6 0 -8 7 -6C10.6 -5 13 -2.6 13.6 0C13 2.6 10.6 5 7 6C0 8 -10 6 -14.4 0Z', '#B8C3CC') +
                     p('M-14.4 0C-10 -6 0 -8 7 -6C10.6 -5 13 -2.6 13.6 0C10 -2 2 -3 -14.4 0Z', '#5F7383') + p('M-14.4 0C-6 4 4 4.6 13.4 1C11 4.4 8 5.8 4 6.4C-2 7.4 -10 5.6 -14.4 0Z', '#E9EDF0') +
                     c(-6, -3.6, .7, K) + c(-2, -4.6, .7, K) + c(2, -4.2, .6, K) + c(-9, -1.8, .6, K) + p('M-2 5.4L-4 9L.6 6.4Z', '#8FA0AD') +
                     ln('M5.4 -4.6C4.4 -1.6 4.4 1.6 5.4 4.6', '#4E5E6B', .8) + eyeC(9, -1.6, 1.3, '#F2EEDF') + ln('M13.4 .2L11 .8', '#4E5E6B', .7),
    'Dragonfly':     `<g transform="rotate(35)">` + [[-6.4, -6.6, -8], [6.4, -6.6, 8], [-5.8, -2.6, 8], [5.8, -2.6, -8]].map(([x, y, r]) =>
                       `<ellipse cx="${x}" cy="${y}" rx="6.6" ry="2.1" fill="#DCEFF7" stroke="#7FB6CC" stroke-width=".6" transform="rotate(${r} ${x} ${y})"/>`).join('') +
                     p('M-1.1 -3.6h2.2L.8 12.4h-1.6Z', '#2E8FA8') + ln('M-1 0h2M-.9 3h1.8M-.8 6h1.6M-.7 9h1.4', '#1E6276', .5) + e(0, -5.6, 2, 2.4, '#257A90') +
                     e(0, -8.8, 2.6, 1.8, '#2E8FA8') + c(-1.4, -9.2, 1.3, '#62C6DA') + c(1.4, -9.2, 1.3, '#62C6DA') + `</g>`,
    'Chough':        birdBody('#23262A') + c(-1, -3, 7, '#23262A') + ln('M-5 -7.6C-3 -9 0 -9.2 2 -8.4M-8 4l3-1.6', '#56647A', .8) +
                     p('M5 -4C8 -4.4 11 -3 13 .4C11.4 -1 8.4 -1.8 5.2 -1.6Z', '#D63A2A') + eye(2.4, -4, 1.1),
    'Shearwater':    birdBody('#F5F5F2') + p('M-14.2 5C-12 0 -8 -1 -4 .6C-6 4 -8.4 8 -10.6 10.8A15.2 15.2 0 0 1 -14.2 5Z', '#2E3238') + c(-1, -3, 7, '#2E3238') +
                     p('M-7.6 -1.6C-4 1 1 1 5.6 -2.4C5 1.6 2 4 -1 4C-4.4 4 -7 2 -7.6 -1.6Z', '#F5F5F2') +
                     p('M5.2 -3.4L12.4 -2.2C13.2 -1.8 13 -.8 12.2 -.6L11.6 -.4L11.6 -1.2L5.4 -1.4Z', '#3A3E45') + eye(2.2, -3.6, 1.1),
    'Hedgehog':      p('M-13.4 6C-14 -2 -9 -9.6 -1 -10.4C3.6 -10.6 6.6 -8 7.6 -5L5 2C2 5 -4 7.6 -13.4 6Z', '#7A5A3E') +
                     ln('M-10 -4l-2.4-1.8M-7 -7.4l-1.6-2.4M-3 -9l-.8-2.4M1 -9.2l.4-2.2M-9 0l-3-.8M-6 -3.6l-2-1.6M-2 -5.6l-1-2M2 -5.8l.4-2M-6 3l-2.4 .2M-2 -1l-1.6-1.4', '#4A3424', .9) +
                     ln('M-12 -1l1 .3M-8.6 -5.6l.8.6M-4.6 -8l.5.8M-.6 -9.2l.2.8', '#D8BC94', .7) +
                     p('M3 -6C6.6 -6.6 9 -4.6 10.6 -2L13.6 .6C14 1 13.8 1.8 13.2 1.8L10 2.6C7.6 5 3.4 5.4 1 3.4C.4 .4 .8 -3.4 3 -6Z', '#DCC6A6') +
                     c(13.2, 1.2, 1.1, K) + c(3.8, -5.2, 1.4, '#B89C7A') + eye(6.4, -2.4, 1.1) + e(-4, 7.8, 2, 1, '#B89C7A') + e(4, 6.6, 2, 1, '#B89C7A'),
    'Red Squirrel':  p('M-5.6 10C-13.6 9 -14.6 0 -11.6 -6C-9.6 -10 -4.6 -11.6 -2.6 -8.6C-6 -6 -7.6 -1 -6 3.6Z', '#C4542A') + ln('M-11.4 -5.4C-12.6 -2 -12.4 3 -9.6 7', '#E08A55', .8) +
                     e(1, 6, 6.6, 6.8, '#D06A30') + e(3.6, 7.6, 3.2, 4.6, '#F3E6D2') + p('M1.6 -7.4L.8 -12.8L4.4 -8.6Z', '#B04A20') + p('M5 -7.8L6.2 -12.6L7.8 -7.6Z', '#B04A20') +
                     c(4, -3, 5.6, '#D06A30') + e(6.6, -.4, 2.8, 1.8, '#F3E6D2') + c(6, -3.6, 1.8, '#F3E6D2') + eye(6, -3.6, 1.2) + c(9.4, -1.8, .8, K),
    'Gower Pony':    p('M-12.6 9C-12.6 2 -9.6 -4 -4.6 -7.4L2 -1C0 3 -2 7 -1.4 14.4A15.2 15.2 0 0 1 -12.6 9Z', '#7A4E2E') +
                     p('M-4 -7C-1 -10.4 3 -11 5 -9.6L12.4 -1.4C13.4 .2 12.6 2.6 10.6 2.8L7 3C5 3 3.4 1.6 2.4 0Z', '#8B5A3C') +
                     p('M9.6 -2.6C11.6 -2.6 13.2 -1 12.6 1.4C12.2 2.6 11 3 9.6 2.8Z', '#5A3A28') + p('M3.4 -8.4L10.6 -2.4L9.8 -1.6L2.8 -7.2Z', '#F3EEE6') +
                     p('M-4.6 -7.4C-7.6 -5 -10.6 0 -11.6 6C-9 2 -7 -1.6 -3.6 -4.4Z', '#3A2A20') + p('M-1 -9.8C.4 -8.6 1 -7 .6 -5.6C-.6 -6.6 -1.4 -8 -1 -9.8Z', '#3A2A20') +
                     p('M-2.4 -8.6L-2 -13L.6 -9.6Z', '#7A4E2E') + eye(1.6, -6, 1.1) + e(10.8, 0, .7, .5, K),
    'Lapwing':       birdBody('#F5F5F2') + p('M-14.2 5C-12 0 -8 -1 -4 .6C-6 4 -8.4 8 -10.6 10.8A15.2 15.2 0 0 1 -14.2 5Z', '#2F4A3C') +
                     p('M-3 1C0 .2 3.6 .8 6 2.4C4 4.4 0 4.6 -3.4 4Z', K) + c(-.4, -3, 6.4, '#F5F5F2') + ring(-.4, -3, 6.4, '#C3C9CE') +
                     p('M-6.6 -4C-6.4 -8 -3.4 -9.8 0 -9.6C3 -9.4 5 -7.6 5.6 -5.6C2 -6.4 -2 -6.2 -6.6 -4Z', K) +
                     ln('M-3 -8.8C-6.6 -11.8 -10 -11.4 -12.4 -8.6', '#1E2A24', 1.3) + ln('M-2.6 -8.2C-6 -10.4 -8.6 -10 -10.6 -8.2', '#1E2A24', .9) +
                     ln('M1 -2.6C2.4 -1.6 4 -1.4 5.4 -2', '#1E2A24', .8) + p('M6 -4.2L9.6 -3.4L6 -2.6Z', K) + eye(3.2, -4.2, 1),
    'Skylark':       birdBody('#C9AE84') + ln('M-7 4.4l.6 2M-3 3.4l.6 2M1 3.6l.6 2M5 4.6l.6 2M-5 8l.6 2M-1 7.6l.6 2M3 8l.6 2', '#7A5E3E', .8) + c(-.6, -3, 6.6, '#B8996A') +
                     ln('M-4.6 -6.8l.6 1.4M-2.6 -8l.6 1.4M-.6 -8.6l.6 1.4M-5.6 -3.4l.6 1.4', '#6E5338', .8) + p('M-3 -8.2L-5.6 -12.6L-.2 -9.2Z', '#8E7048') +
                     ln('M.2 -5.6C1.8 -6.4 3.6 -6.2 4.8 -5.4', '#F0E4CC', .9) + p('M5.4 -3.8L9.4 -2.8L5.4 -1.8Z', '#7A6A55') + eye(2.6, -3.8, 1),
    'Mute Swan':     cut('C-10 4 -4 3.2 0 4.6C3 5.6 6 6.2 13 7.6', '#FBFBF8') + ln('M-13 7.6C-10 4 -4 3.2 0 4.6C3 5.6 6 6.2 13 7.6', '#C3C9CE', .7) +
                     ln('M-4.6 6C-8 0 -7 -6 -2.6 -8.6C1 -10.4 5 -9.6 6.4 -6.6', '#C3C9CE', 6.6) + ln('M-4.6 6C-8 0 -7 -6 -2.6 -8.6C1 -10.4 5 -9.6 6.4 -6.6', '#FBFBF8', 5.2) +
                     e(4.4, -7.6, 3.6, 2.8, '#FBFBF8') + p('M6.6 -8.8L12.8 -6.4C13.4 -6 13.2 -5 12.4 -5L7 -5.6Z', '#EE7A2C') +
                     p('M5.6 -9.6C6.8 -10.4 8.4 -10 8.6 -8.8L7 -5.6C6 -6 5.6 -7.2 5.6 -9.6Z', K) + c(5.1, -7.6, .7, K),
    'Seahorse':      p('M2 -10C5 -10.6 7 -8.6 7 -6.2C7 -4 5.4 -3 5.2 -1C5 2 7 4.4 6 7.6C5 11 1 12 -1 9.6C-2.6 7.6 -1 5.4 .6 5.8C-.4 6.6 -.2 8.2 1 8.6C3 9.2 4 7 3.4 5C2.6 2.4 .6 1 .8 -2.6C1 -4.6 2.4 -5.4 2.2 -6.8C1 -6.2 -.6 -6.4 -1 -7.6C-1.4 -9 .2 -9.6 2 -10Z', '#EBA23A') +
                     p('M6.6 -7.4L12 -6.8V-5.2L6.4 -5.4Z', '#EBA23A') + p('M1.4 -10L2.2 -12.4L3.4 -10.2Z', '#D58A2A') + e(.2, -.6, 1.4, 2.4, '#F7CF84') +
                     ln('M5.4 -1.4h1.6M5.6 1.4h1.6M6 4.2h1.4M4.6 -3.8h1.4M3.6 7.6l1.2.8', '#C2742A', .7) + eye(4.4, -6.8, 1.1),
    'Cormorant':     birdBody('#2A2D30') + ln('M-8 4l3-1.6M-3 3.2l3-1', '#3E5A4E', .8) + c(-1, -3, 7, '#2A2D30') + e(1.4, .2, 3.6, 2.4, '#EDEDE8') +
                     p('M4.2 -2L6.4 -1.4L4.8 1.2C4 .8 3.6 -.6 4.2 -2Z', '#E8B830') + hook(5, -4, '#5E636A') + p('M8.8 -2.8H13', '#5E636A') +
                     p('M5 -4L12.6 -2.6C13.6 -2.2 13.4 -.8 12.4 -.6L11.6 -.4V-1.4L5.2 -1.8Z', '#5E636A') + eyeC(2.4, -4.2, 1.2, '#3FA06A'),
    'Kestrel':       birdBody('#ECCDA4') + c(-4, 6, .6, K) + c(0, 5.4, .6, K) + c(4, 6.2, .6, K) + c(-2, 9, .6, K) + c(2, 9.4, .6, K) +
                     p('M-14.2 5C-12 0 -8 -1 -4 .6C-6 4 -8.4 8 -10.6 10.8A15.2 15.2 0 0 1 -14.2 5Z', '#C0703A') + c(-10, 4, .6, K) + c(-8, 7, .6, K) +
                     c(-.6, -3, 6.8, '#7D8B99') + e(2.6, -.6, 3, 2.2, '#F3EBDD') + p('M2 -3.6C2.6 -1.6 2.6 .4 1.6 2.2L.8 1.8C1.4 0 1.4 -1.8 1 -3.4Z', K) +
                     hook(5.6, -4, '#5F6B78', '#F2C230') + eyeC(3, -4.6, 1.6, '#F2C230'),
    'Buzzard':       birdBody('#7A5634') + p('M-11.4 6.4C-5 3.2 4.6 3.4 11.6 6.8L12.4 9.2C5 5.8 -5 5.6 -12.4 8.6Z', '#E8D6B8') + c(-.4, -3, 7, '#8B6440') +
                     ln('M-4 -6.6l1 1M-5.4 -3.4l1 .8M-1.8 -8.6l.8 1M-2.6 .6l.8 1', '#5A3E26', .8) + hook(5.6, -4.2, '#3A3530', '#F2C230') + eyeC(2.6, -4.4, 1.45, '#6B3A1E'),
    'Dipper':        p('M-9.6 1L-13 -2.4L-11.4 -3.8L-8 -.6Z', '#3E2A1E') + e(-.6, 3.4, 10, 8.8, '#4E3426') +
                     p('M8 -4C9.6 -.6 8.8 4 5.6 7C3 8.6 0 8 -1.4 6C.6 3.6 2.4 .2 3.2 -3.2Z', '#FCFBF7') + p('M-1.4 6C0 8 3 8.6 5.6 7C4 10 0 11.6 -3 10.8Z', '#9A5A34') +
                     c(3.4, -4, 5.6, '#5A3C2C') + p('M8.6 -4.4L11.8 -3.6L8.6 -2.8Z', K) + eye(5.8, -4.6, 1),
    'Stoat':         ln('M-7.4 8.4C-11 5.4 -11.8 .4 -10.4 -3.2', '#9A6B43', 3) + ln('M-10.4 -3.2C-10 -4.8 -9.4 -6 -8.6 -6.8', K, 3) +
                     cut('C-7 2 -4 -1 -1 -1.6L5 0C6 5 6.4 8 7.6 13.2', '#9A6B43', -8.4, 12.6) + cut('C3 6 4 2 5 0C6 5 6.4 8 7.6 13.2', '#F7F2EA', 1.6, 15.1) +
                     c(-2.2, -8.2, 2.5, '#9A6B43') + c(-2.2, -8.2, 1.2, '#E8D2B4') +
                     p('M-5.4 -6.6C-4 -10 1 -11 4.6 -9.6C7.6 -8.6 10.6 -6.6 12 -4.6C12.6 -3.6 12 -2.6 11 -2.4C8 -1.8 4.6 -.6 1.6 0C-2 .8 -5.4 -1 -6 -3.6C-6.2 -4.8 -5.9 -5.8 -5.4 -6.6Z', '#A9774A') +
                     p('M11.2 -2.5C8.2 -1.9 4.8 -.7 1.8 -.1C4.6 1 8.2 .5 11 -1.5Z', '#F7F2EA') + c(11.9, -4.1, .95, K) + eye(5.2, -6, 1.3) + ln('M10.4 -3.6l3.4-1.6M10.4 -3l3.8 .1', '#5A4030', .45),
    'Osprey':        birdBody('#F5F3EE') + ln('M-4 4.4l1 1.4M0 4l1 1.4M4 4.6l1 1.4', '#7A5A3E', .9) +
                     p('M-14.2 5C-12 0 -8 -1 -4 .6C-6 4 -8.4 8 -10.6 10.8A15.2 15.2 0 0 1 -14.2 5Z', '#5A3E2A') + c(-.6, -3, 6.8, '#F5F3EE') + ring(-.6, -3, 6.8, '#C3C9CE') +
                     ln('M-4 -8l1 .8M-1.6 -9.2l.6 1M1 -9l.4 1', '#6E5338', .7) + p('M2.4 -4.6C0 -3.6 -3.6 -2.6 -7.4 -1C-7 -2.4 -6.4 -3.6 -5.6 -4.4C-3 -5 0 -5.6 2.4 -5.6Z', '#4A3426') +
                     hook(5.4, -4.4, K) + eyeC(3, -4.6, 1.4, '#F2C230'),
    'Merlin':        birdBody('#E3A462') + ln('M-6 4.4l.4 2M-2 3.6l.4 2M2 3.8l.4 2M6 5l.4 2M-4 8l.4 2M0 7.6l.4 2M4 8.2l.4 2', '#7A4E2E', .9) + c(-.6, -3, 6.6, '#6F8296') +
                     e(2.4, -.4, 2.8, 2, '#F3E6D2') + ln('M.2 -6C1.8 -6.6 3.4 -6.4 4.6 -5.8', '#B9C6D2', .8) + ln('M1.6 -2.2l-.4 2', '#4A5868', .7) +
                     hook(5.4, -4, '#4A4F55', '#F2C230') + eyeC(3, -4.2, 1.4, '#3A2A20'),
    'Swallow':       p('M-6 4L-14.6 -1.6L-12.8 -2.6L-5 1.4ZM-6.4 6L-14 3.4L-12.8 2L-5.4 3.8Z', '#1F3E7A') + e(-.8, 3, 8.4, 6.6, '#1F3E7A') +
                     p('M-6 6.4C-2 4.6 3 4.6 7 6.6C4 9.6 -2 10.2 -6 8.4Z', '#F4EEE2') + c(3, -3.4, 5.2, '#1F3E7A') + ln('M-.4 -6.6C1 -7.8 3 -8.2 4.6 -7.6', '#4A6FB0', .8) +
                     e(5.2, -.2, 2.4, 1.9, '#C8402B') + e(7.2, -5, 1.1, .9, '#C8402B') + ln('M2.6 1.8C4 2.6 5.6 2.6 7 1.6', '#1F3E7A', .9) + p('M8 -3.6L10.4 -3L8 -2.4Z', K) + eye(5.2, -4.2, .9),
    'Dormouse':      p('M6 10C11 11 14 6 12 1C11 -2 8 -2 8 1C8 3 10 4 9.6 6C9.2 7.6 7.6 8.4 6 8Z', '#D99A3A') + e(-1, 7, 7.6, 6.4, '#E0A040') + e(-1, 9.2, 4.4, 3.4, '#F6E2BC') +
                     c(-7.6, -6.6, 3, '#E0A040') + c(5.6, -6.6, 3, '#E0A040') + c(-7.6, -6.6, 1.8, '#F2C9A8') + c(5.6, -6.6, 1.8, '#F2C9A8') +
                     c(-1, -1, 7, '#E7AA48') + e(-1, 2, 3.4, 2.4, '#F6E2BC') + eye(-4.2, -2.2, 1.8) + eye(2.2, -2.2, 1.8) + c(-1, 1, .9, '#C77A6E') +
                     ln('M-3 2.4l-5-.6M-3 3.2l-4.6 1M1 2.4l5-.6M1 3.2l4.6 1', '#FFF6E6', .5),
    'Porpoise':      p('M-4 -7.6L-2.4 -12.4L1 -8.2Z', '#4E5C66') + p('M-14.6 3C-13 -5 -6 -8.4 2 -8C8 -7.6 12 -4.4 12.6 -.6C12.8 1.4 11.6 2.6 9.6 3C3 4.6 -6 6.6 -14.6 6Z', '#5F6E79') +
                     p('M-14.6 6C-6 6.6 3 4.6 9.6 3C6 6.4 -2 9 -12.8 8.2Z', '#C9D2D8') + eye(5.6, -2.6, 1) + ln('M12.4 .4C11 1 9.6 1.2 8.4 .8', '#3E4A52', .7),
    'Razorbill':     birdBody('#22262A') + e(3.4, 11, 5.6, 3.8, '#F7F6F2') + c(-1, -3, 7, '#22262A') + ln('M-5.6 -6.4C-4 -8.8 -1 -9.6 1.6 -9', '#4A5058', .8) +
                     p('M5 -6.6C8 -6.8 10.8 -5.8 12.2 -3.6C12.6 -2.8 12.4 -2 11.8 -1.6L5 .8Z', '#22262A') + ln('M5 -6.6C8 -6.8 10.8 -5.8 12.2 -3.6C12.6 -2.8 12.4 -2 11.8 -1.6L5 .8', '#8A9097', .6) +
                     ln('M9.2 -5.6V-.6', '#F7F6F2', .9) + ln('M5.2 -4.8C4 -5.4 2.8 -5.2 2 -4.6', '#F7F6F2', .7) + c(1.8, -3.8, 1.1, '#3A3E44') + c(1.5, -4.1, .4, W)
  };
  return A;
})();

const AV_KEY = {}; Object.keys(AV).forEach(k => { AV_KEY[k.toLowerCase()] = k; });
const aliasParts = alias => { const m = /^(.*?)(?:\s+(\d+))?$/.exec(String(alias || '').trim()); return { base: m[1], n: m[2] || '' }; };
/* the inside of a runner's disc, in the -17..17 box: the disc, the portrait, the ring, the number badge; '' if unknown */
function portrait(alias){
  const { base, n } = aliasParts(alias), k = AV_KEY[base.toLowerCase()];
  if(!k) return '';
  return `<circle class="gm-avb" r="16"/><circle class="gm-avt" r="16"/>${AV[k]}<circle class="gm-avr" r="15"/>` +
    (n ? `<g class="gm-avn" transform="translate(10.8 10.8)"><circle r="5.6"/><text dy=".36em" text-anchor="middle">${esc(n)}</text></g>` : '');
}
/* a runner's avatar as inline HTML (lists, the done screen, "You race as ..."); initials when the alias is unknown */
function avatarHTML(alias, colour, opt){
  opt = opt || {};
  const inner = portrait(alias), cls = `gm-av gm-c${((num(+colour, 0) % 8) + 8) % 8}${opt.me ? ' gm-me' : ''} ${opt.cls || ''}`;
  return inner ? `<span class="${cls} gm-ava" aria-hidden="true"><svg viewBox="-17 -17 34 34" focusable="false">${inner}</svg></span>`
    : `<span class="${cls}" aria-hidden="true">${esc(initials(alias))}</span>`;
}

/* ---------- the bay: Swansea Marina -> Blackpill -> Oystermouth -> Mumbles lighthouse ---------- */
function bez(a, b, c, d, t){ const u = 1 - t; return u*u*u*a + 3*u*u*t*b + 3*u*t*t*c + t*t*t*d; }
function track(start, segs){
  const pts = [{x:start[0], y:start[1], s:0}];
  let x0 = start[0], y0 = start[1], s = 0;
  for(const g of segs){
    for(let i = 1; i <= 60; i++){
      const t = i / 60, x = bez(x0, g[0], g[2], g[4], t), y = bez(y0, g[1], g[3], g[5], t), l = pts[pts.length - 1];
      s += Math.hypot(x - l.x, y - l.y); pts.push({x, y, s});
    }
    x0 = g[4]; y0 = g[5];
  }
  return { pts, L:s, d: 'M' + start.join(' ') + segs.map(g => 'C' + g.join(' ')).join('') };
}
function along(T, s){
  s = Math.max(0, Math.min(T.L, s));
  const p = T.pts; let lo = 1, hi = p.length - 1;
  while(lo < hi){ const mid = (lo + hi) >> 1; if(p[mid].s < s) lo = mid + 1; else hi = mid; }
  const a = p[lo - 1], b = p[lo], k = b.s > a.s ? (s - a.s) / (b.s - a.s) : 0;
  const tx = b.x - a.x, ty = b.y - a.y, tl = Math.hypot(tx, ty) || 1;
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, nx: -ty / tl, ny: tx / tl };   // n points inland
}
const BAY = { W:340, H:250 };
BAY.T = track([314, 58], [[274,55, 214,58, 163,75], [118,90, 89,114, 85,147], [82,173, 95,191, 121,202], [139,209, 157,210, 172,204], [178,202, 183,204, 187,208]]);
BAY.LH = { x:200, y:207 };      // lighthouse foot, on its islet just past the end of the route
// land: Swansea along the top, Gower and the Mumbles headland down the left; the shore is the route itself
BAY.land = 'M340 0H0V250H78C104 238 146 220 172 204C157 210 139 209 121 202C95 191 82 173 85 147C89 114 118 90 163 75C214 58 274 55 314 58C324 58.5 332 57 340 55Z';
/* Place names, with the boxes that runners and name labels keep clear of (w = rough text width). */
const LABELS = [
  { t:'Swansea Marina', x:306, y:40, a:'end', c:'gm-place gm-strong', w:76, solid:true },
  { t:'Blackpill', x:132, y:64, a:'middle', c:'gm-place', w:42, solid:true, dot:0.43 },
  { t:'Oystermouth', x:93, y:220, a:'end', c:'gm-place', w:58, solid:true, dot:0.79 },
  { t:'Mumbles lighthouse', x:214, y:202, a:'start', c:'gm-place gm-strong', w:94, solid:true },
  { t:'SWANSEA', x:228, y:22, a:'middle', c:'gm-town', w:58 },
  { t:'GOWER', x:40, y:118, a:'middle', c:'gm-town', w:44 },
  { t:'Swansea Bay', x:240, y:134, a:'middle', c:'gm-baytxt', w:78 }
];
/* a label's words in the app's language, and its width: the English width, or the Welsh words' own (about 5.2 per letter) */
const ltext = l => tr(l.t);
const lwidth = l => { const t = ltext(l); return t === l.t ? l.w : Math.round(t.length * (l.c.includes('gm-town') ? 7.4 : 5.2)); };
const lbox = l => { const w = lwidth(l), x0 = l.a === 'end' ? l.x - w : l.a === 'middle' ? l.x - w / 2 : l.x; return [x0 - 1, l.y - 9, x0 + w + 1, l.y + 3]; };
const LH_BOX = () => [BAY.LH.x - 6, BAY.LH.y - 31, BAY.LH.x + 6, BAY.LH.y + 2];
const baySolid = () => LABELS.filter(l => l.solid).map(lbox).concat([LH_BOX()]);
const bayKeep = () => LABELS.map(lbox).concat([LH_BOX()]);
const STRIP = { W:320, H:56 };
STRIP.T = track([24, 30], [[66,18, 104,38, 152,28], [200,18, 246,36, 292,27]]);

function bayArt(){
  const T = BAY.T, lh = BAY.LH, x = lh.x, y = lh.y;
  let s = `<rect class="gm-sea" x="0" y="0" width="${BAY.W}" height="${BAY.H}"/>`;
  s += `<g class="gm-wave" fill="none">` + [[236,104],[296,118],[204,170],[278,158],[316,206],[232,236],[150,232]].map(([wx, wy]) =>
    `<path d="M${wx} ${wy}q4 -3 8 0t8 0"/>`).join('') + `</g>`;
  s += `<path class="gm-land" d="${BAY.land}"/>`;
  s += `<path class="gm-sand" d="${T.d}"/>`;
  s += `<ellipse class="gm-islet" cx="${x}" cy="${y + 1}" rx="11" ry="5"/>`;
  s += `<path class="gm-route" d="${T.d}"/>`;
  // Oystermouth Castle beside its name, two boats off the marina
  s += `<path class="gm-castle" transform="translate(66 196)" d="M0 12V3h2.5v2.5h2.5V3h2.5v2.5H10V3h2.5v9zM4.8 12V8.6a1.5 1.5 0 0 1 3 0V12"/>`;
  s += `<g class="gm-boat"><path d="M294 88v-11l6 10z"/><path d="M290.5 88.5h12l-1.8 2.4h-8.4z"/><path d="M268 101v-8l4.6 7.2z"/><path d="M265.5 101.5h9l-1.4 1.8h-6.2z"/></g>`;
  s += `<g class="gm-start" transform="translate(314 58)"><path class="gm-pole" d="M0 0V-17"/><path class="gm-chk" d="M0 -17h10v6H0z"/><path class="gm-chk2" d="M0 -17h2.5v3H0zM5 -17h2.5v3H5zM2.5 -14H5v3H2.5zM7.5 -14H10v3H7.5z"/></g>`;
  // Mumbles lighthouse, its lamp glowing and a slow beam over the bay
  s += `<g class="gm-lh"><path class="gm-beam" d="M${x} ${y - 22}L${x + 62} ${y - 64}L${x + 68} ${y - 50}Z"/>` +
    `<path class="gm-tower" d="M${x - 5} ${y}L${x - 3.6} ${y - 19}H${x + 3.6}L${x + 5} ${y}Z"/>` +
    `<path class="gm-band" d="M${x - 4.4} ${y - 9}H${x + 4.4}"/>` +
    `<rect class="gm-lamp" x="${x - 3}" y="${y - 25.5}" width="6" height="6.5" rx="1.2"/>` +
    `<path class="gm-cap" d="M${x - 4.4} ${y - 25.5}L${x} ${y - 30.5}L${x + 4.4} ${y - 25.5}Z"/>` +
    `<circle class="gm-glow" cx="${x}" cy="${y - 22.3}" r="6.5"/></g>`;
  LABELS.forEach(l => {
    if(l.dot != null){ const a = along(T, l.dot * T.L); s += `<circle class="gm-pdot" cx="${a.x.toFixed(1)}" cy="${a.y.toFixed(1)}" r="2.4"/>`; }
    s += `<text class="${l.c}" x="${l.x}" y="${l.y}" text-anchor="${l.a}">${ltext(l)}</text>`;
  });
  return s;
}

/* ---------- runners: normalise the race payload ---------- */
function targetFor(period, fromKey){
  const R = rules(), perDay = R.goal * R.checkin + R.goalDay;
  if(period !== 'month') return 7 * perDay + R.fullWeek;
  let a = keyDn(fromKey); if(a === null){ const t = uk(Date.now()); a = Math.round(Date.UTC(t.y, t.mo - 1, 1) / DAYMS); }
  const d = dnDate(a), b = Math.round(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0) / DAYMS);
  let sundays = 0; for(let x = a; x <= b; x++) if(dow(x) === 6) sundays++;
  return (b - a + 1) * perDay + sundays * R.fullWeek;
}
function initials(alias){
  const w = String(alias || '?').trim().split(/\s+/), n = /^\d+$/.test(w[w.length - 1]) && w.length > 1 ? w.pop() : '';
  const base = w.length > 1 ? (w[0][0] + w[1][0]).toUpperCase() : (w[0].slice(0, 1).toUpperCase() + w[0].slice(1, 2).toLowerCase());
  return base + n;
}
function model(payload, period){
  const p = payload || {};
  const pts = v => Math.max(0, Math.round(num(+v, 0)));
  let rs = (Array.isArray(p.runners) ? p.runners : []).filter(Boolean).map(r => ({
    alias: String(r.alias || 'Runner'), colour: ((num(+r.colour, 0) % 8) + 8) % 8, points: pts(r.points),
    checkins: num(+r.checkins, null), goal_days: num(+r.goal_days, null), rank: num(+r.rank, null), is_me: !!r.is_me }));
  const me0 = p.me && typeof p.me === 'object' ? p.me : null;
  let me = rs.find(r => r.is_me) || null;
  if(!me && me0 && me0.alias){
    me = { alias:String(me0.alias), colour:((num(+me0.colour, 0) % 8) + 8) % 8, points:pts(me0.points), checkins:null, goal_days:null, rank:num(+me0.rank, null), is_me:true };
    rs.push(me);
  }
  // ranks: the server's when every runner has one, otherwise standard competition ranking (1, 2, 2, 4)
  if(rs.some(r => r.rank === null || r.rank < 1)){
    rs.sort((a, b) => b.points - a.points);
    rs.forEach((r, i) => { r.rank = (i && rs[i - 1].points === r.points) ? rs[i - 1].rank : i + 1; });
  }
  rs.sort((a, b) => a.rank - b.rank || b.points - a.points || (a.is_me ? -1 : b.is_me ? 1 : a.alias.localeCompare(b.alias)));
  rs.forEach(r => { r.joint = rs.filter(x => x.rank === r.rank).length > 1; r.medal = rs.length > 1 && r.points > 0 && r.rank <= 3 ? r.rank : 0; });
  const target = num(+p.target, 0) > 0 ? +p.target : targetFor(period, p.from);
  const total = Math.max(num(+p.total, 0), rs.length);
  return { rs, me, target, total, from:keyDn(p.from), to:keyDn(p.to), period };
}
const periodOf = v => v === 'month' || v === 'last_week' ? v : 'week';
function names(list){
  const n = list.map(r => esc(aliasName(r.alias)));
  if(n.length === 1) return n[0];
  if(n.length === 2) return tr(/^[AEIOUWYÂÊÎÔÛŴŶ]/i.test(n[1]) ? '{a} and {b}:vowel' : '{a} and {b}', { a: n[0], b: n[1] });   // Welsh: "a", or "ac" before a vowel
  return tr('{a} and {n} others', { a: n[0], n: n.length - 1 });
}
/* One-sentence standing: [headline, detail]. Every sentence is written out for the week and for the month. */
function standing(M){
  if(M.period === 'last_week') return finalStanding(M);
  const mo = M.period === 'month', me = M.me, rs = M.rs;
  if(!rs.length) return [tr('Nobody has set off yet'), tr(mo ? 'Your next check-in starts the race this month' : 'Your next check-in starts the race this week')];
  if(!me) return [tr('Check in to join the race'), mo ? trn(M.total, '{n} runner this month', '{n} runners this month') : trn(M.total, '{n} runner this week', '{n} runners this week')];
  if(rs.length === 1) return [tr(mo ? 'Just you so far this month' : 'Just you so far this week'), me.points ? tr('{pts} and the bay to yourself', { pts: nPoints(me.points) }) : tr('Your next check-in gets you moving')];
  if(rs.every(r => r.points === 0)) return [tr('Everyone is still at the marina'), tr('Your next check-in gets you moving')];
  const level = rs.filter(r => r !== me && r.points === me.points);
  if(me.rank === 1){
    if(level.length) return [tr(mo ? 'You share the lead this month' : 'You share the lead this week'), tr('Level with {names}', { names: names(level) })];
    const next = rs.filter(r => r !== me).sort((a, b) => b.points - a.points)[0], lead = me.points - next.points;
    return [tr(mo ? "You're in the lead this month" : "You're in the lead this week"), trn(lead, '{n} point ahead of {who}', '{n} points ahead of {who}', { who: esc(aliasName(next.alias)) })];
  }
  const ahead = rs.filter(r => r.points > me.points), gap = Math.min(...ahead.map(r => r.points)) - me.points;
  const close = ahead.filter(r => r.points === me.points + gap), v = { ord: ord(me.rank), total: M.total };
  const head = me.joint ? tr(mo ? "You're joint {ord} of {total} this month" : "You're joint {ord} of {total} this week", v)
    : tr(mo ? "You're {ord} of {total} this month" : "You're {ord} of {total} this week", v);
  return [head, trn(gap, '{n} point behind {who}', '{n} points behind {who}', { who: names(close) })];
}

function hexSlots(n, sp){                            // centre-out hexagonal packing, n offsets
  const out = [[0, 0]];
  for(let r = 1; out.length < n; r++) for(let k = 0; k < 6; k++) for(let j = 0; j < r; j++){
    const a0 = k * Math.PI / 3, a1 = a0 + Math.PI / 3, t = j / r;
    out.push([(Math.cos(a0) * (1 - t) + Math.cos(a1) * t) * r * sp, (Math.sin(a0) * (1 - t) + Math.sin(a1) * t) * r * sp]);
  }
  return out.slice(0, n);
}
/* Lay tokens out along the route, then push overlapping ones apart (the leaders and "you" move least). */
function placeTokens(M, T, W, H, opt){
  const big = M.rs.length <= (opt.bigUpTo || 15);
  const obst = opt.obstacles || [];
  const items = M.rs.map((r, i) => {
    const f = M.target > 0 ? Math.min(1, r.points / M.target) : 0, a = along(T, f * T.L);
    const lab = r.is_me || !!r.medal;
    return { r, i, f, s: f * T.L, ax:a.x, ay:a.y, nx:a.nx, ny:a.ny, x:a.x, y:a.y, lab,
      rad: (big || lab) ? opt.rBig : opt.rSmall, m: r.is_me ? 0.12 : lab ? 0.45 : 1 };
  });
  // runners on the same spot gather in a tight bunch on the sea side of the route ("you" and the leaders
  // nearest the route), so a Monday-morning crowd waits in the bay off the marina instead of covering it
  const groups = new Map();
  items.forEach(it => { const k = Math.round(it.s / 4); if(!groups.has(k)) groups.set(k, []); groups.get(k).push(it); });
  groups.forEach(g => {
    if(g.length < 2) return;
    const a0 = g[0], sp = Math.max(...g.map(it => it.rad)) * 2 + 1.6;
    const fin = a0.s >= T.L - 1 && opt.finishDir, dx = fin ? opt.finishDir[0] : -a0.nx, dy = fin ? opt.finishDir[1] : -a0.ny;
    const R = g.length > 3 || fin ? sp * Math.sqrt(g.length) / 1.8 : 0, cx = a0.ax + dx * R, cy = a0.ay + dy * R;
    const slots = hexSlots(g.length, sp).sort((p, q) => Math.hypot(cx + p[0] - a0.ax, cy + p[1] - a0.ay) - Math.hypot(cx + q[0] - a0.ax, cy + q[1] - a0.ay));
    g.slice().sort((a, b) => a.m - b.m || a.r.rank - b.r.rank).forEach((it, i) => { it.x = cx + slots[i][0]; it.y = cy + slots[i][1]; });
  });
  const clamp = it => { it.x = Math.max(it.rad + 2, Math.min(W - it.rad - 2, it.x)); it.y = Math.max(it.rad + 2, Math.min(H - it.rad - 2, it.y)); };
  for(let k = 0; k < 120; k++){
    let moved = false;
    for(let i = 0; i < items.length; i++){
      const a = items[i];
      for(let j = i + 1; j < items.length; j++){
        const b = items[j]; let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        const min = a.rad + b.rad + 1.2; if(d >= min) continue;
        if(d < 0.01){ dx = a.nx * (j % 2 ? 1 : -1); dy = a.ny * (j % 2 ? 1 : -1); d = 1; }
        const push = (min - d), ux = dx / d, uy = dy / d, sm = a.m + b.m;
        a.x -= ux * push * a.m / sm; a.y -= uy * push * a.m / sm; b.x += ux * push * b.m / sm; b.y += uy * push * b.m / sm;
        moved = true;
      }
      for(const o of (opt.rects || [])){             // place names: step out of the box by the shortest way
        const x0 = o[0] - a.rad - 1, y0 = o[1] - a.rad - 1, x1 = o[2] + a.rad + 1, y1 = o[3] + a.rad + 1;
        if(a.x <= x0 || a.x >= x1 || a.y <= y0 || a.y >= y1) continue;
        const dl = a.x - x0, dr = x1 - a.x, dt = a.y - y0, db = y1 - a.y, m = Math.min(dl, dr, dt, db);
        if(m === dl) a.x = x0; else if(m === dr) a.x = x1; else if(m === dt) a.y = y0; else a.y = y1;
        moved = true;
      }
      for(const o of obst){
        let dx = a.x - o.x, dy = a.y - o.y, d = Math.hypot(dx, dy); const min = a.rad + o.r;
        if(d >= min) continue; if(d < 0.01){ dx = -1; dy = 0; d = 1; }
        a.x = o.x + dx / d * min; a.y = o.y + dy / d * min; moved = true;
      }
      clamp(a);
    }
    if(!moved) break;
  }
  items.forEach(it => { it.dx = it.x - it.ax; it.dy = it.y - it.ay; });
  return { items, big };
}
/* Name labels for "you" and the top 3, each placed where it hides nothing already placed. */
function placeLabels(items, W, H, opt){
  const boxes = items.filter(it => it.lab || opt.allSolid).map(it => [it.x - it.rad, it.y - it.rad, it.x + it.rad, it.y + it.rad]);
  items.filter(it => it.f >= 1 && (it.lab || opt.allSolid)).forEach(it => boxes.push([it.x - it.rad * .55 - 1, it.y - it.rad - 10, it.x - it.rad * .55 + 9, it.y - it.rad]));   // finish flags
  (opt.keep || []).forEach(b => boxes.push(b));
  const hit = b => b[0] < 1 || b[1] < 1 || b[2] > W - 1 || b[3] > H - 1 || boxes.some(o => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
  const order = items.filter(it => it.lab).sort((a, b) => (b.r.is_me - a.r.is_me) || a.r.rank - b.r.rank);
  for(const it of order){
    if(it.r.is_me){
      const w = 26, h = 14;
      for(const dy of [-(it.rad + 5 + h / 2), it.rad + 5 + h / 2]){
        const b = [it.x - w / 2, it.y + dy - h / 2, it.x + w / 2, it.y + dy + h / 2];
        if(!hit(b) || dy > 0){ it.pill = { dy }; boxes.push(b); break; }
      }
      continue;
    }
    if(!opt.names) continue;
    const t = aliasName(it.r.alias), w = t.length * 5.3 + 4, h = 11, g = it.rad + 3;
    const cands = [ [g, 0, 'start'], [-g, 0, 'end'], [0, -(it.rad + 8), 'middle'], [0, it.rad + 10, 'middle'] ];
    for(const [ox, oy, anchor] of cands){
      const x0 = anchor === 'start' ? it.x + ox : anchor === 'end' ? it.x + ox - w : it.x - w / 2;
      const b = [x0, it.y + oy - h / 2, x0 + w, it.y + oy + h / 2];
      if(!hit(b)){ it.name = { ox, oy, anchor }; boxes.push(b); break; }
    }
  }
}
function tokenSVG(it, opt){
  const r = it.r, rad = it.rad, txt = initials(r.alias), small = !(opt.big || it.lab);
  let s = '';
  if(it.f >= 1 && !small) s += `<g class="gm-fin"><path d="M${-rad * .55} ${-rad * .55}V${-rad - 9}"/><path class="gm-pen" d="M${-rad * .55} ${-rad - 9}h8l-2.2 2.6 2.2 2.6h-8z"/></g>`;
  if(r.is_me) s += `<circle class="gm-pulse" r="${rad + 3}"/><circle class="gm-ring" r="${rad + 3}"/>`;
  const face = small ? '' : portrait(r.alias);
  if(face) s += `<circle class="gm-avo" r="${(rad + 1).toFixed(2)}"/><g transform="scale(${(rad / 16).toFixed(4)})">${face}</g>`;
  else s += `<circle class="gm-dot" r="${rad}"/>` + (small ? '' : `<text class="gm-ini${txt.length > 2 ? ' gm-long' : ''}" dy=".36em" text-anchor="middle">${esc(txt)}</text>`);
  if(r.medal && !small && !opt.noMedal) s += `<g class="gm-tm gm-m${r.medal}" transform="translate(${(rad * .78).toFixed(1)} ${(-rad * .78).toFixed(1)})"><circle class="gm-disc" r="4.6"/><text dy=".36em" text-anchor="middle">${r.medal}</text></g>`;
  if(it.pill) s += `<g class="gm-pill" transform="translate(0 ${it.pill.dy.toFixed(1)})"><rect x="-13" y="-7" width="26" height="14" rx="7"/><text dy=".36em" text-anchor="middle">${tr('You')}</text></g>`;
  if(it.name) s += `<text class="gm-name" x="${it.name.ox.toFixed(1)}" y="${it.name.oy.toFixed(1)}" dy=".36em" text-anchor="${it.name.anchor}">${esc(aliasName(r.alias))}</text>`;
  return `<g class="gm-tk gm-c${r.colour}${r.is_me ? ' gm-me' : ''}${small ? ' gm-sm' : ''}" data-s="${it.s.toFixed(2)}" data-dx="${it.dx.toFixed(2)}" data-dy="${it.dy.toFixed(2)}" transform="translate(${it.x.toFixed(1)} ${it.y.toFixed(1)})">${s}</g>`;
}
function baySVG(M){
  const T = BAY.T;
  let s = bayArt();
  if(M && M.rs.length){
    const lay = placeTokens(M, T, BAY.W, BAY.H, { rBig:12.4, rSmall:6.2, rects: baySolid(), finishDir:[-0.5, -0.87] });   // finishers wait in the water left of the lighthouse
    placeLabels(lay.items, BAY.W, BAY.H, { names:true, allSolid: lay.big, keep: bayKeep() });
    const meIt = lay.items.find(it => it.r.is_me);
    if(meIt) s += `<path class="gm-trail" d="${T.d}" pathLength="1000" stroke-dasharray="${(meIt.f * 1000).toFixed(1)} 1000" data-f="${meIt.f.toFixed(4)}"/>`;
    // draw from the back of the field forwards, "you" last so it is never hidden
    lay.items.slice().sort((a, b) => (a.r.is_me - b.r.is_me) || (a.lab - b.lab) || b.r.rank - a.r.rank)
      .forEach(it => { s += tokenSVG(it, { big: lay.big }); });
  }
  const label = M && M.me ? tr('Swansea Bay race map. You are {ord} of {total}.', { ord: ord(M.me.rank), total: M.total }) : tr('Swansea Bay race map from Swansea Marina to Mumbles lighthouse.');
  return `<svg class="gm-bay" viewBox="0 0 ${BAY.W} ${BAY.H}" role="img" aria-label="${label}" data-track="bay">${s}</svg>`;
}
function stripSVG(M){
  const T = STRIP.T, end = along(T, T.L);
  let s = `<path class="gm-ssea" d="${T.d}"/><path class="gm-sroute" d="${T.d}"/>`;
  s += `<g class="gm-start" transform="translate(${T.pts[0].x} ${T.pts[0].y})"><path class="gm-pole" d="M0 0V-14"/><path class="gm-chk" d="M0 -14h8v5H0z"/><path class="gm-chk2" d="M0 -14h2v2.5H0zM4 -14h2v2.5H4zM2 -11.5h2V-9H2zM6 -11.5h2V-9H6z"/></g>`;
  const x = end.x + 12, y = end.y + 5;
  s += `<g class="gm-lh"><ellipse class="gm-islet" cx="${x}" cy="${y + 1}" rx="7" ry="3"/><path class="gm-tower" d="M${x - 3.4} ${y}L${x - 2.4} ${y - 12}H${x + 2.4}L${x + 3.4} ${y}Z"/><rect class="gm-lamp" x="${x - 2}" y="${y - 16}" width="4" height="4" rx=".8"/><path class="gm-cap" d="M${x - 3} ${y - 16}L${x} ${y - 19}L${x + 3} ${y - 16}Z"/><circle class="gm-glow" cx="${x}" cy="${y - 14}" r="4"/></g>`;
  s += `<text class="gm-slab" x="${T.pts[0].x - 8}" y="52">${tr('Marina')}</text><text class="gm-slab" x="${STRIP.W - 3}" y="52" text-anchor="end">${tr('Mumbles')}</text>`;
  if(M && M.rs.length){
    const shown = M.rs.filter(r => r.rank <= 3 || r.is_me).slice(0, 3).concat(M.rs.filter(r => r.is_me && r.rank > 3).slice(0, 1));
    const sub = Object.assign({}, M, { rs: shown });
    const lay = placeTokens(sub, T, STRIP.W, STRIP.H, { rBig:10.6, rSmall:10.6, bigUpTo:99, rects:[[14, 44, 46, 54], [278, 44, 318, 54]] });
    placeLabels(lay.items, STRIP.W, STRIP.H, { names:false, allSolid:true });
    lay.items.forEach(it => { if(it.pill) it.pill = null; });     // the list says who is who; keep the strip clean
    lay.items.slice().sort((a, b) => (a.r.is_me - b.r.is_me) || b.r.rank - a.r.rank).forEach(it => { s += tokenSVG(it, { big:true, noMedal:true }); });
  }
  return `<svg class="gm-strip" viewBox="0 0 ${STRIP.W} ${STRIP.H}" aria-hidden="true" data-track="strip">${s}</svg>`;
}
/* Last week's race is over: the final standings, in the past tense. */
function finalStanding(M){
  const me = M.me, rs = M.rs;
  if(!rs.length || rs.every(r => r.points === 0)) return [tr('Nobody scored last week'), tr('This week is a fresh start')];
  if(!me) return [tr("Last week's final standings"), nRunners(M.total)];
  if(!me.points) return [tr("You didn't score last week"), tr('This week is a fresh start')];
  if(me.rank === 1) return [tr(me.joint ? 'You shared first place last week' : 'You won last week!'), nPoints(me.points)];
  return [tr(me.joint ? 'You finished joint {ord} of {total} last week' : 'You finished {ord} of {total} last week', { ord: ord(me.rank), total: M.total }), nPoints(me.points)];
}
/* "Last week you finished 2nd with 370 points" (from last week's race), or '' when there is nothing to say */
function lastWeekLine(lw){
  if(!lw || !lw.me) return '';
  const M = model(lw, 'last_week'), me = M.me;
  if(!me || !me.points || !(me.rank > 0)) return '';
  return tr(me.joint ? 'Last week you finished joint {ord} with {pts}' : 'Last week you finished {ord} with {pts}', { ord: ord(me.rank), pts: nPoints(me.points) });
}
/* this week's race has nobody on points yet (a new week has just begun) */
const emptyWeek = (p, M) => p && periodOf(p.period) === 'week' && (!M.rs.length || M.rs.every(r => r.points === 0));

/* ---------- HTML pieces ---------- */
function seg(period){
  const b = (v, t) => `<button class="${period === v ? 'gm-on' : ''}" data-act="race-period" data-v="${v}" aria-pressed="${period === v}">${t}</button>`;
  return `<div class="gm-seg" role="group" aria-label="${tr('Race period')}">${b('week', tr('seg:This week'))}${b('last_week', tr('seg:Last week'))}${b('month', tr('seg:This month'))}</div>`;
}
function rangeLine(M){
  const now = uk(Date.now()).dn;
  if(M.from === null || M.to === null) return tr(M.period === 'month' ? 'The race runs to the end of the month' : 'The race runs Monday to Sunday');
  const a = dnDate(M.from), b = dnDate(M.to);
  const span = M.period === 'month' ? `${monthName(a.getUTCMonth())} ${a.getUTCFullYear()}`
    : a.getUTCMonth() === b.getUTCMonth() ? `${a.getUTCDate()}–${b.getUTCDate()} ${monthName(a.getUTCMonth())}` : `${shortDate(M.from)} – ${shortDate(M.to)}`;
  const left = M.to - now;
  const tail = M.period === 'last_week' || left < 0 ? tr('Final standings') : left === 0 ? tr('Last day!') : left === 1 ? tr('Ends tomorrow') : trn(left + 1, '{n} day to go', '{n} days to go');
  return `${span} · ${tail}`;
}
function av(r, cls=''){ return avatarHTML(r.alias, r.colour, { me: r.is_me, cls }); }
/* Medals only for 1st-3rd with points to their name and someone to beat; nobody ranks on zero points. */
function rankCell(r){ return r.medal ? medal(r.medal, r.joint) : `<span class="gm-rn">${r.points ? r.rank + (r.joint ? '=' : '') : '–'}</span>`; }
function rowHTML(r, M, compact){
  const bits = [];
  if(!compact && r.checkins != null) bits.push(nCheckins(r.checkins));
  if(!compact && r.goal_days != null) bits.push(nGoalDays(r.goal_days));
  const fin = M.target > 0 && r.points >= M.target ? `<span class="gm-fintag" title="${tr('Reached the lighthouse')}">${icon('flag')}</span>` : '';
  const tags = fin + (r.is_me ? `<span class="gm-you">${tr('You')}</span>` : '');
  return `<li class="gm-row${r.is_me ? ' gm-isme' : ''}"><span class="gm-rk">${rankCell(r)}</span>${av(r)}` +
    `<span class="gm-who"><b>${esc(aliasName(r.alias))}</b>${tags}${bits.length ? `<small>${bits.join(' · ')}</small>` : ''}</span>` +
    `<span class="gm-pts"><b data-gm-count="${r.points}">${nf(r.points)}</b><small>${tr('pts')}</small></span></li>`;
}
function listHTML(M){
  const rs = M.rs, me = M.me, TOP = 10;
  if(rs.length <= TOP + 2) return `<ol class="gm-list">${rs.map(r => rowHTML(r, M)).join('')}</ol>`;
  const top = rs.slice(0, TOP), rest = rs.slice(TOP);
  let h = `<ol class="gm-list">${top.map(r => rowHTML(r, M)).join('')}`;
  if(me && rest.includes(me)) h += `<li class="gm-gap" aria-hidden="true"><i></i><i></i><i></i></li>` + rowHTML(me, M);
  h += `</ol><details class="gm-more"><summary>${tr('Show all {n} runners', { n: rs.length })}</summary><ol class="gm-list">${rest.map(r => rowHTML(r, M)).join('')}</ol></details>`;
  return h;
}
function toGo(M){
  if(!M.me || !M.target) return '';
  const left = M.target - M.me.points;
  if(M.period === 'last_week') return left <= 0 ? `<span class="gm-made">${icon('flag')}${tr('You reached Mumbles lighthouse')}</span>` : '';
  if(left <= 0) return `<span class="gm-made">${icon('flag')}${tr("You've reached Mumbles lighthouse")}</span>`;
  return `<span>${trn(left, '{n} point to the lighthouse', '{n} points to the lighthouse')}</span>`;
}
function footHTML(M){
  const who = M && M.me ? tr('You race as {av}<b>{alias}</b>, a Welsh wildlife name picked at random.', { av: avatarHTML(M.me.alias, M.me.colour, { me: true, cls: 'gm-inl' }), alias: esc(aliasName(M.me.alias)) }) : '';
  const safe = tr('Nobody in the race sees your name or your answers.');
  return `<p class="gm-foot">${icon('info')}<span>${who ? `${who} ${safe}` : safe}</span></p>`;
}
/* opt: { period: 'week' | 'last_week' | 'month', lastWeek: last week's race payload (for the note on an empty week),
 *        loading: true while the phone is online (no race yet means it is still on its way, not "offline") } */
function raceHTML(payload, opt){
  opt = opt || {};
  const period = periodOf(opt.period || (payload && payload.period));
  const head = `<header class="gm-head"><div class="gm-eyebrow">${tr('The Bay Race')}</div><h1 class="gm-h1">${tr('Marina to Mumbles')}</h1>`;
  const btns = `<div class="gm-btns"><button class="gm-btn" data-act="race-how">${icon('info')}${tr('How points work')}</button><button class="gm-btn" data-act="badges">${icon('medal')}${tr('My badges')}</button></div>`;
  if(!payload) return `<div class="gm-race gm-off">${head}<p class="gm-sub">${tr('Swansea Marina to Mumbles lighthouse')}</p></header>${seg(period)}
    <section class="gm-card gm-map">${baySVG(null)}<div class="gm-veil"><div>${opt.loading ? `${icon('refresh')}<b>${tr('Loading the race&hellip;')}</b><span>${tr('It appears here in a moment. Your check-ins count either way.')}</span>`
      : `${icon('wifi')}<b>${tr('The race is offline')}</b><span>${tr("It appears when your phone is online. Your check-ins still count and are sent when you're back.")}</span>`}</div></div></section>${btns}</div>`;
  const M = model(payload, period), [h1, h2] = standing(M);
  const me = M.me;
  const sum = `<div class="gm-sum">` +
    (me ? `<div class="gm-mine"><b data-gm-count="${me.points}">${nf(me.points)}</b><span>${tr(period === 'month' ? 'points this month' : period === 'last_week' ? 'points last week' : 'points this week')}</span></div>` : '') +
    `<div class="gm-say"><b>${h1}</b><span>${h2}</span>${me && M.rs.length > 1 && !M.rs.every(r => r.points === 0) ? toGo(M) : ''}</div></div>`;
  const lwl = emptyWeek(payload, M) ? lastWeekLine(opt.lastWeek) : '';
  const fresh = emptyWeek(payload, M) ? `<section class="gm-card gm-new">${icon('flag')}<div><b>${tr('A new race started on Monday')}</b><span>${lwl ? `${lwl}.` : tr('Everyone starts again at Swansea Marina.')}</span>
      <button class="gm-link" data-act="race-period" data-v="last_week">${tr('See last week&rsquo;s final standings')}</button></div></section>` : '';
  return `<div class="gm-race" data-period="${period}">${head}<p class="gm-sub">${rangeLine(M)}</p></header>${seg(period)}${fresh}
    <section class="gm-card gm-map">${baySVG(M)}${sum}</section>
    ${M.rs.length ? `<section class="gm-card gm-board"><div class="gm-cap"><span>${tr('Standings')}</span><small>${tr('{runners} · finish at {target}', { runners: nRunners(M.total), target: nf(M.target) })}</small></div>${listHTML(M)}</section>` : ''}
    ${btns}${footHTML(M)}</div>`;
}
function raceMiniHTML(payload, opt){
  opt = opt || {};
  const eyebrow = { week: 'The Bay Race · this week', last_week: 'The Bay Race · last week', month: 'The Bay Race · this month', none: 'The Bay Race' };
  const head = k => `<div class="gm-mhead"><span class="gm-eyebrow">${tr(eyebrow[k])}</span><span class="gm-go">${tr('Race')} ${icon('chev')}</span></div>`;
  if(!payload) return `<button class="gm-mini gm-off" data-act="tab" data-to="race">${head('none')}${stripSVG(null)}<span class="gm-mline">${opt.loading ? `${icon('refresh')}${tr('Loading the race&hellip;')}` : `${icon('wifi')}${tr("The race shows here when you're online")}`}</span></button>`;
  const period = periodOf(payload.period);
  const M = model(payload, period), [h1, h2] = standing(M);
  if(emptyWeek(payload, M)){
    const lwl = lastWeekLine(opt.lastWeek);
    return `<button class="gm-mini gm-fresh" data-act="race-period" data-v="last_week" aria-label="${lwl ? tr("A new race started on Monday. {line}. See last week's final standings.", { line: lwl }) : tr("A new race started on Monday. See last week's final standings.")}">${head(period)}${stripSVG(M)}` +
      `<span class="gm-mline"><b>${tr('A new race started on Monday')}</b><span>${lwl ? tr('{line} &middot; see the final standings', { line: lwl }) : tr('Your next check-in gets you moving')}</span></span></button>`;
  }
  const shown = M.rs.filter(r => (r.medal || (r.rank <= 3 && M.rs.length > 1)) && r !== M.me).slice(0, 3);
  const rows = shown.concat(M.me ? [M.me] : []).sort((a, b) => a.rank - b.rank || (a.is_me ? 1 : -1));
  return `<button class="gm-mini" data-act="tab" data-to="race" aria-label="${tr('The Bay Race: {h1}. Open the race.', { h1 })}">${head(period)}${stripSVG(M)}` +
    (rows.length ? `<ol class="gm-mlist">${rows.map(r => `<li class="${r.is_me ? 'gm-isme' : ''}"><span class="gm-rk">${rankCell(r)}</span>${av(r, 'gm-small')}<span class="gm-who"><b>${esc(aliasName(r.alias))}</b>${r.is_me ? `<span class="gm-you">${tr('You')}</span>` : ''}</span><span class="gm-pts"><b>${nf(r.points)}</b><small>${tr('pts')}</small></span></li>`).join('')}</ol>` : '') +
    `<span class="gm-mline"><b>${h1}</b><span>${h2}</span></span></button>`;
}
/* All-time points (a new week never shows "0 points" to someone who has points), and this week's place in the race
 * only while this week has points to rank on. */
function pointsChipHTML(points, me){
  const o = points && typeof points === 'object' ? points : null;
  const n = typeof points === 'number' ? points : o ? num(o.all_time, 0) : 0, week = o ? num(o.week, 0) : n;
  const rank = week > 0 && me && num(+me.rank, 0) > 0 ? +me.rank : 0;     // nobody ranks on zero points
  const label = rank ? trn(n, '{n} point in all, {ord} in the Bay Race this week', '{n} points in all, {ord} in the Bay Race this week', { ord: ord(rank) })
    : trn(n, '{n} point in all', '{n} points in all');
  return `<button class="gm-chip" data-act="tab" data-to="race" aria-label="${label}">${icon('star')}<b>${nf(n)}</b>${pointWord(n)}${rank ? `<i>·</i>${tr('{ord} this week', { ord: ord(rank) })}` : ''}</button>`;
}
function badgesHTML(list){
  list = Array.isArray(list) ? list : [];
  const got = list.filter(b => b.got).length;
  const fd = iso => { const d = uk(Date.parse(iso)); return tr('Earned {date}', { date: `${d.d} ${monthName(d.mo - 1, true)}` }); };
  const card = b => `<li class="gm-badge${b.got ? ' gm-got' : ''}">${emblem(b.id, b.got)}<b>${esc(b.name)}</b><span>${esc(b.got ? b.desc : b.how)}</span>` +
    (b.got && b.at ? `<small>${fd(b.at)}</small>` : '') +
    (!b.got && b.progress ? `<span class="gm-bprog"><span class="gm-bar"><i style="width:${Math.round(b.have / b.need * 100)}%"></i></span><em>${esc(b.progress)}</em></span>` : '') + `</li>`;
  const groups = BADGE_GROUPS.map(g => {
    const in_ = list.filter(b => b.group === g.id);
    if(!in_.length) return '';
    return `<section class="gm-bgroup"><h3 class="gm-bgh">${tr(g.name)}<small>${tr('{h} of {n}', { h: in_.filter(b => b.got).length, n: in_.length })}</small></h3><ul class="gm-bgrid">${in_.map(card).join('')}</ul></section>`;
  }).join('');
  return `<div class="gm-badges"><div class="gm-bhead"><span>${tr('<b>{got}</b> of {n} badges', { got, n: list.length })}</span><span class="gm-bar"><i style="width:${list.length ? Math.round(got / list.length * 100) : 0}%"></i></span></div>
    ${groups}
    <p class="gm-foot">${icon('info')}<span>${tr('Badges are just for you. Nobody else sees them.')}</span></p></div>`;
}
function doneHTML(o){
  o = o || {};
  const R = rules(), b = o.before || {}, a = o.after || {};
  const size = s => s && typeof s.size === 'number' ? s.size : 0;
  const dc = num(a.counted, 0) - num(b.counted, 0), dg = size(a.goalDays) - size(b.goalDays), dw = size(a.fullWeeks) - size(b.fullWeeks);
  let i = 0;
  const gain = (n, what, why, cls='') => `<li class="gm-gain ${cls}" style="--i:${i++}"><b>+${nf(n)}</b><span><strong>${what}</strong>${why ? `<small>${why}</small>` : ''}</span></li>`;
  let lines = '';
  if(dc > 0) lines += gain(R.checkin * dc, pointWord(R.checkin * dc), dc > 1 ? tr('for {n} check-ins', { n: dc }) : tr('for this check-in'));
  if(dg > 0) lines += gain(R.goalDay * dg, tr('daily goal bonus'), tr('{g} check-ins today', { g: R.goal }), 'gm-bonus');
  if(dw > 0) lines += gain(R.fullWeek * dw, tr('full week bonus'), tr('your goal every day this week'), 'gm-bonus gm-big');
  if(dc <= 0 && (o.before || o.after)){
    const why = num(a.todayCount, 0) >= R.dailyCap ? tr("You've had today's {cap} counted check-ins.", { cap: R.dailyCap }) : tr("Check-ins add points when they're at least {gap} minutes apart.", { gap: R.gapMin });
    lines += `<li class="gm-gain gm-none" style="--i:${i++}"><b>+0</b><span><strong>${why}</strong><small>${tr('Every answer still helps the study.')}</small></span></li>`;
  }
  let h = lines ? `<ul class="gm-gains">${lines}</ul>` : '';
  if(o.after && typeof a.week === 'number') h += `<p class="gm-total" style="--i:${i++}">${tr('{pts} this week', { pts: nPoints(a.week) })}${a.streak > 1 ? trn(a.streak, ' · {n}-day goal streak', ' · {n}-day goal streak') : ''}</p>`;
  (Array.isArray(o.newBadges) ? o.newBadges : []).forEach(nb => {
    h += `<button class="gm-newb" data-act="badges" style="--i:${i++}">${emblem(nb.id, true)}<span><small>${tr('New badge')}</small><b>${esc(nb.name)}</b><span>${esc(nb.desc)}</span></span>${icon('chev', 'gm-chev')}</button>`;
  });
  const nb = o.next && o.next.badge ? o.next : null;
  if(nb) h += `<p class="gm-nextb" style="--i:${i++}">${emblem(nb.badge.id, false)}<span>${nextBadgeText(nb)}</span></p>`;
  const rb = num(+o.rankBefore, 0), ra = num(+o.rankAfter, 0);
  let move = '';
  if(ra && rb && ra < rb) move = ra === 1 ? tr('You took the lead in the Bay Race') : tr('You moved up to {ord} in the Bay Race', { ord: ord(ra) });
  else if(ra && !rb) move = tr("You're {ord} in the Bay Race this week", { ord: ord(ra) });
  const meArt = o.me && o.me.alias && portrait(o.me.alias) ? `<span class="gm-movav">${avatarHTML(o.me.alias, o.me.colour, { me: true })}${ra >= 1 && ra <= 3 ? medal(ra) : ''}</span>` : medalOrIcon(ra);
  if(move) h += `<button class="gm-move" data-act="tab" data-to="race" style="--i:${i++}">${meArt}<span>${move}</span>${icon('chev', 'gm-chev')}</button>`;
  return h ? `<div class="gm-done">${h}</div>` : '';
}
const medalOrIcon = r => r >= 1 && r <= 3 ? medal(r) : `<span class="gm-moveic">${icon('star')}</span>`;
function howSheetHTML(){
  const R = rules(), perDay = R.goal * R.checkin + R.goalDay, week = 7 * perDay + R.fullWeek;
  const row = (n, t, d) => `<li><span class="gm-hn">+${n}</span><div><b>${t}</b><span>${d}</span></div></li>`;
  return `<div class="gm-how">
    <ul class="gm-hrows">
      ${row(R.checkin, tr('Every check-in'), tr('A check-in counts when it is at least {gap} minutes after your last one. Up to {cap} a day count.', { gap: R.gapMin, cap: R.dailyCap }))}
      ${row(R.goalDay, tr('Daily goal'), tr('Reach {g} check-ins in a day. Days run from midnight to midnight, UK time.', { g: R.goal }))}
      ${row(R.fullWeek, tr('Full week'), tr('Reach your daily goal on all seven days, Monday to Sunday.'))}
    </ul>
    <div class="gm-hsec"><b>${tr('The Bay Race')}</b><p>${tr('Everyone in the study races along the bay from Swansea Marina to Mumbles lighthouse. Your daily goal every day takes you to the lighthouse by Sunday: that is {week} points. A new week starts every Monday and a new month on the 1st.', { week: nf(week) })}</p></div>
    <div class="gm-hsec"><b>${tr('Your name stays private')}</b><p>${tr('In the race you appear as a Welsh wildlife name picked at random, like Puffin or Grey Seal. Nobody else sees your name, your code or your answers.')}</p></div>
    <div class="gm-hsec"><b>${tr('Badges')}</b><p>${tr('Badges are small milestones, like your first check-in or a week of daily goals. They are just for you.')}</p></div>
    <p class="gm-foot">${icon('info')}<span>${tr('Every check-in helps the study, even one that adds no points.')}</span></p>
  </div>`;
}

/* ---------- motion: runners set off from the marina; nothing moves for reduced motion ---------- */
function animate(rootEl){
  if(!rootEl || !rootEl.querySelectorAll || reduced() || typeof requestAnimationFrame !== 'function') return;
  const jobs = [];
  rootEl.querySelectorAll('svg[data-track]').forEach(svg => {
    const T = svg.getAttribute('data-track') === 'strip' ? STRIP.T : BAY.T;
    const toks = [...svg.querySelectorAll('.gm-tk')];
    toks.forEach((g, k) => {
      const s = +g.getAttribute('data-s') || 0, dx = +g.getAttribute('data-dx') || 0, dy = +g.getAttribute('data-dy') || 0;
      const dur = 700 + 1500 * (s / T.L), delay = Math.min(500, (toks.length - 1 - k) * 18);
      const fin = g.querySelector('.gm-fin'); if(fin) fin.style.opacity = '0';
      jobs.push({ dur, delay, step: e => {
        const p = along(T, s * e), k2 = 0.35 + 0.65 * e;
        g.setAttribute('transform', `translate(${(p.x + dx * k2).toFixed(1)} ${(p.y + dy * k2).toFixed(1)})`);
      }, done: () => { if(fin){ fin.style.transition = 'opacity .3s'; fin.style.opacity = '1'; } } });
    });
    const trail = svg.querySelector('.gm-trail'), me = svg.querySelector('.gm-me');
    if(trail){
      const f = +trail.getAttribute('data-f') || 0, s = f * T.L;
      jobs.push({ dur: 700 + 1500 * (s / T.L), delay: 0, step: e => trail.setAttribute('stroke-dasharray', `${(f * e * 1000).toFixed(1)} 1000`) });
    }
    if(me) me.classList.add('gm-run');
  });
  rootEl.querySelectorAll('[data-gm-count]').forEach(el => {
    const n = +el.getAttribute('data-gm-count') || 0; if(n <= 0) return;
    jobs.push({ dur: 1100, delay: 150, step: e => { el.textContent = nf(n * e); } });
  });
  if(!jobs.length) return;
  const ease = t => 1 - Math.pow(1 - t, 3);
  jobs.forEach(j => j.step(0));
  const t0 = performance.now();
  if(rootEl.__gmRaf) cancelAnimationFrame(rootEl.__gmRaf);
  const tick = now => {
    let live = false;
    for(const j of jobs){
      if(j.over) continue;
      const t = Math.max(0, Math.min(1, (now - t0 - j.delay) / j.dur));
      j.step(ease(t));
      if(t >= 1){ j.over = true; if(j.done) j.done(); } else live = true;
    }
    rootEl.__gmRaf = live && rootEl.isConnected !== false ? requestAnimationFrame(tick) : 0;
    if(!live) rootEl.querySelectorAll('.gm-run').forEach(e => e.classList.remove('gm-run'));
  };
  rootEl.__gmRaf = requestAnimationFrame(tick);
}

root.GAME = { avatarHTML, points, badges, newBadges, nextBadge, nextBadgeText, emblemHTML: emblem, raceHTML, raceMiniHTML, pointsChipHTML, badgesHTML, doneHTML, howSheetHTML, animate,
  rules, ukDay: ts => dnKey(uk(toMs(ts)).dn), ordinal: ord, initials, target: targetFor };
})(typeof self !== 'undefined' ? self : globalThis);
