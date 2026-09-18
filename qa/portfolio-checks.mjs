import assert from 'node:assert/strict';
import { portfolioPoint, analyzePortfolio } from '../src/portfolio.mjs';

const close = (actual, expected, tolerance = 1e-12) => assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const checks = [];

const selected = portfolioPoint(), baseline = analyzePortfolio();
close(selected.mu, .09); close(selected.variance, .0145);
close(selected.sigma, .120415945787923); close(selected.sharpe, .581318358976180);
close(baseline.gmv.wA, 1 / 7); close(baseline.gmv.mu, 12 / 175);
close(baseline.gmv.variance, 8 / 875); close(baseline.unrestrictedGMVWeight, 1 / 7);
close(baseline.maxSharpe.wA, 7 / 17); close(baseline.maxSharpe.mu, 36 / 425);
close(baseline.maxSharpe.sharpe, .586301969977929);
checks.push('Default 50/50 portfolio, GMV and maximum Sharpe agree with independently worked values');

// Four equally likely states create independent two-point asset returns.
const states = [[-.08, -.04], [-.08, .16], [.32, -.04], [.32, .16]];
for (const wA of [0, .2, .5, .9, 1]) {
  const returns = states.map(([a, b]) => wA * a + (1 - wA) * b);
  const mean = returns.reduce((sum, value) => sum + value, 0) / 4;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / 4;
  const model = portfolioPoint({ wA, rho: 0 });
  close(model.mu, mean); close(model.variance, variance);
}
checks.push('Independent discrete outcome enumeration confirms weighted mean and variance');

for (const rho of [-.999999, -.95, -.6, 0, .2, .5, .9, 1]) {
  const analysis = analyzePortfolio({ rho });
  let smallestVariance = Infinity, largestSharpe = -Infinity;
  for (let i = 0; i <= 10000; i++) {
    const w = i / 10000, mean = .06 + .06 * w;
    const variance = w * w * .04 + (1 - w) ** 2 * .01 + 2 * w * (1 - w) * rho * .02;
    smallestVariance = Math.min(smallestVariance, variance);
    largestSharpe = Math.max(largestSharpe, (mean - .02) / Math.sqrt(variance));
  }
  assert.ok(analysis.gmv.variance <= smallestVariance + 1e-12);
  assert.ok(analysis.maxSharpe.sharpe >= largestSharpe - 1e-8);
  assert.ok(analysis.gmv.wA >= 0 && analysis.gmv.wA <= 1);
  assert.ok(analysis.maxSharpe.wA >= 0 && analysis.maxSharpe.wA <= 1);
  close(analysis.cal[0].mu, .02); close(analysis.cal[0].sigma, 0);
  close((analysis.cal[1].mu - .02) / analysis.cal[1].sigma, analysis.maxSharpe.sharpe);
  for (const point of analysis.curve) {
    assert.ok(Number.isFinite(point.mu) && Number.isFinite(point.sigma));
    assert.ok(point.sigma >= 0 && point.wA >= 0 && point.wA <= 1);
  }
}
checks.push('GMV and Sharpe optimum beat an independent 10,001-point grid over eight correlations; CAL and chart samples remain valid');

const sameDirection = analyzePortfolio({ rho: 1 });
close(sameDirection.unrestrictedGMVWeight, -1); close(sameDirection.gmv.wA, 0);
close(sameDirection.gmv.sigma, .1); close(sameDirection.maxSharpe.wA, 1);
close(sameDirection.maxSharpe.sharpe, .5);
for (const wA of [0, .25, .5, .75, 1]) close(portfolioPoint({ wA, rho: 1 }).sigma, .1 + .1 * wA);
checks.push('Perfect positive correlation gives a line, clips the unrestricted GMV to B, and puts maximum Sharpe at A');

const opposite = analyzePortfolio({ rho: -1 });
close(opposite.gmv.wA, 1 / 3); close(opposite.gmv.sigma, 0); close(opposite.gmv.mu, .08);
assert.equal(opposite.gmv.sharpe, null); assert.equal(opposite.sharpeStatus, 'unbounded');
assert.equal(opposite.maxSharpe, null); assert.deepEqual(opposite.cal, []);
assert.ok(opposite.curve.some(point => point.zeroRisk && point.wA === opposite.gmv.wA));
const nearOpposite = analyzePortfolio({ rho: -1 + 1e-12 });
assert.equal(nearOpposite.sharpeStatus, 'finite'); assert.ok(nearOpposite.gmv.sigma > 0);
assert.ok(nearOpposite.maxSharpe.sharpe > 10000);
checks.push('Perfect negative correlation exposes zero-risk 8% return and unbounded Sharpe; nearby correlations remain finite');

const equalRisk = analyzePortfolio({ sigmaA: .1, sigmaB: .1, rho: 1 });
assert.equal(equalRisk.nonUniqueGMV, true); assert.equal(equalRisk.unrestrictedGMVWeight, null);
close(equalRisk.gmv.sigma, .1); close(equalRisk.maxSharpe.wA, 1);
const noExcess = analyzePortfolio({ muA: .02, muB: .02 });
close(noExcess.maxSharpe.sharpe, 0); assert.deepEqual(noExcess.cal, []);
const negativeExcess = analyzePortfolio({ muA: -.02, muB: -.01 });
assert.ok(negativeExcess.maxSharpe.sharpe < 0); assert.deepEqual(negativeExcess.cal, []);
const zeroAtRiskFree = analyzePortfolio({ rho: -1, rf: .08 });
assert.equal(zeroAtRiskFree.sharpeStatus, 'finite'); assert.equal(zeroAtRiskFree.zeroRisk.sharpe, null);
assert.deepEqual(zeroAtRiskFree.cal, []);
checks.push('Nonunique GMV and zero or negative excess return cases do not fabricate a positive-slope CAL');

for (const rho of [-1, -.5, 0, .5, 1]) {
  const a = portfolioPoint({ wA: 1, rho }), b = portfolioPoint({ wA: 0, rho });
  close(a.mu, .12); close(a.sigma, .2); close(b.mu, .06); close(b.sigma, .1);
}
for (const invalid of [{ wA: -.01 }, { wA: 1.01 }, { wA: NaN }, { wA: Infinity }]) assert.throws(() => portfolioPoint(invalid), RangeError);
for (const invalid of [{ rho: -1.01 }, { rho: 1.01 }, { rho: NaN }, { sigmaA: 0 }, { sigmaB: -1 }, { sigmaA: Infinity }, { muA: NaN }, { muB: Infinity }, { rf: NaN }]) {
  assert.throws(() => portfolioPoint(invalid), RangeError);
  assert.throws(() => analyzePortfolio(invalid), RangeError);
}
checks.push('Pure-asset endpoints ignore correlation and invalid model parameters fail explicitly');

console.log(JSON.stringify({ status: 'passed', checks, selected, gmv: baseline.gmv, maxSharpe: baseline.maxSharpe }, null, 2));
