import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Eye,
  EyeOff,
  LogOut,
  Monitor,
  ShieldCheck,
  Sparkles,
  Timer,
  Trash2,
  Tv,
} from 'lucide-react';
import { useOverlayAccess } from '../../context/OverlayAccessContext';
import {
  BATSMAN_STATS_MODES,
  BOTTOM_SCORE_MODES,
  BOWLER_STATS_MODES,
  CricketSuiteState,
  HIGHLIGHT_MODES,
  MainOverlayCard,
  MATCH_STATS_MODES,
  OverlayThemeId,
  TOURNAMENT_STAT_MODES,
  TRANSITION_OVERLAYS,
  TransitionOverlayType,
} from '../../types/cricketSuite';
import {
  BROADCAST_THEMES,
  formatSingleDateHuman,
  getTournamentExpiryDate,
  isMatchLockedByNewerMatch,
  isMatchTournamentExpired,
  isTournamentExpired,
  MATCH_LOCKED_MESSAGE,
  TOURNAMENT_EXPIRED_MESSAGE,
} from '../../data/cricketSampleData';
import { BroadcastOverlayCanvas } from './BroadcastOverlayCanvas';
import { ObsVmixLinkPanel } from './ObsVmixLinkPanel';
import { WorldCupUnlockModal } from './WorldCupUnlockModal';
import {
  getPaidThemeConfig,
  isPaidThemeId,
  isThemeUnlockedInStatus,
  type PaidThemeId,
  useWorldCupServerUnlock,
} from '../../lib/worldCupUnlock';

interface TvOverlayControllerViewProps {
  state: CricketSuiteState;
  overlayUrl: string;
  updateState: (updater: (prev: CricketSuiteState) => CricketSuiteState) => void;
  onCopyOverlayUrl: (url?: string, label?: string) => void;
  onGoToGroups: () => void;
  onToast: (msg: string) => void;
  onRequestLogout?: () => void;
}

export function TvOverlayControllerView({
  state,
  overlayUrl,
  updateState,
  onCopyOverlayUrl,
  onGoToGroups,
  onToast,
  onRequestLogout,
}: TvOverlayControllerViewProps) {
  const { session, isUnlocked, unlockWithCredentials, lockAndLogout } =
    useOverlayAccess();

  // Unified Login Gate Form State (verifies directly against Supabase `overlay_access_keys`)
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Controller UI State
  const [worldCupPayModalOpen, setWorldCupPayModalOpen] = useState(false);
  const [payModalThemeId, setPayModalThemeId] = useState<PaidThemeId>('worldcup');
  const { status: worldCupStatus, refresh: refreshWorldCupStatus } =
    useWorldCupServerUnlock();
  const [showPreviewMonitor, setShowPreviewMonitor] = useState(true);
  const [previewGreenBg, setPreviewGreenBg] = useState(false);
  const [previewScale, setPreviewScale] = useState(0.5);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const [autoHideSeconds, setAutoHideSeconds] = useState<number>(8);
  const [autoHideRemaining, setAutoHideRemaining] = useState<number | null>(null);
  const [activeTransitionType, setActiveTransitionType] =
    useState<TransitionOverlayType | null>(null);
  const autoHideTimeoutRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  const cancelAutoHide = useCallback(() => {
    if (autoHideTimeoutRef.current !== null) {
      window.clearTimeout(autoHideTimeoutRef.current);
      autoHideTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setAutoHideRemaining(null);
  }, []);

  const scheduleAutoHide = useCallback(
    (durationSec: number, clearTransitionOnly = false) => {
      cancelAutoHide();
      if (durationSec <= 0) return;

      const totalMs = Math.round(durationSec * 1000);
      const endAt = Date.now() + totalMs;
      setAutoHideRemaining(Math.ceil(durationSec));

      countdownIntervalRef.current = window.setInterval(() => {
        const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
        setAutoHideRemaining(left > 0 ? left : null);
      }, 250);

      autoHideTimeoutRef.current = window.setTimeout(() => {
        cancelAutoHide();
        setActiveTransitionType(null);
        updateState((prev) => ({
          ...prev,
          overlay: clearTransitionOnly
            ? {
                ...prev.overlay,
                activeTransition: null,
              }
            : {
                ...prev.overlay,
                bottomScoreMode: 'EMPTY',
                mainCard: { kind: 'NONE' },
                activeTransition: null,
              },
        }));
      }, totalMs);
    },
    [cancelAutoHide, updateState]
  );

  useEffect(() => {
    return () => {
      cancelAutoHide();
    };
  }, [cancelAutoHide]);

  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el || !showPreviewMonitor) return;
    const updateScale = () => {
      const w = el.clientWidth;
      if (w > 0) setPreviewScale(w / 1280);
    };
    updateScale();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateScale);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [showPreviewMonitor]);

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
    const cleanPass = password.trim();
    if (!cleanId || !cleanPass) {
      setLoginError('Please enter both Login ID and Password.');
      return;
    }

    setLoginLoading(true);
    try {
      const result = await unlockWithCredentials(cleanId, cleanPass);
      if (!result.ok) {
        setLoginError(result.error || 'Invalid Login ID or Password.');
        return;
      }
      setLoginId('');
      setPassword('');
      onToast(
        `Signed in as ${result.session?.accessId || cleanId}`
      );
    } catch {
      setLoginError('Unable to verify credentials. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  // ================= PROTECTED LOGIN GATE =================
  if (!isUnlocked || !session) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-6 px-3">
        <div className="w-full max-w-md rounded-2xl wo-card overflow-hidden">
          <div className="wo-header px-6 py-6 text-center text-white space-y-2">
            <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/40 flex items-center justify-center mx-auto shadow-sm">
              <Tv className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-orange-100">
              STAR EVENT LIVE
            </p>
            <h2 className="font-display font-black text-xl tracking-wide text-white">
              SCOREBOARD OVERLAY CONTROL
            </h2>
          </div>

          <form onSubmit={handleOverlayLoginSubmit} className="p-6 space-y-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FFF3E0] border border-[#FF8C00]/35 text-[#B45309] text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#FF8C00] shrink-0" aria-hidden="true" />
              <span>Sign in with your Star Event Live Access ID and Password.</span>
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
                className="block text-xs font-bold text-[#E87500] uppercase tracking-wide mb-1.5"
              >
                Login ID
              </label>
              <input
                id="overlay-login-id"
                type="text"
                autoComplete="username"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="e.g. STAREVENTLIVE35484"
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#FF8C00] focus:border-[#FF8C00]"
              />
            </div>

            <div>
              <label
                htmlFor="overlay-login-password"
                className="block text-xs font-bold text-[#E87500] uppercase tracking-wide mb-1.5"
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
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#FF8C00] focus:border-[#FF8C00]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-[#FF8C00]"
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
              className="w-full py-3 rounded-lg wo-btn-primary disabled:opacity-60 text-white font-display font-bold text-sm tracking-wider"
            >
              {loginLoading ? 'VERIFYING...' : 'LOGIN'}
            </button>

            <p className="text-[11px] text-center text-slate-500 pt-1">
              Note: Public OBS &amp; vMix browser source links continue running live without requiring login.
            </p>
          </form>
        </div>
      </div>
    );
  }

  // ================= AUTHENTICATED OVERLAY CONTROL PANEL =================
  const { overlay } = state;
  const activeMatchTour = state.tournaments.find(
    (t) => t.id === activeMatch?.tournamentId
  );
  const activeMatchTourExpired = isTournamentExpired(activeMatchTour);

  const setMainCard = (card: MainOverlayCard, toastLabel?: string) => {
    if (card.kind !== 'NONE' && activeMatchTourExpired) {
      onToast(TOURNAMENT_EXPIRED_MESSAGE);
      return;
    }
    setActiveTransitionType(null);
    if (card.kind === 'NONE') {
      cancelAutoHide();
      updateState((prev) => ({
        ...prev,
        overlay: {
          ...prev.overlay,
          bottomScoreMode: 'EMPTY',
          mainCard: { kind: 'NONE' },
          activeTransition: null,
        },
      }));
      if (toastLabel) onToast(`Overlay off: ${toastLabel}`);
      return;
    }

    updateState((prev) => ({
      ...prev,
      overlay: {
        ...prev.overlay,
        bottomScoreMode: 'EMPTY',
        mainCard: card,
        activeTransition: null,
      },
    }));
    if (autoHideSeconds > 0) {
      scheduleAutoHide(autoHideSeconds);
    } else {
      cancelAutoHide();
    }
    if (toastLabel) {
      onToast(
        autoHideSeconds > 0
          ? `Overlay live: ${toastLabel} (auto-off in ${autoHideSeconds}s)`
          : `Overlay live: ${toastLabel}`
      );
    }
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

  const handleSelectBottomMode = (
    mode: (typeof BOTTOM_SCORE_MODES)[number]
  ) => {
    if (mode !== 'EMPTY' && activeMatchTourExpired) {
      onToast(TOURNAMENT_EXPIRED_MESSAGE);
      return;
    }
    setActiveTransitionType(null);
    const isCurrentlyActive =
      overlay.bottomScoreMode === mode && overlay.mainCard.kind === 'NONE';

    if (mode === 'EMPTY' || isCurrentlyActive) {
      cancelAutoHide();
      updateState((prev) => ({
        ...prev,
        overlay: {
          ...prev.overlay,
          bottomScoreMode: 'EMPTY',
          mainCard: { kind: 'NONE' },
          activeTransition: null,
        },
      }));
      onToast('Overlay off (EMPTY)');
      return;
    }

    updateState((prev) => ({
      ...prev,
      overlay: {
        ...prev.overlay,
        bottomScoreMode: mode,
        mainCard: { kind: 'NONE' },
        activeTransition: null,
      },
    }));

    // Keep live main 'Score' steady; auto-hide all temporary bottom ticker modes
    if (mode === 'Score') {
      cancelAutoHide();
      onToast('Bottom score: Score (Live)');
    } else if (autoHideSeconds > 0) {
      scheduleAutoHide(autoHideSeconds);
      onToast(`Bottom score: ${mode} (auto-off in ${autoHideSeconds}s)`);
    } else {
      cancelAutoHide();
      onToast(`Bottom score: ${mode}`);
    }
  };

  const triggerTransition = (type: TransitionOverlayType) => {
    if (activeMatchTourExpired) {
      onToast(TOURNAMENT_EXPIRED_MESSAGE);
      return;
    }
    setActiveTransitionType(type);
    updateState((prev) => ({
      ...prev,
      overlay: {
        ...prev.overlay,
        bottomScoreMode: 'EMPTY',
        mainCard: { kind: 'NONE' },
        activeTransition: {
          type,
          id: Date.now(),
        },
      },
    }));
    scheduleAutoHide(3.5, true);
    onToast(`Transition fired: ${type}`);
  };

  const handleClearOverlay = () => {
    cancelAutoHide();
    setActiveTransitionType(null);
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
    `px-3 py-2 rounded-lg text-xs font-bold tracking-wide transition-all text-center ${
      active ? 'wo-btn-active' : 'wo-btn-secondary'
    }`;

  const homeSelectClass =
    'px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#FF8C00] focus:border-[#FF8C00]';

  const homeInputClass =
    'w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#FF8C00] focus:border-[#FF8C00]';

  return (
    <div className="space-y-4">
      {activeMatchTourExpired && activeMatchTour && (
        <div
          role="alert"
          className="rounded-xl bg-red-600 text-white px-4 py-3 flex items-start gap-2.5 text-xs shadow-sm"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-bold text-sm">
              Tournament Expired — Broadcast Overlay Disabled
            </p>
            <p className="text-red-100 mt-0.5">
              &ldquo;{activeMatchTour.name}&rdquo; expired after{' '}
              {formatSingleDateHuman(
                getTournamentExpiryDate(activeMatchTour) || activeMatchTour.endDate
              )}
              . Select an active tournament match to broadcast live graphics.
            </p>
          </div>
        </div>
      )}

      {/* Top Bar: VMix Link, Toggles, Match Switcher, Lock */}
      <div className="rounded-xl wo-card p-4 space-y-3 text-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#FFF3E0] border border-[#FF8C00]/35 text-[#E87500] font-mono text-[10px] font-bold uppercase tracking-wider">
                ROOM ID: {session.accessId}
              </span>
              <span className="text-xs text-slate-500">
                {session.label ? `${session.label} · ` : ''}Isolated Live OBS / vMix Control Panel
              </span>
            </div>
            <h2 className="font-display font-black text-base text-slate-900 tracking-wide mt-0.5">
              Scoreboard Overlay Control
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {state.matches.length > 0 && (
              <select
                value={activeMatch?.id || ''}
                onChange={(e) => {
                  const target = state.matches.find((m) => m.id === e.target.value);
                  if (target && isMatchTournamentExpired(target, state.tournaments)) {
                    onToast(TOURNAMENT_EXPIRED_MESSAGE);
                    return;
                  }
                  if (target && isMatchLockedByNewerMatch(target, state.matches)) {
                    onToast(MATCH_LOCKED_MESSAGE);
                    return;
                  }
                  updateState((prev) => ({ ...prev, activeMatchId: e.target.value }));
                }}
                aria-label="Select match for overlay"
                className={`${homeSelectClass} w-full sm:w-auto max-w-full`}
              >
                {state.matches.map((m) => {
                  const expired = isMatchTournamentExpired(m, state.tournaments);
                  const locked = isMatchLockedByNewerMatch(m, state.matches);
                  return (
                    <option key={m.id} value={m.id} disabled={expired || locked}>
                      {m.matchLabel}: {teamMap.get(m.team1Id)?.shortName || 'T1'} vs{' '}
                      {teamMap.get(m.team2Id)?.shortName || 'T2'}
                      {expired ? ' (Expired)' : locked ? ' (Locked)' : ''}
                    </option>
                  );
                })}
              </select>
            )}

            <select
              value={
                isThemeUnlockedInStatus(state.user.userTheme, worldCupStatus)
                  ? state.user.userTheme
                  : 'tata-ipl-2022'
              }
              onChange={(e) => {
                const nextThemeId = e.target.value as OverlayThemeId;
                if (
                  isPaidThemeId(nextThemeId) &&
                  !isThemeUnlockedInStatus(nextThemeId, worldCupStatus)
                ) {
                  setPayModalThemeId(nextThemeId);
                  setWorldCupPayModalOpen(true);
                  return;
                }
                const found = BROADCAST_THEMES.find((t) => t.id === nextThemeId);
                updateState((prev) => ({
                  ...prev,
                  user: {
                    ...prev.user,
                    userTheme: nextThemeId,
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
                onToast(`Scoreboard theme: ${found?.name || nextThemeId}`);
              }}
              aria-label="Select scoreboard theme"
              className={`${homeSelectClass} w-full sm:w-auto max-w-full`}
            >
              {BROADCAST_THEMES.map((t) => {
                const locked =
                  isPaidThemeId(t.id) && !isThemeUnlockedInStatus(t.id, worldCupStatus);
                const priceLabel = isPaidThemeId(t.id)
                  ? ` (Unlock ₹${getPaidThemeConfig(t.id).priceInr})`
                  : '';
                return (
                  <option key={t.id} value={t.id}>
                    Theme: {t.name}
                    {locked ? priceLabel : ''}
                  </option>
                );
              })}
            </select>

            <button
              type="button"
              onClick={() => setShowPreviewMonitor((p) => !p)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg wo-btn-soft text-xs font-extrabold"
            >
              <Monitor className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{showPreviewMonitor ? 'Hide Monitor' : 'Live Monitor'}</span>
            </button>

            <button
              type="button"
              onClick={handleClearOverlay}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg wo-btn-primary text-white text-xs font-bold"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Clear Screen</span>
            </button>

            <button
              type="button"
              onClick={() => (onRequestLogout ? onRequestLogout() : lockAndLogout())}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg wo-btn-secondary text-xs font-bold"
            >
              <LogOut className="w-3.5 h-3.5 text-[#FF8C00]" aria-hidden="true" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* OBS / vMix Public Overlay Links */}
        <ObsVmixLinkPanel
          baseOverlayUrl={overlayUrl}
          onCopyUrl={(url, label) => onCopyOverlayUrl(url, label)}
          compact
          homeTheme
        />

        {/* Visibility Toggles + Auto-Hide Timer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-4">
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

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Timer className="w-3.5 h-3.5 text-[#FF8C00]" aria-hidden="true" />
              <span>Auto Hide:</span>
              <select
                value={autoHideSeconds}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setAutoHideSeconds(next);
                  if (next === 0) cancelAutoHide();
                }}
                aria-label="Auto hide duration"
                className="px-2 py-1 rounded-md bg-white border border-slate-300 text-xs font-bold text-[#E87500] focus:outline-hidden focus:ring-2 focus:ring-[#FF8C00]"
              >
                <option value={5}>5 sec</option>
                <option value={8}>8 sec</option>
                <option value={12}>12 sec</option>
                <option value={15}>15 sec</option>
                <option value={0}>Off (Manual)</option>
              </select>
            </label>

            {autoHideRemaining !== null && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FFF3E0] border border-[#FF8C00]/45 text-[#E87500] text-[11px] font-extrabold tabular-nums">
                <span>Auto-off in {autoHideRemaining}s</span>
                <button
                  type="button"
                  onClick={cancelAutoHide}
                  className="underline text-slate-900 hover:text-[#FF8C00] ml-1"
                >
                  Hold
                </button>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible Live 16:9 Broadcast Preview Monitor */}
      {showPreviewMonitor && (
        <div className="rounded-xl wo-card overflow-hidden">
          <div className="px-4 py-2.5 wo-header text-white flex items-center justify-between text-xs">
            <span className="font-display font-bold tracking-wider text-white">
              LIVE 16:9 OBS / vMix PREVIEW MONITOR
            </span>
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-white">
              <input
                type="checkbox"
                checked={previewGreenBg}
                onChange={(e) => setPreviewGreenBg(e.target.checked)}
                className="accent-white"
              />
              <span>Chroma Green Screen</span>
            </label>
          </div>
          <div
            ref={previewContainerRef}
            className="w-full aspect-video relative overflow-hidden"
            style={{
              background: previewGreenBg
                ? '#00B140'
                : 'radial-gradient(circle at center, #3A040C 0%, #070B28 100%)',
            }}
          >
            <div
              className="relative overflow-hidden"
              style={{
                width: '1280px',
                height: '720px',
                transform: `scale(${previewScale})`,
                transformOrigin: 'top left',
              }}
            >
              <BroadcastOverlayCanvas
                state={state}
                matchId={activeMatch?.id}
                bgMode={previewGreenBg ? 'green' : 'transparent'}
                worldCupUnlocked={worldCupStatus.unlocked}
                unlockedThemes={worldCupStatus.unlockedThemes}
              />
            </div>
          </div>
        </div>
      )}

      {/* 1. BOTTOM SCORE (All 19 Modes) */}
      <section className="rounded-xl wo-card overflow-hidden">
        <div className="px-4 py-2.5 wo-header text-white font-display font-bold text-xs tracking-wider uppercase">
          BOTTOM SCORE
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {BOTTOM_SCORE_MODES.map((mode) => {
            const isActive =
              mode === 'EMPTY'
                ? overlay.bottomScoreMode === 'EMPTY' &&
                  overlay.mainCard.kind === 'NONE' &&
                  !activeTransitionType
                : overlay.bottomScoreMode === mode &&
                  overlay.mainCard.kind === 'NONE' &&
                  !activeTransitionType;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => handleSelectBottomMode(mode)}
                className={chipBtn(isActive)}
              >
                {mode}
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. MATCH STATS (All 18 Modes) */}
      <section className="rounded-xl wo-card overflow-hidden">
        <div className="px-4 py-2.5 wo-header text-white font-display font-bold text-xs tracking-wider uppercase flex items-center justify-between">
          <span>MATCH STATS</span>
          {overlay.mainCard.kind !== 'NONE' && (
            <button
              type="button"
              onClick={() => setMainCard({ kind: 'NONE' }, 'Main card hidden')}
              className="px-2.5 py-0.5 rounded bg-white text-[#E87500] hover:bg-orange-50 text-[10px] font-extrabold shadow-xs"
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
        <section className="rounded-xl wo-card overflow-hidden">
          <div className="px-4 py-2.5 wo-header text-white font-display font-bold text-xs tracking-wider uppercase">
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
              className={`w-full ${homeSelectClass}`}
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

        <section className="rounded-xl wo-card overflow-hidden">
          <div className="px-4 py-2.5 wo-header text-white font-display font-bold text-xs tracking-wider uppercase">
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
              className={`w-full ${homeSelectClass}`}
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
        <section className="lg:col-span-2 rounded-xl wo-card overflow-hidden">
          <div className="px-4 py-2.5 wo-header text-white font-display font-bold text-xs tracking-wider uppercase flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-white" aria-hidden="true" />
              TRANSITION OVERLAY
            </span>
            <label className="inline-flex items-center gap-1.5 text-[11px] text-white cursor-pointer">
              <input
                type="checkbox"
                checked={overlay.autoTransition}
                onChange={(e) =>
                  updateState((prev) => ({
                    ...prev,
                    overlay: { ...prev.overlay, autoTransition: e.target.checked },
                  }))
                }
                className="accent-white"
              />
              <span>Auto</span>
            </label>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TRANSITION_OVERLAYS.map((t) => {
              const isTransActive = activeTransitionType === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => triggerTransition(t)}
                  className={`px-3 py-2.5 rounded-lg text-xs font-extrabold tracking-wide transition-all ${
                    isTransActive ? 'wo-trans-btn-active' : 'wo-trans-btn'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl wo-card overflow-hidden">
          <div className="px-4 py-2.5 wo-header text-white font-display font-bold text-xs tracking-wider uppercase">
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
        <section className="rounded-xl wo-card overflow-hidden">
          <div className="px-4 py-2.5 wo-header text-white font-display font-bold text-xs tracking-wider uppercase flex items-center justify-between">
            <span>POINTS TABLE</span>
            <button
              type="button"
              onClick={onGoToGroups}
              className="text-[10px] underline text-orange-100 hover:text-white"
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

        <section className="rounded-xl wo-card overflow-hidden">
          <div className="px-4 py-2.5 wo-header text-white font-display font-bold text-xs tracking-wider uppercase">
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

        <section className="rounded-xl wo-card overflow-hidden">
          <div className="px-4 py-2.5 wo-header text-white font-display font-bold text-xs tracking-wider uppercase">
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
        <section className="rounded-xl wo-card overflow-hidden">
          <div className="px-4 py-2.5 wo-header text-white font-display font-bold text-xs tracking-wider uppercase">
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
              className={homeInputClass}
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
              className={homeInputClass}
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

        <section className="rounded-xl wo-card overflow-hidden">
          <div className="px-4 py-2.5 wo-header text-white font-display font-bold text-xs tracking-wider uppercase">
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
        <section className="rounded-xl wo-card overflow-hidden">
          <div className="px-4 py-2.5 wo-header text-white font-display font-bold text-xs tracking-wider uppercase">
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
                className={homeSelectClass}
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
                className={homeSelectClass}
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

        <section className="rounded-xl wo-card overflow-hidden">
          <div className="px-4 py-2.5 wo-header text-white font-display font-bold text-xs tracking-wider uppercase">
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
              className={`w-full ${homeSelectClass}`}
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

      <WorldCupUnlockModal
        open={worldCupPayModalOpen}
        themeId={payModalThemeId}
        onClose={() => setWorldCupPayModalOpen(false)}
        onUnlockSuccess={({ themeId: unlockedId, orderId, cfPaymentId }) => {
          void refreshWorldCupStatus();
          const unlockedProduct = getPaidThemeConfig(unlockedId);
          updateState((prev) => ({
            ...prev,
            user: {
              ...prev.user,
              userTheme: unlockedId,
              worldcupLastPaymentRef: cfPaymentId || orderId,
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
          onToast(`${unlockedProduct.productName} payment verified and activated live!`);
        }}
      />
    </div>
  );
}
