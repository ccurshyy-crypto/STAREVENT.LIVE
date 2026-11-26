import { ChangeEvent, FormEvent, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Camera,
  Edit3,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  getTeamColorHex,
  getTeamTextColorHex,
  isValidHexColor,
  normalizeHexColor,
} from '../../data/cricketSampleData';
import {
  CricketSuiteState,
  Player,
  PlayerRole,
  Team,
} from '../../types/cricketSuite';

interface TeamManagerViewProps {
  state: CricketSuiteState;
  updateState: (updater: (prev: CricketSuiteState) => CricketSuiteState) => void;
  onToast: (msg: string) => void;
}

const DEFAULT_TEAM_COLOR = '#FF8C00';
const DEFAULT_TEXT_COLOR = '#FFFFFF';

const ROLES: PlayerRole[] = ['Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper'];

export function TeamManagerView({ state, updateState, onToast }: TeamManagerViewProps) {
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>(
    state.activeTournamentId || 'ALL'
  );
  const [search, setSearch] = useState('');
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [playersModalTeamId, setPlayersModalTeamId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Team Form State
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [place, setPlace] = useState('');
  const [teamColorHex, setTeamColorHex] = useState<string>(DEFAULT_TEAM_COLOR);
  const [textColorHex, setTextColorHex] = useState<string>(DEFAULT_TEXT_COLOR);
  const [teamTourId, setTeamTourId] = useState(
    state.activeTournamentId || state.tournaments[0]?.id || ''
  );
  const [logoUrl, setLogoUrl] = useState('');

  // Player Form State (Add + Edit)
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [playerPhotoUrl, setPlayerPhotoUrl] = useState('');
  const [playerJersey, setPlayerJersey] = useState('');
  const [playerRole, setPlayerRole] = useState<PlayerRole>('All-Rounder');
  const [battingStyle, setBattingStyle] = useState('Right-hand bat');
  const [bowlingStyle, setBowlingStyle] = useState('Right-arm medium');
  const [isCaptain, setIsCaptain] = useState(false);
  const [isWicketKeeper, setIsWicketKeeper] = useState(false);
  const playerPhotoInputRef = useRef<HTMLInputElement | null>(null);

  const openCreateTeam = () => {
    setEditingTeamId(null);
    setName('');
    setShortName('');
    setPlace('');
    setTeamColorHex(DEFAULT_TEAM_COLOR);
    setTextColorHex(DEFAULT_TEXT_COLOR);
    setTeamTourId(
      selectedTournamentId !== 'ALL'
        ? selectedTournamentId
        : state.activeTournamentId || state.tournaments[0]?.id || ''
    );
    setLogoUrl('');
    setTeamModalOpen(true);
  };

  const openEditTeam = (team: Team) => {
    setEditingTeamId(team.id);
    setName(team.name);
    setShortName(team.shortName);
    setPlace(team.place);
    setTeamColorHex(getTeamColorHex(team));
    setTextColorHex(getTeamTextColorHex(team));
    setTeamTourId(team.tournamentId);
    setLogoUrl(team.logoUrl || '');
    setTeamModalOpen(true);
  };

  const handleImageFile = (
    e: ChangeEvent<HTMLInputElement>,
    setter: (dataUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      onToast('Image must be smaller than 1.5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setter(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTeam = (e: FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;
    const cleanShort = (shortName.trim() || cleanName.slice(0, 4)).toUpperCase().slice(0, 8);
    const resolvedTeamColor = normalizeHexColor(teamColorHex, DEFAULT_TEAM_COLOR);
    const resolvedTextColor = normalizeHexColor(textColorHex, DEFAULT_TEXT_COLOR);

    if (editingTeamId) {
      updateState((prev) => ({
        ...prev,
        teams: prev.teams.map((tm) =>
          tm.id === editingTeamId
            ? {
                ...tm,
                name: cleanName,
                shortName: cleanShort,
                place: place.trim(),
                customColor: resolvedTeamColor,
                textColor: resolvedTextColor,
                tournamentId: teamTourId,
                logoUrl,
              }
            : tm
        ),
      }));
      onToast(`Team "${cleanName}" updated.`);
    } else {
      const newTeam: Team = {
        id: `team_${Date.now()}`,
        tournamentId: teamTourId,
        name: cleanName,
        shortName: cleanShort,
        place: place.trim(),
        colorTag: 'Defoult',
        customColor: resolvedTeamColor,
        textColor: resolvedTextColor,
        logoUrl,
        players: [],
      };
      updateState((prev) => ({
        ...prev,
        teams: [newTeam, ...prev.teams],
      }));
      onToast(`Team "${cleanName}" created. Click Add Players to build its squad.`);
    }
    setTeamModalOpen(false);
  };

  const handleDeleteTeam = (id: string) => {
    updateState((prev) => ({
      ...prev,
      teams: prev.teams.filter((tm) => tm.id !== id),
      groups: prev.groups.map((g) => ({
        ...g,
        teamIds: g.teamIds.filter((tid) => tid !== id),
      })),
    }));
    setDeleteConfirmId(null);
    onToast('Team deleted.');
  };

  const resetPlayerForm = () => {
    setEditingPlayerId(null);
    setPlayerName('');
    setPlayerPhotoUrl('');
    setPlayerJersey('');
    setPlayerRole('All-Rounder');
    setBattingStyle('Right-hand bat');
    setBowlingStyle('Right-arm medium');
    setIsCaptain(false);
    setIsWicketKeeper(false);
  };

  const startEditPlayer = (p: Player) => {
    setEditingPlayerId(p.id);
    setPlayerName(p.name);
    setPlayerPhotoUrl(p.photoUrl || '');
    setPlayerJersey(String(p.jerseyNo || ''));
    setPlayerRole(p.role);
    setBattingStyle(p.battingStyle);
    setBowlingStyle(p.bowlingStyle);
    setIsCaptain(Boolean(p.isCaptain));
    setIsWicketKeeper(Boolean(p.isWicketKeeper));
  };

  const handleSavePlayer = (e: FormEvent) => {
    e.preventDefault();
    const cleanName = playerName.trim();
    if (!playersModalTeamId || !cleanName) return;

    const targetTeam = state.teams.find((t) => t.id === playersModalTeamId);
    const normalized = cleanName.toLowerCase();
    const hasDuplicate = targetTeam?.players.some(
      (p) =>
        p.id !== editingPlayerId &&
        p.name.trim().toLowerCase() === normalized
    );
    if (hasDuplicate) {
      onToast(
        `Player "${cleanName}" already exists in ${targetTeam?.name || 'this team'}. Same name player cannot be added!`
      );
      return;
    }

    const jersey = Math.max(0, Math.min(999, Number(playerJersey) || 0));

    updateState((prev) => ({
      ...prev,
      teams: prev.teams.map((tm) => {
        if (tm.id !== playersModalTeamId) return tm;
        let updatedPlayers: Player[] = tm.players.map((p) => ({
          ...p,
          isCaptain: isCaptain ? false : p.isCaptain,
        }));

        if (editingPlayerId) {
          updatedPlayers = updatedPlayers.map((p) =>
            p.id === editingPlayerId
              ? {
                  ...p,
                  name: cleanName,
                  photoUrl: playerPhotoUrl,
                  jerseyNo: jersey,
                  role: playerRole,
                  battingStyle,
                  bowlingStyle,
                  isCaptain,
                  isWicketKeeper,
                }
              : p
          );
        } else {
          const newPlayer: Player = {
            id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: cleanName,
            photoUrl: playerPhotoUrl,
            jerseyNo: jersey,
            role: playerRole,
            battingStyle,
            bowlingStyle,
            isCaptain,
            isWicketKeeper,
          };
          updatedPlayers = [...updatedPlayers, newPlayer];
        }
        return { ...tm, players: updatedPlayers };
      }),
    }));

    onToast(editingPlayerId ? 'Player updated.' : `Player "${cleanName}" added.`);
    resetPlayerForm();
  };

  const handleDeletePlayer = (teamId: string, playerId: string) => {
    updateState((prev) => ({
      ...prev,
      teams: prev.teams.map((tm) =>
        tm.id === teamId
          ? { ...tm, players: tm.players.filter((p) => p.id !== playerId) }
          : tm
      ),
    }));
    if (editingPlayerId === playerId) resetPlayerForm();
    onToast('Player removed from squad.');
  };

  const filteredTeams = state.teams.filter((tm) => {
    if (selectedTournamentId !== 'ALL' && tm.tournamentId !== selectedTournamentId) {
      return false;
    }
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      tm.name.toLowerCase().includes(q) ||
      tm.shortName.toLowerCase().includes(q) ||
      tm.place.toLowerCase().includes(q)
    );
  });

  const activePlayersTeam = state.teams.find((t) => t.id === playersModalTeamId);
  const tourMap = new Map(state.tournaments.map((t) => [t.id, t.name]));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="rounded-xl bg-white border border-slate-200 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-2.5 sm:gap-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5 sm:gap-3 flex-1 w-full">
          <select
            value={selectedTournamentId}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
            className="w-full sm:w-auto sm:min-w-[180px] max-w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
          >
            <option value="ALL">All Tournaments</option>
            {state.tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team by name, short name, or place..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-300 focus:border-[#FF8C00] focus:bg-white focus:outline-none text-sm"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateTeam}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg wo-btn-primary text-xs font-extrabold uppercase tracking-wider whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>CREATE TEAM</span>
        </button>
      </div>

      {/* Blank State or Table */}
      {filteredTeams.length === 0 ? (
        <div className="rounded-xl bg-white border border-slate-200 p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 mx-auto rounded-xl bg-[#FFF3E0] border border-[#FF8C00]/30 flex items-center justify-center">
            <Users className="w-6 h-6 text-[#FF8C00]" />
          </div>
          <h2 className="font-display font-bold text-base text-slate-900">
            No Teams Created Yet
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Click CREATE TEAM to register your own teams, upload team logos, and add squad players.
          </p>
          <button
            type="button"
            onClick={openCreateTeam}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg wo-btn-primary text-xs font-extrabold uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" />
            <span>CREATE TEAM</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Mobile Team Cards */}
          <div className="md:hidden space-y-3">
            {filteredTeams.map((team) => {
              const bgHex = getTeamColorHex(team);
              const fgHex = getTeamTextColorHex(team);
              return (
                <div
                  key={`mobile-${team.id}`}
                  className="rounded-xl bg-white border border-slate-200 p-3.5 space-y-3 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    {team.logoUrl ? (
                      <img
                        src={team.logoUrl}
                        alt={team.name}
                        className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div
                        className="w-11 h-11 rounded-lg flex items-center justify-center text-xs font-bold border border-black/10 shrink-0"
                        style={{ backgroundColor: bgHex, color: fgHex }}
                      >
                        {team.shortName.slice(0, 3)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-display font-bold text-sm text-slate-900 truncate">
                          {team.name}
                        </p>
                        <span className="font-mono text-[11px] font-bold text-slate-600 shrink-0">
                          {team.shortName}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {tourMap.get(team.tournamentId) || 'Unassigned Tournament'} ·{' '}
                        {team.players.length} Players{team.place ? ` · ${team.place}` : ''}
                      </p>
                      <div className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-slate-600">
                        <span
                          className="w-3.5 h-3.5 rounded-xs border border-black/15 shrink-0"
                          style={{ backgroundColor: bgHex }}
                        />
                        <span>{bgHex}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPlayersModalTeamId(team.id);
                        resetPlayerForm();
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg wo-btn-primary text-xs font-bold whitespace-nowrap"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Add Players ({team.players.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditTeam(team)}
                      className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg wo-btn-soft text-xs font-bold"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    {deleteConfirmId !== team.id ? (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(team.id)}
                        className="p-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                        aria-label={`Delete ${team.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDeleteTeam(team.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-semibold"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Team Table */}
          <div className="hidden md:block rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-3">Team Name</th>
                    <th className="px-4 py-3">Short Name</th>
                    <th className="px-4 py-3">Color</th>
                    <th className="px-4 py-3">Place</th>
                    <th className="px-4 py-3">Logo</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTeams.map((team) => {
                    const bgHex = getTeamColorHex(team);
                    const fgHex = getTeamTextColorHex(team);
                    return (
                      <tr key={team.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{team.name}</p>
                          <p className="text-xs text-slate-500">
                            {tourMap.get(team.tournamentId) || 'Unassigned Tournament'} ·{' '}
                            {team.players.length} Players
                          </p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">
                          {team.shortName}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-slate-700">
                            <span
                              className="w-4 h-4 rounded-xs border border-black/15 shrink-0"
                              style={{ backgroundColor: bgHex }}
                            />
                            <span>{bgHex}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-700">{team.place || '—'}</td>
                        <td className="px-4 py-3">
                          {team.logoUrl ? (
                            <img
                              src={team.logoUrl}
                              alt={team.name}
                              className="w-9 h-9 rounded-lg object-cover border border-slate-200"
                            />
                          ) : (
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold border border-black/10"
                              style={{
                                backgroundColor: bgHex,
                                color: fgHex,
                              }}
                            >
                              {team.shortName.slice(0, 3)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditTeam(team)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md wo-btn-soft text-xs font-bold"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPlayersModalTeamId(team.id);
                                resetPlayerForm();
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md wo-btn-primary text-xs font-bold whitespace-nowrap"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Add Players ({team.players.length})
                            </button>
                            {deleteConfirmId !== team.id ? (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(team.id)}
                                className="p-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white"
                                aria-label={`Delete ${team.name}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTeam(team.id)}
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
        </div>
      )}

      {/* Create / Edit Team Modal */}
      {teamModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-[2px] overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <motion.form
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            onSubmit={handleSaveTeam}
            className="w-full max-w-[820px] rounded-xl bg-white overflow-hidden shadow-2xl my-auto border border-orange-200"
          >
            {/* White & Orange Modal Header */}
            <div className="relative px-6 py-4 wo-header flex items-center justify-center">
              <h3 className="font-display font-bold text-xl tracking-wide text-white text-center">
                {editingTeamId ? 'Edit Team' : 'Create Team'}
              </h3>
              <button
                type="button"
                onClick={() => setTeamModalOpen(false)}
                aria-label="Close modal"
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-white/90 hover:text-white transition-transform hover:scale-110"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Clean Material Underline Form Body */}
            <div className="px-7 sm:px-10 pt-9 pb-8 space-y-8 bg-white">
              {/* Row 1: Name & Short Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-7 items-end">
                <div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name"
                    className="w-full bg-transparent border-0 border-b border-slate-400 focus:border-b-2 focus:border-[#FF8C00] py-2 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value.toUpperCase())}
                    placeholder="Short Name (Max. 8 Chars)"
                    className="w-full bg-transparent border-0 border-b border-slate-400 focus:border-b-2 focus:border-[#FF8C00] py-2 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors uppercase"
                  />
                </div>
              </div>

              {/* Row 2: Place & (Team Color + Text Color) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-7 items-end">
                <div>
                  <input
                    type="text"
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    placeholder="Place"
                    className="w-full bg-transparent border-0 border-b border-slate-400 focus:border-b-2 focus:border-[#FF8C00] py-2 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <div>
                    <label
                      htmlFor="custom-team-color-picker"
                      className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5"
                    >
                      Team Color (Custom)
                    </label>
                    <div className="flex items-center gap-2 border-b border-slate-400 focus-within:border-b-2 focus-within:border-[#FF8C00] pb-1.5">
                      <input
                        id="custom-team-color-picker"
                        type="color"
                        value={
                          isValidHexColor(teamColorHex)
                            ? normalizeHexColor(teamColorHex, DEFAULT_TEAM_COLOR)
                            : DEFAULT_TEAM_COLOR
                        }
                        onChange={(e) => setTeamColorHex(e.target.value.toUpperCase())}
                        aria-label="Pick custom team color"
                        className="w-9 h-8 rounded border border-slate-300 cursor-pointer bg-transparent p-0.5 shrink-0"
                      />
                      <input
                        type="text"
                        value={teamColorHex}
                        onChange={(e) => setTeamColorHex(e.target.value.toUpperCase())}
                        maxLength={7}
                        placeholder="#FF8C00"
                        aria-label="Custom team color hex code"
                        className="w-full bg-transparent text-sm font-mono font-semibold text-slate-900 focus:outline-none uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="custom-text-color-picker"
                      className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5"
                    >
                      Text Color (Custom)
                    </label>
                    <div className="flex items-center gap-2 border-b border-slate-400 focus-within:border-b-2 focus-within:border-[#FF8C00] pb-1.5">
                      <input
                        id="custom-text-color-picker"
                        type="color"
                        value={
                          isValidHexColor(textColorHex)
                            ? normalizeHexColor(textColorHex, DEFAULT_TEXT_COLOR)
                            : DEFAULT_TEXT_COLOR
                        }
                        onChange={(e) => setTextColorHex(e.target.value.toUpperCase())}
                        aria-label="Pick custom text color"
                        className="w-9 h-8 rounded border border-slate-300 cursor-pointer bg-transparent p-0.5 shrink-0"
                      />
                      <input
                        type="text"
                        value={textColorHex}
                        onChange={(e) => setTextColorHex(e.target.value.toUpperCase())}
                        maxLength={7}
                        placeholder="#FFFFFF"
                        aria-label="Custom text color hex code"
                        className="w-full bg-transparent text-sm font-mono font-semibold text-slate-900 focus:outline-none uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Custom Team Color Preview */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-600">
                  Live Team Color Preview
                </span>
                <div className="flex items-center gap-2.5">
                  <span
                    className="inline-flex items-center justify-center min-w-[44px] h-9 px-3 rounded-lg font-display font-black text-xs tracking-wider border border-black/15 shadow-xs"
                    style={{
                      backgroundColor: normalizeHexColor(teamColorHex, DEFAULT_TEAM_COLOR),
                      color: normalizeHexColor(textColorHex, DEFAULT_TEXT_COLOR),
                    }}
                  >
                    {(shortName.trim() || name.trim().slice(0, 4) || 'TEAM').toUpperCase()}
                  </span>
                  <span
                    className="inline-flex items-center px-3.5 h-9 rounded-lg font-display font-bold text-sm border border-black/15 shadow-xs"
                    style={{
                      backgroundColor: normalizeHexColor(teamColorHex, DEFAULT_TEAM_COLOR),
                      color: normalizeHexColor(textColorHex, DEFAULT_TEXT_COLOR),
                    }}
                  >
                    {name.trim() || 'Your Team Name'}
                  </span>
                </div>
              </div>

              {/* Centered Orange SUBMIT Button */}
              <div className="pt-3 flex justify-center">
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  className="px-8 py-2.5 rounded-lg wo-btn-primary text-xs font-extrabold uppercase tracking-wider cursor-pointer"
                >
                  SUBMIT
                </motion.button>
              </div>
            </div>
          </motion.form>
        </div>
      )}

      {/* Add / Edit / Delete Players Modal */}
      {activePlayersTeam && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-3xl rounded-xl bg-white border border-orange-200 overflow-hidden shadow-2xl my-auto">
            <div className="px-5 py-4 wo-header text-white flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-base text-white tracking-wide">
                  Squad Players · {activePlayersTeam.name}
                </h3>
                <p className="text-xs text-orange-100">
                  {activePlayersTeam.players.length} players registered
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPlayersModalTeamId(null);
                  resetPlayerForm();
                }}
                className="p-1 text-white/90 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Add / Edit Player Form */}
              <form
                onSubmit={handleSavePlayer}
                className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#FF8C00]">
                    {editingPlayerId ? 'Edit Player' : 'Add New Player'}
                  </p>
                  {editingPlayerId && (
                    <button
                      type="button"
                      onClick={resetPlayerForm}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Player Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Enter player full name"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Jersey Number
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={999}
                      value={playerJersey}
                      onChange={(e) => setPlayerJersey(e.target.value)}
                      placeholder="e.g. 7"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm tabular-nums"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Player Role
                    </label>
                    <select
                      value={playerRole}
                      onChange={(e) => setPlayerRole(e.target.value as PlayerRole)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Batting Style
                    </label>
                    <select
                      value={battingStyle}
                      onChange={(e) => setBattingStyle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm"
                    >
                      <option value="Right-hand bat">Right-hand bat</option>
                      <option value="Left-hand bat">Left-hand bat</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Bowling Style
                    </label>
                    <select
                      value={bowlingStyle}
                      onChange={(e) => setBowlingStyle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm"
                    >
                      <option value="Right-arm medium">Right-arm medium</option>
                      <option value="Right-arm fast">Right-arm fast</option>
                      <option value="Left-arm medium">Left-arm medium</option>
                      <option value="Right-arm offbreak">Right-arm offbreak</option>
                      <option value="Slow left-arm orthodox">Slow left-arm orthodox</option>
                      <option value="Legbreak">Legbreak</option>
                      <option value="None">None</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isCaptain}
                        onChange={(e) => setIsCaptain(e.target.checked)}
                        className="rounded border-slate-300 text-[#FF8C00]"
                      />
                      Captain (C)
                    </label>

                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isWicketKeeper}
                        onChange={(e) => setIsWicketKeeper(e.target.checked)}
                        className="rounded border-slate-300 text-[#FF8C00]"
                      />
                      Wicketkeeper (WK)
                    </label>

                    <div className="inline-flex items-center gap-2">
                      <input
                        ref={playerPhotoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageFile(e, setPlayerPhotoUrl)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => playerPhotoInputRef.current?.click()}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        {playerPhotoUrl ? 'Photo Added' : 'Upload Photo'}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg wo-btn-primary text-xs font-extrabold uppercase tracking-wider"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{editingPlayerId ? 'Update Player' : 'Add Player'}</span>
                  </button>
                </div>
              </form>

              {/* Squad List Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                    <tr>
                      <th className="px-3 py-2.5">#</th>
                      <th className="px-3 py-2.5">Player</th>
                      <th className="px-3 py-2.5">Role</th>
                      <th className="px-3 py-2.5">Styles</th>
                      <th className="px-3 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activePlayersTeam.players.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                          No players added yet. Use the form above to add squad members.
                        </td>
                      </tr>
                    ) : (
                      activePlayersTeam.players.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 font-mono font-bold text-slate-600">
                            {p.jerseyNo || '—'}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              {p.photoUrl ? (
                                <img
                                  src={p.photoUrl}
                                  alt={p.name}
                                  className="w-7 h-7 rounded-full object-cover border border-slate-200"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-[#FFF3E0] text-[#FF8C00] font-bold flex items-center justify-center text-[10px]">
                                  {p.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <span className="font-semibold text-slate-900">
                                {p.name}
                                {p.isCaptain ? ' (C)' : ''}
                                {p.isWicketKeeper ? ' (WK)' : ''}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-slate-700">{p.role}</td>
                          <td className="px-3 py-2.5 text-slate-500">
                            {p.battingStyle} · {p.bowlingStyle}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => startEditPlayer(p)}
                                className="px-2 py-1 rounded bg-[#FFF3E0] hover:bg-orange-100 text-[#E87500] font-semibold"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePlayer(activePlayersTeam.id, p.id)}
                                className="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 font-semibold"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
