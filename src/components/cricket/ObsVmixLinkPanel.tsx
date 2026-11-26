import { useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, Tv } from 'lucide-react';

type OverlayResolution = 'auto' | '1920x1080' | '1280x720';

interface ObsVmixLinkPanelProps {
  baseOverlayUrl: string;
  onCopyUrl: (url: string, label: string) => void;
  compact?: boolean;
  homeTheme?: boolean;
}

function buildUnifiedOverlayUrl(
  baseUrl: string,
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
    parsed.searchParams.delete('source');
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
        ? `${sep}w=1920&h=1080`
        : resolution === '1280x720'
          ? `${sep}w=1280&h=720`
          : '';
    return `${baseUrl}${resQuery}`;
  }
}

export function ObsVmixLinkPanel({
  baseOverlayUrl,
  onCopyUrl,
  compact = false,
  homeTheme = false,
}: ObsVmixLinkPanelProps) {
  const [resolution, setResolution] = useState<OverlayResolution>('auto');
  const [copied, setCopied] = useState(false);

  const unifiedUrl = useMemo(
    () => buildUnifiedOverlayUrl(baseOverlayUrl, resolution),
    [baseOverlayUrl, resolution]
  );

  const handleCopy = () => {
    onCopyUrl(unifiedUrl, 'OBS & vMix Overlay Link');
    setCopied(true);
    window.setTimeout(() => {
      setCopied(false);
    }, 1800);
  };

  return (
    <div
      className={
        compact || homeTheme
          ? 'rounded-xl bg-[#FFF8F0] border border-[#FF8C00]/30 p-3 space-y-2.5'
          : 'space-y-3'
      }
    >
      {/* Top Bar: Unified Label, Resolution Presets, and Open Preview */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs sm:text-sm font-bold text-[#E87500]">
            OBS &amp; vMix Overlay Link
          </span>
          <div
            role="group"
            aria-label="Overlay resolution preset"
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] font-semibold"
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
                    ? 'wo-btn-active text-white'
                    : 'text-slate-600 hover:text-[#E87500]'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <a
          href={unifiedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg wo-btn-primary text-xs font-bold transition-colors whitespace-nowrap"
        >
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Open Preview</span>
        </a>
      </div>

      {/* Single Unified Link for both OBS Studio & vMix */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 rounded-lg border bg-[#FFF3E0]/75 border-[#FF8C00]/55">
        <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold shrink-0 wo-btn-active text-white sm:min-w-[126px]">
          <Tv className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>OBS / vMix</span>
        </div>

        <input
          type="text"
          readOnly
          value={unifiedUrl}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Unified OBS Studio and vMix Overlay Link"
          className="flex-1 min-w-0 px-3 py-1.5 rounded-md border bg-white border-slate-300 focus:border-[#FF8C00] focus:outline-none text-xs font-mono text-slate-800"
        />

        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy OBS and vMix Overlay Link"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition-colors shrink-0 wo-btn-primary"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Copy Link</span>
            </>
          )}
        </button>
      </div>

      <p className="text-[11px] text-slate-500">
        Single universal link for both OBS Studio &amp; vMix · Transparent real-time sync for 1920×1080, 1280×720, and custom sizes.
      </p>
    </div>
  );
}
