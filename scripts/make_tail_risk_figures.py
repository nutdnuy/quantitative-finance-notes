"""Deterministic charts for the VaR/ES lesson; no market data or image model."""
import math
from pathlib import Path
from statistics import NormalDist, stdev

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/images'
NORMAL = NormalDist()
PURPLE, TEAL, GRAY = '#6200ee', '#008577', '#64646b'


def text(x, y, label, size=18, color='#232326', anchor='start'):
    return f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" text-anchor="{anchor}">{label}</text>'


def line(x1, y1, x2, y2, color='#dddddf', dash=''):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="2" stroke-dasharray="{dash}"/>'


def poly(points, color, width=3):
    coords = ' '.join(f'{x:.3f},{y:.3f}' for x, y in points)
    return f'<polyline points="{coords}" fill="none" stroke="{color}" stroke-width="{width}"/>'


def save(name, title, description, body, height=510):
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="{height}" viewBox="0 0 1000 {height}" role="img" aria-labelledby="title desc">
<title id="title">{title}</title><desc id="desc">{description}</desc>
<rect width="1000" height="{height}" fill="white"/>
<g font-family="Arial, sans-serif">{text(40, 48, title, 28)}{body}</g></svg>'''
    (OUT / name).write_text(svg)
    print(name)


def normal_chart():
    x = lambda v: 80 + (v + 4) * 105
    y = lambda v: 400 - v * 700
    z, es = NORMAL.inv_cdf(.99), NORMAL.pdf(NORMAL.inv_cdf(.99)) / .01
    body = text(40, 81, 'Normal loss: mean 0, SD 1 · confidence 99%', 18, GRAY)
    for v in [0, .1, .2, .3, .4]:
        body += line(80, y(v), 920, y(v)) + text(66, y(v)+6, f'{v:.1f}', 16, GRAY, 'end')
    body += text(80, 109, 'Density', 16, GRAY)
    tail = [(x(z), y(0))] + [(x(z+(4-z)*i/100), y(NORMAL.pdf(z+(4-z)*i/100))) for i in range(101)] + [(x(4), y(0))]
    body += f'<polygon points="{" ".join(f"{a:.3f},{b:.3f}" for a,b in tail)}" fill="#d8eee9"/>'
    body += poly([(x(-4+i/50), y(NORMAL.pdf(-4+i/50))) for i in range(401)], PURPLE)
    for v in range(-4, 5):
        body += text(x(v), 431, str(v), 16, GRAY, 'middle')
    body += line(x(z), 170, x(z), 400, TEAL, '6 5') + line(x(es), 220, x(es), 400, PURPLE, '3 4')
    body += text(x(z)-15, 152, f'VaR = {z:.3f}', 19, TEAL, 'end')
    body += text(x(es)+16, 209, f'ES = {es:.3f}', 19, PURPLE)
    body += text(920, 474, 'Loss (SD units) →', 18, GRAY, 'end')
    body += text(80, 474, 'Tail probability = 1% beyond VaR', 18, GRAY)
    save('tail-risk-normal.svg', 'VaR marks the tail; ES averages its losses', 'Calculated standard Normal density, VaR 2.32635 and ES 2.66521. Shaded right tail.', body)


def qq_chart():
    q = [NORMAL.inv_cdf((i+.5)/201) for i in range(201)]
    s = stdev(q)
    normal = [v/s for v in q]
    heavy = [v+.15*v**3 for v in q]
    heavy = [v/stdev(heavy) for v in heavy]
    x = lambda v: 120 + (v+3)*125
    y = lambda v: 422 - (v+5)*31
    body = text(40, 82, '201 deterministic quantiles per series · sample SD = 1 for both', 18, GRAY)
    for v in [-4, -2, 0, 2, 4]:
        body += line(120, y(v), 870, y(v)) + text(101, y(v)+5, str(v), 16, GRAY, 'end')
    body += text(120, 102, 'Standardized observation', 16, GRAY)
    body += poly([(x(-3), y(-3)), (x(3), y(3))], '#9b9ba2', 2)
    for values, color in [(normal, TEAL), (heavy, PURPLE)]:
        for a, b in zip(q, values):
            body += f'<circle cx="{x(a):.3f}" cy="{y(b):.3f}" r="2.5" fill="{color}"/>'
    for v in [-3, -2, -1, 0, 1, 2, 3]:
        body += text(x(v), 448, str(v), 16, GRAY, 'middle')
    body += text(870, 484, 'Theoretical Normal quantile', 18, GRAY, 'end')
    body += text(145, 130, 'Normal quantiles', 18, TEAL)
    body += text(145, 157, 'Rescaled z + 0.15z³', 18, PURPLE)
    save('tail-risk-qq.svg', 'Equal variance does not imply equal tails', 'Q-Q comparison of standardized deterministic Normal quantiles with a rescaled cubic transform, not market observations.', body)


def exception_chart():
    body = text(40, 82, 'Illustrative losses only · 60 days per panel · assumed threshold = 5 units', 18, GRAY)
    x = lambda v: 100 + (v-1)*14
    for offset, days, label in [(0, [10,30,50], 'A · 3 exceptions, separated'), (232, [29,30,31], 'B · 3 exceptions, clustered')]:
        y = lambda v: 290+offset-v*17
        body += text(60, 121+offset, label, 21)
        for v in [0, 5, 8]:
            body += line(100,y(v),926,y(v)) + text(84,y(v)+5,str(v),16,GRAY,'end')
        body += line(100,y(5),926,y(5),TEAL,'6 5')
        values = [(day, 7 if day in days else 1.2+1.8*math.sin(day*1.7)) for day in range(1,61)]
        body += poly([(x(a),y(b)) for a,b in values], PURPLE, 2)
        for day in days:
            body += f'<circle cx="{x(day)}" cy="{y(7)}" r="5" fill="{PURPLE}"/>'
        for day in [1,10,20,30,40,50,60]:
            body += text(x(day),321+offset,str(day),16,GRAY,'middle')
    body += text(60, 591, 'Loss (units) · dashed line = assumed VaR threshold',18,GRAY)
    body += text(926, 591, 'Day',18,GRAY,'end')
    save('tail-risk-exceptions.svg', 'The same count can hide a different time pattern', 'Two constructed 60-day series have three exceptions each. One has dispersed exceptions, one has consecutive exceptions. This is not a calibrated backtest.', body, 620)


if __name__ == '__main__':
    normal_chart()
    qq_chart()
    exception_chart()
