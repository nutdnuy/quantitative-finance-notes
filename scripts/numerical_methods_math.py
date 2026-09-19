"""Reproducible European-option examples; Python standard library only.

Constant-parameter GBM, no dividends, no transaction costs, rates in decimals,
time in years. These functions illustrate numerical methods, not market data.
"""
import math
import random
from statistics import NormalDist

NORMAL = NormalDist()
DEFAULT_SEED = 2530401


def _parameters(S, K, r, sigma, T, kind):
    if not all(math.isfinite(v) for v in (S, K, r, sigma, T)):
        raise ValueError("Inputs must be finite")
    if S < 0 or K <= 0 or sigma < 0 or T < 0:
        raise ValueError("Require S>=0, K>0, sigma>=0 and T>=0")
    if kind not in ("call", "put"):
        raise ValueError("kind must be call or put")


def payoff(S, K=100., kind="call"):
    if kind not in ("call", "put"):
        raise ValueError("kind must be call or put")
    return max(S-K, 0.) if kind == "call" else max(K-S, 0.)


def black_scholes(S=100., K=100., r=.03, sigma=.2, T=1., kind="call"):
    """Analytic reference price, with exact zero-time/volatility limits."""
    _parameters(S, K, r, sigma, T, kind)
    discount = math.exp(-r*T)
    if T == 0:
        return payoff(S, K, kind)
    if sigma == 0 or S == 0:
        return discount*payoff(S*math.exp(r*T), K, kind)
    d1 = (math.log(S/K)+(r+.5*sigma*sigma)*T)/(sigma*math.sqrt(T))
    d2 = d1-sigma*math.sqrt(T)
    if kind == "call":
        return S*NORMAL.cdf(d1)-K*discount*NORMAL.cdf(d2)
    return K*discount*NORMAL.cdf(-d2)-S*NORMAL.cdf(-d1)


def black_scholes_greeks(S=100., K=100., r=.03, sigma=.2, T=1., kind="call"):
    """Delta, gamma and calendar-time theta; exclude nonsmooth limits."""
    _parameters(S, K, r, sigma, T, kind)
    if min(S, sigma, T) <= 0:
        raise ValueError("Greeks require S, sigma and T > 0")
    d1 = (math.log(S/K)+(r+.5*sigma*sigma)*T)/(sigma*math.sqrt(T))
    d2 = d1-sigma*math.sqrt(T)
    gamma = NORMAL.pdf(d1)/(S*sigma*math.sqrt(T))
    common = -S*NORMAL.pdf(d1)*sigma/(2*math.sqrt(T))
    if kind == "call":
        delta = NORMAL.cdf(d1)
        theta = common-r*K*math.exp(-r*T)*NORMAL.cdf(d2)
    else:
        delta = NORMAL.cdf(d1)-1
        theta = common+r*K*math.exp(-r*T)*NORMAL.cdf(-d2)
    return {"delta": delta, "gamma": gamma, "theta": theta}


def monte_carlo(S=100., K=100., r=.03, sigma=.2, T=1., kind="call",
                paths=20000, seed=DEFAULT_SEED, checkpoints=()):
    """IID exact GBM terminals, Welford sample variance and approximate 95% CI.

    Python random.Random(seed).gauss draws are reproducible within this example;
    a browser's different RNG need not generate the same sample. All checkpoints
    are prefixes of ONE sample, not independent replications.
    """
    _parameters(S, K, r, sigma, T, kind)
    if isinstance(paths, bool) or not isinstance(paths, int) or paths < 2:
        raise ValueError("paths must be an integer >= 2")
    points = set(checkpoints) | {paths}
    if any(isinstance(n, bool) or not isinstance(n, int) or not 2 <= n <= paths for n in points):
        raise ValueError("Checkpoints must be integers between 2 and paths")
    rng = random.Random(seed)
    mean, m2, terminal_mean = 0., 0., 0.
    discount = math.exp(-r*T)
    drift, diffusion = (r-.5*sigma*sigma)*T, sigma*math.sqrt(T)
    rows = []
    for n in range(1, paths+1):
        terminal = S*math.exp(drift+diffusion*rng.gauss(0., 1.))
        value = discount*payoff(terminal, K, kind)
        delta = value-mean
        mean += delta/n
        m2 += delta*(value-mean)
        terminal_mean += (terminal-terminal_mean)/n
        if n in points:
            sd = math.sqrt(max(m2/(n-1), 0.))
            se = sd/math.sqrt(n)
            rows.append({"paths": n, "price": mean, "sd": sd, "se": se,
                         "lower": mean-1.96*se, "upper": mean+1.96*se})
    return {**rows[-1], "seed": seed, "checkpoints": rows,
            "terminal_mean": terminal_mean,
            "reference": black_scholes(S, K, r, sigma, T, kind)}


def explicit_coefficients(r=.03, sigma=.2, T=1., intervals=80, steps=1000):
    """Return central-difference weights after a sufficient monotonicity check.

    This teaching implementation requires nonnegative r and all three weights.
    More time steps repair negative b; negative a due to r>sigma^2 at i=1
    requires a different drift stencil/model choice, not just a smaller dt.
    """
    if not all(math.isfinite(v) for v in (r, sigma, T)) or r < 0 or sigma <= 0 or T <= 0:
        raise ValueError("Require finite r>=0, sigma>0, T>0")
    if any(isinstance(v, bool) or not isinstance(v, int) for v in (intervals, steps)):
        raise ValueError("Grid counts must be integers")
    if intervals < 3 or steps < 1:
        raise ValueError("Require intervals>=3 and steps>=1")
    dt = T/steps
    coefficients = [(.5*dt*(sigma*sigma*i*i-r*i),
                     1-dt*(sigma*sigma*i*i+r),
                     .5*dt*(sigma*sigma*i*i+r*i)) for i in range(1, intervals)]
    minimum = min(min(row) for row in coefficients)
    if minimum < 0:
        if sigma*sigma < r:
            raise ValueError("Unsafe central drift: a_1<0; more time steps do not fix it")
        raise ValueError("Unsafe explicit time step: negative coefficient; increase steps")
    return coefficients


def finite_difference(S=100., K=100., r=.03, sigma=.2, T=1., kind="call",
                      Smax=400., intervals=80, steps=1000):
    """Explicit European Black-Scholes solver marching forward in tau=T-t.

    Uniform S grid. Call high boundary uses the large-S asymptote; Put high
    boundary uses zero. Both are finite-domain approximations. Greeks use the
    nearest interior node; returned greek_spot makes that location explicit.
    """
    _parameters(S, K, r, sigma, T, kind)
    if not math.isfinite(Smax) or Smax <= max(S, K):
        raise ValueError("Require finite Smax greater than S and K")
    coefficients = explicit_coefficients(r, sigma, T, intervals, steps)
    dS, dt = Smax/intervals, T/steps
    spots = [i*dS for i in range(intervals+1)]
    values = [payoff(s, K, kind) for s in spots]
    for n in range(1, steps+1):
        previous = values
        discount_strike = K*math.exp(-r*n*dt)
        values = [0.]*(intervals+1)
        values[0] = 0. if kind == "call" else discount_strike
        values[-1] = Smax-discount_strike if kind == "call" else 0.
        for i, (a, b, c) in enumerate(coefficients, 1):
            values[i] = a*previous[i-1]+b*previous[i]+c*previous[i+1]
    index = min(int(S/dS), intervals-1)
    weight = S/dS-index
    price = values[index]*(1-weight)+values[index+1]*weight
    greek_index = min(max(round(S/dS), 1), intervals-1)
    delta = (values[greek_index+1]-values[greek_index-1])/(2*dS)
    gamma = (values[greek_index+1]-2*values[greek_index]+values[greek_index-1])/dS**2
    theta = -(values[greek_index]-previous[greek_index])/dt
    return {"price": price, "reference": black_scholes(S, K, r, sigma, T, kind),
            "spots": spots, "values": values, "dS": dS, "dt": dt,
            "delta": delta, "gamma": gamma, "theta": theta,
            "greek_spot": spots[greek_index], "intervals": intervals, "steps": steps,
            "coefficient_min": min(min(row) for row in coefficients)}


def convergence_rows():
    """Coupled refinements keep dt/dS^2 fixed, with the strike on each grid."""
    rows = []
    for intervals in (40, 80, 160, 320):
        steps = 250*(intervals//40)**2
        result = finite_difference(intervals=intervals, steps=steps)
        rows.append({key: result[key] for key in ("intervals", "steps", "dS", "dt", "price", "reference")}
                    | {"error": abs(result["price"]-result["reference"])})
    return rows
