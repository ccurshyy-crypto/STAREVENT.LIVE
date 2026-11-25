import { useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, MonitorPlay, Tv } from 'lucide-react';

type OverlayResolution = 'auto' | '1920x1080' | '1280x720';
type OverlayTarget = 'obs' | 'vmix';

interface ObsVmixLinkPanelProps {
  baseOverlayUrl: string;
  onCopyUrl: (url: string, label: string) => void;
  compact?: boolean;
}

function buildPlatformUrl(
  baseUrl: string,
  target: OverlayTarget,
  resolution: OverlayResolution
): string {
  try {
    const isAbsolute = /^https?:\/\//i.test(baseUrl);
    const parsed = new URL(
      baseUrl,
      isAbsolute
        ? undefined
        : typeof window !== 'undefined'
          ? window.location.origin
          : 'http://localhost:3000'
    );
    parsed.searchParams.set('source', target);
    if (resolution === '1920x1080') {
      parsed.searchParams.set('w', '1920');
      parsed.searchParams.set('h', '1080');
    } else if (resolution === '1280x720') {
      parsed.searchParams.set('w', '1280');
      parsed.searchParams.set('h', '720');
    } else {
      parsed.searchParams.delete('w');
      parsed.searchParams.delete('h');
    }
    return isAbsolute ? parsed.toString() : `${parsed.pathname}${parsed.search}`;
  } catch {
    const sep = baseUrl.includes('?') ? '&' : '?';
    const resQuery =
      resolution === '1920x1080'
        ? '&w=1920&h=1080'
        : resolution === '1280x720'
          ? '&w=1280&h=720'
          : '';
    return `${baseUrl}${sep}source=${target}${resQuery}`;
  }
}

export function ObsVmixLinkPanel({
  baseOverlayUrl,
  onCopyUrl,
  compact = false,
}: ObsVmixLinkPanelProps) {
  const [selectedTarget, setSelectedTarget] = useState<OverlayTarget>('obs');
  const [resolution, setResolution] = useState<OverlayResolution>('auto');
  const [copiedTarget, setCopiedTarget] = useState<OverlayTarget | null>(null);

  const obsUrl = useMemo(
    () => buildPlatformUrl(baseOverlayUrl, 'obs', resolution),
    [baseOverlayUrl, resolution]
  );

  const vmixUrl = useMemo(
    () => buildPlatformUrl(baseOverlayUrl, 'vmix', resolution),
    [baseOverlayUrl, resolution]
  );

  const previewUrl = selectedTarget === 'obs' ? obsUrl : vmixUrl;

  const handleCopy = (target: OverlayTarget) => {
    const url = target === 'obs' ? obsUrl : vmixUrl;
    const label = target === 'obs' ? 'OBS Overlay Link' : 'vMix Overlay Link';
    setSelectedTarget(target);
    onCopyUrl(url, label);
    setCopiedTarget(target);
    window.setTimeout(() => {
      setCopiedTarget((prev) => (prev === target ? null : prev));
    }, 1800);
  };

  return (
    <div
      className={
        compact
          ? 'rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2.5'
          : 'space-y-3'
      }
    >
      {/* Top Bar: Label, Resolution Presets, and Open Preview */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs sm:text-sm font-bold text-[#E87500]">
            OBS / vMix Overlay Link
          </span>
          <div
            role="group"
            aria-label="Overlay resolution preset"
            className="inline-flex items-center rounded-lg bg-white border border-slate-200 p-0.5 text-[11px] font-semibold"
          >
            {(
              [
                { id: 'auto', label: 'Auto' },
                { id: '1920x1080', label: '1920×1080' },
                { id: '1280x720', label: '1280×720' },
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setResolution(preset.id)}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  resolution === preset.id
                    ? 'bg-[#FF8C00] text-white'
                    : 'text-slate-600 hover:text-[#FF8C00]'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#FF8C00] hover:bg-[#E87500] text-white text-xs font-bold transition-colors whitespace-nowrap shadow-xs"
        >
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Open Preview</span>
        </a>
      </div>

      {/* Two Separate Links: OBS Link & vMix Link with Dedicated Copy Buttons */}
      <div className="grid grid-cols-1 gap-2">
        {/* OBS Link Row */}
        <div
          className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 rounded-lg border transition-colors ${
            selectedTarget === 'obs'
              ? 'bg-[#FFF3E0]/70 border-[#FF8C00]/50'
              : 'bg-white border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={() => setSelectedTarget('obs')}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold shrink-0 transition-colors sm:min-w-[116px] ${
              selectedTarget === 'obs'
                ? 'bg-[#FF8C00] text-white shadow-xs'
                : 'bg-[#FFF3E0] hover:bg-orange-100 text-[#E87500] border border-[#FF8C00]/30'
            }`}
          >
            <MonitorPlay className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>OBS Link</span>
          </button>

          <input
            type="text"
            readOnly
            value={obsUrl}
            onFocus={(e) => {
              setSelectedTarget('obs');
              e.currentTarget.select();
            }}
            aria-label="OBS Studio Browser Source Overlay Link"
            className="flex-1 min-w-0 bg-white px-3 py-1.5 rounded-md border border-slate-300 focus:border-[#FF8C00] focus:outline-none text-xs font-mono text-slate-700"
          />

          <button
            type="button"
            onClick={() => handleCopy('obs')}
            aria-label="Copy OBS Overlay Link"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#FF8C00] hover:bg-[#E87500] text-white text-xs font-bold transition-colors shrink-0"
          >
            {copiedTarget === 'obs' ? (
              <>
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* vMix Link Row */}
        <div
          className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 rounded-lg border transition-colors ${
            selectedTarget === 'vmix'
              ? 'bg-[#FFF3E0]/70 border-[#FF8C00]/50'
              : 'bg-white border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={() => setSelectedTarget('vmix')}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold shrink-0 transition-colors sm:min-w-[116px] ${
              selectedTarget === 'vmix'
                ? 'bg-[#FF8C00] text-white shadow-xs'
                : 'bg-[#FFF3E0] hover:bg-orange-100 text-[#E87500] border border-[#FF8C00]/30'
            }`}
          >
            <Tv className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>vMix Link</span>
          </button>

          <input
            type="text"
            readOnly
            value={vmixUrl}
            onFocus={(e) => {
              setSelectedTarget('vmix');
              e.currentTarget.select();
            }}
            aria-label="vMix Web Browser Input Overlay Link"
            className="flex-1 min-w-0 bg-white px-3 py-1.5 rounded-md border border-slate-300 focus:border-[#FF8C00] focus:outline-none text-xs font-mono text-slate-700"
          />

          <button
            type="button"
            onClick={() => handleCopy('vmix')}
            aria-label="Copy vMix Overlay Link"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#FF8C00] hover:bg-[#E87500] text-white text-xs font-bold transition-colors shrink-0"
          >
            {copiedTarget === 'vmix' ? (
              <>
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      <p className="text-[11px] text-slate-500">
        Transparent public output · Supports 1920×1080, 1280×720, and custom OBS / vMix sizes with automatic real-time sync.
      </p>
    </div>
  );
}
