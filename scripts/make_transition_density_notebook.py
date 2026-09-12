"""Create the source-aligned transition-density notebook; execute stdlib cells."""
import contextlib
import hashlib
import io
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://nutdnuy.github.io/quantitative-finance-notes/"
source = (ROOT / "transition-density-functions.md").read_text()
body = re.sub(r"\A---\n.*?\n---\n", "", source, flags=re.S)
cells, namespace = [], {}
snippets = {
    "intro": '''import math
def close(actual, expected, tolerance=1e-9):
    assert math.isclose(actual, expected, rel_tol=tolerance, abs_tol=tolerance), (actual, expected)

def gaussian(x, y=0, c=1, tau=1):
    """Transition density, mean y and variance 2*c*c*tau; tau must be positive."""
    if c <= 0 or tau <= 0:
        raise ValueError("c and elapsed time tau must be positive")
    return math.exp(-((x-y)/(2*c*math.sqrt(tau)))**2)/(2*c*math.sqrt(math.pi*tau))

def interval(a, b, y=0, c=1, tau=1):
    if a > b or c <= 0 or tau <= 0:
        raise ValueError("Require a <= b, c > 0 and tau > 0")
    za, zb = (a-y)/(2*c*math.sqrt(tau)), (b-y)/(2*c*math.sqrt(tau))
    if za >= 0:
        return (math.erfc(za)-math.erfc(zb))/2
    if zb <= 0:
        return (math.erfc(-zb)-math.erfc(-za))/2
    return (math.erf(zb)-math.erf(za))/2

def integrate(f, a, b, panels=4000):
    """Composite Simpson quadrature on a finite interval."""
    assert panels > 0 and panels % 2 == 0
    h = (b-a)/panels
    return h/3*(f(a)+f(b)+sum((4 if j%2 else 2)*f(a+j*h) for j in range(1,panels)))
print("Python standard library only; examples are mathematical models, not market data.")''',
    "walk": '''def trinomial(steps, alpha=0.2):
    """Return node probabilities by integer displacement; independent increments."""
    if not isinstance(steps, int) or steps < 0 or not 0 <= alpha <= 0.5:
        raise ValueError("Integer steps >= 0 and 0 <= alpha <= 0.5 required")
    masses = {0: 1.0}
    for _ in range(steps):
        nxt = {}
        for j, mass in masses.items():
            for jump, probability in [(-1,alpha), (0,1-2*alpha), (1,alpha)]:
                nxt[j+jump] = nxt.get(j+jump, 0)+mass*probability
        masses = nxt
    return masses
masses = trinomial(2)
for j, expected in zip(range(-2,3), [.04,.24,.44,.24,.04]):
    close(masses[j], expected)
    print(f"Position {j:+d}: probability mass = {masses[j]:.2f}")
close(sum(masses.values()), 1)
close(sum(j*p for j,p in masses.items()), 0)
close(sum(j*j*p for j,p in masses.items()), .8)
print("Total mass=1; mean=0; variance=0.8 for h=1.")''',
    "density": '''peak = gaussian(0, c=0.1, tau=1)
assert peak > 1
close(interval(-math.inf, math.inf, c=.1), 1)
close(interval(0, 0, c=.1), 0)
print(f"A valid Gaussian density can exceed 1: peak={peak:.6f}")
print(f"Integral over the full line={interval(-math.inf, math.inf, c=.1):.1f}; point probability={interval(0,0,c=.1):.1f}")''',
    "scaling": '''alpha, h, dt, steps = .2, 1., 1., 2
c_squared = alpha*h*h/dt
tau = steps*dt
discrete_variance = sum((j*h)**2*p for j,p in trinomial(steps,alpha).items())
close(c_squared, .2); close(discrete_variance, 2*c_squared*tau)
print(f"alpha={alpha}, h={h}, dt={dt}: c^2={c_squared:.2f}, tau={tau:.2f}")
print(f"Var per step={2*alpha*h*h:.2f}; total Var={discrete_variance:.2f}=2*c^2*tau")''',
    "compare": '''# Differentiate the Gaussian numerically in the actual initial/terminal variables.
for y, t, x, T, c in [(1.,0.,1.7,1.,1.), (-.5,.2,1.,1.4,.7), (0.,0.,0.,.5,1.2)]:
    et, ex = 1e-5, 1e-3
    kernel = lambda y,t,x,T: gaussian(x,y,c,T-t)
    p = kernel(y,t,x,T)
    p_T = (kernel(y,t,x,T+et)-kernel(y,t,x,T-et))/(2*et)
    p_t = (kernel(y,t+et,x,T)-kernel(y,t-et,x,T))/(2*et)
    p_xx = (kernel(y,t,x+ex,T)-2*p+kernel(y,t,x-ex,T))/ex**2
    p_yy = (kernel(y+ex,t,x,T)-2*p+kernel(y-ex,t,x,T))/ex**2
    forward, backward = p_T-c*c*p_xx, p_t+c*c*p_yy
    close(forward, 0, 2e-7); close(backward, 0, 2e-7)
    assert abs(p_t-c*c*p_yy) > .001  # The incorrect backward sign fails.
    print(f"(y,t;x,T)=({y},{t};{x},{T}): forward residual={forward:.3e}, backward residual={backward:.3e}")
print("Finite-difference residuals check both variables and signs; they are not a PDE solution proof.")''',
    "gaussian": '''for tau, expected in [(1,.5204998778130465), (.25,.8427007929497149)]:
    probability = interval(0,2,y=1,c=1,tau=tau)
    close(probability, expected)
    print(f"y=1, c=1, tau={tau}: P(0<Y<2)={probability:.12f}; variance={2*tau:.2f}")
y, c, tau = 1., 1., 1.
sd = c*math.sqrt(2*tau)
a, b = y-10*sd, y+10*sd
mass = integrate(lambda x: gaussian(x,y,c,tau), a,b)
mean = integrate(lambda x: x*gaussian(x,y,c,tau), a,b)
variance = integrate(lambda x: (x-y)**2*gaussian(x,y,c,tau), a,b)
close(mass,1); close(mean,1); close(variance,2)
print(f"Numerical integrals within +/-10 SD: mass={mass:.12f}, mean={mean:.12f}, variance={variance:.12f}")
# Chapman-Kolmogorov: integrate over every intermediate state at time s.
y, x, s, T, c = 1., 1.8, .4, 1., 1.
direct = gaussian(x,y,c,T)
composition = integrate(lambda z: gaussian(z,y,c,s)*gaussian(x,z,c,T-s), -14,16)
close(composition, direct)
print(f"Gaussian composition: integral={composition:.12f}, direct kernel={direct:.12f}")''',
    "dirac": '''print("tau       P(0<Y<2 | Y_0=1)   P(2<Y<3 | Y_0=1)   peak density")
inside, outside = [], []
for tau in [1., .25, .0625, .015625]:
    pin, pout = interval(0,2,1,1,tau), interval(2,3,1,1,tau)
    inside.append(pin); outside.append(pout)
    print(f"{tau:.6f} {pin:21.12f} {pout:22.12f} {gaussian(1,1,1,tau):14.7f}")
assert all(a < b for a,b in zip(inside,inside[1:]))
assert all(a > b for a,b in zip(outside,outside[1:]))
assert inside[-1] > .9999999 and outside[-1] < 1e-7
try:
    gaussian(1,1,1,0)
except ValueError:
    print("tau=0 is intentionally rejected: a Dirac point mass is not a finite Gaussian density.")
else:
    raise AssertionError("The Gaussian formula must reject tau=0")''',
    "experiments": '''alpha, c, tau = .2, 1., 1.
errors = []
print("N       dt         h           mass       variance     L1 error of matched bin masses")
for N in [10,40,160,640]:
    dt = tau/N
    h = c*math.sqrt(dt/alpha)
    masses = trinomial(N,alpha)
    mass = sum(masses.values())
    variance = sum((j*h)**2*p for j,p in masses.items())
    close(mass,1); close(variance,2*c*c*tau)
    error = sum(abs(p-interval((j-.5)*h,(j+.5)*h,0,c,tau)) for j,p in masses.items())
    error += interval(-math.inf,(-N-.5)*h,0,c,tau)+interval((N+.5)*h,math.inf,0,c,tau)
    errors.append(error)
    print(f"{N:3d} {dt:11.7f} {h:11.7f} {mass:11.8f} {variance:11.8f} {error:20.10f}")
assert all(a > b for a,b in zip(errors,errors[1:]))
print("Each lattice mass is compared with a Gaussian interval probability of width h, not with density height.")
print("These examples support the approximation; finite numerical checks do not prove convergence.")''',
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
    asset = "assets/diagrams/kolmogorov-directions.svg"
    if asset in cell["source"]:
        cell["attachments"] = {"kolmogorov-directions.svg": {"image/svg+xml": (ROOT/asset).read_text()}}
        cell["source"] = cell["source"].replace(f']({asset})', '](attachment:kolmogorov-directions.svg)')
    cells.append(cell)

def code(text):
    count = 1+sum(c["cell_type"] == "code" for c in cells)
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        exec(compile(text, f"transition_density_cell_{count}", "exec"), namespace)
    cells.append({"cell_type": "code", "metadata": {}, "source": text, "execution_count": count,
                  "outputs": [{"output_type": "stream", "name": "stdout", "text": output.getvalue()}]})

markdown("# Notebook: Transition Density Functions\n\nใช้ Python 3 และ standard library แล้วเลือก **Run All** ไม่ต้องติดตั้งแพ็กเกจหรือดาวน์โหลดข้อมูล ภาพประกอบฝังอยู่ในไฟล์ คำอธิบายอ่านจาก `transition-density-functions.md` พร้อมโค้ดคำนวณตามหัวข้อ ฟังก์ชันช่วยคำนวณ Gaussian และอินทิกรัลอยู่เซลล์แรก ค่าจาก erf/erfc ใช้ความแม่นยำของ floating point ส่วนอินทิกรัลและอนุพันธ์เชิงตัวเลขมีความคลาดเคลื่อนตามวิธีที่ใช้\n\n"+f"[เปิดบทเรียนและห้องทดลอง]({BASE}transition-density-functions.html#experiments)")
markdown(body.split('<section id="', 1)[0])
code(snippets["intro"])
seen = {"intro"}
for match in re.finditer(r'<section id="([^"]+)"[^>]*>(.*?)</section>', body, flags=re.S):
    section_id, text = match.groups()
    markdown(text)
    if section_id in snippets:
        code(snippets[section_id])
        seen.add(section_id)
assert seen == set(snippets), f"Missing source sections for code: {set(snippets)-seen}"
for index, cell in enumerate(cells):
    cell["id"] = f"transition-density-{index:02d}"
notebook = {"nbformat": 4, "nbformat_minor": 5, "cells": cells, "metadata": {
    "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
    "language_info": {"name": "python", "version": sys.version.split()[0], "file_extension": ".py"},
    "source": {"path": "transition-density-functions.md", "sha256": hashlib.sha256(source.encode()).hexdigest()},
    "execution": {"method": "Python exec in a shared namespace; captured stdout", "generator": "scripts/make_transition_density_notebook.py"}}}
output_path = ROOT / "notebooks/transition-density-functions.ipynb"
output_path.write_text(json.dumps(notebook, ensure_ascii=False, indent=1)+"\n")
print(f"Wrote {output_path.name}: {len(cells)} cells; {sum(c['cell_type']=='code' for c in cells)} executed code cells.")
