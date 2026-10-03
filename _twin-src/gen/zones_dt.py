"""Version B zone close-ups. Each one is the same house, furniture and family as the outside view,
drawn at the zoom the outside view ends on, so diving into a zone lands on exactly the same room.
Each builder returns (svg, markers, css); markers are (x%, y%) in TW_SCENES spot order."""
from iso import *
from furn import *
import scene as SC
from ext_dt import circuits, stream, ZONES, CY, CYL

def iso_for(zone):
    return Iso(*ZONES[zone]['iso'])

HUD_DY = 110   # the HUD column sits lower on the taller canvas, beside the room

def holo(x, y, w, h, title, body, hd=.4, cls=''):
    return (f'<g transform="translate(0,{HUD_DY})"><g class="tw-hin" style="--hd:{hd}s"><g class="tw-hud {cls}">' + rect(x, y, w, h, '#08182C', f'rx="16" fill-opacity=".9" stroke="{CY}" stroke-opacity=".5" stroke-width="1.5"')
            + f'<text x="{x + 20}" y="{y + 32}" font-size="12.5" font-weight="700" letter-spacing="2.4" fill="#7FE3F5">{title}</text>'
            + rect(x + 20, y + 44, w - 40, 1, CY, 'opacity=".25"') + body + '</g></g></g>')

def ping(I, x, y, z, dl=0):
    X, Y = I.p(x, y, z)
    return (f'<g transform="translate({X},{Y})"><circle class="tw-ping" style="--dl:{dl}s" r="9" fill="none" stroke="{CYL}" stroke-width="2.4"/>'
            + circ(0, 0, 12, CY, 'opacity=".25"') + circ(0, 0, 6, '#E4FDFF') + '</g>')

def base(I, room, seed):
    x0, y0, x1, y1 = SC.ROOMS[room]
    s = [f'<defs><radialGradient id="tw-zbg{seed}" cx=".48" cy=".52" r=".65"><stop offset="0" stop-color="#16365E"/><stop offset=".6" stop-color="#0A1A30"/><stop offset="1" stop-color="#050D19"/></radialGradient>'
         f'<clipPath id="tw-zfl{seed}"><rect x="{x0}" y="{y0}" width="{x1 - x0}" height="{y1 - y0}"/></clipPath></defs>']
    s.append(rect(0, 0, CW, CH, '#050D19') + rect(0, 0, CW, CH, f'url(#tw-zbg{seed})') + circuits(seed + 40, 26))
    a, b, c, d = x0 - .3, y0 - .3, x1 + .3, y1 + .3
    s.append(I.poly([(a, b, -.1), (c, b, -.1), (c, d, -.1), (a, d, -.1)], '#0C2038') + f'<g transform="{I.fm(-.1)}"><rect x="{a}" y="{b}" width="{c - a}" height="{d - b}" fill="url(#tw-dgrid)"/></g>'
             + f'<path d="M{I.p(c, b, -.1)[0]} {I.p(c, b, -.1)[1]}L{I.p(c, d, -.1)[0]} {I.p(c, d, -.1)[1]}L{I.p(a, d, -.1)[0]} {I.p(a, d, -.1)[1]}" fill="none" stroke="{CY}" stroke-width="2" stroke-opacity=".7"/>')
    s.append(I.box(x0, y0, -.1, x1 - x0, y1 - y0, .1, '#C7D1DA', '#0F2440', '#12294A') + SC.floors(I).replace('<g transform=', f'<g clip-path="url(#tw-zfl{seed})" transform=', 1))
    return s

def finish(I, room):
    """front edges: glass where the house has glass, a low cut line where a partition stands"""
    x0, y0, x1, y1 = SC.ROOMS[room]
    s = ''
    if room == 'm':
        s += SC.glass_front(I, xr=(0, 5), yr=(5, 10), zone=True) + I.box(5, 5.15, 0, .15, 4.85, .05, '#E9B994', '#C79170', '#D9A07C')
    if room == 'r':
        s += SC.glass_front(I, xr=(9, 14), yr=(0, 5), zone=True) + I.box(9.15, 5, 0, 4.85, .15, .05, '#E9B994', '#C79170', '#D9A07C')
    if room == 'l':
        s += SC.glass_front(I, xr=(5, 14), yr=(5, 10), zone=True, pane_x=True)
    return s

def mk(I, *pt):
    return I.pct(*pt)

# --------------------------------------------------------------------------- mould and dampness (bedroom x0-5 y5-10)
def mould():
    I = iso_for('mould')
    s = base(I, 'm', 1)
    heat = (f'<g transform="{I.fm(.01)}"><g class="tw-heatp" clip-path="url(#tw-zfl1)">' + rect(0, 5, 5, 5, '#2F6FE0', 'opacity=".24"')
            + '<circle cx="2.8" cy="7.6" r="2.6" fill="url(#tw-hc)"/><circle cx=".2" cy="9.4" r="1.6" fill="url(#tw-hy)"/><circle cx=".1" cy="5.2" r="1.9" fill="url(#tw-hr)"/><circle cx="1.0" cy="6.0" r="1.2" fill="url(#tw-ho)"/></g></g>')
    s.append(heat)
    layers, pcss = SC.people_layers(I, 'zm')
    s.append(SC.through(I, 'tw-zo1', 'y5', 0, 5, 'k', layers))
    s.append(SC.wall(I, 'x0', 5, 10, zone=True) + SC.wall(I, 'y5', 0, 5, zone=True) + SC.x0_fittings(I, True) + SC.y5_m(I, True))
    s.append(''.join(f'<g transform="translate({I.p(0, 5.15, 2.4)[0]},{I.p(0, 5.15, 2.4)[1]})"><path class="tw-out" style="--dl:-{k * .8:.1f}s" d="M-12 6l12-12 12 12" fill="none" stroke="#7FB8F0" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>' for k in range(3)))
    s.append(ping(I, 0, 7.95, 1.44))
    s.append(SC.m_items(I, True) + layers.get('m', ''))
    s.append(finish(I, 'm'))
    sx, sy = I.p(0, 7.95, 1.44)
    chart = ('<path d="M0 96H220" stroke="#21507A" stroke-width="1.5"/><path d="M0 44H220" stroke="#EF4B3C" stroke-opacity=".7" stroke-width="1.5" stroke-dasharray="5 5"/>'
             '<path class="tw-chart" pathLength="1" d="M0 92C20 90 30 84 50 80S80 70 100 62S140 54 160 44S200 30 220 26" fill="none" stroke="#3FD8F0" stroke-width="3" stroke-linecap="round"/>'
             '<text x="0" y="116" font-size="11" fill="#8FDDEB">1 h</text><text x="220" y="116" font-size="11" fill="#8FDDEB" text-anchor="end">7 days</text><text x="220" y="38" font-size="10.5" fill="#F59A3C" text-anchor="end">growth threshold</text>')
    ty = I.p(0, 5.15, 2.4)[1] - 70
    s.append(stream(f'M{sx} {sy}C{sx - 40} {ty} 1150 {ty} 1290 {250 + HUD_DY}', 0))
    s.append(holo(1290, 150, 272, 244, 'MOULD FORECAST', f'<g transform="translate(1312,206)">{chart}</g>'
                  + '<text x="1310" y="372" font-size="12" fill="#A9E7F2">R² <tspan font-weight="700" fill="#FFFFFF">0.999</tspan> at 1 h · <tspan font-weight="700" fill="#FFFFFF">0.896</tspan> at 7 d</text>', .5))
    rows = [('Window glass', '9.8 °C', '96 %', '#EF4B3C'), ('Cold corner', '12.1 °C', '88 %', '#F59A3C'), ('Room air', '19.5 °C', '64 %', '#38C77A')]
    s.append(holo(1290, 420, 272, 206, 'SURFACE TWIN', ''.join(
        f'<text x="1310" y="{488 + i * 46}" font-size="12" fill="#A9E7F2">{a}</text><text x="1310" y="{507 + i * 46}" font-size="14" font-weight="700" fill="#FFFFFF">{t}<tspan fill="#8FDDEB" font-weight="500"> · RH </tspan>{rh}</text>'
        + f'<rect class="tw-tbar2" style="--dl:-{i}s" x="1478" y="{494 + i * 46}" width="56" height="8" rx="4" fill="{c}"/>' for i, (a, t, rh, c) in enumerate(rows)), .8))
    markers = [mk(I, 0, 9.2, 1.4), mk(I, 0, 5.6, 2.15), mk(I, 1.0, 5.63, .7), mk(I, 0, 7.95, 1.44)]
    return '\n'.join(s) + '\n', markers, pcss

# --------------------------------------------------------------------------- thermal comfort (living room x5-14 y5-10)
def comfort():
    I = iso_for('comfort')
    s = base(I, 'l', 2)
    s.append(f'<g transform="{I.fm(.005)}"><g class="tw-sunpatch"><polygon points="13.9,5.6 13.9,9.9 10.6,9.9 11.8,5.6" fill="#FFE6AF" opacity=".32"/><polygon points="13.9,9.9 6.0,9.9 7.2,8.4 13.0,8.4" fill="#FFE6AF" opacity=".22"/></g></g>')
    layers, pcss = SC.people_layers(I, 'zl')
    s.append(SC.through(I, 'tw-zo2', 'y5', 5, 9.3, 'k', layers) + SC.through(I, 'tw-zo3', 'y5', 9.3, 14, 'r', layers) + SC.through(I, 'tw-zo4', 'x5', 5, 10, 'm', layers))
    s.append(SC.wall(I, 'y5', 5, 14, zone=True) + SC.wall(I, 'x5', 5, 10, zone=True) + SC.y5_l(I, True))
    tx, ty = I.p(11.6, 5.15, 1.01)
    st = ''.join(f'<g class="tw-st" style="--dl:{dl}s"><rect x="{tx - 60}" y="{ty - 104}" width="120" height="48" rx="12" fill="#08182C" fill-opacity=".92" stroke="{CY}" stroke-opacity=".6"/>'
                 f'<text x="{tx - 44}" y="{ty - 84}" font-size="11" fill="#8FDDEB" letter-spacing="1">{who}</text><text x="{tx - 44}" y="{ty - 64}" font-size="16" font-weight="700" fill="#FFFFFF">{t}</text></g>'
                 for who, t, dl in [('SARAH · 34', '21.5 °C', 0), ('JAMES · 37', '20.0 °C', -6), ('MAYA · 7', '22.5 °C', -3)])
    s.append(st + f'<line x1="{tx}" y1="{ty - 10}" x2="{tx}" y2="{ty - 56}" stroke="{CY}" stroke-opacity=".6" stroke-width="1.5" stroke-dasharray="4 4"/>')
    s.append(SC.l_items(I, True) + layers.get('l', ''))
    s.append(shadow(I, 14.45, 6.0, .45, 1.0) + heatpump(I, 14.45, 6.0, w=.45, d=1.0, h=.8, face='+x') + finish(I, 'l'))
    sg = I.p(15.6, 9.2, .3)    # outside the sunlit glass, on the ground
    s.append(f'<g class="tw-hin" style="--hd:.9s"><g class="tw-hud"><rect x="{sg[0] - 64}" y="{sg[1] - 30}" width="128" height="28" rx="14" fill="#08182C" fill-opacity=".9" stroke="#F2A541" stroke-opacity=".8"/>'
             f'<text x="{sg[0]}" y="{sg[1] - 11}" font-size="12" font-weight="700" fill="#FFD9A0" text-anchor="middle" letter-spacing="1">SOLAR GAIN ↑</text></g></g>')
    occ = ''.join(f'<text x="1312" y="{222 + i * 32}" font-size="12" fill="#A9E7F2">{who}</text><rect x="1408" y="{213 + i * 32}" width="132" height="8" rx="4" fill="#21507A"/>'
                  f'<g class="tw-pmv2" style="--dl:-{i * 1.7:.1f}s"><circle cx="{1462 + i * 8}" cy="{217 + i * 32}" r="6.5" fill="#FFFFFF" stroke="{CY}" stroke-width="2"/></g>' for i, who in enumerate(['Sarah', 'James', 'Maya']))
    xai = ''.join(f'<text x="1312" y="{354 + i * 26}" font-size="12" fill="#A9E7F2">{a}</text><rect class="tw-xai" style="--dl:-{i * .9:.1f}s" x="1420" y="{345 + i * 26}" width="{w}" height="9" rx="4.5" fill="{c}"/>'
                  for i, (a, w, c) in enumerate([('Solar gain', 110, '#F2A541'), ('Clothing', 74, '#3FD8F0'), ('Activity', 52, '#38C77A')]))
    s.append(holo(1290, 150, 272, 290, 'PERSONAL COMFORT', '<text x="1408" y="204" font-size="10.5" fill="#8FDDEB">cool</text><text x="1540" y="204" font-size="10.5" fill="#8FDDEB" text-anchor="end">warm</text>'
                  + occ + '<text x="1312" y="326" font-size="11" font-weight="700" letter-spacing="1.6" fill="#7FE3F5">WHY · EXPLAINABLE AI</text>' + xai, .5))
    markers = [mk(I, 11.6, 5.15, 1.01), mk(I, 5.62, 7.4, 1.85), mk(I, 14, 8.6, 1.3), mk(I, 12.8, 5.25, .78)]
    return '\n'.join(s) + '\n', markers, pcss

# --------------------------------------------------------------------------- thermal resilience (bedroom x9-14 y0-5)
def resilience():
    I = iso_for('resilience')
    s = base(I, 'r', 3)
    heat = (f'<g transform="{I.fm(.01)}"><g clip-path="url(#tw-zfl3)">' + rect(9, 0, 5, 5, '#38C77A', 'opacity=".18"') + '<circle cx="11.5" cy="3.6" r="2.2" fill="url(#tw-hc)"/>'
            + '<g class="tw-heatlvl2 tw-sync">' + rect(9, 0, 5, 5, '#F59A3C', 'opacity=".28"') + '<circle cx="13.2" cy=".6" r="2.4" fill="url(#tw-hr)"/><circle cx="11.2" cy="1.3" r="2.0" fill="url(#tw-ho)"/><circle cx="12.6" cy="3.4" r="1.6" fill="url(#tw-hy)"/></g></g></g>')
    s.append(heat)
    layers, pcss = SC.people_layers(I, 'zr')
    s.append(SC.through(I, 'tw-zo5', 'x9', 0, 5, 'k', layers))
    s.append(SC.wall(I, 'y0', 9, 14, zone=True) + SC.wall(I, 'x9', 0, 5, zone=True) + SC.y0_r(I, True) + SC.x9_fittings(I, True))
    s.append(f'<g transform="{I.fm(.006)}"><g class="tw-beam tw-sync"><polygon points="12.5,0.12 13.8,0.12 13.3,3.0 11.7,3.0" fill="#FFB45A" opacity=".3"/></g></g>')
    s.append(SC.r_items(I, True) + layers.get('r', ''))
    s.append(f'<g class="tw-recover tw-sync"><g transform="translate({I.p(10.05, .37, .56)[0]},{I.p(10.05, .37, .56)[1] - 34})"><g class="tw-spin" style="--d:1.2s">'
             + path('M-13 0a13 13 0 1 1 4 9', 'none', f'stroke="{CY}" stroke-width="4" stroke-linecap="round"') + poly([(-16, 4), (-6, 14), (-17, 15)], CY) + '</g></g></g>')
    s.append(finish(I, 'r'))
    # the outage itself: flicker, dimmed room, banner and restoration flash (in step with the outside view)
    s.append(rect(0, 0, CW, CH, '#FF8A2A', 'class="tw-hot tw-sync"') + rect(0, 0, CW, CH, '#03080F', 'class="tw-dim tw-sync"') + rect(0, 0, CW, CH, '#E9FFF4', 'class="tw-restore tw-sync"'))
    hours = ''.join(f'<text x="0" y="{i * 30}" font-size="15" font-weight="700" fill="#FFFFFF">HOUR {h}</text>' for i, h in enumerate([0, 6, 12, 18, 24]))
    bolt = 'M0 -10L-6 2H-1L-3 10L6 -3H1Z'
    s.append('<g class="tw-hin" style="--hd:.3s">'
             '<g class="tw-on2 tw-sync"><rect x="680" y="22" width="240" height="40" rx="20" fill="#0B2A1E" fill-opacity=".92" stroke="#38E08A" stroke-width="1.6"/>'
             f'<g transform="translate(708,42)"><path d="{bolt}" fill="#38E08A"/></g><text x="726" y="47" font-size="14" font-weight="700" letter-spacing="1.6" fill="#BFFFD9">GRID POWER ON</text></g>'
             '<g class="tw-off2 tw-sync"><rect x="640" y="22" width="320" height="40" rx="20" fill="#2A0E0E" fill-opacity=".94" stroke="#FF6B5B" stroke-width="1.8"/>'
             f'<g transform="translate(668,42)" class="tw-blink"><path d="{bolt}" fill="#FF6B5B"/><path d="M-9 9L9 -9" stroke="#FF6B5B" stroke-width="2.4"/></g>'
             '<text x="688" y="47" font-size="14" font-weight="700" letter-spacing="1.6" fill="#FFD3CC">POWER OUTAGE</text>'
             '<svg x="842" y="28" width="104" height="28" viewBox="0 -21 104 28" overflow="hidden"><g class="tw-hours tw-sync">' + hours + '</g></svg></g>'
             '<g class="tw-rest tw-sync"><rect x="660" y="22" width="280" height="40" rx="20" fill="#0B2A1E" fill-opacity=".94" stroke="#38E08A" stroke-width="2.4"/>'
             f'<g transform="translate(688,42)"><path d="{bolt}" fill="#38E08A"/></g><text x="706" y="47" font-size="14" font-weight="700" letter-spacing="1.6" fill="#BFFFD9">POWER RESTORED</text></g></g>')
    temps = ['26.0', '27.6', '29.3', '30.9', '32.4', '33.8']
    roll = ''.join(f'<text x="0" y="{i * 40}" font-size="34" font-weight="700" fill="#FFFFFF">{t}<tspan font-size="18" dx="3" fill="#8FDDEB">°C</tspan></text>' for i, t in enumerate(temps))
    body = ('<text x="1310" y="214" font-size="12" fill="#A9E7F2">Indoor temperature</text>'
            '<svg x="1310" y="222" width="220" height="46" viewBox="0 -34 220 46" overflow="hidden"><g class="tw-roll tw-sync">' + roll + '</g></svg>'
            + rect(1310, 282, 232, 10, '#21507A', 'rx="5"') + '<g class="tw-tbar tw-sync">' + rect(1310, 282, 232, 10, '#F59A3C', 'rx="5"') + '</g>'
            '<text x="1310" y="310" font-size="11" fill="#8FDDEB">safe</text><text x="1542" y="310" font-size="11" fill="#8FDDEB" text-anchor="end">overheating</text>'
            '<text x="1310" y="342" font-size="12.5" font-weight="700" fill="#FFFFFF">+72.1 % passive survivability</text>')
    s.append(holo(1290, 150, 272, 216, 'HEATWAVE TWIN', body, .5))
    markers = [mk(I, 13.35, 3.95, 2.15), mk(I, 13.15, 0, 1.7), mk(I, 12.0, 1.0, .62), mk(I, 10.05, .37, .58)]
    return '\n'.join(s) + '\n', markers, pcss
