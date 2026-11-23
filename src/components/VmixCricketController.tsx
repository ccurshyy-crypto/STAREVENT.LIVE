import { ChangeEvent, useState } from 'react';
import {
  ArrowLeftRight,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  ImagePlus,
  RotateCcw,
  Trash2,
  Undo2,
} from 'lucide-react';
import { Language } from '../data/content';
import { useCricketScoreboard } from '../hooks/useCricketScoreboard';
import { CricketFlagId, formatCricketOvers, OverlayBackground } from '../types/overlay';
import { CRICKET_FLAG_OPTIONS, CricketScoreboardBar } from './CricketScoreboardBar';

interface VmixCricketControllerProps {
  targetUid: string;
  accountLabel: string;
  lang: Language;
  outputBg: OverlayBackground;
  onChangeOutputBg: (bg: OverlayBackground) => void;
  transparentBg: boolean;
  onToggleTransparentBg: () => void;
}

function readCompressedTeamLogo(file: File, onReady: (dataUrl: string) => void) {
  if (!file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = () => {
    const src = typeof reader.result === 'string' ? reader.result : '';
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      const maxSize = 180;
      const scale = Math.min(1, maxSize / Math.max(img.width || 1, img.height || 1));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const png = canvas.toDataURL('image/png');
      onReady(png.length <= 170000 ? png : canvas.toDataURL('image/webp', 0.82).slice(0, 170000));
    };
    img.src = src;
  };
  reader.readAsDataURL(file);
}

/**
 * Single Broadcast Cricket Scoreboard vMix Controller.
 *
 * Syncs strictly with the authenticated operator's `/users/{uid}/cricket/current`
 * Firestore document and outputs a single transparent vMix/OBS Browser Source URL:
 * `/cricket-overlay/{uid}`.
 */
export function VmixCricketController({
  targetUid,
  accountLabel,
  outputBg,
  onChangeOutputBg,
  transparentBg,
  onToggleTransparentBg,
}: VmixCricketControllerProps) {
  const cricket = useCricketScoreboard({
    targetUid,
    role: 'controller',
    canWrite: Boolean(targetUid),
  });

  const { doc: data } = cricket;
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://starevent.live';
  const vmixUrl = `${origin}/cricket-overlay/${encodeURIComponent(targetUid)}${
    outputBg !== 'transparent' ? `?bg=${outputBg}` : ''
  }`;

  const copyValue = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((c) => (c === key ? null : c)), 2000);
    } catch {
      setCopiedKey(null);
    }
  };

  const handleUploadLogo = (side: 'batting' | 'bowling', e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    readCompressedTeamLogo(file, (url) => {
      if (side === 'batting') {
        cricket.updateFields({ battingLogoUrl: url }, true);
      } else {
        cricket.updateFields({ bowlingLogoUrl: url }, true);
      }
    });
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

  return (
    <div className="bg-[#0F1420]/90 backdrop-blur-md border border-white/14 rounded-2xl overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.65)]">
      {/* Top Studio Header Bar */}
      <div className="bg-[#0B0F19]/95 border-b border-white/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <span className="font-display text-sm font-extrabold text-white tracking-tight">
            Cricket Live Studio
          </span>
          <span aria-hidden="true" className="text-zinc-600">·</span>
          <span className="font-mono font-bold text-[#FACC15] uppercase">{accountLabel}</span>
          <span aria-hidden="true" className="text-zinc-600">·</span>
          <span
            className={`font-mono font-bold ${
              cricket.connected ? 'text-[#4ADE80]' : 'text-[#FACC15]'
            }`}
          >
            {cricket.connected
              ? cricket.saving
                ? 'SYNCING...'
                : 'VMIX CLOUD LIVE'
              : 'CONNECTING...'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void cricket.toggleVisible()}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-colors whitespace-nowrap ${
              data.visible
                ? 'bg-[#14532D]/70 border-[#4ADE80]/50 text-[#BBF7D0]'
                : 'bg-white/[0.06] border-white/15 text-zinc-300'
            }`}
          >
            {data.visible ? (
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{data.visible ? 'Overlay ON' : 'Overlay Hidden'}</span>
          </button>

          <button
            type="button"
            disabled={!cricket.canUndo}
            onClick={() => void cricket.undoLast()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/45 text-amber-100 transition-colors disabled:opacity-35 whitespace-nowrap"
          >
            <Undo2 className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
            <span>UNDO</span>
            {cricket.undoCount > 0 && (
              <span className="font-mono text-[11px] font-black text-[#FACC15] tabular-nums">
                ({cricket.undoCount})
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setResetConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-red-600/20 hover:bg-red-600/35 border border-red-400/50 text-red-100 transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#F87171]" aria-hidden="true" />
            <span>Reset Score</span>
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-5">
        {cricket.errorMessage && (
          <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200">
            {cricket.errorMessage}
          </div>
        )}

        {/* Single vMix / OBS Browser Source URL Strip */}
        <div className="rounded-xl border border-white/12 bg-[#141A29] p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-white">Single vMix / OBS Browser Source URL</span>
              <span aria-hidden="true" className="text-zinc-600">·</span>
              <span className="font-mono text-zinc-400">1920×1080 Transparent</span>
            </div>
            <p className="font-mono text-xs text-[#FACC15] truncate select-all">{vmixUrl}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Chroma Key / Transparency selector */}
            <div className="flex items-center gap-1 p-1 bg-[#0B0F19] border border-white/10 rounded-lg">
              {(['transparent', 'green', 'blue'] as OverlayBackground[]).map((bg) => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => onChangeOutputBg(bg)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap ${
                    outputBg === bg
                      ? 'bg-[#DC2626] text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {bg === 'transparent' ? 'Transparent' : bg === 'green' ? 'Green' : 'Blue'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void copyValue('vmix', vmixUrl)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white transition-colors whitespace-nowrap"
            >
              {copiedKey === 'vmix' ? (
                <>
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Copied URL</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Copy vMix URL</span>
                </>
              )}
            </button>

            <a
              href={vmixUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-white transition-colors whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Open Output</span>
            </a>
          </div>
        </div>

        {/* Live 16:9 Program Preview Monitor */}
        <div
          className="relative w-full aspect-[16/7] sm:aspect-[16/6.2] rounded-xl overflow-hidden border border-white/15 flex flex-col justify-end p-3 sm:p-5"
          style={
            monitorBackgroundStyle ?? {
              background: 'radial-gradient(circle at 50% 25%, #1E293B 0%, #090D16 100%)',
            }
          }
        >
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
            <span className="font-mono text-[11px] font-bold text-white/90 bg-black/65 px-2.5 py-1 rounded border border-white/10 tabular-nums">
              PGM 1920×1080 · {data.battingTeamCode} {data.runs}-{data.wickets} ({formatCricketOvers(data.totalBalls)}/{data.maxOvers})
            </span>
            <button
              type="button"
              onClick={onToggleTransparentBg}
              className="pointer-events-auto font-mono text-[11px] font-semibold text-zinc-200 bg-black/65 hover:bg-black/85 px-2.5 py-1 rounded border border-white/15 transition-colors"
            >
              {transparentBg ? 'Checkerboard BG' : 'Dark Studio BG'}
            </button>
          </div>

          <div className={`w-full transition-opacity duration-200 ${data.visible ? 'opacity-100' : 'opacity-25'}`}>
            <CricketScoreboardBar data={data} variant="studio" />
          </div>
        </div>

        {/* Quick Ball-by-Ball Live Scoring Desk */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Ball Scoring Buttons */}
          <div className="lg:col-span-7 bg-[#141A29] border border-white/10 rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-sm font-bold text-white">
                Ball-by-Ball Live Scoring
              </h3>
              <span className="font-mono text-xs text-zinc-400 tabular-nums">
                Score: {data.runs}-{data.wickets} · Overs: {formatCricketOvers(data.totalBalls)} / {data.maxOvers}
              </span>
            </div>

            {/* Runs Row */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { val: 0, label: '0', sub: 'Dot', cls: 'bg-[#1E293B] hover:bg-[#334155] border-white/15 text-white' },
                { val: 1, label: '+1', sub: 'Run', cls: 'bg-[#1D4ED8] hover:bg-[#2563EB] border-blue-400/40 text-white' },
                { val: 2, label: '+2', sub: 'Runs', cls: 'bg-[#1D4ED8] hover:bg-[#2563EB] border-blue-400/40 text-white' },
                { val: 3, label: '+3', sub: 'Runs', cls: 'bg-[#1D4ED8] hover:bg-[#2563EB] border-blue-400/40 text-white' },
                { val: 4, label: '4', sub: 'FOUR', cls: 'bg-[#C8006E] hover:bg-[#E5007D] border-pink-300/45 text-white' },
                { val: 6, label: '6', sub: 'SIX', cls: 'bg-[#EAB308] hover:bg-[#FACC15] border-yellow-200/60 text-[#160A4A]' },
              ].map((btn) => (
                <button
                  key={btn.val}
                  type="button"
                  onClick={() => void cricket.recordRuns(btn.val)}
                  className={`min-h-[54px] py-2 px-2 rounded-xl border text-center transition-colors ${btn.cls}`}
                >
                  <span className="block font-mono text-lg font-black leading-none tabular-nums">
                    {btn.label}
                  </span>
                  <span className="block text-[10px] font-bold mt-1 opacity-90">{btn.sub}</span>
                </button>
              ))}
            </div>

            {/* Wicket & Extras Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => void cricket.recordWicket()}
                className="min-h-[44px] py-2 px-3 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] border border-red-300/40 text-white text-xs font-extrabold transition-colors whitespace-nowrap"
              >
                WICKET (OUT)
              </button>
              <button
                type="button"
                onClick={() => void cricket.recordExtra('WD', 1)}
                className="min-h-[44px] py-2 px-3 rounded-xl bg-amber-600/25 hover:bg-amber-600/40 border border-amber-400/40 text-amber-100 text-xs font-bold transition-colors whitespace-nowrap"
              >
                WIDE (+1)
              </button>
              <button
                type="button"
                onClick={() => void cricket.recordExtra('NB', 1)}
                className="min-h-[44px] py-2 px-3 rounded-xl bg-amber-600/25 hover:bg-amber-600/40 border border-amber-400/40 text-amber-100 text-xs font-bold transition-colors whitespace-nowrap"
              >
                NO BALL (+1)
              </button>
              <button
                type="button"
                onClick={() => void cricket.recordExtra('B', 1)}
                className="min-h-[44px] py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-zinc-100 text-xs font-semibold transition-colors whitespace-nowrap"
              >
                BYE (+1)
              </button>
              <button
                type="button"
                onClick={() => void cricket.recordExtra('LB', 1)}
                className="min-h-[44px] py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-zinc-100 text-xs font-semibold transition-colors whitespace-nowrap"
              >
                LEG BYE (+1)
              </button>
            </div>

            {/* Utility Controls: Strike, Over & Manual Corrections */}
            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void cricket.swapStrike()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-[#230A6B] hover:bg-[#311191] border border-indigo-400/40 text-white transition-colors whitespace-nowrap"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-[#FFEC00]" aria-hidden="true" />
                <span>Swap Strike</span>
              </button>

              <button
                type="button"
                onClick={() => void cricket.startNewOver()}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-white/[0.07] hover:bg-white/[0.14] border border-white/15 text-zinc-100 transition-colors whitespace-nowrap"
              >
                New Over (Clear Balls)
              </button>

              <button
                type="button"
                onClick={() => void cricket.swapInnings()}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-white/[0.07] hover:bg-white/[0.14] border border-white/15 text-zinc-100 transition-colors whitespace-nowrap"
              >
                Swap Innings
              </button>

              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => void cricket.adjustManual({ runs: -1 })}
                  className="px-2.5 py-1.5 text-[11px] font-mono font-bold rounded-lg bg-white/[0.05] hover:bg-white/[0.12] border border-white/12 text-zinc-200 tabular-nums"
                >
                  -1 Run
                </button>
                <button
                  type="button"
                  onClick={() => void cricket.adjustManual({ wickets: -1 })}
                  className="px-2.5 py-1.5 text-[11px] font-mono font-bold rounded-lg bg-white/[0.05] hover:bg-white/[0.12] border border-white/12 text-zinc-200 tabular-nums"
                >
                  -1 Wkt
                </button>
                <button
                  type="button"
                  onClick={() => void cricket.adjustManual({ balls: -1 })}
                  className="px-2.5 py-1.5 text-[11px] font-mono font-bold rounded-lg bg-white/[0.05] hover:bg-white/[0.12] border border-white/12 text-zinc-200 tabular-nums"
                >
                  -1 Ball
                </button>
              </div>
            </div>
          </div>

          {/* Right: Batters & Bowler Direct Editor */}
          <div className="lg:col-span-5 bg-[#141A29] border border-white/10 rounded-xl p-4 space-y-3.5">
            <h3 className="font-display text-sm font-bold text-white">Batters &amp; Bowler</h3>

            {/* Batter 1 */}
            <div className="grid grid-cols-12 gap-2 items-center">
              <button
                type="button"
                onClick={() => cricket.updateFields({ striker: 1 }, true)}
                title="Set Batter 1 on strike"
                className={`col-span-1 h-9 rounded-lg font-bold text-xs flex items-center justify-center border ${
                  data.striker === 1
                    ? 'bg-[#E5007D] border-pink-300 text-white'
                    : 'bg-[#0B0F19] border-white/15 text-zinc-500 hover:text-white'
                }`}
              >
                ▶
              </button>
              <input
                type="text"
                aria-label="Batter 1 Name"
                value={data.batter1Name}
                onChange={(e) => cricket.updateFields({ batter1Name: e.target.value })}
                onBlur={() => void cricket.flushPendingPatch()}
                placeholder="Batter 1"
                className="col-span-5 h-9 px-2.5 text-xs font-semibold uppercase bg-[#0B0F19] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
              />
              <input
                type="number"
                min={0}
                max={999}
                aria-label="Batter 1 Runs"
                value={data.batter1Runs}
                onChange={(e) =>
                  cricket.updateFields({ batter1Runs: Math.max(0, Number(e.target.value) || 0) })
                }
                onBlur={() => void cricket.flushPendingPatch()}
                className="col-span-3 h-9 px-2 text-xs font-mono font-bold text-center bg-[#0B0F19] border border-white/15 rounded-lg text-white tabular-nums focus:outline-none focus:border-[#FACC15]"
              />
              <input
                type="number"
                min={0}
                max={999}
                aria-label="Batter 1 Balls"
                value={data.batter1Balls}
                onChange={(e) =>
                  cricket.updateFields({ batter1Balls: Math.max(0, Number(e.target.value) || 0) })
                }
                onBlur={() => void cricket.flushPendingPatch()}
                className="col-span-3 h-9 px-2 text-xs font-mono text-center bg-[#0B0F19] border border-white/15 rounded-lg text-zinc-300 tabular-nums focus:outline-none focus:border-[#FACC15]"
              />
            </div>

            {/* Batter 2 */}
            <div className="grid grid-cols-12 gap-2 items-center">
              <button
                type="button"
                onClick={() => cricket.updateFields({ striker: 2 }, true)}
                title="Set Batter 2 on strike"
                className={`col-span-1 h-9 rounded-lg font-bold text-xs flex items-center justify-center border ${
                  data.striker === 2
                    ? 'bg-[#E5007D] border-pink-300 text-white'
                    : 'bg-[#0B0F19] border-white/15 text-zinc-500 hover:text-white'
                }`}
              >
                ▶
              </button>
              <input
                type="text"
                aria-label="Batter 2 Name"
                value={data.batter2Name}
                onChange={(e) => cricket.updateFields({ batter2Name: e.target.value })}
                onBlur={() => void cricket.flushPendingPatch()}
                placeholder="Batter 2"
                className="col-span-5 h-9 px-2.5 text-xs font-semibold uppercase bg-[#0B0F19] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
              />
              <input
                type="number"
                min={0}
                max={999}
                aria-label="Batter 2 Runs"
                value={data.batter2Runs}
                onChange={(e) =>
                  cricket.updateFields({ batter2Runs: Math.max(0, Number(e.target.value) || 0) })
                }
                onBlur={() => void cricket.flushPendingPatch()}
                className="col-span-3 h-9 px-2 text-xs font-mono font-bold text-center bg-[#0B0F19] border border-white/15 rounded-lg text-white tabular-nums focus:outline-none focus:border-[#FACC15]"
              />
              <input
                type="number"
                min={0}
                max={999}
                aria-label="Batter 2 Balls"
                value={data.batter2Balls}
                onChange={(e) =>
                  cricket.updateFields({ batter2Balls: Math.max(0, Number(e.target.value) || 0) })
                }
                onBlur={() => void cricket.flushPendingPatch()}
                className="col-span-3 h-9 px-2 text-xs font-mono text-center bg-[#0B0F19] border border-white/15 rounded-lg text-zinc-300 tabular-nums focus:outline-none focus:border-[#FACC15]"
              />
            </div>

            {/* Bowler */}
            <div className="pt-2.5 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Bowler (Name · Wkts · Runs · Balls)</span>
                <span className="font-mono tabular-nums">
                  {data.bowlerWickets}-{data.bowlerRuns} ({formatCricketOvers(data.bowlerBalls)})
                </span>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <input
                  type="text"
                  aria-label="Bowler Name"
                  value={data.bowlerName}
                  onChange={(e) => cricket.updateFields({ bowlerName: e.target.value })}
                  onBlur={() => void cricket.flushPendingPatch()}
                  placeholder="Bowler Name"
                  className="col-span-6 h-9 px-2.5 text-xs font-semibold uppercase bg-[#0B0F19] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                />
                <input
                  type="number"
                  min={0}
                  max={10}
                  aria-label="Bowler Wickets"
                  value={data.bowlerWickets}
                  onChange={(e) =>
                    cricket.updateFields({ bowlerWickets: Math.max(0, Number(e.target.value) || 0) })
                  }
                  onBlur={() => void cricket.flushPendingPatch()}
                  className="col-span-2 h-9 px-1.5 text-xs font-mono font-bold text-center bg-[#0B0F19] border border-white/15 rounded-lg text-white tabular-nums focus:outline-none focus:border-[#FACC15]"
                />
                <input
                  type="number"
                  min={0}
                  max={999}
                  aria-label="Bowler Runs"
                  value={data.bowlerRuns}
                  onChange={(e) =>
                    cricket.updateFields({ bowlerRuns: Math.max(0, Number(e.target.value) || 0) })
                  }
                  onBlur={() => void cricket.flushPendingPatch()}
                  className="col-span-2 h-9 px-1.5 text-xs font-mono font-bold text-center bg-[#0B0F19] border border-white/15 rounded-lg text-white tabular-nums focus:outline-none focus:border-[#FACC15]"
                />
                <input
                  type="number"
                  min={0}
                  max={600}
                  aria-label="Bowler Balls"
                  value={data.bowlerBalls}
                  onChange={(e) =>
                    cricket.updateFields({ bowlerBalls: Math.max(0, Number(e.target.value) || 0) })
                  }
                  onBlur={() => void cricket.flushPendingPatch()}
                  className="col-span-2 h-9 px-1.5 text-xs font-mono text-center bg-[#0B0F19] border border-white/15 rounded-lg text-zinc-300 tabular-nums focus:outline-none focus:border-[#FACC15]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Teams, Flags, Custom Logos & Center Tournament Tagline */}
        <div className="bg-[#141A29] border border-white/10 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Batting Team (Left Flag) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-300">
              Batting Team (Left Flag)
            </label>
            <div className="grid grid-cols-12 gap-2">
              <input
                type="text"
                maxLength={6}
                aria-label="Batting Team Code"
                value={data.battingTeamCode}
                onChange={(e) => cricket.updateFields({ battingTeamCode: e.target.value.toUpperCase() })}
                onBlur={() => void cricket.flushPendingPatch()}
                className="col-span-4 h-9 px-2.5 text-xs font-mono font-bold uppercase bg-[#0B0F19] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
              />
              <select
                aria-label="Batting Team Flag"
                value={data.battingFlagId}
                onChange={(e) =>
                  cricket.updateFields({ battingFlagId: e.target.value as CricketFlagId }, true)
                }
                className="col-span-8 h-9 px-2 text-xs bg-[#0B0F19] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
              >
                {CRICKET_FLAG_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 rounded-lg text-zinc-200 cursor-pointer">
                <ImagePlus className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
                <span>{data.battingLogoUrl ? 'Change Logo' : 'Upload Logo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleUploadLogo('batting', e)}
                  className="sr-only"
                />
              </label>
              {data.battingLogoUrl && (
                <button
                  type="button"
                  onClick={() => cricket.updateFields({ battingLogoUrl: '' }, true)}
                  className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-red-300 hover:text-red-200"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>

          {/* Center Tournament Title & Max Overs */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-300">
              Tournament Line &amp; Max Overs
            </label>
            <input
              type="text"
              aria-label="Tournament Banner Text"
              value={data.tournamentText}
              onChange={(e) => cricket.updateFields({ tournamentText: e.target.value })}
              onBlur={() => void cricket.flushPendingPatch()}
              placeholder="CPL SEASON 01 - 2023"
              className="w-full h-9 px-2.5 text-xs font-semibold uppercase bg-[#0B0F19] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
            />
            <div className="flex items-center gap-1.5">
              {[8, 10, 20, 50].map((ov) => (
                <button
                  key={ov}
                  type="button"
                  onClick={() => cricket.updateFields({ maxOvers: ov }, true)}
                  className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg border tabular-nums ${
                    data.maxOvers === ov
                      ? 'bg-[#FFEC00] border-yellow-300 text-[#160A4A]'
                      : 'bg-[#0B0F19] border-white/15 text-zinc-300 hover:text-white'
                  }`}
                >
                  {ov} Ov
                </button>
              ))}
              <input
                type="number"
                min={1}
                max={500}
                aria-label="Custom Max Overs"
                value={data.maxOvers}
                onChange={(e) =>
                  cricket.updateFields({ maxOvers: Math.max(1, Number(e.target.value) || 20) })
                }
                onBlur={() => void cricket.flushPendingPatch()}
                className="w-16 h-7 px-2 text-xs font-mono font-bold text-center bg-[#0B0F19] border border-white/15 rounded-lg text-white tabular-nums ml-auto"
              />
            </div>
          </div>

          {/* Bowling Team (Right Flag) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-300">
              Bowling Team (Right Flag)
            </label>
            <div className="grid grid-cols-12 gap-2">
              <input
                type="text"
                maxLength={6}
                aria-label="Bowling Team Code"
                value={data.bowlingTeamCode}
                onChange={(e) => cricket.updateFields({ bowlingTeamCode: e.target.value.toUpperCase() })}
                onBlur={() => void cricket.flushPendingPatch()}
                className="col-span-4 h-9 px-2.5 text-xs font-mono font-bold uppercase bg-[#0B0F19] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
              />
              <select
                aria-label="Bowling Team Flag"
                value={data.bowlingFlagId}
                onChange={(e) =>
                  cricket.updateFields({ bowlingFlagId: e.target.value as CricketFlagId }, true)
                }
                className="col-span-8 h-9 px-2 text-xs bg-[#0B0F19] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
              >
                {CRICKET_FLAG_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 rounded-lg text-zinc-200 cursor-pointer">
                <ImagePlus className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
                <span>{data.bowlingLogoUrl ? 'Change Logo' : 'Upload Logo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleUploadLogo('bowling', e)}
                  className="sr-only"
                />
              </label>
              {data.bowlingLogoUrl && (
                <button
                  type="button"
                  onClick={() => cricket.updateFields({ bowlingLogoUrl: '' }, true)}
                  className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-red-300 hover:text-red-200"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* In-App Reset Confirmation Modal */}
      {resetConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Reset Cricket Score"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#121726] p-5 space-y-4 shadow-2xl">
            <div className="space-y-1.5">
              <h4 className="font-display text-base font-bold text-white">Reset Cricket Score?</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                This resets runs, wickets, overs, and current over balls to 0-0 (0.0). Team codes, flags, logos, and tournament text will be preserved.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setResetConfirmOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetConfirmOpen(false);
                  void cricket.resetScore();
                }}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
