"""Original computed lesson charts. Synthetic inputs; no image generator.

QuantCorner / QuantSeras light theme, no-image-generator route. These charts
are data plots, not flow diagrams. Local Roboto is embedded for offline use.
"""
import base64
import html
import math
from pathlib import Path
from exotic_options_math import EXAMPLE_PATHS, path_payoffs, coupon_bond_value

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'assets/images'
PURPLE, TEAL, INK, GRAY, GRID = '#6200ee', '#008577', '#232326', '#64646b', '#dedee3'


def text(x, y, label, size=18, color=INK, anchor='start', weight=400):
    return (f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" '
            f'text-anchor="{anchor}" font-weight="{weight}">{html.escape(str(label))}</text>')


def line(x1, y1, x2, y2, color=GRID, width=1.5, dash=''):
    return (f'<line x1="{x1:.3f}" y1="{y1:.3f}" x2="{x2:.3f}" y2="{y2:.3f}" '
            f'stroke="{color}" stroke-width="{width}" stroke-dasharray="{dash}"/>')


def poly(points, color, width=3, dash=''):
    coords = ' '.join(f'{x:.3f},{y:.3f}' for x, y in points)
    return f'<polyline points="{coords}" fill="none" stroke="{color}" stroke-width="{width}" stroke-dasharray="{dash}"/>'


def dot(x, y, color, radius=5, fill=None):
    return f'<circle cx="{x:.3f}" cy="{y:.3f}" r="{radius}" fill="{fill or color}" stroke="{color}" stroke-width="2"/>'


def save(name, title, description, body, height):
    font = base64.b64encode((ROOT/'assets/fonts/roboto-latin-400-normal.woff2').read_bytes()).decode()
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="{height}" viewBox="0 0 1000 {height}" role="img" aria-labelledby="title desc">
<title id="title">{html.escape(title)}</title><desc id="desc">{html.escape(description)}</desc>
<defs><style>@font-face{{font-family:Roboto;src:url(data:font/woff2;base64,{font}) format('woff2');font-weight:400;}}</style></defs>
<rect width="1000" height="{height}" fill="#fff"/>
<g font-family="Roboto,Arial,sans-serif">{text(40, 48, title, 28)}{body}</g></svg>'''
    (OUT/name).write_text(svg)
    print(name)


def path_chart():
    body = text(40, 81, 'Two constructed paths · K = 100 · upper barrier H = 130 · amounts per option', 17, GRAY)
    x, y = lambda i: 105+196*i, lambda price: 394-(price-80)*3.8
    for price in [80, 100, 120, 140]:
        body += line(x(0), y(price), x(4), y(price))+text(88, y(price)+6, price, 16, GRAY, 'end')
    body += text(105, 129, 'Asset price', 16, GRAY)
    body += line(x(0), y(130), x(4), y(130), GRAY, 2, '7 6')
    body += text(x(4), y(130)-11, 'H = 130', 17, GRAY, 'end')
    for label, path, color, dash in [('A', EXAMPLE_PATHS[0], PURPLE, ''), ('B', EXAMPLE_PATHS[1], TEAL, '8 5')]:
        body += poly([(x(i), y(v)) for i, v in enumerate(path)], color, 3.5, dash)
        for i, value in enumerate(path):
            body += dot(x(i), y(value), color, 5 if label == 'A' else 3)
    body += text(x(1)+15, y(110)+25, 'A', 21, PURPLE)
    body += text(x(1)+15, y(140)-6, 'B', 21, TEAL)
    body += text(x(4)+17, y(110)+6, '110', 18)
    for i in range(5):
        body += text(x(i), 422, 'S₀' if i == 0 else str(i), 17, GRAY, 'middle')
    body += text(889, 452, 'Observation index', 16, GRAY, 'end')
    body += text(105, 485, 'Fixings 1–4 only; S₀ excluded from the Asian average.', 17, GRAY)
    cols = [105, 390, 575, 735, 895]
    for xc, label in zip(cols, ['Path', 'Arithmetic average', 'Vanilla call', 'Asian call', 'Up-and-out']):
        body += text(xc, 531, label, 17, GRAY, 'start' if xc == 105 else 'end')
    body += line(105, 544, 895, 544)
    for row, path, color in [(0, EXAMPLE_PATHS[0], PURPLE), (1, EXAMPLE_PATHS[1], TEAL)]:
        p = path_payoffs(path)
        yy = 578+41*row
        for xc, value in zip(cols, ['A — solid' if row == 0 else 'B — dashed', f'{p["arithmetic"]:.1f}', f'{p["vanilla"]:g}', f'{p["asian"]:g}', f'{p["out_discrete"]:g}']):
            body += text(xc, yy, value, 20, color if xc == 105 else INK, 'start' if xc == 105 else 'end')
    body += text(105, 660, 'Payoffs at expiry, before premium or discounting. Zero barrier rebate.', 17, GRAY)
    save('exotic-path-payoffs.svg', 'Same terminal price, different contractual payoffs',
         'Two synthetic five-point paths both end at 110. Path A has arithmetic average 112.5, '
         'vanilla payoff 10, Asian payoff 12.5, and up-and-out payoff 10. Path B has average '
         '110, vanilla payoff 10, Asian payoff 10, and up-and-out payoff 0 after hitting 140.', body, 690)


def monitoring_chart():
    prices = [100, 110, 125, 138, 118, 111, 106, 113, 110]
    x, y = lambda i: 105+98*i, lambda price: 371-(price-90)*4
    body = text(40, 81, 'One constructed continuous path · nested observation dates · H = 130 · zero rebate', 17, GRAY)
    for price in [90, 100, 110, 120, 130, 140]:
        body += line(x(0), y(price), x(8), y(price))+text(88, y(price)+5, price, 16, GRAY, 'end')
    body += text(105, 127, 'Asset price', 16, GRAY)
    body += line(x(0), y(130), x(8), y(130), GRAY, 2, '7 6')
    body += text(x(8), y(130)-11, 'H = 130', 17, GRAY, 'end')
    body += poly([(x(i), y(value)) for i, value in enumerate(prices)], PURPLE, 3.5)
    for i in [0, 2, 4, 6, 8]:
        body += dot(x(i), y(prices[i]), TEAL, 6, '#fff')
    body += dot(x(3), y(prices[3]), PURPLE, 5)
    body += text(x(3)+20, y(138)-10, '138: missed by quarterly dates', 18, PURPLE)
    for i in [0, 2, 4, 6, 8]:
        body += text(x(i), 401, f'{i/8:g}', 16, GRAY, 'middle')
    body += text(889, 432, 'Time (years)', 16, GRAY, 'end')
    body += dot(114, 457, TEAL, 6, '#fff')+text(134, 463, 'Quarterly observations', 17, TEAL)
    body += text(105, 510, 'Monitoring rule', 17, GRAY)+text(630, 510, 'Barrier hit?', 17, GRAY, 'end')+text(895, 510, 'Call payoff', 17, GRAY, 'end')
    body += line(105, 524, 895, 524)
    for yy, label, stride in [(557, 'S₀ and maturity', 8), (594, 'Quarterly (S₀ + 4 dates)', 2), (631, 'Every eighth-year (S₀ + 8 dates)', 1)]:
        hit = any(p >= 130 for p in prices[::stride])
        payoff = 0 if hit else max(prices[-1]-100, 0)
        body += text(105, yy, label, 18)+text(630, yy, 'Yes' if hit else 'No', 18, INK, 'end')+text(895, yy, payoff, 20, INK, 'end')
    body += text(105, 679, 'Continuous monitoring also detects the crossing; its payoff is 0.', 17, GRAY)
    body += text(105, 705, 'Illustration uses straight segments; sampled GBM endpoints do not reveal the full path.', 17, GRAY)
    save('exotic-monitoring.svg', 'A barrier can be crossed between observation dates',
         'A synthetic continuous piecewise-linear path crosses 130 between quarterly dates. '
         'Nested monitoring with endpoints only and quarterly dates misses the crossing. '
         'Monitoring every eighth-year and continuous monitoring detect it. This is an '
         'illustration, not Monte Carlo convergence evidence.', body, 735)


def cashflow_chart():
    x, y = lambda t: 105+784*t, lambda v: 392-(v-97)*48
    before = coupon_bond_value(.5)
    after = coupon_bond_value(.5, after_payment=True)
    assert math.isclose(before-after, 4)
    body = text(40, 81, 'Deterministic claim · coupon 4 at t = 0.5 · principal 100 at T = 1 · r = 3% a year', 17, GRAY)
    for value in [97, 98, 99, 100, 101, 102]:
        body += line(x(0), y(value), x(1), y(value))+text(88, y(value)+5, value, 16, GRAY, 'end')
    body += text(105, 126, 'Claim value (currency units)', 16, GRAY)
    left = [(i/200, coupon_bond_value(i/200)) for i in range(101)]
    right = [(.5+i/200, coupon_bond_value(.5+i/200, after_payment=True)) for i in range(101)]
    body += poly([(x(t), y(v)) for t, v in left], PURPLE, 3.5)
    body += poly([(x(t), y(v)) for t, v in right], PURPLE, 3.5)
    body += line(x(.5), y(before), x(.5), y(after), TEAL, 2.5, '5 5')
    body += dot(x(.5), y(before), PURPLE, 5, '#fff')+dot(x(.5), y(after), PURPLE, 5)
    body += text(x(.5)+18, y(before)-10, f'Before: {before:.4f}', 18, PURPLE)
    body += text(x(.5)+18, y(after)+24, f'After: {after:.4f}', 18, PURPLE)
    body += text(x(.5)+18, (y(before)+y(after))/2, 'Coupon paid: 4', 19, TEAL)
    for t in [0, .25, .5, .75, 1]:
        body += text(x(t), 424, f'{t:g}', 16, GRAY, 'middle')
    body += text(889, 457, 'Time (years); value shown just before principal repayment at T', 16, GRAY, 'end')
    body += text(105, 507, 'At the payment instant', 22)
    body += text(105, 548, f'{before:.4f} = {after:.4f} + 4.0000', 28)
    body += text(105, 589, 'Value before = value after + cash received by the holder.', 18, GRAY)
    body += text(105, 620, 'The ex-coupon claim drops; adding the received cash removes that jump.', 18, GRAY)
    save('exotic-cashflow-jump.svg', 'A cash payment creates a jump in the claim value',
         f'Computed deterministic values for a claim paying 4 at year 0.5 and 100 at year 1, '
         f'discounted at continuously compounded 3 percent. At the coupon date value changes '
         f'from {before:.6f} to {after:.6f}. The drop of 4 equals the cash received. '
         'The final principal-payment jump is not shown.', body, 650)


if __name__ == '__main__':
    path_chart()
    monitoring_chart()
    cashflow_chart()
