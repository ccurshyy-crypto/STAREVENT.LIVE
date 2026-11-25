import { useEffect, useMemo, useState } from 'react';
import { useCricketOverlayListener } from '../../hooks/useCricketSuiteStore';
import { BroadcastOverlayCanvas } from './BroadcastOverlayCanvas';

interface StandaloneOverlayPageProps {
  uid: string;
  matchId?: string;
}

const CANONICAL_STAGE_W = 1280;
const CANONICAL_STAGE_H = 720;

/**
 * Public OBS Studio Browser Source & vMix Web Browser Input output route
 * (`/overlay?id=<access_id>`, also supports `?uid=<access_id>&source=obs`).
 * Works WITHOUT login so broadcast software can load the feed directly.
 * Supports true alpha transparency, `?bg=green` chroma-key mode,
 * 1920x1080, 1280x720, and any custom Browser Source width/height.
 */
export function StandaloneOverlayPage({
  uid,
  matchId,
}: StandaloneOverlayPageProps) {
  const { state } = useCricketOverlayListener(uid);

  const { bgMode, resolvedMatchId, requestedWidth, requestedHeight } = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        bgMode: 'transparent' as const,
        resolvedMatchId: matchId || undefined,
        requestedWidth: null as number | null,
        requestedHeight: null as number | null,
      };
    }
    const params = new URLSearchParams(window.location.search);
    const wParam = Number(params.get('w'));
    const hParam = Number(params.get('h'));
    return {
      bgMode:
        params.get('bg')?.toLowerCase() === 'green'
          ? ('green' as const)
          : ('transparent' as const),
      resolvedMatchId: matchId || params.get('match') || undefined,
      requestedWidth: Number.isFinite(wParam) && wParam >= 320 ? wParam : null,
      requestedHeight: Number.isFinite(hParam) && hParam >= 180 ? hParam : null,
    };
  }, [matchId]);

  const [viewport, setViewport] = useState<{ w: number; h: number }>(() => {
    if (typeof window === 'undefined') {
      return { w: requestedWidth ?? 1920, h: requestedHeight ?? 1080 };
    }
    return {
      w: window.innerWidth || requestedWidth || 1920,
      h: window.innerHeight || requestedHeight || 1080,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        w: window.innerWidth || requestedWidth || 1920,
        h: window.innerHeight || requestedHeight || 1080,
      });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [requestedWidth, requestedHeight]);

  useEffect(() => {
    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    const rootEl = document.getElementById('root');

    const prevHtmlBg = htmlEl.style.background;
    const prevBodyBg = bodyEl.style.background;
    const prevRootBg = rootEl?.style.background ?? '';
    const prevOverflow = bodyEl.style.overflow;

    const modeClass =
      bgMode === 'green' ? 'overlay-chroma-green' : 'overlay-transparent';
    const targetBg = bgMode === 'green' ? '#00B140' : 'transparent';

    htmlEl.classList.add(modeClass);
    bodyEl.classList.add(modeClass);
    htmlEl.style.background = targetBg;
    bodyEl.style.background = targetBg;
    bodyEl.style.overflow = 'hidden';
    if (rootEl) rootEl.style.background = targetBg;

    return () => {
      htmlEl.classList.remove('overlay-transparent', 'overlay-chroma-green');
      bodyEl.classList.remove('overlay-transparent', 'overlay-chroma-green');
      htmlEl.style.background = prevHtmlBg;
      bodyEl.style.background = prevBodyBg;
      bodyEl.style.overflow = prevOverflow;
      if (rootEl) rootEl.style.background = prevRootBg;
    };
  }, [bgMode]);

  // Scale canonical 1280x720 broadcast canvas proportionally to fit 1920x1080,
  // 1280x720, or any custom OBS Browser Source / vMix input resolution cleanly.
  const scale = useMemo(() => {
    const targetW = viewport.w > 0 ? viewport.w : requestedWidth ?? 1920;
    const targetH = viewport.h > 0 ? viewport.h : requestedHeight ?? 1080;
    return Math.min(targetW / CANONICAL_STAGE_W, targetH / CANONICAL_STAGE_H);
  }, [viewport.w, viewport.h, requestedWidth, requestedHeight]);

  return (
    <div
      className="fixed inset-0 w-screen h-screen overflow-hidden flex items-center justify-center"
      style={{ background: bgMode === 'green' ? '#00B140' : 'transparent' }}
    >
      <div
        className="relative overflow-hidden shrink-0"
        style={{
          width: `${CANONICAL_STAGE_W}px`,
          height: `${CANONICAL_STAGE_H}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          background: bgMode === 'green' ? '#00B140' : 'transparent',
        }}
      >
        <BroadcastOverlayCanvas
          state={state}
          matchId={resolvedMatchId}
          bgMode={bgMode}
        />
      </div>
    </div>
  );
}
