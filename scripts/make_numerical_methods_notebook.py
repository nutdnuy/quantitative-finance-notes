"""Build and execute a self-contained notebook from the canonical lesson.

The notebook embeds every chart and the Python math helper. Readers need only
Python's standard library; its stochastic samples deliberately use Python RNG.
"""
import hashlib
import json
import re
import sys
from pathlib import Path

import make_portfolio_optimization_notebook as nb

ROOT = Path(__file__).resolve().parents[1]
SLUG = "numerical-methods"
BASE = "https://nutdnuy.github.io/quantitative-finance-notes/"

SNIPPETS = {
    "risk-neutral-pricing": '''S0,K,r,sigma,T = 100.,100.,.03,.2,1.
call,put = black_scholes(),black_scholes(kind="put")
close(call,9.413403383853016)
close(put,6.457956738703835)
close(call-put,S0-K*math.exp(-r*T))
print(f"Analytic reference: Call={call:.10f}; Put={put:.10f}")
print(f"Put-call parity: C-P={call-put:.10f}=S0-K*exp(-r*T)")
print("Risk-neutral drift r is a pricing assumption, not an estimate of physical expected returns.")''',
    "exact-simulation": '''for z in [-2.,0.,2.]:
    terminal = S0*math.exp((r-.5*sigma*sigma)*T+sigma*math.sqrt(T)*z)
    assert terminal > 0
    close(math.log(terminal/S0),(r-.5*sigma*sigma)*T+sigma*math.sqrt(T)*z)
    print(f"Z={z:+.1f}: exact S_T={terminal:.8f}; Call payoff={payoff(terminal):.8f}")
expected_terminal = S0*math.exp(r*T)
close(math.exp(-r*T)*expected_terminal,S0)
print(f"Analytic E_Q[S_T]={expected_terminal:.8f}; discounted expectation={S0:.8f}")
print("One exact terminal draw has no time-discretization error for this European payoff and constant-parameter GBM.")''',
    "monte-carlo-error": '''from statistics import mean, stdev
mc = monte_carlo(paths=20000,seed=2530401,checkpoints=[100,500,1000,5000])
# Recompute independently from the same normal draws to check online variance.
rng = random.Random(mc["seed"])
discounted_payoffs = [math.exp(-r*T)*payoff(S0*math.exp((r-.5*sigma*sigma)*T+sigma*math.sqrt(T)*rng.gauss(0,1))) for _ in range(mc["paths"])]
close(mc["price"],mean(discounted_payoffs))
close(mc["sd"],stdev(discounted_payoffs))
close(mc["se"],stdev(discounted_payoffs)/math.sqrt(len(discounted_payoffs)))
close(mc["upper"]-mc["price"],1.96*mc["se"])
print(f"Python seed={mc['seed']}; N={mc['paths']:,}; iid exact terminal draws")
print(f"MC={mc['price']:.10f}; sample SD={mc['sd']:.10f}; sample SE={mc['se']:.10f}")
print(f"Approximate 95% CI=[{mc['lower']:.10f},{mc['upper']:.10f}]")
print(f"Analytic error={mc['price']-mc['reference']:+.10f}; error/SE={(mc['price']-mc['reference'])/mc['se']:+.4f}")
print("A pointwise approximate CI need not cover the true value in every run. Model error is excluded.")''',
    "mc-experiment": '''print("N       MC price        sample SE       approximate 95% interval")
for row in mc["checkpoints"]:
    print(f"{row['paths']:6d} {row['price']:14.8f} {row['se']:14.8f}  [{row['lower']:.8f},{row['upper']:.8f}]")
small = next(row for row in mc["checkpoints"] if row["paths"]==5000)
print(f"20,000 / 5,000 = 4; measured SE ratio={small['se']/mc['se']:.5f}, near sqrt(4)=2.")
print("All rows use nested prefixes; the errors do not have to decrease monotonically.")
print("Website and Python RNG implementations differ; identical seeds need not give identical prices.")''',
    "grid-derivatives": '''# Smooth cubic: verify the orders without option-payoff nonsmoothness.
S=100.
f=lambda s:s**3
print("dS     forward error     backward error    central error     gamma error")
for dS in [10.,5.,2.5]:
    forward=(f(S+dS)-f(S))/dS
    backward=(f(S)-f(S-dS))/dS
    central=(f(S+dS)-f(S-dS))/(2*dS)
    gamma=(f(S+dS)-2*f(S)+f(S-dS))/dS**2
    close(central-3*S*S,dS*dS)
    close(gamma,6*S)
    print(f"{dS:4.1f} {forward-3*S*S:17.5f} {backward-3*S*S:17.5f} {central-3*S*S:16.5f} {gamma-6*S:15.5f}")
print("For this smooth cubic, central delta error is exactly dS^2. This does not assume smoothness at the Call payoff kink.")''',
    "explicit-scheme": '''coefficients = explicit_coefficients()
dt,dS,i = 1/1000,400/80,20
a,b,c = coefficients[i-1]
close(a,.0077);close(b,.98397);close(c,.0083)
for weights in coefficients:
    assert min(weights)>=0
    close(sum(weights),1-r*dt)
first_step = a*payoff((i-1)*dS)+b*payoff(i*dS)+c*payoff((i+1)*dS)
close(first_step,.0415)
print(f"At S=i*dS=100: a={a:.8f}, b={b:.8f}, c={c:.8f}")
print(f"First explicit update from payoff: V(tau=0.001,S=100)={first_step:.8f}")
print(f"Weight sum={a+b+c:.8f}=1-r*dt, not 1; these are not normalized transition probabilities.")''',
    "boundary-conditions": '''for tau in [0.,.5,1.]:
    call_low,call_high = 0.,400-K*math.exp(-r*tau)
    put_low,put_high = K*math.exp(-r*tau),0.
    close(black_scholes(S=0,T=tau),call_low)
    close(black_scholes(S=0,T=tau,kind="put"),put_low)
    print(f"tau={tau:.1f}: Call boundaries=({call_low:.8f},{call_high:.8f}); Put boundaries=({put_low:.8f},{put_high:.8f})")
print("The high-S boundary at Smax is an asymptotic approximation; Smax is finite, not infinity.")
for kind in ["call","put"]:
    result=finite_difference(kind=kind)
    close(result['values'][0],0 if kind=='call' else K*math.exp(-r*T))
    close(result['values'][-1],400-K*math.exp(-r*T) if kind=='call' else 0)
    assert min(result['values'])>=0
    differences=[b-a for a,b in zip(result['values'],result['values'][1:])]
    assert (min(differences)>=-1e-12) if kind=='call' else (max(differences)<=1e-12)
    print(f"{kind}: nonnegative grid and expected monotonicity checked.")''',
    "stability": '''M,N=80,1000
max_dt=1/(sigma*sigma*(M-1)**2+r)
minimum_steps=math.ceil(T/max_dt)
print(f"For M={M}: dt <= {max_dt:.9f}; at least {minimum_steps} steps for nonnegative b_i.")
print(f"Default dt={T/N:.9f}; all weights nonnegative, minimum={min(min(row) for row in coefficients):.9f}")
for label,params in [("Too few time steps",{"steps":100}),("Central drift has a_1<0",{"r":.08})]:
    try:
        finite_difference(**params)
    except ValueError as error:
        print(label+": rejected — "+str(error))
    else:
        raise AssertionError("Unsafe configuration was accepted")
print("Increasing N repairs the first case; r>sigma^2 at i=1 needs a different drift stencil.")''',
    "fd-experiment": '''fd_call=finite_difference()
fd_put=finite_difference(kind="put")
close(fd_call["price"],9.352555601587657)
close(fd_put["price"],6.397065285525917)
for kind,result in [("Call",fd_call),("Put",fd_put)]:
    print(f"{kind}: FD={result['price']:.10f}; analytic={result['reference']:.10f}; error={result['price']-result['reference']:+.10f}")
parity_error=fd_call['price']-fd_put['price']-(S0-K*math.exp(-r*T))
print(f"Discrete put-call parity residual={parity_error:+.10f}; explicit discounting has time-discretization error.")
assert abs(parity_error)<.00005
print("Price at non-node S uses linear interpolation; reported Greeks name the nearest interior node.")''',
    "greeks-and-convergence": '''reference_greeks=black_scholes_greeks()
print(f"Greeks evaluated at S={fd_call['greek_spot']:.1f}; theta per year in calendar time t:")
for key in ["delta","gamma","theta"]:
    print(f"{key:6s}: FD={fd_call[key]:+.10f}; analytic={reference_greeks[key]:+.10f}")
rows=convergence_rows()
print("M       N       dS          dt           FD price       absolute error")
for row in rows:
    print(f"{row['intervals']:3d} {row['steps']:7d} {row['dS']:8.3f} {row['dt']:11.7f} {row['price']:16.10f} {row['error']:17.10f}")
assert rows[-1]['error']<.004
assert all(a['error']>b['error'] for a,b in zip(rows,rows[1:]))
print("Observed error ratios:",[round(a['error']/b['error'],5) for a,b in zip(rows,rows[1:])])
print("dt/dS^2 remains fixed and the strike is on each grid. This example is not a general convergence proof.")
print("All assertions passed.")''',
}


def build():
    source = (ROOT/f"{SLUG}.md").read_text()
    body = re.sub(r"\A---\n.*?\n---\n", "", source, flags=re.S)
    body = re.sub(r'<div id="[^"]+-lab"[^>]*></div>', "", body)
    nb.cells, nb.namespace = [], {}
    nb.markdown("# Python lab: Introduction to Numerical Methods\n\nใช้ Python standard library และกด **Run All** ตามลำดับได้โดยไม่ดาวน์โหลดข้อมูลหรือไฟล์โค้ดเพิ่มเติม ภาพประกอบฝังอยู่ใน Notebook แล้ว เนื้อหาอ่านจาก `numerical-methods.md` ตัวเลขทั้งหมดเป็นตัวอย่างสมมติของ European Call/Put ภายใต้ GBM ที่มีค่าพารามิเตอร์คงที่ ไม่มีเงินปันผลและต้นทุนซื้อขาย\n\nตัวสุ่ม Python ใช้ `random.Random(seed).gauss` จึงทำซ้ำได้แยกจากตัวสุ่มบนเว็บไซต์ Seed เลขเดียวกันไม่รับประกันผลตรงกันข้ามภาษา ช่วงความเชื่อมั่นครอบคลุม sampling error ภายใต้แบบจำลอง ส่วน finite difference มี discretization และ finite-domain error\n\n"+f"[เปิดบทเรียน]({BASE}{SLUG}.html)")
    nb.markdown(body.split('<section id="',1)[0])
    helper = (ROOT/"scripts/numerical_methods_math.py").read_text()
    nb.code(helper+'''\n\ndef close(a,b,tolerance=1e-10):
    assert math.isclose(a,b,rel_tol=tolerance,abs_tol=tolerance),(a,b)
print("Loaded self-contained math functions; Python standard library only.")''')
    seen, position = set(), body.find('<section id="')
    if position < 0:
        raise ValueError("Expected source lesson sections")
    for match in re.finditer(r'<section id="([^"]+)"[^>]*>(.*?)</section>',body,re.S):
        if body[position:match.start()].strip():
            nb.markdown(body[position:match.start()])
        section,content = match.groups()
        nb.markdown(content)
        if section in SNIPPETS:
            nb.code(SNIPPETS[section])
            seen.add(section)
        position=match.end()
    if body[position:].strip():
        nb.markdown(body[position:])
    assert seen==set(SNIPPETS),f"Missing source sections: {set(SNIPPETS)-seen}"
    for i,cell in enumerate(nb.cells):
        cell["id"]=f"numerical-methods-{i:02d}"
        if cell["cell_type"]=="markdown":
            cell["source"]=re.sub(r'\]\(\.\./([\w-]+\.html(?:#[^)]*)?)\)',lambda m:f']({BASE}{m[1]})',cell["source"])
            cell["source"]=re.sub(r'\]\(\.\./((?:data|assets/diagrams)/[^)]+)\)',lambda m:f']({BASE}{m[1]})',cell["source"])
    notebook={"nbformat":4,"nbformat_minor":5,"cells":nb.cells,"metadata":{
        "kernelspec":{"display_name":"Python 3","language":"python","name":"python3"},
        "language_info":{"name":"python","version":sys.version.split()[0],"file_extension":".py"},
        "source":{"path":f"{SLUG}.md","sha256":hashlib.sha256(source.encode()).hexdigest()},
        "execution":{"method":"Every code cell executed in one fresh Python namespace; stdout captured", "generator":"scripts/make_numerical_methods_notebook.py"},
        "simulation":{"rng":"Python random.Random(seed).gauss", "seed":2530401, "market_data":False}}}
    path=ROOT/f"notebooks/{SLUG}.ipynb"
    path.write_text(json.dumps(notebook,ensure_ascii=False,indent=1)+"\n")
    count=sum(cell["cell_type"]=="code" for cell in nb.cells)
    charts=sum(len(cell.get("attachments",{})) for cell in nb.cells)
    print(f"Wrote {path.name}: {len(nb.cells)} cells, {count} executed code cells, {charts} embedded charts.")


if __name__=="__main__":
    build()
