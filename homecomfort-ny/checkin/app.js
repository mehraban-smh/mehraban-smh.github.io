/* Home Comfort NY (SUNY ESF) - check-in app: state, screens, sync, reminders, sign-up and approval.
 * Loaded last (after ../config.js, ../api.js, ../icons.js and questions.js).
 * The behavior is a port of the SWITCH app (switch/checkin/app.js, v0.4.0) with its reviewed fixes kept;
 * this study shares nothing with it at run time (own pages, own storage keys "hcny_*", own database). */
const URLQ = new URL(location.href).searchParams;
const DEBUG = URLQ.get('debug') === '1';
const FROM_PUSH = URLQ.get('from') === 'push';
const VIA_URL = !!(URLQ.get('p') || '').trim();            // ?p=NY099: a test link, never gated on approval
const START = (URLQ.get('start') || '').toLowerCase();     // ?start=join or ?start=signin from the study page
const KEY = 'hcny_store';                                   // check-ins kept on this phone (api.js localRows reads it too)
const APPROVED_KEY = 'hcny_approved';
const HOME_KEY = 'hcny_home';                               // the home profile as registered on this phone (metric)
const UNITS_KEY = 'hcny_units';                             // 'us' | 'metric': how this phone shows measurements
const REG_KEY = 'hcny_reg';                                 // the sign-up draft, removed once registered
const PENDING_KEY = 'hcny_pending';                         // api.js: check-ins waiting to be sent
const INTERVAL = HC.cfg.reminderIntervalMin || 60;          // minutes between reminders, same as the sender
const GOAL = Math.max(1, Math.round(Number(HC.cfg.dailyGoal) || 3));
const WEEK_GOAL = GOAL * 7;
const GAP_MIN = 30;                                         // the sender skips a phone that checked in less than this long ago
const MANUAL_PAUSE_H = 12;                                  // "I'll tell you when I'm back": reminders resume by themselves after this long
const HOLD_MS = 6000;                                       // a new check-in waits this long (Undo) before it is sent
const LOCAL_CODE = 'NY000';                                 // the participant code in local mode
const NOT_FOUND_MSG = 'This registration was not found. Please join again or contact the study team.';
const TEAM = '<span class="placeholder">[PLACEHOLDER: study team email]</span>';
/* Safari's Share glyph (a box with an arrow), drawn like the HCI icons, for the "Add to Home Screen" steps */
const SHARE_IC = '<span class="share-ic" aria-hidden="true"><svg class="ic ic-sm" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M12 14V3.5M8.5 7 12 3.5 15.5 7"/><path d="M9 10H7a1.5 1.5 0 0 0-1.5 1.5V19A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5v-7.5A1.5 1.5 0 0 0 17 10h-2"/></svg></span>';
const pad = n => String(n).padStart(2,'0');
const NB = '\u00a0';                                      // no-break space between a time and AM/PM
const dayKey = d => d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const LS = { get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }, set(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }, del(k){ try{ localStorage.removeItem(k); }catch(e){} } };
const SS = { get(k){ try{ return sessionStorage.getItem(k); }catch(e){ return null; } }, set(k,v){ try{ sessionStorage.setItem(k,v); }catch(e){} } };
const INSTALL_SKIP_KEY = 'hcny_install_skip';               // sessionStorage: "Continue in Safari anyway" was chosen in this tab
const quiet = p => { try{ p && p.catch && p.catch(()=>{}); }catch(e){} };
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- times, US style: "7:42 PM", "8 PM" ---------- */
function t12(d, full){ let h = d.getHours(); const m = d.getMinutes(), ap = h < 12 ? 'AM' : 'PM'; h = h % 12 || 12; return (m || full ? h + ':' + pad(m) : String(h)) + NB + ap; }
const clock = d => t12(d, true);
const hm = s => { const m = /^(\d{1,2}):(\d{2})/.exec(s||''); return m ? [Number(m[1]), Number(m[2])] : null; };
function hm12(s){ const m = hm(s); return m ? t12(new Date(2000, 0, 1, m[0], m[1])) : ''; }
function startOfDay(d){ const c = new Date(d); c.setHours(0,0,0,0); return c; }
const shortDate = d => `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
function dayTitle(d){
  const now = new Date(), y = new Date(now); y.setDate(y.getDate()-1);
  return dayKey(d)===dayKey(now) ? 'Today' : dayKey(d)===dayKey(y) ? 'Yesterday' : shortDate(d);
}
const dateWord = d => `${dayTitle(d)} at ${clock(d)}`;
function agoWord(ts){
  const mins = Math.max(0, Math.round((Date.now() - new Date(ts)) / 60000));
  if(mins < 1) return 'just now';
  if(mins < 60) return mins + ' min ago';
  if(mins < 24*60){ const h = Math.round(mins/60); return h + ' hr ago'; }
  const days = Math.round((startOfDay(new Date()) - startOfDay(new Date(ts))) / 86400000);
  return days <= 1 ? 'yesterday' : days + ' days ago';
}
const secsWord = s => !s ? '' : s < 90 ? `${s} second${s===1?'':'s'}` : `${Math.floor(s/60)} min ${s%60} s`;

/* ---------- who is using this phone ---------- */
let PARTICIPANT = HC.participant() || '';
let NAME = LS.get('hcny_name') || '';
let welcomeNote = '';                                       // one-line notice on the welcome screen (see forgetIdentity)
const firstName = () => (NAME || '').trim().split(/\s+/)[0] || '';
function greeting(){
  const h = new Date().getHours();
  const g = h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return g + (firstName() ? ', ' + esc(firstName()) : '');
}
const initials = () => (NAME || '').trim().split(/\s+/).filter(Boolean).slice(0,2).map(w => w[0].toUpperCase()).join('') || '';
const units = () => LS.get(UNITS_KEY) === 'metric' ? 'metric' : 'us';

/* ---------- check-ins kept on this phone ---------- */
let store = {votes:[], paused:null, pausedWhy:''};
function load(){
  try{ const s = JSON.parse(LS.get(KEY)||'null'); if(s && Array.isArray(s.votes)) store = Object.assign({paused:null, pausedWhy:''}, s); }catch(e){}
}
function save(){ LS.set(KEY, JSON.stringify(store)); }
/* Each check-in carries the code it was made under (p), so a second person signing in on the same phone
 * does not see the first one's history or streak. Rows without p (none in this app) count for everyone. */
const isMine = v => !v.p || v.p === PARTICIPANT;
const votes = () => store.votes.filter(isMine).sort((a,b)=>a.ts<b.ts?1:-1);
const lastVote = () => votes()[0] || null;
/* Example data for ?debug=1: about four check-ins a day over nine days, cooler in the morning. */
function seed(){
  const now = Date.now(), rows = [];
  const slots = [[7,20,-1,'bedroom','sit',['long','sweatpants','socks','slippers'],'dark'],[8,5,-2,'kitchen','house',['long','pants','socks'],'no'],
    [12,40,0,'office','desk',['tshirt','pants','socks'],'yes'],[17,30,0,'living','sit',['sweater','pants','socks'],'no'],[19,45,1,'living','sit',['tshirt','sweatpants','socks'],'dark'],
    [21,10,1,'living','lying',['tshirt','sweatpants','blanket'],'dark'],[22,30,0,'bedroom','lying',['tshirt','shorts','comforter'],'dark']];
  let i = 0;
  for(let d = 8; d >= 0; d--){
    slots.forEach((s, k) => {
      if((d + k) % 3 === 0 && d % 4 !== 1) return;                     // leave gaps so days differ
      const t = new Date(now); t.setDate(t.getDate() - d); t.setHours(s[0], s[1] + (d*7 % 13), 0, 0);
      if(t.getTime() > now - 5*60000) return;
      const drift = (d % 5 === 0 ? 1 : 0) - (d % 7 === 3 ? 1 : 0);
      const tsv = Math.max(-3, Math.min(3, s[2] + drift));
      rows.push({ id:'ex'+(i++), p:PARTICIPANT, ts:t.toISOString(), type: k % 2 ? 'scheduled' : 'self', home:'long', example:true, same: k===4 && d%2===0,
        tsv, garments:s[5], clo:cloOf(s[5]), act:s[4], met:byId(ACTS,s[4]).met, room:s[3], air: k===1 ? 'drafty' : k===3 ? 'slight' : 'still', sun:s[6],
        actions: k===1 ? ['heat_up'] : k===4 ? ['layer_off'] : [], notes: k===4 ? ['hot_drink'] : [], secs: 14 + (i*7 % 30) });
    });
  }
  store = { votes: store.votes.filter(v => !v.example).concat(rows), paused:null, pausedWhy:'' };
  save();
}
/* Monday 00:00 of the current calendar week (the week pips and the "this week" figures use it). */
function weekStart(){ const d = startOfDay(new Date()); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; }
const todayCount = list => { const k = dayKey(new Date()); return list.filter(v => dayKey(new Date(v.ts))===k).length; };
const weekCount = list => { const ws = weekStart(); return list.filter(v => new Date(v.ts) >= ws).length; };
/* Days in a row with at least one check-in, ending today (or yesterday, until today is over), and the best run. */
function streakInfo(list){
  const days = new Set(list.map(v => dayKey(new Date(v.ts))));
  const d = startOfDay(new Date());
  if(!days.has(dayKey(d))) d.setDate(d.getDate()-1);
  let cur = 0; while(days.has(dayKey(d))){ cur++; d.setDate(d.getDate()-1); }
  const sorted = [...days].sort();
  let best = 0, run = 0, prev = null;
  sorted.forEach(k => { const [y,m,dd] = k.split('-').map(Number); const t = new Date(y, m-1, dd);
    if(prev){ const p = new Date(prev); p.setDate(p.getDate()+1); run = dayKey(p)===k ? run+1 : 1; } else run = 1;
    prev = t; best = Math.max(best, run); });
  return { cur, best: Math.max(best, cur), days };
}

/* ---------- session state and navigation ---------- */
/* S.orig: the quick check's starting answers (from the last check-in); S.quick: its answers, kept while
 * "Something has changed" runs the questions, so Back returns to them; S.editFrom: the screen an Edit
 * button was tapped on ('review' or 'same'), where answering that one question returns to. */
const ROOTS = ['today','comfort','myhome','settings','welcome','pending','install'];
const TABS = ['today','comfort','myhome','settings'];
const FLOW_SCREENS = ['athome','away','same','q','review'];
const fresh = () => ({ screen:'welcome', flow:[], i:0, a:{}, t0:null, mode:'self', same:false, lock:false, hist:[], edit:false, editFrom:'review', editPrev:null, orig:null, quick:null, undoTo:null, histN:40 });
let S = fresh();
function startSession(mode){
  const from = TABS.includes(S.screen) ? S.screen : 'today';
  S = Object.assign(fresh(), { t0:Date.now(), mode, screen:from });
  go('athome');
}
/* The same eight questions every time (FLOW_ALL, questions.js), with feeling, clothing, activity and room
 * already selected: as the quick check shows them (edits included) when coming from it, else from the
 * last check-in. */
function beginQuestions(){
  const last = lastVote(), fromQuick = S.screen==='same';
  if(fromQuick) S.quick = S.a;                              // Back from the first question returns to the quick check as it was
  const src = fromQuick ? S.quick : last && { tsv:last.tsv, clo:last.garments, act:last.act, room:last.room };
  S.same = false;
  S.a = { home:S.a.home };
  if(src) Object.assign(S.a, { tsv:src.tsv, clo:[...(src.clo||[])].filter(id => byId(GARMENTS, id)), act:byId(ACTS, src.act) ? src.act : undefined, room:byId(ROOMS, src.room) ? src.room : undefined });
  S.flow = [...FLOW_ALL];
  S.i = 0; go('q');
}
/* An earlier check-in as answers (S.a): the starting point of the quick check. What changed and anything
 * worth noting start empty; an answer the earlier check-in lacks, or that is no longer offered, stays unset. */
function answersFrom(v){
  const keep = (list, id) => byId(list, id) ? id : undefined;
  return { tsv: typeof v.tsv==='number' ? v.tsv : undefined,
    clo: (v.garments||[]).filter(id => byId(GARMENTS, id)), act: keep(ACTS, v.act), room: keep(ROOMS, v.room),
    air: keep(AIR, v.air), sun: keep(SUN, v.sun), actions: [], notes: [] };
}
const answered = (a, q) => q==='clo' ? !!(a.clo && a.clo.length) : (q==='actions' || q==='notes') ? Array.isArray(a[q]) : a[q] !== undefined && a[q] !== null && a[q] !== '';
const sameAnswer = (x, y) => Array.isArray(x) || Array.isArray(y) ? sameSet(x, y) : x === y;
const quickEdited = () => !!S.orig && FLOW_ALL.some(q => !sameAnswer(S.a[q], S.orig[q]));
/* "Still the same as last time?": the last check-in's answers, each with an Edit button. */
function quickCheck(){
  S.orig = answersFrom(lastVote());
  Object.assign(S.a, S.orig, { clo:[...S.orig.clo], actions:[], notes:[] });
  S.flow = [...FLOW_ALL];
  go('same');
}
function go(screen, opts={}){
  closeSheet();
  if(screen==='settings') remDraft = null;                  // a fresh visit shows the saved hours
  if(ROOTS.includes(screen)){ S.hist = []; }
  else if(!opts.replace && S.screen!==screen) S.hist.push(S.screen);
  S.screen = screen;
  render();                                                 // a tab's address (#comfort) is set once the app's entries are unwound (syncHistory)
}
/* The tab in the address (#comfort; Today has none), on the page's own entry only: replaceState never adds one. */
function tabUrl(){
  if(!TABS.includes(S.screen) || depth || travelling()) return;
  const base = location.pathname + location.search, url = S.screen==='today' ? base : base + '#' + S.screen;
  if(url !== base + location.hash){ try{ history.replaceState(history.state, '', url); }catch(e){} }
}
function next(){
  if(S.edit){ S.edit = false; S.editPrev = null; S.hist.pop(); S.screen = S.editFrom || 'review'; render(); return; }   // one question edited from the review or the quick check: straight back to it
  if(S.i < S.flow.length-1){ S.i++; render(); } else { go('review'); }
}
/* ---- the Android back gesture and the browser's Back ----
 * The app moves between screens inside one page, so it keeps one history entry per step that Back should
 * undo: during a check-in, the sign-up and the sign-in, the entry the page opened on stands for the tab
 * (or the welcome screen) and every step forward sits one entry above it, marked { hc, d } with d its
 * height. Back lands on the entry below and popstate takes the app one step back (back()); the app never
 * adds an entry there. Chrome skips entries a page adds without a user's tap since its last Back (its
 * history-manipulation intervention), so entries are only added after a tap (canPush): a step forward, or
 * the first tap after the app opened in the middle of a flow (from a notification, ?start=join). The app's
 * own Back button, an Edit answered, and leaving a flow (Close, Done, Save, Undo into a new check-in, a
 * finished sign-up) go back down to the height the screen needs with history.go() (Undo on the done screen
 * adds the review's entries again), so no stale entry stays and Back on a tab leaves the app at once.
 * Entries left by an earlier load of the page (a reload, or Android restoring a discarded app) are adopted
 * and unwound the same way. */
const GUARDED = s => FLOW_SCREENS.includes(s) || s==='done' || s==='join' || s==='signin';
const GUARD = (history.state && history.state.hc) || Date.now();   // the entries' mark; one left by an earlier load is adopted
const heightOf = st => st && st.hc ? (typeof st.d === 'number' ? st.d : 1) : 0;   // an entry's height (an older version's single guard: 1)
let depth = heightOf(history.state);                        // the height of the entry the app is on, or will be once its own history.go() lands
let canPush = false;                                        // a tap since the page opened or since the browser's last Back
let travelN = 0, travelAt = 0, pushAfter = false;           // own history.go() calls still to land; entries to add once they have
function travelling(){ if(travelN && Date.now() - travelAt > 2000) travelN = 0; return travelN > 0; }   // one that never lands is forgotten
/* How many entries the screen needs above the page's own: the steps Back takes from here to a tab or the
 * welcome screen, counted the way back() takes them, plus one while a sheet is open (Back closes it). */
const sheetUp = () => { const d = $('#sheet'); return d && d.open ? 1 : 0; };
const wantDepth = () => screenDepth() + sheetUp();
function screenDepth(){
  const s = S.screen;
  if(s==='join') return REG.edit ? REG_STEPS.length + 1 : REG.step + 1;   // an Edit from the last step returns to it
  if(s==='signin' || s==='done') return 1;                  // done: Back goes straight to the tab, never into the saved check-in
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
/* Brings the history to the height the screen needs: down with history.go() at any time, up with
 * pushState only after a tap (never from popstate, where canPush is false). */
function syncHistory(){
  const want = wantDepth();
  try{
    if(depth > want){ travelN++; travelAt = Date.now(); history.go(want - depth); depth = want; return; }
    if(depth < want && canPush){
      if(travelling()){ pushAfter = true; return; }         // an own history.go() still on its way: add them once it has landed
      while(depth < want){ depth++; history.pushState({ hc:GUARD, d:depth }, ''); }
    }
  }catch(e){}
  tabUrl();
}
window.addEventListener('popstate', () => {
  const d = heightOf(history.state);
  if(travelling()){                                         // one of the app's own history.go() calls has landed
    if(--travelN > 0) return;
    if(d === depth){ tabUrl(); if(pushAfter){ pushAfter = false; setTimeout(syncHistory, 0); } return; }
  }                                                         // (elsewhere: the browser's Back came in between, see below)
  canPush = false;                                          // the browser's Back (or Forward): no new entries before the next tap
  pushAfter = false;
  if(S.lock){ clearTimeout(pickTimer); S.lock = false; }    // an answer was about to move on by itself: step back instead
  let steps = depth - d;
  depth = d;
  if(sheetUp()){ closeSheet(); steps--; }                   // Back closes an open sheet first
  for(let k = 0; k < steps && GUARDED(S.screen); k++){
    if(S.screen==='done') go(TABS.includes(S.hist[0]) ? S.hist[0] : 'today');   // never back into a saved check-in
    else back();
  }
  syncHistory();                                            // Forward, or a Back on a tab: back to the app's own height (adds nothing)
});
/* A tap or key press lets the app add entries again; one on a screen opened without a tap (from a
 * notification, ?start=join, typing an email) adds the entries it is missing even when nothing is redrawn. */
function userInput(e){
  if(!e.isTrusted || (e.type==='keydown' && ['Escape','Shift','Control','Alt','Meta'].includes(e.key))) return;
  canPush = true;
  if(depth < wantDepth()) setTimeout(syncHistory, 0);       // after the tap's own action, which may need fewer
}
['click','keydown'].forEach(type => document.addEventListener(type, userInput, true));
addEventListener('pageshow', e => { if(e.persisted){ canPush = false; travelN = 0; depth = heightOf(history.state); syncHistory(); } });   // back from another page (bfcache)
function back(){
  if(S.lock) return;                                        // an answer is about to move on by itself
  if(S.screen==='join'){ regBack(); return; }
  if(S.screen==='q' && S.i>0 && !S.edit){ S.i--; render(); return; }
  const editing = S.edit, from = S.screen;
  if(editing && S.editPrev) S.a[S.editPrev.q] = S.editPrev.v;   // Back from an Edit cancels it
  S.edit = false; S.editPrev = null;
  const prev = S.hist.pop();
  if(!prev){ go(PARTICIPANT ? 'today' : 'welcome'); return; }
  if(prev==='q' && from!=='away'){ S.i = Math.max(0, S.flow.length-1); }   // back from the review: the last question ("Not home" keeps its own)
  if(prev==='same' && !editing){ if(S.quick){ S.a = S.quick; S.quick = null; } S.flow = [...FLOW_ALL]; }   // every Edit works again
  S.screen = prev; render();
}

/* ---------- when the next reminder is due ---------- */
/* the same moment if it is on the hour, otherwise the next whole hour */
function ceilHour(d){ const c = new Date(d); if(c.getMinutes() || c.getSeconds() || c.getMilliseconds()) c.setHours(c.getHours()+1, 0, 0, 0); return c; }
/* The home-hour windows on the day of d, as {start,end} Dates sorted by start: the weekday or weekend
 * pair (defaults when unset) plus the optional second pair, and only windows with start < end. */
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
/* The next moment the sender (homecomfort-ny/push/send.js) can actually send. It runs at the top of every
 * hour and sends when reminders are not paused, at least GAP_MIN minutes have passed since the last
 * check-in, and the phone's clock is inside one of the participant's home-hour windows. So: the earliest
 * allowed moment, rounded up to the next whole hour; if that is inside a window of the day it is the
 * answer, otherwise the next window start of the day (rounded up to the hour), otherwise the first window
 * of the following day, and so on for a week. With one window 6 AM-11 PM a check-in at 10:45 PM gives
 * "tomorrow at 6 AM", one at 2:10 PM "today at 3 PM". With 6-9 AM and 5-11 PM a check-in at 8:45 AM
 * gives "today at 5 PM", at 7:20 AM "today at 8 AM", at 10:50 PM "tomorrow at 6 AM". */
function nextReminder(){
  const now = new Date(), h = hours();
  let t = now.getTime();
  const last = lastVote();
  if(last) t = Math.max(t, new Date(last.ts).getTime() + GAP_MIN*60000);
  if(store.paused && new Date(store.paused) > now) t = Math.max(t, new Date(store.paused).getTime());
  let c = ceilHour(new Date(t));
  for(let i=0; i<8; i++){
    for(const w of dayWindows(c, h)){
      const s = ceilHour(c > w.start ? c : w.start);       // c itself when already inside, else the window start
      if(s <= w.end) return s;
    }
    c = new Date(c); c.setDate(c.getDate()+1); c.setHours(0,0,0,0);
  }
  return c;
}
/* "8:42 PM", or "1:42 AM tomorrow" (the end of a pause, at most a few hours ahead) */
const untilWord = d => clock(d) + (dayKey(d)===dayKey(new Date()) ? '' : ' tomorrow');
function whenWord(d){
  const now = new Date(), tom = new Date(now); tom.setDate(tom.getDate()+1);
  const k = dayKey(d);
  if(k===dayKey(now)) return 'today at ' + t12(d);
  if(k===dayKey(tom)) return 'tomorrow at ' + t12(d);
  return 'on ' + DAYS[d.getDay()] + ' at ' + t12(d);
}

/* ---------- building blocks of the main screens ---------- */
const head = (eyebrow, title, sub='') => `<header class="screen-head tab-head"><span class="eyebrow">${eyebrow}</span><h1 class="screen-title" tabindex="-1">${title}</h1>${sub?`<p class="screen-sub">${sub}</p>`:''}</header>`;
const senseTag = v => { const s = sense(v); return s ? `<span class="sense-tag ${s.cls}"><span class="orb">${ic(s.icon)}</span>${s.word} <span class="num">${s.sign}</span></span>` : ''; };
function syncLine(){
  const n = HC.pending().filter(r => r.participant === PARTICIPANT).length;
  const cls = !HC.live ? 'is-local' : n ? 'is-wait' : 'is-ok';
  const txt = !HC.live ? 'Stored on this phone only' : n ? n + ' waiting to send' : 'All check-ins sent';
  return `<span class="sync ${cls}"><i aria-hidden="true"></i>${txt}</span>`;
}
function refreshSync(){ $$('[data-sync]').forEach(el => { el.innerHTML = syncLine(); }); }
/* The reminder state on Today: paused, the next reminder, or what is needed to get reminders. */
function statusCard(){
  const st = PUSH.status(), now = Date.now(), on = st === 'on';
  const wk = [0,6].includes(new Date().getDay()) ? 'weekend' : 'weekday';
  let icon = 'bell', title, sub, badge = '';
  if(store.paused && new Date(store.paused) > now){
    icon = 'pause'; badge = '<span class="badge badge-warn badge-dot">Paused</span>';
    if(store.pausedWhy==='manual'){ title = 'Paused until you&rsquo;re back'; sub = 'Back home? Tap Check in now.' + (on ? ` Otherwise reminders resume ${whenWord(nextReminder())}.` : ''); }
    else { title = `Paused until ${untilWord(new Date(store.paused))}`; sub = `No reminders on this phone while you&rsquo;re out.${on ? ` Next one ${whenWord(nextReminder())}.` : ''}`; }
  }
  else if(on){ title = `Reminders on &middot; next ${whenWord(nextReminder())}`; sub = `Hourly &middot; ${wk}s ${hoursWord(hours(), wk)}`; }
  else if(st==='unconfigured'){ icon = 'clock'; title = `Next check-in window ${whenWord(nextReminder())}`; sub = 'Reminders start once the study database is connected'; }
  else if(st==='off'){ title = PUSH.lost() ? 'Reminders have stopped' : 'Turn on reminders'; sub = PUSH.lost() ? 'Tap to turn them on again' : 'A nudge once an hour while you&rsquo;re home'; }
  else if(st==='install'){ icon = 'download'; title = 'Add the app to your Home Screen'; sub = 'Reminders need it on your Home Screen'; }
  else if(st==='blocked'){ icon = 'bell-off'; title = 'Reminders are blocked'; sub = 'Allow notifications to turn them on'; }
  else { icon = 'bell-off'; title = 'Reminders aren&rsquo;t available here'; sub = 'Use Chrome on Android or Safari on iPhone'; }
  return `<button class="card card-link status-card" data-act="go-reminders"><span class="icon-tile it-lg">${ic(icon)}</span><span class="li-text">${badge}<span class="li-title">${title}</span><span class="li-sub">${sub}</span></span>${ic('chevron-right','ic-sm chev')}</button>`;
}
/* ---- Today: the goal ring, the streak, the 7-day dot chart ---- */
function goalCard(list){
  const t = todayCount(list), w = weekCount(list), st = streakInfo(list);
  const pct = Math.round(Math.min(1, w/WEEK_GOAL)*100);
  const ring = HCI.ring({ size:128, stroke:13, gap:5, rings:[{ value:w/WEEK_GOAL, color:'grad' }, { value:t/GOAL, color:'var(--sky)', track:'var(--sky-100)' }],
    center:`<b class="ring-value${pct >= 100 ? ' is-full' : ''}">${pct}%</b><span class="ring-label">of goal</span>`, label:`${w} of ${WEEK_GOAL} check-ins this week, ${t} of ${GOAL} today` });
  const ws = weekStart(), today = startOfDay(new Date());
  const pips = ['M','T','W','T','F','S','S'].map((l, i) => { const d = new Date(ws); d.setDate(d.getDate()+i);
    const done = st.days.has(dayKey(d)), isT = d.getTime()===today.getTime();
    return `<i class="${done?'is-done':''} ${isT && !done?'is-today':''}">${l}</i>`; }).join('');
  const daysThisWeek = [...st.days].filter(k => k >= dayKey(ws)).length;
  const streak = st.cur ? `<b class="nowrap">${st.cur}-day streak</b><span>Best: ${st.best} day${st.best===1?'':'s'}</span>` : `<b class="nowrap">No streak yet</b><span>${st.best ? `Best: ${st.best} day${st.best===1?'':'s'}` : 'Check in today'}</span>`;
  return `<section class="card-hero goal-card" aria-label="Your goals">
    <div class="goal-top">${ring}<div class="goal-legend">
      <div class="gl"><i class="gl-dot gl-week" aria-hidden="true"></i><span><b class="num">${w} of ${WEEK_GOAL}</b><span>this week${w >= WEEK_GOAL ? ' &middot; goal met' : ` &middot; ${WEEK_GOAL - w} to go`}</span></span></div>
      <div class="gl"><i class="gl-dot gl-day" aria-hidden="true"></i><span><b class="num">${t} of ${GOAL}</b><span>${t >= GOAL ? 'today &middot; goal met' : 'today so far'}</span></span></div>
    </div></div>
    <div class="streak-card"><span class="icon-tile it-streak">${ic('streak')}</span><span class="streak-text">${streak}</span><span class="daypips" aria-hidden="true">${pips}</span><span class="sr-only">Checked in on ${daysThisWeek} day${daysThisWeek===1?'':'s'} this week.</span></div>
  </section>`;
}
const PARTS = [
  {id:'morning',  n:'Morning',   pl:'Mornings',   r:'5 AM–noon',  f:h => h>=5 && h<12},
  {id:'afternoon',n:'Afternoon', pl:'Afternoons', r:'noon–5 PM',  f:h => h>=12 && h<17},
  {id:'evening',  n:'Evening',   pl:'Evenings',   r:'5–10 PM',    f:h => h>=17 && h<22},
  {id:'night',    n:'Night',     pl:'Nights',     r:'10 PM–5 AM', f:h => h>=22 || h<5}
];
const withTsv = list => list.filter(v => typeof v.tsv==='number');
function lastDays(list, n){ const from = startOfDay(new Date()); from.setDate(from.getDate()-(n-1)); return list.filter(v => new Date(v.ts) >= from); }
function mostCommon(list){
  const c = {}; list.forEach(v => { c[v.tsv] = (c[v.tsv]||0)+1; });
  const top = Object.entries(c).sort((a,b) => b[1]-a[1] || Math.abs(+a[0])-Math.abs(+b[0]))[0];
  return top ? Number(top[0]) : null;
}
/* "Mostly neutral. Evenings run warmer." from the last 7 days */
function weekSummary(list){
  const w = withTsv(lastDays(list, 7));
  if(!w.length) return 'Your week fills with color as you check in.';
  if(w.length < 3) return 'A few more check-ins and your pattern shows here.';
  let s = `Mostly ${tsvWord(mostCommon(w)).toLowerCase()}.`;
  const mean = a => a.reduce((x, v) => x + v.tsv, 0) / a.length, all = mean(w);
  let best = null;
  PARTS.forEach(p => { const a = w.filter(v => p.f(new Date(v.ts).getHours())); if(a.length >= 2){ const d = mean(a) - all; if(Math.abs(d) >= 0.6 && (!best || Math.abs(d) > Math.abs(best.d))) best = { p, d }; } });
  if(best) s += ` ${best.p.pl} run ${best.d > 0 ? 'warmer' : 'cooler'}.`;
  return s;
}
/* Check-ins of the last 7 days by hour of day, one row per day, each dot in its sensation's color. */
function weekDots(list){
  const scr = $('#screen'), W = Math.round(Math.max(300, Math.min(500, (scr && scr.clientWidth ? scr.clientWidth : 343) - 38))), L = 46, R = 10, T = 6, rowH = 24, H = T + 7*rowH + 22;
  const x = h => L + (W - L - R) * h / 24;
  const today = startOfDay(new Date()), days = [];
  for(let i=6; i>=0; i--){ const d = new Date(today); d.setDate(d.getDate()-i); days.push(d); }
  let g = '';
  [0,6,12,18,24].forEach(h => { g += `<line class="wd-grid" x1="${x(h)}" x2="${x(h)}" y1="${T}" y2="${T+7*rowH}"/>`; });
  days.forEach((d, i) => { const y = T + i*rowH + rowH/2, isT = i===6;
    g += `<rect class="wd-row${isT?' is-today':''}" x="${L-6}" y="${y-8}" width="${W-L-R+12}" height="16" rx="8"/>`;
    g += `<text class="wd-day${isT?' is-today':''}" x="0" y="${y+4.5}">${isT ? 'Today' : DAYS[d.getDay()].slice(0,3)}</text>`; });
  const pts = withTsv(list).filter(v => new Date(v.ts) >= days[0]);
  pts.forEach(v => { const d = new Date(v.ts), i = days.findIndex(x => dayKey(x)===dayKey(d)); if(i < 0) return;
    const s = sense(v.tsv), hh = d.getHours() + d.getMinutes()/60;
    g += `<circle class="wd-dot" cx="${x(hh).toFixed(1)}" cy="${T + i*rowH + rowH/2}" r="6" style="fill:var(${s.color})"><title>${DAYS[d.getDay()]} ${clock(d)}: ${s.word} (${s.sign})</title></circle>`; });
  [[0,'12 AM','start'],[6,'6 AM','middle'],[12,'Noon','middle'],[18,'6 PM','middle'],[24,'12 AM','end']].forEach(([h, t, a]) => { g += `<text class="wd-axis" x="${x(h)}" y="${H-4}" text-anchor="${a}">${t}</text>`; });
  const label = pts.length ? `Your ${pts.length} check-ins over the last 7 days by time of day, colored by how you felt. ${weekSummary(list)}` : 'No check-ins in the last 7 days yet.';
  return `<svg class="wd-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}" focusable="false">${g}</svg>`;
}
const legend = () => `<span class="legend-thermal" aria-hidden="true">Cold <span class="bar"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span> Hot</span>`;
/* ---- My comfort: three charts and the history ---- */
function freqChart(list){
  const w = withTsv(list), cnt = {}; w.forEach(v => { cnt[v.tsv] = (cnt[v.tsv]||0)+1; });
  const max = Math.max(1, ...Object.values(cnt));
  const rows = HCI.sense.slice().reverse().map(s => { const c = cnt[s.v]||0, pct = w.length ? Math.round(c/w.length*100) : 0;
    return `<li class="freq-row ${s.cls}"><span class="orb orb-sm">${ic(s.icon)}</span><span class="freq-k">${s.word} <span class="num freq-sign">${s.sign}</span></span><span class="freq-track" aria-hidden="true"><i style="width:${c ? Math.max(4, c/max*100) : 0}%"></i></span><span class="freq-n num">${c}<small>${pct}%</small></span></li>`; }).join('');
  return `<section class="card chart-card"><div class="card-head"><div><h2 class="card-title">How often each feeling</h2><p class="card-sub">${w.length} check-in${w.length===1?'':'s'} so far</p></div></div><ul class="freq" role="list">${rows}</ul></section>`;
}
/* 100% bars centered on neutral: cool shares to the left of the axis, warm to the right; a part of the day
 * with fewer than 3 check-ins is hatched instead. */
function partsChart(list){
  const w = withTsv(list);
  const rows = PARTS.map(p => {
    const a = w.filter(v => p.f(new Date(v.ts).getHours())), n = a.length;
    if(n < 3) return `<li class="dv-row"><span class="dv-k">${p.n}<small>${p.r}</small></span><span class="dv-track hatch" aria-hidden="true"><i class="dv-axis"></i></span><span class="dv-n num">${n}</span><span class="sr-only">${p.n}: ${n} check-in${n===1?'':'s'}, too few to show.</span></li>`;
    const c = {}; a.forEach(v => { c[v.tsv] = (c[v.tsv]||0)+1; });
    const share = v => (c[v]||0)/n, cool = share(-3)+share(-2)+share(-1), left = 50 - (cool + share(0)/2)*50;
    const segs = HCI.sense.map(s => share(s.v) ? `<i class="${s.cls}" style="width:${(share(s.v)*100).toFixed(2)}%"></i>` : '').join('');
    const top = mostCommon(a);
    return `<li class="dv-row"><span class="dv-k">${p.n}<small>${p.r}</small></span><span class="dv-track" aria-hidden="true"><span class="dv-bar" style="left:${left.toFixed(2)}%">${segs}</span><i class="dv-axis"></i></span><span class="dv-n num">${n}</span><span class="sr-only">${p.n}: ${n} check-ins, ${Math.round(cool*100)}% on the cool side, ${Math.round(share(0)*100)}% neutral, ${Math.round((1-cool-share(0))*100)}% on the warm side; mostly ${tsvWord(top).toLowerCase()}.</span></li>`;
  }).join('');
  return `<section class="card chart-card"><div class="card-head"><div><h2 class="card-title">Feeling by time of day</h2><p class="card-sub">Cool to the left of neutral, warm to the right</p></div></div>
    <ul class="dv" role="list">${rows}</ul><div class="dv-scale" aria-hidden="true"><span>Cooler</span><span>Neutral</span><span>Warmer</span></div>
    <div class="cluster chart-legend">${legend()}<span class="legend-na caption">Fewer than 3</span></div></section>`;
}
function daysChart(list){
  const byDay = {}; list.forEach(v => { const k = dayKey(new Date(v.ts)); byDay[k] = (byDay[k]||0)+1; });
  const today = startOfDay(new Date()), days = [];
  for(let i=13; i>=0; i--){ const d = new Date(today); d.setDate(d.getDate()-i); days.push({ d, c: byDay[dayKey(d)]||0 }); }
  const max = Math.max(GOAL, ...days.map(x => x.c)), total = days.reduce((s, x) => s + x.c, 0);
  const cols = days.map((x, i) => `<span class="d14${i===13?' is-today':''}${x.c >= GOAL ? ' is-goal' : ''}"><span class="d14-n num">${x.c||''}</span><i style="height:${x.c ? Math.max(6, x.c/max*100) : 0}%"></i></span>`).join('');
  const f = days[0].d;
  const sr = days.map(x => `<tr><th scope="row">${shortDate(x.d)}</th><td>${x.c}</td></tr>`).join('');
  return `<section class="card chart-card"><div class="card-head"><div><h2 class="card-title">Check-ins per day</h2><p class="card-sub">${total} in the last 14 days &middot; goal ${GOAL} a day</p></div></div>
    <div class="d14-plot" aria-hidden="true"><span class="d14-goal" style="bottom:${(GOAL/max*100).toFixed(1)}%"><span>Goal</span></span>${cols}</div>
    <div class="d14-axis" aria-hidden="true"><span>${MONTHS[f.getMonth()]} ${f.getDate()}</span><span class="is-today">Today</span></div>
    <table class="sr-only"><caption>Check-ins per day, last 14 days</caption><tbody>${sr}</tbody></table></section>`;
}
function historyList(list){
  const shown = list.slice(0, S.histN);
  let html = '', day = '', items = '';
  const flush = () => { if(items) html += `<section class="hist-group"><h3 class="hist-day">${day}</h3><div class="list">${items}</div></section>`; items = ''; };
  shown.forEach(v => {
    const d = new Date(v.ts), t = dayTitle(d);
    if(t !== day){ flush(); day = t; }
    const s = sense(v.tsv), bits = [byId(ROOMS, v.room)?.n, typeof v.clo==='number' && v.clo.toFixed(2) + ' clo', v.same && 'Same as before'].filter(Boolean).join(' &middot; ');
    items += `<button class="list-item hist-item" data-act="show" data-id="${esc(v.id)}">${s ? `<span class="orb orb-sm ${s.cls}">${ic(s.icon)}</span>` : `<span class="icon-tile it-sm">${ic('check')}</span>`}<span class="li-text"><span class="li-title">${s ? `${s.word} <span class="num subtle">${s.sign}</span>` : 'Check-in'}</span><span class="li-sub">${bits}</span></span><span class="li-end"><span class="num">${clock(d)}</span>${ic('chevron-right','ic-sm')}</span></button>`;
  });
  flush();
  const more = list.length > shown.length ? `<button class="btn btn-ghost btn-block" data-act="more">Show older check-ins</button>` : '';
  return `<section class="stack stack-3" aria-labelledby="histTitle"><h2 class="section-h" id="histTitle">All check-ins</h2>${html}${more}</section>`;
}
/* "Changed: turned the AC on or up, opened a window": each action name starts lower case, but a word in
 * capitals (AC) keeps them. */
const changedText = ids => 'Changed: ' + namesOf(ACTIONS, ids).replace(/(^|, )([A-Z])(?=[a-z])/g, (m, a, b) => a + b.toLowerCase());
/* everything one check-in holds, one line each (detail sheet) */
function detailRows(l){
  const li = (icon, html) => html ? `<li class="ans"><span class="ans-ic">${icon}</span><span class="ans-text">${html}</span></li>` : '';
  const act = byId(ACTS,l.act), room = byId(ROOMS,l.room), air = byId(AIR,l.air), sun = byId(SUN,l.sun), s = sense(l.tsv);
  return [
    s && li(`<span class="orb orb-sm ${s.cls}">${ic(s.icon)}</span>`, `<b>${s.word}</b> <span class="num">(${s.sign})</span>`),
    (l.garments||[]).length ? li(ic('tshirt'), `${garmentNames(l.garments)} &middot; <span class="num">${(l.clo||0).toFixed(2)}</span> clo`) : '',
    act && li(ic(act.ic), act.n), room && li(ic(room.ic), room.n),
    air && li(ic(air.ic), air.id==='still' ? 'Still air' : air.n), sun && li(ic(sun.ic), sun.n),
    Array.isArray(l.actions) && li(ic(byId(ACTIONS, l.actions[0])?.ic || 'check-circle'), l.actions.length ? changedText(l.actions) : 'Nothing changed'),
    Array.isArray(l.notes) && li(ic(byId(NOTES, l.notes[0])?.ic || 'info'), l.notes.length ? namesOf(NOTES, l.notes) : 'Nothing to note')
  ].filter(Boolean).join('');
}
/* The answers of the check-in being made (S.a), one line per question in FLOW_ALL order, each with an Edit
 * button, for the quick check. A question without an answer says so. */
function answerRows(a){
  const row = (q, icon, html) => `<li class="ans"><span class="ans-ic">${icon}</span><span class="ans-text">${html}</span><button class="btn btn-quiet btn-sm ans-edit" data-act="edit" data-q="${q}" aria-label="Edit ${QNAME[q]}">Edit</button></li>`;
  const open = '<span class="open">Not answered yet</span>';
  const act = byId(ACTS,a.act), room = byId(ROOMS,a.room), air = byId(AIR,a.air), sun = byId(SUN,a.sun), s = sense(a.tsv);
  const acts = a.actions || [], notes = a.notes || [];
  return [
    row('tsv', s && typeof a.tsv==='number' ? `<span class="orb orb-sm ${s.cls}">${ic(s.icon)}</span>` : ic('thermometer'), typeof a.tsv==='number' ? `<b>${s.word}</b> <span class="num">(${s.sign})</span>` : open),
    row('clo', ic('tshirt'), a.clo && a.clo.length ? `${garmentNames(a.clo)} &middot; <span class="num">${cloOf(a.clo).toFixed(2)}</span> clo` : open),
    row('act', ic(act ? act.ic : 'walk'), act ? act.n : open),
    row('room', ic(room ? room.ic : 'door'), room ? room.n : open),
    row('air', ic(air ? air.ic : 'still'), air ? (air.id==='still' ? 'Still air' : air.n) : open),
    row('sun', ic(sun ? sun.ic : 'sun'), sun ? sun.n : open),
    row('actions', ic(byId(ACTIONS, acts[0])?.ic || 'check-circle'), acts.length ? changedText(acts) : 'Nothing changed'),
    row('notes', ic(byId(NOTES, notes[0])?.ic || 'info'), notes.length ? namesOf(NOTES, notes) : 'Nothing to note')
  ].join('');
}
/* ---- the home profile in the participant's units ---- */
const label = (list, id) => (byId(list, id) || {}).n;
const SQFT = 0.09290304;
function areaWord(m2, u){
  if(m2 === null) return 'Not sure';
  if(typeof m2 !== 'number') return null;
  if(u === 'us'){ const f = Math.round(m2 / SQFT / 50) * 50; return f >= 4000 ? '4,000+' + NB + 'sq' + NB + 'ft' : 'About ' + f.toLocaleString('en-US') + NB + 'sq' + NB + 'ft'; }
  const m = Math.round(m2 / 5) * 5; return m >= 370 ? '370+' + NB + 'm²' : 'About ' + m + NB + 'm²';
}
const cToF = c => Math.round(c * 9/5 + 32);
function tempWord(c, u){ if(c === null) return 'Not sure'; if(typeof c !== 'number') return null; return u === 'us' ? cToF(c) + NB + '°F' : (Math.round(c*2)/2) + NB + '°C'; }
const floorWord = n => n === 0 ? 'Basement' : n === 1 ? 'Ground floor (1)' : 'Floor ' + n;
const countWord = (n, max) => typeof n === 'number' ? (max && n >= max ? max + '+' : String(n)) : null;
/* Sections of "Your home, at a glance": [title, wizard step, items [art, key, value or null]] */
function homeSections(h, u){
  const apt = h.home_type === 'apartment' || h.home_type === 'dorm';
  const list = (opts, ids) => Array.isArray(ids) && ids.length ? ids.map(id => label(opts, id)).filter(Boolean).join(', ') : null;
  return [
    ['Location', 2, [['zip', 'ZIP code', h.zip || null], [h.tenure ? 'tenure:' + h.tenure : 'tenure:own', 'Own or rent', label(TENURE, h.tenure)]]],
    ['Home type', 3, [[h.home_type ? 'home_type:' + h.home_type : 'home_type:detached', 'Home', label(HOME_TYPES, h.home_type)]]],
    ['Size and age', 4, [['floor_area', 'Floor area', areaWord(h.floor_area_m2, u)], [h.year_built ? 'year_built:' + h.year_built : 'year_built', 'Year built', label(YEAR_BUILT, h.year_built)],
      ['floors:' + (h.floors || 2), 'Floors', h.floors ? (h.floors >= 4 ? '4 or more' : String(h.floors)) : null]].concat(apt ? [['unit_floor', 'Your floor', typeof h.unit_floor === 'number' ? floorWord(h.unit_floor) : null]] : [])],
    ['Rooms and people', 5, [['bedrooms', 'Bedrooms', countWord(h.bedrooms, 6)], ['rooms', 'Rooms', countWord(h.rooms)], ['people:adult', 'Adults', countWord(h.adults)], ['people:child', 'Children', countWord(h.children)], ['people:pet', 'Pets', countWord(h.pets)]]],
    ['Heating and cooling', 6, [[h.heating && h.heating[0] ? 'heating:' + h.heating[0] : 'heating:furnace', 'Heating', list(HEATING, h.heating)], [h.cooling && h.cooling[0] ? 'cooling:' + h.cooling[0] : 'cooling:central_ac', 'Cooling', list(COOLING, h.cooling)],
      [h.thermostat ? 'thermostat:' + h.thermostat : 'thermostat:manual', 'Thermostat', label(THERMOSTAT, h.thermostat)], ['setpoint', 'Winter setting', tempWord(h.setpoint_winter_c, u)], ['setpoint', 'Summer setting', tempWord(h.setpoint_summer_c, u)]]],
    ['Windows and drafts', 7, [[h.windows ? 'windows:' + h.windows : 'windows:double', 'Windows', label(WINDOWS, h.windows)], [h.windows_open ? 'windows_open:' + h.windows_open : 'windows_open:yes', 'Can be opened', label(WINDOWS_OPEN, h.windows_open)],
      ['facing', 'Living room faces', h.facing === 'unsure' ? 'Not sure' : label(FACING, h.facing)], [h.draftiness ? 'draftiness:' + h.draftiness : 'draftiness:3', 'Drafts in winter', label(DRAFTS, h.draftiness)]]]
  ];
}
const glanceItem = (art, k, v, wide) => `<div class="glance-item${v==null?' is-empty':''}${wide?' is-wide':''}">${art}<span class="glance-text"><span class="glance-k">${k}</span><span class="glance-v">${v==null ? 'Not answered' : esc(v)}</span></span></div>`;
function homeGlance(h, u, editable){
  return homeSections(h, u).map(([title, step, items]) => `<section class="card glance-card"><div class="card-head"><h2 class="card-title">${title}</h2>${editable ? `<button class="btn btn-quiet btn-sm" data-act="reg-edit" data-step="${step}" aria-label="Edit ${title.toLowerCase()}">${ic('edit')}Edit</button>` : ''}</div>
    <div class="glance">${items.map(([a, k, v], i) => glanceItem(HCI.art(v == null ? 'unsure' : a), k, v, items.length === 1 || (items.length % 2 === 1 && i === items.length - 1 && String(v || '').length > 14))).join('')}</div></section>`).join('');
}
function homeProfile(){ try{ const h = JSON.parse(LS.get(HOME_KEY) || 'null'); return h && typeof h === 'object' ? h : null; }catch(e){ return null; } }
/* The iPhone Home Screen app, signed in with an email rather than used to join: most likely the participant
 * joined in Safari, whose storage the Home Screen app does not share (history, home profile). */
const homeScreenSignIn = () => PUSH.ios && PUSH.standalone && !homeProfile();
/* iPhone, in Safari rather than the Home Screen app, nobody signed in, and reminders possible: ask for the
 * Home Screen app before the sign-up or sign-in starts (once per tab: "Continue in Safari anyway"). */
const installFirst = () => !PARTICIPANT && PUSH.status() === 'install' && SS.get(INSTALL_SKIP_KEY) !== '1';

/* ---------- screens ---------- */
const SCREENS = {
  welcome: () => {
    const draft = REG.step > 0 || REG.name;
    return `<div class="welcome stack stack-6">
      <div class="logo"><span class="logo-mark">${ic('home')}</span><span><span class="logo-name">Home Comfort NY</span><span class="logo-sub">SUNY ESF &middot; Home comfort study</span></span></div>
      <section class="card-hero welcome-hero stack stack-3">
        <span class="eyebrow">Welcome</span>
        <h1 class="display-xl" tabindex="-1">How does your home <span class="text-gradient">feel?</span></h1>
        <p class="lede">Quick check-ins while you&rsquo;re at home show what comfortable means for you. Joining takes about 5 minutes and happens once.</p>
      </section>
      ${welcomeNote ? `<div class="note note-info" role="status">${ic('info')}<div>${esc(welcomeNote)}</div></div>` : ''}
      <div class="option-list">
        <button class="option-row" data-act="go" data-to="join"><span class="icon-tile">${ic('sparkle')}</span><span class="option-text"><span class="option-title">I&rsquo;m new here</span><span class="option-sub">${draft ? 'Carry on where you left off' : 'Join the study'}</span></span>${ic('chevron-right')}</button>
        <button class="option-row" data-act="go" data-to="signin"><span class="icon-tile">${ic('mail')}</span><span class="option-text"><span class="option-title">I have registered before</span><span class="option-sub">Continue with my email</span></span>${ic('chevron-right')}</button>
      </div>
      ${HC.live ? '' : `<div class="note note-warn">${ic('alert')}<div><b>Local mode.</b> The study database is not connected yet, so everything stays in this browser.</div></div>`}
      <p class="caption center">Questions about the study? Contact the study team at ${TEAM}. <a href="../">About the study</a></p>
    </div>`;
  },
  /* iPhone, in Safari, before anyone signs up or signs in (see installFirst): the Home Screen app keeps its
   * own storage, separate from Safari's, and only it can get reminders. */
  install: () => `<div class="welcome install stack stack-6">
      <div class="logo"><span class="logo-mark">${ic('home')}</span><span><span class="logo-name">Home Comfort NY</span><span class="logo-sub">SUNY ESF &middot; Home comfort study</span></span></div>
      <section class="card-hero stack stack-3">
        <span class="eyebrow">Before you start</span>
        <h1 class="screen-title" tabindex="-1">Add Home Comfort to your Home Screen first</h1>
        <p class="screen-sub">On iPhone, reminders only work in the Home Screen app, and it keeps its own copy of your answers, separate from Safari. Join there, so your home profile, units and check-ins stay together.</p>
      </section>
      <section class="card stack stack-3" aria-labelledby="instH"><h2 class="card-title" id="instH">Three quick steps</h2>
        <ol class="steps"><li>Tap the <b>Share</b> button ${SHARE_IC} in Safari&rsquo;s toolbar.</li><li>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</li><li>Open <b>Home Comfort</b> from your Home Screen and join there.</li></ol>
        <p class="field-hint">Opened this inside another app? Open it in Safari first.</p></section>
      <div class="note note-info">${ic('info')}<div>Joined before? In the Home Screen app, choose <b>I have registered before</b> and enter your email.</div></div>
      <button class="btn btn-quiet" data-act="install-skip">Continue in Safari anyway</button>
    </div>`,
  signin: () => qhead('Welcome back', 'Continue with your email', 'The email you joined with. No password needed.') +
    (PUSH.ios && PUSH.standalone ? `<div class="note note-info">${ic('info')}<div>Joined in Safari? Enter the same email. This Home Screen app keeps its own copy, so check-ins you made in Safari stay listed in Safari. The ones already sent are with the study team.</div></div>` : '') +
    `<form class="stack stack-5 form" id="signForm" novalidate>
      <div class="field" id="f-s_email"><label class="label" for="s_email">Email</label><input class="input" id="s_email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" aria-describedby="err-s_email"><p class="field-error" id="err-s_email" hidden></p></div>
      <button class="btn btn-primary btn-block btn-lg" type="button" data-act="signin">Continue ${ic('arrow-right')}</button>
      <button class="btn btn-quiet" type="button" data-act="go" data-to="join">I haven&rsquo;t joined yet</button>
    </form>`,
  pending: () => `<div class="pending stack stack-6 center">
      <section class="card-hero stack stack-4 center"><span class="icon-tile it-white it-lg pending-ic">${ic('clock')}</span>
        <h1 class="screen-title" tabindex="-1">Thanks${firstName() ? ', ' + esc(firstName()) : ''}!</h1>
        <p class="screen-sub">The study team will confirm your place, usually within a day. You can check in as soon as that&rsquo;s done.</p></section>
      <div class="note note-info" id="pendMsg" role="status" hidden></div>
      <div class="stack stack-3"><button class="btn btn-primary btn-block" data-act="recheck">${ic('refresh')} Check again</button><button class="btn btn-quiet" data-act="forget">Not you? Start again</button></div>
      <p class="caption">Your participant code is <b class="num">${esc(PARTICIPANT)}</b></p></div>`,
  today: () => {
    const list = votes(), l = list[0];
    const s = l && sense(l.tsv);
    const ctaSub = l ? `Last one <span data-ago="${esc(l.ts)}">${agoWord(l.ts)}</span>${s ? ' &middot; ' + s.word : ''}` : 'Takes under a minute';
    const n7 = lastDays(list, 7).length;
    return `<header class="today-head"><div class="screen-head"><span class="eyebrow">${DAYS[new Date().getDay()]}, ${MONTHS_LONG[new Date().getMonth()]} ${new Date().getDate()}</span><h1 class="screen-title" tabindex="-1">${greeting()}</h1></div>${initials() ? `<span class="avatar" aria-hidden="true">${esc(initials())}</span>` : ''}</header>
      ${goalCard(list)}
      <button class="cta-card" data-act="start"><span class="cta-text"><span class="cta-title">Check in now</span><span class="cta-sub">${ctaSub}</span></span><span class="cta-arrow">${ic('arrow-right')}</span></button>
      ${statusCard()}
      <section class="card chart-card week-card"><div class="card-head"><div><h2 class="card-title">Your last 7 days</h2><p class="card-sub">${weekSummary(list)}</p></div><span class="caption nowrap">${n7} check-in${n7===1?'':'s'}</span></div>
        ${weekDots(list)}<div class="chart-legend">${legend()}</div></section>
      <p class="caption center foot-line">${NAME ? esc(NAME) + ' &middot; ' : ''}<span class="num">${esc(PARTICIPANT)}</span> &middot; <span data-sync>${syncLine()}</span></p>`;
  },
  comfort: () => {
    const list = votes();
    const split = homeScreenSignIn();                       // iPhone Home Screen app signed in after joining in Safari
    if(!list.length) return head('Your data', 'My comfort') + `<div class="card empty">${HCI.art('setpoint')}<b>${split ? 'No check-ins in this app yet' : 'No check-ins yet'}</b><p>Your charts and history appear here after your first check-in.${split ? ' Check-ins you made in Safari stay listed in Safari.' : ''}</p><button class="btn btn-primary" data-act="start">Check in now ${ic('arrow-right')}</button></div>`;
    return head('Your data', 'My comfort', `${list.length} check-in${list.length===1?'':'s'} on this phone. Tap one for the details.`) +
      (withTsv(list).length >= 2 ? freqChart(list) + partsChart(list) : `<div class="note note-info">${ic('info')}<div>Your charts fill in after a couple of check-ins.</div></div>`) + daysChart(list) + historyList(list);
  },
  myhome: () => {
    const h = homeProfile(), u = units();
    const change = `<div class="note">${ic('info')}<div>${h ? 'To change these' : 'To change your home profile'}, contact the study team at ${TEAM}.</div></div>`;
    if(!h) return head('Your home', 'My home') + `<div class="card empty">${HCI.art('home_type:detached')}<b>Your home profile is with the study team</b><p>You signed in here with your email, so the home profile you gave when you joined isn&rsquo;t shown in this app. The study team has it.${PUSH.ios && PUSH.standalone ? ' On iPhone, Safari and the Home Screen app keep separate copies.' : ''}</p></div>` + change;
    return head('Your home', 'My home', `As you described it when you joined, in ${u === 'us' ? 'US' : 'metric'} units.`) + homeGlance(h, u, false) + change;
  },
  settings: () => {
    const u = units();
    return head('Your app', 'Settings') +
      `<section class="card stack stack-3" aria-labelledby="unitsH"><h2 class="card-title" id="unitsH">Units</h2>
        <div class="seg seg-block seg-on-white" role="radiogroup" aria-labelledby="unitsH"><button class="seg-btn" role="radio" aria-checked="${u==='us'}" data-act="units" data-v="us">US (°F, sq ft)</button><button class="seg-btn" role="radio" aria-checked="${u==='metric'}" data-act="units" data-v="metric">Metric (°C, m²)</button></div>
        <p class="field-hint">Changes how this phone shows measurements. What you told us is stored the same way either way.</p></section>
      <section class="card stack stack-4" id="reminders" aria-labelledby="remH" tabindex="-1">${remindersSection()}</section>
      <section class="card stack stack-4" aria-labelledby="acctH"><h2 class="card-title" id="acctH">Your account</h2>
        <div class="list"><div class="list-item"><span class="icon-tile">${ic('user')}</span><span class="li-text"><span class="li-sub">Name</span><span class="li-title">${esc(NAME) || '&mdash;'}</span></span></div>
          <div class="list-item"><span class="icon-tile">${ic('key')}</span><span class="li-text"><span class="li-sub">Participant code</span><span class="li-title num">${esc(PARTICIPANT)}</span></span></div>
          <div class="list-item"><span class="icon-tile">${ic('upload')}</span><span class="li-text"><span class="li-sub">Check-ins</span><span class="li-title" data-sync>${syncLine()}</span></span></div></div>
        ${HC.live ? '' : `<div class="note note-warn">${ic('alert')}<div><b>Local mode.</b> The study database is not connected yet: check-ins stay on this phone and nothing is sent.</div></div>`}
        <button class="btn btn-ghost btn-block" data-act="signout">${ic('signout')} Not you? Sign out</button></section>
      <section class="card stack stack-3 about"><h2 class="card-title">About</h2>
        <p class="body-sm muted">${esc(HC.cfg.studyName || 'Home Comfort NY')} &middot; SUNY ESF &middot; version ${esc(HC.cfg.appVersion || '')}</p>
        <p class="body-sm muted">Questions? Contact the study team at ${TEAM}. <a href="../">About the study</a></p></section>`;
  },
  /* "Yes, for over an hour" and "Yes, I just got in" both lead to the check-in (at_home long or recent) */
  athome: () => qhead('Before we start', 'Are you at home right now?', 'Then a few quick questions about how you feel.') +
    `<div class="option-list">
      <button class="option-row" data-act="home" data-v="long"><span class="icon-tile">${ic('home')}</span><span class="option-text"><span class="option-title">Yes, for over an hour</span><span class="option-sub">Let&rsquo;s do the check-in</span></span>${ic('chevron-right')}</button>
      <button class="option-row" data-act="home" data-v="recent"><span class="icon-tile">${ic('door')}</span><span class="option-text"><span class="option-title">Yes, I just got in</span><span class="option-sub">Let&rsquo;s do the check-in</span></span>${ic('chevron-right')}</button>
      <button class="option-row" data-act="home" data-v="out"><span class="icon-tile it-plain">${ic('walk')}</span><span class="option-text"><span class="option-title">No, I&rsquo;m out</span><span class="option-sub">Pause reminders for a while</span></span>${ic('chevron-right')}</button>
    </div>`,
  /* each pause with the time it ends on the phone's clock */
  away: () => {
    const opt = (v, icon, lab, sub) => `<button class="option-row" data-act="pause" data-v="${v}"><span class="icon-tile">${ic(icon)}</span><span class="option-text"><span class="option-title">${lab}</span><span class="option-sub">${sub}</span></span>${ic('chevron-right')}</button>`;
    const until = min => 'Until ' + untilWord(new Date(Date.now() + min*60000));
    return qhead('Out and about', 'When should we check again?', 'This phone stays quiet until then.') +
      `<div class="option-list">
        ${opt(60, 'clock', 'In an hour', until(60))}
        ${opt(180, 'clock', 'In three hours', until(180))}
        ${opt(300, 'clock', 'In five hours', until(300))}
        ${new Date().getHours() < 19 ? opt('evening', 'moon', 'This evening', 'Until 7' + NB + 'PM') : ''}
        ${opt('manual', 'pin', 'I&rsquo;ll tell you when I&rsquo;m back', `Or in ${MANUAL_PAUSE_H} hours at the latest`)}
      </div>`;
  },
  /* the quick check: the last check-in's answers, each with an Edit button; "Yes, still the same" saves
   * them straight away. Answers the last check-in lacks are asked first. */
  same: () => {
    const l = lastVote(), d = new Date(l.ts);
    const missing = FLOW_ALL.filter(q => !answered(S.a, q)).length, edited = quickEdited();
    const main = missing ? `<button class="btn btn-primary btn-block btn-lg" data-act="fill">Answer ${missing === 1 ? 'the one question' : 'the ' + missing + ' questions'} still open ${ic('arrow-right')}</button>`
      : `<button class="btn btn-primary btn-block btn-lg" data-act="same">${ic('check')} ${edited ? 'Save with my changes' : 'Yes, still the same'}</button>`;
    return qhead('Quick check', 'Still the same as last time?', `Logged ${dayKey(d)===dayKey(new Date()) ? 'at ' + clock(d) : 'on ' + DAYS[d.getDay()] + ' at ' + clock(d)}, ${agoWord(l.ts)}. Tap Edit to change any one.`) +
      `<section class="card card-raised quick"><div class="quick-top"><span class="eyebrow">${edited ? 'With your changes' : 'Last check-in'}</span><span class="fig fig-sm" aria-hidden="true">${avatar(S.a.clo||[])}</span></div><ul class="answers" role="list">${answerRows(S.a)}</ul></section>
      <div class="footbar">${main}<button class="btn btn-secondary btn-block" data-act="changed">Something has changed</button></div>`;
  },
  q: () => Q[S.flow[S.i]](),
  review: () => {
    const a = S.a, li = (k, v, q) => v===undefined||v===null||v===false||v==='' ? '' : `<div class="list-item"><span class="li-text"><span class="li-sub">${k}</span><span class="li-title">${v}</span></span>${q&&S.flow.includes(q)?`<span class="li-end"><button class="btn btn-quiet btn-sm" data-act="edit" data-q="${q}" aria-label="Edit ${QNAME[q]}">Edit</button></span>`:''}</div>`;
    const s = sense(a.tsv);
    return qhead('Almost done', 'Here&rsquo;s what we&rsquo;ll save') +
      `<div class="list review">
        ${li('Feeling', typeof a.tsv==='number' && s && `<span class="sense-inline ${s.cls}"><span class="orb orb-sm">${ic(s.icon)}</span>${s.word} <span class="num">(${s.sign})</span></span>`, 'tsv')}
        ${li('Wearing', a.clo && a.clo.length && `${garmentNames(a.clo)} &middot; <span class="num">${cloOf(a.clo).toFixed(2)}</span> clo`, 'clo')}
        ${li('Activity', byId(ACTS,a.act)?.n, 'act')}
        ${li('Room', byId(ROOMS,a.room)?.n, 'room')}
        ${li('Air', byId(AIR,a.air)?.n, 'air')}
        ${li('Sun', byId(SUN,a.sun)?.n, 'sun')}
        ${li('Changed', a.actions && (a.actions.length ? namesOf(ACTIONS, a.actions) : 'Nothing changed'), 'actions')}
        ${li('Notes', a.notes && (a.notes.length ? namesOf(NOTES, a.notes) : 'Nothing to note'), 'notes')}
      </div>
      <div class="footbar"><button class="btn btn-primary btn-block btn-lg" data-act="submit">${ic('check-circle')} Save check-in</button></div>`;
  },
  /* celebrates showing up, never the answer */
  done: () => {
    const list = votes(), l = list[0], t = todayCount(list), st = streakInfo(list);
    const ring = HCI.ring({ size:148, stroke:14, value:Math.min(1, t/GOAL), color:'grad', center:`<b class="ring-value num">${t}<small>/${GOAL}</small></b><span class="ring-label">today</span>`, label:`${t} of ${GOAL} check-ins today` });
    const title = t === GOAL ? 'That&rsquo;s today&rsquo;s goal!' : `Thank you${firstName() ? ', ' + esc(firstName()) : ''}!`;
    const sub = t > GOAL ? 'Above and beyond today. Thank you for showing up.' : t === GOAL ? 'Thank you for showing up, every one counts.' : `${GOAL - t} more today reaches your goal.`;
    return `<div class="done stack stack-6">
      <section class="card-hero done-hero stack stack-4 center"><div class="done-ring">${ring}</div>
        <h1 class="screen-title" tabindex="-1">${title}</h1><p class="screen-sub">${sub}</p>
        ${st.cur ? `<span class="pill pill-glass pill-lg"><span class="icon-tile it-streak it-sm">${ic('streak')}</span>${st.cur}-day streak</span>` : ''}
        ${l ? `<p class="caption">Saved at ${clock(new Date(l.ts))}${l.secs ? ` &middot; took ${secsWord(l.secs)}` : ''}</p>` : ''}</section>
      <div class="stack stack-3"><button class="btn btn-primary btn-block btn-lg" data-act="tab" data-to="today">Done</button><button class="btn btn-quiet" data-act="tab" data-to="comfort">See my comfort</button></div></div>`;
  },
  join: () => regScreen()
};

/* ---------- chrome: top bar, tab bar ---------- */
const TAB_DEF = [['today','sparkle','Today'],['comfort','chart','My comfort'],['myhome','home','My home'],['settings','sliders','Settings']];
function topbar(){
  const s = S.screen;
  const backBtn = `<button class="btn btn-icon btn-white" id="back" data-act="back" aria-label="Back">${ic('chevron-left')}</button>`;
  if(FLOW_SCREENS.includes(s)){
    const n = S.flow.length || FLOW_ALL.length, step = s==='review' ? n + 1 : S.i + 1, prog = s==='q' || s==='review';
    const now = new Date(), pct = Math.round(step/(n+1)*100);
    const title = s==='q' ? `Question ${step} of ${n}` : s==='review' ? 'Review' : 'Check-in';
    return `<div class="wrap topbar">${backBtn}<div class="topbar-title" aria-live="polite">${title}<span class="topbar-sub">${DAYS[now.getDay()]} &middot; ${clock(now)}</span></div><button class="btn btn-icon btn-white" id="close" data-act="close" aria-label="Close the check-in">${ic('x')}</button></div>` +
      (prog ? `<div class="wrap"><div class="meter" role="progressbar" aria-label="Check-in progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i class="meter-fill" style="--value:${pct}%"></i></div></div>` : '');
  }
  if(s==='join') return `<div class="wrap topbar">${backBtn}<div class="topbar-title">Join the study<span class="topbar-sub">Step ${REG.step+1} of ${REG_STEPS.length}</span></div><button class="btn btn-quiet" id="later" data-act="reg-later">Later</button></div>`;
  if(s==='signin') return `<div class="wrap topbar">${backBtn}<div class="topbar-title">Sign in</div><span class="topbar-spacer"></span></div>`;
  return '';
}
function updateChrome(){
  const s = S.screen, tabs = TABS.includes(s), bar = $('#appbar');
  document.body.classList.toggle('has-tabbar', tabs);
  const nav = $('#tabbar');
  nav.hidden = !tabs;
  if(tabs) nav.innerHTML = TAB_DEF.map(([id, icon, lab]) => `<button class="tab" id="tab-${id}" data-act="tab" data-to="${id}"${id===s ? ' aria-current="page"' : ''}>${ic(icon)}${lab}</button>`).join('');
  const top = topbar();
  bar.hidden = !top; bar.innerHTML = top;
}

/* ---------- render ---------- */
let lastKey = '', firstRender = true;
const screenKey = () => S.screen + ':' + (S.screen==='q' ? S.i + (S.edit ? 'e' : '') : S.screen==='join' ? REG.step : '');
/* the element to give focus back to after the screen is redrawn in place */
function focusKey(el){
  if(!el || el === document.body) return null;
  if(el.id) return '#' + CSS.escape(el.id);
  const d = el.dataset || {};
  if(d.act) return '[data-act="' + d.act + '"]' + (d.q ? '[data-q="' + d.q + '"]' : '') + (d.v !== undefined ? '[data-v="' + d.v + '"]' : '') + (d.k ? '[data-k="' + d.k + '"]' : '') + (d.d ? '[data-d="' + d.d + '"]' : '') + (d.to ? '[data-to="' + d.to + '"]' : '');
  return null;
}
function render(){
  const el = $('#screen'), key = screenKey();
  el.innerHTML = SCREENS[S.screen]();
  updateChrome();
  afterRender();
  if(key !== lastKey){
    el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter');
    jumpTop();
    if(!firstRender){ const h = el.querySelector('h1'); if(h) h.focus({ preventScroll:true }); }
  }
  lastKey = key; firstRender = false;
  syncHistory();
}
/* to the top of a new screen at once (brand.css scrolls smoothly, which would animate every step) */
function jumpTop(){ const r = document.documentElement, b = r.style.scrollBehavior; r.style.scrollBehavior = 'auto'; window.scrollTo(0, 0); r.style.scrollBehavior = b; }
function rerender(){
  const k = focusKey(document.activeElement);
  $('#screen').innerHTML = SCREENS[S.screen]();
  updateChrome();
  afterRender();
  if(k){ const t = document.querySelector(k); if(t && t !== document.activeElement) t.focus({ preventScroll:true }); }
}
function afterRender(){
  $$('#screen .range').forEach(r => HCI.fillRange(r));
  $$('#screen .dial').forEach(paintDial);
}

/* ---------- answering ---------- */
let pickTimer = 0;                                          // cancelled by the browser's Back (popstate)
function pick(q, raw){
  const v = q==='tsv' ? Number(raw) : raw;
  S.a[q] = v;
  rerender();
  S.lock = true;
  clearTimeout(pickTimer);
  pickTimer = setTimeout(()=>{ S.lock=false; if(S.screen==='q') next(); }, 460);
}
function toggle(q, v){
  const arr = Array.isArray(S.a[q]) ? [...S.a[q]] : [];
  const i = arr.indexOf(v);
  if(i>=0) arr.splice(i,1); else arr.push(v);
  S.a[q] = arr; rerender();
}
/* "Yes, for over an hour" and "Yes, I just got in" both lead to the check-in; the answer is stored with it
 * (at_home long or recent). */
function onHome(v){
  S.a.home = v;
  if(v==='long' || v==='recent'){
    store.paused=null; store.pausedWhy=''; save();
    schedChange({ paused_until:null, settled_at:null });
    lastVote() ? quickCheck() : beginQuestions();
  } else { go('away'); }
}
/* "No, I'm out": no reminders until the chosen time. "I'll tell you when I'm back" is open-ended in the
 * app's words, but reminders still resume after MANUAL_PAUSE_H hours, so someone who forgets to say they
 * are home is not lost to the study; the status card says when. */
function setPause(v){
  if(v==='manual'){ store.paused = new Date(Date.now()+MANUAL_PAUSE_H*3600000).toISOString(); store.pausedWhy='manual'; }
  else if(v==='evening'){ const d=new Date(); if(d.getHours()>=19){ rerender(); return; } d.setHours(19,0,0,0); store.paused=d.toISOString(); store.pausedWhy='away'; }   // from a screen left open past 7 PM: show the current options instead
  else { store.paused = new Date(Date.now()+Number(v)*60000).toISOString(); store.pausedWhy='away'; }
  save();
  schedChange({ paused_until: store.paused });
  go('today');
  showToast({ title:'Reminders paused', sub: store.pausedWhy==='manual' ? 'Tap Check in now when you&rsquo;re back' : 'Until ' + untilWord(new Date(store.paused)), kind:'info' });
}
/* Saves the check-in on the phone at once and shows the done screen; it is sent after HOLD_MS (see hold),
 * so Undo can take it back everywhere. */
function submit(){
  const a = S.a;
  const row = { id:'v'+Date.now()+Math.random().toString(36).slice(2,6), p:PARTICIPANT, ts:new Date().toISOString(), type:S.mode, home:a.home||'long',
    tsv:a.tsv, garments:a.clo||[], clo:cloOf(a.clo||[]), act:a.act, met:byId(ACTS,a.act)?.met, room:a.room,
    air:a.air, sun:a.sun, actions:a.actions, notes:a.notes,
    same:S.same, secs:Math.max(1, Math.round((Date.now()-S.t0)/1000)) };
  store.votes.push(row); store.paused=null; store.pausedWhy=''; save();
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
  // In the queue straight away (marked with the time it may be sent), so a check-in made just before the
  // app is closed still goes out the next time it opens.
  if(HC.live){ const rec = HC.toRecord(row, PARTICIPANT); rec.hold_until = Date.now() + HOLD_MS; HC.queue(rec); }
  const list = votes(), t = todayCount(list), on = PUSH.status()==='on';
  showToast({ title:'Check-in saved', sub: on ? 'Next reminder ' + whenWord(nextReminder()) : `${t} of ${GOAL} today`, action:'Undo', onAction:() => undo(row.id), onClose:() => commit(row.id), ms:HOLD_MS, hold:true });
}
/* The Undo time is over: send the check-in now. This also runs when the toast closes early (another
 * message replaced it, or the app went to the background), so the row's hold mark is removed here,
 * otherwise flushPending would skip it until the next time the app opens. A pause chosen after this
 * check-in ("No, I'm out" right after saving) is kept: submit() cleared any earlier one. */
function commit(id){
  if(!HELD.has(id)) return;
  HELD.delete(id);
  if(HC.live) LS.set(PENDING_KEY, JSON.stringify(HC.pending().map(r => r.client_id === id ? stripHold(r) : r)));
  const row = store.votes.find(v => v.id === id); if(!row) return;
  const pausedSince = !!store.paused && new Date(store.paused) > Date.now();
  schedChange(Object.assign({ last_vote_at:row.ts }, pausedSince ? {} : { paused_until:null, settled_at:null }));
  quiet(flushPending());
}
/* The app is going to the background, where an iPhone suspends it within moments (timers stop): the
 * Undo time ends now, so the check-in and its time go out while the page can still send. */
function endHolds(){
  if(!HELD.size) return;
  if(TOAST && TOAST.o.hold) closeToast();                   // the check-in's own toast: its onClose commits
  [...HELD].forEach(commit);                                // any other check-in still held
}
function undo(id){
  if(!HELD.has(id)) return;
  HELD.delete(id);
  store.votes = store.votes.filter(v => v.id !== id); save();
  LS.set(PENDING_KEY, JSON.stringify(HC.pending().filter(r => r.client_id !== id)));
  if(DEBUG) renderTable();
  if(S.screen === 'done'){ const to = S.undoTo || 'review'; if(S.hist[S.hist.length-1] === to) S.hist.pop(); S.screen = to; render(); }
  else if(TABS.includes(S.screen)) rerender();
  else if(FLOW_SCREENS.includes(S.screen)) go('today');     // a new check-in already started from the one taken back
  showToast({ title:'Check-in removed', sub:'Nothing was sent', kind:'info', ms:3500 });
}
/* 401 and 403 mean the database refused this code (no longer approved, or removed), not a hiccup. */
const refused = status => status === 401 || status === 403;
/* Sends the queued check-ins (on start, after a hold and when the phone comes back online). Rows still in
 * their Undo time wait. Rows the database refuses with 401/403 are dropped instead of retried forever, so
 * "N waiting to send" cannot stick; if any of them belonged to this code, the approval is checked again.
 * Offline or on a server error a row stays for next time. Only the rows dealt with are taken out of the
 * queue at the end, so a check-in queued meanwhile is never lost. */
let flushing = null, flushAgain = false;
async function flushPending(){
  if(!HC.live) return;
  if(flushing){ flushAgain = true; return flushing; }
  flushing = (async () => {
    do {
      flushAgain = false;
      const q = HC.pending(); if(!q.length) break;
      const done = new Set(); let mine = false;
      for(const rec of q){
        if(isHeld(rec)) continue;
        try{
          const r = await HC.insert(stripHold(rec));
          if(r.ok){ done.add(rec.client_id); continue; }
          if(refused(r.status)){ done.add(rec.client_id); if(rec.participant === PARTICIPANT) mine = true; }
        }catch(e){}
      }
      if(done.size) LS.set(PENDING_KEY, JSON.stringify(HC.pending().filter(r => !done.has(r.client_id))));
      refreshSync();
      if(mine) await afterRefusal();
    } while(flushAgain);
  })();
  try{ await flushing; } finally { flushing = null; }
}
/* A held check-in whose page was closed early: send it once its time is up. */
function flushLater(){ const q = HC.pending(); const wait = q.map(r => r.hold_until || 0).filter(t => t > Date.now()); if(wait.length) setTimeout(() => quiet(flushPending()), Math.max(...wait) - Date.now() + 250); }

/* ---------- registration and approval ---------- */
const friendly = (m, fallback) => /schema cache|could not find the function/i.test(m||'') ? 'Joining is not switched on yet. Please contact the study team.' : /registered/i.test(m||'') ? 'We could not find that email. Check the spelling, or join as new.' : /failed to fetch|network/i.test(m||'') ? 'Could not reach the study database. Check the connection and try again.' : (m || fallback);
function setIdentity(code, name){
  PARTICIPANT = code; NAME = name || ''; welcomeNote = '';
  HC.setParticipant(code); LS.set('hcny_name', NAME);
}
/* Forgets who is using this phone: the code is gone from the database (removed on the dashboard), the
 * person on the waiting screen said it is not them, or they signed out. The check-ins stay on the phone
 * (each carries its code, so the next person does not see them). */
function forgetIdentity(note){
  ['hcny_participant','hcny_name',APPROVED_KEY,'hcny_push','hcny_push_lost','hcny_sched',HOME_KEY].forEach(k => LS.del(k));
  PARTICIPANT = ''; NAME = ''; welcomeNote = note || '';
  go('welcome');
}
/* After registering or signing in: only an approved participant gets to Today. */
function afterIdentity(approved){
  if(approved === false){ LS.del(APPROVED_KEY); go('pending'); }
  else { LS.set(APPROVED_KEY, 'yes'); go('today'); }
}
function fieldError(id, msg){
  const f = $('#f-' + id), e = $('#err-' + id), input = $('#' + id);
  if(f) f.classList.toggle('is-invalid', !!msg);
  if(input && input.matches && input.matches('input,select')) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  if(e){ e.hidden = !msg; e.innerHTML = msg ? ic('alert') + '<span>' + msg + '</span>' : ''; }
  if(msg){ const t = input && input.matches && input.matches('input,select') ? input : f; if(t){ if(!t.matches('input,select,button')) t.setAttribute('tabindex', '-1'); t.focus(); t.scrollIntoView({ block:'center', behavior: reduceMotion() ? 'auto' : 'smooth' }); } }
}
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
async function signin(){
  const email = $('#s_email').value.trim();
  fieldError('s_email', '');
  if(!EMAIL_RE.test(email)) return fieldError('s_email', 'Please enter the email you joined with, like name@example.com.');
  const b = $('[data-act="signin"]'); b.disabled = true; b.classList.add('is-busy');
  try{
    if(!HC.live) throw new Error('The study database is not connected yet, so signing in is not possible. Choose I&rsquo;m new here instead.');
    const r = await HC.register({ email });
    setIdentity(r.code, r.name);
    if(r.units === 'us' || r.units === 'metric') LS.set(UNITS_KEY, r.units);   // the units chosen when joining, when the database returns them
    const split = !votes().length && homeScreenSignIn();
    afterIdentity(r.approved);
    if(split && r.approved !== false) showToast({ title:'Welcome back' + (firstName() ? ', ' + esc(firstName()) : ''), sub:'Check-ins you made in Safari stay listed in Safari', kind:'info', ms:7000 });
  }catch(e){ b.disabled = false; b.classList.remove('is-busy'); fieldError('s_email', friendly(e.message, 'Could not sign in. Check the connection and try again.')); }
}
function pendMsg(t){ const m = $('#pendMsg'); if(!m) return; m.hidden = false; m.innerHTML = ic('info') + '<div>' + t + '</div>'; }
/* Asks the database about this code. HC.approval() resolves to { approved } (no name: the name saved at
 * registration is kept) or null when the code is not registered any more. Resolves to 'yes' (and remembers
 * it), 'no' (still waiting) or 'gone'; rejects when the database cannot be reached. */
async function approvalState(){
  const r = await HC.approval(PARTICIPANT);
  if(r == null) return 'gone';
  if(!r.approved) return 'no';
  LS.set(APPROVED_KEY, 'yes');
  return 'yes';
}
let checking = false;
/* "Check again" on the waiting screen, and the quiet re-checks while it is open. */
async function recheck(silent){
  if(checking) return; checking = true;
  const b = $('[data-act="recheck"]'); if(b) b.disabled = true;
  if(!silent) pendMsg('Checking&hellip;');
  try{
    const st = await approvalState();
    if(st === 'yes'){ checking = false; go('today'); showToast({ title:'You&rsquo;re in!', sub:'Welcome to the study' }); return; }
    if(st === 'gone'){ checking = false; forgetIdentity(NOT_FOUND_MSG); return; }
    if(!silent) pendMsg('Not confirmed yet. Please try again a little later.');
  }catch(e){ if(!silent) pendMsg('Could not reach the study database. Try again later.'); }
  checking = false;
  const b2 = $('[data-act="recheck"]'); if(b2) b2.disabled = false;
}
/* On start: an unconfirmed code (not a ?p= test link) is checked in the background; Today is already
 * showing, and only a "not approved" answer swaps it for the waiting screen (a removed code goes back to
 * the welcome screen). Offline, carry on. */
const needsApprovalCheck = () => !!PARTICIPANT && HC.live && LS.get(APPROVED_KEY) !== 'yes' && !VIA_URL;
async function checkApproval(){
  try{
    const st = await approvalState();
    if(st === 'yes'){ if(TABS.includes(S.screen)) rerender(); }
    else if(st === 'gone') forgetIdentity(NOT_FOUND_MSG);
    else if(S.screen !== 'pending') go('pending');
  }catch(e){ /* unreachable database: Today stays; the database refuses check-ins on its own */ }
}
/* The database refused a check-in for this code (401/403). Approved after all: nothing to do (the refused
 * rows stay on the phone). Not approved: the waiting screen. Not registered: the welcome screen. A ?p=
 * test link is never gated, its rows are simply dropped. */
async function afterRefusal(){
  if(VIA_URL || !PARTICIPANT) return;
  try{
    const st = await approvalState();
    if(st === 'gone') forgetIdentity(NOT_FOUND_MSG);
    else if(st === 'no'){ LS.del(APPROVED_KEY); if(S.screen !== 'pending') go('pending'); }
  }catch(e){ /* unreachable: leave things as they are */ }
}

/* ---------- reminders ---------- */
const HOURS_KEY = 'hcny_hours';
/* Home hours: a weekday and a weekend window, plus an optional second window for each (null when unused).
 * The same eight fields go to push_subscriptions, where the sender reads them. */
const DEFAULT_HOURS = { weekday_start:'17:00', weekday_end:'22:30', weekend_start:'09:00', weekend_end:'22:30', weekday2_start:null, weekday2_end:null, weekend2_start:null, weekend2_end:null };
const hhmm = s => { const m = hm(s); return m ? pad(m[0])+':'+pad(m[1]) : null; };
/* The saved hours, always usable: "HH:MM", a missing main bound takes the default, a main window that ends
 * at or before its start runs until 23:59, and a second window counts only with both ends set and ending
 * after it starts (00:00 as its end also means 23:59). The sender (homecomfort-ny/push/send.js,
 * insideHomeHours) reads stored hours the same way. */
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
let remDraft = null;                                        // unsaved hours in Settings while they are edited
/* "7 AM–9 AM & 5 PM–10:30 PM", windows in order of the day */
function hoursWord(h, p){
  const w = [[h[p+'_start'], h[p+'_end']], [h[p+'2_start'], h[p+'2_end']]].filter(x => x[0] && x[1]).sort((a, b) => a[0] < b[0] ? -1 : 1);
  return w.map(x => `${hm12(x[0])}&ndash;${hm12(x[1])}`).join(' &amp; ');
}
/* Why these hours cannot be saved, or '' when they can: every period has to end after it starts (the
 * sender and the database would never use one that does not). */
function hoursProblem(h){
  for(const [p, name] of [['weekday','Weekdays'], ['weekend','Weekends']]){
    if(!(h[p+'_start'] < h[p+'_end'])) return `${name}: the end time must be later than the start time. For &ldquo;until midnight&rdquo; choose 11:59${NB}PM.`;
    if(h[p+'2_start'] && h[p+'2_end'] && !(h[p+'2_start'] < h[p+'2_end'])) return `${name}, second period: the end time must be later than the start time.`;
  }
  return '';
}
/* The time zone of the phone's clock, e.g. America/New_York: the sender reads the home hours in it, so the
 * clocks going back or forward need nothing from anyone. */
const zone = () => { try{ return Intl.DateTimeFormat().resolvedOptions().timeZone || null; }catch(e){ return null; } };
/* The service worker registration, or null when there is none within a few seconds (it failed to install),
 * so nothing waits on it forever. */
const swReady = () => 'serviceWorker' in navigator ? Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(() => r(null), 5000))]) : Promise.resolve(null);
/* The reminder state this phone knows: the last check-in and a pause still running. */
function personState(){
  const l = lastVote(), paused = store.paused && new Date(store.paused) > Date.now() ? store.paused : null;
  return Object.assign({ paused_until: paused }, l ? { last_vote_at: l.ts } : {});
}
/* Changes to the schedule ("I'm out", "I just got in", a check-in) wait in SCHED_KEY until the reminder
 * service confirms them, and go along with every later request: a change made offline still arrives, and an
 * old pause on the server cannot come back after the participant has said they are home. A pause or "just
 * got in" that has not arrived within the hour is dropped (the check-in time is kept): by then a newer
 * "Not home" from the notification may be on the server, and it must win. */
const SCHED_KEY = 'hcny_sched', SCHED_MAX_AGE = 60*60000;
let schedSeq = 0;                                           // counts schedule changes made while the app is open
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
  configured: HC.live && !!HC.cfg.vapidPublicKey,
  status(){
    if(!this.configured) return 'unconfigured';
    if(!this.supported) return (this.ios && !this.standalone) ? 'install' : 'unsupported';
    if(Notification.permission === 'denied') return 'blocked';
    return LS.get('hcny_push') === 'on' ? 'on' : 'off';
  },
  lost(){ return LS.get('hcny_push_lost') === '1'; },      // reminders stopped without the participant turning them off
  subscribe(reg){ return reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: b64ToBytes(HC.cfg.vapidPublicKey) }); },
  /* this phone in the shape save_push_subscription() takes */
  record(sub){
    const j = sub.toJSON();
    return Object.assign({ endpoint:j.endpoint, participant:PARTICIPANT, p256dh:j.keys.p256dh, auth:j.keys.auth,
      tz:zone(), tz_offset_min:-new Date().getTimezoneOffset(), interval_min:INTERVAL, user_agent:navigator.userAgent.slice(0,200) }, hours());
  },
  async enable(){
    // Asked first, straight from the tap: iPhone only shows the question in direct response to one.
    const perm = await Notification.requestPermission();
    if(perm !== 'granted') return 'blocked';
    const reg = await swReady();
    if(!reg) throw new Error('Reminders could not start on this phone. Close the app, open it again and try once more.');
    const sub = await this.subscribe(reg);
    const saved = await HC.saveSubscription(this.record(sub));
    if(saved === 'refused'){ quiet(afterRefusal()); throw new Error('The study database did not accept this participant code. Please contact the study team.'); }
    if(saved === 'invalid') throw new Error('Reminders don&rsquo;t work in this browser. On Android use Chrome; on iPhone use Safari and add the app to your Home Screen.');
    if(saved === 'full') throw new Error('Too many phones are registered for reminders under your code. Please contact the study team.');
    if(saved !== true) throw new Error('This phone could not be registered. Check the connection and try again.');
    LS.set('hcny_push','on'); LS.del('hcny_push_lost');
    quiet(this.sync(personState()));                        // no reminder during a pause or right after a check-in
    return 'on';
  },
  async disable(){
    try{ const reg = await swReady(); const sub = reg && await reg.pushManager.getSubscription(); if(sub){ await HC.updateSchedule(sub.endpoint, { enabled:false }); await sub.unsubscribe(); } }catch(e){}
    LS.set('hcny_push','off'); LS.del('hcny_push_lost'); LS.del(SCHED_KEY);
  },
  /* Sends schedule changes for this phone to the reminder service (see update_push_schedule in
   * supabase-setup.sql), together with the phone's time zone and any change still waiting in SCHED_KEY,
   * and keeps the registration healthy: when the service no longer knows this phone (the push service
   * dropped its subscription, so the sender removed it) and the participant is still in the study, the
   * phone subscribes afresh and registers again; when even that is impossible, reminders show as stopped,
   * so the participant can turn them on again. A participant who has been removed or is no longer approved
   * gets the waiting or welcome screen instead (afterRefusal). Resolves to the phone's state on the server
   * ({ found:true, enabled, paused_until, settled_at }), or null when nothing could be confirmed. */
  async sync(changes){
    if(this.status() !== 'on') return null;
    const reg = await swReady(); if(!reg) return null;
    const pend = LS.get(SCHED_KEY);
    const body = Object.assign({ tz:zone(), tz_offset_min:-new Date().getTimezoneOffset() }, pendingSched(), changes || {});
    const done = st => { if(st && st.found && LS.get(SCHED_KEY) === pend) LS.del(SCHED_KEY); return st; };
    let sub = null; try{ sub = await reg.pushManager.getSubscription(); }catch(e){}
    const st = sub ? await HC.updateSchedule(sub.endpoint, body) : { found:false };
    if(!st || st.found) return done(st);
    let ap; try{ ap = await HC.approval(PARTICIPANT); }catch(e){ return null; }
    const stop = () => { LS.set('hcny_push','off'); LS.del(SCHED_KEY); quiet(afterRefusal()); return null; };
    if(!ap || !ap.approved) return stop();
    try{
      if(sub) await sub.unsubscribe().catch(()=>{});
      sub = await this.subscribe(reg);
    }catch(e){ LS.set('hcny_push','off'); LS.set('hcny_push_lost','1'); return null; }
    const saved = await HC.saveSubscription(this.record(sub));
    if(saved === 'refused') return stop();
    if(saved !== true) return null;
    return done(await HC.updateSchedule(sub.endpoint, Object.assign(personState(), body)));
  }
};
let lastSync = 0;
/* When the app opens or comes back to the screen (at most every few minutes): tells the reminder service
 * the phone's time zone, home hours and last check-in, sends any change still waiting, repairs a
 * registration the service has lost, and picks up a pause set from the notification's "Not home" button. */
async function syncReminders(){
  if(!PARTICIPANT || PUSH.status() !== 'on' || Date.now() - lastSync < 5*60000) return;
  lastSync = Date.now();
  const seq = schedSeq, l = lastVote(), h = hours();
  const st = await PUSH.sync(Object.assign({ enabled:true }, hoursProblem(h) ? {} : h, l ? { last_vote_at:l.ts } : {}));
  let changed = PUSH.status() !== 'on';
  const until = st && st.found && st.paused_until ? new Date(st.paused_until) : null;
  // A later pause on the server came from "Not home", unless the participant changed something meanwhile.
  if(seq === schedSeq && until && until > Date.now() && !(store.paused && new Date(store.paused) >= until)){
    store.paused = until.toISOString(); store.pausedWhy = 'away'; save(); changed = true;
  }
  if(changed && (S.screen==='today' || S.screen==='settings')) rerender();
}
function b64ToBytes(s){ const p = '='.repeat((4 - s.length % 4) % 4); const b = atob((s + p).replace(/-/g,'+').replace(/_/g,'/')); return Uint8Array.from(b, c => c.charCodeAt(0)); }
/* the 24 hours of a day type, on when any home-hour window covers part of the hour */
function strip(h, p){
  const w = [[h[p+'_start'], h[p+'_end']], [h[p+'2_start'], h[p+'2_end']]].filter(x => hm(x[0]) && hm(x[1])).map(x => { const a = hm(x[0]), b = hm(x[1]); return [a[0]*60+a[1], b[0]*60+b[1]]; });
  let s = ''; for(let i=0; i<24; i++){ const on = w.some(([a, b]) => a < (i+1)*60 && b > i*60); s += `<i class="${on?'is-on':''}"></i>`; }
  return s;
}
/* Settings, reminders: what this phone can do, the home hours and the buttons (SWITCH's reminders screen) */
function remindersSection(){
  const st = PUSH.status(), h = remDraft || hours();
  const tin = (id, v, lab) => `<input type="time" class="input time-in" id="${id}" value="${esc(v||'')}" aria-label="${lab}">`;
  /* one day type: its from/until row, then either the optional second period (with a remove control) or the button that adds one */
  const grp = (p, name, ids) => `<fieldset class="fieldset hours-group"><legend class="label">${name}</legend>
      <div class="hrow">${tin(ids[0], h[p+'_start'], name+' from')}<span class="to">to</span>${tin(ids[1], h[p+'_end'], name+' until')}</div>` +
    (h[p+'2_start'] || h[p+'2_end']
      ? `<p class="hrow-label" aria-hidden="true">and</p><div class="hrow">${tin(ids[2], h[p+'2_start'], name+', second period, from')}<span class="to">to</span>${tin(ids[3], h[p+'2_end'], name+', second period, until')}</div><button class="btn btn-quiet btn-sm addw" data-act="rm-win" data-w="${p}" aria-label="Remove the second ${name.toLowerCase()} period">${ic('x')}Remove this period</button>`
      : `<button class="btn btn-quiet btn-sm addw" data-act="add-win" data-w="${p}">${ic('plus')}Add another period</button>`) +
    `<div class="hours-strip" id="strip-${p}" aria-hidden="true">${strip(h, p)}</div><div class="hours-axis" aria-hidden="true"><span>12 AM</span><span>6 AM</span><span>Noon</span><span>6 PM</span><span>12 AM</span></div></fieldset>`;
  const form = `<div class="stack stack-5 hours-form"><p class="label">When are you usually at home?</p>${grp('weekday', 'Weekdays', ['h_ws','h_we','h_ws2','h_we2'])}${grp('weekend', 'Weekends', ['h_es','h_ee','h_es2','h_ee2'])}
      <p class="field-hint">Reminders only arrive inside these hours, never within half an hour of a check-in, and not while you&rsquo;ve said you&rsquo;re out.</p></div>`;
  const msg = `<div class="note" id="remMsg" role="status" hidden></div>`;
  const title = `<div class="card-head"><div><h2 class="card-title" id="remH">Reminders</h2><p class="card-sub">${st==='on' ? 'On for this phone' : 'A nudge once an hour while you&rsquo;re home'}</p></div>${st==='on' ? `<span class="badge badge-good badge-dot">On</span>` : ''}</div>`;
  if(st === 'install') return title + `<ol class="steps"><li>Tap the <b>Share</b> button ${SHARE_IC} in Safari.</li><li>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</li><li>Open the app from your Home Screen, choose <b>I have registered before</b> and enter your email.</li><li>Turn on reminders there.</li></ol>
    <p class="field-hint">The Home Screen app keeps its own copy, so the check-ins listed here in Safari stay here. The ones already sent are with the study team.</p>`;
  if(st === 'unsupported') return title + `<div class="note">${ic('info')}<div>This browser can&rsquo;t show reminders. On Android use Chrome. On iPhone use Safari and add the app to your Home Screen.</div></div>`;
  if(st === 'blocked') return title + `<div class="note note-warn">${ic('bell-off')}<div>Notifications are blocked for this app. Allow them in your phone&rsquo;s settings, then come back here.</div></div>`;
  if(st === 'unconfigured') return title + `<div class="note note-info">${ic('info')}<div>Reminders start once the study database is connected. Your home hours are saved on this phone now.</div></div>` + form + msg + `<button class="btn btn-primary btn-block" data-act="save-hours">Save hours</button>`;
  if(st === 'off') return title + (PUSH.lost() ? `<div class="note note-warn">${ic('alert')}<div>Reminders have stopped on this phone. Turn them on again below.</div></div>` : '') + form + msg + `<button class="btn btn-primary btn-block" data-act="push-on">${ic('bell')} Turn on reminders</button>`;
  return title + form + msg + `<button class="btn btn-primary btn-block" data-act="save-hours">Save hours</button><button class="btn btn-ghost btn-block" data-act="push-off">${ic('bell-off')} Turn off reminders</button>`;
}
/* The eight hour fields as the form shows them: the main windows fall back to the defaults, a second
 * window is null unless its row is present and both ends are filled in. */
function readHours(){
  const val = id => { const el = $('#'+id); return el && el.value ? el.value : null; };
  const pair = (a, b) => { const s = val(a), e = val(b); return s && e ? [s, e] : [null, null]; };
  const h = { weekday_start: val('h_ws') || DEFAULT_HOURS.weekday_start, weekday_end: val('h_we') || DEFAULT_HOURS.weekday_end, weekend_start: val('h_es') || DEFAULT_HOURS.weekend_start, weekend_end: val('h_ee') || DEFAULT_HOURS.weekend_end };
  [h.weekday2_start, h.weekday2_end] = pair('h_ws2', 'h_we2');
  [h.weekend2_start, h.weekend2_end] = pair('h_es2', 'h_ee2');
  return h;
}
function remMsg(t, kind){ const m = $('#remMsg'); if(!m) return; m.hidden = false; m.className = 'note' + (kind==='ok' ? ' note-good' : kind==='warn' ? ' note-warn' : ''); m.innerHTML = ic(kind==='ok' ? 'check-circle' : 'alert') + '<div>' + t + '</div>'; }

/* ---------- sign-up: a picture-based wizard, its draft kept in REG_KEY ---------- */
const REG_STEPS = [
  {id:'units',  ic:'ruler',        t:'Units',               min:0.2},
  {id:'you',    ic:'user',         t:'About you',           min:1.2},
  {id:'where',  ic:'map-pin',      t:'Location',            min:0.4},
  {id:'type',   ic:'home',         t:'Home type',           min:0.3},
  {id:'size',   ic:'layers',       t:'Size and age',        min:0.7},
  {id:'rooms',  ic:'users',        t:'Rooms and people',    min:0.5},
  {id:'heat',   ic:'thermometer',  t:'Heating and cooling', min:1.0},
  {id:'windows',ic:'window',       t:'Windows and drafts',  min:0.7},
  {id:'review', ic:'sparkle',      t:'At a glance',         min:0.3}
];
const regFresh = () => ({ v:1, step:0, units: LS.get(UNITS_KEY) === 'metric' ? 'metric' : 'us', name:'', email:'', gender:'', birth_year:'', ft:'', inch:'', cm:'', lb:'', kg:'', sens:null, home:{}, edit:false });
function loadReg(){ try{ const r = JSON.parse(LS.get(REG_KEY) || 'null'); if(r && r.v === 1 && r.home) return Object.assign(regFresh(), r, { step: Math.max(0, Math.min(REG_STEPS.length-1, r.step|0)) }); }catch(e){} return regFresh(); }
let REG = loadReg();
function saveReg(){ LS.set(REG_KEY, JSON.stringify(REG)); }
const isApt = () => REG.home.home_type === 'apartment' || REG.home.home_type === 'dorm';
const numOf = s => { const n = parseFloat(String(s ?? '').replace(',', '.')); return isFinite(n) ? n : null; };
/* switching units converts what has been typed so far (height and weight); the home is always metric */
function convertUnits(to){
  const r = REG; if(r.units === to) return;
  if(to === 'metric'){
    const ft = numOf(r.ft), inch = numOf(r.inch), lb = numOf(r.lb);
    if(ft !== null || inch !== null) r.cm = String(Math.round(((ft||0)*12 + (inch||0)) * 2.54));
    if(lb !== null) r.kg = String(Math.round(lb * 0.45359237 * 10) / 10);
  } else {
    const cm = numOf(r.cm), kg = numOf(r.kg);
    if(cm !== null){ let t = Math.round(cm / 2.54); r.ft = String(Math.floor(t / 12)); r.inch = String(t % 12); }
    if(kg !== null) r.lb = String(Math.round(kg / 0.45359237));
  }
  r.units = to;
}
/* what HC.register() takes: the profile in metric, the home with exactly the README keys */
function regFields(){
  const r = REG; let height_cm = null, weight_kg = null;
  if(r.units === 'us'){
    const ft = numOf(r.ft), inch = numOf(r.inch), lb = numOf(r.lb);
    if(ft !== null || inch !== null) height_cm = Math.round(((ft||0)*12 + (inch||0)) * 2.54 * 10) / 10;
    if(lb !== null) weight_kg = Math.round(lb * 0.45359237 * 10) / 10;
  } else { height_cm = numOf(r.cm); weight_kg = numOf(r.kg); }
  const by = numOf(r.birth_year), h = r.home, home = {};
  ['zip','home_type','tenure','year_built','floors','unit_floor','floor_area_m2','bedrooms','rooms','adults','children','pets','heating','cooling','thermostat','setpoint_winter_c','setpoint_summer_c','windows','windows_open','facing','draftiness']
    .forEach(k => { if(h[k] !== undefined && h[k] !== '') home[k] = Array.isArray(h[k]) ? [...h[k]] : h[k]; });
  if(!isApt()) delete home.unit_floor;
  ['heating','cooling'].forEach(k => { if(Array.isArray(home[k]) && !home[k].length) delete home[k]; });
  if(home.zip) home.zip = String(home.zip).trim();
  return { email: r.email.trim(), name: r.name.trim().replace(/\s+/g, ' '), gender: r.gender || null, birth_year: by !== null ? Math.round(by) : null,
    height_cm, weight_kg, sensitivity: r.sens || null, units: r.units, home };
}
/* friendly checks before leaving a step: [field id, message] or null */
function regProblem(step){
  const r = REG, y = new Date().getFullYear();
  if(step === 1){
    if(r.name.trim().length < 2) return ['r_name', 'Please enter your name.'];
    if(!EMAIL_RE.test(r.email.trim())) return ['r_email', 'Please enter an email address, like name@example.com.'];
    const by = numOf(r.birth_year);
    if(r.birth_year !== '' && (by === null || by < 1900 || by > y - 10 || by % 1)) return ['r_year', `Please enter the year as four digits, between 1900 and ${y - 10}.`];
    if(r.units === 'us'){
      const ft = numOf(r.ft), inch = numOf(r.inch);
      if((r.ft !== '' || r.inch !== '') && (ft === null || ft < 3 || ft > 8 || (r.inch !== '' && (inch === null || inch < 0 || inch >= 12)))) return ['r_ft', 'Please check your height: feet from 3 to 8, inches from 0 to 11.'];
      const lb = numOf(r.lb); if(r.lb !== '' && (lb === null || lb < 50 || lb > 770)) return ['r_lb', 'Please check your weight in pounds.'];
    } else {
      const cm = numOf(r.cm); if(r.cm !== '' && (cm === null || cm < 90 || cm > 250)) return ['r_cm', 'Please check your height in centimeters (90 to 250).'];
      const kg = numOf(r.kg); if(r.kg !== '' && (kg === null || kg < 25 || kg > 350)) return ['r_kg', 'Please check your weight in kilograms.'];
    }
  }
  if(step === 2 && r.home.zip && !/^\d{5}$/.test(String(r.home.zip).trim())) return ['r_zip', 'A ZIP code has 5 digits. Or leave it empty.'];
  if(step === 3 && !r.home.home_type) return ['home_type', 'Please pick the closest match, or Something else.'];
  return null;
}
function regGo(step){ REG.step = step; saveReg(); render(); }
function regNext(){
  const p = regProblem(REG.step);
  if(p) return fieldError(p[0], p[1]);
  if(REG.step === REG_STEPS.length - 1) return regJoin();
  if(REG.edit){ REG.edit = false; return regGo(REG_STEPS.length - 1); }
  regGo(REG.step + 1);
}
function regBack(){
  if(REG.edit){ REG.edit = false; return regGo(REG_STEPS.length - 1); }
  if(REG.step > 0) return regGo(REG.step - 1);
  saveReg(); go('welcome');
}
async function regJoin(){
  const b = $('[data-act="reg-next"]'), f = regFields();
  fieldError('join', '');
  b.disabled = true; b.classList.add('is-busy');
  try{
    if(!HC.live){ setIdentity(LOCAL_CODE, f.name); finishJoin(f, true); afterIdentity(true); showToast({ title:'Welcome to the study!', sub:'Local mode: everything stays on this phone' }); return; }
    const r = await HC.register(f);
    setIdentity(r.code, r.name || f.name);
    finishJoin(f, r.is_new !== false);
    afterIdentity(r.approved);
    if(r.is_new === false) showToast({ title:'Welcome back', sub:'That email was already registered, so we signed you in', kind:'info' });
  }catch(e){ b.disabled = false; b.classList.remove('is-busy'); fieldError('join', friendly(e.message, 'Could not join. Check the connection and try again.')); }
}
function finishJoin(f, isNew){
  LS.set(UNITS_KEY, f.units);
  if(isNew) LS.set(HOME_KEY, JSON.stringify(f.home)); else LS.del(HOME_KEY);
  LS.del(REG_KEY); REG = regFresh();
}
function minutesLeft(){
  const m = REG_STEPS.slice(REG.step).reduce((s, x) => s + x.min, 0);
  return REG.step === REG_STEPS.length - 1 ? 'Last step' : m < 1 ? 'Less than a minute left' : `About ${Math.round(m)} minute${Math.round(m)===1?'':'s'} left`;
}
/* ---- pieces of the wizard ---- */
const regTile = (k, o, on, art, cls='') => { const txt = `<span class="ptile-label">${o.n}</span>${o.h?`<span class="ptile-hint">${o.h}</span>`:''}`;
  return `<button class="ptile ${cls}" type="button" role="radio" aria-checked="${on?'true':'false'}" data-act="reg-pick" data-k="${k}" data-v="${o.id}"><span class="ptile-art">${art}</span>${/ptile-row/.test(cls) ? `<span class="ptile-text">${txt}</span>` : txt}${HCI.tick()}</button>`; };
const regMulti = (k, o, on, art) => `<button class="ptile ptile-sm" aria-pressed="${on?'true':'false'}" data-act="reg-toggle" data-k="${k}" data-v="${o.id}"><span class="ptile-art">${art}</span><span class="ptile-label">${o.n}</span>${HCI.tick()}</button>`;
const groupErr = id => `<p class="field-error" id="err-${id}" hidden></p>`;
const fieldBlock = (id, title, hint, body, opt) => `<div class="field reg-q" id="f-${id}" role="group" aria-labelledby="lab-${id}"><div class="reg-q-head"><h2 class="reg-q-title" id="lab-${id}">${title}${opt ? ' <span class="opt">(optional)</span>' : ''}</h2>${hint ? `<p class="field-hint">${hint}</p>` : ''}</div>${body}${groupErr(id)}</div>`;
/* A count of the home profile. Until it is tapped it shows "–" and stays out of the profile (not answered).
 * A button at its limit stays focusable (aria-disabled, not disabled), so keyboard and screen-reader focus
 * stays on it when the value reaches the limit and the screen is redrawn. */
function stepper(k, val, min, max, aria, unit, plus){
  const set = typeof val === 'number', off = on => on ? 'aria-disabled="true"' : '';
  const shown = set ? (plus && val >= max ? max + '+' : val) + (unit ? `<span class="stepper-unit">${unit}</span>` : '') : '<span class="stepper-unset" aria-hidden="true">&ndash;</span><span class="sr-only">Not answered</span>';
  return `<div class="stepper" role="group" aria-label="${aria}"><button class="stepper-btn" data-act="reg-step" data-k="${k}" data-d="-1" aria-label="Fewer ${aria.toLowerCase()}" ${off(set && val <= min)}>${ic('minus')}</button><output class="stepper-val" aria-live="polite">${shown}</output><button class="stepper-btn" data-act="reg-step" data-k="${k}" data-d="1" aria-label="More ${aria.toLowerCase()}" ${off(set && val >= max)}>${ic('plus')}</button></div>`;
}
const STEP_LIMITS = { bedrooms:[0,6], rooms:[1,12], adults:[1,10], children:[0,10], pets:[0,10], unit_floor:[0,60] };
/* the value a count takes on its first tap: − the lowest ("none", a basement, one adult), + the first one
 * above nothing (1 bedroom, 1 room, 1 adult, 1 child, the ground floor) */
const firstStep = (key, d) => { const [mn] = STEP_LIMITS[key]; return d < 0 ? mn : Math.max(mn, 1); };
/* thermostat setting dials: 50-85 °F in whole degrees, 10-29.5 °C in halves; the value is kept in °C */
const DIAL = { us:{ min:50, max:85, step:1, u:'°F' }, metric:{ min:10, max:29.5, step:0.5, u:'°C' } };
const DIAL_DEFAULT = { setpoint_winter_c:20, setpoint_summer_c:23.5 };
const dialShown = (c, u) => u === 'us' ? cToF(c) : Math.round(c*2)/2;
const dialToC = (v, u) => u === 'us' ? Math.round((v - 32) * 5/9 * 10) / 10 : v;
function dialHtml(k, title){
  const u = REG.units, v = REG.home[k], set = typeof v === 'number', unsure = v === null, D = DIAL[u];
  const shown = set ? dialShown(v, u) : null;
  return `<div class="dial-card${set ? '' : ' is-unset'}"><div class="dial" id="dial-${k}" data-k="${k}" role="slider" tabindex="0" aria-label="${title}" aria-valuemin="${D.min}" aria-valuemax="${D.max}" ${set ? `aria-valuenow="${shown}" aria-valuetext="${shown} ${u==='us'?'degrees Fahrenheit':'degrees Celsius'}"` : 'aria-valuetext="Not set"'}>
      <svg viewBox="0 0 150 140" aria-hidden="true" focusable="false"><defs><linearGradient id="dg-${k}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#3AA6F2"/><stop offset=".55" stop-color="#6246EA"/><stop offset="1" stop-color="#FF9E7A"/></linearGradient></defs>
        <path class="dial-track" d=""/><path class="dial-fill" d="" stroke="url(#dg-${k})"/><circle class="dial-knob" r="11"/>
        <text class="dial-num" x="75" y="78" text-anchor="middle"></text><text class="dial-unit" x="75" y="98" text-anchor="middle"></text>
        <text class="dial-end" x="34" y="136" text-anchor="middle">${D.min}</text><text class="dial-end" x="116" y="136" text-anchor="middle">${D.max}</text></svg></div>
    <div class="dial-side"><span class="label">${title}</span><span class="field-hint">${set ? 'Drag the dial or use − and +' : unsure ? 'Marked as not sure' : 'Tap − or + to set it'}</span>
      <span class="dial-pm"><button class="stepper-btn" data-act="reg-dial" data-k="${k}" data-d="-1" aria-label="Lower ${title.toLowerCase()}">${ic('minus')}</button><button class="stepper-btn" data-act="reg-dial" data-k="${k}" data-d="1" aria-label="Raise ${title.toLowerCase()}">${ic('plus')}</button></span>
      <button class="chip chip-sm" aria-pressed="${unsure}" data-act="reg-unsure" data-k="${k}"><span class="chip-check">${ic('check')}</span>Not sure</button></div></div>`;
}
const DIAL_A0 = 135, DIAL_SWEEP = 270, DIAL_R = 54, DCX = 75, DCY = 72;
const dialPt = a => [DCX + DIAL_R * Math.cos(a * Math.PI / 180), DCY + DIAL_R * Math.sin(a * Math.PI / 180)];
const arc = (a0, a1) => { const [x0, y0] = dialPt(a0), [x1, y1] = dialPt(a1); return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${DIAL_R} ${DIAL_R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; };
function paintDial(el){
  const k = el.dataset.k, u = REG.units, D = DIAL[u], v = REG.home[k], set = typeof v === 'number';
  const shown = set ? Math.max(D.min, Math.min(D.max, dialShown(v, u))) : (D.min + D.max) / 2;
  const t = (shown - D.min) / (D.max - D.min), a = DIAL_A0 + DIAL_SWEEP * t;
  el.querySelector('.dial-track').setAttribute('d', arc(DIAL_A0, DIAL_A0 + DIAL_SWEEP));
  const fill = el.querySelector('.dial-fill'); fill.setAttribute('d', set && t > 0.001 ? arc(DIAL_A0, a) : '');
  const [kx, ky] = dialPt(a), knob = el.querySelector('.dial-knob'); knob.setAttribute('cx', kx.toFixed(2)); knob.setAttribute('cy', ky.toFixed(2));
  el.querySelector('.dial-num').textContent = set ? String(shown) + '°' : '–';
  el.querySelector('.dial-unit').textContent = set ? (k === 'setpoint_winter_c' ? 'HEAT TO' : 'COOL TO') : (v === null ? 'NOT SURE' : 'NOT SET');
  if(set){ el.setAttribute('aria-valuenow', String(shown)); el.setAttribute('aria-valuetext', `${shown} ${u==='us'?'degrees Fahrenheit':'degrees Celsius'}`); }
  else { el.removeAttribute('aria-valuenow'); el.setAttribute('aria-valuetext', v === null ? 'Not sure' : 'Not set'); }
  el.closest('.dial-card').classList.toggle('is-unset', !set);
}
function setDial(k, shown){
  const u = REG.units, D = DIAL[u];
  shown = Math.max(D.min, Math.min(D.max, Math.round(shown / D.step) * D.step));
  REG.home[k] = dialToC(shown, u); saveReg();
  const el = $('#dial-' + k); if(el) paintDial(el);
  const chip = $(`[data-act="reg-unsure"][data-k="${k}"]`); if(chip) chip.setAttribute('aria-pressed', 'false');
  const hint = el && el.closest('.dial-card').querySelector('.field-hint'); if(hint) hint.textContent = 'Drag the dial or use − and +';
}
function stepDial(k, d){
  const u = REG.units, D = DIAL[u], v = REG.home[k];
  if(typeof v !== 'number') return setDial(k, dialShown(DIAL_DEFAULT[k], u));   // the first tap sets the usual value
  setDial(k, dialShown(v, u) + d * D.step);
}
function dialFromPointer(el, e, start){
  const r = el.querySelector('svg').getBoundingClientRect(), sx = r.width / 150, sy = r.height / 140;
  const dx = (e.clientX - r.left) / sx - DCX, dy = (e.clientY - r.top) / sy - DCY;
  if(start){ const d = Math.hypot(dx, dy); if(d < DIAL_R - 22 || d > DIAL_R + 24) return false; }   // only a press on the ring itself
  let a = Math.atan2(dy, dx) * 180 / Math.PI; if(a < 0) a += 360;
  let rel = (a - DIAL_A0 + 360) % 360; if(rel > DIAL_SWEEP) rel = rel > DIAL_SWEEP + 45 ? 0 : DIAL_SWEEP;
  const D = DIAL[REG.units]; setDial(el.dataset.k, D.min + (D.max - D.min) * rel / DIAL_SWEEP);
  return true;
}
/* floor area: 500-4,000+ sq ft or 50-370+ m²; untouched means not answered */
const AREA = { us:{ min:500, max:4000, step:50, mid:1500 }, metric:{ min:50, max:370, step:5, mid:140 } };
function areaShown(){ const u = REG.units, A = AREA[u], m2 = REG.home.floor_area_m2; if(typeof m2 !== 'number') return null; const v = u === 'us' ? m2 / SQFT : m2; return Math.max(A.min, Math.min(A.max, Math.round(v / A.step) * A.step)); }
function areaText(v){ const u = REG.units, A = AREA[u]; if(v === null) return REG.home.floor_area_m2 === null ? 'Not sure' : 'Not set yet'; return (v >= A.max ? v.toLocaleString('en-US') + '+' : v.toLocaleString('en-US')) + `<small>${u === 'us' ? 'sq ft' : 'm²'}</small>`; }
function compass(){
  const v = REG.home.facing;
  return `<div class="compass" role="radiogroup" aria-label="Which way the main living-room windows face">${HCI.art('facing', 'compass-art')}` +
    FACING.map((f, i) => { const a = (i * 45 - 90) * Math.PI / 180, x = 50 + 39 * Math.cos(a), y = 50 + 39 * Math.sin(a);
      return `<button class="compass-pt" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%" role="radio" aria-checked="${v===f.id}" aria-label="${f.n}" data-act="reg-pick" data-k="home.facing" data-v="${f.id}">${f.id}</button>`; }).join('') + `</div>`;
}
function people(){
  const h = REG.home, fig = (art, n, cls) => Array.from({length: Math.min(n, 6)}, () => `<span class="pfig ${cls}">${HCI.art(art)}</span>`).join('') + (n > 6 ? `<span class="pfig-more">+${n-6}</span>` : '');
  return `<div class="household" aria-hidden="true">${fig('people:adult', h.adults||0, 'is-adult')}${fig('people:child', h.children||0, 'is-child')}${fig('people:pet', h.pets||0, 'is-pet')}</div>`;
}
const REGS = {
  units: () => {
    const u = REG.units;
    const t = (id, big, n, hint) => `<button class="ptile ptile-row" role="radio" aria-checked="${u===id}" data-act="reg-units" data-v="${id}"><span class="ptile-art unit-art" aria-hidden="true">${big}</span><span class="ptile-text"><span class="ptile-label">${n}</span><span class="ptile-hint">${hint}</span></span>${HCI.tick()}</button>`;
    return `<div class="ptile-grid cols-1" role="radiogroup" aria-label="Units">${t('us', '°F', 'US', '°F, sq ft, ft/in, lb')}${t('metric', '°C', 'Metric', '°C, m², cm, kg')}</div>
      <div class="note">${ic('info')}<div>You can change this later in Settings. Either way, we store your answers the same way.</div></div>`;
  },
  you: () => {
    const r = REG, y = new Date().getFullYear(), us = r.units === 'us';
    const inp = (id, key, lab, attrs, opt) => `<div class="field" id="f-${id}"><label class="label" for="${id}">${lab}${opt ? ' <span class="opt">(optional)</span>' : ''}</label><input class="input" id="${id}" data-reg="${key}" value="${esc(r[key])}" ${attrs} aria-describedby="err-${id}"><p class="field-error" id="err-${id}" hidden></p></div>`;
    const sfx = (id, key, lab, sufx, attrs) => `<div class="input-group"><input class="input" id="${id}" data-reg="${key}" value="${esc(r[key])}" ${attrs} aria-label="${lab}"><span class="input-suffix" aria-hidden="true">${sufx}</span></div>`;
    const height = us ? `<div class="field" id="f-r_ft"><span class="label" id="lab-height">Height <span class="opt">(optional)</span></span><div class="grid grid-2 g-tight" role="group" aria-labelledby="lab-height">${sfx('r_ft', 'ft', 'Height, feet', 'ft', 'inputmode="numeric" maxlength="1" placeholder="5"')}${sfx('r_in', 'inch', 'Height, inches', 'in', 'inputmode="numeric" maxlength="2" placeholder="8"')}</div><p class="field-error" id="err-r_ft" hidden></p></div>`
      : `<div class="field" id="f-r_cm"><label class="label" for="r_cm">Height <span class="opt">(optional)</span></label>${sfx('r_cm', 'cm', 'Height in centimeters', 'cm', 'inputmode="numeric" maxlength="3" placeholder="172"')}<p class="field-error" id="err-r_cm" hidden></p></div>`;
    const weight = us ? `<div class="field" id="f-r_lb"><label class="label" for="r_lb">Weight <span class="opt">(optional)</span></label>${sfx('r_lb', 'lb', 'Weight in pounds', 'lb', 'inputmode="decimal" maxlength="5" placeholder="160"')}<p class="field-error" id="err-r_lb" hidden></p></div>`
      : `<div class="field" id="f-r_kg"><label class="label" for="r_kg">Weight <span class="opt">(optional)</span></label>${sfx('r_kg', 'kg', 'Weight in kilograms', 'kg', 'inputmode="decimal" maxlength="5" placeholder="72"')}<p class="field-error" id="err-r_kg" hidden></p></div>`;
    return `<div class="stack stack-5 form" id="regForm">
      ${inp('r_name', 'name', 'Full name', 'autocomplete="name" autocapitalize="words" required')}
      ${inp('r_email', 'email', 'Email', 'type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" required')}
      <div class="grid grid-2 g-tight">
        <div class="field" id="f-r_gender"><label class="label" for="r_gender">Gender <span class="opt">(optional)</span></label><select class="select" id="r_gender" data-reg="gender"><option value="">Choose</option>${GENDERS.map(g => `<option value="${g.id}"${r.gender===g.id?' selected':''}>${g.n}</option>`).join('')}</select></div>
        ${inp('r_year', 'birth_year', 'Year of birth', `inputmode="numeric" maxlength="4" placeholder="e.g. 1985" autocomplete="bday-year"`, true)}
      </div>
      <div class="grid grid-2 g-tight">${height}${weight}</div>
      ${fieldBlock('sens', 'In general, I&hellip;', '', `<div class="ptile-grid cols-3" role="radiogroup" aria-labelledby="lab-sens">${SENSITIVITY.map(o => regTile('sens', o, r.sens===o.id, ic(o.ic,'ic-lg'), 'ptile-sm')).join('')}</div>`, true)}
      <p class="caption">Used only to understand comfort differences between people. Your check-ins are stored under a participant code, not your name. The research team sees your name and email next to that code, to run the study and contact you.</p>
    </div>`;
  },
  where: () => {
    const h = REG.home;
    return `<div class="stack stack-6">
      <div class="field" id="f-r_zip"><label class="label" for="r_zip">ZIP code <span class="opt">(optional)</span></label><input class="input zip-in" id="r_zip" data-reg="home.zip" value="${esc(h.zip||'')}" inputmode="numeric" autocomplete="postal-code" maxlength="5" placeholder="13210" aria-describedby="hint-zip err-r_zip"><p class="field-hint" id="hint-zip">${ic('cloud','ic-xs')} Why we ask: to match your check-ins to the local weather.</p><p class="field-error" id="err-r_zip" hidden></p></div>
      ${fieldBlock('tenure', 'Do you own or rent your home?', '', `<div class="ptile-grid cols-3" role="radiogroup" aria-labelledby="lab-tenure">${TENURE.map(o => regTile('home.tenure', o, h.tenure===o.id, HCI.art('tenure:'+o.id), 'ptile-sm')).join('')}</div>`, true)}</div>`;
  },
  type: () => `<div class="field" id="f-home_type"><div class="ptile-grid home-types" role="radiogroup" aria-label="Home type">${HOME_TYPES.map(o => regTile('home.home_type', o, REG.home.home_type===o.id, HCI.art('home_type:'+o.id), o.id==='other' ? 'span-2 ptile-row' : '')).join('')}</div>${groupErr('home_type')}</div>`,
  size: () => {
    const h = REG.home, u = REG.units, A = AREA[u], v = areaShown();
    const apt = isApt();
    return `<div class="stack stack-6">
      ${fieldBlock('area', 'Floor area', 'A good guess is fine. Count every heated floor.', `<div class="card card-flat area-card">${HCI.art('floor_area','area-art')}<div class="area-main"><div class="range-value" id="reg-area-val">${areaText(v)}</div>
        <input type="range" class="range" id="reg-area" min="${A.min}" max="${A.max}" step="${A.step}" value="${v ?? A.mid}" aria-label="Floor area in ${u==='us'?'square feet':'square meters'}" aria-valuetext="${v === null ? 'Not set' : v + (u==='us' ? ' square feet' : ' square meters')}">
        <div class="range-labels"><span>${A.min.toLocaleString('en-US')}</span><span>${A.max.toLocaleString('en-US')}+</span></div></div>
        <button class="chip chip-sm" aria-pressed="${h.floor_area_m2 === null}" data-act="reg-unsure" data-k="floor_area_m2"><span class="chip-check">${ic('check')}</span>Not sure</button></div>`)}
      ${fieldBlock('year', 'When was it built?', '', `<div class="ptile-grid cols-3" role="radiogroup" aria-labelledby="lab-year">${YEAR_BUILT.map(o => regTile('home.year_built', o, h.year_built===o.id, HCI.art('year_built:'+o.id), 'ptile-sm')).join('')}</div>`)}
      ${fieldBlock('floors', 'How many floors does your home have?', apt ? 'Inside your apartment, not the whole building.' : 'Count the basement only if it is lived in.', `<div class="ptile-grid cols-4" role="radiogroup" aria-labelledby="lab-floors">${FLOORS.map(o => regTile('home.floors', o, h.floors===o.id, HCI.art('floors:'+o.id), 'ptile-sm')).join('')}</div>`)}
      ${apt ? fieldBlock('unit_floor', 'Which floor is your home on?', 'US numbering: 1 is the ground floor, 0 a basement.', `<div class="stepper-row">${HCI.art('unit_floor','row-art')}${stepper('home.unit_floor', h.unit_floor, 0, 60, 'Floor', typeof h.unit_floor !== 'number' ? '' : h.unit_floor === 0 ? 'basement' : h.unit_floor === 1 ? 'ground floor' : 'floor')}</div>`) : ''}
    </div>`;
  },
  rooms: () => {
    const h = REG.home;
    const row = (k, art, lab, hint) => `<div class="stepper-row"><span class="sr-art">${HCI.art(art)}</span><span class="sr-text"><span class="sr-lab">${lab}</span>${hint ? `<span class="field-hint">${hint}</span>` : ''}</span>${stepper('home.'+k, h[k], STEP_LIMITS[k][0], STEP_LIMITS[k][1], lab, '', k === 'bedrooms')}</div>`;
    return `<div class="stack stack-6">
      ${fieldBlock('rooms', 'Rooms', '', `<div class="card card-flat rows-card">${row('bedrooms', 'bedrooms', 'Bedrooms', '')}${row('rooms', 'rooms', 'Rooms in total', 'Not counting bathrooms or hallways')}</div>`)}
      ${fieldBlock('people', 'Who lives here?', 'Including you.', `<div class="card card-flat rows-card">${people()}${row('adults', 'people:adult', 'Adults', '')}${row('children', 'people:child', 'Children', 'Under 18')}${row('pets', 'people:pet', 'Pets', 'Cats, dogs and other furry friends')}</div>`)}
    </div>`;
  },
  heat: () => {
    const h = REG.home, hs = h.heating || [], cs = h.cooling || [];
    const cnt = n => n ? `${n} chosen` : 'Select all that apply';
    return `<div class="stack stack-6">
      <div class="field reg-q" id="f-heating" role="group" aria-labelledby="lab-heating"><div class="reg-group-head"><span class="icon-tile it-peach">${ic('flame')}</span><h2 class="reg-q-title" id="lab-heating">Heating</h2><span class="caption">${cnt(hs.length)}</span></div>
        <div class="ptile-grid cols-3 is-multi">${HEATING.map(o => regMulti('home.heating', o, hs.includes(o.id), HCI.art('heating:'+o.id))).join('')}</div></div>
      <div class="field reg-q" id="f-cooling" role="group" aria-labelledby="lab-cooling"><div class="reg-group-head"><span class="icon-tile it-sky">${ic('snow')}</span><h2 class="reg-q-title" id="lab-cooling">Cooling</h2><span class="caption">${cnt(cs.length)}</span></div>
        <div class="ptile-grid cols-3 is-multi">${COOLING.map(o => regMulti('home.cooling', o, cs.includes(o.id), HCI.art('cooling:'+o.id))).join('')}</div></div>
      ${fieldBlock('thermostat', 'What kind of thermostat?', '', `<div class="ptile-grid cols-3" role="radiogroup" aria-labelledby="lab-thermostat">${THERMOSTAT.map(o => regTile('home.thermostat', o, h.thermostat===o.id, HCI.art('thermostat:'+o.id), 'ptile-sm')).join('')}</div>`)}
      ${fieldBlock('setpoints', 'Usual thermostat settings', 'When someone is home. Skip either one if it doesn&rsquo;t apply.', `<div class="stack stack-3">${dialHtml('setpoint_winter_c', 'Winter setting')}${dialHtml('setpoint_summer_c', 'Summer setting')}</div>`)}
    </div>`;
  },
  windows: () => {
    const h = REG.home;
    return `<div class="stack stack-6">
      ${fieldBlock('windows', 'What kind of windows?', 'Look at the edge of the glass: two or three panes with a gap between them.', `<div class="ptile-grid cols-4" role="radiogroup" aria-labelledby="lab-windows">${WINDOWS.map(o => regTile('home.windows', o, h.windows===o.id, HCI.art('windows:'+o.id), 'ptile-sm')).join('')}</div>`)}
      ${fieldBlock('windows_open', 'Can the windows be opened?', '', `<div class="ptile-grid cols-3" role="radiogroup" aria-labelledby="lab-windows_open">${WINDOWS_OPEN.map(o => regTile('home.windows_open', o, h.windows_open===o.id, HCI.art('windows_open:'+o.id), 'ptile-sm')).join('')}</div>`)}
      ${fieldBlock('facing', 'Which way do the main living-room windows face?', 'Tap a direction on the compass.', `${compass()}<div class="center"><button class="chip" aria-pressed="${h.facing==='unsure'}" data-act="reg-pick" data-k="home.facing" data-v="unsure"><span class="chip-ic">${ic('help')}</span><span class="chip-check">${ic('check')}</span>Not sure</button></div>`)}
      ${fieldBlock('draftiness', 'How drafty is it in winter?', '', `<div class="ptile-grid cols-5" role="radiogroup" aria-labelledby="lab-draftiness">${DRAFTS.map(o => `<button class="ptile ptile-sm" role="radio" aria-checked="${h.draftiness===o.id}" aria-label="${o.id}, ${o.n.toLowerCase()}" data-act="reg-pick" data-k="home.draftiness" data-v="${o.id}"><span class="ptile-art">${HCI.art('draftiness:'+o.id)}</span><span class="ptile-label">${o.id}</span>${HCI.tick()}</button>`).join('')}</div><div class="scale-ends" aria-hidden="true"><span>Never drafty</span><span>Very drafty</span></div>`)}
    </div>`;
  },
  review: () => {
    const r = REG, f = regFields(), u = r.units;
    const ht = f.height_cm == null ? null : u === 'us' ? (() => { const t = Math.round(f.height_cm / 2.54); return `${Math.floor(t/12)} ft ${t%12} in`; })() : Math.round(f.height_cm) + ' cm';
    const wt = f.weight_kg == null ? null : u === 'us' ? Math.round(f.weight_kg / 0.45359237) + ' lb' : f.weight_kg + ' kg';
    const you = [['user','Name', f.name || null], ['mail','Email', f.email || null], ['users','Gender', label(GENDERS, f.gender) || null], ['calendar','Year of birth', f.birth_year ? String(f.birth_year) : null],
      ['ruler','Height', ht], ['ruler','Weight', wt], ['thermometer','In general', label(SENSITIVITY, f.sensitivity) || null], ['sliders','Units', u === 'us' ? 'US (°F, sq ft)' : 'Metric (°C, m²)']];
    return `<div class="stack stack-4">
      <section class="card glance-card"><div class="card-head"><h2 class="card-title">About you</h2><button class="btn btn-quiet btn-sm" data-act="reg-edit" data-step="1" aria-label="Edit about you">${ic('edit')}Edit</button></div>
        <div class="glance">${you.map(([i, k, v]) => glanceItem(ic(i), k, v, k === 'Name' || k === 'Email')).join('')}</div></section>
      ${homeGlance(r.home, u, true)}
      <div class="note">${ic('shield')}<div>Joining means you agree to take part as described on the <a href="../">study page</a>. <span class="placeholder">[PLACEHOLDER: IRB protocol number and consent wording]</span></div></div>
    </div>`;
  }
};
const REG_TITLES = {
  units: ['How should we show measurements?', ''],
  you: ['Tell us about you', 'Name and email are needed; the rest is optional but helps.'],
  where: ['Where is your home?', ''],
  type: ['What type of home do you live in?', 'Pick the closest match.'],
  size: ['How big and how old is it?', ''],
  rooms: ['Rooms and people', ''],
  heat: ['How do you heat and cool?', 'Select everything you use.'],
  windows: ['Windows and drafts', ''],
  review: ['Your home, at a glance', 'Check everything, then join. Tap Edit to change a section.']
};
function regScreen(){
  const st = REG_STEPS[REG.step], [title, sub] = REG_TITLES[st.id], last = REG.step === REG_STEPS.length - 1;
  const track = `<ol class="progress-steps is-compact reg-track" aria-label="Sign-up progress">` + REG_STEPS.map((x, i) =>
    `<li class="ps-step${i < REG.step ? ' is-done' : ''}${i === REG.step ? ' is-current' : ''}"${i === REG.step ? ' aria-current="step"' : ''}><span class="ps-dot">${ic(i < REG.step ? 'check' : x.ic)}<span class="sr-only">${x.t}${i < REG.step ? ', done' : i === REG.step ? ', current step' : ''}</span></span></li>`).join('') + `</ol>`;
  return track + `<div class="screen-head reg-head"><span class="eyebrow">Step ${REG.step+1} of ${REG_STEPS.length} &middot; ${st.t}</span><h1 class="screen-title" tabindex="-1">${title}</h1>${sub ? `<p class="screen-sub">${sub}</p>` : ''}</div>` +
    `<div class="reg-body">${REGS[st.id]()}</div>` +
    `<div class="footbar reg-foot"><div class="field" id="f-join"><p class="field-error" id="err-join" role="alert" hidden></p></div><button class="btn btn-primary btn-block btn-lg" data-act="reg-next">${last ? 'Join the study' : REG.edit ? 'Save and go back' : 'Continue'} ${ic(last ? 'check' : 'arrow-right')}</button><p class="caption center">${minutesLeft()}</p></div>`;
}
function regSet(k, v){ if(k.startsWith('home.')) REG.home[k.slice(5)] = v; else REG[k] = v; }
function regGet(k){ return k.startsWith('home.') ? REG.home[k.slice(5)] : REG[k]; }

/* ---------- the detail sheet, the confirm sheet ---------- */
let sheetOpener = null;
function openSheet(html, focusSel, opener){
  const d = $('#sheet');
  sheetOpener = opener || document.activeElement;
  d.innerHTML = html;
  if(typeof d.showModal === 'function'){ if(!d.open) d.showModal(); } else d.setAttribute('open', '');
  document.body.classList.add('is-locked');
  const f = d.querySelector(focusSel || '[data-act="sheet-close"]'); if(f) f.focus({ preventScroll:true });
  syncHistory();                                            // an entry, so Back closes the sheet (opened from a tap)
}
function closeSheet(){
  const d = $('#sheet'); if(!d || !d.open) return;
  if(typeof d.close === 'function') d.close(); else d.removeAttribute('open');
}
function sheetClosed(){
  document.body.classList.remove('is-locked');
  const o = sheetOpener; sheetOpener = null;
  if(o && document.contains(o)) o.focus({ preventScroll:true });
  syncHistory();                                            // closed by its button, the backdrop, Esc or Android's Back: its entry goes
}
function showDetail(id, opener){
  const v = store.votes.find(x => x.id === id); if(!v) return;
  const d = new Date(v.ts);
  const meta = [
    `<span class="pill">${ic(v.type==='scheduled' ? 'bell' : 'user')}${v.type==='scheduled' ? 'From a reminder' : 'You started it'}</span>`,
    `<span class="pill">${ic(v.home==='recent' ? 'door' : 'home')}${v.home==='recent' ? 'Just got in' : 'Home over an hour'}</span>`,
    v.secs ? `<span class="pill">${ic('clock')}Took ${secsWord(v.secs)}</span>` : '',
    v.same ? `<span class="pill">${ic('refresh')}Same as the time before</span>` : '',
    v.example ? `<span class="pill pill-violet">${ic('info')}Example data</span>` : ''
  ].filter(Boolean).join('');
  openSheet(`<div class="sheet-grab" aria-hidden="true"></div><div class="sheet-head"><div><span class="eyebrow">Check-in</span><h2 class="sheet-title" id="sheetTitle">${dateWord(d)}</h2></div><button class="btn btn-icon" data-act="sheet-close" aria-label="Close">${ic('x')}</button></div>
    <div class="sheet-body"><div class="detail"><span class="fig" aria-hidden="true">${avatar(v.garments||[])}</span><ul class="answers" role="list">${detailRows(v)}</ul></div><div class="cluster detail-meta">${meta}</div></div>`, null, opener);
}
function confirmSignOut(opener){
  openSheet(`<div class="sheet-grab" aria-hidden="true"></div><div class="sheet-head"><div><h2 class="sheet-title" id="sheetTitle">Sign out on this phone?</h2><p class="sheet-sub">Reminders stop on this phone. Your check-ins so far stay saved. To come back, choose &ldquo;I have registered before&rdquo; and enter your email.</p></div></div>
    <div class="sheet-foot"><button class="btn btn-ghost" data-act="sheet-close">Cancel</button><button class="btn btn-danger" data-act="signout-yes">Sign out</button></div>`, '[data-act="sheet-close"]', opener);
}

/* ---------- toast (with Undo) ---------- */
let TOAST = null;
function showToast(o){
  closeToast();
  const el = $('#toast');
  el.className = 'toast' + (o.kind === 'info' ? ' toast-info' : o.kind === 'error' ? ' toast-error' : '');
  el.classList.add('is-open');                              // open first, so screen readers announce the text
  el.innerHTML = `<span class="toast-ic">${ic(o.kind === 'error' ? 'alert' : o.kind === 'info' ? 'info' : 'check')}</span><span class="toast-text"><span class="toast-title">${o.title}</span>${o.sub ? `<span class="toast-sub">${o.sub}</span>` : ''}</span>${o.action ? `<button class="toast-action" data-act="toast-action">${ic('undo','ic-sm')} ${o.action}</button>` : ''}`;
  document.body.classList.add('toast-open');
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
  el.classList.remove('is-open'); document.body.classList.remove('toast-open');
  if(t.o.onClose) t.o.onClose();
}

/* ---------- events ---------- */
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if(!b || b.disabled || b.getAttribute('aria-disabled') === 'true') return;
  if(S.lock && b.dataset.act !== 'toast-action') return;
  const d = b.dataset;
  switch(d.act){
    case 'go': if(d.to === 'join'){ REG = loadReg(); } go(d.to); break;
    case 'tab': if(S.screen === d.to){ window.scrollTo({ top:0, behavior: reduceMotion() ? 'auto' : 'smooth' }); break; } go(d.to); break;
    case 'back': back(); break;
    case 'close': go('today'); break;
    case 'start': startSession('self'); break;
    case 'home': onHome(d.v); break;
    case 'pause': setPause(d.v); break;
    case 'nothome': go('away'); break;
    case 'same': S.same = !quickEdited(); submit(); break;                       // the quick check: saved as shown, nothing more to ask
    case 'fill': S.flow = FLOW_ALL.filter(q => !answered(S.a, q)); S.same = false; S.i = 0; go('q'); break;
    case 'changed': beginQuestions(); break;
    case 'pick': pick(d.q, d.v); break;
    case 'toggle': toggle(d.q, d.v); break;
    case 'none': S.a[d.q] = []; rerender(); break;
    case 'lastclo': S.a.clo = [...((lastVote() || {}).garments || [])].filter(id => byId(GARMENTS, id)); rerender(); break;
    case 'next': next(); break;
    case 'edit': {
      if(S.screen==='same') S.flow = [...FLOW_ALL];
      const i = S.flow.indexOf(d.q);
      if(i>=0){ const v = S.a[d.q]; S.editPrev = { q:d.q, v: Array.isArray(v) ? [...v] : v }; S.i=i; S.edit=true; S.editFrom=S.screen; S.hist.push(S.screen); S.screen='q'; render(); }
      break; }
    case 'submit': submit(); break;
    case 'show': showDetail(d.id, b); break;
    case 'more': S.histN += 40; rerender(); break;
    case 'sheet-close': closeSheet(); break;
    case 'toast-action': { const t = TOAST; if(t && t.o.onAction) t.o.onAction(); break; }
    case 'go-reminders': go('settings'); { const r = $('#reminders'); if(r){ r.scrollIntoView({ block:'start' }); r.focus({ preventScroll:true }); } } break;
    case 'units': LS.set(UNITS_KEY, d.v === 'metric' ? 'metric' : 'us'); rerender(); break;
    case 'add-win': { remDraft = readHours(); remDraft[d.w+'2_start'] = '07:00'; remDraft[d.w+'2_end'] = '09:00'; rerender(); $('#'+(d.w==='weekday'?'h_ws2':'h_es2'))?.focus({ preventScroll:true }); break; }
    case 'rm-win': { remDraft = readHours(); remDraft[d.w+'2_start'] = null; remDraft[d.w+'2_end'] = null; rerender(); $(`[data-act="add-win"][data-w="${d.w}"]`)?.focus({ preventScroll:true }); break; }
    case 'install-skip': {                                    // "Continue in Safari anyway": where the link was going
      SS.set(INSTALL_SKIP_KEY, '1');
      const to = START === 'join' || START === 'signin' ? START : 'welcome';
      if(to === 'join') REG = loadReg();
      go(to); if(to !== 'welcome') S.hist = ['welcome'];
      break; }
    case 'signin': signin(); break;
    case 'recheck': recheck(false); break;
    case 'forget': forgetIdentity(''); break;
    case 'signout': confirmSignOut(b); break;
    case 'signout-yes': { b.disabled = true; b.classList.add('is-busy'); if(PUSH.status() === 'on') await PUSH.disable(); closeSheet(); forgetIdentity('You’re signed out on this phone.'); break; }
    case 'push-on': {
      const h = readHours(), why = hoursProblem(h);
      if(why){ remMsg(why, 'warn'); break; }
      LS.set(HOURS_KEY, JSON.stringify(h)); remDraft = null; b.disabled = true; b.classList.add('is-busy');
      try{ const r = await PUSH.enable(); rerender(); if(r === 'on') remMsg('Reminders are on. You&rsquo;ll get one an hour while you&rsquo;re home.', 'ok'); }
      catch(err){ b.disabled = false; b.classList.remove('is-busy'); remMsg(err.message || 'Something went wrong, please try again.', 'warn'); }
      break; }
    case 'save-hours': {
      const h = readHours(), why = hoursProblem(h);
      if(why){ remMsg(why, 'warn'); break; }
      LS.set(HOURS_KEY, JSON.stringify(h)); remDraft = null;
      if(PUSH.status() === 'unconfigured'){ remMsg('Saved on this phone.', 'ok'); break; }
      b.disabled = true; b.classList.add('is-busy');
      const st = await PUSH.sync(h).catch(() => null);
      b.disabled = false; b.classList.remove('is-busy');
      if(PUSH.status() !== 'on'){ rerender(); remMsg('Saved on this phone, but reminders have stopped here. Turn them on again below.', 'warn'); break; }
      remMsg(st && st.found ? 'Saved.' : 'Saved on this phone. The reminder service could not be reached right now; it gets the new hours next time you open the app.', st && st.found ? 'ok' : 'warn');
      break; }
    case 'push-off': b.disabled = true; await PUSH.disable(); rerender(); remMsg('Reminders are off on this phone.', 'ok'); break;
    /* the sign-up wizard */
    case 'reg-next': regNext(); break;
    case 'reg-later': saveReg(); welcomeNote = 'Your answers so far are saved on this phone. Tap “I’m new here” to carry on.'; go('welcome'); break;
    case 'reg-edit': REG.edit = true; regGo(Number(d.step)); break;
    case 'reg-units': convertUnits(d.v); saveReg(); rerender(); break;
    case 'reg-pick': {
      let v = d.v; if(['home.floors','home.draftiness'].includes(d.k)) v = Number(v);
      regSet(d.k, v);
      if(d.k === 'home.home_type' && !isApt()) delete REG.home.unit_floor;
      saveReg(); rerender(); if(d.k === 'home.home_type' || d.k === 'home.facing') fieldError(d.k.slice(5), '');
      break; }
    case 'reg-toggle': {
      const key = d.k.slice(5), arr = Array.isArray(REG.home[key]) ? [...REG.home[key]] : [];
      const i = arr.indexOf(d.v);
      if(i >= 0) arr.splice(i, 1); else if(d.v === 'none') arr.splice(0, arr.length, 'none'); else { const n = arr.indexOf('none'); if(n >= 0) arr.splice(n, 1); arr.push(d.v); }
      REG.home[key] = arr; saveReg(); rerender(); break; }
    case 'reg-step': {
      const key = d.k.slice(5), [mn, mx] = STEP_LIMITS[key], cur = REG.home[key];
      REG.home[key] = Math.max(mn, Math.min(mx, typeof cur === 'number' ? cur + Number(d.d) : firstStep(key, Number(d.d))));
      saveReg(); rerender(); break; }
    case 'reg-dial': stepDial(d.k, Number(d.d)); break;
    case 'reg-unsure': {
      const k = d.k; REG.home[k] = REG.home[k] === null ? undefined : null; if(REG.home[k] === undefined) delete REG.home[k];
      saveReg(); rerender(); break; }
  }
});
document.addEventListener('input', e => {
  const t = e.target;
  if(t.dataset && t.dataset.reg){ regSet(t.dataset.reg, t.value); saveReg(); const id = t.id; if($('#f-' + id) && $('#f-' + id).classList.contains('is-invalid')) fieldError(id, ''); if(id === 'r_in' && $('#f-r_ft').classList.contains('is-invalid')) fieldError('r_ft', ''); return; }
  if(t.id === 'reg-area'){
    const u = REG.units, v = Number(t.value);
    REG.home.floor_area_m2 = u === 'us' ? Math.round(v * SQFT * 10) / 10 : v; saveReg();
    $('#reg-area-val').innerHTML = areaText(areaShown());
    t.setAttribute('aria-valuetext', v + (u === 'us' ? ' square feet' : ' square meters'));
    const chip = $('[data-act="reg-unsure"][data-k="floor_area_m2"]'); if(chip) chip.setAttribute('aria-pressed', 'false');
    return;
  }
  if(t.classList && t.classList.contains('time-in')){ remDraft = readHours(); ['weekday','weekend'].forEach(p => { const s = $('#strip-' + p); if(s) s.innerHTML = strip(remDraft, p); }); const m = $('#remMsg'); if(m) m.hidden = true; }
});
document.addEventListener('change', e => { const t = e.target; if(t.tagName === 'SELECT' && t.dataset.reg){ regSet(t.dataset.reg, t.value); saveReg(); } });
document.addEventListener('keydown', e => {
  const t = e.target;
  /* arrow keys move between the options of a radio group (choosing still takes Enter or Space) */
  if(['ArrowDown','ArrowUp','ArrowLeft','ArrowRight'].includes(e.key) && t.getAttribute && t.getAttribute('role') === 'radio'){
    const g = t.closest('[role="radiogroup"]'); if(!g) return;
    const items = Array.from(g.querySelectorAll('[role="radio"]')), i = items.indexOf(t), dir = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 1 : -1;
    const n = items[(i + dir + items.length) % items.length]; if(n){ e.preventDefault(); n.focus(); }
    return;
  }
  if(t.classList && t.classList.contains('dial')){
    const k = t.dataset.k, D = DIAL[REG.units], v = REG.home[k], cur = typeof v === 'number' ? dialShown(v, REG.units) : null;
    const map = { ArrowUp:1, ArrowRight:1, ArrowDown:-1, ArrowLeft:-1, PageUp:5, PageDown:-5 };
    if(e.key in map){ e.preventDefault(); if(cur === null) stepDial(k, 1); else setDial(k, cur + map[e.key] * D.step); }
    else if(e.key === 'Home'){ e.preventDefault(); setDial(k, D.min); } else if(e.key === 'End'){ e.preventDefault(); setDial(k, D.max); }
    return;
  }
  if(e.key !== 'Enter') return;
  if(t.id === 's_email'){ e.preventDefault(); signin(); return; }
  if(t.tagName === 'INPUT' && t.closest('#screen') && S.screen === 'join' && t.type !== 'range'){ e.preventDefault(); regNext(); }
});
document.addEventListener('submit', e => e.preventDefault());   // the forms never submit natively
/* dragging a thermostat dial */
document.addEventListener('pointerdown', e => {
  const el = e.target.closest && e.target.closest('.dial'); if(!el) return;
  el.focus({ preventScroll:true });
  if(!dialFromPointer(el, e, true)) return;
  e.preventDefault();
  try{ el.setPointerCapture(e.pointerId); }catch(err){}
  const move = ev => dialFromPointer(el, ev), up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
  el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
});
/* The skip link moves focus without adding a "#main" history entry (popstate would step back a question). */
const skipEl = $('.skip-link');
if(skipEl) skipEl.addEventListener('click', e => { e.preventDefault(); const m = $('#main'); if(m) m.focus(); });
const toastEl = $('#toast');
toastEl.addEventListener('pointerenter', pauseToast); toastEl.addEventListener('pointerleave', resumeToast);
toastEl.addEventListener('focusin', pauseToast); toastEl.addEventListener('focusout', resumeToast);
const sheetEl = $('#sheet');
sheetEl.addEventListener('close', sheetClosed);
sheetEl.addEventListener('click', e => { if(e.target !== sheetEl) return; const r = sheetEl.getBoundingClientRect(); if(e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeSheet(); });
setInterval(() => {
  if(document.hidden) return;
  if(S.screen==='pending') recheck(true);
  if(S.screen==='away' && !S.lock) rerender();              // keeps the end times of the pauses current
  $$('[data-ago]').forEach(el => { el.textContent = agoWord(el.dataset.ago); });
}, 60000);
document.addEventListener('visibilitychange', () => {
  if(document.hidden){ endHolds(); return; }                // locked or switched away: a held check-in goes out now
  if(S.screen==='pending') recheck(true);
  else { if(S.screen==='away' && !S.lock) rerender(); quiet(syncReminders()); quiet(flushPending()); }   // the pause end times are current again; anything waiting goes out
  $$('[data-ago]').forEach(el => { el.textContent = agoWord(el.dataset.ago); });
});

/* ---------- celebration ---------- */
function confetti(){
  if(reduceMotion()) return;
  const c = $('#confetti'); c.hidden = false;
  c.width = innerWidth; c.height = innerHeight;
  const ctx = c.getContext('2d');
  const cols = ['#6246EA','#A994FF','#3AA6F2','#A9DCFF','#FF9E7A','#FFD3C1','#BDEBD6'];
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
const COLS = ['participant','ts','local_time','prompt','at_home','tsv','clo','garments','met','activity','room','air','sun','actions','notes','same_as_last','seconds','app_version'];
const cell = x => x===undefined||x===null ? '' : Array.isArray(x) ? x.join('|') : String(x);
const debugRows = () => store.votes.slice().sort((a,b)=>a.ts<b.ts?1:-1).map(v => Object.assign(HC.toRecord(v, v.p || PARTICIPANT), { _ex: !!v.example }));
function renderTable(){
  if(!DEBUG) return;
  const rows = debugRows(), q = HC.pending();
  $('#dbgInfo').textContent = `${rows.length} check-in${rows.length===1?'':'s'} stored on this phone, ${q.length} in the send queue (${HC.live ? 'live' : 'local mode'}).`;
  $('#dbgTable').innerHTML = rows.length ? `<table class="data-table"><thead><tr>${COLS.map(c=>`<th>${c}</th>`).join('')}<th>flag</th></tr></thead><tbody>${rows.map(r=>`<tr>${COLS.map(c=>`<td>${esc(cell(r[c]))}</td>`).join('')}<td>${r._ex?'example':''}</td></tr>`).join('')}</tbody></table>` : '<p class="body-sm muted">No check-ins stored yet.</p>';
}
function toCsv(){
  const q = s => /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
  return [COLS.concat('flag').join(','), ...debugRows().map(r => COLS.map(c => q(cell(r[c]))).concat(r._ex ? 'example' : '').join(','))].join('\n');
}
if(DEBUG){
  const p = $('#debug'); p.hidden = false;
  p.innerHTML = `<div class="card stack stack-4"><div><h2 class="card-title">What gets stored</h2><p class="card-sub">Testing panel, shown only with <code>?debug=1</code>. Every saved check-in becomes one row. Rows marked example are seeded test data and are never sent.</p></div>
    <p class="body-sm" id="dbgInfo"></p>
    <div class="cluster"><button class="btn btn-secondary btn-sm" id="dbgCsv">${ic('copy')} Copy as CSV</button><button class="btn btn-secondary btn-sm" id="dbgSeed">${ic('refresh')} Reset to example data</button><button class="btn btn-ghost btn-sm" id="dbgClear">${ic('trash')} Clear check-ins</button><button class="btn btn-ghost btn-sm" id="dbgForget">${ic('signout')} Forget who I am</button></div>
    <div class="table-scroll" id="dbgTable"></div></div>`;
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
  if(S.screen === 'join' || S.screen === 'signin') S.hist = ['welcome'];
  render();
} else {
  // Show something straight away; an unconfirmed code is checked in the background (see checkApproval).
  if(FROM_PUSH){ history.replaceState(null, '', location.pathname); S.screen = 'today'; startSession('scheduled'); }
  else { const tab = location.hash.slice(1); S.screen = TABS.includes(tab) ? tab : 'today'; render(); }
  if(needsApprovalCheck()) checkApproval();
  quiet(syncReminders());
}
if(DEBUG) renderTable();
