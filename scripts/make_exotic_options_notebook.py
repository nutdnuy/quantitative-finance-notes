"""Copy canonical prose, embed SVGs, and execute nine self-contained code cells."""
import hashlib
import json
import re
import sys
from pathlib import Path
import make_portfolio_optimization_notebook as nb

ROOT = Path(__file__).resolve().parents[1]
SLUG = 'exotic-options'
SNIPPETS = {
    'same-endpoint': '''for label, path in zip(['A', 'B'], EXAMPLE_PATHS):
    payoff = path_payoffs(path)
    print(label, path, payoff)
first, second = [path_payoffs(path) for path in EXAMPLE_PATHS]
close(first['arithmetic'], 112.5)
close(second['arithmetic'], 110)
close(first['vanilla'], second['vanilla'])
close(first['asian'], 12.5)
close(second['asian'], 10)
close(first['out_discrete'], 10)
close(second['out_discrete'], 0)
print('Payoffs at expiry, not profits or prices today. Fixings exclude S0.')''',
    'cashflow-jumps': '''before = coupon_bond_value(.5)
after = coupon_bond_value(.5, after_payment=True)
close(before-after, 4)
print(f'Just before coupon: {before:.8f}; just after: {after:.8f}')
print(f'Value after + cash received = {after+4:.8f}')
print('The claim drops by 4; total holder wealth has no jump from this payment.')''',
    'risk-neutral-monte-carlo': '''result = simulate_exotics(**DEFAULTS)
estimates = result['estimates']
print('Inputs:', DEFAULTS)
for name in ['vanilla', 'asian', 'out_discrete', 'out_continuous']:
    e = estimates[name]
    print(f"{name:16s}: PV={e['mean']:.6f}, SE={e['se']:.6f}, approximate 95% interval [{e['low']:.6f}, {e['high']:.6f}]")
vanilla = estimates['vanilla']
print(f"Analytic vanilla Black-Scholes: {result['bs_price']:.8f}")
print(f"Monte Carlo minus analytic, in SE units: {(vanilla['mean']-result['bs_price'])/vanilla['se']:.4f}")
assert abs(vanilla['mean']-result['bs_price']) < 4*vanilla['se']
stock = estimates['discounted_stock']
assert abs(stock['mean']-DEFAULTS['S0']) < 4*stock['se']
print('Intervals quantify sampling error under this model, not model uncertainty.')
print('Python uses random.Random; the web lab has a different seeded random stream.')''',
    'barrier-monitoring': '''survival = bridge_survival(120, 125, H=130, sigma=.2, dt=1/12)
print(f'Conditional survival over one interval, endpoints 120 and 125: {survival:.8f}')
assert 0 < survival < 1
close(bridge_survival(100, 130, H=130, sigma=.2, dt=1/12), 0)
for mode in ['discrete', 'continuous']:
    outside = estimates['out_'+mode]['mean']
    inside = estimates['in_'+mode]['mean']
    close(outside+inside, estimates['vanilla']['mean'])
    print(f'{mode}: out {outside:.8f} + in {inside:.8f} = vanilla {outside+inside:.8f}')
assert estimates['out_continuous']['mean'] <= estimates['out_discrete']['mean']
assert result['max_parity_error'] < 1e-10
print('Bridge weights price a continuously monitored constant barrier under GBM.')
print('This changes the contract relative to monthly monitoring; it is not an Asian correction.')''',
    'asian-pde': '''# Arithmetic and geometric averages use exactly the same fixing dates.
for path in result['sampled_paths']:
    payoff = path_payoffs(path)
    assert payoff['geometric'] <= payoff['arithmetic']+1e-12
assert estimates['geometric_asian']['mean'] <= estimates['asian']['mean']
m, r, T = DEFAULTS['steps'], DEFAULTS['r'], DEFAULTS['T']
expected_average = DEFAULTS['S0']*sum(math.exp(r*T*i/m) for i in range(1, m+1))/m
sample_average = estimates['arithmetic']
assert abs(sample_average['mean']-expected_average) < 4*sample_average['se']
print(f'Expected discrete arithmetic average under Q: {expected_average:.8f}')
print(f"Sample average: {sample_average['mean']:.8f}; SE={sample_average['se']:.8f}")
print(f"Geometric Asian call PV={estimates['geometric_asian']['mean']:.8f}")
print(f"Arithmetic Asian call PV={estimates['asian']['mean']:.8f}")
print('The displayed PDE uses a continuous integral; the Monte Carlo Asian above has 12 fixings.')''',
    'similarity-reduction': '''# Verify the change of variables, not a solved option price.
# A polynomial test function lets us check the differential-operator identity.
S, I, t, r, sigma = 100., 70., .7, .03, .2
R = S/I
W = R**3+t*R+2*t
W_R, W_RR, W_t = 3*R**2+t, 6*R, R+2
V, V_S, V_SS, V_I, V_t = I*W, W_R, W_RR/I, W-R*W_R, I*W_t
original = V_t+.5*sigma**2*S**2*V_SS+S*V_I+r*S*V_S-r*V
reduced = I*(W_t+.5*sigma**2*R**2*W_RR+R*(r-R)*W_R-(r-R)*W)
close(original, reduced)
print(f'Original PDE operator: {original:.10f}; I times reduced operator: {reduced:.10f}')
T = 1
close(max(S-I/T, 0), I*max(S/I-1/T, 0))
print('This is the floating-strike call reduction. R=S/I requires I>0.')
print('The polynomial W verifies algebra only; it is not the option-value solution.')''',
    'discrete-updates': '''prices = EXAMPLE_PATHS[0][1:]
average, running_sum, maximum = 0., 0., -math.inf
for i, price in enumerate(prices, 1):
    average = update_average(average, price, i)
    running_sum += price
    maximum = max(maximum, price)
    close(average, running_sum/i)
    print(f'Fixing {i}: S={price}, sum={running_sum:.1f}, average={average:.4f}, maximum={maximum}')
close(average, 112.5)
close(maximum, 120)
# No cash is paid merely because an average is updated.
old_average, new_price, i = 115., 110., 3
new_average = update_average(old_average, new_price, i)
print(f'At fixing {i}, V_before(S,{old_average},t) = V_after(S,{new_average:.6f},t).')
print('Updating relabels the state; it does not subtract a coupon from value.')''',
    'exercises': '''# A nested monitoring illustration: all coarse dates occur in finer grids.
constructed = [100, 110, 125, 138, 118, 111, 106, 113, 110]
payoffs = []
for stride in [8, 2, 1]:
    monitored = constructed[::stride]
    p = path_payoffs(monitored, K=100, H=130)
    payoffs.append(p['out_discrete'])
    print(f'{len(monitored)} dates including S0: hit={p["hit"]}, out payoff={p["out_discrete"]}')
assert payoffs == [10, 10, 0]
# Degenerate cases and exact identities are useful checks for any implementation.
close(black_scholes_call(sigma=0), max(100-100*math.exp(-.03), 0))
close(black_scholes_call(T=0), 0)
close(path_survival([100, 100, 100], H=100), 0)
for path in EXAMPLE_PATHS:
    p = path_payoffs(path)
    close(p['out_discrete']+p['in_discrete'], p['vanilla'])
print('All checks passed. Synthetic examples only; no market calibration performed.')''',
}


def build_notebook():
    source = (ROOT/f'{SLUG}.md').read_text()
    body = re.sub(r'\A---\n.*?\n---\n', '', source, flags=re.S)
    body = re.sub(r'<div id="[^"]*-lab"[^>]*></div>', '', body)
    nb.cells, nb.namespace = [], {}
    nb.markdown('# Python lab: Exotic Options\n\nใช้ Python standard library กด Run All ตามลำดับ ภาพประกอบฝังไว้ในไฟล์แล้ว ทุกตัวอย่างเป็นข้อมูลสมมติ ไม่มีเงินปันผล และ Asian ไม่นับราคาเริ่มต้นเป็น fixing')
    nb.markdown(body.split('<section id="', 1)[0])
    helper = (ROOT/'scripts/exotic_options_math.py').read_text().split("\nif __name__ == '__main__':", 1)[0]
    nb.code(helper+'''\n\ndef close(a, b, tol=1e-10):
    assert math.isclose(a, b, rel_tol=tol, abs_tol=tol), (a, b)
print('Loaded self-contained standard-library functions. No external downloads.')''')
    used = []
    for match in re.finditer(r'<section id="([^"]+)"[^>]*>(.*?)</section>', body, re.S):
        name, content = match.groups()
        nb.markdown(content)
        if name in SNIPPETS:
            nb.code(SNIPPETS[name])
            used.append(name)
    if set(used) != set(SNIPPETS):
        raise ValueError(f'Missing or duplicated sections: used={used}')
    for i, cell in enumerate(nb.cells):
        cell['id'] = f'exotic-options-{i:02d}'
    assert sum(c['cell_type'] == 'code' for c in nb.cells) == 9
    notebook = {'nbformat': 4, 'nbformat_minor': 5, 'cells': nb.cells, 'metadata': {
        'kernelspec': {'display_name': 'Python 3', 'language': 'python', 'name': 'python3'},
        'language_info': {'name': 'python', 'version': sys.version.split()[0]},
        'source': {'path': f'{SLUG}.md', 'sha256': hashlib.sha256(source.encode()).hexdigest()},
        'execution': {'method': 'Executed all nine code cells in one fresh namespace; captured stdout',
                      'generator': 'scripts/make_exotic_options_notebook.py'},
        'model': {'inputs': DEFAULT_NOTEBOOK_INPUTS, 'data': 'Synthetic; no dividends; constant-parameter GBM under Q',
                  'monitoring': 'Asian excludes S0; barriers include S0; bridge weights for continuous barriers'}}}
    (ROOT/f'notebooks/{SLUG}.ipynb').write_text(json.dumps(notebook, ensure_ascii=False, indent=1)+'\n')
    print(f'Wrote {SLUG}.ipynb: {len(nb.cells)} cells, 9 executed code cells.')


DEFAULT_NOTEBOOK_INPUTS = dict(S0=100, K=100, H=130, r=.03, sigma=.2, T=1,
                              steps=12, count=12000, seed=2535)

if __name__ == '__main__':
    build_notebook()
