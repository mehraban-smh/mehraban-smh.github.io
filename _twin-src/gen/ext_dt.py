"""Version B exterior: an isometric single-storey home as a live digital twin, with a family going about its day.
Plan (metres): kitchen x0-9 y0-5 (not clickable), mould bedroom x0-5 y5-10, living room x5-14 y5-10,
resilience bedroom x9-14 y0-5. Back walls x=0 and y=0; glass front walls x=14 and y=10."""
import random
from iso import *
from furn import *
from people import Actor
import scene as SC

I = Iso(73, 674, 260)        # the house spans almost the full 1600 width
WALL, WALLX, CAP = '#E9B994', '#DCA47F', '#F6E4D0'
CY, CYL = '#3FD8F0', '#9BF1FF'

ZPLAN = {'mould': (0, 5, 5, 10), 'comfort': (5, 5, 14, 10), 'resilience': (9, 0, 14, 5)}
ZONES = {'mould': dict(c=(2.5, 7.5), beam=2.6, s=1.753, room='m'), 'comfort': dict(c=(9.5, 7.5), beam=2.3, s=1.274, room='l'),
         'resilience': dict(c=(11.5, 2.5), beam=2.6, s=1.753, room='r')}
TARGET = (690, 590)          # where each room's box is centred in its close-up (HUD panels sit to its right)
ZCOL = {'mould': '#5AA9FF', 'comfort': '#3DDC97', 'resilience': '#FF8A45'}   # one colour per research zone: leader and callout (its floor is a softer tint, scene.FLOOR_COL)
# research titles sit OUTSIDE the house as callouts in the empty corners, joined to their zone by a leader line.
# node = where the leader leaves the zone (plan metres), lab = callout anchor in SVG units and how the callout hangs off it:
# 'br' its bottom-right corner sits on the anchor, 'bl' its bottom-left corner, 'tr' its top-right corner
# ph = the same idea on phones, where each title is bigger relative to the picture (three short lines, no read-out)
CALLOUT = {'mould': dict(node=(-.08, 8.2, 2.4), lab=(322, 290, 'br'), ph=(378, 258, 'br')),          # right above the bedroom's back wall, under the cloud's caption
           'comfort': dict(node=(7.56, 9.88, .03), lab=(600, 985, 'tr'), ph=(638, 985, 'tr')),        # under the living room's front, clear of the LIVE TWIN panel
           'resilience': dict(node=(11.2, -.08, 2.4), lab=(1245, 400, 'bl'), ph=(1240, 400, 'bl'))}   # right above the air conditioner
PX, PY = CW / 100, CH / 100
for _n, _z in ZONES.items():
    x0, y0, x1, y1 = ZPLAN[_n]
    cx, cy = _z['c']
    Xc, Yc = I.p(cx, cy)
    w = (I.p(x1, y0)[0] - I.p(x0, y1)[0]) * .5
    top = I.p(cx, cy, _z['beam'])[1] + 4
    bot = Yc + (I.p(x1, y1)[1] - I.p(x0, y0)[1]) * .3
    _z['win'] = (round((Xc - w / 2) / PX, 2), round(top / PY, 2), round(w / PX, 2), round((bot - top) / PY, 2))
    # room box on screen, then the zoom origin O that maps it onto TARGET at scale s: O = (T - s*B) / (1 - s)
    xs = [I.p(u, v, z)[0] for u in (x0, x1) for v in (y0, y1) for z in (0, 2.4)]
    ys = [I.p(u, v, z)[1] for u in (x0, x1) for v in (y0, y1) for z in (0, 2.4)]
    bx_, by_ = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    s = _z['s']
    Ox, Oy = (TARGET[0] - s * bx_) / (1 - s), (TARGET[1] - s * by_) / (1 - s)
    _z['origin'] = (round(Ox / PX, 3), round(Oy / PY, 3))
    _z['iso'] = (I.S * s, Ox + s * (I.ox - Ox), Oy + s * (I.oy - Oy))
    lx, ly, la = CALLOUT[_n]['lab']
    _z['lab'] = (round(lx / PX, 2), round(ly / PY, 2), la)
    lx, ly, la = CALLOUT[_n]['ph']
    _z['labPhone'] = (round(lx / PX, 2), round(ly / PY, 2), la)
    # click target: the zone's floor plus its walls up to their tops (the same outline that stays bright on hover), percent of the picture
    _z['hit'] = None   # filled in below, once zone_outline() is defined

room_of = SC.room_of

def pts(*q):
    return ' '.join(f'{a:g},{b:g}' for a, b in (I.p(*v) for v in q))

def defs():
    heat = ''.join(f'<radialGradient id="tw-h{n}"><stop offset="0" stop-color="{c}" stop-opacity=".9"/><stop offset="1" stop-color="{c}" stop-opacity="0"/></radialGradient>'
                   for n, c in [('b', '#2F6FE0'), ('c', '#2EC5D9'), ('g', '#38C77A'), ('y', '#F3D34A'), ('o', '#F59A3C'), ('r', '#EF4B3C')])
    return f'''<defs>
<radialGradient id="tw-dbg" cx=".5" cy=".52" r=".62"><stop offset="0" stop-color="#16365E"/><stop offset=".5" stop-color="#0C1E38"/><stop offset="1" stop-color="#050D19"/></radialGradient>
<radialGradient id="tw-dlamp"><stop offset="0" stop-color="#FFE7B8" stop-opacity=".85"/><stop offset=".45" stop-color="#FFC98A" stop-opacity=".32"/><stop offset="1" stop-color="#FFC98A" stop-opacity="0"/></radialGradient>
<radialGradient id="tw-dcyan"><stop offset="0" stop-color="#3FD8F0" stop-opacity=".55"/><stop offset="1" stop-color="#3FD8F0" stop-opacity="0"/></radialGradient>
<radialGradient id="tw-dwarm"><stop offset="0" stop-color="#FFB46A" stop-opacity=".28"/><stop offset="1" stop-color="#FFB46A" stop-opacity="0"/></radialGradient>
<linearGradient id="tw-dleg" x1="0" x2="1"><stop offset="0" stop-color="#2F6FE0"/><stop offset=".3" stop-color="#2EC5D9"/><stop offset=".5" stop-color="#38C77A"/><stop offset=".72" stop-color="#F3D34A"/><stop offset="1" stop-color="#EF4B3C"/></linearGradient>
<linearGradient id="tw-dbeam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#3FD8F0" stop-opacity=".0"/><stop offset=".3" stop-color="#3FD8F0" stop-opacity=".55"/><stop offset="1" stop-color="#9BF1FF" stop-opacity=".9"/></linearGradient>
{heat}
<pattern id="tw-dgrid" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M1 0H0V1" fill="none" stroke="#21507A" stroke-width=".03"/></pattern>
<pattern id="tw-dtile" width=".6" height=".6" patternUnits="userSpaceOnUse"><path d="M.6 0H0V.6" fill="none" stroke="#AEBAC5" stroke-width=".02"/></pattern>
<pattern id="tw-dplank" width="2" height=".3" patternUnits="userSpaceOnUse"><path d="M0 .3H2M1.2 0V.3" fill="none" stroke="#5E9C7E" stroke-width=".02"/></pattern>
<pattern id="tw-dslab" width=".9" height=".9" patternUnits="userSpaceOnUse"><rect width=".9" height=".9" fill="#2A3E55"/><path d="M.9 0H0V.9" fill="none" stroke="#1A2B3E" stroke-width=".04"/></pattern>
<clipPath id="tw-dzm"><rect x="0" y="5" width="5" height="5"/></clipPath>
<clipPath id="tw-dzl"><rect x="5" y="5" width="9" height="5"/></clipPath>
<clipPath id="tw-dzr"><rect x="9" y="0" width="5" height="5"/></clipPath>
<clipPath id="tw-dwm"><rect x="8.7" y=".9" width="1.0" height="1.0"/></clipPath>
<clipPath id="tw-dwr"><rect x="13.05" y=".9" width=".85" height="1.0"/></clipPath>
<clipPath id="tw-dwall"><rect x="0" y="0" width="10" height="2.4"/></clipPath>
<clipPath id="tw-dgx"><polygon points="{pts((14, 0, .25), (14, 10, .25), (14, 10, 2.4), (14, 0, 2.4))}"/></clipPath>
<clipPath id="tw-dgy"><polygon points="{pts((0, 10, .25), (14, 10, .25), (14, 10, 2.4), (0, 10, 2.4))}"/></clipPath>
</defs>'''

def circuits(seed=21, n=30):
    rnd = random.Random(seed)
    out, pulses = [], []
    for k in range(n):
        x, y = rnd.choice([(rnd.uniform(0, CW), rnd.choice([0, CH])), (rnd.choice([0, CW]), rnd.uniform(0, CH)), (rnd.uniform(0, CW), rnd.uniform(0, CH))])
        d = f'M{x:.0f} {y:.0f}'
        for _ in range(rnd.randint(2, 4)):
            L = rnd.uniform(60, 220); a = rnd.choice([(1, 0), (-1, 0), (0, 1), (0, -1), (.7071, .7071), (-.7071, .7071), (.7071, -.7071), (-.7071, -.7071)])
            x += a[0] * L; y += a[1] * L; d += f'L{x:.0f} {y:.0f}'
        out.append(f'<path d="{d}" fill="none" stroke="#14355A" stroke-width="1.6"/>' + circ(round(x), round(y), 3, '#1E4A75'))
        if k % 3 == 0:
            pulses.append(f'<path class="tw-pulse" style="--d:{rnd.uniform(4, 8):.1f}s;--dl:-{rnd.uniform(0, 6):.1f}s" d="{d}" fill="none" stroke="{CY}" stroke-width="2.2" stroke-dasharray="26 700" stroke-linecap="round" opacity=".8"/>')
    stars = ''.join(circ(round(rnd.uniform(0, CW)), round(rnd.uniform(0, CH)), round(rnd.uniform(.6, 1.4), 1), '#BFEFFF', f'class="tw-twk" style="--d:{rnd.uniform(2, 5):.1f}s;--dl:-{rnd.uniform(0, 4):.1f}s" opacity=".5"') for _ in range(50))
    return '<g opacity=".85">' + ''.join(out) + ''.join(pulses) + '</g>' + stars

def label(x, y, eyebrow, title, status, anchor='middle'):
    return (f'<text x="{x}" y="{y}" font-size="11.5" font-weight="700" letter-spacing="2.6" fill="#7FE3F5" text-anchor="{anchor}">{eyebrow}</text>'
            f'<text x="{x}" y="{y + 21}" font-size="17" font-weight="600" fill="#F2FCFF" text-anchor="{anchor}">{title}</text>'
            f'<text x="{x}" y="{y + 40}" font-size="12" font-weight="500" fill="#8FDDEB" text-anchor="{anchor}"><tspan fill="#38C77A">●</tspan> {status}</text>')

def ai_node(cx, cy):
    """an isometric AI chip with a neural network pulsing on its surface"""
    C2 = Iso(19, cx, cy - 66)
    slab = (C2.poly([(0, 0, -.35), (5, 0, -.35), (5, 5, -.35), (0, 5, -.35)], '#0B1D33')
            + C2.poly([(5, 0, 0), (5, 5, 0), (5, 5, -.35), (5, 0, -.35)], '#0E2A47') + C2.poly([(0, 5, 0), (5, 5, 0), (5, 5, -.35), (0, 5, -.35)], '#123456')
            + C2.poly([(0, 0, 0), (5, 0, 0), (5, 5, 0), (0, 5, 0)], '#0F2C4C', f'stroke="{CY}" stroke-width="1.6"'))
    pins = ''.join(f'<line x1="{C2.p(5, t, -.15)[0]}" y1="{C2.p(5, t, -.15)[1]}" x2="{C2.p(5.5, t, -.15)[0]}" y2="{C2.p(5.5, t, -.15)[1]}" stroke="{CY}" stroke-width="2" opacity=".7"/>'
                   f'<line x1="{C2.p(t, 5, -.15)[0]}" y1="{C2.p(t, 5, -.15)[1]}" x2="{C2.p(t, 5.5, -.15)[0]}" y2="{C2.p(t, 5.5, -.15)[1]}" stroke="{CY}" stroke-width="2" opacity=".7"/>' for t in (.8, 1.7, 2.6, 3.5, 4.4))
    layers = [[(1, 1.2), (1, 2.5), (1, 3.8)], [(2.5, .9), (2.5, 2.0), (2.5, 3.0), (2.5, 4.1)], [(4, 1.8), (4, 3.2)]]
    net = ''
    for a, b in zip(layers, layers[1:]):
        for p in a:
            for q in b:
                net += f'<line x1="{C2.p(*p)[0]}" y1="{C2.p(*p)[1]}" x2="{C2.p(*q)[0]}" y2="{C2.p(*q)[1]}" stroke="{CY}" stroke-opacity=".45" stroke-width="1.2"/>'
    nodes = ''.join(f'<circle class="tw-twk" style="--d:{1.2 + (i % 4) * .4:.1f}s;--dl:-{i * .3:.1f}s" cx="{C2.p(*p)[0]}" cy="{C2.p(*p)[1]}" r="4.2" fill="#E4FDFF"/>' for i, p in enumerate(sum(layers, [])))
    glow = f'<ellipse cx="{cx}" cy="{cy - 18}" rx="110" ry="56" fill="url(#tw-dcyan)" class="tw-glowp"/>'
    return f'<g class="tw-hover">{glow}{slab}{pins}{net}{nodes}</g><g class="tw-nlab">' + label(cx, cy + 62, 'AI ENGINE', 'Physics-informed ML', 'forecasting') + '</g>'

def cloud_node(cx, cy, k=1.0, side=False):
    shape = f'M{cx - 104} {cy + 26}a36 36 0 0 1 6-71a54 54 0 0 1 98-22a44 44 0 0 1 80 16a34 34 0 0 1 22 77Z'
    mini = Iso(9, cx - 2, cy - 44)
    house = (mini.outline([(0, 0, 0), (8, 0, 0), (8, 5, 0), (0, 5, 0)], cls='', w=1.4, color=CYL)
             + mini.outline([(0, 0, 0), (0, 0, 2), (8, 0, 2), (8, 0, 0)], cls='', w=1.4, color=CYL) + mini.outline([(0, 0, 0), (0, 5, 0), (0, 5, 2), (0, 0, 2)], cls='', w=1.4, color=CYL)
             + mini.outline([(4, 0, 0), (4, 5, 0)], cls='', w=1, color=CY) + mini.outline([(0, 2.5, 0), (8, 2.5, 0)], cls='', w=1, color=CY))
    orbit = (f'<g transform="translate({cx},{cy - 14}) scale(1,.32)"><circle r="150" fill="none" stroke="{CY}" stroke-opacity=".35" stroke-width="3" stroke-dasharray="6 10"/>'
             f'<g class="tw-spin" style="--d:9s">' + circ(150, 0, 9, CYL) + '</g></g>')
    glow = f'<ellipse cx="{cx}" cy="{cy - 10}" rx="160" ry="80" fill="url(#tw-dcyan)" class="tw-glowp" style="--dl:-2s"/>'
    art = (f'<g class="tw-hover" style="--dl:-3s">{glow}<path d="{shape}" fill="#0C2442" fill-opacity=".85" stroke="{CY}" stroke-width="2.2"/>'
           f'<g class="tw-mini">{house}</g>{orbit}</g>')
    if k != 1:
        art = f'<g transform="translate({cx} {cy}) scale({k}) translate({-cx} {-cy})">{art}</g>'
    lab = label(cx + 132 * k, cy + 2, 'CLOUD', 'Digital twin model', 'synced', 'start') if side else label(cx, cy + 50, 'CLOUD', 'Digital twin model', 'synced')
    return f'<g class="tw-cloudn">{art}</g><g class="tw-nlab">{lab}</g>'

def stream(d, dl=0, w=3.0, op=.4):
    return (f'<path d="{d}" fill="none" stroke="{CY}" stroke-opacity=".12" stroke-width="8" stroke-linecap="round"/>'
            f'<path d="{d}" fill="none" stroke="{CY}" stroke-opacity="{op}" stroke-width="1.6"/>'
            f'<path class="tw-flowp" style="--dl:{dl}s" d="{d}" fill="none" stroke="#E4FDFF" stroke-width="{w}" stroke-dasharray="2 22" stroke-linecap="round"/>')

def sensor(x, y, z, dl=0):
    X, Y = I.p(x, y, z)
    return (f'<g transform="translate({X},{Y})"><circle class="tw-ping" style="--dl:{dl}s" r="7" fill="none" stroke="{CYL}" stroke-width="2"/>'
            + circ(0, 0, 9, CY, 'opacity=".25"') + circ(0, 0, 4.5, '#E4FDFF') + '</g>')

def pool(x, y, r):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="url(#tw-dlamp)"/>'

BEACON = {'mould': (3.6, 8.8), 'comfort': (9.9, 9.0), 'resilience': (10.95, 3.3)}   # open floor in each zone: the rug, by the glass, the rug

def beacon(name):
    """ripples on the zone's open floor in its colour, saying "this room opens"; the three take turns (CSS attract cycle)"""
    col = ZCOL[name]
    X, Y, rx, ry = I.floor_ell(*BEACON[name], .95)
    rings = ''.join(f'<ellipse class="tw-bcnr" style="--dl:{-k * 1.3:.1f}s" cx="{X}" cy="{Y}" rx="{rx}" ry="{ry}" fill="none" stroke="{col}" stroke-width="2.2" vector-effect="non-scaling-stroke"/>' for k in range(2))
    core = ell(X, Y, round(rx * .3, 1), round(ry * .3, 1), col, 'opacity=".45"') + ell(X, Y, round(rx * .12, 1), round(ry * .12, 1), '#FFFFFF')
    return f'<g class="tw-bld tw-fade" style="--bd:3.1s"><g class="tw-bcn tw-bcn-{name}">{rings}{core}</g></g>'

def zone_hl(name):
    """hover highlight of a whole zone, part 1: a tint of its colour on its floor (under the furniture)"""
    x0, y0, x1, y1 = ZPLAN[name]
    q = [(x0, y0, .02), (x1, y0, .02), (x1, y1, .02), (x0, y1, .02)]
    return f'<g class="tw-zhl tw-zhl-{name}">' + I.poly(q, ZCOL[name], 'opacity=".34"') + '</g>'

def hull(pts):
    """convex hull of 2D points (monotone chain), counter-clockwise"""
    pts = sorted(set(pts))
    cross = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, hi = [], []
    for p in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0:
            lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(hi) >= 2 and cross(hi[-2], hi[-1], p) <= 0:
            hi.pop()
        hi.append(p)
    return lo[:-1] + hi[:-1]

def zone_outline(name):
    """screen outline of a zone: its floor and its walls up to their tops (partitions 1.3 m, exterior walls 2.4 m), as a convex hull"""
    x0, y0, x1, y1 = ZPLAN[name]
    q = [(u, v, 0) for u in (x0, x1) for v in (y0, y1)] + [(u, v, 1.3) for u in (x0, x1) for v in (y0, y1)]
    q += [(0, v, 2.4) for v in (y0, y1) if x0 == 0] + [(u, 0, 2.4) for u in (x0, x1) if y0 == 0]   # exterior walls rise to 2.4 m
    return hull([I.p(*v) for v in q])

for _n, _z in ZONES.items():   # click outline: the zone outline, stretched to take in the end of its leader line
    _z['hit'] = [(round(X / PX, 1), round(Y / PY, 1)) for X, Y in hull(zone_outline(_n) + [I.p(*CALLOUT[_n]['node'])])]

def zone_dim(name):
    """hover highlight, part 2: the rest of the picture dims a little; the zone (floor, its walls up to their tops) stays bright.
    No outline is drawn. It sits under the data lines, leaders and panels, which stay bright."""
    h = zone_outline(name)
    d = f'M0 0H{CW}V{CH}H0Z M' + ' L'.join(f'{a:g} {b:g}' for a, b in h) + 'Z'
    return f'<path class="tw-zdim tw-zdim-{name}" d="{d}" fill="#030A14" fill-opacity=".5" fill-rule="evenodd"/>'

def build():
    rnd = random.Random(3)
    people, people_css = SC.people_layers(I, 'ext')
    s = [defs()]
    s.append(rect(0, 0, CW, CH, '#050D19') + rect(0, 0, CW, CH, 'url(#tw-dbg)') + circuits(21, 36))
    s.append('<g class="tw-bld tw-fade" style="--bd:.15s">' + cloud_node(166, 82, .8, side=True) + ai_node(1150, 79) + '</g>')   # cloud a little high: its caption clears the mould callout
    # no garden: a slim plinth hugging the house, and a pad for the heat pump outside the living room
    P0, P1, Q0, Q1 = -.3, 14.3, -.3, 10.3
    plat = (I.poly([(P1, Q0, -.12), (P1, Q1, -.12), (P1, Q1, -.32), (P1, Q0, -.32)], '#081629') + I.poly([(P0, Q1, -.12), (P1, Q1, -.12), (P1, Q1, -.32), (P0, Q1, -.32)], '#0A1C33')
            + I.poly([(P0, Q0, -.12), (P1, Q0, -.12), (P1, Q1, -.12), (P0, Q1, -.12)], '#0C2038')
            + I.box(14.3, 5.6, -.32, .95, 1.8, .2, '#1A3150', '#0E2238', '#12294A')
            + f'<ellipse cx="{I.p(7, 5)[0]}" cy="{I.p(7, 5)[1]}" rx="{640 * I.S / 44:.0f}" ry="{330 * I.S / 44:.0f}" fill="url(#tw-dwarm)"/>')
    edge = f'M{pts((P1, Q0, -.12), (P1, Q1, -.12), (P0, Q1, -.12)).replace(" ", " L").replace(",", " ")}'
    plat += f'<path d="{edge}" fill="none" stroke="{CY}" stroke-opacity=".16" stroke-width="9"/><path d="{edge}" fill="none" stroke="{CY}" stroke-width="2"/>'
    s.append(f'<g class="tw-bld tw-fade" style="--bd:.3s">{plat}</g>')
    heat = (f'<g class="tw-heatm" style="--dl:.8s" clip-path="url(#tw-dzm)"><rect x="0" y="5" width="5" height="5" fill="#2F6FE0" opacity=".35"/>'
            '<circle cx="2.8" cy="7.2" r="2.6" fill="url(#tw-hc)"/><circle cx=".6" cy="9.2" r="2.4" fill="url(#tw-hy)"/><circle cx=".2" cy="9.7" r="1.6" fill="url(#tw-hr)"/><circle cx="1.0" cy="5.6" r="1.4" fill="url(#tw-ho)"/></g>'
            f'<g class="tw-heatm" style="--dl:2.4s" clip-path="url(#tw-dzl)"><rect x="5" y="5" width="9" height="5" fill="#38C77A" opacity=".3"/>'
            '<circle cx="9" cy="7.5" r="3" fill="url(#tw-hg)"/><circle cx="13.6" cy="9.6" r="2.6" fill="url(#tw-ho)"/><circle cx="5.6" cy="5.6" r="2" fill="url(#tw-hb)"/><circle cx="6" cy="7.4" r="1.2" fill="url(#tw-hy)"/></g>'
            f'<g class="tw-heatm" style="--dl:2.8s" clip-path="url(#tw-dzr)"><rect x="9" y="0" width="5" height="5" fill="#F59A3C" opacity=".38"/>'
            '<circle cx="13.4" cy=".5" r="2.8" fill="url(#tw-hr)"/><circle cx="11" cy="1.4" r="2" fill="url(#tw-ho)"/><circle cx="10" cy="4.2" r="1.8" fill="url(#tw-hy)"/></g>')
    # floors, light pools, heat maps
    s.append('<g class="tw-bld tw-fade" style="--bd:1.1s">' + I.box(0, 0, -.12, 14, 10, .12, '#C7D1DA', '#0F2440', '#12294A') + SC.floors(I) + '</g>')
    s.append(f'<g class="tw-bld tw-fade" style="--bd:1.6s"><g transform="{I.fm(.01)}">{heat}</g></g>' + ''.join(zone_hl(n) for n in ZONES))
    # back walls with their fittings
    s.append('<g class="tw-bld tw-up" style="--bd:1.25s">' + SC.corner(I) + SC.wall(I, 'x0') + SC.wall(I, 'y0') + '</g>'
             + '<g class="tw-bld tw-fade" style="--bd:1.5s">' + SC.x0_fittings(I, False) + SC.y0_k(I, False) + SC.y0_r(I, False) + '</g>')
    s.append(f'<g class="tw-bld tw-fade" style="--bd:1.6s"><g transform="{I.fm(.02)}"><g class="tw-beam tw-sync"><polygon points="12.5,0.15 13.85,0.15 13.4,3.0 11.8,3.0" fill="#FFB45A" opacity=".26"/></g></g></g>')
    # kitchen: back run, people, island; then each room behind its partition, people after their furniture
    s.append(f'<g class="tw-bld tw-pop" style="--bd:1.7s">{SC.k_back(I)}</g>' + f'<g class="tw-bld tw-fade" style="--bd:3.0s">{people.get("k", "")}</g>'
             + f'<g class="tw-bld tw-pop" style="--bd:1.75s">{SC.k_front(I)}</g>')
    s.append('<g class="tw-bld tw-up" style="--bd:1.45s">' + SC.wall(I, 'x9') + '</g>' + SC.x9_fittings(I, False))
    s.append(f'<g class="tw-bld tw-pop" style="--bd:1.9s">{SC.r_items(I)}</g>' + beacon('resilience') + f'<g class="tw-bld tw-fade" style="--bd:3.0s">{people.get("r", "")}</g>')
    s.append('<g class="tw-bld tw-up" style="--bd:1.5s">' + SC.wall(I, 'y5') + '</g>' + SC.y5_fittings(I, False))
    s.append(f'<g class="tw-bld tw-pop" style="--bd:2.0s">{SC.m_items(I)}</g>' + beacon('mould') + f'<g class="tw-bld tw-fade" style="--bd:3.0s">{people.get("m", "")}</g>')
    s.append('<g class="tw-bld tw-up" style="--bd:1.55s">' + SC.wall(I, 'x5') + '</g>')
    s.append(f'<g class="tw-bld tw-pop" style="--bd:2.1s">{SC.l_items(I)}</g>' + beacon('comfort') + f'<g class="tw-bld tw-fade" style="--bd:3.0s">{people.get("l", "")}</g>')
    # glass front walls with a sweeping reflection, then the garden in front of them
    sweep_x = f'<g clip-path="url(#tw-dgx)"><polygon class="tw-gsheen" points="{pts((14, -1.5, .25), (14, -.6, .25), (14, -1.4, 2.4), (14, -2.3, 2.4))}" fill="#FFFFFF" opacity=".14"/></g>'
    sweep_y = f'<g clip-path="url(#tw-dgy)"><polygon class="tw-gsheen2" points="{pts((-1.5, 10, .25), (-.6, 10, .25), (-1.4, 10, 2.4), (-2.3, 10, 2.4))}" fill="#FFFFFF" opacity=".14"/></g>'
    s.append(f'<g class="tw-bld tw-fade" style="--bd:2.3s">{SC.glass_front(I)}{sweep_x}{sweep_y}</g>')
    s.append(f'<g class="tw-bld tw-pop" style="--bd:1.0s">{SC.outdoor_unit(I)}</g>' + ''.join(zone_dim(n) for n in ZONES))
    # digital-twin scan plane
    s.append('<g class="tw-bld tw-fade" style="--bd:2.4s"><g class="tw-dscan">' + I.poly([(-1, -1, -.1), (-1, 11, -.1), (-1, 11, 3), (-1, -1, 3)], CY, 'opacity=".08"')
             + f'<path d="M{pts((-1, -1, 3), (-1, 11, 3), (-1, 11, -.1)).replace(" ", " L").replace(",", " ")}" fill="none" stroke="{CYL}" stroke-width="2.4"/></g></g>')
    # data: zone sensors -> gateway -> uplink beam -> AI engine and cloud twin
    hx, hy, hrx, hry = I.floor_ell(3.5, 2.85, .2, .92)
    hubX, hubY = hx, hy - 32 * I.S / 44
    sm, sl, sr = I.p(0, 7.95, 1.44), I.p(11.6, 5.15, 1.0), I.p(9.46, .1, 1.4)
    LY = 60                                   # the straight data line above the roof
    jx = hubX                                 # junction right above the hub
    k = I.S / 44
    # each zone's stream is grouped so it can take the zone colour while that zone is pointed at
    streams = (f'<g class="tw-str tw-str-mould">' + stream(f'M{sm[0]} {sm[1]}C{sm[0] + 30 * k} {sm[1] - 110 * k} {hubX - 90 * k} {hubY - 60 * k} {hubX} {hubY}', 0) + '</g>'
               + f'<g class="tw-str tw-str-comfort">' + stream(f'M{sl[0]} {sl[1]}C{sl[0] - 40 * k} {sl[1] - 150 * k} {hubX + 140 * k} {hubY - 80 * k} {hubX} {hubY}', -.6) + '</g>'
               + f'<g class="tw-str tw-str-resilience">' + stream(f'M{sr[0]} {sr[1]}C{sr[0] - 20 * k} {sr[1] - 120 * k} {hubX + 100 * k} {hubY - 70 * k} {hubX} {hubY}', -1.2) + '</g>'
               + f'<rect x="{hubX - 3}" y="{LY}" width="6" height="{hubY - LY}" fill="url(#tw-dbeam)" opacity=".8"/>' + stream(f'M{hubX} {hubY}V{LY}', -.2, 3.4, .6)
               + stream(f'M{jx} {LY}H252', -.4, 3.2) + stream(f'M{jx} {LY}H1068', -.9, 3.2))
    s.append(f'<g class="tw-bld tw-fade" style="--bd:2.8s">{streams}' + sensor(0, 7.95, 1.44, 0) + sensor(11.6, 5.15, 1.0, -.8) + sensor(9.46, .1, 1.4, -1.6)
             + f'<g transform="translate({jx},{LY})">' + circ(0, 0, 14, CY, 'opacity=".25" class="tw-glowp"') + circ(0, 0, 6, '#E4FDFF') + '</g>'
             + circ(252, LY, 4, CYL) + circ(1068, LY, 4, CYL) + '</g>')
    # zones: the floor colour tells them apart; each one gets a leader in its colour from the zone out to its callout
    pins = ''
    for name in ZONES:
        col = ZCOL[name]
        nx, ny = I.p(*CALLOUT[name]['node'])
        lx, ly, la = CALLOUT[name]['lab']
        py = CALLOUT[name]['ph'][1]
        # the leader runs on under the callout (desktop and phone spot), so it always meets the callout's edge whatever the text size
        d = f'M{nx:.1f} {ny:.1f}V{min(ly, py) - 30}' if la in ('br', 'bl') else f'M{nx:.1f} {ny:.1f}V{max(ly, py) + 30}'
        # line widths in screen pixels (non-scaling), so the leaders stay visible on a phone-sized picture too
        ns = 'vector-effect="non-scaling-stroke"'
        lead = (f'<path d="{d}" fill="none" stroke="{col}" stroke-opacity=".22" stroke-width="5" stroke-linecap="round" {ns}/>'
                + f'<path class="tw-zl" d="{d}" fill="none" stroke="{col}" stroke-width="1.6" {ns}/>'
                + f'<path class="tw-zspark" pathLength="1" d="{d}" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-dasharray=".1 .9" stroke-linecap="round" {ns}/>'
                + f'<circle class="tw-ping" cx="{nx:.1f}" cy="{ny:.1f}" r="8" fill="none" stroke="{col}" stroke-width="2.2"/>'
                + circ(round(nx, 1), round(ny, 1), 10, col, 'opacity=".3"') + circ(round(nx, 1), round(ny, 1), 5, '#FFFFFF'))
        pins += f'<g class="tw-pin tw-pin-{name}"><g class="tw-zlead">{lead}</g></g>'
    s.append(f'<g class="tw-bld tw-fade" style="--bd:2.9s">{pins}</g>')
    # live read-out panel (south-west, under the house)
    ic = {'drop': 'M0 -7s6 6.5 6 10.5a6 6 0 0 1-12 0c0-4 6-10.5 6-10.5z', 'person': 'M0 -8a3.4 3.4 0 1 1 0 6.8a3.4 3.4 0 1 1 0-6.8zM-6 8a6 6 0 0 1 12 0z',
          'sun': 'M0 -4a4 4 0 1 1 0 8a4 4 0 1 1 0-8zM0 -9v2.5M0 6.5V9M-9 0h2.5M6.5 0H9'}
    # one row per research zone, in that zone's colour; wide enough that the longest label never meets its value
    rows = [('drop', 'Surface RH', '91 %', 'M0 22L18 18L36 20L54 12L72 14L90 6L108 8L126 2', ZCOL['mould']),
            ('person', 'Comfort (PMV)', '−0.2', 'M0 12L18 14L36 10L54 12L72 9L90 13L108 11L126 12', ZCOL['comfort']),
            ('sun', 'Indoor temperature', '32.4 °C', 'M0 22L18 20L36 17L54 15L72 10L90 8L108 5L126 3', ZCOL['resilience'])]
    hud = (rect(1376, 250, 252, 232, '#08182C', 'rx="16" fill-opacity=".86" stroke="#3FD8F0" stroke-opacity=".45" stroke-width="1.5"')
           + '<text x="1396" y="281" font-size="13" font-weight="700" letter-spacing="2.4" fill="#7FE3F5">LIVE TWIN</text>'
           + circ(1570, 277, 4.5, '#38C77A', 'class="tw-blink"') + '<text x="1580" y="281" font-size="12" font-weight="700" fill="#38C77A">LIVE</text>'
           + rect(1396, 294, 212, 1, '#3FD8F0', 'opacity=".25"')
           + ''.join(f'<g transform="translate(1404,{320 + i * 52})"><path d="{ic[icn]}" fill="none" stroke="{c}" stroke-width="1.8"/></g>'
                     f'<text x="1420" y="{325 + i * 52}" font-size="13" font-weight="500" fill="#A9E7F2">{a}</text><text x="1608" y="{325 + i * 52}" font-size="14.5" font-weight="700" fill="#FFFFFF" text-anchor="end">{b}</text>'
                     f'<g transform="translate(1420,{333 + i * 52}) scale(1.4,1)"><path class="tw-spark" style="--dl:-{i * 1.3:.1f}s" pathLength="1" d="{d}" fill="none" stroke="{c}" stroke-width="2" stroke-linecap="round"/></g>' for i, (icn, a, b, d, c) in enumerate(rows))
           + '<text x="1396" y="467" font-size="11.5" fill="#6FB5C8">Streaming from 3 research zones</text>')
    s.append(f'<g class="tw-bld tw-fade" style="--bd:2.6s"><g transform="translate(-1336,548)"><g class="tw-hud">{hud}</g></g></g>')
    # wireframe for the build-up
    W = [[(P0, Q0, -.12), (P1, Q0, -.12), (P1, Q1, -.12), (P0, Q1, -.12)], [(0, 0, 0), (14, 0, 0), (14, 10, 0), (0, 10, 0)],
         [(0, 0, 2.4), (14, 0, 2.4), (14, 10, 2.4), (0, 10, 2.4)], [(0, 5, 0), (14, 5, 0), (14, 5, 1.3), (0, 5, 1.3)],
         [(5, 5, 0), (5, 10, 0), (5, 10, 1.3), (5, 5, 1.3)], [(9, 0, 0), (9, 5, 0), (9, 5, 1.3), (9, 0, 1.3)],
         [(0, 0, 0), (0, 0, 2.4), (0, 10, 2.4), (0, 10, 0)], [(0, 0, 0), (0, 0, 2.4), (14, 0, 2.4), (14, 0, 0)],
         [(2, 2.3, .92), (5, 2.3, .92), (5, 3.4, .92), (2, 3.4, .92)], [(.05, 5.95, .44), (2.25, 5.95, .44), (2.25, 7.75, .44), (.05, 7.75, .44)],
         [(10.2, .05, .44), (12.0, .05, .44), (12.0, 2.25, .44), (10.2, 2.25, .44)], [(5.15, 6, .34), (6.07, 6, .34), (6.07, 8.6, .34), (5.15, 8.6, .34)],
         [(6.9, 6.7, .42), (8.1, 6.7, .42), (8.1, 7.5, .42), (6.9, 7.5, .42)]]
    s.append('<g class="tw-bp" aria-hidden="true">' + ''.join(I.outline(w, i=k % 8) for k, w in enumerate(W)) + '</g>')
    return '\n'.join(s) + '\n', people_css
