"""Splice the generated digital-twin house into index.html, and take it out again.

strip(html) removes everything this generator added (CSS block, the four SVG drawings, the JS additions, the hint and
title tweaks) and puts back the original photo markup, so build(strip(html)) can be run on the CURRENT index.html:
edits made anywhere else on the page, and the spot texts in TW_SCENES, are kept. Only geometry numbers in TW_SCENES
are rewritten by build()."""
import os, re
import ext_dt, zones_dt

HERE = os.path.dirname(os.path.abspath(__file__))
SVG = '<svg class="{cls}" {idattr}viewBox="0 0 %d %d" preserveAspectRatio="xMidYMid slice" role="img" aria-label="{label}">{body}</svg>' % (ext_dt.CW, ext_dt.CH)

# the original markup that the drawings replace
EXT_IMG = '<img class="twin-ext" id="twExt" src="house-exterior.jpg" alt="Exterior of a contemporary two-storey UK net-zero home" loading="lazy">'
EXT_LABEL = 'Animated isometric digital twin of a single-storey home where a family goes about its day, with three research zones, live data streams and a heat-map scan'
ROOMS = {
    'mould': ('<img src="room-mould.jpg" alt="Bedroom with condensation on the window and mould in the corner" loading="lazy">', zones_dt.mould,
              'Isometric bedroom twin with condensation on the window, mould spreading from a cold corner, a parent wiping the glass and a live mould forecast'),
    'comfort': ('<img src="room-comfort.jpg" alt="Living room with a person reading on the sofa by large glazing" loading="lazy">', zones_dt.comfort,
                'Isometric living-room twin where the family reads, talks and plays, with a thermostat holding per-occupant setpoints, solar gain through the glazing and a heat-pump fan-coil heater'),
    'resilience': ('<img src="room-resilience.jpg" alt="Bedroom in harsh summer sunlight during a power outage" loading="lazy">', zones_dt.resilience,
                   'Isometric bedroom twin in a heatwave power outage: the air conditioner and fan stop and the room heats up while a child rests, then power returns'),
}
TITLES = ('Mould and Dampness', 'Thermal Comfort', 'Thermal Resilience')
HINT_OLD, HINT_NEW = 'Click a glowing window to step inside', 'Click a coloured zone to step inside'
# live read-outs shown under each callout title (cross-fading)
CALLOUT_VALS = {'mould': [('Mould risk', 'HIGH ↑'), ('Surface RH', '82 %')], 'comfort': [('Setpoint', '21.0 °C'), ('PMV', '−0.2 neutral')],
                'resilience': [('Survivability', '+72 %'), ('Indoor', '31.6 °C')]}

CSS_ANCHOR = '  @media (max-width:640px){\n    .tw-winlabel'          # the site's own phone rules for the block; ours go just before
CSS_START = '  /* digital-twin art (inline SVG'                          # first line of dt.css
JS_Z_OLD = "    b.className = 'tw-win'; b.type = 'button';\n"
JS_Z_NEW = "    b.className = 'tw-win'; b.type = 'button'; b.dataset.z = name;\n"
JS_LABEL_OLD = "    b.innerHTML = '<span class=\"tw-winlabel\">' + sc.title + '</span>';\n"
JS_LABEL_NEW = ("    const vals = sc.vals.map(v => '<i>' + v[0] + '<b>' + v[1] + '</b></i>').join('');\n"
                "    b.innerHTML = '<span class=\"tw-winlabel tw-co\"><span class=\"tw-co-h\"><span>' + sc.title.replace(/ (\\S+) Research$/, '<span class=\"tw-ph\"></span> $1<br>Research') + '</span></span><span class=\"tw-co-v\">' + vals + '</span></span>';\n"
                "    placeCallout(b, sc);\n")
JS_LOOP = "  Object.keys(TW_SCENES).forEach(name => {\n"
JS_PHONE = ("  const phone = window.matchMedia('(max-width:640px)');\n"
            "  function placeCallout(b, sc){\n"
            "    const w = sc.win, L = phone.matches ? sc.labPhone : sc.lab, c = b.firstChild;\n"
            "    c.className = 'tw-winlabel tw-co tw-co-a' + L.a;\n"
            "    c.style.left = ((L.x - w.l) / w.w * 100) + '%'; c.style.top = ((L.y - w.t) / w.h * 100) + '%';\n"
            "  }\n"
            "  phone.addEventListener('change', () => stage.querySelectorAll('.tw-win').forEach(b => placeCallout(b, TW_SCENES[b.dataset.z])));\n")
JS_STATE = "  let state = 'ext', busy = false, active = null;\n"
JS_OBSERVER = ("  // motion graphics: assemble the twin the first time it scrolls into view; pause the animation while off screen\n"
               "  if ('IntersectionObserver' in window){\n"
               "    if (!reduce) stage.classList.add('tw-pre');\n"
               "    new IntersectionObserver(es => es.forEach(e => {\n"
               "      stage.classList.toggle('tw-paused', !e.isIntersecting);\n"
               "      if (e.intersectionRatio > .3 && stage.classList.contains('tw-pre') && !stage.classList.contains('tw-go')){\n"
               "        setTimeout(() => stage.classList.add('tw-go'), 250);\n"
               "        setTimeout(() => stage.classList.remove('tw-pre', 'tw-go'), 4300);\n"
               "      }\n"
               "    }), {threshold: [0, .35]}).observe(stage);\n"
               "  }\n")
OBSERVER_END = "    }), {threshold: [0, .35]}).observe(stage);\n  }\n"

def _once(h, old, new):
    assert h.count(old) == 1, ('expected exactly one match', old[:90], h.count(old))
    return h.replace(old, new)

def _svg_span(h, start):
    """end index (exclusive) of the <svg> element that starts at h[start], counting nested <svg> elements"""
    depth, i = 0, start
    for m in re.compile(r'<svg\b|</svg>').finditer(h, start):
        depth += 1 if m.group(0) == '<svg' else -1
        if depth == 0:
            return m.end()
    raise ValueError('unclosed <svg>')

def strip(h):
    """remove the generated house from a built index.html (no-op on parts that are already original)"""
    i = h.find('<svg class="twin-ext tw-art" id="twExt"')
    if i >= 0:
        h = h[:i] + EXT_IMG + h[_svg_span(h, i):]
    for name, (img, _, _) in ROOMS.items():
        tag = f'<div class="tw-room" data-scene="{name}">'
        i = h.index(tag) + len(tag)
        if h.startswith('<svg', i):
            h = h[:i] + img + h[_svg_span(h, i):]
    h = re.sub(r'(<div class="tchip tchip-hint">)[^<]*(</div>)', lambda m: m.group(1) + HINT_OLD + m.group(2), h)
    for t in TITLES:
        h = h.replace(f"title:'{t} Research',", f"title:'{t}',")
    i = h.find(CSS_START)
    if i >= 0:
        h = h[:i] + h[h.index(CSS_ANCHOR, i):]
    h = h.replace(JS_Z_NEW, JS_Z_OLD)
    i = h.find("    const vals = sc.vals.map(")
    if i >= 0:
        j = h.index("    placeCallout(b, sc);\n", i) + len("    placeCallout(b, sc);\n")
        h = h[:i] + JS_LABEL_OLD + h[j:]
    i = h.find("  const phone = window.matchMedia('(max-width:640px)');\n")
    if i >= 0:
        h = h[:i] + h[h.index(JS_LOOP, i):]
    i = h.find("  // motion graphics: assemble the twin")
    if i >= 0:
        h = h[:i] + h[h.index(OBSERVER_END, i) + len(OBSERVER_END):]
    return h

def build(h):
    """splice the generated house into an original (photo) index.html; returns (html, marker positions)"""
    ext_svg, ext_css = ext_dt.build()
    people_css = [ext_css]
    h = _once(h, EXT_IMG, SVG.format(cls='twin-ext tw-art', idattr='id="twExt" ', label=EXT_LABEL, body=ext_svg))
    markers = {}
    for name, (img, fn, label) in ROOMS.items():
        svg, markers[name], pc = fn()
        people_css.append(pc)
        h = _once(h, img, SVG.format(cls='tw-art', idattr='', label=label, body=svg))
    # TW_SCENES geometry: zone hit areas, zoom origins, callout anchors and read-outs, marker positions (texts untouched)
    for name, z in ext_dt.ZONES.items():
        l, t, w, hh = z['win']
        zx, zy = z['origin']
        lx, ly, la = z['lab']
        px, py, pa = z['labPhone']
        vals = ','.join(f"['{k}','{v}']" for k, v in CALLOUT_VALS[name])
        pat = re.compile(name + r": \{ (title:'[^']*', link:'[^']*', )win:\{l:[\d.]+,t:[\d.]+,w:[\d.]+,h:[\d.]+\}, x:-?[\d.]+, y:-?[\d.]+, s:[\d.]+,"
                         r"(?: lab:\{[^}]*\},)?(?: labPhone:\{[^}]*\},)?(?: vals:\[.*?\]\],)?")
        assert len(pat.findall(h)) == 1, name
        h = pat.sub(lambda m: f"{name}: {{ {m.group(1)}win:{{l:{l},t:{t},w:{w},h:{hh}}}, x:{zx}, y:{zy}, s:{z['s']}, "
                              f"lab:{{x:{lx},y:{ly},a:'{la}'}}, labPhone:{{x:{px},y:{py},a:'{pa}'}}, vals:[{vals}],", h)
        start = h.index(name + ': { title:')
        end = h.index('\n      ]}', start)
        it = iter(markers[name])
        block, n = re.subn(r"\{x:[\d.]+,y:[\d.]+,ico:", lambda m: '{x:%s,y:%s,ico:' % next(it), h[start:end])
        assert n == 4, (name, n)
        h = h[:start] + block + h[end:]
    h = _once(h, HINT_OLD, HINT_NEW)
    for t in TITLES:
        h = _once(h, f"title:'{t}',", f"title:'{t} Research',")
    css = open(os.path.join(HERE, 'dt.css'), encoding='utf-8').read()
    css += '  /* occupants: generated routines (position, facing, pose, room) */\n' + '\n'.join('  ' + l for l in '\n'.join(people_css).split('\n') if l.strip()) + '\n'
    h = _once(h, CSS_ANCHOR, css + CSS_ANCHOR)
    h = _once(h, JS_Z_OLD, JS_Z_NEW)
    h = _once(h, JS_LABEL_OLD, JS_LABEL_NEW)
    h = _once(h, JS_LOOP, JS_PHONE + JS_LOOP)
    h = _once(h, JS_STATE, JS_STATE + JS_OBSERVER)
    return h, markers
