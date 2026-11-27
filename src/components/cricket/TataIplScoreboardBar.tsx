import { useEffect, useId, useRef, useState } from 'react';
import type { ProScoreboardBallDot } from './ProScoreboardBar';

export interface TataIplEventBanner {
  id: number;
  type: string;
  caption?: string;
}

export interface TataIplWinnerInfo {
  headline: string;
  badge: string;
  summaryLine: string;
}

export type ScoreboardPatiBannerKind =
  | 'WINNER'
  | 'VERSUS'
  | 'TOSS'
  | 'TOURNAMENT'
  | 'MESSAGE'
  | 'HIGHLIGHT';

export interface ScoreboardPatiBanner {
  kind: ScoreboardPatiBannerKind;
  badge: string;
  headline: string;
  subline?: string;
  leftTeamName?: string;
  rightTeamName?: string;
  forceShowLogos?: boolean;
}

export interface ScoreboardBottomNeedInfo {
  runsValue: string;
  middleTop: string;
  middleBottom: string;
  ballsValue: string;
  rightLabel: string;
}

export interface TataIplScoreboardBarProps {
  batTeamCode: string;
  batTeamLogo?: string;
  batTeamColor?: string;
  batTeamTextColor?: string;
  bowlTeamCode: string;
  bowlTeamLogo?: string;
  bowlTeamColor?: string;
  bowlTeamTextColor?: string;
  showTeamLogo?: boolean;
  scoreText: string;
  oversText: string;
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
  targetText: string;
  matchTitle: string;
  activeEvent?: TataIplEventBanner | null;
  winnerInfo?: TataIplWinnerInfo | null;
  patiBanner?: ScoreboardPatiBanner | null;
  bottomNeed?: ScoreboardBottomNeedInfo | null;
  compact?: boolean;
}

function useBumpAnimation(value: string | number | undefined, durationMs = 450): boolean {
  const prevRef = useRef<string | number | undefined>(value);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (prevRef.current !== value) {
      prevRef.current = value;
      setAnimating(true);
      const timer = window.setTimeout(() => setAnimating(false), durationMs);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [value, durationMs]);

  return animating;
}

function resolveEventPreset(
  type: string,
  batTeam: string,
  bowlTeam: string,
  strikerName: string,
  bowlerName: string,
  scoreText: string,
  customCaption?: string
): { theme: string; badge: string; headline: string; caption: string } {
  const normalized = String(type || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (normalized === 'FOUR' || normalized === '4') {
    return {
      theme: 'theme-four',
      badge: `${batTeam} • 4 RUNS`,
      headline: 'FOUR!',
      caption: customCaption || `${strikerName} • CRACKING BOUNDARY`,
    };
  }
  if (normalized === 'SIX' || normalized === '6') {
    return {
      theme: 'theme-six',
      badge: `${batTeam} • 6 RUNS`,
      headline: 'MAXIMUM SIX!',
      caption: customCaption || `${strikerName} • OUT OF THE PARK`,
    };
  }
  if (normalized === 'WICKET' || normalized === 'W' || normalized === 'OUT') {
    return {
      theme: 'theme-wicket',
      badge: bowlTeam,
      headline: 'WICKET! OUT!',
      caption: customCaption || `${bowlerName} STRIKES • ${scoreText}`,
    };
  }
  if (normalized === 'NOBALL' || normalized === 'NB') {
    return {
      theme: 'theme-noball',
      badge: 'NO BALL +1',
      headline: 'NO BALL!',
      caption: customCaption || `FREE HIT NEXT • ${strikerName}`,
    };
  }
  if (normalized === 'FREEHIT') {
    return {
      theme: 'theme-freehit',
      badge: 'FREE HIT',
      headline: 'FREE HIT!',
      caption: customCaption || `${strikerName} ON STRIKE`,
    };
  }
  if (normalized === 'WIDE' || normalized === 'WD' || normalized === 'WIDEBALL') {
    return {
      theme: 'theme-wide',
      badge: 'WIDE +1',
      headline: 'WIDE BALL!',
      caption: customCaption || `${bowlerName} • EXTRA RUN`,
    };
  }
  if (normalized === 'CHASED' || normalized === 'MATCHWON' || normalized === 'WIN') {
    return {
      theme: 'theme-chased',
      badge: `${batTeam} WIN`,
      headline: 'TARGET CHASED!',
      caption: customCaption || `${batTeam} DEFEAT ${bowlTeam}`,
    };
  }
  if (normalized.includes('100') || normalized.includes('CENTURY') || normalized.includes('50') || normalized.includes('FIFTY')) {
    return {
      theme: 'theme-six',
      badge: batTeam,
      headline: type.toUpperCase(),
      caption: customCaption || `${strikerName} • MILESTONE`,
    };
  }
  return {
    theme: 'theme-four',
    badge: batTeam,
    headline: type.toUpperCase(),
    caption: customCaption || `${batTeam} ${scoreText}`,
  };
}

export function TataIplScoreboardBar({
  batTeamCode,
  batTeamLogo,
  batTeamColor,
  batTeamTextColor,
  bowlTeamCode,
  bowlTeamLogo,
  bowlTeamColor,
  bowlTeamTextColor,
  showTeamLogo = true,
  scoreText,
  oversText,
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
  targetText,
  matchTitle,
  activeEvent = null,
  winnerInfo = null,
  patiBanner = null,
  bottomNeed = null,
  compact = false,
}: TataIplScoreboardBarProps) {
  const uid = useId().replace(/:/g, '');
  const scoreFlip = useBumpAnimation(scoreText, 450);
  const oversBump = useBumpAnimation(oversText, 380);
  const p1rBump = useBumpAnimation(batter1Runs, 380);
  const p1bBump = useBumpAnimation(batter1Balls, 380);
  const p2rBump = useBumpAnimation(batter2Runs, 380);
  const p2bBump = useBumpAnimation(batter2Balls, 380);
  const bfigBump = useBumpAnimation(bowlerFigs, 380);
  const bovBump = useBumpAnimation(bowlerOvers, 380);

  const cleanBat = (batTeamCode || 'BAT').toUpperCase();
  const cleanBowl = (bowlTeamCode || 'BOWL').toUpperCase();
  const leftShieldLabel = cleanBat === 'GT' ? 'TITANS' : cleanBat.slice(0, 6);
  const rightShieldLabel = cleanBowl.slice(0, 5);
  const rightShieldSub = cleanBowl === 'RR' ? 'ROYALS' : 'LIVE';

  const strikerName = (strikerIndex === 1 ? batter1Name : batter2Name) || 'BATTER';
  const eventPreset = activeEvent
    ? resolveEventPreset(
        activeEvent.type,
        cleanBat,
        cleanBowl,
        strikerName.toUpperCase(),
        (bowlerName || 'BOWLER').toUpperCase(),
        scoreText,
        activeEvent.caption
      )
    : null;

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

  const visibleBalls = showBalls && balls.length > 0 ? balls.slice(-6) : [];

  return (
    <div className="ipl-patti-stage w-full">
      <div className={`ipl-patti-wrapper ${compact ? 'is-compact' : ''}`}>
        {/* Left Dark Metallic Angled Wing with GT-Style Shield Crest */}
        <div className="ipl-wing-shield-left">
          <div className="ipl-wing-inner-left">
            <div className="ipl-team-crest-box">
              {effectiveShowLogo && batTeamLogo ? (
                <img
                  src={batTeamLogo}
                  alt={cleanBat}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <svg
                  width={compact ? 36 : 54}
                  height={compact ? 32 : 48}
                  viewBox="0 0 64 56"
                  aria-label={`${cleanBat} Crest`}
                >
                  <defs>
                    <linearGradient id={`gtShieldGrad-${uid}`} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={batTeamColor || '#99040b'} />
                      <stop offset="55%" stopColor={batTeamColor || '#4a0208'} />
                      <stop offset="100%" stopColor="#070b28" />
                    </linearGradient>
                    <linearGradient id={`gtGoldGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fff04d" />
                      <stop offset="50%" stopColor="#ffe600" />
                      <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>
                  </defs>
                  <polygon
                    points="32,3 57,14 50,44 32,53 14,44 7,14"
                    fill={`url(#gtShieldGrad-${uid})`}
                    stroke={`url(#gtGoldGrad-${uid})`}
                    strokeWidth="2.6"
                  />
                  <path
                    d="M16,19 L32,11 L48,19"
                    fill="none"
                    stroke={batTeamColor || '#ef1a1a'}
                    strokeWidth="2.2"
                  />
                  <text
                    x="32"
                    y="34"
                    textAnchor="middle"
                    fill={batTeamTextColor || '#ffffff'}
                    fontFamily="Oswald, sans-serif"
                    fontWeight="700"
                    fontSize={leftShieldLabel.length > 4 ? '11.5' : '13.5'}
                    letterSpacing="0.5"
                  >
                    {leftShieldLabel}
                  </text>
                  <path
                    d="M17,40 L47,40"
                    stroke={`url(#gtGoldGrad-${uid})`}
                    strokeWidth="2.2"
                  />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Central Single-Line Scoreboard Bar */}
        <div className="ipl-patti-core">
          {/* Full-Width Animated Broadcast Event Stinger (Hidden until triggered) */}
          <div
            className={`ipl-event-banner ${
              eventPreset ? `${eventPreset.theme} active` : ''
            }`}
            aria-live="polite"
          >
            {eventPreset && (
              <div key={activeEvent?.id} className="ipl-event-content-box">
                <span className="ipl-event-badge-pill">{eventPreset.badge}</span>
                <span className="ipl-event-main-headline">
                  {eventPreset.headline}
                </span>
                <span className="ipl-event-sub-caption">
                  {eventPreset.caption}
                </span>
              </div>
            )}
          </div>

          {/* Upper Primary Row — renders in-patti Winner / Versus / Toss / Message / Highlight natively */}
          <div className="ipl-patti-top-band">
            {effectiveBanner ? (
              effectiveBanner.kind === 'WINNER' ? (
                <div className="ipl-win-strip" role="status" aria-live="polite">
                  <span className="ipl-win-trophy" aria-hidden="true">🏆</span>
                  <span className="ipl-win-badge">{effectiveBanner.badge}</span>
                  <span className="ipl-win-headline">{effectiveBanner.headline}</span>
                  <span className="ipl-win-trophy" aria-hidden="true">🏆</span>
                </div>
              ) : effectiveBanner.kind === 'VERSUS' ? (
                <div className="ipl-pati-banner-strip is-versus" role="status" aria-live="polite">
                  <span className="ipl-pati-banner-headline">
                    {effectiveBanner.leftTeamName || cleanBat}
                  </span>
                  <span className="ipl-pati-vs-pill">VS</span>
                  <span className="ipl-pati-banner-headline">
                    {effectiveBanner.rightTeamName || cleanBowl}
                  </span>
                </div>
              ) : (
                <div
                  className={`ipl-pati-banner-strip ${
                    effectiveBanner.kind === 'HIGHLIGHT' ? 'is-highlight' : ''
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  <span className="ipl-pati-banner-badge">{effectiveBanner.badge}</span>
                  <span className="ipl-pati-banner-headline">{effectiveBanner.headline}</span>
                </div>
              )
            ) : (
              <>
            {/* 1. Left-Center: Batting Team, Gold Score Box & Overs */}
            <div className="ipl-seg-team-score">
              <div className="ipl-bat-team-wrap">
                <span className="ipl-live-pulse-dot" title="Live" />
                <span className="ipl-bat-team-code">{cleanBat}</span>
              </div>
              <div
                className={`ipl-score-gold-box tabular-nums ${
                  scoreFlip ? 'digit-flip' : ''
                }`}
              >
                {scoreText}
              </div>
              <span
                className={`ipl-overs-display tabular-nums ${
                  oversBump ? 'ipl-num-bump' : ''
                }`}
              >
                {oversText}
              </span>
            </div>

            {/* 2. Center: Striker & Non-Striker */}
            <div className="ipl-seg-batsmen">
              <div
                className={`ipl-batter-line ${
                  strikerIndex === 1 ? 'is-striker' : ''
                }`}
              >
                <div className="ipl-batter-left">
                  <span
                    className={`ipl-strike-arrow ${
                      strikerIndex === 1 ? '' : 'inactive'
                    }`}
                  >
                    ▷
                  </span>
                  <span className="ipl-batter-name">{batter1Name}</span>
                </div>
                {batter1Runs !== undefined && batter1Runs !== '' && (
                  <div className="ipl-batter-stats tabular-nums">
                    <span
                      className={`ipl-batter-runs ${
                        p1rBump ? 'ipl-num-bump' : ''
                      }`}
                    >
                      {batter1Runs}
                    </span>
                    <span
                      className={`ipl-batter-balls ${
                        p1bBump ? 'ipl-num-bump' : ''
                      }`}
                    >
                      {batter1Balls ?? 0}
                    </span>
                  </div>
                )}
              </div>

              <div
                className={`ipl-batter-line ${
                  strikerIndex === 2 ? 'is-striker' : ''
                }`}
              >
                <div className="ipl-batter-left">
                  <span
                    className={`ipl-strike-arrow ${
                      strikerIndex === 2 ? '' : 'inactive'
                    }`}
                  >
                    ▷
                  </span>
                  <span className="ipl-batter-name">{batter2Name}</span>
                </div>
                {batter2Runs !== undefined && batter2Runs !== '' && (
                  <div className="ipl-batter-stats tabular-nums">
                    <span
                      className={`ipl-batter-runs ${
                        p2rBump ? 'ipl-num-bump' : ''
                      }`}
                    >
                      {batter2Runs}
                    </span>
                    <span
                      className={`ipl-batter-balls ${
                        p2bBump ? 'ipl-num-bump' : ''
                      }`}
                    >
                      {batter2Balls ?? 0}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Right-Center: Magenta/Pink Bowler Bar OR Oversized Bottom Need Block */}
            <div className="ipl-seg-bowler">
              {bottomNeed ? (
                <div
                  className="w-full h-full flex items-center justify-between px-1 tabular-nums"
                  aria-label={`${bottomNeed.runsValue} ${bottomNeed.middleTop} ${bottomNeed.middleBottom} ${bottomNeed.ballsValue} ${bottomNeed.rightLabel}`}
                >
                  <div className="flex-1 flex items-center justify-center px-1.5">
                    <span
                      className="font-black leading-none tracking-tight"
                      style={{
                        color: '#FFE600',
                        fontSize: compact ? '20px' : '31px',
                        textShadow: '0 2px 6px rgba(0,0,0,0.65)',
                      }}
                    >
                      {bottomNeed.runsValue}
                    </span>
                  </div>
                  <div
                    aria-hidden="true"
                    className="h-[72%] w-[1.5px] shrink-0"
                    style={{ background: 'rgba(255, 230, 0, 0.5)' }}
                  />
                  <div className="flex flex-col items-center justify-center px-2 leading-none shrink-0">
                    <span
                      className="font-black uppercase tracking-wider text-white"
                      style={{ fontSize: compact ? '8px' : '11px', lineHeight: 1.1 }}
                    >
                      {bottomNeed.middleTop}
                    </span>
                    <span
                      className="font-black uppercase tracking-wider text-white/95"
                      style={{ fontSize: compact ? '8px' : '11px', lineHeight: 1.1 }}
                    >
                      {bottomNeed.middleBottom}
                    </span>
                  </div>
                  <div
                    aria-hidden="true"
                    className="h-[72%] w-[1.5px] shrink-0"
                    style={{ background: 'rgba(255, 230, 0, 0.5)' }}
                  />
                  <div className="flex-1 flex items-center justify-center px-1.5">
                    <span
                      className="font-black leading-none tracking-tight"
                      style={{
                        color: '#FFE600',
                        fontSize: compact ? '20px' : '31px',
                        textShadow: '0 2px 6px rgba(0,0,0,0.65)',
                      }}
                    >
                      {bottomNeed.ballsValue}
                    </span>
                  </div>
                  <div
                    aria-hidden="true"
                    className="h-[72%] w-[1.5px] shrink-0"
                    style={{ background: 'rgba(255, 230, 0, 0.5)' }}
                  />
                  <div className="flex items-center justify-center pl-2 pr-1 shrink-0">
                    <span
                      className="font-black uppercase tracking-wider text-white"
                      style={{ fontSize: compact ? '10px' : '14px', lineHeight: 1 }}
                    >
                      {bottomNeed.rightLabel}
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="ipl-bowler-info-left">
                    <span className="ipl-bowler-name">{bowlerName}</span>
                    {visibleBalls.length > 0 && (
                      <div className="ipl-over-balls-strip">
                        {visibleBalls.map((b) => {
                          const up = String(b.label || '').toUpperCase();
                          const cls = b.isWicket || up === 'W'
                            ? 'ipl-ball-dot wicket'
                            : b.isBoundary4 || b.isBoundary6
                              ? 'ipl-ball-dot boundary'
                              : 'ipl-ball-dot';
                          return (
                            <span key={b.id} className={cls}>
                              {b.label === '•' ? '0' : b.label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="ipl-bowler-figures-box tabular-nums">
                    <span
                      className={`ipl-bowler-figs ${
                        bfigBump ? 'ipl-num-bump' : ''
                      }`}
                    >
                      {bowlerFigs}
                    </span>
                    <span
                      className={`ipl-bowler-overs ${
                        bovBump ? 'ipl-num-bump' : ''
                      }`}
                    >
                      {bowlerOvers}
                    </span>
                  </div>
                </>
              )}
            </div>
              </>
            )}
          </div>

          {/* Lower Dark Navy Sub-Bar */}
          <div className="ipl-patti-bottom-band">
            {effectiveBanner ? (
              <>
                <div className="ipl-sub-left">
                  <span className="ipl-sub-vs">
                    {effectiveBanner.kind === 'WINNER'
                      ? 'RESULT'
                      : effectiveBanner.kind === 'VERSUS'
                        ? 'MATCHUP'
                        : effectiveBanner.badge}
                  </span>
                  <span className="ipl-sub-target">
                    {effectiveBanner.subline || targetText}
                  </span>
                </div>
                <div className="ipl-sub-right">{matchTitle}</div>
              </>
            ) : (
              <>
                <div className="ipl-sub-left">
                  <span className="ipl-sub-vs">v {cleanBowl}</span>
                  <span className="ipl-sub-target">{targetText}</span>
                </div>
                <div className="ipl-sub-right">{matchTitle}</div>
              </>
            )}
          </div>
        </div>

        {/* Right Dark Metallic Angled Wing with RR-Style Royal Crest */}
        <div className="ipl-wing-shield-right">
          <div className="ipl-wing-inner-right">
            <div className="ipl-team-crest-box">
              {effectiveShowLogo && bowlTeamLogo ? (
                <img
                  src={bowlTeamLogo}
                  alt={cleanBowl}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <svg
                  width={compact ? 35 : 52}
                  height={compact ? 34 : 50}
                  viewBox="0 0 60 60"
                  aria-label={`${cleanBowl} Crest`}
                >
                  <defs>
                    <linearGradient id={`rrGold-${uid}`} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#fff04d" />
                      <stop offset="50%" stopColor="#ffe600" />
                      <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="30"
                    cy="30"
                    r="25.5"
                    fill={bowlTeamColor || '#3b0207'}
                    stroke={`url(#rrGold-${uid})`}
                    strokeWidth="2.8"
                  />
                  <circle
                    cx="30"
                    cy="30"
                    r="20.5"
                    fill={bowlTeamColor || '#070b28'}
                    stroke="#ffe600"
                    strokeWidth="1.5"
                  />
                  <text
                    x="30"
                    y="32"
                    textAnchor="middle"
                    fill={bowlTeamTextColor || '#facc15'}
                    fontFamily="Oswald, sans-serif"
                    fontWeight="700"
                    fontSize={rightShieldLabel.length > 3 ? '13.5' : '18.5'}
                    letterSpacing="0.5"
                  >
                    {rightShieldLabel}
                  </text>
                  <text
                    x="30"
                    y="43.5"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontFamily="Inter, sans-serif"
                    fontWeight="800"
                    fontSize="6.5"
                    letterSpacing="0.7"
                  >
                    {rightShieldSub}
                  </text>
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
