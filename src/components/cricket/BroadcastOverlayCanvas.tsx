import { useEffect, useState } from 'react';
import {
  calcRunRate,
  computeBattingCard,
  computeBowlingCard,
  computeCurrentPartnership,
  computeOversBreakdown,
  computePointTableRows,
  computeTournamentStats,
  formatOvers,
  getBallPillLabel,
  TEAM_COLOR_MAP,
} from '../../data/cricketSampleData';
import {
  BallEvent,
  CricketSuiteState,
  OverlayThemeId,
} from '../../types/cricketSuite';

interface BroadcastOverlayCanvasProps {
  state: CricketSuiteState;
  isPreview?: boolean;
}

const THEME_PALETTES: Record<
  OverlayThemeId,
  { barBg: string; accent: string; primary: string; border: string }
> = {
  theme14: {
    barBg: 'from-[#09090D]/95 via-[#181822]/95 to-[#09090D]/95',
    accent: '#FFE600',
    primary: '#DC2626',
    border: 'border-[#FFE600]/75',
  },
  'star-red-gold': {
    barBg: 'from-[#160408]/95 via-[#3B060F]/95 to-[#120408]/95',
    accent: '#FFE600',
    primary: '#E11D1D',
    border: 'border-[#FFE600]/80',
  },
  'royal-navy-gold': {
    barBg: 'from-[#070B28]/95 via-[#121C59]/95 to-[#070B28]/95',
    accent: '#FACC15',
    primary: '#2563EB',
    border: 'border-[#FACC15]/75',
  },
  'emerald-gold': {
    barBg: 'from-[#041C14]/95 via-[#063A29]/95 to-[#041C14]/95',
    accent: '#FDE047',
    primary: '#10B981',
    border: 'border-[#FDE047]/70',
  },
};

function WagonWheelSvg({ balls, title }: { balls: BallEvent[]; title: string }) {
  const scoringBalls = balls.filter((b) => b.runsOffBat > 0);
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-[11px] font-mono uppercase text-[#FFE600] font-bold">{title}</p>
      <svg viewBox="0 0 200 200" className="w-40 h-40 sm:w-48 sm:h-48">
        <circle cx="100" cy="100" r="94" fill="#0B3B1F" stroke="#FFE600" strokeWidth="2.5" />
        <circle
          cx="100"
          cy="100"
          r="52"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeDasharray="4 4"
        />
        <rect x="94" y="84" width="12" height="32" rx="2" fill="#D4A373" />
        {scoringBalls.map((b) => {
          const rad = (b.wagonAngle * Math.PI) / 180;
          const r = 90 * b.wagonDistance;
          const x2 = 100 + Math.cos(rad) * r;
          const y2 = 100 + Math.sin(rad) * r;
          const stroke =
            b.runsOffBat >= 6
              ? '#FFE600'
              : b.runsOffBat === 4
                ? '#EF4444'
                : '#38BDF8';
          return (
            <g key={b.id}>
              <line
                x1="100"
                y1="100"
                x2={x2}
                y2={y2}
                stroke={stroke}
                strokeWidth={b.runsOffBat >= 4 ? '2.4' : '1.4'}
                opacity="0.92"
              />
              <circle cx={x2} cy={y2} r={b.runsOffBat >= 4 ? 3 : 2} fill={stroke} />
            </g>
          );
        })}
      </svg>
      <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-200">
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FFE600]" /> 6s
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" /> 4s
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8]" /> 1-3s
        </span>
      </div>
    </div>
  );
}

function FieldDiagramSvg({
  positions,
  playerNameMap,
  compact,
}: {
  positions: CricketSuiteState['fieldPositions'];
  playerNameMap: Map<string, string>;
  compact?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 220 220"
      className={compact ? 'w-24 h-24 shrink-0' : 'w-52 h-52 mx-auto'}
    >
      <circle cx="110" cy="110" r="102" fill="#0B3B1F" stroke="#FFE600" strokeWidth="2.5" />
      <circle
        cx="110"
        cy="110"
        r="56"
        fill="none"
        stroke="rgba(255,255,255,0.4)"
        strokeDasharray="4 4"
      />
      <rect x="104" y="92" width="12" height="36" rx="2" fill="#D4A373" />
      {positions.map((pos) => {
        const cx = 12 + (pos.x / 100) * 196;
        const cy = 12 + (pos.y / 100) * 196;
        const pName = pos.playerId ? playerNameMap.get(pos.playerId) : '';
        return (
          <g key={pos.id}>
            <circle cx={cx} cy={cy} r={compact ? 4.5 : 5.5} fill="#DC2626" stroke="#FFE600" strokeWidth="1.5" />
            {!compact && (
              <text
                x={cx}
                y={cy + 13}
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="6.5"
                fontWeight="700"
              >
                {pName ? pName.split(' ')[0] : pos.label.split(' ')[0]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function BroadcastOverlayCanvas({
  state,
  isPreview = false,
}: BroadcastOverlayCanvasProps) {
  const [visibleTransition, setVisibleTransition] = useState<string | null>(null);

  useEffect(() => {
    const tr = state.overlay.activeTransition;
    if (!tr) {
      setVisibleTransition(null);
      return;
    }
    setVisibleTransition(tr.type);
    const timer = window.setTimeout(() => setVisibleTransition(null), 3200);
    return () => window.clearTimeout(timer);
  }, [state.overlay.activeTransition?.id, state.overlay.activeTransition?.type]);

  const palette = THEME_PALETTES[state.user.userTheme] || THEME_PALETTES['star-red-gold'];
  const match =
    state.matches.find((m) => m.id === state.activeMatchId) ?? state.matches[0];
  const tournament =
    state.tournaments.find((t) => t.id === state.activeTournamentId) ??
    state.tournaments[0];
  const teamMap = new Map(state.teams.map((t) => [t.id, t]));
  const playerMap = new Map<string, string>();
  state.teams.forEach((t) => t.players.forEach((p) => playerMap.set(p.id, p.name)));

  const ov = state.overlay;
  if (!match) return null;

  const innIdx = match.currentInningsIndex;
  const inn = match.innings[innIdx];
  const inn1 = match.innings[0];
  const inn2 = match.innings[1];
  const batTeam = teamMap.get(inn.battingTeamId);
  const bowlTeam = teamMap.get(inn.bowlingTeamId);
  const team1 = teamMap.get(match.team1Id);
  const team2 = teamMap.get(match.team2Id);

  const batCards = computeBattingCard(inn, batTeam);
  const bowlCards = computeBowlingCard(inn, bowlTeam);
  const striker = batCards.find((b) => b.playerId === inn.strikerId);
  const nonStriker = batCards.find((b) => b.playerId === inn.nonStrikerId);
  const bowler = bowlCards.find((b) => b.playerId === inn.bowlerId);
  const partnership = computeCurrentPartnership(inn);

  const needRuns = inn.target !== null ? Math.max(0, inn.target - inn.runs) : null;
  const remBalls = Math.max(0, inn.maxOvers * 6 - inn.legalBalls);
  const crr = calcRunRate(inn.runs, inn.legalBalls);
  const projected = Math.round(Number(crr) * inn.maxOvers);
  const totalSixes = inn.balls.filter((b) => b.isBoundary6 || b.runsOffBat === 6).length;
  const totalFours = inn.balls.filter((b) => b.isBoundary4 || b.runsOffBat === 4).length;
  const lastWicket = inn.fallOfWickets[inn.fallOfWickets.length - 1];
  const last15 = inn.balls.slice(-15);

  const renderTeamBadge = (team?: (typeof state.teams)[number]) => {
    if (!ov.showTeamLogo || !team) return null;
    const color = TEAM_COLOR_MAP[team.colorTag]?.hex || '#FFE600';
    return (
      <span
        className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg border border-white/30 flex items-center justify-center overflow-hidden shrink-0 font-mono text-[10px] font-black text-black"
        style={{ backgroundColor: color }}
      >
        {team.logoUrl ? (
          <img src={team.logoUrl} alt={team.shortName} className="w-full h-full object-cover" />
        ) : (
          team.shortName
        )}
      </span>
    );
  };

  // Render Center / Main Overlay Card
  const renderMainCard = () => {
    const card = ov.mainCard;
    if (card.kind === 'NONE') return null;

    const frameCls = `mx-auto w-[92%] max-w-3xl rounded-2xl bg-gradient-to-br ${palette.barBg} border-2 ${palette.border} shadow-[0_24px_70px_rgba(0,0,0,0.85)] overflow-hidden text-white`;

    if (card.kind === 'CUSTOM_MESSAGE') {
      return (
        <div className={frameCls}>
          <div className="px-5 py-2 bg-[#DC2626] flex items-center justify-between">
            <span className="font-mono text-xs font-black text-[#FFE600] uppercase">
              {card.tab} · {state.user.channelTitle}
            </span>
            <span className="font-mono text-[10px] text-white/90">{tournament?.shortName}</span>
          </div>
          <div className="p-6 text-center space-y-2">
            <h2 className="font-display text-xl sm:text-3xl font-black text-[#FFE600]">
              {card.heading}
            </h2>
            {card.description && (
              <p className="text-sm sm:text-base text-zinc-100 font-medium">
                {card.description}
              </p>
            )}
          </div>
        </div>
      );
    }

    if (card.kind === 'POINTS_TABLE') {
      const rows = computePointTableRows(state, state.activeTournamentId).filter(
        (r) => card.groupId === 'ALL' || r.groupId === card.groupId
      );
      const grpName =
        card.groupId === 'ALL'
          ? 'POINTS TABLE'
          : state.groups.find((g) => g.id === card.groupId)?.name || 'POINTS TABLE';
      return (
        <div className={frameCls}>
          <div className="px-5 py-2.5 bg-[#DC2626] flex items-center justify-between">
            <span className="font-display font-black text-sm sm:text-base uppercase text-white">
              {grpName} · {tournament?.name}
            </span>
          </div>
          <table className="w-full text-xs sm:text-sm font-mono">
            <thead className="bg-black/50 text-[#FFE600]">
              <tr>
                <th className="px-4 py-2 text-left">TEAM</th>
                <th className="px-2 py-2 text-right">P</th>
                <th className="px-2 py-2 text-right">W</th>
                <th className="px-2 py-2 text-right">L</th>
                <th className="px-2 py-2 text-right">NRR</th>
                <th className="px-4 py-2 text-right">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map((r, i) => (
                <tr key={r.teamId} className={i < 2 ? 'bg-[#FFE600]/10' : ''}>
                  <td className="px-4 py-2 font-sans font-bold text-white">
                    {i + 1}. {teamMap.get(r.teamId)?.name || r.teamId}
                  </td>
                  <td className="px-2 py-2 text-right">{r.played}</td>
                  <td className="px-2 py-2 text-right">{r.won}</td>
                  <td className="px-2 py-2 text-right">{r.lost}</td>
                  <td className="px-2 py-2 text-right">
                    {r.nrr >= 0 ? `+${r.nrr.toFixed(2)}` : r.nrr.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right font-black text-[#FFE600]">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (card.kind === 'TOURNAMENT_STATS') {
      const stats = computeTournamentStats(state, state.activeTournamentId);
      const isBowlerList = card.mode === 'T10 wickets';
      const isMvp = card.mode === 'T10 Valuable Player';
      const batList =
        card.mode === 'T10 6s'
          ? stats.topSixes
          : card.mode === 'T10 4s'
            ? stats.topFours
            : card.mode === 'T10 Highest Scorer'
              ? stats.highestScorers
              : stats.topRuns;

      return (
        <div className={frameCls}>
          <div className="px-5 py-2.5 bg-[#DC2626] flex items-center justify-between">
            <span className="font-display font-black text-sm uppercase text-white">
              {card.mode} · {tournament?.shortName}
            </span>
          </div>
          <div className="p-3">
            <table className="w-full text-xs font-mono">
              <thead className="text-[#FFE600] border-b border-white/15">
                <tr>
                  <th className="py-1.5 px-2 text-left">#</th>
                  <th className="py-1.5 px-2 text-left">Player</th>
                  <th className="py-1.5 px-2 text-left">Team</th>
                  <th className="py-1.5 px-2 text-right">
                    {isBowlerList
                      ? 'Wkts (Eco)'
                      : isMvp
                        ? 'MVP Pts'
                        : card.mode === 'T10 6s'
                          ? '6s'
                          : card.mode === 'T10 4s'
                            ? '4s'
                            : card.mode === 'T10 Highest Scorer'
                              ? 'Best'
                              : 'Runs (SR)'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {isBowlerList
                  ? stats.topWickets.slice(0, 6).map((b, i) => (
                      <tr key={b.playerId}>
                        <td className="py-1.5 px-2 text-[#FFE600] font-bold">{i + 1}</td>
                        <td className="py-1.5 px-2 font-sans font-bold">{b.name}</td>
                        <td className="py-1.5 px-2 text-zinc-300">{b.teamShort}</td>
                        <td className="py-1.5 px-2 text-right font-black text-[#FFE600]">
                          {b.wickets} ({b.eco})
                        </td>
                      </tr>
                    ))
                  : isMvp
                    ? stats.mvpList.slice(0, 6).map((m, i) => (
                        <tr key={m.playerId}>
                          <td className="py-1.5 px-2 text-[#FFE600] font-bold">{i + 1}</td>
                          <td className="py-1.5 px-2 font-sans font-bold">{m.name}</td>
                          <td className="py-1.5 px-2 text-zinc-300">{m.teamShort}</td>
                          <td className="py-1.5 px-2 text-right font-black text-[#FFE600]">
                            {m.points} pts
                          </td>
                        </tr>
                      ))
                    : batList.slice(0, 6).map((b, i) => (
                        <tr key={b.playerId}>
                          <td className="py-1.5 px-2 text-[#FFE600] font-bold">{i + 1}</td>
                          <td className="py-1.5 px-2 font-sans font-bold">{b.name}</td>
                          <td className="py-1.5 px-2 text-zinc-300">{b.teamShort}</td>
                          <td className="py-1.5 px-2 text-right font-black text-[#FFE600]">
                            {card.mode === 'T10 6s'
                              ? b.sixes
                              : card.mode === 'T10 4s'
                                ? b.fours
                                : card.mode === 'T10 Highest Scorer'
                                  ? b.highest
                                  : `${b.runs} (${b.sr})`}
                          </td>
                        </tr>
                      ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (card.kind === 'GRAPHS') {
      const ov1 = computeOversBreakdown(inn1);
      const ov2 = computeOversBreakdown(inn2);
      const maxOv = Math.max(match.oversPerInnings, ov1.length, ov2.length, 1);
      const maxBar = Math.max(
        18,
        ...ov1.map((o) => o.runsInOver),
        ...ov2.map((o) => o.runsInOver)
      );
      const maxWorm = Math.max(
        40,
        inn1.runs,
        inn2.runs,
        ...ov1.map((o) => o.cumulativeRuns),
        ...ov2.map((o) => o.cumulativeRuns)
      );

      return (
        <div className={frameCls}>
          <div className="px-5 py-2.5 bg-[#DC2626] flex items-center justify-between">
            <span className="font-display font-black text-sm uppercase">
              {card.mode === 'manhatt' ? 'MANHATTAN RUNS PER OVER' : 'WORM COMPARISON GRAPH'}
            </span>
            <span className="text-xs font-mono text-[#FFE600]">
              {team1?.shortName} vs {team2?.shortName}
            </span>
          </div>
          <div className="p-4">
            {card.mode === 'manhatt' ? (
              <svg viewBox="0 0 360 150" className="w-full h-36">
                {Array.from({ length: maxOv }, (_, idx) => {
                  const xBase = 24 + idx * (310 / maxOv);
                  const r1 = ov1[idx]?.runsInOver ?? 0;
                  const r2 = ov2[idx]?.runsInOver ?? 0;
                  const h1 = (r1 / maxBar) * 105;
                  const h2 = (r2 / maxBar) * 105;
                  return (
                    <g key={idx}>
                      <rect x={xBase} y={120 - h1} width="14" height={h1} fill="#FFE600" rx="2" />
                      <rect x={xBase + 16} y={120 - h2} width="14" height={h2} fill="#EF4444" rx="2" />
                      <text x={xBase + 15} y="138" textAnchor="middle" fill="#D4D4D8" fontSize="9">
                        Ov {idx + 1}
                      </text>
                    </g>
                  );
                })}
              </svg>
            ) : (
              <svg viewBox="0 0 360 150" className="w-full h-36">
                <polyline
                  fill="none"
                  stroke="#FFE600"
                  strokeWidth="3"
                  points={[
                    '20,125',
                    ...ov1.map(
                      (o, i) =>
                        `${20 + ((i + 1) / maxOv) * 320},${125 - (o.cumulativeRuns / maxWorm) * 105}`
                    ),
                  ].join(' ')}
                />
                <polyline
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="3"
                  points={[
                    '20,125',
                    ...ov2.map(
                      (o, i) =>
                        `${20 + ((i + 1) / maxOv) * 320},${125 - (o.cumulativeRuns / maxWorm) * 105}`
                    ),
                  ].join(' ')}
                />
              </svg>
            )}
          </div>
        </div>
      );
    }

    if (card.kind === 'PLAYER_OF_MATCH') {
      const pName = playerMap.get(card.playerId) || 'Player of the Match';
      const stats = computeTournamentStats(state, state.activeTournamentId);
      const bStat = stats.topRuns.find((b) => b.playerId === card.playerId);
      const bwStat = stats.topWickets.find((b) => b.playerId === card.playerId);
      return (
        <div className={frameCls}>
          <div className="px-5 py-2 bg-[#FFE600] text-black font-display font-black text-xs uppercase tracking-widest text-center">
            ★ PLAYER OF THE MATCH · {match.matchLabel} ★
          </div>
          <div className="p-5 text-center space-y-2">
            <h2 className="font-display text-2xl sm:text-3xl font-black text-white">{pName}</h2>
            {card.display === 'Stats' && (
              <p className="font-mono text-sm text-[#FFE600] font-bold">
                Runs: {bStat?.runs ?? 0} ({bStat?.balls ?? 0}) · 4s: {bStat?.fours ?? 0} · 6s:{' '}
                {bStat?.sixes ?? 0} · Wickets: {bwStat?.wickets ?? 0}
              </p>
            )}
          </div>
        </div>
      );
    }

    if (card.kind === 'BATSMAN_STATS' || card.kind === 'BOWLER_STATS' || card.kind === 'TEAM_PLAYER_STATS') {
      const pid = card.playerId;
      const pName = playerMap.get(pid) || 'Player';
      const batInfo =
        computeBattingCard(inn, batTeam).find((b) => b.playerId === pid) ??
        computeBattingCard(inn1, team1).find((b) => b.playerId === pid);
      const bowlInfo =
        computeBowlingCard(inn, bowlTeam).find((b) => b.playerId === pid) ??
        computeBowlingCard(inn1, team2).find((b) => b.playerId === pid);
      const isWheel =
        card.kind === 'BATSMAN_STATS' &&
        (card.mode === 'Wagon Wheel' || card.mode === 'Tournament Wagon Wheel');

      return (
        <div className={frameCls}>
          <div className="px-5 py-2 bg-[#DC2626] flex items-center justify-between">
            <span className="font-display font-black text-xs sm:text-sm uppercase text-[#FFE600]">
              {card.kind === 'BATSMAN_STATS'
                ? `BATSMAN · ${card.mode}`
                : card.kind === 'BOWLER_STATS'
                  ? `BOWLER · ${card.mode}`
                  : `${card.category.toUpperCase()} · ${card.mode}`}
            </span>
          </div>
          <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {ov.showPlayerPhoto && (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FFE600] to-[#DC2626] p-0.5 shrink-0">
                  <div className="w-full h-full rounded-full bg-[#111116] flex items-center justify-center font-display font-black text-lg text-[#FFE600]">
                    {pName.slice(0, 1)}
                  </div>
                </div>
              )}
              <div>
                <h3 className="font-display text-xl sm:text-2xl font-black text-white">{pName}</h3>
                <p className="font-mono text-xs text-[#FFE600]">
                  {card.kind === 'BOWLER_STATS' ||
                  (card.kind === 'TEAM_PLAYER_STATS' && card.category === 'bowling')
                    ? `Overs: ${bowlInfo?.overs ?? '0.0'} · Runs: ${bowlInfo?.runs ?? 0} · Wkts: ${bowlInfo?.wickets ?? 0} · Eco: ${bowlInfo?.economy ?? '0.00'}`
                    : `Runs: ${batInfo?.runs ?? 0} (${batInfo?.balls ?? 0}) · 4s: ${batInfo?.fours ?? 0} · 6s: ${batInfo?.sixes ?? 0} · SR: ${batInfo?.sr ?? '0.0'}`}
                </p>
              </div>
            </div>
            {isWheel && (
              <WagonWheelSvg
                balls={inn.balls.filter((b) => b.strikerId === pid)}
                title={`${pName} Shots`}
              />
            )}
          </div>
        </div>
      );
    }

    if (card.kind === 'HIGHLIGHTS' || card.kind === 'DAY_WISE') {
      const targetInn =
        card.kind === 'HIGHLIGHTS' && card.mode.startsWith('1st') ? inn1 : inn2;
      const dayMatches =
        card.kind === 'DAY_WISE'
          ? state.matches.filter((m) => m.dayLabel.toLowerCase() === card.day.toLowerCase())
          : [];
      return (
        <div className={frameCls}>
          <div className="px-5 py-2 bg-[#DC2626] font-display font-black text-xs sm:text-sm uppercase text-[#FFE600]">
            {card.kind === 'HIGHLIGHTS' ? `HIGHLIGHTS · ${card.mode}` : `DAYWISE STATS · ${card.day}`}
          </div>
          <div className="p-4 text-xs sm:text-sm space-y-2">
            {card.kind === 'DAY_WISE' ? (
              dayMatches.length === 0 ? (
                <p className="text-zinc-300">No matches scheduled on {card.day} yet.</p>
              ) : (
                dayMatches.map((dm) => (
                  <div
                    key={dm.id}
                    className="flex items-center justify-between border-b border-white/10 pb-1.5"
                  >
                    <span className="font-bold">
                      {dm.matchLabel}: {teamMap.get(dm.team1Id)?.shortName} vs{' '}
                      {teamMap.get(dm.team2Id)?.shortName}
                    </span>
                    <span className="text-[#FFE600] font-mono text-xs">{dm.resultText}</span>
                  </div>
                ))
              )
            ) : card.mode === 'CR Partnership' ? (
              <div className="text-center py-2">
                <p className="text-zinc-300 text-xs uppercase font-mono">Current Partnership</p>
                <p className="font-mono text-3xl font-black text-[#FFE600]">
                  {partnership.runs} Runs ({partnership.balls} Balls)
                </p>
              </div>
            ) : card.mode.includes('FOW') ? (
              <div className="flex flex-wrap gap-2">
                {targetInn.fallOfWickets.map((f) => (
                  <span
                    key={f.wicketNumber}
                    className="px-3 py-1.5 rounded-lg bg-black/50 border border-white/15 font-mono text-xs"
                  >
                    {f.scoreAtFall}-{f.wicketNumber} {f.playerName} ({f.oversAtFall})
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-between font-mono">
                <span className="font-sans font-bold text-base">
                  {teamMap.get(targetInn.battingTeamId)?.name}
                </span>
                <span className="text-xl font-black text-[#FFE600]">
                  {targetInn.runs}-{targetInn.wickets} ({formatOvers(targetInn.legalBalls)})
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }

    // MATCH_STATS modes
    if (card.kind === 'MATCH_STATS') {
      const m = card.mode;
      if (m.includes('Wagonwheel') || m.includes('Runs Map')) {
        const useFirst = m.startsWith('1st');
        return (
          <div className={frameCls}>
            <div className="px-5 py-2 bg-[#DC2626] font-display font-black text-xs sm:text-sm uppercase text-[#FFE600]">
              {m} · {useFirst ? team1?.name : team2?.name}
            </div>
            <div className="p-4 flex justify-center">
              <WagonWheelSvg
                balls={useFirst ? inn1.balls : inn2.balls}
                title={`${useFirst ? team1?.shortName : team2?.shortName} · ${m}`}
              />
            </div>
          </div>
        );
      }

      if (m === 'Player Position') {
        return (
          <div className={frameCls}>
            <div className="px-5 py-2 bg-[#DC2626] font-display font-black text-xs sm:text-sm uppercase text-[#FFE600]">
              FIELDING POSITIONS · {bowlTeam?.name}
            </div>
            <div className="p-4">
              <FieldDiagramSvg positions={state.fieldPositions} playerNameMap={playerMap} />
            </div>
          </div>
        );
      }

      if (m.includes('Playing XI')) {
        const showBoth = m === 'Both Playing XI';
        const showBat = m === 'Batting Playing XI' || showBoth;
        const showBowl = m === 'Bowling Playing XI' || showBoth;
        return (
          <div className={frameCls}>
            <div className="px-5 py-2 bg-[#DC2626] font-display font-black text-xs sm:text-sm uppercase text-[#FFE600]">
              {m}
            </div>
            <div className={`p-4 grid gap-4 ${showBoth ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {showBat && (
                <div>
                  <p className="font-bold text-[#FFE600] text-xs mb-1.5">{batTeam?.name}</p>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    {(batTeam?.players || []).slice(0, 11).map((p, i) => (
                      <div key={p.id} className="truncate">
                        {i + 1}. {p.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {showBowl && (
                <div>
                  <p className="font-bold text-[#FFE600] text-xs mb-1.5">{bowlTeam?.name}</p>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    {(bowlTeam?.players || []).slice(0, 11).map((p, i) => (
                      <div key={p.id} className="truncate">
                        {i + 1}. {p.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }

      if (m === 'Match Summary' || m === 'Match Comparison') {
        return (
          <div className={frameCls}>
            <div className="px-5 py-2 bg-[#DC2626] font-display font-black text-xs sm:text-sm uppercase text-[#FFE600]">
              {m} · {match.matchLabel}
            </div>
            <div className="p-4 grid grid-cols-2 gap-4 text-center">
              <div className="rounded-xl bg-black/40 border border-white/10 p-3">
                <p className="font-bold text-sm">{team1?.name}</p>
                <p className="font-mono text-2xl font-black text-[#FFE600]">
                  {inn1.runs}-{inn1.wickets}
                </p>
                <p className="font-mono text-xs text-zinc-300">
                  ({formatOvers(inn1.legalBalls)} Ov · RR {calcRunRate(inn1.runs, inn1.legalBalls)})
                </p>
              </div>
              <div className="rounded-xl bg-black/40 border border-white/10 p-3">
                <p className="font-bold text-sm">{team2?.name}</p>
                <p className="font-mono text-2xl font-black text-[#FFE600]">
                  {inn2.runs}-{inn2.wickets}
                </p>
                <p className="font-mono text-xs text-zinc-300">
                  ({formatOvers(inn2.legalBalls)} Ov · RR {calcRunRate(inn2.runs, inn2.legalBalls)})
                </p>
              </div>
            </div>
          </div>
        );
      }

      // Batting / Bowling Cards (1st inn / current / mini)
      const isBowling = m.toLowerCase().includes('bowling');
      const useFirstInn = m.startsWith('1st');
      const srcInn = useFirstInn ? inn1 : inn;
      const srcBatTeam = teamMap.get(srcInn.battingTeamId);
      const srcBowlTeam = teamMap.get(srcInn.bowlingTeamId);
      const bRows = computeBattingCard(srcInn, srcBatTeam);
      const bwRows = computeBowlingCard(srcInn, srcBowlTeam);

      return (
        <div className={frameCls}>
          <div className="px-5 py-2 bg-[#DC2626] flex items-center justify-between">
            <span className="font-display font-black text-xs sm:text-sm uppercase text-[#FFE600]">
              {m} · {isBowling ? srcBowlTeam?.name : srcBatTeam?.name}
            </span>
            <span className="font-mono text-xs font-black text-white">
              {srcInn.runs}-{srcInn.wickets} ({formatOvers(srcInn.legalBalls)})
            </span>
          </div>
          <div className="p-3 overflow-x-auto">
            {isBowling ? (
              <table className="w-full text-xs font-mono">
                <thead className="text-[#FFE600] border-b border-white/15">
                  <tr>
                    <th className="py-1 px-2 text-left">Bowler</th>
                    <th className="py-1 px-2 text-right">O</th>
                    <th className="py-1 px-2 text-right">R</th>
                    <th className="py-1 px-2 text-right">W</th>
                    <th className="py-1 px-2 text-right">Eco</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {bwRows.slice(0, m.includes('Mini') ? 4 : 8).map((r) => (
                    <tr key={r.playerId}>
                      <td className="py-1 px-2 font-sans font-bold">{r.name}</td>
                      <td className="py-1 px-2 text-right">{r.overs}</td>
                      <td className="py-1 px-2 text-right">{r.runs}</td>
                      <td className="py-1 px-2 text-right font-black text-[#FFE600]">{r.wickets}</td>
                      <td className="py-1 px-2 text-right">{r.economy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-xs font-mono">
                <thead className="text-[#FFE600] border-b border-white/15">
                  <tr>
                    <th className="py-1 px-2 text-left">Batter</th>
                    <th className="py-1 px-2 text-right">R</th>
                    <th className="py-1 px-2 text-right">B</th>
                    <th className="py-1 px-2 text-right">4s</th>
                    <th className="py-1 px-2 text-right">6s</th>
                    <th className="py-1 px-2 text-right">SR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {bRows.slice(0, m.includes('Mini') ? 4 : 8).map((r) => (
                    <tr key={r.playerId}>
                      <td className="py-1 px-2 font-sans font-bold">
                        {r.name} {!r.isOut ? '*' : ''}
                      </td>
                      <td className="py-1 px-2 text-right font-black text-[#FFE600]">{r.runs}</td>
                      <td className="py-1 px-2 text-right">{r.balls}</td>
                      <td className="py-1 px-2 text-right">{r.fours}</td>
                      <td className="py-1 px-2 text-right">{r.sixes}</td>
                      <td className="py-1 px-2 text-right">{r.sr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  // Render Bottom Score Strip (All 19 Bottom Score Modes)
  const renderBottomBar = () => {
    const mode = ov.bottomScoreMode;
    if (mode === 'EMPTY') return null;

    const stripCls = `w-full max-w-5xl mx-auto rounded-xl bg-gradient-to-r ${palette.barBg} border-2 ${palette.border} shadow-[0_14px_40px_rgba(0,0,0,0.85)] overflow-hidden text-white`;

    if (mode === 'Score' || mode === 'Bottom Need') {
      return (
        <div className={stripCls}>
          <div className="grid grid-cols-12 items-center px-3 py-2 gap-2">
            <div className="col-span-4 flex items-center gap-2 min-w-0">
              {renderTeamBadge(batTeam)}
              <div className="min-w-0">
                <p className="font-display font-black text-xs sm:text-sm text-[#FFE600] truncate">
                  {batTeam?.shortName} v {bowlTeam?.shortName}
                </p>
                <div className="flex items-baseline gap-1.5 font-mono">
                  <span className="text-lg sm:text-2xl font-black text-white leading-none">
                    {inn.runs}-{inn.wickets}
                  </span>
                  <span className="text-[11px] sm:text-xs font-bold text-[#FFE600]">
                    ({formatOvers(inn.legalBalls)}/{inn.maxOvers})
                  </span>
                </div>
              </div>
            </div>

            <div className="col-span-4 border-x border-white/15 px-2.5 text-[11px] sm:text-xs space-y-0.5 min-w-0">
              <div className="flex justify-between gap-2 font-bold">
                <span className="truncate text-[#FFE600]">▶ {striker?.name || 'Striker'}</span>
                <span className="font-mono shrink-0">
                  {striker?.runs ?? 0}({striker?.balls ?? 0})
                </span>
              </div>
              <div className="flex justify-between gap-2 text-zinc-300">
                <span className="truncate">{nonStriker?.name || 'Non-Striker'}</span>
                <span className="font-mono shrink-0">
                  {nonStriker?.runs ?? 0}({nonStriker?.balls ?? 0})
                </span>
              </div>
            </div>

            <div className="col-span-4 text-[11px] sm:text-xs space-y-1 min-w-0">
              <div className="flex justify-between gap-1 font-bold">
                <span className="truncate text-sky-300">{bowler?.name || 'Bowler'}</span>
                <span className="font-mono text-[#FFE600] shrink-0">
                  {bowler?.wickets ?? 0}-{bowler?.runs ?? 0} ({bowler?.overs ?? '0.0'})
                </span>
              </div>
              <div className="flex items-center gap-1 overflow-hidden">
                {inn.balls.slice(-6).map((b) => (
                  <span
                    key={b.id}
                    className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-black ${
                      b.isWicket
                        ? 'bg-[#DC2626] text-white'
                        : b.runsOffBat >= 4
                          ? 'bg-[#FFE600] text-black'
                          : 'bg-white/15 text-white'
                    }`}
                  >
                    {getBallPillLabel(b)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {mode === 'Bottom Need' && (
            <div className="px-3 py-1 bg-[#DC2626] text-center font-mono text-[11px] font-black text-[#FFE600]">
              {needRuns !== null
                ? `${batTeam?.name} NEED ${needRuns} RUNS OFF ${remBalls} BALLS`
                : `CRR: ${crr} · PROJECTED: ${projected}`}
            </div>
          )}
        </div>
      );
    }

    if (mode === 'Last 15 Balls') {
      return (
        <div className={`${stripCls} px-4 py-2.5 flex items-center justify-between gap-3`}>
          <span className="font-display font-black text-xs uppercase text-[#FFE600] shrink-0">
            LAST 15 BALLS
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {last15.map((b) => (
              <span
                key={b.id}
                className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-black ${
                  b.isWicket
                    ? 'bg-[#DC2626] text-white'
                    : b.runsOffBat >= 4
                      ? 'bg-[#FFE600] text-black'
                      : 'bg-white/15 text-white'
                }`}
              >
                {getBallPillLabel(b)}
              </span>
            ))}
          </div>
        </div>
      );
    }

    if (mode === 'Versus' || mode === 'Versus With Logo') {
      return (
        <div className={`${stripCls} px-5 py-2.5 flex items-center justify-center gap-4`}>
          {mode === 'Versus With Logo' && renderTeamBadge(team1)}
          <span className="font-display text-base sm:text-xl font-black text-white">
            {team1?.name}
          </span>
          <span className="px-2.5 py-0.5 rounded bg-[#DC2626] text-[#FFE600] font-mono text-xs font-black">
            VS
          </span>
          <span className="font-display text-base sm:text-xl font-black text-white">
            {team2?.name}
          </span>
          {mode === 'Versus With Logo' && renderTeamBadge(team2)}
        </div>
      );
    }

    if (mode === 'Mini Player Position') {
      return (
        <div className={`${stripCls} px-4 py-2 flex items-center justify-between gap-4`}>
          <div className="space-y-0.5">
            <p className="font-display font-black text-xs text-[#FFE600] uppercase">
              MINI FIELD POSITION · {bowlTeam?.name}
            </p>
            <p className="font-mono text-xs text-zinc-200">
              {batTeam?.shortName} {inn.runs}-{inn.wickets} ({formatOvers(inn.legalBalls)})
            </p>
          </div>
          <FieldDiagramSvg positions={state.fieldPositions} playerNameMap={playerMap} compact />
        </div>
      );
    }

    // All other sleek lower-third ticker banners
    let bannerTitle = mode.toUpperCase();
    let bannerText = '';
    if (mode === 'Toss') {
      const winner = teamMap.get(match.tossWinnerId)?.name || team1?.name;
      bannerText = `${winner} won the toss & elected to ${match.tossDecision} first`;
    } else if (mode === 'Need') {
      bannerText =
        needRuns !== null
          ? `${batTeam?.name} need ${needRuns} runs from ${remBalls} balls`
          : `Target not set yet · CRR ${crr}`;
    } else if (mode === 'Current Partnership' || mode === 'Mini Curr. Partnership') {
      bannerText = `${striker?.name || 'Batter 1'} & ${nonStriker?.name || 'Batter 2'} · ${partnership.runs} Runs (${partnership.balls} Balls)`;
    } else if (mode === 'Result') {
      bannerText = match.resultText;
    } else if (mode === 'Projected Score') {
      bannerText = `At Current RR (${crr}): ${projected} · At 10 RPO: ${inn.runs + Math.round((remBalls / 6) * 10)} · At 12 RPO: ${inn.runs + Math.round((remBalls / 6) * 12)}`;
    } else if (mode === 'Mini Match Comparison') {
      bannerText = `${team1?.shortName}: ${inn1.runs}-${inn1.wickets} (${formatOvers(inn1.legalBalls)})  |  ${team2?.shortName}: ${inn2.runs}-${inn2.wickets} (${formatOvers(inn2.legalBalls)})`;
    } else if (mode === "6's") {
      bannerText = `Total Sixes in Innings: ${totalSixes}`;
    } else if (mode === "4's") {
      bannerText = `Total Fours in Innings: ${totalFours}`;
    } else if (mode === 'Tournament Name') {
      bannerTitle = state.user.channelTitle;
      bannerText = `${tournament?.name || 'Star Event Live Tournament'} · ${match.stageBadge} · ${match.matchLabel}`;
    } else if (mode === 'Last Wicket') {
      bannerText = lastWicket
        ? `${lastWicket.playerName} (${lastWicket.wicketType}) · ${lastWicket.scoreAtFall}-${lastWicket.wicketNumber} (${lastWicket.oversAtFall} Ov)`
        : 'No wicket fallen in this innings yet';
    } else if (mode === 'Last Bowler') {
      bannerText = `${bowler?.name || 'Bowler'} · ${bowler?.overs ?? '0.0'}-${bowler?.maidens ?? 0}-${bowler?.runs ?? 0}-${bowler?.wickets ?? 0} (Eco ${bowler?.economy ?? '0.00'})`;
    }

    return (
      <div className={`${stripCls} px-4 py-2.5 flex flex-wrap items-center justify-between gap-2`}>
        <span className="px-2.5 py-1 rounded bg-[#DC2626] font-mono text-[11px] font-black text-[#FFE600] uppercase shrink-0">
          {bannerTitle}
        </span>
        <span className="font-display font-bold text-xs sm:text-base text-white flex-1 text-center">
          {bannerText}
        </span>
        <span className="font-mono text-xs font-black text-[#FFE600] shrink-0">
          {batTeam?.shortName} {inn.runs}-{inn.wickets}
        </span>
      </div>
    );
  };

  return (
    <div
      className={`relative w-full h-full flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden ${
        isPreview ? 'text-[11px]' : 'min-h-screen'
      }`}
    >
      {/* Top Row: Channel Bug */}
      <div className="flex items-start justify-between">
        <div />
        {ov.showChannelLogo && (
          <div className="px-3 py-1.5 rounded-lg bg-[#09090D]/85 border border-[#FFE600]/65 flex items-center gap-2 shadow-lg">
            {state.user.channelLogoUrl ? (
              <img
                src={state.user.channelLogoUrl}
                alt="Channel Logo"
                className="w-6 h-6 rounded object-cover"
              />
            ) : (
              <span className="text-[#FFE600] font-black text-sm">★</span>
            )}
            <span className="font-display font-black text-xs text-white tracking-wide">
              {state.user.channelTitle || 'STAR EVENT LIVE'}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-[#DC2626] text-[9px] font-mono font-black text-white">
              LIVE
            </span>
          </div>
        )}
      </div>

      {/* Center Broadcast Card */}
      <div className="my-auto py-2">{renderMainCard()}</div>

      {/* Bottom Score Bar */}
      <div className="w-full">{renderBottomBar()}</div>

      {/* Animated Full-Screen Broadcast Transition Overlay */}
      {visibleTransition && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/30">
          <div className="px-10 py-6 rounded-2xl bg-gradient-to-r from-[#8B0000] via-[#DC2626] to-[#8B0000] border-4 border-[#FFE600] shadow-[0_0_60px_rgba(255,230,0,0.65)] animate-bounce text-center">
            <p className="font-mono text-xs font-black uppercase tracking-[0.3em] text-white/90">
              STAR EVENT LIVE
            </p>
            <p className="font-display text-4xl sm:text-6xl font-black uppercase tracking-wider text-[#FFE600] drop-shadow-[0_4px_12px_rgba(0,0,0,0.75)]">
              {visibleTransition}!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
