import { ChangeEvent, FormEvent, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Edit3,
  FolderPlus,
  Play,
  Plus,
  Search,
  Trash2,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { computePointTableRows, formatOvers } from '../../data/cricketSampleData';
import {
  BallType,
  CricketSuiteState,
  MatchFormat,
  Tournament,
  TournamentGroup,
  TournamentType,
} from '../../types/cricketSuite';

interface TournamentManagerViewProps {
  mode: 'tournament' | 'tournament-groups' | 'tournament-teams';
  state: CricketSuiteState;
  updateState: (updater: (prev: CricketSuiteState) => CricketSuiteState) => void;
  onOpenScoring?: (matchId: string) => void;
  onToast: (msg: string) => void;
}

const TOURNAMENT_TYPES: TournamentType[] = [
  'League + Knockout',
  'Knockout',
  'League',
  'Tri-Series',
  'Bilateral',
];

const BALL_TYPES: BallType[] = ['Tennis', 'Leather', 'Soft Tennis', 'Rubber'];

const MATCH_FORMATS: MatchFormat[] = ['T10', 'T20', 'Limited Overs', 'Box Cricket', 'ODI'];

export function TournamentManagerView({
  mode,
  state,
  updateState,
  onOpenScoring,
  onToast,
}: TournamentManagerViewProps) {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // Tournament Form
  const [tName, setTName] = useState('');
  const [tShort, setTShort] = useState('');
  const [tLogoUrl, setTLogoUrl] = useState('');
  const [tVenue, setTVenue] = useState('');
  const [tType, setTType] = useState<TournamentType>('League + Knockout');
  const [tOvers, setTOvers] = useState('6');
  const [tBallType, setTBallType] = useState<BallType>('Tennis');
  const [tFormat, setTFormat] = useState<MatchFormat>('T10');
  const [tStartDate, setTStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [tEndDate, setTEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [tStatus, setTStatus] = useState<Tournament['status']>('active');

  // Group Form
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupTeamIds, setGroupTeamIds] = useState<string[]>([]);
  const [selectedGroupViewId, setSelectedGroupViewId] = useState<string>('');

  const [selectedTourId, setSelectedTourId] = useState<string>(
    state.activeTournamentId || state.tournaments[0]?.id || ''
  );

  const effectiveTourId =
    state.tournaments.some((t) => t.id === selectedTourId)
      ? selectedTourId
      : state.activeTournamentId || state.tournaments[0]?.id || '';

  const openCreateTournament = () => {
    setEditingId(null);
    setTName('');
    setTShort('');
    setTLogoUrl('');
    setTVenue('');
    setTType('League + Knockout');
    setTOvers(String(state.user.defaultOvers || 6));
    setTBallType('Tennis');
    setTFormat('T10');
    const today = new Date().toISOString().slice(0, 10);
    setTStartDate(today);
    setTEndDate(today);
    setTStatus('active');
    setModalOpen(true);
  };

  const openEditTournament = (t: Tournament) => {
    setEditingId(t.id);
    setTName(t.name);
    setTShort(t.shortName);
    setTLogoUrl(t.logoUrl || '');
    setTVenue(t.location);
    setTType(t.tournamentType || 'League + Knockout');
    setTOvers(String(t.oversPerInnings));
    setTBallType(t.ballType || 'Tennis');
    setTFormat(t.matchFormat || 'T10');
    setTStartDate(t.startDate);
    setTEndDate(t.endDate);
    setTStatus(t.status);
    setModalOpen(true);
  };

  const handleLogoFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      onToast('Logo must be smaller than 1.5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setTLogoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTournament = (e: FormEvent) => {
    e.preventDefault();
    const cleanName = tName.trim();
    if (!cleanName) return;
    const overs = Math.max(1, Math.min(50, Number(tOvers) || 6));

    if (editingId) {
      updateState((prev) => ({
        ...prev,
        tournaments: prev.tournaments.map((t) =>
          t.id === editingId
            ? {
                ...t,
                name: cleanName,
                shortName: tShort.trim() || cleanName.slice(0, 12),
                logoUrl: tLogoUrl,
                location: tVenue.trim() || 'Main Ground',
                tournamentType: tType,
                oversPerInnings: overs,
                ballType: tBallType,
                matchFormat: tFormat,
                startDate: tStartDate,
                endDate: tEndDate,
                status: tStatus,
              }
            : t
        ),
      }));
      onToast(`Tournament "${cleanName}" updated.`);
    } else {
      const newId = `tour_${Date.now()}`;
      const newTour: Tournament = {
        id: newId,
        name: cleanName,
        shortName: tShort.trim() || cleanName.slice(0, 12),
        logoUrl: tLogoUrl,
        location: tVenue.trim() || 'Main Ground',
        tournamentType: tType,
        oversPerInnings: overs,
        ballType: tBallType,
        matchFormat: tFormat,
        startDate: tStartDate,
        endDate: tEndDate,
        isActive: true,
        status: tStatus,
      };
      updateState((prev) => ({
        ...prev,
        activeTournamentId: newId,
        tournaments: [
          newTour,
          ...prev.tournaments.map((t) => ({ ...t, isActive: false })),
        ],
      }));
      setSelectedTourId(newId);
      onToast(`Tournament "${cleanName}" created and set active.`);
    }
    setModalOpen(false);
  };

  const handleDeleteTournament = (id: string) => {
    updateState((prev) => {
      const nextTours = prev.tournaments.filter((t) => t.id !== id);
      const nextActive =
        prev.activeTournamentId === id ? nextTours[0]?.id || '' : prev.activeTournamentId;
      return {
        ...prev,
        activeTournamentId: nextActive,
        tournaments: nextTours,
        groups: prev.groups.filter((g) => g.tournamentId !== id),
      };
    });
    setDeleteConfirmId(null);
    onToast('Tournament deleted.');
  };

  const handleSetActiveTournament = (id: string) => {
    updateState((prev) => ({
      ...prev,
      activeTournamentId: id,
      tournaments: prev.tournaments.map((t) => ({
        ...t,
        isActive: t.id === id,
      })),
    }));
    setSelectedTourId(id);
    onToast('Active tournament updated.');
  };

  // =========================================================================
  // VIEW 1: TOURNAMENT LIST & CRUD
  // =========================================================================
  if (mode === 'tournament') {
    const filtered = state.tournaments.filter((t) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.shortName.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q)
      );
    });

    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-white border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tournament by name or venue..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-300 focus:border-[#303F9F] focus:bg-white focus:outline-none text-sm text-slate-900"
            />
          </div>

          <button
            type="button"
            onClick={openCreateTournament}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#303F9F] hover:bg-[#283593] text-white text-xs font-semibold transition-colors whitespace-nowrap shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>CREATE TOURNAMENT</span>
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl bg-white border border-slate-200 p-12 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 mx-auto rounded-xl bg-indigo-50 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-[#303F9F]" />
            </div>
            <h2 className="font-display font-bold text-base text-slate-900">
              No Tournaments Created Yet
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              Create your first cricket tournament with venue, dates, overs, format, and ball type.
            </p>
            <button
              type="button"
              onClick={openCreateTournament}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#303F9F] hover:bg-[#283593] text-white text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Tournament</span>
            </button>
          </div>
        ) : (
          <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-3">Tournament</th>
                    <th className="px-4 py-3">Venue</th>
                    <th className="px-4 py-3">Format &amp; Overs</th>
                    <th className="px-4 py-3">Dates</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((t) => {
                    const isActive = t.id === state.activeTournamentId;
                    const teamCount = state.teams.filter((tm) => tm.tournamentId === t.id).length;
                    const matchCount = state.matches.filter((m) => m.tournamentId === t.id).length;
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {t.logoUrl ? (
                              <img
                                src={t.logoUrl}
                                alt={t.name}
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center font-display font-bold text-xs text-[#303F9F] shrink-0">
                                {t.shortName.slice(0, 3).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-slate-900">{t.name}</p>
                              <p className="text-xs text-slate-500">
                                {t.tournamentType} · {teamCount} Teams · {matchCount} Matches
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-700">{t.location}</td>
                        <td className="px-4 py-3 text-xs text-slate-700 tabular-nums">
                          {t.matchFormat} · {t.oversPerInnings} Overs · {t.ballType}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 tabular-nums">
                          {t.startDate} – {t.endDate}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span
                            className={`font-semibold ${
                              isActive ? 'text-emerald-700' : 'text-slate-600'
                            }`}
                          >
                            {isActive ? 'Active' : t.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isActive && (
                              <button
                                type="button"
                                onClick={() => handleSetActiveTournament(t.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Set Active
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditTournament(t)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Edit
                            </button>
                            {deleteConfirmId !== t.id ? (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(t.id)}
                                className="p-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-600"
                                aria-label={`Delete ${t.name}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTournament(t.id)}
                                  className="px-2 py-1 rounded bg-red-600 text-white text-xs font-semibold"
                                >
                                  Confirm
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

        {/* Create / Edit Tournament Modal */}
        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <form
              onSubmit={handleSaveTournament}
              className="w-full max-w-xl rounded-xl bg-white border border-slate-200 shadow-2xl overflow-hidden my-auto"
            >
              <div className="px-5 py-4 bg-[#303F9F] text-white flex items-center justify-between">
                <h3 className="font-display font-bold text-base">
                  {editingId ? 'Edit Tournament' : 'Create Tournament'}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded hover:bg-white/15"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Tournament Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={tName}
                      onChange={(e) => setTName(e.target.value)}
                      placeholder="Enter tournament name"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#303F9F] focus:outline-none text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Short Name
                    </label>
                    <input
                      type="text"
                      value={tShort}
                      onChange={(e) => setTShort(e.target.value)}
                      placeholder="e.g. SPL 2026"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#303F9F] focus:outline-none text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Venue / Ground *
                    </label>
                    <input
                      type="text"
                      required
                      value={tVenue}
                      onChange={(e) => setTVenue(e.target.value)}
                      placeholder="Enter ground or city"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#303F9F] focus:outline-none text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={tStartDate}
                      onChange={(e) => setTStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#303F9F] focus:outline-none text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={tEndDate}
                      onChange={(e) => setTEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#303F9F] focus:outline-none text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Tournament Type
                    </label>
                    <select
                      value={tType}
                      onChange={(e) => setTType(e.target.value as TournamentType)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#303F9F] focus:outline-none text-sm bg-white"
                    >
                      {TOURNAMENT_TYPES.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Match Format
                    </label>
                    <select
                      value={tFormat}
                      onChange={(e) => setTFormat(e.target.value as MatchFormat)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#303F9F] focus:outline-none text-sm bg-white"
                    >
                      {MATCH_FORMATS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
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
                      value={tOvers}
                      onChange={(e) => setTOvers(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#303F9F] focus:outline-none text-sm tabular-nums"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Ball Type
                    </label>
                    <select
                      value={tBallType}
                      onChange={(e) => setTBallType(e.target.value as BallType)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#303F9F] focus:outline-none text-sm bg-white"
                    >
                      {BALL_TYPES.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Tournament Logo
                    </label>
                    <div className="flex items-center gap-3">
                      {tLogoUrl ? (
                        <img
                          src={tLogoUrl}
                          alt="Tournament logo preview"
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                          <Camera className="w-5 h-5" />
                        </div>
                      )}
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFile}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                      >
                        Upload Logo
                      </button>
                      {tLogoUrl && (
                        <button
                          type="button"
                          onClick={() => setTLogoUrl('')}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#303F9F] hover:bg-[#283593] text-white text-xs font-semibold"
                >
                  {editingId ? 'Save Changes' : 'Save Tournament'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: TOURNAMENT GROUPS (WITH GROUP-WISE MATCHES & POINTS TABLE)
  // =========================================================================
  if (mode === 'tournament-groups') {
    const tourGroups = state.groups.filter((g) => g.tournamentId === effectiveTourId);
    const tourTeams = state.teams.filter((t) => t.tournamentId === effectiveTourId);
    const activeGroup =
      tourGroups.find((g) => g.id === selectedGroupViewId) ?? tourGroups[0];
    const allPoints = computePointTableRows(state, effectiveTourId);

    const openCreateGroup = () => {
      setEditingGroupId(null);
      setGroupName(`Group ${String.fromCharCode(65 + tourGroups.length)}`);
      setGroupTeamIds([]);
      setGroupModalOpen(true);
    };

    const openEditGroup = (g: TournamentGroup) => {
      setEditingGroupId(g.id);
      setGroupName(g.name);
      setGroupTeamIds([...g.teamIds]);
      setGroupModalOpen(true);
    };

    const toggleTeamInForm = (teamId: string) => {
      setGroupTeamIds((prev) =>
        prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
      );
    };

    const handleSaveGroup = (e: FormEvent) => {
      e.preventDefault();
      if (!effectiveTourId || !groupName.trim()) return;
      if (editingGroupId) {
        updateState((prev) => ({
          ...prev,
          groups: prev.groups.map((g) =>
            g.id === editingGroupId
              ? { ...g, name: groupName.trim(), teamIds: groupTeamIds }
              : g
          ),
        }));
        onToast(`Group "${groupName.trim()}" updated.`);
      } else {
        const newGrp: TournamentGroup = {
          id: `grp_${Date.now()}`,
          tournamentId: effectiveTourId,
          name: groupName.trim(),
          teamIds: groupTeamIds,
        };
        updateState((prev) => ({
          ...prev,
          groups: [...prev.groups, newGrp],
        }));
        setSelectedGroupViewId(newGrp.id);
        onToast(`Group "${newGrp.name}" created.`);
      }
      setGroupModalOpen(false);
    };

    const handleDeleteGroup = (id: string) => {
      updateState((prev) => ({
        ...prev,
        groups: prev.groups.filter((g) => g.id !== id),
      }));
      onToast('Group deleted.');
    };

    const groupMatches = activeGroup
      ? state.matches.filter(
          (m) =>
            m.tournamentId === effectiveTourId &&
            (m.groupId === activeGroup.id ||
              (activeGroup.teamIds.includes(m.team1Id) &&
                activeGroup.teamIds.includes(m.team2Id)))
        )
      : [];

    const groupPoints = activeGroup
      ? allPoints.filter((r) => activeGroup.teamIds.includes(r.teamId))
      : [];

    const teamMap = new Map(state.teams.map((t) => [t.id, t]));

    return (
      <div className="space-y-5">
        <div className="rounded-xl bg-white border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 flex-wrap">
            <label className="text-xs font-semibold text-slate-600">Tournament:</label>
            <select
              value={effectiveTourId}
              onChange={(e) => setSelectedTourId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-900 min-w-[220px]"
            >
              {state.tournaments.length === 0 && <option value="">No tournaments created</option>}
              {state.tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={!effectiveTourId}
            onClick={openCreateGroup}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#303F9F] hover:bg-[#283593] disabled:opacity-50 text-white text-xs font-semibold whitespace-nowrap"
          >
            <FolderPlus className="w-4 h-4" />
            <span>CREATE GROUP</span>
          </button>
        </div>

        {!effectiveTourId ? (
          <div className="rounded-xl bg-white border border-slate-200 p-10 text-center text-sm text-slate-500">
            Create a Tournament first to organize Tournament Groups.
          </div>
        ) : tourGroups.length === 0 ? (
          <div className="rounded-xl bg-white border border-slate-200 p-10 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-800">
              No groups created for this tournament yet.
            </p>
            <button
              type="button"
              onClick={openCreateGroup}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#303F9F] text-white text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Group</span>
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tourGroups.map((g) => {
                const isSelected = activeGroup?.id === g.id;
                const assignedTeams = tourTeams.filter((tm) => g.teamIds.includes(tm.id));
                return (
                  <div
                    key={g.id}
                    onClick={() => setSelectedGroupViewId(g.id)}
                    className={`cursor-pointer rounded-xl bg-white border p-4 space-y-3 transition-colors shadow-xs ${
                      isSelected ? 'border-[#303F9F] ring-1 ring-[#303F9F]' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display font-bold text-base text-slate-900">{g.name}</h3>
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => openEditGroup(g)}
                          className="p-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700"
                          aria-label={`Edit ${g.name}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGroup(g.id)}
                          className="p-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-600"
                          aria-label={`Delete ${g.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500">
                      {assignedTeams.length} assigned team{assignedTeams.length === 1 ? '' : 's'}
                    </p>

                    <div className="space-y-1">
                      {assignedTeams.length === 0 ? (
                        <p className="text-xs text-slate-400">No teams assigned yet.</p>
                      ) : (
                        assignedTeams.map((tm) => (
                          <div
                            key={tm.id}
                            className="text-xs font-medium text-slate-700 flex items-center justify-between py-1 border-t border-slate-100"
                          >
                            <span>{tm.name}</span>
                            <span className="font-mono text-slate-500">{tm.shortName}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Group Points Table & Matches */}
            {activeGroup && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <h4 className="font-display font-bold text-sm text-slate-900">
                      {activeGroup.name} · Points Table
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="px-3 py-2 text-left">Team</th>
                          <th className="px-2 py-2 text-right">P</th>
                          <th className="px-2 py-2 text-right">W</th>
                          <th className="px-2 py-2 text-right">L</th>
                          <th className="px-2 py-2 text-right">Pts</th>
                          <th className="px-3 py-2 text-right">NRR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 tabular-nums">
                        {groupPoints.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                              Assign teams to this group to view standings.
                            </td>
                          </tr>
                        ) : (
                          groupPoints.map((row) => (
                            <tr key={row.teamId}>
                              <td className="px-3 py-2 font-semibold text-slate-900">
                                {row.teamName}
                              </td>
                              <td className="px-2 py-2 text-right">{row.played}</td>
                              <td className="px-2 py-2 text-right">{row.won}</td>
                              <td className="px-2 py-2 text-right">{row.lost}</td>
                              <td className="px-2 py-2 text-right font-bold text-[#303F9F]">
                                {row.points}
                              </td>
                              <td className="px-3 py-2 text-right font-mono">
                                {row.nrr >= 0 ? `+${row.nrr.toFixed(3)}` : row.nrr.toFixed(3)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <h4 className="font-display font-bold text-sm text-slate-900">
                      {activeGroup.name} · Group Matches ({groupMatches.length})
                    </h4>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {groupMatches.length === 0 ? (
                      <p className="p-6 text-center text-xs text-slate-400">
                        No matches scheduled in {activeGroup.name} yet.
                      </p>
                    ) : (
                      groupMatches.map((m) => {
                        const t1 = teamMap.get(m.team1Id);
                        const t2 = teamMap.get(m.team2Id);
                        return (
                          <div
                            key={m.id}
                            className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 truncate">
                                {t1?.shortName || 'Team A'} vs {t2?.shortName || 'Team B'} ·{' '}
                                {m.matchLabel}
                              </p>
                              <p className="text-[11px] text-slate-500 tabular-nums">
                                {m.innings[0].runs}/{m.innings[0].wickets} (
                                {formatOvers(m.innings[0].legalBalls)}) · {m.resultText}
                              </p>
                            </div>
                            {onOpenScoring && (
                              <button
                                type="button"
                                onClick={() => onOpenScoring(m.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#303F9F] text-white text-[11px] font-semibold shrink-0"
                              >
                                <Play className="w-3 h-3" />
                                Score
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {groupModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55"
            role="dialog"
            aria-modal="true"
          >
            <form
              onSubmit={handleSaveGroup}
              className="w-full max-w-md rounded-xl bg-white border border-slate-200 overflow-hidden shadow-2xl"
            >
              <div className="px-5 py-4 bg-[#303F9F] text-white flex items-center justify-between">
                <h3 className="font-display font-bold text-base">
                  {editingGroupId ? 'Edit Group' : 'Create Group'}
                </h3>
                <button type="button" onClick={() => setGroupModalOpen(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. Group A"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Assign Teams ({groupTeamIds.length} selected)
                  </label>
                  {tourTeams.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      No teams registered in this tournament yet.
                    </p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                      {tourTeams.map((tm) => (
                        <label
                          key={tm.id}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-slate-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={groupTeamIds.includes(tm.id)}
                            onChange={() => toggleTeamInForm(tm.id)}
                            className="rounded border-slate-300 text-[#303F9F]"
                          />
                          <span className="font-semibold text-slate-800">{tm.name}</span>
                          <span className="font-mono text-slate-400 ml-auto">{tm.shortName}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setGroupModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#303F9F] text-white text-xs font-semibold"
                >
                  Save Group
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: TOURNAMENT TEAMS (ONLY TEAMS BELONGING TO SELECTED TOURNAMENT)
  // =========================================================================
  const tourTeams = state.teams.filter((tm) => {
    if (effectiveTourId && tm.tournamentId !== effectiveTourId) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      tm.name.toLowerCase().includes(q) ||
      tm.shortName.toLowerCase().includes(q) ||
      tm.place.toLowerCase().includes(q)
    );
  });
  const tourGroups = state.groups.filter((g) => g.tournamentId === effectiveTourId);

  const assignTeamToGroup = (teamId: string, nextGroupId: string) => {
    updateState((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => {
        if (g.tournamentId !== effectiveTourId) return g;
        const without = g.teamIds.filter((id) => id !== teamId);
        if (g.id === nextGroupId) {
          return { ...g, teamIds: [...without, teamId] };
        }
        return { ...g, teamIds: without };
      }),
    }));
    onToast('Team group assignment updated.');
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <select
            value={effectiveTourId}
            onChange={(e) => setSelectedTourId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-900 min-w-[200px]"
          >
            {state.tournaments.length === 0 && <option value="">No tournaments created</option>}
            {state.tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams in selected tournament..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-300 focus:border-[#303F9F] focus:bg-white focus:outline-none text-sm"
            />
          </div>
        </div>
      </div>

      {!effectiveTourId || tourTeams.length === 0 ? (
        <div className="rounded-xl bg-white border border-slate-200 p-10 text-center space-y-2 shadow-xs">
          <Users className="w-7 h-7 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-800">
            No teams assigned to this tournament yet.
          </p>
          <p className="text-xs text-slate-500">
            Go to TEAM in the sidebar and click CREATE TEAM to add teams to this tournament.
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">Short Name</th>
                  <th className="px-4 py-3">Place</th>
                  <th className="px-4 py-3">Squad Size</th>
                  <th className="px-4 py-3">Assigned Group</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tourTeams.map((tm) => {
                  const currentGrp = tourGroups.find((g) => g.teamIds.includes(tm.id));
                  return (
                    <tr key={tm.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-semibold text-slate-900">{tm.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {tm.shortName}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{tm.place || '—'}</td>
                      <td className="px-4 py-3 text-xs font-mono tabular-nums text-slate-700">
                        {tm.players.length} players
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={currentGrp?.id || ''}
                          onChange={(e) => assignTeamToGroup(tm.id, e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800"
                        >
                          <option value="">Unassigned</option>
                          {tourGroups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
