/* SWITCH comfort check-in - icons, sensation faces, garments and the avatar. Loaded before app.js. */
const $ = s => document.querySelector(s);

const P = {
  back:'<path d="M15 5l-7 7 7 7"/>',
  home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  out:'<path d="M13 4h6v16h-6"/><path d="M3 12h10"/><path d="M10 9l3 3-3 3"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  snow:'<path d="M12 3v18M3 12h18M6 6l12 12M18 6L6 18"/><path d="M12 3l-2 2.5M12 3l2 2.5M12 21l-2-2.5M12 21l2-2.5M3 12l2.5-2M3 12l2.5 2M21 12l-2.5-2M21 12l-2.5 2"/>',
  check:'<path d="M5 12l5 5L20 7"/>',
  flame:'<path d="M12 3c.5 3.5 4.5 5 4.5 9.5a4.5 4.5 0 0 1-9 0c0-2 1-3.5 2-4.5 0 1.5 1 2.5 2 2.5.5-2-.5-4 .5-7.5z"/>',
  tshirt:'<path d="M8 4l4 1.5L16 4l4 3-2 3-2-1v11H8V9l-2 1-2-3z"/>',
  long:'<path d="M8 4l4 1.5L16 4l4 3-1 8h-1v5H6v-5H5L4 7z"/>',
  jumper:'<path d="M8 4l4 1.5L16 4l4 3-1 8h-1v5H6v-5H5L4 7z"/><path d="M6 17h12"/><path d="M10 5.5c1 1 3 1 4 0"/>',
  hoodie:'<path d="M8 5l4 1.5L16 5l4 3-1 8h-1v4H6v-4H5L4 8z"/><path d="M9 5.5a3 3 0 0 1 6 0"/><path d="M9 14h6v3H9z"/>',
  shorts:'<path d="M6 4h12l1 9h-6l-1-4-1 4H5z"/>',
  trousers:'<path d="M7 3h10l1 18h-5l-1-9-1 9H6z"/>',
  joggers:'<path d="M7 3h10l1 18h-5l-1-9-1 9H6z"/><path d="M8 6h8"/><path d="M13 19h5M6 19h5"/>',
  skirt:'<path d="M8 4h8l3 14H5z"/><path d="M8 7h8"/>',
  socks:'<path d="M9 3h6v9l3 3a3 3 0 0 1-4 4l-5-4z"/><path d="M9 6h6"/>',
  slippers:'<path d="M3 16c0-2 2-3 5-3h8c3 0 5 1 5 3v1H3z"/><path d="M8 13V9a3 3 0 0 1 6 0v4"/>',
  blanket:'<path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3H4z"/><path d="M4 10h16v8H4z"/><path d="M4 14h16"/>',
  bed:'<path d="M3 19v-9"/><path d="M3 13h18v6"/><path d="M7 13V9h4v4"/><path d="M11 13v-2h7a3 3 0 0 1 3 2"/>',
  sleep:'<path d="M3 20v-8M3 15h18v5M7 15v-4h4v4M11 15v-2h7a3 3 0 0 1 3 2"/><path d="M14 3h4l-4 4h4"/>',
  lying:'<circle cx="6" cy="10" r="2"/><path d="M9 13h9l2 3"/><path d="M3 16h18"/><path d="M4 16v-3a2 2 0 0 1 2-2"/><path d="M3 16v3M21 16v3"/>',
  sofa:'<path d="M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3"/><path d="M3 13a2 2 0 0 1 4 0v3h10v-3a2 2 0 0 1 4 0v5H3z"/>',
  laptop:'<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
  stand:'<circle cx="12" cy="4.5" r="2"/><path d="M12 7v7"/><path d="M8 10l4-2 4 2"/><path d="M12 14l-3 7M12 14l3 7"/>',
  pan:'<circle cx="10" cy="13" r="6"/><path d="M16 13h6"/><path d="M8 4c0 1.5 1 1.5 1 3M11 3c0 1.5 1 1.5 1 3"/>',
  walk:'<circle cx="13" cy="4" r="2"/><path d="M12 7l-3 5 2 2v6"/><path d="M12 7l3 3 3 1"/><path d="M9 12l-3 2"/><path d="M11 14l4 3 1 4"/>',
  gym:'<path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/>',
  door:'<path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17"/><path d="M3 21h18"/><circle cx="15" cy="12" r="1"/>',
  up:'<path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z"/><path d="M7 11l4-7c1.5 0 2.5 1 2.5 2.5L13 10h5a2 2 0 0 1 2 2.3l-1 6a2 2 0 0 1-2 1.7H7"/>',
  down:'<g transform="rotate(180 12 12)"><path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z"/><path d="M7 11l4-7c1.5 0 2.5 1 2.5 2.5L13 10h5a2 2 0 0 1 2 2.3l-1 6a2 2 0 0 1-2 1.7H7"/></g>',
  still:'<path d="M4 12h16"/><path d="M8 8h8M8 16h8" opacity=".35"/>',
  slight:'<path d="M4 12h10a2 2 0 1 0-2-2"/>',
  draught:'<path d="M3 8h9a2 2 0 1 0-2-2"/><path d="M3 12h14a2 2 0 1 1-2 2"/><path d="M3 16h7a2 2 0 1 1-2 2"/>',
  drop:'<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  dry:'<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/><path d="M4 4l16 16"/>',
  muggy:'<path d="M12 2s5 5.5 5 9.5a5 5 0 0 1-10 0C7 7.5 12 2 12 2z"/><path d="M3 19c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  cloud:'<path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z"/>',
  moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  window:'<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M12 3v18M4 12h16"/>',
  radiator:'<rect x="3" y="7" width="18" height="10" rx="1"/><path d="M7 7v10M10.5 7v10M14 7v10M17.5 7v10"/>',
  fan:'<circle cx="12" cy="12" r="2"/><path d="M12 10c0-4-2-6-5-6 0 3 2 5 5 6zM14 12c4 0 6-2 6-5-3 0-5 2-6 5zM12 14c0 4 2 6 5 6 0-3-2-5-5-6zM10 12c-4 0-6 2-6 5 3 0 5-2 6-5z"/>',
  mug:'<path d="M4 8h12v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M16 10h2a2 2 0 0 1 0 4h-2"/><path d="M7 3c0 1.5 1 1.5 1 3M11 3c0 1.5 1 1.5 1 3"/>',
  glass:'<path d="M6 3h12l-1.5 17a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1z"/><path d="M7 9h10"/><rect x="10" y="12" width="4" height="4"/>',
  curtain:'<path d="M3 3h18"/><path d="M5 3c3 5 3 13 0 18M19 3c-3 5-3 13 0 18"/><path d="M5 21h14"/>',
  layerOn:'<path d="M8 4l4 1.5L16 4l4 3-2 3-2-1v11H8V9l-2 1-2-3z"/><path d="M12 12v6M9 15h6"/>',
  layerOff:'<path d="M8 4l4 1.5L16 4l4 3-2 3-2-1v11H8V9l-2 1-2-3z"/><path d="M9 15h6"/>',
  zzz:'<path d="M4 8h5l-5 6h5"/><path d="M13 4h4l-4 5h4"/><path d="M14 14h6l-6 6h6"/>',
  thermo:'<path d="M10 4a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/><path d="M12 9v6"/>',
  fork:'<path d="M7 3v18"/><path d="M5 3v5a2 2 0 0 0 4 0V3"/><path d="M17 3c-2 0-3 3-3 6a3 3 0 0 0 3 3v9"/>',
  checkc:'<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  refresh:'<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>',
  copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  bulb:'<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.6 1 1.5 1 2.5h6c0-1 .3-1.9 1-2.5A6 6 0 0 0 12 3z"/>',
  chev:'<path d="M9 5l7 7-7 7"/>',
  pause:'<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  pin:'<path d="M12 21s7-6.5 7-11.5a7 7 0 0 0-14 0C5 14.5 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'
};
const ic = (n, cls='') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;

/* ---------- faces: thermal sensation (-3..+3) and comfort (1..6) ---------- */
const TSV = [
  {v:-3, w:'Cold'}, {v:-2, w:'Cool'}, {v:-1, w:'Slightly cool'}, {v:0, w:'Neutral'},
  {v:1, w:'Slightly warm'}, {v:2, w:'Warm'}, {v:3, w:'Hot'}
];
function face(v, o={}){
  const fill = o.fill || `var(--c${v<0?'-'+(-v):v})`;
  const ink = o.ink || (Math.abs(v)>=2 ? 'var(--face-ink-light)' : 'var(--face-ink)');
  let mouth, extra='';
  if(v===-3){ mouth='<path d="M16 32l2.5-2 2.5 2 2.5-2 2.5 2 2.5-2 2.5 2"/>'; if(!o.plain) extra='<path d="M6 12l-3 1M7 20H3M6 28l-3-1" stroke="var(--c-2)" stroke-width="2" stroke-linecap="round"/><path d="M42 12l3 1M41 20h4M42 28l3-1" stroke="var(--c-2)" stroke-width="2" stroke-linecap="round"/>'; }
  else if(v===3){ mouth='<ellipse cx="24" cy="32.5" rx="5" ry="4" fill="'+ink+'" stroke="none"/>'; if(!o.plain) extra='<path d="M41 8s4 4.5 4 7.5a4 4 0 0 1-8 0c0-3 4-7.5 4-7.5z" fill="var(--c-1)" stroke="none"/>'; }
  else if(Math.abs(v)===2){ mouth='<path d="M17 33.5Q24 27.5 31 33.5"/>'; }
  else if(Math.abs(v)===1){ mouth='<path d="M17.5 32Q24 29.5 30.5 32"/>'; }
  else { mouth='<path d="M17 30Q24 36.5 31 30"/>'; }
  let brows='';
  const wantBrows = o.brows!==undefined ? o.brows : Math.abs(v)>=2;
  if(wantBrows && v<0) brows='<path d="M15 16.5l6 1.5M33 16.5l-6 1.5"/>';
  if(wantBrows && v>0) brows='<path d="M15 18l6-1.5M33 18l-6-1.5"/>';
  return `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21" fill="${fill}"/>
    <g fill="${ink}" stroke="${ink}" stroke-width="2.2" stroke-linecap="round">
      <circle cx="18" cy="22.5" r="2.2" stroke="none"/><circle cx="30" cy="22.5" r="2.2" stroke="none"/>
      <g fill="none">${mouth}${brows}</g></g>${extra}</svg>`;
}
/* comfort 1..6: mouths from a deep frown to a big smile, colours from red to green */
function comfortFace(k){
  const fill = `var(--k${k})`;
  const ink = (k<=2 || k===6) ? 'var(--face-ink-light)' : 'var(--face-ink)';
  const mouths = {
    1:'<path d="M16.5 34.5Q24 26.5 31.5 34.5"/><path d="M15 17l6 2M33 17l-6 2"/>',
    2:'<path d="M17 33Q24 28 31 33"/>',
    3:'<path d="M17.5 31.5Q24 29.5 30.5 31.5"/>',
    4:'<path d="M17.5 30.5Q24 33 30.5 30.5"/>',
    5:'<path d="M17 30Q24 36 31 30"/>',
    6:'<path d="M16 29Q24 39 32 29" fill="'+ink+'" fill-opacity=".25"/><path d="M15 19l6-2M33 19l-6-2"/>'
  };
  return `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21" fill="${fill}"/>
    <g fill="${ink}" stroke="${ink}" stroke-width="2.2" stroke-linecap="round">
      <circle cx="18" cy="22.5" r="2.2" stroke="none"/><circle cx="30" cy="22.5" r="2.2" stroke="none"/>
      <g fill="none">${mouths[k]}</g></g></svg>`;
}

/* ---------- clothing: garments, presets, avatar ---------- */
const GARMENTS = [
  {id:'tshirt',   n:'T-shirt',          clo:0.08, ic:'tshirt'},
  {id:'long',     n:'Long sleeves',     clo:0.25, ic:'long'},
  {id:'jumper',   n:'Thick jumper',     clo:0.36, ic:'jumper'},
  {id:'hoodie',   n:'Hoodie / fleece',  clo:0.34, ic:'hoodie'},
  {id:'shorts',   n:'Shorts',           clo:0.08, ic:'shorts'},
  {id:'trousers', n:'Jeans / trousers', clo:0.24, ic:'trousers'},
  {id:'joggers',  n:'Joggers',          clo:0.28, ic:'joggers'},
  {id:'skirt',    n:'Skirt / dress',    clo:0.23, ic:'skirt'},
  {id:'socks',    n:'Socks',            clo:0.03, ic:'socks'},
  {id:'slippers', n:'Slippers',         clo:0.03, ic:'slippers'},
  {id:'blanket',  n:'Blanket',          clo:0.60, ic:'blanket', est:true},
  {id:'duvet',    n:'Duvet',            clo:2.00, ic:'bed',     est:true}
];
const PRESETS = [
  {n:'Light',      g:['tshirt','shorts']},
  {n:'Everyday',   g:['long','trousers','socks','slippers']},
  {n:'Cosy',       g:['tshirt','jumper','joggers','socks','slippers']},
  {n:'Wrapped up', g:['tshirt','hoodie','joggers','socks','blanket']}
];
const cloOf = ids => Math.round(ids.reduce((s,id)=>s+(GARMENTS.find(g=>g.id===id)?.clo||0),0)*100)/100;

/* A friendly front-facing figure. Garments are drawn in wearing order with a soft outline so layers read clearly. */
function avatar(ids){
  const has = id => ids.includes(id);
  const O = 'stroke="rgba(20,30,45,.22)" stroke-width="1.4" stroke-linejoin="round"';
  const R = (x,y,w,h,rx,c,extra='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${c}" ${O} ${extra}/>`;
  const skin = 'var(--skin)', hair = 'var(--hair)';
  let s = '';
  // body
  s += `<ellipse cx="60" cy="200" rx="34" ry="5" fill="rgba(20,30,45,.08)"/>`;
  s += R(43,104,15,86,7,skin) + R(62,104,15,86,7,skin);                                   // legs
  s += `<ellipse cx="50" cy="191" rx="11" ry="5.5" fill="${skin}" ${O}/><ellipse cx="70" cy="191" rx="11" ry="5.5" fill="${skin}" ${O}/>`; // feet
  s += `<path d="M40 50Q60 43 80 50L84 108Q60 116 36 108Z" fill="${skin}" ${O}/>`;          // torso
  s += `<g transform="rotate(7 30 54)">${R(23,52,13,62,6.5,skin)}</g><g transform="rotate(-7 90 54)">${R(84,52,13,62,6.5,skin)}</g>`; // arms
  s += R(54,40,12,10,4,skin);                                                               // neck
  s += `<ellipse cx="60" cy="26" rx="14.5" ry="16" fill="${skin}" ${O}/>`;                  // head
  s += `<path d="M45 24Q46 8 60 8Q74 8 75 24Q68 18 60 19Q52 18 45 24Z" fill="${hair}"/>`;    // hair
  s += `<circle cx="54.5" cy="27" r="1.6" fill="var(--face-ink)"/><circle cx="65.5" cy="27" r="1.6" fill="var(--face-ink)"/><path d="M56 34q4 3 8 0" stroke="var(--face-ink)" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
  // legs
  if(has('shorts'))   s += `<path d="M41 104h38l1 38H61l-1-14-1 14H40z" fill="var(--g-shorts)" ${O}/>`;
  if(has('trousers')) s += `<path d="M41 104h38l1 84H61l-1-60-1 60H40z" fill="var(--g-trousers)" ${O}/>`;
  if(has('joggers'))  s += `<path d="M41 104h38l1 84H61l-1-60-1 60H40z" fill="var(--g-joggers)" ${O}/><path d="M42 180h17M61 180h17" stroke="rgba(20,30,45,.25)" stroke-width="2"/>`;
  if(has('skirt'))    s += `<path d="M40 104h40l8 56H32z" fill="var(--g-skirt)" ${O}/>`;
  // feet
  if(has('socks'))    s += R(43.5,172,14,17,5,'var(--g-socks)') + R(62.5,172,14,17,5,'var(--g-socks)');
  if(has('slippers')) s += `<ellipse cx="50" cy="191" rx="12" ry="6" fill="var(--g-slippers)" ${O}/><ellipse cx="70" cy="191" rx="12" ry="6" fill="var(--g-slippers)" ${O}/>`;
  // tops
  const top = (c, sleeve) => `<path d="M38 48Q60 40 82 48L86 106Q60 114 34 106Z" fill="${c}" ${O}/>` +
    `<g transform="rotate(7 30 54)">${R(21.5,50,16,sleeve,7,c)}</g><g transform="rotate(-7 90 54)">${R(82.5,50,16,sleeve,7,c)}</g>` +
    `<path d="M52 47q8 5 16 0" fill="none" stroke="rgba(20,30,45,.22)" stroke-width="1.4"/>`;
  if(has('tshirt')) s += top('var(--g-tshirt)', 26);
  if(has('long'))   s += top('var(--g-long)', 64);
  if(has('jumper')) s += top('var(--g-jumper)', 66) + `<path d="M36 102h48" stroke="rgba(20,30,45,.25)" stroke-width="3"/>`;
  if(has('hoodie')) s += `<path d="M44 46a16 16 0 0 1 32 0v8H44z" fill="var(--g-hoodie)" ${O}/>` + top('var(--g-hoodie)', 68) + R(46,82,28,14,5,'rgba(20,30,45,.14)');
  // wraps
  if(has('blanket')) s += `<path d="M22 66Q60 46 98 66L104 198H16z" fill="var(--g-blanket)" ${O}/><path d="M28 100h64M26 130h68M24 160h72" stroke="rgba(20,30,45,.14)" stroke-width="3"/>`;
  if(has('duvet'))   s += R(12,58,96,148,22,'var(--g-duvet)') + `<path d="M12 110h96M12 160h96M60 58v148" stroke="rgba(20,30,45,.12)" stroke-width="2"/>`;
  return `<svg viewBox="0 0 120 208" aria-hidden="true">${s}</svg>`;
}
