import { FormEvent, useMemo, useState } from 'react';
import {
  Edit3,
  Play,
  Plus,
  Radio,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { formatOvers } from '../../data/cricketSampleData';
import {
  BallType,
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
  'LEAGUE',
  'GENERAL',
  'QUATER',
  'SEMI FINAL',
  'FINAL',
  'QUALIFIER-1',
  'QUALIFIER-2',
  'ELIMINATOR',
];

const BALL_TYPES: BallType[] = ['Tennis', 'Leather', 'Soft Tennis', 'Rubber'];

function formatStatusLabel(status: CricketMatch['status']): string {
  switch (status) {
    case 'not_started':
      return 'Not Started';
    case 'live':
      return 'Live';
    case 'innings_break':
      return 'Innings Break';
    case 'completed':
      return 'Completed';
    default:
      return status;
  }
}

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
  const [formError, setFormError] = useState<string | null>(null);

  // Match Form Fields
  const [tournamentId, setTournamentId] = useState(
    state.activeTournamentId || state.tournaments[0]?.id || ''
  );
  const [groupId, setGroupId] = useState('');
  const [team1Id, setTeam1Id] = useState('');
  const [team2Id, setTeam2Id] = useState('');
  const [matchName, setMatchName] = useState('');
  const [stageBadge, setStageBadge] = useState<MatchStageBadge>('LEAGUE');
  const [matchDate, setMatchDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [matchTime, setMatchTime] = useState('16:00');
  const [venue, setVenue] = useState('');
  const [totalOvers, setTotalOvers] = useState('6');
  const [ballType, setBallType] = useState<BallType>('Tennis');

  const selectedTour = state.tournaments.find((t) => t.id === tournamentId);
  const tourGroups = useMemo(
    () => state.groups.filter((g) => g.tournamentId === tournamentId),
    [state.groups, tournamentId]
  );
  const tourTeams = useMemo(
    () => state.teams.filter((tm) => tm.tournamentId === tournamentId),
    [state.teams, tournamentId]
  );

  const openCreateMatch = () => {
    const defaultTour =
      state.tournaments.find((t) => t.id === state.activeTournamentId) ??
      state.tournaments[0];
    const tid = defaultTour?.id || '';
    const availableTeams = state.teams.filter((tm) => tm.tournamentId === tid);

    setEditingId(null);
    setFormError(null);
    setTournamentId(tid);
    setGroupId('');
    setTeam1Id(availableTeams[0]?.id || '');
    setTeam2Id(availableTeams[1]?.id || '');
    setMatchName(`MATCH ${state.matches.length + 1}`);
    setStageBadge('LEAGUE');
    setMatchDate(new Date().toISOString().slice(0, 10));
    setMatchTime('16:00');
    setVenue(defaultTour?.location || '');
    setTotalOvers(String(defaultTour?.oversPerInnings || state.user.defaultOvers || 6));
    setBallType(defaultTour?.ballType || 'Tennis');
    setModalOpen(true);
  };

  const openEditMatch = (m: CricketMatch) => {
    setEditingId(m.id);
    setFormError(null);
    setTournamentId(m.tournamentId);
    setGroupId(m.groupId || '');
    setTeam1Id(m.team1Id);
    setTeam2Id(m.team2Id);
    setMatchName(m.matchLabel);
    setStageBadge(m.stageBadge);
    setMatchDate(m.dateLabel);
    setMatchTime(m.startsAt);
    setVenue(m.venue || '');
    setTotalOvers(String(m.oversPerInnings));
    setBallType(m.ballType || 'Tennis');
    setModalOpen(true);
  };

  const handleTournamentChange = (nextTid: string) => {
    setTournamentId(nextTid);
    setGroupId('');
    const nextTour = state.tournaments.find((t) => t.id === nextTid);
    const nextTeams = state.teams.filter((tm) => tm.tournamentId === nextTid);
    setTeam1Id(nextTeams[0]?.id || '');
    setTeam2Id(nextTeams[1]?.id || '');
    if (nextTour) {
      setVenue(nextTour.location || '');
      setTotalOvers(String(nextTour.oversPerInnings || 6));
      setBallType(nextTour.ballType || 'Tennis');
    }
  };

  const handleSaveMatch = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!tournamentId) {
      setFormError('Please select a tournament first.');
      return;
    }
    if (!team1Id || !team2Id) {
      setFormError('Please select both Team A and Team B.');
      return;
    }
    if (team1Id === team2Id) {
      setFormError('Team A and Team B cannot be the same team.');
      return;
    }

    const oversNum = Math.max(1, Math.min(50, Number(totalOvers) || 6));
    const cleanMatchName = matchName.trim() || `MATCH ${state.matches.length + 1}`;
    const t1 = state.teams.find((t) => t.id === team1Id);
    const t2 = state.teams.find((t) => t.id === team2Id);

    if (editingId) {
      updateState((prev) => ({
        ...prev,
        matches: prev.matches.map((m) =>
          m.id === editingId
            ? {
                ...m,
                tournamentId,
                groupId: groupId || undefined,
                team1Id,
                team2Id,
                matchLabel: cleanMatchName,
                stageBadge,
                dateLabel: matchDate,
                startsAt: matchTime,
                venue: venue.trim(),
                oversPerInnings: oversNum,
                ballType,
              }
            : m
        ),
      }));
      setModalOpen(false);
      onToast(`Match "${cleanMatchName}" updated.`);
      return;
    }

    // Generate unique Match ID and initialize at 0/0, 0.0 overs, Innings 1, Not Started
    const uniqueMatchId = `M-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const newMatch: CricketMatch = {
      id: uniqueMatchId,
      tournamentId,
      groupId: groupId || undefined,
      stageBadge,
      dayLabel: 'DAY 1',
      matchLabel: cleanMatchName,
      team1Id,
      team2Id,
      dateLabel: matchDate,
      startsAt: matchTime,
      endsAt: '',
      venue: venue.trim() || selectedTour?.location || 'Main Ground',
      ballType,
      tossWinnerId: team1Id,
      tossDecision: 'Bat',
      tossCompleted: false,
      oversPerInnings: oversNum,
      status: 'not_started',
      resultText: 'Not Started',
      currentInningsIndex: 0,
      innings: [
        {
          battingTeamId: team1Id,
          bowlingTeamId: team2Id,
          runs: 0,
          wickets: 0,
          legalBalls: 0,
          maxOvers: oversNum,
          target: null,
          extras: { wd: 0, nb: 0, lb: 0, bye: 0, penalty: 0 },
          strikerId: t1?.players[0]?.id || '',
          nonStrikerId: t1?.players[1]?.id || '',
          bowlerId: t2?.players[0]?.id || '',
          battingOrder: [t1?.players[0]?.id, t1?.players[1]?.id].filter(Boolean) as string[],
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
          maxOvers: oversNum,
          target: null,
          extras: { wd: 0, nb: 0, lb: 0, bye: 0, penalty: 0 },
          strikerId: t2?.players[0]?.id || '',
          nonStrikerId: t2?.players[1]?.id || '',
          bowlerId: t1?.players[0]?.id || '',
          battingOrder: [t2?.players[0]?.id, t2?.players[1]?.id].filter(Boolean) as string[],
          balls: [],
          fallOfWickets: [],
          completed: false,
        },
      ],
      playingXI1: t1?.players.slice(0, 11).map((p) => p.id) || [],
      playingXI2: t2?.players.slice(0, 11).map((p) => p.id) || [],
      playerOfMatchId: '',
      undoStack: [],
    };

    updateState((prev) => ({
      ...prev,
      activeTournamentId: tournamentId,
      activeMatchId: uniqueMatchId,
      matches: [newMatch, ...prev.matches],
    }));

    setModalOpen(false);
    onToast(`Match ${cleanMatchName} created (${uniqueMatchId}). Opening Scoring Dashboard...`);
    // Automatically open Scoring Dashboard for this exact match
    onOpenScoring(uniqueMatchId);
  };

  const handleDeleteMatch = (id: string) => {
    updateState((prev) => {
      const nextMatches = prev.matches.filter((m) => m.id !== id);
      return {
        ...prev,
        activeMatchId: prev.activeMatchId === id ? nextMatches[0]?.id || '' : prev.activeMatchId,
        matches: nextMatches,
      };
    });
    setDeleteConfirmId(null);
    onToast('Match deleted.');
  };

  const teamMap = new Map(state.teams.map((t) => [t.id, t]));
  const tourMap = new Map(state.tournaments.map((t) => [t.id, t]));

  const filteredMatches = state.matches.filter((m) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const t1 = teamMap.get(m.team1Id)?.name.toLowerCase() || '';
    const t2 = teamMap.get(m.team2Id)?.name.toLowerCase() || '';
    const tr = tourMap.get(m.tournamentId)?.name.toLowerCase() || '';
    return (
      t1.includes(q) ||
      t2.includes(q) ||
      tr.includes(q) ||
      m.matchLabel.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Search + CREATE MATCH Toolbar */}
      <div className="rounded-xl bg-white border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search match by tournament, team name, or match name..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-300 focus:border-[#FF8C00] focus:bg-white focus:outline-none text-sm"
          />
        </div>

        <button
          type="button"
          onClick={openCreateMatch}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#FF8C00] hover:bg-[#E87500] text-white text-xs font-semibold whitespace-nowrap shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>CREATE MATCH</span>
        </button>
      </div>

      {/* Clean Blank Match List or Table */}
      {filteredMatches.length === 0 ? (
        <div className="rounded-xl bg-white border border-slate-200 p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 mx-auto rounded-xl bg-[#FFF3E0] flex items-center justify-center">
            <Radio className="w-6 h-6 text-[#FF8C00]" />
          </div>
          <h2 className="font-display font-bold text-base text-slate-900">
            No Matches Created Yet
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Create a match between two teams in your tournament. Once saved, the Scoring Dashboard opens automatically for that exact match.
          </p>
          <button
            type="button"
            onClick={openCreateMatch}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#FF8C00] hover:bg-[#E87500] text-white text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>CREATE MATCH</span>
          </button>
        </div>
      ) : (
        <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-3">Match &amp; Tournament</th>
                  <th className="px-4 py-3">Team A vs Team B</th>
                  <th className="px-4 py-3">Date &amp; Time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMatches.map((m) => {
                  const t1 = teamMap.get(m.team1Id);
                  const t2 = teamMap.get(m.team2Id);
                  const tour = tourMap.get(m.tournamentId);
                  const inn1 = m.innings[0];
                  const inn2 = m.innings[1];
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">
                          {m.matchLabel} · {m.stageBadge}
                        </p>
                        <p className="text-xs text-slate-500">{tour?.name || 'Tournament'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">
                          {t1?.name || 'Team A'} <span className="text-slate-400">vs</span>{' '}
                          {t2?.name || 'Team B'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {m.oversPerInnings} Overs · {m.ballType} · {m.venue || 'Ground'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 tabular-nums">
                        <div>{m.dateLabel}</div>
                        <div className="text-slate-400">{m.startsAt}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span
                          className={`font-semibold ${
                            m.status === 'live'
                              ? 'text-emerald-700'
                              : m.status === 'completed'
                                ? 'text-[#E87500]'
                                : 'text-slate-600'
                          }`}
                        >
                          {formatStatusLabel(m.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono tabular-nums text-slate-800">
                        <div>
                          1st: {inn1.runs}/{inn1.wickets} ({formatOvers(inn1.legalBalls)})
                        </div>
                        {(m.currentInningsIndex === 1 || inn2.balls.length > 0) && (
                          <div>
                            2nd: {inn2.runs}/{inn2.wickets} ({formatOvers(inn2.legalBalls)})
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenScoring(m.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#FF8C00] hover:bg-[#E87500] text-white text-xs font-semibold whitespace-nowrap"
                          >
                            <Play className="w-3.5 h-3.5" />
                            OPEN SCORING
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditMatch(m)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#FFF3E0] hover:bg-orange-100 text-[#E87500] text-xs font-semibold"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            EDIT
                          </button>
                          {deleteConfirmId !== m.id ? (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(m.id)}
                              className="p-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-600"
                              aria-label={`Delete ${m.matchLabel}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDeleteMatch(m.id)}
                                className="px-2 py-1 rounded bg-red-600 text-white text-xs font-semibold"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 rounded bg-slate-200 text-slate-700 text-xs font-semibold"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MATCH MODAL */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveMatch}
            className="w-full max-w-xl rounded-xl bg-white border border-slate-200 overflow-hidden shadow-2xl my-auto"
          >
            <div className="px-5 py-4 bg-[#FF8C00] text-white flex items-center justify-between">
              <h3 className="font-display font-bold text-base">
                {editingId ? 'Edit Match' : 'Create Match'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div
                  role="alert"
                  className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs font-semibold text-red-700"
                >
                  {formError}
                </div>
              )}

              {state.tournaments.length === 0 ? (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-xs text-amber-800">
                  No tournaments created yet. Please create a Tournament and at least 2 Teams first.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Select Tournament *
                    </label>
                    <select
                      required
                      value={tournamentId}
                      onChange={(e) => handleTournamentChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                    >
                      <option value="">Choose Tournament</option>
                      {state.tournaments.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Select Tournament Group (optional)
                    </label>
                    <select
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                    >
                      <option value="">No Group / General</option>
                      {tourGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Select Team A *
                    </label>
                    <select
                      required
                      value={team1Id}
                      onChange={(e) => setTeam1Id(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                    >
                      <option value="">Select Team A</option>
                      {tourTeams.map((tm) => (
                        <option key={tm.id} value={tm.id} disabled={tm.id === team2Id}>
                          {tm.name} ({tm.shortName})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Select Team B *
                    </label>
                    <select
                      required
                      value={team2Id}
                      onChange={(e) => setTeam2Id(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                    >
                      <option value="">Select Team B</option>
                      {tourTeams.map((tm) => (
                        <option key={tm.id} value={tm.id} disabled={tm.id === team1Id}>
                          {tm.name} ({tm.shortName})
                        </option>
                      ))}
                    </select>
                  </div>

                  {tourTeams.length < 2 && (
                    <div className="sm:col-span-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                      This tournament needs at least 2 teams. Go to TEAM and create teams assigned to this tournament.
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Match Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={matchName}
                      onChange={(e) => setMatchName(e.target.value)}
                      placeholder="e.g. MATCH 1"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Match Type
                    </label>
                    <select
                      value={stageBadge}
                      onChange={(e) => setStageBadge(e.target.value as MatchStageBadge)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                    >
                      {STAGE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Match Date
                    </label>
                    <input
                      type="date"
                      value={matchDate}
                      onChange={(e) => setMatchDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Match Time
                    </label>
                    <input
                      type="time"
                      value={matchTime}
                      onChange={(e) => setMatchTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Venue
                    </label>
                    <input
                      type="text"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      placeholder="Enter match ground / venue"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Total Overs *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      required
                      value={totalOvers}
                      onChange={(e) => setTotalOvers(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm tabular-nums"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Ball Type
                    </label>
                    <select
                      value={ballType}
                      onChange={(e) => setBallType(e.target.value as BallType)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                    >
                      {BALL_TYPES.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={tourTeams.length < 2}
                className="px-5 py-2 rounded-lg bg-[#FF8C00] hover:bg-[#E87500] disabled:opacity-50 text-white text-xs font-semibold"
              >
                {editingId ? 'Save Match' : 'Create & Open Scoring'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
