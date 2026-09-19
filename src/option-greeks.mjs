import { erfc } from './transition-density.mjs';

const cdf = x => .5 * erfc(-x / Math.SQRT2);
const pdf = x => Math.exp(-.5 * x * x) / Math.sqrt(2 * Math.PI);

function validate({ S, K, r, b, sigma, T, kind }) {
  for (const [name, value] of Object.entries({ S, K, sigma, T })) {
    if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} ต้องเป็นจำนวนบวกที่มีค่าจำกัด`);
  }
  for (const [name, value] of Object.entries({ r, b })) {
    if (!Number.isFinite(value)) throw new RangeError(`${name} ต้องเป็นจำนวนที่มีค่าจำกัด`);
  }
  if (!['call', 'put'].includes(kind)) throw new RangeError('kind ต้องเป็น call หรือ put');
}

/** Generalized European Black–Scholes with independent carry b and rate r.
 * Smooth interior only: S,K,sigma,T > 0. At expiry or zero volatility some
 * derivatives are undefined; callers must not silently display them as zero.
 * Volatility derivatives are raw (sigma measured as a decimal, not percent).
 * theta/charm/color/veta are calendar-time derivatives: minus d/dT, per year.
 * rhoFixedB holds b fixed; rhoFixedYield holds q=r-b fixed, so db/dr=1.
 */
export function optionGreeks({ S = 100, K = 100, r = .05, b = .05, sigma = .2, T = 1, kind = 'call' } = {}) {
  validate({ S, K, r, b, sigma, T, kind });
  const rootT = Math.sqrt(T), scale = sigma * rootT;
  const A = Math.exp((b - r) * T), discount = Math.exp(-r * T);
  const forwardPV = S * A, strikePV = K * discount;
  if (![A, discount, scale, forwardPV, strikePV].every(x => Number.isFinite(x) && x > 0)) throw new RangeError('ตัวคูณของแบบจำลองเกินขอบเขตตัวเลขที่คำนวณได้');
  const d1 = (Math.log(S) - Math.log(K) + b * T) / scale + scale / 2, d2 = d1 - scale;
  const sign = kind === 'call' ? 1 : -1;
  let call, put;
  // Evaluate the out-of-the-money leg first to reduce cancellation, then parity.
  if (forwardPV >= strikePV) {
    put = Math.max(0, strikePV * cdf(-d2) - forwardPV * cdf(-d1));
    call = forwardPV - strikePV + put;
  } else {
    call = Math.max(0, forwardPV * cdf(d1) - strikePV * cdf(d2));
    put = strikePV - forwardPV + call;
  }
  const price = kind === 'call' ? call : put;
  const delta = sign * A * cdf(sign * d1), density = pdf(d1);
  const gamma = A * density / S / scale, vega = forwardPV * density * rootT;
  const d1T = (b + .5 * sigma * sigma) / scale - d1 / (2 * T);
  const theta = r * price - b * S * delta - .5 * sigma * sigma * S * S * gamma;
  const vanna = -A * density * d2 / sigma, vomma = vega * d1 * d2 / sigma;
  const charm = -(b - r) * delta - A * density * d1T;
  const speed = -gamma / S * (1 + d1 / scale);
  const zomma = gamma * (d1 * d2 - 1) / sigma;
  const color = -gamma * ((b - r) - d1 * d1T - .5 / T);
  const veta = -vega * ((b - r) - d1 * d1T + .5 / T);
  const rhoFixedB = -T * price, carry = T * S * delta, rhoFixedYield = rhoFixedB + carry;
  const itmProbability = cdf(sign * d2), strikeDelta = -sign * discount * itmProbability;
  const strikeGamma = discount * pdf(d2) / K / scale;
  // A vanishing numerical price makes this ratio undefined, not zero.
  const elasticity = price > 0 && Number.isFinite(S * delta / price) ? S * delta / price : null;
  const result = { S, K, r, b, sigma, T, kind, A, discount, d1, d2, price, delta, gamma, vega, theta, vanna, vomma, charm, speed, zomma, color, veta, rhoFixedB, rhoFixedYield, carry, strikeDelta, strikeGamma, itmProbability, elasticity };
  if (!Object.entries(result).every(([key, value]) => key === 'kind' || value === null || Number.isFinite(value))) throw new RangeError('ผลลัพธ์ Greeks เกินขอบเขตตัวเลขที่คำนวณได้');
  return result;
}

function inverseNormal(p) {
  if (!Number.isFinite(p) || p <= 0 || p >= 1) throw new RangeError('normalized |Delta| ต้องอยู่ระหว่าง 0 และ 1 โดยไม่รวมปลายช่วง');
  // Reflect the upper tail; bisection uses the same accurate erfc as valuation.
  if (p > .5) return -inverseNormal(1 - p);
  let low = -40, high = 0;
  for (let i = 0; i < 100; i++) {
    const middle = (low + high) / 2;
    if (cdf(middle) < p) low = middle; else high = middle;
  }
  return (low + high) / 2;
}

/** Invert ordinary spot Delta, with no premium adjustment. Call Delta > 0;
 * Put Delta < 0. This is not a forward-Delta or FX premium-adjusted convention.
 */
export function strikeFromDelta({ delta, S = 100, r = .05, b = .05, sigma = .2, T = 1, kind = 'call' } = {}) {
  validate({ S, K: 1, r, b, sigma, T, kind });
  const sign = kind === 'call' ? 1 : -1, A = Math.exp((b - r) * T);
  if (!Number.isFinite(delta) || sign * delta <= 0 || !Number.isFinite(A) || A <= 0) throw new RangeError('Delta ต้องมีเครื่องหมายตรงกับประเภท Option และอยู่ในขอบเขตที่กลับสูตรได้');
  const z = inverseNormal(sign * delta / A);
  const K = Math.exp(Math.log(S) + (b + .5 * sigma * sigma) * T - sign * z * sigma * Math.sqrt(T));
  if (!Number.isFinite(K) || K <= 0) throw new RangeError('Strike จาก Delta เกินขอบเขตตัวเลขที่คำนวณได้');
  return K;
}

function mirror({ S = 100, K = 100, b = .05, sigma = .2, T = 1 } = {}, varianceSign) {
  validate({ S, K, r: 0, b, sigma, T, kind: 'call' });
  const result = Math.exp(2 * Math.log(S) - Math.log(K) + (2 * b + varianceSign * sigma * sigma) * T);
  if (!Number.isFinite(result) || result <= 0) throw new RangeError('Mirror strike เกินขอบเขตตัวเลขที่คำนวณได้');
  return result;
}

/** Opposite-kind strike with equal absolute ordinary spot Delta. */
export const deltaMirror = parameters => mirror(parameters, 1);
/** Opposite-kind strike with equal risk-neutral terminal ITM probability. */
export const probabilityMirror = parameters => mirror(parameters, -1);
