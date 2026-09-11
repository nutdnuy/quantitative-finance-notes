import React,{useMemo,useState} from 'react';
import {simulate,mean,stdev,histogram} from './math.mjs';
import {Range,Chart,LabTitle,format} from './ui.jsx';
import CountUp from './components/CountUp.jsx';

export default function MonteCarloLab(){
  const [mu,setMu]=useState(10),[sigma,setSigma]=useState(25),[count,setCount]=useState(1000),[seed,setSeed]=useState(73);
  const d=useMemo(()=>{
    const paths=simulate({mu:mu/100,sigma:sigma/100,seed,count,steps:52,initial:100});
    const terminal=paths.map(p=>p.at(-1)),average=mean(terminal),sd=stdev(terminal),se=sd/Math.sqrt(count),theory=100*Math.exp(mu/100);
    const low=Math.min(...terminal),high=Math.max(...terminal),bins=histogram(terminal,20,low===high?low-1:low,low===high?high+1:high);
    let sum=0;const convergence=[];
    terminal.forEach((v,i)=>{sum+=v;if(i<10||(i+1)%Math.max(1,Math.floor(count/100))===0||i===count-1)convergence.push([i+1,sum/(i+1)]);});
    const visible=paths.slice(0,20),maxPrice=Math.max(...visible.flat(),theory)*1.08;
    return {terminal,average,se,theory,bins,convergence,visible,maxPrice,loss:terminal.filter(v=>v<100).length/count*100};
  },[mu,sigma,count,seed]);
  return <div className="lab"><LabTitle number="เพิ่มเติม" title="Monte Carlo: ลองสุ่มอนาคตหลาย ๆ ครั้ง">หุ้นวันนี้ 100 ดอลลาร์ · ระยะเวลา 1 ปี · ใช้ GBM ตามสมมติฐานที่เลือก</LabTitle>
    <div className="controls two"><Range label="ผลตอบแทนคาดหมาย μ" value={mu} onChange={setMu} min={-10} max={30} suffix="% ต่อปี"/><Range label="ความผันผวน σ" value={sigma} onChange={setSigma} min={0} max={60} suffix="% ต่อปี"/></div>
    <p>จำนวนเส้นทางที่ใช้คำนวณ</p><div className="segmented" aria-label="จำนวนรอบ Monte Carlo">{[100,1000,5000].map(n=><button key={n} aria-pressed={count===n} onClick={()=>setCount(n)}>{n.toLocaleString()} รอบ</button>)}</div>
    <div className="lab-actions"><button onClick={()=>setSeed(s=>s+1)}>สุ่ม Monte Carlo ใหม่</button><button onClick={()=>{setMu(10);setSigma(25);setCount(1000);setSeed(73);}}>คืนค่า Monte Carlo</button><span className="seed">seed {seed}</span></div>
    <Chart compact title="ตัวอย่าง 20 เส้นทางจาก Monte Carlo" description={`แสดง 20 เส้นจากทั้งหมด ${count} เส้น จุดเริ่มต้น 100 ดอลลาร์ เส้นเน้นคือค่าเฉลี่ยทฤษฎี ไม่ใช่คำพยากรณ์`} yDomain={[0,d.maxPrice]} xLabel="เวลา (ปี)" yLabel="ราคาหุ้น (ดอลลาร์)" lines={[...d.visible.map(p=>({values:p.map((v,i)=>[i/52,v]),className:'sample-line',width:1})),{values:Array.from({length:53},(_,i)=>[i/52,100*Math.exp(mu/100*i/52)]),width:3}]}/>
    <p className="lab-note">แสดงเพียง 20 เส้นเพื่อให้อ่านง่าย แต่สถิติด้านล่างใช้ครบ {count.toLocaleString()} เส้น · เส้นเน้นคือค่าเฉลี่ยตามสูตร</p>
    <div className="results" role="status"><div><span>ราคาปลายปีเฉลี่ยจากการสุ่ม</span><strong><CountUp to={d.average}/><small> ดอลลาร์</small></strong><p>ค่าเฉลี่ยตามสูตร {format(d.theory)} ดอลลาร์</p></div><div><span>สัดส่วนที่ราคาปลายปีต่ำกว่า 100</span><strong>{format(d.loss,1)}%</strong><p>จากผลจำลอง ไม่ใช่โอกาสขาดทุนที่ยืนยันในตลาดจริง</p></div></div>
    <Chart compact title="การกระจายราคาปลายปีจากทุกรอบ" description={`ฮิสโตแกรมจำนวนเส้นทางทั้งหมด ${count} รอบ แบ่ง 20 ช่วงราคา`} xDomain={[d.bins[0].x,d.bins.at(-1).x+d.bins.at(-1).width]} yDomain={[0,Math.max(...d.bins.map(b=>b.count))*1.15]} xLabel="ราคาปลายปี (ดอลลาร์)" yLabel="จำนวนเส้นทาง" bars={d.bins.map(b=>({x:b.x,width:b.width,y:b.count}))}/>
    <Chart compact title="ค่าเฉลี่ยสะสมเมื่อเพิ่มจำนวนรอบ" description="เส้นค่าเฉลี่ยสะสมเทียบเส้นแนวนอนค่าเฉลี่ยทฤษฎี การลู่เข้าไม่จำเป็นต้องเข้าใกล้ขึ้นทุกครั้ง" xDomain={[1,count]} xTicks={[1,Math.round(count/4),Math.round(count/2),Math.round(count*3/4),count]} yDomain={[Math.min(d.theory,...d.convergence.map(p=>p[1]))-5,Math.max(d.theory,...d.convergence.map(p=>p[1]))+5]} xLabel="จำนวนรอบที่นำมาเฉลี่ย" yLabel="ราคาเฉลี่ย (ดอลลาร์)" lines={[{values:d.convergence},{values:[[1,d.theory],[count,d.theory]],className:'secondary-line',width:2}]}/>
    <p className="lab-note">เส้นสีม่วงคือค่าเฉลี่ยสะสม เส้นสีเขียวคือค่าเฉลี่ยตามสูตร · Standard error ของค่าเฉลี่ยประมาณ {format(d.se)} ดอลลาร์ เป็นความคลาดเคลื่อนจากการสุ่มคำนวณ ไม่ใช่ความเสี่ยงของหุ้น</p>
    <p className="lab-note">ลองตั้ง σ = 0 เส้นราคาจะทับกันทั้งหมด จากนั้นเพิ่ม σ แล้วเปรียบเทียบ 100 กับ 5,000 รอบ การเพิ่มรอบช่วยลดความคลาดเคลื่อนโดยเฉลี่ยตาม 1/√N แต่ไม่ได้ทำให้ตลาดเสี่ยงน้อยลง และค่าเฉลี่ยไม่จำเป็นต้องเข้าใกล้ค่าทฤษฎีทุกครั้งที่เพิ่มรอบ</p>
    <p className="lab-note">จำลองแบบ exact GBM บน 52 ช่วงเวลา โดย μ และ σ คงที่ ไม่มีเงินปันผล ใช้ seed เดิมซ้ำได้ เมื่อเพิ่มจำนวนรอบจะคงเส้นทางเดิมไว้แล้วเพิ่มเส้นทางใหม่ · ใช้ μ เพื่อศึกษาราคา ยังไม่ใช่การกำหนดราคา Option แบบ risk-neutral</p>
  </div>;
}
