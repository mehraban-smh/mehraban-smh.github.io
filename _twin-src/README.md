# Digital-twin house generator

Source for the animated "Explore the house" block in `#research` of `index.html`. The underscore at the start of the
folder name keeps it off the published site (GitHub Pages runs Jekyll, which skips `_` folders).

## Rebuild

Run from the repository root (Python 3, no packages needed):

    python3 _twin-src/build.py            # regenerate the house inside ./index.html
    python3 _twin-src/build.py --check    # exit 0 if index.html already matches a fresh build
    python3 _twin-src/build.py --out preview.html   # write somewhere else instead

`build.py` first strips the previously generated house from the current `index.html` (`gen/splice.py: strip`), then
splices a fresh one in (`splice.build`). Everything else on the page is left alone, including the spot texts in
`TW_SCENES`; only geometry numbers there are rewritten.

## Where things are

| file | what it holds |
| --- | --- |
| `gen/iso.py` | isometric projection, canvas size `CW, CH = 1600, 1175` |
| `gen/scene.py` | the house: walls, fittings, furniture, floor colours per zone (`FLOOR_COL`), the family's 60 s routine (`family`) and its path checker (`python3 gen/scene.py`) |
| `gen/people.py` | man, woman, child: poses and the actor/keyframe director |
| `gen/furn.py` | furniture and equipment drawings |
| `gen/ext_dt.py` | the exterior: house scale and position (`I`), zones and zoom (`ZONES`, `TARGET`), zone colours (`ZCOL`), callout anchors desktop/phone (`CALLOUT`), cloud, AI engine, data lines, LIVE TWIN panel |
| `gen/zones_dt.py` | the three room close-ups, their markers, HUD panels and the outage banner |
| `gen/dt.css` | all styles and keyframes for the block (phone rules at the end) |
| `gen/splice.py` | strip / build of index.html; callout read-outs (`CALLOUT_VALS`), titles, hint text, room labels |
| `tools/*.js` | Playwright checks used during development (they load Playwright from `/opt/node22/lib/node_modules/playwright`): `checks.js`, `handoff.js` (zoom hand-off blend), `cards.js` (open every marker card), `phone-shots.js`, `deskshot.js`, `inspect.js` |

## Rules that keep it working

- The room close-ups are drawn where the exterior zoom ends; the zoom origin and scale come from `ZONES` and `TARGET`. Change geometry in the generator, not by hand in `index.html`.
- Everything is deterministic (seeded randomness), so a rebuild with unchanged sources gives an identical file.
- After a change: rebuild, then check desktop (1280) and phone (360/390/430) views, the zoom hand-off (`tools/handoff.js`), all 12 marker cards (`tools/cards.js`) and `--check`.
