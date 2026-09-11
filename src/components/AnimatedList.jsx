// Adapted from React Bits AnimatedList. Native buttons replace global key handlers.
import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
function AnimatedItem({ children }) {
  const ref = useRef(null), inView = useInView(ref, { once: true }), reduced = useReducedMotion();
  return <motion.li ref={ref} initial={reduced ? false : { opacity: 0, y: 8 }} animate={inView || reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }} transition={{ duration: reduced ? 0 : 0.18 }}>{children}</motion.li>;
}
export default function AnimatedList({ items, onItemSelect }) {
  return <ul className="saved-list" data-family="AnimatedList" aria-label="บันทึกการทดลอง">
    {items.map(item => <AnimatedItem key={item.id}><button onClick={() => onItemSelect(item)}>{item.label}<span>เรียกดูชุดนี้</span></button></AnimatedItem>)}
  </ul>;
}
