"""New calculated figures. No market series or source screenshots reproduced."""
import math
from make_tail_risk_figures import save,text,line,poly,PURPLE,TEAL,GRAY
from return_foundations_math import PRICE_A,PRICE_B,price_returns,arma11,standardized_t_pdf

def prices():
    body=text(40,82,'Constructed prices: six observations, five returns, no dividends or trading costs',17,GRAY)
    x=lambda t:100+t*160
    for top,lo,hi,title in [(135,96,108,'Price'),(425,-5,8,'Simple return (%)')]:
        y=lambda v:top+210-(v-lo)/(hi-lo)*210
        for v in ([96,100,104,108] if top==135 else [-5,0,5,8]):body+=line(100,y(v),900,y(v))+text(84,y(v)+5,f'{v:g}',16,GRAY,'end')
        body+=text(100,top-16,title,17,GRAY)
        for values,color in [(PRICE_A,PURPLE),(PRICE_B,TEAL)]:
            points=list(enumerate(values)) if top==135 else [(i+1,v['simple']*100) for i,v in enumerate(price_returns(values))]
            body+=poly([(x(t),y(v)) for t,v in points],color)
            for t,v in points:body+=f'<circle cx="{x(t)}" cy="{y(v):.3f}" r="4" fill="{color}"/>'
        for t in range(6):body+=text(x(t),top+236,str(t),16,GRAY,'middle')
    body+=text(100,393,'A',18,PURPLE)+text(170,393,'B',18,TEAL)+text(900,694,'Trading-day index',17,GRAY,'end')
    save('foundations-prices-returns.svg','Same start and finish, different daily movements','Synthetic price paths A and B start at 100 and end at 104. Their five simple returns differ.',body,725)

def arma():
    body=text(40,82,'ARMA(1,1) with zero mean and innovation variance 1 · theoretical correlations',17,GRAY)
    x=lambda k:100+(k-1)/19*800;y=lambda v:455-(v+.5)/1.5*285
    for v in [-.5,0,.5,1]:body+=line(100,y(v),900,y(v))+text(84,y(v)+5,f'{v:.1f}',16,GRAY,'end')
    for phi,theta,color,dash in [(.6,.3,PURPLE,''),(-.6,.3,TEAL,''),(.6,-.6,GRAY,'')]:
        rho=arma11(phi,theta)['acf'];body+=poly([(x(k),y(rho[k])) for k in range(1,21)],color)
    body+=text(100,123,'φ = 0.6, θ = 0.3',18,PURPLE)+text(370,123,'φ = −0.6, θ = 0.3',18,TEAL)+text(660,123,'φ = 0.6, θ = −0.6',18,GRAY)
    for k in [1,5,10,15,20]:body+=text(x(k),483,str(k),16,GRAY,'middle')
    body+=text(100,153,'Autocorrelation',16,GRAY)+text(900,526,'Lag',17,GRAY,'end')
    save('foundations-arma-acf.svg','AR and MA terms can reinforce or cancel','Three parameter sets: positive decay, alternating signs, and exact cancellation to white noise.',body,555)

def distributions():
    normal=lambda x:math.exp(-x*x/2)/math.sqrt(2*math.pi)
    body=text(40,82,'Both distributions: mean 0, variance 1 · Student-t degrees of freedom = 5',17,GRAY)
    body+=text(100,121,'Normal',18,PURPLE)+text(270,121,'Standardized t(5)',18,TEAL)
    x=lambda z:100+(z+4)/8*360;y=lambda f:425-f/.7*250
    for v in [0,.2,.4,.6]:body+=line(100,y(v),460,y(v))+text(86,y(v)+5,f'{v:.1f}',16,GRAY,'end')
    body+=text(100,155,'Density: center',17,GRAY)
    for z in [-4,-2,0,2,4]:body+=text(x(z),455,str(z),16,GRAY,'middle')
    for func,color in [(normal,PURPLE),(lambda z:standardized_t_pdf(z),TEAL)]:body+=poly([(x(-4+i/50),y(func(-4+i/50))) for i in range(401)],color)
    xx=lambda z:585+(z-2)/6*340;yy=lambda f:425-(math.log10(f)+16)/16*250
    for exponent in [-16,-12,-8,-4,0]:body+=line(585,yy(10**exponent),925,yy(10**exponent))+text(573,yy(10**exponent)+5,f'10^{exponent}',15,GRAY,'end')
    body+=text(585,155,'Density: right tail (log scale)',17,GRAY)
    for z in [2,4,6,8]:body+=text(xx(z),455,str(z),16,GRAY,'middle')
    for func,color in [(normal,PURPLE),(lambda z:standardized_t_pdf(z),TEAL)]:body+=poly([(xx(2+i/50),yy(func(2+i/50))) for i in range(301)],color)
    body+=text(460,493,'Return / SD',17,GRAY,'end')+text(925,493,'Return / SD',17,GRAY,'end')
    save('foundations-distribution-tails.svg','Equal variance does not imply equal tails','Calculated Normal and variance-normalized Student t(5) densities. Right panel uses logarithmic density scale.',body,525)

if __name__=='__main__':prices();arma();distributions()
