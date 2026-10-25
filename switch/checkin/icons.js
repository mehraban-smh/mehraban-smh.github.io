/* HomePulse (SWITCH home comfort study) - icons, picture-tile art, sensation faces, garments and the avatar.
 * Loaded before questions.js and app.js. Everything is drawn here as line art in the app's own style: the
 * 24-grid icons (ic) for buttons and rows, the 48-grid pictures (art) for the join wizard's tiles. */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

const P = {
  back:'<path d="M15 5l-7 7 7 7"/>',
  home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  brand:'<path d="M3.5 11L12 4l8.5 7"/><path d="M5.5 9.6V19a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.6"/><path class="glow" d="M7.2 14.6h2.4l1.5-3.4 2.1 6 1.5-4 1 1.4h1.6"/>',   /* the app icon: a house with a warm pulse line (HomePulse) */
  out:'<path d="M13 4h6v16h-6"/><path d="M3 12h10"/><path d="M10 9l3 3-3 3"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  snow:'<path d="M12 3v18M3 12h18M6 6l12 12M18 6L6 18"/><path d="M12 3l-2 2.5M12 3l2 2.5M12 21l-2-2.5M12 21l2-2.5M3 12l2.5-2M3 12l2.5 2M21 12l-2.5-2M21 12l-2.5 2"/>',
  check:'<path d="M5 12l5 5L20 7"/>',
  flame:'<path d="M12 3c.5 3.5 4.5 5 4.5 9.5a4.5 4.5 0 0 1-9 0c0-2 1-3.5 2-4.5 0 1.5 1 2.5 2 2.5.5-2-.5-4 .5-7.5z"/>',
  flameOff:'<path d="M12 3c.5 3.5 4.5 5 4.5 9.5a4.5 4.5 0 0 1-9 0c0-2 1-3.5 2-4.5 0 1.5 1 2.5 2 2.5.5-2-.5-4 .5-7.5z" opacity=".55"/><path d="M4 4l16 16"/>',
  tshirt:'<path d="M8 4l4 1.5L16 4l4 3-2 3-2-1v11H8V9l-2 1-2-3z"/>',
  long:'<path d="M8 4l4 1.5L16 4l4 3-1 8h-1v5H6v-5H5L4 7z"/>',
  jumper:'<path d="M8 4l4 1.5L16 4l4 3-1 8h-1v5H6v-5H5L4 7z"/><path d="M6 17h12"/><path d="M10 5.5c1 1 3 1 4 0"/>',
  hoodie:'<path d="M8 5l4 1.5L16 5l4 3-1 8h-1v4H6v-4H5L4 8z"/><path d="M9 5.5a3 3 0 0 1 6 0"/><path d="M9 14h6v3H9z"/>',
  shorts:'<path d="M6 4h12l1 9h-6l-1-4-1 4H5z"/>',
  trousers:'<path d="M7 3h10l1 18h-5l-1-9-1 9H6z"/>',
  joggers:'<path d="M7 3h10l1 18h-5l-1-9-1 9H6z"/><path d="M8 6h8"/><path d="M13 19h5M6 19h5"/>',
  skirt:'<path d="M8 4h8l3 14H5z"/><path d="M8 7h8"/>',
  pyjamas:'<path d="M7 2.5l3 1 2 1.5 2-1.5 3-1 3 2.5-1.5 5H17v3H7V10H5.5L4 5z"/><path d="M7 13h10l.6 8.5h-4.2L12 16l-1.4 5.5H6.4z"/><path d="M12 5.5v6"/><path d="M9 7v.01M15 7v.01"/>',
  coatL:'<path d="M8 3l4 2 4-2 4 3-1 9h-1v6h-4.5L12 9l-1.5 12H6v-6H5L4 6z"/><path d="M12 5v4"/>',
  coatW:'<path d="M8 2.5a4 3 0 0 1 8 0"/><path d="M7.5 3.5L12 6l4.5-2.5L20 6l-1 9h-1v7H6v-7H5L4 6z"/><path d="M12 6v16"/><path d="M8 15h2M14 15h2"/>',
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
  doorOpen:'<path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17"/><path d="M3 21h18"/><path d="M5 4l8 2.5v16"/><circle cx="11" cy="13" r=".8"/>',
  bath:'<path d="M4 12h16v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M6 12V6a2 2 0 0 1 4 0"/><path d="M7 20l-1 2M17 20l1 2"/>',
  up:'<path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z"/><path d="M7 11l4-7c1.5 0 2.5 1 2.5 2.5L13 10h5a2 2 0 0 1 2 2.3l-1 6a2 2 0 0 1-2 1.7H7"/>',
  down:'<g transform="rotate(180 12 12)"><path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z"/><path d="M7 11l4-7c1.5 0 2.5 1 2.5 2.5L13 10h5a2 2 0 0 1 2 2.3l-1 6a2 2 0 0 1-2 1.7H7"/></g>',
  still:'<path d="M4 12h16"/><path d="M8 8h8M8 16h8" opacity=".35"/>',
  slight:'<path d="M4 12h10a2 2 0 1 0-2-2"/>',
  draught:'<path d="M3 8h9a2 2 0 1 0-2-2"/><path d="M3 12h14a2 2 0 1 1-2 2"/><path d="M3 16h7a2 2 0 1 1-2 2"/>',
  drop:'<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  cloud:'<path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z"/>',
  moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  window:'<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M12 3v18M4 12h16"/>',
  windowOpen:'<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M4 12h16"/><path d="M12 12V3"/><path d="M12 12l5-2.5V3.5" opacity=".9"/><path d="M12 21v-9" opacity=".5"/>',
  radiator:'<rect x="3" y="7" width="18" height="10" rx="1"/><path d="M7 7v10M10.5 7v10M14 7v10M17.5 7v10"/>',
  heatUp:'<rect x="2" y="10" width="14" height="9" rx="1"/><path d="M5.5 10v9M9 10v9M12.5 10v9"/><path d="M19.5 15V4M16.5 7l3-3 3 3"/>',
  heatDown:'<rect x="2" y="10" width="14" height="9" rx="1"/><path d="M5.5 10v9M9 10v9M12.5 10v9"/><path d="M19.5 4v11M16.5 12l3 3 3-3"/>',
  fan:'<circle cx="12" cy="12" r="2"/><path d="M12 10c0-4-2-6-5-6 0 3 2 5 5 6zM14 12c4 0 6-2 6-5-3 0-5 2-6 5zM12 14c0 4 2 6 5 6 0-3-2-5-5-6zM10 12c-4 0-6 2-6 5 3 0 5-2 6-5z"/>',
  mug:'<path d="M4 8h12v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M16 10h2a2 2 0 0 1 0 4h-2"/><path d="M7 3c0 1.5 1 1.5 1 3M11 3c0 1.5 1 1.5 1 3"/>',
  glass:'<path d="M6 3h12l-1.5 17a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1z"/><path d="M7 9h10"/><rect x="10" y="12" width="4" height="4"/>',
  curtain:'<path d="M3 3h18"/><path d="M5 3c3 5 3 13 0 18M19 3c-3 5-3 13 0 18"/><path d="M5 21h14"/>',
  layerOn:'<path d="M8 4l4 1.5L16 4l4 3-2 3-2-1v11H8V9l-2 1-2-3z"/><path d="M12 12v6M9 15h6"/>',
  layerOff:'<path d="M8 4l4 1.5L16 4l4 3-2 3-2-1v11H8V9l-2 1-2-3z"/><path d="M9 15h6"/>',
  zzz:'<path d="M4 8h5l-5 6h5"/><path d="M13 4h4l-4 5h4"/><path d="M14 14h6l-6 6h6"/>',
  thermo:'<path d="M10 4a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/><path d="M12 9v6"/>',
  thermoLow:'<path d="M10 4a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/><path d="M12 13v3"/>',
  thermoHigh:'<path d="M10 4a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/><path d="M12 6v10"/>',
  fork:'<path d="M7 3v18"/><path d="M5 3v5a2 2 0 0 0 4 0V3"/><path d="M17 3c-2 0-3 3-3 6a3 3 0 0 0 3 3v9"/>',
  apple:'<path d="M12 8c-1.6-1.2-3.8-1.4-5.3-.3C4.4 9.3 4.6 13 5.6 15.8c.9 2.6 2.7 4.7 4.4 4.7.8 0 1.3-.4 2-.4s1.2.4 2 .4c1.7 0 3.5-2.1 4.4-4.7 1-2.8 1.2-6.5-1.1-8.1-1.5-1.1-3.7-.9-5.3.3z"/><path d="M12 8c0-2 .8-3.6 2.5-4.5"/>',
  checkc:'<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  refresh:'<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>',
  copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  bellOff:'<path d="M6 16V11a6 6 0 0 1 9.5-4.9M18 11v5l2 2H8"/><path d="M10 21h4"/><path d="M3 3l18 18"/>',
  bulb:'<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.6 1 1.5 1 2.5h6c0-1 .3-1.9 1-2.5A6 6 0 0 0 12 3z"/>',
  chev:'<path d="M9 5l7 7-7 7"/>',
  pause:'<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  pin:'<path d="M12 21s7-6.5 7-11.5a7 7 0 0 0-14 0C5 14.5 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M15.5 4.6a3.5 3.5 0 0 1 0 6.8M17.5 14.3c2.4.6 4 2.7 4 5.7"/>',
  child:'<circle cx="12" cy="9" r="3"/><path d="M7 21c0-3.3 2.2-6 5-6s5 2.7 5 6"/>',
  paw:'<circle cx="7" cy="10" r="1.8"/><circle cx="10.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/><circle cx="18" cy="10" r="1.8"/><path d="M12.5 11.5c-3 0-5.5 3.5-5.5 6 0 1.5 1.2 2.5 2.7 2.5 1 0 1.8-.5 2.8-.5s1.8.5 2.8.5c1.5 0 2.7-1 2.7-2.5 0-2.5-2.5-6-5.5-6z"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6"/><path d="M12 17h.01"/>',
  alert:'<path d="M12 3l9.5 17H2.5z"/><path d="M12 10v4.5M12 17.5h.01"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  minus:'<path d="M5 12h14"/>',
  edit:'<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  key:'<circle cx="8" cy="15" r="4.5"/><path d="M11.2 11.8L20 3M16.5 6.5l2.5 2.5M14 9l2 2"/>',
  lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  shield:'<path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  signout:'<path d="M14 4H5v16h9"/><path d="M10 12h11M18 8.5l3.5 3.5-3.5 3.5"/>',
  sliders:'<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  today:'<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><circle cx="12" cy="15" r="2.2"/>',
  flag:'<path d="M5 21V4"/><path d="M5 4c4-2 7 2 11 0 1-.5 2-.5 3 0v9c-1-.5-2-.5-3 0-4 2-7-2-11 0"/>',
  trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4M8.5 20.5h7M10 17h4v3.5h-4z"/>',
  star:'<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
  medal:'<path d="M8 3l4 6 4-6"/><circle cx="12" cy="15" r="6"/><path d="M12 12.5v5"/>',
  calendar:'<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  ruler:'<rect x="2.5" y="8" width="19" height="8" rx="1.5"/><path d="M6.5 8v3M10.5 8v4M14.5 8v3M18.5 8v4"/>',
  scale:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 10a4 4 0 0 1 7 0"/><path d="M12 10l1.5-2"/>',
  compass:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  leaf:'<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19l7-7"/>',
  power:'<path d="M12 3v8"/><path d="M7.5 6.2a7.5 7.5 0 1 0 9 0"/>',
  card:'<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
  doc:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  stat:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 7v2.5"/>',
  wall:'<path d="M3 4h18v16H3z"/><path d="M3 9.3h18M3 14.6h18M9 4v5.3M15 4v5.3M6 9.3v5.3M12 9.3v5.3M18 9.3v5.3M9 14.6V20M15 14.6V20"/>',
  hand:'<path d="M8 13V6a1.5 1.5 0 0 1 3 0v5M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V5.5a1.5 1.5 0 0 1 3 0V13M17 9.5a1.5 1.5 0 0 1 3 0V15a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-2.7L4.3 15.5a1.6 1.6 0 0 1 2.6-1.9L8 15"/>',
  undo:'<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  wifi:'<path d="M2 9a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0"/><path d="M12 19.5h.01"/>',
  eye:'<path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff:'<path d="M2 12s3.5-6.5 10-6.5c2 0 3.7.6 5.1 1.5M22 12s-3.5 6.5-10 6.5c-2 0-3.7-.6-5.1-1.5"/><path d="M3 3l18 18"/>',
  share:'<path d="M12 14V3.5M8.5 7L12 3.5 15.5 7"/><path d="M9 10H7a1.5 1.5 0 0 0-1.5 1.5V19A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5v-7.5A1.5 1.5 0 0 0 17 10h-2"/>',
  download:'<path d="M12 3v12M7.5 10.5L12 15l4.5-4.5"/><path d="M4 17v3h16v-3"/>'
};
const ic = (n, cls='') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[n] || P.info}</svg>`;

/* ---------- picture-tile art (48-grid), for the join wizard ----------
 * Same line weight as the icons at tile size. F is the soft teal fill that marks "this one" in a picture
 * (the participant's house in a terrace, their floor in a block); D fades the rest. */
const ART = (() => {
const F = 'fill="var(--art-fill)"', D = 'opacity=".42"';
const ground = '<path d="M3 42h42"/>';
const win = (x, y, s=4) => `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx=".6"/>`;
const unsureArt = '<circle cx="24" cy="24" r="16"/><path d="M19 19.5a5 5 0 1 1 7 4.6c-1.2.6-2 1.7-2 3v1.2"/><path d="M24 34h.01"/>';
const noneArt = '<circle cx="24" cy="24" r="16"/><path d="M12.7 35.3l22.6-22.6"/>';
const boiler = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/><path d="M${x+w/2} ${y+h*.32}c.6 2 3 3 3 5.6a3 3 0 0 1-6 0c0-1.3.6-2.2 1.3-2.8 0 1 .6 1.5 1.2 1.6.3-1.3-.2-2.6.5-4.4z"/><path d="M${x+4} ${y+h-5}h${w-8}"/>`;
const radiatorArt = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2"/>` + Array.from({length: Math.floor(w/5)-1}, (_, i) => `<path d="M${x+5*(i+1)} ${y}v${h}"/>`).join('');
const fireplace = inner => `<path d="M7 42V11h34v31"/><path d="M5 11h38"/><path d="M14 42V20h20v22"/>${inner}`;
const stoveArt = `<path d="M22 16V5h4v11"/><rect x="11" y="16" width="26" height="22" rx="2"/><rect x="16" y="21" width="16" height="11" rx="1.5"/><path d="M21 31l6-4M21 27l6 4"/><path d="M13 38v4M35 38v4"/>`;
const room = ico => `<g transform="translate(6 6) scale(1.5)">${P[ico]}</g>`;
return {
  unsure: unsureArt, none: noneArt,
  /* home types */
  'home_type:detached': `${ground}<path d="M12 42V22h24v20" ${F}/><path d="M8.5 23.5L24 10l15.5 13.5"/><path d="M31 15.5V10h4v9"/><path d="M21 42v-9h6v9"/>${win(15,26)}${win(29,26)}`,
  'home_type:semi': `${ground}<path d="M6 42V24h18v18" ${F}/><g ${D}><path d="M24 42V24h18v18"/>${win(35,28)}<path d="M28 42v-7h5v7"/></g><path d="M3 25.5L13.5 13h21L45 25.5"/><path d="M24 13v11"/>${win(9,28)}<path d="M16 42v-7h5v7"/>`,
  'home_type:end_terrace': `${ground}<path d="M5 42V24h14v18" ${F}/><g ${D}><path d="M19 42V24h13v18M32 42V24h13"/>${win(22,28,3.5)}<path d="M27 42v-6h3v6"/>${win(35,28,3.5)}<path d="M40 42v-6h3v6"/></g><path d="M3 25L9.5 15H47"/>${win(8,28,3.5)}<path d="M13 42v-6h3.5v6"/>`,
  'home_type:mid_terrace': `${ground}<path d="M17 42V24h14v18" ${F}/><g ${D}><path d="M3 24h14M3 42V24M31 24h14v18"/>${win(6,28,3.5)}<path d="M11 42v-6h3v6"/>${win(38,28,3.5)}<path d="M34 42v-6h3v6"/><path d="M1 15h4M43 15h4"/></g><path d="M5 15h38"/><path d="M3 24l2-9M45 24l-2-9"/>${win(20,28,3.5)}<path d="M25 42v-6h3.5v6"/>`,
  'home_type:bungalow': `${ground}<path d="M7 42V27h34v15" ${F}/><path d="M3.5 28.5L14 17h20l10.5 11.5"/><path d="M21.5 42v-8h5v8"/>${win(11,31)}${win(33,31)}`,
  'home_type:flat': `${ground}<path d="M12 42V7h24v35"/>${[11,18,25].map(y => win(15,y,4.5)+win(21.75,y,4.5)+win(28.5,y,4.5)).join('')}<rect x="21.75" y="18" width="4.5" height="4.5" rx=".6" ${F}/><path d="M21 42v-8h6v8"/>`,
  /* which floor the flat is on: the block with that floor marked; below the line is the basement */
  'flat_position:basement': `<path d="M10 6h28v38H10z"/><path d="M4 34h40"/><rect x="12" y="36" width="24" height="6" rx="1" ${F}/>${[9,17,26].map(y => win(14,y)+win(22,y)+win(30,y)).join('')}`,
  'flat_position:ground': `<path d="M10 6h28v38H10z"/><path d="M4 34h40"/><rect x="12" y="25" width="24" height="7.5" rx="1" ${F}/>${[9,17].map(y => win(14,y)+win(22,y)+win(30,y)).join('')}<path d="M21 34v-6h6v6"/>`,
  'flat_position:middle': `<path d="M10 6h28v38H10z"/><path d="M4 34h40"/><rect x="12" y="16" width="24" height="7.5" rx="1" ${F}/>${[9,27].map(y => win(14,y)+win(22,y)+win(30,y)).join('')}`,
  'flat_position:top': `<path d="M10 6h28v38H10z"/><path d="M4 34h40"/><rect x="12" y="7.5" width="24" height="7.5" rx="1" ${F}/>${[18,27].map(y => win(14,y)+win(22,y)+win(30,y)).join('')}`,
  /* tenure */
  'tenure:own': `<path d="M7 24L24 10l17 14"/><path d="M11 21v19h26V21"/><circle cx="20" cy="30" r="4.5" ${F}/><path d="M24.5 30H33M30 30v3.5M33 30v4"/>`,
  'tenure:housing_association': `<path d="M7 24L24 10l17 14"/><path d="M11 21v19h26V21"/><path d="M24 36s-7-4.4-7-9a3.6 3.6 0 0 1 7-1.2 3.6 3.6 0 0 1 7 1.2c0 4.6-7 9-7 9z" ${F}/>`,
  'tenure:council': `<path d="M6 17L24 8l18 9z" ${F}/><path d="M11 20v15M19 20v15M29 20v15M37 20v15"/><path d="M7 38h34M4 42h40"/>`,
  'tenure:private_rent': `${ground}<path d="M6 24L16 15l10 9"/><path d="M8.5 22v20h15V22"/><path d="M14 42v-7h4v7"/><rect x="29" y="16" width="15" height="10" rx="1.2" ${F}/><path d="M36.5 26v16"/><path d="M32 21h9"/>`,
  'tenure:shared_ownership': `<path d="M7 24L24 10l17 14"/><path d="M11 21.5V40h13V11.8" ${F}/><path d="M24 40h13V21.5"/><path d="M24 12v28"/>`,
  'tenure:other': `<circle cx="17" cy="15" r="5"/><path d="M7 38c0-6 4.5-10 10-10s10 4 10 10"/><circle cx="33" cy="19" r="4" ${F}/><path d="M25.5 38.5c.5-5 3.6-8 7.5-8s7.5 3 7.5 8"/>`,
  /* floors (storeys): the same house one to four storeys high */
  'floors:1': `${ground}<path d="M14 42V31h20v11" ${F}/><path d="M11 32l13-9 13 9"/>${win(17,34)}<path d="M25 42v-5h4v5"/>`,
  'floors:2': `${ground}<path d="M14 42V24h20v18" ${F}/><path d="M11 25l13-9 13 9"/><path d="M14 33h20"/>${win(17,27)}${win(27,27)}${win(17,35)}<path d="M25 42v-5h4v5"/>`,
  'floors:3': `${ground}<path d="M14 42V17h20v25" ${F}/><path d="M11 18l13-9 13 9"/><path d="M14 25.5h20M14 33.5h20"/>${win(17,20)}${win(27,20)}${win(17,28)}${win(27,28)}${win(17,36)}<path d="M25 42v-5h4v5"/>`,
  'floors:4': `${ground}<path d="M14 42V12h20v30" ${F}/><path d="M11 13l13-8 13 8"/><path d="M14 19.5h20M14 27h20M14 34.5h20"/>${win(17,14.5,3.5)}${win(27,14.5,3.5)}${win(17,22,3.5)}${win(27,22,3.5)}${win(17,29.5,3.5)}${win(27,29.5,3.5)}<path d="M25 42v-5h4v5"/>`,
  /* main heating */
  'heat:gas_combi': `${boiler(13,5,22,30)}<path d="M18 35v7M24 35v7M30 35v7"/>`,
  'heat:gas_tank': `${boiler(5,6,18,26)}<path d="M10 32v8M18 32v8"/><rect x="28" y="9" width="15" height="33" rx="7.5" ${F}/><path d="M28 18h15"/><path d="M23 20h5"/>`,
  'heat:oil': `${boiler(5,6,18,26)}<path d="M10 32v8M18 32v8"/><path d="M35 12s7 7.7 7 13a7 7 0 0 1-14 0c0-5.3 7-13 7-13z" ${F}/>`,
  'heat:lpg': `<rect x="14" y="13" width="20" height="29" rx="7" ${F}/><path d="M21 13V8h6v5M18 7.5h12"/><path d="M14 22h20M14 34h20"/>`,
  'heat:ashp': `<rect x="4" y="11" width="40" height="25" rx="3"/><circle cx="18" cy="23.5" r="8" ${F}/><circle cx="18" cy="23.5" r="1.5"/><path d="M18 22c0-3-1.5-4.5-4-4.5M19.5 23.5c3 0 4.5-1.5 4.5-4M18 25c0 3 1.5 4.5 4 4.5M16.5 23.5c-3 0-4.5 1.5-4.5 4"/><path d="M31 17h8M31 21.5h8M31 26h8M31 30.5h8"/><path d="M9 36v5M39 36v5"/>`,
  'heat:gshp': `<path d="M12 20L24 11l12 9"/><path d="M15 18v8h18v-8"/><path d="M3 26h42"/><path d="M10 30c0 9 5 9 5 0s5-9 5 0 5 9 5 0 5-9 5 0 5 9 5 0" ${D}/><path d="M24 26v4"/>`,
  'heat:storage': `<rect x="5" y="14" width="38" height="24" rx="3" ${F}/><path d="M10 19.5h28"/><path d="M11 25v8M16 25v8M21 25v8M26 25v8"/><circle cx="34" cy="29" r="3"/><path d="M9 38v4M39 38v4"/>`,
  'heat:electric': `${radiatorArt(5,14,34,20)}<path d="M9 34v6M35 34v6"/><path d="M42 6l-4 7h4l-3 6" />`,
  'heat:communal': `<path d="M5 42V13h18v29"/>${win(9,17)}${win(15,17)}${win(9,25)}${win(15,25)}${win(9,33)}${win(15,33)}<path d="M23 36h8"/><rect x="31" y="24" width="13" height="18" rx="2" ${F}/><path d="M37.5 28c.5 1.6 2.4 2.4 2.4 4.5a2.4 2.4 0 0 1-4.8 0c0-1 .5-1.7 1-2.2 0 .8.5 1.2 1 1.3.2-1-.2-2.1.4-3.6z"/>`,
  'heat:solid': stoveArt.replace('<rect x="16" y="21" width="16" height="11" rx="1.5"/>', `<rect x="16" y="21" width="16" height="11" rx="1.5" ${F}/>`),
  'heat:none': noneArt, 'heat:unsure': unsureArt,
  /* other heaters */
  'other:plugin': `<rect x="6" y="11" width="26" height="25" rx="5"/><circle cx="19" cy="23.5" r="7.5" ${F}/><path d="M14.5 21h9M14.5 24h9M14.5 27h9"/><path d="M32 30c6 0 8 3 8 7"/><path d="M36.5 37h7v5h-7zM38.5 42v3M41.5 42v3"/>`,
  'other:gas_fire': fireplace(`<path d="M24 25c.9 3 4.5 4.5 4.5 8.4a4.5 4.5 0 0 1-9 0c0-2 .9-3.3 2-4.2 0 1.5.9 2.3 1.8 2.4.4-2-.3-3.9.7-6.6z" ${F}/><path d="M16 39h16"/>`),
  'other:electric_fire': fireplace(`<path d="M17 27h14M17 32h14M17 37h14"/><rect x="16" y="24" width="16" height="16" rx="1" ${F} stroke="none" opacity=".7"/>`),
  'other:stove': stoveArt,
  'other:open_fire': fireplace(`<path d="M17 39l14-5M17 34l14 5"/><path d="M24 24c.8 2.6 3.8 3.8 3.8 7a3.8 3.8 0 0 1-7.6 0c0-1.7.8-2.8 1.7-3.6 0 1.3.8 2 1.5 2 .4-1.6-.2-3.2.6-5.4z" ${F}/>`),
  'other:electric_blanket': `<path d="M6 14a3 3 0 0 1 3-3h30a3 3 0 0 1 3 3v6H6z"/><path d="M6 20h36v16H6z" ${F}/><path d="M6 28h36"/><path d="M27 21l-4 7h4l-3 6"/><path d="M42 33c3 0 3 4 0 6"/>`,
  'other:none': noneArt,
  /* heating controls */
  'controls:room_stat': `<circle cx="24" cy="24" r="16"/><circle cx="24" cy="24" r="10" ${F}/><path d="M24 14v5"/><path d="M12 9.5l2 2.5M36 9.5l-2 2.5M8 24h3M37 24h3"/>`,
  'controls:smart': `<rect x="14" y="4" width="20" height="40" rx="4"/><path d="M21 8h6"/><circle cx="24" cy="25" r="8" ${F}/><path d="M24 20.5v4.5l2.5 1.5"/><path d="M17.5 37.5a9 9 0 0 1 13 0"/>`,
  'controls:programmer': `<rect x="4" y="12" width="40" height="24" rx="3"/><circle cx="16" cy="24" r="7" ${F}/><path d="M16 20v4l2.5 1.5"/><rect x="28" y="17" width="11" height="6" rx="1"/><path d="M29 29h3M35 29h3"/>`,
  'controls:trvs': `${radiatorArt(3,16,24,20)}<path d="M27 32h5"/><rect x="32" y="11" width="11" height="22" rx="4" ${F}/><path d="M32 16h11M32 21h11M32 26h11"/><path d="M37.5 33v9"/>`,
  'controls:none': noneArt, 'controls:unsure': unsureArt,
  /* thermostat screen */
  'stat_display:yes': `<rect x="7" y="9" width="34" height="30" rx="7"/><rect x="12" y="14" width="24" height="13" rx="2" ${F}/><text x="24" y="24.5" text-anchor="middle" class="art-num">21.5</text><path d="M16 33h4M28 33h4"/>`,
  'stat_display:no': `<circle cx="24" cy="24" r="16"/><circle cx="24" cy="24" r="9" ${F}/><path d="M24 15v5"/><path d="M14 33l2-2M34 33l-2-2"/>`,
  'stat_display:no_stat': noneArt,
  /* the radiator in the bedroom */
  'bedroom_trv:yes': `${radiatorArt(3,16,26,20)}<path d="M29 32h4"/><rect x="33" y="12" width="10" height="21" rx="4" ${F}/><path d="M33 17h10M33 22h10M33 27h10"/>`,
  'bedroom_trv:no': `${radiatorArt(6,15,36,20)}<path d="M10 35v5M38 35v5"/>`,
  'bedroom_trv:no_radiator': `<g ${D}>${radiatorArt(6,15,36,20)}</g><path d="M8 40L40 10"/>`,
  'bedroom_trv:unsure': unsureArt,
  /* walls: a cut through the wall, outside on the left, inside on the right */
  'wall:cavity': `<path d="M8 5v38M17 5v38M31 5v38M40 5v38"/><path d="M8 13h9M8 21h9M8 29h9M8 37h9M31 13h9M31 21h9M31 29h9M31 37h9"/><path d="M17 5h14v38H17z" ${F} stroke="none"/>${[10,17,24,31,38].map(y => `<circle cx="21" cy="${y}" r="1"/><circle cx="27" cy="${y+3}" r="1"/>`).join('')}`,
  'wall:external': `<path d="M11 5h8v38h-8z" ${F}/><path d="M19 5h14v38H19z"/><path d="M19 13h14M19 21h14M19 29h14M19 37h14M26 5v8M26 21v8M26 37v6M22.5 13v8M29.5 29v8"/>`,
  'wall:internal': `<path d="M13 5h14v38H13z"/><path d="M13 13h14M13 21h14M13 29h14M13 37h14M20 5v8M20 21v8M20 37v6M16.5 13v8M23.5 29v8"/><path d="M27 5h8v38h-8z" ${F}/>`,
  'wall:none': `<path d="M17 5h14v38H17z"/><path d="M17 13h14M17 21h14M17 29h14M17 37h14M24 5v8M24 21v8M24 37v6M20.5 13v8M27.5 29v8"/>`,
  'wall:unsure': unsureArt,
  /* the loft */
  'loft:yes': `<path d="M4 32L24 11l20 21"/><path d="M7 32h34"/><path d="M8 31.5c2-3 3-3 4-3s2 3 4 3 3-3 4-3 2 3 4 3 3-3 4-3 2 3 4 3 3-3 4-3 2 3 4 3" ${F}/><path d="M12 32v8h24v-8"/>`,
  'loft:no': `<path d="M4 32L24 11l20 21"/><path d="M7 32h34"/><path d="M12 32v8h24v-8"/><path d="M24 17v15" ${D}/>`,
  'loft:no_loft': `<path d="M9 6h30v36H9z"/><path d="M9 18h30M9 30h30"/><rect x="11" y="20" width="26" height="8" rx="1" ${F}/>${win(13,9)}${win(31,9)}${win(13,33)}${win(31,33)}`,
  'loft:unsure': unsureArt,
  /* glazing: the window and, beside it, its panes of glass seen from the edge */
  'glazing:single': `<rect x="5" y="9" width="24" height="30" rx="1.5"/><path d="M17 9v30M5 24h24"/><path d="M39 11v26" class="pane"/>`,
  'glazing:double': `<rect x="5" y="9" width="24" height="30" rx="1.5"/><path d="M17 9v30M5 24h24"/><path d="M35.5 11v26M41.5 11v26"/><path d="M35.5 11h6v26h-6z" ${F} stroke="none"/>`,
  'glazing:triple': `<rect x="5" y="9" width="24" height="30" rx="1.5"/><path d="M17 9v30M5 24h24"/><path d="M33 11v26M38.5 11v26M44 11v26"/><path d="M33 11h11v26H33z" ${F} stroke="none"/>`,
  'glazing:mixed': `<rect x="4" y="10" width="17" height="24" rx="1.5"/><path d="M12.5 10v24"/><rect x="27" y="10" width="17" height="24" rx="1.5" ${F}/><path d="M35.5 10v24"/><path d="M8 40h9M31 40h9M31 42.5h9"/>`,
  'glazing:unsure': unsureArt,
  /* can the windows be opened */
  'windows_open:yes': `<rect x="7" y="7" width="34" height="34" rx="1.5"/><path d="M24 7v34"/><path d="M7 7l9 5v34l-9-5" ${F}/><path d="M41 7l-9 5v34l9-5" ${F}/>`,
  'windows_open:some': `<rect x="5" y="9" width="17" height="30" rx="1.5"/><path d="M5 9l7 4v30l-7-4" ${F}/><rect x="26" y="9" width="17" height="30" rx="1.5"/><path d="M26 24h17"/>`,
  'windows_open:no': `<rect x="7" y="6" width="34" height="34" rx="1.5"/><path d="M24 6v34M7 23h34"/><rect x="28" y="28" width="12" height="10" rx="2" ${F}/><path d="M30.5 28v-2.5a3.5 3.5 0 0 1 7 0V28"/>`,
  /* damp or mould: the rooms */
  'damp:bedroom': room('bed'), 'damp:living': room('sofa'), 'damp:kitchen': room('pan'), 'damp:bathroom': room('bath'), 'damp:elsewhere': room('door'),
  'damp:none': `<circle cx="24" cy="24" r="16"/><path d="M16 24.5l5.5 5.5 11-12"/>`, 'damp:unsure': unsureArt,
  /* bedroom sharing: one to four people, you in teal */
  'share:0': `<circle cx="24" cy="16" r="6" ${F}/><path d="M12 40c0-7 5.4-12 12-12s12 5 12 12"/>`,
  'share:1': `<circle cx="17" cy="17" r="5.5" ${F}/><path d="M7 39c0-6.5 4.5-11 10-11s10 4.5 10 11"/><g ${D}><circle cx="32" cy="17" r="5.5"/><path d="M24 39c.5-6 4-11 8-11 5.5 0 10 4.5 10 11"/></g>`,
  'share:2': `<circle cx="13" cy="18" r="5" ${F}/><path d="M4 39c0-6 4-10 9-10s9 4 9 10"/><g ${D}><circle cx="24" cy="15" r="5"/><path d="M18 30c1.6-1.5 3.7-2.3 6-2.3 5 0 9 4 9 10"/><circle cx="35" cy="18" r="5"/><path d="M30 30c1.4-.7 3-1 5-1 5 0 9 4 9 10"/></g>`,
  'share:3': `<circle cx="11" cy="19" r="4.5" ${F}/><path d="M3 39c0-5.5 3.6-9.5 8-9.5s8 4 8 9.5"/><g ${D}><circle cx="20" cy="14" r="4.5"/><circle cx="29" cy="14" r="4.5"/><circle cx="38" cy="19" r="4.5"/><path d="M15 26c1.4-1.5 3-2.3 5-2.3M29 23.7c2 0 3.7.8 5 2.3M30 31c1.6-1 3.2-1.5 8-1.5 4.4 0 8 4 8 9.5"/></g><path d="M41 8v6M38 11h6" ${D}/>`,
  /* the compass in the middle of the direction picker */
  compass: `<circle cx="24" cy="24" r="15"/><path d="M24 9v4M24 35v4M9 24h4M35 24h4"/><path d="M24 14l4.5 10H19.5z" ${F}/><path d="M19.5 24h9L24 34z"/>`
};
})();
function art(name, cls=''){
  return `<svg class="art ${cls}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ART[name] || ART.unsure}</svg>`;
}
/* the EPC letter, in the certificate's own band colours (A green to G red) */
const EPC_COLOURS = { A:'#008054', B:'#19B459', C:'#8DCE46', D:'#FFD500', E:'#FCAA65', F:'#EF8023', G:'#E9153B' };
const epcArt = id => EPC_COLOURS[id] ? `<span class="epc-band" style="--epc:${EPC_COLOURS[id]}">${id}</span>` : art('unsure');

/* ---------- faces: thermal sensation (-3..+3) ---------- */
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
  return `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><circle cx="24" cy="24" r="21" fill="${fill}"/>
    <g fill="${ink}" stroke="${ink}" stroke-width="2.2" stroke-linecap="round">
      <circle cx="18" cy="22.5" r="2.2" stroke="none"/><circle cx="30" cy="22.5" r="2.2" stroke="none"/>
      <g fill="none">${mouth}${brows}</g></g>${extra}</svg>`;
}

/* ---------- clothing: garments and the avatar ----------
 * clo values: ASHRAE 55 (garments, long-sleeve pyjamas) and ISO 7730 (light jacket, coat); the blanket
 * and the duvet are estimates. */
const GARMENTS = [
  {id:'tshirt',      n:'T-shirt',          clo:0.08, ic:'tshirt'},
  {id:'long',        n:'Long sleeves',     clo:0.25, ic:'long'},
  {id:'jumper',      n:'Thick jumper',     clo:0.36, ic:'jumper'},
  {id:'hoodie',      n:'Hoodie / fleece',  clo:0.34, ic:'hoodie'},
  {id:'shorts',      n:'Shorts',           clo:0.08, ic:'shorts'},
  {id:'trousers',    n:'Jeans / trousers', clo:0.24, ic:'trousers'},
  {id:'joggers',     n:'Joggers',          clo:0.28, ic:'joggers'},
  {id:'skirt',       n:'Skirt / dress',    clo:0.23, ic:'skirt'},
  {id:'pyjamas',     n:'Pyjamas',          clo:0.57, ic:'pyjamas'},
  {id:'coat_light',  n:'Light jacket or summer coat', s:'Light jacket', clo:0.25, ic:'coatL'},
  {id:'coat_winter', n:'Winter coat',      clo:0.60, ic:'coatW'},
  {id:'socks',       n:'Socks',            clo:0.03, ic:'socks'},
  {id:'slippers',    n:'Slippers',         clo:0.03, ic:'slippers'},
  {id:'blanket',     n:'Blanket',          clo:0.60, ic:'blanket', est:true},
  {id:'duvet',       n:'Duvet',            clo:2.00, ic:'bed',     est:true}
];
/* the clothing screen shows the garments in boxes; "pair" boxes sit side by side */
const GARMENT_GROUPS = [
  {n:'Tops',                ic:'tshirt',  ids:['tshirt','long','jumper','hoodie']},
  {n:'Bottoms',             ic:'trousers',ids:['shorts','trousers','joggers','skirt']},
  {n:'Coats',               ic:'coatW',   ids:['coat_light','coat_winter'], pair:1},
  {n:'Nightwear',           ic:'pyjamas', ids:['pyjamas'], pair:1},
  {n:'Feet',                ic:'socks',   ids:['socks','slippers'], pair:2},
  {n:'Blankets and covers', ic:'blanket', ids:['blanket','duvet'], pair:2}
];
const cloOf = ids => Math.round((ids||[]).reduce((s,id)=>s+(GARMENTS.find(g=>g.id===id)?.clo||0),0)*100)/100;

/* A friendly front-facing figure. Garments are drawn in wearing order with a soft outline so layers read clearly. */
function avatar(ids){
  ids = ids || [];
  const has = id => ids.includes(id);
  const O = 'stroke="rgba(20,30,45,.22)" stroke-width="1.4" stroke-linejoin="round"';
  const R = (x,y,w,h,rx,c,extra='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${c}" ${O} ${extra}/>`;
  const skin = 'var(--skin)', hair = 'var(--hair)';
  const arms = (c, sleeve, w=16, x0=21.5) => `<g transform="rotate(7 30 54)">${R(x0,50,w,sleeve,7,c)}</g><g transform="rotate(-7 90 54)">${R(120-x0-w,50,w,sleeve,7,c)}</g>`;
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
  // legs: pyjama trousers first (anything else goes over them)
  const legsLong = c => `<path d="M41 104h38l1 84H61l-1-60-1 60H40z" fill="${c}" ${O}/>`;
  if(has('pyjamas'))  s += legsLong('var(--g-pyjamas)') + `<path d="M46 110v74M53 110v74M67 110v74M74 110v74" stroke="rgba(255,255,255,.4)" stroke-width="2"/>`;
  if(has('shorts'))   s += `<path d="M41 104h38l1 38H61l-1-14-1 14H40z" fill="var(--g-shorts)" ${O}/>`;
  if(has('trousers')) s += legsLong('var(--g-trousers)');
  if(has('joggers'))  s += legsLong('var(--g-joggers)') + `<path d="M42 180h17M61 180h17" stroke="rgba(20,30,45,.25)" stroke-width="2"/>`;
  if(has('skirt'))    s += `<path d="M40 104h40l8 56H32z" fill="var(--g-skirt)" ${O}/>`;
  // feet
  if(has('socks'))    s += R(43.5,172,14,17,5,'var(--g-socks)') + R(62.5,172,14,17,5,'var(--g-socks)');
  if(has('slippers')) s += `<ellipse cx="50" cy="191" rx="12" ry="6" fill="var(--g-slippers)" ${O}/><ellipse cx="70" cy="191" rx="12" ry="6" fill="var(--g-slippers)" ${O}/>`;
  // tops
  const top = (c, sleeve) => `<path d="M38 48Q60 40 82 48L86 106Q60 114 34 106Z" fill="${c}" ${O}/>` + arms(c, sleeve) +
    `<path d="M52 47q8 5 16 0" fill="none" stroke="rgba(20,30,45,.22)" stroke-width="1.4"/>`;
  if(has('pyjamas')) s += top('var(--g-pyjamas)', 64) + `<path d="M46 52v52M74 52v52M28 60l3 52M92 60l-3 52" stroke="rgba(255,255,255,.4)" stroke-width="2"/><circle cx="60" cy="62" r="1.6" fill="rgba(20,30,45,.35)"/><circle cx="60" cy="76" r="1.6" fill="rgba(20,30,45,.35)"/><circle cx="60" cy="90" r="1.6" fill="rgba(20,30,45,.35)"/>`;
  if(has('tshirt')) s += top('var(--g-tshirt)', 26);
  if(has('long'))   s += top('var(--g-long)', 64);
  if(has('jumper')) s += top('var(--g-jumper)', 66) + `<path d="M36 102h48" stroke="rgba(20,30,45,.25)" stroke-width="3"/>`;
  if(has('hoodie')) s += `<path d="M44 46a16 16 0 0 1 32 0v8H44z" fill="var(--g-hoodie)" ${O}/>` + top('var(--g-hoodie)', 68) + R(46,82,28,14,5,'rgba(20,30,45,.14)');
  // coats: over the tops, the light jacket open at the front to the hip, the winter coat closed to the knee
  if(has('coat_light'))  s += arms('var(--g-coat-light)', 68, 17, 20.5) +
    `<path d="M36 47Q47 42 56 45L55 116Q45 118 33 113Z" fill="var(--g-coat-light)" ${O}/><path d="M84 47Q73 42 64 45L65 116Q75 118 87 113Z" fill="var(--g-coat-light)" ${O}/>` +
    `<path d="M47 45l8 14M73 45l-8 14" stroke="rgba(20,30,45,.3)" stroke-width="1.6" fill="none"/><path d="M40 92h9M71 92h9" stroke="rgba(20,30,45,.28)" stroke-width="2"/>`;
  if(has('coat_winter')) s += arms('var(--g-coat-winter)', 70, 18, 19.5) +
    `<path d="M36 46Q60 37 84 46L91 152Q60 161 29 152Z" fill="var(--g-coat-winter)" ${O}/>` +
    `<path d="M44 47q16 12 32 0" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="5" stroke-linecap="round"/><path d="M60 52v100" stroke="rgba(255,255,255,.35)" stroke-width="1.6"/>` +
    `<path d="M41 112h10M69 112h10" stroke="rgba(255,255,255,.3)" stroke-width="2.4"/>`;
  // wraps
  if(has('blanket')) s += `<path d="M22 66Q60 46 98 66L104 198H16z" fill="var(--g-blanket)" ${O}/><path d="M28 100h64M26 130h68M24 160h72" stroke="rgba(20,30,45,.14)" stroke-width="3"/>`;
  if(has('duvet'))   s += R(12,58,96,148,22,'var(--g-duvet)') + `<path d="M12 110h96M12 160h96M60 58v148" stroke="rgba(20,30,45,.12)" stroke-width="2"/>`;
  return `<svg viewBox="0 0 120 208" aria-hidden="true" focusable="false">${s}</svg>`;
}
