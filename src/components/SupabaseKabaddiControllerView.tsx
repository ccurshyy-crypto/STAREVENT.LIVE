import { FormEvent, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  Monitor,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Shield,
  Sparkles,
  Timer,
  Undo2,
  Zap,
} from 'lucide-react';
import {
  SUPABASE_RLS_SQL,
  useSupabaseKabaddiRoom,
} from '../hooks/useSupabaseKabaddiRoom';
import type { KabaddiHalf } from '../types/overlay';
import {
  computeLiveCountdown,
  deriveShortCode,
  generateRandomKabaddiMatchId,
  KABADDI_TEAM_COLOR_PRESETS,
  KabaddiCalloutType,
  KabaddiTeamSide,
  sanitizeKabaddiMatchId,
} from '../types/supabaseKabaddi';
import { formatClockMMSS, KabaddiScoreboardBar } from './KabaddiScoreboardBar';

interface SupabaseKabaddiControllerViewProps {
  matchId: string;
  onChangeMatchId: (nextMatchId: string) => void;
  onNavigateHome: () => void;
}

const HALVES: KabaddiHalf[] = ['1ST HALF', '2ND HALF', 'HALF TIME', 'FULL TIME'];

async function copyTextSafe(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export function SupabaseKabaddiControllerView({
  matchId,
  onChangeMatchId,
  onNavigateHome,
}: SupabaseKabaddiControllerViewProps) {
  const {
    matchId: activeMatchId,
    state,
    syncStatus,
    syncError,
    canUndo,
    undoCount,
    updateFields,
    addRaidPoints,
    addBonusPoint,
    addTacklePoint,
    triggerAllOut,
    adjustScore,
    setPlayersOnMat,
    startRaidTimer,
    pauseRaidTimer,
    resetRaidTimer,
    toggleMatchTimer,
    setMatchSeconds,
    setHalf,
    setDoOrDie,
    triggerCallout,
    clearCallout,
    undoLastAction,
    resetMatch,
  } = useSupabaseKabaddiRoom({ matchId, readOnly: false });

  const [roomInput, setRoomInput] = useState(activeMatchId);
  const [calloutTeam, setCalloutTeam] = useState<KabaddiTeamSide | null>('A');
  const [confirmReset, setConfirmReset] = useState(false);
  const [copiedKey, setCopiedKey] = useState<'control' | 'overlay' | 'sql' | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setRoomInput(activeMatchId);
  }, [activeMatchId]);

  useEffect(() => {
    const needsTick =
      state.raidRunning ||
      state.matchRunning ||
      Boolean(state.callout && state.callout.expiresAt > Date.now());
    if (!needsTick) {
      setNowMs(Date.now());
      return;
    }
    const id = window.setInterval(() => setNowMs(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [state.raidRunning, state.matchRunning, state.callout]);

  const liveRaidSeconds = computeLiveCountdown(
    state.raidSeconds,
    state.raidRunning,
    state.raidUpdatedAt,
    nowMs
  );
  const liveMatchSeconds = computeLiveCountdown(
    state.matchSeconds,
    state.matchRunning,
    state.matchUpdatedAt,
    nowMs
  );

  const activeCallout =
    state.callout && state.callout.expiresAt > nowMs ? state.callout : null;

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://starevent.live';
  const controllerUrl = `${origin}/control?id=${encodeURIComponent(activeMatchId)}`;
  const overlayUrl = `${origin}/overlay?id=${encodeURIComponent(activeMatchId)}`;

  const handleSwitchRoom = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = sanitizeKabaddiMatchId(roomInput, activeMatchId);
    setRoomInput(cleaned);
    onChangeMatchId(cleaned);
  };

  const handleCreateNewRoom = () => {
    const nextId = generateRandomKabaddiMatchId();
    setRoomInput(nextId);
    onChangeMatchId(nextId);
  };

  const handleCopy = async (key: 'control' | 'overlay' | 'sql', value: string) => {
    const ok = await copyTextSafe(value);
    if (ok) {
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
    }
  };

  const raidProgressPct = Math.max(
    0,
    Math.min(100, (liveRaidSeconds / Math.max(1, state.raidDuration || 30)) * 100)
  );
  const raidCritical = liveRaidSeconds <= 5;

  const renderTeamConsole = (side: KabaddiTeamSide) => {
    const isA = side === 'A';
    const name = isA ? state.teamAName : state.teamBName;
    const code = isA ? state.teamACode : state.teamBCode;
    const color = isA ? state.teamAColor : state.teamBColor;
    const score = isA ? state.teamAScore : state.teamBScore;
    const raidPts = isA ? state.teamARaidPoints : state.teamBRaidPoints;
    const bonusPts = isA ? state.teamABonusPoints : state.teamBBonusPoints;
    const tacklePts = isA ? state.teamATacklePoints : state.teamBTacklePoints;
    const lonaPts = isA ? state.teamALonaPoints : state.teamBLonaPoints;
    const players = isA ? state.teamAPlayersOnMat : state.teamBPlayersOnMat;
    const superTackleActive = players >= 1 && players <= 3;

    return (
      <section
        className="rounded-2xl bg-[#111116] border border-white/10 overflow-hidden shadow-[0_16px_44px_rgba(0,0,0,0.45)]"
        style={{ borderTop: `4px solid ${color}` }}
      >
        {/* Team Header + Editable Name / Short Code */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-[#15151C]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_92px] gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  {isA ? 'Team A Name' : 'Team B Name'}
                </label>
                <input
                  type="text"
                  value={name}
                  maxLength={32}
                  onChange={(e) => {
                    const nextName = e.target.value;
                    updateFields(
                      isA
                        ? {
                            teamAName: nextName,
                            teamACode: deriveShortCode(nextName, state.teamACode),
                          }
                        : {
                            teamBName: nextName,
                            teamBCode: deriveShortCode(nextName, state.teamBCode),
                          }
                    );
                  }}
                  className="w-full rounded-lg bg-[#09090D] border border-white/15 px-3 py-2 text-sm font-bold text-white uppercase tracking-wide focus:outline-none focus:border-[#FFE600]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Code
                </label>
                <input
                  type="text"
                  value={code}
                  maxLength={4}
                  onChange={(e) =>
                    updateFields(
                      isA
                        ? { teamACode: e.target.value.toUpperCase().slice(0, 4) }
                        : { teamBCode: e.target.value.toUpperCase().slice(0, 4) }
                    )
                  }
                  className="w-full rounded-lg bg-[#09090D] border border-white/15 px-2.5 py-2 text-sm font-mono font-extrabold text-[#FFE600] uppercase text-center focus:outline-none focus:border-[#FFE600]"
                />
              </div>
            </div>

            {/* Live Score Readout */}
            <div className="shrink-0 text-right pl-2">
              <span className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                Points
              </span>
              <span className="font-display font-black text-4xl sm:text-5xl leading-none text-white tabular-nums">
                {score}
              </span>
            </div>
          </div>

          {/* Color Swatches + Stat Totals */}
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {KABADDI_TEAM_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  title={preset.label}
                  aria-label={`Set ${isA ? 'Team A' : 'Team B'} color to ${preset.label}`}
                  onClick={() =>
                    updateFields(
                      isA ? { teamAColor: preset.value } : { teamBColor: preset.value }
                    )
                  }
                  className={`w-6 h-6 rounded-md border transition-transform ${
                    color.toLowerCase() === preset.value.toLowerCase()
                      ? 'border-[#FFE600] scale-110 ring-2 ring-[#FFE600]/40'
                      : 'border-white/25 hover:scale-105'
                  }`}
                  style={{ backgroundColor: preset.value }}
                />
              ))}
            </div>

            <div className="flex items-center gap-3 text-xs font-mono text-zinc-300 tabular-nums">
              <span>Raid: <strong className="text-white">{raidPts}</strong></span>
              <span>Bonus: <strong className="text-[#FFE600]">{bonusPts}</strong></span>
              <span>Tackle: <strong className="text-white">{tacklePts}</strong></span>
              <span>All Out: <strong className="text-red-400">{lonaPts}</strong></span>
            </div>
          </div>
        </div>

        {/* Players On Mat Bar */}
        <div className="px-4 sm:px-5 py-3 bg-[#0D0D12] border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              On Mat
            </span>
            <span className="font-mono text-xs font-bold text-white tabular-nums">
              {players}/7
            </span>
            {superTackleActive && (
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#FFE600] border border-[#FFE600]/40 bg-[#FFE600]/10 px-2 py-0.5 rounded">
                Super Tackle ON
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setPlayersOnMat(side, num)}
                className={`w-8 h-8 rounded-lg font-mono text-xs font-bold transition-colors ${
                  num <= players
                    ? 'bg-[#FFE600] text-[#09090D]'
                    : 'bg-white/5 text-zinc-500 border border-white/10 hover:text-white'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Scoring Buttons Grid */}
        <div className="p-4 sm:p-5 space-y-3">
          {/* Raid Points */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Raid Points
            </p>
            <div className="grid grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => addRaidPoints(side, 1)}
                className="min-h-[48px] rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.98] border border-white/15 font-display font-black text-base text-white whitespace-nowrap transition-transform"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => addRaidPoints(side, 2)}
                className="min-h-[48px] rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.98] border border-white/15 font-display font-black text-base text-white whitespace-nowrap transition-transform"
              >
                +2
              </button>
              <button
                type="button"
                onClick={() => addRaidPoints(side, 3)}
                className="min-h-[48px] rounded-xl bg-[#DC2626] hover:bg-[#EF4444] active:scale-[0.98] border border-[#FFE600]/60 font-display font-black text-base text-white whitespace-nowrap transition-transform"
                title="Super Raid (+3)"
              >
                +3★
              </button>
              <button
                type="button"
                onClick={() => addRaidPoints(side, 4)}
                className="min-h-[48px] rounded-xl bg-[#B91C1C] hover:bg-[#DC2626] active:scale-[0.98] border border-[#FFE600]/45 font-display font-black text-base text-[#FFE600] whitespace-nowrap transition-transform"
                title="Super Raid (+4)"
              >
                +4★
              </button>
              <button
                type="button"
                onClick={() => addRaidPoints(side, 5)}
                className="min-h-[48px] rounded-xl bg-[#991B1B] hover:bg-[#B91C1C] active:scale-[0.98] border border-[#FFE600]/45 font-display font-black text-base text-[#FFE600] whitespace-nowrap transition-transform"
                title="Super Raid (+5)"
              >
                +5★
              </button>
            </div>
          </div>

          {/* Bonus, Tackle, Super Tackle, All Out */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => addBonusPoint(side)}
              className="min-h-[48px] px-3 rounded-xl bg-[#FFE600]/15 hover:bg-[#FFE600]/25 active:scale-[0.98] border border-[#FFE600]/50 font-display font-extrabold text-sm text-[#FFE600] flex items-center justify-center gap-1.5 whitespace-nowrap transition-transform"
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              Bonus (+1)
            </button>

            <button
              type="button"
              onClick={() => addTacklePoint(side, false)}
              className="min-h-[48px] px-3 rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.98] border border-white/15 font-display font-extrabold text-sm text-white flex items-center justify-center gap-1.5 whitespace-nowrap transition-transform"
            >
              <Shield className="w-4 h-4 shrink-0 text-sky-400" />
              Tackle (+1)
            </button>

            <button
              type="button"
              onClick={() => addTacklePoint(side, true)}
              className={`min-h-[48px] px-3 rounded-xl active:scale-[0.98] border font-display font-extrabold text-sm flex items-center justify-center gap-1.5 whitespace-nowrap transition-transform ${
                superTackleActive
                  ? 'bg-sky-600 hover:bg-sky-500 border-[#FFE600] text-white'
                  : 'bg-sky-950/70 hover:bg-sky-900/80 border-sky-400/40 text-sky-200'
              }`}
            >
              <Zap className="w-4 h-4 shrink-0 text-[#FFE600]" />
              Super Tackle (+2)
            </button>

            <button
              type="button"
              onClick={() => triggerAllOut(side)}
              className="min-h-[48px] px-3 rounded-xl bg-gradient-to-r from-[#B91C1C] to-[#DC2626] hover:from-[#DC2626] hover:to-[#EF4444] active:scale-[0.98] border border-[#FFE600]/70 font-display font-black text-sm text-[#FFE600] flex items-center justify-center gap-1.5 whitespace-nowrap transition-transform"
            >
              <Flame className="w-4 h-4 shrink-0" />
              All Out (+2)
            </button>
          </div>

          {/* Manual Score Correction */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => adjustScore(side, -1)}
              className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-zinc-300 hover:text-white whitespace-nowrap"
            >
              -1 Correction
            </button>
            <button
              type="button"
              onClick={() => adjustScore(side, 1)}
              className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-zinc-300 hover:text-white whitespace-nowrap"
            >
              +1 Manual Point
            </button>
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-[#09090D] text-white pb-16">
      {/* Top Broadcast Console Header */}
      <header className="sticky top-0 z-30 bg-[#09090D]/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onNavigateHome}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-200 whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Home
            </button>
            <div className="min-w-0">
              <h1 className="font-display font-black text-base sm:text-lg tracking-tight text-white truncate">
                KABADDI LIVE CONTROLLER
              </h1>
              <p className="text-[11px] font-mono text-[#FFE600] truncate">
                STAR EVENT LIVE · ROOM {activeMatchId}
              </p>
            </div>
          </div>

          {/* Isolated Match ID Switcher */}
          <form onSubmit={handleSwitchRoom} className="flex items-center gap-2 flex-wrap">
            <label htmlFor="match-id-input" className="sr-only">
              Match ID
            </label>
            <input
              id="match-id-input"
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
              placeholder="KBD-101"
              maxLength={32}
              className="w-32 sm:w-36 rounded-lg bg-[#15151C] border border-[#FFE600]/45 px-3 py-2 font-mono text-xs sm:text-sm font-bold text-[#FFE600] uppercase focus:outline-none focus:border-[#FFE600]"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-lg bg-[#FFE600] hover:bg-[#FEF08A] text-[#09090D] font-display font-black text-xs uppercase tracking-wide whitespace-nowrap shrink-0"
            >
              Open Room
            </button>
            <button
              type="button"
              onClick={handleCreateNewRoom}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-[#DC2626] hover:bg-[#EF4444] text-white font-display font-bold text-xs uppercase tracking-wide whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              New Room
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 space-y-5">
        {/* Live Broadcast Scoreboard Preview */}
        <section className="rounded-2xl bg-[#111116] border border-white/10 p-3.5 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#FFE600]">
                On-Air Overlay Preview (1920×1080)
              </span>
              {activeCallout && (
                <span className="text-xs font-bold uppercase tracking-wide px-2.5 py-0.5 rounded bg-[#DC2626] text-[#FFE600]">
                  {activeCallout.label}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateFields({ visible: !state.visible })}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold whitespace-nowrap ${
                  state.visible
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'bg-red-950/70 border-red-500/50 text-red-200'
                }`}
              >
                {state.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {state.visible ? 'Overlay Visible' : 'Overlay Hidden'}
              </button>

              <button
                type="button"
                disabled={!canUndo}
                onClick={undoLastAction}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-40 border border-white/15 text-xs font-bold text-white whitespace-nowrap"
              >
                <Undo2 className="w-3.5 h-3.5 text-[#FFE600]" />
                Undo {undoCount > 0 ? `(${undoCount})` : ''}
              </button>

              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/70 border border-red-500/35 text-xs font-bold text-red-200 whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      resetMatch();
                      setConfirmReset(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#DC2626] hover:bg-[#EF4444] text-xs font-black text-white whitespace-nowrap"
                  >
                    Confirm Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-2.5 py-1.5 rounded-lg bg-white/10 text-xs font-bold text-zinc-200 whitespace-nowrap"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          <div
            className={`rounded-xl p-3 sm:p-4 border border-white/10 transition-opacity ${
              state.visible ? 'opacity-100' : 'opacity-45'
            }`}
            style={{
              backgroundColor: '#121218',
              backgroundImage:
                'linear-gradient(45deg, #1b1b24 25%, transparent 25%), linear-gradient(-45deg, #1b1b24 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1b1b24 75%), linear-gradient(-45deg, transparent 75%, #1b1b24 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
            }}
          >
            <KabaddiScoreboardBar
              variant="studio"
              teamAName={state.teamAName}
              teamACode={state.teamACode}
              teamAColor={state.teamAColor}
              teamAScore={state.teamAScore}
              teamABonusPoints={state.teamABonusPoints}
              teamALonaPoints={state.teamALonaPoints}
              teamAPlayersOnMat={state.teamAPlayersOnMat}
              teamBName={state.teamBName}
              teamBCode={state.teamBCode}
              teamBColor={state.teamBColor}
              teamBScore={state.teamBScore}
              teamBBonusPoints={state.teamBBonusPoints}
              teamBLonaPoints={state.teamBLonaPoints}
              teamBPlayersOnMat={state.teamBPlayersOnMat}
              matchSeconds={liveMatchSeconds}
              raidSeconds={liveRaidSeconds}
              raidDuration={state.raidDuration}
              raidRunning={state.raidRunning}
              halfLabel={state.half}
              doOrDie={state.doOrDie}
              alertText={activeCallout ? activeCallout.label : null}
              tournamentTitle={state.tournamentTitle}
              subtitle={state.subtitle}
              showDemoWatermark={false}
            />
          </div>
        </section>

        {/* 30s Raid Timer + Do-or-Die + Half / Match Clock Deck */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 30s Raid Timer Card */}
          <div className="rounded-2xl bg-[#111116] border border-[#FFE600]/30 p-4 sm:p-5 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-[#FFE600]" />
                <h2 className="font-display font-black text-sm uppercase tracking-wider text-white">
                  30s Raid Timer
                </h2>
              </div>
              <span
                className={`font-display font-black text-4xl leading-none tabular-nums ${
                  raidCritical ? 'text-[#EF4444]' : 'text-[#FFE600]'
                }`}
              >
                {String(liveRaidSeconds).padStart(2, '0')}s
              </span>
            </div>

            <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${
                  raidCritical ? 'bg-[#EF4444]' : 'bg-[#FFE600]'
                }`}
                style={{ width: `${raidProgressPct}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={startRaidTimer}
                className={`min-h-[44px] rounded-xl font-display font-black text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  state.raidRunning
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#FFE600] hover:bg-[#FEF08A] text-[#09090D]'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                Start
              </button>
              <button
                type="button"
                onClick={pauseRaidTimer}
                className="min-h-[44px] rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 font-display font-bold text-xs uppercase tracking-wide text-white flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Pause className="w-3.5 h-3.5" />
                Pause
              </button>
              <button
                type="button"
                onClick={() => resetRaidTimer(false)}
                className="min-h-[44px] rounded-xl bg-[#DC2626]/20 hover:bg-[#DC2626]/35 border border-[#DC2626]/50 font-display font-bold text-xs uppercase tracking-wide text-red-200 flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset 30s
              </button>
            </div>
          </div>

          {/* Do-or-Die Raid Card */}
          <div className="rounded-2xl bg-[#111116] border border-white/10 p-4 sm:p-5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                <h2 className="font-display font-black text-sm uppercase tracking-wider text-white">
                  Do-or-Die Raid
                </h2>
              </div>
              <span
                className={`font-mono text-xs font-bold uppercase ${
                  state.doOrDie ? 'text-[#FFE600]' : 'text-zinc-500'
                }`}
              >
                {state.doOrDie
                  ? state.doOrDieTeam === 'A'
                    ? `${state.teamACode} ACTIVE`
                    : state.doOrDieTeam === 'B'
                      ? `${state.teamBCode} ACTIVE`
                      : 'ACTIVE'
                  : 'OFF'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDoOrDie('A')}
                className={`min-h-[46px] px-2 rounded-xl border font-display font-extrabold text-xs uppercase whitespace-nowrap ${
                  state.doOrDie && state.doOrDieTeam === 'A'
                    ? 'bg-[#DC2626] border-[#FFE600] text-[#FFE600]'
                    : 'bg-white/5 hover:bg-white/10 border-white/15 text-zinc-200'
                }`}
              >
                {state.teamACode} Do/Die
              </button>
              <button
                type="button"
                onClick={() => setDoOrDie('B')}
                className={`min-h-[46px] px-2 rounded-xl border font-display font-extrabold text-xs uppercase whitespace-nowrap ${
                  state.doOrDie && state.doOrDieTeam === 'B'
                    ? 'bg-[#DC2626] border-[#FFE600] text-[#FFE600]'
                    : 'bg-white/5 hover:bg-white/10 border-white/15 text-zinc-200'
                }`}
              >
                {state.teamBCode} Do/Die
              </button>
              <button
                type="button"
                onClick={() => setDoOrDie(null)}
                className={`min-h-[46px] px-2 rounded-xl border font-display font-bold text-xs uppercase whitespace-nowrap ${
                  !state.doOrDie
                    ? 'bg-white/15 border-white/30 text-white'
                    : 'bg-white/5 hover:bg-white/10 border-white/15 text-zinc-400'
                }`}
              >
                Clear
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={state.tournamentTitle}
                maxLength={64}
                onChange={(e) => updateFields({ tournamentTitle: e.target.value })}
                placeholder="Tournament Title"
                className="rounded-lg bg-[#09090D] border border-white/15 px-2.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[#FFE600]"
              />
              <input
                type="text"
                value={state.subtitle}
                maxLength={48}
                onChange={(e) => updateFields({ subtitle: e.target.value })}
                placeholder="Match Subtitle"
                className="rounded-lg bg-[#09090D] border border-white/15 px-2.5 py-2 text-xs font-semibold text-zinc-200 focus:outline-none focus:border-[#FFE600]"
              />
            </div>
          </div>

          {/* Half Selector & Match Clock */}
          <div className="rounded-2xl bg-[#111116] border border-white/10 p-4 sm:p-5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display font-black text-sm uppercase tracking-wider text-white">
                Half & Match Clock
              </h2>
              <span className="font-mono text-2xl font-black text-white tabular-nums">
                {formatClockMMSS(liveMatchSeconds)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-1.5">
              {HALVES.map((half) => (
                <button
                  key={half}
                  type="button"
                  onClick={() => setHalf(half)}
                  className={`py-2 px-2 rounded-lg border font-display font-extrabold text-xs uppercase whitespace-nowrap ${
                    state.half === half
                      ? 'bg-[#FFE600] border-[#FFE600] text-[#09090D]'
                      : 'bg-white/5 hover:bg-white/10 border-white/15 text-zinc-300'
                  }`}
                >
                  {half}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={toggleMatchTimer}
                className="col-span-2 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white whitespace-nowrap"
              >
                {state.matchRunning ? 'Pause Clock' : 'Start Clock'}
              </button>
              <button
                type="button"
                onClick={() => setMatchSeconds(Math.max(0, liveMatchSeconds - 60))}
                className="py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-zinc-300"
              >
                -1m
              </button>
              <button
                type="button"
                onClick={() => setMatchSeconds(20 * 60)}
                className="py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-[#FFE600]"
              >
                20:00
              </button>
            </div>
          </div>
        </section>

        {/* Dual Team Scoring Consoles */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {renderTeamConsole('A')}
          {renderTeamConsole('B')}
        </div>

        {/* Animated Broadcast Callouts Bar */}
        <section className="rounded-2xl bg-[#111116] border border-white/10 p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display font-black text-sm uppercase tracking-wider text-white">
                Animated Broadcast Callouts
              </h2>
              <p className="text-xs text-zinc-400">
                Trigger instant on-air banners on the 1920×1080 vMix overlay.
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'A', label: state.teamACode },
                  { id: 'B', label: state.teamBCode },
                  { id: null, label: 'Match' },
                ] as Array<{ id: KabaddiTeamSide | null; label: string }>
              ).map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setCalloutTeam(opt.id)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold uppercase whitespace-nowrap ${
                    calloutTeam === opt.id
                      ? 'bg-[#FFE600] border-[#FFE600] text-[#09090D]'
                      : 'bg-white/5 border-white/15 text-zinc-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {(
              [
                { type: 'SUPER RAID', label: 'SUPER RAID', cls: 'bg-[#DC2626] hover:bg-[#EF4444] border-[#FFE600]/65 text-[#FFE600]' },
                { type: 'SUPER TACKLE', label: 'SUPER TACKLE', cls: 'bg-sky-700 hover:bg-sky-600 border-sky-300/60 text-white' },
                { type: 'ALL OUT', label: 'ALL OUT!', cls: 'bg-[#991B1B] hover:bg-[#B91C1C] border-[#FFE600] text-[#FFE600]' },
                { type: 'DO OR DIE', label: 'DO OR DIE', cls: 'bg-amber-700 hover:bg-amber-600 border-[#FFE600]/60 text-white' },
              ] as Array<{ type: KabaddiCalloutType; label: string; cls: string }>
            ).map((btn) => (
              <button
                key={btn.type}
                type="button"
                onClick={() => {
                  const sub =
                    calloutTeam === 'A'
                      ? state.teamAName
                      : calloutTeam === 'B'
                        ? state.teamBName
                        : state.tournamentTitle;
                  triggerCallout(btn.type, calloutTeam, btn.label, sub);
                }}
                className={`min-h-[46px] px-3 rounded-xl border font-display font-black text-xs sm:text-sm uppercase tracking-wide whitespace-nowrap transition-transform active:scale-[0.98] ${btn.cls}`}
              >
                {btn.label}
              </button>
            ))}

            <button
              type="button"
              onClick={clearCallout}
              className="min-h-[46px] px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 font-display font-bold text-xs sm:text-sm uppercase text-zinc-200 whitespace-nowrap"
            >
              Clear Banner
            </button>
          </div>
        </section>

        {/* Share & vMix 1920x1080 Setup Section */}
        <section className="rounded-2xl bg-[#111116] border border-[#FFE600]/30 p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Monitor className="w-5 h-5 text-[#FFE600]" />
              <div>
                <h2 className="font-display font-black text-base uppercase tracking-wide text-white">
                  Share &amp; vMix 1920×1080 Setup
                </h2>
                <p className="text-xs text-zinc-400">
                  Private room <span className="font-mono text-[#FFE600]">{activeMatchId}</span> · Isolated per Match ID via Supabase Realtime.
                </p>
              </div>
            </div>

            <a
              href={overlayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#FFE600] hover:bg-[#FEF08A] text-[#09090D] font-display font-black text-xs uppercase tracking-wide whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open vMix Overlay
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Controller URL */}
            <div className="rounded-xl bg-[#09090D] border border-white/10 p-3.5 space-y-2">
              <span className="block text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                Controller URL (Mobile / Laptop)
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={controllerUrl}
                  className="flex-1 min-w-0 bg-[#15151C] border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-zinc-200"
                />
                <button
                  type="button"
                  onClick={() => handleCopy('control', controllerUrl)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white whitespace-nowrap shrink-0"
                >
                  {copiedKey === 'control' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#FFE600]" />
                      Copy URL
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* vMix Overlay URL */}
            <div className="rounded-xl bg-[#09090D] border border-[#FFE600]/35 p-3.5 space-y-2">
              <span className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[#FFE600]">
                vMix Overlay URL (1920×1080 Transparent)
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={overlayUrl}
                  className="flex-1 min-w-0 bg-[#15151C] border border-[#FFE600]/25 rounded-lg px-3 py-2 font-mono text-xs text-[#FFE600]"
                />
                <button
                  type="button"
                  onClick={() => handleCopy('overlay', overlayUrl)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#DC2626] hover:bg-[#EF4444] text-xs font-bold text-white whitespace-nowrap shrink-0"
                >
                  {copiedKey === 'overlay' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#FFE600]" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Overlay
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick vMix Web Browser Input Instructions */}
          <div className="rounded-xl bg-[#09090D] border border-white/10 p-4">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-[#FFE600] mb-2.5">
              vMix Web Browser Input Setup
            </h3>
            <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-zinc-300">
              <li className="rounded-lg bg-white/5 p-3 border border-white/5">
                <span className="font-mono font-bold text-[#FFE600] block mb-1">1. Add Input</span>
                In vMix, click <strong>Add Input → Web Browser</strong>.
              </li>
              <li className="rounded-lg bg-white/5 p-3 border border-white/5">
                <span className="font-mono font-bold text-[#FFE600] block mb-1">2. Paste URL</span>
                Paste the copied <strong>vMix Overlay URL</strong> into the URL box.
              </li>
              <li className="rounded-lg bg-white/5 p-3 border border-white/5">
                <span className="font-mono font-bold text-[#FFE600] block mb-1">3. Set 1920×1080</span>
                Set Width to <strong>1920</strong> and Height to <strong>1080</strong>, then click OK.
              </li>
              <li className="rounded-lg bg-white/5 p-3 border border-white/5">
                <span className="font-mono font-bold text-[#FFE600] block mb-1">4. Go Live</span>
                Click Overlay channel <strong>1</strong> to put the transparent scoreboard on air.
              </li>
            </ol>
          </div>

          {/* Conditional Supabase RLS / Grant Helper (only displayed if Supabase returns 42501 permission denied) */}
          {syncStatus === 'permission_required' && (
            <div className="rounded-xl bg-amber-950/40 border border-amber-400/40 p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold text-amber-200">
                  Supabase Action Needed: Enable anon read/write &amp; Realtime on <code className="text-[#FFE600]">public.live_scoreboards</code> in your Supabase SQL Editor for cross-device sync.
                </p>
                <button
                  type="button"
                  onClick={() => handleCopy('sql', SUPABASE_RLS_SQL)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFE600] text-[#09090D] text-xs font-black whitespace-nowrap"
                >
                  {copiedKey === 'sql' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'sql' ? 'SQL Copied' : 'Copy Supabase SQL'}
                </button>
              </div>
              {syncError && <p className="text-[11px] font-mono text-amber-300/90">{syncError}</p>}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
