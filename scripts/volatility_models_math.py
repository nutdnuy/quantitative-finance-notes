"""Deterministic ARCH/GARCH teaching examples; Python standard library only.

Returns use decimals (0.01 means 1%). Variances therefore use decimal-return
squared units. The eight observations are handcrafted, not market data.
"""
import math

OMEGA = .000005
ALPHA = .08
BETA = .87
INITIAL_VARIANCE = .0001
EXAMPLE_SHOCK = -.03
EXAMPLE_RETURNS = [.005, -.01, .02, -.03, .01, 0, -.005, .015]


def garch_update(shock, variance, omega=OMEGA, alpha=ALPHA, beta=BETA):
    """Return h_(t+1) after observing epsilon_t and knowing h_t."""
    assert all(math.isfinite(v) for v in (shock, variance, omega, alpha, beta))
    assert variance > 0 and omega > 0 and alpha >= 0 and beta >= 0
    return omega + alpha*shock**2 + beta*variance


def gjr_update(shock, variance, omega=OMEGA, alpha=.03, gamma=.10, beta=BETA):
    """Return GJR h_(t+1), using the indicator epsilon_t < 0."""
    assert all(math.isfinite(v) for v in (shock, variance, omega, alpha, gamma, beta))
    assert variance > 0 and omega > 0 and alpha >= 0 and alpha+gamma >= 0 and beta >= 0
    return omega + (alpha + gamma*(shock < 0))*shock**2 + beta*variance


def long_run_variance(omega, persistence):
    """Finite unconditional variance under unit-variance innovations."""
    assert omega > 0 and 0 <= persistence < 1
    return omega/(1-persistence)


def variance_forecast(first_variance, long_run, persistence, horizon):
    """Return E_t[h_(t+k)], k=1,...,H, for a stationary GARCH recursion.

    The first forecast h_(t+1) is already known at time t. For k>1,
    future squared shocks are replaced by their conditional expectations.
    """
    assert math.isfinite(first_variance) and math.isfinite(long_run)
    assert first_variance > 0 and long_run > 0 and 0 <= persistence < 1
    assert isinstance(horizon, int) and horizon >= 1
    return [long_run + persistence**(k-1)*(first_variance-long_run)
            for k in range(1, horizon+1)]


def persistence_half_life(persistence):
    """Continuous step count for halving a deviation in VARIANCE, not SD."""
    assert 0 < persistence < 1
    return math.log(.5)/math.log(persistence)


def sd_excess_half_life(first_variance, long_run, persistence):
    """Step count to halve sqrt(forecast variance)-sqrt(long-run variance)."""
    assert first_variance > long_run > 0 and 0 < persistence < 1
    target_sd = (math.sqrt(first_variance)+math.sqrt(long_run))/2
    residual_ratio = (target_sd**2-long_run)/(first_variance-long_run)
    return math.log(residual_ratio)/math.log(persistence)


def aggregate_forecast_variance(first_variance, long_run, persistence, horizon):
    """Variance of future residual sum, assuming conditional zero covariances."""
    return sum(variance_forecast(first_variance, long_run, persistence, horizon))


def gaussian_filter(returns, omega=OMEGA, alpha=ALPHA, beta=BETA,
                    mu=0, initial_variance=INITIAL_VARIANCE):
    """Conditional Gaussian log likelihood with a fixed initial variance.

    Each row stores h_t BEFORE seeing r_t. Only after evaluating its density
    is epsilon_t used to produce h_(t+1). The initial h_1 is held fixed across
    the educational parameter grid; it is not estimated from future returns.
    """
    assert math.isfinite(mu) and math.isfinite(initial_variance) and initial_variance > 0
    assert omega > 0 and alpha >= 0 and beta >= 0
    rows, total, variance = [], 0.0, initial_variance
    for time, observed in enumerate(returns, 1):
        assert math.isfinite(observed)
        shock = observed-mu
        contribution = -.5*(math.log(2*math.pi)+math.log(variance)+shock**2/variance)
        rows.append({'time': time, 'return': observed, 'shock': shock,
                     'variance': variance, 'standardized': shock/math.sqrt(variance),
                     'log_likelihood': contribution})
        total += contribution
        variance = garch_update(shock, variance, omega, alpha, beta)
    return {'rows': rows, 'log_likelihood': total, 'next_variance': variance}


def restricted_grid(returns=EXAMPLE_RETURNS, initial_variance=INITIAL_VARIANCE):
    """Compare 15 specified stationary candidates; this is NOT an MLE optimizer."""
    candidates = []
    for omega in [.000003, .000005, .00001]:
        for alpha in [.03, .08, .15]:
            for beta in [.75, .87]:
                if alpha+beta >= 1:
                    continue
                result = gaussian_filter(returns, omega, alpha, beta,
                                         initial_variance=initial_variance)
                candidates.append({'omega': omega, 'alpha': alpha, 'beta': beta,
                                   'log_likelihood': result['log_likelihood']})
    return sorted(candidates, key=lambda row: row['log_likelihood'], reverse=True)


def student_t_unit_variance_scale(degrees_of_freedom):
    """Multiply a conventional t_nu draw by this factor so E[z^2]=1; nu>2."""
    assert degrees_of_freedom > 2
    return math.sqrt((degrees_of_freedom-2)/degrees_of_freedom)


def verify_examples():
    """Hand checks plus chronology and unit-change invariance checks."""
    def close(actual, expected, tol=1e-12):
        assert math.isclose(actual, expected, rel_tol=tol, abs_tol=tol), (actual, expected)

    first = garch_update(EXAMPLE_SHOCK, INITIAL_VARIANCE)
    close(first, .000164)
    close(garch_update(-EXAMPLE_SHOCK, INITIAL_VARIANCE), first)
    close(math.sqrt(first), .012806248474865698)
    long_run = long_run_variance(OMEGA, ALPHA+BETA)
    close(long_run, .0001)
    forecasts = variance_forecast(first, long_run, .95, 5)
    for actual, expected in zip(forecasts, [.000164, .0001608, .00015776, .000154872, .0001521284]):
        close(actual, expected)
    close(aggregate_forecast_variance(first, long_run, .95, 5), .0007895604)
    half_life = persistence_half_life(.95)
    close(.95**half_life, .5)
    close(long_run+.95**half_life*(first-long_run), .000132)
    sd_half_life = sd_excess_half_life(first, long_run, .95)
    sd_after = math.sqrt(long_run+.95**sd_half_life*(first-long_run))
    close(sd_after-math.sqrt(long_run), (math.sqrt(first)-math.sqrt(long_run))/2)
    assert sd_half_life > half_life
    close(gjr_update(.03, INITIAL_VARIANCE), .000119)
    close(gjr_update(-.03, INITIAL_VARIANCE), .000209)
    close(.03+.10/2+.87, .95)  # Requires symmetric, unit-variance innovations.
    filtered = gaussian_filter(EXAMPLE_RETURNS)
    close(filtered['rows'][0]['variance'], INITIAL_VARIANCE)
    close(filtered['rows'][1]['variance'], .000094)
    for index, row in enumerate(filtered['rows']):
        expected = garch_update(row['shock'], row['variance'])
        actual = (filtered['rows'][index+1]['variance'] if index+1 < len(filtered['rows'])
                  else filtered['next_variance'])
        close(actual, expected)
    changed = EXAMPLE_RETURNS[:]
    changed[3] = .06
    perturbed = gaussian_filter(changed)
    for before, after in zip(filtered['rows'][:4], perturbed['rows'][:4]):
        close(before['variance'], after['variance'])
    assert filtered['rows'][4]['variance'] != perturbed['rows'][4]['variance']
    # Changing decimal returns to percentage points scales h and omega by 100^2.
    scale = 100
    scaled = gaussian_filter([scale*r for r in EXAMPLE_RETURNS],
                             omega=OMEGA*scale**2, initial_variance=INITIAL_VARIANCE*scale**2)
    for original, converted in zip(filtered['rows'], scaled['rows']):
        close(converted['variance'], original['variance']*scale**2)
        close(converted['standardized'], original['standardized'])
    close(scaled['log_likelihood'], filtered['log_likelihood']-len(EXAMPLE_RETURNS)*math.log(scale))
    for nu in [3, 5, 10, 30]:
        close(student_t_unit_variance_scale(nu)**2*nu/(nu-2), 1)
    grid = restricted_grid()
    assert len(grid) == 15
    assert all(a['log_likelihood'] >= b['log_likelihood'] for a, b in zip(grid, grid[1:]))
    return {'next_variance': first, 'long_run_variance': long_run,
            'variance_half_life': half_life, 'sd_excess_half_life': sd_half_life,
            'five_day_variance': sum(forecasts),
            'conditional_log_likelihood': filtered['log_likelihood'],
            'grid_candidates': len(grid)}


if __name__ == '__main__':
    import json
    print(json.dumps(verify_examples(), indent=2))
