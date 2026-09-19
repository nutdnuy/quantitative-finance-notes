import React, { useState } from 'react';
import { Chart, Range, LabTitle, format } from './ui.jsx';
import { updateVariance, varianceForecasts, halfLife, aggregateVariance } from './volatility-models.mjs';

export function ForecastLab() {
  const [todaySd, setTodaySd] = useState(1), [shock, setShock] = useState(-3);
  const [longRunSd, setLongRunSd] = useState(1), [persistencePct, setPersistencePct] = useState(95), [horizon, setHorizon] = useState(5);
  const alpha = 0.08, persistence = persistencePct / 100, beta = persistence - alpha;
  const variance = (todaySd / 100) ** 2, longRunVariance = (longRunSd / 100) ** 2;
  const omega = (1 - persistence) * longRunVariance;
  const nextVariance = updateVariance({ omega, alpha, beta, variance, residual: shock / 100 });
  const forecasts = varianceForecasts({ nextVariance, longRunVariance, persistence, horizon: 60 });
  const totalVariance = aggregateVariance(forecasts.slice(0, horizon));
  const nextSd = 100 * Math.sqrt(nextVariance), totalSd = 100 * Math.sqrt(totalVariance);
  const flatSd = 100 * Math.sqrt(horizon * nextVariance), decay = halfLife(persistence);
  const maxSd = 1.15 * Math.max(nextSd, longRunSd);

  return <div className="lab">
    <LabTitle title="หลัง shock ความผันผวนค่อย ๆ กลับอย่างไร">GARCH(1,1) ตัวอย่างสมมติ · ผลตอบแทนรายวันมีค่าเฉลี่ยศูนย์ · α = 0.08 คงที่ · ไม่มีข้อมูลตลาดจริง</LabTitle>
    <div className="controls two">
      <Range label="SD ของวันนี้ √hₜ" value={todaySd} onChange={setTodaySd} min={0.2} max={3} step={0.1} suffix="%" />
      <Range label="Residual ที่สังเกตวันนี้ eₜ" value={shock} onChange={setShock} min={-6} max={6} step={0.25} suffix="%" />
      <Range label="SD ระยะยาว √V" value={longRunSd} onChange={setLongRunSd} min={0.2} max={3} step={0.1} suffix="%" />
      <Range label="Persistence ρ = α + β" value={persistencePct} onChange={setPersistencePct} min={80} max={99} suffix="%" />
    </div>
    <div className="segmented" role="group" aria-label="เปรียบเทียบเครื่องหมายของ shock">
      <button aria-pressed={shock < 0} disabled={shock === 0} onClick={() => setShock(-Math.abs(shock))}>Shock ลบ −{format(Math.abs(shock), 2)}%</button>
      <button aria-pressed={shock > 0} disabled={shock === 0} onClick={() => setShock(Math.abs(shock))}>Shock บวก +{format(Math.abs(shock), 2)}%</button>
    </div>
    <p className="lab-note">เปลี่ยนเครื่องหมายโดยคงขนาด shock แล้วกราฟจะเหมือนเดิม เพราะ GARCH นี้ใช้ eₜ² · β = {format(beta, 2)} และ ω = {format(omega, 8)} ในหน่วยทศนิยม² ปรับตาม V และ ρ</p>
    <div className="results" aria-live="polite">
      <div><span>SD พรุ่งนี้ √hₜ₊₁</span><strong data-testid="forecast-next-sd">{format(nextSd, 3)}%</strong><p>hₜ₊₁ = {format(nextVariance, 8)} ทศนิยม²</p></div>
      <div><span>Half-life ของส่วนต่าง variance</span><strong data-testid="forecast-half-life">{format(decay, 2)} <small>วัน</small></strong><p>นับจาก forecast วันแรก · ไม่ใช่ half-life ของ SD</p></div>
    </div>
    <Chart title="SD จาก variance forecast ของแต่ละวันข้างหน้า" description={`เส้นม่วงเริ่มจาก SD พรุ่งนี้ ${format(nextSd, 3)}% แล้วเข้าใกล้ระดับระยะยาว ${format(longRunSd, 2)}% เส้นเขียวประ แสดง 60 วันข้างหน้า`} xDomain={[1, 60]} yDomain={[0, maxSd]} xTicks={[1, 15, 30, 45, 60]} xLabel="วันข้างหน้า k" yLabel="√Eₜ[hₜ₊ₖ] ต่อวัน (%)" yFormat={value => format(value, 2)} lines={[
      { values: forecasts.map((value, i) => [i + 1, 100 * Math.sqrt(value)]) },
      { values: [[1, longRunSd], [60, longRunSd]], className: 'secondary-line' },
    ]} verticals={[horizon]} markers={[{ x: horizon, y: 100 * Math.sqrt(forecasts[horizon - 1]) }]} />
    <div className="legend"><span className="mean-key">SD จาก forecast · ม่วงทึบ</span><span className="median-key">SD ระยะยาว · เขียวประ</span></div>
    <p className="lab-note">คำนวณ forecast ทั้งเส้น ณ สิ้นวันนี้ ไม่ได้เติม shock ที่ยังไม่เกิด · √Eₜ[hₜ₊ₖ] คือรากของ variance คาดหมาย ไม่ใช่ Eₜ[√hₜ₊ₖ]</p>
    <Range label="ช่วงสะสมผลตอบแทน H" value={horizon} onChange={setHorizon} min={1} max={60} suffix=" วัน" />
    <div className="results" aria-live="polite">
      <div><span>SD ของผลตอบแทนรวม {horizon} วัน</span><strong data-testid="forecast-total-sd">{format(totalSd, 3)}%</strong><p>√Σ Eₜ[hₜ₊ₖ] · รวม k = 1 ถึง {horizon}</p></div>
      <div><span>ถ้าคง variance เท่าวันแรกทุกวัน</span><strong data-testid="forecast-flat-sd">{format(flatSd, 3)}%</strong><p>√(H × hₜ₊₁) · สูตรเปรียบเทียบ</p></div>
    </div>
    <p className="lab-note">รวม variance ได้ภายใต้สมมติฐาน residual เป็น martingale difference ที่มีโมเมนต์อันดับสองจำกัด จึงไม่มี covariance ข้ามวันแบบมีเงื่อนไข ตัวเลขนี้เป็น SD ของผลรวม log returns เมื่อ mean เป็นศูนย์ ไม่ใช่ SD ของ simple return ที่ทบต้น และไม่ใช่ VaR หรือช่วงความเชื่อมั่น</p>
  </div>;
}
