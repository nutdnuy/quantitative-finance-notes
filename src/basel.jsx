import React, { useState } from 'react';
import { Chart, Range, LabTitle, format } from './ui.jsx';
import { capitalMetrics, outputFloor, liquidityCoverage, corporateIRB } from './basel.mjs';

const percent = value => `${format(100 * value)}%`;

export function CapitalLab() {
  const [rwa, setRwa] = useState(600), [exposure, setExposure] = useState(1000), [floor, setFloor] = useState(72.5);
  const capital = capitalMetrics({ rwa, exposure }), output = outputFloor(400, 800, floor / 100);
  const rows = [
    ['CET1 / RWA', capital.cet1Ratio, .045, .07],
    ['Tier 1 / RWA', capital.tier1Ratio, .06, .085],
    ['Total capital / RWA', capital.totalRatio, .08, .105],
    ['Tier 1 / Exposure', capital.leverageRatio, .03, null],
  ];
  const belowMinimum = rows.filter(([, ratio, minimum]) => ratio < minimum).map(([label]) => label);
  const belowBuffer = rows.filter(([, ratio, , buffered]) => buffered !== null && ratio < buffered).map(([label]) => label);
  return <div className="lab"><LabTitle title="ทุนเท่าเดิม เปลี่ยนตัวหารแล้วเป็นอย่างไร">ธนาคารสมมติ: สินทรัพย์ทางบัญชี 1,000 ล้านบาท · CET1 = 60, AT1 = 10 และ Tier 2 = 20 ล้านบาท</LabTitle>
    <div className="controls two"><Range label="สินทรัพย์เสี่ยง (RWA)" value={rwa} onChange={setRwa} min={300} max={1200} step={10} suffix=" ล้านบาท" /><Range label="Leverage exposure measure" value={exposure} onChange={setExposure} min={1000} max={3000} step={50} suffix=" ล้านบาท" /></div>
    <div className="table-wrap" tabIndex={0} role="region" aria-label="อัตราส่วนเงินกองทุนและเกณฑ์เปรียบเทียบ"><table><caption>เกณฑ์พื้นฐานของ Basel · buffer อื่นและข้อกำหนดเฉพาะธนาคารยังไม่รวมอยู่ในตัวอย่าง</caption><thead><tr><th scope="col">อัตราส่วน</th><th scope="col">คำนวณได้</th><th scope="col">ขั้นต่ำ</th><th scope="col">ขั้นต่ำ + CCB</th></tr></thead><tbody>{rows.map(([label, ratio, minimum, buffered]) => <tr key={label}><th scope="row">{label}</th><td>{percent(ratio)}</td><td>{percent(minimum)}</td><td>{buffered === null ? '—' : percent(buffered)}</td></tr>)}</tbody></table></div>
    <p className="lab-note" aria-live="polite">{belowMinimum.length ? `ต่ำกว่าทุนขั้นต่ำ: ${belowMinimum.join(', ')}` : 'ทั้งสี่อัตราส่วนถึงทุนขั้นต่ำ'} · {belowBuffer.length ? `ต่ำกว่าระดับรวม CCB: ${belowBuffer.join(', ')}` : 'อัตราส่วนที่ใช้ RWA ทั้งสามค่าถึงระดับรวม CCB'}</p>
    <p className="lab-note">CCB คือ Capital conservation buffer 2.5% ของ RWA ซึ่งต้องเป็น CET1 · การต่ำกว่าระดับรวม buffer มีผลต่อการจ่ายเงินออก และต่างจากการต่ำกว่าทุนขั้นต่ำ · Exposure measure อาจรวมรายการนอกงบดุล จึงไม่จำเป็นต้องเท่ากับสินทรัพย์ทางบัญชี</p>
    <h4>ตัวอย่างแยก: Output floor จำกัด RWA ที่ลดลงจากแบบจำลอง</h4>
    <p>กำหนด RWA ก่อน floor = 400 และ RWA ตามวิธีมาตรฐาน = 800 ล้านบาท คงที่ แล้วปรับสัดส่วน floor</p>
    <Range label="Output floor ที่ใช้ในสถานการณ์" value={floor} onChange={setFloor} min={50} max={72.5} step={.5} suffix="%" />
    <div className="results" aria-live="polite"><div><span>สัดส่วน floor × RWA มาตรฐาน</span><strong>{format(output.floorRwa, 0)} <small>ล้านบาท</small></strong><p>{floor}% × 800</p></div><div><span>RWA หลังใช้ output floor</span><strong>{format(output.effectiveRwa, 0)} <small>ล้านบาท</small></strong><p>max(400, {format(output.floorRwa, 0)}) · {output.binding ? 'floor เป็นตัวกำหนด' : 'เท่ากับ RWA ก่อน floor'}</p></div></div>
    <p className="lab-note">72.5% คือระดับปลายทางของกรอบ Basel ส่วน 50–72.5% ในแถบเลื่อนเป็นสถานการณ์เพื่อการเรียนรู้ ไม่ใช่ตารางใช้บังคับของประเทศใด · ตัวอย่าง floor นี้แยกจากตารางอัตราส่วนด้านบน และไม่ใช่การกำหนด risk weight 72.5% ให้สินเชื่อทุกก้อน</p>
  </div>;
}

export function LiquidityLab() {
  const [hqla, setHqla] = useState(120), [outflows, setOutflows] = useState(160), [inflows, setInflows] = useState(60);
  const liquidity = liquidityCoverage(hqla, outflows, inflows);
  const labels = ['ไหลออก', 'นับเข้า', 'ออกสุทธิ', 'HQLA'];
  return <div className="lab"><LabTitle title="เงินไหลเข้าเยอะ ไม่ได้หักเงินไหลออกได้ทั้งหมด">สถานการณ์ตึงตัว 30 วัน · จำนวนเงินสมมติ หน่วยล้านบาท · HQLA และกระแสเงินสดเป็นยอดที่ปรับตามเกณฑ์แล้ว</LabTitle>
    <div className="controls two"><Range label="HQLA ที่ใช้ได้" value={hqla} onChange={setHqla} min={40} max={200} step={5} suffix=" ล้านบาท" /><Range label="เงินไหลออกภายใต้ความเครียด" value={outflows} onChange={setOutflows} min={80} max={240} step={5} suffix=" ล้านบาท" /><Range label="เงินไหลเข้าที่เข้าเกณฑ์ ก่อน cap" value={inflows} onChange={setInflows} min={0} max={200} step={5} suffix=" ล้านบาท" /></div>
    <Chart title="เงินไหลออก เงินไหลเข้าที่นับได้ และ HQLA" description={`ไหลออก ${outflows} หักไหลเข้าที่นับได้ ${liquidity.eligibleInflows} เหลือไหลออกสุทธิ ${liquidity.netOutflows} ล้านบาท เทียบ HQLA ${hqla} ล้านบาท`} xDomain={[0, 4]} yDomain={[0, 250]} xTicks={[.5, 1.5, 2.5, 3.5]} xFormat={x => labels[Math.floor(x)]} xLabel="ยอดภายใต้เกณฑ์ LCR" yLabel="ล้านบาท" bars={[{ x: .15, width: .7, y: outflows }, { x: 1.15, width: .7, y: liquidity.eligibleInflows, className: 'positive-bar' }, { x: 2.15, width: .7, y: liquidity.netOutflows }, { x: 3.15, width: .7, y: hqla, className: 'positive-bar' }]} />
    <div className="results" aria-live="polite"><div><span>เงินไหลออกสุทธิ 30 วัน</span><strong>{format(liquidity.netOutflows)} <small>ล้านบาท</small></strong><p>{outflows} − min({inflows}, {format(liquidity.inflowCap)})</p></div><div><span>Liquidity coverage ratio</span><strong>{percent(liquidity.lcr)}</strong><p>{hqla} ÷ {format(liquidity.netOutflows)} · {liquidity.lcr >= 1 ? 'ถึงเกณฑ์ 100% ในภาวะปกติ' : 'ต่ำกว่าเกณฑ์ 100% ในภาวะปกติ'}</p></div></div>
    <p className="lab-note">เพดานเงินไหลเข้าที่นับได้ = 75% × {outflows} = {format(liquidity.inflowCap)} ล้านบาท · {inflows > liquidity.inflowCap ? `เงินไหลเข้าส่วนเกิน ${format(inflows - liquidity.inflowCap)} ล้านบาทไม่ได้ลดตัวหารอีก` : 'เงินไหลเข้ายังไม่เกินเพดาน'} · เมื่อมีเพดานนี้ เงินไหลออกสุทธิจะไม่ต่ำกว่า 25% ของไหลออก ตัวอย่างไม่ได้แยกประเภท HQLA หรือข้อยกเว้นเฉพาะกรณี</p>
  </div>;
}

export function IRBLab() {
  const [pd, setPd] = useState(1), [lgd, setLgd] = useState(45), [maturity, setMaturity] = useState(2.5);
  const irb = corporateIRB({ pd: pd / 100, lgd: lgd / 100, maturity, ead: 100 });
  const grid = Array.from({ length: 101 }, (_, i) => .05 + i * 9.95 / 100);
  const selected = grid.map(value => [value, 100 * corporateIRB({ pd: value / 100, lgd: lgd / 100, maturity }).capitalRate]);
  const baseline = grid.map(value => [value, 100 * corporateIRB({ pd: value / 100, lgd: lgd / 100, maturity: 1 }).capitalRate]);
  return <div className="lab"><LabTitle title="จาก PD และ LGD ไปสู่ทุน IRB">พอร์ตสินเชื่อบริษัทสมมติ EAD = 100 ล้านบาท · ยังไม่ผิดนัด · ไม่มี SME adjustment หรือ financial-institution multiplier</LabTitle>
    <div className="controls two"><Range label="PD ต่อปี" value={pd} onChange={setPd} min={.05} max={10} step={.05} suffix="%" /><Range label="LGD" value={lgd} onChange={setLgd} min={10} max={80} suffix="%" /><Range label="Effective maturity (M)" value={maturity} onChange={setMaturity} min={1} max={5} step={.1} suffix=" ปี" /></div>
    <div className="results" aria-live="polite"><div><span>Expected loss · PD × LGD × EAD</span><strong>{format(irb.expectedLoss)} <small>ล้านบาท</small></strong><p>{percent(irb.expectedLossRate)} ของ EAD</p></div><div><span>ขาดทุนที่ quantile 99.9% ก่อนปรับ M</span><strong>{format(irb.stressLoss)} <small>ล้านบาท</small></strong><p>Stress PD {percent(irb.stressPd)} × LGD × EAD</p></div><div><span>ทุน K × EAD หลังปรับ M</span><strong>{format(irb.capital)} <small>ล้านบาท</small></strong><p>K = {percent(irb.capitalRate)} ของ EAD</p></div><div><span>Risk weight · 12.5 × K</span><strong>{percent(irb.riskWeight)}</strong><p>RWA = {format(irb.rwa)} ล้านบาท</p></div></div>
    <Chart title="อัตราทุน K เมื่อ PD และอายุสินเชื่อเปลี่ยน" description={`LGD ${lgd}% เส้นม่วงใช้ M ${maturity} ปี เส้นเขียวประใช้ M 1 ปี จุดแสดง PD ที่เลือก ${pd}% และ K ${percent(irb.capitalRate)}`} xDomain={[.05, 10]} yDomain={[0, Math.max(...selected.map(([, value]) => value)) * 1.1]} xTicks={[.05, 2.5, 5, 7.5, 10]} xLabel="PD ต่อปี (%)" yLabel="K (% ของ EAD)" yFormat={value => format(value, 1)} lines={[{ values: baseline, className: 'secondary-line' }, { values: selected }]} markers={[{ x: pd, y: 100 * irb.capitalRate }]} />
    <div className="legend"><span className="mean-key">M = {maturity} ปี · ม่วงทึบ</span><span className="median-key">M = 1 ปี · เขียวประ</span></div>
    <p className="lab-note">Asset correlation ρ = {percent(irb.rho)} · maturity adjustment = {format(irb.maturityAdjustment, 3)} เท่า · K × EAD = (ขาดทุนที่ quantile − expected loss) × maturity adjustment จึงไม่ใช่ expected loss และไม่ใช่ 99.9% ของ EAD · ที่ M = 1 ปี เส้นทั้งสองทับกัน</p>
    <p className="lab-note">ใช้สูตร corporate IRB ที่ไม่มีตัวคูณ 1.06 ในอดีต · ตัวอย่างนี้ยังไม่รวม output floor, buffers, การเทียบ expected loss กับ provisions หรือข้อกำหนดอนุญาตใช้ IRB จึงไม่ใช่ยอดทุนรวมที่ธนาคารจริงต้องถือ</p>
  </div>;
}
