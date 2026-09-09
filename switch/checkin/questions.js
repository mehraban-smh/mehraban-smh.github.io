/* SWITCH comfort check-in - answer options and the question screens. Loaded after icons.js, before app.js. */
const ACTS = [
  {id:'sleep',    n:'Sleeping',             met:0.7, ic:'sleep'},
  {id:'lying',    n:'Lying down',           met:0.8, ic:'lying'},
  {id:'sit',      n:'Sitting relaxed',      met:1.0, ic:'sofa'},
  {id:'desk',     n:'Desk work',            met:1.1, ic:'laptop'},
  {id:'stand',    n:'Standing',             met:1.2, ic:'stand'},
  {id:'house',    n:'Cooking / housework',  met:1.8, ic:'pan'},
  {id:'walk',     n:'Walking about',        met:1.7, ic:'walk'},
  {id:'exercise', n:'Exercising',           met:3.5, ic:'gym'}
];
const ROOMS = [
  {id:'living',n:'Living room',ic:'sofa'},{id:'bedroom',n:'Bedroom',ic:'bed'},{id:'kitchen',n:'Kitchen',ic:'pan'},
  {id:'office',n:'Home office',ic:'laptop'},{id:'bathroom',n:'Bathroom',ic:'drop'},{id:'other',n:'Elsewhere',ic:'door'}
];
const TP  = [{id:'cooler',n:'Cooler',ic:'snow',cls:'cold'},{id:'same',n:'No change',ic:'check'},{id:'warmer',n:'Warmer',ic:'flame',cls:'hot'}];
/* Binary thermal acceptability of the environment as a whole */
const TA  = [
  {id:'acceptable',  n:'Acceptable',     s:'I can stay like this',  ic:'up',   cls:'good'},
  {id:'unacceptable',n:'Not acceptable', s:'I want this to change', ic:'down', cls:'bad'}
];
/* Older check-ins on the phone may still carry the four-point answers */
const TA_OLD = {clearly_acc:'Clearly acceptable', just_acc:'Just acceptable', just_unacc:'Just unacceptable', clearly_unacc:'Clearly unacceptable'};
/* Six-point thermal comfort scale, as in the ASHRAE Global Thermal Comfort Database */
const TC  = [
  {k:1,id:'very_uncomfortable',n:'Very uncomfortable'},{k:2,id:'uncomfortable',n:'Uncomfortable'},{k:3,id:'slightly_uncomfortable',n:'Slightly uncomfortable'},
  {k:4,id:'slightly_comfortable',n:'Slightly comfortable'},{k:5,id:'comfortable',n:'Comfortable'},{k:6,id:'very_comfortable',n:'Very comfortable'}
];
const AIR  = [{id:'still',n:'Still',ic:'still'},{id:'slight',n:'Slight breeze',ic:'slight'},{id:'draughty',n:'Draughty',ic:'draught'}];
const AIRP = [{id:'more',n:'More air',ic:'draught'},{id:'same',n:'Fine as is',ic:'check'},{id:'less',n:'Less air',ic:'still'}];
const HUM  = [{id:'dry',n:'Dry',s:'Dry skin, eyes or throat',ic:'dry'},{id:'ok',n:'Fine',s:'Nothing I notice',ic:'drop'},{id:'muggy',n:'Muggy',s:'Sticky, heavy air',ic:'muggy'}];
const SUN  = [{id:'yes',n:'Sun on me',s:'Direct sunlight where I am',ic:'sun'},{id:'no',n:'No direct sun',s:'Daylight, but not on me',ic:'cloud'},{id:'dark',n:"It's dark",s:'Evening, or curtains drawn',ic:'moon'}];
const ACTIONS = [
  {id:'win_open',n:'Opened a window',ic:'window'},{id:'win_close',n:'Closed a window',ic:'window'},
  {id:'heat_up',n:'Heating up',ic:'radiator'},{id:'heat_down',n:'Heating down / off',ic:'radiator'},
  {id:'fan',n:'Fan on',ic:'fan'},{id:'layer_on',n:'Put on a layer',ic:'layerOn'},{id:'layer_off',n:'Took off a layer',ic:'layerOff'},
  {id:'blanket',n:'Got a blanket',ic:'blanket'},{id:'curtains',n:'Drew the curtains',ic:'curtain'},{id:'moved',n:'Moved room',ic:'door'}
];
const NOTES = [
  {id:'hot_drink',n:'Hot drink',ic:'mug'},{id:'cold_drink',n:'Cold drink',ic:'glass'},{id:'ate',n:'Just ate',ic:'fork'},
  {id:'tired',n:'Tired',ic:'zzz'},{id:'unwell',n:'Feeling unwell',ic:'thermo'}
];
/* Every check-in asks the same twelve questions in the same order. The five CORE answers are the ones
 * "Still the same as last time?" carries over, so that path asks only the other seven (same order). */
const FLOW_ALL = ['tsv','tp','ta','tc','clo','act','room','air','hum','sun','actions','notes'];
const CORE = ['tsv','tp','clo','act','room'];
const byId = (list,id) => list.find(x=>x.id===id);
const tsvWord = v => (TSV.find(t=>t.v===v)||{}).w || '';
const tsvColour = v => `var(--c${v<0?'-'+(-v):v})`;
const signed = v => v>0?'+'+v:String(v);
const garmentNames = ids => (ids||[]).map(id=>byId(GARMENTS,id)?.n).filter(Boolean).join(', ');
const tcWord = k => (TC.find(t=>t.k===k)||{}).n || '';
const taWord = id => byId(TA,id)?.n || TA_OLD[id] || '';
const namesOf = (list, ids) => ids && (ids.length ? ids.map(id=>byId(list,id)?.n).filter(Boolean).join(', ') : 'Nothing');
const sameSet = (a, b) => (a||[]).length===(b||[]).length && (a||[]).every(x=>(b||[]).includes(x));

/* ---------- building blocks ---------- */
const tintCls = o => o.cls ? 'tint t-'+o.cls : '';
const tile = (q, o, on, extra='', cls='') => `<button class="tile ${cls} ${tintCls(o)} ${on?'on':''}" data-act="pick" data-q="${q}" data-v="${o.id}">${ic(o.ic, o.cls||'')}<b>${o.n}</b>${extra}</button>`;
const rowBtn = (q, o, on, inner) => `<button class="row ${on?'on':''}" data-act="pick" data-q="${q}" data-v="${o.id}">${inner}<div><b>${o.n}</b>${o.s?`<span>${o.s}</span>`:''}</div>${ic('chev','go')}</button>`;
const tallRow = (q, o, on) => `<button class="row tall ${tintCls(o)} ${on?'on':''}" data-act="pick" data-q="${q}" data-v="${o.id}"><span class="orb">${ic(o.ic, o.cls||'')}</span><div><b>${o.n}</b>${o.s?`<span>${o.s}</span>`:''}</div></button>`;
const scaleRow = (q, v, faceHtml, label, num, colour, on) => `<button class="srow ${on?'on':''}" style="--sc:${colour}" data-act="pick" data-q="${q}" data-v="${v}" aria-label="${label}"><span class="f">${faceHtml}</span><b>${label}</b><span class="num">${num}</span></button>`;
const multiTile = (q, o, on) => `<button class="tile ${on?'on':''}" data-act="toggle" data-q="${q}" data-v="${o.id}">${ic(o.ic)}<b>${o.n}</b></button>`;
const noneTile = (q, on, label) => `<button class="tile wide ${on?'on':''}" data-act="none" data-q="${q}">${ic('check')}<b>${label}</b></button>`;
const chip = (q, o, on) => `<button class="chip ${on?'on':''}" data-act="toggle" data-q="${q}" data-v="${o.id}">${ic(o.ic)}${o.n}</button>`;
const qhead = (eyebrow, h, p='') => `<div class="q"><div class="eyebrow">${eyebrow}</div><h1>${h}</h1>${p?`<p>${p}</p>`:''}</div>`;
const nextBtn = ok => `<div class="actions"><button class="btn primary" data-act="next" ${ok?'':'disabled'}>Next ${ic('chev')}</button></div>`;

/* ---------- question screens (read S.a for the current answers) ---------- */
const Q = {
  tsv: () => {
    const v = S.a.tsv;
    return qhead('Right now', 'How do you feel?', 'Your thermal sensation right now.') +
      `<div class="scale fill">${TSV.map(t=>scaleRow('tsv', t.v, face(t.v), t.w, signed(t.v), tsvColour(t.v), v===t.v)).join('')}</div>`;
  },
  tp: () => qhead('Preference', 'Would you like to be&hellip;') +
    `<div class="rows fill">${TP.map(o=>tallRow('tp',o,S.a.tp===o.id)).join('')}</div>`,
  clo: () => {
    const ids = S.a.clo || [], last = lastVote();
    const lastBtn = last && last.garments && last.garments.length && !sameSet(last.garments, ids)
      ? `<button class="chip" data-act="lastclo">${ic('refresh')}Same as last time</button>` : '';
    return qhead('Clothing', 'What are you wearing?', 'Tap everything that applies.') +
      `<div class="dressing">${avatar(ids)}<div class="side"><div class="clo"><b>${cloOf(ids).toFixed(2)}</b><span>clo insulation</span></div>${lastBtn}<p class="note">Values follow ASHRAE 55. Blanket and duvet are estimates.</p></div></div>` +
      `<div class="garments fill">${GARMENTS.map(g=>`<button class="gt ${ids.includes(g.id)?'on':''}" data-act="toggle" data-q="clo" data-v="${g.id}">${ic(g.ic)}<b>${g.n}</b><small>${g.est?'&asymp;':''}${g.clo.toFixed(2)}</small></button>`).join('')}</div>` +
      nextBtn(ids.length>0);
  },
  act: () => qhead('Activity', 'What have you been doing for the last 15 minutes?') +
    `<div class="tiles c2 fill">${ACTS.map(o=>tile('act',o,S.a.act===o.id,`<small>${o.met.toFixed(1)} met</small>`)).join('')}</div>`,
  room: () => qhead('Location', 'Which room are you in?', 'The sensor is in the living room, so this matters.') +
    `<div class="tiles c2 fill">${ROOMS.map(o=>tile('room',o,S.a.room===o.id)).join('')}</div>`,
  /* two tall rows (like the preference screen), tinted green and red, rather than two very tall tiles */
  ta: () => qhead('Acceptability', 'Are these conditions acceptable to you?', 'The thermal environment as a whole.') +
    `<div class="rows fill">${TA.map(o=>tallRow('ta',o,S.a.ta===o.id)).join('')}</div>`,
  tc: () => {
    const k = S.a.tc;
    return qhead('Comfort', 'How comfortable are you overall?', 'Six-point thermal comfort scale.') +
      `<div class="scale fill">${TC.map(t=>scaleRow('tc', t.k, comfortFace(t.k), t.n, t.k, `var(--k${t.k})`, k===t.k)).join('')}</div>`;
  },
  air: () => qhead('Air', 'How is the air movement?') +
    `<div class="duo fill"><div class="grp"><div class="lab">It feels&hellip;</div><div class="tiles c3 fill">${AIR.map(o=>tile('air',o,S.a.air===o.id)).join('')}</div></div>` +
    `<div class="grp"><div class="lab">And I would like&hellip;</div><div class="tiles c3 fill">${AIRP.map(o=>tile('air_pref',o,S.a.air_pref===o.id)).join('')}</div></div></div>`,
  hum: () => qhead('Humidity', 'Does the air feel dry or muggy?') +
    `<div class="rows fill">${HUM.map(o=>tallRow('hum',o,S.a.hum===o.id)).join('')}</div>`,
  sun: () => qhead('Sunlight', 'Is the sun shining on you?') +
    `<div class="rows fill">${SUN.map(o=>tallRow('sun',o,S.a.sun===o.id)).join('')}</div>`,
  actions: () => {
    const ids = S.a.actions;
    return qhead('Since last time', 'Have you changed anything?', 'Tap all that apply.') +
      `<div class="tiles c2 fill multi">${ACTIONS.map(o=>multiTile('actions',o,ids&&ids.includes(o.id))).join('')}${noneTile('actions', ids&&ids.length===0, 'Nothing changed')}</div>` + nextBtn(!!ids);
  },
  notes: () => {
    const ids = S.a.notes;
    return qhead('Anything else', 'Anything worth noting?', 'In the last hour.') +
      `<div class="tiles c2 fill multi">${NOTES.map(o=>multiTile('notes',o,ids&&ids.includes(o.id))).join('')}${noneTile('notes', ids&&ids.length===0, 'Nothing to note')}</div>` + nextBtn(!!ids);
  }
};
