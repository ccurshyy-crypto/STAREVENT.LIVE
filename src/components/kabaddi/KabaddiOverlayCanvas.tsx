import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { STUDIO_CONTACT } from '../../data/content';
import {
  computeLiveTimerSeconds,
  formatClockMMSS,
  KABADDI_TEAM_PALETTES,
  KabaddiAlertState,
  KabaddiOverlayThemeId,
  KabaddiScoreboardState,
  KabaddiTeamSide,
  KabaddiTeamState,
  resolveKabaddiTeamColors,
} from '../../types/kabaddi';

interface KabaddiOverlayCanvasProps {
  state: KabaddiScoreboardState;
  bgMode?: 'transparent' | 'green' | 'arena';
}

interface ThemeAlertColors {
  bg: string;
  accent: string;
  text: string;
  subText: string;
  badgeBg: string;
  badgeText: string;
}

function getThemeAlertStyle(
  theme: KabaddiOverlayThemeId,
  alert: KabaddiAlertState
): ThemeAlertColors {
  const isDanger =
    alert.type === 'ALL_OUT' || alert.type === 'DO_OR_DIE' || alert.type === 'SUPER_TACKLE';

  switch (theme) {
    case 'royal-blue':
      return isDanger
        ? {
            bg: 'linear-gradient(90deg, #071A45 0%, #1D4ED8 30%, #0EA5E9 50%, #1D4ED8 70%, #071A45 100%)',
            accent: '#FFE600',
            text: '#FFFFFF',
            subText: '#DBEAFE',
            badgeBg: '#FFE600',
            badgeText: '#071A45',
          }
        : {
            bg: 'linear-gradient(90deg, #061436 0%, #1E40AF 28%, #2563EB 50%, #1E40AF 72%, #061436 100%)',
            accent: '#E2E8F0',
            text: '#FFFFFF',
            subText: '#BFDBFE',
            badgeBg: '#FFFFFF',
            badgeText: '#0F2557',
          };
    case 'silver-navy':
      return {
        bg: isDanger
          ? 'linear-gradient(90deg, #041E33 0%, #0369A1 30%, #0284C7 50%, #0369A1 70%, #041E33 100%)'
          : 'linear-gradient(90deg, #062B45 0%, #0E4A73 30%, #0284C7 50%, #0E4A73 70%, #062B45 100%)',
        accent: '#E2E8F0',
        text: '#FFFFFF',
        subText: '#BAE6FD',
        badgeBg: '#E2E8F0',
        badgeText: '#062B45',
      };
    case 'crimson-noir':
      return {
        bg: isDanger
          ? 'linear-gradient(90deg, #111114 0%, #B91C1C 28%, #EF4444 50%, #B91C1C 72%, #111114 100%)'
          : 'linear-gradient(90deg, #0B0B0E 0%, #991B1B 28%, #DC2626 50%, #991B1B 72%, #0B0B0E 100%)',
        accent: '#FFFFFF',
        text: '#FFFFFF',
        subText: '#FEE2E2',
        badgeBg: '#FFFFFF',
        badgeText: '#991B1B',
      };
    case 'saffron-chrome':
      return {
        bg: isDanger
          ? 'linear-gradient(90deg, #9A3412 0%, #EA580C 28%, #F97316 50%, #EA580C 72%, #9A3412 100%)'
          : 'linear-gradient(90deg, #C2410C 0%, #F97316 32%, #FACC15 50%, #F97316 68%, #C2410C 100%)',
        accent: '#FFFFFF',
        text: '#111827',
        subText: '#FFFFFF',
        badgeBg: '#111827',
        badgeText: '#FFE600',
      };
    case 'star-classic':
    default:
      return {
        bg: 'linear-gradient(90deg, #58040B 0%, #B91C1C 28%, #DC2626 50%, #B91C1C 72%, #070B28 100%)',
        accent: '#FFE600',
        text: '#FFE600',
        subText: '#FFFFFF',
        badgeBg: '#FFE600',
        badgeText: '#070B28',
      };
  }
}

/**
 * Animated Score Event Overlay that wipes directly INSIDE the scoreboard bar itself
 * (matching the exact theme palette & border radius of every Kabaddi scoreboard).
 */
function InBarScoreAlertOverlay({
  alert,
  theme,
  roundedClass = 'rounded-[inherit]',
}: {
  alert: KabaddiAlertState | null;
  theme: KabaddiOverlayThemeId;
  roundedClass?: string;
}) {
  return (
    <AnimatePresence mode="wait">
      {alert && (
        <motion.div
          key={`${alert.triggeredAtMs}-${alert.type}`}
          initial={{ opacity: 0, scaleX: 0.2 }}
          animate={{ opacity: 1, scaleX: 1 }}
          exit={{ opacity: 0, scaleX: 0.15 }}
          transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          className={`absolute inset-0 z-30 flex items-center justify-center overflow-hidden pointer-events-none ${roundedClass}`}
          style={{
            background: getThemeAlertStyle(theme, alert).bg,
            boxShadow: `inset 0 0 0 2px ${getThemeAlertStyle(theme, alert).accent}`,
          }}
        >
          {/* Animated broadcast light-sweep beam across the scoreboard bar */}
          <motion.div
            initial={{ x: '-120%' }}
            animate={{ x: '220%' }}
            transition={{ duration: 1.05, ease: 'easeInOut' }}
            className="absolute inset-y-0 w-1/3 skew-x-[-24deg] bg-gradient-to-r from-transparent via-white/35 to-transparent"
          />

          <motion.div
            initial={{ y: 16, opacity: 0, scale: 0.88 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -14, opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.28, delay: 0.06 }}
            className="relative z-10 flex items-center justify-center gap-4 px-6 w-full"
          >
            {alert.pointsBadge && (
              <span
                className="px-3.5 py-1 rounded-md font-mono text-sm font-black uppercase tracking-wider shadow-md shrink-0"
                style={{
                  backgroundColor: getThemeAlertStyle(theme, alert).badgeBg,
                  color: getThemeAlertStyle(theme, alert).badgeText,
                }}
              >
                {alert.pointsBadge}
              </span>
            )}

            <span
              className="font-display text-3xl sm:text-4xl font-black uppercase tracking-wide leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] truncate"
              style={{ color: getThemeAlertStyle(theme, alert).text }}
            >
              {alert.title}
            </span>

            {alert.subtitle && (
              <span
                className="hidden sm:inline-block px-3 py-1 rounded-md bg-black/25 border border-white/25 font-display text-sm font-extrabold uppercase tracking-wider truncate max-w-[340px]"
                style={{ color: getThemeAlertStyle(theme, alert).subText }}
              >
                {alert.subtitle}
              </span>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function getWinnerHeadline(state: KabaddiScoreboardState): string {
  if (state.teamA.score === state.teamB.score) return 'MATCH TIED!';
  if (state.teamA.score > state.teamB.score) {
    const diff = state.teamA.score - state.teamB.score;
    return `${state.teamA.name} WON BY ${diff} ${diff === 1 ? 'POINT' : 'POINTS'}!`;
  }
  const diff = state.teamB.score - state.teamA.score;
  return `${state.teamB.name} WON BY ${diff} ${diff === 1 ? 'POINT' : 'POINTS'}!`;
}

function MatPlayerDots({
  count,
  align,
  darkTheme = true,
  accentHex = '#FFE600',
}: {
  count: number;
  align: 'left' | 'right';
  darkTheme?: boolean;
  accentHex?: string;
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
            className="w-2.5 h-2.5 rounded-[3px] border transition-all duration-200"
            style={
              active
                ? {
                    backgroundColor: superTackleOn ? '#EF4444' : accentHex,
                    borderColor: darkTheme ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.35)',
                    boxShadow: `0 0 6px ${superTackleOn ? 'rgba(239,68,68,0.85)' : 'rgba(255,255,255,0.45)'}`,
                  }
                : {
                    backgroundColor: darkTheme
                      ? 'rgba(0,0,0,0.45)'
                      : 'rgba(15,23,42,0.14)',
                    borderColor: darkTheme
                      ? 'rgba(255,255,255,0.22)'
                      : 'rgba(15,23,42,0.2)',
                  }
            }
          />
        );
      })}
    </div>
  );
}

function TeamBadgeRow({
  team,
  isRaiding,
  raidSec,
  raidRunning,
  align,
}: {
  team: KabaddiTeamState;
  isRaiding: boolean;
  raidSec: number;
  raidRunning: boolean;
  align: 'left' | 'right';
}) {
  const superTackleOn = team.playersOnMat > 0 && team.playersOnMat <= 3;
  const doOrDie = isRaiding && team.emptyRaids >= 2;
  const raidUrgent = raidRunning && raidSec <= 10 && raidSec > 0;

  return (
    <div
      className={`flex items-center gap-1.5 min-h-[20px] ${
        align === 'right' ? 'justify-end' : 'justify-start'
      }`}
    >
      {isRaiding && (
        <motion.span
          key={`classic-raid-${team.shortName}`}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`inline-flex items-center gap-1 px-2 py-[2px] rounded font-mono text-[10px] font-black uppercase tracking-wider shadow-sm ${
            raidUrgent
              ? 'bg-[#EF1A1A] text-white border border-[#FFE600] animate-pulse'
              : 'bg-[#FFE600] text-[#070B28]'
          }`}
        >
          {raidRunning && (
            <span
              className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                raidUrgent ? 'bg-white' : 'bg-[#DC2626]'
              }`}
            />
          )}
          <span>RAID {String(raidSec).padStart(2, '0')}s</span>
        </motion.span>
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

function TeamRaidClockBadge({
  raidSec,
  running,
  theme,
  side,
}: {
  raidSec: number;
  running: boolean;
  theme: KabaddiOverlayThemeId;
  side: KabaddiTeamSide;
}) {
  const urgent = running && raidSec <= 10 && raidSec > 0;
  const pct = Math.max(0, Math.min(100, (raidSec / 30) * 100));

  const styleByTheme: Record<
    KabaddiOverlayThemeId,
    { bg: string; text: string; border: string; barTrack: string; barFill: string; dot: string }
  > = {
    'royal-blue': {
      bg: 'bg-[#FFE600]',
      text: 'text-[#071A45]',
      border: 'border-white/90',
      barTrack: 'bg-[#071A45]/25',
      barFill: 'bg-[#071A45]',
      dot: 'bg-[#DC2626]',
    },
    'silver-navy': {
      bg: 'bg-[#0369A1]',
      text: 'text-white',
      border: 'border-[#38BDF8]',
      barTrack: 'bg-black/30',
      barFill: 'bg-[#FFE600]',
      dot: 'bg-[#FFE600]',
    },
    'crimson-noir': {
      bg: 'bg-[#DC2626]',
      text: 'text-white',
      border: 'border-white/80',
      barTrack: 'bg-black/40',
      barFill: 'bg-[#FFE600]',
      dot: 'bg-[#FFE600]',
    },
    'saffron-chrome': {
      bg: 'bg-[#EA580C]',
      text: 'text-white',
      border: 'border-slate-900/70',
      barTrack: 'bg-black/30',
      barFill: 'bg-[#FFE600]',
      dot: 'bg-[#FFE600]',
    },
    'star-classic': {
      bg: 'bg-[#FFE600]',
      text: 'text-[#070B28]',
      border: 'border-white/80',
      barTrack: 'bg-black/25',
      barFill: 'bg-[#DC2626]',
      dot: 'bg-[#DC2626]',
    },
  };

  const s = styleByTheme[theme];

  return (
    <motion.div
      key={`raid-badge-${theme}-${side}`}
      initial={{ opacity: 0, scale: 0.82, x: side === 'A' ? -10 : 10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={`relative overflow-hidden rounded-lg border px-2.5 py-1 shadow-md shrink-0 min-w-[92px] ${
        urgent
          ? 'bg-[#DC2626] text-white border-[#FFE600] animate-pulse'
          : `${s.bg} ${s.text} ${s.border}`
      }`}
    >
      <div className="flex items-center justify-between gap-1.5 leading-none">
        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-black uppercase tracking-wider">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              running ? `${urgent ? 'bg-white' : s.dot} animate-pulse` : 'bg-current opacity-45'
            }`}
          />
          RAID
        </span>
        <span className="font-mono text-sm font-black tabular-nums leading-none">
          {String(raidSec).padStart(2, '0')}s
        </span>
      </div>
      <div className={`mt-1 h-[3px] w-full rounded-full overflow-hidden ${urgent ? 'bg-black/35' : s.barTrack}`}>
        <div
          className={`h-full rounded-full transition-all duration-200 ${urgent ? 'bg-[#FFE600]' : s.barFill}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </motion.div>
  );
}

/**
 * Reusable themed Kabaddi Broadcast Scoreboard Bar (1232px canonical width).
 * Supports all 4 newly added broadcast themes + Star Classic, with animated
 * score overlays appearing directly inside every scoreboard bar.
 */
export function KabaddiScoreboardBar({
  state,
  matchSec,
  raidSec,
  activeAlert,
}: {
  state: KabaddiScoreboardState;
  matchSec: number;
  raidSec: number;
  activeAlert: KabaddiAlertState | null;
}) {
  const theme: KabaddiOverlayThemeId = state.overlayTheme || 'royal-blue';
  const activeRaidingSide: KabaddiTeamSide = state.raidingTeam || 'A';
  const raidUrgent = state.raidClock.running && raidSec <= 10 && raidSec > 0;
  const raidExpired = raidSec === 0;
  const isFullTime = state.half === 'FULL TIME';
  const clockLabel = formatClockMMSS(matchSec);
  const paletteA = KABADDI_TEAM_PALETTES[state.teamA.color] || KABADDI_TEAM_PALETTES.saffron;
  const paletteB = KABADDI_TEAM_PALETTES[state.teamB.color] || KABADDI_TEAM_PALETTES.crimson;
  const customA = resolveKabaddiTeamColors(state.teamA);
  const customB = resolveKabaddiTeamColors(state.teamB);

  const fullTimeAlert: KabaddiAlertState | null = isFullTime
    ? {
        type: 'FULL_TIME',
        teamSide: null,
        title: getWinnerHeadline(state),
        subtitle: `${state.teamA.shortName} ${state.teamA.score} - ${state.teamB.score} ${state.teamB.shortName}`,
        pointsBadge: state.teamA.score === state.teamB.score ? 'FULL TIME' : '🏆 WINNER',
        triggeredAtMs: 1,
        expiresAtMs: Number.MAX_SAFE_INTEGER,
      }
    : null;

  const resolvedBarAlert = activeAlert || fullTimeAlert;

  // =========================================================================
  // THEME 1: ROYAL BLUE BROADCAST (Glossy Blue + Silver Bevels + Black Center + LIVE & 00:00 Tabs)
  // =========================================================================
  if (theme === 'royal-blue') {
    return (
      <div className="relative w-full flex flex-col items-center select-none">
        {/* Top Center LIVE Tab */}
        <div className="relative z-20 -mb-[3px] flex items-center gap-2">
          <div
            className="px-8 py-1 rounded-t-xl border-2 border-b-0 border-[#CBD5E1] shadow-md flex items-center gap-2"
            style={{
              background: 'linear-gradient(180deg, #3B82F6 0%, #1D4ED8 100%)',
            }}
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="font-mono text-sm font-black tracking-[0.18em] text-white uppercase">
              LIVE
            </span>
          </div>
        </div>

        {/* Main Metallic Royal Blue Bar */}
        <div
          className="relative w-full rounded-b-2xl rounded-t-sm p-[3px] shadow-[0_16px_42px_rgba(0,0,0,0.72)] overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #F8FAFC 0%, #94A3B8 55%, #475569 100%)',
          }}
        >
          <div
            className="relative grid grid-cols-[1fr_244px_1fr] items-stretch min-h-[78px] rounded-b-[13px] overflow-hidden"
            style={{
              background:
                'linear-gradient(180deg, #2563EB 0%, #17469E 45%, #0A255E 85%, #071940 100%)',
            }}
          >
            {/* Glossy top sheen */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[36%] bg-gradient-to-b from-white/25 to-transparent" />
            {/* Left & Right silver metallic curved endcaps */}
            <div className="pointer-events-none absolute inset-y-0 left-2 w-3 bg-gradient-to-r from-white/75 via-slate-200/80 to-transparent rounded-bl-xl" />
            <div className="pointer-events-none absolute inset-y-0 right-2 w-3 bg-gradient-to-l from-white/75 via-slate-200/80 to-transparent rounded-br-xl" />

            {/* Team A Wing */}
            <div
              className="relative z-10 pl-8 pr-5 py-2 flex flex-col justify-center"
              style={customA.hasCustomBg ? { background: customA.bgGradient } : undefined}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="font-display text-3xl font-black uppercase tracking-wider truncate drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
                  style={{ color: customA.hasCustomBg || state.teamA.customTextColor ? customA.textColor : '#FFFFFF' }}
                >
                  {state.teamA.name}
                </span>
                {activeRaidingSide === 'A' && (
                  <TeamRaidClockBadge
                    raidSec={raidSec}
                    running={state.raidClock.running}
                    theme="royal-blue"
                    side="A"
                  />
                )}
              </div>
              <div className="mt-1">
                <MatPlayerDots
                  count={state.teamA.playersOnMat}
                  align="left"
                  darkTheme={customA.hasCustomBg ? customA.isDarkBg : true}
                  accentHex={customA.hasCustomBg ? customA.dotAccentHex : '#60A5FA'}
                />
              </div>
            </div>

            {/* Center Jet-Black Score Box (0 - 0) */}
            <div className="relative z-10 bg-[#050508] border-x-2 border-slate-300/65 flex items-center justify-center gap-4 px-4 shadow-inner">
              <motion.span
                key={`rb-a-${state.teamA.score}`}
                initial={{ scale: 1.28, color: '#60A5FA' }}
                animate={{ scale: 1, color: '#FFFFFF' }}
                transition={{ duration: 0.28 }}
                className="font-mono text-5xl font-black text-white leading-none tabular-nums"
              >
                {state.teamA.score}
              </motion.span>
              <span className="w-4 h-1.5 rounded-full bg-white/95" />
              <motion.span
                key={`rb-b-${state.teamB.score}`}
                initial={{ scale: 1.28, color: '#60A5FA' }}
                animate={{ scale: 1, color: '#FFFFFF' }}
                transition={{ duration: 0.28 }}
                className="font-mono text-5xl font-black text-white leading-none tabular-nums"
              >
                {state.teamB.score}
              </motion.span>
            </div>

            {/* Team B Wing */}
            <div
              className="relative z-10 pl-5 pr-8 py-2 flex flex-col justify-center"
              style={customB.hasCustomBg ? { background: customB.bgGradient } : undefined}
            >
              <div className="flex items-center justify-between gap-2">
                {activeRaidingSide === 'B' ? (
                  <TeamRaidClockBadge
                    raidSec={raidSec}
                    running={state.raidClock.running}
                    theme="royal-blue"
                    side="B"
                  />
                ) : (
                  <span />
                )}
                <span
                  className="font-display text-3xl font-black uppercase tracking-wider truncate text-right drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
                  style={{ color: customB.hasCustomBg || state.teamB.customTextColor ? customB.textColor : '#FFFFFF' }}
                >
                  {state.teamB.name}
                </span>
              </div>
              <div className="mt-1">
                <MatPlayerDots
                  count={state.teamB.playersOnMat}
                  align="right"
                  darkTheme={customB.hasCustomBg ? customB.isDarkBg : true}
                  accentHex={customB.hasCustomBg ? customB.dotAccentHex : '#60A5FA'}
                />
              </div>
            </div>

            {/* In-Scoreboard Animated Score Overlay */}
            <InBarScoreAlertOverlay
              alert={resolvedBarAlert}
              theme="royal-blue"
              roundedClass="rounded-b-[13px]"
            />
          </div>
        </div>

        {/* Bottom Center 00:00 Clock Tab */}
        <div className="relative z-20 -mt-[3px]">
          <div
            className="px-7 py-1 rounded-b-xl border-2 border-t-0 border-[#CBD5E1] shadow-lg flex items-center gap-2"
            style={{
              background: 'linear-gradient(180deg, #1D4ED8 0%, #1E3A8A 100%)',
            }}
          >
            <span className="font-mono text-base font-black text-white tracking-widest tabular-nums">
              {clockLabel}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // THEME 2: SILVER CHROME & OCEAN (Brushed Silver Bar + Deep Navy Basin + Sky-Blue TIME Trapezoid)
  // =========================================================================
  if (theme === 'silver-navy') {
    return (
      <div className="relative w-full select-none">
        <div
          className="relative w-full rounded-b-[28px] rounded-t-[4px] p-[4px] pb-[6px] shadow-[0_18px_46px_rgba(0,0,0,0.68)]"
          style={{
            background: 'linear-gradient(180deg, #0F172A 0%, #334155 55%, #020617 100%)',
          }}
        >
          <div
            className="relative grid grid-cols-[1fr_370px_1fr] items-stretch min-h-[82px] rounded-b-[23px] overflow-hidden"
            style={{
              background:
                'linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 48%, #CBD5E1 85%, #94A3B8 100%)',
            }}
          >
            {/* Team A Silver Panel */}
            <div
              className="relative z-10 pl-7 pr-4 py-2 flex flex-col justify-center"
              style={customA.hasCustomBg ? { background: customA.bgGradient } : undefined}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="font-display text-3xl font-black uppercase tracking-wide truncate"
                  style={{ color: customA.hasCustomBg || state.teamA.customTextColor ? customA.textColor : '#020617' }}
                >
                  {state.teamA.name}
                </span>
                {activeRaidingSide === 'A' && (
                  <TeamRaidClockBadge
                    raidSec={raidSec}
                    running={state.raidClock.running}
                    theme="silver-navy"
                    side="A"
                  />
                )}
              </div>
              <div className="mt-1">
                <MatPlayerDots
                  count={state.teamA.playersOnMat}
                  align="left"
                  darkTheme={customA.hasCustomBg ? customA.isDarkBg : false}
                  accentHex={customA.hasCustomBg ? customA.dotAccentHex : '#0284C7'}
                />
              </div>
            </div>

            {/* Center Deep Ocean Navy Basin + Sky Blue Inverted Trapezoid TIME */}
            <div
              className="relative z-10 grid grid-cols-[1fr_144px_1fr] items-center rounded-b-[20px] shadow-inner overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, #073352 0%, #041D30 100%)',
              }}
            >
              {/* Team A Score */}
              <div className="flex items-center justify-center">
                <motion.span
                  key={`sn-a-${state.teamA.score}`}
                  initial={{ scale: 1.28, color: '#38BDF8' }}
                  animate={{ scale: 1, color: '#FFFFFF' }}
                  transition={{ duration: 0.28 }}
                  className="font-mono text-5xl font-black text-white leading-none tabular-nums"
                >
                  {state.teamA.score}
                </motion.span>
              </div>

              {/* Inverted Sky Blue Trapezoid Clock */}
              <div
                className="h-full flex flex-col items-center justify-center px-3 py-1.5"
                style={{
                  background: 'linear-gradient(180deg, #0EA5E9 0%, #0369A1 100%)',
                  clipPath: 'polygon(0 0, 100% 0, 84% 100%, 16% 100%)',
                }}
              >
                <span className="font-mono text-[10px] font-black tracking-widest text-sky-100 uppercase">
                  TIME
                </span>
                <span className="font-mono text-2xl font-black leading-tight tabular-nums text-white">
                  {clockLabel}
                </span>
              </div>

              {/* Team B Score */}
              <div className="flex items-center justify-center">
                <motion.span
                  key={`sn-b-${state.teamB.score}`}
                  initial={{ scale: 1.28, color: '#38BDF8' }}
                  animate={{ scale: 1, color: '#FFFFFF' }}
                  transition={{ duration: 0.28 }}
                  className="font-mono text-5xl font-black text-white leading-none tabular-nums"
                >
                  {state.teamB.score}
                </motion.span>
              </div>
            </div>

            {/* Team B Silver Panel */}
            <div
              className="relative z-10 pl-4 pr-7 py-2 flex flex-col justify-center"
              style={customB.hasCustomBg ? { background: customB.bgGradient } : undefined}
            >
              <div className="flex items-center justify-between gap-2">
                {activeRaidingSide === 'B' ? (
                  <TeamRaidClockBadge
                    raidSec={raidSec}
                    running={state.raidClock.running}
                    theme="silver-navy"
                    side="B"
                  />
                ) : (
                  <span />
                )}
                <span
                  className="font-display text-3xl font-black uppercase tracking-wide truncate text-right"
                  style={{ color: customB.hasCustomBg || state.teamB.customTextColor ? customB.textColor : '#020617' }}
                >
                  {state.teamB.name}
                </span>
              </div>
              <div className="mt-1">
                <MatPlayerDots
                  count={state.teamB.playersOnMat}
                  align="right"
                  darkTheme={customB.hasCustomBg ? customB.isDarkBg : false}
                  accentHex={customB.hasCustomBg ? customB.dotAccentHex : '#0284C7'}
                />
              </div>
            </div>

            {/* In-Scoreboard Animated Score Overlay */}
            <InBarScoreAlertOverlay
              alert={resolvedBarAlert}
              theme="silver-navy"
              roundedClass="rounded-b-[23px]"
            />
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // THEME 3: RED & BLACK PRO (Crimson Top Rail + LIVE Tab + Black Bar + White Inverted TIME Trapezoid)
  // =========================================================================
  if (theme === 'crimson-noir') {
    return (
      <div className="relative w-full flex flex-col items-center select-none">
        {/* Top Raised Red LIVE Tab */}
        <div className="relative z-20 -mb-[2px]">
          <div
            className="px-10 py-1 rounded-t-xl border-2 border-b-0 border-red-300/70 shadow-md flex items-center gap-2"
            style={{
              background: 'linear-gradient(180deg, #EF4444 0%, #B91C1C 100%)',
            }}
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="font-mono text-sm font-black tracking-[0.2em] text-white uppercase">
              LIVE
            </span>
          </div>
        </div>

        {/* Full-Width Crimson Top Rail */}
        <div className="relative z-10 w-[96%] h-2.5 rounded-t-full bg-gradient-to-r from-[#DC2626] via-[#EF4444] to-[#DC2626] shadow" />

        {/* Main Black Bar with Red Swept Corners & Silver Bottom Rail */}
        <div className="relative w-full rounded-[24px] bg-[#DC2626] px-2.5 pb-[6px] shadow-[0_18px_46px_rgba(0,0,0,0.78)]">
          <div className="relative grid grid-cols-[1fr_364px_1fr] items-stretch min-h-[80px] rounded-[20px] bg-[#111114] overflow-hidden border border-white/10">
            {/* Team A Black Wing */}
            <div
              className="relative z-10 pl-7 pr-4 py-2 flex flex-col justify-center"
              style={customA.hasCustomBg ? { background: customA.bgGradient } : undefined}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="font-display text-3xl font-black uppercase tracking-wide truncate"
                  style={{ color: customA.hasCustomBg || state.teamA.customTextColor ? customA.textColor : '#FFFFFF' }}
                >
                  {state.teamA.name}
                </span>
                {activeRaidingSide === 'A' && (
                  <TeamRaidClockBadge
                    raidSec={raidSec}
                    running={state.raidClock.running}
                    theme="crimson-noir"
                    side="A"
                  />
                )}
              </div>
              <div className="mt-1">
                <MatPlayerDots
                  count={state.teamA.playersOnMat}
                  align="left"
                  darkTheme={customA.hasCustomBg ? customA.isDarkBg : true}
                  accentHex={customA.hasCustomBg ? customA.dotAccentHex : '#EF4444'}
                />
              </div>
            </div>

            {/* Center Black Score Chambers + Pure White Inverted Trapezoid Clock */}
            <div className="relative z-10 grid grid-cols-[1fr_138px_1fr] items-center bg-[#18181D] border-x border-white/15">
              <div className="flex items-center justify-center">
                <motion.span
                  key={`cn-a-${state.teamA.score}`}
                  initial={{ scale: 1.28, color: '#EF4444' }}
                  animate={{ scale: 1, color: '#FFFFFF' }}
                  transition={{ duration: 0.28 }}
                  className="font-mono text-5xl font-black text-white leading-none tabular-nums"
                >
                  {state.teamA.score}
                </motion.span>
              </div>

              <div
                className="h-full flex flex-col items-center justify-center px-3 py-1 bg-white"
                style={{
                  clipPath: 'polygon(0 0, 100% 0, 82% 100%, 18% 100%)',
                }}
              >
                <span className="font-mono text-[10px] font-black tracking-widest text-slate-800 uppercase border-b border-slate-900 leading-tight">
                  TIME
                </span>
                <span className="font-mono text-2xl font-black leading-tight mt-0.5 tabular-nums text-slate-950">
                  {clockLabel}
                </span>
              </div>

              <div className="flex items-center justify-center">
                <motion.span
                  key={`cn-b-${state.teamB.score}`}
                  initial={{ scale: 1.28, color: '#EF4444' }}
                  animate={{ scale: 1, color: '#FFFFFF' }}
                  transition={{ duration: 0.28 }}
                  className="font-mono text-5xl font-black text-white leading-none tabular-nums"
                >
                  {state.teamB.score}
                </motion.span>
              </div>
            </div>

            {/* Team B Black Wing */}
            <div
              className="relative z-10 pl-4 pr-7 py-2 flex flex-col justify-center"
              style={customB.hasCustomBg ? { background: customB.bgGradient } : undefined}
            >
              <div className="flex items-center justify-between gap-2">
                {activeRaidingSide === 'B' ? (
                  <TeamRaidClockBadge
                    raidSec={raidSec}
                    running={state.raidClock.running}
                    theme="crimson-noir"
                    side="B"
                  />
                ) : (
                  <span />
                )}
                <span
                  className="font-display text-3xl font-black uppercase tracking-wide truncate text-right"
                  style={{ color: customB.hasCustomBg || state.teamB.customTextColor ? customB.textColor : '#FFFFFF' }}
                >
                  {state.teamB.name}
                </span>
              </div>
              <div className="mt-1">
                <MatPlayerDots
                  count={state.teamB.playersOnMat}
                  align="right"
                  darkTheme={customB.hasCustomBg ? customB.isDarkBg : true}
                  accentHex={customB.hasCustomBg ? customB.dotAccentHex : '#EF4444'}
                />
              </div>
            </div>

            {/* In-Scoreboard Animated Score Overlay */}
            <InBarScoreAlertOverlay
              alert={resolvedBarAlert}
              theme="crimson-noir"
              roundedClass="rounded-[20px]"
            />
          </div>

          {/* Metallic Silver Bottom Accent Rail */}
          <div className="mx-auto mt-1 h-1.5 w-[92%] rounded-full bg-gradient-to-r from-slate-500 via-slate-200 to-slate-500" />
        </div>
      </div>
    );
  }

  // =========================================================================
  // THEME 4: ORANGE & CHROME (Orange Top Tab 00:00 + Curved Chrome Bar + Sweeping Orange Score Center)
  // =========================================================================
  if (theme === 'saffron-chrome') {
    return (
      <div className="relative w-full flex flex-col items-center select-none">
        {/* Top Raised Orange Clock Tab (00:00) */}
        <div className="relative z-20 -mb-[2px]">
          <div
            className="px-8 py-1 rounded-t-xl border-2 border-b-0 border-slate-200 shadow-md flex items-center gap-2"
            style={{
              background: 'linear-gradient(180deg, #FB923C 0%, #EA580C 100%)',
            }}
          >
            <span className="font-mono text-base font-black text-slate-950 tracking-widest tabular-nums">
              {clockLabel}
            </span>
          </div>
        </div>

        {/* Full-Width Orange Top Edge Bar */}
        <div className="relative z-10 w-full h-2 bg-gradient-to-r from-[#EA580C] via-[#F97316] to-[#EA580C] border-b border-slate-800" />

        {/* Sweeping Curved Metallic Chrome Outer Shell */}
        <div
          className="relative w-full rounded-b-[42px] p-[4px] pt-0 shadow-[0_18px_46px_rgba(0,0,0,0.68)]"
          style={{
            background: 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)',
          }}
        >
          <div
            className="relative grid grid-cols-[1fr_300px_1fr] items-center min-h-[82px] rounded-b-[38px] overflow-hidden px-5"
            style={{
              background:
                'linear-gradient(180deg, #CBD5E1 0%, #FFFFFF 45%, #E2E8F0 75%, #94A3B8 100%)',
            }}
          >
            {/* Team A Glossy Silver Pill Capsule */}
            <div className="relative z-10 pr-3 py-2">
              <div
                className="rounded-xl px-4 py-1.5 border border-white/80 shadow-inner flex items-center justify-between gap-2"
                style={{
                  background: customA.hasCustomBg
                    ? customA.bgGradient
                    : 'linear-gradient(180deg, #FFFFFF 0%, #E5E7EB 55%, #CBD5E1 100%)',
                }}
              >
                <div className="min-w-0 flex flex-col">
                  <span
                    className="font-display text-2xl sm:text-3xl font-black uppercase tracking-wide truncate leading-tight"
                    style={{ color: customA.hasCustomBg || state.teamA.customTextColor ? customA.textColor : '#020617' }}
                  >
                    {state.teamA.name}
                  </span>
                  <MatPlayerDots
                    count={state.teamA.playersOnMat}
                    align="left"
                    darkTheme={customA.hasCustomBg ? customA.isDarkBg : false}
                    accentHex={customA.hasCustomBg ? customA.dotAccentHex : '#F97316'}
                  />
                </div>
                {activeRaidingSide === 'A' && (
                  <TeamRaidClockBadge
                    raidSec={raidSec}
                    running={state.raidClock.running}
                    theme="saffron-chrome"
                    side="A"
                  />
                )}
              </div>
            </div>

            {/* Sweeping Curved Orange-to-Gold Center Score Basin (0 - 0) */}
            <div
              className="relative z-10 h-full flex items-center justify-center gap-5 px-6 border-b-[3px] border-[#FACC15] shadow-md"
              style={{
                background:
                  'linear-gradient(180deg, #EA580C 0%, #F97316 58%, #FB923C 100%)',
                clipPath: 'polygon(0 0, 100% 0, 86% 100%, 14% 100%)',
              }}
            >
              <motion.span
                key={`sc-a-${state.teamA.score}`}
                initial={{ scale: 1.3, color: '#FFFFFF' }}
                animate={{ scale: 1, color: '#09090B' }}
                transition={{ duration: 0.28 }}
                className="font-mono text-5xl font-black text-slate-950 leading-none tabular-nums"
              >
                {state.teamA.score}
              </motion.span>
              <span className="w-3.5 h-1.5 rounded-full bg-slate-950" />
              <motion.span
                key={`sc-b-${state.teamB.score}`}
                initial={{ scale: 1.3, color: '#FFFFFF' }}
                animate={{ scale: 1, color: '#09090B' }}
                transition={{ duration: 0.28 }}
                className="font-mono text-5xl font-black text-slate-950 leading-none tabular-nums"
              >
                {state.teamB.score}
              </motion.span>
            </div>

            {/* Team B Glossy Silver Pill Capsule */}
            <div className="relative z-10 pl-3 py-2">
              <div
                className="rounded-xl px-4 py-1.5 border border-white/80 shadow-inner flex items-center justify-between gap-2"
                style={{
                  background: customB.hasCustomBg
                    ? customB.bgGradient
                    : 'linear-gradient(180deg, #FFFFFF 0%, #E5E7EB 55%, #CBD5E1 100%)',
                }}
              >
                {activeRaidingSide === 'B' ? (
                  <TeamRaidClockBadge
                    raidSec={raidSec}
                    running={state.raidClock.running}
                    theme="saffron-chrome"
                    side="B"
                  />
                ) : (
                  <span />
                )}
                <div className="min-w-0 flex flex-col items-end">
                  <span
                    className="font-display text-2xl sm:text-3xl font-black uppercase tracking-wide truncate text-right leading-tight"
                    style={{ color: customB.hasCustomBg || state.teamB.customTextColor ? customB.textColor : '#020617' }}
                  >
                    {state.teamB.name}
                  </span>
                  <MatPlayerDots
                    count={state.teamB.playersOnMat}
                    align="right"
                    darkTheme={customB.hasCustomBg ? customB.isDarkBg : false}
                    accentHex={customB.hasCustomBg ? customB.dotAccentHex : '#F97316'}
                  />
                </div>
              </div>
            </div>

            {/* In-Scoreboard Animated Score Overlay */}
            <InBarScoreAlertOverlay
              alert={resolvedBarAlert}
              theme="saffron-chrome"
              roundedClass="rounded-b-[38px]"
            />
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // THEME 5: STAR CLASSIC (Original Pro Kabaddi Crimson & Gold 5-Column Bar + In-Bar Animation)
  // =========================================================================
  return (
    <div className="relative rounded-2xl overflow-hidden border-2 border-[#FFE600]/85 bg-gradient-to-r from-[#2D0309]/96 via-[#0C0B24]/98 to-[#070B28]/96 shadow-[0_18px_50px_rgba(0,0,0,0.85)] select-none">
      {/* Top accent metallic highlight */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[#EF1A1A] via-[#FFE600] to-[#EF1A1A]" />

      <div className="relative grid grid-cols-[1fr_104px_212px_104px_1fr] items-stretch min-h-[86px]">
        {/* TEAM A PANEL */}
        <div
          className="relative px-4 py-2.5 flex flex-col justify-between overflow-hidden"
          style={{ background: customA.hasCustomBg ? customA.bgGradient : paletteA.bgGradient }}
        >
          {activeRaidingSide === 'A' && (
            <div className="absolute inset-y-0 left-0 w-1.5 bg-[#FFE600] shadow-[0_0_16px_#FFE600]" />
          )}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 rounded bg-black/45 border border-[#FFE600]/60 font-mono text-xs font-black text-[#FFE600]">
                {state.teamA.shortName}
              </span>
              <span
                className="font-display text-2xl font-black uppercase tracking-tight truncate drop-shadow"
                style={{ color: customA.hasCustomBg || state.teamA.customTextColor ? customA.textColor : '#FFFFFF' }}
              >
                {state.teamA.name}
              </span>
            </div>
            <span
              className="font-mono text-[10px] font-bold whitespace-nowrap opacity-85"
              style={{ color: customA.hasCustomBg || state.teamA.customTextColor ? customA.textColor : '#FFFFFF' }}
            >
              AO: {state.teamA.allOuts} · TO: {state.teamA.timeoutsLeft}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-1">
            <MatPlayerDots
              count={state.teamA.playersOnMat}
              align="left"
              darkTheme={customA.hasCustomBg ? customA.isDarkBg : true}
              accentHex={customA.hasCustomBg ? customA.dotAccentHex : '#FFE600'}
            />
            <TeamBadgeRow
              team={state.teamA}
              isRaiding={activeRaidingSide === 'A'}
              raidSec={raidSec}
              raidRunning={state.raidClock.running}
              align="right"
            />
          </div>
        </div>

        {/* TEAM A SCORE BOX */}
        <div className="bg-[#090C24] border-x-2 border-[#FFE600]/65 flex flex-col items-center justify-center px-2">
          <motion.span
            key={`cl-a-${state.teamA.score}`}
            initial={{ scale: 1.25 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.25 }}
            className="font-mono text-5xl font-black text-[#FFE600] leading-none tabular-nums drop-shadow-[0_2px_10px_rgba(255,230,0,0.45)]"
          >
            {String(state.teamA.score).padStart(2, '0')}
          </motion.span>
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
                {clockLabel}
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
          <motion.span
            key={`cl-b-${state.teamB.score}`}
            initial={{ scale: 1.25 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.25 }}
            className="font-mono text-5xl font-black text-[#FFE600] leading-none tabular-nums drop-shadow-[0_2px_10px_rgba(255,230,0,0.45)]"
          >
            {String(state.teamB.score).padStart(2, '0')}
          </motion.span>
        </div>

        {/* TEAM B PANEL */}
        <div
          className="relative px-4 py-2.5 flex flex-col justify-between overflow-hidden"
          style={{ background: customB.hasCustomBg ? customB.bgGradient : paletteB.bgGradient }}
        >
          {activeRaidingSide === 'B' && (
            <div className="absolute inset-y-0 right-0 w-1.5 bg-[#FFE600] shadow-[0_0_16px_#FFE600]" />
          )}
          <div className="flex items-center justify-between gap-2">
            <span
              className="font-mono text-[10px] font-bold whitespace-nowrap opacity-85"
              style={{ color: customB.hasCustomBg || state.teamB.customTextColor ? customB.textColor : '#FFFFFF' }}
            >
              TO: {state.teamB.timeoutsLeft} · AO: {state.teamB.allOuts}
            </span>
            <div className="flex items-center gap-2 min-w-0 justify-end">
              <span
                className="font-display text-2xl font-black uppercase tracking-tight truncate text-right drop-shadow"
                style={{ color: customB.hasCustomBg || state.teamB.customTextColor ? customB.textColor : '#FFFFFF' }}
              >
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
              isRaiding={activeRaidingSide === 'B'}
              raidSec={raidSec}
              raidRunning={state.raidClock.running}
              align="left"
            />
            <MatPlayerDots
              count={state.teamB.playersOnMat}
              align="right"
              darkTheme={customB.hasCustomBg ? customB.isDarkBg : true}
              accentHex={customB.hasCustomBg ? customB.dotAccentHex : '#FFE600'}
            />
          </div>
        </div>

        {/* In-Scoreboard Animated Score Overlay */}
        <InBarScoreAlertOverlay
          alert={resolvedBarAlert}
          theme="star-classic"
          roundedClass="rounded-none"
        />
      </div>

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

  const customA = resolveKabaddiTeamColors(state.teamA);
  const customB = resolveKabaddiTeamColors(state.teamB);
  const paletteA = {
    ...(KABADDI_TEAM_PALETTES[state.teamA.color] || KABADDI_TEAM_PALETTES.saffron),
    bgGradient: customA.bgGradient,
    border: customA.borderHex,
  };
  const paletteB = {
    ...(KABADDI_TEAM_PALETTES[state.teamB.color] || KABADDI_TEAM_PALETTES.crimson),
    bgGradient: customB.bgGradient,
    border: customB.borderHex,
  };

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
                <div
                  className="flex items-center justify-between px-4 py-3 rounded-xl border"
                  style={{ background: paletteA.bgGradient, borderColor: paletteA.border }}
                >
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
                <div
                  className="flex items-center justify-between px-4 py-3 rounded-xl border"
                  style={{ background: paletteB.bgGradient, borderColor: paletteB.border }}
                >
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

      {/* BOTTOM KABADDI BROADCAST SCOREBOARD BAR (WITH IN-BAR ANIMATED SCORE OVERLAYS) */}
      {state.showScoreboard && (
        <div className="absolute inset-x-6 bottom-5 z-20">
          <KabaddiScoreboardBar
            state={state}
            matchSec={matchSec}
            raidSec={raidSec}
            activeAlert={activeAlert}
          />
        </div>
      )}
    </div>
  );
}
