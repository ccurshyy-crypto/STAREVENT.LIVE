import { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Eraser,
  ExternalLink,
  Eye,
  EyeOff,
  Layers,
  Tv,
} from 'lucide-react';
import { CricketSuiteState } from '../../types/cricketSuite';
import { BroadcastOverlayCanvas } from './BroadcastOverlayCanvas';

interface TvOverlayControllerViewProps {
  state: CricketSuiteState;
  overlayUrl: string;
  updateState: (updater: (prev: CricketSuiteState) => CricketSuiteState) => void;
  onCopyOverlayUrl: () => void;
  onGoToGroups?: () => void;
  onToast: (msg: string) => void;
}

export function TvOverlayControllerView({
  state,
  overlayUrl,
  updateState,
  onCopyOverlayUrl,
  onToast,
}: TvOverlayControllerViewProps) {
  const [copiedMain, setCopiedMain] = useState(false);
  const [copiedGreen, setCopiedGreen] = useState(false);
  const [showLiveMonitor, setShowLiveMonitor] = useState(true);
  const [previewBg, setPreviewBg] = useState<'transparent' | 'green'>('transparent');

  const greenOverlayUrl = useMemo(() => {
    const separator = overlayUrl.includes('?') ? '&' : '?';
    return `${overlayUrl}${separator}bg=green`;
  }, [overlayUrl]);

  const handleCopyMain = () => {
    onCopyOverlayUrl();
    setCopiedMain(true);
    window.setTimeout(() => setCopiedMain(false), 1800);
  };

  const handleCopyGreen = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(greenOverlayUrl)
        .then(() => {
          setCopiedGreen(true);
          onToast('Chroma-key (?bg=green) overlay link copied!');
          window.setTimeout(() => setCopiedGreen(false), 1800);
        })
        .catch(() => onToast('Copy failed — please copy the link manually.'));
    }
  };

  const handleClearCanvas = () => {
    updateState((prev) => ({
      ...prev,
      overlay: {
        ...prev.overlay,
        showPlayerPhoto: false,
        showTeamLogo: false,
        showChannelLogo: false,
        autoTransition: false,
        bottomScoreMode: 'EMPTY',
        mainCard: { kind: 'NONE' },
        activeTransition: null,
        customMsgHeading: '',
        customMsgDescription: '',
      },
    }));
    onToast('Overlay canvas cleared.');
  };

  return (
    <div className="space-y-5">
      {/* Permanent vMix / OBS Overlay Link Bar */}
      <div className="rounded-2xl bg-[#111116] border border-[#FFE600]/35 p-4 sm:p-5 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
            <span className="font-mono text-xs font-black text-[#FFE600] whitespace-nowrap">
              Overlay Link :
            </span>
            <div className="flex-1 min-w-[190px] flex items-center gap-1.5 rounded-lg bg-[#09090D] border border-white/15 px-3 py-1.5">
              <span className="font-mono text-xs text-zinc-200 truncate flex-1">
                {overlayUrl}
              </span>
              <button
                type="button"
                onClick={handleCopyMain}
                aria-label="Copy Overlay Link"
                className="p-1.5 rounded bg-white/10 hover:bg-[#FFE600] text-[#FFE600] hover:text-black transition-colors shrink-0"
              >
                {copiedMain ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={overlayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#EF4444] text-white font-display font-black text-xs uppercase tracking-wide whitespace-nowrap shadow"
            >
              <Tv className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Open Overlay</span>
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>

            <button
              type="button"
              onClick={handleCopyGreen}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-500/40 text-emerald-200 text-xs font-bold whitespace-nowrap transition-colors"
            >
              {copiedGreen ? (
                <Check className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
              )}
              <span>Copy ?bg=green</span>
            </button>

            <a
              href={greenOverlayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-bold text-zinc-200 whitespace-nowrap transition-colors"
            >
              <span>Test Green Screen</span>
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>

            <button
              type="button"
              onClick={() => setShowLiveMonitor((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-zinc-100 whitespace-nowrap"
            >
              {showLiveMonitor ? (
                <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{showLiveMonitor ? 'Hide Preview' : 'Show Preview'}</span>
            </button>

            <button
              type="button"
              onClick={handleClearCanvas}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/15 text-xs font-bold text-[#FFE600] whitespace-nowrap"
            >
              <Eraser className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Clear Canvas</span>
            </button>
          </div>
        </div>

        {/* Clean 16:9 Live Preview Monitor (1920x1080 aspect ratio) */}
        {showLiveMonitor && (
          <div className="pt-3 border-t border-white/10 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                1920 × 1080 Overlay Output Preview
              </p>
              <div className="inline-flex items-center rounded-lg bg-[#09090D] border border-white/12 p-0.5 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setPreviewBg('transparent')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    previewBg === 'transparent'
                      ? 'bg-[#FFE600] text-[#09090D]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Transparent
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewBg('green')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    previewBg === 'green'
                      ? 'bg-emerald-500 text-[#09090D]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Chroma Green
                </button>
              </div>
            </div>

            <div
              className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/15"
              style={
                previewBg === 'green'
                  ? { backgroundColor: '#00B140' }
                  : {
                      backgroundImage:
                        'linear-gradient(45deg, #16161d 25%, transparent 25%), linear-gradient(-45deg, #16161d 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #16161d 75%), linear-gradient(-45deg, transparent 75%, #16161d 75%)',
                      backgroundSize: '20px 20px',
                      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                      backgroundColor: '#0c0c11',
                    }
              }
            >
              <BroadcastOverlayCanvas state={state} bgMode={previewBg} />
            </div>
          </div>
        )}
      </div>

      {/* Clean Slate Empty Overlay Controller Workspace */}
      <section className="rounded-2xl bg-[#111116] border border-white/12 overflow-hidden shadow-xl">
        <div className="h-1 w-full bg-gradient-to-r from-[#DC2626] via-[#FFE600] to-[#DC2626]" />
        <div className="px-6 py-14 sm:px-10 sm:py-20 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#09090D] border border-[#FFE600]/35 flex items-center justify-center">
            <Layers className="w-7 h-7 text-[#FFE600]" aria-hidden="true" />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#FFE600]">
              UID: {state.uid} · 1920 × 1080 CLEAN CANVAS
            </p>
            <h2 className="font-display text-xl sm:text-3xl font-black text-white tracking-tight">
              Overlay Controller is Empty
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              All previous scoreboards, lower-thirds, stat cards, tickers, and transition templates have been cleared. Your permanent vMix / OBS Studio link is ready and completely blank until you add new custom overlays.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
