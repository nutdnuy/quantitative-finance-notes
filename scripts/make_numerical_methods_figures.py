"""Generate three deterministic SVG charts from the numerical-methods examples.

QuantCorner/QuantSeras light-book palette; Route 3, no image generator or
third-party artwork. Computed hypothetical values, not observed market data.
"""
import base64
import math
from html import escape
from pathlib import Path

from numerical_methods_math import (DEFAULT_SEED, black_scholes, convergence_rows,
                                    finite_difference, monte_carlo, payoff)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/images"
PURPLE, TEAL, GRAY = "#6200ee", "#008577", "#64646b"


def text(x, y, label, size=18, color="#232326", anchor="start"):
    return f'<text x="{x:.3f}" y="{y:.3f}" font-size="{size}" fill="{color}" text-anchor="{anchor}">{escape(str(label))}</text>'


def line(x1, y1, x2, y2, color="#dddddf", width=1.5, dash=""):
    return f'<line x1="{x1:.3f}" y1="{y1:.3f}" x2="{x2:.3f}" y2="{y2:.3f}" stroke="{color}" stroke-width="{width}" stroke-dasharray="{dash}"/>'


def poly(points, color, width=3, dash=""):
    coords = " ".join(f"{x:.3f},{y:.3f}" for x, y in points)
    return f'<polyline points="{coords}" fill="none" stroke="{color}" stroke-width="{width}" stroke-dasharray="{dash}"/>'


def circle(x, y, color=PURPLE, radius=4):
    return f'<circle cx="{x:.3f}" cy="{y:.3f}" r="{radius}" fill="white" stroke="{color}" stroke-width="2.5"/>'


def save(name, title, description, body, height):
    font = base64.b64encode((ROOT/"assets/fonts/roboto-latin-400-normal.woff2").read_bytes()).decode("ascii")
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="{height}" viewBox="0 0 1000 {height}" role="img" aria-labelledby="title desc">
<title id="title">{escape(title)}</title><desc id="desc">{escape(description)}</desc>
<style>@font-face{{font-family:Roboto;src:url(data:font/woff2;base64,{font}) format('woff2');font-weight:400}}text{{font-family:Roboto,Arial,sans-serif}}</style>
<rect width="1000" height="{height}" fill="white"/>
{text(40,48,title,28)}{body}</svg>'''
    (OUT/name).write_text(svg)
    print(name)


def monte_carlo_chart():
    checkpoints = sorted({round(10**(2+j*math.log10(200)/30)) for j in range(31)})
    result = monte_carlo(checkpoints=checkpoints)
    rows, reference = result["checkpoints"], result["reference"]
    x = lambda n: 100+800*math.log10(n/100)/math.log10(200)
    y = lambda value: 470-(value-5)*43
    body = text(40,81,"European Call · S = K = 100 · r = 3% · volatility = 20% · T = 1 year",18,GRAY)
    body += text(100,121,"Option value (currency units)",16,GRAY)
    for value in range(5, 13):
        body += line(100,y(value),900,y(value))+text(82,y(value)+5,value,16,GRAY,"end")
    points = [(x(row["paths"]),y(row["lower"])) for row in rows]
    points += [(x(row["paths"]),y(row["upper"])) for row in reversed(rows)]
    body += '<polygon points="'+" ".join(f"{a:.3f},{b:.3f}" for a,b in points)+'" fill="#ede1ff"/>'
    body += line(100,y(reference),900,y(reference),TEAL,2,"7 5")
    body += poly([(x(row["paths"]),y(row["price"])) for row in rows],PURPLE)
    body += circle(x(rows[-1]["paths"]),y(rows[-1]["price"]))
    for n in (100,500,1000,5000,20000):
        body += text(x(n),500,f"{n:,}",16,GRAY,"middle")
    body += text(900,532,"Simulations N (log scale)",18,GRAY,"end")
    body += line(102,554,138,554,PURPLE,3)+text(150,560,"MC estimate",17)
    body += '<rect x="314" y="544" width="30" height="20" fill="#ede1ff"/>'
    body += text(356,560,"Approximate 95% interval",17)
    body += line(669,554,705,554,TEAL,2,"7 5")+text(717,560,f"Analytic {reference:.4f}",17)
    body += text(40,604,f"Python seed {DEFAULT_SEED} · nested sample prefixes · exact GBM terminals",17,GRAY)
    body += text(40,631,"The interval covers sampling error under the model; it is not a model-validity interval.",17,GRAY)
    save("numerical-monte-carlo.svg","More paths narrow sampling uncertainty",
         f"Calculated iid Monte Carlo Call estimates from Python seed {DEFAULT_SEED}, 100 to 20,000 simulations. Shaded pointwise approximate 95 percent confidence intervals. Analytic price {reference:.10f}. Logarithmic simulation-count axis. Nested prefixes are not independent trials.",body,660)


def finite_difference_chart():
    fd = finite_difference()
    x = lambda s: 100+(s-50)*8
    y = lambda v: 393-v*4.4
    display = [(s,v) for s,v in zip(fd["spots"],fd["values"]) if 50 <= s <= 150]
    body = text(40,81,"European Call · K = 100 · r = 3% · volatility = 20% · T = 1 year",18,GRAY)
    body += text(40,111,"80 asset intervals × 1,000 time steps · solver domain 0–400; detail shown below",17,GRAY)
    body += text(100,147,"Option value (currency units)",16,GRAY)
    for value in (0,10,20,30,40,50):
        body += line(100,y(value),900,y(value))+text(82,y(value)+5,value,16,GRAY,"end")
    body += poly([(x(s),y(payoff(s))) for s in range(50,151)],GRAY,2,"6 5")
    body += poly([(x(s),y(black_scholes(S=s))) for s in range(50,151)],TEAL,3)
    for s,value in display:
        body += circle(x(s),y(value))
    body += line(x(100),160,x(100),393,"#aaaab2",1,"3 4")
    body += text(x(100)+10,183,"S = K = 100",16,GRAY)
    for spot in (50,75,100,125,150):
        body += text(x(spot),421,spot,16,GRAY,"middle")
    body += text(900,451,"Underlying price S",18,GRAY,"end")
    body += line(110,474,146,474,GRAY,2,"6 5")+text(158,480,"Expiry payoff",17)
    body += line(375,474,411,474,TEAL,3)+text(423,480,"Analytic value today",17)
    body += circle(701,474)+text(719,480,"Explicit FD nodes",17)
    ey = lambda e: 633-e*1200
    body += text(100,528,"FD minus analytic (currency units)",16,GRAY)
    for value in (-.06,-.03,0.):
        body += line(100,ey(value),900,ey(value))+text(82,ey(value)+5,f"{value:.2f}",16,GRAY,"end")
    body += poly([(x(s),ey(v-black_scholes(S=s))) for s,v in display],PURPLE,2)
    for spot in (50,75,100,125,150):
        body += text(x(spot),740,spot,16,GRAY,"middle")
    body += text(900,770,"Underlying price S",18,GRAY,"end")
    body += text(40,813,f"At S = 100: FD {fd['price']:.6f} · analytic {fd['reference']:.6f} · error {fd['price']-fd['reference']:+.6f}",18)
    body += text(40,842,"A close price curve can hide a measurable discretization error.",17,GRAY)
    save("numerical-finite-difference.svg","The grid approximates the whole price curve",
         "Computed European Call price, analytic Black-Scholes price and expiry payoff for S from 50 to 150. FD grid uses Smax 400, 80 intervals and 1000 time steps. The separate lower panel reveals finite-difference price error. These are hypothetical model calculations.",body,870)


def convergence_chart():
    rows = convergence_rows()
    x = lambda m: 120+740*math.log2(m/40)/3
    y = lambda error: 464-100*math.log10(error/.001)
    body = text(40,81,"European Call at S = K = 100 · r = 3% · volatility = 20% · T = 1 year",18,GRAY)
    body += text(40,111,"Smax = 400 · each doubling of asset intervals uses four times as many time steps",17,GRAY)
    body += text(120,150,"Absolute pricing error (log scale; currency units)",16,GRAY)
    for value in (.001,.01,.1,1.):
        body += line(120,y(value),860,y(value))+text(101,y(value)+5,f"{value:g}",16,GRAY,"end")
    guide = [(row["intervals"], rows[0]["error"]*(40/row["intervals"])**2) for row in rows]
    body += poly([(x(m),y(err)) for m,err in guide],GRAY,2,"7 5")
    body += poly([(x(row["intervals"]),y(row["error"])) for row in rows],PURPLE,3)
    for row in rows:
        body += circle(x(row["intervals"]),y(row["error"]))
        body += text(x(row["intervals"]),y(row["error"])-18,f"{row['error']:.5f}",17,PURPLE,"middle")
        body += text(x(row["intervals"]),499,row["intervals"],17,GRAY,"middle")
    body += text(860,532,"Asset intervals M (log scale)",18,GRAY,"end")
    body += line(120,556,156,556,PURPLE,3)+text(168,562,"Computed absolute error",17)
    body += line(555,556,591,556,GRAY,2,"7 5")+text(603,562,"Reference slope M⁻²",17)
    body += text(40,606,"Time steps: 250 → 1,000 → 4,000 → 16,000 · strike lies on every grid",17,GRAY)
    body += text(40,634,"This example supports refinement checks; a payoff kink can affect formal error orders.",17,GRAY)
    save("numerical-grid-convergence.svg","Refine time as the asset grid gets finer",
         "Absolute Call pricing errors for M 40, 80, 160, 320 and N 250, 1000, 4000, 16000. Errors decrease from 0.253682 to 0.003762. Both axes logarithmic. Dashed guide proportional to M to the power minus 2, normalized to the first error; it is not an error bound.",body,665)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    monte_carlo_chart()
    finite_difference_chart()
    convergence_chart()
