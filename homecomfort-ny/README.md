# Home Comfort NY (SUNY ESF) — web pages

A personal thermal comfort study with SUNY ESF, built as its own project: its own pages, its own Supabase
database, its own reminder workflow and its own secrets. It shares no data, code at run time, keys or logins
with the SWITCH study in `switch/`.

Three pages, all unlisted (no links from the main site, `noindex` on every page):

| Page | URL | Who |
|---|---|---|
| Study page | `https://mehraban.uk/homecomfort-ny/` | Participants: what the study is, "Sign in" and "Join the study" |
| Check-in app | `https://mehraban.uk/homecomfort-ny/checkin/` | Participants (one link for everyone) |
| Dashboard | `https://mehraban.uk/homecomfort-ny/dashboard/` | Research team (sign-in) |

Until `config.js` holds the study's Supabase project, the app and the dashboard run in **local mode**:
check-ins stay in the participant's browser, and the dashboard shows only the browser it is opened in.

## Study details on the pages

The study page (`index.html`) states: one month, 20 October to 20 November 2026 (`studyStart` and
`studyEnd` in `config.js`; the reminder sender stops once `studyEnd` is over in New York), one or two
small room sensors (temperature and humidity) lent to each participant and returned at the end, and the
participants' main contact, Alireza Khodayarkhani (akhodaya@syr.edu, also `TEAM` in `checkin/app.js`),
with Shayan Mirzabeigi and Mohammad H. Mehraban listed as the research team. It links SARBEL
(https://sarbel.org/) under the SUNY ESF line and no longer links the research dashboard (researchers use
https://mehraban.uk/homecomfort-ny/dashboard/ directly). By the owner's choice it names no study title,
investigator, funder, IRB protocol or payment, and describes the data collected in general terms. The one
value still to confirm is `ENROLLMENT_TARGET` (60) in `dashboard/dashboard.js`, the recruitment target.

**Research team logins.** Supabase (Home Comfort NY) → Authentication → Users → Add user → Create new user,
with "Auto confirm user" ticked and a temporary password sent to the person privately. They sign in on the
dashboard and change it with the key button next to "Sign out". Every login sees all participants.

## One-time setup (about 20 minutes)

1. **Supabase project.** Create a new project at supabase.com (a new project, not the SWITCH one). Region:
   **East US (North Virginia)**. Pick a strong database password (you will not need it again).
2. **Database.** SQL Editor → New query → paste the whole of `homecomfort-ny/supabase-setup.sql` → Run.
   Safe to re-run whenever the file changes.
3. **Research login.** Authentication → Sign In / Providers → Email: keep Email on, turn **off** "Confirm
   email". Authentication → Sign In / Up: turn **off** "Allow new users to sign up". Authentication → Users →
   Add user → Create new user: the research team login (tick "Auto confirm user").
4. **Keys into the site.** Settings → API Keys: copy the **Publishable key** (`sb_publishable_...`) into
   `supabaseAnonKey` in `homecomfort-ny/config.js`, and the **Project URL** (Settings → Data API) into
   `supabaseUrl`. Commit and push. The publishable key is meant to be public.
5. **Reminder secrets.** GitHub repository → Settings → Secrets and variables → Actions → New repository
   secret, twice:
   - `NY_SUPABASE_SECRET_KEY`: Settings → API Keys → Secret keys → "Create new secret key" (`sb_secret_...`)
     in the **Home Comfort NY** project. It bypasses row-level security: it lives only in this secret.
   - `NY_VAPID_PRIVATE_KEY`: the content of `Documents\homecomfort-ny-vapid-private-key.txt` on the
     machine where the pages were built (one 43-character line). Its public half is already in `config.js`.
6. **The hourly clock.** As for SWITCH, but in the Home Comfort NY project and with its own token:
   - GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new
     token. Name "Home Comfort NY clock", repository access **Only select repositories →
     mehraban-smh.github.io**, repository permissions **Actions → Read and write**, expiry after the study.
   - Supabase (Home Comfort NY) → SQL Editor → run, with the token pasted in, then delete the query:
     `select vault.create_secret('github_pat_...', 'homecomfort_ny_github_token');`
   - Run the whole of `homecomfort-ny/supabase-reminder-clock.sql`, then `select public.homecomfort_start_reminders();`
     and check GitHub → Actions for a new "Home Comfort NY reminders" run.

Until steps 4 and 5 are done, the workflow `.github/workflows/homecomfort-ny-reminders.yml` stops quietly
at its first step on every run.

## Participants, codes and approval

Everyone opens the study page and taps **Join the study** (new) or **Sign in** (registered before, with
their email). Joining asks a short personal profile (name, email, gender, year of birth, height and weight
are required; US units only) and a tap-through home profile (below), then calls
`register_participant`, which assigns the next code: `NY001`, `NY002`, ... Only the code travels with the
check-ins; the dashboard joins it back to the name.

A new participant waits for approval: within the hour `homecomfort-ny/push/notify.js` opens one issue in this
repository titled "Home Comfort NY: 1 new participant waiting for approval" (codes and times only), assigned
to the owner, so GitHub emails you. Approve or remove them on the dashboard, then close the issue.

The email is the participant's only credential ("Sign in" returns the code for an email on the list), as in
SWITCH; the codes are pseudonymous and nobody can read anyone's data through the app.

## The home profile

Stored as one JSON object in `participants.home`, always in metric units. Participants answer in US units
(`participants.units` is `us`; earlier test sign-ups may say `metric`); the dashboard can show either.
Only `home_type` is required; any other key may be missing if skipped. Since version 1.1.0 (14 October
2026) the cooling question, the summer thermostat setting and the draft question are no longer asked (the
study runs in the heating season); older profiles may still hold `cooling`, `setpoint_summer_c` and
`draftiness`, and the older home types `townhouse`, `duplex`, `mobile`, `dorm`, `other`.

| Key | Values |
|---|---|
| `zip` | the home's 5-digit US ZIP code (optional; for matching check-ins to local weather) |
| `home_type` | `detached`, `semi_attached` (shares one wall), `attached` (row house or townhouse), `apartment` |
| `tenure` | `own`, `rent`, `subsidized` (subsidized housing), `other` |
| `year_built` | `pre1940`, `1940_1969`, `1970_1989`, `1990_2009`, `2010_plus`, `unsure` |
| `floors` | floors in the home, 1–4 (4 means 4 or more) |
| `unit_floor` | for apartments: the floor the home is on, US numbering (1 = ground floor, 0 = basement) |
| `floor_area_m2` | number, or null when not sure (the app converts from sq ft) |
| `bedrooms` | count, 0–6 (6 meaning 6 or more) |
| `rooms` | no longer asked since 1.1.1; older profiles: rooms in total, 1–12 |
| `adults`, `children`, `pets` | counts |
| `bedroom_share` | how many others sleep in the participant's bedroom: 0, 1, 2, 3 (3 means 3 or more) |
| `bedroom_thermostat` | `own` (the bedroom has its own), `shared` (one for the whole home), `none`, `unsure` |
| `heating` | list of `furnace`, `heat_pump`, `mini_split`, `boiler`, `baseboard`, `stove`, `other`, `none` |
| `cooling` | no longer asked; older profiles: list of `central_ac`, `window_ac`, `mini_split`, `portable_ac`, `fans`, `none` |
| `thermostat` | `manual`, `programmable`, `smart`, `landlord`, `none` |
| `setpoint_winter_c` | usual thermostat setting in the heating season in °C, or null (`setpoint_summer_c`: older profiles only) |
| `windows` | `single`, `double`, `triple`, `unsure` |
| `windows_open` | `yes`, `some`, `no` (can the windows be opened) |
| `bedroom_facing` | `N`, `NE`, `E`, `SE`, `S`, `SW`, `W`, `NW`, `unsure`: the way the bedroom window faces (the biggest one), read from the phone's compass app with the phone pointing out of the window |
| `bedroom_side` | the same values: the side of the home the bedroom is on, read standing in the middle of the home with the phone pointing toward the bedroom |
| `bedroom_facing_deg`, `bedroom_side_deg` | the number the participant typed from the compass app (0–359, 0 = north, 90 = east), when they typed one; the app picks the direction from it |
| `facing`, `facing_deg` | older profiles only (1.1.0): the main windows of the room used most during the day |
| `draftiness` | no longer asked; older profiles: 1 (never drafty) – 5 (very drafty) in winter |

## The check-in

A check-in starts with "Are you at home right now?": "Yes, for over an hour" and "Yes, I just got in" both go
on to the questions (`at_home` `long` or `recent`); "No, I'm out" offers a pause of one, three or five hours
(each showing when it ends), until 7 pm (before 7 pm only), or until they are back (12 hours at most).

Every check-in asks the same **eight questions** in the same order: how they feel (the seven-point thermal
sensation vote, `tsv`, cold −3 … hot +3), clothing, activity, room, air movement, sunlight, what they changed
in the last 30 minutes (boxes for the window, the door, the heating and clothing/blankets, where opened and
closed or up and down exclude each other, plus blinds and changing rooms; ids `win_open`, `win_close`,
`door_open`, `door_close`, `heat_up`, `heat_down`, `layer_on`, `layer_off`, `blanket`, `curtains`,
`moved`; older check-ins may also hold `ac_up`, `ac_down`, `fan`), and anything worth noting (drinks: hot
or cold; food: just ate, hungry; tired; unwell). From the
second check-in on, a quick check comes first: the last answers with an Edit button each; "Yes, still the
same" saves them at once (what changed and notes saved empty, `same_as_last`).

## Reminders

Hourly web-push reminders inside each participant's home hours, in the phone's own time zone (New York time
when the phone has not reported one), never within 45 minutes of the last reminder or 30 minutes of a check-in,
and not while they have said they are out. Same rules and code as the SWITCH sender, in `homecomfort-ny/push/`.
The default hours are 7 AM–10 PM every day; participants change them in Settings. Notifications are part of
the study: until they are on, Today leads with a "Turn on notifications" card and "Check in now" asks for them
first (one tap: permission, the phone registered with the default hours). No reminders go out once
`studyEnd` (config.js) is over in New York.
`SELFTEST=1 node send.js` in `homecomfort-ny/push` checks the rules offline.

## Testing

`?debug=1` on the check-in URL shows what gets stored, with a copy-as-CSV button and example data.
In local mode (no Supabase values in `config.js`) nothing needs approving and nothing leaves the browser.
