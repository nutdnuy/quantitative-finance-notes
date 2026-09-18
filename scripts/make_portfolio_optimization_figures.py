#!/usr/bin/env python3
"""Generate deterministic SVG figures for the portfolio-optimization lesson.

The figures use only Python's standard library. Numerical visuals are rebuilt
from the stated four-asset assumptions; conceptual visuals use explicit,
deterministic geometry and are labelled as illustrations.
"""

from __future__ import annotations

from html import escape
from base64 import b64encode
from math import cos, pi, sin, sqrt
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "images"

PURPLE = "#6200EE"
PURPLE_LIGHT = "#EFE7FA"
TEAL = "#007F73"
TEAL_LIGHT = "#E3F4F1"
ORANGE = "#A24C22"
ERROR = "#B00020"
INK = "#202124"
GRAY = "#64666B"
LIGHT_GRAY = "#F4F4F6"
GRID = "#E3E3E8"
WHITE = "#FFFFFF"

MU = [0.05, 0.07, 0.15, 0.27]
SD = [0.07, 0.12, 0.30, 0.60]
CORR = [
    [1.0, 0.8, 0.5, 0.4],
    [0.8, 1.0, 0.7, 0.5],
    [0.5, 0.7, 1.0, 0.8],
    [0.4, 0.5, 0.8, 1.0],
]
RF = 0.025
MARKET = [0.05, 0.40, 0.45, 0.10]
LAMBDA_MKT = 2.24
TAU = 1 / 120
P = [[-1.0, 0.0, 1.0, 0.0], [0.0, 1.0, 0.0, 0.0]]
Q = [0.10, 0.03]


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def transpose(a):
    return [list(row) for row in zip(*a)]


def mat_vec(a, x):
    return [dot(row, x) for row in a]


def mat_mul(a, b):
    bt = transpose(b)
    return [[dot(row, col) for col in bt] for row in a]


def solve(a, b):
    """Solve Ax=b with pivoted Gauss-Jordan elimination."""
    n = len(b)
    work = [list(row) + [b[i]] for i, row in enumerate(a)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda row: abs(work[row][col]))
        if abs(work[pivot][col]) < 1e-14:
            raise ValueError("Singular matrix")
        work[col], work[pivot] = work[pivot], work[col]
        scale = work[col][col]
        work[col] = [value / scale for value in work[col]]
        for row in range(n):
            if row == col:
                continue
            factor = work[row][col]
            work[row] = [
                work[row][j] - factor * work[col][j] for j in range(n + 1)
            ]
    return [work[i][-1] for i in range(n)]


def inverse(a):
    n = len(a)
    columns = [solve(a, [1.0 if i == j else 0.0 for i in range(n)]) for j in range(n)]
    return transpose(columns)


def submatrix(a, indices):
    return [[a[i][j] for j in indices] for i in indices]


SIGMA = [[SD[i] * CORR[i][j] * SD[j] for j in range(4)] for i in range(4)]
SIGMA_INV = inverse(SIGMA)
ONES = [1.0] * 4
INV_ONE = mat_vec(SIGMA_INV, ONES)
INV_MU = mat_vec(SIGMA_INV, MU)
A = dot(ONES, INV_ONE)
B = dot(MU, INV_ONE)
C = dot(MU, INV_MU)
D = A * C - B * B


def target_weights(target):
    lam = (A * target - B) / D
    gamma = (C - B * target) / D
    return [lam * INV_MU[i] + gamma * INV_ONE[i] for i in range(4)]


def variance(weights):
    return dot(weights, mat_vec(SIGMA, weights))


def target_point(target):
    weights = target_weights(target)
    return sqrt(max(0.0, variance(weights))), target, weights


GMV_WEIGHTS = [value / A for value in INV_ONE]
GMV_RETURN = B / A
GMV_SD = sqrt(1 / A)

EXCESS = [value - RF for value in MU]
INV_EXCESS = mat_vec(SIGMA_INV, EXCESS)
TANGENCY_WEIGHTS = [value / sum(INV_EXCESS) for value in INV_EXCESS]
TANGENCY_RETURN = dot(MU, TANGENCY_WEIGHTS)
TANGENCY_SD = sqrt(variance(TANGENCY_WEIGHTS))
TANGENCY_SHARPE = (TANGENCY_RETURN - RF) / TANGENCY_SD


def long_only_target_weights(target, active_indices):
    sigma = submatrix(SIGMA, active_indices)
    sigma_inv = inverse(sigma)
    mu = [MU[i] for i in active_indices]
    ones = [1.0] * len(active_indices)
    inv_one = mat_vec(sigma_inv, ones)
    inv_mu = mat_vec(sigma_inv, mu)
    aa = dot(ones, inv_one)
    bb = dot(mu, inv_one)
    cc = dot(mu, inv_mu)
    dd = aa * cc - bb * bb
    lam = (aa * target - bb) / dd
    gamma = (cc - bb * target) / dd
    active = [lam * inv_mu[i] + gamma * inv_one[i] for i in range(len(active_indices))]
    weights = [0.0] * 4
    for index, value in zip(active_indices, active):
        weights[index] = value
    return weights


KKT_WEIGHTS = long_only_target_weights(0.20, [1, 2, 3])


PRIOR = [LAMBDA_MKT * value for value in mat_vec(SIGMA, MARKET)]
TAU_SIGMA = [[TAU * value for value in row] for row in SIGMA]
P_T = transpose(P)
P_TAU_P = mat_mul(mat_mul(P, TAU_SIGMA), P_T)
OMEGA = [
    [P_TAU_P[i][i] if i == j else 0.0 for j in range(len(P))]
    for i in range(len(P))
]
TAU_INV = inverse(TAU_SIGMA)
OMEGA_INV = inverse(OMEGA)
VIEW_PRECISION = mat_mul(mat_mul(P_T, OMEGA_INV), P)
POSTERIOR_PRECISION = [
    [TAU_INV[i][j] + VIEW_PRECISION[i][j] for j in range(4)] for i in range(4)
]
rhs_prior = mat_vec(TAU_INV, PRIOR)
rhs_views = mat_vec(mat_mul(P_T, OMEGA_INV), Q)
POSTERIOR = solve(
    POSTERIOR_PRECISION,
    [rhs_prior[i] + rhs_views[i] for i in range(4)],
)
BL_RISKY = [value / LAMBDA_MKT for value in solve(SIGMA, POSTERIOR)]
BL_RF = 1 - sum(BL_RISKY)


def close_list(actual, expected, tolerance=1e-7):
    return all(abs(a - b) <= tolerance for a, b in zip(actual, expected))


assert close_list(
    target_weights(0.10),
    [0.528412108, 0.172888075, 0.159764343, 0.138935474],
)
assert close_list(
    POSTERIOR,
    [0.01678181, 0.03755244, 0.12484270, 0.22717374],
)
assert close_list(
    KKT_WEIGHTS,
    [0.0, 0.02631579, 0.53947368, 0.43421053],
)
assert abs(BL_RF - 0.23414049) < 1e-8


class SVG:
    def __init__(self, slug, title, desc, subtitle, footer, width=1120, height=680):
        self.slug = slug
        self.title = title
        self.desc = desc
        self.subtitle = subtitle
        self.footer = footer
        self.width = width
        self.height = height
        self.items = [
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="{slug}-title {slug}-desc">',
            f'<title id="{slug}-title">{escape(title)}</title>',
            f'<desc id="{slug}-desc">{escape(desc)}</desc>',
            '<rect width="100%" height="100%" fill="#FFFFFF"/>',
            '<g font-family="Roboto, Noto Sans Thai, Arial, sans-serif">',
        ]
        font_css = ''.join(
            f"@font-face{{font-family:Roboto;src:url(data:font/woff2;base64,{b64encode((ROOT / f'assets/fonts/roboto-latin-{weight}-normal.woff2').read_bytes()).decode()}) format('woff2');font-weight:{weight}}}"
            for weight in [400, 500]
        )
        self.items.append(f'<style>{font_css}</style>')
        self.text(48, 48, title, size=28, weight=500)
        self.text(48, 85, subtitle, size=17, fill=GRAY)

    def text(self, x, y, text, size=16, fill=INK, anchor="start", weight=400, rotate=None):
        attrs = ""
        if rotate is not None:
            attrs = f' transform="rotate({rotate} {x} {y})"'
        self.items.append(
            f'<text x="{x:.2f}" y="{y:.2f}" font-size="{size}" fill="{fill}" text-anchor="{anchor}" font-weight="{weight}"{attrs}>{escape(str(text))}</text>'
        )

    def line(self, x1, y1, x2, y2, stroke=INK, width=2, dash=None, marker=None):
        dash_attr = f' stroke-dasharray="{dash}"' if dash else ""
        marker_attr = f' marker-end="url(#{marker})"' if marker else ""
        self.items.append(
            f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" stroke="{stroke}" stroke-width="{width}"{dash_attr}{marker_attr}/>'
        )

    def rect(self, x, y, width, height, fill="none", stroke="none", stroke_width=1, rx=0, dash=None):
        dash_attr = f' stroke-dasharray="{dash}"' if dash else ""
        self.items.append(
            f'<rect x="{x:.2f}" y="{y:.2f}" width="{width:.2f}" height="{height:.2f}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{stroke_width}"{dash_attr}/>'
        )

    def circle(self, x, y, radius, fill=WHITE, stroke=INK, stroke_width=2):
        self.items.append(
            f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{radius:.2f}" fill="{fill}" stroke="{stroke}" stroke-width="{stroke_width}"/>'
        )

    def ellipse(self, x, y, rx, ry, fill="none", stroke=INK, stroke_width=2, dash=None, rotate=None):
        dash_attr = f' stroke-dasharray="{dash}"' if dash else ""
        transform = f' transform="rotate({rotate} {x} {y})"' if rotate is not None else ""
        self.items.append(
            f'<ellipse cx="{x:.2f}" cy="{y:.2f}" rx="{rx:.2f}" ry="{ry:.2f}" fill="{fill}" stroke="{stroke}" stroke-width="{stroke_width}"{dash_attr}{transform}/>'
        )

    def polyline(self, points, stroke=INK, width=2, fill="none", dash=None):
        dash_attr = f' stroke-dasharray="{dash}"' if dash else ""
        value = " ".join(f"{x:.2f},{y:.2f}" for x, y in points)
        self.items.append(
            f'<polyline points="{value}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" stroke-linejoin="round" stroke-linecap="round"{dash_attr}/>'
        )

    def polygon(self, points, fill="none", stroke=INK, stroke_width=1, opacity=None):
        opacity_attr = f' opacity="{opacity}"' if opacity is not None else ""
        value = " ".join(f"{x:.2f},{y:.2f}" for x, y in points)
        self.items.append(
            f'<polygon points="{value}" fill="{fill}" stroke="{stroke}" stroke-width="{stroke_width}"{opacity_attr}/>'
        )

    def path(self, d, stroke=INK, width=2, fill="none", dash=None):
        dash_attr = f' stroke-dasharray="{dash}"' if dash else ""
        self.items.append(
            f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" stroke-linejoin="round" stroke-linecap="round"{dash_attr}/>'
        )

    def arrow_defs(self):
        self.items.append(
            '<defs><marker id="arrow-ink" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#202124"/></marker><marker id="arrow-purple" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#6200EE"/></marker></defs>'
        )

    def save(self, filename):
        self.line(48, self.height - 51, self.width - 48, self.height - 51, GRID, 1)
        self.text(48, self.height - 23, self.footer, size=14, fill=GRAY)
        self.items.append("</g></svg>\n")
        (OUT / filename).write_text("".join(self.items), encoding="utf-8")


def plot_map(x0, y0, width, height, xmin, xmax, ymin, ymax):
    def x(value):
        return x0 + (value - xmin) / (xmax - xmin) * width

    def y(value):
        return y0 + height - (value - ymin) / (ymax - ymin) * height

    return x, y


def axes(svg, x0, y0, width, height, xmin, xmax, ymin, ymax, xticks, yticks, xlabel, ylabel, xfmt=str, yfmt=str):
    x, y = plot_map(x0, y0, width, height, xmin, xmax, ymin, ymax)
    for value in xticks:
        svg.line(x(value), y0, x(value), y0 + height, GRID, 1)
        svg.text(x(value), y0 + height + 24, xfmt(value), size=14, fill=GRAY, anchor="middle")
    for value in yticks:
        svg.line(x0, y(value), x0 + width, y(value), GRID, 1)
        svg.text(x0 - 10, y(value) + 5, yfmt(value), size=14, fill=GRAY, anchor="end")
    svg.line(x0, y0 + height, x0 + width, y0 + height, GRAY, 1.5)
    svg.line(x0, y0, x0, y0 + height, GRAY, 1.5)
    svg.text(x0 + width / 2, y0 + height + 54, xlabel, size=16, anchor="middle")
    svg.text(x0, y0 - 14, ylabel, size=16)
    return x, y


def new_figure(slug, title, subtitle, footer="Hypothetical one-year inputs · No market observations", height=700):
    return SVG(slug, title, subtitle, subtitle, footer, width=1080, height=height)


def rule(svg, x, y, title, color=PURPLE):
    svg.line(x, y, x + 36, y, color, 3)
    svg.text(x, y + 30, title, size=20, weight=500)


def axis(svg, box, limits, xticks, yticks, xlabel, ylabel, percent=False):
    x0, y0, w, h = box
    xmin, xmax, ymin, ymax = limits
    x, y = plot_map(x0, y0, w, h, xmin, xmax, ymin, ymax)
    fmt = (lambda v: f"{v * 100:g}") if percent else (lambda v: f"{v:g}")
    for v in xticks:
        svg.line(x(v), y0, x(v), y0+h, GRID, 1)
        svg.text(x(v), y0+h+27, fmt(v), size=15, anchor="middle", fill=GRAY)
    for v in yticks:
        svg.line(x0, y(v), x0+w, y(v), GRID, 1)
        svg.text(x0-14, y(v)+5, fmt(v), size=15, anchor="end", fill=GRAY)
    svg.line(x0,y0+h,x0+w,y0+h,GRAY,1.4)
    svg.text(x0+w/2,y0+h+62,xlabel,size=17,anchor="middle")
    svg.text(x0,y0-24,ylabel,size=17,fill=GRAY)
    return x,y


def figure_optimization_types():
    svg=new_figure("optimization-types", "The feasible set changes the answer", "A convex objective; three feasible sets. Benchmark weights provide a different coordinate system.", "Illustrative geometry · Purple dot = optimum · Teal = feasible choices", height=740)
    rx,ry,m=100,48,.3
    d=sqrt(m*m*rx*rx+ry*ry)
    dx,dy=m*rx*rx/d,ry*ry/d
    assert abs((dx/rx)**2+(dy/ry)**2-1)<1e-12
    assert abs(dy+m*dx-d)<1e-12
    for i,title in enumerate(["01  Unconstrained", "02  Equality", "03  Inequality"]):
        left=48+i*344
        rule(svg,left,143,title)
        cx,cy=left+148,298
        if i==2:
            svg.polygon([(left+12,cy+d+m*(12-148)),(left+288,cy+d+m*(288-148)),(left+288,411),(left+12,411)],fill=TEAL_LIGHT,stroke="none")
        for scale in [1.25,1,.55]:
            svg.ellipse(cx,cy,rx*scale,ry*scale,stroke=PURPLE if scale==1 else GRID,stroke_width=2)
        tx,ty=cx,cy
        if i:
            sign=1 if i==1 else -1
            svg.line(left+12,cy+d-sign*m*(12-148),left+288,cy+d-sign*m*(288-148),TEAL,3)
            tx,ty=cx+sign*dx,cy+dy
        svg.circle(tx,ty,7,fill=PURPLE,stroke=WHITE)
        svg.text(tx+15,ty-12,"x*",size=18,fill=PURPLE,weight=500)
        svg.text(left,452,["Search all x","g(x) = b","g(x) ≤ b"][i],size=20,weight=500)
        svg.text(left,480,["Minimum at the center","The line is the feasible set","The shaded side is feasible"][i],size=16,fill=GRAY)
    svg.line(48,515,1032,515,GRID,1)
    svg.text(48,556,"04  Benchmark-relative",size=22,weight=500)
    svg.text(48,589,"Re-express the portfolio as active weights.",size=17,fill=GRAY)
    svg.items.append(f'<text x="620" y="557" font-size="28" font-weight="500" fill="{INK}">w<tspan baseline-shift="sub" font-size="18">P</tspan><tspan> = w</tspan><tspan baseline-shift="sub" font-size="18">B</tspan><tspan> + Δw</tspan></text>')
    svg.text(620,610,"Σᵢ Δwᵢ = 0",size=24,fill=TEAL,weight=500)
    svg.text(48,650,"When portfolio and benchmark each sum to 100%, overweights and underweights net to zero.",size=18)
    svg.save("optimization-types.svg")


def figure_curvature():
    svg=new_figure("optimization-curvature", "A zero gradient can be a minimum or a saddle", "Compare two cross-sections through the same stationary point: x = y = 0.", "Exact functions · Left: f = x² + y² · Right: f = x² − y² · No market observations")
    for i,title in enumerate(["Positive definite Hessian", "Indefinite Hessian"]):
        left=80+i*510
        rule(svg,left,130,title)
        x,y=axis(svg,(left+30,235,350,260),(-1.2,1.2,-1.3,1.5),[-1,0,1],[-1,0,1],"Position along the slice","Objective value")
        for sign,color,dash in [(1,PURPLE,None),(1 if i==0 else -1,TEAL,"8 5")]:
            pts=[(x(t),y(sign*t*t)) for t in [-1.15+j*2.3/100 for j in range(101)]]
            svg.polyline(pts,stroke=color,width=3,dash=dash)
        svg.circle(x(0),y(0),6,fill=INK,stroke=WHITE)
        svg.text(left+190,606,"Both slices curve up" if i==0 else "One up; one down",size=20,anchor="middle",weight=500)
    svg.line(740,196,772,196,PURPLE,3);svg.text(781,202,"x slice",size=15,fill=PURPLE)
    svg.line(890,196,922,196,TEAL,3,dash="8 5");svg.text(931,202,"y slice",size=15,fill=TEAL)
    svg.save("optimization-curvature.svg")


def figure_covariance():
    svg=new_figure("optimization-covariance", "Volatility turns correlation into covariance", "Each cell follows Σᵢⱼ = σᵢ × ρᵢⱼ × σⱼ. Color scales are separate for the two matrices.")
    for matrix,left,title,digits,maximum in [(CORR,95,"Correlation ρ · unitless",2,1),(SIGMA,607,"Covariance Σ · return²",5,.36)]:
        rule(svg,left,137,title)
        for i in range(4):
            svg.text(left-24,267+i*65,f"X{i+1}",size=16,anchor="end",weight=500)
            svg.text(left+39+i*85,217,f"X{i+1}",size=16,anchor="middle",weight=500)
            for j in range(4):
                value=matrix[i][j]; intensity=.06+.23*value/maximum
                svg.rect(left+j*85,236+i*65,81,61,fill=PURPLE_LIGHT if value/maximum<.25 else "#D7C2F5",rx=4)
                svg.items.append(f'<rect x="{left+j*85}" y="{236+i*65}" width="81" height="61" rx="4" fill="{PURPLE}" opacity="{intensity:.3f}"/>')
                svg.text(left+40+j*85,273+i*65,f"{value:.{digits}f}".rstrip('0').rstrip('.') if digits==5 else f"{value:.2f}",size=16,anchor="middle")
        svg.text(left,532,"Scale: 0 to 1" if maximum==1 else "Scale: 0 to 0.36",size=16,fill=GRAY)
    svg.rect(48,568,984,62,fill=LIGHT_GRAY,rx=6)
    svg.text(72,605,"Example  Σ₁₂ = 0.07 × 0.80 × 0.12 = 0.00672",size=22,weight=500)
    svg.save("optimization-covariance.svg")


def figure_ols():
    xs=[-2,-1,0,1,2];ys=[-2.7,-1.0,1.2,2.8,5.1]
    mx,my=sum(xs)/len(xs),sum(ys)/len(ys)
    beta=sum((x-mx)*(y-my) for x,y in zip(xs,ys))/sum((x-mx)**2 for x in xs);alpha=my-beta*mx
    residuals=[yv-alpha-beta*xv for xv,yv in zip(xs,ys)]
    svg=new_figure("optimization-ols", "OLS minimizes the sum of squared residuals", "A deterministic five-point example; each residual is measured vertically from the fitted line.", "Illustrative regression · Same five observations as the Notebook · No market observations")
    x,y=axis(svg,(100,185,570,365),(-2.5,2.5,-4,6),[-2,-1,0,1,2],[-4,-2,0,2,4,6],"Input x","Observed y")
    svg.line(x(-2.4),y(alpha-2.4*beta),x(2.4),y(alpha+2.4*beta),PURPLE,3)
    for a,b,e in zip(xs,ys,residuals):
        svg.line(x(a),y(b),x(a),y(b-e),TEAL,4)
        svg.circle(x(a),y(b),6,fill=TEAL,stroke=WHITE)
    rule(svg,740,180,"Fitted line")
    svg.text(740,256,f"ŷ = {alpha:.2f} + {beta:.2f}x",size=24,fill=PURPLE,weight=500)
    svg.text(740,330,"Residuals",size=18,weight=500)
    for i,e in enumerate(residuals):
        svg.text(750,368+i*33,f"e{i+1}",size=16,fill=GRAY)
        svg.text(977,368+i*33,f"{e:+.2f}",size=18,anchor="end")
    svg.text(740,581,f"Σ eᵢ² = {dot(residuals,residuals):.3f}",size=24,weight=500)
    svg.save("optimization-ols.svg")


def figure_gls():
    svg=new_figure("optimization-gls", "Whitening measures residuals on a common scale", "The same unit-distance boundary is an ellipse before whitening and a circle afterward.", "Exact geometry · e = Lz · L = [[2, 0], [0.8, 0.6]] · Ω = LLᵀ")
    for i,title in enumerate(["Original residuals e", "Whitened residuals z = L⁻¹e"]):
        left=55+i*510
        rule(svg,left,133,title)
        x,y=axis(svg,(left+58,236,334,268),(-2.5,2.5,-2,2),[-2,0,2],[-2,0,2],"e₁" if i==0 else "z₁","e₂" if i==0 else "z₂")
        pts=[]
        for k in range(121):
            a=cos(2*pi*k/120);b=sin(2*pi*k/120)
            e1,e2=(2*a,.8*a+.6*b) if i==0 else (a,b)
            pts.append((x(e1),y(e2)))
        svg.polyline(pts,stroke=PURPLE if i==0 else TEAL,width=3)
        for k in range(12):
            a=.75*cos(2*pi*k/12);b=.75*sin(2*pi*k/12)
            e1,e2=(2*a,.8*a+.6*b) if i==0 else (a,b)
            svg.circle(x(e1),y(e2),4,fill=PURPLE if i==0 else TEAL,stroke=WHITE,stroke_width=1)
        svg.text(left+224,610,"Ω = [[4, 1.6], [1.6, 1]]" if i==0 else "Cov(z) = I",size=20,anchor="middle",weight=500)
    svg.save("optimization-gls.svg")


def figure_lagrange():
    svg=new_figure("optimization-lagrange", "Lagrange finds the lowest feasible contour", "Minimize f(w₁,w₂) = w₁² + 2w₂² subject to w₁ + w₂ = 1.", "Exact two-variable geometry · Optimum (2/3, 1/3) · Minimum f = 2/3")
    x,y=axis(svg,(100,194,510,360),(0,1.2,0,1.2),[0,.3,.6,.9,1.2],[0,.3,.6,.9,1.2],"w₁","w₂")
    for level in [.22,2/3,1.0,1.4]:
        pts=[]
        for k in range(181):
            t=pi*k/360;a=sqrt(level)*cos(t);b=sqrt(level/2)*sin(t)
            if a<=1.2 and b<=1.2:pts.append((x(a),y(b)))
        svg.polyline(pts,stroke=PURPLE if level==2/3 else GRID,width=3 if level==2/3 else 1.5)
    svg.line(x(0),y(1),x(1),y(0),TEAL,3)
    svg.circle(x(2/3),y(1/3),7,fill=PURPLE,stroke=WHITE)
    svg.text(x(2/3)+15,y(1/3)-14,"w*",size=20,fill=PURPLE,weight=500)
    rule(svg,708,200,"At the optimum")
    for j,txt in enumerate(["w₁ = 2/3", "w₂ = 1/3", "∇f = (4/3, 4/3)", "∇g = (1, 1)"]):svg.text(708,282+j*53,txt,size=23)
    svg.text(708,530,"The gradients are parallel.",size=19,fill=GRAY)
    svg.text(708,562,"The budget still sums to 1.",size=19,fill=GRAY)
    svg.save("optimization-lagrange.svg")


def figure_target_allocation():
    w=target_weights(.1)
    svg=new_figure("optimization-target-allocation", "A 10% target fixes one minimum-variance portfolio", "The optimizer satisfies both equations: sum of weights = 1 and expected return = 10%.")
    x0,scale=184,12
    for tick in [0,10,20,30,40,50,60]:
        svg.line(x0+scale*tick,185,x0+scale*tick,497,GRID,1)
        svg.text(x0+scale*tick,526,f"{tick}%",size=15,anchor="middle",fill=GRAY)
    for i,v in enumerate(w):
        yy=217+76*i
        svg.text(88,yy+8,f"X{i+1}",size=21,weight=500)
        svg.rect(x0,yy-16,v*100*scale,32,fill=PURPLE,rx=3)
        svg.text(x0+v*100*scale+14,yy+6,f"{v*100:.2f}%",size=20,weight=500)
    for xx,label,value in [(80,"TOTAL WEIGHT","100.00%"),(423,"EXPECTED RETURN","10.00%"),(755,"VOLATILITY",f"{sqrt(variance(w))*100:.2f}%")]:
        svg.text(xx,593,label,size=14,fill=GRAY);svg.text(xx,629,value,size=29,weight=500)
    svg.save("optimization-target-allocation.svg")


def figure_frontier():
    svg=new_figure("optimization-frontier", "The frontier contains a different optimum for each target", "Risky-only minimum variance and the capital allocation line (CAL) with a 2.5% risk-free rate.")
    x,y=axis(svg,(104,187,560,363),(0,.55,0,.25),[0,.1,.2,.3,.4,.5],[0,.05,.1,.15,.2,.25],"Portfolio volatility (%)","Expected return (%)",True)
    for lo,hi,color,dash in [(0,GMV_RETURN,GRAY,"7 5"),(GMV_RETURN,.25,PURPLE,None)]:
        pts=[(x(target_point(t)[0]),y(t)) for t in [lo+(hi-lo)*k/150 for k in range(151)]]
        svg.polyline(pts,stroke=color,width=3,dash=dash)
    svg.line(x(0),y(RF),x(.4),y(RF+.4*TANGENCY_SHARPE),TEAL,2.5,dash="8 5")
    points=[(GMV_SD,GMV_RETURN,"1",PURPLE),(TANGENCY_SD,TANGENCY_RETURN,"2",TEAL),(target_point(.1)[0],.1,"3",ORANGE)]
    for sx,sy,label,color in points:
        svg.circle(x(sx),y(sy),7,fill=color,stroke=WHITE)
    rule(svg,735,165,"Three reference portfolios")
    for i,(label,mean,sd,color) in enumerate([("GMV",GMV_RETURN,GMV_SD,PURPLE),("Tangency",TANGENCY_RETURN,TANGENCY_SD,TEAL),("Target 10%",.1,target_point(.1)[0],ORANGE)]):
        yy=250+i*95
        svg.circle(744,yy-5,5,fill=color,stroke=color)
        svg.text(766,yy,label,size=21,weight=500)
        svg.text(766,yy+31,f"μ {mean*100:.2f}% · σ {sd*100:.2f}%",size=17,fill=GRAY)
    svg.line(738,566,776,566,TEAL,3,dash="8 5");svg.text(792,572,"CAL",size=17,fill=TEAL)
    svg.line(738,605,776,605,GRAY,2,dash="7 5");svg.text(792,611,"Inefficient branch",size=17,fill=GRAY)
    svg.save("optimization-frontier.svg")


def figure_target_weights():
    svg=new_figure("optimization-target-weights", "Higher targets reshape every asset weight", "Four small multiples share the same scales. The shaded region marks short positions.")
    for i in range(4):
        left=80+(i%2)*515; top=182+(i//2)*225
        x,y=axis(svg,(left+35,top+27,355,118),(.03,.25,-1.5,1.5),[.05,.15,.25],[-1,0,1],"Target return (%)" if i>=2 else "",f"X{i+1} weight (%)",True)
        svg.rect(left+35,y(0),355,y(-1.5)-y(0),fill="#FCE8EC")
        svg.line(left+35,y(0),left+390,y(0),GRAY,1)
        svg.polyline([(x(t),y(target_weights(t)[i])) for t in [.03+k*.22/100 for k in range(101)]],stroke=PURPLE,width=3)
        v=target_weights(.25)[i]
        svg.circle(x(.25),y(v),4,fill=PURPLE,stroke=WHITE)
        svg.text(left+402,y(v)+5,f"{100*v:.0f}%",size=16,fill=PURPLE,weight=500)
    svg.save("optimization-target-weights.svg")


def figure_black_litterman_beliefs():
    svg=new_figure("optimization-black-litterman-beliefs", "Views update the prior across all four assets", "Lines connect each market-implied prior to its Black–Litterman posterior.", "Hypothetical annual excess returns · τ = 1/120 · Ω = diag(PτΣPᵀ)")
    x=lambda v:168+v/.30*675
    for tick in [0,.05,.1,.15,.2,.25,.3]:
        svg.line(x(tick),195,x(tick),513,GRID,1)
        svg.text(x(tick),550,f"{tick*100:g}%",size=15,fill=GRAY,anchor="middle")
    svg.circle(182,143,6,fill=WHITE,stroke=PURPLE);svg.text(200,149,"Prior Π",size=18,fill=PURPLE)
    svg.circle(355,143,6,fill=TEAL,stroke=TEAL);svg.text(373,149,"Posterior",size=18,fill=TEAL)
    svg.text(1018,149,"Prior / posterior",size=16,fill=GRAY,anchor="end")
    for i,(a,b) in enumerate(zip(PRIOR,POSTERIOR)):
        yy=231+i*83
        svg.text(80,yy+7,f"X{i+1}",size=22,weight=500)
        svg.line(x(a),yy,x(b),yy,GRAY,3)
        svg.circle(x(a),yy,7,fill=WHITE,stroke=PURPLE,stroke_width=2.5)
        svg.circle(x(b),yy,6,fill=TEAL,stroke=TEAL)
        svg.text(1018,yy+6,f"{a*100:.2f} / {b*100:.2f}%",size=18,anchor="end")
    svg.text(80,605,"Views: X3 − X1 = 10 percentage points; X2 excess return = 3%.",size=19,weight=500)
    svg.save("optimization-black-litterman-beliefs.svg")


def figure_black_litterman_weights():
    svg=new_figure("optimization-black-litterman-weights", "The posterior also changes the risk-free allocation", "Compare market weights with the allocation computed from posterior returns at λ = 2.24.")
    market=MARKET+[0];post=[v/LAMBDA_MKT for v in solve(SIGMA,POSTERIOR)];post+=[1-sum(post)]
    labels=["X1","X2","X3","X4","Risk-free"]
    for xx,title in [(230,"Market"),(621,"Black–Litterman")]:rule(svg,xx,140,title,PURPLE if xx==230 else TEAL)
    for i,label in enumerate(labels):
        yy=232+i*69
        svg.text(60,yy+6,label,size=21,weight=500)
        for value,x0,color in [(market[i],230,PURPLE),(post[i],621,TEAL)]:
            svg.rect(x0,yy-15,260,30,fill=LIGHT_GRAY,rx=3)
            svg.rect(x0,yy-15,value/.5*260,30,fill=color,rx=3)
            svg.text(x0+282,yy+6,f"{value*100:.2f}%",size=19,fill=color,weight=500)
    svg.text(60,608,"Risky + risk-free weights = 100% in both portfolios. Each bar uses a 0–50% scale.",size=18,fill=GRAY)
    svg.save("optimization-black-litterman-weights.svg")


def figure_kkt():
    svg=new_figure("optimization-kkt", "Long-only moves the 20% target to an active boundary", "Both portfolios satisfy the same return and budget constraints; one also requires every weight ≥ 0.")
    x=lambda v:210+(v+.85)/1.85*620
    for tick in [-.75,-.5,-.25,0,.25,.5,.75,1]:
        svg.line(x(tick),194,x(tick),540,INK if tick==0 else GRID,1.5 if tick==0 else 1)
        svg.text(x(tick),568,f"{tick*100:g}",size=15,anchor="middle",fill=GRAY)
    svg.line(95,143,127,143,PURPLE,5);svg.text(140,149,"Shorting allowed",size=18,fill=PURPLE)
    svg.line(370,143,402,143,TEAL,5);svg.text(415,149,"Long-only",size=18,fill=TEAL)
    for i,(a,b) in enumerate(zip(target_weights(.2),KKT_WEIGHTS)):
        yy=230+i*80
        svg.text(65,yy+10,f"X{i+1}",size=21,weight=500)
        for v,yv,color in [(a,yy-12,PURPLE),(b,yy+16,TEAL)]:
            svg.line(x(0),yv,x(v),yv,color,10)
            svg.circle(x(v),yv,5,fill=color,stroke=color)
        svg.text(1015,yy+3,f"{a*100:.2f}%",size=18,fill=PURPLE,anchor="end")
        svg.text(1015,yy+27,f"{b*100:.2f}%"+(" · binding" if i==0 else ""),size=18,fill=TEAL,anchor="end")
    svg.text(520,608,"Portfolio weight (%)",size=18,anchor="middle")
    svg.save("optimization-kkt.svg")


def figure_active():
    svg=new_figure("optimization-active", "130–30 has 100% net exposure and 160% gross exposure", "An illustrative benchmark plus a zero-net overlay, with the short leg outside the benchmark.", "Illustrative exposure decomposition · Bars share one percentage scale · No market observations")
    x=lambda v:298+(v+.3)/1.6*650
    for tick in [-.3,0,.3,.6,.9,1.3]:
        svg.line(x(tick),194,x(tick),514,INK if tick==0 else GRID,1.5 if tick==0 else 1)
        svg.text(x(tick),546,f"{tick*100:g}%",size=15,anchor="middle",fill=GRAY)
    for yy,label,pos,neg in [(240,"Benchmark",1,0),(349,"Active overlay",.3,.3),(458,"Combined",1.3,.3)]:
        svg.text(60,yy+7,label,size=22,weight=500)
        svg.rect(x(0),yy-20,x(pos)-x(0),40,fill=PURPLE if yy==240 else TEAL,rx=2)
        svg.text((x(pos)+x(0))/2,yy+7,f"+{pos*100:.0f}%",size=21,fill=WHITE,anchor="middle",weight=500)
        if neg:
            svg.rect(x(-neg),yy-20,x(0)-x(-neg),40,fill=ERROR,rx=2)
            svg.text((x(-neg)+x(0))/2,yy+7,f"−{neg*100:.0f}%",size=21,fill=WHITE,anchor="middle",weight=500)
    svg.text(60,610,"Net: 130 − 30 = 100%",size=24,weight=500)
    svg.text(580,610,"Gross: 130 + 30 = 160%",size=24,weight=500)
    svg.save("optimization-active.svg")


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    for function in [figure_optimization_types,figure_curvature,figure_covariance,figure_ols,figure_gls,figure_lagrange,figure_target_allocation,figure_frontier,figure_target_weights,figure_black_litterman_beliefs,figure_black_litterman_weights,figure_kkt,figure_active]:
        function()
    print("Created 13 newly designed, deterministic figures for Portfolio Optimization and Black–Litterman.")


if __name__ == "__main__":
    main()
