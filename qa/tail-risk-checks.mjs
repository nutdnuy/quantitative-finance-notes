import assert from 'node:assert/strict';
import { normalRisk, normalCdf, normalQuantile, normalPdf, empiricalRisk, teachingLosses, portfolioRisk } from '../src/tail-risk.mjs';
const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a-b) <= tol * Math.max(1, Math.abs(b)), `${a} != ${b}`);

// Independent reference: Python statistics.NormalDist; exact finite examples below.
close(normalQuantile(.99), 2.3263478740408408);
close(normalQuantile(.975), 1.9599639845400536);
for (const c of [.0001,.01,.5,.95,.9999]) close(normalCdf(normalQuantile(c)), c, 1e-12);
const daily = normalRisk(0, 2210);
close(daily.var, 5141.228801630258); close(daily.es, 5890.123426964231);
close(normalRisk(0,2210,.99,10).var, daily.var * Math.sqrt(10));
close(normalRisk(100,2210,.99,10).var, daily.var * Math.sqrt(10)-1000);
close(normalRisk(100,0).var,-100); close(normalRisk(100,0).es,-100);
// Direct numerical tail integration checks the ES formula independently.
const z = normalQuantile(.99), step = (10-z)/20000;
let integral = 0;
for(let i=0;i<20000;i++){const x=z+(i+.5)*step;integral+=x*normalPdf(x)*step;}
close(integral/.01, normalRisk(0,1).es, 1e-7);

for(const worst of [20,40,60]) {
  const r = empiricalRisk(teachingLosses(worst));
  close(r.var,10); close(r.es,worst);
  close(empiricalRisk(teachingLosses(worst),.975).es,(worst+10+1)/2.5);
}
close(empiricalRisk([0,10,10,100],.5).es,55); // E[L|L>=VaR] would give the wrong answer.
close(empiricalRisk([0,10,10,100],.5).var,10);
close(empiricalRisk([-10,-5],.99).es,-5);
close(empiricalRisk([3],.995).es,3);
const single = [...Array(96).fill(0),...Array(4).fill(100)];
const combined = single.flatMap(a=>single.map(b=>a+b));
close(empiricalRisk(single,.95).var,0); close(empiricalRisk(single,.95).es,80);
close(empiricalRisk(combined,.95).var,100); close(empiricalRisk(combined,.95).es,103.2);
const inputs=teachingLosses();const copy=[...inputs];empiricalRisk(inputs);assert.deepEqual(inputs,copy);
const p=portfolioRisk();close(p.value,938);close(p.varDollars,28.742322855305677);close(p.esDollars,33.43524372304397);
close(portfolioRisk([4,2,2]).var,p.var);close(portfolioRisk([4,2,2]).varDollars,2*p.varDollars);
for(let a=1;a<=5;a++)for(let b=0;b<=5;b++)for(let c=0;c<=5;c++)for(const confidence of [.95,.975,.99,.995]){
  const r=portfolioRisk([a,b,c],confidence);assert.ok(r.es>=r.var);assert.ok(Number.isFinite(r.esDollars));close(r.weights.reduce((s,w)=>s+w,0),1);
}
for(const bad of [0,1,NaN]) assert.throws(()=>normalQuantile(bad),RangeError);
assert.throws(()=>normalRisk(0,-1),RangeError);assert.throws(()=>empiricalRisk([]),RangeError);assert.throws(()=>empiricalRisk([NaN]),RangeError);assert.throws(()=>portfolioRisk([0,0,0]),RangeError);
console.log('Tail risk: Normal references, tail integral, horizon, discrete/tied ES, coherence counterexample and all portfolio slider combinations passed.');
