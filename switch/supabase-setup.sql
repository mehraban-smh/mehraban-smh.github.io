-- HomePulse, the SWITCH home comfort study (Swansea): database setup.
-- Run this in Supabase: SQL Editor > New query > paste the whole file > Run.
-- Safe to re-run from top to bottom, also on the live project that already has participants (P01, ...)
-- and check-ins: tables are created only if missing, new columns are added with "add column if not
-- exists", policies are dropped and recreated, functions are replaced (a function whose arguments or
-- result changed is dropped first and created again), and the table permissions are spelled out at
-- the end. Nothing here deletes a participant, a check-in, a phone or a column.
--
-- Version 1.0 of the app (HomePulse) needs this file run BEFORE the new app is pushed. What it changes on a
-- database set up for 0.4.0:
--   - participants get a home profile (home), a random anonymous alias from Welsh wildlife for the Bay
--     Race (alias, alias_colour; everyone already registered gets one now), race_hidden and updated_at.
--   - participants choose a 4-digit PIN and each device gets its own key (participant_pins,
--     participant_devices). Participants who joined with 0.4.0 have no PIN yet: the first time they sign
--     in with 1.0 they give their email, a new PIN and their participant code (P07, which their phone
--     already holds), and that PIN becomes theirs.
--   - check-ins arrive only through submit_checkin() with the device's key. The public key can no longer
--     insert into comfort_votes directly, so a phone still running 0.4.0 has its check-ins refused until it
--     loads 1.0 (push the app straight after running this).
--   - check-ins gain the heating, thermostat and wall answers (heating_on, heating_src, heating_for,
--     stat_temp_c, wall). The legacy columns (comfort, comfort_score, humidity, air_pref) stay.
--   - points for the Bay Race are computed here, by one function (sw_points) for the app, the race and
--     the dashboard alike.
--   - registering a phone for reminders takes the device's key instead of the participant code.
--   - participant codes no longer break after P99 (P99 is followed by P100).

create extension if not exists pgcrypto;

-- ===================================================================================================
-- Participants, their home profile, and the approval step
--
-- One row per participant. Codes are assigned automatically by register_participant() below.
-- Participants never read or write this table directly: the app only calls the functions.
--
-- The check-in link is public, so joining needs a nod from the research team:
--   1. The app registers a profile through register_participant(). The new row has approved = false.
--   2. Every hour switch/push/notify.js (GitHub Actions) looks for rows with notified_at still null
--      and, if any of them are waiting, opens one issue in the repository listing them ("HomePulse: 2 new
--      participants waiting for approval", codes and times only, never the name or email), then
--      stamps notified_at. GitHub emails the repository owner about the issue.
--   3. The researcher opens the dashboard and clicks Approve, which sets approved = true (or Remove,
--      which deletes the row, the participant's PIN and device keys, and their registered phones).
--   4. Until then the participant cannot submit check-ins or register a phone for reminders (the
--      functions below check is_approved()), and the app asks every so often whether it may start.
--
-- home holds the home profile from sign-up as one JSON object, always metric (floor area in m2,
-- thermostat settings in degrees C). The keys are listed in switch/README.md ("The home profile").
-- Only the first half of the postcode is ever stored (postcode_area, e.g. SA1). Participants who joined
-- before 1.0 have home = null until they fill it in. The database requires no key and checks only
-- postcode_area (when present): questions the app stops asking (payment, stat_display and bedroom_trv after
-- 1.0) simply stop appearing in new profiles, and the answers already given stay.
--
-- alias is the participant's name in the Bay Race (e.g. "Puffin"): random, unique, never derived from
-- the code, given by the trigger below. alias_colour (0-7) picks their colour in the race.
-- ===================================================================================================
create table if not exists public.participants (
  code          text primary key,                -- P01, P02, ..., P99, P100, ...
  email         text unique not null,
  name          text not null,
  gender        text,
  birth_year    integer,
  height_cm     numeric(5,1),
  weight_kg     numeric(5,1),
  sensitivity   text,                            -- cold | average | warm  (feels the cold easily ... feels the heat easily)
  home          jsonb,                           -- the home profile (see above); null until given
  alias         text,                            -- anonymous name in the Bay Race, unique
  alias_colour  smallint check (alias_colour between 0 and 7),
  race_hidden   boolean not null default false,  -- "Show me in the Bay Race" switched off
  approved      boolean not null default false,  -- set from the dashboard; nothing is accepted from the code until then
  notified_at   timestamptz,                     -- set by notify.js once the team has been told about this registration
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()   -- approval, or the participant's last change to their profile
);
-- Projects set up with an earlier version of this file get the newer columns here. (Everyone registered
-- before the approval step existed shows as waiting for approval on the dashboard: approve them there.)
alter table public.participants add column if not exists gender text;
alter table public.participants add column if not exists birth_year integer;
alter table public.participants add column if not exists height_cm numeric(5,1);
alter table public.participants add column if not exists weight_kg numeric(5,1);
alter table public.participants add column if not exists sensitivity text;
alter table public.participants add column if not exists approved boolean not null default false;
alter table public.participants add column if not exists notified_at timestamptz;
alter table public.participants add column if not exists created_at timestamptz not null default now();
alter table public.participants add column if not exists updated_at timestamptz not null default now();
alter table public.participants add column if not exists home jsonb;
alter table public.participants add column if not exists alias text;
alter table public.participants add column if not exists alias_colour smallint check (alias_colour between 0 and 7);
alter table public.participants add column if not exists race_hidden boolean not null default false;
create unique index if not exists participants_alias_unique on public.participants (alias);
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

-- ---- Bay Race aliases: Welsh wildlife, then "Red Kite 2", "Puffin 2", ... once all forty are taken ----
create or replace function public.sw_alias_names()
returns text[]
language sql immutable set search_path = public as $$
  select array['Red Kite', 'Puffin', 'Otter', 'Grey Seal', 'Dolphin', 'Curlew', 'Kingfisher', 'Badger', 'Brown Hare', 'Heron',
               'Oystercatcher', 'Barn Owl', 'Pine Marten', 'Red Fox', 'Wren', 'Robin', 'Gannet', 'Peregrine', 'Salmon', 'Dragonfly',
               'Chough', 'Shearwater', 'Hedgehog', 'Red Squirrel', 'Gower Pony', 'Lapwing', 'Skylark', 'Mute Swan', 'Seahorse', 'Cormorant',
               'Kestrel', 'Buzzard', 'Dipper', 'Stoat', 'Osprey', 'Merlin', 'Swallow', 'Dormouse', 'Porpoise', 'Razorbill'];
$$;
revoke all on function public.sw_alias_names() from public, anon, authenticated;

-- A random alias nobody has yet.
create or replace function public.sw_free_alias()
returns text
language plpgsql volatile security definer set search_path = public as $$
declare r integer; v text;
begin
  for r in 1..1000 loop
    select x.c into v
      from (select case when r = 1 then n else n || ' ' || r end as c from unnest(public.sw_alias_names()) n) x
     where not exists (select 1 from public.participants p where p.alias = x.c)
     order by random() limit 1;
    if v is not null then return v; end if;
  end loop;
  return null;
end $$;
revoke all on function public.sw_free_alias() from public, anon, authenticated;

-- The runner colour fewest participants have (a random one of those), so the race stays easy to tell apart.
create or replace function public.sw_free_colour()
returns smallint
language sql volatile security definer set search_path = public as $$
  select c::smallint from generate_series(0, 7) c
   order by (select count(*) from public.participants p where p.alias_colour = c), random() limit 1;
$$;
revoke all on function public.sw_free_colour() from public, anon, authenticated;

-- Every new participant gets an alias and a colour. The lock makes two registrations at the same moment
-- take turns, so they never pick the same alias.
create or replace function public.sw_participant_alias()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.alias is null or new.alias_colour is null then
    perform pg_advisory_xact_lock(hashtext('switch participant alias'));
    if new.alias is null then new.alias := public.sw_free_alias(); end if;
    if new.alias_colour is null then new.alias_colour := public.sw_free_colour(); end if;
  end if;
  return new;
end $$;
revoke all on function public.sw_participant_alias() from public, anon, authenticated;
drop trigger if exists participants_alias on public.participants;
create trigger participants_alias before insert on public.participants
  for each row execute function public.sw_participant_alias();

-- Participants who joined before aliases existed get theirs now (one at a time, so no two are the same).
do $$
declare r record;
begin
  perform pg_advisory_xact_lock(hashtext('switch participant alias'));
  for r in select p.code from public.participants p where p.alias is null or p.alias_colour is null order by p.code loop
    update public.participants p
       set alias = coalesce(p.alias, public.sw_free_alias()), alias_colour = coalesce(p.alias_colour, public.sw_free_colour())
     where p.code = r.code;
  end loop;
end $$;

-- ===================================================================================================
-- One participant on any number of devices: a 4-digit PIN and a key per device
--
-- Participants choose a 4-digit PIN when they join. Joining, or signing in on another phone or tablet
-- with their email and PIN, gives that device a random key. The device keeps the key and sends it with
-- every check-in (submit_checkin) and when it loads the participant's own history, profile, points and
-- the Bay Race, so every device shows the same person.
-- Only a hash of each key and a salted hash of the PIN are stored, in two tables that nobody reads
-- directly: the public key and signed-in researchers reach them only through the functions below.
-- Five wrong tries in a row (a wrong PIN, or a wrong participant code, see below) lock signing in for that
-- participant: 15 minutes the first time, 1 hour the next, then 24 hours each time, until they sign in
-- successfully. Easy PINs (four of a digit, 1234, 4321, 0123, 9876, 1212, 2580) are refused when a PIN is set.
-- A participant without a PIN (one who joined with 0.4.0, or after a researcher cleared a forgotten PIN on
-- the dashboard with reset_participant_pin) chooses one by signing in with their email, the new PIN AND
-- their participant code (P07): the code is on their phone from 0.4.0, or the team gives it to them. The
-- email alone is never enough to take over an account.
-- ===================================================================================================
create table if not exists public.participant_pins (
  code         text primary key references public.participants(code) on delete cascade,
  salt         text,                            -- null (with pin_hash) until the participant has chosen a PIN
  pin_hash     text,                            -- sha-256 of salt:PIN
  failures     integer not null default 0,      -- wrong tries in a row
  lock_count   integer not null default 0,      -- locks since the last successful sign-in (15 min, 1 h, then 24 h)
  locked_until timestamptz,
  updated_at   timestamptz not null default now()
);
-- Projects set up with an earlier draft of this file: a row may now exist before the PIN does.
alter table public.participant_pins alter column salt drop not null;
alter table public.participant_pins alter column pin_hash drop not null;
alter table public.participant_pins add column if not exists lock_count integer not null default 0;
alter table public.participant_pins enable row level security;      -- no policies: the functions only

create table if not exists public.participant_devices (
  key_hash   text primary key,                  -- sha-256 of the device key (the key itself stays on the device)
  code       text not null references public.participants(code) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen  timestamptz
);
create index if not exists participant_devices_code on public.participant_devices (code);
alter table public.participant_devices enable row level security;   -- no policies: the functions only

revoke all on public.participant_pins, public.participant_devices from anon, authenticated;
grant select, insert, update, delete on public.participant_pins, public.participant_devices to service_role;

create or replace function public.sw_hash(p text)
returns text
language sql immutable set search_path = public as $$
  select encode(sha256(convert_to(coalesce(p, ''), 'UTF8')), 'hex');
$$;
revoke all on function public.sw_hash(text) from public, anon, authenticated;

-- A new device key for a participant (at most 10 devices each: the least recently used go).
create or replace function public.sw_new_key(p_code text)
returns text
language plpgsql security definer set search_path = public as $$
declare k text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  insert into public.participant_devices (key_hash, code, last_seen) values (public.sw_hash(k), p_code, now());
  delete from public.participant_devices d
   where d.code = p_code
     and d.key_hash in (select x.key_hash from public.participant_devices x where x.code = p_code
                        order by coalesce(x.last_seen, x.created_at) desc offset 10);
  return k;
end $$;
revoke all on function public.sw_new_key(text) from public, anon, authenticated;

-- The participant a device key belongs to (and the key is marked as used), or null.
create or replace function public.sw_code_of(p_key text)
returns text
language plpgsql security definer set search_path = public as $$
declare v text;
begin
  if p_key is null or length(p_key) < 32 or length(p_key) > 128 then return null; end if;
  update public.participant_devices d set last_seen = now() where d.key_hash = public.sw_hash(p_key) returning d.code into v;
  return v;
end $$;
revoke all on function public.sw_code_of(text) from public, anon, authenticated;

-- The checks register_participant() and update_my_profile() share. Values out of any sensible range are
-- refused with a message the app can show (22023), rather than a database error.
create or replace function public.sw_check_profile(p_name text, p_birth_year integer, p_height_cm numeric, p_weight_kg numeric, p_home jsonb)
returns void
language plpgsql stable set search_path = public as $$
begin
  if p_name is not null and length(trim(p_name)) > 100 then raise exception 'Please shorten the name' using errcode = '22023'; end if;
  if p_birth_year is not null and (p_birth_year < 1900 or p_birth_year > extract(year from now())::int - 18) then
    raise exception 'Please check the year of birth (you need to be 18 or over to take part)' using errcode = '22023';
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
  -- never the full postcode: only its first half (outward code) is stored
  if p_home ? 'postcode_area' and jsonb_typeof(p_home->'postcode_area') <> 'null'
     and coalesce(p_home->>'postcode_area', '') !~ '^[A-Z]{1,2}[0-9][A-Z0-9]?$' then
    raise exception 'Please give only the first half of your postcode (for example SA1)' using errcode = '22023';
  end if;
end $$;
revoke all on function public.sw_check_profile(text, integer, numeric, numeric, jsonb) from public, anon, authenticated;

-- A PIN nobody should choose: four of the same digit, or one of the commonest (the app refuses the same ones).
create or replace function public.sw_weak_pin(p text)
returns boolean
language sql immutable set search_path = public as $$
  select coalesce(p, '') ~ '^([0-9])\1{3}$' or coalesce(p, '') = any (array['1234', '4321', '0123', '9876', '1212', '2580']);
$$;
revoke all on function public.sw_weak_pin(text) from public, anon, authenticated;

-- One wrong try (a wrong PIN, or a wrong participant code while choosing a first PIN) for a participant whose
-- PIN row is locked by the caller. The fifth in a row locks signing in: 15 minutes the first time, 1 hour the
-- second, 24 hours from the third (lock_count is cleared only by a successful sign-in).
create or replace function public.sw_pin_failure(p_code text, out locked boolean, out tries_left integer, out wait_min integer)
language plpgsql security definer set search_path = public as $$
declare f integer; c integer;
begin
  select x.failures + 1, x.lock_count into f, c from public.participant_pins x where x.code = p_code;
  if f >= 5 then
    wait_min := case when c = 0 then 15 when c = 1 then 60 else 1440 end;
    update public.participant_pins x set failures = 0, lock_count = x.lock_count + 1,
           locked_until = now() + wait_min * interval '1 minute', updated_at = now() where x.code = p_code;
    locked := true; tries_left := 0;
  else
    update public.participant_pins x set failures = f, updated_at = now() where x.code = p_code;
    locked := false; tries_left := 5 - f;
  end if;
end $$;
revoke all on function public.sw_pin_failure(text) from public, anon, authenticated;

-- Email, PIN and (only for a participant who has no PIN yet) the participant code in; the outcome as a row,
-- never an error, so a wrong try stays counted:
--   ok           signed in: the code, name, approval, home profile, alias and a new device key
--                (pin_set: this PIN has just become the participant's PIN, as they had none)
--   wrong        wrong PIN; tries_left before the lock
--   locked       too many wrong tries; wait_min minutes to wait (15, 60 or 1440)
--   pin_needed   no PIN given, or not 4 digits. Given for EVERY email, registered or not, before anything is
--                looked up, so it tells nobody whether an email is in the study, and counts no try
--   code_needed  the participant has no PIN yet (joined with 0.4.0, or the team cleared it): send p_code too.
--                Without p_code: tries_left null, no try counted. With a wrong p_code: tries_left, one try counted
--   weak_pin     the participant code was right but the new PIN is too easy (nothing stored, no try counted)
--   not_found    no participant has that email (only answered when a 4-digit PIN came with it)
drop function if exists public.participant_sign_in(text, text);
drop function if exists public.participant_sign_in(text, text, text);
drop function if exists public.sw_sign_in(text, text);
drop function if exists public.sw_sign_in(text, text, text);
create or replace function public.sw_sign_in(p_email text, p_pin text, p_code text default null)
returns table(status text, tries_left integer, wait_min integer, code text, name text, is_new boolean,
              approved boolean, home jsonb, device_key text, pin_set boolean, alias text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  p record; pin record; f record; v_salt text; v_key text;
begin
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    return query select 'pin_needed'::text, null::integer, null::integer, null::text, null::text, false, null::boolean, null::jsonb, null::text, false, null::text;
    return;
  end if;
  select x.code, x.name, x.approved, x.home, x.alias into p from public.participants x where x.email = v_email;
  if not found then
    return query select 'not_found'::text, null::integer, null::integer, null::text, null::text, false, null::boolean, null::jsonb, null::text, false, null::text;
    return;
  end if;
  -- One row per participant holds the PIN (when there is one) and the count of wrong tries; locked, so two
  -- tries at the same moment take turns.
  insert into public.participant_pins (code) values (p.code) on conflict (code) do nothing;
  select x.salt, x.pin_hash, x.failures, x.lock_count, x.locked_until into pin from public.participant_pins x where x.code = p.code for update;
  if pin.locked_until is not null and pin.locked_until > now() then
    return query select 'locked'::text, 0, greatest(1, ceil(extract(epoch from pin.locked_until - now()) / 60))::integer, null::text, null::text, false, null::boolean, null::jsonb, null::text, false, null::text;
    return;
  end if;
  if pin.pin_hash is null then                               -- no PIN yet: this one becomes theirs, with their code
    if nullif(trim(coalesce(p_code, '')), '') is null then
      return query select 'code_needed'::text, null::integer, null::integer, null::text, null::text, false, null::boolean, null::jsonb, null::text, false, null::text;
      return;
    end if;
    if upper(trim(p_code)) <> p.code then
      select * into f from public.sw_pin_failure(p.code);
      return query select case when f.locked then 'locked' else 'code_needed' end::text, f.tries_left, f.wait_min, null::text, null::text, false, null::boolean, null::jsonb, null::text, false, null::text;
      return;
    end if;
    if public.sw_weak_pin(p_pin) then
      return query select 'weak_pin'::text, null::integer, null::integer, null::text, null::text, false, null::boolean, null::jsonb, null::text, false, null::text;
      return;
    end if;
    v_salt := replace(gen_random_uuid()::text, '-', '');
    update public.participant_pins x set salt = v_salt, pin_hash = public.sw_hash(v_salt || ':' || p_pin), failures = 0, lock_count = 0,
           locked_until = null, updated_at = now() where x.code = p.code;
    v_key := public.sw_new_key(p.code);
    return query select 'ok'::text, null::integer, null::integer, p.code::text, p.name::text, false, coalesce(p.approved, false), p.home::jsonb, v_key, true, p.alias::text;
    return;
  end if;
  if public.sw_hash(pin.salt || ':' || p_pin) <> pin.pin_hash then
    select * into f from public.sw_pin_failure(p.code);
    return query select case when f.locked then 'locked' else 'wrong' end::text, f.tries_left, f.wait_min, null::text, null::text, false, null::boolean, null::jsonb, null::text, false, null::text;
    return;
  end if;
  update public.participant_pins x set failures = 0, lock_count = 0, locked_until = null, updated_at = now() where x.code = p.code;
  v_key := public.sw_new_key(p.code);
  return query select 'ok'::text, null::integer, null::integer, p.code::text, p.name::text, false, coalesce(p.approved, false), p.home::jsonb, v_key, false, p.alias::text;
end $$;
revoke all on function public.sw_sign_in(text, text, text) from public, anon, authenticated;

-- "I have registered before" and "One more step": email and PIN, plus the participant code when the answer
-- was code_needed (see sw_sign_in for the outcome). The earlier two-argument version is dropped above.
create or replace function public.participant_sign_in(p_email text, p_pin text, p_code text default null)
returns table(status text, tries_left integer, wait_min integer, code text, name text, is_new boolean,
              approved boolean, home jsonb, device_key text, pin_set boolean, alias text)
language sql security definer set search_path = public as $$
  select * from public.sw_sign_in(p_email, p_pin, p_code);
$$;
revoke all on function public.participant_sign_in(text, text, text) from public;
grant execute on function public.participant_sign_in(text, text, text) to anon, authenticated;

-- Joining. A new email creates the participant with the profile, the home profile, the PIN and the next
-- code (P01 ... P99, P100, ...), and the device gets its key; an easy PIN gives weak_pin and creates
-- nothing. An email already registered is a sign-in with that PIN (the same outcome row as sw_sign_in,
-- without a participant code: a participant with no PIN gets code_needed and signs in instead), so one
-- email is always one participant. An unknown email without a name is pin_needed or not_found, as signing in.
-- The 0.4.0 version (seven arguments, no PIN) is dropped, and so is this one, as its result may change.
drop function if exists public.register_participant(text, text, text, integer, numeric, numeric, text);
drop function if exists public.register_participant(text, text, text, integer, numeric, numeric, text, jsonb, text);
create or replace function public.register_participant(
  p_email text, p_name text default null, p_gender text default null, p_birth_year integer default null,
  p_height_cm numeric default null, p_weight_kg numeric default null, p_sensitivity text default null,
  p_home jsonb default null, p_pin text default null)
returns table(status text, tries_left integer, wait_min integer, code text, name text, is_new boolean,
              approved boolean, home jsonb, device_key text, pin_set boolean, alias text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_code text; v_alias text; v_salt text; v_key text; n bigint;
begin
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or length(v_email) > 254 then
    raise exception 'That does not look like an email address' using errcode = '22023';
  end if;
  if exists (select 1 from public.participants x where x.email = v_email) then
    return query select * from public.sw_sign_in(v_email, p_pin);
    return;
  end if;
  if p_name is null or length(trim(p_name)) = 0 then
    return query select * from public.sw_sign_in(v_email, p_pin);         -- pin_needed or not_found
    return;
  end if;
  perform public.sw_check_profile(p_name, p_birth_year, p_height_cm, p_weight_kg, p_home);
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then raise exception 'Please choose a 4-digit PIN' using errcode = '22023'; end if;
  if public.sw_weak_pin(p_pin) then
    return query select 'weak_pin'::text, null::integer, null::integer, null::text, null::text, false, null::boolean, null::jsonb, null::text, false, null::text;
    return;
  end if;
  loop                                       -- never truncated: P99, P100, ... and never a code that is taken
    n := nextval('public.participant_seq');
    v_code := 'P' || lpad(n::text, greatest(2, length(n::text)), '0');
    exit when not exists (select 1 from public.participants x where x.code = v_code);
  end loop;
  begin
    insert into public.participants (code, email, name, gender, birth_year, height_cm, weight_kg, sensitivity, home)
      values (v_code, v_email, trim(p_name), left(trim(p_gender), 40), p_birth_year, p_height_cm, p_weight_kg,
              case when p_sensitivity in ('cold', 'average', 'warm') then p_sensitivity end, p_home)
      returning alias into v_alias;
  exception when unique_violation then       -- the same email joined a moment ago (two taps): sign in instead
    return query select * from public.sw_sign_in(v_email, p_pin);
    return;
  end;
  v_salt := replace(gen_random_uuid()::text, '-', '');
  insert into public.participant_pins (code, salt, pin_hash) values (v_code, v_salt, public.sw_hash(v_salt || ':' || p_pin));
  v_key := public.sw_new_key(v_code);
  return query select 'ok'::text, null::integer, null::integer, v_code, trim(p_name), true, false, p_home, v_key, true, v_alias;
end $$;
revoke all on function public.register_participant(text, text, text, integer, numeric, numeric, text, jsonb, text) from public;
grant execute on function public.register_participant(text, text, text, integer, numeric, numeric, text, jsonb, text) to anon, authenticated;

-- The participant's own profile for a signed-in device (the same on every device). A key that is not
-- (or no longer) valid is refused (28000), so the app asks to sign in again.
drop function if exists public.my_profile(text);
drop function if exists public.sw_profile(text);
create or replace function public.sw_profile(p_code text)
returns table(code text, name text, approved boolean, gender text, birth_year integer, height_cm numeric, weight_kg numeric,
              sensitivity text, home jsonb, alias text, alias_colour smallint, race_hidden boolean)
language sql stable security definer set search_path = public as $$
  select x.code, x.name, x.approved, x.gender, x.birth_year, x.height_cm, x.weight_kg, x.sensitivity, x.home, x.alias, x.alias_colour, x.race_hidden
    from public.participants x where x.code = p_code;
$$;
revoke all on function public.sw_profile(text) from public, anon, authenticated;

create or replace function public.my_profile(p_key text)
returns table(code text, name text, approved boolean, gender text, birth_year integer, height_cm numeric, weight_kg numeric,
              sensitivity text, home jsonb, alias text, alias_colour smallint, race_hidden boolean)
language plpgsql security definer set search_path = public as $$
declare v_code text := public.sw_code_of(p_key);
begin
  if v_code is null then raise exception 'This device is not signed in' using errcode = '28000'; end if;
  return query select * from public.sw_profile(v_code);
end $$;
revoke all on function public.my_profile(text) from public;
grant execute on function public.my_profile(text) to anon, authenticated;

-- "My home" in Settings, and "Tell us about your home" for participants who joined before 1.0.
-- p_fields holds only what changes, any of: name, gender, birth_year, height_cm, weight_kg, sensitivity.
-- p_home is the whole home profile (it replaces the stored one), or null to leave it. The same checks as
-- joining. Returns the profile afterwards.
drop function if exists public.update_my_profile(text, jsonb, jsonb);
create or replace function public.update_my_profile(p_key text, p_fields jsonb default '{}'::jsonb, p_home jsonb default null)
returns table(code text, name text, approved boolean, gender text, birth_year integer, height_cm numeric, weight_kg numeric,
              sensitivity text, home jsonb, alias text, alias_colour smallint, race_hidden boolean)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_code text := public.sw_code_of(p_key);
  f jsonb := coalesce(p_fields, '{}'::jsonb);
  bad text; v_name text; v_by integer; v_h numeric; v_w numeric;
begin
  if v_code is null then raise exception 'This device is not signed in' using errcode = '28000'; end if;
  if jsonb_typeof(f) <> 'object' then raise exception 'p_fields must be a JSON object' using errcode = '22023'; end if;
  select k into bad from jsonb_object_keys(f) k
   where k <> all (array['name', 'gender', 'birth_year', 'height_cm', 'weight_kg', 'sensitivity']) limit 1;
  if bad is not null then raise exception 'Unknown field "%"', bad using errcode = '22023'; end if;
  if f ? 'name' then
    v_name := trim(f->>'name');
    if coalesce(v_name, '') = '' then raise exception 'Please give your name' using errcode = '22023'; end if;
  end if;
  begin v_by := (f->>'birth_year')::numeric::integer; exception when others then raise exception 'Please check the year of birth' using errcode = '22023'; end;
  begin v_h := (f->>'height_cm')::numeric; exception when others then raise exception 'Please check the height' using errcode = '22023'; end;
  begin v_w := (f->>'weight_kg')::numeric; exception when others then raise exception 'Please check the weight' using errcode = '22023'; end;
  perform public.sw_check_profile(v_name, v_by, v_h, v_w, case when jsonb_typeof(p_home) = 'null' then null else p_home end);
  update public.participants x set
    name        = case when f ? 'name' then v_name else x.name end,
    gender      = case when f ? 'gender' then left(trim(f->>'gender'), 40) else x.gender end,
    birth_year  = case when f ? 'birth_year' then v_by else x.birth_year end,
    height_cm   = case when f ? 'height_cm' then v_h else x.height_cm end,
    weight_kg   = case when f ? 'weight_kg' then v_w else x.weight_kg end,
    sensitivity = case when f ? 'sensitivity' then (case when f->>'sensitivity' in ('cold', 'average', 'warm') then f->>'sensitivity' end) else x.sensitivity end,
    home        = case when p_home is null or jsonb_typeof(p_home) = 'null' then x.home else p_home end,
    updated_at  = now()
  where x.code = v_code;
  return query select * from public.sw_profile(v_code);
end $$;
revoke all on function public.update_my_profile(text, jsonb, jsonb) from public;
grant execute on function public.update_my_profile(text, jsonb, jsonb) to anon, authenticated;

-- Signing out on a device: its key stops working.
create or replace function public.forget_device(p_key text)
returns boolean
language sql security definer set search_path = public as $$
  with d as (delete from public.participant_devices x where x.key_hash = public.sw_hash(p_key) returning 1)
  select exists (select 1 from d);
$$;
revoke all on function public.forget_device(text) from public;
grant execute on function public.forget_device(text) to anon, authenticated;

-- Dashboard (signed-in researchers only): clear a forgotten PIN (the next sign-in sets a new one), sign
-- a participant out on all devices (a lost phone), and which participants have a PIN and how many devices.
-- reset_participant_pin clears the PIN and any lock now in force (the participant is usually on the phone
-- with the team), but not lock_count: only a successful sign-in clears that. The next sign-in then needs the
-- participant code with the new PIN. True when there was a PIN to clear.
create or replace function public.reset_participant_pin(p_code text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v boolean;
begin
  select x.pin_hash is not null into v from public.participant_pins x where x.code = upper(trim(p_code));
  update public.participant_pins x set salt = null, pin_hash = null, failures = 0, locked_until = null, updated_at = now()
   where x.code = upper(trim(p_code));
  return coalesce(v, false);
end $$;
revoke all on function public.reset_participant_pin(text) from public, anon;
grant execute on function public.reset_participant_pin(text) to authenticated;

create or replace function public.sign_out_devices(p_code text)
returns integer
language sql security definer set search_path = public as $$
  with d as (delete from public.participant_devices x where x.code = upper(trim(p_code)) returning 1)
  select count(*)::integer from d;
$$;
revoke all on function public.sign_out_devices(text) from public, anon;
grant execute on function public.sign_out_devices(text) to authenticated;

drop function if exists public.participant_sign_in_info();
create or replace function public.participant_sign_in_info()
returns table(code text, pin_set boolean, locked boolean, devices integer, last_seen timestamptz)
language sql security definer stable set search_path = public as $$
  select p.code, (pp.pin_hash is not null), coalesce(pp.locked_until > now(), false),
         (select count(*)::integer from public.participant_devices d where d.code = p.code),
         (select max(d.last_seen) from public.participant_devices d where d.code = p.code)
    from public.participants p left join public.participant_pins pp on pp.code = p.code
   order by p.code;
$$;
revoke all on function public.participant_sign_in_info() from public, anon;
grant execute on function public.participant_sign_in_info() to authenticated;

-- Called by the app (public key) while it waits to be let in. Returns only the approval flag for a
-- code, and no rows at all for a code that is not registered. Nothing else: the codes are short and
-- guessable, so this function must not hand out a name (or anything) for one.
-- The earlier version also returned the name; Postgres cannot change a function's return type in
-- place, so it is dropped first.
drop function if exists public.participant_status(text);
create or replace function public.participant_status(p_code text)
returns table(approved boolean)
language sql security definer stable set search_path = public as $$
  select p.approved from public.participants p where p.code = upper(trim(p_code));
$$;
revoke all on function public.participant_status(text) from public;
grant execute on function public.participant_status(text) to anon, authenticated;

-- Whether a code may take part. Runs as its owner, as anon cannot read participants. (Until 1.0 the
-- check-in policy called it; it is kept for the functions below and older callers.)
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
-- One row per submitted check-in.
create table if not exists public.comfort_votes (
  id             uuid primary key default gen_random_uuid(),
  client_id      text unique not null,          -- id generated on the phone; lets an offline retry not duplicate a row
  participant    text not null,                 -- pseudonymous code, e.g. P07
  ts             timestamptz not null,          -- moment of submission, UTC
  local_time     text,                          -- the same moment on the participant's clock, e.g. 2026-09-08 18:42
  tz_offset_min  integer,
  prompt         text,                          -- scheduled | self
  at_home        text,                          -- long (over an hour) | recent (just got in)
  tsv            smallint check (tsv between -3 and 3),   -- ASHRAE thermal sensation vote
  preference     text,                          -- cooler | same | warmer
  clo            numeric(4,2),                  -- summed garment insulation
  garments       text[],
  met            numeric(3,1),
  activity       text,
  room           text,
  acceptability  text,                          -- acceptable | unacceptable
  comfort        text,                          -- legacy (before 0.4.0), no longer sent
  air            text,                          -- still | slight | draughty
  air_pref       text,                          -- legacy, no longer sent
  humidity       text,                          -- legacy, no longer sent
  sun            text,                          -- yes | no | dark
  heating_on     text,                          -- on | off | unsure
  heating_src    text[],                        -- which heating is on (ids from the home profile, or other); null unless on
  heating_for    text,                          -- 30_60 | 1_2h | 2_4h | gt4h | always | unsure (lt30 in older rows); null unless on
  stat_temp_c    numeric(3,1),                  -- what the thermostat's screen showed (room temperature); asked by 1.0 only, null since
  wall           text,                          -- the nearest outside wall to the touch: cold | cool | neutral | warm | no_reach
  actions        text[],                        -- what they did in the last 30 minutes
  notes          text[],                        -- what they had or felt in the last 30 minutes
  same_as_last   boolean not null default false,  -- "still the same" quick check (0.4.0 only; always false from 1.0)
  seconds        integer,                       -- how long the check-in took
  app_version    text,
  created_at     timestamptz not null default now()
);
-- Projects set up with an earlier version of this file get the newer columns here.
alter table public.comfort_votes add column if not exists local_time text;
alter table public.comfort_votes add column if not exists tz_offset_min integer;
alter table public.comfort_votes add column if not exists prompt text;
alter table public.comfort_votes add column if not exists at_home text;
alter table public.comfort_votes add column if not exists preference text;
alter table public.comfort_votes add column if not exists clo numeric(4,2);
alter table public.comfort_votes add column if not exists garments text[];
alter table public.comfort_votes add column if not exists met numeric(3,1);
alter table public.comfort_votes add column if not exists activity text;
alter table public.comfort_votes add column if not exists room text;
alter table public.comfort_votes add column if not exists acceptability text;
alter table public.comfort_votes add column if not exists comfort text;
alter table public.comfort_votes add column if not exists air text;
alter table public.comfort_votes add column if not exists air_pref text;
alter table public.comfort_votes add column if not exists humidity text;
alter table public.comfort_votes add column if not exists sun text;
alter table public.comfort_votes add column if not exists actions text[];
alter table public.comfort_votes add column if not exists notes text[];
alter table public.comfort_votes add column if not exists same_as_last boolean not null default false;
alter table public.comfort_votes add column if not exists seconds integer;
alter table public.comfort_votes add column if not exists app_version text;
alter table public.comfort_votes add column if not exists created_at timestamptz not null default now();
-- Six-point comfort score (1 very uncomfortable ... 6 very comfortable), legacy, no longer sent.
alter table public.comfort_votes add column if not exists comfort_score smallint check (comfort_score between 1 and 6);
-- 1.0: the heating, thermostat and wall questions.
alter table public.comfort_votes add column if not exists heating_on text;
alter table public.comfort_votes add column if not exists heating_src text[];
alter table public.comfort_votes add column if not exists heating_for text;
alter table public.comfort_votes add column if not exists stat_temp_c numeric(3,1);
alter table public.comfort_votes add column if not exists wall text;
create index if not exists comfort_votes_participant_ts on public.comfort_votes (participant, ts);

alter table public.comfort_votes enable row level security;

-- Participants never write this table directly: their app calls submit_checkin() below with the device's
-- key, so only a signed-in device of an approved participant can add check-ins, and only as that
-- participant. (Until 1.0 the public key could insert rows for any approved code.)
drop policy if exists "participants can add check-ins" on public.comfort_votes;

-- Researchers sign in on the dashboard: they may read everything.
drop policy if exists "researchers can read everything" on public.comfort_votes;
create policy "researchers can read everything"
  on public.comfort_votes for select to authenticated
  using (true);

-- ---- reading a check-in sent by the app: what is not one of the app's answers is left out ----
-- A text value from the list, else null.
create or replace function public.sw_pick(j jsonb, k text, allowed text[])
returns text
language sql immutable set search_path = public as $$
  select case when jsonb_typeof(j->k) = 'string' and (j->>k) = any(allowed) then j->>k end;
$$;
revoke all on function public.sw_pick(jsonb, text, text[]) from public, anon, authenticated;

-- The items of an array that are on the list, each once, in the order given; null when it is not an array.
create or replace function public.sw_picks(j jsonb, k text, allowed text[])
returns text[]
language sql immutable set search_path = public as $$
  select case when jsonb_typeof(j->k) = 'array' then
    coalesce((select array_agg(d.x order by d.i)
                from (select e.v #>> '{}' as x, min(e.i) as i
                        from jsonb_array_elements(j->k) with ordinality as e(v, i)
                       where jsonb_typeof(e.v) = 'string' and (e.v #>> '{}') = any(allowed)
                       group by 1) d), '{}'::text[])
  end;
$$;
revoke all on function public.sw_picks(jsonb, text, text[]) from public, anon, authenticated;

-- A number (or a numeric string) kept between lo and hi, rounded to dp places; null when it is not a number.
create or replace function public.sw_num(j jsonb, k text, lo numeric, hi numeric, dp integer)
returns numeric
language sql immutable set search_path = public as $$
  select case when x.n is null then null else round(greatest(lo, least(hi, x.n)), dp) end
    from (select case when jsonb_typeof(j->k) = 'number' then (j->>k)::numeric
                      when jsonb_typeof(j->k) = 'string' and (j->>k) ~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$' then trim(j->>k)::numeric end as n) x;
$$;
revoke all on function public.sw_num(jsonb, text, numeric, numeric, integer) from public, anon, authenticated;

-- A moment, or null for anything that is not one.
create or replace function public.sw_ts(p text)
returns timestamptz
language plpgsql stable set search_path = public as $$
begin
  return p::timestamptz;
exception when others then
  return null;
end $$;
revoke all on function public.sw_ts(text) from public, anon, authenticated;

-- One check-in from a signed-in device. Returns
--   ok             saved
--   duplicate      a row with this client_id is already saved (a retry from the offline queue): nothing to do
--   not_signed_in  the key is unknown: sign in again
--   not_approved   the participant has not been approved (yet), or no longer is
--   invalid        not a check-in: no client_id (or longer than 64), no readable ts, a ts before 2026 or more
--                  than a day ahead, no tsv, or a row of more than 8000 characters
-- Anything else is cleaned rather than refused: answers that are not one of the app's options become null,
-- unknown items in a list are dropped, numbers are kept in range. The participant comes from the key, never
-- from the row. A saved check-in moves last_vote_at forward on every phone of that participant, so the
-- reminder gap (checkinGapMin) counts a check-in made on any of their devices.
create or replace function public.submit_checkin(p_key text, p_row jsonb)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text := public.sw_code_of(p_key);
  j jsonb := p_row;
  v_id text; v_ts timestamptz; v_tsv numeric; v_on text; n integer;
begin
  if v_code is null then return 'not_signed_in'; end if;
  if not public.is_approved(v_code) then return 'not_approved'; end if;
  if j is null or jsonb_typeof(j) <> 'object' or length(j::text) > 8000 then return 'invalid'; end if;
  v_id := case when jsonb_typeof(j->'client_id') in ('string', 'number') then j->>'client_id' end;
  v_ts := case when jsonb_typeof(j->'ts') = 'string' then public.sw_ts(j->>'ts') end;
  v_tsv := public.sw_num(j, 'tsv', -3, 3, 0);
  if coalesce(v_id, '') = '' or length(v_id) > 64 or v_ts is null or v_tsv is null
     or v_ts < timestamptz '2026-01-01' or v_ts > now() + interval '1 day' then return 'invalid'; end if;
  v_on := public.sw_pick(j, 'heating_on', array['on', 'off', 'unsure']);
  insert into public.comfort_votes (client_id, participant, ts, local_time, tz_offset_min, prompt, at_home, tsv, preference, acceptability,
                                    clo, garments, met, activity, room, air, sun, heating_on, heating_src, heating_for, stat_temp_c, wall,
                                    actions, notes, same_as_last, seconds, app_version)
  values (
    v_id, v_code, v_ts,
    case when jsonb_typeof(j->'local_time') = 'string' and (j->>'local_time') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}$' then j->>'local_time' end,
    public.sw_num(j, 'tz_offset_min', -840, 840, 0)::integer,
    public.sw_pick(j, 'prompt', array['self', 'scheduled']),
    public.sw_pick(j, 'at_home', array['long', 'recent']),
    v_tsv::smallint,
    public.sw_pick(j, 'preference', array['cooler', 'same', 'warmer']),
    public.sw_pick(j, 'acceptability', array['acceptable', 'unacceptable', 'clearly_acc', 'just_acc', 'just_unacc', 'clearly_unacc']),
    public.sw_num(j, 'clo', 0, 8, 2),
    public.sw_picks(j, 'garments', array['tshirt', 'long', 'jumper', 'hoodie', 'shorts', 'trousers', 'joggers', 'skirt', 'pyjamas',
                                         'coat_light', 'coat_winter', 'socks', 'slippers', 'blanket', 'duvet']),
    public.sw_num(j, 'met', 0.5, 5, 1),
    public.sw_pick(j, 'activity', array['sleep', 'lying', 'sit', 'desk', 'stand', 'house', 'walk', 'exercise']),
    public.sw_pick(j, 'room', array['living', 'bedroom', 'kitchen', 'office', 'bathroom', 'other']),
    public.sw_pick(j, 'air', array['still', 'slight', 'draughty']),
    public.sw_pick(j, 'sun', array['yes', 'no', 'dark']),
    v_on,
    public.sw_picks(j, 'heating_src', array['gas_combi', 'gas_tank', 'oil', 'lpg', 'ashp', 'gshp', 'storage', 'electric', 'communal', 'solid',
                                            'plugin', 'gas_fire', 'electric_fire', 'stove', 'open_fire', 'electric_blanket', 'main', 'other', 'unsure']),
    public.sw_pick(j, 'heating_for', array['lt30', '30_60', '1_2h', '2_4h', 'gt4h', 'always', 'unsure']),   -- lt30: older app versions
    public.sw_num(j, 'stat_temp_c', 5, 35, 1),
    public.sw_pick(j, 'wall', array['cold', 'cool', 'neutral', 'warm', 'no_reach']),
    public.sw_picks(j, 'actions', array['win_open', 'win_close', 'door_open', 'door_close', 'heat_up', 'heat_down', 'layer_on', 'layer_off',
                                        'blanket', 'fan', 'curtains', 'moved', 'none']),
    public.sw_picks(j, 'notes', array['hot_drink', 'cold_drink', 'ate', 'hungry', 'tired', 'unwell', 'none']),
    case when jsonb_typeof(j->'same_as_last') = 'boolean' then (j->>'same_as_last')::boolean else false end,
    public.sw_num(j, 'seconds', 0, 86400, 0)::integer,
    case when jsonb_typeof(j->'app_version') = 'string' then left(j->>'app_version', 20) end)
  on conflict (client_id) do nothing;
  get diagnostics n = row_count;
  if n = 0 then return 'duplicate'; end if;
  update public.push_subscriptions s set last_vote_at = greatest(s.last_vote_at, least(v_ts, now()))
   where s.participant = v_code;
  return 'ok';
end $$;
revoke all on function public.submit_checkin(text, jsonb) from public;
grant execute on function public.submit_checkin(text, jsonb) to anon, authenticated;

-- The participant's own check-ins, newest first, for a signed-in device: whichever phone or tablet they
-- were made on. Every answer, and created_at (when the database received it, which the points rules use),
-- nothing about anyone else. At most 10000 rows; the API's "max rows" (1000 on Supabase) still applies to
-- each request, so the app reads it page by page (?limit=1000&offset=...).
drop function if exists public.my_checkins(text);
create or replace function public.my_checkins(p_key text)
returns table(client_id text, ts timestamptz, local_time text, tz_offset_min integer, prompt text, at_home text,
              tsv smallint, preference text, acceptability text, clo numeric, garments text[], met numeric, activity text,
              room text, air text, sun text, heating_on text, heating_src text[], heating_for text, stat_temp_c numeric,
              wall text, actions text[], notes text[], same_as_last boolean, seconds integer, app_version text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare v_code text := public.sw_code_of(p_key);
begin
  if v_code is null then raise exception 'This device is not signed in' using errcode = '28000'; end if;
  return query select v.client_id, v.ts, v.local_time, v.tz_offset_min, v.prompt, v.at_home, v.tsv, v.preference, v.acceptability,
                      v.clo, v.garments, v.met, v.activity, v.room, v.air, v.sun, v.heating_on, v.heating_src, v.heating_for,
                      v.stat_temp_c, v.wall, v.actions, v.notes, v.same_as_last, v.seconds, v.app_version, v.created_at
                 from public.comfort_votes v where v.participant = v_code order by v.ts desc, v.client_id desc limit 10000;
end $$;
revoke all on function public.my_checkins(text) from public;
grant execute on function public.my_checkins(text) to anon, authenticated;

-- ===================================================================================================
-- Points and the Bay Race
--
-- The rules (the app's config.js says the same: checkinGapMin 45, dailyGoal 4, points 10 / 20 / 50 /
-- dailyCap 15, timeZone Europe/London; change both together):
--   A check-in counts when it is at least 45 minutes after that participant's previous check-in (any
--   row, counted or not, by ts), its ts is no more than 5 minutes in the future, it arrived on time (ts no
--   more than 48 hours before created_at, when the database received it, and no more than 5 minutes after:
--   so a back-dated or forward-dated row is kept as data but scores nothing), and it is among the first 15
--   counted check-ins of its day. A day is the UK calendar day of ts; weeks run Monday to Sunday.
--   10 points for each counted check-in, 20 more for each day with at least 4 counted (a goal day), and
--   50 more for each Monday-to-Sunday week whose 7 days are all goal days, counted in the period that
--   holds its Sunday.
-- sw_points() is the one place they are computed: my_points(), race() and points_table() all use it.
-- ===================================================================================================
-- Every check-in with its UK day and whether it counts. p_code: one participant, or null for everyone.
create or replace function public.sw_counted(p_code text default null)
returns table(participant text, client_id text, ts timestamptz, day date, counted boolean)
language sql stable set search_path = public as $$
  with v as (
    select v.participant, v.client_id, v.ts, v.created_at, (v.ts at time zone 'Europe/London')::date as day,
           lag(v.ts) over (partition by v.participant order by v.ts, v.client_id) as prev
      from public.comfort_votes v
     where p_code is null or v.participant = p_code
  ), e as (
    select v.*, ((v.prev is null or v.ts - v.prev >= interval '45 minutes') and v.ts <= now() + interval '5 minutes'
                 and v.ts >= v.created_at - interval '48 hours' and v.ts <= v.created_at + interval '5 minutes') as ok from v
  )
  select e.participant, e.client_id, e.ts, e.day,
         e.ok and row_number() over (partition by e.participant, e.day, e.ok order by e.ts, e.client_id) <= 15
    from e;
$$;
revoke all on function public.sw_counted(text) from public, anon, authenticated;

-- Per participant and UK day: check-ins and how many of them count.
create or replace function public.sw_days(p_code text default null)
returns table(participant text, day date, checkins integer, counted integer)
language sql stable set search_path = public as $$
  select c.participant, c.day, count(*)::integer, (count(*) filter (where c.counted))::integer
    from public.sw_counted(p_code) c group by c.participant, c.day;
$$;
revoke all on function public.sw_days(text) from public, anon, authenticated;

-- Points for the days p_from .. p_to (either may be null: open), per participant (p_code: just one).
create or replace function public.sw_points(p_from date, p_to date, p_code text default null)
returns table(participant text, checkins integer, counted integer, goal_days integer, full_weeks integer, points integer)
language sql stable set search_path = public as $$
  with d as (select * from public.sw_days(p_code)),
  weeks as (select d.participant, d.day - extract(isodow from d.day)::integer + 7 as sunday
              from d where d.counted >= 4
             group by 1, 2 having count(*) = 7),
  r as (select d.participant, sum(d.checkins)::integer as checkins, sum(d.counted)::integer as counted,
               (count(*) filter (where d.counted >= 4))::integer as goal_days
          from d where (p_from is null or d.day >= p_from) and (p_to is null or d.day <= p_to)
         group by d.participant),
  w as (select weeks.participant, count(*)::integer as n
          from weeks where (p_from is null or weeks.sunday >= p_from) and (p_to is null or weeks.sunday <= p_to)
         group by weeks.participant)
  select coalesce(r.participant, w.participant), coalesce(r.checkins, 0), coalesce(r.counted, 0), coalesce(r.goal_days, 0),
         coalesce(w.n, 0), 10 * coalesce(r.counted, 0) + 20 * coalesce(r.goal_days, 0) + 50 * coalesce(w.n, 0)
    from r full join w on w.participant = r.participant;
$$;
revoke all on function public.sw_points(date, date, text) from public, anon, authenticated;

-- This week (Monday to Sunday), last week (the Monday to Sunday before) or this month on the UK calendar, and
-- the race's finish line for it: a goal day every day (4 x 10 + 20 = 60) plus every full-week bonus (50 for each
-- Sunday in the period). Anything other than 'month' or 'last_week' means this week.
create or replace function public.sw_period(p_period text)
returns table(period text, day_from date, day_to date, target integer)
language plpgsql stable set search_path = public as $$
declare v_today date := (now() at time zone 'Europe/London')::date; v_from date; v_to date;
begin
  if p_period = 'month' then
    v_from := date_trunc('month', v_today::timestamp)::date;
    v_to := (v_from + interval '1 month')::date - 1;
  else
    v_from := v_today - extract(isodow from v_today)::integer + 1 - case when p_period = 'last_week' then 7 else 0 end;
    v_to := v_from + 6;
  end if;
  return query select case when p_period in ('month', 'last_week') then p_period else 'week' end, v_from, v_to,
    ((v_to - v_from + 1) * (4 * 10 + 20) + 50 * (select count(*) from generate_series(0, v_to - v_from) i where extract(isodow from v_from + i) = 7))::integer;
end $$;
revoke all on function public.sw_period(text) from public, anon, authenticated;

-- The participant's own points: all time, this week, last week, this month, counted check-ins and goal days
-- (all time), and the streak: goal days in a row ending today, or ending yesterday while today has not
-- reached the goal yet.
drop function if exists public.my_points(text);
create or replace function public.my_points(p_key text)
returns table(all_time integer, week integer, last_week integer, month integer, checkins_counted integer, goal_days integer, streak integer)
language plpgsql security definer set search_path = public as $$
declare
  v_code text := public.sw_code_of(p_key);
  v_today date := (now() at time zone 'Europe/London')::date;
  w record; lw record; m record; a record; v_goal date[]; v_start date; v_streak integer := 0;
begin
  if v_code is null then raise exception 'This device is not signed in' using errcode = '28000'; end if;
  select * into w from public.sw_period('week');
  select * into lw from public.sw_period('last_week');
  select * into m from public.sw_period('month');
  select coalesce(sum(x.points), 0)::integer as points, coalesce(sum(x.counted), 0)::integer as counted, coalesce(sum(x.goal_days), 0)::integer as goal_days
    into a from public.sw_points(null, null, v_code) x;
  select coalesce(array_agg(d.day), '{}'::date[]) into v_goal from public.sw_days(v_code) d where d.counted >= 4;
  v_start := case when v_today = any(v_goal) then v_today else v_today - 1 end;
  while (v_start - v_streak) = any(v_goal) loop v_streak := v_streak + 1; end loop;
  return query select a.points,
    coalesce((select x.points from public.sw_points(w.day_from, w.day_to, v_code) x), 0),
    coalesce((select x.points from public.sw_points(lw.day_from, lw.day_to, v_code) x), 0),
    coalesce((select x.points from public.sw_points(m.day_from, m.day_to, v_code) x), 0),
    a.counted, a.goal_days, v_streak;
end $$;
revoke all on function public.my_points(text) from public;
grant execute on function public.my_points(text) to anon, authenticated;

-- The Bay Race for this week, last week (p_period 'last_week': the Monday to Sunday before, target 470) or this
-- month. Approved participants only, by alias (never a code or a
-- name); those who switched "Show me in the Bay Race" off are left out for everyone else, but still see
-- the race and their own place (me.hidden). Runners are ranked by points (equal points share a place).
-- checkins = counted check-ins in the period. A caller who is not approved (yet) gets only their own
-- points: no runners, total 0, me.rank null.
drop function if exists public.race(text, text);
create or replace function public.race(p_key text, p_period text default 'week')
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_code text := public.sw_code_of(p_key);
  per record; v_out json; v_ok boolean;
begin
  if v_code is null then raise exception 'This device is not signed in' using errcode = '28000'; end if;
  v_ok := public.is_approved(v_code);
  select * into per from public.sw_period(p_period);
  with pts as (select * from public.sw_points(per.day_from, per.day_to)),
  r as (select p.code, p.alias, p.alias_colour, p.race_hidden, coalesce(x.points, 0) as points,
               coalesce(x.counted, 0) as checkins, coalesce(x.goal_days, 0) as goal_days
          from public.participants p left join pts x on x.participant = p.code
         where v_ok and p.approved and (not p.race_hidden or p.code = v_code)),
  k as (select r.*, (rank() over (order by r.points desc))::integer as rk from r)
  select json_build_object(
    'period', per.period, 'from', per.day_from, 'to', per.day_to, 'target', per.target,
    'total', (select count(*) from k),
    'me', (select json_build_object('alias', p.alias, 'colour', p.alias_colour,
                                    'points', coalesce((select x.points from pts x where x.participant = v_code), 0),
                                    'rank', (select k.rk from k where k.code = v_code), 'hidden', p.race_hidden)
             from public.participants p where p.code = v_code),
    'runners', coalesce((select json_agg(json_build_object('alias', k.alias, 'colour', k.alias_colour, 'points', k.points,
                                                           'checkins', k.checkins, 'goal_days', k.goal_days, 'rank', k.rk,
                                                           'is_me', k.code = v_code) order by k.rk, k.alias)
                           from k), '[]'::json))
    into v_out;
  return v_out;
end $$;
revoke all on function public.race(text, text) from public;
grant execute on function public.race(text, text) to anon, authenticated;

-- Settings > "Show me in the Bay Race". Returns what is stored now.
create or replace function public.set_race_hidden(p_key text, p_hidden boolean)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_code text := public.sw_code_of(p_key); v boolean;
begin
  if v_code is null then raise exception 'This device is not signed in' using errcode = '28000'; end if;
  update public.participants x set race_hidden = coalesce(p_hidden, false), updated_at = now() where x.code = v_code returning x.race_hidden into v;
  return v;
end $$;
revoke all on function public.set_race_hidden(text, boolean) from public;
grant execute on function public.set_race_hidden(text, boolean) to anon, authenticated;

-- Dashboard (signed-in researchers only): points per participant for the days p_from .. p_to (null: open),
-- including codes whose participant was removed (their check-ins are kept; alias null).
-- checkins = all check-ins in the period, counted = those that score.
drop function if exists public.points_table(date, date);
create or replace function public.points_table(p_from date default null, p_to date default null)
returns table(code text, alias text, race_hidden boolean, checkins integer, counted integer, goal_days integer,
              full_weeks integer, points integer, approved boolean)
language sql security definer stable set search_path = public as $$
  with c as (select p.code from public.participants p union select distinct v.participant from public.comfort_votes v),
  x as (select * from public.sw_points(p_from, p_to))
  select c.code, p.alias, coalesce(p.race_hidden, false), coalesce(x.checkins, 0), coalesce(x.counted, 0), coalesce(x.goal_days, 0),
         coalesce(x.full_weeks, 0), coalesce(x.points, 0), coalesce(p.approved, false)
    from c left join public.participants p on p.code = c.code left join x on x.participant = c.code
   order by c.code;
$$;
revoke all on function public.points_table(date, date) from public, anon;
grant execute on function public.points_table(date, date) to authenticated;

-- ===================================================================================================
-- Reminders
-- ===================================================================================================
-- One row per phone that has turned reminders on. The sender in switch/push/send.js reads these
-- every hour and decides who is due a reminder.
--
-- The app never reads or writes this table directly. It calls the two functions further down:
--   save_push_subscription()  turning reminders on, with the device's key: adds the phone under the key's
--                             participant, or refreshes it if it is already there
--   update_push_schedule()    "I'm out", "I just got in", new home hours, turning reminders off, the
--                             phone's time zone; it names the phone by its push endpoint (a long,
--                             unguessable address at a push service that only that phone knows, which is
--                             all the service worker's "Not home" button has). Returns the phone's state,
--                             or no row at all when the phone is not registered any more (the sender
--                             removes phones that the push service has dropped), so the app knows to
--                             register it again.
-- A saved check-in (submit_checkin) moves last_vote_at forward on all of the participant's phones.
-- A plain update with the public key can never work here: Postgres only updates rows the caller may also
-- read, and the public key must not read this table (it holds everyone's home hours).
create table if not exists public.push_subscriptions (
  endpoint        text primary key,              -- the phone's push address, unique per browser install
  participant     text not null,
  p256dh          text not null,                 -- encryption keys that belong to this subscription
  auth            text not null,
  tz              text,                          -- the phone's time zone, e.g. Europe/London (the sender reads
                                                 --   home hours in it; null: config.js timeZone)
  tz_offset_min   integer not null default 0,    -- the phone's offset from UTC when it last reported (for reference)
  weekday_start   text not null default '17:00', -- home hours, on the phone's clock
  weekday_end     text not null default '22:30',
  weekend_start   text not null default '09:00',
  weekend_end     text not null default '22:30',
  weekday2_start  text,                          -- optional second window for participants who want a more
  weekday2_end    text,                          --   customised schedule, "HH:MM" on the phone's clock,
  weekend2_start  text,                          --   null when unused. The sender reminds inside either
  weekend2_end    text,                          --   window (the functions refuse one that ends before it starts).
  interval_min    integer not null default 60,   -- informational; the sender uses reminderIntervalMin from config.js
  enabled         boolean not null default true,
  paused_until    timestamptz,                   -- set when the participant says they are out
  settled_at      timestamptz,                   -- set when they say they have just got home
  last_prompt_at  timestamptz,                   -- written by the sender
  last_vote_at    timestamptz,                   -- the participant's latest check-in (any device)
  user_agent      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.push_subscriptions alter column interval_min set default 60;
-- Projects set up with an earlier version of this file get the newer columns here.
alter table public.push_subscriptions add column if not exists weekday2_start text;
alter table public.push_subscriptions add column if not exists weekday2_end text;
alter table public.push_subscriptions add column if not exists weekend2_start text;
alter table public.push_subscriptions add column if not exists weekend2_end text;
alter table public.push_subscriptions add column if not exists tz text;
alter table public.push_subscriptions add column if not exists paused_until timestamptz;
alter table public.push_subscriptions add column if not exists settled_at timestamptz;
alter table public.push_subscriptions add column if not exists last_prompt_at timestamptz;
alter table public.push_subscriptions add column if not exists last_vote_at timestamptz;
alter table public.push_subscriptions add column if not exists user_agent text;
create index if not exists push_subscriptions_participant on public.push_subscriptions (participant);

alter table public.push_subscriptions enable row level security;

-- Earlier versions let the public key insert rows directly (any endpoint, any time zone) and had an
-- "update" policy that never took effect (see the note at the top of this section). Both are gone: the
-- two functions below are now the only way in, and they check what they store.
drop policy if exists "participants can register a phone" on public.push_subscriptions;
drop policy if exists "participants can update their reminders" on public.push_subscriptions;

-- True for an endpoint at one of the browser push services: Google (Chrome, Edge and others on Android),
-- Apple (Safari, iPhone), Mozilla (Firefox) and Microsoft (Edge on Windows). Anything else is refused, so
-- the sender only ever contacts those services. switch/push/send.js has the same list.
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

-- A time zone name Postgres knows (Europe/London), or null.
create or replace function public.push_zone(p_tz text)
returns text
language sql stable set search_path = public as $$
  select n.name from pg_timezone_names n where n.name = nullif(trim(p_tz), '') limit 1;
$$;
revoke all on function public.push_zone(text) from public, anon, authenticated;

-- Called by the app (public key) when the participant turns reminders on, with the device's key: adds
-- this phone under that participant, or, when the phone is already registered (same endpoint), refreshes
-- its keys, time zone and home hours and turns it back on. A phone that changes hands to another
-- participant starts without the previous person's pause and check-in times. Refused with 28000 for a key
-- that is not (or no longer) signed in, 42501 (which the API returns as 401) for a participant who is not
-- approved, 22023 for an endpoint outside the push services or unusable hours. An eleventh phone replaces the
-- participant's least recently used one (until round 3 it was refused with P0001, "too many phones").
-- Until 1.0 this took the participant code (p_participant) instead of the key; that version has the same
-- argument types, so the drop below removes it (and this one, which is then created again).
drop function if exists public.save_push_subscription(text, text, text, text, text, integer, text, text, text, text, text, text, text, text, integer, text);
create or replace function public.save_push_subscription(
  p_key text, p_endpoint text, p_p256dh text, p_auth text,
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
  v_code text;
  ws text := coalesce(public.push_hhmm(p_weekday_start, 'Weekdays from'), '17:00');
  we text := coalesce(public.push_hhmm(p_weekday_end, 'Weekdays until'), '22:30');
  es text := coalesce(public.push_hhmm(p_weekend_start, 'Weekends from'), '09:00');
  ee text := coalesce(public.push_hhmm(p_weekend_end, 'Weekends until'), '22:30');
  ws2 text := public.push_hhmm(p_weekday2_start, 'Weekdays, second period, from');
  we2 text := public.push_hhmm(p_weekday2_end, 'Weekdays, second period, until');
  es2 text := public.push_hhmm(p_weekend2_start, 'Weekends, second period, from');
  ee2 text := public.push_hhmm(p_weekend2_end, 'Weekends, second period, until');
begin
  v_code := public.sw_code_of(p_key);
  if v_code is null then raise exception 'This device is not signed in' using errcode = '28000'; end if;
  if not public.is_approved(v_code) then
    raise exception 'This participant may not register a phone yet' using errcode = '42501';
  end if;
  if not public.push_endpoint_ok(p_endpoint) or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = ''
     or length(p_p256dh) > 200 or length(p_auth) > 100 then
    raise exception 'That is not a push subscription from a known push service' using errcode = '22023';
  end if;
  perform public.push_check_hours(ws, we, es, ee, ws2, we2, es2, ee2);
  -- At most ten phones per participant (the sender reads them all), and never a participant stuck at "too many
  -- phones": the app needs reminders on a phone or tablet before it checks in. A phone that turned reminders off
  -- has dropped its subscription, so its row goes first. Then, when the other phones still number ten, the least
  -- recently used go until this one fits: the oldest updated_at, i.e. the phone whose app (or notification
  -- button) last talked to the database the longest ago. Only the participant's own signed-in device gets here
  -- (the key above), so nobody else can push their phones out. The lock makes two phones registering at the same
  -- moment take turns, so the count never passes ten.
  perform pg_advisory_xact_lock(hashtext('switch phones ' || v_code));
  delete from public.push_subscriptions s where s.participant = v_code and s.enabled = false and s.endpoint <> p_endpoint;
  delete from public.push_subscriptions s
   where s.participant = v_code and s.endpoint <> p_endpoint
     and s.endpoint in (select x.endpoint from public.push_subscriptions x where x.participant = v_code and x.endpoint <> p_endpoint
                        order by x.updated_at desc, x.created_at desc, x.endpoint desc offset 9);
  insert into public.push_subscriptions as s
    (endpoint, participant, p256dh, auth, tz, tz_offset_min,
     weekday_start, weekday_end, weekend_start, weekend_end, weekday2_start, weekday2_end, weekend2_start, weekend2_end,
     interval_min, enabled, user_agent, last_vote_at)
  values
    (p_endpoint, v_code, p_p256dh, p_auth, public.push_zone(p_tz), coalesce(p_tz_offset_min, 0),
     ws, we, es, ee, ws2, we2, es2, ee2,
     coalesce(p_interval_min, 60), true, left(p_user_agent, 200),
     (select least(max(v.ts), now()) from public.comfort_votes v where v.participant = v_code))
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
    last_vote_at = case when s.participant = excluded.participant then greatest(s.last_vote_at, excluded.last_vote_at) else excluded.last_vote_at end,
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
-- most now), last_vote_at only ever moves forward, and a pause is at most a day long.
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
-- The public key (anon) has no table rights at all: it reaches participants, check-ins and phones only
-- through the functions (until 1.0 it could insert check-ins directly; that right is taken away here).
-- Signed-in researchers (authenticated) read everything, may approve (update) and remove participants,
-- and remove phones. The reminder scripts use a secret key (service_role).
grant usage on schema public to anon, authenticated, service_role;
revoke all on public.participants, public.comfort_votes, public.push_subscriptions from anon;
revoke insert, update, delete, truncate on public.comfort_votes from authenticated;
revoke insert, truncate on public.participants from authenticated;
revoke insert, update, truncate on public.push_subscriptions from authenticated;
grant select on public.participants, public.comfort_votes, public.push_subscriptions to authenticated;
grant update, delete on public.participants to authenticated;
grant delete on public.push_subscriptions to authenticated;
grant select, insert, update, delete on public.participants, public.comfort_votes, public.push_subscriptions to service_role;
revoke all on sequence public.participant_seq from anon, authenticated;

-- ===================================================================================================
-- Room sensors (next phase)
-- ===================================================================================================
-- 5-minute room readings from the Tapo T315 exports. A home has one or two sensors, in the living room and the
-- bedroom, so a reading is one row per participant, room and timestamp: two sensors may log the same moment.
-- room uses the check-in's room ids (comfort_votes.room): living | bedroom.
create table if not exists public.sensor_readings (
  participant    text not null,
  room           text not null default 'living',
  ts             timestamptz not null,
  temperature_c  numeric(4,1),
  humidity_pct   numeric(4,1),
  source         text default 'tapo_t315',
  primary key (participant, room, ts)
);
-- Projects set up before (key participant + ts, room optional): readings without a room were the living room,
-- the room becomes required, and the key gains the room. Only the old two-column key is replaced; a second
-- run finds the new one and changes nothing.
update public.sensor_readings set room = 'living' where room is null;
alter table public.sensor_readings alter column room set default 'living';
alter table public.sensor_readings alter column room set not null;
do $$
declare v_name text; v_cols text[];
begin
  select c.conname, array_agg(a.attname::text order by k.ord) into v_name, v_cols
    from pg_constraint c
    cross join lateral unnest(c.conkey) with ordinality as k(attnum, ord)
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
   where c.conrelid = 'public.sensor_readings'::regclass and c.contype = 'p'
   group by c.conname;
  if v_name is null then
    alter table public.sensor_readings add constraint sensor_readings_pkey primary key (participant, room, ts);
  elsif v_cols = array['participant', 'ts'] then
    execute format('alter table public.sensor_readings drop constraint %I', v_name);
    alter table public.sensor_readings add constraint sensor_readings_pkey primary key (participant, room, ts);
  elsif v_cols <> array['participant', 'room', 'ts'] then
    raise notice 'sensor_readings has a primary key on (%), left as it is', array_to_string(v_cols, ', ');
  end if;
end $$;
alter table public.sensor_readings enable row level security;
drop policy if exists "researchers can read readings" on public.sensor_readings;
create policy "researchers can read readings"
  on public.sensor_readings for select to authenticated
  using (true);
revoke all on public.sensor_readings from anon;
grant select on public.sensor_readings to authenticated;
grant select, insert, update, delete on public.sensor_readings to service_role;
