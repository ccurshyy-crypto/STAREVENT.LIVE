import { ChangeEvent, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BarChart3,
  Calculator,
  Check,
  Crosshair,
  Edit3,
  History,
  Palette,
  RotateCcw,
  Save,
  Settings,
  Table2,
  Upload,
  UserCircle,
  X,
} from 'lucide-react';
import {
  BROADCAST_THEMES,
  calcRunRate,
  calcStrikeRate,
  computePlayerBattingPositions,
  computePointTableRows,
  computeTournamentStats,
  formatOvers,
  getThemePalette,
} from '../../data/cricketSampleData';
import {
  CricketSuiteState,
  OverlayThemeId,
  PointTableAuditEntry,
  PointTableEntry,
} from '../../types/cricketSuite';
import { TataIplScoreboardBar } from './TataIplScoreboardBar';
import { WorldCupScoreboardBar } from './WorldCupScoreboardBar';

interface SidebarToolsViewsProps {
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
}: SidebarToolsViewsProps) {
  // ===== EDIT POINT TABLE STATE =====
  const [ptTournamentId, setPtTournamentId] = useState<string>(
    state.activeTournamentId || state.tournaments[0]?.id || ''
  );
  const [ptGroupFilter, setPtGroupFilter] = useState<string>('ALL');
  const [editingPtRow, setEditingPtRow] = useState<
    (PointTableEntry & { teamName: string }) | null
  >(null);
  const [ptReason, setPtReason] = useState('');

  // ===== RUNRATE PREDICTOR STATE =====
  const [customRpo, setCustomRpo] = useState('9.5');
  const [calcTarget, setCalcTarget] = useState('120');
  const [calcTotalOvers, setCalcTotalOvers] = useState('10');
  const [calcCurrentRuns, setCalcCurrentRuns] = useState('45');
  const [calcOversPlayed, setCalcOversPlayed] = useState('4.3');

  // ===== PLAYER POSITION STATE =====
  const [posTab, setPosTab] = useState<'batting' | 'fielding'>('batting');
  const [posTeamFilter, setPosTeamFilter] = useState<string>('ALL');

  // ===== STATISTICS STATE =====
  const [statsTourFilter, setStatsTourFilter] = useState<string>(
    state.activeTournamentId || ''
  );

  // ===== SETTING / ACCOUNT STATE =====
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const activeTournamentId =
    ptTournamentId || state.activeTournamentId || state.tournaments[0]?.id || '';
  const activeMatch = useMemo(
    () =>
      state.matches.find((m) => m.id === state.activeMatchId) ?? state.matches[0],
    [state.matches, state.activeMatchId]
  );

  const teamMap = useMemo(
    () => new Map(state.teams.map((t) => [t.id, t])),
    [state.teams]
  );

  // ================= 1. EDIT POINT TABLE =================
  if (route === 'point-table') {
    const groups = state.groups.filter(
      (g) => !activeTournamentId || g.tournamentId === activeTournamentId
    );
    const allRows = computePointTableRows(state, activeTournamentId || undefined);
    const filteredRows =
      ptGroupFilter === 'ALL'
        ? allRows
        : allRows.filter((r) => r.groupId === ptGroupFilter);

    const handleSavePtEdit = () => {
      if (!editingPtRow) return;
      const reason = ptReason.trim();
      if (!reason) {
        onToast('Please enter an audit reason for this manual points table edit.');
        return;
      }

      const nextEntry: PointTableEntry = {
        teamId: editingPtRow.teamId,
        tournamentId: editingPtRow.tournamentId,
        groupId: editingPtRow.groupId,
        played: Math.max(0, Number(editingPtRow.played) || 0),
        won: Math.max(0, Number(editingPtRow.won) || 0),
        lost: Math.max(0, Number(editingPtRow.lost) || 0),
        tied: Math.max(0, Number(editingPtRow.tied) || 0),
        nr: Math.max(0, Number(editingPtRow.nr) || 0),
        points: Number(editingPtRow.points) || 0,
        nrr: Number(Number(editingPtRow.nrr || 0).toFixed(3)),
      };

      const auditEntry: PointTableAuditEntry = {
        id: `pta_${Date.now()}`,
        timestamp: Date.now(),
        tournamentId: nextEntry.tournamentId,
        teamId: nextEntry.teamId,
        teamName: editingPtRow.teamName,
        actor: state.user.userName || state.uid,
        summary: `P:${nextEntry.played} W:${nextEntry.won} L:${nextEntry.lost} T:${nextEntry.tied} NR:${nextEntry.nr} Pts:${nextEntry.points} NRR:${nextEntry.nrr}`,
        reason,
      };

      updateState((prev) => ({
        ...prev,
        pointTableOverrides: [
          ...prev.pointTableOverrides.filter(
            (o) =>
              !(
                o.teamId === nextEntry.teamId &&
                o.tournamentId === nextEntry.tournamentId
              )
          ),
          nextEntry,
        ],
        pointTableAuditLog: [auditEntry, ...prev.pointTableAuditLog].slice(0, 50),
      }));

      setEditingPtRow(null);
      setPtReason('');
      onToast(`Points table updated for ${editingPtRow.teamName} (logged in audit history).`);
    };

    const handleResetOverrides = () => {
      updateState((prev) => ({
        ...prev,
        pointTableOverrides: prev.pointTableOverrides.filter(
          (o) => activeTournamentId && o.tournamentId !== activeTournamentId
        ),
        pointTableAuditLog: [
          {
            id: `pta_${Date.now()}`,
            timestamp: Date.now(),
            tournamentId: activeTournamentId,
            teamId: 'ALL',
            teamName: 'All Teams',
            actor: state.user.userName || state.uid,
            summary: 'Restored auto-calculated standings',
            reason: 'Manual overrides cleared',
          },
          ...prev.pointTableAuditLog,
        ].slice(0, 50),
      }));
      onToast('Manual overrides cleared — standings restored to auto-calculation.');
    };

    return (
      <div className="space-y-5">
        <div className="rounded-xl bg-white border border-slate-200 shadow-xs p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-[#FFF3E0] text-[#FF8C00] flex items-center justify-center">
              <Table2 className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-slate-900">
                Edit Point Table
              </h2>
              <p className="text-xs text-slate-500">
                Auto-calculated from completed matches with authorized manual overrides &amp; audit trail.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {state.tournaments.length > 0 && (
              <select
                value={activeTournamentId}
                onChange={(e) => {
                  setPtTournamentId(e.target.value);
                  setPtGroupFilter('ALL');
                }}
                className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
              >
                {state.tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}

            <select
              value={ptGroupFilter}
              onChange={(e) => setPtGroupFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
            >
              <option value="ALL">All Groups (Tournament-wise)</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>

            {state.pointTableOverrides.length > 0 && (
              <button
                type="button"
                onClick={handleResetOverrides}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Reset Auto</span>
              </button>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="wo-header text-white text-[11px] uppercase">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-3 py-3">Group</th>
                  <th className="px-3 py-3 text-right">P</th>
                  <th className="px-3 py-3 text-right">W</th>
                  <th className="px-3 py-3 text-right">L</th>
                  <th className="px-3 py-3 text-right">T</th>
                  <th className="px-3 py-3 text-right">NR</th>
                  <th className="px-3 py-3 text-right">NRR</th>
                  <th className="px-3 py-3 text-right">Pts</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-10 text-center text-slate-400">
                      No teams registered for this tournament yet. Add teams in the Team section.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => (
                    <tr key={row.teamId} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {row.teamName}{' '}
                        <span className="text-xs font-normal text-slate-500">
                          ({row.teamShort})
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-600">{row.groupName}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{row.played}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-emerald-700 font-semibold">
                        {row.won}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-red-600">
                        {row.lost}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{row.tied}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{row.nr}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-medium">
                        {row.nrr >= 0 ? `+${row.nrr.toFixed(3)}` : row.nrr.toFixed(3)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-black text-[#FF8C00]">
                        {row.points}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPtRow({ ...row });
                            setPtReason('');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md wo-btn-soft text-xs font-bold"
                        >
                          <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit History */}
        <div className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <History className="w-4 h-4 text-[#FF8C00]" aria-hidden="true" />
            <h3 className="font-display font-bold text-sm text-slate-900">
              Points Table Audit History
            </h3>
          </div>
          {state.pointTableAuditLog.length === 0 ? (
            <p className="px-4 py-6 text-xs text-slate-400 text-center">
              No manual edits have been recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {state.pointTableAuditLog.map((log) => (
                <div
                  key={log.id}
                  className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900">{log.teamName}</span>
                    <span className="text-slate-500"> · {log.summary}</span>
                    <p className="text-slate-600 mt-0.5">
                      Reason: <span className="font-medium text-slate-800">{log.reason}</span>
                    </p>
                  </div>
                  <div className="text-right text-[11px] text-slate-500">
                    <p className="font-semibold text-slate-700">{log.actor}</p>
                    <p>{new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Manual Override Modal */}
        {editingPtRow && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md rounded-xl bg-white border border-orange-200 shadow-2xl overflow-hidden">
              <div className="wo-header text-white px-4 py-3 flex items-center justify-between">
                <h3 className="font-display font-bold text-sm text-white tracking-wide">
                  Edit Standings — {editingPtRow.teamName}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingPtRow(null)}
                  className="p-1 rounded text-white/90 hover:text-white"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2.5">
                  {(
                    [
                      ['played', 'Played'],
                      ['won', 'Won'],
                      ['lost', 'Lost'],
                      ['tied', 'Tied'],
                      ['nr', 'No Result'],
                      ['points', 'Points'],
                    ] as const
                  ).map(([field, label]) => (
                    <div key={field}>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        {label}
                      </label>
                      <input
                        type="number"
                        value={editingPtRow[field]}
                        onChange={(e) =>
                          setEditingPtRow({
                            ...editingPtRow,
                            [field]: Number(e.target.value),
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Net Run Rate (NRR)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={editingPtRow.nrr}
                    onChange={(e) =>
                      setEditingPtRow({
                        ...editingPtRow,
                        nrr: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Audit Reason (Required) *
                  </label>
                  <input
                    type="text"
                    value={ptReason}
                    onChange={(e) => setPtReason(e.target.value)}
                    placeholder="e.g., Rain-affected match washout adjustment"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingPtRow(null)}
                    className="px-4 py-2 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePtEdit}
                    className="px-4 py-2 rounded-lg wo-btn-primary text-xs font-extrabold uppercase tracking-wider"
                  >
                    Save Override
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ================= 2. RUNRATE PREDICTOR =================
  if (route === 'runrate') {
    const inn = activeMatch ? activeMatch.innings[activeMatch.currentInningsIndex] : null;
    const batTeam = inn ? teamMap.get(inn.battingTeamId) : undefined;
    const crrNum = inn && inn.legalBalls > 0 ? (inn.runs * 6) / inn.legalBalls : 0;
    const remBalls = inn ? Math.max(0, inn.maxOvers * 6 - inn.legalBalls) : 0;
    const target =
      activeMatch && activeMatch.currentInningsIndex === 1
        ? inn?.target ?? activeMatch.innings[0].runs + 1
        : null;
    const needRuns = target !== null && inn ? Math.max(0, target - inn.runs) : null;
    const rrrNum =
      needRuns !== null && remBalls > 0 ? (needRuns * 6) / remBalls : 0;

    // Interactive Win Target Calculator
    const parseOversToBalls = (val: string) => {
      const num = Number(val) || 0;
      const whole = Math.floor(num);
      const frac = Math.round((num - whole) * 10);
      return whole * 6 + Math.min(5, Math.max(0, frac));
    };
    const tGoal = Math.max(1, Number(calcTarget) || 0);
    const tTotalBalls = Math.max(6, Math.floor((Number(calcTotalOvers) || 1) * 6));
    const tCurRuns = Math.max(0, Number(calcCurrentRuns) || 0);
    const tBowledBalls = Math.min(tTotalBalls, parseOversToBalls(calcOversPlayed));
    const tRemBalls = Math.max(0, tTotalBalls - tBowledBalls);
    const tNeed = Math.max(0, tGoal - tCurRuns);
    const tReqRr = tRemBalls > 0 ? ((tNeed * 6) / tRemBalls).toFixed(2) : '0.00';
    const tRunsPerBall = tRemBalls > 0 ? (tNeed / tRemBalls).toFixed(2) : '0.00';

    return (
      <div className="space-y-5">
        <div className="rounded-xl bg-white border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-[#FFF3E0] text-[#FF8C00] flex items-center justify-center">
              <Calculator className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-slate-900">
                Live Runrate Predictor
              </h2>
              <p className="text-xs text-slate-500">
                {activeMatch
                  ? `${activeMatch.matchLabel} · ${batTeam?.name || 'Batting Team'} (${inn?.runs}/${inn?.wickets} in ${formatOvers(inn?.legalBalls ?? 0)} ov)`
                  : 'Create and start a match to view live match projections, or use the Win Target Calculator below.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Current RR', value: crrNum.toFixed(2) },
              {
                label: 'Required RR',
                value: target !== null ? rrrNum.toFixed(2) : '--',
              },
              {
                label: 'Projected @ CRR',
                value: inn ? String(Math.round(inn.runs + (remBalls / 6) * crrNum)) : '0',
              },
              { label: 'Target', value: target !== null ? String(target) : '--' },
              {
                label: 'Runs Required',
                value: needRuns !== null ? String(needRuns) : '--',
              },
              { label: 'Balls Remaining', value: String(remBalls) },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-center"
              >
                <p className="text-[11px] font-bold uppercase text-slate-500">
                  {kpi.label}
                </p>
                <p className="font-display font-black text-2xl text-[#FF8C00] mt-1 tabular-nums">
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>

          {inn && (
            <div className="pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Projected Final Score by Run Rate
                </h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-semibold">Custom RPO:</span>
                  <input
                    type="number"
                    step="0.5"
                    value={customRpo}
                    onChange={(e) => setCustomRpo(e.target.value)}
                    className="w-20 px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {[6, 8, 10, 12, Number(customRpo) || 9.5].map((rpo, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-[#FFF3E0] border border-[#FF8C00]/30 p-3 text-center"
                  >
                    <p className="text-[11px] font-bold text-[#FF8C00]">
                      @ {rpo.toFixed(1)} RPO
                    </p>
                    <p className="font-display font-black text-xl text-slate-900 mt-0.5 tabular-nums">
                      {Math.round(inn.runs + (remBalls / 6) * rpo)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Interactive Win Target Calculator */}
        <div className="rounded-xl bg-white border border-slate-200 shadow-xs p-5 space-y-4">
          <h3 className="font-display font-bold text-base text-slate-900">
            Win Target Calculator
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Target Runs
              </label>
              <input
                type="number"
                min={1}
                value={calcTarget}
                onChange={(e) => setCalcTarget(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Total Match Overs
              </label>
              <input
                type="number"
                min={1}
                value={calcTotalOvers}
                onChange={(e) => setCalcTotalOvers(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Current Runs
              </label>
              <input
                type="number"
                min={0}
                value={calcCurrentRuns}
                onChange={(e) => setCalcCurrentRuns(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Overs Completed (e.g. 4.3)
              </label>
              <input
                type="text"
                value={calcOversPlayed}
                onChange={(e) => setCalcOversPlayed(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-[11px] font-bold text-slate-500">RUNS NEEDED</p>
              <p className="text-xl font-black text-red-600 tabular-nums">{tNeed}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-[11px] font-bold text-slate-500">BALLS LEFT</p>
              <p className="text-xl font-black text-slate-900 tabular-nums">{tRemBalls}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-[11px] font-bold text-slate-500">REQUIRED RUN RATE</p>
              <p className="text-xl font-black text-[#FF8C00] tabular-nums">{tReqRr}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-[11px] font-bold text-slate-500">RUNS / BALL</p>
              <p className="text-xl font-black text-emerald-700 tabular-nums">
                {tRunsPerBall}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ================= 3. PLAYER POSITION =================
  if (route === 'player-position') {
    const positionRows = computePlayerBattingPositions(
      state,
      state.activeTournamentId || undefined
    ).filter((row) => posTeamFilter === 'ALL' || row.teamId === posTeamFilter);

    const allPlayers = state.teams.flatMap((t) =>
      t.players.map((p) => ({ ...p, teamShort: t.shortName }))
    );

    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-white border border-slate-200 shadow-xs p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-[#FFF3E0] text-[#FF8C00] flex items-center justify-center">
              <Crosshair className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-slate-900">
                Player Position
              </h2>
              <p className="text-xs text-slate-500">
                Auto-generated batting position performance table and live fielding chart.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPosTab('batting')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold ${
                posTab === 'batting'
                  ? 'wo-btn-active text-white'
                  : 'wo-btn-secondary'
              }`}
            >
              Batting Positions
            </button>
            <button
              type="button"
              onClick={() => setPosTab('fielding')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold ${
                posTab === 'fielding'
                  ? 'wo-btn-active text-white'
                  : 'wo-btn-secondary'
              }`}
            >
              Fielding Chart
            </button>
          </div>
        </div>

        {posTab === 'batting' ? (
          <div className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700">
                Auto-Generated from Saved Match Scorecards
              </span>
              <select
                value={posTeamFilter}
                onChange={(e) => setPosTeamFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
              >
                <option value="ALL">All Teams</option>
                {state.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="wo-header text-white text-[11px] uppercase">
                  <tr>
                    <th className="px-4 py-3">Team</th>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-3 py-3 text-center">Batting Position</th>
                    <th className="px-3 py-3 text-right">Innings</th>
                    <th className="px-3 py-3 text-right">Runs</th>
                    <th className="px-3 py-3 text-right">Balls</th>
                    <th className="px-3 py-3 text-right">Average</th>
                    <th className="px-4 py-3 text-right">Strike Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {positionRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                        No batting data recorded yet. Score deliveries in the Scoring Dashboard to populate batting positions automatically.
                      </td>
                    </tr>
                  ) : (
                    positionRows.map((row) => (
                      <tr key={row.key} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-600 font-medium">
                          {row.teamName}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {row.playerName}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="px-2.5 py-0.5 rounded bg-[#FFF3E0] text-[#FF8C00] font-bold text-xs">
                            #{row.battingPosition}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">{row.innings}</td>
                        <td className="px-3 py-3 text-right font-bold text-slate-900 tabular-nums">
                          {row.runs}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">{row.balls}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{row.average}</td>
                        <td className="px-4 py-3 text-right font-semibold text-[#FF8C00] tabular-nums">
                          {row.strikeRate}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl bg-white border border-slate-200 shadow-xs p-5 flex flex-col items-center justify-center">
              <svg viewBox="0 0 260 220" className="w-full max-w-sm">
                <ellipse
                  cx="130"
                  cy="110"
                  rx="118"
                  ry="100"
                  fill="#15803D"
                  stroke="#0F172A"
                  strokeWidth="2"
                />
                <circle
                  cx="130"
                  cy="110"
                  r="52"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeDasharray="4 4"
                  opacity="0.7"
                />
                <rect x="125" y="92" width="10" height="36" rx="2" fill="#E5C07B" />
                {state.fieldPositions.map((spot) => (
                  <g key={spot.id}>
                    <circle
                      cx={spot.x * 2.6}
                      cy={spot.y * 2.2}
                      r="5.5"
                      fill="#FACC15"
                      stroke="#0F172A"
                      strokeWidth="1.5"
                    />
                    <text
                      x={spot.x * 2.6}
                      y={spot.y * 2.2 - 8}
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

            <div className="rounded-xl bg-white border border-slate-200 shadow-xs p-4 space-y-2.5">
              <h3 className="font-display font-bold text-sm text-slate-900">
                Assign Fielders (Syncs to Overlay)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto pr-1">
                {state.fieldPositions.map((spot) => (
                  <div
                    key={spot.id}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1"
                  >
                    <label className="block text-[11px] font-bold text-[#FF8C00]">
                      {spot.label}
                    </label>
                    <select
                      value={spot.playerId || ''}
                      onChange={(e) => {
                        const val = e.target.value || null;
                        updateState((prev) => ({
                          ...prev,
                          fieldPositions: prev.fieldPositions.map((fp) =>
                            fp.id === spot.id ? { ...fp, playerId: val } : fp
                          ),
                        }));
                      }}
                      className="w-full px-2 py-1.5 rounded border border-slate-300 text-xs bg-white"
                    >
                      <option value="">-- Unassigned --</option>
                      {allPlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.teamShort})
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ================= 4. THEME SETUP (BROADCAST SCOREBOARD THEMES) =================
  if (route === 'theme') {
    const customColors = state.user.customThemeColors;
    const activePalette = getThemePalette(state.user.userTheme, customColors);

    const handleSelectTheme = (themeId: OverlayThemeId, themeName: string) => {
      updateState((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          userTheme: themeId,
          customThemeColors: {
            ...prev.user.customThemeColors,
            enabled: false,
          },
        },
        overlay: {
          ...prev.overlay,
          bottomScoreMode:
            prev.overlay.bottomScoreMode === 'EMPTY'
              ? 'Score'
              : prev.overlay.bottomScoreMode,
        },
      }));
      onToast(`Theme active: ${themeName} (live on OBS / vMix overlay).`);
    };

    const previewZeroBalls = [
      { id: 'wc-b1', label: '0', isBoundary4: false, isBoundary6: false, isWicket: false, isExtra: false },
      { id: 'wc-b2', label: '0', isBoundary4: false, isBoundary6: false, isWicket: false, isExtra: false },
      { id: 'wc-b3', label: '0', isBoundary4: false, isBoundary6: false, isWicket: false, isExtra: false },
      { id: 'wc-b4', label: '0', isBoundary4: false, isBoundary6: false, isWicket: false, isExtra: false },
      { id: 'wc-b5', label: '0', isBoundary4: false, isBoundary6: false, isWicket: false, isExtra: false },
      { id: 'wc-b6', label: '0', isBoundary4: false, isBoundary6: false, isWicket: false, isExtra: false },
    ];

    return (
      <div className="space-y-5">
        <div className="rounded-xl bg-white border border-slate-200 shadow-xs p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-[#FFF3E0] text-[#FF8C00] flex items-center justify-center">
              <Palette className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-slate-900">
                Broadcast Theme Setup
              </h2>
              <p className="text-xs text-slate-500">
                Choose a live broadcast scoreboard theme. Updates OBS &amp; vMix overlay instantly.
              </p>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-lg bg-[#FFF3E0] border border-[#FF8C00]/30 text-xs font-bold text-[#FF8C00]">
            Active: {activePalette.name}
            {customColors.enabled ? ' (Custom Colors)' : ''}
          </span>
        </div>

        {/* Official Broadcast Scoreboard Themes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-sm text-slate-900 uppercase tracking-wide">
              Official Scoreboard Themes ({BROADCAST_THEMES.length})
            </h3>
            <span className="text-[11px] font-semibold text-slate-500">
              Instant Live OBS &amp; vMix Sync
            </span>
          </div>

          {BROADCAST_THEMES.map((theme) => {
            const isSelected = state.user.userTheme === theme.id && !customColors.enabled;
            const isWorldCup = theme.id === 'worldcup';

            return (
              <div
                key={theme.id}
                className={`rounded-xl bg-white border-2 shadow-xs overflow-hidden flex flex-col transition-all ${
                  isSelected
                    ? 'border-[#FF8C00] ring-2 ring-[#FF8C00]/25'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Theme Preview Stage */}
                <div
                  className="p-3.5 sm:p-4 space-y-2.5"
                  style={{
                    background: isWorldCup
                      ? 'linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 55%, #CBD5E1 100%)'
                      : 'linear-gradient(135deg, #06174B 0%, #0A2A85 55%, #06143D 100%)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`font-display font-black text-xs sm:text-sm tracking-wide ${
                        isWorldCup ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      ★ {theme.name}
                    </span>
                    {isSelected && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider">
                        Active Live
                      </span>
                    )}
                  </div>

                  {isWorldCup ? (
                    <WorldCupScoreboardBar
                      batTeamCode="IND"
                      bowlTeamCode="AUS"
                      runs={0}
                      wickets={0}
                      oversText="0.0"
                      batter1Name="PAPYA"
                      batter1Runs={0}
                      batter1Balls={0}
                      batter2Name="SURAJ"
                      batter2Runs={0}
                      batter2Balls={0}
                      strikerIndex={1}
                      bowlerName="CRUSHYY"
                      bowlerFigs="0/0"
                      bowlerOvers="0.0"
                      balls={previewZeroBalls}
                      showBalls
                      rateLabel="RUN RATE"
                      rateValue="0.00"
                      tickerText="LIVE SCORE WORLD CUP"
                      compact
                    />
                  ) : (
                    <TataIplScoreboardBar
                      batTeamCode="GT"
                      bowlTeamCode="RR"
                      scoreText="0-0"
                      oversText="0.0"
                      batter1Name="PAPYA"
                      batter1Runs={0}
                      batter1Balls={0}
                      batter2Name="SURAJ"
                      batter2Runs={0}
                      batter2Balls={0}
                      strikerIndex={1}
                      bowlerName="CRUSHYY"
                      bowlerFigs="0-0"
                      bowlerOvers="0.0"
                      targetText="CRR 0.00"
                      matchTitle="TATA IPL 2022 - THE FINAL"
                      compact
                    />
                  )}
                </div>

                {/* Card Footer */}
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-white">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-600 truncate">{theme.subtitle}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectTheme(theme.id, theme.name)}
                    className={`px-4 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-1.5 shrink-0 ${
                      isSelected ? 'bg-emerald-600 text-white' : 'wo-btn-primary'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                    <span>{isSelected ? 'SELECTED THEME' : 'SELECT THEME'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Theme Color Selection */}
        <div className="rounded-xl bg-white border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display font-bold text-sm text-slate-900">
                Custom Theme Color Selection
              </h3>
              <p className="text-xs text-slate-500">
                Override primary, secondary, and accent colors for your own tournament branding.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={customColors.enabled}
                onChange={(e) => {
                  updateState((prev) => ({
                    ...prev,
                    user: {
                      ...prev.user,
                      customThemeColors: {
                        ...prev.user.customThemeColors,
                        enabled: e.target.checked,
                      },
                    },
                  }));
                  onToast(
                    e.target.checked
                      ? 'Custom theme colors enabled on overlay.'
                      : 'Switched back to preset theme colors.'
                  );
                }}
                className="w-4 h-4 accent-[#FF8C00]"
              />
              <span>Enable Custom Colors</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(
              [
                ['primary', 'Primary Bar Color'],
                ['secondary', 'Secondary Gradient Color'],
                ['accent', 'Accent / Highlight Color'],
              ] as const
            ).map(([field, label]) => (
              <div
                key={field}
                className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800">{label}</p>
                  <p className="text-[11px] font-mono text-slate-500 uppercase">
                    {customColors[field]}
                  </p>
                </div>
                <input
                  type="color"
                  value={customColors[field]}
                  onChange={(e) =>
                    updateState((prev) => ({
                      ...prev,
                      user: {
                        ...prev.user,
                        customThemeColors: {
                          ...prev.user.customThemeColors,
                          enabled: true,
                          [field]: e.target.value,
                        },
                      },
                    }))
                  }
                  className="w-10 h-10 rounded cursor-pointer border border-slate-300"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ================= 5. STATISTICS (9 REAL-DATA CATEGORIES) =================
  if (route === 'statistics') {
    const stats = computeTournamentStats(state, statsTourFilter || undefined);

    const topRuns = [...stats].sort((a, b) => b.runs - a.runs)[0];
    const topWickets = [...stats].sort((a, b) => b.wickets - a.wickets)[0];
    const highestScore = [...stats].sort((a, b) => b.highestScore - a.highestScore)[0];
    const bestBowling = [...stats]
      .filter((s) => s.oversBowledBalls > 0)
      .sort(
        (a, b) =>
          b.bestBowlingWkts - a.bestBowlingWkts ||
          a.bestBowlingRuns - b.bestBowlingRuns
      )[0];
    const mostSixes = [...stats].sort((a, b) => b.sixes - a.sixes)[0];
    const mostFours = [...stats].sort((a, b) => b.fours - a.fours)[0];
    const bestSr = [...stats]
      .filter((s) => s.ballsFaced > 0)
      .sort(
        (a, b) =>
          b.runs / Math.max(1, b.ballsFaced) -
          a.runs / Math.max(1, a.ballsFaced)
      )[0];
    const bestEco = [...stats]
      .filter((s) => s.oversBowledBalls > 0)
      .sort(
        (a, b) =>
          a.runsConceded / Math.max(1, a.oversBowledBalls) -
          b.runsConceded / Math.max(1, b.oversBowledBalls)
      )[0];
    const topPom = [...stats]
      .filter((s) => s.pomCount > 0)
      .sort((a, b) => b.pomCount - a.pomCount)[0];

    const leaderCards = [
      {
        title: 'Highest Run Scorer',
        player: topRuns?.playerName,
        team: topRuns?.teamShort,
        metric: topRuns ? `${topRuns.runs} Runs` : '--',
      },
      {
        title: 'Highest Wicket Taker',
        player: topWickets?.playerName,
        team: topWickets?.teamShort,
        metric: topWickets ? `${topWickets.wickets} Wkts` : '--',
      },
      {
        title: 'Highest Individual Score',
        player: highestScore?.playerName,
        team: highestScore?.teamShort,
        metric: highestScore ? `${highestScore.highestScore}` : '--',
      },
      {
        title: 'Best Bowling Figures',
        player: bestBowling?.playerName,
        team: bestBowling?.teamShort,
        metric: bestBowling
          ? `${bestBowling.bestBowlingWkts}/${bestBowling.bestBowlingRuns}`
          : '--',
      },
      {
        title: 'Most Sixes',
        player: mostSixes?.playerName,
        team: mostSixes?.teamShort,
        metric: mostSixes ? `${mostSixes.sixes} Sixes` : '--',
      },
      {
        title: 'Most Fours',
        player: mostFours?.playerName,
        team: mostFours?.teamShort,
        metric: mostFours ? `${mostFours.fours} Fours` : '--',
      },
      {
        title: 'Best Strike Rate',
        player: bestSr?.playerName,
        team: bestSr?.teamShort,
        metric: bestSr ? calcStrikeRate(bestSr.runs, bestSr.ballsFaced) : '--',
      },
      {
        title: 'Best Economy',
        player: bestEco?.playerName,
        team: bestEco?.teamShort,
        metric: bestEco
          ? calcRunRate(bestEco.runsConceded, bestEco.oversBowledBalls)
          : '--',
      },
      {
        title: 'Player of the Match',
        player: topPom?.playerName,
        team: topPom?.teamShort,
        metric: topPom ? `${topPom.pomCount} Award(s)` : '--',
      },
    ];

    return (
      <div className="space-y-5">
        <div className="rounded-xl bg-white border border-slate-200 shadow-xs p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-[#FFF3E0] text-[#FF8C00] flex items-center justify-center">
              <BarChart3 className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-slate-900">
                Tournament Statistics
              </h2>
              <p className="text-xs text-slate-500">
                100% calculated from real recorded match deliveries — zero dummy stats.
              </p>
            </div>
          </div>

          <select
            value={statsTourFilter}
            onChange={(e) => setStatsTourFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
          >
            <option value="">All Tournaments</option>
            {state.tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* 9 Leader Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {leaderCards.map((c) => (
            <div
              key={c.title}
              className="rounded-xl bg-white border border-slate-200 shadow-xs p-4 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {c.title}
                </p>
                <p className="font-display font-bold text-base text-slate-900 truncate mt-1">
                  {c.player || 'No data yet'}
                </p>
                {c.team && (
                  <p className="text-xs text-slate-500">{c.team}</p>
                )}
              </div>
              <div className="px-3 py-2 rounded-lg bg-[#FFF3E0] text-[#FF8C00] font-display font-black text-base shrink-0 tabular-nums">
                {c.metric}
              </div>
            </div>
          ))}
        </div>

        {/* Complete Player Stats Table */}
        <div className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <Award className="w-4 h-4 text-[#FF8C00]" aria-hidden="true" />
            <h3 className="font-display font-bold text-sm text-slate-900">
              Complete Player Leaderboard
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="wo-header text-white text-[11px] uppercase">
                <tr>
                  <th className="px-4 py-2.5">Player</th>
                  <th className="px-3 py-2.5">Team</th>
                  <th className="px-3 py-2.5 text-right">M</th>
                  <th className="px-3 py-2.5 text-right">Runs</th>
                  <th className="px-3 py-2.5 text-right">HS</th>
                  <th className="px-3 py-2.5 text-right">SR</th>
                  <th className="px-3 py-2.5 text-right">4s/6s</th>
                  <th className="px-3 py-2.5 text-right">Wkts</th>
                  <th className="px-3 py-2.5 text-right">Best</th>
                  <th className="px-3 py-2.5 text-right">Eco</th>
                  <th className="px-4 py-2.5 text-right">POM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-10 text-center text-slate-400">
                      No match statistics recorded yet. Score a match to see real tournament statistics here.
                    </td>
                  </tr>
                ) : (
                  [...stats]
                    .sort((a, b) => b.mvpPoints - a.mvpPoints)
                    .map((s) => (
                      <tr key={s.playerId} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-bold text-slate-900">
                          {s.playerName}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">{s.teamShort}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{s.matches}</td>
                        <td className="px-3 py-2.5 text-right font-bold tabular-nums">
                          {s.runs}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {s.highestScore}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {calcStrikeRate(s.runs, s.ballsFaced)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {s.fours}/{s.sixes}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-red-600 tabular-nums">
                          {s.wickets}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {s.oversBowledBalls > 0
                            ? `${s.bestBowlingWkts}/${s.bestBowlingRuns}`
                            : '--'}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {s.oversBowledBalls > 0
                            ? calcRunRate(s.runsConceded, s.oversBowledBalls)
                            : '--'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-[#FF8C00] tabular-nums">
                          {s.pomCount}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ================= 6. SETTING =================
  if (route === 'setting') {
    const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 1_500_000) {
        onToast('Please select a logo image smaller than 1.5 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          updateState((prev) => ({
            ...prev,
            user: { ...prev.user, channelLogoUrl: reader.result as string },
          }));
          onToast('Channel logo updated!');
        }
      };
      reader.readAsDataURL(file);
    };

    return (
      <div className="max-w-3xl space-y-5">
        <div className="rounded-xl bg-white border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-[#FFF3E0] text-[#FF8C00] flex items-center justify-center">
              <Settings className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-slate-900">
                Broadcast &amp; Workspace Settings
              </h2>
              <p className="text-xs text-slate-500">
                Configure channel branding, logo, watermark, and default match overs.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Channel / Brand Title
              </label>
              <input
                type="text"
                value={state.user.channelTitle}
                onChange={(e) =>
                  updateState((prev) => ({
                    ...prev,
                    user: { ...prev.user, channelTitle: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Overlay Watermark Text
              </label>
              <input
                type="text"
                value={state.user.watermarkText}
                onChange={(e) =>
                  updateState((prev) => ({
                    ...prev,
                    user: { ...prev.user, watermarkText: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Default Overs per Innings
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={state.user.defaultOvers}
                onChange={(e) =>
                  updateState((prev) => ({
                    ...prev,
                    user: {
                      ...prev.user,
                      defaultOvers: Math.max(1, Number(e.target.value) || 6),
                    },
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Channel Logo Image
              </label>
              <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#FFF3E0] hover:bg-orange-100 border border-[#FF8C00]/30 text-[#FF8C00] text-xs font-bold cursor-pointer">
                <Upload className="w-4 h-4" aria-hidden="true" />
                <span>Upload Logo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => onToast('Settings saved and synced to overlay.')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg wo-btn-primary text-xs font-extrabold uppercase tracking-wider"
            >
              <Save className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>

        {/* Reset Workspace */}
        <div className="rounded-xl bg-white border border-red-200 shadow-xs p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold text-sm text-red-700">
              Reset Workspace Data
            </h3>
            <p className="text-xs text-slate-500">
              Clears all tournaments, teams, players, and matches in this workspace back to blank state.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmResetOpen(true)}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
          >
            Reset All Data
          </button>
        </div>

        {confirmResetOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-sm rounded-xl bg-white border border-slate-200 p-5 space-y-4 shadow-2xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900">
                    Reset Entire Workspace?
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    This removes all tournaments, groups, teams, players, and matches for{' '}
                    <span className="font-mono font-bold">{state.uid}</span>.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmResetOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmResetOpen(false);
                    onResetDemoData();
                  }}
                  className="px-4 py-2 rounded-lg bg-red-600 text-xs font-bold text-white"
                >
                  Yes, Reset All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ================= 7. USER ACCOUNT =================
  return (
    <div className="max-w-3xl rounded-xl bg-white border border-slate-200 shadow-xs p-5 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl wo-header text-white flex items-center justify-center">
          <UserCircle className="w-7 h-7" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-display font-bold text-base text-slate-900">
            User Account Profile
          </h2>
          <p className="text-xs text-slate-500">
            Workspace UID: <span className="font-mono font-bold text-slate-800">{state.uid}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Operator Name
          </label>
          <input
            type="text"
            value={state.user.userName}
            onChange={(e) =>
              updateState((prev) => ({
                ...prev,
                user: { ...prev.user, userName: e.target.value },
              }))
            }
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={state.user.userEmail}
            onChange={(e) =>
              updateState((prev) => ({
                ...prev,
                user: { ...prev.user, userEmail: e.target.value },
              }))
            }
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Mobile Number
          </label>
          <input
            type="text"
            value={state.user.userMobile}
            onChange={(e) =>
              updateState((prev) => ({
                ...prev,
                user: { ...prev.user, userMobile: e.target.value },
              }))
            }
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Active Plan
          </label>
          <input
            type="text"
            readOnly
            value={state.user.planName}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-slate-500">Subscription Start</p>
          <p className="font-bold text-slate-900 mt-0.5">
            {state.user.subscriptionStartDate}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-slate-500">Subscription End</p>
          <p className="font-bold text-slate-900 mt-0.5">
            {state.user.subscriptionEndDate}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-slate-500">Balance Tournaments</p>
          <p className="font-bold text-[#FF8C00] mt-0.5">
            {state.user.balanceTournaments}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onToast('Account details saved.')}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg wo-btn-primary text-xs font-extrabold uppercase tracking-wider"
      >
        <Save className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Save Profile</span>
      </button>
    </div>
  );
}
