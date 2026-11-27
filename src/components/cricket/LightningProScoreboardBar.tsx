import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ProScoreboardBallDot } from './ProScoreboardBar';
import type {
  ScoreboardBottomNeedInfo,
  ScoreboardPatiBanner,
  TataIplEventBanner,
  TataIplWinnerInfo,
} from './TataIplScoreboardBar';

export interface LightningProScoreboardBarProps {
  batTeamName: string;
  batTeamCode: string;
  batTeamLogo?: string;
  bowlTeamName: string;
  bowlTeamCode: string;
  bowlTeamLogo?: string;
  showTeamLogo?: boolean;
  runs: number;
  wickets: number;
  oversText: string;
  maxOvers: number;
  batter1Name: string;
  batter1Runs?: number | string;
  batter1Balls?: number | string;
  batter2Name: string;
  batter2Runs?: number | string;
  batter2Balls?: number | string;
  strikerIndex?: 1 | 2;
  bowlerName: string;
  bowlerFigs: string;
  bowlerOvers: string;
  balls?: ProScoreboardBallDot[];
  showBalls?: boolean;
  topHoodText: string;
  bottomTickerText: string;
  activeEvent?: TataIplEventBanner | null;
  winnerInfo?: TataIplWinnerInfo | null;
  patiBanner?: ScoreboardPatiBanner | null;
  bottomNeed?: ScoreboardBottomNeedInfo | null;
  compact?: boolean;
}

function formatTwoDigit(val: number | string | undefined): string {
  if (val === undefined || val === '') return '00';
  const num = Number(val);
  if (Number.isFinite(num) && num >= 0 && num < 10) {
    return `0${Math.floor(num)}`;
  }
  return String(val);
}

function resolveLightningEvent(
  type: string,
  batTeamCode: string,
  bowlTeamCode: string,
  strikerName: string,
  bowlerName: string,
  customCaption?: string
): {
  hoodText: string;
  badge: string;
  label: string;
  caption: string;
  bg: string;
  border: string;
  text: string;
  badgeBg: string;
  badgeText: string;
} {
  const normalized = String(type || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (normalized === 'WICKET' || normalized === 'W' || normalized === 'OUT') {
    return {
      hoodText: 'WICKET FALLS',
      badge: bowlTeamCode,
      label: 'WICKET! OUT!',
      caption: customCaption || `${bowlerName} STRIKES`,
      bg: 'linear-gradient(90deg, #08123D 0%, #991B1B 24%, #DC2626 50%, #991B1B 76%, #08123D 100%)',
      border: '#FCA5A5',
      text: '#FFFFFF',
      badgeBg: '#FACC15',
      badgeText: '#09154A',
    };
  }
  if (normalized === 'SIX' || normalized === '6') {
    return {
      hoodText: 'MAXIMUM SIX',
      badge: `${batTeamCode} • 6 RUNS`,
      label: 'SUPER SIX!',
      caption: customCaption || `${strikerName} • MASSIVE HIT`,
      bg: 'linear-gradient(90deg, #001A5C 0%, #7E22CE 24%, #F61A9A 50%, #7E22CE 76%, #001A5C 100%)',
      border: '#F9A8D4',
      text: '#FFFFFF',
      badgeBg: 'linear-gradient(180deg, #FEF08A 0%, #FACC15 100%)',
      badgeText: '#09154A',
    };
  }
  if (normalized === 'FOUR' || normalized === '4') {
    return {
      hoodText: 'BOUNDARY 4',
      badge: `${batTeamCode} • 4 RUNS`,
      label: 'CRACKING FOUR!',
      caption: customCaption || `${strikerName} • SUPER FOUR`,
      bg: 'linear-gradient(90deg, #001040 0%, #0044C7 26%, #0EA5E9 50%, #0044C7 74%, #001040 100%)',
      border: '#7DD3FC',
      text: '#FFFFFF',
      badgeBg: 'linear-gradient(180deg, #FEF08A 0%, #FACC15 100%)',
      badgeText: '#09154A',
    };
  }
  if (normalized === 'NOBALL' || normalized === 'NB') {
    return {
      hoodText: 'NO BALL +1',
      badge: 'FREE HIT NEXT',
      label: 'NO BALL!',
      caption: customCaption || `${bowlerName} OVERSTEPPED • ${strikerName}`,
      bg: 'linear-gradient(90deg, #001A5C 0%, #B45309 24%, #F59E0B 50%, #B45309 76%, #001A5C 100%)',
      border: '#FEF08A',
      text: '#FFFFFF',
      badgeBg: '#F61A9A',
      badgeText: '#FFFFFF',
    };
  }
  if (normalized === 'FREEHIT') {
    return {
      hoodText: 'FREE HIT',
      badge: batTeamCode,
      label: 'FREE HIT!',
      caption: customCaption || `${strikerName} ON STRIKE`,
      bg: 'linear-gradient(90deg, #43087A 0%, #D97706 26%, #FACC15 50%, #D97706 74%, #43087A 100%)',
      border: '#FEF9C3',
      text: '#09154A',
      badgeBg: '#09154A',
      badgeText: '#FACC15',
    };
  }
  if (normalized === 'WIDE' || normalized === 'WD' || normalized === 'WIDEBALL') {
    return {
      hoodText: 'WIDE +1',
      badge: 'EXTRA RUN',
      label: 'WIDE BALL!',
      caption: customCaption || `${bowlerName} • RE-BOWL`,
      bg: 'linear-gradient(90deg, #001A5C 0%, #5B21B6 26%, #9333EA 50%, #5B21B6 74%, #001A5C 100%)',
      border: '#E879F9',
      text: '#FFFFFF',
      badgeBg: '#FFFFFF',
      badgeText: '#09154A',
    };
  }
  return {
    hoodText: 'LIVE EVENT',
    badge: batTeamCode,
    label: String(type || 'LIVE').toUpperCase(),
    caption: customCaption || `${batTeamCode} LIVE`,
    bg: 'linear-gradient(90deg, #001A5C 0%, #CC0A7B 50%, #001A5C 100%)',
    border: '#F9A8D4',
    text: '#FFFFFF',
    badgeBg: '#FACC15',
    badgeText: '#09154A',
  };
}

function LightningDivider({ uid, flip = false }: { uid: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 28 74"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="h-full w-[22px] shrink-0 -mx-[10px] relative z-20 pointer-events-none"
      style={{
        transform: flip ? 'scaleX(-1)' : undefined,
        filter: 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.7))',
      }}
    >
      <defs>
        <linearGradient id={`boltGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="42%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
      </defs>
      <polygon
        points="21,0 27,0 16,32 23,32 7,74 1,74 13,40 6,40"
        fill={`url(#boltGrad-${uid})`}
      />
    </svg>
  );
}

export function LightningProScoreboardBar({
  batTeamName,
  batTeamCode,
  batTeamLogo,
  bowlTeamName,
  bowlTeamCode,
  bowlTeamLogo,
  showTeamLogo = false,
  runs,
  wickets,
  oversText,
  maxOvers,
  batter1Name,
  batter1Runs,
  batter1Balls,
  batter2Name,
  batter2Runs,
  batter2Balls,
  strikerIndex = 1,
  bowlerName,
  bowlerFigs,
  bowlerOvers,
  balls = [],
  showBalls = true,
  topHoodText,
  bottomTickerText,
  activeEvent = null,
  winnerInfo = null,
  patiBanner = null,
  bottomNeed = null,
  compact = false,
}: LightningProScoreboardBarProps) {
  const uid = useId().replace(/:/g, '');
  const outerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  const BASE_WIDTH = 1120;
  const BASE_HEIGHT = 104;

  useLayoutEffect(() => {
    if (!compact) {
      setScale(1);
      return;
    }
    const el = outerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) {
        setScale(Math.min(1, w / BASE_WIDTH));
      }
    };
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [compact]);

  const [scoreFlash, setScoreFlash] = useState(false);
  const prevScoreRef = useRef(`${runs}-${wickets}`);
  useEffect(() => {
    const key = `${runs}-${wickets}`;
    if (prevScoreRef.current !== key) {
      prevScoreRef.current = key;
      setScoreFlash(true);
      const t = window.setTimeout(() => setScoreFlash(false), 380);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [runs, wickets]);

  const cleanBatName = (batTeamName || batTeamCode || 'TEAM A').trim().toUpperCase();
  const cleanBatCode = (batTeamCode || 'TMA').trim().toUpperCase();
  const cleanBowlName = (bowlTeamName || bowlTeamCode || 'TEAM B').trim().toUpperCase();
  const cleanBowlCode = (bowlTeamCode || 'TMB').trim().toUpperCase();
  const strikerName = (strikerIndex === 1 ? batter1Name : batter2Name) || 'BATTER';

  const effectiveBanner: ScoreboardPatiBanner | null =
    patiBanner ??
    (winnerInfo
      ? {
          kind: 'WINNER',
          badge: winnerInfo.badge,
          headline: winnerInfo.headline,
          subline: winnerInfo.summaryLine,
        }
      : null);
  const effectiveShowLogo = Boolean(showTeamLogo || effectiveBanner?.forceShowLogos);

  const eventPreset = activeEvent
    ? resolveLightningEvent(
        activeEvent.type,
        cleanBatCode,
        cleanBowlCode,
        strikerName.toUpperCase(),
        (bowlerName || 'BOWLER').toUpperCase(),
        activeEvent.caption
      )
    : null;
  const visibleBalls = showBalls ? balls.slice(-6) : [];
  const totalBallSlots = Math.max(6, visibleBalls.length);

  const content = (
    <div
      className="mx-auto select-none relative"
      style={{
        width: compact ? `${BASE_WIDTH}px` : '100%',
        maxWidth: compact ? `${BASE_WIDTH}px` : '1180px',
        height: `${BASE_HEIGHT}px`,
        fontFamily: '"Roboto Condensed", "Oswald", var(--font-display), sans-serif',
      }}
    >
      {/* ================= TOP CENTER PURPLE TARGET / STATUS HOOD ================= */}
      <div className="flex items-end justify-center h-[28px] relative z-20 -mb-[2px]">
        {/* Left stepped purple ear */}
        <div
          aria-hidden="true"
          className="h-[13px] w-[18px] -mr-[6px]"
          style={{
            background: 'linear-gradient(180deg, #7E22CE 0%, #3B0764 100%)',
            clipPath: 'polygon(38% 0%, 100% 0%, 100% 100%, 0% 100%)',
            borderTop: '1.5px solid #E879F9',
          }}
        />
        {/* Main central purple trapezoid hood */}
        <div
          className="relative px-7 h-[27px] flex items-center justify-center shadow-lg"
          style={{
            minWidth: '172px',
            background: 'linear-gradient(180deg, #6B12B8 0%, #43087A 52%, #240347 100%)',
            clipPath: 'polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%)',
            boxShadow: 'inset 0 2px 0 rgba(240, 171, 252, 0.7)',
          }}
        >
          <span
            className="font-black uppercase tracking-wider text-white whitespace-nowrap tabular-nums"
            style={{
              fontSize: '15px',
              lineHeight: 1,
              textShadow: '0 1px 4px rgba(0,0,0,0.65)',
            }}
          >
            {eventPreset
              ? eventPreset.hoodText
              : effectiveBanner
                ? effectiveBanner.badge
                : topHoodText}
          </span>
        </div>
        {/* Right stepped purple ear */}
        <div
          aria-hidden="true"
          className="h-[13px] w-[18px] -ml-[6px]"
          style={{
            background: 'linear-gradient(180deg, #7E22CE 0%, #3B0764 100%)',
            clipPath: 'polygon(0% 0%, 62% 0%, 100% 100%, 0% 100%)',
            borderTop: '1.5px solid #E879F9',
          }}
        />
      </div>

      {/* ================= MAIN HEXAGONAL CHEVRON FRAME ================= */}
      <div
        className="relative w-full h-[76px] p-[3px]"
        style={{
          background:
            'linear-gradient(180deg, #091344 0%, #1E1B4B 48%, #9333EA 82%, #D946EF 100%)',
          clipPath:
            'polygon(22px 0%, calc(100% - 22px) 0%, 100% 50%, calc(100% - 22px) 100%, 22px 100%, 0% 50%)',
          boxShadow: '0 8px 26px rgba(15, 23, 42, 0.55)',
        }}
      >
        <div
          className="relative w-full h-full flex items-stretch overflow-hidden"
          style={{
            background: '#08123D',
            clipPath:
              'polygon(20px 0%, calc(100% - 20px) 0%, 100% 50%, calc(100% - 20px) 100%, 20px 100%, 0% 50%)',
          }}
        >
          {/* Full-width Animated Event Stinger Overlay inside Hexagonal Chevron */}
          {eventPreset && (
            <div
              key={activeEvent?.id}
              className="absolute inset-0 z-30 flex items-center justify-center gap-4 px-10 overflow-hidden"
              style={{
                background: eventPreset.bg,
                borderTop: `2px solid ${eventPreset.border}`,
                borderBottom: `2px solid ${eventPreset.border}`,
                color: eventPreset.text,
              }}
              role="status"
              aria-live="polite"
            >
              <span
                className="px-3 py-1 rounded font-black uppercase tracking-wider shrink-0 shadow-md"
                style={{
                  background: eventPreset.badgeBg,
                  color: eventPreset.badgeText,
                  fontSize: '13px',
                }}
              >
                {eventPreset.badge}
              </span>
              <span
                className="font-black italic uppercase tracking-widest shrink-0"
                style={{
                  fontSize: '30px',
                  lineHeight: 1,
                  textShadow:
                    eventPreset.text === '#09154A'
                      ? '0 1px 0 rgba(255,255,255,0.5)'
                      : '0 3px 10px rgba(0,0,0,0.6)',
                }}
              >
                {eventPreset.label}
              </span>
              <span
                className="px-3 py-1 rounded font-extrabold uppercase tracking-wide truncate"
                style={{
                  background: 'rgba(8, 18, 61, 0.55)',
                  border: '1px solid rgba(250, 204, 21, 0.45)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                }}
              >
                {eventPreset.caption}
              </span>
            </div>
          )}

          {/* 1. FAR LEFT WHITE WING: BATTING TEAM NAME */}
          <div
            className="w-[156px] shrink-0 flex items-center justify-center pl-6 pr-3 relative overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 56%, #DCE4F0 100%)',
            }}
          >
            {effectiveShowLogo && batTeamLogo ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <img
                  src={batTeamLogo}
                  alt={cleanBatCode}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover border border-slate-300 shrink-0"
                />
                <span
                  className="font-black uppercase tracking-tight truncate"
                  style={{
                    color: '#09154A',
                    fontSize: cleanBatName.length > 10 ? '14px' : '17px',
                    lineHeight: 1.05,
                  }}
                >
                  {cleanBatName}
                </span>
              </div>
            ) : (
              <span
                className="font-black uppercase tracking-tight text-center leading-tight line-clamp-2"
                style={{
                  color: '#09154A',
                  fontSize:
                    cleanBatName.length > 12
                      ? '16px'
                      : cleanBatName.length > 8
                        ? '19px'
                        : '22px',
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                }}
              >
                {cleanBatName}
              </span>
            )}
          </div>

          <LightningDivider uid={`${uid}-1`} />

          {effectiveBanner ? (
            <div
              className="flex-1 min-w-0 flex flex-col justify-between overflow-hidden relative"
              style={{
                background:
                  effectiveBanner.kind === 'HIGHLIGHT'
                    ? 'linear-gradient(180deg, #43087A 0%, #002882 48%, #001040 100%)'
                    : 'linear-gradient(180deg, #0044C7 0%, #002882 44%, #001A5C 52%, #001040 100%)',
              }}
              role="status"
              aria-live="polite"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-sky-300/80 to-transparent"
              />
              {/* Upper Headline Row */}
              <div className="flex-1 flex items-center justify-center gap-4 px-6 overflow-hidden">
                {effectiveBanner.kind === 'VERSUS' ? (
                  <>
                    <span className="font-black uppercase italic text-white text-[22px] tracking-wide truncate">
                      {effectiveBanner.leftTeamName || cleanBatName}
                    </span>
                    <span
                      className="px-4 py-1 rounded-md font-black italic uppercase text-white text-[18px] tracking-wider shrink-0 shadow-md"
                      style={{
                        background:
                          'linear-gradient(180deg, #F61A9A 0%, #CC0A7B 55%, #8E0456 100%)',
                        clipPath: 'polygon(0% 0%, 100% 0%, 90% 100%, 10% 100%)',
                      }}
                    >
                      VS
                    </span>
                    <span className="font-black uppercase italic text-white text-[22px] tracking-wide truncate">
                      {effectiveBanner.rightTeamName || cleanBowlName}
                    </span>
                  </>
                ) : (
                  <>
                    {effectiveBanner.kind === 'WINNER' && <span aria-hidden="true">🏆</span>}
                    <span
                      className="px-3 py-0.5 rounded font-black uppercase tracking-wider shrink-0 shadow-sm"
                      style={{
                        background:
                          effectiveBanner.kind === 'WINNER' || effectiveBanner.kind === 'HIGHLIGHT'
                            ? 'linear-gradient(180deg, #FEF08A 0%, #FACC15 100%)'
                            : 'linear-gradient(180deg, #F61A9A 0%, #CC0A7B 100%)',
                        color:
                          effectiveBanner.kind === 'WINNER' || effectiveBanner.kind === 'HIGHLIGHT'
                            ? '#09154A'
                            : '#FFFFFF',
                        fontSize: '12px',
                      }}
                    >
                      {effectiveBanner.badge}
                    </span>
                    <span
                      className="font-black uppercase italic tracking-wide truncate"
                      style={{
                        color: effectiveBanner.kind === 'WINNER' ? '#FACC15' : '#FFFFFF',
                        fontSize: '21px',
                        lineHeight: 1.1,
                      }}
                    >
                      {effectiveBanner.headline}
                    </span>
                    {effectiveBanner.kind === 'WINNER' && <span aria-hidden="true">🏆</span>}
                  </>
                )}
              </div>

              {/* Lower Pearl-White Ticker Row with Magenta Accent Slashes */}
              <div
                className="h-[22px] flex items-center justify-center gap-2 px-4 shrink-0"
                style={{
                  background: 'linear-gradient(180deg, #FFFFFF 0%, #E2E8F0 100%)',
                }}
              >
                <span
                  aria-hidden="true"
                  className="inline-block w-[4px] h-[13px] shrink-0 rounded-[1px]"
                  style={{ background: '#D946EF', transform: 'skewX(22deg)' }}
                />
                <span
                  className="font-black uppercase tracking-wide truncate"
                  style={{ color: '#09154A', fontSize: '13px', lineHeight: 1 }}
                >
                  {effectiveBanner.subline || bottomTickerText}
                </span>
                <span
                  aria-hidden="true"
                  className="inline-block w-[4px] h-[13px] shrink-0 rounded-[1px]"
                  style={{ background: '#D946EF', transform: 'skewX(-22deg)' }}
                />
              </div>
            </div>
          ) : (
            <>
          {/* 2. LEFT-CENTER ROYAL BLUE METALLIC PANEL: BATTERS */}
          <div
            className="flex-1 min-w-[235px] flex flex-col justify-center px-5 relative overflow-hidden"
            style={{
              background:
                'linear-gradient(180deg, #0044C7 0%, #002882 44%, #001A5C 52%, #001040 100%)',
            }}
          >
            {/* Glossy top sheen */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-sky-300/80 to-transparent"
            />
            {winnerInfo ? (
              <div className="flex items-center justify-center text-center px-2">
                <span className="font-black uppercase italic text-[#FACC15] text-[18px] tracking-wide truncate">
                  {winnerInfo.headline}
                </span>
              </div>
            ) : (
              <>
                {/* Batter 1 */}
                <div className="flex items-center justify-between gap-2 h-[33px] border-b border-sky-400/35">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Slanted Electric Cyan Bat Strike Indicator */}
                    <span
                      aria-hidden="true"
                      className="inline-block w-[16px] h-[5px] rounded-full shrink-0"
                      style={{
                        transform: 'rotate(-42deg)',
                        background:
                          strikerIndex === 1
                            ? 'linear-gradient(90deg, #7DD3FC 0%, #0EA5E9 100%)'
                            : 'transparent',
                        boxShadow:
                          strikerIndex === 1 ? '0 0 8px rgba(56, 189, 248, 0.95)' : 'none',
                      }}
                    />
                    <span
                      className="font-black uppercase italic text-white truncate tracking-wide"
                      style={{ fontSize: '19px', lineHeight: 1 }}
                    >
                      {batter1Name}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2.5 shrink-0 tabular-nums">
                    <span
                      className="font-black"
                      style={{ color: '#FACC15', fontSize: '21px', lineHeight: 1 }}
                    >
                      {formatTwoDigit(batter1Runs)}
                    </span>
                    <span
                      className="font-extrabold text-white/95"
                      style={{ fontSize: '14px', lineHeight: 1 }}
                    >
                      {formatTwoDigit(batter1Balls)}
                    </span>
                  </div>
                </div>

                {/* Batter 2 */}
                <div className="flex items-center justify-between gap-2 h-[33px]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      aria-hidden="true"
                      className="inline-block w-[16px] h-[5px] rounded-full shrink-0"
                      style={{
                        transform: 'rotate(-42deg)',
                        background:
                          strikerIndex === 2
                            ? 'linear-gradient(90deg, #7DD3FC 0%, #0EA5E9 100%)'
                            : 'transparent',
                        boxShadow:
                          strikerIndex === 2 ? '0 0 8px rgba(56, 189, 248, 0.95)' : 'none',
                      }}
                    />
                    <span
                      className="font-black uppercase italic text-white/95 truncate tracking-wide"
                      style={{ fontSize: '19px', lineHeight: 1 }}
                    >
                      {batter2Name}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2.5 shrink-0 tabular-nums">
                    <span
                      className="font-black"
                      style={{ color: '#FACC15', fontSize: '21px', lineHeight: 1 }}
                    >
                      {formatTwoDigit(batter2Runs)}
                    </span>
                    <span
                      className="font-extrabold text-white/95"
                      style={{ fontSize: '14px', lineHeight: 1 }}
                    >
                      {formatTwoDigit(batter2Balls)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          <LightningDivider uid={`${uid}-2`} flip />

          {/* 3. CENTER PEARL-WHITE SCORE & MAGENTA SCORE PILL PANEL */}
          <div
            className="w-[332px] shrink-0 flex flex-col justify-between px-4 py-[3px] relative overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 58%, #E2E8F0 100%)',
            }}
          >
            {/* Upper Row: Team v Team | Magenta Score Pill | Overs (MaxOvers) */}
            <div className="flex items-center justify-between gap-2 h-[42px]">
              <span
                className="font-black uppercase tracking-tight whitespace-nowrap"
                style={{ color: '#09154A', fontSize: '16px', lineHeight: 1 }}
              >
                {cleanBatCode.slice(0, 5)} v {cleanBowlCode.slice(0, 5)}
              </span>

              {/* Iconic Hot-Pink / Magenta Tapered Score Badge */}
              <div
                className={`px-4 h-[38px] flex items-center justify-center rounded-md transition-transform duration-200 ${
                  scoreFlash ? 'scale-105' : 'scale-100'
                }`}
                style={{
                  minWidth: '118px',
                  background:
                    'linear-gradient(180deg, #F61A9A 0%, #CC0A7B 55%, #8E0456 100%)',
                  clipPath: 'polygon(0% 0%, 100% 0%, 92% 100%, 8% 100%)',
                  boxShadow:
                    '0 3px 10px rgba(219, 39, 119, 0.45), inset 0 1.5px 0 rgba(255,255,255,0.45)',
                }}
              >
                <span
                  className="font-black text-white tabular-nums tracking-tight whitespace-nowrap"
                  style={{
                    fontSize: '27px',
                    lineHeight: 1,
                    textShadow: '0 2px 4px rgba(0,0,0,0.4)',
                  }}
                >
                  {runs} - {wickets}
                </span>
              </div>

              <span
                className="font-black tabular-nums whitespace-nowrap"
                style={{ color: '#09154A', fontSize: '16px', lineHeight: 1 }}
              >
                {oversText} ({maxOvers})
              </span>
            </div>

            {/* Lower Row: Slanted Magenta Accent Slashes + Need / Info Ticker */}
            <div className="h-[22px] flex items-center justify-center gap-2 border-t border-slate-200/80 px-1">
              <span
                aria-hidden="true"
                className="inline-block w-[4px] h-[14px] shrink-0 rounded-[1px]"
                style={{
                  background: '#D946EF',
                  transform: 'skewX(22deg)',
                }}
              />
              <span
                className="font-black uppercase tracking-wide truncate tabular-nums"
                style={{ color: '#0B154A', fontSize: '13.5px', lineHeight: 1 }}
              >
                {winnerInfo ? winnerInfo.summaryLine : bottomTickerText}
              </span>
              <span
                aria-hidden="true"
                className="inline-block w-[4px] h-[14px] shrink-0 rounded-[1px]"
                style={{
                  background: '#D946EF',
                  transform: 'skewX(-22deg)',
                }}
              />
            </div>
          </div>

          <LightningDivider uid={`${uid}-3`} />

          {/* 4. RIGHT-CENTER ROYAL BLUE METALLIC PANEL: BOWLER & OVER BALLS OR OVERSIZED BOTTOM NEED */}
          <div
            className={`flex-1 min-w-[235px] flex flex-col justify-center relative overflow-hidden ${
              bottomNeed ? 'px-3' : 'px-5'
            }`}
            style={{
              background:
                'linear-gradient(180deg, #0044C7 0%, #002882 44%, #001A5C 52%, #001040 100%)',
            }}
          >
            {/* Glossy top sheen */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-sky-300/80 to-transparent"
            />
            {bottomNeed ? (
              <div
                className="w-full h-full flex items-center justify-between tabular-nums"
                aria-label={`${bottomNeed.runsValue} ${bottomNeed.middleTop} ${bottomNeed.middleBottom} ${bottomNeed.ballsValue} ${bottomNeed.rightLabel}`}
              >
                <div className="flex-1 flex items-center justify-center px-1">
                  <span
                    className="font-black italic leading-none tracking-tight"
                    style={{
                      color: '#FACC15',
                      fontSize: '36px',
                      textShadow: '0 2px 10px rgba(250, 204, 21, 0.45)',
                    }}
                  >
                    {bottomNeed.runsValue}
                  </span>
                </div>
                <div
                  aria-hidden="true"
                  className="h-[68%] w-[2px] shrink-0"
                  style={{ background: 'rgba(125, 211, 252, 0.55)' }}
                />
                <div className="flex flex-col items-center justify-center px-2 leading-none shrink-0">
                  <span
                    className="font-black uppercase tracking-wider text-white"
                    style={{ fontSize: '12px', lineHeight: 1.12 }}
                  >
                    {bottomNeed.middleTop}
                  </span>
                  <span
                    className="font-black uppercase tracking-wider text-sky-200"
                    style={{ fontSize: '12px', lineHeight: 1.12 }}
                  >
                    {bottomNeed.middleBottom}
                  </span>
                </div>
                <div
                  aria-hidden="true"
                  className="h-[68%] w-[2px] shrink-0"
                  style={{ background: 'rgba(125, 211, 252, 0.55)' }}
                />
                <div className="flex-1 flex items-center justify-center px-1">
                  <span
                    className="font-black italic leading-none tracking-tight"
                    style={{
                      color: '#FACC15',
                      fontSize: '36px',
                      textShadow: '0 2px 10px rgba(250, 204, 21, 0.45)',
                    }}
                  >
                    {bottomNeed.ballsValue}
                  </span>
                </div>
                <div
                  aria-hidden="true"
                  className="h-[68%] w-[2px] shrink-0"
                  style={{ background: 'rgba(125, 211, 252, 0.55)' }}
                />
                <div className="flex items-center justify-center pl-2.5 pr-1 shrink-0">
                  <span
                    className="font-black uppercase tracking-wider text-white"
                    style={{ fontSize: '15px', lineHeight: 1 }}
                  >
                    {bottomNeed.rightLabel}
                  </span>
                </div>
              </div>
            ) : (
              <>
            {/* Top Row: Bowler Name + Figures + Overs */}
            <div className="flex items-center justify-between gap-2 h-[33px] border-b border-sky-400/35">
              <span
                className="font-black uppercase italic text-white truncate tracking-wide"
                style={{ fontSize: '19px', lineHeight: 1 }}
              >
                {bowlerName}
              </span>
              <div className="flex items-baseline gap-2 shrink-0 tabular-nums">
                <span
                  className="font-black whitespace-nowrap"
                  style={{ color: '#FACC15', fontSize: '20px', lineHeight: 1 }}
                >
                  {bowlerFigs}
                </span>
                <span
                  className="font-extrabold text-white/95 whitespace-nowrap"
                  style={{ fontSize: '14px', lineHeight: 1 }}
                >
                  {bowlerOvers}
                </span>
              </div>
            </div>

            {/* Bottom Row: Glowing Neon-Blue Over Ball Circles */}
            <div className="flex items-center gap-2 h-[33px]">
              {Array.from({ length: totalBallSlots }).map((_, idx) => {
                const ball = visibleBalls[idx];
                if (!ball) {
                  return (
                    <span
                      key={`empty-ball-${idx}`}
                      className="inline-flex items-center justify-center rounded-full shrink-0"
                      style={{
                        width: '21px',
                        height: '21px',
                        border: '2px solid #38BDF8',
                        background: 'rgba(2, 132, 199, 0.14)',
                        boxShadow: 'inset 0 0 4px rgba(56, 189, 248, 0.45)',
                      }}
                    />
                  );
                }

                const raw = String(ball.label || '0').trim().toUpperCase();
                const isDot = raw === '•' || raw === '0' || raw === '.';
                const isWicket = Boolean(ball.isWicket) || raw === 'W' || raw.startsWith('W+');
                const isSix = !isWicket && Boolean(ball.isBoundary6);
                const isFour = !isWicket && !isSix && Boolean(ball.isBoundary4);

                let bg = 'radial-gradient(circle at 35% 30%, #38BDF8 0%, #0284C7 65%, #0369A1 100%)';
                let border = '1.5px solid #7DD3FC';
                let color = '#FFFFFF';
                let glow = '0 0 7px rgba(56, 189, 248, 0.75)';

                if (isWicket) {
                  bg = 'radial-gradient(circle at 35% 30%, #38BDF8 0%, #2563EB 60%, #1D4ED8 100%)';
                  border = '1.8px solid #BAE6FD';
                  color = '#FFFFFF';
                  glow = '0 0 8px rgba(56, 189, 248, 0.9)';
                } else if (isSix) {
                  bg = 'radial-gradient(circle at 35% 30%, #F472B6 0%, #DB2777 65%, #9D174D 100%)';
                  border = '1.8px solid #FBCFE8';
                  color = '#FFFFFF';
                  glow = '0 0 8px rgba(244, 114, 182, 0.85)';
                } else if (isFour) {
                  bg = 'radial-gradient(circle at 35% 30%, #FDE047 0%, #EAB308 68%, #CA8A04 100%)';
                  border = '1.8px solid #FEF08A';
                  color = '#09090B';
                  glow = '0 0 8px rgba(250, 204, 21, 0.85)';
                }

                return (
                  <span
                    key={ball.id}
                    className="inline-flex items-center justify-center rounded-full font-black leading-none shrink-0 tabular-nums"
                    style={{
                      minWidth: '21px',
                      height: '21px',
                      padding: raw.length > 1 ? '0 4px' : undefined,
                      background: bg,
                      border,
                      color,
                      boxShadow: glow,
                      fontSize: raw.length > 2 ? '9px' : raw.length === 2 ? '10px' : '12px',
                    }}
                  >
                    {isDot ? '' : raw}
                  </span>
                );
              })}
            </div>
              </>
            )}
          </div>
            </>
          )}

          <LightningDivider uid={`${uid}-4`} flip />

          {/* 5. FAR RIGHT WHITE WING: BOWLING TEAM NAME + SHORT CODE */}
          <div
            className="w-[152px] shrink-0 flex flex-col items-center justify-center pl-3 pr-6 relative overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 56%, #DCE4F0 100%)',
            }}
          >
            {effectiveShowLogo && bowlTeamLogo ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="min-w-0 text-right">
                  <div
                    className="font-black uppercase tracking-tight truncate"
                    style={{ color: '#09154A', fontSize: '15px', lineHeight: 1.05 }}
                  >
                    {cleanBowlName}
                  </div>
                  <div
                    className="font-extrabold uppercase tracking-wider"
                    style={{ color: '#1E293B', fontSize: '11px', lineHeight: 1.1 }}
                  >
                    {cleanBowlCode}
                  </div>
                </div>
                <img
                  src={bowlTeamLogo}
                  alt={cleanBowlCode}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover border border-slate-300 shrink-0"
                />
              </div>
            ) : (
              <>
                <span
                  className="font-black uppercase tracking-tight text-center truncate max-w-full"
                  style={{
                    color: '#09154A',
                    fontSize: cleanBowlName.length > 10 ? '16px' : '19px',
                    lineHeight: 1.05,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {cleanBowlName}
                </span>
                <span
                  className="font-extrabold uppercase tracking-wider mt-0.5"
                  style={{ color: '#1E293B', fontSize: '13px', lineHeight: 1 }}
                >
                  {cleanBowlCode}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (!compact) {
    return <div className="w-full">{content}</div>;
  }

  return (
    <div
      ref={outerRef}
      className="w-full overflow-hidden flex justify-center"
      style={{ height: `${Math.ceil(BASE_HEIGHT * scale)}px` }}
    >
      <div
        style={{
          width: `${BASE_WIDTH}px`,
          height: `${BASE_HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          flexShrink: 0,
        }}
      >
        {content}
      </div>
    </div>
  );
}
