"""Reproducible, hypothetical pairs research; not a market backtest.

Requires numpy and statsmodels. All parameters and candidate models are fixed
before the held-out evaluation. The generated process is deliberately simple:
it teaches separation of estimation, selection and evaluation, not tradability.
"""
import json
import sys
from importlib.metadata import version
from pathlib import Path

import numpy as np
from statsmodels.tsa.stattools import coint

SEED, N, HORIZON, TRAIN_END, VALID_END, LOOKBACK = 260920, 1200, 5, 720, 960, 20
ALPHAS = (0.0, 0.1, 1.0, 10.0, 100.0, 1000.0)
FEATURE_NAMES = ("residual_z", "residual_change_1d", "residual_change_5d",
                 "residual_change_sd_20d", "B_return_5d")


def simulate_pair(seed=SEED, n=N):
    """USD/share levels: B random walk; A = 18 + 1.15 B + AR(1) noise."""
    rng = np.random.default_rng(seed)
    b = 100 + np.cumsum(rng.normal(0, 0.55, n))
    innovations = rng.normal(0, 0.8, n)
    spread = np.empty(n)
    spread[0] = innovations[0] / np.sqrt(1 - 0.91**2)
    for t in range(1, n):
        spread[t] = 0.91 * spread[t - 1] + innovations[t]
    a = 18 + 1.15 * b + spread
    assert np.all(a > 0) and np.all(b > 0), "This seed must have positive prices."
    return {"a": a, "b": b, "true_spread": spread}


def hedge_and_features(a, b):
    """Freeze estimates at the training cutoff; each row uses data through t.

    Training rows are retrospective training examples, not historical trading
    signals. Frozen estimates become available before validation begins.
    """
    design = np.column_stack((np.ones(TRAIN_END), b[:TRAIN_END]))
    intercept, hedge = np.linalg.lstsq(design, a[:TRAIN_END], rcond=None)[0]
    residual = a - intercept - hedge * b
    center = residual[:TRAIN_END].mean()
    scale = residual[:TRAIN_END].std(ddof=1)
    z = (residual - center) / scale
    times = np.arange(LOOKBACK, len(a) - HORIZON)
    features = np.array([
        [z[t], residual[t] - residual[t - 1], residual[t] - residual[t - 5],
         np.diff(residual[t - LOOKBACK:t + 1]).std(ddof=1),
         b[t] / b[t - 5] - 1]
        for t in times
    ])
    target = residual[times + HORIZON] - residual[times]
    masks = {
        "train": times + HORIZON < TRAIN_END,
        "validation": (times >= TRAIN_END) & (times + HORIZON < VALID_END),
        "test": times >= VALID_END,
    }
    return {"times": times, "features": features, "target": target,
            "residual": residual, "z": z, "masks": masks,
            "intercept": float(intercept), "hedge": float(hedge),
            "residual_center": float(center), "residual_sd": float(scale)}


def ridge_fit(x, y, alpha):
    """Minimize sum((y-b0-Xb)^2) + alpha*sum(b^2); intercept unpenalized."""
    center, scale = x.mean(axis=0), x.std(axis=0, ddof=0)
    scale = np.where(scale > 1e-12, scale, 1)
    standardized = (x - center) / scale
    y_mean = y.mean()
    coefficients = np.linalg.solve(standardized.T @ standardized + alpha * np.eye(x.shape[1]),
                                   standardized.T @ (y - y_mean))
    return {"center": center, "scale": scale, "coefficients": coefficients,
            "intercept": float(y_mean)}


def ridge_predict(model, x):
    return ((x - model["center"]) / model["scale"]) @ model["coefficients"] + model["intercept"]


def metrics(actual, predicted):
    error = actual - predicted
    return {"mae_usd": float(np.mean(np.abs(error))),
            "rmse_usd": float(np.sqrt(np.mean(error**2))),
            "n": int(len(actual))}


def run_research(pair=None):
    pair = simulate_pair() if pair is None else pair
    prepared = hedge_and_features(pair["a"], pair["b"])
    x, y, masks = prepared["features"], prepared["target"], prepared["masks"]
    candidates = []
    for alpha in ALPHAS:
        model = ridge_fit(x[masks["train"]], y[masks["train"]], alpha)
        predicted = ridge_predict(model, x[masks["validation"]])
        candidates.append({"alpha": alpha, "validation_mse_usd2": float(np.mean((y[masks["validation"]] - predicted)**2))})
    selected = min(candidates, key=lambda row: row["validation_mse_usd2"])["alpha"]
    # No train+validation refit: the originally trained candidate stays frozen.
    model = ridge_fit(x[masks["train"]], y[masks["train"]], selected)
    predicted = ridge_predict(model, x)
    residual = prepared["residual"]
    ar_intercept, ar_phi = np.linalg.lstsq(
        np.column_stack((np.ones(TRAIN_END - 1), residual[:TRAIN_END - 1])),
        residual[1:TRAIN_END], rcond=None)[0]
    current = residual[prepared["times"]]
    ar_prediction = ((ar_phi**HORIZON - 1) * current
                     + ar_intercept * sum(ar_phi**i for i in range(HORIZON)))
    score = {split: {
        "ridge": metrics(y[mask], predicted[mask]),
        "zero_change": metrics(y[mask], np.zeros(np.sum(mask))),
        "ar1": metrics(y[mask], ar_prediction[mask]),
    } for split, mask in masks.items() if split != "train"}
    statistic, pvalue, critical = coint(pair["a"][:TRAIN_END], pair["b"][:TRAIN_END],
                                      trend="c", maxlag=5, autolag="aic")
    summary = {
        "kind": "hypothetical_simulation_not_market_backtest", "seed": SEED,
        "software_versions": {"python": sys.version.split()[0],
                              **{name: version(name) for name in ("numpy", "scipy", "statsmodels")}},
        "observations": N, "price_unit": "USD per share", "horizon_days": HORIZON,
        "data_generation": {"B": "100 + cumulative Normal(0, 0.55^2)",
                            "A": "18 + 1.15*B + e", "e": "0.91*lag(e) + Normal(0, 0.8^2)",
                            "initial_e": "Normal(0, 0.8^2/(1-0.91^2))"},
        "split": {"training_price_days": [0, TRAIN_END - 1],
                  "training_origins": [LOOKBACK, TRAIN_END - HORIZON - 1],
                  "validation_origins": [TRAIN_END, VALID_END - HORIZON - 1],
                  "test_origins": [VALID_END, N - HORIZON - 1],
                  "purged_origins": [[TRAIN_END - HORIZON, TRAIN_END - 1],
                                     [VALID_END - HORIZON, VALID_END - 1]],
                  "unlabeled_final_origins": [N - HORIZON, N - 1],
                  "counts": {key: int(mask.sum()) for key, mask in masks.items()}},
        "hedge": {key: prepared[key] for key in ("intercept", "hedge", "residual_center", "residual_sd")},
        "features": list(FEATURE_NAMES), "target": "residual[t+5] - residual[t], USD/share of A",
        "ridge": {"objective": "SSE + alpha * squared_L2_coefficients", "candidates": candidates,
                  "selected_alpha": selected, "train_feature_means": model["center"].tolist(),
                  "train_feature_scales": model["scale"].tolist(), "coefficients": model["coefficients"].tolist(),
                  "intercept": model["intercept"], "refit_after_validation": False},
        "ar1": {"intercept": float(ar_intercept), "phi": float(ar_phi), "fit_price_days": [0, TRAIN_END - 1]},
        "engle_granger": {"sample": "training prices only", "trend": "c", "maxlag": 5, "autolag": "aic",
                          "statistic": float(statistic), "approximate_pvalue": float(pvalue),
                          "critical_values_1_5_10_percent": critical.tolist()},
        "metrics": score,
        "limitations": ["Synthetic AR(1) residual favors mean-reversion models by construction.",
                        "Five-day targets overlap; n is not a count of independent observations.",
                        "No fills, transaction costs, borrowing, dividends, positions or portfolio returns are modeled.",
                        "The close-t forecast is not a same-close execution assumption.",
                        "Selection uses validation MSE once; test is only a held-out evaluation.",
                        "Approximate cointegration p-value is not a probability of future convergence."],
    }
    return {"pair": pair, "prepared": prepared, "model": model, "predicted": predicted,
            "ar_prediction": ar_prediction, "summary": summary}


def synthetic_universe():
    """Six labeled securities, 720 returns, two known latent factor groups."""
    rng = np.random.default_rng(SEED + 1)
    factors = rng.normal(size=(TRAIN_END, 2))
    loadings = np.array([[1.0, 0.1], [0.9, 0.1], [0.8, 0.2],
                         [0.1, 1.0], [0.1, 0.9], [0.2, 0.8]])
    returns = 0.01 * (factors @ loadings.T + rng.normal(0, 0.5, size=(TRAIN_END, 6)))
    standardized = (returns - returns.mean(axis=0)) / returns.std(axis=0, ddof=1)
    corr = np.corrcoef(returns, rowvar=False)
    _, singular, vt = np.linalg.svd(standardized, full_matrices=False)
    # Fix arbitrary PCA signs for reproducible display; signs have no interpretation.
    for row in vt:
        if row[np.argmax(np.abs(row))] < 0:
            row *= -1
    eigenvalues = singular**2 / (len(returns) - 1)
    return {"returns": returns, "correlation": corr, "components": vt,
            "explained_ratio": eigenvalues / eigenvalues.sum(),
            "labels": ["A", "B", "C", "D", "E", "F"]}


def verify_research(result):
    """Audit boundary leakage and accounting semantics, not model profitability."""
    p = result["prepared"]
    for split, boundary in (("train", TRAIN_END), ("validation", VALID_END)):
        assert np.max(p["times"][p["masks"][split]] + HORIZON) < boundary
    masks = list(p["masks"].values())
    assert not np.any(sum(mask.astype(int) for mask in masks) > 1)
    # Changing test prices must leave hedge, selected alpha and trained weights unchanged.
    modified = {key: value.copy() for key, value in result["pair"].items()}
    modified["a"][VALID_END:] += 3 * np.sin(np.arange(N - VALID_END) / 4)
    revised = run_research(modified)
    assert result["summary"]["hedge"] == revised["summary"]["hedge"]
    assert result["summary"]["ridge"] == revised["summary"]["ridge"]
    assert result["summary"]["metrics"]["validation"] == revised["summary"]["metrics"]["validation"]
    # A future edit changes its target, not the features available at an origin.
    origin = VALID_END + 20
    modified = {key: value.copy() for key, value in result["pair"].items()}
    modified["a"][origin + 1:] += 7
    changed = hedge_and_features(modified["a"], modified["b"])
    index = np.flatnonzero(p["times"] == origin)[0]
    np.testing.assert_allclose(changed["features"][index], p["features"][index], atol=0, rtol=0)
    np.testing.assert_allclose(changed["target"][index] - p["target"][index], 7)
    # Equal dollar long/short returns use gross = 2*leg_notional.
    for long_return, short_asset_return in ((0.10, 0.05), (-0.05, -0.10), (-0.10, 0.10)):
        pnl = 10000 * long_return - 10000 * short_asset_return
        assert np.isclose(pnl / 20000, (long_return - short_asset_return) / 2)
    return ["training and validation labels end before subsequent samples",
            "future test edits leave fitting and validation selection unchanged",
            "future edits do not alter close-t features", "gross-notional P&L identity"]


if __name__ == "__main__":
    result = run_research()
    result["summary"]["verification"] = verify_research(result)
    out = Path(__file__).resolve().parents[1] / "data/pairs-ml-results.json"
    out.write_text(json.dumps(result["summary"], ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"output": str(out), "test": result["summary"]["metrics"]["test"],
                      "selected_alpha": result["summary"]["ridge"]["selected_alpha"],
                      "verified": result["summary"]["verification"]}, indent=2))
