"""Deterministic Basel teaching examples using the Python standard library.

Rates and probabilities use decimal fractions, not percentages. Monetary inputs
must share a unit. These simplified examples are not a regulatory filing engine.
"""

import math
from statistics import NormalDist

NORMAL = NormalDist()


def _number(value, name, minimum=0, maximum=None, positive=False):
    if not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f"{name} must be a finite number")
    if value < minimum or (positive and value <= 0):
        raise ValueError(f"{name} is outside its allowed range")
    if maximum is not None and value > maximum:
        raise ValueError(f"{name} is outside its allowed range")


def capital_metrics(cet1, at1, tier2, rwa, exposure):
    """Return nested capital ratios and the Tier 1 leverage ratio."""
    for name, value in (("cet1", cet1), ("at1", at1), ("tier2", tier2)):
        _number(value, name)
    _number(rwa, "rwa", positive=True)
    _number(exposure, "exposure", positive=True)
    tier1 = cet1 + at1
    total = tier1 + tier2
    return dict(cet1=cet1, at1=at1, tier2=tier2, tier1=tier1,
                total_capital=total, rwa=rwa, exposure=exposure,
                cet1_ratio=cet1 / rwa, tier1_ratio=tier1 / rwa,
                total_ratio=total / rwa, leverage_ratio=tier1 / exposure)


def output_floor(model_rwa, standardized_rwa, floor):
    """Apply an assumed aggregate output-floor rate, supplied by the caller."""
    _number(model_rwa, "model_rwa")
    _number(standardized_rwa, "standardized_rwa")
    _number(floor, "floor", maximum=1)
    floor_rwa = floor * standardized_rwa
    return dict(model_rwa=model_rwa, standardized_rwa=standardized_rwa,
                floor_rate=floor, floor_rwa=floor_rwa,
                effective_rwa=max(model_rwa, floor_rwa),
                floor_binds=floor_rwa > model_rwa)


def liquidity_coverage(hqla, outflows, inflows):
    """Simplified 30-day LCR with the ordinary 75% aggregate inflow cap.

    Inputs are already eligible HQLA and weighted regulatory cash flows; this
    function does not determine eligibility, haircuts, run-off rates or waivers.
    """
    _number(hqla, "hqla")
    _number(outflows, "outflows", positive=True)
    _number(inflows, "inflows")
    inflow_cap = .75 * outflows
    admitted = min(inflows, inflow_cap)
    net = outflows - admitted
    return dict(hqla=hqla, outflows=outflows, inflows=inflows,
                inflow_cap=inflow_cap, admitted_inflows=admitted,
                net_outflows=net, ratio=hqla / net)


def stress_probability(pd, rho, confidence=.999):
    """Conditional default probability in the one-factor Gaussian ASRF model."""
    for name, value in (("pd", pd), ("rho", rho), ("confidence", confidence)):
        _number(value, name, maximum=1)
    if not 0 < pd < 1 or not 0 <= rho < 1 or not 0 < confidence < 1:
        raise ValueError("Require 0 < pd, confidence < 1 and 0 <= rho < 1")
    z = (NORMAL.inv_cdf(pd) + math.sqrt(rho) * NORMAL.inv_cdf(confidence))
    return NORMAL.cdf(z / math.sqrt(1 - rho))


def corporate_irb(pd, lgd, maturity, ead):
    """Corporate IRB formula for a non-defaulted exposure, at 99.9%.

    Excludes SME-size adjustments, financial-sector correlation multipliers,
    input/output floors, and the historical 1.06 scaling factor. The caller
    supplies eligible PD, downturn LGD, effective maturity (1 to 5 years) and
    EAD. This calculation does not establish regulatory model approval.
    """
    _number(pd, "pd", maximum=1)
    if not 0 < pd < 1:
        raise ValueError("Require 0 < pd < 1 for a non-defaulted exposure")
    _number(lgd, "lgd", maximum=1)
    _number(maturity, "maturity", minimum=1, maximum=5)
    _number(ead, "ead", positive=True)
    weight = -math.expm1(-50 * pd) / -math.expm1(-50)
    rho = .12 * weight + .24 * (1 - weight)
    b = (.11852 - .05478 * math.log(pd)) ** 2
    denominator = 1 - 1.5 * b
    if denominator <= 0:
        raise ValueError("pd is too small for this maturity-adjustment formula")
    maturity_adjustment = (1 + (maturity - 2.5) * b) / denominator
    stress_pd = stress_probability(pd, rho)
    unexpected_loss_rate = lgd * (stress_pd - pd)
    capital_rate = unexpected_loss_rate * maturity_adjustment
    capital = capital_rate * ead
    return dict(pd=pd, lgd=lgd, maturity=maturity, ead=ead, rho=rho, b=b,
                stress_pd=stress_pd, maturity_adjustment=maturity_adjustment,
                unexpected_loss_rate=unexpected_loss_rate,
                capital_rate=capital_rate, capital=capital,
                rwa=12.5 * capital, risk_weight=12.5 * capital_rate)
