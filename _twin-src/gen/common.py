"""Small SVG string helpers shared by the digital-twin house generator."""
import random

def P(pts):
    return ' '.join(f'{x:g},{y:g}' for x, y in pts)

def poly(pts, fill, extra=''):
    return f'<polygon points="{P(pts)}" fill="{fill}"{(" " + extra) if extra else ""}/>'

def rect(x, y, w, h, fill, extra=''):
    return f'<rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" fill="{fill}"{(" " + extra) if extra else ""}/>'

def circ(cx, cy, r, fill, extra=''):
    return f'<circle cx="{cx:g}" cy="{cy:g}" r="{r:g}" fill="{fill}"{(" " + extra) if extra else ""}/>'

def ell(cx, cy, rx, ry, fill, extra=''):
    return f'<ellipse cx="{cx:g}" cy="{cy:g}" rx="{rx:g}" ry="{ry:g}" fill="{fill}"{(" " + extra) if extra else ""}/>'

def path(d, fill='none', extra=''):
    return f'<path d="{d}" fill="{fill}"{(" " + extra) if extra else ""}/>'

def g(content, cls='', style='', extra=''):
    a = ''
    if cls: a += f' class="{cls}"'
    if style: a += f' style="{style}"'
    if extra: a += ' ' + extra
    return f'<g{a}>{content}</g>'

def blob(cx, cy, r, n, fill, seed, spread=1.0, extra=''):
    """A soft organic cluster of circles (foliage, mould, clouds)."""
    rnd = random.Random(seed)
    out = []
    for _ in range(n):
        a = rnd.uniform(0, 6.283)
        d = rnd.uniform(0, r * spread)
        import math
        out.append(circ(round(cx + math.cos(a) * d, 1), round(cy + math.sin(a) * d * 0.8, 1),
                        round(rnd.uniform(r * 0.35, r * 0.7), 1), fill, extra))
    return ''.join(out)

def lerp(a, b, t):
    return a + (b - a) * t
