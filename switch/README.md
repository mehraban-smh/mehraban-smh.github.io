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
5. **Settings → API Keys**: copy the **Publishable key** (`sb_publishable_...`) into `supabaseAnonKey` in `config.js`, and the **Project URL** from **Settings → Data API** into `supabaseUrl`. Commit and push. The publishable key is meant to be public; the policies from step 2 limit it to registering, and inserting check-ins for an approved participant code. (Older projects show legacy `anon` and `service_role` keys instead; those work too.)

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

Every check-in asks the **same twelve questions in the same order** (on a repeat check-in, answering "Yes, still the same" copies the five core answers from the last check-in and asks the remaining seven; the stored row is still the full twelve, marked `same_as_last`): thermal sensation, preference, clothing,
activity, room, acceptability, overall comfort, what has changed since last time, air movement (and what they would
like), humidity, sunlight, and anything else worth noting. There are no alternating sets: two check-ins from the same
participant, or from two participants, always hold the same fields, so the rows in `comfort_votes` compare directly.

**My check-ins** on the start screen lists everything submitted from that phone, with three small charts at the top.
Tapping a row opens a pop-up summary of that check-in; the list itself is the only part of the app that scrolls.

## Testing

Add `?debug=1` to the check-in URL to see a "What gets stored" panel under the phone with every row, a copy-as-CSV
button, and controls to seed or clear example data. Example rows are marked as such and are never synced.

`?p=P99` in the URL still forces a code without a profile, but the database only accepts check-ins and reminder
sign-ups from a registered, approved code, so for an end-to-end test register normally and approve yourself on
the dashboard. Without a database configured (local mode) nothing needs approving.

## Reminders (push notifications) and approval emails

Every hour, on the hour, a GitHub Actions workflow (`.github/workflows/push-reminders.yml`) runs two scripts in
`switch/push/`:

- `send.js` reads the registered phones from the `push_subscriptions` table and sends a web push to each one that
  is due. At the top of every hour a phone is sent to when reminders are on and not paused (the participant has not
  said they are out), at least an hour has passed since they said they had just got in, at least 30 minutes have
  passed since their last check-in, and the phone's local time is inside the participant's home hours (weekdays
  17:00–22:30 and weekends 09:00–22:30 unless they change it in the app). Anyone who wants a more customised
  schedule can add a **second window** for weekdays and for weekends on the reminder-hours screen (say 06:00–09:00
  as well as 17:00–22:30); a reminder is then due inside either window. The second window is stored in
  `weekday2_start/end` and `weekend2_start/end` in `push_subscriptions`, empty when unused, and the sender ignores
  it unless both times are set and the start is before the end. The interval is `reminderIntervalMin`
  in `config.js` (60), the same number the app shows; GitHub's hourly schedule is not punctual (consecutive runs
  can be 48 to 70 minutes apart), so the sender only refuses to remind the same phone again within half an
  interval (30 minutes), which stops a late run followed by an early one from sending two in a row without ever
  skipping an hour. The push expires after 25 minutes, so an offline phone never receives a backlog.
- `notify.js` opens one issue listing every newly registered participant who is still waiting for approval (see
  "Approval" above), at most 25 per run, and records in `participants.notified_at` that you have been told, only
  once the issue exists.

On Android the notification has "I'm home" and "Not home" buttons; "Not home" pauses reminders for two hours
without opening the app. On iPhone the notification opens the app, which asks "Are you at home?" first.

One-time setup, after the database setup above:

1. Run `supabase-setup.sql` again in the Supabase SQL editor. It also creates `push_subscriptions`, the
   approval columns and functions, and the columns for the optional second reminder window.
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
   `SELFTEST=1 node send.js` (Git Bash, macOS, Linux) or `$env:SELFTEST=1; node send.js` (PowerShell) in `switch/push` checks the decision rules (home hours, the second window, pauses)
   against known cases with no secrets and no network.

Participants turn reminders on from the "Turn on reminders" card on the app's start screen. On iPhone this only
works inside the home-screen copy of the app, and the app says so.

## Exports

The dashboard's **Download Excel** button builds one workbook with one sheet per participant (plus an "All" sheet),
or a single sheet for the selected participant. **Download CSV** gives the raw rows.

## Later: room sensor data

Export from the Tapo app at 1-minute resolution, resample to 5 minutes, and load into `sensor_readings`
(participant, ts, temperature_c, humidity_pct). The dashboard can then join readings to check-ins by participant and time.
