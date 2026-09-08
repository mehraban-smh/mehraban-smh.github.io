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
3. **Authentication → Providers → Email**: keep Email enabled, and turn **off** "Allow new users to sign up" so nobody else can create a dashboard login. Turn off "Confirm email" too, or the researcher user will need to confirm.
4. **Authentication → Users → Add user**: create the research team login (email + password). This is what the dashboard sign-in uses.
5. **Project Settings → API**: copy the **Project URL** and the **anon public** key into `config.js`, commit, and push. The anon key is meant to be public; the policies from step 2 limit it to inserting check-ins for a valid participant code.

Open `https://mehraban.uk/switch/dashboard/`, sign in, and you should see an empty study. Submit a test check-in
from `https://mehraban.uk/switch/checkin/?p=P99` and it should appear after **Refresh**.

## Participant links

Each participant gets `https://mehraban.uk/switch/checkin/?p=CODE` where CODE is `P` followed by two or three digits
(`P01` … `P999`). The code is remembered on the phone. If the app is opened without a code it asks for one.

The study page explains how to add the app to the home screen. On iPhone this is required for notifications later,
and the home-screen copy keeps its own storage, so the app will ask for the code once more inside it.

## Testing

Add `?debug=1` to the check-in URL to see a "What gets stored" panel under the phone with every row, a copy-as-CSV
button, and controls to seed or clear example data. Example rows are marked as such and are never synced.

## Exports

The dashboard's **Download Excel** button builds one workbook with one sheet per participant (plus an "All" sheet),
or a single sheet for the selected participant. **Download CSV** gives the raw rows.

## Later: room sensor data

Export from the Tapo app at 1-minute resolution, resample to 5 minutes, and load into `sensor_readings`
(participant, ts, temperature_c, humidity_pct). The dashboard can then join readings to check-ins by participant and time.
