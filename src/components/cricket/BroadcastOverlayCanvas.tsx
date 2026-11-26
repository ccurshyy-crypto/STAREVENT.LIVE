import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy } from 'lucide-react';
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
  getTeamColorHex,
  getTeamTextColorHex,
  getThemePalette,
} from '../../data/cricketSampleData';
import {
  BallEvent,
  CricketSuiteState,
  Player,
  Team,
} from '../../types/cricketSuite';
import { ProScoreboardBar } from './ProScoreboardBar';
import { TataIplScoreboardBar } from './TataIplScoreboardBar';
import { WorldCupScoreboardBar } from './WorldCupScoreboardBar';

interface BroadcastOverlayCanvasProps {
  state: CricketSuiteState | null;
  matchId?: string;
  bgMode?: 'transparent' | 'green';
}

export function BroadcastOverlayCanvas({
  state,
  matchId,
  bgMode = 'transparent',
}: BroadcastOverlayCanvasProps) {
  const [visibleTransitionId, setVisibleTransitionId] = useState<number | null>(null);

  const activeTransition = state?.overlay.activeTransition ?? null;

  useEffect(() => {
    if (!activeTransition) {
      setVisibleTransitionId(null);
      return;
    }
    const ageMs = Date.now() - activeTransition.id;
    if (ageMs > 4500) {
      setVisibleTransitionId(null);
      return;
    }
    setVisibleTransitionId(activeTransition.id);
    const timer = window.setTimeout(() => {
      setVisibleTransitionId(null);
    }, Math.max(1200, 3400 - Math.max(0, ageMs)));
    return () => window.clearTimeout(timer);
  }, [activeTransition?.id, activeTransition?.type]);

  const match = useMemo(() => {
    if (!state) return undefined;
    if (matchId) {
      const exact = state.matches.find((m) => m.id === matchId);
      if (exact) return exact;
    }
    return state.matches.find((m) => m.id === state.activeMatchId) ?? state.matches[0];
  }, [state, matchId]);

  const teamMap = useMemo(
    () => new Map((state?.teams ?? []).map((t) => [t.id, t])),
    [state?.teams]
  );

  const bgStyle = { background: bgMode === 'green' ? '#00B140' : 'transparent' };

  if (!state) {
    return (
      <div
        className="w-full h-full select-none overflow-hidden"
        style={bgStyle}
        aria-label="Broadcast overlay canvas"
      />
    );
  }

  const { overlay } = state;
  const theme = getThemePalette(state.user.userTheme, state.user.customThemeColors);
  const useTataIplPatti =
    !state.user.customThemeColors?.enabled &&
    (theme.id === 'tata-ipl-2022' || Boolean(theme.barStyle?.isTataIpl2022));
  const useWorldCupPatti =
    !state.user.customThemeColors?.enabled &&
    (theme.id === 'worldcup' || Boolean(theme.barStyle?.isWorldCup));
  const showTransition =
    activeTransition !== null && visibleTransitionId === activeTransition.id;

  const isCompletelyEmpty =
    overlay.bottomScoreMode === 'EMPTY' &&
    overlay.mainCard.kind === 'NONE' &&
    !showTransition;

  if (isCompletelyEmpty) {
    return (
      <div
        className="w-full h-full select-none overflow-hidden"
        style={bgStyle}
        aria-label="Empty broadcast overlay canvas"
      />
    );
  }

  const tournament = state.tournaments.find(
    (t) => t.id === (match?.tournamentId || state.activeTournamentId)
  );
  const activeInn = match ? match.innings[match.currentInningsIndex] : undefined;
  const inn1 = match?.innings[0];
  const inn2 = match?.innings[1];
  const batTeam = activeInn ? teamMap.get(activeInn.battingTeamId) : undefined;
  const bowlTeam = activeInn ? teamMap.get(activeInn.bowlingTeamId) : undefined;
  const team1 = match ? teamMap.get(match.team1Id) : undefined;
  const team2 = match ? teamMap.get(match.team2Id) : undefined;

  const battingCard = activeInn ? computeBattingCard(activeInn, batTeam) : [];
  const bowlingCard = activeInn ? computeBowlingCard(activeInn, bowlTeam) : [];
  const inn1BatCard = inn1 ? computeBattingCard(inn1, teamMap.get(inn1.battingTeamId)) : [];
  const inn1BowlCard = inn1 ? computeBowlingCard(inn1, teamMap.get(inn1.bowlingTeamId)) : [];

  const striker = battingCard.find((b) => b.playerId === activeInn?.strikerId);
  const nonStriker = battingCard.find((b) => b.playerId === activeInn?.nonStrikerId);
  const bowler = bowlingCard.find((b) => b.playerId === activeInn?.bowlerId);
  const partnership = activeInn
    ? computeCurrentPartnership(activeInn)
    : { runs: 0, balls: 0, fours: 0, sixes: 0 };

  const currentOverIdx = activeInn ? Math.floor(activeInn.legalBalls / 6) : 0;
  const thisOverBalls = activeInn
    ? activeInn.balls.filter((b) => b.over === currentOverIdx)
    : [];
  const last15Balls = activeInn ? activeInn.balls.slice(-15) : [];

  const crr = activeInn ? calcRunRate(activeInn.runs, activeInn.legalBalls) : '0.00';
  const maxBalls = activeInn ? activeInn.maxOvers * 6 : 36;
  const remBalls = activeInn ? Math.max(0, maxBalls - activeInn.legalBalls) : 0;
  const target =
    match && match.currentInningsIndex === 1
      ? activeInn?.target ?? (inn1 ? inn1.runs + 1 : null)
      : null;
  const needRuns =
    target !== null && activeInn ? Math.max(0, target - activeInn.runs) : null;
  const rrr =
    needRuns !== null && remBalls > 0
      ? ((needRuns * 6) / remBalls).toFixed(2)
      : '0.00';

  const findPlayerById = (pid: string): { player?: Player; team?: Team } => {
    for (const t of state.teams) {
      const found = t.players.find((p) => p.id === pid);
      if (found) return { player: found, team: t };
    }
    return {};
  };

  const renderTeamBadge = (team: Team | undefined, size = 'w-9 h-9') => {
    if (!overlay.showTeamLogo) return null;
    if (team?.logoUrl) {
      return (
        <img
          src={team.logoUrl}
          alt={team.shortName}
          referrerPolicy="no-referrer"
          className={`${size} rounded-full object-cover border-2 border-white/60 shrink-0 bg-white`}
        />
      );
    }
    return (
      <div
        className={`${size} rounded-full flex items-center justify-center font-display font-black text-xs border-2 border-white/60 shrink-0`}
        style={{
          background: team?.customColor ? getTeamColorHex(team) : theme.secondary,
          color: team?.customColor ? getTeamTextColorHex(team) : '#FFFFFF',
        }}
      >
        {(team?.shortName || 'TM').slice(0, 3)}
      </div>
    );
  };

  const renderBallDot = (b: BallEvent) => {
    const label = getBallPillLabel(b);
    let bg = '#1E293B';
    let color = '#FFFFFF';
    if (b.isWicket) {
      bg = '#DC2626';
    } else if (b.isBoundary6) {
      bg = '#7C3AED';
      color = '#FFFFFF';
    } else if (b.isBoundary4) {
      bg = '#FACC15';
      color = '#0F172A';
    } else if (b.extraType !== 'none') {
      bg = '#16A34A';
      color = '#FFFFFF';
    }
    return (
      <span
        key={b.id}
        className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full text-[11px] font-black shadow-xs"
        style={{ background: bg, color }}
      >
        {label}
      </span>
    );
  };

  const renderWagonWheelSvg = (balls: BallEvent[], title: string) => (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs font-bold uppercase tracking-widest text-white/80">{title}</p>
      <svg viewBox="0 0 240 240" className="w-56 h-56 drop-shadow-lg">
        <circle cx="120" cy="120" r="112" fill="#15803D" stroke="#FFFFFF" strokeWidth="3" />
        <circle
          cx="120"
          cy="120"
          r="64"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.7"
        />
        <rect x="115" y="102" width="10" height="36" rx="2" fill="#E5C07B" />
        {balls
          .filter((b) => b.runsOffBat > 0)
          .map((b) => {
            const rad = (b.wagonAngle * Math.PI) / 180;
            const len = b.wagonDistance * 105;
            const x2 = 120 + Math.cos(rad) * len;
            const y2 = 120 + Math.sin(rad) * len;
            const stroke = b.isBoundary6
              ? '#FACC15'
              : b.isBoundary4
                ? '#38BDF8'
                : '#FFFFFF';
            return (
              <line
                key={b.id}
                x1="120"
                y1="120"
                x2={x2}
                y2={y2}
                stroke={stroke}
                strokeWidth={b.isBoundary6 ? 3 : b.isBoundary4 ? 2.5 : 1.5}
                strokeLinecap="round"
                opacity="0.92"
              />
            );
          })}
      </svg>
      <div className="flex items-center gap-4 text-[11px] font-bold text-white/90">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-1 bg-[#FACC15] inline-block" /> 6s
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-1 bg-[#38BDF8] inline-block" /> 4s
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-1 bg-white inline-block" /> 1s-3s
        </span>
      </div>
    </div>
  );

  const renderMainCard = () => {
    const card = overlay.mainCard;
    if (card.kind === 'NONE') return null;

    const CardShell = ({
      title,
      subtitle,
      children,
      wide = true,
    }: {
      title: string;
      subtitle?: string;
      children: React.ReactNode;
      wide?: boolean;
    }) => (
      <div className="absolute inset-0 flex items-center justify-center px-8 pb-24 pt-12 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 310, damping: 25 }}
          className={`${wide ? 'w-full max-w-4xl' : 'w-full max-w-2xl'} rounded-2xl overflow-hidden shadow-2xl border-2 ${
            useTataIplPatti ? 'overlay-canvas-card' : ''
          }`}
          style={{
            background: useTataIplPatti ? undefined : `${theme.surface}F2`,
            borderColor: useTataIplPatti ? '#FFE600' : theme.accent,
          }}
        >
          <div
            className={`relative overflow-hidden px-6 py-3.5 flex items-center justify-between gap-4 ${
              useTataIplPatti ? 'studio-strip-animated-bg border-b border-[#FFE600]/45' : ''
            }`}
            style={
              useTataIplPatti
                ? undefined
                : {
                    background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})`,
                  }
            }
          >
            {useTataIplPatti && (
              <>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FFE600]/80 to-transparent"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden"
                >
                  <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-[#EF1A1A] to-[#FFE600] opacity-90 topbar-beam-sweep" />
                </div>
              </>
            )}
            <div className="relative z-10">
              <h2 className="font-display font-black text-lg sm:text-xl text-white uppercase tracking-wide drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs font-semibold text-amber-100/85">{subtitle}</p>
              )}
            </div>
            <span
              className="relative z-10 px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-wider text-[#070B28] shadow-sm"
              style={{
                background: useTataIplPatti
                  ? 'linear-gradient(180deg, #FFF04D 0%, #FFE600 55%, #F5B800 100%)'
                  : theme.accent,
              }}
            >
              {tournament?.shortName || state.user.channelTitle || 'LIVE'}
            </span>
          </div>
          <div className="relative z-10 p-5 text-white">{children}</div>
        </motion.div>
      </div>
    );

    if (card.kind === 'CUSTOM_MESSAGE') {
      return (
        <CardShell
          title={card.heading || (card.tab === 'OTHER' ? 'ANNOUNCEMENT' : 'LIVE UPDATE')}
          subtitle={tournament?.name || state.user.channelTitle}
          wide={false}
        >
          <p className="text-lg sm:text-2xl font-display font-bold text-center py-6 leading-snug text-white">
            {card.description || 'Welcome to live broadcast coverage'}
          </p>
        </CardShell>
      );
    }

    if (card.kind === 'POINTS_TABLE') {
      const rows = computePointTableRows(state, tournament?.id).filter((r) =>
        card.groupId === 'ALL' ? true : r.groupId === card.groupId
      );
      const grpName =
        card.groupId === 'ALL'
          ? 'All Teams'
          : state.groups.find((g) => g.id === card.groupId)?.name || 'Group';
      return (
        <CardShell
          title={`POINTS TABLE — ${grpName}`}
          subtitle={tournament?.name}
        >
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-xs uppercase border-b border-white/20"
                style={{ color: theme.accent }}
              >
                <th className="py-2 text-left">Team</th>
                <th className="py-2 text-right">P</th>
                <th className="py-2 text-right">W</th>
                <th className="py-2 text-right">L</th>
                <th className="py-2 text-right">NRR</th>
                <th className="py-2 text-right">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.slice(0, 8).map((r, i) => (
                <tr key={r.teamId}>
                  <td className="py-2 font-bold">
                    {i + 1}. {r.teamName}
                  </td>
                  <td className="py-2 text-right tabular-nums">{r.played}</td>
                  <td className="py-2 text-right tabular-nums">{r.won}</td>
                  <td className="py-2 text-right tabular-nums">{r.lost}</td>
                  <td className="py-2 text-right tabular-nums">
                    {r.nrr >= 0 ? `+${r.nrr.toFixed(3)}` : r.nrr.toFixed(3)}
                  </td>
                  <td
                    className="py-2 text-right font-black tabular-nums"
                    style={{ color: theme.accent }}
                  >
                    {r.points}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-white/60">
                    No teams in points table yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardShell>
      );
    }

    if (card.kind === 'TOURNAMENT_STATS') {
      const stats = computeTournamentStats(state, tournament?.id);
      const sorted = [...stats].sort((a, b) => {
        if (card.mode === 'T10 wickets') return b.wickets - a.wickets;
        if (card.mode === 'T10 6s') return b.sixes - a.sixes;
        if (card.mode === 'T10 4s') return b.fours - a.fours;
        if (card.mode === 'T10 Highest Scorer') return b.highestScore - a.highestScore;
        if (card.mode === 'T10 Valuable Player') return b.mvpPoints - a.mvpPoints;
        return b.runs - a.runs;
      });
      return (
        <CardShell title={card.mode.toUpperCase()} subtitle={tournament?.name}>
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-xs uppercase border-b border-white/20"
                style={{ color: theme.accent }}
              >
                <th className="py-2 text-left">Player</th>
                <th className="py-2 text-left">Team</th>
                <th className="py-2 text-right">M</th>
                <th className="py-2 text-right">Runs</th>
                <th className="py-2 text-right">Wkts</th>
                <th className="py-2 text-right">4s/6s</th>
                <th className="py-2 text-right">Highlight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {sorted.slice(0, 8).map((s, idx) => (
                <tr key={s.playerId}>
                  <td className="py-2 font-bold">
                    {idx + 1}. {s.playerName}
                  </td>
                  <td className="py-2 text-white/75">{s.teamShort}</td>
                  <td className="py-2 text-right tabular-nums">{s.matches}</td>
                  <td className="py-2 text-right tabular-nums">{s.runs}</td>
                  <td className="py-2 text-right tabular-nums">{s.wickets}</td>
                  <td className="py-2 text-right tabular-nums">
                    {s.fours}/{s.sixes}
                  </td>
                  <td
                    className="py-2 text-right font-black tabular-nums"
                    style={{ color: theme.accent }}
                  >
                    {card.mode === 'T10 wickets'
                      ? `${s.wickets}W`
                      : card.mode === 'T10 6s'
                        ? `${s.sixes} Sixes`
                        : card.mode === 'T10 4s'
                          ? `${s.fours} Fours`
                          : card.mode === 'T10 Highest Scorer'
                            ? `${s.highestScore}*`
                            : card.mode === 'T10 Valuable Player'
                              ? `${s.mvpPoints} pts`
                              : `${s.runs} runs`}
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-white/60">
                    No tournament match statistics recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardShell>
      );
    }

    if (card.kind === 'DAY_WISE') {
      const dayMatches = state.matches.filter(
        (m) => m.dayLabel.toLowerCase() === card.day.toLowerCase()
      );
      return (
        <CardShell title={`DAYWISE STATS — ${card.day}`} subtitle={tournament?.name}>
          <div className="space-y-2.5">
            {dayMatches.length === 0 ? (
              <p className="text-center py-6 text-white/70">
                No matches scheduled under {card.day}.
              </p>
            ) : (
              dayMatches.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/10"
                >
                  <div>
                    <p className="font-bold text-sm">
                      {teamMap.get(m.team1Id)?.name} vs {teamMap.get(m.team2Id)?.name}
                    </p>
                    <p className="text-xs text-white/70">
                      {m.matchLabel} · {m.resultText}
                    </p>
                  </div>
                  <div className="text-right font-black text-sm tabular-nums">
                    <div>
                      {teamMap.get(m.innings[0].battingTeamId)?.shortName}{' '}
                      {m.innings[0].runs}/{m.innings[0].wickets}
                    </div>
                    <div>
                      {teamMap.get(m.innings[1].battingTeamId)?.shortName}{' '}
                      {m.innings[1].runs}/{m.innings[1].wickets}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardShell>
      );
    }

    if (card.kind === 'PLAYER_OF_MATCH') {
      const targetPid = card.playerId || match?.playerOfMatchId || '';
      const { player, team } = findPlayerById(targetPid);
      const tourStat = computeTournamentStats(state, tournament?.id).find(
        (s) => s.playerId === targetPid
      );
      return (
        <CardShell
          title="PLAYER OF THE MATCH"
          subtitle={match?.matchLabel || tournament?.name}
          wide={false}
        >
          <div className="flex items-center gap-5 py-3">
            {overlay.showPlayerPhoto && player?.photoUrl ? (
              <img
                src={player.photoUrl}
                alt={player.name}
                referrerPolicy="no-referrer"
                className="w-24 h-24 rounded-2xl object-cover border-2 border-white/60"
              />
            ) : (
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center font-display font-black text-3xl text-slate-950"
                style={{ background: theme.accent }}
              >
                {(player?.name || 'P').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="space-y-1">
              <p className="text-2xl font-display font-black text-white">
                {player?.name || 'Select Player of the Match'}
              </p>
              <p className="text-sm font-bold" style={{ color: theme.accent }}>
                {team?.name || 'Tournament Squad'}
              </p>
              {card.display === 'Stats' && tourStat && (
                <p className="text-sm text-white/90 pt-1">
                  Runs: <strong>{tourStat.runs}</strong> · 4s/6s:{' '}
                  <strong>
                    {tourStat.fours}/{tourStat.sixes}
                  </strong>{' '}
                  · Wickets: <strong>{tourStat.wickets}</strong>
                </p>
              )}
            </div>
          </div>
        </CardShell>
      );
    }

    if (
      card.kind === 'BATSMAN_STATS' ||
      card.kind === 'BOWLER_STATS' ||
      card.kind === 'TEAM_PLAYER_STATS'
    ) {
      const pid = card.playerId;
      const { player, team } = findPlayerById(pid);
      const agg = computeTournamentStats(state, tournament?.id).find(
        (s) => s.playerId === pid
      );
      const modeTitle =
        card.kind === 'TEAM_PLAYER_STATS'
          ? `${card.category.toUpperCase()} · ${card.mode}`
          : card.mode.toUpperCase();

      if (
        card.kind === 'BATSMAN_STATS' &&
        (card.mode === 'Wagon Wheel' || card.mode === 'Tournament Wagon Wheel')
      ) {
        const playerBalls = (activeInn?.balls ?? []).filter((b) => b.strikerId === pid);
        return (
          <CardShell
            title={`${player?.name || 'Batsman'} — ${card.mode}`}
            subtitle={team?.name}
            wide={false}
          >
            {renderWagonWheelSvg(playerBalls, `${player?.name || 'Batsman'} Shot Map`)}
          </CardShell>
        );
      }

      return (
        <CardShell
          title={`${player?.name || 'Player'} — ${modeTitle}`}
          subtitle={team?.name || tournament?.name}
          wide={false}
        >
          <div className="flex items-center gap-5">
            {overlay.showPlayerPhoto && player?.photoUrl ? (
              <img
                src={player.photoUrl}
                alt={player.name}
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-xl object-cover border-2 border-white/50 shrink-0"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-xl flex items-center justify-center font-display font-black text-2xl text-slate-950 shrink-0"
                style={{ background: theme.accent }}
              >
                #{player?.jerseyNo ?? 1}
              </div>
            )}
            <div className="grid grid-cols-4 gap-3 flex-1 text-center">
              <div className="rounded-lg bg-white/10 p-2.5">
                <p className="text-[11px] text-white/70">MATCHES</p>
                <p className="text-xl font-black tabular-nums">{agg?.matches ?? 0}</p>
              </div>
              <div className="rounded-lg bg-white/10 p-2.5">
                <p className="text-[11px] text-white/70">RUNS</p>
                <p className="text-xl font-black tabular-nums">{agg?.runs ?? 0}</p>
              </div>
              <div className="rounded-lg bg-white/10 p-2.5">
                <p className="text-[11px] text-white/70">WICKETS</p>
                <p className="text-xl font-black tabular-nums">{agg?.wickets ?? 0}</p>
              </div>
              <div className="rounded-lg bg-white/10 p-2.5">
                <p className="text-[11px] text-white/70">4s / 6s</p>
                <p className="text-xl font-black tabular-nums">
                  {agg?.fours ?? 0}/{agg?.sixes ?? 0}
                </p>
              </div>
            </div>
          </div>
        </CardShell>
      );
    }

    if (card.kind === 'GRAPHS' && match) {
      const ov1 = computeOversBreakdown(match.innings[0]);
      const ov2 = computeOversBreakdown(match.innings[1]);
      const maxOv = Math.max(match.oversPerInnings, ov1.length, ov2.length, 1);
      const maxBar = Math.max(
        18,
        ...ov1.map((o) => o.runsInOver),
        ...ov2.map((o) => o.runsInOver)
      );
      const maxCum = Math.max(
        40,
        match.innings[0].runs,
        match.innings[1].runs
      );

      return (
        <CardShell
          title={card.mode === 'manhatt' ? 'MANHATTAN RUNS PER OVER' : 'WORM RUN PROGRESSION'}
          subtitle={`${teamMap.get(match.innings[0].battingTeamId)?.shortName || 'Inn 1'} vs ${teamMap.get(match.innings[1].battingTeamId)?.shortName || 'Inn 2'}`}
        >
          {card.mode === 'manhatt' ? (
            <div className="h-52 flex items-end gap-2 pt-4 pb-2 px-2">
              {Array.from({ length: maxOv }).map((_, idx) => {
                const r1 = ov1.find((o) => o.overNumber === idx + 1)?.runsInOver ?? 0;
                const r2 = ov2.find((o) => o.overNumber === idx + 1)?.runsInOver ?? 0;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <div className="w-full flex items-end justify-center gap-1 flex-1">
                      <div
                        className="w-3 rounded-t"
                        style={{
                          height: `${Math.max(4, (r1 / maxBar) * 100)}%`,
                          background: theme.accent,
                        }}
                      />
                      <div
                        className="w-3 rounded-t"
                        style={{
                          height: `${Math.max(4, (r2 / maxBar) * 100)}%`,
                          background: theme.secondary,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-white/75">O{idx + 1}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <svg viewBox="0 0 600 220" className="w-full h-52">
              <line x1="40" y1="190" x2="580" y2="190" stroke="#FFFFFF" strokeOpacity="0.3" />
              <line x1="40" y1="20" x2="40" y2="190" stroke="#FFFFFF" strokeOpacity="0.3" />
              {ov1.length > 0 && (
                <polyline
                  fill="none"
                  stroke={theme.accent}
                  strokeWidth="4"
                  points={[
                    '40,190',
                    ...ov1.map((o) => {
                      const x = 40 + (o.overNumber / maxOv) * 530;
                      const y = 190 - (o.cumulativeRuns / maxCum) * 160;
                      return `${x},${y}`;
                    }),
                  ].join(' ')}
                />
              )}
              {ov2.length > 0 && (
                <polyline
                  fill="none"
                  stroke={theme.secondary}
                  strokeWidth="4"
                  points={[
                    '40,190',
                    ...ov2.map((o) => {
                      const x = 40 + (o.overNumber / maxOv) * 530;
                      const y = 190 - (o.cumulativeRuns / maxCum) * 160;
                      return `${x},${y}`;
                    }),
                  ].join(' ')}
                />
              )}
            </svg>
          )}
        </CardShell>
      );
    }

    if (card.kind === 'HIGHLIGHTS' && match) {
      const targetInn = card.mode.startsWith('2nd') ? match.innings[1] : match.innings[0];
      const targetTeam = teamMap.get(targetInn.battingTeamId);
      if (card.mode === 'CR Partnership') {
        return (
          <CardShell title="CURRENT PARTNERSHIP" subtitle={batTeam?.name} wide={false}>
            <div className="text-center py-4 space-y-2">
              <p className="text-4xl font-display font-black" style={{ color: theme.accent }}>
                {partnership.runs} RUNS ({partnership.balls} BALLS)
              </p>
              <p className="text-sm font-bold text-white/85">
                {striker?.playerName || 'Striker'} &amp; {nonStriker?.playerName || 'Non-Striker'} ·
                4s: {partnership.fours} · 6s: {partnership.sixes}
              </p>
            </div>
          </CardShell>
        );
      }
      if (card.mode.includes('FOW')) {
        return (
          <CardShell title={card.mode.toUpperCase()} subtitle={targetTeam?.name}>
            <div className="flex flex-wrap gap-2.5 py-2">
              {targetInn.fallOfWickets.length === 0 ? (
                <p className="text-white/70">No wickets fallen.</p>
              ) : (
                targetInn.fallOfWickets.map((f) => (
                  <div
                    key={f.wicketNumber}
                    className="px-3.5 py-2 rounded-lg bg-white/10 text-sm"
                  >
                    <strong style={{ color: theme.accent }}>
                      {f.scoreAtFall}/{f.wicketNumber}
                    </strong>{' '}
                    {f.playerName} ({f.oversAtFall} ov)
                  </div>
                ))
              )}
            </div>
          </CardShell>
        );
      }
      const keyBalls = targetInn.balls.filter(
        (b) => b.isBoundary4 || b.isBoundary6 || b.isWicket
      );
      return (
        <CardShell title={`HIGHLIGHTS — ${card.mode.toUpperCase()}`} subtitle={targetTeam?.name}>
          <div className="flex flex-wrap gap-2 py-2">
            {keyBalls.length === 0 ? (
              <p className="text-white/70">No boundaries or wickets recorded yet.</p>
            ) : (
              keyBalls.slice(-18).map(renderBallDot)
            )}
          </div>
        </CardShell>
      );
    }

    if (card.kind === 'MATCH_STATS' && match) {
      const mMode = card.mode;
      if (mMode.includes('Wagonwheel') || mMode.includes('Runs Map')) {
        const useInn2 = mMode.startsWith('2nd');
        const targetInn = useInn2 ? match.innings[1] : match.innings[0];
        return (
          <CardShell
            title={mMode.toUpperCase()}
            subtitle={teamMap.get(targetInn.battingTeamId)?.name}
            wide={false}
          >
            {renderWagonWheelSvg(targetInn.balls, mMode)}
          </CardShell>
        );
      }

      if (mMode === 'Player Position') {
        return (
          <CardShell title="FIELDING POSITIONS" subtitle={bowlTeam?.name} wide={false}>
            <div className="flex justify-center">
              <svg viewBox="0 0 260 220" className="w-72 h-60">
                <ellipse cx="130" cy="110" rx="115" ry="98" fill="#15803D" stroke="#FFF" strokeWidth="2.5" />
                <rect x="125" y="92" width="10" height="36" rx="2" fill="#E5C07B" />
                {state.fieldPositions.map((spot) => (
                  <g key={spot.id}>
                    <circle
                      cx={spot.x * 2.6}
                      cy={spot.y * 2.2}
                      r="5"
                      fill={theme.accent}
                      stroke="#0F172A"
                      strokeWidth="1.2"
                    />
                    <text
                      x={spot.x * 2.6}
                      y={spot.y * 2.2 - 7}
                      textAnchor="middle"
                      fontSize="7.5"
                      fill="#FFFFFF"
                      fontWeight="700"
                    >
                      {spot.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </CardShell>
        );
      }

      if (mMode.includes('Playing XI')) {
        const showBat = mMode === 'Batting Playing XI' || mMode === 'Both Playing XI';
        const showBowl = mMode === 'Bowling Playing XI' || mMode === 'Both Playing XI';
        return (
          <CardShell title={mMode.toUpperCase()} subtitle={match.matchLabel}>
            <div className={`grid gap-6 ${showBat && showBowl ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {showBat && (
                <div>
                  <p className="font-bold text-sm mb-2" style={{ color: theme.accent }}>
                    {batTeam?.name || 'Batting Team'}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {(batTeam?.players ?? []).slice(0, 11).map((p, idx) => (
                      <div key={p.id} className="px-2.5 py-1.5 rounded bg-white/10 truncate">
                        {idx + 1}. {p.name}
                        {p.isCaptain ? ' (C)' : ''}
                        {p.isWicketKeeper ? ' (WK)' : ''}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {showBowl && (
                <div>
                  <p className="font-bold text-sm mb-2" style={{ color: theme.accent }}>
                    {bowlTeam?.name || 'Bowling Team'}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {(bowlTeam?.players ?? []).slice(0, 11).map((p, idx) => (
                      <div key={p.id} className="px-2.5 py-1.5 rounded bg-white/10 truncate">
                        {idx + 1}. {p.name}
                        {p.isCaptain ? ' (C)' : ''}
                        {p.isWicketKeeper ? ' (WK)' : ''}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardShell>
        );
      }

      if (mMode === 'Match Summary' || mMode === 'Match Comparison') {
        return (
          <CardShell title={mMode.toUpperCase()} subtitle={match.resultText}>
            <div className="grid grid-cols-2 gap-4">
              {([0, 1] as const).map((i) => {
                const inn = match.innings[i];
                const t = teamMap.get(inn.battingTeamId);
                return (
                  <div key={i} className="rounded-xl bg-white/10 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-base">{t?.name || `Team ${i + 1}`}</span>
                      <span className="font-display font-black text-2xl" style={{ color: theme.accent }}>
                        {inn.runs}/{inn.wickets}
                      </span>
                    </div>
                    <p className="text-xs text-white/75">
                      Overs: {formatOvers(inn.legalBalls)}/{inn.maxOvers} · RR:{' '}
                      {calcRunRate(inn.runs, inn.legalBalls)}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardShell>
        );
      }

      if (mMode.includes('Bowling')) {
        const rows = mMode.startsWith('1st') ? inn1BowlCard : bowlingCard;
        return (
          <CardShell title={mMode.toUpperCase()} subtitle={bowlTeam?.name}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase border-b border-white/20" style={{ color: theme.accent }}>
                  <th className="py-2 text-left">Bowler</th>
                  <th className="py-2 text-right">O</th>
                  <th className="py-2 text-right">M</th>
                  <th className="py-2 text-right">R</th>
                  <th className="py-2 text-right">W</th>
                  <th className="py-2 text-right">Eco</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {rows.slice(0, 7).map((r) => (
                  <tr key={r.playerId}>
                    <td className="py-1.5 font-bold">{r.playerName}</td>
                    <td className="py-1.5 text-right tabular-nums">{r.overs}</td>
                    <td className="py-1.5 text-right tabular-nums">{r.maidens}</td>
                    <td className="py-1.5 text-right tabular-nums">{r.runs}</td>
                    <td className="py-1.5 text-right font-black" style={{ color: theme.accent }}>
                      {r.wickets}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{r.economy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardShell>
        );
      }

      // Default Match Stats: Batting card / Mini Batting card / 1st inn Batting card
      const rows = mMode.startsWith('1st') ? inn1BatCard : battingCard;
      const limit = mMode.includes('Mini') ? 5 : 9;
      return (
        <CardShell title={mMode.toUpperCase()} subtitle={batTeam?.name}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase border-b border-white/20" style={{ color: theme.accent }}>
                <th className="py-2 text-left">Batter</th>
                <th className="py-2 text-left">Status</th>
                <th className="py-2 text-right">R</th>
                <th className="py-2 text-right">B</th>
                <th className="py-2 text-right">4s</th>
                <th className="py-2 text-right">6s</th>
                <th className="py-2 text-right">SR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.slice(0, limit).map((r) => (
                <tr key={r.playerId}>
                  <td className="py-1.5 font-bold">
                    {r.playerName}
                    {r.isStriker ? ' *' : ''}
                  </td>
                  <td className="py-1.5 text-xs text-white/70">{r.dismissalText}</td>
                  <td className="py-1.5 text-right font-black tabular-nums">{r.runs}</td>
                  <td className="py-1.5 text-right tabular-nums">{r.balls}</td>
                  <td className="py-1.5 text-right tabular-nums">{r.fours}</td>
                  <td className="py-1.5 text-right tabular-nums">{r.sixes}</td>
                  <td className="py-1.5 text-right tabular-nums">{r.sr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardShell>
      );
    }

    return null;
  };

  const renderBottomBar = () => {
    const mode = overlay.bottomScoreMode;
    if (mode === 'EMPTY') return null;

    if (!match || !activeInn) {
      return (
        <div className="absolute bottom-5 inset-x-8 pointer-events-none">
          <div
            className="rounded-xl px-6 py-3 flex items-center justify-between text-white shadow-2xl border-t-2"
            style={{
              background: `linear-gradient(90deg, ${theme.primary}, ${theme.surface})`,
              borderColor: theme.accent,
            }}
          >
            <span className="font-display font-black text-base tracking-wide">
              {tournament?.name || state.user.channelTitle || 'STAR EVENT LIVE'}
            </span>
            <span className="text-xs font-bold uppercase" style={{ color: theme.accent }}>
              READY FOR LIVE MATCH
            </span>
          </div>
        </div>
      );
    }

    // Build inside-scoreboard animated Winner info when match is completed
    const isMatchCompleted = match.status === 'completed';
    const inn1BatTeam = inn1 ? teamMap.get(inn1.battingTeamId) : team1;
    const inn2BatTeam = inn2 ? teamMap.get(inn2.battingTeamId) : team2;
    const scoreDiff = (inn1?.runs ?? 0) - (inn2?.runs ?? 0);
    const isMatchTied = scoreDiff === 0;
    const winnerTeam = isMatchTied ? undefined : scoreDiff > 0 ? inn1BatTeam : inn2BatTeam;
    const winnerHeadline = isMatchTied
      ? 'MATCH TIED!'
      : match.resultText?.trim()
        ? match.resultText.trim().toUpperCase()
        : `${(winnerTeam?.name || 'WINNER').toUpperCase()} WON!`;
    const winnerSummaryLine = `${inn1BatTeam?.shortName || 'T1'} ${inn1?.runs ?? 0}/${inn1?.wickets ?? 0} (${formatOvers(inn1?.legalBalls ?? 0)})  •  ${inn2BatTeam?.shortName || 'T2'} ${inn2?.runs ?? 0}/${inn2?.wickets ?? 0} (${formatOvers(inn2?.legalBalls ?? 0)})`;
    const winnerInfo = isMatchCompleted
      ? {
          headline: winnerHeadline,
          badge: isMatchTied ? 'MATCH TIED' : 'WINNER',
          summaryLine: winnerSummaryLine,
        }
      : null;

    // Specialized bottom ticker modes
    if (
      mode === 'Versus' ||
      mode === 'Versus With Logo' ||
      mode === 'Toss' ||
      mode === 'Result' ||
      mode === 'Tournament Name'
    ) {
      const centerText =
        mode === 'Toss'
          ? `TOSS: ${teamMap.get(match.tossWinnerId)?.name || team1?.name} WON & ELECTED TO ${match.tossDecision.toUpperCase()}`
          : mode === 'Result'
            ? match.resultText.toUpperCase()
            : mode === 'Tournament Name'
              ? (tournament?.name || state.user.channelTitle).toUpperCase()
              : `${team1?.name || 'TEAM 1'}  VS  ${team2?.name || 'TEAM 2'}`;

      return (
        <div className="absolute bottom-5 inset-x-8 pointer-events-none">
          <div
            className={`relative overflow-hidden rounded-xl px-6 py-3.5 flex items-center justify-center gap-4 text-white shadow-2xl border-2 ${
              useTataIplPatti ? 'studio-strip-animated-bg suite-top-box-glow' : ''
            }`}
            style={{
              background: useTataIplPatti
                ? undefined
                : `linear-gradient(90deg, ${theme.primary}, ${theme.secondary}, ${theme.primary})`,
              borderColor: useTataIplPatti ? '#FFE600' : theme.accent,
            }}
          >
            {useTataIplPatti && (
              <>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-[#FFE600]/25 to-transparent banner-sheen-animated"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden"
                >
                  <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-[#EF1A1A] to-[#FFE600] opacity-90 topbar-beam-sweep" />
                </div>
              </>
            )}
            {mode === 'Versus With Logo' && renderTeamBadge(team1, 'w-10 h-10')}
            <span
              className={`relative z-10 font-display font-black text-base sm:text-xl tracking-wide text-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)] ${
                useTataIplPatti ? 'text-[#FFE600]' : 'text-white'
              }`}
            >
              {centerText}
            </span>
            {mode === 'Versus With Logo' && renderTeamBadge(team2, 'w-10 h-10')}
          </div>
        </div>
      );
    }

    // Secondary strip text based on bottomScoreMode
    let infoStrip = `CRR ${crr}`;
    if (mode === 'Bottom Need' || mode === 'Need') {
      infoStrip =
        needRuns !== null
          ? `NEED ${needRuns} RUNS IN ${remBalls} BALLS (RRR ${rrr})`
          : `TARGET NOT SET · CRR ${crr}`;
    } else if (mode === 'Current Partnership' || mode === 'Mini Curr. Partnership') {
      infoStrip = `PARTNERSHIP: ${partnership.runs} (${partnership.balls}b) · 4s: ${partnership.fours} · 6s: ${partnership.sixes}`;
    } else if (mode === 'Projected Score') {
      const proj = Math.round(Number(crr) * activeInn.maxOvers);
      infoStrip = `PROJECTED @ CRR (${crr}): ${proj} · @8 RPO: ${Math.round(activeInn.runs + (remBalls / 6) * 8)} · @10 RPO: ${Math.round(activeInn.runs + (remBalls / 6) * 10)}`;
    } else if (mode === "6's") {
      const sixes = activeInn.balls.filter((b) => b.isBoundary6).length;
      infoStrip = `INNINGS SIXES: ${sixes}`;
    } else if (mode === "4's") {
      const fours = activeInn.balls.filter((b) => b.isBoundary4).length;
      infoStrip = `INNINGS FOURS: ${fours}`;
    } else if (mode === 'Last Wicket') {
      const lastW = activeInn.fallOfWickets[activeInn.fallOfWickets.length - 1];
      infoStrip = lastW
        ? `LAST WICKET: ${lastW.playerName} (${lastW.wicketType}) AT ${lastW.scoreAtFall}/${lastW.wicketNumber}`
        : 'NO WICKETS FALLEN YET';
    } else if (mode === 'Last Bowler') {
      infoStrip = `BOWLER: ${bowler?.playerName || 'Bowler'} ${bowler?.overs || '0.0'}-${bowler?.maidens || 0}-${bowler?.runs || 0}-${bowler?.wickets || 0}`;
    } else if (mode === 'Mini Match Comparison') {
      infoStrip = `${teamMap.get(inn1!.battingTeamId)?.shortName}: ${inn1!.runs}/${inn1!.wickets} vs ${teamMap.get(inn2!.battingTeamId)?.shortName}: ${inn2!.runs}/${inn2!.wickets}`;
    } else if (mode === 'Mini Player Position') {
      infoStrip = `FIELDING: ${bowlTeam?.shortName || 'BOWL'} · ${state.fieldPositions.slice(0, 4).map((s) => s.label).join(' · ')}`;
    }

    if (useTataIplPatti) {
      const ballList = (mode === 'Last 15 Balls' ? last15Balls : thisOverBalls).map((b) => ({
        id: b.id,
        label: getBallPillLabel(b),
        isBoundary4: b.isBoundary4,
        isBoundary6: b.isBoundary6,
        isWicket: b.isWicket,
        isExtra: b.extraType !== 'none',
      }));

      const pattiTargetText =
        mode === 'Score'
          ? target !== null
            ? `TARGET ${target}${needRuns !== null ? ` • NEED ${needRuns} IN ${remBalls}B` : ''}`
            : `CRR ${crr} • ${activeInn.maxOvers} OVERS`
          : infoStrip;

      const pattiMatchTitle = `${(
        tournament?.name ||
        state.user.channelTitle ||
        'LIVE CRICKET'
      ).toUpperCase()}${match.stageBadge ? ` - ${match.stageBadge}` : ''}`;

      return (
        <div className="absolute bottom-5 inset-x-4 sm:inset-x-6 pointer-events-none">
          <TataIplScoreboardBar
            batTeamCode={batTeam?.shortName || 'BAT'}
            batTeamLogo={batTeam?.logoUrl}
            batTeamColor={batTeam?.customColor ? getTeamColorHex(batTeam) : undefined}
            batTeamTextColor={batTeam?.customColor ? getTeamTextColorHex(batTeam) : undefined}
            bowlTeamCode={bowlTeam?.shortName || 'BOWL'}
            bowlTeamLogo={bowlTeam?.logoUrl}
            bowlTeamColor={bowlTeam?.customColor ? getTeamColorHex(bowlTeam) : undefined}
            bowlTeamTextColor={bowlTeam?.customColor ? getTeamTextColorHex(bowlTeam) : undefined}
            showTeamLogo={overlay.showTeamLogo}
            scoreText={`${activeInn.runs}-${activeInn.wickets}`}
            oversText={formatOvers(activeInn.legalBalls)}
            batter1Name={striker?.playerName || 'NEXT BATTER'}
            batter1Runs={striker ? striker.runs : ''}
            batter1Balls={striker ? striker.balls : ''}
            batter2Name={nonStriker?.playerName || 'NEXT BATTER'}
            batter2Runs={nonStriker ? nonStriker.runs : ''}
            batter2Balls={nonStriker ? nonStriker.balls : ''}
            strikerIndex={1}
            bowlerName={bowler?.playerName || 'BOWLER'}
            bowlerFigs={`${bowler?.wickets ?? 0}-${bowler?.runs ?? 0}`}
            bowlerOvers={bowler?.overs ?? '0.0'}
            balls={ballList}
            showBalls={ballList.length > 0}
            targetText={pattiTargetText}
            matchTitle={pattiMatchTitle}
            winnerInfo={winnerInfo}
            activeEvent={
              showTransition && activeTransition
                ? { id: activeTransition.id, type: activeTransition.type }
                : null
            }
          />
        </div>
      );
    }

    if (useWorldCupPatti) {
      const ballList = (mode === 'Last 15 Balls' ? last15Balls : thisOverBalls).map((b) => ({
        id: b.id,
        label: getBallPillLabel(b),
        isBoundary4: b.isBoundary4,
        isBoundary6: b.isBoundary6,
        isWicket: b.isWicket,
        isExtra: b.extraType !== 'none',
      }));

      const isChasing = match.currentInningsIndex === 1 && target !== null && needRuns !== null;
      const wcRateLabel = isChasing ? 'REQ RUN RATE' : 'RUN RATE';
      const wcRateValue = isChasing ? rrr : crr;
      const wcTickerText =
        mode === 'Score'
          ? isChasing
            ? `${(batTeam?.shortName || 'BAT').toUpperCase()} NEED ${needRuns} RUNS FROM ${remBalls} BALLS`
            : (tournament?.name || 'LIVE SCORE WORLD CUP').toUpperCase()
          : infoStrip;

      return (
        <div className="absolute bottom-5 inset-x-4 sm:inset-x-6 pointer-events-none">
          <WorldCupScoreboardBar
            batTeamCode={batTeam?.shortName || 'BAT'}
            batTeamLogo={batTeam?.logoUrl}
            batTeamColor={batTeam?.customColor ? getTeamColorHex(batTeam) : undefined}
            batTeamTextColor={batTeam?.customColor ? getTeamTextColorHex(batTeam) : undefined}
            bowlTeamCode={bowlTeam?.shortName || 'BOWL'}
            bowlTeamLogo={bowlTeam?.logoUrl}
            bowlTeamColor={bowlTeam?.customColor ? getTeamColorHex(bowlTeam) : undefined}
            bowlTeamTextColor={bowlTeam?.customColor ? getTeamTextColorHex(bowlTeam) : undefined}
            showTeamLogo={overlay.showTeamLogo}
            runs={activeInn.runs}
            wickets={activeInn.wickets}
            oversText={formatOvers(activeInn.legalBalls)}
            batter1Name={striker?.playerName || 'NEXT BATTER'}
            batter1Runs={striker ? striker.runs : 0}
            batter1Balls={striker ? striker.balls : 0}
            batter2Name={nonStriker?.playerName || 'NEXT BATTER'}
            batter2Runs={nonStriker ? nonStriker.runs : 0}
            batter2Balls={nonStriker ? nonStriker.balls : 0}
            strikerIndex={1}
            bowlerName={bowler?.playerName || 'BOWLER'}
            bowlerFigs={`${bowler?.wickets ?? 0}/${bowler?.runs ?? 0}`}
            bowlerOvers={bowler?.overs ?? '0.0'}
            balls={ballList}
            showBalls={ballList.length > 0}
            rateLabel={wcRateLabel}
            rateValue={wcRateValue}
            tickerText={wcTickerText}
            winnerInfo={winnerInfo}
            activeEvent={
              showTransition && activeTransition
                ? { id: activeTransition.id, type: activeTransition.type }
                : null
            }
          />
        </div>
      );
    }

    if (theme.barStyle) {
      const ballList = (mode === 'Last 15 Balls' ? last15Balls : thisOverBalls).map((b) => ({
        id: b.id,
        label: getBallPillLabel(b),
        isBoundary4: b.isBoundary4,
        isBoundary6: b.isBoundary6,
        isWicket: b.isWicket,
        isExtra: b.extraType !== 'none',
      }));

      return (
        <div className="absolute bottom-4 inset-x-6 pointer-events-none">
          <ProScoreboardBar
            barStyle={theme.barStyle}
            leftTeam={batTeam?.shortName || 'BAT'}
            rightTeam={bowlTeam?.shortName || 'BOWL'}
            strikerName={striker?.playerName || 'Next Batter...'}
            strikerScore={striker ? `${striker.runs} (${striker.balls})` : ''}
            nonStrikerName={nonStriker?.playerName || 'Next Batter...'}
            nonStrikerScore={nonStriker ? `${nonStriker.runs} (${nonStriker.balls})` : ''}
            scoreText={`${activeInn.runs} - ${activeInn.wickets}`}
            oversText={`${formatOvers(activeInn.legalBalls)} (${activeInn.maxOvers})`}
            bowlerName={bowler?.playerName || 'Bowler'}
            bowlerFigures={`${bowler?.wickets ?? 0}-${bowler?.runs ?? 0} (${bowler?.overs ?? '0.0'})`}
            balls={ballList}
            infoStrip={winnerInfo ? `🏆 ${winnerInfo.headline} · ${winnerInfo.summaryLine}` : infoStrip}
            footerRight={`${match.matchLabel} · ${state.user.watermarkText || 'STAREVENT.LIVE'}`}
            accentColor={theme.accent}
            primaryColor={theme.primary}
            leftBadgeExtra={renderTeamBadge(batTeam, 'w-7 h-7')}
            rightBadgeExtra={renderTeamBadge(bowlTeam, 'w-7 h-7')}
          />
        </div>
      );
    }

    return (
      <div className="absolute bottom-4 inset-x-6 pointer-events-none">
        <div
          className="rounded-xl overflow-hidden shadow-2xl border-2 text-white"
          style={{
            background: theme.surface,
            borderColor: theme.accent,
          }}
        >
          <div className="grid grid-cols-[auto_1fr_1fr] items-stretch">
            {/* Score Block */}
            <div
              className="px-5 py-2.5 flex items-center gap-3"
              style={{
                background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
              }}
            >
              {renderTeamBadge(batTeam, 'w-10 h-10')}
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display font-black text-base uppercase">
                    {batTeam?.shortName || 'BAT'}
                  </span>
                  <span
                    className="font-display font-black text-2xl sm:text-3xl tabular-nums"
                    style={{ color: theme.accent }}
                  >
                    {activeInn.runs}-{activeInn.wickets}
                  </span>
                </div>
                <p className="text-[11px] font-bold text-white/85 tabular-nums">
                  OVERS {formatOvers(activeInn.legalBalls)} / {activeInn.maxOvers}
                </p>
              </div>
            </div>

            {/* Batters Block */}
            <div className="px-4 py-2 flex flex-col justify-center gap-1 border-r border-white/15 bg-black/25">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="font-bold truncate inline-flex items-center gap-1.5 min-w-0">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="w-4 h-4 shrink-0"
                    style={{ color: theme.accent }}
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
                  <span className="truncate">{striker?.playerName || 'Next Batter...'}</span>
                </span>
                <span className="font-black tabular-nums ml-2 shrink-0">
                  {striker ? (
                    <>
                      {striker.runs}
                      <span className="text-white/70 text-[11px] font-semibold">
                        ({striker.balls})
                      </span>
                    </>
                  ) : null}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs sm:text-sm text-white/80">
                <span className="font-semibold truncate pl-5.5">
                  {nonStriker?.playerName || 'Next Batter...'}
                </span>
                <span className="font-bold tabular-nums ml-2 shrink-0">
                  {nonStriker ? (
                    <>
                      {nonStriker.runs}
                      <span className="text-white/60 text-[11px]">
                        ({nonStriker.balls})
                      </span>
                    </>
                  ) : null}
                </span>
              </div>
            </div>

            {/* Bowler & Balls Block */}
            <div className="px-4 py-2 flex flex-col justify-center gap-1.5 bg-black/35">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="font-bold truncate">
                  {bowler?.playerName || 'Bowler'}
                </span>
                <span
                  className="font-black tabular-nums ml-2"
                  style={{ color: theme.accent }}
                >
                  {bowler?.wickets ?? 0}-{bowler?.runs ?? 0} ({bowler?.overs ?? '0.0'})
                </span>
              </div>
              <div className="flex items-center gap-1 overflow-hidden">
                {(mode === 'Last 15 Balls' ? last15Balls : thisOverBalls).map(
                  renderBallDot
                )}
              </div>
            </div>
          </div>

          {/* Info Ticker Strip */}
          <div
            className="px-4 py-1 flex items-center justify-between text-[11px] font-bold tracking-wide"
            style={{ background: theme.primary }}
          >
            <span className="truncate">{infoStrip}</span>
            <span className="uppercase shrink-0 ml-4" style={{ color: theme.accent }}>
              {match.matchLabel} · {state.user.watermarkText || 'STAREVENT.LIVE'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="relative w-full h-full select-none overflow-hidden font-sans"
      style={bgStyle}
      aria-label="Live Cricket Broadcast Overlay"
    >
      {/* Main Graphic Card */}
      {renderMainCard()}

      {/* Bottom Broadcast Scorebug */}
      {renderBottomBar()}

      {/* Transition Overlay Stinger Banner (for non-inline-stinger themes or when bar is hidden) */}
      {showTransition &&
        activeTransition &&
        !(
          (useTataIplPatti || useWorldCupPatti) &&
          overlay.bottomScoreMode !== 'EMPTY' &&
          overlay.bottomScoreMode !== 'Versus' &&
          overlay.bottomScoreMode !== 'Versus With Logo' &&
          overlay.bottomScoreMode !== 'Toss' &&
          overlay.bottomScoreMode !== 'Result' &&
          overlay.bottomScoreMode !== 'Tournament Name' &&
          !(match?.status === 'completed' && overlay.bottomScoreMode === 'Score')
        ) && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <motion.div
            key={activeTransition.id}
            initial={{ opacity: 0, scale: 0.72, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 22 }}
            className="relative overflow-hidden px-14 py-6 rounded-2xl border-4 shadow-2xl text-center studio-strip-animated-bg suite-top-box-glow"
            style={{
              background:
                activeTransition.type === 'Wicket'
                  ? 'linear-gradient(120deg, #7F030A 0%, #DC2626 48%, #450208 100%)'
                  : undefined,
              borderColor: '#FFE600',
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-[#FFE600]/30 to-transparent banner-sheen-animated"
            />
            <p className="relative z-10 text-xs font-bold uppercase tracking-[0.3em] text-amber-100/90">
              {state.user.channelTitle || 'STAR EVENT LIVE'}
            </p>
            <p className="relative z-10 font-display font-black text-5xl sm:text-6xl uppercase tracking-wider drop-shadow-[0_4px_14px_rgba(0,0,0,0.75)] mt-1 text-[#FFE600]">
              {activeTransition.type}
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
}
