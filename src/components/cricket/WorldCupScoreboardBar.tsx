import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ProScoreboardBallDot } from './ProScoreboardBar';
import type {
  ScoreboardPatiBanner,
  TataIplEventBanner,
  TataIplWinnerInfo,
} from './TataIplScoreboardBar';

export interface WorldCupScoreboardBarProps {
  batTeamCode: string;
  batTeamLogo?: string;
  batTeamColor?: string;
  batTeamTextColor?: string;
  bowlTeamCode: string;
  bowlTeamLogo?: string;
  bowlTeamColor?: string;
  bowlTeamTextColor?: string;
  showTeamLogo?: boolean;
  runs: number;
  wickets: number;
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
  rateLabel: string;
  rateValue: string;
  tickerText: string;
  activeEvent?: TataIplEventBanner | null;
  winnerInfo?: TataIplWinnerInfo | null;
  patiBanner?: ScoreboardPatiBanner | null;
  compact?: boolean;
}

function resolveWorldCupEvent(
  type: string,
  batTeam: string,
  bowlTeam: string,
  strikerName: string,
  bowlerName: string,
  customCaption?: string
): {
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
      badge: `${bowlTeam} WICKET`,
      label: 'WICKET! OUT!',
      caption: customCaption || `${bowlerName} STRIKES`,
      bg: 'linear-gradient(180deg, #DC2626 0%, #991B1B 52%, #450A0A 100%)',
      border: '#FCA5A5',
      text: '#FFFFFF',
      badgeBg: 'linear-gradient(180deg, #FFFFFF 0%, #CBD5E1 100%)',
      badgeText: '#7F1D1D',
    };
  }
  if (normalized === 'FOUR' || normalized === '4') {
    return {
      badge: `${batTeam} • 4 RUNS`,
      label: 'FOUR!',
      caption: customCaption || `${strikerName} • BOUNDARY`,
      bg: 'linear-gradient(180deg, #0046C7 0%, #0035A0 44%, #001A5C 100%)',
      border: '#93C5FD',
      text: '#FFFFFF',
      badgeBg: 'linear-gradient(180deg, #FFFFFF 0%, #E2E8F0 65%, #CBD5E1 100%)',
      badgeText: '#00237B',
    };
  }
  if (normalized === 'SIX' || normalized === '6') {
    return {
      badge: `${batTeam} • 6 RUNS`,
      label: 'MAXIMUM SIX!',
      caption: customCaption || `${strikerName} • HUGE SIXER`,
      bg: 'linear-gradient(180deg, #FEF08A 0%, #FACC15 48%, #CA8A04 100%)',
      border: '#FEF9C3',
      text: '#09090B',
      badgeBg: 'linear-gradient(180deg, #0035A0 0%, #001A5C 100%)',
      badgeText: '#FACC15',
    };
  }
  if (normalized === 'NOBALL' || normalized === 'NB') {
    return {
      badge: 'NO BALL +1',
      label: 'NO BALL!',
      caption: customCaption || `FREE HIT COMING UP • ${strikerName}`,
      bg: 'linear-gradient(180deg, #B91C1C 0%, #7F1D1D 52%, #001A5C 100%)',
      border: '#FDE047',
      text: '#FFFFFF',
      badgeBg: 'linear-gradient(180deg, #FEF08A 0%, #FACC15 100%)',
      badgeText: '#09090B',
    };
  }
  if (normalized === 'FREEHIT') {
    return {
      badge: 'FREE HIT',
      label: 'FREE HIT!',
      caption: customCaption || `${strikerName} ON STRIKE`,
      bg: 'linear-gradient(180deg, #FDE047 0%, #F59E0B 55%, #B45309 100%)',
      border: '#FEF9C3',
      text: '#09090B',
      badgeBg: '#09090B',
      badgeText: '#FACC15',
    };
  }
  if (normalized === 'WIDE' || normalized === 'WD' || normalized === 'WIDEBALL') {
    return {
      badge: 'WIDE +1',
      label: 'WIDE BALL!',
      caption: customCaption || `${bowlerName} • EXTRA RUN`,
      bg: 'linear-gradient(180deg, #1E3A8A 0%, #00237B 55%, #09090B 100%)',
      border: '#E2E8F0',
      text: '#FFFFFF',
      badgeBg: 'linear-gradient(180deg, #FFFFFF 0%, #CBD5E1 100%)',
      badgeText: '#00237B',
    };
  }
  return {
    badge: batTeam,
    label: String(type || 'LIVE').toUpperCase(),
    caption: customCaption || `${batTeam} LIVE`,
    bg: 'linear-gradient(180deg, #0046C7 0%, #00237B 60%, #001A5C 100%)',
    border: '#93C5FD',
    text: '#FFFFFF',
    badgeBg: 'linear-gradient(180deg, #FFFFFF 0%, #CBD5E1 100%)',
    badgeText: '#00237B',
  };
}

function renderTeamFlagOrCrest(
  code: string,
  logoUrl: string | undefined,
  showTeamLogo: boolean,
  teamColor: string | undefined,
  teamTextColor: string | undefined,
  side: 'left' | 'right'
) {
  if (showTeamLogo && logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={code}
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover"
      />
    );
  }

  const upper = (code || '').trim().toUpperCase();

  if (upper === 'IND') {
    return (
      <svg viewBox="0 0 60 40" className="w-full h-full block" aria-label="IND Flag">
        <rect width="60" height="13.34" y="0" fill="#FF9933" />
        <rect width="60" height="13.34" y="13.33" fill="#FFFFFF" />
        <rect width="60" height="13.34" y="26.66" fill="#138808" />
        <circle cx="30" cy="20" r="5" fill="none" stroke="#000080" strokeWidth="1.2" />
        <circle cx="30" cy="20" r="1.1" fill="#000080" />
      </svg>
    );
  }

  if (upper === 'AUS') {
    return (
      <svg viewBox="0 0 60 40" className="w-full h-full block" aria-label="AUS Flag">
        <rect width="60" height="40" fill="#00008B" />
        {/* Union Jack canton */}
        <rect width="28" height="18" fill="#012169" />
        <path d="M0,0 L28,18 M28,0 L0,18" stroke="#FFFFFF" strokeWidth="3.2" />
        <path d="M0,0 L28,18 M28,0 L0,18" stroke="#C8102E" strokeWidth="1.5" />
        <path d="M14,0 V18 M0,9 H28" stroke="#FFFFFF" strokeWidth="5" />
        <path d="M14,0 V18 M0,9 H28" stroke="#C8102E" strokeWidth="2.8" />
        {/* Commonwealth & Southern Cross stars */}
        <circle cx="14" cy="29" r="3" fill="#FFFFFF" />
        <circle cx="44" cy="11" r="1.7" fill="#FFFFFF" />
        <circle cx="51" cy="18" r="1.7" fill="#FFFFFF" />
        <circle cx="44" cy="28" r="2" fill="#FFFFFF" />
        <circle cx="38" cy="19" r="1.5" fill="#FFFFFF" />
        <circle cx="47" cy="22" r="1.1" fill="#FFFFFF" />
      </svg>
    );
  }

  const bg = teamColor || (side === 'left' ? '#002B80' : '#B91C1C');
  const fg = teamTextColor || '#FFFFFF';

  return (
    <div
      className="w-full h-full flex items-center justify-center font-display font-black text-[13px] tracking-wider uppercase"
      style={{
        background: `linear-gradient(145deg, ${bg} 0%, #09132E 100%)`,
        color: fg,
      }}
    >
      {(upper || 'TM').slice(0, 3)}
    </div>
  );
}

export function WorldCupScoreboardBar({
  batTeamCode,
  batTeamLogo,
  batTeamColor,
  batTeamTextColor,
  bowlTeamCode,
  bowlTeamLogo,
  bowlTeamColor,
  bowlTeamTextColor,
  showTeamLogo = true,
  runs,
  wickets,
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
  rateLabel,
  rateValue,
  tickerText,
  activeEvent = null,
  winnerInfo = null,
  patiBanner = null,
  compact = false,
}: WorldCupScoreboardBarProps) {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  const BASE_WIDTH = 1040;
  const BASE_HEIGHT = 114;

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
  const prevScoreRef = useRef(`${runs}/${wickets}`);
  useEffect(() => {
    const key = `${runs}/${wickets}`;
    if (prevScoreRef.current !== key) {
      prevScoreRef.current = key;
      setScoreFlash(true);
      const t = window.setTimeout(() => setScoreFlash(false), 380);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [runs, wickets]);

  const cleanBat = (batTeamCode || 'BAT').toUpperCase();
  const cleanBowl = (bowlTeamCode || 'BOWL').toUpperCase();
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
  const visibleBalls = showBalls && balls.length > 0 ? balls.slice(-8) : [];
  const eventPreset = activeEvent
    ? resolveWorldCupEvent(
        activeEvent.type,
        cleanBat,
        cleanBowl,
        strikerName.toUpperCase(),
        (bowlerName || 'BOWLER').toUpperCase(),
        activeEvent.caption
      )
    : null;
  const showTopStrip = Boolean(!effectiveBanner && (eventPreset || visibleBalls.length > 0));

  const content = (
    <div
      className="mx-auto select-none"
      style={{
        width: compact ? `${BASE_WIDTH}px` : '100%',
        maxWidth: compact ? `${BASE_WIDTH}px` : '1160px',
        fontFamily: '"Arial", "Helvetica Neue", var(--font-sans), sans-serif',
      }}
    >
      {/* 7-column broadcast grid so Top Over/Event bar & Bottom Ticker align 1:1 with the Blue Batters panel */}
      <div
        className="grid items-stretch"
        style={{
          gridTemplateColumns: '64px 78px 128px 72px minmax(360px, 1fr) 244px 64px',
        }}
      >
        {/* ================= ROW 1: TOP OVER BALLS OR EVENT STINGER (OVER BLUE PANEL ONLY) ================= */}
        <div
          style={{
            gridColumn: '5 / 6',
            gridRow: '1 / 2',
            height: '36px',
          }}
          className="flex items-end"
        >
          {showTopStrip && (
            eventPreset ? (
              <div
                key={activeEvent?.id}
                className="w-full h-[34px] flex items-center justify-center uppercase font-black tracking-wider shadow-md"
                style={{
                  background: eventPreset.bg,
                  color: eventPreset.text,
                  borderTop: `1.5px solid ${eventPreset.border}`,
                  borderLeft: `1.5px solid ${eventPreset.border}`,
                  borderRight: `1.5px solid ${eventPreset.border}`,
                  fontSize: '20px',
                  textShadow: eventPreset.text === '#09090B' ? '0 1px 0 rgba(255,255,255,0.45)' : '0 2px 4px rgba(0,0,0,0.6)',
                }}
              >
                {eventPreset.label}
              </div>
            ) : (
              <div
                className="w-full h-[34px] px-2.5 flex items-center gap-2 shadow-md"
                style={{
                  background: 'linear-gradient(180deg, #2B2B2B 0%, #0C0C0C 48%, #000000 100%)',
                  borderTop: '1.5px solid #D1D5DB',
                  borderLeft: '1.5px solid #D1D5DB',
                  borderRight: '1.5px solid #D1D5DB',
                }}
              >
                {visibleBalls.map((b) => {
                  const raw = String(b.label || '0').trim().toUpperCase();
                  const isDot = raw === '•' || raw === '0' || raw === '.';
                  const isWicketTile =
                    Boolean(b.isWicket) ||
                    raw === 'W' ||
                    raw.startsWith('W+') ||
                    raw === 'OUT' ||
                    raw === 'RO';
                  const isWideTile =
                    !isWicketTile &&
                    (raw === 'WD' || raw.startsWith('WD') || raw.includes('WD'));
                  const isSixTile =
                    !isWicketTile && !isWideTile && Boolean(b.isBoundary6);
                  const isFourTile =
                    !isWicketTile && !isWideTile && !isSixTile && Boolean(b.isBoundary4);
                  const isNoBallTile =
                    !isWicketTile &&
                    !isWideTile &&
                    !isSixTile &&
                    !isFourTile &&
                    (raw === 'NB' || raw === 'NO' || raw.startsWith('NB'));

                  let tileBg = '#050505';
                  let tileBorder = '1.5px solid #E5E7EB';
                  let tileColor = '#FFFFFF';

                  if (isWicketTile) {
                    tileBg = 'linear-gradient(180deg, #EF4444 0%, #DC2626 55%, #991B1B 100%)';
                    tileBorder = '1.6px solid #FCA5A5';
                    tileColor = '#FFFFFF';
                  } else if (isWideTile) {
                    tileBg = 'linear-gradient(180deg, #22C55E 0%, #16A34A 55%, #15803D 100%)';
                    tileBorder = '1.6px solid #86EFAC';
                    tileColor = '#FFFFFF';
                  } else if (isSixTile) {
                    tileBg = 'linear-gradient(180deg, #FEF08A 0%, #FACC15 52%, #CA8A04 100%)';
                    tileBorder = '1.6px solid #FEF9C3';
                    tileColor = '#09090B';
                  } else if (isFourTile) {
                    tileBg = 'linear-gradient(180deg, #3B82F6 0%, #1D4ED8 55%, #1E3A8A 100%)';
                    tileBorder = '1.6px solid #93C5FD';
                    tileColor = '#FFFFFF';
                  } else if (isNoBallTile) {
                    tileBg = '#050505';
                    tileBorder = '1.6px solid #EF4444';
                    tileColor = '#FF3B3B';
                  }

                  return (
                    <span
                      key={b.id}
                      className="inline-flex items-center justify-center rounded-[4px] font-black leading-none shrink-0"
                      style={{
                        minWidth: '25px',
                        height: '25px',
                        padding: '0 4px',
                        background: tileBg,
                        border: tileBorder,
                        color: tileColor,
                        fontSize: raw.length > 2 ? '10px' : raw.length === 2 ? '11px' : '14px',
                      }}
                    >
                      {isDot ? (
                        <span
                          className="inline-block rounded-full bg-white"
                          style={{ width: '9px', height: '9px' }}
                        />
                      ) : (
                        raw
                      )}
                    </span>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* ================= ROW 2: MAIN HORIZONTAL METALLIC + ROYAL BLUE BAR ================= */}
        {/* Col 1: Left Team Flag / Logo */}
        <div
          style={{
            gridColumn: '1 / 2',
            gridRow: '2 / 3',
            height: '44px',
            background: '#D1D5DB',
            border: '2px solid #E5E7EB',
            boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
          }}
          className="overflow-hidden"
        >
          {renderTeamFlagOrCrest(
            cleanBat,
            batTeamLogo,
            effectiveShowLogo,
            batTeamColor,
            batTeamTextColor,
            'left'
          )}
        </div>

        {/* Full-Width World Cup Event Stinger OR In-Pati Banner (Cols 2–6 between team flags) */}
        {eventPreset ? (
          <div
            key={`wc-evt-${activeEvent?.id}`}
            style={{
              gridColumn: '2 / 7',
              gridRow: '2 / 3',
              height: '44px',
              background: eventPreset.bg,
              borderTop: `2px solid ${eventPreset.border}`,
              borderBottom: `2px solid ${eventPreset.border}`,
              borderRight: '2px solid #FFFFFF',
              boxShadow: '0 2px 10px rgba(0,0,0,0.45)',
              color: eventPreset.text,
            }}
            className="flex items-center justify-center gap-4 px-5 overflow-hidden relative z-20"
            role="status"
            aria-live="polite"
          >
            <span
              className="px-2.5 py-0.5 rounded-[3px] font-black uppercase tracking-wider shrink-0 shadow-xs"
              style={{
                background: eventPreset.badgeBg,
                color: eventPreset.badgeText,
                fontSize: '12px',
              }}
            >
              {eventPreset.badge}
            </span>
            <span
              className="font-black italic uppercase tracking-widest shrink-0"
              style={{
                fontSize: '26px',
                lineHeight: 1,
                textShadow:
                  eventPreset.text === '#09090B'
                    ? '0 1px 0 rgba(255,255,255,0.5)'
                    : '0 2px 6px rgba(0,0,0,0.55)',
              }}
            >
              {eventPreset.label}
            </span>
            <span
              className="px-2.5 py-0.5 rounded-[3px] font-extrabold uppercase tracking-wide truncate"
              style={{
                background: 'rgba(9, 9, 11, 0.35)',
                color: eventPreset.text === '#09090B' ? '#09090B' : '#FFFFFF',
                fontSize: '13px',
              }}
            >
              {eventPreset.caption}
            </span>
          </div>
        ) : effectiveBanner ? (
          <div
            style={{
              gridColumn: '2 / 7',
              gridRow: '2 / 3',
              height: '44px',
              background:
                effectiveBanner.kind === 'HIGHLIGHT'
                  ? 'linear-gradient(180deg, #0046C7 0%, #002B80 48%, #09090B 100%)'
                  : 'linear-gradient(180deg, #0046C7 0%, #0035A0 38%, #00237B 78%, #001A5C 100%)',
              borderTop:
                effectiveBanner.kind === 'WINNER' || effectiveBanner.kind === 'HIGHLIGHT'
                  ? '2px solid #FACC15'
                  : '2px solid #E2E8F0',
              borderBottom: '2px solid #94A3B8',
              borderRight: '2px solid #FFFFFF',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            }}
            className="flex items-center justify-center gap-3.5 px-5 overflow-hidden"
            role="status"
            aria-live="polite"
          >
            {effectiveBanner.kind === 'VERSUS' ? (
              <>
                <span className="font-black uppercase tracking-wide text-white text-[19px] truncate">
                  {effectiveBanner.leftTeamName || cleanBat}
                </span>
                <span
                  className="px-3 py-0.5 rounded-[3px] font-black italic uppercase tracking-wider shrink-0 shadow-sm"
                  style={{
                    background: 'linear-gradient(180deg, #FFFFFF 0%, #E2E8F0 65%, #CBD5E1 100%)',
                    color: '#00237B',
                    fontSize: '15px',
                    transform: 'skewX(-10deg)',
                  }}
                >
                  VS
                </span>
                <span className="font-black uppercase tracking-wide text-white text-[19px] truncate">
                  {effectiveBanner.rightTeamName || cleanBowl}
                </span>
              </>
            ) : (
              <>
                {effectiveBanner.kind === 'WINNER' && <span aria-hidden="true">🏆</span>}
                <span
                  className="px-2.5 py-0.5 rounded-[3px] font-black uppercase tracking-wider shrink-0 shadow-xs"
                  style={{
                    background:
                      effectiveBanner.kind === 'WINNER' || effectiveBanner.kind === 'HIGHLIGHT'
                        ? 'linear-gradient(180deg, #FEF08A 0%, #FACC15 100%)'
                        : 'linear-gradient(180deg, #FFFFFF 0%, #CBD5E1 100%)',
                    color: '#001A5C',
                    fontSize: '12px',
                  }}
                >
                  {effectiveBanner.badge}
                </span>
                <span className="font-black uppercase tracking-wide text-white text-[18px] truncate">
                  {effectiveBanner.headline}
                </span>
                {effectiveBanner.kind === 'WINNER' && <span aria-hidden="true">🏆</span>}
              </>
            )}
          </div>
        ) : (
          <>

        {/* Col 2: Slanted Metallic White Team Code Tab */}
        <div
          style={{
            gridColumn: '2 / 3',
            gridRow: '2 / 3',
            height: '44px',
            background: 'linear-gradient(180deg, #E2E8F0 0%, #FFFFFF 36%, #E2E8F0 72%, #94A3B8 100%)',
            borderTop: '2px solid #F8FAFC',
            borderBottom: '2px solid #94A3B8',
            borderRight: '2px solid #FFFFFF',
            boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
          }}
          className="relative flex items-center justify-center px-1 overflow-hidden"
        >
          <div
            className="w-[92%] h-[38px] flex items-center justify-center"
            style={{
              background: 'linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 55%, #CBD5E1 100%)',
              border: '1.5px solid #D1D5DB',
              transform: 'skewX(-10deg)',
              boxShadow: 'inset 0 1px 0 #FFFFFF, 0 1px 3px rgba(0,0,0,0.18)',
            }}
          >
            <span
              className="font-black uppercase tracking-tight truncate px-1"
              style={{
                color: '#09090B',
                fontSize: cleanBat.length > 4 ? '15px' : '20px',
                lineHeight: 1,
                fontStyle: 'italic',
                transform: 'skewX(4deg)',
              }}
            >
              {cleanBat.slice(0, 6)}
            </span>
          </div>
        </div>

        {/* Col 3: Metallic Silver Score Box (Runs / Wickets) */}
        <div
          style={{
            gridColumn: '3 / 4',
            gridRow: '2 / 3',
            height: '44px',
            background: 'linear-gradient(180deg, #CBD5E1 0%, #F8FAFC 28%, #E2E8F0 64%, #94A3B8 100%)',
            borderTop: '2px solid #F8FAFC',
            borderBottom: '2px solid #94A3B8',
            borderRight: '2px solid #FFFFFF',
            boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
          }}
          className="flex items-center justify-center px-2"
        >
          <span
            className={`font-black tabular-nums tracking-tight transition-transform duration-200 ${
              scoreFlash ? 'scale-110' : 'scale-100'
            }`}
            style={{
              color: '#050505',
              fontSize: '23px',
              lineHeight: 1,
            }}
          >
            {runs} / {wickets}
          </span>
        </div>

        {/* Col 4: Metallic Silver Overs Box */}
        <div
          style={{
            gridColumn: '4 / 5',
            gridRow: '2 / 3',
            height: '44px',
            background: 'linear-gradient(180deg, #CBD5E1 0%, #F8FAFC 28%, #E2E8F0 64%, #94A3B8 100%)',
            borderTop: '2px solid #F8FAFC',
            borderBottom: '2px solid #94A3B8',
            borderRight: '2px solid #FFFFFF',
            boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
          }}
          className="flex items-center justify-center px-1.5"
        >
          <span
            className="font-black tabular-nums"
            style={{
              color: '#0A3B78',
              fontSize: '20px',
              lineHeight: 1,
            }}
          >
            {oversText}
          </span>
        </div>

        {/* Col 5: Deep Royal Blue Batters Panel */}
        <div
          style={{
            gridColumn: '5 / 6',
            gridRow: '2 / 3',
            height: '44px',
            background:
              'linear-gradient(180deg, #0046C7 0%, #0035A0 38%, #00237B 78%, #001A5C 100%)',
            borderTop: '2px solid #93C5FD',
            borderBottom: '2px solid #1E3A8A',
            borderRight: '2px solid #FFFFFF',
            boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
          }}
          className="flex items-center justify-between px-3 gap-4 overflow-hidden"
        >
          {winnerInfo ? (
            <div className="w-full flex items-center justify-center gap-2 text-white font-black uppercase tracking-wide text-[16px] truncate">
              <span aria-hidden="true">🏆</span>
              <span className="text-[#FACC15]">{winnerInfo.badge}</span>
              <span className="truncate">{winnerInfo.headline}</span>
            </div>
          ) : (
            <>
              {/* Batter 1 */}
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span
                  aria-hidden="true"
                  className="shrink-0"
                  style={{
                    color: strikerIndex === 1 ? '#FACC15' : 'transparent',
                    fontSize: '13px',
                    lineHeight: 1,
                  }}
                >
                  ▶
                </span>
                <span
                  className="font-bold text-white truncate"
                  style={{ fontSize: '17px', lineHeight: 1.1 }}
                >
                  {batter1Name}
                </span>
                {batter1Runs !== undefined && batter1Runs !== '' && (
                  <span
                    className="font-extrabold text-white tabular-nums shrink-0"
                    style={{ fontSize: '17px', lineHeight: 1.1 }}
                  >
                    {batter1Runs} ({batter1Balls ?? 0})
                  </span>
                )}
              </div>

              {/* Batter 2 */}
              <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1">
                {strikerIndex === 2 && (
                  <span
                    aria-hidden="true"
                    className="shrink-0"
                    style={{
                      color: '#FACC15',
                      fontSize: '13px',
                      lineHeight: 1,
                    }}
                  >
                    ▶
                  </span>
                )}
                <span
                  className="font-bold text-white truncate"
                  style={{ fontSize: '17px', lineHeight: 1.1 }}
                >
                  {batter2Name}
                </span>
                {batter2Runs !== undefined && batter2Runs !== '' && (
                  <span
                    className="font-extrabold text-white tabular-nums shrink-0"
                    style={{ fontSize: '17px', lineHeight: 1.1 }}
                  >
                    {batter2Runs} ({batter2Balls ?? 0})
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Col 6: Metallic Silver Bowler Panel */}
        <div
          style={{
            gridColumn: '6 / 7',
            gridRow: '2 / 3',
            height: '44px',
            background: 'linear-gradient(180deg, #CBD5E1 0%, #F8FAFC 28%, #E2E8F0 64%, #94A3B8 100%)',
            borderTop: '2px solid #F8FAFC',
            borderBottom: '2px solid #94A3B8',
            borderRight: '2px solid #FFFFFF',
            boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
          }}
          className="flex items-center justify-center px-2.5 overflow-hidden"
        >
          <span
            className="font-extrabold uppercase truncate tabular-nums"
            style={{
              color: '#09090B',
              fontSize: '16px',
              lineHeight: 1.1,
            }}
          >
            {bowlerName} - {bowlerFigs} ({bowlerOvers})
          </span>
        </div>
          </>
        )}

        {/* Col 7: Right Team Flag / Logo */}
        <div
          style={{
            gridColumn: '7 / 8',
            gridRow: '2 / 3',
            height: '44px',
            background: '#D1D5DB',
            border: '2px solid #E5E7EB',
            boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
          }}
          className="overflow-hidden"
        >
          {renderTeamFlagOrCrest(
            cleanBowl,
            bowlTeamLogo,
            effectiveShowLogo,
            bowlTeamColor,
            bowlTeamTextColor,
            'right'
          )}
        </div>

        {/* ================= ROW 3: BOTTOM RUN RATE BOX + GLOSSY BLACK TICKER ================= */}
        {/* Bottom-Left: RUN RATE / REQ RUN RATE metallic white-silver box aligned right beside black bar */}
        <div
          style={{
            gridColumn: '3 / 5',
            gridRow: '3 / 4',
            height: '30px',
          }}
          className="flex justify-end"
        >
          <div
            className="h-full px-3 flex items-center justify-center gap-1.5 whitespace-nowrap shadow-md"
            style={{
              minWidth: '162px',
              background: 'linear-gradient(180deg, #FFFFFF 0%, #E5E7EB 58%, #B4BCC6 100%)',
              borderLeft: '1.5px solid #D1D5DB',
              borderBottom: '1.5px solid #9CA3AF',
              borderRight: '1.5px solid #D1D5DB',
            }}
          >
            <span
              className="font-semibold uppercase tracking-tight"
              style={{ color: '#111827', fontSize: '13px', lineHeight: 1 }}
            >
              {effectiveBanner ? effectiveBanner.badge : rateLabel}
            </span>
            {!effectiveBanner && (
              <span
                className="font-black tabular-nums"
                style={{ color: '#000000', fontSize: '15px', lineHeight: 1 }}
              >
                {rateValue}
              </span>
            )}
          </div>
        </div>

        {/* Bottom-Center: Glossy Black Info Ticker (exact same width as Blue Batters panel) */}
        <div
          style={{
            gridColumn: '5 / 6',
            gridRow: '3 / 4',
            height: '30px',
            background: 'linear-gradient(180deg, #27272A 0%, #09090B 52%, #000000 100%)',
            borderBottom: '1.5px solid #3F3F46',
            borderRight: '1.5px solid #3F3F46',
          }}
          className="flex items-center justify-center px-3 shadow-md overflow-hidden"
        >
          <span
            className="font-semibold uppercase tracking-wide text-white truncate"
            style={{ fontSize: '14px', lineHeight: 1 }}
          >
            {effectiveBanner ? effectiveBanner.subline || tickerText : tickerText}
          </span>
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
