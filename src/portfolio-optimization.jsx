import React, { useId, useMemo, useState } from 'react';
import { LabTitle, Range, format } from './ui.jsx';
import { WeightsChart, useChartWidth } from './learning-charts.jsx';
import { blackLitterman, defaultOptimizationInputs } from './portfolio-optimization.mjs';

const ASSETS = ['สินทรัพย์ 1', 'สินทรัพย์ 2', 'สินทรัพย์ 3', 'สินทรัพย์ 4'];
const percent = (value, digits = 2) => `${format(100 * value, digits)}%`;
const clean = value => Math.abs(value) < 5e-13 ? 0 : value;

function ReturnComparison({ prior, posterior }) {
  const titleId = useId(), descriptionId = useId();
  const [ref, width] = useChartWidth(700);
  const height = 330, left = 42, right = 16;
  const minimum = Math.floor(Math.min(0, ...prior, ...posterior) * 10) / 10;
  const maximum = Math.ceil(Math.max(.1, ...prior, ...posterior) * 10) / 10;
  const ticks = Array.from({length: 6}, (_, i) => minimum + (maximum-minimum)*i/5);
  const x = value => left + (value-minimum) / (maximum-minimum) * (width - left - right);
  const description = ASSETS.map((asset, index) => `${asset}: prior ${percent(prior[index])}, posterior ${percent(posterior[index])}`).join('; ');
  return <div className="chart" ref={ref}>
    <svg data-min={minimum} data-max={maximum} width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
      <title id={titleId}>ผลตอบแทนส่วนเกินก่อนและหลังรวม view</title>
      <desc id={descriptionId}>{description}</desc>
      {ticks.map(value => <g key={value}>
        <line className="grid" x1={x(value)} x2={x(value)} y1="38" y2="270" />
        <text x={x(value)} y="294" textAnchor="middle">{format(100 * value, 0)}</text>
      </g>)}
      {ASSETS.map((asset, index) => {
        const cy = 63 + index * 62;
        return <g key={asset}>
          <text x="28" y={cy + 5} textAnchor="end">X{index + 1}</text>
          <line x1={x(prior[index])} x2={x(posterior[index])} y1={cy} y2={cy} style={{ stroke: 'var(--muted)', strokeWidth: 2 }} />
          <circle data-series="prior" cx={x(prior[index])} cy={cy} r="6" style={{ fill: 'var(--surface)', stroke: 'var(--primary)', strokeWidth: 2 }} />
          <circle data-series="posterior" cx={x(posterior[index])} cy={cy} r="5" style={{ fill: 'var(--comparison)' }} />
        </g>;
      })}
      <text x={left} y="19" className="axis-label">Prior ○ · Posterior ●</text>
      <text x={width / 2} y="324" textAnchor="middle" className="axis-label">Excess return (%)</text>
    </svg>
  </div>;
}

export function PortfolioOptimizationLab() {
  const [riskAversion, setRiskAversion] = useState(2.24);
  const [views, setViews] = useState([10, 3]), [uncertainties, setUncertainties] = useState([1, 1]), [enabled, setEnabled] = useState([true, true]);
  const change = (setter, index, value) => setter(old => old.map((item, i) => i === index ? value : item));
  const inputs = useMemo(defaultOptimizationInputs, []);
  const result = useMemo(() => {
    const indices = [0, 1].filter(i => enabled[i]);
    const base = blackLitterman(inputs).baseOmega;
    return blackLitterman({ ...inputs, riskAversion,
      P: indices.map(i => inputs.P[i]), Q: indices.map(i => views[i]/100),
      omega: indices.map((i, row) => indices.map((j, col) => row === col ? base[i][i]*uncertainties[i] : 0)),
    });
  }, [inputs, riskAversion, views, uncertainties, enabled]);
  const posteriorTotal = result.posteriorRiskyWeights.reduce((sum, value) => sum + value, 0);
  const priorTotal = result.priorRiskyWeights.reduce((sum, value) => sum + value, 0);
  const viewOne = result.posteriorExcessReturns[2] - result.posteriorExcessReturns[0];
  const viewTwo = result.posteriorExcessReturns[1];
  const reset = () => { setRiskAversion(2.24); setViews([10, 3]); setUncertainties([1, 1]); setEnabled([true, true]); };

  return <div className="lab portfolio-optimization-lab">
    <LabTitle number="เพิ่มเติม" title="Black–Litterman เปลี่ยนผลตอบแทนและน้ำหนักอย่างไร">ข้อมูลสมมติ 4 สินทรัพย์ · r_f = 2.5% · น้ำหนักตลาด 5%, 40%, 45%, 10% · τ = 1/120</LabTitle>
    <Range label="Risk aversion ของผู้ลงทุน λ" value={riskAversion} onChange={setRiskAversion} min={.5} max={6} step={.05} />
    <p className="lab-note">λ ตลาดคงที่ 2.24 สำหรับหา prior · λ ผู้ลงทุนปรับขนาดการลงทุนหลังคำนวณ posterior แล้ว</p>
    {[0, 1].map(i => <fieldset className="view-controls" key={i}>
      <legend>View {i+1}: {i === 0 ? 'X3 − X1' : 'X2 เหนืออัตราปลอดความเสี่ยง'}</legend>
      <label className="view-toggle"><input type="checkbox" checked={enabled[i]} onChange={e => change(setEnabled, i, e.target.checked)} /> ใช้ view {i+1}</label>
      <div className="controls two">
        <Range label={`Q ข้อ ${i+1}`} value={views[i]} onChange={v => change(setViews,i,v)} min={-20} max={30} step={.5} suffix={i === 0 ? ' จุดเปอร์เซ็นต์' : '%'} />
        <Range label={`ตัวคูณ Ω ข้อ ${i+1}`} value={uncertainties[i]} onChange={v => change(setUncertainties,i,v)} min={.25} max={4} step={.25} />
      </div>
      {!enabled[i] && <p className="lab-note">ข้อนี้ถูกพักไว้ ค่าที่เลื่อนจะใช้เมื่อเปิด view อีกครั้ง</p>}
    </fieldset>)}
    <div className="lab-actions">
      <button onClick={() => setEnabled([false,false])}>ปิด views ทั้งหมด</button>
      <button onClick={() => {setEnabled([true,true]);setViews([-10,-5]);}}>ลอง views ติดลบ</button>
    </div>
    <p className="lab-note">ตัวคูณ Ω ต่ำหมายถึงความไม่แน่นอนน้อยลง จึงให้น้ำหนัก view มากขึ้น การทดลองอนุญาตให้กู้และขายชอร์ต</p>
    <details><summary>ดู P, Q และ Ω ที่ใช้คำนวณ</summary>
      <pre className="view-matrices">{JSON.stringify({P: inputs.P.filter((_,i)=>enabled[i]), Q: views.filter((_,i)=>enabled[i]).map(v=>v/100), Omega: result.omega}, null, 2)}</pre>
      <p className="lab-note">Q เป็นผลตอบแทนส่วนเกินในหน่วยทศนิยม · Ω เป็นความแปรปรวนของความคลาดเคลื่อนของ views · ปิดทุกข้อแล้ว posterior เท่ากับ prior</p>
    </details>
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

    <WeightsChart labels={['X1','X2','X3','X4','Risk-free']} first={[...result.priorRiskyWeights,result.priorRiskFreeWeight]} second={[...result.posteriorRiskyWeights,result.posteriorRiskFreeWeight]} firstLabel="Prior optimizer" secondLabel="Posterior optimizer" />
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
    <p className="learning-prompt">ลองปิด views ทั้งหมดที่ λ = 2.24 แล้วตรวจว่าน้ำหนักกลับเป็นพอร์ตตลาด จากนั้นเปิดเฉพาะ view 1 และลดตัวคูณ Ω ดูว่าผลตอบแทน X3 − X1 เข้าใกล้ Q อย่างไร</p>
    <div className="lab-actions"><button onClick={reset}>คืนค่าเริ่มต้นของ Black–Litterman</button></div>
    <p className="lab-note">ผลลัพธ์มาจากค่าเฉลี่ย ความผันผวน correlation น้ำหนักตลาด และ view ที่กำหนดขึ้น ไม่มีค่าธรรมเนียม ภาษี หรือข้อจำกัดน้ำหนัก ไม่ใช่คำแนะนำการลงทุน</p>
  </div>;
}
