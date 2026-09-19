import assert from 'node:assert/strict';
import { bsValue } from '../src/black-scholes.mjs';
import { generalizedEuropean, black76, integrateParameters, measureChangeExperiment } from '../src/martingale-pricing.mjs';

const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
const withinSE = (sample, expected, multiplier = 5) => assert.ok(Math.abs(sample.mean - expected) <= multiplier * sample.se + 1e-10, `${sample.mean} differs from ${expected} by more than ${multiplier} SE (${sample.se})`);

// Independent payoff integration against a standard Normal density, split at
// the payoff kink. This checks the integrated-coefficient formula and its legs.
function quadrature(S, K, R, D, A, kind) {
  const rootA = Math.sqrt(A), meanLog = Math.log(S) + R - D - A / 2;
  const threshold = (Math.log(K) - meanLog) / rootA;
  const a = kind === 'call' ? threshold : -10, b = kind === 'call' ? 10 : threshold;
  const n = 20000, step = (b - a) / n, sums = [0, 0, 0];
  for (let i = 0; i <= n; i++) {
    const z = a + i * step, terminal = Math.exp(meanLog + rootA * z);
    const density = Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
    const coefficient = i === 0 || i === n ? 1 : i % 2 ? 4 : 2;
    const weight = coefficient * density * Math.exp(-R);
    sums[0] += weight * Math.max(kind === 'call' ? terminal - K : K - terminal, 0);
    sums[1] += weight * terminal;
    sums[2] += weight;
  }
  return sums.map(value => value * step / 3);
}

for (const kind of ['call', 'put']) {
  for (const S of [60, 100, 150]) for (const r of [-.02, .05]) for (const sigma of [0, .2, .5]) for (const tau of [0, .5, 3]) {
    const result = generalizedEuropean({ S, K: 100, R: r * tau, D: 0, A: sigma ** 2 * tau, kind });
    close(result.price, bsValue({ S, K: 100, r, sigma, tau, kind }).price);
    close(result.call - result.put, S - 100 * Math.exp(-r * tau));
  }
  for (const [S, K, R, D, A] of [[100, 100, .05, .02, .04], [120, 105, -.01, .07, .12], [75, 110, .1, .02, .25]]) {
    const result = generalizedEuropean({ S, K, R, D, A, kind });
    const [price, assetLeg, cashDigital] = quadrature(S, K, R, D, A, kind);
    close(result.price, price, 2e-8);
    close(result.assetLeg, assetLeg, 2e-8);
    close(result.cashDigital, cashDigital, 2e-8);
    close(result.price, kind === 'call' ? result.assetLeg - result.cashLeg : result.cashLeg - result.assetLeg, 1e-10);
    close(result.d1 - result.d2, Math.sqrt(A));
    const forward = S * Math.exp(R - D);
    close(result.price, black76({ F: forward, K, R, A, kind }).price);
  }
}

const integrated = integrateParameters([{ duration: .5, r: .03, D: .01, sigma: .1 }, { duration: .5, r: .05, D: .02, sigma: .3 }]);
close(integrated.tau, 1); close(integrated.R, .04); close(integrated.D, .015); close(integrated.A, .05);
assert.notEqual(integrated.A, (.5 * .1 + .5 * .3) ** 2);
close(generalizedEuropean(integrated).price, generalizedEuropean({ R: .04, D: .015, A: .05 }).price);
assert.deepEqual(integrateParameters([{ duration: .5, r: .04, D: .02, sigma: .2 }, { duration: .5, r: .04, D: .02, sigma: .2 }]), integrateParameters([{ duration: 1, r: .04, D: .02, sigma: .2 }]));

// Degenerate limits, negative rates, parity and dividend effects.
for (const S of [0, 80, 100, 130]) for (const kind of ['call', 'put']) {
  const expired = generalizedEuropean({ S, K: 100, R: 0, D: 0, A: 0, kind });
  close(expired.price, Math.max(kind === 'call' ? S - 100 : 100 - S, 0));
  assert.equal(expired.d1, null); assert.equal(expired.d2, null);
  const deterministic = generalizedEuropean({ S, K: 100, R: -.01, D: .03, A: 0, kind });
  close(deterministic.price, Math.max((kind === 'call' ? 1 : -1) * (S * Math.exp(-.03) - 100 * Math.exp(.01)), 0));
  close(black76({ F: S, K: 100, R: .03, A: 0, kind }).price, Math.exp(-.03) * expired.price);
}
const zeroAtStrike = generalizedEuropean({ S: 100, K: 100, R: 0, D: 0, A: 0 });
assert.equal(zeroAtStrike.exerciseProbability, 0);
assert.ok(generalizedEuropean({ D: .04 }).call < generalizedEuropean({ D: 0 }).call);
assert.ok(generalizedEuropean({ D: .04 }).put > generalizedEuropean({ D: 0 }).put);
close(black76({ F: 120, R: .1 }).price, Math.exp(-.1) * black76({ F: 120, R: 0 }).price);

// Fixed seed gives reproducible MC and conservative, deterministic checks of
// change-of-measure normalization and all three stock expectations.
const experiment = measureChangeExperiment();
assert.deepEqual(experiment, measureChangeExperiment());
withinSE(experiment.physicalCall, experiment.physicalCallMean);
withinSE(experiment.riskNeutralCall, experiment.analytic.price);
withinSE(experiment.weightedCall, experiment.analytic.price);
withinSE(experiment.physicalStock, experiment.physicalStockMean);
withinSE(experiment.riskNeutralStock, 100);
withinSE(experiment.weightedStock, 100);
withinSE(experiment.weights, 1);
assert.ok(experiment.physicalCall.mean - experiment.analytic.price > 20 * experiment.physicalCall.se);
assert.ok(experiment.effectiveSampleSize > 0 && experiment.effectiveSampleSize <= experiment.count);

const changedMu = measureChangeExperiment({ mu: -.03 });
assert.deepEqual(changedMu.riskNeutralCall, experiment.riskNeutralCall);
assert.deepEqual(changedMu.riskNeutralStock, experiment.riskNeutralStock);
close(changedMu.analytic.price, experiment.analytic.price);
withinSE(changedMu.weightedCall, changedMu.analytic.price);
withinSE(changedMu.weightedStock, 100);
withinSE(changedMu.weights, 1);
const identicalMeasures = measureChangeExperiment({ mu: .05 });
assert.deepEqual(identicalMeasures.physicalCall, identicalMeasures.riskNeutralCall);
assert.deepEqual(identicalMeasures.weightedCall, identicalMeasures.riskNeutralCall);
assert.equal(identicalMeasures.weights.mean, 1); assert.equal(identicalMeasures.weights.se, 0);
assert.equal(identicalMeasures.effectiveSampleSize, identicalMeasures.count);
const expiredSimulation = measureChangeExperiment({ tau: 0, S0: 110, count: 2 });
close(expiredSimulation.riskNeutralCall.mean, 10); close(expiredSimulation.riskNeutralCall.se, 0); close(expiredSimulation.weights.mean, 1);

// Exercise the UI boundary combinations, including poorly concentrated weights.
for (const mu of [-.05, .2]) for (const r of [0, .1]) for (const sigma of [.15, .5]) for (const tau of [.25, 2]) {
  const result = measureChangeExperiment({ mu, r, sigma, tau });
  assert.ok(Number.isFinite(result.weightedCall.mean) && result.weightedCall.mean >= 0);
  withinSE(result.riskNeutralCall, result.analytic.price);
}
for (const S of [40, 180]) for (const K of [60, 160]) for (const r of [0, .1]) for (const D of [0, .1]) for (const sigma of [0, .5]) for (const tau of [0, 3]) {
  for (const result of [generalizedEuropean({ S, K, R: r * tau, D: D * tau, A: sigma ** 2 * tau }), black76({ F: S, K, R: r * tau, A: sigma ** 2 * tau })]) {
    assert.ok(Number.isFinite(result.call) && result.call >= 0 && Number.isFinite(result.put) && result.put >= 0);
    close(result.call - result.put, result.discountedSpot - result.discountedStrike);
  }
}

for (const args of [{ S: -1 }, { K: 0 }, { R: NaN }, { D: Infinity }, { A: -.01 }, { kind: 'digital' }, { R: -1000 }, { D: -1000 }]) assert.throws(() => generalizedEuropean(args), RangeError);
for (const args of [{ F: -1 }, { F: NaN }]) assert.throws(() => black76(args), RangeError);
for (const segments of [[], [null], [{ duration: 1 }], [{ duration: -1, sigma: .2 }], [{ duration: 1, sigma: -.2 }], [{ duration: 1, sigma: .2, D: NaN }]]) assert.throws(() => integrateParameters(segments), RangeError);
for (const args of [{ S0: 0 }, { K: 0 }, { mu: NaN }, { sigma: 0 }, { tau: -1 }, { seed: -1 }, { seed: 1.5 }, { count: 1 }, { count: 2.5 }]) assert.throws(() => measureChangeExperiment(args), RangeError);

console.log('Martingale pricing passed: independent payoff/leg integration, Black–Scholes and Black-76 equivalence, integrated variance, parity and boundaries, seeded P/Q/weighted Monte Carlo with SE, Girsanov normalization, mu invariance and UI parameter limits.');
