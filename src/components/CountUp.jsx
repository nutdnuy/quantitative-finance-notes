// Adapted from React Bits CountUp. See vendor/react-bits-LICENSE.txt.
import { useMotionValue, useSpring, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
export default function CountUp({ to, digits = 2 }) {
  const reduced = useReducedMotion(), ref = useRef(null);
  const value = useMotionValue(to), spring = useSpring(value, { damping: 45, stiffness: 300 });
  useEffect(() => { value.set(to); }, [to, value]);
  useEffect(() => spring.on('change', v => { if (ref.current && !reduced) ref.current.textContent = v.toFixed(digits); }), [spring, reduced, digits]);
  return <span className="count-up" data-family="CountUp"><span className="sr-only">{to.toFixed(digits)}</span><span ref={ref} aria-hidden="true">{to.toFixed(digits)}</span></span>;
}
