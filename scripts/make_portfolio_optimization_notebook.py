"""Build and execute the two independent optimization lesson notebooks."""
import base64
import contextlib
import hashlib
import io
import itertools
import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
cells = []
namespace = {}

snippets = {
    "setup": '''import itertools
import math

def close(actual, expected, tol=1e-9):
    assert math.isclose(actual, expected, rel_tol=tol, abs_tol=tol), (actual, expected)

def dot(a, b):
    return sum(x*y for x, y in zip(a, b))

def transpose(a):
    return [list(column) for column in zip(*a)]

def matmul(a, b):
    bt = transpose(b)
    return [[dot(row, column) for column in bt] for row in a]

def matvec(a, x):
    return [dot(row, x) for row in a]

def solve(a, b):
    augmented = [list(row) + [value] for row, value in zip(a, b)]
    n = len(augmented)
    assert all(len(row) == n + 1 for row in augmented)
    for column in range(n):
        pivot = max(range(column, n), key=lambda row: abs(augmented[row][column]))
        assert abs(augmented[pivot][column]) > 1e-14, "singular system"
        augmented[column], augmented[pivot] = augmented[pivot], augmented[column]
        scale = augmented[column][column]
        augmented[column] = [value/scale for value in augmented[column]]
        for row in range(n):
            if row == column:
                continue
            factor = augmented[row][column]
            augmented[row] = [left-factor*right for left, right in zip(augmented[row], augmented[column])]
    return [row[-1] for row in augmented]

def variance(weights, covariance):
    return dot(weights, matvec(covariance, weights))

MU = [.05, .07, .15, .27]
SD = [.07, .12, .30, .60]
CORR = [
    [1, .8, .5, .4],
    [.8, 1, .7, .5],
    [.5, .7, 1, .8],
    [.4, .5, .8, 1],
]
SIGMA = [[CORR[i][j]*SD[i]*SD[j] for j in range(4)] for i in range(4)]
ONE = [1.0]*4
RF = .025
print("Hypothetical one-year simple returns. Python standard library only.")''',
    "covariance-inputs": '''expected_sigma = [
    [.0049, .00672, .0105, .0168],
    [.00672, .0144, .0252, .036],
    [.0105, .0252, .09, .144],
    [.0168, .036, .144, .36],
]
for row, expected in zip(SIGMA, expected_sigma):
    for actual, target in zip(row, expected):
        close(actual, target, 1e-12)
print("Sigma = diag(SD) @ Corr @ diag(SD)")
for row in SIGMA:
    print("  ", [round(value, 6) for value in row])''',
    "regression-optimization": '''# A small deterministic regression example with an intercept.
x = [-2, -1, 0, 1, 2]
y = [-2.7, -1.0, 1.2, 2.8, 5.1]
X = [[value, 1.0] for value in x]
Xt = transpose(X)
beta_ols = solve(matmul(Xt, X), matvec(Xt, y))
residuals = [actual-predicted for actual, predicted in zip(y, matvec(X, beta_ols))]
print(f"OLS slope={beta_ols[0]:.6f}, intercept={beta_ols[1]:.6f}, SSE={dot(residuals,residuals):.6f}")

# GLS with a known residual covariance. Compute Omega^-1 X and Omega^-1 y by solving systems.
OMEGA = [
    [1.0, .25, 0, 0, 0],
    [.25, 1.5, .2, 0, 0],
    [0, .2, .8, .15, 0],
    [0, 0, .15, 1.2, .25],
    [0, 0, 0, .25, 1.8],
]
omega_inv_y = solve(OMEGA, y)
omega_inv_X_columns = [solve(OMEGA, column) for column in transpose(X)]
omega_inv_X = transpose(omega_inv_X_columns)
beta_gls = solve(matmul(Xt, omega_inv_X), matvec(Xt, omega_inv_y))
print(f"GLS slope={beta_gls[0]:.6f}, intercept={beta_gls[1]:.6f}")
assert all(math.isfinite(value) for value in beta_ols + beta_gls)

# The same exact whitening transform shown in the lesson figure.
L = [[2.0, 0.0], [.8, .6]]
I = [[1.0, 0.0], [0.0, 1.0]]
L_inv = transpose([solve(L, col) for col in transpose(I)])
model_covariance = matmul(L, transpose(L))
whitened_covariance = matmul(matmul(L_inv, model_covariance), transpose(L_inv))
for row, expected in zip(whitened_covariance, I):
    for value, target in zip(row, expected):
        close(value, target)
print("Whitened model covariance:", whitened_covariance)''',
    "target-return-portfolio": '''inverse_one = solve(SIGMA, ONE)
inverse_mu = solve(SIGMA, MU)
A = dot(ONE, inverse_one)
B = dot(MU, inverse_one)
C = dot(MU, inverse_mu)
D = A*C-B*B

def minimum_variance_target(target, indices=range(4)):
    indices = list(indices)
    cov = [[SIGMA[i][j] for j in indices] for i in indices]
    means = [MU[i] for i in indices]
    ones = [1.0]*len(indices)
    inv_one = solve(cov, ones)
    inv_mu = solve(cov, means)
    a, b, c = dot(ones, inv_one), dot(means, inv_one), dot(means, inv_mu)
    d = a*c-b*b
    budget_multiplier = (c-b*target)/d
    return_multiplier = (a*target-b)/d
    weights = [budget_multiplier*x + return_multiplier*y for x, y in zip(inv_one, inv_mu)]
    return weights, budget_multiplier, return_multiplier

w10, gamma, lam = minimum_variance_target(.10)
expected = [.528412108337758, .172888075206605, .159764342703102, .138935473752535]
for actual, target in zip(w10, expected):
    close(actual, target)
close(sum(w10), 1)
close(dot(w10, MU), .10)
close(gamma, -.010501299717696)
close(lam, .365279369427286)
print("Target 10% weights:", [f"{100*w:.4f}%" for w in w10])
print(f"Expected return={100*dot(w10,MU):.4f}%, volatility={100*math.sqrt(variance(w10,SIGMA)):.4f}%")''',
    "frontier-solutions": '''w_gmv = [value/A for value in inverse_one]
close(sum(w_gmv), 1)
close(dot(w_gmv, MU), B/A)
close(variance(w_gmv, SIGMA), 1/A)
print("GMV weights:", [f"{100*w:.4f}%" for w in w_gmv])
print(f"GMV return={100*dot(w_gmv,MU):.4f}%, volatility={100*math.sqrt(variance(w_gmv,SIGMA)):.4f}%")

excess = [value-RF for value in MU]
direction = solve(SIGMA, excess)
w_tangency = [value/sum(direction) for value in direction]
tangency_return = dot(w_tangency, MU)
tangency_sd = math.sqrt(variance(w_tangency, SIGMA))
print("Tangency weights:", [f"{100*w:.4f}%" for w in w_tangency])
print(f"Return={100*tangency_return:.4f}%, volatility={100*tangency_sd:.4f}%, Sharpe={(tangency_return-RF)/tangency_sd:.6f}")

target = .10
risky_scale = (target-RF)/(tangency_return-RF)
w_risky = [risky_scale*value for value in w_tangency]
w_safe = 1-sum(w_risky)
close(w_safe, -.245107788138614)
print(f"Funded target 10%: risky total={100*sum(w_risky):.4f}%, risk-free={100*w_safe:.4f}%")''',
    "black-litterman": '''MARKET = [.05, .40, .45, .10]
LAMBDA_MARKET = 2.24
TAU = 1/120
P = [[-1, 0, 1, 0], [0, 1, 0, 0]]
Q = [.10, .03]
prior = [LAMBDA_MARKET*value for value in matvec(SIGMA, MARKET)]
tau_sigma = [[TAU*value for value in row] for row in SIGMA]
projected = matmul(matmul(P, tau_sigma), transpose(P))
omega = [[projected[i][i] if i == j else 0.0 for j in range(2)] for i in range(2)]
system = [[projected[i][j]+omega[i][j] for j in range(2)] for i in range(2)]
innovation = [q-p for q, p in zip(Q, matvec(P, prior))]
view_update = solve(system, innovation)
posterior_adjustment = matvec(matmul(tau_sigma, transpose(P)), view_update)
posterior = [base+change for base, change in zip(prior, posterior_adjustment)]
expected_posterior = [.016781811019405, .037552435573995, .124842704859425, .227173738447279]
for actual, target in zip(posterior, expected_posterior):
    close(actual, target)
weights = [value/LAMBDA_MARKET for value in solve(SIGMA, posterior)]
risk_free = 1-sum(weights)
close(risk_free, .234140487785057)
print("Prior excess returns:", [f"{100*x:.4f}%" for x in prior])
print("Posterior excess returns:", [f"{100*x:.4f}%" for x in posterior])
print("Posterior risky weights:", [f"{100*x:.4f}%" for x in weights])
print(f"Risk-free weight={100*risk_free:.4f}%")''',
    "inequality-constraints": '''# Enumerate active sets for this four-asset teaching example.
def long_only_target(target):
    best = None
    for size in range(2, 5):
        for indices in itertools.combinations(range(4), size):
            try:
                active_weights, _, _ = minimum_variance_target(target, indices)
            except (AssertionError, ZeroDivisionError):
                continue
            if min(active_weights) < -1e-10:
                continue
            full = [0.0]*4
            for index, value in zip(indices, active_weights):
                full[index] = value
            candidate = variance(full, SIGMA)
            if best is None or candidate < best[0]:
                best = candidate, full
    assert best is not None
    return best

long_only_variance, w_long = long_only_target(.20)
expected = [0, .026315789473684, .539473684210526, .434210526315789]
for actual, target in zip(w_long, expected):
    close(actual, target)
close(sum(w_long), 1)
close(dot(w_long, MU), .20)
print("Long-only target 20% weights:", [f"{100*w:.4f}%" for w in w_long])
print(f"Volatility={100*math.sqrt(long_only_variance):.4f}%; w1 constraint is binding.")''',
    "benchmark-active": '''benchmark = [.20, .30, .35, .15]
portfolio = [.15, .36, .39, .10]
active = [p-b for p, b in zip(portfolio, benchmark)]
close(sum(active), 0)
tracking_error = math.sqrt(variance(active, SIGMA))
print("Active weights:", [f"{100*w:+.2f}%" for w in active])
print(f"Net active weight={100*sum(active):.2f}%, tracking error={100*tracking_error:.4f}%")''',
}

snippets['constraint-experiment'] = """def constrained_point(c, mode="inequality"):
    nu = 4*(2-c)/3
    if mode == "inequality":
        nu = max(0, nu)
    elif mode == "none":
        nu = 0
    x, y = 1-nu/2, 1-nu/4
    return x, y, nu, (x-1)**2+2*(y-1)**2

for c in [1, 2, 3]:
    for mode in ["none", "equality", "inequality"]:
        x, y, nu, objective = constrained_point(c, mode)
        print(f"{mode:10s} c={c}: point=({x:.4f},{y:.4f}), multiplier={nu:.4f}, f={objective:.4f}")
        close(2*(x-1)+nu, 0)
        close(4*(y-1)+nu, 0)
        if mode == "inequality":
            assert x+y <= c+1e-10 and nu >= 0
            close(nu*(x+y-c), 0)
"""

snippets['target-experiment'] = """for target in [.10, .20, .30]:
    unconstrained, _, _ = minimum_variance_target(target)
    print(f"Target {target:.0%}: short allowed SD={math.sqrt(variance(unconstrained,SIGMA)):.4%}")
    if not min(MU) <= target <= max(MU):
        print("Long-only: infeasible (target outside convex hull of means)")
    else:
        v, weights = long_only_target(target)
        print(f"Long-only weights={weights}, SD={math.sqrt(v):.4%}")
"""

snippets['experiments'] = """def update_views(q_values, enabled=(True, True), scales=(1, 1), investor_lambda=2.24):
    indices = [i for i in range(2) if enabled[i]]
    if not indices:
        updated = prior[:]
    else:
        rows = [P[i] for i in indices]
        projected = matmul(matmul(rows, tau_sigma), transpose(rows))
        system = [[projected[i][j] + (scales[indices[i]]*projected[i][i] if i == j else 0)
                   for j in range(len(indices))] for i in range(len(indices))]
        delta = solve(system, [q_values[i]-dot(P[i],prior) for i in indices])
        correction = matvec(matmul(tau_sigma,transpose(rows)),delta)
        updated = [p+d for p,d in zip(prior,correction)]
    weights = [x/investor_lambda for x in solve(SIGMA,updated)]
    return updated, weights, 1-sum(weights)

no_views, market_again, cash = update_views(Q, enabled=(False,False))
for actual, expected in zip(market_again, MARKET):
    close(actual, expected)
close(cash, 0)
for enabled, scales, q in [((True,False),(.25,1),Q), ((True,True),(1,4),Q), ((True,True),(1,1),[-.10,-.05])]:
    updated, weights, cash = update_views(q, enabled, scales)
    print(f"views={enabled}, Omega multipliers={scales}, Q={q}")
    print("Posterior:", updated, "Weights:", weights, "Risk-free:", cash)
"""


snippets['bayes-foundation'] = '''prior_event = .50
signal_if_event, signal_if_not_event = .70, .30
marginal = signal_if_event*prior_event + signal_if_not_event*(1-prior_event)
posterior_event = signal_if_event*prior_event/marginal
close(marginal, .50)
close(posterior_event, .70)
print(f"Illustrative event Bayes: prior={prior_event:.0%}, posterior={posterior_event:.0%}")
print("This binary-event example is separate from the Gaussian BL expected-return model.")'''

snippets['posterior-uncertainty'] = '''K = matmul(tau_sigma, transpose(P))
# Solve (P tau Sigma P' + Omega) Z = K' one column at a time.
Z = transpose([solve(system, row) for row in K])
reduction = matmul(K, Z)
M = [[tau_sigma[i][j]-reduction[i][j] for j in range(4)] for i in range(4)]
expected_diagonal = [2.7664972316625232e-5, 5.476629739153461e-5,
                     .00032039215253564017, .0019606964734960497]
for i in range(4):
    close(M[i][i], expected_diagonal[i], tol=1e-12)
    assert 0 < M[i][i] <= tau_sigma[i][i]
    for j in range(4):
        close(M[i][j], M[j][i], tol=1e-12)
# Check uncertainty reduction on independent test directions.
for v in [[1,0,0,0],[1,1,1,1],[-1,0,1,0],[.2,-.4,.7,-.1]]:
    assert dot(v,matvec(M,v)) > 0
    assert dot(v,matvec(reduction,v)) >= -1e-12
print("Posterior covariance of the mean (not return covariance):")
for row in M:
    print([f"{value:.10f}" for value in row])
print("Prior view means:", matvec(P, prior))
print("View innovation Q-P prior:", innovation)
print("Predictive covariance would be Sigma+M under the additional conditional-return model.")'''

snippets['mixed-estimation'] = '''# Independently reconstruct the GLS/precision normal equations.
identity = [[float(i==j) for j in range(4)] for i in range(4)]
prior_precision = transpose([solve(tau_sigma,col) for col in transpose(identity)])
omega_inverse_P = transpose([solve(omega,col) for col in transpose(P)])
view_precision = matmul(transpose(P),omega_inverse_P)
precision = [[prior_precision[i][j]+view_precision[i][j] for j in range(4)] for i in range(4)]
prior_rhs = matvec(prior_precision,prior)
view_rhs = matvec(transpose(P),solve(omega,Q))
gls_mean = solve(precision,[a+b for a,b in zip(prior_rhs,view_rhs)])
gls_covariance = transpose([solve(precision,col) for col in transpose(identity)])
for i in range(4):
    close(gls_mean[i],posterior[i],tol=1e-10)
    for j in range(4):
        close(gls_covariance[i][j],M[i][j],tol=1e-12)
print("GLS and Bayesian means agree:", gls_mean)
print("Inverse precision and covariance-update forms agree entry by entry.")'''

snippets['risk-aversion-allocation'] = '''direction = solve(SIGMA,posterior)
for investor_lambda in [.1,1,2.24,6]:
    weights = [x/investor_lambda for x in direction]
    cash = 1-sum(weights)
    close(sum(weights)+cash,1)
    # First-order condition of the mean-variance objective.
    for marginal_risk, expected_return in zip(matvec(SIGMA,weights),posterior):
        close(investor_lambda*marginal_risk,expected_return)
    print(f"lambda={investor_lambda}: risky weights={[round(100*w,4) for w in weights]}, risk-free={100*cash:.4f}%")
print("Market lambda remains 2.24. Lambda=1 is not universally exact Kelly for annual simple returns.")'''


def markdown(text):
    text = re.sub(r'<h1[^>]*>(.*?)</h1>', r'# \1', text)
    text = re.sub(r'<noscript>.*?</noscript>', '', text, flags=re.S)
    text = re.sub(r'<div id="(?:portfolio-optimization|black-litterman|constraint-learning|target-portfolio)-lab"[^>]*></div>', '', text)
    text = re.sub(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', r'[\2](\1)', text, flags=re.S)
    text = re.sub(r'\]\(notebooks/([\w-]+\.ipynb)\)', r'](\1)', text)
    text = re.sub(r'\]\(((?:assets/diagrams|data)/[^)]+)\)', r'](../\1)', text)
    text = re.sub(r'<summary>(.*?)</summary>', r'**\1**', text, flags=re.S)
    text = text.replace('<strong>', '**').replace('</strong>', '**')
    text = re.sub(r'</?(?:p|div|section|details|figure|figcaption)\b[^>]*>', '\n', text)
    text = re.sub(r'(?<=\]\()([\w-]+\.html(?:#[^)]*)?)(?=\))', r'../\1', text)
    cell = {
        'cell_type': 'markdown',
        'metadata': {},
        'source': re.sub(r'\n{3,}', '\n\n', text).strip(),
    }
    for asset in sorted(set(re.findall(r'assets/images/[\w-]+\.(?:svg|jpg)', cell['source']))):
        name = Path(asset).name
        mime = 'image/svg+xml' if asset.endswith('.svg') else 'image/jpeg'
        payload = (ROOT / asset).read_text() if asset.endswith('.svg') else base64.b64encode((ROOT / asset).read_bytes()).decode('ascii')
        cell.setdefault('attachments', {})[name] = {mime: payload}
        cell['source'] = cell['source'].replace(f']({asset})', f'](attachment:{name})')
    cells.append(cell)


def code(text):
    count = sum(cell['cell_type'] == 'code' for cell in cells) + 1
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        exec(compile(text, f'portfolio_optimization_cell_{count}', 'exec'), namespace)
    cells.append({
        'cell_type': 'code',
        'metadata': {},
        'source': text,
        'execution_count': count,
        'outputs': [{'output_type': 'stream', 'name': 'stdout', 'text': output.getvalue()}],
    })


def build_notebook(slug, title):
    global cells, namespace
    cells, namespace = [], {}
    source_path = ROOT / f'{slug}.md'
    output_path = ROOT / f'notebooks/{slug}.ipynb'
    source = source_path.read_text()
    body = re.sub(r"\A---\n.*?\n---\n", "", source, flags=re.S)
    markdown(f'# Notebook: {title}\n\nใช้ Python 3 standard library และกด Run All ตามลำดับได้ ตัวเลขเป็นข้อมูลสมมติ ภาพประกอบฝังอยู่ในไฟล์แล้ว')
    markdown(body.split('<section id="', 1)[0])
    code(snippets['setup'])
    for match in re.finditer(r'<section id="([^"]+)"[^>]*>(.*?)</section>', body, flags=re.S):
        section_id, content = match.groups()
        markdown(content)
        if section_id in snippets and not (slug == 'portfolio-optimization' and section_id in ('black-litterman', 'experiments')):
            code(snippets[section_id])
    for index, cell in enumerate(cells):
        cell['id'] = f'{slug}-{index:02d}'
    notebook = {
        'nbformat': 4, 'nbformat_minor': 5, 'cells': cells,
        'metadata': {
            'kernelspec': {'display_name': 'Python 3', 'language': 'python', 'name': 'python3'},
            'language_info': {'name': 'python', 'version': sys.version.split()[0], 'file_extension': '.py'},
            'source': {'path': source_path.name, 'sha256': hashlib.sha256(source.encode()).hexdigest()},
            'execution': {'method': 'Executed every code cell in a fresh namespace for each notebook; captured stdout', 'generator': 'scripts/make_portfolio_optimization_notebook.py'},
        },
    }
    output_path.write_text(json.dumps(notebook, ensure_ascii=False, indent=1) + '\n')
    print(f'Wrote {output_path.name}: {len(cells)} cells; {sum(c["cell_type"] == "code" for c in cells)} executed code cells.')


if __name__ == '__main__':
    build_notebook('portfolio-optimization', 'Optimization Problem')
    build_notebook('black-litterman', 'Black–Litterman Portfolio')
