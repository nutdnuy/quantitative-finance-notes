import assert from 'node:assert/strict';
import { bsValue } from '../src/black-scholes.mjs';
import { monteCarloPrice, explicitFiniteDifference } from '../src/numerical-methods.mjs';

const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected} (tolerance ${tolerance})`);
const checks = [];
const mc = monteCarloPrice(), fd = explicitFiniteDifference();
close(mc.benchmark, 9.413403383853016); close(fd.benchmark, mc.benchmark);
assert.deepEqual(mc, monteCarloPrice());
assert.notEqual(mc.price, monteCarloPrice({ seed: 74 }).price);
const longer = monteCarloPrice({ samples: 40000 });
assert.deepEqual(mc.terminalPreview, longer.terminalPreview);
assert.deepEqual(mc.checkpoints.at(-1), longer.checkpoints.find(row => row.n === 10000));
assert.ok(mc.se / longer.se > 1.8 && mc.se / longer.se < 2.2);
checks.push('Seed reproducibility, shared sample prefixes and approximately half the SE with four times as many samples');

// Reconstruct variance in a separate two-pass calculation from a short sample.
const short = monteCarloPrice({ samples: 17, kind: 'put', r: -.01, sigma: .3 });
const mean = short.terminalPreview.reduce((total, row) => total + row.discountedPayoff, 0) / 17;
const variance = short.terminalPreview.reduce((total, row) => total + (row.discountedPayoff - mean) ** 2, 0) / 16;
close(short.price, mean); close(short.se, Math.sqrt(variance / 17));
for (const row of short.terminalPreview) {
  close(row.payoff, Math.max(100 - row.S, 0));
  close(row.discountedPayoff, Math.exp(.01) * row.payoff);
}
for (const row of mc.checkpoints) {
  assert.ok(row.n >= 2 && row.n <= mc.samples);
  close(row.ciLow, row.price - 1.96 * row.se); close(row.ciHigh, row.price + 1.96 * row.se);
}
assert.equal(new Set(mc.checkpoints.map(row => row.n)).size, mc.checkpoints.length);
checks.push('Discounted-payoff arithmetic, sample-variance denominator N−1 and normal-interval checkpoints');

for (const kind of ['call', 'put']) {
  const estimate = monteCarloPrice({ samples: 200000, kind });
  // A broad deterministic regression guard, not a promise that a 95% CI covers.
  assert.ok(Math.abs(estimate.price - estimate.benchmark) < 5 * estimate.se);
  for (const parameters of [{ sigma: 0 }, { T: 0 }, { S: 0 }]) {
    const deterministic = monteCarloPrice({ ...parameters, kind, samples: 20 });
    close(deterministic.price, deterministic.benchmark); close(deterministic.se, 0);
    close(deterministic.ciLow, deterministic.ciHigh);
  }
}
checks.push('Large IID simulations agree with analytic Call/Put benchmarks; deterministic contract limits have zero sampling variance');

assert.equal(fd.stable, true); assert.equal(fd.requiredTimeSteps, 250);
for (const row of fd.coefficients) {
  assert.ok(row.a >= 0 && row.b >= 0 && row.c >= 0);
  close(row.sum, 1 - fd.r * fd.dt);
}
const tooFast = explicitFiniteDifference({ timeSteps: 100 });
assert.equal(tooFast.stable, false); assert.equal(tooFast.reason, 'time-step');
assert.equal(tooFast.price, null); assert.deepEqual(tooFast.values, []);
assert.equal(tooFast.requiredTimeSteps, 250);
assert.equal(explicitFiniteDifference({ timeSteps: tooFast.requiredTimeSteps }).stable, true);
for (const r of [-.05, .05]) {
  const driftFailure = explicitFiniteDifference({ r, timeSteps: 200000 });
  assert.equal(driftFailure.stable, false); assert.equal(driftFailure.reason, 'spatial-drift');
  assert.equal(driftFailure.requiredTimeSteps, null); assert.equal(driftFailure.price, null);
  assert.deepEqual(driftFailure.check.negativeSpatialIndices, [1]);
}
assert.equal(explicitFiniteDifference({ sigma: 0, r: 0 }).stable, true);
assert.equal(explicitFiniteDifference({ sigma: 0, r: .03 }).stable, false);
checks.push('Nonnegative stencil and reaction row sum; unsafe time steps and both drift signs are detected without marching an unsafe grid');

// Hand-expanded one-step fixture verifies time direction and the source layer.
const oneStep = explicitFiniteDifference({ S: 100, T: .01, Smax: 200, spaceSteps: 4, timeSteps: 1 });
close(oneStep.price, .055); close(oneStep.values[3].value, 50.03);
close(oneStep.values[0].value, 0); close(oneStep.values[4].value, 200 - 100 * Math.exp(-.0003));
const stationary = explicitFiniteDifference({ r: 0, sigma: 0, S: 97, T: 2 });
close(stationary.price, 0); close(stationary.theta, 0);
checks.push('One-step arithmetic uses the old layer and marches from expiry payoff toward today; zero dynamics leaves payoff unchanged');

// With no drift or diffusion, the payoff kink survives at every time horizon.
// Include strikes between nodes, where linear interpolation would add value.
for (const kind of ['call', 'put']) {
  const sign = kind === 'call' ? 1 : -1;
  for (const spaceSteps of [40, 80, 160]) {
    for (const K of [100, 103]) {
      for (const S of [K - 1, K, K + 1]) {
        const result = explicitFiniteDifference({ kind, S, K, sigma: 0, r: 0, T: 2, spaceSteps, timeSteps: 1 });
        assert.equal(result.stable, true);
        close(result.price, Math.max(sign * (S - K), 0));
        assert.equal(result.delta, S === K ? null : sign * Number(sign * (S - K) > 0));
        assert.equal(result.gamma, S === K ? null : 0);
        close(result.theta, 0);
      }
    }
  }
}
checks.push('Zero dynamics preserves exact Call/Put payoff off-grid and reports undefined kink Greeks at every grid resolution');

const refinements = [];
for (const kind of ['call', 'put']) {
  const errors = [];
  for (const spaceSteps of [40, 80, 160]) {
    const result = explicitFiniteDifference({ kind, spaceSteps, timeSteps: 1000 * (spaceSteps / 80) ** 2 });
    errors.push(Math.abs(result.price - result.benchmark));
    assert.ok(result.values.every(row => row.value >= -1e-10));
  }
  assert.ok(errors[1] < errors[0] / 3 && errors[2] < errors[1] / 3);
  assert.ok(errors[2] < .016);
  refinements.push({ kind, errors });
}
const fine = explicitFiniteDifference({ spaceSteps: 160, timeSteps: 4000 });
const exact = bsValue({ r: .03 });
close(fine.delta, exact.delta, .0005); close(fine.gamma, exact.gamma, .00005);
const h = .00001;
const exactTheta = (bsValue({ r: .03, tau: 1 - h }).price - bsValue({ r: .03, tau: 1 + h }).price) / (2 * h);
close(fine.theta, exactTheta, .01);
assert.ok(fine.theta < 0);
checks.push('Coupled space/time refinement reduces benchmark error by about four; finite-difference Delta, Gamma and calendar Theta converge');

for (const S of [0, 50, 100, 103.3, 150, 400]) {
  const call = explicitFiniteDifference({ S }), put = explicitFiniteDifference({ S, kind: 'put' });
  // Discounting inside the explicit grid is first order in dt, unlike exact BS.
  close(call.price - put.price, S - 100 * Math.exp(-.03), .00005);
  if (S === 0 || S === 400) {
    close(call.price, S === 0 ? 0 : 400 - 100 * Math.exp(-.03));
    close(put.price, S === 0 ? 100 * Math.exp(-.03) : 0);
    assert.equal(call.delta, null); assert.equal(call.gamma, null);
  }
}
const left = explicitFiniteDifference({ S: 100 }), right = explicitFiniteDifference({ S: 105 });
const between = explicitFiniteDifference({ S: 103.3 });
close(between.price, left.price * .34 + right.price * .66);
close(between.delta, left.delta * .34 + right.delta * .66);
close(between.gamma, left.gamma * .34 + right.gamma * .66);
const expiry = explicitFiniteDifference({ S: 103.3, T: 0, r: .05 });
assert.equal(expiry.stable, true); close(expiry.price, 3.3); close(expiry.delta, 1); close(expiry.gamma, 0);
assert.equal(expiry.theta, null); assert.equal(expiry.requiredTimeSteps, 0);
const kink = explicitFiniteDifference({ T: 0 });
assert.equal(kink.delta, null); assert.equal(kink.gamma, null);
checks.push('Call/Put parity within explicit time error, Dirichlet boundaries, off-grid interpolation, expiry payoff and undefined kink Greeks');

for (const invalid of [{ S: -1 }, { S: Infinity }, { K: 0 }, { K: NaN }, { r: Infinity }, { sigma: -1 }, { sigma: NaN }, { T: -1 }, { T: NaN }, { kind: 'american' }]) {
  assert.throws(() => monteCarloPrice(invalid), RangeError);
  assert.throws(() => explicitFiniteDifference(invalid), RangeError);
}
for (const invalid of [{ samples: 1 }, { samples: 1.5 }, { samples: 1000001 }, { seed: -1 }, { seed: .5 }, { seed: 2 ** 32 }]) assert.throws(() => monteCarloPrice(invalid), RangeError);
for (const invalid of [{ Smax: 100 }, { Smax: Infinity }, { Smax: 1e200 }, { S: 401 }, { spaceSteps: 3 }, { spaceSteps: 80.5 }, { spaceSteps: 1001 }, { timeSteps: 0 }, { timeSteps: 200001 }, { spaceSteps: 1000, timeSteps: 30000 }, { T: Number.MIN_VALUE }]) assert.throws(() => explicitFiniteDifference(invalid), RangeError);
checks.push('Invalid contract inputs, random seeds, dimensions, computational cost and floating-point ranges fail explicitly');

console.log(JSON.stringify({ status: 'passed', checks, defaultMonteCarlo: { price: mc.price, se: mc.se, ciLow: mc.ciLow, ciHigh: mc.ciHigh, benchmark: mc.benchmark }, defaultFiniteDifference: { price: fd.price, benchmark: fd.benchmark, delta: fd.delta, gamma: fd.gamma, theta: fd.theta, requiredTimeSteps: fd.requiredTimeSteps }, refinements }, null, 2));
