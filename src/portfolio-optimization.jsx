import React, { useId, useMemo, useState } from 'react';
import { LabTitle, Range, format } from './ui.jsx';
import { blackLitterman, defaultOptimizationInputs } from './portfolio-optimization.mjs';

const ASSETS = ['สินทรัพย์ 1', 'สินทรัพย์ 2', 'สินทรัพย์ 3', 'สินทรัพย์ 4'];
const percent = (value, digits = 2) => `${format(100 * value, digits)}%`;
const clean = value => Math.abs(value) < 5e-13 ? 0 : value;

function ReturnComparison({ prior, posterior }) {
  const titleId = useId(), descriptionId = useId();
  const width = 700, height = 330, left = 92, right = 32;
  const maximum = .30, x = value => left + value / maximum * (width - left - right);
  const description = ASSETS.map((asset, index) => `${asset}: prior ${percent(prior[index])}, posterior ${percent(posterior[index])}`).join('; ');
  return <div className="chart">
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
      <title id={titleId}>ผลตอบแทนส่วนเกินก่อนและหลังรวม view</title>
      <desc id={descriptionId}>{description}</desc>
      {[0, .05, .10, .15, .20, .25, .30].map(value => <g key={value}>
        <line className="grid" x1={x(value)} x2={x(value)} y1="38" y2="270" />
        <text x={x(value)} y="294" textAnchor="middle">{format(100 * value, 0)}</text>
      </g>)}
      {ASSETS.map((asset, index) => {
        const cy = 63 + index * 62;
        return <g key={asset}>
          <text x="60" y={cy + 5} textAnchor="end">X{index + 1}</text>
          <line x1={x(prior[index])} x2={x(posterior[index])} y1={cy} y2={cy} style={{ stroke: 'var(--muted)', strokeWidth: 2 }} />
          <circle data-series="prior" cx={x(prior[index])} cy={cy} r="6" style={{ fill: 'var(--surface)', stroke: 'var(--primary)', strokeWidth: 2 }} />
          <circle data-series="posterior" cx={x(posterior[index])} cy={cy} r="5" style={{ fill: 'var(--comparison)' }} />
        </g>;
      })}
      <text x={left} y="19" className="axis-label">วงโปร่ง: Prior · จุดทึบ: Posterior</text>
      <text x={width / 2} y="324" textAnchor="middle" className="axis-label">ผลตอบแทนส่วนเกินคาดหมาย (%)</text>
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
    <p className="lab-note">วงโปร่งแสดง prior จากสมดุลตลาด จุดทึบแสดง posterior หลังรวม view เส้นเชื่อมช่วยให้อ่านทิศทางการปรับของแต่ละสินทรัพย์</p>

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
