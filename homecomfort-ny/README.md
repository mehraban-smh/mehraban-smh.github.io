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

The study page (`index.html`) states: two months, one or two small room sensors (temperature and
humidity) lent to each participant and returned at the end, and two contacts, info@mehraban.uk and
smirzabeigi@esf.edu (also `TEAM` in `checkin/app.js`). By the owner's choice it names no study title,
investigator, funder, IRB protocol or payment, and describes the data collected in general terms. The one
value still to confirm is `ENROLLMENT_TARGET` (60) in `dashboard/dashboard.js`, the recruitment target.

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
their email). Joining asks a short personal profile and a picture-based home profile (below), then calls
`register_participant`, which assigns the next code: `NY001`, `NY002`, ... Only the code travels with the
check-ins; the dashboard joins it back to the name.

A new participant waits for approval: within the hour `homecomfort-ny/push/notify.js` opens one issue in this
repository titled "Home Comfort NY: 1 new participant waiting for approval" (codes and times only), assigned
to the owner, so GitHub emails you. Approve or remove them on the dashboard, then close the issue.

The email is the participant's only credential ("Sign in" returns the code for an email on the list), as in
SWITCH; the codes are pseudonymous and nobody can read anyone's data through the app.

## The home profile

Stored as one JSON object in `participants.home`, always in metric units, whatever the participant chose
to see (`participants.units` is `us` or `metric`). Keys (any may be missing if skipped):

| Key | Values |
|---|---|
| `zip` | the home's 5-digit US ZIP code (optional; for matching check-ins to local weather) |
| `home_type` | `detached`, `townhouse`, `duplex`, `apartment`, `mobile`, `dorm`, `other` |
| `tenure` | `own`, `rent`, `other` |
| `year_built` | `pre1940`, `1940_1969`, `1970_1989`, `1990_2009`, `2010_plus`, `unsure` |
| `floors` | floors in the home, 1–4 (4 means 4 or more) |
| `unit_floor` | for apartments and dorms: the floor the home is on, US numbering (1 = ground floor, 0 = basement) |
| `floor_area_m2` | number, or null when not sure (the app converts from sq ft) |
| `bedrooms`, `rooms` | counts (bedrooms 0–6, 6 meaning 6 or more; rooms 1–12) |
| `adults`, `children`, `pets` | counts |
| `heating` | list of `furnace`, `heat_pump`, `mini_split`, `boiler`, `baseboard`, `stove`, `other`, `none` |
| `cooling` | list of `central_ac`, `window_ac`, `mini_split`, `portable_ac`, `fans`, `none` |
| `thermostat` | `manual`, `programmable`, `smart`, `landlord`, `none` |
| `setpoint_winter_c`, `setpoint_summer_c` | usual thermostat setting in °C, or null |
| `windows` | `single`, `double`, `triple`, `unsure` |
| `windows_open` | `yes`, `some`, `no` (can the windows be opened) |
| `facing` | `N`, `NE`, `E`, `SE`, `S`, `SW`, `W`, `NW`, `unsure` (main living-room windows) |
| `draftiness` | 1 (never drafty) – 5 (very drafty) in winter |

## The check-in

A check-in starts with "Are you at home right now?": "Yes, for over an hour" and "Yes, I just got in" both go
on to the questions (`at_home` `long` or `recent`); "No, I'm out" offers a pause of one, three or five hours
(each showing when it ends), until 7 pm (before 7 pm only), or until they are back (12 hours at most).

Every check-in asks the same **eight questions** in the same order: how they feel (the seven-point thermal
sensation vote, `tsv`, cold −3 … hot +3), clothing, activity, room, air movement, sunlight, what has changed
since last time, and anything worth noting (hot or cold drink, just ate, hungry, tired, unwell). From the
second check-in on, a quick check comes first: the last answers with an Edit button each; "Yes, still the
same" saves them at once (what changed and notes saved empty, `same_as_last`).

## Reminders

Hourly web-push reminders inside each participant's home hours, in the phone's own time zone (New York time
when the phone has not reported one), never within 45 minutes of the last reminder or 30 minutes of a check-in,
and not while they have said they are out. Same rules and code as the SWITCH sender, in `homecomfort-ny/push/`.
`SELFTEST=1 node send.js` in `homecomfort-ny/push` checks the rules offline.

## Testing

`?debug=1` on the check-in URL shows what gets stored, with a copy-as-CSV button and example data.
In local mode (no Supabase values in `config.js`) nothing needs approving and nothing leaves the browser.
