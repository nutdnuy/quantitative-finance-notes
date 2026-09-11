// Adapted from React Bits Stepper. Auto-height avoids clipping after font and viewport changes.
import { Children, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
export default function Stepper({ children }) {
  const steps = Children.toArray(children), [current, setCurrent] = useState(0), reduced = useReducedMotion();
  return <div className="stepper" data-family="Stepper">
    <div className="step-indicators" aria-label="ขั้นตอนแบบฝึกหัด">
      {steps.map((_, i) => <button key={i} onClick={() => setCurrent(i)} aria-current={i === current ? 'step' : undefined} aria-label={`ขั้นที่ ${i + 1}`}><span>{i + 1}</span>{['ตั้งโจทย์', 'คำนวณ', 'ตีความ'][i]}</button>)}
    </div>
    <AnimatePresence mode="wait" initial={false}><motion.div key={current} initial={reduced ? false : { opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={reduced ? undefined : { opacity: 0, x: -8 }} transition={{ duration: reduced ? 0 : 0.15 }} className="step-body">{steps[current]}</motion.div></AnimatePresence>
    <div className="step-footer"><span>ขั้น {current + 1} / {steps.length}</span><div><button disabled={current === 0} onClick={() => setCurrent(current - 1)}>ย้อนกลับ</button><button className="primary" onClick={() => setCurrent(current === steps.length - 1 ? 0 : current + 1)}>{current === steps.length - 1 ? 'เริ่มใหม่' : 'ดูขั้นต่อไป'}</button></div></div>
  </div>;
}
