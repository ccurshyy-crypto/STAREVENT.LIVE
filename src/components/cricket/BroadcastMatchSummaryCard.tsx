import { motion } from 'motion/react';
import { Trophy } from 'lucide-react';
import {
  getTeamColorHex,
  getTeamTextColorHex,
} from '../../data/cricketSampleData';
import {
  computeBroadcastMatchResult,
  extractMatchSummaryData,
  type SummaryInningsBlock,
} from '../../lib/matchSummaryExport';
import type {
  CricketMatch,
  Team,
  Tournament,
  TournamentGroup,
} from '../../types/cricketSuite';

export { computeBroadcastMatchResult };

export interface BroadcastMatchSummaryCardProps {
  match: CricketMatch;
  tournament?: Tournament;
  group?: TournamentGroup;
  teamMap: Map<string, Team>;
  channelTitle?: string;
  compact?: boolean;
  disableAnimation?: boolean;
}

function renderSummaryTeamFlag(team: Team | undefined, fallbackCode: string) {
  if (team?.logoUrl) {
    return (
      <img
        src={team.logoUrl}
        alt={team.name}
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover"
      />
    );
  }

  const code = (team?.shortName || fallbackCode || 'TM').trim().toUpperCase();

  if (code === 'IND' || code === 'INDIA') {
    return (
      <svg viewBox="0 0 60 40" className="w-full h-full block" aria-label="IND Flag">
        <rect width="60" height="13.34" y="0" fill="#FF9933" />
        <rect width="60" height="13.34" y="13.33" fill="#FFFFFF" />
        <rect width="60" height="13.34" y="26.66" fill="#138808" />
        <circle cx="30" cy="20" r="5" fill="none" stroke="#000080" strokeWidth="1.2" />
        <circle cx="30" cy="20" r="1.2" fill="#000080" />
      </svg>
    );
  }

  if (code === 'AUS' || code === 'AUSTRALIA') {
    return (
      <svg viewBox="0 0 60 40" className="w-full h-full block" aria-label="AUS Flag">
        <rect width="60" height="40" fill="#00008B" />
        <rect width="28" height="18" fill="#012169" />
        <path d="M0,0 L28,18 M28,0 L0,18" stroke="#FFFFFF" strokeWidth="3.2" />
        <path d="M0,0 L28,18 M28,0 L0,18" stroke="#C8102E" strokeWidth="1.5" />
        <path d="M14,0 V18 M0,9 H28" stroke="#FFFFFF" strokeWidth="5" />
        <path d="M14,0 V18 M0,9 H28" stroke="#C8102E" strokeWidth="2.8" />
        <circle cx="14" cy="29" r="3" fill="#FFFFFF" />
        <circle cx="44" cy="11" r="1.7" fill="#FFFFFF" />
        <circle cx="51" cy="18" r="1.7" fill="#FFFFFF" />
        <circle cx="44" cy="28" r="2" fill="#FFFFFF" />
      </svg>
    );
  }

  if (code === 'SA' || code === 'RSA') {
    return (
      <svg viewBox="0 0 60 40" className="w-full h-full block" aria-label="SA Flag">
        <rect width="60" height="20" y="0" fill="#E03C31" />
        <rect width="60" height="20" y="20" fill="#001489" />
        <polygon points="0,0 24,20 0,40" fill="#000000" />
        <polyline points="0,4 20,20 0,36" fill="none" stroke="#FFB81C" strokeWidth="3.5" />
        <polyline points="0,0 26,20 60,20" fill="none" stroke="#FFFFFF" strokeWidth="8" />
        <polyline points="0,40 26,20 60,20" fill="none" stroke="#FFFFFF" strokeWidth="8" />
        <polyline points="0,0 26,20 60,20" fill="none" stroke="#007749" strokeWidth="5" />
        <polyline points="0,40 26,20 60,20" fill="none" stroke="#007749" strokeWidth="5" />
      </svg>
    );
  }

  if (code === 'ENG' || code === 'ENGLAND') {
    return (
      <svg viewBox="0 0 60 40" className="w-full h-full block" aria-label="ENG Flag">
        <rect width="60" height="40" fill="#FFFFFF" />
        <rect x="25" y="0" width="10" height="40" fill="#CF142B" />
        <rect x="0" y="15" width="60" height="10" fill="#CF142B" />
      </svg>
    );
  }

  if (code === 'PAK' || code === 'PAKISTAN') {
    return (
      <svg viewBox="0 0 60 40" className="w-full h-full block" aria-label="PAK Flag">
        <rect width="60" height="40" fill="#01411C" />
        <rect width="15" height="40" fill="#FFFFFF" />
        <circle cx="38" cy="20" r="10" fill="#FFFFFF" />
        <circle cx="41" cy="18" r="8.5" fill="#01411C" />
      </svg>
    );
  }

  const bg = team ? getTeamColorHex(team) : '#1D4ED8';
  const fg = team ? getTeamTextColorHex(team) : '#FFFFFF';
  return (
    <div
      className="w-full h-full flex items-center justify-center font-display font-black text-[11px] uppercase tracking-wider"
      style={{
        background: `linear-gradient(145deg, ${bg} 0%, #091538 100%)`,
        color: fg,
      }}
    >
      {code.slice(0, 3)}
    </div>
  );
}

export function BroadcastMatchSummaryCard({
  match,
  tournament,
  group,
  teamMap,
  channelTitle = 'STAR EVENT LIVE',
  compact = false,
  disableAnimation = false,
}: BroadcastMatchSummaryCardProps) {
  const summary = extractMatchSummaryData(
    match,
    tournament,
    group,
    teamMap,
    channelTitle
  );

  const renderInningsPanel = (inn: SummaryInningsBlock, delaySec: number) => {
    const Wrapper = disableAnimation ? 'div' : motion.div;
    const motionProps = disableAnimation
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.32, delay: delaySec, ease: [0.16, 1, 0.3, 1] as const },
        };

    // Align row grid neatly (4 fixed slots on desktop when data exists, clean collapse on empty)
    const maxRows = Math.max(inn.topBatters.length, inn.topBowlers.length);

    return (
      <Wrapper
        {...motionProps}
        className="rounded-xl overflow-hidden bg-white border border-slate-300/90 shadow-md"
      >
        {/* TEAM HEADER STRIP: Royal Navy -> Cyan Broadcast Bar */}
        <div
          className={`flex flex-wrap items-center justify-between gap-2.5 border-b border-sky-400/40 ${
            compact ? 'px-3.5 py-2' : 'px-4 sm:px-5 py-2.5 sm:py-3'
          }`}
          style={{
            background:
              'linear-gradient(90deg, #0B2268 0%, #1440AD 58%, #0284C7 100%)',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`rounded-[4px] overflow-hidden border-2 border-white/85 shadow-sm shrink-0 bg-slate-900 ${
                compact ? 'w-9 h-6' : 'w-11 h-7 sm:w-12 sm:h-8'
              }`}
            >
              {renderSummaryTeamFlag(inn.battingTeam, `T${inn.inningsIndex + 1}`)}
            </div>
            <h3
              className={`font-display font-black uppercase tracking-wide text-white truncate ${
                compact ? 'text-sm sm:text-base' : 'text-base sm:text-xl'
              }`}
            >
              {inn.teamName}
            </h3>
          </div>

          <div className="flex items-baseline gap-3 sm:gap-4 tabular-nums shrink-0">
            <span
              className={`font-bold uppercase tracking-wider text-sky-100 ${
                compact ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm'
              }`}
            >
              {inn.hasScore ? `${inn.oversCompact} OV` : 'YET TO BAT'}
            </span>
            <span
              className={`font-mono font-black text-white tracking-tight ${
                compact ? 'text-lg sm:text-xl' : 'text-xl sm:text-3xl'
              }`}
              style={{ textShadow: '0 2px 6px rgba(4, 15, 52, 0.45)' }}
            >
              {inn.hasScore ? inn.scoreLabel : '0/0'}
            </span>
          </div>
        </div>

        {/* CRISP WHITE SCORECARD BODY: LEFT BATTING (TOP 4) | RIGHT BOWLING (BEST 4) */}
        <div
          className={`grid ${
            compact
              ? 'grid-cols-2 divide-x'
              : 'grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x'
          } divide-slate-200 bg-white`}
        >
          {/* LEFT SIDE: BATTING SCORECARD */}
          <div className={compact ? 'px-3.5 py-2' : 'px-4 sm:px-5 py-2.5 sm:py-3'}>
            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.14em] text-sky-700 pb-1.5 border-b border-slate-200">
              <span>BATTING</span>
              <span>RUNS (BALLS)</span>
            </div>

            {inn.topBatters.length === 0 ? (
              <p className="text-xs sm:text-sm text-slate-500 py-4 font-medium">
                {inn.hasScore
                  ? 'No individual batting figures recorded yet.'
                  : 'Innings not started yet.'}
              </p>
            ) : (
              <div className="divide-y divide-slate-200/90">
                {Array.from({ length: Math.max(inn.topBatters.length, maxRows) }).map(
                  (_, rowIdx) => {
                    const batter = inn.topBatters[rowIdx];
                    if (!batter) {
                      return (
                        <div
                          key={`empty-bat-${inn.inningsIndex}-${rowIdx}`}
                          className={`${compact ? 'block py-1.5 text-xs' : 'hidden md:block py-2 text-sm'} select-none`}
                          aria-hidden="true"
                        >
                          &nbsp;
                        </div>
                      );
                    }
                    return (
                      <div
                        key={batter.playerId}
                        className={`flex items-center justify-between gap-3 ${
                          compact ? 'py-1.5 text-xs' : 'py-2 text-xs sm:text-sm'
                        }`}
                      >
                        <span className="font-display font-extrabold uppercase tracking-wide text-[#0A1C4E] truncate">
                          {batter.playerName}
                        </span>
                        <div className="flex items-baseline gap-1.5 shrink-0 font-mono tabular-nums">
                          <span
                            className={`font-black text-[#0A1C4E] ${
                              compact ? 'text-sm' : 'text-sm sm:text-base'
                            }`}
                          >
                            {batter.runs}
                            {!batter.isOut && (
                              <span
                                className="text-[#0284C7] font-black ml-0.5"
                                title="Not Out"
                              >
                                *
                              </span>
                            )}
                          </span>
                          <span className="text-slate-500 font-semibold text-xs sm:text-[13px] min-w-[3.2ch] text-right">
                            ({batter.balls})
                          </span>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>

          {/* RIGHT SIDE: BOWLING FIGURES */}
          <div className={compact ? 'px-3.5 py-2' : 'px-4 sm:px-5 py-2.5 sm:py-3'}>
            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.14em] text-sky-700 pb-1.5 border-b border-slate-200">
              <span>BOWLING · {inn.bowlingTeamShortName}</span>
              <span>W-R (OV)</span>
            </div>

            {inn.topBowlers.length === 0 ? (
              <p className="text-xs sm:text-sm text-slate-500 py-4 font-medium">
                {inn.hasScore
                  ? 'No bowling figures recorded yet.'
                  : 'Bowling yet to begin.'}
              </p>
            ) : (
              <div className="divide-y divide-slate-200/90">
                {Array.from({ length: Math.max(inn.topBowlers.length, maxRows) }).map(
                  (_, rowIdx) => {
                    const bowler = inn.topBowlers[rowIdx];
                    if (!bowler) {
                      return (
                        <div
                          key={`empty-bowl-${inn.inningsIndex}-${rowIdx}`}
                          className={`${compact ? 'block py-1.5 text-xs' : 'hidden md:block py-2 text-sm'} select-none`}
                          aria-hidden="true"
                        >
                          &nbsp;
                        </div>
                      );
                    }
                    return (
                      <div
                        key={bowler.playerId}
                        className={`flex items-center justify-between gap-3 ${
                          compact ? 'py-1.5 text-xs' : 'py-2 text-xs sm:text-sm'
                        }`}
                      >
                        <span className="font-display font-extrabold uppercase tracking-wide text-[#0A1C4E] truncate">
                          {bowler.playerName}
                        </span>
                        <div className="flex items-baseline gap-1.5 shrink-0 font-mono tabular-nums">
                          <span
                            className={`font-black text-[#0F389C] ${
                              compact ? 'text-sm' : 'text-sm sm:text-base'
                            }`}
                          >
                            {bowler.wickets}-{bowler.runs}
                          </span>
                          <span className="text-slate-500 font-semibold text-xs sm:text-[13px] min-w-[3.8ch] text-right">
                            ({bowler.oversCompact})
                          </span>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </div>
      </Wrapper>
    );
  };

  const RootWrapper = disableAnimation ? 'div' : motion.div;
  const rootMotionProps = disableAnimation
    ? {}
    : {
        initial: { opacity: 0, scale: 0.985 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
      };

  return (
    <RootWrapper
      {...rootMotionProps}
      className="match-summary-broadcast-card w-full rounded-2xl overflow-hidden border-2 border-sky-400/70 shadow-[0_24px_60px_rgba(4,16,58,0.45)] select-none bg-[#F1F5F9]"
    >
      {/* 1. INTERNATIONAL BROADCAST HEADER: BLUE & CYAN GRADIENT */}
      <div
        className={`relative overflow-hidden border-b-4 border-sky-400 ${
          compact ? 'px-4 py-3' : 'px-4 sm:px-6 py-3.5 sm:py-4'
        }`}
        style={{
          background:
            'linear-gradient(105deg, #061852 0%, #0E3CA8 52%, #0284C7 82%, #06B6D4 100%)',
        }}
      >
        {/* Diagonal TV broadcast sheen accents */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-[18%] w-36 -skew-x-18 bg-white/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-[10%] w-12 -skew-x-18 bg-cyan-200/15"
        />

        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {summary.tournamentLogoUrl ? (
              <img
                src={summary.tournamentLogoUrl}
                alt={summary.tournamentName}
                referrerPolicy="no-referrer"
                className={`rounded-xl object-cover border-2 border-white/75 bg-white shrink-0 shadow-sm ${
                  compact ? 'w-10 h-10' : 'w-12 h-12 sm:w-14 sm:h-14'
                }`}
              />
            ) : (
              <div
                className={`rounded-xl bg-white/15 border border-sky-200/50 flex items-center justify-center shrink-0 ${
                  compact ? 'w-10 h-10' : 'w-12 h-12 sm:w-14 sm:h-14'
                }`}
              >
                <Trophy className="w-6 h-6 text-sky-200" aria-hidden="true" />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <h2
                  className={`font-display font-black uppercase tracking-[0.12em] text-white leading-none ${
                    compact ? 'text-lg sm:text-xl' : 'text-xl sm:text-3xl'
                  }`}
                >
                  MATCH SUMMARY
                </h2>
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-200">
                  {summary.channelTitle}
                </span>
              </div>
              <p
                className={`font-display font-bold uppercase tracking-wider text-sky-100 mt-1 truncate ${
                  compact ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm'
                }`}
              >
                {summary.tournamentName}
              </p>
              {(summary.groupVenueLine || summary.matchLabel) && (
                <p className="text-[11px] font-semibold uppercase tracking-widest text-cyan-200/95 truncate">
                  {[summary.groupVenueLine, summary.matchLabel]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
            </div>
          </div>

          {/* Team Flags / Logos Lockup */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div className="w-11 h-7 sm:w-13 sm:h-8 rounded-[5px] overflow-hidden border-2 border-white/85 shadow-md bg-slate-900">
              {renderSummaryTeamFlag(summary.innings1.battingTeam, 'T1')}
            </div>
            <span className="font-display font-black text-xs sm:text-sm text-cyan-200 uppercase tracking-wider">
              VS
            </span>
            <div className="w-11 h-7 sm:w-13 sm:h-8 rounded-[5px] overflow-hidden border-2 border-white/85 shadow-md bg-slate-900">
              {renderSummaryTeamFlag(summary.innings2.battingTeam, 'T2')}
            </div>
          </div>
        </div>
      </div>

      {/* 2 & 3 (FIRST TEAM) + 4 & 5 (SECOND TEAM) WHITE SCORECARD STACK */}
      <div
        className={`space-y-3 sm:space-y-3.5 ${
          compact ? 'p-3 sm:p-3.5' : 'p-3.5 sm:p-5'
        }`}
        style={{
          background:
            'linear-gradient(180deg, #E2E8F0 0%, #F1F5F9 50%, #E2E8F0 100%)',
        }}
      >
        {renderInningsPanel(summary.innings1, 0.06)}
        {renderInningsPanel(summary.innings2, 0.14)}
      </div>

      {/* 6. BOTTOM BLUE BROADCAST MATCH RESULT BANNER */}
      <div
        className={`border-t-4 border-sky-400 text-center ${
          compact ? 'px-4 py-2.5' : 'px-4 sm:px-6 py-3.5 sm:py-4'
        }`}
        style={{
          background:
            'linear-gradient(90deg, #061852 0%, #0E3CA8 32%, #0284C7 50%, #0E3CA8 68%, #061852 100%)',
        }}
      >
        <p
          className={`font-display font-black uppercase tracking-[0.12em] text-white ${
            compact ? 'text-sm sm:text-base' : 'text-base sm:text-2xl'
          }`}
          style={{ textShadow: '0 2px 10px rgba(3, 12, 42, 0.65)' }}
        >
          {summary.resultHeadline}
        </p>
      </div>
    </RootWrapper>
  );
}
