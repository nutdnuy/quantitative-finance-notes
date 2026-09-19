"""Generalized European Black-Scholes-Merton sensitivities; standard library.

All derivatives hold the other independent inputs fixed. Volatility and rates
are decimals, T is years, and calendar-time Greeks are MINUS T derivatives.
The probability outputs refer to expiry under the specified lognormal Q model.
"""
import math
from statistics import NormalDist


def normal_cdf(x):
    return .5 * math.erfc(-x / math.sqrt(2))


def normal_pdf(x):
    return math.exp(-.5 * x * x) / math.sqrt(2 * math.pi)


def _sign(kind):
    if kind not in ('call', 'put'):
        raise ValueError("kind must be 'call' or 'put'")
    return 1 if kind == 'call' else -1


def greeks(S=100, K=100, r=.05, b=.05, sigma=.2, T=1, kind='call'):
    """Price and raw analytic Greeks, for strictly positive S, K, sigma and T.

    rho_fixed_b holds carry b fixed. rho_fixed_yield changes b one-for-one
    with r, as when the continuous yield q=r-b is fixed. No expiry or
    zero-volatility limits are silently assigned to singular Greeks.
    """
    if not all(math.isfinite(x) for x in (S, K, r, b, sigma, T)):
        raise ValueError('Inputs must be finite')
    if min(S, K, sigma, T) <= 0:
        raise ValueError('S, K, sigma and T must be strictly positive')
    sign = _sign(kind)
    root = math.sqrt(T)
    a = math.exp((b-r)*T)
    discount = math.exp(-r*T)
    d1 = (math.log(S/K)+(b+.5*sigma*sigma)*T)/(sigma*root)
    d2 = d1-sigma*root
    n1 = normal_pdf(d1)
    p1, p2 = normal_cdf(sign*d1), normal_cdf(sign*d2)
    price = sign*(S*a*p1-K*discount*p2)
    delta = sign*a*p1
    gamma = a*n1/(S*sigma*root)
    vega = S*a*n1*root
    d1_T = (b+.5*sigma*sigma)/(sigma*root)-d1/(2*T)
    theta = -S*a*n1*sigma/(2*root)-(b-r)*S*delta-sign*r*K*discount*p2
    return {
        'price': price,
        'd1': d1,
        'd2': d2,
        'delta': delta,
        'elasticity': S*delta/price if price > 0 else None,
        'gamma': gamma,
        'vega': vega,
        'theta': theta,
        'charm': -(b-r)*delta-a*n1*d1_T,
        'vanna': -a*n1*d2/sigma,
        'vomma': vega*d1*d2/sigma,
        'speed': -gamma/S*(1+d1/(sigma*root)),
        'zomma': gamma*(d1*d2-1)/sigma,
        'color': -gamma*((b-r)-d1*d1_T-1/(2*T)),
        'veta': -vega*((b-r)-d1*d1_T+1/(2*T)),
        'strike_delta': -sign*discount*p2,
        'strike_gamma': discount*normal_pdf(d2)/(K*sigma*root),
        'itm_probability': p2,
        'terminal_density': normal_pdf(d2)/(K*sigma*root),
        'probability_delta': sign*normal_pdf(d2)/(S*sigma*root),
        'probability_vega': -sign*normal_pdf(d2)*d1/sigma,
        'probability_calendar': -sign*normal_pdf(d2)*(d1_T-sigma/(2*root)),
        'rho_fixed_b': -T*price,
        'rho_fixed_yield': sign*T*K*discount*p2,
        'carry': T*S*delta,
    }


def strike_from_delta(delta, S=100, r=.05, b=.05, sigma=.2, T=1, kind='call'):
    """Invert signed spot Delta, excluding endpoint and premium-adjusted deltas."""
    _ = greeks(S=S, r=r, b=b, sigma=sigma, T=T, kind=kind)
    sign = _sign(kind)
    probability = sign*delta/math.exp((b-r)*T)
    if not 0 < probability < 1:
        raise ValueError('Delta must lie strictly inside its signed carry-adjusted range')
    d1 = sign*NormalDist().inv_cdf(probability)
    return S*math.exp((b+.5*sigma*sigma)*T-d1*sigma*math.sqrt(T))


def strike_from_probability(probability, S=100, b=.05, sigma=.2, T=1, kind='call'):
    """Invert Q probability of ending ITM under fixed lognormal parameters."""
    _ = greeks(S=S, b=b, sigma=sigma, T=T, kind=kind)
    if not 0 < probability < 1:
        raise ValueError('Probability must lie strictly between zero and one')
    d2 = _sign(kind)*NormalDist().inv_cdf(probability)
    return S*math.exp((b-.5*sigma*sigma)*T-d2*sigma*math.sqrt(T))


def delta_mirror(S, K, b, sigma, T):
    """The strike whose opposite option has the same absolute spot Delta."""
    return S*S*math.exp((2*b+sigma*sigma)*T)/K


def probability_mirror(S, K, b, sigma, T):
    """The opposite-option strike with equal expiry ITM probability."""
    return S*S*math.exp((2*b-sigma*sigma)*T)/K


def central_difference(function, x, h):
    if not math.isfinite(h) or h <= 0:
        raise ValueError('h must be finite and positive')
    return (function(x+h)-function(x-h))/(2*h)
