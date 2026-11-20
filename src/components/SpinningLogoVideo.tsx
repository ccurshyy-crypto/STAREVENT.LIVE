import { useEffect, useRef, useState } from 'react';
import { STUDIO_CONTACT } from '../data/content';

interface SpinningLogoVideoProps {
  className?: string;
  resolution?: number;
  label?: string;
}

/**
 * Real-time chroma-keyed 3D spinning Star Event Live logo.
 * Plays the uploaded green-screen rotation MP4 video and keys out #00FF00 with
 * soft edge feathering and green-spill suppression so the coin floats cleanly
 * over transparent OBS/vMix overlays and dark UI surfaces.
 */
export function SpinningLogoVideo({
  className = 'w-20 h-20',
  resolution = 240,
  label = 'Star Event Live 3D rotating logo',
}: SpinningLogoVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let rafId = 0;
    let disposed = false;

    const renderFrame = () => {
      if (disposed) return;

      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        // Crop a tight square centered on the rotating coin (removes excess horizontal green margins)
        const srcSize = Math.min(video.videoWidth, video.videoHeight) * 0.88;
        const srcX = (video.videoWidth - srcSize) / 2;
        const srcY = (video.videoHeight - srcSize) / 2;

        ctx.clearRect(0, 0, resolution, resolution);
        ctx.drawImage(video, srcX, srcY, srcSize, srcSize, 0, 0, resolution, resolution);

        try {
          const frame = ctx.getImageData(0, 0, resolution, resolution);
          const data = frame.data;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const maxRB = r > b ? r : b;
            const greenDominance = g - maxRB;

            if (g > 90 && greenDominance > 52) {
              // Pure green screen background
              data[i + 3] = 0;
            } else if (g > 65 && greenDominance > 14) {
              // Soft anti-aliased alpha edge + green spill removal on gold metallic rim
              const alphaFactor = Math.max(0, Math.min(1, 1 - (greenDominance - 14) / 38));
              data[i + 3] = Math.round(data[i + 3] * alphaFactor);
              data[i + 1] = maxRB;
            }
          }

          ctx.putImageData(frame, 0, 0);
        } catch {
          // Canvas pixel read fallback if blocked
        }
      }

      if (!prefersReducedMotion) {
        rafId = window.requestAnimationFrame(renderFrame);
      }
    };

    const startPlayback = () => {
      if (prefersReducedMotion) {
        video.currentTime = 0;
        renderFrame();
        return;
      }

      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // Autoplay fallback: still draw current frame
          renderFrame();
        });
      }
      rafId = window.requestAnimationFrame(renderFrame);
    };

    if (video.readyState >= 2) {
      startPlayback();
    } else {
      video.addEventListener('loadeddata', startPlayback, { once: true });
    }

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      video.removeEventListener('loadeddata', startPlayback);
    };
  }, [resolution]);

  if (hasError) {
    return (
      <div
        role="img"
        aria-label={label}
        className={`${className} rounded-full bg-[#09090B] border-2 border-[#FACC15] flex flex-col items-center justify-center text-center p-1 select-none`}
      >
        <span className="font-display font-extrabold text-[9px] leading-tight text-white">
          STAR EVENT
        </span>
        <span className="font-display font-extrabold text-[9px] leading-tight text-[#EF4444]">
          LIVE
        </span>
      </div>
    );
  }

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <video
        ref={videoRef}
        src={STUDIO_CONTACT.logoVideoPath}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        crossOrigin="anonymous"
        onError={() => setHasError(true)}
        className="sr-only"
        aria-hidden="true"
      />
      <canvas
        ref={canvasRef}
        width={resolution}
        height={resolution}
        role="img"
        aria-label={label}
        className="w-full h-full object-contain pointer-events-none select-none"
      />
    </div>
  );
}
