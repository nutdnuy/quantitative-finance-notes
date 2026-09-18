import React, { useMemo, useState } from 'react';
import { Chart, Range, LabTitle, format } from './ui.jsx';
import { analyzePortfolio, portfolioPoint } from './portfolio.mjs';

const percent = value => format(100 * value, 2);

export function PortfolioLab() {
  const [weight, setWeight] = useState(50), [rho, setRho] = useState(.2);
  const data = useMemo(() => analyzePortfolio({ rho }), [rho]);
  const selected = portfolioPoint({ wA: weight / 100, rho });
  const { gmv, maxSharpe } = data;
  const arbitrage = data.sharpeStatus === 'unbounded';
  const chartDescription = `พอร์ต A และ B แบบไม่ขายชอร์ต น้ำหนัก A ตั้งแต่ 0 ถึง 100 เปอร์เซ็นต์ ที่ correlation ${rho} พอร์ตที่เลือกมีผลตอบแทนคาดหวัง ${percent(selected.mu)} เปอร์เซ็นต์ และส่วนเบี่ยงเบนมาตรฐาน ${percent(selected.sigma)} เปอร์เซ็นต์ จุด GMV มีน้ำหนัก A ${percent(gmv.wA)} เปอร์เซ็นต์${maxSharpe ? ` จุด Sharpe สูงสุดมีน้ำหนัก A ${percent(maxSharpe.wA)} เปอร์เซ็นต์` : ' มีพอร์ตความเสี่ยงศูนย์ที่ให้ผลตอบแทน 8 เปอร์เซ็นต์ สูงกว่าอัตราปลอดความเสี่ยง จึงไม่แสดงจุด Sharpe สูงสุดหรือเส้น CAL'}`;
  const markers = [
    { x: selected.sigma, y: selected.mu, r: 7, className: 'expected-point' },
    { x: gmv.sigma, y: gmv.mu, r: 5, className: 'point' },
    ...(maxSharpe ? [{ x: maxSharpe.sigma, y: maxSharpe.mu, r: 4, className: 'mean-point' }] : []),
  ];
  return <div className="lab portfolio-lab">
    <LabTitle number="เพิ่มเติม" title="ผสม A กับ B แล้วความเสี่ยงเปลี่ยนอย่างไร">ข้อมูลสมมติ · ผลตอบแทนรวมแบบ simple return ใน 1 ปี · A: μ = 12%, σ = 20% · B: μ = 6%, σ = 10% · r_f = 2%</LabTitle>
    <div className="controls two">
      <Range label="น้ำหนักสินทรัพย์ A" value={weight} onChange={setWeight} min={0} max={100} suffix="%" />
      <Range label="Correlation ρ ระหว่าง A กับ B" value={rho} onChange={setRho} min={-1} max={1} step={.05} />
    </div>
    <p className="lab-note">น้ำหนัก B = <output data-portfolio="weight-b">{100 - weight}</output>% · ลงทุนครบ 100% ใน A และ B โดยไม่ขายชอร์ต ลองคงน้ำหนักไว้แล้วเลื่อน ρ เพื่อดูผลของการเคลื่อนไหวร่วมกัน</p>
    <Chart title="ผลตอบแทนคาดหวังและความเสี่ยงของพอร์ตสองสินทรัพย์" description={chartDescription} xDomain={[0, .22]} yDomain={[0, .13]} xLabel="ส่วนเบี่ยงเบนมาตรฐาน (%)" yLabel="ผลตอบแทนคาดหวัง (%)" xFormat={value => format(value * 100, 1)} yFormat={value => format(value * 100, 1)} lines={[
      { values: data.curve.map(point => [point.sigma, point.mu]) },
      ...(data.cal.length ? [{ values: data.cal.map(point => [point.sigma, point.mu]), className: 'secondary-line' }] : []),
    ]} markers={markers} />
    <div className="legend"><span className="mean-key">พอร์ต A + B ทุกน้ำหนัก</span>{data.cal.length > 0 && <span className="median-key">CAL: เงินฝาก + พอร์ต Sharpe สูงสุด</span>}</div>
    <p className="lab-note">จุดใหญ่สีม่วงคือพอร์ตที่เลือก จุดสีเขียวคือพอร์ตความแปรปรวนต่ำสุด (GMV){maxSharpe ? ' และจุดเล็กคือพอร์ต Sharpe สูงสุดในช่วงน้ำหนักที่อนุญาต' : ''} ค่าของแต่ละจุดแสดงด้านล่าง แกนทั้งสองเป็นเปอร์เซ็นต์ของผลตอบแทนในช่วง 1 ปีเดียวกัน</p>
    <div className="results" aria-live="polite">
      <div><span>ผลตอบแทนคาดหวังของพอร์ต μ_p</span><strong data-portfolio="mean">{percent(selected.mu)}<small>%</small></strong><p>ค่าเฉลี่ยที่สมมติภายใต้ความน่าจะเป็นจริง (physical) ไม่ใช่ risk-neutral และไม่รับประกันผลตอบแทน</p></div>
      <div><span>ส่วนเบี่ยงเบนมาตรฐาน σ_p</span><strong data-portfolio="sigma">{percent(selected.sigma)}<small>%</small></strong><p>วัดการกระจายรอบค่าเฉลี่ย · ความแปรปรวน <output data-portfolio="variance">{format(selected.variance, 6)}</output> เมื่อผลตอบแทนอยู่ในหน่วยทศนิยม</p></div>
      <div><span>Sharpe ของพอร์ตที่เลือก</span><strong data-portfolio="sharpe">{selected.sharpe === null ? 'ไม่นิยาม' : format(selected.sharpe, 4)}</strong><p>(μ_p − 2%) / σ_p · {selected.zeroRisk ? 'σ_p เป็นศูนย์ จึงหารเพื่อหา Sharpe ไม่ได้' : 'ผลตอบแทนคาดหวังส่วนเกินต่อหนึ่งหน่วยความเสี่ยงในช่วง 1 ปี'}</p></div>
      <div><span>GMV ภายใต้เงื่อนไขไม่ขายชอร์ต</span><strong><output data-portfolio="gmv-weight">{percent(gmv.wA)}</output><small>% ใน A</small></strong><p>B = {percent(gmv.wB)}% · μ = <output data-portfolio="gmv-mean">{percent(gmv.mu)}</output>% · σ = <output data-portfolio="gmv-sigma">{percent(gmv.sigma)}</output>%</p></div>
    </div>
    <div className="calculation-strip" aria-live="polite">
      <span>ผลจากสูตร GMV ที่ยังไม่จำกัดน้ำหนัก</span>
      <strong>w_A = <output data-portfolio="unrestricted-gmv">{data.nonUniqueGMV ? 'ทุกน้ำหนักให้ความแปรปรวนเท่ากัน' : `${percent(data.unrestrictedGMVWeight)}%`}</output></strong>
      <p className="lab-note">{data.nonUniqueGMV ? 'ทุกน้ำหนักมีความแปรปรวนเท่ากัน จึงใช้พอร์ต 50/50 เป็นตัวแทน' : data.unrestrictedGMVWeight < 0 || data.unrestrictedGMVWeight > 1 ? 'สูตรให้ค่านอกช่วง 0–100% จึงเลือกปลายช่วงที่มีความแปรปรวนต่ำกว่าเมื่อห้ามขายชอร์ต' : 'ผลจากสูตรอยู่ในช่วง 0–100% จึงใช้เป็นน้ำหนัก GMV ได้'}</p>
    </div>
    {maxSharpe && <div className="calculation-strip" aria-live="polite">
      <span>Sharpe สูงสุดเมื่อ 0 ≤ w_A ≤ 1</span>
      <strong>A <output data-portfolio="max-sharpe-weight">{percent(maxSharpe.wA)}</output>% · B {percent(maxSharpe.wB)}% · Sharpe <output data-portfolio="max-sharpe">{format(maxSharpe.sharpe, 4)}</output></strong>
      <p className="lab-note">μ = {percent(maxSharpe.mu)}% · σ = {percent(maxSharpe.sigma)}% · เส้นประแสดงการผสมพอร์ตนี้กับเงินฝากที่ 2% เฉพาะช่วงไม่กู้เงิน หากจุดสูงสุดอยู่ที่น้ำหนัก 0% หรือ 100% จะเป็นคำตอบที่ขอบเขต ไม่จำเป็นต้องเป็นจุดสัมผัสของเส้นโค้ง</p>
    </div>}
    {arbitrage && <div className="reading-note" role="status" data-portfolio="arbitrage">
      <strong>ρ = −1 ทำให้สมมติฐานชุดนี้เกิดช่องว่าง arbitrage</strong>
      <p>ถือ A {percent(gmv.wA)}% และ B {percent(gmv.wB)}% แล้วความเสี่ยงหักล้างกันพอดี พอร์ตให้ผลตอบแทนแน่นอน {percent(gmv.mu)}% ขณะที่ r_f = 2% หากกู้ได้ที่ 2% โดยไม่มีต้นทุน ก็ล็อกส่วนต่างได้ {percent(gmv.mu - .02)} จุดเปอร์เซ็นต์ของเงินกู้ใน 1 ปี</p>
      <p>ที่จุดนี้ Sharpe หารด้วยศูนย์ไม่ได้ และเมื่อเข้าใกล้จุดนี้จากพอร์ตที่ยังมีความเสี่ยง Sharpe จะเพิ่มโดยไม่มีขอบเขต จึงไม่แสดงพอร์ต Sharpe สูงสุดหรือเส้น CAL แบบปกติ</p>
    </div>}
    <div className="lab-actions"><button onClick={() => { setWeight(50); setRho(.2); }}>คืนค่าเริ่มต้นของพอร์ต</button></div>
    <p className="lab-note">การทดลองใช้ค่าคาดหวัง ความผันผวน และ correlation ที่กำหนดขึ้น ไม่มีค่าธรรมเนียม ภาษี หรือความคลาดเคลื่อนจากการประมาณค่า ใช้เรียนรู้ความสัมพันธ์ของตัวแปร ไม่ใช่คำแนะนำการลงทุน</p>
  </div>;
}
