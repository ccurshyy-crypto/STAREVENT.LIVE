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
  role: 'primary' | 'accent' | 'white';
  depth: number;
}

type RGB = [number, number, number];

interface StagePalette {
  baseTop: RGB;
  baseBottom: RGB;
  primary: RGB;
  secondary: RGB;
  accent: RGB;
}

/**
 * 5 cinematic broadcast stage palettes that continuously cross-fade across all pages
 * (Home, Overlays, Packages) while keeping dark contrast deep enough for crystal-clear text.
 */
const STAGE_PALETTES: StagePalette[] = [
  // 1. Royal Broadcast Crimson & Stadium Gold
  {
    baseTop: [18, 7, 13],
    baseBottom: [8, 8, 13],
    primary: [225, 38, 62],
    secondary: [250, 190, 28],
    accent: [249, 115, 22],
  },
  // 2. Midnight Stadium Sapphire & Electric Cyan
  {
    baseTop: [7, 15, 30],
    baseBottom: [6, 9, 18],
    primary: [37, 99, 235],
    secondary: [14, 165, 233],
    accent: [56, 189, 248],
  },
  // 3. Emerald Arena & Broadcast Gold
  {
    baseTop: [6, 22, 18],
    baseBottom: [7, 11, 13],
    primary: [16, 185, 129],
    secondary: [250, 204, 21],
    accent: [52, 211, 153],
  },
  // 4. Concert Stage Violet & Rose Glow
  {
    baseTop: [20, 9, 32],
    baseBottom: [9, 8, 17],
    primary: [147, 51, 234],
    secondary: [236, 72, 153],
    accent: [192, 132, 252],
  },
  // 5. Festive Haldi Marigold & Royal Maroon
  {
    baseTop: [24, 11, 8],
    baseBottom: [11, 8, 10],
    primary: [245, 158, 11],
    secondary: [220, 38, 38],
    accent: [253, 224, 71],
  },
];

function lerpChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return [
    lerpChannel(a[0], b[0], t),
    lerpChannel(a[1], b[1], t),
    lerpChannel(a[2], b[2], t),
  ];
}

function rgba(rgb: RGB, alpha: number): string {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha.toFixed(3)})`;
}

/**
 * Full-viewport continuously color-shifting broadcast stage background rendered across
 * Home, Overlays, and Packages pages. Smoothly transitions palettes every 7 seconds
 * with sweeping stage beams, aurora glow waves, signal ribbons, and bokeh embers.
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
      const count = w < 640 ? 34 : 60;
      const list: SparkParticle[] = [];
      for (let i = 0; i < count; i++) {
        const roll = Math.random();
        const role: SparkParticle['role'] =
          roll < 0.45 ? 'primary' : roll < 0.82 ? 'accent' : 'white';
        const depth = 0.4 + Math.random() * 0.9;
        list.push({
          x: Math.random() * w,
          y: Math.random() * h,
          radius: (0.9 + Math.random() * 2.2) * depth,
          vy: -(0.18 + Math.random() * 0.44) * depth,
          vx: (Math.random() - 0.5) * 0.24 * depth,
          alpha: 0.24 + Math.random() * 0.54,
          twinkleSpeed: 0.008 + Math.random() * 0.018,
          twinklePhase: Math.random() * Math.PI * 2,
          role,
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

      // Smoothly transition across all 5 palettes (~6.5s per scene)
      const cyclePos = (t / 6.5) % STAGE_PALETTES.length;
      const idxA = Math.floor(cyclePos);
      const idxB = (idxA + 1) % STAGE_PALETTES.length;
      const rawFrac = cyclePos - idxA;
      // Smooth cosine easing so palette transitions feel silky and continuous
      const blend = 0.5 - 0.5 * Math.cos(rawFrac * Math.PI);

      const palA = STAGE_PALETTES[idxA];
      const palB = STAGE_PALETTES[idxB];
      const baseTop = lerpRgb(palA.baseTop, palB.baseTop, blend);
      const baseBottom = lerpRgb(palA.baseBottom, palB.baseBottom, blend);
      const primary = lerpRgb(palA.primary, palB.primary, blend);
      const secondary = lerpRgb(palA.secondary, palB.secondary, blend);
      const accent = lerpRgb(palA.accent, palB.accent, blend);

      // Smooth pointer parallax easing
      pointer.x += (pointer.targetX - pointer.x) * 0.035;
      pointer.y += (pointer.targetY - pointer.y) * 0.035;
      const px = (pointer.x - 0.5) * 44;
      const py = (pointer.y - 0.5) * 28;

      // 1. Dynamic Color-Shifting Deep Broadcast Stage Base
      ctx.globalCompositeOperation = 'source-over';
      const baseGrad = ctx.createLinearGradient(0, 0, width * 0.35, height);
      baseGrad.addColorStop(0, rgba(baseTop, 1));
      baseGrad.addColorStop(0.55, rgba(lerpRgb(baseTop, baseBottom, 0.65), 1));
      baseGrad.addColorStop(1, rgba(baseBottom, 1));
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Ambient Drifting Color-Morphing Aurora Orbs
      ctx.globalCompositeOperation = 'screen';

      const orb1X = width * (0.18 + Math.sin(t * 0.25) * 0.11) + px * 0.65;
      const orb1Y = height * (0.18 + Math.cos(t * 0.21) * 0.09) + py * 0.5;
      const orb1Radius = Math.max(width, height) * 0.58;
      const grad1 = ctx.createRadialGradient(orb1X, orb1Y, 0, orb1X, orb1Y, orb1Radius);
      grad1.addColorStop(0, rgba(primary, 0.34));
      grad1.addColorStop(0.45, rgba(primary, 0.14));
      grad1.addColorStop(1, 'rgba(9, 9, 11, 0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const orb2X = width * (0.82 + Math.cos(t * 0.22) * 0.1) - px * 0.55;
      const orb2Y = height * (0.28 + Math.sin(t * 0.27) * 0.1) + py * 0.45;
      const orb2Radius = Math.max(width, height) * 0.54;
      const grad2 = ctx.createRadialGradient(orb2X, orb2Y, 0, orb2X, orb2Y, orb2Radius);
      grad2.addColorStop(0, rgba(secondary, 0.28));
      grad2.addColorStop(0.42, rgba(secondary, 0.11));
      grad2.addColorStop(1, 'rgba(9, 9, 11, 0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      const orb3X = width * (0.5 + Math.sin(t * 0.18 + 1.4) * 0.18) + px * 0.4;
      const orb3Y = height * (0.84 + Math.cos(t * 0.2) * 0.08) - py * 0.35;
      const orb3Radius = Math.max(width, height) * 0.55;
      const grad3 = ctx.createRadialGradient(orb3X, orb3Y, 0, orb3X, orb3Y, orb3Radius);
      grad3.addColorStop(0, rgba(accent, 0.24));
      grad3.addColorStop(0.45, rgba(primary, 0.09));
      grad3.addColorStop(1, 'rgba(9, 9, 11, 0)');
      ctx.fillStyle = grad3;
      ctx.fillRect(0, 0, width, height);

      // 3. Sweeping Stadium / Concert Stage Spotlights tinted to active palette
      const beamLength = Math.hypot(width, height) * 0.95;
      drawStageBeam(
        width * 0.08 + px * 0.25,
        -60,
        -0.38 + Math.sin(t * 0.34) * 0.2,
        beamLength,
        0.17,
        rgba(primary, 0.2),
        rgba(primary, 0.05)
      );
      drawStageBeam(
        width * 0.92 - px * 0.25,
        -60,
        0.38 + Math.cos(t * 0.29) * 0.2,
        beamLength,
        0.16,
        rgba(secondary, 0.18),
        rgba(secondary, 0.045)
      );
      drawStageBeam(
        width * 0.52 + px * 0.18,
        -80,
        Math.sin(t * 0.23 + 2.1) * 0.28,
        beamLength * 0.88,
        0.14,
        rgba(accent, 0.11),
        rgba(secondary, 0.025)
      );

      // 4. Subtle Broadcast Studio Grid Lines
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.028)';
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
      drawSignalRibbon(t, 0.3, 38, 6.2, 0.7, rgba(secondary, 0.19), 1.5);
      drawSignalRibbon(t + 1.4, 0.36, 30, 7.6, -0.58, rgba(primary, 0.21), 1.35);
      drawSignalRibbon(t + 3.1, 0.72, 32, 5.4, 0.48, rgba(accent, 0.15), 1.2);

      // 6. Floating Color-Synced Bokeh Sparks
      for (const p of particles) {
        if (!prefersReducedMotion) {
          p.y += p.vy;
          p.x += p.vx + Math.sin(t * 0.8 + p.twinklePhase) * 0.14;
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
          p.role === 'primary'
            ? rgba(primary, a * 0.95)
            : p.role === 'accent'
              ? rgba(secondary, a * 0.95)
              : `rgba(255, 255, 255, ${(a * 0.68).toFixed(3)})`;

        const halo = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, p.radius * 4.4);
        halo.addColorStop(0, color);
        halo.addColorStop(1, 'rgba(9, 9, 11, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(drawX, drawY, p.radius * 4.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(drawX, drawY, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 7. Gentle vignette to maintain WCAG AA contrast on all text & cards
      ctx.globalCompositeOperation = 'source-over';
      const vignette = ctx.createRadialGradient(
        width * 0.5,
        height * 0.45,
        Math.min(width, height) * 0.28,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.9
      );
      vignette.addColorStop(0, 'rgba(7, 8, 12, 0)');
      vignette.addColorStop(1, 'rgba(5, 6, 10, 0.52)');
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
