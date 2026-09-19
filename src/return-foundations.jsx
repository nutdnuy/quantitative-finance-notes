import React,{useMemo,useState} from 'react';
import {Chart,Range,LabTitle,format} from './ui.jsx';
import {acf} from './stylized-facts.mjs';
import {PRICE_A,PRICE_B,priceReturns,arma11,simulateArma,calendarAcf} from './return-foundations.mjs';
export function PriceReturnsLab(){
 const [start,setStart]=useState(100),[mode,setMode]=useState('price');
 const a=PRICE_A,b=PRICE_B.map(p=>p*start/100),series=values=>mode==='log'?priceReturns(values).map((v,i)=>[i+1,v.log*100]):values.map((v,i)=>[i,mode==='base'?v/values[0]*100:v]);
 const lines=[series(a),series(b)],all=lines.flat().map(p=>p[1]),lo=Math.min(...all),hi=Math.max(...all),margin=(hi-lo)*.15||1;
 return <div className="lab"><LabTitle title="เปลี่ยนระดับราคา แล้วผลตอบแทนเปลี่ยนไหม">ข้อมูลสมมติ A และ B · หกวันสังเกต · ไม่มีปันผล · ไม่มีต้นทุนซื้อขาย</LabTitle>
 <Range label="ราคาเริ่มต้นของ B" value={start} onChange={setStart} min={20} max={200} step={10} />
 <div className="segmented" role="group" aria-label="รูปแบบข้อมูล">{[['price','ราคา'],['base','ดัชนีฐาน 100'],['log','Log returns']].map(([v,l])=><button key={v} aria-pressed={mode===v} onClick={()=>setMode(v)}>{l}</button>)}</div>
 <Chart title="เปรียบเทียบราคากับผลตอบแทนของสองชุด" description="A และ B มีผลตอบแทนสะสม 4% เท่ากัน การปรับราคาเริ่มต้น B ไม่เปลี่ยนผลตอบแทน" xDomain={mode==='log'?[1,5]:[0,5]} xTicks={mode==='log'?[1,2,3,4,5]:[0,1,2,3,4,5]} yDomain={[lo-margin,hi+margin]} yFormat={v=>format(v,1)} xLabel="วันซื้อขาย" yLabel={mode==='log'?'Log return (%)':mode==='base'?'ดัชนีฐาน 100':'ราคา (หน่วยสมมติ)'} lines={[{values:lines[0]},{values:lines[1],className:'secondary-line'}]} />
 <div className="legend"><span className="mean-key">A · ม่วง</span><span className="median-key">B · เขียวประ</span></div>
 <div className="results" aria-live="polite"><div><span>Simple return สะสมทั้งสองชุด</span><strong>4.000%</strong></div><div><span>Log return สะสมทั้งสองชุด</span><strong>3.922%</strong></div></div>
 <p className="lab-note">ปรับ B ทั้งชุดด้วยตัวคูณเดียวกัน ผลตอบแทนจึงคงเดิม กราฟฐาน 100 ช่วยเทียบสัดส่วนการเปลี่ยนแปลง ส่วนผลตอบแทนรายวันแสดงความต่างระหว่างทาง</p></div>;
}
export function ArmaLearningLab(){
 const [phi,setPhi]=useState(.6),[theta,setTheta]=useState(.3);
 const model=arma11(phi,theta),values=useMemo(()=>simulateArma(phi,theta),[phi,theta]),sample=acf(values),limit=Math.max(...values.map(Math.abs))*1.1;
 return <div className="lab"><LabTitle title="AR กับ MA เสริมหรือหักล้างกันอย่างไร">ARMA(1,1) · mean 0 · Normal innovation variance 1 · 600 ค่าหลัง burn-in 1,000 ค่า · seed 303</LabTitle>
 <div className="controls two"><Range label="AR coefficient φ" value={phi} onChange={setPhi} min={-.9} max={.9} step={.1}/><Range label="MA coefficient θ" value={theta} onChange={setTheta} min={-.9} max={.9} step={.1}/></div>
 <div className="segmented" role="group" aria-label="ตัวอย่าง ARMA"><button onClick={()=>{setPhi(.6);setTheta(.3);}}>เสริมกัน</button><button onClick={()=>{setPhi(-.6);setTheta(.3);}}>สลับเครื่องหมาย</button><button onClick={()=>{setPhi(.6);setTheta(-.6);}}>หักล้างกัน</button></div>
 <Chart title="อนุกรม ARMA จำลอง" description="คงช็อกชุดเดิมทุกครั้งที่ปรับพารามิเตอร์" xDomain={[1,600]} xTicks={[1,150,300,450,600]} yDomain={[-limit,limit]} yFormat={v=>format(v,1)} xLabel="ลำดับเวลา" yLabel="X (หน่วยสมมติ)" lines={[{values:values.map((x,i)=>[i+1,x]),width:1.2}]} />
 <Chart title="Sample ACF เทียบกับ ACF ทฤษฎี" description={`ACF ทฤษฎี lag 1 ${format(model.acf[1],6)}`} xDomain={[.5,20.5]} xTicks={[1,5,10,15,20]} yDomain={[-1,1]} yFormat={v=>format(v,1)} xLabel="Lag" yLabel="Autocorrelation" bars={sample.slice(1).map((y,i)=>({x:i+.7,y,width:.6}))} lines={[{values:model.acf.slice(1).map((y,i)=>[i+1,y]),className:'secondary-line'}]} />
 <div className="legend"><span className="mean-key">แท่งม่วง · Sample</span><span className="median-key">เส้นเขียวประ · ทฤษฎี</span></div>
 <div className="results" aria-live="polite"><div><span>Variance ทฤษฎี</span><strong>{format(model.variance,6)}</strong></div><div><span>ρ₁ ทฤษฎี</span><strong>{format(model.acf[1],6)}</strong></div></div>
 <p className="lab-note">เมื่อ θ=−φ โมเดลลดรูปเป็น white noise ค่า ACF ทฤษฎีเป็นศูนย์ทุก lag บวก ส่วนแท่งจากข้อมูลจำนวนจำกัดยังแกว่งรอบศูนย์ · ช่วงตัวเลือกนี้มี |φ| และ |θ| น้อยกว่า 1</p></div>;
}
export function CalendarAcfLab(){
 const [strength,setStrength]=useState(1),[noise,setNoise]=useState(1),model=calendarAcf(strength,noise/100);
 return <div className="lab"><LabTitle title="ช็อกอิสระก็มี ACF จากปฏิทินได้">Mean ห้าวันวนซ้ำ · เฉลี่ย phase เริ่มต้นเท่ากัน · กราฟทฤษฎี ไม่ใช้ข้อมูลตลาด</LabTitle>
 <div className="controls two"><Range label="ขนาดความต่างของ mean ตามวัน" value={strength} onChange={setStrength} min={0} max={3} step={.25} suffix=" เท่า"/><Range label="SD ของช็อกอิสระ" value={noise} onChange={setNoise} min={.2} max={2} step={.1} suffix="%"/></div>
 <p className="lab-note">Mean วัน 1–5: {model.means.map(x=>`${format(x*100,3)}%`).join(', ')} · กราฟใช้ mean รวม; หลังหัก mean จริงของแต่ละวัน ACF ของ residual เป็นศูนย์</p>
 <Chart title="ACF แบบ pooled ที่เกิดจาก mean ตามวัน" description={`Lag 5 เท่ากับ ${format(model.acf[5],6)} แม้ noise เป็นอิสระ`} xDomain={[.5,15.5]} xTicks={[1,5,10,15]} yDomain={[-.5,1]} yFormat={v=>format(v,2)} xLabel="Lag (วันซื้อขาย)" yLabel="Autocorrelation" bars={model.acf.slice(1).map((y,i)=>({x:i+.7,y,width:.6}))} lines={[{values:[[.5,0],[15.5,0]],className:'secondary-line'}]} />
 <div className="results" aria-live="polite"><div><span>ρ₁ แบบ pooled</span><strong>{format(model.acf[1],6)}</strong></div><div><span>ρ₅ แบบ pooled</span><strong>{format(model.acf[5],6)}</strong></div></div>
 <p className="lab-note">ปรับขนาดความต่างเป็น 0 แล้วทุก lag บวกจะเป็นศูนย์ สมมติห้าวันต่อสัปดาห์สม่ำเสมอ ไม่มีวันหยุด และรู้ mean ของแต่ละวันจริง ข้อมูลตลาดต้องประมาณ mean และจัดการปฏิทินจริงเพิ่ม</p></div>;
}
