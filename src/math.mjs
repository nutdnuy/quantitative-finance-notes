export const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
export function stdev(a) {
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
}
export function jensen(spread, strike, center = 100) {
  const low = center - spread, high = center + spread;
  const lowPay = Math.max(low - strike, 0), highPay = Math.max(high - strike, 0);
  return { low, high, lowPay, highPay, expected: (lowPay + highPay) / 2, atMean: Math.max(center - strike, 0) };
}
export function normalGenerator(seed) {
  let state = seed >>> 0;
  function uniform() {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return (state + 0.5) / 4294967296;
  }
  return () => Math.sqrt(-2 * Math.log(uniform())) * Math.cos(2 * Math.PI * uniform());
}
export function simulate({ mu, sigma, seed, count = 40, steps = 252, years = 1, initial = 120 }) {
  const normal = normalGenerator(seed), dt = years / steps;
  return Array.from({ length: count }, () => {
    const path = [initial];
    for (let i = 0; i < steps; i++) path.push(path.at(-1) * Math.exp((mu - 0.5 * sigma ** 2) * dt + sigma * Math.sqrt(dt) * normal()));
    return path;
  });
}
export function theoretical(mu, sigma, t = 1, initial = 120) {
  const middle = initial * Math.exp((mu - 0.5 * sigma ** 2) * t);
  return { expected: initial * Math.exp(mu * t), median: middle, q05: middle * Math.exp(-1.6448536269514722 * sigma * Math.sqrt(t)), q95: middle * Math.exp(1.6448536269514722 * sigma * Math.sqrt(t)) };
}
export function rollingExample(window) {
  const returns = Array.from({ length: 100 }, (_, i) => i === 34 ? -0.1 : (i % 2 ? 0.003 : -0.003));
  const rolling = returns.map((_, i) => i + 1 < window ? null : stdev(returns.slice(i - window + 1, i + 1)) * Math.sqrt(252) * 100);
  return { returns, rolling, exitDay: 35 + window };
}
export function normalPdf(x, m = 0, sd = 1) {
  return Math.exp(-0.5 * ((x - m) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));
}
export function histogram(values, bins = 8, lo = Math.min(...values), hi = Math.max(...values)) {
  const width = (hi - lo) / bins;
  const counts = Array(bins).fill(0);
  for (const v of values) if (v >= lo && v <= hi) counts[Math.min(bins - 1, Math.floor((v - lo) / width))]++;
  return counts.map((count, i) => ({ x: lo + i * width, width, count, density: count / (values.length * width) }));
}
export function eulerPath({ mu = .15, sigma = .25, dt = .01, count = 100, initial = 100, seed = 73 } = {}) {
  const random = normalGenerator(seed), prices = [initial], terms = [];
  for (let i = 0; i < count; i++) {
    const phi = random(), current = prices.at(-1), drift = mu * current * dt, shock = sigma * current * Math.sqrt(dt) * phi;
    terms.push({ phi, current, drift, shock, next: current + drift + shock });
    prices.push(current + drift + shock);
  }
  return { prices, terms };
}
export function nestedWiener(seed = 73, steps = 64) {
  const finest = 1024, random = normalGenerator(seed), fine = [0];
  for (let i = 0; i < finest; i++) fine.push(fine.at(-1) + random() / Math.sqrt(finest));
  const stride = finest / steps;
  const coarse = Array.from({ length: steps + 1 }, (_, i) => fine[i * stride]);
  const increments = coarse.slice(1).map((v, i) => v - coarse[i]);
  return { fine, coarse, increments, dt: 1 / steps, incrementSD: 1 / Math.sqrt(steps) };
}
