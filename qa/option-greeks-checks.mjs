import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { optionGreeks, strikeFromDelta, deltaMirror, probabilityMirror } from '../src/option-greeks.mjs';

const close = (actual, expected, tolerance = 1e-10) => assert.ok(Number.isFinite(actual) && Number.isFinite(expected) && Math.abs(actual - expected) <= tolerance, `${actual} != ${expected} (tolerance ${tolerance})`);
const checks = [];

// Independent Python price uses the standard-library erfc, not the JS CDF or
// any Greek formula. Repeated central differences cover orders one to three.
const referenceProgram = String.raw`
import json, math
def price(p):
    S,K,r,b,sigma,T=(p[k] for k in ('S','K','r','b','sigma','T'))
    sign=1 if p['kind']=='call' else -1
    scale=sigma*math.sqrt(T)
    d1=(math.log(S/K)+(b+sigma*sigma/2)*T)/scale
    d2=d1-scale
    N=lambda x: math.erfc(-x/math.sqrt(2))/2
    return sign*(S*math.exp((b-r)*T)*N(sign*d1)-K*math.exp(-r*T)*N(sign*d2))
steps={'S':.025,'K':.025,'sigma':.0001,'T':.0001,'r':.00001,'b':.00001}
def derivative(p, keys):
    if not keys: return price(p)
    key=keys[0]; h=steps[key]
    up=dict(p); down=dict(p)
    up[key]+=h; down[key]-=h
    return (derivative(up,keys[1:])-derivative(down,keys[1:]))/(2*h)
spec={'delta':('S',),'gamma':('S','S'),'vega':('sigma',),'theta':('T',),'vanna':('S','sigma'),'vomma':('sigma','sigma'),'charm':('S','T'),'speed':('S','S','S'),'zomma':('S','S','sigma'),'color':('S','S','T'),'veta':('sigma','T'),'rhoFixedB':('r',),'carry':('b',),'strikeDelta':('K',),'strikeGamma':('K','K')}
rows=[]
for S in [85.,100.,115.]:
 for b in [-.03,.08]:
  for sigma,T in [(.18,.4),(.4,1.5)]:
   for kind in ['call','put']:
    p={'S':S,'K':100.,'r':.025,'b':b,'sigma':sigma,'T':T,'kind':kind}
    values={key:derivative(p,axes)*(-1 if key in ['theta','charm','color','veta'] else 1) for key,axes in spec.items()}
    h=.00001; up=dict(p,r=p['r']+h,b=p['b']+h); down=dict(p,r=p['r']-h,b=p['b']-h)
    values['rhoFixedYield']=(price(up)-price(down))/(2*h)
    values['price']=price(p)
    rows.append({'parameters':p,'values':values})
print(json.dumps(rows))
`;
const python = spawnSync('python3', ['-c', referenceProgram], { encoding: 'utf8' });
assert.equal(python.status, 0, python.stderr);
const references = JSON.parse(python.stdout);
let largestRelativeDifference = 0;
for (const { parameters, values } of references) {
  const actual = optionGreeks(parameters);
  for (const [key, expected] of Object.entries(values)) {
    const tolerance = key === 'price' ? 2e-12 : Math.max(4e-6, Math.abs(expected) * 1e-4);
    close(actual[key], expected, tolerance);
    if (Math.abs(expected) > .001) largestRelativeDifference = Math.max(largestRelativeDifference, Math.abs(actual[key] / expected - 1));
  }
  close(actual.elasticity, parameters.S * actual.delta / actual.price);
}
checks.push('24 Call/Put cases: independent Python erfc prices and finite differences of all first-, second- and third-order Greeks, including both rho conventions');

for (const b of [-.08, 0, .03, .15]) for (const T of [.02, .5, 2]) for (const sigma of [.08, .2, .7]) for (const S of [60, 100, 160]) {
  const parameters = { S, K: 100, r: .03, b, sigma, T };
  const call = optionGreeks(parameters), put = optionGreeks({ ...parameters, kind: 'put' });
  const A = Math.exp((b - parameters.r) * T), discount = Math.exp(-parameters.r * T);
  close(call.price - put.price, S * A - 100 * discount);
  close(call.delta - put.delta, A);
  close(call.theta - put.theta, -(b - parameters.r) * S * A - parameters.r * 100 * discount);
  close(call.charm - put.charm, -(b - parameters.r) * A);
  close(call.strikeDelta - put.strikeDelta, -discount);
  close(call.rhoFixedB - put.rhoFixedB, -T * (S * A - 100 * discount));
  close(call.rhoFixedYield - put.rhoFixedYield, T * 100 * discount);
  close(call.carry - put.carry, T * S * A);
  close(call.itmProbability + put.itmProbability, 1);
  for (const key of ['gamma', 'vega', 'vanna', 'vomma', 'speed', 'zomma', 'color', 'veta', 'strikeGamma']) close(call[key], put[key]);
  for (const value of [call, put]) {
    assert.ok(value.price >= 0 && value.gamma >= 0 && value.vega >= 0 && value.strikeGamma >= 0);
    assert.ok(value.itmProbability >= 0 && value.itmProbability <= 1);
    assert.ok(Math.abs(value.delta) <= A);
    close(value.strikeGamma, discount * Math.exp(-.5 * value.d2 ** 2) / Math.sqrt(2 * Math.PI) / (100 * sigma * Math.sqrt(T)));
    close(value.vega, S * S * sigma * T * value.gamma, 1e-10);
    close(value.rhoFixedYield, value.rhoFixedB + value.carry);
  }
}
checks.push('108 parameter sets: derivative identities from put-call parity, price and probability bounds, Vega/Gamma identity, strike density and rho/carry decomposition');

for (const kind of ['call', 'put']) for (const b of [-.05, .15]) for (const T of [.1, 2]) for (const fraction of [.001, .05, .25, .5, .75, .95, .999]) {
  const parameters = { S: 100, r: .03, b, sigma: .25, T, kind };
  const target = (kind === 'call' ? 1 : -1) * Math.exp((b - .03) * T) * fraction;
  const K = strikeFromDelta({ ...parameters, delta: target });
  const value = optionGreeks({ ...parameters, K });
  close(value.delta, target, 3e-14);
  const paired = deltaMirror({ ...parameters, K }), opposite = kind === 'call' ? 'put' : 'call';
  close(optionGreeks({ ...parameters, K: paired, kind: opposite }).delta, -target, 3e-14);
  close(deltaMirror({ ...parameters, K: paired }), K, 2e-10);
  const probabilityPaired = probabilityMirror({ ...parameters, K });
  close(optionGreeks({ ...parameters, K: probabilityPaired, kind: opposite }).itmProbability, value.itmProbability, 3e-14);
  close(probabilityMirror({ ...parameters, K: probabilityPaired }), K, 2e-10);
}
checks.push('56 ordinary spot Delta inversion round trips, opposite-kind Delta and probability mirror identities, and mirror involutions');

const base = { S: 100, K: 100, r: .05, b: .05, sigma: .2, T: 1 }, value = optionGreeks(base);
const smallVolPoint = .01;
close((optionGreeks({ ...base, sigma: base.sigma + smallVolPoint / 100 }).price - optionGreeks({ ...base, sigma: base.sigma - smallVolPoint / 100 }).price) / (2 * smallVolPoint), value.vega / 100, 1e-8);
const smallDay = .01;
close((optionGreeks({ ...base, T: base.T - smallDay / 365 }).price - optionGreeks({ ...base, T: base.T + smallDay / 365 }).price) / (2 * smallDay), value.theta / 365, 1e-9);
close((optionGreeks({ ...base, T: base.T - smallDay / 365 }).delta - optionGreeks({ ...base, T: base.T + smallDay / 365 }).delta) / (2 * smallDay), value.charm / 365, 1e-10);
close((optionGreeks({ ...base, sigma: base.sigma + smallVolPoint / 100 }).vega / 100 - optionGreeks({ ...base, sigma: base.sigma - smallVolPoint / 100 }).vega / 100) / (2 * smallVolPoint), value.vomma / 10000, 1e-8);
checks.push('Displayed Vega per one volatility percentage point, Vomma per point squared, and calendar Theta/Charm per day match finite differences');

const deltaCenter = base.S * Math.exp((base.b + .5 * base.sigma ** 2) * base.T);
close(optionGreeks({ ...base, K: deltaCenter }).delta, value.A / 2);
close(optionGreeks({ ...base, K: deltaCenter, kind: 'put' }).delta, -value.A / 2);
const probabilityCenter = base.S * Math.exp((base.b - .5 * base.sigma ** 2) * base.T);
close(optionGreeks({ ...base, K: probabilityCenter }).itmProbability, .5);
// As a function of spot, Gamma is stationary at d1 = -sigma sqrt(T),
// while Vega is stationary at d1 = sigma sqrt(T), equivalently d2 = 0.
const gammaPeakSpot = base.K * Math.exp(-(base.b + 1.5 * base.sigma ** 2) * base.T);
const vegaPeakSpot = base.K * Math.exp((-base.b + .5 * base.sigma ** 2) * base.T);
close(optionGreeks({ ...base, S: gammaPeakSpot }).speed, 0);
close(optionGreeks({ ...base, S: vegaPeakSpot }).vanna, 0);
assert.ok(optionGreeks({ ...base, S: gammaPeakSpot }).gamma > optionGreeks({ ...base, S: gammaPeakSpot + .1 }).gamma);
assert.ok(optionGreeks({ ...base, S: vegaPeakSpot }).vega > optionGreeks({ ...base, S: vegaPeakSpot + .1 }).vega);
assert.ok(optionGreeks({ S: 180, b: .2, r: .02 }).delta > 1);
assert.ok(optionGreeks({ S: 180, b: .2, r: .02 }).itmProbability <= 1);
assert.equal(optionGreeks({ S: 1e-10, K: 100, sigma: .01 }).elasticity, null);
checks.push('Delta/probability symmetry centers, correct spot-dependent Gamma/Vega extrema, Delta above one and undefined zero-price elasticity');

// All simultaneous-shock inputs offered in the UI remain in the smooth domain.
for (const S of [70, 130]) for (const sigma of [.1, .5]) for (const T of [15 / 365, 2]) for (const dS of [-25, 25]) for (const dv of [-.08, .2]) {
  const before = optionGreeks({ S, sigma, T }), after = optionGreeks({ S: S + dS, sigma: sigma + dv, T });
  assert.ok(Number.isFinite(after.price - before.price));
}
const taylorError = fraction => {
  const dS = 5 * fraction, dv = .05 * fraction;
  const actual = optionGreeks({ ...base, S: base.S + dS, sigma: base.sigma + dv }).price - value.price;
  return Math.abs(actual - value.delta * dS - value.vega * dv - .5 * value.gamma * dS * dS - value.vanna * dS * dv - .5 * value.vomma * dv * dv);
};
assert.ok(taylorError(.1) < taylorError(.2) / 6);
checks.push('UI shock corners stay valid and simultaneous second-order Taylor residual shrinks at the expected local cubic order');

for (const invalid of [{ S: 0 }, { S: -1 }, { K: Infinity }, { sigma: 0 }, { sigma: NaN }, { T: 0 }, { T: -1 }, { r: Infinity }, { b: NaN }, { kind: 'american' }, { r: -1000 }, { b: 1000 }]) assert.throws(() => optionGreeks(invalid), RangeError);
for (const invalid of [{ delta: 0 }, { delta: 1 }, { delta: -1 }, { delta: .5, kind: 'put' }, { delta: -.5 }, { delta: NaN }, { delta: .5, T: 0 }, { delta: .5, b: 1000 }]) assert.throws(() => strikeFromDelta(invalid), RangeError);
for (const mirror of [deltaMirror, probabilityMirror]) for (const invalid of [{ K: 0 }, { sigma: 0 }, { T: 0 }, { b: Infinity }, { b: 1000 }]) assert.throws(() => mirror(invalid), RangeError);
checks.push('Invalid, non-smooth, unavailable Delta and overflow cases fail explicitly');

console.log(JSON.stringify({ status: 'passed', checks, independentFiniteDifferenceCases: references.length, largestRelativeDifference, baseline: value }, null, 2));
