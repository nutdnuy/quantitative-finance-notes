import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import {PRICE_A,PRICE_B,priceReturns,summaryStats,arma11,simulateArma,fractionalWeights,arfimaAcf,calendarAcf,squaredLinearCorrelation} from '../src/return-foundations.mjs';
const close=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<tol*Math.max(1,Math.abs(b)),`${a} != ${b}`);
for(const prices of [PRICE_A,PRICE_B]){
 const returns=priceReturns(prices);close(returns.reduce((p,r)=>p*(1+r.simple),1),1.04);close(returns.reduce((p,r)=>p+r.log,0),Math.log(1.04));
 for(const scale of [.2,.5,1,2])priceReturns(prices.map(p=>p*scale)).forEach((r,i)=>{close(r.simple,returns[i].simple);close(r.log,returns[i].log);});
}
const s=summaryStats([-.02,-.01,0,.01,.06]);close(s.mean,.008);close(s.variance,.000776);close(s.sd,Math.sqrt(.00097));close(s.skewness,1.0391889223704167);close(s.kurtosis,2.6687745775321496);
// Independently recover ARMA moments from 800 linear coefficients across every UI pair.
for(let pi=-9;pi<=9;pi++)for(let ti=-9;ti<=9;ti++){
 const phi=pi/10,theta=ti/10,m=arma11(phi,theta),psi=[1,...Array.from({length:799},(_,i)=>(phi+theta)*phi**i)];
 const variance=psi.reduce((s,x)=>s+x*x,0);close(m.variance,variance);
 for(const lag of [1,2,5,20])close(m.acf[lag],psi.slice(lag).reduce((s,x,i)=>s+x*psi[i],0)/variance);
 assert.ok(simulateArma(phi,theta).every(Number.isFinite));
}
close(arma11(.6,.3).variance,2.265625);close(arma11(.6,-.6).acf[1],0);close(arma11(0,-1).acf[1],-.5);
fractionalWeights(1,4).forEach((x,i)=>close(x,[1,-1,0,0][i]));close(fractionalWeights(.3,4)[3],-.0595);close(arfimaAcf(.3)[2],.3277310924369748);
for(let si=0;si<=12;si++)for(let ni=2;ni<=20;ni++){
 const c=calendarAcf(si/4,ni/1000);assert.ok(c.acf.every(x=>Number.isFinite(x)&&Math.abs(x)<=1));
 close(c.acf[5],c.between/c.variance);close(c.acf[10],c.acf[5]);
}
const c=calendarAcf();close(c.acf[1],-1/104);close(c.acf[5],4/104);
assert.ok(calendarAcf(0).acf.slice(1).every(x=>x===0));
// Pooled covariance independently enumerates phases and independent two-point shocks.
for(const lag of [1,5]){let covariance=0;for(let d=0;d<5;d++)for(const a of [-.01,.01])for(const b of [-.01,.01])covariance+=(c.means[d]+a)*(c.means[(d-lag%5+5)%5]+b)/20;close(covariance/c.variance,c.acf[lag]);}
// Exact 27-outcome non-Gaussian MA example: no simulation error, kurtosis 6.
const support=[[-Math.sqrt(6),1/12],[0,5/6],[Math.sqrt(6),1/12]];let e2=0,e4=0,cross=0;
for(const [a,pa] of support)for(const [b,pb] of support)for(const [c,pc] of support){const p=pa*pb*pc,x=a+.5*b,y=b+.5*c;e2+=p*x*x;e4+=p*x**4;cross+=p*x*x*y*y;}
close((cross-e2*e2)/(e4-e2*e2),20/101);close(squaredLinearCorrelation([1,.5],3),20/101);close(squaredLinearCorrelation([1,.5],0),.16);
const reference=JSON.parse(execFileSync('python3',['-c',`import sys,json
sys.path.insert(0,'scripts')
from return_foundations_math import *
print(json.dumps({'sample':simulate_arma(.6,.3),'arma':arma11(.6,.3),'prices':price_returns(PRICE_B),'calendar':calendar_acf(),'fractional':fractional_weights(.3),'arfima':arfima_acf(.3)}))`],{encoding:'utf8'}));
for(const [a,b] of [[simulateArma(.6,.3),reference.sample],[arma11(.6,.3).acf,reference.arma.acf],[calendarAcf().acf,reference.calendar.acf],[fractionalWeights(.3),reference.fractional],[arfimaAcf(.3),reference.arfima]])a.forEach((x,i)=>close(x,b[i],1e-12));
priceReturns(PRICE_B).forEach((r,i)=>close(r.simple,reference.prices[i].simple));
assert.throws(()=>arma11(1,.2));assert.throws(()=>priceReturns([100,0]));assert.throws(()=>arfimaAcf(.5));assert.throws(()=>calendarAcf(1,0));
const provenance=JSON.parse(fs.readFileSync('data/return-foundations-provenance.json','utf8'));
assert.equal(provenance.coverage.length,31);assert.equal(new Set(provenance.coverage.map(x=>x.section)).size,31);
for(const item of provenance.coverage){const text=fs.readFileSync(item.file,'utf8');for(const anchor of [item.anchor,...item.additional_anchors||[]])assert.ok(text.includes(`id="${anchor}"`),item.section+': '+anchor);}
console.log('Foundations passed: returns/units; all ARMA sliders vs MA expansion; fractional weights; independent calendar moments; exact non-Gaussian squared MA; Python parity; 31 coverage anchors.');
