"""Occupants for the digital-twin scenes: a man, a woman and a child drawn in profile (facing screen-right),
and a director that turns one shared daily routine into CSS keyframes (position, facing, pose, room).
Standing poses have their origin at the feet; sitting, playing and lying poses at the hip on the seat/floor/mattress,
so a body always rests on the surface it uses."""
import math
from iso import *

KINDS = {
    'man':   dict(H=1.78, skin='#E0B08A', hair='#2F241D', top='#3C6E9E', top2='#2F5C86', legs='#3B414C', shoe='#1F2328', style='short'),
    'woman': dict(H=1.68, skin='#EDC4A2', hair='#6A3B22', top='#D97B57', top2='#C4684A', legs='#E6BA97', shoe='#7A3B2E', style='long',
                  sleeveless=True, skirt='#2C3D55'),
    'kid':   dict(H=1.18, skin='#F1CBA8', hair='#8B5A33', top='#F2C14E', top2='#E0AC35', legs='#2C9BAA', shoe='#F2F4F6', style='kid'),
}
C = .8660254

class Body:
    def __init__(self, kind, S):
        self.k = KINDS[kind]; self.kind = kind
        self.u = self.k['H'] * S
        self.S = S
        self.sleeve = self.k['skin'] if self.k.get('sleeveless') else self.k['top2']

    def f(self, v):
        return round(v * self.u, 2)

    def r(self, x, y, w, h, fill, rx=None, extra=''):
        f = self.f
        return f'<rect x="{f(x)}" y="{f(y)}" width="{f(w)}" height="{f(h)}" rx="{f(rx if rx is not None else min(w, h) / 2)}" fill="{fill}"{(" " + extra) if extra else ""}/>'

    def c(self, x, y, rad, fill, extra=''):
        f = self.f
        return f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(rad)}" fill="{fill}"{(" " + extra) if extra else ""}/>'

    def shadow(self, x=0, y=0):
        return f'<ellipse cx="{self.f(x)}" cy="{self.f(y)}" rx="{self.f(.13)}" ry="{self.f(.05)}" fill="#000000" opacity=".22"/>'

    # ---- parts (fractions of height; facing +x on screen)
    def head(self, hx, hy, tilt=0):
        k = self.k
        back = self.r(hx - .088, hy - .035, .07, .21, k['hair'], .035) if k['style'] == 'long' else ''
        s = (back + self.c(hx - .012, hy - .012, .072, k['hair']) + self.c(hx + .012, hy + .004, .064, k['skin'])
             + self.c(hx - .02, hy + .012, .014, shade(k['skin'], .9)))
        if k['style'] == 'kid':
            s += self.c(hx - .035, hy - .068, .028, k['hair'])
        if k['style'] == 'short':
            s += self.r(hx - .05, hy - .07, .1, .03, k['hair'], .015)
        s += self.c(hx + .05, hy - .004, .008, '#2A2622') + self.r(hx + .04, hy + .03, .025, .008, '#B9775E', .004)
        return f'<g transform="rotate({tilt} {self.f(hx)} {self.f(hy)})">{s}</g>' if tilt else s

    def torso(self, x, y, h=.36):
        k = self.k
        return (self.r(x - .08, y, .16, h, k['top'], .055) + self.r(x + .02, y + .03, .05, h - .08, shade(k['top'], 1.12), .025)
                + self.r(x - .08, y + h - .045, .16, .045, shade(k['top'], .82), .02))

    def leg(self, x, y0, length, dark=False):
        k = self.k
        col = shade(k['legs'], .82) if dark else k['legs']
        return self.r(x - .036, y0, .072, length, col, .03) + self.r(x - .04, y0 + length - .032, .11, .036, k['shoe'], .015)

    def arm(self, x, y, length=.31, dark=False):
        k = self.k
        col = shade(self.sleeve, .86) if dark else self.sleeve
        return self.r(x - .025, y, .05, length, col, .025) + self.c(x, y + length, .025, k['skin'])

    def skirt(self, sway=False):
        """A-line skirt from the waist to just above the knee (standing and walking poses)"""
        sk = self.k.get('skirt')
        if not sk:
            return ''
        f = self.f
        d = (f'<path d="M{f(-.08)} {f(-.5)}H{f(.08)}L{f(.115)} {f(-.275)}Q{f(0)} {f(-.258)} {f(-.115)} {f(-.275)}Z" fill="{sk}"/>'
             + f'<path d="M{f(.02)} {f(-.48)}L{f(.05)} {f(-.29)}" stroke="{shade(sk, 1.25)}" stroke-width="{f(.012)}" stroke-linecap="round" fill="none"/>'
             + self.r(-.08, -.5, .16, .028, shade(sk, .8), .012))
        return f'<g class="tw-sway2">{d}</g>' if sway else d

    def seg(self, x, y, length, ang, w, fill):
        """a limb from (x, y) of the given length, pointing at screen angle ang (degrees, 0 = right)"""
        f = self.f
        return f'<g transform="translate({f(x)},{f(y)}) rotate({ang})"><rect x="0" y="{f(-w / 2)}" width="{f(length)}" height="{f(w)}" rx="{f(w / 2)}" fill="{fill}"/></g>'

    # ---- standing poses (origin at the feet)
    def upper(self, arm_front=None, tilt=0, breathe=True):
        k = self.k
        up = self.torso(0, -.81) + self.r(-.016, -.85, .034, .05, k['skin'], .01) + self.head(0, -.905, tilt)
        if breathe:
            up = f'<g class="tw-breathe">{up}</g>'
        return up + (arm_front if arm_front is not None else self.arm(.01, -.78))

    def stand(self, arm=None, tilt=0):
        return self.shadow() + self.arm(-.03, -.78, dark=True) + self.leg(-.025, -.49, .47, True) + self.leg(.02, -.49, .47) + self.skirt() + self.upper(arm, tilt)

    def walk(self):
        f = self.f
        hip, sh = f(-.48), f(-.77)
        legA = f'<g transform="translate(0,{hip})"><g class="tw-legA">{self.leg(0, 0, .47, True)}</g></g>'
        legB = f'<g transform="translate(0,{hip})"><g class="tw-legB">{self.leg(0, 0, .47)}</g></g>'
        armA = f'<g transform="translate({f(-.01)},{sh})"><g class="tw-legB">{self.arm(0, 0, dark=True)}</g></g>'
        armB = f'<g transform="translate({f(.01)},{sh})"><g class="tw-legA">{self.arm(0, 0)}</g></g>'
        upper = self.torso(0, -.81) + self.r(-.016, -.85, .034, .05, self.k['skin'], .01) + self.head(0, -.905)
        return self.shadow() + armA + legA + legB + f'<g class="tw-bob">{self.skirt(True)}{upper}</g>' + armB

    def talk(self):
        f = self.f
        gest = f'<g transform="translate({f(.01)},{f(-.77)})"><g class="tw-gest">{self.arm(0, 0)}</g></g>'
        bp = {'woman': 0, 'man': -2.2, 'kid': -1.1}[self.kind]
        bub = (f'<g class="tw-bubble" style="--bp:{bp}s"><path d="M{f(-.15)} {f(-1.33)}h{f(.3)}a{f(.05)} {f(.05)} 0 0 1 {f(.05)} {f(.05)}v{f(.11)}a{f(.05)} {f(.05)} 0 0 1 {f(-.05)} {f(.05)}h{f(-.11)}l{f(-.04)} {f(.055)}l{f(-.04)} {f(-.055)}h{f(-.11)}'
               f'a{f(.05)} {f(.05)} 0 0 1 {f(-.05)} {f(-.05)}v{f(-.11)}a{f(.05)} {f(.05)} 0 0 1 {f(.05)} {f(-.05)}Z" fill="#FFFFFF" fill-opacity=".95"/>'
               + ''.join(self.c(-.09 + i * .09, -1.225, .02, '#1F4E79', f'class="tw-dot" style="--dl:{i * .25}s"') for i in range(3)) + '</g>')
        return self.stand(arm=gest) + bub

    def cook(self):
        f = self.f
        return self.stand(arm=f'<g transform="translate({f(.01)},{f(-.77)})"><g class="tw-stir">{self.arm(0, 0)}</g></g>', tilt=12)

    def phone(self):
        f = self.f
        a = (f'<g transform="translate({f(.01)},{f(-.77)}) rotate(-120)">{self.arm(0, 0, .22)}</g>'
             + self.r(.16, -.95, .035, .07, '#1B2026', .008) + self.r(.165, -.94, .025, .05, '#7FEAF8', .005, 'class="tw-blink"'))
        return self.stand(arm=a, tilt=16)

    # ---- seated poses (origin at the hip, on the seat; thighs run toward the facing direction in iso)
    def sit(self, hs, read=False, aura=False):
        k = self.k
        f = self.f
        hsf = hs / k['H']
        kx, ky = .24 * C, .24 * .5             # knee: thigh runs along the iso facing direction
        s = ''
        if aura:
            s += (f'<ellipse class="tw-ring" cx="{f(.12)}" cy="{f(.2 + hsf * .9)}" rx="{f(.5)}" ry="{f(.25)}" fill="none" stroke="#F2B866" stroke-width="{max(1.5, self.S / 40):.1f}"/>'
                  f'<ellipse class="tw-ring" style="--dl:-2s" cx="{f(.12)}" cy="{f(.2 + hsf * .9)}" rx="{f(.5)}" ry="{f(.25)}" fill="none" stroke="#F2B866" stroke-width="{max(1.5, self.S / 40):.1f}"/>')
        s += self.shadow(kx, ky + hsf)
        s += self.seg(-.02, -.01, .25, 30, .075, shade(k['legs'], .82)) + self.leg(kx - .01, ky - .02, hsf + .01, True)
        s += self.seg(.0, .0, .25, 30, .075, k['legs']) + self.leg(kx + .02, ky, hsf)
        if k.get('skirt'):
            s += self.r(-.09, -.09, .15, .12, k['skirt'], .04) + self.seg(-.03, -.02, .245, 30, .115, k['skirt'])
        up = self.torso(-.02, -.37, .37) + self.r(-.036, -.41, .034, .05, k['skin'], .01) + self.head(-.02, -.465, 10 if read else 0)
        s += f'<g class="tw-breathe">{up}</g>'
        if read:
            s += (f'<g transform="translate({f(0)},{f(-.33)}) rotate(-58)">{self.arm(0, 0, .21)}</g>'
                  + f'<path d="M{f(.1)} {f(-.2)}l{f(.09)} {f(-.035)}l{f(.02)} {f(.12)}l{f(-.09)} {f(.035)}Z" fill="#24364F"/>'
                  + f'<path d="M{f(.105)} {f(-.195)}l{f(.08)} {f(-.03)}l{f(.015)} {f(.1)}l{f(-.08)} {f(.03)}Z" fill="#FBF8F2"/>'
                  + f'<g class="tw-pagef"><path d="M{f(.185)} {f(-.225)}l{f(.05)} {f(.02)}l{f(.01)} {f(.1)}l{f(-.05)} {f(-.02)}Z" fill="#FFFFFF"/></g>')
        else:
            s += self.seg(.0, -.33, .3, 75, .05, self.sleeve) + self.c(.078, -.04, .025, k['skin'])
        return s

    def play(self):
        """child sitting on the floor, legs forward along the facing direction, building blocks ahead"""
        f = self.f
        k = self.k
        s = (self.shadow(.15, .06) + self.seg(-.01, -.02, .33, 30, .075, shade(k['legs'], .82)) + self.seg(.01, 0, .33, 30, .075, k['legs'])
             + self.r(.27, .1, .06, .09, k['shoe'], .02) + self.torso(-.02, -.38, .36) + self.head(.0, -.47, 14))
        s += f'<g transform="translate({f(0)},{f(-.34)})"><g class="tw-reach">{self.arm(0, 0, .3)}</g></g>'
        s += (self.r(.4, .1, .08, .08, '#E8504A', .01) + self.r(.49, .14, .08, .08, '#3FA7D6', .01)
              + f'<g class="tw-hop">{self.r(.44, .02, .08, .08, "#F2C14E", .01)}</g>')
        return s

    def lie(self, covered=None, hot=False, breath=False):
        """lying on the back along +x, hip at the origin on the mattress, head toward -x"""
        k = self.k
        s = (self.r(-.02, -.06, .5, .07, k['legs'], .035) + self.r(.45, -.12, .05, .1, k['shoe'], .02)
             + (self.r(-.06, -.075, .22, .095, k['skirt'], .04) if k.get('skirt') else '')
             + self.r(-.38, -.1, .38, .12, k['top'], .05) + self.r(-.3, -.12, .25, .045, self.sleeve, .02)
             + self.c(-.45, -.075, .07, k['hair']) + self.c(-.44, -.07, .062, k['skin']) + self.c(-.43, -.12, .009, '#2A2622'))
        if covered:   # asleep under the duvet: only head and shoulders show, the body is a soft shape under the covers
            s = (self.r(-.3, -.13, .8, .11, shade(covered, 1.08), .055) + self.r(-.3, -.13, .8, .025, shade(covered, 1.25), .012)
                 + self.r(-.38, -.105, .1, .1, k['top'], .04)
                 + self.c(-.45, -.075, .07, k['hair']) + self.c(-.44, -.07, .062, k['skin']) + self.r(-.45, -.12, .03, .008, '#2A2622', .004))
        if hot:
            s += ''.join(f'<g class="tw-sweat" style="--dl:-{i * .5}s">{self.c(-.47 + i * .05, -.16, .014, "#7FC8F0")}</g>' for i in range(3))
        return s

def draw(body, pose, kw):
    if pose in ('sit', 'read'):
        return body.sit(kw.get('hs', .48), read=pose == 'read', aura=kw.get('aura', False) and pose == 'read')
    if pose == 'sleep':
        return body.lie(covered=kw.get('cover', '#36557A'))
    if pose == 'hot':
        return body.lie(hot=True)
    return getattr(body, pose)()

class Actor:
    """A looping routine in plan coordinates (x, y[, z]). Every view built from the same script stays in step."""
    def __init__(self, name, kind, I, start, speed=1.1, room=None, view='ext', opts=None):
        self.name, self.kind, self.I, self.speed, self.view = name, kind, I, speed, view
        self.pos = tuple(start) + ((0,) if len(start) == 2 else ())
        self.t = 0.0
        self.segs = []
        self.walks = []
        self.room = room or (lambda x, y: None)
        self.opts = opts or {}

    def do(self, pose, dur=None, face=1, at=None, until=None, angle=None):
        if at is not None:
            self.pos = tuple(at) + ((0,) if len(at) == 2 else ())
        d = (until - self.t) if until is not None else dur
        assert d > 0, (self.name, pose, round(d, 2), round(self.t, 2))
        X, Y = self.I.p(*self.pos)
        self.segs.append(dict(t0=self.t, t1=self.t + d, pose=pose, face=face, a=(X, Y), b=(X, Y), room=self.room(self.pos[0], self.pos[1]), angle=angle))
        self.t += d
        return self

    def go(self, *pts):
        out = []
        for q in pts:
            q = tuple(q) + ((0,) if len(q) == 2 else ())
            prev = out[-1] if out else self.pos
            r0, r1 = self.room(prev[0], prev[1]), self.room(q[0], q[1])
            if r0 != r1:
                lo, hi = 0.0, 1.0
                for _ in range(30):
                    mid = (lo + hi) / 2
                    if self.room(prev[0] + (q[0] - prev[0]) * mid, prev[1] + (q[1] - prev[1]) * mid) == r0:
                        lo = mid
                    else:
                        hi = mid
                out.append((round(prev[0] + (q[0] - prev[0]) * hi, 3), round(prev[1] + (q[1] - prev[1]) * hi, 3), 0))
            out.append(q)
        for q in out:
            dist = math.hypot(q[0] - self.pos[0], q[1] - self.pos[1])
            d = max(dist / self.speed, .2)
            a, b = self.I.p(*self.pos), self.I.p(*q)
            face = 1 if b[0] - a[0] >= 0 else -1
            mid = ((self.pos[0] + q[0]) / 2, (self.pos[1] + q[1]) / 2)
            self.walks.append((self.pos, q))
            self.segs.append(dict(t0=self.t, t1=self.t + d, pose='walk', face=face, a=a, b=b, room=self.room(*mid), angle=None))
            self.t += d
            self.pos = q
        return self

    def build(self, T=None):
        T = T or self.t
        pct = lambda t: f'{min(100, max(0, t / T * 100)):.3f}%'
        nm = f'twp-{self.view}-{self.name}'
        css = []
        kf, prev = [], None
        for s in self.segs:
            t0 = s['t0'] if prev is None or prev == s['a'] else s['t0'] + .02
            kf.append(f'{pct(t0)}{{transform:translate({s["a"][0]}px,{s["a"][1]}px)}}')
            kf.append(f'{pct(s["t1"])}{{transform:translate({s["b"][0]}px,{s["b"][1]}px)}}')
            prev = s['b']
        css.append(f'@keyframes {nm}-pos{{{"".join(kf)}}}')
        def steps(fn, prop, fmt):
            return ''.join(f'{pct(s["t0"] + (.01 if i else 0))}{{{prop}:{fmt(fn(s))}}}{pct(s["t1"])}{{{prop}:{fmt(fn(s))}}}' for i, s in enumerate(self.segs))
        css.append(f'@keyframes {nm}-face{{{steps(lambda s: s["face"], "transform", lambda v: f"scaleX({v})")}}}')
        keys = []
        for s in self.segs:
            key = s['pose'] + (f'{s["angle"]}' if s['angle'] is not None else '')
            s['key'] = key
            if key not in keys:
                keys.append(key)
        for key in keys:
            css.append(f'@keyframes {nm}-v-{key}{{{steps(lambda s: s["key"] == key, "opacity", lambda v: 1 if v else 0)}}}')
        rooms = sorted({s['room'] for s in self.segs}, key=str)
        if rooms != [None]:
            for r in rooms:
                css.append(f'@keyframes {nm}-r-{r}{{{steps(lambda s: s["room"] == r, "opacity", lambda v: 1 if v else 0)}}}')
        body = Body(self.kind, self.I.S)
        inner = ''
        for key in keys:
            s = next(x for x in self.segs if x['key'] == key)
            g = draw(body, s['pose'], dict(self.opts))
            if s['pose'] in ('sleep', 'hot', 'lie'):
                ang = s['angle'] or 30
                g = f'<g transform="rotate({ang}){" scale(1,-1)" if ang > 90 else ""}">{g}</g>'
                if self.opts.get('breath') and s['pose'] == 'sleep':
                    g += ''.join(f'<path class="tw-wisp" style="--dl:-{j * 1.3:.1f}s" d="M{body.f(-.42 * math.cos(math.radians(ang)) + .02 * j):.1f} {body.f(-.42 * math.sin(math.radians(ang)) - .08):.1f}q-4-7 0-14t0-14" fill="none" stroke="#BFD9EE" stroke-width="{max(1.6, self.I.S / 40):.1f}" stroke-linecap="round"/>' for j in range(3))
            inner += f'<g class="tw-pa" style="animation-name:{nm}-v-{key};--T:{T:.2f}s">{g}</g>'
        core = (f'<g class="tw-pa" style="animation-name:{nm}-pos;--T:{T:.2f}s">'
                + f'<g class="tw-pa" style="animation-name:{nm}-face;--T:{T:.2f}s">{inner}</g></g>')
        out = {}
        for r in rooms:
            out[r] = core if r is None else f'<g class="tw-pa" style="animation-name:{nm}-r-{r};--T:{T:.2f}s">{core}</g>'
        return out, '\n'.join(css)
