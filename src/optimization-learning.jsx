import React, { useId, useMemo, useState } from 'react';
import { Chart, LabTitle, Range, format } from './ui.jsx';
import { defaultOptimizationInputs, estimationBurden, longOnlyTargetPortfolio, minimumVarianceForTarget, quadraticConstraint } from './portfolio-optimization.mjs';
import { useChartWidth, WeightsChart } from './learning-charts.jsx';

const pct = (x, digits = 2) => `${format(100 * x, digits)}%`;

export function ConstraintLab() {
  const [mode, setMode] = useState('inequality'), [bound, setBound] = useState(1);
  const result = quadraticConstraint({ mode, bound });
  const [ref, width] = useChartWidth(540), id = useId();
  const size = width - 68, height = size + 70, scale = size / 7;
  const x = v => 44 + (v + 3) * scale, y = v => 26 + (4 - v) * scale;
  const gradient = [2 * (result.x - 1), 4 * (result.y - 1)];
  const norm = Math.hypot(...gradient), factor = norm ? .9 / norm : 0;
  return <div className="lab learning-lab" data-learning="constraints">
    <LabTitle title="ขยับข้อจำกัด แล้วหาจุดต่ำที่สุด">f(x, y) = (x − 1)² + 2(y − 1)² · จุดต่ำสุดเมื่อไม่มีข้อจำกัดคือ (1, 1)</LabTitle>
    <div className="segmented" role="group" aria-label="ชนิดข้อจำกัด">
      {[['none', 'ไม่มีข้อจำกัด'], ['equality', 'x + y = c'], ['inequality', 'x + y ≤ c']].map(([key, label]) => <button key={key} aria-pressed={mode === key} onClick={() => setMode(key)}>{label}</button>)}
    </div>
    <Range label="ขอบเขต c" value={bound} onChange={setBound} min={-2} max={4} step={.25} />
    <div className="constraint-chart chart" ref={ref}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${id}-title ${id}-desc`}>
        <title id={`${id}-title`}>เส้นระดับฟังก์ชันและจุดต่ำสุดภายใต้ข้อจำกัด</title>
        <desc id={`${id}-desc`}>{`คำตอบ x=${format(result.x, 3)}, y=${format(result.y, 3)}, objective=${format(result.objective, 3)}; ${mode === 'none' ? 'ไม่มีข้อจำกัด' : result.binding ? 'binding' : 'slack'}`}</desc>
        <defs><clipPath id={`${id}-clip`}><rect x="44" y="26" width={size} height={size} /></clipPath>
          <marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 Z" fill="context-stroke" /></marker></defs>
        <g clipPath={`url(#${id}-clip)`}>
          {mode === 'inequality' && <polygon points={`${x(-3)},${y(-3)} ${x(-3)},${y(bound + 3)} ${x(bound + 3)},${y(-3)}`} fill="var(--comparison)" opacity=".10" />}
          {[-3,-2,-1,0,1,2,3,4].map(v => <g key={v}><line className="grid" x1={x(v)} x2={x(v)} y1="26" y2={26 + size} /><line className="grid" x1="44" x2={44 + size} y1={y(v)} y2={y(v)} /></g>)}
          {[.3,1,3,7,12].map(level => <ellipse key={level} cx={x(1)} cy={y(1)} rx={Math.sqrt(level) * scale} ry={Math.sqrt(level / 2) * scale} fill="none" stroke="var(--primary)" opacity=".55" strokeWidth="1.5" />)}
          {mode !== 'none' && <line x1={x(-3)} y1={y(bound + 3)} x2={x(4)} y2={y(bound - 4)} stroke="var(--comparison)" strokeWidth="3" />}
          {result.binding && <>
            <line x1={x(result.x)} y1={y(result.y)} x2={x(result.x + .65)} y2={y(result.y + .65)} stroke="var(--comparison)" strokeWidth="2" markerEnd={`url(#${id}-arrow)`} />
            {norm > 1e-9 && <line x1={x(result.x)} y1={y(result.y)} x2={x(result.x + gradient[0] * factor)} y2={y(result.y + gradient[1] * factor)} stroke="var(--primary)" strokeWidth="2" markerEnd={`url(#${id}-arrow)`} />}
          </>}
          <circle cx={x(1)} cy={y(1)} r="6" fill="var(--bg)" stroke="var(--primary)" strokeWidth="2" />
          <circle cx={x(result.x)} cy={y(result.y)} r="4" fill="var(--comparison)" stroke="var(--bg)" strokeWidth="1" />
        </g>
        {[-2,0,2,4].map(v => <g key={v}><text x={x(v)} y={height - 20} textAnchor="middle">{v}</text><text x="31" y={y(v) + 4} textAnchor="end">{v}</text></g>)}
        <text x={width - 12} y={height - 5}>x</text><text x="15" y="18">y</text>
      </svg>
    </div>
    <p className="learning-legend"><span className="key-prior">วงโปร่ง: จุดต่ำสุดเดิม</span><span className="key-posterior">จุดทึบ: คำตอบที่ทำได้</span></p>
    <p className="lab-note">พื้นที่แรเงาคือบริเวณที่อนุญาต ลูกศรม่วงและเขียวแสดงทิศของ ∇f และ ∇(x+y−c) โดยปรับความยาวเพื่ออ่านทิศทาง</p>
    <div className="results" aria-live="polite"><div><span>คำตอบ (x, y)</span><strong data-geometry="point">({format(result.x, 2)}, {format(result.y, 2)})</strong><p>f = <output data-geometry="objective">{format(result.objective, 3)}</output></p></div>
      <div><span>สถานะข้อจำกัด</span><strong data-geometry="status">{mode === 'none' ? 'ไม่มี' : result.binding ? 'Binding' : 'Slack'}</strong><p>ν = {format(result.multiplier, 3)} · slack = {result.slack === null ? '—' : format(Math.abs(result.slack) < 1e-12 ? 0 : result.slack, 3)}</p></div></div>
    <p className="lab-note">ใช้ L = f + ν(x+y−c) โดย inequality ต้องมี ν ≥ 0 ส่วน equality มี ν ติดลบได้</p>
    <p>ลองเลือก x + y ≤ c แล้วเลื่อน c ผ่าน 2 จุดคำตอบหยุดย้ายเมื่อใด และ ν เป็นเท่าไร?</p>
    <button onClick={() => { setMode('inequality'); setBound(1); }}>คืนค่าเริ่มต้น</button>
  </div>;
}

export function TargetPortfolioLab() {
  const [target, setTarget] = useState(10), [longOnly, setLongOnly] = useState(false);
  const inputs = useMemo(defaultOptimizationInputs, []);
  const curves = useMemo(() => {
    const unconstrained = [], constrained = [];
    for (const m of [...new Set([...Array.from({length:121}, (_,i)=>i*.003), .05, .27])].sort((a,b)=>a-b)) {
      const r = minimumVarianceForTarget({ ...inputs, target: m });
      unconstrained.push([100 * r.sigma, 100 * m]);
      const lo = longOnlyTargetPortfolio({ ...inputs, target: m });
      if (lo.status === 'optimal') constrained.push([100 * lo.sigma, 100 * m]);
    }
    return { unconstrained, constrained };
  }, [inputs]);
  const unrestricted = minimumVarianceForTarget({ ...inputs, target: target / 100 });
  const result = longOnly ? longOnlyTargetPortfolio({ ...inputs, target: target / 100 }) : { ...unrestricted, status: 'optimal' };
  const feasible = result.status === 'optimal';
  return <div className="lab learning-lab" data-learning="target">
    <LabTitle title="ตั้งเป้าหมาย แล้วดูว่าแต่ละสินทรัพย์ต้องถือเท่าไร">สี่สินทรัพย์เดิม · ใช้เงินครบ 100% · ไม่มีสินทรัพย์ปลอดความเสี่ยงในกิจกรรมนี้</LabTitle>
    <Range label="ผลตอบแทนคาดหวังเป้าหมาย (%)" value={target} onChange={setTarget} min={0} max={35} step={.25} />
    <div className="segmented" role="group" aria-label="การขายชอร์ต"><button aria-pressed={!longOnly} onClick={() => setLongOnly(false)}>อนุญาต short</button><button aria-pressed={longOnly} onClick={() => setLongOnly(true)}>Long-only</button></div>
    <div className="lab-actions"><button onClick={() => setTarget(10)}>ตัวอย่าง 10%</button><button onClick={() => setTarget(20)}>ตัวอย่าง 20%</button></div>
    <Chart title="Minimum-variance frontier ภายใต้กติกาสองแบบ" description="เส้นม่วงอนุญาต short เส้นเขียว long-only จุดคือคำตอบตาม target เมื่อมีคำตอบ ทั้งเส้นรวม branch ที่ไม่มีประสิทธิภาพใต้ GMV ด้วย"
      xDomain={[0, 85]} yDomain={[0, 36]} xLabel="Volatility (%)" yLabel="Expected return (%)"
      lines={[{ values: curves.unconstrained }, { values: curves.constrained, className: 'secondary-solid' }]}
      markers={feasible ? [{ x: 100 * result.sigma, y: target }] : []} />
    <p className="lab-note">เส้นแสดง variance ต่ำสุดที่แต่ละ target รวมส่วนใต้ GMV ซึ่งมีพอร์ตที่ให้ผลตอบแทนสูงกว่าโดยรับความเสี่ยงไม่เพิ่มด้วย</p>
    <p className="learning-legend"><span className="key-prior">อนุญาต short</span><span className="key-posterior">Long-only</span></p>
    {feasible ? <>
      <WeightsChart labels={['X1','X2','X3','X4']} first={unrestricted.weights} second={result.weights} firstLabel="อนุญาต short" secondLabel={longOnly ? 'Long-only' : 'พอร์ตที่เลือก'} />
      <div className="results" aria-live="polite"><div><span>ผลตอบแทนคาดหวัง</span><strong data-target="return">{pct(result.mean)}</strong><p>Volatility <output data-target="volatility">{pct(result.sigma)}</output></p></div><div><span>น้ำหนักรวม</span><strong data-target="budget">{pct(result.weights.reduce((s,w) => s+w,0))}</strong><p data-target="active">{longOnly ? `ชนศูนย์: ${result.active.length ? result.active.map(i => `X${i+1}`).join(', ') : 'ไม่มี'}` : 'น้ำหนักติดลบหมายถึง short'}</p></div></div>
    </> : <div className="reading-note" role="status" data-target="infeasible"><strong>ไม่มีพอร์ต long-only ที่ให้ target นี้</strong><p>ผลตอบแทนคาดหวังของสี่สินทรัพย์อยู่ระหว่าง 5% ถึง 27% เมื่อห้าม short และใช้เงินครบ 100% ผลตอบแทนพอร์ตต้องอยู่ในช่วงเดียวกัน ลองลด target หรือเปลี่ยนกติกา</p></div>}
    <p>ลองตั้ง 20% แล้วเปิด Long-only อ่านน้ำหนัก X1 และเปรียบเทียบ volatility จากนั้นลองตั้ง target สูงกว่า 27%</p>
    <button onClick={() => { setTarget(10); setLongOnly(false); }}>คืนค่าเริ่มต้น</button>
  </div>;
}

export function EstimationLab() {
  const [assets, setAssets] = useState(100), [years, setYears] = useState(25), [volatility, setVolatility] = useState(20);
  const result = estimationBurden({ assets, years, volatility: volatility / 100 });
  const curve = Array.from({ length: 400 }, (_, i) => [i + 1, volatility / Math.sqrt(i + 1)]);
  return <div className="lab learning-lab" data-learning="estimation">
    <LabTitle title="ข้อมูลที่ต้องประมาณ และความแม่นที่ได้">สองการทดลองแยกกัน: N กำหนดจำนวนพารามิเตอร์ ส่วน T กำหนด SE ของค่าเฉลี่ยสินทรัพย์หนึ่งตัว</LabTitle>
    <Range label="จำนวนสินทรัพย์ N" value={assets} onChange={setAssets} min={1} max={500} />
    <div className="segmented" role="group" aria-label="ตัวอย่างจำนวนสินทรัพย์">{[10,100,500].map(n => <button key={n} aria-pressed={assets === n} onClick={() => setAssets(n)}>N = {n}</button>)}</div>
    <div className="parameter-stack" role="img" aria-label={`ค่าเฉลี่ย ${result.means}, variance ${result.variances}, covariance ${result.covariances}`}>
      <span style={{ flex: result.means }} className="parameter-means" /><span style={{ flex: result.variances }} className="parameter-variances" /><span style={{ flex: result.covariances }} className="parameter-covariances" />
    </div>
    <p className="lab-note">ค่าเฉลี่ย {format(result.means,0)} · variance {format(result.variances,0)} · covariance {format(result.covariances,0)}</p>
    <p className="calculation-strip">รวม <strong data-estimation="parameters">{format(result.total,0)} ค่า</strong>N + N + N(N−1)/2</p>
    <div className="controls two"><Range label="จำนวนปีอิสระ T" value={years} onChange={setYears} min={1} max={400} /><Range label="Annual volatility σ (%)" value={volatility} onChange={setVolatility} min={5} max={60} /></div>
    <div className="segmented" role="group" aria-label="ตัวอย่างจำนวนปี">{[25,100,400].map(t => <button key={t} aria-pressed={years === t} onClick={() => setYears(t)}>T = {t}</button>)}</div>
    <Chart title="Standard error ของค่าเฉลี่ยลดตาม 1/√T" description={`sigma ${volatility}% และ ${years} ปี ให้ SE ${format(result.standardError * 100,3)} จุดเปอร์เซ็นต์ ภายใต้ผลตอบแทนรายปีอิสระที่มี mean และ variance คงที่`}
      xDomain={[1,400]} yDomain={[0,volatility]} xLabel="Independent years (T)" yLabel="SE (percentage points)" lines={[{ values: curve }]} markers={[{ x: years, y: result.standardError * 100 }]} xTicks={[1,100,200,300,400]} />
    <div className="calculation-strip" aria-live="polite"><span>SE ของ sample mean = σ / √T</span><strong data-estimation="se">{format(100 * result.standardError,3)} จุดเปอร์เซ็นต์</strong></div>
    <p>ลองเพิ่ม T จาก 25 เป็น 100 ปี SE ลดลงครึ่งหนึ่ง ส่วนการเพิ่ม N ไม่เปลี่ยน SE ของสินทรัพย์ตัวนี้</p>
    <p className="lab-note">สมมติผลตอบแทนรายปีเป็นอิสระ มีค่าเฉลี่ยและ variance คงที่ กราฟนี้แสดง standard error ไม่ใช่ช่วงความเชื่อมั่นหรือช่วงคาดการณ์ผลตอบแทนปีหน้า ข้อมูลเก่าที่มาจากคนละสภาวะตลาดอาจไม่ตรงกับสมมติฐานนี้</p>
    <button onClick={() => { setAssets(100); setYears(25); setVolatility(20); }}>คืนค่าเริ่มต้น</button>
  </div>;
}
