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
2. In the project, open **SQL Editor → New query**, paste the whole of `supabase-setup.sql`, and click **Run**. This creates the `comfort_votes` table, a `sensor_readings` table for later, and the row-level security policies.
3. **Authentication → Sign In / Providers → Email**: keep Email enabled and turn **off** "Confirm email". Then under **Authentication → Sign In / Up** turn **off** "Allow new users to sign up", so nobody else can create a dashboard login.
4. **Authentication → Users → Add user → Create new user**: the research team login (email + password, tick "Auto confirm user"). This is what the dashboard sign-in uses.
5. **Settings → API Keys**: copy the **Publishable key** (`sb_publishable_...`) into `supabaseAnonKey` in `config.js`, and the **Project URL** from **Settings → Data API** into `supabaseUrl`. Commit and push. The publishable key is meant to be public; the policies from step 2 limit it to inserting check-ins for a valid participant code. (Older projects show legacy `anon` and `service_role` keys instead; those work too.)

Open `https://mehraban.uk/switch/dashboard/`, sign in, and you should see an empty study. Submit a test check-in
from `https://mehraban.uk/switch/checkin/?p=P99` and it should appear after **Refresh**.

## Participants and codes

Everyone opens the same link, `https://mehraban.uk/switch/checkin/`. The first time, the app asks for a profile
(name, email, gender, year of birth, height, weight, thermal sensitivity) and calls the database function
`register_participant`, which stores the profile in the `participants` table and assigns the next code
(`P01`, `P02`, ...). Only the code travels with the check-ins; the dashboard joins it back to the name.

The code is remembered on the phone. On a new phone, or inside the home-screen copy of the app on iPhone (which
keeps its own storage), the participant chooses "I have registered before" and enters their email to continue.

For testing, `?p=P99` in the URL still forces a code without a profile.

## Testing

Add `?debug=1` to the check-in URL to see a "What gets stored" panel under the phone with every row, a copy-as-CSV
button, and controls to seed or clear example data. Example rows are marked as such and are never synced.

## Reminders (push notifications)

Every half hour a GitHub Actions workflow (`.github/workflows/push-reminders.yml`) runs `switch/push/send.js`,
which reads the registered phones from the `push_subscriptions` table and sends a web push to each one that is due.
A phone is due when reminders are on, the participant has not said they are out, at least an hour has passed
since they said they had just got home, no check-in was submitted in the last twenty minutes, and the phone's
local time is inside the participant's home hours (weekdays 17:00–22:30 and weekends 09:00–22:30 unless they
change it in the app). The push expires after 25 minutes, so an offline phone never receives a backlog.

On Android the notification has "I'm home" and "Not home" buttons; "Not home" pauses reminders for two hours
without opening the app. On iPhone the notification opens the app, which asks "Are you at home?" first.

One-time setup, after the database setup above:

1. Run `supabase-setup.sql` again in the Supabase SQL editor. It now also creates `push_subscriptions`.
2. In the GitHub repository open **Settings -> Secrets and variables -> Actions** and add two repository secrets:
   - `SUPABASE_SERVICE_ROLE_KEY`: a **secret key** from Settings -> API Keys -> Secret keys -> "Create new secret key"
     (`sb_secret_...`, shown once). It bypasses row-level security, so it must only ever live in this secret, never
     in the site. A legacy `service_role` key works too.
   - `VAPID_PRIVATE_KEY`: the whole content of `Documents\switch-vapid-private-key.txt` on the machine where the
     pages were built (one 43-character line). The matching public key is already in `config.js`.
   The project URL is not a secret; the sender reads it from `config.js`.
3. Test it: **Actions → Comfort check-in reminders → Run workflow**, type a participant code that has turned
   reminders on, and the phone should buzz within a minute. Tick "dry run" to only see the decisions in the log.

Participants turn reminders on from the "Turn on reminders" card on the app's start screen. On iPhone this only
works inside the home-screen copy of the app, and the app says so.

## Exports

The dashboard's **Download Excel** button builds one workbook with one sheet per participant (plus an "All" sheet),
or a single sheet for the selected participant. **Download CSV** gives the raw rows.

## Later: room sensor data

Export from the Tapo app at 1-minute resolution, resample to 5 minutes, and load into `sensor_readings`
(participant, ts, temperature_c, humidity_pct). The dashboard can then join readings to check-ins by participant and time.
