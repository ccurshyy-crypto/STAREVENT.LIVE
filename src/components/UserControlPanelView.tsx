import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Keyboard,
  Lock,
  LogIn,
  LogOut,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Language } from '../data/content';
import { computeLiveClockSeconds, useUserScoreboard } from '../hooks/useUserScoreboard';
import {
  KabaddiGraphicPanel,
  KabaddiHalf,
  LiveOverlayState,
  OverlayBackground,
  UserScoreboardSettingsDoc,
} from '../types/overlay';
import { downloadKabaddiOverlayPng } from '../utils/exportOverlayPng';
import { HomeAnimatedBackground } from './HomeAnimatedBackground';
import { VmixKabaddiController } from './VmixKabaddiController';

interface UserControlPanelViewProps {
  targetUid: string;
  lang: Language;
  onNavigateHome: () => void;
  onNavigateToControl: (uid: string) => void;
  onOpenAccountPortal: (tab?: 'operator' | 'admin') => void;
}

const SETTINGS_KEYS = new Set<keyof UserScoreboardSettingsDoc>([
  'teamAName',
  'teamACode',
  'teamAColor',
  'teamALogoUrl',
  'teamAStarting7',
  'teamBName',
  'teamBCode',
  'teamBColor',
  'teamBLogoUrl',
  'teamBStarting7',
  'kabaddiTitle',
  'kabaddiSubtitle',
  'kabaddiTag',
  'kabaddiVenue',
  'kabaddiLeague',
  'kabaddiEvent',
  'kabaddiMatchType',
  'sponsorName',
  'championTeam',
  'runnerUpTeam',
  'thirdPlaceTeam',
  'fourthPlaceTeam',
]);

async function resizeLogoFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read logo file.'));
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : '';
      if (!src) {
        reject(new Error('Invalid image file.'));
        return;
      }
      const img = new Image();
      img.onerror = () => resolve(src.slice(0, 170000));
      img.onload = () => {
        const maxSize = 180;
        const scale = Math.min(1, maxSize / Math.max(img.width || 1, img.height || 1));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src.slice(0, 170000));
          return;
        }
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        // Preserve PNG transparency for team crests while keeping size compact for Firestore
        const pngData = canvas.toDataURL('image/png');
        if (pngData.length <= 170000) {
          resolve(pngData);
        } else {
          resolve(canvas.toDataURL('image/webp', 0.82).slice(0, 170000));
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Strictly Protected Per-User Admin Control Panel (`/control/{USER_UID}`).
 *
 * Security & Sync guarantees:
 * - Only the authenticated owner (`firebaseUser.uid === targetUid`) or Super Admin
 *   can view or write to this scoreboard (enforced both in UI and Firestore Security Rules).
 * - Uses `useUserScoreboard` directly against `/users/{targetUid}/{scoreboard,settings,undoHistory,scoreHistory}`.
 * - One click = +1 exact point; one keypress = +1 exact point (`e.repeat` ignored).
 * - Manual text, team names, logos, sponsors, tournament details persist permanently in `/settings/main`.
 */
export function UserControlPanelView({
  targetUid,
  lang,
  onNavigateHome,
  onNavigateToControl,
  onOpenAccountPortal,
}: UserControlPanelViewProps) {
  const { authReady, firebaseUser, userAccount, isSuperAdmin, signOutUser } = useAuth();

  const isAuthorized = Boolean(
    firebaseUser && (firebaseUser.uid === targetUid || isSuperAdmin)
  );

  const [outputBg, setOutputBg] = useState<OverlayBackground>('transparent');
  const [transparentBg, setTransparentBg] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [nowClock, setNowClock] = useState(() => Date.now());
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true);

  const scoreboard = useUserScoreboard({
    targetUid: isAuthorized ? targetUid : '',
    role: 'controller',
    canWrite: isAuthorized,
  });

  const { state } = scoreboard;

  // Smooth local display clock tick when match/raid/sin-bin timer is running
  const anyClockRunning =
    state.matchRunning ||
    state.raidRunning ||
    Boolean(state.teamABinEndAt) ||
    Boolean(state.teamBBinEndAt);

  useEffect(() => {
    setNowClock(Date.now());
    if (!anyClockRunning) return;
    const id = window.setInterval(() => setNowClock(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [anyClockRunning, state.matchUpdatedAt, state.raidUpdatedAt]);

  const displayMatchSeconds = computeLiveClockSeconds(
    state.matchSeconds,
    state.matchRunning,
    state.matchUpdatedAt,
    nowClock
  );

  const displayRaidSeconds = computeLiveClockSeconds(
    state.raidSeconds,
    state.raidRunning,
    state.raidUpdatedAt,
    nowClock
  );

  const teamABinRemaining = state.teamABinEndAt
    ? Math.max(0, Math.ceil((state.teamABinEndAt - nowClock) / 1000))
    : 0;
  const teamBBinRemaining = state.teamBBinEndAt
    ? Math.max(0, Math.ceil((state.teamBBinEndAt - nowClock) / 1000))
    : 0;

  // Strictly SINGLE keyboard listener with `e.repeat` guard so holding a key NEVER adds multiple points!
  useEffect(() => {
    if (!isAuthorized || !shortcutsEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'q') {
        e.preventDefault();
        void scoreboard.applyScoreDelta('A', 'point', 1);
      } else if (key === 'a') {
        e.preventDefault();
        void scoreboard.applyScoreDelta('A', 'point', -1);
      } else if (key === 'p') {
        e.preventDefault();
        void scoreboard.applyScoreDelta('B', 'point', 1);
      } else if (key === 'l') {
        e.preventDefault();
        void scoreboard.applyScoreDelta('B', 'point', -1);
      } else if (key === 'z') {
        e.preventDefault();
        void scoreboard.undoLastAction();
      } else if (e.code === 'Space') {
        e.preventDefault();
        void scoreboard.toggleMatchTimer();
      } else if (key === 'r') {
        e.preventDefault();
        void scoreboard.toggleRaidTimer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isAuthorized,
    shortcutsEnabled,
    scoreboard.applyScoreDelta,
    scoreboard.undoLastAction,
    scoreboard.toggleMatchTimer,
    scoreboard.toggleRaidTimer,
  ]);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://starevent.live';
  const overlayUrl = useMemo(() => {
    const base = `${origin}/scoreboard/${encodeURIComponent(targetUid)}`;
    return outputBg === 'transparent' ? base : `${base}?bg=${outputBg}`;
  }, [origin, targetUid, outputBg]);

  const controlUrl = useMemo(
    () => `${origin}/control/${encodeURIComponent(targetUid)}`,
    [origin, targetUid]
  );

  const isPrivateDevPreview =
    typeof window !== 'undefined' &&
    (window.location.hostname.includes('ais-dev-') || window.location.hostname === 'localhost');

  const copyValue = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((curr) => (curr === key ? null : curr));
      }, 2000);
    } catch {
      setCopiedKey(null);
    }
  };

  // Route manual text/settings patches cleanly to `/users/{targetUid}/settings/main`
  // and visibility/clock/panel patches cleanly to `/users/{targetUid}/scoreboard/current`
  const handleUpdateState = useCallback(
    (patch: Partial<LiveOverlayState>) => {
      const settingsPatch: Partial<UserScoreboardSettingsDoc> = {};
      let hasSettings = false;

      for (const [k, v] of Object.entries(patch)) {
        if (SETTINGS_KEYS.has(k as keyof UserScoreboardSettingsDoc)) {
          (settingsPatch as Record<string, unknown>)[k] = v;
          hasSettings = true;
        }
      }

      if (hasSettings) {
        scoreboard.updateSettings(settingsPatch);
      }

      if (typeof patch.visible === 'boolean') {
        void scoreboard.setVisible(patch.visible);
      }
      if (patch.kabaddiGraphicPanel !== undefined) {
        void scoreboard.setGraphicPanel(patch.kabaddiGraphicPanel);
      }
      if (patch.raidRunning === false && patch.raidSeconds === 30) {
        void scoreboard.resetRaidTimer();
      }
    },
    [scoreboard.updateSettings, scoreboard.setVisible, scoreboard.setGraphicPanel, scoreboard.resetRaidTimer]
  );

  // Route every live button click strictly to its single atomic Firestore action
  const handleSendAction = useCallback(
    (action: string, payload?: Record<string, unknown>) => {
      const team: 'A' | 'B' = payload?.team === 'B' ? 'B' : 'A';
      const points = typeof payload?.points === 'number' ? payload.points : 1;

      switch (action) {
        case 'point':
        case 'raid':
          void scoreboard.applyScoreDelta(team, action === 'point' ? 'point' : 'raid', points);
          break;
        case 'bonus':
          void scoreboard.applyScoreDelta(team, 'bonus', points);
          break;
        case 'tackle':
          void scoreboard.applyScoreDelta(team, 'tackle', points);
          break;
        case 'lona':
          void scoreboard.applyScoreDelta(team, 'lona', points);
          break;
        case 'all_out':
          void scoreboard.triggerAllOut(team);
          break;
        case 'players_on_mat': {
          const count = typeof payload?.count === 'number' ? payload.count : 7;
          void scoreboard.setPlayersOnMat(team, count);
          break;
        }
        case 'player_out':
          void scoreboard.playerOut(team);
          break;
        case 'half':
          if (payload?.half) {
            void scoreboard.setHalf(payload.half as KabaddiHalf);
          }
          break;
        case 'do_or_die':
          void scoreboard.setDoOrDie(Boolean(payload?.active));
          break;
        case 'card':
          if (
            payload?.card === 'green' ||
            payload?.card === 'yellow' ||
            payload?.card === 'red'
          ) {
            void scoreboard.issueCard(team, payload.card);
          }
          break;
        case 'graphic_panel':
          if (payload?.panel) {
            void scoreboard.setGraphicPanel(payload.panel as KabaddiGraphicPanel);
          }
          break;
        case 'raid_reset':
          void scoreboard.resetRaidTimer();
          break;
        case 'raid_toggle':
          void scoreboard.toggleRaidTimer();
          break;
        default:
          break;
      }
    },
    [
      scoreboard.applyScoreDelta,
      scoreboard.triggerAllOut,
      scoreboard.setPlayersOnMat,
      scoreboard.playerOut,
      scoreboard.setHalf,
      scoreboard.setDoOrDie,
      scoreboard.issueCard,
      scoreboard.setGraphicPanel,
      scoreboard.resetRaidTimer,
      scoreboard.toggleRaidTimer,
    ]
  );

  const handleUploadTeamLogo = useCallback(
    async (team: 'A' | 'B', e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      try {
        const dataUrl = await resizeLogoFileToDataUrl(file);
        scoreboard.updateSettings(
          team === 'A' ? { teamALogoUrl: dataUrl } : { teamBLogoUrl: dataUrl },
          true
        );
      } catch {
        // Ignore invalid image files cleanly
      }
    },
    [scoreboard.updateSettings]
  );

  const handleRemoveTeamLogo = useCallback(
    (team: 'A' | 'B') => {
      scoreboard.updateSettings(
        team === 'A' ? { teamALogoUrl: '' } : { teamBLogoUrl: '' },
        true
      );
    },
    [scoreboard.updateSettings]
  );

  const handleDownloadPng = useCallback(() => {
    void downloadKabaddiOverlayPng({
      style: 'classic',
      title: state.kabaddiTitle,
      subtitle: state.kabaddiSubtitle,
      tag: state.kabaddiTag,
      teamAName: state.teamAName,
      teamACode: state.teamACode,
      teamAColor: state.teamAColor,
      teamAScore: state.teamAScore,
      teamALogoUrl: state.teamALogoUrl,
      teamAYellowCards: state.teamAYellowCards,
      teamARedCards: state.teamARedCards,
      teamBName: state.teamBName,
      teamBCode: state.teamBCode,
      teamBColor: state.teamBColor,
      teamBScore: state.teamBScore,
      teamBLogoUrl: state.teamBLogoUrl,
      teamBYellowCards: state.teamBYellowCards,
      teamBRedCards: state.teamBRedCards,
      matchSeconds: displayMatchSeconds,
      raidSeconds: displayRaidSeconds,
      raidRunning: state.raidRunning,
      halfLabel: state.kabaddiHalf,
      doOrDie: state.doOrDie,
      showDemoWatermark: false,
    });
  }, [state, displayMatchSeconds, displayRaidSeconds]);

  // 1. Loading auth state
  if (!authReady) {
    return (
      <div className="relative min-h-screen bg-[#07080F] text-white flex items-center justify-center p-6">
        <HomeAnimatedBackground />
        <div className="relative z-10 bg-[#121622]/95 border border-white/15 rounded-2xl px-8 py-6 text-center space-y-2 shadow-2xl">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#FACC15]">
            Star Event Live · Firebase Auth
          </p>
          <p className="text-sm text-zinc-300">Verifying scoreboard ownership...</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated visitor -> strict login gate
  if (!firebaseUser) {
    return (
      <div className="relative min-h-screen bg-[#07080F] text-white flex items-center justify-center p-4 sm:p-6">
        <HomeAnimatedBackground />
        <div className="relative z-10 w-full max-w-lg bg-[#111521]/95 border border-[#FACC15]/35 rounded-2xl p-6 sm:p-8 text-center space-y-5 shadow-[0_24px_70px_rgba(0,0,0,0.75)]">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/40 flex items-center justify-center">
            <Lock className="w-7 h-7 text-[#FACC15]" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#FACC15]">
              Protected Admin Control Panel
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
              Sign In to Control Your Scoreboard
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Every operator has an isolated Firebase-protected Kabaddi scoreboard. Sign in with your
              unique Login ID and Password to control your live match.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenAccountPortal('operator')}
              className="btn-gold-pro w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-extrabold text-black rounded-xl"
            >
              <LogIn className="w-4 h-4" aria-hidden="true" />
              <span>Operator Login / Sign Up</span>
            </button>
            <button
              type="button"
              onClick={onNavigateHome}
              className="btn-glass-pro w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white rounded-xl"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Back to Home</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated as DIFFERENT user -> strict ownership isolation block
  if (!isAuthorized) {
    return (
      <div className="relative min-h-screen bg-[#07080F] text-white flex items-center justify-center p-4 sm:p-6">
        <HomeAnimatedBackground />
        <div className="relative z-10 w-full max-w-lg bg-[#111521]/95 border border-[#EF4444]/45 rounded-2xl p-6 sm:p-8 text-center space-y-5 shadow-[0_24px_70px_rgba(0,0,0,0.75)]">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/45 flex items-center justify-center">
            <ShieldAlert className="w-7 h-7 text-[#F87171]" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#F87171]">
              Access Denied · Owner Only
            </p>
            <h1 className="font-display text-2xl font-extrabold text-white">
              This Scoreboard Belongs to Another Operator
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              For security, each user can only access and update their own independent scoreboard
              panel. Open your personal scoreboard control panel below.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigateToControl(firebaseUser.uid)}
              className="btn-gold-pro w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-extrabold text-black rounded-xl"
            >
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span>Open My Scoreboard Panel</span>
            </button>
            <button
              type="button"
              onClick={onNavigateHome}
              className="btn-glass-pro w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white rounded-xl"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Back to Home</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Authorized Owner / Super Admin -> Full Isolated Scoreboard Control Panel
  return (
    <div className="relative min-h-screen bg-[#07080F] text-[#F4F4F5] overflow-x-clip">
      <HomeAnimatedBackground />

      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
        {/* Top Private Operator Header Bar */}
        <header className="bg-[#0E1320]/95 backdrop-blur-md border border-white/14 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xl">
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onNavigateHome}
              className="btn-glass-pro inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl text-zinc-100 shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
              <span>Home</span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-[#4ADE80]">
                  <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>PRIVATE OWNER PANEL</span>
                </span>
                {scoreboard.savingSettings ? (
                  <span className="text-[11px] font-mono text-[#FACC15]">Saving text...</span>
                ) : scoreboard.lastSavedAt ? (
                  <span className="text-[11px] font-mono text-emerald-300">All text saved</span>
                ) : null}
              </div>
              <p className="font-display text-sm sm:text-base font-extrabold text-white truncate">
                {userAccount?.fullName || (isSuperAdmin ? 'Super Admin Studio' : 'Operator Studio')}
                {userAccount?.loginId ? (
                  <span className="ml-2 font-mono text-xs text-[#FACC15]">
                    ({userAccount.loginId})
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShortcutsEnabled((v) => !v)}
              title="Keyboard shortcuts: Q/A (Team A +1/-1), P/L (Team B +1/-1), Z (Undo), Space (Match Clock), R (Raid Clock)"
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${
                shortcutsEnabled
                  ? 'bg-[#1D4ED8]/35 border-[#60A5FA]/50 text-blue-100'
                  : 'bg-white/5 border-white/15 text-zinc-400'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Keys: {shortcutsEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={() => copyValue('hdr-overlay', overlayUrl)}
              className="btn-gold-pro inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold text-black rounded-xl whitespace-nowrap"
            >
              {copiedKey === 'hdr-overlay' ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedKey === 'hdr-overlay' ? 'vMix URL Copied!' : 'Copy vMix Overlay URL'}</span>
            </button>

            <a
              href={overlayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary-pro inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold text-white rounded-xl whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Open Overlay</span>
            </a>

            <button
              type="button"
              onClick={() => {
                void signOutUser();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-white/[0.06] hover:bg-red-500/20 border border-white/15 text-zinc-200 hover:text-red-200 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Keyboard Shortcut Cheat Bar + Cloud Error Alert */}
        {scoreboard.errorMessage && (
          <div className="bg-red-950/75 border border-red-500/50 rounded-xl px-4 py-2.5 text-xs font-semibold text-red-100">
            {scoreboard.errorMessage}
          </div>
        )}

        <div className="bg-[#111726]/85 border border-white/10 rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-300">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-bold text-[#FACC15]">Safe 1-Press Keys:</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-black/50 border border-white/15 font-mono text-white">Q</kbd> Team A +1</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-black/50 border border-white/15 font-mono text-white">A</kbd> Team A -1</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-black/50 border border-white/15 font-mono text-white">P</kbd> Team B +1</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-black/50 border border-white/15 font-mono text-white">L</kbd> Team B -1</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-black/50 border border-white/15 font-mono text-white">Z</kbd> Undo</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-black/50 border border-white/15 font-mono text-white">Space</kbd> Match Clock</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-black/50 border border-white/15 font-mono text-white">R</kbd> Raid Clock</span>
          </div>
          <span className="font-mono text-[10px] text-emerald-300">
            Isolated Firebase Sync · 1 Click = 1 Point
          </span>
        </div>

        {/* Full Pro Kabaddi Scoreboard Controller wired directly to Isolated Firebase User Docs */}
        <VmixKabaddiController
          lang={lang}
          state={state}
          displayMatchSeconds={displayMatchSeconds}
          displayRaidSeconds={displayRaidSeconds}
          teamABinRemaining={teamABinRemaining}
          teamBBinRemaining={teamBBinRemaining}
          connected={scoreboard.connected}
          connectionStatus={scoreboard.connected ? 'live' : 'reconnecting'}
          transport="firebase"
          connectedDisplays={1}
          connectedControllers={1}
          roomInput={userAccount?.loginId || 'PRIVATE'}
          onChangeRoomInput={() => {}}
          onGenerateMatchId={() => {}}
          outputBg={outputBg}
          onChangeOutputBg={setOutputBg}
          transparentBg={transparentBg}
          onToggleTransparentBg={() => setTransparentBg((v) => !v)}
          lockModeInUrl={true}
          onToggleLockModeInUrl={() => {}}
          obsBrowserUrl={overlayUrl}
          vmixBrowserUrl={overlayUrl}
          controlUrl={controlUrl}
          isPrivateDevPreview={isPrivateDevPreview}
          isFreeDemo={false}
          isCurrentUnlocked={true}
          activeToken={null}
          currentSku="kabaddi-classic"
          nowTs={nowClock}
          canUndo={scoreboard.canUndo}
          undoCount={scoreboard.undoCount}
          lastUndoLabel={scoreboard.lastUndoLabel}
          canRedo={false}
          autoRulesEnabled={false}
          onToggleAutoRules={() => {}}
          autoDemoActive={false}
          onToggleAutoDemo={() => {}}
          onUndo={() => {
            void scoreboard.undoLastAction();
          }}
          onRedo={() => {}}
          onUpdateState={handleUpdateState}
          onSendAction={handleSendAction}
          onPlayerOut={(team) => {
            void scoreboard.playerOut(team);
          }}
          onAllOut={(team) => {
            void scoreboard.triggerAllOut(team);
          }}
          onFlushSettings={() => {
            void scoreboard.flushSettingsNow();
          }}
          savingSettings={scoreboard.savingSettings}
          isolatedUserMode={true}
          onTriggerAlert={(label) => {
            void scoreboard.triggerAlert(label);
          }}
          onTimeout={(target) => {
            void scoreboard.setTimeoutTeam(target);
          }}
          onToggleMatchTimer={() => {
            void scoreboard.toggleMatchTimer();
          }}
          onSetMatchPreset={(seconds, autoStart) => {
            void scoreboard.resetMatchTimer(seconds, autoStart);
          }}
          onToggleRaidTimer={() => {
            void scoreboard.toggleRaidTimer();
          }}
          onResetRaidTimer={() => {
            void scoreboard.resetRaidTimer();
          }}
          onUploadTeamLogo={handleUploadTeamLogo}
          onRemoveTeamLogo={handleRemoveTeamLogo}
          onSwapTeams={() => {
            void scoreboard.swapTeams();
          }}
          onResetMatch={() => {
            void scoreboard.resetMatchScore();
          }}
          onOpenRemoteModal={() => {
            void copyValue('remote-ctrl', controlUrl);
          }}
          onDownloadPng={handleDownloadPng}
          onRequestPurchase={() => {}}
        />
      </div>
    </div>
  );
}
