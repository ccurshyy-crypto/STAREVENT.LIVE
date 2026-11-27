import { Trophy } from 'lucide-react';
import {
  computeBattingCard,
  computeBowlingCard,
  formatOvers,
  getTeamColorHex,
  getTeamTextColorHex,
} from '../../data/cricketSampleData';
import type {
  CricketMatch,
  InningsState,
  Team,
  Tournament,
  TournamentGroup,
} from '../../types/cricketSuite';

export interface BroadcastMatchSummaryCardProps {
  match: CricketMatch;
  tournament?: Tournament;
  group?: TournamentGroup;
  teamMap: Map<string, Team>;
  channelTitle?: string;
  compact?: boolean;
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

/**
 * Automatically calculates broadcast match result from live scoring innings data.
 */
export function computeBroadcastMatchResult(
  match: CricketMatch,
  inn1: InningsState,
  inn2: InningsState,
  inn1Team: Team | undefined,
  inn2Team: Team | undefined
): string {
  const rawResult = (match.resultText || '').trim();
  const rawUpper = rawResult.toUpperCase();

  // Preserve explicit special outcomes (No Result, Drawn, Super Over)
  if (
    rawUpper.includes('NO RESULT') ||
    rawUpper.includes('DRAWN') ||
    rawUpper.includes('SUPER OVER') ||
    rawUpper.includes('ABANDONED')
  ) {
    return rawUpper;
  }

  const t1Name = (inn1Team?.name || inn1Team?.shortName || 'TEAM 1').toUpperCase();
  const t2Name = (inn2Team?.name || inn2Team?.shortName || 'TEAM 2').toUpperCase();
  const maxWickets = Math.max(1, (inn2Team?.players?.length || 11) - 1);

  const inn2HasStarted = inn2.balls.length > 0 || inn2.runs > 0 || inn2.wickets > 0 || inn2.completed;
  const isFinished = match.status === 'completed' || (inn1.completed && inn2.completed);

  if (isFinished) {
    if (!inn2HasStarted) {
      return rawUpper && rawUpper !== 'NOT STARTED' && rawUpper !== 'LIVE'
        ? rawUpper
        : 'NO RESULT';
    }
    if (inn1.runs > inn2.runs) {
      const margin = inn1.runs - inn2.runs;
      return `${t1Name} WON BY ${margin} ${margin === 1 ? 'RUN' : 'RUNS'}`;
    }
    if (inn2.runs > inn1.runs) {
      const wicketsLeft = Math.max(1, maxWickets - inn2.wickets);
      return `${t2Name} WON BY ${wicketsLeft} ${wicketsLeft === 1 ? 'WICKET' : 'WICKETS'}`;
    }
    return 'MATCH TIED';
  }

  // Mid-match live status calculation
  if (inn2HasStarted || match.currentInningsIndex === 1) {
    const target = inn2.target ?? inn1.runs + 1;
    const needRuns = Math.max(0, target - inn2.runs);
    const totalBalls = inn2.maxOvers * 6;
    const remBalls = Math.max(0, totalBalls - inn2.legalBalls);
    if (needRuns === 0 && inn2.runs >= target) {
      const wicketsLeft = Math.max(1, maxWickets - inn2.wickets);
      return `${t2Name} WON BY ${wicketsLeft} ${wicketsLeft === 1 ? 'WICKET' : 'WICKETS'}`;
    }
    return `${t2Name} NEED ${needRuns} ${needRuns === 1 ? 'RUN' : 'RUNS'} FROM ${remBalls} ${
      remBalls === 1 ? 'BALL' : 'BALLS'
    }`;
  }

  if (inn1.balls.length > 0 || inn1.runs > 0) {
    return `${t1Name} ${inn1.runs}/${inn1.wickets} (${formatOvers(inn1.legalBalls)} OV) · 1ST INNINGS IN PROGRESS`;
  }

  return rawUpper && rawUpper !== 'NOT STARTED' ? rawUpper : 'MATCH YET TO START';
}

function formatScoreWithWickets(runs: number, wickets: number): string {
  return wickets >= 10 ? `${runs}` : `${runs}/${wickets}`;
}

export function BroadcastMatchSummaryCard({
  match,
  tournament,
  group,
  teamMap,
  channelTitle = 'STAR EVENT LIVE',
  compact = false,
}: BroadcastMatchSummaryCardProps) {
  const inn1 = match.innings[0];
  const inn2 = match.innings[1];
  const inn1BatTeam = teamMap.get(inn1.battingTeamId);
  const inn1BowlTeam = teamMap.get(inn1.bowlingTeamId);
  const inn2BatTeam = teamMap.get(inn2.battingTeamId);
  const inn2BowlTeam = teamMap.get(inn2.bowlingTeamId);

  const inn1Batters = [...computeBattingCard(inn1, inn1BatTeam)]
    .filter((b) => b.balls > 0 || b.runs > 0 || b.isOut)
    .sort((a, b) => b.runs - a.runs || a.balls - b.balls)
    .slice(0, 4);

  const inn1Bowlers = [...computeBowlingCard(inn1, inn1BowlTeam)]
    .filter((b) => b.legalBalls > 0 || b.runs > 0 || b.wickets > 0)
    .sort((a, b) => b.wickets - a.wickets || a.runs - b.runs || b.legalBalls - a.legalBalls)
    .slice(0, 4);

  const inn2Batters = [...computeBattingCard(inn2, inn2BatTeam)]
    .filter((b) => b.balls > 0 || b.runs > 0 || b.isOut)
    .sort((a, b) => b.runs - a.runs || a.balls - b.balls)
    .slice(0, 4);

  const inn2Bowlers = [...computeBowlingCard(inn2, inn2BowlTeam)]
    .filter((b) => b.legalBalls > 0 || b.runs > 0 || b.wickets > 0)
    .sort((a, b) => b.wickets - a.wickets || a.runs - b.runs || b.legalBalls - a.legalBalls)
    .slice(0, 4);

  const resultHeadline = computeBroadcastMatchResult(
    match,
    inn1,
    inn2,
    inn1BatTeam,
    inn2BatTeam
  );

  const tournamentName = (tournament?.name || channelTitle || 'CRICKET TOURNAMENT').toUpperCase();
  const groupLocationParts = [
    group?.name ? group.name.toUpperCase() : match.stageBadge?.toUpperCase(),
    (match.venue || tournament?.location || '').trim().toUpperCase(),
  ].filter(Boolean);
  const groupLocationLine = groupLocationParts.join(', ');

  const renderInningsBlock = (
    inn: InningsState,
    batTeam: Team | undefined,
    bowlTeam: Team | undefined,
    batters: ReturnType<typeof computeBattingCard>,
    bowlers: ReturnType<typeof computeBowlingCard>,
    inningsIndex: 0 | 1
  ) => {
    const teamLabel = (batTeam?.name || `TEAM ${inningsIndex + 1}`).toUpperCase();
    const bowlLabel = (bowlTeam?.shortName || bowlTeam?.name || 'BOWLING').toUpperCase();
    const oversFormatted = formatOvers(inn.legalBalls);
    const hasScore = inn.balls.length > 0 || inn.runs > 0 || inn.wickets > 0 || inn.completed;

    return (
      <div className="rounded-xl overflow-hidden border border-sky-300/35 bg-[#061647]/80 shadow-lg">
        {/* Innings Header Bar */}
        <div
          className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-sky-200/30"
          style={{
            background:
              'linear-gradient(90deg, #0D2D8A 0%, #1542B8 48%, #0C287A 100%)',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-7 rounded-[4px] overflow-hidden border border-white/75 shadow-sm shrink-0 bg-slate-900">
              {renderSummaryTeamFlag(batTeam, `T${inningsIndex + 1}`)}
            </div>
            <div className="min-w-0">
              <h4
                className={`font-display font-black uppercase tracking-wide text-white truncate ${
                  compact ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'
                }`}
              >
                {teamLabel}
              </h4>
            </div>
          </div>

          <div className="flex items-baseline gap-3 tabular-nums">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-sky-200">
              {hasScore ? `${oversFormatted} OV` : 'YET TO BAT'}
            </span>
            <span
              className={`font-display font-black text-[#FFE600] tracking-tight ${
                compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'
              }`}
              style={{ textShadow: '0 2px 6px rgba(0,0,0,0.45)' }}
            >
              {hasScore ? formatScoreWithWickets(inn.runs, inn.wickets) : '0/0'}
            </span>
          </div>
        </div>

        {/* Split Body: Left = Top 4 Batsmen | Right = Best 4 Bowlers */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-sky-300/25">
          {/* LEFT: BATTING SCORECARD (TOP 4) */}
          <div className="p-3 sm:p-3.5 bg-[#071A52]/75">
            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-widest text-sky-300/90 pb-1.5 mb-1.5 border-b border-sky-300/20">
              <span>TOP BATTERS</span>
              <span>RUNS (BALLS)</span>
            </div>
            {batters.length === 0 ? (
              <p className="text-xs text-sky-200/65 py-3 font-medium">
                {hasScore ? 'No individual batting records yet.' : 'Innings not started yet.'}
              </p>
            ) : (
              <div className="divide-y divide-white/10">
                {batters.map((b) => (
                  <div
                    key={b.playerId}
                    className="py-1.5 flex items-center justify-between gap-2 text-xs sm:text-sm"
                  >
                    <span className="font-display font-bold uppercase tracking-wide text-white truncate">
                      {b.playerName}
                    </span>
                    <div className="flex items-baseline gap-1.5 shrink-0 tabular-nums">
                      <span className="font-display font-black text-white text-sm sm:text-base">
                        {b.runs}
                        {!b.isOut ? (
                          <span className="text-[#FFE600] ml-0.5">*</span>
                        ) : null}
                      </span>
                      <span className="text-sky-200/85 font-semibold text-xs">
                        ({b.balls})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: BOWLING FIGURES (BEST 4) */}
          <div className="p-3 sm:p-3.5 bg-[#051442]/80">
            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-widest text-sky-300/90 pb-1.5 mb-1.5 border-b border-sky-300/20">
              <span>TOP BOWLERS · {bowlLabel}</span>
              <span>W-R (OV)</span>
            </div>
            {bowlers.length === 0 ? (
              <p className="text-xs text-sky-200/65 py-3 font-medium">
                {hasScore ? 'No bowling figures recorded yet.' : 'Bowling yet to begin.'}
              </p>
            ) : (
              <div className="divide-y divide-white/10">
                {bowlers.map((bw) => (
                  <div
                    key={bw.playerId}
                    className="py-1.5 flex items-center justify-between gap-2 text-xs sm:text-sm"
                  >
                    <span className="font-display font-bold uppercase tracking-wide text-white truncate">
                      {bw.playerName}
                    </span>
                    <div className="flex items-baseline gap-1.5 shrink-0 tabular-nums">
                      <span className="font-display font-black text-[#FFE600] text-sm sm:text-base">
                        {bw.wickets}-{bw.runs}
                      </span>
                      <span className="text-sky-200/85 font-semibold text-xs">
                        ({bw.overs})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="w-full rounded-2xl overflow-hidden border-2 border-sky-300/60 shadow-[0_24px_60px_rgba(3,10,36,0.75)] text-white select-none"
      style={{
        background:
          'radial-gradient(circle at 18% 0%, rgba(56,189,248,0.28) 0%, transparent 48%), radial-gradient(circle at 85% 100%, rgba(250,204,21,0.16) 0%, transparent 45%), linear-gradient(155deg, #041036 0%, #0A2472 48%, #061545 100%)',
      }}
    >
      {/* 1. INTERNATIONAL BROADCAST MATCH SUMMARY HEADER */}
      <div
        className="px-4 sm:px-6 py-3.5 sm:py-4 border-b-2 border-[#FFE600]/80 flex flex-wrap items-center justify-between gap-3"
        style={{
          background:
            'linear-gradient(90deg, #061852 0%, #1035A0 50%, #061852 100%)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {tournament?.logoUrl ? (
            <img
              src={tournament.logoUrl}
              alt={tournamentName}
              referrerPolicy="no-referrer"
              className="w-11 h-11 rounded-lg object-cover border border-white/50 bg-white/10 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-[#FFE600]/15 border border-[#FFE600]/50 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-[#FFE600]" aria-hidden="true" />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display font-black uppercase tracking-[0.14em] text-lg sm:text-2xl text-white leading-none">
                MATCH SUMMARY
              </span>
              <span className="px-2 py-0.5 rounded bg-[#FFE600] text-[#041036] font-black text-[10px] uppercase tracking-wider">
                {channelTitle}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-sky-200 mt-1 truncate">
              {tournamentName}
              {groupLocationLine ? ` · ${groupLocationLine}` : ''}
            </p>
          </div>
        </div>

        {/* Both Team Flags / Logos */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-10 h-6.5 rounded-[4px] overflow-hidden border border-white/75 shadow-sm">
            {renderSummaryTeamFlag(inn1BatTeam, 'T1')}
          </div>
          <span className="font-display font-black text-xs text-[#FFE600] uppercase">VS</span>
          <div className="w-10 h-6.5 rounded-[4px] overflow-hidden border border-white/75 shadow-sm">
            {renderSummaryTeamFlag(inn2BatTeam, 'T2')}
          </div>
        </div>
      </div>

      {/* 2 & 3. FIRST TEAM + 4 & 5. SECOND TEAM SCORECARDS */}
      <div className="p-3.5 sm:p-5 space-y-3.5">
        {renderInningsBlock(inn1, inn1BatTeam, inn1BowlTeam, inn1Batters, inn1Bowlers, 0)}
        {renderInningsBlock(inn2, inn2BatTeam, inn2BowlTeam, inn2Batters, inn2Bowlers, 1)}
      </div>

      {/* 6. BOTTOM MATCH RESULT BANNER */}
      <div
        className="px-4 sm:px-6 py-3 border-t-2 border-[#FFE600]/80 flex items-center justify-center text-center"
        style={{
          background:
            'linear-gradient(90deg, #071952 0%, #143DB3 35%, #1D4ED8 50%, #143DB3 65%, #071952 100%)',
        }}
      >
        <p
          className="font-display font-black uppercase tracking-[0.12em] text-base sm:text-xl text-[#FFE600]"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.65)' }}
        >
          {resultHeadline}
        </p>
      </div>
    </div>
  );
}
