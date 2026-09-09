/* SWITCH comfort study - shared data layer.
 * Talks to Supabase through its REST and Auth endpoints with plain fetch, so no library is needed.
 * Loaded after config.js by /switch/checkin/ and /switch/dashboard/.
 */
(function () {
  const cfg = window.SWITCH_CONFIG || {};
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
  const SECOND_WINDOW = ['weekday2_start', 'weekday2_end', 'weekend2_start', 'weekend2_end'];
  const stripSecondWindow = o => { const c = Object.assign({}, o); SECOND_WINDOW.forEach(k => { delete c[k]; }); return c; };
  // True when a 400 came from PostgREST not knowing the second-window columns yet.
  const missingSecondWindow = async r => { if (r.status !== 400) return false; const text = await r.clone().text().catch(() => ''); return /(weekday|weekend)2_(start|end)/.test(text); };

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

    /* ---- participant identity: ?p=P07 in the link, remembered on the phone ---- */
    participant() {
      const p = (new URL(location.href).searchParams.get('p') || '').trim().toUpperCase();
      if (p) { LS.set('switch_participant', p); return p; }
      return LS.get('switch_participant', null);
    },
    setParticipant(p) { LS.set('switch_participant', String(p).trim().toUpperCase()); },
    validCode: p => /^P\d{2,3}$/.test(p),

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
        preference: row.tp,
        clo: row.clo,
        garments: row.garments || [],
        met: row.met,
        activity: row.act,
        room: row.room,
        acceptability: row.ta,
        comfort: row.tc,
        comfort_score: row.tcs,
        air: row.air,
        air_pref: row.air_pref,
        humidity: row.hum,
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
      const r = await fetch(rest(table), {
        method: 'POST',
        headers: headers({ Prefer: 'return=minimal' }),
        body: JSON.stringify(record)
      });
      const ok = r.ok || r.status === 409;
      return { ok, status: r.status, text: ok ? '' : await r.text() };
    },
    pending() { try { return JSON.parse(LS.get('switch_pending', '[]')); } catch (e) { return []; } },
    queue(record) { const q = S.pending(); q.push(record); LS.set('switch_pending', JSON.stringify(q)); },
    async flush() {
      if (!live) return 0;
      const q = S.pending(); if (!q.length) return 0;
      const left = [];
      for (const rec of q) { try { const r = await S.insert(rec); if (!r.ok) left.push(rec); } catch (e) { left.push(rec); } }
      LS.set('switch_pending', JSON.stringify(left));
      return q.length - left.length;
    },
    async save(record) {
      if (!live) return 'local';
      try { const r = await S.insert(record); if (r.ok) return 'synced'; } catch (e) {}
      S.queue(record); return 'queued';
    },

    /* ---- registration: the database assigns the participant code ---- */
    async register(fields) {
      if (!live) return null;
      const body = { p_email: fields.email, p_name: fields.name || null, p_gender: fields.gender || null, p_birth_year: fields.birth_year ?? null,
        p_height_cm: fields.height_cm ?? null, p_weight_kg: fields.weight_kg ?? null, p_sensitivity: fields.sensitivity || null };
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

    /* ---- reminders: one row per registered phone, keyed by the push endpoint ---- */
    // The optional second reminder window lives in four columns added later. Until supabase-setup.sql
    // has been re-run on a project, PostgREST refuses any write that names them (400, unknown column),
    // so those writes are retried once without them rather than failing reminder sign-up outright.
    async saveSubscription(record, retried) {
      if (!live) return false;
      // Insert first; if this phone is already registered (409 on the endpoint), update its row instead.
      const t = rest(cfg.pushTable || 'push_subscriptions');
      const r = await fetch(t, { method: 'POST', headers: headers({ Prefer: 'return=minimal' }), body: JSON.stringify(record) });
      if (r.ok) return true;
      if (!retried && await missingSecondWindow(r)) return S.saveSubscription(stripSecondWindow(record), true);
      if (r.status !== 409) return false;
      const patch = Object.assign({}, record, { updated_at: new Date().toISOString() });
      delete patch.endpoint;
      const u = await fetch(t + '?endpoint=eq.' + encodeURIComponent(record.endpoint), { method: 'PATCH', headers: headers({ Prefer: 'return=minimal' }), body: JSON.stringify(patch) });
      return u.ok;
    },
    async updateSchedule(participant, patch, retried) {
      if (!live || !participant) return false;
      const r = await fetch(rest(cfg.pushTable || 'push_subscriptions') + '?participant=eq.' + encodeURIComponent(participant), {
        method: 'PATCH',
        headers: headers({ Prefer: 'return=minimal' }),
        body: JSON.stringify(Object.assign({ updated_at: new Date().toISOString() }, patch))
      });
      if (!r.ok && !retried && await missingSecondWindow(r)) return S.updateSchedule(participant, stripSecondWindow(patch), true);
      return r.ok;
    },
    async disableSubscription(endpoint) {
      if (!live || !endpoint) return false;
      const r = await fetch(rest(cfg.pushTable || 'push_subscriptions') + '?endpoint=eq.' + encodeURIComponent(endpoint), {
        method: 'PATCH',
        headers: headers({ Prefer: 'return=minimal' }),
        body: JSON.stringify({ enabled: false, updated_at: new Date().toISOString() })
      });
      return r.ok;
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
      try { votes = (JSON.parse(LS.get('switch_comfort_proto_v1', 'null') || 'null') || {}).votes || []; } catch (e) {}
      const p = LS.get('switch_participant', null) || 'LOCAL';
      return votes.map(v => S.toRecord(v, p));
    }
  };
  window.SWITCH = S;
})();
