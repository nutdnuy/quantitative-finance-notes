import { normalGenerator, mean } from './math.mjs';
import { moments } from './stylized-facts.mjs';
export const PRICE_A=[100,102,101,103,102,104];
export const PRICE_B=[100,98,103,99,106,104];
export function priceReturns(prices) {
  if(!Array.isArray(prices)||prices.length<2||prices.some(p=>!Number.isFinite(p)||p<=0))throw new RangeError('Positive finite prices required.');
  return prices.slice(1).map((p,i)=>({simple:p/prices[i]-1,log:Math.log(p/prices[i])}));
}
export function summaryStats(values) {
  const s=moments(values),m3=mean(values.map(x=>(x-s.mean)**3));
  return {...s,skewness:s.variance>0?m3/s.variance**1.5:null};
}
export function arma11(phi,theta,innovationVariance=1,maxLag=20) {
  if(![phi,theta,innovationVariance].every(Number.isFinite)||Math.abs(phi)>=1||innovationVariance<=0||!Number.isInteger(maxLag)||maxLag<0)throw new RangeError('Stationary AR coefficient and positive innovation variance required.');
  const numerator=1+theta*theta+2*phi*theta;
  const rho1=(phi+theta)*(1+phi*theta)/numerator;
  return {variance:innovationVariance*numerator/(1-phi*phi),acf:Array.from({length:maxLag+1},(_,k)=>k===0?1:rho1*phi**(k-1))};
}
export function simulateArma(phi,theta,count=600,seed=303) {
  arma11(phi,theta);
  if(!Number.isInteger(count)||count<2)throw new RangeError('At least two observations required.');
  const random=normalGenerator(seed),out=[];let previous=0,previousShock=0;
  for(let i=0;i<count+1000;i++){const shock=random(),x=phi*previous+shock+theta*previousShock;if(i>=1000)out.push(x);previous=x;previousShock=shock;}
  return out;
}
export function fractionalWeights(d,count=20) {
  if(!Number.isFinite(d)||!Number.isInteger(count)||count<1)throw new RangeError('Invalid fractional weights.');
  const w=[1];for(let j=1;j<count;j++)w.push(w.at(-1)*(j-1-d)/j);return w;
}
export function arfimaAcf(d,maxLag=20) {
  if(!Number.isFinite(d)||d<=-.5||d>=.5||!Number.isInteger(maxLag)||maxLag<0)throw new RangeError('Stationary/invertible fractional parameter required.');
  const rho=[1];for(let k=1;k<=maxLag;k++)rho.push(rho.at(-1)*(k-1+d)/(k-d));return rho;
}
export function calendarAcf(strength=1,noiseSd=.01,maxLag=15) {
  if(![strength,noiseSd].every(Number.isFinite)||strength<0||noiseSd<=0||!Number.isInteger(maxLag)||maxLag<0)throw new RangeError('Invalid calendar parameters.');
  const means=[-.004,.001,.001,.001,.001].map(x=>x*strength),average=mean(means),a=means.map(x=>x-average);
  const between=mean(a.map(x=>x*x)),variance=between+noiseSd*noiseSd;
  const rho=Array.from({length:maxLag+1},(_,k)=>k===0?1:mean(a.map((x,d)=>x*a[(d-k%5+5)%5]))/variance);
  return {means,variance,between,acf:rho};
}
export function squaredLinearCorrelation(psi,c4=0,innovationVariance=1,lag=1) {
  if(!Array.isArray(psi)||!psi.length||!psi.every(Number.isFinite)||!Number.isFinite(c4)||!Number.isFinite(innovationVariance)||innovationVariance<=0||!Number.isInteger(lag)||lag<0)throw new RangeError('Invalid linear process inputs.');
  const gamma0=innovationVariance*psi.reduce((s,x)=>s+x*x,0),gamma=innovationVariance*psi.reduce((s,x,j)=>s+x*(psi[j+lag]||0),0);
  const variance=2*gamma0**2+c4*psi.reduce((s,x)=>s+x**4,0);
  if(variance<=0)throw new RangeError('Squared-process variance must be positive.');
  return (2*gamma**2+c4*psi.reduce((s,x,j)=>s+x*x*(psi[j+lag]||0)**2,0))/variance;
}
