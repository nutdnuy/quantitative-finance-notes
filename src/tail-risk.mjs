import { erfc } from './transition-density.mjs';

export const normalPdf = x => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
export const normalCdf = x => .5 * erfc(-x / Math.SQRT2);

function confidence(c) {
  if (!Number.isFinite(c) || c <= 0 || c >= 1) throw new RangeError('Confidence must be between 0 and 1.');
}

export function normalQuantile(c) {
  confidence(c);
  // erfc keeps the small tail accurate; solve only in the lower half.
  if (c > .5) return -normalQuantile(1 - c);
  let low = -40, high = 0;
  for (let i = 0; i < 90; i++) {
    const mid = (low + high) / 2;
    if (normalCdf(mid) < c) low = mid; else high = mid;
  }
  return (low + high) / 2;
}

// Mean/SD of P&L, in one common unit. Positive output is a loss.
export function normalRisk(mean, sd, c = .99, horizon = 1) {
  confidence(c);
  if (![mean, sd, horizon].every(Number.isFinite) || sd < 0 || horizon <= 0) throw new RangeError('Invalid P&L parameters.');
  const z = normalQuantile(c), scaledSd = sd * Math.sqrt(horizon);
  return { var: -mean * horizon + z * scaledSd, es: -mean * horizon + scaledSd * normalPdf(z) / (1 - c), z, sd: scaledSd, mean: mean * horizon };
}

// Equal scenario probabilities. Inverse empirical CDF; ES integrates its tail,
// including a fractional observation at the boundary instead of dropping ties.
export function empiricalRisk(losses, c = .99) {
  confidence(c);
  if (!losses.length || !losses.every(Number.isFinite)) throw new RangeError('Finite losses required.');
  const sorted = [...losses].sort((a, b) => a - b), n = sorted.length;
  const snap = x => Math.round(x) > 0 && Math.abs(x - Math.round(x)) < 1e-10 ? Math.round(x) : x;
  const rank = Math.ceil(snap(n * c)), mass = snap(n * (1 - c));
  const whole = Math.floor(mass), fraction = mass - whole;
  const total = sorted.slice(n - whole).reduce((sum, x) => sum + x, 0);
  const fractionalLoss = fraction > 0 ? sorted[n - whole - 1] * fraction : 0;
  return { var: sorted[Math.max(0, rank - 1)], es: (total + fractionalLoss) / mass, sorted, mass, whole, fraction };
}

export function teachingLosses(worst = 20) {
  return [...Array.from({ length: 98 }, (_, i) => -2 + 4 * i / 97), 10, worst];
}

export const PORTFOLIO = {
  prices: [244, 135, 315], means: [.005, .003, .002],
  covariance: [[.0004, .0003, .00005], [.0003, .0009, .00018], [.00005, .00018, .0001]],
};

export function portfolioRisk(quantities = [2, 1, 1], c = .99) {
  if (quantities.length !== 3 || !quantities.every(x => Number.isFinite(x) && x >= 0)) throw new RangeError('Three nonnegative quantities required.');
  const values = quantities.map((q, i) => q * PORTFOLIO.prices[i]);
  const value = values.reduce((a, b) => a + b, 0);
  if (!value) throw new RangeError('Portfolio must have positive value.');
  const weights = values.map(v => v / value);
  const mean = weights.reduce((s, w, i) => s + w * PORTFOLIO.means[i], 0);
  const variance = weights.reduce((s, wi, i) => s + wi * weights.reduce((t, wj, j) => t + wj * PORTFOLIO.covariance[i][j], 0), 0);
  const risk = normalRisk(mean, Math.sqrt(variance), c);
  return { value, weights, mean, sd: Math.sqrt(variance), ...risk, varDollars: value * risk.var, esDollars: value * risk.es };
}
