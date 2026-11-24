/**
 * Star Event Live Official Banner-Matched Stage Background.
 * Matches the crimson-maroon halftone broadcast gradient, golden starlight glow,
 * and deep royal navy (#070B28) bottom anchor from the official STAR EVENT LIVE banner.
 * Pure GPU-composited CSS (zero Canvas loops, zero lag).
 */
const RISING_SPARKS: Array<{
  id: number;
  left: string;
  top: string;
  symbol: '★' | '✦' | '•';
  size: string;
  delay: string;
  duration: string;
  tone: 'gold' | 'white' | 'crimson';
}> = [
  { id: 1, left: '7%', top: '16%', symbol: '★', size: 'text-sm', delay: '0s', duration: '6.5s', tone: 'gold' },
  { id: 2, left: '19%', top: '70%', symbol: '✦', size: 'text-base', delay: '1.2s', duration: '7.4s', tone: 'gold' },
  { id: 3, left: '29%', top: '32%', symbol: '•', size: 'text-xl', delay: '2.1s', duration: '5.8s', tone: 'crimson' },
  { id: 4, left: '40%', top: '82%', symbol: '★', size: 'text-xs', delay: '0.7s', duration: '6.9s', tone: 'gold' },
  { id: 5, left: '53%', top: '22%', symbol: '✦', size: 'text-sm', delay: '1.8s', duration: '7.8s', tone: 'white' },
  { id: 6, left: '65%', top: '65%', symbol: '•', size: 'text-lg', delay: '2.9s', duration: '6.2s', tone: 'gold' },
  { id: 7, left: '75%', top: '14%', symbol: '★', size: 'text-base', delay: '0.4s', duration: '7.1s', tone: 'gold' },
  { id: 8, left: '84%', top: '52%', symbol: '✦', size: 'text-sm', delay: '1.5s', duration: '6.4s', tone: 'crimson' },
  { id: 9, left: '92%', top: '28%', symbol: '★', size: 'text-xs', delay: '2.6s', duration: '7.6s', tone: 'gold' },
  { id: 10, left: '12%', top: '50%', symbol: '✦', size: 'text-xs', delay: '3.1s', duration: '6.8s', tone: 'gold' },
  { id: 11, left: '47%', top: '56%', symbol: '•', size: 'text-lg', delay: '1.1s', duration: '5.9s', tone: 'white' },
  { id: 12, left: '89%', top: '79%', symbol: '★', size: 'text-sm', delay: '2.2s', duration: '7.2s', tone: 'gold' },
];

export function HomeAnimatedBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none bg-[#3B0207]"
    >
      {/* 1. Banner-Matched Deep Crimson-Maroon to Royal Navy Stage Base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 96% 52% at 50% -4%, rgba(196, 12, 18, 0.78) 0%, rgba(132, 4, 12, 0.56) 36%, rgba(58, 3, 10, 0.25) 72%, rgba(7, 11, 40, 0) 100%), radial-gradient(ellipse 68% 48% at 88% 18%, rgba(255, 230, 0, 0.14) 0%, rgba(58, 3, 10, 0) 68%), radial-gradient(ellipse 70% 52% at 12% 76%, rgba(185, 16, 22, 0.36) 0%, rgba(7, 11, 40, 0) 74%), linear-gradient(180deg, #6B0208 0%, #4A0208 34%, #2A030E 68%, #0A0E2D 100%)',
        }}
      />

      {/* 2. Official Banner Halftone Dot Broadcast Backdrop Texture */}
      <div
        className="absolute inset-0 opacity-[0.34]"
        style={{
          backgroundImage:
            'radial-gradient(circle at center, rgba(255, 68, 68, 0.42) 1.5px, transparent 1.7px)',
          backgroundSize: '20px 20px',
          maskImage:
            'radial-gradient(ellipse 95% 80% at 50% 25%, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.35) 68%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 95% 80% at 50% 25%, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.35) 68%, transparent 100%)',
        }}
      />

      {/* 3. Subtle Animated Golden Geometric Star-Broadcast Pattern */}
      <div className="star-pattern-drift absolute -inset-[72px] opacity-[0.14]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="star-diamond-lattice"
              width="72"
              height="72"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M36 4 L68 36 L36 68 L4 36 Z"
                fill="none"
                stroke="rgba(255, 230, 0, 0.38)"
                strokeWidth="0.85"
              />
              <circle cx="36" cy="36" r="1.4" fill="rgba(255, 230, 0, 0.65)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#star-diamond-lattice)" />
        </svg>
      </div>

      {/* 4. Soft Drifting Broadcast Crimson & Gold Stage Glow Orbs */}
      <div
        className="star-orb-float-a absolute -top-[10%] left-[6%] w-[380px] h-[380px] sm:w-[560px] sm:h-[560px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(235, 28, 36, 0.32) 0%, rgba(153, 8, 16, 0.14) 46%, rgba(43, 2, 8, 0) 74%)',
        }}
      />
      <div
        className="star-orb-float-b absolute top-[16%] right-[4%] w-[340px] h-[340px] sm:w-[500px] sm:h-[500px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(255, 230, 0, 0.16) 0%, rgba(250, 204, 21, 0.06) 46%, rgba(43, 2, 8, 0) 72%)',
        }}
      />
      <div
        className="star-orb-float-c absolute bottom-[2%] left-[24%] w-[360px] h-[360px] sm:w-[580px] sm:h-[580px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(16, 26, 86, 0.42) 0%, rgba(185, 20, 28, 0.12) 48%, rgba(7, 11, 40, 0) 74%)',
        }}
      />

      {/* 5. Gently Rising Golden Starlight Sparks */}
      {RISING_SPARKS.map((spark) => (
        <span
          key={spark.id}
          className={`star-ember-float absolute leading-none ${spark.size} ${
            spark.tone === 'gold'
              ? 'text-[#FFE600]'
              : spark.tone === 'white'
                ? 'text-white/80'
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

      {/* 6. Soft Edge Vignette for Crisp White & Yellow Text Legibility */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 35%, transparent 35%, rgba(16, 2, 6, 0.56) 100%)',
        }}
      />
    </div>
  );
}
