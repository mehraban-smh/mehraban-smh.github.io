"""Recognisable isometric furniture for the digital-twin scenes. All sizes in metres, viewed from +x +y."""
import math
from iso import *

HL = 'stroke="#FFFFFF" stroke-opacity=".28" stroke-width="1" stroke-linejoin="round"'

def bx(I, x, y, z, dx, dy, dz, col, top=None, hl=True):
    """box with face shading and a soft highlight on the top edges"""
    x1, y1, z1 = x + dx, y + dy, z + dz
    t = top or shade(col, 1.12)
    return (I.poly([(x1, y, z), (x1, y1, z), (x1, y1, z1), (x1, y, z1)], shade(col, .76))
            + I.poly([(x, y1, z), (x1, y1, z), (x1, y1, z1), (x, y1, z1)], shade(col, .9))
            + I.poly([(x, y, z1), (x1, y, z1), (x1, y1, z1), (x, y1, z1)], t, HL if hl else ''))

def legs(I, x, y, z0, dx, dy, h, col, t=.05):
    return ''.join(bx(I, a, b, z0, t, t, h, col, hl=False) for a, b in [(x, y), (x + dx - t, y), (x, y + dy - t), (x + dx - t, y + dy - t)])

def table(I, x, y, w, d, h, top='#B5824F', leg='#6E4B2E'):
    return legs(I, x + .04, y + .04, 0, w - .08, d - .08, h - .05, leg) + bx(I, x, y, h - .05, w, d, .05, top)

def nightstand(I, x, y, col='#B98A5C', w=.5, d=.45, h=.55, face='+y'):
    s = bx(I, x, y, 0, w, d, h, col)
    if face == '+y':
        s += f'<g transform="{I.ym(y + d)}">' + rect(x + .05, h * .45, w - .1, .015, shade(col, .7)) + rect(x + w / 2 - .05, h * .62, .1, .025, '#5A4632') + '</g>'
    else:
        s += f'<g transform="{I.xm(x + w)}">' + rect(y + .05, h * .45, d - .1, .015, shade(col, .7)) + rect(y + d / 2 - .05, h * .62, .1, .025, '#5A4632') + '</g>'
    return s

def lamp(I, x, y, z, shade_col='#F4E6CC', cls='', glow=True, size=1.0):
    X, Y = I.p(x, y, z)
    k = I.S / 46 * size
    out = ''
    if glow:
        out += f'<circle class="{cls}" cx="{X}" cy="{Y - 22 * k:.1f}" r="{64 * k:.1f}" fill="url(#tw-dlamp)"/>'
    out += (ell(X, Y, 7 * k, 3 * k, '#3A3F48') + rect(X - 1.2 * k, Y - 16 * k, 2.4 * k, 16 * k, '#3A3F48')
            + path(f'M{X - 7 * k:.1f} {Y - 16 * k:.1f}L{X - 4.5 * k:.1f} {Y - 30 * k:.1f}H{X + 4.5 * k:.1f}L{X + 7 * k:.1f} {Y - 16 * k:.1f}Z', shade_col)
            + ell(X, Y - 16 * k, 7 * k, 2.4 * k, '#FFF4D8'))
    return out

def floorlamp(I, x, y, cls='', shade_col='#F4E6CC'):
    X, Y = I.p(x, y, 0)
    k = I.S / 46
    return (f'<circle class="{cls}" cx="{X}" cy="{Y - 74 * k:.1f}" r="{70 * k:.1f}" fill="url(#tw-dlamp)"/>'
            + ell(X, Y, 9 * k, 4 * k, '#2E3238') + rect(X - 1.3 * k, Y - 70 * k, 2.6 * k, 70 * k, '#2E3238')
            + path(f'M{X - 10 * k:.1f} {Y - 68 * k:.1f}L{X - 6.5 * k:.1f} {Y - 86 * k:.1f}H{X + 6.5 * k:.1f}L{X + 10 * k:.1f} {Y - 68 * k:.1f}Z', shade_col)
            + ell(X, Y - 68 * k, 10 * k, 3 * k, '#FFF4D8'))

def sofa(I, x, y, L, col='#CDBCA4', cush='#E2D5C1', facing='+x', D=.92):
    """facing '+x': back against a wall at x, length L along y.  facing '+y': back at y, length along x."""
    n = max(1, round(L / .8))
    cl = L / n
    s = ''
    if facing == '+x':
        s += legs(I, x + .05, y + .05, 0, D - .1, L - .1, .1, '#4A3A2A')
        s += bx(I, x, y, .1, D, L, .24, col)
        s += bx(I, x, y, .34, .26, L, .5, col)
        s += ''.join(bx(I, x + .26, y + i * cl + .03, .34, D - .3, cl - .06, .14, cush) for i in range(n))
        s += ''.join(bx(I, x + .1, y + i * cl + .06, .48, .2, cl - .12, .32, shade(cush, 1.04)) for i in range(n))
        s += bx(I, x, y - .2, .1, D, .2, .48, shade(col, .95)) + bx(I, x, y + L, .1, D, .2, .48, shade(col, .95))
    else:
        s += legs(I, x + .05, y + .05, 0, L - .1, D - .1, .1, '#4A3A2A')
        s += bx(I, x, y, .1, L, D, .24, col)
        s += bx(I, x, y, .34, L, .26, .5, col)
        s += ''.join(bx(I, x + i * cl + .03, y + .26, .34, cl - .06, D - .3, .14, cush) for i in range(n))
        s += ''.join(bx(I, x + i * cl + .06, y + .1, .48, cl - .12, .2, .32, shade(cush, 1.04)) for i in range(n))
        s += bx(I, x - .2, y, .1, .2, D, .48, shade(col, .95)) + bx(I, x + L, y, .1, .2, D, .48, shade(col, .95))
    return s

def cushion(I, x, y, z, col, facing='+x'):
    return bx(I, x, y, z, .14, .36, .3, col) if facing == '+x' else bx(I, x, y, z, .36, .14, .3, col)

def bed(I, x, y, L, W, head='-x', frame='#8C6A4A', duvet='#36557A', pillow='#F7F3EC', sheet='#F1EDE6', board='#7F93A8'):
    """head '-x': headboard at x, bed runs along +x.  head '-y': headboard at y, bed runs along +y."""
    s = ''
    if head == '-x':
        s += bx(I, x, y, 0, .1, W, 1.0, board) + bx(I, x + .1, y, 0, L - .1, W, .28, frame)
        s += bx(I, x + .12, y + .03, .28, L - .14, W - .06, .16, sheet)
        s += bx(I, x + .2, y + .12, .44, .42, W / 2 - .18, .12, pillow) + bx(I, x + .2, y + W / 2 + .06, .44, .42, W / 2 - .18, .12, pillow)
        d0 = x + .1 + (L - .1) * .32
        s += bx(I, d0, y - .02, .2, x + L - d0 + .02, W + .04, .27, duvet)
        s += f'<g transform="{I.fm(.472)}">' + rect(d0 + .1, y, .04, W, shade(duvet, 1.15), 'opacity=".7"') + '</g>'
    else:
        s += bx(I, x, y, 0, W, .1, 1.0, board) + bx(I, x, y + .1, 0, W, L - .1, .28, frame)
        s += bx(I, x + .03, y + .12, .28, W - .06, L - .14, .16, sheet)
        s += bx(I, x + .12, y + .2, .44, W / 2 - .18, .42, .12, pillow) + bx(I, x + W / 2 + .06, y + .2, .44, W / 2 - .18, .42, .12, pillow)
        d0 = y + .1 + (L - .1) * .32
        s += bx(I, x - .02, d0, .2, W + .04, y + L - d0 + .02, .27, duvet)
        s += f'<g transform="{I.fm(.472)}">' + rect(x, d0 + .1, W, .04, shade(duvet, 1.15), 'opacity=".7"') + '</g>'
    return s

def drawers(I, x, y, w, d, h, col='#C9A577', face='+y', rows=3):
    s = bx(I, x, y, 0, w, d, h, col)
    if face == '+y':
        g = ''.join(rect(x + .05, h - (i + 1) * (h - .08) / rows, w - .1, (h - .08) / rows - .04, shade(col, 1.06), f'stroke="{shade(col, .7)}" stroke-width=".012"')
                    + rect(x + w / 2 - .08, h - (i + .5) * (h - .08) / rows - .015, .16, .03, '#5A4632') for i in range(rows))
        s += f'<g transform="{I.ym(y + d)}">{g}</g>'
    else:
        g = ''.join(rect(y + .05, h - (i + 1) * (h - .08) / rows, d - .1, (h - .08) / rows - .04, shade(col, 1.06), f'stroke="{shade(col, .7)}" stroke-width=".012"')
                    + rect(y + d / 2 - .08, h - (i + .5) * (h - .08) / rows - .015, .16, .03, '#5A4632') for i in range(rows))
        s += f'<g transform="{I.xm(x + w)}">{g}</g>'
    return s

def plant(I, x, y, size=1.0, seed=1, pot='#E8E1D6', z=0):
    X, Y = I.p(x, y, z)
    k = I.S / 46 * size
    leaves = ''.join(f'<ellipse cx="{X + dx * k:.1f}" cy="{Y - (34 + dy) * k:.1f}" rx="{5 * k:.1f}" ry="{15 * k:.1f}" fill="{c}" transform="rotate({a} {X + dx * k:.1f} {Y - (34 + dy) * k:.1f})"/>'
                     for dx, dy, a, c in [(-9, 4, -38, '#4F7F48'), (9, 3, 36, '#5E8E53'), (-4, 12, -12, '#6FA160'), (5, 13, 14, '#4F7F48'), (0, 18, 2, '#7DB06C'), (-12, -4, -62, '#6FA160'), (12, -5, 60, '#5E8E53')])
    return (f'<g class="tw-sway" style="--d:{5 + seed % 3}s;--dl:-{seed}s;transform-origin:{X}px {Y - 18 * k:.1f}px">{leaves}</g>'
            + path(f'M{X - 9 * k:.1f} {Y - 20 * k:.1f}H{X + 9 * k:.1f}L{X + 7 * k:.1f} {Y:.1f}H{X - 7 * k:.1f}Z', pot) + ell(X, Y - 20 * k, 9 * k, 3.4 * k, shade(pot, .8)))

def rug(I, x, y, w, d, col='#DCCAA9', border='#B9A07C', z=.004):
    return (f'<g transform="{I.fm(z)}">' + rect(x, y, w, d, col) + rect(x + .12, y + .12, w - .24, d - .24, 'none', f'stroke="{border}" stroke-width=".05"') + '</g>')

def tv(I, x, y, w, col='#2B3440', screen=None):
    """TV unit against a wall at y (screen faces +y)"""
    s = bx(I, x, y, 0, w, .42, .48, col, top='#DDD3C4') + bx(I, x + w * .15, y + .16, .48, w * .7, .05, .62, '#15191F')
    s += f'<g transform="{I.ym(y + .21)}">' + rect(x + w * .17, .52, w * .66, .54, '#0E2A44') + (screen or '') + '</g>'
    return s

def counter(I, x, y, L, D=.65, H=.9, cab='#2E4A66', top='#E9EDF0', sink_at=None, hob_at=None):
    """kitchen run against the y wall, doors facing +y"""
    s = bx(I, x, y, 0, L, D, H - .04, cab) + bx(I, x - .02, y, H - .04, L + .04, D + .03, .04, top)
    n = max(1, round(L / .6))
    doors = ''.join(rect(x + i * L / n + .03, .1, L / n - .06, H - .24, shade(cab, 1.12), f'stroke="{shade(cab, .7)}" stroke-width=".012"') + rect(x + (i + .5) * L / n - .03, H - .32, .06, .02, '#C9D1D8') for i in range(n))
    s += f'<g transform="{I.ym(y + D)}">{doors}</g>'
    if sink_at is not None:
        s += f'<g transform="{I.fm(H + .001)}">' + rect(sink_at, y + .12, .55, .38, '#AEB9C3') + rect(sink_at + .04, y + .16, .47, .3, '#7C8994') + '</g>'
    if hob_at is not None:
        s += f'<g transform="{I.fm(H + .001)}">' + rect(hob_at, y + .1, .6, .45, '#1B1F24') + ''.join(f'<circle cx="{hob_at + a}" cy="{y + b}" r=".09" fill="none" stroke="#C8574D" stroke-width=".02"/>' for a, b in [(.16, .22), (.44, .22), (.16, .43), (.44, .43)]) + '</g>'
        X, Y = I.p(hob_at + .3, y + .32, H + .02)
        k = I.S / 46
        s += (ell(X, Y, 9 * k, 4 * k, '#3A3F48') + rect(X - 9 * k, Y - 7 * k, 18 * k, 7 * k, '#4A515B') + ell(X, Y - 7 * k, 9 * k, 4 * k, '#5C646E')
              + ''.join(f'<path class="tw-steam" style="--dl:-{j * 1.4:.1f}s" d="M{X - 3 * k + j * 5 * k:.1f} {Y - 10 * k:.1f}q-4-7 0-14t0-14" fill="none" stroke="#FFFFFF" stroke-width="{2 * k:.1f}" stroke-linecap="round"/>' for j in range(2)))
    return s

def fridge(I, x, y, w=.9, d=.75, h=1.9, col='#C2CCD5'):
    s = bx(I, x, y, 0, w, d, h, col)
    s += f'<g transform="{I.ym(y + d)}">' + rect(x + .02, 1.2, w - .04, .015, shade(col, .7)) + rect(x + w - .12, 1.3, .03, .4, '#7C8994') + rect(x + w - .12, .55, .03, .45, '#7C8994') + rect(x + .15, 1.4, .25, .3, '#3FD8F0', 'opacity=".7"') + '</g>'
    return s

def stool(I, x, y, col='#8A6A4E'):
    return legs(I, x, y, 0, .32, .32, .58, '#3A3F48', .035) + bx(I, x - .02, y - .02, .58, .36, .36, .06, col)

def tree(I, x, y, h=2.6, seed=1, col='#3E8E7E'):
    X, Y = I.p(x, y, 0)
    k = I.S / 46
    t = h * I.S
    trunk = rect(X - 2.5 * k, Y - t * .45, 5 * k, t * .45, '#6B5544')
    crown = (path(f'M{X:.1f} {Y - t:.1f}L{X + 22 * k:.1f} {Y - t * .42:.1f}L{X:.1f} {Y - t * .3:.1f}Z', shade(col, .8))
             + path(f'M{X:.1f} {Y - t:.1f}L{X - 22 * k:.1f} {Y - t * .42:.1f}L{X:.1f} {Y - t * .3:.1f}Z', col)
             + path(f'M{X:.1f} {Y - t:.1f}L{X:.1f} {Y - t * .3:.1f}', 'none', 'stroke="#9BF1FF" stroke-opacity=".35" stroke-width="1.2"'))
    shadow = ell(X, Y, 18 * k, 7 * k, '#000000', 'opacity=".25"')
    return shadow + trunk + f'<g class="tw-sway" style="--d:{6 + seed % 3}s;--dl:-{seed}s;transform-origin:{X}px {Y}px">{crown}</g>'

def heatpump(I, x, y, w=.95, d=.4, h=.8, face='+x', cls='tw-spin'):
    s = bx(I, x, y, 0, w, d, h, '#D9E0E6')
    blades = ''.join(f'<ellipse cx="0" cy="-.13" rx=".05" ry=".13" fill="#8A97A3" transform="rotate({a})"/>' for a in (0, 90, 180, 270))
    if face == '+x':
        s += (f'<g transform="{I.xm(x + w)}">' + circ(y + d * .45 + .05, h * .52, .26, '#AEB9C3') + circ(y + d * .45 + .05, h * .52, .26, 'none', 'stroke="#7C8994" stroke-width=".02"')
              + f'<g transform="translate({y + d * .45 + .05},{h * .52})"><g class="{cls}" style="--d:1.4s">{blades}</g></g>' + '</g>')
    else:
        s += (f'<g transform="{I.ym(y + d)}">' + circ(x + w * .4, h * .52, .26, '#AEB9C3') + circ(x + w * .4, h * .52, .26, 'none', 'stroke="#7C8994" stroke-width=".02"')
              + f'<g transform="translate({x + w * .4},{h * .52})"><g class="{cls}" style="--d:1.4s">{blades}</g></g>'
              + ''.join(rect(x + w * .75, .15 + i * .1, .18, .03, '#AEB9C3') for i in range(5)) + '</g>')
    return s

# ---------------------------------------------------------------- grounding and fittings
def shadow(I, x, y, w, d, op=.16, pad=.06):
    """soft contact shadow on the floor under an object"""
    return (f'<g transform="{I.fm(.003)}"><rect x="{x - pad:.2f}" y="{y - pad:.2f}" width="{w + 2 * pad:.2f}" height="{d + 2 * pad:.2f}" rx=".08" fill="#000000" opacity="{op}"/>'
            f'<rect x="{x + .02:.2f}" y="{y + .02:.2f}" width="{w + .14:.2f}" height="{d + .14:.2f}" rx=".06" fill="#000000" opacity="{op * .6:.2f}"/></g>')

def pedfan(I, x, y, h=1.2, spin='tw-fanr tw-sync', blur='tw-fanblur tw-sync'):
    """pedestal fan seen from behind (it blows toward the back of the room): base, pole, cage, blades, gentle oscillation"""
    k = I.S / 46
    X0, Y0 = I.p(x, y, 0)
    X1, Y1 = I.p(x, y, h)
    R = 17 * k
    blades = ''.join(f'<ellipse cx="0" cy="{-R * .5:.1f}" rx="{R * .26:.1f}" ry="{R * .5:.1f}" fill="#B9C6D2" transform="rotate({a})"/>' for a in (0, 120, 240))
    spokes = ''.join(f'<line x1="0" y1="0" x2="{R * math.cos(math.radians(a)):.1f}" y2="{R * math.sin(math.radians(a)):.1f}" stroke="#9AA8B5" stroke-width="{.9 * k:.1f}"/>' for a in range(0, 360, 30))
    head = (f'<g transform="translate({X1},{Y1 - R * .9:.1f})"><g class="tw-osc">'
            + f'<g transform="scale(.8,1)">' + circ(0, 0, R, '#25313D', 'opacity=".92"') + f'<circle class="{blur}" r="{R * .95:.1f}" fill="#C7D3DE"/>'
            + f'<g class="{spin}">{blades}</g>' + spokes + circ(0, 0, R, 'none', f'stroke="#9AA8B5" stroke-width="{1.6 * k:.1f}"')
            + circ(0, 0, R * .62, 'none', f'stroke="#9AA8B5" stroke-width="{.8 * k:.1f}"') + '</g>'
            + ell(-3 * k, 1 * k, 7 * k, 6.5 * k, '#3A4654') + ell(-4 * k, 0, 4 * k, 3.6 * k, '#556373') + '</g></g>')
    return (ell(X0, Y0, 15 * k, 6 * k, '#000000', 'opacity=".2"') + ell(X0, Y0, 12 * k, 5 * k, '#3A4654') + ell(X0, Y0 - 1.5 * k, 12 * k, 5 * k, '#4A5866')
            + rect(X0 - 1.6 * k, Y1 - 2 * k, 3.2 * k, Y0 - Y1, '#4A5866') + head)

def ac_unit(I, x0, x1, z, y=0, on='tw-on tw-sync', col='#9FD8FF'):
    """split air conditioner on the y wall, cool air falling into the room while powered"""
    k = I.S / 46
    s = bx(I, x0, y, z, x1 - x0, .22, .3, '#EEF2F5') + f'<g transform="{I.ym(y + .22)}">' + rect(x0 + .05, z + .03, x1 - x0 - .1, .045, '#9AA6B2') + circ(x1 - .1, z + .2, .02, '#38C77A') + '</g>'
    n = max(2, round((x1 - x0) / .35))
    air = ''.join(f'<path class="tw-air" style="--dl:-{j * .45:.2f}s" d="M{I.p(x0 + .2 + j * (x1 - x0 - .4) / (n - 1), y + .3, z - .02)[0]} {I.p(x0 + .2 + j * (x1 - x0 - .4) / (n - 1), y + .3, z - .02)[1]}q{-6 * k:.1f} {10 * k:.1f} {-2 * k:.1f} {22 * k:.1f}t{-4 * k:.1f} {24 * k:.1f}" fill="none" stroke="{col}" stroke-width="{2.4 * k:.1f}" stroke-linecap="round"/>' for j in range(n))
    return s + f'<g class="{on}">{air}</g>'

def fancoil(I, x0, x1, y, h=.62):
    """low-temperature heat-pump fan convector against the y partition, warm air rising"""
    k = I.S / 46
    s = bx(I, x0, y, .08, x1 - x0, .2, h, '#F2F4F6') + legs(I, x0 + .05, y + .05, 0, x1 - x0 - .1, .1, .08, '#9AA6B2', .04)
    s += f'<g transform="{I.ym(y + .2)}">' + ''.join(rect(x0 + .08, .5 + i * .035 - .07, x1 - x0 - .16, .015, '#B8C3CD') for i in range(4)) + rect(x0 + .08, .15, .12, .05, '#38C77A', 'opacity=".9"') + '</g>'
    n = max(2, round((x1 - x0) / .3))
    s += ''.join(f'<path class="tw-heat" style="--dl:-{j * .5:.1f}s;animation-duration:2.6s" d="M{I.p(x0 + .15 + j * (x1 - x0 - .3) / (n - 1), y + .1, h + .1)[0]} {I.p(x0 + .15 + j * (x1 - x0 - .3) / (n - 1), y + .1, h + .1)[1]}q{5 * k:.1f} {-5 * k:.1f} 0 {-10 * k:.1f}q{-5 * k:.1f} {-5 * k:.1f} 0 {-10 * k:.1f}" fill="none" stroke="#F59A3C" stroke-width="{2.2 * k:.1f}" stroke-linecap="round"/>' for j in range(n))
    return s

def wallclock(I, plane, u, v, r=.17):
    """clock on a wall plane (xm/ym matrix string), hands turning at a steady pace"""
    ticks = ''.join(rect(u - .006, v + r * .72, .012, r * .2, '#5A4A3A', f'transform="rotate({a} {u} {v})"') for a in range(0, 360, 30))
    return (f'<g transform="{plane}">' + circ(u, v, r, '#FBF5EA', f'stroke="#5A4A3A" stroke-width="{r * .14:.3f}"') + ticks
            + f'<g transform="translate({u},{v})"><g class="tw-hourS"><rect x="-.012" y="-.015" width=".024" height="{r * .55:.3f}" rx=".01" fill="#3A2E25"/></g>'
            + f'<g class="tw-minS"><rect x="-.008" y="-.015" width=".016" height="{r * .8:.3f}" rx=".008" fill="#3A2E25"/></g></g>' + circ(u, v, .018, '#C8574D') + '</g>')
