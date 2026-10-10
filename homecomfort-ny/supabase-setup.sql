-- Home Comfort NY (SUNY ESF): database setup.
-- A separate Supabase project from any other study: nothing here refers to another database.
-- Run this in Supabase: SQL Editor > New query > paste the whole file > Run.
-- Safe to re-run from top to bottom: tables are created only if missing, policies are dropped and
-- recreated, and functions are replaced.

create extension if not exists pgcrypto;

-- ===================================================================================================
-- Participants, their home profile, and the approval step
--
-- One row per participant. Codes (NY001, NY002, ...) are assigned by register_participant() below.
-- Participants never read or write this table directly: the app only calls the functions.
--
-- The study link is public, so joining needs a nod from the research team:
--   1. The app registers a profile through register_participant(). The new row has approved = false.
--   2. Every hour homecomfort-ny/push/notify.js (GitHub Actions) looks for rows with notified_at still
--      null and, if any of them are waiting, opens one issue in the repository listing them (codes and
--      times only, never the name or email), then stamps notified_at. GitHub emails the owner.
--   3. The researcher opens the dashboard and clicks Approve (approved = true), or Remove (deletes the
--      row and the participant's registered phones).
--   4. Until then the participant cannot submit check-ins or register a phone for reminders: the anon
--      policies further down call is_approved(), and the app asks participant_status() every so often.
--
-- home holds the home profile from sign-up as one JSON object (the keys are listed in
-- homecomfort-ny/README.md, "The home profile"). Lengths are kept metric (floor area in m2,
-- thermostat settings in degrees C) whatever the participant chose to see; units says which they chose.
-- ===================================================================================================
create table if not exists public.participants (
  code         text primary key,                -- NY001, NY002, ...
  email        text unique not null,
  name         text not null,
  gender       text,
  birth_year   integer,
  height_cm    numeric(5,1),
  weight_kg    numeric(5,1),
  sensitivity  text,                            -- cold | average | warm
  units        text not null default 'us',      -- us (degrees F, sq ft) | metric (degrees C, m2): what the app shows them
  home         jsonb not null default '{}'::jsonb,
  approved     boolean not null default false,  -- set from the dashboard; nothing is accepted from the code until then
  notified_at  timestamptz,                     -- set by notify.js once the team has been told about this registration
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create sequence if not exists public.participant_seq start 1;
alter table public.participants enable row level security;

-- Researchers sign in on the dashboard: they may read, approve and remove participants.
drop policy if exists "researchers can read participants" on public.participants;
create policy "researchers can read participants"
  on public.participants for select to authenticated
  using (true);

drop policy if exists "researchers can update participants" on public.participants;
create policy "researchers can update participants"
  on public.participants for update to authenticated
  using (true)
  with check (true);

drop policy if exists "researchers can remove participants" on public.participants;
create policy "researchers can remove participants"
  on public.participants for delete to authenticated
  using (true);

-- Called by the app with the public key. With an email only: returns the existing participant's code
-- (the "I have registered before" path). With a name as well: creates the participant with the profile
-- and assigns the next code. Returns only the code, the name, whether the row is new, whether it has been
-- approved and the units the participant chose (so the Home Screen app on an iPhone, which keeps its own
-- storage apart from Safari, shows the same units after "I have registered before"), never the profile.
-- Values out of any sensible range are refused with a message the app can show, rather than a database error.
-- Postgres cannot change a function's return type in place, so any earlier version is dropped first.
drop function if exists public.register_participant(text, text, text, integer, numeric, numeric, text, text, jsonb);
create or replace function public.register_participant(
  p_email text, p_name text default null, p_gender text default null, p_birth_year integer default null,
  p_height_cm numeric default null, p_weight_kg numeric default null, p_sensitivity text default null,
  p_units text default null, p_home jsonb default null)
returns table(code text, name text, is_new boolean, approved boolean, units text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_email text := lower(trim(p_email));
  v_code text; v_name text; v_approved boolean; v_units text; n bigint;
begin
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or length(v_email) > 254 then
    raise exception 'That does not look like an email address' using errcode = '22023';
  end if;
  select p.code, p.name, p.approved, p.units into v_code, v_name, v_approved, v_units from public.participants p where p.email = v_email;
  if v_code is not null then
    return query select v_code, v_name, false, coalesce(v_approved, false), v_units; return;
  end if;
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'No participant is registered with that email' using errcode = 'P0002';
  end if;
  if length(trim(p_name)) > 100 then raise exception 'Please shorten the name' using errcode = '22023'; end if;
  if p_birth_year is not null and (p_birth_year < 1900 or p_birth_year > extract(year from now())::int - 10) then
    raise exception 'Please check the year of birth' using errcode = '22023';
  end if;
  if p_height_cm is not null and (p_height_cm < 50 or p_height_cm > 250) then
    raise exception 'Please check the height' using errcode = '22023';
  end if;
  if p_weight_kg is not null and (p_weight_kg < 20 or p_weight_kg > 350) then
    raise exception 'Please check the weight' using errcode = '22023';
  end if;
  if p_home is not null and (jsonb_typeof(p_home) <> 'object' or length(p_home::text) > 4000) then
    raise exception 'The home profile could not be read' using errcode = '22023';
  end if;
  n := nextval('public.participant_seq');
  v_code := 'NY' || lpad(n::text, greatest(3, length(n::text)), '0');   -- never truncated: NY999, NY1000, ...
  v_units := case when p_units in ('us', 'metric') then p_units else 'us' end;
  insert into public.participants (code, email, name, gender, birth_year, height_cm, weight_kg, sensitivity, units, home)
    values (v_code, v_email, trim(p_name), left(p_gender, 30), p_birth_year, p_height_cm, p_weight_kg, left(p_sensitivity, 30),
            v_units, coalesce(p_home, '{}'::jsonb));
  return query select v_code, trim(p_name), true, false, v_units;
end $$;
revoke all on function public.register_participant(text, text, text, integer, numeric, numeric, text, text, jsonb) from public;
grant execute on function public.register_participant(text, text, text, integer, numeric, numeric, text, text, jsonb) to anon, authenticated;

-- Called by the app (public key) while it waits to be let in. Returns only the approval flag for a
-- code, and no rows at all for a code that is not registered. Nothing else: codes are guessable.
create or replace function public.participant_status(p_code text)
returns table(approved boolean)
language sql security definer stable set search_path = public as $$
  select p.approved from public.participants p where p.code = upper(trim(p_code));
$$;
revoke all on function public.participant_status(text) from public;
grant execute on function public.participant_status(text) to anon, authenticated;

-- Used inside the row-level security policies below. A policy runs as the calling role, and anon has
-- no select on participants, so this function runs as its owner to see the row.
create or replace function public.is_approved(p_code text)
returns boolean
language sql security definer stable set search_path = public as $$
  select coalesce((select p.approved from public.participants p where p.code = p_code), false);
$$;
revoke all on function public.is_approved(text) from public;
grant execute on function public.is_approved(text) to anon, authenticated;

-- ===================================================================================================
-- Check-ins
-- ===================================================================================================
-- One row per submitted check-in: how the participant feels (the seven-point thermal sensation vote)
-- with the context that goes with it.
create table if not exists public.comfort_votes (
  id             uuid primary key default gen_random_uuid(),
  client_id      text unique not null,          -- id generated on the phone; lets an offline retry not duplicate a row
  participant    text not null,                 -- pseudonymous code, e.g. NY007
  ts             timestamptz not null,          -- moment of submission, UTC
  local_time     text,                          -- the same moment on the participant's clock, e.g. 2026-10-09 18:42
  tz_offset_min  integer,
  prompt         text,                          -- scheduled | self
  at_home        text,                          -- long (over an hour) | recent (just got in)
  tsv            smallint check (tsv between -3 and 3),   -- thermal sensation vote, cold -3 ... hot +3
  clo            numeric(4,2),                  -- summed garment insulation
  garments       text[],
  met            numeric(3,1),
  activity       text,
  room           text,
  air            text,                          -- still | slight | drafty
  sun            text,                          -- yes | no | dark
  actions        text[],                        -- what changed since the last check-in
  notes          text[],                        -- anything worth noting (hot drink, hungry, ...)
  same_as_last   boolean not null default false,
  seconds        integer,                       -- how long the check-in took
  app_version    text,
  created_at     timestamptz not null default now()
);
create index if not exists comfort_votes_participant_ts on public.comfort_votes (participant, ts);
alter table public.comfort_votes enable row level security;

-- Participants use the public key: they may add check-ins for a valid, approved code and nothing else.
drop policy if exists "participants can add check-ins" on public.comfort_votes;
create policy "participants can add check-ins"
  on public.comfort_votes for insert to anon
  with check (participant ~ '^NY[0-9]{3,6}$' and public.is_approved(participant));

-- Researchers sign in on the dashboard: they may read everything.
drop policy if exists "researchers can read everything" on public.comfort_votes;
create policy "researchers can read everything"
  on public.comfort_votes for select to authenticated
  using (true);

-- ===================================================================================================
-- Reminders
-- ===================================================================================================
-- One row per phone that has turned reminders on. The sender in homecomfort-ny/push/send.js reads these
-- every hour and decides who is due a reminder.
--
-- The app never reads or writes this table directly. It calls the two functions further down, and the
-- phone's push endpoint (a long, unguessable address at a push service that only that phone knows) is
-- what shows a row is its own:
--   save_push_subscription()  turning reminders on: adds the phone, or refreshes it if it is already there
--   update_push_schedule()    "I'm out", "I just got in", a check-in, new home hours, turning reminders
--                             off, the phone's time zone; returns the phone's state, or no row at all when
--                             the phone is not registered any more (the sender removes phones that the
--                             push service has dropped), so the app knows to register it again.
-- Each call changes only the row of the endpoint it names. Anyone holding an approved code could register
-- an endpoint of their own under that code, so a change must never reach the participant's other rows;
-- a participant with two phones keeps one schedule per phone.
-- A plain update with the public key can never work here: Postgres only updates rows the caller may also
-- read, and the public key must not read this table (it holds everyone's home hours).
create table if not exists public.push_subscriptions (
  endpoint        text primary key,              -- the phone's push address, unique per browser install
  participant     text not null,
  p256dh          text not null,                 -- encryption keys that belong to this subscription
  auth            text not null,
  tz              text,                          -- the phone's time zone, e.g. America/New_York (the sender reads
                                                 --   home hours in it; null: config.js timeZone)
  tz_offset_min   integer not null default 0,    -- the phone's offset from UTC when it last reported (for reference)
  weekday_start   text not null default '17:00', -- home hours, on the phone's clock
  weekday_end     text not null default '22:30',
  weekend_start   text not null default '09:00',
  weekend_end     text not null default '22:30',
  weekday2_start  text,                          -- optional second window for participants who want a more
  weekday2_end    text,                          --   customised schedule, "HH:MM" on the phone's clock,
  weekend2_start  text,                          --   null when unused. The sender reminds inside either
  weekend2_end    text,                          --   window; a second window with start >= end is ignored.
  interval_min    integer not null default 60,   -- informational; the sender uses reminderIntervalMin from config.js
  enabled         boolean not null default true,
  paused_until    timestamptz,                   -- set when the participant says they are out
  settled_at      timestamptz,                   -- set when they say they have just got home
  last_prompt_at  timestamptz,                   -- written by the sender
  last_vote_at    timestamptz,                   -- written by the app on every submitted check-in
  user_agent      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists push_subscriptions_participant on public.push_subscriptions (participant);

alter table public.push_subscriptions enable row level security;

-- The public key has no policy on this table: the two functions below are the only way in, and they
-- check what they store.

-- True for an endpoint at one of the browser push services: Google (Chrome, Edge and others on Android),
-- Apple (Safari, iPhone), Mozilla (Firefox) and Microsoft (Edge on Windows). Anything else is refused, so
-- the sender only ever contacts those services. homecomfort-ny/push/send.js has the same list.
create or replace function public.push_endpoint_ok(p text)
returns boolean
language sql immutable set search_path = public as $$
  select coalesce(p, '') ~ '^https://(fcm\.googleapis\.com|android\.googleapis\.com|web\.push\.apple\.com|[a-z0-9-]+(\.[a-z0-9-]+)*\.push\.services\.mozilla\.com|[a-z0-9-]+(\.[a-z0-9-]+)*\.notify\.windows\.com)/'
     and length(p) <= 2000;
$$;
revoke all on function public.push_endpoint_ok(text) from public, anon, authenticated;

-- "HH:MM" on a 24-hour clock ('7:00' and '07:00:00' are tidied to '07:00'), null for an empty value;
-- anything else is refused with a message that names the field.
create or replace function public.push_hhmm(p_value text, p_field text)
returns text
language plpgsql immutable set search_path = public as $$
begin
  if p_value is null or trim(p_value) = '' then return null; end if;
  return to_char(trim(p_value)::time, 'HH24:MI');
exception when others then
  raise exception '% should be a time like 17:00 (got "%")', p_field, p_value using errcode = '22023';
end $$;
revoke all on function public.push_hhmm(text, text) from public, anon, authenticated;

-- Refuses home hours the sender could never use: a window that ends before it starts (the app asks for
-- 23:59 rather than 00:00 for "until midnight"), or a second window with only one end.
create or replace function public.push_check_hours(ws text, we text, es text, ee text, ws2 text, we2 text, es2 text, ee2 text)
returns void
language plpgsql immutable set search_path = public as $$
begin
  if ws is null or we is null or es is null or ee is null then
    raise exception 'Weekday and weekend home hours both need a start and an end' using errcode = '22023';
  end if;
  if ws >= we then raise exception 'Weekdays: the end time must be later than the start time' using errcode = '22023'; end if;
  if es >= ee then raise exception 'Weekends: the end time must be later than the start time' using errcode = '22023'; end if;
  if (ws2 is null) <> (we2 is null) or (es2 is null) <> (ee2 is null) then
    raise exception 'A second period needs both a start and an end' using errcode = '22023';
  end if;
  if ws2 >= we2 then raise exception 'Weekdays, second period: the end time must be later than the start time' using errcode = '22023'; end if;
  if es2 >= ee2 then raise exception 'Weekends, second period: the end time must be later than the start time' using errcode = '22023'; end if;
end $$;
revoke all on function public.push_check_hours(text, text, text, text, text, text, text, text) from public, anon, authenticated;

-- A time zone name Postgres knows (America/New_York), or null.
create or replace function public.push_zone(p_tz text)
returns text
language sql stable set search_path = public as $$
  select n.name from pg_timezone_names n where n.name = nullif(trim(p_tz), '') limit 1;
$$;
revoke all on function public.push_zone(text) from public, anon, authenticated;

-- Called by the app (public key) when the participant turns reminders on. Adds this phone, or, when the
-- phone is already registered (same endpoint), refreshes its keys, time zone and home hours and turns it
-- back on. A phone that changes hands to another participant starts without the previous person's pause
-- and check-in times. Refused (42501, which the API returns as 401) for a code that is not approved,
-- 22023 for an endpoint outside the push services or unusable hours, P0001 beyond ten phones per code.
create or replace function public.save_push_subscription(
  p_endpoint text, p_participant text, p_p256dh text, p_auth text,
  p_tz text default null, p_tz_offset_min integer default null,
  p_weekday_start text default '17:00', p_weekday_end text default '22:30',
  p_weekend_start text default '09:00', p_weekend_end text default '22:30',
  p_weekday2_start text default null, p_weekday2_end text default null,
  p_weekend2_start text default null, p_weekend2_end text default null,
  p_interval_min integer default 60, p_user_agent text default null)
returns boolean
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_code text := upper(trim(coalesce(p_participant, '')));
  ws text := coalesce(public.push_hhmm(p_weekday_start, 'Weekdays from'), '17:00');
  we text := coalesce(public.push_hhmm(p_weekday_end, 'Weekdays until'), '22:30');
  es text := coalesce(public.push_hhmm(p_weekend_start, 'Weekends from'), '09:00');
  ee text := coalesce(public.push_hhmm(p_weekend_end, 'Weekends until'), '22:30');
  ws2 text := public.push_hhmm(p_weekday2_start, 'Weekdays, second period, from');
  we2 text := public.push_hhmm(p_weekday2_end, 'Weekdays, second period, until');
  es2 text := public.push_hhmm(p_weekend2_start, 'Weekends, second period, from');
  ee2 text := public.push_hhmm(p_weekend2_end, 'Weekends, second period, until');
begin
  if v_code !~ '^NY[0-9]{3,6}$' or not public.is_approved(v_code) then
    raise exception 'This participant code may not register a phone' using errcode = '42501';
  end if;
  if not public.push_endpoint_ok(p_endpoint) or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = ''
     or length(p_p256dh) > 200 or length(p_auth) > 100 then
    raise exception 'That is not a push subscription from a known push service' using errcode = '22023';
  end if;
  perform public.push_check_hours(ws, we, es, ee, ws2, we2, es2, ee2);
  -- A phone that turned reminders off has dropped its subscription, so its row is of no further use. Then at
  -- most ten phones per participant: the code is all it takes to register one, and the sender reads them all.
  delete from public.push_subscriptions s where s.participant = v_code and s.enabled = false and s.endpoint <> p_endpoint;
  if (select count(*) from public.push_subscriptions s where s.participant = v_code and s.endpoint <> p_endpoint) >= 10 then
    raise exception 'This participant already has the most phones allowed' using errcode = 'P0001';
  end if;
  insert into public.push_subscriptions as s
    (endpoint, participant, p256dh, auth, tz, tz_offset_min,
     weekday_start, weekday_end, weekend_start, weekend_end, weekday2_start, weekday2_end, weekend2_start, weekend2_end,
     interval_min, enabled, user_agent)
  values
    (p_endpoint, v_code, p_p256dh, p_auth, public.push_zone(p_tz), coalesce(p_tz_offset_min, 0),
     ws, we, es, ee, ws2, we2, es2, ee2,
     coalesce(p_interval_min, 60), true, left(p_user_agent, 200))
  on conflict (endpoint) do update set
    participant = excluded.participant, p256dh = excluded.p256dh, auth = excluded.auth,
    tz = excluded.tz, tz_offset_min = excluded.tz_offset_min,
    weekday_start = excluded.weekday_start, weekday_end = excluded.weekday_end,
    weekend_start = excluded.weekend_start, weekend_end = excluded.weekend_end,
    weekday2_start = excluded.weekday2_start, weekday2_end = excluded.weekday2_end,
    weekend2_start = excluded.weekend2_start, weekend2_end = excluded.weekend2_end,
    interval_min = excluded.interval_min, enabled = true, user_agent = excluded.user_agent,
    paused_until = case when s.participant = excluded.participant then s.paused_until end,
    settled_at   = case when s.participant = excluded.participant then s.settled_at end,
    last_vote_at = case when s.participant = excluded.participant then s.last_vote_at end,
    updated_at = now();
  return true;
end $$;
revoke all on function public.save_push_subscription(text, text, text, text, text, integer, text, text, text, text, text, text, text, text, integer, text) from public;
grant execute on function public.save_push_subscription(text, text, text, text, text, integer, text, text, text, text, text, text, text, text, integer, text) to anon, authenticated;

-- Called by the app (public key) and by the service worker's "Not home" button. p_changes holds only
-- the fields to change, any of: paused_until, settled_at, last_vote_at, the eight home-hour fields
-- (weekday_start ... weekend2_end), tz, tz_offset_min, enabled. Only the row of p_endpoint changes.
-- Returns that row's state afterwards ({} only asks), or no row when the endpoint is not registered (any
-- more). A time on the phone's clock in the future is not trusted for settled_at and last_vote_at (at
-- most now), last_vote_at only ever moves forward, and a pause is at most a day long (the longest the
-- app sets is "This evening", from just after midnight).
create or replace function public.update_push_schedule(p_endpoint text, p_changes jsonb default '{}'::jsonb)
returns table(enabled boolean, paused_until timestamptz, settled_at timestamptz)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  c jsonb := coalesce(p_changes, '{}'::jsonb);
  v public.push_subscriptions%rowtype;
  hour_keys text[] := array['weekday_start','weekday_end','weekend_start','weekend_end','weekday2_start','weekday2_end','weekend2_start','weekend2_end'];
  ws text; we text; es text; ee text; ws2 text; we2 text; es2 text; ee2 text;
  bad text;
begin
  if jsonb_typeof(c) <> 'object' then raise exception 'p_changes must be a JSON object' using errcode = '22023'; end if;
  select k into bad from jsonb_object_keys(c) k
    where k <> all (hour_keys || array['paused_until','settled_at','last_vote_at','tz','tz_offset_min','enabled']) limit 1;
  if bad is not null then raise exception 'Unknown field "%"', bad using errcode = '22023'; end if;

  -- Locked, so two calls for the same phone at the same moment take turns and the second sees the first.
  select * into v from public.push_subscriptions s where s.endpoint = p_endpoint for update;
  if not found then return; end if;

  ws  := case when c ? 'weekday_start'  then public.push_hhmm(c->>'weekday_start', 'Weekdays from')  else v.weekday_start end;
  we  := case when c ? 'weekday_end'    then public.push_hhmm(c->>'weekday_end', 'Weekdays until')   else v.weekday_end end;
  es  := case when c ? 'weekend_start'  then public.push_hhmm(c->>'weekend_start', 'Weekends from')  else v.weekend_start end;
  ee  := case when c ? 'weekend_end'    then public.push_hhmm(c->>'weekend_end', 'Weekends until')   else v.weekend_end end;
  ws2 := case when c ? 'weekday2_start' then public.push_hhmm(c->>'weekday2_start', 'Weekdays, second period, from') else v.weekday2_start end;
  we2 := case when c ? 'weekday2_end'   then public.push_hhmm(c->>'weekday2_end', 'Weekdays, second period, until') else v.weekday2_end end;
  es2 := case when c ? 'weekend2_start' then public.push_hhmm(c->>'weekend2_start', 'Weekends, second period, from') else v.weekend2_start end;
  ee2 := case when c ? 'weekend2_end'   then public.push_hhmm(c->>'weekend2_end', 'Weekends, second period, until') else v.weekend2_end end;
  if c ?| hour_keys then perform public.push_check_hours(ws, we, es, ee, ws2, we2, es2, ee2); end if;

  -- (least() and greatest() skip nulls, so an explicit null is handled before them.)
  update public.push_subscriptions s set
    weekday_start = ws, weekday_end = we, weekend_start = es, weekend_end = ee,
    weekday2_start = ws2, weekday2_end = we2, weekend2_start = es2, weekend2_end = ee2,
    paused_until  = case when not c ? 'paused_until' then s.paused_until
                         when c->>'paused_until' is null then null
                         else least((c->>'paused_until')::timestamptz, now() + interval '24 hours') end,
    settled_at    = case when not c ? 'settled_at' then s.settled_at
                         when c->>'settled_at' is null then null
                         else least((c->>'settled_at')::timestamptz, now()) end,
    last_vote_at  = case when c->>'last_vote_at' is null then s.last_vote_at   -- absent or null: unchanged
                         else greatest(s.last_vote_at, least((c->>'last_vote_at')::timestamptz, now())) end,
    tz            = case when c ? 'tz' then public.push_zone(c->>'tz') else s.tz end,
    tz_offset_min = coalesce(case when c ? 'tz_offset_min' then (c->>'tz_offset_min')::integer end, s.tz_offset_min),
    enabled       = coalesce(case when c ? 'enabled' then (c->>'enabled')::boolean end, s.enabled),
    updated_at    = now()
  where s.endpoint = p_endpoint;

  return query select s.enabled, s.paused_until, s.settled_at from public.push_subscriptions s where s.endpoint = p_endpoint;
end $$;
revoke all on function public.update_push_schedule(text, jsonb) from public;
grant execute on function public.update_push_schedule(text, jsonb) to anon, authenticated;

drop policy if exists "researchers can see registered phones" on public.push_subscriptions;
create policy "researchers can see registered phones"
  on public.push_subscriptions for select to authenticated
  using (true);

-- Removing a participant from the dashboard also removes their phones.
drop policy if exists "researchers can remove registered phones" on public.push_subscriptions;
create policy "researchers can remove registered phones"
  on public.push_subscriptions for delete to authenticated
  using (true);

-- ===================================================================================================
-- Table permissions
-- ===================================================================================================
-- Spelled out, so the script works whether or not the project was created with "Automatically expose
-- new tables": the row-level security policies above still decide which rows each role may touch.
-- The public key (anon) may only add check-ins; it reaches participants and phones only through the
-- functions. Signed-in researchers (authenticated) read everything and may approve and remove. The
-- reminder scripts use a secret key (service_role).
grant usage on schema public to anon, authenticated, service_role;
grant insert on public.comfort_votes to anon;
grant select on public.participants, public.comfort_votes, public.push_subscriptions to authenticated;
grant update, delete on public.participants to authenticated;
grant delete on public.push_subscriptions to authenticated;
grant select, insert, update, delete on public.participants, public.comfort_votes, public.push_subscriptions to service_role;

-- ===================================================================================================
-- Room sensors (for later)
-- ===================================================================================================
-- Room readings (for example every 5 minutes) loaded by the research team, one row per participant per timestamp.
create table if not exists public.sensor_readings (
  participant    text not null,
  ts             timestamptz not null,
  temperature_c  numeric(4,1),
  humidity_pct   numeric(4,1),
  room           text,
  source         text,
  primary key (participant, ts)
);
alter table public.sensor_readings enable row level security;
drop policy if exists "researchers can read readings" on public.sensor_readings;
create policy "researchers can read readings"
  on public.sensor_readings for select to authenticated
  using (true);
grant select on public.sensor_readings to authenticated;
grant select, insert, update, delete on public.sensor_readings to service_role;
