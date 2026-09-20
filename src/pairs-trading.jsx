import React, { useMemo, useState } from 'react';
import { Chart, LabTitle, Range, format } from './ui.jsx';
import { generatePairData, fitPair, pairResiduals, hedgeExample, runPairBacktest, PAIR_SIMULATION } from './pairs-trading.mjs';

const mean = values => values.reduce((sum, x) => sum + x, 0) / values.length;
const extent = (values, includeZero = false) => {
  const low = Math.min(...values, ...(includeZero ? [0] : [])), high = Math.max(...values, ...(includeZero ? [0] : []));
  const pad = Math.max((high - low) * 0.12, 0.5);
  return [low - pad, high + pad];
};
const line = (values, startDay = 1) => values.map((value, i) => [i + startDay, value]);
const rule = (value, start = 1, end = 500, className = 'zero-line') => ({ values: [[start, value], [end, value]], className, width: 1.5 });
const reasons = { mean: 'ข้ามค่าเฉลี่ย', stop: 'Stop', time: 'ครบเวลาถือ', end: 'จบช่วงทดสอบ' };

function ScenarioButtons({ broken, setBroken }) {
  return <div className="segmented" aria-label="ความสัมพันธ์ของคู่จำลอง">
    <button aria-pressed={!broken} onClick={() => setBroken(false)}>ความสัมพันธ์คงเดิม</button>
    <button aria-pressed={broken} onClick={() => setBroken(true)}>ความสัมพันธ์เปลี่ยนหลังวัน 250</button>
  </div>;
}

export function PairHedgeLab() {
  const [market, setMarket] = useState(5), [relative, setRelative] = useState(2), [mode, setMode] = useState('dollar');
  const result = hedgeExample({ marketReturn: market / 100, relativeReturn: relative / 100, mode });
  const dollars = Array.from({ length: 41 }, (_, i) => {
    const marketReturn = (i - 20) / 200;
    return [marketReturn * 100, hedgeExample({ marketReturn, relativeReturn: relative / 100, mode: 'dollar' }).pnl];
  });
  const betas = dollars.map(([x]) => [x, hedgeExample({ marketReturn: x / 100, relativeReturn: relative / 100, mode: 'beta' }).pnl]);
  return <div className="lab pairs-hedge-lab"><LabTitle number="เพิ่มเติม" title="Long กับ Short รับแรงตลาดเท่ากันหรือยัง">หุ้นสมมติ A และ B เริ่มที่ 100 ดอลลาร์ · Long A 10,000 ดอลลาร์ · βA = 1.2 และ βB = 0.8</LabTitle>
    <div className="controls two">
      <Range label="ผลตอบแทนตลาด" value={market} onChange={setMarket} min={-10} max={10} step={0.5} suffix="%" />
      <Range label="ผลตอบแทนส่วนต่างเฉพาะคู่ δ" value={relative} onChange={setRelative} min={-6} max={6} step={0.5} suffix="%" />
    </div>
    <div className="segmented" aria-label="วิธีถ่วงน้ำหนักพอร์ต">
      <button aria-pressed={mode === 'dollar'} onClick={() => setMode('dollar')}>เงิน Long = เงิน Short</button>
      <button aria-pressed={mode === 'beta'} onClick={() => setMode('beta')}>ถ่วงด้วย Market beta</button>
    </div>
    <div className="table-wrap" tabIndex="0" role="region" aria-label="ผลตอบแทนและกำไรขาดทุนสองขา เลื่อนตารางได้">
      <table><caption>กำหนด rA = 1.2 × rตลาด + δ/2 และ rB = 0.8 × rตลาด − δ/2</caption>
        <thead><tr><th scope="col">ขา</th><th scope="col">มูลค่าเปิด (USD)</th><th scope="col">ราคาหุ้นเปลี่ยน</th><th scope="col">PnL (USD)</th></tr></thead>
        <tbody><tr><th scope="row">Long A</th><td>{format(result.longNotional)}</td><td>{format(result.returnA * 100)}%</td><td>{format(result.pnlA)}</td></tr>
          <tr><th scope="row">Short B</th><td>{format(result.shortNotional)}</td><td>{format(result.returnB * 100)}%</td><td>{format(result.pnlB)}</td></tr></tbody>
      </table>
    </div>
    <Chart title="กำไรขาดทุนของพอร์ตเมื่อผลตอบแทนตลาดเปลี่ยน" description={`ตรึงส่วนต่างเฉพาะคู่ที่ ${relative}% เส้นทึบใช้เงินสองขาเท่ากัน เส้นประถ่วง market beta จุดคือผลของวิธีที่เลือก ${format(result.pnl)} ดอลลาร์`} xDomain={[-10, 10]} yDomain={extent([...dollars, ...betas].map(x => x[1]), true)} xTicks={[-10, -5, 0, 5, 10]} xLabel="ผลตอบแทนตลาด (%)" yLabel="PnL รวม (USD)" lines={[rule(0, -10, 10), { values: dollars }, { values: betas, className: 'secondary-line' }]} markers={[{ x: market, y: result.pnl, className: 'expected-point' }]} />
    <div className="legend"><span className="mean-key">เงินสองขาเท่ากัน</span><span className="median-key">ถ่วง Market beta</span></div>
    <div className="results"><div><span>PnL รวมก่อนต้นทุน</span><strong>{format(result.pnl)} <small>USD</small></strong><p>จากตลาด {format(result.marketPnl)} + จาก δ {format(result.relativePnl)}</p></div>
      <div><span>Gross exposure</span><strong>{format(result.grossNotional, 0)} <small>USD</small></strong><p>Long + มูลค่า Short · Net = {format(result.netNotional, 0)} USD</p></div></div>
    <p className="lab-note" role="status">{mode === 'dollar' ? 'พอร์ตยังรับแรงตลาด: 10,000 × 1.2 − 10,000 × 0.8 = 4,000 ดอลลาร์-เบตา' : 'เพิ่ม Short B เป็น 15,000 ดอลลาร์: 10,000 × 1.2 − 15,000 × 0.8 = 0 ดอลลาร์-เบตา'} · β สมมติคงที่ ไม่มีค่าธรรมเนียมและค่ายืมหุ้น</p>
    <p className="lab-note">เบตาในกราฟนี้วัดการตอบสนองของผลตอบแทนต่อผลตอบแทนตลาด ส่วน h ในบท Cointegration มาจาก regression ระดับราคา และมีหน่วยหุ้น B ต่อหุ้น A วิธีถ่วงสองอย่างตอบโจทย์ต่างกัน</p>
  </div>;
}

export function CointegrationLab() {
  const [broken, setBroken] = useState(false), [h, setH] = useState(1.2);
  const data = useMemo(() => generatePairData({ broken }), [broken]);
  const fitted = useMemo(() => fitPair(data), [data]);
  const intercept = mean(data.slice(0, 250).map(row => row.a - h * row.b));
  const residuals = pairResiduals(data, { h, intercept });
  const trainSD = Math.sqrt(residuals.slice(0, 250).reduce((sum, x) => sum + x * x, 0) / 249);
  return <div className="lab pairs-cointegration-lab"><LabTitle number="เพิ่มเติม" title="หักแนวโน้มร่วม แล้วดูสิ่งที่เหลือ">ข้อมูลสมมติ 500 วัน · train 250 วันแรก · seed {PAIR_SIMULATION.seed} · เส้นประแนวตั้งแบ่งช่วงก่อนและหลัง train</LabTitle>
    <ScenarioButtons broken={broken} setBroken={setBroken} />
    <Range label="Hedge ratio h (หุ้น B ต่อหุ้น A)" value={h} onChange={setH} min={0.5} max={2} step={0.01} />
    <div className="lab-actions"><button onClick={() => setH(Math.round(fitted.h * 100) / 100)}>ใช้ h จาก train ≈ {format(fitted.h)}</button><button onClick={() => setH(1.2)}>ใช้ h ที่สร้างข้อมูล = 1.20</button></div>
    <Chart title="ระดับราคาสองสินทรัพย์จำลอง" description="A และ B มีแนวโน้มสุ่มร่วมกัน ความสัมพันธ์ของ residual ขึ้นกับสถานการณ์ที่เลือก เส้นแบ่งอยู่หลังวัน 250" xDomain={[1, 500]} yDomain={extent(data.flatMap(row => [row.a, row.b]))} xTicks={[1, 125, 250, 375, 500]} xLabel="วันลำดับที่" yLabel="ราคา (USD/หุ้น)" verticals={[250.5]} lines={[{ values: data.map(row => [row.day, row.a]) }, { values: data.map(row => [row.day, row.b]), className: 'secondary-line' }]} />
    <div className="legend"><span className="mean-key">ราคา A</span><span className="median-key">ราคา B</span></div>
    <Chart title="Residual หลังหัก intercept และ hedge ratio" description={`คำนวณ A − ${format(intercept)} − ${h} B ค่าเฉลี่ย train เป็นศูนย์โดยการประมาณ intercept สถานการณ์ ${broken ? 'residual เปลี่ยนเป็น random walk หลังวัน 250' : 'residual AR(1) ตลอดชุดที่ h จริง 1.2'}`} xDomain={[1, 500]} yDomain={extent(residuals, true)} xTicks={[1, 125, 250, 375, 500]} xLabel="วันลำดับที่" yLabel="Residual (USD/หุ้น A)" verticals={[250.5]} lines={[rule(0), { values: line(residuals) }]} />
    <div className="results"><div><span>Intercept จาก train สำหรับ h ที่เลือก</span><strong>{format(intercept)} <small>USD</small></strong><p>เฉลี่ย A − hB เฉพาะวัน 1–250</p></div><div><span>Sample SD ของ residual ใน train</span><strong>{format(trainSD)} <small>USD</small></strong><p>ใช้ตัวหาร n − 1 = 249</p></div></div>
    <p className="lab-note" role="status">{broken ? 'ตั้งแต่วัน 251 เปลี่ยน residual เป็น random walk ที่มี drift 0.10 ดอลลาร์ต่อวัน การหัก h เดิมจึงเหลือแนวโน้มใหม่' : 'สร้าง B เป็น random walk และ A = 8 + 1.2B + u โดย u เป็น AR(1), φ = 0.85 การเลือก h = 1.2 ตัดแนวโน้มสุ่มร่วมตามแบบจำลองนี้'}</p>
    <p className="lab-note">Intercept คำนวณใหม่จาก train ทุกครั้งที่เลื่อน h จึงทำให้ residual ใน train มีค่าเฉลี่ยศูนย์เสมอ กราฟนี้สาธิตข้อมูลที่เรากำหนดโครงสร้างไว้ ไม่ได้คำนวณ p-value หรือทดสอบ Cointegration ของสินทรัพย์จริง</p>
  </div>;
}

function downloadLedger(result) {
  const fields = ['day', 'a', 'b', 'z', 'qA', 'qB', 'cash', 'equity', 'grossPnl', 'fee', 'borrow', 'dailyPnl', 'dailyReturn', 'pendingType'];
  const csv = [fields.join(','), ...result.rows.map(row => fields.map(key => row[key] ?? '').join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'pairs-trading-simulation-ledger.csv'; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function PairBacktestLab() {
  const [broken, setBroken] = useState(false), [entryZ, setEntryZ] = useState(2), [feeBps, setFeeBps] = useState(5), [borrowPercent, setBorrowPercent] = useState(3);
  const data = useMemo(() => generatePairData({ broken }), [broken]);
  const result = useMemo(() => runPairBacktest({ data, entryZ, feeBps, borrowRate: borrowPercent / 100 }), [data, entryZ, feeBps, borrowPercent]);
  const { metrics: m, fit } = result;
  const testZ = result.z.slice(249), equity = [[250, 100000], ...result.rows.map(row => [row.day, row.equity])];
  const beforeCosts = [[250, 100000]];
  let cumulative = 100000;
  for (const row of result.rows) { cumulative += row.grossPnl; beforeCosts.push([row.day, cumulative]); }
  return <div className="lab pairs-backtest-lab"><LabTitle number="เพิ่มเติม" title="สัญญาณวันนี้ ส่งคำสั่งราคาปิดวันถัดไป">ข้อมูลสมมติ · seed {PAIR_SIMULATION.seed} · train วัน 1–250 · ทดสอบวัน 251–500 · เงินเริ่มต้น 100,000 USD</LabTitle>
    <ScenarioButtons broken={broken} setBroken={setBroken} />
    <div className="controls two"><Range label="เปิดเมื่อ |z| ถึง" value={entryZ} onChange={setEntryZ} min={1} max={3} step={0.25} /><Range label="ต้นทุนต่อขา ต่อการซื้อหรือขาย" value={feeBps} onChange={setFeeBps} min={0} max={40} step={1} suffix=" bps" /></div>
    <Range label="ค่ายืมหุ้น Short ต่อปี" value={borrowPercent} onChange={setBorrowPercent} min={0} max={15} step={0.5} suffix="%" />
    <Chart title="Z-score และจุดที่คำสั่งเปิดสถานะถูกเติม" description={`คง intercept ${format(fit.intercept)} และ h ${format(fit.h, 4)} จาก train จุดวงกลมคือวันเติมคำสั่งเปิดสถานะ ซึ่งใช้สัญญาณจากวันก่อน เส้นประเป็นเกณฑ์เปิดบวกลบ ${entryZ}`} xDomain={[250, 500]} yDomain={extent([...testZ, -4, 4], true)} xTicks={[250, 300, 350, 400, 450, 500]} xLabel="วันลำดับที่" yLabel="Z-score (เท่าของ SD train)" lines={[rule(0, 250, 500), rule(entryZ, 250, 500, 'secondary-line'), rule(-entryZ, 250, 500, 'secondary-line'), { values: line(testZ, 250) }]} markers={result.fills.filter(fill => fill.type === 'entry').map(fill => ({ x: fill.day, y: result.z[fill.index], className: 'expected-point', r: 4 }))} />
    <p className="lab-note">เส้นประ: เกณฑ์เปิด ±{entryZ} · จุด: วันเติมคำสั่งเปิดจริง ซึ่ง z อาจเปลี่ยนจากวันส่งสัญญาณแล้ว · ไม่เปิดเมื่อ |z| ≥ 4</p>
    <Chart title="มูลค่าพอร์ตหลังต้นทุนเทียบกับก่อนต้นทุน" description={`พอร์ตเริ่ม 100000 ดอลลาร์ หลังต้นทุนจบที่ ${format(m.finalEquity)} ดอลลาร์ ค่าธรรมเนียมรวม ${format(m.totalFees)} ค่ายืมหุ้น ${format(m.totalBorrow)} ดอลลาร์ ทั้งสองเส้นใช้สถานะชุดเดียวกัน`} xDomain={[250, 500]} yDomain={extent([...equity, ...beforeCosts].map(x => x[1]))} xTicks={[250, 300, 350, 400, 450, 500]} xLabel="วันลำดับที่" yLabel="Equity (USD)" lines={[rule(100000, 250, 500), { values: equity }, { values: beforeCosts, className: 'secondary-line' }]} />
    <div className="legend"><span className="mean-key">หลังค่าธรรมเนียมและค่ายืม</span><span className="median-key">ก่อนต้นทุน บนสถานะชุดเดียวกัน</span></div>
    <div className="results"><div><span>PnL สุทธิ 250 วันทดสอบ</span><strong>{format(m.netPnl)} <small>USD</small></strong><p>{format(m.totalReturn * 100)}% ของเงินเริ่มต้น 100,000 USD</p></div><div><span>รอบที่กำไร / รอบที่ปิดทั้งหมด</span><strong>{m.wins} / {m.closedTrades}</strong><p>Win rate {m.winRate === null ? 'ยังไม่มีรอบปิด' : `${format(m.winRate * 100, 1)}%`} · ตัวอย่างชุดเดียว</p></div></div>
    <div className="table-wrap" tabIndex="0" role="region" aria-label="บัญชีกำไรขาดทุนและต้นทุน เลื่อนตารางได้"><table>
      <caption>ทุกค่าใช้ช่วงทดสอบเดียวกันและนับการปิดสถานะวันสุดท้าย</caption><thead><tr><th scope="col">รายการ</th><th scope="col">ผลคำนวณ</th></tr></thead><tbody>
        <tr><th scope="row">PnL สองขาก่อนต้นทุน</th><td>{format(m.grossPnl)} USD</td></tr><tr><th scope="row">ค่าธรรมเนียมทุกการเติมคำสั่ง</th><td>−{format(m.totalFees)} USD</td></tr><tr><th scope="row">ค่ายืมหุ้นสะสม</th><td>−{format(m.totalBorrow)} USD</td></tr><tr><th scope="row">Maximum drawdown ของ equity</th><td>{format(m.maxDrawdown * 100)}%</td></tr>
      </tbody></table></div>
    <p className="lab-note" role="status">ใช้ h = {format(fit.h, 4)} หุ้น B ต่อหุ้น A และ SD train = {format(fit.residualSD, 4)} USD คงที่ · สถานการณ์ {broken ? 'ความสัมพันธ์เปลี่ยนหลังวัน 250' : 'ความสัมพันธ์คงเดิม'}</p>
    <details><summary>เปิดกติกาการจำลองและรายการซื้อขาย</summary>
      <p>เปิด Long spread เมื่อ z ≤ −{entryZ} และ Short spread เมื่อ z ≥ {entryZ} โดย |z| ต้องต่ำกว่า 4 ส่งคำสั่งหลังราคาปิด แล้วเติมที่ราคาปิดวันถัดไป กำหนดจำนวนหุ้นจาก gross เป้าหมาย 20,000 USD ณ วันส่งสัญญาณ จึงอาจได้ gross ต่างออกไปเมื่อเติมคำสั่ง และคงจำนวนหุ้นจนปิด</p>
      <p>ส่งสัญญาณปิดเมื่อ z ข้ามศูนย์, เคลื่อนผิดทางถึง |z| ≥ 4 หรือเตรียมครบ 20 ช่วงวันถือ คำสั่งปิดเติมวันถัดไปเช่นกัน Stop จึงไม่รับประกันราคาปิดสถานะ ส่วนการปิดทุกสถานะ ณ วัน 500 กำหนดไว้ล่วงหน้า</p>
      <p>ต้นทุน {feeBps} bps คูณมูลค่าซื้อขายจริงของแต่ละขาทุกครั้ง ทั้งเปิดและปิด ค่ายืมเท่ากับมูลค่าขา Short ณ ราคาปิดวันก่อน × {borrowPercent}% ÷ 252 ต่อช่วงวัน ไม่มีปันผล ดอกเบี้ยเงินสด margin call หรือข้อจำกัดการยืมหุ้นในตัวอย่างนี้</p>
      <div className="table-wrap" tabIndex="0" role="region" aria-label="รายการรอบซื้อขาย เลื่อนแนวนอนได้"><table><caption>Long spread = ซื้อ A / Short B · Short spread = Short A / ซื้อ B · จำนวนหุ้นติดลบคือ Short · ราคาและต้นทุนเป็น USD</caption>
        <thead><tr><th scope="col">รอบ</th><th scope="col">ทิศทาง</th><th scope="col">วันเปิด–ปิด</th><th scope="col">หุ้น A</th><th scope="col">หุ้น B</th><th scope="col">ราคาเปิด A / B</th><th scope="col">ราคาปิด A / B</th><th scope="col">เหตุปิด</th><th scope="col">ค่าธรรมเนียม</th><th scope="col">ค่ายืม</th><th scope="col">PnL สุทธิ USD</th></tr></thead>
        <tbody>{result.trades.map((trade, i) => <tr key={trade.entryIndex}><th scope="row">{i + 1}</th><td>{trade.direction === 1 ? 'Long spread' : 'Short spread'}</td><td>{trade.entryDay}–{trade.exitDay}</td><td>{format(trade.qA, 4)}</td><td>{format(trade.qB, 4)}</td><td>{format(trade.entryA, 4)} / {format(trade.entryB, 4)}</td><td>{format(trade.exitA, 4)} / {format(trade.exitB, 4)}</td><td>{reasons[trade.reason]}</td><td>{format(trade.fees)}</td><td>{format(trade.borrow)}</td><td>{format(trade.netPnl)}</td></tr>)}</tbody>
      </table></div>
      {result.trades.length === 0 && <p>ไม่มีรอบซื้อขายที่ปิดในชุดทดลองนี้</p>}
    </details>
    <div className="lab-actions"><button onClick={() => downloadLedger(result)}>ดาวน์โหลดบัญชีรายวัน CSV</button></div>
    <p className="lab-note">ผลทั้งหมดมาจากเส้นทางจำลองชุดเดียว การเลื่อนค่าแล้วเลือกชุดที่ให้กำไรมากที่สุดคือการใช้ช่วงทดสอบช่วยเลือกโมเดล หากนำกติกาไปวิจัยต่อ ต้องแยก validation และข้อมูลทดสอบใหม่ที่ยังไม่เคยใช้</p>
  </div>;
}
