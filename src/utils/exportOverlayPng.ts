import { BANNER_THEMES } from '../data/overlayCatalog';
import { formatClockMMSS, shadeHexColor } from '../components/KabaddiScoreboardBar';
import { BannerIconType, BannerThemeId, OverlayStyle } from '../types/overlay';

export interface KabaddiOverlayExportOptions {
  style: OverlayStyle;
  title: string;
  subtitle: string;
  tag: string;
  teamAName: string;
  teamACode?: string;
  teamAColor?: string;
  teamAScore: number;
  teamALogoUrl?: string;
  teamAYellowCards?: number;
  teamARedCards?: number;
  teamBName: string;
  teamBCode?: string;
  teamBColor?: string;
  teamBScore: number;
  teamBLogoUrl?: string;
  teamBYellowCards?: number;
  teamBRedCards?: number;
  matchSeconds: number;
  raidSeconds: number;
  raidRunning?: boolean;
  halfLabel: string;
  doOrDie?: boolean;
  customLogoUrl?: string;
  logoCorner?: 'top-right' | 'top-left';
}

export interface HaldiOverlayExportOptions {
  style: OverlayStyle;
  tag: string;
  header: string;
  title: string;
  subtitle: string;
  customLogoUrl?: string;
  logoCorner?: 'top-right' | 'top-left';
}

export interface BottomBannerExportOptions {
  theme: BannerThemeId;
  title: string;
  subtitle: string;
  icon: BannerIconType;
  titleColor?: string;
  subtitleColor?: string;
  showTrophy?: boolean;
  showBrandLogo?: boolean;
  customLogoUrl?: string;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function triggerCanvasDownload(canvas: HTMLCanvasElement, filename: string) {
  const url = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function drawCircularCustomLogo(
  ctx: CanvasRenderingContext2D,
  logoUrl: string,
  cx: number,
  cy: number,
  radius: number,
  bgColor = 'rgba(9, 9, 11, 0.8)',
  borderColor = '#FACC15'
) {
  const img = await loadImage(logoUrl);
  if (!img) return;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius - 5, 0, Math.PI * 2);
  ctx.clip();

  const maxDim = (radius - 7) * 2;
  const ratio = Math.min(maxDim / img.width, maxDim / img.height);
  const drawW = img.width * ratio;
  const drawH = img.height * ratio;
  ctx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
  ctx.restore();
}

/**
 * Generates a 1920x1080 transparent PNG overlay for OBS / vMix featuring the
 * new Curved Dual-Logo Kabaddi Scoreboard (Style 1 = Bottom, Style 2 = Top TV Bug).
 */
export async function downloadKabaddiOverlayPng(opts: KabaddiOverlayExportOptions) {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, 1920, 1080);

  const isTopMode = opts.style === 'modern';
  const teamAColor = opts.teamAColor || '#C8102E';
  const teamBColor = opts.teamBColor || '#131D8A';
  const leftDark = shadeHexColor(teamAColor, -0.58);
  const leftBright = shadeHexColor(teamAColor, 0.12);
  const rightBright = shadeHexColor(teamBColor, 0.12);
  const rightDark = shadeHexColor(teamBColor, -0.62);

  // Scoreboard coordinate space: scaled cleanly from 1000x186 -> 1520x283
  const scale = 1.52;
  const barW = 1000 * scale;
  const barH = 186 * scale;
  const offsetX = (1920 - barW) / 2;
  const offsetY = isTopMode ? 38 : 1080 - barH - (opts.subtitle?.trim() ? 66 : 36);

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // Drop shadow for broadcast depth
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 10;

  // 1. Top Raised Center Trapezoid Cap
  ctx.beginPath();
  ctx.moveTo(366, 47);
  ctx.lineTo(392, 14);
  ctx.quadraticCurveTo(402, 4, 416, 4);
  ctx.lineTo(584, 4);
  ctx.quadraticCurveTo(598, 4, 608, 14);
  ctx.lineTo(634, 47);
  ctx.closePath();
  const capGrad = ctx.createLinearGradient(0, 4, 0, 47);
  capGrad.addColorStop(0, '#334347');
  capGrad.addColorStop(1, '#233033');
  ctx.fillStyle = capGrad;
  ctx.fill();

  // 2. Left Curved Team Wing
  ctx.beginPath();
  ctx.moveTo(14, 66);
  ctx.lineTo(500, 66);
  ctx.lineTo(500, 176);
  ctx.lineTo(154, 176);
  ctx.bezierCurveTo(68, 176, 14, 128, 14, 66);
  ctx.closePath();
  const leftGrad = ctx.createLinearGradient(14, 120, 500, 120);
  leftGrad.addColorStop(0, leftDark);
  leftGrad.addColorStop(0.48, teamAColor);
  leftGrad.addColorStop(1, leftBright);
  ctx.fillStyle = leftGrad;
  ctx.fill();

  // 3. Right Curved Team Wing
  ctx.beginPath();
  ctx.moveTo(500, 66);
  ctx.lineTo(986, 66);
  ctx.bezierCurveTo(986, 128, 932, 176, 846, 176);
  ctx.lineTo(500, 176);
  ctx.closePath();
  const rightGrad = ctx.createLinearGradient(500, 120, 986, 120);
  rightGrad.addColorStop(0, rightBright);
  rightGrad.addColorStop(0.52, teamBColor);
  rightGrad.addColorStop(1, rightDark);
  ctx.fillStyle = rightGrad;
  ctx.fill();
  ctx.restore();

  // 4. Crisp White V-Cradle around Center Trapezoid
  ctx.beginPath();
  ctx.moveTo(342, 66);
  ctx.lineTo(658, 66);
  ctx.lineTo(625, 156);
  ctx.quadraticCurveTo(618, 173, 599, 173);
  ctx.lineTo(401, 173);
  ctx.quadraticCurveTo(382, 173, 375, 156);
  ctx.closePath();
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // 5. Center Inverted Dark Charcoal Trapezoid Pod
  ctx.beginPath();
  ctx.moveTo(358, 66);
  ctx.lineTo(642, 66);
  ctx.lineTo(614, 148);
  ctx.quadraticCurveTo(608, 164, 592, 164);
  ctx.lineTo(408, 164);
  ctx.quadraticCurveTo(392, 164, 386, 148);
  ctx.closePath();
  const podGrad = ctx.createLinearGradient(0, 66, 0, 164);
  podGrad.addColorStop(0, '#2D3B3F');
  podGrad.addColorStop(1, '#1D282B');
  ctx.fillStyle = podGrad;
  ctx.fill();

  // 6. Full-Width Light Silver Top Strip
  ctx.beginPath();
  ctx.moveTo(30, 47);
  ctx.lineTo(970, 47);
  ctx.quadraticCurveTo(986, 47, 986, 63);
  ctx.lineTo(986, 67);
  ctx.lineTo(14, 67);
  ctx.lineTo(14, 63);
  ctx.quadraticCurveTo(14, 47, 30, 47);
  ctx.closePath();
  const silverGrad = ctx.createLinearGradient(0, 47, 0, 67);
  silverGrad.addColorStop(0, '#F1F5F9');
  silverGrad.addColorStop(1, '#CBD5E1');
  ctx.fillStyle = silverGrad;
  ctx.fill();

  // Cap Text (Half / DO-OR-DIE)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = opts.doOrDie ? '#FCA5A5' : '#F4F4F5';
  ctx.font = '800 17px "JetBrains Mono", monospace';
  ctx.fillText(opts.doOrDie ? 'DO-OR-DIE' : opts.halfLabel.toUpperCase(), 500, 27);

  // Center Match Clock (+ Optional Raid Timer)
  const showRaid = Boolean(opts.raidRunning || opts.raidSeconds < 30);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 44px "JetBrains Mono", monospace';
  ctx.fillText(formatClockMMSS(opts.matchSeconds), 500, showRaid ? 106 : 118);

  if (showRaid) {
    ctx.fillStyle = opts.raidSeconds <= 10 ? '#F87171' : '#FACC15';
    ctx.font = '800 17px "JetBrains Mono", monospace';
    ctx.fillText(`RAID ${String(opts.raidSeconds).padStart(2, '0')}s`, 500, 144);
  }

  // Left Wing Text & Score
  const hasLeftLogo = Boolean(opts.teamALogoUrl);
  const leftTextX = hasLeftLogo ? 148 : 88;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 25px "Plus Jakarta Sans", "Noto Sans Devanagari", sans-serif';
  ctx.fillText((opts.teamAName || 'TEAM A').toUpperCase(), leftTextX, 112, hasLeftLogo ? 145 : 205);

  if (opts.teamACode) {
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.font = '700 15px "JetBrains Mono", monospace';
    ctx.fillText(opts.teamACode.toUpperCase(), leftTextX, 140);
  }

  ctx.textAlign = 'right';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 48px "JetBrains Mono", monospace';
  ctx.fillText(String(opts.teamAScore), 340, 121);

  // Right Wing Text & Score
  const hasRightLogo = Boolean(opts.teamBLogoUrl);
  const rightTextX = hasRightLogo ? 852 : 912;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 48px "JetBrains Mono", monospace';
  ctx.fillText(String(opts.teamBScore), 660, 121);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 25px "Plus Jakarta Sans", "Noto Sans Devanagari", sans-serif';
  ctx.fillText((opts.teamBName || 'TEAM B').toUpperCase(), rightTextX, 112, hasRightLogo ? 145 : 205);

  if (opts.teamBCode) {
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.font = '700 15px "JetBrains Mono", monospace';
    ctx.fillText(opts.teamBCode.toUpperCase(), rightTextX, 140);
  }

  ctx.restore();

  // Draw Dual Left & Right Custom Team Logos in full-resolution canvas space
  if (opts.teamALogoUrl) {
    await drawCircularCustomLogo(
      ctx,
      opts.teamALogoUrl,
      offsetX + 104 * scale,
      offsetY + 119 * scale,
      34 * scale,
      'rgba(255, 255, 255, 0.96)',
      '#FFFFFF'
    );
  }

  if (opts.teamBLogoUrl) {
    await drawCircularCustomLogo(
      ctx,
      opts.teamBLogoUrl,
      offsetX + 896 * scale,
      offsetY + 119 * scale,
      34 * scale,
      'rgba(255, 255, 255, 0.96)',
      '#FFFFFF'
    );
  }

  // Optional bottom ticker ribbon
  if (opts.subtitle && opts.subtitle.trim().length > 0) {
    const pillW = 760;
    const pillH = 38;
    const pillX = (1920 - pillW) / 2;
    const pillY = offsetY + barH + 14;
    drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 19);
    ctx.fillStyle = 'rgba(17, 24, 28, 0.88)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#E4E4E7';
    ctx.font = '600 18px "Noto Sans Devanagari", "DM Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(opts.subtitle.trim(), 960, pillY + pillH / 2, pillW - 40);
    ctx.textAlign = 'left';
  }

  triggerCanvasDownload(
    canvas,
    isTopMode ? 'kabaddi-pro-top-1920x1080.png' : 'kabaddi-pro-bottom-1920x1080.png'
  );
}

/**
 * Generates a 1920x1080 transparent-center PNG overlay for OBS / vMix
 * supporting Haldi & Wedding Style 1 (Shahi Gold Frame) and Style 2 (Cinematic Ribbon).
 */
export async function downloadHaldiOverlayPng(opts: HaldiOverlayExportOptions) {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, 1920, 1080);

  if (opts.style === 'modern') {
    // STYLE 2: Minimal Floral Ribbon — Clean open viewport + floating amber/cream lower-third ribbon
    // Top-right subtle studio bug
    drawRoundedRect(ctx, 1348, 44, 516, 52, 26);
    ctx.fillStyle = 'rgba(24, 15, 6, 0.84)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FACC15';
    ctx.font = '700 20px "Noto Sans Devanagari", "Plus Jakarta Sans", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    ctx.fillText(opts.header, 1836, 70);
    ctx.textAlign = 'left';

    // Floating lower-third cinematic Haldi ribbon
    const barX = 180;
    const barY = 910;
    const barW = 1560;
    const barH = 122;

    drawRoundedRect(ctx, barX, barY, barW, barH, 61);
    const ribbonGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    ribbonGrad.addColorStop(0, 'rgba(34, 18, 4, 0.90)');
    ribbonGrad.addColorStop(0.5, 'rgba(146, 64, 14, 0.94)');
    ribbonGrad.addColorStop(1, 'rgba(34, 18, 4, 0.90)');
    ctx.fillStyle = ribbonGrad;
    ctx.fill();
    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Small decorative gold diamonds on left & right of ribbon
    const drawDiamond = (cx: number, cy: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(-9, -9, 18, 18);
      ctx.restore();
    };
    drawDiamond(barX + 64, barY + barH / 2);
    drawDiamond(barX + barW - 64, barY + barH / 2);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 38px "Noto Sans Devanagari", "Plus Jakarta Sans", sans-serif';
    ctx.fillText(opts.title, 960, barY + 46);

    ctx.fillStyle = '#FEF08A';
    ctx.font = '600 20px "Noto Sans Devanagari", "DM Sans", sans-serif';
    ctx.fillText(`${opts.tag}  •  ${opts.subtitle}`, 960, barY + 90);
    ctx.textAlign = 'left';

    if (opts.customLogoUrl) {
      const logoCx = opts.logoCorner === 'top-left' ? 114 : 1806;
      await drawCircularCustomLogo(ctx, opts.customLogoUrl, logoCx, 182, 58);
    }

    triggerCanvasDownload(canvas, 'haldi-wedding-style2-ribbon-1920x1080.png');
    return;
  }

  // STYLE 1: Shahi Traditional Marigold & Gold Frame
  ctx.strokeStyle = '#B45309';
  ctx.lineWidth = 16;
  ctx.strokeRect(12, 12, 1896, 1056);

  const goldGrad = ctx.createLinearGradient(0, 0, 1920, 1080);
  goldGrad.addColorStop(0, '#FEF08A');
  goldGrad.addColorStop(0.5, '#F59E0B');
  goldGrad.addColorStop(1, '#FACC15');
  ctx.strokeStyle = goldGrad;
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 24, 1872, 1032);

  const drawCorner = (x: number, y: number, sx: number, sy: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sx, sy);
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 84);
    ctx.lineTo(0, 0);
    ctx.lineTo(84, 0);
    ctx.stroke();
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(16, 16, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawCorner(36, 36, 1, 1);
  drawCorner(1884, 36, -1, 1);
  drawCorner(36, 1044, 1, -1);
  drawCorner(1884, 1044, -1, -1);

  // Top-left HALDI LIVE badge
  drawRoundedRect(ctx, 56, 50, 224, 52, 10);
  ctx.fillStyle = 'rgba(180, 83, 9, 0.94)';
  ctx.fill();
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = '#FEF08A';
  ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(opts.tag, 86, 76);

  // Top-center Marathi Haldi header plaque
  drawRoundedRect(ctx, 560, 44, 800, 64, 32);
  const topGrad = ctx.createLinearGradient(560, 44, 1360, 108);
  topGrad.addColorStop(0, 'rgba(120, 53, 15, 0.93)');
  topGrad.addColorStop(0.5, 'rgba(180, 83, 9, 0.96)');
  topGrad.addColorStop(1, 'rgba(120, 53, 15, 0.93)');
  ctx.fillStyle = topGrad;
  ctx.fill();
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#FEF08A';
  ctx.font = '700 26px "Noto Sans Devanagari", "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(opts.header, 960, 77);

  // Bottom Haldi Ornamental Banner
  const barX = 96;
  const barY = 900;
  const barW = 1728;
  const barH = 132;

  drawRoundedRect(ctx, barX, barY, barW, barH, 20);
  const bottomGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY + barH);
  bottomGrad.addColorStop(0, 'rgba(120, 53, 15, 0.94)');
  bottomGrad.addColorStop(0.5, 'rgba(180, 83, 9, 0.96)');
  bottomGrad.addColorStop(1, 'rgba(120, 53, 15, 0.94)');
  ctx.fillStyle = bottomGrad;
  ctx.fill();
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  drawRoundedRect(ctx, barX + 10, barY + 10, barW - 20, barH - 20, 14);
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 38px "Noto Sans Devanagari", "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(opts.title, 960, barY + 50);

  ctx.fillStyle = '#FEF08A';
  ctx.font = '600 21px "Noto Sans Devanagari", "DM Sans", sans-serif';
  ctx.fillText(opts.subtitle, 960, barY + 98);
  ctx.textAlign = 'left';

  if (opts.customLogoUrl) {
    const logoCx = opts.logoCorner === 'top-left' ? 114 : 1806;
    await drawCircularCustomLogo(ctx, opts.customLogoUrl, logoCx, 182, 58);
  }

  triggerCanvasDownload(canvas, 'haldi-wedding-style1-shahi-1920x1080.png');
}

function drawCanvasTrophy(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale = 1) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // Handles
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-22, -32);
  ctx.bezierCurveTo(-40, -32, -38, -2, -16, 2);
  ctx.stroke();

  ctx.strokeStyle = '#F59E0B';
  ctx.beginPath();
  ctx.moveTo(22, -32);
  ctx.bezierCurveTo(40, -32, 38, -2, 16, 2);
  ctx.stroke();

  // Cup body
  const cupGrad = ctx.createLinearGradient(-24, -40, 24, 14);
  cupGrad.addColorStop(0, '#FEF08A');
  cupGrad.addColorStop(0.45, '#FACC15');
  cupGrad.addColorStop(0.85, '#D97706');
  cupGrad.addColorStop(1, '#92400E');
  ctx.fillStyle = cupGrad;
  ctx.strokeStyle = '#FEF08A';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-24, -40);
  ctx.lineTo(24, -40);
  ctx.lineTo(18, -4);
  ctx.quadraticCurveTo(15, 14, 0, 14);
  ctx.quadraticCurveTo(-15, 14, -18, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Specular highlight
  ctx.strokeStyle = 'rgba(255, 251, 235, 0.65)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-12, -32);
  ctx.lineTo(-9, -4);
  ctx.stroke();

  // Stem & wooden pedestal
  ctx.fillStyle = '#D97706';
  ctx.fillRect(-5, 14, 10, 14);

  ctx.fillStyle = '#451A03';
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-18, 28);
  ctx.lineTo(18, 28);
  ctx.lineTo(24, 44);
  ctx.lineTo(-24, 44);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FACC15';
  ctx.fillRect(-11, 33, 22, 5);

  ctx.restore();
}

function drawCanvasLeftIcon(
  ctx: CanvasRenderingContext2D,
  icon: BannerIconType,
  cx: number,
  cy: number
) {
  if (icon === 'none') return;

  if (icon === 'trophy') {
    drawCanvasTrophy(ctx, cx, cy, 0.95);
    return;
  }

  ctx.save();
  ctx.translate(cx, cy);

  if (icon === 'cricket') {
    // Speed arcs
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, 42, -0.5, 0.75);
    ctx.stroke();

    // Raised bat
    ctx.save();
    ctx.translate(-8, -32);
    ctx.rotate(0.28);
    ctx.fillStyle = '#FDE047';
    ctx.strokeStyle = '#09090B';
    ctx.lineWidth = 2.5;
    ctx.fillRect(-20, -6, 38, 10);
    ctx.strokeRect(-20, -6, 38, 10);
    ctx.restore();

    // Helmet
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -18, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Jersey torso
    ctx.fillStyle = '#1D4ED8';
    ctx.strokeStyle = '#09090B';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-12, -5);
    ctx.lineTo(12, -6);
    ctx.lineTo(15, 19);
    ctx.lineTo(-14, 19);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Batting pads
    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-10, 19);
    ctx.lineTo(-22, 46);
    ctx.lineTo(-11, 47);
    ctx.lineTo(-1, 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(8, 19);
    ctx.lineTo(18, 46);
    ctx.lineTo(7, 47);
    ctx.lineTo(0, 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (icon === 'kabaddi') {
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.fillStyle = '#0F0A14';
    ctx.fill();
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-22, 18);
    ctx.lineTo(-6, -8);
    ctx.lineTo(6, 4);
    ctx.lineTo(22, -18);
    ctx.stroke();

    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(6, -21, 7, 0, Math.PI * 2);
    ctx.fill();
  } else if (icon === 'kalash') {
    // Mango leaves
    ctx.fillStyle = '#22C55E';
    ctx.beginPath();
    ctx.ellipse(-16, -16, 14, 7, 0.5, 0, Math.PI * 2);
    ctx.ellipse(16, -16, 14, 7, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Coconut
    ctx.fillStyle = '#92400E';
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, -22, 12, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pot
    const potGrad = ctx.createLinearGradient(-20, -10, 20, 38);
    potGrad.addColorStop(0, '#FDE047');
    potGrad.addColorStop(0.55, '#F59E0B');
    potGrad.addColorStop(1, '#B45309');
    ctx.fillStyle = potGrad;
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 14, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (icon === 'wedding') {
    // Interlocking Golden Wedding Rings + Diamond Sparkle
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(-14, 6, 20, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(14, 6, 20, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.lineTo(6, -22);
    ctx.lineTo(18, -17);
    ctx.lineTo(6, -12);
    ctx.lineTo(0, 0);
    ctx.lineTo(-6, -12);
    ctx.lineTo(-18, -17);
    ctx.lineTo(-6, -22);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Generates a 1920x1080 transparent-top PNG overlay for the 4-Theme Customizable Bottom Frame
 * (watermark-free by default; draws user's uploaded custom logo if provided).
 */
export async function downloadBottomBannerOverlayPng(opts: BottomBannerExportOptions) {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const cfg = BANNER_THEMES[opts.theme] ?? BANNER_THEMES.theme1;
  const titleColor = opts.titleColor || cfg.defaultTitleColor;
  const subtitleColor = opts.subtitleColor || cfg.defaultSubtitleColor;
  const showTrophy = opts.showTrophy !== false;
  const hasCustomLogo = Boolean(opts.showBrandLogo && opts.customLogoUrl);

  ctx.clearRect(0, 0, 1920, 1080);

  const stripY = 948;
  const stripH = 132;

  // Full-width bottom gradient strip
  const stripGrad = ctx.createLinearGradient(0, stripY, 1920, stripY + stripH);
  stripGrad.addColorStop(0, cfg.canvasStops[0]);
  stripGrad.addColorStop(0.5, cfg.canvasStops[1]);
  stripGrad.addColorStop(1, cfg.canvasStops[2]);
  ctx.fillStyle = stripGrad;
  ctx.fillRect(0, stripY, 1920, stripH);

  // Subtle top & bottom gold accent lines
  ctx.fillStyle = 'rgba(250, 204, 21, 0.72)';
  ctx.fillRect(0, stripY, 1920, 3);
  ctx.fillRect(0, 1077, 1920, 3);

  const hasLeftIcon = opts.icon !== 'none';
  const leftStart = hasLeftIcon ? 148 : 36;
  const rightEnd = hasCustomLogo ? 1776 : 1884;
  const trophyWidth = showTrophy ? 104 : 24;
  const usableW = rightEnd - leftStart - trophyWidth;
  const leftBoxW = Math.round(usableW * 0.57);
  const rightBoxX = leftStart + leftBoxW + trophyWidth;
  const rightBoxW = rightEnd - rightBoxX;

  const boxY = stripY + 18;
  const boxH = stripH - 36;
  const centerY = stripY + stripH / 2;

  // Left Mascot / Event Emblem
  if (hasLeftIcon) {
    drawCanvasLeftIcon(ctx, opts.icon, 78, centerY);
  }

  // Left Rounded Capsule Box (Primary Title)
  drawRoundedRect(ctx, leftStart, boxY, leftBoxW, boxH, 28);
  ctx.fillStyle = cfg.leftBoxBg;
  ctx.fill();
  ctx.strokeStyle = cfg.leftBoxBorder;
  ctx.lineWidth = 4.5;
  ctx.stroke();

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = titleColor;
  ctx.font = '800 44px "Noto Sans Devanagari", "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    opts.title || 'जय हनुमान क्रिकेट संघ चाहूचीवाडी पर्व ४',
    leftStart + leftBoxW / 2,
    centerY + 2,
    leftBoxW - 44
  );
  ctx.restore();

  // Center Metallic Golden Trophy
  if (showTrophy) {
    drawCanvasTrophy(ctx, leftStart + leftBoxW + trophyWidth / 2, centerY, 1.05);
  }

  // Right Gold-Bordered Secondary Bar
  ctx.fillStyle = cfg.rightBarBg;
  ctx.fillRect(rightBoxX, boxY + 4, rightBoxW, boxH - 8);
  ctx.strokeStyle = cfg.rightBarBorder;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(rightBoxX, boxY + 4);
  ctx.lineTo(rightBoxX + rightBoxW, boxY + 4);
  ctx.lineTo(rightBoxX + rightBoxW, boxY + boxH - 4);
  ctx.lineTo(rightBoxX, boxY + boxH - 4);
  ctx.stroke();

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = subtitleColor;
  ctx.font = '800 38px "Noto Sans Devanagari", "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    opts.subtitle || 'भव्य टेनिस स्पर्धा २०२६',
    rightBoxX + rightBoxW / 2,
    centerY + 2,
    rightBoxW - 36
  );
  ctx.restore();

  // Far Right Optional User-Uploaded Custom Logo
  if (hasCustomLogo && opts.customLogoUrl) {
    await drawCircularCustomLogo(ctx, opts.customLogoUrl, 1846, centerY, 52);
  }

  triggerCanvasDownload(canvas, `bottom-frame-${opts.theme}-1920x1080.png`);
}
