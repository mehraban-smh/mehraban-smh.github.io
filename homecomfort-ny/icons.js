/* Home Comfort NY (SUNY ESF) - icons, illustrations and the thermal sensation scale ("Aurora" design).
 * Plain script: <script src="../icons.js"></script> defines window.HCI. Shared by the study page, the check-in
 * app and the dashboard; it loads nothing and stores nothing.
 *
 *   HCI.icon(name, cls, label)  UI line icon, 24 grid, 1.75 stroke, round caps and joins, currentColor.
 *                               Decorative (aria-hidden) unless a label is given (then role="img").
 *   HCI.art(name, cls, label)   Picture-tile illustration, 48 grid, 2.5 stroke, currentColor, plus ONE soft
 *                               filled shape painted with fill:var(--duo,currentColor) at var(--duo-o,.16),
 *                               so a selected tile can recolour it (brand.css does this for .ptile).
 *                               Names are "group:value" with the exact values of the home profile
 *                               (README "The home profile"), e.g. HCI.art('heating:' + home.heating[0]).
 *   HCI.sense                   The seven thermal sensation steps, cold (-3) to hot (+3).
 *   HCI.senseOf(v), HCI.signed(v), HCI.ring(opts), HCI.tick(), HCI.fillRange(input)  small helpers.
 *   HCI.iconNames, HCI.artNames lists of every name (used by the brand demo page).
 */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- UI icons (24 x 24) */
  const DOT = 'style="fill:currentColor;stroke:none"';
  const I = {
    /* navigation and actions */
    'home': '<path d="M4 10.6 12 4l8 6.6V19a1 1 0 0 1-1 1h-4.6v-5.4H9.6V20H5a1 1 0 0 1-1-1z"/>',
    'signin': '<path d="M14 4h3.5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5H14"/><path d="M3.5 12H14M10 8l4 4-4 4"/>',
    'signout': '<path d="M10 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20H10"/><path d="M20 12H9.5M16 8l4 4-4 4"/>',
    'bell': '<path d="M6 16.5v-5.3a6 6 0 0 1 12 0v5.3l1.5 1.8h-15z"/><path d="M10 20.6a2.3 2.3 0 0 0 4 0"/>',
    'bell-off': '<path d="M8.2 6.7A6 6 0 0 1 18 11.2v4.3M6 11.2v5.3l-1.5 1.8h12"/><path d="M10 20.6a2.3 2.3 0 0 0 4 0"/><path d="M4 4l16 16"/>',
    'clock': '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    'chart': '<path d="M4 4v16h16"/><path d="M8 16v-3M12 16V8.5M16 16v-5"/>',
    'gear': '<path d="M9.95 5.31 10.24 2.97A9.2 9.2 0 0 1 13.76 2.97L14.05 5.31A7 7 0 0 1 15.29 5.82L17.14 4.37A9.2 9.2 0 0 1 19.63 6.86L18.18 8.71A7 7 0 0 1 18.69 9.95L21.03 10.24A9.2 9.2 0 0 1 21.03 13.76L18.69 14.05A7 7 0 0 1 18.18 15.29L19.63 17.14A9.2 9.2 0 0 1 17.14 19.63L15.29 18.18A7 7 0 0 1 14.05 18.69L13.76 21.03A9.2 9.2 0 0 1 10.24 21.03L9.95 18.69A7 7 0 0 1 8.71 18.18L6.86 19.63A9.2 9.2 0 0 1 4.37 17.14L5.82 15.29A7 7 0 0 1 5.31 14.05L2.97 13.76A9.2 9.2 0 0 1 2.97 10.24L5.31 9.95A7 7 0 0 1 5.82 8.71L4.37 6.86A9.2 9.2 0 0 1 6.86 4.37L8.71 5.82A7 7 0 0 1 9.95 5.31Z"/><circle cx="12" cy="12" r="3"/>',
    'sliders': '<path d="M4 7.5h9M17 7.5h3M4 16.5h3M11 16.5h9"/><circle cx="15" cy="7.5" r="2"/><circle cx="9" cy="16.5" r="2"/>',
    'user': '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c.8-3.6 3.6-5.6 7-5.6s6.2 2 7 5.6"/>',
    'users': '<circle cx="9" cy="8.6" r="3.2"/><path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="16.8" cy="9.6" r="2.5"/><path d="M16.6 14.7c2.2.1 3.6 1.6 4 4.3"/>',
    'mail': '<rect x="3.5" y="5.5" width="17" height="13" rx="3"/><path d="m4.5 7.2 7.5 5.8 7.5-5.8"/>',
    'phone': '<rect x="6.5" y="2.8" width="11" height="18.4" rx="2.8"/><path d="M10.5 18h3"/>',
    'check': '<path d="m5 12.6 4.3 4.2L19 7.2"/>',
    'check-circle': '<circle cx="12" cy="12" r="8.5"/><path d="m8.2 12.3 2.6 2.5 5-5.2"/>',
    'x': '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    'x-circle': '<circle cx="12" cy="12" r="8.5"/><path d="m9.3 9.3 5.4 5.4M14.7 9.3l-5.4 5.4"/>',
    'chevron-left': '<path d="m14.5 5.5-6.5 6.5 6.5 6.5"/>',
    'chevron-right': '<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>',
    'chevron-up': '<path d="m5.5 14.5 6.5-6.5 6.5 6.5"/>',
    'chevron-down': '<path d="m5.5 9.5 6.5 6.5 6.5-6.5"/>',
    'arrow-right': '<path d="M5 12h13.5M13 6.5l5.5 5.5-5.5 5.5"/>',
    'arrow-left': '<path d="M19 12H5.5M11 6.5 5.5 12l5.5 5.5"/>',
    'arrow-up': '<path d="M12 19V5.5M6.5 11 12 5.5l5.5 5.5"/>',
    'arrow-down': '<path d="M12 5v13.5M6.5 13l5.5 5.5 5.5-5.5"/>',
    'plus': '<path d="M12 5.5v13M5.5 12h13"/>',
    'minus': '<path d="M5.5 12h13"/>',
    'pause': '<rect x="6.5" y="5" width="3.6" height="14" rx="1.3"/><rect x="13.9" y="5" width="3.6" height="14" rx="1.3"/>',
    'play': '<path d="M8 5.6v12.8a1 1 0 0 0 1.5.9l10-6.4a1 1 0 0 0 0-1.8l-10-6.4A1 1 0 0 0 8 5.6z"/>',
    'undo': '<path d="M9 14 4.5 9.5 9 5"/><path d="M4.5 9.5H15a5 5 0 0 1 0 10h-3"/>',
    'refresh': '<path d="M19.5 12a7.5 7.5 0 0 1-13.1 5"/><path d="M4.5 12a7.5 7.5 0 0 1 13.1-5"/><path d="M18.1 3.4v3.9h-3.9M5.9 20.6v-3.9h3.9"/>',
    'edit': '<path d="M4.5 19.5 5.2 16 15.7 5.5a2 2 0 0 1 2.8 0l0 0a2 2 0 0 1 0 2.8L8 18.8z"/><path d="M13.6 7.6l2.8 2.8"/>',
    'search': '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    'filter': '<path d="M4 5h16l-6.2 7.3v5.4l-3.6 1.8v-7.2z"/>',
    'download': '<path d="M12 4v11M7 10.5l5 5 5-5"/><path d="M5 19.5h14"/>',
    'upload': '<path d="M12 15.5V4.5M7 9l5-5 5 5"/><path d="M5 19.5h14"/>',
    'external': '<path d="M13.5 4.5h6v6M19.5 4.5 11 13"/><path d="M17 14v4a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 5 18V8.5A1.5 1.5 0 0 1 6.5 7h4"/>',
    'copy': '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.4"/><path d="M15.5 8.5V6A2 2 0 0 0 13.5 4H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>',
    'trash': '<path d="M4.5 6.5h15M9.5 6.5V4.5h5v2"/><path d="m6.5 6.5.9 12.6a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12.6"/><path d="M10 10.5v6M14 10.5v6"/>',
    'table': '<rect x="4" y="5" width="16" height="14" rx="2.2"/><path d="M4 10h16M4 14.5h16M10 10v9"/>',
    'list': '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.8" cy="6.5" r="1.1" ' + DOT + '/><circle cx="4.8" cy="12" r="1.1" ' + DOT + '/><circle cx="4.8" cy="17.5" r="1.1" ' + DOT + '/>',
    'dots': '<circle cx="6" cy="12" r="1.5" ' + DOT + '/><circle cx="12" cy="12" r="1.5" ' + DOT + '/><circle cx="18" cy="12" r="1.5" ' + DOT + '/>',
    'info': '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><path d="M12 7.6v.2"/>',
    'help': '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.7"/><path d="M12 17v.2"/>',
    'alert': '<path d="M10.3 4.6 3 17.4a2 2 0 0 0 1.7 3h14.6a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4.5M12 17v.2"/>',
    'lock': '<rect x="5" y="10.5" width="14" height="10" rx="2.6"/><path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5"/>',
    'shield': '<path d="M12 3.5 19 6v5.6c0 4.2-2.9 7.5-7 8.9-4.1-1.4-7-4.7-7-8.9V6z"/><path d="m9 12 2.2 2.2 3.9-4"/>',
    'eye': '<path d="M2.8 12S6 5.8 12 5.8 21.2 12 21.2 12 18 18.2 12 18.2 2.8 12 2.8 12z"/><circle cx="12" cy="12" r="2.8"/>',
    'key': '<circle cx="8.5" cy="14.5" r="4"/><path d="m11.5 11.6 7.5-7.6M16 6.5l2.5 2.5M14 8.6l2 2"/>',
    'heart': '<path d="M12 19.5s-7.5-4.4-7.5-9.7A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6c0 5.3-7.5 9.7-7.5 9.7z"/>',
    'bulb': '<path d="M9 17.5h6M10 20.5h4"/><path d="M8.7 14.6A6 6 0 1 1 15.3 14.6c-.6.5-.8 1.2-.8 2V17.5h-5v-.9c0-.8-.2-1.5-.8-2z"/>',
    'sparkle': '<path d="M12 3.5c.6 3.9 2.6 5.9 6.5 6.5-3.9.6-5.9 2.6-6.5 6.5-.6-3.9-2.6-5.9-6.5-6.5 3.9-.6 5.9-2.6 6.5-6.5z"/><path d="M18.5 15.6c.3 1.5 1 2.2 2.5 2.4-1.5.2-2.2.9-2.5 2.4-.3-1.5-1-2.2-2.5-2.4 1.5-.2 2.2-.9 2.5-2.4z"/>',
    'streak': '<path d="M13.4 3 5.6 13.4h5.8L10.4 21l8-10.6h-5.8z"/>',
    'trophy': '<path d="M8 4h8v5.5a4 4 0 0 1-8 0z"/><path d="M8 6H5.3c0 2.6 1.2 4.3 3.1 4.7M16 6h2.7c0 2.6-1.2 4.3-3.1 4.7"/><path d="M12 13.5v3.2M8.5 20h7M9.5 20c0-1.8 1.1-3.3 2.5-3.3s2.5 1.5 2.5 3.3"/>',
    'trend': '<path d="m3.5 16.5 5-5 4 3.5 7.5-7.5"/><path d="M15 7.5h5v5"/>',
    'calendar': '<rect x="4" y="5.5" width="16" height="14.5" rx="3"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    'pin': '<path d="M8.5 3.5h7M9.8 3.5v5.2l-3.3 4h11l-3.3-4V3.5M12 12.7v8"/>',
    'map-pin': '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.4"/>',
    'compass': '<circle cx="12" cy="12" r="8.5"/><path d="m15.6 8.4-2.1 5.1-5.1 2.1 2.1-5.1z"/>',
    'ruler': '<path d="M4 15.5 15.5 4l4.5 4.5L8.5 20z"/><path d="m8 11.5 2 2M10.8 8.7l1.4 1.4M13.6 5.9l2 2"/>',
    'stairs': '<path d="M4 19.5h4v-4h4v-4h4v-4h4"/><path d="M4 19.5V16"/>',
    'layers': '<path d="m12 4 8.5 4.5L12 13 3.5 8.5z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5"/>',
    'door': '<path d="M6 20.5V5a1.5 1.5 0 0 1 1.5-1.5h9A1.5 1.5 0 0 1 18 5v15.5"/><path d="M4 20.5h16"/><path d="M14.5 12.5v.2"/>',
    'window': '<rect x="5" y="3.5" width="14" height="15" rx="1.6"/><path d="M12 3.5v15M5 11h14M3.5 20.5h17"/>',
    'curtain': '<path d="M3.5 4h17"/><path d="M5.5 4v16.5c2.6-.8 4-4.2 4-8.4S8 4.4 5.5 4zM18.5 4v16.5c-2.6-.8-4-4.2-4-8.4S16 4.4 18.5 4z"/>',
    'fan': '<circle cx="12" cy="10" r="6.5"/><circle cx="12" cy="10" r="1.3"/><path d="M12 8.7c-.4-2 .4-3.2 1.8-3.2M13.2 10.7c1.7.9 2.1 2.3 1.4 3.3M10.8 10.6c-1.6 1-3 .7-3.4-.6"/><path d="M12 16.5v3.5M8.5 20.5h7"/>',
    'radiator': '<rect x="4.5" y="6" width="3.6" height="13" rx="1.8"/><rect x="10.2" y="6" width="3.6" height="13" rx="1.8"/><rect x="15.9" y="6" width="3.6" height="13" rx="1.8"/><path d="M2.5 9.5h2M19.5 9.5h2"/>',
    'thermometer': '<path d="M10 14.4V5.2a2 2 0 0 1 4 0v9.2a4 4 0 1 1-4 0z"/><path d="M12 9.5v6.5"/>',
    /* weather and sensation */
    'sun': '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v2.3M12 18.9v2.3M2.8 12h2.3M18.9 12h2.3M5.5 5.5l1.6 1.6M16.9 16.9l1.6 1.6M5.5 18.5l1.6-1.6M16.9 7.1l1.6-1.6"/>',
    'sun-small': '<circle cx="12" cy="12" r="3.8"/><path d="M12 4.2v1.8M12 18v1.8M4.2 12H6M18 12h1.8"/>',
    'moon': '<path d="M19 14.6A7.6 7.6 0 0 1 9.4 5a7.6 7.6 0 1 0 9.6 9.6z"/>',
    'cloud': '<path d="M7.2 18.5h10.3a3.9 3.9 0 0 0 .5-7.77A5.9 5.9 0 0 0 6.6 9.9 4.3 4.3 0 0 0 7.2 18.5z"/>',
    'snow': '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="m9.6 4.4 2.4 2 2.4-2M9.6 19.6l2.4-2 2.4 2M3.9 10.6l3.1.5-1.1 2.9M20.1 13.4l-3.1-.5 1.1-2.9"/>',
    'flame': '<path d="M12 21a6 6 0 0 0 6-6c0-3.6-2.4-5.6-3.6-8.6-1.1 1.5-1.6 2.9-1.6 4.4C11.2 9.6 9.8 7.8 9.6 5.4 7.4 7.4 6 10.4 6 15a6 6 0 0 0 6 6z"/><path d="M12 21a2.4 2.4 0 0 1-2.4-2.4c0-1.6 1.3-2.5 2.4-4.1 1.1 1.6 2.4 2.5 2.4 4.1A2.4 2.4 0 0 1 12 21z"/>',
    'leaf': '<path d="M5.5 18.5C5 10.5 10 5.2 19 5c.3 8.8-4.8 13.9-13.5 13.5z"/><path d="M5.5 18.5 14 10"/>',
    'wind': '<path d="M3 9h10.5a2.8 2.8 0 1 0-2.8-2.8"/><path d="M3 14h14.5a2.8 2.8 0 1 1-2.8 2.8"/><path d="M3 11.5h6"/>',
    'breeze': '<path d="M4 10.5h9a2.5 2.5 0 1 0-2.5-2.5"/><path d="M4 14.5h12a2.5 2.5 0 1 1-2.5 2.5"/>',
    'still': '<path d="M4.5 9.5h15M4.5 14.5h15"/>',
    'drop': '<path d="M12 3.5s6 6.4 6 10.9a6 6 0 0 1-12 0C6 9.9 12 3.5 12 3.5z"/>',
    /* rooms and activities (check-in) */
    'sofa': '<path d="M5.5 11V8.5A2.5 2.5 0 0 1 8 6h8a2.5 2.5 0 0 1 2.5 2.5V11"/><path d="M3.5 13a2 2 0 0 1 4 0v2h9v-2a2 2 0 0 1 4 0v5h-17z"/><path d="M5.5 18v1.5M18.5 18v1.5"/>',
    'bed': '<path d="M3.5 19.5v-13M3.5 15.5h17v4M20.5 15.5V13a3 3 0 0 0-3-3H11v5.5"/><circle cx="7.3" cy="12.4" r="1.9"/>',
    'sleep': '<path d="M3.5 20v-9M3.5 16.5h17V20M20.5 16.5v-1.8a2.7 2.7 0 0 0-2.7-2.7H11v4.5"/><circle cx="7.3" cy="13.8" r="1.8"/><path d="M14 3.5h4l-4 4.5h4"/>',
    'lying': '<circle cx="6" cy="9.5" r="2.2"/><path d="M9.5 12.5h7.8a2.7 2.7 0 0 1 2.7 2.7v.3"/><path d="M3 15.5h18M3 12v7M21 15.5V19"/>',
    'laptop': '<rect x="5" y="5" width="14" height="10" rx="1.6"/><path d="M2.8 18.5 4.6 15h14.8l1.8 3.5z"/>',
    'stand': '<circle cx="12" cy="4.8" r="2.1"/><path d="M12 8v6.5M8.5 12.5 12 9l3.5 3.5M12 14.5l-2.6 6M12 14.5l2.6 6"/>',
    'walk': '<circle cx="13.6" cy="4.6" r="2.1"/><path d="m12.4 8.2-1.8 6.1 3.2 2.6.9 4.1"/><path d="m10.6 14.3-1.9 2.9-3.2 1.3"/><path d="m12.4 8.2-3.6 2.1-1 2.9M12.4 8.2l2.6 2.9 3 .8"/>',
    'pan': '<circle cx="10" cy="14" r="6"/><path d="M16 14h5.5"/><path d="M8 3.5c0 1.5 1 1.5 1 3M11.5 3.5c0 1.5 1 1.5 1 3"/>',
    'dumbbell': '<path d="M6.5 7.5v9M17.5 7.5v9M3.5 10v4M20.5 10v4M6.5 12h11"/>',
    'mug': '<path d="M5 9h11v6.5A3.5 3.5 0 0 1 12.5 19h-4A3.5 3.5 0 0 1 5 15.5z"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8.5 3.5c0 1.4 1 1.6 1 3M12 3.5c0 1.4 1 1.6 1 3"/>',
    'glass': '<path d="M6.5 4h11l-1.4 15.1a1.5 1.5 0 0 1-1.5 1.4H9.4a1.5 1.5 0 0 1-1.5-1.4z"/><path d="M7.1 9h9.8"/><rect x="9.5" y="11.5" width="3.2" height="3.2" rx=".7"/>',
    'fork': '<path d="M7.5 3.5v5a2 2 0 0 0 4 0v-5M9.5 3.5v17"/><path d="M16.5 20.5v-17c-1.9 1-3 3.3-3 6.3v3.7h3"/>',
    'apple': '<path d="M12 7.6c-1.3-.9-2.8-1.3-4.3-.9C5 7.4 4 10.1 4.6 13.1c.7 3.5 2.9 6.4 5 6.4 1 0 1.5-.5 2.4-.5s1.4.5 2.4.5c2.1 0 4.3-2.9 5-6.4.6-3-.4-5.7-3.1-6.4-1.5-.4-3 0-4.3.9z"/><path d="M12 7.6c0-2 .8-3.3 2.5-4"/>',
    'zzz': '<path d="M4 9.5h5l-5 6h5M13 4h4l-4 4.5h4M14.5 13.5h5.5l-5.5 7h5.5"/>',
    'blanket': '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M3.5 10h17M3.5 14.5h17M9 5v14M15 5v14"/>',
    'layer-on': '<path d="M8.5 4 5 6.2 3.5 19h3L8 10v10h8V10l1.5 9h3L19 6.2 15.5 4c-.6 1.4-1.9 2.2-3.5 2.2S9.1 5.4 8.5 4z"/><path d="M12 11.5v5M9.5 14h5"/>',
    'layer-off': '<path d="M8.5 4 5 6.2 3.5 19h3L8 10v10h8V10l1.5 9h3L19 6.2 15.5 4c-.6 1.4-1.9 2.2-3.5 2.2S9.1 5.4 8.5 4z"/><path d="M9.5 14h5"/>',
    /* clothing (check-in) */
    'tshirt': '<path d="M8.5 4 4 6.6l1.8 3.9 2.2-1V20h8V9.5l2.2 1L20 6.6 15.5 4c-.6 1.4-1.9 2.2-3.5 2.2S9.1 5.4 8.5 4z"/>',
    'longsleeve': '<path d="M8.5 4 5 6.2 3.5 19h3L8 10v10h8V10l1.5 9h3L19 6.2 15.5 4c-.6 1.4-1.9 2.2-3.5 2.2S9.1 5.4 8.5 4z"/>',
    'sweater': '<path d="M8.5 4 5 6.2 3.5 19h3L8 10v10h8V10l1.5 9h3L19 6.2 15.5 4c-.6 1.4-1.9 2.2-3.5 2.2S9.1 5.4 8.5 4z"/><path d="M8 17.5h8M3.8 16.5h3M17.2 16.5h3M9.5 4.9c.6 1 1.5 1.6 2.5 1.6s1.9-.6 2.5-1.6"/>',
    'hoodie': '<path d="M8.5 4.6 5 6.6 3.5 19h3L8 10.3V20h8v-9.7l1.5 8.7h3L19 6.6l-3.5-2"/><path d="M8.5 4.6C8.6 2.9 10.1 2 12 2s3.4.9 3.5 2.6c0 1.6-1.5 3-3.5 3s-3.6-1.4-3.5-3z"/><path d="M9.5 14h5v3h-5z"/>',
    'shorts': '<path d="M6 4.5h12l1.2 10.5h-5.6L12 9.6 10.4 15H4.8z"/><path d="M6.2 7h11.6"/>',
    'pants': '<path d="M7 3.5h10l1 17h-4.3L12 9.6l-1.7 10.9H6z"/><path d="M7.1 6.3h9.8"/>',
    'sweatpants': '<path d="M7 3.5h10l1 17h-4.3L12 9.6l-1.7 10.9H6z"/><path d="M7.1 6.3h9.8M6.2 17.6h4.5M13.3 17.6h4.5"/><path d="M11 6.3v2M13 6.3v2"/>',
    'skirt': '<path d="M8 4.5h8l3.5 14.5h-15z"/><path d="M8 7.5h8M11 7.5 10 19M13 7.5 14 19"/>',
    'socks': '<path d="M9 3.5h6v8.6l3.3 3.2a3 3 0 0 1-4.2 4.3l-4.5-4.3a2 2 0 0 1-.6-1.4z"/><path d="M9 6.5h6"/>',
    'slippers': '<path d="M3.5 18.5v-2.1c0-.9.7-1.6 1.6-1.6h5c1.1-2.5 3.1-3.9 5.6-3.9 3 0 4.8 2.3 4.8 5.4v2.2z"/><path d="M10.1 14.8c1.6.2 2.8 1.2 3.3 2.7"/><path d="M3 18.5h18"/>'
  };

  /* ---------------------------------------------------------------- illustrations (48 x 48) */
  const D = (shape) => shape.replace(/^<(\w+)/, '<$1 class="duo" style="fill:var(--duo,currentColor);fill-opacity:var(--duo-o,.16);stroke:none"');
  const F = DOT;           // small solid marks in currentColor
  const G = '<path d="M4 40h40"/>';  // ground line shared by every building

  const A = {};
  /* home_type */
  A['home_type:detached'] = D('<path d="M8 25 20 15l12 10v15H8z"/>') +
    '<path d="M4 27 20 13.5 36 27"/><path d="M8 24v16h24V24"/><path d="M26.5 18.9V12h3.5v9.9"/><path d="M17 40v-7.5h6V40"/>' +
    '<rect x="11" y="27" width="4" height="4" rx="1"/><rect x="25" y="27" width="4" height="4" rx="1"/>' +
    '<circle cx="39.5" cy="27.5" r="4.5"/><path d="M39.5 32v8"/>' + G;
  A['home_type:townhouse'] = D('<path d="M7 21 12 16l5.5 5.5L23 16l5.5 5.5L34 16l5 5v19H7z"/>') +
    '<path d="M5 23 12 15l6 7 6-7 6 7 6-7 7 8"/><path d="M7 21v19M18 22v18M30 22v18M41 21.5V40"/>' +
    '<path d="M10.8 40v-5.5h3.5V40M22.3 40v-5.5h3.5V40M33.8 40v-5.5h3.5V40"/>' +
    '<rect x="10.5" y="25" width="4" height="4" rx=".9"/><rect x="22" y="25" width="4" height="4" rx=".9"/><rect x="33.5" y="25" width="4" height="4" rx=".9"/>' + G;
  A['home_type:duplex'] = D('<path d="M9 24.5 24 13l15 11.5V40H9z"/>') +
    '<path d="M5 27 24 11.5 43 27"/><path d="M9 24v16h30V24"/><path d="M24 15v25"/>' +
    '<path d="M15 40v-7h4.5v7M28.5 40v-7H33v7"/><rect x="12" y="25.5" width="4" height="4" rx=".9"/><rect x="32" y="25.5" width="4" height="4" rx=".9"/>' +
    G;
  A['home_type:apartment'] = D('<rect x="13" y="9" width="22" height="31"/>') +
    '<rect x="13" y="9" width="22" height="31" rx="1.5"/><path d="M17.5 9V6h6v3"/>' +
    '<g ' + F + '><rect x="16.5" y="13" width="3" height="3" rx=".6"/><rect x="22.5" y="13" width="3" height="3" rx=".6"/><rect x="28.5" y="13" width="3" height="3" rx=".6"/><rect x="16.5" y="19" width="3" height="3" rx=".6"/><rect x="22.5" y="19" width="3" height="3" rx=".6"/><rect x="28.5" y="19" width="3" height="3" rx=".6"/><rect x="16.5" y="25" width="3" height="3" rx=".6"/><rect x="22.5" y="25" width="3" height="3" rx=".6"/><rect x="28.5" y="25" width="3" height="3" rx=".6"/></g>' +
    '<path d="M21.5 40v-6h5v6"/><circle cx="8" cy="31" r="3.5"/><path d="M8 34.5V40"/>' + G;
  A['home_type:mobile'] = D('<rect x="5" y="18" width="36" height="15" rx="2.5"/>') +
    '<rect x="5" y="18" width="36" height="15" rx="2.5"/><path d="M7.5 18c0-1.8 1-3 3-3h25c2 0 3 1.2 3 3"/><rect x="9" y="22" width="6" height="4.5" rx="1"/><rect x="29" y="22" width="7" height="4.5" rx="1"/><path d="M19 33V22h5v11"/>' +
    '<circle cx="13" cy="36.5" r="2.5"/><circle cx="31" cy="36.5" r="2.5"/><path d="M41 29.5h3.5"/><path d="M4 40h6M16 40h12M34 40h10"/>';
  A['home_type:dorm'] = D('<path d="M8 19h32v21H8z"/>') +
    '<path d="M5 19.5 24 11l19 8.5z"/><path d="M8 19.5V40M40 19.5V40"/><path d="M24 11V4.5l6 1.8-6 1.8"/>' +
    '<path d="M21 40v-7a3 3 0 0 1 6 0v7"/>' +
    '<g ' + F + '><rect x="11.5" y="23" width="3.5" height="3.5" rx=".7"/><rect x="17.5" y="23" width="3.5" height="3.5" rx=".7"/><rect x="27" y="23" width="3.5" height="3.5" rx=".7"/><rect x="33" y="23" width="3.5" height="3.5" rx=".7"/><rect x="11.5" y="30" width="3.5" height="3.5" rx=".7"/><rect x="33" y="30" width="3.5" height="3.5" rx=".7"/></g>' + G;
  A['home_type:other'] = D('<path d="M11 24 24 13l13 11v16H11z"/>') +
    '<path d="M7 27 24 12l17 15"/><path d="M11 24.5V40h26V24.5" stroke-dasharray="3.2 3.6"/>' +
    '<circle cx="18" cy="31" r="1.9" ' + F + '/><circle cx="24" cy="31" r="1.9" ' + F + '/><circle cx="30" cy="31" r="1.9" ' + F + '/>' + G;

  /* tenure */
  A['tenure:own'] = D('<path d="M6 25 17 16l11 9v15H6z"/>') +
    '<path d="M3 27.5 17 15.5l14 12"/><path d="M6 25v15h22V25"/><path d="M14.5 40v-7h5v7"/>' +
    '<circle cx="35.5" cy="21.5" r="5"/><circle cx="35.5" cy="21.5" r="1.3" ' + F + '/><path d="M35.5 26.5V40M35.5 31.5h3.5M35.5 35.5h3"/>' + G;
  A['tenure:rent'] = D('<path d="M6 25 17 16l11 9v15H6z"/>') +
    '<path d="M3 27.5 17 15.5l14 12"/><path d="M6 25v15h22V25"/><path d="M14.5 40v-7h5v7"/>' +
    '<path d="M38 12.5v27.5"/><path d="M32 16h12"/><rect x="31" y="19.5" width="14" height="9.5" rx="1.8"/><path d="M34 19.5V16M42 19.5V16"/><path d="M34.5 24.2h7"/>' + G;
  A['tenure:other'] = null; // alias, filled in below

  /* heating */
  A['heating:furnace'] = D('<rect x="13" y="7" width="22" height="31" rx="2.5"/>') +
    '<rect x="13" y="7" width="22" height="31" rx="2.5"/><path d="M20 7V3.5h8V7"/><path d="M17.5 12h13M17.5 15.5h13"/><rect x="18" y="20" width="12" height="12" rx="2"/>' +
    '<path d="M24 29.5c-1.9 0-3-1.2-3-2.8 0-1.6 1.3-2.4 1.9-3.9.5.9 1 1.3 1.6 1.5.2-1.3.8-2.3 1.8-3 .1 1.5 1.7 2.6 1.7 4.6 0 2.1-1.5 3.6-4 3.6Z"/><path d="M16.5 38v2M31.5 38v2"/>' + G;
  A['heating:heat_pump'] = D('<rect x="6" y="15" width="36" height="22" rx="3"/>') +
    '<rect x="6" y="15" width="36" height="22" rx="3"/><circle cx="19" cy="26" r="7.5"/><circle cx="19" cy="26" r="1.3"/>' +
    '<path d="M19 26c0-3 1.5-5 3.5-5.4M19 26c-2.6 1.5-5 1.3-6.4-.2M19 26c2.6 1.5 3.5 3.8 2.9 5.8"/><path d="M31 20.5v11M35.5 20.5v11"/><path d="M11 37v3M37 37v3"/>' +
    '<path d="M15 5h17M29 2.5 32 5l-3 2.5M33 10.5H16M19 8l-3 2.5 3 2.5"/>' + G;
  A['heating:mini_split'] = D('<rect x="5" y="9" width="38" height="14" rx="5"/>') +
    '<rect x="5" y="9" width="38" height="14" rx="5"/><path d="M11 18.5h26"/><circle cx="37" cy="13.5" r="1.1" ' + F + '/>' +
    '<path d="M15 28l-3 7.5M24 28v8.5M33 28l3 7.5"/>';
  A['heating:boiler'] = D('<rect x="8" y="15" width="32" height="21" rx="3"/>') +
    '<rect x="8" y="15" width="6.5" height="21" rx="3.25"/><rect x="16.5" y="15" width="6.5" height="21" rx="3.25"/><rect x="25" y="15" width="6.5" height="21" rx="3.25"/><rect x="33.5" y="15" width="6.5" height="21" rx="3.25"/>' +
    '<path d="M11 36v4M37 36v4"/><path d="M17 11c-1.5-1.5-1.5-3 0-4.5M24 11c-1.5-1.5-1.5-3 0-4.5M31 11c-1.5-1.5-1.5-3 0-4.5"/>' + G;
  A['heating:baseboard'] = D('<rect x="4" y="28" width="40" height="9" rx="2"/>') +
    '<rect x="4" y="28" width="40" height="9" rx="2"/><path d="M9 32.5h22M36 31v3"/>' +
    '<path d="M14 23c-1.6-1.6-1.6-3.2 0-4.8s1.6-3.2 0-4.8M24 23c-1.6-1.6-1.6-3.2 0-4.8s1.6-3.2 0-4.8M34 23c-1.6-1.6-1.6-3.2 0-4.8s1.6-3.2 0-4.8"/>' + G;
  A['heating:stove'] = D('<rect x="12" y="17" width="24" height="20" rx="3"/>') +
    '<path d="M21 17V4h6v13"/><rect x="12" y="17" width="24" height="20" rx="3"/><rect x="17" y="21.5" width="14" height="11" rx="2"/>' +
    '<path d="M24 31c-1.9 0-3-1.1-3-2.7 0-1.6 1.3-2.3 1.9-3.8.5.9 1 1.3 1.6 1.5.2-1.3.8-2.3 1.8-3 .1 1.5 1.7 2.6 1.7 4.5 0 2.1-1.5 3.5-4 3.5Z"/><path d="M15 37v3M33 37v3"/>' + G;

  /* cooling */
  A['cooling:central_ac'] = D('<rect x="9" y="9" width="30" height="28" rx="3.5"/>') +
    '<rect x="9" y="9" width="30" height="28" rx="3.5"/><circle cx="24" cy="23" r="9.5"/><circle cx="24" cy="23" r="1.4"/>' +
    '<path d="M24 23c0-4 2-6.5 4.5-6.5M24 23c-3.5 2-6.5 1.5-7.8-.5M24 23c3.4 2 4.3 5 3 7"/><path d="M13 13h3M13 37v3M35 37v3"/>' + G;
  A['cooling:window_ac'] = '<rect x="7" y="5" width="34" height="35" rx="2"/><path d="M7 20h34M24 5v15"/>' +
    D('<rect x="12" y="24" width="24" height="12" rx="2"/>') +
    '<rect x="12" y="24" width="24" height="12" rx="2"/><path d="M16 28.5h9M16 32h9"/><circle cx="31" cy="30" r="1.9"/>';
  A['cooling:mini_split'] = null; // alias of heating:mini_split
  A['cooling:portable_ac'] = D('<rect x="12" y="11" width="18" height="26" rx="3.5"/>') +
    '<rect x="12" y="11" width="18" height="26" rx="3.5"/><path d="M16 16h10M16 19.5h10"/><circle cx="21" cy="28" r="3.5"/>' +
    '<path d="M30 15h3.5c3.6 0 5.5-2.2 5.5-5.5V6"/><path d="M35.5 6h7"/><circle cx="16" cy="38.5" r="1.5"/><circle cx="26" cy="38.5" r="1.5"/>';
  A['cooling:fans'] = D('<circle cx="24" cy="19" r="13"/>') +
    '<circle cx="24" cy="19" r="13"/><path d="M24 19c-1-4.5.5-8.5 3.5-8.5 3.2 0 3 5-3.5 8.5ZM24 19c4.2 1.6 6.8 5 5.2 7.6-1.6 2.7-5.8.5-5.2-7.6ZM24 19c-3.2 3.1-7.5 3.9-8.9 1.2-1.4-2.8 3-5.3 8.9-1.2Z"/>' +
    '<path d="M24 32v7M17 40h14"/>';

  /* thermostat */
  A['thermostat:manual'] = D('<circle cx="24" cy="24" r="16"/>') +
    '<circle cx="24" cy="24" r="16"/><circle cx="24" cy="24" r="9"/><path d="M24 24l4.6-4.6"/>' +
    '<path d="M24 5.5v2.2M10.9 10.9l1.6 1.6M37.1 10.9l-1.6 1.6M5.5 24h2.2M40.3 24h2.2"/>';
  A['thermostat:programmable'] = D('<rect x="7" y="11" width="34" height="26" rx="4"/>') +
    '<rect x="7" y="11" width="34" height="26" rx="4"/><rect x="12" y="16" width="16" height="11" rx="2"/>' +
    '<path d="M16 20.5h4M16 23h7"/><circle cx="34.5" cy="18" r="1.8"/><circle cx="34.5" cy="25" r="1.8"/><path d="M13 32h3M19 32h3M25 32h3M32.5 32h4"/>';
  A['thermostat:smart'] = D('<circle cx="22" cy="26" r="10"/>') +
    '<circle cx="22" cy="26" r="14"/><circle cx="22" cy="26" r="10"/><path d="M19.5 24.5c0-2.4 1.6-4 2.5-4.6.9.6 2.5 2.2 2.5 4.6a2.5 2.5 0 0 1-5 0z"/>' +
    '<path d="M35 6.5a9 9 0 0 1 6.5 6.5M35.5 11a4.6 4.6 0 0 1 2 2"/><circle cx="35" cy="13.5" r="1.2" ' + F + '/>';
  A['thermostat:landlord'] = D('<rect x="7" y="8" width="22" height="28" rx="4"/>') +
    '<rect x="7" y="8" width="22" height="28" rx="4"/><circle cx="18" cy="21" r="6"/><path d="M18 21l2.8-2.8M13 30.5h10"/>' +
    '<rect x="27" y="27" width="15" height="12" rx="2.6"/><path d="M30.5 27v-3a4 4 0 0 1 8 0v3"/><path d="M34.5 32v2"/>';

  /* windows (glazing) */
  A['windows:single'] = D('<rect x="12" y="10" width="24" height="28" rx="1.5"/>') +
    '<rect x="12" y="10" width="24" height="28" rx="1.5"/><path d="M24 10v28M12 24h24"/><path d="M8 41h32"/><path d="M15.5 15.5l3-3M15.5 20l5.5-5.5"/>';
  A['windows:double'] = D('<rect x="9" y="15" width="24" height="25" rx="1.5"/>') +
    '<rect x="9" y="15" width="24" height="25" rx="1.5"/><path d="M21 15v25M9 27.5h24"/><path d="M15 15v-5h24v25h-6"/><path d="M12.5 20l3-3"/>';
  A['windows:triple'] = D('<rect x="6" y="19" width="22" height="22" rx="1.5"/>') +
    '<rect x="6" y="19" width="22" height="22" rx="1.5"/><path d="M17 19v22M6 30h22"/><path d="M12 19v-5.5h22v22h-6"/><path d="M18 13.5V8h22v22h-6"/><path d="M9.5 24l3-3"/>';

  /* windows_open */
  A['windows_open:yes'] = D('<rect x="8" y="9" width="22" height="29"/>') +
    '<rect x="8" y="9" width="22" height="29" rx="1.5"/><path d="M30 9l11 4.5V42L30 38"/>' +
    '<path d="M11.5 19h10a2.2 2.2 0 1 0-2.2-2.2M11.5 24.5h14M11.5 30h9a2.2 2.2 0 1 1-2.2 2.2"/>' + '<path d="M5 41h28"/>';
  A['windows_open:some'] = D('<rect x="5" y="13" width="15" height="23"/>') +
    '<rect x="5" y="13" width="15" height="23" rx="1.2"/><path d="M20 13l7 3v23.5l-7-3.5"/>' +
    '<rect x="29" y="13" width="15" height="23" rx="1.2"/><path d="M36.5 13v23M29 24.5h15"/><path d="M3 40h42"/>';
  A['windows_open:no'] = D('<rect x="10" y="9" width="24" height="29" rx="1.5"/>') +
    '<rect x="10" y="9" width="24" height="29" rx="1.5"/><path d="M22 9v29M10 23.5h24"/>' +
    '<rect x="29" y="28" width="13" height="11" rx="2.4"/><path d="M32 28v-2.5a3.5 3.5 0 0 1 7 0V28"/><path d="M35.5 32.5v2"/>';

  /* draftiness 1 (never drafty) .. 5 (very drafty) */
  const draftHouse = (x) => {
    const l = x, r = x + 20, m = x + 10;
    return D('<path d="M' + l + ' 26 ' + m + ' 18l10 8v14H' + l + 'z"/>') +
      '<path d="M' + (l - 3) + ' 28 ' + m + ' 16.5 ' + (r + 3) + ' 28"/><path d="M' + l + ' 26v14h20V26"/><path d="M' + (m - 2.5) + ' 40v-6h5v6"/>';
  };
  A['draftiness:1'] = D('<path d="M12 25 24 15l12 10v15H12z"/>') +
    '<path d="M8 27.5 24 13.5l16 14"/><path d="M12 25v15h24V25"/>' +
    '<path d="M24 36.5c-3-2-5.6-4.1-5.6-7 0-1.8 1.3-3.1 3-3.1 1.1 0 2 .6 2.6 1.4.6-.8 1.5-1.4 2.6-1.4 1.7 0 3 1.3 3 3.1 0 2.9-2.6 5-5.6 7z"/>' + G;
  A['draftiness:2'] = draftHouse(22) + '<path d="M4 30h11a2.4 2.4 0 1 0-2.4-2.4"/>' + G;
  A['draftiness:3'] = draftHouse(23) + '<path d="M3 25h12a2.4 2.4 0 1 0-2.4-2.4"/><path d="M5 32h11a2.4 2.4 0 1 1-2.4 2.4"/>' + G;
  A['draftiness:4'] = draftHouse(24) + '<path d="M3 21h12a2.4 2.4 0 1 0-2.4-2.4"/><path d="M3 27.5h15"/><path d="M5 33.5h11a2.4 2.4 0 1 1-2.4 2.4"/>' + G;
  A['draftiness:5'] = draftHouse(25) + '<path d="M2 17h13a2.4 2.4 0 1 0-2.4-2.4"/><path d="M2 23h17"/><path d="M4 29h15a2.4 2.4 0 1 1-2.4 2.4"/><path d="M2 35h9"/>' +
    G;

  /* people */
  A['people:adult'] = D('<path d="M14 40v-9.5a10 10 0 0 1 20 0V40z"/>') +
    '<circle cx="24" cy="12.5" r="6.5"/><path d="M14 40v-9.5a10 10 0 0 1 20 0V40"/>';
  A['people:child'] = D('<path d="M16.5 40v-6a7.5 7.5 0 0 1 15 0v6z"/>') +
    '<circle cx="24" cy="18.5" r="6"/><path d="M16.5 40v-6a7.5 7.5 0 0 1 15 0v6"/><path d="M23.4 12.6c.1-1.9 1.3-3.2 3.4-3.4"/><path d="M13 30.5 9.5 26M35 30.5l3.5-4.5"/>';
  A['people:pet'] = D('<path d="M24 26c4.6 0 9.5 5 9.5 9.6 0 2.8-2 4.4-4.6 4.4-1.8 0-3.2-1-4.9-1s-3.1 1-4.9 1c-2.6 0-4.6-1.6-4.6-4.4C14.5 31 19.4 26 24 26z"/>') +
    '<path d="M24 26c4.6 0 9.5 5 9.5 9.6 0 2.8-2 4.4-4.6 4.4-1.8 0-3.2-1-4.9-1s-3.1 1-4.9 1c-2.6 0-4.6-1.6-4.6-4.4C14.5 31 19.4 26 24 26z"/>' +
    '<ellipse cx="12" cy="20.5" rx="3.6" ry="4.4" transform="rotate(-18 12 20.5)"/><ellipse cx="19.5" cy="12.5" rx="3.6" ry="4.6" transform="rotate(-6 19.5 12.5)"/><ellipse cx="28.5" cy="12.5" rx="3.6" ry="4.6" transform="rotate(6 28.5 12.5)"/><ellipse cx="36" cy="20.5" rx="3.6" ry="4.4" transform="rotate(18 36 20.5)"/>';

  /* floors in the home, 1..4 (4 = 4 or more) */
  A['floors:1'] = D('<path d="M14 29h20v11H14z"/>') + '<path d="M11 31 24 21l13 10"/><path d="M14 29v11h20V29"/><path d="M22 40v-5h4v5"/>' + G;
  A['floors:2'] = D('<path d="M14 22h20v18H14z"/>') + '<path d="M11 24 24 14l13 10"/><path d="M14 22v18h20V22"/><path d="M14 31h20"/><path d="M22 40v-5h4v5"/><rect x="17" y="24.5" width="4" height="3.5" rx=".8"/><rect x="27" y="24.5" width="4" height="3.5" rx=".8"/>' + G;
  A['floors:3'] = D('<path d="M14 16h20v24H14z"/>') + '<path d="M11 18 24 8l13 10"/><path d="M14 16v24h20V16"/><path d="M14 24h20M14 32h20"/><path d="M22 40v-5h4v5"/><rect x="17" y="18.5" width="4" height="3.5" rx=".8"/><rect x="27" y="18.5" width="4" height="3.5" rx=".8"/><rect x="17" y="26.5" width="4" height="3.5" rx=".8"/><rect x="27" y="26.5" width="4" height="3.5" rx=".8"/>' + G;
  A['floors:4'] = D('<path d="M15 9h18v31H15z"/>') + '<path d="M15 9h18v31H15z"/><path d="M15 16.5h18M15 24h18M15 31.5h18"/><path d="M22 40v-4.5h4V40"/><rect x="18" y="11" width="3.5" height="3.5" rx=".8"/><rect x="26.5" y="11" width="3.5" height="3.5" rx=".8"/><rect x="18" y="18.5" width="3.5" height="3.5" rx=".8"/><rect x="26.5" y="18.5" width="3.5" height="3.5" rx=".8"/><rect x="18" y="26" width="3.5" height="3.5" rx=".8"/><rect x="26.5" y="26" width="3.5" height="3.5" rx=".8"/><path d="M38 9.5v7M34.5 13h7"/>' + G;

  /* year built, one house per era */
  A['year_built:pre1940'] = D('<path d="M14 21 24 10l10 11v19H14z"/>') +
    '<path d="M11 23.5 24 8.5l13 15"/><path d="M14 21v19h20V21"/><path d="M29.5 14V7.5h3.5v10.4"/><circle cx="24" cy="18" r="2.3"/>' +
    '<path d="M8 31.5l3-3.5h26l3 3.5z"/><path d="M11 31.5V40M37 31.5V40"/><path d="M22 40v-5.5h4V40"/><path d="M16.5 22.5v3M31.5 22.5v3"/>' + G;
  A['year_built:1940_1969'] = D('<path d="M7 27h34v13H7z"/>') +
    '<path d="M3 28.5 11 21h26l8 7.5"/><path d="M7 27v13h34V27"/><rect x="11" y="30.5" width="12" height="6" rx="1"/><path d="M15 30.5v6M19 30.5v6"/><path d="M28 40v-9h5v9"/><rect x="35.5" y="31" width="3" height="4" rx=".7"/><path d="M31.5 21v-4h3v4"/>' + G;
  A['year_built:1970_1989'] = D('<path d="M6 21h17v19H6z"/>') +
    '<path d="M3.5 22.5 14.5 13 25.5 22.5"/><path d="M6 21v19h17V21"/><path d="M23 29.5h18V40"/><path d="M21 31 31.5 23 44 31"/>' +
    '<rect x="26.5" y="33" width="11" height="7" rx="1"/><path d="M26.5 36.5h11"/><rect x="9.5" y="25" width="4" height="4" rx=".9"/><path d="M15.5 40v-6h4v6"/>' + G;
  A['year_built:1990_2009'] = D('<path d="M6 20h22v20H6z"/>') +
    '<path d="M3 21.5 9.5 13h15L31 21.5"/><path d="M6 20v20h22V20"/><path d="M28 27h14v13"/><path d="M26.5 28 31 23h9.5l3.5 5"/>' +
    '<rect x="31" y="31" width="8" height="9" rx="1"/><path d="M31 34h8M31 37h8"/><rect x="9" y="23" width="4" height="4" rx=".9"/><rect x="21" y="23" width="4" height="4" rx=".9"/><path d="M15 40v-7h4v7"/><rect x="9" y="31" width="4" height="4" rx=".9"/>' + G;
  A['year_built:2010_plus'] = D('<path d="M8 19l32-6v27H8z"/>') +
    '<path d="M5 19.5 43 12.5"/><path d="M8 19v21h32V13.5"/><rect x="12" y="24" width="14" height="12" rx="1"/><path d="M16.7 24v12M21.3 24v12"/><path d="M31 40v-11h5v11"/>' +
    '<path d="M24.5 13.4l9.5-1.8 1.5 3-9.5 1.8z" />' + G;
  A['year_built:unsure'] = null; // alias of the generic unsure

  /* single pictures for questions */
  A['floor_area'] = D('<rect x="10" y="10" width="28" height="28" rx="1.5"/>') +
    '<rect x="10" y="10" width="28" height="28" rx="1.5"/><path d="M10 24h11v14M27 10v9h11"/>' +
    '<path d="M10 4.5h28M13 2l-3 2.5 3 2.5M35 2l3 2.5-3 2.5"/><path d="M43.5 10v28M41 13l2.5-3 2.5 3M41 35l2.5 3 2.5-3"/>';
  A['year_built'] = D('<rect x="9" y="12" width="30" height="27" rx="3"/>') +
    '<rect x="9" y="12" width="30" height="27" rx="3"/><path d="M9 19.5h30M16 8.5v6M32 8.5v6"/>' +
    '<path d="M15.5 30.5 24 23.5l8.5 7"/><path d="M18 29v6.5h12V29"/>';
  A['unit_floor'] = D('<rect x="12" y="22" width="24" height="7"/>') +
    '<rect x="12" y="8" width="24" height="32" rx="1.5"/><path d="M12 15h24M12 22h24M12 29h24"/><path d="M22 40v-5h4v5"/><path d="M5 25.5h4M7 23l2.5 2.5L7 28M43 25.5h-4M41 23l-2.5 2.5L41 28"/>';
  A['bedrooms'] = D('<path d="M6 26h36v8H6z"/>') +
    '<path d="M6 38V12M6 26h36v12M42 26v-4a5 5 0 0 0-5-5H21v9"/><circle cx="13" cy="21" r="3.5"/>';
  A['rooms'] = D('<rect x="6" y="9" width="36" height="30" rx="2"/>') +
    '<rect x="6" y="9" width="36" height="30" rx="2"/><path d="M22 9v12M22 27v12M6 24h10M28 24h14M34 24v15"/>';
  A['facing'] = D('<circle cx="24" cy="24" r="16"/>') +
    '<circle cx="24" cy="24" r="16"/><path d="M24 11l3.5 13H20.5z"/><path d="M24 37l-3.5-13h7z" opacity=".55"/><path d="M24 3.5v2.5M24 42v2.5M3.5 24H6M42 24h2.5"/>';
  A['zip'] = D('<path d="M24 41s-11-9.6-11-18.5a11 11 0 0 1 22 0C35 31.4 24 41 24 41z"/>') +
    '<path d="M24 41s-11-9.6-11-18.5a11 11 0 0 1 22 0C35 31.4 24 41 24 41z"/><circle cx="24" cy="22.5" r="4"/><path d="M7 41h10M31 41h10"/>';
  A['setpoint'] = D('<path d="M20 29.4V9a4 4 0 0 1 8 0v20.4a8 8 0 1 1-8 0z"/>') +
    '<path d="M20 29.4V9a4 4 0 0 1 8 0v20.4a8 8 0 1 1-8 0z"/><path d="M24 17v18"/><circle cx="24" cy="35" r="3" ' + F + '/><path d="M33 10h5M33 15h3M33 20h5"/>';

  /* generic answers */
  A['other'] = D('<rect x="7" y="13" width="34" height="22" rx="11"/>') +
    '<rect x="7" y="13" width="34" height="22" rx="11" stroke-dasharray="3.5 3.5"/><circle cx="16.5" cy="24" r="2.2" ' + F + '/><circle cx="24" cy="24" r="2.2" ' + F + '/><circle cx="31.5" cy="24" r="2.2" ' + F + '/>';
  A['none'] = D('<circle cx="24" cy="24" r="14"/>') + '<circle cx="24" cy="24" r="14"/><path d="M14.1 33.9 33.9 14.1"/>';
  A['unsure'] = D('<circle cx="24" cy="24" r="15"/>') +
    '<circle cx="24" cy="24" r="15"/><path d="M19.2 19.2a5 5 0 0 1 9.6 1.8c0 3.4-4.8 4.4-4.8 7.4"/><circle cx="24" cy="33.6" r="1.7" ' + F + '/>';

  /* aliases: answers that share a picture */
  const ALIAS = {
    'tenure:other': 'other', 'heating:other': 'other', 'heating:none': 'none', 'cooling:none': 'none',
    'cooling:mini_split': 'heating:mini_split', 'thermostat:none': 'none', 'windows:unsure': 'unsure',
    'year_built:unsure': 'unsure', 'facing:unsure': 'unsure',
    'adults': 'people:adult', 'children': 'people:child', 'pets': 'people:pet', 'floors': 'floors:2'
  };
  Object.keys(ALIAS).forEach(k => { if (!A[k]) A[k] = A[ALIAS[k]]; });

  /* ---------------------------------------------------------------- the thermal sensation scale */
  const SENSE = [
    { v: -3, word: 'Cold', desc: 'Very cool all over', icon: 'snow' },
    { v: -2, word: 'Cool', desc: 'Clearly cool', icon: 'wind' },
    { v: -1, word: 'Slightly cool', desc: 'A touch cool', icon: 'breeze' },
    { v: 0, word: 'Neutral', desc: 'Neither warm nor cool', icon: 'leaf' },
    { v: 1, word: 'Slightly warm', desc: 'A touch warm', icon: 'sun-small' },
    { v: 2, word: 'Warm', desc: 'Clearly warm', icon: 'sun' },
    { v: 3, word: 'Hot', desc: 'Very warm all over', icon: 'flame' }
  ].map(s => {
    const k = s.v < 0 ? 'n' + (-s.v) : s.v > 0 ? 'p' + s.v : '0';
    const varName = '--s' + s.v;                 // --s-3 ... --s0 ... --s3
    return Object.freeze(Object.assign(s, {
      sign: signed(s.v),
      color: varName,                            // fill colour (orbs, chart marks)
      ink: varName + '-ink',                     // text or icon on the fill
      text: varName + '-text',                   // the step's colour as text on white (4.5:1 or better)
      tint: varName + '-tint',                   // light background tint
      cls: 'sv-' + k                             // sets --sc, --sc-ink, --sc-text, --sc-tint, --sc-glow
    }));
  });

  function signed(v) {
    v = Number(v);
    if (!isFinite(v)) return '';
    const r = Math.round(v * 10) / 10;
    return r > 0 ? '+' + r : r < 0 ? '−' + Math.abs(r) : '0';
  }

  /* ---------------------------------------------------------------- builders */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const warned = {};
  const warn = (kind, name) => { if (!warned[kind + name] && window.console) { warned[kind + name] = 1; console.warn('HCI: no ' + kind + ' named "' + name + '"'); } };
  const a11y = label => label ? ' role="img" aria-label="' + esc(label) + '"' : ' aria-hidden="true"';

  function icon(name, cls, label) {
    const body = I[name];
    if (!body) { warn('icon', name); return ''; }
    return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" focusable="false"' + a11y(label) + '>' + body + '</svg>';
  }

  function art(name, cls, label) {
    const body = A[name] || A[ALIAS[name]];
    if (!body) { warn('illustration', name); return art('unsure', cls, label); }
    return '<svg class="art' + (cls ? ' ' + cls : '') + '" viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" focusable="false"' + a11y(label) + '>' + body + '</svg>';
  }

  /* Check badge for chips, picture tiles and sensation rows (brand.css shows it only when selected). */
  function tick(cls) { return '<span class="' + (cls || 'tick') + '" aria-hidden="true">' + icon('check') + '</span>'; }

  /* Progress ring(s). HCI.ring({value: .84}) or several concentric rings:
   * HCI.ring({size: 120, stroke: 12, gap: 4, rings: [{value: .84, color: 'grad'}, {value: .6, color: 'var(--sky)', track: 'var(--sky-100)'}],
   *           center: '<b class="ring-value">84%</b><span class="ring-label">of goal</span>', label: '84% of this week\'s goal'})
   * value is 0..1 (clamped). color: any CSS colour, or 'grad' for the violet-to-sky gradient. */
  let ringSeq = 0;
  function ring(o) {
    o = o || {};
    const size = o.size || 120, sw = o.stroke || 12, gap = o.gap == null ? 4 : o.gap;
    const rings = o.rings || [{ value: o.value || 0, color: o.color, track: o.track }];
    let defs = '', body = '';
    rings.forEach((r, i) => {
      const rad = size / 2 - sw / 2 - i * (sw + gap);
      if (rad <= 0) return;
      const c = 2 * Math.PI * rad, v = Math.max(0, Math.min(1, Number(r.value) || 0));
      let color = r.color || 'var(--violet)';
      if (color === 'grad') {
        const id = 'hcring' + (++ringSeq);
        defs += '<linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3AA6F2"/><stop offset="1" stop-color="#6246EA"/></linearGradient>';
        color = 'url(#' + id + ')';
      }
      const track = r.track || 'var(--violet-100)';
      body += '<circle class="ring-track" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + rad.toFixed(2) + '" stroke-width="' + sw + '" style="stroke:' + track + '"/>';
      if (v > 0) body += '<circle class="ring-bar" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + rad.toFixed(2) + '" stroke-width="' + sw + '" style="stroke:' + color + '" stroke-dasharray="' + (c * v).toFixed(2) + ' ' + c.toFixed(2) + '"/>';
    });
    const svg = '<svg viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true" focusable="false">' + (defs ? '<defs>' + defs + '</defs>' : '') + body + '</svg>';
    return '<div class="ring' + (o.cls ? ' ' + o.cls : '') + '" style="--size:' + size + 'px"' + (o.label ? ' role="img" aria-label="' + esc(o.label) + '"' : '') + '>' + svg +
      (o.center ? '<div class="ring-center"' + (o.label ? ' aria-hidden="true"' : '') + '>' + o.center + '</div>' : '') + '</div>';
  }

  /* Keeps a styled <input type="range" class="range"> filled up to its thumb (sets --fill). */
  function fillRange(input) {
    if (!input || input._hcFill) return;
    const set = () => {
      const min = Number(input.min || 0), max = Number(input.max || 100), v = Number(input.value);
      input.style.setProperty('--fill', (max > min ? ((v - min) / (max - min)) * 100 : 0) + '%');
    };
    input.addEventListener('input', set); input._hcFill = true; set();
  }

  window.HCI = Object.freeze({
    icon, art, tick, ring, fillRange, signed,
    sense: Object.freeze(SENSE),
    senseOf: v => SENSE.find(s => s.v === Math.max(-3, Math.min(3, Math.round(Number(v))))) || null,
    iconNames: Object.freeze(Object.keys(I)),
    artNames: Object.freeze(Object.keys(A).filter(k => !ALIAS[k]))
  });
})();
