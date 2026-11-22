import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { KabaddiHalf, KabaddiMatchStatus, KabaddiTimeoutTeam } from '../types/overlay';

export interface KabaddiScoreboardBarProps {
  variant?: 'mini' | 'studio' | 'output';
  teamAName: string;
  teamACode?: string;
  teamAColor?: string;
  teamAScore: number;
  teamABonusPoints?: number;
  teamALonaPoints?: number;
  teamAPlayersOnMat?: number;
  teamALogoUrl?: string;
  teamAGreenCards?: number;
  teamAYellowCards?: number;
  teamARedCards?: number;
  teamABinRemaining?: number;
  teamBName: string;
  teamBCode?: string;
  teamBColor?: string;
  teamBScore: number;
  teamBBonusPoints?: number;
  teamBLonaPoints?: number;
  teamBPlayersOnMat?: number;
  teamBLogoUrl?: string;
  teamBGreenCards?: number;
  teamBYellowCards?: number;
  teamBRedCards?: number;
  teamBBinRemaining?: number;
  matchSeconds: number;
  raidSeconds?: number;
  raidDuration?: number;
  raidRunning?: boolean;
  halfLabel: KabaddiHalf | string;
  matchStatus?: KabaddiMatchStatus;
  timeoutTeam?: KabaddiTimeoutTeam;
  doOrDie?: boolean;
  alertText?: string | null;
  tournamentTitle?: string;
  subtitle?: string;
  showDemoWatermark?: boolean;
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function shadeHexColor(hex: string, factor: number): string {
  const clean = (hex || '#C8102E').replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return hex || '#C8102E';
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  const adjust = (ch: number) =>
    factor >= 0 ? clampByte(ch + (255 - ch) * factor) : clampByte(ch * (1 + factor));

  const nr = adjust(r).toString(16).padStart(2, '0');
  const ng = adjust(g).toString(16).padStart(2, '0');
  const nb = adjust(b).toString(16).padStart(2, '0');
  return `#${nr}${ng}${nb}`;
}

export function formatClockMMSS(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Automated Curved Broadcast Kabaddi Scoreboard with:
 * - Inside-scoreboard animated top header chamber (slides up from inside the scoreboard)
 * - Automatic live event drawer emerging cleanly from inside the scoreboard seam
 * - Automatic score-change bounce & metallic broadcast sheen sweep
 * - Live 7-player ON-MAT / OUT indicator dots, dual team logos, and customizable team colors
 */
export function KabaddiScoreboardBar({
  variant = 'studio',
  teamAName,
  teamACode,
  teamAColor = '#C8102E',
  teamAScore,
  teamABonusPoints = 0,
  teamALonaPoints = 0,
  teamAPlayersOnMat = 7,
  teamALogoUrl,
  teamAGreenCards = 0,
  teamAYellowCards = 0,
  teamARedCards = 0,
  teamABinRemaining = 0,
  teamBName,
  teamBCode,
  teamBColor = '#131D8A',
  teamBScore,
  teamBBonusPoints = 0,
  teamBLonaPoints = 0,
  teamBPlayersOnMat = 7,
  teamBLogoUrl,
  teamBGreenCards = 0,
  teamBYellowCards = 0,
  teamBRedCards = 0,
  teamBBinRemaining = 0,
  matchSeconds,
  raidSeconds = 30,
  raidDuration = 30,
  raidRunning = false,
  halfLabel,
  matchStatus,
  timeoutTeam = null,
  doOrDie = false,
  alertText = null,
  tournamentTitle,
  subtitle,
  showDemoWatermark = false,
}: KabaddiScoreboardBarProps) {
  const uid = useId().replace(/:/g, '');
  const leftDark = shadeHexColor(teamAColor, -0.58);
  const leftBright = shadeHexColor(teamAColor, 0.12);
  const rightBright = shadeHexColor(teamBColor, 0.12);
  const rightDark = shadeHexColor(teamBColor, -0.62);

  const isMini = variant === 'mini';
  const isOutput = variant === 'output';

  // Automatic score-change pop detector + automatic inner banner flash
  const prevScoreARef = useRef(teamAScore);
  const prevScoreBRef = useRef(teamBScore);
  const [popTeamA, setPopTeamA] = useState(0);
  const [popTeamB, setPopTeamB] = useState(0);
  const [autoScoreFlash, setAutoScoreFlash] = useState<string | null>(null);

  useEffect(() => {
    const diffA = teamAScore - prevScoreARef.current;
    const diffB = teamBScore - prevScoreBRef.current;
    prevScoreARef.current = teamAScore;
    prevScoreBRef.current = teamBScore;

    let timer: number | undefined;
    if (diffA > 0) {
      setPopTeamA((c) => c + 1);
      if (!alertText) {
        const label =
          diffA >= 3
            ? `SUPER RAID +${diffA} · ${teamAName || 'TEAM A'}`
            : `+${diffA} POINT · ${teamAName || 'TEAM A'}`;
        setAutoScoreFlash(label);
        timer = window.setTimeout(() => setAutoScoreFlash(null), 2100);
      }
    } else if (diffB > 0) {
      setPopTeamB((c) => c + 1);
      if (!alertText) {
        const label =
          diffB >= 3
            ? `SUPER RAID +${diffB} · ${teamBName || 'TEAM B'}`
            : `+${diffB} POINT · ${teamBName || 'TEAM B'}`;
        setAutoScoreFlash(label);
        timer = window.setTimeout(() => setAutoScoreFlash(null), 2100);
      }
    }

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [teamAScore, teamBScore, teamAName, teamBName, alertText]);

  const safeAOnMat = Math.max(0, Math.min(7, Math.round(teamAPlayersOnMat)));
  const safeBOnMat = Math.max(0, Math.min(7, Math.round(teamBPlayersOnMat)));
  const displayLeftCode = (teamACode || '').trim().toUpperCase();
  const displayRightCode = (teamBCode || '').trim().toUpperCase();

  // Automatic inside-cap rotating broadcast status slots (slides smoothly from inside the scoreboard)
  const capSlides = useMemo(() => {
    const isTimeout = matchStatus === 'TIMEOUT' || Boolean(timeoutTeam);
    if (isTimeout) {
      const timeoutLabel =
        timeoutTeam === 'A'
          ? `TIMEOUT · ${displayLeftCode || 'TEAM A'}`
          : timeoutTeam === 'B'
            ? `TIMEOUT · ${displayRightCode || 'TEAM B'}`
            : 'OFFICIAL TIMEOUT';
      return [{ text: timeoutLabel, tone: 'timeout' as const }];
    }
    if (doOrDie) {
      return [{ text: 'DO-OR-DIE RAID', tone: 'danger' as const }];
    }
    if (matchStatus === 'PAUSED') {
      return [{ text: 'MATCH PAUSED', tone: 'warn' as const }];
    }
    if (matchStatus === 'HALF TIME' || matchStatus === 'FULL TIME') {
      return [{ text: matchStatus, tone: 'gold' as const }];
    }

    const list: Array<{ text: string; tone: 'default' | 'gold' | 'danger' | 'warn' | 'timeout' }> = [
      { text: String(halfLabel || '1ST HALF'), tone: 'default' },
    ];

    if (teamAScore !== teamBScore) {
      const diff = Math.abs(teamAScore - teamBScore);
      const leader =
        teamAScore > teamBScore
          ? displayLeftCode || teamAName || 'TEAM A'
          : displayRightCode || teamBName || 'TEAM B';
      list.push({ text: `${leader} LEADS +${diff}`, tone: 'gold' });
    } else if (teamAScore > 0) {
      list.push({ text: 'SCORES LEVEL', tone: 'gold' });
    }

    if (safeAOnMat <= 2 && safeAOnMat > 0) {
      list.push({ text: `SUPER TACKLE ON · ${displayLeftCode || 'A'}`, tone: 'danger' });
    } else if (safeBOnMat <= 2 && safeBOnMat > 0) {
      list.push({ text: `SUPER TACKLE ON · ${displayRightCode || 'B'}`, tone: 'danger' });
    } else if (tournamentTitle && tournamentTitle.trim()) {
      list.push({ text: tournamentTitle.trim(), tone: 'default' });
    }

    return list;
  }, [
    matchStatus,
    timeoutTeam,
    displayLeftCode,
    displayRightCode,
    doOrDie,
    halfLabel,
    teamAScore,
    teamBScore,
    teamAName,
    teamBName,
    safeAOnMat,
    safeBOnMat,
    tournamentTitle,
  ]);

  const [capSlideIndex, setCapSlideIndex] = useState(0);

  useEffect(() => {
    setCapSlideIndex(0);
    if (capSlides.length <= 1) return;
    const id = window.setInterval(() => {
      setCapSlideIndex((prev) => (prev + 1) % capSlides.length);
    }, 4200);
    return () => window.clearInterval(id);
  }, [capSlides.length]);

  const activeCapSlide = capSlides[capSlideIndex % capSlides.length] ?? {
    text: String(halfLabel || '1ST HALF'),
    tone: 'default' as const,
  };

  // Active live event text emerging from inside the scoreboard
  const activeInnerBanner = (alertText && alertText.trim()) || autoScoreFlash || null;

  const wrapperWidthClass = isMini
    ? 'w-[96%] mx-auto'
    : isOutput
      ? 'w-[82vw] max-w-[1540px] mx-auto'
      : 'w-[94%] mx-auto';

  const capTextClass = isMini
    ? 'text-[7px] tracking-wider'
    : isOutput
      ? 'text-[clamp(11px,0.92vw,18px)] tracking-[0.12em]'
      : 'text-[8px] sm:text-[10px] tracking-[0.11em]';

  const innerBannerTextClass = isMini
    ? 'text-[7px] px-2 py-0.5'
    : isOutput
      ? 'text-[clamp(12px,1.15vw,22px)] px-7 py-1.5'
      : 'text-[9px] sm:text-xs px-4 py-1';

  const clockTextClass = isMini
    ? 'text-[11px]'
    : isOutput
      ? 'text-[clamp(22px,2.4vw,46px)]'
      : 'text-sm sm:text-xl md:text-2xl';

  const raidTextClass = isMini
    ? 'text-[6.5px]'
    : isOutput
      ? 'text-[clamp(10px,0.85vw,16px)]'
      : 'text-[8px] sm:text-[10px]';

  const scoreTextClass = isMini
    ? 'text-xs'
    : isOutput
      ? 'text-[clamp(26px,3.1vw,58px)]'
      : 'text-base sm:text-2xl md:text-3xl';

  const nameTextClass = isMini
    ? 'text-[8px]'
    : isOutput
      ? 'text-[clamp(14px,1.55vw,30px)]'
      : 'text-[10px] sm:text-sm md:text-base';

  const codeTextClass = isMini
    ? 'text-[6.5px]'
    : isOutput
      ? 'text-[clamp(10px,0.9vw,17px)]'
      : 'text-[8px] sm:text-[10px]';

  const logoSizeClass = isMini
    ? 'w-5 h-5 p-0.5'
    : isOutput
      ? 'w-[clamp(44px,4.5vw,84px)] h-[clamp(44px,4.5vw,84px)] p-1'
      : 'w-7 h-7 sm:w-10 sm:h-10 md:w-11 md:h-11 p-0.5';

  const showRaidSub = raidRunning || raidSeconds < raidDuration;

  const playerDotClass = isMini
    ? 'w-1.5 h-1.5'
    : isOutput
      ? 'w-[clamp(8px,0.72vw,14px)] h-[clamp(8px,0.72vw,14px)]'
      : 'w-2 h-2 sm:w-2.5 sm:h-2.5';

  const stripMetaClass = isMini
    ? 'text-[5.5px]'
    : isOutput
      ? 'text-[clamp(9px,0.72vw,13px)]'
      : 'text-[7px] sm:text-[9px]';

  const capToneClass =
    activeCapSlide.tone === 'timeout'
      ? 'text-[#FDE047]'
      : activeCapSlide.tone === 'danger'
        ? 'text-[#FCA5A5]'
        : activeCapSlide.tone === 'warn'
          ? 'text-[#FDBA74]'
          : activeCapSlide.tone === 'gold'
            ? 'text-[#FACC15]'
            : 'text-zinc-100';

  return (
    <div className={`${wrapperWidthClass} select-none`}>
      <div className="relative w-full aspect-[1000/186] drop-shadow-[0_12px_26px_rgba(0,0,0,0.62)]">
        {/*
          INSIDE-SCOREBOARD TOP EVENT DRAWER:
          Clipped cleanly right at the upper seam of the scoreboard (bottom-[74%]) so
          live events (SUPER RAID, BONUS, ALL OUT, TIMEOUT, CARDS) literally slide UP
          from INSIDE the scoreboard body and glide back down inside it!
        */}
        <div
          aria-live="polite"
          className="pointer-events-none absolute left-[18%] right-[18%] bottom-[74%] z-0 overflow-hidden flex items-end justify-center pb-[1px]"
        >
          {activeInnerBanner && (
            <div
              key={activeInnerBanner}
              className={`scoreboard-inner-reveal relative overflow-hidden rounded-t-xl border-x-2 border-t-2 border-[#FACC15] bg-gradient-to-r from-[#7F1D1D] via-[#DC2626] to-[#7F1D1D] shadow-[0_-6px_22px_rgba(220,38,38,0.55)] font-display font-black uppercase tracking-wide text-white whitespace-nowrap max-w-full truncate ${innerBannerTextClass}`}
            >
              {/* Gloss sweep running across the inner-revealed ribbon */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent scoreboard-wing-sweep"
              />
              <span className="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]">
                {activeInnerBanner}
              </span>
            </div>
          )}
        </div>

        {/* Exact Curved Wing + Silver Top Bar + Angled Dark Center Trapezoid SVG */}
        <svg
          viewBox="0 0 1000 186"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="relative z-10 w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id={`leftWing-${uid}`} x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor={leftDark} />
              <stop offset="48%" stopColor={teamAColor} />
              <stop offset="100%" stopColor={leftBright} />
            </linearGradient>
            <linearGradient id={`rightWing-${uid}`} x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor={rightBright} />
              <stop offset="52%" stopColor={teamBColor} />
              <stop offset="100%" stopColor={rightDark} />
            </linearGradient>
            <linearGradient id={`silverStrip-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F8FAFC" />
              <stop offset="100%" stopColor="#CBD5E1" />
            </linearGradient>
            <linearGradient id={`centerPod-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2D3B3F" />
              <stop offset="100%" stopColor="#1B2528" />
            </linearGradient>
            <linearGradient id={`topCap-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#334347" />
              <stop offset="100%" stopColor="#1F2B2E" />
            </linearGradient>
            <clipPath id={`wingClip-${uid}`}>
              <path d="M 14 66 L 986 66 C 986 128 932 176 846 176 L 154 176 C 68 176 14 128 14 66 Z" />
            </clipPath>
          </defs>

          {/* 1. Top Raised Center Trapezoid Cap */}
          <path
            d="M 366 47 L 392 14 Q 402 4 416 4 L 584 4 Q 598 4 608 14 L 634 47 Z"
            fill={`url(#topCap-${uid})`}
          />

          {/* 2. Left Curved Team Wing */}
          <path
            d="M 14 66 L 500 66 L 500 176 L 154 176 C 68 176 14 128 14 66 Z"
            fill={`url(#leftWing-${uid})`}
          />

          {/* 3. Right Curved Team Wing */}
          <path
            d="M 500 66 L 986 66 C 986 128 932 176 846 176 L 500 176 Z"
            fill={`url(#rightWing-${uid})`}
          />

          {/* Subtle glossy broadcast reflection clipped strictly inside the curved wings */}
          <g clipPath={`url(#wingClip-${uid})`}>
            <rect x="14" y="66" width="972" height="22" fill="rgba(255,255,255,0.10)" />
          </g>

          {/* 4. Crisp White V-Cradle around Center Trapezoid */}
          <path
            d="M 342 66 L 658 66 L 625 156 Q 618 173 599 173 L 401 173 Q 382 173 375 156 Z"
            fill="#FFFFFF"
          />

          {/* 5. Center Inverted Dark Charcoal Trapezoid Pod */}
          <path
            d="M 358 66 L 642 66 L 614 148 Q 608 164 592 164 L 408 164 Q 392 164 386 148 Z"
            fill={`url(#centerPod-${uid})`}
          />

          {/* 6. Full-Width Silver/Light-Grey Top Strip */}
          <path
            d="M 30 47 L 970 47 Q 986 47 986 63 L 986 67 L 14 67 L 14 63 Q 14 47 30 47 Z"
            fill={`url(#silverStrip-${uid})`}
          />
        </svg>

        {/* Top Raised Cap Content — Masked Inside-Scoreboard Animated Slot! */}
        <div className="absolute z-20 top-[3%] left-[38.5%] right-[38.5%] h-[22%] overflow-hidden flex items-center justify-center px-2">
          <span
            key={`${activeCapSlide.text}-${capSlideIndex}`}
            className={`scoreboard-cap-slot-in font-mono font-extrabold uppercase truncate leading-none ${capTextClass} ${capToneClass}`}
          >
            {activeCapSlide.text}
          </span>
        </div>

        {/* Silver Top Strip (y: 25% -> 36%): Live 7 Player ON-MAT / OUT Dots & Bonus Indicator */}
        <div className="absolute z-20 top-[25.5%] h-[10.5%] left-[3.8%] right-[3.8%] flex items-center justify-between pointer-events-none">
          {/* Team A 7 Player Dots (Active vs OUT) */}
          <div
            className="w-[33%] flex items-center justify-start gap-1 sm:gap-1.5 pl-1"
            aria-label={`${teamAName} ${safeAOnMat} of 7 players on mat`}
          >
            <div className="flex items-center gap-[3px] sm:gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((idx) => {
                const isOnMat = idx <= safeAOnMat;
                return (
                  <span
                    key={`a-dot-${idx}`}
                    className={`rounded-full transition-all duration-300 ${playerDotClass} ${
                      isOnMat
                        ? 'bg-[#16A34A] border border-[#14532D] shadow-[0_0_6px_rgba(22,163,74,0.65)] scale-100'
                        : 'bg-[#DC2626]/25 border border-[#B91C1C]/75 scale-75'
                    }`}
                  />
                );
              })}
            </div>
            {!isMini && (
              <span className={`font-mono font-extrabold text-[#1E293B] uppercase whitespace-nowrap leading-none ${stripMetaClass}`}>
                {safeAOnMat}/7 IN
                {teamABonusPoints > 0 ? ` · B:${teamABonusPoints}` : ''}
                {teamALonaPoints > 0 ? ` · L:${teamALonaPoints}` : ''}
              </span>
            )}
          </div>

          {/* Center Gap (above dark trapezoid clock pod) */}
          <div className="w-[30%]" aria-hidden="true" />

          {/* Team B 7 Player Dots (Active vs OUT) */}
          <div
            className="w-[33%] flex items-center justify-end gap-1 sm:gap-1.5 pr-1"
            aria-label={`${teamBName} ${safeBOnMat} of 7 players on mat`}
          >
            {!isMini && (
              <span className={`font-mono font-extrabold text-[#1E293B] uppercase whitespace-nowrap leading-none ${stripMetaClass}`}>
                {teamBLonaPoints > 0 ? `L:${teamBLonaPoints} · ` : ''}
                {teamBBonusPoints > 0 ? `B:${teamBBonusPoints} · ` : ''}
                {safeBOnMat}/7 IN
              </span>
            )}
            <div className="flex items-center gap-[3px] sm:gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((idx) => {
                const isOnMat = idx <= safeBOnMat;
                return (
                  <span
                    key={`b-dot-${idx}`}
                    className={`rounded-full transition-all duration-300 ${playerDotClass} ${
                      isOnMat
                        ? 'bg-[#16A34A] border border-[#14532D] shadow-[0_0_6px_rgba(22,163,74,0.65)] scale-100'
                        : 'bg-[#DC2626]/25 border border-[#B91C1C]/75 scale-75'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Lower Band Content Layer (y: 36% -> 94%) */}
        <div className="absolute z-20 top-[36%] bottom-[6%] left-0 right-0 flex items-center">
          {/* LEFT WING (Team A: Logo + Name/Code/Cards + Score) */}
          <div className="w-[35.5%] h-full pl-[5.8%] pr-[1.8%] flex items-center justify-between gap-1.5 sm:gap-2.5 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
              {teamALogoUrl && (
                <div
                  className={`${logoSizeClass} rounded-full bg-white/95 border border-white/80 shadow-md flex items-center justify-center overflow-hidden shrink-0`}
                >
                  <img
                    src={teamALogoUrl}
                    alt={`${teamAName} logo`}
                    className="w-full h-full object-contain rounded-full"
                  />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p
                    className={`font-display font-extrabold text-white truncate leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)] ${nameTextClass}`}
                  >
                    {teamAName || 'TEAM A'}
                  </p>
                </div>

                {!isMini && (
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {displayLeftCode && (
                      <span
                        className={`font-mono font-bold text-white/80 leading-none ${codeTextClass}`}
                      >
                        {displayLeftCode}
                      </span>
                    )}
                    {teamAGreenCards > 0 && (
                      <span
                        className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-black/40 border border-[#4ADE80]/70 font-mono font-bold text-[#86EFAC] leading-none ${codeTextClass}`}
                      >
                        <span className="w-1.5 h-2 rounded-[1px] bg-[#22C55E]" />
                        {teamAGreenCards}
                      </span>
                    )}
                    {teamAYellowCards > 0 && (
                      <span
                        className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-black/40 border border-[#FACC15]/70 font-mono font-bold text-[#FACC15] leading-none ${codeTextClass}`}
                      >
                        <span className="w-1.5 h-2 rounded-[1px] bg-[#FACC15]" />
                        {teamAYellowCards}
                      </span>
                    )}
                    {teamARedCards > 0 && (
                      <span
                        className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-black/40 border border-[#EF4444]/80 font-mono font-bold text-[#FCA5A5] leading-none ${codeTextClass}`}
                      >
                        <span className="w-1.5 h-2 rounded-[1px] bg-[#EF4444]" />
                        {teamARedCards}
                      </span>
                    )}
                    {teamABinRemaining > 0 && (
                      <span
                        className={`px-1 py-0.5 rounded bg-black/55 border border-[#FACC15]/60 font-mono font-bold text-[#FDE047] tabular-nums leading-none ${codeTextClass}`}
                      >
                        {formatClockMMSS(teamABinRemaining)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <span
              key={`score-a-${popTeamA}`}
              className={`${popTeamA > 0 ? 'scoreboard-score-pop' : ''} font-mono font-black text-white tabular-nums leading-none shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)] ${scoreTextClass}`}
            >
              {teamAScore}
            </span>
          </div>

          {/* CENTER DARK TRAPEZOID POD (Match Clock + Automated 30s Raid Timer) */}
          <div className="w-[29%] h-full flex flex-col items-center justify-center px-2 text-center">
            <span
              className={`font-mono font-black text-white tabular-nums leading-none tracking-tight ${clockTextClass}`}
            >
              {formatClockMMSS(matchSeconds)}
            </span>
            {showRaidSub && (
              <span
                className={`mt-0.5 font-mono font-extrabold tabular-nums leading-none ${raidTextClass} ${
                  raidSeconds <= 10 ? 'text-[#F87171]' : 'text-[#FACC15]'
                }`}
              >
                RAID {String(raidSeconds).padStart(2, '0')}s
              </span>
            )}
          </div>

          {/* RIGHT WING (Team B: Score + Name/Code/Cards + Logo) */}
          <div className="w-[35.5%] h-full pl-[1.8%] pr-[5.8%] flex items-center justify-between gap-1.5 sm:gap-2.5 min-w-0">
            <span
              key={`score-b-${popTeamB}`}
              className={`${popTeamB > 0 ? 'scoreboard-score-pop' : ''} font-mono font-black text-white tabular-nums leading-none shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)] ${scoreTextClass}`}
            >
              {teamBScore}
            </span>

            <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 min-w-0 flex-1">
              <div className="min-w-0 flex-1 text-right">
                <p
                  className={`font-display font-extrabold text-white truncate leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)] ${nameTextClass}`}
                >
                  {teamBName || 'TEAM B'}
                </p>

                {!isMini && (
                  <div className="flex items-center justify-end gap-1.5 mt-0.5 flex-wrap">
                    {teamBBinRemaining > 0 && (
                      <span
                        className={`px-1 py-0.5 rounded bg-black/55 border border-[#FACC15]/60 font-mono font-bold text-[#FDE047] tabular-nums leading-none ${codeTextClass}`}
                      >
                        {formatClockMMSS(teamBBinRemaining)}
                      </span>
                    )}
                    {teamBRedCards > 0 && (
                      <span
                        className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-black/40 border border-[#EF4444]/80 font-mono font-bold text-[#FCA5A5] leading-none ${codeTextClass}`}
                      >
                        <span className="w-1.5 h-2 rounded-[1px] bg-[#EF4444]" />
                        {teamBRedCards}
                      </span>
                    )}
                    {teamBYellowCards > 0 && (
                      <span
                        className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-black/40 border border-[#FACC15]/70 font-mono font-bold text-[#FACC15] leading-none ${codeTextClass}`}
                      >
                        <span className="w-1.5 h-2 rounded-[1px] bg-[#FACC15]" />
                        {teamBYellowCards}
                      </span>
                    )}
                    {teamBGreenCards > 0 && (
                      <span
                        className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-black/40 border border-[#4ADE80]/70 font-mono font-bold text-[#86EFAC] leading-none ${codeTextClass}`}
                      >
                        <span className="w-1.5 h-2 rounded-[1px] bg-[#22C55E]" />
                        {teamBGreenCards}
                      </span>
                    )}
                    {displayRightCode && (
                      <span
                        className={`font-mono font-bold text-white/80 leading-none ${codeTextClass}`}
                      >
                        {displayRightCode}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {teamBLogoUrl && (
                <div
                  className={`${logoSizeClass} rounded-full bg-white/95 border border-white/80 shadow-md flex items-center justify-center overflow-hidden shrink-0`}
                >
                  <img
                    src={teamBLogoUrl}
                    alt={`${teamBName} logo`}
                    className="w-full h-full object-contain rounded-full"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Small STAR EVENT LIVE Watermark (Free Demo Scoreboard Only) */}
        {showDemoWatermark && (
          <div className="pointer-events-none absolute -bottom-[7%] left-1/2 -translate-x-1/2 z-30">
            <span
              className={`inline-flex items-center gap-1 rounded-full bg-[#090B0E]/88 border border-[#FACC15]/60 font-mono font-bold tracking-[0.14em] text-[#FEF08A]/95 uppercase whitespace-nowrap shadow-[0_2px_10px_rgba(0,0,0,0.7)] ${
                isMini
                  ? 'px-1.5 py-[1px] text-[5.5px]'
                  : isOutput
                    ? 'px-3.5 py-0.5 text-[clamp(9px,0.72vw,14px)]'
                    : 'px-2 py-0.5 text-[7px] sm:text-[9px]'
              }`}
            >
              <span className="text-[#FACC15]" aria-hidden="true">
                ★
              </span>
              <span>STAR EVENT LIVE</span>
            </span>
          </div>
        )}
      </div>

      {/* Optional clean tournament ticker line underneath */}
      {!isMini && subtitle && subtitle.trim().length > 0 && (
        <div
          className={
            isOutput
              ? showDemoWatermark
                ? 'mt-4 text-center'
                : 'mt-2 text-center'
              : showDemoWatermark
                ? 'mt-2.5 text-center'
                : 'mt-1 text-center'
          }
        >
          <span
            className={`inline-block bg-[#11181C]/88 border border-white/15 rounded-full text-zinc-200 font-medium max-w-full truncate ${
              isOutput
                ? 'px-6 py-1 text-[clamp(11px,0.95vw,18px)]'
                : 'px-3 py-0.5 text-[9px] sm:text-[11px]'
            }`}
          >
            {subtitle}
          </span>
        </div>
      )}
    </div>
  );
}
