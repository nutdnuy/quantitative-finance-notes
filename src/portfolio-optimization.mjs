export const OPTIMIZATION_DEFAULTS = Object.freeze({
  mu: Object.freeze([.05, .07, .15, .27]),
  sigma: Object.freeze([.07, .12, .30, .60]),
  correlation: Object.freeze([
    Object.freeze([1, .8, .5, .4]),
    Object.freeze([.8, 1, .7, .5]),
    Object.freeze([.5, .7, 1, .8]),
    Object.freeze([.4, .5, .8, 1]),
  ]),
  rf: .025,
  marketWeights: Object.freeze([.05, .40, .45, .10]),
  marketRiskAversion: 2.24,
  tau: 1 / 120,
  views: Object.freeze({
    P: Object.freeze([
      Object.freeze([-1, 0, 1, 0]),
      Object.freeze([0, 1, 0, 0]),
    ]),
    Q: Object.freeze([.10, .03]),
  }),
});

const finite = (value, name) => {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
  return value;
};

function vector(values, name, length) {
  if (!Array.isArray(values) || (length !== undefined && values.length !== length) || values.length === 0) {
    throw new RangeError(`${name} has an invalid length`);
  }
  return values.map((value, index) => finite(value, `${name}[${index}]`));
}

function matrix(values, name, rows, columns) {
  if (!Array.isArray(values) || (rows !== undefined && values.length !== rows) || values.length === 0) {
    throw new RangeError(`${name} has an invalid row count`);
  }
  const width = columns ?? values[0]?.length;
  if (!Number.isInteger(width) || width <= 0) throw new RangeError(`${name} has no columns`);
  return values.map((row, i) => vector(row, `${name}[${i}]`, width));
}

const dot = (left, right) => left.reduce((sum, value, index) => sum + value * right[index], 0);
const multiply = (left, right) => left.map(row => right[0].map((_, column) => dot(row, right.map(item => item[column]))));
const multiplyVector = (left, right) => left.map(row => dot(row, right));
const transpose = values => values[0].map((_, column) => values.map(row => row[column]));
const scaleMatrix = (values, scale) => values.map(row => row.map(value => value * scale));
const add = (left, right) => left.map((row, i) => row.map((value, j) => value + right[i][j]));

function symmetricPositiveDefinite(values, name = 'matrix') {
  const a = matrix(values, name);
  if (a.length !== a[0].length) throw new RangeError(`${name} must be square`);
  const n = a.length, scale = Math.max(...a.flat().map(Math.abs));
  if (!(scale > 0)) throw new RangeError(`${name} must be positive definite`);
  for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) {
    const tolerance = 1e-12 * scale;
    if (Math.abs(a[i][j] - a[j][i]) > tolerance) throw new RangeError(`${name} must be symmetric`);
  }
  const positiveTolerance = Number.EPSILON * n * scale;
  const lower = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let residual = a[i][j];
    for (let k = 0; k < j; k++) residual -= lower[i][k] * lower[j][k];
    if (i === j) {
      if (!(residual > positiveTolerance)) throw new RangeError(`${name} must be positive definite`);
      lower[i][j] = Math.sqrt(residual);
    } else lower[i][j] = residual / lower[j][j];
  }
  return { values: a, lower };
}

function solveWithCholesky(lower, right) {
  const n = lower.length, y = Array(n), x = Array(n);
  for (let i = 0; i < n; i++) {
    let residual = right[i];
    for (let j = 0; j < i; j++) residual -= lower[i][j] * y[j];
    y[i] = residual / lower[i][i];
  }
  for (let i = n - 1; i >= 0; i--) {
    let residual = y[i];
    for (let j = i + 1; j < n; j++) residual -= lower[j][i] * x[j];
    x[i] = residual / lower[i][i];
  }
  return x;
}

function solveSpd(values, right, name = 'matrix') {
  const { lower } = symmetricPositiveDefinite(values, name);
  return solveWithCholesky(lower, vector(right, 'right-hand side', lower.length));
}

function covarianceInputs(mu, covariance) {
  const means = vector(mu, 'mu');
  const checked = symmetricPositiveDefinite(covariance, 'covariance');
  if (checked.values.length !== means.length) throw new RangeError('mu and covariance dimensions differ');
  return { mu: means, covariance: checked.values, lower: checked.lower };
}

export function covarianceFromVolatility(volatility, correlation) {
  const sigma = vector(volatility, 'volatility');
  if (sigma.some(value => value <= 0)) throw new RangeError('volatility values must be positive');
  const rho = matrix(correlation, 'correlation', sigma.length, sigma.length);
  for (let i = 0; i < rho.length; i++) for (let j = 0; j < rho.length; j++) {
    if (rho[i][j] < -1 || rho[i][j] > 1) throw new RangeError('correlations must be between -1 and 1');
    if (i === j && Math.abs(rho[i][j] - 1) > 1e-12) throw new RangeError('correlation diagonal must equal one');
  }
  const covariance = rho.map((row, i) => row.map((value, j) => value * sigma[i] * sigma[j]));
  symmetricPositiveDefinite(covariance, 'covariance implied by correlation');
  return covariance;
}

export function portfolioMoments(weights, mu, covariance) {
  const inputs = covarianceInputs(mu, covariance);
  const w = vector(weights, 'weights', inputs.mu.length);
  const mean = dot(w, inputs.mu), variance = dot(w, multiplyVector(inputs.covariance, w));
  if (variance < -1e-12) throw new RangeError('portfolio variance cannot be negative');
  return { weights: w, mean, variance: Math.max(0, variance), sigma: Math.sqrt(Math.max(0, variance)) };
}

export function globalMinimumVariance({ mu, covariance }) {
  const inputs = covarianceInputs(mu, covariance), ones = Array(inputs.mu.length).fill(1);
  const solved = solveWithCholesky(inputs.lower, ones), denominator = dot(ones, solved);
  if (!(denominator > 0)) throw new RangeError('GMV denominator must be positive');
  return portfolioMoments(solved.map(value => value / denominator), inputs.mu, inputs.covariance);
}

export function minimumVarianceForTarget({ mu, covariance, target }) {
  finite(target, 'target');
  const inputs = covarianceInputs(mu, covariance), ones = Array(inputs.mu.length).fill(1);
  const inverseOnes = solveWithCholesky(inputs.lower, ones), inverseMu = solveWithCholesky(inputs.lower, inputs.mu);
  const A = dot(ones, inverseOnes), B = dot(ones, inverseMu), C = dot(inputs.mu, inverseMu), determinant = A * C - B * B;
  if (!(determinant > 1e-12 * Math.max(Math.abs(A * C), B * B, Number.MIN_VALUE))) throw new RangeError('target-return constraints are linearly dependent');
  const first = (C - B * target) / determinant, second = (A * target - B) / determinant;
  const weights = inverseOnes.map((value, index) => first * value + second * inverseMu[index]);
  return { ...portfolioMoments(weights, inputs.mu, inputs.covariance), multipliers: { budget: first, return: second } };
}

export function tangencyPortfolio({ mu, covariance, rf }) {
  finite(rf, 'rf');
  const inputs = covarianceInputs(mu, covariance), ones = Array(inputs.mu.length).fill(1);
  const excess = inputs.mu.map(value => value - rf), direction = solveWithCholesky(inputs.lower, excess), denominator = dot(ones, direction);
  if (Math.abs(denominator) <= 1e-12 * Math.max(1, ...direction.map(Math.abs))) throw new RangeError('tangency portfolio cannot be normalized');
  const moments = portfolioMoments(direction.map(value => value / denominator), inputs.mu, inputs.covariance);
  if (!(moments.sigma > 0)) throw new RangeError('tangency portfolio must have positive risk');
  return { ...moments, excessReturn: moments.mean - rf, sharpe: (moments.mean - rf) / moments.sigma };
}

export function riskFreeTargetPortfolio({ mu, covariance, rf, target }) {
  finite(target, 'target');
  const tangency = tangencyPortfolio({ mu, covariance, rf });
  if (Math.abs(tangency.excessReturn) <= 1e-14) throw new RangeError('tangency excess return must be nonzero');
  const riskyScale = (target - rf) / tangency.excessReturn;
  const riskyWeights = tangency.weights.map(value => value * riskyScale), riskFreeWeight = 1 - riskyScale;
  const variance = riskyScale * riskyScale * tangency.variance;
  return { target, riskyWeights, riskFreeWeight, riskyScale, mean: target, variance, sigma: Math.sqrt(variance), tangency };
}

export function blackLitterman({
  covariance,
  marketWeights,
  marketRiskAversion,
  tau,
  P,
  Q,
  omega,
  uncertaintyMultiplier = 1,
  riskAversion = marketRiskAversion,
}) {
  finite(marketRiskAversion, 'marketRiskAversion');
  finite(tau, 'tau');
  finite(uncertaintyMultiplier, 'uncertaintyMultiplier');
  finite(riskAversion, 'riskAversion');
  if (marketRiskAversion <= 0 || tau <= 0 || uncertaintyMultiplier <= 0 || riskAversion <= 0) {
    throw new RangeError('risk aversion, tau and uncertainty multiplier must be positive');
  }
  const checked = symmetricPositiveDefinite(covariance, 'covariance'), n = checked.values.length;
  const market = vector(marketWeights, 'marketWeights', n);
  if (Math.abs(market.reduce((sum, value) => sum + value, 0) - 1) > 1e-10) throw new RangeError('marketWeights must sum to one');
  const views = matrix(P, 'P'), viewReturns = vector(Q, 'Q', views.length);
  if (views[0].length !== n) throw new RangeError('P and covariance dimensions differ');
  if (views.some(row => row.every(value => value === 0))) throw new RangeError('view rows must contain at least one nonzero loading');

  const tauCovariance = scaleMatrix(checked.values, tau), transposedViews = transpose(views);
  const projected = multiply(multiply(views, tauCovariance), transposedViews);
  const baseOmega = omega === undefined
    ? projected.map((row, i) => row.map((_, j) => i === j ? projected[i][i] : 0))
    : matrix(omega, 'omega', views.length, views.length);
  const scaledOmega = scaleMatrix(baseOmega, uncertaintyMultiplier);
  symmetricPositiveDefinite(scaledOmega, 'omega');

  const priorExcessReturns = multiplyVector(checked.values, market).map(value => marketRiskAversion * value);
  const priorViews = multiplyVector(views, priorExcessReturns);
  const innovation = viewReturns.map((value, index) => value - priorViews[index]);
  const system = add(projected, scaledOmega);
  const adjustmentInViewSpace = solveSpd(system, innovation, 'view update covariance');
  const posteriorAdjustment = multiplyVector(multiply(tauCovariance, transposedViews), adjustmentInViewSpace);
  const posteriorExcessReturns = priorExcessReturns.map((value, index) => value + posteriorAdjustment[index]);
  const priorRiskyWeights = solveWithCholesky(checked.lower, priorExcessReturns).map(value => value / riskAversion);
  const posteriorRiskyWeights = solveWithCholesky(checked.lower, posteriorExcessReturns).map(value => value / riskAversion);
  const priorRiskFreeWeight = 1 - priorRiskyWeights.reduce((sum, value) => sum + value, 0);
  const posteriorRiskFreeWeight = 1 - posteriorRiskyWeights.reduce((sum, value) => sum + value, 0);
  return {
    covariance: checked.values,
    baseOmega,
    omega: scaledOmega,
    priorExcessReturns,
    posteriorExcessReturns,
    priorViews,
    viewReturns,
    viewInnovation: innovation,
    marketWeights: market,
    priorRiskyWeights,
    posteriorRiskyWeights,
    priorRiskFreeWeight,
    posteriorRiskFreeWeight,
    riskAversion,
    uncertaintyMultiplier,
  };
}

export function defaultOptimizationInputs() {
  const defaults = OPTIMIZATION_DEFAULTS;
  return {
    ...defaults,
    covariance: covarianceFromVolatility(defaults.sigma, defaults.correlation),
    P: defaults.views.P.map(row => [...row]),
    Q: [...defaults.views.Q],
  };
}
