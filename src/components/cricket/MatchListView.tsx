import { FormEvent, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Coins,
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
  const [createStep, setCreateStep] = useState<1 | 2>(1);
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

  // Step 2: Toss Won & Decision Fields
  const [tossWinnerId, setTossWinnerId] = useState('');
  const [tossDecision, setTossDecision] = useState<'Bat' | 'Bowl'>('Bat');

  const selectedTour = state.tournaments.find((t) => t.id === tournamentId);
  const tourTeams = useMemo(
    () => state.teams.filter((tm) => tm.tournamentId === tournamentId),
    [state.teams, tournamentId]
  );

  const selectedTeam1 = tourTeams.find((t) => t.id === team1Id) ?? state.teams.find((t) => t.id === team1Id);
  const selectedTeam2 = tourTeams.find((t) => t.id === team2Id) ?? state.teams.find((t) => t.id === team2Id);

  const openCreateMatch = () => {
    const defaultTour =
      state.tournaments.find((t) => t.id === state.activeTournamentId) ??
      state.tournaments[0];
    const tid = defaultTour?.id || '';
    const availableTeams = state.teams.filter((tm) => tm.tournamentId === tid);

    setEditingId(null);
    setCreateStep(1);
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
    setTossWinnerId('');
    setTossDecision('Bat');
    setModalOpen(true);
  };

  const openEditMatch = (m: CricketMatch) => {
    setEditingId(m.id);
    setCreateStep(1);
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
    setTossWinnerId(m.tossWinnerId || m.team1Id);
    setTossDecision(m.tossDecision || 'Bat');
    setModalOpen(true);
  };

  const handleTournamentChange = (nextTid: string) => {
    setTournamentId(nextTid);
    setGroupId('');
    const nextTour = state.tournaments.find((t) => t.id === nextTid);
    const nextTeams = state.teams.filter((tm) => tm.tournamentId === nextTid);
    setTeam1Id(nextTeams[0]?.id || '');
    setTeam2Id(nextTeams[1]?.id || '');
    setTossWinnerId('');
    if (nextTour) {
      setVenue(nextTour.location || '');
      setTotalOvers(String(nextTour.oversPerInnings || 6));
      setBallType(nextTour.ballType || 'Tennis');
    }
  };

  const validateStep1 = (): boolean => {
    setFormError(null);
    if (!tournamentId) {
      setFormError('Please select a tournament first.');
      return false;
    }
    if (!team1Id || !team2Id) {
      setFormError('Please select both Team A and Team B.');
      return false;
    }
    if (team1Id === team2Id) {
      setFormError('Team A and Team B cannot be the same team.');
      return false;
    }
    return true;
  };

  const handleProceedToToss = () => {
    if (!validateStep1()) return;
    if (tossWinnerId !== team1Id && tossWinnerId !== team2Id) {
      setTossWinnerId('');
    }
    setCreateStep(2);
  };

  const handleSaveMatch = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!editingId && createStep === 1) {
      handleProceedToToss();
      return;
    }

    if (!validateStep1()) return;

    const effectiveTossWinnerId =
      tossWinnerId === team1Id || tossWinnerId === team2Id ? tossWinnerId : '';

    if (!editingId && !effectiveTossWinnerId) {
      setFormError('Please select which team won the toss before creating the match.');
      return;
    }

    const oversNum = Math.max(1, Math.min(50, Number(totalOvers) || 6));
    const cleanMatchName = matchName.trim() || `MATCH ${state.matches.length + 1}`;
    const t1 = state.teams.find((t) => t.id === team1Id);
    const t2 = state.teams.find((t) => t.id === team2Id);

    const winnerId = effectiveTossWinnerId || team1Id;
    const loserId = winnerId === team1Id ? team2Id : team1Id;
    const batFirstId = tossDecision === 'Bat' ? winnerId : loserId;
    const bowlFirstId = batFirstId === team1Id ? team2Id : team1Id;
    const batFirstTeam = state.teams.find((t) => t.id === batFirstId);
    const bowlFirstTeam = state.teams.find((t) => t.id === bowlFirstId);
    const winnerTeam = state.teams.find((t) => t.id === winnerId);
    const tossResultSummary = `${winnerTeam?.shortName || 'Team'} won the toss & elected to ${tossDecision.toLowerCase()}`;

    if (editingId) {
      updateState((prev) => ({
        ...prev,
        matches: prev.matches.map((m) => {
          if (m.id !== editingId) return m;
          const canUpdateInningsOrder =
            m.innings[0].balls.length === 0 && m.innings[1].balls.length === 0;
          const nextInnings = [
            structuredClone(m.innings[0]),
            structuredClone(m.innings[1]),
          ] as [CricketMatch['innings'][0], CricketMatch['innings'][1]];
          if (canUpdateInningsOrder) {
            nextInnings[0].battingTeamId = batFirstId;
            nextInnings[0].bowlingTeamId = bowlFirstId;
            nextInnings[0].maxOvers = oversNum;
            nextInnings[0].strikerId = batFirstTeam?.players[0]?.id || '';
            nextInnings[0].nonStrikerId = batFirstTeam?.players[1]?.id || '';
            nextInnings[0].bowlerId = bowlFirstTeam?.players[0]?.id || '';
            nextInnings[0].battingOrder = [
              nextInnings[0].strikerId,
              nextInnings[0].nonStrikerId,
            ].filter(Boolean);

            nextInnings[1].battingTeamId = bowlFirstId;
            nextInnings[1].bowlingTeamId = batFirstId;
            nextInnings[1].maxOvers = oversNum;
            nextInnings[1].strikerId = '';
            nextInnings[1].nonStrikerId = '';
            nextInnings[1].bowlerId = '';
            nextInnings[1].battingOrder = [];
          }
          return {
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
            tossWinnerId: winnerId,
            tossDecision,
            tossCompleted: true,
            resultText: m.status === 'not_started' ? tossResultSummary : m.resultText,
            innings: nextInnings,
          };
        }),
      }));
      setModalOpen(false);
      onToast(`Match "${cleanMatchName}" updated.`);
      return;
    }

    // Generate unique Match ID and initialize innings according to Toss Won & Decision
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
      tossWinnerId: winnerId,
      tossDecision,
      tossCompleted: true,
      oversPerInnings: oversNum,
      status: 'not_started',
      resultText: tossResultSummary,
      currentInningsIndex: 0,
      innings: [
        {
          battingTeamId: batFirstId,
          bowlingTeamId: bowlFirstId,
          runs: 0,
          wickets: 0,
          legalBalls: 0,
          maxOvers: oversNum,
          target: null,
          extras: { wd: 0, nb: 0, lb: 0, bye: 0, penalty: 0 },
          strikerId: batFirstTeam?.players[0]?.id || '',
          nonStrikerId: batFirstTeam?.players[1]?.id || '',
          bowlerId: bowlFirstTeam?.players[0]?.id || '',
          battingOrder: [
            batFirstTeam?.players[0]?.id,
            batFirstTeam?.players[1]?.id,
          ].filter(Boolean) as string[],
          balls: [],
          fallOfWickets: [],
          completed: false,
        },
        {
          battingTeamId: bowlFirstId,
          bowlingTeamId: batFirstId,
          runs: 0,
          wickets: 0,
          legalBalls: 0,
          maxOvers: oversNum,
          target: null,
          extras: { wd: 0, nb: 0, lb: 0, bye: 0, penalty: 0 },
          strikerId: '',
          nonStrikerId: '',
          bowlerId: '',
          battingOrder: [],
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
    setCreateStep(1);
    onToast(`Match ${cleanMatchName} created! ${tossResultSummary}.`);
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

  // Preview batting & bowling order for Toss step
  const previewBatFirstTeam =
    tossWinnerId && (tossWinnerId === team1Id || tossWinnerId === team2Id)
      ? tossDecision === 'Bat'
        ? tossWinnerId === team1Id
          ? selectedTeam1
          : selectedTeam2
        : tossWinnerId === team1Id
          ? selectedTeam2
          : selectedTeam1
      : undefined;
  const previewBowlFirstTeam =
    previewBatFirstTeam && selectedTeam1 && selectedTeam2
      ? previewBatFirstTeam.id === selectedTeam1.id
        ? selectedTeam2
        : selectedTeam1
      : undefined;
  const previewWinnerTeam =
    tossWinnerId === team1Id
      ? selectedTeam1
      : tossWinnerId === team2Id
        ? selectedTeam2
        : undefined;

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
            Create a match between two teams in your tournament. Select teams, set Toss Won &amp; Decision, and the Scoring Dashboard opens automatically.
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
                        {m.tossCompleted && m.tossWinnerId && (
                          <p className="text-[11px] font-semibold text-[#E87500] mt-0.5">
                            Toss: {teamMap.get(m.tossWinnerId)?.shortName || 'Team'} won &amp; chose {m.tossDecision}
                          </p>
                        )}
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
              <div>
                <h3 className="font-display font-bold text-base">
                  {editingId
                    ? 'Edit Match'
                    : createStep === 1
                      ? 'Create Match — Step 1: Select Teams'
                      : 'Create Match — Step 2: Toss Won'}
                </h3>
                {!editingId && (
                  <p className="text-[11px] text-orange-100 mt-0.5">
                    {createStep === 1
                      ? 'Select teams & match details, then choose Toss Won'
                      : 'Select Toss Winner & Bat/Bowl decision to create match'}
                  </p>
                )}
              </div>
              <button type="button" onClick={() => setModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2-Step Progress Bar for New Match */}
            {!editingId && (
              <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setFormError(null);
                    setCreateStep(1);
                  }}
                  className={`py-2.5 px-3 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                    createStep === 1
                      ? 'border-[#FF8C00] text-[#FF8C00] bg-white'
                      : 'border-transparent text-emerald-700 bg-emerald-50/40'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full text-[11px] inline-flex items-center justify-center ${
                      createStep === 1
                        ? 'bg-[#FF8C00] text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {createStep === 2 ? '✓' : '1'}
                  </span>
                  <span>Teams &amp; Details</span>
                </button>
                <div
                  className={`py-2.5 px-3 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                    createStep === 2
                      ? 'border-[#FF8C00] text-[#FF8C00] bg-white'
                      : 'border-transparent text-slate-400'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full text-[11px] inline-flex items-center justify-center ${
                      createStep === 2
                        ? 'bg-[#FF8C00] text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    2
                  </span>
                  <span>Toss Won</span>
                </div>
              </div>
            )}

            <div className="p-5 space-y-4 max-h-[72vh] overflow-y-auto">
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
              ) : !editingId && createStep === 2 ? (
                /* ================= STEP 2: TOSS WON & DECISION ================= */
                <div className="space-y-5">
                  {/* Matchup Summary Banner */}
                  <div className="rounded-xl bg-[#FFF3E0] border border-[#FF8C00]/30 p-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#E87500]">
                        {matchName.trim() || `MATCH ${state.matches.length + 1}`} · {stageBadge} · {totalOvers} Overs
                      </p>
                      <p className="font-display font-bold text-sm sm:text-base text-slate-900 truncate mt-0.5">
                        {selectedTeam1?.name || 'Team A'}{' '}
                        <span className="text-[#FF8C00] font-black mx-1">VS</span>{' '}
                        {selectedTeam2?.name || 'Team B'}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[#FF8C00] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Coins className="w-5 h-5" aria-hidden="true" />
                    </div>
                  </div>

                  {/* Direct Toss Won Team Buttons */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Toss Won By *
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[selectedTeam1, selectedTeam2].filter(Boolean).map((tm) => {
                        if (!tm) return null;
                        const isWinner = tossWinnerId === tm.id;
                        return (
                          <button
                            key={tm.id}
                            type="button"
                            onClick={() => {
                              setTossWinnerId(tm.id);
                              setFormError(null);
                            }}
                            className={`p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between gap-3 ${
                              isWinner
                                ? 'bg-[#FFF3E0] border-[#FF8C00] shadow-xs ring-2 ring-[#FF8C00]/20'
                                : 'bg-white border-slate-200 hover:border-[#FF8C00]/50 hover:bg-orange-50/30'
                            }`}
                          >
                            <div className="min-w-0">
                              <span className="inline-block px-2 py-0.5 rounded bg-[#FF8C00]/15 text-[#E87500] text-[10px] font-black uppercase tracking-wider mb-1">
                                {tm.shortName}
                              </span>
                              <p className="font-display font-bold text-sm text-slate-900 truncate">
                                {tm.name}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {tm.players.length} Players
                              </p>
                            </div>
                            <span
                              className={`w-6 h-6 rounded-full inline-flex items-center justify-center shrink-0 ${
                                isWinner
                                  ? 'bg-[#FF8C00] text-white'
                                  : 'border-2 border-slate-300'
                              }`}
                            >
                              {isWinner && <CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Direct Elected To (Bat / Bowl) Buttons */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Elected To *
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {(
                        [
                          { value: 'Bat', label: 'BAT FIRST', sub: 'Start Batting in 1st Innings' },
                          { value: 'Bowl', label: 'BOWL FIRST', sub: 'Start Bowling in 1st Innings' },
                        ] as const
                      ).map((opt) => {
                        const isActive = tossDecision === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setTossDecision(opt.value)}
                            className={`p-3.5 rounded-xl border-2 text-center transition-all ${
                              isActive
                                ? 'bg-[#FF8C00] text-white border-[#E87500] shadow-xs'
                                : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-[#FFF3E0] hover:border-[#FF8C00]/40'
                            }`}
                          >
                            <span className="block font-display font-black text-sm tracking-wide">
                              {opt.label}
                            </span>
                            <span
                              className={`block text-[11px] mt-0.5 ${
                                isActive ? 'text-orange-100' : 'text-slate-500'
                              }`}
                            >
                              {opt.sub}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Live Toss Preview */}
                  {previewWinnerTeam && previewBatFirstTeam && previewBowlFirstTeam && (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs space-y-1">
                      <p className="font-bold text-emerald-900">
                        ✓ {previewWinnerTeam.name} won the toss &amp; elected to {tossDecision.toLowerCase()}
                      </p>
                      <p className="text-emerald-800">
                        1st Innings Batting: <strong>{previewBatFirstTeam.name}</strong> · Bowling:{' '}
                        <strong>{previewBowlFirstTeam.name}</strong>
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* ================= STEP 1 (OR EDIT MODE): TEAMS & MATCH DETAILS ================= */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2 space-y-1">
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
                      Select Team A *
                    </label>
                    <select
                      required
                      value={team1Id}
                      onChange={(e) => {
                        setTeam1Id(e.target.value);
                        setTossWinnerId('');
                      }}
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
                      onChange={(e) => {
                        setTeam2Id(e.target.value);
                        setTossWinnerId('');
                      }}
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

                  {/* Inline Toss Won section when editing an existing match */}
                  {editingId && selectedTeam1 && selectedTeam2 && (
                    <div className="sm:col-span-2 rounded-xl bg-[#FFF3E0]/70 border border-[#FF8C00]/30 p-3.5 space-y-3">
                      <p className="text-xs font-bold text-[#E87500] uppercase tracking-wider flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5" aria-hidden="true" />
                        Toss Won &amp; Decision
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {[selectedTeam1, selectedTeam2].map((tm) => (
                          <button
                            key={tm.id}
                            type="button"
                            onClick={() => setTossWinnerId(tm.id)}
                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors truncate ${
                              tossWinnerId === tm.id
                                ? 'bg-[#FF8C00] text-white border-[#E87500]'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-orange-50'
                            }`}
                          >
                            {tm.name}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {(['Bat', 'Bowl'] as const).map((dec) => (
                          <button
                            key={dec}
                            type="button"
                            onClick={() => setTossDecision(dec)}
                            className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                              tossDecision === dec
                                ? 'bg-[#FF8C00] text-white border-[#E87500]'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-orange-50'
                            }`}
                          >
                            Elected to {dec}
                          </button>
                        ))}
                      </div>
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
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              {!editingId && createStep === 2 ? (
                <button
                  type="button"
                  onClick={() => {
                    setFormError(null);
                    setCreateStep(1);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Back</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
              )}

              {editingId ? (
                <button
                  type="submit"
                  disabled={tourTeams.length < 2}
                  className="px-5 py-2 rounded-lg bg-[#FF8C00] hover:bg-[#E87500] disabled:opacity-50 text-white text-xs font-semibold"
                >
                  Save Match
                </button>
              ) : createStep === 1 ? (
                <button
                  type="submit"
                  disabled={tourTeams.length < 2}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#FF8C00] hover:bg-[#E87500] disabled:opacity-50 text-white text-xs font-bold shadow-xs"
                >
                  <span>Next: Toss Won</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!tossWinnerId}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#FF8C00] hover:bg-[#E87500] disabled:opacity-50 text-white text-xs font-bold shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Create Match &amp; Open Scoring</span>
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
