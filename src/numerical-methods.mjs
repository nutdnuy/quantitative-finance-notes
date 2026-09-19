import { bsValue } from './black-scholes.mjs';
import { normalGenerator } from './math.mjs';

const DEFAULTS = { S: 100, K: 100, r: .03, sigma: .2, T: 1, kind: 'call' };
const WEIGHT_TOLERANCE = 1e-12;

function contract(parameters) {
  const p = Object.fromEntries(Object.entries(DEFAULTS).map(([key, fallback]) => [key, parameters[key] === undefined ? fallback : parameters[key]]));
  // Reuse the benchmark's contract and floating-point range validation.
  const benchmark = bsValue({ ...p, tau: p.T });
  const discount = Math.exp(-p.r * p.T);
  if (!Number.isFinite(discount) || discount <= 0) throw new RangeError('discount factor เกินขอบเขตตัวเลขที่คำนวณได้');
  return { ...p, discount, benchmark: benchmark.price };
}

function integer(value, name, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) throw new RangeError(`${name} ต้องเป็นจำนวนเต็ม ${minimum} ถึง ${maximum}`);
}

/** IID terminal samples under risk-neutral GBM; no time discretization or antithetics.
 * The interval is an approximate 95% normal interval for sampling error only.
 * Welford uses sample variance (N - 1). A zero sample SE need not mean zero risk.
 */
export function monteCarloPrice(parameters = {}) {
  const { S, K, r, sigma, T, kind, discount, benchmark } = contract(parameters);
  const { samples = 10000, seed = 73 } = parameters;
  integer(samples, 'samples', 2, 1000000);
  integer(seed, 'seed', 0, 0xffffffff);
  const normal = normalGenerator(seed), sign = kind === 'call' ? 1 : -1;
  const drift = T === 0 ? 0 : (r - .5 * sigma ** 2) * T, scale = sigma * Math.sqrt(T);
  if (!Number.isFinite(drift) || !Number.isFinite(scale)) throw new RangeError('พารามิเตอร์ GBM เกินขอบเขตตัวเลขที่คำนวณได้');
  const targets = new Set([samples]);
  for (let exponent = .5; exponent <= Math.log10(samples); exponent += .125) targets.add(Math.max(2, Math.round(10 ** exponent)));
  let price = 0, m2 = 0, se = 0;
  const checkpoints = [], terminalPreview = [];
  for (let n = 1; n <= samples; n++) {
    const z = normal();
    const terminal = T === 0 ? S : S === 0 ? 0 : S * Math.exp(drift + scale * z);
    const payoff = Math.max(sign * (terminal - K), 0), value = discount * payoff;
    const difference = value - price;
    price += difference / n;
    m2 += difference * (value - price);
    if (![terminal, value, price, m2].every(Number.isFinite)) throw new RangeError('ผลจำลอง GBM เกินขอบเขตตัวเลขที่คำนวณได้');
    if (n <= 200) terminalPreview.push({ n, S: terminal, payoff, discountedPayoff: value });
    if (targets.has(n)) {
      se = Math.sqrt(Math.max(0, m2) / (n - 1) / n);
      checkpoints.push({ n, price, se, ciLow: price - 1.96 * se, ciHigh: price + 1.96 * se });
    }
  }
  return { S, K, r, sigma, T, kind, samples, seed, price, se, ciLow: price - 1.96 * se, ciHigh: price + 1.96 * se, benchmark, checkpoints, terminalPreview };
}

function interpolate(values, S, dS) {
  const index = Math.min(values.length - 2, Math.floor(S / dS));
  const fraction = (S - index * dS) / dS;
  return values[index] * (1 - fraction) + values[index + 1] * fraction;
}

/** European explicit finite differences on S_i=i*dS and tau=T-t.
 * Stability reports a sufficient nonnegative-coefficient condition, not a
 * necessary stability theorem. A negative spatial rate cannot be fixed by dt.
 * The finite Smax boundary is asymptotic: passing this check does not bound
 * domain truncation or discretization error. No unstable time march is run.
 * Prices and interior central-difference Greeks are linearly interpolated;
 * Greeks are null within one cell of the spatial boundaries. Theta is per year
 * of calendar time, from the final two tau layers, so its sign reverses tau.
 * At expiry or with a zero PDE operator (r=sigma=0), use the exact payoff and
 * its derivatives instead: interpolation must not smooth an unchanged kink.
 */
export function explicitFiniteDifference(parameters = {}) {
  const { S, K, r, sigma, T, kind, discount, benchmark } = contract(parameters);
  const { spaceSteps = 80, timeSteps = 1000, Smax = 400 } = parameters;
  integer(spaceSteps, 'spaceSteps', 4, 1000);
  integer(timeSteps, 'timeSteps', 1, 200000);
  if (!Number.isFinite(Smax) || Smax <= Math.max(K, K * discount)) throw new RangeError('Smax ต้องมากกว่า K และ K exp(−rT)');
  if (S > Smax) throw new RangeError('S ต้องอยู่ในช่วง 0 ถึง Smax');
  if (spaceSteps * timeSteps > 20000000) throw new RangeError('กริดเกินขอบเขตงาน 20,000,000 จุดเวลา–ราคา');
  const dt = T / timeSteps, dS = Smax / spaceSteps;
  if (T > 0 && dt === 0) throw new RangeError('ระยะเวลาแต่ละ step เล็กเกินขอบเขตตัวเลขที่คำนวณได้');
  if (!Number.isFinite(dS ** 2) || dS ** 2 <= 0 || !Number.isFinite(sigma ** 2 * spaceSteps ** 2)) throw new RangeError('ระยะกริดหรือ volatility เกินขอบเขตตัวเลขที่คำนวณได้');
  const coefficients = [], negativeSpatialIndices = [];
  let minWeight = Infinity, maxDecayRate = 0;
  for (let i = 1; i < spaceSteps; i++) {
    const diffusion = sigma ** 2 * i ** 2, drift = r * i;
    const leftRate = .5 * (diffusion - drift), rightRate = .5 * (diffusion + drift);
    // Check the rates separately: a tiny dt must not mask a drift sign failure.
    if (leftRate < -WEIGHT_TOLERANCE || rightRate < -WEIGHT_TOLERANCE) negativeSpatialIndices.push(i);
    const a = dt * leftRate, b = 1 - dt * (diffusion + r), c = dt * rightRate;
    if (![leftRate, rightRate, a, b, c, diffusion + r].every(Number.isFinite)) throw new RangeError('สัมประสิทธิ์กริดเกินขอบเขตตัวเลขที่คำนวณได้');
    coefficients.push({ i, a, b, c, sum: a + b + c });
    minWeight = Math.min(minWeight, a, b, c);
    maxDecayRate = Math.max(maxDecayRate, diffusion + r);
  }
  const spatialNonnegative = negativeSpatialIndices.length === 0;
  const timeNonnegative = dt * maxDecayRate <= 1 + WEIGHT_TOLERANCE;
  const requiredTimeSteps = T === 0 ? 0 : spatialNonnegative ? Math.max(1, Math.ceil(T * maxDecayRate)) : null;
  const stable = T === 0 || (spatialNonnegative && timeNonnegative && minWeight >= -WEIGHT_TOLERANCE);
  const check = { spatialNonnegative, timeNonnegative, rowSum: 1 - r * dt, negativeSpatialIndices, tolerance: WEIGHT_TOLERANCE, maxDecayRate };
  const base = { S, K, r, sigma, T, kind, spaceSteps, timeSteps, Smax, benchmark, stable, minWeight, dt, dS, requiredTimeSteps, coefficients, check };
  if (!stable) return { ...base, price: null, values: [], delta: null, gamma: null, theta: null, reason: spatialNonnegative ? 'time-step' : 'spatial-drift' };

  const sign = kind === 'call' ? 1 : -1;
  let current = Float64Array.from({ length: spaceSteps + 1 }, (_, i) => Math.max(sign * (i * dS - K), 0));
  let previous = current;
  if (T > 0) {
    let next = new Float64Array(spaceSteps + 1);
    for (let step = 1; step <= timeSteps; step++) {
      const tau = step === timeSteps ? T : step * dt, discountedStrike = K * Math.exp(-r * tau);
      next[0] = kind === 'call' ? 0 : discountedStrike;
      next[spaceSteps] = kind === 'call' ? Smax - discountedStrike : 0;
      for (const { i, a, b, c } of coefficients) next[i] = a * current[i - 1] + b * current[i] + c * current[i + 1];
      previous = current;
      current = next;
      next = previous;
    }
  }
  if (!current.every(Number.isFinite)) throw new RangeError('ผล finite difference เกินขอบเขตตัวเลขที่คำนวณได้');
  const values = Array.from(current, (value, i) => ({ S: i * dS, value, exact: bsValue({ S: i * dS, K, r, sigma, tau: T, kind }).price }));
  let price = interpolate(current, S, dS), delta = null, gamma = null, theta = null;
  if (T === 0 || (sigma === 0 && r === 0)) {
    const exactLimit = bsValue({ S, K, r, sigma, tau: T, kind });
    price = exactLimit.price; delta = exactLimit.delta; gamma = exactLimit.gamma;
    theta = T === 0 ? null : 0;
  } else {
    theta = (interpolate(previous, S, dS) - price) / dt;
    if (S >= dS && S <= Smax - dS) {
      const deltaGrid = new Float64Array(spaceSteps + 1), gammaGrid = new Float64Array(spaceSteps + 1);
      for (let i = 1; i < spaceSteps; i++) {
        deltaGrid[i] = (current[i + 1] - current[i - 1]) / (2 * dS);
        gammaGrid[i] = (current[i + 1] - 2 * current[i] + current[i - 1]) / dS ** 2;
      }
      delta = interpolate(deltaGrid, S, dS); gamma = interpolate(gammaGrid, S, dS);
    }
  }
  return { ...base, price, values, delta, gamma, theta, reason: null };
}
