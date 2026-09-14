import { erfc } from './transition-density.mjs';
import { nestedBrownian, gbmFromIncrements } from './stochastic-calculus.mjs';

const normalCdf = x => .5 * erfc(-x / Math.SQRT2);
const normalPdf = x => Math.exp(-.5 * x * x) / Math.sqrt(2 * Math.PI);

function validate({ S, K, r, sigma, tau, kind }) {
  if (!Number.isFinite(S) || S < 0) throw new RangeError('S ต้องเป็นจำนวนไม่ติดลบที่มีค่าจำกัด');
  if (!Number.isFinite(K) || K <= 0) throw new RangeError('K ต้องเป็นจำนวนบวกที่มีค่าจำกัด');
  if (!Number.isFinite(r)) throw new RangeError('r ต้องเป็นจำนวนที่มีค่าจำกัด');
  if (!Number.isFinite(sigma) || sigma < 0) throw new RangeError('σ ต้องเป็นจำนวนไม่ติดลบที่มีค่าจำกัด');
  if (!Number.isFinite(tau) || tau < 0) throw new RangeError('τ ต้องเป็นจำนวนไม่ติดลบที่มีค่าจำกัด');
  if (!['call', 'put'].includes(kind)) throw new RangeError('kind ต้องเป็น call หรือ put');
}

/** European Black–Scholes with no dividends and continuously compounded r.
 * Vega is per unit sigma (divide by 100 for one percentage point).
 * null denotes an undefined derivative at a payoff kink; it is never a zero.
 * At sigma=0, vega is the right-hand derivative because sigma cannot be negative.
 */
export function bsValue({ S = 100, K = 100, r = .05, sigma = .2, tau = 1, kind = 'call' } = {}) {
  validate({ S, K, r, sigma, tau, kind });
  const discountedStrike = K * Math.exp(-r * tau), sign = kind === 'call' ? 1 : -1;
  if (!Number.isFinite(discountedStrike) || discountedStrike <= 0) throw new RangeError('มูลค่าปัจจุบันของ K เกินขอบเขตตัวเลขที่คำนวณได้');
  const payoff = Math.max(sign * (S - K), 0);
  let price, delta, gamma, vega, d1 = null, d2 = null;
  if (tau === 0 || sigma === 0 || S === 0) {
    const boundary = tau === 0 ? K : discountedStrike, difference = S - boundary;
    price = Math.max(sign * difference, 0);
    delta = difference === 0 ? null : (kind === 'call' ? Number(difference > 0) : -Number(difference < 0));
    gamma = difference === 0 ? null : 0;
    vega = tau > 0 && sigma === 0 && difference === 0 ? S * normalPdf(0) * Math.sqrt(tau) : 0;
  } else {
    const rootTime = Math.sqrt(tau), scale = sigma * rootTime;
    if (!Number.isFinite(scale) || scale <= 0) throw new RangeError('σ√τ เกินขอบเขตตัวเลขที่คำนวณได้');
    d1 = (Math.log(S) - Math.log(K) + r * tau) / scale + .5 * scale;
    d2 = d1 - scale;
    // Evaluate the out-of-the-money option first, then use parity for the other.
    // This avoids subtracting two large nearly equal in-the-money terms.
    let call, put;
    if (S >= discountedStrike) {
      put = Math.max(0, discountedStrike * normalCdf(-d2) - S * normalCdf(-d1));
      call = S - discountedStrike + put;
    } else {
      call = Math.max(0, S * normalCdf(d1) - discountedStrike * normalCdf(d2));
      put = discountedStrike - S + call;
    }
    price = kind === 'call' ? call : put;
    delta = kind === 'call' ? normalCdf(d1) : -normalCdf(-d1);
    gamma = normalPdf(d1) / S / scale;
    vega = S * normalPdf(d1) * rootTime;
  }
  const cash = delta === null ? null : price - delta * S;
  if (![price, delta, gamma, vega, d1, d2, cash].every(value => value === null || Number.isFinite(value))) throw new RangeError('ผลลัพธ์ Black–Scholes เกินขอบเขตตัวเลขที่คำนวณได้');
  return { S, K, r, sigma, tau, kind, price, delta, gamma, vega, d1, d2, cash, discountedStrike, payoff };
}

/** A self-financing portfolio replicating one long option at discrete dates.
 * The bank account earns r between dates, then funds every share adjustment.
 * At expiry we value/liquidate the shares; there is no undefined expiry rebalance.
 */
export function deltaHedgeFromPath({ prices, K = 100, r = .05, sigma = .2, T = 1, kind = 'call' } = {}) {
  if (!Array.isArray(prices) || prices.length < 2 || prices.length > 65537 || !prices.every(S => Number.isFinite(S) && S > 0)) throw new RangeError('prices ต้องมีราคาบวกที่มีค่าจำกัด 2 ถึง 65537 ค่า');
  if (!Number.isFinite(T) || T <= 0) throw new RangeError('T ต้องเป็นจำนวนบวกที่มีค่าจำกัด');
  if (!Number.isFinite(sigma) || sigma <= 0) throw new RangeError('การทดลอง hedge ต้องมี σ > 0');
  const steps = prices.length - 1, dt = T / steps, growth = Math.exp(r * dt);
  const initial = bsValue({ S: prices[0], K, r, sigma, tau: T, kind });
  const records = [{ step: 0, t: 0, S: prices[0], option: initial.price, wealth: initial.price, delta: initial.delta, cash: initial.cash, cashBeforeRebalance: initial.cash, rebalanceCost: 0, fundingError: 0 }];
  for (let i = 1; i <= steps; i++) {
    const previous = records.at(-1), S = prices[i], cashBeforeRebalance = previous.cash * growth;
    const wealth = previous.delta * S + cashBeforeRebalance;
    const option = bsValue({ S, K, r, sigma, tau: i === steps ? 0 : T - i * dt, kind });
    const delta = i === steps ? previous.delta : option.delta;
    const rebalanceCost = (delta - previous.delta) * S;
    const cash = cashBeforeRebalance - rebalanceCost;
    const fundingError = delta * S + cash - wealth;
    if (![wealth, cash, delta, rebalanceCost, cashBeforeRebalance, fundingError].every(Number.isFinite)) throw new RangeError('มูลค่า hedge เกินขอบเขตตัวเลขที่คำนวณได้');
    records.push({ step: i, t: i * dt, S, option: option.price, wealth, delta, cash, cashBeforeRebalance, rebalanceCost, fundingError });
  }
  const terminal = records.at(-1), payoff = terminal.option;
  return { S0: prices[0], K, r, sigma, T, kind, steps, dt, initialValue: initial.price, initialDelta: initial.delta, initialCash: initial.cash, records, terminalStock: terminal.S, terminalWealth: terminal.wealth, payoff, hedgeError: terminal.wealth - payoff, maxFundingError: Math.max(...records.map(row => Math.abs(row.fundingError))) };
}

/** Nested exact-GBM paths keep all common grid values when steps changes. */
export function discreteDeltaHedge({ S0 = 100, K = 100, r = .05, mu = .08, sigma = .2, T = 1, kind = 'call', seed = 73, steps = 64, finestSteps = 256 } = {}) {
  const brownian = nestedBrownian({ seed, steps, finestSteps, T });
  const stock = gbmFromIncrements({ increments: brownian.increments, S0, mu, sigma, T });
  return { ...deltaHedgeFromPath({ prices: stock.exact, K, r, sigma, T, kind }), mu, seed, finestSteps, brownianTerminal: brownian.terminal };
}
