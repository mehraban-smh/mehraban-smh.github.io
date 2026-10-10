/* Home Comfort NY (SUNY ESF) - research dashboard, /homecomfort-ny/dashboard/.
 *
 * Behavior ported from the SWITCH dashboard (sign-in with the research login, the approval queue with Approve and
 * Remove, the "database not updated" notice, local mode, Refresh, CSV and Excel downloads), drawn in the "Aurora"
 * design with ../brand.css and ../icons.js. Every chart is inline SVG or HTML built by the small helpers below,
 * and every chart has a "Table" view with the numbers.
 *
 * Data comes only through window.HC (../api.js): HC.login, HC.fetchAll, HC.fetchParticipants, HC.setApproval,
 * HC.removeParticipant, HC.localRows. The one extra read is the list of registered phones (participant, enabled,
 * paused_until), used for the "Paused" flag and the profile's Reminders line; when it cannot be read the dashboard
 * shows no flag and says the reminders are unknown.
 *
 * Browser storage (all keys start "hcny_"): sessionStorage hcny_token, hcny_email, hcny_token_exp (the research
 * login, this tab only); localStorage hcny_dash_units and hcny_dash_range (display preferences only).
 */
(function () {
  'use strict';

  const HC = window.HC, HCI = window.HCI;
  const app = document.getElementById('app');
  if (!HC || !HCI) {
    app.innerHTML = '<div class="state"><p>The dashboard could not load its files (config.js, api.js or icons.js). Check the connection and reload the page.</p></div>';
    return;
  }
  const cfg = HC.cfg || {};

  /* ---------------------------------------------------------------- study constants */
  const ENROLLMENT_TARGET = 60;   // [PLACEHOLDER] the recruitment target in the approved protocol
  const QUIET_DAYS = 2;           // "Quiet N days" once a participant has not checked in for this many days
  const TABLE_CAP = 400;          // rows shown in the check-ins table (downloads have everything)
  const DAILY_GOAL = Number(cfg.dailyGoal) || 3;
  const TZ = cfg.timeZone || undefined;
  const EXPIRED = 'Your session has expired, please sign in again';

  const COLS = ['participant', 'local_time', 'ts', 'prompt', 'at_home', 'tsv', 'clo', 'garments', 'met', 'activity', 'room', 'air', 'sun', 'actions', 'notes', 'same_as_last', 'seconds', 'app_version', 'client_id'];
  const NUM_COLS = new Set(['tsv', 'clo', 'met', 'seconds']);
  const PCOLS = ['code', 'name', 'email', 'gender', 'birth_year', 'height_cm', 'weight_kg', 'sensitivity', 'units', 'approved', 'created_at'];
  const PNUM = new Set(['birth_year', 'height_cm', 'weight_kg']);
  const HOME_KEYS = ['zip', 'home_type', 'tenure', 'year_built', 'floors', 'unit_floor', 'floor_area_m2', 'bedrooms', 'rooms', 'adults', 'children', 'pets', 'heating', 'cooling', 'thermostat', 'setpoint_winter_c', 'setpoint_summer_c', 'windows', 'windows_open', 'facing', 'draftiness'];
  const HOME_NUM = new Set(['floors', 'unit_floor', 'floor_area_m2', 'bedrooms', 'rooms', 'adults', 'children', 'pets', 'setpoint_winter_c', 'setpoint_summer_c', 'draftiness']);

  /* ---------------------------------------------------------------- words for stored values */
  const L = {
    home_type: { detached: 'Detached house', townhouse: 'Townhouse / row house', duplex: 'Duplex / 2-family', apartment: 'Apartment / condo', mobile: 'Mobile home', dorm: 'Dorm / student housing', other: 'Something else' },
    home_short: { detached: 'Detached', townhouse: 'Townhouse', duplex: 'Duplex', apartment: 'Apartment', mobile: 'Mobile home', dorm: 'Dorm', other: 'Other home' },
    tenure: { own: 'Owned', rent: 'Rented', other: 'Other' },
    year_built: { pre1940: 'Before 1940', '1940_1969': '1940–1969', '1970_1989': '1970–1989', '1990_2009': '1990–2009', '2010_plus': '2010 or later', unsure: 'Not sure' },
    heating: { furnace: 'Forced-air furnace', heat_pump: 'Heat pump', mini_split: 'Ductless mini-split', boiler: 'Boiler & radiators', baseboard: 'Electric baseboard', stove: 'Wood / pellet stove', other: 'Other heating', none: 'No heating' },
    heat_short: { furnace: 'Furnace', heat_pump: 'Heat pump', mini_split: 'Mini-split', boiler: 'Boiler', baseboard: 'Baseboard', stove: 'Stove', other: 'Other heat', none: 'No heating' },
    cooling: { central_ac: 'Central AC', window_ac: 'Window units', mini_split: 'Ductless mini-split', portable_ac: 'Portable AC', fans: 'Fans only', none: 'No cooling' },
    thermostat: { manual: 'Manual', programmable: 'Programmable', smart: 'Smart thermostat', landlord: 'Set by landlord', none: 'No thermostat' },
    windows: { single: 'Single pane', double: 'Double pane', triple: 'Triple pane', unsure: 'Not sure' },
    windows_open: { yes: 'Can be opened', some: 'Some can be opened', no: 'Cannot be opened' },
    facing: { N: 'North', NE: 'Northeast', E: 'East', SE: 'Southeast', S: 'South', SW: 'Southwest', W: 'West', NW: 'Northwest', unsure: 'Not sure' },
    draftiness: { 1: 'Never drafty', 2: 'Rarely drafty', 3: 'Sometimes drafty', 4: 'Often drafty', 5: 'Very drafty' },
    gender: { woman: 'Woman', man: 'Man', non_binary: 'Non-binary', self_describe: 'Another identity', prefer_not: 'Prefer not to say' },
    sensitivity: { cold: 'Feels the cold easily', average: 'About average', warm: 'Feels the warmth easily' },
    prompt: { scheduled: 'From a reminder', self: 'Self-started' },
    at_home: { long: 'Home over an hour', recent: 'Just got in' },
    activity: { sleep: 'Sleeping', lying: 'Lying down', sit: 'Sitting relaxed', desk: 'Desk work', stand: 'Standing', house: 'Cooking or housework', walk: 'Walking around', exercise: 'Exercising' },
    room: { living: 'Living room', bedroom: 'Bedroom', kitchen: 'Kitchen', office: 'Home office', bathroom: 'Bathroom', basement: 'Basement', other: 'Elsewhere' },
    air: { still: 'Still air', slight: 'Slight breeze', drafty: 'Drafty', draughty: 'Drafty' },
    sun: { yes: 'Sun on me', no: 'No direct sun', dark: 'It’s dark' },
    actions: { win_open: 'Opened a window', win_close: 'Closed a window', heat_up: 'Turned the heat up', heat_down: 'Turned the heat down or off', ac_up: 'Turned the AC on or up', ac_down: 'Turned the AC down or off', fan: 'Fan on', layer_on: 'Put on a layer', layer_off: 'Took off a layer', blanket: 'Got a blanket', curtains: 'Closed blinds or curtains', moved: 'Moved room' },
    notes: { hot_drink: 'Hot drink', cold_drink: 'Cold drink', ate: 'Just ate', hungry: 'Hungry', tired: 'Tired', unwell: 'Feeling unwell' },
    garments: { tshirt: 'T-shirt', long: 'Long sleeves', sweater: 'Sweater', hoodie: 'Hoodie or fleece', shorts: 'Shorts', pants: 'Pants or jeans', sweatpants: 'Sweatpants', skirt: 'Skirt or dress', socks: 'Socks', slippers: 'Slippers', blanket: 'Blanket', comforter: 'Comforter' }
  };   // the ids are the ones checkin/questions.js stores; keep the two in step
  const pretty = v => { const s = String(v == null ? '' : v).replace(/[_-]+/g, ' ').trim(); return s ? s[0].toUpperCase() + s.slice(1) : ''; };
  const lab = (group, v) => (v === null || v === undefined || v === '') ? '' : ((L[group] && L[group][v]) || pretty(v));
  const known = (group, v) => !!(L[group] && Object.prototype.hasOwnProperty.call(L[group], v));
  const artOf = (group, v, cls) => HCI.art(known(group, v) ? group + ':' + v : 'unsure', cls);

  /* ---------------------------------------------------------------- small helpers */
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (n, c) => HCI.icon(n, c);
  const fmtN = n => Number(n).toLocaleString('en-US');
  const pct = (a, b) => b ? Math.round(100 * a / b) + '%' : '–';
  const signed = v => HCI.signed(v);
  const num = v => { if (v === null || v === undefined || v === '' || typeof v === 'boolean') return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
  const plural = (n, one, many) => fmtN(n) + ' ' + (n === 1 ? one : (many || one + 's'));
  const median = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
  const round1 = x => Math.round(x * 10) / 10;
  /* The earliest day number in a list of prepared rows, Infinity when none has a day. A loop on purpose: spreading
   * one argument per check-in into Math.min overflows Safari's 65,536-argument limit in a large study. */
  const minDn = list => list.reduce((m, x) => x.dn !== null && x.dn < m ? x.dn : m, Infinity);
  const SENSE = HCI.sense;                               // −3 … +3
  /* nearest step, with exact halves rounded away from neutral (−0.5 → −1, +0.5 → +1) so the rule is symmetric;
   * Math.round alone would send every tie toward warm */
  const stepOf = v => { const r = Math.sign(v) * Math.round(Math.abs(v)); return SENSE[Math.max(-3, Math.min(3, r)) + 3]; };
  const fcls = s => s.cls.replace('sv-', 'f-');           // SVG fill class for a step
  const shortWord = s => s.word.replace('Slightly ', 'Sl. ');
  const initials = s => { const w = String(s || '').replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean); return ((w[0] || '?')[0] + (w[1] ? w[1][0] : '')).toUpperCase(); };

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const WD_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const MS_DAY = 864e5;

  /* Days are counted on the participant's own clock (local_time, "YYYY-MM-DD HH:MM"), and "today" in the study's
   * time zone (config.js timeZone), so the 7 and 30 day windows line up with New York days wherever the
   * dashboard is opened. dn = days since 1970-01-01. */
  let tzFmt;
  try { tzFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); }
  catch (e) { tzFmt = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); }
  function tzParts(d) { const o = {}; tzFmt.formatToParts(d).forEach(p => { o[p.type] = p.value; }); return { key: o.year + '-' + o.month + '-' + o.day, hour: Number(o.hour) % 24, min: Number(o.minute) }; }
  const keyToDn = k => Math.floor(Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)) / MS_DAY);
  const dnDate = dn => new Date(dn * MS_DAY);
  const dnDow = dn => (dnDate(dn).getUTCDay() + 6) % 7;            // Monday = 0
  const dnShort = dn => { const d = dnDate(dn); return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate(); };
  const dnLong = dn => WD[dnDow(dn)] + ', ' + dnShort(dn);
  const dnYear = dn => dnDate(dn).getUTCFullYear();
  const dnKey = dn => dnDate(dn).toISOString().slice(0, 10);
  let todayCache = { at: 0, dn: 0 };
  const todayDn = () => { const n = Date.now(); if (n - todayCache.at > 30000) todayCache = { at: n, dn: keyToDn(tzParts(new Date(n)).key) }; return todayCache.dn; };
  const hour12 = h => h === 0 ? '12 AM' : h === 12 ? '12 PM' : h < 12 ? h + ' AM' : (h - 12) + ' PM';
  const hourShort = h => h === 0 ? '12a' : h === 12 ? 'Noon' : h < 12 ? h + 'a' : (h - 12) + 'p';
  const clock = (h, m) => (h % 12 || 12) + ':' + String(m).padStart(2, '0') + ' ' + (h < 12 ? 'AM' : 'PM');
  const fmtIsoDate = s => { const t = Date.parse(s); if (!isFinite(t)) return ''; const p = tzParts(new Date(t)); const dn = keyToDn(p.key); return dnShort(dn) + ', ' + dnYear(dn); };
  function ago(t) {
    if (t == null) return '';
    const m = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (m < 1) return 'now';
    if (m < 60) return m + ' min ago';
    const h = Math.floor(m / 60);           // rounded down like days, so 23.5-24 h reads "23 h ago", never "0 days ago"
    if (h < 24) return h + ' h ago';
    const d = Math.floor(m / 1440);
    return d === 1 ? 'yesterday' : d + ' days ago';
  }

  /* ---------------------------------------------------------------- units (display only; storage is metric) */
  const isUS = () => st.units === 'us';
  const fmtTemp = c => { c = num(c); if (c === null) return ''; return isUS() ? Math.round(c * 9 / 5 + 32) + '°F' : (Math.round(c * 2) / 2) + '°C'; };
  const tempVal = c => isUS() ? c * 9 / 5 + 32 : c;
  const fmtArea = m2 => { m2 = num(m2); if (m2 === null) return ''; return isUS() ? fmtN(Math.round(m2 * 10.7639 / 10) * 10) + ' sq ft' : fmtN(Math.round(m2)) + ' m²'; };
  const fmtHeight = cm => { cm = num(cm); if (cm === null) return ''; if (!isUS()) return round1(cm) + ' cm'; let i = cm / 2.54, ft = Math.floor(i / 12), inch = Math.round(i - ft * 12); if (inch === 12) { ft++; inch = 0; } return ft + ' ft ' + inch + ' in'; };
  const fmtWeight = kg => { kg = num(kg); if (kg === null) return ''; return isUS() ? Math.round(kg * 2.20462) + ' lb' : round1(kg) + ' kg'; };

  /* ---------------------------------------------------------------- storage */
  const box = area => ({
    get(k) { try { return window[area].getItem(k); } catch (e) { return null; } },
    set(k, v) { try { window[area].setItem(k, v); return true; } catch (e) { return false; } },
    del(k) { try { window[area].removeItem(k); } catch (e) {} }
  });
  const SS = box('sessionStorage'), LS = box('localStorage');
  /* The login lives in this page's memory once it has been set or cleared; sessionStorage only carries it across
   * a reload. So a browser that blocks site storage (Safari "Block All Cookies", cookies off) can still sign in
   * (it just has to sign in again after a reload), and a stale stored value can never override or revive a login. */
  let mem = null;
  const session = {
    get token() { return mem ? mem.token : SS.get('hcny_token'); },
    get email() { return mem ? mem.email : SS.get('hcny_email'); },
    expired() { const x = Number(mem ? mem.exp : SS.get('hcny_token_exp')); return !!x && Date.now() > x - 20000; },
    /* returns false when the browser would not store it (the sign-in then lasts until the page is reloaded) */
    set(t, e, expiresIn) {
      mem = { token: t, email: e || '', exp: expiresIn ? String(Date.now() + expiresIn * 1000) : '' };
      const kept = SS.set('hcny_token', t);
      SS.set('hcny_email', mem.email);
      if (mem.exp) SS.set('hcny_token_exp', mem.exp); else SS.del('hcny_token_exp');
      return kept;
    },
    clear() { mem = { token: null, email: null, exp: '' }; ['hcny_token', 'hcny_email', 'hcny_token_exp'].forEach(k => SS.del(k)); }
  };

  /* ---------------------------------------------------------------- state */
  const st = {
    local: false,
    rows: [], R: [], people: [], phones: [],
    sel: 'ALL', pf: 'all', q: '',
    range: ['7', '30', 'all'].includes(LS.get('hcny_dash_range')) ? LS.get('hcny_dash_range') : '30',
    units: LS.get('hcny_dash_units') === 'metric' ? 'metric' : 'us',
    tables: new Set(),
    byCode: new Map(), rowsBy: new Map(), phonesBy: new Map(), entries: []
  };
  const person = code => st.byCode.get(code) || null;
  /* True when the participant rows have no "approved" column: supabase-setup.sql has not been run since the
   * approval step was added, so nothing can be approved yet. The page says so instead of listing everyone
   * as waiting. (The home profile is checked the same way.) */
  const dbStale = () => !st.local && st.people.length > 0 && !Object.prototype.hasOwnProperty.call(st.people[0], 'approved');
  const homeMissing = () => !st.local && st.people.length > 0 && !Object.prototype.hasOwnProperty.call(st.people[0], 'home');
  const waiting = p => !!p && !st.local && !dbStale() && !p.approved;
  /* In the study: approved (or anyone, in local mode and before the database has the approved column). A code
   * with check-ins but no profile (test data, or a removed participant) is not counted as enrolled. */
  const enrolled = e => st.local ? true : !!e.p && (dbStale() || !!e.p.approved);
  const homeOf = p => (p && p.home && typeof p.home === 'object' && !Array.isArray(p.home)) ? p.home : {};
  const listOf = v => Array.isArray(v) ? v.filter(x => x !== null && x !== '') : (v ? [v] : []);

  /* One prepared row per check-in: the record, and when it happened on the participant's clock. */
  function prep(r) {
    const t = Date.parse(r.ts);
    let key = null, hour = null, min = null;
    const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/.exec(typeof r.local_time === 'string' ? r.local_time : '');
    if (m) { key = m[1]; hour = +m[2]; min = +m[3]; }
    else if (isFinite(t)) { const p = tzParts(new Date(t)); key = p.key; hour = p.hour; min = p.min; }
    const dn = key ? keyToDn(key) : null;
    const v = num(r.tsv);
    return { r, code: String(r.participant || '').trim().toUpperCase() || '(none)', t: isFinite(t) ? t : null, dn, hour, min,
      dow: dn === null ? null : dnDow(dn), tsv: v !== null && v >= -3 && v <= 3 ? Math.round(v) : null };
  }
  function index() {
    st.R = st.rows.map(prep).sort((a, b) => (b.t || 0) - (a.t || 0));
    st.byCode = new Map(st.people.map(p => [String(p.code).toUpperCase(), p]));
    st.rowsBy = new Map();
    st.R.forEach(x => { if (!st.rowsBy.has(x.code)) st.rowsBy.set(x.code, []); st.rowsBy.get(x.code).push(x); });
    st.phonesBy = new Map();
    (st.phones || []).forEach(ph => { const c = String(ph.participant || '').toUpperCase(); if (!st.phonesBy.has(c)) st.phonesBy.set(c, []); st.phonesBy.get(c).push(ph); });
    const codes = new Set([...st.byCode.keys(), ...st.rowsBy.keys()]);
    st.entries = [...codes].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(code => {
      const rows = st.rowsBy.get(code) || [];
      return { code, p: person(code), rows, last: rows[0] || null };
    });
    if (st.sel !== 'ALL' && !codes.has(st.sel)) st.sel = 'ALL';
  }
  const rangeStart = () => st.range === 'all' ? null : todayDn() - (Number(st.range) - 1);
  const inRange = x => { const s = rangeStart(); return s === null || (x.dn !== null && x.dn >= s); };
  const rangeWords = () => st.range === 'all' ? 'all dates' : 'the last ' + st.range + ' days';
  function pausedOf(code) {
    const list = st.phonesBy.get(code) || [], now = Date.now();
    let until = null;
    list.forEach(ph => { const t = Date.parse(ph.paused_until); if (isFinite(t) && t > now && (!until || t > until)) until = t; });
    return until;
  }
  /* Whole days since the last check-in. For an approved participant who has never checked in, whole days since
   * approval (participants.updated_at is written only by HC.setApproval and at insert) or else since sign-up, so
   * the people who never started are flagged too. Nothing for people waiting for approval or in local mode. */
  const quietDays = e => {
    if (e.last && e.last.t) return Math.floor((Date.now() - e.last.t) / MS_DAY);
    if (st.local || !e.p || !enrolled(e)) return null;
    const t = Date.parse(e.p.updated_at || e.p.created_at);
    return isFinite(t) ? Math.max(0, Math.floor((Date.now() - t) / MS_DAY)) : null;
  };

  /* ================================================================ tooltip (one, shared) */
  const tip = $('#tip');
  let tipFor = null;
  function showTip(el, x, y) {
    const html = el.getAttribute('data-tip');
    if (!html) return;
    if (tipFor !== el) { tip.innerHTML = html; tipFor = el; }
    tip.hidden = false;
    const w = tip.offsetWidth, h = tip.offsetHeight, vw = document.documentElement.clientWidth;
    let left = x + 14, top = y - h - 12;
    if (left + w > window.scrollX + vw - 8) left = x - w - 14;
    if (left < window.scrollX + 8) left = window.scrollX + 8;
    if (top < window.scrollY + 8) top = y + 18;
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  }
  function hideTip() { tip.hidden = true; tipFor = null; }
  document.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (el) showTip(el, e.pageX, e.pageY); else if (!tip.hidden) hideTip();
  });
  document.addEventListener('click', e => {
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (el && !el.closest('button')) { const r = el.getBoundingClientRect(); showTip(el, r.left + r.width / 2 + window.scrollX, r.top + window.scrollY); }
    else hideTip();
  });
  window.addEventListener('scroll', () => { if (!tip.hidden) hideTip(); }, { passive: true });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hideTip(); });
  const tipAttr = (main, ...subs) => ' data-tip="' + esc('<span>' + esc(main) + '</span>' + subs.filter(Boolean).map(s => '<small>' + esc(s) + '</small>').join('')) + '"';

  /* ================================================================ toast */
  let toastTimer;
  function toast(title, sub, kind) {
    const t = $('#toast');
    t.classList.remove('toast-error', 'toast-info');
    if (kind) t.classList.add('toast-' + kind);
    t.classList.add('is-open');
    $('#toastIc').innerHTML = icon(kind === 'error' ? 'alert' : kind === 'info' ? 'info' : 'check');
    $('#toastTitle').textContent = title;
    $('#toastSub').textContent = sub || '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-open'), 4200);
  }

  /* ================================================================ sign in */
  function loginView(msg) {
    hideTip();
    const live = HC.live;
    app.innerHTML = `<main class="login" id="main" tabindex="-1">
      <div class="login-card card card-raised stack stack-5">
        <div class="logo"><span class="logo-mark">${icon('home')}</span><span><span class="logo-name">Home Comfort NY</span><span class="logo-sub">Research dashboard · SUNY ESF</span></span></div>
        <div class="screen-head"><span class="eyebrow">Research team</span><h1 class="screen-title">Sign in</h1></div>
        ${live ? '' : `<div class="note note-warn">${icon('alert')}<div>No database is configured yet, so this page can only show check-ins stored in <b>this browser</b>. Fill in <b>homecomfort-ny/config.js</b> following the README to connect the study database.</div></div>`}
        <div class="field-error" id="loginErr" role="alert"${msg ? '' : ' hidden'}>${icon('alert')}<span>${esc(msg || '')}</span></div>
        <form id="loginForm" class="stack stack-4"${live ? '' : ' hidden'}>
          <div class="field"><label class="label" for="loginEmail">Email</label><input class="input" id="loginEmail" type="email" name="email" autocomplete="username" required></div>
          <div class="field"><label class="label" for="loginPassword">Password</label><input class="input" id="loginPassword" type="password" name="password" autocomplete="current-password" required></div>
          <button class="btn btn-primary btn-block" type="submit">${icon('signin')}Sign in</button>
        </form>
        ${live ? '<div class="login-or">or</div>' : ''}
        <button class="btn btn-ghost btn-block" type="button" id="localBtn">${icon('download')}View check-ins stored in this browser</button>
        <p class="caption">Participants never need this page. Their check-ins reach the study database from the check-in app.</p>
      </div></main>`;
    const f = $('#loginForm');
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const b = f.querySelector('button[type="submit"]');
      const err = $('#loginErr');
      const email = f.email.value.trim();
      if (!email || !f.password.value) { err.hidden = false; err.querySelector('span').textContent = 'Enter the email and password of the research login.'; return; }
      b.disabled = true; b.classList.add('is-busy'); err.hidden = true;
      try {
        const j = await HC.login(email, f.password.value);
        const kept = session.set(j.access_token, (j.user && j.user.email) || email, Number(j.expires_in) || 0);
        st.local = false;
        await loadData();
        if (!kept && session.token) toast('Signed in for this page only', 'This browser blocks site storage, so reloading the page will ask you to sign in again.', 'info');
      } catch (ex) {
        err.hidden = false; err.querySelector('span').textContent = (ex && ex.message) || 'Sign-in failed';
        b.disabled = false; b.classList.remove('is-busy');
      }
    });
    $('#localBtn').addEventListener('click', openLocal);
    const first = live ? $('#loginEmail') : $('#localBtn');
    if (first && !msg) first.focus({ preventScroll: true });
  }
  function openLocal() {
    st.local = true; st.people = []; st.phones = [];
    try { st.rows = HC.localRows() || []; } catch (e) { st.rows = []; }
    st.sel = 'ALL'; st.pf = 'all'; st.q = '';
    index(); dataView({ focusMain: true });
  }
  function signOut() {
    session.clear(); st.local = false; st.rows = []; st.people = []; st.phones = []; st.sel = 'ALL'; st.pf = 'all'; st.q = '';
    index(); loginView();
  }

  /* ================================================================ loading */
  /* The registered phones, for the "Paused" flag and the profile's Reminders line. Read-only. null when the list
   * could not be read (an error status, a bad reply or no connection): the flag then just does not appear, and
   * the profile says the reminders are unknown instead of claiming that no phone is registered. */
  async function fetchPhones(token) {
    if (!HC.live) return [];
    try {
      const base = String(cfg.supabaseUrl || '').replace(/\/$/, '');
      const r = await fetch(base + '/rest/v1/' + (cfg.pushTable || 'push_subscriptions') + '?select=participant,enabled,paused_until',
        { headers: { apikey: cfg.supabaseAnonKey, Authorization: 'Bearer ' + token } });
      if (!r.ok) return null;
      const j = await r.json();
      return Array.isArray(j) ? j : null;
    } catch (e) { return null; }
  }
  async function loadData(keepView) {
    if (session.expired()) { session.clear(); loginView(EXPIRED); return; }
    if (!keepView) app.innerHTML = '<div class="state" role="status"><span class="spinner" aria-hidden="true"></span><span>Loading check-ins&hellip;</span></div>';
    try {
      const token = session.token;
      const [rows, people, phones] = await Promise.all([HC.fetchAll(token), HC.fetchParticipants(token), fetchPhones(token)]);
      st.rows = Array.isArray(rows) ? rows : []; st.people = Array.isArray(people) ? people : []; st.phones = phones;
      st.local = false; st.loadedAt = Date.now();
      index(); dataView({ focusMain: !keepView });
    } catch (err) {
      const msg = (err && err.message) || 'Could not load the check-ins';
      if (msg === EXPIRED || /401|expired|JWT/i.test(msg)) { session.clear(); loginView(EXPIRED); return; }
      app.innerHTML = `<main class="state" id="main"><div class="card card-raised state-card stack stack-4">
        <div class="note note-warn">${icon('alert')}<div><b>The check-ins could not be loaded.</b><br>${esc(msg)}. Check the connection and try again.</div></div>
        <div class="cluster"><button class="btn btn-primary btn-sm" id="retry">${icon('refresh')}Try again</button><button class="btn btn-ghost btn-sm" id="out">${icon('signout')}Sign out</button></div></div></main>`;
      $('#retry').addEventListener('click', () => loadData());
      $('#out').addEventListener('click', signOut);
    }
  }

  /* ================================================================ approve / remove (ported from SWITCH) */
  /* Runs one of the write calls in api.js. They resolve to true when a row changed, false when nothing did (the
   * code is gone, or the list on screen is stale) and reject when the request itself failed. A short message
   * next to the button in the first case, a fuller one in the second; an expired login goes back to sign-in. */
  async function writeAction(btn, code, verb, call) {
    if (session.expired()) { session.clear(); loginView(EXPIRED); return false; }
    // lock the Approve / Remove pair for this code while the call runs, so the two can never race
    const host = btn.closest('[data-errhost]') || btn.parentElement;
    const pair = $$('[data-act="approve"],[data-act="remove"]', host);
    if (!pair.includes(btn)) pair.push(btn);
    pair.forEach(b => { b.disabled = true; });
    btn.classList.add('is-busy'); btn.setAttribute('aria-busy', 'true');
    let ok, why = '';
    try { ok = await call(); } catch (e) { ok = null; why = (e && e.message) || ''; }
    btn.classList.remove('is-busy'); btn.removeAttribute('aria-busy');
    if (ok === true) return true;          // the reload that follows draws fresh buttons
    pair.forEach(b => { b.disabled = false; });
    if (why === EXPIRED || /\(401\)/.test(why)) { session.clear(); loginView(EXPIRED); return false; }
    if (ok === false) { rowError(btn, 'Nothing changed. Refresh and try again.'); return false; }
    const tail = /supabase-setup\.sql/.test(why) ? 'Then try again.' : 'Check the connection, and that supabase-setup.sql has been run in Supabase, then try again.';
    alert('Could not ' + verb + ' ' + code + '. ' + (why ? why + '. ' : '') + tail);
    return false;
  }
  function rowError(btn, msg) {
    const host = btn.closest('[data-errhost]') || btn.parentElement;
    let el = host.querySelector('.row-err');
    if (!el) { el = document.createElement('p'); el.className = 'row-err'; el.setAttribute('role', 'alert'); host.appendChild(el); }
    el.textContent = msg;
  }
  async function approve(code, btn) {
    if (st.local) return;
    if (!(await writeAction(btn, code, 'approve', () => HC.setApproval(session.token, code, true)))) return;
    toast(code + ' approved', 'They can check in and turn on reminders now.');
    await loadData(true);
    focusAfterWrite();
  }
  async function remove(code, btn) {
    if (st.local) return;
    const p = person(code);
    const n = (st.rowsBy.get(code) || []).length;
    if (!confirm(`Remove ${p ? p.name + ' (' + code + ')' : code} from the study?\n\nTheir profile and any phones registered for reminders are deleted, and they can no longer check in.${n ? ` The ${n} check-in${n === 1 ? '' : 's'} already submitted stay in the database under the code.` : ''}`)) return;
    if (!(await writeAction(btn, code, 'remove', () => HC.removeParticipant(session.token, code)))) return;
    if (st.sel === code) st.sel = 'ALL';
    toast(code + ' removed', n ? 'Their check-ins stay in the database under the code.' : 'Their profile has been deleted.');
    await loadData(true);
    focusAfterWrite();
  }
  /* The button that was pressed is gone after the reload: keep keyboard users in the same place. */
  function focusAfterWrite() {
    const t = $('#apprTitle') || $('#mainTitle');
    if (t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
  }

  /* ================================================================ the data view */
  let charts = [];          // [{id, draw(width) -> html}] drawn after each render, and again on resize
  const addChart = (id, draw) => { charts.push({ id, draw }); return id; };

  function dataView(opt) {
    opt = opt || {};
    hideTip();
    const active = document.activeElement;
    const fk = active && active.getAttribute && active.getAttribute('data-fk');
    charts = [];
    // a reload (Refresh, Approve, Remove) redraws the sidebar: keep it scrolled where the researcher left it
    const oldSide = $('.side'), oldList = $('#plist');
    const keep = oldSide ? { side: oldSide.scrollTop, list: oldList ? oldList.scrollTop : 0 } : null;
    const user = st.local
      ? `<span class="avatar" aria-hidden="true">${icon('home', 'ic-sm')}</span><span class="side-foot-text"><b>Local mode</b><small>This browser only</small></span><button class="btn btn-icon" data-act="signout" data-fk="signout" aria-label="Back to the sign-in page">${icon('signout')}</button>`
      : `<span class="avatar" aria-hidden="true">${esc(initials(session.email))}</span><span class="side-foot-text"><b>Research team</b><small>${esc(session.email || '')}</small></span><button class="btn btn-icon" data-act="signout" data-fk="signout" aria-label="Sign out">${icon('signout')}</button>`;
    app.innerHTML = `<div class="dash">
      <aside class="side" aria-label="Participants">
        <div class="logo"><span class="logo-mark">${icon('home')}</span><span><span class="logo-name">Home Comfort NY</span><span class="logo-sub">Research dashboard</span></span></div>
        ${enrollCard()}
        <div class="side-search">${icon('search')}<label class="sr-only" for="psearch">Search participants by code, name or email</label><input class="input" id="psearch" type="search" placeholder="Search participants" autocomplete="off" value="${esc(st.q)}" data-fk="search"></div>
        <div id="pfilter"></div>
        <div class="plist-h" aria-hidden="true"><span>Participants</span><span>Latest</span></div>
        <ul class="plist" id="plist" role="list"></ul>
        <div class="side-foot">${user}</div>
      </aside>
      <main class="main" id="main" tabindex="-1">${mainHtml()}</main>
    </div>`;
    renderSide();
    if (keep) { $('.side').scrollTop = keep.side; $('#plist').scrollTop = keep.list; }
    drawCharts();
    if (fk) { const el = $('[data-fk="' + fk + '"]'); if (el) el.focus({ preventScroll: true }); }
    else if (opt.focusMain) { const h = $('#mainTitle'); if (h) h.focus({ preventScroll: true }); }
  }
  function rerenderMain(focusTitle) {
    hideTip();
    const active = document.activeElement;
    const fk = active && active.getAttribute && active.getAttribute('data-fk');
    charts = [];
    $('#main').innerHTML = mainHtml();
    renderSide();
    drawCharts();
    if (focusTitle) { const h = $('#mainTitle'); if (h) h.focus({ preventScroll: true }); }
    else if (fk) { const el = $('[data-fk="' + fk + '"]'); if (el) el.focus({ preventScroll: true }); }
  }

  /* ---------------------------------------------------------------- sidebar */
  function activeCodes() { const s = new Set(); st.R.forEach(x => { if (inRange(x)) s.add(x.code); }); return s; }
  function renderSide() {
    const act = activeCodes();
    const nAll = st.entries.length;
    const nAct = st.entries.filter(e => act.has(e.code) && enrolled(e)).length;
    const nWait = st.entries.filter(e => waiting(e.p)).length;
    const fb = (k, label, n, hint) => `<button class="seg-btn" type="button" data-act="pf" data-v="${k}" data-fk="pf-${k}" aria-pressed="${st.pf === k}" title="${esc(hint)}">${label}<span class="n">${n}</span></button>`;
    $('#pfilter').innerHTML = `<div class="seg seg-on-white" role="group" aria-label="Show participants">${fb('all', 'All', nAll, 'Everyone')}${fb('active', 'Active', nAct, 'Checked in during ' + rangeWords())}${dbStale() || st.local ? '' : fb('waiting', 'Waiting', nWait, 'Waiting for approval')}</div>`;
    const q = st.q.trim().toLowerCase();
    const list = st.entries.filter(e => {
      if (st.pf === 'active' && !(act.has(e.code) && enrolled(e))) return false;
      if (st.pf === 'waiting' && !waiting(e.p)) return false;
      if (!q) return true;
      return e.code.toLowerCase().includes(q) || (e.p && ((e.p.name || '').toLowerCase().includes(q) || (e.p.email || '').toLowerCase().includes(q)));
    });
    const allRow = `<li><button class="prow prow-all" type="button" data-act="sel" data-code="ALL" data-fk="p-ALL"${st.sel === 'ALL' ? ' aria-current="true"' : ''}>
      <span class="prow-art">${icon('users')}</span><span class="prow-text"><span class="prow-top"><span class="prow-code">All participants</span></span><span class="prow-sub">${plural(nAll, 'home')} · ${plural(st.R.length, 'check-in')}</span></span></button></li>`;
    $('#plist').innerHTML = allRow + (list.length ? list.map(prowHtml).join('') : `<li class="plist-empty">${q ? 'Nobody matches “' + esc(st.q) + '”.' : st.pf === 'waiting' ? 'Nobody is waiting for approval.' : 'No participants here yet.'}</li>`);
  }
  function prowHtml(e) {
    const p = e.p, h = homeOf(p);
    const heat = listOf(h.heating);
    const sub = p ? [h.home_type ? lab('home_short', h.home_type) : 'Home not described', heat.length ? lab('heat_short', heat[0]) + (heat.length > 1 ? ' +' + (heat.length - 1) : '') : ''].filter(Boolean).join(' · ') : 'No profile stored';
    const flags = [];
    if (waiting(p)) flags.push('<span class="badge badge-violet badge-dot">Waiting</span>');
    const pu = pausedOf(e.code);
    if (pu) flags.push(`<span class="badge badge-warn" title="Reminders paused until ${esc(new Date(pu).toLocaleString('en-US', { timeZone: TZ, weekday: 'short', hour: 'numeric', minute: '2-digit' }))}">${icon('pause')}Paused</span>`);
    const qd = quietDays(e);
    if (qd !== null && qd >= QUIET_DAYS && !waiting(p)) flags.push(e.last
      ? `<span class="badge badge-warn">${icon('clock')}Quiet ${qd} days</span>`
      : `<span class="badge badge-warn" title="No check-in in the ${qd} days since ${dbStale() ? 'signing up' : 'approval'}">${icon('clock')}No check-ins · ${qd} days</span>`);
    const last = e.last;
    const end = last ? `${last.tsv !== null ? `<span class="prow-sv"><i class="sdot ${stepOf(last.tsv).cls}" aria-hidden="true"></i>${signed(last.tsv)}<span class="sr-only"> ${esc(stepOf(last.tsv).word)}</span></span>` : ''}<span>${esc(ago(last.t))}</span>` : '<span>no check-ins</span>';
    const pic = p && h.home_type ? artOf('home_type', h.home_type) : icon(p ? 'home' : 'help');
    return `<li><button class="prow" type="button" data-act="sel" data-code="${esc(e.code)}" data-fk="p-${esc(e.code)}"${st.sel === e.code ? ' aria-current="true"' : ''}>
      <span class="prow-art">${pic}</span>
      <span class="prow-text"><span class="prow-top"><span class="prow-code">${esc(e.code)}</span>${p && p.name ? `<span class="prow-name">${esc(p.name)}</span>` : ''}</span><span class="prow-sub">${esc(sub)}</span>${flags.length ? `<span class="prow-flags">${flags.join('')}</span>` : ''}</span>
      <span class="prow-end">${end}</span></button></li>`;
  }
  function enrollCard() {
    if (st.local) return `<div class="side-card"><div class="side-card-h">Local mode</div><small class="caption">Only the check-ins kept in this browser are shown. Nothing is read from the study database.</small></div>`;
    const stale = dbStale();
    const enrolled = stale ? st.people.length : st.people.filter(p => p.approved).length;
    const wait = stale ? 0 : st.people.length - enrolled;
    const cells = [];
    const total = Math.max(ENROLLMENT_TARGET, enrolled + wait);
    for (let i = 0; i < total; i++) cells.push(i < enrolled ? '<i class="is-on"></i>' : i < enrolled + wait ? '<i class="is-wait"></i>' : '<i></i>');
    return `<div class="side-card" role="group" aria-label="Enrollment">
      <div class="side-card-h">Enrollment <span>${enrolled} of ${ENROLLMENT_TARGET}</span></div>
      <div class="sqgrid" style="--cols:20" role="img" aria-label="${enrolled} enrolled${wait ? ', ' + wait + ' waiting for approval' : ''}, target ${ENROLLMENT_TARGET}">${cells.join('')}</div>
      <div class="sq-legend" aria-hidden="true"><span><i class="is-on"></i>Enrolled</span>${wait ? `<span><i class="is-wait"></i>Waiting ${wait}</span>` : ''}<span>${pct(enrolled, ENROLLMENT_TARGET)} of target</span></div>
      <small class="caption"><span class="placeholder">[PLACEHOLDER: target and end date]</span></small>
    </div>`;
  }

  /* ---------------------------------------------------------------- main column */
  function mainHtml() {
    const sel = st.sel;
    const p = sel === 'ALL' ? null : person(sel);
    const all = sel === 'ALL' ? st.R : (st.rowsBy.get(sel) || []);
    const V = all.filter(inRange);
    const today = todayDn(), start = rangeStart();
    const firstDn = Math.min(today, minDn(V));
    const spanStart = start === null ? firstDn : start;
    const notices = [];
    if (dbStale() || homeMissing()) notices.push(`<div class="note note-warn" role="alert">${icon('alert')}<div><b>The database has not been updated yet.</b> Run <b>supabase-setup.sql</b> again in Supabase (SQL Editor), then Refresh.${dbStale() ? ' Until then nobody can be approved.' : ''}</div></div>`);
    if (st.local) notices.push(`<div class="note note-warn">${icon('info')}<div><b>Local mode.</b> These are the check-ins stored in this browser only${HC.live ? '' : ' (no study database is configured in config.js yet)'}. Nothing here comes from the study database, and nothing can be approved.</div></div>`);
    const title = sel === 'ALL' ? 'Study overview' : (p && p.name ? `${esc(p.name)} <span class="dh-code">· ${esc(sel)}</span>` : esc(sel));
    const subBits = sel === 'ALL'
      ? [`All participants`, plural(V.length, 'check-in') + (st.range === 'all' ? '' : ' in ' + rangeWords())]
      : [p ? lab('home_short', homeOf(p).home_type) || 'Home not described' : 'No profile stored', plural(V.length, 'check-in') + (st.range === 'all' ? '' : ' in ' + rangeWords())];
    if (st.local) subBits.push('stored in this browser only');
    if (st.loadedAt && !st.local) { const lp = tzParts(new Date(st.loadedAt)); subBits.push('loaded at ' + clock(lp.hour, lp.min) + (TZ === 'America/New_York' ? ' New York time' : '')); }
    const xlsTitle = sel === 'ALL' ? 'Every check-in, all dates: a Participants sheet, an All sheet and one sheet per participant' : 'Every check-in of ' + sel + ', all dates, with the profile';
    const rb = (k, label) => `<button class="seg-btn" type="button" data-act="range" data-v="${k}" data-fk="range-${k}" aria-pressed="${st.range === k}">${label}</button>`;
    const ub = (k, label) => `<button class="seg-btn" type="button" data-act="units" data-v="${k}" data-fk="units-${k}" aria-pressed="${st.units === k}">${label}</button>`;
    const head = `
      ${notices.length ? `<div class="notes">${notices.join('')}</div>` : ''}
      <header class="dh">
        <div><span class="eyebrow">${sel === 'ALL' ? 'Research dashboard' : 'Participant'}</span><h1 class="dh-title" id="mainTitle" tabindex="-1">${title}</h1><p class="dh-sub">${subBits.map(esc).join(' · ')}</p></div>
        <div class="dh-actions">
          <button class="btn btn-ghost btn-sm" type="button" data-act="refresh" data-fk="refresh">${icon('refresh')}${st.local ? 'Reload' : 'Refresh'}</button>
          <button class="btn btn-ghost btn-sm" type="button" data-act="csv" data-fk="csv" title="Every check-in${sel === 'ALL' ? '' : ' of ' + esc(sel)}, all dates">${icon('download')}Download CSV</button>
          <button class="btn btn-primary btn-sm" type="button" data-act="xlsx" data-fk="xlsx" title="${esc(xlsTitle)}">${icon('table')}Download Excel</button>
        </div>
      </header>
      <div class="dfilters">
        <div class="seg seg-on-white" role="group" aria-label="Time range for every chart and tile">${rb('7', '7 days')}${rb('30', '30 days')}${rb('all', 'All time')}</div>
        <div class="seg seg-on-white" role="group" aria-label="Units">${ub('us', '°F · sq ft')}${ub('metric', '°C · m²')}</div>
        <span class="dspan">${icon('calendar')}${V.length || start !== null ? esc(dnShort(spanStart) + (dnYear(spanStart) !== dnYear(today) ? ', ' + dnYear(spanStart) : '') + ' to ' + dnShort(today) + ', ' + dnYear(today)) : 'No check-ins yet'}</span>
      </div>`;
    const ctx = { V, all, p, sel, today, start, spanStart };
    return head + (sel === 'ALL' ? overviewHtml(ctx) : personHtml(ctx));
  }

  function emptyState(ctx) {
    const any = ctx.all.length > 0;
    return `<div class="card empty">${HCI.art('unsure')}<b>${any ? 'No check-ins in ' + rangeWords() : 'No check-ins yet'}</b><p>${any ? 'Choose “All time” above to see earlier check-ins.' : ctx.sel === 'ALL' ? (st.local ? 'Check-ins made in the check-in app on this browser will show here.' : 'Check-ins appear here as soon as participants start using the app.') : 'This participant has not checked in yet.'}</p></div>`;
  }

  function overviewHtml(ctx) {
    const { V } = ctx;
    let html = kpiHtml(ctx) + approvalHtml();
    if (!V.length) return html + emptyState(ctx);
    html += `<div class="dgrid">${distCard(ctx)}${heatCard(ctx)}${dailyCard(ctx, true)}${warmCard(ctx)}${divCards(ctx)}${homesCard(ctx)}</div>`;
    html += tableHtml(ctx);
    return html;
  }
  function personHtml(ctx) {
    const { V } = ctx;
    let html = profileHtml(ctx) + kpiHtml(ctx);
    if (!V.length) return html + emptyState(ctx);
    html += `<div class="dgrid">${lineCard(ctx)}${distCard(ctx)}${heatCard(ctx)}${warmCard(ctx)}${recentCard(ctx)}</div>`;
    html += tableHtml(ctx);
    return html;
  }

  /* ---------------------------------------------------------------- KPI tiles */
  function kpiHtml(ctx) {
    const { V, all, sel, start, today } = ctx;
    const n = V.length;
    // change against the period before, for 7 and 30 days
    let delta = '';
    if (start !== null) {
      const N = Number(st.range);
      const prev = all.filter(x => x.dn !== null && x.dn >= start - N && x.dn < start).length;
      if (prev > 0) {
        const d = Math.round(100 * (n - prev) / prev);
        delta = `<span class="delta ${d >= 0 ? 'delta-up' : 'delta-down'}">${icon(d >= 0 ? 'arrow-up' : 'arrow-down', 'ic-xs')}${Math.abs(d)}%</span> vs the ${N} days before`;
      } else delta = 'none in the ' + N + ' days before';
    } else {
      const first = V.reduce((m, x) => x.dn !== null && x.dn < m ? x.dn : m, today);
      delta = 'since ' + dnShort(first) + ', ' + dnYear(first);
    }
    // sparkline of check-ins per day
    const s0 = start === null ? Math.max(today - 59, V.reduce((m, x) => x.dn !== null && x.dn < m ? x.dn : m, today)) : start;
    const per = new Map(); V.forEach(x => { if (x.dn !== null) per.set(x.dn, (per.get(x.dn) || 0) + 1); });
    const pts = []; for (let d = s0; d <= today; d++) pts.push(per.get(d) || 0);
    const spark = sparkSvg(pts);
    /* Per person per day: each participant's check-ins in the range divided by the days they were in the study
     * within it (from the later of the range start and the day they were approved, or signed up, or first checked
     * in, whichever is earliest, to yesterday: today is not over yet, so it counts only for someone who joined
     * today), so a day without a check-in counts as 0; then the median across participants. On the overview that is
     * everyone enrolled (approved), including those with no check-in in the range; someone still waiting for
     * approval is left out on their own page too (the tile shows "–"). The sub-line gives the same median counting
     * only the days each person did check in. Days away count as 0 as well: the dashboard knows only the current
     * pause, not past ones. */
    const dayOfIso = s => { const t = Date.parse(s); return isFinite(t) ? keyToDn(tzParts(new Date(t)).key) : Infinity; };
    // participants.updated_at is the approval time for an approved participant (only HC.setApproval writes it)
    const joinedDay = p => !p ? Infinity : dayOfIso(p.approved && !dbStale() && p.updated_at ? p.updated_at : p.created_at);
    const rates = [], onDays = [];
    (sel === 'ALL' ? st.entries.filter(enrolled) : st.entries.filter(e => e.code === sel)).forEach(e => {
      if (waiting(e.p)) return;
      const joined = Math.min(joinedDay(e.p), minDn(e.rows));
      if (joined === Infinity) return;
      const from = start === null ? joined : Math.max(start, joined);
      const end = from < today ? today - 1 : today, days = end - from + 1;
      if (days <= 0) return;
      let k = 0; const seen = new Set();
      e.rows.forEach(x => { if (x.dn !== null && x.dn >= from && x.dn <= end) { k++; seen.add(x.dn); } });
      rates.push(k / days);
      if (seen.size) onDays.push(k / seen.size);       // the same person's rate on the days they did check in
    });
    const med = median(rates), medOn = median(onDays);
    const sched = V.filter(x => x.r.prompt === 'scheduled').length;
    const codes = new Set(V.map(x => x.code));
    const tile = (cls, ic, itc, label, value, unit, sub) => `<div class="stat${cls}"><span class="stat-label"><span class="icon-tile it-sm ${itc}">${icon(ic)}</span>${label}</span><span class="stat-value">${value}${unit ? `<span class="stat-unit">${unit}</span>` : ''}</span><span class="stat-sub">${sub}</span>${cls ? spark : ''}</div>`;
    let second;
    if (sel === 'ALL') {
      const inStudy = st.entries.filter(enrolled);
      const activeN = inStudy.filter(e => codes.has(e.code)).length;
      second = tile('', 'users', 'it-sky', 'Active participants', fmtN(activeN), st.local ? '' : 'of ' + fmtN(inStudy.length), 'checked in during ' + rangeWords());
    } else {
      const days = new Set(V.map(x => x.dn)).size;
      const first = minDn(V);
      const span = start === null ? (first !== Infinity ? today - first + 1 : 0) : Number(st.range);
      second = tile('', 'calendar', 'it-sky', 'Days with check-ins', fmtN(days), span ? 'of ' + span : '', 'in ' + rangeWords());
    }
    return `<section class="kpis" aria-label="Key figures for ${esc(rangeWords())}">
      ${tile(' is-hero', 'check-circle', '', 'Check-ins', fmtN(n), '', delta)}
      ${second}
      ${tile('', 'trend', 'it-mint', 'Per person per day', med === null ? '–' : String(round1(med)), 'median', 'goal ' + DAILY_GOAL + (medOn === null ? '' : ' · ' + round1(medOn) + ' on days with a check-in'))}
      ${tile('', 'bell', 'it-peach', 'From a reminder', pct(sched, n), '', fmtN(sched) + ' of ' + fmtN(n) + ' opened from a reminder')}
    </section>`;
  }
  function sparkSvg(pts) {
    if (pts.length < 2) return '';
    const w = 84, h = 30, mx = Math.max(1, ...pts);
    const xy = pts.map((v, i) => [3 + i * (w - 6) / (pts.length - 1), h - 3 - (v / mx) * (h - 6)]);   // 3px in: the end dot (r 3) is not clipped
    const d = 'M' + xy.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L');
    const l = xy[xy.length - 1];
    return `<svg class="kpi-spark" viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false"><path d="${d}"/><circle cx="${l[0].toFixed(1)}" cy="${l[1].toFixed(1)}" r="3"/></svg>`;
  }

  /* ---------------------------------------------------------------- approval queue */
  function approvalHtml() {
    if (st.local || dbStale()) return '';
    const pend = st.people.filter(p => !p.approved);
    if (!pend.length) return '';
    return `<section class="appr" aria-labelledby="apprTitle">
      <div class="appr-h"><span class="count" aria-hidden="true">${pend.length}</span><div><h2 class="card-title" id="apprTitle">Waiting for approval<span class="sr-only">: ${pend.length}</span></h2><p class="card-sub">New sign-ups cannot check in or get reminders until you approve them. Approve the people you expect and remove anyone you do not recognize.</p></div></div>
      <div class="ap-grid">${pend.map(p => {
        const h = homeOf(p), heat = listOf(h.heating);
        const people = (num(h.adults) || 0) + (num(h.children) || 0);
        const tags = [];
        if (h.home_type) tags.push(`<span class="pill">${icon('home')}${esc(lab('home_short', h.home_type))}</span>`);
        if (people) tags.push(`<span class="pill">${icon('users')}${plural(people, 'person', 'people')}</span>`);
        if (num(h.pets)) tags.push(`<span class="pill">${icon('heart')}${plural(num(h.pets), 'pet')}</span>`);
        if (heat.length) tags.push(`<span class="pill">${icon('radiator')}${esc(heat.map(v => lab('heat_short', v)).join(', '))}</span>`);
        if (h.zip) tags.push(`<span class="pill">${icon('map-pin')}${esc(h.zip)}</span>`);
        const created = Date.parse(p.created_at);
        return `<article class="ap" data-errhost>
          <div class="ap-top"><span class="ap-art">${h.home_type ? artOf('home_type', h.home_type) : HCI.art('unsure')}</span>
            <div class="ap-who"><button class="ap-name" type="button" data-act="sel" data-code="${esc(p.code)}">${esc(p.code)} · ${esc(p.name)}</button><small>${esc(p.email)}</small><small>Signed up ${esc(isFinite(created) ? ago(created) : '')}</small></div></div>
          ${tags.length ? `<div class="ap-tags">${tags.join('')}</div>` : ''}
          <div class="ap-btns"><button class="btn btn-danger btn-sm" type="button" data-act="remove" data-code="${esc(p.code)}">Remove</button><button class="btn btn-primary btn-sm" type="button" data-act="approve" data-code="${esc(p.code)}">${icon('check')}Approve</button></div>
        </article>`;
      }).join('')}</div></section>`;
  }

  /* ---------------------------------------------------------------- chart card shell */
  function card(id, title, sub, body, opts) {
    opts = opts || {};
    const open = st.tables.has(id);
    return `<section class="card chart-card dcard${opts.span ? ' span-2' : ''}" aria-labelledby="t-${id}">
      <div class="card-head"><div><h2 class="card-title" id="t-${id}">${esc(title)}</h2>${sub ? `<p class="card-sub">${sub}</p>` : ''}</div>
        ${opts.table ? `<button class="chart-link" type="button" data-act="table" data-id="${id}" data-fk="tbl-${id}" aria-controls="tb-${id}">${icon(open ? 'chart' : 'table')}<span>${open ? 'Chart' : 'Table'}</span></button>` : ''}</div>
      <div class="dview" id="cv-${id}"${open ? ' hidden' : ''}>${body}</div>
      ${opts.table ? `<div class="chart-table table-scroll" id="tb-${id}"${open ? '' : ' hidden'}>${opts.table}</div>` : ''}
    </section>`;
  }
  const chartBox = (id, label) => `<div class="chart-box" data-chart="${id}" role="img" aria-label="${esc(label)}"></div>`;
  const tbl = (head, rows, numFrom) => `<table class="data-table"><thead><tr>${head.map((h, i) => `<th scope="col"${i >= (numFrom == null ? 1 : numFrom) ? ' class="n"' : ''}>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => i === 0 ? `<th scope="row">${c}</th>` : `<td${i >= (numFrom == null ? 1 : numFrom) ? ' class="n"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const legendSteps = () => `<span class="legend-steps">${SENSE.map(s => `<span><i class="sdot ${s.cls}" aria-hidden="true"></i>${s.sign} ${esc(s.word)}</span>`).join('')}</span>`;
  const legendThermal = () => `<span class="legend-thermal">Cold <span class="bar" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span> Hot</span>`;
  const voteCounts = list => { const c = [0, 0, 0, 0, 0, 0, 0]; list.forEach(x => { if (x.tsv !== null) c[x.tsv + 3]++; }); return c; };
  const countsMean = c => { const n = c.reduce((a, b) => a + b, 0); return n ? c.reduce((s, k, i) => s + k * (i - 3), 0) / n : null; };

  /* ---------------------------------------------------------------- (1) how people feel */
  function distCard(ctx) {
    const c = voteCounts(ctx.V), n = c.reduce((a, b) => a + b, 0), m = countsMean(c);
    const who = ctx.sel === 'ALL' ? 'people' : 'they';
    addChart('dist', w => distSvg(w, c, n));
    const top = c.indexOf(Math.max(...c));
    return card('dist', 'How ' + who + ' feel', `${plural(n, 'vote')}${m === null ? '' : ' · mean ' + signed(m)} · ${esc(rangeWords())}`,
      chartBox('dist', n ? `Thermal sensation votes: most often ${SENSE[top].word} (${pct(c[top], n)}). ` + SENSE.map((s, i) => s.word + ' ' + pct(c[i], n)).join(', ') : 'No votes'),
      { table: tbl(['Vote', 'Check-ins', 'Share'], SENSE.map((s, i) => [`<span class="sdot ${s.cls}" aria-hidden="true"></span> ${s.sign} ${esc(s.word)}`, fmtN(c[i]), pct(c[i], n)])) });
  }
  function distSvg(w, c, n) {
    const H = 230, pt = 26, pb = 46, ph = H - pt - pb, slot = w / 7, bw = Math.min(30, slot * .56);
    const mx = Math.max(1, ...c);
    let s = svgOpen(w, H) + `<line class="bl" x1="0" x2="${w}" y1="${pt + ph + .5}" y2="${pt + ph + .5}"/>`;
    const words = slot >= 52;
    SENSE.forEach((st_, i) => {
      const k = c[i], h = k ? Math.max(3, k / mx * ph) : 0, x = i * slot + (slot - bw) / 2, y = pt + ph - h;
      s += `<g class="col"${tipAttr(st_.sign + ' ' + st_.word, plural(k, 'check-in') + ' · ' + pct(k, n))}><rect class="hit" x="${(i * slot).toFixed(1)}" y="0" width="${slot.toFixed(1)}" height="${H}"/>`;
      if (h) s += `<path class="${fcls(st_)}" d="${barPath(x, y, bw, h)}"/>`;
      if (k) s += `<text class="vlab" x="${(x + bw / 2).toFixed(1)}" y="${(y - 8).toFixed(1)}" text-anchor="middle">${pct(k, n)}</text>`;
      s += `<text class="ax-b" x="${(i * slot + slot / 2).toFixed(1)}" y="${pt + ph + 19}" text-anchor="middle">${st_.sign}</text>`;
      if (words || i === 0 || i === 3 || i === 6) s += `<text class="ax" x="${(i * slot + slot / 2).toFixed(1)}" y="${pt + ph + 35}" text-anchor="middle">${esc(words ? shortWord(st_) : st_.word)}</text>`;
      s += '</g>';
    });
    return s + '</svg>';
  }

  /* ---------------------------------------------------------------- (2) sensation through the day */
  function heatCard(ctx) {
    const cells = []; for (let d = 0; d < 7; d++) { cells.push([]); for (let h = 0; h < 24; h++) cells[d].push({ n: 0, sum: 0, homes: new Set() }); }
    ctx.V.forEach(x => { if (x.tsv === null || x.dow === null || x.hour === null) return; const c = cells[x.dow][x.hour]; c.n++; c.sum += x.tsv; c.homes.add(x.code); });
    addChart('hm', w => heatSvg(w, cells, ctx.sel === 'ALL'));
    // a one-line reading: the coolest and warmest three-hour band with enough votes
    const bands = [];
    for (let b = 0; b < 8; b++) { let n = 0, sum = 0; for (let d = 0; d < 7; d++) for (let h = b * 3; h < b * 3 + 3; h++) { n += cells[d][h].n; sum += cells[d][h].sum; } if (n >= 10) bands.push({ b, n, m: sum / n }); }
    let insight = '';
    if (bands.length >= 2) {
      const lo = bands.reduce((a, b) => b.m < a.m ? b : a), hi = bands.reduce((a, b) => b.m > a.m ? b : a);
      const nm = b => hour12(b.b * 3) + '–' + hour12((b.b * 3 + 3) % 24);
      if (hi.m - lo.m >= .3) insight = `<p class="insight">${icon('sparkle')}<span>Coolest from <b>${nm(lo)}</b> (mean ${signed(lo.m)}, ${fmtN(lo.n)} votes); warmest from <b>${nm(hi)}</b> (mean ${signed(hi.m)}, ${fmtN(hi.n)} votes).</span></p>`;
    }
    const rows = [];
    for (let h = 0; h < 24; h++) rows.push([hour12(h), ...WD.map((_, d) => { const c = cells[d][h]; return c.n ? signed(c.sum / c.n) + ' <span class="subtle">(' + c.n + ')</span>' : '–'; })]);
    return card('hm', 'Sensation through the day', 'Mean vote by weekday and hour on the participant’s clock, shown as the nearest step',
      chartBox('hm', 'Heatmap of the mean thermal sensation by weekday and hour. ' + (insight ? insight.replace(/<[^>]+>/g, '') : 'Open the table for the numbers.')) +
      `<div class="chart-foot">${legendThermal()}<span class="legend-na">Fewer than 3 votes</span><span class="legend-empty">No check-ins</span></div>${insight}`,
      { table: tbl(['Hour', ...WD], rows) });
  }
  let patSeq = 0;
  function heatSvg(w, cells, many) {
    const lw = 36, gap = 2, cell = Math.max(8, Math.min(26, Math.floor((w - lw) / 24) - gap)), step = cell + gap;
    const ch = Math.max(cell, 20), vstep = ch + gap;      // rows stay at least 20px tall
    const H = 7 * vstep + 24, pid = 'hcHatch' + (++patSeq);
    let s = svgOpen(Math.min(w, lw + 24 * step), H) + `<defs><pattern id="${pid}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#fff"/><line x1="1" y1="0" x2="1" y2="5" stroke="#D5CFEA" stroke-width="2"/></pattern></defs>`;
    for (let d = 0; d < 7; d++) {
      const y = d * vstep;
      s += `<text class="ax" x="0" y="${(y + ch / 2 + 4).toFixed(1)}">${WD[d]}</text>`;
      for (let h = 0; h < 24; h++) {
        const c = cells[d][h], x = lw + h * step;
        const when = WD_LONG[d] + ' · ' + hour12(h);
        let fill, t;
        if (!c.n) { fill = 'class="hm-cell hm-none"'; t = tipAttr(when, 'No check-ins'); }
        else {
          const m = c.sum / c.n, sv = stepOf(m);
          const from = many ? ' from ' + plural(c.homes.size, 'home') : '';
          if (c.n < 3) { fill = `class="hm-cell hm-few" fill="url(#${pid})"`; t = tipAttr(when, plural(c.n, 'vote') + from + ', too few for a color', 'Mean ' + signed(m)); }
          else { fill = `class="hm-cell ${fcls(sv)}"`; t = tipAttr(when, 'Mean ' + signed(m) + ' · ' + sv.word, plural(c.n, 'vote') + from); }
        }
        s += `<rect ${fill} x="${x}" y="${y}" width="${cell}" height="${ch}" rx="${cell >= 14 ? 4 : 3}"${t}/>`;
      }
    }
    [0, 6, 12, 18].forEach(h => { s += `<text class="ax" x="${lw + h * step}" y="${7 * vstep + 15}">${h === 12 ? 'Noon' : hour12(h)}</text>`; });
    s += `<text class="ax" x="${lw + 24 * step - gap}" y="${7 * vstep + 15}" text-anchor="end">12 AM</text>`;
    return s + '</svg>';
  }

  /* ---------------------------------------------------------------- (3) check-ins per day */
  function dayDomain(ctx) {
    const from = ctx.spanStart, to = ctx.today;
    const days = []; for (let d = from; d <= to; d++) days.push(d);
    return days;
  }
  function dailyCard(ctx, span) {
    const days = dayDomain(ctx);
    const per = new Map(), who = new Map();
    ctx.V.forEach(x => { if (x.dn === null) return; per.set(x.dn, (per.get(x.dn) || 0) + 1); if (!who.has(x.dn)) who.set(x.dn, new Set()); who.get(x.dn).add(x.code); });
    const vals = days.map(d => per.get(d) || 0);
    const mx = Math.max(0, ...vals), at = days[vals.indexOf(mx)];
    addChart('daily', w => dailySvg(w, days, per, who, ctx.today, ctx.sel === 'ALL'));
    return card('daily', 'Check-ins per day', `${mx ? 'Peak ' + fmtN(mx) + ' on ' + dnShort(at) : 'None yet'} · today is still in progress`,
      chartBox('daily', `Check-ins per day from ${dnShort(days[0])} to ${dnShort(days[days.length - 1])}; peak ${mx}.`),
      { span, table: tbl(['Date', 'Check-ins', ctx.sel === 'ALL' ? 'Participants' : ''].filter(Boolean), days.slice().reverse().map(d => [dnLong(d) + ', ' + dnYear(d), fmtN(per.get(d) || 0), ...(ctx.sel === 'ALL' ? [fmtN(who.has(d) ? who.get(d).size : 0)] : [])])) });
  }
  function dailySvg(w, days, per, who, today, many) {
    const H = 220, pl = 38, pr = 6, pt = 10, pb = 28, pw = w - pl - pr, ph = H - pt - pb;
    const mx = Math.max(1, ...days.map(d => per.get(d) || 0));
    const tk = ticks(mx), top = tk[tk.length - 1];
    const slot = pw / days.length, bw = Math.max(2, Math.min(22, slot * .66));
    let s = svgOpen(w, H);
    tk.forEach(v => { const y = pt + ph - v / top * ph, yl = (v ? y : y + .5).toFixed(1); s += `<line class="${v ? 'gl' : 'bl'}" x1="${pl}" x2="${w - pr}" y1="${yl}" y2="${yl}"/><text class="ax" x="${pl - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end">${fmtN(v)}</text>`; });
    const every = Math.max(1, Math.ceil(64 / slot));
    days.forEach((d, i) => {
      const k = per.get(d) || 0, h = k ? Math.max(2, k / top * ph) : 0, x = pl + i * slot + (slot - bw) / 2, y = pt + ph - h;
      const sub = plural(k, 'check-in') + (many && k ? ' · ' + plural(who.get(d).size, 'participant') : '') + (d === today ? ' · today, still in progress' : '');
      s += `<g class="col"${tipAttr(dnLong(d), sub)}><rect class="hit" x="${(pl + i * slot).toFixed(1)}" y="${pt}" width="${slot.toFixed(1)}" height="${ph + pb}"/>`;
      if (h) s += `<path class="${d === today ? 'bar-today' : 'bar'}" d="${barPath(x, y, bw, h, Math.min(4, bw / 2))}"/>`;
      s += '</g>';
      if ((days.length - 1 - i) % every === 0) s += `<text class="${d === today ? 'ax-today' : 'ax'}" x="${(pl + i * slot + slot / 2).toFixed(1)}" y="${H - 8}" text-anchor="${i === days.length - 1 ? 'end' : 'middle'}">${d === today ? 'Today' : (days.length <= 7 ? WD[dnDow(d)] + ' ' : '') + dnShort(d)}</text>`;
    });
    return s + '</svg>';
  }

  /* ---------------------------------------------------------------- (4) warm-up and cool-down by day */
  function warmCard(ctx) {
    const days = dayDomain(ctx);
    const per = new Map();
    ctx.V.forEach(x => { if (x.dn === null || x.tsv === null) return; if (!per.has(x.dn)) per.set(x.dn, [0, 0, 0, 0, 0, 0, 0]); per.get(x.dn)[x.tsv + 3]++; });
    addChart('warm', w => warmSvg(w, days, per, ctx.today));
    const rows = days.slice().reverse().filter(d => per.has(d)).map(d => { const c = per.get(d); return [dnLong(d) + ', ' + dnYear(d), ...c.map(fmtN), signed(countsMean(c))]; });
    return card('warm', 'Warm-up and cool-down by day', 'Each column is one day: warm votes stack up, cool votes stack down, neutral sits on the line',
      chartBox('warm', 'Stacked votes per day, warm above and cool below the neutral line. Open the table for the numbers.') + `<div class="chart-foot">${legendSteps()}</div>`,
      { span: true, table: tbl(['Date', ...SENSE.map(s => s.sign), 'Mean'], rows) });
  }
  function warmSvg(w, days, per, today) {
    const H = 280, pl = 44, pr = 6, pt = 30, pb = 34, pw = w - pl - pr, ph = H - pt - pb, mid = pt + ph / 2;
    let mx = 1;
    days.forEach(d => { const c = per.get(d); if (!c) return; const half = c[3] / 2; mx = Math.max(mx, half + c[4] + c[5] + c[6], half + c[0] + c[1] + c[2]); });
    const tk = ticks(mx, 3), top = tk[tk.length - 1], k = (ph / 2) / top;
    const slot = pw / days.length, bw = Math.max(2, Math.min(22, slot * .66)), gap = bw >= 6 ? 2 : 1;
    let s = svgOpen(w, H);
    tk.forEach(v => { if (!v) return; [mid - v * k, mid + v * k].forEach(y => { s += `<line class="gl" x1="${pl}" x2="${w - pr}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/><text class="ax" x="${pl - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end">${fmtN(v)}</text>`; }); });
    s += `<text class="ax-b" x="0" y="12">▲ Warmer</text><text class="ax-b" x="0" y="${H - 2}">▼ Cooler</text>`;
    const every = Math.max(1, Math.ceil(64 / slot));
    days.forEach((d, i) => {
      const c = per.get(d), x = pl + i * slot + (slot - bw) / 2;
      if (c) {
        const n = c.reduce((a, b) => a + b, 0), warm = c[4] + c[5] + c[6], cool = c[0] + c[1] + c[2];
        const t = tipAttr(dnLong(d) + ' · ' + plural(n, 'vote'), 'Warm side ' + warm + (warm ? ' (+3: ' + c[6] + ', +2: ' + c[5] + ', +1: ' + c[4] + ')' : ''), 'Neutral ' + c[3], 'Cool side ' + cool + (cool ? ' (−1: ' + c[2] + ', −2: ' + c[1] + ', −3: ' + c[0] + ')' : ''), 'Mean ' + signed(countsMean(c)) + (d === today ? ' · today, still in progress' : ''));
        s += `<g class="stack-col"${t}><rect class="hit" x="${(pl + i * slot).toFixed(1)}" y="${pt}" width="${slot.toFixed(1)}" height="${ph}"/>`;
        // neutral straddles the line; warm steps outward above it, cool steps outward below it
        const segs = [];
        const half = c[3] / 2 * k;
        if (c[3]) segs.push({ y0: mid - half, y1: mid + half, cls: fcls(SENSE[3]), end: '' });
        let y = mid - half; const lastW = c[6] ? 6 : c[5] ? 5 : 4;
        for (let j = 4; j <= 6; j++) if (c[j]) { const h = c[j] * k; segs.push({ y0: y - h, y1: y, cls: fcls(SENSE[j]), end: j === lastW ? 'up' : '' }); y -= h; }
        y = mid + half; const lastC = c[0] ? 0 : c[1] ? 1 : 2;
        for (let j = 2; j >= 0; j--) if (c[j]) { const h = c[j] * k; segs.push({ y0: y, y1: y + h, cls: fcls(SENSE[j]), end: j === lastC ? 'down' : '' }); y += h; }
        segs.forEach(g => {
          let y0 = g.y0 + gap / 2, y1 = g.y1 - gap / 2;
          if (y1 - y0 < 1) { y0 = g.y0; y1 = g.y1; }
          s += g.end ? `<path class="seg-mark ${g.cls}" d="${barPath(x, y0, bw, y1 - y0, Math.min(4, bw / 2), g.end === 'up')}"/>` : `<rect class="seg-mark ${g.cls}" x="${x.toFixed(1)}" y="${y0.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(.5, y1 - y0).toFixed(1)}"/>`;
        });
        s += '</g>';
      }
      if ((days.length - 1 - i) % every === 0) s += `<text class="${d === today ? 'ax-today' : 'ax'}" x="${(pl + i * slot + slot / 2).toFixed(1)}" y="${H - 17}" text-anchor="${i === days.length - 1 ? 'end' : 'middle'}">${d === today ? 'Today' : dnShort(d)}</text>`;
    });
    s += `<line class="bl-0" x1="${pl}" x2="${w - pr}" y1="${mid}" y2="${mid}"/>`;
    return s + '</svg>';
  }

  /* ---------------------------------------------------------------- (5) sensation by heating system and by home type */
  function divCards(ctx) {
    const byHeat = new Map(), byType = new Map();
    const homes = (m, k) => { if (!m.has(k)) m.set(k, { k, c: [0, 0, 0, 0, 0, 0, 0], homes: new Set() }); return m.get(k); };
    ctx.V.forEach(x => {
      if (x.tsv === null) return;
      const p = person(x.code); if (!p) return;
      const h = homeOf(p);
      listOf(h.heating).forEach(v => { const g = homes(byHeat, v); g.c[x.tsv + 3]++; g.homes.add(x.code); });
      if (h.home_type) { const g = homes(byType, h.home_type); g.c[x.tsv + 3]++; g.homes.add(x.code); }
    });
    const one = (id, title, group, labGroup, m) => {
      const list = [...m.values()].map(g => Object.assign(g, { n: g.c.reduce((a, b) => a + b, 0) })).sort((a, b) => b.n - a.n);
      const body = list.length ? divHtml(list, group, labGroup) : `<p class="tnote">No ${group === 'heating' ? 'heating systems' : 'home types'} recorded for the homes in this view yet.</p>`;
      return card(id, title, 'Share of votes, centered on neutral' + (group === 'heating' ? ' · a home with several systems counts in each' : ''), body,
        { table: tbl([group === 'heating' ? 'Heating' : 'Home type', 'Homes', 'Votes', ...SENSE.map(s => s.sign), 'Mean'], list.map(g => [esc(lab(labGroup, g.k)), fmtN(g.homes.size), fmtN(g.n), ...g.c.map(k => pct(k, g.n)), signed(countsMean(g.c))])) });
    };
    return one('byheat', 'Sensation by heating system', 'heating', 'heating', byHeat) + one('bytype', 'Sensation by home type', 'home_type', 'home_type', byType);
  }
  function divHtml(list, group, labGroup) {
    let ext = .01;
    list.forEach(g => { const n = g.n || 1, half = g.c[3] / n / 2; ext = Math.max(ext, half + (g.c[0] + g.c[1] + g.c[2]) / n, half + (g.c[4] + g.c[5] + g.c[6]) / n); });
    const k = 50 / ext;     // percent of the track per unit share, so the longest side just fits
    const rows = list.map(g => {
      const n = g.n || 1, sh = g.c.map(v => v / n);
      const segs = [];
      let x = 50 - sh[3] / 2 * k;
      if (sh[3]) segs.push({ i: 3, l: x, w: sh[3] * k });
      let r = x + sh[3] * k;
      for (let i = 4; i <= 6; i++) if (sh[i]) { segs.push({ i, l: r, w: sh[i] * k }); r += sh[i] * k; }
      let l = x;
      for (let i = 2; i >= 0; i--) if (sh[i]) { l -= sh[i] * k; segs.push({ i, l, w: sh[i] * k }); }
      const minL = Math.min(...segs.map(s => s.l)), maxR = Math.max(...segs.map(s => s.l + s.w));
      const cool = g.c[0] + g.c[1] + g.c[2], warm = g.c[4] + g.c[5] + g.c[6];
      const name = lab(labGroup, g.k);
      return `<div class="div-row${g.n < 10 ? ' div-few' : ''}">
        <span class="div-lab">${artOf(group, g.k)}<span><b>${esc(name)}</b><small>${plural(g.homes.size, 'home')} · ${plural(g.n, 'vote')}${g.n < 10 ? ' · too few to compare' : ''}</small></span></span>
        <span class="div-stat"><b>${pct(cool, g.n)}</b> cool · <b>${pct(warm, g.n)}</b> warm</span>
        <span class="div-track">${segs.map(s => `<i class="${SENSE[s.i].cls}${Math.abs(s.l - minL) < 1e-6 ? ' l-end' : ''}${Math.abs(s.l + s.w - maxR) < 1e-6 ? ' r-end' : ''}" style="left:${s.l.toFixed(2)}%;width:${s.w.toFixed(2)}%"${tipAttr(name + ' · ' + SENSE[s.i].sign + ' ' + SENSE[s.i].word, pct(g.c[s.i], g.n) + ' of ' + plural(g.n, 'vote'))}></i>`).join('')}</span>
      </div>`;
    }).join('');
    return `<div class="div-list" role="img" aria-label="${esc(list.map(g => lab(labGroup, g.k) + ': ' + pct(g.c[0] + g.c[1] + g.c[2], g.n) + ' cool, ' + pct(g.c[4] + g.c[5] + g.c[6], g.n) + ' warm').join('; '))}">${rows}</div>
      <div class="div-axis" aria-hidden="true"><span>◀ Cooler</span><span>Neutral</span><span>Warmer ▶</span></div>
      <div class="chart-foot">${legendThermal()}<span>Pale bars: fewer than 10 votes</span></div>`;
  }

  /* ---------------------------------------------------------------- (6) home profiles */
  function homesInView(ctx) {
    const act = new Set(ctx.V.map(x => x.code));
    return st.people.filter(p => {
      if (st.range !== 'all') return act.has(String(p.code).toUpperCase());
      return st.local || dbStale() || p.approved;
    });
  }
  function homesCard(ctx) {
    const list = homesInView(ctx);
    const nH = list.length;
    const sub = st.range === 'all' ? `${plural(nH, 'enrolled home')} · heating and cooling allow several answers` : `${plural(nH, 'home')} that checked in during ${esc(rangeWords())} · heating and cooling allow several answers`;
    if (!nH) return card('homes', 'Home profiles', sub, `<p class="tnote">${st.local ? 'Home profiles are kept in the study database, so local mode has none to show.' : 'No home profiles in this view yet.'}</p>`, { span: true });
    const tally = (key, multi) => { const m = new Map(); list.forEach(p => { const h = homeOf(p); (multi ? [...new Set(listOf(h[key]))] : (h[key] ? [h[key]] : [])).forEach(v => m.set(v, (m.get(v) || 0) + 1)); }); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
    const col = (title, key, group, multi) => {
      const t = tally(key, multi), mx = Math.max(1, ...t.map(x => x[1]));
      return `<div><h3 class="hp-h">${title}<span>homes</span></h3>${t.length ? t.map(([v, n]) => `<div class="hb-row"${tipAttr(lab(group, v), plural(n, 'home') + ' · ' + pct(n, nH) + ' of ' + nH)}>${artOf(group, v)}<span class="lb">${esc(lab(group, v))}</span><span class="vv">${n}<small>${pct(n, nH)}</small></span><span class="bt"><i style="width:${(100 * n / mx).toFixed(1)}%"></i></span></div>`).join('') : '<p class="tnote">Not answered yet</p>'}</div>`;
    };
    const areas = list.map(p => num(homeOf(p).floor_area_m2)).filter(v => v !== null && v > 0);
    const rooms = list.map(p => num(homeOf(p).rooms)).filter(v => v !== null);
    const beds = list.map(p => num(homeOf(p).bedrooms)).filter(v => v !== null);
    const ppl = list.map(p => { const h = homeOf(p); const a = num(h.adults), c = num(h.children); return a === null && c === null ? null : (a || 0) + (c || 0); }).filter(v => v !== null);
    const pets = list.filter(p => num(homeOf(p).pets) > 0).length;
    const med = (ic, big, small) => `<div class="med"><span class="icon-tile">${icon(ic)}</span><span><b>${big}</b><small>${small}</small></span></div>`;
    addChart('setp', w => setpointSvg(w, list));
    const tRows = [];
    [['Home type', 'home_type', 'home_type', false], ['Heating', 'heating', 'heating', true], ['Cooling', 'cooling', 'cooling', true], ['Thermostat', 'thermostat', 'thermostat', false], ['Year built', 'year_built', 'year_built', false], ['Tenure', 'tenure', 'tenure', false]]
      .forEach(([g, key, group, multi]) => tally(key, multi).forEach(([v, n]) => tRows.push([esc(g), esc(lab(group, v)), fmtN(n), pct(n, nH)])));
    const spRows = list.filter(p => num(homeOf(p).setpoint_winter_c) !== null || num(homeOf(p).setpoint_summer_c) !== null)
      .map(p => [esc(p.code), esc(fmtTemp(homeOf(p).setpoint_winter_c) || '–'), esc(fmtTemp(homeOf(p).setpoint_summer_c) || '–')]);
    const table = `<table class="data-table"><thead><tr><th scope="col">Question</th><th scope="col">Answer</th><th scope="col" class="n">Homes</th><th scope="col" class="n">Share</th></tr></thead><tbody>${tRows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="n">${r[2]}</td><td class="n">${r[3]}</td></tr>`).join('')}</tbody></table>` +
      (spRows.length ? `<table class="data-table" style="margin-top:12px"><thead><tr><th scope="col">Home</th><th scope="col" class="n">Winter setting</th><th scope="col" class="n">Summer setting</th></tr></thead><tbody>${spRows.map(r => `<tr><td>${r[0]}</td><td class="n">${r[1]}</td><td class="n">${r[2]}</td></tr>`).join('')}</tbody></table>` : '');
    const body = `<div class="hp-cols">${col('Home type', 'home_type', 'home_type', false)}${col('Heating', 'heating', 'heating', true)}${col('Cooling', 'cooling', 'cooling', true)}</div>
      <div class="hp-setp stack stack-3"><h3 class="hp-h">Thermostat settings<span>one dot per home</span></h3>${chartBox('setp', 'Usual thermostat settings, one dot per home, winter and summer. Open the table for the numbers.')}</div>
      <div class="medians">
        ${med('ruler', areas.length ? fmtArea(median(areas)) : '–', 'median floor area' + (areas.length < nH ? ' · ' + areas.length + ' answered' : ''))}
        ${med('layers', rooms.length ? round1(median(rooms)) + ' rooms' : '–', beds.length ? 'median · ' + round1(median(beds)) + ' bedrooms' : 'median')}
        ${med('users', ppl.length ? round1(mean(ppl)) + ' people' : '–', 'mean per home')}
        ${med('heart', pct(pets, nH), 'of homes have pets')}
      </div>`;
    return card('homes', 'Home profiles', sub, body, { span: true, table });
  }
  function setpointSvg(w, list) {
    const rowsDef = [['Winter', 'setpoint_winter_c'], ['Summer', 'setpoint_summer_c']];
    const vals = rowsDef.map(([, key]) => list.map(p => ({ code: p.code, c: num(homeOf(p)[key]) })).filter(x => x.c !== null));
    if (!vals[0].length && !vals[1].length) return '<p class="tnote">No thermostat settings recorded for these homes.</p>';
    const us = isUS(), bin = us ? 1 : .5;
    let lo = us ? 60 : 16, hi = us ? 80 : 27;
    vals.forEach(v => v.forEach(x => { const t = tempVal(x.c); lo = Math.min(lo, Math.floor(t)); hi = Math.max(hi, Math.ceil(t)); }));
    const pl = 92, pr = 16, pw = w - pl - pr, X = t => pl + (t - lo) / (hi - lo) * pw;
    const stacks = vals.map(v => { const m = new Map(); v.forEach(x => { const b = Math.round(tempVal(x.c) / bin) * bin; if (!m.has(b)) m.set(b, []); m.get(b).push(x); }); return m; });
    const tallest = Math.max(1, ...stacks.map(m => Math.max(0, ...[...m.values()].map(a => a.length))));
    const r = tallest > 8 ? 4 : 5, dy = tallest > 8 ? 9 : 11;
    const heights = stacks.map(m => Math.max(1, ...[...m.values()].map(a => a.length)) * dy + 26);
    const H = heights[0] + heights[1] + 26;
    let s = svgOpen(w, H), y0 = 0;
    const tickStep = us ? 2 : 1, labStep = us ? 4 : 2;
    rowsDef.forEach(([name], ri) => {
      const base = y0 + heights[ri] - 10;
      const v = vals[ri];
      s += `<text class="ax-b" x="0" y="${base - 4}">${name}</text>`;
      if (v.length) {
        const md = median(v.map(x => tempVal(x.c)));
        s += `<text class="ax" x="0" y="${base + 12}">median ${us ? Math.round(md) + '°F' : round1(md) + '°C'}</text>`;
      } else s += `<text class="ax" x="0" y="${base + 12}">no answers</text>`;
      s += `<line class="bl" x1="${pl}" x2="${w - pr}" y1="${base + .5}" y2="${base + .5}"/>`;
      stacks[ri].forEach((arr, b) => arr.forEach((x, j) => {
        const cx = X(b), cy = base - r - 2 - j * dy;
        s += `<circle class="sp-dot" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}"${tipAttr(x.code, name + ' setting ' + fmtTemp(x.c) + (us ? ' (' + (Math.round(x.c * 2) / 2) + '°C)' : ' (' + Math.round(x.c * 9 / 5 + 32) + '°F)'))}/>`;
      }));
      if (v.length) { const mx = X(median(v.map(x => tempVal(x.c)))); s += `<line class="sp-med" x1="${mx.toFixed(1)}" x2="${mx.toFixed(1)}" y1="${y0 + 4}" y2="${base}"/>`; }
      y0 += heights[ri];
    });
    for (let t = Math.ceil(lo / tickStep) * tickStep; t <= hi; t += tickStep) {
      const x = X(t);
      s += `<line class="gl" x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${y0 + 2}" y2="${y0 + 6}"/>`;
      if (t % labStep === 0) s += `<text class="ax" x="${x.toFixed(1)}" y="${y0 + 20}" text-anchor="middle">${t}°</text>`;
    }
    return s + '</svg>';
  }

  /* ---------------------------------------------------------------- (7) participant drill-down */
  function profileHtml(ctx) {
    const code = ctx.sel, p = ctx.p;
    if (!p) return `<section class="card"><div class="note">${icon('info')}<div>No profile is stored for <b>${esc(code)}</b>. ${st.local ? 'Local mode shows only the check-ins kept in this browser.' : 'It may be test data, or the participant was removed (their check-ins are kept under the code).'}</div></div></section>`;
    const h = homeOf(p);
    const age = num(p.birth_year) ? new Date().getFullYear() - num(p.birth_year) : null;
    const pu = pausedOf(code);
    const phones = st.phonesBy.get(code) || [];
    const reminders = !HC.live ? '–' : !st.phones ? 'Unknown (the registered phones could not be read)' : !phones.length ? 'No phone registered' : pu ? 'Paused until ' + new Date(pu).toLocaleString('en-US', { timeZone: TZ, weekday: 'short', hour: 'numeric', minute: '2-digit' }) : phones.some(ph => ph.enabled !== false) ? 'On · ' + plural(phones.length, 'phone') : 'Off';
    const last = (st.rowsBy.get(code) || [])[0];
    const status = dbStale() ? '<span class="badge badge-warn">Status unknown until the database is updated</span>' : p.approved ? `<span class="badge badge-good">${icon('check')}Approved</span>` : `<span class="badge badge-violet badge-dot">Waiting for approval</span>`;
    const f = (k, v) => `<div><dt>${k}</dt><dd>${v ? esc(v) : '–'}</dd></div>`;
    const actions = (st.local || dbStale()) ? '' : `<div class="p-actions" data-errhost>${p.approved ? '' : `<button class="btn btn-primary btn-sm" type="button" data-act="approve" data-code="${esc(code)}">${icon('check')}Approve</button>`}<button class="btn btn-danger btn-sm" type="button" data-act="remove" data-code="${esc(code)}">Remove from the study</button><span class="caption">${p.approved ? 'Remove deletes the profile and any registered phones; check-ins already submitted are kept under the code.' : 'They cannot check in until approved. Remove anyone you do not recognize.'}</span></div>`;
    const g = (art, k, v) => v ? `<div class="glance-item">${art}<span class="glance-text"><span class="glance-k">${k}</span><span class="glance-v">${esc(v)}</span></span></div>` : '';
    const heat = listOf(h.heating), cool = listOf(h.cooling);
    const ppl = [num(h.adults) ? plural(num(h.adults), 'adult') : '', num(h.children) ? plural(num(h.children), 'child', 'children') : '', num(h.pets) ? plural(num(h.pets), 'pet') : ''].filter(Boolean).join(', ');
    const floors = num(h.floors) !== null ? (num(h.floors) >= 4 ? '4 or more floors' : plural(num(h.floors), 'floor')) : '';
    const unitFloor = num(h.unit_floor) !== null ? (num(h.unit_floor) === 0 ? 'Basement' : num(h.unit_floor) === 1 ? 'Ground floor (1st)' : 'Floor ' + num(h.unit_floor)) : '';
    const setp = [h.setpoint_winter_c != null ? 'Winter ' + fmtTemp(h.setpoint_winter_c) : '', h.setpoint_summer_c != null ? 'Summer ' + fmtTemp(h.setpoint_summer_c) : ''].filter(Boolean).join(' · ');
    const glance = [
      g(artOf('home_type', h.home_type), 'Home', lab('home_type', h.home_type)),
      g(artOf('tenure', h.tenure), 'Tenure', lab('tenure', h.tenure)),
      g(known('year_built', h.year_built) ? artOf('year_built', h.year_built) : HCI.art('year_built'), 'Built', lab('year_built', h.year_built)),
      g(HCI.art(num(h.floors) ? 'floors:' + Math.max(1, Math.min(4, num(h.floors))) : 'floors'), 'Floors', [floors, unitFloor].filter(Boolean).join(' · ')),
      g(HCI.art('floor_area'), 'Floor area', h.floor_area_m2 != null ? fmtArea(h.floor_area_m2) : ''),
      g(HCI.art('rooms'), 'Rooms', [num(h.rooms) !== null ? plural(num(h.rooms), 'room') : '', num(h.bedrooms) !== null ? (num(h.bedrooms) >= 6 ? '6+ bedrooms' : plural(num(h.bedrooms), 'bedroom')) : ''].filter(Boolean).join(' · ')),
      g(HCI.art('people:adult'), 'People', ppl),
      g(heat.length ? artOf('heating', heat[0]) : HCI.art('none'), 'Heating', heat.map(v => lab('heating', v)).join(', ')),
      g(cool.length ? artOf('cooling', cool[0]) : HCI.art('none'), 'Cooling', cool.map(v => lab('cooling', v)).join(', ')),
      g(artOf('thermostat', h.thermostat), 'Thermostat', [lab('thermostat', h.thermostat), setp].filter(Boolean).join(' · ')),
      g(artOf('windows', h.windows), 'Windows', [lab('windows', h.windows), h.windows_open ? lab('windows_open', h.windows_open).toLowerCase() : ''].filter(Boolean).join(' · ')),
      g(HCI.art('facing'), 'Living room faces', lab('facing', h.facing)),
      g(known('draftiness', String(num(h.draftiness))) ? HCI.art('draftiness:' + num(h.draftiness)) : HCI.art('unsure'), 'In winter', h.draftiness != null ? lab('draftiness', String(num(h.draftiness))) : ''),
      g(HCI.art('zip'), 'ZIP code', h.zip ? String(h.zip) : '')
    ].filter(Boolean).join('');
    return `<section class="card card-raised pcard" aria-label="Profile of ${esc(code)}">
      <div class="stack stack-5">
        <div class="p-head"><span class="avatar" aria-hidden="true">${esc(initials(p.name))}</span><div style="min-width:0"><h2 class="p-name">${esc(p.name || code)}</h2>${p.email ? `<a class="p-mail" href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : ''}<div class="p-badges"><span class="badge badge-ink">${esc(code)}</span>${status}${pu ? `<span class="badge badge-warn">${icon('pause')}Paused</span>` : ''}</div></div></div>
        <dl class="facts">
          ${f('Gender', lab('gender', p.gender))}${f('Age', age !== null ? String(age) : '')}${f('Sensitivity', lab('sensitivity', p.sensitivity))}
          ${f('Height', fmtHeight(p.height_cm))}${f('Weight', fmtWeight(p.weight_kg))}${f('App shows', p.units === 'metric' ? '°C · m²' : p.units === 'us' ? '°F · sq ft' : '')}
          ${f('Registered', fmtIsoDate(p.created_at))}${f('Reminders', reminders)}${f('Last check-in', last ? ago(last.t) : 'None yet')}
        </dl>
        ${actions}
      </div>
      <div><h3 class="glance-h">The home, at a glance</h3>${glance ? `<div class="glance">${glance}</div>` : '<p class="tnote">No home profile was saved for this participant.</p>'}</div>
    </section>`;
  }
  function lineCard(ctx) {
    const days = dayDomain(ctx);
    const pts = ctx.V.filter(x => x.tsv !== null && x.dn !== null);
    const byDay = new Map(); pts.forEach(x => { if (!byDay.has(x.dn)) byDay.set(x.dn, []); byDay.get(x.dn).push(x.tsv); });
    addChart('pline', w => lineSvg(w, days, pts, byDay, ctx.today));
    const m = mean(pts.map(x => x.tsv));
    const rows = days.slice().reverse().filter(d => byDay.has(d)).map(d => { const a = byDay.get(d); return [dnLong(d) + ', ' + dnYear(d), fmtN(a.length), signed(mean(a)), signed(Math.min(...a)), signed(Math.max(...a))]; });
    return card('pline', 'Daily mean sensation', `${plural(pts.length, 'vote')}${m === null ? '' : ' · mean ' + signed(m)} · each dot is one check-in`,
      chartBox('pline', `Daily mean thermal sensation with every vote as a dot. Overall mean ${m === null ? 'not available' : signed(m)}.`) + `<div class="chart-foot"><span class="legend-line">Daily mean</span>${legendThermal()}</div>`,
      { span: true, table: tbl(['Date', 'Votes', 'Mean', 'Lowest', 'Highest'], rows) });
  }
  function lineSvg(w, days, pts, byDay, today) {
    const H = 250, pl = 86, pr = 10, pt = 10, pb = 28, pw = w - pl - pr, ph = H - pt - pb;
    const d0 = days[0], span = days.length;
    const X = v => pl + (v - d0) / span * pw, Y = v => pt + (3 - v) / 6 * ph;
    let s = svgOpen(w, H);
    SENSE.slice().reverse().forEach(st_ => {
      const y = Y(st_.v);
      s += `<line class="${st_.v === 0 ? 'bl' : 'gl'}" x1="${pl}" x2="${w - pr}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
      if (st_.v % 3 === 0 || ph > 200) s += `<text class="${st_.v % 3 === 0 ? 'ax-b' : 'ax'}" x="${pl - 10}" y="${(y + 4).toFixed(1)}" text-anchor="end">${st_.sign} ${esc(st_.v % 3 === 0 ? st_.word : shortWord(st_))}</text>`;
    });
    const slot = pw / span, every = Math.max(1, Math.ceil(70 / slot));
    days.forEach((d, i) => { if ((span - 1 - i) % every === 0) s += `<text class="${d === today ? 'ax-today' : 'ax'}" x="${(X(d) + slot / 2).toFixed(1)}" y="${H - 6}" text-anchor="${i === span - 1 ? 'end' : 'middle'}">${d === today ? 'Today' : dnShort(d)}</text>`; });
    const means = days.filter(d => byDay.has(d)).map(d => ({ d, m: mean(byDay.get(d)), n: byDay.get(d).length }));
    if (means.length > 1) s += `<path class="mean-line" d="M${means.map(o => X(o.d + .5).toFixed(1) + ',' + Y(o.m).toFixed(1)).join('L')}"/>`;
    const r = slot >= 24 ? 6 : slot >= 10 ? 5 : 4;
    pts.forEach(x => {
      const fx = x.dn + ((x.hour || 0) + (x.min || 0) / 60) / 24, sv = stepOf(x.tsv);
      s += `<circle class="vote-dot ${fcls(sv)}" cx="${X(fx).toFixed(1)}" cy="${Y(x.tsv).toFixed(1)}" r="${r}"${tipAttr(dnLong(x.dn) + ', ' + clock(x.hour || 0, x.min || 0), sv.sign + ' ' + sv.word, lab('room', x.r.room))}/>`;
    });
    means.forEach(o => { s += `<circle class="mean-dot" cx="${X(o.d + .5).toFixed(1)}" cy="${Y(o.m).toFixed(1)}" r="3.5"${tipAttr(dnLong(o.d) + ' · daily mean ' + signed(o.m), plural(o.n, 'vote'))}/>`; });
    return s + '</svg>';
  }
  function recentCard(ctx) {
    const list = ctx.V.slice(0, 8);
    const pill = (ic, t) => t ? `<span class="pill">${ic ? icon(ic) : ''}${esc(t)}</span>` : '';
    const items = list.map(x => {
      const r = x.r, sv = x.tsv !== null ? stepOf(x.tsv) : null;
      const meta = [x.dn !== null ? dnLong(x.dn) + ', ' + clock(x.hour || 0, x.min || 0) : '', lab('prompt', r.prompt), lab('at_home', r.at_home), num(r.seconds) !== null ? num(r.seconds) + ' s' : ''].filter(Boolean).join(' · ');
      const garments = listOf(r.garments).map(g => lab('garments', g)).join(', ');
      const tags = [pill('home', lab('room', r.room)), pill('walk', [lab('activity', r.activity), num(r.met) !== null ? num(r.met) + ' met' : ''].filter(Boolean).join(' · ')), pill('tshirt', (num(r.clo) !== null ? num(r.clo) + ' clo' : '') + (garments ? (num(r.clo) !== null ? ': ' : '') + garments : '')),
        pill('wind', lab('air', r.air)), pill(r.sun === 'dark' ? 'moon' : 'sun-small', lab('sun', r.sun)),
        ...listOf(r.actions).map(a => pill('refresh', lab('actions', a))), ...listOf(r.notes).map(a => pill('info', lab('notes', a)))].join('');
      return `<div class="rc">${sv ? `<span class="orb ${sv.cls}" aria-hidden="true">${icon(sv.icon)}</span>` : `<span class="orb" aria-hidden="true">${icon('help')}</span>`}
        <div class="rc-body"><div class="rc-top"><b>${sv ? esc(sv.word) : 'No vote'}</b>${sv ? `<span class="num">${sv.sign}</span>` : ''}${r.same_as_last ? '<span class="badge badge-violet">Same as last</span>' : ''}</div>
        <div class="rc-meta">${esc(meta)}</div>${tags ? `<div class="rc-tags">${tags}</div>` : ''}</div></div>`;
    }).join('');
    return card('recent', 'Recent check-ins', `The latest ${list.length} in ${esc(rangeWords())}`, `<div class="rc-list">${items}</div>`, { span: true });
  }

  /* ---------------------------------------------------------------- check-ins table */
  const cell = v => Array.isArray(v) ? v.join('|') : v === null || v === undefined ? '' : typeof v === 'boolean' ? (v ? 'yes' : 'no') : String(v);
  function tableHtml(ctx) {
    const shown = ctx.V.slice(0, TABLE_CAP);
    const body = shown.map(x => '<tr>' + COLS.map(c => {
      if (c === 'tsv' && x.tsv !== null) { const sv = stepOf(x.tsv); return `<td class="n"><span class="sdot ${sv.cls}" aria-hidden="true"></span>${esc(cell(x.r.tsv))}<span class="sr-only"> ${esc(sv.word)}</span></td>`; }
      return `<td${NUM_COLS.has(c) ? ' class="n"' : ''}>${esc(cell(x.r[c]))}</td>`;
    }).join('') + '</tr>').join('');
    return `<section class="stack stack-3" aria-labelledby="ctTitle">
      <div class="sect-h"><h2 id="ctTitle">Check-ins, newest first</h2><span class="tnote">${ctx.V.length > shown.length ? `Showing the latest ${fmtN(shown.length)} of ${fmtN(ctx.V.length)} in ${esc(rangeWords())}.` : plural(ctx.V.length, 'check-in') + ' in ' + esc(rangeWords()) + '.'} The downloads include every check-in, all dates.</span></div>
      <div class="ctable-wrap" tabindex="0" role="region" aria-labelledby="ctTitle"><table class="data-table ctable"><thead><tr>${COLS.map(c => `<th scope="col"${NUM_COLS.has(c) ? ' class="n"' : ''}>${c}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>
    </section>`;
  }

  /* ---------------------------------------------------------------- SVG helpers */
  function svgOpen(w, h) { return `<svg width="${Math.max(10, Math.floor(w))}" height="${h}" viewBox="0 0 ${Math.max(10, Math.floor(w))} ${h}" aria-hidden="true" focusable="false">`; }
  /* A bar with a 4px rounded data end and a square baseline; up = the data end is at the top. */
  function barPath(x, y, w, h, r, up) {
    if (up === undefined) up = true;
    r = Math.max(0, Math.min(r == null ? 4 : r, w / 2, h));
    const X = v => v.toFixed(1);
    if (up) return `M${X(x)},${X(y + h)}V${X(y + r)}Q${X(x)},${X(y)} ${X(x + r)},${X(y)}H${X(x + w - r)}Q${X(x + w)},${X(y)} ${X(x + w)},${X(y + r)}V${X(y + h)}Z`;
    return `M${X(x)},${X(y)}V${X(y + h - r)}Q${X(x)},${X(y + h)} ${X(x + r)},${X(y + h)}H${X(x + w - r)}Q${X(x + w)},${X(y + h)} ${X(x + w)},${X(y + h - r)}V${X(y)}Z`;
  }
  function ticks(max, n) {
    n = n || 4;
    if (max <= 0) return [0, 1];
    const p = Math.pow(10, Math.floor(Math.log10(max / n)));
    let step = 10 * p;
    for (const m of [1, 2, 2.5, 5, 10]) { const sp = Math.max(1, m * p); if (Math.ceil(max / sp - 1e-9) <= n + 1) { step = sp; break; } }
    const out = []; for (let v = 0; v < max + step - 1e-9; v += step) out.push(Math.round(v * 100) / 100);
    if (out.length < 2) out.push(step);
    return out;
  }
  let lastW = 0;
  function drawCharts() {
    // read every width first, then write: one layout instead of one per chart
    const jobs = [];
    charts.forEach(c => $$('[data-chart="' + c.id + '"]').forEach(el => jobs.push({ c, el, w: el.clientWidth })));
    jobs.forEach(j => {
      if (!j.w) { j.el.dataset.pending = '1'; return; }     // hidden (table view): drawn when shown
      delete j.el.dataset.pending;
      j.el.innerHTML = j.c.draw(j.w);
    });
    lastW = document.documentElement.clientWidth;
  }
  let rz;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(rz);
    rz = requestAnimationFrame(() => { if (document.documentElement.clientWidth !== lastW && $('#main') && charts.length) { hideTip(); drawCharts(); } });
  });

  /* ================================================================ downloads */
  const stamp = () => dnKey(todayDn());
  const fileBase = () => 'homecomfort-ny-' + (st.sel === 'ALL' ? 'all' : st.sel) + (st.local ? '-local' : '') + '-' + stamp();
  function saveBlob(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
  const exportRows = () => st.sel === 'ALL' ? st.R : (st.rowsBy.get(st.sel) || []);
  function downloadCsv() {
    const q = s => /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    const list = exportRows();
    const lines = [COLS.join(','), ...list.map(x => COLS.map(c => q(cell(x.r[c]))).join(','))];
    saveBlob(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }), fileBase() + '.csv');
    toast('CSV downloaded', plural(list.length, 'check-in') + ', all dates');
  }
  /* Excel cells: numbers stay numbers (so they sum and sort), lists are joined with "|", yes/no for true/false. */
  const xv = (v, isNum) => {
    if (Array.isArray(v)) return v.join('|');
    if (v === null || v === undefined || v === '') return undefined;
    if (typeof v === 'boolean') return v ? 'yes' : 'no';
    if (isNum) { const n = num(v); return n === null ? String(v) : n; }
    if (typeof v === 'object') return JSON.stringify(v);
    return v;
  };
  const voteObj = x => { const o = {}; COLS.forEach(c => { o[c] = xv(x.r[c], NUM_COLS.has(c)); }); return o; };
  const personObj = p => {
    const o = {}; PCOLS.forEach(c => { o[c] = xv(p[c], PNUM.has(c)); });
    o.check_ins = (st.rowsBy.get(String(p.code).toUpperCase()) || []).length;
    const h = homeOf(p);
    HOME_KEYS.forEach(k => { o[k] = k === 'zip' ? (h.zip == null || h.zip === '' ? undefined : String(h.zip)) : xv(h[k], HOME_NUM.has(k)); });
    Object.keys(h).filter(k => !HOME_KEYS.includes(k)).forEach(k => { o[k] = xv(h[k], false); });   // any later home question
    return o;
  };
  function sheet(objs, header) {
    const ws = window.XLSX.utils.json_to_sheet(objs, { header });
    ws['!cols'] = header.map(c => ({ wch: Math.max(10, c.length + 2) }));
    return ws;
  }
  function downloadXlsx() {
    if (!window.XLSX) { alert('The spreadsheet library did not load. Check the connection and reload the page, or use Download CSV.'); return; }
    const X = window.XLSX, wb = X.utils.book_new();
    const pHeader = [...PCOLS, 'check_ins', ...HOME_KEYS];
    const extra = new Set(); st.people.forEach(p => Object.keys(homeOf(p)).forEach(k => { if (!HOME_KEYS.includes(k)) extra.add(k); }));
    pHeader.push(...extra);
    const used = new Set();
    const name = n => { let s = String(n).replace(/[\\/?*[\]:]/g, '_').slice(0, 31) || 'Sheet'; let i = 2; while (used.has(s.toLowerCase())) s = (String(n).slice(0, 28) + '_' + i++); used.add(s.toLowerCase()); return s; };
    if (st.sel === 'ALL') {
      if (st.people.length) X.utils.book_append_sheet(wb, sheet(st.people.map(personObj), pHeader), name('Participants'));
      X.utils.book_append_sheet(wb, sheet(st.R.map(voteObj), COLS), name('All'));
      st.entries.forEach(e => { if (e.rows.length) X.utils.book_append_sheet(wb, sheet(e.rows.map(voteObj), COLS), name(e.code)); });
    } else {
      const p = person(st.sel);
      if (p) X.utils.book_append_sheet(wb, sheet([personObj(p)], pHeader), name('Profile'));
      X.utils.book_append_sheet(wb, sheet(exportRows().map(voteObj), COLS), name(st.sel));
    }
    X.writeFile(wb, fileBase() + '.xlsx');
    toast('Excel workbook downloaded', plural(exportRows().length, 'check-in') + ', all dates');
  }

  /* ================================================================ events */
  app.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b || !app.contains(b)) return;
    const act = b.getAttribute('data-act');
    if (act === 'sel') {
      const c = b.getAttribute('data-code');
      if (c !== st.sel) { st.sel = c; rerenderMain(true); }
      revealSel();      // e.g. chosen from an approval card, far down the list: show the row there too
      if (window.innerWidth <= 960 || b.classList.contains('ap-name')) { const m = $('#main'); if (m) m.scrollIntoView(); } else window.scrollTo(0, 0);
      return;
    }
    if (act === 'pf') { st.pf = b.getAttribute('data-v'); renderSide(); const el = $('[data-fk="pf-' + st.pf + '"]'); if (el) el.focus({ preventScroll: true }); return; }
    if (act === 'range') { st.range = b.getAttribute('data-v'); LS.set('hcny_dash_range', st.range); rerenderMain(); return; }
    if (act === 'units') { st.units = b.getAttribute('data-v'); LS.set('hcny_dash_units', st.units); rerenderMain(); return; }
    if (act === 'table') {
      const id = b.getAttribute('data-id'), open = !st.tables.has(id);
      if (open) st.tables.add(id); else st.tables.delete(id);
      $('#cv-' + id).hidden = open; $('#tb-' + id).hidden = !open;
      // a plain action button whose label names the view it switches to (no aria-pressed: the label changes)
      b.innerHTML =icon(open ? 'chart' : 'table') + '<span>' + (open ? 'Chart' : 'Table') + '</span>';
      if (!open && $('[data-pending]', $('#cv-' + id))) drawCharts();
      hideTip();
      return;
    }
    if (act === 'refresh') { if (st.local) openLocal(); else { b.disabled = true; b.classList.add('is-busy'); loadData(true); } return; }
    if (act === 'csv') { downloadCsv(); return; }
    if (act === 'xlsx') { downloadXlsx(); return; }
    if (act === 'approve') { approve(b.getAttribute('data-code'), b); return; }
    if (act === 'remove') { remove(b.getAttribute('data-code'), b); return; }
    if (act === 'signout') { signOut(); return; }
  });
  app.addEventListener('input', e => {
    if (e.target.id === 'psearch') {
      st.q = e.target.value; renderSide();
      if (!st.q.trim()) revealSel();     // search cleared after picking someone: bring their row back into view
    }
  });
  /* Scrolls the selected row into view inside its scroller only (the sidebar on wide screens, clear of the pinned
   * footer; the list's own box on a phone). The page itself is never scrolled from here. */
  function revealSel() {
    const cur = $('#plist [aria-current]'), wide = window.innerWidth > 960, box = wide ? $('.side') : $('#plist');
    if (!cur || !box || box.scrollHeight <= box.clientHeight) return;
    const foot = wide ? $('.side-foot') : null;
    const b = box.getBoundingClientRect(), r = cur.getBoundingClientRect();
    const top = b.top + 8, bottom = b.bottom - (foot ? foot.offsetHeight + 8 : 4);
    if (r.top < top) box.scrollTop -= top - r.top;
    else if (r.bottom > bottom) box.scrollTop += r.bottom - bottom;
  }

  /* ================================================================ start */
  if (HC.live && session.token) {
    if (session.expired()) { session.clear(); loginView(EXPIRED); }
    else loadData();
  } else loginView();
})();
