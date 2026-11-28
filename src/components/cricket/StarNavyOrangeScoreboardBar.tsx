import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ProScoreboardBallDot } from './ProScoreboardBar';
import type {
  ScoreboardBottomNeedInfo,
  ScoreboardPatiBanner,
  TataIplEventBanner,
  TataIplWinnerInfo,
} from './TataIplScoreboardBar';

export interface StarNavyOrangeScoreboardBarProps {
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
  inningsNumber?: 1 | 2;
  projectedScore?: number;
  crr: string;
  rrr?: string;
  target?: number | null;
  needRuns?: number | null;
  needBalls?: number | null;
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
  tickerTitle: string;
  activeEvent?: TataIplEventBanner | null;
  winnerInfo?: TataIplWinnerInfo | null;
  patiBanner?: ScoreboardPatiBanner | null;
  bottomNeed?: ScoreboardBottomNeedInfo | null;
  compact?: boolean;
}

function CricketBatIcon({ animate = false }: { animate?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={animate ? 'star-navy-bat-wiggle' : undefined}
      style={{
        width: 17,
        height: 17,
        flexShrink: 0,
        filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5))',
      }}
    >
      <path
        d="M17.8 2.2l4 4-9.8 9.8-1.4 1.4-2.8-2.8 1.4-1.4L17.8 2.2z"
        fill="#f58220"
        stroke="#ffffff"
        strokeWidth="1.2"
      />
      <path
        d="M7.8 14.6L3.2 19.2c-.5.5-.5 1.3 0 1.8.5.5 1.3.5 1.8 0l4.6-4.6"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CricketBallIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.45))',
      }}
    >
      <circle cx="12" cy="12" r="9.5" fill="#e60000" stroke="#ffffff" strokeWidth="1.5" />
      <path
        d="M6.2 7.5c3.2 2.4 8.4 6.6 11.6 9"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeDasharray="2.2 1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function resolveNavyOrangeEvent(
  type: string,
  batTeamCode: string,
  bowlTeamCode: string,
  strikerName: string,
  bowlerName: string,
  customCaption?: string
): {
  badge: string;
  label: string;
  caption: string;
  bg: string;
  accent: string;
  text: string;
  badgeBg: string;
  badgeText: string;
} {
  const normalized = String(type || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  const cleanCaption = customCaption ? customCaption.replace(/!+/g, '').trim() : '';

  if (normalized === 'WICKET' || normalized === 'W' || normalized === 'OUT') {
    return {
      badge: `${bowlTeamCode} STRIKES`,
      label: 'WICKET OUT',
      caption: cleanCaption || `${bowlerName} TAKES A WICKET`,
      bg: 'linear-gradient(90deg, #062049 0%, #991b1b 24%, #e60000 50%, #991b1b 76%, #062049 100%)',
      accent: '#ff6666',
      text: '#ffffff',
      badgeBg: '#f58220',
      badgeText: '#082654',
    };
  }
  if (normalized === 'SIX' || normalized === '6') {
    return {
      badge: `${batTeamCode} • 6 RUNS`,
      label: 'MAXIMUM SIX',
      caption: cleanCaption || `${strikerName} • HUGE SIX`,
      bg: 'linear-gradient(90deg, #062049 0%, #c2410c 24%, #f58220 50%, #c2410c 76%, #062049 100%)',
      accent: '#ffffff',
      text: '#ffffff',
      badgeBg: '#082654',
      badgeText: '#ffffff',
    };
  }
  if (normalized === 'FOUR' || normalized === '4') {
    return {
      badge: `${batTeamCode} • 4 RUNS`,
      label: 'CRACKING FOUR',
      caption: cleanCaption || `${strikerName} • BOUNDARY FOUR`,
      bg: 'linear-gradient(90deg, #062049 0%, #0b3575 24%, #1d4ed8 50%, #0b3575 76%, #062049 100%)',
      accent: '#f58220',
      text: '#ffffff',
      badgeBg: '#f58220',
      badgeText: '#082654',
    };
  }
  if (normalized === 'NOBALL' || normalized === 'NB') {
    return {
      badge: 'FREE HIT NEXT',
      label: 'NO BALL',
      caption: cleanCaption || `${bowlerName} OVERSTEPPED • ${strikerName}`,
      bg: 'linear-gradient(90deg, #062049 0%, #b45309 26%, #f58220 50%, #b45309 74%, #062049 100%)',
      accent: '#fef08a',
      text: '#ffffff',
      badgeBg: '#ffffff',
      badgeText: '#082654',
    };
  }
  if (normalized === 'FREEHIT') {
    return {
      badge: batTeamCode,
      label: 'FREE HIT',
      caption: cleanCaption || `${strikerName} ON STRIKE`,
      bg: 'linear-gradient(90deg, #062049 0%, #ea580c 26%, #f58220 50%, #ea580c 74%, #062049 100%)',
      accent: '#ffffff',
      text: '#ffffff',
      badgeBg: '#082654',
      badgeText: '#f58220',
    };
  }
  if (normalized === 'WIDE' || normalized === 'WD' || normalized === 'WIDEBALL') {
    return {
      badge: 'EXTRA RUN',
      label: 'WIDE BALL',
      caption: cleanCaption || `${bowlerName} • RE-BOWL`,
      bg: 'linear-gradient(90deg, #062049 0%, #1e40af 26%, #2563eb 50%, #1e40af 74%, #062049 100%)',
      accent: '#93c5fd',
      text: '#ffffff',
      badgeBg: '#f58220',
      badgeText: '#082654',
    };
  }
  return {
    badge: batTeamCode,
    label: String(type || 'LIVE').replace(/!+/g, '').toUpperCase(),
    caption: cleanCaption || `${batTeamCode} LIVE`,
    bg: 'linear-gradient(90deg, #062049 0%, #0b3575 50%, #062049 100%)',
    accent: '#f58220',
    text: '#ffffff',
    badgeBg: '#f58220',
    badgeText: '#082654',
  };
}

function SideFlipSlot({
  teamName,
  teamLogo,
  showTeamLogo,
  showText,
  flipping,
}: {
  teamName: string;
  teamLogo?: string;
  showTeamLogo: boolean;
  showText: boolean;
  flipping: boolean;
}) {
  return (
    <div className="h-full flex items-center justify-center px-[6px] overflow-hidden">
      <div
        className="w-full h-full flex items-center justify-center transition-all duration-300 ease-in-out"
        style={{
          transform: flipping ? 'rotateY(90deg) scale(0.85)' : 'rotateY(0deg) scale(1)',
          opacity: flipping ? 0 : 1,
        }}
      >
        {showText ? (
          <div
            className="text-center font-black uppercase text-white break-words line-clamp-3 px-1"
            style={{ fontSize: 12.5, lineHeight: 1.2 }}
          >
            {teamName}
          </div>
        ) : teamLogo && showTeamLogo ? (
          <img
            src={teamLogo}
            alt={teamName}
            referrerPolicy="no-referrer"
            className="w-[66px] h-[66px] object-contain shrink-0"
            style={{ filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.45))' }}
          />
        ) : (
          <div
            className="w-[62px] h-[62px] rounded-full flex items-center justify-center overflow-hidden shrink-0"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '3px solid #ffffff',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
            }}
          />
        )}
      </div>
    </div>
  );
}

export function StarNavyOrangeScoreboardBar({
  batTeamName,
  batTeamCode,
  batTeamLogo,
  bowlTeamName,
  bowlTeamCode,
  bowlTeamLogo,
  showTeamLogo = true,
  runs,
  wickets,
  oversText,
  inningsNumber = 1,
  projectedScore = 0,
  crr,
  rrr = '0.00',
  target = null,
  needRuns = null,
  needBalls = null,
  batter1Name,
  batter1Runs = 0,
  batter1Balls = 0,
  batter2Name,
  batter2Runs = 0,
  batter2Balls = 0,
  strikerIndex = 1,
  bowlerName,
  bowlerFigs,
  bowlerOvers,
  balls = [],
  tickerTitle,
  activeEvent = null,
  winnerInfo = null,
  patiBanner = null,
  bottomNeed = null,
  compact = false,
}: StarNavyOrangeScoreboardBarProps) {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  const BASE_WIDTH = 1240;
  const BASE_HEIGHT = 96;

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

  // 1. Score Pop Animation when runs or wickets change
  const scoreKey = `${runs}/${wickets}`;
  const prevScoreRef = useRef(scoreKey);
  const [scorePop, setScorePop] = useState(false);

  useEffect(() => {
    if (prevScoreRef.current !== scoreKey) {
      prevScoreRef.current = scoreKey;
      setScorePop(true);
      const t = window.setTimeout(() => setScorePop(false), 380);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [scoreKey]);

  // 2. Side Slots 3D Flip (Circle/Logo <-> Team Name every 5.5s)
  const [sideShowText, setSideShowText] = useState(false);
  const [sideFlipping, setSideFlipping] = useState(false);

  useEffect(() => {
    let innerTimer: number | undefined;
    const interval = window.setInterval(() => {
      setSideFlipping(true);
      innerTimer = window.setTimeout(() => {
        setSideShowText((prev) => !prev);
        setSideFlipping(false);
      }, 340);
    }, 5500);
    return () => {
      window.clearInterval(interval);
      if (innerTimer) window.clearTimeout(innerTimer);
    };
  }, []);

  // 3. Stat Box Rotator (TARGET -> CRR -> RRR in chase/Bottom Need; PROJECTED <-> CRR in 1st inn)
  const statItems = useMemo(() => {
    if (bottomNeed && target !== null && target > 0) {
      return [
        { label: 'TARGET', value: String(target) },
        { label: 'CRR', value: crr || '0.00' },
        { label: 'RRR', value: rrr || '0.00' },
      ];
    }
    if (inningsNumber === 2 && target !== null && target > 0) {
      return [
        { label: 'RRR', value: rrr || '0.00' },
        { label: 'TARGET', value: String(target) },
        { label: 'CRR', value: crr || '0.00' },
      ];
    }
    return [
      { label: 'PROJECTED', value: String(Math.max(runs, Math.round(projectedScore || 0))) },
      { label: 'CRR', value: crr || '0.00' },
    ];
  }, [bottomNeed, inningsNumber, target, rrr, crr, projectedScore, runs]);

  const [statIdx, setStatIdx] = useState(0);
  const [statSliding, setStatSliding] = useState(false);

  useEffect(() => {
    setStatIdx(0);
  }, [inningsNumber, Boolean(bottomNeed)]);

  useEffect(() => {
    let innerTimer: number | undefined;
    const interval = window.setInterval(() => {
      setStatSliding(true);
      innerTimer = window.setTimeout(() => {
        setStatIdx((prev) => (prev + 1) % statItems.length);
        setStatSliding(false);
      }, 280);
    }, 3400);
    return () => {
      window.clearInterval(interval);
      if (innerTimer) window.clearTimeout(innerTimer);
    };
  }, [statItems.length]);

  const activeStat = statItems[statIdx % statItems.length] ?? statItems[0];

  // 4. Below-Pill Ticker Rotator: 0 = Marquee, 1 = Bowling Team Reveal, 2 = Batting Team Reveal
  const [tickerStep, setTickerStep] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    const durationMs = tickerStep === 0 ? 7500 : 3400;
    const timer = window.setTimeout(() => {
      setTickerStep((prev) => ((prev + 1) % 3) as 0 | 1 | 2);
    }, durationMs);
    return () => window.clearTimeout(timer);
  }, [tickerStep]);

  const cleanTickerTitle = (tickerTitle || 'STAR EVENT LIVE')
    .replace(/!+/g, '')
    .toUpperCase();

  // Switch right panel to Bottom Need ("TO WIN | RUNS | BALLS") ONLY when Bottom Need mode is selected;
  // clicking "Score" always returns to the Bowler + 6-ball scoreboard.
  const showChaseRight = Boolean(bottomNeed);
  const isTargetChase = needRuns !== null && target !== null;
  const displayNeedHeading = isTargetChase ? 'TO WIN' : 'LEFT';
  const displayFirstStatLabel = isTargetChase ? 'RUNS' : 'BALLS';
  const displaySecondStatLabel = isTargetChase
    ? bottomNeed?.rightLabel || 'BALLS'
    : bottomNeed?.rightLabel || 'CRR';
  const displayNeedRuns = bottomNeed ? bottomNeed.runsValue : String(needRuns ?? 0);
  const displayNeedBalls = bottomNeed ? bottomNeed.ballsValue : String(needBalls ?? 0);

  // Pad/slice current over balls to 6 square boxes (if more than 6 due to extras, show up to 7 neatly)
  const visibleBalls = useMemo(() => {
    const count = Math.max(6, Math.min(8, balls.length));
    const sliced = balls.length > count ? balls.slice(-count) : balls;
    const slots: Array<ProScoreboardBallDot | null> = [...sliced];
    while (slots.length < 6) {
      slots.push(null);
    }
    return slots;
  }, [balls]);

  // Event & Banner states
  const strikerName = (strikerIndex === 2 ? batter2Name : batter1Name) || 'BATTER';
  const eventPreset = activeEvent
    ? resolveNavyOrangeEvent(
        activeEvent.type,
        batTeamCode,
        bowlTeamCode,
        strikerName,
        bowlerName || 'BOWLER',
        activeEvent.caption
      )
    : null;

  const activeBanner: ScoreboardPatiBanner | null = patiBanner
    ? {
        ...patiBanner,
        badge: patiBanner.badge.replace(/!+/g, ''),
        headline: patiBanner.headline.replace(/!+/g, ''),
        subline: patiBanner.subline ? patiBanner.subline.replace(/!+/g, '') : undefined,
      }
    : winnerInfo
      ? {
          kind: 'WINNER',
          badge: (winnerInfo.badge || 'MATCH RESULT').replace(/!+/g, ''),
          headline: winnerInfo.headline.replace(/!+/g, ''),
          subline: winnerInfo.summaryLine.replace(/!+/g, ''),
        }
      : null;

  const barContent = (
    <div
      className="w-full star-navy-slide-up select-none"
      style={{
        padding: '16px 6px 0 6px',
        fontFamily: "'Inter', 'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      <div
        className="w-full relative"
        style={{
          height: 78,
          background: 'linear-gradient(180deg, #0b3575 0%, #062049 100%)',
          borderRadius: '36px 36px 0 0',
          borderBottom: '4px solid #f58220',
          boxShadow: '0 -4px 18px rgba(0, 0, 0, 0.45)',
          color: '#ffffff',
        }}
      >
        {/* ================= FULL-BAR EVENT BANNER (FOUR / SIX / WICKET / NB / WD / FREE HIT) ================= */}
        {eventPreset ? (
          <div
            className="w-full h-full grid items-center star-navy-fade-scale"
            style={{
              gridTemplateColumns: '112px 1fr 112px',
              background: eventPreset.bg,
              borderRadius: '36px 36px 0 0',
            }}
          >
            <SideFlipSlot
              teamName={batTeamName}
              teamLogo={batTeamLogo}
              showTeamLogo={showTeamLogo}
              showText={false}
              flipping={false}
            />
            <div className="flex items-center justify-center gap-5 px-4 overflow-hidden">
              <span
                className="px-3.5 py-1 rounded-full font-black uppercase tracking-wider shrink-0"
                style={{
                  fontSize: 13,
                  background: eventPreset.badgeBg,
                  color: eventPreset.badgeText,
                  border: `1.5px solid ${eventPreset.accent}`,
                }}
              >
                {eventPreset.badge}
              </span>
              <span
                className="font-black uppercase tracking-wide truncate"
                style={{
                  fontSize: 34,
                  color: eventPreset.text,
                  textShadow: '0 2px 10px rgba(0,0,0,0.45)',
                }}
              >
                {eventPreset.label}
              </span>
              <span
                className="font-extrabold uppercase tracking-wide truncate max-w-[300px]"
                style={{ fontSize: 14, color: '#dbe7ff' }}
              >
                {eventPreset.caption}
              </span>
            </div>
            <SideFlipSlot
              teamName={bowlTeamName}
              teamLogo={bowlTeamLogo}
              showTeamLogo={showTeamLogo}
              showText={false}
              flipping={false}
            />
          </div>
        ) : activeBanner ? (
          /* ================= FULL-BAR PATI BANNER (WINNER / VERSUS / TOSS / TOURNAMENT / MESSAGE) ================= */
          <div
            className="w-full h-full grid items-center star-navy-fade-scale"
            style={{
              gridTemplateColumns: '112px 1fr 112px',
              borderRadius: '36px 36px 0 0',
            }}
          >
            <SideFlipSlot
              teamName={activeBanner.leftTeamName || batTeamName}
              teamLogo={batTeamLogo}
              showTeamLogo={Boolean(showTeamLogo || activeBanner.forceShowLogos)}
              showText={false}
              flipping={false}
            />
            <div className="flex flex-col items-center justify-center px-4 text-center overflow-hidden">
              <div className="flex items-center gap-2.5">
                <span
                  className="px-2.5 py-0.5 rounded font-black uppercase tracking-wider shrink-0"
                  style={{
                    fontSize: 11,
                    background: '#f58220',
                    color: '#082654',
                  }}
                >
                  {activeBanner.badge}
                </span>
                <span
                  className="font-black uppercase tracking-wide truncate"
                  style={{
                    fontSize: 22,
                    color: activeBanner.kind === 'WINNER' ? '#ffd54f' : '#ffffff',
                  }}
                >
                  {activeBanner.headline}
                </span>
              </div>
              {activeBanner.subline && (
                <p
                  className="font-black uppercase tracking-wider truncate max-w-full mt-0.5"
                  style={{
                    fontSize: activeBanner.kind === 'WINNER' ? 15 : 12.5,
                    color: activeBanner.kind === 'WINNER' ? '#ffea00' : '#dbe7ff',
                  }}
                >
                  {activeBanner.subline}
                </p>
              )}
            </div>
            <SideFlipSlot
              teamName={activeBanner.rightTeamName || bowlTeamName}
              teamLogo={bowlTeamLogo}
              showTeamLogo={Boolean(showTeamLogo || activeBanner.forceShowLogos)}
              showText={false}
              flipping={false}
            />
          </div>
        ) : (
          /* ================= MAIN 6-COLUMN BROADCAST SCOREBOARD ================= */
          <div
            className="w-full h-full grid items-center"
            style={{
              gridTemplateColumns: showChaseRight
                ? '112px 1.12fr 104px 350px 1.58fr 112px'
                : '112px 1.25fr 118px 360px 1.35fr 112px',
            }}
          >
            {/* 1. Far Left Slot: Batting Team Circle Logo <-> Full Team Name 3D Flip */}
            <SideFlipSlot
              teamName={batTeamName}
              teamLogo={batTeamLogo}
              showTeamLogo={showTeamLogo}
              showText={sideShowText}
              flipping={sideFlipping}
            />

            {/* 2. Left Batters Section */}
            <div className="flex flex-col justify-center gap-[6px] pl-[6px] pr-[16px] min-w-0">
              {/* Batter 1 */}
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-[7px] min-w-0">
                  {strikerIndex === 1 ? (
                    <CricketBatIcon animate />
                  ) : (
                    <span className="w-[17px] shrink-0" />
                  )}
                  <span
                    className="font-black uppercase truncate"
                    style={{
                      fontSize: 15,
                      color: strikerIndex === 1 ? '#ffffff' : '#cbdcf7',
                    }}
                  >
                    {batter1Name}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 shrink-0 tabular-nums">
                  <span className="font-black text-white" style={{ fontSize: 16 }}>
                    {batter1Runs === '' ? 0 : batter1Runs}
                  </span>
                  <span className="font-bold" style={{ fontSize: 12.5, color: '#dbe7ff' }}>
                    ({batter1Balls === '' ? 0 : batter1Balls})
                  </span>
                </div>
              </div>

              {/* Batter 2 */}
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-[7px] min-w-0">
                  {strikerIndex === 2 ? (
                    <CricketBatIcon animate />
                  ) : (
                    <span className="w-[17px] shrink-0" />
                  )}
                  <span
                    className="font-black uppercase truncate"
                    style={{
                      fontSize: 15,
                      color: strikerIndex === 2 ? '#ffffff' : '#cbdcf7',
                    }}
                  >
                    {batter2Name}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 shrink-0 tabular-nums">
                  <span className="font-black text-white" style={{ fontSize: 16 }}>
                    {batter2Runs === '' ? 0 : batter2Runs}
                  </span>
                  <span className="font-bold" style={{ fontSize: 12.5, color: '#dbe7ff' }}>
                    ({batter2Balls === '' ? 0 : batter2Balls})
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Center-Left Stat Box (PROJECTED / CRR / RRR / TARGET Rotator) */}
            <div
              className="flex flex-col items-center justify-center px-[10px] overflow-hidden"
              style={{
                borderLeft: '2.5px solid #f58220',
                height: 52,
              }}
            >
              <div
                className="flex flex-col items-center justify-center transition-all duration-300 ease-in-out"
                style={{
                  transform: statSliding ? 'translateY(-10px)' : 'translateY(0)',
                  opacity: statSliding ? 0 : 1,
                }}
              >
                <span
                  className="font-extrabold uppercase tracking-[0.5px] leading-tight"
                  style={{ fontSize: 11, color: '#cbdcf7' }}
                >
                  {activeStat.label}
                </span>
                <span
                  className="font-black text-white tabular-nums leading-tight mt-[1px]"
                  style={{ fontSize: 21 }}
                >
                  {activeStat.value}
                </span>
              </div>
            </div>

            {/* 4. Center Hub: Raised Score Pill + Below-Pill Sub Ticker */}
            <div className="h-full flex flex-col items-center justify-start relative">
              {/* Overlapping Score Pill */}
              <div
                className="flex items-stretch overflow-hidden shrink-0"
                style={{
                  marginTop: -12,
                  width: 345,
                  height: 54,
                  border: '2px solid #ffffff',
                  borderRadius: '4px 4px 26px 26px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.45)',
                }}
              >
                {/* Left White Team Code + Score */}
                <div
                  className="flex-1 flex items-center justify-center gap-[12px] px-[14px] min-w-0"
                  style={{ background: '#f2f4f8', color: '#082654' }}
                >
                  <span
                    className="font-black uppercase truncate"
                    style={{ fontSize: 20, letterSpacing: '0.3px' }}
                  >
                    {batTeamCode}
                  </span>
                  <span
                    className={`font-black tabular-nums leading-none shrink-0 ${
                      scorePop ? 'star-navy-score-pop' : ''
                    }`}
                    style={{ fontSize: 36, letterSpacing: '-0.5px' }}
                  >
                    {runs}/{wickets}
                  </span>
                </div>

                {/* Right Orange Overs Pill */}
                <div
                  className="flex items-center justify-center font-black tabular-nums shrink-0"
                  style={{
                    width: 92,
                    background: '#f58220',
                    color: '#082654',
                    fontSize: 21,
                  }}
                >
                  {oversText}
                </div>
              </div>

              {/* Below-Pill Animated Ticker (Marquee -> Bowling Team -> Batting Team) */}
              <div
                className="flex items-center justify-center overflow-hidden relative"
                style={{ width: 315, height: 28, marginTop: 2 }}
              >
                {tickerStep === 0 && (
                  <div className="w-full overflow-hidden whitespace-nowrap">
                    <div
                      className="inline-block font-extrabold uppercase tracking-[0.6px] star-navy-marquee"
                      style={{ fontSize: 12, color: '#dbe7ff' }}
                    >
                      {cleanTickerTitle} &nbsp;&bull;&nbsp; {batTeamName.toUpperCase()} VS{' '}
                      {bowlTeamName.toUpperCase()} &nbsp;&bull;&nbsp; {cleanTickerTitle}
                    </div>
                  </div>
                )}

                {tickerStep === 1 && (
                  <div
                    key="ticker-bowl"
                    className="flex items-center justify-center gap-2 px-2 star-navy-reveal-up"
                  >
                    <CricketBallIcon size={14} />
                    <span
                      className="font-black uppercase truncate"
                      style={{ fontSize: 12.5, color: '#ffffff', maxWidth: 270 }}
                    >
                      {bowlTeamName}
                    </span>
                  </div>
                )}

                {tickerStep === 2 && (
                  <div
                    key="ticker-bat"
                    className="flex items-center justify-center gap-2 px-2 star-navy-reveal-up"
                  >
                    <CricketBatIcon />
                    <span
                      className="font-black uppercase truncate"
                      style={{ fontSize: 12.5, color: '#ffffff', maxWidth: 270 }}
                    >
                      {batTeamName}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 5. Right Section: Score Mode (Bowler + 6 Square Boxes) OR Bottom Need Mode (Bowler + Circular Ball Dots | TO WIN | RUNS | BALLS) */}
            <div className="h-full flex items-center justify-center pl-[12px] pr-[6px] min-w-0">
              {showChaseRight ? (
                <div
                  key="bottom-need-view"
                  className="w-full h-full flex items-center justify-between gap-[10px] min-w-0 star-navy-fade-scale"
                >
                  {/* Left Sub-Column: Bowler + Circular Ball Dots */}
                  <div className="flex flex-col justify-center gap-[5px] min-w-0 flex-1">
                    <div className="flex items-center gap-[6px] min-w-0">
                      <CricketBallIcon size={14} />
                      <span
                        className="font-extrabold uppercase text-white truncate"
                        style={{ fontSize: 14.5 }}
                      >
                        {bowlerName}
                      </span>
                      <span
                        className="font-extrabold tabular-nums shrink-0"
                        style={{ fontSize: 13.5, color: '#dbe7ff' }}
                      >
                        {bowlerFigs} ({bowlerOvers})
                      </span>
                    </div>

                    <div className="flex items-center gap-[5px]">
                      {visibleBalls.slice(0, 6).map((ball, idx) => {
                        if (!ball) {
                          return (
                            <span
                              key={`dot-empty-${idx}`}
                              className="inline-flex items-center justify-center rounded-full shrink-0"
                              style={{
                                width: 15,
                                height: 15,
                                border: '2px solid #ffffff',
                                background: 'rgba(255, 255, 255, 0.15)',
                              }}
                            />
                          );
                        }

                        let bg = 'rgba(255, 255, 255, 0.2)';
                        let borderColor = '#ffffff';
                        let color = '#ffffff';

                        if (ball.isWicket) {
                          bg = '#e60000';
                          borderColor = '#ff6666';
                          color = '#ffffff';
                        } else if (ball.isBoundary4 || ball.isBoundary6) {
                          bg = '#f58220';
                          borderColor = '#ffb870';
                          color = '#082654';
                        } else if (ball.isExtra) {
                          bg = '#16a34a';
                          borderColor = '#86efac';
                          color = '#ffffff';
                        }

                        return (
                          <span
                            key={`dot-${ball.id}`}
                            className="inline-flex items-center justify-center rounded-full font-black tabular-nums shrink-0"
                            style={{
                              minWidth: 19,
                              height: 19,
                              padding: '0 3px',
                              border: `1.5px solid ${borderColor}`,
                              background: bg,
                              color,
                              fontSize: ball.label.length > 2 ? 8 : 10,
                            }}
                          >
                            {ball.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Sub-Column: Orange Divider + TO WIN | RUNS | BALLS */}
                  <div
                    className="flex items-center gap-[12px] pl-[12px] shrink-0"
                    style={{ borderLeft: '2px solid #f58220' }}
                  >
                    <span
                      className="font-black uppercase text-white whitespace-nowrap"
                      style={{ fontSize: 17.5 }}
                    >
                      {displayNeedHeading}
                    </span>

                    <div className="flex flex-col items-center justify-center">
                      <span
                        className="font-extrabold uppercase"
                        style={{ fontSize: 11, color: '#dbe7ff' }}
                      >
                        {displayFirstStatLabel}
                      </span>
                      <span
                        className="font-black text-white tabular-nums leading-[1.1]"
                        style={{ fontSize: 20 }}
                      >
                        {displayNeedRuns}
                      </span>
                    </div>

                    <div className="flex flex-col items-center justify-center">
                      <span
                        className="font-extrabold uppercase"
                        style={{ fontSize: 11, color: '#dbe7ff' }}
                      >
                        {displaySecondStatLabel}
                      </span>
                      <span
                        className="font-black text-white tabular-nums leading-[1.1]"
                        style={{ fontSize: 20 }}
                      >
                        {displayNeedBalls}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  key="bowler-view"
                  className="w-full flex flex-col justify-center gap-[6px] min-w-0"
                >
                  {/* Bowler Header Row */}
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-[7px] min-w-0">
                      <CricketBallIcon size={15} />
                      <span
                        className="font-black uppercase text-white truncate"
                        style={{ fontSize: 14.5 }}
                      >
                        {bowlerName}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1 shrink-0 tabular-nums">
                      <span className="font-black text-white" style={{ fontSize: 15.5 }}>
                        {bowlerFigs}
                      </span>
                      <span className="font-bold" style={{ fontSize: 12, color: '#dbe7ff' }}>
                        ({bowlerOvers})
                      </span>
                    </div>
                  </div>

                  {/* 6 Square Ball Boxes */}
                  <div className="flex items-center gap-[6px]">
                    {visibleBalls.map((ball, idx) => {
                      if (!ball) {
                        return (
                          <span
                            key={`empty-${idx}`}
                            className="inline-flex items-center justify-center rounded-[3px]"
                            style={{
                              width: 28,
                              height: 24,
                              border: '1.5px solid rgba(255, 255, 255, 0.5)',
                              background: 'rgba(255, 255, 255, 0.04)',
                            }}
                          />
                        );
                      }

                      let bg = 'rgba(255, 255, 255, 0.14)';
                      let borderColor = '#ffffff';
                      let color = '#ffffff';

                      if (ball.isWicket) {
                        bg = '#e60000';
                        borderColor = '#ff6666';
                        color = '#ffffff';
                      } else if (ball.isBoundary4 || ball.isBoundary6) {
                        bg = '#f58220';
                        borderColor = '#ffb870';
                        color = '#082654';
                      } else if (ball.isExtra) {
                        bg = '#16a34a';
                        borderColor = '#86efac';
                        color = '#ffffff';
                      }

                      return (
                        <span
                          key={ball.id}
                          className="inline-flex items-center justify-center rounded-[3px] font-black tabular-nums px-0.5"
                          style={{
                            minWidth: 28,
                            height: 24,
                            background: bg,
                            border: `1.5px solid ${borderColor}`,
                            color,
                            fontSize: ball.label.length > 2 ? 9.5 : 12,
                          }}
                        >
                          {ball.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 6. Far Right Slot: Bowling Team Circle Logo <-> Full Team Name 3D Flip */}
            <SideFlipSlot
              teamName={bowlTeamName}
              teamLogo={bowlTeamLogo}
              showTeamLogo={showTeamLogo}
              showText={sideShowText}
              flipping={sideFlipping}
            />
          </div>
        )}
      </div>
    </div>
  );

  if (!compact) {
    return barContent;
  }

  return (
    <div
      ref={outerRef}
      className="w-full overflow-hidden relative"
      style={{ height: Math.ceil(BASE_HEIGHT * scale) }}
    >
      <div
        style={{
          width: BASE_WIDTH,
          height: BASE_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {barContent}
      </div>
    </div>
  );
}
