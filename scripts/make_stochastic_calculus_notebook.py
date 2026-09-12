"""Build source-aligned Applied Stochastic Calculus notebook; execute stdlib cells."""
import contextlib
import hashlib
import io
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://nutdnuy.github.io/quantitative-finance-notes/"
source = (ROOT / "applied-stochastic-calculus.md").read_text()
body = re.sub(r"\A---\n.*?\n---\n", "", source, flags=re.S)
cells, namespace = [], {}
snippets = {
    "intro": '''import math
import random
def close(actual, expected, tolerance=1e-10):
    assert math.isclose(actual, expected, rel_tol=tolerance, abs_tol=tolerance), (actual, expected)
print("Python standard library only. Each Monte Carlo experiment declares its own seed.")
print("Notebook and website use separate random-number implementations; their simulated paths need not match.")''',
    "brownian": '''T, N, seed = 1., 64, 2510401
dt = T/N
rng = random.Random(seed)
coin_steps = [math.sqrt(dt)*(1 if rng.random()<.5 else -1) for _ in range(N)]
brownian_steps = [math.sqrt(dt)*rng.gauss(0,1) for _ in range(N)]
coin_qv = sum(dw*dw for dw in coin_steps)
brownian_qv = sum(dw*dw for dw in brownian_steps)
close(coin_qv,T)
print(f"T={T}, N={N}, seed={seed}")
print(f"Fair-coin QV={coin_qv:.10f} exactly at this finite grid; Gaussian-increment QV={brownian_qv:.10f}")
print(f"One Gaussian increment squared={brownian_steps[0]**2:.10f}; dt={dt:.10f}: these are not required to agree.")''',
    "quadratic-variation": '''T, repetitions, seed = 1., 2000, 2510402
rng = random.Random(seed)
print(f"Monte Carlo QV check: {repetitions} independent paths per N; seed={seed}")
print("N     empirical E[Q_N]   empirical MSE   theoretical MSE=2*T^2/N")
for N in [8,32,128]:
    dt = T/N
    qvs = [dt*sum(rng.gauss(0,1)**2 for _ in range(N)) for _ in range(repetitions)]
    mean = sum(qvs)/repetitions
    mse = sum((q-T)**2 for q in qvs)/repetitions
    theoretical = 2*T*T/N
    assert abs(mse/theoretical-1)<.18  # Sampling tolerance, not exact equality.
    assert abs(mean-T)<.06
    print(f"{N:3d} {mean:19.9f} {mse:15.9f} {theoretical:23.9f}")
print("The L2 result is E[(Q_N-T)^2]=2*T^2/N; Monte Carlo illustrates it with sampling error.")''',
    "ito-integral": '''W, left_sum = 0., 0.
for dw in brownian_steps:
    left_sum += W*dw  # Use the value known BEFORE the increment.
    W += dw
QN = sum(dw*dw for dw in brownian_steps)
finite_identity = (W*W-QN)/2
limit_integral = (W*W-1)/2  # T=1 for the Brownian grid above.
close(left_sum,finite_identity)
close(left_sum-limit_integral,(1-QN)/2)
print(f"W_T={W:.10f}; Q_N={QN:.10f}")
print(f"Finite left sum={left_sum:.10f}; (W_T^2-Q_N)/2={finite_identity:.10f}")
print(f"Ito integral for this endpoint=(W_T^2-T)/2={limit_integral:.10f}")
print(f"Finite-grid error={(left_sum-limit_integral):.10f}=(T-Q_N)/2; ordinary-chain-rule value misses T/2.")''',
    "ito-lemma": '''def ito_terms(Ft, Fx, Fxx, drift, diffusion):
    return Ft+drift*Fx+.5*diffusion**2*Fxx, diffusion*Fx
# F(Y)=Y^2, dY=sqrt(2)*c*dW links directly to the transition-density chapter.
y, c = 1., 1.
drift_F, diffusion_F = ito_terms(0,2*y,2,0,math.sqrt(2)*c)
close(drift_F,2*c*c)
close(diffusion_F,2*y*math.sqrt(2)*c)
print(f"F(Y)=Y^2 at y=1,c=1: Ito drift={drift_F:.6f}, diffusion={diffusion_F:.6f}")
print("Thus E[Y_T^2 | Y_t=y]=y^2+2*c^2*(T-t), matching the density's variance.")
# A time-dependent function: F(S,t)=exp(-r*t)*S^2 under GBM.
S,t,mu,sigma,r = 100.,.5,.1,.2,.03
F = math.exp(-r*t)*S*S
drift_F,diffusion_F = ito_terms(-r*F,2*F/S,2*F/S**2,mu*S,sigma*S)
close(drift_F,(2*mu+sigma*sigma-r)*F); close(diffusion_F,2*sigma*F)
print(f"Discounted square: drift={drift_F:.9f}, diffusion={diffusion_F:.9f}; includes both F_t and the Ito correction.")''',
    "gbm": '''S0,mu,sigma,T = 100.,.1,.2,1.
log_drift,log_diffusion = ito_terms(0,1/S0,-1/S0**2,mu*S0,sigma*S0)
close(log_drift,.08); close(log_diffusion,.2)
mean = S0*math.exp(mu*T)
median = S0*math.exp((mu-.5*sigma*sigma)*T)
close(mean,110.51709180756477); close(median,108.32870676749586)
print(f"Log-return mean={log_drift*T:.6f}, variance={sigma*sigma*T:.6f}")
print(f"GBM S0=100, mu=.1, sigma=.2, T=1: mean={mean:.9f}, median={median:.9f}")
for WT in [-3.,0.,2.]:
    terminal = S0*math.exp((mu-.5*sigma*sigma)*T+sigma*WT)
    assert terminal > 0
    close(math.log(terminal/S0),(mu-.5*sigma*sigma)*T+sigma*WT)
    print(f"W_T={WT:+.1f}: exact terminal S={terminal:.9f}")''',
    "ou": '''def ou_moments(initial,theta,kappa,sigma,tau):
    if kappa <= 0 or sigma < 0 or tau < 0:
        raise ValueError("Require kappa>0, sigma>=0 and tau>=0")
    mean = theta+(initial-theta)*math.exp(-kappa*tau)
    variance = sigma*sigma*(-math.expm1(-2*kappa*tau))/(2*kappa)
    return mean,variance
r0,theta,kappa,sigma_r,T = .05,.03,1.5,.01,1.
mean,variance = ou_moments(r0,theta,kappa,sigma_r,T)
sd,stationary_sd = math.sqrt(variance),sigma_r/math.sqrt(2*kappa)
close(mean,.034462603202968595); close(sd,.005627944952443819)
close(stationary_sd,.005773502691896258)
long_mean,long_variance = ou_moments(r0,theta,kappa,sigma_r,100.)
close(long_mean,theta); close(long_variance,stationary_sd**2)
print(f"OU/Vasicek T=1: mean={mean:.12f}, SD={sd:.12f}; stationary SD={stationary_sd:.12f}")
print("Rate units are decimals: SD .005627945 is approximately .5627945 percentage points.")''',
    "kolmogorov": '''# Verify the general forward/backward equations using a nonconstant OU drift.
kappa,theta,sigma_r = 1.5,.03,.01
def kernel(y,t,z,T):
    mean,variance = ou_moments(y,theta,kappa,sigma_r,T-t)
    return math.exp(-(z-mean)**2/(2*variance))/math.sqrt(2*math.pi*variance)
y,t,z,T = .05,0.,.037,1.
et,ex = 1e-5,1e-6
p = kernel(y,t,z,T)
p_T = (kernel(y,t,z,T+et)-kernel(y,t,z,T-et))/(2*et)
p_t = (kernel(y,t+et,z,T)-kernel(y,t-et,z,T))/(2*et)
p_y = (kernel(y+ex,t,z,T)-kernel(y-ex,t,z,T))/(2*ex)
p_yy = (kernel(y+ex,t,z,T)-2*p+kernel(y-ex,t,z,T))/ex**2
p_zz = (kernel(y,t,z+ex,T)-2*p+kernel(y,t,z-ex,T))/ex**2
divergence = (kappa*(theta-z-ex)*kernel(y,t,z+ex,T)-kappa*(theta-z+ex)*kernel(y,t,z-ex,T))/(2*ex)
forward = p_T+divergence-.5*sigma_r*sigma_r*p_zz
backward = p_t+kappa*(theta-y)*p_y+.5*sigma_r*sigma_r*p_yy
close(forward,0,2e-5); close(backward,0,2e-5)
print(f"OU finite-difference residual: forward={forward:.3e}, backward={backward:.3e}")
print("Forward differentiates the drift*density product; backward multiplies a derivative by the initial-state drift.")''',
    "simulation": '''S0,mu,sigma,dt = 100.,.1,.2,.01
S = S0
for Z,expected in zip([.12,-.25],[100.34,99.93864]):
    S *= 1+mu*dt+sigma*math.sqrt(dt)*Z
    close(S,expected)
    print(f"Euler with Z={Z:+.2f}: S={S:.8f}")
T,fine_N,seed = 1.,1024,2510403
rng = random.Random(seed)
fine = [math.sqrt(T/fine_N)*rng.gauss(0,1) for _ in range(fine_N)]
WT = sum(fine)
exact = S0*math.exp((mu-.5*sigma*sigma)*T+sigma*WT)
print(f"Same Brownian path at every resolution: seed={seed}, exact terminal={exact:.9f}")
for N in [16,64,256,1024]:
    group = fine_N//N
    increments = [sum(fine[j:j+group]) for j in range(0,fine_N,group)]
    close(sum(increments),WT)
    euler,exact_steps = S0,S0
    for dw in increments:
        euler *= 1+mu*T/N+sigma*dw
        exact_steps *= math.exp((mu-.5*sigma*sigma)*T/N+sigma*dw)
    close(exact_steps,exact)
    print(f"N={N:4d}: Euler={euler:.9f}, absolute error={abs(euler-exact):.9f}")
print("Pathwise discretization errors need not decrease monotonically; this is one coupled path, not a convergence proof.")''',
    "correlation": '''def innovations(z1,z2,rho):
    if not -1 <= rho <= 1:
        raise ValueError("rho must be in [-1,1]")
    return z1,rho*z1+math.sqrt(1-rho*rho)*z2
close(innovations(1,-.5,-.6)[1],-1)
close(innovations(1,-.5,1)[1],1); close(innovations(1,-.5,-1)[1],-1)
seed,count,rho = 2510404,20000,-.6
rng = random.Random(seed)
pairs = [innovations(rng.gauss(0,1),rng.gauss(0,1),rho) for _ in range(count)]
m1,m2 = (sum(p[j] for p in pairs)/count for j in [0,1])
v1,v2 = (sum((p[j]-m)**2 for p in pairs)/count for j,m in [(0,m1),(1,m2)])
cov = sum((a-m1)*(b-m2) for a,b in pairs)/count
correlation = cov/math.sqrt(v1*v2)
assert abs(correlation-rho)<.035 and abs(v1-1)<.05 and abs(v2-1)<.05
print("Fixed example: rho=-.6, Z1=1, Z2=-.5 gives (phi1,phi2)=(1,-1).")
print(f"{count} pairs, seed={seed}: variances=({v1:.6f},{v2:.6f}), sample correlation={correlation:.6f}")
print("These are correlations of innovations, not a claim about a finite sample of asset price levels.")
print("All assertions passed.")''',
}

def markdown(text):
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
    cell = {"cell_type": "markdown", "metadata": {}, "source": re.sub(r'\n{3,}', '\n\n', text).strip()}
    for asset in re.findall(r'!\[[^\]]*\]\((assets/diagrams/[^)]+\.svg)\)', cell["source"]):
        name = Path(asset).name
        cell.setdefault("attachments", {})[name] = {"image/svg+xml": (ROOT/asset).read_text()}
        cell["source"] = cell["source"].replace(f']({asset})', f'](attachment:{name})')
    cells.append(cell)

def code(text):
    count = 1+sum(c["cell_type"] == "code" for c in cells)
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        exec(compile(text, f"stochastic_calculus_cell_{count}", "exec"), namespace)
    cells.append({"cell_type": "code", "metadata": {}, "source": text, "execution_count": count,
                  "outputs": [{"output_type": "stream", "name": "stdout", "text": output.getvalue()}]})

markdown("# Notebook: Applied Stochastic Calculus\n\nใช้ Python 3 และ standard library แล้วเลือก **Run All** ไม่ต้องติดตั้งแพ็กเกจหรือดาวน์โหลดข้อมูล คำอธิบายอ่านจาก `applied-stochastic-calculus.md` พร้อมการทดลองสมมติที่คำนวณขึ้นใหม่ ทุกการสุ่มระบุ seed; Notebook ใช้ `random.gauss` จึงเป็นการทดลองที่ทำซ้ำได้แยกจากตัวสุ่มบนเว็บไซต์ ตัวอย่าง Monte Carlo มี sampling error และ finite difference มี discretization error การผ่าน checks ไม่ใช่บทพิสูจน์การลู่เข้า\n\n"+f"[เปิดบทเรียน]({BASE}applied-stochastic-calculus.html)")
markdown(body.split('<section id="', 1)[0])
code(snippets["intro"])
seen = {"intro"}
for match in re.finditer(r'<section id="([^"]+)"[^>]*>(.*?)</section>', body, flags=re.S):
    section_id,text = match.groups()
    markdown(text)
    if section_id in snippets:
        code(snippets[section_id])
        seen.add(section_id)
assert seen == set(snippets), f"Missing source sections for code: {set(snippets)-seen}"
for index,cell in enumerate(cells):
    cell["id"] = f"stochastic-calculus-{index:02d}"
notebook = {"nbformat":4,"nbformat_minor":5,"cells":cells,"metadata":{
    "kernelspec":{"display_name":"Python 3","language":"python","name":"python3"},
    "language_info":{"name":"python","version":sys.version.split()[0],"file_extension":".py"},
    "source":{"path":"applied-stochastic-calculus.md","sha256":hashlib.sha256(source.encode()).hexdigest()},
    "execution":{"method":"Python exec in a shared namespace; captured stdout","generator":"scripts/make_stochastic_calculus_notebook.py"}}}
output_path = ROOT / "notebooks/applied-stochastic-calculus.ipynb"
output_path.write_text(json.dumps(notebook,ensure_ascii=False,indent=1)+"\n")
print(f"Wrote {output_path.name}: {len(cells)} cells; {sum(c['cell_type']=='code' for c in cells)} executed code cells.")
