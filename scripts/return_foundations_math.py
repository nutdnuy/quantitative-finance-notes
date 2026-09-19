"""Independent stdlib calculations for the prices / stochastic process lessons."""
import math
import statistics
from stylized_facts_math import normal_generator, moments

PRICE_A=[100,102,101,103,102,104]
PRICE_B=[100,98,103,99,106,104]

def price_returns(prices):
    assert len(prices)>1 and all(p>0 and math.isfinite(p) for p in prices)
    return [{'simple':p/prices[i]-1,'log':math.log(p/prices[i])} for i,p in enumerate(prices[1:])]

def summary_stats(values):
    stats=moments(values)
    m3=statistics.mean((x-stats['mean'])**3 for x in values)
    return dict(stats,skewness=m3/stats['variance']**1.5 if stats['variance']>0 else None)

def arma11(phi,theta,innovation_variance=1,max_lag=20):
    assert abs(phi)<1 and innovation_variance>0
    numerator=1+theta*theta+2*phi*theta
    first=(phi+theta)*(1+phi*theta)/numerator
    return {'variance':innovation_variance*numerator/(1-phi*phi),'acf':[1]+[first*phi**(k-1) for k in range(1,max_lag+1)]}

def simulate_arma(phi,theta,count=600,seed=303):
    arma11(phi,theta)
    random=normal_generator(seed);out=[];previous=previous_shock=0
    for i in range(count+1000):
        shock=next(random);value=phi*previous+shock+theta*previous_shock
        if i>=1000:out.append(value)
        previous,previous_shock=value,shock
    return out

def fractional_weights(d,count=20):
    weights=[1]
    for j in range(1,count):weights.append(weights[-1]*(j-1-d)/j)
    return weights

def arfima_acf(d,max_lag=20):
    assert -.5<d<.5
    rho=[1]
    for k in range(1,max_lag+1):rho.append(rho[-1]*(k-1+d)/(k-d))
    return rho

def calendar_acf(strength=1,noise_sd=.01,max_lag=15):
    means=[v*strength for v in [-.004,.001,.001,.001,.001]]
    average=statistics.mean(means);a=[v-average for v in means]
    between=statistics.mean(x*x for x in a);variance=between+noise_sd**2
    return {'means':means,'between':between,'variance':variance,'acf':[1]+[statistics.mean(a[d]*a[(d-k)%5] for d in range(5))/variance for k in range(1,max_lag+1)]}

def squared_linear_correlation(psi,c4=0,innovation_variance=1,lag=1):
    gamma0=innovation_variance*sum(x*x for x in psi)
    gamma=innovation_variance*sum(psi[j]*psi[j+lag] for j in range(max(0,len(psi)-lag)))
    variance=2*gamma0**2+c4*sum(x**4 for x in psi)
    assert variance>0
    return (2*gamma**2+c4*sum(psi[j]**2*psi[j+lag]**2 for j in range(max(0,len(psi)-lag))))/variance

def standardized_t_pdf(x,nu=5):
    assert nu>2
    coefficient=math.exp(math.lgamma((nu+1)/2)-math.lgamma(nu/2))/math.sqrt(math.pi*(nu-2))
    return coefficient*(1+x*x/(nu-2))**(-(nu+1)/2)
