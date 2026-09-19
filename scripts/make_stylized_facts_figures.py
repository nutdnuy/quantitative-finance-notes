"""Original deterministic charts, not reconstructions of historical source plots."""
import math
from stylized_facts_math import clustered_returns, acf, intraday_profile
from make_tail_risk_figures import save, text, line, poly, PURPLE, TEAL, GRAY


def clustering_chart():
    returns = clustered_returns()
    body = text(40,82,'600 simulated days · Normal shocks · SD alternates every 50 days · seed 2524',17,GRAY)
    x = lambda t: 95+(t-1)/599*810
    y = lambda r: 238-r*1350
    for value in [-.06,-.03,0,.03,.06]:
        body += line(95,y(value),905,y(value))+text(80,y(value)+5,f'{100*value:g}%',16,GRAY,'end')
    body += text(95,126,'Log return',16,GRAY)
    body += poly([(x(i+1),y(r)) for i,r in enumerate(returns)],PURPLE,1.3)
    for t in [1,150,300,450,600]:
        body += text(x(t),349,str(t),16,GRAY,'middle')
    body += text(905,378,'Day',17,GRAY,'end')
    body += text(40,419,'Serial correlation depends on what you measure',23)
    left,bottom,width,height = 95,674,810,195
    xx=lambda k:left+(k-.5)/20*width
    yy=lambda r:bottom-(r+.2)/.8*height
    for v in [-.2,0,.2,.4,.6]:
        body+=line(left,yy(v),left+width,yy(v))+text(left-15,yy(v)+5,f'{v:.1f}',16,GRAY,'end')
    for values,color,shift in [(acf(returns),PURPLE,-6),(acf([abs(r) for r in returns]),TEAL,6)]:
        for k,r in enumerate(values[1:],1):
            body+=f'<rect x="{xx(k)+shift-4:.3f}" y="{min(yy(0),yy(r)):.3f}" width="8" height="{abs(yy(r)-yy(0)):.3f}" fill="{color}"/>'
    for k in [1,5,10,15,20]:body+=text(xx(k),700,str(k),16,GRAY,'middle')
    body+=text(95,459,'ACF(r)',18,PURPLE)+text(235,459,'ACF(|r|)',18,TEAL)
    body+=text(905,737,'Lag (days)',17,GRAY,'end')
    save('stylized-clustering.svg','Small return correlation can coexist with volatility clusters', 'Simulated returns with alternating 50-day volatility regimes and sample autocorrelations of raw and absolute returns. Synthetic evidence only.',body,765)


def intraday_chart():
    with_news,without = intraday_profile(), intraday_profile(False)
    body=text(40,82,'Illustrative variance allocation · 78 five-minute intervals · each profile sums to 100%',17,GRAY)
    x=lambda i:95+i/78*810
    y=lambda v:413-v*4800
    for v in [0,.01,.02,.03,.04,.05,.06]:
        body+=line(95,y(v),905,y(v))+text(80,y(v)+5,f'{v*100:.0f}%',16,GRAY,'end')
    body+=text(95,106,'Share of session variance',16,GRAY)
    body+=poly([(x(i+.5),y(v)) for i,v in enumerate(without)],TEAL)
    body+=poly([(x(i+.5),y(v)) for i,v in enumerate(with_news)],PURPLE)
    body+=text(500,145,'With a scheduled-news bump',18,PURPLE)
    body+=text(500,173,'Baseline opening / closing pattern',18,TEAL)
    for i in [0,13,26,39,52,65,78]:body+=text(x(i),444,str(5*i),16,GRAY,'middle')
    body+=text(905,482,'Minutes from open (hypothetical session)',17,GRAY,'end')
    save('stylized-intraday-profile.svg','Variance need not be spread evenly through the day','Hypothetical normalized intraday variance profiles with and without a news bump. Neither profile represents a named market or actual news schedule.',body)


def close_chart():
    body=text(40,82,'Two constructed paths · four intervals · no dividends · identical starting and closing prices',17,GRAY)
    x=lambda t:110+t*185
    y=lambda p:410-(p-99.8)*220
    for p in [100,100.5,101]:body+=line(110,y(p),850,y(p))+text(90,y(p)+5,f'{p:.1f}',16,GRAY,'end')
    for scale,color in [(.01,PURPLE),(.002,TEAL)]:
        r=[scale,-scale,scale,-scale];log_path=[0]
        for v in r:log_path.append(log_path[-1]+v)
        body+=poly([(x(i),y(100*math.exp(v))) for i,v in enumerate(log_path)],color)
        for i,v in enumerate(log_path):body+=f'<circle cx="{x(i)}" cy="{y(100*math.exp(v)):.3f}" r="4" fill="{color}"/>'
    body+=text(110,112,'Price',16,GRAY)
    body+=text(110,488,'Larger swings: √RV = 2.0%',19,PURPLE)
    body+=text(560,488,'Smaller swings: √RV = 0.4%',19,TEAL)
    for i in range(5):body+=text(x(i),449,str(i),16,GRAY,'middle')
    body+=text(850,528,'Observation index',17,GRAY,'end')
    save('stylized-close-vs-rv.svg','An unchanged close can hide intraday movement','Both hypothetical paths begin and end at 100. Alternating log returns of 1% give realized volatility 2%; alternating log returns of 0.2% give 0.4%.',body,555)


if __name__=='__main__':
    clustering_chart()
    intraday_chart()
    close_chart()
