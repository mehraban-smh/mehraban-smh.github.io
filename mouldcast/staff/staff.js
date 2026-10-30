/* MouldCast - housing team view, /mouldcast/staff/.
 *
 * The landlord's repairs and asset team's page: which homes and surfaces are heading for visible mould this week,
 * what drives each forecast (the repairs that would help, and the household factors the resident gets advice on),
 * the Awaab's Law queue of resident reports with their deadlines, and how well the forecasts agree with what the
 * residents' weekly photos showed (the validation of RES3 Objective 4). Drawn in the HomePulse dashboard style
 * (staff.css); the chart is inline SVG with a Table view of its numbers.
 *
 * Data comes only through window.TWIN (../twin.js), which simulates the eight demo homes in this browser. There is
 * no sign-in and no backend in this draft. The resident app (../app/) keeps its photos and reports in this same
 * browser and this page reads them (read only, never written; missing or malformed = none):
 *   localStorage mc_photos   [{ id, home, surface, ts, obs, signs[], note, img }]
 *   localStorage mc_reports  [{ id, home, ts, type, room, surface, emergency, note, img, status }]
 *
 * Dates are shown on the device's clock, the same clock twin.js uses for working days and Awaab's Law deadlines
 * (a UK device shows UK time).
 */
(function () {
  'use strict';

  const T = window.TWIN;
  const main = document.getElementById('main');
  if (!T || !main) { if (main) main.innerHTML = '<div class="empty">The housing team view could not load its files (config.js or twin.js). Check the connection and reload the page.</div>'; return; }
  const cfg = window.MC_CONFIG || {};

  /* ---------------------------------------------------------------- constants */
  const APP = cfg.appName || 'MouldCast';
  const HOUR = T.HOUR;
  const SOON_WD = 3;            // an open report is "due soon" with this many working days or fewer left
  const PAST_DAYS = 28;         // days of record in the surface chart
  const LV = T.LEVELS;
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

  /* ---------------------------------------------------------------- words */
  const OBS_W = {}; T.OBS_CLASSES.forEach(c => { OBS_W[c.id] = c.n; });
  const TYPE_W = { mould: 'Mould', damp: 'Damp', leak: 'Leak', condensation: 'Condensation', smell: 'Musty smell', other: 'Something else' };
  const SIGN_W = { condensation: 'condensation', stain: 'staining', peeling: 'peeling paint or paper', smell: 'musty smell', leak: 'a leak' };

  /* ---------------------------------------------------------------- small helpers */
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtN = n => Number(n).toLocaleString('en-GB');
  const pct = (a, b) => b ? Math.round(100 * a / b) + '%' : '–';
  const plural = (n, one, many) => fmtN(n) + ' ' + (n === 1 ? one : (many || one + 's'));
  const f1 = v => v == null || !isFinite(v) ? '–' : v.toFixed(1);
  const f2 = v => v == null || !isFinite(v) ? '–' : v.toFixed(2);
  const signed = (v, dp) => { const k = Math.pow(10, dp), r = Math.round(v * k) / k; return (r > 0 ? '+' : r < 0 ? '−' : '±') + Math.abs(r).toFixed(dp); };
  const pretty = v => { const s = String(v == null ? '' : v).replace(/[_-]+/g, ' ').trim(); return s ? s[0].toUpperCase() + s.slice(1) : ''; };
  const cssId = s => (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/[^\w-]/g, '_');
  const lvChip = i => `<span class="lv ${LV[i].cls}">${esc(LV[i].n)}</span>`;
  const surfName = s => s.room.name + ' · ' + s.def.name;

  /* ---------------------------------------------------------------- dates ("Fri 13 Nov, 17:00") */
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hhmm = d => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  const fmtShort = t => { const d = new Date(t); return d.getDate() + ' ' + MONTHS[d.getMonth()]; };
  const fmtDay = t => { const d = new Date(t); return WD[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; };
  const fmtStamp = t => fmtDay(t) + ', ' + hhmm(new Date(t));
  function ago(t) {
    const m = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + ' h ago';
    const d = Math.floor(m / 1440);
    return d === 1 ? 'yesterday' : d + ' days ago';
  }
  // Monday 00:00 of the week holding t
  const weekOf = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };

  /* ================================================================ tooltip (one, shared; plain text only) */
  const tip = $('#tip');
  let tipFor = null;
  function showTip(el, x, y) {
    const text = el.getAttribute('data-tip');
    if (!text || !tip) return;
    if (tipFor !== el) {
      tip.textContent = '';
      text.split('\n').forEach((line, i) => { const n = document.createElement(i ? 'span' : 'b'); n.textContent = line; tip.appendChild(n); });
      tipFor = el;
    }
    tip.hidden = false;
    const w = tip.offsetWidth, h = tip.offsetHeight, vw = document.documentElement.clientWidth;
    let left = x + 14, top = y - h - 12;
    if (left + w > window.scrollX + vw - 8) left = x - w - 14;
    if (left < window.scrollX + 8) left = window.scrollX + 8;
    if (top < window.scrollY + 8) top = y + 18;
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  }
  function hideTip() { if (tip) tip.hidden = true; tipFor = null; }
  document.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (el) showTip(el, e.pageX, e.pageY); else if (tip && !tip.hidden) hideTip();
  });
  document.addEventListener('focusin', e => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) { const r = el.getBoundingClientRect(); showTip(el, r.left + r.width / 2 + window.scrollX, r.top + window.scrollY); } });
  document.addEventListener('focusout', () => hideTip());
  window.addEventListener('scroll', () => { if (tip && !tip.hidden) hideTip(); }, { passive: true });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hideTip(); });
  const tipA = (...lines) => ' data-tip="' + esc(lines.filter(Boolean).join('\n')) + '"';

  /* ================================================================ the resident app's storage (read only) */
  function readList(key) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return [];
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v.filter(x => x && typeof x === 'object' && !Array.isArray(x)) : [];
    } catch (e) { return []; }
  }
  const str = v => typeof v === 'string' ? v : '';
  const tsOf = v => { const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN; return isFinite(n) && n > 0 ? n : null; };
  // only a plain raster image from the camera is shown; anything else is left out
  const safeImg = v => typeof v === 'string' && v.length < 12e6 && /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=\s]+$/i.test(v) ? v : null;
  function residentPhotos() {
    return readList('mc_photos').map(p => ({
      id: str(p.id), home: str(p.home), surface: str(p.surface), ts: tsOf(p.ts),
      obs: typeof p.obs === 'string' && has(OBS_W, p.obs) ? p.obs : null,
      signs: Array.isArray(p.signs) ? p.signs.filter(x => typeof x === 'string') : [],
      note: str(p.note), img: safeImg(p.img)
    })).filter(p => p.home && p.surface && p.ts);
  }
  function residentReports() {
    return readList('mc_reports').map(r => {
      const ts = tsOf(r.ts), home = str(r.home), status = str(r.status) || 'sent';
      if (!home || !ts) return null;
      const closed = /^(closed|resolved|done)$/i.test(status);
      return { id: 'app-' + str(r.id), home, ts, emergency: r.emergency === true, room: str(r.room) || null, surface: str(r.surface) || null,
        problem: typeof r.type === 'string' && has(TYPE_W, r.type) ? TYPE_W[r.type] : 'Report', detail: str(r.note), img: safeImg(r.img),
        status: status === 'sent' ? 'New · not acknowledged yet' : pretty(status), open: !closed, own: true };
    }).filter(Boolean);
  }

  /* ================================================================ the data */
  /* A resident's own photo as an observation: the model's index for that surface at the hour it was taken. */
  function ownObs(tw, p) {
    const s = tw.surface(p.surface);
    const i = Math.min(tw.N - 1, Math.max(0, Math.round((p.ts - tw.t0) / tw.HOUR)));
    return { id: 'app:' + p.id, home: tw.id, surface: p.surface, ts: p.ts, kind: 'photo', obs: p.obs, pred: s ? s.series.M[i] : null,
      by: 'resident', own: true, known: !!s, signs: p.signs, note: p.note, img: p.img };
  }
  const agreeOf = o => o.pred == null ? null : T.agrees(o);

  /* The demo's reports, placed relative to the twin's hour so the queue always looks the same: one emergency, two
   * in progress, one with a day left, one closed. */
  function demoReports(tnow) {
    // n working days before now, at hh:mm
    const back = (n, h, m) => { const d = new Date(tnow); let left = n; while (left > 0) { d.setDate(d.getDate() - 1); if (T.workingDay(d)) left--; } d.setHours(h, m, 0, 0); return d.getTime(); };
    return [
      { id: 'demo-1', home: 'H06', ts: back(6, 9, 40), emergency: false, room: 'bed2', surface: 'bed2-wall', problem: 'Visible mould',
        detail: 'Black spots spreading on the wall behind the bed in the child’s bedroom.', status: 'Inspection booked for ' + fmtDay(T.addWorkingDays(tnow, 2)), open: true },
      { id: 'demo-2', home: 'H05', ts: back(2, 14, 5), emergency: false, room: 'bed1', surface: 'bed1-corner', problem: 'Condensation and black spots',
        detail: 'Windows wet every morning; black spots in the corner behind the wardrobe.', status: 'Acknowledged · inspection to book', open: true },
      { id: 'demo-3', home: 'H02', ts: tnow - 3 * HOUR + 7 * 60e3, emergency: true, room: 'bath', surface: 'bath-ceiling', problem: 'Leak through the ceiling',
        detail: 'Water coming through the bathroom ceiling from the flat above.', status: 'Emergency contractor on the way to make safe', open: true },
      { id: 'demo-4', home: 'H08', ts: back(9, 11, 25), emergency: false, room: 'bed1', surface: null, problem: 'Musty smell',
        detail: 'Musty smell in the main bedroom, worst in the mornings.', status: 'Awaiting inspection', open: true },
      { id: 'demo-5', home: 'H04', ts: back(16, 10, 50), emergency: false, room: 'bath', surface: 'bath-ceiling', problem: 'Mould on the bathroom ceiling',
        detail: 'Grey spots on the ceiling above the shower.', open: false,
        status: 'Closed · inspected ' + fmtDay(back(11, 10, 0)) + ', no significant hazard; extractor fan replaced ' + fmtDay(back(9, 14, 0)), metAt: back(11, 10, 0) }
    ];
  }
  /* Awaab's Law: the deadline that applies now, and how close it is */
  function withDeadline(r, now) {
    const a = T.awaab(r.ts, r.emergency);
    const out = Object.assign({}, r, { due: (a.emergency ? a.actBy : a.investigateBy).getTime() });
    if (!r.open) return out;
    out.overdue = now > out.due;
    if (r.emergency) out.hoursLeft = (out.due - now) / HOUR;
    else out.wdLeft = T.workingDaysBetween(now, out.due);      // 0 = due today, negative = past
    out.soon = !out.overdue && (r.emergency || out.wdLeft <= SOON_WD);
    return out;
  }

  function load() {
    const now = Date.now();
    const twins = T.homes().map(h => T.get(h.id, now)).filter(tw => tw && tw.surfaces.length);
    const byId = {}; twins.forEach(tw => { byId[tw.id] = tw; });
    const tnow = twins.length ? twins[0].now : Math.floor(now / HOUR) * HOUR;
    const photos = residentPhotos();
    const obs = {};
    twins.forEach(tw => {
      const own = photos.filter(p => p.home === tw.id).map(p => ownObs(tw, p));
      obs[tw.id] = T.observations(tw).concat(own).sort((a, b) => b.ts - a.ts);
    });
    const reports = demoReports(tnow).concat(residentReports()).map(r => withDeadline(r, now));
    return { now, tnow, twins, byId, obs, reports, ownPhotos: photos.length };
  }

  let D = null;                                         // the data, rebuilt by refresh()
  const st = { home: null, surf: null, tables: new Set() };
  const openReports = id => D.reports.filter(r => r.open && (!id || r.home === id));
  const allSurfaces = () => [].concat(...D.twins.map(tw => tw.surfaces.map(s => ({ tw, s }))));
  const byRisk = () => D.twins.slice().sort((a, b) => b.worst.M7 - a.worst.M7 || b.worst.Mnow - a.worst.Mnow);
  const lastPhoto = tw => { const p = D.obs[tw.id].find(o => o.kind === 'photo'); return p ? p.ts : null; };   // newest first
  const inDays = h => h / 24 < .75 ? 'within a day' : '~' + plural(Math.round(h / 24), 'day');
  function crossWords(s) {
    if (s.cross3 === 0) return 'already';
    return s.cross3 == null ? '—' : inDays(s.cross3);
  }
  // when the central forecast stays below 3 but part of the range crosses it
  const possibleWords = s => s.crossEarly === 0 ? 'possible now' : 'possible ' + inDays(s.crossEarly);
  /* The weekly photo check: the response to last week's round (the latest complete one; the demo's seeded checks
   * stop there), and how this week's round is going so far. Counted per monitored surface. */
  function photoRound() {
    const thisWk = weekOf(D.tnow), lastWk = weekOf(thisWk - 1);
    const photos = [].concat(...D.twins.map(tw => D.obs[tw.id].filter(o => o.kind === 'photo' && o.known !== false)));
    const round = w => { const list = photos.filter(o => weekOf(o.ts) === w); return { surfs: new Set(list.map(o => o.home + '|' + o.surface)).size, homes: new Set(list.map(o => o.home)).size }; };
    return { wk: lastWk, last: round(lastWk), cur: round(thisWk), total: D.twins.reduce((n, tw) => n + tw.surfaces.length, 0) };
  }

  /* ================================================================ page */
  function pageHtml() {
    const fcTo = D.tnow + T.FC_DAYS * 24 * HOUR;
    return `<header class="phead">
        <div><h1>Housing team view</h1><p class="sub">${plural(D.twins.length, 'home')} · twin updated ${esc(fmtStamp(D.tnow))} · forecasts to ${esc(fmtStamp(fcTo))}</p></div>
        <nav class="jump" aria-label="On this page"><a href="#overview">Overview</a><a href="#homes">Homes by risk</a><a href="#detail">Home detail</a><a href="#awaab">Awaab’s Law queue</a><a href="#check">Model check</a></nav>
      </header>
      <div class="notice warn"><div><b>Demo, no sign-in.</b> The homes, their sensors and forecasts are simulated in this browser by the digital twin. Photos and reports sent from the resident app appear here only when they were made in this same browser${D.ownPhotos || D.reports.some(r => r.own) ? ` (${plural(D.ownPhotos, 'photo')} and ${plural(D.reports.filter(r => r.own).length, 'report')} found)` : ' (none found yet)'}.</div></div>
      ${tilesHtml()}
      ${homesHtml()}
      <section class="sect" id="detail" aria-labelledby="detailTitle">${detailHtml()}</section>
      ${awaabHtml()}
      ${checkHtml()}`;
  }

  /* ---------------------------------------------------------------- (1) overview tiles */
  function tilesHtml() {
    const surfs = allSurfaces();
    const act = surfs.filter(x => x.s.level === 3), actHomes = new Set(act.map(x => x.tw.id)).size;
    const cross = surfs.filter(x => x.s.cross3 != null && x.s.cross3 > 0).length, already = surfs.filter(x => x.s.cross3 === 0).length;
    const sensors = surfs.filter(x => x.s.def.sensor).length;
    const people = D.twins.reduce((n, tw) => n + tw.home.adults + tw.home.children, 0);
    const open = openReports(), emg = open.filter(r => r.emergency).length, own = open.filter(r => r.own).length;
    const due = open.filter(r => r.overdue || r.soon).length, over = open.filter(r => r.overdue).length;
    const pr = photoRound();
    const tile = (label, value, unit, sub, cls, extra) => `<div class="tile${cls ? ' ' + cls : ''}"><span>${label}</span><b>${value}${unit ? `<small>${unit}</small>` : ''}</b><em>${sub}</em>${extra || ''}</div>`;
    return `<section class="sect" id="overview" aria-labelledby="ovTitle"><h2 id="ovTitle" class="sr">Overview</h2><div class="tiles">
      ${tile('Homes monitored', fmtN(D.twins.length), '', plural(people, 'resident') + ' · 1 home on the resident app')}
      ${tile('Surfaces monitored', fmtN(surfs.length), '', fmtN(sensors) + ' with a sensor · ' + fmtN(surfs.length - sensors) + ' estimated')}
      ${tile('At “Act now”', fmtN(act.length), act.length === 1 ? 'surface' : 'surfaces', 'visible mould likely this week' + (act.length ? ' · in ' + plural(actHomes, 'home') : ''), act.length ? 'bad' : '')}
      ${tile('Crossing index 3 within 7 days', fmtN(cross), cross === 1 ? 'surface' : 'surfaces', already ? fmtN(already) + ' more already at 3 or above' : 'none already at 3')}
      ${tile('Open resident reports', fmtN(open.length), '', fmtN(emg) + ' emergency · ' + fmtN(own) + ' from the resident app')}
      ${tile('Awaab’s Law: due within 3 working days', fmtN(due), due === 1 ? 'report' : 'reports', over ? `<span class="above">${fmtN(over)} overdue</span>` : 'none overdue', over ? 'bad' : due ? 'warn' : '')}
      ${tile('Photo check response', pct(pr.last.surfs, pr.total), '', 'week of ' + esc(fmtShort(pr.wk)) + ': ' + fmtN(pr.last.surfs) + ' of ' + fmtN(pr.total) + ' surfaces, ' + fmtN(pr.last.homes) + ' of ' + fmtN(D.twins.length) + ' homes · this week so far: ' + (pr.cur.homes ? plural(pr.cur.homes, 'home') : 'none yet'), '',
        `<div class="meter" aria-hidden="true"><i style="width:${pr.total ? (100 * pr.last.surfs / pr.total).toFixed(1) : 0}%"></i></div>`)}
    </div></section>`;
  }

  /* ---------------------------------------------------------------- (2) homes by risk */
  function homesHtml() {
    const rows = byRisk().map(tw => {
      const w = tw.worst, sel = tw.id === st.home, open = openReports(tw.id).length, last = lastPhoto(tw);
      const early = w.cross3 == null && w.crossEarly != null ? `<span class="small"${tipA('In the forecast range', 'Visible mould in ' + Math.round(100 * w.crossChance) + '% of the forecast runs')}>${esc(possibleWords(w))}</span>` : '';
      return `<tr class="click${sel ? ' sel' : ''}" data-home="${esc(tw.id)}">
        <th scope="row"><button type="button" class="rowbtn" data-act="home" data-id="${esc(tw.id)}"${sel ? ' aria-current="true"' : ''}>${esc(tw.home.name)}</button> <span class="code">${esc(tw.id)}</span>${tw.id === T.DEMO_ID ? ' <span class="pill">Resident app</span>' : ''}</th>
        <td>${esc(tw.home.household)}</td>
        <td>${esc(surfName(w))}</td>
        <td>${f2(w.Mnow)} → <b>${f2(w.M7)}</b> ${lvChip(w.level)}</td>
        <td>${esc(crossWords(w))}${early}</td>
        ${tw.counts.map(c => `<td class="n${c ? '' : ' zero'}">${c}</td>`).join('')}
        <td class="n"${tipA('Worst surface above its mould limit', f1(w.wetFcAvg) + ' h a day this coming week', f1(w.wetPastAvg) + ' h a day in the past week')}>${f1(w.wetFcAvg)}</td>
        <td class="n${open ? '' : ' zero'}">${open}</td>
        <td>${last ? esc(fmtDay(last)) + ` <span class="dim">· ${esc(ago(last))}</span>` : '—'}</td>
      </tr>`;
    }).join('');
    return `<section class="sect" id="homes" aria-labelledby="homesTitle">
      <div class="sect-h"><h2 id="homesTitle">Homes by risk</h2><p>Worst forecast first · choose a home to see its surfaces</p></div>
      <div class="tablewrap"><table>
        <caption class="sr">Monitored homes sorted by the worst surface’s forecast mould index in 7 days</caption>
        <thead><tr><th scope="col">Home</th><th scope="col">Household</th><th scope="col">Worst surface</th><th scope="col">Index now → in 7 days</th><th scope="col">Visible mould in</th>
          ${LV.map(l => `<th scope="col" class="n"><span class="sr">Surfaces at </span>${esc(l.n)}</th>`).join('')}
          <th scope="col" class="n">Damp h/day</th><th scope="col" class="n">Open reports</th><th scope="col">Last photo</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      <p class="tnote">VTT mould index 0–6: 3 is visible mould, below 3 only under a microscope. The level comes from the index expected in 7 days (Low below 1, Watch 1–2, High 2–3, Act now 3 or more). Level columns count each home’s monitored surfaces. Damp h/day: hours a day the worst surface is expected to spend above its mould limit this week.</p>
    </section>`;
  }
  function markSelected() {
    $$('#homes tr[data-home]').forEach(tr => {
      const on = tr.getAttribute('data-home') === st.home, b = $('button', tr);
      tr.classList.toggle('sel', on);
      if (b) { if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); }
    });
  }

  /* ---------------------------------------------------------------- (3) home detail */
  function detailHtml() {
    const tw = D.byId[st.home];
    if (!tw) return '<div class="sect-h"><h2 id="detailTitle" tabindex="-1">Home detail</h2></div><p class="tnote">Choose a home in the table above.</p>';
    const h = tw.home, s = tw.surface(st.surf) || tw.worst;
    const facts = [['Type', h.type], ['Built', h.built], ['Walls', h.walls], ['Windows', h.windows], ['Heating', h.heating], ['Ventilation', h.ventilation], ['Household', h.household],
      ['Open reports', String(openReports(tw.id).length)]];
    return `<div class="sect-h"><h2 id="detailTitle" tabindex="-1">${esc(h.name)} <span class="code">${esc(tw.id)}</span></h2>
        <p>${lvChip(tw.level)} worst: ${esc(surfName(tw.worst))}, ${f2(tw.worst.M7)} in 7 days</p></div>
      <div class="profile"><div class="facts">${facts.map(f => `<div><span>${esc(f[0])}</span><b>${esc(f[1])}</b></div>`).join('')}</div></div>
      <h3 class="sub-h">Monitored surfaces</h3>
      ${surfacesTable(tw, s)}
      ${surfaceFig(tw, s)}
      ${driversHtml(s)}
      <h3 class="sub-h">Prediction vs observation</h3>
      ${obsTable(tw)}`;
  }
  function surfacesTable(tw, sel) {
    const rows = tw.surfaces.slice().sort((a, b) => b.M7 - a.M7).map(s => {
      const on = s.id === sel.id, above = s.RHs >= s.RHc;
      return `<tr class="click${on ? ' sel' : ''}" data-surf="${esc(s.id)}">
        <td>${esc(s.room.name)}</td>
        <th scope="row"><button type="button" class="rowbtn" data-act="surf" data-id="${esc(s.id)}"${on ? ' aria-current="true"' : ''}>${esc(s.def.name)}</button></th>
        <td>${esc(s.def.material)}<span class="small">VTT: ${esc(s.cls.name)}</span></td>
        <td>${s.def.sensor ? `<span class="code">${esc(s.def.sensor)}</span>` : '<span class="dim">estimated</span>'}</td>
        <td class="n">${f1(s.Ts)} °C</td>
        <td class="n"${tipA('Surface humidity now', Math.round(s.RHs) + '% against a mould limit of ' + Math.round(s.RHc) + '% at ' + f1(s.Ts) + ' °C', above ? 'Above the limit: growth conditions' : 'Below the limit')}><span class="${above ? 'above' : ''}">${Math.round(s.RHs)}%</span> <span class="dim">/ ${Math.round(s.RHc)}%</span></td>
        <td class="n">${f2(s.Mnow)}</td>
        <td class="n"><b>${f2(s.M7)}</b> <span class="dim">(${f2(s.lo7)}–${f2(s.hi7)})</span></td>
        <td>${lvChip(s.level)}</td>
      </tr>`;
    }).join('');
    return `<div class="tablewrap"><table>
      <caption class="sr">Monitored surfaces in ${esc(tw.home.name)}, highest forecast first</caption>
      <thead><tr><th scope="col">Room</th><th scope="col">Surface</th><th scope="col">Material · VTT class</th><th scope="col">Sensor</th><th scope="col" class="n">Surface temp.</th><th scope="col" class="n">Surface RH / limit</th>
        <th scope="col" class="n">Index now</th><th scope="col" class="n">In 7 days (range)</th><th scope="col">Level</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
      <p class="tnote">“Estimated”: no sensor on this surface; the twin works it out from the room air. Surface RH in red is at or above the mould limit (the humidity above which mould can grow at that surface temperature).</p>`;
  }

  /* the surface chart: the last 28 days and the coming week, with its range */
  let charts = [];
  const addChart = (id, draw) => { charts = charts.filter(c => c.id !== id); charts.push({ id, draw }); };
  const svgOpen = (w, h) => `<svg width="${Math.max(10, Math.floor(w))}" height="${h}" viewBox="0 0 ${Math.max(10, Math.floor(w))} ${h}" aria-hidden="true" focusable="false">`;
  function drawCharts() {
    charts.forEach(c => $$('[data-chart="' + c.id + '"]').forEach(el => { const w = el.clientWidth; if (w) el.innerHTML = c.draw(w); }));
    lastW = document.documentElement.clientWidth;
  }
  let lastW = 0, rz;
  window.addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { if (document.documentElement.clientWidth !== lastW && charts.length) { hideTip(); drawCharts(); } }); });

  function surfaceFig(tw, s) {
    const id = 'surf', open = st.tables.has(id);
    addChart(id, w => surfaceSvg(w, tw, s));
    const label = `Mould index of the ${s.room.name} ${s.def.name.toLowerCase()} over the last ${PAST_DAYS} days and the 7-day forecast: ${f2(s.Mnow)} now, ${f2(s.M7)} in 7 days (range ${f2(s.lo7)} to ${f2(s.hi7)}). Index 3 is visible mould. Open the table for the daily values.`;
    // one row per 24 hours, ending at the hour of now
    const rows = [];
    for (let d = -PAST_DAYS; d <= T.FC_DAYS; d++) {
      const i = tw.NP + d * 24, j = i - tw.NP;
      let wet = 0; for (let k = Math.max(0, i - 24); k < i; k++) wet += s.series.fav[k];
      rows.push(`<tr><td>${esc(fmtStamp(tw.t(i)))}${d === 0 ? ' <span class="pill">now</span>' : ''}</td><td class="n">${f2(s.series.M[i])}</td><td class="n">${j > 0 ? f2(s.lo[j]) + '–' + f2(s.hi[j]) : '—'}</td><td class="n">${wet}</td></tr>`);
    }
    const table = `<table><caption class="sr">Daily values for the chart</caption><thead><tr><th scope="col">Time</th><th scope="col" class="n">Index</th><th scope="col" class="n">Forecast range</th><th scope="col" class="n">Damp hours in the 24 h before</th></tr></thead><tbody>${rows.reverse().join('')}</tbody></table>`;
    const crossLine = s.cross3 === 0 ? 'already at visible mould' : s.cross3 != null ? 'visible mould ' + inDays(s.cross3).replace('~', 'in about ') : s.crossEarly != null ? 'visible mould ' + possibleWords(s).replace('~', 'in about ') + ' (' + Math.round(100 * s.crossChance) + '% of forecast runs)' : 'not visible this week';
    return `<figure aria-labelledby="f-${id}">
      <div class="fhead"><div><figcaption id="f-${id}">${esc(surfName(s))}</figcaption><div class="fsub">${esc(s.def.where)} · ${esc(s.def.element)}</div></div>
        <div class="fbtns"><button class="tbtn" type="button" data-act="table" data-id="${id}" aria-controls="tb-${id}" aria-expanded="${open}">${open ? 'Chart' : 'Table'}</button></div></div>
      <div class="fview" id="cv-${id}"${open ? ' hidden' : ''}>
        <div class="svgbox" data-chart="${id}" role="img" aria-label="${esc(label)}"></div>
        <div class="hlegend"><span class="lg-line">Index so far</span><span class="lg-dash">Forecast</span><span class="lg-band">Forecast range</span><span class="lg-vis">3 · visible mould</span>
          <span><i class="sw sw0"></i><i class="sw sw1"></i><i class="sw sw2"></i><i class="sw sw3"></i> bands: Low · Watch · High · Act now</span></div>
      </div>
      <div class="ftable" id="tb-${id}"${open ? '' : ' hidden'}>${table}</div>
      <div class="facts2"><span>Now <b>${f2(s.Mnow)}</b> · ${esc(s.stage.t.toLowerCase())}</span><span>In 7 days <b>${f2(s.M7)}</b> (${f2(s.lo7)}–${f2(s.hi7)}) ${lvChip(s.level)}</span>
        <span>${esc(crossLine)}</span><span>Damp <b>${f1(s.wetFcAvg)} h</b> a day this week (past week ${f1(s.wetPastAvg)} h)</span></div>
    </figure>`;
  }
  function surfaceSvg(w, tw, s) {
    const H = 260, pl = 28, pr = 12, pt = 14, pb = 28, pw = Math.max(40, w - pl - pr), ph = H - pt - pb;
    const M = s.series.M, a = tw.NP - PAST_DAYS * 24, b = tw.N - 1, span = b - a;
    let top = 0;
    for (let i = a; i <= b; i++) if (M[i] > top) top = M[i];
    for (let j = 0; j < s.hi.length; j++) if (s.hi[j] > top) top = s.hi[j];
    const yMax = Math.min(6, Math.max(4, Math.ceil(top + .3)));
    const X = i => pl + (i - a) / span * pw, Y = v => pt + (1 - Math.max(0, Math.min(v, yMax)) / yMax) * ph;
    const xs = i => X(i).toFixed(1), ys = v => Y(v).toFixed(1);
    let o = svgOpen(w, H);
    // index bands, shaded in the level colours
    [[0, 1], [1, 2], [2, 3], [3, yMax]].forEach((r, l) => { o += `<rect class="yb${l}" x="${pl}" y="${ys(r[1])}" width="${pw.toFixed(1)}" height="${(Y(r[0]) - Y(r[1])).toFixed(1)}"/>`; });
    for (let v = 0; v <= yMax; v++) o += `<line class="${v ? 'gl' : 'bl'}" x1="${pl}" x2="${(pl + pw).toFixed(1)}" y1="${ys(v)}" y2="${ys(v)}"/><text class="ax" x="${pl - 6}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${v}</text>`;
    o += `<line class="vis" x1="${pl}" x2="${(pl + pw).toFixed(1)}" y1="${ys(3)}" y2="${ys(3)}"/><text class="vist" x="${pl + 6}" y="${(Y(3) - 5).toFixed(1)}">visible</text>`;
    // a tick every 7 days, dated (fewer labels when narrow)
    const narrow = pw < 360;
    for (let d = -PAST_DAYS; d <= T.FC_DAYS; d += 7) {
      const i = tw.NP + d * 24, x = xs(i);
      o += `<line class="bl" x1="${x}" x2="${x}" y1="${pt + ph}" y2="${pt + ph + 4}"/>`;
      if (!narrow || d % 14 === 0 || d === T.FC_DAYS) o += `<text class="ax" x="${x}" y="${H - 8}" text-anchor="${d === -PAST_DAYS ? 'start' : d === T.FC_DAYS ? 'end' : 'middle'}">${d === 0 ? 'Now' : esc(fmtShort(tw.t(i)))}</text>`;
    }
    o += `<line class="nowl" x1="${xs(tw.NP)}" x2="${xs(tw.NP)}" y1="${pt}" y2="${pt + ph}"/>`;
    // the forecast range, then the record (solid) and the forecast (dashed), a point every 2 hours
    const every2 = (i0, i1) => { const out = []; for (let i = i0; i < i1; i += 2) out.push(i); out.push(i1); return out; };
    const fcIdx = every2(0, tw.NF);
    const band = fcIdx.map((j, k) => (k ? 'L' : 'M') + xs(tw.NP + j) + ',' + ys(s.hi[j])).join('') + fcIdx.slice().reverse().map(j => 'L' + xs(tw.NP + j) + ',' + ys(s.lo[j])).join('');
    o += `<path class="band" d="${band}Z"/>`;
    const path = (i0, i1) => every2(i0, i1).map((i, k) => (k ? 'L' : 'M') + xs(i) + ',' + ys(M[i])).join('');
    o += `<path class="mline" d="${path(a, tw.NP)}"/><path class="fline" d="${path(tw.NP, b)}"/>`;
    o += `<circle class="mdot" cx="${xs(tw.NP)}" cy="${ys(M[tw.NP])}" r="4"/><circle class="fdot" cx="${xs(b)}" cy="${ys(M[b])}" r="4"/>`;
    // hover targets: one per 24 hours, ending at the hour of now
    for (let d = -PAST_DAYS; d < T.FC_DAYS; d++) {
      const i0 = tw.NP + d * 24, i1 = i0 + 24, fc = d >= 0;
      let wet = 0; for (let k = i0; k < i1; k++) wet += s.series.fav[k];
      const t = tipA(fmtStamp(tw.t(i1)), (fc ? 'Forecast ' : 'Index ') + f2(M[i1]) + (fc ? ' (range ' + f2(s.lo[i1 - tw.NP]) + '–' + f2(s.hi[i1 - tw.NP]) + ')' : ''), 'Damp ' + wet + ' of the 24 hours before');
      o += `<rect class="hit" x="${xs(i0)}" y="${pt}" width="${(X(i1) - X(i0)).toFixed(1)}" height="${ph}"${t}/>`;
    }
    return o + '</svg>';
  }

  /* what drives the forecast: landlord actions and household factors (never one blamed for the other) */
  function driversHtml(s) {
    const ds = s.drivers, mxE = Math.max(.02, ...ds.map(d => Math.abs(d.eff))), mxW = Math.max(1, ...ds.map(d => Math.abs(s.wetFcAvg - d.wet)));
    const bar = (v, mx) => `<i style="width:${Math.max(0, Math.min(100, 100 * v / mx)).toFixed(1)}%"></i>`;
    const row = (d, verb) => {
      const wet = s.wetFcAvg - d.wet, none = Math.abs(d.eff) < .005 && Math.abs(wet) < .05;
      return `<div class="drv"><div class="drv-h"><b>${esc(d.short)}</b><span>${esc(d.why)}</span></div>
        <div class="hb"${tipA(d.short, 'Index by the end of the week: ' + f2(s.M7) + ' with it, ' + f2(d.M7) + ' without it')}><span class="lb">Index</span><span class="tr">${bar(d.eff, mxE)}</span><span class="vv"><b>${signed(d.eff, 2)}</b> by day 7</span></div>
        <div class="hb"${tipA(d.short, 'Hours a day above the mould limit: ' + f1(s.wetFcAvg) + ' with it, ' + f1(d.wet) + ' without it')}><span class="lb">Damp hours</span><span class="tr wet">${bar(wet, mxW)}</span><span class="vv"><b>${signed(wet, 1)} h</b> a day</span></div>
        ${none ? '<p class="tnote">Little effect on this surface this week.</p>' : ''}
        ${d.tip ? `<p class="act"><i>${verb}:</i> ${esc(d.tip)}</p>` : ''}</div>`;
    };
    const combo = (steps, who) => `<p class="combo">${who} together: index in 7 days <b>${f2(steps.M7)}</b> instead of ${f2(s.M7)} · damp <b>${f1(steps.wet)} h</b> a day instead of ${f1(s.wetFcAvg)} h</p>`;
    const L = ds.filter(d => d.who === 'landlord'), Hh = ds.filter(d => d.who === 'home'), W = ds.find(d => d.who === 'weather');
    return `<h3 class="sub-h">What drives this forecast</h3>
      <p class="tnote">Each factor is the same week re-run without it: how much it adds to the index by day 7, and to the hours a day the surface spends above its mould limit. Factors overlap, so they do not add up exactly.</p>
      <div class="drivers">
        <div class="dcol"><h3>Landlord actions</h3><p>Repairs and improvements that would lower this forecast.</p>
          ${L.length ? L.map(d => row(d, 'Action')).join('') + combo(s.landlordSteps, 'All landlord actions') : '<p class="tnote">None of the modelled repairs (thermal bridge, extractor fan) applies to this surface. An inspection may still find others.</p>'}</div>
        <div class="dcol"><h3>Household factors (advice shared with the resident)</h3><p>Everyday living puts moisture into every home. These go to the resident as advice; they never replace repairs or delay an investigation.</p>
          ${Hh.length ? Hh.map(d => row(d, 'Advice')).join('') + combo(s.homeSteps, 'All of the advice') : '<p class="tnote">No household factor modelled for this surface.</p>'}</div>
      </div>
      ${W ? `<p class="tnote"><b>Weather</b> (context): ${esc(W.why)} This week it changes the index by ${signed(W.eff, 2)} by day 7 and the damp hours by ${signed(s.wetFcAvg - W.wet, 1)} h a day.</p>` : ''}`;
  }

  /* prediction vs observation for one home: the weekly photos, microscope samples and the resident's own photos */
  function obsWords(o) {
    if (o.kind === 'micro') return o.obsIdx != null ? 'Index ' + o.obsIdx + ' under the microscope' : (OBS_W[o.obs] || '—') + ' (sample)';
    return o.obs ? OBS_W[o.obs] : 'Not recorded';
  }
  function agreeCell(o) {
    const a = agreeOf(o);
    if (a == null) return '<span class="dim">—</span>';
    const say = o.kind === 'micro' && o.obsIdx != null ? 'Agree means the model was within one index step of the sample.' : 'A photo tells below 3 (nothing visible) or the visible class (3, 4 or 5).';
    return `<span class="ag ${a ? 'ok' : 'no'}"${tipA(a ? 'Agree' : 'Disagree', 'Model ' + f2(o.pred) + ' · seen: ' + obsWords(o), say)}>${a ? 'Agree' : 'Disagree'}</span>`;
  }
  function thumb(img, cap) {
    return img ? `<button type="button" class="thumbbtn" data-act="photo" data-cap="${esc(cap)}" aria-label="Open the photo: ${esc(cap)}"><img class="thumb" src="${esc(img)}" alt="" width="44" height="44" loading="lazy"></button>` : '';
  }
  function obsTable(tw) {
    const list = D.obs[tw.id];
    if (!list.length) return '<p class="tnote">No photos or samples from this home yet.</p>';
    const rows = list.map(o => {
      const s = tw.surface(o.surface), name = s ? surfName(s) : 'Surface not in the twin (' + o.surface + ')';
      const from = o.kind === 'micro' ? 'Microscope sample · research team' : o.own ? 'Resident’s photo · resident app' : 'Weekly photo · resident';
      const extra = o.own ? [o.signs && o.signs.length ? 'Also: ' + o.signs.map(x => has(SIGN_W, x) ? SIGN_W[x] : pretty(x)).join(', ') : '', o.note ? '“' + o.note + '”' : ''].filter(Boolean) : [];
      return `<tr><td>${esc(fmtStamp(o.ts))}</td><td>${esc(name)}</td>
        <td>${esc(from)}${o.own ? ' <span class="pill">this browser</span>' : ''}${o.own ? '<br>' + thumb(o.img, name + ', ' + fmtStamp(o.ts)) : ''}</td>
        <td class="wrap">${esc(obsWords(o))}${extra.map(x => `<span class="small">${esc(x)}</span>`).join('')}</td>
        <td class="n">${f2(o.pred)}</td><td>${agreeCell(o)}</td></tr>`;
    }).join('');
    const n = list.filter(o => agreeOf(o) != null), ok = n.filter(o => agreeOf(o)).length;
    return `<div class="tablewrap short"><table>
      <caption class="sr">Observations in ${esc(tw.home.name)} against the model’s index at the time</caption>
      <thead><tr><th scope="col">Date</th><th scope="col">Surface</th><th scope="col">From</th><th scope="col">What was seen</th><th scope="col" class="n">Model’s index then</th><th scope="col">Result</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
      <p class="tnote">${fmtN(ok)} of ${fmtN(n.length)} agree (${pct(ok, n.length)}). A photo agrees when the model said below 3 and nothing was visible, or its index was within half a class of the visible class seen.</p>`;
  }

  /* ---------------------------------------------------------------- (4) Awaab's Law queue */
  function leftCell(r) {
    if (!r.open) return `<span class="left">Met</span><span class="small">${r.metAt ? 'inspected ' + esc(fmtDay(r.metAt)) : 'closed'}</span>`;
    if (r.emergency) {
      const h = r.hoursLeft;
      if (r.overdue) return `<span class="left over">Overdue by ${Math.max(1, Math.round(-h))} h</span>`;
      return `<span class="left soon">${h < 1 ? 'Under 1 h' : Math.floor(h) + ' h'} left</span>`;
    }
    if (r.overdue) { const n = T.workingDaysBetween(r.due, D.now); return `<span class="left over">${n > 0 ? 'Overdue by ' + plural(n, 'working day') : 'Overdue since ' + esc(hhmm(new Date(r.due)))}</span>`; }
    if (r.wdLeft <= 0) return `<span class="left soon">Due today, ${esc(hhmm(new Date(r.due)))}</span>`;
    return `<span class="left${r.soon ? ' soon' : ''}">${plural(r.wdLeft, 'working day')}</span>`;
  }
  function twinNote(r) {
    const tw = D.byId[r.home]; if (!tw) return '';
    let s = r.surface ? tw.surface(r.surface) : null;
    if (!s && r.room) { const rm = tw.room(r.room); s = rm ? rm.worst : null; }
    if (!s) s = tw.worst;
    return `<span class="twin">Twin: ${esc(surfName(s))} · ${f2(s.Mnow)} → ${f2(s.M7)} ${lvChip(s.level)}</span>`;
  }
  function awaabHtml() {
    const list = D.reports.slice().sort((a, b) => (b.open - a.open) || (a.open ? a.due - b.due : b.ts - a.ts));
    const rows = list.map(r => {
      const tw = D.byId[r.home], rm = tw && r.room ? tw.room(r.room) : null, sf = tw && r.surface ? tw.surface(r.surface) : null;
      const where = sf ? surfName(sf) : rm ? rm.def.name : '';
      const cls = !r.open ? 'closed' : r.overdue ? 'overdue' : r.soon ? 'soon' : '';
      const flag = !r.open ? '<span class="flag closed">Closed</span>' : r.overdue ? '<span class="flag over">Overdue</span>' : r.soon ? '<span class="flag soon">Due soon</span>' : '';
      return `<tr${cls ? ` class="${cls}"` : ''}>
        <td>${esc(fmtStamp(r.ts))}<span class="small">${esc(ago(r.ts))}</span></td>
        <td><button type="button" class="rowbtn" data-act="home" data-id="${esc(r.home)}">${esc(tw ? tw.home.name : r.home)}</button> <span class="code">${esc(r.home)}</span></td>
        <td class="wrap"><b>${esc(r.problem)}</b>${where ? ' · ' + esc(where) : ''}${r.detail ? `<span class="small">${esc(r.detail)}</span>` : ''}${twinNote(r)}${thumb(r.img, r.problem + (where ? ', ' + where : '') + ', ' + fmtStamp(r.ts))}</td>
        <td>${r.emergency ? '<span class="flag emg">Emergency</span>' : '<span class="flag std">Standard</span>'}</td>
        <td>${r.emergency ? 'Make safe by' : 'Investigate by'}<span class="small">${esc(fmtStamp(r.due))}</span></td>
        <td>${leftCell(r)}</td>
        <td class="wrap">${flag} ${esc(r.status)}${r.own ? ' <span class="pill">Resident app</span>' : ''}</td>
      </tr>`;
    }).join('');
    return `<section class="sect" id="awaab" aria-labelledby="awaabTitle">
      <div class="sect-h"><h2 id="awaabTitle">Awaab’s Law queue</h2><p>Nearest deadline first, overdue at the top</p></div>
      <p class="lead">Investigate a potential damp and mould hazard within <b>10 working days</b> of becoming aware of it; deal with an <b>emergency</b> hazard within <b>24 hours</b>; once a significant hazard is found, <b>begin repairs within 5 working days</b>. Working days skip weekends and bank holidays in England and Wales. “Due soon”: 3 working days or fewer left.</p>
      <div class="tablewrap"><table>
        <caption class="sr">Resident reports with their Awaab’s Law deadlines</caption>
        <thead><tr><th scope="col">Received</th><th scope="col">Home</th><th scope="col">Problem</th><th scope="col">Hazard</th><th scope="col">Deadline</th><th scope="col">Time left</th><th scope="col">Status</th></tr></thead>
        <tbody>${rows}</tbody></table></div>
      <p class="tnote">Demo reports are placed relative to the current hour. Reports sent from the resident app in this browser are added with the status “New”.</p>
    </section>`;
  }

  /* ---------------------------------------------------------------- (5) model check (validation) */
  function checkHtml() {
    const all = [].concat(...D.twins.map(tw => D.obs[tw.id].map(o => ({ o, s: tw.surface(o.surface) })))).filter(x => x.s && x.o.pred != null);
    const photos = all.filter(x => x.o.kind === 'photo' && x.o.obs), micro = all.filter(x => x.o.kind === 'micro');
    const q = list => { const c = { a: 0, b: 0, c: 0, d: 0 }; list.forEach(x => { const hi = x.o.pred >= 3, vis = x.o.obs !== 'none'; c[hi ? (vis ? 'd' : 'c') : (vis ? 'b' : 'a')]++; }); return c; };
    const m = q(photos), n = photos.length, agree = m.a + m.d;
    const exact = photos.filter(x => T.agrees(x.o)).length, mOk = micro.filter(x => T.agrees(x.o)).length;
    const cell = (v, ok, word) => `<td class="n ${ok ? 'ok' : 'no'}">${fmtN(v)}<small>${word}</small></td>`;
    const byCls = Object.keys(T.CLASSES).map(k => { const list = photos.filter(x => x.s.def.cls === k); return { c: T.CLASSES[k], n: list.length, m: q(list) }; }).filter(x => x.n);
    return `<section class="sect" id="check" aria-labelledby="checkTitle">
      <div class="sect-h"><h2 id="checkTitle">Model check</h2><p>Forecasts against what residents’ photos showed, all homes</p></div>
      <div class="tiles">
        <div class="tile"><span>Photos compared</span><b>${fmtN(n)}</b><em>from ${plural(new Set(photos.map(x => x.o.home)).size, 'home')} · ${plural(photos.filter(x => x.o.own).length, 'from this browser', 'from this browser')}</em></div>
        <div class="tile"><span>In agreement</span><b>${pct(agree, n)}</b><em>${fmtN(agree)} of ${fmtN(n)}: visible or not</em><div class="meter" aria-hidden="true"><i style="width:${n ? (100 * agree / n).toFixed(1) : 0}%"></i></div></div>
        <div class="tile"><span>Microscope samples</span><b>${fmtN(micro.length)}</b><em>${micro.length ? fmtN(mOk) + ' agree within one index step' : 'none taken yet'} · counted separately</em></div>
      </div>
      <div class="check">
        <div class="tablewrap"><table class="matrix">
          <caption class="sr">Agreement between the forecast index and the photos</caption>
          <thead><tr><th scope="col">Model’s index when the photo was taken</th><th scope="col" class="n">Photo: nothing visible</th><th scope="col" class="n">Photo: visible mould</th><th scope="col" class="n">All</th></tr></thead>
          <tbody>
            <tr><th scope="row">Below 3</th>${cell(m.a, true, 'agree')}${cell(m.b, false, 'missed')}<td class="n">${fmtN(m.a + m.b)}</td></tr>
            <tr><th scope="row">3 or more</th>${cell(m.c, false, 'false alarm')}${cell(m.d, true, 'agree')}<td class="n">${fmtN(m.c + m.d)}</td></tr>
            <tr><th scope="row">All</th><td class="n">${fmtN(m.a + m.c)}</td><td class="n">${fmtN(m.b + m.d)}</td><td class="n">${fmtN(n)}</td></tr>
          </tbody></table></div>
        <div class="tablewrap"><table>
          <caption class="sr">Disagreements by VTT material class</caption>
          <thead><tr><th scope="col">VTT material class</th><th scope="col" class="n">Photos</th><th scope="col" class="n">Agree</th><th scope="col" class="n">Model too low</th><th scope="col" class="n">Model too high</th></tr></thead>
          <tbody>${byCls.map(x => `<tr><th scope="row">${esc(x.c.name)}<span class="small">${esc(x.c.eg)}</span></th><td class="n">${fmtN(x.n)}</td><td class="n">${pct(x.m.a + x.m.d, x.n)}</td><td class="n${x.m.b ? ' above' : ' zero'}">${fmtN(x.m.b)}</td><td class="n${x.m.c ? ' above' : ' zero'}">${fmtN(x.m.c)}</td></tr>`).join('')}</tbody></table></div>
      </div>
      <p class="lead">Each photo is set against the twin’s index for that surface at the hour it was taken. A photo can only tell below 3 (nothing visible) from visible mould, so microscope samples, which read indices 0 to 2, are counted separately. Counting the coverage class as well (a few spots, a patch, more than half), ${fmtN(exact)} of ${fmtN(n)} photos agree. <b>Disagreements feed the recalibration of the VTT parameters for each material (RES3 Objective 4):</b> a material whose photos keep showing more mould than forecast needs faster growth, one showing less needs slower.</p>
    </section>`;
  }

  /* ================================================================ drawing and events */
  function render() {
    hideTip();
    charts = [];
    try { main.innerHTML = pageHtml(); drawCharts(); }
    catch (e) {
      console.error(e);
      main.innerHTML = `<div class="notice bad" role="alert"><div><b>Something went wrong drawing this page.</b><br>${esc(e && e.message)}. Reload the page to try again.</div></div>`;
    }
  }
  function renderDetail() {
    hideTip();
    const sec = $('#detail'); if (!sec) return;
    try { sec.innerHTML = detailHtml(); drawCharts(); }
    catch (e) { console.error(e); sec.innerHTML = `<div class="notice bad" role="alert"><div><b>This home could not be drawn.</b><br>${esc(e && e.message)}.</div></div>`; }
  }
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function selectHome(id, scroll) {
    const tw = D.byId[id]; if (!tw) return;
    if (st.home !== id) { st.home = id; st.surf = tw.worst.id; }
    markSelected(); renderDetail();
    if (scroll) {
      const sec = $('#detail');
      sec.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
      const h = $('#detailTitle'); if (h) h.focus({ preventScroll: true });
    }
  }
  function selectSurface(id) {
    st.surf = id; renderDetail();
    const b = $('#detail [data-act="surf"][data-id="' + cssId(id) + '"]'); if (b) b.focus({ preventScroll: true });
  }
  function toggleTable(id, btn) {
    const open = !st.tables.has(id);
    if (open) st.tables.add(id); else st.tables.delete(id);
    const cv = $('#cv-' + id), tb = $('#tb-' + id);
    if (cv) cv.hidden = open;
    if (tb) tb.hidden = !open;
    btn.textContent = open ? 'Chart' : 'Table';
    btn.setAttribute('aria-expanded', String(open));
    if (!open) drawCharts();
  }
  function openPhoto(btn) {
    const dlg = $('#photoDlg'), img = $('img', btn);
    if (!dlg || !img) return;
    $('#photoImg').src = img.src;
    $('#photoImg').alt = 'Photo: ' + (btn.getAttribute('data-cap') || '');
    $('#photoCap').textContent = btn.getAttribute('data-cap') || '';
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  }
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('[data-act]');
    if (t) {
      const act = t.getAttribute('data-act'), id = t.getAttribute('data-id');
      if (act === 'home') selectHome(id, true);
      else if (act === 'surf') selectSurface(id);
      else if (act === 'table') toggleTable(id, t);
      else if (act === 'photo') openPhoto(t);
      return;
    }
    // a click anywhere on a table row does what the row's button does
    const tr = e.target.closest && e.target.closest('tr[data-home], tr[data-surf]');
    if (!tr || e.target.closest('a, button, input, select, textarea')) return;
    if (window.getSelection && String(window.getSelection())) return;      // leave text selection alone
    if (tr.hasAttribute('data-home')) selectHome(tr.getAttribute('data-home'), true);
    else selectSurface(tr.getAttribute('data-surf'));
  });

  /* ================================================================ start, and stay current */
  function refresh() {
    const y = window.scrollY;
    D = load();
    if (!D.twins.length) { main.innerHTML = '<div class="empty">The twin has no homes to show.</div>'; return; }
    if (!D.byId[st.home]) { st.home = byRisk()[0].id; st.surf = null; }
    if (!D.byId[st.home].surface(st.surf)) st.surf = D.byId[st.home].worst.id;
    render();
    window.scrollTo(0, y);
  }
  const ver = $('#appVer'); if (ver) ver.textContent = APP + (cfg.appVersion ? ' ' + cfg.appVersion : '');
  const nm = $('#appName'); if (nm) nm.textContent = APP;
  refresh();
  // the resident app saving a photo or report in another tab of this browser
  window.addEventListener('storage', e => { if (e.key === null || e.key === 'mc_photos' || e.key === 'mc_reports') refresh(); });
  // a new hour: the twin moves on (checked when the page comes back into view, and every five minutes)
  const hourMoved = () => D && Math.floor(Date.now() / HOUR) * HOUR !== D.tnow;
  document.addEventListener('visibilitychange', () => { if (!document.hidden && hourMoved()) refresh(); });
  setInterval(() => { if (!document.hidden && hourMoved()) refresh(); }, 5 * 60e3);
})();
