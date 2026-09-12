const SQRT_PI = Math.sqrt(Math.PI);

/** Real erfc, independently implemented from mathematical identities, not copied code.
 * Near zero: positive-term erf series, NIST DLMF 7.6.2, https://dlmf.nist.gov/7.6.E2
 * In the tail: erfc continued fraction, NIST DLMF 7.9.2, https://dlmf.nist.gov/7.9.E2
 * Evaluating the tail directly avoids the subtraction 1 - erf(x) there.
 */
export function erfc(x) {
  if (typeof x !== 'number' || Number.isNaN(x)) throw new RangeError('erfc ต้องรับตัวเลข');
  if (x === Infinity) return 0;
  if (x === -Infinity) return 2;
  if (x < 0) return 2 - erfc(-x);
  if (x === 0) return 1;
  if (x < 1.5) {
    let term = x, sum = x;
    for (let n = 1; n <= 100; n++) {
      term *= 2 * x * x / (2 * n + 1);
      sum += term;
      if (term <= Math.abs(sum) * Number.EPSILON) break;
    }
    return 1 - 2 * Math.exp(-x * x) * sum / SQRT_PI;
  }
  if (x > 28) return 0; // The positive result is below the representable double range.
  let previous;
  for (const depth of [16, 32, 64, 128, 256]) {
    let denominator = 2 * x * x + 1 + 4 * depth;
    for (let k = depth - 1; k >= 0; k--) denominator = 2 * x * x + 1 + 4 * k - (2 * k + 1) * (2 * k + 2) / denominator;
    const result = Math.exp(-x * x) * (2 * x / denominator) / SQRT_PI;
    if (previous !== undefined && Math.abs(result - previous) <= 4 * Number.EPSILON * Math.abs(result)) return result;
    previous = result;
  }
  return previous;
}

function scaleOf({ y, c, tau }) {
  if (!Number.isFinite(y)) throw new RangeError('จุดเริ่มต้น y ต้องเป็นจำนวนที่มีค่าจำกัด');
  if (!Number.isFinite(c) || c <= 0) throw new RangeError('c ต้องเป็นจำนวนบวกที่มีค่าจำกัด');
  if (!Number.isFinite(tau) || tau <= 0) throw new RangeError('τ ต้องมากกว่า 0; เมื่อ τ = 0 ใช้ Dirac delta ไม่ใช่ความหนาแน่นแบบฟังก์ชันธรรมดา');
  const scale = c * Math.sqrt(tau);
  if (!Number.isFinite(scale) || scale <= 0 || !Number.isFinite(1 / scale)) throw new RangeError('ขนาดการกระจายเกินขอบเขตตัวเลขที่คำนวณได้');
  return scale;
}

/** Heat kernel: mean y, variance 2*c²*tau, standard deviation c*sqrt(2*tau). */
export function transitionDensity({ y = 1, z, c = 1, tau = 1 } = {}) {
  const scale = scaleOf({ y, c, tau });
  if (!Number.isFinite(z)) throw new RangeError('ตำแหน่งปลายทาง z ต้องเป็นจำนวนที่มีค่าจำกัด');
  const standardized = (z - y) / scale / 2;
  return Math.exp(-standardized * standardized) / scale / (2 * SQRT_PI);
}

export function transitionCdf({ y = 1, z, c = 1, tau = 1 } = {}) {
  const scale = scaleOf({ y, c, tau });
  if (typeof z !== 'number' || Number.isNaN(z)) throw new RangeError('ตำแหน่งปลายทาง z ต้องเป็นตัวเลข');
  return .5 * erfc(-(z - y) / scale / 2);
}

/** Probability on [a,b]; a=b has probability zero, but a>b is invalid.
 * Differences of survival tails avoid subtracting two CDF values close to one.
 */
export function intervalProbability({ y = 1, c = 1, tau = 1, a = 0, b = 2 } = {}) {
  const scale = scaleOf({ y, c, tau });
  if (typeof a !== 'number' || typeof b !== 'number' || Number.isNaN(a) || Number.isNaN(b) || a > b) throw new RangeError('ขอบเขตต้องเป็นตัวเลขและ a ต้องไม่มากกว่า b');
  if (a === b) return 0;
  const left = (a - y) / scale / 2, right = (b - y) / scale / 2;
  if (left >= 0) return .5 * (erfc(left) - erfc(right));
  if (right <= 0) return .5 * (erfc(-right) - erfc(-left));
  return .5 * (1 - erfc(-left)) + .5 * (1 - erfc(right));
}

/** Exact recurrence for iid steps (-h, 0, h) with probabilities (alpha, 1-2alpha, alpha).
 * Returns every point of the finite support in ascending order, including zero masses.
 */
export function trinomialDistribution({ alpha = .2, steps = 2, stepSize = 1, initial = 0 } = {}) {
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > .5) throw new RangeError('α ต้องอยู่ระหว่าง 0 และ 0.5');
  if (!Number.isInteger(steps) || steps < 0 || steps > 500) throw new RangeError('N ต้องเป็นจำนวนเต็มตั้งแต่ 0 ถึง 500');
  if (!Number.isFinite(stepSize) || stepSize <= 0) throw new RangeError('ขนาดก้าว h ต้องเป็นจำนวนบวกที่มีค่าจำกัด');
  if (!Number.isFinite(initial) || !Number.isFinite(initial + steps * stepSize) || !Number.isFinite(initial - steps * stepSize)) throw new RangeError('ตำแหน่งในแบบจำลองต้องมีค่าจำกัด');
  let masses = [1];
  for (let n = 0; n < steps; n++) {
    const next = Array(masses.length + 2).fill(0);
    for (let j = 0; j < masses.length; j++) {
      next[j] += alpha * masses[j];
      next[j + 1] += (1 - 2 * alpha) * masses[j];
      next[j + 2] += alpha * masses[j];
    }
    masses = next;
  }
  return masses.map((mass, j) => ({ x: initial + (j - steps) * stepSize, mass }));
}
