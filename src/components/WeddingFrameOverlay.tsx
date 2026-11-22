import { WeddingBottomAnimation } from '../types/overlay';
import { shadeHexColor } from './KabaddiScoreboardBar';

export interface WeddingFrameOverlayProps {
  variant: 'mini' | 'studio' | 'output';
  groomName?: string;
  brideName?: string;
  connector?: string;
  eventLabel?: string;
  dateVenue?: string;
  topHeader?: string;
  primaryColor?: string;
  accentColor?: string;
  textColor?: string;
  bottomAnim?: WeddingBottomAnimation;
  showTopHeader?: boolean;
  showCornerFrame?: boolean;
}

export const WEDDING_COLOR_PRESETS: Array<{
  id: string;
  label: string;
  primary: string;
  accent: string;
  text: string;
}> = [
  { id: 'royal-maroon', label: 'Royal Maroon', primary: '#6B0F26', accent: '#F5C542', text: '#FFFFFF' },
  { id: 'peacock-emerald', label: 'Peacock Green', primary: '#0B4635', accent: '#F4C95D', text: '#FFFFFF' },
  { id: 'royal-navy', label: 'Royal Navy', primary: '#132559', accent: '#FACC15', text: '#FFFFFF' },
  { id: 'rose-crimson', label: 'Rose Crimson', primary: '#881337', accent: '#FDE68A', text: '#FFFBEB' },
  { id: 'velvet-purple', label: 'Velvet Plum', primary: '#4C1D5F', accent: '#F6C94C', text: '#FFFFFF' },
  { id: 'saffron-gold', label: 'Saffron Gold', primary: '#8A3B08', accent: '#FDE047', text: '#FFFFFF' },
];

function FiligreeCorner({
  accent,
  sizeClass,
  positionClass,
  flipX = false,
  flipY = false,
}: {
  accent: string;
  sizeClass: string;
  positionClass: string;
  flipX?: boolean;
  flipY?: boolean;
}) {
  const transform = `scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`;
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={`pointer-events-none absolute ${positionClass} ${sizeClass}`}
      style={{ transform }}
    >
      {/* Outer royal corner brackets */}
      <path
        d="M6 94 L6 16 Q6 6 16 6 L94 6"
        fill="none"
        stroke={accent}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M15 74 L15 22 Q15 15 22 15 L74 15"
        fill="none"
        stroke={accent}
        strokeOpacity="0.65"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Delicate Indian floral paisley curl */}
      <path
        d="M16 16 C28 16 32 24 26 31 C22 36 16 32 18 26 C20 21 27 21 31 27 C36 34 45 25 52 16"
        fill="none"
        stroke={accent}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeOpacity="0.88"
      />
      <path
        d="M16 16 C16 28 24 32 31 26 C36 22 32 16 26 18 C21 20 21 27 27 31 C34 36 25 45 16 52"
        fill="none"
        stroke={accent}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeOpacity="0.88"
      />
      {/* Corner lotus jewel dot */}
      <circle cx="15" cy="15" r="4" fill={accent} />
      <circle cx="38" cy="15" r="2" fill={accent} fillOpacity="0.85" />
      <circle cx="15" cy="38" r="2" fill={accent} fillOpacity="0.85" />
    </svg>
  );
}

const SOFT_SPARKS = [
  { left: '12%', delay: '0s', size: 4 },
  { left: '26%', delay: '1.1s', size: 3 },
  { left: '41%', delay: '2.2s', size: 4 },
  { left: '59%', delay: '0.7s', size: 3.5 },
  { left: '74%', delay: '1.8s', size: 4 },
  { left: '88%', delay: '2.9s', size: 3 },
];

export function WeddingFrameOverlay({
  variant,
  groomName = 'चि. रोहित',
  brideName = 'चि. सौ. कां. प्रिया',
  connector = 'व',
  eventLabel = 'शुभ विवाह सोहळा',
  dateVenue = 'थेट प्रक्षेपण • दिनांक व ठिकाण',
  topHeader = '|| श्री गणेशाय नमः ||',
  primaryColor = '#6B0F26',
  accentColor = '#F5C542',
  textColor = '#FFFFFF',
  bottomAnim = 'gentle',
  showTopHeader = true,
  showCornerFrame = true,
}: WeddingFrameOverlayProps) {
  const safePrimary = /^#[0-9a-fA-F]{6}$/.test(primaryColor) ? primaryColor : '#6B0F26';
  const safeAccent = /^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : '#F5C542';
  const safeText = /^#[0-9a-fA-F]{6}$/.test(textColor) ? textColor : '#FFFFFF';

  const darkPrimary = shadeHexColor(safePrimary, -0.42);
  const brightPrimary = shadeHexColor(safePrimary, 0.14);
  const softAccent = shadeHexColor(safeAccent, 0.35);

  const isOutput = variant === 'output';
  const isMini = variant === 'mini';

  const enableBreathe = bottomAnim === 'gentle';
  const enableSheen = bottomAnim === 'gentle' || bottomAnim === 'shimmer';
  const enableSparks = !isMini && (bottomAnim === 'gentle' || bottomAnim === 'petals');
  const enableCrestPulse = bottomAnim !== 'static';

  const cornerSize = isOutput
    ? 'w-[clamp(70px,6vw,120px)] h-[clamp(70px,6vw,120px)]'
    : isMini
      ? 'w-7 h-7'
      : 'w-12 h-12 sm:w-16 sm:h-16';

  const insetPx = isOutput ? 'inset-[1.2vw]' : isMini ? 'inset-1.5' : 'inset-2.5 sm:inset-3';
  const cornerInset = isOutput ? '1.2vw' : isMini ? '0.35rem' : '0.65rem';

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none flex flex-col justify-between">
      {/* Subtle Full-Screen Royal Ornamental Frame Border (Center 100% Transparent!) */}
      {showCornerFrame && (
        <>
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute ${insetPx} rounded-xl`}
            style={{
              border: `${isOutput ? 3 : isMini ? 1.5 : 2}px solid ${safeAccent}CC`,
              boxShadow: `inset 0 0 0 ${isOutput ? 6 : isMini ? 2 : 3}px ${safePrimary}88, inset 0 0 0 ${
                isOutput ? 8 : isMini ? 3 : 4.5
              }px ${safeAccent}55`,
            }}
          />

          <div
            className="pointer-events-none absolute inset-0"
            style={{ padding: cornerInset }}
          >
            <div className="relative w-full h-full">
              <FiligreeCorner accent={safeAccent} sizeClass={cornerSize} positionClass="top-0 left-0" />
              <FiligreeCorner accent={safeAccent} sizeClass={cornerSize} positionClass="top-0 right-0" flipX />
              <FiligreeCorner accent={safeAccent} sizeClass={cornerSize} positionClass="bottom-0 left-0" flipY />
              <FiligreeCorner
                accent={safeAccent}
                sizeClass={cornerSize}
                positionClass="bottom-0 right-0"
                flipX
                flipY
              />
            </div>
          </div>
        </>
      )}

      {/* Optional Top Auspicious Header Plaque */}
      <div
        className={`relative z-10 flex justify-center ${
          isOutput ? 'pt-[2.1vw]' : isMini ? 'pt-2' : 'pt-3.5 sm:pt-4'
        }`}
      >
        {showTopHeader && topHeader.trim() ? (
          <div
            className={`inline-flex items-center gap-2 rounded-full shadow-lg ${
              isOutput
                ? 'px-8 py-1.5 text-[clamp(14px,1.2vw,24px)]'
                : isMini
                  ? 'px-2.5 py-0.5 text-[8px]'
                  : 'px-4 sm:px-5 py-1 text-[10px] sm:text-xs'
            } font-display font-bold tracking-normal`}
            style={{
              background: `linear-gradient(90deg, ${darkPrimary}EE 0%, ${safePrimary}F5 50%, ${darkPrimary}EE 100%)`,
              border: `${isMini ? 1 : 1.5}px solid ${safeAccent}`,
              color: softAccent,
            }}
          >
            <span
              aria-hidden="true"
              className="rounded-full shrink-0"
              style={{
                width: isMini ? 4 : 6,
                height: isMini ? 4 : 6,
                backgroundColor: safeAccent,
              }}
            />
            <span className="truncate max-w-[70vw] leading-normal">{topHeader}</span>
            <span
              aria-hidden="true"
              className="rounded-full shrink-0"
              style={{
                width: isMini ? 4 : 6,
                height: isMini ? 4 : 6,
                backgroundColor: safeAccent,
              }}
            />
          </div>
        ) : (
          <div className="h-1" />
        )}
      </div>

      {/* Clear Transparent Center for Live Camera Feed */}
      <div className="flex-1" aria-hidden="true" />

      {/* Elegant Bottom Wedding Name Frame with Subtle Light Animation */}
      <div
        className={`relative z-10 w-full flex justify-center ${
          isOutput
            ? 'px-[4vw] pb-[2.2vw]'
            : isMini
              ? 'px-3 pb-2'
              : 'px-4 sm:px-8 pb-3.5 sm:pb-4'
        }`}
      >
        <div
          className={`relative w-full ${
            isOutput ? 'max-w-[82vw]' : isMini ? 'max-w-[94%]' : 'max-w-[92%]'
          } ${enableBreathe ? 'wedding-bottom-breathe' : ''}`}
        >
          {/* Delicate floating micro-sparks rising lightly along bottom frame */}
          {enableSparks && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-4 inset-x-6 h-8 overflow-visible"
            >
              {SOFT_SPARKS.map((sp) => (
                <span
                  key={sp.left}
                  className="wedding-soft-spark absolute bottom-0 rounded-full"
                  style={{
                    left: sp.left,
                    width: isOutput ? sp.size * 2 : sp.size,
                    height: isOutput ? sp.size * 2 : sp.size,
                    backgroundColor: softAccent,
                    boxShadow: `0 0 8px ${safeAccent}`,
                    animationDelay: sp.delay,
                  }}
                />
              ))}
            </div>
          )}

          {/* Top decorative center arch ribbon label (Event Label e.g. शुभ विवाह सोहळा) */}
          {eventLabel.trim() && (
            <div className="flex justify-center -mb-2.5 relative z-20">
              <div
                className={`inline-flex items-center gap-1.5 rounded-full font-display font-bold shadow-md ${
                  isOutput
                    ? 'px-7 py-1 text-[clamp(13px,1.08vw,22px)]'
                    : isMini
                      ? 'px-2 py-0.5 text-[7px]'
                      : 'px-3.5 py-0.5 text-[10px] sm:text-xs'
                }`}
                style={{
                  background: `linear-gradient(90deg, ${darkPrimary} 0%, ${brightPrimary} 50%, ${darkPrimary} 100%)`,
                  border: `${isMini ? 1 : 1.5}px solid ${safeAccent}`,
                  color: softAccent,
                }}
              >
                <span className="truncate leading-normal">{eventLabel}</span>
              </div>
            </div>
          )}

          {/* Main Lower Wedding Name Plaque */}
          <div
            className={`relative overflow-hidden shadow-[0_14px_34px_rgba(0,0,0,0.62)] ${
              isOutput
                ? 'rounded-2xl px-10 pt-5 pb-3.5'
                : isMini
                  ? 'rounded-lg px-2.5 pt-2.5 pb-1.5'
                  : 'rounded-xl px-4 sm:px-7 pt-3.5 pb-2.5'
            }`}
            style={{
              background: `linear-gradient(90deg, ${darkPrimary}F2 0%, ${safePrimary}FA 28%, ${brightPrimary}FC 50%, ${safePrimary}FA 72%, ${darkPrimary}F2 100%)`,
              border: `${isOutput ? 2.5 : isMini ? 1 : 2}px solid ${safeAccent}`,
            }}
          >
            {/* Inner delicate gold hairline */}
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute ${
                isOutput ? 'inset-[6px] rounded-xl' : isMini ? 'inset-[2px] rounded-md' : 'inset-[4px] rounded-lg'
              }`}
              style={{
                border: `1px solid ${safeAccent}55`,
              }}
            />

            {/* Soft, light diagonal shimmer glide (subtle!) */}
            {enableSheen && (
              <div
                aria-hidden="true"
                className="wedding-bottom-sheen pointer-events-none absolute inset-y-0 left-0 w-1/4"
                style={{
                  background: `linear-gradient(90deg, transparent, ${softAccent}3A, transparent)`,
                }}
              />
            )}

            {/* Groom & Bride Names Row */}
            <div
              className={`relative z-10 flex items-center justify-center ${
                isOutput ? 'gap-6' : isMini ? 'gap-1.5' : 'gap-2.5 sm:gap-4'
              }`}
            >
              {/* Left Ornamental Flourish */}
              {!isMini && (
                <span
                  aria-hidden="true"
                  className="hidden sm:block h-[1.5px] flex-1 max-w-[90px]"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${safeAccent})`,
                  }}
                />
              )}

              <p
                className={`font-display font-extrabold truncate leading-[1.35] py-0.5 ${
                  isOutput
                    ? 'text-[clamp(24px,2.55vw,48px)]'
                    : isMini
                      ? 'text-[9.5px]'
                      : 'text-sm sm:text-xl md:text-2xl'
                }`}
                style={{
                  color: safeText,
                  textShadow: '0 2px 10px rgba(0,0,0,0.45)',
                }}
              >
                {groomName || 'Groom Name'}
              </p>

              {/* Center Decorative Connector Emblem */}
              <span
                className={`inline-flex items-center justify-center rounded-full font-display font-extrabold shrink-0 shadow-sm ${
                  enableCrestPulse ? 'wedding-crest-pulse' : ''
                } ${
                  isOutput
                    ? 'min-w-[clamp(44px,3.6vw,68px)] h-[clamp(44px,3.6vw,68px)] px-3 text-[clamp(16px,1.4vw,26px)]'
                    : isMini
                      ? 'min-w-[16px] h-[16px] px-1 text-[7px]'
                      : 'min-w-[28px] sm:min-w-[34px] h-[28px] sm:h-[34px] px-2 text-xs sm:text-sm'
                }`}
                style={{
                  background: `radial-gradient(circle at 35% 30%, ${softAccent}, ${safeAccent})`,
                  color: darkPrimary,
                  border: `1.5px solid ${softAccent}`,
                }}
              >
                {connector || 'व'}
              </span>

              <p
                className={`font-display font-extrabold truncate leading-[1.35] py-0.5 ${
                  isOutput
                    ? 'text-[clamp(24px,2.55vw,48px)]'
                    : isMini
                      ? 'text-[9.5px]'
                      : 'text-sm sm:text-xl md:text-2xl'
                }`}
                style={{
                  color: safeText,
                  textShadow: '0 2px 10px rgba(0,0,0,0.45)',
                }}
              >
                {brideName || 'Bride Name'}
              </p>

              {/* Right Ornamental Flourish */}
              {!isMini && (
                <span
                  aria-hidden="true"
                  className="hidden sm:block h-[1.5px] flex-1 max-w-[90px]"
                  style={{
                    background: `linear-gradient(270deg, transparent, ${safeAccent})`,
                  }}
                />
              )}
            </div>

            {/* Date & Venue Subtitle */}
            {dateVenue.trim() && (
              <p
                className={`relative z-10 text-center font-medium truncate leading-normal ${
                  isOutput
                    ? 'mt-1 text-[clamp(13px,1.1vw,21px)]'
                    : isMini
                      ? 'mt-0.5 text-[7px]'
                      : 'mt-0.5 text-[10px] sm:text-xs'
                }`}
                style={{ color: softAccent }}
              >
                {dateVenue}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
