import { CricketFlagId, formatCricketOvers, UserCricketScoreboardDoc } from '../types/overlay';

interface CricketScoreboardBarProps {
  data: UserCricketScoreboardDoc;
  variant?: 'output' | 'studio' | 'mini';
}

export const CRICKET_FLAG_OPTIONS: Array<{ id: CricketFlagId; label: string; code: string }> = [
  { id: 'SL', label: 'Sri Lanka', code: 'SL' },
  { id: 'AFG', label: 'Afghanistan', code: 'AFG' },
  { id: 'IND', label: 'India', code: 'IND' },
  { id: 'AUS', label: 'Australia', code: 'AUS' },
  { id: 'ENG', label: 'England', code: 'ENG' },
  { id: 'PAK', label: 'Pakistan', code: 'PAK' },
  { id: 'NZ', label: 'New Zealand', code: 'NZ' },
  { id: 'SA', label: 'South Africa', code: 'SA' },
  { id: 'WI', label: 'West Indies', code: 'WI' },
  { id: 'BAN', label: 'Bangladesh', code: 'BAN' },
  { id: 'CUSTOM', label: 'Custom Team Badge', code: 'TM' },
];

/** Crisp broadcast vector flag or custom uploaded logo for left/right scoreboard boxes */
function CricketTeamFlag({
  flagId,
  logoUrl,
  teamCode,
  alt,
}: {
  flagId: CricketFlagId;
  logoUrl?: string;
  teamCode: string;
  alt: string;
}) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={alt}
        referrerPolicy="no-referrer"
        className="w-full h-full object-contain rounded-[2px]"
      />
    );
  }

  switch (flagId) {
    case 'SL':
      return (
        <svg viewBox="0 0 90 54" className="w-full h-full rounded-[2px] shadow-xs" aria-label={alt}>
          <rect width="90" height="54" fill="#F4B41A" />
          <rect x="4" y="4" width="11" height="46" fill="#006A4E" />
          <rect x="15" y="4" width="11" height="46" fill="#EB7400" />
          <rect x="30" y="4" width="56" height="46" fill="#8D153A" />
          {/* Stylized golden lion silhouette + four Bo leaves */}
          <circle cx="35" cy="9" r="2" fill="#F4B41A" />
          <circle cx="81" cy="9" r="2" fill="#F4B41A" />
          <circle cx="35" cy="45" r="2" fill="#F4B41A" />
          <circle cx="81" cy="45" r="2" fill="#F4B41A" />
          <path
            d="M44 37 L48 25 L57 22 L65 18 L70 21 L68 27 L73 31 L71 37 L65 37 L63 32 L54 32 L51 37 Z"
            fill="#F4B41A"
          />
          <rect x="44" y="13" width="2.4" height="14" transform="rotate(-14 44 13)" fill="#F4B41A" />
        </svg>
      );
    case 'AFG':
      return (
        <svg viewBox="0 0 90 54" className="w-full h-full rounded-[2px] shadow-xs" aria-label={alt}>
          <rect x="0" y="0" width="30" height="54" fill="#0C0C0E" />
          <rect x="30" y="0" width="30" height="54" fill="#C8102E" />
          <rect x="60" y="0" width="30" height="54" fill="#009E49" />
          <circle cx="45" cy="27" r="10.5" fill="none" stroke="#F6E58D" strokeWidth="1.8" />
          <path d="M40 31 L40 23 L45 19 L50 23 L50 31 Z" fill="#F6E58D" opacity="0.92" />
        </svg>
      );
    case 'IND':
      return (
        <svg viewBox="0 0 90 54" className="w-full h-full rounded-[2px] shadow-xs" aria-label={alt}>
          <rect x="0" y="0" width="90" height="18" fill="#FF9933" />
          <rect x="0" y="18" width="90" height="18" fill="#FFFFFF" />
          <rect x="0" y="36" width="90" height="18" fill="#138808" />
          <circle cx="45" cy="27" r="6.5" fill="none" stroke="#000080" strokeWidth="1.5" />
          <circle cx="45" cy="27" r="1.4" fill="#000080" />
        </svg>
      );
    case 'AUS':
      return (
        <svg viewBox="0 0 90 54" className="w-full h-full rounded-[2px] shadow-xs" aria-label={alt}>
          <rect width="90" height="54" fill="#012169" />
          <rect x="0" y="0" width="42" height="26" fill="#012169" />
          <path d="M0 0 L42 26 M42 0 L0 26" stroke="#FFFFFF" strokeWidth="4.5" />
          <path d="M0 0 L42 26 M42 0 L0 26" stroke="#C8102E" strokeWidth="2.2" />
          <path d="M21 0 V26 M0 13 H42" stroke="#FFFFFF" strokeWidth="7" />
          <path d="M21 0 V26 M0 13 H42" stroke="#C8102E" strokeWidth="4" />
          <circle cx="21" cy="40" r="4" fill="#FFFFFF" />
          <circle cx="66" cy="14" r="2.2" fill="#FFFFFF" />
          <circle cx="74" cy="26" r="2.2" fill="#FFFFFF" />
          <circle cx="62" cy="30" r="2" fill="#FFFFFF" />
          <circle cx="68" cy="42" r="2.6" fill="#FFFFFF" />
        </svg>
      );
    case 'ENG':
      return (
        <svg viewBox="0 0 90 54" className="w-full h-full rounded-[2px] shadow-xs" aria-label={alt}>
          <rect width="90" height="54" fill="#FFFFFF" />
          <rect x="38" y="0" width="14" height="54" fill="#CE1124" />
          <rect x="0" y="20" width="90" height="14" fill="#CE1124" />
        </svg>
      );
    case 'PAK':
      return (
        <svg viewBox="0 0 90 54" className="w-full h-full rounded-[2px] shadow-xs" aria-label={alt}>
          <rect x="0" y="0" width="22" height="54" fill="#FFFFFF" />
          <rect x="22" y="0" width="68" height="54" fill="#01411C" />
          <circle cx="56" cy="27" r="12" fill="#FFFFFF" />
          <circle cx="60" cy="24" r="10.5" fill="#01411C" />
          <polygon points="64,17 65.5,21 69.5,21 66.2,23.5 67.5,27.5 64,25 60.5,27.5 61.8,23.5 58.5,21 62.5,21" fill="#FFFFFF" />
        </svg>
      );
    case 'NZ':
      return (
        <svg viewBox="0 0 90 54" className="w-full h-full rounded-[2px] shadow-xs" aria-label={alt}>
          <rect width="90" height="54" fill="#00247D" />
          <path d="M0 0 L42 26 M42 0 L0 26" stroke="#FFFFFF" strokeWidth="4" />
          <path d="M21 0 V26 M0 13 H42" stroke="#FFFFFF" strokeWidth="6.5" />
          <path d="M21 0 V26 M0 13 H42" stroke="#CC142B" strokeWidth="3.5" />
          <circle cx="68" cy="14" r="2.6" fill="#CC142B" stroke="#FFFFFF" strokeWidth="1" />
          <circle cx="76" cy="25" r="2.6" fill="#CC142B" stroke="#FFFFFF" strokeWidth="1" />
          <circle cx="60" cy="27" r="2.4" fill="#CC142B" stroke="#FFFFFF" strokeWidth="1" />
          <circle cx="68" cy="41" r="3" fill="#CC142B" stroke="#FFFFFF" strokeWidth="1" />
        </svg>
      );
    case 'SA':
      return (
        <svg viewBox="0 0 90 54" className="w-full h-full rounded-[2px] shadow-xs" aria-label={alt}>
          <rect x="0" y="0" width="90" height="27" fill="#E03C31" />
          <rect x="0" y="27" width="90" height="27" fill="#001489" />
          <polygon points="0,0 38,27 0,54" fill="#000000" />
          <path d="M0,0 L38,27 L0,54 M38,27 H90" fill="none" stroke="#FFFFFF" strokeWidth="12" />
          <path d="M0,0 L38,27 L0,54 M38,27 H90" fill="none" stroke="#007749" strokeWidth="7.5" />
          <polygon points="0,8 26,27 0,46" fill="#000000" stroke="#FFB81C" strokeWidth="3" />
        </svg>
      );
    case 'WI':
      return (
        <svg viewBox="0 0 90 54" className="w-full h-full rounded-[2px] shadow-xs" aria-label={alt}>
          <rect width="90" height="54" fill="#7B0041" />
          <circle cx="45" cy="27" r="15" fill="#FDB913" opacity="0.22" />
          <text x="45" y="33" textAnchor="middle" fill="#FDB913" fontSize="18" fontWeight="900" fontFamily="sans-serif">
            WI
          </text>
        </svg>
      );
    case 'BAN':
      return (
        <svg viewBox="0 0 90 54" className="w-full h-full rounded-[2px] shadow-xs" aria-label={alt}>
          <rect width="90" height="54" fill="#006A4E" />
          <circle cx="41" cy="27" r="14" fill="#F42A41" />
        </svg>
      );
    default:
      return (
        <div className="w-full h-full rounded-[2px] bg-gradient-to-br from-[#270A74] to-[#E5007D] flex items-center justify-center">
          <span className="font-display font-black text-white text-[10px] sm:text-xs tracking-wider uppercase">
            {(teamCode || 'TM').slice(0, 4)}
          </span>
        </div>
      );
  }
}

/** Geometric royal-indigo vertical zig-zag pattern strip (exact WC 2023 accent) */
function ZigZagStrip({ side }: { side: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 18 80"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="h-full w-full block shrink-0"
    >
      {/* Vertical royal indigo line */}
      <rect x={side === 'left' ? 0 : 12} y="0" width="6" height="80" fill="#230A6B" />
      {/* Interlocking geometric diamond/triangle teeth */}
      {side === 'left' ? (
        <path
          d="M6 0 L15 8 L6 16 L15 24 L6 32 L15 40 L6 48 L15 56 L6 64 L15 72 L6 80 Z"
          fill="#230A6B"
        />
      ) : (
        <path
          d="M12 0 L3 8 L12 16 L3 24 L12 32 L3 40 L12 48 L3 56 L12 64 L3 72 L12 80 Z"
          fill="#230A6B"
        />
      )}
    </svg>
  );
}

/**
 * ICC Men's CWC-style Broadcast Lower-Third Cricket Scoreboard Bar.
 * Matches the user's attached design with crisp tabular numerals,
 * royal-indigo double-chevron center hub, hot-magenta score pill,
 * electric-yellow overs chevron, geometric zig-zag seams, and team flags/logos.
 */
export function CricketScoreboardBar({
  data,
  variant = 'studio',
}: CricketScoreboardBarProps) {
  const isMini = variant === 'mini';
  const isOutput = variant === 'output';

  const oversFormatted = formatCricketOvers(data.totalBalls);
  const bowlerOversFormatted = formatCricketOvers(data.bowlerBalls);
  const visibleBalls = data.currentOverBalls.slice(-8);

  const barHeightClass = isMini
    ? 'h-[38px]'
    : isOutput
      ? 'h-[5.4vw] min-h-[66px] max-h-[96px]'
      : 'h-[56px] sm:h-[66px] lg:h-[74px]';

  const flagBoxWidthClass = isMini
    ? 'w-[42px] p-[3px]'
    : isOutput
      ? 'w-[8.6vw] p-[0.55vw]'
      : 'w-[60px] sm:w-[76px] lg:w-[92px] p-1 sm:p-1.5';

  const zigzagWidthClass = isMini
    ? 'w-[8px]'
    : isOutput
      ? 'w-[1.2vw]'
      : 'w-[10px] sm:w-[13px]';

  const textSm = isMini
    ? 'text-[7px] leading-none'
    : isOutput
      ? 'text-[1.12vw] leading-none'
      : 'text-[10px] sm:text-[12px] lg:text-[13.5px] leading-none';

  const textSub = isMini
    ? 'text-[6.5px] leading-none'
    : isOutput
      ? 'text-[0.95vw] leading-none'
      : 'text-[9px] sm:text-[11px] lg:text-[12px] leading-none';

  const textScore = isMini
    ? 'text-[9px] leading-none'
    : isOutput
      ? 'text-[1.52vw] leading-none'
      : 'text-[12px] sm:text-[15px] lg:text-[18px] leading-none';

  const textOvers = isMini
    ? 'text-[8.5px] leading-none'
    : isOutput
      ? 'text-[1.4vw] leading-none'
      : 'text-[11px] sm:text-[14px] lg:text-[16.5px] leading-none';

  const textTournament = isMini
    ? 'text-[6px] tracking-[0.06em]'
    : isOutput
      ? 'text-[0.86vw] tracking-[0.1em]'
      : 'text-[8px] sm:text-[10px] lg:text-[11px] tracking-[0.09em]';

  return (
    <div
      className={`w-full select-none ${
        isOutput ? 'max-w-[95vw] mx-auto' : 'max-w-full'
      }`}
    >
      {/* Main Broadcast Lower-Third Bar */}
      <div
        className={`relative w-full ${barHeightClass} flex items-stretch overflow-hidden shadow-[0_10px_28px_rgba(8,4,28,0.55)]`}
        style={{
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F1F3F9 62%, #E2E6F0 100%)',
        }}
      >
        {/* 1. LEFT TEAM FLAG / CREST (Batting Team) */}
        <div
          className={`${flagBoxWidthClass} shrink-0 flex items-center justify-center bg-gradient-to-b from-[#FFFFFF] to-[#E9EDF5]`}
        >
          <CricketTeamFlag
            flagId={data.battingFlagId}
            logoUrl={data.battingLogoUrl}
            teamCode={data.battingTeamCode}
            alt={`${data.battingTeamName || data.battingTeamCode} Flag`}
          />
        </div>

        {/* 2. LEFT ROYAL INDIGO ZIG-ZAG SEAM */}
        <div className={`${zigzagWidthClass} shrink-0 h-full`}>
          <ZigZagStrip side="left" />
        </div>

        {/* 3. LEFT LIGHT PANEL — BATTERS (Striker + Non-Striker) */}
        <div
          className={`flex-[1.05] min-w-0 flex flex-col justify-center ${
            isMini ? 'px-1.5 gap-[3px]' : isOutput ? 'px-[1.1vw] gap-[0.45vw]' : 'px-2 sm:px-3.5 gap-1.5'
          }`}
        >
          {/* Batter 1 Row */}
          <div className="flex items-center justify-between gap-1.5 min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              <span
                aria-hidden="true"
                className={`shrink-0 inline-block transition-opacity ${
                  data.striker === 1 ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <svg
                  viewBox="0 0 10 12"
                  className={isMini ? 'w-[5px] h-[6px]' : isOutput ? 'w-[0.7vw] h-[0.85vw]' : 'w-[7px] h-[9px] sm:w-[8px] sm:h-[10px]'}
                >
                  <polygon points="0,0 10,6 0,12" fill="#E5007D" />
                </svg>
              </span>
              <span
                className={`font-display font-extrabold uppercase text-[#160A4A] truncate ${textSm}`}
              >
                {data.batter1Name || 'BATTER 1'}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 sm:gap-2.5 shrink-0 font-mono tabular-nums">
              <span className={`font-black text-[#160A4A] ${textSm}`}>
                {data.batter1Runs}
              </span>
              <span className={`font-semibold text-[#6B7280] w-[2ch] text-right ${textSub}`}>
                {data.batter1Balls}
              </span>
            </div>
          </div>

          {/* Batter 2 Row */}
          <div className="flex items-center justify-between gap-1.5 min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              <span
                aria-hidden="true"
                className={`shrink-0 inline-block transition-opacity ${
                  data.striker === 2 ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <svg
                  viewBox="0 0 10 12"
                  className={isMini ? 'w-[5px] h-[6px]' : isOutput ? 'w-[0.7vw] h-[0.85vw]' : 'w-[7px] h-[9px] sm:w-[8px] sm:h-[10px]'}
                >
                  <polygon points="0,0 10,6 0,12" fill="#E5007D" />
                </svg>
              </span>
              <span
                className={`font-display font-extrabold uppercase text-[#160A4A] truncate ${textSm}`}
              >
                {data.batter2Name || 'BATTER 2'}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 sm:gap-2.5 shrink-0 font-mono tabular-nums">
              <span className={`font-black text-[#160A4A] ${textSm}`}>
                {data.batter2Runs}
              </span>
              <span className={`font-semibold text-[#6B7280] w-[2ch] text-right ${textSub}`}>
                {data.batter2Balls}
              </span>
            </div>
          </div>
        </div>

        {/* 4. CENTER DEEP ROYAL INDIGO DOUBLE-CHEVRON SCORE HUB */}
        <div
          className={`relative flex-[1.52] min-w-0 flex flex-col items-center justify-center text-white ${
            isMini ? 'px-3' : isOutput ? 'px-[2.4vw]' : 'px-4 sm:px-6 lg:px-7'
          }`}
          style={{
            background: 'linear-gradient(180deg, #2C0E82 0%, #22086B 55%, #190552 100%)',
            clipPath: 'polygon(5.5% 0%, 94.5% 0%, 100% 50%, 94.5% 100%, 5.5% 100%, 0% 50%)',
          }}
        >
          {/* Top Score Strip: AFG v SL | [244-7 >] | [47.4 >] | 50 */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 w-full">
            {/* Matchup Codes */}
            <div className="flex items-baseline gap-1 shrink-0 font-display uppercase tracking-wide">
              <span className={`font-bold text-[#D5CCF2] ${textSub}`}>
                {data.bowlingTeamCode || 'AFG'}
              </span>
              <span
                className={`font-semibold text-[#B9AEDF] lowercase ${
                  isMini ? 'text-[5.5px]' : isOutput ? 'text-[0.82vw]' : 'text-[8px] sm:text-[10px]'
                }`}
              >
                v
              </span>
              <span className={`font-black text-white ${textSm}`}>
                {data.battingTeamCode || 'SL'}
              </span>
            </div>

            {/* Interlocking Hot Magenta Score Arrow + Electric Yellow Overs Arrow */}
            <div className="flex items-center shrink-0">
              {/* Magenta Score Chevron */}
              <div
                className={`relative z-10 flex items-center justify-center font-mono font-black text-white tabular-nums ${
                  isMini
                    ? 'px-2 py-[2px] pr-2.5'
                    : isOutput
                      ? 'px-[1.2vw] py-[0.34vw] pr-[1.5vw]'
                      : 'px-2.5 sm:px-3.5 py-0.5 sm:py-1 pr-3.5 sm:pr-4'
                }`}
                style={{
                  background: 'linear-gradient(90deg, #D90075 0%, #F00689 100%)',
                  clipPath: 'polygon(10% 0%, 89% 0%, 100% 50%, 89% 100%, 10% 100%, 0% 50%)',
                }}
              >
                <span className={textScore}>
                  {data.runs}-{data.wickets}
                </span>
              </div>

              {/* Yellow Overs Chevron (interlocking tightly after magenta nose) */}
              <div
                className={`relative flex items-center justify-center font-mono font-black text-[#160A4A] tabular-nums ${
                  isMini
                    ? '-ml-[4px] pl-2 pr-2 py-[2px]'
                    : isOutput
                      ? '-ml-[0.55vw] pl-[1.15vw] pr-[1.1vw] py-[0.34vw]'
                      : '-ml-1.5 pl-2.5 sm:pl-3.5 pr-2.5 sm:pr-3 py-0.5 sm:py-1'
                }`}
                style={{
                  background: 'linear-gradient(180deg, #FFF220 0%, #F7DF00 100%)',
                  clipPath: 'polygon(0% 0%, 84% 0%, 100% 50%, 84% 100%, 0% 100%, 14% 50%)',
                }}
              >
                <span className={textOvers}>{oversFormatted}</span>
              </div>
            </div>

            {/* Max Overs */}
            <span className={`font-mono font-extrabold text-white/95 tabular-nums shrink-0 ${textSm}`}>
              {data.maxOvers}
            </span>
          </div>

          {/* Bottom Tournament / Match Subtitle Strip */}
          <div
            className={`w-full text-center font-display font-bold uppercase text-white/95 truncate ${
              isMini ? 'mt-[2px]' : isOutput ? 'mt-[0.38vw]' : 'mt-1'
            } ${textTournament}`}
          >
            {data.tournamentText || 'STAR EVENT CRICKET LIVE'}
          </div>
        </div>

        {/* 5. RIGHT LIGHT PANEL — BOWLER & CURRENT OVER BALLS */}
        <div
          className={`flex-[1.08] min-w-0 flex flex-col justify-center ${
            isMini ? 'px-1.5 gap-[3px]' : isOutput ? 'px-[1.15vw] gap-[0.42vw]' : 'px-2 sm:px-3.5 gap-1.5'
          }`}
        >
          {/* Row 1: Cricket Mark + Bowler Name + Figures (W-R) + Bowler Overs */}
          <div className="flex items-center justify-between gap-1.5 min-w-0">
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
              {/* Subtle magenta-pink cricket ball/emblem icon */}
              <svg
                viewBox="0 0 18 18"
                aria-hidden="true"
                className={
                  isMini
                    ? 'w-[7px] h-[7px] shrink-0'
                    : isOutput
                      ? 'w-[1.05vw] h-[1.05vw] shrink-0'
                      : 'w-[11px] h-[11px] sm:w-[13px] sm:h-[13px] shrink-0'
                }
              >
                <circle cx="9" cy="9" r="7.5" fill="none" stroke="#E5007D" strokeWidth="1.8" />
                <path d="M5 4.2 Q9 9 5 13.8 M13 4.2 Q9 9 13 13.8" fill="none" stroke="#E5007D" strokeWidth="1.5" />
              </svg>
              <span
                className={`font-display font-extrabold uppercase text-[#160A4A] truncate ${textSm}`}
              >
                {data.bowlerName || 'BOWLER'}
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 sm:gap-2.5 shrink-0 font-mono tabular-nums">
              <span className={`font-black text-[#160A4A] ${textSm}`}>
                {data.bowlerWickets}-{data.bowlerRuns}
              </span>
              <span className={`font-bold text-[#374151] ${textSub}`}>
                {bowlerOversFormatted}
              </span>
            </div>
          </div>

          {/* Row 2: Current Over Ball-by-Ball Tracker */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 overflow-hidden">
            {visibleBalls.length === 0 ? (
              <span className={`font-mono font-semibold text-[#64748B] ${textSub}`}>
                NEW OVER
              </span>
            ) : (
              visibleBalls.map((ball, idx) => {
                const isDot = ball === '•' || ball === '0' || ball === '.';
                const isWicket = ball.toUpperCase().includes('W') && !ball.toUpperCase().includes('WD');
                const isBoundary = ball === '4' || ball === '6';
                return (
                  <span
                    key={`${idx}-${ball}`}
                    className={`inline-flex items-center justify-center font-mono font-extrabold tabular-nums shrink-0 ${
                      isWicket
                        ? 'text-[#DC2626]'
                        : isBoundary
                          ? 'text-[#C8006E]'
                          : 'text-[#C81E52]'
                    } ${textSub}`}
                  >
                    {isDot ? (
                      <span
                        className={`inline-block rounded-full bg-[#C81E52] ${
                          isMini ? 'w-[3.5px] h-[3.5px]' : isOutput ? 'w-[0.42vw] h-[0.42vw]' : 'w-[5px] h-[5px] sm:w-[6px] sm:h-[6px]'
                        }`}
                      />
                    ) : (
                      ball
                    )}
                  </span>
                );
              })
            )}
          </div>
        </div>

        {/* 6. RIGHT ROYAL INDIGO ZIG-ZAG SEAM */}
        <div className={`${zigzagWidthClass} shrink-0 h-full`}>
          <ZigZagStrip side="right" />
        </div>

        {/* 7. RIGHT TEAM FLAG / CREST (Bowling Team) */}
        <div
          className={`${flagBoxWidthClass} shrink-0 flex items-center justify-center bg-gradient-to-b from-[#FFFFFF] to-[#E9EDF5]`}
        >
          <CricketTeamFlag
            flagId={data.bowlingFlagId}
            logoUrl={data.bowlingLogoUrl}
            teamCode={data.bowlingTeamCode}
            alt={`${data.bowlingTeamName || data.bowlingTeamCode} Flag`}
          />
        </div>
      </div>
    </div>
  );
}
