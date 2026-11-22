/**
 * Ultra-fast, zero-lag Star Event Live Luxury Stage Pattern Background.
 * Pure GPU-composited CSS (transform & opacity only — ZERO 2D Canvas CPU loops).
 *
 * Pattern layers:
 * 1. Deep Star Event crimson-maroon & obsidian stage base
 * 2. Animated golden geometric diamond-lattice / royal broadcast tile pattern
 * 3. Soft drifting crimson & gold stage bokeh light orbs (no harsh lines/beams)
 * 4. Subtle rotating 8-point Star Event crest halo behind the stage
 * 5. Gently rising golden starlight sparks (★ / ✦)
 */
const RISING_SPARKS: Array<{
  id: number;
  left: string;
  top: string;
  symbol: '★' | '✦' | '•';
  size: string;
  delay: string;
  duration: string;
  tone: 'gold' | 'amber' | 'crimson';
}> = [
  { id: 1, left: '8%', top: '18%', symbol: '★', size: 'text-sm', delay: '0s', duration: '6.5s', tone: 'gold' },
  { id: 2, left: '19%', top: '72%', symbol: '✦', size: 'text-base', delay: '1.2s', duration: '7.4s', tone: 'amber' },
  { id: 3, left: '28%', top: '34%', symbol: '•', size: 'text-xl', delay: '2.1s', duration: '5.8s', tone: 'crimson' },
  { id: 4, left: '39%', top: '82%', symbol: '★', size: 'text-xs', delay: '0.7s', duration: '6.9s', tone: 'gold' },
  { id: 5, left: '52%', top: '24%', symbol: '✦', size: 'text-sm', delay: '1.8s', duration: '7.8s', tone: 'gold' },
  { id: 6, left: '64%', top: '66%', symbol: '•', size: 'text-lg', delay: '2.9s', duration: '6.2s', tone: 'amber' },
  { id: 7, left: '74%', top: '16%', symbol: '★', size: 'text-base', delay: '0.4s', duration: '7.1s', tone: 'gold' },
  { id: 8, left: '83%', top: '54%', symbol: '✦', size: 'text-sm', delay: '1.5s', duration: '6.4s', tone: 'crimson' },
  { id: 9, left: '91%', top: '29%', symbol: '★', size: 'text-xs', delay: '2.6s', duration: '7.6s', tone: 'gold' },
  { id: 10, left: '12%', top: '52%', symbol: '✦', size: 'text-xs', delay: '3.1s', duration: '6.8s', tone: 'gold' },
  { id: 11, left: '46%', top: '58%', symbol: '•', size: 'text-lg', delay: '1.1s', duration: '5.9s', tone: 'gold' },
  { id: 12, left: '88%', top: '80%', symbol: '★', size: 'text-sm', delay: '2.2s', duration: '7.2s', tone: 'amber' },
];

export function HomeAnimatedBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none bg-[#09050A]"
    >
      {/* 1. Star Event Live Crimson-to-Obsidian Stage Base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 58% at 50% -6%, rgba(185, 28, 28, 0.44) 0%, rgba(127, 29, 29, 0.2) 38%, rgba(9, 5, 10, 0) 76%), radial-gradient(ellipse 68% 50% at 88% 20%, rgba(250, 204, 21, 0.14) 0%, rgba(9, 5, 10, 0) 68%), radial-gradient(ellipse 72% 54% at 12% 84%, rgba(220, 38, 38, 0.22) 0%, rgba(9, 5, 10, 0) 72%), linear-gradient(180deg, #170509 0%, #0D060C 48%, #07070D 100%)',
        }}
      />

      {/* 2. Animated Luxury Diamond-Lattice Geometric Broadcast Pattern (Zero-Lag SVG Tile) */}
      <div className="star-pattern-drift absolute -inset-[72px] opacity-[0.22]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="star-diamond-lattice"
              width="72"
              height="72"
              patternUnits="userSpaceOnUse"
            >
              {/* Subtle Interlocking Diamond Tiles */}
              <path
                d="M36 4 L68 36 L36 68 L4 36 Z"
                fill="none"
                stroke="rgba(250, 204, 21, 0.34)"
                strokeWidth="0.9"
              />
              {/* Inner Crimson Accent Diamond */}
              <path
                d="M36 18 L54 36 L36 54 L18 36 Z"
                fill="none"
                stroke="rgba(239, 68, 68, 0.28)"
                strokeWidth="0.7"
              />
              {/* 4-Point Micro Star Nodes at Intersections */}
              <circle cx="36" cy="36" r="1.5" fill="rgba(250, 204, 21, 0.55)" />
              <circle cx="0" cy="0" r="1.2" fill="rgba(250, 204, 21, 0.35)" />
              <circle cx="72" cy="0" r="1.2" fill="rgba(250, 204, 21, 0.35)" />
              <circle cx="0" cy="72" r="1.2" fill="rgba(250, 204, 21, 0.35)" />
              <circle cx="72" cy="72" r="1.2" fill="rgba(250, 204, 21, 0.35)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#star-diamond-lattice)" />
        </svg>
      </div>

      {/* 3. Soft Drifting Stage Bokeh Nebula Orbs (Replaces Sweeping Line Beams) */}
      <div
        className="star-orb-float-a absolute -top-[10%] left-[8%] w-[380px] h-[380px] sm:w-[540px] sm:h-[540px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(239, 68, 68, 0.22) 0%, rgba(185, 28, 28, 0.08) 45%, rgba(9, 5, 10, 0) 72%)',
        }}
      />
      <div
        className="star-orb-float-b absolute top-[18%] right-[4%] w-[340px] h-[340px] sm:w-[500px] sm:h-[500px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(250, 204, 21, 0.17) 0%, rgba(245, 158, 11, 0.06) 46%, rgba(9, 5, 10, 0) 72%)',
        }}
      />
      <div
        className="star-orb-float-c absolute bottom-[4%] left-[26%] w-[360px] h-[360px] sm:w-[560px] sm:h-[560px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(220, 38, 38, 0.16) 0%, rgba(250, 204, 21, 0.05) 48%, rgba(9, 5, 10, 0) 72%)',
        }}
      />

      {/* 4. Subtle Slowly Rotating Golden Star-Crest Geometric Halo */}
      <div className="absolute top-[12%] left-1/2 -translate-x-1/2 w-[540px] h-[540px] sm:w-[760px] sm:h-[760px] opacity-[0.12]">
        <svg
          viewBox="0 0 400 400"
          className="star-crest-spin w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <polygon
            points="200,18 228,150 360,120 250,200 360,280 228,250 200,382 172,250 40,280 150,200 40,120 172,150"
            fill="none"
            stroke="#FACC15"
            strokeWidth="1.2"
          />
          <polygon
            points="200,56 218,162 324,144 238,200 324,256 218,238 200,344 182,238 76,256 162,200 76,144 182,162"
            fill="none"
            stroke="#EF4444"
            strokeWidth="1"
          />
          <circle
            cx="200"
            cy="200"
            r="146"
            fill="none"
            stroke="#FACC15"
            strokeWidth="0.9"
            strokeDasharray="6 10"
          />
        </svg>
      </div>

      {/* 5. Gently Rising Golden Starlight Sparks */}
      {RISING_SPARKS.map((spark) => (
        <span
          key={spark.id}
          className={`star-ember-float absolute leading-none ${spark.size} ${
            spark.tone === 'gold'
              ? 'text-[#FACC15]'
              : spark.tone === 'amber'
                ? 'text-[#FDE047]'
                : 'text-[#FCA5A5]'
          }`}
          style={{
            top: spark.top,
            left: spark.left,
            animationDelay: spark.delay,
            animationDuration: spark.duration,
          }}
        >
          {spark.symbol}
        </span>
      ))}

      {/* 6. Soft radial edge vignette for crisp text readability */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, transparent 38%, rgba(5, 4, 8, 0.58) 100%)',
        }}
      />
    </div>
  );
}
