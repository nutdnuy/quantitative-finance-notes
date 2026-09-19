import assert from 'node:assert/strict';
import { updateVariance, varianceForecasts, halfLife, aggregateVariance, gjrPersistence } from '../src/volatility-models.mjs';

function close(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

const parameters = { omega: 0.000005, alpha: 0.08, beta: 0.87, variance: 0.0001, residual: -0.03 };
const nextVariance = updateVariance(parameters);
close(nextVariance, 0.000164);
close(100 * Math.sqrt(nextVariance), 1.2806248474865698);
close(updateVariance({ ...parameters, residual: 0.03 }), nextVariance);
const base = { nextVariance, longRunVariance: 0.0001, persistence: 0.95, horizon: 5 };
const forecasts = varianceForecasts(base);
const handForecasts = [0.000164, 0.0001608, 0.00015776, 0.000154872, 0.0001521284];
forecasts.forEach((value, i) => close(value, handForecasts[i]));
close(aggregateVariance(forecasts), 0.0007895604);
close(aggregateVariance(forecasts), 5 * 0.0001 + (nextVariance - 0.0001) * (1 - 0.95 ** 5) / (1 - 0.95));
assert.ok(aggregateVariance(forecasts) < 5 * nextVariance);
close(0.95 ** halfLife(0.95), 0.5);
close(halfLife(0.95), 13.513407333964874);
assert.equal(halfLife(0), 0);
assert.equal(halfLife(1), Infinity);
assert.equal(varianceForecasts({ ...base, horizon: 1 })[0], nextVariance);
assert.deepEqual(varianceForecasts({ ...base, persistence: 0, horizon: 3 }), [nextVariance, 0.0001, 0.0001]);

// Mean reversion holds above and below the long-run variance. Compare every
// horizon to a separate recursive calculation, and its sum to a geometric sum.
for (const rho of [0, 0.8, 0.95, 0.99]) {
  for (const first of [0.000004, 0.0001, 0.0009]) {
    const values = varianceForecasts({ ...base, nextVariance: first, persistence: rho, horizon: 60 });
    let recursive = first;
    for (let k = 0; k < values.length; k++) {
      close(values[k], recursive);
      recursive = (1 - rho) * base.longRunVariance + rho * recursive;
    }
    const independentSum = 60 * base.longRunVariance + (first - base.longRunVariance) * (1 - rho ** 60) / (1 - rho);
    close(aggregateVariance(values), independentSum);
    assert.ok(Math.abs(values.at(-1) - base.longRunVariance) <= Math.abs(first - base.longRunVariance));
    close(varianceForecasts({ ...base, nextVariance: first, persistence: rho, horizon: 10000 }).at(-1), base.longRunVariance);
  }
}

// Check all discrete UI values for each control against endpoint combinations.
for (let persistencePct = 80; persistencePct <= 99; persistencePct++) {
  for (const todaySd of [0.2, 1, 3]) for (const longRunSd of [0.2, 1, 3]) for (const residualPct of [-6, -3, 0, 3, 6]) {
    const persistence = persistencePct / 100, longRunVariance = (longRunSd / 100) ** 2;
    const next = updateVariance({ omega: (1 - persistence) * longRunVariance, alpha: 0.08, beta: persistence - 0.08, variance: (todaySd / 100) ** 2, residual: residualPct / 100 });
    const values = varianceForecasts({ nextVariance: next, longRunVariance, persistence, horizon: 60 });
    for (let horizon = 1; horizon <= 60; horizon++) {
      const total = aggregateVariance(values.slice(0, horizon));
      assert.ok(Number.isFinite(total) && total > 0);
      if (horizon === 1) close(total, next);
    }
  }
}

close(gjrPersistence({ alpha: 0.04, beta: 0.9, gamma: 0.1 }), 0.99);
close(gjrPersistence({ alpha: 0.04, beta: 0.9, gamma: 0.1, negativeSecondMoment: 0.7 }), 1.01);
close(gjrPersistence({ alpha: 0.1, beta: 0.8, gamma: -0.05 }), 0.875);
for (const patch of [{ omega: 0 }, { alpha: -0.1 }, { beta: -0.1 }, { variance: -1 }, { residual: NaN }, { residual: 1e200 }]) assert.throws(() => updateVariance({ ...parameters, ...patch }), RangeError);
for (const patch of [{ nextVariance: 0 }, { longRunVariance: -1 }, { persistence: 1 }, { persistence: -0.1 }, { persistence: NaN }, { horizon: 0 }, { horizon: 1.2 }, { horizon: Infinity }]) assert.throws(() => varianceForecasts({ ...base, ...patch }), RangeError);
for (const rho of [-0.1, 1.01, NaN, Infinity]) assert.throws(() => halfLife(rho), RangeError);
for (const values of [[], [-1], [NaN], [Infinity], [Number.MAX_VALUE, Number.MAX_VALUE]]) assert.throws(() => aggregateVariance(values), RangeError);
for (const patch of [{ gamma: -0.1 }, { alpha: -0.1 }, { beta: -0.1 }, { negativeSecondMoment: -0.1 }, { negativeSecondMoment: 1.1 }]) assert.throws(() => gjrPersistence({ alpha: 0.04, beta: 0.9, gamma: 0.1, ...patch }), RangeError);

console.log('Volatility models passed: hand calculations, symmetric shocks, forecast timing, variance half-life, recursive/closed-form sums, mean reversion, UI parameter ranges, GJR second-moment persistence and invalid inputs.');
