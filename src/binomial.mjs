/** European options in a recombining binomial model with fixed per-step factors.
 * r is an annual rate in decimal units; the per-step bank factor is 1 + r * T / steps.
 * tree[n][j] is the node after n steps and j up moves. Cash is held at that node,
 * before the next step accrues interest. Physical probabilities are not inputs.
 */
export function binomialTree({ S0 = 100, K = 100, u = 1.1, d = 0.9, r = 0, T = 1, steps = 2, type = 'call' } = {}) {
  for (const [name, value] of Object.entries({ S0, K, u, d, T })) {
    if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} ต้องเป็นจำนวนบวกที่มีค่าจำกัด`);
  }
  if (!Number.isFinite(r)) throw new RangeError('r ต้องเป็นจำนวนที่มีค่าจำกัด');
  if (!Number.isInteger(steps) || steps < 1 || steps > 200) throw new RangeError('steps ต้องเป็นจำนวนเต็มตั้งแต่ 1 ถึง 200');
  if (type !== 'call' && type !== 'put') throw new RangeError('type ต้องเป็น call หรือ put');
  const dt = T / steps, R = 1 + r * dt;
  if (!Number.isFinite(R) || !(d < R && R < u)) {
    throw new RangeError('ต้องมี d < R < u โดย R = 1 + rΔt จึงจะใช้ราคาแบบไม่มีอาร์บิทราจนี้ได้');
  }
  const q = (R - d) / (u - d);
  if (!(q > 0 && q < 1)) throw new RangeError('ค่าที่ใส่ทำให้คำนวณ q ไม่ได้อย่างแม่นยำเพียงพอ');
  const tree = Array.from({ length: steps + 1 }, (_, n) => Array.from({ length: n + 1 }, (_, j) => {
    const stock = S0 * u ** j * d ** (n - j);
    if (!Number.isFinite(stock) || stock <= 0) throw new RangeError('ราคาหุ้นในต้นไม้เกินขอบเขตตัวเลขที่คำนวณได้');
    return { step: n, upMoves: j, stock, value: null, delta: null, cash: null };
  }));
  for (const node of tree[steps]) node.value = Math.max(type === 'call' ? node.stock - K : K - node.stock, 0);
  for (let n = steps - 1; n >= 0; n--) {
    for (let j = 0; j <= n; j++) {
      const node = tree[n][j], down = tree[n + 1][j], up = tree[n + 1][j + 1];
      node.value = (q * up.value + (1 - q) * down.value) / R;
      node.delta = (up.value - down.value) / (up.stock - down.stock);
      node.cash = (down.value - node.delta * down.stock) / R;
      if (![node.value, node.delta, node.cash].every(Number.isFinite)) throw new RangeError('มูลค่าพอร์ตเกินขอบเขตตัวเลขที่คำนวณได้');
    }
  }
  const { value: price, delta, cash } = tree[0][0];
  return { S0, K, u, d, r, T, steps, type, dt, R, q, price, delta, cash, tree };
}

/** Discount an expected terminal payoff using a constant up probability p.
 * Calling with physical p is a comparison statistic, not a no-arbitrage price.
 * Each step is discounted separately to avoid unnecessary powers of R.
 */
export function discountedExpectedPayoff(model, p) {
  if (!Number.isFinite(p) || p < 0 || p > 1) throw new RangeError('p ต้องอยู่ระหว่าง 0 และ 1');
  let values = model.tree[model.steps].map(node => node.value);
  while (values.length > 1) {
    values = values.slice(0, -1).map((down, j) => ((1 - p) * down + p * values[j + 1]) / model.R);
  }
  if (!Number.isFinite(values[0])) throw new RangeError('ค่าคาดหมายเกินขอบเขตตัวเลขที่คำนวณได้');
  return values[0];
}
