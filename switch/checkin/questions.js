/* HomePulse (SWITCH home comfort study) - answer options, the check-in question screens and the option lists of
 * the join wizard. Loaded after icons.js and i18n.js, before app.js; the screens read app.js's S (the answers being
 * built), lastVote() and homeProfile() when they are drawn.
 *
 * Stored ids (what the database and the dashboard see) never change once used; labels may. The labels here are
 * English; app.js hands these lists to I18N.register(), which relabels them for the app's language (i18n.js). The
 * screens' own words go through tr(). */

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
  {id:'office',n:'Home office',ic:'laptop',old:true},{id:'bathroom',n:'Bathroom',ic:'bath'},{id:'other',n:'Somewhere else at home',ic:'door'}
];
/* 1.4: the check-in starts with "Where are you right now?" (a room, or "I'm not at home"), then how long they have been in it.
 * The home office is no longer offered (older check-ins keep it); "other" read "Elsewhere" until 1.3. */
const ROOM_TIME = [{id:'lt15',n:'Less than 15 minutes'},{id:'15_60',n:'15 minutes to an hour'},{id:'gt60',n:'More than an hour'}];
/* Five points from 1.3: "cooler" and "warmer" (plain Cooler / Warmer before 1.3) read "A bit cooler" and "A bit warmer",
 * with "Much cooler" and "Much warmer" around them; all five fold back into ASHRAE's three points. */
const TP  = [
  {id:'much_cooler',n:'Much cooler',ic:'snow',cls:'cold'},{id:'cooler',n:'A bit cooler',ic:'snow',cls:'cool'},{id:'same',n:'No change',ic:'check'},
  {id:'warmer',n:'A bit warmer',ic:'flame',cls:'warm'},{id:'much_warmer',n:'Much warmer',ic:'flame',cls:'hot'}
];
/* Binary thermal acceptability of the environment as a whole */
const TA  = [
  {id:'acceptable',  n:'Acceptable',     s:'I can stay like this',  ic:'up',   cls:'good'},
  {id:'unacceptable',n:'Not acceptable', s:'I want this to change', ic:'down', cls:'bad'}
];
/* Older check-ins (before 0.4.0) may still carry the four-point answers */
const TA_OLD = {clearly_acc:'Clearly acceptable', just_acc:'Just acceptable', just_unacc:'Just unacceptable', clearly_unacc:'Clearly unacceptable'};
/* Air movement in everyday words; n and s are what the question shows, k the short form in summaries. */
const AIR  = [
  {id:'still',   n:'No',                      s:'I can&rsquo;t feel any air moving',            k:'Still air',          ic:'still'},
  {id:'slight',  n:'Yes, a little',           s:'I can just feel a gentle flow of air',        k:'A little air moving', ic:'slight'},
  {id:'draughty',n:'Yes, clearly',            s:'I can clearly feel air moving, or a draught', k:'Draughty',            ic:'draught'}
];
/* 1.4: No / Yes, as in the doc (k: the words in summaries); "It's dark" until 1.3 */
/* 1.5: how much sunlight, 1 (none) to 5 (bright, direct sunshine); No / Yes in 1.4, "It's dark" until 1.3 (k: the words in summaries) */
const SUN  = [
  {id:'1',n:'None',k:'No sun on me',ic:'cloud'}, {id:'2',n:'A little',k:'A little sun on me',ic:'sun'}, {id:'3',n:'Some',k:'Some sun on me',ic:'sun'},
  {id:'4',n:'A lot',k:'A lot of sun on me',ic:'sun'}, {id:'5',n:'Bright, direct sunshine',k:'Bright, direct sun on me',ic:'sun'},
  {id:'no',n:'No',k:'No direct sun',ic:'cloud',old:true}, {id:'yes',n:'Yes',k:'Sun on me',ic:'sun',old:true}, {id:'dark',n:"It's dark",s:'Evening, or curtains drawn',ic:'moon',old:true}
];
const SUN_COL = { 1:'#B8C2CC', 2:'#F7E3A1', 3:'#F4D06A', 4:'#F2B93B', 5:'#EE9A1C' };
/* the heating, right now (new in 1.0) */
const HEAT = [
  {id:'on',     n:'Yes, it&rsquo;s on',  k:'Heating on',  ic:'flame',    cls:'hot'},
  {id:'off',    n:'No, it&rsquo;s off',  k:'Heating off', ic:'flameOff'},
  {id:'unsure', n:'Not sure',            k:'Not sure if the heating is on', ic:'help'}
];
/* "Always on" (a thermostat switching it) comes first; "less than 30 minutes" (lt30) is no longer offered, its words
 * stay in HEAT_FOR_OLD for older check-ins. art: the picture key (icons.js), fb the icon until it is drawn. */
const HEAT_FOR = [
  {id:'always', n:'It&rsquo;s always on', h:'On a thermostat', k:'Always on (thermostat)', art:'heat_for:always', fb:'stat'},
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
  {id:'warm',     n:'Warm',                  ic:'wallWarm',    cls:'warm'},
  {id:'hot',      n:'Hot',                   ic:'wallHot',     cls:'hot'}     // from 1.3: two warm answers balance the two cold ones
];
/* What the participant DID in the last 30 minutes (not how things are now). Shown as boxes (window, door,
 * heating, clothes and blankets) and rows on their own; within a box the two sides of a pair exclude each
 * other. q is the wording on the question screen ("I ..."), n the name in summaries. */
const ACTIONS = [
  {id:'win_open',  n:'Opened a window', q:'I opened a window',  ic:'windowOpen'}, {id:'win_close',  n:'Closed a window', q:'I closed a window', ic:'window'},
  {id:'door_open', n:'Opened a door',   q:'I opened a door',    ic:'doorOpen'},   {id:'door_close', n:'Closed a door',   q:'I closed a door',   ic:'door'},
  {id:'heat_up',   n:'Turned the heating up', q:'I turned the heating up', ic:'heatUp'}, {id:'heat_down', n:'Turned the heating down or off', q:'I turned the heating down or off', ic:'heatDown'},
  {id:'layer_on',  n:'Put on more clothes or a blanket', q:'I put on more clothes or a blanket', ic:'layerOn'}, {id:'layer_off', n:'Took off some clothes', q:'I took off some clothes', ic:'layerOff'}, {id:'blanket', n:'Got a blanket', q:'I got a blanket', ic:'blanket'},
  {id:'fan',       n:'Turned a fan on', q:'I turned a fan on',  ic:'fan'},
  {id:'curtains',  n:'Closed the curtains or blinds', q:'I closed the curtains or blinds', ic:'curtain'},
  {id:'moved',     n:'Moved to another room', q:'I moved to another room', ic:'walk'}
];
/* From 1.3 the question offers eight of these and "none": the door pair, "Got a blanket" (now part of layer_on) and
 * "Moved to another room" are no longer asked. They stay in ACTIONS so older check-ins keep their words. */
const ACTION_BOXES = [
  {n:'Window',               ic:'window',   ids:['win_open','win_close']},
  {n:'Heating',              ic:'radiator', ids:['heat_up','heat_down']},
  {n:'Clothes and blankets', ic:'layerOn',  ids:['layer_on','layer_off']}
];
const ACTION_SOLO = ['fan','curtains'];
const PAIRED = { win_open:'win_close', win_close:'win_open', door_open:'door_close', door_close:'door_open', heat_up:'heat_down', heat_down:'heat_up', layer_on:'layer_off', layer_off:'layer_on' };
/* Also the last 30 minutes: drinks and food in boxes, two rows on their own (any number may be chosen). */
const NOTES = [
  {id:'hot_drink',n:'Hot drink',q:'I had a hot drink',ic:'mug'}, {id:'cold_drink',n:'Cold drink',q:'I had a cold drink',ic:'glass'},
  {id:'ate',n:'Ate something',q:'I ate something',ic:'fork'}, {id:'hungry',n:'Felt hungry',q:'I felt hungry',ic:'apple'},
  {id:'tired',n:'Felt tired',q:'I felt tired',ic:'zzz'}, {id:'unwell',n:'Felt unwell',q:'I felt unwell',ic:'unwell'}
];
/* "Felt hungry" and "Felt tired" were left out in 1.3 only; asked again from 1.4 */
const NOTE_BOXES = [{n:'Drinks', ic:'mug', ids:['hot_drink','cold_drink']}, {n:'Food', ic:'fork', ids:['ate','hungry']}];
const NOTE_SOLO = ['tired','unwell'];

/* Every check-in asks these, in this order (1.4, the agreed Check-ins doc): where they are and for how long, then 11
 * questions. The room is answered on the first screen, so the questions open at room_time. How long the heating has
 * been on (heat_for, 1.0 to 1.3), which heating is on (heat_src, 1.0 and 1.1) and the thermostat reading (1.0) are no
 * longer asked: heating_for, heating_src and stat_temp_c are sent as null; older check-ins still show theirs. */
const FLOW_ALL = ['room','room_time','tsv','tp','ta','clo','act','air','sun','heat','wall','actions','notes'];
function flowFor(a){
  return FLOW_ALL.filter(q => q==='heat_for' ? a.heat==='on' : true);
}
const QNAME = { room_time:'time in this room', tsv:'how you feel', tp:'your preference', ta:'acceptability', clo:'clothing', act:'activity', room:'room', air:'air movement', sun:'sunlight',
  heat:'the heating', heat_for:'how long it has been on', wall:'the wall', actions:'what you did', notes:'what you had or felt' };
const byId = (list,id) => list.find(x=>x.id===id);
const tsvWord = v => (TSV.find(t=>t.v===v)||{}).w || '';
const tsvColour = v => `var(--c${v<0?'-'+(-v):v})`;
const signed = v => v>0?'+'+v:String(v);
const garmentNames = ids => (ids||[]).map(id=>byId(GARMENTS,id)?.n).filter(Boolean).join(', ');
const taWord = id => byId(TA,id)?.n || TA_OLD[id] || '';
const namesOf = (list, ids) => ids && (ids.length ? ids.map(id=>byId(list,id)?.n).filter(Boolean).join(', ') : tr('Nothing'));
const sameSet = (a, b) => (a||[]).length===(b||[]).length && (a||[]).every(x=>(b||[]).includes(x));
/* which heating was on, in older check-ins (asked until 1.1): the home's systems, or "Something else" */
const HEAT_OTHER = {id:'other', n:'Something else', art:'unsure'};
const heatSrcName = id => (byId(MAIN_HEATING, id) || byId(OTHER_HEATERS, id) || (id === 'other' ? HEAT_OTHER : {}));
const heatSrcWord = ids => (ids||[]).map(id => { const o = heatSrcName(id); return o.k || o.n; }).filter(Boolean).join(', ');
/* a picture that may not be drawn yet: the art (or icon) key when icons.js has it, else the fallback icon */
const artx = (key, fb, cls='') => (typeof ART === 'object' && ART[key]) ? art(key, cls) : ic(fb, cls);
const icx = (key, fb, cls='') => (typeof P === 'object' && P[key]) ? ic(key, cls) : ic(fb, cls);
const statWord = v => typeof v === 'number' ? v.toFixed(1) + '&nbsp;&deg;C' : '';

/* ---------- building blocks ---------- */
const tintCls = o => o.cls ? 'tint t-'+o.cls : '';
const tile = (q, o, on, extra='', cls='') => `<button class="tile ${cls} ${tintCls(o)} ${on?'on':''}" role="radio" aria-checked="${on}" data-act="pick" data-q="${q}" data-v="${o.id}">${pic(o.ic, o.cls||'')}<b>${o.n}</b>${extra}</button>`;
const tallRow = (q, o, on) => `<button class="row tall ${tintCls(o)} ${on?'on':''}" role="radio" aria-checked="${on}" data-act="pick" data-q="${q}" data-v="${o.id}"><span class="orb">${pic(o.ic, o.cls||'')}</span><div><b>${o.n}</b>${o.s?`<span>${o.s}</span>`:''}</div></button>`;
const scaleRow = (q, v, faceHtml, label, num, colour, on) => `<button class="srow ${on?'on':''}" role="radio" aria-checked="${on}" style="--sc:${colour}" data-act="pick" data-q="${q}" data-v="${v}" aria-label="${label}"><span class="f">${faceHtml}</span><b>${label}</b><span class="num">${num}</span></button>`;
/* multiple choice: a row that toggles, and the one "none" row that clears the others */
const multiRow = (q, o, on) => `<button class="row mrow ${on?'on':''}" aria-pressed="${!!on}" data-act="toggle" data-q="${q}" data-v="${o.id}">${pic(o.ic)}<div><b>${o.q || o.n}</b></div><span class="tick">${ic('check')}</span></button>`;
const noneRow = (q, on, label) => `<button class="row mrow none ${on?'on':''}" aria-pressed="${!!on}" data-act="none" data-q="${q}">${ic('checkc')}<div><b>${label}</b></div><span class="tick">${ic('check')}</span></button>`;
/* a box of related answers (the window, the door, drinks...): one tile per answer, each with its own tick */
const answerBox = (q, list, box, on) => `<fieldset class="abox"><legend>${ic(box.ic)}${box.n}</legend><div class="abox-opts c${box.ids.length}">${box.ids.map(id => { const o = byId(list, id);
  return `<button class="aopt ${on(id)?'on':''}" type="button" aria-pressed="${on(id)}" data-act="toggle" data-q="${q}" data-v="${id}">${pic(o.ic)}<b>${o.q || o.n}</b><span class="tick">${ic('check')}</span></button>`; }).join('')}</div></fieldset>`;
/* one box of garments, each a tile with its clo value */
const gbox = (grp, ids) => { const n = grp.ids.filter(id => ids.includes(id)).length;
  return `<fieldset class="abox gbox"><legend>${ic(grp.ic)}${grp.n}${n ? `<span class="cnt">${n}</span>` : ''}</legend><div class="gtiles c${grp.ids.length}">${grp.ids.map(id => { const g = byId(GARMENTS, id);
    return `<button class="gt ${ids.includes(g.id)?'on':''}" aria-pressed="${ids.includes(g.id)}" data-act="toggle" data-q="clo" data-v="${g.id}">${pic(g.ic)}<b>${g.s || g.n}</b><small>${g.est?'&asymp;':''}${g.clo.toFixed(2)}</small></button>`; }).join('')}</div></fieldset>`; };
/* the rooms (1.4: no home office): two large tiles, then three smaller ones; act 'pick' in the questions, 'where' on the first screen */
const roomTiles = act => { const t = (o, cls) => tile('room', o, S.a.room===o.id, '', cls).replace('data-act="pick"', `data-act="${act}"`);
  return `<div class="room fill" role="radiogroup" aria-label="${tr('Room')}"><div class="tiles c2 big">${ROOMS.filter(o => o.main && !o.old).map(o => t(o, 'big')).join('')}</div>
    <div class="tiles c3 small">${ROOMS.filter(o => !o.main && !o.old).map(o => t(o, 'wide')).join('')}</div></div>`; };
const qhead = (eyebrow, h, p='') => `<div class="q"><div class="eyebrow">${eyebrow}</div><h1 tabindex="-1">${h}</h1>${p?`<p>${p}</p>`:''}</div>`;
const nextBtn = (ok, label) => `<div class="actions"><button class="btn primary" data-act="next" ${ok?'':'disabled'}>${label || tr('Next')} ${ic('chev')}</button></div>`;

/* ---------- the question screens (read S.a for the current answers) ---------- */
const Q = {
  tsv: () => {
    const v = S.a.tsv;
    return qhead(tr('Right now'), tr('How warm or cool do you feel right now?'), tr('Think about your body as a whole.')) +
      `<div class="scale fill" role="radiogroup" aria-label="${tr('How warm or cool do you feel right now?')}">${TSV.map(t=>scaleRow('tsv', t.v, face(t.v), t.w, signed(t.v), tsvColour(t.v), v===t.v)).join('')}</div>`;
  },
  tp: () => qhead(tr('Preference'), tr('Right now, would you prefer to feel&hellip;')) +
    `<div class="rows fill" role="radiogroup" aria-label="${tr('Right now, would you prefer to feel')}">${TP.map(o=>tallRow('tp',o,S.a.tp===o.id)).join('')}</div>`,
  /* two tall rows (like the preference screen), tinted green and red */
  ta: () => qhead(tr('Acceptability'), tr('Is the temperature here acceptable to you right now?'), tr('Whether or not you feel too warm or too cold.')) +
    `<div class="rows fill" role="radiogroup" aria-label="${tr('Acceptability')}">${TA.map(o=>tallRow('ta',o,S.a.ta===o.id)).join('')}</div>`,
  /* From 1.3: four ready-made outfits (OUTFITS in icons.js), one tap; stored as garments [the outfit id] and its clo */
  clo: () => {
    const cur = (S.a.clo || [])[0];
    return qhead(tr('Clothing'), tr('How warmly are you dressed right now?'), tr('Choose the closest match. Any style of clothing counts (for example, a sari or a shalwar kameez): just think about how warm it is overall.')) +
      `<div class="rows fill" role="radiogroup" aria-label="${tr('Clothing')}">${OUTFITS.map(id => { const g = byId(GARMENTS, id), on = cur === id;
        return `<button class="row tall outfit ${on?'on':''}" role="radio" aria-checked="${on}" data-act="pick" data-q="clo" data-v="${id}"><span class="orb">${avatar([id])}</span><div><b>${g.n}</b><span>${g.s}</span></div><small>${g.clo.toFixed(2)} clo</small></button>`; }).join('')}</div>`;
  },
  act: () => qhead(tr('Activity'), tr('What have you mostly been doing in the last 15 minutes?')) +
    `<div class="tiles c2 fill" role="radiogroup" aria-label="${tr('Activity')}">${ACTS.map(o=>tile('act',o,S.a.act===o.id,`<small>${o.met.toFixed(1)} met</small>`)).join('')}</div>`,
  /* the room again (Back from the next question, or Edit on the review); the first screen asks it with "I'm not at home" */
  room: () => qhead(tr('Location'), tr('Where are you right now?'), tr('The study&rsquo;s sensors are in your living room and, in some homes, your bedroom, so this matters.')) + `<div class="where fill">${roomTiles('pick')}</div>`,
  room_time: () => qhead(tr('Location'), tr('How long have you been in this room?')) +
    `<div class="rows fill" role="radiogroup" aria-label="${tr('How long have you been in this room?')}">${ROOM_TIME.map(o => `<button class="row tall ${S.a.room_time===o.id?'on':''}" role="radio" aria-checked="${S.a.room_time===o.id}" data-act="pick" data-q="room_time" data-v="${o.id}"><span class="orb">${artx('room_time:' + o.id, 'clock')}</span><div><b>${o.n}</b></div></button>`).join('')}</div>`,
  air: () => qhead(tr('Air movement'), tr('Can you feel air moving on your skin right now?'), tr('Like air from a window, a door, a vent or a fan. Not how warm or cool it is, only whether the air moves.')) +
    `<div class="rows fill" role="radiogroup" aria-label="${tr('Air movement')}">${AIR.map(o=>tallRow('air',o,S.a.air===o.id)).join('')}</div>`,
  sun: () => qhead(tr('Sunlight'), tr('How much sunlight is falling on you right now?'), tr('From 1, no sunlight on you, to 5, bright direct sunshine.')) +
    `<div class="scale fill" role="radiogroup" aria-label="${tr('Sunlight')}">${SUN.filter(o => !o.old).map(o => scaleRow('sun', o.id, pic(o.ic), o.n, o.id, SUN_COL[o.id], S.a.sun === o.id)).join('')}</div>`,
  heat: () => qhead(tr('Heating'), tr('As far as you can tell, is the heating in this room giving out heat right now?'), tr('For example, a warm radiator or a heater that is on.')) +
    `<div class="rows fill" role="radiogroup" aria-label="${tr('Heating')}">${HEAT.map(o=>tallRow('heat',o,S.a.heat===o.id)).join('')}</div>`,
  heat_for: () => qhead(tr('Heating'), tr('How long has it been on?'), tr('Since it last came on.')) +
    `<div class="tiles c2 fill" role="radiogroup" aria-label="${tr('How long has the heating been on')}">${HEAT_FOR.map(o => `<button class="tile hf ${S.a.heat_for===o.id?'on':''}" role="radio" aria-checked="${S.a.heat_for===o.id}" data-act="pick" data-q="heat_for" data-v="${o.id}">${artx(o.art, o.fb)}<span class="tt"><b>${o.n}</b>${o.h ? `<small>${o.h}</small>` : ''}</span></button>`).join('')}</div>`,
  wall: () => qhead(tr('Outside wall'), tr('If you can, please touch the nearest outside wall with the back of your hand. How does it feel?'), tr('An outside wall has the outdoors on the other side.')) +
    `<div class="rows fill" role="radiogroup" aria-label="${tr('How the outside wall feels')}">${WALL.map(o=>tallRow('wall',o,S.a.wall===o.id)).join('')}</div>`,
  actions: () => {
    const ids = S.a.actions, on = id => !!(ids && ids.includes(id));
    return qhead(tr('Last 30 minutes'), tr('In the last 30 minutes, did you do any of these?'), tr('Only things you <b>did</b>, not how things are now. Tap all that apply.')) +
      `<div class="aboxes" role="group" aria-label="${tr('What you did in the last 30 minutes')}">${ACTION_BOXES.map(b => answerBox('actions', ACTIONS, b, on)).join('')}
        <div class="rows">${ACTION_SOLO.map(id => multiRow('actions', byId(ACTIONS, id), on(id))).join('')}${noneRow('actions', ids&&ids.length===0, tr('I didn&rsquo;t do any of these'))}</div></div>` + nextBtn(!!ids);
  },
  notes: () => {
    const ids = S.a.notes, on = id => !!(ids && ids.includes(id));
    return qhead(tr('Last 30 minutes'), tr('In the last 30 minutes, did you have or feel any of these?'), tr('Tap all that apply.')) +
      `<div class="aboxes" role="group" aria-label="${tr('What you had or felt in the last 30 minutes')}">${NOTE_BOXES.map(b => answerBox('notes', NOTES, b, on)).join('')}
        <div class="rows">${NOTE_SOLO.map(id => multiRow('notes', byId(NOTES, id), on(id))).join('')}${noneRow('notes', ids&&ids.length===0, tr('None of these'))}</div></div>` + nextBtn(!!ids);
  }
};

/* ---------- the join wizard: the participant and their home (UK and Wales) ----------
 * Every value is stored as listed (participants columns, or participants.home). Labels n, hints h; k is a
 * shorter name where one is shown in a summary. */
/* 1.5: sex, as in the ASHRAE database (stored in the gender column); the gender answers until 1.4 are kept for older profiles */
const GENDERS = [{id:'female',n:'Female'},{id:'male',n:'Male'},{id:'prefer_not',n:'Prefer not to say'},
  {id:'woman',n:'Woman',old:true},{id:'man',n:'Man',old:true},{id:'non_binary',n:'Non-binary',old:true},{id:'self_describe',n:'Another identity',old:true}];
/* asked until 1.2 (one question); from 1.3 two questions, FEEL below, and the column keeps one word made from them */
const SENSITIVITY = [
  {id:'cold',    n:'I feel the cold easily',  ic:'snow', cls:'cold'},
  {id:'average', n:'I&rsquo;m about average', ic:'leaf'},
  {id:'warm',    n:'I feel the heat easily',  ic:'sun',  cls:'hot'}
];
const HOME_TYPES = [
  {id:'detached',    n:'Detached'}, {id:'semi', n:'Semi-detached'}, {id:'end_terrace', n:'End of terrace'},
  {id:'mid_terrace', n:'Terraced', h:'Mid-terrace'}, {id:'bungalow', n:'Bungalow'}, {id:'flat', n:'Flat or maisonette'},
  {id:'other',       n:'Something else'}   // 1.3, with home_type_other (typed)
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
/* old: kept so older answers keep their words, never offered (pick1 and the bedroom row skip them); from 1.3 floors stop at
 * "3 or more" and bedrooms at "4+" */
const FLOORS = [{id:1,n:'1',h:'floor'},{id:2,n:'2',h:'floors'},{id:3,n:'3+',h:'or more'},{id:4,n:'4+',h:'or more',old:true}];
const BEDROOMS = [0,1,2,3,4,5,6].map(n => ({ id:n, n: n === 4 ? '4+' : n === 6 ? '6+' : String(n), old: n > 4 }));
const EPC = ['A','B','C','D','E','F','G'].map(x => ({ id:x, n:x })).concat([{ id:'unsure', n:'I don&rsquo;t know' }]);
const BED_SHARE = [{id:0,n:'Just me'},{id:1,n:'1 other person'},{id:2,n:'2 others'},{id:3,n:'3 or more'}];
const MAIN_HEATING = [
  {id:'gas',       n:'Gas boiler'},
  {id:'oil_lpg',   n:'Oil or LPG boiler'},
  {id:'heat_pump', n:'Heat pump', h:'Air source or ground source'},
  {id:'storage',   n:'Electric storage heaters', k:'Storage heaters'},
  {id:'electric',  n:'Electric radiators or panel heaters', k:'Electric radiators'},
  {id:'infrared',  n:'Infrared heating panels', k:'Infrared panels'},
  {id:'communal',  n:'Communal or district heating', h:'Shared by several homes', k:'Communal heating'},
  {id:'wood_burner', n:'Wood burner or stove', k:'Wood burner'},   // 1.5
  {id:'solid',     n:'Coal or another solid fuel', k:'Solid fuel'},
  {id:'none',      n:'No central heating'},
  {id:'unsure',    n:'Not sure'},
  /* asked until 1.2 (1.3 groups them as above) */
  {id:'gas_combi', n:'Gas boiler, no hot water tank', h:'A combi boiler', k:'Gas boiler', old:true},
  {id:'gas_tank',  n:'Gas boiler with a hot water tank', k:'Gas boiler', old:true},
  {id:'oil',       n:'Oil boiler', old:true},
  {id:'lpg',       n:'LPG boiler', old:true},
  {id:'ashp',      n:'Air source heat pump', k:'Heat pump', old:true},
  {id:'gshp',      n:'Ground source heat pump', k:'Heat pump', old:true}
];
/* From 1.3 "Do you use anything else to keep warm?" (the same key, other_heaters) */
const OTHER_HEATERS = [
  {id:'plugin',n:'Plug-in electric heater', k:'Plug-in heater'}, {id:'wood_burner',n:'Wood burner or stove', k:'Wood burner'}, {id:'fire',n:'Gas or electric fire', k:'Gas or electric fire'},
  {id:'electric_blanket',n:'Electric blanket'}, {id:'hot_water_bottle',n:'Hot water bottle'}, {id:'blankets',n:'Extra blankets or throws', k:'Extra blankets'},
  {id:'curtains',n:'Closing curtains or blinds', h:'To keep the heat in', k:'Closing curtains'}, {id:'other',n:'Something else'},
  {id:'none',n:'No, nothing else', k:'Nothing else'},
  /* asked until 1.2 */
  {id:'gas_fire',n:'Gas fire', old:true}, {id:'electric_fire',n:'Electric fire', old:true},
  {id:'stove',n:'Wood burner or multi-fuel stove', k:'Wood burner or stove', old:true}, {id:'open_fire',n:'Open fire', old:true}
];
const HEAT_PATTERN = [
  {id:'always_on',   n:'It stays on and the thermostat turns it on and off', ic:'stat'},
  {id:'timer',       n:'It comes on at set times', h:'On a timer', ic:'clock'},
  {id:'when_needed', n:'I switch it on when I need it', ic:'power'},
  {id:'most_day',    n:'It&rsquo;s on for most of the day', ic:'sun'},
  {id:'rarely',      n:'I rarely use it', ic:'moon'},
  {id:'unsure',      n:'Not sure', ic:'help'},
  {id:'not_me',      n:'Someone else controls it', ic:'users', old:true}   // until 1.2
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
/* "A mix" until 1.2; from 1.3 a mix goes in the notes (glazing_notes) */
const GLAZING = [{id:'single',n:'Single',h:'One sheet of glass'},{id:'double',n:'Double',h:'Two sheets, a gap between'},{id:'triple',n:'Triple',h:'Three sheets'},{id:'mixed',n:'A mix',h:'Some of each',old:true},{id:'unsure',n:'Not sure',h:'A guess is fine'}];
const WINDOWS_OPEN = [{id:'yes',n:'Yes, all of them',h:'Every window opens'},{id:'some',n:'Some of them',h:'Some are stuck or fixed'},{id:'no',n:'No',h:'Sealed or stuck shut'}];
const DAMP = [
  {id:'bedroom',n:'Bedroom'},{id:'living',n:'Living room'},{id:'kitchen',n:'Kitchen'},{id:'bathroom',n:'Bathroom'},
  {id:'elsewhere',n:'Elsewhere'},{id:'none',n:'No'},{id:'unsure',n:'Not sure'}
];
const FACING = [
  {id:'N',n:'North'},{id:'NE',n:'North-east'},{id:'E',n:'East'},{id:'SE',n:'South-east'},
  {id:'S',n:'South'},{id:'SW',n:'South-west'},{id:'W',n:'West'},{id:'NW',n:'North-west'}
];
/* ---- 1.3: the rest of the Home Visit Questionnaire (v2, November 2026). Stored in participants.home under the key
 * named here; art: the picture key (icons.js). ---- */
/* compared with most people, how easily do you feel cold (feel_cold) / too warm (feel_warm) */
const FEEL = [{id:'more',n:'More easily'},{id:'same',n:'About the same'},{id:'less',n:'Less easily'}];
const MAIN_ROAD = [{id:'on',n:'Yes, on a main road'},{id:'near',n:'Yes, near a main road'},{id:'no',n:'No'},{id:'unsure',n:'Not sure'}];
/* changes during the study, an outside door for pets, drying clothes indoors */
const YES_NO = [{id:'no',n:'No'},{id:'yes',n:'Yes'}];
const TARIFF = [
  {id:'standard',n:'Standard',art:'tariff:standard'}, {id:'prepay',n:'Prepayment',art:'tariff:prepay'},
  {id:'time_of_use',n:'Cheaper at certain times of day',h:'For example Economy 7',art:'tariff:time'}, {id:'unsure',n:'Not sure',art:'tariff:unsure'}
];
/* how often (windows opened each way, the home too warm) */
const FREQ = [{id:'often',n:'Often'},{id:'sometimes',n:'Sometimes'},{id:'rarely',n:'Rarely or never'}];
/* one key each: window_short, window_long, window_night (FREQ) */
const WINDOW_WAYS = [
  {id:'window_short',n:'For a few minutes, to let fresh air in',art:'winopen:short'},
  {id:'window_long', n:'For an hour or more during the day',art:'winopen:long'},
  {id:'window_night',n:'Overnight in the bedroom',art:'winopen:night'}
];
const PUT_OFF = [
  {id:'noise',n:'Noise from outside'}, {id:'fumes',n:'Traffic fumes or poor outside air'}, {id:'security',n:'Security'},
  {id:'heat',n:'It lets the heat out or makes the room cold'}, {id:'other',n:'Something else'}, {id:'none',n:'No, nothing'}
];
/* one key each: vent_kitchen, vent_bathroom, vent_trickle, vent_whole_house (VENT_USE) */
const VENTS = [
  {id:'vent_kitchen',n:'Extractor fan in the kitchen',art:'vent:kitchen'}, {id:'vent_bathroom',n:'Extractor fan in the bathroom',art:'vent:bathroom'},
  {id:'vent_trickle',n:'Small vents in the window frames',h:'Trickle vents',art:'vent:trickle'}, {id:'vent_whole_house',n:'A whole-house ventilation system',art:'vent:whole_house'}
];
const VENT_USE = [{id:'use',n:'Have it and use it'},{id:'rarely',n:'Have it, rarely use it'},{id:'no',n:'Don&rsquo;t have it'},{id:'unsure',n:'Not sure'}];
const COOL_DOWN = [
  {id:'windows',n:'Open windows'}, {id:'fan',n:'Use a fan'}, {id:'ac',n:'Use air conditioning',h:'Fixed or portable'},
  {id:'blinds',n:'Close blinds or curtains during the day'}, {id:'lighter',n:'Wear lighter clothes'}, {id:'room',n:'Move to a cooler room'},
  {id:'other',n:'Something else'}, {id:'none',n:'Nothing'}
];
/* the five consent statements of the questionnaire; joining needs all five (kept as home.consent and consent_at) */
const CONSENT = [
  {id:'info',   n:'I have read the participant information sheet. I had the chance to ask questions, and any questions I asked were answered.'},
  {id:'choice', n:'I understand that taking part is my choice and that I can stop at any time without giving a reason. If I stop, I can ask for the answers and sensor readings already collected to be deleted up to 31 January 2027. After that date they will already be part of the analysis and cannot be removed.'},
  {id:'link',   n:'I agree that the study team can link my answers to the temperature and humidity readings from the sensors in my home.'},
  {id:'skip',   n:'I understand that I do not have to answer any question I would rather not answer.'},
  {id:'agree',  n:'I agree to take part in this study.'}
];
/* 1.5 (Prof. Walker): how much control people feel they have over their home's warmth (control_warmth) and its fresh
 * air (control_air), 1 to 5 */
const CONTROL5 = [{id:1,n:'No control at all'},{id:2,n:'A little'},{id:3,n:'Some'},{id:4,n:'A lot'},{id:5,n:'Complete control'}];
/* "first half of the postcode": SA1, CF10, SW1A (never the full postcode) */
const POSTCODE_AREA_RE = /^[A-Z]{1,2}[0-9][A-Z0-9]?$/;
