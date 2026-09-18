"""Generate original, deterministic educational charts from stated assumptions."""
from html import escape
from math import sqrt
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/images'
PURPLE, TEAL, INK, GRAY = '#6200EE', '#007F73', '#202124', '#64666B'


def portfolio(w, rho=.2):
    return sqrt(max(0, w*w*.2**2+(1-w)**2*.1**2+2*w*(1-w)*rho*.2*.1))*100, (w*.12+(1-w)*.06)*100


class Chart:
    def __init__(self, title, subtitle, xmax, ymax, xticks, yticks, xlabel, ylabel, desc):
        self.xmax, self.ymax = xmax, ymax
        self.items = [f'<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="680" viewBox="0 0 1120 680" role="img" aria-labelledby="title desc"><title id="title">{escape(title)}</title><desc id="desc">{escape(desc)}</desc><rect width="1120" height="680" fill="white"/><g font-family="Roboto,Arial,sans-serif" fill="{INK}">']
        self.text(44, 47, title, size=28, weight=600)
        self.text(44, 80, subtitle, size=17, fill=GRAY)
        for x in xticks:
            self.line(x, 0, x, ymax, '#e7e7eb', 1)
            self.text(self.x(x), 583, str(x), size=16, anchor='middle')
        for y in yticks:
            self.line(0, y, xmax, y, '#e7e7eb', 1)
            self.text(80, self.y(y)+5, str(y), size=16, anchor='end')
        self.line(0, 0, xmax, 0, '#9a9ba2', 1.5)
        self.line(0, 0, 0, ymax, '#9a9ba2', 1.5)
        self.text(558, 617, xlabel, size=18, anchor='middle')
        self.text(96, 120, ylabel, size=18)
        self.text(44, 658, 'Hypothetical inputs | 1-year simple total returns | No market observations', size=15, fill=GRAY)

    def x(self, value): return 100 + value/self.xmax*930
    def y(self, value): return 552 - value/self.ymax*404
    def text(self, x, y, text, size=18, fill=INK, anchor='start', weight=400):
        self.items.append(f'<text x="{x:.2f}" y="{y:.2f}" font-size="{size}" fill="{fill}" text-anchor="{anchor}" font-weight="{weight}">{escape(text)}</text>')
    def line(self, x1, y1, x2, y2, color, width=3, dash=''):
        self.items.append(f'<path d="M{self.x(x1):.3f},{self.y(y1):.3f} L{self.x(x2):.3f},{self.y(y2):.3f}" fill="none" stroke="{color}" stroke-width="{width}" stroke-dasharray="{dash}"/>')
    def curve(self, points, color, dash='', width=3.5):
        points = list(points)
        assert all(0 <= x <= self.xmax+1e-9 and 0 <= y <= self.ymax+1e-9 for x,y in points)
        d = ' '.join(f'{"M" if i==0 else "L"}{self.x(x):.3f},{self.y(y):.3f}' for i,(x,y) in enumerate(points))
        self.items.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width}" stroke-dasharray="{dash}"/>')
    def point(self, x, y, label, color=INK, dx=12, dy=-12):
        self.items.append(f'<circle cx="{self.x(x):.3f}" cy="{self.y(y):.3f}" r="6" fill="{color}" stroke="white" stroke-width="2"/>')
        self.text(self.x(x)+dx, self.y(y)+dy, label, fill=color, size=17, weight=500)
    def save(self, name):
        (OUT/name).write_text(''.join(self.items)+'</g></svg>')


c=Chart('Correlation changes the portfolio curve', 'Same assets, different co-movement. Each curve contains all long-only weights.', 22, 14, [0,5,10,15,20], [0,2,4,6,8,10,12,14], 'Portfolio standard deviation (%)', 'Expected return (%)', 'Four exact two-asset curves for correlation 1, 0.2, 0 and -1. Asset A has mean 12% and SD 20%; B mean 6% and SD 10%.')
for rho,col,dash in [(1,GRAY,'8 6'),(.2,PURPLE,''),(0,TEAL,'3 5'),(-1,'#A24C22','12 5 3 5')]:
    c.curve((portfolio(w/300,rho) for w in range(301)),col,dash)
    idx=[1,.2,0,-1].index(rho)
    c.text(660,440+idx*26,f'Correlation = {rho:g}',fill=col,size=17)
c.point(20,12,'A',dx=12,dy=-8)
c.point(10,6,'B',dx=12,dy=22)
c.point(0,8,'Zero SD at A = 33.33%',color='#A24C22',dx=15,dy=-50)
c.save('portfolio-correlation.svg')

c=Chart('Minimum risk and maximum Sharpe are different portfolios', 'Correlation = 0.20 | Risk-free return = 2% | A: 12% / 20%; B: 6% / 10%',22,16,[0,5,10,15,20],[0,2,4,6,8,10,12,14,16],'Portfolio standard deviation (%)','Expected return (%)','The long-only efficient branch begins at the minimum-variance portfolio. The capital allocation line touches the curve at the maximum Sharpe portfolio.')
c.curve((portfolio(w/700) for w in range(101)),GRAY,'5 4')
c.curve((portfolio(w/700) for w in range(100,701)),PURPLE)
sg,mg=portfolio(1/7); st,mt=portfolio(7/17)
slope=(mt-2)/st
c.line(0,2,22,2+slope*22,TEAL,2.5,'8 5')
c.point(0,2,'Risk-free 2%',TEAL,dx=12,dy=-32)
c.point(sg,mg,'GMV: A 14.29%',GRAY,dx=-200,dy=96)
c.point(st,mt,'Tangency: A 41.18%',PURPLE,dx=25,dy=55)
c.point(20,12,'A',dx=14,dy=4)
c.point(10,6,'B',dx=14,dy=21)
c.text(615,176,f'CAL: Sharpe = {slope:.4f}',fill=TEAL,size=18)
c.text(617,202,'Efficient risky branch',fill=PURPLE,size=18)
c.text(617,228,'Dominated risky branch (dashed)',fill=GRAY,size=18)
c.save('portfolio-frontier.svg')

c=Chart('More holdings reduce only part of the risk', 'Equal weights | Each asset has SD 20% | Same correlation for every pair',100,22,[0,20,40,60,80,100],[0,5,10,15,20],'Number of assets (N)','Portfolio standard deviation (%)','The equal-weight portfolio SD is 20% times sqrt(rho+(1-rho)/N). With rho 0.2 the limit is 8.94%; with rho zero it tends to zero.')
for rho,col,dash in [(0,TEAL,'6 4'),(.2,PURPLE,'')]:
    c.curve(((n,20*sqrt(rho+(1-rho)/n)) for n in range(1,101)),col,dash)
c.line(1,20*sqrt(.2),100,20*sqrt(.2),GRAY,2,'3 5')
c.text(550,230,'Correlation = 0.20',fill=PURPLE,size=18)
c.text(550,259,'Limit: 8.94% SD',fill=GRAY,size=18)
c.text(550,452,'Correlation = 0',fill=TEAL,size=18)
c.point(50,20*sqrt(.2+.8/50),'N=50: 9.30%',PURPLE,dx=15,dy=-18)
c.save('portfolio-diversification.svg')

c=Chart('CAPM links expected return to beta', 'Risk-free return = 2% | Market expected return = 8% | Market premium = 6%',2,16,[0,.5,1,1.5,2],[0,2,4,6,8,10,12,14,16],'Beta to the market (unitless)','Expected return (%)','The security market line is expected return equals 2% plus beta times 6%. A beta of 1.2 implies 9.2%. The horizontal axis is beta, not total volatility.')
c.line(0,2,2,14,PURPLE,3.5)
c.line(1.2,0,1.2,9.2,GRAY,1.5,'4 4')
c.line(0,9.2,1.2,9.2,GRAY,1.5,'4 4')
c.point(0,2,'Risk-free',dx=13,dy=-32)
c.point(1,8,'Market: beta 1',PURPLE,dx=12,dy=52)
c.point(1.2,9.2,'Beta 1.2: expected 9.2%',TEAL,dx=16,dy=25)
c.text(153,188,'SML: 2% + beta × 6%',size=20,fill=PURPLE)
c.text(153,215,'Total volatility is not on this axis.',size=17,fill=GRAY)
c.save('portfolio-sml.svg')
print('Generated 4 deterministic SVG illustrations.')
