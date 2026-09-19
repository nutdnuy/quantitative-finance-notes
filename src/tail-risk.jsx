import React, { useState } from 'react';
import { Chart, Range, LabTitle, format } from './ui.jsx';
import { normalRisk, normalPdf, empiricalRisk, teachingLosses, portfolioRisk } from './tail-risk.mjs';

function Confidence({ value, onChange }) {
  return <div className="segmented" role="group" aria-label="ระดับความเชื่อมั่น">{[.95, .975, .99, .995].map(c => <button key={c} aria-pressed={value === c} onClick={() => onChange(c)}>{format(100 * c, c === .95 || c === .99 ? 0 : 1)}%</button>)}</div>;
}

export function NormalTailLab() {
  const [sd, setSd] = useState(2.21), [mean, setMean] = useState(0), [days, setDays] = useState(1), [c, setC] = useState(.99);
  const risk = normalRisk(mean, sd, c, days), center = -risk.mean;
  const density = Array.from({ length: 241 }, (_, i) => { const z = -4 + i / 30; return [center + z * risk.sd, normalPdf(z) / risk.sd]; });
  const tail = [[risk.var, normalPdf(risk.z) / risk.sd], ...density.filter(([x]) => x > risk.var)];
  return <div className="lab"><LabTitle title="ขยับเกณฑ์ VaR แล้วหางเหลือเท่าไร">พอร์ตสมมติ 100,000 ดอลลาร์ · P&amp;L เป็น Normal · วันต่าง ๆ เป็นอิสระและมีพารามิเตอร์คงที่</LabTitle>
    <Confidence value={c} onChange={setC} />
    <div className="controls two"><Range label="Volatility รายวัน" value={sd} onChange={setSd} min={.5} max={5} step={.01} suffix="%" /><Range label="ผลตอบแทนคาดหวังรายวัน" value={mean} onChange={setMean} min={-.2} max={.2} step={.01} suffix="%" /><Range label="ระยะเวลาถือครอง" value={days} onChange={setDays} min={1} max={10} suffix=" วัน" /></div>
    <Chart title="การแจกแจงขาดทุน Normal และหางเหนือ VaR" description={`VaR ${format(risk.var)}% และ ES ${format(risk.es)}% ของพอร์ต ที่ระดับ ${c * 100}% ระยะ ${days} วัน`} xDomain={[density[0][0], density.at(-1)[0]]} yDomain={[0, .44 / risk.sd]} xLabel="ขาดทุน (% ของพอร์ต)" yLabel="ความหนาแน่น" yFormat={x => format(x, 2)} xFormat={x => format(x, 1)} lines={[{ values: density }]} band={{ low: tail.map(([x]) => [x, 0]), high: tail }} verticals={[risk.var, risk.es]} />
    <div className="results" aria-live="polite"><div><span>VaR {c * 100}% · {days} วัน</span><strong>{format(risk.var * 1000)} <small>ดอลลาร์</small></strong><p>{format(risk.var)}% ของพอร์ต · เส้นประซ้าย</p></div><div><span>Expected Shortfall · {days} วัน</span><strong>{format(risk.es * 1000)} <small>ดอลลาร์</small></strong><p>{format(risk.es)}% ของพอร์ต · เส้นประขวา</p></div></div>
    <p className="lab-note">พื้นที่หางขวารวม {format((1 - c) * 100, 1)}% ของความน่าจะเป็น แม้ภาพตัดแกนที่ ±4 SD สูตรคำนวณรวมปลายหางทั้งหมด · ค่า ES เป็นค่าเฉลี่ยขาดทุนในหาง ไม่ใช่เส้นที่แบ่งหางออกเป็นสองส่วนเท่ากัน</p>
  </div>;
}

export function EmpiricalTailLab() {
  const [worst, setWorst] = useState(20), [c, setC] = useState(.99);
  const risk = empiricalRisk(teachingLosses(worst), c);
  return <div className="lab"><LabTitle title="VaR เท่าเดิม แต่วันเลวร้ายเสียหายมากขึ้น">100 สถานการณ์สมมติ น้ำหนักเท่ากัน · 98 ค่าเรียงจาก −2% ถึง 2% อีกสองค่าคือ 10% และค่าที่ปรับด้านล่าง</LabTitle>
    <Confidence value={c} onChange={setC} /><Range label="ขาดทุนในสถานการณ์ที่รุนแรงที่สุด" value={worst} onChange={setWorst} min={20} max={60} suffix="% ของพอร์ต" />
    <Chart title="ขาดทุนเรียงจากน้อยไปมาก 100 สถานการณ์" description={`VaR ${risk.var}% ES ${risk.es}% ส่วนปลายหางมีน้ำหนักเทียบเท่า ${risk.mass} สถานการณ์`} xDomain={[1, 101]} yDomain={[-5, 65]} xTicks={[1, 25, 50, 75, 100]} xLabel="อันดับขาดทุน (ไม่ใช่วันตามเวลา)" yLabel="ขาดทุน (%)" bars={risk.sorted.map((y, i) => ({ x: i + 1, y, width: 1 }))} lines={[{ values: [[1, risk.var], [101, risk.var]], className: 'secondary-line' }, { values: [[1, risk.es], [101, risk.es]], className: 'primary-line' }]} />
    <div className="results" aria-live="polite"><div><span>VaR · เส้นเขียวประ</span><strong>{format(risk.var)}%</strong><p>อันดับที่ {Math.ceil(c * 100)} จาก 100 ค่า</p></div><div><span>ES · เส้นม่วงทึบ</span><strong>{format(risk.es)}%</strong><p>เฉลี่ยน้ำหนักปลายหาง {format(risk.mass, 1)} สถานการณ์</p></div></div>
    <p className="lab-note">ES ใช้ {risk.whole} ค่าที่สูงสุดเต็มน้ำหนัก{risk.fraction > 0 ? ` และอีก ${format(risk.fraction, 1)} ส่วนของค่าถัดมา` : ''} · ที่ 99% ลองเลื่อนขาดทุนสูงสุดจาก 20% เป็น 60%: VaR ยังคง 10% แต่ ES เพิ่มตามค่าที่เปลี่ยน</p>
  </div>;
}

export function PortfolioTailLab() {
  const [a, setA] = useState(2), [b, setB] = useState(1), [d, setD] = useState(1), [c, setC] = useState(.99);
  const q = [a, b, d], risk = portfolioRisk(q, c);
  const levels = Array.from({ length: 46 }, (_, i) => .95 + i * .001);
  const points = levels.map(p => [p * 100, portfolioRisk(q, p)]);
  return <div className="lab"><LabTitle title="เปลี่ยนจำนวนหุ้น แล้วคำนวณความเสี่ยงทั้งพอร์ต">สินทรัพย์สมมติ A, B, C · ราคา 244, 135, 315 ดอลลาร์ · ใช้ค่าเฉลี่ยและ covariance รายวันตามตารางในบท</LabTitle>
    <div className="controls two"><Range label="จำนวนหุ้น A" value={a} onChange={setA} min={1} max={5} suffix=" หุ้น" /><Range label="จำนวนหุ้น B" value={b} onChange={setB} min={0} max={5} suffix=" หุ้น" /><Range label="จำนวนหุ้น C" value={d} onChange={setD} min={0} max={5} suffix=" หุ้น" /></div>
    <Confidence value={c} onChange={setC} />
    <Chart title="VaR และ ES ของพอร์ตที่ระดับความเชื่อมั่นต่างกัน" description={`พอร์ต ${risk.value} ดอลลาร์ VaR ${format(100 * risk.var)}% ES ${format(100 * risk.es)}% ที่ระดับ ${100 * c}%`} xDomain={[95, 99.5]} yDomain={[0, Math.max(1, ...points.map(([, r]) => r.es * 100)) * 1.15]} xTicks={[95, 96, 97, 98, 99.5]} xLabel="ระดับความเชื่อมั่น (%)" yLabel="ขาดทุน (% ของพอร์ต)" yFormat={x => format(x, 1)} lines={[{ values: points.map(([x, r]) => [x, r.var * 100]), className: 'secondary-line' }, { values: points.map(([x, r]) => [x, r.es * 100]) }]} verticals={[c * 100]} />
    <div className="legend"><span className="median-key">VaR · เขียวประ</span><span className="mean-key">ES · ม่วงทึบ</span></div>
    <div className="results" aria-live="polite"><div><span>VaR {100 * c}% · 1 วัน</span><strong>{format(risk.varDollars)} <small>ดอลลาร์</small></strong><p>{format(100 * risk.var)}% ของพอร์ต</p></div><div><span>ES {100 * c}% · 1 วัน</span><strong>{format(risk.esDollars)} <small>ดอลลาร์</small></strong><p>{format(100 * risk.es)}% ของพอร์ต</p></div></div>
    <p className="lab-note">มูลค่าพอร์ต {format(risk.value)} ดอลลาร์ · น้ำหนัก A/B/C = {risk.weights.map(x => format(x * 100)).join(' / ')}% · ค่าเฉลี่ย {format(100 * risk.mean, 3)}% และ SD {format(100 * risk.sd, 3)}% ต่อวัน · การเพิ่มจำนวนหุ้นเปลี่ยนทั้งสัดส่วนและเงินลงทุน จึงควรอ่านค่าดอลลาร์คู่กับเปอร์เซ็นต์</p>
  </div>;
}
