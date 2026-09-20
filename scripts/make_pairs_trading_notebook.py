"""Build and execute a self-contained notebook from the four canonical pages.

Execution follows the repository's fresh-namespace/captured-stdout convention.
Code uses numpy, scipy and statsmodels, with no network calls or market data.
"""
import base64
import contextlib
import hashlib
import io
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGES = ("statistical-arbitrage", "pairs-trading-cointegration",
         "pairs-trading-backtest", "pairs-trading-ml")
WEBSITE = "https://nutdnuy.github.io/quantitative-finance-notes/"
cells, namespace = [], {"__name__": "pairs_notebook"}


def markdown(content):
    # Preserve canonical prose, replacing browser-only wrappers with notebook markup.
    content = re.sub(r'<div id="pair[\w-]*-lab"[^>]*></div>',
                     '\n*ห้องทดลองแบบปรับค่าอยู่ในหน้าเว็บไซต์; Notebook นี้ใช้ตัวอย่าง Python ด้านล่าง*\n', content)
    content = re.sub(r'<a\b[^>]*>\s*(<img\b[^>]*>)\s*</a>', r'\1', content)
    def replace_image(match):
        attrs = dict(re.findall(r'([\w-]+)="([^"]*)"', match.group(0)))
        return f'\n![{attrs.get("alt", "ภาพประกอบ")}]({attrs["src"]})\n'
    content = re.sub(r'<img\b[^>]*>', replace_image, content)
    content = re.sub(r'<a\b[^>]*href="([^"]+)"[^>]*>(.*?)</a>', r'[\2](\1)', content, flags=re.S)
    content = re.sub(r'<noscript>.*?</noscript>', '', content, flags=re.S)
    content = re.sub(r'</?(?:div|p|figure|figcaption|section|details)\b[^>]*>', '\n', content)
    content = re.sub(r'<summary>(.*?)</summary>', r'**\1**', content, flags=re.S)
    cell = {"cell_type": "markdown", "metadata": {}, "source": content.strip()}
    for asset in sorted(set(re.findall(r'assets/images/[\w-]+\.(?:svg|jpg|png)', content))):
        path, name = ROOT / asset, Path(asset).name
        mime = {".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png"}[path.suffix]
        payload = path.read_text() if path.suffix == ".svg" else base64.b64encode(path.read_bytes()).decode("ascii")
        cell.setdefault("attachments", {})[name] = {mime: payload}
        cell["source"] = cell["source"].replace(f"]({asset})", f"](attachment:{name})")
    # Reference links remain usable in a downloaded notebook outside the repo.
    cell["source"] = re.sub(r'(?<=\]\()((?:[\w-]+\.html|data/|notebooks/|scripts/)[^)]*)(?=\))',
                            lambda m: WEBSITE + m[1], cell["source"])
    cell["source"] = re.sub(r'\n{3,}', '\n\n', cell["source"])
    cells.append(cell)


def code(content):
    count = sum(cell["cell_type"] == "code" for cell in cells) + 1
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        exec(compile(content, f"pairs_notebook_cell_{count}", "exec"), namespace)
    cells.append({"cell_type": "code", "metadata": {}, "source": content,
                  "execution_count": count,
                  "outputs": [{"output_type": "stream", "name": "stdout", "text": output.getvalue()}]})


SNIPPETS = {
    ("statistical-arbitrage", "two-legs"): '''leg_notional, account_equity = 10_000, 25_000
gross_notional = 2 * leg_notional
scenarios = [(0.05, -0.05), (0.15, 0.05), (-0.05, -0.15)]
print(" A return  B return   long P&L   short P&L   pair P&L   P&L/gross  P&L/equity")
for ra, rb in scenarios:
    long_pnl, short_pnl = leg_notional*ra, -leg_notional*rb
    pnl = long_pnl + short_pnl
    assert np.isclose(pnl, 1000)
    assert np.isclose(pnl/gross_notional, .05)
    print(f"{ra:+8.1%} {rb:+8.1%} {long_pnl:10.0f} {short_pnl:11.0f} {pnl:10.0f} {pnl/gross_notional:11.1%} {pnl/account_equity:11.1%}")
adverse_pnl = leg_notional*(-.10) - leg_notional*.10
assert adverse_pnl == -2000
print(f"Adverse case A -10%, B +10%: P&L {adverse_pnl:,.0f} USD; gross-based return {adverse_pnl/gross_notional:.1%}.")
print("Hypothetical simple price returns; fees, dividends and borrow costs excluded.")''',
    ("statistical-arbitrage", "hedge-ratios"): '''beta_a, beta_b, notional_a = 1.2, .8, 10_000
price_a, price_b = 100, 50
notional_b = beta_a * notional_a / beta_b
net_beta_dollars = beta_a * notional_a - beta_b * notional_b
assert np.isclose(net_beta_dollars, 0)
print(f"Beta-neutral: long A {notional_a:,.0f} USD; short B {notional_b:,.0f} USD")
print(f"Shares: A +{notional_a/price_a:g}, B {-notional_b/price_b:g}")
print(f"Gross: {notional_a+notional_b:,.0f}; net: {notional_a-notional_b:,.0f} USD")
print("Neutrality holds only for these specified constant betas; this is not the price-regression hedge.")''',
    ("pairs-trading-cointegration", "cointegration-definition"): '''result = run_research()
prepared = result["prepared"]
print("Synthetic prices only; n=1200; seed=260920")
print("Generated A = 18 + 1.15 B + AR(1) noise; phi=0.91, innovation SD=0.8 USD.")
print(f"OLS fit uses prices 0..719 only: intercept={prepared['intercept']:.6f}, h={prepared['hedge']:.6f}")
print(f"Training residual SD={prepared['residual_sd']:.6f} USD/share of A")
print("These estimates are frozen before validation; training rows use the retrospective train fit.")''',
    ("pairs-trading-cointegration", "engle-granger"): '''eg = result["summary"]["engle_granger"]
print("statsmodels.tsa.stattools.coint(A_train, B_train, trend='c', maxlag=5, autolag='aic')")
print(f"Engle-Granger statistic: {eg['statistic']:.9f}")
print(f"Approximate p-value: {eg['approximate_pvalue']:.9g}")
print("Critical values (1%, 5%, 10%):", eg["critical_values_1_5_10_percent"])
print("Null: no cointegration, conditional on the test assumptions. Not P(no future convergence).")
print("This sample was generated with a stationary residual; a small p-value does not validate a real pair.")''',
    ("pairs-trading-cointegration", "half-life"): '''phi = result["summary"]["ar1"]["phi"]
half_life = np.log(.5) / np.log(phi) if 0 < phi < 1 else np.nan
print(f"Train-estimated AR(1) coefficient: {phi:.6f}")
print(f"Conditional mean-deviation half-life: {half_life:.6f} daily steps")
print("This is expected decay under a constant AR(1) model, not a guaranteed time to exit.")''',
    ("pairs-trading-backtest", "z-score"): '''print("Notebook z-score uses the separate 1,200-price ML sample (not the website's 500-price backtest).")
for day in [720, 721, 722, 723, 724]:
    print(f"day {day}: residual={prepared['residual'][day]:+.4f} USD; z={prepared['z'][day]:+.4f}")
print("A threshold observation does not establish a fill at that close.")''',
    ("pairs-trading-ml", "clustering"): '''from scipy.cluster.hierarchy import linkage, leaves_list
from scipy.spatial.distance import squareform
universe = synthetic_universe()
correlation = universe["correlation"]
distance = np.sqrt(np.maximum(0, 2*(1-correlation)))
np.fill_diagonal(distance, 0)
tree = linkage(squareform(distance, checks=False), method="average")
print("Separate synthetic universe: 720 daily returns, six securities, seed=260921")
print("Pearson return correlation; asset order A B C D E F:")
print(np.round(correlation, 3))
print("Average-linkage rows: left cluster, right cluster, merge distance, merged size")
print(np.round(tree, 5))
print("Dendrogram leaf order:", [universe['labels'][i] for i in leaves_list(tree)])
assert np.allclose(correlation, correlation.T)
assert np.allclose(np.diag(correlation), 1)
print("A return cluster does not establish stationary price residuals or profitability.")''',
    ("pairs-trading-ml", "pca"): '''print("PCA via SVD of centered, sample-SD-standardized returns.")
print("Explained variance percentages:", np.round(100*universe["explained_ratio"], 4))
print("PC1 unit-norm eigenvector:", np.round(universe["components"][0], 5))
print("PC2 unit-norm eigenvector:", np.round(universe["components"][1], 5))
np.testing.assert_allclose(universe["components"] @ universe["components"].T, np.eye(6), atol=1e-12)
assert np.isclose(universe["explained_ratio"].sum(), 1)
print("Chart coefficients are unit eigenvectors, not eigenvectors multiplied by sqrt(eigenvalue).")
print("Sign is fixed for display by making the largest-absolute coefficient positive.")''',
    ("pairs-trading-ml", "prediction-target"): '''print("Features, each available through close t after training estimates are frozen:")
for index, name in enumerate(FEATURE_NAMES):
    print(f"{index+1}: {name}")
print("20-day volatility is the sample SD of the 20 most recent one-day residual changes.")
print("B_return_5d is the simple price return B[t]/B[t-5]-1.")
print("Target y[t] = residual[t+5]-residual[t], USD/share of A.")
print("Ridge objective is summed squared errors plus alpha times squared coefficient norm.")
print("The intercept is not penalized; feature centering/scaling uses training origins only.")''',
    ("pairs-trading-ml", "time-split"): '''for name, mask in prepared["masks"].items():
    origins = prepared["times"][mask]
    print(f"{name:10s}: {origins[0]}..{origins[-1]}, n={len(origins)}, last label day={origins[-1]+HORIZON}")
print("Purged origins: 715..719 and 955..959; final unlabeled origins: 1195..1199.")
print("Validation MSE, USD^2, for the fixed candidate grid:")
for candidate in result["summary"]["ridge"]["candidates"]:
    print(f"alpha={candidate['alpha']:7g}: MSE={candidate['validation_mse_usd2']:.9f}")
print("Selected alpha:", result["summary"]["ridge"]["selected_alpha"])
print("No train+validation refit; neither feature definitions nor the candidate grid were selected on test.")''',
    ("pairs-trading-ml", "model-results"): '''print("Held-out forecast error, USD/share of A; 235 overlapping five-day targets:")
for name in ["zero_change", "ar1", "ridge"]:
    score = result["summary"]["metrics"]["test"][name]
    print(f"{name:12s} MAE={score['mae_usd']:.9f}  RMSE={score['rmse_usd']:.9f}  n={score['n']}")
print("This seed: Ridge beats zero-change but loses to train-estimated AR(1).")
print("The synthetic process was chosen to have AR(1) mean reversion; this is not a market finding.")
print("Five-day windows overlap; do not interpret n=235 as 235 independent trials.")
print("No fills, costs, dividends, short borrowing or portfolio returns are modeled here.")''',
    ("pairs-trading-ml", "next-experiment"): '''checks = verify_research(result)
for check in checks:
    print("PASS:", check)
print("Software versions:", result["summary"]["software_versions"])
print("To experiment, change the DGP or candidate definitions before evaluation, rerun all cells,")
print("and retain unsuccessful outcomes. Fixed embedded charts describe the original saved run.")''',
}


if __name__ == "__main__":
    markdown("""# Python lab · Statistical Arbitrage & Pairs Trading

Notebook นี้รวมบทเรียนสี่ตอนจาก Markdown ต้นฉบับ พร้อมโค้ดที่รันตามลำดับได้และผลที่คำนวณแล้ว
การจำลองและโมเดลใช้ **NumPy, SciPy และ statsmodels** หากยังไม่มีให้ติดตั้งด้วย
`python -m pip install numpy scipy statsmodels` ใน environment ที่เลือกเป็น kernel ก่อนกด Run All
ไม่ต้องดาวน์โหลดข้อมูลตลาด ไม่ต้องมี API key และไม่ต้องเปิดไฟล์โค้ดอื่น

ภาพทั้งแปดเป็น snapshot ของพารามิเตอร์และ seed ที่ระบุ ฝังอยู่ในไฟล์แล้ว เมื่อแก้พารามิเตอร์
ผลจากโค้ดจะเปลี่ยน แต่ภาพ snapshot จะไม่เปลี่ยนตาม ห้องทดลอง Backtest แบบมีสถานะและต้นทุน
อยู่ในเว็บไซต์ ตัวอย่าง Python เน้นบัญชีกำไรสองขา การคัดคู่ และการประเมิน forecast
ตัวเลขทั้งหมดเป็นข้อมูลสมมติ ไม่ใช่ผลการลงทุนในตลาดจริง
""")
    helper = (ROOT / "scripts/pairs_trading_research.py").read_text()
    helper = helper.split('\nif __name__ == "__main__":', 1)[0]
    code(helper + '\nprint("Loaded the self-contained synthetic model, fitting, selection and leakage checks.")')
    sources = []
    for slug in PAGES:
        original = (ROOT / f"{slug}.md").read_text()
        sources.append({"path": f"{slug}.md", "sha256": hashlib.sha256(original.encode()).hexdigest()})
        body = re.sub(r'\A---\n.*?\n---\n', '', original, flags=re.S)
        cursor = 0
        for match in re.finditer(r'<section id="([^"]+)"[^>]*>(.*?)</section>', body, flags=re.S):
            if body[cursor:match.start()].strip():
                markdown(body[cursor:match.start()])
            section_id, content = match.groups()
            markdown(content)
            if (slug, section_id) in SNIPPETS:
                code(SNIPPETS[(slug, section_id)])
            cursor = match.end()
        if body[cursor:].strip():
            markdown(body[cursor:])
    for index, cell in enumerate(cells):
        cell["id"] = f"pairs-{index:03d}"
    attachments = {name for cell in cells for name in cell.get("attachments", {})}
    expected = {path.name for path in (ROOT / "assets/images").glob("pairs-*.svg")}
    assert len(expected) == 8 and expected <= attachments
    # Confirm that model results in the standalone notebook equal the saved evidence.
    saved = json.loads((ROOT / "data/pairs-ml-results.json").read_text())
    assert namespace["result"]["summary"]["metrics"] == saved["metrics"]
    assert namespace["result"]["summary"]["ridge"] == saved["ridge"]
    notebook = {"nbformat": 4, "nbformat_minor": 5, "cells": cells, "metadata": {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python", "version": sys.version.split()[0]},
        "sources": sources,
        "execution": {"method": "All code cells executed in one fresh Python namespace with captured stdout",
                      "generator": "scripts/make_pairs_trading_notebook.py", "errors": 0},
        "software_versions": saved["software_versions"], "synthetic_data": True,
    }}
    import nbformat
    nbformat.validate(nbformat.from_dict(notebook))
    out = ROOT / "notebooks/pairs-trading.ipynb"
    out.write_text(json.dumps(notebook, ensure_ascii=False, indent=1) + "\n")
    print(f"Saved {out}: {len(cells)} cells, {sum(c['cell_type']=='code' for c in cells)} executed code cells, {len(expected)} embedded SVGs, 0 execution errors.")
