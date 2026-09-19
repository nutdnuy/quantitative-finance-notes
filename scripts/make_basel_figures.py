"""Original, deterministic Basel charts; hypothetical inputs, no market data."""

import base64
from html import escape
from pathlib import Path

from basel_math import capital_metrics, corporate_irb, liquidity_coverage

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/images"
PURPLE, TEAL, GRAY = "#6200ee", "#008577", "#64646b"
INK = "#232326"


def text(x, y, label, size=18, color=INK, anchor="start", weight=400):
    return (f'<text x="{x:.3f}" y="{y:.3f}" font-size="{size}" '
            f'fill="{color}" text-anchor="{anchor}" font-weight="{weight}">'
            f'{escape(str(label))}</text>')


def line(x1, y1, x2, y2, color="#dddddf", dash=""):
    return (f'<line x1="{x1:.3f}" y1="{y1:.3f}" x2="{x2:.3f}" '
            f'y2="{y2:.3f}" stroke="{color}" stroke-width="1.5" '
            f'stroke-dasharray="{dash}"/>')


def rect(x, y, width, height, color):
    return (f'<rect x="{x:.3f}" y="{y:.3f}" width="{width:.3f}" '
            f'height="{height:.3f}" fill="{color}"/>')


def save(name, title, description, body, height):
    # Embedded local fonts keep SVG images and exported notebooks self-contained.
    fonts = ""
    for weight in [400, 500]:
        font = ROOT / f"assets/fonts/roboto-latin-{weight}-normal.woff2"
        encoded = base64.b64encode(font.read_bytes()).decode("ascii")
        fonts += (f"@font-face{{font-family:Roboto;font-style:normal;"
                  f"font-weight:{weight};src:url(data:font/woff2;base64,"
                  f"{encoded}) format('woff2');}}")
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="1000" '
           f'height="{height}" viewBox="0 0 1000 {height}" role="img" '
           f'aria-labelledby="title desc"><title id="title">{escape(title)}</title>'
           f'<desc id="desc">{escape(description)}</desc><style>{fonts}</style>'
           f'<rect width="1000" height="{height}" fill="white"/>'
           '<g font-family="Roboto, Arial, sans-serif">'
           f'{text(40,48,title,28,weight=500)}{body}</g></svg>')
    (OUT / name).write_text(svg, encoding="utf-8")
    print(name)


def capital_chart():
    result = capital_metrics(60, 10, 20, 600, 1500)
    body = text(40, 81, "Hypothetical capital: CET1 60 + AT1 10 + Tier 2 20 · RWA 600 million", 18, GRAY)
    body += rect(215, 105, 18, 12, PURPLE) + text(242, 117, "Example ratio", 17, PURPLE)
    body += rect(445, 105, 18, 12, TEAL) + text(472, 117, "Minimum + 2.5 pp conservation buffer", 17, TEAL)
    x = lambda percent: 215 + percent / 16 * 640
    for tick in [0, 4, 8, 12, 16]:
        body += line(x(tick), 140, x(tick), 448)
        body += text(x(tick), 480, f"{tick}%", 17, GRAY, "middle")
    rows = [
        ("CET1", "60 / 600", result["cet1_ratio"], .045),
        ("Tier 1", "(60 + 10) / 600", result["tier1_ratio"], .06),
        ("Total capital", "(60 + 10 + 20) / 600", result["total_ratio"], .08),
    ]
    for index, (label, formula, ratio, minimum) in enumerate(rows):
        y = 157 + index * 104
        threshold = minimum + .025
        body += text(40, y + 22, label, 22, weight=500)
        body += text(40, y + 49, formula, 15, GRAY)
        body += rect(x(0), y, x(100 * ratio) - x(0), 25, PURPLE)
        body += text(x(100 * ratio) + 10, y + 20, f"{100 * ratio:.2f}%", 18, PURPLE, weight=500)
        body += rect(x(0), y + 37, x(100 * threshold) - x(0), 18, TEAL)
        body += text(x(100 * threshold) + 10, y + 53, f"{100 * threshold:g}%", 18, TEAL)
    body += text(855, 518, "Capital / RWA", 18, GRAY, "end")
    body += text(40, 555, "Underlying minima: CET1 4.5%, Tier 1 6%, total 8%. The buffer is CET1.", 18, GRAY)
    body += text(40, 583, "Nested requirements; no fixed separate AT1 or Tier 2 allocation. Other buffers omitted.", 17, GRAY)
    save("basel-capital.svg", "Capital ratios use different, nested numerators",
         "Hypothetical CET1 60, AT1 10 and Tier 2 20 million, divided by RWA 600 million. "
         "Example ratios are 10%, 11.6667% and 15%; minima plus a 2.5 percentage-point "
         "capital conservation buffer are 7%, 8.5% and 10.5%. Additional buffers omitted.", body, 615)


def liquidity_chart():
    base = liquidity_coverage(120, 160, 60)
    stress = liquidity_coverage(120, 220, 60)
    body = text(40, 81, "Hypothetical 30-day amounts · million currency units · HQLA already eligible", 18, GRAY)
    body += text(40, 125, f"Base: LCR {100 * base['ratio']:.0f}%", 24, PURPLE, weight=500)
    body += text(400, 125, f"Higher outflows: LCR {100 * stress['ratio']:.0f}%", 24, TEAL, weight=500)
    body += text(40, 155, "120 / 100", 18, PURPLE)
    body += text(400, 155, "120 / 160", 18, TEAL)
    x = lambda value: 220 + value / 240 * 650
    for tick in [0, 60, 120, 180, 240]:
        body += line(x(tick), 187, x(tick), 533)
        body += text(x(tick), 567, str(tick), 17, GRAY, "middle")
    rows = [("Gross outflows", "outflows"), ("Admitted inflows", "admitted_inflows"),
            ("Net outflows", "net_outflows"), ("HQLA", "hqla")]
    for index, (label, key) in enumerate(rows):
        y = 198 + 85 * index
        body += text(40, y + 29, label, 20, weight=500)
        for value, color, offset, label in [(base[key], PURPLE, 0, "base"), (stress[key], TEAL, 29, "higher")]:
            body += rect(x(0), y + offset, x(value) - x(0), 21, color)
            body += text(x(value) + 10, y + offset + 18, f"{value:g} ({label})", 17, color)
    body += text(870, 604, "Amount (million)", 18, GRAY, "end")
    body += text(40, 643, "Net outflows = outflows − min(inflows, 75% × outflows). Inflows remain 60.", 18, GRAY)
    body += text(40, 671, "Inflow caps: 120 in base; 165 with higher outflows. General LCR benchmark: 100%.", 17, GRAY)
    save("basel-liquidity.svg", "Higher outflows reduce the liquidity coverage ratio",
         "Calculated hypothetical 30-day LCR examples. Eligible HQLA stays 120 million "
         "and inflows 60 million. Gross outflows rise from 160 to 220 million, net "
         "outflows rise from 100 to 160 million, and LCR falls from 120% to 75%. "
         "The ordinary 75% inflow cap is applied.", body, 705)


def irb_chart():
    body = text(40, 81, "Corporate IRB illustration · LGD 45% · 99.9% confidence · PD 0.05% to 10%", 18, GRAY)
    x = lambda pd: 95 + pd / .10 * 720
    y = lambda rate: 468 - rate / .20 * 335
    for tick in [0, .05, .10, .15, .20]:
        body += line(95, y(tick), 815, y(tick))
        body += text(80, y(tick) + 6, f"{100 * tick:.0f}%", 17, GRAY, "end")
    body += text(95, 113, "Capital charge / EAD", 17, GRAY)
    for tick in [0, .02, .04, .06, .08, .10]:
        body += text(x(tick), 500, f"{100 * tick:g}%", 17, GRAY, "middle")
    for maturity, color, dash in [(1, "#64646b", "4 4"), (2.5, PURPLE, ""), (5, TEAL, "9 4")]:
        results = [(i / 20000, corporate_irb(i / 20000, .45, maturity, 100)) for i in range(10, 2001, 5)]
        points = " ".join(f"{x(pd):.3f},{y(result['capital_rate']):.3f}" for pd, result in results)
        body += (f'<polyline points="{points}" fill="none" stroke="{color}" '
                 f'stroke-width="3.5" stroke-dasharray="{dash}"/>')
        end = results[-1][1]["capital_rate"]
        body += text(840, y(end) + 6, f"M = {maturity:g} y", 19, color, weight=500)
    result = corporate_irb(.01, .45, 2.5, 100)
    px, py = x(.01), y(result["capital_rate"])
    body += line(px, py, px, y(0), PURPLE, "3 4")
    body += f'<circle cx="{px:.3f}" cy="{py:.3f}" r="5.5" fill="{PURPLE}"/>'
    body += text(230, 401, "PD 1%, M 2.5 y", 19, PURPLE, weight=500)
    body += text(230, 430, f"Capital charge / EAD = {100 * result['capital_rate']:.3f}%", 19, PURPLE)
    body += text(815, 539, "Annual probability of default (PD)", 18, GRAY, "end")
    body += text(40, 579, "Calculated formula curves, not observed losses or a forecast for a particular bank.", 18, GRAY)
    body += text(40, 608, "No SME / financial-sector adjustments, input / output floors or historical 1.06 factor.", 17, GRAY)
    save("basel-irb.svg", "PD and maturity change the corporate IRB requirement",
         "Corporate IRB capital as a percentage of EAD at LGD 45%, 99.9% confidence "
         "and effective maturities 1, 2.5 and 5 years. PD spans 0.05% to 10%. At PD 1% "
         "and maturity 2.5 years, capital charge divided by EAD is 7.385344%. Formula illustration "
         "without input/output floors or other regulatory adjustments.", body, 640)


if __name__ == "__main__":
    capital_chart()
    liquidity_chart()
    irb_chart()
