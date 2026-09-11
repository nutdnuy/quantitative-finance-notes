import React, { useState, useEffect, useRef, useId } from 'react';
export const format = (v, n = 2) => Number(v).toLocaleString('en-US', { minimumFractionDigits: n, maximumFractionDigits: n });
export function Range({ label, value, onChange, min, max, step = 1, suffix = '' }) {
  const id = useId();
  return <div className="range"><div><label htmlFor={id}>{label}</label><output htmlFor={id}>{value}{suffix}</output></div><input id={id} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /></div>;
}
export function LabTitle({ number, title, children }) {
  return <div className="lab-title"><p className="eyebrow">{number === 'เพิ่มเติม' ? 'ทดลองเพิ่มเติม' : 'ทดลองด้วยตัวเอง'}</p><h3>{title}</h3>{children && <p>{children}</p>}</div>;
}
export function Chart({ title, description, xDomain = [0, 1], yDomain = [0, 200], xLabel, yLabel, lines = [], bars = [], band, markers = [], verticals = [], xTicks, xFormat = v => Number(v.toFixed(2)), yFormat = v => format(v, 0), compact = false, tall = false }) {
  const ref = useRef(null), [width, setWidth] = useState(700), titleId = useId(), descId = useId();
  useEffect(() => { const observer = new ResizeObserver(entries => setWidth(Math.max(260, entries[0].contentRect.width))); observer.observe(ref.current); return () => observer.disconnect(); }, []);
  const height = tall ? (width < 450 ? 330 : 480) : compact ? 215 : width < 450 ? 265 : 320, left = 51, right = 20, top = 30, bottom = 48;
  const x = v => left + (v - xDomain[0]) / (xDomain[1] - xDomain[0]) * (width - left - right);
  const y = v => top + (yDomain[1] - v) / (yDomain[1] - yDomain[0]) * (height - top - bottom);
  const points = values => values.map(([a, b]) => `${x(a)},${y(b)}`).join(' ');
  const ticks = xTicks || Array.from({ length: 5 }, (_, i) => xDomain[0] + i * (xDomain[1] - xDomain[0]) / 4);
  return <div className="chart" ref={ref}><svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${titleId} ${descId}`}>
    <title id={titleId}>{title}</title><desc id={descId}>{description}</desc>
    <text x={left} y={15} className="axis-label">{yLabel}</text>
    {Array.from({ length: 5 }, (_, i) => yDomain[0] + i * (yDomain[1] - yDomain[0]) / 4).map(v => <g key={v}><line className="grid" x1={left} y1={y(v)} x2={width - right} y2={y(v)} /><text x={left - 9} y={y(v) + 4} textAnchor="end">{yFormat(v)}</text></g>)}
    {ticks.map(v => <text key={v} x={x(v)} y={height - bottom + 22} textAnchor="middle">{xFormat(v)}</text>)}
    {band && <polygon points={points([...band.low, ...band.high.slice().reverse()])} className="band" />}
    {verticals.map((v, i) => <line key={i} x1={x(v)} x2={x(v)} y1={top} y2={height - bottom} className="event-line" />)}
    {bars.map((b, i) => <rect key={i} x={x(b.x)} y={Math.min(y(b.y), y(0))} width={Math.max(1, x(b.x + b.width) - x(b.x) - 1)} height={Math.max(.5, Math.abs(y(b.y) - y(0)))} className={b.className || 'hist-bar'} />)}
    {lines.map((line, i) => <polyline key={i} points={points(line.values)} fill="none" className={line.className || 'primary-line'} strokeWidth={line.width || 2} style={line.color ? {stroke:line.color,opacity:line.opacity ?? 1} : undefined} />)}
    {markers.map((m, i) => <circle key={i} cx={x(m.x)} cy={y(m.y)} r={m.r || 5} className={m.className || 'point'} />)}
    <text x={width - right} y={height - 6} textAnchor="end" className="axis-label">{xLabel}</text>
  </svg></div>;
}
