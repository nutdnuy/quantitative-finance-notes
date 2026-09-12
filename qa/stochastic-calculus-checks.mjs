import assert from 'node:assert/strict';
import { brownianDiagnostics, nestedBrownian, gbmFromIncrements, correlatedNormals } from '../src/stochastic-calculus.mjs';

const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const checks = [];
const deterministic = brownianDiagnostics({ increments: [.2, -.1, .4, .3] });
close(deterministic.terminal, .8); close(deterministic.qv, .3); close(deterministic.itoLeft, .17); close(deterministic.finiteIdentity, .17); close(deterministic.itoLimit, -.18);
checks.push('Independent finite-increment example and exact left-sum telescoping identity');
const fine = nestedBrownian({ seed: 73, steps: 4096 });
for (const steps of [4, 16, 64, 256, 1024, 4096]) {
  const coarse = nestedBrownian({ seed: 73, steps });
  close(coarse.terminal, fine.terminal); close(coarse.qvRmsTheory, Math.sqrt(2 / steps)); close(coarse.identityError, 0);
  coarse.path.forEach((value, j) => close(value, fine.path[j * 4096 / steps]));
  coarse.increments.forEach((value, j) => close(value, fine.increments.slice(j * 4096 / steps, (j + 1) * 4096 / steps).reduce((sum, x) => sum + x, 0)));
}
assert.deepEqual(nestedBrownian(), nestedBrownian()); assert.notDeepEqual(nestedBrownian({ seed: 74 }).increments, nestedBrownian().increments);
checks.push('All refinements share the same fine increments, Brownian endpoints and finite Itô identity; seeded reproducibility');

const ensembleCount = 2048, qvEnsemble = [], gbmConvergence = [];
for (const steps of [16, 64, 256]) {
  let sum = 0, squaredError = 0;
  for (let i = 0; i < ensembleCount; i++) {
    const seed = (9127 + Math.imul(i, 2654435761)) >>> 0;
    const data = nestedBrownian({ seed, steps, finestSteps: 256 }); sum += data.qv; squaredError += (data.qv - 1) ** 2;
  }
  const mean = sum / ensembleCount, mse = squaredError / ensembleCount, theoryMse = 2 / steps;
  // Chi-square moments give Var((Q_N-T)^2) = T^4*(8/N²+48/N³).
  const mseStandardError = Math.sqrt((8 / steps ** 2 + 48 / steps ** 3) / ensembleCount);
  close(mean, 1, 5 * Math.sqrt(2 / (steps * ensembleCount))); close(mse, theoryMse, 5 * mseStandardError);
  qvEnsemble.push({ steps, mean, mse, theoryMse, mseStandardError });
}
checks.push('QV ensemble mean and MSE agree with Gaussian chi-square theory within five standard errors');

const worked = gbmFromIncrements({ increments: [.012, -.025], T: .02, S0: 100, mu: .1, sigma: .2 });
close(worked.euler[1], 100.34); close(worked.euler[2], 99.93864);
close(worked.exact[2], 100 * Math.exp((.1 - .5 * .2 ** 2) * .02 + .2 * (.012 - .025)));
const negative = gbmFromIncrements({ increments: [-2], T: 1, S0: 100, mu: 0, sigma: 1 });
close(negative.euler[1], -100); assert.deepEqual(negative.nonPositiveEuler, [1]); assert.ok(negative.exact.every(value => value > 0));
const zero = gbmFromIncrements({ increments: [-1], T: 1, mu: 0, sigma: 1 }); close(zero.euler[1], 0); assert.deepEqual(zero.nonPositiveEuler, [1]);
const deterministicGbm = gbmFromIncrements({ increments: [0, .5, -.7, 1], mu: .1, sigma: 0 });
close(deterministicGbm.euler.at(-1), 100 * (1 + .1 / 4) ** 4); close(deterministicGbm.exact.at(-1), 100 * Math.exp(.1));
checks.push('Source worked Euler steps, exact log solution, zero-volatility limit and unclamped nonpositive Euler values');

let previousRms = Infinity;
for (const steps of [4, 16, 64, 256]) {
  let squaredError = 0;
  for (let i = 0; i < ensembleCount; i++) {
    const seed = (31217 + Math.imul(i, 2654435761)) >>> 0;
    const brownian = nestedBrownian({ seed, steps, finestSteps: 256 });
    const gbm = gbmFromIncrements({ increments: brownian.increments, mu: .1, sigma: .4 });
    squaredError += gbm.terminalAbsoluteError ** 2;
    assert.ok(gbm.exact.every(value => value > 0));
    close(gbm.brownian.at(-1), brownian.terminal);
  }
  const rmsError = Math.sqrt(squaredError / ensembleCount); assert.ok(rmsError < previousRms * .75); previousRms = rmsError;
  gbmConvergence.push({ steps, rmsError });
}
const samePath = [4, 16, 64, 256, 1024].map(steps => gbmFromIncrements({ increments: nestedBrownian({ steps }).increments }));
samePath.forEach(data => close(data.exact.at(-1), samePath[0].exact.at(-1)));
checks.push('Coupled GBM refinement preserves the exact terminal value and improves Euler RMS error over an ensemble');

const gaussianCount = 20000;
for (const rho of [-1, -.6, 0, .6, 1]) {
  const data = correlatedNormals({ rho, seed: 31415, count: gaussianCount });
  close(data.meanX, 0, 5 / Math.sqrt(gaussianCount)); close(data.meanY, 0, 5 / Math.sqrt(gaussianCount));
  close(data.varianceX, 1, 5 * Math.sqrt(2 / (gaussianCount - 1))); close(data.varianceY, 1, 5 * Math.sqrt(2 / (gaussianCount - 1)));
  close(data.sampleCorrelation, rho, rho === 1 || rho === -1 ? 1e-14 : 5 * (1 - rho * rho) / Math.sqrt(gaussianCount - 3));
  if (Math.abs(rho) === 1) for (const pair of data.pairs) assert.equal(pair.y, rho * pair.x);
}
const lowRho = correlatedNormals({ rho: -.4 }), highRho = correlatedNormals({ rho: .7 });
assert.deepEqual(lowRho.pairs.map(pair => pair.x), highRho.pairs.map(pair => pair.x));
assert.deepEqual(correlatedNormals(), correlatedNormals()); assert.notDeepEqual(correlatedNormals({ seed: 31416 }).pairs, correlatedNormals().pairs);
checks.push('Correlated Gaussian means, variances, sample correlation, exact rho endpoints and reused base shocks');

for (const invalid of [{ steps: 3 }, { steps: 0 }, { steps: 4097 }, { finestSteps: 0 }, { finestSteps: 65537 }, { T: 0 }, { T: Infinity }, { seed: -1 }, { seed: 1.5 }]) assert.throws(() => nestedBrownian(invalid), RangeError);
for (const increments of [[], [NaN], [Infinity], '0.2']) assert.throws(() => brownianDiagnostics({ increments }), RangeError);
for (const invalid of [{ S0: 0 }, { S0: Infinity }, { sigma: -1 }, { sigma: NaN }, { mu: Infinity }, { T: 0 }, { increments: [] }]) assert.throws(() => gbmFromIncrements({ increments: [0], ...invalid }), RangeError);
for (const invalid of [{ rho: -1.01 }, { rho: 1.01 }, { rho: NaN }, { count: 1 }, { count: 2.5 }, { count: 100001 }, { seed: Infinity }]) assert.throws(() => correlatedNormals(invalid), RangeError);
checks.push('Invalid grids, seeds, parameters, increments and correlation inputs fail explicitly');
console.log(JSON.stringify({ status: 'passed', checks, qvEnsemble, gbmConvergence }, null, 2));
