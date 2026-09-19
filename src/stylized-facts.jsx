import React, { useMemo, useState } from 'react';
import { Chart, Range, LabTitle, format } from './ui.jsx';
import { normalPdf, normalCdf } from './tail-risk.mjs';
import { acf, moments, clusteredReturns, shuffle, varianceMixture, intradaySample, realizedVariance } from './stylized-facts.mjs';

export function ClusteringLab() {
  const [shuffled,setShuffled]=useState(false),[kind,setKind]=useState('absolute');
  const original=useMemo(()=>clusteredReturns(),[]), permuted=useMemo(()=>shuffle(original),[original]);
  const returns=shuffled?permuted:original;
  const transform=r=>kind==='squared'?r*r:kind==='absolute'?Math.abs(r):r;
  const rho=acf(returns.map(transform)), stats=moments(returns), limit=Math.max(...original.map(Math.abs))*100*1.08;
  const reference=1.96/Math.sqrt(returns.length);
  return <div className="lab"><LabTitle title="สลับวันแล้วอะไรหายไป">ผลตอบแทนจำลอง 600 วัน · สลับ SD 0.5% กับ 2.5% ทุก 50 วัน · Normal shocks อิสระ · seed 2524</LabTitle>
    <div className="segmented" role="group" aria-label="ลำดับผลตอบแทน"><button aria-pressed={!shuffled} onClick={()=>setShuffled(false)}>เรียงวันเดิม</button><button aria-pressed={shuffled} onClick={()=>setShuffled(true)}>สับลำดับวัน</button></div>
    <Chart title="ผลตอบแทนจำลองตามลำดับวัน" description={`ข้อมูล ${returns.length} ค่า ${shuffled?'สับลำดับแล้ว':'ลำดับเดิม'} ค่าเฉลี่ยและ histogram ไม่เปลี่ยนเมื่อสับลำดับ`} xDomain={[1,600]} yDomain={[-limit,limit]} xTicks={[1,150,300,450,600]} xLabel="วันลำดับที่" yLabel="Log return (%)" lines={[{values:returns.map((r,i)=>[i+1,100*r]),width:1.2}]} />
    <div className="segmented" role="group" aria-label="ข้อมูลที่ใช้คำนวณ ACF">{[['raw','r'],['absolute','|r|'],['squared','r²']].map(([value,label])=><button key={value} aria-pressed={kind===value} onClick={()=>setKind(value)}>ACF ของ {label}</button>)}</div>
    <Chart title={`Sample autocorrelation ของ ${kind}`} description={`Lag 1 เท่ากับ ${format(rho[1],3)} เส้นอ้างอิง iid บวกลบ ${format(reference,3)}`} xDomain={[.5,20.5]} yDomain={[-.2,.6]} xTicks={[1,5,10,15,20]} xLabel="Lag (วัน)" yLabel="Autocorrelation" yFormat={v=>format(v,2)} bars={rho.slice(1).map((y,i)=>({x:i+.7,y,width:.6}))} lines={[{values:[[.5,reference],[20.5,reference]],className:'secondary-line'},{values:[[.5,-reference],[20.5,-reference]],className:'secondary-line'}]} />
    <div className="results" aria-live="polite"><div><span>ACF ที่ lag 1</span><strong>{format(rho[1],3)}</strong><p>{kind==='raw'?'ผลตอบแทน':kind==='absolute'?'ขนาดผลตอบแทน |r|':'ผลตอบแทนยกกำลังสอง r²'}</p></div><div><span>Sample SD · ต่อวัน</span><strong>{format(stats.sd*100,3)}%</strong><p>Moment kurtosis = {format(stats.kurtosis,3)}</p></div></div>
    <p className="lab-note">สับด้วย seed 731 โดยไม่เปลี่ยนค่าตัวเลขในชุดข้อมูล จึงได้ mean, SD, kurtosis และ histogram เดิม · เส้นประ ±1.96/√600 เป็นกรอบอ้างอิง 95% ภายใต้ iid ต่อหนึ่ง lag ไม่ใช่การยืนยันว่าผ่านการทดสอบทุก lag หรือว่าเป็น iid</p>
  </div>;
}

export function MixtureLab() {
  const [p,setP]=useState(20),[ratio,setRatio]=useState(5);
  const model=varianceMixture(p/100,ratio), grid=Array.from({length:321},(_,i)=>-8+i*.05);
  const probability=model.tail(3), normalTail=2*normalCdf(-3);
  return <div className="lab"><LabTitle title="ผสมวันสงบกับวันผันผวน">Normal สองกลุ่ม ค่าเฉลี่ยศูนย์เท่ากัน · ปรับสเกลให้ variance รวมเป็น 1 ก่อนเทียบกับ Standard Normal</LabTitle>
    <div className="controls two"><Range label="สัดส่วนช่วง SD สูง" value={p} onChange={setP} min={5} max={95} step={5} suffix="%" /><Range label="SD สูงเป็นกี่เท่าของ SD ต่ำ" value={ratio} onChange={setRatio} min={1} max={6} step={.5} suffix=" เท่า" /></div>
    <Chart title="Normal variance mixture เทียบกับ Normal ที่ variance เท่ากัน" description={`Kurtosis ${format(model.kurtosis,3)} โอกาสห่างค่าเฉลี่ยเกิน 3 SD ${format(probability*100,3)}%`} xDomain={[-8,8]} yDomain={[0,Math.max(.44,model.density(0)*1.12)]} xTicks={[-8,-4,0,4,8]} xLabel="ผลตอบแทน / SD รวม" yLabel="ความหนาแน่น" yFormat={x=>format(x,2)} lines={[{values:grid.map(x=>[x,model.density(x)])},{values:grid.map(x=>[x,normalPdf(x)]),className:'secondary-line'}]} />
    <div className="legend"><span className="mean-key">Mixture · ม่วงทึบ</span><span className="median-key">Normal · เขียวประ</span></div>
    <div className="results" aria-live="polite"><div><span>Kurtosis ทฤษฎี</span><strong>{format(model.kurtosis,3)}</strong><p>Normal = 3 · excess = {format(model.kurtosis-3,3)}</p></div><div><span>โอกาสเกิน ±3 SD รวม</span><strong>{format(probability*100,3)}%</strong><p>Normal = {format(normalTail*100,3)}% · นับสองหาง</p></div></div>
    <p className="lab-note">สูตรคำนวณหางรวมถึงอนันต์ แม้กราฟแสดงเฉพาะ ±8 SD · เลื่อนอัตราส่วน SD เป็น 1 เพื่อให้เส้นทั้งสองทับกัน การผสมการแจกแจงเพียงอย่างเดียวไม่ได้กำหนดว่าวันผันผวนจะเรียงติดกันหรือไม่</p>
  </div>;
}

export function RealizedVolatilityLab() {
  const [noise,setNoise]=useState(3),[stride,setStride]=useState(5);
  const sample=useMemo(()=>intradaySample(noise),[noise]);
  const latent=realizedVariance(sample.latent,stride), observed=realizedVariance(sample.observed,stride);
  const intervals=[1,2,5,10,15,30], metrics=intervals.map(s=>({latent:realizedVariance(sample.latent,s),observed:realizedVariance(sample.observed,s)}));
  const max=Math.max(...metrics.map(m=>Math.max(m.latent.variance,m.observed.variance)*10000))*1.15;
  const pricePoints=sample.observed.map((v,i)=>[i,100*Math.exp(v)]), cleanPoints=sample.latent.map((v,i)=>[i,100*Math.exp(v)]);
  const prices=[...pricePoints,...cleanPoints].map(p=>p[1]), lo=Math.min(...prices)-.1,hi=Math.max(...prices)+.1;
  return <div className="lab"><LabTitle title="เก็บราคาถี่ขึ้น แล้ว RV ดีขึ้นเสมอไหม">วันจำลอง 390 นาที · log price แท้เป็น Brownian ที่มี SD ต่อช่วงเปิดตลาด 1% · seed 81 · ไม่มี overnight return</LabTitle>
    <Range label="ขนาด noise ของ log price (±η)" value={noise} onChange={setNoise} min={0} max={10} step={.5} suffix=" bps" />
    <Chart title="ราคาแฝงและราคาที่มี measurement noise" description="ใช้เส้นทางราคาแฝงเดิมและเครื่องหมาย noise ชุดเดิมทุกครั้งที่เลื่อน ปรับเพียงขนาด noise" xDomain={[0,390]} yDomain={[lo,hi]} xTicks={[0,100,200,300,390]} xLabel="นาทีตั้งแต่เปิดตลาด" yLabel="ราคา (หน่วยสมมติ)" yFormat={v=>format(v,2)} lines={[{values:pricePoints,width:1},{values:cleanPoints,className:'secondary-line',width:2}]} />
    <div className="legend"><span className="mean-key">ราคาที่มี noise · ม่วง</span><span className="median-key">ราคาแฝง · เขียวประ</span></div>
    <div className="segmented" role="group" aria-label="ช่วงห่างการเก็บราคา">{[1,5,15,30,390].map(s=><button key={s} aria-pressed={stride===s} onClick={()=>setStride(s)}>{s===390?'ต้น–ปลายวัน':`${s} นาที`}</button>)}</div>
    <Chart title="Realized variance เมื่อใช้ช่วงห่างตัวอย่างต่างกัน" description="แต่ละคู่แท่งเปรียบเทียบ RV จากราคาแฝงกับราคาที่มี noise บนเส้นทางเดียวกัน" xDomain={[-.5,5.5]} yDomain={[0,max]} xTicks={[0,1,2,3,4,5]} xFormat={i=>intervals[i]} yFormat={v=>format(v,2)} xLabel="ช่วงห่างตัวอย่าง (นาที; แท่งเป็นหมวด)" yLabel="RV (%²)" bars={metrics.flatMap((m,i)=>[{x:i-.32,y:m.latent.variance*10000,width:.3,className:'rv-latent-bar'},{x:i+.02,y:m.observed.variance*10000,width:.3}])} />
    <p className="lab-note">แท่งซ้ายสีเขียว = ราคาแฝง · แท่งขวาสีม่วง = ราคาที่มี noise</p>
    <div className="results" aria-live="polite"><div><span>√RV จากราคาที่มี noise</span><strong>{format(observed.volatility*100,3)}%</strong><p>RV = {format(observed.variance,7)} ในหน่วยทศนิยม²</p></div><div><span>√RV จากราคาแฝง</span><strong>{format(latent.volatility*100,3)}%</strong><p>{observed.count} ผลตอบแทน · เก็บทุก {stride} นาที</p></div></div>
    <p className="lab-note">เลือกช่วงห่างด้านบนเพื่ออ่านค่าคำนวณด้านล่าง ทุกคู่แท่งแสดงความถี่ของตัวเอง · noise สุ่มเป็น ±η อย่างอิสระที่แต่ละราคา และเป็นอิสระจากราคาแฝง ภายใต้แบบจำลองนี้ส่วนเพิ่มของ E[RV] จาก noise คือ 2Nη² = {format(2*observed.count*sample.eta**2*10000,4)} %² สำหรับ N = {observed.count} · RV ของวันจำลองเดียวอาจไม่เรียงตามความถี่อย่างสม่ำเสมอ</p>
  </div>;
}
