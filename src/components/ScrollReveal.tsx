import { ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  direction?: 'up' | 'left' | 'right' | 'scale';
  delay?: number;
}

/**
 * Zero-delay wrapper so page content renders instantaneously on load and reload
 * without waiting on IntersectionObserver timers or hiding above-the-fold sections.
 */
export function ScrollReveal({
  children,
  className = '',
}: ScrollRevealProps) {
  return <div className={className}>{children}</div>;
}
