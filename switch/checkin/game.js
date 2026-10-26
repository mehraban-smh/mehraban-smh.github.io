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
const ord = n => { const t = n % 100; return n + ((t >= 11 && t <= 13) ? 'th' : ({1:'st', 2:'nd', 3:'rd'}[n % 10] || 'th')); };
const nf = n => Math.round(n || 0).toLocaleString('en-GB');
const plural = (n, one, many) => n === 1 ? one : (many || one + 's');
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
  const r = { dn: Math.round(Date.UTC(y, mo - 1, d) / DAYMS), h: (+o.hour) % 24, m: +o.minute, y, mo };
  UKC.set(k, r); return r;
}
const dnKey = dn => new Date(dn * DAYMS).toISOString().slice(0, 10);
const keyDn = k => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(k || '')); return m ? Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAYMS) : null; };
const dow = dn => ((dn + 3) % 7 + 7) % 7;          // 0 = Monday ... 6 = Sunday (day 0 was a Thursday)
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const dnDate = dn => new Date(dn * DAYMS);
const shortDate = dn => { const d = dnDate(dn); return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()].slice(0, 3); };

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

/* ---------- badges ---------- */
const WALL_FEEL = new Set(['cold', 'cool', 'neutral', 'warm']);   // "I can't reach one" is not a wall answer
function badgeDefs(R){
  return [
    { id:'croeso',  name:'Croeso!',        desc:'Your first check-in. Welcome to the study.', how:'Do your first check-in.' },
    { id:'goal',    name:'Daily goal',     desc:`${R.goal} check-ins in one day.`, how:`Check in ${R.goal} times in one day.` },
    { id:'streak3', name:'Three in a row', desc:'Your daily goal three days running.', how:'Reach your daily goal three days in a row.' },
    { id:'week',    name:'Full week',      desc:'Your daily goal every day from Monday to Sunday.', how:'Reach your daily goal every day from Monday to Sunday.' },
    { id:'early',   name:'Early bird',     desc:'A check-in before 08:00.', how:'Check in before 08:00 in the morning.' },
    { id:'owl',     name:'Night owl',      desc:'A check-in after 22:00.', how:'Check in after 22:00 at night.' },
    { id:'fifty',   name:'Half century',   desc:'50 check-ins.', how:'Reach 50 check-ins.' },
    { id:'hundred', name:'Centurion',      desc:'100 check-ins.', how:'Reach 100 check-ins.' },
    { id:'days10',  name:'Rain or shine',  desc:'Check-ins on 10 different days.', how:'Check in on 10 different days.' },
    { id:'wall10',  name:'Wall watcher',   desc:'10 times you felt the outside wall.', how:'Answer the outside wall question 10 times.' }
  ];
}
/* Early bird is 04:00-07:59 and night owl 22:00-03:59 (UK time), so a check-in at 01:00 is a night owl's. */
function badges(votes, now){
  const L = ledger(votes, now), R = L.R, at = {};
  const mark = (id, t) => { if(!(id in at)) at[id] = t; };
  let n = 0, walls = 0; const seen = new Set();
  for(const r of L.rows){
    n++;
    if(n === 1) mark('croeso', r.t);
    if(n === 50) mark('fifty', r.t);
    if(n === 100) mark('hundred', r.t);
    if(!seen.has(r.u.dn)){ seen.add(r.u.dn); if(seen.size === 10) mark('days10', r.t); }
    if(WALL_FEEL.has(r.v.wall) && ++walls === 10) mark('wall10', r.t);
    if(r.u.h >= 4 && r.u.h < 8) mark('early', r.t);
    if(r.u.h >= 22 || r.u.h < 4) mark('owl', r.t);
  }
  const goals = [...L.days.values()].filter(d => d.n >= R.goal).sort((a, b) => a.dn - b.dn);
  if(goals.length) mark('goal', goals[0].goalRow.t);
  let run = 0, last = null;
  for(const d of goals){ run = (last !== null && d.dn === last + 1) ? run + 1 : 1; last = d.dn; if(run === 3) mark('streak3', d.goalRow.t); }
  const sundays = [...L.fullSundays].sort((a, b) => a - b);
  if(sundays.length) mark('week', L.days.get(sundays[0]).goalRow.t);
  return badgeDefs(R).map(b => Object.assign(b, { got: b.id in at, at: b.id in at ? new Date(at[b.id]).toISOString() : null }));
}
function newBadges(beforeVotes, afterVotes, now){
  now = toMs(now);
  const had = new Set(badges(beforeVotes, now).filter(b => b.got).map(b => b.id));
  return badges(afterVotes, now).filter(b => b.got && !had.has(b.id));
}

/* ---------- small art ---------- */
const SV = (vb, body, cls='') => `<svg class="${cls}" viewBox="${vb}" aria-hidden="true" focusable="false">${body}</svg>`;
const LP = {   // line icons in icons.js style (24 box), used when icons.js is not loaded
  chev:'<path d="M9 5l7 7-7 7"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  star:'<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
  medal:'<circle cx="12" cy="15" r="5.5"/><path d="M8.5 10.5L6 3h4l2 5 2-5h4l-2.5 7.5"/>',
  eyeoff:'<path d="M3 3l18 18"/><path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a16 16 0 0 1-2.6 3.2M6.5 7.6C4.3 9.1 3 12 3 12s4 6 9 6a8.6 8.6 0 0 0 3.6-.8"/><path d="M9.9 10a3 3 0 0 0 4.2 4.2"/>',
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

/* Badge emblems (48 box): a tinted disc, a ring and a line glyph in the badge's colour. */
const EMBLEM = {
  croeso:'<path d="M14.5 24.5L24 16l9.5 8.5V34h-19z"/><path class="gm-fill" d="M24 32.2c-3.6-2.6-5.4-4.1-5.4-6a2.6 2.6 0 0 1 5.4-1.1 2.6 2.6 0 0 1 5.4 1.1c0 1.9-1.8 3.4-5.4 6z"/>',
  goal:'<circle cx="24" cy="24" r="9.5" stroke-dasharray="12.6 2.3"/><path d="M19.6 24.4l3 3 5.8-6.4"/>',
  streak3:'<path transform="translate(7.4 18.4) scale(.7)" stroke-width="2.8" d="M12 3c.5 3.5 4.5 5 4.5 9.5a4.5 4.5 0 0 1-9 0c0-2 1-3.5 2-4.5 0 1.5 1 2.5 2 2.5.5-2-.5-4 .5-7.5z"/><path transform="translate(23.8 18.4) scale(.7)" stroke-width="2.8" d="M12 3c.5 3.5 4.5 5 4.5 9.5a4.5 4.5 0 0 1-9 0c0-2 1-3.5 2-4.5 0 1.5 1 2.5 2 2.5.5-2-.5-4 .5-7.5z"/><path class="gm-fill" transform="translate(13.2 15) scale(.9)" d="M12 3c.5 3.5 4.5 5 4.5 9.5a4.5 4.5 0 0 1-9 0c0-2 1-3.5 2-4.5 0 1.5 1 2.5 2 2.5.5-2-.5-4 .5-7.5z"/>',
  week:'<rect x="14" y="15.5" width="20" height="18" rx="3"/><path d="M14 20.5h20M19 13v4M29 13v4"/><g class="gm-fill" stroke="none"><circle cx="18" cy="24.6" r="1.5"/><circle cx="22" cy="24.6" r="1.5"/><circle cx="26" cy="24.6" r="1.5"/><circle cx="30" cy="24.6" r="1.5"/><circle cx="18" cy="29.2" r="1.5"/><circle cx="22" cy="29.2" r="1.5"/><circle cx="26" cy="29.2" r="1.5"/></g>',
  early:'<path d="M17.5 28a6.5 6.5 0 0 1 13 0"/><path d="M24 16.5v3M15.6 20l2 2M32.4 20l-2 2M12.5 28h3M32.5 28h3"/><path d="M13 32.5c2-1.3 3.7-1.3 5.5 0s3.7 1.3 5.5 0 3.7-1.3 5.5 0 3.5 1.3 5.5 0"/>',
  owl:'<path d="M16 19.5l-.5-5.5 4.4 3a10 10 0 0 1 8.2 0l4.4-3-.5 5.5c1.3 1.8 2 4 2 6.3 0 5-4.4 8.7-10 8.7s-10-3.7-10-8.7c0-2.3.7-4.5 2-6.3z"/><circle cx="20.2" cy="24" r="3"/><circle cx="27.8" cy="24" r="3"/><circle class="gm-fill" cx="20.2" cy="24" r="1.1" stroke="none"/><circle class="gm-fill" cx="27.8" cy="24" r="1.1" stroke="none"/><path d="M24 27l-1.2 1.6h2.4z"/>',
  fifty:'<text x="24" y="24.4" dy=".36em" text-anchor="middle" class="gm-etext">50</text>',
  hundred:'<text x="24" y="21.6" dy=".36em" text-anchor="middle" class="gm-etext gm-small">100</text><path d="M14.5 28.2c2 4 5.6 6.2 9.5 6.2s7.5-2.2 9.5-6.2"/><path d="M17 31.6l-2.4-.2M20.4 33.7l-1.5-1.9M27.6 33.7l1.5-1.9M31 31.6l2.4-.2"/>',
  days10:'<circle cx="20.5" cy="20.5" r="4"/><path d="M20.5 13.5v1.5M14 20.5h1.5M15.9 15.9l1.1 1.1M25.1 15.9l-1.1 1.1"/><path class="gm-bgfill" d="M20 31.5a4 4 0 0 1-.3-8 5.6 5.6 0 0 1 10.8-1.1 4.4 4.4 0 0 1 .5 9.1z"/><path d="M22 34.5l-.8 1.6M26.5 34.5l-.8 1.6"/>',
  wall10:'<path d="M13.5 15.5h21v17h-21z"/><path d="M13.5 21.2h21M13.5 26.8h21M20.5 15.5v5.7M28 15.5v5.7M17 21.2v5.6M24.5 21.2v5.6M31.5 21.2v5.6M20.5 26.8v5.7M28 26.8v5.7"/><path class="gm-bgfill" d="M24.2 35.5v-6.6a1.3 1.3 0 0 1 2.6 0v4.6-6.4a1.3 1.3 0 0 1 2.6 0v6.4-5.2a1.3 1.3 0 0 1 2.6 0v7.6c0 2.7-1.9 4.6-4.4 4.6-1.6 0-2.6-.7-3.4-1.7l-2.5-3.2a1.2 1.2 0 0 1 1.9-1.5z"/>'
};
function emblem(id, got){
  return SV('0 0 48 48', `<circle class="gm-ebg" cx="24" cy="24" r="22"/><circle class="gm-ering" cx="24" cy="24" r="20.5"/>` +
    `<g class="gm-eg" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${EMBLEM[id] || ''}</g>` +
    (got ? '' : `<g class="gm-lock"><circle cx="38" cy="38" r="7.5"/><rect x="34.6" y="37.2" width="6.8" height="5.2" rx="1.2"/><path d="M35.9 37.2v-1.6a2.1 2.1 0 0 1 4.2 0v1.6" fill="none"/></g>`),
    `gm-emb gm-e-${id}${got ? '' : ' gm-off'}`);
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
const lbox = l => { const x0 = l.a === 'end' ? l.x - l.w : l.a === 'middle' ? l.x - l.w / 2 : l.x; return [x0 - 1, l.y - 9, x0 + l.w + 1, l.y + 3]; };
BAY.solid = LABELS.filter(l => l.solid).map(lbox).concat([[BAY.LH.x - 6, BAY.LH.y - 31, BAY.LH.x + 6, BAY.LH.y + 2]]);
BAY.keep = LABELS.map(lbox).concat([[BAY.LH.x - 6, BAY.LH.y - 31, BAY.LH.x + 6, BAY.LH.y + 2]]);
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
    s += `<text class="${l.c}" x="${l.x}" y="${l.y}" text-anchor="${l.a}">${l.t}</text>`;
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
  return { rs, me, hidden: !!(me0 && me0.hidden), target, total, from:keyDn(p.from), to:keyDn(p.to), period };
}
const when = period => period === 'month' ? 'this month' : period === 'last_week' ? 'last week' : 'this week';
const periodOf = v => v === 'month' || v === 'last_week' ? v : 'week';
function names(list){
  const n = list.map(r => esc(r.alias));
  return n.length === 1 ? n[0] : n.length === 2 ? n[0] + ' and ' + n[1] : n[0] + ' and ' + (n.length - 1) + ' others';
}
/* One-sentence standing: [headline, detail]. */
function standing(M){
  if(M.period === 'last_week') return finalStanding(M);
  const w = when(M.period), me = M.me, rs = M.rs;
  if(!rs.length) return ['Nobody has set off yet', 'Your next check-in starts the race ' + w];
  if(!me) return ['Check in to join the race', `${M.total} ${plural(M.total, 'runner')} ${w}`];
  if(rs.length === 1) return ['Just you so far ' + w, me.points ? `${nf(me.points)} points and the bay to yourself` : 'Your next check-in gets you moving'];
  if(rs.every(r => r.points === 0)) return ['Everyone is still at the marina', 'Your next check-in gets you moving'];
  const level = rs.filter(r => r !== me && r.points === me.points);
  if(me.rank === 1){
    if(level.length) return ['You share the lead ' + w, 'Level with ' + names(level)];
    const next = rs.filter(r => r !== me).sort((a, b) => b.points - a.points)[0];
    return ["You're in the lead " + w, `${nf(me.points - next.points)} ${plural(me.points - next.points, 'point')} ahead of ${esc(next.alias)}`];
  }
  const ahead = rs.filter(r => r.points > me.points), gap = Math.min(...ahead.map(r => r.points)) - me.points;
  const close = ahead.filter(r => r.points === me.points + gap);
  return [`You're ${me.joint ? 'joint ' : ''}${ord(me.rank)} of ${M.total} ${w}`, `${nf(gap)} ${plural(gap, 'point')} behind ${names(close)}`];
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
    const t = it.r.alias, w = t.length * 5.3 + 4, h = 11, g = it.rad + 3;
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
  s += `<circle class="gm-dot" r="${rad}"/>`;
  if(!small) s += `<text class="gm-ini${txt.length > 2 ? ' gm-long' : ''}" dy=".36em" text-anchor="middle">${esc(txt)}</text>`;
  if(r.medal && !small && !opt.noMedal) s += `<g class="gm-tm gm-m${r.medal}" transform="translate(${(rad * .78).toFixed(1)} ${(-rad * .78).toFixed(1)})"><circle class="gm-disc" r="4.6"/><text dy=".36em" text-anchor="middle">${r.medal}</text></g>`;
  if(it.pill) s += `<g class="gm-pill" transform="translate(0 ${it.pill.dy.toFixed(1)})"><rect x="-13" y="-7" width="26" height="14" rx="7"/><text dy=".36em" text-anchor="middle">You</text></g>`;
  if(it.name) s += `<text class="gm-name" x="${it.name.ox.toFixed(1)}" y="${it.name.oy.toFixed(1)}" dy=".36em" text-anchor="${it.name.anchor}">${esc(r.alias)}</text>`;
  return `<g class="gm-tk gm-c${r.colour}${r.is_me ? ' gm-me' : ''}${small ? ' gm-sm' : ''}" data-s="${it.s.toFixed(2)}" data-dx="${it.dx.toFixed(2)}" data-dy="${it.dy.toFixed(2)}" transform="translate(${it.x.toFixed(1)} ${it.y.toFixed(1)})">${s}</g>`;
}
function baySVG(M){
  const T = BAY.T;
  let s = bayArt();
  if(M && M.rs.length){
    const lay = placeTokens(M, T, BAY.W, BAY.H, { rBig:10.5, rSmall:6.2, rects: BAY.solid, finishDir:[-0.5, -0.87] });   // finishers wait in the water left of the lighthouse
    placeLabels(lay.items, BAY.W, BAY.H, { names:true, allSolid: lay.big, keep: BAY.keep });
    const meIt = lay.items.find(it => it.r.is_me);
    if(meIt) s += `<path class="gm-trail" d="${T.d}" pathLength="1000" stroke-dasharray="${(meIt.f * 1000).toFixed(1)} 1000" data-f="${meIt.f.toFixed(4)}"/>`;
    // draw from the back of the field forwards, "you" last so it is never hidden
    lay.items.slice().sort((a, b) => (a.r.is_me - b.r.is_me) || (a.lab - b.lab) || b.r.rank - a.r.rank)
      .forEach(it => { s += tokenSVG(it, { big: lay.big }); });
  }
  const label = M && M.me ? `Swansea Bay race map. You are ${ord(M.me.rank)} of ${M.total}.` : 'Swansea Bay race map from Swansea Marina to Mumbles lighthouse.';
  return `<svg class="gm-bay" viewBox="0 0 ${BAY.W} ${BAY.H}" role="img" aria-label="${label}" data-track="bay">${s}</svg>`;
}
function stripSVG(M){
  const T = STRIP.T, end = along(T, T.L);
  let s = `<path class="gm-ssea" d="${T.d}"/><path class="gm-sroute" d="${T.d}"/>`;
  s += `<g class="gm-start" transform="translate(${T.pts[0].x} ${T.pts[0].y})"><path class="gm-pole" d="M0 0V-14"/><path class="gm-chk" d="M0 -14h8v5H0z"/><path class="gm-chk2" d="M0 -14h2v2.5H0zM4 -14h2v2.5H4zM2 -11.5h2V-9H2zM6 -11.5h2V-9H6z"/></g>`;
  const x = end.x + 12, y = end.y + 5;
  s += `<g class="gm-lh"><ellipse class="gm-islet" cx="${x}" cy="${y + 1}" rx="7" ry="3"/><path class="gm-tower" d="M${x - 3.4} ${y}L${x - 2.4} ${y - 12}H${x + 2.4}L${x + 3.4} ${y}Z"/><rect class="gm-lamp" x="${x - 2}" y="${y - 16}" width="4" height="4" rx=".8"/><path class="gm-cap" d="M${x - 3} ${y - 16}L${x} ${y - 19}L${x + 3} ${y - 16}Z"/><circle class="gm-glow" cx="${x}" cy="${y - 14}" r="4"/></g>`;
  s += `<text class="gm-slab" x="${T.pts[0].x - 8}" y="52">Marina</text><text class="gm-slab" x="${STRIP.W - 3}" y="52" text-anchor="end">Mumbles</text>`;
  if(M && M.rs.length){
    const shown = M.rs.filter(r => r.rank <= 3 || r.is_me).slice(0, 3).concat(M.rs.filter(r => r.is_me && r.rank > 3).slice(0, 1));
    const sub = Object.assign({}, M, { rs: shown });
    const lay = placeTokens(sub, T, STRIP.W, STRIP.H, { rBig:8.5, rSmall:8.5, bigUpTo:99, rects:[[14, 44, 46, 54], [278, 44, 318, 54]] });
    placeLabels(lay.items, STRIP.W, STRIP.H, { names:false, allSolid:true });
    lay.items.forEach(it => { if(it.pill) it.pill = null; });     // the list says who is who; keep the strip clean
    lay.items.slice().sort((a, b) => (a.r.is_me - b.r.is_me) || b.r.rank - a.r.rank).forEach(it => { s += tokenSVG(it, { big:true, noMedal:true }); });
  }
  return `<svg class="gm-strip" viewBox="0 0 ${STRIP.W} ${STRIP.H}" aria-hidden="true" data-track="strip">${s}</svg>`;
}
/* Last week's race is over: the final standings, in the past tense. */
function finalStanding(M){
  const me = M.me, rs = M.rs;
  if(!rs.length || rs.every(r => r.points === 0)) return ['Nobody scored last week', 'This week is a fresh start'];
  if(!me) return ['Last week\'s final standings', `${M.total} ${plural(M.total, 'runner')}`];
  if(!me.points) return ['You didn\'t score last week', 'This week is a fresh start'];
  if(me.rank === 1) return [me.joint ? 'You shared first place last week' : 'You won last week!', `${nf(me.points)} points`];
  return [`You finished ${me.joint ? 'joint ' : ''}${ord(me.rank)} of ${M.total} last week`, `${nf(me.points)} points`];
}
/* "Last week you finished 2nd with 370 points" (from last week's race), or '' when there is nothing to say */
function lastWeekLine(lw){
  if(!lw || !lw.me) return '';
  const M = model(lw, 'last_week'), me = M.me;
  if(!me || !me.points || !(me.rank > 0)) return '';
  return `Last week you finished ${me.joint ? 'joint ' : ''}${ord(me.rank)} with ${nf(me.points)} points`;
}
/* this week's race has nobody on points yet (a new week has just begun) */
const emptyWeek = (p, M) => p && periodOf(p.period) === 'week' && (!M.rs.length || M.rs.every(r => r.points === 0));

/* ---------- HTML pieces ---------- */
function seg(period){
  const b = (v, t) => `<button class="${period === v ? 'gm-on' : ''}" data-act="race-period" data-v="${v}" aria-pressed="${period === v}">${t}</button>`;
  return `<div class="gm-seg" role="group" aria-label="Race period">${b('week', 'This week')}${b('last_week', 'Last week')}${b('month', 'This month')}</div>`;
}
function rangeLine(M){
  const now = uk(Date.now()).dn;
  if(M.from === null || M.to === null) return M.period === 'month' ? 'The race runs to the end of the month' : 'The race runs Monday to Sunday';
  const a = dnDate(M.from), b = dnDate(M.to);
  const span = M.period === 'month' ? MONTHS[a.getUTCMonth()] + ' ' + a.getUTCFullYear()
    : a.getUTCMonth() === b.getUTCMonth() ? `${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS[a.getUTCMonth()]}` : `${shortDate(M.from)} – ${shortDate(M.to)}`;
  const left = M.to - now;
  const tail = M.period === 'last_week' || left < 0 ? 'Final standings' : left === 0 ? 'Last day!' : left === 1 ? 'Ends tomorrow' : `${left + 1} days to go`;
  return `${span} · ${tail}`;
}
function av(r, cls=''){ return `<span class="gm-av gm-c${r.colour}${r.is_me ? ' gm-me' : ''} ${cls}" aria-hidden="true">${esc(initials(r.alias))}</span>`; }
/* Medals only for 1st-3rd with points to their name and someone to beat; nobody ranks on zero points. */
function rankCell(r){ return r.medal ? medal(r.medal, r.joint) : `<span class="gm-rn">${r.points ? r.rank + (r.joint ? '=' : '') : '–'}</span>`; }
function rowHTML(r, M, compact){
  const bits = [];
  if(!compact && r.checkins != null) bits.push(`${r.checkins} ${plural(r.checkins, 'check-in')}`);
  if(!compact && r.goal_days != null) bits.push(`${r.goal_days} goal ${plural(r.goal_days, 'day')}`);
  const fin = M.target > 0 && r.points >= M.target ? `<span class="gm-fintag" title="Reached the lighthouse">${icon('flag')}</span>` : '';
  const tags = fin + (r.is_me ? `<span class="gm-you">You</span>${M.hidden ? `<span class="gm-hid">${icon('eyeoff')}Hidden</span>` : ''}` : '');
  return `<li class="gm-row${r.is_me ? ' gm-isme' : ''}"><span class="gm-rk">${rankCell(r)}</span>${av(r)}` +
    `<span class="gm-who"><b>${esc(r.alias)}</b>${tags}${bits.length ? `<small>${bits.join(' · ')}</small>` : ''}</span>` +
    `<span class="gm-pts"><b data-gm-count="${r.points}">${nf(r.points)}</b><small>pts</small></span></li>`;
}
function listHTML(M){
  const rs = M.rs, me = M.me, TOP = 10;
  if(rs.length <= TOP + 2) return `<ol class="gm-list">${rs.map(r => rowHTML(r, M)).join('')}</ol>`;
  const top = rs.slice(0, TOP), rest = rs.slice(TOP);
  let h = `<ol class="gm-list">${top.map(r => rowHTML(r, M)).join('')}`;
  if(me && rest.includes(me)) h += `<li class="gm-gap" aria-hidden="true"><i></i><i></i><i></i></li>` + rowHTML(me, M);
  h += `</ol><details class="gm-more"><summary>Show all ${rs.length} runners</summary><ol class="gm-list">${rest.map(r => rowHTML(r, M)).join('')}</ol></details>`;
  return h;
}
function toGo(M){
  if(!M.me || !M.target) return '';
  const left = M.target - M.me.points;
  if(M.period === 'last_week') return left <= 0 ? `<span class="gm-made">${icon('flag')}You reached Mumbles lighthouse</span>` : '';
  if(left <= 0) return `<span class="gm-made">${icon('flag')}You've reached Mumbles lighthouse</span>`;
  return `<span>${nf(left)} ${plural(left, 'point')} to the lighthouse</span>`;
}
function footHTML(M){
  if(M && M.me && M.hidden) return `<p class="gm-foot">${icon('eyeoff')}<span>You're hidden from others. Only you can see your place. <button class="gm-link" data-act="tab" data-to="settings">Change in Settings</button></span></p>`;
  const who = M && M.me ? `You race as <b>${esc(M.me.alias)}</b>, a Welsh wildlife name picked at random. ` : '';
  return `<p class="gm-foot">${icon('info')}<span>${who}Nobody in the race sees your name or your answers.</span></p>`;
}
/* opt: { period: 'week' | 'last_week' | 'month', lastWeek: last week's race payload (for the note on an empty week),
 *        loading: true while the phone is online (no race yet means it is still on its way, not "offline") } */
function raceHTML(payload, opt){
  opt = opt || {};
  const period = periodOf(opt.period || (payload && payload.period));
  const head = `<header class="gm-head"><div class="gm-eyebrow">The Bay Race</div><h1 class="gm-h1">Marina to Mumbles</h1>`;
  const btns = `<div class="gm-btns"><button class="gm-btn" data-act="race-how">${icon('info')}How points work</button><button class="gm-btn" data-act="badges">${icon('medal')}My badges</button></div>`;
  if(!payload) return `<div class="gm-race gm-off">${head}<p class="gm-sub">Swansea Marina to Mumbles lighthouse</p></header>${seg(period)}
    <section class="gm-card gm-map">${baySVG(null)}<div class="gm-veil"><div>${opt.loading ? `${icon('refresh')}<b>Loading the race&hellip;</b><span>It appears here in a moment. Your check-ins count either way.</span>`
      : `${icon('wifi')}<b>The race is offline</b><span>It appears when your phone is online. Your check-ins still count and are sent when you're back.</span>`}</div></div></section>${btns}</div>`;
  const M = model(payload, period), [h1, h2] = standing(M);
  const me = M.me;
  const sum = `<div class="gm-sum">` +
    (me ? `<div class="gm-mine"><b data-gm-count="${me.points}">${nf(me.points)}</b><span>points ${when(period)}</span></div>` : '') +
    `<div class="gm-say"><b>${h1}</b><span>${h2}</span>${me && M.rs.length > 1 && !M.rs.every(r => r.points === 0) ? toGo(M) : ''}</div></div>`;
  const lwl = emptyWeek(payload, M) ? lastWeekLine(opt.lastWeek) : '';
  const fresh = emptyWeek(payload, M) ? `<section class="gm-card gm-new">${icon('flag')}<div><b>A new race started on Monday</b><span>${lwl ? lwl + '.' : 'Everyone starts again at Swansea Marina.'}</span>
      <button class="gm-link" data-act="race-period" data-v="last_week">See last week&rsquo;s final standings</button></div></section>` : '';
  return `<div class="gm-race" data-period="${period}">${head}<p class="gm-sub">${rangeLine(M)}</p></header>${seg(period)}${fresh}
    <section class="gm-card gm-map">${baySVG(M)}${sum}</section>
    ${M.rs.length ? `<section class="gm-card gm-board"><div class="gm-cap"><span>Standings</span><small>${M.total} ${plural(M.total, 'runner')} · finish at ${nf(M.target)}</small></div>${listHTML(M)}</section>` : ''}
    ${btns}${footHTML(M)}</div>`;
}
function raceMiniHTML(payload, opt){
  opt = opt || {};
  const head = (sub) => `<div class="gm-mhead"><span class="gm-eyebrow">The Bay Race${sub ? ' · ' + sub : ''}</span><span class="gm-go">Race ${icon('chev')}</span></div>`;
  if(!payload) return `<button class="gm-mini gm-off" data-act="tab" data-to="race">${head('')}${stripSVG(null)}<span class="gm-mline">${opt.loading ? `${icon('refresh')}Loading the race&hellip;` : `${icon('wifi')}The race shows here when you're online`}</span></button>`;
  const period = periodOf(payload.period);
  const M = model(payload, period), [h1, h2] = standing(M);
  if(emptyWeek(payload, M)){
    const lwl = lastWeekLine(opt.lastWeek);
    return `<button class="gm-mini gm-fresh" data-act="race-period" data-v="last_week" aria-label="A new race started on Monday.${lwl ? ' ' + lwl + '.' : ''} See last week's final standings.">${head(when(period))}${stripSVG(M)}` +
      `<span class="gm-mline"><b>A new race started on Monday</b><span>${lwl ? lwl + ' &middot; see the final standings' : 'Your next check-in gets you moving'}</span></span></button>`;
  }
  const shown = M.rs.filter(r => (r.medal || (r.rank <= 3 && M.rs.length > 1)) && r !== M.me).slice(0, 3);
  const rows = shown.concat(M.me ? [M.me] : []).sort((a, b) => a.rank - b.rank || (a.is_me ? 1 : -1));
  return `<button class="gm-mini" data-act="tab" data-to="race" aria-label="The Bay Race: ${h1}. Open the race.">${head(when(period))}${stripSVG(M)}` +
    (rows.length ? `<ol class="gm-mlist">${rows.map(r => `<li class="${r.is_me ? 'gm-isme' : ''}"><span class="gm-rk">${rankCell(r)}</span>${av(r, 'gm-small')}<span class="gm-who"><b>${esc(r.alias)}</b>${r.is_me ? '<span class="gm-you">You</span>' : ''}</span><span class="gm-pts"><b>${nf(r.points)}</b><small>pts</small></span></li>`).join('')}</ol>` : '') +
    `<span class="gm-mline"><b>${h1}</b><span>${h2}</span></span></button>`;
}
/* All-time points (a new week never shows "0 points" to someone who has points), and this week's place in the race
 * only while this week has points to rank on. */
function pointsChipHTML(points, me){
  const o = points && typeof points === 'object' ? points : null;
  const n = typeof points === 'number' ? points : o ? num(o.all_time, 0) : 0, week = o ? num(o.week, 0) : n;
  const rank = week > 0 && me && num(+me.rank, 0) > 0 ? +me.rank : 0;     // nobody ranks on zero points
  return `<button class="gm-chip" data-act="tab" data-to="race" aria-label="${nf(n)} ${plural(n, 'point')} in all${rank ? ', ' + ord(rank) + ' in the Bay Race this week' : ''}">${icon('star')}<b>${nf(n)}</b>${plural(n, 'point')}${rank ? `<i>·</i>${ord(rank)} this week` : ''}</button>`;
}
function badgesHTML(list){
  list = Array.isArray(list) ? list : [];
  const got = list.filter(b => b.got).length;
  const fd = iso => { const d = uk(Date.parse(iso)); return `Earned ${new Date(d.dn * DAYMS).getUTCDate()} ${MONTHS[d.mo - 1].slice(0, 3)}`; };
  return `<div class="gm-badges"><div class="gm-bhead"><span><b>${got}</b> of ${list.length} badges</span><span class="gm-bar"><i style="width:${list.length ? Math.round(got / list.length * 100) : 0}%"></i></span></div>
    <ul class="gm-bgrid">${list.map(b => `<li class="gm-badge${b.got ? ' gm-got' : ''}">${emblem(b.id, b.got)}<b>${esc(b.name)}</b><span>${esc(b.got ? b.desc : b.how)}</span>${b.got && b.at ? `<small>${fd(b.at)}</small>` : ''}</li>`).join('')}</ul>
    <p class="gm-foot">${icon('info')}<span>Badges are just for you. Nobody else sees them.</span></p></div>`;
}
function doneHTML(o){
  o = o || {};
  const R = rules(), b = o.before || {}, a = o.after || {};
  const size = s => s && typeof s.size === 'number' ? s.size : 0;
  const dc = num(a.counted, 0) - num(b.counted, 0), dg = size(a.goalDays) - size(b.goalDays), dw = size(a.fullWeeks) - size(b.fullWeeks);
  let i = 0;
  const gain = (n, what, why, cls='') => `<li class="gm-gain ${cls}" style="--i:${i++}"><b>+${nf(n)}</b><span><strong>${what}</strong>${why ? `<small>${why}</small>` : ''}</span></li>`;
  let lines = '';
  if(dc > 0) lines += gain(R.checkin * dc, plural(R.checkin * dc, 'point'), dc > 1 ? `for ${dc} check-ins` : 'for this check-in');
  if(dg > 0) lines += gain(R.goalDay * dg, 'daily goal bonus', `${R.goal} check-ins today`, 'gm-bonus');
  if(dw > 0) lines += gain(R.fullWeek * dw, 'full week bonus', 'your goal every day this week', 'gm-bonus gm-big');
  if(dc <= 0 && (o.before || o.after)){
    const why = num(a.todayCount, 0) >= R.dailyCap ? `You've had today's ${R.dailyCap} counted check-ins.` : `Check-ins add points when they're at least ${R.gapMin} minutes apart.`;
    lines += `<li class="gm-gain gm-none" style="--i:${i++}"><b>+0</b><span><strong>${why}</strong><small>Every answer still helps the study.</small></span></li>`;
  }
  let h = lines ? `<ul class="gm-gains">${lines}</ul>` : '';
  if(o.after && typeof a.week === 'number') h += `<p class="gm-total" style="--i:${i++}">${nf(a.week)} points this week${a.streak > 1 ? ` · ${a.streak}-day goal streak` : ''}</p>`;
  (Array.isArray(o.newBadges) ? o.newBadges : []).forEach(nb => {
    h += `<button class="gm-newb" data-act="badges" style="--i:${i++}">${emblem(nb.id, true)}<span><small>New badge</small><b>${esc(nb.name)}</b><span>${esc(nb.desc)}</span></span>${icon('chev', 'gm-chev')}</button>`;
  });
  const rb = num(+o.rankBefore, 0), ra = num(+o.rankAfter, 0);
  let move = '';
  if(ra && rb && ra < rb) move = ra === 1 ? 'You took the lead in the Bay Race' : `You moved up to ${ord(ra)} in the Bay Race`;
  else if(ra && !rb) move = `You're ${ord(ra)} in the Bay Race this week`;
  if(move) h += `<button class="gm-move" data-act="tab" data-to="race" style="--i:${i++}">${medalOrIcon(ra)}<span>${move}</span>${icon('chev', 'gm-chev')}</button>`;
  return h ? `<div class="gm-done">${h}</div>` : '';
}
const medalOrIcon = r => r >= 1 && r <= 3 ? medal(r) : `<span class="gm-moveic">${icon('star')}</span>`;
function howSheetHTML(){
  const R = rules(), perDay = R.goal * R.checkin + R.goalDay, week = 7 * perDay + R.fullWeek;
  const row = (n, t, d) => `<li><span class="gm-hn">+${n}</span><div><b>${t}</b><span>${d}</span></div></li>`;
  return `<div class="gm-how">
    <ul class="gm-hrows">
      ${row(R.checkin, 'Every check-in', `A check-in counts when it is at least ${R.gapMin} minutes after your last one. Up to ${R.dailyCap} a day count.`)}
      ${row(R.goalDay, 'Daily goal', `Reach ${R.goal} check-ins in a day. Days run from midnight to midnight, UK time.`)}
      ${row(R.fullWeek, 'Full week', 'Reach your daily goal on all seven days, Monday to Sunday.')}
    </ul>
    <div class="gm-hsec"><b>The Bay Race</b><p>Everyone in the study races along the bay from Swansea Marina to Mumbles lighthouse. Your daily goal every day takes you to the lighthouse by Sunday: that is ${nf(week)} points. A new week starts every Monday and a new month on the 1st.</p></div>
    <div class="gm-hsec"><b>Your name stays private</b><p>In the race you appear as a Welsh wildlife name picked at random, like Puffin or Grey Seal. Nobody else sees your name, your code or your answers. You can hide from the race in <button class="gm-link" data-act="tab" data-to="settings">Settings</button>.</p></div>
    <div class="gm-hsec"><b>Badges</b><p>Badges are small milestones, like your first check-in or a week of daily goals. They are just for you.</p></div>
    <p class="gm-foot">${icon('info')}<span>Every check-in helps the study, even one that adds no points.</span></p>
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

root.GAME = { points, badges, newBadges, raceHTML, raceMiniHTML, pointsChipHTML, badgesHTML, doneHTML, howSheetHTML, animate,
  rules, ukDay: ts => dnKey(uk(toMs(ts)).dn), ordinal: ord, initials, target: targetFor };
})(typeof self !== 'undefined' ? self : globalThis);
