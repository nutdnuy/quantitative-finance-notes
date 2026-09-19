import assert from 'node:assert/strict';
import { pathPayoffs, bridgeSurvival, simulateExotics } from '../src/exotic-options.mjs';

const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected} (tolerance ${tolerance})`);
const checks = [];
const pathA = Object.freeze([100, 110, 120, 110, 110]), pathB = Object.freeze([100, 140, 90, 100, 110]);
const a = pathPayoffs({ prices: pathA }), b = pathPayoffs({ prices: pathB });
assert.deepEqual(a, { terminal: 110, average: 112.5, hit: false, vanilla: 10, asian: 12.5, outDiscrete: 10, inDiscrete: 0 });
assert.deepEqual(b, { terminal: 110, average: 110, hit: true, vanilla: 10, asian: 10, outDiscrete: 0, inDiscrete: 10 });
assert.equal(pathPayoffs({ prices: [100, 130, 120] }).hit, true);
assert.equal(pathPayoffs({ prices: [130, 110, 120] }).outDiscrete, 0);
assert.equal(pathPayoffs({ prices: [100, 120, 130] }).outDiscrete, 0);
assert.equal(pathPayoffs({ prices: [100, 90, 80] }).vanilla, 0);
assert.equal(pathPayoffs({ prices: [100, 120, 130], H: 131 }).outDiscrete, 30);
checks.push('Worked examples: averaging excludes S0; initial, interior and terminal barrier touch all count; zero-rebate payoff parity');

const segment = { start: 100, end: 110, H: 130, sigma: .2, dt: .25 };
close(bridgeSurvival(segment), 1 - Math.exp(-2 * Math.log(1.3) * Math.log(130 / 110) / (.04 * .25)));
close(bridgeSurvival({ ...segment, start: 110, end: 100 }), bridgeSurvival(segment));
close(bridgeSurvival({ ...segment, start: 130 }), 0);
close(bridgeSurvival({ ...segment, end: 140 }), 0);
close(bridgeSurvival({ ...segment, sigma: 0 }), 1);
close(bridgeSurvival({ ...segment, dt: 0 }), 1);
assert.ok(bridgeSurvival({ ...segment, end: 130 - 1e-12 }) > 0);
assert.ok(bridgeSurvival({ ...segment, dt: 1 }) < bridgeSurvival(segment));
checks.push('Bridge probability matches the reflection formula, is symmetric in endpoints and handles touching, zero time and zero volatility');

const fixedParameters = Object.freeze({ count: 16000, seed: 2535 });
const baseline = simulateExotics(fixedParameters);
assert.deepEqual(baseline, simulateExotics(fixedParameters));
assert.notEqual(baseline.estimates.vanilla.mean, simulateExotics({ ...fixedParameters, seed: 2536 }).estimates.vanilla.mean);
assert.deepEqual(baseline.sampledPaths, simulateExotics({ ...fixedParameters, count: 17000 }).sampledPaths);
close(baseline.bsPrice, 9.413403383853, 1e-10);
assert.ok(baseline.maxParityError < 1e-12);
assert.equal(baseline.maxBridgeExcess, 0);
for (const mode of ['Discrete', 'Continuous']) close(baseline.estimates[`in${mode}`].mean + baseline.estimates[`out${mode}`].mean, baseline.estimates.vanilla.mean);
assert.ok(baseline.estimates.outContinuous.mean < baseline.estimates.outDiscrete.mean);
checks.push('Fixed seed is reproducible without mutating inputs; increasing N preserves earlier paths; pathwise in/out parity and bridge ≤ discrete hold');

// Reconstruct each estimator independently from all retained paths, including
// the weighted sample variance. This detects applying CI to a hit count or
// discounting the mean without discounting its standard error.
const small = simulateExotics({ count: 16, steps: 4, seed: 71, r: .05 });
const observations = Object.fromEntries(Object.keys(small.estimates).map(key => [key, []]));
for (const prices of small.sampledPaths) {
  const discount = Math.exp(-.05), terminal = prices.at(-1), vanilla = discount * Math.max(terminal - 100, 0), hit = prices.some(S => S >= 130);
  let survival = 1;
  for (let j = 1; j < prices.length; j++) survival *= prices[j - 1] >= 130 || prices[j] >= 130 ? 0 : 1 - Math.exp(-2 * Math.log(130 / prices[j - 1]) * Math.log(130 / prices[j]) / (.04 / 4));
  const outDiscrete = hit ? 0 : vanilla, outContinuous = vanilla * survival;
  const values = { vanilla, asian: discount * Math.max(prices.slice(1).reduce((sum, S) => sum + S, 0) / 4 - 100, 0), outDiscrete, inDiscrete: vanilla - outDiscrete, outContinuous, inContinuous: vanilla - outContinuous, discountedStock: discount * terminal };
  for (const key of Object.keys(observations)) observations[key].push(values[key]);
}
for (const [key, values] of Object.entries(observations)) {
  const mean = values.reduce((sum, value) => sum + value, 0) / 16;
  const sd = Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / 15), se = sd / 4, actual = small.estimates[key];
  close(actual.mean, mean); close(actual.sd, sd); close(actual.se, se); close(actual.low, mean - 1.96 * se); close(actual.high, mean + 1.96 * se);
}
checks.push('Every price, sample SD, SE and untruncated 95% interval agrees with an independent reconstruction of discounted observations');

for (const parameters of [{ count: 60000, steps: 12, seed: 2535 }, { count: 60000, steps: 1, seed: 413, r: -.02, sigma: .35, T: .5 }]) {
  const data = simulateExotics(parameters), vanilla = data.estimates.vanilla, stock = data.estimates.discountedStock;
  assert.ok(Math.abs(vanilla.mean - data.bsPrice) < 4.5 * vanilla.se);
  assert.ok(Math.abs(stock.mean - 100) < 4.5 * stock.se);
  if (parameters.steps === 1) assert.deepEqual(data.estimates.asian, data.estimates.vanilla);
}
checks.push('Two fixed ensembles match Black–Scholes and E_Q[e^(−rT) S_T] = S0 within 4.5 sample SE; a one-fixing Asian equals vanilla');

// Independent killed-density integral for a continuously monitored upper
// barrier under log-price Brownian motion. This does not use bridgeSurvival.
function continuousBarrierReference({ S0, K, H, r, sigma, T }) {
  const boundary = Math.log(H / S0), lower = Math.log(K / S0), variance = sigma * sigma * T, drift = r - .5 * sigma * sigma;
  const normal = (x, mean) => Math.exp(-.5 * (x - mean) ** 2 / variance) / Math.sqrt(2 * Math.PI * variance);
  const intervals = 10000, dx = (boundary - lower) / intervals;
  let integral = 0;
  for (let i = 0; i <= intervals; i++) {
    const x = lower + i * dx;
    const killedDensity = normal(x, drift * T) - Math.exp(2 * drift * boundary / (sigma * sigma)) * normal(x, 2 * boundary + drift * T);
    const integrand = Math.max(S0 * Math.exp(x) - K, 0) * killedDensity;
    integral += (i === 0 || i === intervals ? 1 : i % 2 ? 4 : 2) * integrand;
  }
  return Math.exp(-r * T) * integral * dx / 3;
}
const referenceParameters = { S0: 100, K: 100, H: 130, r: .03, sigma: .2, T: 1 };
const barrierReference = continuousBarrierReference(referenceParameters);
for (const steps of [1, 12, 52]) {
  const estimate = simulateExotics({ ...referenceParameters, steps, count: 60000, seed: 7031 }).estimates.outContinuous;
  assert.ok(Math.abs(estimate.mean - barrierReference) < 4.5 * estimate.se, `${steps} intervals: ${estimate.mean} vs ${barrierReference}`);
}
checks.push('Continuous-barrier prices at 1, 12 and 52 intervals agree with an independent killed-density integral within 4.5 SE');

for (const parameters of [{ T: 0, S0: 110 }, { sigma: 0, r: .03 }, { sigma: 0, r: -.03 }, { sigma: 0, r: 0 }, { sigma: 0, r: .3 }]) {
  const data = simulateExotics({ ...parameters, count: 20, steps: 4 }), p = data.parameters;
  const prices = Array.from({ length: 5 }, (_, j) => p.S0 * Math.exp(p.r * p.T * j / 4));
  const payoffs = pathPayoffs({ prices, K: p.K, H: p.H }), discount = Math.exp(-p.r * p.T);
  for (const key of ['vanilla', 'asian', 'outDiscrete', 'inDiscrete']) { close(data.estimates[key].mean, payoffs[key] * discount); close(data.estimates[key].se, 0); }
  close(data.estimates.outContinuous.mean, data.estimates.outDiscrete.mean);
  close(data.estimates.inContinuous.mean, data.estimates.inDiscrete.mean);
  close(data.estimates.vanilla.mean, data.bsPrice);
}
const alreadyHit = simulateExotics({ S0: 130, H: 130, count: 200 });
for (const mode of ['Discrete', 'Continuous']) { close(alreadyHit.estimates[`out${mode}`].mean, 0); assert.deepEqual(alreadyHit.estimates[`in${mode}`], alreadyHit.estimates.vanilla); }
const strikeAboveBarrier = simulateExotics({ K: 140, H: 130, count: 200 });
close(strikeAboveBarrier.estimates.outContinuous.mean, 0); close(strikeAboveBarrier.estimates.outDiscrete.mean, 0);
checks.push('Expiry and zero-volatility contracts match deterministic cash flows; an initially touched barrier kills out and activates in; K ≥ H kills the zero-rebate upper knock-out Call');

for (const prices of [[], [100], [100, 0], [100, NaN], [100, Infinity]]) assert.throws(() => pathPayoffs({ prices }), RangeError);
for (const parameters of [{ S0: 0 }, { K: 0 }, { H: -1 }, { r: Infinity }, { sigma: -1 }, { T: -1 }, { steps: 0 }, { steps: 1.5 }, { steps: 1025 }, { count: 1 }, { count: 100001 }, { count: 100000, steps: 1024 }, { seed: -1 }, { seed: 1.5 }, { seed: 4294967296 }]) assert.throws(() => simulateExotics(parameters), RangeError);
assert.throws(() => bridgeSurvival({ ...segment, sigma: NaN }), RangeError);
assert.throws(() => bridgeSurvival({ ...segment, start: -1 }), RangeError);
checks.push('Invalid paths, parameters, seeds and excessive simulations fail explicitly');

console.log(JSON.stringify({ status: 'passed', checks, barrierReference, defaultPrices: Object.fromEntries(Object.entries(baseline.estimates).map(([key, row]) => [key, { price: row.mean, se: row.se }])) }, null, 2));
