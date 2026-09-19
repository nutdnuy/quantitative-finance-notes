"""Original calculated option-Greeks SVGs; all inputs are hypothetical.

QuantCorner light lesson palette, Route 3 no-image-generator. Re-running this
script is the editable source of each chart; no historical prices are used.
"""
import base64
from html import escape
from pathlib import Path
from option_greeks_math import greeks

ROOT = Path(__file__).resolve().parents[1]
PURPLE, TEAL, GRAY, GRID = '#6200ee', '#008577', '#64646b', '#dddddf'


def text(x, y, label, size=18, color='#232326', anchor='start'):
    return f'<text x="{x:.2f}" y="{y:.2f}" font-size="{size}" fill="{color}" text-anchor="{anchor}">{escape(str(label))}</text>'


def line(x1, y1, x2, y2, color=GRID, dash=''):
    return f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" stroke="{color}" stroke-width="2" stroke-dasharray="{dash}"/>'


def curve(points, color=PURPLE, dash=''):
    coordinates = ' '.join(f'{x:.3f},{y:.3f}' for x, y in points)
    return f'<polyline points="{coordinates}" fill="none" stroke="{color}" stroke-width="3" stroke-dasharray="{dash}"/>'


def save(filename, title, description, body, height):
    font = base64.b64encode((ROOT/'assets/fonts/roboto-latin-400-normal.woff2').read_bytes()).decode()
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="{height}" viewBox="0 0 1000 {height}" role="img" aria-labelledby="title desc">
<title id="title">{escape(title)}</title><desc id="desc">{escape(description)}</desc>
<style>@font-face{{font-family:Roboto;src:url(data:font/woff2;base64,{font}) format('woff2');font-weight:400}}text{{font-family:Roboto,Arial,sans-serif}}</style>
<rect width="1000" height="{height}" fill="white"/>{text(40,48,title,28)}{body}</svg>'''
    (ROOT/'assets/images'/filename).write_text(svg)
    print(filename)


def delta_probability_chart():
    base = greeks()
    xx = lambda s: 100+(s-60)/90*805
    yy = lambda p: 419-p*285
    body = text(40,82,'Hypothetical European Call · K = 100 · r = b = 5% · volatility = 20% · T = 1 year',17,GRAY)
    body += text(100,116,'Delta or probability (unitless)',16,GRAY)
    for value in [0,.2,.4,.6,.8,1]:
        body += line(100,yy(value),905,yy(value))+text(82,yy(value)+6,f'{value:.1f}',16,GRAY,'end')
    for spot in [60,80,100,120,140,150]:
        body += text(xx(spot),448,spot,16,GRAY,'middle')
    for key,color,dash in [('delta',PURPLE,''),('itm_probability',TEAL,'8 5')]:
        body += curve([(xx(60+i/3),yy(greeks(S=60+i/3)[key])) for i in range(271)],color,dash)
        body += f'<circle cx="{xx(100):.3f}" cy="{yy(base[key]):.3f}" r="5" fill="{color}"/>'
    body += line(xx(100),134,xx(100),419,GRAY,'2 5')
    body += text(905,486,'Spot price S (currency units)',17,GRAY,'end')
    body += line(100,521,142,521,PURPLE)+text(157,527,f'Delta = N(d1); at S = 100: {base["delta"]:.4f}',19,PURPLE)
    body += line(100,556,142,556,TEAL,'8 5')+text(157,562,f'Q expiry ITM probability = N(d2); at S = 100: {base["itm_probability"]:.4f}',19,TEAL)
    body += text(40,605,'Fixed-parameter lognormal model. Neither curve is a real-world probability forecast.',17,GRAY)
    save('option-greeks-delta-probability.svg','Delta and expiry ITM probability are different',
         'Calculated spot Call Delta and risk-neutral probability of ending in the money under generalized Black-Scholes-Merton with K=100, r=b=0.05, sigma=0.2, T=1 year. Spot varies from 60 to 150. At spot 100 Delta is 0.636831 and expiry ITM probability is 0.559618.',body,635)


def taylor_chart():
    base = greeks()
    xx = lambda ds: 100+(ds+20)/40*805
    minimum,maximum = -15,20
    yy = lambda change: 442-(change-minimum)/(maximum-minimum)*286
    body = text(40,82,'Hypothetical Call · S = K = 100 · r = b = 5% · volatility = 20% · T = 1 year',17,GRAY)
    body += text(100,116,'Option value change (currency units)',16,GRAY)
    for value in [-15,-10,-5,0,5,10,15,20]:
        body += line(100,yy(value),905,yy(value))+text(82,yy(value)+5,value,16,GRAY,'end')
    body += line(xx(0),156,xx(0),442,GRAY,'2 5')
    for ds in [-20,-10,0,10,20]:
        body += text(xx(ds),471,f'{ds:+d}' if ds else '0',16,GRAY,'middle')
    values = [(-20+i/5) for i in range(201)]
    series = [
        ('Delta only',[(ds,base['delta']*ds) for ds in values],GRAY,'4 5'),
        ('Delta + Gamma',[(ds,base['delta']*ds+.5*base['gamma']*ds*ds) for ds in values],TEAL,'10 5'),
        ('Exact repricing',[(ds,greeks(S=100+ds)['price']-base['price']) for ds in values],PURPLE,''),
    ]
    for label,points,color,dash in series:
        assert all(-20 <= ds <= 20 and minimum <= change <= maximum for ds,change in points),(label,points)
        body += curve([(xx(ds),yy(change)) for ds,change in points],color,dash)
    body += text(905,508,'Spot change ΔS (currency units)',17,GRAY,'end')
    for x,color,dash,label in [(100,PURPLE,'','Exact repricing'),(378,GRAY,'4 5','Delta only'),(640,TEAL,'10 5','Delta + Gamma')]:
        body += line(x,541,x+42,541,color,dash)+text(x+55,547,label,18,color)
    body += text(40,588,'At ΔS = +5: exact +3.4073 · Delta only +3.1842 · Delta + Gamma +3.4187',18)
    body += text(40,621,'Volatility and time are held fixed. Taylor terms are local approximations.',17,GRAY)
    save('option-greeks-taylor.svg','Gamma improves a local stock-shock approximation',
         'Calculated changes in the value of a European Call starting at S=K=100, r=b=0.05, sigma=0.2, T=1 year, with only spot changed. The exact value change and first- and second-order Taylor approximations are plotted for shocks from -20 to +20 currency units. The approximation error increases for larger shocks.',body,650)


def higher_profiles_chart():
    body = text(40,82,'Hypothetical European Call · K = 100 · r = b = 5% · volatility = 20% · T = 1 year',17,GRAY)
    xx = lambda s: 115+(s-60)/90*790
    profiles = [
        ('gamma','Gamma: change in Delta per +1 spot unit',0,.024,[0,.01,.02],PURPLE),
        ('vanna','Vanna: change in Delta per +1.0 volatility',-1.2,1.6,[-1,0,1],TEAL),
        ('vomma','Vomma: change in raw Vega per +1.0 volatility',-20,200,[0,80,160],PURPLE),
    ]
    for index,(key,label,minimum,maximum,ticks,color) in enumerate(profiles):
        top = 143+index*250
        bottom = top+160
        yy = lambda value: bottom-(value-minimum)/(maximum-minimum)*160
        body += text(40,top-24,label,20)
        for value in ticks:
            body += line(115,yy(value),905,yy(value))+text(96,yy(value)+5,f'{value:g}',16,GRAY,'end')
        body += line(xx(100),top,xx(100),bottom,GRAY,'3 5')
        series = [(spot,greeks(S=spot)[key]) for spot in [60+i/3 for i in range(271)]]
        assert all(minimum <= value <= maximum for _,value in series),(key,min(v for _,v in series),max(v for _,v in series))
        body += curve([(xx(spot),yy(value)) for spot,value in series],color)
        for spot in [60,80,100,120,140,150]:
            body += text(xx(spot),bottom+26,spot,16,GRAY,'middle')
        body += text(905,bottom+56,'Spot price S (currency units)',16,GRAY,'end')
    body += text(40,895,'The vertical scales and units differ. Vanna and Vomma may change sign.',17,GRAY)
    body += text(40,925,'For one volatility percentage point, use Δvolatility = 0.01.',17,GRAY)
    save('option-greeks-higher-profiles.svg','Higher Greeks describe different local sensitivities',
         'Three separate calculated spot profiles, each with its own scale, for Gamma, Vanna and Vomma under generalized Black-Scholes-Merton with K=100, r=b=0.05, sigma=0.2 and T=1 year. Raw volatility units are used. The dotted vertical guide marks S=100. Inputs are hypothetical.',body,955)


if __name__ == '__main__':
    delta_probability_chart()
    taylor_chart()
    higher_profiles_chart()
