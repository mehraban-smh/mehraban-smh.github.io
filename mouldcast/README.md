# MouldCast — the damp and mould forecast app (first draft)

MouldCast is the occupant- and provider-facing application of the PhD "Artificial Intelligence-Integrated Digital
Twins Framework for Early Detection of Damp and Mould in UK Social Housing" (London South Bank University; RES3
Objective 5, Section 4.7 of the RES3 report, Section 5.9.4 of the review paper). It shows each monitored surface's
VTT mould index, its 7-day forecast and what drives it, gives residents tips and the landlord its repairs, answers
questions from the twin's data, and collects the weekly photos that validate and recalibrate the model.

Version 0.1.0 (October 2026) is a **first draft with demo data**: there is no backend yet, and everything runs in the
browser. The name is `appName` in `config.js`; the folder and the URLs stay `mouldcast/`. The look is HomePulse's
(`switch/`): its stylesheet sections and icon library were copied in, not linked, so the projects stay independent.

Three pages, all unlisted (no links from the main site, `noindex` on every page):

| Page | URL | Who |
|---|---|---|
| Project page | `https://mehraban.uk/mouldcast/` | Supervisors, partners: what it is, links to the two demos |
| Resident app | `https://mehraban.uk/mouldcast/app/` | Residents (phone-first, installable) |
| Housing team view | `https://mehraban.uk/mouldcast/staff/` | Landlord's repairs and asset teams (desktop-first) |

## Files

| File | What it does |
|---|---|
| `config.js` | `self.MC_CONFIG`: name, tagline, version, `mode` (`demo`), `apiUrl` (empty until there is a backend) |
| `twin.js` | `window.TWIN`, the demo digital twin shared by both apps (below) |
| `index.html`, `favicon.png` | the project page |
| `app/index.html`, `app/app.js`, `app/app.css`, `app/icons.js` | the resident app |
| `app/manifest.webmanifest`, `app/sw.js`, `app/icon-*.png`, `app/apple-touch-icon.png` | installing it and opening it offline |
| `staff/index.html`, `staff/staff.js`, `staff/staff.css` | the housing team view |

When changing JS or CSS, bump `?v=` in `app/index.html` (and `staff/index.html`) and `CACHE` in `app/sw.js`.

## The demo twin (`twin.js`)

- **Homes.** Eight two-bedroom 1960s flats with solid brick walls (`PORTFOLIO`), each with five rooms and six
  monitored surfaces chosen as a thermal imaging survey would (`SURFACES`): construction, material, VTT sensitivity
  class, how cold the surface runs (temperature factor `f`), furniture against it, a thermal bridge, a surface sensor
  or "estimated" (RES3 Gap 4). Homes differ in household, heating, ventilation, drying washing indoors and a broken
  bathroom fan. `H03` is the resident app's home.
- **Record.** Eight weeks of hourly data and the coming week, anchored to the current hour: UK winter weather (with
  a cold, damp spell over the coming days) drives a simple heat and moisture balance of each room (heating schedule,
  the household's moisture from sleeping, cooking, showers and drying, ventilation, air moving between rooms). Each
  surface's temperature comes from the room and outside through `f`; its humidity from the room's vapour pressure.
- **VTT mould index.** Integrated hour by hour from surface temperature and humidity: critical humidity, growth with
  `k1`, `k2` and the maximum index, decline when dry, and the four material classes of Ojanen et al. (2011), exactly
  as RES3 Appendix D and Table C1.
- **Forecast and range.** The coming week from the current state, plus four ensemble runs (weather, moisture and
  air-to-surface error) for the range and the chance of crossing index 3.
- **What drives it.** The week re-run with one driver changed at a time (heating, moisture habits, ventilation,
  furniture, the thermal bridge, the bathroom fan, the weather): the change in the index at day 7 and in the hours a
  day the surface is above its mould limit. This stands in for the SHAP attributions of the live model.
- **Observations.** Six weeks of seeded weekly photo checks (and a few microscope samples) per home, with real
  surfaces made to grow slightly faster than the laboratory model on sensitive materials and slower on plaster, so
  the validation views show the kind of disagreement recalibration (Objective 4) is for. H03's photos agree.
- **Awaab's Law.** Working days (weekends and England and Wales bank holidays skipped): investigate within 10
  working days, act within 24 hours in an emergency.

The demo home's bedroom corner is anchored at index 2.97 now (`demoNow`), so the early warning ("visible mould
likely in about 3 days") always shows.

## The resident app

Four tabs: **Home** (the warning, the highest index next week, the next 7 days, the rooms, the photo check,
conditions now), **Ask** (questions answered from the twin's data with their sources; a stand-in for the LLM layer,
restricted to the same data), **Photos** (this week's photo check of every surface, reports to the landlord, earlier
photos against the forecast at the time) and **More** (the home from its building model, how it works, privacy,
alerts, the demo). A room shows its surfaces and a week of temperature and humidity; a surface shows the index dial,
the 4-week record and 7-day forecast with its range, the hours a day it is damp enough for mould, what drives it,
tips at home, the landlord's part with the Awaab's Law note, and its last photo.

Tips never shift responsibility for a defect onto the household: building causes are always listed for the landlord.

Browser storage (this browser only; the housing team view reads the first two):

| Key | Contents |
|---|---|
| `mc_photos` | `[{ id, home, surface, ts, obs: none/spots/patch/large, signs[], note, img }]` (photos downscaled to 720 px JPEG) |
| `mc_reports` | `[{ id, home, ts, type: mould/damp/leak/condensation/smell/other, room, surface, emergency, note, img, status }]` |
| `mc_trying` | tips the resident said they will try, `'<surface>:<driver>'` |
| `mc_alerts`, `mc_seen` | the alert switches, the welcome screen passed |
| `mc_chat` (session) | the Ask conversation of this visit |

"Start the demo again" in More deletes them. `?open=<surface id>` (for example `?open=bed1-corner`) or
`?open=<tab>` opens a screen directly.

## Going live (next steps)

1. **Stage 1, before the first winter** (RES3 4.7): only the photo check and reports, sent to a database (the
   HomePulse pattern: Supabase, row-level security, participant codes and device keys, approval).
2. **The Digital Twin platform's API** replaces `twin.js` behind the same shape: per home the rooms and surfaces
   (from the BIM), the hourly record, the forecast with its range, the drivers (SHAP) and the observations.
3. **The physics-informed model** on the platform produces the forecasts; the app shows them unchanged.
4. **The LLM layer** answers in Ask through a server-side function that retrieves the home's records first and is
   limited to them (no API key in the page).
5. **Notifications** (web push, as in HomePulse) for warnings and the weekly photo reminder.
6. Evaluation (Objective 5): the fixed set of diagnostic questions for the LLM, interviews and the System
   Usability Scale with residents and housing staff.
