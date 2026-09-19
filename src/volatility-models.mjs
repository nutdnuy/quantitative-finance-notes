function finiteNonnegative(value, name) {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be finite and nonnegative.`);
}

function finitePositive(value, name) {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be finite and positive.`);
}

// Returns use decimal units; variances therefore use decimal-return squared units.
// Updating once does not itself require the stationary condition alpha + beta < 1.
export function updateVariance({ omega, alpha, beta, variance, residual }) {
  finitePositive(omega, 'omega');
  finiteNonnegative(alpha, 'alpha');
  finiteNonnegative(beta, 'beta');
  finiteNonnegative(variance, 'variance');
  if (!Number.isFinite(residual)) throw new RangeError('residual must be finite.');
  const nextVariance = omega + alpha * residual ** 2 + beta * variance;
  finitePositive(nextVariance, 'nextVariance');
  return nextVariance;
}

// Element k - 1 is E_t[h_(t+k)]; nextVariance is h_(t+1), already known at t.
export function varianceForecasts({ nextVariance, longRunVariance, persistence, horizon }) {
  finitePositive(nextVariance, 'nextVariance');
  finitePositive(longRunVariance, 'longRunVariance');
  if (!Number.isFinite(persistence) || persistence < 0 || persistence >= 1) throw new RangeError('Stationary persistence must be in [0, 1).');
  if (!Number.isSafeInteger(horizon) || horizon < 1 || horizon > 100000) throw new RangeError('horizon must be an integer from 1 to 100000.');
  return Array.from({ length: horizon }, (_, i) => longRunVariance + persistence ** i * (nextVariance - longRunVariance));
}

// Half-life of a variance forecast's gap from its long-run level, in periods.
export function halfLife(persistence) {
  if (!Number.isFinite(persistence) || persistence < 0 || persistence > 1) throw new RangeError('persistence must be in [0, 1].');
  if (persistence === 0) return 0;
  if (persistence === 1) return Infinity;
  return Math.log(0.5) / Math.log(persistence);
}

// For conditionally zero-mean innovations, cross-period conditional covariances
// vanish, so the variance of their cumulative return is the sum of forecasts.
export function aggregateVariance(forecasts) {
  if (!Array.isArray(forecasts) || forecasts.length === 0) throw new RangeError('At least one variance forecast is required.');
  forecasts.forEach(value => finiteNonnegative(value, 'forecast'));
  const total = forecasts.reduce((sum, value) => sum + value, 0);
  finiteNonnegative(total, 'aggregate variance');
  return total;
}

// kappa = E[z^2 I(z < 0)], not merely P(z < 0). It is 1/2 for a symmetric
// innovation with unit second moment. Return the coefficient even when >= 1
// so callers can check the finite-unconditional-variance condition themselves.
export function gjrPersistence({ alpha, beta, gamma, negativeSecondMoment = 0.5 }) {
  finiteNonnegative(alpha, 'alpha');
  finiteNonnegative(beta, 'beta');
  if (!Number.isFinite(gamma) || alpha + gamma < 0) throw new RangeError('gamma must be finite and alpha + gamma nonnegative.');
  if (!Number.isFinite(negativeSecondMoment) || negativeSecondMoment < 0 || negativeSecondMoment > 1) throw new RangeError('negativeSecondMoment must be in [0, 1].');
  const persistence = alpha + beta + gamma * negativeSecondMoment;
  finiteNonnegative(persistence, 'persistence');
  return persistence;
}
