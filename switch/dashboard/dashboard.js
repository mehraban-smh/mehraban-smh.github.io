/* HomePulse (SWITCH home comfort study, Swansea) - research dashboard, /switch/dashboard/.
 *
 * Sign in with a research login, approve or remove participants, follow the study (tiles, charts, the Bay Race
 * points, home profiles) and download every stored column as CSV or Excel. Drawn in the Swansea dashboard style
 * (dashboard.css). Charts are plain HTML bars or inline SVG, each with a Table view of its numbers.
 *
 * Data comes only through window.SWITCH (../switch-api.js): login, logout, changePassword, fetchAll,
 * fetchParticipants, fetchPush, signInInfo, pointsTable, approve, remove, resetPin, signOutDevices, localRows.
 *
 * Days and hours are UK time (config.js timeZone, Europe/London) from the server-checked `ts`, the same rule
 * the points use, so a phone with a wrong clock or a crafted local_time cannot move a check-in to another day.
 *
 * Browser storage (keys start "switch_"): sessionStorage switch_token, switch_email, switch_token_exp (the
 * research login, this tab only); localStorage switch_dash_range, switch_dash_hm (display choices only).
 */
(function () {
  'use strict';

  const S = window.SWITCH;
  const app = document.getElementById('app');
  if (!S) { app.innerHTML = '<div class="empty">The dashboard could not load its files (config.js or switch-api.js). Check the connection and reload the page.</div>'; return; }
  const cfg = S.cfg || window.SWITCH_CONFIG || {};

  /* ---------------------------------------------------------------- study constants */
  const APP = cfg.appName || 'HomePulse';
  const TZ = cfg.timeZone || 'Europe/London';
  const GOAL = Number(cfg.dailyGoal) || 4;
  const PTS = Object.assign({ checkin: 10, goalDay: 20, fullWeek: 50, dailyCap: 15 }, cfg.points || {});
  const QUIET_DAYS = 2;          // "Quiet" once an approved participant has not checked in for this many days
  const TABLE_CAP = 400;         // rows in the on-screen table (the downloads have everything)
  const SANE_FROM = '2026-09-01';  // the first SWITCH release was 8 Sep 2026: anything earlier is a bad clock
  const EXPIRED = 'Your sign-in has expired. Please sign in again.';
  // the eight runner colours of the Bay Race (participants.alias_colour 0-7), the app's palette (dashboard.css --r0 ... --r7)
  const RUNNER = [0, 1, 2, 3, 4, 5, 6, 7].map(i => 'var(--r' + i + ')');

  /* Every stored check-in column, in download order. The 0.4 columns keep their old order (scripts that read
   * the old files by position still work), the 1.0 columns follow, then the legacy columns no version since 0.4
   * writes; any column the database adds later is appended automatically. */
  const COLS = ['participant', 'local_time', 'ts', 'prompt', 'at_home', 'tsv', 'preference', 'clo', 'garments', 'met', 'activity', 'room', 'acceptability', 'air', 'sun', 'actions', 'notes', 'same_as_last', 'seconds', 'app_version', 'client_id',
    'tz_offset_min', 'heating_on', 'heating_src', 'heating_for', 'stat_temp_c', 'wall', 'id', 'created_at'];
  const LEGACY_COLS = ['comfort', 'comfort_score', 'humidity', 'air_pref'];
  const NUM_COLS = new Set(['tsv', 'clo', 'met', 'seconds', 'tz_offset_min', 'stat_temp_c', 'comfort_score']);
  // the on-screen table: question order, legacy columns left out
  const TABLE_COLS = ['participant', 'local_time', 'prompt', 'at_home', 'tsv', 'preference', 'acceptability', 'clo', 'garments', 'met', 'activity', 'room', 'air', 'sun', 'heating_on', 'heating_src', 'heating_for', 'stat_temp_c', 'wall', 'actions', 'notes', 'same_as_last', 'seconds', 'app_version', 'ts', 'tz_offset_min', 'created_at', 'client_id', 'id'];
  const PCOLS = ['code', 'name', 'email', 'alias', 'alias_colour', 'race_hidden', 'approved', 'gender', 'birth_year', 'height_cm', 'weight_kg', 'sensitivity', 'created_at', 'updated_at', 'notified_at'];
  const PNUM = new Set(['birth_year', 'height_cm', 'weight_kg', 'alias_colour']);
  const HOME_KEYS = ['postcode_area', 'home_type', 'flat_position', 'tenure', 'year_built', 'floors', 'bedrooms', 'floor_area_m2', 'epc', 'adults', 'children', 'pets', 'bedroom_share',
    'main_heating', 'other_heaters', 'heating_pattern', 'payment', 'controls', 'stat_display', 'setpoint_c', 'bedroom_trv', 'wall_insulation', 'loft', 'glazing', 'windows_open', 'damp',
    'bedroom_facing', 'bedroom_facing_deg', 'bedroom_side', 'bedroom_side_deg'];
  const HOME_NUM = new Set(['floors', 'bedrooms', 'floor_area_m2', 'adults', 'children', 'pets', 'bedroom_share', 'setpoint_c', 'bedroom_facing_deg', 'bedroom_side_deg']);

  /* ---------------------------------------------------------------- words for stored values (spec 3 and 4) */
  const FACING = { N: 'North', NE: 'North-east', E: 'East', SE: 'South-east', S: 'South', SW: 'South-west', W: 'West', NW: 'North-west', unsure: 'Not sure' };
  const L = {
    tsv: { '-3': 'Cold', '-2': 'Cool', '-1': 'Slightly cool', 0: 'Neutral', 1: 'Slightly warm', 2: 'Warm', 3: 'Hot' },
    prompt: { scheduled: 'From a reminder', self: 'Self-started' },
    at_home: { long: 'Home for over an hour', recent: 'Just got in', out: 'Out' },
    preference: { cooler: 'Cooler', same: 'No change', warmer: 'Warmer' },
    acceptability: { acceptable: 'Acceptable', unacceptable: 'Not acceptable', clearly_acc: 'Clearly acceptable (older scale)', just_acc: 'Just acceptable (older scale)', just_unacc: 'Just unacceptable (older scale)', clearly_unacc: 'Clearly unacceptable (older scale)' },
    garments: { tshirt: 'T-shirt', long: 'Long sleeves', jumper: 'Thick jumper', hoodie: 'Hoodie or fleece', shorts: 'Shorts', trousers: 'Jeans or trousers', joggers: 'Joggers', skirt: 'Skirt or dress', pyjamas: 'Pyjamas', coat_light: 'Light jacket or summer coat', coat_winter: 'Winter coat', socks: 'Socks', slippers: 'Slippers', blanket: 'Blanket', duvet: 'Duvet' },
    activity: { sleep: 'Sleeping', lying: 'Lying down', sit: 'Sitting relaxed', desk: 'Desk work', stand: 'Standing', house: 'Cooking or housework', walk: 'Walking about', exercise: 'Exercising' },
    room: { living: 'Living room', bedroom: 'Bedroom', kitchen: 'Kitchen', office: 'Home office', bathroom: 'Bathroom', other: 'Elsewhere' },
    air: { still: 'Still', slight: 'A little air movement', draughty: 'Clearly draughty', drafty: 'Clearly draughty' },
    sun: { yes: 'Sun on me', no: 'No direct sun', dark: 'It’s dark' },
    heating_on: { on: 'On', off: 'Off', unsure: 'Not sure' },
    heating_for: { lt30: 'Less than 30 minutes', '30_60': '30 minutes to an hour', '1_2h': '1 to 2 hours', '2_4h': '2 to 4 hours', gt4h: 'More than 4 hours', unsure: 'Not sure' },
    wall: { cold: 'Cold', cool: 'Cool', neutral: 'Neither cold nor warm', warm: 'Warm', no_reach: 'Can’t reach one' },
    actions: { win_open: 'Opened a window', win_close: 'Closed a window', door_open: 'Opened a door', door_close: 'Closed a door', heat_up: 'Turned the heating up', heat_down: 'Turned the heating down or off', layer_on: 'Put on a layer', layer_off: 'Took off a layer', blanket: 'Got a blanket', fan: 'Turned a fan on', curtains: 'Drew the curtains or blinds', moved: 'Moved to another room', none: 'None of these' },
    notes: { hot_drink: 'Hot drink', cold_drink: 'Cold drink', ate: 'Ate something', hungry: 'Felt hungry', tired: 'Felt tired', unwell: 'Felt unwell', none: 'None of these' },
    gender: { woman: 'Woman', man: 'Man', non_binary: 'Non-binary', self_describe: 'Another identity', prefer_not: 'Prefer not to say' },
    sensitivity: { cold: 'Feels the cold easily', average: 'About average', warm: 'Feels the heat easily' },
    age: { a18: '18–24', a25: '25–34', a35: '35–44', a45: '45–54', a55: '55–64', a65: '65–74', a75: '75 or older' },
    home_type: { detached: 'Detached', semi: 'Semi-detached', end_terrace: 'End of terrace', mid_terrace: 'Terraced (mid-terrace)', bungalow: 'Bungalow', flat: 'Flat or maisonette' },
    flat_position: { basement: 'Basement', ground: 'Ground floor', middle: 'Middle floor', top: 'Top floor' },
    tenure: { own: 'Owns it (outright or mortgage)', housing_association: 'Rents from a housing association', council: 'Rents from the council', private_rent: 'Rents privately', shared_ownership: 'Shared ownership', other: 'Something else (e.g. with family)' },
    year_built: { pre1919: 'Before 1919', '1919_1944': '1919–1944', '1945_1964': '1945–1964', '1965_1982': '1965–1982', '1983_2002': '1983–2002', '2003_plus': '2003 or later', unsure: 'Not sure' },
    floors: { 1: '1 floor', 2: '2 floors', 3: '3 floors', 4: '4 or more floors' },
    bedrooms: { 0: 'No separate bedroom', 1: '1 bedroom', 2: '2 bedrooms', 3: '3 bedrooms', 4: '4 bedrooms', 5: '5 bedrooms', 6: '6 or more bedrooms' },
    floor_area: { lt50: 'Under 50 m²', a50: '50–79 m²', a80: '80–109 m²', a110: '110–149 m²', a150: '150 m² or more' },
    epc: { A: 'A', B: 'B', C: 'C', D: 'D', E: 'E', F: 'F', G: 'G', unsure: 'Doesn’t know' },
    adults: { 1: '1 adult', 2: '2 adults', 3: '3 adults', 4: '4 adults', 5: '5 adults', 6: '6 adults', 7: '7 adults', 8: '8 or more adults' },
    children: { 0: 'No children', 1: '1 child', 2: '2 children', 3: '3 children', 4: '4 children', 5: '5 children', 6: '6 children', 7: '7 children', 8: '8 or more children' },
    pets: { 0: 'No pets', 1: '1 pet', 2: '2 pets', 3: '3 pets', 4: '4 pets', 5: '5 pets', 6: '6 pets', 7: '7 pets', 8: '8 or more pets' },
    bedroom_share: { 0: 'Just me', 1: 'With 1 other person', 2: 'With 2 others', 3: 'With 3 or more others' },
    main_heating: { gas_combi: 'Gas combi boiler (no tank)', gas_tank: 'Gas boiler with a hot water tank', oil: 'Oil boiler', lpg: 'LPG boiler', ashp: 'Air source heat pump', gshp: 'Ground source heat pump', storage: 'Electric storage heaters', electric: 'Electric radiators or panel heaters', communal: 'Communal or district heating', solid: 'Solid fuel (coal or wood)', none: 'No central heating', unsure: 'Not sure' },
    other_heaters: { plugin: 'Plug-in electric heater', gas_fire: 'Gas fire', electric_fire: 'Electric fire', stove: 'Wood burner or multi-fuel stove', open_fire: 'Open fire', electric_blanket: 'Electric blanket', none: 'None of these' },
    heating_pattern: { timer: 'On a timer at set times', when_needed: 'Switched on when needed', most_day: 'On most of the day', rarely: 'Rarely used', not_me: 'Someone else controls it' },
    payment: { prepay: 'Prepayment meter', bill: 'Bill or Direct Debit', in_rent: 'Included in the rent', unsure: 'Not sure', prefer_not: 'Prefer not to say' },
    controls: { room_stat: 'Wall thermostat', smart: 'Smart thermostat', programmer: 'Timer or programmer', trvs: 'Radiator dials (TRVs)', none: 'None of these', unsure: 'Not sure' },
    stat_display: { yes: 'Shows the room temperature', no: 'No temperature on screen', no_stat: 'No thermostat' },
    setpoint: { le17: '17 °C or lower', 18: '18 °C', 19: '19 °C', 20: '20 °C', 21: '21 °C', 22: '22 °C', 23: '23 °C', ge24: '24 °C or higher' },
    bedroom_trv: { yes: 'Yes', no: 'No', no_radiator: 'No radiator in the bedroom', unsure: 'Not sure' },
    wall_insulation: { cavity: 'Filled cavity walls', external: 'External insulation (render or cladding)', internal: 'Internal insulation', none: 'No insulation', unsure: 'Not sure' },
    loft: { yes: 'Insulated loft', no: 'Loft not insulated', no_loft: 'No loft', unsure: 'Not sure' },
    glazing: { single: 'Single', double: 'Double', triple: 'Triple', mixed: 'A mix', unsure: 'Not sure' },
    windows_open: { yes: 'All can be opened', some: 'Some can be opened', no: 'None can be opened' },
    damp: { bedroom: 'Bedroom', living: 'Living room', kitchen: 'Kitchen', bathroom: 'Bathroom', elsewhere: 'Elsewhere', none: 'No damp or mould', unsure: 'Not sure' },
    bedroom_facing: FACING, bedroom_side: FACING
  };
  L.heating_src = Object.assign({}, L.main_heating, L.other_heaters, { other: 'Something else', main: 'The main heating (not named)', unsure: 'Not sure' });
  delete L.heating_src.none;
  const NOT_SURE = '__unsure', NOT_ANSWERED = '__na';
  const pretty = v => { const s = String(v == null ? '' : v).replace(/[_-]+/g, ' ').trim(); return s ? s[0].toUpperCase() + s.slice(1) : ''; };
  const lab = (group, v) => {
    if (v === null || v === undefined || v === '') return '';
    if (v === NOT_SURE) return 'Not sure';
    if (v === NOT_ANSWERED) return 'Not answered';
    const m = L[group];
    return (m && Object.prototype.hasOwnProperty.call(m, String(v))) ? m[String(v)] : pretty(v);
  };

  /* ---------------------------------------------------------------- small helpers */
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = v => { if (v === null || v === undefined || v === '' || typeof v === 'boolean') return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
  const fmtN = n => Number(n).toLocaleString('en-GB');
  const pct = (a, b) => b ? Math.round(100 * a / b) + '%' : '–';
  const plural = (n, one, many) => fmtN(n) + ' ' + (n === 1 ? one : (many || one + 's'));
  const median = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
  const round1 = x => Math.round(x * 10) / 10;
  const signed = v => { if (v === null || v === undefined || !isFinite(v)) return '–'; const r = Math.round(v * 10) / 10; return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r).toFixed(Number.isInteger(v) ? 0 : 1); };
  const listOf = v => Array.isArray(v) ? v.filter(x => x !== null && x !== undefined && x !== '') : (v === null || v === undefined || v === '' ? [] : [v]);
  const minDn = list => list.reduce((m, x) => x.dn !== null && x.sane && x.dn < m ? x.dn : m, Infinity);   // a loop: no spread over every row
  const tsvColour = v => 'var(--d' + v + ')';
  const tsvWord = v => L.tsv[String(v)] || '';
  const stepOf = m => Math.max(-3, Math.min(3, Math.sign(m) * Math.round(Math.abs(m))));   // halves away from neutral
  const cssId = s => (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/[^\w-]/g, '_');
  const initialsOf = s => String(s || '').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const ICONS = {
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',
    out: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
    down: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
    cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>'
  };
  const icon = n => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[n] || ''}</svg>`;

  /* ---------------------------------------------------------------- UK days (dn = days since 1970-01-01) */
  const MS_DAY = 864e5;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const WD_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const fmtOpts = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
  let tzFmt;
  try { tzFmt = new Intl.DateTimeFormat('en-GB', Object.assign({ timeZone: TZ }, fmtOpts)); }
  catch (e) { tzFmt = new Intl.DateTimeFormat('en-GB', Object.assign({ timeZone: 'Europe/London' }, fmtOpts)); }
  function ukParts(t) { const o = {}; tzFmt.formatToParts(new Date(t)).forEach(p => { o[p.type] = p.value; }); return { key: o.year + '-' + o.month + '-' + o.day, hour: Number(o.hour) % 24, min: Number(o.minute) }; }
  const keyToDn = k => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(k || '')); return m ? Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / MS_DAY) : null; };
  const dnDate = dn => new Date(dn * MS_DAY);
  const dnDow = dn => (dnDate(dn).getUTCDay() + 6) % 7;     // Monday = 0
  const dnKey = dn => dnDate(dn).toISOString().slice(0, 10);
  const dnShort = dn => { const d = dnDate(dn); return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()]; };
  const dnLong = dn => WD[dnDow(dn)] + ' ' + dnShort(dn);
  const dnYear = dn => dnDate(dn).getUTCFullYear();
  const dnFull = dn => dnShort(dn) + ' ' + dnYear(dn);
  const hhmm = (h, m) => String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  let todayCache = { at: 0, dn: 0 };
  const todayDn = () => { const n = Date.now(); if (n - todayCache.at > 30000) todayCache = { at: n, dn: keyToDn(ukParts(n).key) }; return todayCache.dn; };
  const dayOfIso = s => { const t = Date.parse(s); return isFinite(t) ? keyToDn(ukParts(t).key) : null; };
  const fmtStamp = s => { const t = Date.parse(s); if (!isFinite(t)) return ''; const p = ukParts(t); return dnFull(keyToDn(p.key)) + ', ' + hhmm(p.hour, p.min); };
  const fmtDate = s => { const dn = dayOfIso(s); return dn === null ? '' : dnFull(dn); };
  const clockOf = t => { const p = ukParts(t); return hhmm(p.hour, p.min); };
  function ago(t) {
    if (t == null || !isFinite(t)) return '';
    const m = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + ' h ago';
    const d = Math.floor(m / 1440);
    return d === 1 ? 'yesterday' : d + ' days ago';
  }
  const SANE_DN = keyToDn(SANE_FROM);
  const START_DN = keyToDn(cfg.studyStart), END_DN = keyToDn(cfg.studyEnd);
  /* The last day the figures run to: today, or the last day of the study once it is over (so rates, "quiet"
   * flags and the 7 and 30 day windows stop moving after the study ends). */
  const refDn = () => END_DN !== null ? Math.min(todayDn(), END_DN) : todayDn();
  const studyOver = () => END_DN !== null && todayDn() > END_DN;
  const refTime = () => studyOver() ? (END_DN + 1) * MS_DAY + 3 * 3600e3 : Date.now();   // just after midnight UK time on the day after the end
  function studyPeriod() {
    if (START_DN === null && END_DN === null) return '';
    if (START_DN !== null && END_DN !== null) return 'Study period: ' + dnShort(START_DN) + (dnYear(START_DN) !== dnYear(END_DN) ? ' ' + dnYear(START_DN) : '') + ' – ' + dnFull(END_DN) + (studyOver() ? ' (ended)' : todayDn() < START_DN ? ' (not started yet)' : ' · day ' + (todayDn() - START_DN + 1) + ' of ' + (END_DN - START_DN + 1));
    if (START_DN !== null) return 'Study started ' + dnFull(START_DN) + (todayDn() < START_DN ? ' (not started yet)' : '');
    return 'Study ends ' + dnFull(END_DN) + (studyOver() ? ' (ended)' : '');
  }

  /* ---------------------------------------------------------------- storage and the login */
  const box = area => ({
    get(k) { try { return window[area].getItem(k); } catch (e) { return null; } },
    set(k, v) { try { window[area].setItem(k, v); return true; } catch (e) { return false; } },
    del(k) { try { window[area].removeItem(k); } catch (e) {} }
  });
  const SS = box('sessionStorage'), LS = box('localStorage');
  /* The login lives in this page's memory once set or cleared; sessionStorage only carries it across a reload,
   * so a browser that blocks storage can still sign in, and a stale stored value never revives a login. */
  let mem = null;
  const session = {
    get token() { return mem ? mem.token : SS.get('switch_token'); },
    get email() { return mem ? mem.email : SS.get('switch_email'); },
    get exp() { return Number(mem ? mem.exp : SS.get('switch_token_exp')) || 0; },
    get refresh() { return mem ? mem.refresh : SS.get('switch_refresh'); },
    expired() { const x = this.exp; return !!x && Date.now() > x - 20000; },
    set(t, e, expiresIn, refresh) {
      mem = { token: t, email: e || '', exp: expiresIn ? Date.now() + expiresIn * 1000 : 0, refresh: refresh || null };
      const kept = SS.set('switch_token', t);
      SS.set('switch_email', mem.email);
      if (mem.exp) SS.set('switch_token_exp', String(mem.exp)); else SS.del('switch_token_exp');
      if (mem.refresh) SS.set('switch_refresh', mem.refresh); else SS.del('switch_refresh');
      return kept;
    },
    clear() { mem = { token: null, email: null, exp: 0, refresh: null }; ['switch_token', 'switch_email', 'switch_token_exp', 'switch_refresh'].forEach(k => SS.del(k)); }
  };
  /* A sign-in lasts an hour (Supabase's access token). While the page is open it is renewed with the refresh
   * token a few minutes before it runs out; one renewal at a time, because Supabase refresh tokens are single
   * use. When renewal is not possible the page says the sign-in has expired (see the timer below). */
  let renewing = null;
  async function ensureFresh(force) {
    if (st.local || !session.token) return false;
    if (!force && session.exp && session.exp - Date.now() > 5 * 60000) return true;
    const rt = session.refresh;
    if (!rt || typeof S.refresh !== 'function') return !session.expired();
    if (!renewing) renewing = (async () => {
      try {
        const j = await S.refresh(rt);
        if (!j || !j.access_token) return false;
        session.set(j.access_token, (j.user && j.user.email) || session.email, Number(j.expires_in) || 3600, j.refresh_token || rt);
        st.expiredShown = false; const n = $('#expNote'); if (n) n.remove();
        whoBar();
        return true;
      } catch (e) { return false; }
    })();
    const ok = await renewing; renewing = null;
    return ok;
  }
  const isExpiredError = e => { const m = (e && e.message) || String(e || ''); return m === EXPIRED || /expired|\b401\b|JWT/i.test(m); };

  /* ---------------------------------------------------------------- state */
  const RANGES = ['7', '30', 'study', 'all'];
  const st = {
    local: false, rows: [], R: [], people: [], push: null, pins: null,
    points: { week: null, month: null, all: null }, pointsErr: '', warn: [],
    sel: 'ALL', pf: 'all', q: '', pp: 'week', tables: new Set(),
    range: (() => { const r = LS.get('switch_dash_range'); return RANGES.includes(r) && (r !== 'study' || START_DN !== null) ? r : '30'; })(),
    hm: LS.get('switch_dash_hm') === 'tsv' ? 'tsv' : 'n',
    byCode: new Map(), rowsBy: new Map(), pushBy: new Map(), pinsBy: new Map(), entries: [], loadedAt: 0, expiredShown: false
  };
  const person = code => st.byCode.get(code) || null;
  /* No "approved" column: supabase-setup.sql has not been run since the approval step. */
  const dbStale = () => !st.local && st.people.length > 0 && !Object.prototype.hasOwnProperty.call(st.people[0], 'approved');
  const homeMissing = () => !st.local && st.people.length > 0 && !Object.prototype.hasOwnProperty.call(st.people[0], 'home');
  const waiting = p => !!p && !st.local && !dbStale() && !p.approved;
  const enrolled = e => st.local ? true : !!e.p && (dbStale() || !!e.p.approved);
  const homeOf = p => (p && p.home && typeof p.home === 'object' && !Array.isArray(p.home)) ? p.home : null;

  /* One prepared row per check-in: the record and when it happened in UK time. `sane` is false for a date before
   * the first release or after tomorrow (a phone clock far off): such rows stay in the downloads and the table
   * but are left out of the day charts, so one bad clock can never stretch "All time" over decades. */
  function prep(r) {
    const t = Date.parse(r.ts);
    let dn = null, hour = null, min = null;
    if (isFinite(t)) { const p = ukParts(t); dn = keyToDn(p.key); hour = p.hour; min = p.min; }
    const v = num(r.tsv);
    return { r, code: String(r.participant || '').trim().toUpperCase() || '(none)', t: isFinite(t) ? t : null, dn, hour, min,
      dow: dn === null ? null : dnDow(dn), tsv: v !== null && v >= -3 && v <= 3 ? Math.round(v) : null,
      sane: dn !== null && dn >= SANE_DN && dn <= todayDn() + 1 };
  }
  function index() {
    const seen = new Set();
    st.R = st.rows.map(prep).sort((a, b) => (b.t || 0) - (a.t || 0) || String(b.r.id || b.r.client_id || '').localeCompare(String(a.r.id || a.r.client_id || '')))
      .filter(x => { const k = x.r.client_id; if (!k) return true; if (seen.has(k)) return false; seen.add(k); return true; });
    st.byCode = new Map(st.people.map(p => [String(p.code).toUpperCase(), p]));
    st.rowsBy = new Map();
    st.R.forEach(x => { if (!st.rowsBy.has(x.code)) st.rowsBy.set(x.code, []); st.rowsBy.get(x.code).push(x); });
    st.pushBy = new Map();
    (st.push || []).forEach(ph => { const c = String(ph.participant || '').toUpperCase(); if (!st.pushBy.has(c)) st.pushBy.set(c, []); st.pushBy.get(c).push(ph); });
    st.pinsBy = new Map();
    if (st.pins instanceof Map) st.pins.forEach((v, k) => st.pinsBy.set(String(k).toUpperCase(), v));
    else if (Array.isArray(st.pins)) st.pins.forEach(x => { if (x && x.code) st.pinsBy.set(String(x.code).toUpperCase(), x); });
    const codes = new Set([...st.byCode.keys(), ...st.rowsBy.keys()]);
    st.entries = [...codes].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(code => {
      const rows = st.rowsBy.get(code) || [];
      return { code, p: person(code), rows, last: rows[0] || null };
    });
    if (st.sel !== 'ALL' && !codes.has(st.sel)) st.sel = 'ALL';
  }
  /* The window every tile and chart uses: {start, end} in day numbers (start null = from the first real
   * check-in of the selection). */
  function span(all) {
    const ref = refDn();
    if (st.range === '7' || st.range === '30') { const N = +st.range; return { start: ref - N + 1, end: ref, N }; }
    if (st.range === 'study' && START_DN !== null) return { start: START_DN, end: ref };
    const first = minDn(all);
    const end = todayDn();
    return { start: first === Infinity ? end : Math.min(first, end), end, all: true };
  }
  const rangeWords = () => st.range === 'all' ? 'all dates' : st.range === 'study' ? 'the study period' : 'the last ' + st.range + ' days' + (studyOver() ? ' of the study' : '');
  const inSpan = (x, sp) => x.sane && x.dn >= sp.start && x.dn <= sp.end;
  function pausedOf(code) {
    const list = st.pushBy.get(code) || [], now = Date.now();
    let until = null;
    list.forEach(ph => { const t = Date.parse(ph.paused_until); if (isFinite(t) && t > now && (!until || t > until)) until = t; });
    // paused only when every phone that is on is paused
    const on = list.filter(ph => ph.enabled !== false);
    if (!until || !on.length) return null;
    return on.every(ph => { const t = Date.parse(ph.paused_until); return isFinite(t) && t > now; }) ? until : null;
  }
  /* Whole days without a check-in, counted to now (or to the end of the study once it is over). For an approved
   * participant with none at all, days since signing up. Nothing for people waiting, or in local mode. */
  function quietDays(e) {
    if (st.local || !e.p || !enrolled(e) || waiting(e.p)) return null;
    const ref = refTime();
    if (e.last && e.last.t) return Math.max(0, Math.floor((ref - e.last.t) / MS_DAY));
    const t = Date.parse(e.p.created_at);
    return isFinite(t) ? Math.max(0, Math.floor((ref - t) / MS_DAY)) : null;
  }

  /* ================================================================ tooltip (one, shared; plain text only) */
  const tip = $('#tip');
  let tipFor = null;
  function showTip(el, x, y) {
    const text = el.getAttribute('data-tip');
    if (!text) return;
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
  function hideTip() { tip.hidden = true; tipFor = null; }
  document.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (el) showTip(el, e.pageX, e.pageY); else if (!tip.hidden) hideTip();
  });
  document.addEventListener('focusin', e => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) { const r = el.getBoundingClientRect(); showTip(el, r.left + r.width / 2 + window.scrollX, r.top + window.scrollY); } });
  document.addEventListener('focusout', () => hideTip());
  window.addEventListener('scroll', () => { if (!tip.hidden) hideTip(); }, { passive: true });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hideTip(); });
  const tipA = (...lines) => ' data-tip="' + esc(lines.filter(Boolean).join('\n')) + '"';

  /* ================================================================ toast */
  let toastTimer;
  function toast(title, sub, bad) {
    const t = $('#toast');
    $('#toastTitle').textContent = title; $('#toastSub').textContent = sub || '';
    t.classList.toggle('bad', !!bad); t.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 4600);
  }

  /* ================================================================ top bar */
  function whoBar() {
    const who = $('#who');
    if (!who) return;
    if (st.local) { who.innerHTML = `<span>Local mode</span><button class="lnk" type="button" data-act="signout">${icon('out')}Back to sign-in</button>`; return; }
    if (!session.token) { who.innerHTML = ''; return; }
    const exp = session.exp;
    who.innerHTML = `<span>${esc(session.email || '')}</span>${exp ? `<span class="until">${session.expired() ? 'sign-in expired' : 'signed in until ' + esc(clockOf(exp))}</span>` : ''}
      <button class="lnk" type="button" data-act="pw" title="Change your password">${icon('key')}<span>Password</span></button>
      <button class="lnk" type="button" data-act="signout">${icon('out')}Sign out</button>`;
  }
  const nameEl = $('#appName'); if (nameEl) nameEl.textContent = APP;
  document.title = APP + ' · research dashboard';

  /* ================================================================ sign in */
  function loginView(msg) {
    hideTip(); st.local = false; whoBar();
    const live = S.live;
    app.innerHTML = `<main class="login" id="main" tabindex="-1"><div class="card">
      <div><div class="eyebrow">${esc(APP)} · research team</div><h1>Sign in</h1></div>
      ${live ? '' : `<div class="notice warn"><div>No database is configured yet, so this page can only show check-ins stored in <b>this browser</b>. Fill in <code>switch/config.js</code> following the README to connect the study database.</div></div>`}
      <div class="err" id="loginErr" role="alert">${esc(msg || '')}</div>
      <form id="loginForm"${live ? '' : ' hidden'} novalidate>
        <div style="display:flex;flex-direction:column;gap:12px">
        <label>Email<input type="email" name="email" autocomplete="username" required value="${esc(SS.get('switch_email') || (mem && mem.lastEmail) || '')}"></label>
        <label>Password<input type="password" name="password" autocomplete="current-password" required></label>
        <button class="btn" type="submit">Sign in</button>
        </div>
      </form>
      <button class="btn ghost" type="button" id="localBtn">View check-ins stored in this browser</button>
      <p class="fine">Participants never need this page. A sign-in stays open while this tab is open, and ends when the tab is closed.</p>
    </div></main>`;
    const f = $('#loginForm');
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const b = f.querySelector('button[type="submit"]'), err = $('#loginErr');
      const email = f.email.value.trim();
      if (!email || !f.password.value) { err.textContent = 'Enter the email and password of your research login.'; return; }
      b.disabled = true; err.textContent = '';
      try {
        const j = await S.login(email, f.password.value);
        const kept = session.set(j.access_token, (j.user && j.user.email) || email, Number(j.expires_in) || 3600, j.refresh_token);
        st.local = false; st.expiredShown = false;
        await loadData();
        if (!kept && session.token) toast('Signed in for this page only', 'This browser blocks site storage, so a reload asks you to sign in again.');
      } catch (ex) {
        const m = (ex && ex.message) || 'Sign-in failed';
        err.textContent = /invalid login|invalid_grant|credentials/i.test(m) ? 'That email and password do not match a research login.' : m;
        b.disabled = false;
      }
    });
    $('#localBtn').addEventListener('click', openLocal);
    const first = live ? (f.email.value ? f.password : f.email) : $('#localBtn');
    if (first) first.focus({ preventScroll: true });
  }
  function openLocal() {
    st.local = true; st.people = []; st.push = []; st.pins = null; st.points = { week: null, month: null, all: null }; st.warn = [];
    try { st.rows = typeof S.localRows === 'function' ? (S.localRows() || []) : []; } catch (e) { st.rows = []; }
    st.sel = 'ALL'; st.pf = 'all'; st.q = '';
    index(); dataView({ focusMain: true });
  }
  async function signOut() {
    const token = session.token, wasLocal = st.local;
    if (mem) mem.lastEmail = session.email;
    session.clear();
    st.local = false; st.rows = []; st.people = []; st.push = null; st.pins = null; st.points = { week: null, month: null, all: null };
    st.sel = 'ALL'; st.pf = 'all'; st.q = '';
    index(); loginView();
    if (token && !wasLocal && typeof S.logout === 'function') { try { await S.logout(token); } catch (e) {} }   // best effort: the token ends anyway
  }

  /* ================================================================ loading */
  function pointsPeriods() {
    const t = todayDn(), dow = dnDow(t);
    const d = dnDate(t), m0 = keyToDn(d.toISOString().slice(0, 8) + '01');
    const m1 = keyToDn(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString().slice(0, 10)) - 1;
    return {
      week: { from: t - dow, to: t - dow + 6 },
      month: { from: m0, to: m1 },
      all: { from: Math.min(SANE_DN, START_DN === null ? SANE_DN : START_DN), to: t }
    };
  }
  async function loadData(keepView) {
    await ensureFresh();
    if (session.expired()) { expiredLogin(); return; }
    if (!keepView) app.innerHTML = '<div class="empty" role="status">Loading check-ins&hellip;</div>';
    const token = session.token;
    const soft = async (what, call) => { try { return { v: await call() }; } catch (e) { return { e: (e && e.message) || 'failed', what }; } };
    let rows, people;
    const per = pointsPeriods();
    const pt = k => typeof S.pointsTable === 'function' ? soft('points', () => S.pointsTable(token, dnKey(per[k].from), dnKey(per[k].to))) : Promise.resolve({ e: 'not available', what: 'points' });
    try {
      const [r, p, push, pins, pw, pm, pa] = await Promise.all([
        S.fetchAll(token), S.fetchParticipants(token),
        typeof S.fetchPush === 'function' ? soft('reminder phones', () => S.fetchPush(token)) : Promise.resolve({ e: 'not available', what: 'reminder phones' }),
        typeof S.signInInfo === 'function' ? soft('PINs and devices', () => S.signInInfo(token)) : Promise.resolve({ e: 'not available', what: 'PINs and devices' }),
        pt('week'), pt('month'), pt('all')]);
      rows = r; people = p;
      st.warn = [];
      st.push = push.e ? null : (Array.isArray(push.v) ? push.v : null);
      if (push.e) st.warn.push('reminder phones (' + push.e + ')');
      st.pins = pins.e ? null : pins.v;
      if (pins.e) st.warn.push('PINs and devices (' + pins.e + ')');
      st.points = { week: pw.e ? null : pw.v, month: pm.e ? null : pm.v, all: pa.e ? null : pa.v };
      st.pointsErr = [pw, pm, pa].find(x => x.e) ? [pw, pm, pa].find(x => x.e).e : '';
      if ([push, pins, pw].some(x => x.e && isExpiredError({ message: x.e }))) throw new Error(EXPIRED);
    } catch (err) {
      if (isExpiredError(err)) { expiredLogin(); return; }
      const msg = (err && err.message) || 'Could not load the study data';
      whoBar();
      app.innerHTML = `<main class="main" id="main" tabindex="-1"><div class="notice bad" role="alert"><div><b>The study data could not be loaded.</b><br>${esc(msg)}. Check the connection and try again.</div>
        <div class="pbtns"><button class="btn sm" type="button" data-act="retry">${icon('refresh')}Try again</button><button class="btn ghost sm" type="button" data-act="signout">Sign out</button></div></div></main>`;
      return;
    }
    st.rows = Array.isArray(rows) ? rows : []; st.people = Array.isArray(people) ? people : [];
    st.local = false; st.loadedAt = Date.now();
    index();
    dataView({ focusMain: !keepView });
  }
  function expiredLogin() { if (mem) mem.lastEmail = session.email; const e = session.email; session.clear(); if (e) { mem.lastEmail = e; SS.set('switch_email', e); } loginView(EXPIRED); }
  /* An hour after signing in the token stops working. The page says so (what is on screen stays, the downloads
   * still work from it) instead of failing on the next click. */
  setInterval(async () => {
    if (st.local || !session.token || !$('#main') || $('#loginForm')) return;
    if (session.exp && session.exp - Date.now() < 5 * 60000) await ensureFresh();
    whoBar();
    if (session.expired() && !st.expiredShown) {
      st.expiredShown = true;
      const m = $('#main');
      if (m) m.insertAdjacentHTML('afterbegin', `<div class="notice bad" role="alert" id="expNote"><div><b>Your sign-in has expired.</b> Sign-ins last an hour. What is on screen stays (and the downloads still work), but refreshing or changing anything needs a new sign-in.</div><button class="btn sm" type="button" data-act="relogin">Sign in again</button></div>`);
    }
  }, 20000);

  /* ================================================================ approve, remove, PIN, devices */
  async function writeAction(btn, code, verb, call) {
    await ensureFresh();
    if (session.expired()) { expiredLogin(); return false; }
    const host = btn.closest('[data-errhost]') || btn.parentElement;
    const group = $$('[data-act="approve"],[data-act="remove"],[data-act="pinreset"],[data-act="devout"]', host);
    if (!group.includes(btn)) group.push(btn);
    group.forEach(b => { b.disabled = true; });
    btn.setAttribute('aria-busy', 'true');
    let ok, why = '';
    try { ok = await call(); } catch (e) { ok = null; why = (e && e.message) || ''; }
    btn.removeAttribute('aria-busy');
    if (ok !== null && ok !== false) return ok === undefined ? true : ok;   // the reload that follows draws fresh buttons
    group.forEach(b => { b.disabled = false; });
    if (isExpiredError({ message: why })) { expiredLogin(); return false; }
    if (ok === false) { rowError(btn, 'Nothing changed. Refresh and try again.'); return false; }
    const tail = /supabase-setup\.sql/.test(why) ? 'Then try again.' : 'Check the connection, and that supabase-setup.sql has been run again in Supabase, then try again.';
    alert('Could not ' + verb + ' ' + code + '. ' + (why ? why.replace(/\.$/, '') + '. ' : '') + tail);
    return false;
  }
  function rowError(btn, msg) {
    const host = btn.closest('[data-errhost]') || btn.parentElement;
    let el = $('.err', host);
    if (!el) { el = document.createElement('span'); el.className = 'err'; el.setAttribute('role', 'alert'); host.appendChild(el); }
    el.textContent = msg;
  }
  const who = code => { const p = person(code); return p && p.name ? p.name + ' (' + code + ')' : code; };
  async function approve(code, btn) {
    if (st.local) return;
    if (!(await writeAction(btn, code, 'approve', () => S.approve(session.token, code)))) return;
    toast(code + ' approved', 'They can check in and turn on reminders now.');
    await loadData(true); focusTitle();
  }
  async function remove(code, btn) {
    if (st.local) return;
    const n = (st.rowsBy.get(code) || []).length;
    if (!confirm(`Remove ${who(code)} from the study?\n\nTheir profile, home profile, PIN, signed-in devices and the phones registered for reminders are deleted. They can no longer check in and leave the Bay Race.${n ? `\n\nThe ${plural(n, 'check-in')} already submitted stay in the database under ${code} (and in the downloads).` : ''}`)) return;
    if (!(await writeAction(btn, code, 'remove', () => S.remove(session.token, code)))) return;
    if (st.sel === code) st.sel = 'ALL';
    toast(code + ' removed', n ? 'Their check-ins stay in the database under the code.' : 'Their profile has been deleted.');
    await loadData(true); focusTitle();
  }
  async function resetPin(code, btn) {
    if (st.local) return;
    if (!confirm(`Reset the PIN of ${who(code)}?\n\nOnly do this when they have asked for it. The next time they sign in with their email, the PIN they type becomes their new PIN. The devices they already use keep working.`)) return;
    let had = true;
    if (!(await writeAction(btn, code, 'reset the PIN of', async () => { had = await S.resetPin(session.token, code); return true; }))) return;
    if (had === false) toast('No PIN to reset for ' + code, 'They have not set a PIN yet; they choose one at their next sign-in.');
    else toast('PIN reset for ' + code, 'Ask them to sign in with their email and choose a new PIN.');
    await loadData(true); focusTitle();
  }
  async function signOutDevices(code, btn) {
    if (st.local) return;
    if (!confirm(`Sign ${who(code)} out on all their devices?\n\nEach phone or tablet then asks for their email and PIN before it shows anything. Check-ins already sent are kept.`)) return;
    let n = 0;
    if (!(await writeAction(btn, code, 'sign out', async () => { n = await S.signOutDevices(session.token, code); return true; }))) return;
    toast(code + ' signed out', (Number(n) ? plural(Number(n), 'device') + ' will ask' : 'No device was signed in. Any new device asks') + ' for the email and PIN.');
    await loadData(true); focusTitle();
  }
  function focusTitle() { const t = $('#mainTitle'); if (t) t.focus({ preventScroll: true }); }

  /* ================================================================ change password */
  async function changePassword(opener) {
    await ensureFresh();
    if (session.expired()) { expiredLogin(); return; }
    const dlg = document.createElement('dialog');
    dlg.className = 'pw';
    dlg.setAttribute('aria-labelledby', 'pwH');
    dlg.innerHTML = `<form id="pwForm" novalidate>
        <div><h2 id="pwH" style="font-family:var(--serif);font-size:1.25rem;text-transform:none;letter-spacing:0;color:var(--ink)">Change your password</h2><p class="tnote">For ${esc(session.email || 'this login')}. At least 10 characters; a long phrase is best.</p></div>
        <label>New password<input id="pw1" type="password" autocomplete="new-password" minlength="10" required></label>
        <label>Type it again<input id="pw2" type="password" autocomplete="new-password" minlength="10" required></label>
        <p class="err" id="pwErr" role="alert"></p>
        <div class="row"><button class="btn ghost" type="button" id="pwCancel">Cancel</button><button class="btn" type="submit" id="pwSave">Save password</button></div>
      </form>`;
    document.body.appendChild(dlg);
    const err = t => { $('#pwErr', dlg).textContent = t || ''; };
    dlg.addEventListener('close', () => { dlg.remove(); if (opener && document.contains(opener)) opener.focus(); });
    $('#pwCancel', dlg).addEventListener('click', () => dlg.close());
    $('#pwForm', dlg).addEventListener('submit', async ev => {
      ev.preventDefault();
      const a = $('#pw1', dlg).value, b = $('#pw2', dlg).value;
      if (a.length < 10) return err('Please use at least 10 characters.');
      if (a !== b) return err('The two passwords are not the same.');
      const save = $('#pwSave', dlg); save.disabled = true; err('');
      try {
        if (typeof S.changePassword !== 'function') throw new Error('This version of switch-api.js cannot change passwords');
        await S.changePassword(session.token, a);
        dlg.close(); toast('Password changed', 'Use the new one next time you sign in.');
      } catch (e) {
        save.disabled = false;
        err(isExpiredError(e) ? 'Your sign-in has expired. Sign out, sign in again and try once more.' : ((e && e.message) || 'The password could not be changed.'));
      }
    });
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    $('#pw1', dlg).focus();
  }

  /* ================================================================ the data view */
  let charts = [];            // [{id, draw(width) -> svg}] drawn after each render and again on resize
  const addChart = (id, draw) => { charts.push({ id, draw }); return id; };
  function dataView(opt) {
    opt = opt || {};
    hideTip(); whoBar();
    const active = document.activeElement, fk = active && active.getAttribute && active.getAttribute('data-fk');
    const side = $('aside'), keep = side ? side.scrollTop : 0;
    charts = [];
    try {
      app.innerHTML = `<div class="layout"><aside aria-label="Participants">${sideHtml()}</aside><main class="main" id="main" tabindex="-1">${mainHtml()}</main></div>`;
      renderList();
      if (side) $('aside').scrollTop = keep;
      drawCharts();
    } catch (e) {
      console.error(e);
      app.innerHTML = `<main class="main" id="main"><div class="notice bad" role="alert"><div><b>Something went wrong drawing this page.</b><br>${esc(e && e.message)}. The data loaded; try another range or participant, or reload the page.</div><button class="btn sm" type="button" data-act="home">Back to the overview</button></div></main>`;
      return;
    }
    if (fk) { const el = $('[data-fk="' + cssId(fk) + '"]'); if (el) { el.focus({ preventScroll: true }); return; } }
    if (opt.focusMain) focusTitle();
  }
  function rerenderMain(focus) {
    hideTip();
    const active = document.activeElement, fk = active && active.getAttribute && active.getAttribute('data-fk');
    charts = [];
    try { $('#main').innerHTML = mainHtml(); renderList(); $('#sideCards').innerHTML = sideCards(); drawCharts(); }
    catch (e) { console.error(e); $('#main').innerHTML = `<div class="notice bad" role="alert"><div><b>Something went wrong drawing this view.</b><br>${esc(e && e.message)}.</div><button class="btn sm" type="button" data-act="home">Back to the overview</button></div>`; return; }
    if (focus) focusTitle();
    else if (fk) { const el = $('[data-fk="' + cssId(fk) + '"]'); if (el) el.focus({ preventScroll: true }); }
  }

  /* ---------------------------------------------------------------- sidebar */
  function sideHtml() {
    return `<div id="sideCards">${sideCards()}</div>
      <div class="search">${icon('search')}<label class="sr" for="psearch">Search by code, name, alias or email</label><input id="psearch" type="search" placeholder="Search code, name, alias" autocomplete="off" value="${esc(st.q)}" data-fk="search"></div>
      <div id="pfilter"></div>
      <h2>Participants</h2>
      <ul class="plist" id="plist"></ul>`;
  }
  function sideCards() {
    if (st.local) return `<div class="enrol"><b style="color:var(--ink)">Local mode</b><span>Only the check-ins kept in this browser are shown. Nothing is read from the study database.</span></div>`;
    const stale = dbStale();
    const approved = stale ? st.people.length : st.people.filter(p => p.approved).length;
    const wait = stale ? 0 : st.people.length - approved;
    const homes = st.people.filter(p => (stale || p.approved) && homeOf(p) && Object.keys(homeOf(p)).length).length;
    const tot = Math.max(1, approved + wait);
    const week = st.people.filter(p => { const t = Date.parse(p.created_at); return isFinite(t) && Date.now() - t < 7 * MS_DAY; }).length;
    const per = studyPeriod();
    return `<div class="enrol" role="group" aria-label="Enrolment">
      <div class="big"><b>${fmtN(approved)}</b><span>approved${wait ? ` · <span class="status-wait">${fmtN(wait)} waiting</span>` : ''}</span></div>
      <div class="ebar" aria-hidden="true"><i class="on" style="width:${(100 * approved / tot).toFixed(1)}%"></i>${wait ? `<i class="wt" style="width:${(100 * wait / tot).toFixed(1)}%"></i>` : ''}</div>
      <span>${plural(week, 'sign-up')} in the last 7 days · home profiles ${fmtN(homes)} of ${fmtN(approved)}</span>
      ${per ? `<span>${icon('cal')} ${esc(per)}</span>` : ''}
    </div>`;
  }
  function filterCounts(sp) {
    const act = new Set(); st.R.forEach(x => { if (inSpan(x, sp)) act.add(x.code); });
    const isAct = e => act.has(e.code) && enrolled(e);
    const isQuiet = e => { const q = quietDays(e); return q !== null && q >= QUIET_DAYS; };
    return { isAct, isQuiet };
  }
  function renderList() {
    const sp = span(st.R);
    const { isAct, isQuiet } = filterCounts(sp);
    const n = { all: st.entries.length, active: st.entries.filter(isAct).length, waiting: st.entries.filter(e => waiting(e.p)).length, quiet: st.entries.filter(isQuiet).length };
    const fb = (k, label, hint) => `<button type="button" data-act="pf" data-v="${k}" data-fk="pf-${k}" aria-pressed="${st.pf === k}" title="${esc(hint)}">${label}<span class="n">${n[k]}</span></button>`;
    $('#pfilter').innerHTML = `<div class="seg" role="group" aria-label="Show participants">${fb('all', 'All', 'Everyone')}${fb('active', 'Active', 'Approved and checked in during ' + rangeWords())}${dbStale() || st.local ? '' : fb('waiting', 'Waiting', 'Waiting for approval')}${st.local ? '' : fb('quiet', 'Quiet&nbsp;' + QUIET_DAYS + '+', 'Approved, and no check-in for ' + QUIET_DAYS + ' days or more')}</div>`;
    const q = st.q.trim().toLowerCase();
    const list = st.entries.filter(e => {
      if (st.pf === 'active' && !isAct(e)) return false;
      if (st.pf === 'waiting' && !waiting(e.p)) return false;
      if (st.pf === 'quiet' && !isQuiet(e)) return false;
      if (!q) return true;
      const p = e.p || {};
      return [e.code, p.name, p.email, p.alias].some(v => String(v || '').toLowerCase().includes(q));
    });
    const all = `<li><button class="p" type="button" data-act="sel" data-code="ALL" data-fk="p-ALL"${st.sel === 'ALL' ? ' aria-current="true"' : ''}><b>All participants</b><span class="cnt">${fmtN(st.R.length)}</span><small>${plural(st.entries.length, 'code')} · every check-in</small></button></li>`;
    $('#plist').innerHTML = all + (list.length ? list.map(rowHtml).join('') : `<li class="none">${q ? 'Nobody matches “' + esc(st.q) + '”.' : st.pf === 'waiting' ? 'Nobody is waiting for approval.' : st.pf === 'quiet' ? 'Nobody has gone quiet.' : 'Nobody here yet.'}</li>`);
  }
  function rowHtml(e) {
    const p = e.p, flags = [];
    if (waiting(p)) flags.push('<i class="flag wait">Waiting</i>');
    if (!p && !st.local) flags.push('<i class="flag hid">No profile</i>');
    const pu = pausedOf(e.code);
    if (pu) flags.push(`<i class="flag pause" title="Reminders paused until ${esc(fmtStamp(new Date(pu).toISOString()))}">Paused</i>`);
    const qd = quietDays(e);
    if (qd !== null && qd >= QUIET_DAYS) flags.push(e.last ? `<i class="flag quiet">Quiet ${qd} days</i>` : `<i class="flag quiet" title="Approved, no check-in in the ${qd} days since signing up">No check-ins · ${qd} days</i>`);
    if (p && p.race_hidden) flags.push('<i class="flag hid" title="Hidden from others in the Bay Race">Race hidden</i>');
    const sub = [p && p.alias ? p.alias : '', e.last ? 'last ' + ago(e.last.t) : 'no check-ins yet'].filter(Boolean).join(' · ');
    return `<li><button class="p" type="button" data-act="sel" data-code="${esc(e.code)}" data-fk="p-${esc(e.code)}"${st.sel === e.code ? ' aria-current="true"' : ''}>
      <b>${esc(e.code)}${p && p.name ? ' · ' + esc(p.name) : ''}</b><span class="cnt">${fmtN(e.rows.length)}</span><small>${esc(sub)}</small>${flags.length ? `<span class="flags">${flags.join('')}</span>` : ''}</button></li>`;
  }

  /* ---------------------------------------------------------------- main column */
  function mainHtml() {
    const sel = st.sel, p = sel === 'ALL' ? null : person(sel);
    const all = sel === 'ALL' ? st.R : (st.rowsBy.get(sel) || []);
    const sp = span(all);
    const V = all.filter(x => inSpan(x, sp));
    const odd = all.filter(x => !x.sane).length;
    const notes = [];
    if (dbStale() || homeMissing()) notes.push(`<div class="notice warn" role="alert"><div><b>The database has not been updated yet.</b> Run <code>supabase-setup.sql</code> again in Supabase (SQL Editor), then Refresh.${dbStale() ? ' Until then nobody can be approved.' : ''}</div></div>`);
    if (st.local) notes.push(`<div class="notice warn"><div><b>Local mode.</b> These are the check-ins stored in this browser only${S.live ? '' : ' (no study database is configured in config.js yet)'}. Nothing here comes from the study database, and nothing can be approved.</div></div>`);
    if (st.warn.length) notes.push(`<div class="notice warn"><div><b>Some details could not be loaded:</b> ${esc(st.warn.join('; '))}. Everything else on the page is complete; Refresh to try again.</div></div>`);
    if (session.expired() && !st.local) notes.push(`<div class="notice bad" role="alert" id="expNote"><div><b>Your sign-in has expired.</b> What is on screen stays (and the downloads still work), but refreshing or changing anything needs a new sign-in.</div><button class="btn sm" type="button" data-act="relogin">Sign in again</button></div>`);
    if (odd) notes.push(`<div class="notice"><div>${plural(odd, 'check-in')} ${odd === 1 ? 'has' : 'have'} a date before ${esc(dnFull(SANE_DN))} or in the future (a phone clock far off). ${odd === 1 ? 'It is' : 'They are'} left out of the tiles and charts but ${odd === 1 ? 'is' : 'are'} in the table's “All time” view and the downloads.</div></div>`);
    const title = sel === 'ALL' ? 'Study overview' : (p && p.name ? `${esc(p.name)} <span class="code">· ${esc(sel)}</span>` : esc(sel));
    const subBits = sel === 'ALL'
      ? [plural(st.entries.filter(enrolled).length, 'participant') + (st.local ? '' : ' approved'), plural(V.length, 'check-in') + ' in ' + rangeWords()]
      : [p && p.alias ? 'Bay Race alias ' + p.alias : (p ? 'No alias yet' : 'No profile stored'), plural(V.length, 'check-in') + ' in ' + rangeWords()];
    if (st.local) subBits.push('stored in this browser only');
    else if (st.loadedAt) subBits.push('loaded at ' + clockOf(st.loadedAt));
    const rb = (k, label) => `<button type="button" data-act="range" data-v="${k}" data-fk="range-${k}" aria-pressed="${st.range === k}">${label}</button>`;
    const spanTxt = V.length || !sp.all ? dnFull(sp.start) + ' to ' + dnFull(sp.end) + (studyOver() && !sp.all ? ' (the study ended on ' + dnFull(END_DN) + ')' : '') : 'No check-ins yet';
    const xlsTitle = sel === 'ALL' ? 'Every check-in, all dates: Participants, All, Points and Labels sheets and one sheet per participant' : 'Every check-in of ' + sel + ', all dates, with the profile';
    const head = `${notes.join('')}
      <div class="toolbar"><div><h1 id="mainTitle" tabindex="-1">${title}</h1><div class="sub">${subBits.map(esc).join(' · ')}${waiting(p) ? ' · <span class="status-wait">waiting for approval</span>' : ''}</div></div>
        <div class="tools"><button class="btn ghost" type="button" data-act="refresh" data-fk="refresh">${icon('refresh')}${st.local ? 'Reload' : 'Refresh'}</button>
        <button class="btn ghost" type="button" data-act="csv" data-fk="csv" title="Every check-in${sel === 'ALL' ? '' : ' of ' + esc(sel)}, all dates, every stored column">${icon('down')}Download CSV</button>
        <button class="btn" type="button" data-act="xlsx" data-fk="xlsx" title="${esc(xlsTitle)}">${icon('down')}Download Excel</button></div></div>
      <div class="filters"><div class="seg" role="group" aria-label="Time range for every tile and chart">${rb('7', '7 days')}${rb('30', '30 days')}${START_DN !== null ? rb('study', 'Study period') : ''}${rb('all', 'All time')}</div>
        <span class="span">${icon('cal')}${esc(spanTxt)}</span>${sel === 'ALL' && studyPeriod() ? `<span>${esc(studyPeriod())}</span>` : ''}</div>`;
    const ctx = { V, all, p, sel, sp };
    return head + (sel === 'ALL' ? overviewHtml(ctx) : personHtml(ctx));
  }
  function emptyState(ctx) {
    const any = ctx.all.length > 0;
    return `<div class="box-empty"><b>${any ? 'No check-ins in ' + esc(rangeWords()) : 'No check-ins yet'}</b><p class="tnote">${any ? 'Choose “All time” above to see the earlier check-ins.' : ctx.sel === 'ALL' ? (st.local ? 'Check-ins made in the check-in app on this browser show here.' : 'Check-ins appear here as soon as participants start using the app.') : 'This participant has not checked in yet.'}</p></div>`;
  }
  function overviewHtml(ctx) {
    let h = tilesHtml(ctx) + approvalHtml();
    if (!ctx.V.length) h += emptyState(ctx);
    else h += `<div class="charts">${distFig(ctx)}${dailyFig(ctx)}${heatFig(ctx)}${prefFig(ctx)}${wallFig(ctx)}${heatingFig(ctx)}${statFig(ctx)}${cloFig(ctx)}${whereFig(ctx)}${actionsFig(ctx)}</div>`;
    if (!st.local) h += pointsHtml();
    if (!st.local) h += homesHtml();
    if (ctx.V.length) h += tableHtml(ctx);
    return h;
  }
  function personHtml(ctx) {
    let h = profileHtml(ctx) + tilesHtml(ctx);
    if (!ctx.V.length) return h + emptyState(ctx) + (ctx.all.length ? tableHtml(ctx) : '');
    h += `<div class="charts">${lineFig(ctx)}${distFig(ctx)}${dailyFig(ctx)}${heatFig(ctx)}${prefFig(ctx)}${wallFig(ctx)}${heatingFig(ctx)}${statFig(ctx)}${cloFig(ctx)}${whereFig(ctx)}${actionsFig(ctx)}</div>`;
    return h + tableHtml(ctx);
  }

  /* ---------------------------------------------------------------- tiles */
  /* Per person per day: each approved participant's check-ins in the window divided by the days they were taking
   * part in it (from the later of the window start and their first check-in, or their sign-up day when they have
   * none, up to yesterday: today is not over yet), so days without a check-in count as 0; the median across
   * people. People waiting for approval are left out. */
  function perPersonDay(entries, sp) {
    const today = todayDn(), rates = [], onDays = [];
    let goalDays = 0, personDays = 0;
    entries.forEach(e => {
      if (!e.p || waiting(e.p) || !enrolled(e)) return;
      const first = minDn(e.rows);
      const joined = first !== Infinity ? first : dayOfIso(e.p.created_at);
      if (joined === null) return;
      const from = Math.max(sp.start, joined);
      let end = sp.end;
      if (end >= today) end = from < today ? today - 1 : today;
      const days = end - from + 1;
      if (days <= 0) return;
      const per = new Map();
      e.rows.forEach(x => { if (x.sane && x.dn >= from && x.dn <= end) per.set(x.dn, (per.get(x.dn) || 0) + 1); });
      let k = 0; per.forEach(c => { k += c; if (c >= GOAL) goalDays++; });
      personDays += days;
      rates.push(k / days);
      if (per.size) onDays.push(k / per.size);
    });
    return { med: median(rates), medOn: median(onDays), n: rates.length, goalDays, personDays };
  }
  function pointsRows(key) {
    const list = st.points[key];
    if (!Array.isArray(list)) return null;
    // approved participants only: points_table also lists codes whose participant was removed (check-ins kept)
    const rows = list.filter(r => { const p = r && person(String(r.code || '').toUpperCase()); return !!p && (dbStale() || !!p.approved); })
      .map(r => Object.assign({}, r, { code: String(r.code || '').toUpperCase(), points: num(r.points) || 0 }));
    // people with no row yet (no check-in in the period) still belong in the table, on 0
    st.people.filter(p => p.approved || dbStale()).forEach(p => { const c = String(p.code).toUpperCase(); if (!rows.some(r => r.code === c)) rows.push({ code: c, alias: p.alias, race_hidden: p.race_hidden, checkins: 0, counted: 0, goal_days: 0, full_weeks: 0, points: 0 }); });
    rows.sort((a, b) => b.points - a.points || a.code.localeCompare(b.code, undefined, { numeric: true }));
    let rank = 0, prev = null;
    rows.forEach((r, i) => { if (r.points !== prev) { rank = i + 1; prev = r.points; } r.rank = rank; });
    return rows;
  }
  function tilesHtml(ctx) {
    const { V, all, sel, sp } = ctx;
    const n = V.length;
    let delta = '';
    if (sp.N) {
      const prev = all.filter(x => x.sane && x.dn >= sp.start - sp.N && x.dn < sp.start).length;
      // a percentage only means something against a fair number of check-ins (not the first days of the study)
      if (prev >= 20) { const d = Math.round(100 * (n - prev) / prev); delta = `<span class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d)}%</span> vs the ${sp.N} days before`; }
      else delta = (prev ? fmtN(prev) : 'none') + ' in the ' + sp.N + ' days before';
    } else if (n) delta = 'since ' + dnFull(sp.start);
    const ents = sel === 'ALL' ? st.entries : st.entries.filter(e => e.code === sel);
    const ppd = perPersonDay(ents, sp);
    const sched = V.filter(x => x.r.prompt === 'scheduled').length;
    const tile = (label, value, unit, sub, extra, tipText) => `<div class="tile"${tipText ? tipA(label, tipText) : ''}><span>${label}</span><b>${value}${unit ? `<small>${unit}</small>` : ''}</b><em>${sub}</em>${extra || ''}</div>`;
    let second;
    if (sel === 'ALL') {
      const inStudy = st.entries.filter(enrolled), codes = new Set(V.map(x => x.code));
      second = tile('Active participants', fmtN(inStudy.filter(e => codes.has(e.code)).length), st.local ? '' : 'of ' + fmtN(inStudy.length), 'checked in during ' + esc(rangeWords()));
    } else {
      const days = new Set(V.map(x => x.dn)).size, len = sp.end - sp.start + 1;
      second = tile('Days with check-ins', fmtN(days), 'of ' + fmtN(len), 'in ' + esc(rangeWords()));
    }
    const ratio = ppd.med === null ? 0 : Math.min(1, ppd.med / GOAL);
    const perTile = tile('Per person per day', ppd.med === null ? '–' : String(round1(ppd.med)), sel === 'ALL' ? 'median' : 'a day', `goal ${GOAL} a day${ppd.medOn === null ? '' : ' · ' + round1(ppd.medOn) + ' on days with a check-in'}`,
      `<div class="meter" aria-hidden="true"><i style="width:${(100 * ratio).toFixed(1)}%"></i></div>`,
      'Check-ins per day of taking part, days without a check-in counted as 0, median across ' + plural(ppd.n, 'approved participant') + '. Today counts once it is over. ' + plural(ppd.goalDays, 'day') + ' reached the goal of ' + GOAL + '.');
    const remTile = tile('From a reminder', pct(sched, n), '', fmtN(sched) + ' of ' + fmtN(n) + ' opened from a reminder');
    let ptsTile = '';
    const wk = pointsRows('week');
    if (!st.local && wk) {
      if (sel === 'ALL') {
        const tot = wk.reduce((s, r) => s + r.points, 0), lead = wk[0];
        ptsTile = tile('Points this week', fmtN(tot), 'in all', lead && lead.points ? 'leader ' + esc(lead.code) + (lead.alias ? ' ' + esc(lead.alias) : '') + ' · ' + fmtN(lead.points) : 'nobody has scored yet');
      } else {
        const me = wk.find(r => r.code === sel);
        ptsTile = me ? tile('Points this week', fmtN(me.points), '', me.points ? ordinal(me.rank) + ' of ' + wk.length + (me.race_hidden ? ' · hidden from others' : '') : 'no points yet this week') : '';
      }
    }
    return `<section class="tiles" aria-label="Key figures for ${esc(rangeWords())}">${tile('Check-ins', fmtN(n), '', delta || '&nbsp;')}${second}${perTile}${remTile}${ptsTile}</section>`;
  }
  const ordinal = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');

  /* ---------------------------------------------------------------- waiting for approval */
  function homePills(p) {
    const h = homeOf(p) || {}, out = [];
    if (h.postcode_area) out.push(esc(h.postcode_area));
    if (h.home_type) out.push(esc(lab('home_type', h.home_type)));
    if (h.tenure) out.push(esc(lab('tenure', h.tenure)));
    const ppl = (num(h.adults) || 0) + (num(h.children) || 0);
    if (ppl) out.push(plural(ppl, 'person', 'people'));
    if (h.main_heating) out.push(esc(lab('main_heating', h.main_heating)));
    return out.map(x => `<span class="pill">${x}</span>`).join('');
  }
  function approvalHtml() {
    if (st.local || dbStale()) return '';
    const pend = st.people.filter(p => !p.approved);
    if (!pend.length) return '';
    return `<section class="pending" aria-labelledby="apprTitle"><div class="phead"><b id="apprTitle">${plural(pend.length, 'person', 'people')} waiting for approval</b><span>New sign-ups cannot check in or get reminders until you approve them. Approve the people you expect and remove anyone you do not recognise.</span></div>
      ${pend.map(p => { const t = Date.parse(p.created_at); const hp = homePills(p); return `<div class="prow" data-errhost><code>${esc(p.code)}</code>
        <div class="pwho"><button type="button" data-act="sel" data-code="${esc(String(p.code).toUpperCase())}">${esc(p.name || p.code)}</button><span>${esc(p.email || '')} · signed up ${esc(isFinite(t) ? ago(t) + ' (' + fmtStamp(p.created_at) + ')' : '')}</span>${hp ? `<div class="pills">${hp}</div>` : `<div class="pills"><span class="pill">Home profile not filled in</span></div>`}</div>
        <div class="pbtns"><button class="btn sm" type="button" data-act="approve" data-code="${esc(p.code)}">Approve</button><button class="btn ghost sm danger" type="button" data-act="remove" data-code="${esc(p.code)}">Remove</button></div></div>`; }).join('')}</section>`;
  }

  /* ---------------------------------------------------------------- chart helpers */
  function fig(id, title, sub, body, opts) {
    opts = opts || {};
    const open = st.tables.has(id);
    return `<figure class="${opts.wide ? 'wide' : ''}" aria-labelledby="f-${id}">
      <div class="fhead"><div><figcaption id="f-${id}">${esc(title)}</figcaption>${sub ? `<div class="fsub">${sub}</div>` : ''}</div>
        <div class="fbtns">${opts.btns || ''}${opts.table ? `<button class="tbtn" type="button" data-act="table" data-id="${id}" data-fk="tbl-${id}" aria-controls="tb-${id}">${open ? 'Chart' : 'Table'}</button>` : ''}</div></div>
      <div class="fview" id="cv-${id}"${open ? ' hidden' : ''}>${body}</div>
      ${opts.table ? `<div class="ftable" id="tb-${id}"${open ? '' : ' hidden'}>${opts.table}</div>` : ''}
    </figure>`;
  }
  /* rows hold ready (escaped) cells; columns from numFrom on are right-aligned numbers */
  const tbl = (head, rows, numFrom) => { const nf = numFrom == null ? 1 : numFrom; return `<table><thead><tr>${head.map((h, i) => `<th scope="col"${i >= nf ? ' class="n"' : ''}>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td${i >= nf ? ' class="n"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`; };
  const svgBox = (id, label) => `<div class="svgbox" data-chart="${id}" role="img" aria-label="${esc(label)}"></div>`;
  const svgOpen = (w, h) => `<svg width="${Math.max(10, Math.floor(w))}" height="${h}" viewBox="0 0 ${Math.max(10, Math.floor(w))} ${h}" aria-hidden="true" focusable="false">`;
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
  function drawCharts() {
    const jobs = [];
    charts.forEach(c => $$('[data-chart="' + c.id + '"]').forEach(el => jobs.push({ c, el, w: el.clientWidth })));
    jobs.forEach(j => { if (!j.w) { j.el.dataset.pending = '1'; return; } delete j.el.dataset.pending; j.el.innerHTML = j.c.draw(j.w); });
    lastW = document.documentElement.clientWidth;
  }
  let lastW = 0, rz;
  window.addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { if (document.documentElement.clientWidth !== lastW && charts.length && $('#main')) { hideTip(); drawCharts(); } }); });
  /* horizontal bars: items [{k, label, n, colour?, tip?}], shares of `of` */
  function hbars(items, of, opts) {
    opts = opts || {};
    if (!items.length) return `<p class="tnote">${opts.empty || 'No answers yet.'}</p>`;
    const mx = Math.max(1, ...items.map(x => x.n));
    return `<div class="hbars">${items.map(x => `<div class="hb"${tipA(x.label, plural(x.n, opts.unit || 'check-in') + ' · ' + pct(x.n, of) + (opts.ofWords ? ' of ' + opts.ofWords : ''), x.tip)}><span class="lb">${esc(x.label)}</span><span class="tr"><i style="width:${(100 * x.n / mx).toFixed(1)}%${x.colour ? ';background:' + x.colour : ''}"></i></span><span class="vv"><b>${fmtN(x.n)}</b> · ${pct(x.n, of)}</span></div>`).join('')}</div>`;
  }
  /* counts of one stored field: in label-map order when `ordered`, otherwise most common first */
  function countBy(V, field, group, multi, ordered) {
    const m = new Map();
    V.forEach(x => { const v = x.r[field]; (multi ? [...new Set(listOf(v))] : (v === null || v === undefined || v === '' ? [] : [v])).forEach(k => m.set(String(k), (m.get(String(k)) || 0) + 1)); });
    let list = [...m.entries()].map(([k, n]) => ({ k, n, label: lab(group, k) }));
    if (ordered && L[group]) { const order = Object.keys(L[group]); list.sort((a, b) => (order.indexOf(a.k) + 1 || 999) - (order.indexOf(b.k) + 1 || 999)); }
    else list.sort((a, b) => b.n - a.n);
    return list;
  }
  const answered = (V, field) => V.filter(x => { const v = x.r[field]; return Array.isArray(v) ? true : v !== null && v !== undefined && v !== ''; });
  const meanTsv = list => mean(list.filter(x => x.tsv !== null).map(x => x.tsv));
  function dayDomain(sp) { const out = []; for (let d = sp.start; d <= sp.end; d++) out.push(d); return out; }

  /* (1) thermal sensation */
  function distFig(ctx) {
    const c = [0, 0, 0, 0, 0, 0, 0]; let nT = 0;
    ctx.V.forEach(x => { if (x.tsv !== null) { c[x.tsv + 3]++; nT++; } });
    const mx = Math.max(1, ...c), m = meanTsv(ctx.V);
    const cols = c.map((k, i) => { const v = i - 3, h = Math.round(100 * k / mx);
      return `<div class="col"${tipA(signed(v) + ' ' + tsvWord(v), plural(k, 'check-in') + ' · ' + pct(k, nT))}><div class="v">${k ? pct(k, nT) : ''}</div><div class="b" style="height:${k ? Math.max(h, 2) : 0}%;background:${tsvColour(v)}"></div></div>`; }).join('');
    const xl = c.map((k, i) => { const v = i - 3; return `<div><b>${signed(v)}</b>${esc(tsvWord(v).replace('Slightly ', 'sl. '))}</div>`; }).join('');
    return fig('dist', 'Thermal sensation', `ASHRAE seven-point scale · ${plural(nT, 'answer')}${m === null ? '' : ' · mean ' + signed(m)}`,
      `<div class="plot">${cols}</div><div class="xl">${xl}</div>`,
      { table: tbl(['Answer', 'Check-ins', 'Share'], c.map((k, i) => [`<span class="dot" style="background:${tsvColour(i - 3)}"></span>${signed(i - 3)} ${esc(tsvWord(i - 3))}`, fmtN(k), pct(k, nT)])) });
  }
  /* (2) check-ins per day (by week when the window is longer than about four months) */
  function dailyFig(ctx) {
    const days = dayDomain(ctx.sp), today = todayDn();
    const per = new Map(), who = new Map();
    ctx.V.forEach(x => { per.set(x.dn, (per.get(x.dn) || 0) + 1); if (!who.has(x.dn)) who.set(x.dn, new Set()); who.get(x.dn).add(x.code); });
    const weekly = days.length > 120;
    let bins = days.map(d => ({ a: d, b: d, n: per.get(d) || 0, who: who.get(d) ? who.get(d).size : 0 }));
    if (weekly) {
      const m = new Map();
      days.forEach(d => { const w = d - dnDow(d); if (!m.has(w)) m.set(w, { a: Math.max(w, days[0]), b: Math.min(w + 6, days[days.length - 1]), n: 0, set: new Set() }); const g = m.get(w); g.n += per.get(d) || 0; (who.get(d) || []).forEach(c => g.set.add(c)); });
      bins = [...m.values()].map(g => ({ a: g.a, b: g.b, n: g.n, who: g.set.size }));
    }
    let mx = 0, at = null; bins.forEach(b => { if (b.n > mx) { mx = b.n; at = b; } });
    const top = Math.max(1, mx);
    const every = Math.max(1, Math.ceil(bins.length / 8));
    const many = ctx.sel === 'ALL';
    const label = b => weekly ? 'Week of ' + dnShort(b.a) : dnLong(b.a);
    const cols = bins.map(b => `<div class="col day${b.b === today ? ' today' : ''}"${tipA(label(b) + (b.b === today ? ' (today, still going)' : ''), plural(b.n, 'check-in') + (many && b.n ? ' · ' + plural(b.who, 'participant') : ''))}><div class="b" style="height:${b.n ? Math.max(Math.round(100 * b.n / top), 2) : 0}%"></div></div>`).join('');
    const xl = bins.map((b, i) => `<div>${(bins.length - 1 - i) % every === 0 ? esc(b.b === today && !weekly ? 'Today' : dnShort(b.a)) : ''}</div>`).join('');
    const sub = (mx ? `Peak ${fmtN(mx)} ${weekly ? 'in the week of ' + dnShort(at.a) : 'on ' + dnLong(at.a)}` : 'None yet') + (weekly ? ' · one bar per week' : '') + (ctx.sp.end >= today ? ' · today is still going' : '');
    return fig('daily', 'Check-ins per day', esc(sub), `<div class="plot days"><div class="grid" style="top:0"><span>${fmtN(top)}</span></div>${cols}</div><div class="xl days">${xl}</div>`,
      { table: tbl([weekly ? 'Week of' : 'Day', 'Check-ins', ...(many ? ['Participants'] : [])], bins.slice().reverse().map(b => [esc(weekly ? dnFull(b.a) : dnLong(b.a) + ' ' + dnYear(b.a)), fmtN(b.n), ...(many ? [fmtN(b.who)] : [])])) });
  }
  /* (3) weekday x hour: when people check in, or how they feel then */
  function heatFig(ctx) {
    const cells = []; for (let d = 0; d < 7; d++) { cells.push([]); for (let h = 0; h < 24; h++) cells[d].push({ n: 0, k: 0, sum: 0, homes: new Set() }); }
    ctx.V.forEach(x => { if (x.dow === null || x.hour === null) return; const c = cells[x.dow][x.hour]; c.n++; c.homes.add(x.code); if (x.tsv !== null) { c.k++; c.sum += x.tsv; } });
    let mx = 0; cells.forEach(r => r.forEach(c => { if (c.n > mx) mx = c.n; }));
    const many = ctx.sel === 'ALL', isN = st.hm === 'n';
    let grid = '<span></span>';
    for (let h = 0; h < 24; h++) grid += `<span class="hl">${h % 6 === 0 ? hhmm(h, 0) : ''}</span>`;
    for (let d = 0; d < 7; d++) {
      grid += `<span class="rl">${WD[d]}</span>`;
      for (let h = 0; h < 24; h++) {
        const c = cells[d][h], when = WD_LONG[d] + ' ' + hhmm(h, 0) + '–' + hhmm((h + 1) % 24, 0);
        const from = many && c.n ? ' from ' + plural(c.homes.size, 'home') : '';
        if (!c.n) { grid += `<span class="c"${tipA(when, 'No check-ins')}></span>`; continue; }
        if (isN) { const lvl = Math.max(1, Math.ceil(5 * c.n / mx)); grid += `<span class="c" style="background:var(--heat-${lvl})"${tipA(when, plural(c.n, 'check-in') + from, c.k ? 'Mean feeling ' + signed(c.sum / c.k) : '')}></span>`; }
        else if (c.k < 3) grid += `<span class="c few"${tipA(when, plural(c.k, 'answer') + from + ', too few for a colour', c.k ? 'Mean ' + signed(c.sum / c.k) : '')}></span>`;
        else { const m = c.sum / c.k, s = stepOf(m); grid += `<span class="c" style="background:${tsvColour(s)}"${tipA(when, 'Mean ' + signed(m) + ' · nearest ' + tsvWord(s), plural(c.k, 'answer') + from)}></span>`; }
      }
    }
    const legend = isN
      ? `<div class="hlegend">Fewer<span class="ramp">${[1, 2, 3, 4, 5].map(i => `<i style="background:var(--heat-${i})"></i>`).join('')}</span>More check-ins<span class="gapx"></span><span class="ramp"><i style="background:var(--heat-0)"></i></span>None · busiest hour ${fmtN(mx)}</div>`
      : `<div class="hlegend"><span class="ramp">${[-3, -2, -1, 0, 1, 2, 3].map(v => `<i style="background:${tsvColour(v)}" title="${esc(signed(v) + ' ' + tsvWord(v))}"></i>`).join('')}</span>Cold to hot<span class="gapx"></span><span class="ramp"><i class="few" style="background:repeating-linear-gradient(45deg,var(--panel) 0 3px,var(--hatch) 3px 5px)"></i></span>Fewer than 3 answers<span class="gapx"></span><span class="ramp"><i style="background:var(--heat-0)"></i></span>None</div>`;
    const btns = `<div class="seg" role="group" aria-label="Colour the cells by"><button type="button" data-act="hm" data-v="n" data-fk="hm-n" aria-pressed="${isN}">Check-ins</button><button type="button" data-act="hm" data-v="tsv" data-fk="hm-tsv" aria-pressed="${!isN}">Mean feeling</button></div>`;
    const rows = []; for (let h = 0; h < 24; h++) rows.push([hhmm(h, 0), ...WD.map((_, d) => { const c = cells[d][h]; return c.n ? (isN ? fmtN(c.n) : (c.k ? signed(c.sum / c.k) + ' (' + c.k + ')' : '–')) : '–'; })]);
    return fig('hm', isN ? 'When people check in' : 'How people feel through the week', 'Weekday by hour, UK time' + (isN ? '' : ' · mean sensation as the nearest step'),
      `<div class="hm" role="img" aria-label="${esc((isN ? 'Check-ins' : 'Mean thermal sensation') + ' by weekday and hour. Open the table for the numbers.')}">${grid}</div>${legend}`,
      { wide: true, btns, table: tbl(['Hour', ...WD], rows) });
  }
  /* (4) preference and acceptability */
  const ACC_OF = { acceptable: 'acceptable', unacceptable: 'unacceptable', clearly_acc: 'acceptable', just_acc: 'acceptable', just_unacc: 'unacceptable', clearly_unacc: 'unacceptable' };
  function splitRow(title, parts, of, extra) {
    return `<div class="srow"><div class="sl"><b>${esc(title)}</b><span>${plural(of, 'answer')}${extra ? ' · ' + esc(extra) : ''}</span></div>
      <div class="strack">${parts.filter(x => x.n).map(x => `<i style="width:${(100 * x.n / of).toFixed(2)}%;background:${x.colour}"${tipA(title + ': ' + x.label, plural(x.n, 'check-in') + ' · ' + pct(x.n, of))}></i>`).join('')}</div>
      <div class="slegend">${parts.map(x => `<span><i class="sw" style="background:${x.colour}"></i>${esc(x.label)} <b>${pct(x.n, of)}</b></span>`).join('')}</div></div>`;
  }
  function prefFig(ctx) {
    const P = { cooler: 0, same: 0, warmer: 0 }, A = { acceptable: 0, unacceptable: 0 };
    let nP = 0, nA = 0, old = 0;
    ctx.V.forEach(x => {
      if (Object.prototype.hasOwnProperty.call(P, x.r.preference)) { P[x.r.preference]++; nP++; }
      const a = ACC_OF[x.r.acceptability]; if (a) { A[a]++; nA++; if (a !== x.r.acceptability) old++; }
    });
    const pref = [{ k: 'cooler', label: 'Cooler', n: P.cooler, colour: 'var(--d-2)' }, { k: 'same', label: 'No change', n: P.same, colour: 'var(--d0)' }, { k: 'warmer', label: 'Warmer', n: P.warmer, colour: 'var(--d2)' }];
    const acc = [{ k: 'acceptable', label: 'Acceptable', n: A.acceptable, colour: 'var(--teal)' }, { k: 'unacceptable', label: 'Not acceptable', n: A.unacceptable, colour: 'var(--bad)' }];
    // how acceptability and preference move with sensation (in the table view)
    const bySense = [-3, -2, -1, 0, 1, 2, 3].map(v => { const g = ctx.V.filter(x => x.tsv === v); const a = g.filter(x => ACC_OF[x.r.acceptability]); const un = a.filter(x => ACC_OF[x.r.acceptability] === 'unacceptable').length; const p = g.filter(x => P.hasOwnProperty(x.r.preference)); return [`${signed(v)} ${esc(tsvWord(v))}`, fmtN(g.length), pct(p.filter(x => x.r.preference === 'cooler').length, p.length), pct(p.filter(x => x.r.preference === 'same').length, p.length), pct(p.filter(x => x.r.preference === 'warmer').length, p.length), pct(un, a.length)]; });
    const body = nP || nA ? `<div class="split">${nP ? splitRow('Would like to be', pref, nP) : ''}${nA ? splitRow('Conditions are', acc, nA, old ? plural(old, 'older four-point answer') + ' grouped in' : '') : ''}</div>` : '<p class="tnote">No answers yet.</p>';
    return fig('pref', 'Preference and acceptability', 'Share of check-ins', body,
      { table: tbl(['Sensation', 'Check-ins', 'Cooler', 'No change', 'Warmer', 'Not acceptable'], bySense) });
  }
  /* (5) heating on, which heating, for how long */
  function heatingFig(ctx) {
    const asked = answered(ctx.V, 'heating_on');
    const on = asked.filter(x => x.r.heating_on === 'on'), off = asked.filter(x => x.r.heating_on === 'off'), un = asked.filter(x => x.r.heating_on === 'unsure');
    const parts = [{ label: 'On', n: on.length, colour: 'var(--d2)' }, { label: 'Off', n: off.length, colour: 'var(--d-2)' }, { label: 'Not sure', n: un.length, colour: 'var(--d0)' }];
    const src = countBy(on, 'heating_src', 'heating_src', true);
    const dur = countBy(on, 'heating_for', 'heating_for', false, true);
    const mOn = meanTsv(on), mOff = meanTsv(off);
    const notAsked = ctx.V.length - asked.length;
    const body = asked.length ? `<div class="split">${splitRow('Heating', parts, asked.length)}</div>
      <p class="fnote">Mean feeling with the heating on <b>${signed(mOn)}</b> (${fmtN(on.length)}) · off <b>${signed(mOff)}</b> (${fmtN(off.length)})${notAsked ? ' · ' + plural(notAsked, 'older check-in') + ' did not ask' : ''}</p>
      <div class="sub-h">Heating in use, when on</div>${hbars(src.map(x => Object.assign(x, { colour: 'var(--d1)' })), on.length, { ofWords: 'check-ins with the heating on', empty: 'No heating on yet.' })}
      <div class="sub-h">On for</div>${hbars(dur, on.length, { ofWords: 'check-ins with the heating on', empty: 'No heating on yet.' })}`
      : `<p class="tnote">No check-in in this view answered the heating question (it is asked from version 1.0).</p>`;
    const rows = [...parts.map(x => ['Heating ' + esc(x.label.toLowerCase()), fmtN(x.n), pct(x.n, asked.length)]), ...src.map(x => ['In use: ' + esc(x.label), fmtN(x.n), pct(x.n, on.length)]), ...dur.map(x => ['On for: ' + esc(x.label), fmtN(x.n), pct(x.n, on.length)])];
    return fig('heat', 'Heating', `${plural(asked.length, 'answer')} · several heaters can be on at once`, body, { table: tbl(['Answer', 'Check-ins', 'Share'], rows) });
  }
  /* (6) thermostat reading against thermal sensation */
  const jit = (s, k) => { let h = 2166136261; s = String(s) + k; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000) / 1000 - 0.5; };
  function statFig(ctx) {
    const pts = ctx.V.filter(x => x.tsv !== null && num(x.r.stat_temp_c) !== null).map(x => ({ x, t: num(x.r.stat_temp_c) }));
    const homes = new Set(pts.map(p => p.x.code)).size;
    let r = null;
    if (pts.length >= 5) {
      const mt = mean(pts.map(p => p.t)), mv = mean(pts.map(p => p.x.tsv));
      let sxy = 0, sxx = 0, syy = 0; pts.forEach(p => { sxy += (p.t - mt) * (p.x.tsv - mv); sxx += (p.t - mt) ** 2; syy += (p.x.tsv - mv) ** 2; });
      r = sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
    }
    const bins = new Map(); pts.forEach(p => { const b = Math.round(p.t); if (!bins.has(b)) bins.set(b, []); bins.get(b).push(p.x.tsv); });
    const binRows = [...bins.entries()].sort((a, b) => a[0] - b[0]);
    addChart('stat', w => statSvg(w, pts, binRows, ctx.sel === 'ALL'));
    const sub = pts.length ? `${plural(pts.length, 'reading')}${ctx.sel === 'ALL' ? ' from ' + plural(homes, 'home') : ''}${r === null ? '' : ' · correlation r = ' + r.toFixed(2)}` : 'No readings yet';
    const body = pts.length ? svgBox('stat', 'Thermostat room temperature against thermal sensation, one dot per check-in. Open the table for the means.') + `<div class="hlegend"><span class="legend-line">Mean sensation per °C (3 or more readings)</span></div><p class="fnote">Asked only in homes whose thermostat shows the room temperature; “I can’t see it” is left out.</p>`
      : `<p class="tnote">No thermostat readings in this view. The question is asked only when the home profile says the thermostat shows the room temperature (from version 1.0).</p>`;
    return fig('stat', 'Thermostat reading and how people feel', esc(sub), body,
      { table: tbl(['Thermostat shows', 'Readings', 'Mean sensation'], binRows.map(([b, a]) => [esc((b - 0.5) + '–' + (b + 0.4) + ' °C'), fmtN(a.length), signed(mean(a))])) });
  }
  function statSvg(w, pts, binRows, many) {
    const H = 260, words = w >= 440, pl = words ? 96 : 34, pr = 10, pt = 10, pb = 30, pw = w - pl - pr, ph = H - pt - pb;
    let lo = Infinity, hi = -Infinity; pts.forEach(p => { lo = Math.min(lo, Math.floor(p.t)); hi = Math.max(hi, Math.ceil(p.t)); });
    lo -= 1; hi += 1;
    if (hi - lo < 6) { const c = (hi + lo) / 2; lo = Math.floor(c - 3); hi = lo + 6; }
    lo = Math.max(5, lo); hi = Math.min(35, hi);
    const X = t => pl + (t - lo) / (hi - lo) * pw, Y = v => pt + (3 - v) / 6 * ph;
    let s = svgOpen(w, H);
    for (let v = 3; v >= -3; v--) { const y = Y(v).toFixed(1); s += `<line class="${v === 0 ? 'bl0' : 'gl'}" x1="${pl}" x2="${w - pr}" y1="${y}" y2="${y}"/><text class="ax" x="${pl - 8}" y="${(+y + 4).toFixed(1)}" text-anchor="end">${esc(signed(v) + (words ? ' ' + tsvWord(v) : ''))}</text>`; }
    const stepT = (hi - lo) > 14 ? 2 : 1;
    for (let t = Math.ceil(lo); t <= hi; t += stepT) s += `<line class="gl" x1="${X(t).toFixed(1)}" x2="${X(t).toFixed(1)}" y1="${pt + ph}" y2="${pt + ph + 4}"/><text class="ax" x="${X(t).toFixed(1)}" y="${H - 10}" text-anchor="middle">${t}°</text>`;
    s += `<text class="ax" x="${w - pr}" y="${H - 10}" text-anchor="end" dy="0"></text>`;
    const r = pts.length > 400 ? 3 : 4;
    pts.forEach(p => {
      const cx = X(p.t + jit(p.x.r.client_id || p.x.t, 'x') * 0.3), cy = Y(p.x.tsv + jit(p.x.r.client_id || p.x.t, 'y') * 0.5);
      s += `<circle class="vdot" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}" style="fill:${tsvColour(p.x.tsv)}"${tipA(p.t.toFixed(1) + ' °C · ' + signed(p.x.tsv) + ' ' + tsvWord(p.x.tsv), (many ? p.x.code + ' · ' : '') + dnLong(p.x.dn) + ' ' + hhmm(p.x.hour, p.x.min), lab('room', p.x.r.room))}/>`;
    });
    const line = binRows.filter(([, a]) => a.length >= 3).map(([b, a]) => [X(b), Y(mean(a)), b, a]);
    if (line.length > 1) s += `<path class="mline" d="M${line.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join('L')}"/>`;
    line.forEach(q => { s += `<circle class="mdot" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="4"${tipA('About ' + q[2] + ' °C', 'Mean ' + signed(mean(q[3])) + ' from ' + plural(q[3].length, 'reading'))}/>`; });
    return s + '</svg>';
  }
  /* (7) outside wall by touch */
  const WALL_COL = { cold: 'var(--d-2)', cool: 'var(--d-1)', neutral: 'var(--d0)', warm: 'var(--d1)', no_reach: 'var(--ink-muted)' };
  function wallFig(ctx) {
    const asked = answered(ctx.V, 'wall');
    const list = countBy(asked, 'wall', 'wall', false, true).map(x => { const g = asked.filter(y => String(y.r.wall) === x.k); return Object.assign(x, { colour: WALL_COL[x.k], tip: 'Mean feeling ' + signed(meanTsv(g)) }); });
    const reach = asked.filter(x => x.r.wall !== 'no_reach').length;
    const body = asked.length ? hbars(list, asked.length) + `<p class="fnote">${plural(reach, 'touch')} of a wall · ${pct(asked.filter(x => x.r.wall === 'cold' || x.r.wall === 'cool').length, reach)} felt cold or cool${ctx.V.length - asked.length ? ' · ' + plural(ctx.V.length - asked.length, 'older check-in') + ' did not ask' : ''}</p>`
      : '<p class="tnote">No wall answers in this view (asked from version 1.0).</p>';
    return fig('wall', 'Nearest outside wall, by touch', `${plural(asked.length, 'answer')} · back of the hand on the wall`, body,
      { table: tbl(['Wall feels', 'Check-ins', 'Share', 'Mean sensation'], list.map(x => { const g = asked.filter(y => String(y.r.wall) === x.k); return [esc(x.label), fmtN(x.n), pct(x.n, asked.length), signed(meanTsv(g))]; })) });
  }
  /* (8) clothing insulation over time */
  function cloFig(ctx) {
    const days = dayDomain(ctx.sp);
    const by = new Map();
    ctx.V.forEach(x => { const c = num(x.r.clo); if (c === null) return; if (!by.has(x.dn)) by.set(x.dn, []); by.get(x.dn).push(c); });
    const stats = days.filter(d => by.has(d)).map(d => { const a = by.get(d); let lo = Infinity, hi = -Infinity; a.forEach(v => { if (v < lo) lo = v; if (v > hi) hi = v; }); return { d, n: a.length, m: mean(a), lo, hi }; });
    const all = ctx.V.map(x => num(x.r.clo)).filter(v => v !== null);
    const g = countBy(ctx.V, 'garments', 'garments', true);
    addChart('clo', w => cloSvg(w, days, stats));
    const body = stats.length ? svgBox('clo', 'Mean clothing insulation per day, with the range of the day shaded. Open the table for the numbers.') + `<div class="hlegend"><span class="legend-line">Daily mean</span><span class="gapx"></span><span class="legend-band">Lowest to highest that day</span></div>
      <div class="sub-h">What people wore</div>${hbars(g.slice(0, 15), ctx.V.length, { ofWords: 'check-ins' })}`
      : '<p class="tnote">No clothing answers in this view.</p>';
    return fig('clo', 'Clothing insulation over time', all.length ? `Mean ${mean(all).toFixed(2)} clo · median ${median(all).toFixed(2)} · blankets and duvets included` : 'No answers yet', body,
      { wide: true, table: tbl(['Day', 'Check-ins', 'Mean clo', 'Lowest', 'Highest'], stats.slice().reverse().map(o => [esc(dnLong(o.d) + ' ' + dnYear(o.d)), fmtN(o.n), o.m.toFixed(2), o.lo.toFixed(2), o.hi.toFixed(2)])) });
  }
  function cloSvg(w, days, stats) {
    const H = 220, pl = 40, pr = 10, pt = 10, pb = 28, pw = w - pl - pr, ph = H - pt - pb;
    let top = 1.5; stats.forEach(o => { top = Math.max(top, o.hi); });
    top = Math.ceil(top * 2) / 2;
    const n = days.length, d0 = days[0], slot = pw / Math.max(1, n);
    const X = d => pl + (d - d0 + 0.5) * slot, Y = v => pt + ph - v / top * ph;
    let s = svgOpen(w, H);
    const tk = ticks(top, 4);
    tk.forEach(v => { if (v > top + 1e-9) return; const y = Y(v).toFixed(1); s += `<line class="${v ? 'gl' : 'bl'}" x1="${pl}" x2="${w - pr}" y1="${y}" y2="${y}"/><text class="ax" x="${pl - 6}" y="${(+y + 4).toFixed(1)}" text-anchor="end">${v.toFixed(v % 1 ? 1 : 0)}</text>`; });
    // the range of each day as a soft column, the mean as a 2px line
    stats.forEach(o => { const y1 = Y(o.hi), y0 = Y(o.lo); s += `<rect class="band" x="${(X(o.d) - Math.min(8, slot * .35)).toFixed(1)}" y="${y1.toFixed(1)}" width="${(Math.min(16, slot * .7)).toFixed(1)}" height="${Math.max(1, y0 - y1).toFixed(1)}" rx="2"/>`; });
    if (stats.length > 1) s += `<path class="mline" d="M${stats.map(o => X(o.d).toFixed(1) + ',' + Y(o.m).toFixed(1)).join('L')}"/>`;
    stats.forEach(o => { s += `<circle class="mdot" cx="${X(o.d).toFixed(1)}" cy="${Y(o.m).toFixed(1)}" r="3.5"/><rect class="hit" x="${(X(o.d) - slot / 2).toFixed(1)}" y="${pt}" width="${Math.max(6, slot).toFixed(1)}" height="${ph}"${tipA(dnLong(o.d), 'Mean ' + o.m.toFixed(2) + ' clo · ' + plural(o.n, 'check-in'), 'From ' + o.lo.toFixed(2) + ' to ' + o.hi.toFixed(2))}/>`; });
    const every = Math.max(1, Math.ceil(70 / slot));
    days.forEach((d, i) => { if ((n - 1 - i) % every === 0) s += `<text class="ax" x="${X(d).toFixed(1)}" y="${H - 8}" text-anchor="${i === n - 1 ? 'end' : 'middle'}">${esc(dnShort(d))}</text>`; });
    return s + '</svg>';
  }
  /* (9) rooms and activity; (10) what people did and noticed */
  function whereFig(ctx) {
    const rooms = countBy(ctx.V, 'room', 'room', false, true), acts = countBy(ctx.V, 'activity', 'activity', false, true);
    const air = countBy(ctx.V, 'air', 'air', false, true), sun = countBy(ctx.V, 'sun', 'sun', false, true);
    const n = ctx.V.length;
    return fig('where', 'Rooms, activity, air and sun', 'Share of check-ins', `<div class="sub-h">Room</div>${hbars(rooms, n)}<div class="sub-h">Last 15 minutes</div>${hbars(acts, n)}<div class="sub-h">Air movement</div>${hbars(air, n)}<div class="sub-h">Sun</div>${hbars(sun, n)}`,
      { table: tbl(['Answer', 'Check-ins', 'Share'], [...rooms.map(x => ['Room: ' + esc(x.label), fmtN(x.n), pct(x.n, n)]), ...acts.map(x => ['Activity: ' + esc(x.label), fmtN(x.n), pct(x.n, n)]), ...air.map(x => ['Air: ' + esc(x.label), fmtN(x.n), pct(x.n, n)]), ...sun.map(x => ['Sun: ' + esc(x.label), fmtN(x.n), pct(x.n, n)])]) });
  }
  function actionsFig(ctx) {
    const n = ctx.V.length;
    const acts = countBy(ctx.V, 'actions', 'actions', true).filter(x => x.k !== 'none'), notes = countBy(ctx.V, 'notes', 'notes', true).filter(x => x.k !== 'none');
    const noneA = ctx.V.filter(x => Array.isArray(x.r.actions) && !x.r.actions.filter(a => a !== 'none').length).length;
    return fig('acts', 'What people did and noticed', 'In the 30 minutes before a check-in · several answers allowed', `<div class="sub-h">Did</div>${hbars(acts, n, { ofWords: 'check-ins', empty: 'Nothing recorded.' })}<p class="fnote">${pct(noneA, n)} of check-ins: none of these</p><div class="sub-h">Had or felt</div>${hbars(notes, n, { ofWords: 'check-ins', empty: 'Nothing recorded.' })}`,
      { table: tbl(['Answer', 'Check-ins', 'Share'], [...acts.map(x => ['Did: ' + esc(x.label), fmtN(x.n), pct(x.n, n)]), ...notes.map(x => ['Had or felt: ' + esc(x.label), fmtN(x.n), pct(x.n, n)])]) });
  }
  /* participant page: every vote and the daily mean */
  function lineFig(ctx) {
    const days = dayDomain(ctx.sp);
    const pts = ctx.V.filter(x => x.tsv !== null);
    const by = new Map(); pts.forEach(x => { if (!by.has(x.dn)) by.set(x.dn, []); by.get(x.dn).push(x.tsv); });
    addChart('pline', w => lineSvg(w, days, pts, by));
    const m = meanTsv(pts);
    return fig('pline', 'Thermal sensation, day by day', `${plural(pts.length, 'answer')}${m === null ? '' : ' · mean ' + signed(m)} · each dot is one check-in`,
      svgBox('pline', 'Every thermal sensation answer as a dot, with the daily mean as a line. Open the table for the numbers.') + `<div class="hlegend"><span class="legend-line">Daily mean</span></div>`,
      { wide: true, table: tbl(['Day', 'Answers', 'Mean', 'Lowest', 'Highest'], days.slice().reverse().filter(d => by.has(d)).map(d => { const a = by.get(d); return [esc(dnLong(d) + ' ' + dnYear(d)), fmtN(a.length), signed(mean(a)), signed(Math.min.apply(null, a)), signed(Math.max.apply(null, a))]; })) });
  }
  function lineSvg(w, days, pts, by) {
    const H = 250, words = w >= 440, pl = words ? 96 : 34, pr = 10, pt = 10, pb = 28, pw = w - pl - pr, ph = H - pt - pb;
    const d0 = days[0], n = days.length, slot = pw / Math.max(1, n);
    const X = v => pl + (v - d0) * slot, Y = v => pt + (3 - v) / 6 * ph;
    let s = svgOpen(w, H);
    for (let v = 3; v >= -3; v--) { const y = Y(v).toFixed(1); s += `<line class="${v === 0 ? 'bl0' : 'gl'}" x1="${pl}" x2="${w - pr}" y1="${y}" y2="${y}"/><text class="ax" x="${pl - 8}" y="${(+y + 4).toFixed(1)}" text-anchor="end">${esc(signed(v) + (words ? ' ' + tsvWord(v) : ''))}</text>`; }
    const every = Math.max(1, Math.ceil(70 / slot));
    days.forEach((d, i) => { if ((n - 1 - i) % every === 0) s += `<text class="ax" x="${(X(d) + slot / 2).toFixed(1)}" y="${H - 6}" text-anchor="${i === n - 1 ? 'end' : 'middle'}">${esc(dnShort(d))}</text>`; });
    const means = days.filter(d => by.has(d)).map(d => ({ d, m: mean(by.get(d)), n: by.get(d).length }));
    if (means.length > 1) s += `<path class="mline" d="M${means.map(o => X(o.d + .5).toFixed(1) + ',' + Y(o.m).toFixed(1)).join('L')}"/>`;
    const r = slot >= 24 ? 5 : 4;
    pts.forEach(x => { const fx = x.dn + ((x.hour || 0) + (x.min || 0) / 60) / 24; s += `<circle class="vdot" cx="${X(fx).toFixed(1)}" cy="${Y(x.tsv).toFixed(1)}" r="${r}" style="fill:${tsvColour(x.tsv)}"${tipA(dnLong(x.dn) + ' ' + hhmm(x.hour, x.min), signed(x.tsv) + ' ' + tsvWord(x.tsv), lab('room', x.r.room))}/>`; });
    means.forEach(o => { s += `<circle class="mdot" cx="${X(o.d + .5).toFixed(1)}" cy="${Y(o.m).toFixed(1)}" r="3.5"${tipA(dnLong(o.d) + ' · daily mean ' + signed(o.m), plural(o.n, 'answer'))}/>`; });
    return s + '</svg>';
  }

  /* ---------------------------------------------------------------- points and the Bay Race */
  function periodWords(key) {
    const per = pointsPeriods()[key];
    if (key === 'week') return 'Monday ' + dnShort(per.from) + ' to Sunday ' + dnFull(per.to);
    if (key === 'month') return dnShort(per.from) + ' to ' + dnFull(per.to);
    return 'every check-in since ' + dnFull(per.from);
  }
  function targetOf(key) {
    const day = GOAL * PTS.checkin + PTS.goalDay;
    const per = pointsPeriods()[key];
    if (key === 'week') return 7 * day + PTS.fullWeek;
    if (key === 'month') { let sundays = 0; for (let d = per.from; d <= per.to; d++) if (dnDow(d) === 6) sundays++; return (per.to - per.from + 1) * day + sundays * PTS.fullWeek; }
    return null;
  }
  function pointsHtml() {
    const key = st.pp, rows = pointsRows(key), target = targetOf(key);
    const pb = (k, label) => `<button type="button" data-act="pp" data-v="${k}" data-fk="pp-${k}" aria-pressed="${st.pp === k}">${label}</button>`;
    const btns = `<div class="seg" role="group" aria-label="Points period">${pb('week', 'This week')}${pb('month', 'This month')}${pb('all', 'All time')}</div>`;
    const sub = esc(periodWords(key)) + (target ? ' · target ' + fmtN(target) + ' points (the daily goal every day and the full-week bonus)' : '');
    let body;
    if (!rows) body = `<p class="tnote">${st.pointsErr ? 'The points could not be loaded: ' + esc(st.pointsErr) + '. Refresh to try again.' : 'No points yet.'}</p>`;
    else if (!rows.length) body = '<p class="tnote">Nobody is approved yet.</p>';
    else {
      body = `<div class="tablewrap" style="max-height:440px"><table class="ptable"><thead><tr><th scope="col">Rank</th><th scope="col">Code</th><th scope="col">Name</th><th scope="col">Alias</th><th scope="col">In the race</th><th scope="col" class="n">Check-ins</th><th scope="col" class="n">Counted</th><th scope="col" class="n">Goal days</th><th scope="col" class="n">Full weeks</th><th scope="col" class="n">Points</th>${target ? '<th scope="col">Of target</th>' : ''}</tr></thead><tbody>
        ${rows.map(r => { const p = person(r.code); const c = p && num(p.alias_colour) !== null ? RUNNER[num(p.alias_colour) % RUNNER.length] : null; const ratio = target ? Math.min(1, r.points / target) : 0;
          return `<tr><td class="rank">${r.points && r.rank <= 3 ? `<span class="medal m${r.rank}" aria-label="${ordinal(r.rank)}">${r.rank}</span>` : esc(ordinal(r.rank))}</td><td><button class="lnkcode" type="button" data-act="sel" data-code="${esc(r.code)}" style="color:var(--accent);font-family:var(--mono);font-weight:600">${esc(r.code)}</button></td><td style="font-family:var(--sans)">${esc(p ? p.name : '')}</td><td style="font-family:var(--sans)">${c ? `<span class="dot" style="background:${c}"></span>` : ''}${esc(r.alias || (p && p.alias) || '–')}</td><td style="font-family:var(--sans)">${(r.race_hidden != null ? r.race_hidden : p && p.race_hidden) ? '<span class="flag hid">Hidden</span>' : 'Shown'}</td><td class="n">${fmtN(num(r.checkins) || 0)}</td><td class="n">${fmtN(num(r.counted) || 0)}</td><td class="n">${fmtN(num(r.goal_days) || 0)}</td><td class="n">${fmtN(num(r.full_weeks) || 0)}</td><td class="n"><b>${fmtN(r.points)}</b></td>${target ? `<td class="prog"${tipA(pct(r.points, target) + ' of ' + fmtN(target))}><div class="meter"><i style="width:${(100 * ratio).toFixed(1)}%;background:${r.points >= target ? 'var(--teal)' : 'var(--accent)'}"></i></div></td>` : ''}</tr>`; }).join('')}
        </tbody></table></div>
        <p class="fnote">${PTS.checkin} points a counted check-in (at least ${Number(cfg.checkinGapMin) || 45} minutes after the one before, up to ${PTS.dailyCap} a day), +${PTS.goalDay} for each day with ${GOAL} or more (a goal day), +${PTS.fullWeek} for a Monday–Sunday week of goal days, counted in the period that holds its Sunday. The rank counts everyone approved, including people hidden from the race; participants never see codes or names, and hidden people only see themselves.</p>`;
    }
    return `<section class="charts" style="grid-template-columns:minmax(0,1fr)">${fig('pts', 'Points and the Bay Race', sub, body, { wide: true, btns })}</section>`;
  }

  /* ---------------------------------------------------------------- home profiles */
  const ageBand = by => { const y = num(by); if (y === null) return null; const a = new Date().getFullYear() - y; return a < 18 ? null : a < 25 ? 'a18' : a < 35 ? 'a25' : a < 45 ? 'a35' : a < 55 ? 'a45' : a < 65 ? 'a55' : a < 75 ? 'a65' : 'a75'; };
  const areaBand = v => v < 50 ? 'lt50' : v < 80 ? 'a50' : v < 110 ? 'a80' : v < 150 ? 'a110' : 'a150';
  const setBand = v => { const r = Math.round(v); return r <= 17 ? 'le17' : r >= 24 ? 'ge24' : String(r); };
  // [key, title, kind]: kind p = participant column, multi = several answers, area / setp = binned numbers
  const HOME_GROUPS = [
    ['The people', [['gender', 'Gender', 'p'], ['sensitivity', 'Thermal sensitivity', 'p'], ['age', 'Age', 'age']]],
    ['Area and home', [['postcode_area', 'Postcode area', 'free'], ['home_type', 'Home type'], ['flat_position', 'Flat position (flats only)'], ['tenure', 'Tenure']]],
    ['Age and size', [['year_built', 'Year built'], ['floors', 'Floors'], ['bedrooms', 'Bedrooms'], ['floor_area_m2', 'Floor area', 'area'], ['epc', 'EPC rating']]],
    ['Who lives here', [['adults', 'Adults'], ['children', 'Children'], ['pets', 'Pets'], ['bedroom_share', 'Sharing the bedroom']]],
    ['Heating', [['main_heating', 'Main heating'], ['other_heaters', 'Other heaters', 'multi'], ['heating_pattern', 'How the heating is used'], ['payment', 'How the heating is paid for']]],
    ['Heating controls', [['controls', 'Controls', 'multi'], ['stat_display', 'Thermostat screen'], ['setpoint_c', 'Usual thermostat setting', 'setp'], ['bedroom_trv', 'Dial on the bedroom radiator']]],
    ['Walls, roof and windows', [['wall_insulation', 'Wall insulation'], ['loft', 'Loft'], ['glazing', 'Glazing'], ['windows_open', 'Windows that open'], ['damp', 'Damp or mould in the last year', 'multi']]],
    ['The bedroom', [['bedroom_facing', 'Bedroom window faces'], ['bedroom_side', 'Bedroom side of the home']]]
  ];
  function tallyHome(list, key, kind) {
    const m = new Map(), add = k => m.set(k, (m.get(k) || 0) + 1);
    let med = null;
    const vals = [];
    list.forEach(p => {
      const h = homeOf(p) || {};
      if (kind === 'p') { const v = p[key]; if (v === null || v === undefined || v === '') add(NOT_ANSWERED); else add(String(v)); return; }
      if (kind === 'age') { const b = ageBand(p.birth_year); add(b || NOT_ANSWERED); return; }
      if (!Object.prototype.hasOwnProperty.call(h, key)) { if (key === 'flat_position' && h.home_type !== 'flat') return; add(NOT_ANSWERED); return; }
      const v = h[key];
      if (kind === 'multi') { const a = [...new Set(listOf(v))]; if (!a.length) add(NOT_ANSWERED); a.forEach(x => add(String(x))); return; }
      if (kind === 'area' || kind === 'setp') { const n = num(v); if (n === null) { add(NOT_SURE); return; } vals.push(n); add(kind === 'area' ? areaBand(n) : setBand(n)); return; }
      if (v === null || v === undefined || v === '') { if (key === 'flat_position' && h.home_type !== 'flat') return; add(NOT_ANSWERED); return; }
      add(String(v));   // 0 counts (bedroom_share 0 = "Just me")
    });
    if (vals.length) med = median(vals);
    const group = kind === 'area' ? 'floor_area' : kind === 'setp' ? 'setpoint' : key;
    let out = [...m.entries()].map(([k, n]) => ({ k, n, label: lab(group, k) }));
    const order = L[group] ? Object.keys(L[group]) : null;
    const rank = k => k === NOT_SURE ? 1e4 : k === NOT_ANSWERED ? 1e5 : order ? (order.indexOf(k) + 1 || 999) : 0;
    out.sort((a, b) => rank(a.k) - rank(b.k) || (order ? 0 : b.n - a.n));
    return { out, med, nVals: vals.length };
  }
  function homesHtml() {
    const approved = st.people.filter(p => dbStale() || p.approved);
    const list = approved;
    const withHome = approved.filter(p => homeOf(p) && Object.keys(homeOf(p)).length).length;
    const waitN = st.people.length - approved.length;
    const sub = `${plural(list.length, 'approved participant')} · ${fmtN(withHome)} with a home profile${waitN ? ' · ' + plural(waitN, 'person', 'people') + ' waiting are not included' : ''} · shares are of participants; where several answers are allowed they add up to more than 100%`;
    if (!list.length) return `<section class="charts" style="grid-template-columns:minmax(0,1fr)">${fig('homes', 'Home profiles', esc(sub), '<p class="tnote">No approved participants yet.</p>', { wide: true })}</section>`;
    const tRows = [];
    const groups = HOME_GROUPS.map(([gt, keys]) => {
      const blocks = keys.map(([key, title, kind]) => {
        const t = tallyHome(list, key, kind);
        const of = key === 'flat_position' ? t.out.reduce((s, x) => s + x.n, 0) : list.length;
        t.out.forEach(x => tRows.push([esc(gt), esc(title), esc(x.label), fmtN(x.n), pct(x.n, of)]));
        const unit = kind === 'p' || kind === 'age' ? 'person' : 'home';
        const items = t.out.map(x => Object.assign({}, x, { colour: x.k === NOT_ANSWERED || x.k === NOT_SURE ? 'var(--ink-muted)' : null }));
        const medTxt = t.med !== null ? `<p class="med">Median ${kind === 'area' ? fmtN(Math.round(t.med)) + ' m²' : round1(t.med) + ' °C'} · ${fmtN(t.nVals)} answered</p>` : '';
        return `<div><h3>${esc(title)}${kind === 'multi' ? '<small>several answers</small>' : ''}</h3>${t.out.length ? hbars(items, of, { unit }) : '<p class="tnote">Not asked</p>'}${medTxt}</div>`;
      }).join('');
      return `<details class="hgroup" open><summary>${esc(gt)}</summary><div class="hgrid">${blocks}</div></details>`;
    }).join('');
    return `<section class="charts" style="grid-template-columns:minmax(0,1fr)">${fig('homes', 'Home profiles', esc(sub), groups, { wide: true, table: tbl(['Section', 'Question', 'Answer', 'Count', 'Share'], tRows, 3) })}</section>`;
  }

  /* ---------------------------------------------------------------- participant page */
  function pinWords(code) {
    if (st.pins === null || st.pins === undefined) return st.local ? '' : 'Unknown (could not be read)';
    const x = st.pinsBy.get(code);
    if (!x) return 'No PIN yet · no devices';
    const last = Date.parse(x.last_seen);
    return (x.locked ? 'Locked after wrong PINs' : x.pin_set ? 'PIN set' : 'No PIN yet (set at the next sign-in)') + ' · ' + plural(num(x.devices) || 0, 'device') + (isFinite(last) ? ' · last used ' + ago(last) : '');
  }
  function reminderWords(code) {
    if (st.local) return '';
    if (st.push === null) return 'Unknown (could not be read)';
    const phones = st.pushBy.get(code) || [];
    if (!phones.length) return 'No phone registered';
    const on = phones.filter(ph => ph.enabled !== false);
    const pu = pausedOf(code);
    if (!on.length) return 'Off · ' + plural(phones.length, 'phone');
    return (pu ? 'Paused until ' + fmtStamp(new Date(pu).toISOString()) : 'On') + ' · ' + plural(on.length, 'phone') + (on.length < phones.length ? ' (' + (phones.length - on.length) + ' off)' : '');
  }
  function homeValue(h, key, kind) {
    if (!h || !Object.prototype.hasOwnProperty.call(h, key)) return '';
    const v = h[key];
    if (kind === 'multi') { const a = listOf(v); return a.length ? a.map(x => lab(key, x)).join(', ') : ''; }
    if (kind === 'area') { const n = num(v); return n === null ? 'Not sure' : fmtN(Math.round(n)) + ' m²'; }
    if (kind === 'setp') { const n = num(v); return n === null ? 'Not sure / no thermostat' : (Math.round(n * 2) / 2).toFixed(1) + ' °C'; }
    if (v === null || v === undefined || v === '') return '';
    const deg = num(h[key + '_deg']);
    return lab(key, v) + (deg !== null ? ' (' + deg + '°)' : '');
  }
  function profileHtml(ctx) {
    const code = ctx.sel, p = ctx.p;
    if (!p) return `<div class="notice"><div>No profile is stored for <b>${esc(code)}</b>. ${st.local ? 'Local mode shows only the check-ins kept in this browser.' : 'It may be test data, or the participant was removed (their check-ins are kept under the code).'}</div></div>`;
    const age = num(p.birth_year) ? new Date().getFullYear() - num(p.birth_year) : null;
    const f = (k, v, dim) => `<div><span>${esc(k)}</span><b${dim ? ' class="dim"' : ''}>${v === '' || v === null || v === undefined ? '–' : v}</b></div>`;
    const last = (st.rowsBy.get(code) || [])[0];
    const status = dbStale() ? '<i class="status-wait">Unknown until the database is updated</i>' : p.approved ? '<i class="status-ok">Approved</i>' : '<i class="status-wait">Waiting for approval</i>';
    const colour = num(p.alias_colour) !== null ? RUNNER[num(p.alias_colour) % RUNNER.length] : null;
    const facts = [
      f('Name', esc(p.name)), f('Email', p.email ? `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : ''), f('Code', `<code>${esc(code)}</code>`),
      f('Bay Race alias', p.alias ? (colour ? `<span class="dot" style="background:${colour}"></span>` : '') + esc(p.alias) : ''),
      f('Status', status), f('Registered', esc(fmtStamp(p.created_at))), f('Profile updated', esc(fmtStamp(p.updated_at)), true), f('Team notified', p.notified_at ? esc(fmtStamp(p.notified_at)) : 'Not yet', true),
      f('PIN and devices', esc(pinWords(code))), f('Reminders', esc(reminderWords(code))),
      f('Bay Race', p.race_hidden ? 'Hidden from others (sees their own place)' : 'Shown'), f('Last check-in', last ? esc(ago(last.t) + ' (' + fmtStamp(last.r.ts) + ')') : 'None yet'),
      f('Gender', esc(lab('gender', p.gender))), f('Age', age !== null ? String(age) : ''), f('Height', num(p.height_cm) !== null ? round1(num(p.height_cm)) + ' cm' : ''), f('Weight', num(p.weight_kg) !== null ? round1(num(p.weight_kg)) + ' kg' : ''),
      f('Thermal sensitivity', esc(lab('sensitivity', p.sensitivity)))
    ].join('');
    const actions = (st.local || dbStale()) ? '' : `<div class="pact" data-errhost>${p.approved ? '' : `<button class="btn sm" type="button" data-act="approve" data-code="${esc(code)}">Approve</button>`}<button class="btn ghost sm" type="button" data-act="pinreset" data-code="${esc(code)}">${icon('key')}Reset PIN</button><button class="btn ghost sm" type="button" data-act="devout" data-code="${esc(code)}">${icon('out')}Sign out devices</button><button class="btn ghost sm danger" type="button" data-act="remove" data-code="${esc(code)}">Remove from the study</button>
      <span class="hint">${p.approved ? 'Reset PIN lets them choose a new PIN at their next sign-in (their devices keep working). Sign out devices makes every phone ask for the email and PIN again. Remove deletes the profile, PIN, devices and reminder phones; the check-ins already submitted are kept under the code.' : 'They cannot check in until approved. Remove anyone you do not recognise; nothing they submitted is lost.'}</span></div>`;
    const h = homeOf(p);
    const home = h && Object.keys(h).length ? `<div class="homedl">${HOME_GROUPS.slice(1).map(([gt, keys]) => { const items = keys.map(([key, title, kind]) => { const v = homeValue(h, key, kind); return v ? `<dt>${esc(title)}</dt><dd>${esc(v)}</dd>` : ''; }).join(''); return items ? `<section><h3>${esc(gt)}</h3><dl>${items}</dl></section>` : ''; }).join('')}</div>${Object.keys(h).filter(k => !HOME_KEYS.includes(k)).length ? `<p class="tnote">Other stored answers: ${esc(Object.keys(h).filter(k => !HOME_KEYS.includes(k)).map(k => k + ' = ' + (Array.isArray(h[k]) ? h[k].join('|') : typeof h[k] === 'object' ? JSON.stringify(h[k]) : h[k])).join(' · '))}</p>` : ''}`
      : '<p class="tnote">No home profile yet. The app asks for it before their next check-in.</p>';
    const pts = ['week', 'month', 'all'].map(k => { const rows = pointsRows(k); const me = rows && rows.find(r => r.code === code); const t = targetOf(k);
      return `<div><span>${k === 'week' ? 'This week' : k === 'month' ? 'This month' : 'All time'}</span><b>${me ? fmtN(me.points) : '–'}</b><small>${me ? (me.points ? ordinal(me.rank) + ' of ' + rows.length + ' · ' : '') + plural(num(me.goal_days) || 0, 'goal day') + (t ? ' · ' + pct(me.points, t) + ' of target' : '') : rows ? 'not in the table' : 'not loaded'}</small></div>`; }).join('');
    return `<section class="profile" aria-label="Profile of ${esc(code)}">
      <div class="facts">${facts}</div>${actions}
      ${st.local ? '' : `<div><h2 style="margin-bottom:8px">Points</h2><div class="pts3">${pts}</div></div>`}
      <div><h2 style="margin-bottom:8px">Home profile</h2>${home}</div></section>`;
  }

  /* ---------------------------------------------------------------- check-ins table */
  const cell = v => Array.isArray(v) ? v.join('|') : v === null || v === undefined ? '' : typeof v === 'boolean' ? (v ? 'yes' : 'no') : typeof v === 'object' ? JSON.stringify(v) : String(v);
  function tableHtml(ctx) {
    const list = ctx.V.length ? ctx.V : ctx.all;
    const shown = list.slice(0, TABLE_CAP);
    const body = shown.map(x => '<tr>' + TABLE_COLS.map(c => {
      if (c === 'tsv' && x.tsv !== null) return `<td class="tsv n"><span class="dot" style="background:${tsvColour(x.tsv)}"></span>${esc(cell(x.r.tsv))}<span class="sr"> ${esc(tsvWord(x.tsv))}</span></td>`;
      return `<td${NUM_COLS.has(c) ? ' class="n"' : ''}${x.sane || c !== 'ts' ? '' : ' style="color:var(--bad)"'}>${esc(cell(x.r[c]))}</td>`;
    }).join('') + '</tr>').join('');
    const words = ctx.V.length ? rangeWords() : 'all dates';
    return `<section aria-labelledby="ctTitle"><div class="sect-h"><h2 id="ctTitle">Check-ins, newest first</h2><span class="tnote">${list.length > shown.length ? `Showing the latest ${fmtN(shown.length)} of ${fmtN(list.length)} in ${esc(words)}.` : plural(list.length, 'check-in') + ' in ' + esc(words) + '.'} Stored ids as in the downloads; the downloads have every check-in and every column.</span></div>
      <div class="tablewrap" tabindex="0" role="region" aria-labelledby="ctTitle"><table><thead><tr>${TABLE_COLS.map(c => `<th scope="col"${NUM_COLS.has(c) ? ' class="n"' : ''}>${c}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div></section>`;
  }

  /* ================================================================ downloads */
  const fileBase = () => 'switch-comfort-' + (st.sel === 'ALL' ? 'all' : st.sel) + (st.local ? '-local' : '') + '-' + dnKey(todayDn());
  function saveBlob(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
  const exportRows = () => st.sel === 'ALL' ? st.R : (st.rowsBy.get(st.sel) || []);
  /* every column the rows carry: the known ones in order, then anything new */
  function colsOf(list) {
    const extra = new Set();
    list.forEach(x => Object.keys(x.r || {}).forEach(k => { if (!COLS.includes(k) && !LEGACY_COLS.includes(k)) extra.add(k); }));
    return [...COLS, ...LEGACY_COLS, ...[...extra].sort()];
  }
  /* CSV: RFC 4180 quoting, a BOM so Excel reads UTF-8, and text that Excel would run as a formula (= + - @, tab,
   * carriage return at the start) is prefixed with an apostrophe. Real numbers are written as they are. */
  function csvCell(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
    let s = cell(v);
    if (/^[\s]*[=+\-@\t\r]/.test(s) && !/^[+-]?\d+(\.\d+)?$/.test(s.trim())) s = "'" + s;
    return /[",\r\n]/.test(s) || /^\s|\s$/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function downloadCsv() {
    const list = exportRows(), cols = colsOf(list);
    const lines = [cols.join(','), ...list.map(x => cols.map(c => csvCell(x.r[c])).join(','))];
    saveBlob(new Blob(['﻿' + lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' }), fileBase() + '.csv');
    toast('CSV downloaded', plural(list.length, 'check-in') + ', all dates, ' + cols.length + ' columns');
  }
  /* Excel cells: numbers stay numbers (so they sum and sort), lists joined with "|", yes/no for true/false */
  const xv = (v, isNum) => {
    if (Array.isArray(v)) return v.join('|');
    if (v === null || v === undefined || v === '') return undefined;
    if (typeof v === 'boolean') return v ? 'yes' : 'no';
    if (isNum) { const n = num(v); return n === null ? String(v) : n; }
    if (typeof v === 'object') return JSON.stringify(v);
    return v;
  };
  const voteObj = (x, cols) => { const o = {}; cols.forEach(c => { o[c] = xv(x.r[c], NUM_COLS.has(c)); }); return o; };
  const DERIVED = ['check_ins', 'last_check_in', 'pin_set', 'pin_locked', 'devices', 'devices_last_seen', 'phones', 'phones_on', 'paused_until', 'points_week', 'points_month', 'points_all_time'];
  function personObj(p, extraP, extraH) {
    const o = {}, code = String(p.code).toUpperCase();
    PCOLS.forEach(c => { o[c] = xv(p[c], PNUM.has(c)); });
    extraP.forEach(c => { o[c] = xv(p[c], typeof p[c] === 'number'); });
    const rows = st.rowsBy.get(code) || [];
    o.check_ins = rows.length;
    o.last_check_in = rows[0] ? rows[0].r.ts : undefined;
    const pin = st.pinsBy.get(code);
    if (st.pins) { o.pin_set = pin ? (pin.pin_set ? 'yes' : 'no') : 'no'; o.pin_locked = pin && pin.locked ? 'yes' : 'no'; o.devices = pin ? num(pin.devices) || 0 : 0; o.devices_last_seen = pin && pin.last_seen ? pin.last_seen : undefined; }
    if (st.push) { const ph = st.pushBy.get(code) || []; o.phones = ph.length; o.phones_on = ph.filter(x => x.enabled !== false).length; const pu = pausedOf(code); o.paused_until = pu ? new Date(pu).toISOString() : undefined; }
    ['week', 'month', 'all'].forEach(k => { const rr = pointsRows(k); const me = rr && rr.find(r => r.code === code); o['points_' + (k === 'all' ? 'all_time' : k)] = me ? me.points : undefined; });
    const h = homeOf(p) || {};
    HOME_KEYS.forEach(k => { o[k] = k === 'postcode_area' ? (h[k] == null || h[k] === '' ? undefined : String(h[k])) : xv(h[k], HOME_NUM.has(k)); });
    extraH.forEach(k => { o[k] = xv(h[k], typeof h[k] === 'number'); });
    return o;
  }
  function sheet(objs, header) {
    const ws = window.XLSX.utils.json_to_sheet(objs, { header });
    ws['!cols'] = header.map(c => ({ wch: Math.max(10, Math.min(40, c.length + 2)) }));
    return ws;
  }
  function labelsSheet() {
    const out = [];
    Object.keys(L).forEach(g => { if (['age', 'floor_area', 'setpoint'].includes(g)) return; Object.keys(L[g]).forEach(k => out.push({ field: g, id: k, label: L[g][k] })); });
    return out;
  }
  function downloadXlsx() {
    if (!window.XLSX) { alert('The spreadsheet library did not load. Check the connection and reload the page, or use Download CSV.'); return; }
    const X = window.XLSX, wb = X.utils.book_new();
    const used = new Set();
    const name = n => { let s = String(n).replace(/[\\/?*[\]:]/g, '_').slice(0, 31) || 'Sheet'; let i = 2; while (used.has(s.toLowerCase())) s = String(n).slice(0, 28) + '_' + i++; used.add(s.toLowerCase()); return s; };
    const list = exportRows(), cols = colsOf(list);
    const extraP = new Set(), extraH = new Set();
    st.people.forEach(p => { Object.keys(p).forEach(k => { if (!PCOLS.includes(k) && k !== 'home' && !DERIVED.includes(k)) extraP.add(k); }); Object.keys(homeOf(p) || {}).forEach(k => { if (!HOME_KEYS.includes(k)) extraH.add(k); }); });
    const pHeader = [...PCOLS, ...extraP, ...DERIVED, ...HOME_KEYS, ...extraH];
    const pointsSheet = () => {
      const keys = ['week', 'month', 'all'], byCode = new Map();
      keys.forEach(k => { const rows = pointsRows(k); if (rows) rows.forEach(r => { if (!byCode.has(r.code)) byCode.set(r.code, { code: r.code, alias: r.alias || (person(r.code) || {}).alias, race_hidden: r.race_hidden ? 'yes' : 'no' }); const o = byCode.get(r.code), s = k === 'all' ? 'all_time' : k; o[s + '_rank'] = r.rank; o[s + '_points'] = r.points; o[s + '_checkins'] = num(r.checkins); o[s + '_counted'] = num(r.counted); o[s + '_goal_days'] = num(r.goal_days); o[s + '_full_weeks'] = num(r.full_weeks); }); });
      const per = pointsPeriods();
      const header = ['code', 'alias', 'race_hidden']; keys.forEach(k => { const s = k === 'all' ? 'all_time' : k; header.push(s + '_rank', s + '_points', s + '_checkins', s + '_counted', s + '_goal_days', s + '_full_weeks'); });
      return { rows: [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })), header, note: 'week ' + dnKey(per.week.from) + ' to ' + dnKey(per.week.to) + '; month ' + dnKey(per.month.from) + ' to ' + dnKey(per.month.to) + '; all time from ' + dnKey(per.all.from) };
    };
    if (st.sel === 'ALL') {
      if (st.people.length) X.utils.book_append_sheet(wb, sheet(st.people.map(p => personObj(p, [...extraP], [...extraH])), pHeader), name('Participants'));
      X.utils.book_append_sheet(wb, sheet(list.map(x => voteObj(x, cols)), cols), name('All'));
      if (!st.local) { const ps = pointsSheet(); if (ps.rows.length) { const ws = sheet(ps.rows, ps.header); X.utils.sheet_add_aoa(ws, [['Periods: ' + ps.note]], { origin: -1 }); X.utils.book_append_sheet(wb, ws, name('Points')); } }
      st.entries.forEach(e => { if (e.rows.length) X.utils.book_append_sheet(wb, sheet(e.rows.map(x => voteObj(x, cols)), cols), name(e.code)); });
    } else {
      const p = person(st.sel);
      if (p) X.utils.book_append_sheet(wb, sheet([personObj(p, [...extraP], [...extraH])], pHeader), name('Profile'));
      X.utils.book_append_sheet(wb, sheet(list.map(x => voteObj(x, cols)), cols), name(st.sel));
    }
    X.utils.book_append_sheet(wb, sheet(labelsSheet(), ['field', 'id', 'label']), name('Labels'));
    X.writeFile(wb, fileBase() + '.xlsx');
    toast('Excel workbook downloaded', plural(list.length, 'check-in') + ', all dates');
  }

  /* ================================================================ events */
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-act]');
    if (!b) return;
    const act = b.getAttribute('data-act'), code = b.getAttribute('data-code');
    if (act === 'sel') {
      if (code !== st.sel) { st.sel = code; rerenderMain(true); }
      const m = $('#main'); if (m && (window.innerWidth <= 900 || !b.closest('aside'))) m.scrollIntoView(); else window.scrollTo(0, 0);
      return;
    }
    if (act === 'home') { st.sel = 'ALL'; dataView({ focusMain: true }); return; }
    if (act === 'pf') { st.pf = b.getAttribute('data-v'); renderList(); const el = $('[data-fk="pf-' + cssId(st.pf) + '"]'); if (el) el.focus({ preventScroll: true }); return; }
    if (act === 'range') { st.range = b.getAttribute('data-v'); LS.set('switch_dash_range', st.range); rerenderMain(); return; }
    if (act === 'hm') { st.hm = b.getAttribute('data-v') === 'tsv' ? 'tsv' : 'n'; LS.set('switch_dash_hm', st.hm); rerenderMain(); return; }
    if (act === 'pp') { st.pp = b.getAttribute('data-v'); rerenderMain(); return; }
    if (act === 'table') {
      const id = b.getAttribute('data-id'), open = !st.tables.has(id);
      if (open) st.tables.add(id); else st.tables.delete(id);
      $('#cv-' + id).hidden = open; $('#tb-' + id).hidden = !open;
      b.textContent = open ? 'Chart' : 'Table';
      if (!open && $('[data-pending]', $('#cv-' + id))) drawCharts();
      hideTip(); return;
    }
    if (act === 'refresh') { if (st.local) openLocal(); else { b.disabled = true; loadData(true); } return; }
    if (act === 'retry') { loadData(); return; }
    if (act === 'relogin') { expiredLogin(); return; }
    if (act === 'csv') { downloadCsv(); return; }
    if (act === 'xlsx') { downloadXlsx(); return; }
    if (act === 'approve') { approve(code, b); return; }
    if (act === 'remove') { remove(code, b); return; }
    if (act === 'pinreset') { resetPin(code, b); return; }
    if (act === 'devout') { signOutDevices(code, b); return; }
    if (act === 'signout') { signOut(); return; }
    if (act === 'pw') { changePassword(b); return; }
  });
  document.addEventListener('input', e => { if (e.target && e.target.id === 'psearch') { st.q = e.target.value; renderList(); } });

  /* ================================================================ start */
  if (S.live && session.token) { if (session.expired() && !session.refresh) expiredLogin(); else loadData(); }
  else loginView();
})();
