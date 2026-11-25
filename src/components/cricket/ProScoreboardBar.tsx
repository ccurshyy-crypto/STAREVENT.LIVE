import type { ReactNode } from 'react';
import type { ScoreboardBarStyle } from '../../data/cricketSampleData';

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
    let bg = '#9333EA';
    let color = '#FFFFFF';
    if (ball.isWicket) {
      bg = '#DC2626';
    } else if (ball.isBoundary6) {
      bg = '#0EA5E9';
    } else if (ball.isBoundary4) {
      bg = '#F59E0B';
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
    return (
      <span
        key={ball.id}
        className={`inline-flex items-center justify-center rounded-full font-black leading-none shrink-0 bg-white text-slate-900 border border-slate-800/40 ${sizeCls}`}
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
      ? '#0EA5E9'
      : ball.isBoundary4
        ? '#F59E0B'
        : 'transparent';
  const textColor =
    ball.isWicket || ball.isBoundary6
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
}: ProScoreboardBarProps) {
  const bowlerTextIsDark = barStyle.bowlerPanelText === '#0F172A';
  const isCricAstra = barStyle.ballMode === 'cric-astra';

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
        className={`w-full flex items-stretch overflow-hidden ${
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
            <span className="truncate">
              <span className="mr-0.5 opacity-90">▸</span>
              {strikerName}
            </span>
            {strikerScore && (
              <span className="tabular-nums font-black shrink-0">{strikerScore}</span>
            )}
          </div>
          <div className="flex items-center justify-between gap-1.5 font-semibold opacity-85">
            <span className="truncate pl-2">{nonStrikerName}</span>
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

        {/* 4. BOWLER + OVER BALLS PANEL */}
        <div
          className={`flex-1 min-w-0 flex flex-col justify-center ${
            compact ? 'pl-3 pr-2 py-0.5 text-[9px] leading-tight' : 'pl-6 pr-4 py-1.5 text-sm leading-snug'
          }`}
          style={{
            background: barStyle.bowlerPanelBg,
            color: barStyle.bowlerPanelText,
          }}
        >
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
        </div>

        {/* 4B. CRICASTRA DEDICATED GOLD OVER-BALLS STRIP */}
        {isCricAstra && (
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
      {!compact && infoStrip && (
        <div
          className="mx-6 mt-1 px-5 py-1 rounded-b-xl flex items-center justify-between text-[11px] font-bold tracking-wide text-white shadow-lg border-x border-b border-white/20"
          style={{ background: primaryColor }}
        >
          <span className="truncate">{infoStrip}</span>
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
