import { ChangeEvent, useState } from 'react';
import {
  BarChart3,
  Calculator,
  Check,
  Palette,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  Shield,
  Target,
  Tv,
  UserCircle,
} from 'lucide-react';
import {
  calcRunRate,
  computePointTableRows,
  computeTournamentStats,
  formatOvers,
} from '../../data/cricketSampleData';
import {
  CricketSuiteState,
  OverlayThemeId,
  PointTableEntry,
} from '../../types/cricketSuite';

interface SidebarToolsProps {
  route:
    | 'point-table'
    | 'runrate'
    | 'player-position'
    | 'theme'
    | 'statistics'
    | 'setting'
    | 'account';
  state: CricketSuiteState;
  updateState: (updater: (prev: CricketSuiteState) => CricketSuiteState) => void;
  onResetDemoData: () => void;
  onToast: (msg: string) => void;
}

export function SidebarToolsViews({
  route,
  state,
  updateState,
  onResetDemoData,
  onToast,
}: SidebarToolsProps) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [customRR, setCustomRR] = useState('10.0');
  const [selectedSpotId, setSelectedSpotId] = useState(
    state.fieldPositions[0]?.id || 'wk'
  );

  const teamMap = new Map(state.teams.map((t) => [t.id, t]));
  const activeMatch =
    state.matches.find((m) => m.id === state.activeMatchId) ?? state.matches[0];

  // 1. EDIT POINT TABLE
  if (route === 'point-table') {
    const rows = computePointTableRows(state, state.activeTournamentId);

    const updateRow = (teamId: string, patch: Partial<PointTableEntry>) => {
      updateState((prev) => {
        const base =
          prev.pointTableOverrides.filter(
            (r) => r.tournamentId === prev.activeTournamentId
          ).length > 0
            ? prev.pointTableOverrides
            : [
                ...prev.pointTableOverrides,
                ...computePointTableRows(prev, prev.activeTournamentId),
              ];
        return {
          ...prev,
          pointTableOverrides: base.map((r) =>
            r.teamId === teamId && r.tournamentId === prev.activeTournamentId
              ? { ...r, ...patch }
              : r
          ),
        };
      });
    };

    const handleRecalculate = () => {
      updateState((prev) => ({
        ...prev,
        pointTableOverrides: prev.pointTableOverrides.filter(
          (r) => r.tournamentId !== prev.activeTournamentId
        ),
      }));
      onToast('Points table recalculated from completed matches');
    };

    const handlePushOverlay = () => {
      updateState((prev) => ({
        ...prev,
        overlay: {
          ...prev.overlay,
          mainCard: { kind: 'POINTS_TABLE', groupId: 'ALL' },
        },
      }));
      onToast('Points Table pushed live to vMix Overlay!');
    };

    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-[#111116] border border-[#FFE600]/30 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-black text-base text-white uppercase">
              Edit Point Table
            </h2>
            <p className="text-xs text-zinc-400">
              Edit M / W / L / T / NR / Pts / NRR inline or recalculate automatically
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRecalculate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#FFE600]" />
              Recalculate
            </button>
            <button
              type="button"
              onClick={handlePushOverlay}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#EF4444] text-xs font-black text-white uppercase"
            >
              <Tv className="w-3.5 h-3.5 text-[#FFE600]" />
              Push to Overlay
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-[#111116] border border-white/12 overflow-x-auto">
          <table className="w-full text-xs sm:text-sm font-mono text-left">
            <thead className="bg-[#181822] text-[#FFE600] border-b border-white/10">
              <tr>
                <th className="px-3 py-2.5">Team</th>
                <th className="px-2 py-2.5 text-center">M</th>
                <th className="px-2 py-2.5 text-center">W</th>
                <th className="px-2 py-2.5 text-center">L</th>
                <th className="px-2 py-2.5 text-center">T</th>
                <th className="px-2 py-2.5 text-center">NR</th>
                <th className="px-2 py-2.5 text-center">Pts</th>
                <th className="px-3 py-2.5 text-center">NRR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {rows.map((r) => (
                <tr key={r.teamId}>
                  <td className="px-3 py-2 font-sans font-bold text-white whitespace-nowrap">
                    {teamMap.get(r.teamId)?.name || r.teamId}
                  </td>
                  {(['played', 'won', 'lost', 'tied', 'nr', 'points'] as const).map(
                    (field) => (
                      <td key={field} className="px-1.5 py-2 text-center">
                        <input
                          type="number"
                          value={r[field]}
                          onChange={(e) =>
                            updateRow(r.teamId, { [field]: Number(e.target.value) || 0 })
                          }
                          className="w-12 px-1.5 py-1 rounded bg-[#09090D] border border-white/15 text-center text-white"
                        />
                      </td>
                    )
                  )}
                  <td className="px-2 py-2 text-center">
                    <input
                      type="number"
                      step="0.01"
                      value={r.nrr}
                      onChange={(e) =>
                        updateRow(r.teamId, { nrr: Number(e.target.value) || 0 })
                      }
                      className="w-16 px-1.5 py-1 rounded bg-[#09090D] border border-white/15 text-center text-[#FFE600]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 2. RUNRATE PREDICTOR
  if (route === 'runrate') {
    const inn = activeMatch ? activeMatch.innings[activeMatch.currentInningsIndex] : null;
    const runs = inn?.runs ?? 0;
    const legalBalls = inn?.legalBalls ?? 0;
    const maxOvers = inn?.maxOvers ?? 5;
    const remOvers = Math.max(0, (maxOvers * 6 - legalBalls) / 6);
    const crr = Number(calcRunRate(runs, legalBalls));
    const target = inn?.target ?? null;
    const needRuns = target !== null ? Math.max(0, target - runs) : null;
    const rrr = needRuns !== null && remOvers > 0 ? needRuns / remOvers : null;
    const customNum = Math.max(1, Number(customRR) || 10);

    const winChance =
      rrr === null
        ? 50
        : Math.max(5, Math.min(95, Math.round(75 - (rrr - Math.max(6, crr)) * 6)));

    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#111116] border border-[#FFE600]/30 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#FFE600]" />
            <h2 className="font-display font-black text-lg text-white uppercase">
              Run Rate &amp; Chase Predictor
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="rounded-xl bg-[#09090D] border border-white/10 p-3">
              <p className="text-[11px] text-zinc-400">Current Score</p>
              <p className="text-xl font-black text-white">
                {runs}-{inn?.wickets ?? 0} ({formatOvers(legalBalls)})
              </p>
            </div>
            <div className="rounded-xl bg-[#09090D] border border-white/10 p-3">
              <p className="text-[11px] text-zinc-400">Current RR</p>
              <p className="text-xl font-black text-[#FFE600]">{crr.toFixed(2)}</p>
            </div>
            <div className="rounded-xl bg-[#09090D] border border-white/10 p-3">
              <p className="text-[11px] text-zinc-400">Required RR</p>
              <p className="text-xl font-black text-red-400">
                {rrr !== null ? rrr.toFixed(2) : '—'}
              </p>
            </div>
            <div className="rounded-xl bg-[#09090D] border border-white/10 p-3">
              <p className="text-[11px] text-zinc-400">Chase Win Odds</p>
              <p className="text-xl font-black text-emerald-400">{winChance}%</p>
            </div>
          </div>

          {/* Projected Scores Table */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {[
              { label: `Curr (${crr.toFixed(1)})`, rr: crr },
              { label: 'At 8.0 RPO', rr: 8 },
              { label: 'At 10.0 RPO', rr: 10 },
              { label: 'At 12.0 RPO', rr: 12 },
              { label: `Custom (${customNum})`, rr: customNum },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl bg-[#181822] border border-white/12 p-3 text-center"
              >
                <p className="text-[11px] font-mono text-zinc-400">{item.label}</p>
                <p className="mt-1 font-mono text-2xl font-black text-[#FFE600]">
                  {Math.round(runs + remOvers * item.rr)}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/10">
            <label className="text-xs font-bold text-zinc-300">Custom Run Rate:</label>
            <input
              type="number"
              step="0.5"
              min="1"
              max="36"
              value={customRR}
              onChange={(e) => setCustomRR(e.target.value)}
              className="w-24 px-3 py-1.5 rounded-lg bg-[#09090D] border border-white/15 font-mono text-sm text-white"
            />
            <button
              type="button"
              onClick={() => {
                updateState((prev) => ({
                  ...prev,
                  overlay: { ...prev.overlay, bottomScoreMode: 'Projected Score' },
                }));
                onToast('Projected Score pushed to Bottom Bar');
              }}
              className="px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#EF4444] text-white font-bold text-xs uppercase"
            >
              Broadcast Projected Score
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. PLAYER POSITION
  if (route === 'player-position') {
    const bowlTeam = activeMatch
      ? teamMap.get(activeMatch.innings[activeMatch.currentInningsIndex].bowlingTeamId)
      : state.teams[0];
    const selectedSpot =
      state.fieldPositions.find((p) => p.id === selectedSpotId) ?? state.fieldPositions[0];

    const assignPlayer = (spotId: string, playerId: string | null) => {
      updateState((prev) => ({
        ...prev,
        fieldPositions: prev.fieldPositions.map((p) =>
          p.id === spotId ? { ...p, playerId } : p
        ),
      }));
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 rounded-2xl bg-[#111116] border border-[#FFE600]/30 p-5 flex flex-col items-center gap-4">
          <div className="w-full flex items-center justify-between">
            <h2 className="font-display font-black text-base text-white uppercase flex items-center gap-2">
              <Target className="w-4 h-4 text-[#FFE600]" />
              Fielding Diagram
            </h2>
            <button
              type="button"
              onClick={() => {
                updateState((prev) => ({
                  ...prev,
                  overlay: {
                    ...prev.overlay,
                    mainCard: { kind: 'MATCH_STATS', mode: 'Player Position' },
                  },
                }));
                onToast('Player Position broadcast live to TV Overlay');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-[#DC2626] hover:bg-[#EF4444] text-white font-bold text-xs uppercase"
            >
              Push to Overlay
            </button>
          </div>

          <svg viewBox="0 0 260 260" className="w-full max-w-[340px] h-auto">
            <circle cx="130" cy="130" r="120" fill="#0B3B1F" stroke="#FFE600" strokeWidth="3" />
            <circle
              cx="130"
              cy="130"
              r="65"
              fill="none"
              stroke="rgba(255,255,255,0.45)"
              strokeDasharray="5 5"
            />
            <rect x="123" y="108" width="14" height="44" rx="2" fill="#D4A373" />
            {state.fieldPositions.map((pos) => {
              const cx = 16 + (pos.x / 100) * 228;
              const cy = 16 + (pos.y / 100) * 228;
              const isSelected = pos.id === selectedSpot?.id;
              const assigned = bowlTeam?.players.find((p) => p.id === pos.playerId);
              return (
                <g
                  key={pos.id}
                  onClick={() => setSelectedSpotId(pos.id)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 10 : 7}
                    fill={isSelected ? '#FFE600' : '#DC2626'}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                  <text
                    x={cx}
                    y={cy + 18}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="8"
                    fontWeight="700"
                  >
                    {assigned ? assigned.name.split(' ')[0] : pos.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="lg:col-span-6 rounded-2xl bg-[#111116] border border-white/12 p-5 space-y-4">
          <h3 className="font-display font-black text-base text-[#FFE600] uppercase">
            Assign Fielders ({bowlTeam?.name})
          </h3>

          {selectedSpot && (
            <div className="rounded-xl bg-[#09090D] border border-[#FFE600]/40 p-4 space-y-2">
              <p className="text-xs font-mono text-zinc-400">Selected Spot</p>
              <p className="font-display font-black text-lg text-white">
                {selectedSpot.label}
              </p>
              <select
                value={selectedSpot.playerId || ''}
                onChange={(e) =>
                  assignPlayer(selectedSpot.id, e.target.value || null)
                }
                className="w-full px-3 py-2 rounded-lg bg-[#15151E] border border-white/15 text-sm text-white"
              >
                <option value="">Unassigned</option>
                {(bowlTeam?.players || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
            {state.fieldPositions.map((pos) => {
              const pName =
                bowlTeam?.players.find((p) => p.id === pos.playerId)?.name || 'Unassigned';
              return (
                <button
                  key={pos.id}
                  type="button"
                  onClick={() => setSelectedSpotId(pos.id)}
                  className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                    pos.id === selectedSpot?.id
                      ? 'bg-[#DC2626]/25 border-[#FFE600] text-white'
                      : 'bg-[#09090D] border-white/10 text-zinc-300'
                  }`}
                >
                  <p className="font-bold text-[#FFE600]">{pos.label}</p>
                  <p className="truncate">{pName}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 4. THEME SETUP
  if (route === 'theme') {
    const themes: Array<{
      id: OverlayThemeId;
      name: string;
      desc: string;
      colors: string[];
    }> = [
      {
        id: 'star-red-gold',
        name: 'Star Event Red & Gold',
        desc: 'Official Star Event Live crimson, dark black & metallic gold broadcast theme',
        colors: ['#09090D', '#DC2626', '#FFE600'],
      },
      {
        id: 'theme14',
        name: 'theme14 (Classic Pro TV)',
        desc: 'High-contrast charcoal black, bright crimson alerts & sharp yellow score bars',
        colors: ['#111116', '#E11D1D', '#FACC15'],
      },
      {
        id: 'royal-navy-gold',
        name: 'Royal Navy & Gold',
        desc: 'Championship floodlight midnight navy with championship gold borders',
        colors: ['#070B28', '#2563EB', '#FACC15'],
      },
      {
        id: 'emerald-gold',
        name: 'Emerald Stadium & Gold',
        desc: 'Deep pitch green lower-thirds with luminous gold highlights',
        colors: ['#041C14', '#10B981', '#FDE047'],
      },
    ];

    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-[#111116] border border-[#FFE600]/30 p-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-[#FFE600]" />
          <h2 className="font-display font-black text-base text-white uppercase">
            Theme Setup (UI &amp; vMix Overlay)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {themes.map((th) => {
            const active = state.user.userTheme === th.id;
            return (
              <button
                key={th.id}
                type="button"
                onClick={() => {
                  updateState((prev) => ({
                    ...prev,
                    user: { ...prev.user, userTheme: th.id },
                  }));
                  onToast(`Theme switched to ${th.name}`);
                }}
                className={`text-left rounded-2xl bg-[#111116] border p-5 space-y-3 transition-all ${
                  active
                    ? 'border-[#FFE600] shadow-[0_0_24px_rgba(255,230,0,0.18)]'
                    : 'border-white/12 hover:border-white/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-black text-base text-white">
                    {th.name}
                  </span>
                  {active && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FFE600] text-black font-mono text-[10px] font-black">
                      <Check className="w-3 h-3" /> ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400">{th.desc}</p>
                <div className="flex items-center gap-2 pt-1">
                  {th.colors.map((hex) => (
                    <span
                      key={hex}
                      className="w-8 h-6 rounded border border-white/25"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 5. STATISTICS
  if (route === 'statistics') {
    const stats = computeTournamentStats(state, state.activeTournamentId);
    return (
      <div className="space-y-5">
        <div className="rounded-xl bg-[#111116] border border-[#FFE600]/30 p-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#FFE600]" />
          <h2 className="font-display font-black text-base text-white uppercase">
            Tournament Batting &amp; Bowling Leaderboards
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Batting Leaderboard */}
          <div className="rounded-2xl bg-[#111116] border border-white/12 overflow-hidden">
            <div className="px-4 py-3 bg-[#181822] border-b border-white/10 font-display font-black text-sm text-[#FFE600] uppercase">
              Top Run Scorers
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-left">
                <thead className="text-zinc-400 border-b border-white/10">
                  <tr>
                    <th className="px-3 py-2">Player</th>
                    <th className="px-2 py-2 text-right">Runs</th>
                    <th className="px-2 py-2 text-right">4s</th>
                    <th className="px-2 py-2 text-right">6s</th>
                    <th className="px-3 py-2 text-right">SR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {stats.topRuns.map((b) => (
                    <tr key={b.playerId}>
                      <td className="px-3 py-2 font-sans">
                        <p className="font-bold text-white">{b.name}</p>
                        <p className="text-[10px] text-zinc-400">{b.teamShort}</p>
                      </td>
                      <td className="px-2 py-2 text-right font-black text-[#FFE600]">
                        {b.runs}
                      </td>
                      <td className="px-2 py-2 text-right text-zinc-300">{b.fours}</td>
                      <td className="px-2 py-2 text-right text-zinc-300">{b.sixes}</td>
                      <td className="px-3 py-2 text-right text-emerald-300">{b.sr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bowling Leaderboard */}
          <div className="rounded-2xl bg-[#111116] border border-white/12 overflow-hidden">
            <div className="px-4 py-3 bg-[#181822] border-b border-white/10 font-display font-black text-sm text-[#FFE600] uppercase">
              Top Wicket Takers
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-left">
                <thead className="text-zinc-400 border-b border-white/10">
                  <tr>
                    <th className="px-3 py-2">Bowler</th>
                    <th className="px-2 py-2 text-right">Ov</th>
                    <th className="px-2 py-2 text-right">Runs</th>
                    <th className="px-2 py-2 text-right">Wkts</th>
                    <th className="px-3 py-2 text-right">Eco</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {stats.topWickets.map((b) => (
                    <tr key={b.playerId}>
                      <td className="px-3 py-2 font-sans">
                        <p className="font-bold text-white">{b.name}</p>
                        <p className="text-[10px] text-zinc-400">{b.teamShort}</p>
                      </td>
                      <td className="px-2 py-2 text-right text-zinc-300">{b.overs}</td>
                      <td className="px-2 py-2 text-right text-zinc-300">{b.runs}</td>
                      <td className="px-2 py-2 text-right font-black text-[#FFE600]">
                        {b.wickets}
                      </td>
                      <td className="px-3 py-2 text-right text-emerald-300">{b.eco}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 6. SETTING & USER ACCOUNT
  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      updateState((prev) => ({
        ...prev,
        user: { ...prev.user, channelLogoUrl: dataUrl },
      }));
      onToast('Channel logo updated');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-[#111116] border border-[#FFE600]/30 p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-white/10">
          {route === 'account' ? (
            <UserCircle className="w-5 h-5 text-[#FFE600]" />
          ) : (
            <Settings className="w-5 h-5 text-[#FFE600]" />
          )}
          <h2 className="font-display font-black text-base text-white uppercase">
            {route === 'account' ? 'User Account Profile' : 'Studio & Match Settings'}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">User Name</label>
            <input
              type="text"
              value={state.user.userName}
              onChange={(e) =>
                updateState((prev) => ({
                  ...prev,
                  user: { ...prev.user, userName: e.target.value },
                }))
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090D] border border-white/15 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">Channel Title</label>
            <input
              type="text"
              value={state.user.channelTitle}
              onChange={(e) =>
                updateState((prev) => ({
                  ...prev,
                  user: { ...prev.user, channelTitle: e.target.value },
                }))
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090D] border border-white/15 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">User Email</label>
            <input
              type="email"
              value={state.user.userEmail}
              onChange={(e) =>
                updateState((prev) => ({
                  ...prev,
                  user: { ...prev.user, userEmail: e.target.value },
                }))
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090D] border border-white/15 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">Mobile Number</label>
            <input
              type="text"
              value={state.user.userMobile}
              onChange={(e) =>
                updateState((prev) => ({
                  ...prev,
                  user: { ...prev.user, userMobile: e.target.value },
                }))
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090D] border border-white/15 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">
              Default Match Overs
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={state.user.defaultOvers}
              onChange={(e) =>
                updateState((prev) => ({
                  ...prev,
                  user: { ...prev.user, defaultOvers: Math.max(1, Number(e.target.value) || 5) },
                }))
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090D] border border-white/15 text-sm font-mono text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">
              Channel Logo Upload
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="w-full px-3 py-2 rounded-xl bg-[#09090D] border border-white/15 text-xs text-zinc-300"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onToast('Settings saved automatically')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFE600] hover:bg-[#FEF08A] text-black font-black text-xs uppercase"
          >
            <Save className="w-4 h-4" />
            Save Settings
          </button>

          {confirmReset ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-300 font-bold">Reset all tournaments &amp; matches?</span>
              <button
                type="button"
                onClick={() => {
                  onResetDemoData();
                  setConfirmReset(false);
                  onToast('Demo cricket data restored');
                }}
                className="px-3 py-2 rounded-lg bg-[#DC2626] text-white font-bold text-xs"
              >
                Yes, Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-3 py-2 rounded-lg bg-white/10 text-zinc-200 text-xs"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-xs font-bold text-red-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Demo Data
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-[#111116] border border-white/10 p-4 flex items-center gap-3 text-xs text-zinc-400">
        <Shield className="w-4 h-4 text-[#FFE600] shrink-0" />
        <span>
          Isolated User Workspace ID: <strong className="text-white font-mono">{state.uid}</strong> ·
          All tournaments, teams, live scores, and vMix overlay settings stay scoped strictly to this ID.
        </span>
      </div>
    </div>
  );
}
