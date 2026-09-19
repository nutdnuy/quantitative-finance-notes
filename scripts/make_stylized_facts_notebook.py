"""Generate and execute the notebook from canonical lesson text and math helpers."""
import hashlib
import json
import re
import sys
from pathlib import Path
import make_portfolio_optimization_notebook as nb

ROOT=Path(__file__).resolve().parents[1]
SLUG='asset-returns-stylized-facts'
SNIPPETS={
    'return-conventions': '''simple, log_return = return_pair(100,99,2)
close(simple,.01)
close(log_return,math.log(1.01))
print(f"Dividend-inclusive simple return {simple:.6%}; log return {log_return:.6%}")
compound = 1.2*.8-1
sum_log = math.log(1.2)+math.log(.8)
close(math.expm1(sum_log),compound)
print(f"+20%, then -20%: simple {compound:.4%}; log {sum_log:.4%}")''',
    'volatility-clustering': '''returns = clustered_returns()
permuted = shuffle(returns)
assert sorted(returns)==sorted(permuted)
before, after = moments(returns),moments(permuted)
for key in before:
    close(before[key],after[key])
for label, values in [('Original',returns),('Shuffled',permuted)]:
    print(label,moments(values))
    print(f"lag 1: r={acf(values)[1]:.6f}, |r|={acf([abs(r) for r in values])[1]:.6f}")
print("The same values in a different order: moments/histogram unchanged.")''',
    'autocorrelation': '''for label, values in [('r',returns),('|r|',[abs(r) for r in returns]),('r^2',[r*r for r in returns])]:
    bp, lb = portmanteau(values,20)
    print(f"{label}: Box-Pierce Q(20)={bp:.4f}; Ljung-Box Q(20)={lb:.4f}")
print(f"Pointwise iid reference +/-1.96/sqrt(n) = {1.96/math.sqrt(len(returns)):.6f}")
print("No p-values claimed for the heteroskedastic synthetic return series.")
assert acf([3,3,3],1)==[None,None]''',
    'fat-tails': '''for threshold in [3,4]:
    probability = math.erfc(threshold/math.sqrt(2))
    print(f"Normal two-sided P(|Z|>{threshold})={probability:.8%}; expected per 252 draws={252*probability:.6f}")
print(f"Moment kurtosis: {moments(returns)['kurtosis']:.6f}; excess: {moments(returns)['kurtosis']-3:.6f}")
print("Moment estimator uses m4/m2^2; reported sample SD uses n-1.")''',
    'variance-mixture': '''mixture = variance_mixture(.2,5)
variance = .8*.005**2+.2*.025**2
close(variance,.000145)
close(mixture['kurtosis'],11.218787158145064)
close(variance_mixture(.2,1)['kurtosis'],3)
print(f"Daily SD={math.sqrt(variance):.6%}; kurtosis={mixture['kurtosis']:.6f}")
print(f"Two-sided tail beyond 3 pooled SD={mixture['tail'](3):.6%}")
print("Mixture probabilities alone do not specify temporal dependence.")''',
    'intraday-seasonality': '''for news in [False,True]:
    profile = intraday_profile(news)
    close(sum(profile),1)
    daily_sd = .01
    interval_sd = [daily_sd*math.sqrt(a) for a in profile]
    close(sum(s*s for s in interval_sd),daily_sd**2)
    print(f"News bump={news}: largest share {max(profile):.6%}; sum {sum(profile):.6%}")
print("Variance weights sum to one; SD multipliers are their square roots.")''',
    'realized-variance': '''for scale in [.01,.002]:
    log_prices = [0]
    for r in [scale,-scale,scale,-scale]:
        log_prices.append(log_prices[-1]+r)
    stats = realized_variance(log_prices)
    close(log_prices[-1],0)
    close(stats['volatility'],2*scale)
    print(f"Four returns +/-{scale:.2%}: RV={stats['variance']:.7f}, sqrt(RV)={stats['volatility']:.4%}, closing return=0")
print(f"1% session SD * sqrt(252) = {.01*math.sqrt(252):.4%}; excludes overnight")''',
    'microstructure-noise': '''for noise_bps in [0,3,10]:
    data = intraday_sample(noise_bps)
    for stride in [1,5,15,30,390]:
        latent = realized_variance(data['latent'],stride)
        observed = realized_variance(data['observed'],stride)
        bias = 2*observed['count']*data['eta']**2
        if noise_bps==0:
            close(latent['variance'],observed['variance'])
        print(f"Noise={noise_bps} bps, every {stride} min: N={observed['count']}, latent SD={latent['volatility']:.5%}, observed SD={observed['volatility']:.5%}, expected noise RV={bias:.8f}")
close(2*390*.0003**2,.0000702)
close(2*78*.0003**2,.00001404)
print("Observed-minus-latent RV of one realization need not equal its expectation.")''',
    'standardized-returns': '''# Here sigma is KNOWN because we constructed the simulation. This is not a forecast.
known_sigma = [.005 if (i//50)%2==0 else .025 for i in range(600)]
standardized = [r/s for r,s in zip(returns,known_sigma)]
print("Known-sigma standardized simulation:",moments(standardized))
print(f"ACF of squared standardized shocks, lag 1={acf([z*z for z in standardized])[1]:.6f}")
print("In market data, same-day realized volatility is known only after observing that day.")''',
}


if __name__=='__main__':
    source=(ROOT/f'{SLUG}.md').read_text()
    body=re.sub(r'\A---\n.*?\n---\n','',source,flags=re.S)
    body=re.sub(r'<div id="(?:clustering|variance-mixture|realized-volatility)-lab"></div>','',body)
    nb.cells,nb.namespace=[],{}
    nb.markdown('# Python lab: Asset Returns — Empirical Stylized Facts\n\nใช้ Python standard library กด Run All ตามลำดับ ข้อมูลทั้งหมดจำลองด้วย seed ที่ระบุ ภาพประกอบฝังอยู่ในไฟล์แล้ว')
    nb.markdown(body.split('<section id="',1)[0])
    helper=(ROOT/'scripts/stylized_facts_math.py').read_text()
    nb.code(helper+'''\n\ndef close(a,b,tol=1e-10):
    assert math.isclose(a,b,rel_tol=tol,abs_tol=tol),(a,b)
print("Loaded self-contained functions. Simulated data only; no remote downloads.")''')
    for match in re.finditer(r'<section id="([^"]+)">(.*?)</section>',body,re.S):
        name,content=match.groups()
        nb.markdown(content)
        if name in SNIPPETS:nb.code(SNIPPETS[name])
    for i,cell in enumerate(nb.cells):cell['id']=f'stylized-facts-{i:02d}'
    notebook={'nbformat':4,'nbformat_minor':5,'cells':nb.cells,'metadata':{
        'kernelspec':{'display_name':'Python 3','language':'python','name':'python3'},
        'language_info':{'name':'python','version':sys.version.split()[0]},
        'source':{'path':f'{SLUG}.md','sha256':hashlib.sha256(source.encode()).hexdigest()},
        'execution':{'method':'Executed every code cell in one fresh namespace; captured stdout','generator':'scripts/make_stylized_facts_notebook.py'}}}
    (ROOT/f'notebooks/{SLUG}.ipynb').write_text(json.dumps(notebook,ensure_ascii=False,indent=1)+'\n')
    print(f'Wrote {SLUG}.ipynb: {len(nb.cells)} cells, {sum(c["cell_type"]=="code" for c in nb.cells)} executed code cells.')
