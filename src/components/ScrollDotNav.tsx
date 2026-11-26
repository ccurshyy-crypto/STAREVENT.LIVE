import { useCallback, useEffect, useState } from 'react';

export type ScrollDotVariant = 'crimson-gold' | 'orange-suite';

interface ScrollDotNavProps {
  pageKey: string;
  dotCount?: number;
  variant?: ScrollDotVariant;
}

export function ScrollDotNav({
  pageKey,
  dotCount = 8,
  variant = 'crimson-gold',
}: ScrollDotNavProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollable, setScrollable] = useState(false);

  const syncScrollProgress = useCallback(() => {
    const doc = document.documentElement;
    const maxScroll = Math.max(0, doc.scrollHeight - window.innerHeight);

    if (maxScroll < 48) {
      setScrollable(false);
      setActiveIndex(0);
      return;
    }

    setScrollable(true);
    const ratio = Math.min(1, Math.max(0, window.scrollY / maxScroll));
    const nextIdx = Math.round(ratio * (dotCount - 1));
    setActiveIndex(nextIdx);
  }, [dotCount]);

  useEffect(() => {
    syncScrollProgress();

    let rafId = 0;
    const onScrollOrResize = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        syncScrollProgress();
      });
    };

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });

    // Re-check shortly after route transitions or async images expand height
    const t1 = window.setTimeout(syncScrollProgress, 120);
    const t2 = window.setTimeout(syncScrollProgress, 450);

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => onScrollOrResize())
        : null;
    if (resizeObserver && document.body) {
      resizeObserver.observe(document.body);
    }

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
      resizeObserver?.disconnect();
    };
  }, [pageKey, syncScrollProgress]);

  const handleJumpToDot = (index: number) => {
    const doc = document.documentElement;
    const maxScroll = Math.max(0, doc.scrollHeight - window.innerHeight);
    if (maxScroll <= 0) return;

    const targetTop = (index / (dotCount - 1)) * maxScroll;
    window.scrollTo({ top: targetTop, behavior: 'smooth' });
  };

  if (!scrollable) return null;

  const isOrangeSuite = variant === 'orange-suite';

  return (
    <nav
      aria-label="Page scroll progress"
      className="fixed right-2 sm:right-3.5 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-3 py-2.5 px-1 select-none"
    >
      {Array.from({ length: dotCount }, (_, idx) => {
        const isActive = idx === activeIndex;
        const activeClasses = isOrangeSuite
          ? 'w-2.5 h-2.5 bg-[#FF8C00] shadow-[0_0_12px_3px_rgba(255,140,0,0.85)] ring-2 ring-[#FF8C00]/35 border border-white/75 scale-110'
          : 'w-2.5 h-2.5 bg-[#FFE600] shadow-[0_0_12px_3px_rgba(255,230,0,0.85)] ring-2 ring-[#EF1A1A]/55 scale-110';
        const inactiveClasses = isOrangeSuite
          ? 'w-1.5 h-1.5 bg-[#FF8C00]/40 border border-[#FF8C00]/55 group-hover:bg-[#FF8C00]/85 group-hover:scale-125'
          : 'w-1.5 h-1.5 bg-[#FFE600]/30 border border-[#FFE600]/25 group-hover:bg-[#FFE600]/75 group-hover:scale-125';

        return (
          <button
            key={idx}
            type="button"
            onClick={() => handleJumpToDot(idx)}
            aria-label={`Scroll to section ${idx + 1} of ${dotCount}`}
            aria-current={isActive ? 'true' : undefined}
            className="group relative flex items-center justify-center w-5 h-5 cursor-pointer focus:outline-none"
          >
            <span
              className={`rounded-full transition-all duration-300 ${
                isActive ? activeClasses : inactiveClasses
              }`}
            />
          </button>
        );
      })}
    </nav>
  );
}
