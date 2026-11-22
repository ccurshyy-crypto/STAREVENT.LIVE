/**
 * Ultra-fast, zero-lag Star Event Live Banner-Themed Broadcast Stage Background.
 * Pure GPU-composited CSS (transform & opacity only — ZERO 2D Canvas CPU loops!)
 * Matches the official Star Event Live crimson-maroon, broadcast gold (#FACC15),
 * live red (#EF4444), halftone studio dots, sweeping stage spotlights, and
 * twinkling golden stars for instant 0ms paint on mobile, tablet, and desktop.
 */
const STAR_SPARKLES: Array<{
  id: number;
  top: string;
  left: string;
  size: string;
  delay: string;
  duration: string;
  gold?: boolean;
}> = [
  { id: 1, top: '9%', left: '12%', size: 'text-sm', delay: '0s', duration: '3.8s', gold: true },
  { id: 2, top: '16%', left: '84%', size: 'text-base', delay: '0.9s', duration: '4.4s', gold: true },
  { id: 3, top: '28%', left: '6%', size: 'text-xs', delay: '1.6s', duration: '3.6s' },
  { id: 4, top: '34%', left: '92%', size: 'text-sm', delay: '2.1s', duration: '4.8s', gold: true },
  { id: 5, top: '52%', left: '14%', size: 'text-xs', delay: '0.5s', duration: '4.2s', gold: true },
  { id: 6, top: '61%', left: '86%', size: 'text-sm', delay: '1.3s', duration: '3.9s' },
  { id: 7, top: '76%', left: '18%', size: 'text-base', delay: '2.4s', duration: '4.5s', gold: true },
  { id: 8, top: '83%', left: '78%', size: 'text-xs', delay: '0.8s', duration: '3.7s', gold: true },
  { id: 9, top: '44%', left: '49%', size: 'text-xs', delay: '1.9s', duration: '5.1s' },
  { id: 10, top: '22%', left: '42%', size: 'text-xs', delay: '2.8s', duration: '4.6s', gold: true },
];

export function HomeAnimatedBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none bg-[#09050A]"
    >
      {/* 1. Star Event Live Banner Crimson-to-Obsidian Stage Base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 85% 55% at 50% -8%, rgba(185, 28, 28, 0.42) 0%, rgba(127, 29, 29, 0.18) 38%, rgba(9, 5, 10, 0) 75%), radial-gradient(ellipse 65% 48% at 88% 18%, rgba(250, 204, 21, 0.14) 0%, rgba(9, 5, 10, 0) 68%), radial-gradient(ellipse 70% 52% at 14% 84%, rgba(220, 38, 38, 0.2) 0%, rgba(9, 5, 10, 0) 72%), linear-gradient(180deg, #160508 0%, #0C060B 48%, #07070D 100%)',
        }}
      />

      {/* 2. Official Banner Signature Halftone Broadcast Dot Matrix (ultra-lightweight repeating CSS) */}
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            'radial-gradient(rgba(250, 204, 21, 0.42) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
        }}
      />

      {/* 3. Sweeping Star Event Crimson & Gold Broadcast Stage Spotlights (pure GPU transform) */}
      <div
        className="star-stage-beam-left absolute -top-[18%] -left-[12%] w-[58vw] max-w-[720px] h-[125vh] origin-top"
        style={{
          background:
            'linear-gradient(180deg, rgba(239, 68, 68, 0.26) 0%, rgba(220, 38, 38, 0.08) 46%, rgba(9, 5, 10, 0) 86%)',
          clipPath: 'polygon(42% 0%, 58% 0%, 100% 100%, 0% 100%)',
        }}
      />
      <div
        className="star-stage-beam-right absolute -top-[18%] -right-[12%] w-[58vw] max-w-[720px] h-[125vh] origin-top"
        style={{
          background:
            'linear-gradient(180deg, rgba(250, 204, 21, 0.22) 0%, rgba(245, 158, 11, 0.06) 46%, rgba(9, 5, 10, 0) 86%)',
          clipPath: 'polygon(42% 0%, 58% 0%, 100% 100%, 0% 100%)',
        }}
      />

      {/* 4. Subtle Animated Star Event Live Broadcast Signal Pulse Rings */}
      <div className="star-signal-pulse absolute top-[10%] left-1/2 -translate-x-1/2 w-[560px] h-[560px] sm:w-[780px] sm:h-[780px] rounded-full border border-[#FACC15]/[0.07]" />
      <div
        className="star-signal-pulse absolute top-[4%] left-1/2 -translate-x-1/2 w-[780px] h-[780px] sm:w-[1060px] sm:h-[1060px] rounded-full border border-[#EF4444]/[0.06]"
        style={{ animationDelay: '2.4s' }}
      />

      {/* 5. Twinkling Star Event Golden Star Sparkles */}
      {STAR_SPARKLES.map((star) => (
        <span
          key={star.id}
          className={`star-twinkle-dot absolute leading-none ${star.size} ${
            star.gold ? 'text-[#FACC15]' : 'text-[#FCA5A5]'
          }`}
          style={{
            top: star.top,
            left: star.left,
            animationDelay: star.delay,
            animationDuration: star.duration,
          }}
        >
          ★
        </span>
      ))}

      {/* 6. Soft bottom vignette for crisp WCAG AA contrast */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, transparent 40%, rgba(5, 4, 8, 0.56) 100%)',
        }}
      />
    </div>
  );
}
