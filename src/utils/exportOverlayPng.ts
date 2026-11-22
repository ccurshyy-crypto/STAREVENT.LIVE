import { HALDI_THEME_PALETTES } from '../components/HaldiFestiveOverlayBar';
import { formatClockMMSS, shadeHexColor } from '../components/KabaddiScoreboardBar';
import { HaldiColorTheme, OverlayStyle } from '../types/overlay';

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
  showDemoWatermark?: boolean;
}

export interface HaldiOverlayExportOptions {
  style: OverlayStyle;
  tag: string;
  header: string;
  title: string;
  subtitle: string;
  leftText?: string;
  centerMain?: string;
  centerSub?: string;
  rightText?: string;
  theme?: HaldiColorTheme;
  showTopHeader?: boolean;
  showDecor?: boolean;
  customLogoUrl?: string;
  logoCorner?: 'top-right' | 'top-left';
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

  // Small STAR EVENT LIVE Watermark on Free Demo PNG
  if (opts.showDemoWatermark) {
    const wmW = 248;
    const wmH = 28;
    const wmX = (1920 - wmW) / 2;
    const wmY = offsetY + barH - 8;
    drawRoundedRect(ctx, wmX, wmY, wmW, wmH, 14);
    ctx.fillStyle = 'rgba(9, 11, 14, 0.9)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.65)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.fillStyle = '#FEF08A';
    ctx.font = '800 14px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★ STAR EVENT LIVE', 960, wmY + wmH / 2 + 0.5);
    ctx.textAlign = 'left';
  }

  // Optional bottom ticker ribbon
  if (opts.subtitle && opts.subtitle.trim().length > 0) {
    const pillW = 760;
    const pillH = 38;
    const pillX = (1920 - pillW) / 2;
    const pillY = offsetY + barH + (opts.showDemoWatermark ? 26 : 14);
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
    opts.showDemoWatermark
      ? 'kabaddi-demo-watermark-1920x1080.png'
      : 'kabaddi-pro-1920x1080.png'
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

  if (opts.style === 'festive') {
    const palette = HALDI_THEME_PALETTES[opts.theme || 'royal-maroon'] ?? HALDI_THEME_PALETTES['royal-maroon'];
    const showDecor = opts.showDecor !== false;

    // Optional top auspicious header bar
    if (opts.showTopHeader && opts.header.trim()) {
      drawRoundedRect(ctx, 560, 42, 800, 62, 31);
      const topGrad = ctx.createLinearGradient(560, 42, 1360, 104);
      topGrad.addColorStop(0, palette.ribbonDark);
      topGrad.addColorStop(0.5, palette.ribbonBright);
      topGrad.addColorStop(1, palette.ribbonDark);
      ctx.fillStyle = topGrad;
      ctx.fill();
      ctx.strokeStyle = palette.goldMid;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#FEF08A';
      ctx.font = '700 26px "Noto Sans Devanagari", "Noto Sans Gujarati", "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(opts.header, 960, 74, 740);
      ctx.textAlign = 'left';
    }

    // Bottom Royal Maroon & Gold Haldi Lower-Third Ribbon
    const barX = 48;
    const barY = 858;
    const barW = 1824;
    const barH = 184;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;

    drawRoundedRect(ctx, barX, barY, barW, barH, 22);
    const ribGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    ribGrad.addColorStop(0, palette.ribbonDark);
    ribGrad.addColorStop(0.24, palette.ribbonMid);
    ribGrad.addColorStop(0.5, palette.ribbonBright);
    ribGrad.addColorStop(0.76, palette.ribbonMid);
    ribGrad.addColorStop(1, palette.ribbonDark);
    ctx.fillStyle = ribGrad;
    ctx.fill();

    const borderGold = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    borderGold.addColorStop(0, palette.goldDark);
    borderGold.addColorStop(0.25, palette.goldLight);
    borderGold.addColorStop(0.5, palette.goldMid);
    borderGold.addColorStop(0.75, palette.goldLight);
    borderGold.addColorStop(1, palette.goldDark);
    ctx.strokeStyle = borderGold;
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.restore();

    // Inner hairline gold frame
    drawRoundedRect(ctx, barX + 16, barY + 14, barW - 32, barH - 28, 14);
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.5)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Center Royal Ornate Medallion
    const medW = 496;
    const medH = 228;
    const medX = 960 - medW / 2;
    const medY = 830;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 20;
    drawRoundedRect(ctx, medX, medY, medW, medH, 52);
    const medGrad = ctx.createLinearGradient(960, medY, 960, medY + medH);
    medGrad.addColorStop(0, palette.medallionLight);
    medGrad.addColorStop(1, palette.ribbonDark);
    ctx.fillStyle = medGrad;
    ctx.fill();
    ctx.strokeStyle = borderGold;
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.restore();

    // Top Haldi Bowl & Turmeric Mound above Center Medallion
    if (showDecor) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(868, 826);
      ctx.quadraticCurveTo(960, 738, 1052, 826);
      ctx.closePath();
      const haldiGrad = ctx.createRadialGradient(960, 790, 10, 960, 815, 90);
      haldiGrad.addColorStop(0, '#FEF08A');
      haldiGrad.addColorStop(0.55, '#FACC15');
      haldiGrad.addColorStop(1, '#D97706');
      ctx.fillStyle = haldiGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(850, 822);
      ctx.bezierCurveTo(854, 870, 896, 882, 960, 882);
      ctx.bezierCurveTo(1024, 882, 1066, 870, 1070, 822);
      ctx.closePath();
      const bowlGrad = ctx.createLinearGradient(850, 822, 1070, 882);
      bowlGrad.addColorStop(0, '#FEF08A');
      bowlGrad.addColorStop(0.5, '#D97706');
      bowlGrad.addColorStop(1, '#78350F');
      ctx.fillStyle = bowlGrad;
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 3;
      ctx.fill();
      ctx.stroke();

      // Marigold dots left & right accents
      const drawBloom = (bx: number, by: number, br: number) => {
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fillStyle = '#F97316';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx, by, br * 0.62, 0, Math.PI * 2);
        ctx.fillStyle = '#FACC15';
        ctx.fill();
      };
      drawBloom(712, 986, 30);
      drawBloom(746, 1018, 26);
      drawBloom(1208, 986, 30);
      drawBloom(1174, 1018, 26);
      drawBloom(98, 1016, 32);
      drawBloom(1822, 1016, 32);

      // Left Dholak emblem
      ctx.save();
      ctx.translate(154, 948);
      ctx.rotate(-0.48);
      ctx.beginPath();
      ctx.ellipse(0, 0, 74, 48, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#9A3412';
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 4;
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(52, 0, 20, 44, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFBEB';
      ctx.fill();
      ctx.restore();

      // Right Copper Om Kalash emblem
      ctx.beginPath();
      ctx.arc(1764, 956, 56, 0, Math.PI * 2);
      ctx.fillStyle = '#D97706';
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 4;
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#7F1D1D';
      ctx.font = '800 50px "Noto Sans Devanagari", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ॐ', 1764, 962);
      ctx.restore();
    }

    // Golden curved brush swooshes under Left & Right texts
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.moveTo(320, 996);
    ctx.quadraticCurveTo(468, 974, 626, 984);
    ctx.quadraticCurveTo(470, 989, 326, 1006);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(1294, 996);
    ctx.quadraticCurveTo(1448, 974, 1600, 984);
    ctx.quadraticCurveTo(1450, 989, 1300, 1006);
    ctx.closePath();
    ctx.fill();

    // Left Custom Text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 46px "Noto Sans Devanagari", "Noto Sans Gujarati", "Plus Jakarta Sans", sans-serif';
    ctx.fillText(opts.leftText || 'शुभ विवाह...', showDecor ? 470 : 390, 944, 420);

    // Center Main + Sub Text
    const mainTextGrad = ctx.createLinearGradient(960, 885, 960, 975);
    mainTextGrad.addColorStop(0, '#FFFBEB');
    mainTextGrad.addColorStop(0.5, '#FACC15');
    mainTextGrad.addColorStop(1, '#F59E0B');
    ctx.fillStyle = mainTextGrad;
    ctx.font = '900 72px "Noto Sans Devanagari", "Noto Sans Gujarati", "Plus Jakarta Sans", sans-serif';
    ctx.fillText(opts.centerMain || 'हळदी', 960, 932, 430);

    if (opts.centerSub?.trim()) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 40px "Noto Sans Devanagari", "Noto Sans Gujarati", "Plus Jakarta Sans", sans-serif';
      ctx.fillText(opts.centerSub, 960, 1002, 420);
    }

    // Right Custom Text
    ctx.fillStyle = '#FEF08A';
    ctx.font = 'italic 800 44px "Noto Sans Devanagari", "Noto Sans Gujarati", "Plus Jakarta Sans", sans-serif';
    ctx.fillText(opts.rightText || 'Haldi Ceremony', showDecor ? 1450 : 1530, 944, 420);
    ctx.textAlign = 'left';

    if (opts.customLogoUrl) {
      const logoCx = opts.logoCorner === 'top-left' ? 114 : 1806;
      await drawCircularCustomLogo(ctx, opts.customLogoUrl, logoCx, 182, 58);
    }

    triggerCanvasDownload(canvas, 'haldi-ceremony-royal-animated-1920x1080.png');
    return;
  }

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
