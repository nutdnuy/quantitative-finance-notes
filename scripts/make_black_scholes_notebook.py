"""Build the source-aligned Black-Scholes notebook and execute stdlib-only cells."""
import ast
import contextlib
import hashlib
import io
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://nutdnuy.github.io/quantitative-finance-notes/"
source = (ROOT / "black-scholes-model.md").read_text()
body = re.sub(r"\A---\n.*?\n---\n", "", source, flags=re.S)
cells, namespace = [], {}
snippets = {
    "intro": '''import math
import random
import statistics

def close(actual, expected, tolerance=1e-10):
    assert math.isclose(actual, expected, rel_tol=tolerance, abs_tol=tolerance), (actual, expected)

def N(x):
    return .5 * (1 + math.erf(x / math.sqrt(2)))

def phi(x):
    return math.exp(-.5*x*x) / math.sqrt(2*math.pi)

# Every monetary amount is per one option on one unit of the underlying.
S0, K, r, sigma, T, D = 100., 100., .05, .20, 1., 0.
print("Python standard library only; rates and volatility are annual decimals, time is in years.")
print("All examples are hypothetical. Each simulation declares its own fixed seed.")
print("Python and website random-number generators differ; simulated paths need not match.")''',
    "model": '''mu = .10  # Physical PRICE drift here; D=0 in this example.
physical_mean = S0 * math.exp(mu*T)
risk_neutral_mean = S0 * math.exp((r-D)*T)
print(f"Physical model: E_P[S_T]={physical_mean:.9f}, using mu={mu:.2%}.")
print(f"Pricing model: E_Q[S_T]={risk_neutral_mean:.9f}, using r-D={r-D:.2%}.")
print(f"Under Q, log-return mean={(r-D-.5*sigma*sigma)*T:.6f}, variance={sigma*sigma*T:.6f}.")
close(math.exp(-r*T)*risk_neutral_mean,S0*math.exp(-D*T))
print("With dividends, discounted ex-dividend stock alone is not the martingale; include dividend gains.")''',
    "risk-neutral": '''mc_count, mc_seed = 40000, 2026091401
rng = random.Random(mc_seed)
terminal_prices = [S0*math.exp((r-D-.5*sigma*sigma)*T + sigma*math.sqrt(T)*rng.gauss(0,1))
                   for _ in range(mc_count)]
mc_results = {}
for kind in ["call", "put"]:
    sign = 1 if kind == "call" else -1
    discounted = [math.exp(-r*T)*max(sign*(stock-K),0) for stock in terminal_prices]
    estimate = statistics.fmean(discounted)
    se = statistics.stdev(discounted) / math.sqrt(mc_count)
    mc_results[kind] = {"estimate":estimate, "se":se}
    print(f"{kind:4s}: estimate={estimate:.6f}, standard error={se:.6f}, approximate 95% CI=[{estimate-1.96*se:.6f}, {estimate+1.96*se:.6f}]")
print(f"Exact GBM terminal simulation under Q, paths={mc_count:,}, seed={mc_seed}.")
print("This interval describes sampling uncertainty conditional on the model, not model error.")
print("A fixed seed makes this run reproducible; no assertion forces a sample interval to contain the exact price.")''',
    "formula": '''def black_scholes(S, K, r, sigma, tau, D=0., kind="call"):
    """European vanilla value and analytical Greeks, with continuous dividend yield D.

    theta is calendar-time sensitivity per YEAR. Vega and rho are per 1.00
    absolute parameter change; divide by 100 for a one-percentage-point change.
    This function requires tau>0 and sigma>0 because expiry Greeks can be singular.
    """
    if kind not in ("call", "put"):
        raise ValueError("kind must be call or put")
    if not all(math.isfinite(x) for x in (S,K,r,sigma,tau,D)):
        raise ValueError("All inputs must be finite")
    if S <= 0 or K <= 0 or sigma <= 0 or tau <= 0:
        raise ValueError("Require S,K,sigma,tau > 0; handle maturity by its payoff")
    root_tau = math.sqrt(tau)
    d1 = (math.log(S/K)+(r-D+.5*sigma*sigma)*tau)/(sigma*root_tau)
    d2 = d1-sigma*root_tau
    asset_discount, cash_discount = math.exp(-D*tau), math.exp(-r*tau)
    gamma = asset_discount*phi(d1)/(S*sigma*root_tau)
    vega = S*asset_discount*phi(d1)*root_tau
    common_theta = -S*asset_discount*phi(d1)*sigma/(2*root_tau)
    if kind == "call":
        price = S*asset_discount*N(d1)-K*cash_discount*N(d2)
        delta = asset_discount*N(d1)
        theta = common_theta+D*S*asset_discount*N(d1)-r*K*cash_discount*N(d2)
        rho = K*tau*cash_discount*N(d2)
    else:
        price = K*cash_discount*N(-d2)-S*asset_discount*N(-d1)
        delta = asset_discount*(N(d1)-1)
        theta = common_theta-D*S*asset_discount*N(-d1)+r*K*cash_discount*N(-d2)
        rho = -K*tau*cash_discount*N(-d2)
    return dict(price=price, delta=delta, gamma=gamma, theta=theta, vega=vega,
                rho=rho, d1=d1, d2=d2)

print("black_scholes(S,K,r,sigma,tau,D=0,kind='call') returns price and analytical Greeks.")
for dividend in [0., .03]:
    call = black_scholes(S0,K,r,sigma,T,dividend,"call")
    put = black_scholes(S0,K,r,sigma,T,dividend,"put")
    close(call["price"]-put["price"],S0*math.exp(-dividend*T)-K*math.exp(-r*T))
    close(call["delta"]-put["delta"],math.exp(-dividend*T))
    close(call["gamma"],put["gamma"])
    close(call["vega"],put["vega"])
print("Put-call parity and Delta/Gamma/Vega identities passed with and without dividends.")''',
    "worked-example": '''example_call = black_scholes(S0,K,r,sigma,T,D,"call")
example_put = black_scholes(S0,K,r,sigma,T,D,"put")
close(example_call["price"],10.450583572185565)
close(example_put["price"],5.573526022256971)
close(example_call["delta"],.6368306511756191)
print(f"S=K=100, r=5%, sigma=20%, tau=1 year, dividend yield D=0.")
print(f"d1={example_call['d1']:.6f}; d2={example_call['d2']:.6f}")
print(f"Call={example_call['price']:.9f}; Put={example_put['price']:.9f}")
print(f"Call replication: {example_call['delta']:.9f} shares and cash={example_call['price']-example_call['delta']*S0:.9f}.")
print(f"Call-Put={example_call['price']-example_put['price']:.9f}=S-K*exp(-r*tau).")
for kind, value in [("call",example_call),("put",example_put)]:
    result = mc_results[kind]
    print(f"{kind}: Monte Carlo minus analytical price={result['estimate']-value['price']:+.6f}; estimated SE={result['se']:.6f}.")
print("Price is today's premium; payoff is the terminal contractual amount, not profit.")''',
    "greeks": '''print("Greek units: Delta per stock-price unit; Gamma per stock-price-unit squared.")
print("Theta below is per calendar year, with an additional /365-day convention shown explicitly.")
for kind in ["call", "put"]:
    result = black_scholes(S0,K,r,sigma,T,D,kind)
    print(f"{kind:4s}: Delta={result['delta']:.9f}, Gamma={result['gamma']:.9f}, Theta/year={result['theta']:.9f}, Theta/365-day={result['theta']/365:.9f}")
    print(f"      Vega/1pp={result['vega']/100:.9f}, Rho/1pp={result['rho']/100:.9f}")
    # Finite differences independently verify implementation and the time sign.
    hS, hparam = .01, 1e-5
    def value(s=S0, vol=sigma, rate=r, tau=T):
        return black_scholes(s,K,rate,vol,tau,D,kind)["price"]
    delta_fd = (value(s=S0+hS)-value(s=S0-hS))/(2*hS)
    gamma_fd = (value(s=S0+hS)-2*value()+value(s=S0-hS))/(hS*hS)
    theta_fd = -(value(tau=T+hparam)-value(tau=T-hparam))/(2*hparam)
    vega_fd = (value(vol=sigma+hparam)-value(vol=sigma-hparam))/(2*hparam)
    rho_fd = (value(rate=r+hparam)-value(rate=r-hparam))/(2*hparam)
    for greek,approx in [("delta",delta_fd),("gamma",gamma_fd),("theta",theta_fd),("vega",vega_fd),("rho",rho_fd)]:
        close(result[greek],approx,2e-7)
    residual = result["theta"]+.5*sigma*sigma*S0*S0*result["gamma"]+(r-D)*S0*result["delta"]-r*result["price"]
    close(residual,0)
    print(f"      PDE residual={residual:.3e}; central-difference Greeks passed.")
print("Vega=37.52 per 1.00 volatility is about 0.3752 per 1 percentage point, not 37.52 per point.")''',
    "discrete-hedging": '''# Simulate ONE finest Brownian path, then sum its increments for every hedge grid.
# D=0: no dividend cash flows. Price drift mu is a physical scenario assumption.
hedge_mu, hedge_seed, finest_N = .08, 2026091402, 256
rng = random.Random(hedge_seed)
fine_dw = [math.sqrt(T/finest_N)*rng.gauss(0,1) for _ in range(finest_N)]
WT = math.fsum(fine_dw)
exact_terminal = S0*math.exp((hedge_mu-.5*sigma*sigma)*T+sigma*WT)

def discrete_hedge(N):
    if N <= 0 or finest_N % N:
        raise ValueError("N must be a positive divisor of the finest grid")
    dt, group = T/N, finest_N//N
    increments = [math.fsum(fine_dw[j:j+group]) for j in range(0,finest_N,group)]
    close(math.fsum(increments),WT)
    S = S0
    initial = black_scholes(S,K,r,sigma,T,0.,"call")
    shares = initial["delta"]
    cash = initial["price"]-shares*S
    ledger = [(0.,S,shares*S+cash)]
    max_financing_residual = 0.
    for j,dw in enumerate(increments,1):
        cash *= math.exp(r*dt)  # Accrue cash, including interest on borrowing.
        S *= math.exp((hedge_mu-.5*sigma*sigma)*dt+sigma*dw)
        portfolio_before = shares*S+cash
        if j < N:  # At expiry settle payoff; do not compute singular expiry Delta.
            new_shares = black_scholes(S,K,r,sigma,T-j*dt,0.,"call")["delta"]
            cash -= (new_shares-shares)*S  # Pay for every rebalancing trade from cash.
            shares = new_shares
            financing_residual = shares*S+cash-portfolio_before
            max_financing_residual = max(max_financing_residual,abs(financing_residual))
            close(financing_residual,0)
        ledger.append((j*dt,S,shares*S+cash))
    close(S,exact_terminal)
    payoff = max(S-K,0.)
    return dict(N=N, terminal=S, portfolio=shares*S+cash, payoff=payoff,
                error=shares*S+cash-payoff, ledger=ledger,
                financing_residual=max_financing_residual)

hedge_results = [discrete_hedge(N) for N in [16,64,256]]
print(f"Same nested Brownian path: seed={hedge_seed}, finest N={finest_N}, physical mu={hedge_mu:.2%}, D=0.")
print("This Notebook is an independent seeded example; its path and residual need not match the website.")
print("Error = long replicating stock/cash portfolio - call payoff (equivalently hedged short-call terminal P&L).")
for result in hedge_results:
    print(f"{result['N']:3d} step: terminal stock={result['terminal']:.9f}, portfolio={result['portfolio']:.9f}, payoff={result['payoff']:.9f}, error={result['error']:+.9f}")
    print(f"          max self-financing trade residual={result['financing_residual']:.3e}")
print("Initial portfolio is funded by the model premium. There is no cash injection at rebalances and no final rebalance.")
print("One path's hedging error need not fall monotonically as step count increases; no such assertion is made.")
print("This simulation excludes transaction costs, jumps, stochastic volatility, and model misspecification.")''',
    "extensions": '''dividend = .03
call_D = black_scholes(S0,K,r,sigma,T,dividend,"call")
put_D = black_scholes(S0,K,r,sigma,T,dividend,"put")
digital_call = math.exp(-r*T)*N(call_D["d2"])
digital_put = math.exp(-r*T)*N(-call_D["d2"])
close(digital_call+digital_put,math.exp(-r*T))
print(f"With dividend yield D=3%: call={call_D['price']:.9f}, put={put_D['price']:.9f}.")
print(f"One-unit cash digital: call={digital_call:.9f}, put={digital_put:.9f}; sum={digital_call+digital_put:.9f}=PV(1).")
print(f"Q(S_T>K)=N(d2)={N(call_D['d2']):.9f}; call Delta=e^(-D*tau)*N(d1)={call_D['delta']:.9f}.")
print("Delta is not this risk-neutral exercise probability. Strike equality has probability zero for tau>0 and sigma>0.")
print("These closed forms are European. American/Bermudan contracts require an exercise rule in valuation.")''',
}

PLOT_CODE = '''class SVGPlot:
    """Jupyter rich-display protocol; no plotting or display package required."""
    def __init__(self, source):
        self.source = source
    def _repr_svg_(self):
        return self.source

# Deterministic chart computed from the formula; not empirical market data.
width, height = 800, 380
left, right, top, bottom = 66, 26, 30, 90
xmin,xmax,ymin,ymax = 40.,160.,0.,65.
def px(x): return left+(x-xmin)/(xmax-xmin)*(width-left-right)
def py(y): return height-bottom-(y-ymin)/(ymax-ymin)*(height-top-bottom)
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="bs-plot-title bs-plot-desc">',
       '<title id="bs-plot-title">European call value and terminal payoff</title>',
       '<desc id="bs-plot-desc">Hypothetical Black-Scholes call with K100, r5%, sigma20%, dividend yield0. Compare one year remaining, one month remaining and payoff.</desc>',
       '<rect width="100%" height="100%" fill="white"/>']
for tick in [0,20,40,60]:
    y=py(tick)
    svg.append(f'<path d="M {left} {y:.2f} H {width-right}" stroke="#e6e6e6"/><text x="{left-10}" y="{y+4:.2f}" text-anchor="end" font-family="sans-serif" font-size="12" fill="#333">{tick}</text>')
for tick in [40,60,80,100,120,140,160]:
    svg.append(f'<text x="{px(tick):.2f}" y="{height-bottom+22}" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#333">{tick}</text>')
for tau,color,dash,label in [(0.,"#737373","5 4","Payoff at expiry"),(1/12,"#0e807c","","Call: 1 month"),(1.,"#8b3fc4","","Call: 1 year")]:
    points=[]
    for i in range(121):
        stock=xmin+(xmax-xmin)*i/120
        value=max(stock-K,0.) if tau==0 else black_scholes(stock,K,r,sigma,tau,0.,"call")["price"]
        points.append(f'{px(stock):.2f},{py(value):.2f}')
    svg.append(f'<polyline points="{" ".join(points)}" fill="none" stroke="{color}" stroke-width="2.5" stroke-dasharray="{dash}"/>')
    index=[0.,1/12,1.].index(tau)
    x=80+index*220
    svg.append(f'<path d="M {x} {height-16} h 26" stroke="{color}" stroke-width="2.5" stroke-dasharray="{dash}"/><text x="{x+34}" y="{height-12}" font-family="sans-serif" font-size="12" fill="#333">{label}</text>')
svg.extend([f'<text x="{(left+width-right)/2}" y="{height-bottom+41}" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#333">Underlying price S (currency units)</text>',
            '<text x="16" y="18" font-family="sans-serif" font-size="12" fill="#333">Option value / payoff</text>', '</svg>'])
SVGPlot("".join(svg))'''


def markdown(text):
    """Keep canonical prose; remove browser-only mounts and adapt local links."""
    text = re.sub(r'<noscript>.*?</noscript>', '', text, flags=re.S)
    text = re.sub(r'<div id="[^"]+" class="interactive-mount"></div>', '', text)
    text = re.sub(r' · <a [^>]*download>.*?</a>', '', text)
    text = re.sub(r' · <a [^>]+>เปิดภาพขนาดเต็ม</a>', '', text)
    text = re.sub(r'^ดาวน์โหลด \[Notebook[^\n]+$', '', text, flags=re.M)
    text = re.sub(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', r'[\2](\1)', text, flags=re.S)
    text = text.replace('<strong>', '**').replace('</strong>', '**')
    text = re.sub(r'<summary>(.*?)</summary>', r'**\1**', text)
    text = re.sub(r'</?(?:p|div|section|details)\b[^>]*>', '\n', text)
    text = re.sub(r'(?<=\]\()((?:[\w-]+\.html)(?:#[^)]*)?)(?=\))', lambda m: BASE+m[1], text)
    text = re.sub(r'(?<=\]\()(notebooks/[^)]+\.ipynb)(?=\))', lambda m: BASE+m[1], text)
    cell = {"cell_type":"markdown", "metadata":{}, "source":re.sub(r'\n{3,}', '\n\n', text).strip()}
    for asset in re.findall(r'!\[[^\]]*\]\((assets/[^)]+\.svg)\)', cell["source"]):
        name = Path(asset).name
        cell.setdefault("attachments", {})[name] = {"image/svg+xml":(ROOT/asset).read_text()}
        cell["source"] = cell["source"].replace(f']({asset})', f'](attachment:{name})')
    cells.append(cell)


def code(text):
    """Execute cells, preserving stdout and a final rich SVG expression."""
    count = 1+sum(c["cell_type"] == "code" for c in cells)
    output = io.StringIO()
    parsed = ast.parse(text)
    result = None
    with contextlib.redirect_stdout(output):
        if parsed.body and isinstance(parsed.body[-1], ast.Expr):
            last = parsed.body.pop()
            exec(compile(parsed, f"black_scholes_cell_{count}", "exec"), namespace)
            result = eval(compile(ast.Expression(last.value), f"black_scholes_cell_{count}", "eval"), namespace)
        else:
            exec(compile(parsed, f"black_scholes_cell_{count}", "exec"), namespace)
    outputs = []
    if output.getvalue():
        outputs.append({"output_type":"stream", "name":"stdout", "text":output.getvalue()})
    if result is not None and hasattr(result,"_repr_svg_"):
        outputs.append({"output_type":"display_data", "data":{"image/svg+xml":result._repr_svg_(),
                        "text/plain":"<SVG chart computed from hypothetical Black-Scholes parameters>"}, "metadata":{}})
    cells.append({"cell_type":"code", "metadata":{}, "source":text, "execution_count":count, "outputs":outputs})


markdown("# Notebook: Black-Scholes Model\n\nใช้ Python 3 และ standard library แล้วเลือก **Run All** ไม่ต้องติดตั้งแพ็กเกจหรือดาวน์โหลดข้อมูล คำอธิบายอ่านจาก `black-scholes-model.md` ตัวเลขและกราฟเป็นตัวอย่างสมมติ ไม่ใช่ข้อมูลตลาด การสุ่มแต่ละชุดระบุ seed; Python และเว็บไซต์ใช้ตัวสุ่มต่างกันจึงไม่จำเป็นต้องได้เส้นทางเดียวกัน Monte Carlo แสดง standard error ภายใต้โมเดล ส่วนการ hedge ใช้ Brownian path ร่วมกันเมื่อเปลี่ยนจำนวน step เพื่อแยกผลของความถี่ในการปรับพอร์ต\n\n"+f"[เปิดบทเรียน]({BASE}black-scholes-model.html)")
markdown(body.split('<section id="',1)[0])
code(snippets["intro"])
seen = {"intro"}
sections = list(re.finditer(r'<section id="([^"]+)"[^>]*>(.*?)</section>', body, flags=re.S))
for match in sections:
    section_id,text = match.groups()
    markdown(f'<a id="{section_id}"></a>\n\n'+text)
    if section_id in snippets:
        code(snippets[section_id])
        seen.add(section_id)
    if section_id == "worked-example":
        code(PLOT_CODE)
assert seen == set(snippets), f"Missing source sections for code: {set(snippets)-seen}"
assert sections, "Expected canonical chapter sections"
trailing = body[sections[-1].end():].strip()
if trailing:
    markdown(trailing)
for index,cell in enumerate(cells):
    cell["id"] = f"black-scholes-{index:02d}"
notebook = {"nbformat":4, "nbformat_minor":5, "cells":cells, "metadata":{
    "kernelspec":{"display_name":"Python 3", "language":"python", "name":"python3"},
    "language_info":{"name":"python", "version":sys.version.split()[0], "file_extension":".py"},
    "source":{"path":"black-scholes-model.md", "sha256":hashlib.sha256(source.encode()).hexdigest()},
    "execution":{"method":"Python exec/eval in a shared namespace; captured stdout and SVG rich display", "generator":"scripts/make_black_scholes_notebook.py"}}}
output_path = ROOT / "notebooks/black-scholes-model.ipynb"
output_path.write_text(json.dumps(notebook,ensure_ascii=False,indent=1)+"\n")
print(f"Wrote {output_path.name}: {len(cells)} cells; {sum(c['cell_type']=='code' for c in cells)} executed code cells.")
