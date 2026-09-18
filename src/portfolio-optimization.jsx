import React, { useId, useMemo, useState } from 'react';
import { LabTitle, Range, format } from './ui.jsx';
import { blackLitterman, defaultOptimizationInputs } from './portfolio-optimization.mjs';

const ASSETS = ['สินทรัพย์ 1', 'สินทรัพย์ 2', 'สินทรัพย์ 3', 'สินทรัพย์ 4'];
const percent = (value, digits = 2) => `${format(100 * value, digits)}%`;
const clean = value => Math.abs(value) < 5e-13 ? 0 : value;

function ReturnComparison({ prior, posterior }) {
  const titleId = useId(), descriptionId = useId();
  const width = 700, height = 290, left = 54, right = 18, top = 28, bottom = 48;
  const plotHeight = height - top - bottom, maximum = .30;
  const y = value => top + (maximum - value) / maximum * plotHeight;
  const groupWidth = (width - left - right) / ASSETS.length, barWidth = Math.min(30, groupWidth * .22);
  const description = ASSETS.map((asset, index) => `${asset}: prior ${percent(prior[index])}, posterior ${percent(posterior[index])}`).join('; ');
  return <div className="chart">
    <svg width="100%" height="290" viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
      <title id={titleId}>ผลตอบแทนส่วนเกินก่อนและหลังรวม view</title>
      <desc id={descriptionId}>{description}</desc>
      <text x={left} y="15" className="axis-label">ผลตอบแทนส่วนเกินคาดหมาย (%)</text>
      {[0, .075, .15, .225, .30].map(value => <g key={value}>
        <line className="grid" x1={left} x2={width - right} y1={y(value)} y2={y(value)} />
        <text x={left - 9} y={y(value) + 4} textAnchor="end">{format(100 * value, 1)}</text>
      </g>)}
      {ASSETS.map((asset, index) => {
        const center = left + groupWidth * (index + .5), priorHeight = plotHeight - (y(prior[index]) - top), posteriorHeight = plotHeight - (y(posterior[index]) - top);
        return <g key={asset}>
          <rect x={center - barWidth - 2} y={y(prior[index])} width={barWidth} height={priorHeight} rx="2" style={{ fill: 'var(--muted)', opacity: .48 }} />
          <rect x={center + 2} y={y(posterior[index])} width={barWidth} height={posteriorHeight} rx="2" style={{ fill: 'var(--primary)' }} />
          <text x={center} y={height - 22} textAnchor="middle">{index + 1}</text>
        </g>;
      })}
      <text x={width - right} y={height - 6} textAnchor="end" className="axis-label">สินทรัพย์</text>
    </svg>
  </div>;
}

export function PortfolioOptimizationLab() {
  const [riskAversion, setRiskAversion] = useState(2.24), [uncertainty, setUncertainty] = useState(1);
  const inputs = useMemo(defaultOptimizationInputs, []);
  const result = useMemo(() => blackLitterman({
    ...inputs,
    riskAversion,
    uncertaintyMultiplier: uncertainty,
  }), [inputs, riskAversion, uncertainty]);
  const posteriorTotal = result.posteriorRiskyWeights.reduce((sum, value) => sum + value, 0);
  const priorTotal = result.priorRiskyWeights.reduce((sum, value) => sum + value, 0);
  const viewOne = result.posteriorExcessReturns[2] - result.posteriorExcessReturns[0];
  const viewTwo = result.posteriorExcessReturns[1];
  const reset = () => { setRiskAversion(2.24); setUncertainty(1); };

  return <div className="lab portfolio-optimization-lab">
    <LabTitle number="เพิ่มเติม" title="Black–Litterman เปลี่ยนผลตอบแทนและน้ำหนักอย่างไร">ข้อมูลสมมติ 4 สินทรัพย์ · r_f = 2.5% · น้ำหนักตลาด 5%, 40%, 45%, 10% · τ = 1/120</LabTitle>
    <div className="controls two">
      <Range label="Risk aversion λ" value={riskAversion} onChange={setRiskAversion} min={.5} max={6} step={.05} />
      <Range label="ตัวคูณความไม่แน่นอนของ view" value={uncertainty} onChange={setUncertainty} min={.25} max={4} step={.25} />
    </div>
    <p className="lab-note">ตัวคูณต่ำหมายถึงเชื่อ view มากขึ้น ส่วน λ สูงทำให้น้ำหนักสินทรัพย์เสี่ยงลดลง การทดลองอนุญาตให้กู้และขายชอร์ต จึงอาจเห็นน้ำหนักติดลบหรือรวมเกิน 100%</p>
    <div className="reading-note">
      <strong>View ที่ป้อนเข้าแบบจำลอง</strong>
      <p>สินทรัพย์ 3 ให้ผลตอบแทนส่วนเกินมากกว่าสินทรัพย์ 1 อยู่ 10 จุดเปอร์เซ็นต์ และสินทรัพย์ 2 ให้ผลตอบแทนส่วนเกิน 3%</p>
    </div>
    <ReturnComparison prior={result.priorExcessReturns} posterior={result.posteriorExcessReturns} />
    <p className="lab-note">แท่งสีเทาแสดง prior จากสมดุลตลาด แท่งสีม่วงแสดง posterior หลังรวม view</p>

    <div className="table-wrap" tabIndex="0" role="group" aria-label="ตารางผลตอบแทนส่วนเกินก่อนและหลังรวม view">
      <table>
        <thead><tr><th>สินทรัพย์</th><th>Prior excess return</th><th>Posterior excess return</th></tr></thead>
        <tbody>{ASSETS.map((asset, index) => <tr key={asset}>
          <th>{asset}</th>
          <td><output data-opt={`prior-return-${index}`}>{percent(result.priorExcessReturns[index], 3)}</output></td>
          <td><output data-opt={`posterior-return-${index}`}>{percent(result.posteriorExcessReturns[index], 3)}</output></td>
        </tr>)}</tbody>
      </table>
    </div>

    <div className="table-wrap" tabIndex="0" role="group" aria-label="ตารางเปรียบเทียบน้ำหนักตลาด prior และ posterior">
      <table>
        <thead><tr><th>สินทรัพย์</th><th>น้ำหนักตลาด</th><th>Prior optimizer</th><th>Posterior optimizer</th></tr></thead>
        <tbody>{ASSETS.map((asset, index) => <tr key={asset}>
          <th>{asset}</th>
          <td><output data-opt={`market-weight-${index}`}>{percent(result.marketWeights[index])}</output></td>
          <td><output data-opt={`prior-weight-${index}`}>{percent(clean(result.priorRiskyWeights[index]))}</output></td>
          <td><output data-opt={`posterior-weight-${index}`}>{percent(clean(result.posteriorRiskyWeights[index]))}</output></td>
        </tr>)}</tbody>
      </table>
    </div>

    <div className="results" aria-live="polite">
      <div><span>น้ำหนักสินทรัพย์เสี่ยงรวมหลังรวม view</span><strong data-opt="posterior-risky-total">{percent(posteriorTotal)}</strong><p>ผลรวมของน้ำหนักสินทรัพย์ 1–4</p></div>
      <div><span>น้ำหนักสินทรัพย์ปลอดความเสี่ยงคงเหลือ</span><strong data-opt="posterior-risk-free">{percent(clean(result.posteriorRiskFreeWeight))}</strong><p>{result.posteriorRiskFreeWeight < 0 ? 'ค่าติดลบหมายถึงกู้ที่ r_f มาลงในสินทรัพย์เสี่ยง' : 'ส่วนที่เหลือลงในสินทรัพย์ปลอดความเสี่ยง'}</p></div>
      <div><span>Prior risky weight รวม</span><strong data-opt="prior-risky-total">{percent(priorTotal)}</strong><p>ที่ λ = 2.24 น้ำหนัก prior ตรงกับน้ำหนักตลาด</p></div>
      <div><span>Prior risk-free weight</span><strong data-opt="prior-risk-free">{percent(clean(result.priorRiskFreeWeight))}</strong><p>เปลี่ยนตาม λ เพราะ prior excess return คงเดิม</p></div>
    </div>
    <div className="calculation-strip" aria-live="polite">
      <span>View หลังอัปเดต posterior</span>
      <strong>ข้อ 1 = <output data-opt="posterior-view-1">{percent(viewOne, 3)}</output> · ข้อ 2 = <output data-opt="posterior-view-2">{percent(viewTwo, 3)}</output></strong>
      <p className="lab-note">Posterior ไม่จำเป็นต้องเท่ากับ Q พอดี เพราะแบบจำลองถ่วง view กับ prior ตาม Ω ตัวคูณความไม่แน่นอนยิ่งสูง ผลยิ่งกลับเข้าใกล้ prior</p>
    </div>
    <div className="lab-actions"><button onClick={reset}>คืนค่าเริ่มต้นของ Black–Litterman</button></div>
    <p className="lab-note">ผลลัพธ์มาจากค่าเฉลี่ย ความผันผวน correlation น้ำหนักตลาด และ view ที่กำหนดขึ้น ไม่มีค่าธรรมเนียม ภาษี หรือข้อจำกัดน้ำหนัก ไม่ใช่คำแนะนำการลงทุน</p>
  </div>;
}
