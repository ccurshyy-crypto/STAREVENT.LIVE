import { useEffect } from 'react';
import { useCricketOverlayListener } from '../../hooks/useCricketSuiteStore';
import { BroadcastOverlayCanvas } from './BroadcastOverlayCanvas';

interface StandaloneOverlayPageProps {
  uid: string;
}

/**
 * Pure transparent 1920x1080 vMix / OBS Browser Source output route (`/overlay?uid=<user_id>`).
 * Zero buttons, zero scrollbars, transparent background, instant real-time updates.
 */
export function StandaloneOverlayPage({ uid }: StandaloneOverlayPageProps) {
  const { state } = useCricketOverlayListener(uid);

  useEffect(() => {
    const prevHtmlBg = document.documentElement.style.background;
    const prevBodyBg = document.body.style.background;
    const prevOverflow = document.body.style.overflow;

    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    document.body.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.background = prevHtmlBg;
      document.body.style.background = prevBodyBg;
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 w-screen h-screen overflow-hidden"
      style={{ background: 'transparent' }}
    >
      <BroadcastOverlayCanvas state={state} />
    </div>
  );
}
