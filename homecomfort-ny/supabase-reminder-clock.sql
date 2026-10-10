-- Home Comfort NY (SUNY ESF): a punctual clock for the hourly reminders.
-- Run it in the Home Comfort NY Supabase project (never in another study's project).
--
-- GitHub's own schedule in .github/workflows/homecomfort-ny-reminders.yml is best effort. On the free runners the
-- "every hour" schedule ran only five or six times a day in September 2026 (about four hours apart), so
-- most reminders never went out. This file makes the Supabase database start that workflow instead, at
-- the top of every hour, through GitHub's "workflow dispatch" API: pg_cron is the clock, pg_net sends the
-- request. GitHub's schedule stays in the workflow as a backup; the sender never reminds the same phone
-- twice in one hour, so the two do not double up.
--
-- The request needs a GitHub token. It is kept in Supabase Vault, never in this repository.
--
-- One-time setup (also in homecomfort-ny/README.md, "The reminder clock"):
--   1. GitHub > Settings > Developer settings > Personal access tokens > Fine-grained tokens >
--      Generate new token. Repository access: only mehraban-smh/mehraban-smh.github.io.
--      Repository permissions: Actions = Read and write (nothing else). Expiry: after the study ends.
--   2. Supabase > SQL Editor > New query, paste this one line with your token in it, Run, then delete
--      the query (do not save it):
--        select vault.create_secret('github_pat_...', 'homecomfort_ny_github_token');
--      To replace the token later (for example when it expires):
--        select vault.update_secret((select id from vault.secrets where name = 'homecomfort_ny_github_token'), 'github_pat_...');
--   3. Paste this whole file into a new query and Run. Safe to re-run: it replaces the job of the same name.
--
-- Try it straight away:  select public.homecomfort_start_reminders();
--   then, a few seconds later, GitHub > Actions should show a new "Home Comfort NY reminders" run, and
--   select status_code, content, error_msg, created from net._http_response order by created desc limit 5;
--   shows 204 (or 200) for an accepted request. 401: the token is wrong or expired. 403 or 404: the token
--   lacks "Actions: Read and write" on this repository.
-- Recent clock ticks:    select status, return_message, start_time from cron.job_run_details
--                        where jobid = (select jobid from cron.job where jobname = 'homecomfort-ny-reminders')
--                        order by start_time desc limit 5;
-- Stop the clock:        select cron.unschedule('homecomfort-ny-reminders');

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'homecomfort_ny_github_token') then
    raise exception 'Store the GitHub token first (step 2 at the top of this file): select vault.create_secret(''github_pat_...'', ''homecomfort_ny_github_token'');';
  end if;
end $$;

-- Asks GitHub to run the reminders workflow now. Returns the pg_net request id (the answer arrives in
-- net._http_response a moment later). Only the database owner can run it: it is not callable with the
-- public key or a dashboard sign-in.
create or replace function public.homecomfort_start_reminders()
returns bigint
language sql
set search_path = public, extensions as $$
  select net.http_post(
    url := 'https://api.github.com/repos/mehraban-smh/mehraban-smh.github.io/actions/workflows/homecomfort-ny-reminders.yml/dispatches',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || s.decrypted_secret,
      'Accept', 'application/vnd.github+json',
      'User-Agent', 'homecomfort-ny-reminder-clock',
      'Content-Type', 'application/json'),
    body := '{"ref": "main"}'::jsonb,
    timeout_milliseconds := 10000)
  from vault.decrypted_secrets s
  where s.name = 'homecomfort_ny_github_token';
$$;
revoke all on function public.homecomfort_start_reminders() from public, anon, authenticated;

-- Every hour, on the hour (UTC; the sender works out each phone's own clock).
select cron.schedule('homecomfort-ny-reminders', '0 * * * *', 'select public.homecomfort_start_reminders()');
