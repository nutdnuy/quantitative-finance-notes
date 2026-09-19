import { normalGenerator, mean } from './math.mjs';
import { normalCdf, normalPdf } from './tail-risk.mjs';

function finiteSeries(values, minimum = 2) {
  if (!Array.isArray(values) || values.length < minimum || !values.every(Number.isFinite)) throw new RangeError('Finite observations required.');
}
function uniform(seed) {
  let state = seed >>> 0;
  return () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return (state + .5) / 4294967296; };
}

export function returnPair(previous, current, dividend = 0) {
  if (![previous, current, dividend].every(Number.isFinite) || previous <= 0 || current + dividend <= 0) throw new RangeError('Positive gross investment values required.');
  const simple = (current + dividend) / previous - 1;
  return { simple, log: Math.log1p(simple) };
}

export function moments(values) {
  finiteSeries(values);
  const average = mean(values), centered = values.map(x => x - average);
  const m2 = mean(centered.map(x => x*x)), m4 = mean(centered.map(x => x**4));
  return { mean: average, sd: Math.sqrt(m2 * values.length / (values.length-1)), variance: m2, kurtosis: m2 > 0 ? m4/(m2*m2) : null };
}

// Common sample mean and full-sample denominator, as specified in the lesson.
export function acf(values, maxLag = 20) {
  finiteSeries(values);
  if (!Number.isInteger(maxLag) || maxLag < 0 || maxLag >= values.length) throw new RangeError('Lag must be smaller than sample length.');
  const average = mean(values), x = values.map(v => v-average), denominator = x.reduce((s,v)=>s+v*v,0);
  if (denominator === 0) return Array(maxLag+1).fill(null);
  return Array.from({length:maxLag+1},(_,lag)=>x.slice(lag).reduce((s,v,i)=>s+v*x[i],0)/denominator);
}

export function portmanteau(values, lags = 20) {
  const rho = acf(values,lags);
  if (rho[0] === null) return { boxPierce: null, ljungBox: null };
  const n = values.length;
  return { boxPierce: n*rho.slice(1).reduce((s,v)=>s+v*v,0), ljungBox: n*(n+2)*rho.slice(1).reduce((s,v,i)=>s+v*v/(n-i-1),0) };
}

export function shuffle(values, seed = 731) {
  const out = [...values], random = uniform(seed);
  for (let i=out.length-1;i>0;i--) {const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
  return out;
}

export function clusteredReturns(seed = 2524) {
  const random = normalGenerator(seed);
  return Array.from({length:600},(_,i)=>random()*(Math.floor(i/50)%2===0 ? .005 : .025));
}

// Two centered Normal components; p is the probability of the high-volatility state.
export function varianceMixture(p = .2, ratio = 5) {
  if (!Number.isFinite(p) || p<0 || p>1 || !Number.isFinite(ratio) || ratio<1) throw new RangeError('Invalid mixture parameters.');
  const variance = (1-p)+p*ratio*ratio, sd = Math.sqrt(variance);
  const low = 1/sd, high = ratio/sd;
  return {
    variance, sd, low, high,
    kurtosis: 3*((1-p)+p*ratio**4)/variance**2,
    density: x => (1-p)*normalPdf(x/low)/low + p*normalPdf(x/high)/high,
    tail: threshold => 2*((1-p)*normalCdf(-Math.abs(threshold)/low)+p*normalCdf(-Math.abs(threshold)/high)),
  };
}

export function realizedVariance(logPrices, stride = 1) {
  finiteSeries(logPrices);
  if (!Number.isInteger(stride) || stride<1 || (logPrices.length-1)%stride!==0) throw new RangeError('Sampling interval must divide the session.');
  const returns=[];
  for(let i=stride;i<logPrices.length;i+=stride) returns.push(logPrices[i]-logPrices[i-stride]);
  const variance=returns.reduce((s,r)=>s+r*r,0);
  return { variance, volatility:Math.sqrt(variance), returns, count:returns.length };
}

export function intradaySample(noiseBps = 3, seed = 81) {
  if (!Number.isFinite(noiseBps) || noiseBps<0 || noiseBps>10) throw new RangeError('Noise must be between 0 and 10 bps.');
  const random=normalGenerator(seed), signs=uniform(seed+1000), latent=[0];
  for(let i=0;i<390;i++) latent.push(latent.at(-1)+.01/Math.sqrt(390)*random());
  const eta=noiseBps/10000, observed=latent.map(p=>p+eta*(signs()<.5?-1:1));
  return {latent,observed,eta,integratedVariance:.01**2};
}

export function intradayProfile(news = true) {
  const raw=Array.from({length:78},(_,i)=>1+3*Math.exp(-i/6)+2*Math.exp(-(77-i)/7)+(news?5*Math.exp(-.5*((i-30)/1.2)**2):0));
  const total=raw.reduce((s,v)=>s+v,0);
  return raw.map(v=>v/total);
}
