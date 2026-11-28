import { useMemo, useState } from 'react';
import { Check, Copy, Tv } from 'lucide-react';

interface ObsVmixLinkPanelProps {
  baseOverlayUrl: string;
  onCopyUrl: (url: string, label: string) => void;
  compact?: boolean;
  homeTheme?: boolean;
}

function buildUnifiedOverlayUrl(baseUrl: string): string {
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
    parsed.searchParams.delete('w');
    parsed.searchParams.delete('h');
    return isAbsolute ? parsed.toString() : `${parsed.pathname}${parsed.search}`;
  } catch {
    return baseUrl;
  }
}

export function ObsVmixLinkPanel({
  baseOverlayUrl,
  onCopyUrl,
  compact = false,
  homeTheme = false,
}: ObsVmixLinkPanelProps) {
  const [copied, setCopied] = useState(false);

  const unifiedUrl = useMemo(
    () => buildUnifiedOverlayUrl(baseOverlayUrl),
    [baseOverlayUrl]
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
          ? 'rounded-xl bg-[#FFF8F0] border border-[#FF8C00]/30 p-3 space-y-2'
          : 'space-y-2'
      }
    >
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
