import { useEffect, useRef, useState } from 'react';
import { STUDIO_CONTACT } from '../data/content';

interface SpinningLogoVideoProps {
  className?: string;
  resolution?: number;
  label?: string;
}

/**
 * Optimized chroma-keyed 3D spinning Star Event Live logo.
 * - Immediately renders a crisp Star Event golden star emblem so there is ZERO blank delay on load.
 * - Throttles canvas chroma-keying to ~20fps with a compact 144px buffer and pauses automatically
 *   when off-screen via IntersectionObserver so page load & reload stay blazing fast on mobile/tablet/desktop.
 */
export function SpinningLogoVideo({
  className = 'w-20 h-20',
  resolution = 144,
  label = 'Star Event Live 3D rotating logo',
}: SpinningLogoVideoProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasFrame, setHasFrame] = useState(false);
  const [hasError, setHasError] = useState(false);

  const safeRes = Math.min(160, Math.max(96, resolution));

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!video || !canvas || !container) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let rafId = 0;
    let disposed = false;
    let inView = true;
    let lastDrawTime = 0;
    const FRAME_INTERVAL_MS = 48; // ~20fps — smooth rotation with 70% less CPU usage

    const renderFrame = (now = performance.now()) => {
      if (disposed) return;

      if (inView && now - lastDrawTime >= FRAME_INTERVAL_MS) {
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          lastDrawTime = now;
          const srcSize = Math.min(video.videoWidth, video.videoHeight) * 0.88;
          const srcX = (video.videoWidth - srcSize) / 2;
          const srcY = (video.videoHeight - srcSize) / 2;

          ctx.clearRect(0, 0, safeRes, safeRes);
          ctx.drawImage(video, srcX, srcY, srcSize, srcSize, 0, 0, safeRes, safeRes);

          try {
            const frame = ctx.getImageData(0, 0, safeRes, safeRes);
            const data = frame.data;

            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const maxRB = r > b ? r : b;
              const greenDominance = g - maxRB;

              if (g > 90 && greenDominance > 52) {
                data[i + 3] = 0;
              } else if (g > 65 && greenDominance > 14) {
                const alphaFactor = Math.max(0, Math.min(1, 1 - (greenDominance - 14) / 38));
                data[i + 3] = Math.round(data[i + 3] * alphaFactor);
                data[i + 1] = maxRB;
              }
            }

            ctx.putImageData(frame, 0, 0);
            setHasFrame(true);
          } catch {
            // Fallback emblem stays visible
          }
        }
      }

      if (!prefersReducedMotion && inView) {
        rafId = window.requestAnimationFrame(renderFrame);
      }
    };

    const startPlayback = () => {
      if (prefersReducedMotion) {
        video.currentTime = 0;
        renderFrame(performance.now() + FRAME_INTERVAL_MS);
        return;
      }
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          renderFrame(performance.now() + FRAME_INTERVAL_MS);
        });
      }
      window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(renderFrame);
    };

    const handleError = () => setHasError(true);
    video.addEventListener('loadeddata', startPlayback);
    video.addEventListener('error', handleError);
    if (video.readyState >= 2) {
      startPlayback();
    }

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          const visibleNow = entries.some((entry) => entry.isIntersecting);
          inView = visibleNow;
          if (visibleNow && !prefersReducedMotion) {
            video.play().catch(() => {});
            window.cancelAnimationFrame(rafId);
            rafId = window.requestAnimationFrame(renderFrame);
          } else {
            window.cancelAnimationFrame(rafId);
            video.pause();
          }
        },
        { rootMargin: '80px' }
      );
      observer.observe(container);
    }

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      observer?.disconnect();
      video.removeEventListener('loadeddata', startPlayback);
      video.removeEventListener('error', handleError);
    };
  }, [safeRes]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
    >
      {/* Instant Golden Star Emblem (visible at 0ms while video initializes or on error) */}
      {(!hasFrame || hasError) && (
        <div
          aria-hidden={hasFrame && !hasError}
          className="w-full h-full rounded-full bg-gradient-to-br from-[#FACC15] via-[#DC2626] to-[#7F1D1D] p-[2.5px] shadow-[0_0_24px_rgba(250,204,21,0.45)] flex items-center justify-center"
        >
          <div className="w-full h-full rounded-full bg-[#13060A] flex flex-col items-center justify-center text-center">
            <span className="text-[#FACC15] leading-none text-[1.4em] drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]">
              ★
            </span>
            <span className="font-display font-black text-[0.42em] tracking-wider text-white leading-none mt-0.5">
              LIVE
            </span>
          </div>
        </div>
      )}

      {!hasError && (
        <>
          <video
            ref={videoRef}
            src={STUDIO_CONTACT.logoVideoPath}
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            className="sr-only"
          />
          <canvas
            ref={canvasRef}
            width={safeRes}
            height={safeRes}
            role="img"
            aria-label={label}
            className={`w-full h-full object-contain drop-shadow-[0_6px_18px_rgba(250,204,21,0.32)] ${
              hasFrame ? 'block' : 'hidden'
            }`}
          />
        </>
      )}
    </div>
  );
}
