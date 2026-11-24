import { FormEvent, useState } from 'react';
import {
  Calendar,
  Clock,
  Edit3,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { formatOvers } from '../../data/cricketSampleData';
import {
  CricketMatch,
  CricketSuiteState,
  MatchStageBadge,
} from '../../types/cricketSuite';

interface MatchListViewProps {
  state: CricketSuiteState;
  updateState: (updater: (prev: CricketSuiteState) => CricketSuiteState) => void;
  onOpenScoring: (matchId: string) => void;
  onToast: (msg: string) => void;
}

const STAGE_OPTIONS: MatchStageBadge[] = [
  'QUALIFIER-1',
  'QUALIFIER-2',
  'ELIMINATOR',
  'GENERAL',
  'QUATER',
  'SEMI FINAL',
  'FINAL',
  'LEAGUE',
];

export function MatchListView({
  state,
  updateState,
  onOpenScoring,
  onToast,
}: MatchListViewProps) {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const tourTeams = state.teams.filter(
    (t) => !state.activeTournamentId || t.tournamentId === state.activeTournamentId
  );
  const selectableTeams = tourTeams.length >= 2 ? tourTeams : state.teams;

  const [team1Id, setTeam1Id] = useState(selectableTeams[0]?.id || '');
  const [team2Id, setTeam2Id] = useState(selectableTeams[1]?.id || '');
  const [stageBadge, setStageBadge] = useState<MatchStageBadge>('GENERAL');
  const [dayLabel, setDayLabel] = useState('DAY 4');
  const [matchLabel, setMatchLabel] = useState(`MATCH ${state.matches.length + 5}`);
  const [overs, setOvers] = useState(String(state.user.defaultOvers || 5));
  const [dateLabel, setDateLabel] = useState('Sun, 15 November');
  const [startsAt, setStartsAt] = useState('04:00 PM');
  const [endsAt, setEndsAt] = useState('05:15 PM');

  const teamMap = new Map(state.teams.map((t) => [t.id, t]));

  const filteredMatches = state.matches.filter((m) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const t1 = teamMap.get(m.team1Id)?.name.toLowerCase() || '';
    const t2 = teamMap.get(m.team2Id)?.name.toLowerCase() || '';
    return (
      t1.includes(q) ||
      t2.includes(q) ||
      m.dayLabel.toLowerCase().includes(q) ||
      m.matchLabel.toLowerCase().includes(q) ||
      m.stageBadge.toLowerCase().includes(q)
    );
  });

  const openCreateModal = () => {
    setEditingId(null);
    setTeam1Id(selectableTeams[0]?.id || '');
    setTeam2Id(selectableTeams[1]?.id || selectableTeams[0]?.id || '');
    setStageBadge('GENERAL');
    setDayLabel('DAY 4');
    setMatchLabel(`MATCH ${state.matches.length + 5}`);
    setOvers(String(state.user.defaultOvers || 5));
    setDateLabel('Sun, 15 November');
    setStartsAt('04:30 PM');
    setEndsAt('05:45 PM');
    setModalOpen(true);
  };

  const openEditModal = (m: CricketMatch) => {
    setEditingId(m.id);
    setTeam1Id(m.team1Id);
    setTeam2Id(m.team2Id);
    setStageBadge(m.stageBadge);
    setDayLabel(m.dayLabel);
    setMatchLabel(m.matchLabel);
    setOvers(String(m.oversPerInnings));
    setDateLabel(m.dateLabel);
    setStartsAt(m.startsAt);
    setEndsAt(m.endsAt);
    setModalOpen(true);
  };

  const handleSaveMatch = (e: FormEvent) => {
    e.preventDefault();
    if (!team1Id || !team2Id || team1Id === team2Id) {
      onToast('Please choose two different teams.');
      return;
    }

    const t1 = teamMap.get(team1Id);
    const t2 = teamMap.get(team2Id);
    const maxOvers = Math.max(1, Number(overs) || 5);

    if (editingId) {
      updateState((prev) => ({
        ...prev,
        matches: prev.matches.map((m) =>
          m.id === editingId
            ? {
                ...m,
                team1Id,
                team2Id,
                stageBadge,
                dayLabel: dayLabel.trim().toUpperCase() || 'DAY 1',
                matchLabel: matchLabel.trim().toUpperCase() || 'MATCH 1',
                oversPerInnings: maxOvers,
                dateLabel,
                startsAt,
                endsAt,
              }
            : m
        ),
      }));
      onToast('Match updated');
    } else {
      const id = `match_${Date.now()}`;
      const newMatch: CricketMatch = {
        id,
        tournamentId: state.activeTournamentId || state.tournaments[0]?.id || '',
        stageBadge,
        dayLabel: dayLabel.trim().toUpperCase() || 'DAY 1',
        matchLabel: matchLabel.trim().toUpperCase() || `MATCH ${state.matches.length + 1}`,
        team1Id,
        team2Id,
        dateLabel,
        startsAt,
        endsAt,
        tossWinnerId: team1Id,
        tossDecision: 'Bat',
        oversPerInnings: maxOvers,
        status: 'live',
        resultText: 'Match is going on',
        currentInningsIndex: 0,
        playingXI1: t1?.players.map((p) => p.id) || [],
        playingXI2: t2?.players.map((p) => p.id) || [],
        playerOfMatchId: t1?.players[0]?.id || '',
        undoStack: [],
        innings: [
          {
            battingTeamId: team1Id,
            bowlingTeamId: team2Id,
            runs: 0,
            wickets: 0,
            legalBalls: 0,
            maxOvers,
            target: null,
            extras: { wd: 0, nb: 0, lb: 0, bye: 0, penalty: 0 },
            strikerId: t1?.players[0]?.id || '',
            nonStrikerId: t1?.players[1]?.id || '',
            bowlerId: t2?.players[7]?.id || t2?.players[0]?.id || '',
            battingOrder: [t1?.players[0]?.id || '', t1?.players[1]?.id || ''].filter(Boolean),
            balls: [],
            fallOfWickets: [],
            completed: false,
          },
          {
            battingTeamId: team2Id,
            bowlingTeamId: team1Id,
            runs: 0,
            wickets: 0,
            legalBalls: 0,
            maxOvers,
            target: null,
            extras: { wd: 0, nb: 0, lb: 0, bye: 0, penalty: 0 },
            strikerId: t2?.players[0]?.id || '',
            nonStrikerId: t2?.players[1]?.id || '',
            bowlerId: t1?.players[7]?.id || t1?.players[0]?.id || '',
            battingOrder: [t2?.players[0]?.id || '', t2?.players[1]?.id || ''].filter(Boolean),
            balls: [],
            fallOfWickets: [],
            completed: false,
          },
        ],
      };

      updateState((prev) => ({
        ...prev,
        activeMatchId: id,
        matches: [newMatch, ...prev.matches],
      }));
      onToast(`${matchLabel} created & set active`);
    }

    setModalOpen(false);
  };

  const handleDeleteMatch = (matchId: string) => {
    updateState((prev) => {
      const remaining = prev.matches.filter((m) => m.id !== matchId);
      return {
        ...prev,
        activeMatchId:
          prev.activeMatchId === matchId ? remaining[0]?.id || '' : prev.activeMatchId,
        matches: remaining,
      };
    });
    setDeleteConfirmId(null);
    onToast('Match deleted');
  };

  return (
    <div className="space-y-4">
      {/* Top Search & Create Match Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search match by team name, or day"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#111116] border border-white/15 focus:border-[#FFE600] focus:outline-none text-sm text-white placeholder:text-zinc-500"
          />
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-display font-black text-xs sm:text-sm uppercase tracking-wide whitespace-nowrap shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>CREATE MATCH</span>
        </button>
      </div>

      {/* Match Cards */}
      <div className="space-y-3.5">
        {filteredMatches.map((m) => {
          const t1 = teamMap.get(m.team1Id);
          const t2 = teamMap.get(m.team2Id);
          const isSelected = m.id === state.activeMatchId;

          return (
            <div
              key={m.id}
              className={`rounded-2xl bg-[#111116] border overflow-hidden transition-all shadow-lg ${
                isSelected
                  ? 'border-[#FFE600] shadow-[0_0_24px_rgba(255,230,0,0.12)]'
                  : 'border-white/12 hover:border-[#FFE600]/50'
              }`}
            >
              {/* Top Badges + Edit / Delete Actions */}
              <div className="px-4 py-2.5 bg-[#16161F] border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded bg-[#DC2626] text-white font-mono text-[11px] font-black uppercase">
                    {m.stageBadge}
                  </span>
                  <span className="px-2.5 py-0.5 rounded bg-blue-600/30 border border-blue-400/40 text-blue-200 font-mono text-[11px] font-bold uppercase">
                    {m.dayLabel}
                  </span>
                  <span className="px-2.5 py-0.5 rounded bg-[#FFE600]/15 border border-[#FFE600]/45 text-[#FFE600] font-mono text-[11px] font-bold uppercase">
                    {m.matchLabel}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(m)}
                    title="Edit Match"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  {deleteConfirmId === m.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDeleteMatch(m.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#DC2626] text-white text-xs font-bold"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1.5 rounded-lg bg-white/10 text-zinc-200 text-xs"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(m.id)}
                      title="Delete Match"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#DC2626] hover:bg-[#EF4444] text-white font-bold text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Clickable Match Body -> Opens Scoring Dashboard */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => onOpenScoring(m.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenScoring(m.id);
                  }
                }}
                className="p-4 cursor-pointer hover:bg-white/[0.02] transition-colors space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-base sm:text-lg font-display font-black text-white">
                      <span>{t1?.name || 'Team 1'}</span>
                      <span className="text-xs font-mono text-[#FFE600] px-1.5 py-0.5 rounded bg-white/5">
                        VS
                      </span>
                      <span>{t2?.name || 'Team 2'}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400 font-mono">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#FFE600]" />
                        Date - {m.dateLabel}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-sky-400" />
                        Starts : {m.startsAt} | Ends : {m.endsAt}
                      </span>
                    </div>
                  </div>

                  {/* Quick Scores & Live Score Action */}
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <div className="text-right font-mono text-xs text-zinc-300 space-y-0.5">
                      <div>
                        <span className="text-zinc-400">{t1?.shortName}:</span>{' '}
                        <strong className="text-white">
                          {m.innings[0].runs}-{m.innings[0].wickets} (
                          {formatOvers(m.innings[0].legalBalls)})
                        </strong>
                      </div>
                      <div>
                        <span className="text-zinc-400">{t2?.shortName}:</span>{' '}
                        <strong className="text-[#FFE600]">
                          {m.innings[1].runs}-{m.innings[1].wickets} (
                          {formatOvers(m.innings[1].legalBalls)})
                        </strong>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FFE600] text-black font-display font-black text-xs uppercase">
                      <Play className="w-3.5 h-3.5" />
                      Score Live
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Status Banner */}
              <div
                className={`px-4 py-2 text-xs font-bold tracking-wide flex items-center justify-between ${
                  m.status === 'live'
                    ? 'bg-emerald-950/75 text-emerald-300 border-t border-emerald-500/30'
                    : m.status === 'completed'
                      ? 'bg-[#2A090D] text-[#FFE600] border-t border-[#DC2626]/40'
                      : 'bg-zinc-900 text-zinc-300 border-t border-white/10'
                }`}
              >
                <span>{m.resultText}</span>
                <span className="font-mono text-[11px] opacity-80">
                  {m.oversPerInnings} Overs Match
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Match Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="w-full max-w-lg rounded-2xl bg-[#111116] border border-[#FFE600]/40 overflow-hidden shadow-2xl my-auto">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#16161E]">
              <h3 className="font-display font-black text-base text-white uppercase">
                {editingId ? 'Edit Match' : 'Create New Match'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMatch} className="p-5 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Team 1 (Batting 1st)
                  </label>
                  <select
                    value={team1Id}
                    onChange={(e) => setTeam1Id(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#09090D] border border-white/15 text-sm text-white"
                  >
                    {selectableTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Team 2
                  </label>
                  <select
                    value={team2Id}
                    onChange={(e) => setTeam2Id(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#09090D] border border-white/15 text-sm text-white"
                  >
                    {selectableTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Stage
                  </label>
                  <select
                    value={stageBadge}
                    onChange={(e) => setStageBadge(e.target.value as MatchStageBadge)}
                    className="w-full px-2.5 py-2.5 rounded-xl bg-[#09090D] border border-white/15 text-xs text-white"
                  >
                    {STAGE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Day Badge
                  </label>
                  <input
                    type="text"
                    value={dayLabel}
                    onChange={(e) => setDayLabel(e.target.value)}
                    placeholder="DAY 4"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#09090D] border border-white/15 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Match No.
                  </label>
                  <input
                    type="text"
                    value={matchLabel}
                    onChange={(e) => setMatchLabel(e.target.value)}
                    placeholder="MATCH 8"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#09090D] border border-white/15 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Overs
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={overs}
                    onChange={(e) => setOvers(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#09090D] border border-white/15 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Starts
                  </label>
                  <input
                    type="text"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#09090D] border border-white/15 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Ends
                  </label>
                  <input
                    type="text"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#09090D] border border-white/15 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Date Label
                </label>
                <input
                  type="text"
                  value={dateLabel}
                  onChange={(e) => setDateLabel(e.target.value)}
                  placeholder="Sun, 15 November"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090D] border border-white/15 text-sm text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-display font-black text-sm uppercase tracking-wide"
              >
                {editingId ? 'Save Match' : 'Create Match'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
