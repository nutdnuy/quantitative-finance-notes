"""Calculated, editable SVG charts for the ARCH/GARCH lesson.

Visual route: no-image-generator. QuantCorner/QuantSeras light book palette.
All inputs are explicit hypothetical daily return parameters, not market data.
"""
import math
from pathlib import Path
from make_tail_risk_figures import GRAY, PURPLE, TEAL, line, poly, text
from volatility_models_math import (ALPHA, BETA, EXAMPLE_SHOCK, INITIAL_VARIANCE,
                                   OMEGA, garch_update, gjr_update,
                                   persistence_half_life, variance_forecast,
                                   verify_examples)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'assets/images'


def save(name, title, description, body, height=570):
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="{height}" viewBox="0 0 1000 {height}" role="img" aria-labelledby="title desc">
<title id="title">{title}</title><desc id="desc">{description}</desc>
<rect width="1000" height="{height}" fill="white"/>
<g font-family="Roboto, Arial, sans-serif">{text(40, 48, title, 28)}{body}</g></svg>'''
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT/name).write_text(svg, encoding='utf-8')
    print(name)


def update_chart():
    first = garch_update(EXAMPLE_SHOCK, INITIAL_VARIANCE)
    # Multiply decimal-return variances by 10,000 for percentage-point squared.
    values = [OMEGA*10000, ALPHA*EXAMPLE_SHOCK**2*10000,
              BETA*INITIAL_VARIANCE*10000, first*10000]
    body = text(40, 82, 'Hypothetical daily inputs: current SD = 1%, shock = −3%', 18, GRAY)
    y = lambda value: 401-value*148
    body += text(85, 116, 'Variance (percentage-point squared, %²)', 17, GRAY)
    for value in [0, .5, 1, 1.5]:
        body += line(90, y(value), 930, y(value))
        body += text(76, y(value)+6, f'{value:.1f}', 16, GRAY, 'end')
    centers = [195, 400, 605, 820]
    colors = [GRAY, PURPLE, TEAL, '#3700b3']
    names = [('Intercept', 'ω'), ('New shock', 'αe²'), ('Previous variance', 'βh'), ('Next variance', 'h(next)')]
    for center, value, color, labels in zip(centers, values, colors, names):
        body += f'<rect x="{center-59}" y="{y(value):.3f}" width="118" height="{401-y(value):.3f}" fill="{color}"/>'
        body += text(center, y(value)-13, f'{value:.2f}', 23, color, 'middle')
        body += text(center, 433, labels[0], 17, GRAY, 'middle')
        body += text(center, 459, labels[1], 19, color, 'middle')
    body += text(90, 508, '0.05 + 0.72 + 0.87 = 1.64 %²', 22)
    body += text(930, 508, f'Next daily SD = √1.64 = {100*math.sqrt(first):.4f}%', 21, PURPLE, 'end')
    body += text(90, 544, 'Variance contributions add; standard deviations do not.', 17, GRAY)
    save('arch-update.svg', 'GARCH updates variance one observation at a time',
         'Calculated hypothetical GARCH update with omega 0.000005, alpha 0.08, beta 0.87, current variance 0.0001 and shock minus 0.03. Contributions 0.05, 0.72, 0.87 percentage-point squared sum to 1.64. Next daily standard deviation is 1.2806 percent.', body)


def forecast_chart():
    first, long_run = .000164, .0001
    body = text(40, 82, 'Same first forecast and long-run variance for all three curves · hypothetical', 18, GRAY)
    body += text(90, 116, 'Daily forecast SD (%) = 100√E[h]', 17, GRAY)
    x = lambda step: 90+(step-1)*840/59
    y = lambda sd: 438-(sd-1)*865
    for sd in [1, 1.1, 1.2, 1.3]:
        body += line(90, y(sd), 930, y(sd))
        body += text(76, y(sd)+6, f'{sd:.1f}', 16, GRAY, 'end')
    colors = [TEAL, PURPLE, GRAY]
    for rho, color in zip([.80, .95, .99], colors):
        points = [(x(step), y(100*math.sqrt(h)))
                  for step, h in enumerate(variance_forecast(first, long_run, rho, 60), 1)]
        curve = poly(points, color, 3)
        if rho != .95:
            curve = curve.replace('fill="none"', f'fill="none" stroke-dasharray="{"4 5" if rho == .8 else "10 5"}"')
        body += curve
    body += line(90, y(1), 930, y(1), '#232326', '4 5')
    body += text(90, 500, 'Dotted baseline: long-run daily SD = 1%', 17, GRAY)
    for rho, color, position in zip([.80, .95, .99], colors, [280, 500, 720]):
        body += line(position, 151, position+32, 151, color, '4 5' if rho == .80 else ('10 5' if rho == .99 else ''))
        body += text(position+43, 157, f'ρ = {rho:.2f}', 18, color)
    body += f'<circle cx="{x(1)}" cy="{y(100*math.sqrt(first)):.3f}" r="5" fill="{PURPLE}"/>'
    body += text(108, 188, '1.2806% at k = 1', 17, PURPLE)
    for step in [1, 10, 20, 30, 40, 50, 60]:
        body += text(x(step), 468, str(step), 16, GRAY, 'middle')
    body += text(930, 500, 'Forecast horizon k (days)', 18, GRAY, 'end')
    body += text(90, 532, 'Half-life of variance excess:', 17, GRAY)
    body += text(355, 532, ' · '.join(f'ρ {rho:.2f}: {persistence_half_life(rho):.2f} days' for rho in [.8, .95, .99]), 17)
    body += text(90, 568, 'These are square roots of expected variances, not expected future SDs.', 17, GRAY)
    save('arch-forecast.svg', 'Persistence determines how slowly forecast risk declines',
         'Calculated 60-day forecasts start at variance 0.000164 and share long-run variance 0.0001. The y axis is daily forecast standard deviation in percent, not annualized. Persistence values 0.80, 0.95 and 0.99 yield variance-excess half-lives of 3.11, 13.51 and 68.97 days.', body, 590)


def news_impact_chart():
    body = text(40, 82, 'Same current variance h = 0.0001 · both persistence values = 0.95 under symmetric shocks', 18, GRAY)
    body += text(90, 116, 'Next variance (%²)', 17, GRAY)
    x = lambda shock_pct: 90+(shock_pct+4)*105
    y = lambda variance: 438-variance*92
    for variance in [0, 1, 2, 3]:
        body += line(90, y(variance), 930, y(variance))
        body += text(76, y(variance)+6, f'{variance:.0f}', 16, GRAY, 'end')
    body += line(x(0), 148, x(0), 438, '#9b9ba2', '4 5')
    for calculate, color in [(garch_update, PURPLE), (gjr_update, TEAL)]:
        body += poly([(x(s), y(10000*calculate(s/100, INITIAL_VARIANCE)))
                      for s in [-4+i*.025 for i in range(321)]], color, 3)
    body += text(605, 152, 'GARCH: α = 0.08, β = 0.87', 18, PURPLE)
    body += text(605, 181, 'GJR: α = 0.03, γ = 0.10, β = 0.87', 18, TEAL)
    for shock, calculate, color, tx, ty, anchor in [
        (-3, gjr_update, TEAL, 195, 222, 'middle'),
        (-3, garch_update, PURPLE, 215, 288, 'start'),
        (3, garch_update, PURPLE, 825, 264, 'middle'),
        (3, gjr_update, TEAL, 825, 359, 'middle'),
    ]:
        value = 10000*calculate(shock/100, INITIAL_VARIANCE)
        body += f'<circle cx="{x(shock)}" cy="{y(value):.3f}" r="5" fill="{color}"/>'
        body += text(tx, ty, f'{value:.2f}', 20, color, anchor)
    for shock in [-4, -3, -2, -1, 0, 1, 2, 3, 4]:
        body += text(x(shock), 468, str(shock), 16, GRAY, 'middle')
    body += text(930, 505, 'Observed shock e (%)', 18, GRAY, 'end')
    body += text(90, 505, 'At ±3%: GARCH 1.64 / 1.64 · GJR 2.09 / 1.19 %²', 18)
    body += text(90, 545, 'Hypothetical parameters · negative shocks receive an extra γ e² in GJR.', 17, GRAY)
    save('arch-news-impact.svg', 'GJR allows equal-size shocks to have different effects',
         'Hypothetical news impact curves with omega 0.000005 and current variance 0.0001. GARCH gives variance 0.000164 at shocks plus or minus 0.03. GJR gives variance 0.000209 at minus 0.03 and 0.000119 at plus 0.03. Both persistences are 0.95 only under symmetric unit-variance shocks.', body)


if __name__ == '__main__':
    verify_examples()
    update_chart()
    forecast_chart()
    news_impact_chart()
