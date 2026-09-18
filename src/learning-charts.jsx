import React, { useEffect, useRef, useState } from 'react';
import { format } from './ui.jsx';

export function useChartWidth(maximum = 700) {
  const ref = useRef(null), [width, setWidth] = useState(maximum);
  useEffect(() => {
    const observer = new ResizeObserver(entries => setWidth(Math.max(220, Math.min(maximum, entries[0].contentRect.width))));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [maximum]);
  return [ref, width];
}

export function WeightsChart({ labels, first, second, firstLabel, secondLabel }) {
  const lo = Math.min(0, ...first, ...second), hi = Math.max(.01, ...first, ...second);
  const left = Math.floor(lo * 10) / 10, right = Math.ceil(hi * 10) / 10;
  const position = value => 100 * (value - left) / (right - left);
  return <div className="weight-comparison" role="group" aria-label={`${firstLabel} เทียบกับ ${secondLabel}; น้ำหนักเป็นเปอร์เซ็นต์`}>
    <p className="learning-legend"><span className="key-prior">{firstLabel}</span><span className="key-posterior">{secondLabel}</span></p>
    <div className="weight-axis"><span>{format(left * 100, 0)}%</span><span>{format(right * 100, 0)}%</span></div>
    {labels.map((label, i) => <div className="weight-row" key={label}>
      <span>{label}</span>
      <div className="weight-tracks" aria-hidden="true">
        <i className="weight-zero" style={{ left: `${position(0)}%` }} />
        {[first[i], second[i]].map((value, j) => <div key={j} className={`weight-bar weight-bar-${j}`} style={{
          left: `${Math.min(position(0), position(value))}%`, width: `${Math.abs(position(value) - position(0))}%`,
        }} />)}
      </div>
      <div className="weight-values"><span><span className="sr-only">{firstLabel}: </span>{format(first[i] * 100)}%</span><span><span className="sr-only">{secondLabel}: </span>{format(second[i] * 100)}%</span></div>
    </div>)}
    <p className="lab-note">เส้นตั้งคือ 0% · ค่าติดลบอยู่ด้านซ้าย · ตัวเลขบนและล่างเรียงตามคำอธิบายสี</p>
  </div>;
}
