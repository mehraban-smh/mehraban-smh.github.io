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
const TA  = [
  {id:'clearly_acc',n:'Clearly acceptable',s:'Happy to stay like this',ic:'up',cls:'good'},
  {id:'just_acc',n:'Just acceptable',s:'Fine, but only just',ic:'up',cls:''},
  {id:'just_unacc',n:'Just unacceptable',s:'Starting to bother me',ic:'down',cls:''},
  {id:'clearly_unacc',n:'Clearly unacceptable',s:'I want this to change',ic:'down',cls:'bad'}
];
/* Six-point thermal comfort scale, as in the ASHRAE Global Thermal Comfort Database */
const TC  = [
  {k:1,id:'very_uncomfortable',n:'Very uncomfortable'},{k:2,id:'uncomfortable',n:'Uncomfortable'},{k:3,id:'slightly_uncomfortable',n:'Slightly uncomfortable'},
  {k:4,id:'slightly_comfortable',n:'Slightly comfortable'},{k:5,id:'comfortable',n:'Comfortable'},{k:6,id:'very_comfortable',n:'Very comfortable'}
];
const AIR  = [{id:'still',n:'Still',ic:'still'},{id:'slight',n:'Slight breeze',ic:'slight'},{id:'draughty',n:'Draughty',ic:'draught'}];
const AIRP = [{id:'more',n:'More air',ic:'draught'},{id:'same',n:'Fine as is',ic:'check'},{id:'less',n:'Less air',ic:'still'}];
const HUM  = [{id:'dry',n:'Dry',ic:'dry'},{id:'ok',n:'Fine',ic:'drop'},{id:'muggy',n:'Muggy',ic:'muggy'}];
const SUN  = [{id:'yes',n:'Sun on me',ic:'sun'},{id:'no',n:'No direct sun',ic:'cloud'},{id:'dark',n:"It's dark",ic:'moon'}];
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
const CORE = ['tsv','tp','clo','act','room'];
const EXT_A = ['ta','tc','actions'];
const EXT_B = ['air','hum','sun','notes'];
const byId = (list,id) => list.find(x=>x.id===id);
const tsvWord = v => (TSV.find(t=>t.v===v)||{}).w || '';
const signed = v => v>0?'+'+v:String(v);
const garmentNames = ids => (ids||[]).map(id=>byId(GARMENTS,id)?.n).filter(Boolean).join(', ');
const tcWord = k => (TC.find(t=>t.k===k)||{}).n || '';

/* ---------- building blocks ---------- */
const tile = (q, o, on, extra='') => `<button class="tile ${on?'on':''}" data-act="pick" data-q="${q}" data-v="${o.id}">${ic(o.ic, o.cls||'')}<b>${o.n}</b>${extra}</button>`;
const rowBtn = (q, o, on, inner) => `<button class="row ${on?'on':''}" data-act="pick" data-q="${q}" data-v="${o.id}">${inner}<div><b>${o.n}</b>${o.s?`<span>${o.s}</span>`:''}</div>${ic('chev','go')}</button>`;
const chip = (q, o, on) => `<button class="chip ${on?'on':''}" data-act="toggle" data-q="${q}" data-v="${o.id}">${ic(o.ic)}${o.n}</button>`;
const qhead = (eyebrow, h, p='') => `<div class="q"><div class="eyebrow">${eyebrow}</div><h1>${h}</h1>${p?`<p>${p}</p>`:''}</div>`;
const nextBtn = ok => `<div class="actions"><button class="btn primary" data-act="next" ${ok?'':'disabled'}>Next ${ic('chev')}</button></div>`;

/* ---------- question screens (read S.a for the current answers) ---------- */
const Q = {
  tsv: () => {
    const v = S.a.tsv, has = typeof v==='number';
    return qhead('Right now', 'How do you feel, temperature-wise?', 'Just how it feels, not what you would prefer.') +
      `<div class="strip">${TSV.map(t=>`<button class="face ${has&&v===t.v?'on':''}" data-act="pick" data-q="tsv" data-v="${t.v}" aria-label="${t.w}">${face(t.v)}<b>${signed(t.v)}</b></button>`).join('')}</div>` +
      `<div class="readout ${has?'':'empty'}">${has ? face(v)+`<div><b>${tsvWord(v)}</b><span>Thermal sensation ${signed(v)}</span></div>` : 'Tap a face'}</div>`;
  },
  tp: () => qhead('Preference', 'Would you like to be&hellip;') +
    `<div class="tiles c3">${TP.map(o=>tile('tp',o,S.a.tp===o.id)).join('')}</div>`,
  clo: () => {
    const ids = S.a.clo || [];
    return qhead('Clothing', 'What are you wearing?', 'Tap everything that applies, or start from a preset.') +
      `<div class="dressing">${avatar(ids)}<div class="side"><div class="clo"><b>${cloOf(ids).toFixed(2)}</b><span>clo insulation</span></div>` +
      `<div class="presets">${PRESETS.map((p,i)=>`<button class="chip ${p.g.length===ids.length&&p.g.every(g=>ids.includes(g))?'on':''}" data-act="preset" data-i="${i}">${p.n}</button>`).join('')}</div></div></div>` +
      `<div class="garments">${GARMENTS.map(g=>`<button class="gt ${ids.includes(g.id)?'on':''}" data-act="toggle" data-q="clo" data-v="${g.id}">${ic(g.ic)}<b>${g.n}</b><small>${g.est?'&asymp;':''}${g.clo.toFixed(2)}</small></button>`).join('')}</div>` +
      `<p class="note">Insulation values follow ASHRAE 55. Blanket and duvet are estimates.</p>` + nextBtn(ids.length>0);
  },
  act: () => qhead('Activity', 'What have you been doing for the last 15 minutes?') +
    `<div class="tiles c2 compact">${ACTS.map(o=>tile('act',o,S.a.act===o.id,`<small>${o.met.toFixed(1)} met</small>`)).join('')}</div>`,
  room: () => qhead('Location', 'Which room are you in?', 'The sensor is in the living room, so this matters.') +
    `<div class="tiles c3 compact">${ROOMS.map(o=>tile('room',o,S.a.room===o.id)).join('')}</div>`,
  ta: () => qhead('Acceptability', 'Is the temperature acceptable to you?') +
    `<div class="rows">${TA.map(o=>rowBtn('ta',o,S.a.ta===o.id, ic(o.ic,o.cls))).join('')}</div>`,
  tc: () => {
    const k = S.a.tc, has = typeof k==='number';
    return qhead('Comfort', 'How comfortable are you overall?', 'Six-point thermal comfort scale.') +
      `<div class="strip six">${TC.map(t=>`<button class="face ${has&&k===t.k?'on':''}" data-act="pick" data-q="tc" data-v="${t.k}" aria-label="${t.n}">${comfortFace(t.k)}<b>${t.k}</b></button>`).join('')}</div>` +
      `<div class="readout ${has?'':'empty'}">${has ? comfortFace(k)+`<div><b>${tcWord(k)}</b><span>Comfort ${k} of 6</span></div>` : 'Tap a face'}</div>`;
  },
  air: () => qhead('Air', 'How is the air movement?') +
    `<div class="duo"><div><div class="lab">It feels&hellip;</div><div class="tiles c3 compact">${AIR.map(o=>tile('air',o,S.a.air===o.id)).join('')}</div></div>` +
    `<div><div class="lab">And I would like&hellip;</div><div class="tiles c3 compact">${AIRP.map(o=>tile('air_pref',o,S.a.air_pref===o.id)).join('')}</div></div></div>`,
  hum: () => qhead('Humidity', 'Does the air feel dry or muggy?') +
    `<div class="tiles c3">${HUM.map(o=>tile('hum',o,S.a.hum===o.id)).join('')}</div>`,
  sun: () => qhead('Sunlight', 'Is the sun shining on you?') +
    `<div class="tiles c3">${SUN.map(o=>tile('sun',o,S.a.sun===o.id)).join('')}</div>`,
  actions: () => {
    const ids = S.a.actions;
    return qhead('Since last time', 'Have you changed anything?', 'Tap all that apply.') +
      `<div class="chips">${ACTIONS.map(o=>chip('actions',o,ids&&ids.includes(o.id))).join('')}<button class="chip ghost ${ids&&ids.length===0?'on':''}" data-act="none" data-q="actions">${ic('check')}Nothing changed</button></div>` + nextBtn(!!ids);
  },
  notes: () => {
    const ids = S.a.notes;
    return qhead('Anything else', 'Anything worth noting?', 'In the last half hour.') +
      `<div class="chips">${NOTES.map(o=>chip('notes',o,ids&&ids.includes(o.id))).join('')}<button class="chip ghost ${ids&&ids.length===0?'on':''}" data-act="none" data-q="notes">${ic('check')}Nothing to note</button></div>` + nextBtn(!!ids);
  }
};
