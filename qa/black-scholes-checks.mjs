import assert from 'node:assert/strict';
import { bsValue, deltaHedgeFromPath, discreteDeltaHedge } from '../src/black-scholes.mjs';

const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected} (tolerance ${tolerance})`);
const checks = [];
const call = bsValue(), put = bsValue({ kind: 'put' });
close(call.price, 10.4505835721856); close(put.price, 5.573526022257);
close(call.delta, .636830651175619); close(put.delta, -.363169348824381);
close(call.gamma, .0187620173458469); close(call.vega, 37.5240346916938);
close(call.d1, .35); close(call.d2, .15); close(call.cash, -53.2324815453763);
checks.push('Independent reference Call/Put prices, Delta, Gamma, Vega, d1/d2 and replicating cash');

// Independent quadrature of discounted risk-neutral payoff, using no BS CDF.
for (const kind of ['call', 'put']) {
  const count = 20000, width = 20 / count, sign = kind === 'call' ? 1 : -1;
  let integral = 0;
  for (let i = 0; i <= count; i++) {
    const z = -10 + width * i, terminal = 100 * Math.exp(.03 + .2 * z);
    const integrand = Math.max(sign * (terminal - 100), 0) * Math.exp(-.5 * z * z) / Math.sqrt(2 * Math.PI);
    integral += (i === 0 || i === count ? 1 : i % 2 === 0 ? 2 : 4) * integrand;
  }
  close(bsValue({ kind }).price, Math.exp(-.05) * integral * width / 3, 2e-6);
}
checks.push('Prices agree with independent numerical integration of risk-neutral lognormal payoffs');

for (const S of [50, 80, 100, 125, 150]) for (const r of [-.03, 0, .05, .1]) for (const sigma of [.05, .2, .6]) for (const tau of [.05, 1, 2]) {
  const parameters = { S, K: 100, r, sigma, tau };
  const c = bsValue(parameters), p = bsValue({ ...parameters, kind: 'put' });
  close(c.price - p.price, S - 100 * Math.exp(-r * tau));
  close(c.delta - p.delta, 1); close(c.gamma, p.gamma); close(c.vega, p.vega);
  for (const value of [c, p]) {
    assert.ok(value.price >= 0 && value.gamma >= 0 && value.vega >= 0);
    close(value.delta * S + value.cash, value.price);
    assert.ok(value.kind === 'call' ? value.price <= S && value.delta >= 0 && value.delta <= 1 : value.price <= value.discountedStrike && value.delta >= -1 && value.delta <= 0);
    const h = .002, up = bsValue({ ...parameters, kind: value.kind, S: S + h }), down = bsValue({ ...parameters, kind: value.kind, S: S - h });
    close((up.price - down.price) / (2 * h), value.delta, 2e-7);
    close((up.price - 2 * value.price + down.price) / (h * h), value.gamma, 2e-7);
    const v = .00001;
    close((bsValue({ ...parameters, kind: value.kind, sigma: sigma + v }).price - bsValue({ ...parameters, kind: value.kind, sigma: sigma - v }).price) / (2 * v), value.vega, 2e-6);
  }
  assert.ok(bsValue({ ...parameters, S: S + 1 }).price >= c.price);
  assert.ok(bsValue({ ...parameters, S: S + 1, kind: 'put' }).price <= p.price);
  assert.ok(bsValue({ ...parameters, sigma: sigma + .01 }).price >= c.price - 1e-12);
  assert.ok(bsValue({ ...parameters, sigma: sigma + .01, kind: 'put' }).price >= p.price - 1e-12);
}
checks.push('360 parameter combinations: parity, no-arbitrage bounds, monotonicity, funding identity and Greeks by finite differences');

for (const kind of ['call', 'put']) {
  const sign = kind === 'call' ? 1 : -1;
  for (const S of [0, 80, 100, 120]) {
    const expiry = bsValue({ S, tau: 0, kind }); close(expiry.price, Math.max(sign * (S - 100), 0)); close(expiry.vega, 0);
    if (S === 100) { assert.equal(expiry.delta, null); assert.equal(expiry.gamma, null); assert.equal(expiry.cash, null); }
    else { close(expiry.gamma, 0); close(expiry.delta, kind === 'call' ? Number(S > 100) : -Number(S < 100)); }
    const zeroVol = bsValue({ S, sigma: 0, kind }); close(zeroVol.price, Math.max(sign * (S - 100 * Math.exp(-.05)), 0));
  }
  const kink = bsValue({ S: 100, K: 100, r: 0, sigma: 0, tau: 1, kind });
  close(kink.price, 0); assert.equal(kink.delta, null); assert.equal(kink.gamma, null); assert.equal(kink.d1, null); assert.equal(kink.d2, null);
  close(kink.vega, 100 / Math.sqrt(2 * Math.PI));
  close(bsValue({ r: 0, sigma: 1e-6, kind }).price / 1e-6, kink.vega, 1e-7);
}
checks.push('Expiry payoff, zero spot, zero volatility and undefined kink derivatives are handled explicitly');

const worked = deltaHedgeFromPath({ prices: [100, 110, 95], T: 1 });
const initialBank = 10.4505835721856 - .636830651175619 * 100;
close(worked.records[1].wealth, .636830651175619 * 110 + initialBank * Math.exp(.025));
const halfDelta = bsValue({ S: 110, tau: .5 }).delta;
const halfBank = initialBank * Math.exp(.025) - (halfDelta - .636830651175619) * 110;
close(worked.records[1].cash, halfBank);
close(worked.terminalWealth, halfDelta * 95 + halfBank * Math.exp(.025));
assert.equal(worked.payoff, 0);
checks.push('Two-step hedge agrees with independently expanded share and bank-account arithmetic');

const defaultHedge = discreteDeltaHedge();
assert.deepEqual(defaultHedge, discreteDeltaHedge());
assert.notEqual(defaultHedge.terminalStock, discreteDeltaHedge({ seed: 74 }).terminalStock);
assert.ok(Math.abs(defaultHedge.hedgeError) > .001);
const fine = discreteDeltaHedge({ steps: 256 });
for (const steps of [16, 64, 256]) for (const kind of ['call', 'put']) {
  const data = discreteDeltaHedge({ steps, kind });
  close(data.terminalStock, fine.terminalStock); close(data.brownianTerminal, fine.brownianTerminal);
  close(data.initialValue, bsValue({ kind }).price);
  data.records.forEach((row, i) => {
    close(row.S, fine.records[i * 256 / steps].S);
    close(row.wealth, row.delta * row.S + row.cash);
    close(row.fundingError, 0);
    if (i > 0) {
      const previous = data.records[i - 1];
      close(row.cash, previous.cash * Math.exp(.05 * data.dt) - (row.delta - previous.delta) * row.S);
      close(row.wealth - previous.wealth, previous.delta * (row.S - previous.S) + previous.cash * Math.expm1(.05 * data.dt));
    }
  });
  close(data.hedgeError, data.terminalWealth - data.payoff);
  // Call minus Put is a stock-minus-bond portfolio, so both discrete hedges have the same error.
  close(data.hedgeError, discreteDeltaHedge({ steps, kind: kind === 'call' ? 'put' : 'call' }).hedgeError);
  assert.equal(data.records.at(-1).delta, data.records.at(-2).delta);
}
checks.push('Hedge reproducibility, shared nested stock paths, no cash injections, self-financing gains and Call/Put parity');

const rmse = [];
for (const steps of [16, 64, 256]) {
  let squared = 0;
  for (let i = 0; i < 256; i++) squared += discreteDeltaHedge({ steps, seed: (127 + Math.imul(i, 2654435761)) >>> 0 }).hedgeError ** 2;
  rmse.push({ steps, value: Math.sqrt(squared / 256) });
}
assert.ok(rmse[1].value < rmse[0].value); assert.ok(rmse[2].value < rmse[1].value);
checks.push('Discrete hedge RMSE decreases across a fixed 256-path ensemble; no pathwise guarantee is asserted');

for (const invalid of [{ S: -1 }, { S: Infinity }, { K: 0 }, { K: NaN }, { r: Infinity }, { sigma: -1 }, { sigma: NaN }, { tau: -1 }, { tau: NaN }, { kind: 'american' }]) assert.throws(() => bsValue(invalid), RangeError);
for (const invalid of [{ steps: 0 }, { steps: 3 }, { steps: 257 }, { seed: -1 }, { sigma: 0 }, { T: 0 }, { S0: 0 }]) assert.throws(() => discreteDeltaHedge(invalid), RangeError);
for (const prices of [[], [100], [100, 0], [100, NaN]]) assert.throws(() => deltaHedgeFromPath({ prices }), RangeError);
checks.push('Invalid prices, contract parameters, hedge grids and paths fail explicitly');

console.log(JSON.stringify({ status: 'passed', checks, defaultPrice: call, defaultHedge: { initialValue: defaultHedge.initialValue, terminalStock: defaultHedge.terminalStock, terminalWealth: defaultHedge.terminalWealth, payoff: defaultHedge.payoff, hedgeError: defaultHedge.hedgeError }, rmse }, null, 2));
