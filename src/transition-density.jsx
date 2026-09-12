import React, { useMemo, useState } from 'react';
import { Range, LabTitle, Chart, format } from './ui.jsx';
import { transitionDensity, intervalProbability, trinomialDistribution } from './transition-density.mjs';

const grid = (a, b, count = 500) => Array.from({ length: count + 1 }, (_, j) => a + (b - a) * j / count);
const axisNumber = value => Number(value.toFixed(2));
const varianceOf = (c, tau) => 2 * c * c * tau;

export function DensityLab() {
  const [y, setY] = useState(1), [c, setC] = useState(1), [tau, setTau] = useState(1), [a, setA] = useState(0), [b, setB] = useState(2);
  const variance = varianceOf(c, tau), sd = Math.sqrt(variance), validInterval = a < b;
  const density = z => transitionDensity({ y, z, c, tau });
  const domain = [Math.min(y - 5 * sd, a, b), Math.max(y + 5 * sd, a, b)];
  // Include points at both selected bounds, including when the selected interval is narrow.
  const curve = [...new Set([...grid(...domain), ...grid(y - 5 * sd, y + 5 * sd), y, a, b])].sort((left, right) => left - right).map(z => [z, density(z)]);
  const selected = validInterval ? curve.filter(([z]) => z >= a && z <= b) : [];
  const probability = validInterval ? intervalProbability({ y, c, tau, a, b }) : null;
  function reset() { setY(1); setC(1); setTau(1); setA(0); setB(2); }
  return <div className="lab density-lab">
    <LabTitle number="เพิ่มเติม" title="ความสูงของเส้น กับพื้นที่ใต้เส้น บอกคนละอย่าง">กำหนดจุดเริ่มต้น y แล้วดูตำแหน่งปลายทาง z หลังผ่านเวลา τ · ไม่มี drift · พื้นที่ใต้เส้นทั้งหมดเท่ากับ 1</LabTitle>
    <div className="controls two">
      <Range label="จุดเริ่มต้น y" value={y} onChange={setY} min={-2} max={2} step={.1} suffix=" หน่วย y" />
      <Range label="สัมประสิทธิ์ c" value={c} onChange={setC} min={.2} max={2} step={.1} />
      <Range label="เวลาที่ผ่านไป τ" value={tau} onChange={setTau} min={.05} max={2} step={.05} suffix=" หน่วยเวลา" />
    </div>
    <p className="lab-note">หน่วยของ c คือ หน่วย y / √หน่วยเวลา · ส่วนเบี่ยงเบนมาตรฐาน = c√(2τ) · กราฟแสดงอย่างน้อย ±5 SD รอบ y และขยายให้เห็นขอบเขต a, b ที่เลือก</p>
    <div className="controls two">
      <Range label="ขอบล่างของช่วง a" value={a} onChange={setA} min={-6} max={6} step={.1} suffix=" หน่วย y" />
      <Range label="ขอบบนของช่วง b" value={b} onChange={setB} min={-6} max={6} step={.1} suffix=" หน่วย y" />
    </div>
    {!validInterval && <p className="reading-note" role="alert">เลือกช่วงที่ a &lt; b เพื่อแสดงพื้นที่ใต้เส้น หากเลือกเพียงจุดเดียว a = b ความน่าจะเป็นที่จุดนั้นเท่ากับ 0</p>}
    <Chart title="ความหนาแน่นการเปลี่ยนสถานะและพื้นที่ของช่วงที่เลือก" description={`เริ่มที่ ${y} ผ่านเวลา ${tau} สัมประสิทธิ์ c ${c} ค่าเฉลี่ย ${y} ความแปรปรวน ${variance}${validInterval ? ` ความน่าจะเป็นระหว่าง ${a} และ ${b} เท่ากับ ${probability}` : ' ขอบเขตช่วงยังไม่ถูกต้อง'}`} xDomain={domain} yDomain={[0, density(y) * 1.15]} xLabel="ตำแหน่งปลายทาง z (หน่วย y)" yLabel="ความหนาแน่น (1 / หน่วย y)" xFormat={axisNumber} yFormat={axisNumber} lines={[{ values: curve }]} band={validInterval ? { low: selected.map(([z]) => [z, 0]), high: selected } : undefined} verticals={validInterval ? [a, b] : []} />
    <div className="legend"><span className="mean-key">เส้นความหนาแน่น</span>{validInterval && <span className="band-key">พื้นที่ระหว่าง a กับ b</span>}</div>
    <div className="results" aria-live="polite">
      <div><span>ค่าเฉลี่ยของตำแหน่งปลายทาง</span><strong data-density="mean">{format(y)} <small>หน่วย y</small></strong><p>จุดกึ่งกลางอยู่ที่ y เพราะไม่มี drift</p></div>
      <div><span>ความแปรปรวน 2c²τ</span><strong data-density="variance">{format(variance, 4)} <small>(หน่วย y)²</small></strong><p>แปรผันตรงกับเวลาที่ผ่านไป</p></div>
      <div><span>ส่วนเบี่ยงเบนมาตรฐาน c√(2τ)</span><strong data-density="sd">{format(sd, 4)} <small>หน่วย y</small></strong><p>ความกว้างของการกระจายโตตาม √τ</p></div>
      {validInterval && <div><span>ความน่าจะเป็นในช่วง [{format(a, 1)}, {format(b, 1)}]</span><strong data-density="probability">{format(probability * 100, 4)}<small>%</small></strong><p>คำนวณจาก CDF; พื้นที่สีเป็นภาพประมาณด้วยจุดบนเส้น</p></div>}
    </div>
    <p className="lab-note">ความสูงที่ตำแหน่ง z = y คือ {format(density(y), 4)} ต่อหน่วย y ไม่ใช่ความน่าจะเป็นที่จุด y ความสูงอาจมากกว่า 1 ได้ แต่ความน่าจะเป็นต้องหาจากพื้นที่ และโอกาสอยู่ตรงจุดใดจุดหนึ่งพอดีเป็น 0 เมื่อ τ &gt; 0</p>
    <p className="lab-note">เมื่อ τ = 0 ตำแหน่งยังอยู่ที่ y แน่นอน ใช้ Dirac delta อธิบายการกระจุกตัวที่จุดเดียว จึงไม่ลากเส้นความหนาแน่นธรรมดาสำหรับกรณีนั้นในกราฟนี้</p>
    <div className="lab-actions"><button onClick={reset}>คืนค่าเริ่มต้นของความหนาแน่น</button></div>
  </div>;
}

export function TrinomialLab() {
  const [steps, setSteps] = useState(2), [alpha, setAlpha] = useState(.2);
  const dt = 1 / steps, h = Math.sqrt(dt / alpha), variance = 2, sd = Math.sqrt(variance);
  const distribution = useMemo(() => trinomialDistribution({ alpha, steps, stepSize: h, initial: 0 }), [alpha, steps, h]);
  const total = distribution.reduce((sum, point) => sum + point.mass, 0), mean = distribution.reduce((sum, point) => sum + point.x * point.mass, 0);
  const extent = Math.max((steps + .5) * h, 5 * sd), gaussian = grid(-extent, extent, 800).map(z => [z, transitionDensity({ y: 0, z, c: 1, tau: 1 })]);
  // A step-shaped band preserves exact mass/h heights, including tiny tail heights;
  // Chart's bar primitive deliberately imposes a minimum pixel height, so it is unsuitable here.
  const histogram = distribution.flatMap(({ x, mass }) => [[x - h / 2, mass / h], [x + h / 2, mass / h]]);
  const peak = Math.max(...distribution.map(point => point.mass / h), transitionDensity({ y: 0, z: 0, c: 1, tau: 1 }));
  const middle = distribution[steps];
  return <div className="lab trinomial-lab">
    <LabTitle number="เพิ่มเติม" title="เพิ่มจำนวนก้าว โดยให้เวลารวมและความแปรปรวนเท่าเดิม">เริ่มที่ y = 0 · เวลารวม τ = 1 · c = 1 · แต่ละก้าวเป็นอิสระและใช้โอกาสชุดเดียวกัน</LabTitle>
    <div className="segmented" role="group" aria-label="จำนวนก้าวของ Trinomial">
      {[2, 5, 10, 20, 50, 100].map(value => <button key={value} aria-pressed={steps === value} onClick={() => setSteps(value)}>{value} ก้าว</button>)}
    </div>
    <Range label="โอกาสลงหนึ่งก้าว α และโอกาสขึ้นหนึ่งก้าว α" value={alpha} onChange={setAlpha} min={.1} max={.4} step={.05} />
    <p className="lab-note">ลง −h ด้วยโอกาส {format(alpha * 100, 0)}% · อยู่ที่เดิมด้วยโอกาส {format((1 - 2 * alpha) * 100, 0)}% · ขึ้น +h ด้วยโอกาส {format(alpha * 100, 0)}%<br />
      Δt = 1/N = {format(dt, 4)} หน่วยเวลา · h = c√(Δt/α) = {format(h, 4)} หน่วย y<br />
      ปรับ h พร้อม N และ α เพื่อให้ความแปรปรวนรวม 2Nαh² = 2c²τ = 2 เท่าเดิม ไม่ได้คง h แล้วปล่อยให้เวลารวมเพิ่ม</p>
    <Chart title="ความน่าจะเป็น Trinomial ที่แปลงเป็นความสูงเทียบความหนาแน่น Gaussian" description={`Trinomial ${steps} ก้าว alpha ${alpha} ขนาดก้าว ${h} ผลรวมความน่าจะเป็น ${total} ความแปรปรวน 2 แสดงทุก ${distribution.length} จุดของแบบจำลองไม่ตัดหาง เส้นเปรียบเทียบคือ Gaussian ค่าเฉลี่ย 0 ความแปรปรวน 2`} xDomain={[-extent, extent]} yDomain={[0, peak * 1.15]} xLabel="ตำแหน่งปลายทาง z (หน่วย y)" yLabel="ความหนาแน่น (1 / หน่วย y)" xFormat={axisNumber} yFormat={axisNumber} lines={[{ values: gaussian }]} band={{ low: [[histogram[0][0], 0], [histogram.at(-1)[0], 0]], high: histogram }} />
    <div className="legend"><span className="band-key">ความสูงของแท่ง = โอกาสที่จุด / h</span><span className="mean-key">Gaussian ค่าเฉลี่ย 0 ความแปรปรวน 2</span></div>
    <p className="lab-note">แสดงครบทุกจุดตั้งแต่ −Nh ถึง +Nh รวม {distribution.length} จุด จึงไม่ได้ตัดความน่าจะเป็นของ Trinomial ทิ้ง เมื่อ N เพิ่ม ขอบเขตตำแหน่งที่เป็นไปได้กว้างขึ้น แม้ความแปรปรวนเท่าเดิม ส่วน Gaussian มีหางต่อออกไปนอกกราฟ</p>
    <div className="results" aria-live="polite">
      <div><span>ผลรวมความน่าจะเป็นทุกจุด</span><strong data-trinomial="mass">{format(total * 100, 4)}<small>%</small></strong><p>รวมพื้นที่แท่ง = Σ(โอกาส / h) × h = 1</p></div>
      <div><span>ค่าเฉลี่ย</span><strong data-trinomial="mean">{format(Math.abs(mean) < 1e-12 ? 0 : mean, 4)} <small>หน่วย y</small></strong><p>ขึ้นและลงมีโอกาสเท่ากัน</p></div>
      <div><span>ความแปรปรวนรวม</span><strong data-trinomial="variance">{format(distribution.reduce((sum, point) => sum + point.mass * (point.x - mean) ** 2, 0), 4)} <small>(หน่วย y)²</small></strong><p>SD = {format(sd, 4)} หน่วย y ทั้ง Trinomial และ Gaussian</p></div>
      <div><span>โอกาสอยู่ตรงจุดกลาง z = 0</span><strong data-trinomial="point-mass">{format(middle.mass * 100, 4)}<small>%</small></strong><p>ความสูงแท่งกลาง = {format(middle.mass / h, 4)} ต่อหน่วย y ซึ่งเป็นคนละค่ากัน</p></div>
    </div>
    <p className="lab-note">Trinomial แบบจำนวนก้าวจำกัดมีโอกาสเป็นบวกที่แต่ละจุด แต่ Gaussian ต่อเนื่องมีโอกาสที่จุดเดียวเท่ากับ 0 จึงต้องหารโอกาสด้วยความกว้าง h ก่อนเทียบรูปร่าง และควรเทียบความน่าจะเป็นของช่วงเมื่อทดสอบความใกล้เคียง</p>
    <div className="lab-actions"><button onClick={() => { setSteps(2); setAlpha(.2); }}>คืนค่าเริ่มต้นของ Trinomial</button></div>
  </div>;
}
