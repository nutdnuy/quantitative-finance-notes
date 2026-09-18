// One-period simple total returns. Inputs are decimal fractions, not percentages.
export const PORTFOLIO_DEFAULTS = Object.freeze({ muA: .12, muB: .06, sigmaA: .20, sigmaB: .10, rho: .20, rf: .02 });

function parameters(overrides) {
  const values = { ...PORTFOLIO_DEFAULTS, ...overrides };
  for (const key of Object.keys(PORTFOLIO_DEFAULTS)) {
    if (!Number.isFinite(values[key])) throw new RangeError(`${key} must be finite`);
  }
  if (values.sigmaA <= 0 || values.sigmaB <= 0) throw new RangeError('Asset standard deviations must be positive');
  if (values.rho < -1 || values.rho > 1) throw new RangeError('Correlation must be between -1 and 1');
  return values;
}

function pointAt(wA, p) {
  const wB = 1 - wA;
  const mu = wA * p.muA + wB * p.muB;
  // Factor form avoids cancellation near perfect negative correlation.
  const first = wA * p.sigmaA + wB * p.rho * p.sigmaB;
  const second = wB * p.sigmaB * Math.sqrt((1 - p.rho) * (1 + p.rho));
  const rawSigma = Math.hypot(first, second);
  const zeroRisk = rawSigma <= 32 * Number.EPSILON * Math.max(p.sigmaA, p.sigmaB);
  const sigma = zeroRisk ? 0 : rawSigma;
  const excess = mu - p.rf;
  return { wA, wB, mu, variance: sigma * sigma, sigma, excess, zeroRisk, sharpe: zeroRisk ? null : excess / sigma };
}

export function portfolioPoint({ wA = .5, ...overrides } = {}) {
  if (!Number.isFinite(wA) || wA < 0 || wA > 1) throw new RangeError('The A weight must be between 0 and 1');
  return pointAt(wA, parameters(overrides));
}

export function analyzePortfolio(overrides = {}) {
  const p = parameters(overrides);
  const a = p.sigmaA ** 2, b = p.sigmaB ** 2, c = p.rho * p.sigmaA * p.sigmaB;
  const denominator = (p.sigmaA - p.sigmaB) ** 2 + 2 * p.sigmaA * p.sigmaB * (1 - p.rho);
  const nonUniqueGMV = denominator === 0;
  const unrestrictedGMVWeight = nonUniqueGMV ? null : (b - c) / denominator;
  const gmv = pointAt(nonUniqueGMV ? .5 : Math.max(0, Math.min(1, unrestrictedGMVWeight)), p);
  const zeroRisk = gmv.zeroRisk ? gmv : null;
  const positiveZeroRiskExcess = zeroRisk && zeroRisk.excess > 32 * Number.EPSILON * Math.max(1, Math.abs(p.rf), Math.abs(zeroRisk.mu));

  // The derivative of Sharpe has a linear numerator. Endpoints plus its root
  // contain every finite maximum; a grid also verifies candidates near singularities.
  const eA = p.muA - p.rf, eB = p.muB - p.rf;
  const numerator = eA * b - eB * c;
  const sharpeDenominator = eA * (b - c) + eB * (a - c);
  const stationaryWeight = sharpeDenominator === 0 ? null : numerator / sharpeDenominator;
  const weights = Array.from({ length: 201 }, (_, i) => i / 200);
  weights.push(gmv.wA);
  if (stationaryWeight !== null && stationaryWeight >= 0 && stationaryWeight <= 1) weights.push(stationaryWeight);
  let maxSharpe = null;
  if (!positiveZeroRiskExcess) {
    for (const weight of weights) {
      const point = pointAt(weight, p);
      if (point.sharpe !== null && (!maxSharpe || point.sharpe > maxSharpe.sharpe + 1e-13)) maxSharpe = point;
    }
  }
  const cal = !zeroRisk && maxSharpe?.sharpe > 0
    ? [{ sigma: 0, mu: p.rf }, { sigma: maxSharpe.sigma, mu: maxSharpe.mu }]
    : [];
  const curveWeights = [...new Set([...weights, ...(maxSharpe ? [maxSharpe.wA] : [])])].sort((left, right) => left - right);
  return {
    parameters: p, gmv, unrestrictedGMVWeight, nonUniqueGMV, zeroRisk,
    sharpeStatus: positiveZeroRiskExcess ? 'unbounded' : maxSharpe ? 'finite' : 'undefined',
    maxSharpe, cal, curve: curveWeights.map(weight => pointAt(weight, p)),
  };
}
