"""Generate and execute the Basel notebook from the canonical lesson and helpers."""

import hashlib
import json
import re
import sys
from pathlib import Path

import make_portfolio_optimization_notebook as nb


ROOT = Path(__file__).resolve().parents[1]
SLUG = "regulation-basel"
SNIPPETS = {
    "bank-balance-sheet": ['''# All monetary amounts in this notebook are hypothetical THB millions.
assets, liabilities = 1000, 940
equity = assets - liabilities
close(equity, 60)
for loss, expected_equity in [(40, 20), (70, -10)]:
    remaining_assets = assets - loss
    remaining_equity = remaining_assets - liabilities
    close(remaining_equity, expected_equity)
    print(f"Asset loss={loss}; assets={remaining_assets}; liabilities={liabilities}; equity={remaining_equity}")
cash, withdrawals = 40, 100
cash_shortfall = max(withdrawals - cash, 0)
close(cash_shortfall, 60)
print(f"Before asset losses: equity={equity}, but immediate cash shortfall={cash_shortfall}")
print("Positive equity and timely payment are different questions. Capital is not a separate cash reserve.")'''],
    "capital-and-rwa": ['''# CET1 is included in Tier 1; Tier 1 is included in total capital.
minimum = (.045, .06, .08)
with_conservation = tuple(rate + .025 for rate in minimum)
for rwa in [600, 900]:
    metrics = capital_metrics(60, 10, 20, rwa, 1000)
    ratios = tuple(metrics[key] for key in ["cet1_ratio", "tier1_ratio", "total_ratio"])
    passes_minimum = all(actual >= limit for actual, limit in zip(ratios, minimum))
    fills_conservation = all(actual >= limit for actual, limit in zip(ratios, with_conservation))
    assert passes_minimum
    assert fills_conservation == (rwa == 600)
    print(f"RWA={rwa}: CET1={ratios[0]:.4%}, Tier 1={ratios[1]:.4%}, total={ratios[2]:.4%}")
    print(f"  Minima 4.5/6/8% met: {passes_minimum}; full CCB 7/8.5/10.5% met: {fills_conservation}")
print("CCB must be CET1. These comparisons exclude CCyB, systemic buffers and Pillar 2 requirements.")
print("AT1 and Tier 2 amounts are examples; higher-quality CET1 can replace them.")'''],
    "leverage-and-floor": ['''# The leverage denominator is a regulatory exposure measure, not simply accounting assets.
for exposure, expected_ratio in [(1000, .07), (2500, .028)]:
    metrics = capital_metrics(60, 10, 20, 600, exposure)
    close(metrics["leverage_ratio"], expected_ratio)
    print(f"Tier 1=70; exposure={exposure}; leverage={metrics['leverage_ratio']:.2%}; >=3%: {metrics['leverage_ratio'] >= .03}")
for rate, expected_rwa in [(.50, 400), (.725, 580)]:
    floored = output_floor(400, 800, rate)
    close(floored["effective_rwa"], expected_rwa)
    metrics = capital_metrics(60, 10, 20, floored["effective_rwa"], 1000)
    print(f"Assumed floor={rate:.1%}: effective RWA={floored['effective_rwa']:.1f}; 8% minimum capital={.08*floored['effective_rwa']:.1f}")
    print(f"  Unchanged total capital=90; total capital ratio={metrics['total_ratio']:.4%}")
close(output_floor(700, 800, .725)["effective_rwa"], 700)
print("72.5% is the fully phased-in international benchmark, not a statement of every country's current rule.")
print("The floor compares aggregate RWA; it is not a per-loan risk-weight floor.")'''],
    "liquidity-coverage": ['''# Inputs already reflect HQLA eligibility and regulatory cash-flow weights.
for inflow, expected_net in [(40, 120), (150, 40), (200, 40)]:
    lcr = liquidity_coverage(120, 160, inflow)
    close(lcr["net_outflows"], expected_net)
    close(lcr["inflow_cap"], 120)
    print(f"Inflows={inflow}; admitted inflows={lcr['admitted_inflows']:.1f}; net outflows={lcr['net_outflows']:.1f}; LCR={lcr['ratio']:.2%}")
close(liquidity_coverage(120, 160, 150)["ratio"], 3)
print("Inflows cannot erase more than 75% of stressed outflows in this simplified calculation.")
print("The 100% comparison is for normal conditions; HQLA is usable during stress, subject to supervisory review.")'''],
    "stable-funding": ['''# These weights are assumed for teaching, not classifications of actual bank instruments.
funding = [(100, 1.00), (500, .95), (400, 0.00)]
asset_funding_needs = [(100, 0.00), (200, .05), (700, .85)]
asf = sum(amount * weight for amount, weight in funding)
rsf = sum(amount * weight for amount, weight in asset_funding_needs)
close(sum(amount for amount, _ in funding), 1000)
close(sum(amount for amount, _ in asset_funding_needs), 1000)
close(asf, 575)
close(rsf, 605)
print(f"Initial ASF={asf}; RSF={rsf}; NSFR={asf/rsf:.4%}")
# Replace 50 of the zero-weight funding with 100%-weight funding; total funding stays 1000.
revised_funding = [(150, 1.00), (500, .95), (350, 0.00)]
revised_asf = sum(amount * weight for amount, weight in revised_funding)
close(sum(amount for amount, _ in revised_funding), 1000)
close(revised_asf, 625)
assert asf/rsf < 1 < revised_asf/rsf
print(f"Revised ASF={revised_asf}; unchanged RSF={rsf}; NSFR={revised_asf/rsf:.4%}")'''],
    "expected-credit-loss": ['''pd, lgd, ead = .01, .45, 100
loss_if_default = lgd * ead
expected_loss = pd * loss_if_default
close(loss_if_default, 45)
close(expected_loss, .45)
print(f"Loss if default={loss_if_default:.2f}; unconditional expected loss={expected_loss:.2f}")
# Equal marginal PD: compare independent defaults with perfectly shared defaults.
independent_outcomes = [(0, (1-pd)**2), (loss_if_default, 2*pd*(1-pd)), (2*loss_if_default, pd**2)]
shared_outcomes = [(0, 1-pd), (2*loss_if_default, pd)]
for label, outcomes in [("Independent", independent_outcomes), ("Shared", shared_outcomes)]:
    mean_loss = sum(loss * probability for loss, probability in outcomes)
    close(sum(probability for _, probability in outcomes), 1)
    close(mean_loss, 2*expected_loss)
    print(f"{label} defaults: portfolio EL={mean_loss:.2f}; P(two defaults)={outcomes[-1][1]:.4%}")
print("Dependence changes joint tail losses while this example's marginal expected losses stay the same.")'''],
    "asrf-model": ['''pd, confidence = .01, .999
for rho in [0, .12, .24]:
    stressed = stress_probability(pd, rho, confidence)
    if rho == 0:
        close(stressed, pd)
    print(f"Asset correlation={rho:.0%}: stressed conditional PD={stressed:.6%}; excess over PD={stressed-pd:.6%}")
# Finite portfolio: two independent loans, unit loss per default.
n = 2
probabilities = [math.comb(n, k) * pd**k * (1-pd)**(n-k) for k in range(n+1)]
close(sum(probabilities), 1)
at_least_one = 1-probabilities[0]
close(at_least_one, .0199)
cumulative, var = 0, None
for defaults, probability in enumerate(probabilities):
    cumulative += probability
    if cumulative >= confidence:
        var = defaults
        break
finite_el = n * pd
assert var == 1
close(var-finite_el, .98)
asymptotic_excess = n * (stress_probability(pd, 0, confidence)-pd)
close(asymptotic_excess, 0)
print("Finite two-loan probabilities:", probabilities)
print(f"P(at least one default)={at_least_one:.4%}; VaR99.9={var}; EL={finite_el:.2f}; VaR-EL={var-finite_el:.2f}")
print(f"ASRF rho=0 excess approximation={asymptotic_excess:.6f}; granularity assumption fails for two loans.")'''],
    "irb-formula": ['''base_irb = corporate_irb(.01, .45, 2.5, 100)
close(base_irb["capital_rate"], .07385344111364114)
close(base_irb["capital"], 7.385344111364114)
close(.08 * base_irb["rwa"], base_irb["capital"])
close(corporate_irb(.01, .45, 1, 100)["maturity_adjustment"], 1)
assert base_irb["maturity_adjustment"] > 1
print(f"PD=1%, LGD=45%, M=2.5 years, EAD=100: EL={.01*.45*100:.2f}")
for key in ["rho", "stress_pd", "maturity_adjustment", "capital_rate", "capital", "risk_weight", "rwa"]:
    print(f"  {key}: {base_irb[key]:.10f}")
print("K is a fraction of EAD; capital and RWA are monetary amounts. M=2.5 does not make MA equal one.")''', '''# Recalculate PDF page 54 (slide 53); use sqrt(1-rho), not sqrt(1-rho**2).
pdf_examples = [
    (.0012, .60, .05599330043484108),
    (.023, .45, .12076398455928555),
]
for pd, lgd, expected_k in pdf_examples:
    result = corporate_irb(pd, lgd, 5, 1)
    close(result["capital_rate"], expected_k)
    excess_pd = result["stress_pd"] - pd
    print(f"PD={pd:.4%}, LGD={lgd:.0%}, M=5, EAD=1:")
    print(f"  rho={result['rho']:.6%}; stressed PD={result['stress_pd']:.6%}; stressed PD minus PD={excess_pd:.6%}")
    print(f"  b={result['b']:.9f}; MA={result['maturity_adjustment']:.9f}; K={result['capital_rate']:.6%}")
print("The slide's 3.78% / 17.86% values are excess PD, not stressed conditional PD itself.")
print("Both examples use the same corrected formula as the lesson; no additional historical 1.06 multiplier.")'''],
    "model-limits": ['''# With PD, LGD and maturity fixed, this simplified IRB capital is linear in EAD.
double_ead = corporate_irb(.01, .45, 2.5, 200)
for key in ["capital_rate", "risk_weight"]:
    close(double_ead[key], base_irb[key])
for key in ["capital", "rwa"]:
    close(double_ead[key], 2*base_irb[key])
print(f"EAD 100 -> 200: capital {base_irb['capital']:.6f} -> {double_ead['capital']:.6f}; K and RW unchanged.")
# Euler's identity for this additive, differentiable, degree-one example.
weights = [100, 80]
unit_capital = [corporate_irb(.01, .45, 2.5, 1)["capital_rate"],
                corporate_irb(.023, .45, 5, 1)["capital_rate"]]
def portfolio_capital(exposures):
    return sum(exposure * k for exposure, k in zip(exposures, unit_capital))
total = portfolio_capital(weights)
contributions = [weight * marginal for weight, marginal in zip(weights, unit_capital)]
close(sum(contributions), total)
close(portfolio_capital([2*w for w in weights]), 2*total)
print(f"Marginal capital per unit EAD={unit_capital}")
print(f"Euler contributions EAD_i * marginal_i={contributions}; sum={sum(contributions):.6f}; capital={total:.6f}")
print("Summing bare derivatives would omit the EAD weights. This does not validate Euler differentiation for empirical VaR.")'''],
}


def build_notebook():
    source = (ROOT / f"{SLUG}.md").read_text()
    body = re.sub(r"\A---\n.*?\n---\n", "", source, flags=re.S)
    body = re.sub(r'<div id="basel-[\w-]+-lab"></div>', "", body)
    helper_path = ROOT / "scripts/basel_math.py"
    helper = helper_path.read_text()
    nb.cells, nb.namespace = [], {}
    nb.markdown("# Python lab: Regulation and Basel III / IV\n\n"
                "ใช้ Python 3 standard library กด Run All ตามลำดับ ตัวอย่างทั้งหมดเป็นข้อมูลสมมติ "
                "หน่วยเงินคือล้านบาท เว้นแต่ระบุเป็นอย่างอื่น ภาพ SVG ฝังในไฟล์แล้ว "
                "สูตรมีไว้ศึกษาและไม่ใช่เครื่องมือยื่นรายงานกำกับ")
    preamble, _, _ = body.partition('<section id="')
    nb.markdown(preamble)
    nb.code(helper + '''\n\ndef close(actual, expected, tol=1e-10):
    assert math.isclose(actual, expected, rel_tol=tol, abs_tol=tol), (actual, expected)
print("Loaded self-contained Basel helpers. Standard library only; no remote downloads.")''')
    end = len(preamble)
    seen = set()
    for match in re.finditer(r'<section id="([^"]+)"[^>]*>(.*?)</section>', body, flags=re.S):
        between = body[end:match.start()]
        if between.strip():
            nb.markdown(between)
        section_id, content = match.groups()
        nb.markdown(content)
        for snippet in SNIPPETS.get(section_id, []):
            nb.code(snippet)
        seen.add(section_id)
        end = match.end()
    if body[end:].strip():
        nb.markdown(body[end:])
    missing = set(SNIPPETS) - seen
    if missing:
        raise ValueError(f"Lesson sections missing for notebook examples: {sorted(missing)}")
    for index, cell in enumerate(nb.cells):
        cell["id"] = f"basel-{index:02d}"
    notebook = {
        "nbformat": 4,
        "nbformat_minor": 5,
        "cells": nb.cells,
        "metadata": {
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"name": "python", "version": sys.version.split()[0]},
            "source": {"path": f"{SLUG}.md", "sha256": hashlib.sha256(source.encode()).hexdigest()},
            "math_source": {"path": "scripts/basel_math.py", "sha256": hashlib.sha256(helper.encode()).hexdigest()},
            "execution": {
                "method": "Executed every code cell in one fresh namespace; captured stdout",
                "generator": "scripts/make_basel_notebook.py",
            },
        },
    }
    output = ROOT / f"notebooks/{SLUG}.ipynb"
    output.write_text(json.dumps(notebook, ensure_ascii=False, indent=1) + "\n")
    code_count = sum(cell["cell_type"] == "code" for cell in nb.cells)
    print(f"Wrote {output.name}: {len(nb.cells)} cells, {code_count} executed code cells.")


if __name__ == "__main__":
    build_notebook()
