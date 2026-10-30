/* MouldCast - icons and pictures, copied from HomePulse (switch/checkin/icons.js) so the two apps share one look;
 * the MouldCast additions are at the end of the pictures (rooms without mould, close-ups of a wall by how much mould
 * covers it, the problems a resident can report) and at the end of the file (line icons). Loaded before app.js.
 * Everything is drawn here as line art in the app's own style: the 24-grid icons (ic) for buttons and rows, the
 * 48-grid pictures (art) for tiles and cards. */
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

/* ---------- pictures (style C): natural colours, texture, thin dark contours ----------
 * Every picture of a thing (the join wizard's tiles, the check-in's answers, the clothes) is drawn here in one
 * style: real-world colours (brick, slate, white uPVC, yellow insulation, pale blue glass), a little texture
 * (brick courses, glass reflections, wood grain) and a thin dark brown contour, the same 1 px on screen at every
 * size (non-scaling stroke). The colours are fixed, so a picture looks the same on the light and the dark theme.
 * Interface icons (ic, above) stay plain teal lines. 48-unit grid; art() and pic() wrap a picture in its svg. */
const STYLEC = (() => {
const INK = '#3B342E';
const M = {
  brick:'#B9583C', brickL:'#C96B4C', brickD:'#94432D', mortar:'#E8D5C4', pot:'#C8693F',
  slate:'#5F6973', slateL:'#7D8893', slateD:'#4A535C', tile:'#A8553C', tileL:'#BF6A4E',
  render:'#EFE5CF', renderD:'#D9CDB1', stone:'#E2D6BE', stoneD:'#C9B99A',
  white:'#FBFBF9', whiteD:'#DDE2E6', whiteDD:'#C3CAD0', paper:'#FFFFFF',
  glass:'#BFE1F4', glassD:'#93C6E6', lit:'#FFE39A',
  teal:'#0E7B72', red:'#9C3B2E', navy:'#2F4A6B', green:'#3E7D4E', ok:'#2E8B57', bad:'#C2413A',
  ins:'#F4C84A', insD:'#D9A425', insL:'#FADF8A',
  block:'#B8BEC4', blockD:'#9AA1A8', blockL:'#CDD2D7', plaster:'#F5EFE6', board:'#F2EEE6',
  wood:'#C8955E', woodD:'#9E6E3E', woodL:'#DDB27E', oak:'#B07A48',
  copper:'#C77A3A', copperL:'#E39A5C', steel:'#F4F6F7', steelD:'#D5DADF', metal:'#9AA4AD', metalD:'#6E7881', iron:'#3E4247', ironL:'#5A6068',
  screen:'#22313A', screenL:'#46D3A8',
  flame:'#F5A623', flameD:'#E8661E', flameL:'#FFD36B', heat:'#F08A2C',
  skin:'#E8BC98', skinD:'#CF9B76', nail:'#F3D3BD', hair:'#5A4636', hair2:'#C79A5B', hair3:'#2F2A26',
  frost:'#DDF0FB', ice:'#9CCFF0', cold:'#3D8CE6', coldD:'#2A6FC2',
  lawn:'#8CBF63', leaf:'#5E9E4A', leafL:'#8CC46B', trunk:'#87573A',
  room:'#FBEAD2', roomD:'#F2D7B4', loft:'#E9ECEF', sky:'#DCEFFB', night:'#2B3A5C', earth:'#C8A983', earthD:'#A8865F',
  mould:'#2E3526', mouldH:'#A3AE8C',
  duvet:'#7FA8D6', duvetD:'#5F8CC0', pillow:'#FBFBF9', sofa:'#5E8C8A', sofaD:'#4A7472', fabric:'#7FA8D6',
  shadow:'#1C2630'
};
const OL = ` stroke="${INK}" stroke-width="1" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"`;
const n1 = v => +(+v).toFixed(2);
/* shapes with a contour (o = '' for none) */
const R = (x, y, w, h, f, rx=0, o=OL) => `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}"${rx ? ` rx="${rx}"` : ''} fill="${f}"${o}/>`;
const Pp = (d, f, o=OL) => `<path d="${d}" fill="${f}"${o}/>`;
const Cc = (x, y, r, f, o=OL) => `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r)}" fill="${f}"${o}/>`;
const E = (x, y, rx, ry, f, o=OL, rot=0) => `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(rx)}" ry="${n1(ry)}" fill="${f}"${o}${rot ? ` transform="rotate(${rot} ${n1(x)} ${n1(y)})"` : ''}/>`;
/* a texture or detail line (no fill) */
const T = (d, s, w=.8, op=1) => `<path d="${d}" fill="none" stroke="${s}" stroke-width="${w}" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"${op < 1 ? ` opacity="${op}"` : ''}/>`;
const SH = (cx, cy, rx, ry=1.6) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${M.shadow}" opacity=".13"/>`;
const G = (tr, inner) => `<g transform="${tr}">${inner}</g>`;
/* brick courses (mortar lines and staggered joints) on a rectangle */
function courses(x, y, w, h, ch=2.2, st=3.2, col=M.mortar, wt=.7){
  let d = '';
  for(let yy = y + ch; yy < y + h - .3; yy += ch) d += `M${n1(x)} ${n1(yy)}h${n1(w)}`;
  for(let yy = y, k = 0; yy < y + h - .3; yy += ch, k++) for(let xx = x + (k % 2 ? st / 2 : st); xx < x + w - .5; xx += st) d += `M${n1(xx)} ${n1(yy)}v${n1(Math.min(ch, y + h - yy))}`;
  return T(d, col, wt);
}
/* a white uPVC or painted sash window: frame, glass, a reflection, the meeting rail */
function win(x, y, w, h, o={}){
  const g = o.lit ? M.lit : M.glass;
  return R(x, y, w, h, o.frame || M.white, .5) + R(x + .9, y + .9, w - 1.8, h - 1.8, g, 0, '') +
    T(`M${n1(x + 1.6)} ${n1(y + h - 1.8)}L${n1(x + w * .5)} ${n1(y + 1.6)}`, '#FFFFFF', 1, .8) +
    (o.noBar ? '' : R(x, y + h / 2 - .4, w, .8, o.frame || M.white, 0, '')) + R(x, y, w, h, 'none', .5);
}
/* a front door: colour, panels, knob; fan = a fanlight above */
function door(x, y, w, h, col, fan){
  return (fan ? Pp(`M${x} ${y}a${w / 2} ${w / 2} 0 0 1 ${w} 0z`, M.glass) : '') + R(x, y, w, h, col, .3) +
    T(`M${n1(x + 1)} ${n1(y + 1.2)}h${n1(w - 2)}v${n1(h * .38)}h${n1(-(w - 2))}zM${n1(x + 1)} ${n1(y + h * .5)}h${n1(w - 2)}v${n1(h * .4)}h${n1(-(w - 2))}z`, '#000000', .6, .25) +
    Cc(x + w - 1.1, y + h * .55, .45, '#F2C230', '');
}
/* a chimney stack with two clay pots */
const chimney = (x, y, h=7) => R(x, y, 4.4, h, M.brick) + T(`M${x} ${y + 2.4}h4.4M${x} ${y + 4.8}h4.4`, M.mortar, .6) + R(x - .5, y - 1, 5.4, 1.4, M.brickD) + R(x + .5, y - 2.8, 1.4, 1.8, M.pot) + R(x + 2.6, y - 2.8, 1.4, 1.8, M.pot);
/* a slate (or tile) roof from a path, with course lines across it */
const roof = (d, lines, col=M.slate, lcol=M.slateL) => Pp(d, col) + (lines ? T(lines, lcol, .7) : '');
const bush = (x, y, w=6) => E(x, y, w / 2, 1.8, M.leaf) + T(`M${n1(x - w / 4)} ${n1(y - .4)}l.6-.6M${n1(x + w / 6)} ${n1(y - .8)}l.6-.6`, M.leafL, .8);
const tree = (x, y=31.5, r=5) => R(x - .8, y + r - 1, 1.6, 42.5 - (y + r - 1), M.trunk) + Cc(x, y, r, M.leaf) + Cc(x - r * .35, y - r * .3, r * .45, M.leafL, '');
const ground = (x0=2, x1=46, y=42.5) => R(x0, y - .6, x1 - x0, 1.6, M.lawn, .8);
/* a flame: outer orange, inner yellow; cx its centre, top its tip, s its scale (1 = 14 units tall) */
const flame = (cx, top, s=1, cols=[M.flame, M.flameL]) => G(`translate(${n1(cx - 12 * s)} ${n1(top - 3 * s)}) scale(${s})`,
  Pp('M12 3c.5 3.5 4.5 5 4.5 9.5a4.5 4.5 0 0 1-9 0c0-2 1-3.5 2-4.5 0 1.5 1 2.5 2 2.5.5-2-.5-4 .5-7.5z', cols[0]) +
  Pp('M12 8.4c.4 1.8 2.5 2.7 2.5 5a2.5 2.5 0 0 1-5 0c0-1.2.6-2.1 1.3-2.7.1.9.6 1.4 1.1 1.4.2-1.2-.2-2.2.1-3.7z', cols[1], ''));
/* a white panel radiator with its columns */
function radiator(x, y, w, h, col=M.steel){
  let s = R(x, y, w, h, col, 1.6);
  for(let xx = x + 3.2; xx < x + w - 1.5; xx += 3.4) s += R(xx - .45, y + 1.4, .9, h - 2.8, M.steelD, 0, '');
  return s + T(`M${x + 1.4} ${y + 1.2}h${w - 2.8}`, '#FFFFFF', 1, .9);
}
/* a wall-mounted gas boiler: white case, display with a flame, two dials, the pipes below */
function boiler(x, y, w, h, pipes=true){
  let s = '';
  if(pipes) [.2, .35, .5, .65, .8].forEach((t, i) => { const px = x + w * t; s += R(px - .8, y + h, 1.6, 7, i === 2 ? M.steelD : M.copper, 0) + R(px - 1.3, y + h + 3.4, 2.6, 1.4, M.whiteDD, 0, ''); });
  s += R(x, y, w, h, M.white, 2.6) + R(x + w - 2, y + 1, 1.6, h - 2, M.whiteD, 0, '') + R(x, y + h - 4.6, w, 4.6, M.whiteD, 1.4);
  s += R(x + w * .2, y + h * .52, w * .6, h * .22, M.screen, 1) + Pp(`M${n1(x + w * .32)} ${n1(y + h * .7)}c-.7-1 .2-1.5.4-2.5.5.5.8 1 .7 1.4.5-.7.4-1.4.8-2.1.6.9 1.1 1.6.8 2.4z`, M.flame, '') +
       R(x + w * .45, y + h * .58, w * .25, .9, M.screenL, 0, '') + R(x + w * .45, y + h * .64, w * .16, .9, M.screenL, 0, '');
  s += Cc(x + w * .3, y + h * .25, w * .09, M.steelD) + Cc(x + w * .7, y + h * .25, w * .09, M.steelD) + Cc(x + w * .5, y + h * .25, w * .045, M.teal, '');
  return s;
}
/* a person's head, face on: skin and a cap of hair */
const head = (x, y, r=3.2, hcol=M.hair) => Cc(x, y, r, M.skin) + Pp(`M${n1(x - r)} ${n1(y + .2)}a${r} ${r} 0 0 1 ${n1(2 * r)} 0c${n1(-r * .5)}${n1(-r * .55)} ${n1(-r * 1.2)}${n1(-r * .5)} ${n1(-r)}-${n1(r * .1)}c${n1(-r * .5)}${n1(-r * .1)} ${n1(-r * .8)}${n1(r * .2)} ${n1(-r)} ${n1(r * .1)}z`, hcol);
const qGlyph = (x, y, s=1, col=INK) => T(`M${n1(x - 2.4 * s)} ${n1(y - 1.8 * s)}a${n1(2.6 * s)} ${n1(2.6 * s)} 0 1 1 ${n1(3.6 * s)} ${n1(2.4 * s)}c${n1(-.7 * s)} ${n1(.3 * s)}${n1(-1.1 * s)} ${n1(.9 * s)}${n1(-1.1 * s)} ${n1(1.6 * s)}v${n1(.5 * s)}`, col, 1.8) + Cc(x, y + 4.4 * s, .9 * s, col, '');
/* badges laid on a picture: "not sure", "yes", "no", locked */
const qBadge = (x, y, r=7) => Cc(x, y, r, M.paper) + qGlyph(x, y - .4, r / 7);
const tickBadge = (x, y, r=6.6) => Cc(x, y, r, M.ok) + T(`M${n1(x - r * .45)} ${n1(y + .2)}l${n1(r * .3)} ${n1(r * .32)} ${n1(r * .62)}-${n1(r * .66)}`, '#FFFFFF', 1.8);
const lockBadge = (x, y) => Cc(x, y, 7, M.paper) + T(`M${x - 2.3} ${y - .6}v-1.9a2.3 2.3 0 0 1 4.6 0v1.9`, INK, 1.4) + R(x - 3.8, y - .6, 7.6, 5.4, M.ins, 1.2);
const unsureArt = Cc(24, 24, 15, '#F3F5F8') + qGlyph(24, 22.6, 2.2);
const noneArt = Cc(24, 24, 15, '#F3F5F8') + T('M13.4 34.6l21.2-21.2', M.bad, 2.4) + Cc(24, 24, 15, 'none');
/* a pin marking "yours" (the one small teal accent) */
const pin = (x, y) => Pp(`M${x} ${y + 6}c-2.6-3-4-5-4-6.8a4 4 0 0 1 8 0c0 1.8-1.4 3.8-4 6.8z`, M.teal) + Cc(x, y - .8, 1.5, '#FFFFFF', '');
const A = {}, Q = {};

/* ---- homes ---- */
A.unsure = unsureArt; A.none = noneArt;
/* one terraced house front, 14 wide from x: brick, two windows up, a window and a door down; door colour dc */
const terrHouse = (x, dc) => R(x, 22.5, 14, 20, M.brick, 0) + courses(x, 22.5, 14, 20) + win(x + 1.8, 25.4, 4.4, 4.8) + win(x + 7.8, 25.4, 4.4, 4.8) +
  win(x + 1.8, 34, 4.8, 5.4) + door(x + 8, 33.8, 4.2, 8.7, dc) + R(x + 7.4, 33.2, 5.4, .9, M.white, 0, '');
A['home_type:detached'] = SH(24, 43.2, 18, 1.8) + chimney(30.3, 8.6) +
  roof('M7.5 21.5L13.5 10h21l6 11.5z', 'M10 17.5h28M12 13.8h24') + R(10, 21.5, 28, 20, M.brick, 0) + courses(10, 21.5, 28, 20) + R(9, 21.5, 30, 1.2, M.whiteD) +
  win(13, 24.5, 6, 6) + win(21, 24.5, 6, 6) + win(29, 24.5, 6, 6) + win(13, 33.5, 6, 6) + win(29, 33.5, 6, 6) +
  R(20.6, 31.2, 6.8, 1.2, M.white) + door(21.4, 32.4, 5.2, 9.1, M.teal) + R(20.6, 41.2, 6.8, 1, M.whiteDD) + bush(6.5, 41.2, 7) + bush(41.5, 41.2, 7);
A['home_type:semi'] = SH(24, 43.2, 21, 1.8) + chimney(21.8, 7.2, 6) +
  roof('M2 22.5L10.5 11h27L46 22.5z', 'M5 19.5h38M8 15.6h32') + R(4, 22.5, 40, 8, M.render, 0) + T('M6 25h.01M10 27.4h.01M15 24.6h.01M20 27h.01M28 25h.01M33 27.6h.01M38 24.8h.01M42 27h.01', M.renderD, 1.6) +
  R(4, 30.5, 40, 11.5, M.brick, 0) + courses(4, 30.5, 40, 11.5) + R(23.6, 22.5, .8, 19.5, M.renderD, 0, '') +
  Pp('M5.5 42V24.8h9V42', M.white) + Pp('M33.5 42V24.8h9V42', M.white) + Pp('M5 24.8l1.4-2.2h7.2l1.4 2.2zM33 24.8l1.4-2.2h7.2l1.4 2.2z', M.slateD) +
  win(6.6, 26, 6.8, 5.6) + win(6.6, 34.2, 6.8, 5.6) + win(34.6, 26, 6.8, 5.6) + win(34.6, 34.2, 6.8, 5.6) + win(17.2, 24.6, 4.4, 4.4) + win(26.4, 24.6, 4.4, 4.4) +
  R(16.6, 31.9, 14.8, 1.1, M.white) + door(17.2, 33, 4.4, 9, M.teal) + door(26.4, 33, 4.4, 9, M.red);
A['home_type:end_terrace'] = SH(26, 43.2, 22, 1.8) + chimney(14.8, 8, 6) + chimney(28.8, 8, 6) + chimney(42.8, 8, 6) +
  roof('M1.5 22.5L8 12.5H48v10z', 'M4 19.6h44M6.2 16h41.8') + terrHouse(3, M.teal) + terrHouse(17, M.navy) + terrHouse(31, M.red) + terrHouse(45, M.green) +
  T('M17 22.5v20M31 22.5v20M45 22.5v20', M.brickD, .8) + ground(1, 48) + pin(10, 5);
A['home_type:mid_terrace'] = SH(24, 43.2, 24, 1.8) + chimney(.8, 8, 6) + chimney(14.8, 8, 6) + chimney(28.8, 8, 6) + chimney(42.8, 8, 6) +
  roof('M0 22.5V12.5h48v10z', 'M0 19.6h48M0 16h48') + terrHouse(-11, M.green) + terrHouse(3, M.red) + terrHouse(17, M.teal) + terrHouse(31, M.navy) + terrHouse(45, M.red) +
  T('M3 22.5v20M17 22.5v20M31 22.5v20M45 22.5v20', M.brickD, .8) + ground(0, 48) + pin(24, 5);
A['home_type:bungalow'] = SH(24, 43.2, 21, 1.8) + chimney(28.6, 15, 6) +
  roof('M2.5 28.5L10 19.5h28l7.5 9z', 'M5 26h38M7.6 22.8h32.8') + R(5, 28.5, 38, 13.5, M.brick, 0) + courses(5, 28.5, 38, 13.5) + R(4, 28.5, 40, 1.1, M.whiteD) +
  Pp('M7 42V31h10v11', M.white) + win(8, 32, 8, 5.4) + win(30.5, 31.6, 8.4, 5.8) + door(21.6, 32.4, 4.8, 9.6, M.green) + bush(3.5, 41.4, 5) + bush(44.5, 41.4, 5);
A['home_type:flat'] = SH(24, 43.4, 16, 1.6) + R(10, 6, 28, 36.5, M.render, 0) + R(9, 4.8, 30, 1.6, M.slateD) +
  [8.6, 16.6, 24.6].map(y => win(12.8, y, 5.4, 5.6) + win(21.3, y, 5.4, 5.6, y === 16.6 ? {lit:true} : {}) + win(29.8, y, 5.4, 5.6) + R(10, y + 6.6, 28, .9, M.renderD, 0, '')).join('') +
  R(19.6, 33.6, 8.8, 1.2, M.slateD) + door(21.2, 34.8, 5.6, 7.4, M.navy) + win(12.8, 34.4, 5.4, 5.4) + win(29.8, 34.4, 5.4, 5.4) + pin(41.6, 15.8) + T('M38 19.4h1.2', M.teal, 1.2);
/* which floor the flat is on: the block, the ground line, earth round the basement; the floor lit and pinned */
const flatPos = y => R(2, 35, 44, 11, M.earth, 0, '') + T('M5 39h3M14 43h4M36 40h4M40 44h3', M.earthD, 1) + R(11, 5, 26, 39, M.render, 0) + R(10, 3.8, 28, 1.6, M.slateD) +
  [5, 15, 25, 35].map(t => R(11, t, 26, 10, t === y ? M.ins + '55' : 'none', 0, '') + win(14, t + 2.4, 5.6, 5.4, t === y ? {lit:true} : {}) + win(28.4, t + 2.4, 5.6, 5.4, t === y ? {lit:true} : {})).join('') +
  T('M11 15h26M11 25h26M11 35h26', M.renderD, .9) + (y === 25 ? '' : door(21.2, 28.6, 5.6, 6.4, M.navy)) + R(11, 5, 26, 39, 'none', 0) +
  R(2, 34.4, 9, 1.2, M.lawn, 0, '') + R(37, 34.4, 9, 1.2, M.lawn, 0, '') + pin(6.4, y + 1.6);
A['flat_position:basement'] = flatPos(35); A['flat_position:ground'] = flatPos(25); A['flat_position:middle'] = flatPos(15); A['flat_position:top'] = flatPos(5);
/* tenure: a small brick house with something in front of it */
const smallHouse = (x=6, y=13, w=24, dc=M.teal) => roof(`M${x - 2} ${y + 9}L${x + w / 2} ${y}l${w / 2 + 2} ${9}z`, '') + R(x, y + 9, w, 20 - 9 + 9, M.brick, 0) + courses(x, y + 9, w, 20) +
  win(x + 2.4, y + 12.6, 5, 5) + win(x + w - 7.4, y + 12.6, 5, 5) + door(x + w / 2 - 2.4, y + 20.4, 4.8, 8.6, dc);
A['tenure:own'] = SH(24, 43, 18) + smallHouse(5, 13) + G('translate(31 32) rotate(-35)', Cc(0, 0, 5.2, '#E3B23C') + Cc(0, 0, 2, '#FFFFFF') + R(4.6, -1.3, 10, 2.6, '#E3B23C', .6) + R(10.6, 1.3, 1.6, 2.4, '#E3B23C', 0) + R(13.2, 1.3, 1.6, 3.2, '#E3B23C', 0));
A['tenure:housing_association'] = SH(24, 43, 18) + smallHouse(5, 13) + Pp('M36 40s-8-4.8-8-10a4 4 0 0 1 8-1.4 4 4 0 0 1 8 1.4c0 5.2-8 10-8 10z', '#D84A3A') + T('M30.8 28.6c.6-1.2 1.8-1.6 2.8-1.2', '#FFFFFF', 1, .8);
A['tenure:council'] = SH(24, 43.6, 20) + Pp('M4 17L24 6l20 11z', M.stone) + Cc(24, 13, 2.2, M.paper) + T('M24 11.4v1.8l1 .8', INK, .8) + R(5, 17, 38, 2.2, M.stoneD) +
  R(6, 19.2, 36, 17, M.stone, 0) + [9, 16, 23, 30, 36.6].map(x => R(x, 20.6, 2.4, 15, M.paper, .4) + T(`M${x + .8} 21.4v13.6M${x + 1.6} 21.4v13.6`, M.stoneD, .6)).join('') +
  R(20.6, 27, 6.8, 9.2, M.navy, .4) + R(4, 36.2, 40, 2.4, M.stoneD) + R(2.5, 38.6, 43, 2.6, M.stone) + R(1, 41.2, 46, 1.8, M.stoneD) + R(23.4, 1, .9, 6, INK, 0, '') + Pp('M24.3 1h5l-1.4 1.4 1.4 1.4h-5z', '#3D7DD6');
A['tenure:private_rent'] = SH(22, 43, 20) + smallHouse(3, 13, 22, M.red) + R(35.6, 22, 1.6, 21, M.woodD) + R(28.6, 11, 15.6, 11.4, M.paper, 1) + R(28.6, 11, 15.6, 3.2, '#D84A3A', 1) +
  T('M30.8 17.6h11.2M30.8 20h7.8', '#7A8794', 1.2);
A['tenure:shared_ownership'] = SH(22, 43, 18) + smallHouse(4, 13, 24) + Cc(36.4, 29, 7.4, M.paper) + Pp('M36.4 21.6a7.4 7.4 0 0 1 0 14.8z', M.teal) + Cc(36.4, 29, 7.4, 'none');
A['tenure:other'] = SH(24, 43, 20) + smallHouse(4, 13, 24) + head(33.6, 28.4, 3, M.hair) + Pp('M28.6 43v-4a5 5 0 0 1 10 0v4z', '#7FA8D6') + head(41.4, 32, 2.4, M.hair2) + Pp('M37.6 43v-2.8a3.8 3.8 0 0 1 7.6 0V43z', '#E8A33A');
/* the age of the house: each period's style */
A['year_built:pre1919'] = SH(24, 43.2, 18) + chimney(9, 10) + chimney(34.6, 10) + roof('M5 21l3.6-6.4h30.8L43 21z', 'M6.6 18.4h34.8') + R(6.5, 21, 35, 21, M.brick, 0) + courses(6.5, 21, 35, 21) +
  R(6, 21, 36, 1.2, M.stone) + win(9, 23.6, 5, 7) + R(8.6, 23, 5.8, 1, M.stone, 0) + win(33.5, 23.6, 5, 7) + R(33.1, 23, 5.8, 1, M.stone, 0) +
  Pp('M8 42V33.4l1.6-1.6h7.8l1.6 1.6V42', M.stone) + win(9.4, 33.4, 8.2, 6.4) + door(25, 33.8, 5, 8.2, M.navy, true) + R(24, 31.2, 7, .9, M.stone, 0) + win(25, 23.6, 5, 7);
A['year_built:1919_1944'] = SH(24, 43.2, 18) + chimney(30, 8.4) + roof('M5 21L13 10h22l8 11z', 'M7 18.4h34M9.6 14.6h28.8', M.tile, M.tileL) + R(7.5, 21, 33, 9, M.render, 0) +
  T('M10 23.6h.01M14 26h.01M19 24h.01M27 26.4h.01M33 24.4h.01M37 27h.01', M.renderD, 1.6) + R(7.5, 30, 33, 12, M.brick, 0) + courses(7.5, 30, 33, 12) +
  Pp('M9 42V22.4h12V42', M.white) + Pp('M8.4 22.4l1.6-2h10l1.6 2z', M.tile) + win(10.2, 23.6, 9.6, 6) + win(10.2, 32.4, 9.6, 6.4) +
  win(28.6, 23.2, 7, 5.6) + door(28.6, 33.4, 5.4, 8.6, M.green, true) + Pp('M26.8 32.8l1.4-1.6h8.4l1.4 1.6z', M.tile);
A['year_built:1945_1964'] = SH(24, 43.2, 18) + chimney(31, 10.6) + roof('M4.6 22.5L24 11.2l19.4 11.3z', 'M9.4 19.7h29.2M14.2 16.9h19.6', '#8C7B6E', '#A4948A') + R(7.6, 22.5, 32.8, 19.5, M.brickL, 0) + courses(7.6, 22.5, 32.8, 19.5) +
  win(10.4, 25.4, 8, 5.8) + win(29.6, 25.4, 8, 5.8) + win(10.4, 33.8, 8, 6) + R(26.4, 32.6, 9.2, 1.4, M.whiteD) + door(28.2, 34, 5.4, 8, M.red);
A['year_built:1965_1982'] = SH(24, 43.2, 19) + roof('M3.5 22l20.5-6.4 20.5 6.4z', '', M.slateD) + R(5.5, 22, 37, 20, M.brickL, 0) + courses(5.5, 31.5, 37, 10.5) +
  R(5.5, 22, 37, 9.5, M.woodL, 0) + T('M5.5 24.4h37M5.5 26.8h37M5.5 29.2h37', M.woodD, .7) + win(8, 23, 13, 6.4, {noBar:true}) + win(27, 23, 13, 6.4, {noBar:true}) +
  win(8, 33, 14, 6.6, {noBar:true}) + R(27.6, 31.8, 12.4, 10.2, M.whiteD, .4) + T('M27.6 34.4h12.4M27.6 37h12.4M27.6 39.6h12.4', M.whiteDD, .7);
A['year_built:1983_2002'] = SH(24, 43.2, 19) + roof('M4.6 22.5L24 11l19.4 11.5z', 'M9.2 19.8h29.6M13.8 17h20.4', '#8E5A48', '#A66E5A') + R(7.6, 22.5, 32.8, 19.5, M.brick, 0) + courses(7.6, 22.5, 32.8, 19.5) +
  roof('M25 33l7-6 7 6z', '', '#8E5A48') + R(26.4, 33, 11.2, 9, M.whiteD, .4) + T('M26.4 35.4h11.2M26.4 37.8h11.2M26.4 40.2h11.2', M.whiteDD, .7) +
  win(10.6, 25.4, 6.4, 5.6) + win(30.8, 25.4, 6.4, 5.6) + win(10.6, 33.6, 6.4, 5.6) + door(19.4, 33.6, 4.6, 8.4, M.navy);
A['year_built:2003_plus'] = SH(24, 43.2, 19) + Pp('M5 20L24 10l19 10z', M.slateD) + G('rotate(-27.8 24 10)', [0, 1, 2].map(i => R(10.4 + i * 4.6, 11.2, 4.2, 3.2, '#2B4F86', .3) + T(`M${10.4 + i * 4.6} 12.8h4.2M${12.5 + i * 4.6} 11.2v3.2`, '#7FA8D6', .5)).join('')) +
  R(8, 20, 32, 22, '#F4F4F2', 0) + R(8, 20, 11, 22, '#7C8794', 0) + T('M10.2 20v22M12.4 20v22M14.6 20v22M16.8 20v22', '#65707C', .7) +
  win(22, 23, 15, 8.4, {noBar:true}) + win(22, 33.4, 6, 8.6, {noBar:true}) + door(30.8, 33.4, 4.6, 8.6, M.iron);
A['year_built:unsure'] = G('translate(0 0)', `<g opacity=".45">${A['home_type:detached']}</g>`) + qBadge(24, 26);
/* storeys: the same brick house, one to four floors high */
const storeys = n => { const top = 42.5 - n * 8 - 1, rows = Array.from({length: n}, (_, i) => 42.5 - (i + 1) * 8 + 1.6);
  return SH(24, 43.2, 13) + chimney(28.4, top - 8.6, 6) + roof(`M11 ${top}l13-8.6 13 8.6z`, '') + R(14, top, 20, 42.5 - top, M.brick, 0) + courses(14, top, 20, 42.5 - top) +
    rows.map((y, i) => win(16.4, y, 4.6, 4.8) + (i ? win(27, y, 4.6, 4.8) : '')).join('') + door(27, 35.4, 4.4, 7.1, M.teal); };
A['floors:1'] = storeys(1); A['floors:2'] = storeys(2); A['floors:3'] = storeys(3); A['floors:4'] = storeys(4);
/* bedroom sharing: the beds in the bedroom, heads on the pillows */
const bed = (x, w, heads, small, hairs=[M.hair, M.hair2, M.hair3]) => { const hs = Array.from({length: heads}, (_, i) => x + w * (i + .5) / heads), y0 = small ? 20 : 15;
  return R(x, y0, w, small ? 13 : 16, M.oak, 2) + T(`M${x + 1.6} ${y0 + 2.4}h${w - 3.2}`, M.woodD, .7) +
    hs.map((hx, i) => R(hx - 4.4, small ? 25.4 : 24, 8.8, 4.4, M.pillow, 1.8) + head(hx, small ? 25 : 23.4, 2.8, hairs[i % hairs.length])).join('') +
    Pp(`M${x - 1} ${small ? 29 : 28}h${w + 2}l1.4 10H${x - 2.4}z`, M.duvet) + T(`M${x + 1} ${small ? 33 : 32.6}h${w - 2}`, M.duvetD, .8) +
    R(x - .4, 38, 2, 4.4, M.woodD) + R(x + w - 1.6, 38, 2, 4.4, M.woodD); };
A['share:0'] = SH(24, 43, 13) + bed(14, 20, 1);
A['share:1'] = SH(24, 43, 18) + bed(8, 32, 2);
A['share:2'] = SH(24, 43, 22) + bed(2.5, 27, 2) + bed(32, 13.5, 1, true, [M.hair2]);
A['share:3'] = SH(24, 43, 22) + bed(2.5, 27, 2) + bed(32, 13.5, 1, true, [M.hair2]) + Cc(41.6, 9, 4.2, M.paper) + T('M41.6 6.6v4.8M39.2 9h4.8', INK, 1.6);
/* the compass in the middle of the direction picker: a brass compass, the needle red to the north */
A.compass = Cc(24, 24, 16, '#C9A04A') + Cc(24, 24, 13.4, '#FBF7EC') + Array.from({length: 16}, (_, i) => { const a = i * Math.PI / 8, r0 = i % 2 ? 12 : 10.8;
    return T(`M${n1(24 + Math.sin(a) * r0)} ${n1(24 - Math.cos(a) * r0)}L${n1(24 + Math.sin(a) * 13.2)} ${n1(24 - Math.cos(a) * 13.2)}`, '#8A7A5A', .8); }).join('') +
  Pp('M24 24l3.2 0L24 10.4z', '#D84A3A') + Pp('M24 24h-3.2L24 10.4z', '#B8392B') + Pp('M24 24h3.2L24 37.6z', '#E6E9EC') + Pp('M24 24h-3.2L24 37.6z', '#C9CED3') + Cc(24, 24, 1.4, '#C9A04A');

/* ---- heating ---- */
const pipes = (xs, y0, y1, cols) => xs.map((x, i) => R(x - .8, y0, 1.6, y1 - y0, (cols && cols[i]) || M.copper, 0)).join('');
const cylinder = (x, y, w, h, col='#C4473A') => R(x, y, w, h, col, w / 2) + T(`M${x + 1} ${y + h * .25}h${w - 2}M${x + 1} ${y + h * .5}h${w - 2}M${x + 1} ${y + h * .75}h${w - 2}`, '#8E2E25', .8) + T(`M${x + w * .3} ${y + 3}v${h - 6}`, '#FFFFFF', 1.2, .35);
A['heat:gas_combi'] = SH(22, 44.6, 15) + boiler(6, 4, 26, 30) + R(34, 27.4, 6.6, 3, M.steelD, .8) + Pp('M38.6 30.4h2v2.6a1 1 0 0 1-2 0z', M.steelD) + R(36.2, 25.6, 1.4, 1.8, M.steelD, 0) +
  Pp('M39.6 35.2c.9 1.2 1.4 2 1.4 2.6a1.4 1.4 0 0 1-2.8 0c0-.6.5-1.4 1.4-2.6z', M.cold) + T('M42.2 28.6c-.8-1 .8-1.5 0-2.5M44.4 28.6c-.8-1 .8-1.5 0-2.5', M.heat, 1);
A['heat:gas_tank'] = SH(24, 44.6, 20) + boiler(3, 4, 18, 22) + R(21, 15, 6, 1.6, M.copper, 0) + R(25.4, 15, 1.6, 6, M.copper, 0) + cylinder(26, 6, 16, 36);
A['heat:oil'] = SH(24, 44.6, 21) + boiler(3, 4, 17, 22) + R(20, 31.6, 4, 1.6, M.copper, 0) + R(21, 39, 25, 3.6, M.blockL, .4) +
  R(22, 20, 23, 19, '#5E8A4E', 4) + T('M24 25h19M24 33h19', '#4A733D', .8) + R(30, 17.6, 7, 2.6, '#4A733D', .6) + T('M26 23.4c1-.6 2-.6 3 0', '#FFFFFF', 1.2, .4) +
  Pp('M38.6 26.4s2.4 2.6 2.4 4.4a2.4 2.4 0 0 1-4.8 0c0-1.8 2.4-4.4 2.4-4.4z', M.iron);
A['heat:lpg'] = SH(24, 44.6, 20) + boiler(3, 4, 17, 22) + R(20, 15, 9, 1.6, M.copper, 0) + R(27.4, 15, 1.6, 3, M.copper, 0) +
  R(26, 15, 16, 28, '#D8572A', 6) + R(28.6, 11, 10.8, 5, '#D8572A', 1.4) + R(31.4, 8.4, 5.2, 2.8, M.steelD, .6) + T('M26 22h16M26 37h16', '#A84320', .9) + T('M29.4 18.6v20', '#FFFFFF', 1.4, .35);
A['heat:ashp'] = SH(24, 42, 20) + R(4.5, 11, 39, 26, M.whiteD, 2.4) + R(4.5, 11, 39, 26, M.white, 2.4) + Cc(17.5, 24, 10.2, M.iron) + Cc(17.5, 24, 8.8, '#4A5058', '') +
  [0, 72, 144, 216, 288].map(a => G(`rotate(${a} 17.5 24)`, Pp('M17.5 24c0-4 1.8-6.6 4.6-7.4.4 3-1.2 5.8-4.6 7.4z', '#7B838C', ''))).join('') + Cc(17.5, 24, 1.6, M.metal) +
  T('M8 16.4h19M8 31.6h19M10 13.6v20.8M25 13.6v20.8', '#2B2F34', .6, .5) + [15, 19, 23, 27, 31].map(y => R(31, y, 9.4, 1.6, M.whiteDD, .6, '')).join('') +
  R(8, 37, 2.4, 4.4, M.metalD) + R(37.6, 37, 2.4, 4.4, M.metalD) + R(43.5, 28, 3, 1.4, M.copper, 0) + R(43.5, 31, 3, 1.4, M.copper, 0);
A['heat:gshp'] = R(1, 25, 46, 22, M.earth, 0, '') + T('M3 30h6M15 33h5M30 29h6M40 34h5M6 40h4M22 42h5M38 43h5', M.earthD, 1) + ground(1, 47, 25.6) +
  roof('M4 14L13 6l9 8z', '') + R(6, 14, 14, 11.2, M.brick, 0) + courses(6, 14, 14, 11.2) + win(8, 16, 4.4, 4.2) + R(14, 17.4, 4.4, 6, M.white, .6) + Cc(16.2, 19.6, .7, M.screenL, '') +
  R(15.6, 25, 1.4, 8, M.copper, 0) + T('M16.2 33c3.4 0 3.4 8 6.8 8s3.4-8 6.8-8 3.4 8 6.8 8 3.4-8 6.8-8', M.heat, 1.8) + T('M16.2 33c3.4 0 3.4 8 6.8 8s3.4-8 6.8-8 3.4 8 6.8 8 3.4-8 6.8-8', '#FFFFFF', .5, .5) +
  Cc(13, 36, 2.6, '#E3B23C', '') + T('M13 32.4v-1.6M13 41.2v-1.6M9.4 36H7.8M18.2 36h-1.6', '#E3B23C', 1);
A['heat:storage'] = SH(24, 43, 20) + R(5, 13, 38, 26, '#EFE9DC', 2.4) + R(9, 16, 22, 4.6, '#D9D1BF', .8) + T('M10.4 17.2v2.2M13 17.2v2.2M15.6 17.2v2.2M18.2 17.2v2.2M20.8 17.2v2.2M23.4 17.2v2.2M26 17.2v2.2M28.6 17.2v2.2', '#9C9381', .8) +
  R(9, 23.6, 22, 12, '#E5DECD', 1) + [26, 29, 32].map(y => T(`M10.4 ${y}h19.2`, '#C8BFA9', .8)).join('') +
  Cc(37, 20, 2.4, M.white) + Cc(37, 28.4, 2.4, M.white) + T('M37 18.2v1.8M37 26.6v1.8', INK, .9) + R(7, 39, 2.4, 3.6, M.metalD) + R(38.6, 39, 2.4, 3.6, M.metalD);
A['heat:electric'] = SH(22, 42.2, 18) + R(4, 14, 34, 22, M.white, 2) + R(4, 14, 34, 22, 'none', 2) + [10, 14, 18, 22, 26, 30].map(x => T(`M${x} 16v18`, M.whiteD, 1.2)).join('') +
  R(29.4, 16.4, 6.4, 3, M.screen, .6) + R(30.4, 17.4, 3, 1, M.screenL, 0, '') + R(8, 36, 1.8, 4, M.metalD) + R(32, 36, 1.8, 4, M.metalD) +
  T('M36.6 30c5 0 6.4 3 6.4 7', '#5A6068', 1.2) + R(39.4, 37, 7, 5.4, M.white, 1) + T('M41.4 42.4v2M44.4 42.4v2', M.metalD, 1.2) +
  Pp('M23 4.6l-4.6 7.4h3.6l-2.6 6.4 6-8.4h-3.8l2.4-5.4z', '#F2C230');
A['heat:communal'] = SH(24, 43.4, 22) + R(2, 8, 20, 34.5, M.render, 0) + R(1.4, 6.8, 21.2, 1.6, M.slateD) +
  [11, 18.6, 26.2].map(y => win(4.4, y, 5, 5) + win(14.6, y, 5, 5, y === 18.6 ? {lit:true} : {})).join('') + door(9.4, 34.6, 5, 8, M.navy) +
  R(28, 26, 17, 16.5, M.brick, 0) + courses(28, 26, 17, 16.5) + R(35.6, 10, 4, 16, M.brick, 0) + R(35.2, 8.8, 4.8, 1.6, M.brickD) + R(31, 30, 11, 7, M.whiteD, .6) +
  flame(36.5, 30.6, .42) + R(22, 37.4, 6, 1.6, '#D84A3A', 0) + R(22, 40, 6, 1.6, M.cold, 0) + T('M37.6 5.6c-1.2-1 1.2-1.6 0-2.6', '#A9B1B8', 1.2);
const stoveFire = (x=0) => G(`translate(${x} 0)`, R(20.6, 3, 6.8, 13, M.iron, 0) + R(19.8, 14, 8.4, 2.4, M.ironL, .6) + R(9, 16, 30, 23, M.iron, 2.6) + R(9, 16, 30, 3, M.ironL, 1.4) +
  R(13, 21, 22, 14, '#1A1C1F', 1.6) + R(16, 30.2, 16, 2.4, M.oak, 1) + R(18, 28, 13, 2.4, M.woodD, 1) + flame(24, 21.4, .62) + T('M14.4 22.4l5 11.4', '#FFFFFF', 1, .25) +
  R(11, 39, 3, 3.4, M.iron) + R(34, 39, 3, 3.4, M.iron));
A['heat:solid'] = SH(22, 43.2, 20) + stoveFire(-4) + Pp('M36 33h9l-1.4 10h-6.2z', M.iron) + Cc(38.6, 32.4, 1.6, '#2B2B2B') + Cc(41.6, 32.2, 1.5, '#353535') + Cc(40.2, 31, 1.4, '#2B2B2B') + T('M36 33c-1.6-3 0-5 2-6', M.iron, 1.2);
A['heat:none'] = `<g opacity=".5">${radiator(6, 15, 36, 19)}</g>` + T('M8 40L40 10', M.bad, 2.4);
A['heat:unsure'] = unsureArt;
/* other heaters */
A['other:plugin'] = SH(20, 43.4, 16) + R(5, 12, 28, 25, M.steel, 3) + [9.6, 14.2, 18.8, 23.4, 28].map(x => R(x - 1.2, 13.6, 2.4, 21.8, '#E7EBEE', 1.2) + T(`M${x} 15v19`, M.steelD, .8)).join('') +
  R(26, 9.4, 6, 3.4, M.metalD, .8) + Cc(29, 11, .9, '#D84A3A', '') + R(7, 37, 2.4, 3, M.metalD) + R(28.6, 37, 2.4, 3, M.metalD) + Cc(8.2, 41.4, 1.4, M.iron) + Cc(29.8, 41.4, 1.4, M.iron) +
  T('M33 30c6 0 8 3 8 7', '#5A6068', 1.2) + R(37.6, 37, 7, 5.2, M.white, 1) + T('M39.6 42.2v2M42.6 42.2v2', M.metalD, 1.2);
const fireplace = (inner, surround=M.oak) => R(5, 9, 38, 3, surround, .6) + R(7, 12, 34, 30.5, surround, 0) + R(13, 18, 22, 24.5, '#2A2624', 0) + inner + R(10, 41, 28, 2, M.stone, .4);
A['other:gas_fire'] = SH(24, 44, 20) + fireplace(R(15, 21, 18, 18, '#8C8F93', 1) + [17.6, 21.4, 25.2, 29].map((x, i) => E(x + .6, 35.6, 2, 1.4, i % 2 ? '#B9BDC1' : '#A5AAAF', '')).join('') +
  flame(20.4, 25.6, .5) + flame(27, 26.6, .42) + T('M15 21h18', M.steelD, 1.2));
A['other:electric_fire'] = SH(24, 44, 20) + fireplace(R(14.4, 20.4, 19.2, 20, '#D9DDE1', 1.4) + Pp('M15.6 22h16.8v16.8H15.6z', '#B8BEC4', '') +
  R(17, 26, 14, 2.6, '#E8481E', 1.3) + R(17, 31.6, 14, 2.6, '#E8481E', 1.3) + T('M18 27.3h12M18 32.9h12', M.flameL, .8) + T('M19 24.4c.5-.6 1-.6 1.5 0s1 .6 1.5 0M25 24.4c.5-.6 1-.6 1.5 0s1 .6 1.5 0', M.heat, .9), M.white);
A['other:stove'] = SH(24, 43.2, 18) + stoveFire(0);
A['other:open_fire'] = SH(24, 44, 20) + fireplace(R(13, 18, 22, 24.5, '#2A2624', 0) + R(16, 38, 16, 1.4, M.iron, .4) + R(17.4, 39.4, 1.2, 2.4, M.iron, 0) + R(29.4, 39.4, 1.2, 2.4, M.iron, 0) +
  G('rotate(-12 24 36)', R(15.6, 34.6, 16.8, 2.6, M.oak, 1.2)) + G('rotate(12 24 36)', R(15.6, 34.6, 16.8, 2.6, M.woodD, 1.2)) + flame(24, 23.6, .7), M.brick) +
  courses(7, 12, 6, 30.5, 2.4, 3.2) + courses(35, 12, 6, 30.5, 2.4, 3.2);
A['other:electric_blanket'] = SH(24, 43.2, 20) + R(4, 12, 40, 9, M.oak, 2) + R(8, 15.6, 10, 5, M.pillow, 2) + Pp('M4 21h40v16H4z', '#E8C79A') +
  T('M7 25h34l-2.4 3.4H9.4L7 31.8h34', '#D84A3A', 1) + T('M4 29h40', '#D6B285', .6, .6) + R(4, 37, 2.4, 5, M.woodD) + R(41.6, 37, 2.4, 5, M.woodD) +
  T('M44 31c3 0 3 3 0 4.6', M.iron, 1) + R(37.6, 34, 6, 8, M.white, 1.2) + R(38.8, 35.4, 3.6, 2.2, '#D84A3A', .4);
A['other:none'] = noneArt;
/* heating controls */
const dialStat = (cx, cy, r, plate=true) => (plate ? R(cx - r - 3, cy - r - 3, 2 * r + 6, 2 * r + 6, '#F6F3EC', 3.4) : '') + Cc(cx, cy, r, '#FBF9F3') + Cc(cx, cy, r * .66, '#EFE9DC') +
  Array.from({length: 9}, (_, i) => { const a = (-135 + i * 33.75) * Math.PI / 180; return T(`M${n1(cx + Math.sin(a) * r * .78)} ${n1(cy - Math.cos(a) * r * .78)}L${n1(cx + Math.sin(a) * r * .92)} ${n1(cy - Math.cos(a) * r * .92)}`, i > 5 ? '#D84A3A' : '#7A8794', .9); }).join('') +
  T(`M${cx} ${cy}L${n1(cx + r * .45)} ${n1(cy - r * .35)}`, '#D84A3A', 1.6);
A['controls:room_stat'] = SH(24, 42.6, 14) + dialStat(24, 24, 12);
A['controls:smart'] = SH(19, 39.6, 14) + Cc(19, 23, 13.4, '#C9CED3') + Cc(19, 23, 11.2, '#1E2328') + T('M11.6 27.6a8.6 8.6 0 0 1 9-13.1', M.flame, 2.4) + flame(19, 19.4, .38) +
  R(31, 21, 13, 21, '#2B2F34', 2.4) + R(32.4, 23.6, 10.2, 15.6, '#EAF4F2', .8, '') + Cc(37.5, 31.4, 3.6, 'none', ` stroke="${M.flame}" stroke-width="1.4" vector-effect="non-scaling-stroke"`) + T('M33.4 14.4a6.6 6.6 0 0 1 9 0M35.4 17a3.6 3.6 0 0 1 5 0', M.cold, 1.2);
A['controls:programmer'] = SH(24, 40.2, 20) + R(4, 10, 40, 28, M.white, 3) + R(4, 10, 40, 28, 'none', 3) + Cc(16, 24, 9, '#F1EEE6') +
  Array.from({length: 24}, (_, i) => { const a = i * Math.PI / 12, on = i >= 6 && i <= 8 || i >= 16 && i <= 21; return T(`M${n1(16 + Math.sin(a) * 6.8)} ${n1(24 - Math.cos(a) * 6.8)}L${n1(16 + Math.sin(a) * 8.6)} ${n1(24 - Math.cos(a) * 8.6)}`, on ? M.flameD : '#B5BCC2', 1.4); }).join('') +
  Cc(16, 24, 5, M.paper) + T('M16 21v3l2 1.4', INK, .9) + R(28, 15, 12, 6, M.screen, 1) + R(29.4, 16.8, 6, 1.2, M.screenL, 0, '') + R(28, 25.6, 5, 3, M.whiteD, 1) + R(35, 25.6, 5, 3, M.whiteD, 1) + R(28, 30.4, 12, 3, '#D84A3A', 1);
A['controls:trvs'] = SH(18, 41.8, 17) + radiator(2, 18, 22, 21) + R(24, 32, 5, 3.4, M.steelD, 0) + R(28.4, 33.4, 3, 8.6, M.steelD, 0) +
  R(29, 9, 14, 24, M.white, 4.6) + [31.6, 34.6, 37.6, 40.4].map(x => T(`M${x} 12v18`, M.whiteDD, 1)).join('') + R(31, 10.4, 10, 3, '#E6EAED', 1.4, '') +
  T('M36 17v.01M36 20v.01M36 23v.01M36 26v.01', INK, 1.6) + Pp('M34.2 7.6h3.6L36 5.2z', M.teal, '');
A['controls:none'] = noneArt; A['controls:unsure'] = unsureArt;
/* the thermostat question (no longer asked; kept so older profiles still draw) */
A['stat_display:yes'] = SH(24, 40, 16) + R(8, 9, 32, 30, '#F6F3EC', 6) + R(13, 14, 22, 12, M.screen, 2) + R(16, 17.4, 4, 5.4, M.screenL, .6, '') + R(22, 17.4, 4, 5.4, M.screenL, .6, '') + R(28, 20.4, 2, 2.4, M.screenL, .4, '') + Cc(18, 32.6, 1.8, M.whiteD) + Cc(30, 32.6, 1.8, M.whiteD);
A['stat_display:no'] = SH(24, 42.6, 14) + dialStat(24, 24, 12);
A['stat_display:no_stat'] = noneArt;
A['bedroom_trv:yes'] = A['controls:trvs'];
A['bedroom_trv:no'] = SH(24, 42, 20) + radiator(6, 15, 36, 20) + R(9, 35, 2, 5, M.metalD) + R(37, 35, 2, 5, M.metalD);
A['bedroom_trv:no_radiator'] = `<g opacity=".45">${radiator(6, 15, 36, 20)}</g>` + T('M8 40L40 10', M.bad, 2.4);
A['bedroom_trv:unsure'] = unsureArt;
/* how the heating is used (one per row, the picture at the left) */
const loopArrow = T('M24 8.4a15.6 15.6 0 1 1-14.8 10.6', M.flameD, 2.2) + Pp('M5.6 15.6l3.8 3.8 4.2-3.2z', M.flameD, '');
const clockFace = (arcs, hands=true) => { const Rr = 18, pt = h => [n1(24 + Math.sin(h * Math.PI / 6) * Rr), n1(24 - Math.cos(h * Math.PI / 6) * Rr)];
  const sect = ([a, b]) => { const [x0, y0] = pt(a), [x1, y1] = pt(b); return Pp(`M24 24L${x0} ${y0}A${Rr} ${Rr} 0 ${b - a > 6 ? 1 : 0} 1 ${x1} ${y1}z`, '#FBD9A8', ''); };
  return SH(24, 44.2, 13, 1.4) + Cc(24, 24, 20.6, M.metalD) + Cc(24, 24, Rr, M.paper) + arcs.map(sect).join('') +
    Array.from({length: 12}, (_, i) => { const a = i * Math.PI / 6, r0 = i % 3 ? 16 : 14.4; return T(`M${n1(24 + Math.sin(a) * r0)} ${n1(24 - Math.cos(a) * r0)}L${n1(24 + Math.sin(a) * 17.2)} ${n1(24 - Math.cos(a) * 17.2)}`, INK, i % 3 ? .8 : 1.4); }).join('') +
    (hands ? T('M24 24V12.6M24 24l6.6 3.8', INK, 1.6) : '') + Cc(24, 24, 1.4, INK, ''); };
A['pattern:always_on'] = dialStat(24, 24, 10.6, false) + loopArrow;
A['pattern:timer'] = clockFace([[6, 8], [16.5, 21]]);
A['pattern:when_needed'] = R(10, 6, 24, 34, '#F6F3EC', 3) + R(15.6, 13, 12.8, 18, M.white, 2) + Pp('M16.8 22.4h10.4v7.4H16.8z', M.whiteD, '') + Cc(22, 18, 1, '#D84A3A', '') +
  Pp('M30 44V31.2a2.2 2.2 0 0 0-4.4 0V36l-1.6-1.6a2 2 0 0 0-2.8 2.8l4.4 6.8z', M.skin) + Pp('M25.6 31.2V26a2.2 2.2 0 0 1 4.4 0v5.2', M.skin) + E(27.8, 25.2, 1.4, 1, M.nail, '');
A['pattern:most_day'] = clockFace([[8, 17]]);
A['pattern:rarely'] = SH(24, 44, 16, 1.4) + R(6, 8, 36, 34, M.paper, 3) + R(6, 8, 36, 8, '#D84A3A', 3) + R(6, 13, 36, 3, '#D84A3A', 0, '') + R(13, 5, 2.4, 6, M.metalD, 1.2) + R(32.6, 5, 2.4, 6, M.metalD, 1.2) +
  Array.from({length: 15}, (_, i) => R(9.4 + (i % 5) * 6.2, 19 + Math.floor(i / 5) * 6.8, 4.6, 4.8, i === 7 ? M.flame : '#EEF0F2', .8, i === 7 ? OL : '')).join('');
A['pattern:not_me'] = dialStat(14, 22, 8.4) + head(34, 15, 4.4, M.hair2) + Pp('M24.6 44v-8.4a9.4 9.4 0 0 1 18.8 0V44z', '#8E6CB5') + Pp('M26 30.4l-5.8-4.6a1.6 1.6 0 0 1 2-2.6l6.4 4.4z', M.skin);
/* how long the heating has been on: the clock with the time it has run shaded */
A['heat_for:always'] = dialStat(24, 24, 10.6, false) + loopArrow;
A['heat_for:30_60'] = clockFace([[0, 1]]);
A['heat_for:1_2h'] = clockFace([[0, 2]]);
A['heat_for:2_4h'] = clockFace([[0, 4]]);
A['heat_for:gt4h'] = clockFace([[0, 7]]) + T('M6.4 32.4A19 19 0 0 1 24 5', M.flameD, 1.6, .9);
A['heat_for:unsure'] = `<g opacity=".45">${clockFace([])}</g>` + qBadge(24, 24);

/* ---- walls, roof and windows ---- */
/* A wall block cut open: the outside face in perspective on the left, the layers cut through at the front.
 * layers, outside first: [kind, width]; kinds: brick, solid (two bricks), ins (fibre), board (rigid insulation),
 * block, plaster, render, pboard (plasterboard). */
const LAYER = { brick:[M.brick, M.brickL], solid:[M.brick, M.brickL], ins:[M.ins, M.insL], board:['#EAD488', '#F3E2A4'], block:[M.block, M.blockL],
  plaster:[M.plaster, '#FFFFFF'], render:[M.render, '#F7F0DF'], pboard:[M.board, '#FFFFFF'] };
function wallBlock(layers, extra=''){
  const W = layers.reduce((s, l) => s + l[1], 0), x0 = n1(24 - (W - 11) / 2), y0 = 18, y1 = 44, dx = -11, dy = -9;
  const face = layers[0][0];
  let s = SH(24, 45, 18, 2);
  s += Pp(`M${x0} ${y0}L${n1(x0 + dx)} ${y0 + dy}V${y1 + dy}L${x0} ${y1}Z`, LAYER[face][0]);                    // the outside face
  if(face === 'brick' || face === 'solid'){
    let d = '', v = '';
    for(let k = 1; k < 9; k++){ const y = y0 + k * 2.9; d += `M${x0} ${n1(y)}L${n1(x0 + dx)} ${n1(y + dy)}`; }
    for(let k = 0; k < 9; k++){ const y = y0 + k * 2.9; for(let t = (k % 2 ? .22 : .5); t < 1; t += .55) v += `M${n1(x0 + dx * t)} ${n1(y + dy * t)}v2.9`; }
    s += T(d + v, M.mortar, .8);
  } else s += T(`M${n1(x0 - 3)} ${n1(y0 + 2)}l-2 4M${n1(x0 - 7)} ${n1(y0 + 9)}l-1.6 3M${n1(x0 - 4)} ${n1(y0 + 15)}l-1.4 3`, M.renderD, 1.2);
  let x = x0;
  layers.forEach(([k, w]) => { s += Pp(`M${n1(x)} ${y0}L${n1(x + dx)} ${y0 + dy}H${n1(x + w + dx)}L${n1(x + w)} ${y0}Z`, LAYER[k][1]); x += w; });   // tops
  x = x0;
  layers.forEach(([k, w]) => {                                                                                                  // the cut end
    s += R(x, y0, w, y1 - y0, LAYER[k][0], 0);
    if(k === 'brick') s += T(`M${n1(x)} 21.2h${w}M${n1(x)} 24.4h${w}M${n1(x)} 27.6h${w}M${n1(x)} 30.8h${w}M${n1(x)} 34h${w}M${n1(x)} 37.2h${w}M${n1(x)} 40.4h${w}`, M.mortar, .8);
    if(k === 'solid') s += T(`M${n1(x)} 21.2h${w}M${n1(x)} 24.4h${w}M${n1(x)} 27.6h${w}M${n1(x)} 30.8h${w}M${n1(x)} 34h${w}M${n1(x)} 37.2h${w}M${n1(x)} 40.4h${w}` +
      [0, 2, 4, 6].map(i => `M${n1(x + w / 2)} ${n1(18 + i * 3.2)}v3.2`).join('') + [1, 3, 5, 7].map(i => `M${n1(x + w * .25)} ${n1(18 + i * 3.2)}v3.2M${n1(x + w * .75)} ${n1(18 + i * 3.2)}v3.2`).join(''), M.mortar, .8);
    if(k === 'block') s += T(`M${n1(x)} 26.6h${w}M${n1(x)} 35.2h${w}M${n1(x + w / 2)} 18v8.6M${n1(x + w / 2)} 35.2V44`, M.blockD, .8);
    if(k === 'ins') for(let y = 19.6; y < 43; y += 3.1) s += T(`M${n1(x + .6)} ${n1(y + 1.4)}c1.2-1.8 2.4 1 3.2-.6s1.8 1.4 2.8-.2`, M.insD, 1);
    if(k === 'board') s += T(`M${n1(x + .5)} 18v26M${n1(x + w - .5)} 18v26`, '#A9B1B8', 1.4) + T(`M${n1(x + w / 2)} 18v26`, '#D6BE6A', .6);
    x += w;
  });
  return s + extra;
}
/* heat escaping through a bare wall: warm wavy arrows from the room (right) out to the cold (left) */
const escape = y => T(`M45 ${y}c-2 0-2-2-4-2s-2 2-4 2-2-2-4-2-2 2-4 2-2-2-4-2-2 2-4 2-2-2-4-2-2 2-4 2-2-2-4-2-2 2-4 2H4`, M.flameD, 1.8) + T(`M7.4 ${y - 2.8}L4.4 ${y}l3 2.8`, M.flameD, 1.8);
A['wall:cavity']   = wallBlock([['brick', 8], ['ins', 7], ['block', 7], ['plaster', 1.8]]);
A['wall:external'] = wallBlock([['render', 1.6], ['board', 6], ['solid', 12], ['plaster', 1.8]]);
A['wall:internal'] = wallBlock([['solid', 12], ['board', 5.6], ['pboard', 1.8]]);
A['wall:none']     = wallBlock([['solid', 12], ['plaster', 1.8]], escape(26) + escape(36));
A['wall:unsure']   = `<g opacity=".45">${wallBlock([['solid', 12], ['plaster', 1.8]])}</g>` + qBadge(24, 28);
/* the loft: a house cut through, the room below, the roof space above the ceiling joists */
const rafters = Pp('M4 27.4L24 8.6 44 27.4 41.8 27.4 24 11 6.2 27.4z', M.wood) + Pp('M2.4 27L24 6.4 45.6 27 43.6 28.4 24 9.6 4.4 28.4z', M.slate) + T('M7.6 23.4L24 8.2M10 25.6L24 12.4', M.slateL, .7);
const loftRoom = R(9.5, 26, 29, 16, M.room, 0, '') + win(13, 29.5, 7, 7) + radiator(26, 35.4, 9.6, 5) +
  Pp('M24 31.2c1.6 0 2.4-1.2 2.4-2.4V27.6h-4.8v1.2c0 1.2.8 2.4 2.4 2.4z', '#F7D27A', '') + T('M24 26v1.6', INK, .8);
const loftHouse = (inner, warm) => SH(24, 44, 19, 1.8) + loftRoom + Pp('M9.6 26L24 12.4 38.4 26z', M.loft, '') + inner +
  R(8, 26, 32, 1.4, M.wood) + R(8, 26, 2, 16.4, M.brick) + R(38, 26, 2, 16.4, M.brick) + rafters + R(6, 42, 36, 1.2, M.whiteDD, 0, '') + (warm || '');
const blanket = Pp('M10.4 26L15 21.6C17 22.6 19 21 21 21.8s4 .2 6 0 4 .6 6-.2L37.6 26z', M.ins) + [13, 16, 19, 22, 25, 28, 31, 34].map(x => T(`M${x} 25c.6-1.2 1.4-1.2 2 0`, M.insD, .8)).join('');
const joists = [11.5, 16.5, 21.5, 26.5, 31.5, 36].map(x => R(x - .7, 24, 1.4, 2.2, M.wood)).join('');
const rise = x => T(`M${x} 33c-1.6-1.6 1.6-2.4 0-4s1.6-2.4 0-4 1.6-2.4 0-4 1.6-2.4 0-4`, M.flameD, 1.6) + T(`M${x - 2.2} 18.8L${x} 16.4l2.2 2.4`, M.flameD, 1.6);
A['loft:yes'] = loftHouse(blanket + [11.5, 16.5, 21.5, 26.5, 31.5, 36].map(x => R(x - .7, 24.4, 1.4, 1.8, M.wood, 0, '')).join(''));
A['loft:no'] = loftHouse(joists, rise(18) + rise(30));
A['loft:no_loft'] = SH(24, 44, 17, 1.6) + R(8, 5, 32, 38, M.render, 0) + R(7, 3.6, 34, 1.6, M.slateD) +
  R(9.4, 6.6, 29.2, 11, '#EDF0F2', 0, '') + head(29, 11.6, 2.4, M.hair2) + Pp('M25.6 17.6v-1.8a3.4 3.4 0 0 1 6.8 0v1.8z', '#8E6CB5') + R(12, 13.4, 9, 4.2, M.sofa, 1) + win(13.4, 8, 4.4, 4) +
  R(9.4, 18.6, 29.2, 11, M.room, 0, '') + R(12, 25, 9, 4.6, M.sofa, 1) + win(26.6, 20.4, 7, 5.6) + Pp('M17.4 24c1.2 0 1.8-.9 1.8-1.8v-1h-3.6v1c0 .9.6 1.8 1.8 1.8z', '#F7D27A', '') +
  R(9.4, 30.6, 29.2, 11, '#EDF0F2', 0, '') + win(13, 32.6, 6, 5.4) + door(27.6, 34, 5, 7.6, M.navy) +
  R(8, 17.6, 32, 1, M.stoneD) + R(8, 29.6, 32, 1, M.stoneD) + R(8, 5, 32, 38, 'none', 0) + pin(42.6, 21.4);
A['loft:unsure'] = `<g opacity=".45">${loftHouse(joists)}</g>` + qBadge(24, 19);
/* glazing: the window face on, and the edge of its glass in a magnifier */
const glassBar = xs => xs.map(x => R(x, 18.4, 2.6, 12.2, M.glass) + T(`M${n1(x + .7)} 29.4l1-9.8`, '#FFFFFF', 1, .85)).join('');
const zoomWin = (inner, frame=M.white) => SH(24, 44, 17, 1.6) + R(3, 9, 15, 30, frame, 1) + R(5, 11, 11, 12, M.glass, 0, '') + R(5, 25, 11, 12, M.glass, 0, '') + R(3, 23, 15, 2, frame, 0, '') +
  T('M6 21l5-9M6 35l5-9', '#FFFFFF', 1.2, .8) + R(3, 9, 15, 30, 'none', 1) + Cc(17.4, 31, 2.6, 'none', ` stroke="${M.whiteDD}" stroke-width="1.2" vector-effect="non-scaling-stroke"`) +
  T('M19.4 29.4L23.6 14M19.4 32.6L23.6 35', M.whiteDD, 1) +
  Cc(32, 24.5, 13, M.white) + Pp('M20.6 18.4A13 13 0 0 1 43.4 18.4Z', M.whiteD, '') + Pp('M20.6 30.6A13 13 0 0 0 43.4 30.6Z', M.whiteD, '') + inner + Cc(32, 24.5, 13, 'none');
const spacerBar = (x, w) => R(x, 18.4, w, 2.2, '#4A535B') + R(x, 28.4, w, 2.2, '#4A535B') + T(`M${n1(x + 1)} 19.5h.01M${n1(x + w / 2)} 19.5h.01M${n1(x + w - 1)} 19.5h.01`, '#9AA3AA', 1.2);
A['glazing:single'] = zoomWin(glassBar([30.7]));
A['glazing:double'] = zoomWin(R(28.6, 18.4, 6.8, 12.2, '#E3F2FB', 0, '') + spacerBar(28.8, 6.4) + glassBar([26.2, 35.2]));
A['glazing:triple'] = zoomWin(R(26.4, 18.4, 11.2, 12.2, '#E3F2FB', 0, '') + spacerBar(26.4, 3.4) + spacerBar(34.2, 3.4) + glassBar([23.8, 30.7, 37.6]));
A['glazing:mixed'] = SH(24, 43, 21, 1.6) + R(3, 9, 18, 30, M.woodL, .8) + R(5, 11, 14, 12, M.glass, 0, '') + R(5, 25, 14, 12, M.glass, 0, '') +
  T('M12 11v12M5 17h14M12 25v12M5 31h14', M.woodL, 1.4) + R(3, 23, 18, 2, M.woodL, 0, '') + T('M6 21l4-8M6 35l4-8', '#FFFFFF', 1.2, .8) + R(3, 9, 18, 30, 'none', .8) +
  R(26, 9, 19, 30, M.white, 1.4) + R(28.6, 11.6, 13.8, 24.8, M.glass, .4) + T('M30 34l6-21M33 35l6-20', '#FFFFFF', 1.2, .8) + R(28.6, 11.6, 13.8, 24.8, 'none', .4) + R(40, 22.4, 1.2, 4.4, M.metal, .6, '');
A['glazing:unsure'] = `<g opacity=".45">${zoomWin(glassBar([30.7]))}</g>` + qBadge(24, 24);
/* can the windows be opened: two casements, open (sash swung out, cool air coming in) or shut */
const winShut = x => R(x, 9, 19, 30, M.white, 1) + R(x + 2.4, 11.4, 14.2, 25.2, M.glass, 0, '') + T(`M${x + 4} 33l6-20M${x + 7.4} 34l5.6-18`, '#FFFFFF', 1.2, .8) + R(x + 2.4, 11.4, 14.2, 25.2, 'none', 0) + R(x + 13.6, 22.4, 1.4, 4.6, M.metal, .6, '');
const winOpen = x => R(x, 9, 19, 30, M.white, 1) + R(x + 2, 11, 15, 26, M.sky, 0, '') + T(`M${x + 16} 19c-2 0-2 1.6-4 1.6s-2-1.6-4-1.6M${x + 16} 27c-2 0-2 1.6-4 1.6s-2-1.6-4-1.6`, M.cold, 1.2) +
  R(x + 2, 11, 15, 26, 'none', 0) + Pp(`M${x + 2} 11l7.4 3.2v27.4L${x + 2} 37z`, M.glass) + Pp(`M${x + 2} 11l7.4 3.2v27.4L${x + 2} 37z`, 'none') + T(`M${x + 3.4} 33l4-16`, '#FFFFFF', 1, .8);
A['windows_open:yes'] = SH(24, 43, 21, 1.6) + winOpen(3) + winOpen(26);
A['windows_open:some'] = SH(24, 43, 21, 1.6) + winOpen(3) + winShut(26);
A['windows_open:no'] = SH(24, 43, 21, 1.6) + winShut(3) + winShut(26) + lockBadge(38.5, 36.5);
/* damp or mould: a room seen from the doorway, with dark mould spots in the corners and round the window */
const mould = (cx, cy, rx, ry, n) => { let seed = Math.round(cx * 7 + cy * 13), d = '';
  const r = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for(let i = 0; i < n; i++){ const a = r() * 6.283, k = Math.sqrt(r()); d += Cc(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k, .5 + r() * .8, M.mould, ''); }
  return E(cx, cy, rx + 1, ry + 1, M.mouldH, '') + d; };
const roomBox = (inner, extra='') => Pp('M10 32h28l7 11H3z', M.oak) + T('M8 35h32M6 38.4h36M4.4 41.6h39.2', M.woodD, .6, .7) +
  Pp('M3 3l7 5v24L3 43z', '#E6DDCF') + Pp('M45 3l-7 5v24l7 11z', '#E6DDCF') + Pp('M3 3h42l-7 5H10z', '#FAF7F2') + R(10, 8, 28, 24, '#F3EDE2', 0) + extra + inner;
const backWin = (x, y, w, h) => R(x - .6, y - .6, w + 1.2, h + 1.2, M.white, .4) + R(x, y, w, h, M.sky, 0, '') + T(`M${n1(x + w / 2)} ${y}v${h}M${x} ${n1(y + h / 2)}h${w}`, M.white, 1.2);
const bedSide = R(12.5, 20, 13, 10.5, M.oak, 1.4) + R(14.5, 25, 5, 3.2, M.pillow, 1.2) + Pp('M11 29.5h17l1.6 8.5H9.4z', M.duvet) + T('M13 33.5h13', M.duvetD, .8);
A['damp:bedroom'] = roomBox(bedSide, backWin(26, 12, 8.4, 8.4) + mould(12.3, 10.4, 2.6, 1.8, 10) + mould(34.4, 12, 2.2, 1.6, 7) + mould(25.4, 21.6, 1.6, 1.2, 4));
A['damp:living'] = roomBox(Pp('M14.5 23h19v6h-19z', M.sofa) + R(12.5, 28, 23, 5, M.sofa, 1.5) + R(10.5, 25, 4, 9, M.sofaD, 1.6) + R(33.5, 25, 4, 9, M.sofaD, 1.6) + R(18, 24.4, 5, 3.6, '#E8A33A', 1) +
  T('M13 34v2.5M35 34v2.5', M.iron, 1.2), backWin(15.4, 11, 10.4, 8.4) + mould(36, 10.4, 2.4, 1.8, 9) + mould(15, 11, 1.8, 1.6, 7) + mould(26.4, 20.2, 1.4, 1.1, 4));
A['damp:kitchen'] = roomBox(R(11, 25, 26, 9, M.white) + R(11, 24, 26, 1.4, M.stone) + T('M19.6 25v9M28.3 25v9', M.whiteDD, .9) + Cc(17.4, 29.5, .5, INK, '') + Cc(21.8, 29.5, .5, INK, '') + Cc(30.5, 29.5, .5, INK, '') +
  Pp('M13 24v-3.2h4V24', M.steelD) + R(29.5, 23, 6, 1, M.iron, 0), backWin(18, 11, 12, 8.4) + mould(11.8, 10.2, 2.2, 1.6, 8) + mould(30.2, 11.2, 1.8, 1.4, 6) + mould(36.6, 18, 1.2, 2.6, 6));
A['damp:bathroom'] = roomBox(Pp('M11 25.5h25v3.5a5 5 0 0 1-5 5H16a5 5 0 0 1-5-5z', M.white) + T('M13 27.2h21', M.ice, 1.4) + T('M14 34l-.8 2M33 34l.8 2', M.metalD, 1.2) +
  T('M34 25.5V13.5h-3', M.metal, 1.2) + R(28.5, 13, 3, 1.8, M.metal, .4),
  R(10, 8, 28, 24, '#E8F1F4', 0, '') + T('M10 14h28M10 20h28M10 26h28M15 8v24M21 8v24M27 8v24M33 8v24', '#C9D6DC', .8) + mould(36.2, 10, 2.3, 1.6, 10) + mould(12.8, 22.8, 1.8, 1.3, 6) + mould(21, 10.2, 1.6, 1, 4));
A['damp:elsewhere'] = roomBox(door(19, 12.5, 10, 19.5, M.oak) + T('M33.5 15.5v2.4', M.metalD, 1.2) + Pp('M31 18h5l1 7h-7z', '#8E6CB5'), mould(11.8, 10.2, 2.4, 1.8, 9) + mould(36.4, 10.2, 2, 1.6, 8) + mould(24, 10.2, 2.2, 1.1, 5));
A['damp:none'] = roomBox(bedSide, backWin(26, 12, 8.4, 8.4)) + tickBadge(39, 37.6);
A['damp:unsure'] = `<g opacity=".45">${roomBox('', backWin(26, 12, 8.4, 8.4))}</g>` + qBadge(24, 22);

/* ---- the check-in's answer pictures (pic) ---- */
const TOP = '#5B87C5', TOPD = '#4A73AE', LEGS = '#33465F';
const shoe = (x, y, w=5) => E(x, y, w / 2, 1.4, M.iron);
/* activities: people */
Q.sleep = SH(24, 43.4, 20) + R(3.6, 15, 4, 25, M.oak, 1.2) + R(3.6, 28, 40.4, 6.4, M.white, 1.4) + R(7.6, 23.6, 10, 5, M.pillow, 2.2) + head(12.4, 23, 3.6, M.hair) + T('M11 23.6h1.6M13.8 23.6h1.4', INK, .9) +
  Pp('M15.4 22.6c4-2.2 13-2.4 19-.4 4 1.4 7.4 3.4 9.6 5.8v.4H15.4z', M.duvet) + T('M19 25.6c4-1 10-1 16 .6', M.duvetD, .8) + R(4.4, 34.4, 2.4, 7.6, M.woodD) + R(41, 34.4, 2.4, 7.6, M.woodD) +
  T('M27.6 6.6h4.4l-4.4 4.8h4.4', M.cold, 1.8) + T('M35.4 2.8h3.2l-3.2 3.6h3.2', M.cold, 1.4);
Q.lying = SH(24, 43.4, 21) + R(4, 27, 40, 10, M.sofa, 2.4) + R(2.6, 20.4, 6.6, 17, M.sofaD, 2.6) + R(38.8, 20.4, 6.6, 17, M.sofaD, 2.6) + R(8, 37, 2.2, 4.4, M.iron) + R(37.8, 37, 2.2, 4.4, M.iron) +
  head(11.6, 20.4, 3.8, M.hair) + R(14.4, 19.4, 14, 8, TOP, 4) + R(27, 21.6, 13.4, 5.8, LEGS, 2.8) + E(40.6, 22.4, 2, 2.6, M.iron) + T('M18 23.4h7', TOPD, .8);
Q.actSit = SH(24, 43.6, 18) + R(9.6, 11, 28.8, 25, M.sofa, 6) + R(5, 23, 9, 16, M.sofaD, 3.6) + R(34, 23, 9, 16, M.sofaD, 3.6) + R(12, 31, 24, 8, M.sofa, 2.4) +
  R(9, 39, 2.4, 4, M.iron) + R(36.6, 39, 2.4, 4, M.iron) + head(24, 12.6, 4.6, M.hair) + Pp('M16 32v-9.6a8 8 0 0 1 16 0V32z', TOP) +
  R(16.4, 30, 15.2, 5.6, LEGS, 2.6) + R(17, 33, 5.6, 9, LEGS, 2) + R(25.4, 33, 5.6, 9, LEGS, 2) + shoe(19.8, 42.4) + shoe(28.2, 42.4) + Cc(15.4, 30.8, 1.8, M.skin) + Cc(32.6, 30.8, 1.8, M.skin);
Q.actDesk = SH(24, 43.6, 20) + R(5, 30, 13, 2.6, M.oak, 1) + R(10.4, 32.6, 2.2, 10, M.iron) + R(4.6, 18, 2.6, 13, M.oak, 1) +
  R(21, 25, 25, 2.6, M.oak, 1) + R(42.4, 27.6, 2.2, 15, M.woodD) + R(23, 27.6, 2.2, 15, M.woodD) +
  R(28, 23.2, 13, 1.8, M.steelD, .6) + Pp('M40.6 23.2l3.2-10.6h1.8l-3.2 10.6z', M.iron) + head(13, 11.2, 4.2, M.hair) + Pp('M7.8 30.6V20.4a5.2 5.2 0 0 1 10.4 0v10.2z', TOP) +
  R(14, 20.2, 13.6, 3.2, TOPD, 1.6) + Cc(28.2, 21.8, 1.8, M.skin) + R(12, 28.4, 13, 3.6, LEGS, 1.8) + R(21.4, 28.4, 3.6, 13.4, LEGS, 1.6) + shoe(24.4, 42.4);
Q.stand = SH(24, 44, 11) + head(24, 9.6, 4.8, M.hair) + Pp('M15.6 30V21.6a8.4 8.4 0 0 1 16.8 0V30z', TOP) + R(12.4, 18.6, 4.2, 13.4, TOPD, 2.1) + R(31.4, 18.6, 4.2, 13.4, TOPD, 2.1) +
  Cc(14.5, 32.6, 1.9, M.skin) + Cc(33.5, 32.6, 1.9, M.skin) + R(16.8, 29, 6.8, 13.4, LEGS, 1) + R(24.4, 29, 6.8, 13.4, LEGS, 1) + shoe(19.6, 42.8, 6) + shoe(28.4, 42.8, 6) + T('M19 23h10', TOPD, .8);
Q.walk = SH(24, 44, 13) + head(26.4, 8.4, 4.4, M.hair) + G('rotate(14 24 30)', R(19.6, 16.6, 9, 14, TOP, 3.6)) + G('rotate(38 22 19)', R(20, 17, 3.6, 12.6, TOPD, 1.8)) + G('rotate(-36 28 19)', R(26.6, 17, 3.6, 12.6, TOPD, 1.8)) +
  G('rotate(24 22 30)', R(19.4, 29, 4.4, 14, LEGS, 2)) + G('rotate(-26 24 30)', R(23, 29, 4.4, 14, LEGS, 2)) + shoe(16.8, 42.6, 5.4) + shoe(32.4, 42.2, 5.4) + Cc(14.6, 26, 1.8, M.skin) + Cc(34.8, 26.6, 1.8, M.skin);
Q.gym = SH(24, 38, 20) + R(5, 14, 6.6, 20, M.iron, 1.6) + R(11.2, 17, 4.4, 14, M.ironL, 1.2) + R(36.4, 14, 6.6, 20, M.iron, 1.6) + R(32.4, 17, 4.4, 14, M.ironL, 1.2) +
  R(15.6, 22.4, 16.8, 3.2, M.steelD, 1.2) + T('M19 24h10', '#FFFFFF', 1, .8) + R(2.6, 20, 2.4, 8, M.metalD, .8) + R(43, 20, 2.4, 8, M.metalD, .8);
Q.pan = SH(24, 44.6, 21) + R(3, 33, 42, 9.6, M.white, 1.4) + R(8, 36.6, 32, 4.4, M.screen, 1) + R(3, 31, 42, 2.6, M.iron, .8) +
  Pp('M13.4 31c-1-1.2.2-2 .6-3.2.8.8 1.2 1.4 1 2 .6-1 .6-1.8 1.2-2.6.8 1.2 1.4 2.2 1 3.8zM27 31c-1-1.2.2-2 .6-3.2.8.8 1.2 1.4 1 2 .6-1 .6-1.8 1.2-2.6.8 1.2 1.4 2.2 1 3.8z', '#4A8FE7', '') +
  Pp('M8 18.4h24v6.4a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4z', M.steelD) + R(7, 17, 26, 2.4, M.steel, 1.2) + R(32.6, 19.2, 12, 2.8, M.iron, 1.4) + T('M10.4 21.4h19', '#FFFFFF', 1, .6) +
  T('M14 13c-1.4-1.6 1.4-2.4 0-4M20 12c-1.4-1.6 1.4-2.4 0-4M26 13c-1.4-1.6 1.4-2.4 0-4', '#A9B1B8', 1.4);
/* rooms */
Q.sofa = SH(24, 42.6, 21) + R(7.6, 14, 32.8, 13, M.sofa, 3.6) + R(7.6, 25, 32.8, 8, M.sofa, 1.6) + T('M18.6 25v8M29.4 25v8', M.sofaD, .9) + R(3.4, 19, 7, 17, M.sofaD, 3) + R(37.6, 19, 7, 17, M.sofaD, 3) +
  R(12, 17.6, 8, 7, '#E8A33A', 2.4) + R(28, 17.6, 8, 7, '#D84A3A', 2.4) + R(7, 36, 2.4, 4.4, M.iron) + R(38.6, 36, 2.4, 4.4, M.iron);
Q.bed = SH(24, 43, 21) + R(6, 9, 36, 19, M.oak, 3) + T('M9 12h30', M.woodD, .8) + R(8.6, 20, 13.4, 6.6, M.pillow, 2.6) + R(26, 20, 13.4, 6.6, M.pillow, 2.6) +
  Pp('M4.6 26.4h38.8l1.8 11.6H2.8z', M.duvet) + R(4, 26.4, 40, 3.4, '#A8C6E8', 1.4) + T('M6 33.6h36', M.duvetD, .8) + R(4.4, 38, 2.6, 4.4, M.woodD) + R(41, 38, 2.6, 4.4, M.woodD);
Q.laptop = SH(24, 40.4, 21) + R(9, 7, 30, 21, '#3A3F45', 2) + R(11, 9, 26, 16.6, M.glass, .6, '') + T('M14 22l8-11M19 23l7-10', '#FFFFFF', 1.2, .7) + Cc(24, 26.6, .5, M.metal, '') +
  Pp('M4 30h40l-3.4 6H7.4z', M.steelD) + T('M10 32h28M9 34h30', M.metal, .8) + R(4, 28, 40, 2, M.steel, .8);
Q.bath = SH(24, 42.6, 21) + R(3.6, 19.6, 40.8, 2.6, M.white, 1.2) + Pp('M5 22.2h38v3.6a10 10 0 0 1-10 10H15a10 10 0 0 1-10-10z', M.white) + Pp('M6.4 23.6h35.2v2a8.4 8.4 0 0 1-.4 2.4H6.8a8.4 8.4 0 0 1-.4-2.4z', M.ice, '') +
  Cc(14, 22, 1.6, '#FFFFFF') + Cc(18, 21.2, 1.2, '#FFFFFF') + Cc(30, 21.6, 1.4, '#FFFFFF') + R(9, 35, 2.6, 5, '#C9A04A', .8) + R(36.4, 35, 2.6, 5, '#C9A04A', .8) +
  T('M38 19.6V9.4a3 3 0 0 0-6 0', M.metal, 1.8) + R(30.4, 9.4, 3.2, 2.2, M.metal, .6);
Q.door = SH(24, 44, 13) + R(11, 4, 26, 39, M.white, .6) + door(13.4, 6.4, 21.2, 36.6, M.oak) + T('M17 9v13M21 9v13M28 9v13', M.woodD, .5, .5);
/* how you feel about the temperature, acceptability */
Q.snow = `<g stroke="${M.cold}" stroke-width="2.2" stroke-linecap="round" vector-effect="non-scaling-stroke" fill="none">` +
  [0, 60, 120].map(a => `<g transform="rotate(${a} 24 24)"><path d="M24 7v34M24 11l-3.6-3.2M24 11l3.6-3.2M24 37l-3.6 3.2M24 37l3.6 3.2M24 17l-4-3M24 17l4-3M24 31l-4 3M24 31l4 3" vector-effect="non-scaling-stroke"/></g>`).join('') + `</g>` + Cc(24, 24, 2.4, '#DDF0FB');
Q.check = Cc(24, 24, 15, M.ok) + T('M16.4 24.6l5.2 5.2 10.4-11', '#FFFFFF', 3);
Q.flame = SH(24, 43.4, 10, 1.4) + flame(24, 5.6, 2.6);
Q.flameOff = `<g opacity=".4">${flame(24, 5.6, 2.6, ['#B5BCC2', '#DDE2E6'])}</g>` + T('M10 38L38 10', M.bad, 2.6);
Q.help = unsureArt;
const thumb = col => Pp('M13 21h-5a1 1 0 0 0-1 1v17a1 1 0 0 0 1 1h5z', col) +
  Pp('M13 21l6.6-11.4c2.6 0 4.2 1.8 3.8 4.2L22.4 20h10a3.2 3.2 0 0 1 3.1 4l-2.8 12.4A3.2 3.2 0 0 1 29.6 39H13z', M.skin) + T('M23 26.2h11.4M23 31.2h10.4M23.6 36h7.6', M.skinD, .9);
Q.up = thumb(M.ok); Q.down = G('rotate(180 24 24)', thumb(M.bad));
/* air movement: a candle flame, steady, flickering or blown */
const candle = (rot, wisps) => SH(24, 43, 11, 1.4) + E(24, 40.4, 10, 2.6, '#C9A04A') + R(19.6, 22, 8.8, 18, '#F7F0DC', 1.4) + Pp('M19.6 24.6c1.6 1 2.4 3 2.4 5', '#FBF7EC', '') +
  T('M24 22v-2.6', INK, 1) + G(`rotate(${rot} 24 20.4)`, flame(24, 4.4, 1.15)) + (wisps || '');
Q.still = candle(0);
Q.slight = candle(16, T('M3.6 12c2.4-1.6 4.8-1.6 7.2 0', M.cold, 1.8));
Q.draught = candle(55, T('M2.6 8.4c2.6-1.6 5-1.6 7.6 0M1.6 15c3-1.6 6-1.6 9 0M3.6 21.6c2.2-1.4 4.4-1.4 6.6 0', M.cold, 1.8));
/* the sun */
const rays = (cx, cy, r0, r1, n=8) => Array.from({length: n}, (_, i) => G(`rotate(${i * 360 / n} ${cx} ${cy})`, Pp(`M${cx - 1.8} ${cy - r0}L${cx} ${cy - r1}L${cx + 1.8} ${cy - r0}z`, '#F5A623'))).join('');
Q.sun = rays(24, 24, 11, 19) + Cc(24, 24, 9.4, '#F7C23B') + Cc(21.4, 21.4, 3, '#FBE28A', '');
Q.cloud = G('translate(4 -4) scale(.8)', rays(30, 18, 9, 15) + Cc(30, 18, 7.6, '#F7C23B')) + Pp('M11 37a7 7 0 0 1-.6-14A10 10 0 0 1 29.6 20a7.6 7.6 0 0 1 8.4 7.6A5 5 0 0 1 37 37z', M.paper) + T('M14 33.4c4 1.2 12 1.2 20 0', '#C9D6E2', 1.2);
Q.moon = Cc(24, 24, 18, M.night) + Pp('M30 31A11 11 0 0 1 20.6 13a11 11 0 1 0 13.6 15 11 11 0 0 1-4.2 3z', '#F4E3A2') + Cc(15, 12, 1, '#FFFFFF', '') + Cc(35, 14, .9, '#FFFFFF', '') + Cc(13, 31, .8, '#FFFFFF', '') + Cc(33, 34, .9, '#FFFFFF', '');
/* the outside wall: an open right hand, seen from the back (nails and knuckles towards us), fingers together and the
 * thumb a little out, pressed flat on the bricks; the wall around it shows frost, a cool tint, nothing, or warmth.
 * Proportions of a real hand: palm about 16 wide and 16 long, the middle finger about 15. */
const HAND = 'M18.4 47.6L18.6 40C17.4 38.6 16.4 37.6 15.6 36.4C13.6 33.8 11.2 30.2 9.8 27.2C9 25.4 10.6 24 12 24.8C13.6 25.8 15 28.6 16.2 30.4' +
  'C16 27.6 15.8 25 16 22.4L16.2 11.4C16.2 9.6 17.2 8.6 18.2 8.6C19.2 8.6 20.2 9.4 20.2 10.8L20.3 8.8C20.3 7.2 21.2 6.4 22.2 6.4C23.2 6.4 24.2 7.2 24.2 8.8' +
  'L24.2 9.4C24.4 8.2 25.2 7.8 26.1 7.8C27.1 7.8 28 8.6 28 10L28 13.6C28.2 12.6 29 12.2 29.8 12.2C30.8 12.2 31.6 13 31.6 14.4' +
  'L31.8 24.6C32.4 28 32.4 33 31.6 36.6C31 38.6 30.4 39.6 30.4 41L30.6 47.6Z';
const handArt = G('translate(1.3 1.1)', Pp(HAND, INK, '').replace('/>', ' opacity=".2"/>')) + Pp(HAND, M.skin) +
  Pp('M31.4 15.2L31.6 24.6C32.2 28 32.2 33 31.4 36.6C30.8 38.6 30.2 39.6 30.2 41L30.4 47.4H28C28.2 41 29.6 37 29.8 31C30 27 29.6 20 29.2 14.2z', M.skinD, '').replace('/>', ' opacity=".45"/>') +
  T('M20.2 11v11.6M24.2 9.4v13.4M28 13.6v11', M.skinD, .8) +
  T('M16.8 16.6c.9.5 2 .5 2.8 0M20.9 15c.9.5 2 .5 2.8 0M24.8 15.8c.9.5 2 .5 2.7 0M28.6 19.6c.8.4 1.7.4 2.4 0', M.skinD, .7) +
  T('M16.8 24c.9-.8 2.2-.8 3 0M20.8 23.6c1-.8 2.2-.8 3 0M24.8 24c1-.8 2.2-.8 3 0M28.6 25.2c.9-.7 1.9-.7 2.6 0M19.8 30l1.6 9M26.2 30.4l-.8 9', M.skinD, .7) +
  [[16.9, 9.6, 2.6], [20.9, 7.4, 2.6], [24.8, 8.8, 2.5], [28.7, 13.2, 2.2]].map(([x, y, w]) => R(x, y, w, 3, M.nail, 1.1, ` stroke="${M.skinD}" stroke-width=".6" vector-effect="non-scaling-stroke"`)).join('') +
  `<ellipse cx="11.4" cy="26.4" rx="1.1" ry="1.6" fill="${M.nail}" stroke="${M.skinD}" stroke-width=".6" vector-effect="non-scaling-stroke" transform="rotate(-32 11.4 26.4)"/>` +
  Pp('M16.6 41.8C21 40.6 28.2 40.6 32.4 41.8L33 48H16Z', '#6F8FAF') + T('M19.2 42.2v5.6M21.9 41.6v6.2M24.6 41.4v6.4M27.3 41.6v6.2M30 42v5.8', '#56708C', .7);
const brickPanel = R(3, 3, 42, 42, M.brick, 5) + courses(3, 3, 42, 42, 6.8, 10, M.mortar, .9);
const snowflake = (x, y, s=1) => T(`M${x} ${n1(y - 5.5 * s)}v${n1(11 * s)}M${n1(x - 5.5 * s)} ${y}h${n1(11 * s)}M${n1(x - 3.9 * s)} ${n1(y - 3.9 * s)}l${n1(7.8 * s)} ${n1(7.8 * s)}M${n1(x + 3.9 * s)} ${n1(y - 3.9 * s)}l${n1(-7.8 * s)} ${n1(7.8 * s)}`, M.cold, 2);
Q.wallCold = brickPanel + Pp('M3 22C7 21 8 15 12 16S18 10 22 9 30 6 34 3H8A5 5 0 0 0 3 8z', M.frost, '') + Pp('M45 30c-5 0-6 5-11 6s-6 6-6 9h12a5 5 0 0 0 5-5z', M.frost, '') +
  Pp('M45 6c-3 0-4 3-7 3.4s-3 4-3 6.6h10z', M.frost, '') + snowflake(9.4, 10, .9) + snowflake(39.4, 40, .7) + handArt;
Q.wallCool = brickPanel + Pp('M3 14C6 13 8 10 11 10.6S16 7 18 3H8A5 5 0 0 0 3 8z', M.frost, '') + T('M6 7.4h6.4M6 11h3.6', M.cold, 1.8) + T('M36 40h6.4M38.6 36.4h3.6', M.cold, 1.8) + handArt;
Q.wallNeutral = brickPanel + handArt;
Q.wallWarm = brickPanel + R(3, 3, 42, 42, '#FFB15C', 5, '').replace('/>', ' opacity=".3"/>') + T('M7 15c-1.6-2 1.6-3 0-5s1.6-3 0-5M12 15c-1.6-2 1.6-3 0-5s1.6-3 0-5M37 43c-1.6-2 1.6-3 0-5s1.6-3 0-5M42 43c-1.6-2 1.6-3 0-5s1.6-3 0-5', M.flameD, 1.8) + handArt;
Q.wallFar = R(29, 3, 16, 42, M.brick, 4) + courses(29, 3, 16, 42, 6.8, 8, M.mortar, .9) + G('translate(-5 8.4) scale(.74)', handArt) +
  T('M20.6 22h5.4', M.metalD, 1.4).replace('/>', ' stroke-dasharray="1.4 1.8"/>') + Cc(23.6, 12, 4.4, M.paper) + T('M21.6 10l4 4M25.6 10l-4 4', M.bad, 1.8);
/* what you did */
Q.window = SH(24, 44, 14) + R(8, 4, 32, 38, M.white, 1.2) + R(11, 7, 26, 32, M.glass, 0, '') + T('M14 36l9-26M19 37l8-23', '#FFFFFF', 1.4, .8) + R(11, 7, 26, 32, 'none', 0) + R(23, 4, 2, 38, M.white, 0) + R(8, 22, 32, 2, M.white, 0) + R(31.6, 25.6, 1.6, 5.4, M.metal, .6, '');
Q.windowOpen = SH(24, 44, 15) + R(8, 4, 32, 38, M.white, 1.2) + R(11, 7, 26, 32, M.sky, 0, '') + T('M30 15c-2.6 0-2.6 2-5.2 2s-2.6-2-5.2-2M33 25c-2.6 0-2.6 2-5.2 2s-2.6-2-5.2-2', M.cold, 1.6) + R(11, 7, 26, 32, 'none', 0) +
  Pp('M11 7l11 4.6v34L11 39z', M.glass) + T('M13 33l5.6-17', '#FFFFFF', 1.2, .8);
Q.doorOpen = SH(24, 44, 14) + R(10, 4, 28, 39, M.white, .6) + R(12.4, 6.4, 23.2, 36.6, M.room, 0, '') + Pp('M12.4 6.4l12 3.2v37l-12-3.6z', M.oak) + Cc(21.6, 26, .8, '#F2C230', '');
Q.radiator = SH(24, 42, 20) + radiator(5, 14, 38, 22) + R(8, 36, 2.2, 4.4, M.metalD) + R(37.8, 36, 2.2, 4.4, M.metalD);
Q.heatUp = SH(20, 43, 17) + radiator(3, 20, 30, 19) + R(6, 39, 2, 3, M.metalD) + R(28, 39, 2, 3, M.metalD) + Pp('M40.6 30V14h4.6l-6.8-8.6-6.8 8.6h4.6v16z', M.flameD);
Q.heatDown = SH(20, 43, 17) + radiator(3, 20, 30, 19) + R(6, 39, 2, 3, M.metalD) + R(28, 39, 2, 3, M.metalD) + Pp('M36.2 5.4v16h-4.6l6.8 8.6 6.8-8.6h-4.6v-16z', M.cold);
const JUMP = 'M8 4l4 1.5L16 4l4 3-1 8h-1v5H6v-5H5L4 7z';
const jumper = G('translate(0 2) scale(2)', Pp(JUMP, '#C98A5B')) + T('M12 42h24M10 28h4M34 28h4', '#A86E44', .9) + T('M20 13c2 2 6 2 8 0', '#A86E44', 1) + T('M17 20v16M24 20v16M31 20v16', '#B57A4E', .6, .7);
Q.layerOn = jumper + Cc(37.6, 37.6, 7.4, M.ok) + T('M37.6 33.6v8M33.6 37.6h8', '#FFFFFF', 2);
Q.layerOff = jumper + Cc(37.6, 37.6, 7.4, M.metalD) + T('M33.6 37.6h8', '#FFFFFF', 2);
Q.blanket = SH(24, 42.6, 19) + R(5, 26, 38, 13, '#C94F3D', 3) + R(6, 15, 36, 12, '#D9603D', 3) + R(7, 8, 34, 8, '#E2744A', 3) +
  T('M11 8v31M37 8v31M5 32h38M6 21h36M7 12h34', '#F4E3C2', 1, .75) + T('M15 8v31M33 8v31', '#7E2E22', .8, .6);
Q.fan = SH(24, 44.6, 10) + R(21.6, 30, 4.8, 10, M.metalD, 1) + E(24, 42, 9, 2.4, M.metalD) + Cc(24, 18, 14, '#EEF2F5') +
  [0, 120, 240].map(a => G(`rotate(${a} 24 18)`, Pp('M24 18c-1-6 1-10.4 5-11.4 1.6 4-1 8.6-5 11.4z', '#7FA8D6'))).join('') + Cc(24, 18, 2.4, M.metalD) +
  Cc(24, 18, 14, 'none') + T('M24 4v28M10 18h28M14 8l20 20M34 8L14 28', M.metal, .5, .7);
Q.curtain = SH(24, 44, 18) + R(8, 6, 32, 34, M.glass, 0) + R(4, 4, 40, 2.6, M.woodD, 1.2) + Pp('M6 6.6h17c-1.4 8-1.2 24 .6 35.4H6z', '#5E8C8A') + Pp('M42 6.6H25c1.4 8 1.2 24-.6 35.4H42z', '#5E8C8A') +
  T('M10 7v35M14 7v35M19 7v35M38 7v35M34 7v35M29 7v35', '#4A7472', .8);
/* what you had or felt */
Q.mug = SH(22, 43, 14) + Pp('M8 17h26v17a7 7 0 0 1-7 7H15a7 7 0 0 1-7-7z', '#D84A3A') + Pp('M34 21h3a5 5 0 0 1 0 10h-3', 'none', ` stroke="${INK}" stroke-width="1" vector-effect="non-scaling-stroke"`) +
  T('M34 21h3a5 5 0 0 1 0 10h-3', '#D84A3A', 3) + E(21, 17, 13, 2.4, '#7A4A2A') + T('M13 12c-1.4-1.6 1.4-2.4 0-4M20 10.6c-1.4-1.6 1.4-2.4 0-4M27 12c-1.4-1.6 1.4-2.4 0-4', '#A9B1B8', 1.4) + T('M12 22v12', '#FFFFFF', 1.4, .4);
Q.glass = SH(24, 44, 11) + Pp('M11 6h26l-3 36a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2z', '#EEF7FC') + Pp('M12.2 18h23.6l-2.2 24.6a1.6 1.6 0 0 1-1.6 1.4H16a1.6 1.6 0 0 1-1.6-1.4z', '#A8D8F2', '') +
  G('rotate(12 20 24)', R(17, 21, 7, 7, '#F4FBFF', 1)) + G('rotate(-10 28 30)', R(25, 27, 6.4, 6.4, '#F4FBFF', 1)) + Pp('M11 6h26l-3 36a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2z', 'none') + T('M15 9l1.6 30', '#FFFFFF', 1.4, .8);
Q.fork = SH(24, 42.6, 21) + E(24, 26, 15, 13, M.paper) + E(24, 26, 10.6, 9, '#F3F1EC') + Cc(20.6, 24, 2.6, '#7BB662') + Cc(24, 22.4, 2.4, '#7BB662') + Cc(22.4, 27.4, 2.4, '#7BB662') +
  G('rotate(-30 28 27)', R(25, 25.4, 9, 3.4, '#E8862E', 1.6)) + R(4, 12, 1.8, 28, M.steelD, .9) + T('M3 12v6M4.9 12v6M6.8 12v6M3 18h3.8', M.metal, .8) + Pp('M43 12c-2 0-3 3-3 6.4a2.4 2.4 0 0 0 2 2.4V40h1.8V12z', M.steelD);
Q.apple = SH(24, 44, 12) + Pp('M24 14c-2.4-1.8-5.6-2-7.8-.4C12.8 16 13 21.4 14.6 25.6c1.4 3.8 4 6.8 6.6 6.8 1.2 0 2-.6 2.8-.6s1.6.6 2.8.6c2.6 0 5.2-3 6.6-6.8 1.6-4.2 1.8-9.6-1.6-12C29.6 12 26.4 12.2 24 14z', '#D84A3A') +
  E(19, 18.6, 1.8, 3, '#F07C6C', '', -20) + T('M24 14c0-3 1.2-5.4 3.6-6.6', M.woodD, 1.4) + Pp('M25 10c2.4-.4 4.2-2 4.6-4.4-2.4.2-4.2 1.6-4.6 4.4z', M.leaf);
Q.zzz = Pp('M33 28A10 10 0 0 1 24.4 12a10 10 0 1 0 12.6 13 10 10 0 0 1-4 3z', '#F4E3A2') + T('M7 13h6l-6 7h6', M.cold, 2.2) + T('M14 4h4.4L14 9h4.4', M.cold, 1.8) + T('M8 30h7l-7 8h7', M.coldD, 2.6);
Q.unwell = Cc(22, 24, 15, '#D8E8B4') + T('M15 22c1-1 2.4-1 3.4 0M25.6 22c1-1 2.4-1 3.4 0', INK, 1.4) + T('M17 31.4c2.6-1.6 6.4-1.6 9 0', INK, 1.4) + E(14, 27, 2.6, 1.6, '#F2A3A3', '') + E(30, 27, 2.6, 1.6, '#F2A3A3', '') +
  G('rotate(-35 34 32)', R(28, 30.6, 16, 3.4, M.paper, 1.7) + R(28, 30.6, 5, 3.4, '#D84A3A', 1.7));
Q.thermo = SH(24, 44.4, 7, 1.2) + Pp('M20 8a4 4 0 0 1 8 0v20.4a8 8 0 1 1-8 0z', M.paper) + R(22.6, 12, 2.8, 20, '#D84A3A', 1.4, '') + Cc(24, 35, 5.4, '#D84A3A') + T('M28 12h2.4M28 16h1.6M28 20h2.4M28 24h1.6', INK, .8);
Q.leaf = Pp('M10 38C10 22 20 10 38 8c0 18-10 30-26 30z', '#7BB662') + T('M10 38L32 14M18 30l-1-8M24 24l-1-8M18 30l8 0M24 24l7-1', '#4E8A3A', 1);
/* people (the household) */
Q.user = Pp('M8 44c0-9 7-14.6 16-14.6S40 35 40 44z', TOP) + head(24, 18, 8.4, M.hair) + T('M18 38v6M30 38v6', TOPD, .8);
Q.child = Pp('M9 44c0-8.6 6.6-13 15-13s15 4.4 15 13z', '#E8A33A') + head(24, 20.4, 8, M.hair2);
Q.paw = SH(24, 44, 12) + E(13, 21, 3.6, 4.6, '#8E6248', OL, -18) + E(20, 13.6, 3.6, 4.6, '#8E6248', OL, -6) + E(28, 13.6, 3.6, 4.6, '#8E6248', OL, 6) + E(35, 21, 3.6, 4.6, '#8E6248', OL, 18) +
  Pp('M24 24c-6 0-11 6.4-11 11 0 3 2.4 5 5.4 5 2 0 3.6-1 5.6-1s3.6 1 5.6 1c3 0 5.4-2 5.4-5 0-4.6-5-11-11-11z', '#8E6248');
/* clothes: the garments in the avatar's own colours */
const GARM = (path, col, extra='', tr='translate(0 1) scale(2)') => G(tr, Pp(path, col)) + extra;
Q.tshirt = GARM('M8 4l4 1.5L16 4l4 3-2 3-2-1v11H8V9l-2 1-2-3z', '#7CB9E8', T('M20.4 11.2c2 2.2 5.2 2.2 7.2 0M16 39h16', '#5E9BCB', .9));
Q.long = GARM('M8 4l4 1.5L16 4l4 3-1 8h-1v5H6v-5H5L4 7z', '#9DC3B5', T('M10 28h3M35 28h3M20 12.6c2 2 6 2 8 0', '#7FA697', 1));
Q.jumper = GARM(JUMP, '#C98A5B', T('M12 33h24M10 28h4M34 28h4M20 12.6c2 2 6 2 8 0', '#A86E44', 1) + T('M17 20v12M24 20v12M31 20v12', '#B57A4E', .7, .8));
Q.hoodie = GARM('M8 5l4 1.5L16 5l4 3-1 8h-1v4H6v-4H5L4 8z', '#6B7A8F', Pp('M18 12a6 6 0 0 1 12 0v3H18z', '#5A6779') + R(18, 28, 12, 6, '#5A6779', 1.4) + T('M22 14v6M26 14v6', '#E8ECEF', 1));
Q.shorts = GARM('M6 4h12l1 9h-6l-1-4-1 4H5z', '#8FA3B8', T('M12 13h24M24 13v6', '#748AA1', 1));
Q.trousers = GARM('M7 3h10l1 18h-5l-1-9-1 9H6z', '#4F6B8F', T('M14 11h20M24 7v14M17 12c1 2 3 3 5 3M31 12c-1 2-3 3-5 3', '#E3B23C', .7, .8));
Q.joggers = GARM('M7 3h10l1 18h-5l-1-9-1 9H6z', '#7A8797', T('M16 13h16M12 39h10M26 39h10M24 13v4', '#5F6B79', 1) + T('M14 15v22M34 15v22', '#E8ECEF', .8, .7));
Q.skirt = GARM('M8 4h8l3 14H5z', '#B07AA1', T('M16 15h16M20 15l-3 22M28 15l3 22M24 15v22', '#8E5E81', .8));
Q.pyjamas = GARM('M7 2.5l3 1 2 1.5 2-1.5 3-1 3 2.5-1.5 5H17v3H7V10H5.5L4 5z', '#9DB0DE', G('translate(0 1) scale(2)', Pp('M7 13h10l.6 8.5h-4.2L12 16l-1.4 5.5H6.4z', '#9DB0DE')) +
  T('M24 12v12M18 8l6 4 6-4M14 28.6h20', '#FFFFFF', 1) + T('M16 14v10M32 14v10M17 30v13M31 30v13', '#7F94C8', .8));
Q.coatL = GARM('M8 3l4 2 4-2 4 3-1 9h-1v6h-4.5L12 9l-1.5 12H6v-6H5L4 6z', '#CDB683', T('M24 11v8M19 7.6l5 6 5-6M15 28h5M28 28h5', '#A8935F', 1));
Q.coatW = GARM('M7.5 3.5L12 6l4.5-2.5L20 6l-1 9h-1v7H6v-7H5L4 6z', '#41607F', Pp('M16 6a8 6 0 0 1 16 0', 'none') + T('M17 7.6a7.4 5 0 0 1 14 0', '#EFE6D4', 3.4) +
  T('M24 13v31M13 21h22M12.4 29h23.2M12 37h24', '#2F4A66', .9));
Q.socks = SH(24, 44, 16) + G('translate(-4 2) scale(1.6)', Pp('M9 3h6v9l3 3a3 3 0 0 1-4 4l-5-4z', '#E8D9A6') + T('M9 6h6M9 8h6', '#C9B37A', .8)) + G('translate(10 2) scale(1.6)', Pp('M9 3h6v9l3 3a3 3 0 0 1-4 4l-5-4z', '#E8D9A6') + T('M9 6h6M9 8h6', '#C9B37A', .8));
Q.slippers = SH(24, 43, 18) + G('rotate(-8 15 25)', E(15, 25, 7.4, 15, '#A67C52') + E(15, 17, 6.6, 6.6, '#F1E6D0') + T('M10 15c1-.8 2-.8 3 0M14 13c1-.8 2-.8 3 0M17 16c1-.8 2-.8 3 0', '#D9CBB0', .9)) +
  G('rotate(8 33 25)', E(33, 25, 7.4, 15, '#A67C52') + E(33, 17, 6.6, 6.6, '#F1E6D0') + T('M28 15c1-.8 2-.8 3 0M32 13c1-.8 2-.8 3 0M35 16c1-.8 2-.8 3 0', '#D9CBB0', .9));
Q.duvet = Q.bed;


/* ---- MouldCast: each room seen from the doorway without mould (mc:*), a close-up of a wall corner by how much mould
 * covers it (cover:*: the photo check's answers, the coverage classes of the VTT index), and the problems a resident
 * can report (prob:*) ---- */
const livingSet = Pp('M14.5 23h19v6h-19z', M.sofa) + R(12.5, 28, 23, 5, M.sofa, 1.5) + R(10.5, 25, 4, 9, M.sofaD, 1.6) + R(33.5, 25, 4, 9, M.sofaD, 1.6) + R(18, 24.4, 5, 3.6, '#E8A33A', 1) +
  T('M13 34v2.5M35 34v2.5', M.iron, 1.2);
const kitchenSet = R(11, 25, 26, 9, M.white) + R(11, 24, 26, 1.4, M.stone) + T('M19.6 25v9M28.3 25v9', M.whiteDD, .9) + Cc(17.4, 29.5, .5, INK, '') + Cc(21.8, 29.5, .5, INK, '') + Cc(30.5, 29.5, .5, INK, '') +
  Pp('M13 24v-3.2h4V24', M.steelD) + R(29.5, 23, 6, 1, M.iron, 0);
const bathSet = Pp('M11 25.5h25v3.5a5 5 0 0 1-5 5H16a5 5 0 0 1-5-5z', M.white) + T('M13 27.2h21', M.ice, 1.4) + T('M14 34l-.8 2M33 34l.8 2', M.metalD, 1.2) +
  T('M34 25.5V13.5h-3', M.metal, 1.2) + R(28.5, 13, 3, 1.8, M.metal, .4);
const bathTiles = R(10, 8, 28, 24, '#E8F1F4', 0, '') + T('M10 14h28M10 20h28M10 26h28M15 8v24M21 8v24M27 8v24M33 8v24', '#C9D6DC', .8);
A['mc:bed'] = roomBox(bedSide, backWin(26, 12, 8.4, 8.4));
A['mc:living'] = roomBox(livingSet, backWin(15.4, 11, 10.4, 8.4));
A['mc:kitchen'] = roomBox(kitchenSet, backWin(18, 11, 12, 8.4));
A['mc:bath'] = roomBox(bathSet, bathTiles);
const wallCorner = Pp('M3 3h21v36H3z', '#F3EDE2') + Pp('M24 3h21v36H24z', '#E6DCCB') + T('M24 3v36', '#CDBFA8', 1) + R(3, 39, 42, 5, M.white) + T('M3 41h42', '#D6CDBE', .7) + R(3, 3, 42, 41, 'none');
A['cover:none'] = wallCorner + tickBadge(37.5, 11);
A['cover:spots'] = wallCorner + mould(24, 8.5, 2.6, 2.4, 9) + mould(22, 30, 1.8, 2.2, 5);
A['cover:patch'] = wallCorner + mould(24, 11, 8, 7, 46) + mould(21, 31, 5, 5, 20);
A['cover:large'] = wallCorner + mould(15, 17, 10, 12.5, 90) + mould(33, 18, 10, 13, 90) + mould(24, 34, 12, 4, 30);
A['prob:mould'] = A['cover:patch'];
A['prob:damp'] = wallCorner + E(16, 26, 10, 9, '#D9C6A0', '') + E(16, 26, 7.5, 6.6, '#CBB389', '') + T('M7 21c3-4 14-4 18 0', '#B39A6E', .9) + E(15, 27, 4, 3.4, '#BEA57A', '');
A['prob:leak'] = R(3, 3, 42, 9, '#F3EDE2') + E(26, 12, 7, 2, '#C9B48F', '') + Pp('M26 14c-1.4 2.2-2 3.4-2 4.3a2 2 0 0 0 4 0c0-.9-.6-2.1-2-4.3z', M.cold) +
  Pp('M26 24c-1.1 1.7-1.6 2.7-1.6 3.4a1.6 1.6 0 0 0 3.2 0c0-.7-.5-1.7-1.6-3.4z', M.cold) + E(26, 41, 12, 2.6, M.ice, '') + E(26, 41, 7, 1.4, '#C4E3F6', '');
A['prob:condensation'] = R(8, 5, 32, 34, M.white, 1) + R(11, 8, 26, 28, M.sky, 0, '') + T('M24 8v28', M.white, 1.6) +
  [[14, 12], [18, 17], [15, 23], [20, 27], [28, 11], [32, 16], [29, 22], [33, 28], [16, 31]].map(([x, y]) => Cc(x, y, 1.1, '#FFFFFF', OL)).join('') + T('M18 18.2v4M33 29.2v4', '#FFFFFF', .9) +
  R(6, 39, 36, 3, M.white, .6) + E(24, 39.6, 9, 1, M.ice, '');
A['prob:smell'] = wallCorner + T('M14 33c-3-3 3-5 0-8s3-5 0-8', '#7E8F5C', 1.6) + T('M24 33c-3-3 3-5 0-8s3-5 0-8', '#7E8F5C', 1.6) + T('M34 33c-3-3 3-5 0-8s3-5 0-8', '#7E8F5C', 1.6);
A['prob:other'] = unsureArt;

return { ART: A, PIC: Q, M, INK };
})();
const ART = STYLEC.ART, PIC = STYLEC.PIC;
/* a join-wizard picture; class "art art-<family>" (art-wall, art-heat ...) lets art.css size each family to its tiles */
function art(name, cls=''){
  const fam = ART[name] ? String(name).split(':')[0] : 'unsure';
  return `<svg class="art art-${fam} ${cls}" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${ART[name] || ART.unsure}</svg>`;
}
/* an answer's picture (the check-in's options, the clothes, the household); its plain line icon when it has none.
 * Class "ic" so the tiles, rows and boxes size it like the icon it replaces. */
function pic(name, cls=''){
  return PIC[name] ? `<svg class="ic pic ${cls}" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${PIC[name]}</svg>` : ic(name, cls);
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
  const O = 'stroke="#3B342E" stroke-opacity=".62" stroke-width="1.3" stroke-linejoin="round"';
  const tex = (d, c, w=1.4, o=.5) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-opacity="${o}" stroke-linecap="round"/>`;
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
  if(has('trousers')) s += legsLong('var(--g-trousers)') + tex('M44 108h32M60 106v20M46 114c3 3 7 4 11 4M74 114c-3 3-7 4-11 4', '#E3B23C', 1.1, .7) + tex('M50 130v54M70 130v54', '#2F4766', 1.2, .5);
  if(has('joggers'))  s += legsLong('var(--g-joggers)') + `<path d="M42 180h17M61 180h17" stroke="rgba(20,30,45,.25)" stroke-width="2"/>`;
  if(has('skirt'))    s += `<path d="M40 104h40l8 56H32z" fill="var(--g-skirt)" ${O}/>` + tex('M40 110h40M50 110l-6 50M60 110v50M70 110l6 50', '#6E3F62', 1.2, .45);
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
  if(has('tshirt')) s += top('var(--g-tshirt)', 26) + tex('M37 100q23 7 46 0', '#3E6E99', 1.2, .4);
  if(has('long'))   s += top('var(--g-long)', 64);
  if(has('jumper')) s += top('var(--g-jumper)', 66) + `<path d="M36 102h48" stroke="rgba(20,30,45,.25)" stroke-width="3"/>` + tex('M46 56v44M53 54v48M60 54v48M67 54v48M74 56v44', '#8A5530', 1, .35);
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

/* ---------- MouldCast: line icons ---------- */
Object.assign(P, {
  brand:'<path d="M3.5 11L12 4l8.5 7"/><path d="M5.5 9.6V19a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.6"/><path class="glow" d="M12 10.6s2.9 3.1 2.9 5.1a2.9 2.9 0 0 1-5.8 0c0-2 2.9-5.1 2.9-5.1z"/>',   /* the app icon: a house with a drop of damp in it */
  camera:'<path d="M4 8h3l1.6-2.5h6.8L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.6"/>',
  chat:'<path d="M4 4.5h16a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1h-8.5L7 20.5V17H4a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1z"/><path d="M7.5 9h9M7.5 12.5h6"/>',
  send:'<path d="M4 11.5L20 4l-6.5 16-2.6-6.4z"/><path d="M10.9 13.6L20 4"/>',
  sensor:'<rect x="8" y="8" width="8" height="8" rx="2"/><path d="M5.2 8.5a7 7 0 0 0 0 7M18.8 8.5a7 7 0 0 1 0 7M2.6 6.5a11 11 0 0 0 0 11M21.4 6.5a11 11 0 0 1 0 11"/>',
  layers:'<path d="M12 3.5l9 4.8-9 4.8-9-4.8z"/><path d="M3 12.4l9 4.8 9-4.8M3 16.4l9 4.8 9-4.8"/>',
  spark:'<path d="M11 3l1.9 5.4L18.3 10l-5.4 1.9L11 17.3l-1.9-5.4L3.7 10l5.4-1.6z"/><path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  trendUp:'<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  trendDown:'<path d="M3 7l6 6 4-4 8 8"/><path d="M15 17h6v-6"/>',
  trendFlat:'<path d="M3 12h17"/><path d="M15.5 7.5L20 12l-4.5 4.5"/>',
  wrench:'<path d="M14.7 6.3a4 4 0 0 1 5.1-1.6l-2.7 2.7.5 2 2 .5 2.7-2.7a4 4 0 0 1-5.4 5.1l-8.4 8.4a2 2 0 0 1-2.8-2.8l8.4-8.4a4 4 0 0 1 .6-3.2z"/>'
});
