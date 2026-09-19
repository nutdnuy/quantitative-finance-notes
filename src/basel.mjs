import { normalCdf, normalQuantile } from './tail-risk.mjs';

const finiteNonnegative = values => values.every(value => Number.isFinite(value) && value >= 0);

// Capital amounts, RWA and exposure use one common currency unit; ratios are decimals.
export function capitalMetrics({ cet1 = 60, at1 = 10, tier2 = 20, rwa = 600, exposure = 1000 } = {}) {
  if (!finiteNonnegative([cet1, at1, tier2, rwa, exposure]) || rwa === 0 || exposure === 0) {
    throw new RangeError('Capital must be nonnegative; RWA and exposure must be positive and finite.');
  }
  const tier1 = cet1 + at1, total = tier1 + tier2;
  return { cet1, tier1, total, rwa, exposure, cet1Ratio: cet1 / rwa, tier1Ratio: tier1 / rwa, totalRatio: total / rwa, leverageRatio: tier1 / exposure };
}

// A simplified aggregate output-floor comparison, not an exposure-level risk weight.
export function outputFloor(modelRwa = 400, standardizedRwa = 800, floor = .725) {
  if (!finiteNonnegative([modelRwa, standardizedRwa, floor]) || floor > 1) {
    throw new RangeError('RWA must be nonnegative and finite; the floor fraction must be between 0 and 1.');
  }
  const floorRwa = floor * standardizedRwa;
  return { modelRwa, standardizedRwa, floor, floorRwa, effectiveRwa: Math.max(modelRwa, floorRwa), binding: floorRwa > modelRwa };
}

// Inputs are already regulatory amounts after applicable haircuts and stress rates.
export function liquidityCoverage(hqla = 120, outflows = 160, inflows = 60) {
  if (!finiteNonnegative([hqla, outflows, inflows]) || outflows === 0) {
    throw new RangeError('HQLA and inflows must be nonnegative; stressed outflows must be positive and finite.');
  }
  const inflowCap = .75 * outflows, eligibleInflows = Math.min(inflows, inflowCap), netOutflows = outflows - eligibleInflows;
  return { hqla, outflows, inflows, inflowCap, eligibleInflows, netOutflows, lcr: hqla / netOutflows };
}

// The zero-correlation limit is an asymptotically granular model result;
// it does not remove idiosyncratic default risk from a finite loan portfolio.
export function asrfStressPd(pd, rho, confidence = .999) {
  if (!Number.isFinite(pd) || pd <= 0 || pd >= 1 || !Number.isFinite(rho) || rho < 0 || rho >= 1 || !Number.isFinite(confidence) || confidence <= 0 || confidence >= 1) {
    throw new RangeError('PD and confidence must be in (0, 1); asset correlation must be in [0, 1).');
  }
  return normalCdf((normalQuantile(pd) + Math.sqrt(rho) * normalQuantile(confidence)) / Math.sqrt(1 - rho));
}

// Non-defaulted corporate exposures: no SME adjustment or financial-institution multiplier.
// PD is an annual probability, LGD a fraction, maturity in years, EAD in any common unit.
// The pedagogical PD domain starts at the lab's 0.05% lower bound; this helper
// does not select applicable input floors or establish regulatory compliance.
export function corporateIRB({ pd = .01, lgd = .45, maturity = 2.5, ead = 100 } = {}) {
  if (![pd, lgd, maturity, ead].every(Number.isFinite) || pd < .0005 || pd >= 1 || lgd < 0 || lgd > 1 || maturity < 1 || maturity > 5 || ead <= 0) {
    throw new RangeError('Require PD in [0.0005, 1), LGD in [0, 1], maturity in [1, 5] years, and positive finite EAD.');
  }
  const weight = Math.expm1(-50 * pd) / Math.expm1(-50);
  const rho = .12 * weight + .24 * (1 - weight), stressPd = asrfStressPd(pd, rho);
  const b = (.11852 - .05478 * Math.log(pd)) ** 2;
  const maturityAdjustment = (1 + (maturity - 2.5) * b) / (1 - 1.5 * b);
  const expectedLossRate = pd * lgd, stressLossRate = stressPd * lgd;
  const capitalRate = (stressLossRate - expectedLossRate) * maturityAdjustment, riskWeight = 12.5 * capitalRate;
  return {
    pd, lgd, maturity, ead, rho, stressPd, expectedLossRate, stressLossRate, maturityAdjustment,
    capitalRate, riskWeight, expectedLoss: expectedLossRate * ead, stressLoss: stressLossRate * ead,
    capital: capitalRate * ead, rwa: riskWeight * ead,
  };
}
