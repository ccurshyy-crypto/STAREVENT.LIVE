import { CricketSuiteState } from '../../types/cricketSuite';

interface BroadcastOverlayCanvasProps {
  state: CricketSuiteState | null;
  bgMode?: 'transparent' | 'green';
}

/**
 * Clean 1920x1080 broadcast overlay canvas.
 * Starts 100% empty and transparent (or chroma-key green when `bgMode === 'green'`),
 * with zero pre-loaded scoreboards, lower-thirds, stat cards, tickers, or transition banners.
 */
export function BroadcastOverlayCanvas({
  state,
  bgMode = 'transparent',
}: BroadcastOverlayCanvasProps) {
  // Keep reference to synced state so custom overlays added later can read live data
  void state;

  const canvasBg = bgMode === 'green' ? '#00B140' : 'transparent';

  return (
    <div
      aria-label="Broadcast Overlay Canvas"
      className="relative w-full h-full overflow-hidden select-none pointer-events-none"
      style={{ background: canvasBg }}
    />
  );
}
