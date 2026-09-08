-- SWITCH comfort study: database setup.
-- Run this once in Supabase: SQL Editor > New query > paste > Run.
-- Safe to re-run.

create extension if not exists pgcrypto;

-- One row per submitted check-in.
create table if not exists public.comfort_votes (
  id             uuid primary key default gen_random_uuid(),
  client_id      text unique not null,          -- id generated on the phone; lets an offline retry not duplicate a row
  participant    text not null,                 -- pseudonymous code, e.g. P07
  ts             timestamptz not null,          -- moment of submission, UTC
  local_time     text,                          -- the same moment on the participant's clock, e.g. 2026-09-08 18:42
  tz_offset_min  integer,
  prompt         text,                          -- scheduled | self
  at_home        text,                          -- long (over an hour) | recent | out
  tsv            smallint check (tsv between -3 and 3),   -- ASHRAE thermal sensation vote
  preference     text,                          -- cooler | same | warmer
  clo            numeric(4,2),                  -- summed garment insulation
  garments       text[],
  met            numeric(3,1),
  activity       text,
  room           text,
  acceptability  text,
  comfort        text,
  air            text,
  air_pref       text,
  humidity       text,
  sun            text,
  actions        text[],                        -- adaptive actions since the last check-in
  notes          text[],
  same_as_last   boolean not null default false,
  seconds        integer,                       -- how long the check-in took
  app_version    text,
  created_at     timestamptz not null default now()
);
create index if not exists comfort_votes_participant_ts on public.comfort_votes (participant, ts);

alter table public.comfort_votes enable row level security;

-- Participants use the public anon key: they may add check-ins for a valid code and nothing else.
drop policy if exists "participants can add check-ins" on public.comfort_votes;
create policy "participants can add check-ins"
  on public.comfort_votes for insert to anon
  with check (participant ~ '^P[0-9]{2,3}$');

-- Researchers sign in on the dashboard: they may read everything.
drop policy if exists "researchers can read everything" on public.comfort_votes;
create policy "researchers can read everything"
  on public.comfort_votes for select to authenticated
  using (true);

-- Six-point comfort score (1 very uncomfortable ... 6 very comfortable), added alongside the text label.
alter table public.comfort_votes add column if not exists comfort_score smallint check (comfort_score between 1 and 6);

-- One row per participant. Codes are assigned automatically by register_participant() below.
-- Participants never read or write this table directly: the app only calls the function.
create table if not exists public.participants (
  code         text primary key,                -- P01, P02, ...
  email        text unique not null,
  name         text not null,
  gender       text,
  birth_year   integer,
  height_cm    numeric(5,1),
  weight_kg    numeric(5,1),
  sensitivity  text,                            -- cold | average | warm  (feels the cold easily ... feels the warmth easily)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create sequence if not exists public.participant_seq start 1;
alter table public.participants enable row level security;

drop policy if exists "researchers can read participants" on public.participants;
create policy "researchers can read participants"
  on public.participants for select to authenticated
  using (true);

-- Called by the app with the public key. With an email only: returns the existing participant's code
-- (the "I have registered before" path). With a name as well: creates the participant and assigns the
-- next code. Returns only the code and first name, never the profile.
create or replace function public.register_participant(
  p_email text, p_name text default null, p_gender text default null, p_birth_year integer default null,
  p_height_cm numeric default null, p_weight_kg numeric default null, p_sensitivity text default null)
returns table(code text, name text, is_new boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(p_email));
  v_code text; v_name text;
begin
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'That does not look like an email address' using errcode = '22023';
  end if;
  select p.code, p.name into v_code, v_name from public.participants p where p.email = v_email;
  if v_code is not null then
    return query select v_code, v_name, false; return;
  end if;
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'No participant is registered with that email' using errcode = 'P0002';
  end if;
  v_code := 'P' || lpad(nextval('public.participant_seq')::text, 2, '0');
  insert into public.participants (code, email, name, gender, birth_year, height_cm, weight_kg, sensitivity)
    values (v_code, v_email, trim(p_name), p_gender, p_birth_year, p_height_cm, p_weight_kg, p_sensitivity);
  return query select v_code, trim(p_name), true;
end $$;
revoke all on function public.register_participant(text, text, text, integer, numeric, numeric, text) from public;
grant execute on function public.register_participant(text, text, text, integer, numeric, numeric, text) to anon, authenticated;

-- One row per phone that has turned reminders on. The sender in switch/push/send.js reads these
-- every half hour and decides who is due a reminder; the app updates the schedule columns.
create table if not exists public.push_subscriptions (
  endpoint        text primary key,              -- the phone's push address, unique per browser install
  participant     text not null,
  p256dh          text not null,                 -- encryption keys that belong to this subscription
  auth            text not null,
  tz_offset_min   integer not null default 0,    -- the phone's offset from UTC when it registered
  weekday_start   text not null default '17:00', -- home hours, on the phone's clock
  weekday_end     text not null default '22:30',
  weekend_start   text not null default '09:00',
  weekend_end     text not null default '22:30',
  interval_min    integer not null default 30,
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

drop policy if exists "participants can register a phone" on public.push_subscriptions;
create policy "participants can register a phone"
  on public.push_subscriptions for insert to anon
  with check (participant ~ '^P[0-9]{2,3}$');

drop policy if exists "participants can update their reminders" on public.push_subscriptions;
create policy "participants can update their reminders"
  on public.push_subscriptions for update to anon
  using (participant ~ '^P[0-9]{2,3}$')
  with check (participant ~ '^P[0-9]{2,3}$');

drop policy if exists "researchers can see registered phones" on public.push_subscriptions;
create policy "researchers can see registered phones"
  on public.push_subscriptions for select to authenticated
  using (true);

-- For the next phase: 5-minute room readings from the Tapo T315 exports, one row per participant per timestamp.
create table if not exists public.sensor_readings (
  participant    text not null,
  ts             timestamptz not null,
  temperature_c  numeric(4,1),
  humidity_pct   numeric(4,1),
  room           text,
  source         text default 'tapo_t315',
  primary key (participant, ts)
);
alter table public.sensor_readings enable row level security;
drop policy if exists "researchers can read readings" on public.sensor_readings;
create policy "researchers can read readings"
  on public.sensor_readings for select to authenticated
  using (true);
