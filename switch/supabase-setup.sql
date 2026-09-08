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
