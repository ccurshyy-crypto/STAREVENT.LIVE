import { useEffect, useRef } from 'react';

interface SparkParticle {
  x: number;
  y: number;
  radius: number;
  vy: number;
  vx: number;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  hue: 'gold' | 'crimson' | 'white';
  depth: number;
}

/**
 * Full-viewport broadcast stage animated background for the Star Event Live home page.
 * Combines sweeping stadium/stage spotlights (crimson & gold), flowing live signal wave ribbons,
 * subtle studio grid lines, and rising golden bokeh embers with gentle pointer parallax.
 */
export function HomeAnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = reducedMotionQuery.matches;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.75);

    const pointer = { x: 0.5, y: 0.35, targetX: 0.5, targetY: 0.35 };
    let particles: SparkParticle[] = [];

    const createParticles = (w: number, h: number): SparkParticle[] => {
      const count = w < 640 ? 34 : 58;
      const list: SparkParticle[] = [];
      for (let i = 0; i < count; i++) {
        const roll = Math.random();
        const hue: SparkParticle['hue'] =
          roll < 0.58 ? 'gold' : roll < 0.86 ? 'crimson' : 'white';
        const depth = 0.4 + Math.random() * 0.9;
        list.push({
          x: Math.random() * w,
          y: Math.random() * h,
          radius: (0.9 + Math.random() * 2.2) * depth,
          vy: -(0.16 + Math.random() * 0.42) * depth,
          vx: (Math.random() - 0.5) * 0.22 * depth,
          alpha: 0.22 + Math.random() * 0.55,
          twinkleSpeed: 0.008 + Math.random() * 0.018,
          twinklePhase: Math.random() * Math.PI * 2,
          hue,
          depth,
        });
      }
      return list;
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = createParticles(width, height);
    };

    resize();

    const handlePointerMove = (e: PointerEvent) => {
      pointer.targetX = e.clientX / Math.max(1, width);
      pointer.targetY = e.clientY / Math.max(1, height);
    };

    const handleMotionChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion = e.matches;
    };

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    reducedMotionQuery.addEventListener('change', handleMotionChange);

    let rafId = 0;
    let isHidden = document.hidden;
    const startTime = performance.now();

    const drawStageBeam = (
      originX: number,
      originY: number,
      angleRad: number,
      length: number,
      spreadRad: number,
      innerColor: string,
      outerColor: string
    ) => {
      ctx.save();
      ctx.translate(originX, originY);
      ctx.rotate(angleRad);

      const grad = ctx.createLinearGradient(0, 0, 0, length);
      grad.addColorStop(0, innerColor);
      grad.addColorStop(0.55, outerColor);
      grad.addColorStop(1, 'rgba(9, 9, 11, 0)');

      const halfWidth = Math.tan(spreadRad) * length;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-halfWidth, length);
      ctx.lineTo(halfWidth, length);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    };

    const drawSignalRibbon = (
      t: number,
      baseYRatio: number,
      amplitude: number,
      freq: number,
      speed: number,
      strokeColor: string,
      lineWidth: number
    ) => {
      ctx.save();
      ctx.beginPath();
      const baseY = height * baseYRatio;
      const step = Math.max(16, Math.floor(width / 72));
      for (let x = 0; x <= width + step; x += step) {
        const normX = x / Math.max(1, width);
        const envelope = Math.sin(normX * Math.PI);
        const y =
          baseY +
          Math.sin(normX * freq + t * speed) * amplitude * envelope +
          Math.cos(normX * (freq * 1.7) - t * (speed * 0.75)) * (amplitude * 0.35) * envelope;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
      ctx.restore();
    };

    const renderFrame = (now: number) => {
      const t = (now - startTime) * 0.001;

      // Smooth pointer parallax easing
      pointer.x += (pointer.targetX - pointer.x) * 0.035;
      pointer.y += (pointer.targetY - pointer.y) * 0.035;
      const px = (pointer.x - 0.5) * 44;
      const py = (pointer.y - 0.5) * 28;

      // 1. Deep Obsidian Studio Base
      ctx.fillStyle = '#09090B';
      ctx.fillRect(0, 0, width, height);

      // 2. Ambient Drifting Crimson & Gold Broadcast Glow Orbs
      ctx.globalCompositeOperation = 'screen';

      const orb1X = width * (0.18 + Math.sin(t * 0.22) * 0.07) + px * 0.6;
      const orb1Y = height * (0.16 + Math.cos(t * 0.18) * 0.06) + py * 0.5;
      const orb1Radius = Math.max(width, height) * 0.52;
      const grad1 = ctx.createRadialGradient(orb1X, orb1Y, 0, orb1X, orb1Y, orb1Radius);
      grad1.addColorStop(0, 'rgba(220, 38, 38, 0.22)');
      grad1.addColorStop(0.45, 'rgba(153, 27, 27, 0.09)');
      grad1.addColorStop(1, 'rgba(9, 9, 11, 0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const orb2X = width * (0.82 + Math.cos(t * 0.19) * 0.08) - px * 0.5;
      const orb2Y = height * (0.24 + Math.sin(t * 0.25) * 0.07) + py * 0.4;
      const orb2Radius = Math.max(width, height) * 0.46;
      const grad2 = ctx.createRadialGradient(orb2X, orb2Y, 0, orb2X, orb2Y, orb2Radius);
      grad2.addColorStop(0, 'rgba(250, 204, 21, 0.16)');
      grad2.addColorStop(0.42, 'rgba(180, 83, 9, 0.07)');
      grad2.addColorStop(1, 'rgba(9, 9, 11, 0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      const orb3X = width * (0.5 + Math.sin(t * 0.14 + 1.2) * 0.14) + px * 0.35;
      const orb3Y = height * (0.86 + Math.cos(t * 0.16) * 0.05) - py * 0.3;
      const orb3Radius = Math.max(width, height) * 0.48;
      const grad3 = ctx.createRadialGradient(orb3X, orb3Y, 0, orb3X, orb3Y, orb3Radius);
      grad3.addColorStop(0, 'rgba(220, 38, 38, 0.14)');
      grad3.addColorStop(0.45, 'rgba(250, 204, 21, 0.05)');
      grad3.addColorStop(1, 'rgba(9, 9, 11, 0)');
      ctx.fillStyle = grad3;
      ctx.fillRect(0, 0, width, height);

      // 3. Sweeping Stadium / Event Stage Spotlights from top corners
      const beamLength = Math.hypot(width, height) * 0.92;
      drawStageBeam(
        width * 0.08 + px * 0.25,
        -60,
        -0.38 + Math.sin(t * 0.32) * 0.18,
        beamLength,
        0.16,
        'rgba(220, 38, 38, 0.15)',
        'rgba(220, 38, 38, 0.04)'
      );
      drawStageBeam(
        width * 0.92 - px * 0.25,
        -60,
        0.38 + Math.cos(t * 0.27) * 0.18,
        beamLength,
        0.15,
        'rgba(250, 204, 21, 0.12)',
        'rgba(250, 204, 21, 0.035)'
      );
      drawStageBeam(
        width * 0.52 + px * 0.18,
        -80,
        Math.sin(t * 0.21 + 2.1) * 0.26,
        beamLength * 0.85,
        0.13,
        'rgba(255, 255, 255, 0.055)',
        'rgba(250, 204, 21, 0.015)'
      );

      // 4. Subtle Broadcast Studio Grid Lines
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.024)';
      ctx.lineWidth = 1;
      const gridSize = 84;
      const offsetX = ((px * 0.2) % gridSize + gridSize) % gridSize;
      const offsetY = ((py * 0.2) % gridSize + gridSize) % gridSize;
      ctx.beginPath();
      for (let x = offsetX; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = offsetY; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // 5. Flowing Live Broadcast Signal Wave Ribbons
      ctx.globalCompositeOperation = 'screen';
      drawSignalRibbon(t, 0.32, 34, 6.2, 0.65, 'rgba(250, 204, 21, 0.12)', 1.35);
      drawSignalRibbon(t + 1.4, 0.36, 26, 7.6, -0.52, 'rgba(239, 68, 68, 0.15)', 1.2);
      drawSignalRibbon(t + 3.1, 0.72, 28, 5.4, 0.44, 'rgba(250, 204, 21, 0.08)', 1.1);

      // 6. Floating Golden & Crimson Stage Sparks / Bokeh Motes
      for (const p of particles) {
        if (!prefersReducedMotion) {
          p.y += p.vy;
          p.x += p.vx + Math.sin(t * 0.8 + p.twinklePhase) * 0.12;
          p.twinklePhase += p.twinkleSpeed;

          if (p.y < -16) {
            p.y = height + 16;
            p.x = Math.random() * width;
          }
          if (p.x < -16) p.x = width + 16;
          if (p.x > width + 16) p.x = -16;
        }

        const twinkle = 0.55 + 0.45 * Math.sin(p.twinklePhase);
        const drawX = p.x + px * (0.28 * p.depth);
        const drawY = p.y + py * (0.22 * p.depth);
        const a = p.alpha * twinkle;

        const color =
          p.hue === 'gold'
            ? `rgba(250, 204, 21, ${a.toFixed(3)})`
            : p.hue === 'crimson'
              ? `rgba(239, 68, 68, ${(a * 0.9).toFixed(3)})`
              : `rgba(255, 255, 255, ${(a * 0.65).toFixed(3)})`;

        // Soft outer halo
        const halo = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, p.radius * 4.2);
        halo.addColorStop(0, color);
        halo.addColorStop(1, 'rgba(9, 9, 11, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(drawX, drawY, p.radius * 4.2, 0, Math.PI * 2);
        ctx.fill();

        // Crisp bright core
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(drawX, drawY, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 7. Gentle top/bottom vignette to guarantee crystal-clear typography contrast
      ctx.globalCompositeOperation = 'source-over';
      const vignette = ctx.createRadialGradient(
        width * 0.5,
        height * 0.45,
        Math.min(width, height) * 0.25,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.85
      );
      vignette.addColorStop(0, 'rgba(9, 9, 11, 0)');
      vignette.addColorStop(1, 'rgba(5, 5, 7, 0.58)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      if (!prefersReducedMotion && !isHidden) {
        rafId = window.requestAnimationFrame(renderFrame);
      }
    };

    const handleVisibilityChange = () => {
      isHidden = document.hidden;
      if (!isHidden && !prefersReducedMotion) {
        window.cancelAnimationFrame(rafId);
        rafId = window.requestAnimationFrame(renderFrame);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    rafId = window.requestAnimationFrame(renderFrame);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      reducedMotionQuery.removeEventListener('change', handleMotionChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
