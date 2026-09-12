import { normalGenerator } from './math.mjs';

function requireSeed(seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new RangeError('seed ต้องเป็นจำนวนเต็มตั้งแต่ 0 ถึง 4294967295');
}
function requireTime(T) {
  if (!Number.isFinite(T) || T <= 0) throw new RangeError('เวลารวม T ต้องเป็นจำนวนบวกที่มีค่าจำกัด');
}
function requireIncrements(increments) {
  if (!Array.isArray(increments) || increments.length < 1 || increments.length > 65536 || !increments.every(Number.isFinite)) throw new RangeError('increments ต้องเป็นอาร์เรย์ตัวเลขที่มีค่าจำกัด 1 ถึง 65536 ค่า');
}

/** Left-endpoint sums for a path beginning at zero. The finite telescoping identity
 * is exact in real arithmetic; itoLimit uses T instead of the finite squared sum.
 */
export function brownianDiagnostics({ increments, T = 1 } = {}) {
  requireTime(T); requireIncrements(increments);
  const steps = increments.length, dt = T / steps, path = [0], qvPath = [0], leftIntegralPath = [0];
  for (const increment of increments) {
    leftIntegralPath.push(leftIntegralPath.at(-1) + path.at(-1) * increment);
    path.push(path.at(-1) + increment);
    qvPath.push(qvPath.at(-1) + increment * increment);
  }
  if (![...path, ...qvPath, ...leftIntegralPath].every(Number.isFinite)) throw new RangeError('ผลรวมของเส้นทางเกินขอบเขตตัวเลขที่คำนวณได้');
  const terminal = path.at(-1), qv = qvPath.at(-1), itoLeft = leftIntegralPath.at(-1);
  const finiteIdentity = .5 * (terminal * terminal - qv), itoLimit = .5 * (terminal * terminal - T);
  if (![finiteIdentity, itoLimit].every(Number.isFinite)) throw new RangeError('มูลค่าปลายทางเกินขอบเขตตัวเลขที่คำนวณได้');
  return { steps, T, dt, increments: [...increments], times: Array.from({ length: steps + 1 }, (_, i) => i * dt), path, qvPath, leftIntegralPath, terminal, qv, itoLeft, finiteIdentity, identityError: itoLeft - finiteIdentity, itoLimit, qvRmsTheory: T * Math.sqrt(2 / steps) };
}

/** Every resolution aggregates increments from the same seeded finest grid.
 * This preserves the driving Brownian path when changing N; no fresh shocks are drawn.
 */
export function nestedBrownian({ seed = 73, steps = 256, finestSteps = 4096, T = 1 } = {}) {
  requireSeed(seed); requireTime(T);
  if (!Number.isInteger(finestSteps) || finestSteps < 1 || finestSteps > 65536) throw new RangeError('finestSteps ต้องเป็นจำนวนเต็มตั้งแต่ 1 ถึง 65536');
  if (!Number.isInteger(steps) || steps < 1 || steps > finestSteps || finestSteps % steps !== 0) throw new RangeError('N ต้องเป็นจำนวนเต็มบวกที่หาร finestSteps ลงตัว');
  const random = normalGenerator(seed), scale = Math.sqrt(T / finestSteps), stride = finestSteps / steps;
  if (!Number.isFinite(scale) || scale <= 0) throw new RangeError('ขนาดก้าวเวลาเล็กเกินกว่าที่คำนวณได้');
  const finestIncrements = Array.from({ length: finestSteps }, () => random() * scale), increments = Array(steps).fill(0);
  for (let i = 0; i < finestSteps; i++) increments[Math.floor(i / stride)] += finestIncrements[i];
  return { ...brownianDiagnostics({ increments, T }), seed, finestSteps, finestIncrements };
}

/** Euler and exact GBM driven by precisely the same increments at each grid point.
 * Euler values are deliberately left signed. A nonpositive Euler value is an
 * approximation failure for GBM, not a reason to clamp the simulated value.
 */
export function gbmFromIncrements({ increments, S0 = 100, mu = .1, sigma = .2, T = 1 } = {}) {
  requireTime(T); requireIncrements(increments);
  if (!Number.isFinite(S0) || S0 <= 0) throw new RangeError('S₀ ต้องเป็นจำนวนบวกที่มีค่าจำกัด');
  if (!Number.isFinite(mu)) throw new RangeError('μ ต้องเป็นจำนวนที่มีค่าจำกัด');
  if (!Number.isFinite(sigma) || sigma < 0) throw new RangeError('σ ต้องเป็นจำนวนไม่ติดลบที่มีค่าจำกัด');
  const steps = increments.length, dt = T / steps, exact = [S0], euler = [S0], brownian = [0], nonPositiveEuler = [];
  for (let i = 0; i < steps; i++) {
    brownian.push(brownian.at(-1) + increments[i]);
    exact.push(S0 * Math.exp((mu - .5 * sigma * sigma) * ((i + 1) * dt) + sigma * brownian.at(-1)));
    euler.push(euler.at(-1) * (1 + mu * dt + sigma * increments[i]));
    if (!Number.isFinite(exact.at(-1)) || exact.at(-1) <= 0 || !Number.isFinite(euler.at(-1))) throw new RangeError('ค่าจำลองเกินขอบเขตตัวเลขที่คำนวณได้');
    if (euler.at(-1) <= 0) nonPositiveEuler.push(i + 1);
  }
  return { S0, mu, sigma, T, steps, dt, times: Array.from({ length: steps + 1 }, (_, i) => i * dt), increments: [...increments], brownian, exact, euler, nonPositiveEuler, terminalAbsoluteError: Math.abs(euler.at(-1) - exact.at(-1)) };
}

/** Standard Gaussian shocks; the same seed reuses the same independent z1,z2
 * draws as rho changes. Multiplying both shocks by sqrt(dt) gives increments
 * with variances dt and covariance rho*dt, without changing their correlation.
 */
export function correlatedNormals({ rho = .6, seed = 31415, count = 2048 } = {}) {
  requireSeed(seed);
  if (!Number.isFinite(rho) || rho < -1 || rho > 1) throw new RangeError('ρ ต้องอยู่ระหว่าง −1 และ 1');
  if (!Number.isInteger(count) || count < 2 || count > 100000) throw new RangeError('count ต้องเป็นจำนวนเต็มตั้งแต่ 2 ถึง 100000');
  const random = normalGenerator(seed), orthogonalScale = Math.sqrt((1 - rho) * (1 + rho));
  const pairs = Array.from({ length: count }, () => { const z1 = random(), z2 = random(); return { x: z1, y: rho * z1 + orthogonalScale * z2 }; });
  const meanX = pairs.reduce((sum, pair) => sum + pair.x, 0) / count, meanY = pairs.reduce((sum, pair) => sum + pair.y, 0) / count;
  let sumXX = 0, sumYY = 0, sumXY = 0;
  for (const { x, y } of pairs) { sumXX += (x - meanX) ** 2; sumYY += (y - meanY) ** 2; sumXY += (x - meanX) * (y - meanY); }
  const varianceX = sumXX / (count - 1), varianceY = sumYY / (count - 1), covariance = sumXY / (count - 1);
  return { rho, seed, count, pairs, meanX, meanY, varianceX, varianceY, covariance, sampleCorrelation: covariance / Math.sqrt(varianceX * varianceY) };
}
