import { BANNER_THEMES } from '../data/overlayCatalog';
import { BannerIconType, BannerThemeId } from '../types/overlay';

interface BottomBannerFrameProps {
  theme: BannerThemeId;
  title: string;
  subtitle: string;
  icon: BannerIconType;
  titleColor?: string;
  subtitleColor?: string;
  showTrophy?: boolean;
  showBrandLogo?: boolean;
  customLogoUrl?: string;
  animated?: boolean;
  variant?: 'mini' | 'studio' | 'output';
}

function LeftEventEmblem({ icon, className }: { icon: BannerIconType; className: string }) {
  if (icon === 'none') return null;

  if (icon === 'cricket') {
    // Dynamic Cricket Batter illustration matching the uploaded tournament banner
    return (
      <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
        {/* Motion speed arcs */}
        <path
          d="M54 20C64 31 66 48 56 62"
          stroke="#FACC15"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.9"
        />
        <path
          d="M60 27C67 36 68 49 61 59"
          stroke="#F59E0B"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.7"
        />
        {/* Bat raised overhead */}
        <path
          d="M20 8L47 16L45 21L18 13L20 8Z"
          fill="#FDE047"
          stroke="#09090B"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M46 18L53 21" stroke="#F59E0B" strokeWidth="3.5" strokeLinecap="round" />
        {/* Helmet */}
        <circle cx="37" cy="21" r="7.5" fill="#0F172A" stroke="#FACC15" strokeWidth="1.8" />
        <path d="M31 22H42" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
        {/* Jersey torso */}
        <path
          d="M29 29L46 28L49 48L28 48L29 29Z"
          fill="#1D4ED8"
          stroke="#09090B"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Arms holding bat */}
        <path
          d="M44 30L51 22M31 32L39 22"
          stroke="#FDBA74"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        {/* Batting pads & legs in stride */}
        <path
          d="M32 48L22 72L29 73L38 54"
          fill="#E2E8F0"
          stroke="#0F172A"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M44 48L51 72L43 73L38 54"
          fill="#F8FAFC"
          stroke="#0F172A"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Pad straps */}
        <path d="M27 61L33 62M42 61L48 61" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === 'kabaddi') {
    return (
      <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
        <circle cx="40" cy="40" r="34" fill="#0F0A14" stroke="#FACC15" strokeWidth="3" />
        <path
          d="M22 54L34 34L44 42L56 24"
          stroke="#EF4444"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="45" cy="23" r="6" fill="#FACC15" />
        <path
          d="M26 60H54"
          stroke="#FACC15"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (icon === 'kalash') {
    return (
      <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
        {/* Mango leaves */}
        <path d="M40 28C32 16 20 18 22 28C28 30 34 30 40 28Z" fill="#22C55E" stroke="#052E16" strokeWidth="1.5" />
        <path d="M40 28C48 16 60 18 58 28C52 30 46 30 40 28Z" fill="#16A34A" stroke="#052E16" strokeWidth="1.5" />
        {/* Coconut */}
        <ellipse cx="40" cy="24" rx="9" ry="11" fill="#92400E" stroke="#FACC15" strokeWidth="1.8" />
        {/* Golden Kalash Pot */}
        <path
          d="M27 32H53L49 40C56 46 57 60 49 68H31C23 60 24 46 31 40L27 32Z"
          fill="url(#kalashGrad)"
          stroke="#FEF08A"
          strokeWidth="2"
        />
        <path d="M32 52H48" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" />
        <defs>
          <linearGradient id="kalashGrad" x1="25" y1="32" x2="55" y2="68" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FDE047" />
            <stop offset="0.55" stopColor="#F59E0B" />
            <stop offset="1" stopColor="#B45309" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  if (icon === 'wedding') {
    return (
      <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
        {/* Interlocking Golden Wedding Rings */}
        <circle
          cx="30"
          cy="45"
          r="18"
          stroke="url(#ringGoldA)"
          strokeWidth="5.5"
        />
        <circle
          cx="50"
          cy="45"
          r="18"
          stroke="url(#ringGoldB)"
          strokeWidth="5.5"
        />
        {/* Diamond Sparkle on top */}
        <path
          d="M40 12L44 21L53 24L44 27L40 36L36 27L27 24L36 21L40 12Z"
          fill="#FEF08A"
          stroke="#F59E0B"
          strokeWidth="1.4"
        />
        <defs>
          <linearGradient id="ringGoldA" x1="12" y1="27" x2="48" y2="63" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FEF08A" />
            <stop offset="0.55" stopColor="#FACC15" />
            <stop offset="1" stopColor="#B45309" />
          </linearGradient>
          <linearGradient id="ringGoldB" x1="32" y1="27" x2="68" y2="63" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FDE047" />
            <stop offset="0.55" stopColor="#F59E0B" />
            <stop offset="1" stopColor="#92400E" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // Trophy icon option
  return <GoldenTrophySvg className={className} />;
}

function GoldenTrophySvg({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 72 80" fill="none" className={className} aria-hidden="true">
      {/* Left & Right Handles */}
      <path
        d="M21 16H11C11 30 16 39 24 41"
        stroke="#FACC15"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M51 16H61C61 30 56 39 48 41"
        stroke="#F59E0B"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Cup Body */}
      <path
        d="M19 10H53L49 38C47.5 47 43 52 36 52C29 52 24.5 47 23 38L19 10Z"
        fill="url(#trophyGold)"
        stroke="#FEF08A"
        strokeWidth="2"
      />
      {/* Specular gleam */}
      <path d="M27 16L29 38" stroke="#FFFBEB" strokeWidth="3" strokeLinecap="round" opacity="0.65" />
      {/* Stem */}
      <rect x="32" y="51" width="8" height="12" rx="2" fill="#D97706" />
      {/* Wooden Pedestal Base */}
      <path d="M22 63H50L54 74H18L22 63Z" fill="#451A03" stroke="#FACC15" strokeWidth="1.8" />
      <rect x="27" y="66.5" width="18" height="4" rx="1" fill="#FACC15" />
      <defs>
        <linearGradient id="trophyGold" x1="19" y1="10" x2="53" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FEF08A" />
          <stop offset="0.45" stopColor="#FACC15" />
          <stop offset="0.82" stopColor="#D97706" />
          <stop offset="1" stopColor="#92400E" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function BottomBannerFrame({
  theme,
  title,
  subtitle,
  icon,
  titleColor,
  subtitleColor,
  showTrophy = true,
  showBrandLogo = false,
  customLogoUrl = '',
  animated = true,
  variant = 'studio',
}: BottomBannerFrameProps) {
  const cfg = BANNER_THEMES[theme] ?? BANNER_THEMES.theme1;
  const resolvedTitleColor = titleColor || cfg.defaultTitleColor;
  const resolvedSubtitleColor = subtitleColor || cfg.defaultSubtitleColor;
  const hasCustomLogo = Boolean(showBrandLogo && customLogoUrl);

  const isMini = variant === 'mini';
  const isOutput = variant === 'output';

  return (
    <div
      className={`relative w-full overflow-hidden shadow-[0_-6px_28px_rgba(0,0,0,0.65)] ${
        animated ? 'banner-strip-animated' : ''
      } ${
        isMini
          ? 'px-1.5 py-1.5'
          : isOutput
            ? 'px-[1.2vw] py-[0.85vh] border-t-2 border-[#FACC15]/70'
            : 'px-2.5 sm:px-3.5 py-2 border-t border-[#FACC15]/70'
      }`}
      style={{ backgroundImage: cfg.stripGradientCss }}
    >
      {/* Animated Broadcast Light Sheen Sweep */}
      {animated && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/22 to-transparent banner-sheen-animated"
        />
      )}

      {/* Subtle Bottom Accent Hairline */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-[#FACC15]/25 via-[#FACC15] to-[#FACC15]/25"
      />

      <div
        className={`relative z-10 flex items-center ${
          isMini ? 'gap-1.5' : isOutput ? 'gap-[1.05vw]' : 'gap-2.5 sm:gap-3.5'
        }`}
      >
        {/* Far Left Sport / Event Mascot Emblem */}
        {icon !== 'none' && (
          <LeftEventEmblem
            icon={icon}
            className={`shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.65)] ${
              isMini
                ? 'w-5 h-5'
                : isOutput
                  ? 'w-[clamp(48px,4.8vw,92px)] h-[clamp(48px,4.8vw,92px)]'
                  : 'w-8 h-8 sm:w-11 sm:h-11'
            }`}
          />
        )}

        {/* Left Rounded Capsule Border Box — Primary Tournament / Event Title */}
        <div
          className={`flex-[1.35] min-w-0 flex items-center justify-center text-center shadow-inner ${
            isMini
              ? 'rounded-lg border px-2 py-1'
              : isOutput
                ? 'rounded-[1.15vw] border-[3px] px-[1.8vw] py-[1.25vh]'
                : 'rounded-xl border-2 px-3 sm:px-4 py-2'
          }`}
          style={{
            borderColor: cfg.leftBoxBorder,
            backgroundColor: cfg.leftBoxBg,
            boxShadow: animated ? `0 0 18px ${cfg.accentGlow}` : undefined,
          }}
        >
          <p
            className={`font-display font-extrabold truncate leading-normal tracking-normal [word-spacing:0.06em] py-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] ${
              isMini
                ? 'text-[7.5px]'
                : isOutput
                  ? 'text-[clamp(22px,2.3vw,44px)]'
                  : 'text-[11px] sm:text-base md:text-lg'
            }`}
            style={{ color: resolvedTitleColor }}
          >
            {title || 'जय हनुमान क्रिकेट संघ चाहूचीवाडी पर्व ४'}
          </p>
        </div>

        {/* Center Metallic Golden Trophy Divider */}
        {showTrophy && (
          <GoldenTrophySvg
            className={`shrink-0 ${animated ? 'banner-trophy-animated' : ''} ${
              isMini
                ? 'w-4 h-5 -mx-0.5'
                : isOutput
                  ? 'w-[clamp(44px,4.3vw,84px)] h-[clamp(50px,5vw,96px)] -my-[0.5vh]'
                  : 'w-7 h-8 sm:w-10 sm:h-11 -my-1'
            }`}
          />
        )}

        {/* Right Gold-Bordered Secondary Title Bar */}
        <div
          className={`flex-1 min-w-0 flex items-center justify-center text-center ${
            isMini
              ? 'border-y px-2 py-1 rounded-r-md'
              : isOutput
                ? 'border-y-[2.5px] border-r-[2.5px] rounded-r-[0.8vw] px-[1.6vw] py-[1.25vh]'
                : 'border-y border-r rounded-r-lg px-2.5 sm:px-4 py-2'
          }`}
          style={{
            borderColor: cfg.rightBarBorder,
            backgroundColor: cfg.rightBarBg,
          }}
        >
          <p
            className={`font-display font-extrabold truncate leading-normal tracking-normal [word-spacing:0.06em] py-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] ${
              isMini
                ? 'text-[7px]'
                : isOutput
                  ? 'text-[clamp(20px,2.05vw,38px)]'
                  : 'text-[10px] sm:text-sm md:text-base'
            }`}
            style={{ color: resolvedSubtitleColor }}
          >
            {subtitle || 'भव्य टेनिस स्पर्धा २०२६'}
          </p>
        </div>

        {/* Far Right Optional User-Uploaded Custom Logo */}
        {hasCustomLogo && (
          <div
            className={`shrink-0 rounded-full border-2 border-[#FACC15] bg-black/75 overflow-hidden flex items-center justify-center p-1 shadow-[0_4px_14px_rgba(0,0,0,0.7)] ${
              isMini
                ? 'w-6 h-6 p-0.5'
                : isOutput
                  ? 'w-[clamp(54px,5.2vw,100px)] h-[clamp(54px,5.2vw,100px)] p-1.5'
                  : 'w-9 h-9 sm:w-12 sm:h-12'
            }`}
          >
            <img
              src={customLogoUrl}
              alt="Custom overlay logo"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}
