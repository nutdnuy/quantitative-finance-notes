import assert from 'node:assert/strict';
import { erfc, transitionDensity, transitionCdf, intervalProbability, trinomialDistribution } from '../src/transition-density.mjs';

const close = (actual, expected, tolerance = 1e-11) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const relative = (actual, expected, tolerance = 1e-11) => assert.ok(Math.abs(actual / expected - 1) <= tolerance, `${actual} != ${expected} relatively`);
const checks = [];
// Independent reference constants for the standard complementary error function.
for (const [x, value] of [[0, 1], [.5, .4795001221869535], [1, .15729920705028513], [1.5, .033894853524689274], [2, .004677734981047265], [3, .000022090496998585438], [6, 2.1519736712498916e-17], [10, 2.088487583762545e-45], [20, 5.395865611607901e-176]]) relative(erfc(x), value);
close(erfc(Infinity), 0); close(erfc(-Infinity), 2);
for (const x of [.01, .5, 1.49, 1.5, 1.51, 3, 6]) close(erfc(-x) + erfc(x), 2);
checks.push('erfc reference values across the series/continued-fraction switch and deep tails; symmetry');
close(intervalProbability(), .5204998778130465);
close(intervalProbability({ tau: .25 }), .8427007929497149);
close(transitionDensity({ y: 1, z: 1, c: 1, tau: 1 }), 1 / (2 * Math.sqrt(Math.PI)));
close(transitionCdf({ y: 1, z: 1 }), .5);
checks.push('Gaussian kernel and default interval examples at tau=1 and tau=.25');
for (const y of [-2, 0, 1]) for (const c of [.2, 1, 2]) for (const tau of [.05, .25, 1, 2]) {
  close(intervalProbability({ y, c, tau, a: -Infinity, b: Infinity }), 1);
  close(intervalProbability({ y, c, tau, a: y, b: y }), 0);
  for (const offset of [.1, 1, 4]) close(transitionCdf({ y, c, tau, z: y + offset }) + transitionCdf({ y, c, tau, z: y - offset }), 1);
}
// Right tail probability is retained, though direct CDF subtraction can round to zero.
relative(intervalProbability({ y: 0, c: 1 / Math.SQRT2, tau: 1, a: 9, b: 10 }), 1.128512207423599e-19);
relative(intervalProbability({ y: 0, c: 1 / Math.SQRT2, tau: 1, a: -10, b: -9 }), 1.128512207423599e-19);
checks.push('CDF symmetry, total probability one, zero point probability and stable same-side tail intervals');

// Numerical integration of the density is independent of the CDF implementation.
const integrate = (fn, lo, hi, pieces = 10000) => {
  const h = (hi - lo) / pieces; let sum = fn(lo) + fn(hi);
  for (let i = 1; i < pieces; i++) sum += (i % 2 ? 4 : 2) * fn(lo + i * h);
  return sum * h / 3;
};
for (const [y, c, tau] of [[1, 1, 1], [-1, .2, .05], [2, 2, 2]]) {
  const sd = c * Math.sqrt(2 * tau), density = z => transitionDensity({ y, c, tau, z });
  close(integrate(density, y - 9 * sd, y + 9 * sd), 1, 1e-10);
  close(integrate(z => z * density(z), y - 9 * sd, y + 9 * sd), y, 1e-10);
  close(integrate(z => (z - y) ** 2 * density(z), y - 9 * sd, y + 9 * sd), sd ** 2, 1e-9);
}
checks.push('Numerical density integrals independently recover normalization, mean and variance');

const two = trinomialDistribution();
two.forEach((point, j) => { close(point.x, j - 2); close(point.mass, [.04, .24, .44, .24, .04][j]); });
close(two.reduce((sum, point) => sum + point.mass * point.x ** 2, 0), .8);
checks.push('Exact two-step alpha=.2, h=1 distribution and variance .8');
for (const alpha of [0, .1, .2, .4, .5]) for (const steps of [0, 1, 2, 10, 100]) {
  const h = .7, initial = -1.5, points = trinomialDistribution({ alpha, steps, stepSize: h, initial });
  assert.equal(points.length, 2 * steps + 1); assert.ok(points.every(point => point.mass >= 0 && Number.isFinite(point.mass)));
  close(points.reduce((sum, point) => sum + point.mass, 0), 1);
  close(points.reduce((sum, point) => sum + point.mass * point.x, 0), initial);
  close(points.reduce((sum, point) => sum + point.mass * (point.x - initial) ** 2, 0), 2 * steps * alpha * h * h);
}
checks.push('Exact recurrence normalization, support, nonnegative masses, mean and variance including edge probabilities');
const convergence = [];
for (const steps of [2, 5, 10, 20, 50, 100]) {
  const alpha = .2, h = Math.sqrt(1 / (steps * alpha)), points = trinomialDistribution({ steps, alpha, stepSize: h });
  close(points.reduce((sum, point) => sum + point.mass * point.x ** 2, 0), 2);
  const outside = intervalProbability({ y: 0, c: 1, tau: 1, a: -Infinity, b: points[0].x - h / 2 }) + intervalProbability({ y: 0, c: 1, tau: 1, a: points.at(-1).x + h / 2, b: Infinity });
  const error = points.reduce((sum, point) => sum + Math.abs(point.mass - intervalProbability({ y: 0, c: 1, tau: 1, a: point.x - h / 2, b: point.x + h / 2 })), outside);
  convergence.push({ steps, error });
}
for (let i = 1; i < convergence.length; i++) assert.ok(convergence[i].error < convergence[i - 1].error, JSON.stringify(convergence));
assert.ok(convergence.at(-1).error < .002);
checks.push('Fixed-horizon refinement preserves variance and reduces error versus integrated Gaussian bins');

// The heat kernel satisfies the forward heat equation, and the backward time sign reverses.
for (const [y, z, c, tau] of [[1, 0, 1, 1], [-1, .5, .7, .8], [0, .2, 1.4, .4]]) {
  const space = 1e-3, time = 1e-5, value = transitionDensity({ y, z, c, tau });
  const dTau = (transitionDensity({ y, z, c, tau: tau + time }) - transitionDensity({ y, z, c, tau: tau - time })) / (2 * time);
  const dZZ = (transitionDensity({ y, z: z + space, c, tau }) - 2 * value + transitionDensity({ y, z: z - space, c, tau })) / space ** 2;
  const dYY = (transitionDensity({ y: y + space, z, c, tau }) - 2 * value + transitionDensity({ y: y - space, z, c, tau })) / space ** 2;
  close(dTau - c * c * dZZ, 0, 2e-7);
  close(-dTau + c * c * dYY, 0, 2e-7);
}
checks.push('Finite-difference forward and backward heat-equation residuals with consistent elapsed-time sign');

for (const invalid of [{ tau: 0 }, { tau: -1 }, { tau: Infinity }, { c: 0 }, { c: -1 }, { c: NaN }, { y: Infinity }, { c: Number.MIN_VALUE, tau: Number.MIN_VALUE }]) {
  assert.throws(() => transitionDensity({ z: 1, ...invalid }), RangeError);
  assert.throws(() => intervalProbability(invalid), RangeError);
}
for (const invalid of [{ a: 2, b: 1 }, { a: NaN }, { b: '2' }]) assert.throws(() => intervalProbability(invalid), RangeError);
for (const invalid of [{ alpha: -.1 }, { alpha: .51 }, { alpha: NaN }, { steps: -1 }, { steps: 2.5 }, { steps: 501 }, { stepSize: 0 }, { stepSize: Infinity }, { initial: NaN }]) assert.throws(() => trinomialDistribution(invalid), RangeError);
assert.throws(() => transitionDensity({ z: Infinity }), RangeError);
assert.throws(() => transitionCdf({ z: NaN }), RangeError);
checks.push('Reject invalid parameters, non-finite values and tau=0 as an ordinary density');
console.log(JSON.stringify({ status: 'passed', checks, convergence }, null, 2));
