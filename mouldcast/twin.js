/* MouldCast - the digital twin engine (demo mode). Shared by the resident app (app/) and the housing team view
 * (staff/); loaded after config.js. Exposes window.TWIN.
 *
 * In the study each home's twin is fed by its sensors and the forecasts come from the physics-informed model on
 * the Digital Twin platform. Until that backend exists, this file plays every part on the device:
 *  - the homes: a BIM-like description of rooms and monitored surfaces (construction, material, VTT sensitivity
 *    class, how cold the surface runs: its temperature factor f), the household's routine and the heating;
 *  - eight weeks of hourly "sensor" data and the coming week's expected conditions, from a simple heat and
 *    moisture balance of each room driven by UK winter weather (there is a cold, damp spell in the coming days);
 *  - the VTT mould index of every surface (Hukka and Viitanen 1999, Ojanen et al. 2011; RES3 Appendix D),
 *    integrated hour by hour from the surface temperature and surface relative humidity;
 *  - the 7-day forecast with a range (an ensemble of weather, moisture and air-to-surface error), and
 *  - what drives each forecast: the same week re-run with one driver changed at a time (a stand-in for the
 *    SHAP attributions of the live model).
 * Everything is seeded and anchored to the current hour, so a page shows the same numbers until the hour turns.
 * The physics is deliberately simple: it only has to behave like a real home so the app can be designed around it. */
(function(root){
'use strict';
const HOUR = 3600e3;
const PAST_DAYS = 56, FC_DAYS = 7;
const NP = PAST_DAYS * 24, NF = FC_DAYS * 24, N = NP + NF + 1;   // hours in the record; index NP is "now"
const BUFFER = 1.8;                                               // furnishings and plaster soak up and give back moisture: slower swings

/* ---------- small helpers ---------- */
function rng(seed){ let s = (seed >>> 0) || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }
function hash(str){ let h = 2166136261; for(let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; }
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const gauss = r => { let s = 0; for(let i = 0; i < 6; i++) s += r(); return (s - 3) / Math.SQRT2; };   // roughly N(0,1)

/* ---------- moist air ---------- */
const psat = T => 610.94 * Math.exp(17.625 * T / (T + 243.04));          // saturation vapour pressure, Pa (Magnus)
const vOf = (pv, T) => pv / (461.5 * (T + 273.15)) * 1000;                // vapour density, g/m3
const pvOf = (v, T) => v / 1000 * 461.5 * (T + 273.15);                   // vapour pressure, Pa
const dewPoint = pv => { const a = Math.log(pv / 610.94); return 243.04 * a / (17.625 - a); };

/* ---------- the VTT mould index (RES3 Appendix D, Table C1) ---------- */
const CLASSES = {
  vs: { id:'vs', name:'Very sensitive',   eg:'untreated wood',                                  k1a:1,     k1b:2,     A:1,   B:7, C:2,   RHmin:80, Cmat:1 },
  s:  { id:'s',  name:'Sensitive',        eg:'paper-faced board, wallpaper, wood-based boards', k1a:0.578, k1b:0.386, A:0.3, B:6, C:1,   RHmin:80, Cmat:0.5 },
  mr: { id:'mr', name:'Medium resistant', eg:'plaster, cement, paints, mineral fibre',          k1a:0.072, k1b:0.097, A:0,   B:5, C:1.5, RHmin:85, Cmat:0.25 },
  r:  { id:'r',  name:'Resistant',        eg:'glass, metal, tiles',                             k1a:0.033, k1b:0.014, A:0,   B:3, C:1.5, RHmin:85, Cmat:0.1 }
};
/* the surface humidity above which mould can grow at temperature T (C.1) */
function rhCrit(T, c){ return T <= 20 ? Math.max(-0.00267 * T * T * T + 0.160 * T * T - 3.13 * T + 100, c.RHmin) : c.RHmin; }
/* one hour of the index: growth (C.2 to C.4) when the surface is warm and humid enough, decline (C.5, C.6) when not.
 * st = { M, dry } where dry counts the hours since conditions were last favourable. Returns true when favourable. */
function vttStep(st, T, RH, c){
  const RHc = rhCrit(T, c);
  if(T > 0 && T < 50 && RH >= RHc && RHc < 100){
    const x = (RH - RHc) / (100 - RHc), mmax = c.A + c.B * x - c.C * x * x;
    const k1 = st.M < 1 ? c.k1a : c.k1b, k2 = Math.max(1 - Math.exp(2.3 * (st.M - mmax)), 0);
    st.M += k1 * k2 / (7 * Math.exp(-0.68 * Math.log(T) - 13.9 * Math.log(RH) + 66.02)) / 24;   // W = 0, SQ = 0; the rate is per day
    st.dry = 0;
    return true;
  }
  st.dry += 1;
  st.M = Math.max(0, st.M + (st.dry <= 6 ? -0.00133 : st.dry <= 24 ? 0 : -0.000667) * c.Cmat);
  return false;
}
/* Table 2.1: what each index means on the surface */
const STAGES = [
  { m:0, t:'No growth' },
  { m:1, t:'Small amounts of mould, seen only under a microscope' },
  { m:2, t:'Several small colonies, seen only under a microscope' },
  { m:3, t:'Visible mould, less than 10% of the surface' },
  { m:4, t:'Visible mould, 10 to 50% of the surface' },
  { m:5, t:'Visible mould, more than 50% of the surface' },
  { m:6, t:'Heavy, dense growth over the whole surface' }
];
const stageOf = M => STAGES[clamp(Math.floor(M + 1e-9), 0, 6)];
/* the four levels the app shows, from the index expected at the end of the coming week */
const LEVELS = [
  { id:'low',   n:'Low',     cls:'lv-low',   t:'No growth expected',                    max:1 },
  { id:'watch', n:'Watch',   cls:'lv-watch', t:'Early growth possible, not visible',     max:2 },
  { id:'high',  n:'High',    cls:'lv-high',  t:'Growth likely, not yet visible',         max:3 },
  { id:'act',   n:'Act now', cls:'lv-act',   t:'Visible mould likely',                  max:Infinity }
];
const levelOf = M => LEVELS.findIndex(l => M < l.max);

/* ---------- the homes ---------- */
/* One template for every demo home: a two-bedroom flat of the 1960s with solid brick walls and six monitored
 * surfaces chosen from a thermal imaging survey. f is the surface's temperature factor (1 = as warm as the room,
 * 0 = as cold as outside): corners, reveals and walls behind furniture run cold. "sensor" names the surface sensor;
 * null means the surface is estimated by the twin from the room air (RES3 Gap 4). */
const ROOMS = [
  { id:'living',  name:'Living room',     icon:'sofa', V:42, set:20,   setGood:20, n:0.6,  Tfree:5.5, sensor:'A1' },
  { id:'kitchen', name:'Kitchen',         icon:'pan',  V:22, set:19,   setGood:19, n:0.6,  Tfree:5.5, hood:true, sensor:'A2' },
  { id:'bed1',    name:'Main bedroom',    icon:'bed',  V:30, set:16.5, setGood:18, n:0.45, Tfree:4.5, bedroom:true, sensor:'A3' },
  { id:'bed2',    name:"Child's bedroom", icon:'bed',  V:22, set:17.5, setGood:18, n:0.55, Tfree:4.5, bedroom:true, sensor:'A4' },
  { id:'bath',    name:'Bathroom',        icon:'bath', V:11, set:20,   setGood:20, n:0.7,  Tfree:5.5, sensor:'A5' }
];
const SURFACES = [
  { id:'bed1-corner',  room:'bed1',    name:'Corner behind the wardrobe', where:'North-east corner of the outside walls, behind the wardrobe',
    element:'External wall corner (a thermal bridge)', material:'Wallpaper on plaster, solid brick', cls:'s',  f:0.58, furniture:'the wardrobe', bridge:true, sensor:'S1', M0:2.66, demoNow:2.968 },
  { id:'bed1-window',  room:'bed1',    name:'Window reveal', where:'Plaster beside and above the window, under the concrete lintel',
    element:'Window reveal and lintel', material:'Painted plaster', cls:'mr', f:0.6, bridge:true, sensor:'S2', M0:0.7 },
  { id:'bed2-wall',    room:'bed2',    name:'Wall behind the bed', where:'Outside wall behind the head of the bed',
    element:'External wall', material:'Painted plasterboard on dabs', cls:'s', f:0.69, furniture:'the bed', sensor:null, M0:1.25 },
  { id:'bath-ceiling', room:'bath',    name:'Ceiling corner', where:'Where the ceiling meets the outside wall, above the shower',
    element:'Ceiling and external wall junction', material:'Painted plaster', cls:'mr', f:0.66, bridge:true, sensor:'S3', M0:0.9 },
  { id:'living-window',room:'living',  name:'Window reveal and sill', where:'Plaster reveal and the sill of the front window',
    element:'Window reveal', material:'Painted plaster', cls:'mr', f:0.64, bridge:true, sensor:'S4', M0:0.3 },
  { id:'kitchen-wall', room:'kitchen', name:'Wall behind the fridge', where:'Outside wall behind the fridge freezer',
    element:'External wall', material:'Painted plaster', cls:'mr', f:0.7, furniture:'the fridge', sensor:null, M0:0.2 }
];
const HOME_TEMPLATE = {
  type:'2-bedroom ground-floor flat', built:'1960s', walls:'Solid brick, 225 mm, no wall insulation',
  windows:'Double glazed (uPVC) with trickle vents', heating:'Gas combi boiler, radiators with thermostatic valves',
  ventilation:'Kitchen cooker hood, bathroom extractor fan', heat:[[6.5, 8.5], [17, 22.5]], heatGood:[[6, 9], [16, 23]]
};
/* The portfolio of demo homes. H03 is the resident app's home. Each home varies the template: the household,
 * how warm it is kept, drying washing indoors, a broken bathroom fan, colder or warmer surfaces, and where each
 * surface's index stood eight weeks ago (M0s sets it for a surface, so homes differ in which surface is worst). */
const PORTFOLIO = [
  { id:'H01', name:'Flat 1, Block A', adults:1, children:0, setAdj:1.5, nMul:1.1, drying:[], fan:'ok',     fAdj:0.04, M0Mul:0.4 },
  { id:'H02', name:'Flat 2, Block A', adults:2, children:2, setAdj:0,   nMul:0.9, drying:[1,3,5,6], fan:'ok', fAdj:-0.01, M0Mul:0.9, M0s:{ 'bed2-wall':2.45, 'bed1-corner':1.5 } },
  { id:'H03', name:'Flat 3, Block A', adults:2, children:1, setAdj:0,   nMul:1,   drying:[1,4,6], fan:'broken', fAdj:0,  M0Mul:1, demo:true },
  { id:'H04', name:'Flat 4, Block A', adults:2, children:0, setAdj:1,   nMul:1.2, drying:[6], fan:'ok',     fAdj:0.02, M0Mul:0.5, M0s:{ 'living-window':1.4 } },
  { id:'H05', name:'Flat 1, Block B', adults:1, children:2, setAdj:-1.5,nMul:0.85,drying:[0,2,4,6], fan:'broken', fAdj:-0.02, M0Mul:1.05, M0s:{ 'bed1-corner':2.1 } },
  { id:'H06', name:'Flat 2, Block B', adults:2, children:3, setAdj:-0.5,nMul:0.85,drying:[1,2,3,4,5], fan:'ok', fAdj:-0.03, M0Mul:1.1 },
  { id:'H07', name:'Flat 3, Block B', adults:1, children:0, setAdj:2,   nMul:1.3, drying:[], fan:'none',   fAdj:0.05, M0Mul:0.2 },
  { id:'H08', name:'Flat 4, Block B', adults:2, children:1, setAdj:-1,  nMul:1,   drying:[2,5], fan:'broken', fAdj:0,  M0Mul:0.8, M0s:{ 'bath-ceiling':2.3, 'bed1-corner':1.6 } }
];
function homeDef(p){
  const r = rng(hash('home:' + p.id));
  const h = Object.assign({}, HOME_TEMPLATE, p);
  h.household = [p.adults + (p.adults === 1 ? ' adult' : ' adults'), p.children ? p.children + (p.children === 1 ? ' child' : ' children') : ''].filter(Boolean).join(', ');
  h.ventilation = 'Kitchen cooker hood' + (p.fan === 'none' ? ', no bathroom fan' : p.fan === 'broken' ? ', bathroom extractor fan (not working)' : ', bathroom extractor fan');
  h.rooms = ROOMS.map(rm => Object.assign({}, rm, { set: rm.set + p.setAdj * (rm.bedroom ? 1 : .6), n: rm.n * p.nMul }))
    .filter(rm => rm.id !== 'bed2' || p.adults + p.children > 1);
  const roomIds = h.rooms.map(rm => rm.id);
  h.surfaces = SURFACES.filter(s => roomIds.includes(s.room)).map(s => {
    const jit = p.demo ? 0 : (r() - .5) * .04, m0 = p.demo ? s.M0 : p.M0s && p.M0s[s.id] != null ? p.M0s[s.id] : Math.max(0, s.M0 * p.M0Mul + (r() - .5) * .4);
    return Object.assign({}, s, { f: clamp(s.f + p.fAdj + jit, .4, .95), M0: m0, Mnow: p.demo ? s.demoNow : undefined });
  });
  return h;
}
const HOMES = PORTFOLIO.map(homeDef);
const homeById = id => HOMES.find(h => h.id === id) || null;

/* ---------- the record: hours, weather ---------- */
const floorHour = t => Math.floor(t / HOUR) * HOUR;
/* Outdoor temperature and humidity for every hour of the record. A cold, damp spell sits over the coming days
 * (the "normal" series leaves it out: the weather what-if). */
function weather(t0){
  const r = rng(hash('wx:' + t0));
  const Te = new Float64Array(N), RHe = new Float64Array(N), TeN = new Float64Array(N), RHeN = new Float64Array(N), hod = new Uint8Array(N), dow = new Uint8Array(N);
  let a = 0, b = 0;
  for(let i = 0; i < N; i++){
    const d = new Date(t0 + i * HOUR), day = (i - NP) / 24, h = d.getHours();
    hod[i] = h; dow[i] = d.getDay();
    a = .93 * a + .37 * gauss(r); b = .9 * b + .9 * gauss(r);
    const spell = Math.exp(-Math.pow((day - 3.2) / 2.6, 2)) + .45 * Math.exp(-Math.pow((day + 19) / 3, 2));
    const mean = 7.4 + 1.6 * Math.sin(2 * Math.PI * day / 9.3 + 1.1) + 1.0 * Math.sin(2 * Math.PI * day / 4.1 + .3);
    const diur = -2.4 * Math.cos(2 * Math.PI * (h - 15) / 24);
    TeN[i] = mean + diur + a; Te[i] = TeN[i] - 4.6 * spell;
    RHeN[i] = clamp(85 - 7.5 * Math.cos(2 * Math.PI * (h - 15) / 24) + b, 55, 99); RHe[i] = clamp(RHeN[i] + 5 * spell, 55, 99);
  }
  return { Te, RHe, TeN, RHeN, hod, dow };
}

/* ---------- the household's routine: moisture released in each room, g per hour ---------- */
function moisture(home, rm, h, dw, k){
  const A = home.adults, C = home.children, wkend = dw === 0 || dw === 6;
  let g = 0;
  if(rm.id === 'bed1' && (h >= 23 || h < (wkend ? 8 : 7))) g += A * 30;
  if(rm.id === 'bed2' && C && (h >= 20 || h < 7)) g += C * 25;
  if(rm.id === 'bed2' && !C && A > 1 && (h >= 23 || h < 7)) g += 30;
  if(rm.id === 'living'){
    if(h >= 17 && h < 23) g += (A + C) * 35;
    else if(h >= 9 && h < 17) g += (wkend ? A + C : Math.min(A, 1)) * 35;
  }
  if(rm.id === 'kitchen'){
    const cook = h === 7 ? 250 : h === 18 ? 700 : h === 17 ? 250 : (wkend && h === 12) ? 400 : 0;
    g += cook * (k.moist ? .6 : 1);
  }
  if(rm.id === 'bath'){
    if(h === 7) g += A * 350;
    if(h === 19 && C) g += 300;
    if(h === 21 && !C) g += 300;
  }
  // washing dried indoors: about 1.7 kg of water over the day after a wash, from 18:00
  const dryRoom = home.children > 1 ? 'bed2' : 'living', dryDay = h >= 18 ? dw : (dw + 6) % 7;
  if(rm.id === dryRoom && home.drying.includes(dryDay) && !k.moist) g += 70;
  return g;
}
const inWin = (h, wins) => wins.some(w => w[0] <= h + .5 && h + .5 < w[1]);
const cooking = (rm, h) => rm.id === 'kitchen' && (h === 7 || h === 17 || h === 18 || h === 12);
const showering = (home, rm, h) => rm.id === 'bath' && (h === 7 || h === 8 || ((home.children && (h === 19 || h === 20)) || (!home.children && (h === 21 || h === 22))));

/* ---------- one run of the twin ---------- */
/* Advances `st` (the rooms' air and every surface's index) over hours [i0, i1). `k` holds the knobs of a what-if
 * run, `p` an ensemble member's perturbation of the coming week; `rec`, when given, collects the series. */
function run(T, home, i0, i1, st, k, p, rec){
  const wx = T.wx, rooms = home.rooms;
  for(let i = i0; i < i1; i++){
    const fc = i >= NP, h = wx.hod[i], dw = wx.dow[i];
    let Te = k.weather && fc ? wx.TeN[i] : wx.Te[i], RHe = k.weather && fc ? wx.RHeN[i] : wx.RHe[i];
    if(fc && p){ Te += p.dT; RHe = clamp(RHe + p.dRH, 40, 99); }
    const ve = vOf(RHe / 100 * psat(Te), Te);
    // each room on its own: heating, then moisture against ventilation
    for(const rm of rooms){
      const s = st.rooms[rm.id], gains = moisture(home, rm, h, dw, {}) > 0 ? 1 : 0;
      const wins = k.heat ? home.heatGood : home.heat, set = k.heat ? Math.max(rm.set, rm.setGood) : rm.set;
      const Tf = Te + rm.Tfree + gains;
      let target = Tf, rate = .1;
      if(inWin(h, wins)){ target = Math.max(set, Tf); rate = .55; }
      else if(k.heat && rm.bedroom && (h >= 23 || h < 6)){ target = Math.max(16, Tf); rate = .4; }
      s.Ti += (target - s.Ti) * rate;
      let G = moisture(home, rm, h, dw, k) * (fc && p ? p.gMul : 1), n = rm.n;
      if(k.vent){ n += .3; if(rm.bedroom && h === 8) n += 1.5; }
      if(rm.hood && k.moist && cooking(rm, h)) n += 1.5;
      if(rm.id === 'bath'){
        const fanWorks = home.fan === 'ok' || k.fan;
        if(showering(home, rm, h)) n += fanWorks ? 3 : k.moist ? 1.2 : 0;
        if(k.fan && s.RHi > 75) n += 2;
      }
      const xs = G / (n * rm.V);
      s.x = xs + (s.x - xs) * Math.exp(-n / BUFFER);
    }
    // air moves between rooms (doors), the bathroom door mostly shut
    let vx = 0, vt = 0, vv = 0;
    for(const rm of rooms){ const s = st.rooms[rm.id]; vx += s.x * rm.V; vt += s.Ti * rm.V; vv += rm.V; }
    vx /= vv; vt /= vv;
    for(const rm of rooms){
      const s = st.rooms[rm.id], m = rm.id === 'bath' ? .2 : .25;
      s.x += m * (vx - s.x); s.Ti += .08 * (vt - s.Ti);
      const vmax = .97 * vOf(psat(s.Ti), s.Ti);
      if(ve + s.x > vmax) s.x = vmax - ve;
      s.pv = pvOf(ve + s.x, s.Ti); s.RHi = s.pv / psat(s.Ti) * 100;
      if(rec){ rec.rooms[rm.id].Ti[i] = s.Ti; rec.rooms[rm.id].RHi[i] = s.RHi; }
    }
    // every surface: its temperature from the room and outside, its humidity from the room's vapour pressure
    for(const sf of home.surfaces){
      const rs = st.rooms[sf.room], ss = st.surf[sf.id], c = CLASSES[sf.cls];
      let f = sf.f;
      if(k.furn && sf.furniture) f += .07;
      if(k.fabric && sf.bridge) f = Math.max(f, .8);
      if(fc && p) f += sf.sensor ? p.df * .3 : p.df;
      const Ts = Te + f * (rs.Ti - Te), RHs = Math.min(100, rs.pv / psat(Ts) * 100);
      const fav = vttStep(ss, Ts, RHs, c);
      if(rec){ const q = rec.surf[sf.id]; q.Ts[i] = Ts; q.RHs[i] = RHs; q.RHc[i] = rhCrit(Ts, c); q.M[i] = ss.M; q.fav[i] = fav ? 1 : 0; }
    }
    if(rec){ rec.Te[i] = Te; rec.RHe[i] = RHe; }
  }
  return st;
}
const cloneState = st => JSON.parse(JSON.stringify(st));
function initState(home){
  const st = { rooms:{}, surf:{} };
  home.rooms.forEach(rm => { st.rooms[rm.id] = { Ti: rm.set - 1.5, x: 2.5, pv: 900, RHi: 60 }; });
  home.surfaces.forEach(sf => { st.surf[sf.id] = { M: sf.M0, dry: 0 }; });
  return st;
}
/* The coming week from `st` (the state when the hour NP starts): ser[j] is the index after hour NP + j, the same
 * hours as the record's M[NP + j]; also the index at the end of the week and the hours a day the surface spends
 * above its mould limit. */
function forward(T, home, st, k, p){
  const s = cloneState(st), wet = {}, end = {}, ser = {};
  home.surfaces.forEach(sf => { wet[sf.id] = 0; ser[sf.id] = new Float64Array(NF + 1); });
  for(let i = NP; i < N; i++){
    run(T, home, i, i + 1, s, k, p, null);
    home.surfaces.forEach(sf => { if(s.surf[sf.id].dry === 0) wet[sf.id]++; ser[sf.id][i - NP] = s.surf[sf.id].M; });
  }
  home.surfaces.forEach(sf => { end[sf.id] = s.surf[sf.id].M; wet[sf.id] /= FC_DAYS; });
  return { end, wet, ser };
}

/* ---------- what drives a forecast ---------- */
/* who: "home" is something the household can try, "landlord" is a repair or improvement, "weather" is context.
 * The wording is the resident app's; the housing team view uses the same. */
const DRIVERS = [
  { id:'heat',    who:'home',     n:'Room kept cool',                  short:'Cool room',
    why:'A cool room keeps its walls colder, and cold walls get damp.',
    tip:'Keep the room at about 18 °C in the evening and overnight, rather than letting it cool right down.',
    only: (sf, home, rm) => rm.set < rm.setGood - .4 },
  { id:'moist',   who:'home',     n:'Moisture from washing, cooking and showers', short:'Moisture indoors',
    why:'Drying clothes, cooking and showers put litres of water into the air every day.',
    tip:'Lids on pans and the cooker hood on, the bathroom door shut and the window open after showers, washing dried outside or near an open window.',
    only: () => true },
  { id:'vent',    who:'home',     n:'Little fresh air',                short:'Little fresh air',
    why:'With windows and vents closed, moist air stays in the home.',
    tip:'Open the trickle vents at the top of the windows, and the bedroom window for 10 minutes each morning.',
    only: () => true },
  { id:'furn',    who:'home',     n:'Furniture against a cold wall',   short:'Furniture on the wall',
    why:'Furniture stops warm air reaching the wall behind it.',
    tip:'Move {furniture} 5 to 10 cm away from the outside wall so air can move behind it.',
    only: sf => !!sf.furniture },
  { id:'fabric',  who:'landlord', n:'Cold spot in the wall',           short:'Cold spot in the wall',
    why:'This part of the wall loses heat faster than the rest (a thermal bridge, no insulation).',
    tip:'Insulating the wall or treating the cold bridge would keep this surface warmer.',
    only: sf => !!sf.bridge },
  { id:'fan',     who:'landlord', n:'Bathroom fan not working',        short:'Broken bathroom fan',
    why:'Steam from showers spreads through the home when the extractor fan does not work.',
    tip:'Repairing the bathroom extractor fan (on a humidity switch) would clear the steam.',
    only: (sf, home) => home.fan === 'broken' },
  { id:'weather', who:'weather',  n:'Cold, damp weather this week',    short:'Cold weather',
    why:'Colder weather makes outside walls colder inside, but cold also slows mould growth: the net effect differs from wall to wall.',
    tip:'', only: () => true }
];
const COMBOS = { home:{ heat:true, moist:true, vent:true, furn:true }, landlord:{ fabric:true, fan:true } };
const MEMBERS = [ { dT:-1.6, dRH:3, gMul:1.15, df:-.035 }, { dT:1.6, dRH:-3, gMul:.85, df:.035 }, { dT:-.8, dRH:-2, gMul:1.08, df:-.015 }, { dT:.8, dRH:2, gMul:.92, df:.015 } ];

/* ---------- build one home's twin ---------- */
const CACHE = {};
function build(id, now){
  const home = homeById(id); if(!home) return null;
  now = floorHour(now || Date.now());
  const key = id + '@' + now;
  if(CACHE[key]) return CACHE[key];
  for(const k in CACHE) if(!k.endsWith('@' + now)) delete CACHE[k];   // only the current hour is kept
  const t0 = now - NP * HOUR, T = { wx: weather(t0) };
  const rec = { Te: new Float64Array(N), RHe: new Float64Array(N), rooms:{}, surf:{} };
  home.rooms.forEach(rm => { rec.rooms[rm.id] = { Ti: new Float64Array(N), RHi: new Float64Array(N) }; });
  home.surfaces.forEach(sf => { rec.surf[sf.id] = { Ts: new Float64Array(N), RHs: new Float64Array(N), RHc: new Float64Array(N), M: new Float64Array(N), fav: new Uint8Array(N) }; });
  const st = initState(home);
  // the demo's story: a surface given an index for now (Mnow) has its start eight weeks ago solved for
  for(let it = 0; it < 2 && home.surfaces.some(sf => sf.Mnow != null); it++){
    const probe = run(T, home, 0, NP, cloneState(st), {}, null, null);
    home.surfaces.forEach(sf => { if(sf.Mnow != null) st.surf[sf.id].M = Math.max(0, st.surf[sf.id].M + sf.Mnow - probe.surf[sf.id].M); });
  }
  run(T, home, 0, NP, st, {}, null, rec);
  const atNow = cloneState(st);
  run(T, home, NP, N, cloneState(atNow), {}, null, rec);
  // the forecast's range, the what-ifs, the combined steps
  const base = forward(T, home, atNow, {}, null);
  const ens = MEMBERS.map(p => forward(T, home, atNow, {}, p));
  const what = {}; DRIVERS.forEach(d => { what[d.id] = forward(T, home, atNow, { [d.id]: true }, null); });
  const combo = { home: forward(T, home, atNow, COMBOS.home, null), landlord: forward(T, home, atNow, COMBOS.landlord, null) };
  const roomOf = rid => home.rooms.find(rm => rm.id === rid);
  const surfaces = home.surfaces.map(sf => {
    const q = rec.surf[sf.id], rm = roomOf(sf.room), r = rec.rooms[sf.room];
    const lo = new Float64Array(NF + 1), hi = new Float64Array(NF + 1);
    for(let j = 0; j <= NF; j++){ const vs = [base.ser[sf.id][j]].concat(ens.map(e => e.ser[sf.id][j])); lo[j] = Math.min(...vs); hi[j] = Math.max(...vs); }
    const cross = ser => { if(ser[0] >= 3) return 0; for(let j = 1; j <= NF; j++) if(ser[j] >= 3) return j; return null; };
    const daysWet = (a, b) => { const out = []; for(let d = a; d < b; d += 24){ let w = 0; for(let i = d; i < d + 24; i++) w += q.fav[i]; out.push(w); } return out; };
    const crossings = ens.map(e => cross(e.ser[sf.id])).concat([cross(base.ser[sf.id])]).filter(v => v !== null);
    const drivers = DRIVERS.filter(d => d.only(sf, home, rm)).map(d => ({
      id:d.id, who:d.who, n:d.n, short:d.short, why:d.why, tip:d.tip.replace('{furniture}', sf.furniture || 'furniture'),
      eff: base.end[sf.id] - what[d.id].end[sf.id], M7: what[d.id].end[sf.id], wet: what[d.id].wet[sf.id]
    })).sort((a, b) => b.eff - a.eff);
    const M7 = q.M[N - 1], Mnow = q.M[NP];
    return {
      def: sf, id: sf.id, room: rm, cls: CLASSES[sf.cls], series: q, lo, hi,
      Mnow, M7, Mweek: q.M[NP - 168], M4w: q.M[NP - 672], lo7: lo[NF], hi7: hi[NF], trend: M7 - Mnow,
      cross3: cross(base.ser[sf.id]), crossEarly: crossings.length ? Math.min(...crossings) : null, crossChance: crossings.length / (ens.length + 1),
      level: levelOf(M7), stage: stageOf(Mnow),
      wetPast: daysWet(NP - 168, NP), wetFc: daysWet(NP, N - 1),
      wetPastAvg: daysWet(NP - 168, NP).reduce((a, b) => a + b, 0) / 7, wetFcAvg: base.wet[sf.id],
      Ts: q.Ts[NP], RHs: q.RHs[NP], RHc: q.RHc[NP], Ti: r.Ti[NP], RHi: r.RHi[NP],
      drivers, homeSteps: { M7: combo.home.end[sf.id], wet: combo.home.wet[sf.id] }, landlordSteps: { M7: combo.landlord.end[sf.id], wet: combo.landlord.wet[sf.id] }
    };
  });
  const rooms = home.rooms.map(rm => {
    const ss = surfaces.filter(s => s.def.room === rm.id), r = rec.rooms[rm.id];
    const worst = ss.slice().sort((a, b) => b.M7 - a.M7)[0] || null;
    let tm = 0, hm = 0, cold = 0; for(let i = NP - 168; i < NP; i++){ tm += r.Ti[i]; hm += r.RHi[i]; if(r.Ti[i] < 16) cold++; }
    return { def: rm, id: rm.id, surfaces: ss, worst, level: worst ? worst.level : 0, series: r, Ti: r.Ti[NP], RHi: r.RHi[NP],
      TiAvg: tm / 168, RHiAvg: hm / 168, coldH: cold / 7 };
  });
  const worst = surfaces.slice().sort((a, b) => b.M7 - a.M7)[0];
  const counts = [0, 0, 0, 0]; surfaces.forEach(s => counts[s.level]++);
  const tw = { home, id, now, t0, NP, NF, N, HOUR, t: i => t0 + i * HOUR, Te: rec.Te, RHe: rec.RHe, rooms, surfaces, worst, counts,
    level: worst ? worst.level : 0, surface: sid => surfaces.find(s => s.id === sid) || null, room: rid => rooms.find(r => r.id === rid) || null };
  CACHE[key] = tw;
  return tw;
}

/* ---------- observations: what residents' photos (and the odd microscope sample) showed ---------- */
/* The demo's record of earlier weekly photo checks, for the validation views (RES3 Section 4.6): a photo tells
 * "nothing visible" (index below 3) or the visible coverage class (3, 4 or 5); a microscope sample tells 0, 1 or 2.
 * The real surfaces are made to grow a little faster than the laboratory model on sensitive materials and slower on
 * plaster, so the demo shows the kind of disagreement recalibration is for. The resident app's home agrees with
 * its forecasts (bias 1). */
const OBS_CLASSES = [
  { id:'none',  n:'Nothing visible',          idx:'below 3', lo:0, hi:2.99 },
  { id:'spots', n:'A few small spots',        idx:'3',       lo:3, hi:3.99 },
  { id:'patch', n:'A patch (up to half)',     idx:'4',       lo:4, hi:4.99 },
  { id:'large', n:'More than half covered',   idx:'5',       lo:5, hi:6 }
];
function observations(tw){
  const r = rng(hash('obs:' + tw.id)), out = [], demo = !!tw.home.demo;
  const monday = new Date(tw.now); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  for(let w = 6; w >= 1; w--){
    const at = new Date(monday); at.setDate(at.getDate() - 7 * w + 2); at.setHours(18, 0, 0, 0);
    const i = Math.round((at.getTime() - tw.t0) / HOUR);
    if(i < 0 || i >= tw.NP) continue;
    tw.surfaces.forEach(s => {
      if(r() > (demo ? .85 : .72)) return;
      const pred = s.series.M[i], bias = demo ? 1 : s.def.cls === 's' ? 1.22 : .85, truth = demo ? pred : Math.max(0, pred * bias + gauss(r) * .25);
      const cls = truth >= 5 ? 'large' : truth >= 4 ? 'patch' : truth >= 3 ? 'spots' : 'none';
      out.push({ id: tw.id + ':' + s.id + ':' + w, home: tw.id, surface: s.id, ts: at.getTime() + Math.round(r() * 3) * HOUR, kind:'photo', obs: cls, pred, by:'resident', seeded:true });
      if(!demo && w === 3 && s.def.sensor && r() < .35){
        const m = clamp(Math.round(truth), 0, 2);
        out.push({ id: tw.id + ':' + s.id + ':m' + w, home: tw.id, surface: s.id, ts: at.getTime() + 40 * HOUR, kind:'micro', obsIdx: truth >= 3 ? null : m, obs: truth >= 3 ? cls : null, pred, by:'research team', seeded:true });
      }
    });
  }
  return out.sort((a, b) => b.ts - a.ts);
}
/* whether a forecast and an observation agree: a photo can only say "below 3" or the visible class */
function agrees(o){
  if(o.kind === 'micro' && o.obsIdx != null) return Math.abs(o.pred - o.obsIdx) < 1;
  const c = OBS_CLASSES.find(x => x.id === o.obs); if(!c) return null;
  if(c.id === 'none') return o.pred < 3;
  return o.pred >= c.lo - .5 && o.pred < c.hi + .5;
}

/* ---------- Awaab's Law: working days ---------- */
/* England and Wales bank holidays from autumn 2026 (weekends are skipped anyway) */
const BANK_HOLIDAYS = ['2026-08-31','2026-12-25','2026-12-28','2027-01-01','2027-03-26','2027-03-29','2027-05-03','2027-05-31','2027-08-30','2027-12-27','2027-12-28'];
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const workingDay = d => d.getDay() !== 0 && d.getDay() !== 6 && !BANK_HOLIDAYS.includes(ymd(d));
function addWorkingDays(from, n){
  const d = new Date(from); d.setHours(17, 0, 0, 0);
  let left = n; while(left > 0){ d.setDate(d.getDate() + 1); if(workingDay(d)) left--; }
  return d;
}
function workingDaysBetween(a, b){
  const d = new Date(a); d.setHours(12, 0, 0, 0); const e = new Date(b); e.setHours(12, 0, 0, 0);
  let n = 0, sign = 1; if(e < d){ sign = -1; }
  while(sign > 0 ? d < e : d > e){ d.setDate(d.getDate() + sign); if(workingDay(d)) n += sign; }
  return n;
}
/* the duties that follow a report (RES3 Section 1.1; MHCLG guidance 2025) */
function awaab(reportedAt, emergency){
  const t = new Date(reportedAt);
  return emergency
    ? { emergency:true, actBy: new Date(t.getTime() + 24 * HOUR) }
    : { emergency:false, investigateBy: addWorkingDays(t, 10) };
}

root.TWIN = {
  HOUR, NP, NF, N, PAST_DAYS, FC_DAYS,
  CLASSES, STAGES, LEVELS, DRIVERS, OBS_CLASSES,
  psat, dewPoint, rhCrit, vttStep, stageOf, levelOf,
  homes: () => HOMES, home: homeById, DEMO_ID: 'H03',
  get: build, observations, agrees,
  workingDay, addWorkingDays, workingDaysBetween, awaab
};
})(typeof self !== 'undefined' ? self : globalThis);
