/* HomePulse (SWITCH home comfort study) - answer options, the check-in question screens and the option lists of
 * the join wizard. Loaded after icons.js, before app.js; the screens read app.js's S (the answers being
 * built), lastVote() and homeProfile() when they are drawn.
 *
 * Stored ids (what the database and the dashboard see) never change once used; labels may. */

/* ---------- the check-in ---------- */
const ACTS = [
  {id:'sleep',    n:'Sleeping',             met:0.7, ic:'sleep'},
  {id:'lying',    n:'Lying down',           met:0.8, ic:'lying'},
  {id:'sit',      n:'Sitting relaxed',      met:1.0, ic:'actSit'},
  {id:'desk',     n:'Desk work',            met:1.1, ic:'actDesk'},
  {id:'stand',    n:'Standing',             met:1.2, ic:'stand'},
  {id:'house',    n:'Cooking / housework',  met:1.8, ic:'pan'},
  {id:'walk',     n:'Walking about',        met:1.7, ic:'walk'},
  {id:'exercise', n:'Exercising',           met:3.5, ic:'gym'}
];
/* The living room and the bedroom come first, as two large tiles: most check-ins are made in one of them. */
const ROOMS = [
  {id:'living',n:'Living room',ic:'sofa',main:true},{id:'bedroom',n:'Bedroom',ic:'bed',main:true},{id:'kitchen',n:'Kitchen',ic:'pan'},
  {id:'office',n:'Home office',ic:'laptop'},{id:'bathroom',n:'Bathroom',ic:'bath'},{id:'other',n:'Elsewhere',ic:'door'}
];
const TP  = [{id:'cooler',n:'Cooler',ic:'snow',cls:'cold'},{id:'same',n:'No change',ic:'check'},{id:'warmer',n:'Warmer',ic:'flame',cls:'hot'}];
/* Binary thermal acceptability of the environment as a whole */
const TA  = [
  {id:'acceptable',  n:'Acceptable',     s:'I can stay like this',  ic:'up',   cls:'good'},
  {id:'unacceptable',n:'Not acceptable', s:'I want this to change', ic:'down', cls:'bad'}
];
/* Older check-ins (before 0.4.0) may still carry the four-point answers */
const TA_OLD = {clearly_acc:'Clearly acceptable', just_acc:'Just acceptable', just_unacc:'Just unacceptable', clearly_unacc:'Clearly unacceptable'};
/* Air movement in everyday words; n and s are what the question shows, k the short form in summaries. */
const AIR  = [
  {id:'still',   n:'No, the air feels still', s:'I can&rsquo;t feel any air moving',            k:'Still air',          ic:'still'},
  {id:'slight',  n:'Yes, a little',           s:'I can just feel a gentle flow of air',        k:'A little air moving', ic:'slight'},
  {id:'draughty',n:'Yes, clearly',            s:'I can clearly feel air moving, or a draught', k:'Draughty',            ic:'draught'}
];
const SUN  = [{id:'yes',n:'Sun on me',s:'Direct sunlight where I am',ic:'sun'},{id:'no',n:'No direct sun',s:'Daylight, but not on me',ic:'cloud'},{id:'dark',n:"It's dark",s:'Evening, or curtains drawn',ic:'moon'}];
/* the heating, right now (new in 1.0) */
const HEAT = [
  {id:'on',     n:'Yes, it&rsquo;s on',  k:'Heating on',  ic:'flame',    cls:'hot'},
  {id:'off',    n:'No, it&rsquo;s off',  k:'Heating off', ic:'flameOff'},
  {id:'unsure', n:'Not sure',            k:'Not sure if the heating is on', ic:'help'}
];
/* "Always on" (a thermostat switching it) comes first; "less than 30 minutes" (lt30) is no longer offered, its words
 * stay in HEAT_FOR_OLD for older check-ins. art: the picture key (icons.js), fb the icon until it is drawn. */
const HEAT_FOR = [
  {id:'always', n:'It&rsquo;s always on', h:'The thermostat switches it on and off', k:'Always on (thermostat)', art:'heat_for:always', fb:'stat'},
  {id:'30_60',  n:'30 minutes to an hour', art:'heat_for:30_60', fb:'clock'},
  {id:'1_2h',   n:'1 to 2 hours',          art:'heat_for:1_2h',  fb:'clock'},
  {id:'2_4h',   n:'2 to 4 hours',          art:'heat_for:2_4h',  fb:'clock'},
  {id:'gt4h',   n:'More than 4 hours',     art:'heat_for:gt4h',  fb:'clock'},
  {id:'unsure', n:'Not sure',              art:'heat_for:unsure', fb:'help'}
];
const HEAT_FOR_OLD = { lt30:'Less than 30 minutes' };
const heatForWord = id => { const o = HEAT_FOR.find(x => x.id === id); return o ? (o.k || o.n) : HEAT_FOR_OLD[id] || ''; };
/* the nearest outside wall, felt with the back of the hand */
const WALL = [
  {id:'no_reach', n:'I can&rsquo;t reach one', ic:'wallFar'},
  {id:'cold',     n:'Cold',                  ic:'wallCold',    cls:'cold'},
  {id:'cool',     n:'Cool',                  ic:'wallCool',    cls:'cool'},
  {id:'neutral',  n:'Neither cold nor warm', ic:'wallNeutral', cls:'mild'},
  {id:'warm',     n:'Warm',                  ic:'wallWarm',    cls:'hot'}
];
/* What the participant DID in the last 30 minutes (not how things are now). Shown as boxes (window, door,
 * heating, clothes and blankets) and rows on their own; within a box the two sides of a pair exclude each
 * other. q is the wording on the question screen ("I ..."), n the name in summaries. */
const ACTIONS = [
  {id:'win_open',  n:'Opened a window', q:'I opened a window',  ic:'windowOpen'}, {id:'win_close',  n:'Closed a window', q:'I closed a window', ic:'window'},
  {id:'door_open', n:'Opened a door',   q:'I opened a door',    ic:'doorOpen'},   {id:'door_close', n:'Closed a door',   q:'I closed a door',   ic:'door'},
  {id:'heat_up',   n:'Turned the heating up', q:'I turned the heating up', ic:'heatUp'}, {id:'heat_down', n:'Turned the heating down or off', q:'I turned the heating down or off', ic:'heatDown'},
  {id:'layer_on',  n:'Put on a layer',  q:'I put on a layer',   ic:'layerOn'}, {id:'layer_off', n:'Took off a layer', q:'I took off a layer', ic:'layerOff'}, {id:'blanket', n:'Got a blanket', q:'I got a blanket', ic:'blanket'},
  {id:'fan',       n:'Turned a fan on', q:'I turned a fan on',  ic:'fan'},
  {id:'curtains',  n:'Drew the curtains or blinds', q:'I drew the curtains or blinds', ic:'curtain'},
  {id:'moved',     n:'Moved to another room', q:'I moved to another room', ic:'walk'}
];
const ACTION_BOXES = [
  {n:'Window',               ic:'window',   ids:['win_open','win_close']},
  {n:'Door',                 ic:'door',     ids:['door_open','door_close']},
  {n:'Heating',              ic:'radiator', ids:['heat_up','heat_down']},
  {n:'Clothes and blankets', ic:'layerOn',  ids:['layer_on','layer_off','blanket']}
];
const ACTION_SOLO = ['fan','curtains','moved'];
const PAIRED = { win_open:'win_close', win_close:'win_open', door_open:'door_close', door_close:'door_open', heat_up:'heat_down', heat_down:'heat_up', layer_on:'layer_off', layer_off:'layer_on' };
/* Also the last 30 minutes: drinks and food in boxes, two rows on their own (any number may be chosen). */
const NOTES = [
  {id:'hot_drink',n:'Hot drink',q:'I had a hot drink',ic:'mug'}, {id:'cold_drink',n:'Cold drink',q:'I had a cold drink',ic:'glass'},
  {id:'ate',n:'Ate something',q:'I ate something',ic:'fork'}, {id:'hungry',n:'Felt hungry',q:'I felt hungry',ic:'apple'},
  {id:'tired',n:'Felt tired',q:'I felt tired',ic:'zzz'}, {id:'unwell',n:'Felt unwell',q:'I felt unwell',ic:'unwell'}
];
const NOTE_BOXES = [{n:'Drinks', ic:'mug', ids:['hot_drink','cold_drink']}, {n:'Food', ic:'fork', ids:['ate','hungry']}];
const NOTE_SOLO = ['tired','unwell'];

/* Every check-in asks these, in this order, all unanswered at the start. Two are asked only sometimes: which
 * heating (heat_src) and for how long (heat_for) only when the heating is on, and which heating only when the
 * home has more than one system (with exactly one it is filled in by itself). The thermostat reading of 1.0 is
 * no longer asked (stat_temp_c is sent as null; older check-ins still show theirs). */
const FLOW_ALL = ['tsv','tp','ta','clo','act','room','air','sun','heat','heat_src','heat_for','wall','actions','notes'];
function flowFor(a, home){
  return FLOW_ALL.filter(q => q==='heat_src' ? a.heat==='on' && heatChoices(home).length > 1
    : q==='heat_for' ? a.heat==='on'
    : true);
}
const QNAME = { tsv:'how you feel', tp:'your preference', ta:'acceptability', clo:'clothing', act:'activity', room:'room', air:'air movement', sun:'sunlight',
  heat:'the heating', heat_src:'which heating', heat_for:'how long it has been on', wall:'the wall', actions:'what you did', notes:'what you had or felt' };
const byId = (list,id) => list.find(x=>x.id===id);
const tsvWord = v => (TSV.find(t=>t.v===v)||{}).w || '';
const tsvColour = v => `var(--c${v<0?'-'+(-v):v})`;
const signed = v => v>0?'+'+v:String(v);
const garmentNames = ids => (ids||[]).map(id=>byId(GARMENTS,id)?.n).filter(Boolean).join(', ');
const taWord = id => byId(TA,id)?.n || TA_OLD[id] || '';
const namesOf = (list, ids) => ids && (ids.length ? ids.map(id=>byId(list,id)?.n).filter(Boolean).join(', ') : 'Nothing');
const sameSet = (a, b) => (a||[]).length===(b||[]).length && (a||[]).every(x=>(b||[]).includes(x));
/* the heating systems of the home profile, as check-in answers: the main heating and every other heater */
function heatChoices(home){
  const h = home || {}, out = [];
  const main = byId(MAIN_HEATING, h.main_heating);
  if(main && !['none','unsure'].includes(main.id)) out.push({ id:main.id, n:main.k || main.n, art:'heat:'+main.id });
  (Array.isArray(h.other_heaters) ? h.other_heaters : []).forEach(id => { const o = byId(OTHER_HEATERS, id); if(o && id !== 'none') out.push({ id, n:o.k || o.n, art:'other:'+id }); });
  return out;
}
const HEAT_OTHER = {id:'other', n:'Something else', art:'unsure'};
const heatSrcName = id => (byId(MAIN_HEATING, id) || byId(OTHER_HEATERS, id) || (id === 'other' ? HEAT_OTHER : {}));
const heatSrcWord = ids => (ids||[]).map(id => { const o = heatSrcName(id); return o.k || o.n; }).filter(Boolean).join(', ');
/* a picture that may not be drawn yet: the art (or icon) key when icons.js has it, else the fallback icon */
const artx = (key, fb, cls='') => (typeof ART === 'object' && ART[key]) ? art(key, cls) : ic(fb, cls);
const icx = (key, fb, cls='') => (typeof P === 'object' && P[key]) ? ic(key, cls) : ic(fb, cls);
const statWord = v => typeof v === 'number' ? v.toFixed(1) + '&nbsp;&deg;C' : '';

/* ---------- building blocks ---------- */
const tintCls = o => o.cls ? 'tint t-'+o.cls : '';
const tile = (q, o, on, extra='', cls='') => `<button class="tile ${cls} ${tintCls(o)} ${on?'on':''}" role="radio" aria-checked="${on}" data-act="pick" data-q="${q}" data-v="${o.id}">${ic(o.ic, o.cls||'')}<b>${o.n}</b>${extra}</button>`;
const tallRow = (q, o, on) => `<button class="row tall ${tintCls(o)} ${on?'on':''}" role="radio" aria-checked="${on}" data-act="pick" data-q="${q}" data-v="${o.id}"><span class="orb">${ic(o.ic, o.cls||'')}</span><div><b>${o.n}</b>${o.s?`<span>${o.s}</span>`:''}</div></button>`;
const scaleRow = (q, v, faceHtml, label, num, colour, on) => `<button class="srow ${on?'on':''}" role="radio" aria-checked="${on}" style="--sc:${colour}" data-act="pick" data-q="${q}" data-v="${v}" aria-label="${label}"><span class="f">${faceHtml}</span><b>${label}</b><span class="num">${num}</span></button>`;
/* multiple choice: a row that toggles, and the one "none" row that clears the others */
const multiRow = (q, o, on) => `<button class="row mrow ${on?'on':''}" aria-pressed="${!!on}" data-act="toggle" data-q="${q}" data-v="${o.id}">${ic(o.ic)}<div><b>${o.q || o.n}</b></div><span class="tick">${ic('check')}</span></button>`;
const noneRow = (q, on, label) => `<button class="row mrow none ${on?'on':''}" aria-pressed="${!!on}" data-act="none" data-q="${q}">${ic('checkc')}<div><b>${label}</b></div><span class="tick">${ic('check')}</span></button>`;
/* a box of related answers (the window, the door, drinks...): one tile per answer, each with its own tick */
const answerBox = (q, list, box, on) => `<fieldset class="abox"><legend>${ic(box.ic)}${box.n}</legend><div class="abox-opts c${box.ids.length}">${box.ids.map(id => { const o = byId(list, id);
  return `<button class="aopt ${on(id)?'on':''}" type="button" aria-pressed="${on(id)}" data-act="toggle" data-q="${q}" data-v="${id}">${ic(o.ic)}<b>${o.q || o.n}</b><span class="tick">${ic('check')}</span></button>`; }).join('')}</div></fieldset>`;
/* one box of garments, each a tile with its clo value */
const gbox = (grp, ids) => { const n = grp.ids.filter(id => ids.includes(id)).length;
  return `<fieldset class="abox gbox"><legend>${ic(grp.ic)}${grp.n}${n ? `<span class="cnt">${n}</span>` : ''}</legend><div class="gtiles c${grp.ids.length}">${grp.ids.map(id => { const g = byId(GARMENTS, id);
    return `<button class="gt ${ids.includes(g.id)?'on':''}" aria-pressed="${ids.includes(g.id)}" data-act="toggle" data-q="clo" data-v="${g.id}">${ic(g.ic)}<b>${g.s || g.n}</b><small>${g.est?'&asymp;':''}${g.clo.toFixed(2)}</small></button>`; }).join('')}</div></fieldset>`; };
const qhead = (eyebrow, h, p='') => `<div class="q"><div class="eyebrow">${eyebrow}</div><h1 tabindex="-1">${h}</h1>${p?`<p>${p}</p>`:''}</div>`;
const nextBtn = (ok, label='Next') => `<div class="actions"><button class="btn primary" data-act="next" ${ok?'':'disabled'}>${label} ${ic('chev')}</button></div>`;

/* ---------- the question screens (read S.a for the current answers) ---------- */
const Q = {
  tsv: () => {
    const v = S.a.tsv;
    return qhead('Right now', 'How do you feel right now?', 'Your thermal sensation, all over.') +
      `<div class="scale fill" role="radiogroup" aria-label="How do you feel right now?">${TSV.map(t=>scaleRow('tsv', t.v, face(t.v), t.w, signed(t.v), tsvColour(t.v), v===t.v)).join('')}</div>` +
      (S.edit ? '' : `<p class="skip">Not home right now? <button class="btn-link" data-act="nothome">Skip this one</button></p>`);
  },
  tp: () => qhead('Preference', 'Would you like to be&hellip;') +
    `<div class="rows fill" role="radiogroup" aria-label="Would you like to be">${TP.map(o=>tallRow('tp',o,S.a.tp===o.id)).join('')}</div>`,
  /* two tall rows (like the preference screen), tinted green and red */
  ta: () => qhead('Acceptability', 'Are these conditions acceptable to you?', 'The thermal environment as a whole.') +
    `<div class="rows fill" role="radiogroup" aria-label="Acceptability">${TA.map(o=>tallRow('ta',o,S.a.ta===o.id)).join('')}</div>`,
  clo: () => {
    const ids = S.a.clo || [], last = lastVote();
    const lastIds = last && (last.garments || []).filter(id => byId(GARMENTS, id));
    const lastBtn = lastIds && lastIds.length && !sameSet(lastIds, ids)
      ? `<button class="chip" data-act="lastclo">${ic('refresh')}Same as last time</button>` : '';
    const pair = k => `<div class="gpair">${GARMENT_GROUPS.filter(g => g.pair === k).map(g => gbox(g, ids)).join('')}</div>`;
    return qhead('Clothing', 'What are you wearing?', 'Tap everything you have on, blankets too.') +
      `<div class="dressing">${avatar(ids)}<div class="side"><div class="clo" aria-live="polite"><b>${cloOf(ids).toFixed(2)}</b><span>clo insulation</span></div>${lastBtn}<p class="note">Values follow ASHRAE 55 and ISO 7730. Blanket and duvet are estimates.</p></div></div>` +
      `<div class="gboxes">${gbox(GARMENT_GROUPS[0], ids)}${gbox(GARMENT_GROUPS[1], ids)}${pair(1)}${pair(2)}</div>` +
      nextBtn(ids.length>0);
  },
  act: () => qhead('Activity', 'What have you been doing for the last 15 minutes?') +
    `<div class="tiles c2 fill" role="radiogroup" aria-label="Activity">${ACTS.map(o=>tile('act',o,S.a.act===o.id,`<small>${o.met.toFixed(1)} met</small>`)).join('')}</div>`,
  room: () => qhead('Location', 'Which room are you in?', 'The study&rsquo;s sensors are in your living room and, in some homes, your bedroom, so this matters.') +
    `<div class="room fill" role="radiogroup" aria-label="Room"><div class="tiles c2 big">${ROOMS.filter(o => o.main).map(o=>tile('room',o,S.a.room===o.id,'','big')).join('')}</div>
      <div class="tiles c2 small">${ROOMS.filter(o => !o.main).map(o=>tile('room',o,S.a.room===o.id,'','wide')).join('')}</div></div>`,
  air: () => qhead('Air movement', 'Can you feel air moving around you?', 'Like air from a window, a door, a vent or a fan. Not how warm or cool it is, only whether the air moves.') +
    `<div class="rows fill" role="radiogroup" aria-label="Air movement">${AIR.map(o=>tallRow('air',o,S.a.air===o.id)).join('')}</div>`,
  sun: () => qhead('Sunlight', 'Is the sun shining on you?') +
    `<div class="rows fill" role="radiogroup" aria-label="Sunlight">${SUN.map(o=>tallRow('sun',o,S.a.sun===o.id)).join('')}</div>`,
  heat: () => qhead('Heating', 'Is your heating on right now?', 'Any heating in your home: the central heating or a heater.') +
    `<div class="rows fill" role="radiogroup" aria-label="Is your heating on right now?">${HEAT.map(o=>tallRow('heat',o,S.a.heat===o.id)).join('')}</div>`,
  heat_src: () => {
    const ids = S.a.heat_src || [], list = heatChoices(homeProfile()).concat([HEAT_OTHER]);
    return qhead('Heating', 'Which heating is on?', 'Tap all that are on.') +
      `<div class="ptiles c2 fill" role="group" aria-label="Which heating is on">${list.map(o => `<button class="ptile ${ids.includes(o.id)?'on':''}" aria-pressed="${ids.includes(o.id)}" data-act="toggle" data-q="heat_src" data-v="${o.id}"><span class="pt-art">${art(o.art)}</span><b>${o.n}</b><span class="tick">${ic('check')}</span></button>`).join('')}</div>` +
      nextBtn(ids.length > 0);
  },
  heat_for: () => qhead('Heating', 'How long has it been on?', 'Since it last came on.') +
    `<div class="tiles c2 fill" role="radiogroup" aria-label="How long has the heating been on">${HEAT_FOR.map(o => `<button class="tile txt ${o.h ? 'wide2' : ''} ${S.a.heat_for===o.id?'on':''}" role="radio" aria-checked="${S.a.heat_for===o.id}" data-act="pick" data-q="heat_for" data-v="${o.id}">${artx(o.art, o.fb)}<span class="tt"><b>${o.n}</b>${o.h ? `<small>${o.h}</small>` : ''}</span></button>`).join('')}</div>`,
  wall: () => qhead('Outside wall', 'Touch the nearest outside wall with the back of your hand. How does it feel?', 'An outside wall has the outdoors on the other side.') +
    `<div class="rows fill" role="radiogroup" aria-label="How the outside wall feels">${WALL.map(o=>tallRow('wall',o,S.a.wall===o.id)).join('')}</div>`,
  actions: () => {
    const ids = S.a.actions, on = id => !!(ids && ids.includes(id));
    return qhead('Last 30 minutes', 'In the last 30 minutes, did you do any of these?', 'Only things you <b>did</b>, not how things are now. Tap all that apply.') +
      `<div class="aboxes" role="group" aria-label="What you did in the last 30 minutes">${ACTION_BOXES.map(b => answerBox('actions', ACTIONS, b, on)).join('')}
        <div class="rows">${ACTION_SOLO.map(id => multiRow('actions', byId(ACTIONS, id), on(id))).join('')}${noneRow('actions', ids&&ids.length===0, 'I didn&rsquo;t do any of these')}</div></div>` + nextBtn(!!ids);
  },
  notes: () => {
    const ids = S.a.notes, on = id => !!(ids && ids.includes(id));
    return qhead('Last 30 minutes', 'In the last 30 minutes, did you have or feel any of these?', 'Tap all that apply.') +
      `<div class="aboxes" role="group" aria-label="What you had or felt in the last 30 minutes">${NOTE_BOXES.map(b => answerBox('notes', NOTES, b, on)).join('')}
        <div class="rows">${NOTE_SOLO.map(id => multiRow('notes', byId(NOTES, id), on(id))).join('')}${noneRow('notes', ids&&ids.length===0, 'None of these')}</div></div>` + nextBtn(!!ids);
  }
};

/* ---------- the join wizard: the participant and their home (UK and Wales) ----------
 * Every value is stored as listed (participants columns, or participants.home). Labels n, hints h; k is a
 * shorter name where one is shown in a summary. */
const GENDERS = [{id:'woman',n:'Woman'},{id:'man',n:'Man'},{id:'non_binary',n:'Non-binary'},{id:'self_describe',n:'Another identity'},{id:'prefer_not',n:'Prefer not to say'}];
const SENSITIVITY = [
  {id:'cold',    n:'I feel the cold easily',  ic:'snow', cls:'cold'},
  {id:'average', n:'I&rsquo;m about average', ic:'leaf'},
  {id:'warm',    n:'I feel the heat easily',  ic:'sun',  cls:'hot'}
];
const HOME_TYPES = [
  {id:'detached',    n:'Detached'}, {id:'semi', n:'Semi-detached'}, {id:'end_terrace', n:'End of terrace'},
  {id:'mid_terrace', n:'Terraced', h:'Mid-terrace'}, {id:'bungalow', n:'Bungalow'}, {id:'flat', n:'Flat or maisonette'}
];
const FLAT_POS = [{id:'basement',n:'Basement'},{id:'ground',n:'Ground floor'},{id:'middle',n:'A middle floor'},{id:'top',n:'Top floor'}];
const TENURE = [
  {id:'own',                 n:'I own it',                       h:'Outright or with a mortgage'},
  {id:'housing_association', n:'Rent from a housing association'},
  {id:'council',             n:'Rent from the council'},
  {id:'private_rent',        n:'Rent privately'},
  {id:'shared_ownership',    n:'Shared ownership'},
  {id:'other',               n:'Something else',                 h:'e.g. living with family'}
];
const YEAR_BUILT = [
  {id:'pre1919',n:'Before 1919'},{id:'1919_1944',n:'1919–1944'},{id:'1945_1964',n:'1945–1964'},{id:'1965_1982',n:'1965–1982'},
  {id:'1983_2002',n:'1983–2002'},{id:'2003_plus',n:'2003 or later'},{id:'unsure',n:'Not sure'}
];
const FLOORS = [{id:1,n:'1',h:'floor'},{id:2,n:'2',h:'floors'},{id:3,n:'3',h:'floors'},{id:4,n:'4+',h:'or more'}];
const BEDROOMS = [0,1,2,3,4,5,6].map(n => ({ id:n, n: n === 6 ? '6+' : String(n) }));
const EPC = ['A','B','C','D','E','F','G'].map(x => ({ id:x, n:x })).concat([{ id:'unsure', n:'I don&rsquo;t know' }]);
const BED_SHARE = [{id:0,n:'Just me'},{id:1,n:'1 other person'},{id:2,n:'2 others'},{id:3,n:'3 or more'}];
const MAIN_HEATING = [
  {id:'gas_combi', n:'Gas boiler, no hot water tank', h:'A combi boiler', k:'Gas boiler'},
  {id:'gas_tank',  n:'Gas boiler with a hot water tank', k:'Gas boiler'},
  {id:'oil',       n:'Oil boiler'},
  {id:'lpg',       n:'LPG boiler'},
  {id:'ashp',      n:'Air source heat pump', k:'Heat pump'},
  {id:'gshp',      n:'Ground source heat pump', k:'Heat pump'},
  {id:'storage',   n:'Electric storage heaters', k:'Storage heaters'},
  {id:'electric',  n:'Electric radiators or panel heaters', k:'Electric radiators'},
  {id:'communal',  n:'Communal or district heating', k:'Communal heating'},
  {id:'solid',     n:'Solid fuel', h:'Coal or wood', k:'Solid fuel'},
  {id:'none',      n:'No central heating'},
  {id:'unsure',    n:'Not sure'}
];
const OTHER_HEATERS = [
  {id:'plugin',n:'Plug-in electric heater', k:'Plug-in heater'}, {id:'gas_fire',n:'Gas fire'}, {id:'electric_fire',n:'Electric fire'},
  {id:'stove',n:'Wood burner or multi-fuel stove', k:'Wood burner or stove'}, {id:'open_fire',n:'Open fire'}, {id:'electric_blanket',n:'Electric blanket'},
  {id:'none',n:'None of these'}
];
const HEAT_PATTERN = [
  {id:'always_on',   n:'Always on: the thermostat turns it on and off', h:'Set to a temperature and I rarely touch it', ic:'stat'},
  {id:'timer',       n:'On a timer at set times', ic:'clock'},
  {id:'when_needed', n:'I switch it on when I need it', ic:'power'},
  {id:'most_day',    n:'On most of the day', ic:'sun'},
  {id:'rarely',      n:'I rarely use it', ic:'moon'},
  {id:'not_me',      n:'Someone else controls it', ic:'users'}
];
/* 1.0 also asked how energy is paid for (payment), whether the thermostat shows the room temperature
 * (stat_display) and whether the bedroom radiator has a dial (bedroom_trv). They are no longer asked; answers
 * already stored stay in the profile untouched (the app keeps every key it does not know when it saves). */
const CONTROLS = [
  {id:'room_stat',  n:'A thermostat on the wall'},
  {id:'smart',      n:'Smart thermostat', h:'Hive, Nest, tado and similar'},
  {id:'programmer', n:'Timer or programmer'},
  {id:'trvs',       n:'Dials on the radiators', h:'TRVs'},
  {id:'none',       n:'None of these'},
  {id:'unsure',     n:'Not sure'}
];
const WALL_INS = [
  {id:'cavity',   n:'Filled cavity walls',      h:'Two layers of brick, the gap filled'},
  {id:'external', n:'Insulation on the outside', h:'Render or cladding over the walls'},
  {id:'internal', n:'Insulation on the inside', h:'Insulated boards inside the rooms'},
  {id:'none',     n:'No insulation',            h:'Solid walls, or an empty cavity'},
  {id:'unsure',   n:'Not sure',                 h:'A guess is fine'}
];
const LOFT = [{id:'yes',n:'Yes',h:'A thick soft layer up there'},{id:'no',n:'No',h:'Bare boards or a thin layer'},{id:'no_loft',n:'No loft',h:'e.g. a flat below another home'},{id:'unsure',n:'Not sure',h:'A guess is fine'}];
const GLAZING = [{id:'single',n:'Single',h:'One sheet of glass'},{id:'double',n:'Double',h:'Two sheets, a gap between'},{id:'triple',n:'Triple',h:'Three sheets'},{id:'mixed',n:'A mix',h:'Some of each'},{id:'unsure',n:'Not sure',h:'A guess is fine'}];
const WINDOWS_OPEN = [{id:'yes',n:'Yes, all of them',h:'Every window opens'},{id:'some',n:'Some of them',h:'Some are stuck or fixed'},{id:'no',n:'No',h:'Sealed or stuck shut'}];
const DAMP = [
  {id:'bedroom',n:'Bedroom'},{id:'living',n:'Living room'},{id:'kitchen',n:'Kitchen'},{id:'bathroom',n:'Bathroom'},
  {id:'elsewhere',n:'Elsewhere'},{id:'none',n:'No'},{id:'unsure',n:'Not sure'}
];
const FACING = [
  {id:'N',n:'North'},{id:'NE',n:'North-east'},{id:'E',n:'East'},{id:'SE',n:'South-east'},
  {id:'S',n:'South'},{id:'SW',n:'South-west'},{id:'W',n:'West'},{id:'NW',n:'North-west'}
];
/* "first half of the postcode": SA1, CF10, SW1A (never the full postcode) */
const POSTCODE_AREA_RE = /^[A-Z]{1,2}[0-9][A-Z0-9]?$/;
