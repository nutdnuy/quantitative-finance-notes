import React, {useMemo,useState} from 'react';
import {format,Range,LabTitle,Chart} from './ui.jsx';
import {mean,stdev,histogram,normalPdf,eulerPath,nestedWiener} from './math.mjs';
import perez from '../data/perez-companc-table-3-3.json';
import CountUp from './components/CountUp.jsx';

export function ComparisonLab(){
  const [portfolio,setPortfolio]=useState(false);
  return <div className="lab"><LabTitle number="3.4" title="ขึ้น 10 ดอลลาร์เท่ากัน แต่ผลตอบแทนคนละขนาด">หุ้น A ราคา 100 ดอลลาร์ · หุ้น B ราคา 1,000 ดอลลาร์</LabTitle>
  <div className="segmented" aria-label="ฐานการเปรียบเทียบ"><button aria-pressed={!portfolio} onClick={()=>setPortfolio(false)}>เปรียบเทียบ 1 หุ้น</button><button aria-pressed={portfolio} onClick={()=>setPortfolio(true)}>ใช้เงินลงทุนเท่ากัน 1,000 ดอลลาร์</button></div>
  <div className="comparison-rows">{[{name:'A',price:100,shares:10,pct:10},{name:'B',price:1000,shares:1,pct:1}].map(a=><div key={a.name}><div className="row-label"><strong>หุ้น {a.name}</strong><span>{portfolio?`${a.shares} หุ้น · เงินเริ่มต้น 1,000 ดอลลาร์`:`1 หุ้น · ราคา ${a.price.toLocaleString()} ดอลลาร์`}</span><b>{a.pct}%</b></div><div className="bar-track"><div className={a.name==='A'?'comparison-fill':'comparison-fill secondary'} style={{width:`${a.pct*10}%`}} /></div><p>กำไรตามสมมติฐาน {portfolio?a.shares*10:10} ดอลลาร์</p></div>)}</div>
  <p className="lab-note">ความยาวแท่งแสดงผลตอบแทน: ช่วงแกน 0–10% เท่ากันทั้งสองแถว · สมมติราคาขึ้นหุ้นละ 10 ดอลลาร์ตามตัวอย่างหน้า 58 ไม่ได้เปรียบเทียบความเสี่ยงของหุ้นจริง</p></div>;
}

export function ReturnsLab(){
  const [index,setIndex]=useState(1),row=perez[index],previous=perez[index-1];
  const returns=perez.slice(1).map(r=>100*r.reconstructed_return);
  const dates=i=>perez[Math.round(i)]?.date.slice(5).replace('-','/')||'';
  return <div className="lab"><LabTitle number="3.5a" title="ข้อมูลชุดเดียวกัน มองเป็นราคา หรือผลตอบแทน">Perez Companc · 1 มี.ค.–19 เม.ย. 1995 · 34 ราคาจากตาราง 3.3 หน้า 60</LabTitle>
  <Range label="เลือกจุดราคาปลายช่วง" value={index} onChange={setIndex} min={1} max={33} suffix=" / 33" />
  <Chart compact title="ราคาที่พิมพ์ในตาราง Perez Companc" description={`เลือก ${row.date} ราคา ${row.printed_price} เทียบกับ ${previous.date} ราคา ${previous.printed_price}`} xDomain={[0,33]} yDomain={[0,4]} xTicks={[0,8,16,24,33]} xFormat={dates} xLabel="เดือน/วัน (1995)" yLabel="ราคา ตามหน่วยในตาราง" lines={[{values:perez.map((r,i)=>[i,r.printed_price])}]} verticals={[index]} markers={[{x:index-1,y:previous.printed_price},{x:index,y:row.printed_price}]} yFormat={v=>format(v,1)} />
  <Chart compact title="ผลตอบแทนระหว่างราคาสองจุดติดกัน" description="33 ผลตอบแทนคำนวณจากราคาที่ปัดเศษในตารางเดิม" xDomain={[0,33.5]} yDomain={[-20,20]} xTicks={[0,8,16,24,33]} xFormat={dates} xLabel="เดือน/วัน (1995)" yLabel="ผลตอบแทนต่อช่วง (%)" verticals={[index]} bars={returns.map((v,i)=>({x:i+.65,width:.7,y:v,className:i+1===index?'selected-bar':v<0?'negative-bar':'positive-bar'}))} lines={[{values:[[0,0],[33.5,0]],className:'zero-line',width:1}]} />
  <div className="calculation-strip"><span>{previous.date} → {row.date}</span><strong>({format(row.printed_price)} − {format(previous.printed_price)}) / {format(previous.printed_price)} = {format(row.reconstructed_return*100,3)}%</strong></div>
  <p className="lab-note">แกนเวลาเรียงตามจุดข้อมูล ไม่ได้แทรกวันหยุดให้เป็นก้าวเท่ากัน · ราคาพิมพ์เพียง 2 ตำแหน่ง ผลตอบแทนที่คำนวณกลับจึงอาจต่างจากคอลัมน์เดิม · ตัวอย่างช่วงสั้นนี้ไม่ใช่อนุกรมเต็มที่ผู้เขียนใช้รายงานสถิติ</p>
  <details><summary>ดูราคาทั้ง 34 จุดและผลตอบแทนที่คำนวณกลับ</summary><div className="table-wrap" tabIndex="0" aria-label="ตารางข้อมูลราคา"><table><thead><tr><th>วันที่</th><th>ราคาที่พิมพ์</th><th>ผลตอบแทนคำนวณกลับ</th></tr></thead><tbody>{perez.map(r=><tr key={r.date}><td>{r.date}</td><td>{format(r.printed_price)}</td><td>{r.reconstructed_return===null?'—':format(r.reconstructed_return*100,3)+'%'}</td></tr>)}</tbody></table></div></details>
  </div>;
}

export function DistributionLab(){
  const [standardized,setStandardized]=useState(false),[bins,setBins]=useState(8);
  const raw=perez.slice(1).map(r=>100*r.reconstructed_return),m=mean(raw),sd=stdev(raw);
  const values=standardized?raw.map(v=>(v-m)/sd):raw;
  const modelM=standardized?0:m,modelSd=standardized?1:sd;
  const lo=standardized?-4:-20,hi=standardized?4:20;
  const hist=histogram(values,bins,lo,hi),curve=Array.from({length:161},(_,i)=>{const x=lo+(hi-lo)*i/160;return [x,normalPdf(x,modelM,modelSd)]});
  const upper=Math.max(...hist.map(b=>b.density),...curve.map(p=>p[1]))*1.15;
  return <div className="lab"><LabTitle number="3.5b" title="จากผลตอบแทนสู่ฮิสโตแกรม และการปรับมาตรฐาน">ใช้ 33 ผลตอบแทนที่คำนวณจากตารางย่อยด้านบน พร้อมเส้น Normal ที่ใช้ค่าเฉลี่ยและ SD ของตัวอย่างนี้</LabTitle>
  <div className="segmented" aria-label="มาตราส่วนผลตอบแทน"><button aria-pressed={!standardized} onClick={()=>setStandardized(false)}>ผลตอบแทน (%)</button><button aria-pressed={standardized} onClick={()=>setStandardized(true)}>ปรับเป็น z = (R − ค่าเฉลี่ย) / SD</button></div>
  <Range label="จำนวนช่องฮิสโตแกรม" value={bins} onChange={setBins} min={6} max={14} step={2} suffix=" ช่อง" />
  <Chart title="ฮิสโตแกรมตัวอย่างและความหนาแน่น Normal" description={`ผลตอบแทน 33 ค่า ${bins} ช่อง ${standardized?'ปรับเป็นมาตรฐานค่าเฉลี่ย 0 SD 1':'ค่าเฉลี่ย '+format(m,3)+'% และ SD '+format(sd,3)+'%'} พื้นที่แท่งรวมเท่ากับ 1`} xDomain={[lo,hi]} yDomain={[0,upper]} xLabel={standardized?'ผลตอบแทนปรับมาตรฐาน z':'ผลตอบแทน (%)'} yLabel={standardized?'ความหนาแน่น ต่อ 1 หน่วย z':'ความหนาแน่น ต่อ 1 จุดเปอร์เซ็นต์'} yFormat={v=>format(v,2)} bars={hist.map(b=>({x:b.x,width:b.width,y:b.density}))} lines={[{values:curve,className:'secondary-solid',width:3}]} />
  <div className="legend"><span className="hist-key">ข้อมูลตารางย่อย 33 ค่า</span><span className="normal-key">Normal จากค่าเฉลี่ยและ SD ตัวอย่าง</span></div>
  <div className="calculation-strip"><span>{standardized?'หลังปรับมาตรฐาน':'สถิติของตัวอย่างย่อยนี้'}</span><strong>ค่าเฉลี่ย {standardized?'0':format(m,3)}{standardized?'':'%'} · sample SD {standardized?'1':format(sd,3)}{standardized?'':'%'}</strong></div>
  <p className="lab-note">ความสูงแท่ง = จำนวนในช่อง / (33 × ความกว้างช่อง) จึงเป็นความหนาแน่น ไม่ใช่ความน่าจะเป็นที่จุดหนึ่ง · การเปลี่ยนจำนวนช่องทำให้หน้าตาฮิสโตแกรมต่างกันได้ · ไม่ใช่การวาดรูป 3.5 จากอนุกรมเต็มซ้ำ และตัวอย่างเล็กนี้ยังใช้ตัดสินความเหมาะสมของ Normal ไม่ได้</p>
  </div>;
}

export function StepLab(){
  const [index,setIndex]=useState(1),[seed,setSeed]=useState(73);
  const path=useMemo(()=>eulerPath({seed}),[seed]),term=path.terms[index-1];
  const active=path.prices.slice(0,index+1),max=Math.ceil(Math.max(...path.prices)/25)*25;
  return <div className="lab"><LabTitle number="3.8" title="สร้างราคาทีละก้าว แล้วดูว่าแต่ละเทอมเติมอะไร">พารามิเตอร์ตามรูป 3.10: S₀ = 100, μ = 15%, σ = 25%, δt = 0.01 ปี · สุ่มใหม่เพื่อสาธิต</LabTitle>
  <Range label="ก้าวที่กำลังดู" value={index} onChange={setIndex} min={1} max={100} suffix=" / 100" />
  <Chart title="เส้นราคาที่สร้างด้วยสูตร random walk แบบไม่ต่อเนื่อง" description={`ก้าวที่ ${index} ราคาเดิม ${format(term.current)} drift ${format(term.drift)} ช็อก ${format(term.shock)} ราคาถัดไป ${format(term.next)}`} xDomain={[0,1]} yDomain={[0,max]} xLabel="เวลา (ปี)" yLabel="ราคาจำลอง" lines={[{values:path.prices.map((v,i)=>[i*.01,v]),className:'sample-line'},{values:active.map((v,i)=>[i*.01,v])}]} markers={[{x:index*.01,y:term.next}]} />
  <div className="step-equation"><div><small>ราคาปัจจุบัน Sᵢ</small><strong>{format(term.current,4)}</strong></div><span>+</span><div><small>drift: μSᵢδt</small><strong>{format(term.drift,4)}</strong></div><span>+</span><div><small>ช็อก: σSᵢφ√δt</small><strong>{format(term.shock,4)}</strong></div><span>=</span><div><small>ราคาถัดไป Sᵢ₊₁</small><strong>{format(term.next,4)}</strong></div></div>
  <p className="lab-note">เลขสุ่มก้าวนี้ φ = {format(term.phi,4)} · drift = 0.15 × {format(term.current,4)} × 0.01 · ช็อก = 0.25 × {format(term.current,4)} × {format(term.phi,4)} × 0.1</p>
  <div className="lab-actions"><button onClick={()=>setIndex(Math.min(100,index+1))} disabled={index===100}>ดูอีกหนึ่งก้าว</button><button onClick={()=>{setSeed(seed+1);setIndex(1);}}>สุ่มเส้นใหม่</button><span className="seed">seed {seed}</span></div>
  </div>;
}

export function WienerLab(){
  const levels=[4,16,64,256,1024],[level,setLevel]=useState(2),[seed,setSeed]=useState(73),steps=levels[level];
  const d=useMemo(()=>nestedWiener(seed,steps),[seed,steps]);
  const extent=Math.ceil(Math.max(...d.fine.map(Math.abs))+.2),bound=Math.max(...d.increments.map(Math.abs))||1;
  return <div className="lab"><LabTitle number="3.9" title="ก้าวสั้นลง แต่ความสุ่มตลอดหนึ่งปียังอยู่">รวม increments จากเส้นละเอียดเดียวกัน ทำให้จุดร่วมและจุดปลายตรงกันเมื่อเปลี่ยนจำนวนก้าว</LabTitle>
  <div className="segmented" aria-label="จำนวนก้าวของ Wiener process">{levels.map((n,i)=><button key={n} aria-pressed={i===level} onClick={()=>setLevel(i)}>{n} ก้าว</button>)}</div>
  <Chart title="Wiener process เส้นเดียวกันที่ความละเอียดต่างกัน" description={`แบ่งหนึ่งปีเป็น ${steps} ก้าว SD ของ increment ${format(d.incrementSD,4)} ความแปรปรวนรวมตามทฤษฎี 1`} xDomain={[0,1]} yDomain={[-extent,extent]} xLabel="เวลา (ปี)" yLabel="Xₜ" lines={[{values:d.fine.map((v,i)=>[i/1024,v]),className:'sample-line'},{values:d.coarse.map((v,i)=>[i/steps,v])}]} markers={[{x:1,y:d.coarse.at(-1)}]} yFormat={v=>format(v,1)} />
  <Chart compact title="increments ของ Wiener process" description="แท่งแสดงการเปลี่ยนแปลงในแต่ละก้าว ค่าบวกและลบสะสมเป็นเส้นด้านบน" xDomain={[0,1]} yDomain={[-bound,bound]} xLabel="เวลา (ปี)" yLabel="การเปลี่ยนแปลง ΔX" yFormat={v=>format(v,2)} bars={d.increments.map((v,i)=>({x:i/steps,width:1/steps,y:v,className:v<0?'negative-bar':'positive-bar'}))} />
  <div className="results three"><div><span>ขนาดก้าว δt</span><strong>{format(d.dt,4)}</strong><p>1 / {steps} ปี</p></div><div><span>SD ต่อก้าว √δt</span><strong>{format(d.incrementSD,4)}</strong><p>ย่อเมื่อเพิ่มจำนวนก้าว</p></div><div><span>ความแปรปรวนรวม 1 ปี</span><strong>1</strong><p>{steps} × {format(d.dt,6)}</p></div></div>
  <p className="lab-note">ความแปรปรวนรวมเป็นค่าทฤษฎี ไม่ใช่ค่าที่ประมาณจากเส้นเดียว · กราฟเชื่อมจุดตัวอย่าง ไม่ได้แสดงทุกจุดของเส้นทางต่อเนื่อง</p><div className="lab-actions"><button onClick={()=>setSeed(seed+1)}>สุ่ม Wiener process ใหม่</button><span className="seed">seed {seed}</span></div>
  </div>;
}
