'use client';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  delay?: number;
}

export default function ScrollReveal({ children, style, delay = 0 }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <div
      ref={ref}
      style={{
        ...style,
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(12px)',
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
