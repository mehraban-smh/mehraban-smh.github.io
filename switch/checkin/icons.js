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
  snow:'<path class="i-c" d="M12 3v18M3 12h18M6 6l12 12M18 6L6 18"/><path class="i-c" d="M12 3l-2 2.5M12 3l2 2.5M12 21l-2-2.5M12 21l2-2.5M3 12l2.5-2M3 12l2.5 2M21 12l-2.5-2M21 12l-2.5 2"/>',
  check:'<path d="M5 12l5 5L20 7"/>',
  flame:'<path class="i-fl" d="M12 3c.5 3.5 4.5 5 4.5 9.5a4.5 4.5 0 0 1-9 0c0-2 1-3.5 2-4.5 0 1.5 1 2.5 2 2.5.5-2-.5-4 .5-7.5z"/>',
  flameOff:'<path class="i-d" d="M12 3c.5 3.5 4.5 5 4.5 9.5a4.5 4.5 0 0 1-9 0c0-2 1-3.5 2-4.5 0 1.5 1 2.5 2 2.5.5-2-.5-4 .5-7.5z" opacity=".6"/><path d="M4 4l16 16"/>',
  tshirt:'<path class="i-gm" style="--gc:var(--g-tshirt)" d="M8 4l4 1.5L16 4l4 3-2 3-2-1v11H8V9l-2 1-2-3z"/><path d="M10.2 5.2c.6 1 3 1 3.6 0" stroke-width="1.3"/>',
  long:'<path class="i-gm" style="--gc:var(--g-long)" d="M8 4l4 1.5L16 4l4 3-1 8h-1v5H6v-5H5L4 7z"/><path d="M5 13.5h1.6M17.4 13.5H19" stroke-width="1.3"/>',
  jumper:'<path class="i-gm" style="--gc:var(--g-jumper)" d="M8 4l4 1.5L16 4l4 3-1 8h-1v5H6v-5H5L4 7z"/><path d="M6 17h12M5 13.5h1.6M17.4 13.5H19"/><path d="M10 5.5c1 1 3 1 4 0"/><path d="M8.5 10h7" stroke-width="1.2" stroke-dasharray="1.4 1.4"/>',
  hoodie:'<path class="i-gm" style="--gc:var(--g-hoodie)" d="M8 5l4 1.5L16 5l4 3-1 8h-1v4H6v-4H5L4 8z"/><path d="M9 5.5a3 3 0 0 1 6 0"/><path d="M9 14h6v3H9z"/><path d="M11 7v3M13 7v3" stroke-width="1.2"/>',
  shorts:'<path class="i-gm" style="--gc:var(--g-shorts)" d="M6 4h12l1 9h-6l-1-4-1 4H5z"/><path d="M6 6.5h12" stroke-width="1.2"/>',
  trousers:'<path class="i-gm" style="--gc:var(--g-trousers)" d="M7 3h10l1 18h-5l-1-9-1 9H6z"/><path d="M7 5.5h10M12 3v4" stroke-width="1.2"/>',
  joggers:'<path class="i-gm" style="--gc:var(--g-joggers)" d="M7 3h10l1 18h-5l-1-9-1 9H6z"/><path d="M8 6h8"/><path d="M13 19h5M6 19h5"/><path d="M11 6.5l-.6 2M13 6.5l.6 2" stroke-width="1.2"/>',
  skirt:'<path class="i-gm" style="--gc:var(--g-skirt)" d="M8 4h8l3 14H5z"/><path d="M8 7h8"/><path d="M10 7l-1.4 11M14 7l1.4 11" stroke-width="1.2"/>',
  pyjamas:'<path class="i-gm" style="--gc:var(--g-pyjamas)" d="M7 2.5l3 1 2 1.5 2-1.5 3-1 3 2.5-1.5 5H17v3H7V10H5.5L4 5z"/><path class="i-gm" style="--gc:var(--g-pyjamas)" d="M7 13h10l.6 8.5h-4.2L12 16l-1.4 5.5H6.4z"/><path d="M12 5.5v6"/><path d="M10 4.4l2 1.6 2-1.6" stroke-width="1.2"/><path d="M9 7v.01M9 9.5v.01M15 7v.01M15 9.5v.01" stroke-width="1.8"/><path d="M8.5 15l-.4 5M15.5 15l.4 5" stroke-width="1.1"/>',
  coatL:'<path class="i-gm" style="--gc:var(--g-coat-light)" d="M8 3l4 2 4-2 4 3-1 9h-1v6h-4.5L12 9l-1.5 12H6v-6H5L4 6z"/><path d="M12 5v4"/><path d="M9.5 3.8l2.5 3 2.5-3" stroke-width="1.2"/><path d="M7.5 14h2.4M14.1 14h2.4" stroke-width="1.3"/>',
  coatW:'<path class="i-gm" style="--gc:var(--g-coat-winter)" d="M7.5 3.5L12 6l4.5-2.5L20 6l-1 9h-1v7H6v-7H5L4 6z"/><path d="M8 2.5a4 3 0 0 1 8 0"/><path class="i-p" d="M8.6 3.6a3.6 2.4 0 0 0 6.8 0" stroke-width="1.2"/><path d="M12 6v16"/><path d="M6.4 10.5h11.2M6.2 14.5h11.6M6 18.5h12" stroke-width="1.1"/>',
  socks:'<path class="i-gm" style="--gc:var(--g-socks)" d="M9 3h6v9l3 3a3 3 0 0 1-4 4l-5-4z"/><path d="M9 6h6"/><path d="M10.5 9h3" stroke-width="1.2"/>',
  slippers:'<path class="i-gm" style="--gc:var(--g-slippers)" d="M3 16c0-2 2-3 5-3h8c3 0 5 1 5 3v1H3z"/><path class="i-gm" style="--gc:var(--g-slippers)" d="M8 13V9a3 3 0 0 1 6 0v4"/><path d="M3 19h18" stroke-width="1.2"/>',
  blanket:'<path class="i-wf" d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3H4z"/><path class="i-wf" d="M4 10h16v8H4z"/><path d="M4 14h16"/><path class="i-w" d="M8 18v2M12 18v2M16 18v2" stroke-width="1.3"/>',
  bed:'<path d="M3 19v-9M21 13v6"/><rect class="i-p" x="4.5" y="10" width="6" height="3" rx="1.2"/><path class="i-f" d="M11 13v-1.6c0-.8.7-1.4 1.5-1.4H18a3 3 0 0 1 3 3z"/><path d="M3 13h18v4H3z"/>',
  sleep:'<path d="M3 9v11M21 15.5V20M3 17.5h18"/><path class="i-f" d="M8.5 17.5v-3.6c0-.8.6-1.4 1.4-1.4H19a2 2 0 0 1 2 2v3z"/><rect class="i-p" x="3" y="12.6" width="5" height="2.8" rx="1.2"/><circle class="i-hd" cx="5.6" cy="11.4" r="1.8"/><path class="i-c" d="M13.5 3.5h3.4l-3.4 4h3.4" stroke-width="1.5"/><path class="i-c" d="M18.4 7h2.2l-2.2 2.6h2.2" stroke-width="1.3"/>',
  lying:'<path class="i-f" d="M3 14h18v3H3z"/><path d="M3 11v8M21 11v8M3 17h18"/><circle class="i-hd" cx="6.2" cy="10.6" r="1.9"/><path d="M8.6 11.8h6.6l2.6-1.8 1.8 1.6"/>',
  actSit:'<path class="i-f" d="M4 13.5h12.5V17H4z"/><path d="M4 8.5V20M17.5 13.5V20M4 17h13.5"/><circle class="i-hd" cx="10" cy="4.6" r="2"/><path d="M10 7v5.5h5l1.5 5"/><path d="M10 8.8l3.4 2.2"/>',
  actDesk:'<circle class="i-hd" cx="12" cy="4.8" r="2.2"/><path d="M6.8 13c0-2.8 2.3-4.8 5.2-4.8s5.2 2 5.2 4.8"/><path class="i-g" d="M6 10.8h12v6.6H6z"/><path d="M2.5 19.8h19"/><path d="M4.5 17.4h15"/>',
  sofa:'<path class="i-f" d="M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3"/><path class="i-f" d="M3 13a2 2 0 0 1 4 0v3h10v-3a2 2 0 0 1 4 0v5H3z"/><path d="M5 18v2M19 18v2"/>',
  laptop:'<rect class="i-g" x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/><path d="M4 16l-1.6 3M20 16l1.6 3"/>',
  stand:'<circle class="i-hd" cx="12" cy="4.5" r="2"/><path class="i-f" d="M10 7.5h4l.6 6.5H9.4z"/><path d="M12 7v7"/><path d="M8 10l4-2.5 4 2.5"/><path d="M12 14l-2.6 7M12 14l2.6 7"/>',
  pan:'<path class="i-f" d="M4.5 11.5h11v2.5a3 3 0 0 1-3 3h-5a3 3 0 0 1-3-3z"/><path d="M15.5 12.5h5"/><path d="M3 20.5h18"/><path class="i-fl" d="M7.5 20.5c-.6-1 .2-1.6.4-2.4.6.6.8 1 .7 1.6M12 20.5c-.6-1 .2-1.6.4-2.4.6.6.8 1 .7 1.6" stroke-width="1.2"/><path class="i-w" d="M8 3.5c0 1.5 1 1.5 1 3M11.5 3c0 1.5 1 1.5 1 3" stroke-width="1.5"/>',
  walk:'<circle class="i-hd" cx="13" cy="4" r="2"/><path d="M12 7l-3 5 2 2v6"/><path d="M12 7l3 3 3 1"/><path d="M9 12l-3 2"/><path d="M11 14l4 3 1 4"/>',
  gym:'<rect class="i-f" x="4" y="7.5" width="3.2" height="9" rx="1"/><rect class="i-f" x="16.8" y="7.5" width="3.2" height="9" rx="1"/><path d="M1.8 10v4M22.2 10v4M7.2 12h9.6"/>',
  door:'<path class="i-f" d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17z"/><path d="M3 21h18"/><circle cx="15" cy="12" r="1"/>',
  doorOpen:'<path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17"/><path d="M3 21h18"/><path class="i-sk" d="M6 4h12v17H6z"/><path class="i-f" d="M5 4l8 2.5v16L5 21z"/><circle cx="11" cy="13" r=".8"/>',
  bath:'<path class="i-f" d="M3.5 12h17v3a5 5 0 0 1-5 5h-7a5 5 0 0 1-5-5z"/><path class="i-c" d="M6.5 14.4h11" stroke-width="1.3"/><path d="M6 12V6a2 2 0 0 1 4 0"/><path d="M7 20l-1 2M17 20l1 2"/>',
  up:'<path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z"/><path d="M7 11l4-7c1.5 0 2.5 1 2.5 2.5L13 10h5a2 2 0 0 1 2 2.3l-1 6a2 2 0 0 1-2 1.7H7"/>',
  down:'<g transform="rotate(180 12 12)"><path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z"/><path d="M7 11l4-7c1.5 0 2.5 1 2.5 2.5L13 10h5a2 2 0 0 1 2 2.3l-1 6a2 2 0 0 1-2 1.7H7"/></g>',
  still:'<path class="i-f" d="M9.5 13.5h5V21h-5z"/><path d="M8 21h8"/><path d="M12 13.5v-1.2"/><path class="i-fl" d="M12 3.6c1.5 2 2.4 3.4 2.4 5a2.4 2.4 0 0 1-4.8 0c0-1.6.9-3 2.4-5z"/>',
  slight:'<path class="i-f" d="M9.5 13.5h5V21h-5z"/><path d="M8 21h8"/><path d="M12 13.5v-1.2"/><g transform="rotate(14 12 11)"><path class="i-fl" d="M12 3.6c1.5 2 2.4 3.4 2.4 5a2.4 2.4 0 0 1-4.8 0c0-1.6.9-3 2.4-5z"/></g><path class="i-c" d="M2.5 7.5c1.5-.8 3-.8 4.5 0" stroke-width="1.5"/>',
  draught:'<path class="i-f" d="M9.5 13.5h5V21h-5z"/><path d="M8 21h8"/><path d="M12 13.5v-1.2"/><g transform="rotate(48 12 11.5)"><path class="i-fl" d="M12 3.6c1.5 2 2.4 3.4 2.4 5a2.4 2.4 0 0 1-4.8 0c0-1.6.9-3 2.4-5z"/></g><path class="i-c" d="M2 5c1.5-.9 3-.9 4.5 0M1.5 9c2-.9 3.8-.9 5.5 0M2.5 13c1.3-.7 2.6-.7 4 0" stroke-width="1.5"/>',
  drop:'<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  sun:'<circle class="i-wf" cx="12" cy="12" r="4.2"/><path class="i-w" d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7"/>',
  cloud:'<circle class="i-wf" cx="16.5" cy="7.5" r="3.2"/><path class="i-w" d="M16.5 2v1.2M21.6 7.5h1.2M20.1 3.9l.9-.9" stroke-width="1.5"/><path class="i-f" d="M7 19a4 4 0 0 1-.5-8A6 6 0 0 1 17.6 10a4.5 4.5 0 0 1-.1 9z"/>',
  moon:'<path class="i-f" d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/><path class="i-w" d="M17 3.5v3M15.5 5h3M20.5 9.2v2M19.5 10.2h2" stroke-width="1.4"/>',
  window:'<rect class="i-g" x="4" y="3" width="16" height="18" rx="1"/><path d="M12 3v18M4 12h16"/>',
  windowOpen:'<rect class="i-sk" x="4" y="3" width="16" height="18" rx="1"/><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M4 12h16M12 12V3"/><path class="i-g" d="M12 12l5.5-2.4V3.6L12 3z"/><path class="i-c" d="M14 15.5c1.2-.7 2.4-.7 3.6 0M14 18.2c1.2-.7 2.4-.7 3.6 0" stroke-width="1.3"/>',
  radiator:'<rect x="3" y="7" width="18" height="10" rx="1"/><path d="M7 7v10M10.5 7v10M14 7v10M17.5 7v10"/>',
  heatUp:'<rect class="i-wf" x="2" y="10" width="14" height="9" rx="1"/><path d="M5.5 10v9M9 10v9M12.5 10v9"/><path class="i-w" d="M19.5 15V4M16.5 7l3-3 3 3"/>',
  heatDown:'<rect class="i-f" x="2" y="10" width="14" height="9" rx="1"/><path d="M5.5 10v9M9 10v9M12.5 10v9"/><path class="i-c" d="M19.5 4v11M16.5 12l3 3 3-3"/>',
  fan:'<circle cx="12" cy="10" r="1.8"/><path class="i-f" d="M12 8.2c0-3.6-1.8-5.4-4.5-5.4 0 2.7 1.8 4.5 4.5 5.4zM13.8 10c3.6 0 5.4-1.8 5.4-4.5-2.7 0-4.5 1.8-5.4 4.5zM12 11.8c0 3.6 1.8 5.4 4.5 5.4 0-2.7-1.8-4.5-4.5-5.4zM10.2 10c-3.6 0-5.4 1.8-5.4 4.5 2.7 0 4.5-1.8 5.4-4.5z"/><path d="M12 12v8M8.5 21h7"/>',
  mug:'<path class="i-wf" d="M4 8h12v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M16 10h2a2 2 0 0 1 0 4h-2"/><path class="i-w" d="M7 2.5c0 1.5 1 1.5 1 3M11 2.5c0 1.5 1 1.5 1 3" stroke-width="1.5"/>',
  glass:'<path d="M6 3h12l-1.5 17a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1z"/><path class="i-cf" d="M6.9 10h10.2l-.9 9.6a.8.8 0 0 1-.8.7H8.6a.8.8 0 0 1-.8-.7z"/><rect class="i-p" x="10" y="12" width="3.6" height="3.6" rx=".6" transform="rotate(12 11.8 13.8)"/>',
  curtain:'<path class="i-sk" d="M5 3h14v18H5z"/><path d="M3 3h18"/><path class="i-f" d="M5 3c3 5 3 13 0 18h4.5c1-6 .5-12-1-18zM19 3c-3 5-3 13 0 18h-4.5c-1-6-.5-12 1-18z"/><path d="M5 21h14"/>',
  layerOn:'<path class="i-f" d="M8 4l4 1.5L16 4l4 3-2 3-2-1v11H8V9l-2 1-2-3z"/><path class="i-w" d="M12 11.5v6M9 14.5h6"/>',
  layerOff:'<path class="i-f" d="M8 4l4 1.5L16 4l4 3-2 3-2-1v11H8V9l-2 1-2-3z"/><path class="i-c" d="M9 14.5h6"/>',
  zzz:'<path class="i-c" d="M4 8h5l-5 6h5"/><path class="i-c" d="M13 4h4l-4 5h4"/><path d="M14 14h6l-6 6h6"/>',
  unwell:'<circle class="i-f" cx="11" cy="12" r="8.5"/><path d="M8 10h.01M14 10h.01" stroke-width="2.4"/><path d="M8.2 15.6c1.6-1.2 4-1.2 5.6 0"/><path class="i-wf" d="M17.5 13.5l4-4a1.2 1.2 0 0 1 1.7 1.7l-4 4z"/><circle class="i-fl" cx="17.3" cy="15.6" r="1.4"/>',
  thermo:'<path class="i-p" d="M10 4a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/><path class="i-w" d="M12 9v6"/><circle class="i-fl" cx="12" cy="16.6" r="1.8"/>',
  thermoLow:'<path class="i-p" d="M10 4a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/><path class="i-c" d="M12 13v3"/><circle class="i-cf" cx="12" cy="16.6" r="1.8"/>',
  thermoHigh:'<path class="i-p" d="M10 4a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/><path class="i-w" d="M12 6v10"/><circle class="i-fl" cx="12" cy="16.6" r="1.8"/>',
  fork:'<circle class="i-f" cx="12.5" cy="13" r="6"/><circle cx="12.5" cy="13" r="3.4"/><path d="M3.5 4v16M2 4v3.5a1.5 1.5 0 0 0 3 0V4"/><path d="M21.5 4c-1.4 0-2.2 2.2-2.2 4.4a2 2 0 0 0 2.2 2V20"/>',
  apple:'<path class="i-wf" d="M12 8c-1.6-1.2-3.8-1.4-5.3-.3C4.4 9.3 4.6 13 5.6 15.8c.9 2.6 2.7 4.7 4.4 4.7.8 0 1.3-.4 2-.4s1.2.4 2 .4c1.7 0 3.5-2.1 4.4-4.7 1-2.8 1.2-6.5-1.1-8.1-1.5-1.1-3.7-.9-5.3.3z"/><path d="M12 8c0-2 .8-3.6 2.5-4.5"/><path class="i-lf" d="M12.6 6.2c1.6-.2 2.8-1.2 3-2.8-1.6.1-2.8 1-3 2.8z" stroke-width="1.2"/>',
  checkc:'<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  refresh:'<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>',
  copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  bellOff:'<path d="M6 16V11a6 6 0 0 1 9.5-4.9M18 11v5l2 2H8"/><path d="M10 21h4"/><path d="M3 3l18 18"/>',
  phone:'<rect class="i-f" x="6.5" y="2.5" width="11" height="19" rx="2.2"/><path d="M10.4 5.2h3.2"/><circle cx="12" cy="18.3" r=".9"/><circle class="i-fl" cx="16.8" cy="5.6" r="2.4"/>',
  bulb:'<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.6 1 1.5 1 2.5h6c0-1 .3-1.9 1-2.5A6 6 0 0 0 12 3z"/>',
  chev:'<path d="M9 5l7 7-7 7"/>',
  pause:'<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  pin:'<path d="M12 21s7-6.5 7-11.5a7 7 0 0 0-14 0C5 14.5 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  user:'<path class="i-f" stroke="none" d="M4 21c0-4 3.5-7 8-7s8 3 8 7z"/><circle class="i-hd" cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M15.5 4.6a3.5 3.5 0 0 1 0 6.8M17.5 14.3c2.4.6 4 2.7 4 5.7"/>',
  child:'<path class="i-f" stroke="none" d="M7 21c0-3.3 2.2-6 5-6s5 2.7 5 6z"/><circle class="i-hd" cx="12" cy="9" r="3"/><path d="M7 21c0-3.3 2.2-6 5-6s5 2.7 5 6"/>',
  paw:'<circle class="i-wf" cx="7" cy="10" r="1.8"/><circle class="i-wf" cx="10.5" cy="6.5" r="1.8"/><circle class="i-wf" cx="14.5" cy="6.5" r="1.8"/><circle class="i-wf" cx="18" cy="10" r="1.8"/><path class="i-wf" d="M12.5 11.5c-3 0-5.5 3.5-5.5 6 0 1.5 1.2 2.5 2.7 2.5 1 0 1.8-.5 2.8-.5s1.8.5 2.8.5c1.5 0 2.7-1 2.7-2.5 0-2.5-2.5-6-5.5-6z"/>',
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
  wallCold:'<rect class="i-cf" x="2.5" y="3" width="19" height="18" rx="1"/><path class="i-brl" d="M2.5 9h19M2.5 15h19M8 3v6M16 3v6M12 9v6M5 15v6M19 15v6" stroke-width="1"/><path class="i-hd" d="M9.2 21.5v-8a1.3 1.3 0 0 1 2.6 0V9.8a1.3 1.3 0 0 1 2.6 0v.6a1.3 1.3 0 0 1 2.6 0v1a1.3 1.3 0 0 1 2.6 0v5.2c0 2.7-2 4.9-4.8 4.9zM9.2 17.2l-1.8-2a1.25 1.25 0 0 0-1.9 1.6l3.7 4.7"/><path class="i-c" d="M5.5 3.8v5.4M2.8 6.5h5.4M3.6 4.6l3.8 3.8M7.4 4.6L3.6 8.4" stroke-width="1.4"/>',
  wallCool:'<rect class="i-cf" x="2.5" y="3" width="19" height="18" rx="1"/><path class="i-brl" d="M2.5 9h19M2.5 15h19M8 3v6M16 3v6M12 9v6M5 15v6M19 15v6" stroke-width="1"/><path class="i-hd" d="M9.2 21.5v-8a1.3 1.3 0 0 1 2.6 0V9.8a1.3 1.3 0 0 1 2.6 0v.6a1.3 1.3 0 0 1 2.6 0v1a1.3 1.3 0 0 1 2.6 0v5.2c0 2.7-2 4.9-4.8 4.9zM9.2 17.2l-1.8-2a1.25 1.25 0 0 0-1.9 1.6l3.7 4.7"/><path class="i-c" d="M3.4 5h4.4M3.4 8h3" stroke-width="1.6"/>',
  wallNeutral:'<rect class="i-br" x="2.5" y="3" width="19" height="18" rx="1"/><path class="i-brl" d="M2.5 9h19M2.5 15h19M8 3v6M16 3v6M12 9v6M5 15v6M19 15v6" stroke-width="1"/><path class="i-hd" d="M9.2 21.5v-8a1.3 1.3 0 0 1 2.6 0V9.8a1.3 1.3 0 0 1 2.6 0v.6a1.3 1.3 0 0 1 2.6 0v1a1.3 1.3 0 0 1 2.6 0v5.2c0 2.7-2 4.9-4.8 4.9zM9.2 17.2l-1.8-2a1.25 1.25 0 0 0-1.9 1.6l3.7 4.7"/>',
  wallWarm:'<rect class="i-wf" x="2.5" y="3" width="19" height="18" rx="1"/><path class="i-brl" d="M2.5 9h19M2.5 15h19M8 3v6M16 3v6M12 9v6M5 15v6M19 15v6" stroke-width="1"/><path class="i-hd" d="M9.2 21.5v-8a1.3 1.3 0 0 1 2.6 0V9.8a1.3 1.3 0 0 1 2.6 0v.6a1.3 1.3 0 0 1 2.6 0v1a1.3 1.3 0 0 1 2.6 0v5.2c0 2.7-2 4.9-4.8 4.9zM9.2 17.2l-1.8-2a1.25 1.25 0 0 0-1.9 1.6l3.7 4.7"/><path class="i-w" d="M4.4 9.4c-1.2-1.4 1.2-2.1 0-3.6M7.4 9.4c-1.2-1.4 1.2-2.1 0-3.6" stroke-width="1.6"/>',
  wallFar:'<rect class="i-br" x="15" y="3" width="6.5" height="18" rx="1"/><path class="i-brl" d="M15 7.5h6.5M15 12h6.5M15 16.5h6.5M18 3v4.5M18 12v4.5" stroke-width="1"/><path class="i-hd" d="M2.5 21v-8.4a1.2 1.2 0 0 1 2.4 0V9.4a1.2 1.2 0 0 1 2.4 0v1.6a1.2 1.2 0 0 1 2.4 0v5.4c0 2.6-1.8 4.6-4.4 4.6z"/><path class="i-d" d="M10.5 12.5h3.5" stroke-dasharray="1.2 1.6"/><path d="M11 4l3 3M14 4l-3 3" stroke-width="1.5"/>',
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
/* ---- houses: ground, sash windows, doors, chimneys, trees ---- */
const gnd = '<path class="a-d a-t1" d="M2 42.5h44"/>';
const sash = (x, y, w=4.6, h=4.6) => `<rect class="a-gl a-t1" x="${x}" y="${y}" width="${w}" height="${h}" rx=".5"/><path class="a-gll a-t0" d="M${x} ${n1(y + h / 2)}h${w}"/>`;
const door = (x, y, w) => `<path class="a-wd a-t1" d="M${x} 42.5V${n1(y + w / 2)}a${w / 2} ${w / 2} 0 0 1 ${w} 0V42.5"/>`;
const chim = (x, y, h=7) => `<path class="a-br a-t1" d="M${x} ${y + h}V${y}h3.6v${h}"/><path class="a-t1" d="M${x + .9} ${y}v-1.5M${x + 2.7} ${y}v-1.5"/>`;
const tree = x => `<path class="a-wdl a-t1" d="M${x} 42.5v-6"/><circle class="a-lf a-t1" cx="${x}" cy="31.5" r="5"/>`;
/* a two-storey bay window (the 1930s semi, the terraces), w wide from x */
const bay = (x, w=8) => `<path class="a-p a-t1" d="M${x} 42.5V25h${w}v17.5"/><path class="a-t1" d="M${x - .6} 25h${w + 1.2}"/>${sash(x + 1.2, 26.4, w - 2.4, 5.4)}${sash(x + 1.2, 34.6, w - 2.4, 5.4)}`;
/* one terraced house front, 14 wide from x: two windows up, a window and a door down */
const terr = x => `${sash(x + 2, 25.6, 4, 4.4)}${sash(x + 8, 25.6, 4, 4.4)}${sash(x + 2, 34.4, 4.6, 5)}${door(x + 8.2, 34.2, 3.8)}<path class="a-t1" d="M${x} 22.5v20"/>`;
const house = fill => `${gnd}<path class="a-rf a-t1" d="M5 24L24 9l19 15z"/><rect class="${fill} a-ns" x="8.5" y="24" width="31" height="18.5"/><path d="M8.5 42.5V24h31v18.5"/>`;
/* the flat's floor in a block cut through: y is the top of the marked floor (basement 35, ground 25 ...) */
const flatPos = y => `<path class="a-ea" d="M2 35h44v11H2z"/><rect class="a-wl a-ns" x="11" y="5" width="26" height="39"/><rect class="a-f a-ns" x="11" y="${y}" width="26" height="${y === 35 ? 9 : 10}"/>` +
  [5, 15, 25, 35].map(t => sash(14.5, t + 2.8, 5, 4.6) + sash(28.5, t + 2.8, 5, 4.6)).join('') + `${y === 25 ? '' : '<path class="a-wd a-t1" d="M22 35v-6h4v6"/>'}` +
  `<path class="a-t1" d="M11 15h26M11 25h26M11 35h26"/><path d="M11 44V5h26v39M9.5 5h29"/><path class="a-d" d="M2 35h9M37 35h9"/><rect class="a-t3" x="11" y="${y}" width="26" height="${y === 35 ? 9 : 10}"/>`;
/* storeys: the same house, n floors high */
const storeys = n => { const top = 42.5 - n * 8 - 1.5, rows = Array.from({length: n}, (_, i) => 42.5 - (i + 1) * 8 + 1.6);
  return `${gnd}${chim(29, top - 9.5, 7)}<path class="a-rf a-t1" d="M11 ${top}l13-9 13 9z"/><rect class="a-f a-ns" x="14" y="${top}" width="20" height="${42.5 - top}"/>` +
    rows.map((y, i) => sash(16.6, y, 4.4, 4.6) + (i ? sash(27, y, 4.4, 4.6) : '')).join('') + door(27, 35.6, 4.2) +
    rows.slice(1).map((y, i) => `<path class="a-t1" d="M14 ${n1(42.5 - (i + 1) * 8)}h20"/>`).join('') + `<path d="M14 42.5V${top}h20v${42.5 - top}"/>`; };
/* heating: a wall boiler (white box, display, the flame window), a gas bottle, a stove, a dial, a clock */
const wallBoiler = (x, y, w, h) => `<rect class="a-p" x="${x}" y="${y}" width="${w}" height="${h}" rx="2.5"/><rect class="a-k" x="${x + w * .22}" y="${y + h * .62}" width="${w * .56}" height="${h * .12}" rx=".8" opacity=".85"/>` +
  `<path class="a-fl a-t1" d="M${x + w / 2} ${y + h * .2}c.7 2 3 3 3 5.4a3 3 0 0 1-6 0c0-1.4.7-2.3 1.4-2.9 0 1 .6 1.6 1.2 1.7.3-1.3-.2-2.6.4-4.2z"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.5"/>`;
const bottle = x => `<path class="a-wf" d="M${x} 42V15a6 6 0 0 1 6-6h3a6 6 0 0 1 6 6v27z"/><path class="a-w a-t0" d="M${x} 20h15M${x} 36h15"/><path class="a-mt a-t1" d="M${x + 5} 9V5.5h5V9"/>`;
const stoveFire = `<path class="a-mtl a-t1" d="M21 15V3h6v12"/><rect class="a-mt" x="9" y="15" width="30" height="23" rx="2.5"/><rect class="a-k" x="14" y="20" width="20" height="13" rx="1.5" opacity=".18"/><path class="a-wd a-t1" d="M16 31.5l16-3M16 28.5l16 3"/><path class="a-fl a-t1" d="M20.5 29.5c-1.3-1.8.4-2.8.8-4.6 1 1 1.4 1.8 1.2 2.6.8-1.4.6-2.8 1.6-4.2 1.3 1.8 2.2 3.2 2 4.8.7-.6 1-1.5 1.2-2.6 1.4 1.8 1.6 3.2.6 4.4z"/><rect class="a-t1" x="14" y="20" width="20" height="13" rx="1.5"/><path class="a-t1" d="M12 38v4.5M36 38v4.5"/>`;
const statDial = (cx, cy, r) => `<circle class="a-p" cx="${cx}" cy="${cy}" r="${r}"/><circle class="a-f a-t1" cx="${cx}" cy="${cy}" r="${n1(r * .62)}"/><path d="M${cx} ${n1(cy - r * .62)}v${n1(r * .38)}"/><circle cx="${cx}" cy="${cy}" r="${r}"/>`;
/* a clock face; arcs [[from, to], ...] in hours are shaded warm (the hours the heating runs) */
const clockArt = arcs => { const R = 19, pt = h => [n1(24 + Math.sin(h * Math.PI / 6) * R), n1(24 - Math.cos(h * Math.PI / 6) * R)];
  const sect = ([a, b]) => { const [x0, y0] = pt(a), [x1, y1] = pt(b); return `<path class="a-wf a-t1" d="M24 24L${x0} ${y0}A${R} ${R} 0 ${b - a > 6 ? 1 : 0} 1 ${x1} ${y1}z"/>`; };
  return `<circle class="a-p" cx="24" cy="24" r="${R}"/>${arcs.map(sect).join('')}${Array.from({length: 12}, (_, i) => { const a = i * Math.PI / 6, r0 = i % 3 ? 17 : 15.4; return `<path class="a-t1" d="M${n1(24 + Math.sin(a) * r0)} ${n1(24 - Math.cos(a) * r0)}L${n1(24 + Math.sin(a) * R)} ${n1(24 - Math.cos(a) * R)}"/>`; }).join('')}<circle cx="24" cy="24" r="${R}"/><circle class="a-tf" cx="24" cy="24" r="1.4"/>`; };
/* a bed seen from its foot: headboard, pillows with heads on them, the duvet; you is the first head */
const bed = (x, w, heads, small) => { const hs = Array.from({length: heads}, (_, i) => x + w * (i + .5) / heads);
  return `<rect class="a-wd a-t1" x="${x}" y="${small ? 20 : 15}" width="${w}" height="${small ? 12 : 15}" rx="2"/>` +
    hs.map((hx, i) => `<rect class="a-p a-t1" x="${n1(hx - 4.4)}" y="${small ? 25.5 : 24}" width="8.8" height="4.4" rx="1.8"/><circle class="${i === 0 && !small ? 'a-f' : 'a-wf'} a-t1" cx="${n1(hx)}" cy="${small ? 25 : 23.4}" r="3"/>`).join('') +
    `<path class="a-f a-t1" d="M${x - 1} ${small ? 29 : 28}h${w + 2}l1.4 10H${x - 2.4}z"/><path class="a-t1" d="M${x + 1.5} ${small ? 33 : 32.4}h${w - 3}"/><path class="a-t1" d="M${x} 38v4M${x + w} 38v4"/>`; };
/* ---- Step 7 helpers: materials drawn in section, badges, rooms ---- */
const n1 = v => +v.toFixed(2);
/* a leaf of masonry cut through: the courses, and for a solid (two-brick) wall a joint down every other course */
const leaf = (x, w, y0, y1, ch, m, mid) => { let j = '';
  for(let y = y0 + ch; y < y1 - .5; y += ch) j += `M${x} ${n1(y)}h${w}`;
  if(mid) for(let y = y0, k = 0; y < y1 - .5; y += ch, k++) if(k % 2) j += `M${x + w/2} ${n1(y)}V${n1(Math.min(y + ch, y1))}`;
  return `<rect class="a-${m} a-t1" x="${x}" y="${y0}" width="${w}" height="${y1 - y0}"/><path class="a-${m}l a-t0" d="${j}"/>`; };
/* insulation: a soft yellow band with the drawing-office zigzag, upright (V) or lying (H) */
const insV = (x, w, y0, y1) => { let d = `M${x + 1} ${y0}`, i = 0; for(let y = y0; y < y1;){ y = Math.min(y1, y + 2.6); d += `L${i++ % 2 ? x + 1 : x + w - 1} ${n1(y)}`; }
  return `<rect class="a-in a-t1" x="${x}" y="${y0}" width="${w}" height="${y1 - y0}"/><path class="a-inl a-t0" d="${d}"/>`; };
const insH = (pts, x0, x1, y0, y1) => { let d = `M${x0} ${y1}`, i = 0; for(let x = x0; x < x1;){ x = Math.min(x1, x + 2.6); d += `L${n1(x)} ${i++ % 2 ? y1 : y0}`; }
  return `<path class="a-in a-t1" d="M${pts}Z"/><path class="a-inl a-t0" d="${d}"/>`; };
/* the top of a wall slice in perspective: one parallelogram per layer [x, w, material class] */
const cap = layers => layers.map(([x, w, c]) => `<path class="${c} a-t1" d="M${x} 5l3-3h${w}l-3 3z"/>`).join('');
const rain = '<path class="a-c a-t1" d="M6 7l-1.7 3.2M8.8 14l-1.7 3.2M6 21l-1.7 3.2M8.8 28l-1.7 3.2M6 35l-1.7 3.2"/>';
const warmAir = x => `<path class="a-w a-t1" d="M${x} 35c-1.6-2 1.6-3 0-5s1.6-3 0-5 1.6-3 0-5M${x + 4} 31c-1.6-2 1.6-3 0-5s1.6-3 0-5"/>`;
const escape = y => `<path class="a-w" d="M46 ${y}c-2.2 0-2.2-2.2-4.4-2.2s-2.2 2.2-4.4 2.2-2.2-2.2-4.4-2.2-2.2 2.2-4.4 2.2-2.2-2.2-4.4-2.2-2.2 2.2-4.4 2.2-2.2-2.2-4.4-2.2-2.2 2.2-4.4 2.2H6"/><path class="a-w" d="M9 ${y - 3}l-3 3 3 3"/>`;
const qBadge = (x, y) => `<g transform="translate(${x} ${y})"><circle class="a-p" r="7.2"/><path class="a-t1" d="M-2.5-1.9a2.6 2.6 0 1 1 3.6 2.4c-.7.3-1.1.9-1.1 1.6v.5"/><path d="M0 4.4h.01"/></g>`;
const tickBadge = (x, y) => `<g transform="translate(${x} ${y})"><circle class="a-f" r="7.2"/><path d="M-3.3.2l2.2 2.3 4.4-4.7"/></g>`;
const lockBadge = (x, y) => `<g transform="translate(${x} ${y})"><circle class="a-p" r="7.6"/><path class="a-t1" d="M-2.3-.6v-1.9a2.3 2.3 0 0 1 4.6 0v1.9"/><rect class="a-f a-t1" x="-3.8" y="-.6" width="7.6" height="5.4" rx="1.2"/></g>`;
/* mould: a soft stain with dark spots, scattered the same way every time */
const mould = (cx, cy, rx, ry, n) => { let seed = Math.round(cx * 7 + cy * 13), d = '';
  const r = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for(let i = 0; i < n; i++){ const a = r() * 6.283, k = Math.sqrt(r()); d += `<circle class="a-m" cx="${n1(cx + Math.cos(a) * rx * k)}" cy="${n1(cy + Math.sin(a) * ry * k)}" r="${n1(.45 + r() * .75)}"/>`; }
  return `<ellipse class="a-mh" cx="${cx}" cy="${cy}" rx="${rx + 1}" ry="${ry + 1}"/>${d}`; };
/* a room seen from the doorway: back wall, side walls, floor; the furniture goes on top */
const roomBox = (inner, extra='') => `<path class="a-fo a-ns" d="M10 32h28l7 11H3z"/><rect class="a-wl a-d a-t1" x="10" y="8" width="28" height="24"/><path class="a-d a-t1" d="M10 8L3 3M38 8l7-5M10 32L3 43M38 32l7 11"/>${extra}${inner}`;
/* the loft: a house cut through; the room has a window and a radiator, the ceiling joists sit at y 25 */
const radiatorRoom = `<rect class="a-gl a-t1" x="12.5" y="29.5" width="7" height="7" rx=".6"/><path class="a-gll a-t0" d="M16 29.5v7M12.5 33h7"/><rect class="a-mt a-t1" x="26" y="35.5" width="10" height="5" rx="1"/><path class="a-mtl a-t0" d="M28.5 35.5v5M31 35.5v5M33.5 35.5v5"/>`;
const joists = [10.5, 15.5, 20.5, 25.5, 30.5, 35.5].map(x => `<rect class="a-wd a-t0" x="${x}" y="22" width="2" height="3"/>`).join('');
const rise = x => `<path class="a-w" d="M${x} 32c-1.8-1.8 1.8-2.7 0-4.5s1.8-2.7 0-4.5 1.8-2.7 0-4.5 1.8-2.7 0-4.5"/><path class="a-w" d="M${x - 2.6} 16.4L${x} 13.8l2.6 2.6"/>`;
const loftHouse = inner => `<path class="a-wl a-ns" d="M8 25h32v17H8z"/><path class="a-sk" d="M8 25V20.7L24 7.2 40 20.7V25z" opacity=".55"/>${inner}<path d="M3 25L24 7l21 18"/><path class="a-t1" d="M6.4 24L24 9.6 41.6 24"/><path class="a-t1" d="M8 25h32"/><path d="M8 25v17M40 25v17M3 42h42"/>`;
/* glazing: the window face on, a spot on its edge, and that edge magnified */
const spacer = (x, w) => `<rect class="a-k" x="${x}" y="16" width="${w}" height="2"/><rect class="a-k" x="${x}" y="30" width="${w}" height="2"/>`;
const glass = xs => xs.map(x => `<rect class="a-gl a-t1" x="${x}" y="16" width="2.2" height="16"/>`).join('');
const zoomWin = inner => `<rect class="a-p" x="2.5" y="9" width="12" height="30" rx="1"/>${pane(4.6, 11.1, 7.8, 11.6)}${pane(4.6, 25.4, 7.8, 11.5)}<rect x="2.5" y="9" width="12" height="30" rx="1"/><path class="a-t1" d="M2.5 24.2h12"/>` +
  `<circle class="a-t1" cx="14.5" cy="31" r="2.6"/><path class="a-d a-t0" stroke-dasharray="1.6 1.6" d="M16.4 29.1L24.5 11.9M16.4 32.9L24.5 36.1"/>` +
  `<circle class="a-p a-ns" cx="31.5" cy="24" r="14"/><path class="a-df a-t1" d="M20 16A14 14 0 0 1 43 16ZM20 32A14 14 0 0 0 43 32Z"/>${inner}<circle class="a-t1" cx="31.5" cy="24" r="14"/>`;
/* a casement window, shut (glass and handle) or open (the sash swung out, cool air coming in) */
const winShut = x => `<rect class="a-p" x="${x}" y="9" width="19" height="30" rx="1"/>${pane(x + 2.4, 11.4, 14.2, 25.2)}<rect x="${x}" y="9" width="19" height="30" rx="1"/><path class="a-t1" d="M${x + 14.2} 23v4"/>`;
const winOpen = x => `<rect class="a-sk" x="${x + 2}" y="11" width="15" height="26"/><path class="a-c a-t1" d="M${x + 16} 19c-2 0-2 1.6-4 1.6s-2-1.6-4-1.6M${x + 16} 27c-2 0-2 1.6-4 1.6s-2-1.6-4-1.6"/><rect x="${x}" y="9" width="19" height="30" rx="1"/>` +
  `<path class="a-gl a-t1" d="M${x + 2} 11l7.4 3.2v27.4L${x + 2} 37z"/><path class="a-t1" d="M${x + 2} 11l7.4 3.2v27.4L${x + 2} 37"/>`;
/* a window on a room's back wall */
const winBack = (x, y, w, h) => `${pane(x, y, w, h, `<path class="a-gll a-t0" d="M${x + w / 2} ${y}v${h}M${x} ${y + h / 2}h${w}"/>`)}<rect class="a-t1" x="${x}" y="${y}" width="${w}" height="${h}" rx=".6"/>`;
const pane = (x, y, w, h, bars) => `<rect class="a-gl a-t1" x="${x}" y="${y}" width="${w}" height="${h}" rx=".6"/>${bars || ''}`;
return {
  unsure: unsureArt, none: noneArt,
  /* home types: a British street. The participant's home is teal, the neighbours faded. Slate roofs, chimney
   * stacks with pots, sash windows; the semi is a 1930s pair with bays, the terraces share their stacks. */
  'home_type:detached':    `${gnd}${tree(6.5)}${chim(31.5, 8.5)}<path class="a-rf a-t1" d="M10.5 21.5L15.5 11h19l5 10.5z"/><rect class="a-f a-ns" x="13" y="21.5" width="24" height="21"/><path d="M13 42.5v-21h24v21"/>` +
                           `${sash(15.6, 24.4)}${sash(22.5, 24.4)}${sash(29.4, 24.4)}${sash(15.6, 33.2)}${sash(29.4, 33.2)}${door(23, 33.6, 4)}<path class="a-t1" d="M21.6 33h6.8"/>`,
  'home_type:semi':        `${gnd}${chim(22.2, 7.5)}<path class="a-rf a-t1" d="M2.5 22L11 11.5h26L45.5 22z"/><rect class="a-f a-ns" x="4.5" y="22" width="19.5" height="20.5"/>` +
                           `<g opacity=".45"><rect class="a-wl a-ns" x="24" y="22" width="19.5" height="20.5"/><path d="M43.5 42.5V22H24"/>${bay(34)}${sash(27, 26, 4, 4.4)}${door(27, 34.5, 4)}</g>` +
                           `<path d="M4.5 42.5V22H24v20.5"/>${bay(6)}${sash(18, 26, 4, 4.4)}${door(17.6, 34.5, 4)}`,
  'home_type:end_terrace': `${gnd}${chim(16.2, 7.5)}${chim(30.2, 7.5)}<path class="a-rf a-t1" d="M3 22.5L8.5 12.5H47v10z"/>` +
                           `<g opacity=".45"><rect class="a-wl a-ns" x="18" y="22.5" width="29" height="20"/><path d="M18 22.5h29M32 22.5v20"/>${terr(18)}${terr(32)}</g>` +
                           `<rect class="a-f a-ns" x="4" y="22.5" width="14" height="20"/><path d="M4 42.5v-20h14v20"/>${terr(4)}`,
  'home_type:mid_terrace': `${gnd}${chim(13.2, 7.5)}${chim(31.2, 7.5)}<path class="a-rf a-t1" d="M1 22.5l1.5-10h43l1.5 10z"/>` +
                           `<g opacity=".45"><rect class="a-wl a-ns" x="1" y="22.5" width="14" height="20"/><rect class="a-wl a-ns" x="33" y="22.5" width="14" height="20"/><path d="M1 22.5h14M33 22.5h14"/>${terr(1)}${terr(33)}</g>` +
                           `<rect class="a-f a-ns" x="15" y="22.5" width="18" height="20"/><path d="M15 42.5v-20h18v20"/>${sash(17.5, 25.8, 4.6, 4.6)}${sash(26, 25.8, 4.6, 4.6)}${bay(24.2, 7.4)}${door(17.8, 34.4, 4)}`,
  'home_type:bungalow':    `${gnd}${tree(43)}${chim(28.5, 14.5, 6)}<path class="a-rf a-t1" d="M2.5 28.5L10 19.5h24l7.5 9z"/><rect class="a-f a-ns" x="5" y="28.5" width="34" height="14"/><path d="M5 42.5v-14h34v14"/>` +
                           `${sash(8.5, 31.5, 6.4, 5.4)}${sash(29.5, 31.5, 6.4, 5.4)}${door(19.8, 34.2, 4.4)}`,
  'home_type:flat':        `${gnd}<rect class="a-wl a-ns" x="10" y="6" width="28" height="36.5"/><path d="M10 42.5V6h28v36.5M8.5 6h31"/>` +
                           [9.5, 17.5, 25.5].map(y => [13.5, 21.5, 29.5].map(x => (x === 21.5 && y === 17.5) ? `<rect class="a-f a-t3" x="${x}" y="${y}" width="5" height="5" rx=".6"/>` : sash(x, y, 5, 5)).join('') + `<path class="a-d a-t1" d="M12 ${y + 6.5}h24"/>`).join('') +
                           `${door(21.8, 34.4, 4.4)}<path class="a-t1" d="M20.2 33.6h7.6"/>`,
  /* which floor the flat is on: the block cut through, the ground line, earth round the basement; the floor marked */
  'flat_position:basement': flatPos(35),
  'flat_position:ground':   flatPos(25),
  'flat_position:middle':   flatPos(15),
  'flat_position:top':      flatPos(5),
  /* tenure */
  'tenure:own':                 `${house('a-f')}<g transform="translate(20 27)"><circle class="a-wf a-t1" r="4.6"/><circle class="a-p a-t1" r="1.6"/><path class="a-w a-t1" d="M4.6 0h11M12 0v3.4M15.6 0v4"/></g>`,
  'tenure:housing_association': `${house('a-f')}<path class="a-wf a-t1" d="M24 38.5s-7.5-4.6-7.5-9.4a3.8 3.8 0 0 1 7.5-1.3 3.8 3.8 0 0 1 7.5 1.3c0 4.8-7.5 9.4-7.5 9.4z"/>`,
  'tenure:council':             `<path class="a-f a-t1" d="M5 18L24 8l19 10z"/><circle class="a-p a-t1" cx="24" cy="14" r="2"/><path d="M5 18h38"/><path class="a-wl a-ns" d="M8 20h32v15H8z"/><path class="a-t1" d="M10.5 20v15M17 20v15M24 20v15M31 20v15M37.5 20v15"/><path d="M6 35.5h36M4 39h40M2.5 42.5h43"/>`,
  'tenure:private_rent':        `${gnd}<path class="a-rf a-t1" d="M4 24L14 15l10 9z"/><rect class="a-wl a-ns" x="6.5" y="24" width="15" height="18.5"/><path d="M6.5 42.5V24h15v18.5"/>${sash(9, 27, 4, 4)}${door(15, 34.4, 4)}<path class="a-wdl" d="M36 42.5V22"/><rect class="a-f" x="27.5" y="13" width="17" height="11" rx="1.2"/><path class="a-t1" d="M31 17h10M31 20.5h7"/>`,
  'tenure:shared_ownership':    `${gnd}<path class="a-rf a-t1" d="M6 24L24 9l18 15z"/><path class="a-f a-ns" d="M9 24h15v18.5H9z"/><path class="a-wf a-ns" d="M24 24h15v18.5H24z"/><path d="M9 42.5V24h30v18.5"/><path class="a-t1" stroke-dasharray="2 1.6" d="M24 11v31.5"/>${sash(12, 28, 5, 5)}${sash(31, 28, 5, 5)}`,
  'tenure:other':               `${house('a-wl')}<circle class="a-f a-t1" cx="19.5" cy="29" r="2.8"/><path class="a-f a-t1" d="M14.5 42v-3.5a5 5 0 0 1 10 0V42"/><circle class="a-wf a-t1" cx="29.5" cy="31.5" r="2.2"/><path class="a-wf a-t1" d="M25.8 42v-2.4a3.7 3.7 0 0 1 7.4 0V42"/>`,
  /* storeys: the same house one to four floors high */
  'floors:1': storeys(1), 'floors:2': storeys(2), 'floors:3': storeys(3), 'floors:4': storeys(4),
  /* main heating */
  'heat:gas_combi': `${wallBoiler(6, 4, 24, 28)}<path class="a-mtl a-t1" d="M10 32v10M14.5 32v10M18 32v5h12M22.5 32v2.5h7.5"/><path class="a-mt a-t1" d="M30 34.5h6.5v4H30zM36.5 35.5h3a2.5 2.5 0 0 1 2.5 2.5v2"/><path class="a-w a-t1" d="M32 32.6c0-1.6 1.6-1.6 1.6-3.2M35 32.6c0-1.6 1.6-1.6 1.6-3.2"/><path class="a-wf a-t1" d="M42 41.5c1 1.3 1.5 2.1 1.5 2.8a1.5 1.5 0 0 1-3 0c0-.7.5-1.5 1.5-2.8z"/>`,
  'heat:gas_tank':  `${wallBoiler(3, 5, 16, 22)}<path class="a-mtl a-t1" d="M7 27v15M11 27v6h16M15 27v3h12"/><rect class="a-wf" x="27" y="7" width="15" height="35" rx="7"/><path class="a-w a-t0" d="M27 15h15M27 23h15M27 31h15"/><path class="a-mtl a-t1" d="M34.5 7V3"/>`,
  'heat:oil':       `${wallBoiler(3, 5, 15, 21)}<path class="a-mtl a-t1" d="M6.5 26v16M10.5 26v4.5H25"/><rect class="a-tk" x="22" y="21" width="23" height="17" rx="5"/><path class="a-tk a-t1" d="M26 38v4M41 38v4M30.5 21v-2.5h6V21"/><path class="a-k" d="M33.5 25.5s3 3.2 3 5.4a3 3 0 0 1-6 0c0-2.2 3-5.4 3-5.4z"/>`,
  'heat:lpg': `${wallBoiler(2.5, 5, 15, 21)}<path class="a-mtl a-t1" d="M6 26v16M10 26v4h17"/>${bottle(27)}`,
  'heat:ashp':      `<path class="a-d a-t1" d="M3 4v38"/><path class="a-mtl a-t1" d="M3 30h4"/><rect class="a-p" x="7" y="12" width="38" height="25" rx="2.5"/><circle class="a-f a-t1" cx="20" cy="24.5" r="9"/><circle class="a-t1" cx="20" cy="24.5" r="1.6"/><path class="a-t1" d="M20 22.9c0-3-1.4-4.8-4-5.2M21.6 24.5c3 0 4.8-1.4 5.2-4M20 26.1c0 3 1.4 4.8 4 5.2M18.4 24.5c-3 0-4.8 1.4-5.2 4"/><path class="a-t1" d="M33 17h8M33 21h8M33 25h8M33 29h8M33 33h8"/><rect x="7" y="12" width="38" height="25" rx="2.5"/><path class="a-t1" d="M11 37v5M41 37v5"/>`,
  'heat:gshp': `<path class="a-ea" d="M2 27h44v19H2z"/><path class="a-d a-t1" d="M2 27h44"/><path class="a-rf a-t1" d="M4 14L14 5l10 9z"/><rect class="a-f a-ns" x="6.5" y="14" width="15" height="13"/><path d="M6.5 27V14h15v13"/>${sash(9, 16.5, 4, 4)}<rect class="a-mt a-t1" x="15" y="19" width="4.5" height="6" rx=".8"/><path class="a-mtl a-t1" d="M17.2 25v9"/><path class="a-w a-t1" d="M17.2 34c3 0 3 7 6 7s3-7 6-7 3 7 6 7 3-7 6-7 3 7 3 7"/><path class="a-c a-t1" d="M13.5 30c-1.5 5 .5 11 5 11"/>`,
  'heat:storage':   `<rect class="a-p" x="5" y="13" width="38" height="25" rx="2.5"/><path class="a-t1" d="M9 17.5h22M9 20.5h22"/><rect class="a-wf a-t1" x="9" y="24" width="22" height="10" rx="1"/><path class="a-w a-t0" d="M12 24v10M15.5 24v10M19 24v10M22.5 24v10M26 24v10"/><circle class="a-t1" cx="37" cy="21" r="2.4"/><circle class="a-t1" cx="37" cy="29.5" r="2.4"/><path class="a-t1" d="M37 18.6v2.4M37 27.1v2.4"/><rect x="5" y="13" width="38" height="25" rx="2.5"/><path class="a-t1" d="M8.5 38v4M39.5 38v4"/>`,
  'heat:electric':  `${radiatorArt(4, 14, 30, 19)}<path class="a-t1" d="M8 33v6M30 33v6"/><path class="a-mtl a-t1" d="M34 30c6 0 7 3 7 7"/><rect class="a-mt a-t1" x="37.5" y="37" width="7" height="5" rx="1"/><path class="a-w" d="M20.5 18l-3.2 5.4h3.4l-2.6 5"/>`,
  'heat:communal':  `${gnd}<rect class="a-wl a-ns" x="3" y="10" width="18" height="32.5"/><path d="M3 42.5V10h18v32.5"/>${[13.5, 21, 28.5].map(y => sash(5.6, y, 4.4, 4.4) + sash(13.6, y, 4.4, 4.4)).join('')}<rect class="a-f" x="30" y="25" width="15" height="17.5" rx="1.5"/><path class="a-br a-t1" d="M38 25V12h3.4v13"/><path class="a-w a-t1" d="M37.5 30.5c.6 1.8 2.8 2.7 2.8 5.1a2.8 2.8 0 0 1-5.6 0c0-1.2.6-2 1.2-2.5 0 .9.6 1.4 1.1 1.4.3-1.2-.2-2.4.5-4z"/><path class="a-w" d="M21 38.5h9"/><path class="a-c a-t1" d="M21 41h9"/>`,
  'heat:solid':     `${stoveFire}<path class="a-wd a-t1" d="M38 42.5l-3-7h9l-3 7z"/><circle class="a-k" cx="38" cy="34.5" r="1.3"/><circle class="a-k" cx="40.6" cy="34.2" r="1.1"/>`,
  'heat:none':      `<g opacity=".5">${radiatorArt(6, 15, 36, 20)}<path class="a-t1" d="M10 35v5M38 35v5"/></g><path class="a-w" d="M7 40L41 10"/>`,
  'heat:unsure':    unsureArt,
  /* other heaters */
  'other:plugin':           `<rect class="a-p" x="6" y="12" width="26" height="24" rx="3"/>${[10, 14.5, 19, 23.5, 28].map(x => `<path class="a-t1" d="M${x} 14v20"/>`).join('')}<rect x="6" y="12" width="26" height="24" rx="3"/><path class="a-t1" d="M9 36v3M29 36v3"/><circle class="a-t1" cx="9" cy="40.5" r="1.4"/><circle class="a-t1" cx="29" cy="40.5" r="1.4"/><path class="a-mtl a-t1" d="M32 30c6 0 8 3 8 7"/><rect class="a-mt a-t1" x="36.5" y="37" width="7" height="5" rx="1"/><path class="a-w a-t1" d="M14 9c-1.2-1.4 1.2-2 0-3.5M19 9c-1.2-1.4 1.2-2 0-3.5M24 9c-1.2-1.4 1.2-2 0-3.5"/>`,
  'other:gas_fire':         fireplace(`<rect class="a-mt a-t1" x="16" y="22" width="16" height="16" rx="1"/><path class="a-k" d="M18 25h12v2H18zM18 29h12v2H18z" opacity=".25"/><path class="a-fl a-t1" d="M20 37.5c-1.6-2.2.4-3.4.8-5.6 1.2 1.2 1.6 2.2 1.4 3.2.9-1.6.7-3.4 1.8-5 1.4 2 2.6 3.6 2.4 5.4.8-.8 1.1-1.8 1.4-3 1.6 2 1.8 3.6.6 5z"/>`),
  'other:electric_fire':    fireplace(`<rect class="a-p a-t1" x="16" y="22" width="16" height="16" rx="1"/><rect class="a-fl a-t1" x="18.5" y="26" width="11" height="2.4" rx="1.2"/><rect class="a-fl a-t1" x="18.5" y="31" width="11" height="2.4" rx="1.2"/><path class="a-w a-t0" d="M19 24.5c.5-.6 1-.6 1.5 0s1 .6 1.5 0M24 24.5c.5-.6 1-.6 1.5 0s1 .6 1.5 0"/>`),
  'other:stove':            stoveFire,
  'other:open_fire':        fireplace(`<path class="a-k" d="M16 22h16v16H16z" opacity=".12"/><path class="a-mtl a-t1" d="M17 37.5h14M18.5 37.5v-3h11v3"/><path class="a-wd a-t1" d="M18.5 34.5l11-3.4M18.5 31.1l11 3.4"/><path class="a-fl a-t1" d="M22 31c-1.4-2 .4-3.2.8-5.2 1.2 1.2 1.6 2 1.4 3 .9-1.6.7-3.2 1.8-4.8 1.6 2 2.4 3.6 1.6 5.4"/>`),
  'other:electric_blanket': `<rect class="a-wd a-t1" x="5" y="12" width="38" height="9" rx="2"/><rect class="a-p a-t1" x="9" y="15" width="9" height="5" rx="2"/><path class="a-wf a-t1" d="M5 21h38v15H5z"/><path class="a-w a-t1" d="M8 25h32l-2.5 3.5h-27L8 32h32"/><path class="a-t1" d="M5 36v4M43 36v4"/><path class="a-mtl a-t1" d="M43 30c3 0 3 3 0 5"/><rect class="a-mt a-t1" x="38" y="35" width="5.5" height="7" rx="1.2"/>`,
  'other:none':             noneArt,
  /* heating controls */
  'controls:room_stat':  `<rect class="a-p" x="9" y="9" width="30" height="30" rx="6"/><circle class="a-f a-t1" cx="24" cy="24" r="10"/><circle class="a-t1" cx="24" cy="24" r="6.5"/><path d="M24 17.5v4"/><path class="a-t1" d="M24 11.6v1.6M15.2 15.2l1.1 1.1M32.8 15.2l-1.1 1.1M11.6 24h1.6M34.8 24h1.6"/><rect x="9" y="9" width="30" height="30" rx="6"/><circle class="a-w a-tf" cx="34.5" cy="34.5" r="1.4"/>`,
  'controls:smart':      `<circle class="a-p" cx="19" cy="22" r="13"/><circle class="a-f a-ns" cx="19" cy="22" r="9.6"/><path class="a-w a-t3" d="M11.5 27a9.6 9.6 0 0 1 9.4-14.4"/><path class="a-t1" d="M16 22h6M19 19v6"/><circle cx="19" cy="22" r="13"/><rect class="a-p" x="33" y="20" width="11" height="20" rx="2"/><rect class="a-f a-ns" x="35" y="23" width="7" height="12" rx=".8"/><path class="a-w a-t1" d="M36.5 31.5a2.2 2.2 0 0 1 4 0"/><rect x="33" y="20" width="11" height="20" rx="2"/><path class="a-c a-t1" d="M33.5 13.5a7 7 0 0 1 10 0M35.5 16a4 4 0 0 1 6 0"/>`,
  'controls:programmer': `<rect class="a-p" x="4" y="11" width="40" height="26" rx="3"/><circle class="a-f a-t1" cx="16" cy="24" r="8"/>${Array.from({length: 12}, (_, i) => { const a = i * Math.PI / 6, on = i >= 2 && i <= 4 || i >= 8 && i <= 10; return `<path class="${on ? 'a-w' : 'a-d'} a-t1" d="M${n1(16 + Math.sin(a) * 8)} ${n1(24 - Math.cos(a) * 8)}L${n1(16 + Math.sin(a) * 10)} ${n1(24 - Math.cos(a) * 10)}"/>`; }).join('')}<path class="a-t1" d="M16 20v4l2.6 1.6"/><rect class="a-k" x="28" y="15" width="12" height="6" rx="1" opacity=".85"/><path class="a-t1" d="M28.5 27.5h3M35.5 27.5h3M28.5 32h3M35.5 32h3"/><rect x="4" y="11" width="40" height="26" rx="3"/>`,
  'controls:trvs':       `${radiatorArt(3, 17, 22, 19)}<path class="a-mtl a-t1" d="M25 31h6"/><rect class="a-f" x="31" y="10" width="13" height="23" rx="5"/><path class="a-t1" d="M33.5 14v15M37.5 13v17M41.5 14v15"/><circle class="a-w a-tf" cx="37.5" cy="10.6" r="1.2"/><path class="a-mtl a-t1" d="M37.5 33v9"/>`,
  'controls:none': noneArt, 'controls:unsure': unsureArt,
  /* how the heating is used (one per row, the picture at the left) */
  'pattern:always_on':   `${statDial(24, 24, 9)}<path class="a-w" d="M24 9a15 15 0 1 1-14.2 10.2"/><path class="a-w" d="M6.6 16.4l3.2 3 3.6-2.6"/>`,
  'pattern:timer':       clockArt([[0, 2], [7, 10]]) + `<path class="a-t1" d="M24 24V12.5M24 24l6.5 3.8"/>`,
  'pattern:when_needed': `<rect class="a-p" x="12" y="6" width="24" height="36" rx="4"/><rect class="a-f" x="17" y="12" width="14" height="24" rx="3"/><rect class="a-p a-t1" x="19" y="14" width="10" height="11" rx="2"/><path class="a-w a-t1" d="M24 28.5c.6 1.6 2.2 2.4 2.2 4.3a2.2 2.2 0 0 1-4.4 0c0-1 .5-1.7 1-2.1 0 .7.5 1.1 1 1.2.2-1-.2-2 .2-3.4z"/><rect x="12" y="6" width="24" height="36" rx="4"/>`,
  'pattern:most_day': clockArt([[5.5, 15.5]]) + `<path class="a-t1" d="M24 24V12.5M24 24l6.5 3.8"/>`,
  'pattern:rarely':      `<rect class="a-p" x="6" y="9" width="36" height="32" rx="3"/><path d="M6 17h36"/><path class="a-t1" d="M14 6v6M34 6v6"/>${Array.from({length: 12}, (_, i) => `<rect class="${i === 6 ? 'a-wf' : 'a-d'} a-t1" x="${10 + (i % 4) * 7.4}" y="${20.5 + Math.floor(i / 4) * 6.4}" width="5" height="4.4" rx=".8"/>`).join('')}<rect x="6" y="9" width="36" height="32" rx="3"/>`,
  'pattern:not_me':      `${statDial(15, 21, 8)}<circle class="a-wf a-t1" cx="35" cy="17" r="4.5"/><path class="a-wf a-t1" d="M27 41v-5a8 8 0 0 1 16 0v5z"/><path class="a-t1" d="M28 27.5l-4.5-3"/>`,
  /* how long the heating has been on: a clock with the time it has been running shaded */
  'heat_for:always':  `${statDial(24, 24, 9)}<path class="a-w" d="M24 9a15 15 0 1 1-14.2 10.2"/><path class="a-w" d="M6.6 16.4l3.2 3 3.6-2.6"/>`,
  'heat_for:30_60':   clockArt([[0, 1]]),
  'heat_for:1_2h':    clockArt([[0, 2]]),
  'heat_for:2_4h':    clockArt([[0, 4]]),
  'heat_for:gt4h':    clockArt([[0, 7]]) + `<path class="a-w" stroke-dasharray="2 2.4" d="M7.5 33.5A19 19 0 0 1 24 5"/>`,
  'heat_for:unsure':  `<g opacity=".5">${clockArt([])}</g>${qBadge(24, 24)}`,
  /* the age of the house (year built): the style of each period */
  'year_built:pre1919':   `${gnd}${chim(8.5, 9)}${chim(35.5, 9)}<path class="a-rf a-t1" d="M5 20l3-6h32l3 6z"/><rect class="a-br" x="7" y="20" width="34" height="22.5"/><path class="a-brl a-t0" d="M7 26h34M7 32h34M7 38h34"/>${sash(10, 22.5, 5, 6)}${sash(33, 22.5, 5, 6)}<path class="a-p a-t1" d="M9 42.5V34l2-2h6l2 2v8.5"/>${sash(11, 34.5, 6, 5)}${door(24, 33.4, 4.6)}<path class="a-t1" d="M7 42.5V20h34v22.5"/>`,
  'year_built:1919_1944': `${gnd}${chim(30, 8)}<path class="a-rf a-t1" d="M5 21L13 10h22l8 11z"/><rect class="a-rd" x="7.5" y="21" width="33" height="21.5"/><path class="a-p a-t1" d="M10 42.5V21.5h11v21"/>${sash(12, 24, 7, 6)}${sash(12, 33.5, 7, 6)}<path class="a-t1" d="M9 21.5h13"/>${sash(29, 24, 6, 5.4)}${door(29.5, 33.4, 4.6)}<path class="a-t1" d="M27.6 32.8h8.4"/><path d="M7.5 42.5V21h33v21.5"/>`,
  'year_built:1945_1964': `${gnd}${chim(31, 10.5)}<path class="a-rf a-t1" d="M5 22.5L24 11l19 11.5z"/><rect class="a-wl" x="8" y="22.5" width="32" height="20"/>${sash(11, 25.5, 7, 5.4)}${sash(30, 25.5, 7, 5.4)}${sash(11, 34, 7, 5.4)}<rect class="a-wd a-t1" x="27" y="33.4" width="5" height="9.1"/><path class="a-t1" d="M25.5 32.8h8"/><path d="M8 42.5v-20h32v20"/>`,
  'year_built:1965_1982': `${gnd}<path class="a-rf a-t1" d="M4 22l20-6 20 6z"/><rect class="a-wl" x="6" y="22" width="36" height="20.5"/><rect class="a-wd a-t1" x="6" y="22" width="36" height="7.5"/><path class="a-wdl a-t0" d="M6 24.5h36M6 27h36"/><rect class="a-gl a-t1" x="9" y="23" width="13" height="5.5"/><rect class="a-gl a-t1" x="26" y="23" width="13" height="5.5"/><rect class="a-gl a-t1" x="9" y="32" width="15" height="6"/><rect class="a-p a-t1" x="30" y="31.5" width="6" height="11"/><path d="M6 42.5V22h36v20.5"/>`,
  'year_built:1983_2002': `${gnd}<path class="a-rf a-t1" d="M5 22.5L24 11l19 11.5z"/><path class="a-rf a-t1" d="M24 33l7-6 7 6z"/><rect class="a-br" x="8" y="22.5" width="32" height="20"/><path class="a-brl a-t0" d="M8 28h32M8 37.5h32"/><rect class="a-p a-t1" x="25.5" y="33" width="11" height="9.5"/>${sash(11, 25.5, 6, 5)}${sash(31, 25.5, 6, 5)}${sash(11, 33.5, 6, 5)}<path class="a-t1" d="M27.5 42.5v-6.5h7v6.5"/><path d="M8 42.5v-20h32v20"/>`,
  'year_built:2003_plus': `${gnd}<path class="a-rf a-t1" d="M5 20L24 10l19 10z"/><rect class="a-wl" x="8" y="20" width="32" height="22.5"/><rect class="a-wd a-t1" x="8" y="20" width="12" height="22.5"/><path class="a-wdl a-t0" d="M10.5 20v22.5M13.5 20v22.5M16.5 20v22.5"/><rect class="a-gl a-t1" x="23" y="23" width="14" height="8" rx=".6"/><rect class="a-gl a-t1" x="23" y="33.5" width="6" height="9"/><rect class="a-sk" x="27.5" y="11.5" width="11" height="4.5" transform="rotate(-27.5 33 13.75)"/><path class="a-t1" d="M27.6 16.3l9.8-5.1"/><path d="M8 42.5V20h32v22.5"/>`,
  'year_built:unsure':    unsureArt,
  /* thermostat screen */
  'stat_display:yes': `<rect x="7" y="9" width="34" height="30" rx="7"/><rect x="12" y="14" width="24" height="13" rx="2" ${F}/><text x="24" y="24.5" text-anchor="middle" class="art-num">21.5</text><path d="M16 33h4M28 33h4"/>`,
  'stat_display:no': `<circle cx="24" cy="24" r="16"/><circle cx="24" cy="24" r="9" ${F}/><path d="M24 15v5"/><path d="M14 33l2-2M34 33l-2-2"/>`,
  'stat_display:no_stat': noneArt,
  /* the radiator in the bedroom */
  'bedroom_trv:yes': `${radiatorArt(3,16,26,20)}<path d="M29 32h4"/><rect x="33" y="12" width="10" height="21" rx="4" ${F}/><path d="M33 17h10M33 22h10M33 27h10"/>`,
  'bedroom_trv:no': `${radiatorArt(6,15,36,20)}<path d="M10 35v5M38 35v5"/>`,
  'bedroom_trv:no_radiator': `<g ${D}>${radiatorArt(6,15,36,20)}</g><path d="M8 40L40 10"/>`,
  'bedroom_trv:unsure': unsureArt,
  /* walls, cut through: outside on the left (rain), inside on the right (warm air). Brick is terracotta, concrete
   * block grey, insulation yellow with the zigzag drawn on plans, plaster and plasterboard pale. */
  'wall:cavity':   `${rain}${cap([[10, 8, 'a-br'], [18, 8, 'a-in'], [26, 8, 'a-bk'], [34, 2, 'a-pl a-d']])}${leaf(10, 8, 5, 43, 5.4, 'br')}${insV(18, 8, 5, 43)}${leaf(26, 8, 5, 43, 9.5, 'bk')}<rect class="a-pl a-d a-t1" x="34" y="5" width="2" height="38"/>${warmAir(39.5)}`,
  'wall:external': `${rain}${cap([[8.5, 2, 'a-rd'], [10.5, 7, 'a-in'], [17.5, 13, 'a-br'], [30.5, 2, 'a-pl a-d']])}<rect class="a-rd a-t1" x="8.5" y="5" width="2" height="38"/>${insV(10.5, 7, 5, 43)}${leaf(17.5, 13, 5, 43, 5.4, 'br', 1)}<rect class="a-pl a-d a-t1" x="30.5" y="5" width="2" height="38"/>${warmAir(37.5)}`,
  'wall:internal': `${rain}${cap([[10.5, 13, 'a-br'], [23.5, 7, 'a-in'], [30.5, 2.4, 'a-pl a-d']])}${leaf(10.5, 13, 5, 43, 5.4, 'br', 1)}${insV(23.5, 7, 5, 43)}<rect class="a-pl a-d a-t1" x="30.5" y="5" width="2.4" height="38"/>${warmAir(37.5)}`,
  'wall:none':     `${rain}${cap([[16.5, 13, 'a-br'], [29.5, 2, 'a-pl a-d']])}${leaf(16.5, 13, 5, 43, 5.4, 'br', 1)}<rect class="a-pl a-d a-t1" x="29.5" y="5" width="2" height="38"/>${escape(17)}${escape(33)}`,
  'wall:unsure':   `<g opacity=".5">${cap([[17, 14, 'a-br']])}${leaf(17, 14, 5, 43, 5.4, 'br', 1)}</g>${qBadge(24, 24)}`,
  /* the loft: a house cut through, its room below and the roof space above the ceiling joists */
  'loft:yes':      loftHouse(insH('8 25L8 20.7L13.5 16H34.5L40 20.7V25', 13.5, 34.5, 17.2, 23.8) + radiatorRoom + `<path class="a-w a-t1" d="M30.5 33c-1.6-2 1.6-3 0-5M34.5 33c-1.6-2 1.6-3 0-5"/>`),
  'loft:no':       loftHouse(joists + radiatorRoom + rise(17) + rise(31)),
  'loft:no_loft':  `<path class="a-wl a-ns" d="M9 6h30v37H9z"/><rect class="a-f a-ns" x="9" y="18.5" width="30" height="12"/><path d="M9 43V6h30v37M7 6h34M3 43h42"/><path class="a-t1" d="M9 18.5h30M9 30.5h30"/>` +
                   `<g class="a-d a-t1">${[13, 30].map(x => `<rect x="${x}" y="9.5" width="5" height="5.5" rx=".6"/>`).join('')}<circle cx="24" cy="10.6" r="1.7"/><path d="M21 17.4c0-2.4 1.3-4 3-4s3 1.6 3 4"/>${[13, 30].map(x => `<rect x="${x}" y="33.5" width="5" height="5.5" rx=".6"/>`).join('')}<path d="M21.5 43v-7h5v7"/></g>` +
                   `${[13, 30].map(x => pane(x, 21.5, 5, 5.5)).join('')}<path class="a-w a-t1" d="M24 28.5c-1.3-1.6 1.3-2.4 0-4s1.3-2.4 0-4"/>`,
  'loft:unsure':   `<g opacity=".5">${loftHouse(joists)}</g>${qBadge(24, 19)}`,
  /* windows: the pane seen face on, and the edge of the glass in a magnifier: one, two or three panes with the
   * dark spacer bars between them */
  'glazing:single': zoomWin(glass([30.4])),
  'glazing:double': zoomWin(`<rect class="a-sk" x="28.6" y="16" width="5.8" height="16"/>${spacer(28.6, 5.8)}${glass([26.4, 34.4])}`),
  'glazing:triple': zoomWin(`<rect class="a-sk" x="26.4" y="16" width="10.2" height="16"/>${spacer(26.4, 3.9)}${spacer(32.5, 3.9)}${glass([24.2, 30.3, 36.4])}`),
  'glazing:mixed': `<rect class="a-wd a-t1" x="3" y="9" width="18" height="30" rx="1"/>${pane(5.5, 11.5, 13, 25, '<path class="a-wdl a-t1" d="M12 11.5v25M5.5 19.8h13M5.5 28.2h13"/>')}<path class="a-wdl a-t1" d="M3 24h18"/>` +
                   `<rect class="a-p" x="26" y="9" width="19" height="30" rx="1.5"/>${pane(28.8, 11.8, 13.4, 24.4)}<rect x="26" y="9" width="19" height="30" rx="1.5"/><rect class="a-t1" x="28" y="11" width="15" height="26" rx=".8"/><path class="a-t1" d="M39.5 23.5v3"/>`,
  'glazing:unsure': `<g opacity=".5"><rect class="a-p" x="12" y="6" width="24" height="36" rx="1.5"/>${pane(14.5, 8.5, 19, 14.5)}${pane(14.5, 25, 19, 14.5)}<rect x="12" y="6" width="24" height="36" rx="1.5"/></g>${qBadge(24, 24)}`,
  /* can the windows be opened: two windows, open (the casement swung out, air coming in) or shut */
  'windows_open:yes':  winOpen(3) + winOpen(26),
  'windows_open:some': winOpen(3) + winShut(26),
  'windows_open:no':   winShut(3) + winShut(26) + lockBadge(38.5, 36.5),
  /* damp or mould: the room, with the dark spots where mould grows first, round the window and in the corners */
  'damp:bedroom':   roomBox(`<rect class="a-wd a-t1" x="12.5" y="20" width="13" height="10.5" rx="1.5"/><rect class="a-p a-t1" x="14.5" y="25" width="5" height="3.2" rx="1.2"/><path class="a-f a-t1" d="M11 29.5h17l1.6 8.5H9.4z"/><path class="a-t1" d="M14 33.5h12"/>`, winBack(25.5, 12, 9, 9) + mould(12.3, 10.2, 2.6, 1.8, 9) + mould(34.2, 12.4, 2, 1.6, 6) + mould(25.3, 21.8, 1.6, 1.2, 4)),
  'damp:living':    roomBox(`<path class="a-f a-t1" d="M14.5 23h19v6h-19z"/><rect class="a-f a-t1" x="12.5" y="28" width="23" height="5" rx="1.5"/><rect class="a-p a-t1" x="10.5" y="25" width="4" height="9" rx="1.6"/><rect class="a-p a-t1" x="33.5" y="25" width="4" height="9" rx="1.6"/><path class="a-t1" d="M13 34v2.5M35 34v2.5"/>`, winBack(15, 11, 11, 9) + mould(36, 10.2, 2.4, 1.8, 8) + mould(14.8, 11.2, 1.8, 1.6, 6) + mould(26.4, 20.2, 1.4, 1.1, 4)),
  'damp:kitchen':   roomBox(`<rect class="a-p a-t1" x="11" y="25" width="26" height="9"/><path class="a-t1" d="M11 25h26M19.6 25v9M28.3 25v9M17.4 29.5h.01M21.8 29.5h.01M30.5 29.5h.01"/><path class="a-mt a-t1" d="M13 25v-3.2h4v3.2"/><path class="a-t1" d="M17 22.4l1.6-.9M29.5 24h6"/>`, winBack(18, 11, 12, 8.5) + mould(11.8, 10, 2.2, 1.6, 7) + mould(30, 11.2, 1.8, 1.4, 6) + mould(36.6, 18, 1.2, 2.6, 6)),
  'damp:bathroom':  roomBox(`<path class="a-p a-t1" d="M11 25.5h25v3.5a5 5 0 0 1-5 5H16a5 5 0 0 1-5-5z"/><path class="a-t1" d="M14 34l-.8 2M33 34l.8 2M34 25.5V13.5h-3"/><path class="a-mt a-t1" d="M28.5 13.5h3v1.6h-3z"/>`, '<path class="a-d a-t0" d="M10 15h28M10 20.5h28M15 8v24M21 8v24M27 8v24M33 8v24"/>' + mould(36.4, 9.8, 2.3, 1.6, 9) + mould(12.8, 22.8, 1.8, 1.3, 5) + mould(21, 10, 1.6, 1, 4)),
  'damp:elsewhere': roomBox(`<rect class="a-wd a-t1" x="19" y="12.5" width="10" height="19.5"/><path class="a-t1" d="M26.6 22.5h.01"/><path class="a-t1" d="M33.5 15.5v2.4"/><path class="a-f a-t1" d="M31 18h5l1 7h-7z"/>`, mould(11.8, 10, 2.4, 1.8, 8) + mould(36.4, 10, 2, 1.6, 7) + mould(24, 10.4, 2.2, 1.1, 5)),
  'damp:none':      roomBox(`<rect class="a-wd a-t1" x="12.5" y="20" width="13" height="10.5" rx="1.5"/><path class="a-f a-t1" d="M11 29.5h17l1.6 8.5H9.4z"/>`, winBack(25.5, 12, 9, 9)) + tickBadge(38.5, 37),
  'damp:unsure':    `<g opacity=".5">${roomBox('', winBack(25.5, 12, 9, 9))}</g>${qBadge(24, 22)}`,
  /* bedroom sharing: the beds in the participant's bedroom, their own head in teal */
  'share:0': `${bed(14, 20, 1)}`,
  'share:1': `${bed(8, 32, 2)}`,
  'share:2': `${bed(2.5, 27, 2)}${bed(31.5, 14, 1, true)}`,
  'share:3': `${bed(2.5, 27, 2)}${bed(31.5, 14, 1, true)}<path class="a-t1" d="M38.5 6v6M35.5 9h6"/>`,
  /* the compass in the middle of the direction picker: an eight-point rose, north in teal */
  compass: `<circle class="a-p" cx="24" cy="24" r="16"/><circle class="a-d a-t1" cx="24" cy="24" r="12.5"/>${Array.from({length: 16}, (_, i) => { const a = i * Math.PI / 8, r0 = i % 2 ? 14.6 : 13.6; return `<path class="a-t0" d="M${n1(24 + Math.sin(a) * r0)} ${n1(24 - Math.cos(a) * r0)}L${n1(24 + Math.sin(a) * 16)} ${n1(24 - Math.cos(a) * 16)}"/>`; }).join('')}` +
           `<path class="a-p a-t1" d="M24 24l3.6-3.6L35 13l-7.4 7.4zM24 24l3.6 3.6L35 35l-7.4-7.4zM24 24l-3.6 3.6L13 35l7.4-7.4zM24 24l-3.6-3.6L13 13l7.4 7.4z"/>` +
           `<path class="a-p a-t1" d="M24 24l3.4 0L24 38zM24 24h-3.4L24 38zM24 24h11.6L27.4 27.4zM24 24h-11.6l8.2 3.4z"/><path class="a-f a-t1" d="M24 6l3.4 18h-6.8z"/><circle class="a-t1" cx="24" cy="24" r="16"/><circle class="a-tf" cx="24" cy="24" r="1.6"/>`
};
})();
/* class "art art-<family>" (art-wall, art-heat ...) lets art.css size each family to its tiles */
function art(name, cls=''){
  const fam = ART[name] ? String(name).split(':')[0] : 'unsure';
  return `<svg class="art art-${fam} ${cls}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ART[name] || ART.unsure}</svg>`;
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
  if(has('pyjamas'))  s += legsLong('var(--g-pyjamas)') + `<path d="M46 110v74M53 110v74M67 110v74M74 110v74" stroke="rgba(255,255,255,.4)" stroke-width="2"/><path d="M41.5 184h17M61.5 184h17" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`;
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
  if(has('pyjamas')) s += top('var(--g-pyjamas)', 64) +
    `<path d="M45 52v52M75 52v52M28 60l3 52M92 60l-3 52" stroke="rgba(255,255,255,.4)" stroke-width="2"/>` +
    `<path d="M48 46l12 14 12-14-5 12-7 2-7-2z" fill="var(--g-pyjamas)" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>` +
    `<path d="M66 70h9v8h-9z" fill="none" stroke="#fff" stroke-width="1.6"/><path d="M22 110l13 1.6M98 110l-13 1.6" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>` +
    `<circle cx="60" cy="68" r="1.7" fill="#fff"/><circle cx="60" cy="81" r="1.7" fill="#fff"/><circle cx="60" cy="94" r="1.7" fill="#fff"/>`;
  if(has('tshirt')) s += top('var(--g-tshirt)', 26);
  if(has('long'))   s += top('var(--g-long)', 64);
  if(has('jumper')) s += top('var(--g-jumper)', 66) + `<path d="M36 102h48" stroke="rgba(20,30,45,.25)" stroke-width="3"/>`;
  if(has('hoodie')) s += top('var(--g-hoodie)', 68) + `<path d="M43 49q17-12 34 0q-3 9-17 10q-14-1-17-10z" fill="var(--g-hoodie)" ${O}/><path d="M48.5 52q11.5 6 23 0" fill="none" stroke="rgba(20,30,45,.3)" stroke-width="1.6"/>` +
    `<path d="M56 57v12M64 57v12" stroke="rgba(255,255,255,.75)" stroke-width="1.6" stroke-linecap="round"/>` + R(46,82,28,14,5,'rgba(20,30,45,.14)');
  // coats: over the tops, the light jacket open at the front to the hip, the winter coat closed to the knee
  if(has('coat_light'))  s += arms('var(--g-coat-light)', 68, 17, 20.5) +
    `<path d="M36 47Q47 42 56 45L55 116Q45 118 33 113Z" fill="var(--g-coat-light)" ${O}/><path d="M84 47Q73 42 64 45L65 116Q75 118 87 113Z" fill="var(--g-coat-light)" ${O}/>` +
    `<path d="M47 45l8 14M73 45l-8 14" stroke="rgba(20,30,45,.3)" stroke-width="1.6" fill="none"/><path d="M40 92h9M71 92h9" stroke="rgba(20,30,45,.28)" stroke-width="2"/>`;
  if(has('coat_winter')) s += arms('var(--g-coat-winter)', 70, 18, 19.5) +
    `<path d="M36 46Q60 37 84 46L91 152Q60 161 29 152Z" fill="var(--g-coat-winter)" ${O}/>` +
    `<path d="M35 64Q60 70 85 64M34 84Q60 90 86 84M33 104Q60 110 87 104M31.5 124Q60 130 88.5 124M30.5 142Q60 148 89.5 142" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="2"/>` +
    `<path d="M24 76l13 1M96 76l-13 1M24 96l12 1M96 96l-12 1" stroke="rgba(255,255,255,.2)" stroke-width="2"/>` +
    `<path d="M41 49q19-11 38 0" fill="none" stroke="var(--g-coat-winter)" stroke-width="7" stroke-linecap="round"/><path d="M41 49q19-11 38 0" fill="none" stroke="rgba(20,30,45,.25)" stroke-width="1.2"/>` +
    `<path d="M43.5 49.5q16.5 13 33 0" fill="none" stroke="#EFE6D4" stroke-width="5" stroke-linecap="round"/><path d="M43.5 49.5q16.5 13 33 0" fill="none" stroke="#D9CCB2" stroke-width="5" stroke-linecap="round" stroke-dasharray=".1 3.4"/>` +
    `<path d="M60 52v100" stroke="rgba(255,255,255,.5)" stroke-width="1.6"/><rect x="58" y="54" width="4" height="6" rx="1" fill="rgba(255,255,255,.6)"/>`;
  // wraps
  if(has('blanket')) s += `<path d="M22 66Q60 46 98 66L104 198H16z" fill="var(--g-blanket)" ${O}/><path d="M28 100h64M26 130h68M24 160h72" stroke="rgba(20,30,45,.14)" stroke-width="3"/>`;
  if(has('duvet'))   s += R(12,58,96,148,22,'var(--g-duvet)') + `<path d="M12 110h96M12 160h96M60 58v148" stroke="rgba(20,30,45,.12)" stroke-width="2"/>`;
  return `<svg viewBox="0 0 120 208" aria-hidden="true" focusable="false">${s}</svg>`;
}
