import assert from 'node:assert/strict';
import fs from 'node:fs';
import {jensen,mean,stdev,simulate,theoretical,rollingExample,histogram,eulerPath,nestedWiener,normalPdf} from '../src/math.mjs';
const close=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<=tol,`${a} != ${b}`);
close(jensen(50,100).expected,25);close(jensen(50,100).atMean,0);
for(const spread of [0,1,50,90]) for(const strike of [60,100,160]) assert.ok(jensen(spread,strike).expected>=jensen(spread,strike).atMean);
const data=JSON.parse(fs.readFileSync(new URL('../data/perez-companc-table-3-3.json',import.meta.url)));
assert.equal(data.length,34);assert.equal(data[0].date,'1995-03-01');assert.equal(data.at(-1).date,'1995-04-19');
const returns=data.slice(1).map((r,i)=>{close(r.reconstructed_return,r.printed_price/data[i].printed_price-1);return r.reconstructed_return*100;});
assert.notEqual(data[1].reconstructed_return,data[1].book_printed_return);
const z=returns.map(r=>(r-mean(returns))/stdev(returns));close(mean(z),0);close(stdev(z),1);
for(const bins of [6,8,10,12,14]) for(const [values,lo,hi] of [[returns,-20,20],[z,-4,4]]){
 const h=histogram(values,bins,lo,hi);assert.equal(h.reduce((s,b)=>s+b.count,0),33);close(h.reduce((s,b)=>s+b.density*b.width,0),1);
}
close(normalPdf(0),1/Math.sqrt(2*Math.PI));close(252*.002916,.734832);close(Math.sqrt(252)*.024521,.389258807391689);
const e=eulerPath();assert.equal(e.prices.length,101);assert.equal(e.terms.length,100);close(e.prices[0],100);close(e.terms[0].drift,.15);
e.terms.forEach((t,i)=>{close(t.next,t.current+t.drift+t.shock);close(t.next,e.prices[i+1]);close(t.shock,.25*t.current*.1*t.phi);});
assert.deepEqual(eulerPath(),eulerPath());assert.notDeepEqual(eulerPath({seed:74}),e);
const fine=nestedWiener(73,1024);
for(const steps of [4,16,64,256,1024]){const d=nestedWiener(73,steps);close(d.coarse.at(-1),fine.fine.at(-1));close(d.dt*steps,1);close(d.incrementSD**2,d.dt);close(d.increments.reduce((s,v)=>s+v,0),d.coarse.at(-1));d.coarse.forEach((v,i)=>close(v,fine.fine[i*1024/steps]));}
for(const w of [10,20,30,40]){const d=rollingExample(w);assert.equal(d.exitDay,35+w);assert.ok(d.rolling.slice(0,w-1).every(x=>x===null));assert.ok(d.rolling[d.exitDay-2]>d.rolling[d.exitDay-1]);}
const theory=theoretical(.15,.25,1,100);close(theory.expected,116.1834242728283);close(theory.median,112.60883610049078);
const params={mu:.15,sigma:.25,initial:100,seed:73};
for(const p of simulate({...params,sigma:0}))close(p.at(-1),theoretical(.15,0,1,100).expected,1e-8);
assert.deepEqual(simulate(params),simulate(params));assert.notDeepEqual(simulate(params),simulate({...params,seed:74}));
for(const p of simulate({...params,mu:-.1,sigma:.6}))assert.ok(p.every(v=>Number.isFinite(v)&&v>0));
const terminal=simulate({...params,seed:912,count:100000,steps:1}).map(p=>p.at(-1));
const se=stdev(terminal)/Math.sqrt(terminal.length);assert.ok(Math.abs(mean(terminal)-theory.expected)<4*se);
const result={status:'passed',checks:['Source Jensen example and convexity','34 printed prices / 33 reconstructed returns; source rounding distinction','Histogram total area 1 for every supported bin count; standardized mean 0 / sample SD 1','Source annualization','Euler recurrence and source parameters','Nested Wiener shared points, endpoint and theoretical variance','Rolling-window shock exit','GBM source initial price, exact moments, zero-volatility limit, reproducibility and positivity','100000-draw Monte Carlo mean within 4 standard errors'],monteCarlo:{mean:mean(terminal),theory:theory.expected,standardError:se}};
fs.writeFileSync(new URL('math-report.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
