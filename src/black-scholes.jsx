import React, { useMemo, useState } from 'react';
import { Chart, Range, LabTitle, format } from './ui.jsx';
import { bsValue, discreteDeltaHedge } from './black-scholes.mjs';

const axis = value => Number(value.toFixed(2));
const optionName = kind => kind === 'call' ? 'Call' : 'Put';

export function BlackScholesPriceLab() {
  const [kind, setKind] = useState('call'), [S, setS] = useState(100), [K, setK] = useState(100);
  const [rate, setRate] = useState(5), [volatility, setVolatility] = useState(20), [tau, setTau] = useState(1);
  const parameters = { S, K, r: rate / 100, sigma: volatility / 100, tau, kind };
  const value = bsValue(parameters);
  const curve = useMemo(() => Array.from({ length: 101 }, (_, i) => bsValue({ S: 50 + i, K, r: rate / 100, sigma: volatility / 100, tau, kind })), [K, rate, volatility, tau, kind]);
  const upper = Math.max(1, ...curve.map(point => Math.max(point.price, point.payoff))) * 1.12;
  const tangent = [Math.max(50, S - 12), S, Math.min(150, S + 12)]
    .map(spot => [spot, value.price + value.delta * (spot - S)])
    .filter(([, price]) => price >= 0 && price <= upper);
  function reset() { setKind('call'); setS(100); setK(100); setRate(5); setVolatility(20); setTau(1); }
  return <div className="lab black-scholes-price-lab">
    <LabTitle number="เพิ่มเติม" title="ราคา Option และ Delta เปลี่ยนตามอะไร">ตัวอย่างสมมติ · European Option 1 หน่วย · หุ้นไม่จ่ายเงินปันผล · ดอกเบี้ยทบต้นต่อเนื่อง · มูลค่าเป็นดอลลาร์</LabTitle>
    <div className="segmented" role="group" aria-label="ประเภท Option สำหรับราคา Black–Scholes">
      <button aria-pressed={kind === 'call'} onClick={() => setKind('call')}>Call: สิทธิซื้อ</button>
      <button aria-pressed={kind === 'put'} onClick={() => setKind('put')}>Put: สิทธิขาย</button>
    </div>
    <div className="controls two">
      <Range label="ราคาหุ้น S" value={S} onChange={setS} min={50} max={150} suffix=" ดอลลาร์" />
      <Range label="ราคาใช้สิทธิ K" value={K} onChange={setK} min={75} max={125} suffix=" ดอลลาร์" />
      <Range label="Volatility σ" value={volatility} onChange={setVolatility} min={5} max={60} suffix="% ต่อ √ปี" />
      <Range label="เวลาคงเหลือ τ" value={tau} onChange={setTau} min={.05} max={2} step={.05} suffix=" ปี" />
      <Range label="ดอกเบี้ย r ทบต้นต่อเนื่อง" value={rate} onChange={setRate} min={0} max={10} step={.5} suffix="% ต่อปี" />
    </div>
    <Chart title={`ราคา ${optionName(kind)} ตาม Black–Scholes เทียบเส้น payoff`} description={`ราคาใช้สิทธิ ${K} ดอลลาร์ เวลาคงเหลือ ${tau} ปี ที่ S ${S} ราคา ${value.price} ดอลลาร์ Delta ${value.delta} เส้นทึบคือราคาก่อนหมดอายุ เส้นประคือ payoff เป็นฟังก์ชันของราคาหุ้นเมื่อหมดอายุ โดยใช้แกนราคาหุ้นร่วมกัน เส้นประสั้นสีเทาใกล้จุดที่เลือกคือเส้นสัมผัส Delta`} xDomain={[50, 150]} yDomain={[0, upper]} xLabel="ราคาหุ้น (ดอลลาร์)" yLabel="มูลค่า Option (ดอลลาร์)" xFormat={axis} lines={[{ values: curve.map(point => [point.S, point.price]) }, { values: curve.map(point => [point.S, point.payoff]), className: 'secondary-line' }, { values: tangent, className: 'event-line', width: 2 }]} markers={[{ x: S, y: value.price, className: 'expected-point' }]} verticals={[K]} />
    <div className="legend"><span className="mean-key">ราคาตอนเหลือเวลา τ = {format(tau, 2)} ปี</span><span className="median-key">Payoff ณ วันหมดอายุ</span></div>
    <p className="lab-note">ทั้งสองเส้นใช้แกนราคาหุ้นเดียวกันเพื่อเปรียบเทียบรูปร่าง จุดบนเส้นทึบคือราคาจาก S ปัจจุบัน เส้นประสีเขียวใช้ราคาหุ้น ณ วันหมดอายุและไม่ได้พยากรณ์ว่า S จะไปถึงเท่าใด เส้นประสั้นสีเทาใกล้จุดที่เลือกคือเส้นสัมผัสที่มีความชันเท่ากับ Delta</p>
    <div className="results" aria-live="polite">
      <div><span>ราคา {optionName(kind)} วันนี้ V</span><strong data-bs="price">{format(value.price, 4)} <small>ดอลลาร์</small></strong><p>มูลค่าตามแบบจำลองสำหรับ Option 1 หน่วย · ไม่ใช่ payoff หรือกำไร</p></div>
      <div><span>Delta = ∂V/∂S</span><strong data-bs="delta">{format(value.delta, 4)} <small>หุ้น</small></strong><p>{kind === 'call' ? 'จำนวนหุ้นในพอร์ตจำลอง Call ณ จุดนี้' : 'ค่าติดลบหมายถึงขายชอร์ตหุ้นในพอร์ตจำลอง Put'} · เมื่อ S เปลี่ยนเล็กน้อย ΔV ≈ Delta × ΔS</p></div>
      <div><span>เงินสดในพอร์ตจำลอง M = V − Delta × S</span><strong data-bs="cash">{format(value.cash, 4)} <small>ดอลลาร์</small></strong><p>{value.cash < 0 ? 'ค่าติดลบคือเงินกู้ที่ต้องชำระคืนพร้อมดอกเบี้ย' : 'เงินฝากที่ได้รับดอกเบี้ย'} · รวมหุ้นและเงินสดแล้วเท่ากับ V</p></div>
      <div><span>Gamma = ∂²V/∂S²</span><strong data-bs="gamma">{format(value.gamma, 6)}</strong><p>หน่วยหุ้นต่อดอลลาร์ · บอกว่า Delta เปลี่ยนเร็วเพียงใดเมื่อราคาหุ้นเปลี่ยน</p></div>
    </div>
    <div className="calculation-strip"><span>ค่าที่ใช้ในสูตร</span><strong>d₁ = <output data-bs="d1">{format(value.d1, 4)}</output> · d₂ = <output data-bs="d2">{format(value.d2, 4)}</output></strong><p className="lab-note">Vega ต่อ volatility 1 จุดเปอร์เซ็นต์ = <output data-bs="vega-point">{format(value.vega / 100, 4)}</output> ดอลลาร์ · เป็นการประมาณเมื่อ σ เปลี่ยนเล็กน้อยและคงตัวแปรอื่น</p></div>
    <div className="lab-actions"><button onClick={reset}>คืนค่าเริ่มต้นของราคา Black–Scholes</button></div>
    <p className="lab-note">ผลลัพธ์ใช้ r และ σ คงที่ ไม่มีต้นทุนซื้อขายหรือข้อจำกัดในการยืมเงินและขายชอร์ต ราคา Put ก่อนหมดอายุอาจต่ำกว่าเส้น payoff เมื่อ r เป็นบวก เพราะเป็น European ที่ยังใช้สิทธิทันทีไม่ได้</p>
  </div>;
}

export function BlackScholesHedgeLab() {
  const [steps, setSteps] = useState(64), [seed, setSeed] = useState(73), [kind, setKind] = useState('call');
  const data = useMemo(() => discreteDeltaHedge({ steps, seed, kind }), [steps, seed, kind]);
  const low = Math.min(0, ...data.records.map(row => row.wealth)), high = Math.max(1, ...data.records.flatMap(row => [row.wealth, row.option]));
  const padding = Math.max(1, (high - low) * .1);
  return <div className="lab black-scholes-hedge-lab">
    <LabTitle number="เพิ่มเติม" title="ปรับ Delta เป็นช่วง ๆ แล้วยังมี hedge error เท่าใด">ตัวอย่างจำลอง · S₀ = K = 100 ดอลลาร์ · T = 1 ปี · μ = 8% ต่อปี · r = 5% ต่อปี · σ = 20% ต่อ √ปี</LabTitle>
    <div className="segmented" role="group" aria-label="ประเภท Option สำหรับ Delta hedge">
      <button aria-pressed={kind === 'call'} onClick={() => setKind('call')}>Hedge Call</button>
      <button aria-pressed={kind === 'put'} onClick={() => setKind('put')}>Hedge Put</button>
    </div>
    <div className="segmented" role="group" aria-label="จำนวน step สำหรับ Delta hedge">{[16, 64, 256].map(n => <button key={n} aria-pressed={steps === n} onClick={() => setSteps(n)}>{n} step</button>)}</div>
    <div className="lab-actions"><span className="seed">seed {seed}</span><button onClick={() => setSeed(current => (current + 1) >>> 0)}>สุ่มเส้นทางสำหรับ Delta hedge ใหม่</button><button onClick={() => { setSteps(64); setSeed(73); setKind('call'); }}>คืนค่าเริ่มต้นของ Delta hedge</button></div>
    <p className="lab-note">เริ่มพอร์ตหุ้นกับเงินสดด้วยราคา Black–Scholes ของ {optionName(kind)} จำนวน 1 หน่วย ปล่อยเงินสดให้รับหรือจ่ายดอกเบี้ยทุก Δt = {format(data.dt, 6)} ปี แล้วซื้อขายหุ้นเพื่อปรับ Delta โดยใช้เงินจากบัญชีเดิม</p>
    <Chart title={`มูลค่าพอร์ต Delta hedge เทียบกับราคา ${optionName(kind)} ระหว่างทาง`} description={`จำลอง exact GBM ด้วย seed ${seed} ปรับ Delta ${steps} step ราคาเริ่มต้น ${data.initialValue} ดอลลาร์ ราคาหุ้นปลายปี ${data.terminalStock} มูลค่าพอร์ตปลายปี ${data.terminalWealth} payoff ${data.payoff} hedge error ${data.hedgeError} ดอลลาร์`} yDomain={[low < 0 ? low - padding : 0, high + padding]} xLabel="เวลา t (ปี)" yLabel="มูลค่า (ดอลลาร์)" xFormat={axis} lines={[{ values: data.records.map(row => [row.t, row.wealth]) }, { values: data.records.map(row => [row.t, row.option]), className: 'secondary-line' }]} />
    <div className="legend"><span className="mean-key">หุ้น + เงินสดในพอร์ต hedge</span><span className="median-key">ราคา Option จาก Sₜ และเวลาที่เหลือ</span></div>
    <div className="results" aria-live="polite">
      <div><span>มูลค่าพอร์ตปลายปี</span><strong data-bs-hedge="wealth">{format(data.terminalWealth, 4)} <small>ดอลลาร์</small></strong><p>หุ้นที่ยังถืออยู่คูณ S_T บวกเงินสดหลังดอกเบี้ย</p></div>
      <div><span>Payoff ของ {optionName(kind)} ปลายปี</span><strong data-bs-hedge="payoff">{format(data.payoff, 4)} <small>ดอลลาร์</small></strong><p>S_T = <output data-bs-hedge="terminal-stock">{format(data.terminalStock, 4)}</output> ดอลลาร์ · คงเดิมเมื่อเปลี่ยนจำนวน step แล้วใช้ seed เดิม</p></div>
      <div><span>Hedge error = พอร์ต − payoff</span><strong data-bs-hedge="error">{format(data.hedgeError, 4)} <small>ดอลลาร์</small></strong><p>{data.hedgeError < 0 ? 'พอร์ตขาดเงินสำหรับจ่าย payoff เท่ากับขนาดของค่าติดลบ' : 'พอร์ตมีเงินเกิน payoff เท่ากับค่านี้'} · เป็นผลของเส้นทางนี้</p></div>
      <div><span>เงินเริ่มต้นของพอร์ต</span><strong data-bs-hedge="initial-value">{format(data.initialValue, 4)} <small>ดอลลาร์</small></strong><p>Delta เริ่มต้น {format(data.initialDelta, 4)} หุ้น และเงินสด {format(data.initialCash, 4)} ดอลลาร์ · ไม่มีการเติมเงินภายหลัง</p></div>
    </div>
    <p className="lab-note">สร้าง Exact GBM จาก Brownian increments บนกริด 256 step แล้วรวม increment เมื่อเลือกกริดหยาบ จุดเวลาที่ตรงกันจึงใช้ราคาหุ้นเดียวกัน เส้นกราฟเชื่อมเฉพาะจุดที่คำนวณ และไม่มีการปรับ Delta อีกที่วันหมดอายุ</p>
    <p className="lab-note">Black–Scholes จำลอง payoff ได้พอดีภายใต้สมมติฐานและการปรับพอร์ตต่อเนื่อง การทดลองนี้ปรับเป็นช่วง ๆ จึงยังมีความคลาดเคลื่อน แม้ไม่มีค่าธรรมเนียม การเพิ่มจำนวน step ไม่ได้รับประกันว่า error ของเส้นทางเดียวจะลดลงทุกครั้ง</p>
    <p className="lab-note">μ ใช้สร้างราคาหุ้นภายใต้โลกจริงที่สมมติ ส่วน r ใช้คำนวณราคา Option และดอกเบี้ยของพอร์ต ผลนี้เป็นการจำลองเพื่อเรียนรู้ ไม่ใช่ข้อมูลตลาด</p>
  </div>;
}
