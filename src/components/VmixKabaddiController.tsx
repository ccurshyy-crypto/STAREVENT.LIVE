import { ChangeEvent, useState } from 'react';
import {
  ArrowLeftRight,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  ImagePlus,
  Lock,
  Radio,
  Redo2,
  RotateCcw,
  Smartphone,
  Trash2,
  Undo2,
} from 'lucide-react';
import { Language } from '../data/content';
import { formatRemainingTime, OverlaySku, VerifiedOverlayToken } from '../data/overlayCatalog';
import { sanitizeRoomIdClient } from '../hooks/useOverlaySync';
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
  connectedDisplays: number;
  connectedControllers: number;
  roomInput: string;
  onChangeRoomInput: (val: string) => void;
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
  onUndo: () => void;
  onRedo: () => void;
  onUpdateState: (patch: Partial<LiveOverlayState>) => void;
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
  connectedDisplays,
  connectedControllers,
  roomInput,
  onChangeRoomInput,
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
  onUndo,
  onRedo,
  onUpdateState,
  onTriggerAlert,
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
  const teamAOut = Math.max(0, 7 - teamAOnMat);
  const teamBOut = Math.max(0, 7 - teamBOnMat);
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

  // Point modifiers matching exact vMix buttons (+1/-1 Raid, +2/-2 Bonus, +3/-3 Lona)
  const applyTeamPoints = (
    team: 'A' | 'B',
    kind: 'raid' | 'bonus' | 'lona',
    delta: number
  ) => {
    const isA = team === 'A';
    const currScore = isA ? state.teamAScore : state.teamBScore;
    const nextScore = Math.max(0, currScore + delta);
    const labelName = (isA ? state.teamAName : state.teamBName) || (isA ? 'TEAM A' : 'TEAM B');

    if (kind === 'raid') {
      const nextRaid = Math.max(0, (isA ? state.teamARaidPoints ?? 0 : state.teamBRaidPoints ?? 0) + delta);
      onUpdateState(
        isA
          ? { mode: 'kabaddi', teamAScore: nextScore, teamARaidPoints: nextRaid }
          : { mode: 'kabaddi', teamBScore: nextScore, teamBRaidPoints: nextRaid }
      );
      if (delta >= 3) onTriggerAlert(`SUPER RAID · ${labelName}`);
    } else if (kind === 'bonus') {
      const nextBonus = Math.max(0, (isA ? state.teamABonusPoints ?? 0 : state.teamBBonusPoints ?? 0) + delta);
      onUpdateState(
        isA
          ? { mode: 'kabaddi', teamAScore: nextScore, teamABonusPoints: nextBonus }
          : { mode: 'kabaddi', teamBScore: nextScore, teamBBonusPoints: nextBonus }
      );
      if (delta > 0) onTriggerAlert(`BONUS +${delta} · ${labelName}`);
    } else {
      const nextLona = Math.max(0, (isA ? state.teamALonaPoints ?? 0 : state.teamBLonaPoints ?? 0) + delta);
      onUpdateState(
        isA
          ? {
              mode: 'kabaddi',
              teamAScore: nextScore,
              teamALonaPoints: nextLona,
              ...(delta > 0 ? { teamBPlayersOnMat: 7 } : {}),
            }
          : {
              mode: 'kabaddi',
              teamBScore: nextScore,
              teamBLonaPoints: nextLona,
              ...(delta > 0 ? { teamAPlayersOnMat: 7 } : {}),
            }
      );
      if (delta > 0) onTriggerAlert(`ALL OUT / LONA +${delta} · ${labelName}`);
    }
  };

  const handleToggleGraphic = (panel: KabaddiGraphicPanel) => {
    onUpdateState({
      mode: 'kabaddi',
      visible: true,
      kabaddiGraphicPanel: activeGraphic === panel ? 'none' : panel,
    });
  };

  const handleIssueCard = (card: 'yellow' | 'red' | 'green') => {
    const isA = selectedTeam === 'A';
    const teamName = (isA ? state.teamAName : state.teamBName) || (isA ? 'TEAM A' : 'TEAM B');
    if (card === 'yellow') {
      onUpdateState(
        isA
          ? {
              teamAYellowCards: (state.teamAYellowCards ?? 0) + 1,
              teamABinEndAt: Date.now() + 2 * 60 * 1000,
            }
          : {
              teamBYellowCards: (state.teamBYellowCards ?? 0) + 1,
              teamBBinEndAt: Date.now() + 2 * 60 * 1000,
            }
      );
      onTriggerAlert(`YELLOW CARD · ${teamName} (2 MIN BIN)`);
    } else if (card === 'red') {
      onUpdateState(
        isA
          ? { teamARedCards: (state.teamARedCards ?? 0) + 1 }
          : { teamBRedCards: (state.teamBRedCards ?? 0) + 1 }
      );
      onTriggerAlert(`RED CARD · ${teamName}`);
    } else {
      onUpdateState(
        isA
          ? { teamAGreenCards: (state.teamAGreenCards ?? 0) + 1 }
          : { teamBGreenCards: (state.teamBGreenCards ?? 0) + 1 }
      );
      onTriggerAlert(`GREEN CARD WARNING · ${teamName}`);
    }
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
            backgroundColor: '#151921',
            backgroundImage:
              'linear-gradient(45deg, #222834 25%, transparent 25%), linear-gradient(-45deg, #222834 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222834 75%), linear-gradient(-45deg, transparent 75%, #222834 75%)',
            backgroundSize: '18px 18px',
            backgroundPosition: '0 0, 0 9px, 9px -9px, -9px 0px',
          }
    : undefined;

  const tabs: Array<{ id: ConsoleTab; label: string }> = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'teams', label: 'Teams' },
    { id: 'match-setup', label: 'Match Setup' },
    { id: 'inputs', label: 'Inputs' },
    { id: 'output-config', label: 'Output Config' },
  ];

  const graphicButtons: Array<{ id: KabaddiGraphicPanel; label: string }> = [
    { id: 'starting7', label: 'STARTING 7' },
    { id: 'player_stats', label: 'PLAYER STATS' },
    { id: 'match_stats', label: 'MATCH STATS' },
    { id: 'knockout', label: 'KNOCKOUT' },
    { id: 'substitutions', label: 'SUBSTITUTIONS' },
    { id: 'winners', label: 'WINNERS' },
  ];

  const renderTeamPanel = (team: 'A' | 'B') => {
    const isA = team === 'A';
    const onMat = isA ? teamAOnMat : teamBOnMat;
    const outCount = isA ? teamAOut : teamBOut;
    const score = isA ? state.teamAScore : state.teamBScore;
    const bonusPts = isA ? state.teamABonusPoints ?? 0 : state.teamBBonusPoints ?? 0;
    const lonaPts = isA ? state.teamALonaPoints ?? 0 : state.teamBLonaPoints ?? 0;
    const teamLabel = isA ? state.teamAName || 'TEAM A' : state.teamBName || 'TEAM B';

    const playerStrip = (
      <div className="flex flex-col gap-1 shrink-0 w-7 sm:w-8">
        {[1, 2, 3, 4, 5, 6, 7].map((num) => {
          const active = num <= onMat;
          return (
            <button
              key={`${team}-p-${num}`}
              type="button"
              onClick={() =>
                onUpdateState(isA ? { teamAPlayersOnMat: num } : { teamBPlayersOnMat: num })
              }
              title={`Set ${teamLabel} Players on Mat: ${num}`}
              className={`h-6 sm:h-7 rounded text-[11px] font-mono font-extrabold border transition-all tabular-nums ${
                active
                  ? 'bg-[#2563EB] border-[#60A5FA] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]'
                  : 'bg-[#172133] border-[#2C3E57] text-zinc-400 hover:border-[#60A5FA]/60'
              }`}
            >
              {num}
            </button>
          );
        })}
      </div>
    );

    return (
      <div className="bg-[#1C232E] border border-[#323D4E] rounded-lg overflow-hidden flex flex-col">
        {/* Magenta Sub-Header matching vMix Controller */}
        <div className="bg-gradient-to-r from-[#C026D3] to-[#D946EF] px-2.5 py-1 flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] font-extrabold text-white tracking-wide truncate">
            {isA ? 'TEAM A RAID SCORE' : 'TEAM B RAID SCORE'}
          </span>
          <span className="font-mono text-[10px] font-bold text-white/95 truncate max-w-[110px]">
            {teamLabel}
          </span>
        </div>

        <div className="p-2.5 flex-1 flex flex-col justify-between gap-2.5">
          <div className="flex items-stretch gap-2">
            {isA && playerStrip}

            <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
              {/* Top Editable Score & Raiders Out / Bonus Boxes */}
              <div className="grid grid-cols-2 gap-1.5">
                <div className="rounded overflow-hidden border border-[#F59E0B]/70 bg-[#11161F]">
                  <div className="bg-[#D97706] px-1.5 py-0.5 text-[9px] font-mono font-extrabold text-black truncate">
                    SCORE ({isA ? 'A' : 'B'})
                  </div>
                  <input
                    type="number"
                    min={0}
                    aria-label={`${teamLabel} Total Score`}
                    value={score}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value) || 0);
                      onUpdateState(isA ? { teamAScore: val } : { teamBScore: val });
                    }}
                    className="w-full px-2 py-1 text-base font-mono font-black text-white bg-transparent tabular-nums focus:outline-none focus:bg-[#192130]"
                  />
                </div>

                <div className="rounded overflow-hidden border border-[#F59E0B]/70 bg-[#11161F]">
                  <div className="bg-[#F59E0B] px-1.5 py-0.5 text-[9px] font-mono font-extrabold text-black truncate">
                    RAIDERS OUT
                  </div>
                  <div className="px-2 py-1 flex items-center justify-between">
                    <span className="text-base font-mono font-black text-[#FACC15] tabular-nums">
                      {outCount}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 tabular-nums">
                      {onMat}/7 IN
                    </span>
                  </div>
                </div>
              </div>

              {/* Bonus & Lona Amber Editable Strips */}
              <div className="grid grid-cols-2 gap-1.5">
                <div className="rounded overflow-hidden border border-[#EAB308]/60 bg-[#11161F]">
                  <div className="bg-[#EAB308] px-1.5 py-0.5 text-[9px] font-mono font-extrabold text-black truncate">
                    BONUS POINTS
                  </div>
                  <input
                    type="number"
                    min={0}
                    aria-label={`${teamLabel} Bonus Points`}
                    value={bonusPts}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value) || 0);
                      onUpdateState(isA ? { teamABonusPoints: val } : { teamBBonusPoints: val });
                    }}
                    className="w-full px-2 py-0.5 text-xs font-mono font-bold text-[#FEF08A] bg-transparent tabular-nums focus:outline-none"
                  />
                </div>

                <div className="rounded overflow-hidden border border-[#EAB308]/60 bg-[#11161F]">
                  <div className="bg-[#EAB308] px-1.5 py-0.5 text-[9px] font-mono font-extrabold text-black truncate">
                    LONA SCORE
                  </div>
                  <input
                    type="number"
                    min={0}
                    aria-label={`${teamLabel} Lona Score`}
                    value={lonaPts}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value) || 0);
                      onUpdateState(isA ? { teamALonaPoints: val } : { teamBLonaPoints: val });
                    }}
                    className="w-full px-2 py-0.5 text-xs font-mono font-bold text-[#FEF08A] bg-transparent tabular-nums focus:outline-none"
                  />
                </div>
              </div>

              {/* 2x3 Steel-Blue Action Buttons (+1/-1 Raid, +2/-2 Bonus, +3/-3 Lona) */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => applyTeamPoints(team, 'raid', 1)}
                  className="py-2 px-1 rounded bg-gradient-to-b from-[#3B5998] to-[#263C6B] hover:from-[#4A6BB0] hover:to-[#304B85] border border-[#60A5FA]/40 text-white text-center transition-transform active:scale-95"
                >
                  <span className="block font-mono text-xs font-extrabold leading-tight">+1</span>
                  <span className="block text-[10px] font-semibold text-blue-100 leading-tight">
                    Raid
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => applyTeamPoints(team, 'bonus', 2)}
                  className="py-2 px-1 rounded bg-gradient-to-b from-[#3B5998] to-[#263C6B] hover:from-[#4A6BB0] hover:to-[#304B85] border border-[#60A5FA]/40 text-white text-center transition-transform active:scale-95"
                >
                  <span className="block font-mono text-xs font-extrabold leading-tight">+2</span>
                  <span className="block text-[10px] font-semibold text-blue-100 leading-tight">
                    Bonus
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => applyTeamPoints(team, 'lona', 3)}
                  className="py-2 px-1 rounded bg-gradient-to-b from-[#3B5998] to-[#263C6B] hover:from-[#4A6BB0] hover:to-[#304B85] border border-[#60A5FA]/40 text-white text-center transition-transform active:scale-95"
                >
                  <span className="block font-mono text-xs font-extrabold leading-tight">+3</span>
                  <span className="block text-[10px] font-semibold text-blue-100 leading-tight">
                    Lona
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => applyTeamPoints(team, 'raid', -1)}
                  className="py-2 px-1 rounded bg-gradient-to-b from-[#2A3F6E] to-[#1D2D50] hover:from-[#36518C] hover:to-[#243966] border border-[#60A5FA]/30 text-zinc-100 text-center transition-transform active:scale-95"
                >
                  <span className="block font-mono text-xs font-extrabold leading-tight">-1</span>
                  <span className="block text-[10px] font-semibold text-blue-200 leading-tight">
                    Raid
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => applyTeamPoints(team, 'bonus', -2)}
                  className="py-2 px-1 rounded bg-gradient-to-b from-[#2A3F6E] to-[#1D2D50] hover:from-[#36518C] hover:to-[#243966] border border-[#60A5FA]/30 text-zinc-100 text-center transition-transform active:scale-95"
                >
                  <span className="block font-mono text-xs font-extrabold leading-tight">-2</span>
                  <span className="block text-[10px] font-semibold text-blue-200 leading-tight">
                    Bonus
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => applyTeamPoints(team, 'lona', -3)}
                  className="py-2 px-1 rounded bg-gradient-to-b from-[#2A3F6E] to-[#1D2D50] hover:from-[#36518C] hover:to-[#243966] border border-[#60A5FA]/30 text-zinc-100 text-center transition-transform active:scale-95"
                >
                  <span className="block font-mono text-xs font-extrabold leading-tight">-3</span>
                  <span className="block text-[10px] font-semibold text-blue-200 leading-tight">
                    Lona
                  </span>
                </button>
              </div>
            </div>

            {!isA && playerStrip}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#12161E] border border-[#2C3546] rounded-2xl overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
      {/* Top vMix / OBS Kabaddi Controller Title & Menu Strip */}
      <div className="bg-[#0C0F16] border-b border-[#262F40] px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-extrabold text-white tracking-wide">
            vMix &amp; OBS Kabaddi Controller
          </span>
          <span aria-hidden="true" className="text-zinc-600">·</span>
          <span className="font-mono text-[11px] text-[#4ADE80] font-semibold tabular-nums">
            {connected ? `Live Sync (${connectedDisplays} OBS/vMix)` : 'Local Sync Ready'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            title="Undo last action"
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono font-semibold rounded border bg-[#19202D] border-white/15 text-zinc-200 hover:border-[#FACC15] disabled:opacity-40 transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={onRedo}
            title="Redo last action"
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono font-semibold rounded border bg-[#19202D] border-white/15 text-zinc-200 hover:border-[#FACC15] disabled:opacity-40 transition-colors"
          >
            <Redo2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Redo</span>
          </button>
          <button
            type="button"
            onClick={onOpenRemoteModal}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] border border-[#60A5FA]/50 rounded transition-colors whitespace-nowrap"
          >
            <Smartphone className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
            <span>Remote QR</span>
            {connectedControllers > 0 && (
              <span className="px-1 py-0.2 bg-[#FACC15] text-black rounded font-mono text-[10px]">
                {connectedControllers}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => onUpdateState({ visible: !state.visible })}
            aria-pressed={state.visible}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-bold rounded border transition-colors whitespace-nowrap ${
              state.visible
                ? 'bg-[#DC2626] text-white border-[#EF4444]'
                : 'bg-[#19202D] text-zinc-300 border-white/15'
            }`}
          >
            {state.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{state.visible ? 'ON AIR' : 'HIDDEN'}</span>
          </button>
        </div>
      </div>

      {/* Primary Controller Navigation Tabs (Dashboard | Teams | Match Setup | Inputs | Output Config) */}
      <div
        role="tablist"
        aria-label="Kabaddi Broadcast Controller Tabs"
        className="bg-[#181E28] border-b border-[#2D3748] px-2 sm:px-3 pt-1.5 flex items-center gap-1 overflow-x-auto"
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
              className={`px-3.5 py-2 text-xs font-semibold rounded-t-md border-t border-x transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-[#2563EB] text-white border-[#60A5FA]/70'
                  : 'bg-[#1E2532] text-zinc-300 border-[#2D3748] hover:text-white hover:bg-[#263042]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ================= TAB 1: DASHBOARD (EXACT vMix KABADDI CONTROLLER UI) ================= */}
      {activeTab === 'dashboard' && (
        <div className="p-2.5 sm:p-3.5 space-y-2.5 bg-[#12161E]">
          {/* Top Editable Magenta Tournament / Venue / League / Event / Match Type Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-12 gap-2">
            <div className="lg:col-span-3 rounded overflow-hidden border border-[#E879F9]/50 bg-[#1B2230]">
              <div className="bg-gradient-to-r from-[#C026D3] to-[#D946EF] px-2 py-0.5 text-[10px] font-mono font-extrabold text-white">
                TOURNAMENT
              </div>
              <input
                type="text"
                aria-label="Tournament Name"
                value={state.kabaddiTitle}
                onChange={(e) => onUpdateState({ kabaddiTitle: e.target.value })}
                className="w-full px-2 py-1 text-xs font-bold text-white bg-transparent focus:outline-none focus:bg-[#232D3F]"
              />
            </div>

            <div className="lg:col-span-2 rounded overflow-hidden border border-[#E879F9]/50 bg-[#1B2230]">
              <div className="bg-gradient-to-r from-[#C026D3] to-[#D946EF] px-2 py-0.5 text-[10px] font-mono font-extrabold text-white">
                VENUE
              </div>
              <input
                type="text"
                aria-label="Venue"
                value={state.kabaddiVenue ?? ''}
                onChange={(e) =>
                  onUpdateState({
                    kabaddiVenue: e.target.value,
                    kabaddiSubtitle: `${state.kabaddiMatchType || 'LIVE'} · ${e.target.value}`,
                  })
                }
                className="w-full px-2 py-1 text-xs font-bold text-white bg-transparent focus:outline-none focus:bg-[#232D3F]"
              />
            </div>

            <div className="lg:col-span-2 rounded overflow-hidden border border-[#E879F9]/50 bg-[#1B2230]">
              <div className="bg-gradient-to-r from-[#C026D3] to-[#D946EF] px-2 py-0.5 text-[10px] font-mono font-extrabold text-white">
                LEAGUE
              </div>
              <input
                type="text"
                aria-label="League Name"
                value={state.kabaddiLeague ?? ''}
                onChange={(e) => onUpdateState({ kabaddiLeague: e.target.value })}
                className="w-full px-2 py-1 text-xs font-bold text-white bg-transparent focus:outline-none focus:bg-[#232D3F]"
              />
            </div>

            <div className="lg:col-span-2 rounded overflow-hidden border border-[#E879F9]/50 bg-[#1B2230]">
              <div className="bg-gradient-to-r from-[#C026D3] to-[#D946EF] px-2 py-0.5 text-[10px] font-mono font-extrabold text-white">
                EVENT
              </div>
              <input
                type="text"
                aria-label="Event Name"
                value={state.kabaddiEvent ?? ''}
                onChange={(e) => onUpdateState({ kabaddiEvent: e.target.value })}
                className="w-full px-2 py-1 text-xs font-bold text-white bg-transparent focus:outline-none focus:bg-[#232D3F]"
              />
            </div>

            <div className="col-span-2 sm:col-span-2 lg:col-span-3 rounded overflow-hidden border border-[#E879F9]/50 bg-[#1B2230]">
              <div className="bg-gradient-to-r from-[#C026D3] to-[#D946EF] px-2 py-0.5 text-[10px] font-mono font-extrabold text-white">
                MATCH TYPE
              </div>
              <input
                type="text"
                aria-label="Match Type"
                value={state.kabaddiMatchType ?? ''}
                onChange={(e) =>
                  onUpdateState({
                    kabaddiMatchType: e.target.value,
                    kabaddiSubtitle: `${e.target.value} · ${state.kabaddiVenue || 'ARENA'}`,
                  })
                }
                className="w-full px-2 py-1 text-xs font-bold text-white bg-transparent focus:outline-none focus:bg-[#232D3F]"
              />
            </div>
          </div>

          {/* Main Broadcast Console 12-Column Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-2.5 items-stretch">
            {/* LEFT + CENTER-LEFT (7 cols): Team A Score, Team B Score, Clocks & Triggers */}
            <div className="xl:col-span-7 flex flex-col gap-2.5">
              {/* Top Sub-Grid: Team A Raid Score + Team B Raid Score */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {renderTeamPanel('A')}
                {renderTeamPanel('B')}
              </div>

              {/* Bottom Sub-Grid: Raid Clock & Match Clock (Left) + Live Red Triggers (Right) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 flex-1">
                {/* RAID CLOCK + MATCH CLOCK */}
                <div className="md:col-span-7 flex flex-col gap-2.5 justify-between">
                  {/* RAID CLOCK */}
                  <div className="bg-[#1C232E] border border-[#323D4E] rounded-lg overflow-hidden">
                    <div className="bg-[#56657A] px-2.5 py-1 flex items-center justify-between">
                      <span className="font-mono text-[11px] font-extrabold text-white tracking-wide">
                        RAID CLOCK
                      </span>
                      <span
                        className={`font-mono text-xs font-black tabular-nums ${
                          displayRaidSeconds <= 10 ? 'text-[#FCA5A5]' : 'text-[#FEF08A]'
                        }`}
                      >
                        {String(displayRaidSeconds).padStart(2, '0')}s
                      </span>
                    </div>
                    <div className="p-2 flex flex-wrap sm:flex-nowrap items-center gap-2">
                      <div className="w-28 shrink-0 space-y-1">
                        <label
                          htmlFor="vmix-raid-duration"
                          className="block text-[9px] font-mono font-bold text-zinc-400"
                        >
                          RAIDER DURATION
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
                          className="w-full px-2 py-1.5 text-xs font-mono font-bold bg-[#11161F] border border-white/15 rounded text-white focus:outline-none focus:border-[#FACC15]"
                        >
                          <option value={30}>30s</option>
                          <option value={20}>20s</option>
                          <option value={15}>15s</option>
                        </select>
                      </div>

                      <div className="flex-1 grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (!state.raidRunning) onToggleRaidTimer();
                          }}
                          className={`py-2.5 rounded font-display text-xs sm:text-sm font-extrabold border transition-transform active:scale-95 ${
                            state.raidRunning
                              ? 'bg-[#16A34A] border-[#86EFAC] text-white shadow-[0_0_12px_rgba(34,197,94,0.45)]'
                              : 'bg-[#15803D] hover:bg-[#16A34A] border-[#4ADE80]/50 text-white'
                          }`}
                        >
                          START
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (state.raidRunning) onToggleRaidTimer();
                          }}
                          className="py-2.5 rounded font-display text-xs sm:text-sm font-extrabold bg-[#991B1B] hover:bg-[#B91C1C] border border-[#F87171]/50 text-white transition-transform active:scale-95"
                        >
                          STOP
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
                          className="py-2.5 rounded font-display text-xs sm:text-sm font-extrabold bg-[#FACC15] hover:bg-[#EAB308] border border-[#FEF08A] text-black transition-transform active:scale-95"
                        >
                          RESET
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* MATCH CLOCK */}
                  <div className="bg-[#1C232E] border border-[#323D4E] rounded-lg overflow-hidden">
                    <div className="bg-[#23487A] px-2.5 py-1 flex items-center justify-between">
                      <span className="font-mono text-[11px] font-extrabold text-white tracking-wide">
                        MATCH CLOCK
                      </span>
                      <span className="font-mono text-sm font-black text-white tabular-nums">
                        {formatClockMMSS(displayMatchSeconds)}
                      </span>
                    </div>
                    <div className="p-2 flex flex-wrap sm:flex-nowrap items-center gap-2">
                      <div className="w-28 shrink-0 space-y-1">
                        <label
                          htmlFor="vmix-match-duration"
                          className="block text-[9px] font-mono font-bold text-zinc-400"
                        >
                          DURATION
                        </label>
                        <select
                          id="vmix-match-duration"
                          value={matchDuration}
                          onChange={(e) => {
                            const sec = Number(e.target.value) || 1200;
                            onUpdateState({ kabaddiMatchDuration: sec });
                            onSetMatchPreset(sec, false);
                          }}
                          className="w-full px-1.5 py-1.5 text-[11px] font-mono font-bold bg-[#11161F] border border-white/15 rounded text-white focus:outline-none focus:border-[#FACC15]"
                        >
                          <option value={1200}>20:00 x 2</option>
                          <option value={900}>15:00 x 2</option>
                          <option value={600}>10:00 x 2</option>
                          <option value={30}>00:30 Demo</option>
                        </select>
                      </div>

                      <div className="flex-1 grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (!state.matchRunning) onToggleMatchTimer();
                          }}
                          className={`py-2.5 rounded font-display text-xs sm:text-sm font-extrabold border transition-transform active:scale-95 ${
                            state.matchRunning
                              ? 'bg-[#16A34A] border-[#86EFAC] text-white shadow-[0_0_12px_rgba(34,197,94,0.45)]'
                              : 'bg-[#15803D] hover:bg-[#16A34A] border-[#4ADE80]/50 text-white'
                          }`}
                        >
                          START
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (state.matchRunning) onToggleMatchTimer();
                          }}
                          className="py-2.5 rounded font-display text-xs sm:text-sm font-extrabold bg-[#991B1B] hover:bg-[#B91C1C] border border-[#F87171]/50 text-white transition-transform active:scale-95"
                        >
                          STOP
                        </button>
                        <button
                          type="button"
                          onClick={() => onSetMatchPreset(matchDuration, false)}
                          className="py-2.5 rounded font-display text-xs sm:text-sm font-extrabold bg-[#FACC15] hover:bg-[#EAB308] border border-[#FEF08A] text-black transition-transform active:scale-95"
                        >
                          RESET
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CENTER-BOTTOM CRIMSON MATCH ACTION TRIGGERS */}
                <div className="md:col-span-5 flex flex-col gap-1.5 justify-between">
                  <button
                    type="button"
                    onClick={() => onTimeout(state.timeoutTeam ? null : 'OFFICIAL')}
                    className={`w-full py-2 px-2 rounded font-display text-xs font-extrabold tracking-wide border transition-all active:scale-98 ${
                      state.timeoutTeam
                        ? 'bg-[#DC2626] border-[#FACC15] text-[#FEF08A]'
                        : 'bg-gradient-to-b from-[#991B1B] to-[#741115] hover:from-[#B91C1C] hover:to-[#8B151A] border-[#F87171]/35 text-white'
                    }`}
                  >
                    TIME ON OFF {state.timeoutTeam ? '(PAUSED)' : ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateState({ doOrDie: !state.doOrDie })}
                    className={`w-full py-2 px-2 rounded font-display text-xs font-extrabold tracking-wide border transition-all active:scale-98 ${
                      state.doOrDie
                        ? 'bg-[#DC2626] border-[#FACC15] text-[#FEF08A] shadow-[0_0_12px_rgba(250,204,21,0.45)]'
                        : 'bg-gradient-to-b from-[#991B1B] to-[#741115] hover:from-[#B91C1C] hover:to-[#8B151A] border-[#F87171]/35 text-white'
                    }`}
                  >
                    DO OR DIE {state.doOrDie ? '· ACTIVE' : ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTeamPoints(selectedTeam, 'raid', 3)}
                    className="w-full py-2 px-2 rounded font-display text-xs font-extrabold tracking-wide bg-gradient-to-b from-[#991B1B] to-[#741115] hover:from-[#B91C1C] hover:to-[#8B151A] border border-[#F87171]/35 text-white transition-transform active:scale-98"
                  >
                    SUPER RAID (+3 {selectedTeam})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const isA = selectedTeam === 'A';
                      const labelName = isA ? state.teamAName : state.teamBName;
                      onUpdateState(
                        isA
                          ? {
                              teamAScore: state.teamAScore + 2,
                              teamATacklePoints: (state.teamATacklePoints ?? 0) + 2,
                            }
                          : {
                              teamBScore: state.teamBScore + 2,
                              teamBTacklePoints: (state.teamBTacklePoints ?? 0) + 2,
                            }
                      );
                      onTriggerAlert(`SUPER TACKLE +2 · ${labelName}`);
                    }}
                    className="w-full py-2 px-2 rounded font-display text-xs font-extrabold tracking-wide bg-gradient-to-b from-[#991B1B] to-[#741115] hover:from-[#B91C1C] hover:to-[#8B151A] border border-[#F87171]/35 text-white transition-transform active:scale-98"
                  >
                    SUPER TACKLE (+2 {selectedTeam})
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTeamPoints(selectedTeam, 'lona', 2)}
                    className="w-full py-2 px-2 rounded font-display text-xs font-extrabold tracking-wide bg-gradient-to-b from-[#991B1B] to-[#741115] hover:from-[#B91C1C] hover:to-[#8B151A] border border-[#F87171]/35 text-white transition-transform active:scale-98"
                  >
                    ALL OUT (+2 {selectedTeam})
                  </button>
                </div>
              </div>
            </div>

            {/* CENTER-RIGHT COLUMN (2 cols): MATCH LIVE + BROADCAST GRAPHICS + WINNERS PODIUM */}
            <div className="xl:col-span-2 flex flex-col gap-1.5">
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
                className={`w-full py-2 px-2 rounded font-display text-xs font-extrabold tracking-wide border transition-all ${
                  activeGraphic === 'none' && state.visible
                    ? 'bg-[#15803D] border-[#86EFAC] text-white shadow-[0_0_12px_rgba(34,197,94,0.35)]'
                    : 'bg-[#14532D] hover:bg-[#15803D] border-[#4ADE80]/40 text-zinc-100'
                }`}
              >
                MATCH LIVE
              </button>

              {graphicButtons.map((btn) => {
                const isOn = activeGraphic === btn.id;
                return (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => handleToggleGraphic(btn.id)}
                    className={`w-full py-1.5 px-2 rounded font-display text-[11px] font-extrabold tracking-wide border transition-all ${
                      isOn
                        ? 'bg-[#DC2626] border-[#FACC15] text-[#FEF08A] shadow-[0_0_10px_rgba(250,204,21,0.4)]'
                        : 'bg-gradient-to-b from-[#8F161B] to-[#6E1014] hover:from-[#B91C1C] hover:to-[#8B151A] border-[#F87171]/30 text-white'
                    }`}
                  >
                    {btn.label}
                  </button>
                );
              })}

              {/* Editable Winners Podium Inputs (Used by WINNERS broadcast graphic) */}
              <div className="mt-1 space-y-1.5 flex-1 flex flex-col justify-end">
                {(
                  [
                    { key: 'championTeam', label: 'CHAMPION TEAM' },
                    { key: 'runnerUpTeam', label: 'RUNNER UP TEAM' },
                    { key: 'thirdPlaceTeam', label: '3RD PLACE TEAM' },
                    { key: 'fourthPlaceTeam', label: '4TH PLACE TEAM' },
                  ] as const
                ).map((item) => (
                  <div
                    key={item.key}
                    className="rounded overflow-hidden border border-[#F59E0B]/60 bg-[#18202C]"
                  >
                    <div className="bg-[#D97706] px-1.5 py-0.5 text-[8.5px] font-mono font-extrabold text-black truncate">
                      {item.label}
                    </div>
                    <input
                      type="text"
                      aria-label={item.label}
                      value={state[item.key] ?? ''}
                      onChange={(e) => onUpdateState({ [item.key]: e.target.value })}
                      className="w-full px-1.5 py-0.5 text-[11px] font-bold text-white bg-transparent focus:outline-none focus:bg-[#222D3D]"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT COLUMN (3 cols): LIVE KABADDI FEED PREVIEW + TEAM MATCH + CARDS */}
            <div className="xl:col-span-3 flex flex-col gap-2.5">
              {/* LIVE KABADDI FEED PREVIEW */}
              <div className="bg-[#1C232E] border border-[#323D4E] rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-[#C026D3] to-[#D946EF] px-2.5 py-1 flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-extrabold text-white tracking-wide">
                    KABADDI MATCH
                  </span>
                  <button
                    type="button"
                    onClick={onToggleTransparentBg}
                    className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-black/45 text-[#FEF08A] hover:bg-black/70 transition-colors"
                  >
                    {transparentBg
                      ? outputBg === 'transparent'
                        ? 'ALPHA'
                        : outputBg.toUpperCase()
                      : 'DARK BG'}
                  </button>
                </div>

                {/* Live 16:9 Real-Time Scoreboard & Graphics Feed Monitor */}
                <div
                  className={`relative aspect-video w-full overflow-hidden flex flex-col justify-between p-2 transition-opacity duration-200 ${
                    state.visible ? 'opacity-100' : 'opacity-25'
                  } ${
                    transparentBg ? '' : 'bg-gradient-to-br from-[#0F172A] via-[#131924] to-[#09090B]'
                  }`}
                  style={monitorBackgroundStyle}
                >
                  <div className="h-1" aria-hidden="true" />

                  {/* Center Live Alert OR Active Broadcast Graphic Slate */}
                  <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center px-1">
                    {state.kabaddiAlert ? (
                      <div className="kabaddi-alert-pop bg-[#DC2626] border-2 border-[#FACC15] px-3 py-1 rounded-lg text-white font-display font-extrabold text-xs sm:text-sm tracking-tight shadow-xl">
                        {state.kabaddiAlert}
                      </div>
                    ) : activeGraphic !== 'none' ? (
                      <KabaddiGraphicOverlay state={state} variant="studio" />
                    ) : (
                      <span className="font-mono text-[9px] text-zinc-200 bg-black/65 px-2 py-0.5 rounded border border-white/10">
                        LIVE OBS / vMix FEED
                      </span>
                    )}
                  </div>

                  {/* Bottom Live Animated Scoreboard Bar */}
                  <div className="relative z-10 w-full">
                    <KabaddiScoreboardBar
                      variant="mini"
                      teamAName={state.teamAName}
                      teamACode={state.teamACode}
                      teamAColor={state.teamAColor}
                      teamAScore={state.teamAScore}
                      teamALogoUrl={state.teamALogoUrl}
                      teamAYellowCards={state.teamAYellowCards}
                      teamARedCards={state.teamARedCards}
                      teamABinRemaining={teamABinRemaining}
                      teamBName={state.teamBName}
                      teamBCode={state.teamBCode}
                      teamBColor={state.teamBColor}
                      teamBScore={state.teamBScore}
                      teamBLogoUrl={state.teamBLogoUrl}
                      teamBYellowCards={state.teamBYellowCards}
                      teamBRedCards={state.teamBRedCards}
                      teamBBinRemaining={teamBBinRemaining}
                      matchSeconds={displayMatchSeconds}
                      raidSeconds={displayRaidSeconds}
                      raidRunning={state.raidRunning}
                      halfLabel={state.kabaddiHalf}
                      matchStatus={state.matchStatus}
                      timeoutTeam={state.timeoutTeam}
                      doOrDie={state.doOrDie}
                      subtitle={state.kabaddiSubtitle}
                      showDemoWatermark={isFreeDemo}
                    />
                  </div>
                </div>

                <div className="bg-[#12161E] px-2.5 py-1 text-center border-t border-white/10">
                  <span className="font-mono text-[10px] font-bold tracking-widest text-zinc-300">
                    KABADDI FEED PREVIEW
                  </span>
                </div>
              </div>

              {/* TEAM MATCH Quick-Edit + YELLOW / RED / GREEN CARDS */}
              <div className="bg-[#1C232E] border border-[#323D4E] rounded-lg overflow-hidden flex-1 flex flex-col justify-between">
                <div className="bg-[#394558] px-2.5 py-1 flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] font-extrabold text-white tracking-wide">
                    TEAM MATCH
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedTeam('A')}
                      className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded ${
                        selectedTeam === 'A'
                          ? 'bg-[#FACC15] text-black'
                          : 'bg-[#1B2230] text-zinc-300'
                      }`}
                    >
                      TEAM A
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTeam('B')}
                      className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded ${
                        selectedTeam === 'B'
                          ? 'bg-[#FACC15] text-black'
                          : 'bg-[#1B2230] text-zinc-300'
                      }`}
                    >
                      TEAM B
                    </button>
                  </div>
                </div>

                <div className="p-2 space-y-2">
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="rounded overflow-hidden border border-[#F59E0B]/60 bg-[#11161F]">
                      <div className="bg-[#F59E0B] px-1.5 py-0.5 text-[8.5px] font-mono font-extrabold text-black truncate">
                        TEAM A NAME
                      </div>
                      <input
                        type="text"
                        aria-label="Team A Name"
                        value={state.teamAName}
                        onChange={(e) => onUpdateState({ teamAName: e.target.value })}
                        className="w-full px-1.5 py-1 text-[11px] font-bold text-white bg-transparent focus:outline-none"
                      />
                    </div>
                    <div className="rounded overflow-hidden border border-[#F59E0B]/60 bg-[#11161F]">
                      <div className="bg-[#F59E0B] px-1.5 py-0.5 text-[8.5px] font-mono font-extrabold text-black truncate">
                        TEAM B NAME
                      </div>
                      <input
                        type="text"
                        aria-label="Team B Name"
                        value={state.teamBName}
                        onChange={(e) => onUpdateState({ teamBName: e.target.value })}
                        className="w-full px-1.5 py-1 text-[11px] font-bold text-white bg-transparent focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Wide Crimson Card Buttons targeting selected team */}
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => handleIssueCard('yellow')}
                      className="w-full py-1.5 rounded font-display text-xs font-extrabold tracking-wide bg-gradient-to-b from-[#991B1B] to-[#741115] hover:from-[#B91C1C] hover:to-[#8B151A] border border-[#FACC15]/50 text-[#FEF08A] transition-transform active:scale-98"
                    >
                      YELLOW CARD (TEAM {selectedTeam})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleIssueCard('red')}
                      className="w-full py-1.5 rounded font-display text-xs font-extrabold tracking-wide bg-gradient-to-b from-[#991B1B] to-[#741115] hover:from-[#B91C1C] hover:to-[#8B151A] border border-[#F87171]/50 text-white transition-transform active:scale-98"
                    >
                      RED CARD (TEAM {selectedTeam})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleIssueCard('green')}
                      className="w-full py-1.5 rounded font-display text-xs font-extrabold tracking-wide bg-gradient-to-b from-[#991B1B] to-[#741115] hover:from-[#B91C1C] hover:to-[#8B151A] border border-[#4ADE80]/50 text-[#BBF7D0] transition-transform active:scale-98"
                    >
                      GREEN CARD (TEAM {selectedTeam})
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: TEAMS (LOGOS, COLORS, STARTING 7 EDITOR) ================= */}
      {activeTab === 'teams' && (
        <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-5 bg-[#12161E]">
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
                className="bg-[#1C232E] border border-[#323D4E] rounded-xl p-4 space-y-4"
              >
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
                  <span className="font-display text-sm font-bold text-white">
                    {isA ? 'Team A Configuration (Left Wing)' : 'Team B Configuration (Right Wing)'}
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded cursor-pointer">
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
                        className="p-1 text-zinc-400 hover:text-[#F87171] border border-white/15 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="col-span-2 space-y-1">
                    <label className="block text-[11px] text-zinc-400">Team Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) =>
                        onUpdateState(isA ? { teamAName: e.target.value } : { teamBName: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs font-bold bg-[#11161F] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] text-zinc-400">Short Code</label>
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
                      className="w-full px-3 py-2 text-xs font-mono font-bold bg-[#11161F] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[11px] text-zinc-400">Wing Broadcast Color</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {TEAM_COLOR_SWATCHES.map((swatch) => (
                      <button
                        key={swatch}
                        type="button"
                        onClick={() =>
                          onUpdateState(isA ? { teamAColor: swatch } : { teamBColor: swatch })
                        }
                        aria-label={`Set Team ${team} color ${swatch}`}
                        className={`w-6 h-6 rounded border-2 transition-transform ${
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
                      className="w-7 h-6 rounded bg-transparent border border-white/20 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[11px] text-zinc-400">
                    Starting 7 Lineup (Synced to STARTING 7 Broadcast Graphic)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {[0, 1, 2, 3, 4, 5, 6].map((idx) => (
                      <input
                        key={`p-${team}-${idx}`}
                        type="text"
                        value={squad[idx] ?? ''}
                        onChange={(e) => handleUpdateStarting7(team, idx, e.target.value)}
                        placeholder={`Player ${idx + 1}`}
                        className="px-2.5 py-1.5 text-xs bg-[#11161F] border border-white/12 rounded text-white focus:outline-none focus:border-[#FACC15]"
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
        <div className="p-4 sm:p-5 space-y-4 bg-[#12161E]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#1C232E] border border-[#323D4E] rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-[#FACC15] font-mono">MATCH HALF &amp; TICKER</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(['1ST HALF', '2ND HALF', 'HALF TIME', 'FULL TIME'] as KabaddiHalf[]).map((half) => (
                  <button
                    key={half}
                    type="button"
                    onClick={() => onUpdateState({ kabaddiHalf: half })}
                    className={`py-2 px-2 text-[11px] font-mono font-bold rounded border transition-colors ${
                      state.kabaddiHalf === half
                        ? 'bg-[#2563EB] text-white border-[#60A5FA]'
                        : 'bg-[#11161F] text-zinc-300 border-white/12 hover:border-white/30'
                    }`}
                  >
                    {half}
                  </button>
                ))}
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] text-zinc-400">Bottom Ticker Subtitle</label>
                <input
                  type="text"
                  value={state.kabaddiSubtitle}
                  onChange={(e) => onUpdateState({ kabaddiSubtitle: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#11161F] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                />
              </div>
            </div>

            <div className="bg-[#1C232E] border border-[#323D4E] rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-[#FACC15] font-mono">MATCH ACTIONS</p>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={onSwapTeams}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white transition-colors"
                >
                  <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />
                  <span>Swap Team A ↔ Team B</span>
                </button>
                <button
                  type="button"
                  onClick={onResetRaidTimer}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg bg-[#D97706] hover:bg-[#B45309] text-white transition-colors"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  <span>Reset Raid Timer</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onResetMatch();
                    onUpdateState({
                      teamAPlayersOnMat: 7,
                      teamBPlayersOnMat: 7,
                      teamALonaPoints: 0,
                      teamBLonaPoints: 0,
                      teamAGreenCards: 0,
                      teamBGreenCards: 0,
                      kabaddiGraphicPanel: 'none',
                    });
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg bg-[#991B1B] hover:bg-[#B91C1C] text-white transition-colors"
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
        <div className="p-4 sm:p-5 bg-[#12161E]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#1C232E] border border-[#323D4E] rounded-xl p-4 space-y-2">
              <label htmlFor="vmix-room-input" className="block text-xs font-bold text-[#FACC15] font-mono">
                LIVE CHANNEL / ROOM ID
              </label>
              <input
                id="vmix-room-input"
                type="text"
                value={roomInput}
                onChange={(e) => onChangeRoomInput(sanitizeRoomIdClient(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono bg-[#11161F] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
              />
              <p className="text-[11px] text-zinc-400">
                OBS Studio, vMix, and mobile remote controllers on this Room ID stay synchronized in real time.
              </p>
            </div>

            <div className="bg-[#1C232E] border border-[#323D4E] rounded-xl p-4 space-y-2">
              <span className="block text-xs font-bold text-[#FACC15] font-mono">
                OUTPUT BACKGROUND KEY
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(['transparent', 'green', 'blue'] as OverlayBackground[]).map((bgOpt) => (
                  <button
                    key={bgOpt}
                    type="button"
                    onClick={() => onChangeOutputBg(bgOpt)}
                    className={`py-2 text-[11px] font-semibold rounded border transition-colors ${
                      outputBg === bgOpt
                        ? 'bg-white text-black border-white'
                        : 'bg-[#11161F] text-zinc-300 border-white/12'
                    }`}
                  >
                    {bgOpt === 'transparent' ? 'Alpha' : bgOpt === 'green' ? 'Green' : 'Blue'}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#1C232E] border border-[#323D4E] rounded-xl p-4 space-y-2">
              <span className="block text-xs font-bold text-[#FACC15] font-mono">
                URL MODE &amp; MOBILE REMOTE
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onToggleLockModeInUrl}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded border ${
                    lockModeInUrl
                      ? 'bg-[#FACC15] text-black border-[#FACC15]'
                      : 'bg-[#11161F] text-zinc-200 border-white/15'
                  }`}
                >
                  {lockModeInUrl ? 'Locked: Kabaddi' : 'Auto-Follow'}
                </button>
                <button
                  type="button"
                  onClick={onOpenRemoteModal}
                  className="flex-1 py-2 px-3 text-xs font-bold rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
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
        <div className="p-4 sm:p-5 bg-[#12161E] space-y-4">
          {isCurrentUnlocked ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#1C232E] border border-[#323D4E] rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">OBS Studio · Browser Source</span>
                  <span className="font-mono text-[10px] text-[#FACC15]">1920 × 1080 · 60fps</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={obsBrowserUrl}
                    className="flex-1 min-w-0 px-2.5 py-2 text-[11px] font-mono bg-[#11161F] border border-white/15 rounded text-zinc-200"
                  />
                  <button
                    type="button"
                    onClick={() => copyText('obs-tab', obsBrowserUrl)}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded whitespace-nowrap"
                  >
                    {copiedKey === 'obs-tab' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'obs-tab' ? 'Copied' : 'Copy OBS'}</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => copyText('css-tab', OBS_CUSTOM_CSS)}
                  className="text-[11px] font-mono text-[#FACC15] hover:text-white"
                >
                  {copiedKey === 'css-tab' ? 'OBS Transparent CSS Copied' : 'Copy OBS Transparent Custom CSS'}
                </button>
              </div>

              <div className="bg-[#1C232E] border border-[#323D4E] rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">vMix · Web Browser Input</span>
                  <span className="font-mono text-[10px] text-[#FACC15]">Overlay Ch 1–4</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={vmixBrowserUrl}
                    className="flex-1 min-w-0 px-2.5 py-2 text-[11px] font-mono bg-[#11161F] border border-white/15 rounded text-zinc-200"
                  />
                  <button
                    type="button"
                    onClick={() => copyText('vmix-tab', vmixBrowserUrl)}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded whitespace-nowrap"
                  >
                    {copiedKey === 'vmix-tab' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'vmix-tab' ? 'Copied' : 'Copy vMix'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Add Input → Web Browser → 1920×1080 → Click Overlay [1]
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-[#1C232E] border border-[#FACC15]/40 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#FACC15]" aria-hidden="true" />
                  <span>OBS &amp; vMix Pro Watermark-Free URLs Locked</span>
                </p>
                <p className="text-xs text-zinc-400">
                  Pay ₹1 for automatic 1-Day (24-hour) unlock — or switch to FREE Demo above for instant free OBS/vMix URLs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRequestPurchase(currentSku)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-lg"
              >
                <span>Pay ₹1 &amp; Unlock (24h)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Persistent Bottom Broadcast Status & Quick OBS/vMix Action Bar */}
      <div className="bg-[#0C0F16] border-t border-[#262F40] px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono">
          <span className="inline-flex items-center gap-1.5 text-zinc-200 font-bold">
            <Radio className="w-3.5 h-3.5 text-[#EF4444]" aria-hidden="true" />
            <span>ROOM: {roomInput}</span>
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#1E2532] hover:bg-[#2B3548] border border-white/15 text-white rounded-lg transition-colors whitespace-nowrap"
              >
                {copiedKey === 'obs-bar' ? <Check className="w-3.5 h-3.5 text-[#4ADE80]" /> : <Copy className="w-3.5 h-3.5 text-[#FACC15]" />}
                <span>{copiedKey === 'obs-bar' ? 'OBS URL Copied' : 'Copy OBS URL'}</span>
              </button>
              <button
                type="button"
                onClick={() => copyText('vmix-bar', vmixBrowserUrl)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#1E2532] hover:bg-[#2B3548] border border-white/15 text-white rounded-lg transition-colors whitespace-nowrap"
              >
                {copiedKey === 'vmix-bar' ? <Check className="w-3.5 h-3.5 text-[#4ADE80]" /> : <Copy className="w-3.5 h-3.5 text-[#FACC15]" />}
                <span>{copiedKey === 'vmix-bar' ? 'vMix URL Copied' : 'Copy vMix URL'}</span>
              </button>
              <button
                type="button"
                onClick={onDownloadPng}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-lg transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>1920×1080 PNG</span>
              </button>
              <a
                href={obsBrowserUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-lg transition-colors whitespace-nowrap"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{lang === 'mr' ? 'आउटपुट पहा' : 'Open Output Tab'}</span>
              </a>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onRequestPurchase(currentSku)}
              className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-lg transition-colors whitespace-nowrap"
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
