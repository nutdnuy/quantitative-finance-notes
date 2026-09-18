"""Build and execute the Portfolio Optimization & Black-Litterman notebook."""
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
SOURCE_PATH = ROOT / "portfolio-optimization.md"
OUTPUT_PATH = ROOT / "notebooks/portfolio-optimization.ipynb"
source = SOURCE_PATH.read_text()
body = re.sub(r"\A---\n.*?\n---\n", "", source, flags=re.S)
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
assert all(math.isfinite(value) for value in beta_ols + beta_gls)''',
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


def markdown(text):
    text = re.sub(r'<noscript>.*?</noscript>', '', text, flags=re.S)
    text = re.sub(r'<div id="portfolio-optimization-lab"[^>]*></div>', '', text)
    text = re.sub(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', r'[\2](\1)', text, flags=re.S)
    text = text.replace('](notebooks/portfolio-optimization.ipynb)', '](portfolio-optimization.ipynb)')
    text = re.sub(r'<summary>(.*?)</summary>', r'**\1**', text, flags=re.S)
    text = text.replace('<strong>', '**').replace('</strong>', '**')
    text = re.sub(r'</?(?:p|div|section|details|figure|figcaption)\b[^>]*>', '\n', text)
    text = re.sub(r'(?<=\]\()([\w-]+\.html(?:#[^)]*)?)(?=\))', r'../\1', text)
    cell = {
        'cell_type': 'markdown',
        'metadata': {},
        'source': re.sub(r'\n{3,}', '\n\n', text).strip(),
    }
    for asset in set(re.findall(r'assets/images/[\w-]+\.svg', cell['source'])):
        name = Path(asset).name
        payload = (ROOT / asset).read_text()
        cell.setdefault('attachments', {})[name] = {'image/svg+xml': payload}
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


markdown(
    '# Notebook: Portfolio Optimization & Black–Litterman\n\n'
    'ใช้ Python 3 standard library และกด Run All ตามลำดับได้ '
    'ตัวเลขทุกชุดเป็นข้อมูลสมมติสำหรับเรียนรู้ ไม่ใช่ข้อมูลตลาดหรือคำแนะนำการลงทุน '
    'ภาพ SVG ฝังอยู่ใน Notebook แล้ว'
)
markdown(body.split('<section id="', 1)[0])
code(snippets['setup'])
used = {'setup'}
for match in re.finditer(r'<section id="([^"]+)"[^>]*>(.*?)</section>', body, flags=re.S):
    section_id, content = match.groups()
    markdown(content)
    if section_id in snippets:
        code(snippets[section_id])
        used.add(section_id)
for key in (name for name in snippets if name not in used):
    markdown(f'## Python experiment: {key}')
    code(snippets[key])
for index, cell in enumerate(cells):
    cell['id'] = f'portfolio-optimization-{index:02d}'

notebook = {
    'nbformat': 4,
    'nbformat_minor': 5,
    'cells': cells,
    'metadata': {
        'kernelspec': {'display_name': 'Python 3', 'language': 'python', 'name': 'python3'},
        'language_info': {'name': 'python', 'version': sys.version.split()[0], 'file_extension': '.py'},
        'source': {'path': SOURCE_PATH.name, 'sha256': hashlib.sha256(source.encode()).hexdigest()},
        'execution': {
            'method': 'Executed every code cell in one shared namespace; captured stdout',
            'generator': 'scripts/make_portfolio_optimization_notebook.py',
        },
    },
}
OUTPUT_PATH.write_text(json.dumps(notebook, ensure_ascii=False, indent=1) + '\n')
print(
    f'Wrote {OUTPUT_PATH.name}: {len(cells)} cells; '
    f'{sum(cell["cell_type"] == "code" for cell in cells)} executed code cells.'
)
