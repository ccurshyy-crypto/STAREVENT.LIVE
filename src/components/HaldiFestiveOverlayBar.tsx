import { CSSProperties, useId } from 'react';
import { HaldiAnimationMode, HaldiAnimSpeed, HaldiColorTheme } from '../types/overlay';

export interface HaldiFestiveOverlayBarProps {
  variant: 'mini' | 'studio' | 'output';
  leftText: string;
  centerMain: string;
  centerSub: string;
  rightText: string;
  animation?: HaldiAnimationMode;
  theme?: HaldiColorTheme;
  speed?: HaldiAnimSpeed;
  showDecor?: boolean;
  showPetals?: boolean;
}

export const HALDI_THEME_PALETTES: Record<
  HaldiColorTheme,
  {
    name: string;
    ribbonDark: string;
    ribbonMid: string;
    ribbonBright: string;
    medallionDark: string;
    medallionLight: string;
    goldLight: string;
    goldMid: string;
    goldDark: string;
    accentGlow: string;
  }
> = {
  'royal-maroon': {
    name: 'Royal Maroon & Gold',
    ribbonDark: '#4D0414',
    ribbonMid: '#7F0922',
    ribbonBright: '#A61031',
    medallionDark: '#590518',
    medallionLight: '#9A0F2E',
    goldLight: '#FEF08A',
    goldMid: '#F59E0B',
    goldDark: '#92400E',
    accentGlow: 'rgba(250, 204, 21, 0.55)',
  },
  'turmeric-gold': {
    name: 'Haldi Turmeric & Gold',
    ribbonDark: '#6B2F04',
    ribbonMid: '#A14908',
    ribbonBright: '#CA670A',
    medallionDark: '#7C3605',
    medallionLight: '#B45309',
    goldLight: '#FEF9C3',
    goldMid: '#FACC15',
    goldDark: '#854D0E',
    accentGlow: 'rgba(253, 224, 71, 0.65)',
  },
  'saffron-red': {
    name: 'Temple Crimson & Saffron',
    ribbonDark: '#5F0A0A',
    ribbonMid: '#991B1B',
    ribbonBright: '#C2251B',
    medallionDark: '#6B0F0F',
    medallionLight: '#B91C1C',
    goldLight: '#FDE68A',
    goldMid: '#F97316',
    goldDark: '#9A3412',
    accentGlow: 'rgba(251, 146, 60, 0.6)',
  },
  'emerald-gold': {
    name: 'Royal Emerald & Gold',
    ribbonDark: '#04382A',
    ribbonMid: '#065F46',
    ribbonBright: '#047857',
    medallionDark: '#054433',
    medallionLight: '#0A7A5A',
    goldLight: '#FEF08A',
    goldMid: '#EAB308',
    goldDark: '#854D0E',
    accentGlow: 'rgba(250, 204, 21, 0.55)',
  },
};

function MarigoldBloom({
  cx,
  cy,
  r,
  color = '#F97316',
  inner = '#FACC15',
}: {
  cx: number;
  cy: number;
  r: number;
  color?: string;
  inner?: string;
}) {
  const petals = 10;
  return (
    <g transform={`translate(${cx} ${cy})`}>
      {Array.from({ length: petals }).map((_, idx) => {
        const angle = (360 / petals) * idx;
        return (
          <ellipse
            key={idx}
            cx={0}
            cy={-r * 0.62}
            rx={r * 0.36}
            ry={r * 0.52}
            fill={idx % 2 === 0 ? color : '#FB923C'}
            stroke="#9A3412"
            strokeWidth={0.7}
            transform={`rotate(${angle})`}
          />
        );
      })}
      {Array.from({ length: 8 }).map((_, idx) => {
        const angle = (360 / 8) * idx + 22;
        return (
          <ellipse
            key={`in-${idx}`}
            cx={0}
            cy={-r * 0.34}
            rx={r * 0.24}
            ry={r * 0.34}
            fill={inner}
            transform={`rotate(${angle})`}
          />
        );
      })}
      <circle cx={0} cy={0} r={r * 0.24} fill="#EA580C" />
      <circle cx={0} cy={0} r={r * 0.11} fill="#FEF08A" />
    </g>
  );
}

function LeafSprig({ x, y, rotate = 0, scale = 1 }: { x: number; y: number; rotate?: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <path
        d="M0 0 C12 -16 32 -18 44 -4 C30 8 12 10 0 0 Z"
        fill="#15803D"
        stroke="#052E16"
        strokeWidth="1.2"
      />
      <path d="M2 0 C14 -6 26 -6 38 -4" stroke="#86EFAC" strokeWidth="1.2" fill="none" />
    </g>
  );
}

const PETAL_SEEDS = [
  { left: '8%', delay: '0s', size: 11, color: '#FACC15' },
  { left: '19%', delay: '1.1s', size: 9, color: '#FB923C' },
  { left: '34%', delay: '2.2s', size: 12, color: '#FDE047' },
  { left: '46%', delay: '0.6s', size: 10, color: '#F59E0B' },
  { left: '54%', delay: '1.7s', size: 11, color: '#FEF08A' },
  { left: '67%', delay: '2.7s', size: 9, color: '#FB923C' },
  { left: '81%', delay: '0.9s', size: 11, color: '#FACC15' },
  { left: '91%', delay: '1.9s', size: 10, color: '#F59E0B' },
];

export function HaldiFestiveOverlayBar({
  variant,
  leftText,
  centerMain,
  centerSub,
  rightText,
  animation = 'festive',
  theme = 'royal-maroon',
  speed = 'normal',
  showDecor = true,
  showPetals = true,
}: HaldiFestiveOverlayBarProps) {
  const uid = useId().replace(/:/g, '');
  const palette = HALDI_THEME_PALETTES[theme] ?? HALDI_THEME_PALETTES['royal-maroon'];

  const isStatic = animation === 'static';
  const enableSheen = !isStatic && (animation === 'festive' || animation === 'shimmer');
  const enableBeat = !isStatic && (animation === 'festive' || animation === 'beat');
  const enableGlow = !isStatic && (animation === 'festive' || animation === 'shimmer' || animation === 'beat');
  const enablePetals = !isStatic && showPetals && (animation === 'festive' || animation === 'petals');
  const enableTextShimmer = !isStatic && (animation === 'festive' || animation === 'shimmer');

  const speedFactor = speed === 'fast' ? 0.65 : speed === 'slow' ? 1.55 : 1;
  const animVars = {
    '--haldi-sheen-dur': `${(4.8 * speedFactor).toFixed(2)}s`,
    '--haldi-beat-dur': `${(2.1 * speedFactor).toFixed(2)}s`,
    '--haldi-glow-dur': `${(3.1 * speedFactor).toFixed(2)}s`,
    '--haldi-sway-dur': `${(3.8 * speedFactor).toFixed(2)}s`,
    '--haldi-petal-dur': `${(4.2 * speedFactor).toFixed(2)}s`,
    '--haldi-shimmer-dur': `${(3.8 * speedFactor).toFixed(2)}s`,
  } as CSSProperties;

  const isMini = variant === 'mini';
  const isOutput = variant === 'output';

  // Split left text nicely so first word is crisp white and second word(s) glow warm gold (like "शुभ विवाह...")
  const splitHighlight = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return { first: '', rest: '' };
    const idx = trimmed.indexOf(' ');
    if (idx === -1) return { first: trimmed, rest: '' };
    return { first: trimmed.slice(0, idx), rest: trimmed.slice(idx + 1) };
  };

  const leftParts = splitHighlight(leftText || 'शुभ विवाह...');
  const rightParts = splitHighlight(rightText || 'Haldi Ceremony');

  const sideFontSize = isMini
    ? 'text-[9px] sm:text-[10px]'
    : isOutput
      ? 'text-[clamp(22px,2.35vw,44px)]'
      : 'text-[clamp(11px,1.45vw,21px)]';

  const centerMainSize = isMini
    ? 'text-[14px] sm:text-[16px]'
    : isOutput
      ? 'text-[clamp(34px,3.8vw,72px)]'
      : 'text-[clamp(18px,2.35vw,34px)]';

  const centerSubSize = isMini
    ? 'text-[9px] sm:text-[10px]'
    : isOutput
      ? 'text-[clamp(18px,1.95vw,38px)]'
      : 'text-[clamp(10px,1.25vw,19px)]';

  return (
    <div
      style={animVars}
      className={`relative w-full select-none ${!isStatic && !isMini ? 'haldi-entrance-bar' : ''}`}
    >
      {/* Drifting Marigold Petals & Turmeric Sparkles */}
      {enablePetals && !isMini && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-6 inset-x-0 bottom-2 overflow-visible z-20"
        >
          {PETAL_SEEDS.map((p, idx) => (
            <span
              key={idx}
              className="haldi-petal-float absolute bottom-[26%] rounded-full"
              style={{
                left: p.left,
                width: isOutput ? `${p.size * 1.45}px` : `${p.size * 0.85}px`,
                height: isOutput ? `${p.size * 0.85}px` : `${p.size * 0.55}px`,
                background: `radial-gradient(circle at 35% 35%, #FEF9C3, ${p.color})`,
                boxShadow: `0 0 8px ${palette.accentGlow}`,
                animationDelay: p.delay,
              }}
            />
          ))}
        </div>
      )}

      {/* Main Scalable Aspect-Locked Broadcast Lower-Third Vector + Live Text Layer */}
      <div className="relative w-full aspect-[1200/228]">
        <svg
          viewBox="0 0 1200 228"
          className="w-full h-full block overflow-visible drop-shadow-[0_10px_22px_rgba(0,0,0,0.62)]"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`rib-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={palette.ribbonDark} />
              <stop offset="22%" stopColor={palette.ribbonMid} />
              <stop offset="50%" stopColor={palette.ribbonBright} />
              <stop offset="78%" stopColor={palette.ribbonMid} />
              <stop offset="100%" stopColor={palette.ribbonDark} />
            </linearGradient>

            <linearGradient id={`med-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={palette.medallionLight} />
              <stop offset="55%" stopColor={palette.medallionDark} />
              <stop offset="100%" stopColor={palette.ribbonDark} />
            </linearGradient>

            <linearGradient id={`gold-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={palette.goldDark} />
              <stop offset="20%" stopColor={palette.goldLight} />
              <stop offset="48%" stopColor={palette.goldMid} />
              <stop offset="78%" stopColor={palette.goldLight} />
              <stop offset="100%" stopColor={palette.goldDark} />
            </linearGradient>

            <linearGradient id={`goldV-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFBEB" />
              <stop offset="40%" stopColor="#FACC15" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>

            <radialGradient id={`turmeric-${uid}`} cx="50%" cy="32%" r="65%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="45%" stopColor="#FACC15" />
              <stop offset="85%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </radialGradient>

            <linearGradient id={`copper-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="28%" stopColor="#F59E0B" />
              <stop offset="65%" stopColor="#B45309" />
              <stop offset="100%" stopColor="#78350F" />
            </linearGradient>

            <linearGradient id={`dholWood-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EA580C" />
              <stop offset="45%" stopColor="#9A3412" />
              <stop offset="100%" stopColor="#431407" />
            </linearGradient>

            <clipPath id={`ribbonClip-${uid}`}>
              <rect x="24" y="88" width="1152" height="122" rx="14" />
            </clipPath>
          </defs>

          {/* 1. Main Full-Width Royal Ribbon Base */}
          <rect
            x="24"
            y="88"
            width="1152"
            height="122"
            rx="14"
            fill={`url(#rib-${uid})`}
            stroke={`url(#gold-${uid})`}
            strokeWidth="6"
          />
          {/* Inner hairline metallic gold border */}
          <rect
            x="34"
            y="98"
            width="1132"
            height="102"
            rx="9"
            fill="none"
            stroke={palette.goldLight}
            strokeOpacity="0.48"
            strokeWidth="1.6"
          />

          {/* Subtle ornamental corner filigree inside ribbon */}
          <path
            d="M142 108 Q158 108 166 122 M1058 108 Q1042 108 1034 122"
            stroke={palette.goldLight}
            strokeOpacity="0.42"
            strokeWidth="2"
            fill="none"
          />

          {/* Animated Metallic Gold Sheen Sweep across the Ribbon */}
          {enableSheen && (
            <g clipPath={`url(#ribbonClip-${uid})`}>
              <rect
                x="0"
                y="84"
                width="260"
                height="134"
                fill="url(#gold-sheen-grad)"
                className="haldi-ribbon-sheen"
                style={{ fill: `url(#gold-${uid})`, opacity: 0.22 }}
              />
            </g>
          )}

          {/* Golden Curved Brush Swooshes under Left & Right Text */}
          <path
            d="M214 184 Q292 166 376 172 Q294 176 218 191 Z"
            fill={`url(#gold-${uid})`}
          />
          <path
            d="M842 186 Q924 166 1018 172 Q926 177 846 193 Z"
            fill={`url(#gold-${uid})`}
          />

          {/* 2. Center Back Floral Leaves & Marigolds flanking Medallion */}
          {showDecor && (
            <g className={enableGlow ? 'haldi-flower-sway' : ''}>
              {/* Leaves behind Haldi Bowl */}
              <LeafSprig x={510} y={76} rotate={-148} scale={1.08} />
              <LeafSprig x={534} y={64} rotate={-124} scale={0.92} />
              <LeafSprig x={690} y={76} rotate={-32} scale={1.08} />
              <LeafSprig x={666} y={64} rotate={-56} scale={0.92} />
              <LeafSprig x={445} y={122} rotate={-160} scale={0.92} />
              <LeafSprig x={755} y={122} rotate={-20} scale={0.92} />

              {/* Top flanking marigolds */}
              <MarigoldBloom cx={506} cy={78} r={22} color="#FACC15" inner="#FEF08A" />
              <MarigoldBloom cx={482} cy={92} r={18} color="#F97316" inner="#FDE047" />
              <MarigoldBloom cx={694} cy={78} r={22} color="#FACC15" inner="#FEF08A" />
              <MarigoldBloom cx={718} cy={92} r={18} color="#F97316" inner="#FDE047" />
            </g>
          )}

          {/* 3. Center Royal Scalloped Ornate Arch Medallion */}
          <g>
            {/* Outer gold scalloped frame */}
            <path
              d="M442 146
                 C458 134 468 112 480 96
                 C494 78 524 72 552 68
                 C574 65 588 54 600 50
                 C612 54 626 65 648 68
                 C676 72 706 78 720 96
                 C732 112 742 134 758 146
                 C742 158 732 180 718 196
                 C702 212 666 212 634 214
                 C616 215 606 220 600 224
                 C594 220 584 215 566 214
                 C534 212 498 212 482 196
                 C468 180 458 158 442 146 Z"
              fill={`url(#med-${uid})`}
              stroke={`url(#gold-${uid})`}
              strokeWidth="5.5"
            />
            {/* Inner delicate gold accent contour */}
            <path
              d="M456 146
                 C470 135 478 116 490 103
                 C502 88 528 82 554 78
                 C574 75 588 66 600 62
                 C612 66 626 75 646 78
                 C672 82 698 88 710 103
                 C722 116 730 135 744 146
                 C730 157 722 176 708 189
                 C694 202 662 203 632 205
                 C616 206 606 210 600 213
                 C594 210 584 206 568 205
                 C538 203 506 202 492 189
                 C478 176 470 157 456 146 Z"
              fill="none"
              stroke={palette.goldLight}
              strokeOpacity="0.6"
              strokeWidth="1.8"
            />
          </g>

          {/* 4. Top Center Golden Bowl Brimming with Bright Haldi Turmeric Mound */}
          {showDecor && (
            <g className={enableGlow ? 'haldi-bowl-aura' : ''}>
              {/* Bright Yellow Turmeric Mound */}
              <path
                d="M538 56 Q568 12 600 8 Q632 12 662 56 Z"
                fill={`url(#turmeric-${uid})`}
                stroke="#D97706"
                strokeWidth="1.2"
              />
              {/* Subtle turmeric powder texture highlights */}
              <path
                d="M558 44 Q584 20 600 16 Q616 20 638 42"
                fill="none"
                stroke="#FEF9C3"
                strokeOpacity="0.55"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Embossed Golden Bowl */}
              <path
                d="M528 52 C530 82 556 92 600 92 C644 92 670 82 672 52 Z"
                fill={`url(#copper-${uid})`}
                stroke="#FEF08A"
                strokeWidth="2.2"
              />
              {/* Rim highlight */}
              <ellipse
                cx="600"
                cy="53"
                rx="72"
                ry="8.5"
                fill="#B45309"
                stroke="#FEF08A"
                strokeWidth="2"
              />
              <ellipse cx="600" cy="52" rx="64" ry="5.5" fill={`url(#turmeric-${uid})`} />
              {/* Bowl filigree dots */}
              <circle cx="562" cy="70" r="2.6" fill="#FEF08A" />
              <circle cx="581" cy="75" r="2.6" fill="#FEF08A" />
              <circle cx="600" cy="77" r="3" fill="#FEF08A" />
              <circle cx="619" cy="75" r="2.6" fill="#FEF08A" />
              <circle cx="638" cy="70" r="2.6" fill="#FEF08A" />
            </g>
          )}

          {/* Front Marigold Clusters on Left & Right of Center Medallion */}
          {showDecor && (
            <g className={enableGlow ? 'haldi-flower-sway' : ''}>
              <MarigoldBloom cx={438} cy={176} r={24} color="#EA580C" inner="#FACC15" />
              <MarigoldBloom cx={462} cy={196} r={23} color="#F97316" inner="#FDE047" />
              <MarigoldBloom cx={416} cy={196} r={16} color="#FACC15" inner="#FEF9C3" />

              <MarigoldBloom cx={762} cy={176} r={24} color="#EA580C" inner="#FACC15" />
              <MarigoldBloom cx={738} cy={196} r={23} color="#F97316" inner="#FDE047" />
              <MarigoldBloom cx={784} cy={196} r={16} color="#FACC15" inner="#FEF9C3" />
            </g>
          )}

          {/* 5. Left Wing: Traditional Dholak + Marigold Flowers */}
          {showDecor && (
            <g>
              <g className={enableGlow ? 'haldi-flower-sway' : ''}>
                <LeafSprig x={66} y={96} rotate={-130} scale={1.1} />
                <LeafSprig x={108} y={92} rotate={-45} scale={1.0} />
                <MarigoldBloom cx={42} cy={96} r={22} color="#F97316" inner="#FACC15" />
                <MarigoldBloom cx={72} cy={84} r={20} color="#FACC15" inner="#FEF9C3" />
              </g>

              {/* Animated Dholak */}
              <g className={enableBeat ? 'haldi-dhol-beat' : ''}>
                <g transform="translate(80 148) rotate(-32)">
                  {/* Barrel body */}
                  <ellipse cx="0" cy="0" rx="56" ry="38" fill={`url(#dholWood-${uid})`} stroke="#F59E0B" strokeWidth="2.5" />
                  {/* Left & Right leather drum heads */}
                  <ellipse cx="-42" cy="0" rx="16" ry="33" fill="#FEF3C7" stroke="#92400E" strokeWidth="2.4" />
                  <ellipse cx="-42" cy="0" rx="9" ry="20" fill="#D97706" fillOpacity="0.28" />
                  <ellipse cx="42" cy="0" rx="17" ry="36" fill="#FFFBEB" stroke="#92400E" strokeWidth="2.6" />
                  <ellipse cx="42" cy="0" rx="10" ry="22" fill="#E5E7EB" stroke="#B45309" strokeWidth="1.2" />
                  {/* Zig-zag tension ropes */}
                  <path
                    d="M-32 -28 L-8 32 L12 -32 L32 29 M-32 28 L-8 -32 L12 32 L32 -29"
                    stroke="#FEF9C3"
                    strokeWidth="2.2"
                    fill="none"
                    strokeLinejoin="round"
                  />
                  {/* Brass tuning rings */}
                  <circle cx="-12" cy="0" r="4" fill="#FACC15" stroke="#78350F" strokeWidth="1" />
                  <circle cx="14" cy="0" r="4" fill="#FACC15" stroke="#78350F" strokeWidth="1" />
                </g>
              </g>

              {/* Foreground left marigolds */}
              <MarigoldBloom cx={34} cy={196} r={23} color="#FACC15" inner="#FEF08A" />
              <MarigoldBloom cx={62} cy={208} r={14} color="#EA580C" inner="#FACC15" />
            </g>
          )}

          {/* 6. Right Wing: Copper-Gold Om (ॐ) Kalash Brimming with Haldi + Marigolds */}
          {showDecor && (
            <g>
              <g className={enableGlow ? 'haldi-flower-sway' : ''}>
                <LeafSprig x={1102} y={96} rotate={-145} scale={1.05} />
                <LeafSprig x={1148} y={96} rotate={-38} scale={1.1} />
                <MarigoldBloom cx={1162} cy={98} r={22} color="#F97316" inner="#FACC15" />
                <MarigoldBloom cx={1130} cy={88} r={19} color="#FACC15" inner="#FEF9C3" />
              </g>

              {/* Animated Copper-Gold Om Kalash */}
              <g className={enableGlow ? 'haldi-kalash-glow' : ''}>
                {/* Haldi Mound overflowing top of Kalash */}
                <path
                  d="M1086 106 Q1118 68 1150 106 Z"
                  fill={`url(#turmeric-${uid})`}
                  stroke="#D97706"
                  strokeWidth="1.2"
                />
                {/* Kalash neck & rim */}
                <ellipse cx="1118" cy="108" rx="34" ry="8" fill="#B45309" stroke="#FEF08A" strokeWidth="2.2" />
                <ellipse cx="1118" cy="107" rx="28" ry="4.5" fill={`url(#turmeric-${uid})`} />
                {/* Kalash rounded belly */}
                <path
                  d="M1090 112
                     C1070 132 1066 172 1084 196
                     C1096 210 1140 210 1152 196
                     C1170 172 1166 132 1146 112 Z"
                  fill={`url(#copper-${uid})`}
                  stroke="#FEF08A"
                  strokeWidth="2.4"
                />
                {/* Embossed metallic waist band */}
                <path
                  d="M1076 142 Q1118 152 1160 142"
                  fill="none"
                  stroke="#FEF08A"
                  strokeOpacity="0.7"
                  strokeWidth="2.2"
                />
                <path
                  d="M1080 184 Q1118 193 1156 184"
                  fill="none"
                  stroke="#FEF08A"
                  strokeOpacity="0.55"
                  strokeWidth="2"
                />
                {/* Sacred ॐ Symbol */}
                <text
                  x="1118"
                  y="174"
                  textAnchor="middle"
                  fill="#7F1D1D"
                  stroke="#FEF08A"
                  strokeWidth="1"
                  fontSize="36"
                  fontWeight="800"
                  fontFamily="Noto Sans Devanagari, serif"
                >
                  ॐ
                </text>
              </g>

              {/* Foreground right marigolds */}
              <MarigoldBloom cx={1166} cy={196} r={23} color="#FACC15" inner="#FEF08A" />
              <MarigoldBloom cx={1074} cy={198} r={16} color="#F97316" inner="#FDE047" />
            </g>
          )}
        </svg>

        {/* 7. Crisp Live-Customizable HTML Text Layers (Perfect Devanagari, Gujarati, Hindi & English Rendering!) */}
        {/* Left Text Zone */}
        <div
          className="absolute inset-y-0 flex items-center justify-center text-center px-1"
          style={{
            left: showDecor ? '13%' : '4%',
            width: showDecor ? '23%' : '32%',
            top: '39%',
            height: '46%',
          }}
        >
          <p
            className={`font-display font-extrabold leading-[1.3] truncate drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] ${sideFontSize}`}
          >
            <span className="text-white">{leftParts.first}</span>
            {leftParts.rest && (
              <>
                {' '}
                <span className={enableTextShimmer ? 'haldi-gold-shimmer' : 'text-[#FDE047]'}>
                  {leftParts.rest}
                </span>
              </>
            )}
          </p>
        </div>

        {/* Center Ornate Medallion Main + Sub Title Zone */}
        <div
          className="absolute flex flex-col items-center justify-center text-center px-1"
          style={{
            left: '38.5%',
            width: '23%',
            top: '36%',
            height: '58%',
          }}
        >
          <p
            className={`font-display font-black leading-[1.15] truncate max-w-full drop-shadow-[0_3px_8px_rgba(0,0,0,0.92)] ${centerMainSize} ${
              enableTextShimmer ? 'haldi-gold-shimmer' : 'text-[#FACC15]'
            }`}
          >
            {centerMain || 'हळदी'}
          </p>
          {centerSub && (
            <p
              className={`font-display font-extrabold text-white leading-[1.22] truncate max-w-full drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] -mt-0.5 ${centerSubSize}`}
            >
              {centerSub}
            </p>
          )}
        </div>

        {/* Right Text Zone */}
        <div
          className="absolute inset-y-0 flex items-center justify-center text-center px-1"
          style={{
            left: '64.5%',
            width: showDecor ? '23%' : '31.5%',
            top: '39%',
            height: '46%',
          }}
        >
          <p
            className={`font-display font-extrabold italic leading-[1.3] truncate drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] ${sideFontSize}`}
          >
            <span className="text-white">{rightParts.first}</span>
            {rightParts.rest && (
              <>
                {' '}
                <span className={enableTextShimmer ? 'haldi-gold-shimmer' : 'text-[#FDE047]'}>
                  {rightParts.rest}
                </span>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
