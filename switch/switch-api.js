/* HomePulse (the SWITCH home comfort study, Swansea) - shared data layer, window.SWITCH.
 * Talks to Supabase through its REST and Auth endpoints with plain fetch, so no library is needed.
 * Loaded after config.js by /switch/checkin/ and /switch/dashboard/. Everything this study keeps in the
 * browser is under keys starting "switch_".
 *
 * Every database function named below is defined in switch/supabase-setup.sql.
 *
 * ---- general ------------------------------------------------------------------------------------
 *   live, cfg                         true when config.js names a Supabase project; the config object
 *   participant()                     code from ?p= (stored) or the one remembered on this phone, or null
 *   setParticipant(code)              remembers the code (upper-cased)
 *   validCode(code)                   true for P01, P99, P100 ...
 *   toRecord(row, participant)        a check-in row (phone shape) -> the database row: exactly client_id,
 *                                     participant, ts, local_time, tz_offset_min, prompt, at_home, tsv,
 *                                     preference, acceptability, clo, garments, met, activity, room, air, sun,
 *                                     heating_on, heating_src, heating_for, stat_temp_c, wall, actions, notes,
 *                                     same_as_last, seconds, app_version. Reads the phone's answer keys (id,
 *                                     type, home, tsv, tp, ta, clo, garments, act, met, room, air, sun, heat,
 *                                     heat_src, heat_for, stat, wall, actions, notes, same, secs) and also
 *                                     accepts the database names. A skipped step is null, never []:
 *                                     heating_src/heating_for are null unless heating_on is 'on' (and
 *                                     heating_src null when the answer is missing); stat_temp_c null when not
 *                                     asked or not seen. A list that was asked and left empty stays [].
 *   fromRecord(rec)                   the inverse: a database row (my_checkins) -> phone row shape, keeping
 *                                     created_at (when the database received it; the points rules use it)
 *
 * ---- points (the same rules as sw_points() in supabase-setup.sql; config.js points/checkinGapMin/
 *      dailyGoal/timeZone must match the SQL) -----------------------------------------------------
 *   rules()                           { gap, goal, checkin, goalDay, fullWeek, cap, zone }
 *   dayOf(ts)                         'YYYY-MM-DD' of a moment on the UK clock
 *   score(rows, now?)                 rows: one participant's check-ins (any shape with ts, and client_id or
 *                                     id, and created_at once the database has it). Returns { counted:
 *                                     Set(ids), byDay: {day: {checkins, counted}}, goalDays: [day...],
 *                                     fullWeeks: [sunday...] }. A row with created_at scores only when
 *                                     created_at - 48 h <= ts <= created_at + 5 min (as the SQL); a row
 *                                     without it (made here, not synced yet) only needs ts <= now + 5 min
 *   pointsIn(score, from, to)         { checkins, counted, goal_days, full_weeks, points } for days from..to
 *                                     ('YYYY-MM-DD', either may be null = open); full weeks count in the
 *                                     period that holds their Sunday
 *   period(kind, now?)                kind 'week' | 'last_week' (the Monday to Sunday before) | 'month'
 *                                     -> { period, from, to, target }; anything else is 'week'
 *   myPointsLocal(rows, now?)         { all_time, week, last_week, month, checkins_counted, goal_days, streak }, the
 *                                     same shape as myPoints() (streak: goal days in a row up to today, or
 *                                     up to yesterday while today has not reached the goal yet)
 *
 * ---- participant side (publishable key; "key" = this device's key from joining or signing in) ----
 *   key(), setKey(k)                  this device's key in localStorage switch_key (setKey(null) removes it)
 *   register(fields)                  register_participant. fields: email, pin, name, gender, birth_year,
 *                                     height_cm, weight_kg, sensitivity, home (object). -> outcome row
 *                                     { status, tries_left, wait_min, code, name, is_new, approved, home,
 *                                     device_key, pin_set, alias }; an email already registered is a sign-in.
 *                                     Rejects with the database's message (err.code '22023') for values it refuses.
 *   signIn(email, pin, code?)         participant_sign_in -> the same row. status:
 *                                       ok          signed in (pin_set true: this PIN has just become theirs)
 *                                       wrong       wrong PIN, tries_left before the lock
 *                                       locked      wait_min minutes (15, then 60, then 1440 after repeated locks)
 *                                       pin_needed  pin missing or not 4 digits (answered for ANY email, so it
 *                                                   says nothing about whether the email is registered)
 *                                       code_needed the participant has no PIN yet (joined with 0.4.0, or the
 *                                                   team reset it): call again with code = their participant
 *                                                   code (P07). tries_left null: no code was sent; a number: the
 *                                                   code sent was wrong (one try counted)
 *                                       weak_pin    the code was right but the new PIN is too easy (nothing stored)
 *                                       not_found   no participant with that email (only after a 4-digit PIN)
 *                                     register() can answer weak_pin too (and code_needed for an email that is
 *                                     registered but has no PIN).
 *   myProfile()                       my_profile -> { code, name, approved, gender, birth_year, height_cm,
 *                                     weight_kg, sensitivity, home, alias, alias_colour, race_hidden } or null
 *   updateMyProfile(fields, home)     update_my_profile; fields: any of name, gender, birth_year, height_cm,
 *                                     weight_kg, sensitivity (only keys given change); home: the whole profile
 *                                     object, or null to leave it. -> the my_profile row. 22023 with a message
 *   myCheckins()                      my_checkins -> every check-in of this participant from all devices,
 *                                     newest first, database row shape (all toRecord fields but participant,
 *                                     plus created_at), read 1000 at a time until a short page (the API's
 *                                     "max rows"), one row per client_id
 *   myPoints()                        my_points -> { all_time, week, last_week, month, checkins_counted, goal_days,
 *                                     streak }
 *   race(period)                      race('week' | 'last_week' | 'month') -> { period, from, to, target, total,
 *                                     me: { alias, colour, points, rank, hidden },
 *                                     runners: [{ alias, colour, points, checkins, goal_days, rank, is_me }] }
 *                                     (not approved yet: runners [], total 0, me.rank null)
 *   setRaceHidden(hidden)             set_race_hidden -> the stored value (boolean)
 *     All keyed calls above reject with err.notSignedIn = true when there is no key, the key no longer
 *     works (the database answers code 28000: signed out elsewhere, removed), or the app is in local mode.
 *     Any other refusal (a 401 from the gateway for a bad publishable key, a missing grant 42501, a 5xx)
 *     rejects WITHOUT notSignedIn, with err.status and err.code: keep the key and the queue.
 *   forgetDevice()                    forget_device: this key stops working on the server (never rejects)
 *   insert(record)                    submit_checkin -> { ok, status, verdict }. verdict ok | duplicate (a
 *                                     retry of a row already saved: also ok) | not_signed_in | not_approved |
 *                                     invalid. A refused HTTP request gives { ok:false, status, text } with no
 *                                     verdict (a 401 there can be a bad publishable key: keep the row).
 *                                     A network failure rejects.
 *   pending(), queue(record)          the offline queue in localStorage switch_pending (records from toRecord)
 *   flush()                           sends the queue (simple form; the app runs its own loop): only rows
 *                                     answered ok or duplicate leave it -> number sent
 *   approval(code)                    participant_status -> { approved } | null (code unknown); rejects on failure
 *   saveSubscription(record)          save_push_subscription with this device's key. record: endpoint, p256dh,
 *                                     auth, tz, tz_offset_min, the 8 hour fields, interval_min, user_agent.
 *                                     -> true | 'not_signed_in' (no key / key unknown) | 'refused' (not
 *                                     approved) | 'invalid' (not a push service, bad hours) | 'full' (10
 *                                     phones: only a database not yet updated for round 3 answers this; since
 *                                     then an eleventh phone replaces the participant's least recently used
 *                                     one and the answer is true) | false (unreachable)
 *   updateSchedule(endpoint, changes) update_push_schedule -> { found:true, enabled, paused_until,
 *                                     settled_at } | { found:false } | null (unreachable or refused)
 *
 * ---- research side (dashboard; token = the researcher's access token from login) ---------------
 *   login(email, password)            -> { access_token, refresh_token, expires_in, user }; rejects with a message
 *   refresh(refreshToken)             -> the same shape, a fresh access token
 *   logout(token)                     ends the session at Supabase (never rejects)
 *   changePassword(token, password)   -> true; rejects with Supabase's message
 *   fetchAll(token)                   every check-in, newest first (order ts.desc,id.desc), page by page until
 *                                     an empty page, one row per client_id
 *   fetchParticipants(token)          participants (select=*, order code). Rejects on any error, never []
 *   fetchPush(token)                  registered phones: participant, enabled, paused_until, settled_at,
 *                                     last_prompt_at, last_vote_at, tz, the 8 hour fields, user_agent,
 *                                     created_at, updated_at (never the endpoint or its keys). Rejects on error
 *   signInInfo(token)                 participant_sign_in_info -> Map code -> { code, pin_set, locked, devices,
 *                                     last_seen }. Rejects on error
 *   resetPin(token, code)             reset_participant_pin -> true if a PIN was cleared
 *   signOutDevices(token, code)       sign_out_devices -> number of devices signed out
 *   approve(token, code)              PATCH approved = true -> true if the row exists (setApproval(token,
 *                                     code, approved) is the general form)
 *   remove(token, code)               deletes the phones, then the participant (PIN and devices go with it);
 *                                     check-ins are kept -> true if the participant row was deleted
 *                                     (removeParticipant is the same function)
 *   pointsTable(token, from, to)      points_table('YYYY-MM-DD' or null, ...) -> [{ code, alias, race_hidden,
 *                                     approved, checkins, counted, goal_days, full_weeks, points }]
 *   localRows()                       local mode: this browser's check-ins as database rows
 * Research calls reject with an Error whose message says what to do (401: "Your session has expired";
 * a missing column or function: run supabase-setup.sql again).
 */
(function () {
  const cfg = window.SWITCH_CONFIG || {};
  const live = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const table = cfg.table || 'comfort_votes';
  const pushTable = cfg.pushTable || 'push_subscriptions';
  const base = (cfg.supabaseUrl || '').replace(/\/$/, '');
  const rest = path => base + '/rest/v1/' + path;
  const auth = path => base + '/auth/v1/' + path;
  const headers = extra => Object.assign({ apikey: cfg.supabaseAnonKey, 'Content-Type': 'application/json' }, extra || {});
  const bearer = (token, extra) => headers(Object.assign({ Authorization: 'Bearer ' + token }, extra || {}));
  const LS = {
    get(k, fallback) { try { const v = localStorage.getItem(k); return v === null ? fallback : v; } catch (e) { return fallback; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const KEY_KEY = 'switch_key';   // this device's key: given by joining or signing in with email and PIN
  const pad = n => String(n).padStart(2, '0');
  const MIN = 60000, DAY_MS = 86400000;

  /* Turns a failed request into an Error that says what the server said. A 401 keeps its wording (the
   * dashboard sends the researcher back to sign in). When the message is about a column, function or
   * table the database does not have, supabase-setup.sql has not been run again since that feature was
   * added, and the message opens with exactly that, because it is what the researcher has to do.
   * Postgres: 42703 undefined column, 42883 undefined function, 42P01 undefined table.
   * PostgREST: PGRST202 function, PGRST204 column and PGRST205 table missing from the schema cache. */
  async function writeError(r, what) {
    if (r.status === 401) return new Error('Your session has expired, please sign in again');
    const j = await r.json().catch(() => null);
    const msg = String((j && (j.message || j.hint || j.error_description || j.msg || j.error)) || '').trim();
    const code = String((j && j.code) || '');
    const missing = /^(42703|42883|42P01|PGRST20[245])$/.test(code) || (/column|function|table|relation/i.test(msg) && /does not exist|could not find/i.test(msg));
    return new Error((missing ? 'The database has not been updated yet: run supabase-setup.sql again in Supabase. ' : '') + what + ' (' + r.status + ')' + (msg ? ': ' + msg : ''));
  }
  const notSignedIn = () => { const e = new Error('This device is not signed in'); e.notSignedIn = true; return e; };
  const first = j => Array.isArray(j) ? (j[0] || null) : (j || null);
  const has = (o, k) => o != null && Object.prototype.hasOwnProperty.call(o, k);
  const pick = (o, a, b) => has(o, a) ? o[a] : has(o, b) ? o[b] : undefined;
  const nul = v => v === undefined ? null : v;

  /* ---- the UK calendar: days and Monday-to-Sunday weeks on the study's clock ---- */
  const dayFmt = {};
  function dayOf(ts, zone) {
    zone = zone || cfg.timeZone || 'Europe/London';
    if (!dayFmt[zone]) dayFmt[zone] = new Intl.DateTimeFormat('en-GB', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' });
    const p = {}; for (const x of dayFmt[zone].formatToParts(new Date(ts))) p[x.type] = x.value;
    return `${p.year}-${p.month}-${p.day}`;
  }
  const addDays = (day, n) => new Date(Date.parse(day + 'T00:00:00Z') + n * DAY_MS).toISOString().slice(0, 10);
  const isoDow = day => { const d = new Date(day + 'T00:00:00Z').getUTCDay(); return d === 0 ? 7 : d; };   // Monday 1 ... Sunday 7
  const mondayOf = day => addDays(day, 1 - isoDow(day));
  const inRange = (day, from, to) => (!from || day >= from) && (!to || day <= to);

  const S = {
    live, cfg,

    /* ---- participant identity: ?p=P07 in the link (testing), remembered on the phone ---- */
    participant() {
      const p = (new URL(location.href).searchParams.get('p') || '').trim().toUpperCase();
      if (p) { LS.set('switch_participant', p); return p; }
      return LS.get('switch_participant', null);
    },
    setParticipant(p) { LS.set('switch_participant', String(p).trim().toUpperCase()); },
    validCode: p => /^P\d{2,}$/.test(p || ''),

    /* ---- one check-in row, in the shape of the database table ---- */
    toRecord(row, participant) {
      const d = new Date(row.ts);
      const heatingOn = nul(pick(row, 'heat', 'heating_on'));
      const on = heatingOn === 'on';
      const stat = pick(row, 'stat', 'stat_temp_c');
      return {
        client_id: nul(pick(row, 'id', 'client_id')),
        participant,
        ts: row.ts,
        local_time: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`,
        tz_offset_min: -d.getTimezoneOffset(),
        prompt: nul(pick(row, 'type', 'prompt')),
        at_home: nul(pick(row, 'home', 'at_home')),
        tsv: nul(row.tsv),
        preference: nul(pick(row, 'tp', 'preference')),
        acceptability: nul(pick(row, 'ta', 'acceptability')),
        clo: nul(row.clo),
        garments: row.garments || [],
        met: nul(row.met),
        activity: nul(pick(row, 'act', 'activity')),
        room: nul(row.room),
        air: nul(row.air),
        sun: nul(row.sun),
        heating_on: heatingOn,
        heating_src: on ? nul(pick(row, 'heat_src', 'heating_src')) : null,   // null when the step was skipped; [] only when asked and left empty
        heating_for: on ? nul(pick(row, 'heat_for', 'heating_for')) : null,
        stat_temp_c: stat === undefined || stat === null || stat === '' || isNaN(+stat) ? null : Math.round(+stat * 10) / 10,
        wall: nul(row.wall),
        actions: nul(row.actions),
        notes: nul(row.notes),
        same_as_last: !!pick(row, 'same', 'same_as_last'),
        seconds: nul(pick(row, 'secs', 'seconds')),
        app_version: pick(row, 'v', 'app_version') || cfg.appVersion || ''
      };
    },
    fromRecord(r) {
      const num = v => v === null || v === undefined || v === '' ? null : +v;
      return {
        id: r.client_id, ts: r.ts, type: r.prompt || 'self', home: r.at_home || null,
        tsv: num(r.tsv), tp: r.preference || null, ta: r.acceptability || null,
        clo: num(r.clo), garments: r.garments || [], act: r.activity || null, met: num(r.met), room: r.room || null,
        air: r.air || null, sun: r.sun || null,
        heat: r.heating_on || null, heat_src: r.heating_src || null, heat_for: r.heating_for || null,
        stat: num(r.stat_temp_c), wall: r.wall || null,
        actions: r.actions || [], notes: r.notes || [], same: !!r.same_as_last, secs: num(r.seconds),
        v: r.app_version || null, created_at: r.created_at || null
      };
    },

    /* ---- points: the same rules as sw_points() in supabase-setup.sql ---- */
    rules() {
      const p = cfg.points || {};
      return { gap: cfg.checkinGapMin || 45, goal: cfg.dailyGoal || 4, checkin: p.checkin ?? 10, goalDay: p.goalDay ?? 20,
        fullWeek: p.fullWeek ?? 50, cap: p.dailyCap ?? 15, zone: cfg.timeZone || 'Europe/London' };
    },
    dayOf: ts => dayOf(ts),
    // A check-in counts when it is at least `gap` minutes after the participant's previous check-in (any
    // row), not more than 5 minutes in the future, arrived on time (with created_at: ts from created_at - 48 h
    // to created_at + 5 min; a row the database has not seen yet has no created_at and skips this), and is
    // among the first `cap` counted ones of its UK day.
    score(rows, now) {
      const R = S.rules(), lim = (now ? +new Date(now) : Date.now()) + 5 * MIN;
      const list = (rows || []).filter(r => r && r.ts && !isNaN(Date.parse(r.ts)))
        .map(r => ({ id: has(r, 'client_id') ? r.client_id : r.id, t: Date.parse(r.ts), ca: r.created_at ? Date.parse(r.created_at) : NaN }))
        .sort((a, b) => a.t - b.t || (String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0));
      const counted = new Set(), byDay = {};
      let prev = null;
      for (const x of list) {
        const day = dayOf(x.t, R.zone), d = byDay[day] || (byDay[day] = { checkins: 0, counted: 0 });
        d.checkins++;
        const onTime = isNaN(x.ca) || (x.t >= x.ca - 48 * 60 * MIN && x.t <= x.ca + 5 * MIN);
        if ((prev === null || x.t - prev >= R.gap * MIN) && x.t <= lim && onTime && d.counted < R.cap) { d.counted++; counted.add(x.id); }
        prev = x.t;
      }
      const goalDays = Object.keys(byDay).filter(k => byDay[k].counted >= R.goal).sort();
      const goal = new Set(goalDays), weeks = new Set();
      for (const day of goalDays) {
        const mon = mondayOf(day);
        if (!weeks.has(mon) && [0, 1, 2, 3, 4, 5, 6].every(i => goal.has(addDays(mon, i)))) weeks.add(mon);
      }
      return { counted, byDay, goalDays, fullWeeks: [...weeks].map(m => addDays(m, 6)).sort() };
    },
    pointsIn(sc, from, to) {
      const R = S.rules(), out = { checkins: 0, counted: 0, goal_days: 0, full_weeks: 0, points: 0 };
      for (const [day, d] of Object.entries(sc.byDay)) {
        if (!inRange(day, from, to)) continue;
        out.checkins += d.checkins; out.counted += d.counted; if (d.counted >= R.goal) out.goal_days++;
      }
      out.full_weeks = sc.fullWeeks.filter(s => inRange(s, from, to)).length;
      out.points = out.counted * R.checkin + out.goal_days * R.goalDay + out.full_weeks * R.fullWeek;
      return out;
    },
    period(kind, now) {
      const R = S.rules(), today = dayOf(now ? new Date(now) : new Date(), R.zone), perDay = R.goal * R.checkin + R.goalDay;
      if (kind === 'month') {
        const from = today.slice(0, 8) + '01';
        const to = addDays(new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7), 1)).toISOString().slice(0, 10), -1);
        let days = 0, sundays = 0;
        for (let d = from; d <= to; d = addDays(d, 1)) { days++; if (isoDow(d) === 7) sundays++; }
        return { period: 'month', from, to, target: days * perDay + sundays * R.fullWeek };
      }
      const from = addDays(mondayOf(today), kind === 'last_week' ? -7 : 0);
      return { period: kind === 'last_week' ? 'last_week' : 'week', from, to: addDays(from, 6), target: 7 * perDay + R.fullWeek };
    },
    myPointsLocal(rows, now) {
      const R = S.rules(), sc = S.score(rows, now), w = S.period('week', now), lw = S.period('last_week', now), m = S.period('month', now);
      const all = S.pointsIn(sc, null, null), today = dayOf(now ? new Date(now) : new Date(), R.zone);
      const goal = new Set(sc.goalDays);
      let d = goal.has(today) ? today : addDays(today, -1), streak = 0;
      while (goal.has(d)) { streak++; d = addDays(d, -1); }
      return { all_time: all.points, week: S.pointsIn(sc, w.from, w.to).points, last_week: S.pointsIn(sc, lw.from, lw.to).points, month: S.pointsIn(sc, m.from, m.to).points,
        checkins_counted: all.counted, goal_days: all.goal_days, streak };
    },

    /* ---- this device's key (see "One participant on any number of devices" in supabase-setup.sql) ---- */
    key() { return LS.get(KEY_KEY, null); },
    setKey(k) { if (k) LS.set(KEY_KEY, k); else LS.del(KEY_KEY); },

    /* ---- participant side: save with an offline queue ----
     * One check-in through submit_checkin() with this device's key; the database files it under the
     * key's participant (the record's own participant field is ignored there). */
    async insert(record) {
      if (!live) return { ok: false, status: 0 };
      const key = S.key();
      if (!key) return { ok: false, status: 0, verdict: 'not_signed_in' };
      const rec = Object.assign({}, record);
      // Not columns: what an older version or the Undo hold may have left on a queued row.
      ['comfort', 'comfort_score', 'humidity', 'air_pref', 'hold_until'].forEach(k => { delete rec[k]; });
      const r = await fetch(rest('rpc/submit_checkin'), { method: 'POST', headers: headers(), body: JSON.stringify({ p_key: key, p_row: rec }) });
      if (!r.ok) return { ok: false, status: r.status, text: await r.text() };
      const verdict = await r.json().catch(() => null);
      return { ok: verdict === 'ok' || verdict === 'duplicate', status: r.status, verdict };
    },
    pending() { try { return JSON.parse(LS.get('switch_pending', '[]')); } catch (e) { return []; } },
    queue(record) { const q = S.pending(); q.push(record); LS.set('switch_pending', JSON.stringify(q)); },
    async flush() {
      if (!live) return 0;
      const q = S.pending(); if (!q.length) return 0;
      const done = new Set();
      for (const rec of q) { try { const r = await S.insert(rec); if (r.ok) done.add(rec.client_id); } catch (e) {} }
      LS.set('switch_pending', JSON.stringify(S.pending().filter(r => !done.has(r.client_id))));
      return done.size;
    },

    /* ---- joining and signing in: the database assigns the code and gives this device a key ---- */
    async register(fields) {
      if (!live) return null;
      const body = { p_email: fields.email, p_name: fields.name || null, p_gender: fields.gender || null, p_birth_year: fields.birth_year ?? null,
        p_height_cm: fields.height_cm ?? null, p_weight_kg: fields.weight_kg ?? null, p_sensitivity: fields.sensitivity || null,
        p_home: fields.home || null, p_pin: fields.pin || null };
      return S.rpcRow('register_participant', body, 'Registration failed');
    },
    // code: the participant code (P07), needed only when the answer was code_needed
    async signIn(email, pin, code) { return S.rpcRow('participant_sign_in', { p_email: email, p_pin: pin || null, p_code: code ? String(code).trim().toUpperCase() : null }, 'Sign-in failed'); },
    async rpcRow(fn, body, what) {
      const r = await fetch(rest('rpc/' + fn), { method: 'POST', headers: headers(), body: JSON.stringify(body) });
      const j = await r.json().catch(() => null);
      if (!r.ok) { const e = new Error((j && (j.message || j.hint)) || (what + ' (' + r.status + ')')); e.code = j && j.code; e.status = r.status; throw e; }
      const row = first(j);
      if (!row || !row.status) throw new Error(what);
      return row;
    },
    /* Calls a function that takes this device's key (query: extra URL parameters such as limit/offset).
     * Only the database's own answer for an unknown key (code 28000) means "signed out": it rejects with
     * notSignedIn set. Anything else that fails (a 401 from the gateway when the publishable key is wrong, a
     * missing grant 42501, a 5xx, a refused value 22023) rejects with err.status and err.code and WITHOUT
     * notSignedIn, so the app keeps its key and its queue and simply tries again later. */
    async keyed(fn, extra, query) {
      const key = S.key();
      if (!live || !key) throw notSignedIn();
      const r = await fetch(rest('rpc/' + fn) + (query ? '?' + query : ''), { method: 'POST', headers: headers(), body: JSON.stringify(Object.assign({ p_key: key }, extra || {})) });
      const j = await r.json().catch(() => null);
      if (!r.ok) {
        if (j && j.code === '28000') throw notSignedIn();
        const e = new Error((j && (j.message || j.hint)) || ('Could not load (' + r.status + ')')); e.code = j && j.code; e.status = r.status; throw e;
      }
      return j;
    },
    // Page by page: the API returns at most its "max rows" (1000 on Supabase) per request whatever the
    // function gives, so ask for 1000 at a time, newest first, until a page comes back short.
    async myCheckins() {
      const out = [], seen = new Set(), page = 1000;
      for (let from = 0; from < 20000;) {
        const j = await S.keyed('my_checkins', null, `order=ts.desc,client_id.desc&limit=${page}&offset=${from}`);
        const rows = Array.isArray(j) ? j : [];
        for (const x of rows) { if (seen.has(x.client_id)) continue; seen.add(x.client_id); out.push(x); }
        if (rows.length < page) break;
        from += rows.length;
      }
      return out;
    },
    async myProfile() { return first(await S.keyed('my_profile')); },
    async updateMyProfile(fields, home) { return first(await S.keyed('update_my_profile', { p_fields: fields || {}, p_home: home || null })); },
    async myPoints() { return first(await S.keyed('my_points')); },
    async race(period) { return first(await S.keyed('race', { p_period: period === 'month' || period === 'last_week' ? period : 'week' })); },
    async setRaceHidden(hidden) { return !!(await S.keyed('set_race_hidden', { p_hidden: !!hidden })); },
    // Signing out on this device: its key stops working on the server too.
    async forgetDevice() { const key = S.key(); if (!live || !key) return; try { await fetch(rest('rpc/forget_device'), { method: 'POST', headers: headers(), body: JSON.stringify({ p_key: key }) }); } catch (e) {} },
    // Asked by the app while it waits for the research team to let the participant in.
    // Resolves to { approved } (nothing else: the function gives away no name for a guessed code),
    // or null when the code is not registered (or was removed); rejects when the request itself
    // fails. In local mode nobody has to wait.
    async approval(code) {
      if (!live) return { approved: true };
      const r = await fetch(rest('rpc/participant_status'), { method: 'POST', headers: headers(), body: JSON.stringify({ p_code: String(code || '').trim().toUpperCase() }) });
      if (!r.ok) throw new Error('Could not check the approval status (' + r.status + ')');
      const row = first(await r.json().catch(() => null));
      return row && typeof row.approved === 'boolean' ? { approved: row.approved } : null;
    },

    /* ---- reminders: one row per registered phone, keyed by the push endpoint ----
     * The public key can neither read nor update push_subscriptions, so both calls go through database
     * functions. Registering takes this device's key (so only a signed-in, approved participant can add
     * a phone, and only under their own code); changing a schedule takes the push endpoint, which only
     * this phone knows (the service worker's "Not home" button has no key). */
    async saveSubscription(record) {
      if (!live) return false;
      const key = S.key();
      if (!key) return 'not_signed_in';
      const body = { p_key: key, p_endpoint: record.endpoint, p_p256dh: record.p256dh, p_auth: record.auth,
        p_tz: record.tz || null, p_tz_offset_min: record.tz_offset_min ?? null,
        p_weekday_start: record.weekday_start, p_weekday_end: record.weekday_end, p_weekend_start: record.weekend_start, p_weekend_end: record.weekend_end,
        p_weekday2_start: record.weekday2_start || null, p_weekday2_end: record.weekday2_end || null,
        p_weekend2_start: record.weekend2_start || null, p_weekend2_end: record.weekend2_end || null,
        p_interval_min: record.interval_min || 60, p_user_agent: record.user_agent || null };
      try {
        const r = await fetch(rest('rpc/save_push_subscription'), { method: 'POST', headers: headers(), body: JSON.stringify(body) });
        if (r.ok) return true;
        const j = await r.json().catch(() => null);
        if (j && j.code === '28000') return 'not_signed_in';
        if (r.status === 401 || r.status === 403) return 'refused';
        if (r.status === 400 && j && j.code === '22023') return 'invalid';
        if (r.status === 400 && j && j.code === 'P0001') return 'full';
        return false;
      } catch (e) { return false; }
    },
    async updateSchedule(endpoint, changes) {
      if (!live || !endpoint) return null;
      try {
        const r = await fetch(rest('rpc/update_push_schedule'), { method: 'POST', headers: headers(), body: JSON.stringify({ p_endpoint: endpoint, p_changes: changes || {} }) });
        if (!r.ok) return null;
        const j = await r.json();
        const row = Array.isArray(j) ? j[0] : null;
        return row ? Object.assign({ found: true }, row) : { found: false };
      } catch (e) { return null; }
    },

    /* ---- research side ---- */
    async login(email, password) {
      const r = await fetch(auth('token?grant_type=password'), { method: 'POST', headers: headers(), body: JSON.stringify({ email, password }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error_description || j.msg || j.error || 'Sign-in failed');
      return j; // { access_token, refresh_token, expires_in, user }
    },
    async refresh(refreshToken) {
      const r = await fetch(auth('token?grant_type=refresh_token'), { method: 'POST', headers: headers(), body: JSON.stringify({ refresh_token: refreshToken }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error_description || j.msg || j.error || 'Your session has expired, please sign in again');
      return j;
    },
    async logout(token) { try { await fetch(auth('logout'), { method: 'POST', headers: bearer(token) }); } catch (e) {} },
    async changePassword(token, password) {
      const r = await fetch(auth('user'), { method: 'PUT', headers: bearer(token), body: JSON.stringify({ password }) });
      if (r.status === 401) throw new Error('Your session has expired, please sign in again');
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.msg || j.error_description || j.message || j.error || ('Could not change the password (' + r.status + ')'));
      return true;
    },
    // Page by page until a page comes back empty, moving on by the rows actually received (a project whose
    // "max rows" is below the page size still gives everything). Ordered by ts then id, so the pages never
    // overlap; a row arriving during the load can still shift one across a page, hence one row per client_id.
    async fetchAll(token) {
      const out = [], seen = new Set(), page = 1000;
      for (let from = 0; ;) {
        const r = await fetch(rest(table) + '?select=*&order=ts.desc,id.desc', {
          headers: bearer(token, { Range: `${from}-${from + page - 1}`, 'Range-Unit': 'items' })
        });
        if (r.status === 401) throw new Error('Your session has expired, please sign in again');
        if (!r.ok) throw await writeError(r, 'Could not load the check-ins');
        const rows = await r.json();
        if (!rows.length) break;
        for (const x of rows) { if (seen.has(x.client_id)) continue; seen.add(x.client_id); out.push(x); }
        from += rows.length;
      }
      return out;
    },
    async fetchParticipants(token) {
      const r = await fetch(rest('participants') + '?select=*&order=code', { headers: bearer(token) });
      if (!r.ok) throw await writeError(r, 'Could not load the participants');
      return r.json();
    },
    async fetchPush(token) {
      const cols = 'participant,enabled,paused_until,settled_at,last_prompt_at,last_vote_at,tz,weekday_start,weekday_end,weekend_start,weekend_end,weekday2_start,weekday2_end,weekend2_start,weekend2_end,user_agent,created_at,updated_at';
      const r = await fetch(rest(pushTable) + '?select=' + cols + '&order=participant', { headers: bearer(token) });
      if (!r.ok) throw await writeError(r, 'Could not load the registered phones');
      return r.json();
    },
    async researcherRpc(token, fn, body, what) {
      const r = await fetch(rest('rpc/' + fn), { method: 'POST', headers: bearer(token), body: JSON.stringify(body || {}) });
      if (!r.ok) throw await writeError(r, what || 'Could not update the participant');
      return r.json();
    },
    async signInInfo(token) {
      const rows = await S.researcherRpc(token, 'participant_sign_in_info', {}, 'Could not load the sign-in details');
      return new Map((rows || []).map(x => [x.code, x]));
    },
    async resetPin(token, code) { return !!(await S.researcherRpc(token, 'reset_participant_pin', { p_code: code }, 'Could not reset the PIN')); },
    async signOutDevices(token, code) { return +(await S.researcherRpc(token, 'sign_out_devices', { p_code: code }, 'Could not sign out the devices')) || 0; },
    async pointsTable(token, from, to) { return S.researcherRpc(token, 'points_table', { p_from: from || null, p_to: to || null }, 'Could not load the points'); },
    // Both write functions ask PostgREST to return the rows it touched and resolve to true only when
    // there was at least one: a 2xx with an empty array means the code no longer exists (someone
    // else removed it, or the list is stale), which the dashboard reports rather than hides.
    async setApproval(token, code, approved) {
      const r = await fetch(rest('participants') + '?code=eq.' + encodeURIComponent(code), {
        method: 'PATCH',
        headers: bearer(token, { Prefer: 'return=representation' }),
        body: JSON.stringify({ approved: !!approved, updated_at: new Date().toISOString() })
      });
      if (!r.ok) throw await writeError(r, 'Could not update the participant');
      const rows = await r.json().catch(() => null);
      return Array.isArray(rows) && rows.length > 0;
    },
    approve(token, code) { return S.setApproval(token, code, true); },
    // Deletes the participant's registered phones first, then the profile (the PIN and device keys go with
    // it). Check-ins already submitted under the code are kept. False when no profile row was deleted.
    async removeParticipant(token, code) {
      const h = bearer(token, { Prefer: 'return=representation' });
      const phones = await fetch(rest(pushTable) + '?participant=eq.' + encodeURIComponent(code), { method: 'DELETE', headers: h });
      if (!phones.ok) throw await writeError(phones, 'Could not remove the registered phones');
      const r = await fetch(rest('participants') + '?code=eq.' + encodeURIComponent(code), { method: 'DELETE', headers: h });
      if (!r.ok) throw await writeError(r, 'Could not remove the participant');
      const rows = await r.json().catch(() => null);
      return Array.isArray(rows) && rows.length > 0;
    },
    remove(token, code) { return S.removeParticipant(token, code); },

    /* ---- local mode: what this browser holds, in the same record shape ---- */
    localRows() {
      let votes = [];
      try { votes = (JSON.parse(LS.get('switch_comfort_proto_v1', 'null') || 'null') || {}).votes || []; } catch (e) {}
      const p = LS.get('switch_participant', null) || 'LOCAL';
      return votes.map(v => S.toRecord(v, p));
    }
  };
  window.SWITCH = S;
})();
