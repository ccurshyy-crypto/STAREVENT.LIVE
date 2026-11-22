import { ChangeEvent, useState } from 'react';
import {
  ArrowLeftRight,
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  ImagePlus,
  Lock,
  Pause,
  Play,
  Radio,
  Redo2,
  RotateCcw,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Timer,
  Trash2,
  Trophy,
  Undo2,
  Users,
  Zap,
} from 'lucide-react';
import { Language } from '../data/content';
import { formatRemainingTime, OverlaySku, VerifiedOverlayToken } from '../data/overlayCatalog';
import {
  ConnectionStatus,
  sanitizeRoomIdClient,
  SyncTransport,
} from '../hooks/useOverlaySync';
import {
  KabaddiGraphicPanel,
  KabaddiHalf,
  KabaddiTimeoutTeam,
  LiveOverlayState,
  OverlayBackground,
} from '../types/overlay';
import { KabaddiGraphicOverlay } from './KabaddiGraphicOverlay';
import { formatClockMMSS, KabaddiScoreboardBar } from './KabaddiScoreboardBar';

type ConsoleTab = 'dashboard' | 'teams' | 'match-setup' | 'inputs' | 'output-config';

const TEAM_COLOR_SWATCHES = [
  '#C8102E',
  '#131D8A',
  '#EA580C',
  '#047857',
  '#7C3AED',
  '#B45309',
  '#0369A1',
  '#BE123C',
];

const OBS_CUSTOM_CSS =
  'html, body { background-color: rgba(0, 0, 0, 0) !important; margin: 0 auto; overflow: hidden; }';

interface VmixKabaddiControllerProps {
  lang: Language;
  state: LiveOverlayState;
  displayMatchSeconds: number;
  displayRaidSeconds: number;
  teamABinRemaining: number;
  teamBBinRemaining: number;
  connected: boolean;
  connectionStatus: ConnectionStatus;
  transport: SyncTransport;
  connectedDisplays: number;
  connectedControllers: number;
  roomInput: string;
  onChangeRoomInput: (val: string) => void;
  onGenerateMatchId: () => void;
  outputBg: OverlayBackground;
  onChangeOutputBg: (bg: OverlayBackground) => void;
  transparentBg: boolean;
  onToggleTransparentBg: () => void;
  lockModeInUrl: boolean;
  onToggleLockModeInUrl: () => void;
  obsBrowserUrl: string;
  vmixBrowserUrl: string;
  isPrivateDevPreview: boolean;
  isFreeDemo: boolean;
  isCurrentUnlocked: boolean;
  activeToken: VerifiedOverlayToken | null;
  currentSku: OverlaySku;
  nowTs: number;
  canUndo: boolean;
  canRedo: boolean;
  autoRulesEnabled: boolean;
  onToggleAutoRules: () => void;
  autoDemoActive: boolean;
  onToggleAutoDemo: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onUpdateState: (patch: Partial<LiveOverlayState>) => void;
  onSendAction: (action: string, payload?: Record<string, unknown>) => void;
  onTriggerAlert: (label: string) => void;
  onTimeout: (target: KabaddiTimeoutTeam) => void;
  onToggleMatchTimer: () => void;
  onSetMatchPreset: (seconds: number, autoStart?: boolean) => void;
  onToggleRaidTimer: () => void;
  onResetRaidTimer: () => void;
  onUploadTeamLogo: (team: 'A' | 'B', e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveTeamLogo: (team: 'A' | 'B') => void;
  onSwapTeams: () => void;
  onResetMatch: () => void;
  onOpenRemoteModal: () => void;
  onDownloadPng: () => void;
  onRequestPurchase: (sku: OverlaySku) => void;
}

export function VmixKabaddiController({
  lang,
  state,
  displayMatchSeconds,
  displayRaidSeconds,
  teamABinRemaining,
  teamBBinRemaining,
  connected,
  connectionStatus,
  transport,
  connectedDisplays,
  connectedControllers,
  roomInput,
  onChangeRoomInput,
  onGenerateMatchId,
  outputBg,
  onChangeOutputBg,
  transparentBg,
  onToggleTransparentBg,
  lockModeInUrl,
  onToggleLockModeInUrl,
  obsBrowserUrl,
  vmixBrowserUrl,
  isPrivateDevPreview,
  isFreeDemo,
  isCurrentUnlocked,
  activeToken,
  currentSku,
  nowTs,
  canUndo,
  canRedo,
  autoRulesEnabled,
  onToggleAutoRules,
  autoDemoActive,
  onToggleAutoDemo,
  onUndo,
  onRedo,
  onUpdateState,
  onSendAction,
  onTimeout,
  onToggleMatchTimer,
  onSetMatchPreset,
  onToggleRaidTimer,
  onResetRaidTimer,
  onUploadTeamLogo,
  onRemoveTeamLogo,
  onSwapTeams,
  onResetMatch,
  onOpenRemoteModal,
  onDownloadPng,
  onRequestPurchase,
}: VmixKabaddiControllerProps) {
  const [activeTab, setActiveTab] = useState<ConsoleTab>('dashboard');
  const [selectedTeam, setSelectedTeam] = useState<'A' | 'B'>('A');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const teamAOnMat = Math.max(0, Math.min(7, state.teamAPlayersOnMat ?? 7));
  const teamBOnMat = Math.max(0, Math.min(7, state.teamBPlayersOnMat ?? 7));
  const raidDuration = state.kabaddiRaidDuration ?? 30;
  const matchDuration = state.kabaddiMatchDuration ?? 1200;
  const activeGraphic = state.kabaddiGraphicPanel ?? 'none';

  const copyText = async (key: string, text: string) => {
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

  // Atomic point modifier + automatic raid timer reset when Auto Rules is ON
  const applyTeamPoints = (
    team: 'A' | 'B',
    kind: 'raid' | 'bonus' | 'lona',
    delta: number
  ) => {
    onSendAction(kind, { team, points: delta });
    if (autoRulesEnabled && delta > 0 && kind === 'raid') {
      // Automatically reset raid clock for the next raid when match is running
      onSendAction('raid_reset');
      if (state.matchRunning) {
        window.setTimeout(() => onSendAction('raid_toggle'), 120);
      }
    }
  };

  // Smart player count click: if Auto Rules is ON and count hits 0, automatically award All Out (+2) to opponent & revive all 7!
  const handleSetPlayersOnMat = (team: 'A' | 'B', nextCount: number) => {
    const clamped = Math.max(0, Math.min(7, nextCount));
    if (autoRulesEnabled && clamped === 0) {
      const winnerTeam = team === 'A' ? 'B' : 'A';
      onSendAction('all_out', { team: winnerTeam, points: 2 });
      return;
    }
    onSendAction('players_on_mat', { team, count: clamped });
  };

  const handleToggleGraphic = (panel: KabaddiGraphicPanel) => {
    onSendAction('graphic_panel', {
      panel: activeGraphic === panel ? 'none' : panel,
    });
  };

  const handleIssueCard = (card: 'yellow' | 'red' | 'green') => {
    onSendAction('card', { team: selectedTeam, card });
  };

  const handleUpdateStarting7 = (team: 'A' | 'B', index: number, value: string) => {
    const base =
      team === 'A'
        ? [...(state.teamAStarting7 ?? ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'])]
        : [...(state.teamBStarting7 ?? ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'])];
    while (base.length < 7) base.push(`PLAYER ${base.length + 1}`);
    base[index] = value;
    onUpdateState(team === 'A' ? { teamAStarting7: base } : { teamBStarting7: base });
  };

  const monitorBackgroundStyle = transparentBg
    ? outputBg === 'green'
      ? { backgroundColor: '#00B140' }
      : outputBg === 'blue'
        ? { backgroundColor: '#0047BB' }
        : {
            backgroundColor: '#131722',
            backgroundImage:
              'linear-gradient(45deg, #1E2534 25%, transparent 25%), linear-gradient(-45deg, #1E2534 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1E2534 75%), linear-gradient(-45deg, transparent 75%, #1E2534 75%)',
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          }
    : undefined;

  const tabs: Array<{ id: ConsoleTab; label: string }> = [
    { id: 'dashboard', label: 'Scoreboard Desk' },
    { id: 'teams', label: 'Teams & Logos' },
    { id: 'match-setup', label: 'Match Setup' },
    { id: 'inputs', label: 'Room & Keying' },
    { id: 'output-config', label: 'OBS / vMix URLs' },
  ];

  const graphicButtons: Array<{ id: KabaddiGraphicPanel; label: string }> = [
    { id: 'starting7', label: 'Starting 7' },
    { id: 'player_stats', label: 'Player Stats' },
    { id: 'match_stats', label: 'Match Stats' },
    { id: 'knockout', label: 'Knockout' },
    { id: 'substitutions', label: 'Substitutions' },
    { id: 'winners', label: 'Winners' },
  ];

  const renderTeamCard = (team: 'A' | 'B') => {
    const isA = team === 'A';
    const onMat = isA ? teamAOnMat : teamBOnMat;
    const outCount = Math.max(0, 7 - onMat);
    const score = isA ? state.teamAScore : state.teamBScore;
    const bonusPts = isA ? state.teamABonusPoints ?? 0 : state.teamBBonusPoints ?? 0;
    const lonaPts = isA ? state.teamALonaPoints ?? 0 : state.teamBLonaPoints ?? 0;
    const teamName = isA ? state.teamAName : state.teamBName;
    const accentHex = isA ? state.teamAColor || '#C8102E' : state.teamBColor || '#131D8A';

    return (
      <div className="bg-[#151B28]/95 border border-white/12 rounded-2xl overflow-hidden flex flex-col shadow-[0_12px_32px_rgba(0,0,0,0.35)]">
        {/* Clean Team Header with subtle team color tint */}
        <div
          className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3"
          style={{
            background: `linear-gradient(95deg, ${accentHex}44 0%, rgba(21,27,40,0.92) 72%)`,
          }}
        >
          <div className="min-w-0 flex-1">
            <span className="block text-[11px] font-medium text-zinc-300">
              {isA ? 'Team A (Left Side)' : 'Team B (Right Side)'}
            </span>
            <input
              type="text"
              aria-label={`Team ${team} Name`}
              value={teamName}
              onChange={(e) =>
                onUpdateState(isA ? { teamAName: e.target.value } : { teamBName: e.target.value })
              }
              className="mt-0.5 w-full bg-transparent font-display text-base sm:text-lg font-extrabold text-white focus:outline-none focus:bg-black/30 rounded px-1 -ml-1 transition-colors"
            />
          </div>

          {/* Big Clear Live Score Counter */}
          <div className="flex items-center gap-2 shrink-0 bg-black/45 border border-white/15 rounded-xl px-3.5 py-1.5">
            <span className="font-mono text-3xl sm:text-4xl font-black text-white tabular-nums leading-none">
              {score}
            </span>
          </div>
        </div>

        <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
          {/* Primary Add-Point Buttons (Big, Clear, Tactile for Beginners) */}
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applyTeamPoints(team, 'raid', 1)}
                className="min-h-[54px] py-2.5 px-2 rounded-xl bg-gradient-to-b from-[#2563EB] to-[#1D4ED8] hover:from-[#3B82F6] hover:to-[#2563EB] border border-[#93C5FD]/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_8px_18px_-8px_rgba(37,99,235,0.75)] text-white text-center transition-all active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
              >
                <span className="block font-mono text-base font-black leading-tight tabular-nums">+1</span>
                <span className="block text-[11px] font-semibold text-blue-100 leading-tight mt-0.5">
                  Raid Point
                </span>
              </button>

              <button
                type="button"
                onClick={() => applyTeamPoints(team, 'bonus', 2)}
                className="min-h-[54px] py-2.5 px-2 rounded-xl bg-gradient-to-b from-[#D97706] to-[#B45309] hover:from-[#F59E0B] hover:to-[#D97706] border border-[#FDE68A]/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_8px_18px_-8px_rgba(217,119,6,0.7)] text-white text-center transition-all active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
              >
                <span className="block font-mono text-base font-black leading-tight tabular-nums">+2</span>
                <span className="block text-[11px] font-semibold text-amber-100 leading-tight mt-0.5">
                  Bonus
                </span>
              </button>

              <button
                type="button"
                onClick={() => applyTeamPoints(team, 'lona', 3)}
                className="min-h-[54px] py-2.5 px-2 rounded-xl bg-gradient-to-b from-[#059669] to-[#047857] hover:from-[#10B981] hover:to-[#059669] border border-[#6EE7B7]/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_8px_18px_-8px_rgba(5,150,105,0.7)] text-white text-center transition-all active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
              >
                <span className="block font-mono text-base font-black leading-tight tabular-nums">+3</span>
                <span className="block text-[11px] font-semibold text-emerald-100 leading-tight mt-0.5">
                  Super / Lona
                </span>
              </button>
            </div>

            {/* Subtle Mistake-Correction Subtract Row */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applyTeamPoints(team, 'raid', -1)}
                className="min-h-[38px] py-1.5 px-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.11] border border-white/12 text-zinc-200 text-xs font-semibold transition-all active:scale-[0.97] tabular-nums"
              >
                -1 Raid
              </button>
              <button
                type="button"
                onClick={() => applyTeamPoints(team, 'bonus', -2)}
                className="min-h-[38px] py-1.5 px-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.11] border border-white/12 text-zinc-200 text-xs font-semibold transition-all active:scale-[0.97] tabular-nums"
              >
                -2 Bonus
              </button>
              <button
                type="button"
                onClick={() => applyTeamPoints(team, 'lona', -3)}
                className="min-h-[38px] py-1.5 px-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.11] border border-white/12 text-zinc-200 text-xs font-semibold transition-all active:scale-[0.97] tabular-nums"
              >
                -3 Lona
              </button>
            </div>
          </div>

          {/* Interactive Beginner-Friendly 7 Players On-Mat Tracker */}
          <div className="pt-3 border-t border-white/10 space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-zinc-200">
                <Users className="w-3.5 h-3.5 text-[#4ADE80]" aria-hidden="true" />
                <span>Players On Mat</span>
              </span>
              <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
                {onMat}/7 In · {outCount} Out · B:{bonusPts} · L:{lonaPts}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                  const active = num <= onMat;
                  return (
                    <button
                      key={`${team}-p-${num}`}
                      type="button"
                      onClick={() => handleSetPlayersOnMat(team, num)}
                      title={`Set ${teamName} Players On Mat to ${num}`}
                      className={`w-8 h-8 rounded-full font-mono text-xs font-extrabold border transition-all active:scale-90 tabular-nums ${
                        active
                          ? 'bg-[#16A34A] border-[#86EFAC] text-white shadow-[0_0_10px_rgba(22,163,74,0.5)]'
                          : 'bg-[#1D2434] border-red-400/40 text-red-300/80 hover:border-white/40'
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSetPlayersOnMat(team, onMat - 1)}
                  className="px-2.5 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-400/35 text-red-200 text-[11px] font-bold transition-all active:scale-95 whitespace-nowrap"
                >
                  1 Out
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPlayersOnMat(team, 7)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] border border-white/15 text-zinc-200 text-[11px] font-bold transition-all active:scale-95 whitespace-nowrap"
                >
                  All 7
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#0F1420]/90 backdrop-blur-md border border-white/14 rounded-2xl overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.65)]">
      {/* Top Studio Header Bar: Match ID, Live Sync Status, Auto Mode & Quick Utilities */}
      <div className="bg-[#0B0F19]/95 border-b border-white/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-display text-sm font-extrabold text-white tracking-tight">
            Kabaddi Live Studio
          </span>
          <span aria-hidden="true" className="text-zinc-600">·</span>

          <div className="inline-flex items-center gap-1.5 bg-[#151C2B] border border-white/15 rounded-lg px-2.5 py-1">
            <span className="font-mono text-[10px] font-bold text-zinc-400">MATCH ID</span>
            <input
              type="text"
              aria-label="Unique Match ID"
              value={roomInput}
              onChange={(e) => onChangeRoomInput(e.target.value)}
              className="w-24 bg-transparent font-mono text-xs font-extrabold text-[#FACC15] uppercase focus:outline-none"
            />
            <button
              type="button"
              onClick={onGenerateMatchId}
              title="Generate fresh unique Match ID"
              className="px-2 py-0.5 text-[10px] font-semibold bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
            >
              New
            </button>
          </div>

          <span
            className={`font-mono text-xs font-bold tabular-nums ${
              connectionStatus === 'live' && connected
                ? 'text-[#4ADE80]'
                : connectionStatus === 'reconnecting'
                  ? 'text-[#FACC15]'
                  : 'text-[#F87171]'
            }`}
          >
            {connectionStatus === 'live' && connected
              ? `${transport === 'ws' ? 'WS LIVE' : transport === 'firebase' ? 'CLOUD LIVE' : transport === 'sse' ? 'SSE LIVE' : 'SYNC LIVE'} (${connectedDisplays} vMix/OBS)`
              : connectionStatus === 'reconnecting'
                ? 'Reconnecting...'
                : 'Offline'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Automatic Scoreboard Rules Toggle */}
          <button
            type="button"
            onClick={onToggleAutoRules}
            aria-pressed={autoRulesEnabled}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all active:scale-95 whitespace-nowrap ${
              autoRulesEnabled
                ? 'bg-[#14532D]/85 border-[#4ADE80]/60 text-[#BBF7D0]'
                : 'bg-white/[0.06] border-white/15 text-zinc-300 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
            <span>Auto Mode: {autoRulesEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* 1-Click Auto Demo Play for Instant Hands-Free vMix Testing */}
          <button
            type="button"
            onClick={onToggleAutoDemo}
            aria-pressed={autoDemoActive}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all active:scale-95 whitespace-nowrap ${
              autoDemoActive
                ? 'bg-[#7C3AED] border-[#C4B5FD] text-white shadow-[0_0_16px_rgba(124,58,237,0.55)]'
                : 'btn-glass-pro text-zinc-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
            <span>{autoDemoActive ? 'Stop Auto Play' : 'Auto Play'}</span>
          </button>

          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            title="Undo last action"
            className="btn-glass-pro inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-zinc-100 disabled:opacity-35 whitespace-nowrap"
          >
            <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Undo</span>
          </button>

          <button
            type="button"
            disabled={!canRedo}
            onClick={onRedo}
            title="Redo last action"
            className="btn-glass-pro inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-zinc-100 disabled:opacity-35 whitespace-nowrap"
          >
            <Redo2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Redo</span>
          </button>

          <button
            type="button"
            onClick={onOpenRemoteModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-gradient-to-b from-[#2563EB] to-[#1D4ED8] hover:from-[#3B82F6] hover:to-[#2563EB] border border-[#93C5FD]/40 rounded-xl transition-all active:scale-95 whitespace-nowrap"
          >
            <Smartphone className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
            <span>Mobile QR</span>
            {connectedControllers > 0 && (
              <span className="px-1.5 py-0.5 bg-[#FACC15] text-black rounded-md font-mono text-[10px]">
                {connectedControllers}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onUpdateState({ visible: !state.visible })}
            aria-pressed={state.visible}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all active:scale-95 whitespace-nowrap ${
              state.visible
                ? 'btn-primary-pro text-white'
                : 'bg-white/[0.06] text-zinc-300 border-white/15'
            }`}
          >
            {state.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{state.visible ? 'On Air' : 'Hidden'}</span>
          </button>
        </div>
      </div>

      {/* Clean Segmented Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Kabaddi Broadcast Controller Tabs"
        className="bg-[#121724] border-b border-white/10 px-4 py-2 flex items-center gap-1.5 overflow-x-auto"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-[#2563EB] text-white shadow-[0_6px_16px_-6px_rgba(37,99,235,0.85)]'
                  : 'text-zinc-300 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ================= TAB 1: BEGINNER-FRIENDLY SCOREBOARD DESK ================= */}
      {activeTab === 'dashboard' && (
        <div className="p-4 sm:p-5 space-y-5">
          {/* Beginner 3-Step Helper + 1-Click Copy vMix URL */}
          <div className="bg-[#151C2B]/90 border border-white/10 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-300">
              <span className="font-semibold text-[#FACC15]">Quick Guide:</span>
              <span>1. Copy vMix URL</span>
              <span aria-hidden="true" className="text-zinc-600">→</span>
              <span>2. Click Start Match</span>
              <span aria-hidden="true" className="text-zinc-600">→</span>
              <span>3. Tap +1 / +2 / +3 (Clock, All-Out &amp; Top Alerts run automatically)</span>
            </div>

            {isCurrentUnlocked ? (
              <button
                type="button"
                onClick={() => copyText('quick-vmix', vmixBrowserUrl)}
                className="btn-gold-pro inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold text-black rounded-lg whitespace-nowrap shrink-0"
              >
                {copiedKey === 'quick-vmix' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'quick-vmix' ? 'vMix URL Copied!' : 'Copy vMix URL'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onRequestPurchase(currentSku)}
                className="btn-gold-pro inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold text-black rounded-lg whitespace-nowrap shrink-0"
              >
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Unlock vMix URL (₹1)</span>
              </button>
            )}
          </div>

          {/* LIVE FULL-WIDTH BROADCAST MONITOR (Shows Inside-Scoreboard Animations Live!) */}
          <div className="bg-[#0B0F17] border border-white/12 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-4 py-2 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 bg-[#121724]">
              <div className="flex items-center gap-2 text-xs">
                <Radio className="w-3.5 h-3.5 text-[#EF4444]" aria-hidden="true" />
                <span className="font-semibold text-white">Live vMix / OBS Overlay Preview</span>
                <span aria-hidden="true" className="text-zinc-600">·</span>
                <span className="text-zinc-400">Alerts animate inside scoreboard</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleTransparentBg}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-zinc-100 transition-colors"
                >
                  Background:{' '}
                  {transparentBg
                    ? outputBg === 'transparent'
                      ? 'Transparent'
                      : outputBg.toUpperCase()
                    : 'Dark Preview'}
                </button>
              </div>
            </div>

            <div
              className={`relative w-full min-h-[175px] sm:min-h-[215px] overflow-hidden flex flex-col justify-between p-4 sm:p-5 transition-opacity duration-200 ${
                state.visible ? 'opacity-100' : 'opacity-25'
              } ${transparentBg ? '' : 'bg-gradient-to-br from-[#0F172A] via-[#131924] to-[#09090B]'}`}
              style={monitorBackgroundStyle}
            >
              {/* Active Broadcast Graphic Slate (Starting 7 / Stats / Winners) */}
              <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center py-2">
                {activeGraphic !== 'none' && (
                  <KabaddiGraphicOverlay state={state} variant="studio" />
                )}
              </div>

              {/* Live Animated Curved Scoreboard Bar with Inside-Scoreboard Event Drawer */}
              <div className="relative z-10 w-full max-w-4xl mx-auto pt-4">
                <KabaddiScoreboardBar
                  variant="studio"
                  teamAName={state.teamAName}
                  teamACode={state.teamACode}
                  teamAColor={state.teamAColor}
                  teamAScore={state.teamAScore}
                  teamABonusPoints={state.teamABonusPoints}
                  teamALonaPoints={state.teamALonaPoints}
                  teamAPlayersOnMat={state.teamAPlayersOnMat}
                  teamALogoUrl={state.teamALogoUrl}
                  teamAGreenCards={state.teamAGreenCards}
                  teamAYellowCards={state.teamAYellowCards}
                  teamARedCards={state.teamARedCards}
                  teamABinRemaining={teamABinRemaining}
                  teamBName={state.teamBName}
                  teamBCode={state.teamBCode}
                  teamBColor={state.teamBColor}
                  teamBScore={state.teamBScore}
                  teamBBonusPoints={state.teamBBonusPoints}
                  teamBLonaPoints={state.teamBLonaPoints}
                  teamBPlayersOnMat={state.teamBPlayersOnMat}
                  teamBLogoUrl={state.teamBLogoUrl}
                  teamBGreenCards={state.teamBGreenCards}
                  teamBYellowCards={state.teamBYellowCards}
                  teamBRedCards={state.teamBRedCards}
                  teamBBinRemaining={teamBBinRemaining}
                  matchSeconds={displayMatchSeconds}
                  raidSeconds={displayRaidSeconds}
                  raidDuration={state.kabaddiRaidDuration}
                  raidRunning={state.raidRunning}
                  halfLabel={state.kabaddiHalf}
                  matchStatus={state.matchStatus}
                  timeoutTeam={state.timeoutTeam}
                  doOrDie={state.doOrDie}
                  alertText={state.kabaddiAlert}
                  tournamentTitle={state.kabaddiTitle}
                  subtitle={state.kabaddiSubtitle}
                  showDemoWatermark={isFreeDemo}
                />
              </div>
            </div>
          </div>

          {/* TEAM A & TEAM B BIG SCORE CARDS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {renderTeamCard('A')}
            {renderTeamCard('B')}
          </div>

          {/* CLOCKS + QUICK MATCH EVENTS (3 Clean Cards) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* MATCH CLOCK & HALF CARD */}
            <div className="lg:col-span-4 bg-[#151B28]/95 border border-white/12 rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-sm font-bold text-white">
                  <Clock className="w-4 h-4 text-[#60A5FA]" aria-hidden="true" />
                  <span>Match Clock</span>
                </span>
                <span className="font-mono text-2xl font-black text-white tabular-nums">
                  {formatClockMMSS(displayMatchSeconds)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onToggleMatchTimer}
                  className={`min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-extrabold transition-all active:scale-95 ${
                    state.matchRunning
                      ? 'btn-primary-pro text-white'
                      : 'bg-gradient-to-b from-[#22C55E] to-[#16A34A] hover:from-[#4ADE80] hover:to-[#22C55E] text-white border border-[#86EFAC]/50 shadow-[0_8px_18px_-8px_rgba(34,197,94,0.75)]'
                  }`}
                >
                  {state.matchRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{state.matchRunning ? 'Pause Match' : 'Start Match'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSetMatchPreset(matchDuration, false)}
                  className="btn-glass-pro min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-100"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
                  <span>Reset Clock</span>
                </button>
              </div>

              {/* Half Switcher */}
              <div className="grid grid-cols-4 gap-1.5">
                {(
                  [
                    { id: '1ST HALF', label: '1st Half' },
                    { id: '2ND HALF', label: '2nd Half' },
                    { id: 'HALF TIME', label: 'Half Time' },
                    { id: 'FULL TIME', label: 'Full Time' },
                  ] as const
                ).map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => onSendAction('half', { half: h.id })}
                    className={`min-h-[36px] px-1.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all active:scale-95 ${
                      state.kabaddiHalf === h.id
                        ? 'bg-[#2563EB] border-[#93C5FD] text-white'
                        : 'bg-white/[0.04] border-white/12 text-zinc-300 hover:text-white'
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <label htmlFor="vmix-match-duration" className="text-xs text-zinc-400">
                  Half Length
                </label>
                <select
                  id="vmix-match-duration"
                  value={matchDuration}
                  onChange={(e) => {
                    const sec = Number(e.target.value) || 1200;
                    onUpdateState({ kabaddiMatchDuration: sec });
                    onSetMatchPreset(sec, false);
                  }}
                  className="px-3 py-1.5 text-xs font-mono font-bold bg-[#0E131D] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                >
                  <option value={1200}>20:00 × 2</option>
                  <option value={900}>15:00 × 2</option>
                  <option value={600}>10:00 × 2</option>
                  <option value={30}>00:30 Demo</option>
                </select>
              </div>
            </div>

            {/* 30-SECOND RAID CLOCK CARD */}
            <div className="lg:col-span-4 bg-[#151B28]/95 border border-white/12 rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-sm font-bold text-white">
                  <Timer className="w-4 h-4 text-[#FACC15]" aria-hidden="true" />
                  <span>Raid Timer</span>
                </span>
                <span
                  className={`font-mono text-2xl font-black tabular-nums ${
                    displayRaidSeconds <= 10 ? 'text-[#F87171]' : 'text-[#FACC15]'
                  }`}
                >
                  {String(displayRaidSeconds).padStart(2, '0')}s
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!state.raidRunning) onToggleRaidTimer();
                  }}
                  className={`min-h-[44px] rounded-xl text-xs font-extrabold transition-all active:scale-95 ${
                    state.raidRunning
                      ? 'bg-[#16A34A] border border-[#86EFAC] text-white shadow-[0_0_16px_rgba(34,197,94,0.45)]'
                      : 'bg-gradient-to-b from-[#22C55E] to-[#16A34A] hover:from-[#4ADE80] hover:to-[#22C55E] text-white border border-[#86EFAC]/45'
                  }`}
                >
                  Start
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (state.raidRunning) onToggleRaidTimer();
                  }}
                  className="btn-primary-pro min-h-[44px] rounded-xl text-xs font-extrabold text-white"
                >
                  Stop
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateState({
                      raidRunning: false,
                      raidSeconds: raidDuration,
                      raidUpdatedAt: Date.now(),
                    });
                  }}
                  className="btn-gold-pro min-h-[44px] rounded-xl text-xs font-extrabold text-black"
                >
                  Reset
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onTimeout(state.timeoutTeam ? null : 'OFFICIAL')}
                  className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                    state.timeoutTeam
                      ? 'bg-[#DC2626] border-[#FACC15] text-[#FEF08A]'
                      : 'btn-glass-pro text-white'
                  }`}
                >
                  {state.timeoutTeam ? 'End Timeout' : 'Timeout'}
                </button>
                <button
                  type="button"
                  onClick={() => onSendAction('do_or_die', { active: !state.doOrDie })}
                  className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                    state.doOrDie
                      ? 'bg-[#DC2626] border-[#FACC15] text-[#FEF08A] shadow-[0_0_14px_rgba(250,204,21,0.45)]'
                      : 'btn-glass-pro text-white'
                  }`}
                >
                  {state.doOrDie ? 'Do-or-Die: ON' : 'Do-or-Die Raid'}
                </button>
              </div>

              <div className="flex items-center justify-between gap-2">
                <label htmlFor="vmix-raid-duration" className="text-xs text-zinc-400">
                  Raid Duration
                </label>
                <select
                  id="vmix-raid-duration"
                  value={raidDuration}
                  onChange={(e) => {
                    const sec = Number(e.target.value) || 30;
                    onUpdateState({
                      kabaddiRaidDuration: sec,
                      raidSeconds: sec,
                      raidRunning: false,
                      raidUpdatedAt: Date.now(),
                    });
                  }}
                  className="px-3 py-1.5 text-xs font-mono font-bold bg-[#0E131D] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                >
                  <option value={30}>30 seconds</option>
                  <option value={20}>20 seconds</option>
                  <option value={15}>15 seconds</option>
                </select>
              </div>
            </div>

            {/* SPECIAL PLAYS & REFEREE CARDS */}
            <div className="lg:col-span-4 bg-[#151B28]/95 border border-white/12 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-white">
                  <Flame className="w-4 h-4 text-[#F97316]" aria-hidden="true" />
                  <span>Quick Events &amp; Cards</span>
                </span>
                <div className="inline-flex items-center gap-1 p-0.5 bg-[#0D111B] border border-white/12 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setSelectedTeam('A')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                      selectedTeam === 'A'
                        ? 'bg-[#DC2626] text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Team A
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTeam('B')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                      selectedTeam === 'B'
                        ? 'bg-[#2563EB] text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Team B
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => applyTeamPoints(selectedTeam, 'raid', 3)}
                  className="btn-primary-pro min-h-[44px] px-2 py-2 rounded-xl text-[11px] font-extrabold text-white leading-tight"
                >
                  Super Raid +3
                </button>
                <button
                  type="button"
                  onClick={() => onSendAction('tackle', { team: selectedTeam, points: 2 })}
                  className="btn-primary-pro min-h-[44px] px-2 py-2 rounded-xl text-[11px] font-extrabold text-white leading-tight"
                >
                  Super Tackle +2
                </button>
                <button
                  type="button"
                  onClick={() => onSendAction('all_out', { team: selectedTeam, points: 2 })}
                  className="btn-primary-pro min-h-[44px] px-2 py-2 rounded-xl text-[11px] font-extrabold text-white leading-tight"
                >
                  All Out +2
                </button>
              </div>

              <div className="pt-2 border-t border-white/10 space-y-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
                  <span>Referee Cards for Team {selectedTeam}</span>
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleIssueCard('green')}
                    className="min-h-[40px] px-2 py-1.5 rounded-xl bg-[#14532D] hover:bg-[#166534] border border-[#4ADE80]/50 text-[#DCFCE7] text-xs font-bold transition-all active:scale-95"
                  >
                    Green Card
                  </button>
                  <button
                    type="button"
                    onClick={() => handleIssueCard('yellow')}
                    className="min-h-[40px] px-2 py-1.5 rounded-xl bg-[#713F12] hover:bg-[#854D0E] border border-[#FACC15]/60 text-[#FEF08A] text-xs font-bold transition-all active:scale-95"
                  >
                    Yellow Card
                  </button>
                  <button
                    type="button"
                    onClick={() => handleIssueCard('red')}
                    className="min-h-[40px] px-2 py-1.5 rounded-xl bg-[#7F1D1D] hover:bg-[#991B1B] border border-[#F87171]/60 text-white text-xs font-bold transition-all active:scale-95"
                  >
                    Red Card
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* FULL-SCREEN BROADCAST GRAPHIC SLATES + TOURNAMENT HEADER DETAILS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 bg-[#151B28]/95 border border-white/12 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-sm font-bold text-white">
                  <Trophy className="w-4 h-4 text-[#FACC15]" aria-hidden="true" />
                  <span>Broadcast Graphic Slates</span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateState({
                      mode: 'kabaddi',
                      visible: true,
                      kabaddiGraphicPanel: 'none',
                      matchStatus: 'LIVE',
                    })
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    activeGraphic === 'none' && state.visible
                      ? 'bg-[#16A34A] border-[#86EFAC] text-white'
                      : 'btn-glass-pro text-zinc-200'
                  }`}
                >
                  Live Scoreboard
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {graphicButtons.map((btn) => {
                  const isOn = activeGraphic === btn.id;
                  return (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => handleToggleGraphic(btn.id)}
                      className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                        isOn
                          ? 'bg-[#DC2626] border-[#FACC15] text-[#FEF08A] shadow-[0_0_12px_rgba(250,204,21,0.35)]'
                          : 'btn-glass-pro text-zinc-100'
                      }`}
                    >
                      {btn.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-5 bg-[#151B28]/95 border border-white/12 rounded-2xl p-4 space-y-3">
              <span className="block text-sm font-bold text-white">
                Tournament &amp; Venue Info
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label htmlFor="kbd-tournament" className="block text-[11px] text-zinc-400">
                    Tournament Title
                  </label>
                  <input
                    id="kbd-tournament"
                    type="text"
                    value={state.kabaddiTitle}
                    onChange={(e) => onUpdateState({ kabaddiTitle: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold bg-[#0E131D] border border-white/15 rounded-xl text-white focus:outline-none focus:border-[#FACC15]"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="kbd-venue" className="block text-[11px] text-zinc-400">
                    Venue / Ground
                  </label>
                  <input
                    id="kbd-venue"
                    type="text"
                    value={state.kabaddiVenue ?? ''}
                    onChange={(e) =>
                      onUpdateState({
                        kabaddiVenue: e.target.value,
                        kabaddiSubtitle: `${state.kabaddiMatchType || 'LIVE'} · ${e.target.value}`,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-semibold bg-[#0E131D] border border-white/15 rounded-xl text-white focus:outline-none focus:border-[#FACC15]"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="kbd-match-type" className="block text-[11px] text-zinc-400">
                    Match Stage (Final / Semi)
                  </label>
                  <input
                    id="kbd-match-type"
                    type="text"
                    value={state.kabaddiMatchType ?? ''}
                    onChange={(e) =>
                      onUpdateState({
                        kabaddiMatchType: e.target.value,
                        kabaddiSubtitle: `${e.target.value} · ${state.kabaddiVenue || 'ARENA'}`,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-semibold bg-[#0E131D] border border-white/15 rounded-xl text-white focus:outline-none focus:border-[#FACC15]"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="kbd-league" className="block text-[11px] text-zinc-400">
                    League / Sponsor
                  </label>
                  <input
                    id="kbd-league"
                    type="text"
                    value={state.kabaddiLeague ?? ''}
                    onChange={(e) => onUpdateState({ kabaddiLeague: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold bg-[#0E131D] border border-white/15 rounded-xl text-white focus:outline-none focus:border-[#FACC15]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: TEAMS (LOGOS, COLORS, STARTING 7 EDITOR) ================= */}
      {activeTab === 'teams' && (
        <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {(['A', 'B'] as const).map((team) => {
            const isA = team === 'A';
            const name = isA ? state.teamAName : state.teamBName;
            const code = isA ? state.teamACode : state.teamBCode;
            const color = isA ? state.teamAColor : state.teamBColor;
            const logo = isA ? state.teamALogoUrl : state.teamBLogoUrl;
            const squad = isA
              ? state.teamAStarting7 ?? ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']
              : state.teamBStarting7 ?? ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];

            return (
              <div
                key={`team-tab-${team}`}
                className="bg-[#151B28]/95 border border-white/12 rounded-2xl p-4 space-y-4"
              >
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
                  <span className="font-display text-sm font-bold text-white">
                    {isA ? 'Team A Configuration (Left Wing)' : 'Team B Configuration (Right Wing)'}
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl cursor-pointer transition-colors">
                      <ImagePlus className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{logo ? 'Change Logo' : 'Upload Logo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => onUploadTeamLogo(team, e)}
                        className="sr-only"
                      />
                    </label>
                    {logo && (
                      <button
                        type="button"
                        onClick={() => onRemoveTeamLogo(team)}
                        aria-label={`Remove Team ${team} Logo`}
                        className="p-1.5 text-zinc-400 hover:text-[#F87171] border border-white/15 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="col-span-2 space-y-1">
                    <label className="block text-xs text-zinc-400">Team Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) =>
                        onUpdateState(isA ? { teamAName: e.target.value } : { teamBName: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs font-bold bg-[#0E131D] border border-white/15 rounded-xl text-white focus:outline-none focus:border-[#FACC15]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-zinc-400">Short Code</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={code}
                      onChange={(e) =>
                        onUpdateState(
                          isA
                            ? { teamACode: e.target.value.toUpperCase() }
                            : { teamBCode: e.target.value.toUpperCase() }
                        )
                      }
                      className="w-full px-3 py-2 text-xs font-mono font-bold bg-[#0E131D] border border-white/15 rounded-xl text-white focus:outline-none focus:border-[#FACC15]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-xs text-zinc-400">Scoreboard Wing Color</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {TEAM_COLOR_SWATCHES.map((swatch) => (
                      <button
                        key={swatch}
                        type="button"
                        onClick={() =>
                          onUpdateState(isA ? { teamAColor: swatch } : { teamBColor: swatch })
                        }
                        aria-label={`Set Team ${team} color ${swatch}`}
                        className={`w-7 h-7 rounded-lg border-2 transition-transform ${
                          color === swatch ? 'border-[#FACC15] scale-110' : 'border-white/25'
                        }`}
                        style={{ backgroundColor: swatch }}
                      />
                    ))}
                    <input
                      type="color"
                      aria-label={`Custom Team ${team} color`}
                      value={color}
                      onChange={(e) =>
                        onUpdateState(isA ? { teamAColor: e.target.value } : { teamBColor: e.target.value })
                      }
                      className="w-8 h-7 rounded-lg bg-transparent border border-white/20 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-xs text-zinc-400">
                    Starting 7 Lineup (Synced to Starting 7 Graphic)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[0, 1, 2, 3, 4, 5, 6].map((idx) => (
                      <input
                        key={`p-${team}-${idx}`}
                        type="text"
                        value={squad[idx] ?? ''}
                        onChange={(e) => handleUpdateStarting7(team, idx, e.target.value)}
                        placeholder={`Player ${idx + 1}`}
                        className="px-3 py-2 text-xs bg-[#0E131D] border border-white/12 rounded-xl text-white focus:outline-none focus:border-[#FACC15]"
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= TAB 3: MATCH SETUP ================= */}
      {activeTab === 'match-setup' && (
        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#151B28]/95 border border-white/12 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-bold text-white">Match Half &amp; Bottom Ticker</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['1ST HALF', '2ND HALF', 'HALF TIME', 'FULL TIME'] as KabaddiHalf[]).map((half) => (
                  <button
                    key={half}
                    type="button"
                    onClick={() => onSendAction('half', { half })}
                    className={`min-h-[40px] py-2 px-2 text-xs font-bold rounded-xl border transition-all ${
                      state.kabaddiHalf === half
                        ? 'bg-[#2563EB] text-white border-[#93C5FD]'
                        : 'btn-glass-pro text-zinc-200'
                    }`}
                  >
                    {half}
                  </button>
                ))}
              </div>
              <div className="space-y-1">
                <label className="block text-xs text-zinc-400">Bottom Ticker Subtitle</label>
                <input
                  type="text"
                  value={state.kabaddiSubtitle}
                  onChange={(e) => onUpdateState({ kabaddiSubtitle: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#0E131D] border border-white/15 rounded-xl text-white focus:outline-none focus:border-[#FACC15]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/10">
                {(
                  [
                    { key: 'championTeam', label: 'Champion Team' },
                    { key: 'runnerUpTeam', label: 'Runner Up Team' },
                    { key: 'thirdPlaceTeam', label: '3rd Place Team' },
                    { key: 'fourthPlaceTeam', label: '4th Place Team' },
                  ] as const
                ).map((item) => (
                  <div key={item.key} className="space-y-1">
                    <label className="block text-[11px] text-zinc-400">{item.label}</label>
                    <input
                      type="text"
                      value={state[item.key] ?? ''}
                      onChange={(e) => onUpdateState({ [item.key]: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-semibold bg-[#0E131D] border border-white/15 rounded-xl text-white focus:outline-none focus:border-[#FACC15]"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#151B28]/95 border border-white/12 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-bold text-white">Quick Match Reset &amp; Swap</p>
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={onSwapTeams}
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-b from-[#2563EB] to-[#1D4ED8] hover:from-[#3B82F6] hover:to-[#2563EB] text-white transition-all active:scale-95"
                >
                  <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />
                  <span>Swap Team A ↔ Team B</span>
                </button>
                <button
                  type="button"
                  onClick={onResetRaidTimer}
                  className="btn-gold-pro min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-extrabold rounded-xl text-black"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  <span>Reset 30s Raid Timer</span>
                </button>
                <button
                  type="button"
                  onClick={onResetMatch}
                  className="btn-primary-pro min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-extrabold rounded-xl text-white"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  <span>Reset Full Match Score &amp; Cards</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: INPUTS ================= */}
      {activeTab === 'inputs' && (
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#151B28]/95 border border-white/12 rounded-2xl p-4 space-y-2.5">
              <label htmlFor="vmix-room-input" className="block text-sm font-bold text-white">
                Unique Match / Room ID
              </label>
              <input
                id="vmix-room-input"
                type="text"
                value={roomInput}
                onChange={(e) => onChangeRoomInput(sanitizeRoomIdClient(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-[#0E131D] border border-white/15 rounded-xl text-[#FACC15] focus:outline-none focus:border-[#FACC15]"
              />
              <p className="text-xs text-zinc-400 leading-relaxed">
                OBS Studio, vMix, and remote mobile controllers using this same Match ID stay synced live.
              </p>
            </div>

            <div className="bg-[#151B28]/95 border border-white/12 rounded-2xl p-4 space-y-2.5">
              <span className="block text-sm font-bold text-white">Output Background Key</span>
              <div className="grid grid-cols-3 gap-2">
                {(['transparent', 'green', 'blue'] as OverlayBackground[]).map((bgOpt) => (
                  <button
                    key={bgOpt}
                    type="button"
                    onClick={() => onChangeOutputBg(bgOpt)}
                    className={`min-h-[42px] py-2 text-xs font-bold rounded-xl border transition-all ${
                      outputBg === bgOpt
                        ? 'bg-white text-black border-white'
                        : 'btn-glass-pro text-zinc-200'
                    }`}
                  >
                    {bgOpt === 'transparent' ? 'Alpha' : bgOpt === 'green' ? 'Green' : 'Blue'}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#151B28]/95 border border-white/12 rounded-2xl p-4 space-y-2.5">
              <span className="block text-sm font-bold text-white">URL Mode &amp; Remote Control</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onToggleLockModeInUrl}
                  className={`flex-1 min-h-[42px] py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                    lockModeInUrl
                      ? 'btn-gold-pro text-black'
                      : 'btn-glass-pro text-zinc-100'
                  }`}
                >
                  {lockModeInUrl ? 'Locked: Kabaddi' : 'Auto-Follow'}
                </button>
                <button
                  type="button"
                  onClick={onOpenRemoteModal}
                  className="flex-1 min-h-[42px] py-2 px-3 text-xs font-bold rounded-xl bg-gradient-to-b from-[#2563EB] to-[#1D4ED8] hover:from-[#3B82F6] hover:to-[#2563EB] text-white"
                >
                  Open Mobile QR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 5: OUTPUT CONFIG (OBS & vMix LIVE URLs) ================= */}
      {activeTab === 'output-config' && (
        <div className="p-4 sm:p-5 space-y-4">
          {isCurrentUnlocked ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#151B28]/95 border border-white/12 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">OBS Studio · Browser Source</span>
                  <span className="font-mono text-xs text-[#FACC15]">1920 × 1080 · 60fps</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={obsBrowserUrl}
                    className="flex-1 min-w-0 px-3 py-2 text-xs font-mono bg-[#0E131D] border border-white/15 rounded-xl text-zinc-200"
                  />
                  <button
                    type="button"
                    onClick={() => copyText('obs-tab', obsBrowserUrl)}
                    className="btn-primary-pro inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl whitespace-nowrap"
                  >
                    {copiedKey === 'obs-tab' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'obs-tab' ? 'Copied' : 'Copy OBS'}</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => copyText('css-tab', OBS_CUSTOM_CSS)}
                  className="text-xs font-semibold text-[#FACC15] hover:text-white transition-colors"
                >
                  {copiedKey === 'css-tab' ? 'OBS Transparent CSS Copied' : 'Copy OBS Transparent Custom CSS'}
                </button>
              </div>

              <div className="bg-[#151B28]/95 border border-white/12 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">vMix · Web Browser Input</span>
                  <span className="font-mono text-xs text-[#FACC15]">Overlay Ch 1–4</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={vmixBrowserUrl}
                    className="flex-1 min-w-0 px-3 py-2 text-xs font-mono bg-[#0E131D] border border-white/15 rounded-xl text-zinc-200"
                  />
                  <button
                    type="button"
                    onClick={() => copyText('vmix-tab', vmixBrowserUrl)}
                    className="btn-primary-pro inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl whitespace-nowrap"
                  >
                    {copiedKey === 'vmix-tab' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'vmix-tab' ? 'Copied' : 'Copy vMix'}</span>
                  </button>
                </div>
                <p className="text-xs text-zinc-400">
                  Add Input → Web Browser → 1920×1080 → Overlay [1]
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-[#151B28]/95 border border-[#FACC15]/40 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#FACC15]" aria-hidden="true" />
                  <span>OBS &amp; vMix Pro Watermark-Free URLs Locked</span>
                </p>
                <p className="text-xs text-zinc-400">
                  Pay ₹1 for automatic 1-Day (24-hour) unlock — or use FREE Demo above right away.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRequestPurchase(currentSku)}
                className="btn-gold-pro inline-flex items-center gap-2 px-5 py-2.5 text-xs font-extrabold text-black rounded-xl"
              >
                <span>Pay ₹1 &amp; Unlock (24h)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Persistent Bottom Quick OBS/vMix Action Bar */}
      <div className="bg-[#0B0F19]/95 border-t border-white/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono">
          <span className="inline-flex items-center gap-1.5 text-zinc-200 font-bold">
            <Radio className="w-3.5 h-3.5 text-[#EF4444]" aria-hidden="true" />
            <span>MATCH: {roomInput}</span>
          </span>
          <span aria-hidden="true" className="text-zinc-600">·</span>
          <span className="text-[#4ADE80] font-semibold">
            {isFreeDemo
              ? 'FREE DEMO ACTIVE'
              : isCurrentUnlocked && activeToken
                ? `UNLOCKED · ${formatRemainingTime(activeToken.expiresAt, nowTs)} LEFT`
                : 'PRO OVERLAY · ₹1 (24H)'}
          </span>
          {isPrivateDevPreview && (
            <>
              <span aria-hidden="true" className="text-zinc-600">·</span>
              <span className="text-[#FACC15]">Use Public Shared URL for desktop OBS/vMix</span>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isCurrentUnlocked ? (
            <>
              <button
                type="button"
                onClick={() => copyText('obs-bar', obsBrowserUrl)}
                className="btn-glass-pro inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white rounded-xl whitespace-nowrap"
              >
                {copiedKey === 'obs-bar' ? <Check className="w-3.5 h-3.5 text-[#4ADE80]" /> : <Copy className="w-3.5 h-3.5 text-[#FACC15]" />}
                <span>{copiedKey === 'obs-bar' ? 'OBS URL Copied' : 'Copy OBS URL'}</span>
              </button>
              <button
                type="button"
                onClick={() => copyText('vmix-bar', vmixBrowserUrl)}
                className="btn-glass-pro inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white rounded-xl whitespace-nowrap"
              >
                {copiedKey === 'vmix-bar' ? <Check className="w-3.5 h-3.5 text-[#4ADE80]" /> : <Copy className="w-3.5 h-3.5 text-[#FACC15]" />}
                <span>{copiedKey === 'vmix-bar' ? 'vMix URL Copied' : 'Copy vMix URL'}</span>
              </button>
              <button
                type="button"
                onClick={onDownloadPng}
                className="btn-gold-pro inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold text-black rounded-xl whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Download PNG</span>
              </button>
              <a
                href={obsBrowserUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary-pro inline-flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold text-white rounded-xl whitespace-nowrap"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{lang === 'mr' ? 'आउटपुट पहा' : 'Open vMix Output'}</span>
              </a>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onRequestPurchase(currentSku)}
              className="btn-primary-pro inline-flex items-center gap-2 px-4 py-2 text-xs font-extrabold text-white rounded-xl whitespace-nowrap"
            >
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="font-mono text-[#FACC15]">₹1 OFFER</span>
              <span>Unlock OBS &amp; vMix URLs</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
