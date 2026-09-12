import assert from 'node:assert/strict';
import { binomialTree, discountedExpectedPayoff } from '../src/binomial.mjs';

const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const checks = [];
const day = binomialTree({ u: 1.01, d: .99, steps: 1, T: 1 / 252 });
close(day.price, .5); close(day.q, .5); close(day.delta, .5); close(day.cash, -49.5);
checks.push('One-day 100 → 101 / 99: Call 0.5, delta 0.5 and cash −49.5');
const interestDay = binomialTree({ u: 1.01, d: .99, r: .1, steps: 1, T: 1 / 252 });
close(interestDay.price, .5196350654502228); close(interestDay.R, 1 + .1 / 252);
checks.push('One-day simple-interest convention: r = 10%, dt = 1/252');
const baseline = binomialTree();
close(baseline.price, 5.25); close(baseline.q, .5); close(baseline.delta, .525); close(baseline.cash, -47.25);
baseline.tree[2].forEach((node, i) => { close(node.stock, [81, 99, 121][i]); close(node.value, [0, 0, 21][i]); });
close(baseline.tree[1][0].value, 0); close(baseline.tree[1][1].value, 10.5);
checks.push('Two-step defaults: terminal 121/99/81, mid 10.5/0, root 5.25, delta .525, cash −47.25');

for (const type of ['call', 'put']) for (const steps of [1, 2, 7, 30]) for (const K of [70, 100, 135]) for (const r of [-.05, 0, .075]) {
  const model = binomialTree({ type, steps, K, r });
  for (let n = 0; n < steps; n++) for (let j = 0; j <= n; j++) {
    const node = model.tree[n][j];
    close(node.delta * node.stock + node.cash, node.value, 1e-8);
    for (const next of [model.tree[n + 1][j], model.tree[n + 1][j + 1]]) close(node.delta * next.stock + node.cash * model.R, next.value, 1e-8);
  }
  close(discountedExpectedPayoff(model, model.q), model.price, 1e-8);
}
checks.push('Replication reproduces both next-node option values for Calls/Puts across strikes, steps and rates');

// Explicit terminal binomial sum is independent of the backward tree valuation.
for (const steps of [2, 10, 20]) {
  const model = binomialTree({ steps, r: .05, K: 105 });
  let choose = 1, expectation = 0;
  for (let j = 0; j <= steps; j++) {
    expectation += choose * model.q ** j * (1 - model.q) ** (steps - j) * Math.max(model.S0 * model.u ** j * model.d ** (steps - j) - model.K, 0);
    choose *= (steps - j) / (j + 1);
  }
  close(expectation / model.R ** steps, model.price);
}
checks.push('Discounted terminal binomial sum agrees with backward valuation');
for (const steps of [1, 2, 25]) for (const r of [-.05, 0, .075]) {
  const call = binomialTree({ steps, r }), put = binomialTree({ type: 'put', steps, r });
  close(call.price - put.price, 100 - 100 / call.R ** steps, 1e-8);
}
checks.push('European put-call parity with the per-step bank factor R');
const priceBefore = baseline.price;
close(discountedExpectedPayoff(baseline, .6), 7.56);
close(discountedExpectedPayoff(baseline, .2), .84);
close(discountedExpectedPayoff(baseline, 0), 0);
close(discountedExpectedPayoff(baseline, 1), 21);
close(baseline.price, priceBefore);
checks.push('Changing physical p changes discounted expected payoff and leaves option price unchanged');
for (const invalid of [
  { S0: 0 }, { S0: Infinity }, { S0: NaN }, { K: -1 }, { K: '100' }, { T: 0 }, { T: Infinity },
  { steps: 0 }, { steps: 1.5 }, { steps: 201 }, { steps: NaN }, { r: NaN }, { r: Infinity },
  { u: 0 }, { u: Infinity }, { d: -1 }, { d: NaN }, { u: .9, d: 1.1 }, { u: 1, d: 1 },
  { u: 1 }, { d: 1 }, { r: .3 }, { r: -.3 }, { type: 'american' },
  { S0: Number.MAX_VALUE, u: 2 }, { S0: Number.MIN_VALUE, d: .1, steps: 200 }
]) assert.throws(() => binomialTree(invalid), RangeError);
for (const p of [-.1, 1.1, NaN, Infinity, '0.5']) assert.throws(() => discountedExpectedPayoff(baseline, p), RangeError);
checks.push('Rejects invalid, non-finite, unsupported and numerically unrepresentable inputs; strict d < R < u');
console.log(JSON.stringify({ status: 'passed', checks }, null, 2));
