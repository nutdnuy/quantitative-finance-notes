import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { normalPdf } from '../src/tail-risk.mjs';
import { returnPair, moments, acf, portmanteau, shuffle, clusteredReturns, varianceMixture, realizedVariance, intradaySample, intradayProfile } from '../src/stylized-facts.mjs';
import { sp500Data, sp500Dates, sp500Returns } from '../src/sp500-data.mjs';
const close=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${a} != ${b}`);
close(returnPair(100,99,2).simple,.01);close(returnPair(100,99,2).log,Math.log(1.01));
close(Math.expm1(Math.log(1.2)+Math.log(.8)),-.04);
assert.deepEqual(acf([5,5,5],1),[null,null]);
close(acf([1,2,3,4],1)[1],.25);
close(portmanteau([1,2,3,4],1).boxPierce,.25);
close(portmanteau([1,2,3,4],1).ljungBox,.5);
const r=clusteredReturns(), shuffled=shuffle(r);
assert.equal(r.length,600);assert.deepEqual([...r].sort((a,b)=>a-b),[...shuffled].sort((a,b)=>a-b));
for(const key of ['mean','sd','variance','kurtosis'])close(moments(r)[key],moments(shuffled)[key]);
assert.ok(acf(r.map(Math.abs))[1]>.3);assert.ok(Math.abs(acf(r)[1])<.1);
assert.ok(Math.abs(acf(shuffled.map(Math.abs))[1])<.1);
// Verify the retained source, every transformed price row, and independent numerical anchors.
const raw=readFileSync(new URL('../data/sp500-arch-8.0.0.csv.gz',import.meta.url));
const sourceHash='1e028cbb9c400cc018c816ccc439b33c919387e726c3ed5ca2c05c82746059de';
assert.equal(createHash('sha256').update(raw).digest('hex'),sourceHash);
assert.equal(sp500Data.source_sha256,sourceHash);
const sourceRows=gunzipSync(raw).toString('utf8').trim().split(/\r?\n/);
assert.equal(sourceRows.shift(),'Date,Open,High,Low,Close,Adj Close,Volume');
const expectedPrices=sourceRows.map(row=>{
  const [date,,, ,close,adjusted]=row.split(',');
  const [month,day,year]=date.split('/');
  assert.equal(close,adjusted,'This price-index source has equal Close and Adj Close fields');
  return [`${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`,Number(close)];
});
assert.deepEqual(sp500Data.prices,expectedPrices);
assert.equal(sp500Data.price_count,5031);assert.equal(sp500Data.return_count,5030);
assert.equal(sp500Data.prices.length,5031);assert.equal(sp500Returns.length,5030);
assert.deepEqual(sp500Data.prices[0],['1999-01-04',1228.099976]);
assert.deepEqual(sp500Data.prices.at(-1),['2018-12-31',2506.850098]);
assert.equal(sp500Data.price_start,'1999-01-04');assert.equal(sp500Data.price_end,'2018-12-31');
assert.equal(sp500Dates[0],'1999-01-05');assert.equal(sp500Dates.at(-1),'2018-12-31');
assert.equal(sp500Data.return_start,sp500Dates[0]);assert.equal(sp500Data.return_end,sp500Dates.at(-1));
for(const [i,[date,price]] of sp500Data.prices.entries()){
  assert.match(date,/^\d{4}-\d{2}-\d{2}$/);assert.ok(Number.isFinite(price)&&price>0);
  assert.ok([1,2,3,4,5].includes(new Date(`${date}T00:00:00Z`).getUTCDay()));
  if(i>0){
    assert.ok(date>sp500Data.prices[i-1][0],'Trading dates must be unique and increasing');
    assert.equal(sp500Dates[i-1],date);
    close(sp500Returns[i-1],Math.log(price)-Math.log(sp500Data.prices[i-1][1]),1e-14);
  }
}
close(sp500Returns[0],0.013490590680341384,1e-14);
close(sp500Returns.at(-1),0.008456626093618929,1e-14);
close(moments(sp500Returns).sd,0.01203839301555574,1e-14);
// Reference values independently evaluated with Python statistics.mean and math.fsum.
for(const [values,lag1,lag20] of [[sp500Returns,-0.07008395209092903,0.018932109172200774],
  [sp500Returns.map(Math.abs),0.24425694027224978,0.2383946135994271],
  [sp500Returns.map(v=>v*v),0.20805405227974333,0.2161213163335858]]){
  const rho=acf(values);close(rho[1],lag1,1e-12);close(rho[20],lag20,1e-12);
}
const marketShuffled=shuffle(sp500Returns);
assert.deepEqual([...sp500Returns].sort((a,b)=>a-b),[...marketShuffled].sort((a,b)=>a-b));
for(const key of ['mean','sd','variance','kurtosis'])close(moments(sp500Returns)[key],moments(marketShuffled)[key]);
// Analytical mixture compared with direct numerical density integrals.
const mix=varianceMixture(.2,5);close(mix.kurtosis,11.218787158145064);
const integrals=[0,0,0];const step=.002;
for(let x=-25+step/2;x<25;x+=step){const f=mix.density(x)*step;integrals[0]+=f;integrals[1]+=x*x*f;integrals[2]+=x**4*f;}
close(integrals[0],1,1e-8);close(integrals[1],1,1e-8);close(integrals[2],mix.kurtosis,1e-8);
for(let p=5;p<=95;p+=5)for(let ratio=1;ratio<=6;ratio+=.5){const m=varianceMixture(p/100,ratio);assert.ok(m.kurtosis>=3-1e-12);assert.ok(m.tail(3)>0&&m.tail(3)<1);}
for(const p of [0,.2,1])close(varianceMixture(p,1).density(1.3),normalPdf(1.3));
const path=[0,.01,0,.01,0];close(realizedVariance(path).variance,.0004);close(realizedVariance(path).volatility,.02);close(realizedVariance(path,4).variance,0);
for(let noise=0;noise<=10;noise+=.5){const s=intradaySample(noise);for(const stride of [1,2,5,10,15,30,390]){const a=realizedVariance(s.latent,stride),b=realizedVariance(s.observed,stride);assert.equal(b.count,390/stride);assert.ok(Number.isFinite(b.variance));if(noise===0)close(a.variance,b.variance);}}
const a=intradaySample(0),b=intradaySample(10);assert.deepEqual(a.latent,b.latent);
for(const news of [false,true])close(intradayProfile(news).reduce((s,v)=>s+v,0),1);
// Cross-language parity uses a separate stdlib Python implementation / notebook helper.
const reference=JSON.parse(execFileSync('python3',['-c',`import sys,json
sys.path.insert(0,'scripts')
from stylized_facts_math import *
from sp500_data import load_sp500
r=clustered_returns();s=intraday_sample()
data,dates,market=load_sp500()
print(json.dumps({'r':r,'shuffled':shuffle(r),'acf':acf(r),'moments':moments(r),'latent':s['latent'],'observed':s['observed'],'profile':intraday_profile(),
  'market':market,'dates':dates,'market_shuffled':shuffle(market),'market_acf':acf(market),'market_abs_acf':acf([abs(v) for v in market]),
  'market_squared_acf':acf([v*v for v in market]),'market_moments':moments(market)}))`],{encoding:'utf8'}));
for(const [left,right] of [[r,reference.r],[shuffled,reference.shuffled],[acf(r),reference.acf],[intradaySample().latent,reference.latent],[intradaySample().observed,reference.observed],[intradayProfile(),reference.profile]])for(let i=0;i<left.length;i++)close(left[i],right[i],1e-12);
for(const key of Object.keys(reference.moments))close(moments(r)[key],reference.moments[key],1e-12);
assert.deepEqual(sp500Dates,reference.dates);
for(const [left,right] of [[sp500Returns,reference.market],[marketShuffled,reference.market_shuffled],
  [acf(sp500Returns),reference.market_acf],[acf(sp500Returns.map(Math.abs)),reference.market_abs_acf],
  [acf(sp500Returns.map(v=>v*v)),reference.market_squared_acf]]){
  assert.equal(left.length,right.length);
  for(let i=0;i<left.length;i++)close(left[i],right[i],1e-12);
}
for(const key of Object.keys(reference.market_moments))close(moments(sp500Returns)[key],reference.market_moments[key],1e-12);
assert.throws(()=>returnPair(0,100),RangeError);assert.throws(()=>acf([1,2],2),RangeError);assert.throws(()=>realizedVariance(path,3),RangeError);assert.throws(()=>varianceMixture(-.1,3),RangeError);assert.throws(()=>intradaySample(11),RangeError);
console.log('Stylized facts passed: S&P 500 source hash, all 5,031 price rows, 5,030 returns, date integrity, independent ACF anchors, synthetic checks, shuffle invariance, mixture integration, nested RV grids and Python/JS parity.');
