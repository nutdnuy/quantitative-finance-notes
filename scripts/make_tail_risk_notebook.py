"""Build the VaR/ES notebook from canonical prose and execute all code cells."""
import hashlib
import json
import re
import sys
from pathlib import Path
import make_portfolio_optimization_notebook as nb

ROOT = Path(__file__).resolve().parents[1]
SLUG = 'value-at-risk-expected-shortfall'

SNIPPETS = {
    'setup': '''import math
import random
import statistics
from statistics import NormalDist
N = NormalDist()

def normal_risk(mean, sd, confidence=.99, days=1):
    assert 0 < confidence < 1 and sd >= 0 and days > 0
    z = N.inv_cdf(confidence)
    return (-mean*days + z*sd*math.sqrt(days),
            -mean*days + sd*math.sqrt(days)*N.pdf(z)/(1-confidence))

def empirical_risk(losses, confidence=.99):
    assert losses and 0 < confidence < 1
    ordered = sorted(losses)
    n = len(ordered)
    def snap(x):
        nearest = round(x)
        return nearest if nearest > 0 and abs(x-nearest) < 1e-10 else x
    rank = math.ceil(snap(n*confidence))
    mass = snap(n*(1-confidence))
    whole = math.floor(mass)
    fraction = mass-whole
    tail_sum = sum(ordered[n-whole:])
    if fraction > 0:
        tail_sum += fraction*ordered[n-whole-1]
    return ordered[rank-1], tail_sum/mass

def close(a, b, tol=1e-9):
    assert math.isclose(a,b,rel_tol=tol,abs_tol=tol), (a,b)

losses = [-2+4*i/97 for i in range(98)] + [10,20]
print("Hypothetical examples only. Loss is positive, profit is negative.")''',
    'expected-shortfall': '''for worst in [20,60]:
    example = losses[:-1] + [worst]
    for c in [.95,.975,.99,.995]:
        var, es = empirical_risk(example,c)
        print(f"Worst={worst}%, c={c:.1%}: VaR={var:.4f}%, ES={es:.4f}%")
close(empirical_risk(losses,.99)[0],10)
close(empirical_risk(losses,.99)[1],20)
close(empirical_risk(losses[:-1]+[60],.975)[1],28.4)
# Ties at VaR: the tail must contain exactly the required probability mass.
close(empirical_risk([0,10,10,100],.5)[1],55)''',
    'coherent-risk': '''# Enumerate 100 equiprobable outcomes per independent position.
single = [0]*96 + [100]*4
combined = [a+b for a in single for b in single]
single_var, single_es = empirical_risk(single,.95)
combined_var, combined_es = empirical_risk(combined,.95)
close(single_var,0); close(single_es,80)
close(combined_var,100); close(combined_es,103.2)
print(f"Individual: VaR={single_var}, ES={single_es}")
print(f"Combined:   VaR={combined_var}, ES={combined_es}")''',
    'normal-model': '''var, es = normal_risk(0,100000*.0221)
close(var,5141.228801630258)
close(es,5890.123426964231)
print(f"One-day 99% VaR = ${var:,.2f}; ES = ${es:,.2f}")
print(f"Rounded z=2.33 gives ${2.33*2210:,.2f}")''',
    'time-scaling': '''for mean in [0,100]:
    one = normal_risk(mean,2210)
    ten = normal_risk(mean,2210,days=10)
    print(f"Daily mean ${mean}: ten-day VaR=${ten[0]:,.2f}, ES=${ten[1]:,.2f}")
    print(f"Multiplying one-day VaR by sqrt(10) instead gives ${one[0]*math.sqrt(10):,.2f}")
    if mean == 0:
        close(ten[0],one[0]*math.sqrt(10))
    else:
        close(ten[0]-one[0]*math.sqrt(10),-mean*(10-math.sqrt(10)))''',
    'estimation-methods': '''# Specified model: independent Normal one-day P&L, fixed $100,000 exposure.
# Seeded inverse-CDF Monte Carlo. More draws reduce sampling error, not model error.
generator = random.Random(2523)
simulated = [-2210*N.inv_cdf(generator.random()) for _ in range(100000)]
exact = normal_risk(0,2210)
for count in [1000,10000,100000]:
    estimated = empirical_risk(simulated[:count])
    print(f"N={count}: VaR=${estimated[0]:,.2f}, ES=${estimated[1]:,.2f}")
print(f"Analytical: VaR=${exact[0]:,.2f}, ES=${exact[1]:,.2f}")
print("Sampling error need not shrink monotonically for each additional batch.")''',
    'distribution-checks': '''quantiles = [N.inv_cdf((i+.5)/201) for i in range(201)]
normal = [x/statistics.stdev(quantiles) for x in quantiles]
transformed = [x+.15*x**3 for x in quantiles]
heavy = [x/statistics.stdev(transformed) for x in transformed]
close(statistics.stdev(normal),1)
close(statistics.stdev(heavy),1)
print("Equal sample SD; deterministic quantile examples, not historical returns.")
for i in [0,50,100,150,200]:
    print(f"q={quantiles[i]:+.4f}, Normal={normal[i]:+.4f}, transformed={heavy[i]:+.4f}")''',
    'portfolio-risk': '''prices = [244,135,315]
means = [.005,.003,.002]
covariance = [[.0004,.0003,.00005],[.0003,.0009,.00018],[.00005,.00018,.0001]]
def portfolio_risk(quantities, confidence=.99):
    value = sum(q*p for q,p in zip(quantities,prices))
    weights = [q*p/value for q,p in zip(quantities,prices)]
    mean = sum(w*m for w,m in zip(weights,means))
    variance = sum(weights[i]*weights[j]*covariance[i][j] for i in range(3) for j in range(3))
    sd = math.sqrt(variance)
    var,es = normal_risk(mean,sd,confidence)
    return value,weights,mean,sd,var,es

for quantities in [[2,1,1],[2,2,1]]:
    value,weights,mean,sd,var,es = portfolio_risk(quantities)
    close(sum(weights),1)
    print(f"Shares={quantities}, value=${value}, weights={weights}")
    print(f"Daily mean={mean:.6%}, SD={sd:.6%}")
    print(f"99% VaR={var:.6%} (${value*var:.6f}); ES={es:.6%} (${value*es:.6f})")
close(portfolio_risk([2,1,1])[4]*938,28.742322855305677)
close(portfolio_risk([2,1,1])[5]*938,33.43524372304397)''',
    'backtesting': '''n, confidence = 250,.99
print(f"Expected exceptions = {n*(1-confidence):.1f}")
# Probability of at least 5 exceptions under independent correctly calibrated trials.
p = 1-confidence
probability = 1-sum(math.comb(n,k)*p**k*(1-p)**(n-k) for k in range(5))
print(f"P(K >= 5) under the idealized null = {probability:.4%}")
for days in [[10,30,50],[29,30,31]]:
    losses = [7 if day in days else 1.2+1.8*math.sin(day*1.7) for day in range(1,61)]
    exceptions = [i+1 for i,loss in enumerate(losses) if loss>5]
    assert exceptions == days
    print(f"Illustrative, not calibrated: {len(exceptions)} exceptions on days {exceptions}")''',
}


if __name__ == '__main__':
    source = (ROOT / f'{SLUG}.md').read_text()
    body = re.sub(r'\A---\n.*?\n---\n', '', source, flags=re.S)
    body = re.sub(r'<div id="(?:normal|empirical|portfolio)-tail-lab"></div>', '', body)
    nb.cells, nb.namespace = [], {}
    nb.markdown('# Python lab: Value at Risk and Expected Shortfall\n\nใช้ Python standard library กด Run All ตามลำดับได้ ตัวอย่างเป็นข้อมูลสมมติ ภาพฝังอยู่ในไฟล์แล้ว')
    nb.markdown(body.split('<section id="', 1)[0])
    nb.code(SNIPPETS['setup'])
    for match in re.finditer(r'<section id="([^"]+)">(.*?)</section>', body, re.S):
        name, content = match.groups()
        nb.markdown(content)
        if name in SNIPPETS:
            nb.code(SNIPPETS[name])
    for i, cell in enumerate(nb.cells):
        cell['id'] = f'tail-risk-{i:02d}'
    notebook = {
        'nbformat': 4, 'nbformat_minor': 5, 'cells': nb.cells,
        'metadata': {
            'kernelspec': {'display_name': 'Python 3', 'language': 'python', 'name': 'python3'},
            'language_info': {'name': 'python', 'version': sys.version.split()[0]},
            'source': {'path': f'{SLUG}.md', 'sha256': hashlib.sha256(source.encode()).hexdigest()},
            'execution': {'method': 'All code cells executed in one fresh namespace; captured stdout', 'generator': 'scripts/make_tail_risk_notebook.py'},
        },
    }
    (ROOT / f'notebooks/{SLUG}.ipynb').write_text(json.dumps(notebook, ensure_ascii=False, indent=1)+'\n')
    print(f'Wrote {SLUG}.ipynb: {len(nb.cells)} cells, {sum(c["cell_type"] == "code" for c in nb.cells)} executed code cells.')
