import { normalGenerator } from './math.mjs';

// Prices and PnL are USD; quantities are shares; rates/returns are decimals.
export const PAIR_SIMULATION = Object.freeze({
  seed: 20260920, count: 500, trainCount: 250, intercept: 8,
  hedgeRatio: 1.2, residualPhi: 0.85, residualShock: 0.8, priceShock: 0.65,
});

const average = values => values.reduce((sum, x) => sum + x, 0) / values.length;
const finite = (value, name) => {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
};
const positive = (value, name) => {
  finite(value, name);
  if (value <= 0) throw new RangeError(`${name} must be positive`);
};
const sampleSD = values => {
  const m = average(values);
  return Math.sqrt(values.reduce((sum, x) => sum + (x - m) ** 2, 0) / (values.length - 1));
};

function validateData(data, trainCount) {
  if (!Array.isArray(data) || !Number.isInteger(trainCount) || trainCount < 4 || data.length < trainCount + 2) {
    throw new RangeError('At least four training and two test observations are required');
  }
  for (const row of data) {
    positive(row.a, 'A price');
    positive(row.b, 'B price');
  }
}

export function generatePairData({ seed = PAIR_SIMULATION.seed, count = 500, trainCount = 250, broken = false } = {}) {
  if (!Number.isInteger(seed) || !Number.isInteger(count) || !Number.isInteger(trainCount) || trainCount < 4 || count < trainCount + 2) {
    throw new RangeError('Invalid seed or observation counts');
  }
  const random = normalGenerator(seed), p = PAIR_SIMULATION;
  let b = 100, residual = p.residualShock / Math.sqrt(1 - p.residualPhi ** 2) * random();
  const data = [];
  for (let i = 0; i < count; i++) {
    if (i > 0) {
      b += p.priceShock * random();
      const shock = p.residualShock * random();
      residual = broken && i >= trainCount ? residual + 0.10 + shock : p.residualPhi * residual + shock;
    }
    data.push({ day: i + 1, a: p.intercept + p.hedgeRatio * b + residual, b });
  }
  validateData(data, trainCount);
  return data;
}

// h is B shares per A share in a price-level regression, not a market beta.
export function fitPair(data, trainCount = 250) {
  validateData(data, trainCount);
  const train = data.slice(0, trainCount), meanA = average(train.map(x => x.a)), meanB = average(train.map(x => x.b));
  const ssB = train.reduce((sum, row) => sum + (row.b - meanB) ** 2, 0);
  if (ssB <= 1e-12) throw new RangeError('Training B prices need nonzero variation');
  const h = train.reduce((sum, row) => sum + (row.b - meanB) * (row.a - meanA), 0) / ssB;
  const intercept = meanA - h * meanB;
  const trainResiduals = train.map(row => row.a - intercept - h * row.b);
  const residualMean = average(trainResiduals), residualSD = sampleSD(trainResiduals);
  if (residualSD <= 1e-10) throw new RangeError('Training residual SD must be nonzero');
  return { h, intercept, residualMean, residualSD, trainCount };
}

export function pairResiduals(data, { h, intercept }) {
  return data.map(row => row.a - intercept - h * row.b);
}

export function hedgeExample({ marketReturn = 0.05, relativeReturn = 0.02, mode = 'dollar', longNotional = 10000, betaA = 1.2, betaB = 0.8 } = {}) {
  finite(marketReturn, 'Market return'); finite(relativeReturn, 'Relative return');
  positive(longNotional, 'Long notional'); positive(betaA, 'Beta A'); positive(betaB, 'Beta B');
  if (!['dollar', 'beta'].includes(mode)) throw new RangeError('Unknown hedge mode');
  const shortNotional = mode === 'beta' ? longNotional * betaA / betaB : longNotional;
  const returnA = betaA * marketReturn + relativeReturn / 2, returnB = betaB * marketReturn - relativeReturn / 2;
  const pnlA = longNotional * returnA, pnlB = -shortNotional * returnB;
  const betaDollars = mode === 'beta' ? 0 : longNotional * betaA - shortNotional * betaB;
  const marketPnl = betaDollars * marketReturn, relativePnl = (longNotional + shortNotional) * relativeReturn / 2;
  return { longNotional, shortNotional, grossNotional: longNotional + shortNotional, netNotional: longNotional - shortNotional,
    betaDollars, returnA, returnB, pnlA, pnlB, pnl: marketPnl + relativePnl, marketPnl, relativePnl };
}

export function closedTradeMetrics(trades) {
  const closedTrades = trades.length, wins = trades.filter(trade => trade.netPnl > 0).length;
  return { closedTrades, wins, winRate: closedTrades ? wins / closedTrades : null,
    averageTrade: closedTrades ? average(trades.map(trade => trade.netPnl)) : null };
}

/**
 * Close t signal -> close t+1 fill. Daily MTM happens before that day's fill.
 * Orders use only signal-close prices for size. Shares stay fixed until exit.
 * Borrow is annualRate / 252 times previous-close short market value.
 * The final close liquidation is scheduled in advance; no new final-day entry.
 * No dividends, cash interest, margin calls, or changing borrow availability.
 */
export function runPairBacktest({ data = generatePairData(), trainCount = 250, entryZ = 2, stopZ = 4, maxHold = 20,
  feeBps = 5, borrowRate = 0.03, initialCapital = 100000, targetGross = 20000 } = {}) {
  validateData(data, trainCount);
  for (const [name, value] of Object.entries({ entryZ, stopZ, initialCapital, targetGross })) positive(value, name);
  for (const [name, value] of Object.entries({ feeBps, borrowRate })) {
    finite(value, name); if (value < 0) throw new RangeError(`${name} must be nonnegative`);
  }
  if (stopZ <= entryZ || !Number.isInteger(maxHold) || maxHold < 1 || targetGross > initialCapital) {
    throw new RangeError('Require stopZ > entryZ, positive integer maxHold, and targetGross <= capital');
  }
  const fit = fitPair(data, trainCount);
  if (fit.h <= 0) throw new RangeError('This long/short example requires positive fitted h');
  const residuals = pairResiduals(data, fit), z = residuals.map(x => (x - fit.residualMean) / fit.residualSD);
  const feeRate = feeBps / 10000, rows = [], fills = [], trades = [];
  let cash = initialCapital, equity = initialCapital, qA = 0, qB = 0, currentTrade = null, pending = null;
  let peak = initialCapital, maxDrawdown = 0, totalFees = 0, totalBorrow = 0, grossPnl = 0;

  function decide(index) {
    if (index >= data.length - 1) return null;
    const signalZ = z[index];
    if (currentTrade) {
      const crossedMean = currentTrade.direction * signalZ >= 0;
      const stopped = currentTrade.direction * signalZ <= -stopZ;
      // A queued order needs one more interval before its next-close fill.
      const timedOut = index - currentTrade.entryIndex >= maxHold - 1;
      const reason = stopped ? 'stop' : crossedMean ? 'mean' : timedOut ? 'time' : null;
      return reason ? { type: 'exit', reason, signalIndex: index, signalZ } : null;
    }
    if (index >= data.length - 2 || Math.abs(signalZ) < entryZ || Math.abs(signalZ) >= stopZ) return null;
    const direction = signalZ < 0 ? 1 : -1;
    const units = targetGross / (data[index].a + fit.h * data[index].b);
    return { type: 'entry', direction, qA: direction * units, qB: -direction * units * fit.h, signalIndex: index, signalZ };
  }

  pending = decide(trainCount - 1);
  for (let index = trainCount; index < data.length; index++) {
    const row = data[index], previous = data[index - 1], oldEquity = equity;
    const markPnl = qA * (row.a - previous.a) + qB * (row.b - previous.b);
    const shortValue = Math.max(-qA * previous.a, 0) + Math.max(-qB * previous.b, 0);
    const borrow = shortValue * borrowRate / 252;
    cash -= borrow; totalBorrow += borrow; grossPnl += markPnl;
    if (currentTrade) currentTrade.borrow += borrow;
    let fee = 0, filled = null;
    if (index === data.length - 1 && currentTrade) pending = { type: 'exit', reason: 'end', signalIndex: null, signalZ: null };

    if (pending?.type === 'entry' && index < data.length - 1) {
      qA = pending.qA; qB = pending.qB;
      const turnoverA = Math.abs(qA * row.a), turnoverB = Math.abs(qB * row.b);
      fee = (turnoverA + turnoverB) * feeRate;
      cash -= qA * row.a + qB * row.b + fee;
      currentTrade = { direction: pending.direction, entryIndex: index, entryDay: index + 1, entrySignalIndex: pending.signalIndex,
        entryA: row.a, entryB: row.b, qA, qB, fees: fee, borrow: 0 };
      filled = { ...pending, index, day: index + 1, deltaA: qA, deltaB: qB, turnoverA, turnoverB, fee };
    } else if (pending?.type === 'exit' && currentTrade) {
      const turnoverA = Math.abs(qA * row.a), turnoverB = Math.abs(qB * row.b);
      fee = (turnoverA + turnoverB) * feeRate;
      cash += qA * row.a + qB * row.b - fee;
      const tradeGross = qA * (row.a - currentTrade.entryA) + qB * (row.b - currentTrade.entryB);
      currentTrade.fees += fee;
      trades.push({ ...currentTrade, exitIndex: index, exitDay: index + 1, exitSignalIndex: pending.signalIndex,
        exitA: row.a, exitB: row.b, holdingDays: index - currentTrade.entryIndex, reason: pending.reason,
        grossPnl: tradeGross, netPnl: tradeGross - currentTrade.fees - currentTrade.borrow });
      filled = { ...pending, index, day: index + 1, deltaA: -qA, deltaB: -qB, turnoverA, turnoverB, fee };
      qA = 0; qB = 0; currentTrade = null;
    }
    if (filled) fills.push(filled);
    totalFees += fee;
    equity = cash + qA * row.a + qB * row.b;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, (peak - equity) / peak);
    pending = decide(index);
    rows.push({ index, day: index + 1, a: row.a, b: row.b, z: z[index], qA, qB, cash, equity, grossPnl: markPnl, fee, borrow,
      dailyPnl: equity - oldEquity, dailyReturn: oldEquity > 0 ? (equity - oldEquity) / oldEquity : null,
      pendingType: pending?.type ?? null });
  }
  const netPnl = equity - initialCapital;
  return { fit, residuals, z, rows, fills, trades, parameters: { trainCount, entryZ, stopZ, maxHold, feeBps, borrowRate, initialCapital, targetGross },
    metrics: { ...closedTradeMetrics(trades), grossPnl, totalFees, totalBorrow, netPnl, finalEquity: equity,
      totalReturn: netPnl / initialCapital, maxDrawdown } };
}
