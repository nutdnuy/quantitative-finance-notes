import React,{useState} from 'react';
import {LabTitle,Range,format} from './ui.jsx';

const stages=[
  ['ตั้งโจทย์','วันนี้หุ้น 100 พรุ่งนี้เป็น 101 หรือ 99 ด้วย p = 0.6 และ 0.4 ตามลำดับ Call มี K = 100 และหมดอายุพรุ่งนี้ สมมติดอกเบี้ย 0% เรายังไม่รู้ราคา V วันนี้ ลองคิดก่อนว่าแต่ละกิ่งจ่าย payoff เท่าไร'],
  ['เปิด payoff','ขาขึ้น Call จ่าย 1 ขาลงจ่าย 0 ดังนั้น payoff คาดหมายคือ 0.6 × 1 + 0.4 × 0 = 0.6 แต่ยังสรุปไม่ได้ว่า V = 0.6'],
  ['ทำ Hedge','ซื้อ Call 1 หน่วยและขายชอร์ตหุ้น ½ หุ้น มูลค่าวันนี้คือ V − 50 พรุ่งนี้ขาขึ้นเป็น 1 − 50.5 = −49.5 ส่วนขาลงเป็น 0 − 49.5 = −49.5 ความต่างระหว่างสองกิ่งหายไปแล้ว'],
  ['หา V','พอร์ตมีมูลค่า −49.5 แน่นอนพรุ่งนี้ เมื่อดอกเบี้ย 0% วันนี้จึงต้องมีมูลค่า −49.5 เช่นกัน ดังนั้น V − 50 = −49.5 และ V = 0.5 ยังไม่ได้ใช้ p ในการหาราคานี้เลย'],
  ['ค่อยหา q','น้ำหนักที่ทำให้หุ้นคาดหมายโตตามดอกเบี้ย 0% ต้องทำให้ 100 = q × 101 + (1 − q) × 99 จึงได้ q = 0.5 ราคา Call = 0.5 × 1 + 0.5 × 0 = 0.5 ตรงกับคำตอบจาก Hedge']
];

export default function HedgingLab(){
 const [step,setStep]=useState(0),[p,setP]=useState(60);
 return <div className="lab hedge-lesson"><LabTitle number="เพิ่มเติม" title="ค่อย ๆ เอาความไม่แน่นอนออกจากพอร์ต">ตัวอย่างใหม่: 100 → 101 / 99 ภายใน 1 วัน · K = 100 · ดอกเบี้ย 0%</LabTitle>
  <div className="hedge-steps" aria-label="ลำดับทำความเข้าใจ Hedging">{stages.map(([title],i)=><button key={title} onClick={()=>setStep(i)} aria-current={step===i?'step':undefined}>{i+1}. {title}</button>)}</div>
  <div className="option-tree" tabIndex="0" role="region" aria-label="ต้นไม้ Hedging เลื่อนแนวนอนได้บนมือถือ"><img src={`assets/diagrams/hedge-day-${step+1}.svg`} alt={`ขั้น ${step+1}: ${stages[step][1]}`}/></div>
  <p className="lab-note">สีม่วง: หุ้น · สีชมพู: Call · สีเขียว: พอร์ต Hedge หรือน้ำหนัก q ในขั้นสุดท้าย · บนมือถือเลื่อนภาพซ้าย–ขวาเพื่อดูกิ่งปลายทาง</p>
  <p className="hedge-explanation" aria-live="polite">{stages[step][1]}</p>
  <div className="step-footer"><span>ขั้น {step+1} / 5</span><div><button disabled={step===0} onClick={()=>setStep(s=>s-1)}>ย้อนกลับต้นไม้</button><button onClick={()=>setStep(s=>(s+1)%5)}>{step===4?'เริ่มต้นไม้ใหม่':'เปิดขั้นต่อไป'}</button></div></div>
  {step===4&&<div className="hedge-experiment"><h4>ลองเปลี่ยน p แล้วดูว่าอะไรเปลี่ยน</h4><Range label="โอกาสหุ้นขึ้นในโลกจริง p" value={p} onChange={setP} min={10} max={90} suffix="%"/>
  <div className="results"><div><span>Payoff คาดหมายภายใต้ p</span><strong>{format(p/100)} <small>ดอลลาร์</small></strong><p>{p/100} × 1 + {format(1-p/100)} × 0</p></div><div><span>ราคา Call จาก Hedge</span><strong>0.50 <small>ดอลลาร์</small></strong><p>ยังเท่าเดิม เมื่อราคาหุ้นสองกิ่งและดอกเบี้ยคงเดิม</p></div></div><p className="lab-note">ตัวเลื่อนเปลี่ยนเฉพาะ p ส่วน q ในต้นไม้ยังเป็น 0.5 สมมติให้ทั้งสองกิ่งเกิดได้ และซื้อขายหรือขายชอร์ตได้ตามแบบจำลอง</p></div>}
  <p className="lab-note"><a href={`assets/diagrams/hedge-day-${step+1}.excalidraw`}>ดาวน์โหลดต้นไม้ขั้นนี้เพื่อแก้ไข</a></p>
 </div>;
}
