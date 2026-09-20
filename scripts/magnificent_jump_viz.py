"""Self-contained notebook cells for illustrative Variance Gamma figures."""

SETUP = '''import math
import numpy as np
import matplotlib.pyplot as plt
from matplotlib import font_manager

plt.rcParams.update({
    "font.family": "Roboto" if any(f.name == "Roboto" for f in font_manager.fontManager.ttflist) else "DejaVu Sans", "font.size": 11,
    "axes.spines.top": False, "axes.spines.right": False,
    "axes.labelcolor": "#222222", "text.color": "#222222",
    "figure.facecolor": "white", "axes.facecolor": "white",
    "svg.fonttype": "path", "svg.hashsalt": "magnificent-jump",
})
PURPLE, TEAL, GRAY = "#6200EE", "#007D73", "#666666"

def finish(axes):
    for ax in np.atleast_1d(axes):
        ax.grid(axis="y", color="#e5e5e5", linewidth=0.7)
        ax.set_axisbelow(True)
        ax.legend(frameon=False, fontsize=10)
    plt.show()
'''

CELLS = [
    '''# Hypothetical distributions, not empirical returns.
# With T=nu=1 and theta=0, VG is Laplace with scale sigma/sqrt(2).
sigma, T, nu = 0.2, 1.0, 1.0
x = np.linspace(-1, 1, 2001)
b = sigma / math.sqrt(2)
normal = np.exp(-0.5*(x/sigma)**2) / (sigma*math.sqrt(2*math.pi))
vg = np.exp(-np.abs(x)/b) / (2*b)
assert math.isclose(2*b*b, sigma*sigma)
fig, axes = plt.subplots(1, 2, figsize=(10, 4.8), layout="constrained")
for ax in axes:
    ax.plot(x, normal, color=TEAL, linestyle="--", linewidth=2, label="Normal")
    ax.plot(x, vg, color=PURPLE, linewidth=2, label="Symmetric VG")
    ax.set_xlabel("X at T = 1 (dimensionless)")
    ax.set_ylabel("Probability density")
axes[0].set_title("Same mean and variance")
axes[0].set_xlim(-0.65, 0.65)
axes[0].set_ylim(0, 3.8)
axes[1].set_title("Tail view on a logarithmic scale")
axes[1].set_yscale("log")
axes[1].set_ylim(0.00001, 10)
axes[1].set_xlim(-1, 1)
fig.suptitle("01 / Normal and symmetric Variance Gamma", fontsize=16)
finish(axes)
''',
    '''# Gamma increments: shape=dt/nu, scale=nu, with mean rate mu=1.
# Lines are grid observations; the plot does not resolve infinitely many jumps.
seed, steps, T, nu = 2026092002, 180, 1.0, 0.25
rng = np.random.default_rng(seed)
dt = T / steps
t = np.linspace(0, T, steps+1)
increments = rng.gamma(shape=dt/nu, scale=nu, size=steps)
clock = np.r_[0, np.cumsum(increments)]
assert np.all(np.diff(clock) >= 0)
fig, axes = plt.subplots(1, 2, figsize=(10, 4.8), layout="constrained")
axes[0].plot(t, t, color=TEAL, linestyle="--", linewidth=2, label="Calendar clock t")
axes[0].step(t, clock, where="post", color=PURPLE, linewidth=2, label="Gamma clock tau(t)")
axes[0].set(xlabel="Calendar time t (years)", ylabel="Business time tau (years)", title="One sampled clock")
axes[1].bar(t[1:], increments, width=dt*0.9, color=PURPLE, label="Gamma increments")
axes[1].axhline(dt, color=TEAL, linestyle="--", label="Expected increment dt")
axes[1].set(xlabel="Calendar time t (years)", ylabel="Clock increment (years)", title="Uneven increments on an even grid")
fig.suptitle("02 / A random clock", fontsize=16)
finish(axes)
print(f"Hypothetical path: seed={seed}; steps={steps}; nu={nu}; mu=1")
''',
    '''# X(T) = theta*G + sigma*sqrt(G)*Z, G~Gamma(T/nu,nu), Z~N(0,1).
# Shared G and Z isolate changes in theta; there is no calibration or option pricing.
seed, n, T, nu, sigma = 2026092003, 160000, 1.0, 0.4, 0.2
rng = np.random.default_rng(seed)
g = rng.gamma(shape=T/nu, scale=nu, size=n)
z = rng.standard_normal(n)
bins = np.linspace(-1.2, 1.2, 121)
fig, axes = plt.subplots(1, 2, figsize=(10, 4.8), layout="constrained")
print("theta   mean(sim / theory)    variance(sim / theory)   outside plot")
for theta, color, line in [(-0.15, PURPLE, "-"), (0.0, GRAY, ":"), (0.15, TEAL, "--")]:
    x = theta*g + sigma*np.sqrt(g)*z
    mean, variance = theta*T, (sigma*sigma + theta*theta*nu)*T
    # Sampling tolerances check the sampler, not model validity for market data.
    assert abs(x.mean()-mean) < 6*math.sqrt(variance/n)
    fourth = 3*variance**2 + (3*sigma**4*nu + 12*sigma*sigma*theta*theta*nu*nu + 6*theta**4*nu**3)*T
    assert abs(x.var()-variance) < 6*math.sqrt((fourth-variance**2)/n)
    counts, _ = np.histogram(x, bins=bins)
    density = counts / (n*np.diff(bins))  # Do not renormalize the visible range.
    centers = (bins[:-1]+bins[1:])/2
    for ax in axes:
        ax.plot(centers, density, color=color, linestyle=line, linewidth=2, label=f"theta = {theta:+.2f}")
    outside = np.count_nonzero((x<bins[0]) | (x>bins[-1]))
    print(f"{theta:+.2f}   {x.mean():+.4f} / {mean:+.4f}      {x.var():.4f} / {variance:.4f}       {outside}/{n}")
for ax in axes:
    ax.set(xlabel="X(T), dimensionless", ylabel="Estimated probability density", xlim=(-1.2, 1.2))
axes[0].set_title("Changing drift inside the random clock")
axes[0].set_ylim(bottom=0)
axes[1].set(title="Tail view on a logarithmic scale", yscale="log", ylim=(0.0001, 10))
fig.suptitle("03 / Variance Gamma with three drift values", fontsize=16)
finish(axes)
print(f"Hypothetical samples: seed={seed}; n={n:,} per theta; T={T}; nu={nu}; sigma={sigma}")
''',
]

CAPTIONS = [
    "Viz เพิ่มเติม · ตัวอย่างสมมติ: เปรียบเทียบ Normal กับ symmetric Variance Gamma "
    "ที่มีค่าเฉลี่ย 0 และ variance 0.04 เท่ากัน กำหนด T = 1, θ = 0, σ = 0.2, ν = 1, μ = 1 "
    "กรณีนี้ VG เป็น Laplace distribution กราฟขวาใช้แกนความหนาแน่นแบบ log; ไม่ใช่ข้อมูลตลาด",
    "Viz เพิ่มเติม · ตัวอย่างจำลอง Gamma clock หนึ่งเส้นทาง: μ = 1, ν = 0.25, T = 1 ปี "
    "แบ่ง 180 time steps, seed = 2026092002 ใช้ Gamma increments ที่มี shape = Δt/ν และ scale = ν "
    "ภาพแสดงค่าบนกริดเวลา ไม่ได้แสดงทุก jump ระหว่างจุดสังเกต",
    "Viz เพิ่มเติม · จำลอง X(T) = θG + σ√G Z โดย G เป็น Gamma(shape = T/ν, scale = ν) "
    "และ Z เป็น Standard Normal ที่เป็นอิสระจาก G ใช้ T = 1, ν = 0.4, σ = 0.2, μ = 1 "
    "และ θ = −0.15, 0, 0.15 จำนวน 160,000 ตัวอย่างต่อค่า θ, seed = 2026092003 "
    "เป็น histogram จากข้อมูลจำลอง ไม่ใช่ผล fit ตลาดหรือการคำนวณราคา Option",
]
