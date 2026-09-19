import React, { useMemo, useState } from 'react';
import { Chart, Range, LabTitle, format } from './ui.jsx';
import { optionGreeks, strikeFromDelta, deltaMirror, probabilityMirror } from './option-greeks.mjs';

// The shared chart has a 51px left gutter: retain small nonzero values while
// keeping signed labels within that width, including on narrow mobile screens.
const axis = value => Math.abs(value) < 1e-12 ? 0 : Math.abs(value) < .01 ? value.toExponential(1) : Number(value.toPrecision(3));
const name = kind => kind === 'call' ? 'Call' : 'Put';
const domain = values => { const low = Math.min(0, ...values), high = Math.max(0, ...values), padding = Math.max((high - low) * .12, .00001); return [low - padding, high + padding]; };
function OptionKind({ kind, setKind, label }) {
  return <div className="segmented" role="group" aria-label={label}>{['call', 'put'].map(value => <button key={value} aria-pressed={kind === value} onClick={() => setKind(value)}>{name(value)}</button>)}</div>;
}

export function GreeksShockLab() {
  const [kind, setKind] = useState('call'), [S, setS] = useState(100), [vol, setVol] = useState(20), [days, setDays] = useState(365);
  const [dS, setDS] = useState(5), [dVol, setDVol] = useState(5);
  const parameters = { S, K: 100, r: .05, b: .05, sigma: vol / 100, T: days / 365, kind };
  const value = optionGreeks(parameters), dv = dVol / 100;
  const deltaPart = value.delta * dS, vegaPart = value.vega * dv;
  const gammaPart = .5 * value.gamma * dS * dS, vannaPart = value.vanna * dS * dv, vommaPart = .5 * value.vomma * dv * dv;
  const first = deltaPart + vegaPart, second = first + gammaPart + vannaPart + vommaPart;
  const exact = optionGreeks({ ...parameters, S: S + dS, sigma: (vol + dVol) / 100 }).price - value.price;
  const curve = Array.from({ length: 61 }, (_, i) => {
    const fraction = i / 60;
    return { fraction, exact: optionGreeks({ ...parameters, S: S + fraction * dS, sigma: (vol + fraction * dVol) / 100 }).price - value.price, first: fraction * first, second: fraction * first + fraction * fraction * (second - first) };
  });
  return <div className="lab greeks-shock-lab">
    <LabTitle number="เพิ่มเติม" title="Greeks อธิบายการเปลี่ยนราคาได้ใกล้แค่ไหน">ตัวอย่างสมมติ · European Option 1 หน่วย · K = 100 ดอลลาร์ · r = 5%, b = 5% ต่อปี · คงเวลาระหว่าง shock</LabTitle>
    <OptionKind kind={kind} setKind={setKind} label="ประเภท Option สำหรับ shock" />
    <div className="controls two">
      <Range label="ราคาเริ่มต้น S" value={S} onChange={setS} min={70} max={130} suffix=" ดอลลาร์" />
      <Range label="Volatility เริ่มต้น σ" value={vol} onChange={setVol} min={10} max={50} suffix="% ต่อ √ปี" />
      <Range label="เวลาคงเหลือ T" value={days} onChange={setDays} min={15} max={730} step={5} suffix=" วัน" />
      <Range label="ราคาเปลี่ยน ΔS" value={dS} onChange={setDS} min={-25} max={25} suffix=" ดอลลาร์" />
      <Range label="Volatility เปลี่ยน Δσ" value={dVol} onChange={setDVol} min={-8} max={20} suffix=" จุดเปอร์เซ็นต์" />
    </div>
    <Chart title="การคำนวณราคาใหม่เทียบ Taylor approximation" description={`เพิ่มสัดส่วน shock จาก 0 ถึง 100% โดยเปลี่ยน S และ sigma พร้อมกัน คง T ไว้ ที่ shock เต็ม ราคาเปลี่ยนจริง ${exact} ดอลลาร์ อันดับหนึ่ง ${first} อันดับสอง ${second} ดอลลาร์`} xDomain={[0, 100]} yDomain={domain(curve.flatMap(row => [row.exact, row.first, row.second]))} xLabel="สัดส่วนของ shock ที่เลือก (%)" yLabel="ราคา Option เปลี่ยน (ดอลลาร์)" yFormat={axis} lines={[{ values: curve.map(row => [100 * row.fraction, row.exact]) }, { values: curve.map(row => [100 * row.fraction, row.second]), className: 'secondary-line' }, { values: curve.map(row => [100 * row.fraction, row.first]), className: 'event-line' }]} />
    <div className="legend"><span className="mean-key">คำนวณราคาใหม่</span><span className="median-key">Taylor อันดับสอง</span><span className="median-key" style={{ '--comparison': 'var(--muted)' }}>Taylor อันดับหนึ่ง</span></div>
    <div className="results" aria-live="polite">
      <div><span>คำนวณราคาใหม่: ΔV</span><strong data-greeks-shock="exact">{format(exact, 4)} <small>ดอลลาร์</small></strong><p>ราคาเดิม {format(value.price, 4)} → {format(value.price + exact, 4)} ดอลลาร์</p></div>
      <div><span>อันดับหนึ่ง: Delta + Vega</span><strong data-greeks-shock="first">{format(first, 4)} <small>ดอลลาร์</small></strong><p>ส่วนต่างจาก ΔV จริง {format(first - exact, 4)} ดอลลาร์</p></div>
      <div><span>อันดับสอง: เพิ่ม Gamma, Vanna, Vomma</span><strong data-greeks-shock="second">{format(second, 4)} <small>ดอลลาร์</small></strong><p>ส่วนต่างจาก ΔV จริง {format(second - exact, 4)} ดอลลาร์</p></div>
    </div>
    <div className="calculation-strip"><span>แยกส่วนของการประมาณ (ดอลลาร์)</span><strong>Delta × ΔS = {format(deltaPart, 4)} · Vega × Δσ = {format(vegaPart, 4)}</strong><p>½ Gamma × (ΔS)² = {format(gammaPart, 4)} · Vanna × ΔS × Δσ = {format(vannaPart, 4)} · ½ Vomma × (Δσ)² = {format(vommaPart, 4)}</p></div>
    <p className="lab-note">Vega ต่อ volatility 1 จุดเปอร์เซ็นต์ = <output data-greeks-shock="vega-point">{format(value.vega / 100, 4)}</output> ดอลลาร์ โดย Δσ = {format(dv, 2)} ในสูตรเมื่อปรับ {dVol} จุดเปอร์เซ็นต์ ทุก Greek วัด ณ จุดเริ่มต้น จึงเป็นการประมาณเฉพาะบริเวณใกล้จุดนั้น การเพิ่มอันดับไม่ได้รับประกันว่าดีขึ้นสำหรับ shock ใหญ่</p>
    <p className="lab-note">กราฟเป็นการขยับพารามิเตอร์ของแบบจำลอง ไม่ใช่เส้นทางราคาหรือกำไรจากการเทรด T = {days}/365 ปีคงเดิม จึงไม่มี Theta ในการประมาณนี้</p>
    <div className="lab-actions"><button onClick={() => { setKind('call'); setS(100); setVol(20); setDays(365); setDS(5); setDVol(5); }}>คืนค่าเริ่มต้นของ shock</button></div>
  </div>;
}

export function GreeksConventionsLab() {
  const [kind, setKind] = useState('call'), [S, setS] = useState(100), [carryRate, setCarryRate] = useState(5), [T, setT] = useState(1), [fraction, setFraction] = useState(25);
  const parameters = { S, K: 100, r: .05, b: carryRate / 100, sigma: .2, T, kind };
  const value = optionGreeks(parameters), targetDelta = (kind === 'call' ? 1 : -1) * value.A * fraction / 100;
  const strike = strikeFromDelta({ ...parameters, delta: targetDelta });
  const mirror = deltaMirror({ ...parameters, K: strike }), probabilityStrike = probabilityMirror({ ...parameters, K: strike });
  const opposite = kind === 'call' ? 'put' : 'call';
  const paired = optionGreeks({ ...parameters, K: mirror, kind: opposite });
  const curve = Array.from({ length: 131 }, (_, i) => optionGreeks({ ...parameters, K: 50 + i }));
  return <div className="lab greeks-conventions-lab">
    <LabTitle number="เพิ่มเติม" title="Delta ไม่ใช่โอกาสใช้สิทธิ และ strike ต้องระบุ convention">ตัวอย่างสมมติ · r = 5%, σ = 20% · ordinary spot Delta ไม่มี premium adjustment · ความน่าจะเป็นอยู่ภายใต้ Q</LabTitle>
    <OptionKind kind={kind} setKind={setKind} label="ประเภท Option สำหรับ Delta convention" />
    <div className="controls two">
      <Range label="ราคาสินทรัพย์ S" value={S} onChange={setS} min={70} max={140} suffix=" ดอลลาร์" />
      <Range label="Cost of carry b" value={carryRate} onChange={setCarryRate} min={-5} max={20} suffix="% ต่อปี" />
      <Range label="เวลาคงเหลือ T" value={T} onChange={setT} min={.1} max={2} step={.1} suffix=" ปี" />
      <Range label="เป้าหมาย |Delta| / A" value={fraction} onChange={setFraction} min={5} max={95} step={5} suffix="%" />
    </div>
    <Chart title={`ขนาด Delta เทียบความน่าจะเป็น ITM ของ ${name(kind)}`} description={`ใช้ S ${S}, b ${carryRate}% และ T ${T} ปี เปรียบเทียบขนาด Delta กับ Q probability ตาม strike ปัจจุบัน K=100: Delta ${value.delta}, probability ${value.itmProbability} ค่าสองเส้นไม่เท่ากันโดยทั่วไป`} xDomain={[50, 180]} yDomain={[0, 1.08 * Math.max(1, value.A)]} xLabel="Strike K (ดอลลาร์)" yLabel="|Delta| และ Q probability" yFormat={axis} lines={[{ values: curve.map(row => [row.K, Math.abs(row.delta)]) }, { values: curve.map(row => [row.K, row.itmProbability]), className: 'secondary-line' }]} verticals={[100]} />
    <div className="legend"><span className="mean-key">ขนาด ordinary spot Delta</span><span className="median-key">Q(S_T &gt; K) สำหรับ Call / Q(S_T &lt; K) สำหรับ Put</span></div>
    <div className="results" aria-live="polite">
      <div><span>Delta ที่ K = 100</span><strong data-greeks-conventions="delta">{format(value.delta, 4)}</strong><p>Call: A N(d₁) · Put: −A N(−d₁) · A = {format(value.A, 4)}</p></div>
      <div><span>Q probability ของ ITM ที่ K = 100</span><strong data-greeks-conventions="probability">{format(100 * value.itmProbability, 2)}<small>%</small></strong><p>{kind === 'call' ? 'N(d₂)' : 'N(−d₂)'} · ไม่ใช่ความน่าจะเป็นภายใต้โลกจริง</p></div>
      <div><span>Strike จากเป้าหมาย Delta = {format(targetDelta, 4)}</span><strong data-greeks-conventions="strike">{format(strike, 4)} <small>ดอลลาร์</small></strong><p>เป้าหมายเป็น {fraction}% ของ A · ไม่ใช่การระบุ |Delta| = {format(fraction / 100, 2)} ตรง ๆ</p></div>
      <div><span>Delta mirror: strike ของ {name(opposite)}</span><strong data-greeks-conventions="mirror">{format(mirror, 4)} <small>ดอลลาร์</small></strong><p>Delta = {format(paired.delta, 4)} · ขนาดเท่ากัน เครื่องหมายตรงข้าม</p></div>
    </div>
    <p className="lab-note">เมื่อ b &gt; r จะได้ A &gt; 1 และ ordinary spot Delta ของ Call บาง strike อาจมากกว่า 1 ได้ แต่ Q probability อยู่ระหว่าง 0 และ 1 เสมอ การกลับสูตรนี้ไม่ใช้ forward Delta หรือ premium-adjusted Delta</p>
    <div className="calculation-strip"><span>Mirror สองแบบตอบคนละคำถาม</span><strong>Probability mirror strike = <output data-greeks-conventions="probability-mirror">{format(probabilityStrike, 4)}</output> ดอลลาร์</strong><p>ค่านี้ทำให้ {name(opposite)} มี Q probability เท่ากับ {name(kind)} ที่ strike {format(strike, 4)} ส่วน Delta mirror จับคู่ขนาด Delta จุดกึ่งกลางของคู่ Delta อยู่ที่ K = S exp[(b + σ²/2)T] = {format(S * Math.exp((parameters.b + .5 * parameters.sigma ** 2) * T), 4)}</p></div>
    <div className="lab-actions"><button onClick={() => { setKind('call'); setS(100); setCarryRate(5); setT(1); setFraction(25); }}>คืนค่าเริ่มต้นของ Delta convention</button></div>
  </div>;
}

const higherViews = {
  gamma: { title: 'Gamma', scale: 1, unit: 'Delta ต่อ 1 ดอลลาร์', note: 'Gamma บอกความเปลี่ยนแปลงของ Delta ต่อราคาสินทรัพย์ 1 ดอลลาร์ และเท่ากันสำหรับ Call/Put ที่ใช้พารามิเตอร์เดียวกัน' },
  vanna: { title: 'Vanna', scale: .01, unit: 'Delta ต่อ 1 vol point', note: 'Vanna วัด Delta ที่เปลี่ยนเมื่อ volatility เปลี่ยน แสดงต่อ 1 จุดเปอร์เซ็นต์ จึงเป็น raw Vanna หาร 100 ค่าอาจบวก ลบ หรือศูนย์ได้' },
  vomma: { title: 'Vomma', scale: .0001, unit: 'ดอลลาร์ต่อ (vol point)²', note: 'Vomma วัดความโค้งต่อ volatility แสดงต่อจุดเปอร์เซ็นต์กำลังสอง จึงเป็น raw Vomma หาร 10,000 และอาจติดลบใกล้ ATM ได้' },
  charm: { title: 'Charm', scale: 1 / 365, unit: 'Delta ต่อวันปฏิทิน', note: 'Charm = −∂Delta/∂T โดยคง S และตัวแปรอื่นไว้ แสดงต่อวันด้วยการหาร 365 เป็นความไว ณ จุดนั้น ไม่ใช่การคำนวณ Delta ใหม่หลังผ่านไปหนึ่งวันเต็ม' },
};

export function GreeksHigherLab() {
  const [kind, setKind] = useState('call'), [metric, setMetric] = useState('gamma'), [vol, setVol] = useState(20), [days, setDays] = useState(365), [S, setS] = useState(100);
  const view = higherViews[metric], parameters = { K: 100, r: .05, b: .05, sigma: vol / 100, T: days / 365, kind };
  const curve = useMemo(() => Array.from({ length: 151 }, (_, i) => optionGreeks({ S: 50 + i * 2 / 3, K: 100, r: .05, b: .05, sigma: vol / 100, T: days / 365, kind })), [vol, days, kind]);
  const value = optionGreeks({ ...parameters, S });
  const values = curve.map(row => [row.S, row[metric] * view.scale]);
  return <div className="lab greeks-higher-lab">
    <LabTitle number="เพิ่มเติม" title="รูปทรงของ Greeks เปลี่ยนเมื่อใกล้หมดอายุอย่างไร">ตัวอย่างสมมติ · K = 100 ดอลลาร์ · r = 5%, b = 5% ต่อปี · T ใช้วันปฏิทินหาร 365</LabTitle>
    <OptionKind kind={kind} setKind={setKind} label="ประเภท Option สำหรับ higher Greeks" />
    <div className="segmented" role="group" aria-label="Greek ที่แสดง">{Object.entries(higherViews).map(([key, item]) => <button key={key} aria-pressed={metric === key} onClick={() => setMetric(key)}>{item.title}</button>)}</div>
    <div className="controls two">
      <Range label="ราคาสินทรัพย์ S ที่อ่านค่า" value={S} onChange={setS} min={50} max={150} suffix=" ดอลลาร์" />
      <Range label="Volatility σ" value={vol} onChange={setVol} min={5} max={60} suffix="% ต่อ √ปี" />
      <Range label="เวลาคงเหลือ T" value={days} onChange={setDays} min={5} max={730} step={5} suffix=" วัน" />
    </div>
    <Chart title={`${view.title} ของ ${name(kind)} ตามราคาสินทรัพย์`} description={`ที่ sigma ${vol}% เวลาคงเหลือ ${days} วัน ${view.title} ณ S ${S} เท่ากับ ${value[metric] * view.scale} ${view.unit} แกนตั้งปรับช่วงตามค่าที่เลือก`} xDomain={[50, 150]} yDomain={domain(values.map(([, y]) => y))} xLabel="ราคาสินทรัพย์ S (ดอลลาร์)" yLabel={view.unit} yFormat={axis} lines={[{ values }]} markers={[{ x: S, y: value[metric] * view.scale, className: 'expected-point' }]} verticals={[100]} />
    <div className="results" aria-live="polite">
      <div><span>{view.title} ที่ S = {S}</span><strong data-greeks-higher="selected">{format(value[metric] * view.scale, 6)}</strong><p>{view.unit}</p></div>
      <div><span>Delta ณ จุดนี้</span><strong data-greeks-higher="delta">{format(value.delta, 4)}</strong><p>ตัวแปรอื่นคงเดิมเมื่อวัดอนุพันธ์</p></div>
      <div><span>Vega ต่อ 1 จุดเปอร์เซ็นต์</span><strong data-greeks-higher="vega-point">{format(value.vega / 100, 4)} <small>ดอลลาร์</small></strong><p>Theta ต่อวันปฏิทิน = <output data-greeks-higher="theta-day">{format(value.theta / 365, 4)}</output> ดอลลาร์</p></div>
    </div>
    <p className="lab-note">{view.note} แกนตั้งปรับช่วงอัตโนมัติ จึงต้องอ่านตัวเลขบนแกนเมื่อเปรียบเทียบการตั้งค่าคนละชุด</p>
    <div className="lab-actions"><button onClick={() => { setKind('call'); setMetric('gamma'); setVol(20); setDays(365); setS(100); }}>คืนค่าเริ่มต้นของ higher Greeks</button></div>
  </div>;
}
