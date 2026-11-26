import { useEffect, useState } from 'react';
import { STUDIO_CONTACT } from '../../data/content';
import {
  computeLiveTimerSeconds,
  formatClockMMSS,
  KABADDI_TEAM_PALETTES,
  KabaddiScoreboardState,
  KabaddiTeamState,
} from '../../types/kabaddi';

interface KabaddiOverlayCanvasProps {
  state: KabaddiScoreboardState;
  bgMode?: 'transparent' | 'green' | 'arena';
}

function MatPlayerDots({
  count,
  align,
}: {
  count: number;
  align: 'left' | 'right';
}) {
  const safeCount = Math.max(0, Math.min(7, count));
  const superTackleOn = safeCount > 0 && safeCount <= 3;

  return (
    <div
      className={`flex items-center gap-1 ${
        align === 'right' ? 'justify-end' : 'justify-start'
      }`}
    >
      {Array.from({ length: 7 }).map((_, idx) => {
        const active = idx < safeCount;
        return (
          <span
            key={idx}
            className={`w-2.5 h-2.5 rounded-full border transition-all duration-200 ${
              active
                ? superTackleOn
                  ? 'bg-[#FFE600] border-white shadow-[0_0_8px_rgba(255,230,0,0.9)]'
                  : 'bg-white border-[#FFE600] shadow-[0_0_6px_rgba(255,255,255,0.75)]'
                : 'bg-black/45 border-white/25'
            }`}
          />
        );
      })}
      <span className="ml-1 font-mono text-[10px] font-black text-white/90 tabular-nums">
        {safeCount}/7
      </span>
    </div>
  );
}

function TeamBadgeRow({
  team,
  isRaiding,
  align,
}: {
  team: KabaddiTeamState;
  isRaiding: boolean;
  align: 'left' | 'right';
}) {
  const superTackleOn = team.playersOnMat > 0 && team.playersOnMat <= 3;
  const doOrDie = isRaiding && team.emptyRaids >= 2;

  return (
    <div
      className={`flex items-center gap-1.5 min-h-[18px] ${
        align === 'right' ? 'justify-end' : 'justify-start'
      }`}
    >
      {isRaiding && (
        <span className="px-1.5 py-[1px] rounded bg-[#FFE600] text-[#070B28] text-[9px] font-black uppercase tracking-wider shadow-sm">
          RAIDING
        </span>
      )}
      {doOrDie && (
        <span className="px-1.5 py-[1px] rounded bg-[#EF1A1A] text-white text-[9px] font-black uppercase tracking-wider border border-[#FFE600] animate-pulse">
          DO OR DIE
        </span>
      )}
      {superTackleOn && (
        <span className="px-1.5 py-[1px] rounded bg-[#070B28] text-[#FFE600] text-[9px] font-black uppercase tracking-wider border border-[#FFE600]/80">
          SUPER TACKLE ON
        </span>
      )}
    </div>
  );
}

/**
 * Canonical 1280x720 Broadcast Kabaddi Scoreboard Overlay Canvas
 * Designed for OBS Studio Browser Source & vMix Web Browser Input.
 */
export function KabaddiOverlayCanvas({
  state,
  bgMode = 'transparent',
}: KabaddiOverlayCanvasProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const hasRunningTimer =
      state.matchClock.running ||
      state.raidClock.running ||
      Boolean(state.alert && state.alert.expiresAtMs > Date.now());

    if (!hasRunningTimer) return;
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 200);
    return () => window.clearInterval(id);
  }, [
    state.matchClock.running,
    state.raidClock.running,
    state.alert?.triggeredAtMs,
    state.alert?.expiresAtMs,
  ]);

  const matchSec = computeLiveTimerSeconds(state.matchClock, nowMs);
  const raidSec = computeLiveTimerSeconds(state.raidClock, nowMs);
  const raidUrgent = state.raidClock.running && raidSec <= 10 && raidSec > 0;
  const raidExpired = raidSec === 0;

  const paletteA = KABADDI_TEAM_PALETTES[state.teamA.color] || KABADDI_TEAM_PALETTES.crimson;
  const paletteB = KABADDI_TEAM_PALETTES[state.teamB.color] || KABADDI_TEAM_PALETTES['royal-blue'];

  const activeAlert =
    state.alert && state.alert.type !== 'NONE' && state.alert.expiresAtMs > nowMs
      ? state.alert
      : null;

  const bgStyle =
    bgMode === 'green'
      ? { background: '#00B140' }
      : bgMode === 'arena'
        ? {
            background:
              'radial-gradient(circle at 50% 25%, #5C0612 0%, #1C030C 52%, #070B28 100%)',
          }
        : { background: 'transparent' };

  return (
    <div
      className="relative w-[1280px] h-[720px] overflow-hidden select-none font-sans"
      style={bgStyle}
    >
      {/* CENTER-STAGE ANIMATED BROADCAST ALERT (SUPER RAID / SUPER TACKLE / ALL OUT / BONUS / DO OR DIE) */}
      {activeAlert && (
        <div
          key={activeAlert.triggeredAtMs}
          className="kabaddi-alert-pop absolute inset-x-0 top-[150px] z-40 flex justify-center pointer-events-none px-8"
        >
          <div className="relative overflow-hidden rounded-2xl border-2 border-[#FFE600] bg-gradient-to-r from-[#58040B] via-[#990712] to-[#070B28] px-10 py-5 shadow-[0_24px_70px_rgba(0,0,0,0.85)] min-w-[520px] max-w-[780px] text-center">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#FFE600] to-transparent" />
            <div className="flex items-center justify-center gap-3 mb-1">
              <span className="px-3 py-0.5 rounded-md bg-[#FFE600] text-[#070B28] font-mono text-xs font-black uppercase tracking-widest">
                STAR EVENT LIVE · ALERT
              </span>
              {activeAlert.pointsBadge && (
                <span className="px-3 py-0.5 rounded-md bg-[#EF1A1A] text-white border border-white/40 font-mono text-xs font-black uppercase tracking-wider">
                  {activeAlert.pointsBadge}
                </span>
              )}
            </div>
            <h2 className="font-display text-5xl font-black uppercase tracking-tight text-[#FFE600] drop-shadow-[0_4px_18px_rgba(0,0,0,0.85)] leading-tight">
              {activeAlert.title}
            </h2>
            {activeAlert.subtitle && (
              <p className="mt-1 font-display text-lg font-extrabold uppercase tracking-wider text-white">
                {activeAlert.subtitle}
              </p>
            )}
          </div>
        </div>
      )}

      {/* FULL BROADCAST CARD: MATCH VS BANNER */}
      {state.activeCard === 'VERSUS' && (
        <div className="kabaddi-graphic-enter absolute inset-x-0 top-[145px] z-30 flex justify-center px-10">
          <div className="w-[980px] rounded-3xl overflow-hidden border-2 border-[#FFE600]/85 bg-gradient-to-br from-[#3B0207]/96 via-[#160516]/96 to-[#070B28]/96 shadow-[0_28px_80px_rgba(0,0,0,0.88)]">
            <div className="px-8 py-4 bg-gradient-to-r from-[#8F050E] via-[#C60C16] to-[#8F050E] border-b border-[#FFE600]/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={STUDIO_CONTACT.logoImagePath}
                  alt="Star Event Live"
                  className="w-11 h-11 rounded-full object-cover ring-2 ring-[#FFE600]"
                />
                <div>
                  <p className="font-display text-lg font-black uppercase tracking-wide text-[#FFE600]">
                    {state.tournamentName}
                  </p>
                  <p className="font-mono text-xs font-bold text-white/90">
                    {state.matchLabel}
                  </p>
                </div>
              </div>
              <span className="px-3.5 py-1.5 rounded-lg bg-[#070B28] border border-[#FFE600]/70 font-mono text-xs font-black text-[#FFE600] uppercase">
                LIVE KABADDI
              </span>
            </div>

            <div className="p-8 grid grid-cols-[1fr_auto_1fr] items-center gap-6">
              <div
                className="rounded-2xl p-6 text-center border-2 shadow-xl"
                style={{
                  background: paletteA.bgGradient,
                  borderColor: paletteA.border,
                }}
              >
                <span className="inline-block px-3 py-1 rounded-lg bg-black/40 border border-white/25 font-mono text-sm font-black text-[#FFE600] mb-2">
                  {state.teamA.shortName}
                </span>
                <h3 className="font-display text-3xl font-black text-white uppercase tracking-tight">
                  {state.teamA.name}
                </h3>
                <p className="mt-2 font-mono text-4xl font-black text-[#FFE600] tabular-nums">
                  {state.teamA.score}
                </p>
              </div>

              <div className="flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FFE600] to-[#F59E0B] border-4 border-white/80 flex items-center justify-center shadow-[0_0_32px_rgba(255,230,0,0.65)]">
                  <span className="font-display text-3xl font-black text-[#070B28]">VS</span>
                </div>
                <span className="mt-2 font-mono text-xs font-black text-[#FFE600] uppercase">
                  {state.half}
                </span>
              </div>

              <div
                className="rounded-2xl p-6 text-center border-2 shadow-xl"
                style={{
                  background: paletteB.bgGradient,
                  borderColor: paletteB.border,
                }}
              >
                <span className="inline-block px-3 py-1 rounded-lg bg-black/40 border border-white/25 font-mono text-sm font-black text-[#FFE600] mb-2">
                  {state.teamB.shortName}
                </span>
                <h3 className="font-display text-3xl font-black text-white uppercase tracking-tight">
                  {state.teamB.name}
                </h3>
                <p className="mt-2 font-mono text-4xl font-black text-[#FFE600] tabular-nums">
                  {state.teamB.score}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULL BROADCAST CARD: MATCH SUMMARY STATS */}
      {state.activeCard === 'SUMMARY' && (
        <div className="kabaddi-graphic-enter absolute inset-x-0 top-[115px] z-30 flex justify-center px-10">
          <div className="w-[920px] rounded-3xl overflow-hidden border-2 border-[#FFE600]/85 bg-gradient-to-br from-[#3B0207]/96 via-[#14051A]/96 to-[#070B28]/96 shadow-[0_28px_80px_rgba(0,0,0,0.9)]">
            <div className="px-7 py-4 bg-gradient-to-r from-[#8F050E] via-[#C60C16] to-[#8F050E] border-b border-[#FFE600]/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={STUDIO_CONTACT.logoImagePath}
                  alt="Star Event Live"
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-[#FFE600]"
                />
                <div>
                  <p className="font-display text-xl font-black uppercase text-[#FFE600]">
                    MATCH SUMMARY · {state.half}
                  </p>
                  <p className="text-xs font-bold text-white/90">{state.tournamentName}</p>
                </div>
              </div>
              <span className="font-mono text-sm font-black text-white px-3 py-1 rounded-lg bg-black/40 border border-[#FFE600]/50">
                {formatClockMMSS(matchSec)}
              </span>
            </div>

            <div className="p-6 space-y-3">
              {/* Header Scores */}
              <div className="grid grid-cols-[1fr_180px_1fr] items-center gap-4 pb-3 border-b border-white/15">
                <div className="flex items-center justify-between px-4 py-3 rounded-xl border" style={{ background: paletteA.bgGradient, borderColor: paletteA.border }}>
                  <span className="font-display text-xl font-black text-white uppercase truncate">
                    {state.teamA.name}
                  </span>
                  <span className="font-mono text-4xl font-black text-[#FFE600] tabular-nums ml-3">
                    {state.teamA.score}
                  </span>
                </div>
                <div className="text-center">
                  <span className="font-mono text-xs font-black uppercase tracking-widest text-[#FFE600]">
                    TOTAL SCORE
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 rounded-xl border" style={{ background: paletteB.bgGradient, borderColor: paletteB.border }}>
                  <span className="font-mono text-4xl font-black text-[#FFE600] tabular-nums mr-3">
                    {state.teamB.score}
                  </span>
                  <span className="font-display text-xl font-black text-white uppercase truncate text-right">
                    {state.teamB.name}
                  </span>
                </div>
              </div>

              {[
                { label: 'RAID POINTS', a: state.teamA.raidPoints, b: state.teamB.raidPoints },
                { label: 'TACKLE POINTS', a: state.teamA.tacklePoints, b: state.teamB.tacklePoints },
                { label: 'ALL OUTS', a: state.teamA.allOuts, b: state.teamB.allOuts },
                { label: 'BONUS POINTS', a: state.teamA.bonusPoints, b: state.teamB.bonusPoints },
                { label: 'PLAYERS ON MAT', a: state.teamA.playersOnMat, b: state.teamB.playersOnMat },
              ].map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[1fr_200px_1fr] items-center gap-4 px-4 py-2 rounded-xl bg-white/[0.06] border border-white/10"
                >
                  <div className="font-mono text-2xl font-black text-white text-right pr-6 tabular-nums">
                    {row.a}
                  </div>
                  <div className="text-center font-display text-xs font-extrabold uppercase tracking-widest text-[#FFE600]">
                    {row.label}
                  </div>
                  <div className="font-mono text-2xl font-black text-white text-left pl-6 tabular-nums">
                    {row.b}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM PRO KABADDI BROADCAST SCOREBOARD BAR */}
      {state.showScoreboard && (
        <div className="absolute inset-x-6 bottom-5 z-20">
          <div className="rounded-2xl overflow-hidden border-2 border-[#FFE600]/85 bg-gradient-to-r from-[#2D0309]/96 via-[#0C0B24]/98 to-[#070B28]/96 shadow-[0_18px_50px_rgba(0,0,0,0.85)]">
            {/* Top accent metallic highlight */}
            <div className="h-[3px] w-full bg-gradient-to-r from-[#EF1A1A] via-[#FFE600] to-[#EF1A1A]" />

            {/* Main 5-column scoreboard grid — animates winner inside the exact same bar on FULL TIME */}
            {state.half === 'FULL TIME' ? (
              <div className="grid grid-cols-[110px_1fr_110px] items-stretch min-h-[86px]">
                {/* Left Team Final Score Box */}
                <div
                  className="px-3 py-2 flex flex-col items-center justify-center border-r-2 border-[#FFE600]/70"
                  style={{ background: paletteA.bgGradient }}
                >
                  <span className="font-mono text-[11px] font-black text-[#FFE600] uppercase">
                    {state.teamA.shortName}
                  </span>
                  <span className="font-mono text-4xl font-black text-white leading-none tabular-nums">
                    {String(state.teamA.score).padStart(2, '0')}
                  </span>
                </div>

                {/* Center Animated Winner Display inside the exact same scoreboard bar */}
                <div className="ipl-win-strip">
                  <span className="ipl-win-trophy" aria-hidden="true">🏆</span>
                  <span className="ipl-win-badge">
                    {state.teamA.score === state.teamB.score ? 'FULL TIME' : 'WINNER'}
                  </span>
                  <span className="ipl-win-headline">
                    {state.teamA.score === state.teamB.score
                      ? 'MATCH TIED!'
                      : state.teamA.score > state.teamB.score
                        ? `${state.teamA.name} WON BY ${state.teamA.score - state.teamB.score} ${
                            state.teamA.score - state.teamB.score === 1 ? 'POINT' : 'POINTS'
                          }!`
                        : `${state.teamB.name} WON BY ${state.teamB.score - state.teamA.score} ${
                            state.teamB.score - state.teamA.score === 1 ? 'POINT' : 'POINTS'
                          }!`}
                  </span>
                  <span className="ipl-win-trophy" aria-hidden="true">🏆</span>
                </div>

                {/* Right Team Final Score Box */}
                <div
                  className="px-3 py-2 flex flex-col items-center justify-center border-l-2 border-[#FFE600]/70"
                  style={{ background: paletteB.bgGradient }}
                >
                  <span className="font-mono text-[11px] font-black text-[#FFE600] uppercase">
                    {state.teamB.shortName}
                  </span>
                  <span className="font-mono text-4xl font-black text-white leading-none tabular-nums">
                    {String(state.teamB.score).padStart(2, '0')}
                  </span>
                </div>
              </div>
            ) : (
            <div className="grid grid-cols-[1fr_104px_212px_104px_1fr] items-stretch min-h-[86px]">
              {/* TEAM A PANEL */}
              <div
                className="relative px-4 py-2.5 flex flex-col justify-between overflow-hidden"
                style={{ background: paletteA.bgGradient }}
              >
                {state.raidingTeam === 'A' && (
                  <div className="absolute inset-y-0 left-0 w-1.5 bg-[#FFE600] shadow-[0_0_16px_#FFE600]" />
                )}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-2 py-0.5 rounded bg-black/45 border border-[#FFE600]/60 font-mono text-xs font-black text-[#FFE600]">
                      {state.teamA.shortName}
                    </span>
                    <span className="font-display text-2xl font-black text-white uppercase tracking-tight truncate drop-shadow">
                      {state.teamA.name}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-white/80 whitespace-nowrap">
                    AO: {state.teamA.allOuts} · TO: {state.teamA.timeoutsLeft}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <MatPlayerDots count={state.teamA.playersOnMat} align="left" />
                  <TeamBadgeRow
                    team={state.teamA}
                    isRaiding={state.raidingTeam === 'A'}
                    align="right"
                  />
                </div>
              </div>

              {/* TEAM A SCORE BOX */}
              <div className="bg-[#090C24] border-x-2 border-[#FFE600]/65 flex flex-col items-center justify-center px-2">
                <span className="font-mono text-5xl font-black text-[#FFE600] leading-none tabular-nums drop-shadow-[0_2px_10px_rgba(255,230,0,0.45)]">
                  {String(state.teamA.score).padStart(2, '0')}
                </span>
              </div>

              {/* CENTER MATCH CLOCK + 30s RAID TIMER */}
              <div className="bg-gradient-to-b from-[#1A0518] to-[#070B28] px-3 py-1.5 flex flex-col items-center justify-between">
                <div className="w-full flex items-center justify-between gap-1">
                  <span className="px-2 py-[1px] rounded bg-[#DC2626] text-white font-mono text-[10px] font-black uppercase tracking-wider">
                    {state.half}
                  </span>
                  <span className="font-mono text-[10px] font-bold text-[#FFE600] uppercase">
                    RAID CLOCK
                  </span>
                </div>

                <div className="w-full flex items-center justify-between gap-2 my-0.5">
                  <div className="flex-1 text-center rounded-lg bg-black/50 border border-white/15 py-1">
                    <span className="font-mono text-2xl font-black text-white tabular-nums tracking-tight leading-none">
                      {formatClockMMSS(matchSec)}
                    </span>
                  </div>
                  <div
                    className={`w-[72px] text-center rounded-lg py-1 border-2 transition-colors ${
                      raidUrgent || raidExpired
                        ? 'bg-[#DC2626] border-[#FFE600] text-white animate-pulse'
                        : state.raidClock.running
                          ? 'bg-[#FFE600] border-white text-[#070B28]'
                          : 'bg-[#171C42] border-[#FFE600]/60 text-[#FFE600]'
                    }`}
                  >
                    <span className="font-mono text-2xl font-black tabular-nums leading-none">
                      {String(raidSec).padStart(2, '0')}s
                    </span>
                  </div>
                </div>
              </div>

              {/* TEAM B SCORE BOX */}
              <div className="bg-[#090C24] border-x-2 border-[#FFE600]/65 flex flex-col items-center justify-center px-2">
                <span className="font-mono text-5xl font-black text-[#FFE600] leading-none tabular-nums drop-shadow-[0_2px_10px_rgba(255,230,0,0.45)]">
                  {String(state.teamB.score).padStart(2, '0')}
                </span>
              </div>

              {/* TEAM B PANEL */}
              <div
                className="relative px-4 py-2.5 flex flex-col justify-between overflow-hidden"
                style={{ background: paletteB.bgGradient }}
              >
                {state.raidingTeam === 'B' && (
                  <div className="absolute inset-y-0 right-0 w-1.5 bg-[#FFE600] shadow-[0_0_16px_#FFE600]" />
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] font-bold text-white/80 whitespace-nowrap">
                    TO: {state.teamB.timeoutsLeft} · AO: {state.teamB.allOuts}
                  </span>
                  <div className="flex items-center gap-2 min-w-0 justify-end">
                    <span className="font-display text-2xl font-black text-white uppercase tracking-tight truncate text-right drop-shadow">
                      {state.teamB.name}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-black/45 border border-[#FFE600]/60 font-mono text-xs font-black text-[#FFE600]">
                      {state.teamB.shortName}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <TeamBadgeRow
                    team={state.teamB}
                    isRaiding={state.raidingTeam === 'B'}
                    align="left"
                  />
                  <MatPlayerDots count={state.teamB.playersOnMat} align="right" />
                </div>
              </div>
            </div>
            )}

            {/* Bottom broadcast ticker strip */}
            {state.tickerText.trim() && (
              <div className="px-4 py-1 bg-[#06091F] border-t border-[#FFE600]/35 flex items-center justify-between gap-4 text-[11px] font-mono font-bold text-[#FFE600]">
                <span className="truncate">{state.tickerText}</span>
                <span className="text-white/80 whitespace-nowrap">
                  {state.teamA.shortName} {state.teamA.score} - {state.teamB.score} {state.teamB.shortName}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
