import { useEffect, useMemo } from 'react';
import { useCricketOverlayListener } from '../../hooks/useCricketSuiteStore';
import { BroadcastOverlayCanvas } from './BroadcastOverlayCanvas';

interface StandaloneOverlayPageProps {
  uid: string;
  matchId?: string;
}

/**
 * Public 1920x1080 vMix / OBS Studio Browser Source output route
 * (`/overlay?uid=<user_id>&match=<match_id>`).
 * Works WITHOUT login so broadcast software can load the feed directly.
 * Supports `?bg=green` for chroma-key testing.
 */
export function StandaloneOverlayPage({
  uid,
  matchId,
}: StandaloneOverlayPageProps) {
  const { state } = useCricketOverlayListener(uid);

  const { bgMode, resolvedMatchId } = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        bgMode: 'transparent' as const,
        resolvedMatchId: matchId || undefined,
      };
    }
    const params = new URLSearchParams(window.location.search);
    return {
      bgMode:
        params.get('bg')?.toLowerCase() === 'green'
          ? ('green' as const)
          : ('transparent' as const),
      resolvedMatchId: matchId || params.get('match') || undefined,
    };
  }, [matchId]);

  useEffect(() => {
    const prevHtmlBg = document.documentElement.style.background;
    const prevBodyBg = document.body.style.background;
    const prevOverflow = document.body.style.overflow;
    const targetBg = bgMode === 'green' ? '#00B140' : 'transparent';

    document.documentElement.style.background = targetBg;
    document.body.style.background = targetBg;
    document.body.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.background = prevHtmlBg;
      document.body.style.background = prevBodyBg;
      document.body.style.overflow = prevOverflow;
    };
  }, [bgMode]);

  return (
    <div
      className="fixed inset-0 w-screen h-screen overflow-hidden"
      style={{ background: bgMode === 'green' ? '#00B140' : 'transparent' }}
    >
      <div className="w-full h-full flex items-center justify-center">
        <div
          className="relative w-full h-full max-w-[1920px] max-h-[1080px] aspect-video overflow-hidden"
          style={{ background: bgMode === 'green' ? '#00B140' : 'transparent' }}
        >
          <BroadcastOverlayCanvas
            state={state}
            matchId={resolvedMatchId}
            bgMode={bgMode}
          />
        </div>
      </div>
    </div>
  );
}
