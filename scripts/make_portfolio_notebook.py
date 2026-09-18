"""Build the local Portfolio Theory notebook and execute every code cell."""
import base64
import contextlib
import hashlib
import io
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
source = (ROOT / 'portfolio-theory.md').read_text()
body = re.sub(r'\A---\n.*?\n---\n', '', source, flags=re.S)
cells, namespace = [], {}

snippets = {
    'setup': '''import math
from fractions import Fraction
def close(actual, expected, tol=1e-10):
    assert math.isclose(actual, expected, rel_tol=tol, abs_tol=tol), (actual, expected)
MU_A, MU_B, SD_A, SD_B, RHO, RF = .12, .06, .20, .10, .20, .02
def portfolio(w, rho=RHO):
    mean = w*MU_A + (1-w)*MU_B
    variance = w*w*SD_A**2 + (1-w)**2*SD_B**2 + 2*w*(1-w)*rho*SD_A*SD_B
    sd = math.sqrt(max(0, variance))
    return mean, variance, sd
print("Hypothetical one-year simple total returns. Python standard library only.")''',
    'two-assets': '''mu, variance, sd = portfolio(.5)
close(mu, .09); close(variance, .0145)
print(f"50/50: mean {100*mu:.4f}%, variance {variance:.6f}, SD {100*sd:.4f}%")
for rho in (1, .2, 0, -1):
    print(f"rho={rho:4.1f}, 50/50 SD={100*portfolio(.5,rho)[2]:.4f}%")
close(portfolio(.5, 1)[2], .15)
close(portfolio(.5, -1)[2], .05)''',
    'minimum-variance': '''cov = RHO*SD_A*SD_B
w_gmv = (SD_B**2-cov)/(SD_A**2+SD_B**2-2*cov)
close(w_gmv, 1/7)
mu_gmv, var_gmv, sd_gmv = portfolio(w_gmv)
assert all(portfolio(i/10000)[1] >= var_gmv-1e-14 for i in range(10001))
print(f"GMV: A {100*w_gmv:.6f}%, B {100*(1-w_gmv):.6f}%, mean {100*mu_gmv:.6f}%, SD {100*sd_gmv:.6f}%")''',
    'tangency': '''# Solve the two-by-two system Sigma z = mu - rf*1.
cov = RHO*SD_A*SD_B
det = SD_A**2*SD_B**2-cov**2
z_a = (SD_B**2*(MU_A-RF)-cov*(MU_B-RF))/det
z_b = (SD_A**2*(MU_B-RF)-cov*(MU_A-RF))/det
w_t = z_a/(z_a+z_b)
mu_t, var_t, sd_t = portfolio(w_t)
sharpe = (mu_t-RF)/sd_t
close(w_t, 7/17); close(var_t, 88/7225)
assert all((portfolio(i/10000)[0]-RF)/portfolio(i/10000)[2] <= sharpe+1e-12 for i in range(10001))
print(f"Tangency: A {100*w_t:.6f}%, mean {100*mu_t:.6f}%, SD {100*sd_t:.6f}%, Sharpe {sharpe:.6f}")
for y in (.5, 1, 1.5):
    print(f"Risky weight={y:.1f}, risk-free weight={1-y:.1f}: mean={100*(RF+y*(mu_t-RF)):.4f}%, SD={100*abs(y)*sd_t:.4f}%")
zero_mean, zero_var, zero_sd = portfolio(1/3, -1)
close(zero_var, 0); close(zero_mean, .08)
print(f"rho=-1: zero-variance return={100*zero_mean:.1f}%; spread above rf={100*(zero_mean-RF):.1f} percentage points. Inconsistent with frictionless no-arbitrage.")''',
    'diversification': '''for n in (1, 5, 10, 50, 100):
    sd = .2*math.sqrt(.2+.8/n)
    independent_sd = .2/math.sqrt(n)
    print(f"N={n:3}: SD with rho=.2: {100*sd:.4f}%; rho=0: {100*independent_sd:.4f}%")
print(f"Limit for rho=.2: {100*.2*math.sqrt(.2):.4f}%")
close(.2**2*(.2+.8/50), .00864)
assert -.1 < -1/(50-1)  # Invalid constant pairwise correlation for 50 assets.''',
    'capm': '''market_mean, beta = .08, 1.2
capm_mean = RF+beta*(market_mean-RF)
close(capm_mean, .092)
print(f"CAPM expected return with beta 1.2 = {100*capm_mean:.2f}%")
market_sd, residual_sd = .15, .10
total_variance = beta**2*market_sd**2 + residual_sd**2
print(f"Single-factor total SD: {100*math.sqrt(total_variance):.4f}%")
print(f"100 equal-weight assets with independent same-size residuals: {100*math.sqrt(beta**2*market_sd**2+residual_sd**2/100):.4f}%")''',
    'performance': '''mu_p, sd_p, beta_p, mu_m = .11, .15, 1.2, .08
sharpe_p = (mu_p-RF)/sd_p
treynor = (mu_p-RF)/beta_p
alpha = mu_p-RF-beta_p*(mu_m-RF)
active_mean, tracking_error = .03, .06
ir = active_mean/tracking_error
close(sharpe_p, .6); close(treynor, .075); close(alpha, .018); close(ir,.5)
print(f"Hypothetical expected metrics: Sharpe={sharpe_p:.4f}; Treynor={treynor:.4f}; alpha={100*alpha:.2f}%; IR={ir:.2f}")
print("These inputs are assumed expectations, not evidence of realized managerial skill.")''',
    'shortfall': '''mu, _, sd = portfolio(.5)
threshold = 0
safety_first = (mu-threshold)/sd
normal_shortfall = .5*math.erfc(safety_first/math.sqrt(2))
print(f"Assuming Normal one-year portfolio return: SFR={safety_first:.6f}, Pr(return<0)={100*normal_shortfall:.4f}%")
assert 0 < normal_shortfall < .5
print("The same mean and SD do not determine this probability for an arbitrary distribution.")''',
}


def markdown(text):
    text = re.sub(r'<noscript>.*?</noscript>', '', text, flags=re.S)
    text = re.sub(r'<div id="portfolio-lab"[^>]*></div>', '', text)
    text = re.sub(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', r'[\2](\1)', text, flags=re.S)
    text = text.replace('](notebooks/portfolio-theory.ipynb)', '](portfolio-theory.ipynb)')
    text = re.sub(r'<summary>(.*?)</summary>', r'**\1**', text, flags=re.S)
    text = text.replace('<strong>', '**').replace('</strong>', '**')
    text = re.sub(r'</?(?:p|div|section|details|figure|figcaption)\b[^>]*>', '\n', text)
    text = re.sub(r'(?<=\]\()([\w-]+\.html(?:#[^)]*)?)(?=\))', r'../\1', text)
    cell = {'cell_type': 'markdown', 'metadata': {}, 'source': re.sub(r'\n{3,}', '\n\n', text).strip()}
    for asset in set(re.findall(r'assets/images/[\w-]+\.(?:svg|jpg)', cell['source'])):
        name = Path(asset).name
        mime = 'image/svg+xml' if asset.endswith('.svg') else 'image/jpeg'
        payload = (ROOT/asset).read_text() if asset.endswith('.svg') else base64.b64encode((ROOT/asset).read_bytes()).decode('ascii')
        cell.setdefault('attachments', {})[name] = {mime: payload}
        cell['source'] = cell['source'].replace(f']({asset})', f'](attachment:{name})')
    cells.append(cell)


def code(text):
    count = sum(c['cell_type'] == 'code' for c in cells)+1
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        exec(compile(text, f'portfolio_cell_{count}', 'exec'), namespace)
    cells.append({'cell_type': 'code', 'metadata': {}, 'source': text, 'execution_count': count,
                  'outputs': [{'output_type': 'stream', 'name': 'stdout', 'text': output.getvalue()}]})


markdown('# Notebook: Portfolio Theory\n\nสำหรับอ่านและทดลองคู่กับ HTML ใช้ Python 3 และ standard library กด Run All ตามลำดับได้ ภาพประกอบฝังในไฟล์นี้แล้ว ลิงก์บทเรียนชี้ไฟล์ HTML ในโฟลเดอร์ข้างเคียง ตัวเลขทุกชุดเป็นสมมติฐานเพื่อเรียนรู้ ไม่ใช่ข้อมูลตลาด')
markdown(body.split('<section id="', 1)[0])
code(snippets['setup'])
used = {'setup'}
for match in re.finditer(r'<section id="([^"]+)"[^>]*>(.*?)</section>', body, flags=re.S):
    section_id, content = match.groups()
    markdown(content)
    if section_id in snippets:
        code(snippets[section_id]); used.add(section_id)
for key in (name for name in snippets if name not in used):
    markdown(f'## Python experiment: {key}')
    code(snippets[key])
for i, cell in enumerate(cells): cell['id'] = f'portfolio-{i:02d}'
notebook = {'nbformat': 4, 'nbformat_minor': 5, 'cells': cells, 'metadata': {
    'kernelspec': {'display_name': 'Python 3', 'language': 'python', 'name': 'python3'},
    'language_info': {'name': 'python', 'version': sys.version.split()[0], 'file_extension': '.py'},
    'source': {'path': 'portfolio-theory.md', 'sha256': hashlib.sha256(source.encode()).hexdigest()},
    'execution': {'method': 'Executed every code cell; captured stdout', 'generator': 'scripts/make_portfolio_notebook.py'}}}
(ROOT/'notebooks/portfolio-theory.ipynb').write_text(json.dumps(notebook, ensure_ascii=False, indent=1)+'\n')
print(f"Wrote portfolio-theory.ipynb: {len(cells)} cells; {sum(c['cell_type']=='code' for c in cells)} executed code cells.")
