import { ForecastLab } from './volatility-models.jsx';
import { PriceReturnsLab, ArmaLearningLab, CalendarAcfLab } from './return-foundations.jsx';
import { GreeksShockLab, GreeksConventionsLab, GreeksHigherLab } from './option-greeks.jsx';
import { NumericalMonteCarloLab, NumericalFiniteDifferenceLab } from './numerical-methods.jsx';
import { mountExoticOptionsLabs } from './exotic-options.jsx';
import { CapitalLab, LiquidityLab, IRBLab } from './basel.jsx';
import { MeasureChangeLab, PricingExtensionsLab } from './martingale-pricing.jsx';
import { ClusteringLab, MixtureLab, RealizedVolatilityLab } from './stylized-facts.jsx';
import { NormalTailLab, EmpiricalTailLab, PortfolioTailLab } from './tail-risk.jsx';
import HedgingLab from './hedging.jsx';
import MonteCarloLab from './monte-carlo.jsx';
import React, { useState, useEffect, useMemo, useRef, useId } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import CountUp from './components/CountUp.jsx';
import AnimatedList from './components/AnimatedList.jsx';
import Stepper from './components/Stepper.jsx';
import { jensen, theoretical, simulate, rollingExample, mean, stdev, histogram, normalPdf, eulerPath, nestedWiener } from './math.mjs';
import perez from '../data/perez-companc-table-3-3.json';

import { format, Range, LabTitle, Chart } from './ui.jsx';
import { ComparisonLab, ReturnsLab, DistributionLab, WienerLab } from './source-labs.jsx';
import BinomialLab from './binomial.jsx';
import { BlackScholesPriceLab, BlackScholesHedgeLab } from './black-scholes.jsx';
import { PortfolioLab } from './portfolio.jsx';
import { ConstraintLab, TargetPortfolioLab, EstimationLab } from './optimization-learning.jsx';
import { PortfolioOptimizationLab } from './portfolio-optimization.jsx';
import { DensityLab, TrinomialLab } from './transition-density.jsx';
import { QuadraticVariationLab, GbmEulerLab, CorrelationLab } from './stochastic-calculus.jsx';

function JensenLab() {
  const [spread, setSpread] = useState(50), [strike, setStrike] = useState(100), d = jensen(spread, strike, 100, 0.6);
  return <div className="lab"><LabTitle number="3.3" title="ทำไมจุดเฉลี่ยจึงอยู่เหนือเส้น payoff">ภายใต้ p: ขาขึ้น 0.6 · ขาลง 0.4 · กราฟนี้แสดง payoff คาดหมาย ยังไม่ใช่ราคา Call</LabTitle>
    <div className="controls two"><Range label="ระยะขึ้น/ลงจากราคา 100" value={spread} onChange={setSpread} min={0} max={90} suffix=" ดอลลาร์" /><Range label="ราคาใช้สิทธิ K" value={strike} onChange={setStrike} min={60} max={160} suffix=" ดอลลาร์" /></div>
    <Chart title="Jensen: เฉลี่ยบนเส้นเชื่อม เทียบกับ payoff ที่ค่าเฉลี่ย" description={`ราคาสองกรณี ${d.low} และ ${d.high} ค่าเฉลี่ย payoff ${d.expected} เทียบกับ payoff ที่ราคาเฉลี่ย ${d.atMean} ดอลลาร์`} xDomain={[0, 220]} yDomain={[0, 160]} xTicks={[0,50,100,150,200]} xLabel="ราคาปลายปี (ดอลลาร์)" yLabel="Payoff (ดอลลาร์)" lines={[{ values: [[0, 0], [strike, 0], [220, 220 - strike]] },{values:[[d.low,d.lowPay],[d.high,d.highPay]],className:'secondary-line'},{values:[[d.expectedPrice,d.atMean],[d.expectedPrice,d.expected]],className:'gap-line',width:3}]} markers={[{ x: d.low, y: d.lowPay }, { x: d.high, y: d.highPay }, { x: d.expectedPrice, y: d.atMean, className: 'mean-point', r: 5 },{x:d.expectedPrice,y:d.expected,className:'expected-point',r:6}]} />
    <div className="legend"><span className="mean-key">เส้น payoff ของ call</span><span className="median-key">เส้นเชื่อมสองกรณี</span></div>
    <div className="results"><div><span>จุดบน: เฉลี่ย payoff</span><strong><CountUp to={d.expected} /> <small>ดอลลาร์</small></strong><p>0.4 × {d.lowPay} + 0.6 × {d.highPay}</p></div><div><span>จุดล่าง: payoff ที่ราคาเฉลี่ย</span><strong>{format(d.atMean)} <small>ดอลลาร์</small></strong><p>max({format(d.expectedPrice)} − {strike}, 0)</p></div></div>
    <p className="lab-note" role="status">ราคาสองกรณี {d.low} และ {d.high} ดอลลาร์ · ช่องว่างแนวตั้ง = {format(d.expected-d.atMean)} ดอลลาร์ · ยังไม่คิดลด</p>
  </div>;
}
function ScalingLab() {
  const [mu, setMu] = useState(73.5), [sigma, setSigma] = useState(38.9), [years,setYears] = useState(1);
  const times=Array.from({length:101},(_,i)=>years*i/100);
  const drift=times.map(t=>[t,mu*t]),noise=times.map(t=>[t,sigma*Math.sqrt(t)]);
  const low=Math.min(0,mu*years), high=Math.max(10,mu*years,sigma*Math.sqrt(years))*1.08;
  return <div className="lab"><LabTitle number="3.6" title="Drift โตตามเวลา ส่วนเบี่ยงเบนมาตรฐานโตตามรากของเวลา">ค่าเริ่มต้นใช้ค่าปัดเศษของ Perez Companc ที่หนังสือรายงาน: μ = 73.5%, σ = 38.9%</LabTitle><div className="controls two"><Range label="Drift μ" value={mu} onChange={setMu} min={-10} max={100} step={.1} suffix="% ต่อปี" /><Range label="Volatility σ" value={sigma} onChange={setSigma} min={0} max={80} step={.1} suffix="% ต่อปี" /></div>
    <div className="segmented" aria-label="ช่วงเวลาที่ดู"><button aria-pressed={years===1} onClick={()=>setYears(1)}>ดูช่วง 1 ปี</button><button aria-pressed={years===10} onClick={()=>setYears(10)}>ดูช่วง 10 ปี</button></div>
    <Chart title="ขนาดส่วนค่าเฉลี่ยและความสุ่มตามช่วงเวลา" description={`เส้นตรงคือ μt เส้นโค้งคือ σ√t เมื่อ μ ${mu}% และ σ ${sigma}%`} xDomain={[0,years]} yDomain={[low,high]} xLabel="เวลา (ปี)" yLabel="ขนาดส่วนประกอบ (%)" lines={[{values:drift},{values:noise,className:'secondary-line',width:2.5}]} />
    <div className="legend"><span className="mean-key">ส่วนค่าเฉลี่ย μt</span><span className="median-key">ขนาดความสุ่ม σ√t</span></div>
    <div className="table-wrap"><table><caption>หนึ่งปีมี 252 วันซื้อขาย</caption><thead><tr><th>ช่วงเวลา</th><th>μδt</th><th>σ√δt</th></tr></thead><tbody>{[1,5,21,252].map(days=><tr key={days}><th>{days} วัน</th><td>{format(mu*days/252,4)}%</td><td>{format(sigma*Math.sqrt(days/252),4)}%</td></tr>)}</tbody></table></div>
    <p className="lab-note">กราฟเปรียบเทียบส่วนประกอบของแบบจำลองตามสมมติฐาน ไม่ใช่กราฟราคา หรือผลตอบแทนทบต้น μt ไม่ใช่ e^(μt) − 1 · σ√t เป็นส่วนเบี่ยงเบนมาตรฐาน ไม่ใช่ขอบเขตขาดทุนสูงสุด</p></div>;
}
function RollingLab() {
  const [window, setWindow] = useState(20), d = rollingExample(window);
  return <div className="lab"><LabTitle number="3.7" title="เมื่อวันร่วงแรงหลุดจากหน้าต่าง">ผลตอบแทนสมมติ 100 วัน วันปกติ ±0.3% วันที่ 35 เปลี่ยนเป็น −10%</LabTitle>
    <Range label="หน้าต่างย้อนหลัง" value={window} onChange={setWindow} min={10} max={40} step={10} suffix=" วัน" />
    <Chart title="ความผันผวนย้อนหลังแบบหน้าต่างเลื่อน" description={`หน้าต่าง ${window} วัน ช็อกอยู่วันที่ 35 และออกจากหน้าต่างวันที่ ${d.exitDay}`} xDomain={[1, 100]} yDomain={[0, 55]} xTicks={[1, 25, 50, 75, 100]} xLabel="วันลำดับที่" yLabel="Volatility ต่อปี (%)" verticals={[35, d.exitDay]} lines={[{ values: d.rolling.flatMap((v, i) => v === null ? [] : [[i + 1, v]]) }]} />
    <p className="lab-note" role="status">เส้นประ: วันช็อก 35 และวันที่ช็อกหลุดจากหน้าต่าง {d.exitDay} · คำนวณ sample SD × √252 · ช่วงแรกที่ข้อมูลไม่ครบหน้าต่างยังไม่มีค่า</p>
  </div>;
}
function GbmLab() {
  const [mu, setMu] = useState(15), [sigma, setSigma] = useState(25), [seed, setSeed] = useState(73), [saved, setSaved] = useState([]), [notice, setNotice] = useState('');
  const paths = useMemo(() => simulate({ mu: mu / 100, sigma: sigma / 100, seed, initial:100 }), [mu, sigma, seed]);
  const th = theoretical(mu / 100, sigma / 100, 1, 100), sampleMean = mean(paths.map(p => p.at(-1)));
  const timePoints = Array.from({ length: 253 }, (_, i) => i / 252), theory = timePoints.map(t => theoretical(mu / 100, sigma / 100, t, 100));
  const max = Math.ceil(Math.max(...paths.flat(), th.q95) / 50) * 50;
  const lines = paths.map(path => ({ values: path.map((v, i) => [i / 252, v]), className: 'sample-line', width: 1 }));
  lines.push({ values: theory.map((v, i) => [timePoints[i], v.expected]), className: 'primary-line', width: 3 }, { values: theory.map((v, i) => [timePoints[i], v.median]), className: 'secondary-line', width: 2.5 });
  function save() {
    const record = { id: Date.now(), mu, sigma, seed, label: `μ ${mu}% · σ ${sigma}% · seed ${seed} · เฉลี่ยตัวอย่าง ${format(sampleMean)} ดอลลาร์` };
    setSaved(old => [record, ...old].slice(0, 6)); setNotice('บันทึกชุดทดลองแล้ว เก็บได้สูงสุด 6 ชุดในหน้านี้');
  }
  function restore(r) { setMu(r.mu); setSigma(r.sigma); setSeed(r.seed); setNotice('เรียกดูชุดทดลองที่บันทึกแล้ว'); }
  function downloadCsv() {
    const csv = ['day,time_years,' + paths.map((_, i) => `path_${i + 1}`).join(','), ...timePoints.map((t, i) => `${i},${t},${paths.map(p => p[i].toFixed(8)).join(',')}`)].join('\n');
    const link = document.createElement('a'), url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); link.href = url; link.download = `gbm_mu${mu}_sigma${sigma}_seed${seed}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="lab gbm"><LabTitle number="เพิ่มเติม" title="มองหลายเส้นทางพร้อมกัน">GBM แบบ exact · ราคาเริ่มต้น 100 ดอลลาร์ · ระยะเวลา 1 ปี · 252 step · 40 เส้นทาง</LabTitle>
    <div className="controls two"><Range label="Drift μ" value={mu} onChange={setMu} min={-10} max={25} suffix="% ต่อปี" /><Range label="Volatility σ" value={sigma} onChange={setSigma} min={0} max={60} suffix="% ต่อปี" /></div>
    <div className="lab-actions"><span className="seed">seed {seed}</span><button onClick={() => { setSeed(seed + 1); setNotice('สุ่มชุดใหม่แล้ว โดยคง μ และ σ เดิม'); }}>สุ่มชุดใหม่</button><button onClick={() => { setMu(15); setSigma(25); setSeed(73); setNotice('กลับเป็นค่าเริ่มต้นแล้ว'); }}>คืนค่าเริ่มต้น</button></div>
    <Chart title="เส้นราคาจำลองของ GBM" description={`ราคาเริ่มต้น 100 ดอลลาร์ จำนวน 40 เส้น เวลา 1 ปี μ ${mu}% σ ${sigma}% ราคาเฉลี่ยทฤษฎี ${format(th.expected)} มัธยฐาน ${format(th.median)} ดอลลาร์ ช่วงควอนไทล์ 5 ถึง 95 เปอร์เซ็นต์ที่ปลายปี ${format(th.q05)} ถึง ${format(th.q95)} ดอลลาร์`} yDomain={[0, max]} xLabel="เวลา (ปี)" yLabel="ราคา (ดอลลาร์)" lines={lines} band={{ low: theory.map((v, i) => [timePoints[i], v.q05]), high: theory.map((v, i) => [timePoints[i], v.q95]) }} />
    <div className="legend"><span className="mean-key">ค่าเฉลี่ยทฤษฎี</span><span className="median-key">มัธยฐานทฤษฎี (เส้นประ)</span><span className="band-key">ช่วง 5–95% ณ แต่ละเวลา</span></div>
    <div className="results"><div><span>ราคาเฉลี่ยตามทฤษฎี</span><strong><CountUp to={th.expected} /> <small>ดอลลาร์</small></strong><p>S₀e^(μT)</p></div><div><span>มัธยฐานตามทฤษฎี</span><strong><CountUp to={th.median} /> <small>ดอลลาร์</small></strong><p>S₀e^[(μ − ½σ²)T]</p></div></div>
    <p className="lab-note">เฉลี่ยเฉพาะ 40 เส้นนี้: <strong>{format(sampleMean)} ดอลลาร์</strong> · พื้นที่แรเงาเป็นช่วงของราคา ณ แต่ละเวลา ไม่ใช่ช่วงความเชื่อมั่นของค่าเฉลี่ย และไม่ใช่โอกาส 90% ที่ทั้งเส้นทางจะอยู่ในกรอบตลอดปี</p>
    <div className="lab-actions"><button onClick={save}>บันทึกชุดทดลอง</button><button onClick={downloadCsv}>ดาวน์โหลด 40 เส้นเป็น CSV</button></div><p role="status" className="status-text">{notice}</p>
    {saved.length > 0 && <><h4>ชุดที่บันทึกไว้</h4><p className="lab-note">กดเพื่อเรียกค่าเดิมกลับมา บันทึกหายเมื่อปิดหรือโหลดหน้าใหม่</p><AnimatedList items={saved} onItemSelect={restore} /></>}
  </div>;
}
function ExerciseLab() {
  return <div className="lab"><LabTitle number="เพิ่มเติม" title="ผลตอบแทนรายวันแกว่ง 1% แล้ว 4 วันล่ะ" /><Stepper>
    <div><h4>ตั้งสมมติฐานก่อนตอบ</h4><p>ให้ส่วนเบี่ยงเบนมาตรฐานของ log return รายวันเป็น 1% ช็อกแต่ละวันเป็นอิสระ และความแปรปรวนคงที่ ส่วนเบี่ยงเบนมาตรฐานของ log return รวม 4 วันควรเป็นเท่าไร?</p><p>ลองเลือกในใจก่อน: 1%, 2% หรือ 4%</p></div>
    <div><h4>บวกความแปรปรวน แล้วค่อยถอดราก</h4><p>ความแปรปรวนรวม = 4 × (0.01)² = 0.0004</p><div className="equation">SD = √0.0004 = 0.02 = 2%</div><p>ไม่ใช่ 4% เพราะเราไม่ได้บวกส่วนเบี่ยงเบนมาตรฐานเข้าด้วยกัน</p></div>
    <div><h4>2% บอกขนาดการแกว่ง</h4><p>มันไม่ใช่ผลตอบแทนที่จะได้ และไม่ใช่ขาดทุนสูงสุด ถ้าช็อกข้ามวันพึ่งพากัน ต้องรวม covariance ด้วย คำตอบ 2% ผูกอยู่กับสมมติฐานของโจทย์นี้</p></div>
  </Stepper></div>;
}
for (const [id, Component] of [['arch-forecast-lab', ForecastLab], ['price-returns-lab', PriceReturnsLab], ['arma-learning-lab', ArmaLearningLab], ['calendar-acf-lab', CalendarAcfLab], ['greeks-shock-lab', GreeksShockLab], ['greeks-conventions-lab', GreeksConventionsLab], ['greeks-higher-lab', GreeksHigherLab], ['numerical-mc-lab', NumericalMonteCarloLab], ['numerical-fd-lab', NumericalFiniteDifferenceLab], ['basel-capital-lab', CapitalLab], ['basel-liquidity-lab', LiquidityLab], ['basel-irb-lab', IRBLab], ['measure-change-lab', MeasureChangeLab], ['pricing-extensions-lab', PricingExtensionsLab], ['clustering-lab', ClusteringLab], ['variance-mixture-lab', MixtureLab], ['realized-volatility-lab', RealizedVolatilityLab], ['normal-tail-lab', NormalTailLab], ['empirical-tail-lab', EmpiricalTailLab], ['portfolio-tail-lab', PortfolioTailLab], ['constraint-learning-lab', ConstraintLab], ['target-portfolio-lab', TargetPortfolioLab], ['estimation-learning-lab', EstimationLab], ['black-litterman-lab', PortfolioOptimizationLab], ['portfolio-lab', PortfolioLab], ['black-scholes-price-lab', BlackScholesPriceLab], ['black-scholes-hedge-lab', BlackScholesHedgeLab], ['qv-ito-lab', QuadraticVariationLab], ['gbm-euler-lab', GbmEulerLab], ['correlated-noise-lab', CorrelationLab], ['transition-density-lab', DensityLab], ['trinomial-density-lab', TrinomialLab], ['binomial-lab', BinomialLab], ['hedging-lab', HedgingLab], ['monte-carlo-lab', MonteCarloLab], ['jensen-lab', JensenLab], ['comparison-lab',ComparisonLab], ['returns-lab',ReturnsLab], ['distribution-lab',DistributionLab], ['scaling-lab', ScalingLab], ['rolling-lab', RollingLab], ['wiener-lab',WienerLab], ['gbm-lab', GbmLab], ['exercise-lab', ExerciseLab]]) {
  const target = document.getElementById(id);
  if (target) createRoot(target).render(<MotionConfig reducedMotion="user"><Component /></MotionConfig>);
}

mountExoticOptionsLabs();
