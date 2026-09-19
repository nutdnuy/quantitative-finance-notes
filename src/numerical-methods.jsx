import React, { useMemo, useState, useId } from 'react';
import { Chart, LabTitle, Range, format } from './ui.jsx';
import { monteCarloPrice, explicitFiniteDifference } from './numerical-methods.mjs';
import { bsValue } from './black-scholes.mjs';

function Kind({ kind, setKind }) {
  return <div className="segmented" aria-label="ชนิด European Option">{['call','put'].map(value => <button key={value} aria-pressed={kind===value} onClick={()=>setKind(value)}>{value==='call'?'Call':'Put'}</button>)}</div>;
}
function Choice({ label, value, values, onChange }) {
  const id=useId();
  return <div className="range numerical-choice"><label htmlFor={id}>{label}</label><select id={id} aria-label={label} value={value} onChange={event=>onChange(Number(event.target.value))}>{values.map(n=><option key={n} value={n}>{format(n,0)}</option>)}</select></div>;
}

export function NumericalMonteCarloLab() {
  const [kind,setKind]=useState('call'),[S,setS]=useState(100),[sigma,setSigma]=useState(20),[samples,setSamples]=useState(10000),[seed,setSeed]=useState(73);
  const d=useMemo(()=>monteCarloPrice({S,sigma:sigma/100,kind,samples,seed}),[S,sigma,kind,samples,seed]);
  const points=d.checkpoints.filter(p=>p.n>=100), first=points[0];
  const low=Math.min(d.benchmark,...points.map(p=>p.ciLow)),high=Math.max(d.benchmark,...points.map(p=>p.ciHigh)),pad=Math.max(.25,(high-low)*.12);
  const xEnd=Math.max(2.2,Math.log10(samples)),benchmark=[[2,d.benchmark],[xEnd,d.benchmark]];
  function reset(){setKind('call');setS(100);setSigma(20);setSamples(10000);setSeed(73);}
  return <div className="lab numerical-lab"><LabTitle title="Monte Carlo: ราคากับช่วงความเชื่อมั่น">European Option · K=100 ดอลลาร์ · r=3% ต่อปี · T=1 ปี · หุ้นไม่มีปันผล · exact GBM</LabTitle>
    <Kind kind={kind} setKind={setKind}/>
    <div className="controls two"><Range label="ราคาหุ้น S" value={S} onChange={setS} min={60} max={140} step={5} suffix=" ดอลลาร์"/><Range label="Volatility σ" value={sigma} onChange={setSigma} min={10} max={50} step={5} suffix="%"/><Choice label="จำนวนตัวอย่าง N" value={samples} values={[100,1000,10000,40000,100000]} onChange={setSamples}/></div>
    <div className="lab-actions"><span className="seed" data-numerical-mc="seed">seed {seed}</span><button onClick={()=>setSeed(seed+1)}>สุ่มชุดใหม่</button><button onClick={reset}>คืนค่าเริ่มต้น</button></div>
    <div className="results" aria-live="polite"><div><span>ราคา Monte Carlo (ดอลลาร์)</span><strong data-numerical-mc="price">{format(d.price,4)}</strong><p data-numerical-mc="se">SE = {format(d.se,4)} ดอลลาร์</p></div><div><span>ราคา Black–Scholes (ดอลลาร์)</span><strong data-numerical-mc="benchmark">{format(d.benchmark,4)}</strong><p>MC − benchmark = {format(d.price-d.benchmark,4)} ดอลลาร์</p></div></div>
    <p className="lab-note" role="status">ช่วงความเชื่อมั่นโดยประมาณ 95%: [{format(d.ciLow,4)}, {format(d.ciHigh,4)}] ดอลลาร์ · วัด sampling error ของราคาในแบบจำลอง</p>
    <Chart title="ค่าประมาณราคาสะสมและช่วงความเชื่อมั่น" description={`จำนวน ${samples} รอบ ราคา ${format(d.price,4)} ดอลลาร์ SE ${format(d.se,4)} ดอลลาร์ จุดสะสมใช้ตัวอย่างชุดเดียวกัน`} xDomain={[2,xEnd]} yDomain={[low-pad,high+pad]} xTicks={[100,1000,10000,100000].filter(n=>n<=samples).map(Math.log10)} xFormat={v=>format(10**v,0)} yFormat={v=>format(v,1)} xLabel="จำนวนรอบ N (แกน log)" yLabel="ราคา (ดอลลาร์)" lines={[{values:points.map(p=>[Math.log10(p.n),p.price])},{values:benchmark,className:'secondary-line'}]} band={{low:points.map(p=>[Math.log10(p.n),p.ciLow]),high:points.map(p=>[Math.log10(p.n),p.ciHigh])}} markers={points.length===1?[{x:Math.log10(first.n),y:first.price}]:[]}/>
    <div className="legend"><span className="mean-key">MC สะสม</span><span className="median-key">Black–Scholes</span><span className="band-key">ช่วงประมาณ 95%</span></div>
    <p className="lab-note">คง seed แล้วเพิ่ม N จะใช้ช็อกเดิมเป็นส่วนต้นของชุดใหม่ จุดบนกราฟจึงสัมพันธ์กัน ช่วงนี้ไม่ใช่ช่วงราคาหุ้น และไม่รวม model error · N=100 แสดงหนึ่งจุดพร้อมช่วงตัวเลขด้านบน</p>
  </div>;
}

export function NumericalFiniteDifferenceLab() {
  const [kind,setKind]=useState('call'),[S,setS]=useState(100),[sigma,setSigma]=useState(20),[r,setR]=useState(3),[M,setM]=useState(80),[L,setL]=useState(1000);
  const d=useMemo(()=>explicitFiniteDifference({S,sigma:sigma/100,r:r/100,kind,spaceSteps:M,timeSteps:L}),[S,sigma,r,kind,M,L]);
  const exact=bsValue({S,K:100,sigma:sigma/100,r:r/100,tau:1,kind});
  const thetaExact=-(.5*(sigma/100)**2*S*S*exact.gamma+(r/100)*S*exact.delta-(r/100)*exact.price);
  const shown=d.values.filter(p=>p.S>=40&&p.S<=160), max=Math.max(1,...shown.map(p=>Math.max(p.value,p.exact)))*1.08;
  const stepOptions=[...new Set([100,250,1000,4000,16000,L])].sort((a,b)=>a-b);
  function reset(){setKind('call');setS(100);setSigma(20);setR(3);setM(80);setL(1000);}
  function repair(){if(d.requiredTimeSteps!==null)setL(Math.max(1,d.requiredTimeSteps));}
  const number=value=>value===null?'—':format(value,6);
  return <div className="lab numerical-lab"><LabTitle title="Explicit finite difference: ราคาและเสถียรภาพ">European Option · K=100 ดอลลาร์ · T=1 ปี · Smax=400 ดอลลาร์ · ไม่มีปันผล · central difference</LabTitle>
    <Kind kind={kind} setKind={setKind}/>
    <div className="controls two"><Range label="จำนวนช่วงราคา M" value={M} onChange={setM} min={40} max={160} step={40}/><Choice label="จำนวน time step L" value={L} values={stepOptions} onChange={setL}/><Range label="ราคาหุ้น S" value={S} onChange={setS} min={60} max={140} step={5} suffix=" ดอลลาร์"/><Range label="Volatility σ" value={sigma} onChange={setSigma} min={10} max={50} step={5} suffix="%"/><Range label="ดอกเบี้ย r" value={r} onChange={setR} min={0} max={8} step={1} suffix="% ต่อปี"/></div>
    <div className="lab-actions"><button onClick={repair} disabled={d.requiredTimeSteps===null||d.stable}>ปรับ time step ให้ผ่านเกณฑ์</button><button onClick={reset}>คืนค่าเริ่มต้น</button></div>
    <p className="lab-note" role="status">{d.stable?'ผ่านเกณฑ์สัมประสิทธิ์ไม่ติดลบ':d.reason==='spatial-drift'?'ไม่ผ่าน: drift ทำให้สัมประสิทธิ์ข้างหนึ่งติดลบ ลด time step อย่างเดียวแก้ไม่ได้ จึงยังไม่คำนวณราคา':'ไม่ผ่าน: time step ใหญ่เกินเกณฑ์ จึงยังไม่คำนวณราคา'} · ΔS={format(d.dS,3)} ดอลลาร์ · Δτ={format(d.dt,6)} ปี</p>
    <p className="lab-note">สัมประสิทธิ์ต่ำสุด = {format(d.minWeight,6)} · {d.requiredTimeSteps===null?'ปรับ r หรือ σ เพื่อให้ central difference ผ่านเงื่อนไขด้าน drift':`ต้องใช้ L อย่างน้อย ${format(d.requiredTimeSteps,0)} step สำหรับเกณฑ์นี้`} · ผ่านเกณฑ์แล้วก็ยังมี error จากกริดและขอบ</p>
    {d.stable&&<><div className="results"><div><span>ราคา finite difference (ดอลลาร์)</span><strong data-numerical-fd="price">{format(d.price,4)}</strong><p>FD − benchmark = {format(d.price-d.benchmark,4)} ดอลลาร์</p></div><div><span>ราคา Black–Scholes (ดอลลาร์)</span><strong data-numerical-fd="benchmark">{format(d.benchmark,4)}</strong><p>สมมติฐานเดียวกับกริด</p></div></div>
      <Chart title="ราคา Option บนกริดเทียบกับสูตร" description={`แสดงช่วงราคา S=40 ถึง 160 ดอลลาร์จากกริด 0 ถึง 400 ค่า finite difference ที่ S=${S} เท่ากับ ${format(d.price,4)} ดอลลาร์`} xDomain={[40,160]} yDomain={[0,max]} xLabel="ราคาหุ้น S (ดอลลาร์)" yLabel="ราคา Option (ดอลลาร์)" xTicks={[40,70,100,130,160]} lines={[{values:shown.map(p=>[p.S,p.value])},{values:shown.map(p=>[p.S,p.exact]),className:'secondary-line'}]} markers={[{x:S,y:d.price}]}/>
      <div className="legend"><span className="mean-key">Finite difference</span><span className="median-key">Black–Scholes</span></div>
      <div className="table-wrap"><table><caption>Greeks ที่ S={S} ดอลลาร์ · เวลาเหลือ 1 ปี</caption><thead><tr><th scope="col">ค่าที่ดู</th><th scope="col">Finite difference</th><th scope="col">Black–Scholes</th></tr></thead><tbody>{[['Delta',d.delta,exact.delta],['Gamma (ต่อดอลลาร์)',d.gamma,exact.gamma],['Theta (ดอลลาร์/ปี)',d.theta,thetaExact]].map(([name,value,benchmark])=><tr key={name}><th scope="row">{name}</th><td>{number(value)}</td><td>{number(benchmark)}</td></tr>)}</tbody></table></div>
      <p className="lab-note">กราฟขยายเฉพาะ S=40–160 จากกริดเต็ม 0–400 ดอลลาร์ หาก S ไม่ตรงจุดกริด ราคาและ Greeks ใช้ linear interpolation · Theta ใช้เครื่องหมายตามเวลา t</p>
    </>}
  </div>;
}
