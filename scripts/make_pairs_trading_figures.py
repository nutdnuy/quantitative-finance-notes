"""Render eight original computational charts; no market observations.

Requires numpy, scipy, statsmodels and matplotlib. SVG text stays editable.
All evidence is synthetic; chart titles, scales and numbers come from the code.
"""
import os
import base64
from pathlib import Path

os.environ.setdefault("MPLCONFIGDIR", "/tmp/quantcorner-pairs-matplotlib")
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.colors import LinearSegmentedColormap
import numpy as np
from scipy.cluster.hierarchy import dendrogram, linkage
from scipy.spatial.distance import squareform

from pairs_trading_research import (SEED, TRAIN_END, VALID_END, N, HORIZON,
                                    run_research, synthetic_universe)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/images"
PREVIEWS = Path("/tmp/quantcorner-pairs-figures")
PURPLE, TEAL, INK, GRAY, GRID, RED = "#6200ee", "#008577", "#242424", "#62626a", "#e5e5eb", "#b00020"
local_font = Path.home() / "Library/Fonts/Roboto-QuantBootCamp.ttf"
font_name = "DejaVu Sans"
if local_font.exists():
    font_manager.fontManager.addfont(str(local_font))
    font_name = font_manager.FontProperties(fname=str(local_font)).get_name()
plt.rcParams.update({"font.family": font_name, "font.size": 15, "axes.titlesize": 17,
                     "axes.labelsize": 15, "xtick.labelsize": 13, "ytick.labelsize": 13,
                     "text.color": INK, "axes.labelcolor": INK, "axes.edgecolor": GRID,
                     "xtick.color": GRAY, "ytick.color": GRAY,
                     "axes.spines.top": False, "axes.spines.right": False,
                     "svg.fonttype": "none", "svg.hashsalt": "quantcorner-pairs-260920"})
R = run_research()
U = synthetic_universe()


def layout(title, subtitle, rows=1, cols=1, height=6.8, **kwargs):
    fig, axes = plt.subplots(rows, cols, figsize=(11.2, height), **kwargs)
    fig.subplots_adjust(left=.085, right=.965, top=.78, bottom=.23, hspace=.6, wspace=.35)
    fig.text(.045, .945, title, fontsize=25, weight="bold", va="top")
    fig.text(.045, .883, subtitle, fontsize=15, color=GRAY, va="top", linespacing=1.5)
    for ax in np.array(axes).reshape(-1):
        ax.set_axisbelow(True)
        ax.grid(axis="y", color=GRID, linewidth=.8)
    return fig, axes


def save(fig, name, description, footer=None):
    from html import escape
    footer = footer or f"Hypothetical simulation | Seed {SEED} | No market observations"
    fig.text(.045, .055, footer, fontsize=12.5, color=GRAY, linespacing=1.4)
    path = OUT / name
    fig.savefig(path, metadata={"Date": None, "Creator": "QuantCorner | scripts/make_pairs_trading_figures.py"})
    svg = path.read_text()
    # An SVG rendered as an image cannot inherit the page's bundled fonts.
    # Embed the existing licensed font subset so offline exports keep the face.
    font_rules = []
    for weight in (400, 700):
        font_path = ROOT / f"assets/fonts/roboto-latin-{weight}-normal.woff2"
        encoded = base64.b64encode(font_path.read_bytes()).decode("ascii")
        font_rules.append(f"@font-face{{font-family:'Roboto';font-style:normal;font-weight:{weight};src:url(data:font/woff2;base64,{encoded}) format('woff2')}}")
    svg = svg.replace("<defs>", "<defs><style>" + "".join(font_rules) + "</style>", 1)
    svg = svg.replace("<svg ", '<svg role="img" aria-labelledby="chart-title chart-description" ', 1)
    marker = svg.index(">", svg.index("<svg ")) + 1
    svg = svg[:marker] + f'<title id="chart-title">{escape(description.split(". ")[0])}</title><desc id="chart-description">{escape(description)}</desc>' + svg[marker:]
    path.write_text("\n".join(line.rstrip() for line in svg.splitlines()) + "\n")
    PREVIEWS.mkdir(parents=True, exist_ok=True)
    fig.savefig(PREVIEWS / name.replace(".svg", ".png"), dpi=100)
    plt.close(fig)


# The return denominator is the gross value of both legs, not zero net cash.
fig, ax = layout("Relative performance determines the pair P&L",
                 "$10,000 long A + $10,000 short B | Gross exposure = $20,000")
long_returns = np.array([5, 15, -5])
short_asset_returns = np.array([-5, 5, -15])
pair_returns = (long_returns - short_asset_returns) / 2
x, width = np.arange(3), .23
for offset, values, label, color, hatch in ((-width, long_returns, "A asset return (long)", PURPLE, None),
                                          (0, short_asset_returns, "B asset return (shorted)", TEAL, "//"),
                                          (width, pair_returns, "Pair P&L / gross", GRAY, None)):
    bars = ax.bar(x + offset, values, width=.2, label=label, color=color, hatch=hatch)
    for bar, value in zip(bars, values):
        ax.text(bar.get_x()+bar.get_width()/2, value + (.6 if value >= 0 else -.6),
                f"{value:+g}%", ha="center", va="bottom" if value >= 0 else "top", fontsize=15)
ax.axhline(0, color=INK, lw=1)
ax.set_xticks(x, ["A rises; B falls", "Both rise", "Both fall"])
ax.set_ylim(-19, 19)
ax.set_ylabel("Return / P&L measure (%)")
ax.legend(loc="upper center", bbox_to_anchor=(.5, 1.12), ncol=3, fontsize=12.5, frameon=False)
save(fig, "pairs-long-short.svg", "Equal-dollar long-short scenario returns. A returns +5%, +15%, -5%; B asset returns -5%, +5%, -15%. Pair P&L divided by 20,000 dollars gross is +5% in all three examples. These are not returns on account equity.",
     "Hypothetical one-period scenarios | Excludes fees, borrow costs and dividends\nA positive B asset return loses money on the short leg; account-equity return uses a different denominator.")


# Keep high return correlation in both cases while changing residual integration.
rng = np.random.default_rng(SEED + 2)
b = 100 + np.cumsum(rng.normal(0, .55, 360))
noise = rng.normal(0, .2, 360)
stable = np.zeros(360)
for t in range(1, 360):
    stable[t] = .91 * stable[t - 1] + noise[t]
wandering = np.cumsum(noise)
fig, axes = layout("Similar co-movement, different residual behavior",
                    "Known construction: A = 18 + 1.15 B + e | Only the residual process changes", 2, 2, height=8.0)
fig.subplots_adjust(top=.77, bottom=.21, hspace=.62, wspace=.25)
for col, (residual, label, color) in enumerate(((stable, "AR(1) residual: phi = 0.91", PURPLE),
                                             (wandering, "Random-walk residual", TEAL))):
    a = 18 + 1.15 * b + residual
    corr = np.corrcoef(np.diff(a)/a[:-1], np.diff(b)/b[:-1])[0, 1]
    axes[0, col].plot(100*a/a[0], color=color, lw=1.8, label="A")
    axes[0, col].plot(100*b/b[0], color=GRAY, lw=1.4, ls="--", label="B")
    axes[0, col].set_title(f"{label}\nReturn correlation = {corr:.3f}", loc="left", fontsize=16)
    axes[0, col].set_ylabel("Price index (day 0 = 100)")
    axes[0, col].legend(loc="upper left", fontsize=12, frameon=False, ncol=2)
    axes[1, col].plot(residual, color=color, lw=1.8)
    axes[1, col].axhline(0, color=GRAY, ls="--", lw=1)
    axes[1, col].set_xlabel("Simulated day")
    axes[1, col].set_ylabel("Known residual e (USD)")
    residual_limit = np.ceil(max(np.max(np.abs(stable)), np.max(np.abs(wandering))) + .2)
    axes[1, col].set_ylim(-residual_limit, residual_limit)
    for row in range(2):
        axes[row, col].set_xlim(0, 359)
save(fig, "pairs-correlation-spread.svg", "Two synthetic pairs with high return correlation. One residual is AR(1) with coefficient 0.91; the other is a random walk. Price indices start at 100; known residuals use a common USD scale. A visual sample cannot establish stationarity.",
     f"Synthetic construction | Seed {SEED + 2} | 360 daily observations\nHigh return correlation does not establish cointegration. Residual dynamics are known here by construction.")


cmap = LinearSegmentedColormap.from_list("quantcorner", [TEAL, "#ffffff", PURPLE])
fig, ax = layout("A correlation screen finds groups, not tradable pairs",
                 "Six synthetic assets | 720 daily returns | Two shared factors plus asset-specific noise")
fig.subplots_adjust(left=.17, right=.84, top=.78, bottom=.23)
im = ax.imshow(U["correlation"], cmap=cmap, vmin=-1, vmax=1)
ax.grid(False)
ax.set_xticks(range(6), U["labels"])
ax.set_yticks(range(6), U["labels"])
for i in range(6):
    for j in range(6):
        v = U["correlation"][i, j]
        ax.text(j, i, f"{v:.2f}", ha="center", va="center", fontsize=16,
                color="white" if abs(v) > .6 else INK)
bar = fig.colorbar(im, ax=ax, fraction=.05, pad=.07, ticks=[-1, -.5, 0, .5, 1])
bar.set_label("Pearson return correlation")
save(fig, "pairs-correlation-heatmap.svg", "Pearson correlation heatmap for six simulated assets and 720 daily return observations. Exact cell values are calculated, with a fixed minus-one to plus-one color scale. Correlation is a candidate screen, not a cointegration test.",
     f"Hypothetical daily returns | Seed {SEED + 1} | Full correlation scale: -1 to +1\nUniverse is independent of the two-asset ML example; names A–F are anonymous simulated securities.")


distance = np.sqrt(np.maximum(0, 2*(1 - U["correlation"])))
np.fill_diagonal(distance, 0)
tree = linkage(squareform(distance, checks=False), method="average")
fig, ax = layout("Clustering narrows the search universe",
                 "Average linkage | Pair distance = sqrt(2 × (1 − return correlation))")
dendrogram(tree, labels=U["labels"], color_threshold=0, above_threshold_color=PURPLE,
           ax=ax, leaf_font_size=17)
ax.set_ylabel("Average cluster distance (unitless)")
ax.set_xlabel("Synthetic asset")
ax.set_ylim(0, 1.6)
save(fig, "pairs-clustering.svg", "Data-driven hierarchical dendrogram from the synthetic six-asset daily-return correlation matrix. Average linkage uses distance sqrt(2 times one minus correlation). Vertical merge heights show actual distances; the dendrogram does not identify a profitable strategy.",
     f"Synthetic returns | Seed {SEED + 1} | 720 observations | scipy.cluster.hierarchy.linkage\nA cluster is a search filter; pair validation and out-of-sample evaluation remain separate.")


fig, axes = layout("PCA describes common variation; it does not predict alpha",
                   "The same six-asset universe | Standardize each return series before PCA", 1, 2)
ratio = U["explained_ratio"] * 100
bars = axes[0].bar(range(1, 7), ratio, color=[PURPLE, TEAL] + ["#aaaaaf"]*4)
for bar, value in zip(bars, ratio):
    axes[0].text(bar.get_x()+bar.get_width()/2, value + 1.1, f"{value:.1f}", ha="center", fontsize=12.5)
axes[0].set_ylim(0, 65)
axes[0].set_xticks(range(1, 7))
axes[0].set_xlabel("Principal component")
axes[0].set_ylabel("Explained variance (%)")
idx = np.arange(6)
axes[1].bar(idx - .17, U["components"][0], width=.32, color=PURPLE, label="PC1")
axes[1].bar(idx + .17, U["components"][1], width=.32, color=TEAL, label="PC2", hatch="//")
axes[1].axhline(0, color=GRAY, lw=1)
axes[1].set_xticks(idx, U["labels"])
axes[1].set_ylim(-.72, .72)
axes[1].set_ylabel("Component coefficient (unitless)")
axes[1].set_xlabel("Synthetic asset")
axes[1].legend(frameon=False, fontsize=13, loc="upper right")
save(fig, "pairs-pca.svg", "PCA scree plot and the first two eigenvectors of the six-asset standardized return matrix. Bars show actual computed explained variance and component coefficients. Principal component signs are arbitrary; these are not hedge-ratio estimates or forecasts.",
     f"Synthetic returns | Seed {SEED + 1} | 720 observations | NumPy SVD\nPC signs are arbitrary. PCA fitted on the research sample would need freezing before later evaluation.")


z = R["prepared"]["z"]
times = np.arange(TRAIN_END, VALID_END)
signal_times, signal_z, exit_times, exit_z = [], [], [], []
state = 0
for t in times:
    if state == 0 and abs(z[t]) >= 2:
        state = -1 if z[t] > 0 else 1
        signal_times.append(t)
        signal_z.append(z[t])
    elif (state == 1 and z[t] >= 0) or (state == -1 and z[t] <= 0):
        state = 0
        exit_times.append(t)
        exit_z.append(z[t])
fig, ax = layout("A threshold observation is a signal, not an execution",
                 "Frozen training hedge and z-score scale | Validation prices: days 720–959")
ax.plot(times, z[times], color=PURPLE, lw=2, label="Residual z-score")
for value in (-2, 2):
    ax.axhline(value, color=GRAY, ls="--", lw=1.2)
ax.axhline(0, color=TEAL, ls=":", lw=1.2)
ax.scatter(signal_times, signal_z, marker="^", s=70, color=RED, edgecolor="white", zorder=4, label="|z| ≥ 2 while flat")
ax.scatter(exit_times, exit_z, marker="o", s=60, color=TEAL, edgecolor="white", zorder=4, label="Mean crossed while active")
ax.set_ylabel("Residual z-score (training SD units)")
ax.set_xlabel("Simulated day")
ax.set_xlim(TRAIN_END, VALID_END - 1)
ax.set_ylim(-3.5, 3.5)
ax.set_yticks([-3, -2, -1, 0, 1, 2, 3])
ax.legend(frameon=False, fontsize=12.5, loc="upper center", bbox_to_anchor=(.5, 1.15), ncol=3)
save(fig, "pairs-zscore-trades.svg", "Validation residual z-score from a hedge fitted on days 0 through 719. Triangles identify an entry-threshold observation when inactive; circles identify a subsequent crossing through zero in the direction of mean reversion. This figure shows signals only, with no fills, actual positions, stops or profit calculation.",
     f"Synthetic pair | Seed {SEED} | Entry: |z| ≥ 2; exit: directional crossing through zero\nSIGNALS ONLY: no fills or P&L. Execution delay, risk exits and costs require a separate backtest.")


fig, axes = layout("Separate estimation, model selection and final evaluation",
                   "Forecast origin t uses close-t features | Target: residual[t + 5] − residual[t]", 2, 1, height=8.0,
                   gridspec_kw={"height_ratios": [1.3, 1]})
fig.subplots_adjust(left=.20, top=.78, bottom=.21, hspace=.75)
ax = axes[0]
splits = [(20, 714, "Train: 695 origins", PURPLE), (720, 954, "Validation: 235", TEAL),
          (960, 1194, "Test: 235", GRAY)]
for row, (start, end, label, color) in enumerate(splits):
    ax.broken_barh([(start, end - start + 1)], (2 - row - .25, .5), facecolors=color)
    ax.text((start + end)/2, 2-row + .37, f"{start}–{end}", ha="center", fontsize=13, color=color)
ax.set_yticks([2, 1, 0], [x[2] for x in splits], fontsize=12)
ax.set_xlim(0, N)
ax.set_ylim(-.5, 2.9)
ax.set_xlabel("Forecast-origin day (zero-based index)")
ax.set_xticks([0, 240, 480, 720, 960, 1200])
ax.grid(False)
ax = axes[1]
ax.axvspan(715, 720, color="#eeeeef", label="Purged origins 715–719")
ax.broken_barh([(714, 5)], (.8, .22), facecolors=PURPLE)
ax.broken_barh([(720, 5)], (.3, .22), facecolors=TEAL)
ax.scatter([714, 719], [.91, .91], color=PURPLE, s=30)
ax.scatter([720, 725], [.41, .41], color=TEAL, s=30)
ax.set_xlim(712, 727)
ax.set_ylim(.1, 1.4)
ax.set_yticks([.91, .41], ["Last train target", "First validation target"], fontsize=12)
ax.set_xticks([714, 715, 719, 720, 725])
ax.set_xlabel("Training boundary detail: target intervals [t, t + 5]")
ax.text(717.5, 1.2, "5 purged origins", ha="center", fontsize=13)
ax.grid(False)
save(fig, "pairs-time-split.svg", "Chronological training, validation and test forecast-origin intervals with five origins purged before each new sample. Training origins 20–714 have labels ending at day 719; validation origins start at 720. The final five observations lack a five-day-ahead label. Lower panel enlarges the first boundary.",
     f"Synthetic sample: {N} prices | Horizon {HORIZON} days | Hedge fit: prices 0–719\nAlso purge origins 955–959; origins 1195–1199 have no final labels. Overlapping targets are dependent.")


test = R["prepared"]["masks"]["test"]
actual = R["prepared"]["target"][test]
predicted = R["predicted"][test]
fig, axes = layout("Ridge beats zero change here; the simple AR(1) does better",
                   "Held-out test: origins 960–1194 | 235 overlapping five-day targets | USD per share of A", 1, 2)
fig.subplots_adjust(wspace=.4)
axes[0].scatter(actual, predicted, color=PURPLE, s=17, alpha=.58, edgecolors="none")
limit = np.ceil(max(np.max(np.abs(actual)), np.max(np.abs(predicted))))
axes[0].plot([-limit, limit], [-limit, limit], ls="--", color=GRAY, lw=1, label="Perfect forecast")
axes[0].axhline(0, color=GRID, lw=1)
axes[0].axvline(0, color=GRID, lw=1)
axes[0].set_xlim(-limit, limit)
axes[0].set_ylim(-limit, limit)
axes[0].set_xlabel("Actual five-day residual change ($)")
axes[0].set_ylabel("Ridge forecast ($)")
axes[0].legend(frameon=False, fontsize=12, loc="upper left")
scores = R["summary"]["metrics"]["test"]
labels, names = ["Zero change", "Ridge", "AR(1)"], ["zero_change", "ridge", "ar1"]
mae = [scores[name]["mae_usd"] for name in names]
bars = axes[1].barh(labels, mae, color=[GRAY, PURPLE, TEAL], height=.55)
for bar, value in zip(bars, mae):
    axes[1].text(value + .035, bar.get_y()+bar.get_height()/2, f"{value:.3f}", va="center", fontsize=15)
axes[1].set_xlim(0, 1.6)
axes[1].set_xlabel("Test mean absolute error ($; lower is better)")
axes[1].grid(axis="x", color=GRID)
axes[1].grid(axis="y", visible=False)
axes[1].invert_yaxis()
save(fig, "pairs-ml-predictions.svg", "Held-out five-day residual forecasts and computed test mean absolute errors. Ridge MAE is 1.134352 dollars, zero-change MAE 1.317785 dollars, and training-estimated AR(1) MAE 1.103526 dollars. Alpha 100 was chosen using validation MSE only; no models were refitted on validation. This is forecast evaluation, not trading profitability.",
     f"Synthetic AR(1) pair | Seed {SEED} | Ridge alpha = 100 (validation MSE selection only)\nThe data-generating process favors AR(1). Forecast error excludes execution, costs and portfolio P&L.")
print(f"Generated 8 SVG charts in {OUT}; inspection PNGs: {PREVIEWS}")
