"""Standard-library numerical examples; all observations are simulated."""
import math
import statistics


def uniform(seed):
    state = seed & 0xffffffff
    while True:
        state = (1664525*state + 1013904223) & 0xffffffff
        yield (state+.5)/4294967296


def normal_generator(seed):
    u = uniform(seed)
    while True:
        yield math.sqrt(-2*math.log(next(u)))*math.cos(2*math.pi*next(u))


def return_pair(previous, current, dividend=0):
    assert previous > 0 and current+dividend > 0
    simple = (current+dividend)/previous-1
    return simple, math.log1p(simple)


def moments(values):
    average = statistics.mean(values)
    centered = [x-average for x in values]
    m2 = statistics.mean(x*x for x in centered)
    m4 = statistics.mean(x**4 for x in centered)
    return {'mean': average, 'sd': statistics.stdev(values), 'variance': m2,
            'kurtosis': m4/m2**2 if m2 > 0 else None}


def acf(values, max_lag=20):
    assert 0 <= max_lag < len(values)
    average = statistics.mean(values)
    x = [v-average for v in values]
    denominator = sum(v*v for v in x)
    if denominator == 0:
        return [None]*(max_lag+1)
    return [sum(x[i]*x[i-lag] for i in range(lag,len(x)))/denominator for lag in range(max_lag+1)]


def portmanteau(values, lags=20):
    rho = acf(values,lags)
    if rho[0] is None:
        return None, None
    n = len(values)
    return n*sum(r*r for r in rho[1:]), n*(n+2)*sum(rho[k]**2/(n-k) for k in range(1,lags+1))


def shuffle(values, seed=731):
    out = list(values)
    random = uniform(seed)
    for i in range(len(out)-1,0,-1):
        j = math.floor(next(random)*(i+1))
        out[i],out[j] = out[j],out[i]
    return out


def clustered_returns(seed=2524):
    random = normal_generator(seed)
    return [next(random)*(.005 if (i//50)%2 == 0 else .025) for i in range(600)]


def variance_mixture(p=.2, ratio=5):
    assert 0 <= p <= 1 and ratio >= 1
    variance = 1-p+p*ratio**2
    sd = math.sqrt(variance)
    low, high = 1/sd, ratio/sd
    normal = statistics.NormalDist()
    return {'variance': variance, 'sd': sd, 'low': low, 'high': high,
            'kurtosis': 3*((1-p)+p*ratio**4)/variance**2,
            'density': lambda x: (1-p)*normal.pdf(x/low)/low+p*normal.pdf(x/high)/high,
            'tail': lambda threshold: (1-p)*math.erfc(abs(threshold)/low/math.sqrt(2))+p*math.erfc(abs(threshold)/high/math.sqrt(2))}


def realized_variance(log_prices, stride=1):
    assert isinstance(stride,int) and stride > 0 and (len(log_prices)-1)%stride == 0
    returns = [log_prices[i]-log_prices[i-stride] for i in range(stride,len(log_prices),stride)]
    variance = sum(r*r for r in returns)
    return {'variance':variance, 'volatility':math.sqrt(variance), 'returns':returns, 'count':len(returns)}


def intraday_sample(noise_bps=3, seed=81):
    assert 0 <= noise_bps <= 10
    random, signs = normal_generator(seed), uniform(seed+1000)
    latent = [0]
    for _ in range(390):
        latent.append(latent[-1]+.01/math.sqrt(390)*next(random))
    eta = noise_bps/10000
    observed = [p+eta*(-1 if next(signs)<.5 else 1) for p in latent]
    return {'latent':latent, 'observed':observed, 'eta':eta, 'integrated_variance':.01**2}


def intraday_profile(news=True):
    raw = [1+3*math.exp(-i/6)+2*math.exp(-(77-i)/7)+(5*math.exp(-.5*((i-30)/1.2)**2) if news else 0) for i in range(78)]
    total = sum(raw)
    return [x/total for x in raw]
