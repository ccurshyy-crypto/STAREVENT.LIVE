import { FormEvent, useMemo, useState } from 'react';
import {
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Lock,
  Monitor,
  ShieldCheck,
  Sparkles,
  Trash2,
  Tv,
} from 'lucide-react';
import {
  BATSMAN_STATS_MODES,
  BOTTOM_SCORE_MODES,
  BOWLER_STATS_MODES,
  CricketSuiteState,
  HIGHLIGHT_MODES,
  MainOverlayCard,
  MATCH_STATS_MODES,
  TOURNAMENT_STAT_MODES,
  TRANSITION_OVERLAYS,
  TransitionOverlayType,
} from '../../types/cricketSuite';
import { BroadcastOverlayCanvas } from './BroadcastOverlayCanvas';

interface TvOverlayControllerViewProps {
  state: CricketSuiteState;
  overlayUrl: string;
  updateState: (updater: (prev: CricketSuiteState) => CricketSuiteState) => void;
  onCopyOverlayUrl: () => void;
  onGoToGroups: () => void;
  onToast: (msg: string) => void;
  authToken: string | null;
  authorizedUser: string;
  onAuthSuccess: (token: string, userLabel: string) => void;
  onLockControl: () => void;
}

export function TvOverlayControllerView({
  state,
  overlayUrl,
  updateState,
  onCopyOverlayUrl,
  onGoToGroups,
  onToast,
  authToken,
  authorizedUser,
  onAuthSuccess,
  onLockControl,
}: TvOverlayControllerViewProps) {
  // Login Gate Form State
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Controller UI State
  const [showPreviewMonitor, setShowPreviewMonitor] = useState(true);
  const [previewGreenBg, setPreviewGreenBg] = useState(false);

  const activeMatch = useMemo(
    () =>
      state.matches.find((m) => m.id === state.activeMatchId) ?? state.matches[0],
    [state.matches, state.activeMatchId]
  );

  const teamMap = useMemo(
    () => new Map(state.teams.map((t) => [t.id, t])),
    [state.teams]
  );

  const activeTourGroups = useMemo(
    () =>
      state.groups.filter(
        (g) =>
          !activeMatch?.tournamentId ||
          g.tournamentId === activeMatch.tournamentId
      ),
    [state.groups, activeMatch?.tournamentId]
  );

  const allMatchBatters = useMemo(() => {
    if (!activeMatch) return [];
    const inn = activeMatch.innings[activeMatch.currentInningsIndex];
    const batTeam = teamMap.get(inn.battingTeamId);
    return batTeam?.players ?? [];
  }, [activeMatch, teamMap]);

  const allMatchBowlers = useMemo(() => {
    if (!activeMatch) return [];
    const inn = activeMatch.innings[activeMatch.currentInningsIndex];
    const bowlTeam = teamMap.get(inn.bowlingTeamId);
    return bowlTeam?.players ?? [];
  }, [activeMatch, teamMap]);

  const allMatchPlayers = useMemo(() => {
    if (!activeMatch) return [];
    const t1 = teamMap.get(activeMatch.team1Id)?.players ?? [];
    const t2 = teamMap.get(activeMatch.team2Id)?.players ?? [];
    return [...t1, ...t2];
  }, [activeMatch, teamMap]);

  const selectedTeamForStats = useMemo(
    () =>
      state.teams.find((t) => t.id === state.overlay.selectedTeamForStatsId) ??
      state.teams[0],
    [state.teams, state.overlay.selectedTeamForStatsId]
  );

  const handleOverlayLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const cleanId = loginId.trim();
    if (!cleanId || !password.trim()) {
      setLoginError('Please enter both Login ID and Password.');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await fetch('/api/overlay-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId: cleanId, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.token) {
        setLoginError(data?.error || 'Invalid Login ID or Password.');
        return;
      }
      setPassword('');
      onAuthSuccess(data.token, data.label || data.loginId || cleanId);
    } catch {
      setLoginError('Unable to verify credentials. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  // ================= PROTECTED LOGIN GATE =================
  if (!authToken) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-6 px-3">
        <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-lg overflow-hidden">
          <div className="bg-[#FF8C00] px-6 py-6 text-center text-white space-y-2">
            <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center mx-auto">
              <Tv className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-orange-100">
              DBN MEDIA · STAR EVENT LIVE
            </p>
            <h2 className="font-display font-black text-xl tracking-wide">
              SCOREBOARD OVERLAY CONTROL
            </h2>
          </div>

          <form onSubmit={handleOverlayLoginSubmit} className="p-6 space-y-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
              <span>Authorized Access Only — Sign in with your Overlay Controller credentials.</span>
            </div>

            {loginError && (
              <div
                role="alert"
                className="px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold"
              >
                {loginError}
              </div>
            )}

            <div>
              <label
                htmlFor="overlay-login-id"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5"
              >
                Login ID
              </label>
              <input
                id="overlay-login-id"
                type="text"
                autoComplete="username"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="Enter Overlay Login ID"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#FF8C00]"
              />
            </div>

            <div>
              <label
                htmlFor="overlay-login-password"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="overlay-login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#FF8C00]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 rounded-lg bg-[#FF8C00] hover:bg-[#E87500] disabled:opacity-60 text-white font-display font-bold text-sm tracking-wider shadow-xs transition-colors"
            >
              {loginLoading ? 'VERIFYING...' : 'LOGIN'}
            </button>

            <p className="text-[11px] text-center text-slate-500 pt-1">
              Note: Public vMix browser source links continue running live without requiring login.
            </p>
          </form>
        </div>
      </div>
    );
  }

  // ================= AUTHENTICATED OVERLAY CONTROL PANEL =================
  const { overlay } = state;

  const setMainCard = (card: MainOverlayCard, toastLabel?: string) => {
    updateState((prev) => ({
      ...prev,
      overlay: {
        ...prev.overlay,
        mainCard: card,
      },
    }));
    if (toastLabel) onToast(`Overlay live: ${toastLabel}`);
  };

  const toggleMainCard = (
    card: MainOverlayCard,
    isActive: boolean,
    label: string
  ) => {
    if (isActive) {
      setMainCard({ kind: 'NONE' }, 'Card cleared');
    } else {
      setMainCard(card, label);
    }
  };

  const triggerTransition = (type: TransitionOverlayType) => {
    updateState((prev) => ({
      ...prev,
      overlay: {
        ...prev.overlay,
        activeTransition: {
          type,
          id: Date.now(),
        },
      },
    }));
    onToast(`Transition fired: ${type}`);
  };

  const handleClearOverlay = () => {
    updateState((prev) => ({
      ...prev,
      overlay: {
        ...prev.overlay,
        bottomScoreMode: 'EMPTY',
        mainCard: { kind: 'NONE' },
        activeTransition: null,
      },
    }));
    onToast('Broadcast screen cleared (100% transparent).');
  };

  const chipBtn = (active: boolean) =>
    `px-3 py-2 rounded-lg text-xs font-bold border transition-colors text-center ${
      active
        ? 'bg-[#FF8C00] text-white border-[#FF8C00] shadow-xs'
        : 'bg-white text-slate-700 border-slate-200 hover:border-[#FF8C00] hover:text-[#FF8C00] hover:bg-[#FFF3E0]'
    }`;

  return (
    <div className="space-y-4">
      {/* Top Bar: VMix Link, Toggles, Match Switcher, Lock */}
      <div className="rounded-xl bg-white border border-slate-200 shadow-xs p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                AUTHORIZED: {authorizedUser || 'CONTROLLER'}
              </span>
              <span className="text-xs text-slate-500">
                Real-time vMix / OBS Control Panel
              </span>
            </div>
            <h2 className="font-display font-bold text-base text-slate-900 mt-0.5">
              Scoreboard Overlay Control
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {state.matches.length > 0 && (
              <select
                value={activeMatch?.id || ''}
                onChange={(e) =>
                  updateState((prev) => ({ ...prev, activeMatchId: e.target.value }))
                }
                aria-label="Select match for overlay"
                className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold bg-white text-slate-800"
              >
                {state.matches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.matchLabel}: {teamMap.get(m.team1Id)?.shortName || 'T1'} vs{' '}
                    {teamMap.get(m.team2Id)?.shortName || 'T2'}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => setShowPreviewMonitor((p) => !p)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
            >
              <Monitor className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{showPreviewMonitor ? 'Hide Monitor' : 'Live Monitor'}</span>
            </button>

            <button
              type="button"
              onClick={handleClearOverlay}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Clear Screen</span>
            </button>

            <button
              type="button"
              onClick={onLockControl}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold"
            >
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Lock</span>
            </button>
          </div>
        </div>

        {/* VMix Public Link Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF8C00] px-2 shrink-0">
            VMix Link (Public)
          </span>
          <input
            type="text"
            readOnly
            value={overlayUrl}
            aria-label="Public vMix Browser Source URL"
            className="flex-1 bg-white px-3 py-1.5 rounded border border-slate-200 text-xs font-mono text-slate-800"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCopyOverlayUrl}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#FF8C00] hover:bg-[#E87500] text-white text-xs font-bold"
            >
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Copy Link</span>
            </button>
            <a
              href={overlayUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold"
            >
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Open</span>
            </a>
          </div>
        </div>

        {/* Visibility Toggles */}
        <div className="flex flex-wrap items-center gap-4 pt-1">
          {(
            [
              { key: 'showPlayerPhoto', label: 'Player Photo' },
              { key: 'showTeamLogo', label: 'Team Logo' },
              { key: 'showChannelLogo', label: 'User Channel Logo' },
              { key: 'autoTransition', label: 'Auto Transition' },
            ] as const
          ).map((item) => (
            <label
              key={item.key}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={overlay[item.key]}
                onChange={(e) =>
                  updateState((prev) => ({
                    ...prev,
                    overlay: { ...prev.overlay, [item.key]: e.target.checked },
                  }))
                }
                className="w-4 h-4 rounded accent-[#FF8C00]"
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Collapsible Live 16:9 Broadcast Preview Monitor */}
      {showPreviewMonitor && (
        <div className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between text-xs">
            <span className="font-bold tracking-wide">
              LIVE 16:9 vMix PREVIEW MONITOR
            </span>
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px]">
              <input
                type="checkbox"
                checked={previewGreenBg}
                onChange={(e) => setPreviewGreenBg(e.target.checked)}
                className="accent-emerald-500"
              />
              <span>Chroma Green Screen</span>
            </label>
          </div>
          <div
            className="w-full aspect-video relative overflow-hidden"
            style={{
              background: previewGreenBg
                ? '#00B140'
                : 'radial-gradient(circle at center, #1E293B 0%, #090D16 100%)',
            }}
          >
            <BroadcastOverlayCanvas
              state={state}
              matchId={activeMatch?.id}
              bgMode={previewGreenBg ? 'green' : 'transparent'}
            />
          </div>
        </div>
      )}

      {/* 1. BOTTOM SCORE (All 19 Modes) */}
      <section className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 bg-[#FF8C00] text-white font-display font-bold text-xs tracking-wider uppercase">
          BOTTOM SCORE
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {BOTTOM_SCORE_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                updateState((prev) => ({
                  ...prev,
                  overlay: { ...prev.overlay, bottomScoreMode: mode },
                }));
                onToast(`Bottom score: ${mode}`);
              }}
              className={chipBtn(overlay.bottomScoreMode === mode)}
            >
              {mode}
            </button>
          ))}
        </div>
      </section>

      {/* 2. MATCH STATS (All 18 Modes) */}
      <section className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 bg-[#FF8C00] text-white font-display font-bold text-xs tracking-wider uppercase flex items-center justify-between">
          <span>MATCH STATS</span>
          {overlay.mainCard.kind !== 'NONE' && (
            <button
              type="button"
              onClick={() => setMainCard({ kind: 'NONE' }, 'Main card hidden')}
              className="px-2.5 py-0.5 rounded bg-white/20 hover:bg-white/30 text-[10px] font-bold"
            >
              HIDE CARD
            </button>
          )}
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {MATCH_STATS_MODES.map((mode) => {
            const active =
              overlay.mainCard.kind === 'MATCH_STATS' &&
              overlay.mainCard.mode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() =>
                  toggleMainCard({ kind: 'MATCH_STATS', mode }, active, mode)
                }
                className={chipBtn(active)}
              >
                {mode}
              </button>
            );
          })}
        </div>
      </section>

      {/* 3 & 4. BATSMAN STATS & BOWLER STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 bg-[#FF8C00] text-white font-display font-bold text-xs tracking-wider uppercase">
            BATSMAN STATS
          </div>
          <div className="p-4 space-y-3">
            <select
              value={overlay.selectedBatsmanId || allMatchBatters[0]?.id || ''}
              onChange={(e) =>
                updateState((prev) => ({
                  ...prev,
                  overlay: { ...prev.overlay, selectedBatsmanId: e.target.value },
                }))
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
            >
              {allMatchBatters.length === 0 ? (
                <option value="">No batters available in active match</option>
              ) : (
                allMatchBatters.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.jerseyNo} {p.name}
                  </option>
                ))
              )}
            </select>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BATSMAN_STATS_MODES.map((mode) => {
                const pid = overlay.selectedBatsmanId || allMatchBatters[0]?.id || '';
                const active =
                  overlay.mainCard.kind === 'BATSMAN_STATS' &&
                  overlay.mainCard.mode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() =>
                      toggleMainCard(
                        { kind: 'BATSMAN_STATS', mode, playerId: pid },
                        active,
                        `Batsman ${mode}`
                      )
                    }
                    className={chipBtn(active)}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 bg-[#FF8C00] text-white font-display font-bold text-xs tracking-wider uppercase">
            BOWLER STATS
          </div>
          <div className="p-4 space-y-3">
            <select
              value={overlay.selectedBowlerId || allMatchBowlers[0]?.id || ''}
              onChange={(e) =>
                updateState((prev) => ({
                  ...prev,
                  overlay: { ...prev.overlay, selectedBowlerId: e.target.value },
                }))
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
            >
              {allMatchBowlers.length === 0 ? (
                <option value="">No bowlers available in active match</option>
              ) : (
                allMatchBowlers.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.jerseyNo} {p.name}
                  </option>
                ))
              )}
            </select>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BOWLER_STATS_MODES.map((mode) => {
                const pid = overlay.selectedBowlerId || allMatchBowlers[0]?.id || '';
                const active =
                  overlay.mainCard.kind === 'BOWLER_STATS' &&
                  overlay.mainCard.mode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() =>
                      toggleMainCard(
                        { kind: 'BOWLER_STATS', mode, playerId: pid },
                        active,
                        `Bowler ${mode}`
                      )
                    }
                    className={chipBtn(active)}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* 5. TRANSITION OVERLAY + 6. GRAPHS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 bg-[#FF8C00] text-white font-display font-bold text-xs tracking-wider uppercase flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              TRANSITION OVERLAY
            </span>
            <label className="inline-flex items-center gap-1.5 text-[11px] cursor-pointer">
              <input
                type="checkbox"
                checked={overlay.autoTransition}
                onChange={(e) =>
                  updateState((prev) => ({
                    ...prev,
                    overlay: { ...prev.overlay, autoTransition: e.target.checked },
                  }))
                }
                className="accent-amber-400"
              />
              <span>Auto</span>
            </label>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TRANSITION_OVERLAYS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => triggerTransition(t)}
                className="px-3 py-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 text-xs font-bold transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 bg-[#FF8C00] text-white font-display font-bold text-xs tracking-wider uppercase">
            GRAPHS
          </div>
          <div className="p-4 grid grid-cols-2 gap-2">
            {(
              [
                { id: 'manhatt', label: 'Manhattan' },
                { id: 'worm', label: 'Worm' },
              ] as const
            ).map((g) => {
              const active =
                overlay.mainCard.kind === 'GRAPHS' &&
                overlay.mainCard.mode === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() =>
                    toggleMainCard(
                      { kind: 'GRAPHS', mode: g.id },
                      active,
                      `${g.label} Graph`
                    )
                  }
                  className={chipBtn(active)}
                >
                  {g.label}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* 7. POINTS TABLE + 8. HIGHLIGHTS + 9. DAYWISE STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 bg-[#FF8C00] text-white font-display font-bold text-xs tracking-wider uppercase flex items-center justify-between">
            <span>POINTS TABLE</span>
            <button
              type="button"
              onClick={onGoToGroups}
              className="text-[10px] underline text-orange-100"
            >
              Groups
            </button>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                const active =
                  overlay.mainCard.kind === 'POINTS_TABLE' &&
                  overlay.mainCard.groupId === 'ALL';
                toggleMainCard(
                  { kind: 'POINTS_TABLE', groupId: 'ALL' },
                  active,
                  'Points Table (All)'
                );
              }}
              className={chipBtn(
                overlay.mainCard.kind === 'POINTS_TABLE' &&
                  overlay.mainCard.groupId === 'ALL'
              )}
            >
              All Groups
            </button>
            {activeTourGroups.map((grp) => {
              const active =
                overlay.mainCard.kind === 'POINTS_TABLE' &&
                overlay.mainCard.groupId === grp.id;
              return (
                <button
                  key={grp.id}
                  type="button"
                  onClick={() =>
                    toggleMainCard(
                      { kind: 'POINTS_TABLE', groupId: grp.id },
                      active,
                      `Points Table · ${grp.name}`
                    )
                  }
                  className={chipBtn(active)}
                >
                  {grp.name}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 bg-[#FF8C00] text-white font-display font-bold text-xs tracking-wider uppercase">
            HIGHLIGHTS
          </div>
          <div className="p-4 grid grid-cols-2 gap-2">
            {HIGHLIGHT_MODES.map((mode) => {
              const active =
                overlay.mainCard.kind === 'HIGHLIGHTS' &&
                overlay.mainCard.mode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() =>
                    toggleMainCard({ kind: 'HIGHLIGHTS', mode }, active, mode)
                  }
                  className={chipBtn(active)}
                >
                  {mode}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 bg-[#FF8C00] text-white font-display font-bold text-xs tracking-wider uppercase">
            DAYWISE STATS
          </div>
          <div className="p-4 grid grid-cols-2 gap-2">
            {['Day 1', 'Day 2', 'Day 3', 'Day 4'].map((day) => {
              const active =
                overlay.mainCard.kind === 'DAY_WISE' &&
                overlay.mainCard.day === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() =>
                    toggleMainCard({ kind: 'DAY_WISE', day }, active, day)
                  }
                  className={chipBtn(active)}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* 10. CUSTOM MESSAGE + 11. TOURNAMENT STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 bg-[#FF8C00] text-white font-display font-bold text-xs tracking-wider uppercase">
            CUSTOM MESSAGE
          </div>
          <div className="p-4 space-y-2.5">
            <input
              type="text"
              value={overlay.customMsgHeading}
              onChange={(e) =>
                updateState((prev) => ({
                  ...prev,
                  overlay: { ...prev.overlay, customMsgHeading: e.target.value },
                }))
              }
              placeholder="Message Heading (e.g., SPONSOR ANNOUNCEMENT)"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
            />
            <textarea
              rows={2}
              value={overlay.customMsgDescription}
              onChange={(e) =>
                updateState((prev) => ({
                  ...prev,
                  overlay: { ...prev.overlay, customMsgDescription: e.target.value },
                }))
              }
              placeholder="Message description text..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              {(['CUSTOM MSG', 'OTHER'] as const).map((tab) => {
                const active =
                  overlay.mainCard.kind === 'CUSTOM_MESSAGE' &&
                  overlay.mainCard.tab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() =>
                      toggleMainCard(
                        {
                          kind: 'CUSTOM_MESSAGE',
                          tab,
                          heading: overlay.customMsgHeading || tab,
                          description: overlay.customMsgDescription,
                        },
                        active,
                        tab
                      )
                    }
                    className={chipBtn(active)}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 bg-[#FF8C00] text-white font-display font-bold text-xs tracking-wider uppercase">
            TOURNAMENT STATS
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TOURNAMENT_STAT_MODES.map((mode) => {
              const active =
                overlay.mainCard.kind === 'TOURNAMENT_STATS' &&
                overlay.mainCard.mode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() =>
                    toggleMainCard({ kind: 'TOURNAMENT_STATS', mode }, active, mode)
                  }
                  className={chipBtn(active)}
                >
                  {mode}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* 12. TEAMWISE PLAYER STATS + 13. PLAYER OF THE MATCH */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 bg-[#FF8C00] text-white font-display font-bold text-xs tracking-wider uppercase">
            TEAMWISE PLAYER STATS
          </div>
          <div className="p-4 space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <select
                value={selectedTeamForStats?.id || ''}
                onChange={(e) =>
                  updateState((prev) => ({
                    ...prev,
                    overlay: {
                      ...prev.overlay,
                      selectedTeamForStatsId: e.target.value,
                      selectedTeamPlayerId: '',
                    },
                  }))
                }
                className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
              >
                {state.teams.length === 0 ? (
                  <option value="">No teams yet</option>
                ) : (
                  state.teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))
                )}
              </select>
              <select
                value={
                  overlay.selectedTeamPlayerId ||
                  selectedTeamForStats?.players[0]?.id ||
                  ''
                }
                onChange={(e) =>
                  updateState((prev) => ({
                    ...prev,
                    overlay: { ...prev.overlay, selectedTeamPlayerId: e.target.value },
                  }))
                }
                className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
              >
                {(selectedTeamForStats?.players ?? []).length === 0 ? (
                  <option value="">No players</option>
                ) : (
                  (selectedTeamForStats?.players ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { category: 'batting', mode: 'Tournament Batting' },
                  { category: 'bowling', mode: 'Tournament Bowling' },
                ] as const
              ).map((item) => {
                const pid =
                  overlay.selectedTeamPlayerId ||
                  selectedTeamForStats?.players[0]?.id ||
                  '';
                const active =
                  overlay.mainCard.kind === 'TEAM_PLAYER_STATS' &&
                  overlay.mainCard.category === item.category;
                return (
                  <button
                    key={item.category}
                    type="button"
                    onClick={() =>
                      toggleMainCard(
                        {
                          kind: 'TEAM_PLAYER_STATS',
                          teamId: selectedTeamForStats?.id || '',
                          playerId: pid,
                          category: item.category,
                          mode: item.mode,
                        },
                        active,
                        item.mode
                      )
                    }
                    className={chipBtn(active)}
                  >
                    {item.mode}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 bg-[#FF8C00] text-white font-display font-bold text-xs tracking-wider uppercase">
            PLAYER OF THE MATCH
          </div>
          <div className="p-4 space-y-2.5">
            <select
              value={
                overlay.selectedPomPlayerId ||
                activeMatch?.playerOfMatchId ||
                allMatchPlayers[0]?.id ||
                ''
              }
              onChange={(e) =>
                updateState((prev) => ({
                  ...prev,
                  overlay: { ...prev.overlay, selectedPomPlayerId: e.target.value },
                }))
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
            >
              {allMatchPlayers.length === 0 ? (
                <option value="">No players in active match</option>
              ) : (
                allMatchPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              )}
            </select>
            <div className="grid grid-cols-2 gap-2">
              {(['Name', 'Stats'] as const).map((display) => {
                const pid =
                  overlay.selectedPomPlayerId ||
                  activeMatch?.playerOfMatchId ||
                  allMatchPlayers[0]?.id ||
                  '';
                const active =
                  overlay.mainCard.kind === 'PLAYER_OF_MATCH' &&
                  overlay.mainCard.display === display;
                return (
                  <button
                    key={display}
                    type="button"
                    onClick={() =>
                      toggleMainCard(
                        { kind: 'PLAYER_OF_MATCH', playerId: pid, display },
                        active,
                        `Player of Match (${display})`
                      )
                    }
                    className={chipBtn(active)}
                  >
                    POM {display}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
