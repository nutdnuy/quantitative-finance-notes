#!/usr/bin/env python3
"""Generate deterministic SVG figures for the portfolio-optimization lesson.

The figures use only Python's standard library. Numerical visuals are rebuilt
from the stated four-asset assumptions; conceptual visuals use explicit,
deterministic geometry and are labelled as illustrations.
"""

from __future__ import annotations

from html import escape
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
BL_RISKY = [0.09869571, 0.16585951, 0.40130429, 0.10]
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
        self.text(44, 48, title, size=28, weight=600)
        self.text(44, 80, subtitle, size=16, fill=GRAY)

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
        self.text(44, self.height - 22, self.footer, size=14, fill=GRAY)
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


def figure_optimization_types():
    svg = SVG(
        "optimization-types",
        "Four optimization problems differ by the feasible set",
        "Four panels compare unconstrained optimization, an equality constraint, an inequality constraint and benchmark-relative active weights.",
        "The objective may stay the same while the admissible answer changes.",
        "Conceptual geometry | No market observations",
    )
    svg.arrow_defs()
    panels = [(50, 112), (570, 112), (50, 365), (570, 365)]
    titles = ["1  Unconstrained", "2  Equality constraint", "3  Inequality constraint", "4  Benchmark-relative"]
    fills = [PURPLE_LIGHT, TEAL_LIGHT, LIGHT_GRAY, PURPLE_LIGHT]
    for (px, py), title, fill in zip(panels, titles, fills):
        svg.rect(px, py, 500, 220, fill=WHITE, stroke=GRID, rx=8)
        svg.rect(px, py, 500, 46, fill=fill, stroke="none", rx=8)
        svg.text(px + 18, py + 30, title, size=18, weight=600)

    # Unconstrained: concentric contours and unconstrained optimum.
    px, py = panels[0]
    for rx, ry in [(115, 58), (80, 40), (44, 22)]:
        svg.ellipse(px + 250, py + 140, rx, ry, stroke=PURPLE, stroke_width=2)
    svg.circle(px + 250, py + 140, 7, fill=PURPLE, stroke=WHITE)
    svg.text(px + 380, py + 102, "search all x", size=15, fill=GRAY)
    svg.text(px + 268, py + 146, "x*", size=16, fill=PURPLE, weight=600)

    # Equality: a line cuts the contours; optimum is tangent to it.
    px, py = panels[1]
    for rx, ry in [(115, 58), (80, 40), (44, 22)]:
        svg.ellipse(px + 250, py + 140, rx, ry, stroke=GRAY, stroke_width=1.5)
    svg.line(px + 88, py + 187, px + 412, py + 86, TEAL, 4)
    svg.circle(px + 309, py + 118, 7, fill=TEAL, stroke=WHITE)
    svg.text(px + 82, py + 202, "g(x) = b", size=15, fill=TEAL, weight=600)
    svg.text(px + 323, py + 113, "best feasible x", size=14, fill=INK)

    # Inequality: shaded feasible half-plane and boundary optimum.
    px, py = panels[2]
    svg.polygon([(px + 70, py + 185), (px + 70, py + 84), (px + 430, py + 185)], fill=TEAL_LIGHT, stroke="none")
    svg.line(px + 70, py + 84, px + 430, py + 185, TEAL, 4)
    for rx, ry in [(104, 52), (68, 34)]:
        svg.ellipse(px + 320, py + 92, rx, ry, stroke=PURPLE, stroke_width=2)
    svg.circle(px + 270, py + 140, 7, fill=PURPLE, stroke=WHITE)
    svg.text(px + 86, py + 174, "g(x) ≤ b", size=15, fill=TEAL, weight=600)
    svg.text(px + 286, py + 155, "binding boundary", size=14)

    # Benchmark: one passive bar plus zero-net active overlay.
    px, py = panels[3]
    svg.text(px + 78, py + 90, "w_p", size=18, weight=600)
    svg.rect(px + 120, py + 70, 225, 34, fill=PURPLE_LIGHT, stroke=PURPLE, rx=4)
    svg.text(px + 232, py + 93, "benchmark w_B", size=14, anchor="middle")
    svg.rect(px + 345, py + 70, 64, 34, fill=TEAL_LIGHT, stroke=TEAL, rx=4)
    svg.text(px + 377, py + 93, "+", size=16, fill=TEAL, anchor="middle", weight=600)
    svg.rect(px + 120, py + 129, 64, 28, fill="#FCE8EC", stroke=ERROR, rx=4)
    svg.text(px + 152, py + 149, "−", size=16, fill=ERROR, anchor="middle", weight=600)
    svg.line(px + 184, py + 143, px + 345, py + 87, GRAY, 1.5, dash="5 4")
    svg.text(px + 120, py + 188, "w_p = w_B + Delta w     and     1^T Delta w = 0", size=17, fill=INK)
    svg.save("optimization-types.svg")


def figure_curvature():
    svg = SVG(
        "optimization-curvature",
        "A zero gradient finds candidates; curvature classifies them",
        "A contour plot shows gradient arrows toward a stationary point. Two profile plots distinguish positive and negative second derivative, with a note that mixed Hessian signs imply a saddle.",
        "First-order and second-order conditions answer different questions.",
        "Conceptual functions with exact deterministic geometry | No market observations",
    )
    svg.arrow_defs()
    svg.rect(50, 112, 610, 492, fill=WHITE, stroke=GRID, rx=8)
    svg.text(72, 145, "Gradient field", size=19, weight=600)
    cx, cy = 350, 355
    for rx, ry in [(245, 178), (185, 132), (125, 88), (62, 43)]:
        svg.ellipse(cx, cy, rx, ry, stroke=PURPLE, stroke_width=2)
    starts = [(138, 216), (535, 214), (150, 496), (548, 505), (350, 162)]
    for sx, sy in starts:
        ex = sx + 0.56 * (cx - sx)
        ey = sy + 0.56 * (cy - sy)
        svg.line(sx, sy, ex, ey, PURPLE, 2.5, marker="arrow-purple")
    svg.circle(cx, cy, 8, fill=PURPLE, stroke=WHITE)
    svg.text(cx + 18, cy + 6, "∇f(x*) = 0", size=17, fill=PURPLE, weight=600)

    svg.rect(690, 112, 380, 230, fill=WHITE, stroke=GRID, rx=8)
    svg.text(712, 145, "Positive curvature", size=18, weight=600)
    points = []
    for i in range(101):
        value = -1.0 + 2.0 * i / 100
        points.append((728 + 300 * (value + 1) / 2, 294 - 125 * value * value))
    svg.polyline(points, stroke=TEAL, width=4)
    svg.circle(878, 294, 6, fill=TEAL, stroke=WHITE)
    svg.text(878, 320, "H ≻ 0 → minimum", size=16, fill=TEAL, anchor="middle", weight=600)

    svg.rect(690, 368, 380, 236, fill=WHITE, stroke=GRID, rx=8)
    svg.text(712, 401, "Negative or mixed curvature", size=18, weight=600)
    points = []
    for i in range(101):
        value = -1.0 + 2.0 * i / 100
        points.append((728 + 300 * (value + 1) / 2, 442 + 100 * value * value))
    svg.polyline(points, stroke=ORANGE, width=4, dash="10 6")
    svg.circle(878, 442, 6, fill=ORANGE, stroke=WHITE)
    svg.text(878, 568, "H ≺ 0 → maximum", size=16, fill=ORANGE, anchor="middle", weight=600)
    svg.text(878, 590, "mixed eigenvalue signs → saddle", size=14, fill=GRAY, anchor="middle")
    svg.save("optimization-curvature.svg")


def matrix_heatmap(svg, matrix, x0, y0, cell, title, vmax, digits, row_labels=True):
    svg.text(x0, y0 - 26, title, size=19, weight=600)
    for i, row in enumerate(matrix):
        for j, value in enumerate(row):
            strength = min(1.0, abs(value) / vmax if vmax else 0.0)
            # Four discrete fills keep output deterministic and readable.
            if strength > 0.72:
                fill, text_fill = PURPLE, WHITE
            elif strength > 0.38:
                fill, text_fill = "#B99AEF", INK
            elif strength > 0.10:
                fill, text_fill = PURPLE_LIGHT, INK
            else:
                fill, text_fill = LIGHT_GRAY, GRAY
            svg.rect(x0 + j * cell, y0 + i * cell, cell, cell, fill=fill, stroke=WHITE, stroke_width=2)
            label = f"{value:.{digits}f}"
            svg.text(x0 + (j + 0.5) * cell, y0 + (i + 0.57) * cell, label, size=13, fill=text_fill, anchor="middle", weight=500)
    if row_labels:
        for i in range(len(matrix)):
            svg.text(x0 - 12, y0 + (i + 0.57) * cell, f"X{i + 1}", size=13, fill=GRAY, anchor="end")
            svg.text(x0 + (i + 0.5) * cell, y0 - 8, f"X{i + 1}", size=13, fill=GRAY, anchor="middle")


def figure_covariance():
    svg = SVG(
        "optimization-covariance",
        "Covariance combines scale and co-movement: Σ = S R S",
        "Three heatmaps show the diagonal volatility matrix S, the four-asset correlation matrix R and the resulting covariance matrix Sigma.",
        "The same correlation can imply different covariance when volatilities differ.",
        "Hypothetical annual inputs | σ = 7%, 12%, 30%, 60% | No market observations",
    )
    matrix_heatmap(svg, [[SD[i] if i == j else 0.0 for j in range(4)] for i in range(4)], 72, 190, 48, "S  volatility", 0.60, 2)
    svg.text(292, 294, "×", size=36, fill=GRAY, anchor="middle", weight=500)
    matrix_heatmap(svg, CORR, 330, 190, 48, "R  correlation", 1.0, 1)
    svg.text(550, 294, "×", size=36, fill=GRAY, anchor="middle", weight=500)
    matrix_heatmap(svg, [[SD[i] if i == j else 0.0 for j in range(4)] for i in range(4)], 588, 190, 48, "S  volatility", 0.60, 2)
    svg.text(808, 294, "=", size=36, fill=GRAY, anchor="middle", weight=500)
    matrix_heatmap(svg, SIGMA, 846, 190, 48, "Σ  covariance", 0.36, 4)
    svg.rect(72, 435, 966, 94, fill=LIGHT_GRAY, stroke="none", rx=6)
    svg.text(94, 468, "Example cell", size=15, fill=GRAY)
    svg.text(94, 502, "Σ₂₃ = σ₂ ρ₂₃ σ₃ = 0.12 × 0.70 × 0.30 = 0.0252", size=21, weight=500)
    svg.text(94, 528, "Correlation is unitless; covariance is expressed in squared-return units.", size=14, fill=GRAY)
    svg.save("optimization-covariance.svg")


def figure_ols():
    xs = [0.5, 1.2, 2.0, 2.8, 3.6, 4.2, 5.1, 5.8, 6.6, 7.4]
    ys = [1.3, 2.5, 2.4, 4.1, 3.8, 5.8, 5.1, 6.7, 6.2, 8.2]
    xbar = sum(xs) / len(xs)
    ybar = sum(ys) / len(ys)
    beta = sum((x - xbar) * (y - ybar) for x, y in zip(xs, ys)) / sum((x - xbar) ** 2 for x in xs)
    alpha = ybar - beta * xbar
    fitted = [alpha + beta * x for x in xs]
    sse = sum((y - yhat) ** 2 for y, yhat in zip(ys, fitted))
    svg = SVG(
        "optimization-ols",
        "OLS chooses the line with the smallest sum of squared residuals",
        "A scatter plot shows ten synthetic observations, the fitted ordinary least squares line and dashed vertical residuals from each point to the line.",
        "Each dashed segment contributes eᵢ² to the objective.",
        "Illustrative synthetic observations | OLS calculated from the displayed points | No market data",
    )
    x, y = axes(svg, 105, 128, 850, 410, 0, 8, 0, 9, [0, 2, 4, 6, 8], [0, 2, 4, 6, 8], "x", "y", lambda v: f"{v:g}", lambda v: f"{v:g}")
    svg.line(x(0), y(alpha), x(8), y(alpha + 8 * beta), PURPLE, 4)
    for xv, yv, yhat in zip(xs, ys, fitted):
        svg.line(x(xv), y(yv), x(xv), y(yhat), TEAL, 2, dash="5 4")
        svg.circle(x(xv), y(yv), 6, fill=TEAL, stroke=WHITE)
    svg.text(980, 185, "fit", size=14, fill=GRAY)
    svg.text(980, 214, f"ŷ = {alpha:.2f} + {beta:.2f}x", size=18, fill=PURPLE, weight=600)
    svg.text(980, 264, "objective", size=14, fill=GRAY)
    svg.text(980, 293, f"Σeᵢ² = {sse:.2f}", size=18, fill=TEAL, weight=600)
    svg.line(976, 338, 1024, 338, TEAL, 2, dash="5 4")
    svg.text(980, 364, "residual eᵢ", size=14, fill=GRAY)
    svg.save("optimization-ols.svg")


def figure_gls():
    # Exact correlated residual construction e = Lz with Ω = LLᵀ.
    l = [[2.0, 0.0], [0.8, 0.6]]
    unit = [
        (-1.3, -0.3), (-1.0, 0.5), (-0.7, -1.0), (-0.2, 0.4),
        (0.2, -0.7), (0.5, 1.1), (0.8, 0.1), (1.1, 0.8),
        (1.3, -0.5), (-0.4, 1.2), (0.7, -1.1), (0.0, 0.0),
    ]
    correlated = [(2 * a, 0.8 * a + 0.6 * b) for a, b in unit]
    svg = SVG(
        "optimization-gls",
        "GLS rotates and rescales correlated errors before fitting",
        "Side-by-side residual plots show elongated correlated errors and the same residuals after whitening, where equal-distance circles are appropriate.",
        "The whitening transform turns Ω into the identity matrix.",
        "Illustrative residual geometry | e = Lz with Ω = LLᵀ | No market observations",
    )
    svg.arrow_defs()
    for x0, title in [(78, "Before: correlated scale"), (642, "After: whitened scale")]:
        svg.rect(x0, 132, 400, 390, fill=WHITE, stroke=GRID, rx=8)
        svg.text(x0 + 20, 164, title, size=19, weight=600)
        svg.line(x0 + 44, 345, x0 + 356, 345, GRAY, 1.5)
        svg.line(x0 + 200, 190, x0 + 200, 486, GRAY, 1.5)
    # Exact covariance ellipse from L applied to the unit circle.
    ellipse_points = []
    for i in range(121):
        angle = 2 * pi * i / 120
        a, b = cos(angle), sin(angle)
        e1, e2 = 2 * a, 0.8 * a + 0.6 * b
        ellipse_points.append((278 + 64 * e1, 345 - 84 * e2))
    svg.polyline(ellipse_points, stroke=PURPLE, width=3, dash="9 5")
    for e1, e2 in correlated:
        svg.circle(278 + 64 * e1, 345 - 84 * e2, 6, fill=PURPLE, stroke=WHITE)
    svg.text(98, 500, "Ω = [[4.00, 1.60], [1.60, 1.00]]", size=15, fill=GRAY)
    svg.line(500, 330, 614, 330, TEAL, 4, marker="arrow-ink")
    svg.text(557, 310, "L⁻¹", size=20, fill=TEAL, anchor="middle", weight=600)
    svg.circle(842, 345, 112, fill="none", stroke=TEAL, stroke_width=3)
    for a, b in unit:
        svg.circle(842 + 82 * a, 345 - 82 * b, 6, fill=TEAL, stroke=WHITE)
    svg.text(662, 500, "Cov(L⁻¹e) = I", size=15, fill=GRAY)
    svg.save("optimization-gls.svg")


def figure_lagrange():
    svg = SVG(
        "optimization-lagrange",
        "The constrained optimum is where a contour touches the constraint",
        "Elliptical contours of f equals w1 squared plus two w2 squared touch the budget line w1 plus w2 equals one at w1 two thirds and w2 one third.",
        "At the solution, the objective gradient is parallel to the constraint gradient.",
        "Conceptual two-variable example | f(w₁,w₂)=w₁²+2w₂² | No market observations",
    )
    x, y = axes(svg, 110, 132, 820, 410, 0, 1.15, 0, 1.15, [0, .25, .5, .75, 1], [0, .25, .5, .75, 1], "w₁", "w₂", lambda v: f"{v:.2g}", lambda v: f"{v:.2g}")
    for level in [0.45, 0.7, 1.0, 1.35]:
        points = []
        for i in range(121):
            angle = 2 * pi * i / 120
            w1 = sqrt(level) * cos(angle)
            w2 = sqrt(level / 2) * sin(angle)
            if 0 <= w1 <= 1.15 and 0 <= w2 <= 1.15:
                points.append((x(w1), y(w2)))
        if len(points) > 1:
            svg.polyline(points, stroke=PURPLE, width=2)
    svg.line(x(0), y(1), x(1), y(0), TEAL, 4)
    w1, w2 = 2 / 3, 1 / 3
    svg.circle(x(w1), y(w2), 8, fill=TEAL, stroke=WHITE)
    svg.text(x(w1) + 18, y(w2) - 14, "w* = (2/3, 1/3)", size=17, fill=TEAL, weight=600)
    svg.text(x(.13), y(.87), "w₁ + w₂ = 1", size=16, fill=TEAL, weight=600, rotate=-28)
    svg.rect(954, 180, 126, 178, fill=LIGHT_GRAY, stroke="none", rx=6)
    svg.text(972, 214, "FOC", size=14, fill=GRAY)
    svg.text(972, 249, "∇f = λ∇g", size=18, weight=600)
    svg.text(972, 294, "same", size=14, fill=GRAY)
    svg.text(972, 321, "direction", size=14, fill=GRAY)
    svg.save("optimization-lagrange.svg")


def figure_target_allocation():
    weights = target_weights(0.10)
    svg = SVG(
        "optimization-target-allocation",
        "A 10% target return determines one minimum-variance allocation",
        "Horizontal bars show the four optimal weights for the unconstrained minimum-variance portfolio with expected return fixed at ten percent.",
        "All four weights are positive for this target, although short selling is allowed by the model.",
        "Hypothetical annual inputs | Target portfolio return = 10% | Weights calculated from Sigma inverse",
    )
    x0, bar0, barw = 92, 290, 660
    svg.line(bar0, 146, bar0, 532, GRAY, 1.5)
    for i, value in enumerate(weights):
        cy = 194 + i * 86
        svg.text(x0, cy + 6, f"X{i + 1}", size=21, weight=600)
        svg.text(x0 + 55, cy + 6, f"μ {MU[i] * 100:.0f}%  ·  σ {SD[i] * 100:.0f}%", size=15, fill=GRAY)
        svg.rect(bar0, cy - 19, barw, 38, fill=LIGHT_GRAY, stroke="none", rx=4)
        svg.rect(bar0, cy - 19, barw * value / 0.60, 38, fill=PURPLE if i % 2 == 0 else TEAL, stroke="none", rx=4)
        svg.text(bar0 + barw * value / 0.60 + 12, cy + 7, f"{value * 100:.2f}%", size=17, weight=600)
    svg.rect(92, 556, 956, 58, fill=PURPLE_LIGHT, stroke="none", rx=6)
    svg.text(112, 592, f"sum(w) = {sum(weights):.4f}     mu^T w = {dot(MU, weights) * 100:.2f}%     portfolio SD = {sqrt(variance(weights)) * 100:.2f}%", size=18, weight=500)
    svg.save("optimization-target-allocation.svg")


def figure_frontier():
    svg = SVG(
        "optimization-frontier",
        "Four assets: frontier, GMV, tangency and CAL",
        "The four-asset minimum-variance frontier is shown with the global minimum variance portfolio, the ten percent target portfolio, the tangency portfolio and the capital allocation line from a two point five percent risk-free return.",
        "GMV minimizes risk; tangency maximizes the Sharpe slope from the risk-free point.",
        "Hypothetical annual inputs | Unconstrained weights | r_f = 2.5% | No market observations",
    )
    x, y = axes(svg, 105, 126, 820, 430, 0, .48, -.02, .32, [0, .1, .2, .3, .4], [0, .05, .10, .15, .20, .25, .30], "Portfolio standard deviation (%)", "Expected return (%)", lambda v: f"{v * 100:.0f}", lambda v: f"{v * 100:.0f}")
    lower, upper = [], []
    for i in range(181):
        target = -.02 + .34 * i / 180
        sigma, mean, _ = target_point(target)
        if sigma <= .48 and -.02 <= mean <= .32:
            point = (x(sigma), y(mean))
            (upper if target >= GMV_RETURN else lower).append(point)
    svg.polyline(lower, stroke=GRAY, width=2.5, dash="8 6")
    svg.polyline(upper, stroke=PURPLE, width=4)
    cal_end_sigma = .46
    cal_end_return = RF + TANGENCY_SHARPE * cal_end_sigma
    svg.line(x(0), y(RF), x(cal_end_sigma), y(cal_end_return), TEAL, 3, dash="10 5")
    points = [
        (GMV_SD, GMV_RETURN, "GMV", GRAY, -16, 35),
        (target_point(.10)[0], .10, "Target 10%", ORANGE, 12, -16),
        (TANGENCY_SD, TANGENCY_RETURN, "Tangency", TEAL, 12, 30),
        (0, RF, "r_f 2.5%", TEAL, 12, -12),
    ]
    for sx, mean, label, color, dx, dy in points:
        svg.circle(x(sx), y(mean), 7, fill=color, stroke=WHITE)
        svg.text(x(sx) + dx, y(mean) + dy, label, size=15, fill=color, weight=600)
    svg.text(952, 190, "solid", size=14, fill=GRAY)
    svg.line(952, 211, 1002, 211, PURPLE, 4)
    svg.text(952, 238, "efficient", size=14, fill=PURPLE)
    svg.line(952, 284, 1002, 284, GRAY, 2.5, dash="8 6")
    svg.text(952, 311, "inefficient", size=14, fill=GRAY)
    svg.line(952, 357, 1002, 357, TEAL, 3, dash="10 5")
    svg.text(952, 384, "CAL", size=14, fill=TEAL)
    svg.save("optimization-frontier.svg")


def figure_target_weights():
    svg = SVG(
        "optimization-target-weights",
        "Target return moves the solution and can create short positions",
        "Four lines show each asset weight in the unconstrained minimum-variance portfolio as target return rises from three to twenty-five percent.",
        "Weights always sum to one, but individual weights can fall below zero or exceed one.",
        "Hypothetical annual inputs | Unconstrained weights | No transaction costs or short-sale limits",
    )
    colors = [PURPLE, TEAL, ORANGE, GRAY]
    dashes = [None, "10 5", "3 5", "14 5 3 5"]
    x, y = axes(svg, 105, 126, 820, 430, .03, .25, -1.5, 1.5, [.03, .05, .10, .15, .20, .25], [-1.5, -1, -.5, 0, .5, 1, 1.5], "Target expected return (%)", "Portfolio weight (%)", lambda v: f"{v * 100:.0f}", lambda v: f"{v * 100:.0f}")
    svg.line(105, y(0), 925, y(0), INK, 1.8)
    targets = [.03 + .22 * i / 160 for i in range(161)]
    all_weights = [target_weights(target) for target in targets]
    for asset in range(4):
        pts = [(x(target), y(weights[asset])) for target, weights in zip(targets, all_weights)]
        svg.polyline(pts, stroke=colors[asset], width=3, dash=dashes[asset])
        label_target = .238
        label_weights = target_weights(label_target)
        svg.text(x(label_target) + 9, y(label_weights[asset]) + (asset - 1.5) * 5, f"X{asset + 1}", size=15, fill=colors[asset], weight=600)
    svg.rect(952, 155, 120, 190, fill=LIGHT_GRAY, stroke="none", rx=6)
    for i, (color, dash) in enumerate(zip(colors, dashes)):
        cy = 188 + i * 39
        svg.line(970, cy, 1012, cy, color, 3, dash=dash)
        svg.text(1024, cy + 5, f"X{i + 1}", size=14, fill=color, weight=600)
    svg.text(952, 389, "below 0%", size=14, fill=GRAY)
    svg.text(952, 414, "= short", size=16, fill=ERROR, weight=600)
    svg.save("optimization-target-weights.svg")


def figure_black_litterman_beliefs():
    svg = SVG(
        "optimization-black-litterman-beliefs",
        "Black–Litterman moves equilibrium beliefs toward stated views",
        "Grouped bars compare the reverse-optimized prior excess returns and Black-Litterman posterior excess returns for four hypothetical assets.",
        "The posterior reflects both the views and their uncertainty; it does not simply replace the prior.",
        "Hypothetical annual excess returns | τ = 1/120 | Ω = diag(PτΣPᵀ) | No market observations",
    )
    x, y = axes(svg, 105, 132, 810, 410, 0, 5, 0, .30, [1, 2, 3, 4], [0, .05, .10, .15, .20, .25, .30], "Asset", "Expected excess return (%)", lambda v: f"X{int(v)}", lambda v: f"{v * 100:.0f}")
    barw = 48
    for i, (prior, posterior) in enumerate(zip(PRIOR, POSTERIOR), 1):
        svg.rect(x(i) - barw - 4, y(prior), barw, y(0) - y(prior), fill=PURPLE, stroke="none", rx=3)
        svg.rect(x(i) + 4, y(posterior), barw, y(0) - y(posterior), fill=TEAL, stroke="none", rx=3)
        svg.text(x(i) - barw / 2 - 4, y(prior) - 9, f"{prior * 100:.2f}", size=13, fill=PURPLE, anchor="middle", weight=600)
        svg.text(x(i) + barw / 2 + 4, y(posterior) - 9, f"{posterior * 100:.2f}", size=13, fill=TEAL, anchor="middle", weight=600)
    svg.rect(946, 170, 20, 20, fill=PURPLE)
    svg.text(978, 186, "Prior Π", size=15, fill=PURPLE, weight=600)
    svg.rect(946, 216, 20, 20, fill=TEAL)
    svg.text(978, 232, "Posterior μ̂", size=15, fill=TEAL, weight=600)
    svg.text(946, 292, "Views", size=14, fill=GRAY)
    svg.text(946, 321, "X3 − X1 = 10%", size=14, weight=500)
    svg.text(946, 349, "X2 = 3%", size=14, weight=500)
    svg.save("optimization-black-litterman-beliefs.svg")


def figure_black_litterman_weights():
    labels = ["X1", "X2", "X3", "X4", "Risk-free"]
    market = MARKET + [0.0]
    posterior = BL_RISKY + [BL_RF]
    svg = SVG(
        "optimization-black-litterman-weights",
        "Views change both risky allocations and the risk-free share",
        "Paired horizontal bars compare market weights with Black-Litterman allocation weights at risk aversion lambda two point two four, including the residual risk-free allocation.",
        "The posterior allocation is not the market portfolio because the two stated views alter expected excess returns.",
        "Hypothetical allocation | λ = 2.24 | Risky weights use posterior μ̂ | No market observations",
    )
    x0, scale = 290, 13.5
    svg.line(x0, 140, x0, 568, GRAY, 1.5)
    for tick in [0, 10, 20, 30, 40, 50]:
        svg.line(x0 + tick * scale, 140, x0 + tick * scale, 568, GRID, 1)
        svg.text(x0 + tick * scale, 592, f"{tick}%", size=13, fill=GRAY, anchor="middle")
    for i, label in enumerate(labels):
        cy = 180 + i * 78
        svg.text(90, cy + 8, label, size=18, weight=600)
        svg.rect(x0, cy - 24, market[i] * 100 * scale, 20, fill=PURPLE, stroke="none", rx=3)
        svg.rect(x0, cy + 5, posterior[i] * 100 * scale, 20, fill=TEAL, stroke="none", rx=3)
        svg.text(x0 + market[i] * 100 * scale + 8, cy - 9, f"{market[i] * 100:.1f}%", size=13, fill=PURPLE, weight=600)
        svg.text(x0 + posterior[i] * 100 * scale + 8, cy + 21, f"{posterior[i] * 100:.1f}%", size=13, fill=TEAL, weight=600)
    svg.rect(930, 166, 18, 18, fill=PURPLE)
    svg.text(960, 181, "Market", size=14, fill=PURPLE, weight=600)
    svg.rect(930, 208, 18, 18, fill=TEAL)
    svg.text(960, 223, "BL allocation", size=14, fill=TEAL, weight=600)
    svg.save("optimization-black-litterman-weights.svg")


def figure_kkt():
    unconstrained = target_weights(0.20)
    svg = SVG(
        "optimization-kkt",
        "A long-only constraint moves the 20% target portfolio to the boundary",
        "Diverging bars compare unconstrained and long-only minimum-variance weights for a twenty percent target return. Asset X1 is negative without the constraint and exactly zero when the long-only constraint binds.",
        "KKT identifies the active boundary: w₁ = 0 while the remaining weights satisfy the return and budget constraints.",
        "Hypothetical annual inputs | Target portfolio return = 20% | Long-only active set X2-X4",
    )
    x, y = plot_map(185, 148, 720, 360, -0.85, 1.0, 0, 4)
    zero = x(0)
    for value in [-.75, -.5, -.25, 0, .25, .5, .75, 1.0]:
        svg.line(x(value), 148, x(value), 508, GRID if value else INK, 1.5 if value else 2)
        svg.text(x(value), 536, f"{value * 100:.0f}%", size=13, fill=GRAY, anchor="middle")
    for i in range(4):
        cy = 194 + i * 82
        svg.text(92, cy + 6, f"X{i + 1}", size=19, weight=600)
        u = unconstrained[i]
        k = KKT_WEIGHTS[i]
        svg.rect(min(zero, x(u)), cy - 20, abs(x(u) - zero), 17, fill=PURPLE, stroke="none", rx=3)
        svg.rect(min(zero, x(k)), cy + 7, abs(x(k) - zero), 17, fill=TEAL, stroke="none", rx=3)
        svg.text(x(u) + (8 if u >= 0 else -8), cy - 6, f"{u * 100:.1f}%", size=13, fill=PURPLE, anchor="start" if u >= 0 else "end", weight=600)
        if abs(k) < 1e-12:
            svg.circle(zero, cy + 15, 5, fill=TEAL, stroke=WHITE)
            svg.text(zero + 10, cy + 21, "0%  binding", size=13, fill=TEAL, weight=600)
        else:
            svg.text(x(k) + 8, cy + 21, f"{k * 100:.1f}%", size=13, fill=TEAL, weight=600)
    svg.rect(936, 166, 18, 18, fill=PURPLE)
    svg.text(966, 181, "Unconstrained", size=14, fill=PURPLE, weight=600)
    svg.rect(936, 208, 18, 18, fill=TEAL)
    svg.text(966, 223, "Long-only", size=14, fill=TEAL, weight=600)
    svg.rect(936, 286, 142, 112, fill=TEAL_LIGHT, stroke="none", rx=6)
    svg.text(954, 317, "Active constraint", size=14, fill=GRAY)
    svg.text(954, 351, "w₁ = 0", size=22, fill=TEAL, weight=600)
    svg.text(954, 380, "multiplier ≥ 0", size=13, fill=GRAY)
    svg.save("optimization-kkt.svg")


def figure_active():
    svg = SVG(
        "optimization-active",
        "A 130–30 portfolio is a 100% benchmark plus a zero-net active overlay",
        "A three-step bar decomposition shows a fully invested benchmark, an active long thirty percent and short thirty percent overlay, and the combined portfolio with one hundred thirty percent long and thirty percent short exposure.",
        "The active weights sum to zero, so the combined portfolio keeps net exposure at one hundred percent.",
        "Conceptual 130–30 exposure | Illustrative only | No market observations",
    )
    svg.arrow_defs()
    stages = [(72, "Benchmark", "100% net"), (405, "Active overlay", "0% net"), (738, "Combined", "100% net")]
    for x0, title, subtitle in stages:
        svg.rect(x0, 132, 286, 410, fill=WHITE, stroke=GRID, rx=8)
        svg.text(x0 + 20, 170, title, size=20, weight=600)
        svg.text(x0 + 20, 197, subtitle, size=14, fill=GRAY)
    # Benchmark.
    svg.rect(132, 260, 166, 132, fill=PURPLE_LIGHT, stroke=PURPLE, stroke_width=2, rx=5)
    svg.text(215, 322, "+100%", size=26, fill=PURPLE, anchor="middle", weight=600)
    svg.text(215, 352, "benchmark", size=15, fill=PURPLE, anchor="middle")
    # Active overlay.
    svg.rect(465, 225, 166, 82, fill=TEAL_LIGHT, stroke=TEAL, stroke_width=2, rx=5)
    svg.text(548, 274, "+30% long", size=20, fill=TEAL, anchor="middle", weight=600)
    svg.rect(465, 352, 166, 82, fill="#FCE8EC", stroke=ERROR, stroke_width=2, rx=5)
    svg.text(548, 401, "−30% short", size=20, fill=ERROR, anchor="middle", weight=600)
    svg.text(548, 477, "sum(Delta w) = 0", size=18, anchor="middle", weight=600)
    # Combined exposure.
    svg.rect(798, 200, 166, 172, fill=TEAL_LIGHT, stroke=TEAL, stroke_width=2, rx=5)
    svg.text(881, 279, "+130%", size=27, fill=TEAL, anchor="middle", weight=600)
    svg.text(881, 310, "gross long", size=15, fill=TEAL, anchor="middle")
    svg.rect(798, 395, 166, 68, fill="#FCE8EC", stroke=ERROR, stroke_width=2, rx=5)
    svg.text(881, 437, "−30% short", size=20, fill=ERROR, anchor="middle", weight=600)
    svg.line(360, 336, 393, 336, INK, 2.5, marker="arrow-ink")
    svg.line(693, 336, 726, 336, INK, 2.5, marker="arrow-ink")
    svg.text(548, 585, "w_p = w_B + Delta w     ·     gross exposure = 160%     ·     net exposure = 100%", size=18, anchor="middle", weight=500)
    svg.save("optimization-active.svg")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    figure_optimization_types()
    figure_curvature()
    figure_covariance()
    figure_ols()
    figure_gls()
    figure_lagrange()
    figure_target_allocation()
    figure_frontier()
    figure_target_weights()
    figure_black_litterman_beliefs()
    figure_black_litterman_weights()
    figure_kkt()
    figure_active()
    print("Generated 13 deterministic portfolio-optimization SVG figures.")
    print(f"GMV: return={GMV_RETURN:.8f}, sd={GMV_SD:.8f}, weights={GMV_WEIGHTS}")
    print(f"Tangency: return={TANGENCY_RETURN:.8f}, sd={TANGENCY_SD:.8f}, weights={TANGENCY_WEIGHTS}")
    print(f"Black-Litterman prior={PRIOR}")
    print(f"Black-Litterman posterior={POSTERIOR}")


if __name__ == "__main__":
    main()
