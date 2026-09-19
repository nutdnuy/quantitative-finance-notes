import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { capitalMetrics, outputFloor, liquidityCoverage, asrfStressPd, corporateIRB } from '../src/basel.mjs';

const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);

const capital = capitalMetrics();
assert.equal(capital.tier1, 70); assert.equal(capital.total, 90);
close(capital.cet1Ratio, .1); close(capital.tier1Ratio, 7 / 60); close(capital.totalRatio, .15); close(capital.leverageRatio, .07);
close(capitalMetrics({ rwa: 1200 }).totalRatio, capital.totalRatio / 2);
close(capitalMetrics({ exposure: 2000 }).leverageRatio, capital.leverageRatio / 2);
close(capitalMetrics({ rwa: 1200 }).leverageRatio, capital.leverageRatio);
close(outputFloor().effectiveRwa, 580); close(outputFloor(400, 800, .5).effectiveRwa, 400);
assert.equal(outputFloor(600, 800).binding, false); assert.equal(outputFloor().binding, true);

const lcr = liquidityCoverage();
close(lcr.inflowCap, 120); close(lcr.netOutflows, 100); close(lcr.lcr, 1.2);
close(liquidityCoverage(120, 160, 200).netOutflows, 40);
close(liquidityCoverage(120, 160, 120).lcr, liquidityCoverage(120, 160, 200).lcr);
close(liquidityCoverage(120, 160, 0).lcr, .75);
close(liquidityCoverage(0, 160, 60).lcr, 0);

// Independent references computed using Python statistics.NormalDist (not these JS helpers).
const references = [
  [{ pd: .01, lgd: .45, maturity: 2.5 }, { rho: .192783679165516, stressPd: .14027267845651592, maturityAdjustment: 1.2598095009238282, capitalRate: .07385344111364114, rwa: 92.31680139205143 }],
  [{ pd: .0012, lgd: .6, maturity: 5 }, { rho: .23301174403010985, stressPd: .038952209632398815, maturityAdjustment: 2.471965702142983, capitalRate: .05599330043484108, rwa: 69.99162554355135 }],
  [{ pd: .023, lgd: .45, maturity: 5 }, { rho: .1579964123254864, stressPd: .2015945232899462, maturityAdjustment: 1.5026463588475165, capitalRate: .12076398455928555, rwa: 150.95498069910695 }],
];
for (const [inputs, expected] of references) {
  const result = corporateIRB(inputs);
  for (const [key, value] of Object.entries(expected)) close(result[key], value);
}

// Cross-language agreement over the interactive domain and the two lecture examples.
// Python uses statistics.NormalDist, independently of the JavaScript erfc inversion.
const comparisonInputs = references.map(([inputs]) => ({ ...inputs, ead: 100 }));
for (const pd of [.0005, .0012, .01, .023, .1]) for (const lgd of [.1, .45, .8]) for (const maturity of [1, 2.5, 5]) for (const ead of [1, 100, 1000]) comparisonInputs.push({ pd, lgd, maturity, ead });
const python = spawnSync('python3', ['-c', 'import json,sys\nfrom scripts.basel_math import corporate_irb\nprint(json.dumps([corporate_irb(**inputs) for inputs in json.load(sys.stdin)]))'], {
  cwd: fileURLToPath(new URL('../', import.meta.url)), input: JSON.stringify(comparisonInputs), encoding: 'utf8',
  env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
});
assert.equal(python.status, 0, python.error?.message || python.stderr);
const pythonResults = JSON.parse(python.stdout);
assert.equal(pythonResults.length, comparisonInputs.length);
const names = { rho: 'rho', stressPd: 'stress_pd', maturityAdjustment: 'maturity_adjustment', capitalRate: 'capital_rate', capital: 'capital', riskWeight: 'risk_weight', rwa: 'rwa' };
comparisonInputs.forEach((inputs, index) => {
  const js = corporateIRB(inputs);
  for (const [jsName, pythonName] of Object.entries(names)) close(js[jsName], pythonResults[index][pythonName]);
});

for (const pd of [.0005, .0012, .01, .023, .1]) {
  close(asrfStressPd(pd, 0), pd);
  let previousCapital = 0;
  for (let maturity = 1; maturity <= 5; maturity += .5) {
    const result = corporateIRB({ pd, maturity });
    assert.ok(Object.values(result).every(Number.isFinite));
    assert.ok(result.capital >= previousCapital); previousCapital = result.capital;
    assert.ok(result.rho >= .12 && result.rho <= .24);
    assert.ok(result.stressPd > pd && result.stressPd < 1);
    close(result.expectedLoss, pd * .45 * 100);
    close(result.capital, (result.stressLoss - result.expectedLoss) * result.maturityAdjustment);
    close(.08 * result.rwa, result.capital);
    close(corporateIRB({ pd, maturity, lgd: .9 }).capital, 2 * result.capital);
    close(corporateIRB({ pd, maturity, ead: 200 }).capital, 2 * result.capital);
  }
  close(corporateIRB({ pd, maturity: 1 }).maturityAdjustment, 1);
}

// Across this lesson's PD range (not a claim of global monotonicity up to default).
let lastCapital = 0;
for (let step = 1; step <= 200; step++) {
  const result = corporateIRB({ pd: .0005 * step });
  assert.ok(result.capital >= lastCapital); lastCapital = result.capital;
}
for (const hqla of [40, 120, 200]) for (const outflows of [80, 160, 240]) for (const inflows of [0, 60, 200]) {
  const result = liquidityCoverage(hqla, outflows, inflows);
  assert.ok(result.netOutflows >= .25 * outflows);
  close(result.netOutflows + result.eligibleInflows, outflows);
}
for (const input of [{ rwa: 0 }, { exposure: 0 }, { cet1: -1 }, { at1: NaN }, { tier2: Infinity }]) assert.throws(() => capitalMetrics(input), RangeError);
for (const args of [[NaN, 800, .725], [400, -1, .725], [400, 800, 1.1]]) assert.throws(() => outputFloor(...args), RangeError);
for (const args of [[-1, 160, 60], [120, 0, 60], [120, 160, NaN]]) assert.throws(() => liquidityCoverage(...args), RangeError);
for (const args of [[0, .2], [1, .2], [.01, -1], [.01, 1], [.01, .2, 1]]) assert.throws(() => asrfStressPd(...args), RangeError);
for (const input of [{ pd: 0 }, { pd: .0001 }, { pd: 1 }, { lgd: 1.01 }, { lgd: -1 }, { maturity: .5 }, { maturity: 6 }, { ead: 0 }, { ead: NaN }]) assert.throws(() => corporateIRB(input), RangeError);
close(corporateIRB({ lgd: 0 }).capital, 0);
console.log(`Basel: capital ratios, output floor, LCR inflow cap, ${comparisonInputs.length} Python/JS IRB comparisons, independent references, ASRF zero-correlation limit, maturity/LGD/EAD identities and input-domain checks passed.`);
