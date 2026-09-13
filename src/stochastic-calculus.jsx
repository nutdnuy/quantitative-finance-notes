import React, { useMemo, useState } from 'react';
import { Chart, Range, LabTitle, format } from './ui.jsx';
import { nestedBrownian, gbmFromIncrements, correlatedNormals } from './stochastic-calculus.mjs';

const axis = value => Number(value.toFixed(2));
const nextSeed = seed => (seed + 1) >>> 0;

export function QuadraticVariationLab() {
  const [steps, setSteps] = useState(256), [seed, setSeed] = useState(73);
  const data = useMemo(() => nestedBrownian({ seed, steps, finestSteps: 4096, T: 1 }), [seed, steps]);
  return <div className="lab quadratic-variation-lab">
    <LabTitle number="เพิ่มเติม" title="ผลรวมกำลังสองที่เข้าใกล้เวลา และผลรวมแบบ Itô">เวลา T = 1 หน่วยเวลา · สร้าง Brownian increments บนกริดละเอียด 4,096 step แล้วรวม step ย่อยเมื่อเปลี่ยน N</LabTitle>
    <div className="segmented" role="group" aria-label="จำนวน step สำหรับ Quadratic variation">{[16, 64, 256, 1024, 4096].map(n => <button key={n} aria-pressed={steps === n} onClick={() => setSteps(n)}>{format(n, 0)} step</button>)}</div>
    <div className="lab-actions"><span className="seed">seed {seed}</span><button onClick={() => setSeed(nextSeed)}>สุ่มเส้นทาง Brownian ใหม่</button><button onClick={() => { setSteps(256); setSeed(73); }}>คืนค่าเริ่มต้นของ Quadratic variation</button></div>
    <Chart title="ผลรวมกำลังสองสะสมของ Brownian increments เทียบกับเวลา" description={`N ${steps} seed ${seed} ผลรวมกำลังสองที่ T=1 เท่ากับ ${data.qv} เส้นอ้างอิงคือเวลา t`} yDomain={[0, Math.max(1, data.qv) * 1.12]} xLabel="เวลา t (หน่วยเวลา)" yLabel="ผลรวมกำลังสอง (หน่วยเวลา)" xFormat={axis} yFormat={axis} lines={[{ values: data.times.map((t, i) => [t, data.qvPath[i]]) }, { values: [[0, 0], [1, 1]], className: 'secondary-line' }]} />
    <div className="legend"><span className="mean-key">Qₙ(t) = Σ(ΔW)² บนกริดนี้</span><span className="median-key">เส้นอ้างอิง t</span></div>
    <div className="results" aria-live="polite">
      <div><span>ผลรวมกำลังสอง Qₙ ที่ T = 1</span><strong data-qv="value">{format(data.qv, 6)}</strong><p>หน่วยเวลา · ค่าบนกริดจำกัดยังไม่จำเป็นต้องเท่ากับ 1</p></div>
      <div><span>RMS ของ Qₙ − T ตามทฤษฎี</span><strong data-qv="rms">{format(data.qvRmsTheory, 6)}</strong><p>√(2T²/N) · เป็นขนาดความคลาดเคลื่อนเมื่อเฉลี่ยหลายเส้นทาง ไม่ใช่ค่าคลาดเคลื่อนของเส้นนี้</p></div>
      <div><span>ผลรวมซ้าย Σ W ก่อน step × ΔW</span><strong data-qv="ito-left">{format(data.itoLeft, 6)}</strong><p>หน่วยเวลา · ใช้ค่า W ก่อนเห็น increment ของ step นั้น</p></div>
      <div><span>Itô integral: ½(Wₜ² − T)</span><strong data-qv="ito-limit">{format(data.itoLimit, 6)}</strong><p>หน่วยเวลา · ค่าเป้าหมายในลิมิต สำหรับปลายทาง Wₜ เดียวกัน</p></div>
    </div>
    <div className="calculation-strip"><span>เอกลักษณ์บนกริดจำกัด</span><strong>Σ W ก่อน step × ΔW = ½(Wₜ² − Qₙ) = {format(data.finiteIdentity, 6)}</strong><p className="lab-note">Wₜ = <output data-qv="terminal">{format(data.terminal, 6)}</output> · ความต่างจากเอกลักษณ์เชิงพีชคณิต <output data-qv="identity-error">{data.identityError.toExponential(2)}</output> (การปัดเศษของคอมพิวเตอร์)</p></div>
    <p className="lab-note">เปลี่ยน N โดยคง seed จะใช้เส้นทางเดียวกันและปลายทาง Wₜ เดิม การเพิ่ม N ไม่ได้รับประกันว่า Qₙ จะเข้าใกล้ T ขึ้นทุกครั้งบนเส้นทางนี้ และ RMS ไม่ใช่ขอบเขตความผิดพลาดสูงสุด</p>
    <p className="lab-note">กราฟเชื่อมค่าที่จุดบนกริดเพื่อให้อ่านง่าย การทดลองนี้ใช้ Gaussian increments ที่สุ่มได้ ซึ่งต่างจากการเดินด้วย step ±√Δt ที่แต่ละ step มีกำลังสองเท่ากับ Δt พอดี</p>
  </div>;
}

export function GbmEulerLab() {
  const [steps, setSteps] = useState(64), [seed, setSeed] = useState(73), [muPercent, setMuPercent] = useState(10), [sigmaPercent, setSigmaPercent] = useState(20);
  const brownian = useMemo(() => nestedBrownian({ seed, steps, finestSteps: 4096, T: 1 }), [seed, steps]);
  const data = useMemo(() => gbmFromIncrements({ increments: brownian.increments, S0: 100, mu: muPercent / 100, sigma: sigmaPercent / 100, T: 1 }), [brownian, muPercent, sigmaPercent]);
  const lowest = Math.min(0, ...data.euler, ...data.exact), highest = Math.max(...data.euler, ...data.exact), padding = Math.max(5, (highest - lowest) * .08);
  return <div className="lab gbm-euler-lab">
    <LabTitle number="เพิ่มเติม" title="เปรียบเทียบ Exact GBM กับ Euler บนความสุ่มชุดเดียวกัน">S₀ = 100 ดอลลาร์ · T = 1 ปี · μ และ σ คงที่ · ทั้งสองวิธีใช้ Brownian increments เดียวกันทุก step</LabTitle>
    <div className="controls two"><Range label="Drift μ" value={muPercent} onChange={setMuPercent} min={-10} max={30} suffix="% ต่อปี" /><Range label="Volatility σ" value={sigmaPercent} onChange={setSigmaPercent} min={0} max={100} suffix="% ต่อ √ปี" /></div>
    <div className="segmented" role="group" aria-label="จำนวน step สำหรับ Exact และ Euler">{[4, 16, 64, 256, 1024].map(n => <button key={n} aria-pressed={steps === n} onClick={() => setSteps(n)}>{format(n, 0)} step</button>)}</div>
    <div className="lab-actions"><span className="seed">seed {seed}</span><button onClick={() => setSeed(nextSeed)}>สุ่มเส้นทางสำหรับ GBM ใหม่</button><button onClick={() => { setSteps(64); setSeed(73); setMuPercent(10); setSigmaPercent(20); }}>คืนค่าเริ่มต้นของ Exact และ Euler</button></div>
    {data.nonPositiveEuler.length > 0 && <p className="reading-note" role="alert">Euler ให้ค่าศูนย์หรือติดลบครั้งแรกที่ step {data.nonPositiveEuler[0]} กราฟแสดงค่าที่คำนวณได้จริงโดยไม่ตัดให้เป็นศูนย์ นี่เป็นข้อจำกัดของการประมาณด้วย step หยาบ ส่วนราคา Exact GBM ยังเป็นบวก</p>}
    <Chart title="Exact GBM และ Euler ที่ใช้ Brownian increments เดียวกัน" description={`${steps} step seed ${seed} mu ${muPercent}% sigma ${sigmaPercent}% Exact ปลายปี ${data.exact.at(-1)} Euler ${data.euler.at(-1)} ดอลลาร์${data.nonPositiveEuler.length ? ' Euler มีค่าศูนย์หรือติดลบ' : ''}`} yDomain={[lowest < 0 ? lowest - padding : 0, highest + padding]} xLabel="เวลา t (ปี)" yLabel="มูลค่า S (ดอลลาร์)" xFormat={axis} yFormat={value => format(value, 0)} lines={[{ values: data.times.map((t, i) => [t, data.exact[i]]) }, { values: data.times.map((t, i) => [t, data.euler[i]]), className: 'secondary-line' }]} />
    <div className="legend"><span className="mean-key">Exact: 100 exp[(μ − ½σ²)t + σWₜ]</span><span className="median-key">Euler: Sใหม่ = Sเดิม(1 + μΔt + σΔW)</span></div>
    <div className="results" aria-live="polite">
      <div><span>Exact ที่ปลายปี</span><strong data-gbm-euler="exact">{format(data.exact.at(-1), 4)} <small>ดอลลาร์</small></strong><p>ใช้สูตรปิดของ GBM ที่จุดเวลาบนกริด</p></div>
      <div><span>Euler ที่ปลายปี</span><strong data-gbm-euler="euler">{format(data.euler.at(-1), 4)} <small>ดอลลาร์</small></strong><p>ประมาณทีละ step ขนาด Δt = {format(data.dt, 6)} ปี</p></div>
      <div><span>ความคลาดเคลื่อนสัมบูรณ์ที่ปลายปี</span><strong data-gbm-euler="error">{format(data.terminalAbsoluteError, 4)} <small>ดอลลาร์</small></strong><p>|Sᴱᵘˡᵉʳₜ − Sᴱˣᵃᶜᵗₜ| บนเส้นทางนี้</p></div>
      <div><span>Brownian motion ที่ปลายปี Wₜ</span><strong data-gbm-euler="terminal">{format(brownian.terminal, 6)}</strong><p>หน่วย √ปี · ไม่เปลี่ยนเมื่อเปลี่ยน N แล้วคง seed</p></div>
    </div>
    <p className="lab-note">Exact หมายถึงสูตรตรงของแบบจำลอง GBM ที่กำหนด ไม่ได้ยืนยันว่าแบบจำลองตรงกับตลาดจริง เส้นบนกราฟเชื่อมเฉพาะจุดเวลาที่คำนวณ การเพิ่ม N ช่วยการลู่เข้าเมื่อวัดหลายเส้นทาง แต่ความคลาดเคลื่อนของเส้นทางเดียวไม่จำเป็นต้องลดลงทุกครั้ง</p>
  </div>;
}

export function CorrelationLab() {
  const [rhoPercent, setRhoPercent] = useState(60), [seed, setSeed] = useState(31415);
  const data = useMemo(() => correlatedNormals({ rho: rhoPercent / 100, seed, count: 2048 }), [rhoPercent, seed]);
  const extent = Math.max(4, Math.ceil(Math.max(...data.pairs.flatMap(pair => [Math.abs(pair.x), Math.abs(pair.y)])) * 2) / 2);
  return <div className="lab correlation-lab">
    <LabTitle number="เพิ่มเติม" title="สร้างช็อก Gaussian สองชุดที่มี correlation ตามกำหนด">สุ่ม z₁ และ z₂ ที่เป็นอิสระจากกัน 2,048 คู่ · φ₁ = z₁ · φ₂ = ρz₁ + √(1 − ρ²)z₂</LabTitle>
    <Range label="Correlation เป้าหมาย ρ" value={rhoPercent} onChange={setRhoPercent} min={-100} max={100} suffix="%" />
    <p className="lab-note">ρ = {format(data.rho, 2)} · เมื่อคง seed การเลื่อน ρ จะใช้คู่ z₁, z₂ เดิม จึงเปรียบเทียบผลของ correlation ได้โดยไม่เปลี่ยนความสุ่มทั้งชุด</p>
    <div className="lab-actions"><span className="seed">seed {seed}</span><button onClick={() => setSeed(nextSeed)}>สุ่มคู่ช็อกใหม่</button><button onClick={() => { setRhoPercent(60); setSeed(31415); }}>คืนค่าเริ่มต้นของ Correlation</button></div>
    <Chart title="แผนภาพกระจายของช็อกมาตรฐาน Gaussian ที่สัมพันธ์กัน" description={`จุดทั้งหมด 2048 คู่ แกนนอน phi1 แกนตั้ง phi2 correlation เป้าหมาย ${data.rho} sample correlation ${data.sampleCorrelation} แสดงครบทุกจุดโดยไม่ตัดปลายหาง`} xDomain={[-extent, extent]} yDomain={[-extent, extent]} xLabel="ช็อกมาตรฐาน φ₁ (ไม่มีหน่วย)" yLabel="ช็อกมาตรฐาน φ₂ (ไม่มีหน่วย)" xFormat={axis} yFormat={axis} markers={data.pairs.map(pair => ({ x: pair.x, y: pair.y, r: 1.6, className: 'point' }))} />
    <div className="results" aria-live="polite">
      <div><span>Correlation เป้าหมาย ρ</span><strong data-correlation="target">{format(data.rho, 4)}</strong><p>{data.rho === 1 ? 'φ₂ = φ₁ ทุกคู่' : data.rho === -1 ? 'φ₂ = −φ₁ ทุกคู่' : 'เป็นพารามิเตอร์ของการแจกแจงร่วม'}</p></div>
      <div><span>Correlation จากตัวอย่าง 2,048 คู่</span><strong data-correlation="sample">{format(data.sampleCorrelation, 4)}</strong><p>คำนวณจากช็อกมาตรฐานที่แสดงทั้งหมด</p></div>
      <div><span>Sample variance ของ φ₁</span><strong data-correlation="variance-x">{format(data.varianceX, 4)}</strong><p>ค่าทฤษฎี = 1 · sample mean = {format(data.meanX, 4)}</p></div>
      <div><span>Sample variance ของ φ₂</span><strong data-correlation="variance-y">{format(data.varianceY, 4)}</strong><p>ค่าทฤษฎี = 1 · sample mean = {format(data.meanY, 4)}</p></div>
    </div>
    <p className="lab-note">นำ φ แต่ละชุดไปคูณ √Δt จะได้ Brownian increments ΔW₁ และ ΔW₂ ที่มีความแปรปรวน Δt และ covariance ρΔt ส่วน correlation ยังคงเป็น ρ ในทางทฤษฎี</p>
    <p className="lab-note">Sample correlation อาจต่างจากค่าเป้าหมายเพราะมีตัวอย่างจำกัด กราฟนี้เปรียบเทียบช็อกของแต่ละ step ไม่ใช่ correlation ของระดับราคาตลอดเส้นทาง และยังไม่ใช่ค่าประมาณจากข้อมูลตลาด</p>
  </div>;
}
