# HomePulse — the SWITCH home comfort study (Swansea University) — web pages

HomePulse is the participant app of the SWITCH personal
thermal comfort study, EPSRC SWITCH to Net Zero Buildings, Swansea University. Version 1.0 (October 2026)
replaced the 0.4.0 "SWITCH comfort check-in". The name is `appName` in `config.js`; the folder and the URLs stay
`switch/`. It is a separate project from Home Comfort NY (`homecomfort-ny/`): its own Supabase project, look,
reminder workflow, secrets and browser storage (`switch_` keys). Never share code, data or keys between them.

Three pages, all unlisted (no links from the main site, `noindex` on every page):

| Page | URL | Who |
|---|---|---|
| Study page | `https://mehraban.uk/switch/` | Participants and partners: the study, "Join the study", "Sign in" |
| Check-in app | `https://mehraban.uk/switch/checkin/` | Participants (one link for everyone) |
| Dashboard | `https://mehraban.uk/switch/dashboard/` | Research team (sign-in) |

GitHub Pages only serves files, so the check-ins need a small database. The pages are written for
[Supabase](https://supabase.com) (Postgres, London region, project `kysovekezjdoxerykkmj`) and talk to it with plain
`fetch`, no library (`switch-api.js`, `window.SWITCH`, used by the app and the dashboard). Until `config.js` is
filled in, both apps run in **local mode**: check-ins stay in the participant's browser, and the dashboard shows only
the browser it is opened in.

## Upgrading the live study from 0.4.0 to HomePulse 1.0 (once)

1. Optional safety copy: on the old dashboard, **Download Excel**.
2. Supabase → **SQL Editor → New query** → paste the whole of `supabase-setup.sql` → **Run** ("Success. No rows
   returned"). It keeps every participant, approval, check-in and phone; running it a second time also succeeds.
3. Check, in the same editor:
   `select code, alias, alias_colour, approved, home is null as no_home from participants order by code;` (every row
   has an alias) and
   `select pg_get_function_identity_arguments(oid) from pg_proc where proname = 'save_push_subscription';` (one row,
   starting `p_key text`).
4. Straight away, push the HomePulse 1.0 pages to `main` (Pages deploys in about two minutes). In between, a phone still
   on 0.4.0 has its check-ins refused: they stay on the phone, and 1.0 sends them once the participant has signed in.
5. Close by hand any old open issue titled "N new participant(s) waiting for approval" (without "HomePulse:").
6. Tell the participants to open the app: "One more step" (their email and a new 4-digit PIN), then "Tell us about
   your home". When the end date is known, set `studyEnd: "YYYY-MM-DD"` in `config.js`.

## One-time setup (a new project; about 15 minutes)

1. Create a Supabase project in the **London (eu-west-2)** region with a strong database password.
2. In the project, open **SQL Editor → New query**, paste the whole of `supabase-setup.sql`, and click **Run**. This
   creates the `participants`, `participant_pins`, `participant_devices`, `comfort_votes` and `push_subscriptions`
   tables, a `sensor_readings` table for later, the joining, sign-in, check-in, points and approval functions, and
   the row-level security policies and table permissions. Run it again whenever the file changes; it is safe to
   re-run on the live project (nothing is deleted).
3. **Authentication → Sign In / Providers → Email**: keep Email enabled and turn **off** "Confirm email". Then under
   **Authentication → Sign In / Up** turn **off** "Allow new users to sign up" (and keep anonymous sign-ins off), so
   nobody else can create a dashboard login: every research login can read and change everything.
4. **Authentication → Users → Add user → Create new user**: the research team login (email + password, tick "Auto
   confirm user").
5. **Settings → API Keys**: copy the **Publishable key** (`sb_publishable_...`) into `supabaseAnonKey` in
   `config.js`, and the **Project URL** from **Settings → Data API** into `supabaseUrl`. Commit and push. The
   publishable key is meant to be public; the functions from step 2 limit it to joining and signing in (email and
   PIN), checking approval and, with a signed-in device's key, sending that participant's check-ins, reading their
   own check-ins, profile, points and the anonymous Bay Race, and registering a phone for reminders. It cannot read
   or write any table directly. A phone's reminder row can be changed only through its own push endpoint, which only
   that phone knows.

## Participants, PINs and devices

Everyone opens the same link, `https://mehraban.uk/switch/checkin/` (the study page links to it with `?start=join`
and `?start=signin`). On an iPhone in Safari the app first asks for the Home Screen copy, because only that copy can
get reminders and it keeps its own storage.

Joining asks for the participant's details and their home (nine short steps, see "The home profile") and a 4-digit
PIN, and calls `register_participant`, which stores the profile in `participants`, assigns the next code (`P01`,
`P02`, ... `P99`, `P100`, ...), gives the participant a random anonymous alias for the Bay Race (Welsh wildlife:
"Puffin", "Red Kite", ...; never derived from the code) and gives the device a key. Only the code travels with the
check-ins; the dashboard joins it back to the name. Every question needs an answer ("Not sure" counts); the draft is
kept on the phone (never the PIN), so "Later" carries on where it stopped.

On another phone or tablet, or in the iPhone home-screen copy, the participant signs in with their email and PIN;
every device then shows the same check-ins, points and badges. Only hashes of the PIN and of the device keys are
stored. Five wrong tries lock signing in for 15 minutes; five more after that, an hour; then 24 hours (only a
successful sign-in resets this). PINs that are easy to guess (four equal digits, 1234, 4321, 0123, 9876, 1212,
2580) are refused whenever a PIN is set. On the dashboard, **Reset PIN** clears a forgotten PIN and **Sign out
devices** stops all of a participant's device keys (a lost phone).

Choosing a first PIN needs the participant code as well as the email, so knowing someone's email is not enough to
take over their account. This applies to participants who joined before HomePulse 1.0 (they had no PIN) and to anyone
whose PIN the team has reset. On the phone they used with 0.4.0, the app sends the code it already holds ("One
more step": email and a new PIN). On a new device it asks for the code: it is shown at the bottom of Today on any
signed-in device, and the team can tell them (after a Reset PIN, tell the participant their code). A wrong code
counts as a wrong try. Then "Tell us about your home" (the same steps, with what is already known filled in).
Nobody can check in before their profile is complete. Settings → My home shows the profile and edits it section by
section.

Signing in never reveals whether an email is registered without a PIN attempt. If you suspect misuse, sign the
participant out on all devices and reset their PIN while you are in touch with them.

### Approval

The link is public, so a registration has to be approved before it counts:

1. A new participant starts as **awaiting approval** (`approved = false`). The database refuses their check-ins and
   reminder sign-up until then, and the app shows a waiting screen that checks every minute.
2. Within the hour the reminders workflow (`switch/push/notify.js`) opens one **issue in this repository** titled
   "HomePulse: 1 new participant waiting for approval" (or "HomePulse: 3 new participants ..."), assigned to you, so GitHub
   emails you. It contains only the codes, the registration times and the dashboard link (the repository is
   public). The issue closes itself once everyone it lists has been approved or removed. Only issues starting
   "HomePulse:" opened by the workflow itself are ever read or closed.
3. Open the **dashboard**: everyone waiting is listed at the top with their name, email and a home summary. Click
   **Approve** to let them in or **Remove** to delete the registration (with their PIN, device keys and phones;
   their check-ins are kept). Anyone you do not recognise, remove.

## The home profile

Stored as one JSON object in `participants.home`, metric. Null for participants who joined before 1.0 until they
fill it in. Only the first half of the postcode is stored: the database refuses anything else.

| Key | Values |
|---|---|
| `postcode_area` | first half of the postcode, upper case (`SA1`, `CF10`): matches check-ins to local weather |
| `home_type` | `detached`, `semi`, `end_terrace`, `mid_terrace`, `bungalow`, `flat` (flat or maisonette) |
| `flat_position` | flats only: `basement`, `ground`, `middle`, `top` |
| `tenure` | `own`, `housing_association`, `council`, `private_rent`, `shared_ownership`, `other` |
| `year_built` | `pre1919`, `1919_1944`, `1945_1964`, `1965_1982`, `1983_2002`, `2003_plus`, `unsure` |
| `floors` | 1–4 (4 means 4 or more) |
| `bedrooms` | 0–6 (6 means 6 or more) |
| `floor_area_m2` | number (the EPC's "Total floor area"), or null when not sure |
| `epc` | `A`–`G` or `unsure` |
| `adults`, `children`, `pets` | counts |
| `bedroom_share` | others sleeping in the participant's bedroom: 0, 1, 2, 3 (3 or more) |
| `main_heating` | `gas_combi` (no hot water tank), `gas_tank`, `oil`, `lpg`, `ashp` (air source heat pump), `gshp`, `storage` (storage heaters), `electric` (radiators or panel heaters), `communal`, `solid`, `none`, `unsure` |
| `other_heaters` | list of `plugin`, `gas_fire`, `electric_fire`, `stove` (wood burner or multi-fuel), `open_fire`, `electric_blanket`, or `none` |
| `heating_pattern` | `always_on` (the thermostat turns it on and off; added 1.1), `timer`, `when_needed`, `most_day`, `rarely`, `not_me` (someone else controls it) |
| `payment` | no longer asked since 1.1; older profiles: `prepay`, `bill`, `in_rent`, `unsure`, `prefer_not` |
| `controls` | list of `room_stat`, `smart`, `programmer`, `trvs`, or `none` / `unsure` |
| `stat_display` | no longer asked since 1.1; older profiles: `yes`, `no`, `no_stat` |
| `setpoint_c` | usual thermostat setting in °C, or null |
| `bedroom_trv` | no longer asked since 1.1; older profiles: `yes`, `no`, `no_radiator`, `unsure` |
| `wall_insulation` | `cavity`, `external`, `internal`, `none`, `unsure` |
| `loft` | `yes`, `no`, `no_loft`, `unsure` |
| `glazing` | `single`, `double`, `triple`, `mixed`, `unsure` |
| `windows_open` | `yes`, `some`, `no` |
| `damp` | damp or mould seen in the last year: list of `bedroom`, `living`, `kitchen`, `bathroom`, `elsewhere`, or `none` / `unsure` |
| `bedroom_facing`, `bedroom_side` | `N` … `NW` or `unsure`: the way the bedroom window faces, and the side of the home the bedroom is on, read from the phone's own compass app |
| `bedroom_facing_deg`, `bedroom_side_deg` | the compass number typed (0–359), when typed |

Gender, year of birth, height (cm), weight (kg) and thermal sensitivity (`cold`, `average`, `warm`) stay in their
own `participants` columns. Height and weight can be typed in ft/in and st/lb; they are stored metric.

## The check-in

A check-in starts with "Are you at home right now?". "Yes, for over an hour" and "Yes, I just got in" go on to the
questions (`at_home` `long` or `recent`); "No, I'm out" pauses reminders for one, three or five hours, until 19:00
(before 19:00 only), or until they are back (12 hours at most).

Every check-in asks the same questions in the same order, all starting unanswered (there is no "still the same"
shortcut since 1.0; `same_as_last` is always false; clothing has a one-tap "Same as last time"):

| Step | Column | Answers |
|---|---|---|
| How do you feel right now? | `tsv` | −3 cold … +3 hot |
| Would you like to be… | `preference` | `cooler`, `same`, `warmer` |
| Are these conditions acceptable to you? | `acceptability` | `acceptable`, `unacceptable` (older rows: the four-point ids) |
| What are you wearing? | `garments`, `clo` | `tshirt`, `long`, `jumper`, `hoodie`, `shorts`, `trousers`, `joggers`, `skirt`, `pyjamas` (0.57), `coat_light` (0.25), `coat_winter` (0.60), `socks`, `slippers`, `blanket`, `duvet`; clo summed (ASHRAE 55 / ISO 7730) |
| What have you been doing for the last 15 minutes? | `activity`, `met` | `sleep`, `lying`, `sit`, `desk`, `stand`, `house`, `walk`, `exercise` |
| Which room are you in? | `room` | `living`, `bedroom`, `kitchen`, `office`, `bathroom`, `other` |
| Can you feel air moving around you? | `air` | `still`, `slight`, `draughty` |
| Is the sun shining on you? | `sun` | `yes`, `no`, `dark` |
| Is your heating on right now? (1.0) | `heating_on` | `on`, `off`, `unsure` |
| Which heating is on? (1.0, only when on and the home has more than one system) | `heating_src` | the home's `main_heating` / `other_heaters` ids, `other` |
| How long has it been on? (1.0, only when on) | `heating_for` | `always` (the thermostat switches it on and off; added 1.1), `30_60`, `1_2h`, `2_4h`, `gt4h`, `unsure` (`lt30` in 1.0 check-ins only) |
| Touch the nearest outside wall… how does it feel? (1.0) | `wall` | `no_reach` (listed first), `cold`, `cool`, `neutral`, `warm` |

The thermostat reading ("What does your thermostat show?", `stat_temp_c`) was asked in 1.0 only; from 1.1 the column stays
empty.
| In the last 30 minutes, did you do any of these? | `actions` | `win_open`, `win_close`, `door_open`, `door_close`, `heat_up`, `heat_down`, `layer_on`, `layer_off`, `blanket`, `fan`, `curtains`, `moved` (opened/closed and up/down exclude each other) |
| In the last 30 minutes, did you have or feel any of these? | `notes` | `hot_drink`, `cold_drink`, `ate`, `hungry`, `tired`, `unwell` |

Fields of steps that were not asked are null. A review page lets any answer be changed; after "Save check-in" a
toast offers Undo for 6 seconds, then the check-in is sent, or waits in the queue when offline. Check-ins reach the
database only through `submit_checkin`, with the device's key: the database files the row under that participant,
answers "duplicate" for a retry it already has, and keeps only the app's own answer values (anything else becomes
empty, numbers are kept in range). A row the database calls invalid stays in the queue for the team to look at.
A new check-in opens 45 minutes after the last one on any device (`checkinGapMin`); reminders never come sooner.
The answers dropped in 0.4.0 stay in the `comfort`, `comfort_score`, `humidity` and `air_pref` columns.

The app has four tabs: **Today** (Check in now, the daily goal of 4 and the weekly goal of 7 goal days, the week,
reminders, points, the Bay Race and the latest badge), **Race**, **My check-ins** (charts and every check-in; tap one
for the details) and **Settings** (reminder hours, "Show me in the Bay Race", My home, account, sign out). The
service worker caches the app's files (network first), so it opens without a connection. When changing JS or CSS,
bump `?v=` in `checkin/index.html` and the cache name in `checkin/sw.js` (and `?v=` in `dashboard/index.html` when
`switch-api.js` or `config.js` change).

## Points, badges and the Bay Race

Points are computed in the database by one function (`sw_points` in `supabase-setup.sql`), which the Bay Race and
the dashboard use; the app (`checkin/game.js`) computes the same for instant feedback. A check-in counts when it is
at least 45 minutes after the participant's previous one, not in the future, and among the first 15 counted that UK
day: 10 points each, 20 more for a day with 4 (a goal day), 50 more for a Monday-to-Sunday week of goal days
(counted in the period that holds its Sunday). A check-in that reached the server more than 48 hours after its own
time (or claims a time in the future) is kept as data but scores nothing, so points cannot be collected by
back-dating. These numbers are also in `config.js` (`checkinGapMin`, `dailyGoal`, `points`): change both together.
Participants waiting for approval see only themselves in the race.

The Bay Race runs from Swansea Marina to Mumbles lighthouse, this week, last week (final standings) or this month;
the lighthouse is the daily
goal every day plus the full-week bonus (470 points a week). Participants appear only as their alias; "Show me in
the Bay Race" off (`race_hidden`) hides a participant from everyone else (they still see the race and their own
place). Badges (first check-in, daily goal, three in a row, full week, early bird, night owl, 50 and 100 check-ins,
10 different days, 10 wall answers) are private. No prizes are promised; the points are stored so the team can run
a reward scheme later (the dashboard lists them by code).

Every Monday the week's race and goals start again from zero. So that a new week never looks like lost data, the
points chip on Today shows all-time points (with the week's place only once the week has points), and while the new
week is still empty the race and Today say "A new race started on Monday" with the participant's finish last week.

## Testing

Add `?debug=1` to the check-in URL to see a "What gets stored" panel with every row, a copy-as-CSV button, and
controls to seed or clear example data. Example rows are never synced. `?p=` in the URL no longer gets anyone in:
check-ins and reminder sign-ups need a signed-in device of an approved participant, so for an end-to-end test join
normally and approve yourself on the dashboard. Without a database configured (local mode, participant P00) nothing
needs approving. The local test bench (`Documents/switch-dev/mock/server.js`, not in this repository) fakes the whole
database, including `/__seedswitch?n=12` for a realistic study.

## Reminders (push notifications) and approval emails

Every hour, on the hour, the Supabase database starts a GitHub Actions workflow (`.github/workflows/push-reminders.yml`;
see "The reminder clock" below), which runs two scripts in `switch/push/`:

- `send.js` reads the registered phones from `push_subscriptions` and sends a web push to each one that is due. A
  phone is sent to when the study has not ended (`studyEnd` in `config.js`, when set, is the last day, UK time), its
  participant is still registered and approved, reminders are on and not paused, at least 45 minutes
  (`checkinGapMin`) have passed since the participant's last check-in on **any** of their devices (each check-in
  moves `last_vote_at` on all their phones), it has not had a reminder yet in this clock hour (nor in the last 45
  minutes), and the phone's local time is inside the participant's home hours (weekdays 17:00–22:30 and weekends
  09:00–22:30 unless they change it in the app, with an optional **second window** for weekdays and for weekends,
  stored in `weekday2_start/end` and `weekend2_start/end`). The gap is 45 minutes rather than an hour because the
  clock runs on the hour: with a 60-minute gap, anyone who checked in a few minutes after a reminder would always
  miss the next one. Every window must end after it starts (for "until midnight" the app asks for 23:59). A run in
  the first few minutes of the hour is judged at the top of the hour. Local time is read in the phone's own time
  zone (`tz`, reported every time the app opens), else `timeZone` from `config.js` (`Europe/London`). The push
  expires after 25 minutes, so an offline phone never receives a backlog. The notification reads "HomePulse: how does
  your home feel?" (the name comes from `appName`).
- `notify.js` opens one "HomePulse: ..." issue listing every newly registered participant who is still waiting for
  approval, at most 25 per run, records in `participants.notified_at` that you have been told once the issue
  exists, and closes the issues whose participants have all been approved or removed.

The app never writes `push_subscriptions` directly. Turning reminders on calls `save_push_subscription` with the
device's key, so only a signed-in, approved participant can register a phone, and only under their own code (at most
ten phones each); everything after that ("No, I'm out", new home hours, turning reminders off, the time zone, and the
notification's "Not home" button) calls `update_push_schedule` with the phone's push address (its "endpoint", which
only that phone knows), and changes only that phone's row. Only endpoints at the browser push services are accepted
(`push_endpoint_ok()` in `supabase-setup.sql` and `PUSH_SERVICE` in `send.js`). When the app opens it checks that
the reminder service still knows the phone and subscribes again by itself if the subscription expired; if the phone
will not allow that, Today says reminders have stopped.

On Android the notification has "I'm home" and "Not home" buttons; "Not home" pauses reminders for two hours
without opening the app. On iPhone the notification opens the app, which asks "Are you at home?" first.

One-time setup, after the database setup above:

1. In the GitHub repository open **Settings → Secrets and variables → Actions** and add two repository secrets:
   - `SUPABASE_SERVICE_ROLE_KEY`: a **secret key** from Settings → API Keys → Secret keys (`sb_secret_...`). It
     bypasses row-level security, so it must only ever live in this secret, never in the site.
   - `VAPID_PRIVATE_KEY`: the whole content of `Documents\switch-vapid-private-key.txt` on the machine where the
     pages were built (one 43-character line). The matching public key is already in `config.js`.
   The approval issues need no extra secret: the workflow's own `GITHUB_TOKEN` has `issues: write`.
2. Test it: **Actions → Comfort check-in reminders → Run workflow**, type a participant code that has turned
   reminders on, and the phone should buzz within a minute. Tick "dry run" to only see the decisions in the log.
   On your own machine, `SELFTEST=1 node send.js` (Git Bash) or `$env:SELFTEST=1; node send.js` (PowerShell) in
   `switch/push` checks the decision rules (home hours, the second window, pauses, time zones and the clocks
   changing, one reminder per hour, the 45-minute gap, approval, and the end of the study) with no secrets and no
   network.
3. Start the reminder clock (next section).

Participants turn reminders on from the "Turn on notifications" card on Today (or when they first tap "Check in
now"). On iPhone this only works inside the home-screen copy of the app, and the app says so. Since 1.1, phones and
tablets cannot check in until notifications are on (the study relies on reminders at different times of day): there
is no "Check in without them" there, a blocked permission gets the steps to allow it, and a phone that cannot get
web push is told to update or to check in from a computer. Laptops and desktops can still check in without them.

### The reminder clock

GitHub's own schedule is best effort (in September 2026 the hourly schedule ran only five or six times a day), so
the workflow keeps it only as a backup (at 7 and 37 minutes past the hour) and the Supabase database starts it at
the top of every hour instead: `supabase-reminder-clock.sql` sets up a `pg_cron` job that calls GitHub's "workflow
dispatch" API through `pg_net`. The sender reminds a phone at most once per clock hour, so the clock and the backup
never double up. Once, about five minutes:

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
repository after 60 days without any commit; if the Actions page says so, click "Enable workflow". The workflow
file name `push-reminders.yml` must not change: the clock calls it by name.

## Research dashboard (`/switch/dashboard/`)

Sign in with a research login (Supabase Auth, email and password). The sign-in lasts while the tab is open and
renews itself; if it cannot, the page says so and keeps what is on screen. The key button changes your password.

- **Overview**: tiles for check-ins, active participants, check-ins per person per day against the daily goal of 4,
  the share opened from a reminder, and this week's points. Choose 7 days, 30 days, Study period (when `studyStart`
  is set) or All time (from the first real check-in). Days and hours are the UK time of the check-in's timestamp.
  Check-ins with impossible dates (a phone clock far off) are left out of the charts but kept in the table and
  downloads. Once `studyEnd` has passed, the windows stop at the last day of the study.
- **Waiting for approval**: new sign-ups with their home summary, Approve or Remove.
- **Charts** (each with a Table view): thermal sensation, check-ins per day, a weekday × hour map, preference and
  acceptability, the outside wall by touch, heating on/off and which heating, the thermostat reading against how
  people feel, clothing over time, rooms and activity, and actions and notes.
- **Points and the Bay Race**: this week, this month or all time, with codes, names, aliases, counted check-ins,
  goal days, full weeks, points and rank (participants only ever see aliases).
- **Home profiles**: a tally of every home question.
- **A participant**: profile, PIN and devices, reminders, Bay Race setting, points, the home profile, their charts
  and every check-in, with **Reset PIN**, **Sign out devices** and **Remove** (deletes the profile, PIN, devices and
  reminder phones; check-ins already submitted stay under the code).

**Downloads** contain every check-in for the selection and every stored column: `participant, local_time, ts,
prompt, at_home, tsv, preference, clo, garments, met, activity, room, acceptability, air, sun, actions, notes,
same_as_last, seconds, app_version, client_id` (the 0.4 order), then `tz_offset_min, heating_on, heating_src,
heating_for, stat_temp_c, wall, id, created_at`, then the legacy `comfort, comfort_score, humidity, air_pref`. `ts`
is the phone's clock; `created_at` is when the server received the check-in (a large gap means it waited offline).
Lists are joined with `|`, and stored ids are kept (the Labels sheet translates them).

- **CSV**: check-ins only (no names or emails), UTF-8 with BOM; text Excel would treat as a formula starts with an
  apostrophe.
- **Excel**: *Participants* (profile, alias, race setting, `updated_at`, `notified_at`, PIN and devices, phones,
  points, and every home answer as its own column), *All*, *Points*, one sheet per participant, and *Labels*.
  Numbers are real numbers. SheetJS 0.18.5 is loaded from cdnjs with an integrity hash; if it cannot load, use
  Download CSV.

## Later: room sensor data

Export from the Tapo app at 1-minute resolution, resample to 5 minutes, and load into `sensor_readings`
(participant, ts, temperature_c, humidity_pct). The dashboard can then join readings to check-ins by participant and
time. Live readings from a smart thermostat or a Zigbee hub cannot reach a phone web app directly (no browser on
iPhone can talk to those devices); that would need the hub's own cloud service and a server-side import.
