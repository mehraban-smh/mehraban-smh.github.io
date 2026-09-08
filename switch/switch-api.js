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
      const r = await fetch(rest(table) + '?on_conflict=client_id', {
        method: 'POST',
        headers: headers({ Prefer: 'resolution=ignore-duplicates,return=minimal' }),
        body: JSON.stringify(record)
      });
      return { ok: r.ok, status: r.status, text: r.ok ? '' : await r.text() };
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
