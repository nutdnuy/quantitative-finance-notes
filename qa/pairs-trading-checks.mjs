import assert from 'node:assert/strict';
import { generatePairData, fitPair, hedgeExample, runPairBacktest, closedTradeMetrics } from '../src/pairs-trading.mjs';

const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
const sum = values => values.reduce((total, value) => total + value, 0);

// Equal dollars leaves beta-dollar exposure; beta-neutrality cancels only the market term.
const equal = hedgeExample({ marketReturn: 0.05, relativeReturn: 0, mode: 'dollar' });
close(equal.pnl, 200); close(equal.betaDollars, 4000); close(equal.grossNotional, 20000);
const beta = hedgeExample({ marketReturn: -0.1, relativeReturn: 0, mode: 'beta' });
close(beta.shortNotional, 15000); close(beta.pnl, 0); close(beta.betaDollars, 0);
close(hedgeExample({ marketReturn: 0.05, relativeReturn: 0.02, mode: 'beta' }).pnl, 250);

const data = generatePairData(), broken = generatePairData({ broken: true });
assert.deepEqual(data, generatePairData());
assert.deepEqual(data.slice(0, 250), broken.slice(0, 250));
assert.deepEqual(data.map(row => row.b), broken.map(row => row.b));
assert.notDeepEqual(data.slice(250), broken.slice(250));

// Training OLS and empirical sample SD checked with an exact orthogonal residual fixture.
const training = [90, 100, 110, 120].map((b, i) => ({ day: i + 1, b, a: b + [1, -1, -1, 1][i] }));
const fixture = residuals => [...training, ...residuals.map((residual, i) => ({ day: i + 5, b: 100, a: 100 + residual }))];
const exact = fixture([-3, -1, 2, 3, 3]), fit = fitPair(exact, 4);
close(fit.h, 1); close(fit.intercept, 0); close(fit.residualMean, 0); close(fit.residualSD, Math.sqrt(4 / 3));
const options = { data: exact, trainCount: 4, initialCapital: 10000, targetGross: 1000, feeBps: 10, borrowRate: 0.03 };
const ledger = runPairBacktest(options), trade = ledger.trades[0], units = 1000 / 197;
assert.equal(ledger.trades.length, 1);
assert.equal(trade.entrySignalIndex, 4); assert.equal(trade.entryIndex, 5);
assert.equal(trade.exitSignalIndex, 6); assert.equal(trade.exitIndex, 7);
assert.equal(trade.reason, 'mean'); assert.equal(trade.holdingDays, 2);
close(trade.qA, units); close(trade.qB, -units);
// Signal A=97, actual entry A=99, exit A=103; B=100 throughout.
// There is no PnL from the signal-to-entry price move. Fees cover all four leg fills.
close(trade.grossPnl, units * 4);
close(trade.fees, units * (99 + 100 + 103 + 100) * 0.001);
close(trade.borrow, units * 100 * 0.03 / 252 * 2);
close(trade.netPnl, units * 4 - trade.fees - trade.borrow);
close(ledger.rows[0].grossPnl, 0); close(ledger.rows[1].grossPnl, 0);
close(ledger.metrics.netPnl, trade.netPnl);
close(ledger.metrics.totalReturn, trade.netPnl / 10000);
close(ledger.metrics.winRate, 1);

// Stops act on a close signal and may fill beyond the stop on the next close.
const stopped = runPairBacktest({ ...options, data: fixture([-3, -3, -5, -6, -6]) });
assert.equal(stopped.trades[0].reason, 'stop');
assert.equal(stopped.trades[0].exitSignalIndex, 6);
assert.equal(stopped.trades[0].exitIndex, 7);
close(stopped.trades[0].grossPnl, -3 * units);
const timed = runPairBacktest({ ...options, data: fixture([-3, -3, -3, -3, -3]), maxHold: 1 });
assert.equal(timed.trades[0].reason, 'time'); assert.equal(timed.trades[0].holdingDays, 1);
const terminal = runPairBacktest({ ...options, data: fixture([-3, -3, -3, -3, -3]) });
assert.equal(terminal.trades[0].reason, 'end'); assert.equal(terminal.trades[0].exitIndex, 8);
assert.equal(terminal.trades[0].exitSignalIndex, null);
assert.equal(terminal.rows.at(-1).qA, 0); assert.equal(terminal.rows.at(-1).qB, 0);

// A higher fee changes the ledger, not the price signals or fixed-share positions.
const free = runPairBacktest({ ...options, feeBps: 0, borrowRate: 0 });
close(free.metrics.netPnl - ledger.metrics.netPnl, trade.fees + trade.borrow);
assert.deepEqual(free.fills.map(x => [x.index, x.deltaA, x.deltaB]), ledger.fills.map(x => [x.index, x.deltaA, x.deltaB]));

// A zero-profit trade is included in the denominator but does not count as a win.
const metricFixture = closedTradeMetrics([{ netPnl: 10 }, { netPnl: -20 }, { netPnl: 0 }]);
assert.equal(metricFixture.wins, 1); assert.equal(metricFixture.closedTrades, 3);
close(metricFixture.winRate, 1 / 3); close(metricFixture.averageTrade, -10 / 3);
assert.equal(closedTradeMetrics([]).winRate, null);

// Perturbing future test prices cannot change fit, earlier signals, fills, or equity.
const baseline = runPairBacktest({ data });
const futureChanged = data.map((row, i) => i < 350 ? { ...row } : { ...row, a: row.a + 10 + 0.1 * (i - 350), b: row.b + 0.2 * (i - 350) });
const changed = runPairBacktest({ data: futureChanged });
assert.deepEqual(baseline.fit, changed.fit);
assert.deepEqual(baseline.rows.filter(row => row.index < 350), changed.rows.filter(row => row.index < 350));
assert.deepEqual(baseline.fills.filter(fill => fill.index < 350), changed.fills.filter(fill => fill.index < 350));
assert.notDeepEqual(baseline.rows.slice(101), changed.rows.slice(101));

// Reconcile actual cash, shares, MTM, both-leg turnover and closed trade attribution.
for (const broken of [false, true]) for (const entryZ of [1, 1.25, 2, 3]) for (const feeBps of [0, 5, 40]) for (const borrowRate of [0, 0.03, 0.15]) {
  const source = generatePairData({ broken }), result = runPairBacktest({ data: source, entryZ, feeBps, borrowRate });
  let cash = 100000, qA = 0, qB = 0, equity = 100000, peak = 100000, drawdown = 0;
  for (const row of result.rows) {
    const price = source[row.index], previous = source[row.index - 1];
    const mark = qA * (price.a - previous.a) + qB * (price.b - previous.b);
    const borrow = (Math.max(-qA * previous.a, 0) + Math.max(-qB * previous.b, 0)) * borrowRate / 252;
    cash -= borrow;
    const fills = result.fills.filter(fill => fill.index === row.index);
    assert.ok(fills.length <= 1);
    for (const fill of fills) {
      const cost = (Math.abs(fill.deltaA * price.a) + Math.abs(fill.deltaB * price.b)) * feeBps / 10000;
      close(fill.fee, cost); close(fill.turnoverA, Math.abs(fill.deltaA * price.a)); close(fill.turnoverB, Math.abs(fill.deltaB * price.b));
      cash -= fill.deltaA * price.a + fill.deltaB * price.b + cost;
      qA += fill.deltaA; qB += fill.deltaB;
      if (fill.reason !== 'end') assert.equal(fill.index, fill.signalIndex + 1);
    }
    const nextEquity = cash + qA * price.a + qB * price.b;
    close(row.cash, cash); close(row.equity, nextEquity);
    close(row.qA, qA); close(row.qB, qB); close(row.grossPnl, mark); close(row.borrow, borrow);
    close(row.dailyPnl, nextEquity - equity); close(row.dailyPnl, mark - row.fee - row.borrow);
    close(row.dailyReturn, row.dailyPnl / equity);
    peak = Math.max(peak, nextEquity); drawdown = Math.max(drawdown, (peak - nextEquity) / peak); equity = nextEquity;
    for (const value of Object.values(row)) if (typeof value === 'number') assert.ok(Number.isFinite(value));
  }
  close(qA, 0); close(qB, 0);
  close(result.metrics.maxDrawdown, drawdown);
  close(result.metrics.netPnl, sum(result.trades.map(x => x.netPnl)));
  close(result.metrics.grossPnl, sum(result.trades.map(x => x.grossPnl)));
  close(result.metrics.totalFees, sum(result.trades.map(x => x.fees)));
  close(result.metrics.totalBorrow, sum(result.trades.map(x => x.borrow)));
  close(result.metrics.netPnl, result.metrics.grossPnl - result.metrics.totalFees - result.metrics.totalBorrow);
  close(result.metrics.totalReturn, result.metrics.netPnl / 100000);
  assert.ok(result.trades.every(x => x.holdingDays <= 20 && x.entryIndex >= 250 && x.exitIndex < 500));
  for (const value of Object.values(result.metrics)) if (typeof value === 'number') assert.ok(Number.isFinite(value));
}

assert.throws(() => runPairBacktest({ entryZ: 4, stopZ: 4 }));
assert.throws(() => runPairBacktest({ feeBps: -1 }));
assert.throws(() => runPairBacktest({ borrowRate: -0.01 }));
assert.throws(() => runPairBacktest({ targetGross: 200000 }));
assert.throws(() => fitPair(exact.map(row => ({ ...row, b: 100 })), 4));
assert.throws(() => fitPair(exact.map(row => ({ ...row, a: row.b })), 4));
assert.throws(() => generatePairData({ count: 250 }));
console.log('Pairs trading passed: beta-dollar units; deterministic scenarios; training sample SD; next-close fills; four-leg cost ledger; daily short borrow; stop/time/end exits; win-rate denominator; no-lookahead perturbation; independent cash/MTM and closed-trade reconciliation across 72 parameter sets.');
