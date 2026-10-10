/* Home Comfort NY (SUNY ESF) - check-in app: answer options, clothing, the avatar, the eight check-in
 * question screens and the option lists of the sign-up wizard. Loaded after ../icons.js (window.HCI),
 * before app.js. Ported from the SWITCH app (switch/checkin/questions.js and icons.js, v0.4.0) and
 * adapted; nothing here is loaded from switch/ at run time.
 *
 * Stored ids (what the database and the dashboard see) are listed with each option. */
const ic = (name, cls) => HCI.icon(name, cls);
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- the check-in ---------- */
/* activity: met values as in SWITCH (ASHRAE 55) */
const ACTS = [
  {id:'sleep',    n:'Sleeping',             met:0.7, ic:'sleep'},
  {id:'lying',    n:'Lying down',           met:0.8, ic:'lying'},
  {id:'sit',      n:'Sitting relaxed',      met:1.0, ic:'sofa'},
  {id:'desk',     n:'Desk work',            met:1.1, ic:'laptop'},
  {id:'stand',    n:'Standing',             met:1.2, ic:'stand'},
  {id:'house',    n:'Cooking or housework', met:1.8, ic:'pan'},
  {id:'walk',     n:'Walking around',       met:1.7, ic:'walk'},
  {id:'exercise', n:'Exercising',           met:3.5, ic:'dumbbell'}
];
const ROOMS = [
  {id:'living',n:'Living room',ic:'sofa'}, {id:'bedroom',n:'Bedroom',ic:'bed'}, {id:'kitchen',n:'Kitchen',ic:'pan'},
  {id:'office',n:'Home office',ic:'laptop'}, {id:'bathroom',n:'Bathroom',ic:'drop'}, {id:'basement',n:'Basement',ic:'stairs'},
  {id:'other',n:'Elsewhere',ic:'door'}
];
const AIR = [
  {id:'still',  n:'Still',         s:'No air movement I can feel', ic:'still'},
  {id:'slight', n:'Slight breeze', s:'A gentle movement of air',   ic:'breeze'},
  {id:'drafty', n:'Drafty',        s:'I can clearly feel a draft', ic:'wind'}
];
const SUN = [
  {id:'yes',  n:'Sun on me',     s:'Direct sunlight where I am', ic:'sun'},
  {id:'no',   n:'No direct sun', s:'Daylight, but not on me',    ic:'cloud'},
  {id:'dark', n:"It's dark",     s:'Evening, or blinds closed',  ic:'moon'}
];
const ACTIONS = [
  {id:'win_open', n:'Opened a window', ic:'window'},          {id:'win_close', n:'Closed a window', ic:'window'},
  {id:'heat_up',  n:'Turned the heat up', ic:'radiator'},     {id:'heat_down', n:'Turned the heat down or off', ic:'radiator'},
  {id:'ac_up',    n:'Turned the AC on or up', ic:'snow'},     {id:'ac_down',   n:'Turned the AC down or off', ic:'snow'},
  {id:'fan',      n:'Fan on', ic:'fan'},                      {id:'layer_on',  n:'Put on a layer', ic:'layer-on'},
  {id:'layer_off',n:'Took off a layer', ic:'layer-off'},      {id:'blanket',   n:'Got a blanket', ic:'blanket'},
  {id:'curtains', n:'Closed blinds or curtains', ic:'curtain'},{id:'moved',    n:'Moved room', ic:'door'}
];
const NOTES = [
  {id:'hot_drink',n:'Hot drink',ic:'mug'}, {id:'cold_drink',n:'Cold drink',ic:'glass'}, {id:'ate',n:'Just ate',ic:'fork'},
  {id:'hungry',n:'Hungry',ic:'apple'}, {id:'tired',n:'Tired',ic:'zzz'}, {id:'unwell',n:'Feeling unwell',ic:'thermometer'}
];

/* Clothing: the same clo values as SWITCH (ASHRAE 55; blanket and comforter are estimates). */
const GARMENTS = [
  {id:'tshirt',     n:'T-shirt',        clo:0.08, ic:'tshirt'},
  {id:'long',       n:'Long sleeves',   clo:0.25, ic:'longsleeve'},
  {id:'sweater',    n:'Sweater',        clo:0.36, ic:'sweater'},
  {id:'hoodie',     n:'Hoodie or fleece', clo:0.34, ic:'hoodie'},
  {id:'shorts',     n:'Shorts',         clo:0.08, ic:'shorts'},
  {id:'pants',      n:'Pants or jeans', clo:0.24, ic:'pants'},
  {id:'sweatpants', n:'Sweatpants',     clo:0.28, ic:'sweatpants'},
  {id:'skirt',      n:'Skirt or dress', clo:0.23, ic:'skirt'},
  {id:'socks',      n:'Socks',          clo:0.03, ic:'socks'},
  {id:'slippers',   n:'Slippers',       clo:0.03, ic:'slippers'},
  {id:'blanket',    n:'Blanket',        clo:0.60, ic:'blanket', est:true},
  {id:'comforter',  n:'Comforter',      clo:2.00, ic:'bed',     est:true}
];
const cloOf = ids => Math.round((ids||[]).reduce((s,id)=>s+(GARMENTS.find(g=>g.id===id)?.clo||0),0)*100)/100;

/* Every check-in asks the same eight questions in the same order. "Still the same as last time?" shows the
 * answers of the last check-in instead, each with an Edit button, and "Yes, still the same" saves them
 * without asking anything (what changed and anything to note start empty). */
const FLOW_ALL = ['tsv','clo','act','room','air','sun','actions','notes'];
const QNAME = { tsv:'how you feel', clo:'clothing', act:'activity', room:'room', air:'air movement', sun:'sunlight', actions:'what changed', notes:'notes' };
const byId = (list,id) => list.find(x=>x.id===id);
const sense = v => HCI.senseOf(v);
const tsvWord = v => (typeof v==='number' && sense(v)) ? sense(v).word : '';
const garmentNames = ids => (ids||[]).map(id=>byId(GARMENTS,id)?.n).filter(Boolean).join(', ');
const namesOf = (list, ids) => ids && (ids.length ? ids.map(id=>byId(list,id)?.n).filter(Boolean).join(', ') : 'Nothing');
const sameSet = (a, b) => (a||[]).length===(b||[]).length && (a||[]).every(x=>(b||[]).includes(x));

/* A friendly front-facing figure. Garments are drawn in wearing order with a soft outline so layers read
 * clearly. Colors are illustration tints (app.css .fig), never the thermal sensation colors. */
function avatar(ids){
  ids = ids || [];
  const has = id => ids.includes(id);
  const O = 'stroke="rgba(30,27,58,.22)" stroke-width="1.4" stroke-linejoin="round"';
  const R = (x,y,w,h,rx,c,extra='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${c}" ${O} ${extra}/>`;
  const skin = 'var(--fig-skin)', hair = 'var(--fig-hair)';
  let s = '';
  s += `<ellipse cx="60" cy="200" rx="34" ry="5" fill="rgba(30,27,58,.08)"/>`;
  s += R(43,104,15,86,7,skin) + R(62,104,15,86,7,skin);                                   // legs
  s += `<ellipse cx="50" cy="191" rx="11" ry="5.5" fill="${skin}" ${O}/><ellipse cx="70" cy="191" rx="11" ry="5.5" fill="${skin}" ${O}/>`;
  s += `<path d="M40 50Q60 43 80 50L84 108Q60 116 36 108Z" fill="${skin}" ${O}/>`;          // torso
  s += `<g transform="rotate(7 30 54)">${R(23,52,13,62,6.5,skin)}</g><g transform="rotate(-7 90 54)">${R(84,52,13,62,6.5,skin)}</g>`;
  s += R(54,40,12,10,4,skin);                                                               // neck
  s += `<ellipse cx="60" cy="26" rx="14.5" ry="16" fill="${skin}" ${O}/>`;                  // head
  s += `<path d="M45 24Q46 8 60 8Q74 8 75 24Q68 18 60 19Q52 18 45 24Z" fill="${hair}"/>`;
  s += `<circle cx="54.5" cy="27" r="1.6" fill="var(--ink)"/><circle cx="65.5" cy="27" r="1.6" fill="var(--ink)"/><path d="M56 34q4 3 8 0" stroke="var(--ink)" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
  if(has('shorts'))     s += `<path d="M41 104h38l1 38H61l-1-14-1 14H40z" fill="var(--g-shorts)" ${O}/>`;
  if(has('pants'))      s += `<path d="M41 104h38l1 84H61l-1-60-1 60H40z" fill="var(--g-pants)" ${O}/>`;
  if(has('sweatpants')) s += `<path d="M41 104h38l1 84H61l-1-60-1 60H40z" fill="var(--g-sweatpants)" ${O}/><path d="M42 180h17M61 180h17" stroke="rgba(30,27,58,.25)" stroke-width="2"/>`;
  if(has('skirt'))      s += `<path d="M40 104h40l8 56H32z" fill="var(--g-skirt)" ${O}/>`;
  if(has('socks'))      s += R(43.5,172,14,17,5,'var(--g-socks)') + R(62.5,172,14,17,5,'var(--g-socks)');
  if(has('slippers'))   s += `<ellipse cx="50" cy="191" rx="12" ry="6" fill="var(--g-slippers)" ${O}/><ellipse cx="70" cy="191" rx="12" ry="6" fill="var(--g-slippers)" ${O}/>`;
  const top = (c, sleeve) => `<path d="M38 48Q60 40 82 48L86 106Q60 114 34 106Z" fill="${c}" ${O}/>` +
    `<g transform="rotate(7 30 54)">${R(21.5,50,16,sleeve,7,c)}</g><g transform="rotate(-7 90 54)">${R(82.5,50,16,sleeve,7,c)}</g>` +
    `<path d="M52 47q8 5 16 0" fill="none" stroke="rgba(30,27,58,.22)" stroke-width="1.4"/>`;
  if(has('tshirt'))  s += top('var(--g-tshirt)', 26);
  if(has('long'))    s += top('var(--g-long)', 64);
  if(has('sweater')) s += top('var(--g-sweater)', 66) + `<path d="M36 102h48" stroke="rgba(30,27,58,.25)" stroke-width="3"/>`;
  if(has('hoodie'))  s += `<path d="M44 46a16 16 0 0 1 32 0v8H44z" fill="var(--g-hoodie)" ${O}/>` + top('var(--g-hoodie)', 68) + R(46,82,28,14,5,'rgba(30,27,58,.14)');
  if(has('blanket'))   s += `<path d="M22 66Q60 46 98 66L104 198H16z" fill="var(--g-blanket)" ${O}/><path d="M28 100h64M26 130h68M24 160h72" stroke="rgba(30,27,58,.14)" stroke-width="3"/>`;
  if(has('comforter')) s += R(12,58,96,148,22,'var(--g-comforter)') + `<path d="M12 110h96M12 160h96M60 58v148" stroke="rgba(30,27,58,.12)" stroke-width="2"/>`;
  return `<svg viewBox="0 0 120 208" aria-hidden="true" focusable="false">${s}</svg>`;
}

/* ---------- building blocks ---------- */
const qhead = (eyebrow, h, p='') => `<div class="screen-head q-head"><span class="eyebrow">${eyebrow}</span><h1 class="screen-title" tabindex="-1">${h}</h1>${p?`<p class="screen-sub">${p}</p>`:''}</div>`;
/* single choice: a tall row (air, sun) or a compact row in a two-column grid (activity, room) */
const optRow = (q, o, on, cls='') => `<button class="option-row ${cls}" role="radio" aria-checked="${on?'true':'false'}" data-act="pick" data-q="${q}" data-v="${o.id}"><span class="icon-tile">${ic(o.ic)}</span><span class="option-text"><span class="option-title">${o.n}</span>${o.s?`<span class="option-sub">${o.s}</span>`:''}</span>${HCI.tick()}</button>`;
/* multiple choice: toggles, plus one "none" row that clears the others */
const multiRow = (q, o, on) => `<button class="option-row is-compact" aria-pressed="${on?'true':'false'}" data-act="toggle" data-q="${q}" data-v="${o.id}"><span class="icon-tile">${ic(o.ic)}</span><span class="option-text"><span class="option-title">${o.n}</span></span>${HCI.tick()}</button>`;
const noneRow = (q, on, label) => `<button class="option-row is-compact is-none" aria-pressed="${on?'true':'false'}" data-act="none" data-q="${q}"><span class="icon-tile it-plain">${ic('check-circle')}</span><span class="option-text"><span class="option-title">${label}</span></span>${HCI.tick()}</button>`;
const footNext = (ok, label='Next', note='') => `<div class="footbar">${note}<button class="btn btn-primary btn-block" data-act="next" ${ok?'':'disabled'}>${label} ${ic('arrow-right')}</button></div>`;

/* ---------- the eight question screens (read S.a for the current answers) ---------- */
const Q = {
  /* seven tall rows, Hot at the top like a thermometer; the chosen row takes its own step color */
  tsv: () => {
    const v = S.a.tsv, tight = window.innerHeight < 780 ? ' is-tight' : '';
    return qhead('Right now', 'How do you feel right now?', 'Tap the one that fits best.') +
      `<div class="sense-list has-rail${tight}" role="radiogroup" aria-label="How do you feel right now?">` +
      HCI.sense.slice().reverse().map(s => `<button class="sense-row ${s.cls}" role="radio" aria-checked="${v===s.v?'true':'false'}" data-act="pick" data-q="tsv" data-v="${s.v}"><span class="orb">${ic(s.icon)}</span><span class="sense-text"><span class="sense-word">${s.word}</span><span class="sense-desc">${s.desc}</span></span><span class="sense-num" aria-hidden="true">${s.sign}</span><span class="sense-check">${ic('check')}</span></button>`).join('') +
      `</div>` + (S.edit ? '' : `<p class="skip-line">Not home right now? <button class="btn btn-quiet" data-act="nothome">Skip this one</button></p>`);
  },
  clo: () => {
    const ids = S.a.clo || [], last = lastVote();
    const lastBtn = last && last.garments && last.garments.length && !sameSet(last.garments, ids)
      ? `<button class="btn btn-secondary btn-sm" data-act="lastclo">${ic('refresh')}Same as last time</button>` : '';
    const clo = cloOf(ids);
    return qhead('Clothing', 'What are you wearing?', 'Tap everything you have on, blankets too.') +
      `<div class="dress card card-raised"><div class="fig" aria-hidden="true">${avatar(ids)}</div>
        <div class="dress-side"><div class="clo-val" aria-live="polite"><b class="num">${clo.toFixed(2)}</b><span>clo</span><span class="sr-only"> clothing insulation</span></div>
        <p class="caption">${ids.length ? `${ids.length} item${ids.length===1?'':'s'} &middot; insulation of your outfit` : 'Your outfit&rsquo;s insulation adds up here'}</p>${lastBtn}</div></div>` +
      `<div class="ptile-grid cols-3 is-multi garments" role="group" aria-label="Clothing">${GARMENTS.map(g=>`<button class="ptile ptile-sm" aria-pressed="${ids.includes(g.id)?'true':'false'}" data-act="toggle" data-q="clo" data-v="${g.id}"><span class="ptile-art">${ic(g.ic,'ic-lg')}</span><span class="ptile-label">${g.n}</span><span class="ptile-hint">${g.est?'&asymp;':''}${g.clo.toFixed(2)} clo</span>${HCI.tick()}</button>`).join('')}</div>` +
      footNext(ids.length>0, 'Next', `<p class="caption center foot-note" aria-hidden="true">${ids.length ? `${ids.length} item${ids.length===1?'':'s'} &middot; <b class="num">${clo.toFixed(2)}</b> clo` : 'Tap what you&rsquo;re wearing'}</p>`);
  },
  act: () => qhead('Activity', 'What have you been doing for the last 15 minutes?') +
    `<div class="option-grid" role="radiogroup" aria-label="Activity">${ACTS.map(o=>optRow('act',o,S.a.act===o.id,'is-compact')).join('')}</div>`,
  room: () => qhead('Location', 'Which room are you in?') +
    `<div class="option-grid" role="radiogroup" aria-label="Room">${ROOMS.map(o=>optRow('room',o,S.a.room===o.id,'is-compact')).join('')}</div>`,
  air: () => qhead('Air', 'How does the air feel?', 'Around you, right now.') +
    `<div class="option-list" role="radiogroup" aria-label="Air movement">${AIR.map(o=>optRow('air',o,S.a.air===o.id)).join('')}</div>`,
  sun: () => qhead('Sunlight', 'Is the sun shining on you?') +
    `<div class="option-list" role="radiogroup" aria-label="Sunlight">${SUN.map(o=>optRow('sun',o,S.a.sun===o.id)).join('')}</div>`,
  actions: () => {
    const ids = S.a.actions;
    return qhead('Since last time', 'Have you changed anything?', 'Tap all that apply.') +
      `<div class="option-list is-multi" role="group" aria-label="What changed">${ACTIONS.map(o=>multiRow('actions',o,ids&&ids.includes(o.id))).join('')}${noneRow('actions', ids&&ids.length===0, 'Nothing changed')}</div>` + footNext(!!ids);
  },
  notes: () => {
    const ids = S.a.notes;
    return qhead('Anything else', 'Anything worth noting?', 'In the last hour.') +
      `<div class="option-list is-multi" role="group" aria-label="Anything worth noting">${NOTES.map(o=>multiRow('notes',o,ids&&ids.includes(o.id))).join('')}${noneRow('notes', ids&&ids.length===0, 'Nothing to note')}</div>` + footNext(!!ids);
  }
};

/* ---------- sign-up: the home profile (values exactly as in homecomfort-ny/README.md) ---------- */
const GENDERS = [{id:'woman',n:'Woman'},{id:'man',n:'Man'},{id:'non_binary',n:'Non-binary'},{id:'self_describe',n:'Another identity'},{id:'prefer_not',n:'Prefer not to say'}];
const SENSITIVITY = [
  {id:'cold',    n:'Feel the cold easily',   ic:'snow'},
  {id:'average', n:'About average',          ic:'leaf'},
  {id:'warm',    n:'Feel the warmth easily', ic:'sun'}
];
const TENURE = [
  {id:'own',  n:'Own',   h:'I or my family own it'},
  {id:'rent', n:'Rent',  h:'I rent it'},
  {id:'other',n:'Other', h:'e.g. living with family'}
];
const HOME_TYPES = [
  {id:'detached', n:'Detached house', h:'Single-family'},
  {id:'townhouse',n:'Townhouse',      h:'Row house, shared walls'},
  {id:'duplex',   n:'Duplex',         h:'Two-family house'},
  {id:'apartment',n:'Apartment',      h:'or condo'},
  {id:'mobile',   n:'Mobile home',    h:'Manufactured home'},
  {id:'dorm',     n:'Dorm',           h:'Student housing'},
  {id:'other',    n:'Something else', h:'None of these'}
];
const YEAR_BUILT = [
  {id:'pre1940',n:'Before 1940'},{id:'1940_1969',n:'1940–1969'},{id:'1970_1989',n:'1970–1989'},
  {id:'1990_2009',n:'1990–2009'},{id:'2010_plus',n:'2010 or later'},{id:'unsure',n:'Not sure'}
];
const FLOORS = [{id:1,n:'1',h:'floor'},{id:2,n:'2',h:'floors'},{id:3,n:'3',h:'floors'},{id:4,n:'4+',h:'floors'}];
const HEATING = [
  {id:'furnace',   n:'Forced-air furnace'},  {id:'heat_pump', n:'Heat pump'},          {id:'mini_split', n:'Ductless mini-split'},
  {id:'boiler',    n:'Boiler and radiators'},{id:'baseboard', n:'Electric baseboard'}, {id:'stove',      n:'Wood or pellet stove'},
  {id:'other',     n:'Something else'},      {id:'none',      n:'No heating'}
];
const COOLING = [
  {id:'central_ac', n:'Central AC'}, {id:'window_ac', n:'Window units'}, {id:'mini_split', n:'Ductless mini-split'},
  {id:'portable_ac',n:'Portable AC'},{id:'fans',      n:'Fans'},         {id:'none',       n:'No cooling'}
];
const THERMOSTAT = [
  {id:'manual',n:'Manual dial'},{id:'programmable',n:'Programmable'},{id:'smart',n:'Smart (Wi-Fi)'},
  {id:'landlord',n:'My landlord controls it'},{id:'none',n:'No thermostat'}
];
const WINDOWS = [{id:'single',n:'Single pane'},{id:'double',n:'Double pane'},{id:'triple',n:'Triple pane'},{id:'unsure',n:'Not sure'}];
const WINDOWS_OPEN = [{id:'yes',n:'Yes, all of them'},{id:'some',n:'Some of them'},{id:'no',n:'No, none open'}];
const FACING = [
  {id:'N',n:'North'},{id:'NE',n:'Northeast'},{id:'E',n:'East'},{id:'SE',n:'Southeast'},
  {id:'S',n:'South'},{id:'SW',n:'Southwest'},{id:'W',n:'West'},{id:'NW',n:'Northwest'}
];
const DRAFTS = [{id:1,n:'Never drafty'},{id:2,n:'Rarely drafty'},{id:3,n:'Sometimes drafty'},{id:4,n:'Often drafty'},{id:5,n:'Very drafty'}];
