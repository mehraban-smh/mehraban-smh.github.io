# SWITCH personal comfort study — web pages

Three pages, all unlisted (no links from the main site, `noindex` on every page):

| Page | URL | Who |
|---|---|---|
| Study page | `https://mehraban.uk/switch/` | Participants, partners |
| Check-in app | `https://mehraban.uk/switch/checkin/?p=P07` | One link per participant |
| Dashboard | `https://mehraban.uk/switch/dashboard/` | Research team (sign-in) |

GitHub Pages only serves files, so the check-ins need a small database. The pages are written for
[Supabase](https://supabase.com) (Postgres, free tier, London region) and talk to it with plain `fetch`,
no library. Until `config.js` is filled in, both apps run in **local mode**: check-ins stay in the
participant's browser, and the dashboard shows only the browser it is opened in.

## One-time setup (about 15 minutes)

1. Create a Supabase account and a new project. Pick the **London (eu-west-2)** region and a strong database password (you will not need it again).
2. In the project, open **SQL Editor → New query**, paste the whole of `supabase-setup.sql`, and click **Run**. This creates the `participants`, `comfort_votes` and `push_subscriptions` tables, a `sensor_readings` table for later, the registration and approval functions, and the row-level security policies. Run it again whenever the file changes; it is safe to re-run.
3. **Authentication → Sign In / Providers → Email**: keep Email enabled and turn **off** "Confirm email". Then under **Authentication → Sign In / Up** turn **off** "Allow new users to sign up", so nobody else can create a dashboard login.
4. **Authentication → Users → Add user → Create new user**: the research team login (email + password, tick "Auto confirm user"). This is what the dashboard sign-in uses.
5. **Settings → API Keys**: copy the **Publishable key** (`sb_publishable_...`) into `supabaseAnonKey` in `config.js`, and the **Project URL** from **Settings → Data API** into `supabaseUrl`. Commit and push. The publishable key is meant to be public; the policies and functions from step 2 limit it to registering, checking approval, and, for an approved participant code, inserting check-ins and registering a phone for reminders. A phone's reminder row can then only be changed through its own push endpoint, which only that phone knows. (Older projects show legacy `anon` and `service_role` keys instead; those work too.)

Open `https://mehraban.uk/switch/dashboard/`, sign in, and you should see an empty study. Submit a test check-in
by registering yourself in the check-in app, approving yourself on the dashboard (the "waiting for approval" block), and
then answering one check-in; press **Refresh** and it appears. Unregistered test codes such as `?p=P99` are refused by the database.

## Participants and codes

Everyone opens the same link, `https://mehraban.uk/switch/checkin/`. The first time, the app asks for a profile
(name, email, gender, year of birth, height, weight, thermal sensitivity) and calls the database function
`register_participant`, which stores the profile in the `participants` table and assigns the next code
(`P01`, `P02`, ...). Only the code travels with the check-ins; the dashboard joins it back to the name.

The code is remembered on the phone. On a new phone, or inside the home-screen copy of the app on iPhone (which
keeps its own storage), the participant chooses "I have registered before" and enters their email to continue.

### Approval

The link is public, so a registration has to be approved before it counts:

1. A new participant starts as **awaiting approval** (`approved = false` in `participants`). The database refuses
   their check-ins and reminder sign-up until then, and the app shows them a waiting screen and checks
   `participant_status` every so often.
2. Within the hour the reminders workflow (`switch/push/notify.js`, see below) opens one **issue in this repository**
   titled "1 new participant waiting for approval" (or "3 new participants ..."), listing everyone who has registered
   since the last issue, assigned to you, so GitHub emails you. The issue contains only the codes, the registration
   times and the dashboard link, never a name or email (the repository is public).
3. Open the **dashboard**: "All participants" lists everyone waiting at the top, with their name and email, and each
   profile shows the status. Click **Approve** to let them in or **Remove** to delete the registration (and any
   phones they registered). Then close the issue. Anyone you do not recognise, remove.

After you run the new `supabase-setup.sql` on an existing project, everyone already registered shows as waiting;
approve them on the dashboard (one issue listing them is opened on the next hourly run unless you get there first).
Until you have run it, the dashboard shows the notice "The database has not been updated yet: run supabase-setup.sql
again in Supabase, then Refresh" instead of the waiting list (there is no `approved` column to set yet), and the
Approve and Remove buttons say the same if the database refuses them.

**What the email protects, and what it does not.** The email address is the participant's only credential: "I have
registered before" returns the code and first name for any email that is on the list, so anyone who knows an approved
participant's email could continue as them and submit check-ins under their code. That is accepted for this study:
the participants are known to the research team, the data are comfort votes (nothing worth impersonating someone
for), nobody can read another participant's data through the app, and a password would cost far more in lost
participants than it would protect. The only thing that leaks to a guessed *code* is whether it has been approved
(`participant_status` returns nothing else). If you ever suspect misuse, remove the participant on the dashboard and
ask them to register again.

## The check-in

A check-in starts with "Are you at home right now?". "Yes, for over an hour" and "Yes, I just got in" both go on to
the questions (the answer is stored in `at_home` as `long` or `recent`); "No, I'm out" offers a pause of one, three
or five hours (each showing the time it ends), until 19:00 (before 19:00 only), or until the participant is back
(12 hours at most).

Every check-in asks the **same ten questions in the same order**: thermal sensation, preference, acceptability,
clothing, activity, room, air movement, sunlight, what has changed since last time, and anything else worth noting
(hot or cold drink, just ate, hungry, tired, unwell). From the second check-in on, a **quick check** comes first: it
shows the answers of the last check-in, each with an **Edit** button. "Yes, still the same" saves them at once with
nothing more to ask (what has changed and anything to note are saved as empty), marked `same_as_last`; after an edit
the button reads "Save with my changes" and the row is not marked `same_as_last`. "Something has changed" asks all
ten questions. Two check-ins, from the same participant or from two participants, always hold the same fields, so
the rows in `comfort_votes` compare directly.

Since version 0.4.0 (`app_version`) the app no longer asks overall comfort (the six-point scale), humidity or which
air movement the participant would like, and those answers are not kept: the app no longer sends them, drops them from
the check-ins stored on the phone (and from any still waiting to sync), and the dashboard no longer shows or exports
them. Answers already in the database stay in its `comfort`, `comfort_score`, `humidity` and `air_pref` columns until
those columns are dropped there.

**My check-ins** on the start screen lists everything submitted from that phone, with three small charts at the top.
Tapping a row opens a pop-up summary of that check-in; the list itself is the only part of the app that scrolls.

## Testing

Add `?debug=1` to the check-in URL to see a "What gets stored" panel under the phone with every row, a copy-as-CSV
button, and controls to seed or clear example data. Example rows are marked as such and are never synced.

`?p=P99` in the URL still forces a code without a profile, but the database only accepts check-ins and reminder
sign-ups from a registered, approved code, so for an end-to-end test register normally and approve yourself on
the dashboard. Without a database configured (local mode) nothing needs approving.

## Reminders (push notifications) and approval emails

Every hour, on the hour, the Supabase database starts a GitHub Actions workflow (`.github/workflows/push-reminders.yml`;
see "The reminder clock" below), which runs two scripts in `switch/push/`:

- `send.js` reads the registered phones from the `push_subscriptions` table and sends a web push to each one that
  is due. A phone is sent to when reminders are on and not paused (the participant has not said they are out),
  at least an hour has passed since `settled_at` (no longer set by the app since 0.4.0, when "Yes, I just got in"
  started going straight to the check-in), at least 30 minutes have passed since their
  last check-in, it has not had a reminder yet in this clock hour (nor in the last 45 minutes), and the phone's
  local time is inside the participant's home hours (weekdays 17:00–22:30 and weekends 09:00–22:30 unless they
  change it in the app). Anyone who wants a more customised schedule can add a **second window** for weekdays and
  for weekends on the reminder-hours screen (say 06:00–09:00 as well as 17:00–22:30); a reminder is then due inside
  either window. The second window is stored in `weekday2_start/end` and `weekend2_start/end` in
  `push_subscriptions`, empty when unused. Every window must end after it starts: the app and the database refuse
  anything else (for "until midnight" the app asks for 23:59; hours saved by an older version as "until 00:00"
  are read as until 23:59). A run that starts in the first few minutes of the hour is judged at the top of the
  hour, so a window ending at 09:00 still gets its 09:00 reminder. Local time is read in the phone's own time zone
  (`tz`, e.g. `Europe/London`, which the app reports every time it opens), so the clocks changing needs nothing
  from anyone; a phone that has not reported one yet is read in `timeZone` from `config.js` (`Europe/London`).
  The interval is `reminderIntervalMin` in `config.js` (60). The push expires after 25 minutes, so an offline
  phone never receives a backlog.
- `notify.js` opens one issue listing every newly registered participant who is still waiting for approval (see
  "Approval" above), at most 25 per run, and records in `participants.notified_at` that you have been told, only
  once the issue exists.

The app never writes `push_subscriptions` directly. It calls two database functions from `supabase-setup.sql`,
and the phone's push address (its "endpoint", which only that phone knows) shows which row is its own:
`save_push_subscription` when reminders are turned on, and `update_push_schedule` for everything after that
("No, I'm out", "Yes, I just got in", each check-in, new home hours, turning reminders off, the time zone).
Each call changes only that phone's row: anyone who knows an approved code could register an endpoint of their
own under it, so nothing they send may reach the participant's real phones. A participant with two phones
therefore has a schedule per phone. Only endpoints at the browser push services are accepted (Google for
Chrome and Android, Apple for Safari and iPhone, Mozilla for Firefox, Microsoft for Edge on Windows; the list is
`push_endpoint_ok()` in `supabase-setup.sql` and `PUSH_SERVICE` in `send.js`), at most ten phones per
participant code (a phone that turned reminders off no longer counts), and the sender reads the phones page by
page, so a flood of made-up registrations under one code cannot crowd anyone else out. A change made offline
waits on the phone and is sent the next time the app reaches the service (a pause or "just got in" only within
the hour, so it never overrides a newer "Not home" from the notification). When the app opens it also checks that the
reminder service still knows the phone: the sender removes phones whose push subscription has expired, and the
app then subscribes again by itself, or, if the phone will not allow that, shows "Reminders have stopped" on
the start screen so the participant can turn them on again. A participant who has been removed on the dashboard
gets the welcome screen instead.

On Android the notification has "I'm home" and "Not home" buttons; "Not home" pauses reminders for two hours
without opening the app, and the app shows the pause the next time it is opened. On iPhone the notification
opens the app, which asks "Are you at home?" first. "I'll tell you when I'm back" pauses reminders until the
participant checks in again, or for 12 hours at the most, and the start screen says when they resume.

One-time setup, after the database setup above:

1. Run `supabase-setup.sql` again in the Supabase SQL editor. It also creates `push_subscriptions`, the
   approval columns and functions, the columns for the optional second reminder window and the phone's time
   zone, and the two reminder functions. When a change to the app needs new database functions, run the file
   first and push the app straight after: in between, turning reminders on fails with "This phone could not be
   registered" (nothing else is affected, and participants can simply try again).
2. In the GitHub repository open **Settings -> Secrets and variables -> Actions** and add two repository secrets:
   - `SUPABASE_SERVICE_ROLE_KEY`: a **secret key** from Settings -> API Keys -> Secret keys -> "Create new secret key"
     (`sb_secret_...`, shown once). It bypasses row-level security, so it must only ever live in this secret, never
     in the site. A legacy `service_role` key works too.
   - `VAPID_PRIVATE_KEY`: the whole content of `Documents\switch-vapid-private-key.txt` on the machine where the
     pages were built (one 43-character line). The matching public key is already in `config.js`.
   The project URL is not a secret; both scripts read it from `config.js`. The approval issues need no extra
   secret: the workflow uses its own `GITHUB_TOKEN`, which the workflow file grants `issues: write`.
3. Test it: **Actions → Comfort check-in reminders → Run workflow**, type a participant code that has turned
   reminders on, and the phone should buzz within a minute. Tick "dry run" to only see the decisions and the
   issue that would be opened in the log, without sending or changing anything. On your own machine,
   `SELFTEST=1 node send.js` (Git Bash, macOS, Linux) or `$env:SELFTEST=1; node send.js` (PowerShell) in `switch/push` checks the decision rules (home hours, the second window, pauses,
   time zones and the clocks changing, one reminder per hour) against known cases with no secrets and no network.
4. Start the reminder clock (next section).

Participants turn reminders on from the "Turn on reminders" card on the app's start screen. On iPhone this only
works inside the home-screen copy of the app, and the app says so.

### The reminder clock

GitHub's own schedule is best effort. On the free runners the hourly schedule ran only five or six times a day in
September 2026, about four hours apart, so most reminders never went out. The workflow therefore keeps GitHub's
schedule only as a backup (at 7 and 37 minutes past the hour), and the Supabase database starts it at the top of
every hour instead: `supabase-reminder-clock.sql` sets up a `pg_cron` job that calls GitHub's "workflow dispatch"
API through `pg_net`. The sender reminds a phone at most once per clock hour, so the clock and the backup never
double up. Once, about five minutes:

1. On GitHub: **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new
   token**. Repository access: **Only select repositories → mehraban-smh.github.io**. Repository permissions:
   **Actions → Read and write** (nothing else). Pick an expiry date after the end of the study, and note it: when
   the token expires the clock stops and only the backup schedule is left.
2. In Supabase: **SQL Editor → New query**, paste this one line with the token in it, **Run**, then delete the
   query without saving it (the token is kept encrypted in Supabase Vault, never in this repository):
   `select vault.create_secret('github_pat_...', 'switch_github_token');`
3. Paste the whole of `supabase-reminder-clock.sql` into a new query and **Run**.
4. Test it: run `select public.switch_start_reminders();`. A new "Comfort check-in reminders" run appears under
   **Actions** within seconds, and `select status_code, content, created from net._http_response order by created desc limit 5;`
   shows `204` (or `200`). `401` means the token is wrong or has expired; `403` or `404` that it lacks "Actions:
   Read and write" on this repository.

A new token later: `select vault.update_secret((select id from vault.secrets where name = 'switch_github_token'), 'github_pat_...');`.
To stop the reminders at the end of the study: `select cron.unschedule('switch-reminders');` and, under **Actions →
Comfort check-in reminders**, "Disable workflow". GitHub also disables a scheduled workflow by itself in a public
repository after 60 days without any commit; if the Actions page says so, click "Enable workflow" (the clock
cannot start a disabled workflow either).

## Exports

The dashboard's **Download Excel** button builds one workbook with one sheet per participant (plus an "All" sheet),
or a single sheet for the selected participant. **Download CSV** gives the raw rows.

## Later: room sensor data

Export from the Tapo app at 1-minute resolution, resample to 5 minutes, and load into `sensor_readings`
(participant, ts, temperature_c, humidity_pct). The dashboard can then join readings to check-ins by participant and time.
