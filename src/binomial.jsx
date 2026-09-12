import React, { useMemo, useState } from 'react';
import { LabTitle, Range, format } from './ui.jsx';
import { binomialTree, discountedExpectedPayoff } from './binomial.mjs';

const stages = ['1. Payoff ตอนหมดอายุ', '2. ย้อนมาครึ่งปี', '3. ย้อนมาวันนี้'];
const paths = [['วันนี้'], ['ลง', 'ขึ้น'], ['ลง → ลง', 'ขึ้น → ลง หรือ ลง → ขึ้น', 'ขึ้น → ขึ้น']];

export default function BinomialLab() {
  const [strike, setStrike] = useState(100), [upPercent, setUpPercent] = useState(10), [downPercent, setDownPercent] = useState(10);
  const [rate, setRate] = useState(0), [physicalP, setPhysicalP] = useState(60), [type, setType] = useState('call'), [stage, setStage] = useState(0);
  const calculated = useMemo(() => {
    try { return { model: binomialTree({ K: strike, u: 1 + upPercent / 100, d: 1 - downPercent / 100, r: rate / 100, type }) }; }
    catch (error) { return { error: error.message }; }
  }, [strike, upPercent, downPercent, rate, type]);
  const model = calculated.model, n = 2 - stage, optionName = type === 'call' ? 'Call' : 'Put';
  const pExpectation = model ? discountedExpectedPayoff(model, physicalP / 100) : null;
  function reset() {
    setStrike(100); setUpPercent(10); setDownPercent(10); setRate(0); setPhysicalP(60); setType('call'); setStage(0);
  }
  return <div className="lab binomial-lab">
    <LabTitle number="เพิ่มเติม" title="เริ่มจาก payoff แล้วคิดย้อนกลับทีละก้าว">หุ้นวันนี้ 100 ดอลลาร์ · อายุ Option 1 ปี · 2 ก้าว ก้าวละ ½ ปี · European ใช้สิทธิได้เมื่อหมดอายุ</LabTitle>
    <div className="segmented" role="group" aria-label="ประเภท Option">
      <button aria-pressed={type === 'call'} onClick={() => setType('call')}>Call: สิทธิซื้อ</button>
      <button aria-pressed={type === 'put'} onClick={() => setType('put')}>Put: สิทธิขาย</button>
    </div>
    <div className="controls two">
      <Range label="ราคาใช้สิทธิ K" value={strike} onChange={setStrike} min={60} max={150} suffix=" ดอลลาร์" />
      <Range label="อัตราดอกเบี้ย r ต่อปี" value={rate} onChange={setRate} min={-20} max={30} suffix="%" />
      <Range label="หุ้นขึ้นต่อก้าว (u − 1)" value={upPercent} onChange={setUpPercent} min={5} max={30} suffix="%" />
      <Range label="หุ้นลงต่อก้าว (1 − d)" value={downPercent} onChange={setDownPercent} min={5} max={30} suffix="%" />
    </div>
    <p className="lab-note">u = {format(1 + upPercent / 100, 2)} · d = {format(1 - downPercent / 100, 2)} · Δt = 0.5 ปี · R = 1 + rΔt = {format(1 + rate / 100 * 0.5, 3)} ต่อก้าว<br />
      u และ d เป็นสมมติฐานต่อก้าวสำหรับเรียนรู้ ยังไม่ได้ประมาณจากข้อมูลตลาดหรือปรับตาม volatility ในแต่ละก้าวใช้ดอกเบี้ยอย่างง่าย rΔt แล้วทบต้นข้ามก้าวด้วย R²</p>
    {calculated.error ? <p className="reading-note" role="alert"><strong>ยังคำนวณราคาแบบไม่มีอาร์บิทราจไม่ได้</strong><br />{calculated.error} ลองปรับดอกเบี้ยหรือขนาดการขึ้นลงให้ d &lt; R &lt; u</p> : <>
      <div className="hedge-steps" role="group" aria-label="ขั้นตอนคำนวณ Binomial ย้อนกลับ">
        {stages.map((label, i) => <button key={label} onClick={() => setStage(i)} aria-current={stage === i ? 'step' : undefined}>{label}</button>)}
      </div>
      <p className="hedge-explanation" aria-live="polite">{stage === 0
        ? `เมื่อครบ 1 ปี คำนวณ payoff ของ ${optionName} ที่ราคาหุ้นปลายทางทั้ง 3 ระดับ กิ่งขึ้นแล้วลงกับลงแล้วขึ้นมาพบกันที่ราคาเดียว เพราะ u และ d คงที่`
        : stage === 1
          ? 'ที่เวลา ½ ปี แต่ละจุดเหลืออีก 1 ก้าว: เฉลี่ย payoff ปลายทางด้วย q และ 1 − q แล้วหารด้วย R เพื่อคิดลดกลับมาที่จุดนั้น'
          : 'วันนี้ ใช้มูลค่า Option สองจุดที่เวลา ½ ปี คำนวณแบบเดียวกันอีกครั้ง จึงได้ราคาวันนี้และพอร์ตจำลองที่ถือหุ้น Δ หุ้นกับเงินสด B ดอลลาร์'}</p>
      <div className="table-wrap" tabIndex="0" role="region" aria-label={`ตาราง Binomial เวลา ${n / 2} ปี เลื่อนแนวนอนได้`}>
        <table>
          <caption>เวลา t = {format(n / 2, 1)} ปี · {stage === 0 ? 'มูลค่าเมื่อหมดอายุคือ payoff' : 'V คือมูลค่า Option ณ เวลาของแถว; Δ และ B ใช้จำลองก้าวถัดไป'}</caption>
          <thead><tr><th scope="col">เส้นทาง</th><th scope="col">หุ้น S<br />(ดอลลาร์)</th><th scope="col">{stage === 0 ? 'Payoff' : 'Option V'}<br />(ดอลลาร์)</th>{stage > 0 && <><th scope="col">Δ<br />(หุ้น)</th><th scope="col">เงินสด B<br />(ดอลลาร์)</th></>}</tr></thead>
          <tbody>{[...model.tree[n]].reverse().map(node => <tr key={node.upMoves}>
            <th scope="row">{paths[n][node.upMoves]}</th><td>{format(node.stock)}</td><td>{format(node.value, 4)}</td>
            {stage > 0 && <><td>{format(node.delta, 4)}</td><td>{format(node.cash, 4)}</td></>}
          </tr>)}</tbody>
        </table>
      </div>
      {stage > 0 && <p className="lab-note">สูตรในแต่ละจุด: V = [q × Vขึ้น + (1 − q) × Vลง] / R · พอร์ตจำลองมีมูลค่า V = ΔS + B โดย B ติดลบหมายถึงเงินกู้ที่ต้องชำระคืนพร้อมดอกเบี้ย</p>}
      <div className="step-footer"><span>ขั้น {stage + 1} / 3</span><div>
        <button disabled={stage === 0} onClick={() => setStage(value => value - 1)}>ขั้นก่อนหน้า</button>
        <button disabled={stage === 2} onClick={() => setStage(value => value + 1)}>คิดย้อนกลับอีกก้าว</button>
      </div></div>
      <div className="results" aria-live="polite">
        <div><span>ราคา {optionName} วันนี้จากแบบจำลอง</span><strong data-binomial="price">{format(model.price, 4)} <small>ดอลลาร์</small></strong><p>คิดลดจาก payoff ด้วย q ย้อนกลับ 2 ก้าว</p></div>
        <div><span>น้ำหนักเพื่อหาราคา q</span><strong data-binomial="q">{format(model.q, 4)}</strong><p>q = (R − d) / (u − d) · ไม่ใช่โอกาสขึ้นที่พยากรณ์จากตลาด</p></div>
        <div><span>หุ้นในพอร์ตจำลองวันนี้ Δ</span><strong data-binomial="delta">{format(model.delta, 4)} <small>หุ้น</small></strong><p>{model.delta < 0 ? 'ค่าติดลบหมายถึงขายชอร์ตหุ้น' : 'จำนวนหุ้นต่อ Option 1 หน่วย'} · ปรับพอร์ตใหม่เมื่อถึงก้าวถัดไป</p></div>
        <div><span>เงินสดในพอร์ตจำลองวันนี้ B</span><strong data-binomial="cash">{format(model.cash, 4)} <small>ดอลลาร์</small></strong><p>{model.cash < 0 ? 'เงินกู้วันนี้ ไม่ใช่กำไร' : 'เงินฝากวันนี้'} · Δ × 100 + B = {format(model.price, 4)}</p></div>
      </div>
      <div className="hedge-experiment">
        <h4>เปลี่ยนความเชื่อเรื่อง p แล้วราคาเปลี่ยนไหม</h4>
        <Range label="โอกาสหุ้นขึ้นในโลกจริง p" value={physicalP} onChange={setPhysicalP} min={1} max={99} suffix="%" />
        <div className="calculation-strip" aria-live="polite"><span>Payoff คาดหมายภายใต้ p หลังคิดลด · ค่านี้ยังไม่ใช่ราคา Option</span><strong data-binomial="physical-expectation">{format(pExpectation, 4)} ดอลลาร์</strong></div>
        <p className="lab-note">สมมติ p คงที่และการขึ้นลงแต่ละก้าวเป็นอิสระ จึงให้น้ำหนักปลายทางเป็น p², 2p(1 − p), (1 − p)² แล้วหารด้วย R² การเปลี่ยน p เปลี่ยนค่าคาดหมายนี้ แต่ราคาจากการจำลอง payoff ใช้ q จึงไม่เปลี่ยนเมื่อ S, K, u, d และ r คงเดิม</p>
      </div>
    </>}
    <div className="lab-actions"><button onClick={reset}>คืนค่าเริ่มต้น</button></div>
    <p className="lab-note">สมมติหุ้นไม่จ่ายเงินปันผล ไม่มีค่าธรรมเนียมหรือภาษี ซื้อขายหุ้นเศษส่วนและขายชอร์ตได้ กู้และฝากได้ที่อัตราเดียวกัน และปรับพอร์ตได้ทุกก้าว ผลลัพธ์เป็นราคาภายใต้แบบจำลองนี้</p>
  </div>;
}
