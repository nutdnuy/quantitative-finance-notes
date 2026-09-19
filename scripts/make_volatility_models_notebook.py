"""Create and execute the self-contained notebook from the canonical lesson."""
import hashlib
import json
import re
import sys
from pathlib import Path
import make_portfolio_optimization_notebook as nb

ROOT = Path(__file__).resolve().parents[1]
SLUG = 'volatility-models-arch'
SECTIONS = ['volatility-definitions', 'arch-framework', 'garch-recursion',
            'worked-update', 'stationarity', 'stylized-facts', 'forecasting',
            'aggregate-risk', 'asymmetric-gjr', 'arch-in-mean', 'likelihood',
            'residual-checks', 'hypothesis-tests', 'extensions', 'exercises', 'sources']

SNIPPETS = {
    'volatility-definitions': '''h_today = INITIAL_VARIANCE
print(f"Daily conditional variance h = {h_today:.6f} decimal-return squared")
print(f"Daily conditional SD = {math.sqrt(h_today):.4%}")
print(f"The same variance in percentage-point squared = {h_today*10000:.4f} %^2")
print("SD and variance are different quantities; h is known before today's return.")''',
    'arch-framework': '''shock = EXAMPLE_SHOCK
standardized_shock = shock/math.sqrt(h_today)
close(standardized_shock, -3)
print(f"Observed shock {shock:.2%}, conditional SD {math.sqrt(h_today):.2%}, z = {standardized_shock:.2f}")
print("One observed z is not a distribution; the model assumes E[z|past]=0 and E[z^2|past]=1.")''',
    'worked-update': '''contributions = [OMEGA, ALPHA*shock**2, BETA*h_today]
first = garch_update(shock,h_today)
close(sum(contributions),.000164)
close(first,.000164)
close(garch_update(-shock,h_today),first)
print("Variance contributions:", [f"{v:.8f}" for v in contributions])
print(f"Next variance h = {first:.6f}; next daily SD = {math.sqrt(first):.6%}")
print(f"Annualized display convention only, using sqrt(252): {math.sqrt(252*first):.6%}")
print("This display conversion is not a 252-day GARCH forecast.")''',
    'stationarity': '''rho = ALPHA+BETA
V = long_run_variance(OMEGA,rho)
close(V,.0001)
print(f"Persistence rho = {rho:.4f}; finite unconditional variance = {V:.6f}")
print(f"Long-run daily SD = {math.sqrt(V):.4%}")
fourth_moment_coefficient = 3*ALPHA**2+2*ALPHA*BETA+BETA**2
close(fourth_moment_coefficient,.9153)
print(f"Gaussian GARCH fourth-moment coefficient = {fourth_moment_coefficient:.6f} < 1")
print("alpha+beta<1 gives a finite second moment; finite fourth moments need a stronger condition.")''',
    'stylized-facts': '''# Gaussian innovations can still give an unconditional leptokurtic GARCH mixture.
unconditional_kurtosis = 3*(1-rho**2)/(1-rho**2-2*ALPHA**2)
assert unconditional_kurtosis > 3
print(f"Theoretical unconditional kurtosis under these Gaussian GARCH assumptions = {unconditional_kurtosis:.6f}")
print("This is a model implication when the fourth moment exists, not an empirical estimate.")''',
    'forecasting': '''forecasts = variance_forecast(first,V,rho,60)
close(forecasts[0],first)
close(forecasts[1],.0001608)
print(" k   forecast variance   sqrt(forecast variance), daily")
for k in [1,2,5,10,20,60]:
    print(f"{k:2d}   {forecasts[k-1]:.10f}         {math.sqrt(forecasts[k-1]):.6%}")
variance_half = persistence_half_life(rho)
sd_half = sd_excess_half_life(first,V,rho)
close(rho**variance_half,.5)
assert sd_half > variance_half
print(f"Steps to halve excess variance = {variance_half:.6f}")
print(f"Steps to halve excess square-root forecast SD = {sd_half:.6f}")
print("Steps are measured after k=1. The two half-lives differ because the square root is nonlinear.")
print("sqrt(E[h]) is not E[sqrt(h)]. The former is the conditional SD of the future innovation.")''',
    'aggregate-risk': '''H = 5
aggregate = aggregate_forecast_variance(first,V,rho,H)
close(aggregate,.0007895604)
constant_first = H*first
print(f"Sum of {H} forecast variances = {aggregate:.10f}; aggregate SD = {math.sqrt(aggregate):.6%}")
print(f"Holding first-day risk constant: H*h1 = {constant_first:.10f}; SD = {math.sqrt(constant_first):.6%}")
assert aggregate < constant_first
print("Variance addition assumes future residuals have zero conditional pairwise covariances.")
print("A variance forecast alone does not specify a multi-day return quantile or VaR.")''',
    'asymmetric-gjr': '''for value in [-.03,.03]:
    symmetric = garch_update(value,h_today)
    asymmetric = gjr_update(value,h_today)
    print(f"Shock {value:+.2%}: GARCH h={symmetric:.6f}, GJR h={asymmetric:.6f}")
close(gjr_update(-.03,h_today),.000209)
close(gjr_update(.03,h_today),.000119)
close(.03+.10/2+.87,rho)
print("GJR persistence alpha+beta+gamma/2 assumes symmetric unit-variance innovations.")''',
    'likelihood': '''result = gaussian_filter(EXAMPLE_RETURNS)
print("Handcrafted returns, decimals:",EXAMPLE_RETURNS)
print(" t   r_t        h_t before r_t     z_t       log-density")
for row in result['rows']:
    print(f"{row['time']:2d}  {row['return']:+.5f}   {row['variance']:.10f}   {row['standardized']:+.5f}   {row['log_likelihood']:.6f}")
print(f"Conditional Gaussian log likelihood = {result['log_likelihood']:.9f}")
close(result['rows'][0]['variance'],.0001)
close(result['rows'][1]['variance'],.000094)

# Perturb r_4: its own prior variance h_4 must not change; h_5 must change.
perturbed_returns = EXAMPLE_RETURNS[:]
perturbed_returns[3] = .06
perturbed = gaussian_filter(perturbed_returns)
for before,after in zip(result['rows'][:4],perturbed['rows'][:4]):
    close(before['variance'],after['variance'])
assert result['rows'][4]['variance'] != perturbed['rows'][4]['variance']
print("No lookahead check passed: changing r_4 affects h_5, not h_4.")

# A density changes numerically when returns are expressed in different units.
scaled = gaussian_filter([100*r for r in EXAMPLE_RETURNS],
                         omega=OMEGA*10000,initial_variance=INITIAL_VARIANCE*10000)
close(scaled['log_likelihood'],result['log_likelihood']-len(EXAMPLE_RETURNS)*math.log(100))
print("Unit-change check passed: log L_percent = log L_decimal - n*log(100).")

candidates = restricted_grid()
assert len(candidates)==15
print("Top 3 of 15 specified stationary candidates; same mu=0 and h1=0.0001:")
for candidate in candidates[:3]:
    print(candidate)
print("Best on this restricted grid is not a continuous-parameter MLE or a fitted market model.")''',
    'residual-checks': '''z = [row['standardized'] for row in result['rows']]
print(f"Illustrative residual mean = {sum(z)/len(z):.6f}")
print(f"Illustrative mean z^2 = {sum(value*value for value in z)/len(z):.6f}")
print("Eight handcrafted observations are inadequate for claims about model adequacy.")
print("For an estimated model, inspect standardized residual dependence, squared dependence, tails and out-of-sample forecasts.")''',
    'extensions': '''for nu in [3,5,10,30]:
    factor = student_t_unit_variance_scale(nu)
    conventional_variance = nu/(nu-2)
    close(factor**2*conventional_variance,1)
    print(f"nu={nu:2d}: Var(T)={conventional_variance:.6f}; z=T*{factor:.6f}; Var(z)=1")
print("For nu<=2, conventional Student t has no finite variance; h cannot retain this unit-variance interpretation.")''',
    'exercises': '''checks = verify_examples()
print("All deterministic assertions passed:")
for name,value in checks.items():
    print(name, value)
print("Try changing the shock magnitude, persistence or grid; keep return and variance units consistent.")''',
}


if __name__ == '__main__':
    source = (ROOT/f'{SLUG}.md').read_text(encoding='utf-8')
    body = re.sub(r'\A---\n.*?\n---\n', '', source, flags=re.S)
    body = re.sub(r'<div id="[\w-]+-lab"[^>]*></div>', '', body)
    matches = list(re.finditer(r'<section id="([^"]+)"[^>]*>(.*?)</section>', body, re.S))
    found = [match.group(1) for match in matches]
    missing = set(SECTIONS)-set(found)
    assert not missing, f'Missing expected lesson sections: {sorted(missing)}'
    nb.cells, nb.namespace = [], {'__name__': 'notebook'}
    nb.markdown('# Python lab: Volatility Models — ARCH/GARCH\n\nใช้ Python standard library และกด Run All ตามลำดับ ตัวเลขกับผลตอบแทนแปดค่าเป็นข้อมูลสมมติ ภาพทั้งสามฝังอยู่ใน Notebook แล้ว ไม่มีการดาวน์โหลดข้อมูลตลาด')
    nb.markdown(body.split('<section id="', 1)[0])
    helper = (ROOT/'scripts/volatility_models_math.py').read_text(encoding='utf-8')
    helper = helper.split("\nif __name__ == '__main__':", 1)[0]
    nb.code(helper+'''\n\ndef close(actual, expected, tol=1e-12):
    assert math.isclose(actual,expected,rel_tol=tol,abs_tol=tol),(actual,expected)
print("Loaded self-contained daily variance calculations; all examples are hypothetical.")''')
    for match in matches:
        section_id, content = match.groups()
        nb.markdown(content)
        if section_id in SNIPPETS:
            nb.code(SNIPPETS[section_id])
    for index, cell in enumerate(nb.cells):
        cell['id'] = f'arch-{index:02d}'
    attachments = {name for cell in nb.cells for name in cell.get('attachments', {})}
    assert {'arch-update.svg', 'arch-forecast.svg', 'arch-news-impact.svg'} <= attachments
    notebook = {'nbformat': 4, 'nbformat_minor': 5, 'cells': nb.cells, 'metadata': {
        'kernelspec': {'display_name': 'Python 3', 'language': 'python', 'name': 'python3'},
        'language_info': {'name': 'python', 'version': sys.version.split()[0]},
        'source': {'path': f'{SLUG}.md', 'sha256': hashlib.sha256(source.encode()).hexdigest()},
        'execution': {'method': 'Executed every code cell in one fresh namespace; captured stdout',
                      'generator': 'scripts/make_volatility_models_notebook.py'},
        'data': {'kind': 'handcrafted hypothetical daily returns; no empirical market data',
                 'units': 'decimal returns and decimal-return squared variances'}}}
    output = ROOT/f'notebooks/{SLUG}.ipynb'
    output.write_text(json.dumps(notebook, ensure_ascii=False, indent=1)+'\n', encoding='utf-8')
    print(f'Wrote {output.name}: {len(nb.cells)} cells; '
          f'{sum(cell["cell_type"] == "code" for cell in nb.cells)} executed code cells; '
          f'{len(attachments)} embedded figures.')
