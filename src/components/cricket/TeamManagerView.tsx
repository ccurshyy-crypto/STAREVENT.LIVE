import { ChangeEvent, FormEvent, useRef, useState } from 'react';
import {
  Camera,
  Edit3,
  Plus,
  Search,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { TEAM_COLOR_MAP } from '../../data/cricketSampleData';
import {
  CricketSuiteState,
  Player,
  PlayerRole,
  Team,
  TeamColorTag,
} from '../../types/cricketSuite';

interface TeamManagerViewProps {
  state: CricketSuiteState;
  updateState: (updater: (prev: CricketSuiteState) => CricketSuiteState) => void;
  onToast: (msg: string) => void;
}

const COLOR_OPTIONS: TeamColorTag[] = [
  'Light_yellow',
  'Light_brown',
  'Light_pink',
  'Blue',
  'Light_blue',
  'Defoult',
  'Crimson_red',
  'Metallic_gold',
];

export function TeamManagerView({ state, updateState, onToast }: TeamManagerViewProps) {
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>(
    state.activeTournamentId || 'ALL'
  );
  const [search, setSearch] = useState('');
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [playersModalTeamId, setPlayersModalTeamId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const logoUploadTeamIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Team Form
  const [nameInput, setNameInput] = useState('');
  const [shortInput, setShortInput] = useState('');
  const [placeInput, setPlaceInput] = useState('');
  const [colorInput, setColorInput] = useState<TeamColorTag>('Light_yellow');

  // Player Form
  const [pName, setPName] = useState('');
  const [pRole, setPRole] = useState<PlayerRole>('Batsman');
  const [pJersey, setPJersey] = useState('7');

  const filteredTeams = state.teams.filter((t) => {
    if (selectedTournamentId !== 'ALL' && t.tournamentId !== selectedTournamentId) {
      return false;
    }
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) ||
      t.shortName.toLowerCase().includes(q) ||
      t.place.toLowerCase().includes(q)
    );
  });

  const openCreateTeam = () => {
    setEditingTeamId(null);
    setNameInput('');
    setShortInput('');
    setPlaceInput('');
    setColorInput('Light_yellow');
    setTeamModalOpen(true);
  };

  const openEditTeam = (team: Team) => {
    setEditingTeamId(team.id);
    setNameInput(team.name);
    setShortInput(team.shortName);
    setPlaceInput(team.place);
    setColorInput(team.colorTag);
    setTeamModalOpen(true);
  };

  const handleSaveTeam = (e: FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    const cleanShort =
      shortInput.trim().toUpperCase().slice(0, 5) ||
      nameInput.trim().slice(0, 3).toUpperCase();

    if (editingTeamId) {
      updateState((prev) => ({
        ...prev,
        teams: prev.teams.map((t) =>
          t.id === editingTeamId
            ? {
                ...t,
                name: nameInput.trim(),
                shortName: cleanShort,
                place: placeInput.trim() || t.place,
                colorTag: colorInput,
              }
            : t
        ),
      }));
      onToast('Team updated');
    } else {
      const targetTournament =
        selectedTournamentId !== 'ALL'
          ? selectedTournamentId
          : state.activeTournamentId || state.tournaments[0]?.id || '';
      const teamId = `team_${Date.now()}`;
      const newTeam: Team = {
        id: teamId,
        tournamentId: targetTournament,
        name: nameInput.trim(),
        shortName: cleanShort,
        place: placeInput.trim() || 'Karjat',
        colorTag: colorInput,
        players: Array.from({ length: 11 }, (_, idx) => ({
          id: `${teamId}_p${idx + 1}`,
          name: `${cleanShort} Player ${idx + 1}`,
          role: idx >= 7 ? 'Bowler' : idx === 2 ? 'Wicket-Keeper' : 'Batsman',
          battingStyle: 'Right-Hand Bat',
          bowlingStyle: 'Right-Arm Medium',
          jerseyNo: idx + 1,
        })),
      };
      updateState((prev) => ({
        ...prev,
        teams: [newTeam, ...prev.teams],
      }));
      onToast(`Team "${newTeam.name}" created with 11 default players`);
    }
    setTeamModalOpen(false);
  };

  const handleDeleteTeam = (id: string) => {
    updateState((prev) => ({
      ...prev,
      teams: prev.teams.filter((t) => t.id !== id),
      groups: prev.groups.map((g) => ({
        ...g,
        teamIds: g.teamIds.filter((tid) => tid !== id),
      })),
    }));
    setDeleteConfirmId(null);
    onToast('Team deleted');
  };

  const triggerLogoUpload = (teamId: string) => {
    logoUploadTeamIdRef.current = teamId;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const teamId = logoUploadTeamIdRef.current;
    if (!file || !teamId) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      updateState((prev) => ({
        ...prev,
        teams: prev.teams.map((t) =>
          t.id === teamId ? { ...t, logoUrl: dataUrl } : t
        ),
      }));
      onToast('Team logo updated');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const activePlayersTeam = state.teams.find((t) => t.id === playersModalTeamId) ?? null;

  const handleAddPlayer = (e: FormEvent) => {
    e.preventDefault();
    if (!activePlayersTeam || !pName.trim()) return;
    const newPlayer: Player = {
      id: `${activePlayersTeam.id}_p_${Date.now()}`,
      name: pName.trim(),
      role: pRole,
      battingStyle: 'Right-Hand Bat',
      bowlingStyle: pRole === 'Bowler' ? 'Right-Arm Fast' : 'Right-Arm Offbreak',
      jerseyNo: Math.max(0, Number(pJersey) || 0),
    };
    updateState((prev) => ({
      ...prev,
      teams: prev.teams.map((t) =>
        t.id === activePlayersTeam.id
          ? { ...t, players: [...t.players, newPlayer] }
          : t
      ),
    }));
    setPName('');
    onToast(`Added ${newPlayer.name}`);
  };

  const handleRemovePlayer = (teamId: string, playerId: string) => {
    updateState((prev) => ({
      ...prev,
      teams: prev.teams.map((t) =>
        t.id === teamId
          ? { ...t, players: t.players.filter((p) => p.id !== playerId) }
          : t
      ),
    }));
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Tournament Selector + Create Team + Search */}
      <div className="rounded-xl bg-[#111116] border border-[#FFE600]/25 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <select
            value={selectedTournamentId}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
            aria-label="Filter teams by tournament"
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#09090D] border border-white/15 text-sm font-semibold text-white focus:border-[#FFE600] focus:outline-none"
          >
            <option value="ALL">All Tournaments</option>
            {state.tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={openCreateTeam}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-display font-black text-xs sm:text-sm uppercase tracking-wide whitespace-nowrap shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>CREATE TEAM</span>
          </button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search team by name, short name, place"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#09090D] border border-white/15 focus:border-[#FFE600] focus:outline-none text-sm text-white placeholder:text-zinc-500"
          />
        </div>
      </div>

      {/* Team Table (Responsive) */}
      <div className="rounded-2xl bg-[#111116] border border-white/12 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#181822] border-b border-white/10 text-[11px] font-mono font-bold uppercase tracking-wider text-[#FFE600]">
                <th className="px-4 py-3">Name / Short Name</th>
                <th className="px-4 py-3">Color</th>
                <th className="px-4 py-3 text-center">Logo</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8 text-sm">
              {filteredTeams.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-zinc-400">
                    No matching teams found. Click <strong>CREATE TEAM</strong> to add one.
                  </td>
                </tr>
              ) : (
                filteredTeams.map((team) => {
                  const colorInfo = TEAM_COLOR_MAP[team.colorTag] || TEAM_COLOR_MAP.Defoult;
                  return (
                    <tr
                      key={team.id}
                      className="hover:bg-white/[0.025] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-white leading-snug">{team.name}</div>
                        <div className="text-xs text-zinc-400 font-mono">
                          {team.shortName} · {team.place} · {team.players.length} Players
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono font-bold ${colorInfo.bg} ${colorInfo.text} ${colorInfo.border}`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: colorInfo.hex }}
                          />
                          {team.colorTag}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => triggerLogoUpload(team.id)}
                          title="Upload / Change Team Logo"
                          className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#09090D] hover:bg-white/10 border border-white/15 hover:border-[#FFE600] overflow-hidden transition-colors"
                        >
                          {team.logoUrl ? (
                            <img
                              src={team.logoUrl}
                              alt={`${team.name} logo`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Camera className="w-4 h-4 text-[#FFE600]" />
                          )}
                        </button>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditTeam(team)}
                            title="Edit Team"
                            className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setPlayersModalTeamId(team.id)}
                            title="Add / Manage Players"
                            className="p-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-colors"
                          >
                            <UserPlus className="w-4 h-4" />
                          </button>

                          {deleteConfirmId === team.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDeleteTeam(team.id)}
                                className="px-2 py-1.5 rounded-lg bg-[#DC2626] text-white text-xs font-bold"
                              >
                                Delete
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
                              onClick={() => setDeleteConfirmId(team.id)}
                              title="Delete Team"
                              className="p-2 rounded-lg bg-[#DC2626] hover:bg-[#EF4444] text-white transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Team Modal */}
      {teamModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#111116] border border-[#FFE600]/40 overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#16161E]">
              <h3 className="font-display font-black text-base text-white uppercase">
                {editingTeamId ? 'Edit Team' : 'Create Team'}
              </h3>
              <button
                type="button"
                onClick={() => setTeamModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeam} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Team Name
                </label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. जय हनुमान चाहूचीवाडी"
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
                    value={shortInput}
                    onChange={(e) => setShortInput(e.target.value.toUpperCase())}
                    placeholder="JHC"
                    maxLength={5}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#09090D] border border-white/15 text-sm font-mono uppercase text-white focus:border-[#FFE600] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Place / Village
                  </label>
                  <input
                    type="text"
                    value={placeInput}
                    onChange={(e) => setPlaceInput(e.target.value)}
                    placeholder="चाहूचीवाडी"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#09090D] border border-white/15 text-sm text-white focus:border-[#FFE600] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Team Color Tag
                </label>
                <select
                  value={colorInput}
                  onChange={(e) => setColorInput(e.target.value as TeamColorTag)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#09090D] border border-white/15 text-sm text-white focus:border-[#FFE600] focus:outline-none"
                >
                  {COLOR_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-display font-black text-sm uppercase tracking-wide"
              >
                {editingTeamId ? 'Save Team' : 'Create Team'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Manage Players Modal */}
      {activePlayersTeam && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="w-full max-w-lg rounded-2xl bg-[#111116] border border-[#FFE600]/40 overflow-hidden shadow-2xl my-auto">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#16161E]">
              <div>
                <h3 className="font-display font-black text-base text-white">
                  {activePlayersTeam.name} · Squad ({activePlayersTeam.players.length})
                </h3>
                <p className="text-xs text-zinc-400">
                  Add or remove players for live scoring &amp; Playing XI
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPlayersModalTeamId(null)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <form onSubmit={handleAddPlayer} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  required
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  placeholder="Player Name"
                  className="sm:col-span-5 px-3 py-2 rounded-lg bg-[#09090D] border border-white/15 text-xs sm:text-sm text-white focus:border-[#FFE600] focus:outline-none"
                />
                <select
                  value={pRole}
                  onChange={(e) => setPRole(e.target.value as PlayerRole)}
                  className="sm:col-span-3 px-2.5 py-2 rounded-lg bg-[#09090D] border border-white/15 text-xs text-white"
                >
                  <option value="Batsman">Batsman</option>
                  <option value="Bowler">Bowler</option>
                  <option value="All-Rounder">All-Rounder</option>
                  <option value="Wicket-Keeper">WK</option>
                </select>
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={pJersey}
                  onChange={(e) => setPJersey(e.target.value)}
                  placeholder="#"
                  className="sm:col-span-2 px-2.5 py-2 rounded-lg bg-[#09090D] border border-white/15 text-xs font-mono text-white"
                />
                <button
                  type="submit"
                  className="sm:col-span-2 py-2 rounded-lg bg-[#FFE600] hover:bg-[#FEF08A] text-black font-black text-xs uppercase"
                >
                  Add
                </button>
              </form>

              <div className="max-h-72 overflow-y-auto divide-y divide-white/8 border border-white/10 rounded-xl bg-[#09090D]">
                {activePlayersTeam.players.map((p, i) => (
                  <div
                    key={p.id}
                    className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs sm:text-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-[11px] text-[#FFE600] w-6 shrink-0">
                        #{p.jerseyNo || i + 1}
                      </span>
                      <span className="font-semibold text-white truncate">{p.name}</span>
                      <span className="text-[11px] text-zinc-400 shrink-0">({p.role})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePlayer(activePlayersTeam.id, p.id)}
                      className="p-1 text-red-400 hover:text-red-300"
                      aria-label={`Remove ${p.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
