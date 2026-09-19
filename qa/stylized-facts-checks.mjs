import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { normalPdf } from '../src/tail-risk.mjs';
import { returnPair, moments, acf, portmanteau, shuffle, clusteredReturns, varianceMixture, realizedVariance, intradaySample, intradayProfile } from '../src/stylized-facts.mjs';
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
r=clustered_returns();s=intraday_sample()
print(json.dumps({'r':r,'shuffled':shuffle(r),'acf':acf(r),'moments':moments(r),'latent':s['latent'],'observed':s['observed'],'profile':intraday_profile()}))`],{encoding:'utf8'}));
for(const [left,right] of [[r,reference.r],[shuffled,reference.shuffled],[acf(r),reference.acf],[intradaySample().latent,reference.latent],[intradaySample().observed,reference.observed],[intradayProfile(),reference.profile]])for(let i=0;i<left.length;i++)close(left[i],right[i],1e-12);
for(const key of Object.keys(reference.moments))close(moments(r)[key],reference.moments[key],1e-12);
assert.throws(()=>returnPair(0,100),RangeError);assert.throws(()=>acf([1,2],2),RangeError);assert.throws(()=>realizedVariance(path,3),RangeError);assert.throws(()=>varianceMixture(-.1,3),RangeError);assert.throws(()=>intradaySample(11),RangeError);
console.log('Stylized facts passed: returns, ACF/Q references, shuffle invariance, mixture integration, all slider parameters, nested RV grids, units and Python/JS parity.');
