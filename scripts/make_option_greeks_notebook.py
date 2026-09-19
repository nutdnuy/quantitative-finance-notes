"""Generate and execute the option-Greeks notebook from canonical lesson text."""
import hashlib
import json
import re
import sys
from pathlib import Path
import make_portfolio_optimization_notebook as nb

ROOT = Path(__file__).resolve().parents[1]
SLUG = 'option-greeks'
SNIPPETS = {
    'model-and-market': '''call, put = greeks(**BASE), greeks(**{**BASE,'kind':'put'})
parity = BASE['S']*math.exp((BASE['b']-BASE['r'])*BASE['T'])-BASE['K']*math.exp(-BASE['r']*BASE['T'])
close(call['price']-put['price'],parity)
close(call['price'],10.450583572185565)
print(f"Hypothetical Call={call['price']:.8f}; Put={put['price']:.8f}")
print(f"d1={call['d1']:.8f}; d2={call['d2']:.8f}; Call-Put={parity:.8f}")
print("Flat volatility, European exercise, continuous compounding, no trading frictions.")''',
    'units': '''g = greeks(**BASE)
for name in ['delta','gamma','vega','theta','charm','vanna','vomma','speed','zomma','color','veta']:
    print(f"Raw {name:>6}: {g[name]: .10f}")
print(f"Vega per one volatility percentage point: {g['vega']*.01:.8f}")
print(f"Theta per calendar day, 365-day year: {g['theta']/365:.8f}")
print(f"Rho (fixed yield) per one rate percentage point: {g['rho_fixed_yield']*.01:.8f}")
print("A displayed per-point Vega must not be multiplied by a decimal volatility shock again.")''',
    'delta-and-elasticity': '''g = greeks(**BASE)
close(g['elasticity'],BASE['S']*g['delta']/g['price'])
print(f"Delta={g['delta']:.8f}; elasticity={g['elasticity']:.8f}")
print(f"Expiry ITM probability under Q={g['itm_probability']:.8%}")
print("These are different quantities, and none is a physical-measure forecast.")
for spot in [80,100,120]:
    x = greeks(**{**BASE,'S':spot})
    print(f"S={spot}: Call Delta={x['delta']:.6f}, Q expiry ITM={x['itm_probability']:.6f}")''',
    'delta-strikes': '''for kind,delta in [('call',.25),('put',-.25)]:
    strike = strike_from_delta(delta,S=100,r=.05,b=.05,sigma=.2,T=1,kind=kind)
    close(greeks(**{**BASE,'K':strike,'kind':kind})['delta'],delta)
    print(f"{kind}: signed spot Delta={delta:+.2f}; strike={strike:.8f}")
mirror = delta_mirror(100,100,.05,.2,1)
close(greeks(**BASE)['delta'],-greeks(**{**BASE,'K':mirror,'kind':'put'})['delta'])
neutral = 100*math.exp((.05+.5*.2**2)*1)
close(greeks(**{**BASE,'K':neutral})['delta']+greeks(**{**BASE,'K':neutral,'kind':'put'})['delta'],0)
print(f"Opposite-option Delta mirror of K=100: {mirror:.8f}")
print(f"Delta-neutral equal-strike straddle: K={neutral:.8f}; spot ATM K=100 is different.")''',
    'gamma': '''g = greeks(**BASE)
close(g['vega'],g['gamma']*BASE['S']**2*BASE['sigma']*BASE['T'])
for shock in [-10,-5,1,5,10]:
    exact = greeks(**{**BASE,'S':100+shock})['price']-g['price']
    delta_only = g['delta']*shock
    delta_gamma = delta_only+.5*g['gamma']*shock**2
    print(f"Spot shock {shock:+}: exact={exact:+.8f}; Delta={delta_only:+.8f}; Delta+Gamma={delta_gamma:+.8f}")
print("Only spot changes in this table; these are value changes, not a full hedge P&L.")''',
    'higher-greeks': '''g = greeks(**BASE)
ds,dvol,dt = 5,.01,1/365
exact = greeks(**{**BASE,'S':100+ds,'sigma':.2+dvol,'T':1-dt})['price']-g['price']
local = (g['delta']*ds+.5*g['gamma']*ds**2+g['vega']*dvol
         +g['vanna']*ds*dvol+.5*g['vomma']*dvol**2+g['theta']*dt)
print(f"Spot +5, volatility +1 percentage point, one calendar day elapsed:")
print(f"Exact change={exact:.8f}; selected Taylor terms={local:.8f}; residual={exact-local:.8f}")
print("Time cross terms and higher orders are omitted; selected terms are not exact repricing.")
for spot in [80,100,120]:
    x = greeks(**{**BASE,'S':spot})
    print(f"S={spot}: Vanna={x['vanna']:.8f}, Vomma={x['vomma']:.8f}")''',
    'maxima-and-symmetry': '''S,K,r,b,sigma,T = [BASE[key] for key in ['S','K','r','b','sigma','T']]
extrema = {
    'gamma':K*math.exp(-(b+1.5*sigma**2)*T),
    'gamma_p':K*math.exp(-(b+.5*sigma**2)*T),
    'vega':K*math.exp((-b+.5*sigma**2)*T)}
for name,spot in extrema.items():
    f = lambda s:greeks(**{**BASE,'S':s})['gamma']*s/100 if name=='gamma_p' else greeks(**{**BASE,'S':s})[name]
    close(central_difference(f,spot,.001),0,1e-8)
    assert f(spot)>f(spot*.99) and f(spot)>f(spot*1.01)
    print(f"Fixed-T {name} maximum: S={spot:.8f}; value={f(spot):.8f}")
strike = S*math.exp((b+.5*sigma**2)*T)
for name in ['gamma','vega']:
    close(central_difference(lambda k:greeks(**{**BASE,'K':k})[name],strike,.001),0,1e-8)
vega_T = 1/(2*r)
vega_S = K*math.exp((-b+.5*sigma**2)*vega_T)
at_vega = greeks(**{**BASE,'S':vega_S,'T':vega_T})
close(at_vega['vanna'],0)
close(at_vega['veta'],0)
print(f"Joint Vega maximum for r>0: T={vega_T:.8f}; S={vega_S:.8f}")
coefficient = 2*b-r+sigma**2
assert coefficient>0
saddle_T = 1/(2*coefficient)
saddle_S = K*math.exp(-(b+1.5*sigma**2)*saddle_T)
at_saddle = greeks(**{**BASE,'S':saddle_S,'T':saddle_T})
close(at_saddle['speed'],0)
close(at_saddle['color'],0)
ridge = lambda t:greeks(**{**BASE,'S':K*math.exp(-(b+1.5*sigma**2)*t),'T':t})['gamma']
assert ridge(saddle_T)<ridge(saddle_T*.99) and ridge(saddle_T)<ridge(saddle_T*1.01)
print(f"Gamma saddle: T={saddle_T:.8f}; S={saddle_S:.8f}; Gamma={at_saddle['gamma']:.8f}")
print("Gamma is maximal across spot at each T, but minimal along this spot-maximizing ridge.")
for spot,strike,carry,rate in [(100,90,.05,.05),(110,130,-.01,.03)]:
    params = {**BASE,'S':spot,'K':strike,'b':carry,'r':rate}
    forward = spot*math.exp(carry*T)
    other = greeks(**{**params,'K':forward**2/strike,'kind':'put'})
    this = greeks(**params)
    for key in ['price','gamma','vega']:
        close(this[key],strike/forward*other[key])
print("Put-Call price, Gamma and Vega mirror identities verified with fixed volatility.")''',
    'theta-and-carry': '''g = greeks(**BASE)
dt = 1/365
exact_day = greeks(**{**BASE,'T':1-dt})['price']-g['price']
print(f"Exact one-day price change at fixed spot/vol={exact_day:.8f}; Theta/365={g['theta']/365:.8f}")
close(g['rho_fixed_b'],-BASE['T']*g['price'])
close(g['rho_fixed_yield'],g['rho_fixed_b']+g['carry'])
print(f"Raw Rho with b fixed: {g['rho_fixed_b']:.8f}")
print(f"Raw Rho with yield r-b fixed: {g['rho_fixed_yield']:.8f}")
print(f"Raw carry sensitivity dV/db: {g['carry']:.8f}")
print("Calendar Theta/Charm/Color/Veta use minus the derivative in remaining time T.")''',
    'probability-greeks': '''g = greeks(**BASE)
close(math.exp(BASE['r']*BASE['T'])*g['strike_gamma'],g['terminal_density'])
close(-math.exp(BASE['r']*BASE['T'])*g['strike_delta'],g['itm_probability'])
print(f"Call strike Delta={g['strike_delta']:.10f}; strike Gamma={g['strike_gamma']:.10f}")
print(f"Q expiry density at K=100 = exp(rT)*strike Gamma = {g['terminal_density']:.10f} per currency unit")
for kind in ['call','put']:
    strike = strike_from_probability(.25,S=100,b=.05,sigma=.2,T=1,kind=kind)
    close(greeks(**{**BASE,'K':strike,'kind':kind})['itm_probability'],.25)
    print(f"{kind} 25% Q expiry ITM strike: {strike:.8f}")
mirror = probability_mirror(100,100,.05,.2,1)
close(g['itm_probability'],greeks(**{**BASE,'K':mirror,'kind':'put'})['itm_probability'])
print(f"Opposite-option probability mirror of K=100: {mirror:.8f}")
print("These are expiry probabilities and a terminal density, not touch probabilities.")''',
    'numerical-greeks': '''# Independent centered differences across moneyness, carry, time and option type.
cases = [BASE,
    dict(S=90,K=120,r=-.01,b=.02,sigma=.4,T=.3,kind='put'),
    dict(S=120,K=90,r=.03,b=-.02,sigma=.3,T=2,kind='call')]
derivatives = [
    ('delta','S','price',1,.001), ('gamma','S','delta',1,.001),
    ('vega','sigma','price',1,.00001), ('theta','T','price',-1,.00001),
    ('charm','T','delta',-1,.00001), ('vanna','sigma','delta',1,.00001),
    ('vomma','sigma','vega',1,.00001), ('speed','S','gamma',1,.001),
    ('zomma','sigma','gamma',1,.00001), ('color','T','gamma',-1,.00001),
    ('veta','T','vega',-1,.00001), ('strike_delta','K','price',1,.001),
    ('strike_gamma','K','strike_delta',1,.001),
    ('probability_delta','S','itm_probability',1,.001),
    ('probability_vega','sigma','itm_probability',1,.00001),
    ('probability_calendar','T','itm_probability',-1,.00001),
    ('rho_fixed_b','r','price',1,.00001), ('carry','b','price',1,.00001)]
checked = 0
for params in cases:
    analytic = greeks(**params)
    for target,axis,source,sign,h in derivatives:
        numeric = sign*central_difference(lambda x:greeks(**{**params,axis:x})[source],params[axis],h)
        assert math.isclose(numeric,analytic[target],rel_tol=2e-5,abs_tol=2e-7),(target,numeric,analytic[target])
        checked += 1
    rho_yield = central_difference(lambda r:greeks(**{**params,'r':r,'b':params['b']+r-params['r']})['price'],params['r'],.00001)
    close(rho_yield,analytic['rho_fixed_yield'],2e-7)
    checked += 1
print(f"Passed {checked} independent finite-difference checks.")
for h in [1,.1,.01,.001,.0001]:
    price = lambda spot:greeks(**{**BASE,'S':spot})['price']
    delta_fd = central_difference(price,100,h)
    gamma_fd = (price(100+h)-2*price(100)+price(100-h))/(h*h)
    print(f"h={h:g}: Delta error={delta_fd-greeks(**BASE)['delta']:+.3e}; Gamma error={gamma_fd-greeks(**BASE)['gamma']:+.3e}")
print("Shrinking the bump eventually amplifies floating-point cancellation.")
# Derivatives directly from prices, without differentiating a Greek formula.
h,k = .1,.0001
value = lambda ds,dvol:greeks(**{**BASE,'S':100+ds,'sigma':.2+dvol})['price']
mixed = (value(h,k)-value(h,-k)-value(-h,k)+value(-h,-k))/(4*h*k)
third = (value(2*h,0)-2*value(h,0)+2*value(-h,0)-value(-2*h,0))/(2*h**3)
close(mixed,greeks(**BASE)['vanna'],2e-5)
close(third,greeks(**BASE)['speed'],2e-7)
print(f"Price-only four-corner Vanna={mixed:.8f}; central third-derivative Speed={third:.10f}")''',
    'smile-risk': '''# An explicitly chosen LOCAL smile-motion scenario, not an estimated market law.
slope = -.001  # volatility changes by -0.001 per +1 currency unit in spot
g = greeks(**BASE)
moving_vol_price = lambda spot:greeks(**{**BASE,'S':spot,'sigma':.2+slope*(spot-100)})['price']
scenario_delta = g['delta']+g['vega']*slope
close(central_difference(moving_vol_price,100,.001),scenario_delta,2e-7)
scenario_gamma = g['gamma']+2*g['vanna']*slope+g['vomma']*slope**2
h = .01
gamma_fd = (moving_vol_price(100+h)-2*moving_vol_price(100)+moving_vol_price(100-h))/(h*h)
close(gamma_fd,scenario_gamma,2e-7)
print(f"Fixed-volatility partial Delta={g['delta']:.8f}")
print(f"Total Delta under specified smile motion={scenario_delta:.8f}")
print(f"Fixed-volatility Gamma={g['gamma']:.8f}; total Gamma={scenario_gamma:.8f}")
print("The chain-rule correction depends on the chosen volatility-surface dynamics.")''',
    'checklist': '''for invalid in [{'T':0},{'sigma':0},{'S':0},{'K':-1},{'r':float('nan')}]:
    try:
        greeks(**{**BASE,**invalid})
        raise AssertionError(f"Expected invalid input rejection: {invalid}")
    except ValueError:
        pass
print("Domain checks passed: positive S/K/sigma/T and finite inputs are required.")
print("Run All is self-contained: standard library, embedded figures, no market downloads.")
print("All outputs describe hypothetical contracts and explicit model assumptions.")''',
}


if __name__ == '__main__':
    source = (ROOT/f'{SLUG}.md').read_text()
    body = re.sub(r'\A---\n.*?\n---\n','',source,flags=re.S)
    body = re.sub(r'<div id="[^"]*-lab"[^>]*></div>','',body)
    body = re.sub(r'<img\b[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>',r'![\2](\1)',body)
    nb.cells, nb.namespace = [], {}
    nb.markdown('# Python lab: Option Greeks\n\nใช้ Python standard library กด Run All ตามลำดับ ทุกสัญญาและค่าพารามิเตอร์เป็นตัวอย่างสมมติ ภาพประกอบฝังอยู่ในไฟล์แล้ว')
    nb.markdown(body.split('<section id="',1)[0])
    helper = (ROOT/'scripts/option_greeks_math.py').read_text()
    nb.code(helper+'''\n\ndef close(a,b,tol=1e-10):
    assert math.isclose(a,b,rel_tol=tol,abs_tol=tol),(a,b)
BASE = dict(S=100,K=100,r=.05,b=.05,sigma=.2,T=1,kind='call')
print("Loaded self-contained generalized BSM functions; all volatility/rate inputs are decimals.")''')
    inserted = []
    for match in re.finditer(r'<section id="([^"]+)">(.*?)</section>',body,re.S):
        name, content = match.groups()
        nb.markdown(content)
        if name in SNIPPETS:
            nb.code(SNIPPETS[name])
            inserted.append(name)
    missing = set(SNIPPETS)-set(inserted)
    if missing:
        raise ValueError(f'Expected lesson sections not found: {sorted(missing)}')
    for i,cell in enumerate(nb.cells):
        cell['id'] = f'option-greeks-{i:02d}'
    notebook = {'nbformat':4,'nbformat_minor':5,'cells':nb.cells,'metadata':{
        'kernelspec':{'display_name':'Python 3','language':'python','name':'python3'},
        'language_info':{'name':'python','version':sys.version.split()[0]},
        'source':{'path':f'{SLUG}.md','sha256':hashlib.sha256(source.encode()).hexdigest()},
        'execution':{'method':'Executed every code cell in one fresh namespace; captured stdout','generator':'scripts/make_option_greeks_notebook.py'}}}
    (ROOT/f'notebooks/{SLUG}.ipynb').write_text(json.dumps(notebook,ensure_ascii=False,indent=1)+'\n')
    print(f'Wrote {SLUG}.ipynb: {len(nb.cells)} cells, {sum(c["cell_type"]=="code" for c in nb.cells)} executed code cells.')
