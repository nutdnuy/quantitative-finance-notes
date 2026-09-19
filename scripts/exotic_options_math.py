"""Independent, standard-library examples for the Exotic Options lesson.

All paths are synthetic. GBM is sampled exactly at equally spaced dates under
Q with zero dividends. Asian fixings exclude S0. Barriers include S0; equality
is a hit. Brownian-bridge weights describe continuous monitoring of a constant
upper barrier under constant-volatility GBM, with zero rebate.
"""
import math
import random
import statistics


DEFAULTS = dict(S0=100, K=100, H=130, r=.03, sigma=.2, T=1,
                steps=12, count=12000, seed=2535)
EXAMPLE_PATHS = [[100, 110, 120, 110, 110], [100, 140, 90, 100, 110]]


def _positive(value, name):
    if not math.isfinite(value) or value <= 0:
        raise ValueError(f'{name} must be positive and finite')


def path_payoffs(prices, K=100, H=130):
    if len(prices) < 2:
        raise ValueError('A path needs S0 and at least one subsequent fixing')
    for price in prices:
        _positive(price, 'price')
    _positive(K, 'K')
    _positive(H, 'H')
    fixings = prices[1:]
    arithmetic = statistics.fmean(fixings)
    geometric = math.exp(statistics.fmean(math.log(p) for p in fixings))
    vanilla = max(prices[-1]-K, 0)
    hit = any(p >= H for p in prices)
    return dict(arithmetic=arithmetic, geometric=geometric,
                vanilla=vanilla, asian=max(arithmetic-K, 0),
                geometric_asian=max(geometric-K, 0),
                out_discrete=0 if hit else vanilla,
                in_discrete=vanilla if hit else 0, hit=hit)


def bridge_survival(start, end, H, sigma, dt):
    """Conditional probability of staying below H throughout one interval."""
    for value, name in [(start, 'start'), (end, 'end'), (H, 'H'), (dt, 'dt')]:
        _positive(value, name)
    if not math.isfinite(sigma) or sigma < 0:
        raise ValueError('sigma must be nonnegative and finite')
    if max(start, end) >= H:
        return 0.0
    if sigma == 0:
        return 1.0
    exponent = -2*math.log(H/start)*math.log(H/end)/(sigma*sigma*dt)
    # -expm1 avoids loss of precision when survival is close to zero.
    return -math.expm1(exponent)


def path_survival(prices, H=130, sigma=.2, T=1):
    if len(prices) < 2:
        raise ValueError('At least two path points are required')
    _positive(T, 'T')
    dt = T/(len(prices)-1)
    return math.prod(bridge_survival(a, b, H, sigma, dt)
                     for a, b in zip(prices, prices[1:]))


def black_scholes_call(S0=100, K=100, r=.03, sigma=.2, T=1):
    for value, name in [(S0, 'S0'), (K, 'K')]:
        _positive(value, name)
    if not all(math.isfinite(v) for v in [r, sigma, T]) or sigma < 0 or T < 0:
        raise ValueError('Invalid Black–Scholes parameters')
    if T == 0:
        return max(S0-K, 0)
    if sigma == 0:
        return max(S0-K*math.exp(-r*T), 0)
    scale = sigma*math.sqrt(T)
    d1 = (math.log(S0/K)+(r+.5*sigma*sigma)*T)/scale
    d2 = d1-scale
    cdf = lambda x: .5*math.erfc(-x/math.sqrt(2))
    return S0*cdf(d1)-K*math.exp(-r*T)*cdf(d2)


def estimate(values):
    if len(values) < 2:
        raise ValueError('At least two independent samples are required for SE')
    mean = statistics.fmean(values)
    sd = statistics.stdev(values)
    se = sd/math.sqrt(len(values))
    return dict(mean=mean, sd=sd, se=se, low=mean-1.96*se,
                high=mean+1.96*se, count=len(values))


def simulate_exotics(S0=100, K=100, H=130, r=.03, sigma=.2, T=1,
                     steps=12, count=12000, seed=2535):
    for value, name in [(S0, 'S0'), (K, 'K'), (H, 'H'), (T, 'T')]:
        _positive(value, name)
    if not all(math.isfinite(v) for v in [r, sigma]) or sigma < 0:
        raise ValueError('Invalid drift or volatility')
    if not isinstance(steps, int) or steps < 1 or not isinstance(count, int) or count < 2:
        raise ValueError('steps and count must be positive integers; count >= 2')
    rng = random.Random(seed)
    dt, discount = T/steps, math.exp(-r*T)
    drift, scale = (r-.5*sigma*sigma)*dt, sigma*math.sqrt(dt)
    values = {name: [] for name in [
        'vanilla', 'asian', 'geometric_asian', 'out_discrete', 'in_discrete',
        'out_continuous', 'in_continuous', 'discounted_stock', 'arithmetic']}
    sample_paths, hits, max_parity_error = [], 0, 0.0
    for index in range(count):
        prices = [S0]
        for _ in range(steps):
            prices.append(prices[-1]*math.exp(drift+scale*rng.gauss(0, 1)))
        payoffs = path_payoffs(prices, K, H)
        survival = path_survival(prices, H, sigma, T)
        continuous_out = payoffs['vanilla']*survival
        for name in ['vanilla', 'asian', 'geometric_asian', 'out_discrete', 'in_discrete']:
            values[name].append(discount*payoffs[name])
        values['out_continuous'].append(discount*continuous_out)
        values['in_continuous'].append(discount*(payoffs['vanilla']-continuous_out))
        values['discounted_stock'].append(discount*prices[-1])
        values['arithmetic'].append(payoffs['arithmetic'])
        for suffix in ['discrete', 'continuous']:
            error = values['out_'+suffix][-1]+values['in_'+suffix][-1]-values['vanilla'][-1]
            max_parity_error = max(max_parity_error, abs(error))
        hits += payoffs['hit']
        if index < 8:
            sample_paths.append(prices)
    return dict(estimates={key: estimate(value) for key, value in values.items()},
                bs_price=black_scholes_call(S0, K, r, sigma, T),
                max_parity_error=max_parity_error, sampled_paths=sample_paths,
                discrete_hit_rate=hits/count)


def update_average(previous, price, fixing):
    if not isinstance(fixing, int) or fixing < 1:
        raise ValueError('fixing must be a positive integer')
    _positive(price, 'price')
    if not math.isfinite(previous):
        raise ValueError('previous average must be finite')
    return ((fixing-1)*previous+price)/fixing


def coupon_bond_value(t, after_payment=False, r=.03, payment_time=.5,
                      coupon=4, maturity=1, principal=100):
    """A deterministic claim; at the coupon date choose the before/after value."""
    if not 0 <= t <= maturity or not 0 < payment_time < maturity:
        raise ValueError('Require 0 <= t <= maturity and 0 < payment_time < maturity')
    value = principal*math.exp(-r*(maturity-t))
    if t < payment_time or (t == payment_time and not after_payment):
        value += coupon*math.exp(-r*(payment_time-t))
    return value


if __name__ == '__main__':
    import json
    result = simulate_exotics()
    result['examples'] = [path_payoffs(path) for path in EXAMPLE_PATHS]
    print(json.dumps(result, indent=2))
