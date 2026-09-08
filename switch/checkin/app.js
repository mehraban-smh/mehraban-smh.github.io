/* SWITCH comfort check-in - state, screens, sync, reminders, registration and approval. Loaded last. */
const URLQ = new URL(location.href).searchParams;
const DEBUG = URLQ.get('debug') === '1';
const FROM_PUSH = URLQ.get('from') === 'push';
const VIA_URL = !!(URLQ.get('p') || '').trim();          // ?p=P99: a test link, never gated on approval
const KEY = 'switch_comfort_proto_v1';
const APPROVED_KEY = 'switch_approved';
const INTERVAL = SWITCH.cfg.reminderIntervalMin || 60;     // minutes between reminders, same as the sender
const GAP_MIN = 30;                                        // the sender skips a phone that checked in less than this long ago
const NOT_FOUND_MSG = 'This registration was not found. Please register again or contact the research team.';
const pad = n => String(n).padStart(2,'0');
const fmt = d => pad(d.getHours())+':'+pad(d.getMinutes());
const dayKey = d => d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const LS = { get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }, set(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }, del(k){ try{ localStorage.removeItem(k); }catch(e){} } };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- who is using this phone ---------- */
let PARTICIPANT = SWITCH.participant() || '';
let NAME = LS.get('switch_name') || '';
let welcomeNote = '';                                      // one-line notice on the welcome screen (see forgetIdentity)
const firstName = () => (NAME || '').trim().split(/\s+/)[0] || '';
function greeting(){
  const h = new Date().getHours();
  const g = h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return g + (firstName() ? ', ' + esc(firstName()) : '');
}

/* ---------- check-ins kept on this phone ---------- */
let store = {votes:[], paused:null, pausedWhy:''};
function load(){ try{ const s=JSON.parse(LS.get(KEY)||'null'); if(s&&Array.isArray(s.votes)) store=s; }catch(e){} }
function save(){ LS.set(KEY, JSON.stringify(store)); }
function seed(){
  const now = Date.now(), m = 60000;
  const mk = (ago, o) => Object.assign({ id:'ex'+ago, ts:new Date(now-ago*m).toISOString(), type:'scheduled', home:'long', example:true, same:false }, o);
  store = { votes:[
    mk(26*60, {tsv:-1,tp:'warmer',garments:['long','trousers','socks','slippers'],clo:0.55,act:'desk',met:1.1,room:'office',ta:'unacceptable',tc:'slightly_uncomfortable',tcs:3,actions:['heat_up'],secs:31}),
    mk(25*60+20, {tsv:0,tp:'same',garments:['long','trousers','socks','slippers'],clo:0.55,act:'desk',met:1.1,room:'office',air:'still',air_pref:'same',hum:'ok',sun:'no',notes:[],secs:19,same:true}),
    mk(100, {tsv:1,tp:'cooler',garments:['tshirt','joggers','socks'],clo:0.39,act:'house',met:1.8,room:'kitchen',ta:'acceptable',tc:'slightly_comfortable',tcs:4,actions:['win_open'],secs:27}),
    mk(40, {tsv:1,tp:'cooler',garments:['tshirt','joggers','socks'],clo:0.39,act:'sit',met:1.0,room:'living',air:'slight',air_pref:'same',hum:'ok',sun:'no',notes:['hot_drink'],secs:22})
  ], paused:null, pausedWhy:'' };
  save();
}
const votes = () => store.votes.slice().sort((a,b)=>a.ts<b.ts?1:-1);
const lastVote = () => votes()[0] || null;
/* midnight at the start of the 7-day window that ends today */
function weekStart(){ const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-6); return d; }
function insight(){
  const week = store.votes.filter(v => new Date(v.ts) >= weekStart() && typeof v.tsv==='number');
  if(week.length<2) return 'After a few more check-ins this will show what comfortable looks like for you.';
  const count={}; week.forEach(v=>count[v.tsv]=(count[v.tsv]||0)+1);
  const top = Object.entries(count).sort((a,b)=>b[1]-a[1])[0];
  const rooms={}; week.forEach(v=>{ if(v.room) rooms[v.room]=(rooms[v.room]||0)+1; });
  const r = Object.entries(rooms).sort((a,b)=>b[1]-a[1])[0];
  const room = r && byId(ROOMS, r[0]);
  return `Mostly <b>${tsvWord(Number(top[0])).toLowerCase()}</b> this week${room ? `, usually in the ${room.n.toLowerCase()}` : ''}. Soon the room sensor will show the temperature you feel best at.`;
}

/* ---------- session state and navigation ---------- */
let S = { screen:'start', flow:[], i:0, a:{}, t0:null, mode:'self', same:false, lock:false, hist:[], edit:false };
const extMode = () => (DEBUG && $('#extMode')) ? $('#extMode').value : 'rotate';
function buildFlow(){
  const m = extMode(), n = store.votes.length;
  return m==='none' ? [] : m==='all' ? [...EXT_A, ...EXT_B] : (n%2===0 ? EXT_A : EXT_B);
}
function startSession(mode){
  S = { screen:'start', flow:[], i:0, a:{}, t0:Date.now(), mode, same:false, lock:false, hist:[], edit:false };
  go('home');
}
function beginQuestions(same){
  const last = lastVote();
  S.same = same;
  if(last) Object.assign(S.a, { tsv:last.tsv, tp:last.tp, clo:[...(last.garments||[])], act:last.act, room:last.room });
  if(same && last){
    S.flow = buildFlow();
    if(!S.flow.length){ go('review'); return; }
  } else {
    S.flow = [...CORE, ...buildFlow()];
  }
  S.i = 0; go('q');
}
function go(screen, opts={}){
  if(screen==='start' || screen==='pending' || screen==='welcome'){ S.hist = []; }
  else if(!opts.replace && S.screen!==screen) S.hist.push(S.screen);
  S.screen = screen; render();
}
function next(){
  if(S.edit){ S.edit = false; S.hist.pop(); S.screen = 'review'; render(); return; }   // one question edited from the review: straight back to it
  if(S.i < S.flow.length-1){ S.i++; render(); } else { go('review'); }
}
function back(){
  if(S.screen==='q' && S.i>0 && !S.edit){ S.i--; render(); return; }
  S.edit = false;
  const prev = S.hist.pop();
  if(!prev || prev==='q' && S.screen==='review' && !S.flow.length){ S.screen='start'; S.hist=[]; render(); return; }
  if(prev==='q'){ S.i = Math.max(0, S.flow.length-1); }
  S.screen = prev; render();
}

/* ---------- when the next reminder is due ---------- */
const hm = s => { const m = /^(\d{1,2}):(\d{2})/.exec(s||''); return m ? [Number(m[1]), Number(m[2])] : null; };
/* the same moment if it is on the hour, otherwise the next whole hour */
function ceilHour(d){ const c = new Date(d); if(c.getMinutes() || c.getSeconds() || c.getMilliseconds()) c.setHours(c.getHours()+1, 0, 0, 0); return c; }
/* The next moment the sender (switch/push/send.js) can actually send. It runs at the top of every hour and
 * sends when reminders are not paused (the hour of settling in after "I just got in" counts as a pause),
 * at least GAP_MIN minutes have passed since the last check-in, and the phone's clock is inside the
 * participant's home hours. So: the earliest allowed moment, rounded up to the next whole hour, then
 * pushed into home hours day by day (weekday and weekend hours differ). With hours 06:00-23:00 a
 * check-in at 22:45 gives "tomorrow at 06:00", one at 14:10 gives "today at 15:00", and "just got in"
 * at 18:05 gives "today at 20:00". */
function nextReminder(){
  const now = new Date(), h = hours();
  let t = now.getTime();
  const last = lastVote();
  if(last) t = Math.max(t, new Date(last.ts).getTime() + GAP_MIN*60000);
  if(store.paused && new Date(store.paused) > now) t = Math.max(t, new Date(store.paused).getTime());
  let c = ceilHour(new Date(t));
  for(let i=0; i<8; i++){
    const we = c.getDay()===0 || c.getDay()===6;
    const s = hm(we ? h.weekend_start : h.weekday_start) || hm(we ? DEFAULT_HOURS.weekend_start : DEFAULT_HOURS.weekday_start);
    const e = hm(we ? h.weekend_end : h.weekday_end) || hm(we ? DEFAULT_HOURS.weekend_end : DEFAULT_HOURS.weekday_end);
    const start = new Date(c); start.setHours(s[0], s[1], 0, 0);
    const end = new Date(c); end.setHours(e[0], e[1], 0, 0);
    if(c < start) return ceilHour(start);
    if(c <= end) return c;
    c = new Date(c); c.setDate(c.getDate()+1); c.setHours(0,0,0,0);
  }
  return c;
}
function whenWord(d){
  const now = new Date(), tom = new Date(now); tom.setDate(tom.getDate()+1);
  const k = dayKey(d);
  if(k===dayKey(now)) return 'today at ' + fmt(d);
  if(k===dayKey(tom)) return 'tomorrow at ' + fmt(d);
  return 'on ' + DAYS[d.getDay()] + ' at ' + fmt(d);
}

/* ---------- screens ---------- */
function statusCard(){
  const now = Date.now();
  if(store.pausedWhy==='manual') return `<div class="status">${ic('pause')}<div><b>Paused until you are back</b><span>Tap &ldquo;Check in now&rdquo; when you are home again.</span></div></div>`;
  if(store.paused && new Date(store.paused) > now){
    if(store.pausedWhy==='settling') return `<div class="status">${ic('clock')}<div><b>Settling in, next check-in ${whenWord(nextReminder())}</b><span>At least an hour at home before the first question.</span></div></div>`;
    return `<div class="status">${ic('pause')}<div><b>Paused until ${fmt(new Date(store.paused))}</b><span>No reminders while you are out. Next one ${whenWord(nextReminder())}.</span></div></div>`;
  }
  const remindersOn = typeof PUSH !== 'undefined' && PUSH.status && PUSH.status() === 'on';
  if(!remindersOn) return `<div class="status">${ic('clock')}<div><b>Next check-in window ${whenWord(nextReminder())}</b><span>Turn on reminders below to get a nudge.</span></div></div>`;
  return `<div class="status">${ic('bell')}<div><b>Next reminder ${whenWord(nextReminder())}</b><span>Once an hour, only while you are at home.</span></div></div>`;
}
function statsRow(){
  const today = dayKey(new Date()), ws = weekStart();
  const t = store.votes.filter(v=>dayKey(new Date(v.ts))===today).length;
  const w = store.votes.filter(v=>new Date(v.ts) >= ws).length;
  return `<div class="stats"><div class="stat"><b>${t}</b><span>today</span></div><div class="stat"><b>${w}</b><span>this week</span></div><div class="stat"><b>${store.votes.length}</b><span>in total</span></div></div>`;
}
/* the last 7 days ending today: weekday initial, the day's most common sensation as a face, and the count */
function weekStrip(){
  const byDay = {};
  store.votes.forEach(v => { const k = dayKey(new Date(v.ts)); (byDay[k] = byDay[k] || []).push(v); });
  const today = new Date(); today.setHours(0,0,0,0);
  let cols = '', total = 0;
  for(let i=6; i>=0; i--){
    const d = new Date(today); d.setDate(d.getDate()-i);
    const list = byDay[dayKey(d)] || [];
    total += list.length;
    const count = {}; list.forEach(v => { if(typeof v.tsv==='number') count[v.tsv] = (count[v.tsv]||0)+1; });
    const top = Object.entries(count).sort((a,b) => b[1]-a[1] || Math.abs(+a[0])-Math.abs(+b[0]))[0];
    cols += `<div class="wd ${i===0?'today':''}" title="${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}"><span class="dn">${DAYS[d.getDay()][0]}</span>${top ? face(Number(top[0]), {plain:true}) : '<span class="none"></span>'}<span class="dc ${list.length?'':'zero'}">${list.length}</span></div>`;
  }
  return `<div class="week"><div class="wk-head"><span class="eyebrow">This week</span><span>${total} check-in${total===1?'':'s'}</span></div><div class="wk-days">${cols}</div></div>`;
}
function insightCard(){ return `<div class="insight">${ic('bulb')}<div>${insight()}</div></div>`; }
function footLine(){
  const n = SWITCH.pending().length;
  const cls = !SWITCH.live ? 'local' : n ? 'wait' : '';
  const txt = !SWITCH.live ? 'stored on this phone only' : n ? n + ' waiting to sync' : 'synced';
  return `${NAME ? esc(NAME) + ' &middot; ' : ''}${esc(PARTICIPANT)} &middot; <span class="sync ${cls}"><i></i>${txt}</span>`;
}
/* everything the last check-in holds, one line each, for the "still the same?" card */
function lastDetails(l){
  const li = (icon, html) => html ? `<li>${icon}<div>${html}</div></li>` : '';
  const tp = byId(TP,l.tp), act = byId(ACTS,l.act), room = byId(ROOMS,l.room), air = byId(AIR,l.air), airp = byId(AIRP,l.air_pref), hum = byId(HUM,l.hum), sun = byId(SUN,l.sun);
  const tcs = typeof l.tcs==='number' ? l.tcs : typeof l.tc==='number' ? l.tc : (TC.find(t=>t.id===l.tc)||{}).k;
  const taOk = l.ta ? (byId(TA,l.ta) ? l.ta==='acceptable' : !/unacc/.test(l.ta)) : null;
  return [
    typeof l.tsv==='number' && li(`<span class="f">${face(l.tsv)}</span>`, `<b>${tsvWord(l.tsv)}</b> (${signed(l.tsv)})`),
    tp && li(ic(tp.ic, tp.cls||''), tp.id==='same' ? 'Happy with the temperature' : `Would like to be <b>${tp.n.toLowerCase()}</b>`),
    (l.garments||[]).length ? li(ic('tshirt'), `${garmentNames(l.garments)} &middot; ${(l.clo||0).toFixed(2)} clo`) : '',
    act && li(ic(act.ic), act.n),
    room && li(ic(room.ic), room.n),
    l.ta && li(ic(taOk?'up':'down', taOk?'good':'bad'), taWord(l.ta)),
    tcs && li(`<span class="f">${comfortFace(tcs)}</span>`, `${tcWord(tcs)} (${tcs}/6)`),
    air && li(ic(air.ic), `${air.id==='still' ? 'Still air' : air.n}${airp ? ' &middot; ' + airp.n.toLowerCase() : ''}`),
    hum && li(ic(hum.ic), hum.id==='ok' ? 'Humidity fine' : hum.id==='dry' ? 'Dry air' : 'Muggy air'),
    sun && li(ic(sun.ic), sun.n),
    Array.isArray(l.actions) && li(ic(byId(ACTIONS, l.actions[0])?.ic || 'bolt'), l.actions.length ? 'Changed: ' + namesOf(ACTIONS, l.actions).toLowerCase() : 'Nothing changed'),
    Array.isArray(l.notes) && li(ic(byId(NOTES, l.notes[0])?.ic || 'info'), l.notes.length ? namesOf(NOTES, l.notes) : 'Nothing to note')
  ].filter(Boolean).join('');
}
const SCREENS = {
  welcome: () => `<div class="hero"><div class="eyebrow">SWITCH &middot; Personal comfort study</div><h1 class="h1">Welcome</h1><p class="sub">Short check-ins while you are at home teach the system what comfortable means for you. Registering takes about a minute and happens once.</p></div>
    ${welcomeNote ? `<div class="msg" id="welcomeMsg">${ic('info')}<div>${esc(welcomeNote)}</div></div>` : ''}
    <div class="rows">
      <button class="row" data-act="go" data-to="register">${ic('user')}<div><b>I'm new here</b><span>Create my profile</span></div>${ic('chev','go')}</button>
      <button class="row" data-act="go" data-to="signin">${ic('mail')}<div><b>I have registered before</b><span>Continue with my email</span></div>${ic('chev','go')}</button>
    </div>
    <div class="actions"><div class="foot">Questions about the study? Email info@mehraban.uk</div></div>`,
  register: () => {
    const y = new Date().getFullYear();
    return qhead('About you', 'Create your profile', 'Used only to understand comfort differences between people.') +
      `<form class="form" id="regForm" novalidate>
        <div class="field"><label for="r_name">Full name</label><input class="in" id="r_name" name="name" autocomplete="name" required></div>
        <div class="field"><label for="r_email">Email</label><input class="in" id="r_email" name="email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" required></div>
        <div class="row2">
          <div class="field"><label for="r_gender">Gender</label><select class="in" id="r_gender" name="gender"><option value="">Choose</option><option value="woman">Woman</option><option value="man">Man</option><option value="non_binary">Non-binary</option><option value="prefer_not">Prefer not to say</option></select></div>
          <div class="field"><label for="r_year">Year of birth</label><input class="in" id="r_year" name="birth_year" type="number" inputmode="numeric" min="1920" max="${y-10}" placeholder="e.g. 1985"></div>
        </div>
        <div class="row2">
          <div class="field"><label for="r_height">Height (cm)</label><input class="in" id="r_height" name="height_cm" type="number" inputmode="decimal" min="100" max="250" placeholder="e.g. 172"></div>
          <div class="field"><label for="r_weight">Weight (kg)</label><input class="in" id="r_weight" name="weight_kg" type="number" inputmode="decimal" min="30" max="300" placeholder="e.g. 70"></div>
        </div>
        <div class="field"><label>In general, I&hellip;</label><div class="seg" id="r_sens">
          <button type="button" data-sens="cold" class="${S.sens==='cold'?'on':''}">Feel the cold easily</button><button type="button" data-sens="average" class="${S.sens==='average'?'on':''}">Am about average</button><button type="button" data-sens="warm" class="${S.sens==='warm'?'on':''}">Feel the warmth easily</button></div></div>
        <div class="err" id="regErr" hidden></div>
      </form>
      <div class="actions"><button class="btn primary" data-act="register">Continue ${ic('chev')}</button><p class="note" style="text-align:center">Your answers are stored under a participant code. Your name and email are kept separately by the research team.</p></div>`;
  },
  signin: () => qhead('Welcome back', 'Continue with your email', 'The email you registered with. No password needed.') +
    `<form class="form" id="signForm" novalidate><div class="field"><label for="s_email">Email</label><input class="in" id="s_email" type="email" inputmode="email" autocomplete="email" autocapitalize="off"></div><div class="err" id="signErr" hidden></div></form>
    <div class="actions"><button class="btn primary" data-act="signin">Continue ${ic('chev')}</button><button class="btn link" data-act="go" data-to="register">I have not registered yet</button></div>`,
  pending: () => `<div class="done"><div class="big">${ic('clock')}</div><h1>Thanks${firstName() ? ', ' + esc(firstName()) : ''}.</h1><p class="sub">The research team will confirm your place, usually within a day. You will be able to check in as soon as that is done.</p><div class="msg" id="pendMsg" hidden></div>
    <div class="actions"><button class="btn primary" data-act="recheck">${ic('refresh')} Check again</button><button class="btn link" data-act="forget">Not you? Start again</button><div class="foot">Your participant code is ${esc(PARTICIPANT)}</div></div></div>`,
  start: () => `<div class="hero"><div class="eyebrow">SWITCH &middot; Personal comfort study</div><h1 class="h1">${greeting()}</h1></div>` +
    statusCard() + weekStrip() + statsRow() + insightCard() + reminderCard() +
    `<div class="actions"><button class="btn primary" data-act="start">${ic('bell')} Check in now</button><button class="btn secondary" data-act="go" data-to="history">${ic('list')} My check-ins</button><div class="foot">${footLine()}</div></div>`,
  history: () => {
    const list = votes();
    if(!list.length) return qhead('History', 'My check-ins', 'Nothing here yet. Your first check-in will appear on this page.') + `<div class="actions"><button class="btn secondary" data-act="back">Back</button></div>`;
    let html = '', day = '';
    list.slice(0, 60).forEach(v => {
      const d = new Date(v.ts), k = dayKey(d);
      if(k !== day){ day = k; const today = k===dayKey(new Date()); html += `<li class="day">${today ? 'Today' : DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]}</li>`; }
      const bits = [byId(TP,v.tp)?.n && 'prefer ' + byId(TP,v.tp).n.toLowerCase(), byId(ROOMS,v.room)?.n, typeof v.clo==='number' && v.clo.toFixed(2) + ' clo', v.ta && taWord(v.ta).toLowerCase()].filter(Boolean).join(' &middot; ');
      html += `<li class="item">${typeof v.tsv==='number' ? face(v.tsv) : ''}<div><b>${typeof v.tsv==='number' ? tsvWord(v.tsv) + ' (' + signed(v.tsv) + ')' : 'Check-in'}</b><span>${bits}</span></div><time>${fmt(d)}</time></li>`;
    });
    return qhead('History', 'My check-ins', `${list.length} on this phone, newest first. For viewing only.`) + `<ul class="hist">${html}</ul>`;
  },
  home: () => qhead('Before we start', 'Are you at home right now?', 'We only ask about comfort once you have settled in.') +
    `<div class="rows fill">
      <button class="row" data-act="home" data-v="long">${ic('home')}<div><b>Yes, for over an hour</b><span>Let's do the check-in</span></div>${ic('chev','go')}</button>
      <button class="row" data-act="home" data-v="recent">${ic('clock')}<div><b>Yes, I just got in</b><span>We will ask again in an hour or two</span></div>${ic('chev','go')}</button>
      <button class="row" data-act="home" data-v="out">${ic('out')}<div><b>No, I'm out</b><span>Pause reminders for a while</span></div>${ic('chev','go')}</button>
    </div>`,
  recent: () => `<div class="done"><div class="big">${ic('clock')}</div><h1>No rush</h1><p class="sub">Your body takes a while to adjust after coming indoors. We will check back <b>${whenWord(nextReminder())}</b>.</p><div class="actions"><button class="btn primary" data-act="go" data-to="start">OK</button></div></div>`,
  away: () => qhead('Out and about', 'When should we check again?', 'You will get no reminders until then.') +
    `<div class="rows fill">
      <button class="row" data-act="pause" data-v="60">${ic('clock')}<div><b>In an hour</b></div>${ic('chev','go')}</button>
      <button class="row" data-act="pause" data-v="180">${ic('clock')}<div><b>In three hours</b></div>${ic('chev','go')}</button>
      <button class="row" data-act="pause" data-v="evening">${ic('moon')}<div><b>This evening</b><span>From 19:00</span></div>${ic('chev','go')}</button>
      <button class="row" data-act="pause" data-v="manual">${ic('pin')}<div><b>I'll tell you when I'm back</b></div>${ic('chev','go')}</button>
    </div>`,
  same: () => {
    const l = lastVote(), d = new Date(l.ts), mins = Math.round((Date.now()-d)/60000);
    const ago = mins < 60 ? mins + ' minute' + (mins===1?'':'s') : mins < 48*60 ? Math.round(mins/60) + ' hour' + (Math.round(mins/60)===1?'':'s') : Math.round(mins/1440) + ' days';
    return qhead('Quick check', 'Still the same as last time?', `Logged ${dayKey(d)===dayKey(new Date()) ? 'at ' + fmt(d) : 'on ' + DAYS[d.getDay()] + ' at ' + fmt(d)}, ${ago} ago.`) +
      `<div class="last"><div class="when">Last check-in</div><div class="fig">${avatar(l.garments||[])}</div><ul>${lastDetails(l)}</ul></div>
      <div class="actions"><button class="btn primary" data-act="same">${ic('check')} Yes, still the same</button><button class="btn secondary" data-act="changed">Something has changed</button></div>`;
  },
  q: () => Q[S.flow[S.i]](),
  review: () => {
    const a = S.a, li = (k, v, q) => v===undefined||v===null||v===false||v==='' ? '' : `<li><span class="k">${k}</span><span class="v">${v}</span>${q&&S.flow.includes(q)?`<button class="edit" data-act="edit" data-q="${q}">Edit</button>`:''}</li>`;
    return qhead('Almost done', 'Here is what we will log') +
      `<ul class="review">
        ${li('Feeling', typeof a.tsv==='number' && `${tsvWord(a.tsv)} (${signed(a.tsv)})`, 'tsv')}
        ${li('Prefer', byId(TP,a.tp)?.n, 'tp')}
        ${li('Wearing', a.clo && a.clo.length && `${garmentNames(a.clo)} &middot; ${cloOf(a.clo).toFixed(2)} clo`, 'clo')}
        ${li('Activity', byId(ACTS,a.act)?.n, 'act')}
        ${li('Room', byId(ROOMS,a.room)?.n, 'room')}
        ${li('Conditions', a.ta && taWord(a.ta), 'ta')}
        ${li('Comfort', typeof a.tc==='number' && `${tcWord(a.tc)} (${a.tc}/6)`, 'tc')}
        ${li('Air', a.air && `${byId(AIR,a.air)?.n}, ${byId(AIRP,a.air_pref)?.n.toLowerCase()||'no preference yet'}`, 'air')}
        ${li('Humidity', byId(HUM,a.hum)?.n, 'hum')}
        ${li('Sun', byId(SUN,a.sun)?.n, 'sun')}
        ${li('Changed', namesOf(ACTIONS, a.actions), 'actions')}
        ${li('Notes', namesOf(NOTES, a.notes), 'notes')}
      </ul>
      <div class="actions"><button class="btn primary" data-act="submit">${ic('checkc')} Submit check-in</button></div>`;
  },
  done: () => {
    const l = lastVote();
    return `<div class="done"><div class="big">${ic('checkc')}</div><h1>Thank you${firstName() ? ', ' + esc(firstName()) : ''}!</h1><p class="sub">Logged at ${fmt(new Date(l.ts))} &middot; took ${l.secs} seconds</p>` +
      statsRow() + insightCard() +
      `<div class="actions"><button class="btn primary" data-act="go" data-to="start">Done</button></div></div>`;
  },
  reminders: () => {
    const st = PUSH.status(), h = hours();
    const form = `<div><div class="duo"><div class="lab">When are you usually at home?</div></div><div class="hours">
        <label>Weekdays from<input type="time" id="h_ws" value="${h.weekday_start}"></label><label>until<input type="time" id="h_we" value="${h.weekday_end}"></label>
        <label>Weekends from<input type="time" id="h_es" value="${h.weekend_start}"></label><label>until<input type="time" id="h_ee" value="${h.weekend_end}"></label></div>
        <p class="note" style="margin-top:6px">Reminders only arrive inside these hours, and never within an hour of you saying you have just got home.</p></div>`;
    const backBtn = `<button class="btn secondary" data-act="back">Back</button>`;
    let body = '', actions = '';
    if(st === 'install'){ body = `<ol class="steps"><li><div>Tap the <b>Share</b> button in Safari.</div></li><li><div>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</div></li><li><div>Open the app from your home screen and turn on reminders there.</div></li></ol>`; actions = backBtn; }
    else if(st === 'unsupported'){ body = `<div class="msg">This browser cannot show reminders. On Android use Chrome. On iPhone use Safari and add the app to your home screen.</div>`; actions = backBtn; }
    else if(st === 'blocked'){ body = `<div class="msg">Notifications are blocked for this app. Allow them in your phone's settings, then come back here.</div>`; actions = backBtn; }
    else if(st === 'off'){ body = form + `<div class="msg" id="remMsg" hidden></div>`; actions = `<button class="btn primary" data-act="push-on">${ic('bell')} Turn on reminders</button><button class="btn link" data-act="back">Not now</button>`; }
    else { body = `<div class="msg ok">${ic('checkc')}<div>Reminders are on for this phone.</div></div>` + form + `<div class="msg" id="remMsg" hidden></div>`; actions = `<button class="btn primary" data-act="save-hours">Save hours</button><button class="btn link" data-act="push-off">Turn off reminders</button>`; }
    return qhead('Reminders', st === 'on' ? 'Your reminder hours' : 'Hourly reminders while you are home', st === 'on' ? '' : 'Each one is a short check-in. Tell the app when you are out and it stays quiet.') + body + `<div class="actions">${actions}</div>`;
  }
};

/* ---------- render ---------- */
function updateTop(){
  const inFlow = S.screen==='q' || S.screen==='review';
  $('#back').hidden = ['start','welcome','done','recent','pending'].includes(S.screen);
  const n = S.flow.length, step = S.screen==='review' ? n + 1 : S.i + 1;
  $('#prog').hidden = !inFlow;
  $('#count').textContent = !inFlow ? '' : S.screen==='review' ? 'Review' : `Question ${step} of ${n}`;
  $('#progress i').style.width = inFlow ? (step/(n+1)*100).toFixed(1)+'%' : '0%';
  $('#progress').setAttribute('aria-valuenow', inFlow ? String(Math.round(step/(n+1)*100)) : '0');
}
let lastRendered = '';
function render(){
  const el = $('#screen');
  const key = S.screen + ':' + S.i;
  el.innerHTML = SCREENS[S.screen]();
  if(key !== lastRendered){ el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); el.scrollTop = 0; }   // "enter", never "in": that is the input class
  lastRendered = key;
  updateTop();
}
function rerender(){ $('#screen').innerHTML = SCREENS[S.screen](); updateTop(); }

/* ---------- answering ---------- */
function pick(q, raw){
  const v = (q==='tsv' || q==='tc') ? Number(raw) : raw;
  S.a[q] = v;
  rerender();
  if(S.flow[S.i]==='air' && !(S.a.air && S.a.air_pref)) return;
  S.lock = true;
  setTimeout(()=>{ S.lock=false; next(); }, 460);
}
function toggle(q, v){
  const arr = S.a[q] ? [...S.a[q]] : [];
  const i = arr.indexOf(v);
  if(i>=0) arr.splice(i,1); else arr.push(v);
  S.a[q] = arr; rerender();
}
function onHome(v){
  S.a.home = v;
  if(v==='long'){
    store.paused=null; store.pausedWhy=''; save();
    if(PUSH.status()==='on') quiet(SWITCH.updateSchedule(PARTICIPANT, { paused_until:null, settled_at:null }));
    lastVote() ? go('same') : beginQuestions(false);
  } else if(v==='recent'){
    store.paused = new Date(Date.now()+60*60000).toISOString(); store.pausedWhy='settling'; save();
    if(PUSH.status()==='on') quiet(SWITCH.updateSchedule(PARTICIPANT, { settled_at:new Date().toISOString(), paused_until:null }));
    go('recent');
  } else { go('away'); }
}
function setPause(v){
  if(v==='manual'){ store.paused=null; store.pausedWhy='manual'; }
  else if(v==='evening'){ const d=new Date(); if(d.getHours()>=19) d.setDate(d.getDate()+1); d.setHours(19,0,0,0); store.paused=d.toISOString(); store.pausedWhy='away'; }
  else { store.paused = new Date(Date.now()+Number(v)*60000).toISOString(); store.pausedWhy='away'; }
  save();
  if(PUSH.status()==='on') quiet(SWITCH.updateSchedule(PARTICIPANT, { paused_until: store.paused || new Date(Date.now()+12*3600000).toISOString() }));
  go('start');
}
function submit(){
  const a = S.a;
  const row = { id:'v'+Date.now()+Math.random().toString(36).slice(2,6), ts:new Date().toISOString(), type:S.mode, home:a.home||'long',
    tsv:a.tsv, tp:a.tp, garments:a.clo||[], clo:cloOf(a.clo||[]), act:a.act, met:byId(ACTS,a.act)?.met, room:a.room,
    ta:a.ta, tc: typeof a.tc==='number' ? (TC.find(t=>t.k===a.tc)||{}).id : undefined, tcs: typeof a.tc==='number' ? a.tc : undefined,
    air:a.air, air_pref:a.air_pref, hum:a.hum, sun:a.sun, actions:a.actions, notes:a.notes,
    same:S.same, secs:Math.max(1, Math.round((Date.now()-S.t0)/1000)) };
  store.votes.push(row); store.paused=null; store.pausedWhy=''; save();
  syncVote(row);
  if(PUSH.status()==='on') quiet(SWITCH.updateSchedule(PARTICIPANT, { last_vote_at:new Date().toISOString(), paused_until:null }));
  if(DEBUG) renderTable();
  go('done'); confetti();
}
const quiet = p => { try{ p.catch(()=>{}); }catch(e){} };
/* 401 and 403 mean the database refused this code (no longer approved, or removed), not a hiccup. */
const refused = status => status === 401 || status === 403;
/* Sends one check-in. Offline or on a server error it waits in the queue for flushPending(). When the
 * database refuses the code the row is not queued (it stays on the phone) and the approval is checked again. */
async function syncVote(row){
  if(SWITCH.live){
    const rec = SWITCH.toRecord(row, PARTICIPANT);
    let r = null;
    try{ r = await SWITCH.insert(rec); }catch(e){}
    if(r && refused(r.status)){ dropQueued(PARTICIPANT); if(S.screen==='start') rerender(); await afterRefusal(); return; }
    if(!r || !r.ok) SWITCH.queue(rec);
  }
  if(S.screen==='start') rerender();
}
/* Retries the queued check-ins (on start and when the phone comes back online). Rows the database refuses
 * with 401/403 are dropped instead of retried forever, so "N waiting to sync" cannot stick; if any of them
 * belonged to this code, the approval is checked again. The queue is SWITCH's "switch_pending" list. */
async function flushPending(){
  if(!SWITCH.live) return;
  const q = SWITCH.pending(); if(!q.length) return;
  const left = []; let mine = false;
  for(const rec of q){
    try{ const r = await SWITCH.insert(rec); if(r.ok) continue; if(refused(r.status)){ if(rec.participant === PARTICIPANT) mine = true; } else left.push(rec); }
    catch(e){ left.push(rec); }
  }
  LS.set('switch_pending', JSON.stringify(left));
  if(S.screen==='start') rerender();
  if(mine) await afterRefusal();
}
function dropQueued(code){ LS.set('switch_pending', JSON.stringify(SWITCH.pending().filter(r => r.participant !== code))); }

/* ---------- registration and approval ---------- */
const friendly = (m, fallback) => /schema cache|could not find the function/i.test(m||'') ? 'Registration is not switched on yet. Please contact the research team.' : /registered/i.test(m||'') ? 'We could not find that email. Check the spelling, or register as new.' : (m || fallback);
function setIdentity(code, name){
  PARTICIPANT = code; NAME = name || ''; welcomeNote = '';
  SWITCH.setParticipant(code); LS.set('switch_name', NAME);
}
/* Forgets who is using this phone: the code is gone from the database (removed on the dashboard), or the
 * person on the waiting screen said it is not them. The check-ins stay on the phone. */
function forgetIdentity(note){
  LS.del('switch_participant'); LS.del('switch_name'); LS.del(APPROVED_KEY); LS.del('switch_push');
  PARTICIPANT = ''; NAME = ''; welcomeNote = note || '';
  go('welcome');
}
/* After registering or signing in: only an approved participant gets to the start screen. */
function afterIdentity(approved){
  if(approved === false){ LS.del(APPROVED_KEY); go('pending'); }
  else { LS.set(APPROVED_KEY, 'yes'); go('start'); }
}
async function register(){
  const f = $('#regForm'), err = $('#regErr');
  const name = f.name.value.trim(), email = f.email.value.trim();
  const show = m => { err.textContent = m; err.hidden = false; };
  if(name.length < 2) return show('Please enter your name.');
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return show('Please enter a valid email address.');
  const num = v => v === '' ? null : Number(v);
  const fields = { email, name, gender: f.gender.value || null, birth_year: num(f.birth_year.value), height_cm: num(f.height_cm.value), weight_kg: num(f.weight_kg.value), sensitivity: S.sens || null };
  const b = $('[data-act="register"]'); b.disabled = true; err.hidden = true;
  try{
    if(!SWITCH.live){ setIdentity('P00', name); LS.set('switch_profile', JSON.stringify(fields)); afterIdentity(true); return; }
    const r = await SWITCH.register(fields);
    setIdentity(r.code, r.name || name);
    afterIdentity(r.approved);
  }catch(e){ show(friendly(e.message, 'Could not register. Check the connection and try again.')); b.disabled = false; }
}
async function signin(){
  const email = $('#s_email').value.trim(), err = $('#signErr');
  const show = m => { err.textContent = m; err.hidden = false; };
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return show('Please enter a valid email address.');
  const b = $('[data-act="signin"]'); b.disabled = true; err.hidden = true;
  try{
    if(!SWITCH.live) return show('The study database is not connected yet.');
    const r = await SWITCH.register({ email });
    setIdentity(r.code, r.name);
    afterIdentity(r.approved);
  }catch(e){ show(friendly(e.message, 'Could not sign in. Check the connection and try again.')); b.disabled = false; }
}
function pendMsg(t){ const m = $('#pendMsg'); if(!m) return; m.hidden = false; m.innerHTML = ic('info') + '<div>' + t + '</div>'; }
/* Asks the database about this code. SWITCH.approval() resolves to { approved } (no name: the name saved at
 * registration is kept) or null when the code is not registered any more. Resolves to 'yes' (and remembers
 * it), 'no' (still waiting) or 'gone'; rejects when the database cannot be reached. */
async function approvalState(){
  const r = await SWITCH.approval(PARTICIPANT);
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
    if(st === 'yes'){ checking = false; go('start'); return; }
    if(st === 'gone'){ checking = false; forgetIdentity(NOT_FOUND_MSG); return; }
    if(!silent) pendMsg('Not confirmed yet. Please try again a little later.');
  }catch(e){ if(!silent) pendMsg('Could not reach the study database, try again later.'); }
  checking = false;
  const b2 = $('[data-act="recheck"]'); if(b2) b2.disabled = false;
}
/* On start: an unconfirmed code (not a ?p= test link) is checked in the background; the start screen is
 * already showing, and only a "not approved" answer swaps it for the waiting screen (a removed code goes
 * back to the welcome screen). Offline, carry on. */
const needsApprovalCheck = () => !!PARTICIPANT && SWITCH.live && LS.get(APPROVED_KEY) !== 'yes' && !VIA_URL;
async function checkApproval(){
  try{
    const st = await approvalState();
    if(st === 'yes'){ if(S.screen==='start') rerender(); }
    else if(st === 'gone') forgetIdentity(NOT_FOUND_MSG);
    else if(S.screen !== 'pending') go('pending');
  }catch(e){ /* unreachable database: the start screen stays; the database refuses check-ins on its own */ }
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
const HOURS_KEY = 'switch_hours';
const DEFAULT_HOURS = { weekday_start:'17:00', weekday_end:'22:30', weekend_start:'09:00', weekend_end:'22:30' };
function hours(){ try{ return Object.assign({}, DEFAULT_HOURS, JSON.parse(LS.get(HOURS_KEY)||'{}')); }catch(e){ return Object.assign({}, DEFAULT_HOURS); } }
const PUSH = {
  supported: 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
  standalone: matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
  ios: /iPhone|iPad|iPod/.test(navigator.userAgent),
  configured: SWITCH.live && !!SWITCH.cfg.vapidPublicKey,
  status(){
    if(!this.configured) return 'unconfigured';
    if(!this.supported) return (this.ios && !this.standalone) ? 'install' : 'unsupported';
    if(Notification.permission === 'denied') return 'blocked';
    return LS.get('switch_push') === 'on' ? 'on' : 'off';
  },
  async enable(){
    const reg = await navigator.serviceWorker.ready;
    const perm = await Notification.requestPermission();
    if(perm !== 'granted') return 'blocked';
    const sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: b64ToBytes(SWITCH.cfg.vapidPublicKey) });
    const j = sub.toJSON();
    const ok = await SWITCH.saveSubscription(Object.assign({ endpoint:j.endpoint, participant:PARTICIPANT, p256dh:j.keys.p256dh, auth:j.keys.auth,
      tz_offset_min:-new Date().getTimezoneOffset(), interval_min:INTERVAL, enabled:true, user_agent:navigator.userAgent.slice(0,200) }, hours()));
    if(!ok) throw new Error('This phone could not be registered. Check the connection and try again.');
    LS.set('switch_push','on'); return 'on';
  },
  async disable(){
    try{ const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); if(sub){ await SWITCH.disableSubscription(sub.endpoint); await sub.unsubscribe(); } }catch(e){}
    LS.set('switch_push','off');
  }
};
function b64ToBytes(s){ const p = '='.repeat((4 - s.length % 4) % 4); const b = atob((s + p).replace(/-/g,'+').replace(/_/g,'/')); return Uint8Array.from(b, c => c.charCodeAt(0)); }
function reminderCard(){
  const st = PUSH.status();
  if(st === 'unconfigured') return '';
  const h = hours();
  const map = {
    on:          ['bell',  'Reminders are on', `Weekdays ${h.weekday_start}&ndash;${h.weekday_end}, weekends ${h.weekend_start}&ndash;${h.weekend_end}`],
    off:         ['bell',  'Turn on reminders', 'A nudge once an hour while you are at home'],
    install:     ['pin',   'Add to your home screen', 'Reminders need the app on your home screen'],
    blocked:     ['pause', 'Reminders are blocked', 'Allow notifications to turn them on'],
    unsupported: ['pause', 'Reminders not available here', 'Use Chrome on Android or Safari on iPhone']
  };
  const [icon, t, s] = map[st];
  return `<button class="rem ${st==='on'?'on':''}" data-act="go" data-to="reminders">${ic(icon)}<div><b>${t}</b><span>${s}</span></div>${ic('chev','go')}</button>`;
}
function readHours(){ return { weekday_start: $('#h_ws').value || DEFAULT_HOURS.weekday_start, weekday_end: $('#h_we').value || DEFAULT_HOURS.weekday_end, weekend_start: $('#h_es').value || DEFAULT_HOURS.weekend_start, weekend_end: $('#h_ee').value || DEFAULT_HOURS.weekend_end }; }
function remMsg(t, ok){ const m = $('#remMsg'); if(!m) return; m.hidden = false; m.className = 'msg' + (ok ? ' ok' : ''); m.innerHTML = t; }

/* ---------- events ---------- */
$('#screen').addEventListener('click', async e => {
  const sens = e.target.closest('[data-sens]');
  if(sens){ S.sens = sens.dataset.sens; sens.parentElement.querySelectorAll('button').forEach(b=>b.classList.toggle('on', b===sens)); return; }
  const b = e.target.closest('[data-act]'); if(!b || S.lock) return;
  const d = b.dataset;
  switch(d.act){
    case 'go': go(d.to); break;
    case 'back': back(); break;
    case 'start': startSession('self'); break;
    case 'home': onHome(d.v); break;
    case 'pause': setPause(d.v); break;
    case 'same': beginQuestions(true); break;
    case 'changed': beginQuestions(false); break;
    case 'pick': pick(d.q, d.v); break;
    case 'toggle': toggle(d.q, d.v); break;
    case 'none': S.a[d.q] = []; rerender(); break;
    case 'lastclo': S.a.clo = [...((lastVote() || {}).garments || [])]; rerender(); break;
    case 'next': next(); break;
    case 'edit': { const i = S.flow.indexOf(d.q); if(i>=0){ S.i=i; S.edit=true; S.hist.push('review'); S.screen='q'; render(); } break; }
    case 'submit': submit(); break;
    case 'register': register(); break;
    case 'signin': signin(); break;
    case 'recheck': recheck(false); break;
    case 'forget': forgetIdentity(''); break;
    case 'push-on': {
      LS.set(HOURS_KEY, JSON.stringify(readHours())); b.disabled = true;
      try{ await PUSH.enable(); rerender(); }
      catch(err){ b.disabled = false; remMsg(err.message || 'Something went wrong, please try again.'); }
      break; }
    case 'save-hours': {
      const h = readHours(); LS.set(HOURS_KEY, JSON.stringify(h));
      let ok = false; try{ ok = await SWITCH.updateSchedule(PARTICIPANT, h); }catch(err){}
      remMsg(ok ? 'Saved.' : 'Saved on this phone. The reminder service could not be reached right now.', ok);
      break; }
    case 'push-off': await PUSH.disable(); rerender(); break;
  }
});
$('#screen').addEventListener('keydown', e => {
  if(e.key!=='Enter') return;
  if(e.target.id==='s_email'){ e.preventDefault(); signin(); }
  if(e.target.closest && e.target.closest('#regForm') && e.target.tagName==='INPUT'){ e.preventDefault(); }
});
$('#screen').addEventListener('submit', e => e.preventDefault());   // the forms never submit natively
$('#back').addEventListener('click', back);
setInterval(() => { if(S.screen==='pending' && !document.hidden) recheck(true); }, 60000);
document.addEventListener('visibilitychange', () => { if(!document.hidden && S.screen==='pending') recheck(true); });

/* ---------- celebration ---------- */
function confetti(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = $('#confetti'); c.hidden = false;
  const r = c.parentElement.getBoundingClientRect(); c.width = r.width; c.height = r.height;
  const ctx = c.getContext('2d');
  const cols = ['#1E5CC8','#3D8CE6','#5CB68B','#F2BB52','#EE8A3E','#D64530','#0E7B72'];
  const ps = Array.from({length:90}, () => ({ x:c.width/2+(Math.random()-.5)*80, y:c.height*.33, vx:(Math.random()-.5)*10, vy:-Math.random()*10-3,
    w:6+Math.random()*5, h:3+Math.random()*4, a:Math.random()*6, va:(Math.random()-.5)*.3, col:cols[Math.floor(Math.random()*cols.length)] }));
  const t0 = performance.now();
  (function tick(t){
    const dt = (t-t0)/1000; ctx.clearRect(0,0,c.width,c.height);
    ps.forEach(p => { p.vy+=.28; p.x+=p.vx; p.y+=p.vy; p.a+=p.va; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.a); ctx.globalAlpha=Math.max(0,1-dt/1.9); ctx.fillStyle=p.col; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore(); });
    if(dt<2) requestAnimationFrame(tick); else { ctx.clearRect(0,0,c.width,c.height); c.hidden = true; }
  })(t0);
}

/* ---------- debug panel (?debug=1) ---------- */
const COLS = [
  ['participant', () => PARTICIPANT], ['timestamp_utc', v=>v.ts], ['local_time', v=>{const d=new Date(v.ts); return dayKey(d)+' '+fmt(d);}],
  ['prompt', v=>v.type], ['at_home', v=>v.home], ['tsv', v=>v.tsv], ['preference', v=>v.tp], ['clo', v=>v.clo?.toFixed(2)],
  ['garments', v=>(v.garments||[]).join('|')], ['met', v=>v.met], ['activity', v=>v.act], ['room', v=>v.room],
  ['acceptability', v=>v.ta], ['comfort', v=>v.tc], ['comfort_score', v=>v.tcs], ['air', v=>v.air], ['air_pref', v=>v.air_pref], ['humidity', v=>v.hum], ['sun', v=>v.sun],
  ['actions', v=>(v.actions||[]).join('|')], ['notes', v=>(v.notes||[]).join('|')], ['same_as_last', v=>v.same?'yes':'no'], ['seconds', v=>v.secs], ['', v=>v.example?'example':'']
];
const cell = x => x===undefined||x===null ? '' : String(x);
function renderTable(){
  if(!DEBUG) return;
  const rows = votes();
  if(!rows.length){ $('#table').innerHTML = '<div class="empty">No check-ins stored yet.</div>'; return; }
  $('#table').innerHTML = `<table><thead><tr>${COLS.map(c=>`<th>${c[0]}</th>`).join('')}</tr></thead><tbody>${rows.map(v=>`<tr>${COLS.map(c=>`<td class="${v.example?'ex':''}">${esc(cell(c[1](v)))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function toCsv(){
  const q = s => /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
  return [COLS.map(c=>c[0]||'flag').join(','), ...votes().map(v=>COLS.map(c=>q(cell(c[1](v)))).join(','))].join('\n');
}
if(DEBUG){
  $('.panel').hidden = false;
  $('#copyCsv').innerHTML = ic('copy') + ' Copy as CSV';
  $('#reseed').innerHTML = ic('refresh') + ' Reset to example data';
  $('#copyCsv').addEventListener('click', async () => { const b=$('#copyCsv'); try{ await navigator.clipboard.writeText(toCsv()); b.innerHTML = ic('check')+' Copied'; }catch(e){ b.innerHTML = ic('copy')+' Copy blocked here'; } setTimeout(()=>{ b.innerHTML = ic('copy')+' Copy as CSV'; }, 1600); });
  $('#reseed').addEventListener('click', () => { seed(); renderTable(); go('start'); });
  $('#clearAll').addEventListener('click', () => { store = {votes:[], paused:null, pausedWhy:''}; save(); renderTable(); go('start'); });
  $('#forget').addEventListener('click', () => forgetIdentity(''));
}

/* ---------- start ---------- */
load();
if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }
window.addEventListener('online', flushPending);
flushPending();
if(!PARTICIPANT){ S.screen = 'welcome'; render(); }
else {
  // Show something straight away; an unconfirmed code is checked in the background (see checkApproval).
  if(FROM_PUSH){ history.replaceState(null, '', location.pathname); startSession('scheduled'); }
  else { S.screen = 'start'; render(); }
  if(needsApprovalCheck()) checkApproval();
}
if(DEBUG) renderTable();
