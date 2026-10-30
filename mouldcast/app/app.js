/* MouldCast - the resident app. HomePulse's look and idioms (one phone-sized surface, tabs, bottom sheets, toasts,
 * every screen drawn by SCREENS[...]() into #screen, clicks routed by data-act) on the digital twin of the demo home
 * (../twin.js). Four tabs: Home (the home's mould risk, the warning, the rooms), Ask (questions answered from the
 * twin's data), Photos (the weekly photo check of every monitored surface, reports to the landlord) and More (the
 * home, how it works, privacy, the demo). A room and a surface open as screens over the tabs; the photo check and
 * the report are short flows. Photos and reports stay in this browser (mc_ keys); the housing team view reads them. */
'use strict';
function esc0(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
const CFG = self.MC_CONFIG || {};
const APP = esc0(CFG.appName || 'MouldCast');
const MAIL = esc0(CFG.team || 'info@mehraban.uk');
const TEAM = `<a href="mailto:${MAIL}">${MAIL}</a>`;
const HOUR = TWIN.HOUR;
const PHOTOS_KEY = 'mc_photos';                             // [{ id, home, surface, ts, obs, signs, note, img }]: this browser's photo checks
const REPORTS_KEY = 'mc_reports';                           // [{ id, home, ts, type, room, surface, emergency, note, img, status }]
const TRY_KEY = 'mc_trying';                                // ['<surface>:<driver>']: tips the resident said they will try
const SEEN_KEY = 'mc_seen';                                 // '1' once the welcome screen has been passed
const ALERTS_KEY = 'mc_alerts';                             // { risk, photo }: the two alert switches (demo only)
const CHAT_KEY = 'mc_chat';                                 // sessionStorage: the Ask conversation of this visit
const pad = n => String(n).padStart(2, '0');
const fmt = d => pad(d.getHours()) + ':' + pad(d.getMinutes());   // 24-hour clock everywhere
const dayKey = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const LS = { get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }, set(k, v){ try{ localStorage.setItem(k, v); return true; }catch(e){ return false; } }, del(k){ try{ localStorage.removeItem(k); }catch(e){} } };
const SS = { get(k){ try{ return sessionStorage.getItem(k); }catch(e){ return null; } }, set(k, v){ try{ sessionStorage.setItem(k, v); }catch(e){} }, del(k){ try{ sessionStorage.removeItem(k); }catch(e){} } };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readList = k => { try{ const v = JSON.parse(LS.get(k) || '[]'); return Array.isArray(v) ? v : []; }catch(e){ return []; } };
const readObj = k => { try{ const v = JSON.parse(LS.get(k) || 'null'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }catch(e){ return {}; } };
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ---------- the twin ---------- */
let TW = TWIN.get(TWIN.DEMO_ID);                            // rebuilt when the hour turns (see the clock at the end)
const HOME = TW.home;
const LV = TWIN.LEVELS;
const lvChip = (l, extra='') => `<span class="lvchip ${LV[l].cls}"><i aria-hidden="true"></i>${LV[l].n}${extra}</span>`;
const ix = v => (Math.round(v * 100) / 100).toFixed(2);  // the mould index, two decimals so 2.97 never reads as 3
const deg = v => (Math.round(v * 10) / 10).toFixed(1) + '&nbsp;°C';
const pct = v => Math.round(v) + '%';
function hrs(v){ const r = Math.round(v * 2) / 2; return (r % 1 ? r.toFixed(1) : r.toFixed(0)) + (r === 1 ? ' hour' : ' hours'); }
const hShort = v => (v < 9.95 ? (Math.round(v * 10) / 10).toFixed(1) : Math.round(v)) + '&nbsp;h';
const shortDate = d => `${DAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
const longDate = d => `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`;
function dayTitle(d){
  const now = new Date(TW.now), k = dayKey(d), rel = n => { const x = new Date(now); x.setDate(x.getDate() + n); return dayKey(x); };
  return k === rel(0) ? 'Today' : k === rel(-1) ? 'Yesterday' : k === rel(1) ? 'Tomorrow' : shortDate(d);
}
const whenWord = ts => { const d = new Date(ts); return `${dayTitle(d)}, ${fmt(d)}`; };
/* "later today", "tomorrow", "by Sunday": when the forecast reaches a value, h hours from now */
function aheadWord(h){
  const now = new Date(TW.now), d = new Date(TW.now + h * HOUR), tm = new Date(now); tm.setDate(tm.getDate() + 1);
  return dayKey(d) === dayKey(now) ? 'later today' : dayKey(d) === dayKey(tm) ? 'tomorrow' : 'by ' + DAYS[d.getDay()];
}
const daysWord = h => { const d = Math.round(h / 24); return h < 18 ? 'less than a day' : d <= 1 ? 'about a day' : `about ${d} days`; };
function greeting(){ const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
function weekStart(){ const d = new Date(TW.now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; }
const roomName = rid => { const r = TW.room(rid); return r ? r.def.name : 'Somewhere else'; };
const ROOM_ART = { bed1:['mc:bed','damp:bedroom'], bed2:['mc:bed','damp:bedroom'], living:['mc:living','damp:living'], kitchen:['mc:kitchen','damp:kitchen'], bath:['mc:bath','damp:bathroom'] };
const roomArt = (r, cls='') => art(ROOM_ART[r.id][r.level >= 2 ? 1 : 0], cls);
const DRV_IC = { heat:'radiator', moist:'drop', vent:'windowOpen', furn:'sofa', fabric:'wall', fan:'fan', weather:'cloud' };
const WHO = { home:'at home', landlord:'building', weather:'weather' };
/* how many hours a day a driver adds to the time the surface is damp enough for mould, next week */
const withWet = s => s.drivers.map(d => Object.assign({}, d, { wetEff: Math.max(0, s.wetFcAvg - d.wet) }))
  .filter(d => d.wetEff >= .3 || d.eff >= .02).sort((a, b) => b.wetEff - a.wetEff || b.eff - a.eff);

/* ---------- photos and reports ---------- */
const OBS = {
  none:  { n:'Nothing visible',   s:'Clean, or just dust',      art:'cover:none' },
  spots: { n:'A few small spots', s:'Less than a tenth of it',  art:'cover:spots' },
  patch: { n:'A patch of mould',  s:'Up to half of it',         art:'cover:patch' },
  large: { n:'Mostly covered',    s:'More than half of it',     art:'cover:large' }
};
const SIGNS = [['condensation','drop','Water droplets or condensation'], ['stain','wall','A damp patch or stain'], ['peeling','edit','Peeling paint or wallpaper'],
  ['smell','leaf','A musty smell'], ['leak','bath','Water leaking or dripping']];
const PROBLEMS = { mould:['Mould you can see','Black, green or grey spots'], damp:['A damp patch','A wet or stained area'], leak:['A leak','Water coming in or dripping'],
  condensation:['Condensation','Wet windows or walls every day'], smell:['A musty smell','Even where it looks dry'], other:['Something else','Tell us in your own words'] };
/* The weekly checks from earlier weeks (twin.js keeps the demo's record) and two made this Monday, then this browser's own. */
function seededPhotos(){
  const out = TWIN.observations(TW).filter(o => o.kind === 'photo').map(o => ({ id:o.id, home:o.home, surface:o.surface, ts:o.ts, obs:o.obs, signs:[], note:'', img:null, seeded:true }));
  const mon = weekStart();
  [['living-window', ['condensation']], ['kitchen-wall', []]].forEach(([sid, signs], k) => {
    const t = new Date(mon); t.setHours(18, 10 + 6 * k, 0, 0);
    if(t.getTime() <= TW.now) out.push({ id:'week:' + sid, home:TW.id, surface:sid, ts:t.getTime(), obs:'none', signs, note:'', img:null, seeded:true });
  });
  return out;
}
const myPhotos = () => readList(PHOTOS_KEY).filter(p => p && p.home === TW.id && OBS[p.obs] && TW.surface(p.surface));
const allPhotos = () => seededPhotos().concat(myPhotos()).sort((a, b) => b.ts - a.ts);
const myReports = () => readList(REPORTS_KEY).filter(r => r && r.home === TW.id && PROBLEMS[r.type]).sort((a, b) => b.ts - a.ts);
const predAt = (sid, ts) => { const s = TW.surface(sid); if(!s) return null; const i = Math.max(0, Math.min(TW.N - 1, Math.round((ts - TW.t0) / HOUR))); return s.series.M[i]; };
function doneThisWeek(){
  const from = weekStart().getTime(), done = {};
  allPhotos().forEach(p => { if(p.ts >= from && !done[p.surface]) done[p.surface] = p; });
  return done;
}
const lastPhotoOf = sid => allPhotos().find(p => p.surface === sid) || null;
const trying = () => { const v = readList(TRY_KEY); return new Set(v.filter(x => typeof x === 'string')); };

/* ---------- small pictures and charts ---------- */
function ring(size, stroke, value, cls, center, label){
  const c = size / 2, r = c - stroke / 2, C = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value));
  return `<div class="ring" style="width:${size}px;height:${size}px" role="img" aria-label="${label}"><svg viewBox="0 0 ${size} ${size}" aria-hidden="true" focusable="false">` +
    `<circle class="rg-track" cx="${c}" cy="${c}" r="${r.toFixed(1)}" stroke-width="${stroke}"/>` +
    (v > 0 ? `<circle class="rg-fill ${cls}" cx="${c}" cy="${c}" r="${r.toFixed(1)}" stroke-width="${stroke}" stroke-dasharray="${(C * v).toFixed(2)} ${C.toFixed(2)}" transform="rotate(-90 ${c} ${c})"/>` : '') +
    `</svg><div class="rg-c">${center}</div></div>`;
}
/* the index on a half dial: four bands (low, watch, high, act now), the needle now, a ring where it will be in 7 days */
function gauge(M, M7){
  const cx = 60, cy = 66, r = 46, ang = v => Math.PI * (1 - Math.min(6, Math.max(0, v)) / 6);
  const pt = (v, rr) => [cx + rr * Math.cos(ang(v)), cy - rr * Math.sin(ang(v))];
  const arc = (a, b) => { const p = pt(a, r), q = pt(b, r); return `M${p[0].toFixed(1)} ${p[1].toFixed(1)}A${r} ${r} 0 0 1 ${q[0].toFixed(1)} ${q[1].toFixed(1)}`; };
  const segs = [[0, 1, 'var(--c0)'], [1, 2, 'var(--c1)'], [2, 3, 'var(--c2)'], [3, 6, 'var(--c3)']]
    .map(([a, b, col]) => `<path d="${arc(a + .03, b - .03)}" stroke="${col}" stroke-width="10" fill="none"/>`).join('');
  const n = pt(M, r - 15), f = pt(M7, r), l = v => { const p = pt(v, r + 15); return `<text x="${p[0].toFixed(1)}" y="${(p[1] + 3).toFixed(1)}">${v}</text>`; };
  return `<svg class="gauge" viewBox="-9 0 138 76" role="img" aria-label="Mould index ${ix(M)} of 6 now, ${ix(M7)} expected in 7 days">${segs}` +
    `<circle cx="${f[0].toFixed(1)}" cy="${f[1].toFixed(1)}" r="5.5" class="g-fc"/>` +
    `<path d="M${cx} ${cy}L${n[0].toFixed(1)} ${n[1].toFixed(1)}" class="g-needle"/><circle cx="${cx}" cy="${cy}" r="4.5" class="g-hub"/>${l(0)}${l(3)}${l(6)}</svg>`;
}
/* The index over the last four weeks and the coming week: the record (solid), the forecast (dashed) inside its range,
 * a line at 3 (visible mould) and "now". The scale zooms to the values, keeping 3 in view when it is close. */
function indexChart(s){
  const W = 340, H = 176, L = 30, R = 8, Tp = 10, B = 22, M = s.series.M, i0 = TW.NP - 28 * 24, i1 = TW.N - 1;
  let lo = Infinity, hi = -Infinity;
  for(let i = i0; i <= i1; i++){ lo = Math.min(lo, M[i]); hi = Math.max(hi, M[i]); }
  for(let j = 0; j <= TW.NF; j++){ lo = Math.min(lo, s.lo[j]); hi = Math.max(hi, s.hi[j]); }
  let y0 = Math.max(0, Math.floor((lo - .2) * 4) / 4), y1 = Math.min(6, Math.ceil((hi + .2) * 4) / 4);
  if(y1 < 3.25 && hi > 2) y1 = 3.25;
  if(y0 > 2.75 && lo < 4) y0 = 2.75;
  if(y1 - y0 < 1){ y1 = Math.min(6, y0 + 1); y0 = Math.max(0, y1 - 1); }
  const x = i => L + (i - i0) / (i1 - i0) * (W - L - R), y = v => Tp + (y1 - v) / (y1 - y0) * (H - Tp - B);
  const step = y1 - y0 <= 1.5 ? .25 : y1 - y0 <= 3 ? .5 : 1;
  let g = '';
  for(let v = Math.ceil(y0 / step) * step; v <= y1 + 1e-9; v += step) g += `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="ch-grid"/><text x="${L - 5}" y="${(y(v) + 3.5).toFixed(1)}" class="ch-yl">${step < .5 ? v.toFixed(2) : v.toFixed(step < 1 ? 1 : 0)}</text>`;
  const vis = y1 > 3 ? `<rect x="${L}" y="${Tp}" width="${W - L - R}" height="${Math.max(0, y(Math.max(3, y0)) - Tp).toFixed(1)}" class="ch-vis"/>` +
    (y0 <= 3 ? `<line x1="${L}" x2="${W - R}" y1="${y(3).toFixed(1)}" y2="${y(3).toFixed(1)}" class="ch-3"/><text x="${W - R - 2}" y="${(y(3) - 4).toFixed(1)}" class="ch-3t">visible mould</text>` : '') : '';
  const line = (a, b, get) => { let d = ''; for(let i = a; i <= b; i += 2) d += (d ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(get(i)).toFixed(1); return d; };
  let band = '';
  for(let i = TW.NP; i <= i1; i += 2) band += (band ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(s.hi[i - TW.NP]).toFixed(1);
  for(let i = i1; i >= TW.NP; i -= 2) band += 'L' + x(i).toFixed(1) + ' ' + y(s.lo[i - TW.NP]).toFixed(1);
  band += 'Z';
  let xt = '';
  for(let k = 4; k >= 1; k--){ const i = TW.NP - k * 7 * 24, d = new Date(TW.t(i)); xt += `<text x="${x(i).toFixed(1)}" y="${H - 6}" class="ch-xl">${d.getDate()} ${MONTHS[d.getMonth()]}</text>`; }
  const end = new Date(TW.t(i1));
  xt += `<text x="${x(TW.NP).toFixed(1)}" y="${H - 6}" class="ch-xl now">Now</text><text x="${(W - R).toFixed(1)}" y="${H - 6}" class="ch-xl end">${end.getDate()} ${MONTHS[end.getMonth()]}</text>`;
  const label = `Mould index from ${ix(M[i0])} four weeks ago to ${ix(s.Mnow)} now, forecast ${ix(s.M7)} in 7 days (range ${ix(s.lo7)} to ${ix(s.hi7)})`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">${vis}${g}` +
    `<line x1="${x(TW.NP).toFixed(1)}" x2="${x(TW.NP).toFixed(1)}" y1="${Tp}" y2="${H - B}" class="ch-now"/>` +
    `<path d="${band}" class="ch-band"/><path d="${line(i0, TW.NP, i => M[i])}" class="ch-past"/><path d="${line(TW.NP, i1, i => M[i])}" class="ch-fc"/>` +
    `<circle cx="${x(TW.NP).toFixed(1)}" cy="${y(s.Mnow).toFixed(1)}" r="3.5" class="ch-dot"/>${xt}</svg>`;
}
/* a small line of the last 14 days and the coming week, for the surface rows */
function spark(s){
  const W = 76, H = 26, M = s.series.M, i0 = TW.NP - 14 * 24, i1 = TW.N - 1;
  let lo = Infinity, hi = -Infinity; for(let i = i0; i <= i1; i++){ lo = Math.min(lo, M[i]); hi = Math.max(hi, M[i]); }
  const mid = (lo + hi) / 2, span = Math.max(.4, hi - lo);
  const x = i => 1 + (i - i0) / (i1 - i0) * (W - 2), y = v => H / 2 - (v - mid) / span * (H - 6);
  const line = (a, b) => { let d = ''; for(let i = a; i <= b; i += 6) d += (d ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(M[i]).toFixed(1); return d; };
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false"><path d="${line(i0, TW.NP)}" class="sp-past"/><path d="${line(TW.NP, i1)}" class="sp-fc"/><circle cx="${x(TW.NP).toFixed(1)}" cy="${y(M[TW.NP]).toFixed(1)}" r="2.2" class="sp-dot"/></svg>`;
}
/* hours a day above the mould limit: last 7 days and the coming 7, as bars */
function wetBars(s){
  const now = new Date(TW.now), cols = [], days = [];
  s.wetPast.forEach((h, k) => { const d = new Date(now); d.setDate(d.getDate() - 7 + k); cols.push([h, d, false]); });
  s.wetFc.forEach((h, k) => { const d = new Date(now); d.setDate(d.getDate() + k); cols.push([h, d, true]); });
  const bars = cols.map(([h, d, fc]) => `<div class="col${fc ? ' fc' : ''}" title="${shortDate(d)}: ${hrs(h)}${fc ? ' (forecast)' : ''}"><span class="n">${Math.round(h) || ''}</span><i class="b ${h ? '' : 'zero'}" style="${h ? `height:${Math.max(3, Math.round(h / 24 * 40))}px` : ''}"></i></div>`).join('');
  return `<div class="bars wet" role="img" aria-label="Hours a day damp enough for mould: last 7 days ${s.wetPast.join(', ')}; next 7 days ${s.wetFc.join(', ')}">${bars}</div>` +
    `<div class="axis ends"><span>Last 7 days</span><span class="td">Next 7 days</span></div>`;
}
/* temperature and humidity of a room over the last 7 days */
function roomCharts(r){
  const one = (arr, cap, unit, cls) => {
    const W = 150, H = 44, i0 = TW.NP - 7 * 24; let lo = Infinity, hi = -Infinity, sum = 0;
    for(let i = i0; i <= TW.NP; i++){ lo = Math.min(lo, arr[i]); hi = Math.max(hi, arr[i]); sum += arr[i]; }
    const span = Math.max(1, hi - lo), x = i => (i - i0) / (TW.NP - i0) * W, y = v => 3 + (hi - v) / span * (H - 6);
    let d = ''; for(let i = i0; i <= TW.NP; i += 2) d += (d ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(arr[i]).toFixed(1);
    const f = v => unit === '°C' ? (Math.round(v * 10) / 10).toFixed(1) : Math.round(v);
    return `<div class="vc"><div class="cap">${cap}<small>${f(lo)}–${f(hi)} ${unit}</small></div><svg class="mini ${cls}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${cap} over the last 7 days, from ${f(lo)} to ${f(hi)} ${unit}, average ${f(sum / (TW.NP - i0 + 1))}"><path d="${d}"/></svg><div class="axis ends"><span>7 days ago</span><span class="td">Now</span></div></div>`;
  };
  return `<div class="viz">${one(r.series.Ti, 'Temperature', '°C', 'mt')}${one(r.series.RHi, 'Humidity', '%', 'mh')}</div>`;
}

/* ---------- the shared pieces of the screens ---------- */
const head = (eyebrow, title, sub='') => `<div class="q tab-head"><div class="eyebrow">${eyebrow}</div><h1 tabindex="-1">${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>`;
const brand = () => `<div class="brand"><span class="mark">${ic('brand')}</span><span><b>${APP}</b><small>${esc0(CFG.project || '')}</small></span></div>`;
const gone = () => `${head('', 'Not found')}<p class="sub">This page is no longer here.</p><div class="actions"><button class="btn primary" data-act="back">${ic('back')}Back</button></div>`;
const demoPill = '<span class="pill demo">Demo data</span>';
const sensorWord = sf => sf.sensor ? `Surface sensor ${esc(sf.sensor)}` : 'Estimated by the twin';
function roomRow(r){
  const w = r.worst, n = r.surfaces.length;
  return `<button class="row room-row ${LV[r.level].cls}" data-act="room" data-id="${r.id}">
    <span class="orb">${ic(r.def.icon)}</span>
    <div><b>${esc(r.def.name)}</b><span>${n} ${n === 1 ? 'surface' : 'surfaces'} &middot; ${deg(r.Ti)} &middot; ${pct(r.RHi)}</span></div>
    <span class="rr-end">${lvChip(r.level)}${w ? `<small>${ix(w.Mnow)} → ${ix(w.M7)}</small>` : ''}</span>${ic('chev', 'go')}</button>`;
}
function surfRow(s){
  return `<button class="row surf-row ${LV[s.level].cls}" data-act="surface" data-id="${s.id}">
    <div class="sr-t"><b>${esc(s.def.name)}</b><span>${sensorWord(s.def)}</span></div>${lvChip(s.level)}
    <div class="sr-b">${spark(s)}<span class="sr-n">now <b>${ix(s.Mnow)}</b> &middot; in 7 days <b>${ix(s.M7)}</b></span></div>${ic('chev', 'go')}</button>`;
}
/* the warning on Home: the surface most at risk, when it is High or worse */
function alertCard(){
  const s = TW.surfaces.slice().sort((a, b) => b.M7 - a.M7)[0];
  if(!s || s.level < 2) return `<div class="msg ok">${ic('checkc')}<div><b>No mould expected this week.</b> Every monitored surface stays low.</div></div>`;
  const room = esc(s.room.name.toLowerCase()), surf = esc(s.def.name.toLowerCase());
  const [t, sub] = s.Mnow >= 3 ? [`Mould is probably visible in the ${room}`, `The ${surf} is at index ${ix(s.Mnow)}. Please take a photo and report it to your landlord.`]
    : s.cross3 !== null ? [`Visible mould likely ${aheadWord(s.cross3)} in the ${room}`, `The ${surf} could reach index 3 in ${daysWord(s.cross3)}. There is still time to slow it.`]
    : [`Mould is starting in the ${room}`, `Growth on the ${surf} is likely but not yet visible. See what may help.`];
  return `<button class="alert ${LV[s.level].cls}" data-act="surface" data-id="${s.id}"><span class="al-ic">${ic('alert')}</span><span class="al-t"><b>${t}</b><span>${sub}</span></span>${ic('chev', 'go')}</button>`;
}
/* Home's summary: the highest index expected in a week on a ring, the counts, the coming seven days */
function riskCard(){
  const w = TW.worst, c = TW.counts, lv = LV[w.level];
  const parts = [[3, 'to act on'], [2, 'high'], [1, 'to watch'], [0, 'low']].filter(([l]) => c[l]).map(([l, word]) => `<span class="cnt ${LV[l].cls}"><i aria-hidden="true"></i><b>${c[l]}</b> ${word}</span>`).join('');
  const rg = ring(104, 10, w.M7 / 6, lv.cls, `<b>${ix(w.M7)}</b><span>of 6</span>`, `Highest mould index expected in 7 days: ${ix(w.M7)} of 6, ${lv.n}`);
  let days = '';
  const now = new Date(TW.now);
  for(let k = 1; k <= 7; k++){
    const i = Math.min(TW.N - 1, TW.NP + 24 * k), d = new Date(now); d.setDate(d.getDate() + k);
    const top = Math.max(...TW.surfaces.map(s => s.series.M[i])), l = TWIN.levelOf(top);
    days += `<div class="wd" title="${shortDate(d)}: highest index ${ix(top)}, ${LV[l].n}"><span class="dn">${DAYS[d.getDay()][0]}</span><span class="dd ${LV[l].cls}" aria-hidden="true"></span><span class="dc">${ix(top)}</span></div>`;
  }
  return `<section class="riskcard" aria-label="Your home this week">
    <div class="goal-top">${rg}<div class="goal-leg">
      <div class="gl"><span><b>Highest index next week: ${lv.n}</b><span>${esc(w.room.name)} &middot; ${esc(w.def.name.toLowerCase())}</span></span></div>
      <div class="cnts">${parts}</div>
      <button class="btn-link sm" data-act="sheet-levels">What the colours mean</button>
    </div></div>
    <div class="week"><div class="wk-head"><span class="eyebrow">Next 7 days</span><span>highest index each day</span></div><div class="wk-days">${days}</div></div></section>`;
}
function nowStats(){
  let t = 0, h = 0, v = 0; TW.rooms.forEach(r => { t += r.Ti * r.def.V; h += r.RHi * r.def.V; v += r.def.V; });
  return `<div class="stats"><div class="stat"><b>${deg(t / v)}</b><span>inside now</span></div><div class="stat"><b>${pct(h / v)}</b><span>humidity inside</span></div><div class="stat"><b>${deg(TW.Te[TW.NP])}</b><span>outside</span></div></div>`;
}
const sync = () => `<p class="foot"><span class="sync"><i></i>Twin updated at ${fmt(new Date(TW.now))}</span> &middot; demo data</p>`;

/* ---------- the surface screen's cards ---------- */
function indexCard(s){
  const st = TWIN.stageOf(s.Mnow);
  return `<section class="idx ${LV[s.level].cls}">
    <div class="idx-top"><div class="idx-g">${gauge(s.Mnow, s.M7)}</div>
    <div class="idx-t"><div class="idx-row"><span>Index now</span><b>${ix(s.Mnow)}</b></div>
      <div class="idx-row fc"><span>In 7 days</span><b>${ix(s.M7)}</b></div><small>range ${ix(s.lo7)}–${ix(s.hi7)}</small>${lvChip(s.level)}</div></div>
    <p class="idx-stage"><b>Index ${st.m}:</b> ${st.t}. <button class="btn-link" data-act="sheet-index">What the index means</button></p></section>`;
}
function crossBanner(s){
  if(s.Mnow >= 3) return `<div class="notif warn"><div class="nt-top">${ic('alert')}<b>Mould is probably visible here</b></div><div class="nt-body"><p>The index is ${ix(s.Mnow)}: at 3 and above mould can be seen. Please take a photo of it, and report it to your landlord.</p></div></div>`;
  if(s.cross3 !== null){
    const runs = Math.round(s.crossChance * 5);
    return `<div class="notif warn"><div class="nt-top">${ic('alert')}<b>Could become visible ${aheadWord(s.cross3)}</b></div><div class="nt-body"><p>The forecast reaches index 3 (mould you can see) in ${daysWord(s.cross3)}. ${runs} of 5 forecast runs agree. The steps below can still slow it.</p></div></div>`;
  }
  if(s.trend > .015) return `<div class="msg warn">${ic('trendUp')}<div><b>Slowly rising.</b> ${ix(s.Mweek)} a week ago, ${ix(s.Mnow)} now, ${ix(s.M7)} expected next week.</div></div>`;
  if(s.trend < -.015) return `<div class="msg ok">${ic('trendDown')}<div><b>Slowly falling.</b> ${ix(s.Mweek)} a week ago, ${ix(s.Mnow)} now, ${ix(s.M7)} expected next week.</div></div>`;
  return `<div class="msg">${ic('trendFlat')}<div><b>Steady.</b> ${ix(s.Mweek)} a week ago, ${ix(s.Mnow)} now.</div></div>`;
}
function dampCard(s){
  const sf = s.def, fc = s.wetFcAvg - s.wetPastAvg;
  return `<section class="card"><div class="card-head"><span class="card-t">Damp enough for mould</span><span class="cap-s">hours a day</span></div>
    <p class="sub">Mould can grow on ${esc(sf.material.toLowerCase())} when the air at the surface is above about <b>${Math.round(s.RHc)}% humidity</b>. Last week this surface was there <b>${hrs(s.wetPastAvg)} a day</b>${Math.abs(fc) >= .5 ? `; next week about ${hrs(s.wetFcAvg)}` : ''}.</p>
    ${wetBars(s)}
    <ul class="kv"><li>${ic('thermo')}<span>Surface now</span><b>${deg(s.Ts)} &middot; ${pct(s.RHs)}</b></li>
      <li>${ic('drop')}<span>Mould limit here</span><b>${pct(s.RHc)}</b></li>
      <li>${ic(s.room.icon)}<span>Room air now</span><b>${deg(s.Ti)} &middot; ${pct(s.RHi)}</b></li></ul></section>`;
}
function driversCard(s){
  const ds = withWet(s);
  if(!ds.length) return '';
  const max = Math.max(1, ...ds.map(d => d.wetEff));
  return `<section class="card"><div class="card-head"><span class="card-t">What&rsquo;s driving it</span><span class="cap-s">next 7 days</span></div>
    <div class="drvs">${ds.map(d => `<button class="drv" data-act="driver" data-id="${s.id}:${d.id}"><span class="drv-ic">${ic(DRV_IC[d.id])}</span><span class="drv-n"><b>${esc(d.n)}</b><small>${WHO[d.who]}</small></span><span class="drv-bar" aria-hidden="true"><i class="${d.who}" style="width:${Math.max(4, Math.round(d.wetEff / max * 100))}%"></i></span><span class="drv-v">+${hShort(d.wetEff)}</span></button>`).join('')}</div>
    <p class="note">Extra hours a day this surface would stay damp enough for mould because of each factor, worked out by re-running your home&rsquo;s twin without it. Tap one to see why.</p></section>`;
}
function homeTips(s){
  const ds = withWet(s).filter(d => d.who === 'home'), on = trying();
  if(!ds.length) return '';
  const saves = s.homeSteps, below = s.M7 >= 3 && saves.M7 < 3;
  return `<section class="card"><span class="card-t">What may help at home</span>
    ${ds.map(d => { const key = s.id + ':' + d.id, t = on.has(key);
      return `<div class="tip"><span class="tip-ic">${ic(DRV_IC[d.id])}</span><div class="tip-t"><b>${esc(d.tip)}</b><span>Could cut the damp hours here from ${hrs(s.wetFcAvg)} to ${hrs(d.wet)} a day.</span>
        <button class="try${t ? ' on' : ''}" data-act="try" data-id="${key}" aria-pressed="${t}">${t ? ic('check') + 'I&rsquo;m trying this' : 'I&rsquo;ll try this'}</button></div></div>`; }).join('')}
    <div class="msg ok">${ic('spark')}<div><b>All of these together:</b> damp about ${hrs(saves.wet)} a day, and an index of ${ix(saves.M7)} in 7 days instead of ${ix(s.M7)}${below ? ', staying below visible mould' : ''}.</div></div>
    ${ds.some(d => d.id === 'heat') ? `<p class="note">Worried about the cost of heating? Your landlord can put you in touch with energy and money advice.</p>` : ''}</section>`;
}
function landlordCard(s){
  const ds = withWet(s).filter(d => d.who === 'landlord');
  return `<section class="card ll"><span class="card-t">For your landlord</span>
    <p class="sub">These are repairs and improvements: not things you should have to fix. In the study your housing team sees this forecast too.</p>
    ${ds.map(d => `<div class="tip"><span class="tip-ic">${ic(DRV_IC[d.id])}</span><div class="tip-t"><b>${esc(d.n)}</b><span>${esc(d.tip)} It could cut the damp hours here to ${hrs(d.wet)} a day.</span></div></div>`).join('')}
    <div class="msg">${ic('shield')}<div>If you can see mould or a leak, report it. Under <b>Awaab&rsquo;s Law</b> your landlord must look into it within 10 working days, and within 24 hours if it is an emergency.</div></div>
    <button class="btn secondary sm" data-act="report" data-id="${s.id}">${ic('flag')}Report a problem</button></section>`;
}
function surfaceFacts(s){
  const sf = s.def, c = s.cls;
  const li = (i, k, v) => `<li>${ic(i)}<div><span>${k}</span><b>${v}</b></div></li>`;
  return `<section class="card"><span class="card-t">About this surface</span><ul class="kv plain">
    ${li('wall', 'Part of the building', esc(sf.element))}${li('layers', 'Material', esc(sf.material))}
    ${li('leaf', 'Sensitivity to mould (VTT class)', `${c.name}: like ${c.eg}`)}
    ${li('sensor', 'Measured by', sf.sensor ? 'Surface sensor ' + esc(sf.sensor) + ' (temperature and humidity)' : 'No sensor here: the twin estimates it from the room air')}
    ${li('thermo', 'How cold it runs', `${Math.round((1 - sf.f) * 100)}% of the way from the room&rsquo;s temperature to outside`)}</ul></section>`;
}
function lastPhotoCard(s){
  const p = lastPhotoOf(s.id);
  if(!p) return '';
  const pred = predAt(s.id, p.ts), ok = TWIN.agrees({ kind:'photo', obs:p.obs, pred });
  return `<button class="row" data-act="obs" data-id="${esc(p.id)}">${p.img ? `<img class="thumb" src="${esc(p.img)}" alt="">` : art(OBS[p.obs].art, 'thumb-art')}<div><b>Last photo: ${OBS[p.obs].n.toLowerCase()}</b><span>${whenWord(p.ts)} &middot; forecast then ${ix(pred)}${ok === null ? '' : ok ? ', agrees' : ', disagrees'}</span></div>${ic('chev', 'go')}</button>`;
}

/* ---------- the Ask tab: questions answered from the twin's data ---------- */
const SUGG = ['Which room is most at risk?', 'Why is the bedroom corner at risk?', 'Is it getting better or worse?', 'What should I do this week?', 'What does the mould index mean?', 'What is Awaab’s Law?'];
const chatLog = () => { try{ const v = JSON.parse(SS.get(CHAT_KEY) || '[]'); return Array.isArray(v) ? v : []; }catch(e){ return []; } };
const saveChat = log => SS.set(CHAT_KEY, JSON.stringify(log.slice(-40)));
const HELLO = { who:'bot', html:`Hello! I can tell you how risky each room is, why, and what may help. My answers come only from your home&rsquo;s sensors and forecasts. What would you like to know?` };
const ROOM_WORDS = [['bed2', /child|kid|son\b|daughter|baby|second bedroom|small bedroom|bedroom 2/], ['bed1', /bedroom|bed room|wardrobe/], ['living', /living|lounge|sitting room|front room/],
  ['kitchen', /kitchen|fridge|cook/], ['bath', /bath|shower|toilet/]];
const SURF_WORDS = [['bed1-corner', /corner|wardrobe/], ['bed2-wall', /behind the bed|bed wall/], ['bath-ceiling', /ceiling/], ['kitchen-wall', /fridge/], ['living-window', /sill/]];
function findRoom(t){ const m = ROOM_WORDS.find(([id, re]) => re.test(t) && TW.room(id)); return m ? TW.room(m[0]) : null; }
function findSurface(t, room){
  const m = SURF_WORDS.find(([id, re]) => re.test(t) && TW.surface(id)); if(m) return TW.surface(m[0]);
  if(room && /window/.test(t)) return room.surfaces.find(s => /window/.test(s.id)) || null;
  if(room && room.surfaces.length === 1) return room.surfaces[0];
  return null;
}
const openBtn = s => ({ act:'surface', id:s.id, label:`Open ${s.def.name.toLowerCase()}` });
const srcNow = () => `Forecast, ${whenWord(TW.now)}`;
function answer(q){
  const t = q.toLowerCase().replace(/[’']/g, "'"), room = findRoom(t), s = findSurface(t, room), worst = TW.worst;
  const focus = s || (room && room.worst) || worst;
  const is = re => re.test(t);
  if(is(/health|asthma|breath|cough|sick|ill\b|unwell|allerg|baby|wheez/))
    return { html:`Damp and mould can affect breathing, especially for babies and children, older people and anyone with asthma or a weak immune system. If someone at home is unwell, please speak to your GP or call <b>NHS 111</b>. I can&rsquo;t give medical advice, but mould that affects health is something your landlord must take seriously: you can report it from the Photos tab.`, src:['NHS and UK Health Security Agency guidance'], acts:[{ act:'report', id:'', label:'Report a problem' }] };
  if(is(/awaab|law|landlord|report|repair|complain|deadline|council|housing/))
    return { html:`<b>Awaab&rsquo;s Law</b> sets deadlines for social landlords once they know about damp or mould: they must <b>look into it within 10 working days</b>, start repairs within 5 working days if they find a significant hazard, and act <b>within 24 hours in an emergency</b>. If you report something today, they would need to investigate by <b>${shortDate(TWIN.addWorkingDays(TW.now, 10))}</b>. The tips in this app never replace those duties.`, src:['Awaab’s Law guidance for social landlords (2025)'], acts:[{ act:'report', id:'', label:'Report a problem' }] };
  if(is(/index|scale|number|mean|stage|vtt|score/)){
    return { html:`The <b>mould index</b> runs from 0 (no mould) to 6. At <b>1 and 2</b> mould has started but can only be seen under a microscope; from <b>3</b> you can see it (less than a tenth of the surface), at <b>4</b> up to half and at <b>5</b> more than half. Your highest surface is the ${esc(worst.def.name.toLowerCase())} in the ${esc(worst.room.name.toLowerCase())}: <b>${ix(worst.Mnow)}</b> now, <b>${ix(worst.M7)}</b> expected in 7 days.`, src:['VTT mould model (Hukka and Viitanen 1999; Ojanen et al. 2011)', srcNow()], acts:[openBtn(worst)] };
  }
  if(is(/photo|picture|camera|check/)){
    const done = doneThisWeek(), left = TW.surfaces.filter(x => !done[x.id]);
    return { html: left.length ? `This week you have photographed <b>${TW.surfaces.length - left.length} of ${TW.surfaces.length}</b> surfaces. Still to do: ${left.map(x => esc(x.def.name.toLowerCase()) + ' (' + esc(x.room.name.toLowerCase()) + ')').join(', ')}. A photo even when a wall looks fine helps check the forecasts.` : `All ${TW.surfaces.length} surfaces are photographed this week. Thank you!`, src:['Your photo checks'], acts:[{ act:'tab', id:'photos', label:'Open the photo check' }] };
  }
  if(is(/what (should|can|do) i|what to do|help|stop|prevent|tip|advice|reduce|avoid|fix/)){
    const ds = withWet(focus).filter(d => d.who === 'home').slice(0, 3), ll = withWet(focus).filter(d => d.who === 'landlord');
    if(!ds.length) return { html:`The ${esc(focus.def.name.toLowerCase())} is low risk right now. Keep the home warm and aired as you do, and keep up the weekly photos.`, src:[srcNow()] };
    return { html:`For the ${esc(focus.def.name.toLowerCase())} in the ${esc(focus.room.name.toLowerCase())}, these would help most:<ul>${ds.map(d => `<li>${esc(d.tip)} <span class="dim">(damp ${hrs(d.wet)} a day instead of ${hrs(focus.wetFcAvg)})</span></li>`).join('')}</ul>All together, the index in a week would be about <b>${ix(focus.homeSteps.M7)}</b> instead of ${ix(focus.M7)}.${ll.length ? ` Some of it is down to the building (${ll.map(d => esc(d.n.toLowerCase())).join(', ')}): that is for your landlord to fix.` : ''}`, src:['What-if runs of your home’s twin', srcNow()], acts:[openBtn(focus)] };
  }
  if(is(/why|cause|reason|driv|because|how come/)){
    const ds = withWet(focus).slice(0, 3);
    return { html:`The ${esc(focus.def.name.toLowerCase())} was damp enough for mould <b>${hrs(focus.wetPastAvg)} a day</b> last week: it is ${deg(focus.Ts)} at the surface now with ${pct(focus.RHs)} humidity, against a limit of ${pct(focus.RHc)} for ${esc(focus.def.material.toLowerCase())}. ${ds.length ? `The biggest reasons: ${ds.map(d => `<b>${esc(d.n.toLowerCase())}</b> (+${hShort(d.wetEff)} a day)`).join(', ')}.` : ''}`, src:[focus.def.sensor ? `Surface sensor ${focus.def.sensor}, last 7 days` : 'Twin estimate from the room sensor', 'What-if runs of your home’s twin'], acts:[openBtn(focus)] };
  }
  if(is(/better|worse|trend|getting|chang|improv|week ago|rising|falling/)){
    const list = s ? [s] : room ? room.surfaces : TW.surfaces.slice().sort((a, b) => b.trend - a.trend);
    const word = x => x.trend > .015 ? 'rising' : x.trend < -.015 ? 'falling' : 'steady';
    return { html:`${list.map(x => `<b>${esc(x.def.name)}</b> (${esc(x.room.name.toLowerCase())}): ${word(x)}, ${ix(x.Mweek)} a week ago, ${ix(x.Mnow)} now, ${ix(x.M7)} expected next week.`).join('<br>')}`, src:[srcNow()], acts: list.length === 1 ? [openBtn(list[0])] : [] };
  }
  if(is(/humid|damp|temperature|warm|cold|heat|degrees|air/)){
    const rs = room ? [room] : TW.rooms;
    return { html:`${rs.map(r => `<b>${esc(r.def.name)}</b>: ${deg(r.Ti)} and ${pct(r.RHi)} now; last week ${deg(r.TiAvg)} and ${pct(r.RHiAvg)} on average${r.coldH >= 4 ? `, below 16&nbsp;°C for ${hrs(r.coldH)} a day` : ''}.`).join('<br>')}`, src:['Room sensors, last 7 days'], acts:[] };
  }
  if(room || s || is(/risk|safe|worst|most|danger|bad|mould|status|how is|how's/)){
    if(s) return { html:`The <b>${esc(s.def.name.toLowerCase())}</b> in the ${esc(s.room.name.toLowerCase())} is at index <b>${ix(s.Mnow)}</b> (${TWIN.stageOf(s.Mnow).t.toLowerCase()}), expected ${ix(s.M7)} in 7 days: <b>${LV[s.level].n.toLowerCase()}</b>.${s.cross3 !== null && s.Mnow < 3 ? ` It could become visible ${aheadWord(s.cross3)}.` : ''}`, src:[s.def.sensor ? `Surface sensor ${s.def.sensor}` : 'Twin estimate', srcNow()], acts:[openBtn(s)] };
    if(room) return { html:`In the <b>${esc(room.def.name.toLowerCase())}</b>: ${room.surfaces.map(x => `${esc(x.def.name.toLowerCase())} ${ix(x.Mnow)} now, ${ix(x.M7)} in 7 days (${LV[x.level].n.toLowerCase()})`).join('; ')}.`, src:[srcNow()], acts: room.worst ? [openBtn(room.worst)] : [] };
    const others = TW.surfaces.filter(x => x !== worst && x.level >= 1);
    return { html:`The <b>${esc(worst.room.name.toLowerCase())}</b> needs attention most: the ${esc(worst.def.name.toLowerCase())} is at ${ix(worst.Mnow)} and expected ${ix(worst.M7)} in 7 days${worst.cross3 !== null && worst.Mnow < 3 ? `, so mould could become visible ${aheadWord(worst.cross3)}` : ''}. ${others.length ? `Also worth watching: ${others.map(x => `${esc(x.def.name.toLowerCase())} in the ${esc(x.room.name.toLowerCase())} (${ix(x.M7)})`).join(', ')}. ` : ''}Everything else is low.`, src:[`${TW.surfaces.length} monitored surfaces`, srcNow()], acts:[openBtn(worst)] };
  }
  return { html:`Sorry, I can only answer questions about damp and mould in your home, from its sensors and forecasts. You could ask: &ldquo;Which room is most at risk?&rdquo;, &ldquo;Why is the bathroom damp?&rdquo; or &ldquo;What should I do this week?&rdquo;`, src:[] };
}
function ask(text){
  text = String(text || '').trim().slice(0, 200);
  if(!text) return;
  const log = chatLog(); if(!log.length) log.push(HELLO);
  log.push({ who:'me', html: esc(text) });
  log.push(Object.assign({ who:'bot' }, answer(text)));
  saveChat(log);
  if(S.screen === 'ask'){ rerender(); const c = $('#chat'); if(c && c.lastElementChild) c.lastElementChild.scrollIntoView({ block:'start', behavior: reduceMotion() ? 'auto' : 'smooth' }); }
}
const bubble = m => m.who === 'me' ? `<div class="bub me"><div class="bub-t">${m.html}</div></div>`
  : `<div class="bub bot"><span class="bot-ic">${ic('spark')}</span><div class="bub-t">${m.html}${m.src && m.src.length ? `<div class="src">${m.src.map(x => `<span>${ic('doc')}${esc(x)}</span>`).join('')}</div>` : ''}${m.acts && m.acts.length ? `<div class="bub-acts">${m.acts.map(a => `<button class="chip" data-act="${esc(a.act)}" data-id="${esc(a.id)}" data-to="${esc(a.id)}">${esc(a.label)}</button>`).join('')}</div>` : ''}</div></div>`;

/* ---------- screens ---------- */
const TABS = ['home', 'ask', 'photos', 'more'];
const FLOWS = { photo:{ title:'Photo check', steps:['shot','see','signs','review'] }, report:{ title:'Report a problem', steps:['type','where','urgent','details','review'] } };
const FLOW_SCREENS = Object.keys(FLOWS);
const fresh = () => ({ screen:'home', room:null, surface:null, step:0, flow:null, hist:[] });
let S = fresh();
const F = () => S.flow || {};

const SCREENS = {
  welcome: () => `<div class="hero welcome">${brand()}<h1 class="h1" tabindex="-1">${esc0(CFG.tagline || 'See mould coming before it shows')}</h1>
    <p class="tagline">${APP} watches the walls of your home with small sensors and a <b>digital twin</b>, and tells you a week ahead where mould could grow, why, and what may help.</p></div>
    <div class="rows">
      <div class="row static">${ic('sensor')}<div><b>Sensors in your home</b><span>Temperature and humidity in each room and on the coldest walls. No cameras, no microphones.</span></div></div>
      <div class="row static">${ic('layers')}<div><b>A forecast for every wall</b><span>The twin works out how damp each surface gets and forecasts its mould index for the next 7 days.</span></div></div>
      <div class="row static">${ic('shield')}<div><b>Act early, together</b><span>Tips for you and early warnings for your landlord, before mould can be seen.</span></div></div>
    </div>
    <div class="msg">${ic('info')}<div>This is a <b>first draft with demo data</b> for an example flat. Nothing you enter leaves this device.</div></div>
    <div class="actions"><button class="btn primary" data-act="start">${ic('home')}Look around the demo home</button></div>`,

  home: () => `${head(longDate(new Date(TW.now)), greeting(), `${esc(HOME.name)} &middot; your home&rsquo;s digital twin ${demoPill}`)}
    ${alertCard()}
    ${riskCard()}
    <div class="sec-h"><span class="eyebrow">Your rooms</span><span class="cap-s">now → in 7 days</span></div>
    <div class="rows">${TW.rooms.slice().sort((a, b) => (b.worst ? b.worst.M7 : 0) - (a.worst ? a.worst.M7 : 0)).map(roomRow).join('')}</div>
    ${photoStatus()}
    ${nowStats()}
    ${sync()}`,

  room: () => {
    const r = TW.room(S.room); if(!r) return gone();
    const tip = r.worst && withWet(r.worst).find(d => d.who === 'home');
    return `<div class="room-hero ${LV[r.level].cls}"><div class="rh-art">${roomArt(r)}</div><div class="q"><div class="eyebrow">Room</div><h1 tabindex="-1">${esc(r.def.name)}</h1><p class="sub">${lvChip(r.level)} ${LV[r.level].t}</p></div></div>
      <div class="stats"><div class="stat"><b>${deg(r.Ti)}</b><span>now</span></div><div class="stat"><b>${pct(r.RHi)}</b><span>humidity now</span></div><div class="stat"><b>${hShort(r.coldH)}</b><span>a day below 16&nbsp;°C</span></div></div>
      <div class="sec-h"><span class="eyebrow">Monitored surfaces</span><span class="cap-s">last 2 weeks · next week</span></div>
      <div class="rows">${r.surfaces.map(surfRow).join('') || `<p class="sub">No surfaces are monitored in this room.</p>`}</div>
      <div class="sec-h"><span class="eyebrow">This week in the room</span><span class="cap-s">room sensor ${esc(r.def.sensor)}</span></div>
      ${roomCharts(r)}
      ${tip ? `<div class="card tipcard"><div class="card-head"><span class="card-t">${ic('bulb', 'inl')} One thing that may help</span></div><p>${esc(tip.tip)}</p><button class="btn-link" data-act="surface" data-id="${r.worst.id}">More about the ${esc(r.worst.def.name.toLowerCase())}</button></div>` : ''}`;
  },

  surface: () => {
    const s = TW.surface(S.surface); if(!s) return gone();
    const sf = s.def;
    return `<div class="q tab-head"><div class="eyebrow">${esc(s.room.name)} &middot; ${sensorWord(sf)}</div><h1 tabindex="-1">${esc(sf.name)}</h1><p class="sub">${esc(sf.where)}</p></div>
      ${indexCard(s)}
      ${crossBanner(s)}
      <section class="card"><div class="card-head"><span class="card-t">Mould index</span><span class="cap-s">4 weeks · next 7 days</span></div>${indexChart(s)}
        <div class="legend"><span><i class="lg-past"></i>Measured</span><span><i class="lg-fc"></i>Forecast</span><span><i class="lg-band"></i>Forecast range</span></div></section>
      ${dampCard(s)}
      ${driversCard(s)}
      ${homeTips(s)}
      ${landlordCard(s)}
      ${surfaceFacts(s)}
      ${lastPhotoCard(s)}
      <div class="actions"><button class="btn primary" data-act="photo" data-id="${s.id}">${ic('camera')}Add a photo of this surface</button><button class="btn secondary" data-act="ask-about" data-id="${s.id}">${ic('chat')}Ask about this surface</button></div>`;
  },

  ask: () => {
    const log = chatLog(), shown = log.length ? log : [HELLO];
    return `${head('Ask', 'Ask about your home', 'Answers come only from your home&rsquo;s sensors, its twin and the forecasts.')}
      <div class="chat" id="chat">${shown.map(bubble).join('')}</div>
      <div class="chips sugg" aria-label="Suggested questions">${SUGG.map(q => `<button class="chip" data-act="q" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
      <p class="note">Demo: these answers are put together on this device from the twin&rsquo;s data. In the study a large language model will answer, limited to the same data.${log.length > 1 ? ' <button class="btn-link" data-act="chat-clear">Clear the conversation</button>' : ''}</p>
      <form class="composer" data-form="ask"><label class="sr" for="askIn">Your question</label><input class="in" id="askIn" type="text" placeholder="Ask a question" autocomplete="off" maxlength="200" enterkeyhint="send"><button class="send" type="submit" aria-label="Send">${ic('send')}</button></form>`;
  },

  photos: () => {
    const done = doneThisWeek(), n = TW.surfaces.length, k = Object.keys(done).length, mon = weekStart(), sun = new Date(mon); sun.setDate(sun.getDate() + 6);
    const reps = myReports();
    return `${head('Photos', 'This week&rsquo;s photo check', `${shortDate(mon)} to ${shortDate(sun)}. One photo of each surface, even if it looks fine: your photos check the forecasts.`)}
      <section class="riskcard pc"><div class="goal-top">${ring(84, 9, k / n, 'lv-ok', `<b>${k}<small>/${n}</small></b><span>done</span>`, `${k} of ${n} surfaces photographed this week`)}
        <div class="goal-leg"><div class="gl"><span><b>${k >= n ? 'All done this week, thank you' : `${n - k} still to do`}</b><span>It takes about 2 minutes. Surfaces with a warning count most.</span></span></div></div></div></section>
      <div class="rows">${TW.surfaces.slice().sort((a, b) => (!!done[a.id] - !!done[b.id]) || b.M7 - a.M7).map(s => {
        const p = done[s.id];
        return `<button class="row ph-row${p ? ' on' : ''}" data-act="photo" data-id="${s.id}">${p && p.img ? `<img class="thumb" src="${esc(p.img)}" alt="">` : `<span class="orb">${ic(s.room.icon)}</span>`}
          <div><b>${esc(s.def.name)}</b><span>${esc(s.room.name)} &middot; ${p ? `${dayTitle(new Date(p.ts))}: ${OBS[p.obs].n.toLowerCase()}` : s.level >= 2 ? 'To do &middot; has a warning' : 'To do'}</span></div><span class="tick" aria-label="${p ? 'Done' : 'Not done'}">${ic('check')}</span></button>`; }).join('')}</div>
      <section class="notif"><div class="nt-top">${ic('flag')}<b>See mould, damp or a leak?</b></div><div class="nt-body"><p>Report it to your landlord. They must look into it within 10 working days (24 hours in an emergency).</p>
        <button class="btn primary sm" data-act="report">${ic('flag')}Report a problem</button></div></section>
      ${reps.length ? `<div class="sec-h"><span class="eyebrow">Your reports</span></div><ul class="hist">${reps.map(repItem).join('')}</ul>` : ''}
      <div class="sec-h"><span class="eyebrow">Earlier photos</span><span class="cap-s">forecast then</span></div>
      <ul class="hist">${photoHistory()}</ul>`;
  },

  more: () => `${head('More', 'Your home and the app')}
    <section class="glance"><div class="gl-head"><b>${esc(HOME.name)}</b><button class="btn-edit" data-act="go" data-to="myhome">${ic('list')}Details</button></div>
      <div class="gl-items">${[['home','Home', HOME.type], ['calendar','Built', HOME.built], ['wall','Walls', HOME.walls], ['window','Windows', HOME.windows], ['radiator','Heating', HOME.heating], ['users','Household', HOME.household]]
        .map(([i, k, v]) => `<div class="gi"><span class="gi-art">${ic(i)}</span><span class="gi-t"><span class="gi-k">${k}</span><span class="gi-v">${esc(v)}</span></span></div>`).join('')}</div></section>
    <div class="rows">
      <button class="row" data-act="go" data-to="how">${ic('help')}<div><b>How the forecast works</b><span>Sensors, the twin and the mould index</span></div>${ic('chev', 'go')}</button>
      <button class="row" data-act="sheet-privacy">${ic('lock')}<div><b>Your privacy</b><span>What is measured, and who sees it</span></div>${ic('chev', 'go')}</button>
      <button class="row" data-act="sheet-index">${ic('stat')}<div><b>What the index means</b><span>From 0 (no mould) to 6</span></div>${ic('chev', 'go')}</button>
    </div>
    <section class="card"><span class="card-t">Alerts</span>
      ${toggleRow('risk', 'bell', 'Warn me before mould is likely', 'When a surface may reach index 3 within a week')}
      ${toggleRow('photo', 'camera', 'Weekly photo reminder', 'Mondays at 18:00')}
      <p class="note">Demo: no notifications are sent yet. In the study they arrive on your phone, like a text.</p></section>
    <section class="card"><span class="card-t">Demo</span><p class="sub">This draft runs on a simulated flat. Photos and reports you add stay in this browser.</p>
      <a class="btn secondary" href="../staff/" target="_blank" rel="noopener">${ic('users')}Housing team view</a>
      <a class="btn secondary" href="../">${ic('info')}About ${APP}</a>
      <button class="btn link" data-act="reset">Start the demo again</button></section>
    <p class="foot">${APP} ${esc0(CFG.appVersion || '')} &middot; ${esc0(CFG.project || '')} &middot; ${TEAM}</p>`,

  myhome: () => `${head('From your home&rsquo;s building model', esc(HOME.name), `${esc(HOME.type)}, built in the ${esc(HOME.built)}. The twin is built from the home&rsquo;s plans (a building information model): its rooms, walls and materials.`)}
    <section class="card"><span class="card-t">The building</span><ul class="kv">
      <li>${ic('wall')}<span>Walls</span><b>${esc(HOME.walls)}</b></li><li>${ic('window')}<span>Windows</span><b>${esc(HOME.windows)}</b></li>
      <li>${ic('radiator')}<span>Heating</span><b>${esc(HOME.heating)}</b></li><li>${ic('fan')}<span>Ventilation</span><b>${esc(HOME.ventilation)}</b></li>
      <li>${ic('users')}<span>Household</span><b>${esc(HOME.household)}</b></li></ul></section>
    ${TW.rooms.map(r => `<section class="card"><div class="card-head"><span class="card-t">${esc(r.def.name)}</span><span class="cap-s">${r.def.V}&nbsp;m³</span></div><ul class="kv">
      <li>${ic('sensor')}<span>Room sensor ${esc(r.def.sensor)}</span><b>air temperature, humidity</b></li>
      ${r.surfaces.map(s => `<li>${ic('wall')}<span>${esc(s.def.name)}</span><b>${s.def.sensor ? 'sensor ' + esc(s.def.sensor) : 'estimated'} &middot; ${s.cls.name.toLowerCase()}</b></li>`).join('')}</ul></section>`).join('')}
    <section class="card"><span class="card-t">Outside</span><ul class="kv"><li>${ic('cloud')}<span>Weather sensor</span><b>temperature, humidity</b></li></ul></section>
    <p class="note">In the study the home also has window contact sensors, an energy meter and an air quality sensor. They help the model, but the app doesn&rsquo;t need to show them.</p>`,

  how: () => `${head('How it works', 'How the forecast works')}
    <ol class="steps how">
      <li><div><b>Sensors measure.</b> Small sensors record the temperature and humidity in each room and on the coldest walls every few minutes, with the weather outside.</div></li>
      <li><div><b>The twin fills the gaps.</b> A digital model of your home, built from its plans, knows each wall&rsquo;s materials and how cold it gets. It works out the conditions on every monitored surface, including those without a sensor.</div></li>
      <li><div><b>The mould index.</b> The VTT mould model turns how warm and damp each surface has been, and for how long, into an index from 0 (no mould) to 6.</div></li>
      <li><div><b>The 7-day forecast.</b> A forecast of the index a week ahead leaves time to act before mould can be seen (index 3).</div></li>
      <li><div><b>Your photos check it.</b> Each week your photos show whether the forecast was right. Where it was wrong, the model is corrected.</div></li>
    </ol>
    ${stagesTable()}
    <div class="msg">${ic('info')}<div><b>In this draft</b> the forecast is the VTT model run on the expected weather and your home&rsquo;s usual week, and &ldquo;what&rsquo;s driving it&rdquo; comes from re-running the twin without each factor. In the study a physics-informed AI model trained on real homes replaces both, with SHAP explanations.</div></div>`,

  photo: () => PHOTO_STEPS[FLOWS.photo.steps[S.step]](),
  report: () => REPORT_STEPS[FLOWS.report.steps[S.step]]()
};
function photoStatus(){
  const done = doneThisWeek(), n = TW.surfaces.length, k = Object.keys(done).length;
  return `<button class="status" data-act="tab" data-to="photos">${ic('camera')}<div><b>This week&rsquo;s photo check: ${k} of ${n}</b><span>${k >= n ? 'All done. Thank you!' : 'One photo of each surface, even if it looks fine.'}</span></div>${ic('chev', 'go')}</button>`;
}
function photoHistory(){
  const from = weekStart().getTime(), list = allPhotos().filter(p => p.ts < from);
  if(!list.length) return `<li class="day">No earlier photos yet.</li>`;
  let html = '', wk = '';
  list.slice(0, 40).forEach(p => {
    const d = new Date(p.ts), m = new Date(d); m.setHours(0, 0, 0, 0); m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
    const w = 'Week of ' + shortDate(m);
    if(w !== wk){ wk = w; html += `<li class="day">${w}</li>`; }
    const s = TW.surface(p.surface), pred = predAt(p.surface, p.ts), ok = TWIN.agrees({ kind:'photo', obs:p.obs, pred });
    html += `<li><button class="item" data-act="obs" data-id="${esc(p.id)}">${p.img ? `<img class="thumb sm" src="${esc(p.img)}" alt="">` : art(OBS[p.obs].art, 'thumb-art')}<div><b>${esc(s.def.name)}</b><span>${OBS[p.obs].n} &middot; ${esc(s.room.name)}</span></div><span class="agree ${ok ? 'ok' : 'no'}">${ix(pred)} ${ok ? ic('check') : ic('x')}</span>${ic('chev', 'go')}</button></li>`;
  });
  return html;
}
function repItem(r){
  const a = TWIN.awaab(r.ts, r.emergency), by = a.emergency ? a.actBy : a.investigateBy;
  return `<li><button class="item" data-act="rep" data-id="${esc(r.id)}">${r.img ? `<img class="thumb sm" src="${esc(r.img)}" alt="">` : art('prob:' + r.type, 'thumb-art')}<div><b>${PROBLEMS[r.type][0]}${r.emergency ? ' &middot; emergency' : ''}</b><span>${esc(roomName(r.room))} &middot; sent ${whenWord(r.ts)}</span></div><span class="due">by ${a.emergency ? fmt(by) + ' ' + dayTitle(by).toLowerCase() : shortDate(by)}</span>${ic('chev', 'go')}</button></li>`;
}
function stagesTable(){
  const lvOf = m => m < 1 ? 0 : m < 2 ? 1 : m < 3 ? 2 : 3;
  return `<section class="card"><span class="card-t">The mould index</span><ul class="stages">${TWIN.STAGES.map(st => `<li class="${LV[lvOf(st.m)].cls}"><b>${st.m}</b><span>${st.t}</span></li>`).join('')}</ul>
    <p class="note">From Ojanen et al. (2011). Below 3, mould can only be seen under a microscope: that is the window for acting early.</p></section>`;
}
function toggleRow(k, icon, t, sub){
  const on = readObj(ALERTS_KEY)[k] !== false;
  return `<button class="toggle-row" role="switch" aria-checked="${on}" data-act="alert" data-id="${k}">${ic(icon)}<div><b>${t}</b><span>${sub}</span></div><span class="switch" aria-hidden="true"><i></i></span></button>`;
}

/* ---------- the photo check ---------- */
const flowSurf = () => TW.surface(F().surface);
const PHOTO_STEPS = {
  shot: () => {
    const s = flowSurf(), f = F();
    return `<div class="q"><div class="eyebrow">${esc(s.room.name)}</div><h1 tabindex="-1">Take a photo of the ${esc(s.def.name.toLowerCase())}</h1><p class="sub">${esc(s.def.where)}. Stand about a metre away, include the whole area, and turn the light on.</p></div>
      <div class="shot">${f.img ? `<img src="${esc(f.img)}" alt="Your photo of the ${esc(s.def.name.toLowerCase())}">` : `<div class="shot-empty">${roomArt(s.room)}<span>${ic('camera')}No photo yet</span></div>`}</div>
      <div class="actions"><label class="btn ${f.img ? 'secondary' : 'primary'}" tabindex="0" data-act="pickfile">${ic('camera')}${f.img ? 'Take it again' : 'Take a photo'}<input type="file" accept="image/*" capture="environment" data-file="flow" hidden></label>
        ${f.img ? `<button class="btn primary" data-act="next">Next${ic('chev')}</button>` : `<button class="btn link" data-act="next">I can&rsquo;t take a photo now</button>`}</div>`;
  },
  see: () => `<div class="q"><div class="eyebrow">${esc(flowSurf().def.name)}</div><h1 tabindex="-1">What can you see on it?</h1><p class="sub">Look closely in the corners and edges.</p></div>
    <div class="ptiles c2">${Object.keys(OBS).map(k => `<button class="ptile lg${F().obs === k ? ' on' : ''}" data-act="pick" data-k="obs" data-v="${k}" aria-pressed="${F().obs === k}"><span class="pt-art">${art(OBS[k].art)}</span><span class="pt-t"><b>${OBS[k].n}</b><small>${OBS[k].s}</small></span><span class="tick">${ic('check')}</span></button>`).join('')}</div>`,
  signs: () => {
    const f = F(), none = f.signs.length === 1 && f.signs[0] === 'none';
    return `<div class="q"><div class="eyebrow">${esc(flowSurf().def.name)}</div><h1 tabindex="-1">Anything else?</h1><p class="sub">Choose all that apply.</p></div>
      <div class="rows">${SIGNS.map(([k, i, t]) => `<button class="row mrow${f.signs.includes(k) ? ' on' : ''}" data-act="sign" data-v="${k}" aria-pressed="${f.signs.includes(k)}">${ic(i)}<b>${t}</b><span class="tick">${ic('check')}</span></button>`).join('')}
        <button class="row mrow none${none ? ' on' : ''}" data-act="sign" data-v="none" aria-pressed="${none}">${ic('x')}<b>None of these</b><span class="tick">${ic('check')}</span></button></div>
      <div class="actions"><button class="btn primary" data-act="next"${f.signs.length ? '' : ' disabled'}>Next${ic('chev')}</button></div>`;
  },
  review: () => {
    const f = F(), s = flowSurf(), signs = f.signs.filter(x => x !== 'none');
    return `<div class="q"><div class="eyebrow">Check and save</div><h1 tabindex="-1">${esc(s.def.name)}</h1><p class="sub">${esc(s.room.name)} &middot; ${whenWord(Date.now())}</p></div>
      <div class="review">${f.img ? `<img class="rv-img" src="${esc(f.img)}" alt="Your photo">` : `<div class="rv-img none">${ic('camera')}<span>No photo</span></div>`}
        <ul class="kv"><li>${art(OBS[f.obs].art, 'kv-art')}<span>You can see</span><b>${OBS[f.obs].n}</b></li>
          <li>${ic('list')}<span>Also</span><b>${signs.length ? signs.map(k => SIGNS.find(x => x[0] === k)[2].toLowerCase()).join(', ') : 'nothing else'}</b></li></ul></div>
      <div class="field"><label for="note">Anything to add? (optional)</label><textarea class="in" id="note" data-note rows="3" maxlength="400" placeholder="For example: it gets worse after the washing is dried">${esc(f.note)}</textarea></div>
      <div class="actions"><button class="btn primary" data-act="save-photo">${ic('check')}Save photo check</button></div>`;
  }
};

/* ---------- the report ---------- */
const REPORT_STEPS = {
  type: () => `<div class="q"><div class="eyebrow">Report a problem</div><h1 tabindex="-1">What&rsquo;s the problem?</h1><p class="sub">Your report goes to your housing team.</p></div>
    <div class="ptiles c2">${Object.keys(PROBLEMS).map(k => `<button class="ptile${F().type === k ? ' on' : ''}" data-act="pick" data-k="type" data-v="${k}" aria-pressed="${F().type === k}"><span class="pt-art">${art('prob:' + k)}</span><span class="pt-t"><b>${PROBLEMS[k][0]}</b><small>${PROBLEMS[k][1]}</small></span><span class="tick">${ic('check')}</span></button>`).join('')}</div>`,
  where: () => `<div class="q"><div class="eyebrow">Report a problem</div><h1 tabindex="-1">Where is it?</h1></div>
    <div class="rows">${TW.rooms.map(r => `<button class="row mrow${F().room === r.id ? ' on' : ''}" data-act="pick" data-k="room" data-v="${r.id}" aria-pressed="${F().room === r.id}">${ic(r.def.icon)}<b>${esc(r.def.name)}</b><span class="tick">${ic('check')}</span></button>`).join('')}
      <button class="row mrow${F().room === 'elsewhere' ? ' on' : ''}" data-act="pick" data-k="room" data-v="elsewhere" aria-pressed="${F().room === 'elsewhere'}">${ic('door')}<b>Somewhere else</b><span class="tick">${ic('check')}</span></button></div>`,
  urgent: () => `<div class="q"><div class="eyebrow">Report a problem</div><h1 tabindex="-1">Is it an emergency?</h1></div>
    <div class="rows"><button class="row tall${F().emergency === true ? ' on' : ''}" data-act="pick" data-k="emergency" data-v="yes" aria-pressed="${F().emergency === true}"><span class="orb">${ic('alert')}</span><div><b>Yes, it&rsquo;s an emergency</b><span>Water near electrics, a bulging ceiling, a lot of water, or someone&rsquo;s health is at risk now</span></div></button>
      <button class="row tall${F().emergency === false ? ' on' : ''}" data-act="pick" data-k="emergency" data-v="no" aria-pressed="${F().emergency === false}"><span class="orb">${ic('clock')}</span><div><b>No</b><span>It needs looking at, but no one is in danger now</span></div></button></div>
    ${F().emergency ? `<div class="msg warn">${ic('phone')}<div>Please also <b>phone your landlord&rsquo;s emergency repairs line</b> now. A report in an app can be missed out of hours.</div></div>` : ''}
    ${F().emergency !== null ? `<div class="actions"><button class="btn primary" data-act="next">Next${ic('chev')}</button></div>` : ''}`,
  details: () => {
    const f = F();
    return `<div class="q"><div class="eyebrow">Report a problem</div><h1 tabindex="-1">A photo and a few words</h1><p class="sub">Both optional, but they help the team come prepared.</p></div>
      <div class="shot small">${f.img ? `<img src="${esc(f.img)}" alt="Your photo">` : `<div class="shot-empty">${art('prob:' + (f.type || 'other'))}<span>${ic('camera')}No photo yet</span></div>`}</div>
      <label class="btn secondary" tabindex="0" data-act="pickfile">${ic('camera')}${f.img ? 'Take it again' : 'Add a photo'}<input type="file" accept="image/*" capture="environment" data-file="flow" hidden></label>
      <div class="field"><label for="note">What&rsquo;s happening?</label><textarea class="in" id="note" data-note rows="4" maxlength="600" placeholder="For example: black spots behind the wardrobe, getting bigger for two weeks">${esc(f.note)}</textarea></div>
      <div class="actions"><button class="btn primary" data-act="next">Next${ic('chev')}</button></div>`;
  },
  review: () => {
    const f = F(), a = TWIN.awaab(Date.now(), f.emergency);
    return `<div class="q"><div class="eyebrow">Check and send</div><h1 tabindex="-1">${PROBLEMS[f.type][0]}</h1><p class="sub">${esc(roomName(f.room))}${f.surface && TW.surface(f.surface) ? ' &middot; ' + esc(TW.surface(f.surface).def.name.toLowerCase()) : ''}${f.emergency ? ' &middot; <b>emergency</b>' : ''}</p></div>
      <div class="review">${f.img ? `<img class="rv-img" src="${esc(f.img)}" alt="Your photo">` : ''}<ul class="kv">
        <li>${ic('doc')}<span>Details</span><b>${f.note ? esc(f.note) : 'none'}</b></li>
        <li>${ic('calendar')}<span>${f.emergency ? 'Must act by' : 'Must investigate by'}</span><b>${f.emergency ? whenWord(a.actBy.getTime()) : longDate(a.investigateBy)}</b></li></ul></div>
      <div class="msg">${ic('info')}<div>Demo: the report stays on this device, and the housing team view in this browser shows it. In the study it goes straight to your housing team.</div></div>
      <div class="actions"><button class="btn primary" data-act="send-report">${ic('send')}Send to my housing team</button></div>`;
  }
};

/* ---------- navigation ---------- */
/* Every screen over the tabs is a browser history entry (mc = how deep), so the phone's Back works everywhere: going
 * back restores the screen saved at that depth. A sheet is one entry more. AFTER runs once the browser has landed. */
let SHEET = null, AFTER = null;
const snap = () => ({ screen:S.screen, room:S.room, surface:S.surface, step:S.step });
function go(screen, o={}){
  S.hist.push(snap());
  Object.assign(S, o, { screen });
  history.pushState({ mc: S.hist.length }, '');
  render();
}
function toTab(tab, then){
  if(!S.hist.length){ S.screen = tab; render(); if(then) then(); return; }
  AFTER = () => { S.screen = tab; render(); if(then) then(); };
  history.go(-S.hist.length);
}
function startFlow(kind, o){ S.flow = Object.assign({ kind, base: S.hist.length, img:null, obs:null, signs:[], note:'', type:null, room:null, surface:null, emergency:null }, o); go(kind, { step: 0 }); }
function leaveFlow(then){
  const k = S.hist.length - (S.flow ? S.flow.base : 0);
  AFTER = then || null;
  if(k > 0) history.go(-k); else { S.flow = null; render(); }
}
function nextStep(){
  const steps = FLOWS[S.screen].steps;
  if(S.step < steps.length - 1) go(S.screen, { step: S.step + 1 });
}
addEventListener('popstate', e => {
  const d = e.state && typeof e.state.mc === 'number' ? e.state.mc : 0;
  if(SHEET) closeSheet();
  if(S.hist.length > d){
    const to = S.hist[d]; S.hist.length = d; Object.assign(S, to);
    if(!FLOW_SCREENS.includes(S.screen)) S.flow = null;
    render();
  }
  if(AFTER){ const f = AFTER; AFTER = null; f(); }
});

/* ---------- the chrome: top strip, tab bar ---------- */
const TAB_DEF = [['home','home','Home'], ['ask','chat','Ask'], ['photos','camera','Photos'], ['more','sliders','More']];
const backPill = () => `<button class="back" id="back" data-act="back" aria-label="Back">${ic('back')}Back</button>`;
function topbar(){
  const s = S.screen;
  if(TABS.includes(s) || s === 'welcome') return '';
  if(FLOWS[s]){
    const n = FLOWS[s].steps.length, k = S.step + 1, p = Math.round(k / n * 100);
    return backPill() + `<div class="prog"><div class="count" aria-live="polite">${FLOWS[s].title} &middot; ${k} of ${n}</div><div class="progress" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p}"><i style="width:${p}%"></i></div></div>` +
      `<button class="close" data-act="close" aria-label="Close">${ic('x')}</button>`;
  }
  const sf = s === 'surface' && TW.surface(S.surface);
  const label = s === 'room' ? 'Your rooms' : sf ? esc(sf.room.name) : 'More';
  return backPill() + `<div class="prog"><div class="count">${label}</div></div>`;
}
function updateChrome(){
  const s = S.screen, tabs = TABS.includes(s);
  $('.phone').classList.toggle('has-tabs', tabs);
  const nav = $('#tabbar'); nav.hidden = !tabs;
  if(tabs) nav.innerHTML = TAB_DEF.map(([id, icon, lab]) => `<button class="tab" data-act="tab" data-to="${id}"${id === s ? ' aria-current="page"' : ''}>${ic(icon)}<span>${lab}</span>${id === 'photos' && photosLeft() ? `<i class="tab-dot" aria-label="${photosLeft()} to do"></i>` : ''}</button>`).join('');
  const top = $('#top'), t = topbar(); top.innerHTML = t; top.classList.toggle('empty', !t);
}
const photosLeft = () => TW.surfaces.length - Object.keys(doneThisWeek()).length;

/* ---------- render ---------- */
let lastKey = '', firstRender = true;
const screenKey = () => [S.screen, S.room, S.surface, S.step].join(':');
function focusKey(el){
  if(!el || el === document.body) return null;
  if(el.id) return '#' + CSS.escape(el.id);
  const d = el.dataset || {};
  return d.act ? `[data-act="${d.act}"]` + (d.id ? `[data-id="${CSS.escape(d.id)}"]` : '') + (d.v ? `[data-v="${CSS.escape(d.v)}"]` : '') + (d.to ? `[data-to="${CSS.escape(d.to)}"]` : '') : null;
}
function render(){
  const el = $('#screen'), key = screenKey();
  if(FLOW_SCREENS.includes(S.screen) && !S.flow){ S.screen = 'home'; S.hist = []; }
  el.innerHTML = SCREENS[S.screen]();
  updateChrome();
  if(key !== lastKey){
    el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter');
    el.scrollTop = 0;
    if(!firstRender){ const h = el.querySelector('h1'); if(h) h.focus({ preventScroll:true }); }
    if(S.screen === 'ask'){ const c = $('#chat'); if(c && c.children.length > 1) c.lastElementChild.scrollIntoView({ block:'start' }); }
  }
  lastKey = key; firstRender = false;
}
/* redraws the same screen in place, keeping the scroll position and the focus */
function rerender(){
  const k = focusKey(document.activeElement), el = $('#screen'), y = el.scrollTop;
  el.innerHTML = SCREENS[S.screen]();
  updateChrome();
  el.scrollTop = y;
  if(k){ const t = document.querySelector(k); if(t) t.focus({ preventScroll:true }); }
}

/* ---------- sheets and toasts ---------- */
function openSheet(title, body){
  const sh = $('#sheet');
  sh.innerHTML = `<div class="sh-head"><div><b id="sheetTitle">${title}</b></div><button class="x" data-act="sheet-close" aria-label="Close">${ic('x')}</button></div><div class="sh-body">${body}</div>`;
  sh.hidden = false; $('#backdrop').hidden = false;
  SHEET = { opener: document.activeElement };
  history.pushState({ mc: S.hist.length, sheet: 1 }, '');
  sh.querySelector('.x').focus();
}
function closeSheet(){
  $('#sheet').hidden = true; $('#backdrop').hidden = true;
  const o = SHEET && SHEET.opener; SHEET = null;
  if(o && document.contains(o)) o.focus({ preventScroll:true });
}
const sheetThen = fn => { AFTER = fn; history.back(); };   // close the sheet, then fn
let toastTimer = 0;
function toast(title, sub='', kind='ok'){
  const el = $('#toast');
  el.className = 'toast ' + kind;
  el.innerHTML = `<span class="t-ic">${ic(kind === 'error' ? 'alert' : kind === 'info' ? 'info' : 'check')}</span><div class="t-text"><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</div>`;
  void el.offsetWidth; el.classList.add('open');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('open'), 4500);
}
const SHEETS = {
  index: () => openSheet('What the mould index means', `${stagesTable()}<p class="sub">The index is worked out for each surface from how warm and damp it has been, and for how long, using the VTT mould model. The same room can have a low index on one wall and a high one on another.</p>`),
  levels: () => openSheet('What the colours mean', `<ul class="levels">${LV.map((l, k) => `<li>${lvChip(k)}<span><b>${l.t}.</b> ${['Index below 1 expected in 7 days.', 'Index 1 to 2: mould may start, seen only under a microscope.', 'Index 2 to 3: growth is likely, but not yet visible.', 'Index 3 or more: mould you can see.'][k]}</span></li>`).join('')}</ul><p class="note">The colour of a room is the colour of its worst surface, from the index expected in 7 days.</p>`),
  privacy: () => openSheet('Your privacy', `<ul class="kv plain">
      <li>${ic('sensor')}<div><b>What is measured</b><span>Temperature and humidity in each room and on a few cold surfaces, every few minutes; in the study also whether windows are open and the energy used for heating. No cameras or microphones are ever installed.</span></div></li>
      <li>${ic('camera')}<div><b>Your photos</b><span>Only when you choose to take one. You decide what to photograph.</span></div></li>
      <li>${ic('users')}<div><b>Who sees it</b><span>In the study: you, the research team at London South Bank University and your housing team (the forecasts and your reports). Taking part is voluntary, and you can switch off any sensor or leave at any time.</span></div></li>
      <li>${ic('lock')}<div><b>In this demo</b><span>Nothing leaves this device. &ldquo;Start the demo again&rdquo; in More deletes everything you added.</span></div></li></ul>
      <p class="note">Questions: ${TEAM}</p>`),
  driver(sid, did){
    const s = TW.surface(sid), d = s && withWet(s).find(x => x.id === did) || (s && s.drivers.find(x => x.id === did));
    if(!d) return;
    const wetEff = Math.max(0, s.wetFcAvg - d.wet);
    openSheet(esc(d.n), `<div class="drv-sheet">${ic(DRV_IC[d.id])}<p>${esc(d.why)}</p></div>
      <ul class="kv"><li>${ic('drop')}<span>Damp hours a day next week</span><b>${hrs(s.wetFcAvg)}</b></li>
        <li>${ic('spark')}<span>Without this</span><b>${hrs(d.wet)} (−${hShort(wetEff)})</b></li>
        <li>${ic('stat')}<span>Index in 7 days</span><b>${ix(s.M7)} → ${ix(d.M7)} without it</b></li></ul>
      ${d.tip ? `<p class="sub"><b>${d.who === 'landlord' ? 'For your landlord' : 'What may help'}:</b> ${esc(d.tip)}</p>` : ''}
      <p class="note">Worked out by running your home&rsquo;s twin for next week twice, with and without this factor. The study&rsquo;s model will use SHAP attributions instead.</p>`);
  },
  obs(id){
    const p = allPhotos().find(x => x.id === id); if(!p) return;
    const s = TW.surface(p.surface), pred = predAt(p.surface, p.ts), ok = TWIN.agrees({ kind:'photo', obs:p.obs, pred });
    openSheet(esc(s.def.name), `${p.img ? `<img class="rv-img" src="${esc(p.img)}" alt="Photo of the ${esc(s.def.name.toLowerCase())}">` : `<div class="obs-art">${art(OBS[p.obs].art)}<span>${p.seeded ? 'Example check from the demo' : 'No photo was taken'}</span></div>`}
      <ul class="kv"><li>${ic('calendar')}<span>Checked</span><b>${whenWord(p.ts)}</b></li><li>${ic('eye')}<span>You saw</span><b>${OBS[p.obs].n}</b></li>
        ${p.signs && p.signs.length ? `<li>${ic('list')}<span>Also</span><b>${p.signs.map(k => (SIGNS.find(x => x[0] === k) || [0, 0, k])[2].toLowerCase()).join(', ')}</b></li>` : ''}
        ${p.note ? `<li>${ic('doc')}<span>Note</span><b>${esc(p.note)}</b></li>` : ''}
        <li>${ic('stat')}<span>Forecast then</span><b>${ix(pred)}</b></li></ul>
      <div class="msg ${ok ? 'ok' : 'warn'}">${ic(ok ? 'checkc' : 'alert')}<div>${ok ? `The forecast agreed: an index ${pred < 3 ? 'below 3 means nothing visible yet' : 'of 3 or more means mould you can see'}.` : `The forecast and your photo disagree. This is exactly what the study learns from: the model is corrected where it is wrong.`}</div></div>`);
  },
  rep(id){
    const r = myReports().find(x => x.id === id); if(!r) return;
    openSheet(PROBLEMS[r.type][0], reportTimeline(r) + (r.img ? `<img class="rv-img" src="${esc(r.img)}" alt="Your photo">` : '') + (r.note ? `<p class="sub">&ldquo;${esc(r.note)}&rdquo;</p>` : ''));
  }
};
function reportTimeline(r){
  const a = TWIN.awaab(r.ts, r.emergency), d = new Date(r.ts);
  const steps = r.emergency
    ? [[`${dayTitle(d)}, ${fmt(d)}`, 'Your housing team is told (demo: saved on this device).'], [whenWord(a.actBy.getTime()), 'Within 24 hours they must make it safe.'], ['Then', 'Repairs to put it right, and a check that it worked.']]
    : [[`${dayTitle(d)}, ${fmt(d)}`, 'Your housing team is told (demo: saved on this device).'], [`By ${longDate(a.investigateBy)}`, 'Within 10 working days they must investigate.'], ['If it is a hazard', 'Repairs must start within 5 working days of the investigation.']];
  return `<ol class="tl">${steps.map(([w, t]) => `<li><b>${w}</b><span>${t}</span></li>`).join('')}</ol><p class="note">Keep taking your weekly photos: they show if things change.</p>`;
}

/* ---------- saving ---------- */
function readPhoto(input){
  const file = input.files && input.files[0]; if(!file) return;
  if(!/^image\//.test(file.type)){ toast('That file isn&rsquo;t a picture', 'Please choose a photo.', 'error'); return; }
  const url = URL.createObjectURL(file), img = new Image();
  img.onload = () => {
    const k = Math.min(1, 720 / Math.max(img.width, img.height)), c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    if(S.flow){ S.flow.img = c.toDataURL('image/jpeg', .72); rerender(); }
  };
  img.onerror = () => { URL.revokeObjectURL(url); toast('Couldn&rsquo;t open that picture', 'Please try another one.', 'error'); };
  img.src = url;
}
/* keeps the newest items; drops pictures from the oldest when the browser's storage is full */
function store(key, item){
  const list = readList(key); list.push(item);
  while(!LS.set(key, JSON.stringify(list))){
    const old = list.find(x => x.img && x !== item);
    if(old) old.img = null; else if(item.img){ item.img = null; item.imgDropped = true; } else return false;
  }
  return true;
}
function savePhoto(){
  const f = F(), item = { id: uid(), home: TW.id, surface: f.surface, ts: Date.now(), obs: f.obs, signs: f.signs.filter(x => x !== 'none'), note: f.note.trim().slice(0, 400), img: f.img };
  const ok = store(PHOTOS_KEY, item);
  const visible = f.obs !== 'none' || item.signs.includes('leak'), sid = f.surface, room = TW.surface(sid).def.room, img = f.img;
  leaveFlow(() => {
    if(!ok){ toast('Couldn&rsquo;t save the check', 'This browser&rsquo;s storage is full.', 'error'); return; }
    toast('Photo check saved', item.imgDropped ? 'The picture was too big to keep on this device.' : 'Thank you: it checks the forecast.');
    if(visible) openSheet('Report it to your landlord?', `<p class="sub">You can see ${item.signs.includes('leak') && f.obs === 'none' ? 'a leak' : 'mould'}. Your landlord needs to know: under Awaab&rsquo;s Law they must look into it within 10 working days.</p>
      <div class="actions"><button class="btn primary" data-act="report-from" data-id="${sid}" data-v="${item.signs.includes('leak') && f.obs === 'none' ? 'leak' : 'mould'}">${ic('flag')}Report it now</button><button class="btn link" data-act="sheet-close">Not now</button></div>`);
    PENDING_IMG = img; PENDING_ROOM = room;
  });
}
let PENDING_IMG = null, PENDING_ROOM = null;              // the photo just saved, offered to a report started from it
function sendReport(){
  const f = F(), item = { id: uid(), home: TW.id, ts: Date.now(), type: f.type, room: f.room, surface: f.surface || null, emergency: !!f.emergency, note: f.note.trim().slice(0, 600), img: f.img, status:'sent' };
  const ok = store(REPORTS_KEY, item);
  leaveFlow(() => {
    if(!ok){ toast('Couldn&rsquo;t save the report', 'This browser&rsquo;s storage is full.', 'error'); return; }
    openSheet('Report sent', reportTimeline(item));
  });
}

/* ---------- actions ---------- */
const ACTS = {
  start(){ LS.set(SEEN_KEY, '1'); S.screen = 'home'; render(); },
  tab(b){ const to = b.dataset.to || b.dataset.id; if(TABS.includes(to)) toTab(to); },
  back(){ if(S.hist.length) history.back(); else { S.screen = 'home'; render(); } },
  close(){ leaveFlow(); },
  go(b){ go(b.dataset.to); },
  room(b, id){ if(TW.room(id)) go('room', { room:id }); },
  surface(b, id){ if(!TW.surface(id)) return; if(SHEET) sheetThen(() => go('surface', { surface:id })); else go('surface', { surface:id }); },
  photo(b, id){ if(TW.surface(id)) startFlow('photo', { surface:id }); },
  report(b, id){
    const s = id && TW.surface(id), o = s ? { surface:id, room:s.def.room, type:'mould' } : {};
    if(SHEET) sheetThen(() => startFlow('report', o)); else startFlow('report', o);
  },
  'report-from'(b, id){ const o = { surface:id, room:PENDING_ROOM, type:b.dataset.v, img:PENDING_IMG }; sheetThen(() => startFlow('report', o)); },
  next(){ nextStep(); },
  pick(b){
    const k = b.dataset.k, v = b.dataset.v;
    S.flow[k] = k === 'emergency' ? v === 'yes' : v;
    rerender();
    if(k === 'emergency' && v === 'yes') return;           // stays to show the phone advice; Next below
    const at = S.screen + S.step;                         // a second quick tap must not skip a step
    setTimeout(() => { if(S.flow && S.screen + S.step === at) nextStep(); }, reduceMotion() ? 0 : 220);
  },
  sign(b){
    const v = b.dataset.v, f = S.flow;
    f.signs = v === 'none' ? (f.signs.includes('none') ? [] : ['none']) : f.signs.filter(x => x !== 'none');
    if(v !== 'none') f.signs = f.signs.includes(v) ? f.signs.filter(x => x !== v) : f.signs.concat(v);
    rerender();
  },
  'save-photo'(){ savePhoto(); },
  'send-report'(){ sendReport(); },
  try(b, id){ const on = trying(); on.has(id) ? on.delete(id) : on.add(id); LS.set(TRY_KEY, JSON.stringify([...on])); rerender(); if(on.has(id)) toast('Noted', 'Your forecast will show if it helps.', 'info'); },
  driver(b, id){ const [sid, did] = id.split(':'); SHEETS.driver(sid, did); },
  obs(b, id){ SHEETS.obs(id); },
  rep(b, id){ SHEETS.rep(id); },
  q(b){ ask(b.dataset.q); },
  'ask-about'(b, id){ const s = TW.surface(id); if(s) toTab('ask', () => ask(`Why is the ${s.def.name.toLowerCase()} in the ${s.room.name.toLowerCase()} at risk?`)); },
  'chat-clear'(){ SS.del(CHAT_KEY); rerender(); },
  'sheet-index'(){ SHEETS.index(); },
  'sheet-levels'(){ SHEETS.levels(); },
  'sheet-privacy'(){ SHEETS.privacy(); },
  'sheet-close'(){ if(SHEET) history.back(); },
  alert(b, id){ const v = readObj(ALERTS_KEY); v[id] = b.getAttribute('aria-checked') !== 'true'; LS.set(ALERTS_KEY, JSON.stringify(v)); rerender(); },
  reset(){ openSheet('Start the demo again?', `<p class="sub">This deletes the photos, reports and choices you added in this browser.</p><div class="actions"><button class="btn danger" data-act="reset-yes">Delete and start again</button><button class="btn link" data-act="sheet-close">Cancel</button></div>`); },
  'reset-yes'(){ [PHOTOS_KEY, REPORTS_KEY, TRY_KEY, SEEN_KEY, ALERTS_KEY].forEach(k => LS.del(k)); SS.del(CHAT_KEY); sheetThen(() => toTab('home', () => { S.screen = 'welcome'; render(); })); }
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if(!b || b.disabled) return;
  if(b.dataset.act === 'pickfile') return;                  // the label opens the file picker by itself
  const f = ACTS[b.dataset.act]; if(f) f(b, b.dataset.id, e);
});
document.addEventListener('keydown', e => {
  if(e.key === 'Escape' && SHEET){ history.back(); return; }
  const l = e.target.closest && e.target.closest('label[data-act="pickfile"]');
  if(l && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); const i = l.querySelector('input'); if(i) i.click(); }
});
document.addEventListener('change', e => { if(e.target.matches('input[data-file]')) readPhoto(e.target); });
document.addEventListener('input', e => { if(e.target.matches('[data-note]') && S.flow) S.flow.note = e.target.value; });
document.addEventListener('submit', e => { if(e.target.matches('[data-form="ask"]')){ e.preventDefault(); const i = $('#askIn'); ask(i.value); } });
$('#backdrop').addEventListener('click', () => { if(SHEET) history.back(); });

/* ---------- start ---------- */
/* the twin is rebuilt when the hour turns, and the screen redrawn unless a flow or a sheet is open */
setInterval(() => {
  const t = TWIN.get(TWIN.DEMO_ID);
  if(t !== TW){ TW = t; if(!S.flow && !SHEET) rerender(); }
}, 60000);
if('serviceWorker' in navigator && (location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname))) navigator.serviceWorker.register('sw.js').catch(() => {});
history.replaceState({ mc: 0 }, '');
(function boot(){
  const q = new URL(location.href).searchParams, open = q.get('open');   // ?open=<surface id> or ?open=<tab>, for links and testing
  S.screen = LS.get(SEEN_KEY) ? 'home' : 'welcome';
  if(open && TABS.includes(open)){ LS.set(SEEN_KEY, '1'); S.screen = open; }
  render();
  if(open && TW.surface(open)){ LS.set(SEEN_KEY, '1'); S.screen = 'home'; render(); go('surface', { surface: open }); }
})();
