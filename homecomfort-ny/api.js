/* Home Comfort NY (SUNY ESF) - shared data layer, window.HC.
 * Talks to the study's own Supabase project through its REST and Auth endpoints with plain fetch.
 * Loaded after config.js by /homecomfort-ny/checkin/ and /homecomfort-ny/dashboard/.
 * Everything this study keeps in the browser is under keys starting "hcny_", so it never meets the
 * data of another study app on the same site (they share the browser's storage for mehraban.uk).
 */
(function () {
  const cfg = window.HC_CONFIG || {};
  const live = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const table = cfg.table || 'comfort_votes';
  const base = (cfg.supabaseUrl || '').replace(/\/$/, '');
  const rest = path => base + '/rest/v1/' + path;
  const auth = path => base + '/auth/v1/' + path;
  const headers = extra => Object.assign({ apikey: cfg.supabaseAnonKey, 'Content-Type': 'application/json' }, extra || {});
  const LS = {
    get(k, fallback) { try { const v = localStorage.getItem(k); return v === null ? fallback : v; } catch (e) { return fallback; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const pad = n => String(n).padStart(2, '0');

  /* Turns a failed dashboard write into an Error that says what the server said. A 401 keeps its
   * wording (the dashboard sends the researcher back to sign in). When the message is about a column,
   * function or table the database does not have, supabase-setup.sql has not been run again since that
   * feature was added, and the message opens with exactly that, because it is what the researcher has
   * to do. Postgres: 42703 undefined column, 42883 undefined function, 42P01 undefined table.
   * PostgREST: PGRST202 function, PGRST204 column and PGRST205 table missing from the schema cache. */
  async function writeError(r, what) {
    if (r.status === 401) return new Error('Your session has expired, please sign in again');
    const j = await r.json().catch(() => null);
    const msg = String((j && (j.message || j.hint || j.error_description || j.error)) || '').trim();
    const code = String((j && j.code) || '');
    const missing = /^(42703|42883|42P01|PGRST20[245])$/.test(code) || (/column|function|table|relation/i.test(msg) && /does not exist|could not find/i.test(msg));
    return new Error((missing ? 'The database has not been updated yet: run supabase-setup.sql again in Supabase. ' : '') + what + ' (' + r.status + ')' + (msg ? ': ' + msg : ''));
  }

  const S = {
    live, cfg,

    /* ---- participant identity: ?p=NY007 in the link (testing), remembered on the phone ---- */
    participant() {
      const p = (new URL(location.href).searchParams.get('p') || '').trim().toUpperCase();
      if (p) { LS.set('hcny_participant', p); return p; }
      return LS.get('hcny_participant', null);
    },
    setParticipant(p) { LS.set('hcny_participant', String(p).trim().toUpperCase()); },

    /* ---- one check-in row, in the shape of the database table ---- */
    toRecord(row, participant) {
      const d = new Date(row.ts);
      return {
        client_id: row.id,
        participant,
        ts: row.ts,
        local_time: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`,
        tz_offset_min: -d.getTimezoneOffset(),
        prompt: row.type,
        at_home: row.home,
        tsv: row.tsv,
        clo: row.clo,
        garments: row.garments || [],
        met: row.met,
        activity: row.act,
        room: row.room,
        air: row.air,
        sun: row.sun,
        actions: row.actions,
        notes: row.notes,
        same_as_last: !!row.same,
        seconds: row.secs,
        app_version: cfg.appVersion || ''
      };
    },

    /* ---- participant side: save with an offline queue ---- */
    async insert(record) {
      if (!live) return { ok: false, status: 0 };
      // A plain insert. The public key cannot read rows, so an "upsert" (which compares against the
      // existing row) is refused by row-level security. A retry of a row that already exists comes
      // back as 409 from the unique client_id, which counts as success.
      const rec = Object.assign({}, record);
      const r = await fetch(rest(table), {
        method: 'POST',
        headers: headers({ Prefer: 'return=minimal' }),
        body: JSON.stringify(rec)
      });
      const ok = r.ok || r.status === 409;
      return { ok, status: r.status, text: ok ? '' : await r.text() };
    },
    pending() { try { return JSON.parse(LS.get('hcny_pending', '[]')); } catch (e) { return []; } },
    queue(record) { const q = S.pending(); q.push(record); LS.set('hcny_pending', JSON.stringify(q)); },

    /* ---- registration: the database assigns the participant code ---- */
    // fields: email (and, to create a profile: name, gender, birth_year, height_cm, weight_kg, sensitivity,
    // units 'us' | 'metric', home: the home profile object, metric values).
    async register(fields) {
      if (!live) return null;
      const body = { p_email: fields.email, p_name: fields.name || null, p_gender: fields.gender || null, p_birth_year: fields.birth_year ?? null,
        p_height_cm: fields.height_cm ?? null, p_weight_kg: fields.weight_kg ?? null, p_sensitivity: fields.sensitivity || null,
        p_units: fields.units || null, p_home: fields.home || null };
      const r = await fetch(rest('rpc/register_participant'), { method: 'POST', headers: headers(), body: JSON.stringify(body) });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error((j && (j.message || j.hint)) || ('Registration failed (' + r.status + ')'));
      const row = Array.isArray(j) ? j[0] : j;
      if (!row || !row.code) throw new Error('Registration failed');
      return row; // { code, name, is_new, approved }
    },
    // Asked by the app while it waits for the research team to let the participant in.
    // Resolves to { approved } (nothing else: the function gives away no name for a guessed code),
    // or null when the code is not registered (or was removed); rejects when the request itself
    // fails. In local mode nobody has to wait.
    async approval(code) {
      if (!live) return { approved: true };
      const r = await fetch(rest('rpc/participant_status'), { method: 'POST', headers: headers(), body: JSON.stringify({ p_code: String(code || '').trim().toUpperCase() }) });
      if (!r.ok) throw new Error('Could not check the approval status (' + r.status + ')');
      const j = await r.json().catch(() => null);
      const row = Array.isArray(j) ? j[0] : j;
      return row && typeof row.approved === 'boolean' ? { approved: row.approved } : null;
    },

    /* ---- researcher side: the participant list and the approval buttons on the dashboard ---- */
    async fetchParticipants(token) {
      const r = await fetch(rest('participants') + '?select=*&order=code', { headers: headers({ Authorization: 'Bearer ' + token }) });
      if (!r.ok) return [];
      return r.json();
    },
    // Both write functions ask PostgREST to return the rows it touched and resolve to true only when
    // there was at least one: a 2xx with an empty array means the code no longer exists (someone
    // else removed it, or the list is stale), which the dashboard reports rather than hides.
    // They reject on a network failure, and on a refused request with the server's own message
    // (see writeError above), so the dashboard alert can say what to do.
    async setApproval(token, code, approved) {
      const r = await fetch(rest('participants') + '?code=eq.' + encodeURIComponent(code), {
        method: 'PATCH',
        headers: headers({ Authorization: 'Bearer ' + token, Prefer: 'return=representation' }),
        body: JSON.stringify({ approved: !!approved, updated_at: new Date().toISOString() })
      });
      if (!r.ok) throw await writeError(r, 'Could not update the participant');
      const rows = await r.json().catch(() => null);
      return Array.isArray(rows) && rows.length > 0;
    },
    // Deletes the participant's registered phones first, then the profile. Check-ins already
    // submitted under the code are kept. False when the phones could not be deleted (the profile is
    // then left alone, so nothing is half done) or when no profile row was deleted.
    async removeParticipant(token, code) {
      const h = headers({ Authorization: 'Bearer ' + token, Prefer: 'return=representation' });
      const phones = await fetch(rest(cfg.pushTable || 'push_subscriptions') + '?participant=eq.' + encodeURIComponent(code), { method: 'DELETE', headers: h });
      if (!phones.ok) throw await writeError(phones, 'Could not remove the registered phones');
      const r = await fetch(rest('participants') + '?code=eq.' + encodeURIComponent(code), { method: 'DELETE', headers: h });
      if (!r.ok) throw await writeError(r, 'Could not remove the participant');
      const rows = await r.json().catch(() => null);
      return Array.isArray(rows) && rows.length > 0;
    },

    /* ---- reminders: one row per registered phone, keyed by the push endpoint ----
     * The public key can neither read nor update push_subscriptions (Postgres only updates rows the
     * caller may read), so both calls go through database functions in supabase-setup.sql. The push
     * endpoint, which only this phone knows, is what shows a row is this phone's. */
    // Turning reminders on: adds this phone, or refreshes its row. Resolves to true when saved,
    // 'refused' when the database does not accept the participant code (removed, or not approved),
    // 'invalid' when it refuses the subscription itself (not from a known push service, or bad hours),
    // 'full' when the code already has the most phones allowed, and false when it is unreachable (or
    // supabase-setup.sql has not been re-run yet).
    async saveSubscription(record) {
      if (!live) return false;
      const body = { p_endpoint: record.endpoint, p_participant: record.participant, p_p256dh: record.p256dh, p_auth: record.auth,
        p_tz: record.tz || null, p_tz_offset_min: record.tz_offset_min ?? null,
        p_weekday_start: record.weekday_start, p_weekday_end: record.weekday_end, p_weekend_start: record.weekend_start, p_weekend_end: record.weekend_end,
        p_weekday2_start: record.weekday2_start || null, p_weekday2_end: record.weekday2_end || null,
        p_weekend2_start: record.weekend2_start || null, p_weekend2_end: record.weekend2_end || null,
        p_interval_min: record.interval_min || 60, p_user_agent: record.user_agent || null };
      try {
        const r = await fetch(rest('rpc/save_push_subscription'), { method: 'POST', headers: headers(), body: JSON.stringify(body) });
        if (r.ok) return true;
        if (r.status === 401 || r.status === 403) return 'refused';
        if (r.status === 400) { const j = await r.json().catch(() => null); if (j && j.code === '22023') return 'invalid'; if (j && j.code === 'P0001') return 'full'; }
        return false;
      } catch (e) { return false; }
    },
    // Changes this phone's reminder schedule (only this phone's row). `changes` holds only what changes:
    // paused_until, settled_at, last_vote_at, the eight home-hour fields, tz, tz_offset_min, enabled.
    // {} just asks. Resolves to
    //   { found: true, enabled, paused_until, settled_at }  this phone's state on the server,
    //   { found: false }                                   the phone is not registered (any more),
    //   null                                               unreachable, or the request was refused.
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

    /* ---- researcher side ---- */
    async login(email, password) {
      const r = await fetch(auth('token?grant_type=password'), { method: 'POST', headers: headers(), body: JSON.stringify({ email, password }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error_description || j.msg || j.error || 'Sign-in failed');
      return j; // { access_token, expires_in, user }
    },
    async fetchAll(token) {
      const out = [], page = 1000;
      for (let from = 0; ; from += page) {
        const r = await fetch(rest(table) + '?select=*&order=ts.desc', {
          headers: headers({ Authorization: 'Bearer ' + token, Range: `${from}-${from + page - 1}`, 'Range-Unit': 'items' })
        });
        if (r.status === 401) throw new Error('Your session has expired, please sign in again');
        if (!r.ok) throw new Error('Could not load check-ins (' + r.status + ')');
        const rows = await r.json();
        out.push(...rows);
        if (rows.length < page) break;
      }
      return out;
    },

    /* ---- local mode: what this browser holds, in the same record shape ---- */
    localRows() {
      let votes = [];
      try { votes = (JSON.parse(LS.get('hcny_store', 'null') || 'null') || {}).votes || []; } catch (e) {}
      const p = LS.get('hcny_participant', null) || 'LOCAL';
      return votes.map(v => S.toRecord(v, p));
    }
  };
  window.HC = S;
})();
