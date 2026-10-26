/* HomePulse (SWITCH home comfort study) - the app in English and Welsh (Cymraeg). Loaded after icons.js and before
 * questions.js, game.js and app.js.
 *
 * The English words stay in the code where they are used, exactly as before; tr('English text', {vars}) gives the
 * text of the language in use. CY (below) maps each English text to its Welsh; a text with no Welsh shows in
 * English (and is listed in I18N.missing for the tests). Placeholders are {name} in both languages; the values
 * given are put in as they are (HTML allowed: the callers escape what was typed).
 * Plurals: trn(n, '{n} point', '{n} points', vars) chooses the English form by n; the Welsh entry is under the key
 * '{n} point|{n} points' and is one text, or an object of forms by Intl.PluralRules('cy') category (zero, one, two,
 * few, many, other: 2 takes the soft mutation, 3 and 6 the aspirate one, as when the number is read out).
 * Option lists (questions.js, icons.js, app.js) are handed over once with register({ ACTS, ROOMS, ... }) and relabelled
 * in place for the language: stored answer ids never change, only the words. A Welsh text for one list only (the same English word, different Welsh answers) is keyed 'LIST:English'.
 * The language: switch_lang on this device ('en' | 'cy'); for someone not signed in, ?lang=cy|en (the study page's
 * Join and Sign in links) or a Welsh browser; otherwise English (signed in: English until the profile arrives). The
 * account keeps it too (participants.lang); see app.js "the language" for which one wins. */
const LANG_KEY = 'switch_lang';
let LANG = 'en';
const I18N = (() => {
  const ok = l => l === 'cy' || l === 'en' ? l : null;
  const store = { get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }, set(k, v){ try{ localStorage.setItem(k, v); }catch(e){} } };
  const missing = new Set();
  const fill = (s, v) => v ? String(s).replace(/\{(\w+)\}/g, (m, k) => k in v ? String(v[k]) : m) : String(s);
  const cyRules = (() => { try{ return new Intl.PluralRules('cy'); }catch(e){ return null; } })();
  /* the Welsh plural category of n, by CLDR: 0 zero, 1 one, 2 two, 3 few, 6 many, everything else other */
  const cat = n => { n = Math.abs(Math.round(Number(n) || 0)); if(cyRules) try{ return cyRules.select(n); }catch(e){}
    return n === 0 ? 'zero' : n === 1 ? 'one' : n === 2 ? 'two' : n === 3 ? 'few' : n === 6 ? 'many' : 'other'; };
  const form = (e, n) => e && typeof e === 'object' ? (e[cat(n)] ?? e.other) : e;
  /* A key may carry a marker the English never shows: 'seg:' (the short form for the race's period buttons) and
   * ':vowel' (the Welsh "ac" before a vowel). */
  const plain = s => String(s).replace(/^seg:/, '').replace(/:vowel$/, '');
  function t(s, v){
    if(s == null) return '';
    if(LANG !== 'cy') return fill(plain(s), v);
    const w = CY[s];
    if(w == null){ if(String(s).trim() && /[A-Za-z]{2}/.test(s)) missing.add(String(s)); return fill(plain(s), v); }
    return fill(w, v);
  }
  /* plural: '{n}' is n formatted for the language (1,080) unless vars give n */
  function tn(n, one, other, v){
    const vars = Object.assign({ n: numf(n) }, v || {});
    if(LANG !== 'cy') return fill(Number(n) === 1 ? one : other, vars);
    const e = CY[one + '|' + other];
    if(e == null){ missing.add(one + '|' + other); return fill(Number(n) === 1 ? one : other, vars); }
    return fill(form(e, n), vars);
  }
  const numf = n => { const x = Math.round(Number(n) || 0); try{ return x.toLocaleString(LANG === 'cy' ? 'cy' : 'en-GB'); }catch(e){ return String(x); } };
  /* 1st 2nd 3rd 4th / 1af 2il 3ydd 4ydd 5ed 6ed 7fed 8fed 9fed 10fed 11eg 12fed ... (digits with the Welsh endings) */
  const CY_ORD = { 1:'af', 2:'il', 3:'ydd', 4:'ydd', 5:'ed', 6:'ed', 7:'fed', 8:'fed', 9:'fed', 10:'fed', 11:'eg', 12:'fed', 13:'eg', 14:'eg',
    15:'fed', 16:'eg', 17:'eg', 18:'fed', 19:'eg', 20:'fed', 40:'fed', 50:'fed', 60:'fed', 80:'fed', 100:'fed' };
  function ordinal(n){
    n = Math.round(Number(n) || 0);
    if(LANG === 'cy') return n + (CY_ORD[n] || (n > 20 && n < 100 ? 'ain' : 'fed'));
    const t2 = n % 100; return n + ((t2 >= 11 && t2 <= 13) ? 'th' : ({1:'st', 2:'nd', 3:'rd'}[n % 10] || 'th'));
  }
  /* day and month names: Intl's Welsh where the browser has it, else the same words from here */
  const EN_D = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const EN_M = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const CY_D = ['Dydd Sul','Dydd Llun','Dydd Mawrth','Dydd Mercher','Dydd Iau','Dydd Gwener','Dydd Sadwrn'];
  const CY_DS = ['Sul','Llun','Maw','Mer','Iau','Gwe','Sad'];
  const CY_M = ['Ionawr','Chwefror','Mawrth','Ebrill','Mai','Mehefin','Gorffennaf','Awst','Medi','Hydref','Tachwedd','Rhagfyr'];
  const CY_MS = ['Ion','Chw','Maw','Ebr','Mai','Meh','Gor','Awst','Medi','Hyd','Tach','Rhag'];
  const intlCy = (() => { try{ return Intl.DateTimeFormat.supportedLocalesOf(['cy']).length > 0; }catch(e){ return false; } })();
  const fmtCy = (o, d) => { try{ return new Intl.DateTimeFormat('cy', o).format(d); }catch(e){ return null; } };
  /* the weekday of d (a Date): long 'Monday' / 'Dydd Llun' */
  const dayName = d => LANG === 'cy' ? (intlCy && fmtCy({ weekday:'long' }, d)) || CY_D[d.getDay()] : EN_D[d.getDay()];
  /* the weekday's one-letter mark for the week strip: M T W T F S S / Ll M M I G S S */
  const dayInitial = d => LANG === 'cy' ? ['S','Ll','M','M','I','G','S'][d.getDay()] : EN_D[d.getDay()][0];
  /* "on Monday" inside a sentence: 'on Monday' / 'ddydd Llun' */
  const onDay = d => LANG === 'cy' ? 'ddydd ' + CY_D[d.getDay()].slice(5) : 'on ' + EN_D[d.getDay()];
  /* month i (0-11), long or short: 'October' 'Oct' / 'Hydref' 'Hyd' */
  const monthName = (i, short) => {
    if(LANG === 'cy'){ const d = new Date(2026, i, 15); return (intlCy && fmtCy({ month: short ? 'short' : 'long' }, d)) || (short ? CY_MS : CY_M)[i]; }
    return short ? EN_M[i].slice(0, 3) : EN_M[i];
  };
  /* The option lists, relabelled in place for the language (the English kept in o.__en): the fields of each list
   * that hold words. 'obj' maps (id -> words) are relabelled by value. */
  const FIELDS = {
    ACTS:['n'], ROOMS:['n'], TP:['n'], TA:['n','s'], AIR:['n','s','k'], SUN:['n','s'], HEAT:['n','k'], HEAT_FOR:['n','h','k'], WALL:['n'],
    ACTIONS:['n','q'], ACTION_BOXES:['n'], NOTES:['n','q'], NOTE_BOXES:['n'], HEAT_OTHER:['n'],
    GENDERS:['n'], SENSITIVITY:['n'], HOME_TYPES:['n','h'], FLAT_POS:['n'], TENURE:['n','h'], YEAR_BUILT:['n'], FLOORS:['h'], EPC:['n'],
    BED_SHARE:['n'], MAIN_HEATING:['n','h','k'], OTHER_HEATERS:['n','k'], HEAT_PATTERN:['n','h'], CONTROLS:['n','h'], WALL_INS:['n','h'],
    LOFT:['n','h'], GLAZING:['n','h'], WINDOWS_OPEN:['n','h'], DAMP:['n'], FACING:['n'], TSV:['w'], GARMENTS:['n','s'], GARMENT_GROUPS:['n'],
    REG_STEPS:['t']
  };
  const MAPS = ['TA_OLD', 'HEAT_FOR_OLD', 'QNAME'];
  const REG = {};
  const lookup = (name, en) => { if(LANG !== 'cy' || typeof en !== 'string') return en; const w = CY[name + ':' + en] ?? CY[en]; if(w == null){ if(/[A-Za-z]{2}/.test(en)) missing.add(en); return en; } return w; };
  function relabel(){
    Object.keys(REG).forEach(name => {
      const x = REG[name];
      if(MAPS.includes(name)){
        if(!x.__en) Object.defineProperty(x, '__en', { value: Object.assign({}, x), enumerable:false });
        Object.keys(x.__en).forEach(k => { x[k] = lookup(name, x.__en[k]); });
        return;
      }
      const fields = FIELDS[name] || ['n'];
      (Array.isArray(x) ? x : [x]).forEach(o => { if(!o || typeof o !== 'object') return;
        if(!o.__en){ Object.defineProperty(o, '__en', { value:{}, enumerable:false }); fields.forEach(f => { if(typeof o[f] === 'string') o.__en[f] = o[f]; }); }
        Object.keys(o.__en).forEach(f => { o[f] = lookup(name, o.__en[f]); });
      });
    });
  }
  /* app.js hands the lists over once, by name: register({ ACTS, ROOMS, ... }) */
  function register(map){ Object.assign(REG, map); relabel(); }
  /* the English words of a relabelled option (to build an English key, e.g. 'Outside wall felt ' + en(wall, 'n')) */
  const en = (o, f) => o && o.__en && f in o.__en ? o.__en[f] : o ? o[f] : undefined;
  /* the language the app opens in: for someone not signed in, ?lang= (the study page), then this device's choice,
   * then the browser's language; for someone signed in, this device's choice, else English until their profile
   * arrives with the account's language (so nobody sees Welsh, then English) */
  function initial(signedIn){
    const q = (() => { try{ return ok((new URL(location.href).searchParams.get('lang') || '').toLowerCase()); }catch(e){ return null; } })();
    const saved = ok(store.get(LANG_KEY));
    if(q && !signedIn) return q;
    if(saved) return saved;
    if(signedIn) return 'en';
    const b = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    return /^cy\b/i.test(b) ? 'cy' : 'en';
  }
  const listeners = [];
  /* switches the language: kept on this device, the page's lang attribute and title, the lists relabelled, and the
   * service worker told (for notification texts it has to make up itself) */
  function set(l){
    l = ok(l) || 'en';
    LANG = l; store.set(LANG_KEY, l);
    try{ document.documentElement.lang = l === 'cy' ? 'cy' : 'en-GB'; document.title = t('HomePulse · SWITCH home comfort check-in').replace(/HomePulse/g, (self.SWITCH_CONFIG || {}).appName || 'HomePulse'); }catch(e){}
    relabel();
    try{ if(self.caches) caches.open('switch-prefs').then(c => c.put('lang', new Response(l))).catch(() => {}); }catch(e){}
    listeners.forEach(f => { try{ f(l); }catch(e){} });
  }
  /* a runner's name: the database's English alias ("Red Kite 2"), in Welsh in the Welsh app ("Barcud Coch 2") */
  function alias(a){
    a = String(a || '');
    if(LANG !== 'cy') return a;
    const m = /^(.*?)(?:\s+(\d+))?$/.exec(a.trim()), w = ALIAS_CY[m[1]];
    return w ? w + (m[2] ? ' ' + m[2] : '') : a;
  }
  return { t, tn, ordinal, numf, dayName, dayInitial, onDay, monthName, relabel, register, en, initial, set, missing, cat, alias,
    onChange: f => listeners.push(f), get lang(){ return LANG; } };
})();
const tr = I18N.t, trn = I18N.tn;
self.I18N = I18N;                                           // game.js reads it as a property of the page (its own scope)

/* ---------- Cymraeg: the Welsh of every English text, keyed by the English exactly as the code has it ----------
 * Terms (shared with the study page, switch/index.html): cofnod / cofnodion = check-in(s), cofnodi = to check in,
 * nodiadau atgoffa = reminders, hysbysiadau = notifications, Ras y Bae = the Bay Race, bathodynnau = badges,
 * pwynt / pwyntiau = points, nod dyddiol = daily goal, diwrnod nod = goal day, cod cyfranogwr = participant code,
 * rhif PIN = PIN, sgrin gartref = Home Screen, Mewngofnodi = Sign in, Gosodiadau = Settings, Dadwneud = Undo,
 * Ddim yn siŵr = Not sure. The phone's own labels (Share, Add to Home Screen, Allow, App info ...) stay in English:
 * iPhones have no Welsh, and most Android phones show them in English. */
const CY = {
  /* the page and the app's name */
  'HomePulse · SWITCH home comfort check-in': 'HomePulse · Cofnodi cysur yn y cartref SWITCH',
  'SWITCH &middot; Swansea University': 'SWITCH &middot; Prifysgol Abertawe',
  'SWITCH home comfort study': 'Astudiaeth SWITCH ar gysur yn y cartref',
  
  /* times and dates */
  'Today': 'Heddiw', 'Yesterday': 'Ddoe',
  '{day} at {time}': '{day} am {time}',
  'just now': 'gynnau fach',
  '{n} min ago': '{n} munud yn ôl',
  '{n} hour ago|{n} hours ago': '{n} awr yn ôl',
  'yesterday': 'ddoe',
  '{n} days ago': '{n} diwrnod yn ôl',
  '{n} second|{n} seconds': { one:'{n} eiliad', two:'{n} eiliad', other:'{n} eiliad' },
  '{m} min {s} s': '{m} mun {s} eil',
  'today at {time}': 'heddiw am {time}',
  'tomorrow at {time}': 'yfory am {time}',
  '{time} tomorrow': '{time} yfory',
  'Good morning': 'Bore da', 'Good afternoon': 'Prynhawn da', 'Good evening': 'Noswaith dda',
  
  /* starting a check-in */
  'Loading your home profile&hellip;': 'Wrthi’n llwytho proffil eich cartref&hellip;',
  'Your home profile has not loaded yet': 'Dydy proffil eich cartref ddim wedi llwytho eto',
  'Check the connection, then try again': 'Gwiriwch y cysylltiad, yna rhowch gynnig arall arni',
  'Not yet': 'Dim eto',
  'Come back at {time}': 'Dewch yn ôl am {time}',
  'Your next check-in opens in {n} minute|Your next check-in opens in {n} minutes': { two:'Bydd eich cofnod nesaf yn agor ymhen {n} funud', other:'Bydd eich cofnod nesaf yn agor ymhen {n} munud' },
  'You checked in at {time}. Check-ins open {gap} minutes after the last one, on any of your devices, so each one tells the study something new about your day.':
    'Fe gofnodoch chi am {time}. Mae cofnodion yn agor {gap} munud ar ôl yr un diwethaf, ar unrhyw un o’ch dyfeisiau, fel bod pob un yn dweud rhywbeth newydd wrth yr astudiaeth am eich diwrnod.',
  'OK': 'Iawn', 'Close': 'Cau',

  /* the sync line */
  'stored on this phone only': 'wedi’u cadw ar y ffôn hwn yn unig',
  '{n} waiting to send': '{n} yn aros i’w hanfon',
  'all check-ins sent': 'pob cofnod wedi’i anfon',

  /* the reminder status on Today */
  'Paused until you&rsquo;re back': 'Wedi oedi nes byddwch chi’n ôl',
  'Back home? Tap Check in now.': 'Yn ôl gartref? Tapiwch Cofnodi nawr.',
  ' Otherwise reminders resume {when}.': ' Fel arall, bydd nodiadau atgoffa’n ailddechrau {when}.',
  'Paused until {until}': 'Wedi oedi tan {until}',
  'No reminders on this phone while you&rsquo;re out.': 'Dim nodiadau atgoffa ar y ffôn hwn tra byddwch chi allan.',
  ' Next one {when}.': ' Yr un nesaf {when}.',
  'The study has ended': 'Mae’r astudiaeth wedi dod i ben',
  'Reminders have stopped. Thank you for taking part.': 'Mae’r nodiadau atgoffa wedi dod i ben. Diolch am gymryd rhan.',
  'Next reminder {when}': 'Nodyn atgoffa nesaf {when}',
  'Next check-in window {when}': 'Cyfnod cofnodi nesaf {when}',
  'Reminders start once the study database is connected': 'Bydd nodiadau atgoffa’n dechrau pan fydd cronfa ddata’r astudiaeth wedi’i chysylltu',
  'Reminders have stopped': 'Mae’r nodiadau atgoffa wedi stopio',
  'Turn on reminders': 'Troi nodiadau atgoffa ymlaen',
  'Tap to turn them on again': 'Tapiwch i’w troi ymlaen eto',
  'A nudge once an hour while you&rsquo;re at home': 'Hwb bach unwaith yr awr tra byddwch chi gartref',
  'Open this page in Safari': 'Agorwch y dudalen hon yn Safari',
  'Add the app to your Home Screen': 'Ychwanegwch yr ap at eich sgrin gartref',
  'Reminders need it on your Home Screen': 'Mae angen yr ap ar eich sgrin gartref ar gyfer nodiadau atgoffa',
  'Reminders are blocked': 'Mae nodiadau atgoffa wedi’u rhwystro',
  'Allow notifications to turn them on': 'Caniatewch hysbysiadau i’w troi ymlaen',
  'Reminders aren&rsquo;t available here': 'Does dim nodiadau atgoffa ar gael yma',
  'They need iOS 16.4 or later': 'Mae angen iOS 16.4 neu fersiwn mwy diweddar',
  'Use Chrome on Android or Safari on iPhone': 'Defnyddiwch Chrome ar Android neu Safari ar iPhone',
  'Every day {h}': 'Bob dydd {h}',
  'Weekdays {wd} &middot; Weekends {we}': 'Dyddiau’r wythnos {wd} &middot; Penwythnosau {we}',

  /* what comes first on a phone */
  'First, open this page in Safari': 'Yn gyntaf, agorwch y dudalen hon yn Safari',
  'First, add {app} to your Home Screen': 'Yn gyntaf, ychwanegwch {app} at eich sgrin gartref',
  'First, allow notifications': 'Yn gyntaf, caniatewch hysbysiadau',
  'First, turn on notifications': 'Yn gyntaf, trowch hysbysiadau ymlaen',
    'The link to {app}': 'Y ddolen i {app}',
  'Copy link': 'Copïo’r ddolen', 'Copied': 'Wedi’i chopïo', 'Now copy it': 'Nawr copïwch hi',

  /* iPhone and iPad: the Home Screen app */
  'Open <b>{app}</b> from your Home Screen, choose <b>I have registered before</b> and sign in with your email and the PIN you use here. Your check-ins come with you.':
    'Agorwch <b>{app}</b> o’ch sgrin gartref, dewiswch <b>Cymraeg</b>, yna <b>Rydw i wedi cofrestru o’r blaen</b>, a mewngofnodwch gyda’ch e-bost a’r rhif PIN rydych chi’n ei ddefnyddio yma. Bydd eich cofnodion yn dod gyda chi.',
  'Open <b>{app}</b> from your Home Screen and join there (or sign in, if you have joined before).':
    'Agorwch <b>{app}</b> o’ch sgrin gartref, dewiswch <b>Cymraeg</b> ac ymunwch yno (neu mewngofnodwch, os ydych chi wedi ymuno o’r blaen).',
  'In Safari, tap the <b>Share</b> button {share}, then <b>Add to Home Screen</b> and <b>Add</b>.':
    'Yn Safari, tapiwch y botwm <b>Share</b> (Rhannu) {share}, yna <b>Add to Home Screen</b> ac <b>Add</b>.',
  'Open this page in <b>Safari</b>: tap <b>&middot;&middot;&middot;</b> or the share button and choose <b>Open in Safari</b> (or <b>Open in browser</b>). No such option? Copy the link below, open Safari and paste it into the address bar.':
    'Agorwch y dudalen hon yn <b>Safari</b>: tapiwch <b>&middot;&middot;&middot;</b> neu’r botwm rhannu a dewis <b>Open in Safari</b> (neu <b>Open in browser</b>). Dim opsiwn o’r fath? Copïwch y ddolen isod, agorwch Safari a’i gludo i’r bar cyfeiriad.',
  'Tap the <b>Share</b> button {share} in Safari&rsquo;s toolbar.': 'Tapiwch y botwm <b>Share</b> (Rhannu) {share} ym mar offer Safari.',
  'Choose <b>Add to Home Screen</b>, then <b>Add</b>.': 'Dewiswch <b>Add to Home Screen</b>, yna <b>Add</b>.',
  'No <b>Add to Home Screen</b>? This page may be open inside another app: copy the link and open it in Safari.':
    'Dim <b>Add to Home Screen</b>? Efallai fod y dudalen hon ar agor y tu mewn i ap arall: copïwch y ddolen a’i hagor yn Safari.',

  /* notifications: when they cannot be had, help, the card and the sheet */
  'Your phone couldn&rsquo;t switch on reminders. You can still check in this time. Please email {team} so we can help.':
    'Doedd eich ffôn ddim yn gallu troi nodiadau atgoffa ymlaen. Gallwch chi gofnodi y tro hwn o hyd. E-bostiwch {team} er mwyn i ni allu helpu.',
  'Notifications are blocked': 'Mae hysbysiadau wedi’u rhwystro',
  '{app} is not allowed to send notifications on this iPhone.': 'Dydy {app} ddim yn cael anfon hysbysiadau ar yr iPhone hwn.',
  '{app} is not allowed to send notifications on this iPad.': 'Dydy {app} ddim yn cael anfon hysbysiadau ar yr iPad hwn.',
  'Open <b>Settings</b>, then <b>Notifications</b>.': 'Agorwch <b>Settings</b> (Gosodiadau), yna <b>Notifications</b> (Hysbysiadau).',
  'Find <b>{app}</b> and turn on <b>Allow Notifications</b>.': 'Dewch o hyd i <b>{app}</b> a throi <b>Allow Notifications</b> ymlaen.',
  'Come back here and tap <b>I&rsquo;ve turned them on</b>.': 'Dewch yn ôl yma a thapio <b>Rydw i wedi’u troi ymlaen</b>.',
  '{app} is not allowed to send notifications on this phone.': 'Dydy {app} ddim yn cael anfon hysbysiadau ar y ffôn hwn.',
  'Touch and hold the <b>{app}</b> icon, then tap <b>App info</b> (or &#9432;).': 'Pwyswch a dal eicon <b>{app}</b>, yna tapiwch <b>App info</b> (neu &#9432;).',
  'Tap <b>Notifications</b> and turn them on.': 'Tapiwch <b>Notifications</b> a’u troi ymlaen.',
  'Using it in Chrome instead? Tap the icon to the left of the address, then <b>Permissions</b> (or <b>Site settings</b>) &rsaquo; <b>Notifications</b> &rsaquo; <b>Allow</b>.':
    'Yn ei ddefnyddio yn Chrome yn lle hynny? Tapiwch yr eicon i’r chwith o’r cyfeiriad, yna <b>Permissions</b> (neu <b>Site settings</b>) &rsaquo; <b>Notifications</b> &rsaquo; <b>Allow</b>.',
  'I&rsquo;ve turned them on': 'Rydw i wedi’u troi ymlaen',
  'On {dev}, notifications only work in the Home Screen app.': 'Ar {dev}, dim ond yn yr ap ar y sgrin gartref y mae hysbysiadau’n gweithio.',
  'iPhone and iPad': 'iPhone ac iPad', 'iPhone': 'iPhone', 'iPad': 'iPad',
  'Reminders don&rsquo;t work here': 'Dydy nodiadau atgoffa ddim yn gweithio yma',
  'Reminders from {app} need iOS&nbsp;16.4 or later, and this {dev} has an older version. You can still check in.':
    'Mae angen iOS&nbsp;16.4 neu fersiwn mwy diweddar ar gyfer nodiadau atgoffa {app}, ac mae fersiwn hŷn ar yr {dev} hwn. Gallwch chi gofnodi o hyd.',
  'This browser can&rsquo;t show reminders. You can still check in.': 'Dydy’r porwr hwn ddim yn gallu dangos nodiadau atgoffa. Gallwch chi gofnodi o hyd.',
  'On Android, opening this page in <b>Chrome</b> usually fixes it.': 'Ar Android, mae agor y dudalen hon yn <b>Chrome</b> fel arfer yn datrys hyn.',
  'Please email {team} so we can help.': 'E-bostiwch {team} er mwyn i ni allu helpu.',
  'On Android, open the app in Chrome. On iPhone, open it in Safari and add it to your Home Screen.':
    'Ar Android, agorwch yr ap yn Chrome. Ar iPhone, agorwch ef yn Safari a’i ychwanegu at eich sgrin gartref.',
  'Notifications have stopped': 'Mae hysbysiadau wedi stopio',
  'Turn on notifications': 'Troi hysbysiadau ymlaen',
  '{app} reminds you to check in, about once an hour while you&rsquo;re at home. The study needs them.':
    'Mae {app} yn eich atgoffa i gofnodi, tua unwaith yr awr tra byddwch chi gartref. Mae eu hangen ar yr astudiaeth.',
  '{app} reminds you to check in, about once an hour while you&rsquo;re at home. The study needs them, so on a phone or tablet check-ins start once they are on.':
    'Mae {app} yn eich atgoffa i gofnodi, tua unwaith yr awr tra byddwch chi gartref. Mae eu hangen ar yr astudiaeth, felly ar ffôn neu lechen bydd cofnodion yn dechrau pan fyddan nhw ymlaen.',
  '{days} to start with. You can change the hours in Settings.': '{days} i ddechrau. Gallwch chi newid yr oriau yn y Gosodiadau.',
  'Needed for the study': 'Angen ar gyfer yr astudiaeth',
  'Reminders couldn&rsquo;t be switched on': 'Doedd dim modd troi nodiadau atgoffa ymlaen',
  'You can try again now, or later from Today or Settings.': 'Gallwch chi roi cynnig arall arni nawr, neu wedyn o Heddiw neu’r Gosodiadau.',
  'Check in this time': 'Cofnodi y tro hwn', 'Try again': 'Rhoi cynnig arall arni', 'Not now': 'Dim nawr',
  'Turn on and check in': 'Troi ymlaen a chofnodi', 'Check in without them': 'Cofnodi hebddyn nhw', 'Check in anyway': 'Cofnodi beth bynnag',
  'To check in on this phone': 'I gofnodi ar y ffôn hwn', 'To check in on this tablet': 'I gofnodi ar y llechen hon',
  'Before you check in': 'Cyn i chi gofnodi',
  'Notifications are not on': 'Dydy hysbysiadau ddim ymlaen',
  'You can turn them on from Today or Settings': 'Gallwch chi eu troi ymlaen o Heddiw neu’r Gosodiadau',
  'Something went wrong, please try again.': 'Aeth rhywbeth o’i le, rhowch gynnig arall arni.',
  'Notifications are on': 'Mae hysbysiadau ymlaen',
  'Notifications are on. {days}; change the hours below.': 'Mae hysbysiadau ymlaen. {days}; newidiwch yr oriau isod.',
  'Notifications were not allowed. Tap the button again and choose <b>Allow</b>.': 'Chafodd hysbysiadau mo’u caniatáu. Tapiwch y botwm eto a dewis <b>Allow</b> (Caniatáu).',
  'Notifications are still blocked for {app}. Follow the steps above, then tap the button again.': 'Mae hysbysiadau’n dal wedi’u rhwystro ar gyfer {app}. Dilynwch y camau uchod, yna tapiwch y botwm eto.',
  'This browser could not ask about notifications. Please try again.': 'Doedd y porwr hwn ddim yn gallu holi am hysbysiadau. Rhowch gynnig arall arni.',
  'Reminders could not start on this phone. Close the app, open it again and try once more.': 'Doedd dim modd dechrau nodiadau atgoffa ar y ffôn hwn. Caewch yr ap, ei agor eto a rhoi cynnig arall arni.',
  'This phone&rsquo;s notification service did not answer. Please try again in a moment.': 'Wnaeth gwasanaeth hysbysiadau’r ffôn hwn ddim ateb. Rhowch gynnig arall arni mewn munud.',
  'This phone needs to sign in again first.': 'Mae angen i’r ffôn hwn fewngofnodi eto yn gyntaf.',
  'The study database did not accept this phone. Please contact the research team.': 'Wnaeth cronfa ddata’r astudiaeth ddim derbyn y ffôn hwn. Cysylltwch â’r tîm ymchwil.',
  'Reminders don&rsquo;t work in this browser. On Android use Chrome; on iPhone use Safari and add the app to your Home Screen.':
    'Dydy nodiadau atgoffa ddim yn gweithio yn y porwr hwn. Ar Android, defnyddiwch Chrome; ar iPhone, defnyddiwch Safari ac ychwanegwch yr ap at eich sgrin gartref.',
  'Too many phones are registered for reminders under your code. Please contact the research team.': 'Mae gormod o ffonau wedi’u cofrestru ar gyfer nodiadau atgoffa dan eich cod. Cysylltwch â’r tîm ymchwil.',
  'This phone could not be registered. Check the connection and try again.': 'Doedd dim modd cofrestru’r ffôn hwn. Gwiriwch y cysylltiad a rhowch gynnig arall arni.',

  /* Today: the goals, the week, the points */
  'days': 'diwrnod',
  '{w} of {wg} goal days this week, {t} of {g} check-ins today': '{w} o {wg} diwrnod nod yr wythnos hon, {t} o {g} cofnod heddiw',
  'above your goal, keep going!': 'uwchben eich nod, daliwch ati!',
  '{t} today': '{t} heddiw',
  'today &middot; goal met, more are welcome': 'heddiw &middot; nod wedi’i gyrraedd, mae croeso i fwy',
  '{t} of {g}': '{t} o {g}',
  'today so far': 'heddiw hyd yma',
  '{n}-day goal streak|{n}-day goal streak': { two:'Nod {n} ddiwrnod yn olynol', other:'Nod {n} diwrnod yn olynol' },
  'Best: {n} day|Best: {n} days': { two:'Gorau: {n} ddiwrnod', other:'Gorau: {n} diwrnod' },
  'No streak yet': 'Dim rhediad eto',
  '{g} check-ins in a day starts one': '{g} cofnod mewn diwrnod sy’n dechrau un',
  'Your goals': 'Eich nodau',
  '{w} of {wg} days': '{w} o {wg} diwrnod',
  'this week with {g} check-ins': 'yr wythnos hon â {g} cofnod',
  ' &middot; goal met': ' &middot; nod wedi’i gyrraedd',
  '{date}: {n} check-in|{date}: {n} check-ins': { two:'{date}: {n} gofnod', few:'{date}: {n} chofnod', many:'{date}: {n} chofnod', other:'{date}: {n} cofnod' },
  ', goal reached': ', nod wedi’i gyrraedd',
  'This week': 'Yr wythnos hon', '= daily goal': '= nod dyddiol',
  'Your points': 'Eich pwyntiau', 'this week': 'yr wythnos hon', 'this month': 'y mis hwn',   'points in all': 'pwynt i gyd',
  'Latest badge: {name}': 'Bathodyn diweddaraf: {name}',

  /* My check-ins: charts and the list */
  'Your charts appear here after a couple of check-ins.': 'Bydd eich siartiau’n ymddangos yma ar ôl cwpl o gofnodion.',
  'Sensation': 'Teimlad', 'Check-ins per day': 'Cofnodion y dydd', 'Preference': 'Dewis',
  '{n} check-in|{n} check-ins': { two:'{n} gofnod', few:'{n} chofnod', many:'{n} chofnod', other:'{n} cofnod' },
  'Cooler': 'Yn oerach', 'No change': 'Dim newid', 'Warmer': 'Yn gynhesach',
  'heating on': 'gwres ymlaen',
  'prefer cooler': 'eisiau bod yn oerach', 'prefer no change': 'dim newid', 'prefer warmer': 'eisiau bod yn gynhesach',
  'Check-in': 'Cofnod',
  'Show older check-ins': 'Dangos cofnodion hŷn',
  'Happy with the temperature': 'Yn hapus â’r tymheredd',
  'Would like to be <b>cooler</b>': 'Eisiau bod <b>yn oerach</b>',
  'Would like to be <b>warmer</b>': 'Eisiau bod <b>yn gynhesach</b>',
  'Thermostat showed {x}': 'Roedd y thermostat yn dangos {x}',
  'Could not reach an outside wall': 'Doedd dim modd cyrraedd wal allanol',
  'Outside wall felt cold': 'Roedd y wal allanol yn teimlo’n oer',
  'Outside wall felt cool': 'Roedd y wal allanol yn teimlo’n oeraidd',
  'Outside wall felt neither cold nor warm': 'Doedd y wal allanol ddim yn teimlo’n oer nac yn gynnes',
  'Outside wall felt warm': 'Roedd y wal allanol yn teimlo’n gynnes',
  'Last 30 min: {list}': 'Y 30 munud diwethaf: {list}',
  'Last 30 min: did none of these': 'Y 30 munud diwethaf: dim un o’r rhain',
  'Last 30 min: nothing to note': 'Y 30 munud diwethaf: dim byd i’w nodi',

  /* the review */
  'Not answered yet': 'Heb ei ateb eto',
  'Edit {x}': 'Golygu {x}', 'Edit': 'Golygu',
  'Feeling': 'Teimlad', 'Would like to be': 'Eisiau bod', 'Conditions': 'Amodau', 'Wearing': 'Yn gwisgo', 'Doing': 'Yn gwneud',
  'Room': 'Ystafell', 'Air': 'Aer', 'Sun': 'Haul', 'Heating': 'Gwres', 'On for': 'Ymlaen ers',   'Outside wall': 'Wal allanol', 'You did, last 30 minutes': 'Beth wnaethoch chi, y 30 munud diwethaf',
  'You had or felt, last 30 minutes': 'Beth gawsoch chi neu deimloch chi, y 30 munud diwethaf',
  'None of these': 'Dim un o’r rhain',
  'You': 'Chi',

  /* loading notices */
  'Couldn&rsquo;t load your check-ins from your other devices.': 'Methu llwytho’ch cofnodion o’ch dyfeisiau eraill.',
  'Couldn&rsquo;t load the Bay Race.': 'Methu llwytho Ras y Bae.',
  ' You seem to be offline.': ' Mae’n ymddangos eich bod chi all-lein.',
  ' Trying again&hellip;': ' Rhoi cynnig arall arni&hellip;',
  'Just for you': 'I chi yn unig', 'My badges': 'Fy mathodynnau', 'The Bay Race': 'Ras y Bae', 'How points work': 'Sut mae pwyntiau’n gweithio',

  /* the home profile, read back */
  'Not sure': 'Ddim yn siŵr', 'Not answered': 'Heb ei ateb',
  'Name': 'Enw', 'Email': 'E-bost', 'Gender': 'Rhywedd', 'Year of birth': 'Blwyddyn geni', 'Height': 'Taldra', 'Weight': 'Pwysau',
  'Most like you': 'Yn debycaf i chi', 'About you': 'Amdanoch chi', 'Your area and home': 'Eich ardal a’ch cartref', 'Postcode area': 'Ardal cod post',
  'Home': 'Cartref', 'Floor': 'Llawr', 'Tenure': 'Deiliadaeth', 'Age and size': 'Oed a maint', 'Built': 'Adeiladwyd', 'Floors': 'Lloriau',
  '4 or more': '4 neu fwy', 'Bedrooms': 'Ystafelloedd gwely', 'Floor area': 'Arwynebedd llawr', 'EPC rating': 'Sgôr EPC',
  'Who lives here': 'Pwy sy’n byw yma', 'Adults': 'Oedolion', 'Children': 'Plant', 'Pets': 'Anifeiliaid anwes', 'Bedroom': 'Ystafell wely',
  'Main heating': 'Prif wres', 'Other heaters': 'Gwresogyddion eraill', 'How it&rsquo;s used': 'Sut mae’n cael ei ddefnyddio',
  'Heating controls': 'Rheolyddion gwres', 'Controls': 'Rheolyddion', 'Usual setting': 'Gosodiad arferol',
  'Walls, roof and windows': 'Waliau, to a ffenestri', 'Walls': 'Waliau', 'Loft insulation': 'Inswleiddio’r atig', 'Glazing': 'Gwydr',
  'Windows open': 'Agor ffenestri', 'Damp or mould': 'Tamprwydd neu lwydni', 'Your bedroom': 'Eich ystafell wely',
  'Window faces': 'Mae’r ffenestr yn wynebu', 'Bedroom is on the': 'Ochr yr ystafell wely',

  /* the welcome screen */
  'Every home has a pulse: the warmth you feel inside it. <b>{app}</b> listens, one moment at a time, to help Swansea University shape comfortable, low-carbon homes across Wales.':
    'Mae gan bob cartref ei guriad ei hun: y cynhesrwydd rydych chi’n ei deimlo ynddo. Mae <b>{app}</b> yn gwrando, fesul eiliad, er mwyn helpu Prifysgol Abertawe i lunio cartrefi cyfforddus, carbon isel ledled Cymru.',
  'How does your home feel?': 'Sut mae’ch cartref yn teimlo?',
  'Short check-ins while you&rsquo;re at home teach the study what comfortable means for you. Joining takes about 5 minutes and happens once.':
    'Mae cofnodion byr tra byddwch chi gartref yn dysgu’r astudiaeth beth mae cyfforddus yn ei olygu i chi. Mae ymuno’n cymryd tua 5 munud, a dim ond unwaith.',
  'I&rsquo;m new here': 'Rydw i’n newydd yma', 'Carry on where you left off': 'Parhau o’r man lle gadawoch chi', 'Join the study': 'Ymuno â’r astudiaeth',
  'I have registered before': 'Rydw i wedi cofrestru o’r blaen', 'Sign in with my email and PIN': 'Mewngofnodi gyda fy e-bost a’m rhif PIN',
  '<b>Local mode.</b> The study database is not connected, so everything stays in this browser.': '<b>Modd lleol.</b> Dydy cronfa ddata’r astudiaeth ddim wedi’i chysylltu, felly mae popeth yn aros yn y porwr hwn.',
  'Questions about the study? Email {team}': 'Cwestiynau am yr astudiaeth? E-bostiwch {team}',
  'About the study': 'Am yr astudiaeth',
  'Your answers so far are saved on this phone. Tap “I’m new here” to carry on.': 'Mae’ch atebion hyd yma wedi’u cadw ar y ffôn hwn. Tapiwch “Rydw i’n newydd yma” i barhau.',
  'You’re signed out on this phone.': 'Rydych chi wedi allgofnodi ar y ffôn hwn.',
  'This registration was not found. Please join again or contact the research team.': 'Doedd dim modd dod o hyd i’r cofrestriad hwn. Ymunwch eto, neu cysylltwch â’r tîm ymchwil.',

  /* the iPhone install screen */
  'Before you start': 'Cyn i chi ddechrau',
  'Open {app} in Safari': 'Agor {app} yn Safari',
  'Add {app} to your Home Screen first': 'Ychwanegwch {app} at eich sgrin gartref yn gyntaf',
  'On {dev}, reminders only work in the Home Screen app, and the study needs them. The app keeps its own copy of your answers, separate from Safari, so join or sign in there.':
    'Ar {dev}, dim ond yn yr ap ar y sgrin gartref y mae nodiadau atgoffa’n gweithio, ac mae eu hangen ar yr astudiaeth. Mae’r ap yn cadw ei gopi ei hun o’ch atebion, ar wahân i Safari, felly ymunwch neu fewngofnodi yno.',
  'How to get there': 'Sut i gyrraedd yno', 'Three quick steps': 'Tri cham cyflym',
  'Joined before? In the Home Screen app, choose <b>I have registered before</b> and sign in with your email and PIN. Forgot your PIN? Email {team}.':
    'Wedi ymuno o’r blaen? Yn yr ap ar y sgrin gartref, dewiswch <b>Rydw i wedi cofrestru o’r blaen</b> a mewngofnodwch gyda’ch e-bost a’ch rhif PIN. Wedi anghofio’ch rhif PIN? E-bostiwch {team}.',

  /* signing in */
  'Sign in again': 'Mewngofnodi eto', 'Please sign in again': 'Mewngofnodwch eto',
  'This phone was signed out. Your check-ins are safe: sign in with your email and your PIN.': 'Cafodd y ffôn hwn ei allgofnodi. Mae’ch cofnodion yn ddiogel: mewngofnodwch gyda’ch e-bost a’ch rhif PIN.',
  'One more step': 'Un cam arall', 'Sign in with your email and a PIN': 'Mewngofnodwch gyda’ch e-bost a rhif PIN',
  '{app} now keeps your check-ins on every phone and tablet you use. Enter the email you registered with and your 4-digit PIN: the one you chose before, or a new one if you have not chosen one yet.':
    'Mae {app} bellach yn cadw’ch cofnodion ar bob ffôn a llechen rydych chi’n eu defnyddio. Rhowch yr e-bost y gwnaethoch chi gofrestru ag ef a’ch rhif PIN 4 digid: yr un a ddewisoch chi o’r blaen, neu un newydd os nad ydych chi wedi dewis un eto.',
  'Welcome back': 'Croeso nôl', 'Sign in': 'Mewngofnodi',
  'With the email you joined with and your 4-digit PIN. All your check-ins come with you.': 'Gyda’r e-bost y gwnaethoch chi ymuno ag ef a’ch rhif PIN 4 digid. Bydd eich holl gofnodion yn dod gyda chi.',
  'Your participant code': 'Eich cod cyfranogwr', 'e.g. P07': 'e.e. P07',
  'You have not chosen a PIN yet (or the research team has reset it), so the study asks for your participant code once. It is at the bottom of the Today screen in the old app, or of any phone or tablet where you are signed in. Or ask the research team at {team}.':
    'Dydych chi ddim wedi dewis rhif PIN eto (neu mae’r tîm ymchwil wedi’i ailosod), felly mae’r astudiaeth yn gofyn am eich cod cyfranogwr unwaith. Mae ar waelod sgrin Heddiw yn yr hen ap, neu ar unrhyw ffôn neu lechen lle rydych chi wedi mewngofnodi. Neu gofynnwch i’r tîm ymchwil yn {team}.',
  'Choose a 4-digit PIN': 'Dewiswch rif PIN 4 digid', 'Your PIN, or choose one': 'Eich rhif PIN, neu dewiswch un', 'PIN': 'Rhif PIN',
  'Four digits you will remember. Please don&rsquo;t use your bank card PIN.': 'Pedwar digid y byddwch chi’n eu cofio. Peidiwch â defnyddio PIN eich cerdyn banc.',
  'Continue': 'Parhau',
  'Forgot your PIN? Email {team} and the research team will reset it.': 'Wedi anghofio’ch rhif PIN? E-bostiwch {team} a bydd y tîm ymchwil yn ei ailosod.',
  'Not you? Start again': 'Ddim chi? Dechrau eto', 'I haven&rsquo;t joined yet': 'Dydw i ddim wedi ymuno eto',
  'Thanks!': 'Diolch!', 'Thanks, {name}!': 'Diolch, {name}!',
  'The research team will confirm your place, usually within a day. You can check in as soon as that&rsquo;s done.':
    'Bydd y tîm ymchwil yn cadarnhau eich lle, fel arfer o fewn diwrnod. Gallwch chi gofnodi cyn gynted ag y bydd hynny wedi’i wneud.',
  'Check again': 'Gwirio eto', 'Your participant code is {code}': 'Eich cod cyfranogwr yw {code}',

  /* Today */
  'Last one {ago}': 'Yr un diwethaf {ago}',
  'Takes under a minute': 'Llai na munud',
  'Next check-in at {time}': 'Cofnod nesaf am {time}',
  'They open {gap} minutes after the last one &middot; {last}': 'Maen nhw’n agor {gap} munud ar ôl yr un diwethaf &middot; {last}',
  'Check in now': 'Cofnodi nawr',
  'Marina to Mumbles': 'O’r Marina i’r Mwmbwls', 'The race is not available right now.': 'Dydy’r ras ddim ar gael ar hyn o bryd.',
  'Your data': 'Eich data', 'My check-ins': 'Fy nghofnodion', 'No check-ins yet': 'Dim cofnodion eto',
  'Your charts and history appear here after your first check-in.': 'Bydd eich siartiau a’ch hanes yn ymddangos yma ar ôl eich cofnod cyntaf.',
  '{n} check-in, from all your devices. Tap one for the details.|{n} check-ins, from all your devices. Tap one for the details.':
    { two:'{n} gofnod, o’ch holl ddyfeisiau. Tapiwch un i weld y manylion.', few:'{n} chofnod, o’ch holl ddyfeisiau. Tapiwch un i weld y manylion.',
      many:'{n} chofnod, o’ch holl ddyfeisiau. Tapiwch un i weld y manylion.', other:'{n} cofnod, o’ch holl ddyfeisiau. Tapiwch un i weld y manylion.' },

  /* Settings */
  'Not filled in yet': 'Heb ei lenwi eto',
  '{n} bedroom|{n} bedrooms': '{n} ystafell wely',
  'Your app': 'Eich ap', 'Settings': 'Gosodiadau', 'My home': 'Fy nghartref', 'Your home profile': 'Proffil eich cartref',
  'Your account': 'Eich cyfrif', 'Participant code': 'Cod cyfranogwr', 'In the race': 'Yn y ras', 'Check-ins': 'Cofnodion',
  '<b>Local mode.</b> The study database is not connected: check-ins stay on this phone and nothing is sent.':
    '<b>Modd lleol.</b> Dydy cronfa ddata’r astudiaeth ddim wedi’i chysylltu: mae cofnodion yn aros ar y ffôn hwn a does dim yn cael ei anfon.',
  'Not you? Sign out': 'Ddim chi? Allgofnodi', 'About': 'Ynghylch',
  '{app} &middot; {study} &middot; Swansea University &middot; version {v}': '{app} &middot; {study} &middot; Prifysgol Abertawe &middot; fersiwn {v}',
  'Questions? Email {team}.': 'Cwestiynau? E-bostiwch {team}.',
  'The app speaks English and Welsh. Your choice is kept with your account, so your other phones and your reminders follow it.':
    'Mae’r ap yn siarad Cymraeg a Saesneg. Mae’ch dewis yn cael ei gadw gyda’ch cyfrif, felly bydd eich ffonau eraill a’ch nodiadau atgoffa’n ei ddilyn.',
  'Saved on this phone. It reaches your account next time you are online.': 'Wedi’i gadw ar y ffôn hwn. Bydd yn cyrraedd eich cyfrif y tro nesaf y byddwch chi ar-lein.',
  'It appears here once the study has it.': 'Bydd yn ymddangos yma pan fydd gan yr astudiaeth ef.',
  'As you described it. Tap Edit to change a section.': 'Fel y gwnaethoch chi ei ddisgrifio. Tapiwch Golygu i newid adran.',
  'Moved home? Please email {team} as well, so the research team knows.': 'Wedi symud tŷ? E-bostiwch {team} hefyd, er mwyn i’r tîm ymchwil wybod.',

  /* are you at home, and away */
  'Before we start': 'Cyn i ni ddechrau', 'Are you at home right now?': 'Ydych chi gartref ar hyn o bryd?',
  'Then a few quick questions about how you feel.': 'Yna ychydig o gwestiynau cyflym am sut rydych chi’n teimlo.',
  'Yes, for over an hour': 'Ydw, ers dros awr', 'Let&rsquo;s do the check-in': 'Gadewch i ni gofnodi', 'Yes, I just got in': 'Ydw, newydd gyrraedd',
  'No, I&rsquo;m out': 'Nac ydw, dw i allan', 'Pause reminders for a while': 'Oedi nodiadau atgoffa am ychydig',
  'Until {until}': 'Tan {until}', 'Out and about': 'Allan', 'When should we check again?': 'Pryd ddylen ni holi eto?',
  'This phone stays quiet until then.': 'Bydd y ffôn hwn yn dawel tan hynny.',
  'In an hour': 'Ymhen awr', 'In three hours': 'Ymhen tair awr', 'In five hours': 'Ymhen pum awr', 'This evening': 'Heno', 'Until 19:00': 'Tan 19:00',
  'I&rsquo;ll tell you when I&rsquo;m back': 'Fe ddyweda i wrthoch chi pan fydda i’n ôl',
  'Or in {h} hours at the latest': 'Neu ymhen {h} awr ar y mwyaf',

  /* the review and the done screen */
  'Almost done': 'Bron â gorffen', 'Here&rsquo;s what we&rsquo;ll save': 'Dyma beth fyddwn ni’n ei gadw',
  'Tap {edit} to change an answer.': 'Tapiwch {edit} i newid ateb.', 'Save check-in': 'Cadw’r cofnod',
  'That&rsquo;s today&rsquo;s goal!': 'Dyna nod heddiw!', 'Thank you!': 'Diolch!', 'Thank you, {name}!': 'Diolch, {name}!',
  'Above and beyond today, thank you! Every extra check-in makes your comfort story clearer.':
    'Y tu hwnt i’r disgwyl heddiw, diolch! Mae pob cofnod ychwanegol yn gwneud stori eich cysur yn gliriach.',
  '{w} of {wg} goal days this week. More check-ins today are always welcome.': '{w} o {wg} diwrnod nod yr wythnos hon. Mae croeso bob amser i fwy o gofnodion heddiw.',
  '{n} more today reaches your daily goal.|{n} more today reach your daily goal.': '{n} arall heddiw ac fe gyrhaeddwch chi eich nod dyddiol.',
  'Saved at {time}': 'Wedi’i gadw am {time}', ' &middot; took {secs}': ' &middot; cymerodd {secs}',
  'Your next check-in opens at <b>{time}</b>': 'Bydd eich cofnod nesaf yn agor am <b>{time}</b>',
  'Done': 'Wedi gorffen', 'See the Bay Race': 'Gweld Ras y Bae', 'See my check-ins': 'Gweld fy nghofnodion',

  /* the tabs and the top strip */
  'Race': 'Ras', 'Back': 'Yn ôl', 'Progress': 'Cynnydd',
  'Question {s} of {n}': 'Cwestiwn {s} o {n}', 'Review': 'Adolygu', 'Check-in &middot; {time}': 'Cofnod &middot; {time}',
  'Close the check-in': 'Cau’r cofnod', 'Main': 'Prif lywio', 'Your profile': 'Eich proffil', 'Later': 'Nes ymlaen', 'Edit your home': 'Golygu’ch cartref',
  
  /* pausing, saving, Undo */
  'Reminders paused': 'Nodiadau atgoffa wedi’u hoedi', 'Tap Check in now when you&rsquo;re back': 'Tapiwch Cofnodi nawr pan fyddwch chi’n ôl',
  'Check-in saved': 'Cofnod wedi’i gadw', 'Undo': 'Dadwneud', 'Check-in removed': 'Cofnod wedi’i dynnu', 'Nothing was sent': 'Chafodd dim byd ei anfon',
  'One answer is missing': 'Mae un ateb ar goll', 'Answer it, then save': 'Atebwch ef, yna cadwch',

  /* joining and signing in: messages */
  'Joining is not switched on yet. Please contact the research team.': 'Dydy ymuno ddim ar gael eto. Cysylltwch â’r tîm ymchwil.',
  'We could not find that email. Check the spelling, or join as new.': 'Doedd dim modd dod o hyd i’r e-bost hwnnw. Gwiriwch y sillafu, neu ymunwch o’r newydd.',
  'Could not reach the study database. Check the connection and try again.': 'Methu cyrraedd cronfa ddata’r astudiaeth. Gwiriwch y cysylltiad a rhowch gynnig arall arni.',
  'Could not sign in. Check the connection and try again.': 'Methu mewngofnodi. Gwiriwch y cysylltiad a rhowch gynnig arall arni.',
  'Could not join. Check the connection and try again.': 'Methu ymuno. Gwiriwch y cysylltiad a rhowch gynnig arall arni.',
  'Could not save. Check the connection and try again.': 'Methu cadw. Gwiriwch y cysylltiad a rhowch gynnig arall arni.',
  '{n} minute|{n} minutes': { two:'{n} funud', other:'{n} munud' },
  '{n} hour|{n} hours': '{n} awr',
  'That PIN isn&rsquo;t right. {n} try left before a pause.|That PIN isn&rsquo;t right. {n} tries left before a pause.':
    { two:'Dydy’r rhif PIN yna ddim yn iawn. {n} gynnig ar ôl cyn saib.', few:'Dydy’r rhif PIN yna ddim yn iawn. {n} chynnig ar ôl cyn saib.', other:'Dydy’r rhif PIN yna ddim yn iawn. {n} cynnig ar ôl cyn saib.' },
  'Too many tries, so signing in is paused for {wait}. Please try again after that, or ask the research team to reset your PIN.':
    'Gormod o gynigion, felly mae mewngofnodi wedi’i oedi am {wait}. Rhowch gynnig arall arni wedyn, neu gofynnwch i’r tîm ymchwil ailosod eich rhif PIN.',
  'That PIN is easy to guess. Please choose another 4 digits.': 'Mae’n hawdd dyfalu’r rhif PIN yna. Dewiswch 4 digid arall.',
  'Please enter your 4-digit PIN.': 'Rhowch eich rhif PIN 4 digid.',
  'Please enter the email you registered with, like name@example.com.': 'Rhowch yr e-bost y gwnaethoch chi gofrestru ag ef, fel enw@example.com.',
  'Please enter your participant code: a P and its number, like P07.': 'Rhowch eich cod cyfranogwr: P a’i rif, fel P07.',
  'Please enter a 4-digit PIN.': 'Rhowch rif PIN 4 digid.',
  'The study database is not connected yet, so signing in is not possible. Choose I&rsquo;m new here instead.':
    'Dydy cronfa ddata’r astudiaeth ddim wedi’i chysylltu eto, felly does dim modd mewngofnodi. Dewiswch Rydw i’n newydd yma yn lle hynny.',
  'That participant code doesn&rsquo;t match.': 'Dydy’r cod cyfranogwr yna ddim yn cyfateb.',
  'The code on this phone doesn&rsquo;t match this email: please type yours.': 'Dydy’r cod ar y ffôn hwn ddim yn cyfateb i’r e-bost hwn: teipiwch eich un chi.',
  '{n} try left before a pause.|{n} tries left before a pause.': { two:'{n} gynnig ar ôl cyn saib.', few:'{n} chynnig ar ôl cyn saib.', other:'{n} cynnig ar ôl cyn saib.' },
  'This is the first time you sign in with a PIN. Please also enter your participant code, then choose your PIN.':
    'Dyma’r tro cyntaf i chi fewngofnodi gyda rhif PIN. Rhowch eich cod cyfranogwr hefyd, yna dewiswch eich rhif PIN.',
  'Loading your check-ins&hellip;': 'Wrthi’n llwytho’ch cofnodion&hellip;',
  'Welcome': 'Croeso', 'Welcome, {name}': 'Croeso, {name}', 'Welcome back, {name}': 'Croeso nôl, {name}',
  'Your PIN is saved. Use it with your email on your other devices.': 'Mae’ch rhif PIN wedi’i gadw. Defnyddiwch ef gyda’ch e-bost ar eich dyfeisiau eraill.',
  'Your check-ins from your other devices are still on their way.': 'Mae’ch cofnodion o’ch dyfeisiau eraill yn dal ar eu ffordd.',
  'Your check-ins from all your devices are here.': 'Mae’ch cofnodion o’ch holl ddyfeisiau yma.',
  'Checking&hellip;': 'Wrthi’n gwirio&hellip;', 'You&rsquo;re in!': 'Rydych chi i mewn!', 'Welcome to the study': 'Croeso i’r astudiaeth',
  'Not confirmed yet. Please try again a little later.': 'Heb ei gadarnhau eto. Rhowch gynnig arall arni ychydig yn nes ymlaen.',
  'Could not reach the study database. Try again later.': 'Methu cyrraedd cronfa ddata’r astudiaeth. Rhowch gynnig arall arni nes ymlaen.',

  /* Settings: reminders and the hours */
  'Weekdays': 'Llun–Gwener', 'Weekends': 'Sad–Sul',
  '{name}: the end time must be later than the start time. For &ldquo;until midnight&rdquo; choose 23:59.': '{name}: rhaid i’r amser gorffen fod yn hwyrach na’r amser dechrau. Ar gyfer &ldquo;tan hanner nos&rdquo; dewiswch 23:59.',
  '{name}, second period: the end time must be later than the start time.': '{name}, ail gyfnod: rhaid i’r amser gorffen fod yn hwyrach na’r amser dechrau.',
  '{name} from': '{name} o', '{name} until': '{name} tan', '{name}, second period, from': '{name}, ail gyfnod, o', '{name}, second period, until': '{name}, ail gyfnod, tan',
  'Remove the second weekdays period': 'Tynnu ail gyfnod dyddiau’r wythnos', 'Remove the second weekends period': 'Tynnu ail gyfnod y penwythnos',
  'to': 'i', 'and': 'a', '+ Add another period': '+ Ychwanegu cyfnod arall',
  'When are you usually at home?': 'Pryd rydych chi gartref fel arfer?',
  'Reminders only arrive inside these hours, never within {gap} minutes of a check-in, and not while you&rsquo;ve said you&rsquo;re out.':
    'Dim ond yn yr oriau hyn y daw nodiadau atgoffa, byth o fewn {gap} munud i gofnod, a dim tra byddwch chi wedi dweud eich bod chi allan.',
  'Reminders': 'Nodiadau atgoffa', 'On': 'Ymlaen',
  'The study has ended, so reminders have stopped. Thank you for taking part.': 'Mae’r astudiaeth wedi dod i ben, felly mae’r nodiadau atgoffa wedi stopio. Diolch am gymryd rhan.',
  'Then turn on notifications in the Home Screen app.': 'Yna trowch hysbysiadau ymlaen yn yr ap ar y sgrin gartref.',
  'Reminders start once the study database is connected. Your home hours are saved on this phone now.':
    'Bydd nodiadau atgoffa’n dechrau pan fydd cronfa ddata’r astudiaeth wedi’i chysylltu. Mae oriau eich cartref wedi’u cadw ar y ffôn hwn nawr.',
  'Save hours': 'Cadw’r oriau',
  'Notifications have stopped on this phone. Turn them on again.': 'Mae hysbysiadau wedi stopio ar y ffôn hwn. Trowch nhw ymlaen eto.',
  'The study needs notifications: they remind you to check in. Turn them on, then choose your hours here.':
    'Mae angen hysbysiadau ar yr astudiaeth: maen nhw’n eich atgoffa i gofnodi. Trowch nhw ymlaen, yna dewiswch eich oriau yma.',
  '{days} to start with.': '{days} i ddechrau.',
  'Turn off reminders': 'Diffodd nodiadau atgoffa',
  'On a phone or tablet, check-ins need notifications: with them off, this device asks you to turn them on again before a check-in.':
    'Ar ffôn neu lechen, mae angen hysbysiadau i gofnodi: os byddan nhw i ffwrdd, bydd y ddyfais hon yn gofyn i chi eu troi ymlaen eto cyn cofnodi.',
  'Saved on this phone.': 'Wedi’u cadw ar y ffôn hwn.',
  'Saved on this phone, but reminders have stopped here. Turn them on again below.': 'Wedi’u cadw ar y ffôn hwn, ond mae nodiadau atgoffa wedi stopio yma. Trowch nhw ymlaen eto isod.',
  'Saved.': 'Wedi’u cadw.',
  'Saved on this phone. The reminder service could not be reached right now; it gets the new hours next time you open the app.':
    'Wedi’u cadw ar y ffôn hwn. Doedd dim modd cyrraedd y gwasanaeth atgoffa ar hyn o bryd; bydd yn cael yr oriau newydd y tro nesaf y byddwch chi’n agor yr ap.',
  'Reminders are off on this phone.': 'Mae nodiadau atgoffa i ffwrdd ar y ffôn hwn.',

  /* the join wizard */
  'Check and finish': 'Gwirio a gorffen',
  'Please enter your name.': 'Rhowch eich enw.',
  'Please enter an email address, like name@example.com.': 'Rhowch gyfeiriad e-bost, fel enw@example.com.',
  'Please choose one. &ldquo;Prefer not to say&rdquo; is fine.': 'Dewiswch un. Mae &ldquo;Gwell gen i beidio â dweud&rdquo; yn iawn.',
  'Please enter the year you were born.': 'Rhowch y flwyddyn y cawsoch chi eich geni.',
  'Please enter the year as four digits, like 1985.': 'Rhowch y flwyddyn fel pedwar digid, fel 1985.',
  'You need to be 18 or over to take part.': 'Rhaid i chi fod yn 18 oed neu’n hŷn i gymryd rhan.',
  'Please enter your height in feet and inches.': 'Rhowch eich taldra mewn troedfeddi a modfeddi.',
  'Please check your height: feet from 3 to 8, inches from 0 to 11.': 'Gwiriwch eich taldra: troedfeddi o 3 i 8, modfeddi o 0 i 11.',
  'Please enter your height in centimetres.': 'Rhowch eich taldra mewn centimetrau.',
  'Please check your height: between 100 and 250 cm.': 'Gwiriwch eich taldra: rhwng 100 a 250 cm.',
  'Please enter your weight in stone and pounds.': 'Rhowch eich pwysau mewn stonau a phwysi.',
  'Please check your weight: stone from 4 to 47, pounds from 0 to 13.': 'Gwiriwch eich pwysau: stonau o 4 i 47, pwysi o 0 i 13.',
  'Please enter your weight in kilograms.': 'Rhowch eich pwysau mewn cilogramau.',
  'Please check your weight: between 30 and 300 kg.': 'Gwiriwch eich pwysau: rhwng 30 a 300 kg.',
  'Please choose the one that sounds most like you.': 'Dewiswch yr un sy’n swnio fwyaf fel chi.',
  'Please enter the first half of your postcode, like SA1.': 'Rhowch hanner cyntaf eich cod post, fel SA1.',
  'Please enter only the first half of your postcode: letters then numbers, like SA1 or CF10.': 'Rhowch hanner cyntaf eich cod post yn unig: llythrennau ac yna rhifau, fel SA1 neu CF10.',
  'Please pick the closest match.': 'Dewiswch yr un agosaf.',
  'Please choose which floor your flat is on.': 'Dewiswch ar ba lawr mae’ch fflat.',
  'Please choose one.': 'Dewiswch un.',
  'Please choose when it was built, or &ldquo;Not sure&rdquo;.': 'Dewiswch pryd cafodd ei adeiladu, neu &ldquo;Ddim yn siŵr&rdquo;.',
  'Please choose how many floors.': 'Dewiswch faint o loriau.',
  'Please choose how many bedrooms.': 'Dewiswch faint o ystafelloedd gwely.',
  'Please type the floor area in square metres, or tap &ldquo;Not sure&rdquo;.': 'Teipiwch yr arwynebedd llawr mewn metrau sgwâr, neu tapiwch &ldquo;Ddim yn siŵr&rdquo;.',
  'Please type the floor area as a number of square metres, like 85.': 'Teipiwch yr arwynebedd llawr fel nifer o fetrau sgwâr, fel 85.',
  'Please check the floor area: between 20 and 300 m².': 'Gwiriwch yr arwynebedd llawr: rhwng 20 a 300 m².',
  'Please choose the rating, or &ldquo;I don&rsquo;t know&rdquo;.': 'Dewiswch y sgôr, neu &ldquo;Dydw i ddim yn gwybod&rdquo;.',
  'Please set adults, children and pets. Tap &minus; for none.': 'Nodwch oedolion, plant ac anifeiliaid anwes. Tapiwch &minus; ar gyfer dim.',
  'Please choose your main heating, or &ldquo;Not sure&rdquo;.': 'Dewiswch eich prif wres, neu &ldquo;Ddim yn siŵr&rdquo;.',
  'Please choose any you use, or &ldquo;None of these&rdquo;.': 'Dewiswch unrhyw rai rydych chi’n eu defnyddio, neu &ldquo;Dim un o’r rhain&rdquo;.',
  'Please choose the one closest to how it&rsquo;s used.': 'Dewiswch yr un agosaf at sut mae’n cael ei ddefnyddio.',
  'Please choose any you have, or &ldquo;None of these&rdquo;.': 'Dewiswch unrhyw rai sydd gennych chi, neu &ldquo;Dim un o’r rhain&rdquo;.',
  'Please set the usual temperature, or tap &ldquo;Not sure&rdquo;.': 'Gosodwch y tymheredd arferol, neu tapiwch &ldquo;Ddim yn siŵr&rdquo;.',
  'Please choose one, or &ldquo;Not sure&rdquo;.': 'Dewiswch un, neu &ldquo;Ddim yn siŵr&rdquo;.',
  'Please choose where, or &ldquo;No&rdquo;.': 'Dewiswch ble, neu &ldquo;Naddo&rdquo;.',
  'Please tap a direction, or &ldquo;Not sure&rdquo;.': 'Tapiwch gyfeiriad, neu &ldquo;Ddim yn siŵr&rdquo;.',
  'Please choose a 4-digit PIN.': 'Dewiswch rif PIN 4 digid.',
  'That PIN is easy to guess. Please choose another.': 'Mae’n hawdd dyfalu’r rhif PIN yna. Dewiswch un arall.',
  'The two PINs are not the same.': 'Dydy’r ddau rif PIN ddim yr un fath.',
  'Welcome to the study!': 'Croeso i’r astudiaeth!', 'Local mode: everything stays on this phone': 'Modd lleol: mae popeth yn aros ar y ffôn hwn',
  'You already have an account. Please enter your participant code once, and your new PIN.': 'Mae gennych chi gyfrif yn barod. Rhowch eich cod cyfranogwr unwaith, a’ch rhif PIN newydd.',
  'This email is already registered. {why}': 'Mae’r e-bost hwn wedi’i gofrestru’n barod. {why}',
  'This email is already registered, with a different PIN. Use the PIN you chose before, or go back and sign in.':
    'Mae’r e-bost hwn wedi’i gofrestru’n barod, gyda rhif PIN gwahanol. Defnyddiwch y rhif PIN a ddewisoch chi o’r blaen, neu ewch yn ôl a mewngofnodi.',
  'That email was already registered, so we signed you in': 'Roedd yr e-bost hwnnw wedi’i gofrestru’n barod, felly rydyn ni wedi’ch mewngofnodi',
  'Your home profile is saved': 'Mae proffil eich cartref wedi’i gadw', 'Saved': 'Wedi’i gadw', 'Your home profile is up to date': 'Mae proffil eich cartref yn gyfredol',
  'Last step': 'Cam olaf', 'Less than a minute left': 'Llai na munud ar ôl',
  'About {n} minute left|About {n} minutes left': { two:'Tua {n} funud ar ôl', other:'Tua {n} munud ar ôl' },
  'How to tell': 'Sut i wybod',
  'Fewer adults': 'Llai o oedolion', 'More adults': 'Mwy o oedolion', 'Fewer children': 'Llai o blant', 'More children': 'Mwy o blant',
  'Fewer pets': 'Llai o anifeiliaid anwes', 'More pets': 'Mwy o anifeiliaid anwes',
  '{v} degrees Celsius': '{v} gradd Celsius', 'Not set': 'Heb ei osod',
  'Drag the dial or use &minus; and +': 'Llusgwch y deial neu defnyddiwch &minus; a +', 'Drag the dial or use − and +': 'Llusgwch y deial neu defnyddiwch − a +',
  'Marked as not sure': 'Wedi’i nodi fel ddim yn siŵr', 'Tap &minus; or + to set it': 'Tapiwch &minus; neu + i’w osod',
  'Lower': 'Is', 'Higher': 'Uwch', 'Not sure / no thermostat': 'Ddim yn siŵr / dim thermostat',
  'SET TO': 'GOSODIAD', 'NOT SURE': 'DDIM YN SIŴR', 'NOT SET': 'HEB EI OSOD',
  'The number on the compass <span class="opt">(optional)</span>': 'Y rhif ar y cwmpawd <span class="opt">(dewisol)</span>',
  'e.g. 225': 'e.e. 225', 'Type a number from 0 to 359': 'Teipiwch rif o 0 i 359',
  'Use your phone&rsquo;s compass': 'Defnyddiwch gwmpawd eich ffôn',
  'Swipe down on the Home Screen, type <b>Compass</b> and open the app.': 'Llithrwch i lawr ar y sgrin gartref, teipiwch <b>Compass</b> ac agorwch yr ap.',
  'Open the <b>Google</b> app and search <b>compass</b>: a live compass shows at the top. Some phones also have a <b>Compass</b> app.':
    'Agorwch ap <b>Google</b> a chwilio am <b>compass</b>: bydd cwmpawd byw yn ymddangos ar y brig. Mae gan rai ffonau ap <b>Compass</b> hefyd.',
  'How to read it': 'Sut i’w ddarllen',
  'Hold the phone flat, screen up, with its top edge pointing the way the question asks.': 'Daliwch y ffôn yn wastad, â’r sgrin i fyny, a’i ymyl uchaf yn pwyntio i’r cyfeiriad mae’r cwestiwn yn ei ofyn.',
  'Read the big number and letters at the bottom. In this picture, <b>225° SW</b> means the phone points <b>south-west</b>.':
    'Darllenwch y rhif a’r llythrennau mawr ar y gwaelod. Yn y llun hwn, mae <b>225° SW</b> yn golygu bod y ffôn yn pwyntio tua’r <b>de-orllewin</b>.',
  'Tap the same letters on the circle below, or type the number.': 'Tapiwch yr un llythrennau ar y cylch isod, neu teipiwch y rhif.',
  'N = north, E = east, S = south, W = west; NE, SE, SW and NW are in between.': 'N = gogledd, E = dwyrain, S = de, W = gorllewin; mae NE, SE, SW ac NW rhyngddyn nhw.',
  'Units': 'Unedau',
  'Full name': 'Enw llawn', 'Choose': 'Dewiswch', 'e.g. 1985': 'e.e. 1985',
  'Height, feet': 'Taldra, troedfeddi', 'Height, inches': 'Taldra, modfeddi', 'Height in centimetres': 'Taldra mewn centimetrau',
  'Weight, stone': 'Pwysau, stonau', 'Weight, pounds': 'Pwysau, pwysi', 'Weight in kilograms': 'Pwysau mewn cilogramau',
  'Which sounds most like you?': 'Pa un sy’n swnio fwyaf fel chi?', 'Which sounds most like you': 'Pa un sy’n swnio fwyaf fel chi',
  'Used only to understand comfort differences between people. Your check-ins are stored under a participant code, not your name. The research team sees your name and email next to that code, to run the study and contact you.':
    'Dim ond i ddeall gwahaniaethau cysur rhwng pobl. Caiff eich cofnodion eu cadw dan god cyfranogwr, nid dan eich enw. Mae’r tîm ymchwil yn gweld eich enw a’ch e-bost wrth ymyl y cod hwnnw, er mwyn cynnal yr astudiaeth a chysylltu â chi.',
  'The first half of your postcode': 'Hanner cyntaf eich cod post', 'e.g. SA1': 'e.e. SA1',
  'Only the first half (like SA2 or CF10), never the full postcode: it matches your check-ins to the local weather.':
    'Dim ond yr hanner cyntaf (fel SA2 neu CF10), byth y cod post llawn: mae’n paru’ch cofnodion â’r tywydd lleol.',
  'What type of home do you live in?': 'Ym mha fath o gartref rydych chi’n byw?', 'Pick the closest match.': 'Dewiswch yr un agosaf.', 'Home type': 'Math o gartref',
  'Which floor is your flat on?': 'Ar ba lawr mae’ch fflat?', 'The floor you live on. A maisonette: its lowest floor.': 'Y llawr rydych chi’n byw arno. Fflat deulawr: ei llawr isaf.',
  'Which floor': 'Pa lawr', 'Do you own or rent your home?': 'Ydych chi’n berchen ar eich cartref neu’n ei rentu?',
  'When was it built?': 'Pryd cafodd ei adeiladu?', 'A good guess is fine.': 'Mae amcan da yn iawn.', 'Year built': 'Blwyddyn adeiladu',
  'How many floors does your home have?': 'Faint o loriau sydd yn eich cartref?', 'Inside your flat, not the whole building.': 'Y tu mewn i’ch fflat, nid yr adeilad cyfan.',
  'Count a loft or cellar only if it is lived in.': 'Cyfrwch atig neu seler dim ond os yw’n cael ei ddefnyddio fel lle byw.',
  'How many bedrooms?': 'Faint o ystafelloedd gwely?', 'What is the floor area?': 'Beth yw’r arwynebedd llawr?',
  'In square metres. Your Energy Performance Certificate (EPC) shows it as &ldquo;Total floor area&rdquo;.':
    'Mewn metrau sgwâr. Mae’ch Tystysgrif Perfformiad Ynni (EPC) yn ei ddangos fel &ldquo;Total floor area&rdquo; (cyfanswm arwynebedd llawr).',
  'e.g. 85': 'e.e. 85', 'Floor area in square metres': 'Arwynebedd llawr mewn metrau sgwâr',
  'What is its energy rating (EPC)?': 'Beth yw ei sgôr ynni (EPC)?',
  'The letter on the Energy Performance Certificate, from A (best) to G. You can look it up on GOV.UK: &ldquo;Find an energy certificate&rdquo;.':
    'Y llythyren ar y Dystysgrif Perfformiad Ynni, o A (gorau) i G. Gallwch chi chwilio amdani ar GOV.UK: &ldquo;Find an energy certificate&rdquo; (Dod o hyd i dystysgrif ynni).',
  'Who lives here?': 'Pwy sy’n byw yma?', 'Including you.': 'Gan eich cynnwys chi.',
  'Under 18. Tap &minus; for none': 'O dan 18. Tapiwch &minus; ar gyfer dim', 'Tap &minus; for none': 'Tapiwch &minus; ar gyfer dim',
  'Do you share your bedroom with anyone?': 'Ydych chi’n rhannu’ch ystafell wely gyda rhywun?',
  'Count everyone else who sleeps in the same room.': 'Cyfrwch bawb arall sy’n cysgu yn yr un ystafell.', 'Bedroom shared with': 'Rhannu’r ystafell wely gyda',
  'What is your main heating?': 'Beth yw’ch prif wres?', 'The one that heats most of your home.': 'Yr un sy’n gwresogi’r rhan fwyaf o’ch cartref.',
  'Do you also use any of these?': 'Ydych chi hefyd yn defnyddio unrhyw un o’r rhain?', 'Tap all that you use.': 'Tapiwch bob un rydych chi’n ei ddefnyddio.',
  'How is your heating usually used?': 'Sut mae’ch gwres yn cael ei ddefnyddio fel arfer?', 'How the heating is used': 'Sut mae’r gwres yn cael ei ddefnyddio',
  'Which heating controls do you have?': 'Pa reolyddion gwres sydd gennych chi?', 'Tap all that you have.': 'Tapiwch bob un sydd gennych chi.',
  'What temperature is it usually set to?': 'I ba dymheredd mae wedi’i osod fel arfer?', 'The setting, when someone is at home.': 'Y gosodiad, pan fydd rhywun gartref.',
  'Are your walls insulated?': 'Ydy’ch waliau wedi’u hinswleiddio?', 'The outside walls. A good guess is fine.': 'Y waliau allanol. Mae amcan da yn iawn.',
  'Wall insulation': 'Inswleiddio waliau',
  'Look at the outside brickwork. If every brick shows its long side, the walls are probably cavity walls (most homes built after about 1930). If some bricks show their short ends, they are probably solid walls. A regular pattern of small filled holes in the mortar means the cavity has been filled.':
    'Edrychwch ar y gwaith brics y tu allan. Os yw pob bricsen yn dangos ei hochr hir, waliau ceudod sydd gennych chi fwy na thebyg (y rhan fwyaf o gartrefi a godwyd ar ôl tua 1930). Os yw rhai brics yn dangos eu pennau byr, waliau solet sydd gennych chi fwy na thebyg. Mae patrwm rheolaidd o dyllau bach wedi’u llenwi yn y morter yn golygu bod y ceudod wedi’i lenwi.',
  'Is the loft insulated?': 'Ydy’r atig wedi’i inswleiddio?',
  'In the loft, a thick soft layer (yellow, grey or white) between and over the wooden beams is insulation; about 27&nbsp;cm is the recommended depth.':
    'Yn yr atig, haen drwchus feddal (melyn, llwyd neu wyn) rhwng y trawstiau pren a throstyn nhw yw inswleiddio; tua 27&nbsp;cm yw’r dyfnder a argymhellir.',
  'What kind of windows?': 'Pa fath o ffenestri?',
  'Look at the edge of the glass: two sheets with a gap between them is double glazing, three is triple.': 'Edrychwch ar ymyl y gwydr: dwy haen â bwlch rhyngddyn nhw yw gwydr dwbl, tair yw gwydr triphlyg.',
  'Can the windows be opened?': 'Oes modd agor y ffenestri?',
  'Have you seen damp or mould in the last year?': 'Ydych chi wedi gweld tamprwydd neu lwydni yn ystod y flwyddyn ddiwethaf?',
  'Tap every room where you saw it.': 'Tapiwch bob ystafell lle gwelsoch chi ef.',
  'Black or green spots on walls, ceilings or around windows, peeling paint or wallpaper, or a musty smell.':
    'Smotiau du neu wyrdd ar waliau, nenfydau neu o gwmpas ffenestri, paent neu bapur wal yn pilio, neu arogl llwydni.',
  'Which way does your bedroom window face?': 'I ba gyfeiriad mae ffenestr eich ystafell wely’n wynebu?',
  'Stand at the bedroom window with your back to the room and point the top of your phone out of the window. More than one window? Use the biggest.':
    'Sefwch wrth ffenestr yr ystafell wely â’ch cefn at yr ystafell, a phwyntiwch dop eich ffôn allan drwy’r ffenestr. Mwy nag un ffenestr? Defnyddiwch yr un fwyaf.',
  'Which way the bedroom window faces': 'I ba gyfeiriad mae ffenestr yr ystafell wely’n wynebu',
  'Which side of your home is your bedroom on?': 'Ar ba ochr i’ch cartref mae’ch ystafell wely?',
  'Stand in the middle of your home and point the top of your phone towards your bedroom.': 'Sefwch yng nghanol eich cartref a phwyntiwch dop eich ffôn tuag at eich ystafell wely.',
  'Which side of the home the bedroom is on': 'Ar ba ochr i’r cartref mae’r ystafell wely',
  'With your email, it lets you sign in on another phone or tablet and see all your check-ins there. Please don&rsquo;t use your bank card PIN.':
    'Gyda’ch e-bost, mae’n gadael i chi fewngofnodi ar ffôn neu lechen arall a gweld eich holl gofnodion yno. Peidiwch â defnyddio PIN eich cerdyn banc.',
  'Type it again': 'Teipiwch ef eto',
  'Joining means you agree to take part as described on the <a href="../">study page</a>.': 'Mae ymuno’n golygu eich bod chi’n cytuno i gymryd rhan fel y disgrifir ar <a href="../?lang=cy">dudalen yr astudiaeth</a>.',
  'Tell us about you': 'Dywedwch wrthon ni amdanoch chi',
  'Every question needs an answer. They help the study compare how different people feel.': 'Mae angen ateb pob cwestiwn. Maen nhw’n helpu’r astudiaeth i gymharu sut mae gwahanol bobl yn teimlo.',
  'Your area and your home': 'Eich ardal a’ch cartref', 'How old and how big is it?': 'Pa mor hen a pha mor fawr yw e?',
  'How do you heat your home?': 'Sut rydych chi’n gwresogi’ch cartref?', 'Your heating controls': 'Rheolyddion eich gwres',
  'A good guess is fine for all of these.': 'Mae amcan da yn iawn ar gyfer y rhain i gyd.',
  'The directions matter a lot for the study, so take a moment to get them right.': 'Mae’r cyfeiriadau’n bwysig iawn i’r astudiaeth, felly cymerwch eiliad i’w cael nhw’n iawn.',
  'Check everything, choose your PIN, then join. Tap Edit to change a section.': 'Gwiriwch bopeth, dewiswch eich rhif PIN, yna ymunwch. Tapiwch Golygu i newid adran.',
  'Check everything, then save. Tap Edit to change a section.': 'Gwiriwch bopeth, yna cadwch. Tapiwch Golygu i newid adran.',
  'Tell us about your home': 'Dywedwch wrthon ni am eich cartref',
  '{app} 1.0 asks a few questions about you and your home, once. Some answers are filled in from before: check them, and answer the rest.':
    'Mae {app} 1.0 yn gofyn ychydig o gwestiynau amdanoch chi a’ch cartref, unwaith. Mae rhai atebion wedi’u llenwi o’r blaen: gwiriwch nhw, ac atebwch y gweddill.',
  '{t}, done': '{t}, wedi’i wneud', '{t}, current step': '{t}, y cam presennol',
  'Save': 'Cadw', 'Save my profile': 'Cadw fy mhroffil', 'Save and go back': 'Cadw a mynd yn ôl',
  'Edit &middot; {t}': 'Golygu &middot; {t}', 'Step {n} of {m} &middot; {t}': 'Cam {n} o {m} &middot; {t}',

  /* one check-in's details, signing out */
  'From a reminder': 'O nodyn atgoffa', 'You started it': 'Chi a’i dechreuodd', 'Just got in': 'Newydd gyrraedd', 'Home over an hour': 'Gartref ers dros awr',
  'Took {secs}': 'Cymerodd {secs}', 'Same as the time before': 'Yr un fath â’r tro cynt', 'Example data': 'Data enghreifftiol', 'What you logged': 'Beth wnaethoch chi ei gofnodi',
  'Sign out on this phone?': 'Allgofnodi ar y ffôn hwn?',
  'Reminders stop on this phone. Your check-ins so far stay saved, and any not sent yet go out when you sign in here again. To come back, choose &ldquo;I have registered before&rdquo; and enter your email and PIN.':
    'Bydd nodiadau atgoffa’n stopio ar y ffôn hwn. Bydd eich cofnodion hyd yma’n aros wedi’u cadw, a bydd unrhyw rai sydd heb eu hanfon eto’n mynd pan fyddwch chi’n mewngofnodi yma eto. I ddod yn ôl, dewiswch &ldquo;Rydw i wedi cofrestru o’r blaen&rdquo; a rhowch eich e-bost a’ch rhif PIN.',
  'Sign out': 'Allgofnodi', 'Cancel': 'Canslo',

  /* ---------- the check-in questions (questions.js) ---------- */
  'Right now': 'Ar hyn o bryd', 'How do you feel right now?': 'Sut rydych chi’n teimlo ar hyn o bryd?',
  'Your thermal sensation, all over.': 'Pa mor gynnes neu oer rydych chi’n teimlo, drwy’ch corff i gyd.',
  'Not home right now?': 'Ddim gartref ar hyn o bryd?', 'Skip this one': 'Hepgor yr un yma',
  'Would you like to be&hellip;': 'Hoffech chi fod&hellip;',
  'Acceptability': 'Derbynioldeb', 'Are these conditions acceptable to you?': 'Ydy’r amodau hyn yn dderbyniol i chi?', 'The thermal environment as a whole.': 'Yr amgylchedd thermol yn ei gyfanrwydd.',
  'Same as last time': 'Yr un fath â’r tro diwethaf', 'Clothing': 'Dillad', 'What are you wearing?': 'Beth rydych chi’n ei wisgo?',
  'Tap everything you have on, blankets too.': 'Tapiwch bopeth sydd amdanoch chi, blancedi hefyd.', 'clo insulation': 'inswleiddiad clo',
  'Values follow ASHRAE 55 and ISO 7730. Blanket and duvet are estimates.': 'Mae’r gwerthoedd yn dilyn ASHRAE 55 ac ISO 7730. Amcangyfrifon yw’r flanced a’r cwilt.',
  'Next': 'Nesaf', 'Activity': 'Gweithgarwch', 'What have you been doing for the last 15 minutes?': 'Beth rydych chi wedi bod yn ei wneud dros y 15 munud diwethaf?',
  'Location': 'Lleoliad', 'Which room are you in?': 'Ym mha ystafell rydych chi?',
  'The study&rsquo;s sensors are in your living room and, in some homes, your bedroom, so this matters.': 'Mae synwyryddion yr astudiaeth yn eich ystafell fyw ac, mewn rhai cartrefi, yn eich ystafell wely, felly mae hyn yn bwysig.',
  'Air movement': 'Symudiad aer', 'Can you feel air moving around you?': 'Allwch chi deimlo aer yn symud o’ch cwmpas?',
  'Like air from a window, a door, a vent or a fan. Not how warm or cool it is, only whether the air moves.': 'Fel aer o ffenestr, drws, fent neu ffan. Nid pa mor gynnes neu oer yw e, dim ond a yw’r aer yn symud.',
  'Sunlight': 'Golau’r haul', 'Is the sun shining on you?': 'Ydy’r haul yn tywynnu arnoch chi?',
  'Is your heating on right now?': 'Ydy’ch gwres ymlaen ar hyn o bryd?', 'Any heating in your home: the central heating or a heater.': 'Unrhyw wres yn eich cartref: y gwres canolog neu wresogydd.',
    'How long has it been on?': 'Ers faint mae ymlaen?', 'Since it last came on.': 'Ers iddo ddod ymlaen ddiwethaf.', 'How long has the heating been on': 'Ers faint mae’r gwres ymlaen',
  'Touch the nearest outside wall with the back of your hand. How does it feel?': 'Cyffyrddwch â’r wal allanol agosaf â chefn eich llaw. Sut mae’n teimlo?',
  'An outside wall has the outdoors on the other side.': 'Wal allanol yw wal sydd â’r awyr agored yr ochr arall iddi.', 'How the outside wall feels': 'Sut mae’r wal allanol yn teimlo',
  'Last 30 minutes': 'Y 30 munud diwethaf', 'In the last 30 minutes, did you do any of these?': 'Yn y 30 munud diwethaf, wnaethoch chi unrhyw un o’r rhain?',
  'Only things you <b>did</b>, not how things are now. Tap all that apply.': 'Dim ond pethau a <b>wnaethoch</b> chi, nid sut mae pethau nawr. Tapiwch bob un sy’n berthnasol.',
  'What you did in the last 30 minutes': 'Beth wnaethoch chi yn y 30 munud diwethaf', 'I didn&rsquo;t do any of these': 'Wnes i ddim un o’r rhain',
  'In the last 30 minutes, did you have or feel any of these?': 'Yn y 30 munud diwethaf, gawsoch chi neu deimloch chi unrhyw un o’r rhain?',
  'Tap all that apply.': 'Tapiwch bob un sy’n berthnasol.', 'What you had or felt in the last 30 minutes': 'Beth gawsoch chi neu deimloch chi yn y 30 munud diwethaf',
  'Nothing': 'Dim byd', 'Something else': 'Rhywbeth arall',
  /* the answers */
  'Sleeping': 'Cysgu', 'Lying down': 'Gorwedd', 'Sitting relaxed': 'Eistedd yn hamddenol', 'Desk work': 'Gwaith desg', 'Standing': 'Sefyll',
  'Cooking / housework': 'Coginio / gwaith tŷ', 'Walking about': 'Cerdded o gwmpas', 'Exercising': 'Gwneud ymarfer corff',
  'Living room': 'Ystafell fyw', 'Kitchen': 'Cegin', 'Home office': 'Swyddfa gartref', 'Bathroom': 'Ystafell ymolchi', 'Elsewhere': 'Rhywle arall',
  'Acceptable': 'Derbyniol', 'I can stay like this': 'Galla i aros fel hyn', 'Not acceptable': 'Ddim yn dderbyniol', 'I want this to change': 'Rydw i eisiau i hyn newid',
  'Clearly acceptable': 'Derbyniol yn glir', 'Just acceptable': 'Prin yn dderbyniol', 'Just unacceptable': 'Prin yn annerbyniol', 'Clearly unacceptable': 'Annerbyniol yn glir',
  'No, the air feels still': 'Na, mae’r aer yn teimlo’n llonydd', 'I can&rsquo;t feel any air moving': 'Alla i ddim teimlo unrhyw aer yn symud', 'Still air': 'Aer llonydd',
  'Yes, a little': 'Gallaf, ychydig', 'I can just feel a gentle flow of air': 'Galla i deimlo ychydig o lif aer ysgafn', 'A little air moving': 'Ychydig o aer yn symud',
  'Yes, clearly': 'Gallaf, yn glir', 'I can clearly feel air moving, or a draught': 'Galla i deimlo aer yn symud yn glir, neu ddrafft', 'Draughty': 'Drafftiog',
  'Sun on me': 'Haul arna i', 'Direct sunlight where I am': 'Golau haul uniongyrchol lle rydw i', 'No direct sun': 'Dim haul uniongyrchol',
  'Daylight, but not on me': 'Golau dydd, ond nid arna i', "It's dark": 'Mae’n dywyll', 'Evening, or curtains drawn': 'Gyda’r nos, neu’r llenni ar gau',
  'Yes, it&rsquo;s on': 'Ydy, mae ymlaen', 'Heating on': 'Gwres ymlaen', 'No, it&rsquo;s off': 'Nac ydy, mae i ffwrdd', 'Heating off': 'Gwres i ffwrdd',
  'Not sure if the heating is on': 'Ddim yn siŵr a yw’r gwres ymlaen',
  'It&rsquo;s always on': 'Mae ymlaen drwy’r amser', 'On a thermostat': 'Ar thermostat', 'The thermostat switches it on and off': 'Y thermostat sy’n ei droi ymlaen ac i ffwrdd',
  'Always on (thermostat)': 'Ymlaen drwy’r amser (thermostat)', '30 minutes to an hour': '30 munud i awr', '1 to 2 hours': '1 i 2 awr', '2 to 4 hours': '2 i 4 awr',
  'More than 4 hours': 'Mwy na 4 awr', 'Less than 30 minutes': 'Llai na 30 munud',
  'I can&rsquo;t reach one': 'Alla i ddim cyrraedd un', 'Neither cold nor warm': 'Ddim yn oer nac yn gynnes',
  'Cold': 'Oer', 'Cool': 'Oeraidd', 'Slightly cool': 'Ychydig yn oeraidd', 'Neutral': 'Niwtral', 'Slightly warm': 'Ychydig yn gynnes', 'Warm': 'Cynnes', 'Hot': 'Poeth',
  'Opened a window': 'Agor ffenestr', 'I opened a window': 'Agorais i ffenestr', 'Closed a window': 'Cau ffenestr', 'I closed a window': 'Caeais i ffenestr',
  'Opened a door': 'Agor drws', 'I opened a door': 'Agorais i ddrws', 'Closed a door': 'Cau drws', 'I closed a door': 'Caeais i ddrws',
  'Turned the heating up': 'Troi’r gwres i fyny', 'I turned the heating up': 'Troais i’r gwres i fyny',
  'Turned the heating down or off': 'Troi’r gwres i lawr neu i ffwrdd', 'I turned the heating down or off': 'Troais i’r gwres i lawr neu i ffwrdd',
  'Put on a layer': 'Rhoi haen arall amdanaf', 'I put on a layer': 'Rhois i haen arall amdana i', 'Took off a layer': 'Tynnu haen', 'I took off a layer': 'Tynnais i haen',
  'Got a blanket': 'Cael blanced', 'I got a blanket': 'Ces i flanced', 'Turned a fan on': 'Troi ffan ymlaen', 'I turned a fan on': 'Troais i ffan ymlaen',
  'Drew the curtains or blinds': 'Cau’r llenni neu’r bleindiau', 'I drew the curtains or blinds': 'Caeais i’r llenni neu’r bleindiau',
  'Moved to another room': 'Symud i ystafell arall', 'I moved to another room': 'Symudais i i ystafell arall',
  'Window': 'Ffenestr', 'Door': 'Drws', 'Clothes and blankets': 'Dillad a blancedi',
  'Hot drink': 'Diod boeth', 'I had a hot drink': 'Ces i ddiod boeth', 'Cold drink': 'Diod oer', 'I had a cold drink': 'Ces i ddiod oer',
  'Ate something': 'Bwyta rhywbeth', 'I ate something': 'Bwytais i rywbeth', 'Felt hungry': 'Teimlo eisiau bwyd', 'I felt hungry': 'Roedd eisiau bwyd arna i',
  'Felt tired': 'Teimlo wedi blino', 'I felt tired': 'Roeddwn i wedi blino', 'Felt unwell': 'Teimlo’n anhwylus', 'I felt unwell': 'Roeddwn i’n teimlo’n anhwylus',
  'Drinks': 'Diodydd', 'Food': 'Bwyd',
  'how you feel': 'sut rydych chi’n teimlo', 'your preference': 'eich dewis', 'acceptability': 'derbynioldeb', 'clothing': 'dillad', 'activity': 'gweithgarwch',
  'room': 'ystafell', 'air movement': 'symudiad aer', 'sunlight': 'golau’r haul', 'the heating': 'y gwres',   'how long it has been on': 'ers faint mae ymlaen', 'the wall': 'y wal', 'what you did': 'beth wnaethoch chi', 'what you had or felt': 'beth gawsoch chi neu deimloch chi',
  /* clothes (icons.js) */
  'T-shirt': 'Crys-T', 'Long sleeves': 'Llewys hir', 'Thick jumper': 'Siwmper drwchus', 'Hoodie / fleece': 'Hwdi / cnu', 'Shorts': 'Siorts',
  'Jeans / trousers': 'Jîns / trowsus', 'Joggers': 'Trowsus loncian', 'Skirt / dress': 'Sgert / ffrog', 'Pyjamas': 'Pyjamas',
  'Light jacket or summer coat': 'Siaced ysgafn neu got haf', 'Light jacket': 'Siaced ysgafn', 'Winter coat': 'Cot aeaf', 'Socks': 'Sanau', 'Slippers': 'Sliperi',
  'Blanket': 'Blanced', 'Duvet': 'Cwilt',
  'Tops': 'Topiau', 'Bottoms': 'Gwaelodion', 'Coats': 'Cotiau', 'Nightwear': 'Dillad nos', 'Feet': 'Traed', 'Blankets and covers': 'Blancedi a gorchuddion',

  /* ---------- the join wizard's answers (questions.js) ---------- */
  'Woman': 'Menyw', 'Man': 'Dyn', 'Non-binary': 'Anneuaidd', 'Another identity': 'Hunaniaeth arall', 'Prefer not to say': 'Gwell gen i beidio â dweud',
  'I feel the cold easily': 'Rydw i’n teimlo’r oerfel yn hawdd', 'I&rsquo;m about average': 'Rydw i tua’r cyfartaledd', 'I feel the heat easily': 'Rydw i’n teimlo’r gwres yn hawdd',
  'Detached': 'Ar wahân', 'Semi-detached': 'Pâr', 'End of terrace': 'Pen teras', 'Terraced': 'Teras', 'Mid-terrace': 'Canol teras', 'Bungalow': 'Byngalo',
  'Flat or maisonette': 'Fflat neu fflat deulawr',
  'Basement': 'Islawr', 'Ground floor': 'Llawr gwaelod', 'A middle floor': 'Llawr canol', 'Top floor': 'Llawr uchaf',
  'I own it': 'Fi sy’n berchen arno', 'Outright or with a mortgage': 'Yn llwyr neu gyda morgais', 'Rent from a housing association': 'Rhentu gan gymdeithas dai',
  'Rent from the council': 'Rhentu gan y cyngor', 'Rent privately': 'Rhentu’n breifat', 'Shared ownership': 'Rhanberchnogaeth', 'e.g. living with family': 'e.e. byw gyda’r teulu',
  'Before 1919': 'Cyn 1919', '2003 or later': '2003 neu wedyn',
  'floor': 'llawr', 'floors': 'llawr', 'or more': 'neu fwy',
  'I don&rsquo;t know': 'Dydw i ddim yn gwybod',
  'Just me': 'Dim ond fi', '1 other person': '1 person arall', '2 others': '2 arall', '3 or more': '3 neu fwy',
  'Gas boiler, no hot water tank': 'Boeler nwy, dim tanc dŵr poeth', 'A combi boiler': 'Boeler combi', 'Gas boiler': 'Boeler nwy',
  'Gas boiler with a hot water tank': 'Boeler nwy gyda thanc dŵr poeth', 'Oil boiler': 'Boeler olew', 'LPG boiler': 'Boeler LPG',
  'Air source heat pump': 'Pwmp gwres ffynhonnell aer', 'Heat pump': 'Pwmp gwres', 'Ground source heat pump': 'Pwmp gwres ffynhonnell ddaear',
  'Electric storage heaters': 'Gwresogyddion storio trydan', 'Storage heaters': 'Gwresogyddion storio',
  'Electric radiators or panel heaters': 'Rheiddiaduron trydan neu wresogyddion panel', 'Electric radiators': 'Rheiddiaduron trydan',
  'Communal or district heating': 'Gwres cymunedol neu wres ardal', 'Communal heating': 'Gwres cymunedol', 'Solid fuel': 'Tanwydd solet', 'Coal or wood': 'Glo neu bren',
  'No central heating': 'Dim gwres canolog',
  'Plug-in electric heater': 'Gwresogydd trydan plwg', 'Plug-in heater': 'Gwresogydd plwg', 'Gas fire': 'Tân nwy', 'Electric fire': 'Tân trydan',
  'Wood burner or multi-fuel stove': 'Llosgwr coed neu stof aml-danwydd', 'Wood burner or stove': 'Llosgwr coed neu stof', 'Open fire': 'Tân agored', 'Electric blanket': 'Blanced drydan',
  'Always on: the thermostat turns it on and off': 'Ymlaen drwy’r amser: y thermostat sy’n ei droi ymlaen ac i ffwrdd',
  'Set to a temperature and I rarely touch it': 'Wedi’i osod ar dymheredd, a phrin y bydda i’n ei gyffwrdd',
  'On a timer at set times': 'Ar amserydd ar adegau penodol', 'I switch it on when I need it': 'Rydw i’n ei droi ymlaen pan fydd ei angen arna i',
  'On most of the day': 'Ymlaen am y rhan fwyaf o’r dydd', 'I rarely use it': 'Anaml y bydda i’n ei ddefnyddio', 'Someone else controls it': 'Rhywun arall sy’n ei reoli',
  'A thermostat on the wall': 'Thermostat ar y wal', 'Smart thermostat': 'Thermostat clyfar', 'Hive, Nest, tado and similar': 'Hive, Nest, tado a rhai tebyg',
  'Timer or programmer': 'Amserydd neu raglennydd', 'Dials on the radiators': 'Deialau ar y rheiddiaduron', 'TRVs': 'TRVs',
  'Filled cavity walls': 'Waliau ceudod wedi’u llenwi', 'Two layers of brick, the gap filled': 'Dwy haen o frics, y bwlch wedi’i lenwi',
  'Insulation on the outside': 'Inswleiddio ar y tu allan', 'Render or cladding over the walls': 'Rendr neu gladin dros y waliau',
  'Insulation on the inside': 'Inswleiddio ar y tu mewn', 'Insulated boards inside the rooms': 'Byrddau wedi’u hinswleiddio y tu mewn i’r ystafelloedd',
  'No insulation': 'Dim inswleiddio', 'Solid walls, or an empty cavity': 'Waliau solet, neu geudod gwag', 'A guess is fine': 'Mae amcan yn iawn',
  'LOFT:Yes': 'Ydy', 'A thick soft layer up there': 'Haen drwchus feddal yno', 'LOFT:No': 'Nac ydy', 'Bare boards or a thin layer': 'Estyll moel neu haen denau',
  'No loft': 'Dim atig', 'e.g. a flat below another home': 'e.e. fflat o dan gartref arall',
  'Single': 'Sengl', 'One sheet of glass': 'Un haen o wydr', 'Double': 'Dwbl', 'Two sheets, a gap between': 'Dwy haen, â bwlch rhyngddyn nhw',
  'Triple': 'Triphlyg', 'Three sheets': 'Tair haen', 'A mix': 'Cymysgedd', 'Some of each': 'Rhai o bob un',
  'Yes, all of them': 'Oes, pob un', 'Every window opens': 'Mae pob ffenestr yn agor', 'Some of them': 'Rhai ohonyn nhw', 'Some are stuck or fixed': 'Mae rhai’n sownd neu’n sefydlog',
  'WINDOWS_OPEN:No': 'Nac oes', 'Sealed or stuck shut': 'Wedi’u selio neu’n sownd ar gau',
  'DAMP:No': 'Naddo',
  'North': 'Gogledd', 'North-east': 'Gogledd-ddwyrain', 'East': 'Dwyrain', 'South-east': 'De-ddwyrain', 'South': 'De', 'South-west': 'De-orllewin',
  'West': 'Gorllewin', 'North-west': 'Gogledd-orllewin',

  /* ---------- the game (game.js) ---------- */
  'Swansea Marina': 'Marina Abertawe', 'Blackpill': 'Blackpill', 'Oystermouth': 'Ystumllwynarth', 'Mumbles lighthouse': 'Goleudy’r Mwmbwls',
  'SWANSEA': 'ABERTAWE', 'GOWER': 'GŴYR', 'Swansea Bay': 'Bae Abertawe', 'Marina': 'Marina', 'Mumbles': 'Mwmbwls',
  '{a} and {b}': '{a} a {b}', '{a} and {b}:vowel': '{a} ac {b}',
  '{a} and {n} others': '{a} a {n} arall',
  'Nobody has set off yet': 'Does neb wedi cychwyn eto',
    'Check in to join the race': 'Cofnodwch i ymuno â’r ras',
      'Your next check-in gets you moving': 'Bydd eich cofnod nesaf yn eich rhoi ar eich ffordd',
  'Everyone is still at the marina': 'Mae pawb yn dal yn y marina',
    'Level with {names}': 'Yn gyfartal â {names}',
    '{n} point ahead of {who}|{n} points ahead of {who}': { two:'{n} bwynt ar y blaen i {who}', few:'{n} phwynt ar y blaen i {who}', many:'{n} phwynt ar y blaen i {who}', other:'{n} pwynt ar y blaen i {who}' },
      '{n} point behind {who}|{n} points behind {who}': { two:'{n} bwynt y tu ôl i {who}', few:'{n} phwynt y tu ôl i {who}', many:'{n} phwynt y tu ôl i {who}', other:'{n} pwynt y tu ôl i {who}' },
  'Nobody scored last week': 'Sgoriodd neb yr wythnos diwethaf', 'This week is a fresh start': 'Mae’r wythnos hon yn ddechrau newydd',
  "Last week's final standings": 'Safleoedd terfynol yr wythnos diwethaf',
  '{n} runner|{n} runners': { two:'{n} redwr', other:'{n} rhedwr' },
  "You didn't score last week": 'Wnaethoch chi ddim sgorio yr wythnos diwethaf',
  'You shared first place last week': 'Fe rannoch chi’r lle cyntaf yr wythnos diwethaf', 'You won last week!': 'Fe enilloch chi yr wythnos diwethaf!',
  '{n} point|{n} points': { two:'{n} bwynt', few:'{n} phwynt', many:'{n} phwynt', other:'{n} pwynt' },
  'You finished {ord} of {total} last week': 'Fe orffennoch chi’n {ord} o {total} yr wythnos diwethaf',
  'You finished joint {ord} of {total} last week': 'Fe orffennoch chi’n gydradd {ord} o {total} yr wythnos diwethaf',
  'Last week you finished {ord} with {pts}': 'Yr wythnos diwethaf fe orffennoch chi’n {ord} gyda {pts}',
  'Last week you finished joint {ord} with {pts}': 'Yr wythnos diwethaf fe orffennoch chi’n gydradd {ord} gyda {pts}',
  'Race period': 'Cyfnod y ras', 'Last week': 'Wythnos diwethaf', 'This month': 'Y mis hwn',
  'seg:This week': 'Wythnos hon', 'seg:Last week': 'Wythnos cynt', 'seg:This month': 'Mis hwn',
  'The race runs to the end of the month': 'Mae’r ras yn rhedeg tan ddiwedd y mis', 'The race runs Monday to Sunday': 'Mae’r ras yn rhedeg o ddydd Llun i ddydd Sul',
  'Final standings': 'Safleoedd terfynol', 'Last day!': 'Diwrnod olaf!', 'Ends tomorrow': 'Yn gorffen yfory',
  '{n} day to go|{n} days to go': { two:'{n} ddiwrnod i fynd', other:'{n} diwrnod i fynd' },
  '{n} goal day|{n} goal days': { two:'{n} ddiwrnod nod', other:'{n} diwrnod nod' },
  'Reached the lighthouse': 'Wedi cyrraedd y goleudy', 'pts': 'pwynt',
  'Show all {n} runners': 'Dangos pob un o’r {n} rhedwr',
  'You reached Mumbles lighthouse': 'Fe gyrhaeddoch chi Oleudy’r Mwmbwls', "You've reached Mumbles lighthouse": 'Rydych chi wedi cyrraedd Goleudy’r Mwmbwls',
  '{n} point to the lighthouse|{n} points to the lighthouse': { two:'{n} bwynt i’r goleudy', few:'{n} phwynt i’r goleudy', many:'{n} phwynt i’r goleudy', other:'{n} pwynt i’r goleudy' },
    'Nobody in the race sees your name or your answers.': 'Does neb yn y ras yn gweld eich enw na’ch atebion.',
  'Swansea Marina to Mumbles lighthouse': 'O Farina Abertawe i Oleudy’r Mwmbwls',
  'Loading the race&hellip;': 'Wrthi’n llwytho’r ras&hellip;', 'It appears here in a moment. Your check-ins count either way.': 'Bydd yn ymddangos yma mewn eiliad. Mae’ch cofnodion yn cyfrif beth bynnag.',
  'The race is offline': 'Mae’r ras all-lein',
  "It appears when your phone is online. Your check-ins still count and are sent when you're back.": 'Bydd yn ymddangos pan fydd eich ffôn ar-lein. Mae’ch cofnodion yn dal i gyfrif, ac yn cael eu hanfon pan fyddwch chi’n ôl ar-lein.',
    'A new race started on Monday': 'Dechreuodd ras newydd ddydd Llun', 'Everyone starts again at Swansea Marina.': 'Mae pawb yn dechrau eto ym Marina Abertawe.',
  'See last week&rsquo;s final standings': 'Gweld safleoedd terfynol yr wythnos diwethaf', 'Standings': 'Safleoedd',
  "The race shows here when you're online": 'Mae’r ras yn ymddangos yma pan fyddwch chi ar-lein',
      'The Bay Race: {h1}. Open the race.': 'Ras y Bae: {h1}. Agor y ras.',
  'point|points': { two:'bwynt', few:'phwynt', many:'phwynt', other:'pwynt' },
  '{n} point in all|{n} points in all': { two:'{n} bwynt i gyd', few:'{n} phwynt i gyd', many:'{n} phwynt i gyd', other:'{n} pwynt i gyd' },
  '{ord} this week': '{ord} yr wythnos hon',
  'Earned {date}': 'Enillwyd {date}',
  '<b>{got}</b> of {n} badges': '<b>{got}</b> o {n} bathodyn',
  'Badges are just for you. Nobody else sees them.': 'Mae bathodynnau i chi yn unig. Does neb arall yn eu gweld.',
  'for {n} check-ins': 'am {n} cofnod', 'for this check-in': 'am y cofnod hwn', 'daily goal bonus': 'bonws nod dyddiol', '{g} check-ins today': '{g} cofnod heddiw',
  'full week bonus': 'bonws wythnos lawn', 'your goal every day this week': 'eich nod bob dydd yr wythnos hon',
  "You've had today's {cap} counted check-ins.": 'Rydych chi wedi cael y {cap} cofnod sy’n cyfrif heddiw.',
  "Check-ins add points when they're at least {gap} minutes apart.": 'Mae cofnodion yn ennill pwyntiau pan fyddan nhw o leiaf {gap} munud ar wahân.',
  'Every answer still helps the study.': 'Mae pob ateb yn dal i helpu’r astudiaeth.',
  '{pts} this week': '{pts} yr wythnos hon', ' · {n}-day goal streak| · {n}-day goal streak': { two:' · nod {n} ddiwrnod yn olynol', other:' · nod {n} diwrnod yn olynol' },
  'New badge': 'Bathodyn newydd', 'You took the lead in the Bay Race': 'Rydych chi wedi mynd ar y blaen yn Ras y Bae',
  'You moved up to {ord} in the Bay Race': 'Rydych chi wedi codi i fod yn {ord} yn Ras y Bae', "You're {ord} in the Bay Race this week": 'Rydych chi’n {ord} yn Ras y Bae yr wythnos hon',
  'Every check-in': 'Pob cofnod',
  'A check-in counts when it is at least {gap} minutes after your last one. Up to {cap} a day count.': 'Mae cofnod yn cyfrif pan fydd o leiaf {gap} munud ar ôl eich un diwethaf. Mae hyd at {cap} y dydd yn cyfrif.',
  'Daily goal': 'Nod dyddiol', 'Reach {g} check-ins in a day. Days run from midnight to midnight, UK time.': 'Cyrhaeddwch {g} cofnod mewn diwrnod. Mae diwrnodau’n rhedeg o hanner nos i hanner nos, amser y DU.',
  'Full week': 'Wythnos lawn', 'Reach your daily goal on all seven days, Monday to Sunday.': 'Cyrhaeddwch eich nod dyddiol ar bob un o’r saith diwrnod, o ddydd Llun i ddydd Sul.',
  'Everyone in the study races along the bay from Swansea Marina to Mumbles lighthouse. Your daily goal every day takes you to the lighthouse by Sunday: that is {week} points. A new week starts every Monday and a new month on the 1st.':
    'Mae pawb yn yr astudiaeth yn rasio ar hyd y bae o Farina Abertawe i Oleudy’r Mwmbwls. Mae’ch nod dyddiol bob dydd yn mynd â chi i’r goleudy erbyn dydd Sul: dyna {week} pwynt. Mae wythnos newydd yn dechrau bob dydd Llun a mis newydd ar y 1af.',
  'Your name stays private': 'Mae’ch enw’n aros yn breifat', 'Badges': 'Bathodynnau',
  'Badges are small milestones, like your first check-in or a week of daily goals. They are just for you.': 'Cerrig milltir bach yw bathodynnau, fel eich cofnod cyntaf neu wythnos o nodau dyddiol. Maen nhw i chi yn unig.',
  'Every check-in helps the study, even one that adds no points.': 'Mae pob cofnod yn helpu’r astudiaeth, hyd yn oed un sydd ddim yn ychwanegu pwyntiau.',
  'Swansea Bay race map. You are {ord} of {total}.': 'Map ras Bae Abertawe. Rydych chi’n {ord} o {total}.',
  'Swansea Bay race map from Swansea Marina to Mumbles lighthouse.': 'Map ras Bae Abertawe o Farina Abertawe i Oleudy’r Mwmbwls.',

  /* the race, as game.js words it (week and month written out) */
  'Your next check-in starts the race this week': 'Bydd eich cofnod nesaf yn dechrau’r ras yr wythnos hon',
  'Your next check-in starts the race this month': 'Bydd eich cofnod nesaf yn dechrau’r ras y mis hwn',
  '{n} runner this week|{n} runners this week': { two:'{n} redwr yr wythnos hon', other:'{n} rhedwr yr wythnos hon' },
  '{n} runner this month|{n} runners this month': { two:'{n} redwr y mis hwn', other:'{n} rhedwr y mis hwn' },
  'Just you so far this week': 'Dim ond chi hyd yma yr wythnos hon', 'Just you so far this month': 'Dim ond chi hyd yma y mis hwn',
  '{pts} and the bay to yourself': '{pts} a’r bae i gyd i chi',
  'You share the lead this week': 'Rydych chi’n rhannu’r blaen yr wythnos hon', 'You share the lead this month': 'Rydych chi’n rhannu’r blaen y mis hwn',
  "You're in the lead this week": 'Chi sydd ar y blaen yr wythnos hon', "You're in the lead this month": 'Chi sydd ar y blaen y mis hwn',
  "You're {ord} of {total} this week": 'Rydych chi’n {ord} o {total} yr wythnos hon', "You're {ord} of {total} this month": 'Rydych chi’n {ord} o {total} y mis hwn',
  "You're joint {ord} of {total} this week": 'Rydych chi’n gydradd {ord} o {total} yr wythnos hon', "You're joint {ord} of {total} this month": 'Rydych chi’n gydradd {ord} o {total} y mis hwn',
  'points this week': 'pwynt yr wythnos hon', 'points this month': 'pwynt y mis hwn', 'points last week': 'pwynt yr wythnos diwethaf',
  'You race as {av}<b>{alias}</b>, a Welsh wildlife name picked at random.': 'Rydych chi’n rasio fel {av}<b>{alias}</b>, enw o fyd natur Cymru a ddewiswyd ar hap.',
  '{runners} · finish at {target}': '{runners} · gorffen ar {target}',
  "A new race started on Monday. {line}. See last week's final standings.": 'Dechreuodd ras newydd ddydd Llun. {line}. Gweld safleoedd terfynol yr wythnos diwethaf.',
  "A new race started on Monday. See last week's final standings.": 'Dechreuodd ras newydd ddydd Llun. Gweld safleoedd terfynol yr wythnos diwethaf.',
  '{line} &middot; see the final standings': '{line} &middot; gweld y safleoedd terfynol',
  '{n} point in all, {ord} in the Bay Race this week|{n} points in all, {ord} in the Bay Race this week':
    { two:'{n} bwynt i gyd, {ord} yn Ras y Bae yr wythnos hon', few:'{n} phwynt i gyd, {ord} yn Ras y Bae yr wythnos hon', many:'{n} phwynt i gyd, {ord} yn Ras y Bae yr wythnos hon', other:'{n} pwynt i gyd, {ord} yn Ras y Bae yr wythnos hon' },
  'The Bay Race · this week': 'Ras y Bae · yr wythnos hon', 'The Bay Race · last week': 'Ras y Bae · yr wythnos diwethaf', 'The Bay Race · this month': 'Ras y Bae · y mis hwn',
  'In the race you appear as a Welsh wildlife name picked at random, like Puffin or Grey Seal. Nobody else sees your name, your code or your answers.':
    'Yn y ras, byddwch chi’n ymddangos dan enw o fyd natur Cymru a ddewiswyd ar hap, fel Pâl neu Forlo Llwyd. Does neb arall yn gweld eich enw, eich cod na’ch atebion.',
  'Next badge: {name} · {n} to go': 'Bathodyn nesaf: {name} · {n} i fynd',
  '{h} of {n}': '{h} o {n}',

  /* the 36 badges: groups, names (the Welsh-named ones keep their names), what each was for, how to earn it, progress */
  'Getting started': 'Dechrau arni', 'Good days': 'Diwrnodau da', 'Streaks': 'Rhediadau', 'Full weeks': 'Wythnosau llawn',
  'Times of day': 'Adegau o’r dydd', 'Taking part': 'Cymryd rhan', 'Season': 'Y tymor',
  'Croeso!': 'Croeso!', 'Da iawn!': 'Da iawn!', 'Nadolig Llawen': 'Nadolig Llawen', 'Blwyddyn Newydd Dda': 'Blwyddyn Newydd Dda', 'Diolch!': 'Diolch!',
  'Your first check-in, welcome to the study.': 'Eich cofnod cyntaf, croeso i’r astudiaeth.', 'Do your first check-in.': 'Gwnewch eich cofnod cyntaf.',
  'Your first day with {g} check-ins.': 'Eich diwrnod cyntaf â {g} cofnod.', 'Check in {g} times in one day.': 'Cofnodwch {g} gwaith mewn un diwrnod.',
  'Your daily goal every day from Monday to Sunday.': 'Eich nod dyddiol bob dydd o ddydd Llun i ddydd Sul.',
  'Reach your daily goal every day from Monday to Sunday.': 'Cyrhaeddwch eich nod dyddiol bob dydd o ddydd Llun i ddydd Sul.',
  'Ten up': 'Y deg cyntaf', 'Twenty-five': 'Pump ar hugain', 'Half century': 'Hanner cant', 'Seventy-five': 'Saith deg pump',
  'Centurion': 'Canwriad', 'Hundred and fifty': 'Cant a hanner', 'Double century': 'Dau gant',
  '10 check-ins.': '10 cofnod.', '25 check-ins.': '25 cofnod.', '50 check-ins.': '50 cofnod.', '75 check-ins.': '75 cofnod.',
  '100 check-ins.': '100 cofnod.', '150 check-ins.': '150 cofnod.', '200 check-ins.': '200 cofnod.',
  'Reach 10 check-ins.': 'Cyrhaeddwch 10 cofnod.', 'Reach 25 check-ins.': 'Cyrhaeddwch 25 cofnod.', 'Reach 50 check-ins.': 'Cyrhaeddwch 50 cofnod.',
  'Reach 75 check-ins.': 'Cyrhaeddwch 75 cofnod.', 'Reach 100 check-ins.': 'Cyrhaeddwch 100 cofnod.', 'Reach 150 check-ins.': 'Cyrhaeddwch 150 cofnod.',
  'Reach 200 check-ins.': 'Cyrhaeddwch 200 cofnod.',
  'Five good days': 'Pum diwrnod da', 'Ten good days': 'Deg diwrnod da', 'Twenty good days': 'Ugain diwrnod da', 'Every single day': 'Pob un diwrnod',
  'Your daily goal on 5 days.': 'Eich nod dyddiol ar 5 diwrnod.', 'Your daily goal on 10 days.': 'Eich nod dyddiol ar 10 diwrnod.',
  'Your daily goal on 20 days.': 'Eich nod dyddiol ar 20 diwrnod.', 'Your daily goal on 31 days.': 'Eich nod dyddiol ar 31 diwrnod.',
  'Reach your daily goal on 5 different days.': 'Cyrhaeddwch eich nod dyddiol ar 5 diwrnod gwahanol.',
  'Reach your daily goal on 10 different days.': 'Cyrhaeddwch eich nod dyddiol ar 10 diwrnod gwahanol.',
  'Reach your daily goal on 20 different days.': 'Cyrhaeddwch eich nod dyddiol ar 20 diwrnod gwahanol.',
  'Reach your daily goal on 31 different days.': 'Cyrhaeddwch eich nod dyddiol ar 31 diwrnod gwahanol.',
  'Three in a row': 'Tri yn olynol', 'A week in a row': 'Wythnos yn olynol', 'Two weeks in a row': 'Pythefnos yn olynol',
  'Three weeks in a row': 'Tair wythnos yn olynol', 'The whole month': 'Y mis cyfan',
  'Your daily goal three days running.': 'Eich nod dyddiol dri diwrnod yn olynol.', 'Reach your daily goal three days in a row.': 'Cyrhaeddwch eich nod dyddiol dri diwrnod yn olynol.',
  'Your daily goal seven days running.': 'Eich nod dyddiol saith diwrnod yn olynol.', 'Reach your daily goal seven days in a row.': 'Cyrhaeddwch eich nod dyddiol saith diwrnod yn olynol.',
  'Your daily goal fourteen days running.': 'Eich nod dyddiol 14 diwrnod yn olynol.', 'Reach your daily goal fourteen days in a row.': 'Cyrhaeddwch eich nod dyddiol 14 diwrnod yn olynol.',
  'Your daily goal twenty-one days running.': 'Eich nod dyddiol 21 diwrnod yn olynol.', 'Reach your daily goal twenty-one days in a row.': 'Cyrhaeddwch eich nod dyddiol 21 diwrnod yn olynol.',
  'Your daily goal thirty-one days running.': 'Eich nod dyddiol 31 diwrnod yn olynol.', 'Reach your daily goal thirty-one days in a row.': 'Cyrhaeddwch eich nod dyddiol 31 diwrnod yn olynol.',
  'Two full weeks': 'Dwy wythnos lawn', 'Three full weeks': 'Tair wythnos lawn', 'Lighthouse keeper': 'Ceidwad y Goleudy',
  'Your daily goal every day of two weeks, Monday to Sunday.': 'Eich nod dyddiol bob dydd am ddwy wythnos, o ddydd Llun i ddydd Sul.',
  'Reach your daily goal every day of two weeks, Monday to Sunday.': 'Cyrhaeddwch eich nod dyddiol bob dydd am ddwy wythnos, o ddydd Llun i ddydd Sul.',
  'Your daily goal every day of three weeks, Monday to Sunday.': 'Eich nod dyddiol bob dydd am dair wythnos, o ddydd Llun i ddydd Sul.',
  'Reach your daily goal every day of three weeks, Monday to Sunday.': 'Cyrhaeddwch eich nod dyddiol bob dydd am dair wythnos, o ddydd Llun i ddydd Sul.',
  'Your daily goal every day of four weeks, Monday to Sunday.': 'Eich nod dyddiol bob dydd am bedair wythnos, o ddydd Llun i ddydd Sul.',
  'Reach your daily goal every day of four weeks, Monday to Sunday.': 'Cyrhaeddwch eich nod dyddiol bob dydd am bedair wythnos, o ddydd Llun i ddydd Sul.',
  'Early bird': 'Aderyn cynnar', 'A check-in before 08:00.': 'Cofnod cyn 08:00.', 'Check in before 08:00 in the morning.': 'Cofnodwch cyn 08:00 yn y bore.',
  'Night owl': 'Tylluan nos', 'A check-in after 22:00.': 'Cofnod ar ôl 22:00.', 'Check in after 22:00 at night.': 'Cofnodwch ar ôl 22:00 yn y nos.',
  'Morning, noon and night': 'Bore, prynhawn a nos',
  'Check-ins in the morning, the afternoon and the evening of one day.': 'Cofnodion yn y bore, y prynhawn a’r hwyr ar un diwrnod.',
  'On one day, check in before 12:00, between 12:00 and 17:00, and after 17:00.': 'Ar un diwrnod, cofnodwch cyn 12:00, rhwng 12:00 a 17:00, ac ar ôl 17:00.',
  'Round the clock': 'Rownd y cloc', 'Check-ins in 12 different hours of the day.': 'Cofnodion mewn 12 awr wahanol o’r dydd.',
  'Check in during 12 different hours of the day.': 'Cofnodwch yn ystod 12 awr wahanol o’r dydd.',
  'Weekend warrior': 'Arwr y penwythnos', 'Your daily goal on both days of a weekend.': 'Eich nod dyddiol ar ddau ddiwrnod y penwythnos.',
  'Reach your daily goal on a Saturday and the Sunday after it.': 'Cyrhaeddwch eich nod dyddiol ar ddydd Sadwrn a’r dydd Sul wedyn.',
  'Quick reply': 'Ateb sydyn', '10 check-ins started from a reminder.': '10 cofnod wedi’u dechrau o nodyn atgoffa.', 'Start 10 check-ins from a reminder.': 'Dechreuwch 10 cofnod o nodyn atgoffa.',
  'On the ball': 'Ar flaenau’ch traed', '50 check-ins started from a reminder.': '50 cofnod wedi’u dechrau o nodyn atgoffa.', 'Start 50 check-ins from a reminder.': 'Dechreuwch 50 cofnod o nodyn atgoffa.',
  'Rain or shine': 'Glaw neu hindda', 'Check-ins on 10 different days.': 'Cofnodion ar 10 diwrnod gwahanol.', 'Check in on 10 different days.': 'Cofnodwch ar 10 diwrnod gwahanol.',
  'Fortnight': 'Pythefnos', 'Check-ins on 14 different days.': 'Cofnodion ar 14 diwrnod gwahanol.', 'Check in on 14 different days.': 'Cofnodwch ar 14 diwrnod gwahanol.',
  'Wall watcher': 'Gwyliwr waliau', 'You answered the outside wall question 10 times.': 'Fe atebsoch chi’r cwestiwn am y wal allanol 10 gwaith.',
  'Answer the outside wall question 10 times.': 'Atebwch y cwestiwn am y wal allanol 10 gwaith.',
  'Midwinter': 'Canol Gaeaf', 'A check-in on 21 December, the shortest day.': 'Cofnod ar 21 Rhagfyr, y dydd byrraf.', 'Check in on 21 December.': 'Cofnodwch ar 21 Rhagfyr.',
  'A check-in on Christmas Day.': 'Cofnod ar Ddydd Nadolig.', 'Check in on 25 December.': 'Cofnodwch ar 25 Rhagfyr.',
  "A check-in on New Year's Day.": 'Cofnod ar Ddydd Calan.', 'Check in on 1 January.': 'Cofnodwch ar 1 Ionawr.',
  'A check-in on the last day of the study.': 'Cofnod ar ddiwrnod olaf yr astudiaeth.',
  'Check in on {date}, the last day of the study.': 'Cofnodwch ar {date}, diwrnod olaf yr astudiaeth.', 'Check in on the last day of the study.': 'Cofnodwch ar ddiwrnod olaf yr astudiaeth.',
  '{h} of {n} check-ins': '{h} o {n} cofnod', '{h} of {n} good days': '{h} o {n} diwrnod da', '{h} of {n} days in a row': '{h} o {n} diwrnod yn olynol',
  '{h} of {n} full weeks': '{h} o {n} wythnos lawn', '{h} of {n} hours of the day': '{h} o {n} awr o’r dydd', '{h} of {n} from a reminder': '{h} o {n} o nodyn atgoffa',
  '{h} of {n} days': '{h} o {n} diwrnod', '{h} of {n} answers': '{h} o {n} ateb',
  '{t} of {g} today': '{t} o {g} heddiw',
  'Would you like to be': 'Hoffech chi fod',

  /* the reminder itself (sw.js keeps its own copy of these four) */
  'HomePulse: how does your home feel?': 'HomePulse: sut mae’ch cartref yn teimlo?'
};

/* The runners' animal names: the database keeps the English (Red Kite, Red Kite 2); the Welsh app shows these. */
const ALIAS_CY = {
  'Red Kite':'Barcud Coch', 'Puffin':'Pâl', 'Otter':'Dyfrgi', 'Grey Seal':'Morlo Llwyd', 'Dolphin':'Dolffin', 'Curlew':'Gylfinir',
  'Kingfisher':'Glas y Dorlan', 'Badger':'Mochyn Daear', 'Brown Hare':'Ysgyfarnog', 'Heron':'Crëyr Glas', 'Oystercatcher':'Pioden y Môr',
  'Barn Owl':'Tylluan Wen', 'Pine Marten':'Bele’r Coed', 'Red Fox':'Cadno', 'Wren':'Dryw', 'Robin':'Robin Goch', 'Gannet':'Hugan',
  'Peregrine':'Hebog Tramor', 'Salmon':'Eog', 'Dragonfly':'Gwas y Neidr', 'Chough':'Brân Goesgoch', 'Shearwater':'Aderyn Drycin',
  'Hedgehog':'Draenog', 'Red Squirrel':'Gwiwer Goch', 'Gower Pony':'Merlen Gŵyr', 'Lapwing':'Cornchwiglen', 'Skylark':'Ehedydd',
  'Mute Swan':'Alarch Dof', 'Seahorse':'Morfarch', 'Cormorant':'Mulfran', 'Kestrel':'Cudyll Coch', 'Buzzard':'Bwncath', 'Dipper':'Bronwen y Dŵr',
  'Stoat':'Carlwm', 'Osprey':'Gwalch y Pysgod', 'Merlin':'Cudyll Bach', 'Swallow':'Gwennol', 'Dormouse':'Pathew', 'Porpoise':'Llamhidydd', 'Razorbill':'Llurs'
};
