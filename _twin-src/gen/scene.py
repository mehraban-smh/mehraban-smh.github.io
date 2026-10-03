"""One shared scene for the digital twin: walls, doors, windows, fittings, furniture and the family's routine,
all in house coordinates (metres). The exterior and every zone close-up are drawn from this, so they always agree.
Plan: kitchen x0-9 y0-5, mould bedroom x0-5 y5-10, living room x5-14 y5-10, resilience bedroom x9-14 y0-5."""
import math, random
from iso import *
from furn import *
from people import Actor

WALL, WALLX, CAP = '#E9B994', '#DCA47F', '#F6E4D0'
CY, CYL = '#3FD8F0', '#9BF1FF'
SYNC = 'tw-sync'          # animations that must stay in step between the outside view and a zone view

def room_of(x, y):
    if y < 5:
        return 'k' if x < 9 else 'r'
    return 'm' if x < 5 else 'l'

ROOMS = {'k': (0, 0, 9, 5), 'm': (0, 5, 5, 10), 'l': (5, 5, 14, 10), 'r': (9, 0, 14, 5)}

# ------------------------------------------------------------------ walls
WALLS = {   # axis 'x': runs along y at x=at;  axis 'y': runs along x at y=at
    'x0': dict(axis='x', at=-.25, t=.25, lo=0, hi=10, gaps=[], part=False),
    'y0': dict(axis='y', at=-.25, t=.25, lo=0, hi=14, gaps=[], part=False),
    'y5': dict(axis='y', at=5, t=.15, lo=0, hi=14, gaps=[(3.2, 4.2), (6.0, 9.0), (9.6, 10.6)], part=True),
    'x5': dict(axis='x', at=5, t=.15, lo=5.15, hi=10, gaps=[(8.8, 9.8)], part=True),
    'x9': dict(axis='x', at=9, t=.15, lo=0, hi=5, gaps=[(3.4, 4.4)], part=True),
}

def wall(I, key, lo=None, hi=None, zone=False):
    w = WALLS[key]
    H = 1.3 if (w['part'] and not zone) else 2.4
    lo = w['lo'] if lo is None else max(lo, w['lo'])
    hi = w['hi'] if hi is None else min(hi, w['hi'])
    cuts = sorted(g for g in w['gaps'] if g[1] > lo and g[0] < hi)
    segs, a = [], lo
    for g0, g1 in cuts:
        if g0 > a:
            segs.append((a, g0))
        a = max(a, g1)
    if a < hi:
        segs.append((a, hi))
    box = (lambda a, b, z0, h: I.box(w['at'], a, z0, w['t'], b - a, h, CAP, WALLX, WALL)) if w['axis'] == 'x' else \
          (lambda a, b, z0, h: I.box(a, w['at'], z0, b - a, w['t'], h, CAP, WALLX, WALL))
    out = ''.join(box(a, b, 0, H) for a, b in segs)
    if zone and w['part']:
        face = w['at'] + w['t']
        plane = I.xm(face) if w['axis'] == 'x' else I.ym(face)
        for g0, g1 in cuts:
            a, b = max(g0, lo), min(g1, hi)
            out += box(a, b, 2.05, .35)
            out += f'<g transform="{plane}">' + rect(a, 0, b - a, 2.05, 'none', 'stroke="#C9B79F" stroke-width=".05"') + '</g>'
    return out

def corner(I):
    return I.box(-.25, -.25, 0, .25, .25, 2.4, CAP, WALLX, WALL)

# ------------------------------------------------------------------ wall fittings
def mould_window(I, zone):
    rnd = random.Random(9)
    n = 16 if zone else 9
    rain = ''.join(f'<rect class="tw-rainx" style="--dl:-{k * .1:.2f}s" x="{8.72 + k * (1.0 / n):.2f}" y="1.75" width=".012" height=".15" fill="#FFFFFF" opacity=".8"/>' for k in range(n))
    drips = ''.join(f'<circle class="tw-drip" style="--d:{rnd.uniform(3, 6):.1f}s;--dl:-{rnd.uniform(0, 6):.1f}s;--dy:-.65px" cx="{8.78 + k * .11:.2f}" cy="1.8" r="{.022 if zone else .028}" fill="#FFFFFF"/>' for k in range(9))
    dew = ''.join(circ(round(rnd.uniform(8.72, 9.68), 2), round(rnd.uniform(.92, 1.45), 2), round(rnd.uniform(.006, .014), 3), '#FFFFFF', 'opacity=".75"') for _ in range(50 if zone else 0))
    curt = ''
    if zone:
        for a, b in ((8.32, 8.58), (9.82, 10.0)):
            curt += '<g class="tw-curtain2">' + rect(a, .7, b - a, 1.6, '#CDBFA9') + ''.join(rect(a + (b - a) * f, .7, .02, 1.6, '#B8AA93', 'opacity=".7"') for f in (.33, .66)) + '</g>'
    return (f'<g transform="{I.xm(0)}">' + rect(8.6, .8, 1.2, 1.2, '#2A3A4A') + '<clipPath id="tw-cwm' + ('z' if zone else 'e') + '"><rect x="8.7" y=".9" width="1.0" height="1.0"/></clipPath>'
            + f'<g clip-path="url(#tw-cwm{"z" if zone else "e"})">' + rect(8.7, .9, 1.0, 1.0, '#9DB8CF') + blob(8.95, 1.2, .25, 6, '#7F9A8C', 5) + blob(9.5, 1.25, .28, 6, '#86A093', 6) + rain
            + '<path class="tw-fog" d="M8.7 .9V1.35Q8.85 1.4 9.0 1.35T9.3 1.35T9.6 1.35T9.7 1.35V.9Z" fill="#F4F7FA"/>' + dew + drips + '</g>'
            + rect(9.17, .9, .04, 1.0, '#2A3A4A') + rect(8.55, .76, 1.3, .05, '#F2F2EF') + curt + '</g>')

def mould_corner(I):
    """the cold corner where the external wall meets the ceiling, next to the partition"""
    col = ''.join(f'<g class="tw-grow" style="--d:{5 + k % 3}s;--dl:-{k * .7:.1f}s">' + blob(u, v, r, 9, '#4E5A44', 300 + k, extra='opacity=".75"') + blob(u, v, r * .55, 5, '#2F3629', 350 + k, extra='opacity=".55"') + '</g>'
                  for k, (u, v, r) in enumerate([(5.35, 2.25, .18), (5.7, 2.3, .14), (5.3, 1.95, .13), (6.05, 2.32, .1), (5.25, 1.65, .09), (6.35, 2.33, .07)]))
    return (f'<g transform="{I.xm(0)}"><clipPath id="tw-cwc{I.S}"><rect x="5.15" y="0" width="4.85" height="2.4"/></clipPath><g clip-path="url(#tw-cwc{I.S})">'
            + '<g class="tw-cold">' + ell(5.15, 2.4, .9, .65, '#5FA8F0', 'opacity=".2"') + ell(5.15, 2.4, .45, .32, '#5FA8F0', 'opacity=".28"') + '</g>' + col + '</g></g>')

def x0_fittings(I, zone):
    art = f'<g transform="{I.xm(0)}">' + rect(6.4, 1.3, 1.1, .62, '#33465A') + rect(6.45, 1.35, 1.0, .52, '#8FB7CF') + poly([(6.5, 1.37), (6.85, 1.7), (7.15, 1.47), (7.4, 1.37)], '#5E8C78') + '</g>'
    sensor = f'<g transform="{I.xm(0)}">' + rect(7.82, 1.33, .26, .22, '#F4F6F8', 'rx=".04"') + circ(8.0, 1.48, .025, CY) + '</g>'
    return mould_window(I, zone) + mould_corner(I) + art + sensor

def y0_k(I, zone):
    return f'<g transform="{I.ym(0)}">' + rect(1.6, 1.3, 2.6, .8, '#2A3A4A') + rect(1.67, 1.37, 2.46, .66, '#6E9CC6') + rect(2.87, 1.37, .06, .66, '#2A3A4A') + '</g>'

def y0_r(I, zone):
    kwin = f'<g transform="{I.ym(0)}">' + rect(1.6, 1.3, 2.6, .8, '#2A3A4A') + rect(1.67, 1.37, 2.46, .66, '#6E9CC6') + rect(2.87, 1.37, .06, .66, '#2A3A4A') + '</g>'
    sun = ''.join(f'<rect x="-.018" y="-.62" width=".036" height=".2" fill="#FFF3C4" transform="rotate({a})"/>' for a in range(0, 360, 30))
    rwin = (f'<g transform="{I.ym(0)}">' + rect(12.45, .8, 1.4, 1.3, '#2A3A4A') + f'<clipPath id="tw-cwr{I.S}"><rect x="12.55" y=".9" width="1.2" height="1.1"/></clipPath><g clip-path="url(#tw-cwr{I.S})">'
            + rect(12.55, .9, 1.2, 1.1, '#FFE3A8') + f'<g transform="translate(13.15,1.5)"><g class="tw-spin" style="--d:24s">{sun}</g></g>' + circ(13.15, 1.5, .26, '#FFF6DA')
            + blob(12.75, .98, .2, 6, '#C9BB68', 71) + blob(13.55, 1.0, .22, 6, '#BFB060', 72)
            + f'<g class="tw-blindr2 {SYNC}">' + rect(12.55, .9, 1.2, 1.1, '#EDCC96') + rect(12.55, .9, 1.2, .035, '#C49A63') + '</g></g>'
            + rect(13.13, .9, .04, 1.1, '#2A3A4A') + rect(12.4, .76, 1.5, .05, '#F2F2EF') + '</g>')
    cable = 'M9.46 1.6V2.12H10.55'
    meter = (I.box(9.3, 0, 1.2, .32, .1, .4, '#F1F4F6', '#C5CDD4', '#DCE2E7') + f'<g transform="{I.ym(.1)}">' + rect(9.35, 1.3, .22, .16, '#14202D', 'rx=".02"')
             + f'<g class="tw-on {SYNC}">' + rect(9.38, 1.34, .16, .08, '#38E08A', 'rx=".01"') + '</g>' + f'<g class="tw-off {SYNC}">' + rect(9.38, 1.34, .16, .08, '#FF6B5B', 'rx=".01"') + '</g></g>'
             + f'<g transform="{I.ym(0)}"><path d="{cable}" fill="none" stroke="#3A4552" stroke-width=".035"/>'
             + f'<g class="tw-on {SYNC}"><path class="tw-flow2" d="{cable}" fill="none" stroke="#38E08A" stroke-width=".028" stroke-dasharray=".08 .1"/></g>'
             + f'<g class="tw-off {SYNC}"><path d="{cable}" fill="none" stroke="#C8574D" stroke-width=".02" stroke-dasharray=".05 .05"/></g></g>')
    return rwin + meter + ac_unit(I, 10.55, 11.85, 1.95, on=f'tw-on {SYNC}')

def y5_l(I, zone):
    return y5_fittings(I, zone, 'l')

def y5_m(I, zone):
    return y5_fittings(I, zone, 'm')

def y5_fittings(I, zone, which='ml'):
    th = (f'<g transform="{I.ym(5.15)}">' + rect(11.42, .8, .36, .42, '#FBF8F2', 'rx=".04" stroke="#CDBFAA" stroke-width=".015"') + circ(11.6, 1.01, .12, '#14202D')
          + '<circle class="tw-dial" cx="11.6" cy="1.01" r=".09" fill="none" stroke="#F2A541" stroke-width=".028" pathLength="1"/>' + circ(11.6, 1.01, .035, CY) + '</g>')
    hidden = f'<g transform="{I.ym(5.15)}">' + blob(1.45, 1.1, .15, 7, '#4E5A44', 77, extra='opacity=".75"') + '</g>'
    return (th if 'l' in which else '') + (hidden if 'm' in which else '')

def x9_fittings(I, zone):
    return wallclock(I, I.xm(9.15), 2.35, 1.03, .16)

# ------------------------------------------------------------------ furniture, room by room (draw order = back to front)
FOOT = []          # (x0, y0, x1, y1, height, name) for the path checker
def F(x0, y0, x1, y1, h, name):
    FOOT.append((x0, y0, x1, y1, h, name))

F(.3, .02, 5.8, .67, .9, 'counter'); F(6.0, .05, 6.9, .8, 1.9, 'fridge'); F(2.0, 2.3, 5.0, 3.4, .92, 'island')
for i in range(3):
    F(2.4 + i, 3.62, 2.72 + i, 3.94, .64, f'stool{i}')
F(9.65, .05, 10.15, .5, .55, 'r-nightstand'); F(10.3, .05, 12.1, 2.25, .55, 'r-bed'); F(9.15, 1.9, 9.6, 2.8, .75, 'r-dresser'); F(13.1, 3.7, 13.6, 4.2, 1.4, 'fan')
F(.4, 5.15, 1.6, 5.63, .95, 'drawers'); F(.05, 5.95, 2.25, 7.75, .55, 'm-bed'); F(.05, 8.0, .55, 8.45, .55, 'm-nightstand'); F(5.3, 5.4, 5.6, 5.7, 1.7, 'floorlamp'); F(5.15, 5.8, 6.07, 8.8, .82, 'sofa'); F(7.1, 5.1, 8.5, 5.52, 1.2, 'tv'); F(6.9, 6.7, 8.1, 7.5, .42, 'coffee')
F(10.4, 7.3, 11.7, 8.22, .82, 'armchair'); F(11.85, 7.6, 12.3, 8.05, .9, 'sidetable'); F(12.2, 5.15, 13.4, 5.35, .7, 'fancoil')
F(13.55, 6.7, 13.95, 7.1, 1.0, 'l-plant1'); F(13.3, 9.3, 13.7, 9.7, 1.0, 'l-plant2')

def k_back(I, zone=False):
    return shadow(I, .3, .02, 5.5, .65) + counter(I, .3, .02, 5.5, sink_at=1.3, hob_at=2.7) + shadow(I, 6.0, .05, .9, .75) + fridge(I, 6.0, .05)

def k_front(I, zone=False):
    hx, hy, hrx, hry = I.floor_ell(3.5, 2.85, .2, .92)
    k = I.S / 46
    hub = (''.join(f'<ellipse class="tw-hubring" style="--dl:-{j * .8:.1f}s" cx="{hx}" cy="{hy}" rx="{hrx * 2.2:.1f}" ry="{hry * 2.2:.1f}" fill="none" stroke="{CY}" stroke-width="2"/>' for j in range(3))
           + rect(hx - 9 * k, hy - 28 * k, 18 * k, 28 * k, '#16273B') + ell(hx, hy, 9 * k, 5 * k, '#16273B') + ell(hx, hy - 28 * k, 9 * k, 5 * k, '#2C4560') + ell(hx, hy - 29 * k, 5.5 * k, 2.8 * k, CY, 'class="tw-blink"'))
    return (shadow(I, 2.0, 2.3, 3.0, 1.1) + bx(I, 2.05, 2.35, 0, 2.9, 1.0, .87, '#2E4A66') + bx(I, 1.98, 2.28, .87, 3.04, 1.14, .05, '#EEF1F3')
            + ''.join(shadow(I, 2.4 + i, 3.62, .32, .32, .12) + stool(I, 2.4 + i, 3.62) for i in range(3)) + hub)

def r_items(I, zone=False):
    return (shadow(I, 9.15, 1.9, .45, .9) + drawers(I, 9.15, 1.9, .45, .9, .75, '#B98A5C', face='+x', rows=3)
            + shadow(I, 9.65, .05, .5, .45) + nightstand(I, 9.65, .05) + lamp(I, 9.85, .25, .55, cls=f'tw-lamp {SYNC}')
            + I.poly([(9.98, .3, .556), (10.12, .3, .556), (10.12, .44, .556), (9.98, .44, .556)], '#1F2329')
            + f'<g class="tw-phoneon {SYNC}">' + I.poly([(10.0, .32, .56), (10.1, .32, .56), (10.1, .42, .56), (10.0, .42, .56)], '#7FC4A2') + '</g>'
            + shadow(I, 10.3, .05, 1.8, 2.2) + bed(I, 10.3, .05, 2.2, 1.8, head='-y', duvet='#EFE6D6', board='#C9B79F', frame='#9C7A56')
            + rug(I, 10.0, 2.55, 1.9, 1.5, '#E7DCC8', '#C9B79B') + pedfan(I, 13.35, 3.95, 1.2))

def m_items(I, zone=False):
    xray = f'<g transform="{I.ym(5.64)}"><path class="tw-xray" d="M.6 .2Q.6 .85 1.0 .85Q1.45 .85 1.45 .45Q1.45 .1 1.0 .12Z" fill="#4E5A44" fill-opacity=".2" stroke="{CY}" stroke-width=".03" stroke-dasharray=".08 .06"/></g>'
    return (rug(I, 2.6, 7.9, 2.0, 1.8, '#EDE4D3', '#CDBFA6') + shadow(I, .4, 5.15, 1.2, .48) + drawers(I, .4, 5.15, 1.2, .48, .95) + xray
            + bx(I, .6, 5.25, .95, .16, .16, .18, '#E8E1D6') + plant(I, 1.3, 5.4, .42, 3, pot='#E8E1D6', z=.95)
            + shadow(I, .05, 5.95, 2.2, 1.8) + bed(I, .05, 5.95, 2.2, 1.8, head='-x') + shadow(I, .05, 8.0, .5, .45) + nightstand(I, .05, 8.0, face='+x') + lamp(I, .3, 8.22, .55)
            )

def l_items(I, zone=False):
    tvs = ''.join(f'<rect class="tw-bar" style="--dl:-{j * .3:.1f}s" x="{7.42 + j * .12:.2f}" y=".58" width=".07" height=".42" fill="{CY}"/>' for j in range(7))
    return (rug(I, 6.3, 6.1, 2.9, 3.2, '#DCCAA9', '#BFA580') + floorlamp(I, 5.45, 5.55, 'tw-lampl')
            + shadow(I, 12.2, 5.15, 1.2, .2) + fancoil(I, 12.2, 13.4, 5.15)
            + shadow(I, 7.1, 5.1, 1.4, .42) + tv(I, 7.1, 5.1, 1.4, screen=tvs)
            + shadow(I, 5.15, 5.8, .92, 3.0) + sofa(I, 5.15, 6.0, 2.6) + cushion(I, 5.4, 6.15, .52, '#2D4460') + cushion(I, 5.4, 8.1, .52, '#D97B57')
            + shadow(I, 6.9, 6.7, 1.2, .8, .12) + table(I, 6.9, 6.7, 1.2, .8, .42, '#A8774A', '#5E4128') + bx(I, 7.1, 6.85, .42, .16, .16, .12, '#EFE9DF') + bx(I, 7.5, 6.9, .42, .4, .3, .06, '#2D4460')
            + shadow(I, 10.4, 7.3, 1.3, .92) + sofa(I, 10.6, 7.3, .9, '#C8963E', '#DDB061', facing='+y')
            + shadow(I, 11.85, 7.6, .45, .45, .12) + table(I, 11.85, 7.6, .45, .45, .55, '#B5824F', '#5E4128') + lamp(I, 12.07, 7.82, .55)
            + plant(I, 13.75, 6.9, 1.1, 8) + plant(I, 13.5, 9.5, 1.0, 9))

def outdoor_unit(I):
    """the heat pump's outdoor unit on its pad outside the living room (the garden and trees are gone)"""
    return shadow(I, 14.45, 6.0, .45, 1.0) + heatpump(I, 14.45, 6.0, w=.45, d=1.0, h=.8, face='+x')

# flooring: each research zone has its own colour (a softer version of its callout colour), the kitchen keeps grey tiles
FLOOR_COL = {'k': '#C7D1DA', 'm': '#A3C7EC', 'l': '#A4D8BD', 'r': '#F2B489'}

def floors(I):
    pool = lambda x, y, r: f'<circle cx="{x}" cy="{y}" r="{r}" fill="url(#tw-dlamp)"/>'
    return (f'<g transform="{I.fm()}">' + rect(0, 0, 9, 5, FLOOR_COL['k']) + rect(0, 0, 9, 5, 'url(#tw-dtile)') + rect(0, 5, 5, 5, FLOOR_COL['m']) + rect(5, 5, 9, 5, FLOOR_COL['l']) + rect(5, 5, 9, 5, 'url(#tw-dplank)')
            + rect(9, 0, 5, 5, FLOOR_COL['r']) + pool(3.5, 2.8, 2.6) + pool(.6, 8.3, 2.0) + pool(5.6, 6.2, 2.2) + pool(9.9, .4, 2.0) + pool(12.0, 7.9, 2.4) + '</g>')

def glass_front(I, xr=(0, 14), yr=(0, 10), sheen=True, op=.06, zone=False, pane_x=False):
    """glass front walls x=14 and y=10 (only the parts inside the given ranges)"""
    if zone:
        s = ''
        if xr[1] >= 14:
            y0, y1 = yr
            s += I.box(14, y0, 0, .1, y1 - y0, .07, '#9BB3C4', '#3E5466', '#4A6276')
            if pane_x:
                s += I.poly([(14, y0, .07), (14, y1, .07), (14, y1, 2.4), (14, y0, 2.4)], '#7FE3F5', 'opacity=".05"')
                a, b = I.p(14, y0, 2.4), I.p(14, y1, 2.4)
                s += f'<path d="M{a[0]} {a[1]}L{b[0]} {b[1]}" stroke="{CYL}" stroke-width="1.6" stroke-opacity=".45"/>'
        if yr[1] >= 10:
            x0, x1 = xr
            s += I.box(x0, 10, 0, x1 - x0, .1, .07, '#9BB3C4', '#3E5466', '#4A6276')
        return s
    s = ''
    if xr[1] >= 14:
        y0, y1 = yr
        s += I.box(14, y0, 0, .12, y1 - y0, .25, '#9BB3C4', '#3E5466', '#4A6276') + I.poly([(14, y0, .25), (14, y1, .25), (14, y1, 2.4), (14, y0, 2.4)], '#7FE3F5', f'opacity="{op}"')
        s += ''.join(f'<line x1="{I.p(14, y, .25)[0]}" y1="{I.p(14, y, .25)[1]}" x2="{I.p(14, y, 2.4)[0]}" y2="{I.p(14, y, 2.4)[1]}" stroke="{CYL}" stroke-opacity=".3" stroke-width="1.4"/>' for y in (2.5, 5, 7.5) if y0 < y < y1)
        a, b = I.p(14, y0, 2.4), I.p(14, y1, 2.4)
        s += f'<path d="M{a[0]} {a[1]}L{b[0]} {b[1]}" fill="none" stroke="{CYL}" stroke-width="2.2" stroke-opacity=".85"/>'
    if yr[1] >= 10:
        x0, x1 = xr
        s += I.box(x0, 10, 0, x1 - x0 + (.12 if x1 >= 14 else 0), .12, .25, '#9BB3C4', '#3E5466', '#4A6276') + I.poly([(x0, 10, .25), (x1, 10, .25), (x1, 10, 2.4), (x0, 10, 2.4)], '#7FE3F5', f'opacity="{op}"')
        s += ''.join(f'<line x1="{I.p(x, 10, .25)[0]}" y1="{I.p(x, 10, .25)[1]}" x2="{I.p(x, 10, 2.4)[0]}" y2="{I.p(x, 10, 2.4)[1]}" stroke="{CYL}" stroke-opacity=".3" stroke-width="1.4"/>' for x in (2.5, 5, 7.5, 10, 12) if x0 < x < x1)
        a, b = I.p(x0, 10, 2.4), I.p(x1, 10, 2.4)
        s += f'<path d="M{a[0]} {a[1]}L{b[0]} {b[1]}" fill="none" stroke="{CYL}" stroke-width="2.2" stroke-opacity=".85"/>'
    if xr[1] >= 14 and yr[1] >= 10:
        a, b = I.p(14, 10, 0), I.p(14, 10, 2.4)
        s += f'<path d="M{a[0]} {a[1]}L{b[0]} {b[1]}" stroke="{CYL}" stroke-width="2.2" stroke-opacity=".85"/>'
    return s

# ------------------------------------------------------------------ the family's day (60 s loop, shared by every view)
SEATS = {'mum-sofa': (5.62, 7.4, .48), 'dad-chair': (11.05, 7.75, .48), 'dad-bed': (1.25, 6.85, .46), 'kid-bed': (11.2, 1.25, .46), 'kid-rug': (8.1, 8.75, 0)}

def family(I, view):
    mum = Actor('mum', 'woman', I, (2.95, 1.05), speed=1.3, room=room_of, view=view, opts={'aura': view == 'zl'})
    mum.do('cook', 11, 1)
    mum.go((5.6, 1.6), (6.32, 4.0), (6.32, 5.85), (6.45, 7.4)).do('stand', .4, -1)
    mum.do('read', until=32, face=1, at=SEATS['mum-sofa']).do('stand', .4, 1, at=(6.45, 7.4))
    mum.go((6.45, 9.0)).do('talk', until=42, face=1)
    mum.go((5.0, 9.3), (.6, 9.2)).do('cook', until=49.3, face=-1)
    mum.go((2.9, 8.5), (2.9, 6.3), (3.7, 5.3), (3.7, 4.6), (1.5, 4.25), (1.5, 1.6), (2.95, 1.05)).do('cook', until=60, face=1)
    dad = Actor('dad', 'man', I, SEATS['dad-bed'], speed=1.2, room=room_of, view=view, opts={'breath': True})
    dad.do('sleep', 13, 1, angle=30).do('stand', .5, 1, at=(2.6, 7.2))
    dad.go((3.7, 5.6), (3.7, 4.6), (5.5, 4.4), (6.45, 1.3)).do('cook', until=24, face=1)
    dad.go((8.75, 4.3), (8.75, 6.2), (8.75, 8.0), (7.6, 8.5)).do('phone', until=34.1, face=-1).do('talk', until=42, face=-1)
    dad.go((9.4, 8.65), (11.05, 8.6)).do('stand', .3, -1).do('sit', until=46.5, face=-1, at=SEATS['dad-chair']).do('stand', .4, -1, at=(11.05, 8.6))
    dad.go((8.6, 9.3), (6.6, 9.35), (5.0, 9.3), (2.6, 7.2)).do('stand', .4, -1).do('sleep', until=60, face=1, at=SEATS['dad-bed'], angle=30)
    kid = Actor('kid', 'kid', I, SEATS['kid-rug'], speed=1.0, room=room_of, view=view)
    kid.do('play', 10, 1).do('stand', .5, 1, at=(8.1, 8.75))
    kid.go((9.6, 6.4), (10.1, 5.5), (10.1, 4.6), (10.4, 3.4), (11.2, 2.75)).do('stand', .4, -1)
    kid.do('hot', until=40, face=1, at=SEATS['kid-bed'], angle=150).do('stand', .4, -1, at=(11.2, 2.75))
    kid.go((10.4, 3.4), (10.1, 4.6), (10.1, 5.5), (9.6, 6.4), (8.1, 8.75)).do('stand', .3, 1).do('play', until=60, face=1, at=SEATS['kid-rug'])
    for a in (mum, dad, kid):
        assert abs(a.t - 60) < .05, (a.name, a.t)
    return [mum, dad, kid]

def people_layers(I, view):
    layers, css = {}, []
    for a in family(I, view):
        out, c = a.build(60.0)
        css.append(c)
        for r, g in out.items():
            layers[r] = layers.get(r, '') + g
    return layers, '\n'.join(css)

# ------------------------------------------------------------------ path checker (collisions, and people hidden behind furniture)
def check_paths():
    I = Iso(44, 724, 212)
    issues = []
    wall_rects = []
    for key, w in WALLS.items():
        a, segs = w['lo'], []
        for g0, g1 in w['gaps']:
            segs.append((a, g0)); a = g1
        segs.append((a, w['hi']))
        for s0, s1 in segs:
            if w['axis'] == 'x':
                wall_rects.append((w['at'], s0, w['at'] + w['t'], s1, 2.4 if not w['part'] else 1.3, 'wall ' + key))
            else:
                wall_rects.append((s0, w['at'], s1, w['at'] + w['t'], 2.4 if not w['part'] else 1.3, 'wall ' + key))
    def dist(px, py, r):
        dx = max(r[0] - px, 0, px - r[2]); dy = max(r[1] - py, 0, py - r[3])
        return math.hypot(dx, dy)
    for a in family(I, 'chk'):
        rad = .16 if a.kind == 'kid' else .2
        for (x0, y0, _), (x1, y1, _) in a.walks:
            n = max(2, int(math.hypot(x1 - x0, y1 - y0) / .1))
            for i in range(n + 1):
                px, py = x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n
                for r in FOOT + wall_rects:
                    if dist(px, py, r) < rad:
                        issues.append(f'{a.name}: walks into {r[5]} at ({px:.2f},{py:.2f})')
                # hidden behind something taller than the knees that stands nearer the viewer
                X, Y = I.p(px, py)
                Hh = (1.18 if a.kind == 'kid' else 1.7)
                me = room_of(px, py)
                for r in FOOT:
                    if r[4] < .6 or r[0] + r[1] <= px + py or r[5] in ('island',) or r[5].startswith('stool'):
                        continue
                    if room_of((r[0] + r[2]) / 2, (r[1] + r[3]) / 2) != me:
                        continue
                    xs = [I.p(u, v)[0] for u in (r[0], r[2]) for v in (r[1], r[3])]
                    ytop = min(I.p(u, v, r[4])[1] for u in (r[0], r[2]) for v in (r[1], r[3]))
                    if min(xs) < X + 8 and max(xs) > X - 8 and ytop < Y - 6 and max(I.p(u, v)[1] for u in (r[0], r[2]) for v in (r[1], r[3])) > Y - Hh * 44:
                        if min(u + v for u in (r[0], r[2]) for v in (r[1], r[3])) > px + py:
                            issues.append(f'{a.name}: hidden behind {r[5]} at ({px:.2f},{py:.2f})')
    seen, out = set(), []
    for s in issues:
        key = s.split(' at ')[0]
        if key not in seen:
            seen.add(key); out.append(s)
    return out

if __name__ == '__main__':
    for s in check_paths():
        print(s)
    print('checked')

# ------------------------------------------------------------------ looking through a doorway into the next room
def openings(I, key, lo, hi):
    """screen polygons of the openings in a wall (zone mode), for clipping the view beyond"""
    w = WALLS[key]
    face = w['at'] + w['t']
    polys = []
    for g0, g1 in w['gaps']:
        a, b = max(g0, lo), min(g1, hi)
        if b <= a:
            continue
        if w['axis'] == 'x':
            pts = [I.p(face, a, 0), I.p(face, b, 0), I.p(face, b, 2.05), I.p(face, a, 2.05)]
        else:
            pts = [I.p(a, face, 0), I.p(b, face, 0), I.p(b, face, 2.05), I.p(a, face, 2.05)]
        polys.append(' '.join(f'{x:g},{y:g}' for x, y in pts))
    return polys

def neighbour(I, room, layers):
    """the next room as seen through an opening: floor, its back walls and fittings, furniture, people"""
    x0, y0, x1, y1 = ROOMS[room]
    fl = f'<g transform="{I.fm()}">' + rect(x0, y0, x1 - x0, y1 - y0, FLOOR_COL[room]) + (rect(x0, y0, x1 - x0, y1 - y0, 'url(#tw-dtile)') if room == 'k' else '') + '</g>'
    if room == 'k':
        body = wall(I, 'x0', 0, 5, zone=True) + wall(I, 'y0', 0, 9, zone=True) + y0_k(I, True) + k_back(I) + layers.get('k', '') + k_front(I)
    elif room == 'r':
        body = wall(I, 'y0', 9, 14, zone=True) + wall(I, 'x9', 0, 5, zone=True) + y0_r(I, True) + x9_fittings(I, True) + r_items(I) + layers.get('r', '')
    elif room == 'm':
        body = wall(I, 'x0', 5, 10, zone=True) + wall(I, 'y5', 0, 5, zone=True) + x0_fittings(I, True) + y5_m(I, True) + m_items(I) + layers.get('m', '')
    else:
        body = wall(I, 'y5', 5, 14, zone=True) + wall(I, 'x5', 5, 10, zone=True) + y5_l(I, True) + l_items(I) + layers.get('l', '')
    return fl + body + f'<rect x="0" y="0" width="{CW}" height="{CH}" fill="#0A1626" opacity=".28"/>'

def through(I, cid, key, lo, hi, room, layers):
    polys = openings(I, key, lo, hi)
    if not polys:
        return ''
    clip = f'<clipPath id="{cid}">' + ''.join(f'<polygon points="{p}"/>' for p in polys) + '</clipPath>'
    return f'<defs>{clip}</defs><g clip-path="url(#{cid})">' + neighbour(I, room, layers) + '</g>'
