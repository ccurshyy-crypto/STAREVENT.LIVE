import { useEffect, useMemo, useState } from 'react';
import { useKabaddiStore } from '../../hooks/useKabaddiStore';
import { KabaddiOverlayCanvas } from './KabaddiOverlayCanvas';

interface StandaloneKabaddiOverlayPageProps {
  uid: string;
}

const CANONICAL_W = 1280;
const CANONICAL_H = 720;

/**
 * Public OBS Studio Browser Source & vMix Web Browser Input output route
 * (`/kabaddi-overlay?id=<uid>`, also supports `?bg=green` chroma key).
 * Works WITHOUT login so broadcast software can load the live Kabaddi feed directly.
 */
export function StandaloneKabaddiOverlayPage({
  uid,
}: StandaloneKabaddiOverlayPageProps) {
  const { state } = useKabaddiStore(uid, true);

  const bgMode = useMemo(() => {
    if (typeof window === 'undefined') return 'transparent' as const;
    const params = new URLSearchParams(window.location.search);
    return params.get('bg')?.toLowerCase() === 'green'
      ? ('green' as const)
      : ('transparent' as const);
  }, []);

  const [viewport, setViewport] = useState<{ w: number; h: number }>(() => {
    if (typeof window === 'undefined') return { w: 1920, h: 1080 };
    return { w: window.innerWidth || 1920, h: window.innerHeight || 1080 };
  });

  useEffect(() => {
    const onResize = () => {
      setViewport({ w: window.innerWidth || 1920, h: window.innerHeight || 1080 });
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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

  const scale = useMemo(
    () => Math.min((viewport.w || 1920) / CANONICAL_W, (viewport.h || 1080) / CANONICAL_H),
    [viewport.w, viewport.h]
  );

  return (
    <div
      className="fixed inset-0 w-screen h-screen overflow-hidden flex items-center justify-center"
      style={{ background: bgMode === 'green' ? '#00B140' : 'transparent' }}
    >
      <div
        className="relative overflow-hidden shrink-0"
        style={{
          width: `${CANONICAL_W}px`,
          height: `${CANONICAL_H}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          background: bgMode === 'green' ? '#00B140' : 'transparent',
        }}
      >
        <KabaddiOverlayCanvas state={state} bgMode={bgMode} />
      </div>
    </div>
  );
}
