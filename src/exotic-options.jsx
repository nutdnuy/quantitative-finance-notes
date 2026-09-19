import React, { useId, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Range, Chart, LabTitle, format } from './ui.jsx';
import { pathPayoffs, simulateExotics } from './exotic-options.mjs';

export function ExoticPathLab() {
  const [K, setK] = useState(100), [H, setH] = useState(130), [terminal, setTerminal] = useState(110);
  const paths = [[100, 110, 120, 110, terminal], [100, 140, 90, 100, terminal]];
  const rows = paths.map(prices => pathPayoffs({ prices, K, H }));
  return <div className="lab learning-lab" data-exotic-lab="paths">
    <LabTitle title="ปลายทางเท่ากัน แต่สัญญาจ่ายเท่ากันไหม">เส้นทางสมมติ A และ B เริ่มที่ 100 ดอลลาร์ และจบที่ราคาเดียวกัน · Payoff ณ T ยังไม่หักราคา Option</LabTitle>
    <div className="controls two">
      <Range label="ราคาใช้สิทธิ K" value={K} onChange={setK} min={80} max={140} step={5} suffix=" ดอลลาร์" />
      <Range label="Barrier ด้านบน H" value={H} onChange={setH} min={100} max={160} step={5} suffix=" ดอลลาร์" />
      <Range label="ราคาสุดท้ายของทั้งสองเส้นทาง" value={terminal} onChange={setTerminal} min={80} max={150} step={5} suffix=" ดอลลาร์" />
    </div>
    <Chart title="เส้นทางสมมติสองแบบที่มีราคาเริ่มต้นและราคาสุดท้ายเท่ากัน" description={`เส้นทาง A ${paths[0].join(', ')} เส้นทาง B ${paths[1].join(', ')} ดอลลาร์ Barrier เท่ากับ ${H} ดอลลาร์ ตรวจทุกจุดที่แสดงรวมเวลาเริ่มต้น`} xDomain={[0, 4]} xTicks={[0, 1, 2, 3, 4]} xFormat={v => v === 0 ? '0' : `${v}/4 T`} yDomain={[70, 170]} xLabel="วันตรวจตามสัญญา" yLabel="ราคาหุ้น (ดอลลาร์)" lines={[{ values: paths[0].map((value, index) => [index, value]) }, { values: paths[1].map((value, index) => [index, value]), className: 'secondary-line' }, { values: [[0, H], [4, H]], className: 'event-line' }]} markers={paths[0].map((value, index) => ({ x: index, y: value, className: 'expected-point', r: 4 }))} />
    <div className="legend"><span className="mean-key">A: เส้นทึบและจุด</span><span className="median-key">B: เส้นประ</span></div>
    <p className="lab-note">เส้นแนวนอนสีเทาคือ Barrier H = {H} · เส้นเชื่อมใช้ช่วยอ่านลำดับจุด การตรวจ Barrier ในตารางใช้เฉพาะ 5 จุด รวม t = 0 และ T · แตะ H พอดีถือว่าชน</p>
    <div className="table-wrap" role="region" aria-label="เปรียบเทียบ payoff จากเส้นทาง A และ B" tabIndex={0}>
      <table><caption>Payoff ของ Call ราคาใช้สิทธิเดียวกัน หน่วยดอลลาร์ · Knock-out ไม่มี rebate</caption><thead><tr><th scope="col">สิ่งที่คำนวณ</th><th scope="col">เส้นทาง A</th><th scope="col">เส้นทาง B</th></tr></thead><tbody>
        <tr><th scope="row">ราคาสุดท้าย S_T</th>{rows.map((row, index) => <td key={index}>{format(row.terminal)}</td>)}</tr>
        <tr><th scope="row">ราคาเฉลี่ย A_T</th>{rows.map((row, index) => <td key={index}>{format(row.average)}</td>)}</tr>
        <tr><th scope="row">ชน Barrier หรือไม่</th>{rows.map((row, index) => <td key={index}>{row.hit ? 'ชน' : 'ไม่ชน'}</td>)}</tr>
        <tr><th scope="row">Vanilla: max(S_T − K, 0)</th>{rows.map((row, index) => <td key={index}>{format(row.vanilla)}</td>)}</tr>
        <tr><th scope="row">Asian: max(A_T − K, 0)</th>{rows.map((row, index) => <td key={index}>{format(row.asian)}</td>)}</tr>
        <tr><th scope="row">Up-and-out</th>{rows.map((row, index) => <td key={index}>{format(row.outDiscrete)}</td>)}</tr>
      </tbody></table>
    </div>
    <p className="lab-note" role="status">Asian เฉลี่ยราคา 4 ครั้งที่ T/4, T/2, 3T/4 และ T โดยไม่นับราคาเริ่มต้น · A เฉลี่ย {format(rows[0].average)} และ B เฉลี่ย {format(rows[1].average)} ดอลลาร์</p>
    <div className="lab-actions"><button onClick={() => { setK(100); setH(130); setTerminal(110); }}>คืนค่าตัวอย่าง</button></div>
  </div>;
}

const defaults = { S0: 100, K: 100, H: 130, r: 3, sigma: 20, T: 1, steps: 12, count: 12000, seed: 2535 };
const labels = [['vanilla', 'Vanilla Call'], ['asian', 'Arithmetic Asian Call'], ['outDiscrete', 'Up-and-out · ตรวจเป็นช่วง'], ['inDiscrete', 'Up-and-in · ตรวจเป็นช่วง'], ['outContinuous', 'Up-and-out · ตรวจต่อเนื่อง'], ['inContinuous', 'Up-and-in · ตรวจต่อเนื่อง']];

export function ExoticMonteCarloLab() {
  const [draft, setDraft] = useState(defaults), [parameters, setParameters] = useState(defaults), id = useId();
  const result = useMemo(() => simulateExotics({ ...parameters, r: parameters.r / 100, sigma: parameters.sigma / 100 }), [parameters]);
  const dirty = Object.keys(defaults).some(key => draft[key] !== parameters[key]);
  const update = key => value => setDraft(previous => ({ ...previous, [key]: value }));
  const values = result.sampledPaths.flat(), low = Math.min(...values, parameters.H) * .95, high = Math.max(...values, parameters.H) * 1.05;
  const discreteParity = result.estimates.inDiscrete.mean + result.estimates.outDiscrete.mean - result.estimates.vanilla.mean;
  const continuousParity = result.estimates.inContinuous.mean + result.estimates.outContinuous.mean - result.estimates.vanilla.mean;
  return <div className="lab learning-lab" data-exotic-lab="monte-carlo">
    <LabTitle title="เปลี่ยนกติกาสัญญา บนเส้นทาง Monte Carlo ชุดเดียวกัน">กำหนดราคา Call แบบ European ภายใต้ risk-neutral GBM · ไม่มีเงินปันผล · ไม่มี rebate · ทุกสัญญาจ่ายเมื่อ T</LabTitle>
    <form onSubmit={event => { event.preventDefault(); setParameters({ ...draft }); }}>
      <div className="controls two">
        <Range label="ราคาหุ้นปัจจุบัน S₀" value={draft.S0} onChange={update('S0')} min={60} max={140} step={5} suffix=" ดอลลาร์" />
        <Range label="ราคาใช้สิทธิ K" value={draft.K} onChange={update('K')} min={60} max={140} step={5} suffix=" ดอลลาร์" />
        <Range label="Barrier ด้านบน H" value={draft.H} onChange={update('H')} min={80} max={180} step={5} suffix=" ดอลลาร์" />
        <Range label="ความผันผวน σ" value={draft.sigma} onChange={update('sigma')} min={0} max={60} suffix="% ต่อปี" />
        <Range label="ดอกเบี้ยทบต้นต่อเนื่อง r" value={draft.r} onChange={update('r')} min={-3} max={10} suffix="% ต่อปี" />
        <Range label="เวลาถึงวันครบกำหนด T" value={draft.T} onChange={update('T')} min={.25} max={2} step={.25} suffix=" ปี" />
      </div>
      <div className="lab-actions">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><label htmlFor={`${id}-steps`}>ช่วงตรวจ m</label><select id={`${id}-steps`} value={draft.steps} onChange={event => update('steps')(Number(event.target.value))}>{[4, 12, 52, 252].map(value => <option key={value} value={value}>{value} ช่วง</option>)}</select></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><label htmlFor={`${id}-count`}>เส้นทาง N</label><select id={`${id}-count`} value={draft.count} onChange={event => update('count')(Number(event.target.value))}>{[1000, 12000, 24000].map(value => <option key={value} value={value}>{value.toLocaleString()}</option>)}</select></div>
      </div>
      <div className="lab-actions">
        <button type="submit" className="primary" style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}>คำนวณราคาจากค่าที่เลือก</button>
        <button type="button" onClick={() => { const next = { ...draft, seed: (draft.seed + 1) >>> 0 }; setDraft(next); setParameters(next); }}>สุ่ม seed ใหม่และคำนวณ</button>
        <button type="button" onClick={() => { setDraft(defaults); setParameters(defaults); }}>คืนค่าเริ่มต้น</button>
      </div>
      <p className="status-text" role="status">{dirty ? 'มีค่าที่เปลี่ยนแล้ว กดคำนวณเพื่ออัปเดตผลด้านล่าง' : `ผลด้านล่างใช้ ${parameters.count.toLocaleString()} เส้นทาง · ${parameters.steps} ช่วง · seed ${parameters.seed}`}</p>
    </form>
    <p className="lab-note">ผลปัจจุบัน: S₀ = {parameters.S0}, K = {parameters.K}, H = {parameters.H} ดอลลาร์ · σ = {parameters.sigma}%, r = {parameters.r}% ต่อปี · T = {parameters.T} ปี</p>
    <div className="table-wrap" role="region" aria-label="ราคา Monte Carlo และช่วงความเชื่อมั่น" tabIndex={0}>
      <table><caption>มูลค่าปัจจุบันต่อหนึ่งสัญญา หน่วยดอลลาร์ · CI ≈ ค่าเฉลี่ย ± 1.96 SE</caption><thead><tr><th scope="col">สัญญา</th><th scope="col">ราคา MC</th><th scope="col">SE</th><th scope="col">95% CI โดยประมาณ</th></tr></thead><tbody>
        {labels.map(([key, label]) => { const row = result.estimates[key]; return <tr key={key}><th scope="row">{label}</th><td>{format(row.mean, 3)}</td><td>{format(row.se, 3)}</td><td>{format(row.low, 3)} ถึง {format(row.high, 3)}</td></tr>; })}
      </tbody></table>
    </div>
    <div className="results"><div><span>Vanilla ตามสูตร Black–Scholes</span><strong>{format(result.bsPrice, 3)} <small>ดอลลาร์</small></strong><p>Monte Carlo ต่างจากสูตร {format(result.estimates.vanilla.mean - result.bsPrice, 3)} ดอลลาร์</p></div><div><span>Up-and-out ตรวจต่อเนื่อง ลดลงจากตรวจเป็นช่วง</span><strong>{format(result.estimates.outDiscrete.mean - result.estimates.outContinuous.mean, 3)} <small>ดอลลาร์</small></strong><p>การชนระหว่างวันตรวจทำให้สัญญาดับเพิ่มได้</p></div></div>
    <Chart compact title="ตัวอย่างเส้นทางที่ใช้กำหนดราคา" description={`แสดง 16 เส้นแรกจาก ${parameters.count} เส้นภายใต้ risk-neutral GBM เส้นแนวนอนคือ Barrier ${parameters.H} ดอลลาร์ สถิติในตารางใช้ทุกเส้น`} xDomain={[0, parameters.T]} yDomain={[low, high]} xLabel="เวลา (ปี)" yLabel="ราคาหุ้น (ดอลลาร์)" lines={[...result.sampledPaths.map(prices => ({ values: prices.map((value, index) => [index * parameters.T / parameters.steps, value]), className: 'sample-line', width: 1 })), { values: [[0, parameters.H], [parameters.T, parameters.H]], className: 'secondary-line', width: 2.5 }]} />
    <p className="lab-note">แสดง 16 เส้นแรกเพื่อให้เห็นเส้นทาง สถิติใช้ครบ {parameters.count.toLocaleString()} เส้น · เส้นประแนวนอนคือ H · ตรวจแบบเป็นช่วงพบการชน {format(result.discreteHitRate * 100, 1)}% ของเส้นทาง รวมการชนตั้งแต่ t = 0</p>
    <details><summary>อ่านวิธีคำนวณและข้อจำกัดของช่วงความเชื่อมั่น</summary>
      <p>จำลอง exact GBM ภายใต้ Q ด้วย drift r และช็อกมาตรฐานที่เป็นอิสระ ใช้ seed เดิมทำซ้ำได้ จากนั้นคิดลด payoff ด้วย exp(−rT) ไม่มีการจับคู่ antithetic · เพิ่ม N โดยคงพารามิเตอร์และ m จะเก็บเส้นทางเดิมแล้วเพิ่มเส้นทางใหม่</p>
      <p>Asian เฉลี่ย m ราคาที่ t_j = jT/m, j = 1,…,m ไม่นับ S₀ ส่วน Barrier แบบเป็นช่วงตรวจที่ 0 และทุก t_j โดยแตะ H ถือว่าชน การเปลี่ยน m จึงเปลี่ยนทั้งวัน fixing ของ Asian และวันตรวจของ Barrier แบบเป็นช่วง</p>
      <p>Barrier แบบต่อเนื่องใช้ Brownian bridge: ในแต่ละช่วงที่ราคาสองปลายต่ำกว่า H โอกาสไม่ชนเท่ากับ 1 − exp[−2 ln(H/S_j) ln(H/S_(j+1)) / (σ²Δt)] แล้วคูณทุกช่วงเป็นน้ำหนัก w หากปลายช่วงใดแตะ H ให้ w = 0 กรณี σ = 0 ใช้เส้นทางแน่นอนที่ตรวจการชนได้จากปลายช่วง</p>
      <p>Continuous up-and-out ใช้ payoff × w และ up-and-in ใช้ payoff × (1 − w) จึงเป็นค่าเฉลี่ยแบบถ่วงน้ำหนักตามเงื่อนไข ไม่ใช่จำนวนเส้นทางที่สุ่มว่าแตะ Barrier จริง SE คำนวณจากส่วนเบี่ยงเบนมาตรฐานตัวอย่างของ payoff ที่คิดลดและถ่วงน้ำหนักเหล่านี้ หารด้วย √N</p>
      <p>In + Out = Vanilla บนทุกเส้นทาง สำหรับกติกา Barrier เดียวกัน ความคลาดเคลื่อนสูงสุดจากเลขทศนิยม {result.maxParityError.toExponential(1)} ดอลลาร์ · ผลรวมราคาเฉลี่ยต่างจาก Vanilla {discreteParity.toExponential(1)} ดอลลาร์เมื่อเป็นช่วง และ {continuousParity.toExponential(1)} ดอลลาร์เมื่อต่อเนื่อง</p>
      <p>95% CI เป็นช่วงประมาณของราคาในแบบจำลองจากความคลาดเคลื่อน Monte Carlo ไม่ใช่ช่วง payoff หรือความเสี่ยงตลาด เมื่อ payoff เกิดน้อย ช่วงแบบ Normal อาจไม่น่าเชื่อถือ และตัวอย่างที่ให้ payoff เป็นศูนย์ทุกเส้นไม่ได้พิสูจน์ว่าราคาจริงเป็นศูนย์ การเพิ่ม N ไม่แก้ model error หรือทำให้สัญญาที่ตรวจเป็นช่วงกลายเป็นสัญญาตรวจต่อเนื่อง</p>
    </details>
  </div>;
}

export function mountExoticOptionsLabs() {
  for (const [id, Component] of [['exotic-path-lab', ExoticPathLab], ['exotic-monte-carlo-lab', ExoticMonteCarloLab]]) {
    const target = document.getElementById(id);
    if (target && !target.dataset.exoticMounted) { target.dataset.exoticMounted = 'true'; createRoot(target).render(<Component />); }
  }
}
