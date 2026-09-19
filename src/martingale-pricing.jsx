import React, { useMemo, useState } from 'react';
import { Chart, Range, LabTitle, format } from './ui.jsx';
import { generalizedEuropean, black76, measureChangeExperiment } from './martingale-pricing.mjs';

export function MeasureChangeLab() {
  const [mu, setMu] = useState(12), [r, setR] = useState(5), [sigma, setSigma] = useState(20), [tau, setTau] = useState(1);
  const model = useMemo(() => measureChangeExperiment({ mu: mu / 100, r: r / 100, sigma: sigma / 100, tau }), [mu, r, sigma, tau]);
  const times = Array.from({ length: 81 }, (_, i) => i * tau / 80);
  const physical = times.map(t => [t, 100 * Math.exp((mu - r) / 100 * t)]), neutral = times.map(t => [t, 100]);
  const lo = Math.min(100, model.physicalStockMean), hi = Math.max(100, model.physicalStockMean), padding = Math.max(3, (hi - lo) * .18);
  return <div className="lab"><LabTitle title="เปลี่ยน μ แล้วราคา Option ต้องเปลี่ยนด้วยไหม">GBM จำลอง · S₀ = K = 100 หน่วย · ไม่มีเงินปันผล · 20,000 ตัวอย่าง · seed 2532 · ดอกเบี้ยและ drift ทบต้นต่อเนื่อง</LabTitle>
    <div className="controls two"><Range label="Drift ภายใต้ P · μ ต่อปี" value={mu} onChange={setMu} min={-5} max={20} step={1} suffix="%" /><Range label="อัตราดอกเบี้ย · r ต่อปี" value={r} onChange={setR} min={0} max={10} step={1} suffix="%" /><Range label="Volatility · σ ต่อปี" value={sigma} onChange={setSigma} min={15} max={50} step={1} suffix="%" /><Range label="เวลาถึงวันหมดอายุ · τ" value={tau} onChange={setTau} min={.25} max={2} step={.25} suffix=" ปี" /></div>
    <Chart title="ค่าเฉลี่ยเชิงทฤษฎีของราคาหุ้นที่คิดลดแล้ว" description={`ภายใต้ P ค่าเฉลี่ยที่วันหมดอายุคือ ${format(model.physicalStockMean,3)} ภายใต้ Q คงที่ 100 กราฟนี้เป็นค่าทฤษฎี ไม่ใช่เส้นทางราคาหรือค่าเฉลี่ยตัวอย่าง`} xDomain={[0, tau]} yDomain={[lo - padding, hi + padding]} xLabel="เวลาจากวันนี้ (ปี)" yLabel="E[e⁻ʳᵗSₜ] (หน่วยราคา)" yFormat={v => format(v,1)} lines={[{ values: physical }, { values: neutral, className: 'secondary-line' }]} />
    <div className="legend"><span className="mean-key">P · 100 exp((μ − r)t) · ม่วงทึบ</span><span className="median-key">Q · 100 · เขียวประ</span></div>
    <div className="results" aria-live="polite"><div><span>ราคา Call ตามสูตรภายใต้ Q</span><strong data-testid="measure-analytic">{format(model.analytic.price,4)}</strong><p>คงเดิมเมื่อปรับเฉพาะ μ</p></div><div><span>คิดลด payoff เฉลี่ยภายใต้ P</span><strong data-testid="measure-physical">{format(model.physicalCall.mean,4)}</strong><p>SE = {format(model.physicalCall.se,4)} · ไม่ใช่สูตรราคาทั่วไป</p></div></div>
    <div className="results" aria-live="polite"><div><span>จำลองโดยตรงภายใต้ Q</span><strong data-testid="measure-neutral">{format(model.riskNeutralCall.mean,4)}</strong><p>SE = {format(model.riskNeutralCall.se,4)}</p></div><div><span>จำลอง P แล้วถ่วงด้วย Z</span><strong data-testid="measure-weighted">{format(model.weightedCall.mean,4)}</strong><p>SE ของ Z × discounted payoff = {format(model.weightedCall.se,4)}</p></div></div>
    <p className="lab-note">ค่าเฉลี่ยตัวอย่างของหุ้นที่คิดลดแล้ว: P = {format(model.physicalStock.mean,3)} (SE {format(model.physicalStock.se,3)}) · Q = {format(model.riskNeutralStock.mean,3)} (SE {format(model.riskNeutralStock.se,3)}) · เป้าหมายเชิงทฤษฎีภายใต้ Q คือ 100</p>
    <p className="lab-note">θ = (μ − r)/σ = {format(model.theta,3)} · Z = exp(−θWᴾ(τ) − θ²τ/2) · ค่าเฉลี่ยตัวอย่างของ Z = {format(model.weights.mean,4)} (SE {format(model.weights.se,4)}; ค่าทฤษฎี 1) · คำนวณค่าเฉลี่ยของ Z × payoff ที่คิดลดแล้วโดยตรง ไม่หารด้วยค่าเฉลี่ย Z</p>
    <p className="lab-note">ทุกครั้งใช้ Normal draws ชุดเดิมร่วมกันสำหรับ P และ Q จึงเห็นผลของการเปลี่ยนพารามิเตอร์ได้ชัดขึ้น ผลจำลอง Q กับผลถ่วงน้ำหนัก P อาจต่างกันเพราะจำนวนตัวอย่างจำกัด SE วัด sampling error ภายในแบบจำลองนี้ ไม่ได้วัดความผิดพลาดของสมมติฐานตลาด ลองตั้ง μ = r: Z ทุกตัวเท่ากับ 1 และผลจำลองทั้งสามแบบจะตรงกัน</p>
  </div>;
}

export function PricingExtensionsLab() {
  const [mode, setMode] = useState('spot'), [kind, setKind] = useState('call');
  const [underlying, setUnderlying] = useState(100), [K, setK] = useState(100), [r, setR] = useState(5), [D, setD] = useState(2), [sigma, setSigma] = useState(20), [tau, setTau] = useState(1);
  const R = r / 100 * tau, integratedD = D / 100 * tau, A = (sigma / 100) ** 2 * tau;
  const priceAt = (value, optionKind = kind) => mode === 'spot' ? generalizedEuropean({ S: value, K, R, D: integratedD, A, kind: optionKind }) : black76({ F: value, K, R, A, kind: optionKind });
  const result = priceAt(underlying), xMin = 40, xMax = 180;
  const grid = Array.from({ length: 141 }, (_, i) => xMin + i);
  const call = grid.map(x => [x, priceAt(x, 'call').price]), put = grid.map(x => [x, priceAt(x, 'put').price]);
  const forward = mode === 'spot' ? underlying * Math.exp(R - integratedD) : underlying;
  const equivalent = black76({ F: forward, K, R, A, kind });
  return <div className="lab"><LabTitle title="เงินปันผลและ Black-76 เปลี่ยนสูตรตรงไหน">ราคา European Option · พารามิเตอร์คงที่ในแต่ละครั้ง · หน่วยราคาสมมติ · อัตราทบต้นต่อเนื่อง · ไม่มีต้นทุนธุรกรรม</LabTitle>
    <div className="segmented" role="group" aria-label="แบบจำลองราคา"><button aria-pressed={mode === 'spot'} onClick={() => setMode('spot')}>หุ้นจ่ายเงินปันผล</button><button aria-pressed={mode === 'futures'} onClick={() => setMode('futures')}>Futures · Black-76</button></div>
    <div className="segmented" role="group" aria-label="ชนิด Option">{['call', 'put'].map(value => <button key={value} aria-pressed={kind === value} onClick={() => setKind(value)}>{value === 'call' ? 'Call' : 'Put'}</button>)}</div>
    <div className="controls two"><Range label={mode === 'spot' ? 'ราคาหุ้นวันนี้ · S' : 'ราคา Futures วันนี้ · F'} value={underlying} onChange={setUnderlying} min={60} max={160} step={5} suffix=" หน่วย" /><Range label="ราคาใช้สิทธิ · K" value={K} onChange={setK} min={60} max={160} step={5} suffix=" หน่วย" /><Range label="อัตราดอกเบี้ย · r ต่อปี" value={r} onChange={setR} min={0} max={10} step={1} suffix="%" />{mode === 'spot' && <Range label="อัตราเงินปันผลต่อเนื่อง · D ต่อปี" value={D} onChange={setD} min={0} max={10} step={1} suffix="%" />}<Range label="Volatility · σ ต่อปี" value={sigma} onChange={setSigma} min={0} max={50} step={1} suffix="%" /><Range label="เวลาถึงวันหมดอายุ Option · τ" value={tau} onChange={setTau} min={0} max={3} step={.25} suffix=" ปี" /></div>
    <Chart title={`ราคา Call และ Put เมื่อราคา ${mode === 'spot' ? 'หุ้น' : 'Futures'} เปลี่ยน`} description={`เส้นม่วง Call เส้นประเขียว Put จุดแสดง ${kind} ที่ราคา underlying ${underlying} ค่า ${format(result.price,4)}`} xDomain={[xMin, xMax]} yDomain={[0, Math.max(...call.map(row => row[1]), ...put.map(row => row[1]), 1) * 1.08]} xTicks={[40, 75, 110, 145, 180]} xLabel={mode === 'spot' ? 'ราคาหุ้นวันนี้ S (หน่วยราคา)' : 'ราคา Futures วันนี้ F (หน่วยราคา)'} yLabel="ราคา Option วันนี้ (หน่วยราคา)" lines={[{ values: call }, { values: put, className: 'secondary-line' }]} markers={[{ x: underlying, y: result.price }]} />
    <div className="legend"><span className="mean-key">Call · ม่วงทึบ</span><span className="median-key">Put · เขียวประ</span></div>
    <div className="results" aria-live="polite"><div><span>ราคา {kind === 'call' ? 'Call' : 'Put'} · {mode === 'spot' ? 'หุ้นจ่ายเงินปันผล' : 'Black-76'}</span><strong data-testid="extension-price">{format(result.price,4)}</strong><p>d₁ = {result.d1 === null ? 'ไม่กำหนดที่ขอบเขตนี้' : format(result.d1,4)} · d₂ = {result.d2 === null ? 'ไม่กำหนดที่ขอบเขตนี้' : format(result.d2,4)}</p></div><div><span>Call − Put</span><strong data-testid="extension-parity">{format(result.call - result.put,4)}</strong><p>{mode === 'spot' ? 'Se⁻ᴰτ − Ke⁻ʳτ' : 'e⁻ʳτ(F − K)'} · Put–call parity</p></div></div>
    {mode === 'spot' ? <p className="lab-note">Forward ที่ส่งมอบในวันหมดอายุ Option: F = Se⁽ʳ⁻ᴰ⁾τ = {format(forward,4)} · แทน F นี้ใน Black-76 ได้ราคา {format(equivalent.price,4)} เท่ากัน เพราะอัตราดอกเบี้ยและเงินปันผลกำหนดไว้แน่นอน D คือ dividend yield ไม่ใช่ความน่าจะเป็น</p> : <p className="lab-note">F คือราคาอ้างอิงของสัญญา Futures ไม่ใช่เงินที่จ่ายซื้อสัญญาทั้งก้อน ภายใต้สมมติฐานดอกเบี้ยกำหนดแน่นอน F เป็น Q-martingale: Eᵠ[F ตอน Option หมดอายุ] = {format(underlying,2)} แต่ payoff ของ Option ยังต้องคิดลดด้วย e⁻ʳτ = {format(result.discount,4)} อายุ τ วัดถึงวันหมดอายุ Option; วันส่งมอบ Futures อาจอยู่ภายหลัง</p>}
    <p className="lab-note">ค่าที่เข้าในสูตร: ∫r dt = {format(R,4)} · {mode === 'spot' ? `∫D dt = ${format(integratedD,4)} · ` : ''}A = ∫σ² dt = {format(A,4)} · √A = {format(Math.sqrt(A),4)} หาก σ หรือ τ เป็นศูนย์ ใช้ขอบเขต payoff แบบแน่นอนแทนการหารด้วย √A</p>
  </div>;
}
