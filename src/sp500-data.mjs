import snapshot from '../data/sp500-daily.json' with { type: 'json' };

// The first close provides the baseline; no artificial zero return is added.
export const sp500Data = snapshot;
export const sp500Dates = snapshot.prices.slice(1).map(([date]) => date);
export const sp500Returns = snapshot.prices.slice(1).map(([, close], i) =>
  Math.log(close / snapshot.prices[i][1]));
