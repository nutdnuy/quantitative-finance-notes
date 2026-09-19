import { normalGenerator } from './math.mjs';
import { bsValue } from './black-scholes.mjs';

const positive = value => Number.isFinite(value) && value > 0;

/** Fixed-strike calls on equally spaced observations. The arithmetic average
 * excludes S0; an upper barrier is monitored at S0 and every later observation.
 * Touching H counts as a hit. Knock-out and knock-in both have zero rebate.
 */
export function pathPayoffs({ prices, K = 100, H = 130 } = {}) {
  if (!Array.isArray(prices) || prices.length < 2 || !prices.every(positive)) throw new RangeError('prices ต้องมีราคาบวกที่มีค่าจำกัดอย่างน้อย 2 ค่า');
  if (!positive(K) || !positive(H)) throw new RangeError('K และ H ต้องเป็นจำนวนบวกที่มีค่าจำกัด');
  const terminal = prices.at(-1), average = prices.slice(1).reduce((sum, value) => sum + value / (prices.length - 1), 0);
  const hit = prices.some(value => value >= H), vanilla = Math.max(terminal - K, 0), asian = Math.max(average - K, 0);
  return { terminal, average, hit, vanilla, asian, outDiscrete: hit ? 0 : vanilla, inDiscrete: hit ? vanilla : 0 };
}

/** Conditional probability of staying strictly below H between two exact GBM
 * endpoints. Drift cancels after conditioning on the log-price endpoints.
 * sigma=0 gives a deterministic, monotone interval; dt=0 has no interior.
 */
export function bridgeSurvival({ start, end, H, sigma, dt } = {}) {
  if (![start, end, H].every(positive) || !Number.isFinite(sigma) || sigma < 0 || !Number.isFinite(dt) || dt < 0) throw new RangeError('พารามิเตอร์ Brownian bridge ไม่ถูกต้อง');
  if (start >= H || end >= H) return 0;
  if (sigma === 0 || dt === 0) return 1;
  const variance = sigma * sigma * dt;
  if (!Number.isFinite(variance)) throw new RangeError('ความแปรปรวนเกินขอบเขตตัวเลขที่คำนวณได้');
  // expm1 avoids cancellation when either endpoint is very close to H.
  return -Math.expm1(-2 * Math.log1p((H - start) / start) * Math.log1p((H - end) / end) / variance);
}

function moments() {
  let count = 0, mean = 0, m2 = 0;
  return {
    add(value) { count++; const delta = value - mean; mean += delta / count; m2 += delta * (value - mean); },
    result() {
      const sd = Math.sqrt(Math.max(0, m2 / (count - 1))), se = sd / Math.sqrt(count);
      return { count, mean, sd, se, low: mean - 1.96 * se, high: mean + 1.96 * se };
    }
  };
}

/** IID pseudorandom risk-neutral exact-GBM paths. The same paths price all
 * contracts. Continuous-barrier payoffs use conditional survival weights,
 * not extra hit draws; their standard errors use those weighted observations.
 * Asian fixings stay discrete in both barrier modes. No antithetic pairing.
 */
export function simulateExotics({ S0 = 100, K = 100, H = 130, r = .03, sigma = .2, T = 1, steps = 12, count = 12000, seed = 2535 } = {}) {
  if (![S0, K, H].every(positive) || !Number.isFinite(r) || !Number.isFinite(sigma) || sigma < 0 || !Number.isFinite(T) || T < 0) throw new RangeError('พารามิเตอร์สัญญาหรือแบบจำลองไม่ถูกต้อง');
  if (!Number.isInteger(steps) || steps < 1 || steps > 1024 || !Number.isInteger(count) || count < 2 || count > 100000 || steps * count > 10000000) throw new RangeError('จำนวนเส้นทางหรือช่วงเวลาเกินขอบเขตการทดลอง');
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) throw new RangeError('seed ต้องเป็นจำนวนเต็มตั้งแต่ 0 ถึง 4294967295');
  const dt = T / steps, variance = sigma * sigma * dt, drift = (r - .5 * sigma * sigma) * dt, scale = sigma * Math.sqrt(dt), discount = Math.exp(-r * T);
  if (![variance, drift, scale, discount].every(Number.isFinite) || discount <= 0) throw new RangeError('พารามิเตอร์เกินขอบเขตตัวเลขที่คำนวณได้');
  const random = normalGenerator(seed), keys = ['vanilla', 'asian', 'outDiscrete', 'inDiscrete', 'outContinuous', 'inContinuous', 'discountedStock'];
  const accumulators = Object.fromEntries(keys.map(key => [key, moments()])), sampledPaths = [];
  let hitCount = 0, maxParityError = 0, maxBridgeExcess = 0;
  for (let n = 0; n < count; n++) {
    let price = S0, average = 0, hit = S0 >= H, survival = hit ? 0 : 1;
    const visible = n < 16 ? [S0] : null;
    for (let j = 1; j <= steps; j++) {
      const previous = price;
      price *= Math.exp(drift + scale * random());
      if (!positive(price)) throw new RangeError('ราคาจำลองเกินขอบเขตตัวเลขที่คำนวณได้');
      average += price / steps;
      if (price >= H) hit = true;
      if (survival > 0) survival *= bridgeSurvival({ start: previous, end: price, H, sigma, dt });
      if (visible) visible.push(price);
    }
    const vanilla = discount * Math.max(price - K, 0), outDiscrete = hit ? 0 : vanilla, outContinuous = vanilla * survival;
    const values = { vanilla, asian: discount * Math.max(average - K, 0), outDiscrete, inDiscrete: vanilla - outDiscrete, outContinuous, inContinuous: vanilla - outContinuous, discountedStock: discount * price };
    if (!Object.values(values).every(Number.isFinite)) throw new RangeError('Payoff เกินขอบเขตตัวเลขที่คำนวณได้');
    for (const key of keys) accumulators[key].add(values[key]);
    maxParityError = Math.max(maxParityError, Math.abs(values.inDiscrete + outDiscrete - vanilla), Math.abs(values.inContinuous + outContinuous - vanilla));
    maxBridgeExcess = Math.max(maxBridgeExcess, outContinuous - outDiscrete);
    hitCount += Number(hit);
    if (visible) sampledPaths.push(visible);
  }
  const estimates = Object.fromEntries(keys.map(key => [key, accumulators[key].result()]));
  if (!Object.values(estimates).every(row => Object.values(row).every(Number.isFinite))) throw new RangeError('สถิติเกินขอบเขตตัวเลขที่คำนวณได้');
  return { parameters: { S0, K, H, r, sigma, T, steps, count, seed }, estimates, bsPrice: bsValue({ S: S0, K, r, sigma, tau: T }).price, maxParityError, maxBridgeExcess, discreteHitRate: hitCount / count, sampledPaths };
}
