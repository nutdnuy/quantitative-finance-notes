import { normalGenerator } from './math.mjs';
import { normalCdf } from './tail-risk.mjs';

function finite(value, name) {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite.`);
}

/** European option with deterministic coefficients integrated over [t, T].
 * R = integral r(u) du, D = integral dividendYield(u) du,
 * A = integral sigma(u)^2 du. A is total variance, not annual volatility.
 * Digital events use strict inequalities; a deterministic payoff at K has
 * exerciseProbability = 0 for both call and put. d1/d2 are then undefined.
 */
export function generalizedEuropean({ S = 100, K = 100, R = .05, D = 0, A = .04, kind = 'call' } = {}) {
  for (const [name, value] of Object.entries({ S, K, R, D, A })) finite(value, name);
  if (S < 0 || K <= 0 || A < 0 || !['call', 'put'].includes(kind)) throw new RangeError('Require S >= 0, K > 0, A >= 0 and call/put kind.');
  const discount = Math.exp(-R), dividendDiscount = Math.exp(-D);
  const discountedSpot = S * dividendDiscount, discountedStrike = K * discount;
  if (![discount, dividendDiscount, discountedSpot, discountedStrike].every(Number.isFinite) || discount <= 0 || dividendDiscount <= 0 || discountedStrike <= 0) throw new RangeError('Discounted amounts exceed numerical limits.');
  let call, put, d1 = null, d2 = null, exerciseProbability, assetProbability;
  if (A === 0 || S === 0) {
    const difference = discountedSpot - discountedStrike;
    call = Math.max(difference, 0);
    put = Math.max(-difference, 0);
    exerciseProbability = Number(kind === 'call' ? difference > 0 : difference < 0);
    assetProbability = exerciseProbability;
  } else {
    const scale = Math.sqrt(A);
    d1 = (Math.log(S) - Math.log(K) + R - D) / scale + .5 * scale;
    d2 = d1 - scale;
    // Price the out-of-the-money side first to avoid cancellation, then parity.
    if (discountedSpot >= discountedStrike) {
      put = Math.max(0, discountedStrike * normalCdf(-d2) - discountedSpot * normalCdf(-d1));
      call = discountedSpot - discountedStrike + put;
    } else {
      call = Math.max(0, discountedSpot * normalCdf(d1) - discountedStrike * normalCdf(d2));
      put = discountedStrike - discountedSpot + call;
    }
    const sign = kind === 'call' ? 1 : -1;
    exerciseProbability = normalCdf(sign * d2);
    assetProbability = normalCdf(sign * d1);
  }
  const price = kind === 'call' ? call : put;
  const cashDigital = discount * exerciseProbability;
  const cashLeg = K * cashDigital, assetLeg = discountedSpot * assetProbability;
  if (![call, put, price, cashDigital, cashLeg, assetLeg, d1, d2].every(value => value === null || Number.isFinite(value))) throw new RangeError('Option result exceeds numerical limits.');
  return { S, K, R, D, A, kind, price, call, put, d1, d2, discount, dividendDiscount, discountedSpot, discountedStrike, exerciseProbability, assetProbability, cashDigital, cashLeg, assetLeg };
}

/** Black-76 for an option on a positive forward/futures quote.
 * R discounts to option expiry; A is log-price variance to option expiry.
 * Deterministic rates are assumed. The futures delivery date can be later.
 */
export function black76({ F = 100, K = 100, R = .05, A = .04, kind = 'call' } = {}) {
  finite(F, 'F');
  if (F < 0) throw new RangeError('F must be nonnegative.');
  const result = generalizedEuropean({ S: F, K, R, D: R, A, kind });
  return { ...result, F };
}

/** Piecewise-constant deterministic annual rates/volatility; duration in years. */
export function integrateParameters(segments) {
  if (!Array.isArray(segments) || !segments.length || segments.length > 10000) throw new RangeError('Require 1 to 10000 parameter segments.');
  const result = { tau: 0, R: 0, D: 0, A: 0 };
  for (const segment of segments) {
    if (segment === null || typeof segment !== 'object') throw new RangeError('Each segment must be an object.');
    const { duration, r = 0, D = 0, sigma } = segment;
    for (const [name, value] of Object.entries({ duration, r, D, sigma })) finite(value, name);
    if (duration < 0 || sigma < 0) throw new RangeError('Duration and volatility must be nonnegative.');
    result.tau += duration;
    result.R += r * duration;
    result.D += D * duration;
    result.A += sigma * sigma * duration;
  }
  if (!Object.values(result).every(Number.isFinite)) throw new RangeError('Integrated coefficients exceed numerical limits.');
  return result;
}

function accumulator() {
  return { count: 0, mean: 0, m2: 0 };
}

function add(stats, value) {
  if (!Number.isFinite(value)) throw new RangeError('Simulated values exceed numerical limits.');
  stats.count++;
  const difference = value - stats.mean;
  stats.mean += difference / stats.count;
  stats.m2 += difference * (value - stats.mean);
}

function summarize(stats) {
  const variance = Math.max(0, stats.m2 / (stats.count - 1));
  const se = Math.sqrt(variance / stats.count);
  if (![stats.mean, variance, se].every(Number.isFinite)) throw new RangeError('Sample moments exceed numerical limits.');
  return { mean: stats.mean, se, sd: Math.sqrt(variance), count: stats.count, lower95: stats.mean - 1.96 * se, upper95: stats.mean + 1.96 * se };
}

/** Terminal exact-GBM Monte Carlo using common independent Normal draws.
 * Z = exp(-theta W^P_T - theta^2 T / 2), theta = (mu-r)/sigma.
 * Weighted estimates average Z*X directly, without dividing by mean(Z).
 * Their SE is the ordinary iid SE of Z*X, not the unweighted payoff SE.
 */
export function measureChangeExperiment({ S0 = 100, K = 100, mu = .12, r = .05, sigma = .2, tau = 1, seed = 2532, count = 20000 } = {}) {
  for (const [name, value] of Object.entries({ S0, K, mu, r, sigma, tau })) finite(value, name);
  if (S0 <= 0 || K <= 0 || sigma <= 0 || tau < 0) throw new RangeError('Require S0, K, sigma > 0 and tau >= 0.');
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff || !Number.isInteger(count) || count < 2 || count > 1000000) throw new RangeError('Require an unsigned 32-bit seed and 2 to 1000000 samples.');
  const theta = (mu - r) / sigma, rootTime = Math.sqrt(tau), discount = Math.exp(-r * tau);
  const analytic = generalizedEuropean({ S: S0, K, R: r * tau, D: 0, A: sigma * sigma * tau });
  const physicalStockMean = S0 * Math.exp((mu - r) * tau);
  const physicalCallMean = generalizedEuropean({ S: physicalStockMean, K, R: r * tau, D: 0, A: sigma * sigma * tau }).price;
  if (![theta, discount, physicalStockMean, physicalCallMean].every(Number.isFinite) || discount <= 0) throw new RangeError('Simulation parameters exceed numerical limits.');
  const random = normalGenerator(seed);
  const accumulators = Object.fromEntries(['physicalCall', 'riskNeutralCall', 'weightedCall', 'physicalStock', 'riskNeutralStock', 'weightedStock', 'weights'].map(key => [key, accumulator()]));
  for (let i = 0; i < count; i++) {
    const W = rootTime * random();
    const terminalP = S0 * Math.exp((mu - .5 * sigma * sigma) * tau + sigma * W);
    const terminalQ = S0 * Math.exp((r - .5 * sigma * sigma) * tau + sigma * W);
    const weight = Math.exp(-theta * W - .5 * theta * theta * tau);
    const pCall = discount * Math.max(terminalP - K, 0), qCall = discount * Math.max(terminalQ - K, 0);
    const values = { physicalCall: pCall, riskNeutralCall: qCall, weightedCall: weight * pCall, physicalStock: discount * terminalP, riskNeutralStock: discount * terminalQ, weightedStock: weight * discount * terminalP, weights: weight };
    for (const key of Object.keys(values)) add(accumulators[key], values[key]);
  }
  const samples = Object.fromEntries(Object.entries(accumulators).map(([key, stats]) => [key, summarize(stats)]));
  const weightStats = accumulators.weights;
  const meanWeightSquare = weightStats.m2 / count + weightStats.mean ** 2;
  const effectiveSampleSize = count * weightStats.mean ** 2 / meanWeightSquare;
  if (!Number.isFinite(effectiveSampleSize) || effectiveSampleSize <= 0) throw new RangeError('Likelihood weights exceed numerical limits.');
  return { S0, K, mu, r, sigma, tau, seed, count, theta, analytic, physicalStockMean, physicalCallMean, riskNeutralStockMean: S0, effectiveSampleSize, ...samples };
}
