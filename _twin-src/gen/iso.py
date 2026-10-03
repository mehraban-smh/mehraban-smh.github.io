"""Isometric helpers for the digital-twin house (version B). Plan units are metres; z is up."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *  # noqa  (svg helpers: P, poly, rect, circ, ell, path, g)

C = 0.8660254
CW, CH = 1600, 1175          # canvas (viewBox) of every twin SVG: the house fills the width, so the frame is taller than 16:9

class Iso:
    def __init__(self, S, ox, oy):
        self.S, self.ox, self.oy = S, ox, oy

    def p(self, x, y, z=0):
        return (round(self.ox + (x - y) * C * self.S, 1), round(self.oy + (x + y) * 0.5 * self.S - z * self.S, 1))

    def pct(self, x, y, z=0):
        X, Y = self.p(x, y, z)
        return round(X / (CW / 100), 1), round(Y / (CH / 100), 1)

    def poly(self, pts, fill, extra=''):
        return poly([self.p(*q) for q in pts], fill, extra)

    # affine maps so plan / wall content can be drawn in metres
    def fm(self, z=0):
        S = self.S
        return f'matrix({C*S:.3f} {0.5*S:.3f} {-C*S:.3f} {0.5*S:.3f} {self.ox:.1f} {self.oy - z*S:.1f})'

    def ym(self, y0):   # wall plane y = y0, coordinates (x, z) with z drawn upward as negative v
        S = self.S
        return f'matrix({C*S:.3f} {0.5*S:.3f} 0 {-S:.3f} {self.ox - y0*C*S:.1f} {self.oy + y0*0.5*S:.1f})'

    def xm(self, x0):   # wall plane x = x0, coordinates (y, z)
        S = self.S
        return f'matrix({-C*S:.3f} {0.5*S:.3f} 0 {-S:.3f} {self.ox + x0*C*S:.1f} {self.oy + x0*0.5*S:.1f})'

    def box(self, x, y, z, dx, dy, dz, top, fx, fy, extra=''):
        x1, y1, z1 = x + dx, y + dy, z + dz
        body = (self.poly([(x1, y, z), (x1, y1, z), (x1, y1, z1), (x1, y, z1)], fx)
                + self.poly([(x, y1, z), (x1, y1, z), (x1, y1, z1), (x, y1, z1)], fy)
                + self.poly([(x, y, z1), (x1, y, z1), (x1, y1, z1), (x, y1, z1)], top))
        return f'<g{(" " + extra) if extra else ""}>{body}</g>'

    def floor_ell(self, cx, cy, r, z=0):
        X, Y = self.p(cx, cy, z)
        return X, Y, round(1.2247 * r * self.S, 1), round(0.7071 * r * self.S, 1)

    def outline(self, pts, cls='tw-bp-ln', i=0, w=1.6, color='#5FE3F7'):
        d = 'M' + ' L'.join(f'{a:g} {b:g}' for a, b in (self.p(*q) for q in pts)) + 'Z'
        return f'<path class="{cls}" style="--i:{i}" pathLength="1" d="{d}" fill="none" stroke="{color}" stroke-width="{w}" stroke-linejoin="round"/>'

def shade(hexc, f):
    hexc = hexc.lstrip('#')
    r, g_, b = (int(hexc[i:i + 2], 16) for i in (0, 2, 4))
    if f < 1:
        r, g_, b = (int(v * f) for v in (r, g_, b))
    else:
        r, g_, b = (int(v + (255 - v) * (f - 1)) for v in (r, g_, b))
    return f'#{r:02X}{g_:02X}{b:02X}'

def tbox(iso, x, y, z, dx, dy, dz, col, extra='', top=None):
    """box with automatic face shades from one base colour"""
    return iso.box(x, y, z, dx, dy, dz, top or shade(col, 1.12), shade(col, .78), shade(col, .9), extra)
