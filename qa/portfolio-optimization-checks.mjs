import assert from 'node:assert/strict';
import {
  blackLitterman,
  covarianceFromVolatility,
  defaultOptimizationInputs,
  globalMinimumVariance,
  minimumVarianceForTarget,
  portfolioMoments,
  riskFreeTargetPortfolio,
  tangencyPortfolio,
} from '../src/portfolio-optimization.mjs';

const close = (actual, expected, tolerance = 1e-11) => assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const closeVector = (actual, expected, tolerance = 1e-10) => {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => close(value, expected[index], tolerance));
};
const dot = (left, right) => left.reduce((sum, value, index) => sum + value * right[index], 0);
const multiplyVector = (matrix, values) => matrix.map(row => dot(row, values));
const inputs = defaultOptimizationInputs();
const checks = [];

const expectedCovariance = [
  [.0049, .00672, .0105, .0168],
  [.00672, .0144, .0252, .036],
  [.0105, .0252, .09, .144],
  [.0168, .036, .144, .36],
];
inputs.covariance.forEach((row, index) => closeVector(row, expectedCovariance[index]));
closeVector(inputs.covariance.map((row, index) => Math.sqrt(row[index])), inputs.sigma);
checks.push('Covariance equals diag(sigma) R diag(sigma), including all supplied off-diagonal terms');

const gmv = globalMinimumVariance(inputs);
closeVector(gmv.weights, [1.2748867225044624, -.26311272827131676, .016339420568447043, -.028113414801592743]);
close(gmv.mean, .040186736235067966); close(gmv.variance, .004178085953590554);
close(gmv.weights.reduce((sum, value) => sum + value, 0), 1);
const gmvGradient = multiplyVector(inputs.covariance, gmv.weights);
gmvGradient.forEach(value => close(value, gmvGradient[0], 1e-12));
checks.push('GMV matches the independently solved values and satisfies the budget KKT condition');

const target = minimumVarianceForTarget({ ...inputs, target: .10 });
closeVector(target.weights, [.5284121083377582, .17288807520660476, .15976434270310244, .13893547375253518]);
close(target.weights.reduce((sum, value) => sum + value, 0), 1); close(dot(target.weights, inputs.mu), .10);
close(target.variance, .02602663722503291);
const targetGradient = multiplyVector(inputs.covariance, target.weights);
targetGradient.forEach((value, index) => close(value, target.multipliers.budget + target.multipliers.return * inputs.mu[index], 1e-12));
checks.push('Target-return minimum variance matches the worked 10% solution and both equality constraints');

const tangency = tangencyPortfolio(inputs);
closeVector(tangency.weights, [.7126712173952348, .06526603679761364, .12436146647981546, .09770127932733609]);
close(tangency.mean, .08523574883594776); close(tangency.variance, .016571706535229463); close(tangency.sharpe, .46791901788904083);
const tangentGradient = multiplyVector(inputs.covariance, tangency.weights);
const ratio = tangentGradient[0] / (inputs.mu[0] - inputs.rf);
for (let index = 0; index < inputs.mu.length; index++) close(tangentGradient[index], ratio * (inputs.mu[index] - inputs.rf), 1e-12);
const funded = riskFreeTargetPortfolio({ ...inputs, target: .10 });
closeVector(funded.riskyWeights, [.8873524831610342, .08126325071765012, .1548434304583574, .12164862380157235]);
close(funded.riskFreeWeight, -.2451077881386141); close(funded.mean, .10); close(funded.sigma, .16028414561637885);
close(funded.riskyWeights.reduce((sum, value) => sum + value, funded.riskFreeWeight), 1);
close(inputs.rf * funded.riskFreeWeight + dot(funded.riskyWeights, inputs.mu), .10);
checks.push('Tangency direction is proportional to Sigma^-1 excess returns; the funded 10% target reconciles weights, mean and variance');

const bl = blackLitterman({ ...inputs, riskAversion: 2.24, uncertaintyMultiplier: 1 });
closeVector(bl.priorExcessReturns, [.02091712, .04712064, .1467312, .2599296]);
closeVector(bl.posteriorExcessReturns, [.016781811019405336, .03755243557399479, .12484270485942535, .22717373844727903]);
closeVector(bl.baseOmega.flat(), [.0006158333333333334, 0, 0, .00012]);
closeVector(bl.priorRiskyWeights, inputs.marketWeights);
closeVector(bl.posteriorRiskyWeights, [.09869571476911322, .16585951221494336, .4013042852308861, .1]);
close(bl.posteriorRiskFreeWeight, .23414048778505725);
const reconstructedPrior = multiplyVector(inputs.covariance, inputs.marketWeights).map(value => inputs.marketRiskAversion * value);
closeVector(bl.priorExcessReturns, reconstructedPrior);
checks.push('Black–Litterman prior, diagonal Omega, posterior and optimized weights match independent linear-algebra results');

const viewDistance = result => {
  const fitted = multiplyVector(inputs.P, result.posteriorExcessReturns);
  return Math.hypot(...fitted.map((value, index) => value - inputs.Q[index]));
};
const confident = blackLitterman({ ...inputs, uncertaintyMultiplier: .25, riskAversion: 2.24 });
const uncertain = blackLitterman({ ...inputs, uncertaintyMultiplier: 4, riskAversion: 2.24 });
assert.ok(viewDistance(confident) < viewDistance(bl));
assert.ok(viewDistance(bl) < viewDistance(uncertain));
const cautious = blackLitterman({ ...inputs, uncertaintyMultiplier: 1, riskAversion: 6 });
closeVector(cautious.posteriorExcessReturns, bl.posteriorExcessReturns);
cautious.posteriorRiskyWeights.forEach((value, index) => close(value, bl.posteriorRiskyWeights[index] * 2.24 / 6));
checks.push('Lower uncertainty moves posterior views toward Q; lambda rescales weights without changing posterior returns');

for (let riskStep = 0; riskStep <= 110; riskStep++) for (let uncertaintyStep = 0; uncertaintyStep <= 15; uncertaintyStep++) {
  const riskAversion = .5 + .05 * riskStep, uncertaintyMultiplier = .25 + .25 * uncertaintyStep;
  const result = blackLitterman({ ...inputs, riskAversion, uncertaintyMultiplier });
  for (const value of [
    ...result.priorExcessReturns,
    ...result.posteriorExcessReturns,
    ...result.priorRiskyWeights,
    ...result.posteriorRiskyWeights,
    result.priorRiskFreeWeight,
    result.posteriorRiskFreeWeight,
  ]) assert.ok(Number.isFinite(value));
}
checks.push('The complete slider grid remains finite with no NaN or Infinity');

assert.throws(() => covarianceFromVolatility([.1, 0], [[1, 0], [0, 1]]), RangeError);
assert.throws(() => covarianceFromVolatility([.1, .2], [[1, 1.1], [1.1, 1]]), RangeError);
assert.throws(() => covarianceFromVolatility([.1, .2], [[1, 1], [1, 1]]), RangeError);
assert.throws(() => portfolioMoments([1], inputs.mu, inputs.covariance), RangeError);
assert.throws(() => minimumVarianceForTarget({ mu: [.1, .1], covariance: [[.01, 0], [0, .04]], target: .1 }), RangeError);
assert.throws(() => tangencyPortfolio({ mu: [.02, .02], covariance: [[.01, 0], [0, .04]], rf: .02 }), RangeError);
assert.throws(() => blackLitterman({ ...inputs, riskAversion: 0 }), RangeError);
assert.throws(() => blackLitterman({ ...inputs, uncertaintyMultiplier: 0 }), RangeError);
assert.throws(() => blackLitterman({ ...inputs, marketWeights: [.1, .2, .3, .3] }), RangeError);
assert.throws(() => blackLitterman({ ...inputs, P: [[0, 0, 0, 0]], Q: [.1] }), RangeError);
assert.throws(() => blackLitterman({ ...inputs, omega: [[0, 0], [0, 0]] }), RangeError);
checks.push('Invalid dimensions, singular covariance, dependent constraints, zero excess returns and invalid BL parameters fail explicitly');

console.log(JSON.stringify({
  status: 'passed',
  checks,
  gmv,
  target10: target,
  tangency,
  blackLitterman: {
    priorExcessReturns: bl.priorExcessReturns,
    posteriorExcessReturns: bl.posteriorExcessReturns,
    posteriorRiskyWeights: bl.posteriorRiskyWeights,
    posteriorRiskFreeWeight: bl.posteriorRiskFreeWeight,
  },
}, null, 2));
