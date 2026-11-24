import { FormEvent, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  FolderPlus,
  Plus,
  Search,
  Trash2,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import {
  CricketSuiteState,
  Tournament,
  TournamentGroup,
} from '../../types/cricketSuite';

interface TournamentManagerViewProps {
  mode: 'tournament' | 'tournament-groups' | 'tournament-teams';
  state: CricketSuiteState;
  updateState: (updater: (prev: CricketSuiteState) => CricketSuiteState) => void;
  onToast: (msg: string) => void;
}

export function TournamentManagerView({
  mode,
  state,
  updateState,
  onToast,
}: TournamentManagerViewProps) {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Tournament form
  const [tName, setTName] = useState('');
  const [tShort, setTShort] = useState('');
  const [tLocation, setTLocation] = useState('');
  const [tOvers, setTOvers] = useState('5');
  const [tStartDate, setTStartDate] = useState('15 Nov 2026');
  const [tStatus, setTStatus] = useState<Tournament['status']>('active');

  // Group form
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedTournamentId, setSelectedTournamentId] = useState(
    state.activeTournamentId || state.tournaments[0]?.id || ''
  );

  const openCreateModal = () => {
    setEditingId(null);
    setTName('');
    setTShort('');
    setTLocation('');
    setTOvers(String(state.user.defaultOvers || 5));
    setTStartDate('15 Nov 2026');
    setTStatus('active');
    setModalOpen(true);
  };

  const openEditModal = (t: Tournament) => {
    setEditingId(t.id);
    setTName(t.name);
    setTShort(t.shortName);
    setTLocation(t.location);
    setTOvers(String(t.oversPerInnings));
    setTStartDate(t.startDate);
    setTStatus(t.status);
    setModalOpen(true);
  };

  const handleSaveTournament = (e: FormEvent) => {
    e.preventDefault();
    if (!tName.trim()) return;

    if (editingId) {
      updateState((prev) => ({
        ...prev,
        tournaments: prev.tournaments.map((t) =>
          t.id === editingId
            ? {
                ...t,
                name: tName.trim(),
                shortName: tShort.trim() || tName.trim().slice(0, 10),
                location: tLocation.trim() || 'Karjat',
                oversPerInnings: Math.max(1, Number(tOvers) || 5),
                startDate: tStartDate.trim() || t.startDate,
                status: tStatus,
              }
            : t
        ),
      }));
      onToast('Tournament updated');
    } else {
      const id = `tour_${Date.now()}`;
      const created: Tournament = {
        id,
        name: tName.trim(),
        shortName: tShort.trim() || tName.trim().slice(0, 10),
        location: tLocation.trim() || 'Karjat',
        oversPerInnings: Math.max(1, Number(tOvers) || 5),
        startDate: tStartDate.trim() || 'Today',
        endDate: tStartDate.trim() || 'TBD',
        isActive: true,
        status: tStatus,
      };
      updateState((prev) => ({
        ...prev,
        activeTournamentId: id,
        tournaments: [
          created,
          ...prev.tournaments.map((t) => ({ ...t, isActive: false })),
        ],
      }));
      onToast(`Tournament "${created.name}" created`);
    }
    setModalOpen(false);
  };

  const handleSetActive = (id: string) => {
    updateState((prev) => ({
      ...prev,
      activeTournamentId: id,
      tournaments: prev.tournaments.map((t) => ({
        ...t,
        isActive: t.id === id,
        status: t.id === id ? 'active' : t.status,
      })),
    }));
    onToast('Active tournament switched');
  };

  const handleDeleteTournament = (id: string) => {
    updateState((prev) => {
      const remaining = prev.tournaments.filter((t) => t.id !== id);
      const nextActive =
        prev.activeTournamentId === id ? remaining[0]?.id || '' : prev.activeTournamentId;
      return {
        ...prev,
        activeTournamentId: nextActive,
        tournaments: remaining,
        groups: prev.groups.filter((g) => g.tournamentId !== id),
      };
    });
    setDeleteConfirmId(null);
    onToast('Tournament deleted');
  };

  const handleCreateGroup = (e: FormEvent) => {
    e.preventDefault();
    const clean = newGroupName.trim();
    if (!clean || !selectedTournamentId) return;
    const grp: TournamentGroup = {
      id: `grp_${Date.now()}`,
      tournamentId: selectedTournamentId,
      name: clean,
      teamIds: [],
    };
    updateState((prev) => ({ ...prev, groups: [...prev.groups, grp] }));
    setNewGroupName('');
    onToast(`Group "${clean}" created`);
  };

  const handleToggleTeamInGroup = (groupId: string, teamId: string) => {
    updateState((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => {
        if (g.id !== groupId) return g;
        const exists = g.teamIds.includes(teamId);
        return {
          ...g,
          teamIds: exists
            ? g.teamIds.filter((id) => id !== teamId)
            : [...g.teamIds, teamId],
        };
      }),
    }));
  };

  const handleDeleteGroup = (groupId: string) => {
    updateState((prev) => ({
      ...prev,
      groups: prev.groups.filter((g) => g.id !== groupId),
    }));
    onToast('Group removed');
  };

  const handleAssignTeamTournament = (teamId: string, tournamentId: string) => {
    updateState((prev) => ({
      ...prev,
      teams: prev.teams.map((tm) =>
        tm.id === teamId ? { ...tm, tournamentId } : tm
      ),
    }));
    onToast('Team tournament updated');
  };

  const filteredTournaments = state.tournaments.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.location.toLowerCase().includes(search.toLowerCase()) ||
      t.shortName.toLowerCase().includes(search.toLowerCase())
  );

  if (mode === 'tournament-groups') {
    const tourGroups = state.groups.filter((g) => g.tournamentId === selectedTournamentId);
    const tourTeams = state.teams.filter((t) => t.tournamentId === selectedTournamentId);

    return (
      <div className="space-y-5">
        <div className="rounded-xl bg-[#111116] border border-[#FFE600]/30 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-[#FFE600]">
              Tournament:
            </span>
            <select
              value={selectedTournamentId}
              onChange={(e) => setSelectedTournamentId(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#09090D] border border-white/15 text-sm text-white focus:border-[#FFE600] focus:outline-none"
            >
              {state.tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleCreateGroup} className="flex items-center gap-2 flex-1 sm:flex-initial">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="New Group (e.g. Group C)"
              className="flex-1 sm:w-52 px-3 py-2 rounded-lg bg-[#09090D] border border-white/15 text-sm text-white placeholder:text-zinc-500 focus:border-[#FFE600] focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase whitespace-nowrap"
            >
              <FolderPlus className="w-4 h-4" />
              Add Group
            </button>
          </form>
        </div>

        {tourGroups.length === 0 ? (
          <div className="rounded-xl bg-[#111116] border border-white/10 p-8 text-center text-sm text-zinc-400">
            No groups created for this tournament yet. Add Group A / Group B above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tourGroups.map((grp) => (
              <div
                key={grp.id}
                className="rounded-xl bg-[#111116] border border-white/12 p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
                  <h3 className="font-display text-base font-black text-[#FFE600]">
                    {grp.name}{' '}
                    <span className="font-mono text-xs text-zinc-400 font-normal">
                      ({grp.teamIds.length} teams)
                    </span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleDeleteGroup(grp.id)}
                    className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-700 text-red-200 border border-red-500/35"
                    aria-label={`Delete ${grp.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Click teams to assign / remove:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {tourTeams.map((team) => {
                      const assigned = grp.teamIds.includes(team.id);
                      return (
                        <button
                          key={team.id}
                          type="button"
                          onClick={() => handleToggleTeamInGroup(grp.id, team.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                            assigned
                              ? 'bg-[#DC2626] border-[#FFE600] text-white'
                              : 'bg-[#09090D] border-white/12 text-zinc-300 hover:border-white/30'
                          }`}
                        >
                          {team.shortName} · {team.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (mode === 'tournament-teams') {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-[#111116] border border-[#FFE600]/30 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#FFE600]" />
            <h2 className="font-display text-base font-black text-white uppercase">
              Tournament Teams Assignment
            </h2>
          </div>
          <span className="text-xs text-zinc-400">
            Assign any team to a tournament below
          </span>
        </div>

        <div className="rounded-xl bg-[#111116] border border-white/12 overflow-hidden">
          <div className="divide-y divide-white/8">
            {state.teams.map((tm) => (
              <div
                key={tm.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="font-bold text-white text-sm">
                    {tm.name}{' '}
                    <span className="font-mono text-xs text-[#FFE600]">({tm.shortName})</span>
                  </p>
                  <p className="text-xs text-zinc-400">
                    {tm.place} · {tm.players.length} Players
                  </p>
                </div>

                <select
                  value={tm.tournamentId}
                  onChange={(e) => handleAssignTeamTournament(tm.id, e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[#09090D] border border-white/15 text-xs sm:text-sm text-white focus:border-[#FFE600] focus:outline-none"
                >
                  {state.tournaments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tournament by name or place..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#111116] border border-white/15 focus:border-[#FFE600] focus:outline-none text-sm text-white placeholder:text-zinc-500"
          />
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-display font-black text-xs sm:text-sm uppercase tracking-wide whitespace-nowrap shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>CREATE TOURNAMENT</span>
        </button>
      </div>

      {/* Tournament Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTournaments.map((t) => {
          const isCurrent = t.id === state.activeTournamentId;
          const teamCount = state.teams.filter((tm) => tm.tournamentId === t.id).length;
          const matchCount = state.matches.filter((m) => m.tournamentId === t.id).length;

          return (
            <div
              key={t.id}
              className={`rounded-2xl bg-[#111116] border p-5 space-y-4 transition-colors ${
                isCurrent ? 'border-[#FFE600] shadow-[0_0_24px_rgba(255,230,0,0.12)]' : 'border-white/12'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        t.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : t.status === 'completed'
                            ? 'bg-zinc-700/40 text-zinc-300 border border-zinc-600'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {t.status}
                    </span>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#DC2626] text-white">
                        ACTIVE SELECTED
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-base sm:text-lg font-black text-white leading-snug">
                    {t.name}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {t.location} · {t.oversPerInnings} Overs · {t.startDate}
                  </p>
                </div>

                <Trophy
                  className={`w-6 h-6 shrink-0 ${
                    isCurrent ? 'text-[#FFE600]' : 'text-zinc-500'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="rounded-lg bg-[#09090D] border border-white/10 px-3 py-2 text-zinc-300">
                  Teams: <strong className="text-white">{teamCount}</strong>
                </div>
                <div className="rounded-lg bg-[#09090D] border border-white/10 px-3 py-2 text-zinc-300">
                  Matches: <strong className="text-white">{matchCount}</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleSetActive(t.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    isCurrent
                      ? 'bg-[#FFE600] text-black'
                      : 'bg-white/10 hover:bg-white/15 text-zinc-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isCurrent ? 'Active Tournament' : 'Set Active'}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(t)}
                    className="p-2 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/35 transition-colors"
                    aria-label="Edit tournament"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {deleteConfirmId === t.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDeleteTournament(t.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#DC2626] text-white text-xs font-bold"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1.5 rounded-lg bg-white/10 text-zinc-300 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(t.id)}
                      className="p-2 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/35 transition-colors"
                      aria-label="Delete tournament"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create/Edit Tournament Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#111116] border border-[#FFE600]/40 overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#16161E]">
              <h3 className="font-display font-black text-base text-white uppercase">
                {editingId ? 'Edit Tournament' : 'Create Tournament'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTournament} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Tournament Name
                </label>
                <input
                  type="text"
                  required
                  value={tName}
                  onChange={(e) => setTName(e.target.value)}
                  placeholder="e.g. जय हनुमान क्रिकेट संघ पर्व 5"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090D] border border-white/15 text-sm text-white focus:border-[#FFE600] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Short Name
                  </label>
                  <input
                    type="text"
                    value={tShort}
                    onChange={(e) => setTShort(e.target.value)}
                    placeholder="JHCS P5"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#09090D] border border-white/15 text-sm text-white focus:border-[#FFE600] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Overs / Innings
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={tOvers}
                    onChange={(e) => setTOvers(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#09090D] border border-white/15 text-sm text-white focus:border-[#FFE600] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Ground / Place
                  </label>
                  <input
                    type="text"
                    value={tLocation}
                    onChange={(e) => setTLocation(e.target.value)}
                    placeholder="Karjat / Neral"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#09090D] border border-white/15 text-sm text-white focus:border-[#FFE600] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Status
                  </label>
                  <select
                    value={tStatus}
                    onChange={(e) => setTStatus(e.target.value as Tournament['status'])}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#09090D] border border-white/15 text-sm text-white focus:border-[#FFE600] focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Date
                </label>
                <input
                  type="text"
                  value={tStartDate}
                  onChange={(e) => setTStartDate(e.target.value)}
                  placeholder="15 Nov 2026"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090D] border border-white/15 text-sm text-white focus:border-[#FFE600] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#FFE600] hover:bg-[#FEF08A] text-black font-display font-black text-sm uppercase tracking-wide"
              >
                {editingId ? 'Save Changes' : 'Create Tournament'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
