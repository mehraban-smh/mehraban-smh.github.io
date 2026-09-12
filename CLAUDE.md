# mehraban.uk — personal academic website of Mohammad H. Mehraban

## What this repository is
- A GitHub Pages user site served at https://mehraban.uk (custom domain via the `CNAME` file). Never delete or rename `CNAME`.
- The entire site is ONE file: `index.html` (HTML, CSS and JS inline). Deploys automatically on commit to `main` in about two minutes.
- Other files in the root: `profile.jpg` (social-share image), `graphical-abstract.png` and `retrofit-optimization.png` (full-size figures opened from the project cards), `favicon.png`, `apple-touch-icon.png`. Never rename or delete them.
- The portrait, the two project figures, the world map (inline SVG) and five flag images are EMBEDDED inside `index.html` as base64 data URIs / inline SVG. Do not edit, reflow or "clean up" those long data strings. Edit the markup and CSS around them.

## Design rules (settled with the owner, do not change without being asked)
- Typography: Source Serif 4 for all prose and headings. Inter (sans) ONLY for the nav, buttons, profile pills, section labels and card tags.
- Colour: single navy accent (`--accent: #1F4E79`, `--accent-dark: #163A5B`) on white. No gradients, no colourful bars, no emoji flags (Windows renders them as letters; use the embedded SVG flag images).
- British spelling in site copy: optimisation, personalised, mould, colour.
- Education and research interests are plain dashed lists inside their cards. No chips, pills or inner boxes there.
- Hover language: cards and links lift 2–3px with a soft shadow and text turns navy. Reuse the existing classes (`.uni`, `.edu-link`, `.plink`, `.fig`, `.pub h3 a`) instead of inventing new hover styles.
- Long prose (`.hero p.lede`, `.about-grid p`, `.card p`) is justified with hyphenation on screens wider than 780px only; left-aligned on phones.
- Mobile rule: elements that carry the `.wrap` class (`.hero`, `.nav`) must keep their 24px side padding. Never set the `padding` shorthand on them; use `padding-top` / `padding-bottom`.
- Hero order: name (one line), "PhD Researcher", School of Construction, Property and Surveying, London South Bank University, lede paragraph, "Email: info@mehraban.uk", two buttons, six profile pills.
- Contact email everywhere: info@mehraban.uk.

## Recipes for common changes
- **New publication**: duplicate one `.pub` block in `#publications`, newest year first. Bold the owner as `<b>Mehraban, M.H.</b>`, italic venue, DOI link in `.doi`.
- **New project**: duplicate an `<article class="card reveal">` block in `.proj`. Multi-paragraph descriptions are fine (`.card p + p` handles spacing). A figure goes in `<a class="fig" href="<file>.png">` with the full-size file committed to the repo root, lowercase hyphenated filename; embed a ~1300px-wide JPEG as the displayed `<img>` (data URI) to keep the site single-file.
- **New collaborating institution**: add `<a class="uni" href="<official site>" target="_blank" rel="noopener"><span class="n">Name</span><span class="c">City</span></a>` inside that country's `.uni-grid`. Countries with several boxes get their own heading + grid; countries with one box sit side by side inside `.tri`.
- **New country**: needs (1) an SVG flag image (flag-icons 4x3, base64) in the heading, (2) `id="collab-xx"` on the heading, (3) the country's path in the map wrapped in `<a href="#collab-xx">` with class `country hl`. The map paths were generated from world-atlas `countries-110m` (ISO numeric ids) with an equirectangular projection, viewBox 0 0 1000 403, latitudes cropped to 85N–60S, Antarctica removed, antimeridian-crossing rings split.
- **News/updates section** (not yet built): if requested, place it between `#about` and `#research`, dated entries, newest first, same card styling.

## Workflow and checks
- Edit `index.html` directly and commit to `main`.
- Before finishing: view at desktop width and at ~380px width; nothing may touch the left screen edge; the name must stay on one line; all `.fig` links must point to files that exist in the repo.
- Keep commit messages short and descriptive.

## Interactive "Explore the house" block (top of #research)
- Files in repo root: `house-exterior.jpg`, `room-mould.jpg`, `room-comfort.jpg`, `room-resilience.jpg` (1600×900 JPEGs, loaded lazily). Never rename them.
- Markup lives in `#research` before the "Current projects" heading; all its classes are prefixed `tw-`, `twin-`, `tcard`, `tchip`, `tstat` so they never collide with the site's `.card`, `.chip` or other classes. Keep that prefix rule for any addition.
- All content and geometry is in the `TW_SCENES` object in the last `<script>`: per room a `win` rectangle (percent of the exterior image), the zoom origin `x,y` and scale `s`, and `spots` (marker `x,y` in percent of the room image, icon key, tag, title, description, stat tiles). Edit text and numbers there; do not restyle the block.
- Interaction is image-only by the owner's request: no buttons. Exterior windows glow and are clickable; rooms have sonar markers opening cards; the bottom-left chip links to the matching project card (`#proj-mould`, `#proj-comfort`, `#proj-resilience`, ids on the three project articles).
- No "Next" button in cards and no project link inside cards (removed on request).
