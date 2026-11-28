import type { ReactNode } from 'react';
import type { ScoreboardBarStyle } from '../../data/cricketSampleData';
import type {
  ScoreboardBottomNeedInfo,
  ScoreboardPatiBanner,
  TataIplEventBanner,
} from './TataIplScoreboardBar';

export interface ProScoreboardBallDot {
  id: string;
  label: string;
  isBoundary4?: boolean;
  isBoundary6?: boolean;
  isWicket?: boolean;
  isExtra?: boolean;
}

interface ProScoreboardBarProps {
  barStyle: ScoreboardBarStyle;
  leftTeam: string;
  rightTeam: string;
  strikerName: string;
  strikerScore?: string;
  nonStrikerName: string;
  nonStrikerScore?: string;
  scoreText: string;
  oversText: string;
  bowlerName: string;
  bowlerFigures?: string;
  secondaryRightText?: string;
  balls?: ProScoreboardBallDot[];
  infoStrip?: string;
  footerRight?: string;
  accentColor?: string;
  primaryColor?: string;
  compact?: boolean;
  leftBadgeExtra?: ReactNode;
  rightBadgeExtra?: ReactNode;
  activeEvent?: TataIplEventBanner | null;
  patiBanner?: ScoreboardPatiBanner | null;
  bottomNeed?: ScoreboardBottomNeedInfo | null;
}

function renderBallCircle(
  ball: ProScoreboardBallDot,
  mode: ScoreboardBarStyle['ballMode'],
  compact: boolean,
  bowlerTextIsDark: boolean
) {
  const sizeCls = compact
    ? 'w-3.5 h-3.5 text-[7px]'
    : 'w-6 h-6 text-[11px]';

  if (mode === 'colored') {
    let bg = '#334155';
    let color = '#FFFFFF';
    if (ball.isWicket) {
      bg = '#DC2626';
    } else if (ball.isBoundary6) {
      bg = '#7C3AED';
    } else if (ball.isBoundary4) {
      bg = '#FACC15';
      color = '#0F172A';
    } else if (ball.isExtra) {
      bg = '#16A34A';
    } else if (ball.label === '•' || ball.label === '0') {
      bg = 'transparent';
      color = bowlerTextIsDark ? '#0F172A' : '#FFFFFF';
    }
    const isEmpty = ball.label === '' || ball.label === '•';
    return (
      <span
        key={ball.id}
        className={`inline-flex items-center justify-center rounded-full font-black leading-none shrink-0 ${sizeCls}`}
        style={{
          background: isEmpty ? 'transparent' : bg,
          color,
          border: isEmpty
            ? `1.5px solid ${bowlerTextIsDark ? '#1E293B' : '#E2E8F0'}`
            : '1px solid rgba(255,255,255,0.45)',
        }}
      >
        {isEmpty ? '' : ball.label}
      </span>
    );
  }

  if (mode === 'solid-white') {
    const fillBg = ball.isWicket
      ? '#DC2626'
      : ball.isBoundary6
        ? '#7C3AED'
        : ball.isBoundary4
          ? '#FACC15'
          : ball.isExtra
            ? '#16A34A'
            : '#FFFFFF';
    const textColor =
      ball.isWicket || ball.isBoundary6 || ball.isExtra
        ? '#FFFFFF'
        : '#0F172A';
    return (
      <span
        key={ball.id}
        className={`inline-flex items-center justify-center rounded-full font-black leading-none shrink-0 border border-slate-800/40 ${sizeCls}`}
        style={{ background: fillBg, color: textColor }}
      >
        {ball.label === '•' ? '0' : ball.label}
      </span>
    );
  }

  // Outline / CricAstra ring style
  const strokeColor =
    mode === 'cric-astra'
      ? '#0F172A'
      : bowlerTextIsDark
        ? '#0F172A'
        : '#FFFFFF';
  const fillBg = ball.isWicket
    ? '#DC2626'
    : ball.isBoundary6
      ? '#7C3AED'
      : ball.isBoundary4
        ? '#FACC15'
        : ball.isExtra
          ? '#16A34A'
          : 'transparent';
  const textColor =
    ball.isWicket || ball.isBoundary6 || ball.isExtra
      ? '#FFFFFF'
      : ball.isBoundary4
        ? '#0F172A'
        : strokeColor;

  return (
    <span
      key={ball.id}
      className={`inline-flex items-center justify-center rounded-full font-black leading-none shrink-0 ${sizeCls}`}
      style={{
        background: fillBg,
        color: textColor,
        border: `1.5px solid ${strokeColor}`,
      }}
    >
      {ball.label === '•' ? '' : ball.label}
    </span>
  );
}

export function ProScoreboardBar({
  barStyle,
  leftTeam,
  rightTeam,
  strikerName,
  strikerScore,
  nonStrikerName,
  nonStrikerScore,
  scoreText,
  oversText,
  bowlerName,
  bowlerFigures,
  secondaryRightText,
  balls = [],
  infoStrip,
  footerRight,
  accentColor = '#FACC15',
  primaryColor = '#0B1E8A',
  compact = false,
  leftBadgeExtra,
  rightBadgeExtra,
  activeEvent = null,
  patiBanner = null,
  bottomNeed = null,
}: ProScoreboardBarProps) {
  const bowlerTextIsDark = barStyle.bowlerPanelText === '#0F172A';
  const isCricAstra = barStyle.ballMode === 'cric-astra';

  const normalizedEvt = activeEvent
    ? String(activeEvent.type || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
    : '';
  const cleanEvtCaption = activeEvent?.caption
    ? activeEvent.caption.replace(/!+/g, '').trim()
    : '';
  const proEvent = activeEvent
    ? normalizedEvt === 'WICKET' || normalizedEvt === 'OUT' || normalizedEvt === 'W'
      ? {
          badge: `${rightTeam} WICKET`,
          headline: 'WICKET OUT',
          caption: cleanEvtCaption || `${bowlerName} STRIKES`,
          bg: 'linear-gradient(90deg, #7F1D1D 0%, #DC2626 50%, #7F1D1D 100%)',
        }
      : normalizedEvt === 'SIX' || normalizedEvt === '6'
        ? {
            badge: `${leftTeam} • 6 RUNS`,
            headline: 'MAXIMUM SIX',
            caption: cleanEvtCaption || `${strikerName} • HUGE SIXER`,
            bg: `linear-gradient(90deg, ${primaryColor} 0%, #D97706 50%, ${primaryColor} 100%)`,
          }
        : normalizedEvt === 'FOUR' || normalizedEvt === '4'
          ? {
              badge: `${leftTeam} • 4 RUNS`,
              headline: 'CRACKING FOUR',
              caption: cleanEvtCaption || `${strikerName} • BOUNDARY`,
              bg: `linear-gradient(90deg, ${primaryColor} 0%, #1D4ED8 50%, ${primaryColor} 100%)`,
            }
          : normalizedEvt === 'NOBALL' || normalizedEvt === 'NB'
            ? {
                badge: 'NO BALL +1',
                headline: 'NO BALL',
                caption: cleanEvtCaption || `FREE HIT NEXT • ${strikerName}`,
                bg: `linear-gradient(90deg, ${primaryColor} 0%, #B45309 50%, ${primaryColor} 100%)`,
              }
            : normalizedEvt === 'WIDE' || normalizedEvt === 'WD' || normalizedEvt === 'WIDEBALL'
              ? {
                  badge: 'WIDE +1',
                  headline: 'WIDE BALL',
                  caption: cleanEvtCaption || `${bowlerName} • EXTRA RUN`,
                  bg: `linear-gradient(90deg, ${primaryColor} 0%, #0F172A 50%, ${primaryColor} 100%)`,
                }
              : {
                  badge: leftTeam,
                  headline: activeEvent.type.replace(/!+/g, '').toUpperCase(),
                  caption: cleanEvtCaption || `${strikerName} ON STRIKE`,
                  bg: `linear-gradient(90deg, ${primaryColor} 0%, #0F172A 50%, ${primaryColor} 100%)`,
                }
    : null;

  const displayBalls: ProScoreboardBallDot[] =
    balls.length > 0
      ? balls.slice(-6)
      : isCricAstra
        ? Array.from({ length: 5 }, (_, i) => ({ id: `empty-${i}`, label: '•' }))
        : barStyle.ballMode === 'colored'
          ? [
              { id: 'p1', label: '1' },
              { id: 'p2', label: '4', isBoundary4: true },
              { id: 'p3', label: '6', isBoundary6: true },
              { id: 'p4', label: '•' },
            ]
          : barStyle.ballMode === 'solid-white'
            ? [
                { id: 's1', label: '0' },
                { id: 's2', label: '0' },
                { id: 's3', label: '0' },
                { id: 's4', label: '0' },
              ]
            : [
                { id: 'e1', label: '•' },
                { id: 'e2', label: '•' },
              ];

  const sunburstStyle = barStyle.sunburstRight
    ? {
        backgroundImage:
          'repeating-conic-gradient(from 0deg at 78% 50%, #FACC15 0deg 10deg, #09090B 10deg 22deg)',
      }
    : { background: barStyle.rightBadgeBg };

  return (
    <div className="w-full select-none">
      <div
        className={`relative w-full flex items-stretch overflow-hidden ${
          compact ? 'rounded-lg h-[48px]' : 'rounded-2xl h-[78px]'
        }`}
        style={{
          border: `${compact ? '1.5px' : '2.5px'} solid ${barStyle.outerBorder}`,
          boxShadow: compact
            ? `0 2px 10px ${barStyle.outerGlow}`
            : `0 10px 30px rgba(0,0,0,0.55), 0 0 18px ${barStyle.outerGlow}`,
          background: '#090D16',
        }}
      >
        {/* Full-Width Event Stinger Overlay inside ProScoreboardBar */}
        {proEvent && !compact && (
          <div
            key={activeEvent?.id}
            className="absolute inset-0 z-30 flex items-center justify-center gap-4 px-8 text-white"
            style={{
              background: proEvent.bg,
              borderTop: `2px solid ${accentColor}`,
              borderBottom: `2px solid ${accentColor}`,
            }}
            role="status"
            aria-live="polite"
          >
            <span
              className="px-3 py-1 rounded font-display font-black uppercase text-xs tracking-wider shrink-0"
              style={{ background: accentColor, color: '#090D16' }}
            >
              {proEvent.badge}
            </span>
            <span className="font-display font-black italic uppercase text-3xl tracking-widest shrink-0 drop-shadow">
              {proEvent.headline}
            </span>
            <span className="px-3 py-1 rounded bg-black/45 border border-white/25 font-bold uppercase text-xs tracking-wide truncate">
              {proEvent.caption}
            </span>
          </div>
        )}

        {/* 1. LEFT TEAM BADGE */}
        <div
          className={`flex items-center justify-center gap-1.5 font-display font-black uppercase tracking-wide shrink-0 ${
            compact ? 'w-[42px] text-[11px] px-1' : 'w-[104px] text-xl px-2.5'
          }`}
          style={{
            background: barStyle.leftBadgeBg,
            color: barStyle.leftBadgeText,
          }}
        >
          {leftBadgeExtra}
          <span className="truncate">{leftTeam}</span>
        </div>

        {patiBanner ? (
          <div
            className="flex-1 min-w-0 flex items-center justify-center gap-4 px-6 text-white overflow-hidden"
            style={{
              background: `linear-gradient(90deg, ${primaryColor} 0%, #0F172A 50%, ${primaryColor} 100%)`,
            }}
            role="status"
            aria-live="polite"
          >
            {patiBanner.kind === 'VERSUS' ? (
              <>
                <span className="font-display font-black uppercase text-xl tracking-wide truncate">
                  {patiBanner.leftTeamName || leftTeam}
                </span>
                <span
                  className="px-3 py-0.5 rounded font-display font-black italic uppercase text-sm shrink-0"
                  style={{ background: accentColor, color: '#090D16' }}
                >
                  VS
                </span>
                <span className="font-display font-black uppercase text-xl tracking-wide truncate">
                  {patiBanner.rightTeamName || rightTeam}
                </span>
              </>
            ) : (
              <>
                {patiBanner.kind === 'WINNER' && <span aria-hidden="true">🏆</span>}
                <span
                  className="px-3 py-0.5 rounded font-display font-black uppercase text-xs tracking-wider shrink-0"
                  style={{ background: accentColor, color: '#090D16' }}
                >
                  {patiBanner.badge}
                </span>
                <span className="font-display font-black uppercase text-xl tracking-wide truncate">
                  {patiBanner.headline}
                </span>
                {patiBanner.kind === 'WINNER' && <span aria-hidden="true">🏆</span>}
              </>
            )}
          </div>
        ) : (
          <>

        {/* 2. BATTERS PANEL */}
        <div
          className={`flex-1 min-w-0 flex flex-col justify-center ${
            compact ? 'px-2 py-0.5 text-[9px] leading-tight' : 'px-4 py-1.5 text-sm leading-snug'
          }`}
          style={{
            background: barStyle.batterPanelBg,
            color: barStyle.batterPanelText,
          }}
        >
          <div className="flex items-center justify-between gap-1.5 font-bold">
            <span className="inline-flex items-center gap-1 min-w-0 truncate">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className={`${compact ? 'w-2.5 h-2.5' : 'w-4 h-4'} shrink-0`}
                style={{ color: accentColor }}
                aria-label="On strike"
              >
                <path
                  d="M16.5 7.5 20.5 3.5"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
                <path
                  d="M14.4 6.4a1.2 1.2 0 0 1 1.7 0l1.5 1.5a1.2 1.2 0 0 1 0 1.7L9.3 17.9a2.2 2.2 0 0 1-3.1 0l-1.1-1.1a2.2 2.2 0 0 1 0-3.1l9.3-7.3Z"
                  fill="currentColor"
                />
              </svg>
              <span className="truncate">{strikerName}</span>
            </span>
            {strikerScore && (
              <span className="tabular-nums font-black shrink-0">{strikerScore}</span>
            )}
          </div>
          <div className="flex items-center justify-between gap-1.5 font-semibold opacity-85">
            <span className={`truncate ${compact ? 'pl-3.5' : 'pl-5'}`}>{nonStrikerName}</span>
            {nonStrikerScore && (
              <span className="tabular-nums font-bold shrink-0">{nonStrikerScore}</span>
            )}
          </div>
        </div>

        {/* 3. CENTER CURVED SCORE PILL */}
        <div
          className={`relative flex flex-col items-center justify-center shrink-0 overflow-hidden ${
            compact
              ? 'w-[96px] -mx-1.5 z-10 rounded-full'
              : 'w-[220px] -mx-3 z-10 rounded-full'
          }`}
          style={{
            background: barStyle.scorePillBg,
            color: barStyle.scorePillText,
            border: `${compact ? '1.5px' : '2.5px'} solid ${barStyle.scorePillBorder}`,
            boxShadow: `0 0 ${compact ? '8px' : '16px'} ${barStyle.outerGlow}`,
          }}
        >
          <div
            className={`w-full flex-1 flex items-center justify-center font-display font-black tabular-nums tracking-tight ${
              compact ? 'text-[15px] leading-none pt-0.5' : 'text-[30px] leading-none pt-1'
            }`}
          >
            {scoreText}
          </div>
          <div
            className={`w-full flex items-center justify-center font-bold tabular-nums ${
              compact
                ? 'text-[8px] py-0.5 leading-none'
                : 'text-xs py-1 leading-none'
            }`}
            style={
              barStyle.scoreBottomBg
                ? {
                    background: barStyle.scoreBottomBg,
                    color: barStyle.scoreBottomText || '#0F172A',
                  }
                : { opacity: 0.9 }
            }
          >
            {oversText}
          </div>
        </div>

        {/* 4. BOWLER + OVER BALLS PANEL OR OVERSIZED BOTTOM NEED BLOCK */}
        <div
          className={`flex-1 min-w-0 flex flex-col justify-center ${
            bottomNeed
              ? compact
                ? 'pl-2 pr-1.5 py-0.5'
                : 'pl-4 pr-3 py-1'
              : compact
                ? 'pl-3 pr-2 py-0.5 text-[9px] leading-tight'
                : 'pl-6 pr-4 py-1.5 text-sm leading-snug'
          }`}
          style={{
            background: barStyle.bowlerPanelBg,
            color: barStyle.bowlerPanelText,
          }}
        >
          {bottomNeed ? (
            <div
              className="w-full h-full flex items-center justify-between tabular-nums"
              aria-label={`${bottomNeed.runsValue} ${bottomNeed.middleTop} ${bottomNeed.middleBottom} ${bottomNeed.ballsValue} ${bottomNeed.rightLabel}`}
            >
              <div className="flex-1 flex items-center justify-center px-1">
                <span
                  className="font-display font-black leading-none tracking-tight"
                  style={{
                    color: bowlerTextIsDark ? '#DC2626' : accentColor,
                    fontSize: compact ? '18px' : '34px',
                  }}
                >
                  {bottomNeed.runsValue}
                </span>
              </div>
              <div
                aria-hidden="true"
                className="h-[68%] w-[1.5px] shrink-0"
                style={{
                  background: bowlerTextIsDark
                    ? 'rgba(15, 23, 42, 0.55)'
                    : 'rgba(255, 255, 255, 0.45)',
                }}
              />
              <div className="flex flex-col items-center justify-center px-2 leading-none shrink-0">
                <span
                  className="font-display font-black uppercase tracking-wider"
                  style={{ fontSize: compact ? '7px' : '12px', lineHeight: 1.08 }}
                >
                  {bottomNeed.middleTop}
                </span>
                <span
                  className="font-display font-black uppercase tracking-wider opacity-90"
                  style={{ fontSize: compact ? '7px' : '12px', lineHeight: 1.08 }}
                >
                  {bottomNeed.middleBottom}
                </span>
              </div>
              <div
                aria-hidden="true"
                className="h-[68%] w-[1.5px] shrink-0"
                style={{
                  background: bowlerTextIsDark
                    ? 'rgba(15, 23, 42, 0.55)'
                    : 'rgba(255, 255, 255, 0.45)',
                }}
              />
              <div className="flex-1 flex items-center justify-center px-1">
                <span
                  className="font-display font-black leading-none tracking-tight"
                  style={{
                    color: bowlerTextIsDark ? '#DC2626' : accentColor,
                    fontSize: compact ? '18px' : '34px',
                  }}
                >
                  {bottomNeed.ballsValue}
                </span>
              </div>
              <div
                aria-hidden="true"
                className="h-[68%] w-[1.5px] shrink-0"
                style={{
                  background: bowlerTextIsDark
                    ? 'rgba(15, 23, 42, 0.55)'
                    : 'rgba(255, 255, 255, 0.45)',
                }}
              />
              <div className="flex items-center justify-center pl-2.5 pr-1 shrink-0">
                <span
                  className="font-display font-black uppercase tracking-wider"
                  style={{ fontSize: compact ? '9px' : '15px', lineHeight: 1 }}
                >
                  {bottomNeed.rightLabel}
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-1 font-bold">
                <span className="truncate">{bowlerName}</span>
                {bowlerFigures && (
                  <span className="tabular-nums font-black shrink-0">{bowlerFigures}</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1.5 mt-0.5">
                {secondaryRightText ? (
                  <span className="truncate font-semibold opacity-85">
                    {secondaryRightText}
                  </span>
                ) : (
                  <span />
                )}
                {!isCricAstra && (
                  <div className="flex items-center gap-1 shrink-0">
                    {displayBalls.slice(0, compact ? 4 : 6).map((b) =>
                      renderBallCircle(b, barStyle.ballMode, compact, bowlerTextIsDark)
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* 4B. CRICASTRA DEDICATED GOLD OVER-BALLS STRIP (hidden while Bottom Need spans right panel) */}
        {isCricAstra && !bottomNeed && (
          <div
            className={`flex items-center justify-center gap-1 shrink-0 ${
              compact ? 'px-2.5' : 'px-5 gap-2'
            }`}
            style={{
              background: 'linear-gradient(180deg, #FDE047, #EAB308)',
              borderLeft: '2px solid #FEF08A',
            }}
          >
            {displayBalls.slice(0, compact ? 5 : 6).map((b) =>
              renderBallCircle(b, 'cric-astra', compact, true)
            )}
          </div>
        )}
          </>
        )}

        {/* 5. RIGHT TEAM BADGE */}
        <div
          className={`relative flex items-center justify-center gap-1.5 font-display font-black uppercase tracking-wide shrink-0 overflow-hidden ${
            compact ? 'w-[42px] text-[11px] px-1' : 'w-[104px] text-xl px-2.5'
          }`}
          style={{
            ...sunburstStyle,
            color: barStyle.rightBadgeText,
          }}
        >
          {barStyle.sunburstRight && (
            <span className="relative z-10 px-1.5 py-0.5 rounded bg-black/75 text-white truncate">
              {rightTeam}
            </span>
          )}
          {!barStyle.sunburstRight && (
            <>
              {rightBadgeExtra}
              <span className="truncate">{rightTeam}</span>
            </>
          )}
        </div>
      </div>

      {/* Live Bottom Info Ticker Strip (only in full live overlay mode) */}
      {!compact && (patiBanner?.subline || infoStrip) && (
        <div
          className="mx-6 mt-1 px-5 py-1 rounded-b-xl flex items-center justify-between text-[11px] font-bold tracking-wide text-white shadow-lg border-x border-b border-white/20"
          style={{ background: primaryColor }}
        >
          <span className="truncate">{patiBanner?.subline || infoStrip}</span>
          {footerRight && (
            <span className="uppercase shrink-0 ml-4" style={{ color: accentColor }}>
              {footerRight}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
