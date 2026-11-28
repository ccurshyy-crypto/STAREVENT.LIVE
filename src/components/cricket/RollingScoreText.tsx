import { type CSSProperties, useEffect, useRef, useState } from 'react';

interface RollingScoreTextProps {
  value: string | number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Broadcast-grade bottom-to-top score slide component.
 * Whenever `value` updates (runs, wickets, overs, batter runs, chase runs/balls),
 * the previous value glides smoothly up & out while the new value slides up from below.
 */
export function RollingScoreText({ value, className = '', style }: RollingScoreTextProps) {
  const nextStr = String(value);
  const lastValRef = useRef<string>(nextStr);
  const [slot, setSlot] = useState<{ current: string; prev: string | null; tick: number }>({
    current: nextStr,
    prev: null,
    tick: 0,
  });

  useEffect(() => {
    if (lastValRef.current === nextStr) return;
    const previous = lastValRef.current;
    lastValRef.current = nextStr;

    setSlot((s) => ({
      current: nextStr,
      prev: previous,
      tick: s.tick + 1,
    }));

    const timer = window.setTimeout(() => {
      setSlot((s) => (s.current === nextStr ? { ...s, prev: null } : s));
    }, 360);

    return () => window.clearTimeout(timer);
  }, [nextStr]);

  return (
    <span
      className={`relative inline-flex items-center justify-center overflow-hidden align-middle ${className}`}
      style={{ lineHeight: 1.08, ...style }}
    >
      <span
        className="invisible pointer-events-none select-none whitespace-nowrap"
        aria-hidden="true"
      >
        {slot.current}
      </span>

      {slot.prev !== null && (
        <span
          key={`out-${slot.tick}`}
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center whitespace-nowrap pointer-events-none score-roll-out"
        >
          {slot.prev}
        </span>
      )}

      <span
        key={`in-${slot.tick}`}
        className={`absolute inset-0 flex items-center justify-center whitespace-nowrap ${
          slot.tick > 0 ? 'score-roll-in' : ''
        }`}
      >
        {slot.current}
      </span>
    </span>
  );
}
