/* HomePulse (the SWITCH home comfort study, Swansea) - check-in app: state, screens, sync, reminders, joining,
 * approval and the game. Loaded last (after ../config.js, ../switch-api.js, icons.js, questions.js, game.js).
 * Version 1.0 brings the app level with this site's sister study app (its version 1.3.2): its structure (device
 * keys and PINs, the join wizard, tabs, the Undo hold, Android Back, the offline cache) is ported here and adapted,
 * with the bugs found in its review fixed. Nothing outside switch/ is loaded at run time. */
const CFG = SWITCH.cfg || {};
const APP = esc0(CFG.appName || 'HomePulse');                   // the app's name, from config.js (one place to change it)
function esc0(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
const URLQ = new URL(location.href).searchParams;
const DEBUG = URLQ.get('debug') === '1';
const FROM_PUSH = URLQ.get('from') === 'push';
const START = (URLQ.get('start') || '').toLowerCase();     // ?start=join or ?start=signin from the study page
const KEY = 'switch_comfort_proto_v1';                      // check-ins kept on this phone (the dashboard's local mode reads it too)
const APPROVED_KEY = 'switch_approved';
const HOME_KEY = 'switch_home';                             // the home profile (participants.home, metric)
const ME_KEY = 'switch_me';                                 // the rest of my_profile: gender, birth year, height, weight, sensitivity, alias, race_hidden
const REG_KEY = 'switch_reg';                               // the join wizard's draft (never the PIN), removed once saved
const PENDING_KEY = 'switch_pending';                       // switch-api.js: check-ins waiting to be sent
const RACE_KEY = p => 'switch_race_' + p;                   // the last race payload of each period, so the Race tab opens at once and offline
const KEY_LOST_KEY = 'switch_key_lost';                     // '1': this phone was signed out by the server (sign in again)
const POINTS_KEY = 'switch_points';                         // my_points as last read, { at, code, p }: the database's own figures
const BACKFILL_KEY = 'switch_backfill';                     // the code whose older check-ins on this phone have been offered to the database once
const INSTALL_SKIP_KEY = 'switch_install_skip';             // sessionStorage: "Continue in Safari anyway" was chosen in this tab
const NOTIF_ASKED_KEY = 'switch_notif_asked';               // sessionStorage: "Check in now" has asked about notifications once
const INTERVAL = CFG.reminderIntervalMin || 60;             // minutes between reminders, same as the sender
const GOAL = Math.max(1, Math.round(Number(CFG.dailyGoal) || 4));
const WEEK_GOAL = 7;                                        // the weekly goal: every day of the week a goal day
const GAP_MIN = Math.max(1, Number(CFG.checkinGapMin) || 45);   // a check-in opens this long after the last one; no reminder sooner
const MANUAL_PAUSE_H = 12;                                  // "I'll tell you when I'm back": reminders resume by themselves after this long
const HOLD_MS = 6000;                                       // a new check-in waits this long (Undo) before it is sent
const LOCAL_CODE = 'P00';                                   // the participant code in local mode
const NOT_FOUND_MSG = 'This registration was not found. Please join again or contact the research team.';
const TEAM = '<a href="mailto:info@mehraban.uk">info@mehraban.uk</a>';
const PROJECT = 'SWITCH &middot; Swansea University';
const pad = n => String(n).padStart(2,'0');
const fmt = d => pad(d.getHours())+':'+pad(d.getMinutes());   // 24-hour clock everywhere
const dayKey = d => d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const LS = { get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }, set(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }, del(k){ try{ localStorage.removeItem(k); }catch(e){} } };
const SS = { get(k){ try{ return sessionStorage.getItem(k); }catch(e){ return null; } }, set(k,v){ try{ sessionStorage.setItem(k,v); }catch(e){} } };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const quiet = p => { try{ p && p.catch && p.catch(()=>{}); }catch(e){} };
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const readJSON = k => { try{ const v = JSON.parse(LS.get(k) || 'null'); return v && typeof v === 'object' ? v : null; }catch(e){ return null; } };
const hasGame = () => typeof window.GAME === 'object' && !!window.GAME;

/* ---------- times ---------- */
const hm = s => { const m = /^(\d{1,2}):(\d{2})/.exec(s||''); return m ? [Number(m[1]), Number(m[2])] : null; };
function startOfDay(d){ const c = new Date(d); c.setHours(0,0,0,0); return c; }
const shortDate = d => `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
function dayTitle(d){
  const now = new Date(), y = new Date(now); y.setDate(y.getDate()-1);
  return dayKey(d)===dayKey(now) ? 'Today' : dayKey(d)===dayKey(y) ? 'Yesterday' : shortDate(d);
}
const dateWord = d => `${dayTitle(d)} at ${fmt(d)}`;
function agoWord(ts){
  const mins = Math.max(0, Math.round((Date.now() - new Date(ts)) / 60000));
  if(mins < 1) return 'just now';
  if(mins < 60) return mins + ' min ago';
  if(mins < 24*60){ const h = Math.round(mins/60); return h + (h===1 ? ' hour ago' : ' hours ago'); }
  const days = Math.round((startOfDay(new Date()) - startOfDay(new Date(ts))) / 86400000);
  return days <= 1 ? 'yesterday' : days + ' days ago';
}
const secsWord = s => !s ? '' : s < 90 ? `${s} second${s===1?'':'s'}` : `${Math.floor(s/60)} min ${s%60} s`;

/* ---------- who is using this phone ---------- */
/* ?p= is no longer read: check-ins need this device's key, which only joining or signing in gives. */
let PARTICIPANT = LS.get('switch_participant') || '';
let NAME = LS.get('switch_name') || '';
let welcomeNote = '';                                       // one-line notice on the welcome screen (see forgetIdentity)
const firstName = () => (NAME || '').trim().split(/\s+/)[0] || '';
function greeting(){
  const h = new Date().getHours();
  const g = h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return g + (firstName() ? ', ' + esc(firstName()) : '');
}
const homeProfile = () => readJSON(HOME_KEY);
const meProfile = () => readJSON(ME_KEY) || {};
/* the profile has been read (my_profile, the join wizard): it carries the code. A few fields written before
 * that (the alias at sign-in, the race setting) do not make it known. */
const meKnown = () => meProfile().code === PARTICIPANT && !!PARTICIPANT;

/* ---------- check-ins kept on this phone ---------- */
let store = {votes:[], paused:null, pausedWhy:''};
/* Answers no longer kept (overall comfort, humidity, the air preference, asked before 0.4.0) are dropped from
 * the check-ins on the phone as they load. */
function load(){
  try{
    const s = JSON.parse(LS.get(KEY)||'null');
    if(s && Array.isArray(s.votes)){
      let dropped = false;
      s.votes.forEach(v => ['tc','tcs','hum','air_pref'].forEach(k => { if(v && k in v){ delete v[k]; dropped = true; } }));
      // A row of version 0.4.0 has no code: it belongs to the code that was on this phone (switch_participant),
      // never to whoever signs in next. With no code on the phone it belongs to nobody known ('?': kept, never
      // shown, never sent). It was answered with the 0.4.0 questions, so it keeps that app_version when it is sent.
      s.votes.forEach(v => { if(v && !v.p){ v.p = PARTICIPANT || '?'; v.v = v.v || '0.4.0'; dropped = true; } });
      store = Object.assign({paused:null, pausedWhy:''}, s);
      if(dropped) save();
    }
  }catch(e){}
}
function save(){ LS.set(KEY, JSON.stringify(store)); }
/* Each check-in carries the code it was made under (p), so a second person signing in on the same phone
 * never sees the first one's history, points or streak (rows of 0.4.0 get the phone's code as they load). */
const isMine = v => v.p === PARTICIPANT;
const votes = () => store.votes.filter(isMine).sort((a,b)=>a.ts<b.ts?1:-1);
const lastVote = () => votes()[0] || null;
/* Example data for ?debug=1: about four check-ins a day over nine days, cooler in the morning, with the
 * heating, thermostat and wall answers of 1.0. */
function seed(){
  const now = Date.now(), rows = [];
  const slots = [[7,20,-1,'bedroom','sit',['pyjamas','socks','slippers'],'dark','on'],[8,5,-2,'kitchen','house',['long','trousers','socks'],'no','on'],
    [12,40,0,'office','desk',['tshirt','trousers','socks'],'yes','off'],[17,30,0,'living','sit',['jumper','trousers','socks'],'no','on'],[19,45,1,'living','sit',['tshirt','joggers','socks'],'dark','on'],
    [21,10,1,'living','lying',['tshirt','joggers','blanket'],'dark','off'],[22,30,0,'bedroom','lying',['pyjamas','duvet'],'dark','off']];
  let i = 0;
  for(let d = 8; d >= 0; d--){
    slots.forEach((s, k) => {
      if((d + k) % 3 === 0 && d % 4 !== 1) return;                     // leave gaps so days differ
      const t = new Date(now); t.setDate(t.getDate() - d); t.setHours(s[0], s[1] + (d*7 % 13), 0, 0);
      if(t.getTime() > now - 50*60000) return;
      const drift = (d % 5 === 0 ? 1 : 0) - (d % 7 === 3 ? 1 : 0);
      const tsv = Math.max(-3, Math.min(3, s[2] + drift)), on = s[7] === 'on';
      rows.push({ id:'ex'+(i++), p:PARTICIPANT, ts:t.toISOString(), type: k % 2 ? 'scheduled' : 'self', home:'long', example:true, same:false,
        tsv, tp: tsv < 0 ? 'warmer' : tsv > 0 ? 'cooler' : 'same', ta: Math.abs(tsv) >= 2 ? 'unacceptable' : 'acceptable',
        garments:s[5], clo:cloOf(s[5]), act:s[4], met:byId(ACTS,s[4]).met, room:s[3], air: k===1 ? 'draughty' : k===3 ? 'slight' : 'still', sun:s[6],
        heat:s[7], heat_src: on ? ['gas_combi'] : null, heat_for: on ? ['lt30','1_2h','2_4h'][k % 3] : null, stat: 18.5 + (k % 4) * 0.5 + drift,
        wall: tsv < 0 ? 'cold' : k % 2 ? 'cool' : 'neutral', actions: k===1 ? ['heat_up'] : k===4 ? ['layer_off'] : [], notes: k===4 ? ['hot_drink'] : [], secs: 24 + (i*7 % 30) });
    });
  }
  store = { votes: store.votes.filter(v => !v.example).concat(rows), paused:null, pausedWhy:'' };
  save();
  if(!homeProfile()) LS.set(HOME_KEY, JSON.stringify(EXAMPLE_HOME));
  if(!meKnown()) LS.set(ME_KEY, JSON.stringify(Object.assign({ code:PARTICIPANT, name:NAME, gender:'prefer_not', birth_year:1985, height_cm:170, weight_kg:70, sensitivity:'average', alias:'Puffin', alias_colour:3 }, meProfile(), { code:PARTICIPANT })));
}
const EXAMPLE_HOME = { postcode_area:'SA2', home_type:'semi', tenure:'own', year_built:'1945_1964', floors:2, bedrooms:3, floor_area_m2:86, epc:'D',
  adults:2, children:1, pets:0, bedroom_share:1, main_heating:'gas_combi', other_heaters:['electric_fire'], heating_pattern:'timer', payment:'bill',
  controls:['room_stat','trvs'], stat_display:'yes', setpoint_c:20, bedroom_trv:'yes', wall_insulation:'cavity', loft:'yes', glazing:'double',
  windows_open:'yes', damp:['bathroom'], bedroom_facing:'SW', bedroom_side:'S' };

/* ---------- goals, the gap, the streak ---------- */
/* Monday 00:00 of the current calendar week (the week strip and the "this week" figures use it). */
function weekStart(){ const d = startOfDay(new Date()); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; }
const todayCount = list => { const k = dayKey(new Date()); return list.filter(v => dayKey(new Date(v.ts))===k).length; };
/* The game's points for these check-ins (game.js, the same rules as the database), or null without it. The
 * database is the source of truth: its all-time, week and month figures replace the local ones while they
 * are newer than the last check-in on this phone (between a check-in and the next sync the local ones show). */
function gamePoints(list){
  if(!hasGame()) return null;
  const pts = GAME.points(list, new Date()), sv = readJSON(POINTS_KEY), l = list[0];
  if(sv && sv.p && sv.code === PARTICIPANT && (!l || sv.at >= l.ts) && GAME.ukDay(sv.at) === GAME.ukDay(new Date()))
    ['all_time','week','month'].forEach(k => { if(typeof sv.p[k] === 'number') pts[k] = sv.p[k]; });
  return pts;
}
async function refreshPoints(){
  if(!SWITCH.live || !SWITCH.key()) return;
  try{ const p = await SWITCH.myPoints(); if(p) LS.set(POINTS_KEY, JSON.stringify({ at:new Date().toISOString(), code:PARTICIPANT, p })); }catch(e){}
}
/* Today's goal figures: check-ins counted today, goal days this week (of 7), the goal-day streak. With the
 * game these follow its rules (a check-in counts when it is GAP_MIN after the last one); without it, plain counts. */
function goals(list, pts){
  if(pts) return { t: pts.todayCount, w: pts.weekGoalDays, streak: pts.streak, best: pts.best || pts.streak, isGoal: k => pts.goalDays.has(k) };
  const per = {}; list.filter(v => new Date(v.ts) >= weekStart()).forEach(v => { const k = dayKey(new Date(v.ts)); per[k] = (per[k]||0) + 1; });
  return { t: todayCount(list), w: Object.values(per).filter(n => n >= GOAL).length, streak: 0, best: 0, isGoal: k => (per[k]||0) >= GOAL };
}
/* When the next check-in opens: GAP_MIN after the last one (from any of the participant's devices), or null
 * when one can be made now. A last check-in stamped in the future (a device with a wrong clock) never locks
 * anyone out. */
function nextOpen(){
  const l = lastVote(); if(!l) return null;
  const t = new Date(l.ts).getTime(), now = Date.now();
  if(!(t <= now + 2*60000)) return null;
  const open = t + GAP_MIN*60000;
  return open > now ? new Date(open) : null;
}
/* the study is over (config studyEnd, UK date): reminders have stopped */
const studyOver = () => !!CFG.studyEnd && dayKey(new Date()) > CFG.studyEnd;

/* ---------- session state and navigation ---------- */
/* S.editFrom: the screen an Edit button was tapped on (the review), where answering that question returns to. */
const TABS = ['today','race','history','settings'];
const ROOTS = TABS.concat(['welcome','pending','install','profile']);
const FLOW_SCREENS = ['athome','away','q','review'];
const fresh = () => ({ screen:'welcome', flow:[], i:0, a:{}, t0:null, mode:'self', same:false, lock:false, hist:[], edit:false, editFrom:'review', editPrev:null, undoTo:null, histN:40 });
let S = fresh();
/* The home profile, before a check-in (its systems and thermostat decide the questions): read from the database
 * first when this phone has not read it yet, with a short "Loading your home profile" wait of a few seconds at
 * most; offline, the copy kept on the phone is used. Resolves to false when there is none to go by at all. */
let profileWait = null;
async function homeReady(opener){
  if(!SWITCH.live || meKnown()) return true;
  if(navigator.onLine !== false){
    busy(opener, true);
    const t = setTimeout(() => showToast({ title:'Loading your home profile&hellip;', kind:'info', ms:6000 }), 300);
    profileWait = profileWait || Promise.race([refreshProfile(), new Promise(r => setTimeout(r, 6000))]).finally(() => { profileWait = null; });
    await profileWait;
    clearTimeout(t); busy(opener, false);
    if(TOAST && /Loading your home/.test(TOAST.o.title)) closeToast();
  }
  return meKnown() || !!homeProfile();
}
/* A new check-in, unless the last one was less than GAP_MIN ago: then a sheet says when the next one opens
 * (from a reminder too, over Today). Nobody checks in before their home profile is complete. */
async function startSession(mode, opener){
  if(needsKey()){ go('signin'); return; }
  if(!(await homeReady(opener))){ showToast({ title:'Your home profile has not loaded yet', sub:'Check the connection, then try again', kind:'error' }); return; }
  if(needsKey()){ go('signin'); return; }                   // reading the profile found the key no longer works
  if(needsProfile()){ startProfile(); render(); return; }
  const from = TABS.includes(S.screen) ? S.screen : 'today';
  const open = nextOpen();
  if(open){ if(firstRender || !TABS.includes(S.screen)) go(from); waitSheet(open, opener); return; }
  S = Object.assign(fresh(), { t0:Date.now(), mode, screen:from });
  go('athome');
}
function waitSheet(open, opener){
  const l = lastVote(), mins = Math.max(1, Math.ceil((open - Date.now()) / 60000));
  openSheet(`<div class="sh-head"><div><div class="eyebrow">Not yet</div><b id="sheetTitle">Come back at ${fmt(open)}</b></div><button class="x" data-act="sheet-close" aria-label="Close">${ic('x')}</button></div>
    <div class="sh-body"><div class="wait-time">${ic('clock')}<div><b>${fmt(open)}</b><span>Your next check-in opens in ${mins} minute${mins===1?'':'s'}</span></div></div>
      <p class="sub">You checked in at ${fmt(new Date(l.ts))}. Check-ins open ${GAP_MIN} minutes after the last one, on any of your devices, so each one tells the study something new about your day.</p>
      <div class="actions"><button class="btn primary" data-act="sheet-close">OK</button></div></div>`, '.sh-body [data-act="sheet-close"]', opener);
}
/* The questions of FLOW_ALL every time, all starting unanswered (clothing offers "Same as last time"). */
function beginQuestions(){
  S.same = false;
  S.a = { home:S.a.home };
  refreshFlow();
  S.i = 0; go('q');
}
/* The steps asked depend on the answers so far (the heating) and on the home profile (the thermostat). */
/* The current step is found again by its id when the list changes (an answer, or the profile arriving mid-way). */
function refreshFlow(){
  const cur = S.flow[S.i];
  S.flow = flowFor(S.a, homeProfile());
  const j = cur ? S.flow.indexOf(cur) : -1;
  if(j >= 0) S.i = j; else if(S.i > S.flow.length-1) S.i = Math.max(0, S.flow.length-1);
}
/* Heating off or unsure: which heating and how long are not asked (and forgotten). Heating on in a home with
 * one system: that system, without asking; with none in the profile: nothing to ask, left empty. */
function heatRules(){
  const a = S.a;
  if(a.heat !== 'on'){ delete a.heat_src; delete a.heat_for; }
  else { const ch = heatChoices(homeProfile()); if(ch.length <= 1) a.heat_src = ch.length ? [ch[0].id] : null; }
  refreshFlow();
}
const answered = (a, q) => (q==='clo' || q==='heat_src') ? Array.isArray(a[q]) && a[q].length > 0
  : (q==='actions' || q==='notes') ? Array.isArray(a[q])
  : q==='stat' ? (typeof a.stat==='number' || a.stat==='none')
  : a[q] !== undefined && a[q] !== null && a[q] !== '';
function go(screen, opts={}){
  closeSheet();
  if(screen==='signin' && S.screen!=='signin') SIGNIN_CODE = false;   // a fresh visit asks for the code only once the database does
  if(screen==='settings') remDraft = null;                  // a fresh visit shows the saved hours
  if(ROOTS.includes(screen)){ S.hist = []; }
  else if(!opts.replace && S.screen!==screen) S.hist.push(S.screen);
  S.screen = screen;
  render();                                                 // a tab's address (#race) is set once the app's entries are unwound (syncHistory)
}
/* The tab in the address (#race; Today has none), on the page's own entry only: replaceState never adds one. */
function tabUrl(){
  if(!TABS.includes(S.screen) || depth || travelling()) return;
  const base = location.pathname + location.search, url = S.screen==='today' ? base : base + '#' + S.screen;
  if(url !== base + location.hash){ try{ history.replaceState(history.state, '', url); }catch(e){} }
}
function next(){
  refreshFlow();
  if(S.edit){
    // an answer edited from the review: back to it, unless it opened a question (the heating went on: which heating, how long)
    const gap = S.flow.findIndex(q => !answered(S.a, q));
    if(gap >= 0 && gap !== S.i){ S.i = gap; render(); return; }
    S.edit = false; S.editPrev = null; S.hist.pop(); S.screen = S.editFrom || 'review'; render(); return;
  }
  if(S.i < S.flow.length-1){ S.i++; render(); } else { go('review'); }
}
/* ---- the Android back gesture and the browser's Back (ported from the sister app, unchanged in behaviour) ----
 * The app moves between screens inside one page, so it keeps one history entry per step that Back should
 * undo: during a check-in, the join wizard and the sign-in, the entry the page opened on stands for the tab
 * (or the welcome screen) and every step forward sits one entry above it, marked { hc, d } with d its height.
 * Back lands on the entry below and popstate takes the app one step back (back()); the app never adds an
 * entry there. Chrome skips entries a page adds without a user's tap since its last Back, so entries are only
 * added after a tap (canPush). The app's own Back, an Edit answered and leaving a flow (Close, Done, Save,
 * Undo, a finished join) go back down to the height the screen needs with history.go(), so no stale entry
 * stays and Back on a tab leaves the app at once. Entries left by an earlier load are adopted and unwound. */
const GUARDED = s => FLOW_SCREENS.includes(s) || ['done','join','profile','homeedit','myhome','signin'].includes(s);
const GUARD = (history.state && history.state.hc) || Date.now();
const heightOf = st => st && st.hc ? (typeof st.d === 'number' ? st.d : 1) : 0;
let depth = heightOf(history.state);                        // the height of the entry the app is on, or will be once its own history.go() lands
let canPush = false;                                        // a tap since the page opened or since the browser's last Back
let travelN = 0, travelAt = 0, pushAfter = false;           // own history.go() calls still to land; entries to add once they have
function travelling(){ if(travelN && Date.now() - travelAt > 2000) travelN = 0; return travelN > 0; }
const wantDepth = () => screenDepth() + sheetUp();
/* How many entries the screen needs above the page's own: the steps Back takes from here to a tab or the
 * welcome screen, counted the way back() takes them, plus one while a sheet is open (Back closes it). */
function screenDepth(){
  const s = S.screen;
  if(s==='join') return REG.edit ? REG_STEPS.length + 1 : REG.step + 1;
  if(s==='profile') return REG.edit ? REG_STEPS.length : REG.step;   // a required step: nothing before the first one
  if(s==='homeedit') return 2;                              // Settings > My home > one section
  if(s==='myhome') return 1;
  if(s==='signin') return needsKey() ? 0 : 1;
  if(s==='done') return 1;                                  // Back goes straight to the tab, never into the saved check-in
  if(!FLOW_SCREENS.includes(s)) return 0;
  const hist = S.hist.slice(); let n = 0, scr = s, i = S.i, edit = S.edit;
  for(;;){
    if(scr==='q' && i>0 && !edit){ n += i; i = 0; }         // the earlier questions, one step each
    n++;
    const prev = hist.pop();
    if(!prev || !FLOW_SCREENS.includes(prev)) return n;
    if(prev==='q' && scr!=='away') i = Math.max(0, S.flow.length-1);
    scr = prev; edit = false;
  }
}
function syncHistory(){
  const want = wantDepth();
  try{
    if(depth > want){ travelN++; travelAt = Date.now(); history.go(want - depth); depth = want; return; }
    if(depth < want && canPush){
      if(travelling()){ pushAfter = true; return; }
      while(depth < want){ depth++; history.pushState({ hc:GUARD, d:depth }, ''); }
    }
  }catch(e){}
  tabUrl();
}
window.addEventListener('popstate', () => {
  const d = heightOf(history.state);
  if(travelling()){
    if(--travelN > 0) return;
    if(d === depth){ tabUrl(); if(pushAfter){ pushAfter = false; setTimeout(syncHistory, 0); } return; }
  }
  canPush = false; pushAfter = false;
  if(S.lock){ clearTimeout(pickTimer); S.lock = false; }    // an answer was about to move on by itself: step back instead
  let steps = depth - d;
  depth = d;
  if(sheetUp()){ closeSheet(true); steps--; }               // Back closes an open sheet first
  for(let k = 0; k < steps && GUARDED(S.screen); k++){
    if(S.screen==='done') go(TABS.includes(S.hist[0]) ? S.hist[0] : 'today');   // never back into a saved check-in
    else back();
  }
  syncHistory();
});
function userInput(e){
  if(!e.isTrusted || (e.type==='keydown' && ['Escape','Shift','Control','Alt','Meta'].includes(e.key))) return;
  canPush = true;
  if(depth < wantDepth()) setTimeout(syncHistory, 0);
}
['click','keydown'].forEach(type => document.addEventListener(type, userInput, true));
addEventListener('pageshow', e => { if(e.persisted){ canPush = false; travelN = 0; depth = heightOf(history.state); syncHistory(); } });
function back(){
  if(S.lock) return;                                        // an answer is about to move on by itself
  if(S.screen==='join' || S.screen==='profile'){ regBack(); return; }
  if(S.screen==='q' && S.i>0 && !S.edit){ S.i--; render(); return; }
  const editing = S.edit, from = S.screen;
  if(editing && S.editPrev){                                // Back from an Edit cancels it: the answer as it was (for the heating, with which and how long)
    const put = (k, x) => { if(x === undefined) delete S.a[k]; else S.a[k] = x; };
    put(S.editPrev.q, S.editPrev.v); if(S.editPrev.also) Object.entries(S.editPrev.also).forEach(([k, x]) => put(k, x));
    refreshFlow();
  }
  S.edit = false; S.editPrev = null;
  const prev = S.hist.pop();
  if(!prev){ go(PARTICIPANT ? 'today' : 'welcome'); return; }
  if(prev==='q' && from!=='away'){ refreshFlow(); S.i = Math.max(0, S.flow.length-1); }   // back from the review: the last question
  S.screen = prev; render();
}

/* ---------- when the next reminder is due ---------- */
function ceilHour(d){ const c = new Date(d); if(c.getMinutes() || c.getSeconds() || c.getMilliseconds()) c.setHours(c.getHours()+1, 0, 0, 0); return c; }
/* The home-hour windows on the day of d, as {start,end} Dates sorted by start: the weekday or weekend pair
 * (defaults when unset) plus the optional second pair, and only windows with start < end. */
function dayWindows(d, h){
  const p = (d.getDay()===0 || d.getDay()===6) ? 'weekend' : 'weekday';
  const wins = [];
  [['', true], ['2', false]].forEach(([sfx, dflt]) => {
    const s = hm(h[p+sfx+'_start']) || (dflt ? hm(DEFAULT_HOURS[p+'_start']) : null);
    const e = hm(h[p+sfx+'_end']) || (dflt ? hm(DEFAULT_HOURS[p+'_end']) : null);
    if(!s || !e) return;
    const start = new Date(d); start.setHours(s[0], s[1], 0, 0);
    const end = new Date(d); end.setHours(e[0], e[1], 0, 0);
    if(start < end) wins.push({ start, end });
  });
  return wins.sort((a, b) => a.start - b.start);
}
/* The next moment the sender (switch/push/send.js) can actually send. It runs at the top of every hour and
 * sends when reminders are not paused, at least GAP_MIN minutes have passed since the last check-in, and the
 * phone's clock is inside one of the participant's home-hour windows. So: the earliest allowed moment,
 * rounded up to the next whole hour; if that is inside a window of the day it is the answer, otherwise the
 * next window start of the day, otherwise the first window of the following day, and so on for a week. */
function nextReminder(){
  const now = new Date(), h = hours();
  let t = now.getTime();
  const last = lastVote();
  if(last) t = Math.max(t, new Date(last.ts).getTime() + GAP_MIN*60000);
  if(store.paused && new Date(store.paused) > now) t = Math.max(t, new Date(store.paused).getTime());
  let c = ceilHour(new Date(t));
  for(let i=0; i<8; i++){
    for(const w of dayWindows(c, h)){
      const s = ceilHour(c > w.start ? c : w.start);
      if(s <= w.end) return s;
    }
    c = new Date(c); c.setDate(c.getDate()+1); c.setHours(0,0,0,0);
  }
  return c;
}
/* "23:42", or "01:42 tomorrow" (the end of a pause, at most a few hours ahead) */
const untilWord = d => fmt(d) + (dayKey(d)===dayKey(new Date()) ? '' : ' tomorrow');
function whenWord(d){
  const now = new Date(), tom = new Date(now); tom.setDate(tom.getDate()+1);
  const k = dayKey(d);
  if(k===dayKey(now)) return 'today at ' + fmt(d);
  if(k===dayKey(tom)) return 'tomorrow at ' + fmt(d);
  return 'on ' + DAYS[d.getDay()] + ' at ' + fmt(d);
}

/* ---------- building blocks of the main screens ---------- */
const head = (eyebrow, title, sub='') => `<div class="q tab-head"><div class="eyebrow">${eyebrow}</div><h1 tabindex="-1">${title}</h1>${sub?`<p>${sub}</p>`:''}</div>`;
function syncLine(){
  const n = SWITCH.pending().filter(r => r.participant === PARTICIPANT).length;
  const cls = !SWITCH.live ? 'local' : n ? 'wait' : '';
  const txt = !SWITCH.live ? 'stored on this phone only' : n ? n + ' waiting to send' : 'all check-ins sent';
  return `<span class="sync ${cls}"><i aria-hidden="true"></i>${txt}</span>`;
}
function refreshSync(){ $$('[data-sync]').forEach(el => { el.innerHTML = syncLine(); }); }
/* The reminder state on Today: paused, the next reminder, or what is needed to get reminders. */
function statusCard(){
  const st = PUSH.status(), now = Date.now(), on = st === 'on';
  let icon = 'bell', title, sub;
  if(store.paused && new Date(store.paused) > now){
    icon = 'pause';
    if(store.pausedWhy==='manual'){ title = 'Paused until you&rsquo;re back'; sub = 'Back home? Tap Check in now.' + (on ? ` Otherwise reminders resume ${whenWord(nextReminder())}.` : ''); }
    else { title = `Paused until ${untilWord(new Date(store.paused))}`; sub = `No reminders on this phone while you&rsquo;re out.${on ? ` Next one ${whenWord(nextReminder())}.` : ''}`; }
  }
  else if(studyOver()){ icon = 'checkc'; title = 'The study has ended'; sub = 'Reminders have stopped. Thank you for taking part.'; }
  else if(on){ title = `Next reminder ${whenWord(nextReminder())}`; sub = daysWord(hours()); }
  else if(st==='unconfigured'){ icon = 'clock'; title = `Next check-in window ${whenWord(nextReminder())}`; sub = 'Reminders start once the study database is connected'; }
  else if(st==='off'){ title = PUSH.lost() ? 'Reminders have stopped' : 'Turn on reminders'; sub = PUSH.lost() ? 'Tap to turn them on again' : 'A nudge once an hour while you&rsquo;re at home'; }
  else if(st==='install'){ icon = 'download'; title = 'Add the app to your Home Screen'; sub = 'Reminders need it on your Home Screen'; }
  else if(st==='blocked'){ icon = 'bellOff'; title = 'Reminders are blocked'; sub = 'Allow notifications to turn them on'; }
  else { icon = 'bellOff'; title = 'Reminders aren&rsquo;t available here'; sub = 'Use Chrome on Android or Safari on iPhone'; }
  return `<button class="status" data-act="go-reminders">${ic(icon)}<div><b>${title}</b><span>${sub}</span></div>${ic('chev','go')}</button>`;
}
/* "Weekdays 17:00–22:30 · Weekends 09:00–22:30", or "Every day ..." when the two are the same */
function daysWord(h){
  const wd = hoursWord(h, 'weekday'), we = hoursWord(h, 'weekend');
  return wd === we ? `Every day ${wd}` : `Weekdays ${wd} &middot; Weekends ${we}`;
}
/* Notifications are part of the study: without them nobody is reminded to check in. Until they are on,
 * Today leads with this card, and the first "Check in now" of a visit asks for them (notifSheet). Whatever
 * happens there, the check-in goes ahead: nobody is kept from checking in, and nothing asks twice in a row. */
const needsNotif = () => ['off','blocked','install'].includes(PUSH.status());
function notifHelp(st){
  if(st === 'blocked') return { icon:'bellOff', title:'Notifications are blocked',
    html: PUSH.ios ? `<ol class="steps"><li><div>Open your iPhone&rsquo;s <b>Settings</b>, then <b>Notifications</b>.</div></li><li><div>Find <b>${APP}</b> and turn on <b>Allow Notifications</b>.</div></li><li><div>Come back here.</div></li></ol>`
      : `<ol class="steps"><li><div>Touch and hold the <b>${APP}</b> icon, then tap <b>App info</b> (or &#9432;).</div></li><li><div>Tap <b>Notifications</b> and turn them on.</div></li><li><div>Come back here.</div></li></ol><p class="note">Using it in Chrome instead? Tap the icon to the left of the address, then <b>Permissions</b> &rsaquo; <b>Notifications</b> &rsaquo; <b>Allow</b>.</p>` };
  if(st === 'install') return { icon:'download', title:'Add the app to your Home Screen',
    html: `<p>On iPhone, notifications only work in the Home Screen app.</p><ol class="steps"><li><div>Tap the <b>Share</b> button ${ic('share','inl')} in Safari.</div></li><li><div>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</div></li><li><div>Open ${APP} from your Home Screen, choose <b>I have registered before</b> and sign in with your email and PIN.</div></li></ol>` };
  if(st === 'unsupported') return { icon:'bellOff', title:'Notifications don&rsquo;t work in this browser',
    html: `<p>On Android, open the app in Chrome. On iPhone, open it in Safari and add it to your Home Screen.</p>` };
  return { icon:'bell', title: PUSH.lost() ? 'Notifications have stopped' : 'Turn on notifications',
    html: `<p>${APP} reminds you to check in, about once an hour while you&rsquo;re at home. The study needs them.</p><p class="note">${ic('clock','inl')} ${daysWord(hours())} to start with. You can change the hours in Settings.</p>` };
}
function notifCard(){
  const st = PUSH.status(), n = notifHelp(st);
  return `<section class="notif${st === 'off' ? '' : ' warn'}" aria-labelledby="notifH"><div class="nt-top">${ic(n.icon)}<div><div class="eyebrow">Needed for the study</div><b id="notifH">${n.title}</b></div></div>
    <div class="nt-body">${n.html}</div><div class="msg" id="notifMsg" role="status" hidden></div>
    ${st === 'off' ? `<button class="btn primary" data-act="notif-on">${ic('bell')} Turn on notifications</button>` : ''}</section>`;
}
function notifSheet(opener){
  const st = PUSH.status(), n = notifHelp(st);
  SS.set(NOTIF_ASKED_KEY, '1');
  openSheet(`<div class="sh-head"><div><div class="eyebrow">Before you check in</div><b id="sheetTitle">${n.title}</b></div><button class="x" data-act="sheet-close" aria-label="Close">${ic('x')}</button></div>
    <div class="sh-body nt-body">${n.html}<div class="msg" id="notifMsg" role="status" hidden></div>
    <div class="actions">${st === 'off' ? `<button class="btn primary" data-act="notif-on" data-then="start">${ic('bell')} Turn on and check in</button><button class="btn link" data-act="start-anyway">Check in without them</button>`
      : `<button class="btn primary" data-act="start-anyway">Check in anyway</button>`}</div></div>`, st === 'off' ? '[data-act="notif-on"]' : '[data-act="start-anyway"]', opener);
}
function notifMsg(t, ok){ const m = $('#notifMsg') || $('#remMsg'); if(!m) return; m.hidden = false; m.className = 'msg' + (ok ? ' ok' : ' warn'); m.innerHTML = ic(ok ? 'checkc' : 'alert') + '<div>' + t + '</div>'; }
/* a progress ring (outer ring first), drawn in the app's own colours */
function ring(size, stroke, rings, center, label){
  const c = size / 2; let r = c - stroke / 2, s = '';
  rings.forEach(g => {
    const C = 2 * Math.PI * r, v = Math.max(0, Math.min(1, g.value || 0));
    s += `<circle class="rg-track ${g.cls}" cx="${c}" cy="${c}" r="${r.toFixed(1)}" stroke-width="${stroke}"/>`;
    if(v > 0) s += `<circle class="rg-fill ${g.cls}" cx="${c}" cy="${c}" r="${r.toFixed(1)}" stroke-width="${stroke}" stroke-dasharray="${(C * v).toFixed(2)} ${C.toFixed(2)}" transform="rotate(-90 ${c} ${c})"/>`;
    r -= stroke + 4;
  });
  return `<div class="ring" style="width:${size}px;height:${size}px" role="img" aria-label="${label}"><svg viewBox="0 0 ${size} ${size}" aria-hidden="true" focusable="false">${s}</svg><div class="rg-c">${center}</div></div>`;
}
/* ---- Today: the goal ring, the streak and the Monday-to-Sunday strip ---- */
function goalCard(list, pts){
  const g = goals(list, pts), t = g.t, w = g.w;
  const rg = ring(112, 11, [{ value:w/WEEK_GOAL, cls:'wk' }, { value:t/GOAL, cls:'dy' }],
    `<b>${w}<small>/${WEEK_GOAL}</small></b><span>days</span>`, `${w} of ${WEEK_GOAL} goal days this week, ${t} of ${GOAL} check-ins today`);
  const dayLine = t > GOAL ? ['above your goal, keep going!', t + ' today'] : t === GOAL ? ['today &middot; goal met, more are welcome', t + ' of ' + GOAL] : ['today so far', t + ' of ' + GOAL];
  const streak = g.streak ? `<b>${g.streak}-day goal streak</b><span>Best: ${g.best} day${g.best===1?'':'s'}</span>` : `<b>No streak yet</b><span>${g.best ? `Best: ${g.best} day${g.best===1?'':'s'}` : `${GOAL} check-ins in a day starts one`}</span>`;
  return `<section class="goalcard" aria-label="Your goals">
    <div class="goal-top">${rg}<div class="goal-leg">
      <div class="gl"><i class="dot wk" aria-hidden="true"></i><span><b>${w} of ${WEEK_GOAL} days</b><span>this week with ${GOAL} check-ins${w >= WEEK_GOAL ? ' &middot; goal met' : ''}</span></span></div>
      <div class="gl"><i class="dot dy" aria-hidden="true"></i><span><b>${dayLine[1]}</b><span>${dayLine[0]}</span></span></div>
      <div class="gl streak">${ic('flame')}<span>${streak}</span></div>
    </div></div>
    ${weekStrip(list, g)}</section>`;
}
/* Monday to Sunday of this week: weekday initial, the day's most common sensation as a face, the count, and
 * a tick on the days that reached the daily goal; days still to come are dimmed. */
function weekStrip(list, g){
  const byDay = {};
  list.forEach(v => { const k = dayKey(new Date(v.ts)); (byDay[k] = byDay[k] || []).push(v); });
  const today = startOfDay(new Date()), monday = weekStart();
  let cols = '';
  for(let i=0; i<7; i++){
    const d = new Date(monday); d.setDate(d.getDate()+i);
    const k = dayKey(d), future = d > today, day = future ? [] : (byDay[k] || []);
    const count = {}; day.forEach(v => { if(typeof v.tsv==='number') count[v.tsv] = (count[v.tsv]||0)+1; });
    const top = Object.entries(count).sort((a,b) => b[1]-a[1] || Math.abs(+a[0])-Math.abs(+b[0]))[0];
    const isToday = d.getTime() === today.getTime(), goal = !future && g.isGoal(k);
    cols += `<div class="wd ${isToday?'today':''} ${future?'future':''} ${goal?'goal':''}" title="${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}: ${day.length} check-in${day.length===1?'':'s'}${goal?', goal reached':''}"><span class="dn">${DAYS[d.getDay()][0]}</span>${top ? face(Number(top[0]), {plain:true}) : '<span class="none"></span>'}<span class="dc ${day.length?'':'zero'}">${future ? '&middot;' : goal ? ic('check') + day.length : day.length}</span></div>`;
  }
  return `<div class="week"><div class="wk-head"><span class="eyebrow">This week</span><span>${ic('check','inl')} = daily goal</span></div><div class="wk-days">${cols}</div></div>`;
}
/* Points this week, this month and all time, the race (top three and you), the latest badge */
function gameToday(list, pts){
  if(!pts) return '';
  const pay = racePayload('week');
  const latest = GAME.badges(list, new Date()).filter(b => b.got).sort((a, b) => a.at < b.at ? 1 : -1)[0];
  const nf = n => Math.round(n || 0).toLocaleString('en-GB');
  return `<div class="stats pts" aria-label="Your points"><div class="stat"><b>${nf(pts.week)}</b><span>this week</span></div><div class="stat"><b>${nf(pts.month)}</b><span>this month</span></div><div class="stat"><b>${nf(pts.all_time)}</b><span>points in all</span></div></div>
    ${GAME.raceMiniHTML(pay)}
    ${latest ? `<button class="row badge-row" data-act="badges">${ic('medal')}<div><b>Latest badge: ${esc(latest.name)}</b><span>${esc(latest.desc)}</span></div>${ic('chev','go')}</button>` : ''}`;
}
/* ---- My check-ins: three small charts and the list ---- */
const BAR_H = 40;                                           // tallest bar, px
function charts(list){
  if(list.length < 2) return `<div class="viz"><div class="vc wide empty">${ic('bulb')}<div>Your charts appear here after a couple of check-ins.</div></div></div>`;
  const cnt = {}; list.forEach(v => { if(typeof v.tsv==='number') cnt[v.tsv] = (cnt[v.tsv]||0)+1; });
  const maxS = Math.max(1, ...Object.values(cnt));
  const sens = TSV.map(t => { const c = cnt[t.v]||0;
    return `<div class="col" title="${t.w}: ${c}"><span class="n">${c||''}</span><i class="b ${c?'':'zero'}" style="${c ? `height:${Math.max(4, Math.round(c/maxS*BAR_H))}px;background:${tsvColour(t.v)}` : ''}"></i></div>`; }).join('');
  const byDay = {}; list.forEach(v => { const k = dayKey(new Date(v.ts)); byDay[k] = (byDay[k]||0)+1; });
  const today = startOfDay(new Date());
  const days = []; for(let i=13; i>=0; i--){ const d = new Date(today); d.setDate(d.getDate()-i); days.push({ d, c: byDay[dayKey(d)]||0 }); }
  const maxD = Math.max(GOAL, ...days.map(x => x.c));
  const dcols = days.map((x, i) => `<div class="col ${i===13?'today':''} ${x.c >= GOAL ? 'goal' : ''}" title="${DAYS[x.d.getDay()]} ${x.d.getDate()} ${MONTHS[x.d.getMonth()]}: ${x.c}"><span class="n">${x.c||''}</span><i class="b ${x.c?'':'zero'}" style="${x.c ? `height:${Math.max(4, Math.round(x.c/maxD*BAR_H))}px` : ''}"></i></div>`).join('');
  const f = days[0].d;
  const pc = { cooler:0, same:0, warmer:0 }; let pn = 0;
  list.forEach(v => { if(v.tp in pc){ pc[v.tp]++; pn++; } });
  const pct = k => pn ? Math.round(pc[k]/pn*100) : 0;
  return `<div class="viz">
    <div class="vc"><div class="cap">Sensation</div><div class="bars">${sens}</div><div class="axis">${TSV.map(t => `<span>${signed(t.v)}</span>`).join('')}</div></div>
    <div class="vc"><div class="cap">Check-ins per day</div><div class="bars"><span class="goal-line" style="bottom:${Math.round(GOAL/maxD*BAR_H)+14}px"></span>${dcols}</div><div class="axis ends"><span>${f.getDate()} ${MONTHS[f.getMonth()]}</span><span class="td">Today</span></div></div>
    <div class="vc wide"><div class="cap">Preference<small>${pn} check-in${pn===1?'':'s'}</small></div>
      <div class="pbar"><i class="pc" style="flex-grow:${pc.cooler}"></i><i class="pn" style="flex-grow:${pc.same}"></i><i class="pw" style="flex-grow:${pc.warmer}"></i></div>
      <div class="legend"><span><i class="pc"></i>Cooler <b>${pct('cooler')}%</b></span><span><i class="pn"></i>No change <b>${pct('same')}%</b></span><span><i class="pw"></i>Warmer <b>${pct('warmer')}%</b></span></div></div>
  </div>`;
}
function historyList(list){
  const shown = list.slice(0, S.histN);
  let html = '', day = '';
  shown.forEach(v => {
    const d = new Date(v.ts), t = dayTitle(d);
    if(t !== day){ day = t; html += `<li class="day">${t}</li>`; }
    const heat = v.heat === 'on' ? 'heating on' : '';
    const bits = [byId(TP,v.tp)?.n && 'prefer ' + byId(TP,v.tp).n.toLowerCase(), byId(ROOMS,v.room)?.n, typeof v.clo==='number' && v.clo.toFixed(2) + ' clo', heat].filter(Boolean).join(' &middot; ');
    html += `<li><button class="item" data-act="show" data-id="${esc(v.id)}">${typeof v.tsv==='number' ? face(v.tsv) : '<span></span>'}<div><b>${typeof v.tsv==='number' ? tsvWord(v.tsv) + ' (' + signed(v.tsv) + ')' : 'Check-in'}</b><span>${bits}</span></div><time>${fmt(d)}</time>${ic('chev','go')}</button></li>`;
  });
  const more = list.length > shown.length ? `<button class="btn secondary" data-act="more">Show older check-ins</button>` : '';
  return `<ul class="hist">${html}</ul>${more}`;
}
/* "Last 30 min: opened a window, turned the heating up": each name starts lower case */
const lowerList = s => s.replace(/(^|, )([A-Z])(?=[a-z])/g, (m, a, b) => a + b.toLowerCase());
/* everything one check-in holds, one line each (the detail sheet) */
function detailRows(l){
  const li = (icon, html) => html ? `<li>${icon}<div>${html}</div></li>` : '';
  const tp = byId(TP,l.tp), act = byId(ACTS,l.act), room = byId(ROOMS,l.room), air = byId(AIR,l.air), sun = byId(SUN,l.sun), wall = byId(WALL,l.wall), heat = byId(HEAT,l.heat);
  const taOk = l.ta ? (byId(TA,l.ta) ? l.ta==='acceptable' : !/unacc/.test(l.ta)) : null;
  const hf = byId(HEAT_FOR, l.heat_for);
  return [
    typeof l.tsv==='number' && li(`<span class="f">${face(l.tsv)}</span>`, `<b>${tsvWord(l.tsv)}</b> (${signed(l.tsv)})`),
    tp && li(ic(tp.ic, tp.cls||''), tp.id==='same' ? 'Happy with the temperature' : `Would like to be <b>${tp.n.toLowerCase()}</b>`),
    l.ta && li(ic(taOk?'up':'down', taOk?'good':'bad'), taWord(l.ta)),
    (l.garments||[]).length ? li(ic('tshirt'), `${garmentNames(l.garments)} &middot; ${(l.clo||0).toFixed(2)} clo`) : '',
    act && li(ic(act.ic), act.n), room && li(ic(room.ic), room.n),
    air && li(ic(air.ic), air.k), sun && li(ic(sun.ic), sun.n),
    heat && li(ic(heat.ic, heat.cls||''), heat.k + (l.heat === 'on' && (l.heat_src||[]).length ? ': ' + heatSrcWord(l.heat_src) : '') + (hf ? ` &middot; ${hf.n.toLowerCase()}` : '')),
    typeof l.stat === 'number' && li(ic('stat'), `Thermostat showed ${statWord(l.stat)}`),
    wall && li(ic(wall.ic, wall.cls||''), wall.id === 'no_reach' ? 'Could not reach an outside wall' : `Outside wall felt ${wall.n.toLowerCase()}`),
    Array.isArray(l.actions) && li(ic(byId(ACTIONS, l.actions[0])?.ic || 'checkc'), l.actions.length ? 'Last 30 min: ' + lowerList(namesOf(ACTIONS, l.actions)) : 'Last 30 min: did none of these'),
    Array.isArray(l.notes) && li(ic(byId(NOTES, l.notes[0])?.ic || 'info'), l.notes.length ? 'Last 30 min: ' + lowerList(namesOf(NOTES, l.notes)) : 'Last 30 min: nothing to note')
  ].filter(Boolean).join('');
}
/* The answers of the check-in being made (S.a) as tiles, for the review: the feeling in its own colour, the
 * outfit on the figure, an icon for every other answer and a chip per thing done or felt. Only the steps
 * asked this time have a tile; each has an Edit button. */
function answerTiles(a){
  const asked = q => S.flow.includes(q), open = '<span class="open">Not answered yet</span>';
  const tile = (q, art, k, v, cls) => `<li class="atile${cls ? ' ' + cls : ''}">${art}<span class="at-t"><span class="at-k">${k}</span><span class="at-v">${v}</span></span>${asked(q) ? `<button class="at-edit" data-act="edit" data-q="${q}" aria-label="Edit ${QNAME[q]}">${ic('edit')}</button>` : ''}</li>`;
  const tic = (name, cls='') => `<span class="at-ic">${ic(name, cls)}</span>`;
  const chips = (list, ids, none) => !Array.isArray(ids) ? open : !ids.length ? none : `<span class="achips">${ids.map(id => byId(list, id)).filter(Boolean).map(o => `<span class="achip">${ic(o.ic)}${o.n}</span>`).join('')}</span>`;
  const tp = byId(TP,a.tp), ta = byId(TA,a.ta), act = byId(ACTS,a.act), room = byId(ROOMS,a.room), air = byId(AIR,a.air), sun = byId(SUN,a.sun), heat = byId(HEAT,a.heat), wall = byId(WALL,a.wall), hf = byId(HEAT_FOR,a.heat_for);
  const feel = typeof a.tsv === 'number';
  let h = tile('tsv', feel ? `<span class="at-face">${face(a.tsv)}</span>` : tic('thermo'), 'Feeling', feel ? `${tsvWord(a.tsv)} <span class="num">${signed(a.tsv)}</span>` : open, 'wide feel' + (feel ? '" style="--sc:' + tsvColour(a.tsv) : ''));
  h += tile('tp', tic(tp ? tp.ic : 'thermo', tp && tp.cls || ''), 'Would like to be', tp ? tp.n : open);
  h += tile('ta', tic(ta ? ta.ic : 'up', ta ? ta.cls : ''), 'Conditions', ta ? ta.n : open);
  h += tile('clo', `<span class="at-fig" aria-hidden="true">${avatar(a.clo||[])}</span>`, 'Wearing', a.clo && a.clo.length ? `${garmentNames(a.clo)}<small>${cloOf(a.clo).toFixed(2)} clo</small>` : open, 'wide');
  h += tile('act', tic(act ? act.ic : 'walk'), 'Doing', act ? act.n : open);
  h += tile('room', tic(room ? room.ic : 'door'), 'Room', room ? room.n : open);
  h += tile('air', tic(air ? air.ic : 'still'), 'Air', air ? air.k : open);
  h += tile('sun', tic(sun ? sun.ic : 'sun'), 'Sun', sun ? sun.n : open);
  h += tile('heat', tic(heat ? heat.ic : 'flame', heat && heat.cls || ''), 'Heating', heat ? heat.n : open, a.heat === 'on' ? '' : 'wide');
  if(a.heat === 'on') h += tile('heat_for', tic('clock'), 'On for', hf ? hf.n : open);
  if(a.heat === 'on' && (asked('heat_src') || (a.heat_src||[]).length)) h += tile('heat_src', tic('radiator'), 'Which heating', (a.heat_src||[]).length ? heatSrcWord(a.heat_src) : open, 'wide');
  if(asked('stat')) h += tile('stat', tic('stat'), 'Thermostat shows', typeof a.stat === 'number' ? statWord(a.stat) : a.stat === 'none' ? 'Couldn&rsquo;t see it' : open);
  h += tile('wall', tic(wall ? wall.ic : 'wall', wall && wall.cls || ''), 'Outside wall', wall ? wall.n : open, asked('stat') ? '' : 'wide');
  h += tile('actions', tic('refresh'), 'You did, last 30 minutes', chips(ACTIONS, a.actions, 'None of these'), 'wide');
  h += tile('notes', tic('info'), 'You had or felt, last 30 minutes', chips(NOTES, a.notes, 'None of these'), 'wide');
  return `<ul class="atiles">${h}</ul>`;
}

/* ---------- the Bay Race (game.js draws it; this keeps its data) ---------- */
let RACE_PERIOD = 'week';
const raceFetching = {}, raceAt = {};
const raceCached = p => readJSON(RACE_KEY(p));
/* local mode: a race of one, from the check-ins on this phone */
function localRace(p){
  const pts = gamePoints(votes()); if(!pts) return null;
  const per = SWITCH.period ? SWITCH.period(p) : { period:p, from:null, to:null, target: hasGame() ? GAME.target(p) : 0 };
  const inP = votes().filter(v => { const k = GAME.ukDay(v.ts); return (!per.from || k >= per.from) && (!per.to || k <= per.to); });
  const goalDays = [...pts.goalDays].filter(k => (!per.from || k >= per.from) && (!per.to || k <= per.to)).length;
  const points = p === 'month' ? pts.month : pts.week, me = meProfile();
  return { period:p, from:per.from, to:per.to, target:per.target, total:1,
    me:{ alias: me.alias || 'You', colour: me.alias_colour || 0, points, rank:1, hidden: !!me.race_hidden },
    runners:[{ alias: me.alias || 'You', colour: me.alias_colour || 0, points, checkins: inP.length, goal_days: goalDays, rank:1, is_me:true }] };
}
function racePayload(p){ return SWITCH.live ? raceCached(p) : localRace(p); }
/* Fetches one period's race and keeps it; resolves to true when it changed. */
function fetchRace(p, force){
  if(!SWITCH.live || !SWITCH.key() || !PARTICIPANT) return Promise.resolve(false);
  if(raceFetching[p]) return raceFetching[p];
  if(!force && Date.now() - (raceAt[p] || 0) < 30000) return Promise.resolve(false);   // at most twice a minute
  raceAt[p] = Date.now();
  raceFetching[p] = (async () => {
    try{
      const r = await SWITCH.race(p);
      if(r && typeof r === 'object'){ const s = JSON.stringify(r), old = LS.get(RACE_KEY(p)); LS.set(RACE_KEY(p), s); return s !== old; }
    }catch(e){ if(e.notSignedIn) keyLost(); }
    finally { raceFetching[p] = null; }
    return false;
  })();
  return raceFetching[p];
}
function refreshRace(p, force){
  quiet(fetchRace(p, force).then(changed => { if(changed && (S.screen==='race' || S.screen==='today') && !S.lock && !sheetUp()) rerender(true); }));
}
/* the participant's place in the week's race if they had these points (the others as last fetched) */
function rankWith(pay, pts){ if(!pay || !Array.isArray(pay.runners)) return 0; return 1 + pay.runners.filter(r => !r.is_me && r.points > pts).length; }
function badgesSheet(opener){
  openSheet(`<div class="sh-head"><div><div class="eyebrow">Just for you</div><b id="sheetTitle">My badges</b></div><button class="x" data-act="sheet-close" aria-label="Close">${ic('x')}</button></div>
    <div class="sh-body">${GAME.badgesHTML(GAME.badges(votes(), new Date()))}</div>`, null, opener);
}
function howSheet(opener){
  openSheet(`<div class="sh-head"><div><div class="eyebrow">The Bay Race</div><b id="sheetTitle">How points work</b></div><button class="x" data-act="sheet-close" aria-label="Close">${ic('x')}</button></div>
    <div class="sh-body">${GAME.howSheetHTML()}</div>`, null, opener);
}

/* ---------- the home profile, read back ---------- */
const label = (list, id) => (byId(list, id) || {}).n;
const listWord = (opts, ids) => Array.isArray(ids) && ids.length ? ids.map(id => label(opts, id)).filter(Boolean).join(', ') : null;
const countWord = (n, max) => typeof n === 'number' ? (max && n >= max ? max + '+' : String(n)) : null;
const facingWord = (v, deg) => v === 'unsure' ? 'Not sure' : label(FACING, v) ? label(FACING, v) + (typeof deg === 'number' ? ` (${deg}°)` : '') : null;
const notSure = v => v === null ? 'Not sure' : null;
/* Sections of "Your home": [title, wizard step id, items [art, key, value or null]] from the profile, in the
 * wizard's own fields (r: name, gender... as REG holds them; h: the home). */
function homeSections(r, h, withEmail){
  const f = regFieldsOf(r);
  const share = typeof h.bedroom_share === 'number' ? label(BED_SHARE, h.bedroom_share) : null;
  const you = [[ic('user'), 'Name', f.name || null]].concat(withEmail ? [[ic('mail'), 'Email', f.email || null]] : [])
    .concat([[ic('users'), 'Gender', label(GENDERS, f.gender) || null], [ic('calendar'), 'Year of birth', f.birth_year ? String(f.birth_year) : null],
      [ic('ruler'), 'Height', f.height_cm ? Math.round(f.height_cm) + ' cm' : null], [ic('scale'), 'Weight', f.weight_kg ? f.weight_kg + ' kg' : null],
      [ic('thermo'), 'Most like you', label(SENSITIVITY, f.sensitivity) || null]]);
  return [
    ['About you', 'you', you],
    ['Your area and home', 'area', [[ic('pin'), 'Postcode area', h.postcode_area || null], [art(h.home_type ? 'home_type:' + h.home_type : 'home_type:detached'), 'Home', label(HOME_TYPES, h.home_type) || null]]
      .concat(h.home_type === 'flat' ? [[art(h.flat_position ? 'flat_position:' + h.flat_position : 'flat_position:middle'), 'Floor', label(FLAT_POS, h.flat_position) || null]] : [])
      .concat([[art(h.tenure ? 'tenure:' + h.tenure : 'tenure:own'), 'Tenure', label(TENURE, h.tenure) || null]])],
    ['Age and size', 'size', [[ic('calendar'), 'Built', label(YEAR_BUILT, h.year_built) || null], [art('floors:' + (h.floors || 2)), 'Floors', h.floors ? (h.floors >= 4 ? '4 or more' : String(h.floors)) : null],
      [ic('bed'), 'Bedrooms', countWord(h.bedrooms, 6)], [ic('ruler'), 'Floor area', typeof h.floor_area_m2 === 'number' ? h.floor_area_m2 + ' m²' : notSure(h.floor_area_m2)],
      [epcArt(h.epc), 'EPC rating', label(EPC, h.epc) || null]]],
    ['Who lives here', 'people', [[ic('user'), 'Adults', countWord(h.adults)], [ic('child'), 'Children', countWord(h.children)], [ic('paw'), 'Pets', countWord(h.pets)], [ic('bed'), 'Bedroom', share]]],
    ['Heating', 'heat', [[art(h.main_heating ? 'heat:' + h.main_heating : 'heat:gas_combi'), 'Main heating', label(MAIN_HEATING, h.main_heating) || null],
      [ic('flame'), 'Other heaters', listWord(OTHER_HEATERS, h.other_heaters)], [ic('clock'), 'How it&rsquo;s used', label(HEAT_PATTERN, h.heating_pattern) || null],
      [ic('card'), 'Paying for it', label(PAYMENT, h.payment) || null]]],
    ['Heating controls', 'controls', [[ic('sliders'), 'Controls', listWord(CONTROLS, h.controls)], [ic('stat'), 'Thermostat shows the temperature', label(STAT_DISPLAY, h.stat_display) || null],
      [ic('thermo'), 'Usual setting', typeof h.setpoint_c === 'number' ? h.setpoint_c.toFixed(1) + ' °C' : notSure(h.setpoint_c)], [ic('radiator'), 'Bedroom radiator dial', label(BEDROOM_TRV, h.bedroom_trv) || null]]],
    ['Walls, roof and windows', 'fabric', [[art(h.wall_insulation ? 'wall:' + h.wall_insulation : 'wall:none'), 'Walls', label(WALL_INS, h.wall_insulation) || null],
      [art(h.loft ? 'loft:' + h.loft : 'loft:yes'), 'Loft insulation', label(LOFT, h.loft) || null], [ic('window'), 'Glazing', label(GLAZING, h.glazing) || null],
      [ic('windowOpen'), 'Windows open', label(WINDOWS_OPEN, h.windows_open) || null], [ic('drop'), 'Damp or mould', listWord(DAMP, h.damp)]]],
    ['Your bedroom', 'bedroom', [[ic('compass'), 'Window faces', facingWord(h.bedroom_facing, h.bedroom_facing_deg)],
      [ic('compass'), 'Bedroom is on the', h.bedroom_side === 'unsure' ? 'Not sure' : facingWord(h.bedroom_side, h.bedroom_side_deg) && facingWord(h.bedroom_side, h.bedroom_side_deg).replace(/^([\w-]+)/, '$1 side')]]]
  ];
}
/* typed values are escaped; the entities in option labels (&rsquo;) are kept */
const glanceItem = (artHtml, k, v) => `<div class="gi${v==null?' empty':''}"><span class="gi-art">${artHtml}</span><span class="gi-t"><span class="gi-k">${k}</span><span class="gi-v">${v==null ? 'Not answered' : esc(v).replace(/&amp;(#?\w+);/g, '&$1;')}</span></span></div>`;
function homeGlance(r, h, editAct, withEmail){
  return homeSections(r, h, withEmail).map(([title, step, items]) => `<section class="glance"><div class="gl-head"><b>${title}</b>${editAct ? `<button class="btn-edit" data-act="${editAct}" data-step="${step}" aria-label="Edit ${title.toLowerCase()}">${ic('edit')}Edit</button>` : ''}</div>
    <div class="gl-items">${items.map(([a, k, v]) => glanceItem(a, k, v)).join('')}</div></section>`).join('');
}
/* iPhone, in Safari rather than the Home Screen app, nobody signed in, and reminders possible: ask for the
 * Home Screen app before joining or signing in (once per tab: "Continue in Safari anyway"). */
const installFirst = () => !PARTICIPANT && PUSH.status() === 'install' && SS.get(INSTALL_SKIP_KEY) !== '1';
const brand = () => `<div class="brand"><span class="mark">${ic('brand')}</span><span><b>${APP}</b><small>${PROJECT}</small></span></div>`;

/* ---------- screens ---------- */
const SCREENS = {
  welcome: () => {
    const d = loadReg('join'), draft = d.step > 0 || d.name;
    return `<div class="hero welcome">${brand()}
        <h1 class="h1" tabindex="-1">How does your home feel?</h1>
        <p class="sub">Short check-ins while you&rsquo;re at home teach the study what comfortable means for you. Joining takes about 5 minutes and happens once.</p></div>
      ${welcomeNote ? `<div class="msg" role="status">${ic('info')}<div>${esc(welcomeNote)}</div></div>` : ''}
      <div class="rows">
        <button class="row" data-act="go" data-to="join">${ic('user')}<div><b>I&rsquo;m new here</b><span>${draft ? 'Carry on where you left off' : 'Join the study'}</span></div>${ic('chev','go')}</button>
        <button class="row" data-act="go" data-to="signin">${ic('mail')}<div><b>I have registered before</b><span>Sign in with my email and PIN</span></div>${ic('chev','go')}</button>
      </div>
      ${SWITCH.live ? '' : `<div class="msg warn">${ic('alert')}<div><b>Local mode.</b> The study database is not connected, so everything stays in this browser.</div></div>`}
      <div class="actions"><p class="note center"><b>${APP}</b> takes the pulse of how your home feels: a few taps while you are at home help Swansea University learn what comfort means in Welsh homes.</p><div class="foot">Questions about the study? Email ${TEAM} &middot; <a href="../">About the study</a></div></div>`;
  },
  /* iPhone, in Safari, before anyone joins or signs in (see installFirst): the Home Screen app keeps its own
   * storage, separate from Safari's, and only it can get reminders. */
  install: () => `<div class="hero">${brand()}<div class="eyebrow">Before you start</div><h1 class="h1" tabindex="-1">Add ${APP} to your Home Screen first</h1>
      <p class="sub">On iPhone, reminders only work in the Home Screen app, and it keeps its own copy of your answers, separate from Safari. Join there, so everything stays together.</p></div>
    <section class="card"><b class="card-t">Three quick steps</b><ol class="steps"><li><div>Tap the <b>Share</b> button ${ic('share','inl')} in Safari&rsquo;s toolbar.</div></li><li><div>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</div></li><li><div>Open <b>${APP}</b> from your Home Screen and join there.</div></li></ol>
      <p class="note">Opened this inside another app? Open it in Safari first.</p></section>
    <div class="msg">${ic('info')}<div>Joined before? In the Home Screen app, choose <b>I have registered before</b> and sign in with your email and PIN.</div></div>
    <div class="actions"><button class="btn link" data-act="install-skip">Continue in Safari anyway</button></div>`,
  signin: () => {
    const rekey = needsKey(), lost = LS.get(KEY_LOST_KEY) === '1', code = SIGNIN_CODE, choose = code || (rekey && !lost);
    const t = rekey ? (lost ? ['Sign in again', 'Please sign in again', 'This phone was signed out. Your check-ins are safe: sign in with your email and your PIN.']
      : ['One more step', 'Sign in with your email and a PIN', `${APP} now keeps your check-ins on every phone and tablet you use. Enter the email you registered with and your 4-digit PIN: the one you chose before, or a new one if you have not chosen one yet.`])
      : ['Welcome back', 'Sign in', 'With the email you joined with and your 4-digit PIN. All your check-ins come with you.'];
    return qhead(t[0], t[1], t[2]) +
      `<form class="form" id="signForm" novalidate>
        <div class="field" id="f-s_email"><label for="s_email">Email</label><input class="in" id="s_email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" aria-describedby="err-s_email"><p class="err" id="err-s_email" hidden></p></div>
        ${code ? `<div class="field" id="f-s_code"><label for="s_code">Your participant code</label><input class="in pcode" id="s_code" autocapitalize="characters" autocomplete="off" spellcheck="false" maxlength="6" placeholder="e.g. P07" aria-describedby="hint-code err-s_code">
          <p class="note" id="hint-code">You have not chosen a PIN yet (or the research team has reset it), so the study asks for your participant code once. It is at the bottom of the Today screen in the old app, or of any phone or tablet where you are signed in. Or ask the research team at ${TEAM}.</p><p class="err" id="err-s_code" hidden></p></div>` : ''}
        <div class="field" id="f-s_pin"><label for="s_pin">${code ? 'Choose a 4-digit PIN' : rekey && !lost ? 'Your PIN, or choose one' : 'PIN'}</label><input class="in pin" id="s_pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="${code ? 'new-password' : 'current-password'}" aria-describedby="err-s_pin"><p class="err" id="err-s_pin" hidden></p>${choose ? '<p class="note">Four digits you will remember. Please don&rsquo;t use your bank card PIN.</p>' : ''}</div>
      </form>
      <div class="actions"><button class="btn primary" type="button" data-act="signin">Continue ${ic('chev')}</button>
        <p class="note center">Forgot your PIN? Email ${TEAM} and the research team will reset it.</p>
        ${rekey ? `<button class="btn link" type="button" data-act="forget">Not you? Start again</button>` : `<button class="btn link" type="button" data-act="go" data-to="join">I haven&rsquo;t joined yet</button>`}</div>`;
  },
  pending: () => `<div class="done"><div class="big">${ic('clock')}</div><h1 tabindex="-1">Thanks${firstName() ? ', ' + esc(firstName()) : ''}!</h1><p class="sub">The research team will confirm your place, usually within a day. You can check in as soon as that&rsquo;s done.</p><div class="msg" id="pendMsg" role="status" hidden></div>
    <div class="actions"><button class="btn primary" data-act="recheck">${ic('refresh')} Check again</button><button class="btn link" data-act="forget">Not you? Start again</button><div class="foot">Your participant code is ${esc(PARTICIPANT)}</div></div></div>`,
  today: () => {
    const list = votes(), l = list[0], pts = gamePoints(list), open = nextOpen();
    lockShown = !!open;
    const last = l ? `Last one <span data-ago="${esc(l.ts)}">${agoWord(l.ts)}</span>${typeof l.tsv === 'number' ? ' &middot; ' + tsvWord(l.tsv).toLowerCase() : ''}` : 'Takes about a minute';
    const cta = open ? `<button class="cta wait" data-act="start"><span class="cta-ic">${ic('clock')}</span><span class="cta-t"><b>Next check-in at ${fmt(open)}</b><span>They open ${GAP_MIN} minutes after the last one &middot; ${last}</span></span></button>`
      : `<button class="cta" data-act="start"><span class="cta-ic">${ic('bell')}</span><span class="cta-t"><b>Check in now</b><span>${last}</span></span>${ic('chev','go')}</button>`;
    const notif = !['on','unconfigured'].includes(PUSH.status()) && !studyOver();
    return `<div class="hero today-hero"><div class="eyebrow">${PROJECT}</div><div class="hrow2"><h1 class="h1" tabindex="-1">${greeting()}</h1>${pts ? GAME.pointsChipHTML(pts, (racePayload('week') || {}).me) : ''}</div></div>
      ${notif ? notifCard() : ''}
      ${cta}
      ${goalCard(list, pts)}
      ${notif ? '' : statusCard()}
      ${gameToday(list, pts)}
      <div class="foot">${NAME ? esc(NAME) + ' &middot; ' : ''}${esc(PARTICIPANT)} &middot; <span data-sync>${syncLine()}</span></div>`;
  },
  race: () => hasGame() ? `<div class="race-wrap">${GAME.raceHTML(racePayload(RACE_PERIOD), { period:RACE_PERIOD })}</div>` : head('The Bay Race', 'Marina to Mumbles', 'The race is not available right now.'),
  history: () => {
    const list = votes();
    if(!list.length) return head('Your data', 'My check-ins') + `<div class="card empty">${ic('list')}<b>No check-ins yet</b><p class="sub">Your charts and history appear here after your first check-in.</p><button class="btn primary" data-act="start">Check in now ${ic('chev')}</button></div>`;
    return head('Your data', 'My check-ins', `${list.length} check-in${list.length===1?'':'s'}, from all your devices. Tap one for the details.`) + charts(list) + historyList(list);
  },
  settings: () => {
    const me = meProfile(), h = homeProfile(), shown = !me.race_hidden;
    const homeLine = h && h.home_type ? [label(HOME_TYPES, h.home_type), esc(h.postcode_area), h.bedrooms != null ? countWord(h.bedrooms, 6) + ' bedroom' + (h.bedrooms === 1 ? '' : 's') : ''].filter(Boolean).join(' &middot; ') : 'Not filled in yet';
    return head('Your app', 'Settings') +
      `<section class="card" id="reminders" tabindex="-1" aria-labelledby="remH">${remindersSection()}</section>
      <section class="card" aria-labelledby="raceH"><b class="card-t" id="raceH">The Bay Race</b>
        <button class="toggle-row" role="switch" aria-checked="${shown}" data-act="race-hide">${ic(shown ? 'eye' : 'eyeOff')}<div><b>Show me in the Bay Race</b><span>${shown ? `Others see you as ${esc(me.alias || 'a Welsh wildlife name')}, never your name.` : 'Hidden from others. You still see the race and your own place.'}</span></div><span class="switch" aria-hidden="true"><i></i></span></button>
        <div class="msg" id="raceMsg" role="status" hidden></div>
        <div class="btn-row"><button class="btn secondary sm" data-act="race-how">${ic('info')} How points work</button><button class="btn secondary sm" data-act="badges">${ic('medal')} My badges</button></div></section>
      <section class="card" aria-labelledby="homeH"><b class="card-t" id="homeH">My home</b>
        <button class="row" data-act="go" data-to="myhome">${art(h && h.home_type ? 'home_type:' + h.home_type : 'home_type:detached', 'row-art')}<div><b>Your home profile</b><span>${homeLine}</span></div>${ic('chev','go')}</button></section>
      <section class="card" aria-labelledby="acctH"><b class="card-t" id="acctH">Your account</b>
        <ul class="kv"><li>${ic('user')}<span>Name</span><b>${esc(NAME) || '&mdash;'}</b></li><li>${ic('key')}<span>Participant code</span><b>${esc(PARTICIPANT)}</b></li>
          ${me.alias ? `<li>${ic('flag')}<span>In the race</span><b>${esc(me.alias)}</b></li>` : ''}<li>${ic('refresh')}<span>Check-ins</span><b data-sync>${syncLine()}</b></li></ul>
        ${SWITCH.live ? '' : `<div class="msg warn">${ic('alert')}<div><b>Local mode.</b> The study database is not connected: check-ins stay on this phone and nothing is sent.</div></div>`}
        <button class="btn secondary" data-act="signout">${ic('signout')} Not you? Sign out</button></section>
      <section class="card about"><b class="card-t">About</b>
        <p class="note">${APP} &middot; ${esc(CFG.studyName || 'SWITCH home comfort study')} &middot; Swansea University &middot; version ${esc(CFG.appVersion || '')}</p>
        <p class="note">Questions? Email ${TEAM}. <a href="../">About the study</a></p></section>`;
  },
  myhome: () => {
    const h = homeProfile();
    if(!h) return head('My home', 'Your home profile') + `<div class="card empty">${art('home_type:detached')}<b>Not filled in yet</b><p class="sub">It appears here once the study has it.</p></div>`;
    return head('My home', 'Your home profile', 'As you described it. Tap Edit to change a section.') + homeGlance(regFromProfile(meProfile(), h), h, 'home-edit', false) +
      `<div class="msg">${ic('info')}<div>Moved home? Please email ${TEAM} as well, so the research team knows.</div></div>`;
  },
  /* "Yes, for over an hour" and "Yes, I just got in" both lead to the check-in (at_home long or recent) */
  athome: () => qhead('Before we start', 'Are you at home right now?', 'Then a few quick questions about how you feel.') +
    `<div class="rows fill">
      <button class="row" data-act="home" data-v="long">${ic('home')}<div><b>Yes, for over an hour</b><span>Let&rsquo;s do the check-in</span></div>${ic('chev','go')}</button>
      <button class="row" data-act="home" data-v="recent">${ic('clock')}<div><b>Yes, I just got in</b><span>Let&rsquo;s do the check-in</span></div>${ic('chev','go')}</button>
      <button class="row" data-act="home" data-v="out">${ic('out')}<div><b>No, I&rsquo;m out</b><span>Pause reminders for a while</span></div>${ic('chev','go')}</button>
    </div>`,
  /* each pause with the time it ends on the phone's clock */
  away: () => {
    const opt = (v, icon, lab, sub) => `<button class="row" data-act="pause" data-v="${v}">${ic(icon)}<div><b>${lab}</b><span>${sub}</span></div>${ic('chev','go')}</button>`;
    const until = min => 'Until ' + untilWord(new Date(Date.now() + min*60000));
    return qhead('Out and about', 'When should we check again?', 'This phone stays quiet until then.') +
      `<div class="rows fill">
        ${opt(60, 'clock', 'In an hour', until(60))}
        ${opt(180, 'clock', 'In three hours', until(180))}
        ${opt(300, 'clock', 'In five hours', until(300))}
        ${new Date().getHours() < 19 ? opt('evening', 'moon', 'This evening', 'Until 19:00') : ''}
        ${opt('manual', 'pin', 'I&rsquo;ll tell you when I&rsquo;m back', `Or in ${MANUAL_PAUSE_H} hours at the latest`)}
      </div>`;
  },
  q: () => Q[S.flow[S.i]](),
  review: () => qhead('Almost done', 'Here&rsquo;s what we&rsquo;ll save', `Tap ${ic('edit','inl')} to change an answer.`) +
    `<section class="review">${answerTiles(S.a)}</section>
    <div class="actions"><button class="btn primary" data-act="submit">${ic('checkc')} Save check-in</button></div>`,
  /* celebrates showing up, never the answer */
  done: () => {
    const list = votes(), l = list[0], pts = gamePoints(list), g = goals(list, pts), t = g.t, open = nextOpen();
    const title = t === GOAL ? 'That&rsquo;s today&rsquo;s goal!' : `Thank you${firstName() ? ', ' + esc(firstName()) : ''}!`;
    const sub = t > GOAL ? 'Above and beyond today, thank you! Every extra check-in makes your comfort story clearer.'
      : t === GOAL ? `${g.w} of ${WEEK_GOAL} goal days this week. More check-ins today are always welcome.`
      : `${GOAL - t} more today reach${GOAL - t === 1 ? 'es' : ''} your daily goal.`;
    return `<div class="done"><div class="big">${ic('checkc')}</div><h1 tabindex="-1">${title}</h1><p class="sub">${sub}</p>
      ${hasGame() && DONE ? GAME.doneHTML(DONE) : ''}
      ${l ? `<p class="note">Saved at ${fmt(new Date(l.ts))}${l.secs ? ` &middot; took ${secsWord(l.secs)}` : ''}</p>` : ''}
      ${open ? `<p class="note next-open">${ic('clock','inl')} Your next check-in opens at <b>${fmt(open)}</b></p>` : ''}
      <div class="actions"><button class="btn primary" data-act="tab" data-to="today">Done</button>${hasGame() ? `<button class="btn link" data-act="tab" data-to="race">See the Bay Race</button>` : `<button class="btn link" data-act="tab" data-to="history">See my check-ins</button>`}</div></div>`;
  },
  join: () => regScreen(),
  profile: () => regScreen(),
  homeedit: () => regScreen()
};

/* ---------- chrome: the top strip and the tab bar ---------- */
const TAB_DEF = [['today','today','Today'],['race','flag','Race'],['history','list','My check-ins'],['settings','sliders','Settings']];
const backPill = (hide) => hide ? '<span class="back-sp"></span>' : `<button class="back" id="back" data-act="back" aria-label="Back">${ic('back')}Back</button>`;
function topbar(){
  const s = S.screen;
  const bar = (label, pct) => `<div class="prog"><div class="count" aria-live="polite">${label}</div>${pct === null ? '' : `<div class="progress" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>`}</div>`;
  if(FLOW_SCREENS.includes(s)){
    const n = S.flow.length || FLOW_ALL.length, step = s==='review' ? n + 1 : S.i + 1, prog = s==='q' || s==='review';
    const label = s==='q' ? `Question ${step} of ${n}` : s==='review' ? 'Review' : 'Check-in &middot; ' + fmt(new Date());
    return backPill() + bar(label, prog ? Math.round(step/(n+1)*100) : null) + `<button class="close" id="close" data-act="close" aria-label="Close the check-in">${ic('x')}</button>`;
  }
  if(s==='join' || s==='profile'){
    return backPill(s==='profile' && REG.step === 0 && !REG.edit) + bar(s==='join' ? 'Join the study' : 'Your profile', null) +
      (s==='join' ? `<button class="later" id="later" data-act="reg-later">Later</button>` : '');
  }
  if(s==='homeedit') return backPill() + bar('Edit your home', null);
  if(s==='myhome') return backPill() + bar('Settings', null);
  if(s==='signin') return needsKey() ? '' : backPill() + bar('Sign in', null);
  return '';
}
function updateChrome(){
  const s = S.screen, tabs = TABS.includes(s);
  $('.phone').classList.toggle('has-tabs', tabs);
  const nav = $('#tabbar');
  nav.hidden = !tabs;
  if(tabs) nav.innerHTML = TAB_DEF.map(([id, icon, lab]) => `<button class="tab" id="tab-${id}" data-act="tab" data-to="${id}"${id===s ? ' aria-current="page"' : ''}>${ic(icon)}<span>${lab}</span></button>`).join('');
  const top = $('#top'), t = topbar();
  top.innerHTML = t; top.classList.toggle('empty', !t);
}

/* ---------- render ---------- */
let lastKey = '', firstRender = true, lockShown = false;     // lockShown: Today shows "Next check-in at ..."
const screenKey = () => S.screen + ':' + (S.screen==='q' ? S.i + (S.edit ? 'e' : '') : ['join','profile','homeedit'].includes(S.screen) ? REG.step : S.screen==='race' ? RACE_PERIOD : '');
function focusKey(el){
  if(!el || el === document.body) return null;
  if(el.id) return '#' + CSS.escape(el.id);
  const d = el.dataset || {};
  if(d.act) return '[data-act="' + d.act + '"]' + (d.q ? '[data-q="' + d.q + '"]' : '') + (d.v !== undefined ? '[data-v="' + d.v + '"]' : '') + (d.k ? '[data-k="' + d.k + '"]' : '') + (d.d ? '[data-d="' + d.d + '"]' : '') + (d.to ? '[data-to="' + d.to + '"]' : '');
  return null;
}
/* Where a screen may not be shown yet: no device key (sign in), or an approved participant whose home
 * profile is not complete (the profile wizard). */
function routeGuards(){
  if(needsKey() && (TABS.includes(S.screen) || S.screen === 'pending' || S.screen === 'profile')){ S.screen = 'signin'; S.hist = []; return; }
  if(TABS.includes(S.screen) && needsProfile()) startProfile();
}
function render(){
  routeGuards();
  const el = $('#screen'), key = screenKey();
  el.innerHTML = SCREENS[S.screen]();
  updateChrome();
  afterRender();
  if(key !== lastKey){
    el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter');
    el.scrollTop = 0;
    if(!firstRender){ const h = el.querySelector('h1'); if(h) h.focus({ preventScroll:true }); }
    animateGame();
    if(S.screen === 'race' || S.screen === 'today') refreshRace(S.screen === 'race' ? RACE_PERIOD : 'week');
  }
  lastKey = key; firstRender = false;
  syncHistory();
}
/* redraws in place (same screen), keeping the scroll position and the focus */
function rerender(animate){
  const k = focusKey(document.activeElement), el = $('#screen'), y = el.scrollTop;
  el.innerHTML = SCREENS[S.screen]();
  updateChrome();
  afterRender();
  el.scrollTop = y;
  if(k){ const t = document.querySelector(k); if(t && t !== document.activeElement) t.focus({ preventScroll:true }); }
  if(animate) animateGame();
}
function afterRender(){ $$('#screen .dial').forEach(paintDial); }
function animateGame(){ if(hasGame() && (S.screen === 'race' || S.screen === 'today')) GAME.animate($('#screen')); }

/* ---------- answering ---------- */
let pickTimer = 0;                                          // cancelled by the browser's Back (popstate)
function pick(q, raw){
  const v = q==='tsv' ? Number(raw) : raw;
  S.a[q] = v;
  if(q==='heat') heatRules();
  rerender();
  S.lock = true;
  clearTimeout(pickTimer);
  pickTimer = setTimeout(()=>{ S.lock=false; if(S.screen==='q') next(); }, 460);
}
function toggle(q, v){
  const arr = Array.isArray(S.a[q]) ? [...S.a[q]] : [];
  const i = arr.indexOf(v);
  if(i>=0) arr.splice(i,1);
  else { arr.push(v); const j = q==='actions' && PAIRED[v] ? arr.indexOf(PAIRED[v]) : -1; if(j>=0) arr.splice(j,1); }   // opened clears closed, up clears down
  // a multiple choice emptied by hand is unanswered again (not "none of these"): Next waits for an answer
  S.a[q] = arr.length || q==='clo' || q==='heat_src' ? arr : undefined;
  rerender();
}
/* the thermostat question: the last reading, or 20.0 the first time */
function statShown(){
  if(typeof S.a.statv === 'number') return S.a.statv;
  if(typeof S.a.stat === 'number') return S.a.stat;
  const l = votes().find(v => typeof v.stat === 'number');
  return l ? Math.max(STAT_MIN, Math.min(STAT_MAX, Math.round(l.stat * 2) / 2)) : 20;
}
/* "Yes, for over an hour" and "Yes, I just got in" both lead to the check-in; the answer is stored with it. */
function onHome(v){
  S.a.home = v;
  if(v==='long' || v==='recent'){
    store.paused=null; store.pausedWhy=''; save();
    schedChange({ paused_until:null, settled_at:null });
    beginQuestions();
  } else { go('away'); }
}
/* "No, I'm out": no reminders until the chosen time. "I'll tell you when I'm back" is open-ended in the
 * app's words, but reminders still resume after MANUAL_PAUSE_H hours, so someone who forgets to say they are
 * home is not lost to the study; the status card says when. */
function setPause(v){
  if(v==='manual'){ store.paused = new Date(Date.now()+MANUAL_PAUSE_H*3600000).toISOString(); store.pausedWhy='manual'; }
  else if(v==='evening'){ const d=new Date(); if(d.getHours()>=19){ rerender(); return; } d.setHours(19,0,0,0); store.paused=d.toISOString(); store.pausedWhy='away'; }   // from a screen left open past 19:00: show the current options instead
  else { store.paused = new Date(Date.now()+Number(v)*60000).toISOString(); store.pausedWhy='away'; }
  save();
  schedChange({ paused_until: store.paused });
  go('today');
  showToast({ title:'Reminders paused', sub: store.pausedWhy==='manual' ? 'Tap Check in now when you&rsquo;re back' : 'Until ' + untilWord(new Date(store.paused)), kind:'info' });
}
/* Saves the check-in on the phone at once and shows the done screen; it is sent after HOLD_MS (see hold), so
 * Undo can take it back everywhere. The row uses the answer keys switch-api.js toRecord reads. */
let DONE = null;                                            // what the done screen shows from the game: points before and after, new badges, the race place
function submit(){
  const a = S.a, on = a.heat === 'on';
  const row = { id:'v'+Date.now()+Math.random().toString(36).slice(2,6), p:PARTICIPANT, ts:new Date().toISOString(), type:S.mode, home:a.home||'long',
    tsv:a.tsv, tp:a.tp, ta:a.ta, garments:a.clo||[], clo:cloOf(a.clo||[]), act:a.act, met:byId(ACTS,a.act)?.met, room:a.room,
    air:a.air, sun:a.sun, heat:a.heat ?? null, heat_src: on ? (a.heat_src ?? null) : null, heat_for: on ? (a.heat_for ?? null) : null,
    stat: typeof a.stat === 'number' ? a.stat : null, wall:a.wall ?? null,
    actions:a.actions, notes:a.notes, same:false, secs:Math.max(1, Math.round((Date.now()-S.t0)/1000)) };
  const before = votes();
  store.votes.push(row); store.paused=null; store.pausedWhy=''; save();
  if(hasGame()){
    const after = votes(), b = GAME.points(before, new Date()), af = GAME.points(after, new Date()), pay = racePayload('week');
    const rb = pay && pay.me ? +pay.me.rank || 0 : 0;
    DONE = { before:b, after:af, newBadges: GAME.newBadges(before, after, new Date()), rankBefore: rb,
      rankAfter: pay && pay.me ? rankWith(pay, (+pay.me.points || 0) + Math.max(0, af.week - b.week)) : 0 };
  }
  S.undoTo = S.screen;
  hold(row);
  if(DEBUG) renderTable();
  go('done'); confetti();
}
/* ---- the hold: Undo for a few seconds, then send ---- */
const HELD = new Set();                                     // ids of check-ins waiting out their Undo time on this page
const isHeld = rec => HELD.has(rec.client_id) || (rec.hold_until && Date.now() < rec.hold_until);
const stripHold = rec => { const r = Object.assign({}, rec); delete r.hold_until; return r; };
function hold(row){
  HELD.add(row.id);
  // In the queue straight away (marked with the time it may be sent), so a check-in made just before the app
  // is closed still goes out the next time it opens.
  if(SWITCH.live){ const rec = SWITCH.toRecord(row, PARTICIPANT); rec.hold_until = Date.now() + HOLD_MS; SWITCH.queue(rec); }
  const on = PUSH.status()==='on', t = goals(votes(), gamePoints(votes())).t;
  showToast({ title:'Check-in saved', sub: on ? 'Next reminder ' + whenWord(nextReminder()) : t > GOAL ? `${t} today` : `${t} of ${GOAL} today`, action:'Undo', onAction:() => undo(row.id), onClose:() => commit(row.id), ms:HOLD_MS, hold:true });
}
/* The Undo time is over: send the check-in now. This also runs when the toast closes early (another message
 * replaced it, or the app went to the background), so the row's hold mark is removed here. A pause chosen after
 * this check-in ("No, I'm out" right after saving) is kept: submit() cleared any earlier one. */
function commit(id){
  if(!HELD.has(id)) return;
  HELD.delete(id);
  if(SWITCH.live) LS.set(PENDING_KEY, JSON.stringify(SWITCH.pending().map(r => r.client_id === id ? stripHold(r) : r)));
  const row = store.votes.find(v => v.id === id); if(!row) return;
  const pausedSince = !!store.paused && new Date(store.paused) > Date.now();
  schedChange(Object.assign({ last_vote_at:row.ts }, pausedSince ? {} : { paused_until:null, settled_at:null }));
  quiet(flushPending().then(async () => { await refreshPoints(); refreshRace('week', true); if(RACE_PERIOD !== 'week') refreshRace(RACE_PERIOD, true); }));
}
/* The app is going to the background, where an iPhone suspends it within moments: the Undo time ends now. */
function endHolds(){
  if(!HELD.size) return;
  if(TOAST && TOAST.o.hold) closeToast();
  [...HELD].forEach(commit);
}
function undo(id){
  if(!HELD.has(id)) return;
  HELD.delete(id);
  store.votes = store.votes.filter(v => v.id !== id); save();
  LS.set(PENDING_KEY, JSON.stringify(SWITCH.pending().filter(r => r.client_id !== id)));
  DONE = null;
  if(DEBUG) renderTable();
  if(S.screen === 'done'){ const to = S.undoTo || 'review'; if(S.hist[S.hist.length-1] === to) S.hist.pop(); S.screen = to; render(); }
  else if(TABS.includes(S.screen)) rerender();
  else if(FLOW_SCREENS.includes(S.screen)) go('today');
  showToast({ title:'Check-in removed', sub:'Nothing was sent', kind:'info', ms:3500 });
}
/* Sends the queued check-ins: on start, after a hold, when the phone comes back online and when the app comes
 * back to the screen. Rows still in their Undo time wait; rows of another participant (signed out on this
 * phone with check-ins still unsent) stay until that person signs in here again, and are never sent under
 * this person's key. What the database says:
 *   ok / duplicate  sent, out of the queue;
 *   not_signed_in   kept, and this phone signs in again (keyLost);
 *   not_approved    kept (sent once the team approves again), and the waiting screen;
 *   invalid         kept and logged, not retried until the app is opened again (the database sanitises
 *                   answers, so this means a broken row; it stays for the research team to look at).
 * A refused HTTP request (401/403 and others) keeps the row too: a 401 can be a wrong publishable key, and
 * dropping rows then would lose a whole study period. Offline, everything waits. Only the rows dealt with
 * are taken out at the end, so a check-in queued meanwhile is never lost. */
let flushing = null, flushAgain = false;
const INVALID = new Set();                                  // client_ids the database called invalid on this page
async function flushPending(){
  if(!SWITCH.live || !PARTICIPANT || !SWITCH.key()) return;
  if(flushing){ flushAgain = true; return flushing; }
  flushing = (async () => {
    do {
      flushAgain = false;
      const q = SWITCH.pending(); if(!q.length) break;
      const done = new Set(); let lost = false, refused = false;
      for(const rec of q){
        if(isHeld(rec) || rec.participant !== PARTICIPANT || INVALID.has(rec.client_id)) continue;
        try{
          const r = await SWITCH.insert(stripHold(rec));
          if(r.ok){ done.add(rec.client_id); continue; }
          if(r.verdict === 'not_signed_in'){ lost = true; break; }
          if(r.verdict === 'not_approved'){ refused = true; break; }
          if(r.verdict === 'invalid'){ INVALID.add(rec.client_id); console.warn('Check-in ' + rec.client_id + ' was refused as invalid; it stays in the queue.'); continue; }
          if(!r.verdict){ console.warn('Check-in ' + rec.client_id + ' could not be sent (HTTP ' + r.status + '); it stays in the queue.'); break; }
        }catch(e){ break; }                                 // offline: try again later
      }
      if(done.size) LS.set(PENDING_KEY, JSON.stringify(SWITCH.pending().filter(r => !done.has(r.client_id))));
      if(done.size){ store.votes.forEach(v => { if(done.has(v.id)) v.synced = true; }); save(); }
      refreshSync();
      if(lost){ keyLost(); break; }
      if(refused){ await afterRefusal(); break; }
    } while(flushAgain);
  })();
  try{ await flushing; } finally { flushing = null; }
}
/* A held check-in whose page was closed early: send it once its time is up. */
function flushLater(){ const q = SWITCH.pending(); const wait = q.map(r => r.hold_until || 0).filter(t => t > Date.now()); if(wait.length) setTimeout(() => quiet(flushPending()), Math.max(...wait) - Date.now() + 250); }

/* ---------- identity, joining, approval ---------- */
const friendly = (m, fallback) => /schema cache|could not find the function/i.test(m||'') ? 'Joining is not switched on yet. Please contact the research team.' : /registered/i.test(m||'') ? 'We could not find that email. Check the spelling, or join as new.' : /failed to fetch|network|load failed/i.test(m||'') ? 'Could not reach the study database. Check the connection and try again.' : (m || fallback);
function setIdentity(code, name){
  PARTICIPANT = code; NAME = name || ''; welcomeNote = '';
  LS.set('switch_participant', code); LS.set('switch_name', NAME);
}
/* Forgets who is using this phone: the code is gone from the database (removed on the dashboard), the person on
 * the waiting screen said it is not them, or they signed out. Their synced check-ins leave the phone too (they
 * are in the database and come back when they sign in); any still waiting to be sent stay, and go out when
 * they sign in here again. With device, this phone's key and reminders are switched off on the server too. */
function forgetIdentity(note, device){
  const code = PARTICIPANT;
  if(code && SWITCH.live){ requeueUnsent(code); dropSynced(code); }          // local mode: nothing is anywhere else, so nothing leaves the phone
  if(device){ quiet(SWITCH.forgetDevice()); if(PUSH.status() === 'on') quiet(PUSH.disable()); }
  SWITCH.setKey(null);
  ['switch_participant','switch_name',APPROVED_KEY,'switch_push','switch_push_lost','switch_sched',HOME_KEY,ME_KEY,KEY_LOST_KEY,POINTS_KEY,BACKFILL_KEY,RACE_KEY('week'),RACE_KEY('month')].forEach(k => LS.del(k));
  PARTICIPANT = ''; NAME = ''; welcomeNote = note || ''; DONE = null;
  go('welcome');
}
/* One person on any number of devices: joining, or signing in with email and PIN, gives this device a key
 * (SWITCH.key). With it the device sends check-ins and loads the person's check-ins from all their devices.
 * A participant of version 0.4.0 has a code on this phone but no key yet: "One more step". */
const needsKey = () => SWITCH.live && !!PARTICIPANT && !SWITCH.key();
/* Every check-in of this code that the database may not have (not marked synced, which a send or my_checkins
 * does, and not queued already) goes into the queue under that code: it is sent when that person signs in on
 * this phone again, and never under anyone else's key (flushPending sends only the current code's rows). */
function requeueUnsent(code){
  const queued = new Set(SWITCH.pending().map(r => r.client_id));
  store.votes.filter(v => v.p === code && !v.synced && !v.example && v.ts && !queued.has(v.id)).forEach(v => SWITCH.queue(SWITCH.toRecord(v, code)));
}
/* The check-ins of this code that the database has leave the phone; the rest (queued) stay for that person. */
function dropSynced(code){
  const waiting = new Set(SWITCH.pending().map(r => r.client_id));
  store.votes = store.votes.filter(v => v.p !== code || waiting.has(v.id));
  save();
}
/* After joining or signing in. Another person than the phone's last one: the previous person's reminders are
 * switched off (and the subscription dropped) before anything else, so the new person's own registration can
 * never be undone by it; their check-ins the database has leave the phone, the others wait in the queue for
 * them; their race, points and profile caches go. */
async function signedIn(r){
  const prev = PARTICIPANT, same = !!prev && prev === r.code;
  if(!same && prev){
    if(PUSH.status() === 'on') await PUSH.disable();
    requeueUnsent(prev); dropSynced(prev);
    ['switch_push','switch_push_lost','switch_sched',HOME_KEY,ME_KEY,POINTS_KEY,BACKFILL_KEY,RACE_KEY('week'),RACE_KEY('month')].forEach(k => LS.del(k));
  }
  save();
  setIdentity(r.code, r.name);
  SWITCH.setKey(r.device_key); LS.del(KEY_LOST_KEY);
  if(r.home && typeof r.home === 'object' && Object.keys(r.home).length) LS.set(HOME_KEY, JSON.stringify(r.home));
  if(r.alias){ const me = meProfile(); me.alias = r.alias; LS.set(ME_KEY, JSON.stringify(me)); }
}
/* The key no longer works (signed out on all devices by the team, or the person was removed): sign in again;
 * anything waiting stays queued until then. A participant who has been removed goes to the welcome screen. */
function keyLost(){
  if(SWITCH.key()) LS.set(KEY_LOST_KEY, '1');               // only a phone that had a key was signed out
  SWITCH.setKey(null);
  quiet(approvalState().then(st => { if(st === 'gone') forgetIdentity(NOT_FOUND_MSG); }));
  if(TABS.includes(S.screen) || S.screen === 'pending' || S.screen === 'profile') go('signin');
}
/* The profile row (my_profile, update_my_profile) on this phone: the home in HOME_KEY, the rest in ME_KEY.
 * Resolves to true when anything changed. */
function cacheProfile(prof){
  if(!prof || typeof prof !== 'object') return false;
  let changed = false;
  const me = { code:prof.code, name:prof.name, gender:prof.gender, birth_year:prof.birth_year, height_cm:prof.height_cm, weight_kg:prof.weight_kg,
    sensitivity:prof.sensitivity, alias:prof.alias, alias_colour:prof.alias_colour, race_hidden:!!prof.race_hidden };
  if(LS.get(ME_KEY) !== JSON.stringify(me)){ LS.set(ME_KEY, JSON.stringify(me)); changed = true; }
  if(prof.home && typeof prof.home === 'object' && Object.keys(prof.home).length && LS.get(HOME_KEY) !== JSON.stringify(prof.home)){ LS.set(HOME_KEY, JSON.stringify(prof.home)); changed = true; }
  if(prof.name && prof.name !== NAME){ NAME = prof.name; LS.set('switch_name', NAME); changed = true; }
  if(prof.approved === true) LS.set(APPROVED_KEY, 'yes');
  return changed;
}
async function refreshProfile(){ try{ return cacheProfile(await SWITCH.myProfile()); }catch(e){ if(e.notSignedIn) keyLost(); return false; } }
/* The person's check-ins from all their devices (my_checkins), merged into this phone's list by id: one made
 * here is already in it, one made elsewhere is added. The profile is refreshed too (my_profile). At most
 * every few minutes unless forced. */
let lastPull = 0;
function fromServer(r){
  const v = SWITCH.fromRecord(r);
  ['tsv','clo','met','stat','secs'].forEach(k => { if(v[k] === null) delete v[k]; });
  ['actions','notes'].forEach(k => { if(Array.isArray(v[k])) v[k] = v[k].filter(x => x !== 'none'); });   // "none" is the database's way of saying []
  return Object.assign(v, { p:PARTICIPANT, ts:new Date(r.ts).toISOString(), type:v.type || 'self', home:v.home || 'long', synced:true });
}
async function pullHistory(force){
  if(!SWITCH.live || !PARTICIPANT || !SWITCH.key()) return;
  if(!force && Date.now() - lastPull < 3*60000) return;
  lastPull = Date.now();
  try{
    const [rows, prof] = await Promise.all([SWITCH.myCheckins(), SWITCH.myProfile(), refreshPoints()]);
    let changed = cacheProfile(prof);
    if(prof && prof.approved === false){ LS.del(APPROVED_KEY); if(TABS.includes(S.screen)) go('pending'); return; }
    const have = new Set(store.votes.map(v => v.id)), server = new Set(rows.map(r => r.client_id));
    rows.forEach(r => { if(r.client_id && !have.has(r.client_id)){ store.votes.push(fromServer(r)); changed = true; } });
    const srvRow = new Map(rows.map(r => [r.client_id, r]));
    store.votes.forEach(v => { const r = srvRow.get(v.id); if(r && v.p === PARTICIPANT && r.created_at && v.created_at !== r.created_at){ v.created_at = r.created_at; changed = true; } });   // when the database got it: the points rules use it
    store.votes.forEach(v => { if(server.has(v.id) && !v.synced){ v.synced = true; changed = true; } });
    if(changed){ save(); if(TABS.includes(S.screen) && !S.lock && !sheetUp()) render(); if(DEBUG) renderTable(); }
    backfillOnce(server);
  }catch(e){ if(e.notSignedIn) keyLost(); }
}
/* Once per participant on this phone: check-ins made here that the database never got (a 0.4.0 copy of the app
 * still open when the database was updated had its check-ins refused and dropped from its queue) are queued
 * again, so nothing made in the changeover is lost. Example rows never. */
function backfillOnce(server){
  if(LS.get(BACKFILL_KEY) === PARTICIPANT) return;
  const queued = new Set(SWITCH.pending().map(r => r.client_id));
  const lost = votes().filter(v => !v.example && !v.synced && !server.has(v.id) && !queued.has(v.id) && v.ts && typeof v.tsv === 'number');
  lost.forEach(v => SWITCH.queue(SWITCH.toRecord(v, PARTICIPANT)));
  LS.set(BACKFILL_KEY, PARTICIPANT);
  if(lost.length){ refreshSync(); quiet(flushPending()); }
}
/* After joining or signing in: only an approved participant gets to Today (or to their home profile first). */
function afterIdentity(approved){
  if(approved === false){ LS.del(APPROVED_KEY); go('pending'); }
  else { LS.set(APPROVED_KEY, 'yes'); go('today'); }
}
function fieldError(id, msg){
  const f = $('#f-' + id), e = $('#err-' + id), input = $('#' + id);
  if(f) f.classList.toggle('bad', !!msg);
  if(input && input.matches && input.matches('input,select')) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  if(e){ e.hidden = !msg; e.innerHTML = msg ? ic('alert') + '<span>' + msg + '</span>' : ''; }
  if(msg){ const t = input && input.matches && input.matches('input,select') ? input : f; if(t){ if(!t.matches('input,select,button')) t.setAttribute('tabindex', '-1'); t.focus({ preventScroll:true }); t.scrollIntoView({ block:'center', behavior: reduceMotion() ? 'auto' : 'smooth' }); } }
}
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const weakPin = p => /^(\d)\1{3}$/.test(p) || ['1234','4321','0123','9876','1212','2580'].includes(p);
/* "15 minutes", "1 hour", "24 hours": how long a lock lasts (15 min, then 1 h, then 24 h after repeated locks) */
const waitWord = m => { m = Math.max(1, Math.ceil(Number(m) || 15)); if(m < 60) return `${m} minute${m===1?'':'s'}`; const h = Math.ceil(m / 60); return `${h} hour${h===1?'':'s'}`; };
const pinOutcome = r => r.status === 'wrong' ? `That PIN isn&rsquo;t right. ${r.tries_left} ${r.tries_left === 1 ? 'try' : 'tries'} left before a pause.`
  : r.status === 'locked' ? `Too many tries, so signing in is paused for ${waitWord(r.wait_min)}. Please try again after that, or ask the research team to reset your PIN.`
  : r.status === 'not_found' ? 'We could not find that email. Check the spelling, or join as new.'
  : r.status === 'weak_pin' ? 'That PIN is easy to guess. Please choose another 4 digits.' : 'Please enter your 4-digit PIN.';
let SIGNIN_CODE = false;                                    // the sign-in screen asks for the participant code (the database answered code_needed)
let SIGNIN_EMAIL = '';                                      // the email just signed in with (a join draft for it fills the profile)
/* the sign-in screen again, now with the code field, keeping what was typed */
function showCodeField(){
  const email = $('#s_email') ? $('#s_email').value : '', pin = $('#s_pin') ? $('#s_pin').value : '';
  SIGNIN_CODE = true; rerender();
  $('#s_email').value = email; $('#s_pin').value = pin;
}
/* Email and PIN. A participant without a PIN (joined with 0.4.0, or the team reset it) also needs their code:
 * "One more step" sends the code this phone holds by itself; a new device asks for it when the database says so
 * (code_needed). The PIN is checked by the database; this screen refuses an easy PIN only when one is being
 * chosen for the first time (the code field is showing), and otherwise shows the database's weak_pin answer. */
async function signin(){
  const email = $('#s_email').value.trim(), pin = ($('#s_pin').value || '').trim(), rekey = needsKey(), lost = LS.get(KEY_LOST_KEY) === '1';
  const asked = SIGNIN_CODE, typed = asked ? ($('#s_code').value || '').toUpperCase().replace(/\s+/g, '') : '';
  fieldError('s_email', ''); fieldError('s_pin', ''); if(asked) fieldError('s_code', '');
  if(!EMAIL_RE.test(email)) return fieldError('s_email', 'Please enter the email you registered with, like name@example.com.');
  if(asked && !/^P\d{2,}$/.test(typed)) return fieldError('s_code', 'Please enter your participant code: a P and its number, like P07.');
  if(!/^\d{4}$/.test(pin)) return fieldError('s_pin', 'Please enter a 4-digit PIN.');
  if(asked && weakPin(pin)) return fieldError('s_pin', 'That PIN is easy to guess. Please choose another 4 digits.');
  const b = $('[data-act="signin"]'), idle = () => { b.disabled = false; b.classList.remove('busy'); };
  b.disabled = true; b.classList.add('busy');
  try{
    if(!SWITCH.live) throw new Error('The study database is not connected yet, so signing in is not possible. Choose I&rsquo;m new here instead.');
    const sent = asked ? typed : (PARTICIPANT || null);
    const r = await SWITCH.signIn(email, pin, sent);
    if(r.status === 'code_needed'){
      idle();
      const wrong = !!sent && typeof r.tries_left === 'number';
      if(!asked) showCodeField();
      if(wrong) return fieldError('s_code', `${asked ? 'That participant code doesn&rsquo;t match.' : 'The code on this phone doesn&rsquo;t match this email: please type yours.'} ${r.tries_left} ${r.tries_left === 1 ? 'try' : 'tries'} left before a pause.`);
      return fieldError('s_code', 'This is the first time you sign in with a PIN. Please also enter your participant code, then choose your PIN.');
    }
    if(r.status !== 'ok'){ idle(); return fieldError(r.status === 'not_found' ? 's_email' : 's_pin', pinOutcome(r)); }
    SIGNIN_CODE = false; SIGNIN_EMAIL = email.toLowerCase();
    await signedIn(r);
    await Promise.race([refreshProfile(), new Promise(res => setTimeout(res, 4000))]);   // the home profile decides what comes next
    afterIdentity(r.approved);
    quiet(flushPending()); quiet(pullHistory(true)); refreshRace('week');
    showToast({ title:'Welcome' + (rekey && !lost ? '' : ' back') + (firstName() ? ', ' + esc(firstName()) : ''), sub: r.pin_set ? 'Your PIN is saved. Use it with your email on your other devices.' : 'Your check-ins from your other devices are on their way.', kind:'info', ms:6000 });
  }catch(e){ idle(); fieldError('s_email', friendly(e.message, 'Could not sign in. Check the connection and try again.')); }
}
function pendMsg(t){ const m = $('#pendMsg'); if(!m) return; m.hidden = false; m.innerHTML = ic('info') + '<div>' + t + '</div>'; }
/* Asks the database about this code: 'yes' (and remembers it), 'no' (still waiting) or 'gone'; rejects when
 * the database cannot be reached. */
async function approvalState(){
  const r = await SWITCH.approval(PARTICIPANT);
  if(r == null) return 'gone';
  if(!r.approved) return 'no';
  LS.set(APPROVED_KEY, 'yes');
  return 'yes';
}
let checking = false;
/* "Check again" on the waiting screen, and the quiet re-checks while it is open (every minute, and when the
 * app comes back to the screen). */
async function recheck(silent){
  if(checking) return; checking = true;
  const b = $('[data-act="recheck"]'); if(b) b.disabled = true;
  if(!silent) pendMsg('Checking&hellip;');
  try{
    const st = await approvalState();
    if(st === 'yes'){ checking = false; await refreshProfile(); go('today'); showToast({ title:'You&rsquo;re in!', sub:'Welcome to the study' }); quiet(flushPending()); quiet(pullHistory(true)); refreshRace('week'); return; }
    if(st === 'gone'){ checking = false; forgetIdentity(NOT_FOUND_MSG); return; }
    if(!silent) pendMsg('Not confirmed yet. Please try again a little later.');
  }catch(e){ if(!silent) pendMsg('Could not reach the study database. Try again later.'); }
  checking = false;
  const b2 = $('[data-act="recheck"]'); if(b2) b2.disabled = false;
}
/* On start: an unconfirmed code is checked in the background; Today is already showing, and only a "not
 * approved" answer swaps it for the waiting screen (a removed code goes back to the welcome screen). */
const needsApprovalCheck = () => !!PARTICIPANT && SWITCH.live && LS.get(APPROVED_KEY) !== 'yes';
async function checkApproval(){
  try{
    const st = await approvalState();
    if(st === 'yes'){ if(TABS.includes(S.screen)) render(); }
    else if(st === 'gone') forgetIdentity(NOT_FOUND_MSG);
    else if(S.screen !== 'pending' && !needsKey()) go('pending');
  }catch(e){ /* unreachable database: Today stays; the database refuses check-ins on its own */ }
}
/* The database refused a check-in or a phone for this code. Approved after all: nothing to do. Not approved:
 * the waiting screen. Not registered: the welcome screen. */
async function afterRefusal(){
  if(!PARTICIPANT) return;
  try{
    const st = await approvalState();
    if(st === 'gone') forgetIdentity(NOT_FOUND_MSG);
    else if(st === 'no'){ LS.del(APPROVED_KEY); if(S.screen !== 'pending') go('pending'); }
  }catch(e){ /* unreachable: leave things as they are */ }
}
/* An approved participant whose profile (about you and the home) is not complete: the profile wizard first.
 * Until my_profile has been read on this phone, only the home is judged. */
function needsProfile(){
  if(!PARTICIPANT || needsKey() || LS.get(APPROVED_KEY) !== 'yes') return false;
  if(SWITCH.live && !meKnown() && !LS.get(HOME_KEY)) return false;      // nothing known yet: wait for my_profile (pullHistory)
  const h = homeProfile(), known = meKnown(), r = regFromProfile(known ? meProfile() : null, h || {});
  return REG_STEPS.some((s, i) => i < REG_STEPS.length - 1 && (known || s.id !== 'you') && regProblem(i, r));
}
function startProfile(){
  const d = loadReg('profile'), j = loadReg('join');
  REG = d.code === PARTICIPANT && (d.step > 0 || d.touched) ? d : Object.assign(regFromProfile(meProfile(), homeProfile() || {}), { mode:'profile', code:PARTICIPANT });
  if(REG.step === 0 && !d.touched && j.touched && j.email && j.email.trim().toLowerCase() === SIGNIN_EMAIL){
    // typed in the join wizard before the account was found (an email of 0.4.0): those answers, over what is known
    ['name','gender','birth_year','hu','cm','ft','inch','wu','kg','st','lb','sens'].forEach(k => { if(j[k] !== '' && j[k] != null) REG[k] = j[k]; });
    REG.home = Object.assign({}, REG.home, j.home); LS.del(REG_KEY);
  }
  S.screen = 'profile'; S.hist = [];
}

/* ---------- reminders ---------- */
const HOURS_KEY = 'switch_hours';
/* Home hours: a weekday and a weekend window, plus an optional second window for each (null when unused).
 * The same eight fields go to push_subscriptions, where the sender reads them. Swansea's defaults. */
const DEFAULT_HOURS = { weekday_start:'17:00', weekday_end:'22:30', weekend_start:'09:00', weekend_end:'22:30', weekday2_start:null, weekday2_end:null, weekend2_start:null, weekend2_end:null };
const hhmm = s => { const m = hm(s); return m ? pad(m[0])+':'+pad(m[1]) : null; };
/* The saved hours, always usable: "HH:MM", a missing main bound takes the default, a main window that ends at
 * or before its start (an older version let people save "until 00:00") runs until 23:59, and a second window
 * counts only with both ends set and ending after it starts (00:00 as its end also means 23:59). The sender
 * (switch/push/send.js, insideHomeHours) reads stored hours the same way. */
function hours(){
  let h; try{ h = Object.assign({}, DEFAULT_HOURS, JSON.parse(LS.get(HOURS_KEY)||'{}')); }catch(e){ h = Object.assign({}, DEFAULT_HOURS); }
  ['weekday','weekend'].forEach(p => {
    let s = hhmm(h[p+'_start']) || DEFAULT_HOURS[p+'_start'], e = hhmm(h[p+'_end']) || DEFAULT_HOURS[p+'_end'];
    if(e <= s) e = '23:59';
    if(e <= s){ s = DEFAULT_HOURS[p+'_start']; e = DEFAULT_HOURS[p+'_end']; }
    h[p+'_start'] = s; h[p+'_end'] = e;
    const s2 = hhmm(h[p+'2_start']), e2 = hhmm(h[p+'2_end']) === '00:00' ? '23:59' : hhmm(h[p+'2_end']);
    const ok = s2 && e2 && s2 < e2;
    h[p+'2_start'] = ok ? s2 : null; h[p+'2_end'] = ok ? e2 : null;
  });
  return h;
}
let remDraft = null;                                        // unsaved hours in Settings while a second period is added or removed
/* "07:00–09:00 & 17:00–22:30", windows in order of the day */
function hoursWord(h, p){
  const w = [[h[p+'_start'], h[p+'_end']], [h[p+'2_start'], h[p+'2_end']]].filter(x => x[0] && x[1]).sort((a, b) => a[0] < b[0] ? -1 : 1);
  return w.map(x => `${x[0]}&ndash;${x[1]}`).join(' &amp; ');
}
/* Why these hours cannot be saved, or '' when they can: every period has to end after it starts (a second
 * period ending at 00:00 means until midnight, as hours() reads it). */
function hoursProblem(h){
  for(const [p, name] of [['weekday','Weekdays'], ['weekend','Weekends']]){
    if(!(h[p+'_start'] < h[p+'_end'])) return `${name}: the end time must be later than the start time. For &ldquo;until midnight&rdquo; choose 23:59.`;
    const e2 = h[p+'2_end'] === '00:00' ? '23:59' : h[p+'2_end'];
    if(h[p+'2_start'] && e2 && !(h[p+'2_start'] < e2)) return `${name}, second period: the end time must be later than the start time.`;
  }
  return '';
}
const zone = () => { try{ return Intl.DateTimeFormat().resolvedOptions().timeZone || null; }catch(e){ return null; } };
/* The service worker registration, or null when there is none within a few seconds (it failed to install). */
const swReady = () => 'serviceWorker' in navigator ? Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(() => r(null), 5000))]) : Promise.resolve(null);
/* The reminder state this phone knows: the last check-in and a pause still running. */
function personState(){
  const l = lastVote(), paused = store.paused && new Date(store.paused) > Date.now() ? store.paused : null;
  return Object.assign({ paused_until: paused }, l ? { last_vote_at: l.ts } : {});
}
/* Changes to the schedule ("I'm out", "I just got in", a check-in) wait in SCHED_KEY until the reminder
 * service confirms them, and go along with every later request: a change made offline still arrives, and an old
 * pause on the server cannot come back after the participant has said they are home. A pause or "just got in"
 * that has not arrived within the hour is dropped (the check-in time is kept): by then a newer "Not home" from
 * the notification may be on the server, and it must win. */
const SCHED_KEY = 'switch_sched', SCHED_MAX_AGE = 60*60000;
let schedSeq = 0;
function pendingSched(){
  let p = null; try{ p = JSON.parse(LS.get(SCHED_KEY) || 'null'); }catch(e){}
  if(!p || typeof p !== 'object') return {};
  const ch = Object.assign({}, p); delete ch.at;
  if(!(Date.now() - (p.at || 0) < SCHED_MAX_AGE)){ delete ch.paused_until; delete ch.settled_at; }
  return ch;
}
function schedChange(ch){
  if(PUSH.status() !== 'on') return;
  schedSeq++;
  LS.set(SCHED_KEY, JSON.stringify(Object.assign(pendingSched(), ch, { at:Date.now() })));
  quiet(PUSH.sync({}));
}
const PUSH = {
  supported: 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
  standalone: matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
  ios: /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
  configured: SWITCH.live && !!CFG.vapidPublicKey,
  status(){
    if(!this.configured) return 'unconfigured';
    if(!this.supported) return (this.ios && !this.standalone) ? 'install' : 'unsupported';
    if(Notification.permission === 'denied') return 'blocked';
    return LS.get('switch_push') === 'on' ? 'on' : 'off';
  },
  lost(){ return LS.get('switch_push_lost') === '1'; },     // reminders stopped without the participant turning them off
  subscribe(reg){ return reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: b64ToBytes(CFG.vapidPublicKey) }); },
  /* this phone in the shape save_push_subscription() takes (switch-api.js adds the device key) */
  record(sub){
    const j = sub.toJSON();
    return Object.assign({ endpoint:j.endpoint, p256dh:j.keys.p256dh, auth:j.keys.auth,
      tz:zone(), tz_offset_min:-new Date().getTimezoneOffset(), interval_min:INTERVAL, user_agent:navigator.userAgent.slice(0,200) }, hours());
  },
  async enable(){
    // Asked first, straight from the tap: iPhone only shows the question in direct response to one.
    const perm = await Notification.requestPermission();
    if(perm !== 'granted') return perm === 'denied' ? 'blocked' : 'dismissed';
    const reg = await swReady();
    if(!reg) throw new Error('Reminders could not start on this phone. Close the app, open it again and try once more.');
    const sub = await this.subscribe(reg);
    const saved = await SWITCH.saveSubscription(this.record(sub));
    if(saved === 'not_signed_in'){ keyLost(); throw new Error('This phone needs to sign in again first.'); }
    if(saved === 'refused'){ quiet(afterRefusal()); throw new Error('The study database did not accept this phone. Please contact the research team.'); }
    if(saved === 'invalid') throw new Error('Reminders don&rsquo;t work in this browser. On Android use Chrome; on iPhone use Safari and add the app to your Home Screen.');
    if(saved === 'full') throw new Error('Too many phones are registered for reminders under your code. Please contact the research team.');
    if(saved !== true) throw new Error('This phone could not be registered. Check the connection and try again.');
    LS.set('switch_push','on'); LS.del('switch_push_lost');
    quiet(this.sync(personState()));                        // no reminder during a pause or right after a check-in
    return 'on';
  },
  async disable(){
    try{ const reg = await swReady(); const sub = reg && await reg.pushManager.getSubscription(); if(sub){ await SWITCH.updateSchedule(sub.endpoint, { enabled:false }); await sub.unsubscribe(); } }catch(e){}
    LS.set('switch_push','off'); LS.del('switch_push_lost'); LS.del(SCHED_KEY);
  },
  /* Sends schedule changes for this phone to the reminder service (update_push_schedule), with the phone's time
   * zone and any change still waiting in SCHED_KEY, and keeps the registration healthy: when the service no
   * longer knows this phone and the participant is still in the study, the phone subscribes afresh and
   * registers again; when even that is impossible, reminders show as stopped, so the participant can turn them
   * on again (a failed attempt is not repeated on every open: switch_push turns off). A participant who has been
   * removed or is no longer approved gets the waiting or welcome screen instead. Resolves to the phone's state
   * on the server ({ found:true, enabled, paused_until, settled_at }), or null when nothing could be confirmed. */
  async sync(changes){
    if(this.status() !== 'on' || !SWITCH.key()) return null;   // no device key (a 0.4.0 phone before "One more step"): nothing to repair with, try again once signed in
    const reg = await swReady(); if(!reg) return null;
    const pend = LS.get(SCHED_KEY);
    const body = Object.assign({ tz:zone(), tz_offset_min:-new Date().getTimezoneOffset() }, pendingSched(), changes || {});
    const done = st => { if(st && st.found && LS.get(SCHED_KEY) === pend) LS.del(SCHED_KEY); return st; };
    let sub = null; try{ sub = await reg.pushManager.getSubscription(); }catch(e){}
    const st = sub ? await SWITCH.updateSchedule(sub.endpoint, body) : { found:false };
    if(!st || st.found) return done(st);
    let ap; try{ ap = await SWITCH.approval(PARTICIPANT); }catch(e){ return null; }
    const stop = () => { LS.set('switch_push','off'); LS.del(SCHED_KEY); quiet(afterRefusal()); return null; };
    const lostIt = () => { LS.set('switch_push','off'); LS.set('switch_push_lost','1'); return null; };
    if(!ap || !ap.approved) return stop();
    try{
      if(sub) await sub.unsubscribe().catch(()=>{});
      sub = await this.subscribe(reg);
    }catch(e){ return lostIt(); }
    const saved = await SWITCH.saveSubscription(this.record(sub));
    if(saved === 'refused') return stop();
    if(saved === 'not_signed_in'){ lostIt(); keyLost(); return null; }
    if(saved === 'full' || saved === 'invalid') return lostIt();
    if(saved !== true) return null;
    return done(await SWITCH.updateSchedule(sub.endpoint, Object.assign(personState(), body)));
  }
};
let lastSync = 0;
/* When the app opens or comes back to the screen (at most every few minutes): tells the reminder service the
 * phone's time zone, home hours and last check-in, sends any change still waiting, repairs a registration the
 * service has lost, and picks up a pause set from the notification's "Not home" button. */
async function syncReminders(){
  if(!PARTICIPANT || PUSH.status() !== 'on' || Date.now() - lastSync < 5*60000) return;
  lastSync = Date.now();
  const seq = schedSeq, l = lastVote(), h = hours();
  const st = await PUSH.sync(Object.assign({ enabled:true }, hoursProblem(h) ? {} : h, l ? { last_vote_at:l.ts } : {}));
  let changed = PUSH.status() !== 'on';
  const until = st && st.found && st.paused_until ? new Date(st.paused_until) : null;
  if(seq === schedSeq && until && until > Date.now() && !(store.paused && new Date(store.paused) >= until)){
    store.paused = until.toISOString(); store.pausedWhy = 'away'; save(); changed = true;
  }
  if(changed && (S.screen==='today' || S.screen==='settings')) rerender();
}
function b64ToBytes(s){ const p = '='.repeat((4 - s.length % 4) % 4); const b = atob((s + p).replace(/-/g,'+').replace(/_/g,'/')); return Uint8Array.from(b, c => c.charCodeAt(0)); }
/* Settings, reminders: what this phone can do, the home hours and the buttons */
function remindersSection(){
  const st = PUSH.status(), h = remDraft || hours();
  const tin = (id, v, lab) => `<input type="time" class="time-in" id="${id}" value="${esc(v||'')}" aria-label="${lab}">`;
  /* one day type: its from/until row, then either the optional second period (with a remove control) or the link that adds one */
  const grp = (p, name, ids) => `<div class="hrow"><label class="hl" for="${ids[0]}">${name}</label>${tin(ids[0], h[p+'_start'], name+' from')}<span class="to">to</span>${tin(ids[1], h[p+'_end'], name+' until')}<span class="hx"></span></div>` +
    (h[p+'2_start'] || h[p+'2_end']
      ? `<div class="hrow"><label class="hl" for="${ids[2]}">and</label>${tin(ids[2], h[p+'2_start'], name+', second period, from')}<span class="to">to</span>${tin(ids[3], h[p+'2_end'], name+', second period, until')}<button class="hx" data-act="rm-win" data-w="${p}" aria-label="Remove the second ${name.toLowerCase()} period">${ic('x')}</button></div>`
      : `<div class="hrow"><button class="addw" data-act="add-win" data-w="${p}">+ Add another period</button></div>`);
  const form = `<div class="hours"><div class="lab">When are you usually at home?</div>${grp('weekday', 'Weekdays', ['h_ws','h_we','h_ws2','h_we2'])}${grp('weekend', 'Weekends', ['h_es','h_ee','h_es2','h_ee2'])}
      <p class="note">Reminders only arrive inside these hours, never within ${GAP_MIN} minutes of a check-in, and not while you&rsquo;ve said you&rsquo;re out.</p></div>`;
  const msg = `<div class="msg" id="remMsg" role="status" hidden></div>`;
  const title = `<div class="card-head"><b class="card-t" id="remH">Reminders</b>${st==='on' ? `<span class="pill on">${ic('check')}On</span>` : ''}</div>`;
  if(studyOver()) return title + `<div class="msg">${ic('checkc')}<div>The study has ended, so reminders have stopped. Thank you for taking part.</div></div>`;
  if(st === 'install') return title + `<ol class="steps"><li><div>Tap the <b>Share</b> button ${ic('share','inl')} in Safari.</div></li><li><div>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</div></li><li><div>Open ${APP} from your Home Screen, choose <b>I have registered before</b> and sign in with your email and PIN.</div></li><li><div>Turn on notifications there.</div></li></ol><p class="note">Your check-ins come with you.</p>`;
  if(st === 'unsupported' || st === 'blocked') return title + `<div class="msg${st === 'blocked' ? ' warn' : ''}">${ic('bellOff')}<div><b>${notifHelp(st).title}.</b></div></div><div class="nt-body">${notifHelp(st).html}</div>`;
  if(st === 'unconfigured') return title + `<div class="msg">${ic('info')}<div>Reminders start once the study database is connected. Your home hours are saved on this phone now.</div></div>` + form + msg + `<button class="btn primary" data-act="save-hours">Save hours</button>`;
  // Off: notifications first, with one tap (the hours saved so far, or Swansea's defaults); the hours come once they are on.
  if(st === 'off') return title + `<div class="msg ${PUSH.lost() ? 'warn' : ''}">${ic(PUSH.lost() ? 'alert' : 'info')}<div>${PUSH.lost() ? 'Notifications have stopped on this phone. Turn them on again.' : 'The study needs notifications: they remind you to check in. Turn them on, then choose your hours here.'}</div></div>` + msg + `<button class="btn primary" data-act="notif-on">${ic('bell')} Turn on notifications</button><p class="note center">${daysWord(hours())} to start with.</p>`;
  return title + form + msg + `<button class="btn primary" data-act="save-hours">Save hours</button><button class="btn link" data-act="push-off">${ic('bellOff')} Turn off reminders</button>`;
}
/* The eight hour fields as the form shows them: the main windows fall back to the defaults, a second window is
 * null unless its row is present and both ends are filled in. */
function readHours(){
  const val = id => { const el = $('#'+id); return el && el.value ? el.value : null; };
  const pair = (a, b) => { const s = val(a), e = val(b); return s && e ? [s, e] : [null, null]; };
  const h = { weekday_start: val('h_ws') || DEFAULT_HOURS.weekday_start, weekday_end: val('h_we') || DEFAULT_HOURS.weekday_end, weekend_start: val('h_es') || DEFAULT_HOURS.weekend_start, weekend_end: val('h_ee') || DEFAULT_HOURS.weekend_end };
  [h.weekday2_start, h.weekday2_end] = pair('h_ws2', 'h_we2');
  [h.weekend2_start, h.weekend2_end] = pair('h_es2', 'h_ee2');
  return h;
}
function remMsg(t, kind){ const m = $('#remMsg'); if(!m) return; m.hidden = false; m.className = 'msg' + (kind==='ok' ? ' ok' : kind==='warn' ? ' warn' : ''); m.innerHTML = ic(kind==='ok' ? 'checkc' : 'alert') + '<div>' + t + '</div>'; }

/* ---------- the join wizard (and the same steps for the profile of a 0.4.0 participant, and My home) ----------
 * Nine steps, one screen each; every answer is saved to the draft at once (never the PIN). REG.mode:
 * 'join' (a new participant: the last step sets the PIN and joins), 'profile' (a participant without a
 * complete profile: the last step saves it with update_my_profile). The 'homeedit' screen shows one step of
 * it from My home and saves that. Everything is stored metric. */
const REG_STEPS = [
  {id:'you',     ic:'user',    t:'About you',               min:1.2},
  {id:'area',    ic:'pin',     t:'Your area and home',      min:0.7},
  {id:'size',    ic:'ruler',   t:'Age and size',            min:0.8},
  {id:'people',  ic:'users',   t:'Who lives here',          min:0.5},
  {id:'heat',    ic:'flame',   t:'Heating',                 min:0.8},
  {id:'controls',ic:'stat',    t:'Heating controls',        min:0.7},
  {id:'fabric',  ic:'wall',    t:'Walls, roof and windows', min:0.8},
  {id:'bedroom', ic:'compass', t:'Your bedroom',            min:1.2},
  {id:'check',   ic:'check',   t:'Check and finish',        min:0.4}
];
const HOME_KEYS = ['postcode_area','home_type','flat_position','tenure','year_built','floors','bedrooms','floor_area_m2','epc','adults','children','pets','bedroom_share',
  'main_heating','other_heaters','heating_pattern','payment','controls','stat_display','setpoint_c','bedroom_trv','wall_insulation','loft','glazing','windows_open','damp',
  'bedroom_facing','bedroom_facing_deg','bedroom_side','bedroom_side_deg'];
const stepOf = id => Math.max(0, REG_STEPS.findIndex(s => s.id === id));
const regFresh = mode => ({ v:1, mode: mode || 'join', code:'', step:0, touched:false, areaTxt:'', name:'', email:'', gender:'', birth_year:'', hu:'cm', cm:'', ft:'', inch:'', wu:'kg', kg:'', st:'', lb:'', sens:null, home:{}, edit:false, pin:'', pin2:'' });
function loadReg(mode){ try{ const r = JSON.parse(LS.get(REG_KEY) || 'null'); if(r && r.v === 1 && r.home && r.mode === mode) return Object.assign(regFresh(mode), r, { step: Math.max(0, Math.min(REG_STEPS.length-1, r.step|0)), pin:'', pin2:'' }); }catch(e){} return regFresh(mode); }
let REG = regFresh('join');
function saveReg(){ if(S.screen === 'homeedit') return; REG.touched = true; LS.set(REG_KEY, JSON.stringify(Object.assign({}, REG, { pin:'', pin2:'', edit:false }))); }   // the PIN is never kept in the draft
const isFlat = () => REG.home.home_type === 'flat';
const numOf = s => { const n = parseFloat(String(s ?? '').replace(',', '.')); return isFinite(n) ? n : null; };
const blank = s => String(s ?? '').trim() === '';
/* the wizard's fields from a profile (my_profile, and the home) */
function regFromProfile(me, h){
  me = me || {}; const r = regFresh('profile');
  r.name = me.name || NAME || ''; r.gender = me.gender || ''; r.birth_year = me.birth_year ? String(me.birth_year) : '';
  r.cm = typeof me.height_cm === 'number' ? String(Math.round(me.height_cm)) : ''; r.kg = typeof me.weight_kg === 'number' ? String(me.weight_kg) : '';
  r.sens = me.sensitivity || null;
  r.home = JSON.parse(JSON.stringify(h || {}));
  return r;
}
/* height and weight in metric from what was typed (cm, or feet and inches; kg, or stone and pounds) */
function regFieldsOf(r){
  let height_cm = null, weight_kg = null;
  if(r.hu === 'ftin'){ const ft = numOf(r.ft), inch = numOf(r.inch); if(ft !== null || inch !== null) height_cm = Math.round(((ft||0)*12 + (inch||0)) * 2.54 * 10) / 10; }
  else height_cm = numOf(r.cm);
  if(r.wu === 'stlb'){ const st = numOf(r.st), lb = numOf(r.lb); if(st !== null || lb !== null) weight_kg = Math.round(((st||0)*14 + (lb||0)) * 0.45359237 * 10) / 10; }
  else weight_kg = numOf(r.kg);
  const by = numOf(r.birth_year), h = r.home || {}, home = {};
  HOME_KEYS.forEach(k => { if(h[k] !== undefined && h[k] !== '') home[k] = Array.isArray(h[k]) ? [...h[k]] : h[k]; });
  if(home.home_type !== 'flat') delete home.flat_position;
  if(home.postcode_area) home.postcode_area = String(home.postcode_area).toUpperCase().replace(/\s+/g, '');
  return { email: (r.email || '').trim(), name: (r.name || '').trim().replace(/\s+/g, ' '), gender: r.gender || null, birth_year: by !== null ? Math.round(by) : null,
    height_cm, weight_kg, sensitivity: r.sens || null, home };
}
const regFields = () => regFieldsOf(REG);
/* switching units converts what has been typed so far */
function convertUnits(kind, to){
  const r = REG;
  if(kind === 'h' && r.hu !== to){
    if(to === 'ftin'){ const cm = numOf(r.cm); if(cm !== null){ const t = Math.round(cm / 2.54); r.ft = String(Math.floor(t / 12)); r.inch = String(t % 12); } }
    else { const ft = numOf(r.ft), inch = numOf(r.inch); if(ft !== null || inch !== null) r.cm = String(Math.round(((ft||0)*12 + (inch||0)) * 2.54)); }
    r.hu = to;
  }
  if(kind === 'w' && r.wu !== to){
    if(to === 'stlb'){ const kg = numOf(r.kg); if(kg !== null){ const lb = Math.round(kg / 0.45359237); r.st = String(Math.floor(lb / 14)); r.lb = String(lb % 14); } }
    else { const st = numOf(r.st), lb = numOf(r.lb); if(st !== null || lb !== null) r.kg = String(Math.round(((st||0)*14 + (lb||0)) * 0.45359237 * 10) / 10); }
    r.wu = to;
  }
}
/* friendly checks before leaving a step: [field id, message] or null. Every question needs an answer ("Not
 * sure" counts). */
function regProblem(step, r){
  r = r || REG;
  const y = new Date().getFullYear(), id = REG_STEPS[step].id, H = r.home || {}, num = k => typeof H[k] === 'number', mode = r.mode;
  if(id === 'you'){
    if((r.name || '').trim().length < 2) return ['r_name', 'Please enter your name.'];
    if(mode === 'join' && !EMAIL_RE.test((r.email || '').trim())) return ['r_email', 'Please enter an email address, like name@example.com.'];
    if(!r.gender) return ['r_gender', 'Please choose one. &ldquo;Prefer not to say&rdquo; is fine.'];
    const by = numOf(r.birth_year);
    if(blank(r.birth_year)) return ['r_year', 'Please enter the year you were born.'];
    if(by === null || by % 1 || by < 1900 || by > y) return ['r_year', 'Please enter the year as four digits, like 1985.'];
    if(by > y - 18) return ['r_year', 'You need to be 18 or over to take part.'];
    if(r.hu === 'ftin'){
      const ft = numOf(r.ft), inch = numOf(r.inch);
      if(blank(r.ft)) return ['r_ft', 'Please enter your height in feet and inches.'];
      if(ft === null || ft < 3 || ft > 8 || (!blank(r.inch) && (inch === null || inch < 0 || inch >= 12))) return ['r_ft', 'Please check your height: feet from 3 to 8, inches from 0 to 11.'];
    } else {
      const cm = numOf(r.cm);
      if(blank(r.cm)) return ['r_cm', 'Please enter your height in centimetres.'];
      if(cm === null || cm < 100 || cm > 250) return ['r_cm', 'Please check your height: between 100 and 250 cm.'];
    }
    if(r.wu === 'stlb'){
      const st = numOf(r.st), lb = numOf(r.lb);
      if(blank(r.st)) return ['r_st', 'Please enter your weight in stone and pounds.'];
      if(st === null || st < 4 || st > 47 || (!blank(r.lb) && (lb === null || lb < 0 || lb >= 14))) return ['r_st', 'Please check your weight: stone from 4 to 47, pounds from 0 to 13.'];
    } else {
      const kg = numOf(r.kg);
      if(blank(r.kg)) return ['r_kg', 'Please enter your weight in kilograms.'];
      if(kg === null || kg < 30 || kg > 300) return ['r_kg', 'Please check your weight: between 30 and 300 kg.'];
    }
    if(!r.sens) return ['sens', 'Please choose the one that sounds most like you.'];
  }
  if(id === 'area'){
    const pc = String(H.postcode_area || '').toUpperCase().replace(/\s+/g, '');
    if(!pc) return ['r_pc', 'Please enter the first half of your postcode, like SA1.'];
    if(!POSTCODE_AREA_RE.test(pc)) return ['r_pc', 'Please enter only the first half of your postcode: letters then numbers, like SA1 or CF10.'];
    if(!HOME_TYPES.some(o => o.id === H.home_type)) return ['home_type', 'Please pick the closest match.'];
    if(H.home_type === 'flat' && !FLAT_POS.some(o => o.id === H.flat_position)) return ['flat_position', 'Please choose which floor your flat is on.'];
    if(!H.tenure) return ['tenure', 'Please choose one.'];
  }
  if(id === 'size'){
    if(!H.year_built) return ['year', 'Please choose when it was built, or &ldquo;Not sure&rdquo;.'];
    if(!H.floors) return ['floors', 'Please choose how many floors.'];
    if(!num('bedrooms')) return ['bedrooms', 'Please choose how many bedrooms.'];
    if(H.floor_area_m2 === undefined) return ['area', blank(r.areaTxt) ? 'Please type the floor area in square metres, or tap &ldquo;Not sure&rdquo;.' : 'Please type the floor area as a number of square metres, like 85.'];
    if(H.floor_area_m2 !== null && !(H.floor_area_m2 >= 20 && H.floor_area_m2 <= 300)) return ['area', 'Please check the floor area: between 20 and 300 m².'];
    if(!H.epc) return ['epc', 'Please choose the rating, or &ldquo;I don&rsquo;t know&rdquo;.'];
  }
  if(id === 'people'){
    if(!num('adults') || !num('children') || !num('pets')) return ['people', 'Please set adults, children and pets. Tap &minus; for none.'];
    if(!num('bedroom_share')) return ['bedroom_share', 'Please choose one.'];
  }
  if(id === 'heat'){
    if(!H.main_heating) return ['main_heating', 'Please choose your main heating, or &ldquo;Not sure&rdquo;.'];
    if(!(Array.isArray(H.other_heaters) && H.other_heaters.length)) return ['other_heaters', 'Please choose any you use, or &ldquo;None of these&rdquo;.'];
    if(!H.heating_pattern) return ['heating_pattern', 'Please choose the one closest to how it&rsquo;s used.'];
    if(!H.payment) return ['payment', 'Please choose one.'];
  }
  if(id === 'controls'){
    if(!(Array.isArray(H.controls) && H.controls.length)) return ['controls', 'Please choose any you have, or &ldquo;None of these&rdquo;.'];
    if(!H.stat_display) return ['stat_display', 'Please choose one.'];
    if(H.setpoint_c === undefined) return ['setpoint', 'Please set the usual temperature, or tap &ldquo;Not sure&rdquo;.'];
    if(!H.bedroom_trv) return ['bedroom_trv', 'Please choose one.'];
  }
  if(id === 'fabric'){
    if(!H.wall_insulation) return ['wall_insulation', 'Please choose one, or &ldquo;Not sure&rdquo;.'];
    if(!H.loft) return ['loft', 'Please choose one, or &ldquo;Not sure&rdquo;.'];
    if(!H.glazing) return ['glazing', 'Please choose one, or &ldquo;Not sure&rdquo;.'];
    if(!H.windows_open) return ['windows_open', 'Please choose one.'];
    if(!(Array.isArray(H.damp) && H.damp.length)) return ['damp', 'Please choose where, or &ldquo;No&rdquo;.'];
  }
  if(id === 'bedroom'){
    if(!H.bedroom_facing) return ['bedroom_facing', 'Please tap a direction, or &ldquo;Not sure&rdquo;.'];
    if(!H.bedroom_side) return ['bedroom_side', 'Please tap a direction, or &ldquo;Not sure&rdquo;.'];
  }
  if(id === 'check' && mode === 'join'){
    if(!/^\d{4}$/.test(r.pin || '')) return ['r_pin', 'Please choose a 4-digit PIN.'];
    if(weakPin(r.pin)) return ['r_pin', 'That PIN is easy to guess. Please choose another.'];
    if(r.pin2 !== r.pin) return ['r_pin2', 'The two PINs are not the same.'];
  }
  return null;
}
function regGo(step){ REG.step = step; saveReg(); render(); }
function regNext(){
  const p = regProblem(REG.step);
  if(p) return fieldError(p[0], p[1]);
  const last = REG_STEPS.length - 1;
  if(S.screen === 'homeedit') return saveHome();
  if(REG.step === last){
    const gap = REG_STEPS.findIndex((s, i) => i < last && regProblem(i));
    if(gap >= 0){ const q = regProblem(gap); REG.edit = true; regGo(gap); return fieldError(q[0], q[1]); }
    return REG.mode === 'join' ? regJoin() : saveProfile();
  }
  if(REG.edit){ REG.edit = false; return regGo(last); }
  regGo(REG.step + 1);
}
function regBack(){
  if(REG.edit){ REG.edit = false; return regGo(REG_STEPS.length - 1); }
  if(REG.step > 0) return regGo(REG.step - 1);
  if(S.screen === 'join'){ saveReg(); go('welcome'); }
  // the profile's first step has nothing before it
}
const busy = (b, on) => { if(!b) return; b.disabled = on; b.classList.toggle('busy', on); };
async function regJoin(){
  const b = $('[data-act="reg-next"]'), f = regFields();
  fieldError('join', '');
  busy(b, true);
  try{
    if(!SWITCH.live){
      setIdentity(LOCAL_CODE, f.name); finishJoin(f);
      afterIdentity(true); showToast({ title:'Welcome to the study!', sub:'Local mode: everything stays on this phone' }); return;
    }
    const r = await SWITCH.register(Object.assign({}, f, { pin: REG.pin }));
    if(r.status !== 'ok'){ busy(b, false);
      if(r.status === 'weak_pin') return fieldError('r_pin', pinOutcome(r));
      if(r.status === 'code_needed'){                       // an account without a PIN (0.4.0): sign in with the code; this draft fills their profile afterwards
        saveReg(); S.hist = ['welcome']; go('signin'); SIGNIN_CODE = true; rerender();
        $('#s_email').value = f.email; $('#s_pin').value = REG.pin || '';
        return fieldError('s_code', 'You already have an account. Please enter your participant code once, and your new PIN.');
      }
      return fieldError('join', r.status === 'locked' ? 'This email is already registered. ' + pinOutcome(r) : 'This email is already registered, with a different PIN. Use the PIN you chose before, or go back and sign in.'); }
    await signedIn(r);
    if(r.is_new === false){
      // the email was registered already (a participant of 0.4.0, say): what was typed here completes their profile
      const hasHome = r.home && typeof r.home === 'object' && Object.keys(r.home).length;
      if(!hasHome){ try{ cacheProfile(await SWITCH.updateMyProfile(profileFieldsOf(f), f.home)); }catch(e){} }
      else await refreshProfile();
      finishJoin(null);
      afterIdentity(r.approved);
      showToast({ title:'Welcome back', sub:'That email was already registered, so we signed you in', kind:'info' });
      quiet(pullHistory(true)); refreshRace('week');
      return;
    }
    finishJoin(f);
    afterIdentity(r.approved);
  }catch(e){ busy(b, false); fieldError('join', friendly(e.message, 'Could not join. Check the connection and try again.')); }
}
const profileFieldsOf = f => ({ name:f.name, gender:f.gender, birth_year:f.birth_year, height_cm:f.height_cm, weight_kg:f.weight_kg, sensitivity:f.sensitivity });
function finishJoin(f){
  if(f){
    LS.set(HOME_KEY, JSON.stringify(f.home));
    const me = Object.assign(meProfile(), profileFieldsOf(f), { code:PARTICIPANT }); LS.set(ME_KEY, JSON.stringify(me));
  }
  LS.del(REG_KEY); REG = regFresh('join');
}
/* the profile wizard's last step, and one section edited from My home: update_my_profile */
async function saveProfileRow(){
  const f = regFields(), fields = profileFieldsOf(f);
  if(!SWITCH.live){ LS.set(HOME_KEY, JSON.stringify(f.home)); LS.set(ME_KEY, JSON.stringify(Object.assign(meProfile(), fields, { code:PARTICIPANT }))); NAME = f.name; LS.set('switch_name', NAME); return; }
  const row = await SWITCH.updateMyProfile(fields, f.home);
  if(!cacheProfile(row) && row && row.home){ /* unchanged */ }
  if(!row){ LS.set(HOME_KEY, JSON.stringify(f.home)); LS.set(ME_KEY, JSON.stringify(Object.assign(meProfile(), fields))); }
}
async function saveProfile(){
  const b = $('[data-act="reg-next"]');
  fieldError('join', ''); busy(b, true);
  try{
    await saveProfileRow();
    LS.del(REG_KEY); REG = regFresh('join');
    go('today'); showToast({ title:'Thank you!', sub:'Your home profile is saved' });
  }catch(e){ busy(b, false); if(e.notSignedIn) return keyLost(); fieldError('join', friendly(e.message, 'Could not save. Check the connection and try again.')); }
}
async function saveHome(){
  const b = $('[data-act="reg-next"]');
  fieldError('join', ''); busy(b, true);
  try{
    await saveProfileRow();
    S.hist.pop(); S.screen = 'myhome'; render();
    showToast({ title:'Saved', sub:'Your home profile is up to date' });
  }catch(e){ busy(b, false); if(e.notSignedIn) return keyLost(); fieldError('join', friendly(e.message, 'Could not save. Check the connection and try again.')); }
}
function minutesLeft(){
  const m = REG_STEPS.slice(REG.step).reduce((s, x) => s + x.min, 0);
  return REG.step === REG_STEPS.length - 1 ? 'Last step' : m < 1 ? 'Less than a minute left' : `About ${Math.round(m)} minute${Math.round(m)===1?'':'s'} left`;
}
/* ---- pieces of the wizard ---- */
const regTile = (k, o, on, artHtml, cls='') => `<button class="ptile ${cls} ${on?'on':''}" type="button" role="radio" aria-checked="${on}" aria-label="${o.n.replace(/<[^>]+>/g,'')}${o.h ? ', ' + o.h : ''}" data-act="reg-pick" data-k="${k}" data-v="${o.id}">${artHtml ? `<span class="pt-art">${artHtml}</span>` : ''}<b>${o.n}</b>${o.h?`<small>${o.h}</small>`:''}<span class="tick">${ic('check')}</span></button>`;
const regMulti = (k, o, on, artHtml) => `<button class="ptile ${on?'on':''}" type="button" aria-pressed="${on}" data-act="reg-toggle" data-k="${k}" data-v="${o.id}">${artHtml ? `<span class="pt-art">${artHtml}</span>` : ''}<b>${o.n}</b>${o.h?`<small>${o.h}</small>`:''}<span class="tick">${ic('check')}</span></button>`;
const groupErr = id => `<p class="err" id="err-${id}" hidden></p>`;
const fieldBlock = (id, title, hint, body) => `<div class="field rq" id="f-${id}" role="group" aria-labelledby="lab-${id}"><div class="rq-head"><b id="lab-${id}">${title}</b>${hint ? `<p class="note">${hint}</p>` : ''}</div>${body}${groupErr(id)}</div>`;
const tiles = (cols, inner, label, multi) => `<div class="ptiles c${cols}" ${multi ? 'role="group"' : 'role="radiogroup"'} aria-label="${label}">${inner}</div>`;
const pick1 = (k, list, artFn, cols, label, cls='') => { const v = k.startsWith('home.') ? REG.home[k.slice(5)] : REG[k]; return tiles(cols, list.map(o => regTile(k, o, v === o.id, artFn ? artFn(o) : '', cls)).join(''), label); };
const pickN = (k, list, artFn, cols, label) => { const v = REG.home[k.slice(5)] || []; return tiles(cols, list.map(o => regMulti(k, o, v.includes(o.id), artFn ? artFn(o) : '')).join(''), label, true); };
/* A count of the home profile. Until it is tapped it shows "–" and stays out of the profile (not answered). A
 * button at its limit stays focusable (aria-disabled, not disabled), so focus is not lost when it is redrawn. */
const STEP_LIMITS = { adults:[1,8], children:[0,8], pets:[0,8] };
function stepper(k, val, min, max, aria){
  const set = typeof val === 'number', off = on => on ? 'aria-disabled="true"' : '';
  const shown = set ? (val >= max ? max + '+' : val) : '<span class="unset" aria-hidden="true">&ndash;</span><span class="sr">Not answered</span>';
  return `<div class="stepper" role="group" aria-label="${aria}"><button class="pm" data-act="reg-step" data-k="${k}" data-d="-1" aria-label="Fewer ${aria.toLowerCase()}" ${off(set && val <= min)}>${ic('minus')}</button><output aria-live="polite">${shown}</output><button class="pm" data-act="reg-step" data-k="${k}" data-d="1" aria-label="More ${aria.toLowerCase()}" ${off(set && val >= max)}>${ic('plus')}</button></div>`;
}
const firstStep = (key, d) => { const [mn] = STEP_LIMITS[key]; return d < 0 ? mn : Math.max(mn, 1); };
/* the usual thermostat setting: a dial 10-28 °C in halves (the value is kept in °C), or "Not sure" */
const DIAL = { min:10, max:28, step:0.5 }, DIAL_DEFAULT = 20;
function dialHtml(k, title){
  const v = REG.home[k], set = typeof v === 'number', unsure = v === null;
  return `<div class="dial-card${set ? '' : ' unset'}"><div class="dial" id="dial-${k}" data-k="${k}" role="slider" tabindex="0" aria-label="${title}" aria-valuemin="${DIAL.min}" aria-valuemax="${DIAL.max}" ${set ? `aria-valuenow="${v}" aria-valuetext="${v} degrees Celsius"` : 'aria-valuetext="Not set"'}>
      <svg viewBox="0 0 150 140" aria-hidden="true" focusable="false"><path class="dial-track" d=""/><path class="dial-fill" d=""/><circle class="dial-knob" r="11"/>
        <text class="dial-num" x="75" y="78" text-anchor="middle"></text><text class="dial-unit" x="75" y="98" text-anchor="middle"></text>
        <text class="dial-end" x="34" y="136" text-anchor="middle">${DIAL.min}</text><text class="dial-end" x="116" y="136" text-anchor="middle">${DIAL.max}</text></svg></div>
    <div class="dial-side"><b>${title}</b><span class="note dial-hint">${set ? 'Drag the dial or use &minus; and +' : unsure ? 'Marked as not sure' : 'Tap &minus; or + to set it'}</span>
      <span class="dial-pm"><button class="pm" data-act="reg-dial" data-k="${k}" data-d="-1" aria-label="Lower">${ic('minus')}</button><button class="pm" data-act="reg-dial" data-k="${k}" data-d="1" aria-label="Higher">${ic('plus')}</button></span>
      <button class="chip ${unsure ? 'on' : ''}" aria-pressed="${unsure}" data-act="reg-unsure" data-k="${k}">${ic('check')}Not sure / no thermostat</button></div></div>`;
}
const DIAL_A0 = 135, DIAL_SWEEP = 270, DIAL_R = 54, DCX = 75, DCY = 72;
const dialPt = a => [DCX + DIAL_R * Math.cos(a * Math.PI / 180), DCY + DIAL_R * Math.sin(a * Math.PI / 180)];
const arc = (a0, a1) => { const [x0, y0] = dialPt(a0), [x1, y1] = dialPt(a1); return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${DIAL_R} ${DIAL_R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; };
function paintDial(el){
  const k = el.dataset.k, v = REG.home[k], set = typeof v === 'number';
  const shown = set ? Math.max(DIAL.min, Math.min(DIAL.max, v)) : (DIAL.min + DIAL.max) / 2;
  const t = (shown - DIAL.min) / (DIAL.max - DIAL.min), a = DIAL_A0 + DIAL_SWEEP * t;
  el.querySelector('.dial-track').setAttribute('d', arc(DIAL_A0, DIAL_A0 + DIAL_SWEEP));
  el.querySelector('.dial-fill').setAttribute('d', set && t > 0.001 ? arc(DIAL_A0, a) : '');
  const [kx, ky] = dialPt(a), knob = el.querySelector('.dial-knob'); knob.setAttribute('cx', kx.toFixed(2)); knob.setAttribute('cy', ky.toFixed(2));
  el.querySelector('.dial-num').textContent = set ? shown.toFixed(1) + '°' : '–';
  el.querySelector('.dial-unit').textContent = set ? 'SET TO' : (v === null ? 'NOT SURE' : 'NOT SET');
  if(set){ el.setAttribute('aria-valuenow', String(shown)); el.setAttribute('aria-valuetext', `${shown} degrees Celsius`); }
  else { el.removeAttribute('aria-valuenow'); el.setAttribute('aria-valuetext', v === null ? 'Not sure' : 'Not set'); }
  el.closest('.dial-card').classList.toggle('unset', !set);
}
function setDial(k, shown){
  shown = Math.max(DIAL.min, Math.min(DIAL.max, Math.round(shown / DIAL.step) * DIAL.step));
  REG.home[k] = shown; saveReg();
  const el = $('#dial-' + k); if(el) paintDial(el);
  const chip = $(`[data-act="reg-unsure"][data-k="${k}"]`); if(chip){ chip.setAttribute('aria-pressed', 'false'); chip.classList.remove('on'); }
  const hint = el && el.closest('.dial-card').querySelector('.dial-hint'); if(hint) hint.textContent = 'Drag the dial or use − and +';
  const f = $('#f-setpoint'); if(f && f.classList.contains('bad')) fieldError('setpoint', '');
}
function stepDial(k, d){ const v = REG.home[k]; if(typeof v !== 'number') return setDial(k, DIAL_DEFAULT); setDial(k, v + d * DIAL.step); }
function dialFromPointer(el, e, start){
  const r = el.querySelector('svg').getBoundingClientRect(), sx = r.width / 150, sy = r.height / 140;
  const dx = (e.clientX - r.left) / sx - DCX, dy = (e.clientY - r.top) / sy - DCY;
  if(start){ const d = Math.hypot(dx, dy); if(d < DIAL_R - 22 || d > DIAL_R + 24) return false; }   // only a press on the ring itself
  let a = Math.atan2(dy, dx) * 180 / Math.PI; if(a < 0) a += 360;
  let rel = (a - DIAL_A0 + 360) % 360; if(rel > DIAL_SWEEP) rel = rel > DIAL_SWEEP + 45 ? 0 : DIAL_SWEEP;
  setDial(el.dataset.k, DIAL.min + (DIAL.max - DIAL.min) * rel / DIAL_SWEEP);
  return true;
}
/* A compass of eight directions for one direction question (k: bedroom_facing or bedroom_side), the optional
 * degrees read from the phone's own compass app (which also picks the direction) and "Not sure". No sensor. */
const dir8 = h => FACING[Math.round((((h % 360) + 360) % 360) / 45) % 8];
function compass(k, title){
  const v = REG.home[k], deg = REG.home[k + '_deg'];
  const ringHtml = `<div class="compass" role="radiogroup" aria-label="${title}">${art('compass', 'cmp-art')}` +
    FACING.map((f, i) => { const a = (i * 45 - 90) * Math.PI / 180, x = 50 + 39 * Math.cos(a), y = 50 + 39 * Math.sin(a);
      return `<button class="cmp-pt ${v===f.id?'on':''}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%" role="radio" aria-checked="${v===f.id}" aria-label="${f.n}" data-act="reg-pick" data-k="home.${k}" data-v="${f.id}">${f.id}</button>`; }).join('') + `</div>`;
  const degIn = `<div class="deg-row"><label for="deg-${k}">The number on the compass <span class="opt">(optional)</span></label><span class="deg-in"><input class="in" id="deg-${k}" data-deg="${k}" inputmode="numeric" maxlength="3" placeholder="e.g. 225" value="${typeof deg === 'number' ? deg : ''}" aria-describedby="degw-${k}"><span aria-hidden="true">°</span></span><span class="deg-word" id="degw-${k}" aria-live="polite">${typeof deg === 'number' ? '= ' + dir8(deg).n : ''}</span></div>`;
  return ringHtml + degIn + `<div class="cmp-actions"><button class="chip ${v==='unsure'?'on':''}" aria-pressed="${v==='unsure'}" data-act="reg-pick" data-k="home.${k}" data-v="unsure">${ic('help')}Not sure</button></div>`;
}
/* A picture of a phone's compass app, read the way participants should read theirs: the top of the phone points
 * south-west, so the big reading at the bottom says 225° SW. Drawn, not a screenshot. */
function compassPic(){
  const H = 225;
  const ticks = Array.from({length:72}, (_, i) => { const a = i * 5 * Math.PI / 180, r1 = i % 6 === 0 ? 33 : 37; return `<path d="M${(60 + r1 * Math.sin(a)).toFixed(1)} ${(52 - r1 * Math.cos(a)).toFixed(1)}L${(60 + 41 * Math.sin(a)).toFixed(1)} ${(52 - 41 * Math.cos(a)).toFixed(1)}"/>`; }).join('');
  const L = (t, d, cls) => { const a = (d - H) * Math.PI / 180; return `<text x="${(60 + 25 * Math.sin(a)).toFixed(1)}" y="${(52 - 25 * Math.cos(a) + 4).toFixed(1)}" text-anchor="middle"${cls ? ` class="${cls}"` : ''}>${t}</text>`; };
  const na = (360 - H) * Math.PI / 180;
  return `<svg class="cpic" viewBox="0 0 120 132" aria-hidden="true" focusable="false"><rect width="120" height="132" rx="14" class="cpic-bg"/>
    <g class="cpic-ticks" transform="rotate(-${H} 60 52)">${ticks}</g><path d="M60 6v14" class="cpic-head"/>
    ${L('N', 0)}${L('E', 90)}${L('S', 180)}${L('W', 270)}<circle cx="${(60 + 44 * Math.sin(na)).toFixed(1)}" cy="${(52 - 44 * Math.cos(na)).toFixed(1)}" r="3" class="cpic-red"/>
    <text x="60" y="117" text-anchor="middle" class="cpic-read">225° SW</text></svg>`;
}
const directionHelp = () => `<section class="dir-help" aria-labelledby="dirH">
  <b class="dir-h" id="dirH">${ic('compass')}Use your phone&rsquo;s compass</b>
  <div class="dir-os"><div><span class="dh">iPhone</span><p>Swipe down on the Home Screen, type <b>Compass</b> and open the app.</p></div>
    <div><span class="dh">Android</span><p>Open the <b>Google</b> app and search <b>compass</b>: a live compass shows at the top. Some phones also have a <b>Compass</b> app.</p></div></div>
  <div class="dir-read">${compassPic()}<div><span class="dh">How to read it</span><ol class="steps"><li><div>Hold the phone flat, screen up, with its top edge pointing the way the question asks.</div></li><li><div>Read the big number and letters at the bottom. In this picture, <b>225° SW</b> means the phone points <b>south-west</b>.</div></li><li><div>Tap the same letters on the circle below, or type the number.</div></li></ol></div></div>
  <p class="note">N = north, E = east, S = south, W = west; NE, SE, SW and NW are in between.</p></section>`;
function people(){
  const h = REG.home, fig = (icon, n, cls) => Array.from({length: Math.min(n, 6)}, () => `<span class="pfig ${cls}">${ic(icon)}</span>`).join('') + (n > 6 ? `<span class="pfig-more">+${n-6}</span>` : '');
  return `<div class="household" aria-hidden="true">${fig('user', h.adults||0, 'adult')}${fig('child', h.children||0, 'child')}${fig('paw', h.pets||0, 'pet')}</div>`;
}
/* the height and weight inputs, each with its units switch */
function unitSwitch(kind, cur, a, b){
  const btn = (v, t) => `<button type="button" class="${cur===v?'on':''}" aria-pressed="${cur===v}" data-act="reg-unit" data-k="${kind}" data-v="${v}">${t}</button>`;
  return `<span class="seg-sm" role="group" aria-label="Units">${btn(a[0], a[1])}${btn(b[0], b[1])}</span>`;
}
const REGS = {
  you: () => {
    const r = REG, join = r.mode === 'join' && S.screen !== 'homeedit';
    const inp = (id, key, lab, attrs) => `<div class="field" id="f-${id}"><label for="${id}">${lab}</label><input class="in" id="${id}" data-reg="${key}" value="${esc(r[key])}" ${attrs} aria-describedby="err-${id}"><p class="err" id="err-${id}" hidden></p></div>`;
    const sfx = (id, key, lab, s, attrs) => `<span class="in-sfx"><input class="in" id="${id}" data-reg="${key}" value="${esc(r[key])}" ${attrs} aria-label="${lab}"><span aria-hidden="true">${s}</span></span>`;
    const height = r.hu === 'ftin'
      ? `<div class="field" id="f-r_ft"><span class="lab-row"><label for="r_ft">Height</label>${unitSwitch('h', r.hu, ['cm','cm'], ['ftin','ft, in'])}</span><span class="pair">${sfx('r_ft','ft','Height, feet','ft','inputmode="numeric" maxlength="1" placeholder="5"')}${sfx('r_in','inch','Height, inches','in','inputmode="numeric" maxlength="2" placeholder="8"')}</span><p class="err" id="err-r_ft" hidden></p></div>`
      : `<div class="field" id="f-r_cm"><span class="lab-row"><label for="r_cm">Height</label>${unitSwitch('h', r.hu, ['cm','cm'], ['ftin','ft, in'])}</span>${sfx('r_cm','cm','Height in centimetres','cm','inputmode="decimal" maxlength="5" placeholder="172"')}<p class="err" id="err-r_cm" hidden></p></div>`;
    const weight = r.wu === 'stlb'
      ? `<div class="field" id="f-r_st"><span class="lab-row"><label for="r_st">Weight</label>${unitSwitch('w', r.wu, ['kg','kg'], ['stlb','st, lb'])}</span><span class="pair">${sfx('r_st','st','Weight, stone','st','inputmode="numeric" maxlength="2" placeholder="11"')}${sfx('r_lb','lb','Weight, pounds','lb','inputmode="numeric" maxlength="2" placeholder="6"')}</span><p class="err" id="err-r_st" hidden></p></div>`
      : `<div class="field" id="f-r_kg"><span class="lab-row"><label for="r_kg">Weight</label>${unitSwitch('w', r.wu, ['kg','kg'], ['stlb','st, lb'])}</span>${sfx('r_kg','kg','Weight in kilograms','kg','inputmode="decimal" maxlength="5" placeholder="70"')}<p class="err" id="err-r_kg" hidden></p></div>`;
    return `<div class="form" id="regForm">
      ${inp('r_name', 'name', 'Full name', 'autocomplete="name" autocapitalize="words"')}
      ${join ? inp('r_email', 'email', 'Email', 'type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false"') : ''}
      <div class="row2">
        <div class="field" id="f-r_gender"><label for="r_gender">Gender</label><select class="in" id="r_gender" data-reg="gender" aria-describedby="err-r_gender"><option value="">Choose</option>${GENDERS.map(g => `<option value="${g.id}"${r.gender===g.id?' selected':''}>${g.n}</option>`).join('')}</select><p class="err" id="err-r_gender" hidden></p></div>
        ${inp('r_year', 'birth_year', 'Year of birth', 'inputmode="numeric" maxlength="4" placeholder="e.g. 1985" autocomplete="bday-year"')}
      </div>
      <div class="row2">${height}${weight}</div>
      ${fieldBlock('sens', 'Which sounds most like you?', '', pick1('sens', SENSITIVITY, o => ic(o.ic, o.cls||''), 3, 'Which sounds most like you', 'sm'))}
      <p class="note">Used only to understand comfort differences between people. Your check-ins are stored under a participant code, not your name. The research team sees your name and email next to that code, to run the study and contact you.</p>
    </div>`;
  },
  area: () => {
    const h = REG.home;
    return `<div class="form">
      <div class="field" id="f-r_pc"><label for="r_pc">The first half of your postcode</label><input class="in pcode" id="r_pc" data-reg="home.postcode_area" value="${esc(h.postcode_area||'')}" autocapitalize="characters" autocomplete="off" spellcheck="false" maxlength="5" placeholder="e.g. SA1" aria-describedby="hint-pc err-r_pc"><p class="note" id="hint-pc">${ic('cloud','inl')} Only the first half (like SA2 or CF10), never the full postcode: it matches your check-ins to the local weather.</p><p class="err" id="err-r_pc" hidden></p></div>
      ${fieldBlock('home_type', 'What type of home do you live in?', 'Pick the closest match.', pick1('home.home_type', HOME_TYPES, o => art('home_type:' + o.id), 3, 'Home type'))}
      ${h.home_type === 'flat' ? fieldBlock('flat_position', 'Which floor is your flat on?', 'The floor you live on. A maisonette: its lowest floor.', pick1('home.flat_position', FLAT_POS, o => art('flat_position:' + o.id), 4, 'Which floor', 'sm')) : ''}
      ${fieldBlock('tenure', 'Do you own or rent your home?', '', pick1('home.tenure', TENURE, o => art('tenure:' + o.id), 2, 'Tenure', 'line'))}
    </div>`;
  },
  size: () => {
    const h = REG.home, v = h.floor_area_m2;
    return `<div class="form">
      ${fieldBlock('year', 'When was it built?', 'A good guess is fine.', pick1('home.year_built', YEAR_BUILT, null, 2, 'Year built', 'txt'))}
      ${fieldBlock('floors', 'How many floors does your home have?', h.home_type === 'flat' ? 'Inside your flat, not the whole building.' : 'Count a loft or cellar only if it is lived in.', pick1('home.floors', FLOORS, o => art('floors:' + o.id), 4, 'Floors', 'sm'))}
      ${fieldBlock('bedrooms', 'How many bedrooms?', '', `<div class="numrow" role="radiogroup" aria-label="Bedrooms">${BEDROOMS.map(o => `<button class="num-b ${h.bedrooms===o.id?'on':''}" role="radio" aria-checked="${h.bedrooms===o.id}" data-act="reg-pick" data-k="home.bedrooms" data-v="${o.id}">${o.n}</button>`).join('')}</div>`)}
      ${fieldBlock('area', 'What is the floor area?', 'In square metres. Your Energy Performance Certificate (EPC) shows it as &ldquo;Total floor area&rdquo;.', `<div class="area-row"><span class="in-sfx"><input class="in" id="r_area" data-area="1" inputmode="decimal" maxlength="5" placeholder="e.g. 85" value="${typeof v === 'number' ? v : esc(REG.areaTxt || '')}" aria-label="Floor area in square metres"><span aria-hidden="true">m²</span></span><button class="chip ${v === null ? 'on' : ''}" aria-pressed="${v === null}" data-act="reg-unsure" data-k="floor_area_m2">${ic('check')}Not sure</button></div>`)}
      ${fieldBlock('epc', 'What is its energy rating (EPC)?', 'The letter on the Energy Performance Certificate, from A (best) to G. You can look it up on GOV.UK: &ldquo;Find an energy certificate&rdquo;.', `<div class="ptiles c4" role="radiogroup" aria-label="EPC rating">${EPC.map(o => regTile('home.epc', o, h.epc === o.id, o.id === 'unsure' ? '' : epcArt(o.id), o.id === 'unsure' ? 'sm txt span2' : 'sm epc')).join('')}</div>`)}
    </div>`;
  },
  people: () => {
    const h = REG.home;
    const row = (k, icon, lab, hint) => `<div class="stepper-row"><span class="sr-ic">${ic(icon)}</span><span class="sr-t"><b>${lab}</b>${hint ? `<span class="note">${hint}</span>` : ''}</span>${stepper('home.'+k, h[k], STEP_LIMITS[k][0], STEP_LIMITS[k][1], lab)}</div>`;
    return `<div class="form">
      ${fieldBlock('people', 'Who lives here?', 'Including you.', `<div class="rows-card">${people()}${row('adults', 'user', 'Adults', '')}${row('children', 'child', 'Children', 'Under 18. Tap &minus; for none')}${row('pets', 'paw', 'Pets', 'Tap &minus; for none')}</div>`)}
      ${fieldBlock('bedroom_share', 'Do you share your bedroom with anyone?', 'Count everyone else who sleeps in the same room.', pick1('home.bedroom_share', BED_SHARE, o => art('share:' + o.id), 4, 'Bedroom shared with', 'sm'))}
    </div>`;
  },
  heat: () => `<div class="form">
      ${fieldBlock('main_heating', 'What is your main heating?', 'The one that heats most of your home.', pick1('home.main_heating', MAIN_HEATING, o => art('heat:' + o.id), 2, 'Main heating'))}
      ${fieldBlock('other_heaters', 'Do you also use any of these?', 'Tap all that you use.', pickN('home.other_heaters', OTHER_HEATERS, o => art('other:' + o.id), 3, 'Other heaters'))}
      ${fieldBlock('heating_pattern', 'How is your heating usually used?', '', pick1('home.heating_pattern', HEAT_PATTERN, o => ic(o.ic), 1, 'How the heating is used', 'line'))}
      ${fieldBlock('payment', 'How do you pay for your energy?', '', pick1('home.payment', PAYMENT, o => ic(o.ic), 1, 'Paying for energy', 'line'))}
    </div>`,
  controls: () => `<div class="form">
      ${fieldBlock('controls', 'Which heating controls do you have?', 'Tap all that you have.', pickN('home.controls', CONTROLS, o => art('controls:' + o.id), 3, 'Heating controls'))}
      ${fieldBlock('stat_display', 'Does your thermostat show the room temperature on a screen?', '', pick1('home.stat_display', STAT_DISPLAY, o => art('stat_display:' + o.id), 3, 'Thermostat screen', 'sm'))}
      ${fieldBlock('setpoint', 'What temperature is it usually set to?', 'The setting, when someone is at home.', dialHtml('setpoint_c', 'Usual setting'))}
      ${fieldBlock('bedroom_trv', 'Does the radiator in your bedroom have a dial?', 'A dial on the radiator itself (a TRV), usually numbered 1 to 5.', pick1('home.bedroom_trv', BEDROOM_TRV, o => art('bedroom_trv:' + o.id), 4, 'Bedroom radiator dial', 'sm'))}
    </div>`,
  fabric: () => `<div class="form">
      ${fieldBlock('wall_insulation', 'Are your walls insulated?', 'The outside walls. A good guess is fine.', pick1('home.wall_insulation', WALL_INS, o => art('wall:' + o.id), 3, 'Wall insulation', 'sm'))}
      ${fieldBlock('loft', 'Is the loft insulated?', '', pick1('home.loft', LOFT, o => art('loft:' + o.id), 4, 'Loft insulation', 'sm'))}
      ${fieldBlock('glazing', 'What kind of windows?', 'Look at the edge of the glass: one, two or three panes.', pick1('home.glazing', GLAZING, o => art('glazing:' + o.id), 3, 'Glazing', 'sm'))}
      ${fieldBlock('windows_open', 'Can the windows be opened?', '', pick1('home.windows_open', WINDOWS_OPEN, o => art('windows_open:' + o.id), 3, 'Windows open', 'sm'))}
      ${fieldBlock('damp', 'Have you seen damp or mould in the last year?', 'Tap every room where you saw it.', pickN('home.damp', DAMP, o => art('damp:' + o.id), 4, 'Damp or mould'))}
    </div>`,
  bedroom: () => `<div class="form">
      ${directionHelp()}
      ${fieldBlock('bedroom_facing', 'Which way does your bedroom window face?', 'Stand at the bedroom window with your back to the room and point the top of your phone out of the window. More than one window? Use the biggest.', compass('bedroom_facing', 'Which way the bedroom window faces'))}
      ${fieldBlock('bedroom_side', 'Which side of your home is your bedroom on?', 'Stand in the middle of your home and point the top of your phone towards your bedroom.', compass('bedroom_side', 'Which side of the home the bedroom is on'))}
    </div>`,
  check: () => {
    const join = REG.mode === 'join';
    return `<div class="form">${homeGlance(REG, REG.home, 'reg-edit', join)}
      ${join ? `<section class="pin-card" aria-labelledby="pinH"><div class="pin-top">${ic('key')}<div><b id="pinH">Choose a 4-digit PIN</b><p class="note">With your email, it lets you sign in on another phone or tablet and see all your check-ins there. Please don&rsquo;t use your bank card PIN.</p></div></div>
        <div class="row2">
          <div class="field" id="f-r_pin"><label for="r_pin">PIN</label><input class="in pin" id="r_pin" data-reg="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="new-password" value="${esc(REG.pin || '')}" aria-describedby="err-r_pin"><p class="err" id="err-r_pin" hidden></p></div>
          <div class="field" id="f-r_pin2"><label for="r_pin2">Type it again</label><input class="in pin" id="r_pin2" data-reg="pin2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="new-password" value="${esc(REG.pin2 || '')}" aria-describedby="err-r_pin2"><p class="err" id="err-r_pin2" hidden></p></div>
        </div></section>
      <div class="msg">${ic('shield')}<div>Joining means you agree to take part as described on the <a href="../">study page</a>.</div></div>` : ''}</div>`;
  }
};
const REG_TITLES = {
  you: ['Tell us about you', 'Every question needs an answer. They help the study compare how different people feel.'],
  area: ['Your area and your home', ''],
  size: ['How old and how big is it?', ''],
  people: ['Who lives here?', ''],
  heat: ['How do you heat your home?', ''],
  controls: ['Your heating controls', ''],
  fabric: ['Walls, roof and windows', 'A good guess is fine for all of these.'],
  bedroom: ['Your bedroom', 'The directions matter a lot for the study, so take a moment to get them right.'],
  check: ['Check and finish', 'Check everything, choose your PIN, then join. Tap Edit to change a section.']
};
function regScreen(){
  const st = REG_STEPS[REG.step], last = REG.step === REG_STEPS.length - 1, s = S.screen;
  let [title, sub] = REG_TITLES[st.id];
  if(st.id === 'check' && REG.mode !== 'join') sub = 'Check everything, then save. Tap Edit to change a section.';
  if(s === 'profile' && REG.step === 0) [title, sub] = ['Tell us about your home', `${APP} 1.0 asks a few questions about you and your home, once. Some answers are filled in from before: check them, and answer the rest.`];
  const track = s === 'homeedit' ? '' : `<ol class="reg-track" aria-label="Progress">` + REG_STEPS.map((x, i) =>
    `<li class="${i < REG.step ? 'ok' : ''}${i === REG.step ? ' cur' : ''}"${i === REG.step ? ' aria-current="step"' : ''}>${ic(i < REG.step ? 'check' : x.ic)}<span class="sr">${x.t}${i < REG.step ? ', done' : i === REG.step ? ', current step' : ''}</span></li>`).join('') + `</ol>`;
  const btn = s === 'homeedit' ? `Save ${ic('check')}` : last ? (REG.mode === 'join' ? `Join the study ${ic('check')}` : `Save my profile ${ic('check')}`) : REG.edit ? `Save and go back ${ic('chev')}` : `Continue ${ic('chev')}`;
  return track + qhead(s === 'homeedit' ? 'Edit &middot; ' + st.t : `Step ${REG.step+1} of ${REG_STEPS.length} &middot; ${st.t}`, title, sub) +
    `<div class="reg-body">${REGS[st.id]()}</div>` +
    `<div class="actions reg-foot"><div class="field" id="f-join"><p class="err" id="err-join" role="alert" hidden></p></div><button class="btn primary" data-act="reg-next">${btn}</button>${s === 'homeedit' ? '' : `<p class="note center">${minutesLeft()}</p>`}</div>`;
}
function regSet(k, v){ if(k.startsWith('home.')) REG.home[k.slice(5)] = v; else REG[k] = v; }

/* ---------- the bottom sheet (inside the phone frame) ---------- */
let SHEET_OPEN = false, sheetOpener = null;
const sheetUp = () => SHEET_OPEN ? 1 : 0;
function openSheet(html, focusSel, opener){
  const d = $('#sheet');
  if(!SHEET_OPEN) sheetOpener = opener || document.activeElement;
  d.innerHTML = html; d.hidden = false; $('#backdrop').hidden = false; SHEET_OPEN = true;
  ['#screen','#tabbar','#top'].forEach(s => { const el = $(s); if(el) el.inert = true; });
  const f = d.querySelector(focusSel || '[data-act="sheet-close"]'); if(f) f.focus({ preventScroll:true });
  syncHistory();                                            // an entry, so Back closes the sheet (opened from a tap)
}
/* Closes the sheet. From go() or popstate the history follows with the new screen; otherwise it is brought
 * down here (the sheet's entry goes). */
function closeSheet(fromPop){
  if(!SHEET_OPEN) return;
  SHEET_OPEN = false;
  const d = $('#sheet'); d.hidden = true; d.innerHTML = ''; $('#backdrop').hidden = true;
  ['#screen','#tabbar','#top'].forEach(s => { const el = $(s); if(el) el.inert = false; });
  const o = sheetOpener; sheetOpener = null;
  if(o && document.contains(o)) o.focus({ preventScroll:true });
  if(!fromPop) setTimeout(syncHistory, 0);
}
function showDetail(id, opener){
  const v = store.votes.find(x => x.id === id); if(!v) return;
  const d = new Date(v.ts);
  const meta = [
    `<span>${ic(v.type==='scheduled' ? 'bell' : 'user')}${v.type==='scheduled' ? 'From a reminder' : 'You started it'}</span>`,
    `<span>${ic(v.home==='recent' ? 'clock' : 'home')}${v.home==='recent' ? 'Just got in' : 'Home over an hour'}</span>`,
    v.secs ? `<span>${ic('clock')}Took ${secsWord(v.secs)}</span>` : '',
    v.same ? `<span>${ic('refresh')}Same as the time before</span>` : '',
    v.example ? `<span>${ic('info')}Example data</span>` : ''
  ].filter(Boolean).join('');
  openSheet(`<div class="sh-head"><div><div class="eyebrow">Check-in</div><b id="sheetTitle">${dateWord(d)}</b></div><button class="x" data-act="sheet-close" aria-label="Close">${ic('x')}</button></div>
    <div class="sh-body"><div class="last"><div class="when">What you logged</div><div class="fig">${avatar(v.garments||[])}</div><ul>${detailRows(v)}</ul></div><div class="sh-meta">${meta}</div></div>`, null, opener);
}
function confirmSignOut(opener){
  openSheet(`<div class="sh-head"><div><div class="eyebrow">Your account</div><b id="sheetTitle">Sign out on this phone?</b></div><button class="x" data-act="sheet-close" aria-label="Close">${ic('x')}</button></div>
    <div class="sh-body"><p class="sub">Reminders stop on this phone. Your check-ins so far stay saved, and any not sent yet go out when you sign in here again. To come back, choose &ldquo;I have registered before&rdquo; and enter your email and PIN.</p>
    <div class="actions"><button class="btn danger" data-act="signout-yes">${ic('signout')} Sign out</button><button class="btn link" data-act="sheet-close">Cancel</button></div></div>`, '.sh-body [data-act="sheet-close"]', opener);
}

/* ---------- toast (with Undo) ---------- */
let TOAST = null;
function showToast(o){
  closeToast();
  const el = $('#toast');
  el.className = 'toast open' + (o.kind === 'info' ? ' info' : o.kind === 'error' ? ' error' : '');
  el.innerHTML = `<span class="t-ic">${ic(o.kind === 'error' ? 'alert' : o.kind === 'info' ? 'info' : 'check')}</span><span class="t-text"><b>${o.title}</b>${o.sub ? `<span>${o.sub}</span>` : ''}</span>${o.action ? `<button class="t-act" data-act="toast-action">${ic('undo')} ${o.action}</button>` : ''}`;
  $('.phone').classList.add('toast-open');
  TOAST = { o, left: o.ms || 4000, t0: Date.now(), timer: null, paused: false };
  armToast();
}
function armToast(){ if(!TOAST) return; clearTimeout(TOAST.timer); TOAST.t0 = Date.now(); TOAST.timer = setTimeout(closeToast, TOAST.left); }
/* the toast stays while it is pointed at or has focus (so Undo can be reached), then gives at least 2 s more */
function pauseToast(){ if(!TOAST || TOAST.paused) return; TOAST.paused = true; clearTimeout(TOAST.timer); TOAST.left = Math.max(2000, TOAST.left - (Date.now() - TOAST.t0)); }
function resumeToast(){ if(!TOAST || !TOAST.paused) return; TOAST.paused = false; armToast(); }
function closeToast(){
  if(!TOAST) return;
  const t = TOAST; TOAST = null; clearTimeout(t.timer);
  const el = $('#toast'); if(el.contains(document.activeElement)) document.activeElement.blur();
  el.classList.remove('open'); $('.phone').classList.remove('toast-open');
  if(t.o.onClose) t.o.onClose();
}

/* ---------- events ---------- */
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if(!b || b.disabled || b.getAttribute('aria-disabled') === 'true') return;
  if(b.closest('#debug')) return;
  if(S.lock && b.dataset.act !== 'toast-action') return;
  const d = b.dataset;
  switch(d.act){
    case 'go': if(d.to === 'join'){ REG = loadReg('join'); } go(d.to); break;
    case 'tab': if(S.screen === d.to){ $('#screen').scrollTo({ top:0, behavior: reduceMotion() ? 'auto' : 'smooth' }); break; } go(d.to); break;
    case 'back': back(); break;
    case 'close': go('today'); break;
    case 'start': if(!nextOpen() && needsNotif() && SS.get(NOTIF_ASKED_KEY) !== '1' && !studyOver()){ notifSheet(b); break; } startSession('self', b); break;
    case 'start-anyway': closeSheet(); startSession('self'); break;
    /* one tap: permission, this phone registered, the hours saved so far (or Swansea's defaults) */
    case 'notif-on': {
      const then = d.then;
      LS.set(HOURS_KEY, JSON.stringify(hours()));
      busy(b, true);
      try{
        const r = await PUSH.enable();
        if(r === 'on'){
          showToast({ title:'Notifications are on', sub: daysWord(hours()).replace(/&ndash;/g, '–').replace(/&middot;/g, '·') });
          if(then === 'start'){ closeSheet(); startSession('self'); }
          else { rerender(); if(S.screen === 'settings') remMsg(`Notifications are on. ${daysWord(hours())}; change the hours below.`, 'ok'); }
        } else if(then === 'start'){ closeSheet(); startSession('self'); showToast({ title:'Notifications are not on', sub:'You can turn them on from Today or Settings', kind:'info' }); }   // never asked again in a loop: the check-in goes ahead
        else if(r === 'dismissed'){ busy(b, false); notifMsg('Notifications were not allowed. Tap the button again and choose <b>Allow</b>.'); }
        else rerender();                                    // blocked: the steps to allow them
      }catch(err){ busy(b, false); notifMsg(err.message || 'Something went wrong, please try again.'); if(then === 'start'){ closeSheet(); startSession('self'); } }
      break; }
    case 'home': onHome(d.v); break;
    case 'pause': setPause(d.v); break;
    case 'nothome': go('away'); break;
    case 'pick': pick(d.q, d.v); break;
    case 'toggle': toggle(d.q, d.v); break;
    case 'none': S.a[d.q] = []; rerender(); break;
    case 'lastclo': S.a.clo = [...((lastVote() || {}).garments || [])].filter(id => byId(GARMENTS, id)); rerender(); break;
    case 'next': next(); break;
    case 'stat': { const v = Math.max(STAT_MIN, Math.min(STAT_MAX, statShown() + Number(d.d) * STAT_STEP)); S.a.statv = v; if(S.a.stat === 'none') delete S.a.stat; rerender(); break; }
    case 'stat-ok': S.a.stat = statShown(); next(); break;
    case 'stat-none': S.a.stat = 'none'; rerender(); S.lock = true; clearTimeout(pickTimer); pickTimer = setTimeout(() => { S.lock = false; if(S.screen==='q') next(); }, 460); break;
    case 'edit': {
      refreshFlow();
      const i = S.flow.indexOf(d.q);
      const cp = x => Array.isArray(x) ? [...x] : x;
      if(i>=0){ S.editPrev = { q:d.q, v:cp(S.a[d.q]), also: d.q === 'heat' ? { heat_src:cp(S.a.heat_src), heat_for:S.a.heat_for } : null }; S.i=i; S.edit=true; S.editFrom=S.screen; S.hist.push(S.screen); S.screen='q'; render(); }
      break; }
    case 'submit': {
      // never a row with a gap: an asked step without an answer is asked first (as an Edit, so it returns here)
      refreshFlow();
      const gap = S.flow.findIndex(q => !answered(S.a, q));
      if(gap >= 0){ S.editPrev = { q:S.flow[gap], v:undefined, also:null }; S.i = gap; S.edit = true; S.editFrom = 'review'; S.hist.push('review'); S.screen = 'q'; render(); showToast({ title:'One answer is missing', sub:'Answer it, then save', kind:'info', ms:3500 }); break; }
      submit(); break; }
    case 'show': showDetail(d.id, b); break;
    case 'more': S.histN += 40; rerender(); break;
    case 'sheet-close': closeSheet(); break;
    case 'toast-action': { const t = TOAST; if(t && t.o.onAction) t.o.onAction(); break; }
    case 'go-reminders': go('settings'); { const r = $('#reminders'); if(r){ r.scrollIntoView({ block:'start' }); r.focus({ preventScroll:true }); } } break;
    case 'add-win': { remDraft = readHours(); remDraft[d.w+'2_start'] = '07:00'; remDraft[d.w+'2_end'] = '09:00'; rerender(); $('#'+(d.w==='weekday'?'h_ws2':'h_es2'))?.focus({ preventScroll:true }); break; }
    case 'rm-win': { remDraft = readHours(); remDraft[d.w+'2_start'] = null; remDraft[d.w+'2_end'] = null; rerender(); $(`[data-act="add-win"][data-w="${d.w}"]`)?.focus({ preventScroll:true }); break; }
    case 'install-skip': {
      SS.set(INSTALL_SKIP_KEY, '1');
      const to = START === 'join' || START === 'signin' ? START : 'welcome';
      if(to === 'join') REG = loadReg('join');
      go(to); if(to !== 'welcome') S.hist = ['welcome'];
      break; }
    case 'signin': signin(); break;
    case 'recheck': recheck(false); break;
    case 'forget': forgetIdentity('', true); break;
    case 'signout': confirmSignOut(b); break;
    case 'signout-yes': { busy(b, true); await flushPending().catch(() => {}); if(PUSH.status() === 'on') await PUSH.disable(); await SWITCH.forgetDevice(); closeSheet(); forgetIdentity('You’re signed out on this phone.'); break; }
    case 'save-hours': {
      const h = readHours(), why = hoursProblem(h);
      if(why){ remMsg(why, 'warn'); break; }
      LS.set(HOURS_KEY, JSON.stringify(h)); remDraft = null;
      if(PUSH.status() === 'unconfigured'){ remMsg('Saved on this phone.', 'ok'); break; }
      busy(b, true);
      const st = await PUSH.sync(h).catch(() => null);
      busy(b, false);
      if(PUSH.status() !== 'on'){ rerender(); remMsg('Saved on this phone, but reminders have stopped here. Turn them on again below.', 'warn'); break; }
      remMsg(st && st.found ? 'Saved.' : 'Saved on this phone. The reminder service could not be reached right now; it gets the new hours next time you open the app.', st && st.found ? 'ok' : 'warn');
      break; }
    case 'push-off': busy(b, true); await PUSH.disable(); rerender(); remMsg('Reminders are off on this phone.', 'ok'); break;
    /* the game: race period, how points work, badges, hiding from the race */
    case 'race-period': if(d.v !== RACE_PERIOD){ RACE_PERIOD = d.v === 'month' ? 'month' : 'week'; if(S.screen === 'race') render(); refreshRace(RACE_PERIOD); } break;
    case 'race-how': if(hasGame()) howSheet(b); break;
    case 'badges': if(hasGame()) badgesSheet(b); break;
    case 'race-hide': {
      const me = meProfile(), hide = !me.race_hidden;
      const apply = v => { me.race_hidden = v; LS.set(ME_KEY, JSON.stringify(me)); rerender(); };
      apply(hide);
      if(!SWITCH.live) break;
      try{ const v = await SWITCH.setRaceHidden(hide); apply(!!v); refreshRace('week', true); refreshRace('month', true); }
      catch(err){ apply(!hide); if(err.notSignedIn) keyLost(); else { const m = $('#raceMsg'); if(m){ m.hidden = false; m.className = 'msg warn'; m.innerHTML = ic('alert') + '<div>Could not change it right now. Check the connection and try again.</div>'; } } }
      break; }
    /* the join wizard, the profile, My home */
    case 'home-edit': REG = Object.assign(regFromProfile(meProfile(), homeProfile() || {}), { mode:'edit', step: stepOf(d.step) }); go('homeedit'); break;
    case 'reg-next': regNext(); break;
    case 'reg-later': saveReg(); welcomeNote = 'Your answers so far are saved on this phone. Tap “I’m new here” to carry on.'; go('welcome'); break;
    case 'reg-edit': REG.edit = true; regGo(stepOf(d.step)); break;
    case 'reg-unit': convertUnits(d.k, d.v); saveReg(); rerender(); break;
    case 'reg-pick': {
      let v = d.v; if(['home.floors','home.bedroom_share','home.bedrooms'].includes(d.k)) v = Number(v);
      regSet(d.k, v);
      if(d.k === 'home.home_type' && !isFlat()) delete REG.home.flat_position;
      if(['home.bedroom_facing','home.bedroom_side'].includes(d.k)) delete REG.home[d.k.slice(5) + '_deg'];   // tapped by hand: the typed number no longer applies
      saveReg(); rerender();
      const f = b.closest('.rq'); if(f && f.classList.contains('bad')) fieldError(f.id.slice(2), '');
      break; }
    case 'reg-toggle': {
      const key = d.k.slice(5), arr = Array.isArray(REG.home[key]) ? [...REG.home[key]] : [];
      const excl = ['none','unsure'], i = arr.indexOf(d.v);
      if(i >= 0) arr.splice(i, 1);
      else if(excl.includes(d.v)) arr.splice(0, arr.length, d.v);                // "None of these" / "Not sure" stand alone
      else { excl.forEach(x => { const n = arr.indexOf(x); if(n >= 0) arr.splice(n, 1); }); arr.push(d.v); }
      REG.home[key] = arr; saveReg(); rerender();
      const f = b.closest('.rq'); if(f && f.classList.contains('bad')) fieldError(f.id.slice(2), '');
      break; }
    case 'reg-step': {
      const key = d.k.slice(5), [mn, mx] = STEP_LIMITS[key], cur = REG.home[key];
      REG.home[key] = Math.max(mn, Math.min(mx, typeof cur === 'number' ? cur + Number(d.d) : firstStep(key, Number(d.d))));
      saveReg(); rerender(); break; }
    case 'reg-dial': stepDial(d.k, Number(d.d)); break;
    case 'reg-unsure': {
      const k = d.k; REG.home[k] = REG.home[k] === null ? undefined : null; if(REG.home[k] === undefined) delete REG.home[k];
      if(k === 'floor_area_m2') REG.areaTxt = '';
      saveReg(); rerender(); break; }
  }
});
document.addEventListener('input', e => {
  const t = e.target;
  if(t.dataset && t.dataset.deg){
    const k = t.dataset.deg, raw = t.value.trim(), n = /^\d{1,3}$/.test(raw) ? Number(raw) : null, w = $('#degw-' + k);
    if(n !== null && n <= 360){ REG.home[k + '_deg'] = n % 360; REG.home[k] = dir8(n).id; if(w) w.textContent = '= ' + dir8(n).n; }
    else { delete REG.home[k + '_deg']; if(w) w.textContent = raw ? 'Type a number from 0 to 359' : ''; }
    saveReg();
    $$(`.cmp-pt[data-k="home.${k}"]`).forEach(p => { const on = p.dataset.v === REG.home[k]; p.setAttribute('aria-checked', String(on)); p.classList.toggle('on', on); });
    const un = $(`[data-act="reg-pick"][data-k="home.${k}"][data-v="unsure"]`); if(un){ un.setAttribute('aria-pressed', String(REG.home[k] === 'unsure')); un.classList.toggle('on', REG.home[k] === 'unsure'); }
    return;
  }
  if(t.dataset && t.dataset.area){
    const raw = t.value.trim(), n = numOf(raw);
    REG.areaTxt = raw;
    if(raw === '' || n === null) delete REG.home.floor_area_m2; else REG.home.floor_area_m2 = Math.round(n);
    saveReg();
    const chip = $('[data-act="reg-unsure"][data-k="floor_area_m2"]'); if(chip){ chip.setAttribute('aria-pressed', 'false'); chip.classList.remove('on'); }
    if($('#f-area') && $('#f-area').classList.contains('bad')) fieldError('area', '');
    return;
  }
  if(t.dataset && t.dataset.reg){
    let v = t.value; if(t.dataset.reg === 'home.postcode_area'){ v = v.toUpperCase(); if(t.value !== v){ const p = t.selectionStart; t.value = v; try{ t.setSelectionRange(p, p); }catch(err){} } }
    regSet(t.dataset.reg, v); saveReg();
    const id = t.id, fid = id === 'r_in' ? 'r_ft' : id === 'r_lb' ? 'r_st' : id;
    if($('#f-' + fid) && $('#f-' + fid).classList.contains('bad')) fieldError(fid, '');
    return;
  }
  if(t.classList && t.classList.contains('time-in')){ remDraft = readHours(); const m = $('#remMsg'); if(m) m.hidden = true; }
});
document.addEventListener('change', e => { const t = e.target; if(t.tagName === 'SELECT' && t.dataset.reg){ regSet(t.dataset.reg, t.value); saveReg(); const f = $('#f-' + t.id); if(f && f.classList.contains('bad')) fieldError(t.id, ''); } });
document.addEventListener('keydown', e => {
  const t = e.target;
  if(e.key === 'Escape' && SHEET_OPEN){ closeSheet(); return; }
  /* arrow keys move between the options of a radio group (choosing still takes Enter or Space) */
  if(['ArrowDown','ArrowUp','ArrowLeft','ArrowRight'].includes(e.key) && t.getAttribute && t.getAttribute('role') === 'radio'){
    const g = t.closest('[role="radiogroup"]'); if(!g) return;
    const items = Array.from(g.querySelectorAll('[role="radio"]')), i = items.indexOf(t), dir = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 1 : -1;
    const n = items[(i + dir + items.length) % items.length]; if(n){ e.preventDefault(); n.focus(); }
    return;
  }
  if(t.classList && t.classList.contains('dial')){
    const k = t.dataset.k, v = REG.home[k], cur = typeof v === 'number' ? v : null;
    const map = { ArrowUp:1, ArrowRight:1, ArrowDown:-1, ArrowLeft:-1, PageUp:4, PageDown:-4 };
    if(e.key in map){ e.preventDefault(); if(cur === null) stepDial(k, 1); else setDial(k, cur + map[e.key] * DIAL.step); }
    else if(e.key === 'Home'){ e.preventDefault(); setDial(k, DIAL.min); } else if(e.key === 'End'){ e.preventDefault(); setDial(k, DIAL.max); }
    return;
  }
  if(e.key !== 'Enter') return;
  if(t.id === 's_email' || t.id === 's_pin'){ e.preventDefault(); signin(); return; }
  if(t.tagName === 'INPUT' && t.closest('#screen') && ['join','profile','homeedit'].includes(S.screen)){ e.preventDefault(); regNext(); }
});
document.addEventListener('submit', e => e.preventDefault());   // the forms never submit natively
/* dragging the thermostat dial */
document.addEventListener('pointerdown', e => {
  const el = e.target.closest && e.target.closest('.dial'); if(!el) return;
  el.focus({ preventScroll:true });
  if(!dialFromPointer(el, e, true)) return;
  e.preventDefault();
  try{ el.setPointerCapture(e.pointerId); }catch(err){}
  const move = ev => dialFromPointer(el, ev), up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
  el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
});
const toastEl = $('#toast');
toastEl.addEventListener('pointerenter', pauseToast); toastEl.addEventListener('pointerleave', resumeToast);
toastEl.addEventListener('focusin', pauseToast); toastEl.addEventListener('focusout', resumeToast);
$('#backdrop').addEventListener('click', () => closeSheet());
setInterval(() => {
  if(document.hidden) return;
  if(S.screen==='pending') recheck(true);
  if(S.screen==='away' && !S.lock) rerender();              // keeps the end times of the pauses current
  if(S.screen==='today' && !!nextOpen() !== lockShown && !sheetUp()) rerender();   // the next check-in has opened
  $$('[data-ago]').forEach(el => { el.textContent = agoWord(el.dataset.ago); });
}, 60000);
document.addEventListener('visibilitychange', () => {
  if(document.hidden){ endHolds(); return; }                // locked or switched away: a held check-in goes out now
  if(S.screen==='pending') recheck(true);
  else {
    if((S.screen==='away' && !S.lock) || (S.screen==='today' && !!nextOpen() !== lockShown && !sheetUp())) rerender();
    quiet(syncReminders()); quiet(flushPending()); quiet(pullHistory());
    if(S.screen === 'race' || S.screen === 'today') refreshRace(S.screen === 'race' ? RACE_PERIOD : 'week');
  }
  $$('[data-ago]').forEach(el => { el.textContent = agoWord(el.dataset.ago); });
});

/* ---------- celebration ---------- */
function confetti(){
  if(reduceMotion()) return;
  const c = $('#confetti'); c.hidden = false;
  const r = c.parentElement.getBoundingClientRect(); c.width = r.width; c.height = r.height;
  const ctx = c.getContext('2d');
  const cols = ['#1E5CC8','#3D8CE6','#5CB68B','#F2BB52','#EE8A3E','#D64530','#0E7B72'];
  const ps = Array.from({length:90}, () => ({ x:c.width/2+(Math.random()-.5)*80, y:c.height*.3, vx:(Math.random()-.5)*10, vy:-Math.random()*10-3,
    w:6+Math.random()*5, h:3+Math.random()*4, a:Math.random()*6, va:(Math.random()-.5)*.3, col:cols[Math.floor(Math.random()*cols.length)] }));
  const t0 = performance.now();
  (function tick(t){
    const dt = (t-t0)/1000; ctx.clearRect(0,0,c.width,c.height);
    ps.forEach(p => { p.vy+=.28; p.x+=p.vx; p.y+=p.vy; p.a+=p.va; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.a); ctx.globalAlpha=Math.max(0,1-dt/1.9); ctx.fillStyle=p.col; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore(); });
    if(dt<2) requestAnimationFrame(tick); else { ctx.clearRect(0,0,c.width,c.height); c.hidden = true; }
  })(t0);
}

/* ---------- debug panel (?debug=1) ---------- */
const COLS = ['participant','ts','local_time','prompt','at_home','tsv','preference','acceptability','clo','garments','met','activity','room','air','sun','heating_on','heating_src','heating_for','stat_temp_c','wall','actions','notes','same_as_last','seconds','app_version'];
const cell = x => x===undefined||x===null ? '' : Array.isArray(x) ? x.join('|') : String(x);
const debugRows = () => store.votes.slice().sort((a,b)=>a.ts<b.ts?1:-1).map(v => Object.assign(SWITCH.toRecord(v, v.p || PARTICIPANT), { _ex: !!v.example }));
function renderTable(){
  if(!DEBUG) return;
  const rows = debugRows(), q = SWITCH.pending();
  $('#dbgInfo').textContent = `${rows.length} check-in${rows.length===1?'':'s'} stored on this phone, ${q.length} in the send queue (${SWITCH.live ? 'live' : 'local mode'}).`;
  $('#dbgTable').innerHTML = rows.length ? `<table><thead><tr>${COLS.map(c=>`<th>${c}</th>`).join('')}<th>flag</th></tr></thead><tbody>${rows.map(r=>`<tr>${COLS.map(c=>`<td class="${r._ex?'ex':''}">${esc(cell(r[c]))}</td>`).join('')}<td>${r._ex?'example':''}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">No check-ins stored yet.</div>';
}
function toCsv(){
  const q = s => /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
  return [COLS.concat('flag').join(','), ...debugRows().map(r => COLS.map(c => q(cell(r[c]))).concat(r._ex ? 'example' : '').join(','))].join('\n');
}
if(DEBUG){
  const p = $('#debug'); p.hidden = false;
  p.innerHTML = `<h2>What gets stored</h2><p class="sub">Testing panel, shown only with <code>?debug=1</code>. Every saved check-in becomes one row. Rows marked <em>example</em> are seeded test data and are never sent.</p>
    <p class="sub" id="dbgInfo"></p>
    <div class="controls"><button class="chip" id="dbgCsv">${ic('copy')} Copy as CSV</button><button class="chip" id="dbgSeed">${ic('refresh')} Reset to example data</button><button class="chip ghost" id="dbgClear">Clear check-ins</button><button class="chip ghost" id="dbgForget">Forget who I am</button></div>
    <div class="tablewrap" id="dbgTable"></div>`;
  $('#dbgCsv').addEventListener('click', async () => { const b = $('#dbgCsv'); try{ await navigator.clipboard.writeText(toCsv()); b.innerHTML = ic('check') + ' Copied'; }catch(e){ b.innerHTML = ic('copy') + ' Copy blocked here'; } setTimeout(() => { b.innerHTML = ic('copy') + ' Copy as CSV'; }, 1600); });
  $('#dbgSeed').addEventListener('click', () => { if(!PARTICIPANT){ setIdentity(LOCAL_CODE, NAME || 'Test Participant'); LS.set(APPROVED_KEY, 'yes'); } seed(); renderTable(); go('today'); });
  $('#dbgClear').addEventListener('click', () => { store = {votes:[], paused:null, pausedWhy:''}; save(); renderTable(); go(PARTICIPANT ? 'today' : 'welcome'); });
  $('#dbgForget').addEventListener('click', () => { forgetIdentity(''); renderTable(); });
}

/* ---------- start ---------- */
load();
if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }
window.addEventListener('online', () => quiet(flushPending()));
window.addEventListener('pagehide', endHolds);              // closed or navigated away during the Undo time
quiet(flushPending()); flushLater();
if(!PARTICIPANT){
  S.screen = installFirst() ? 'install' : START === 'join' ? 'join' : START === 'signin' ? 'signin' : 'welcome';
  if(S.screen === 'join') REG = loadReg('join');
  if(S.screen === 'join' || S.screen === 'signin') S.hist = ['welcome'];
  render();
} else {
  // Show something straight away; an unconfirmed code is checked in the background (see checkApproval).
  if(FROM_PUSH){ history.replaceState(null, '', location.pathname); S.screen = 'today'; render(); quiet(startSession('scheduled')); }
  else { const tab = location.hash.slice(1); S.screen = TABS.includes(tab) ? tab : 'today'; render(); }
  if(needsApprovalCheck()) checkApproval();
  quiet(syncReminders()); quiet(pullHistory(true)); refreshRace('week');
}
if(DEBUG) renderTable();
