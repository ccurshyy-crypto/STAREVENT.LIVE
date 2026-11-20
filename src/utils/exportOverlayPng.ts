import { OverlayStyle } from '../types/overlay';

export interface KabaddiOverlayExportOptions {
  style: OverlayStyle;
  title: string;
  subtitle: string;
  tag: string;
  teamAName: string;
  teamAScore: number;
  teamBName: string;
  teamBScore: number;
  raidSeconds: number;
  halfLabel: string;
  doOrDie?: boolean;
}

export interface HaldiOverlayExportOptions {
  style: OverlayStyle;
  tag: string;
  header: string;
  title: string;
  subtitle: string;
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

/**
 * Generates a 1920x1080 transparent-center PNG overlay for OBS / vMix
 * supporting Style 1 (Shahi Arena Border) and Style 2 (Pro TV Floating Scorebar).
 */
export function downloadKabaddiOverlayPng(opts: KabaddiOverlayExportOptions) {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, 1920, 1080);

  if (opts.style === 'modern') {
    // STYLE 2: Pro TV Broadcast — Open Arena (No heavy frame), Sleek Floating Lower-Third + Center Raid Ring
    // Top-left Compact Broadcast Bug
    drawRoundedRect(ctx, 56, 44, 520, 54, 27);
    ctx.fillStyle = 'rgba(9, 11, 18, 0.90)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();

    drawRoundedRect(ctx, 64, 52, 174, 38, 19);
    ctx.fillStyle = '#DC2626';
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 18px "Plus Jakarta Sans", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(opts.tag, 151, 71);

    ctx.fillStyle = '#FACC15';
    ctx.font = '700 20px "Noto Sans Devanagari", "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('STAR EVENT LIVE', 256, 71);

    // Top-right Event Tag
    drawRoundedRect(ctx, 1340, 44, 524, 54, 27);
    ctx.fillStyle = 'rgba(9, 11, 18, 0.86)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#F4F4F5';
    ctx.font = '700 21px "Noto Sans Devanagari", "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(opts.title, 1836, 71);
    ctx.textAlign = 'left';

    // Floating TV Lower-Third Scorebar (centered, wide, open sides)
    const barX = 140;
    const barY = 918;
    const barW = 1640;
    const barH = 114;

    drawRoundedRect(ctx, barX, barY, barW, barH, 57);
    ctx.fillStyle = 'rgba(10, 12, 20, 0.95)';
    ctx.fill();
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Left Crimson Team A Wing
    drawRoundedRect(ctx, barX + 12, barY + 12, 650, 62, 31);
    const wingA = ctx.createLinearGradient(barX + 12, barY, barX + 662, barY);
    wingA.addColorStop(0, '#B91C1C');
    wingA.addColorStop(1, '#EF4444');
    ctx.fillStyle = wingA;
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 28px "Plus Jakarta Sans", "Noto Sans Devanagari", sans-serif';
    ctx.fillText(opts.teamAName.toUpperCase(), barX + 46, barY + 44);

    ctx.fillStyle = '#FEF08A';
    ctx.font = '800 44px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(String(opts.teamAScore).padStart(2, '0'), barX + 634, barY + 45);
    ctx.textAlign = 'left';

    // Right Cyan/Royal Team B Wing
    drawRoundedRect(ctx, barX + 978, barY + 12, 650, 62, 31);
    const wingB = ctx.createLinearGradient(barX + 978, barY, barX + 1628, barY);
    wingB.addColorStop(0, '#0284C7');
    wingB.addColorStop(1, '#1E3A8A');
    ctx.fillStyle = wingB;
    ctx.fill();

    ctx.fillStyle = '#FEF08A';
    ctx.font = '800 44px "JetBrains Mono", monospace';
    ctx.fillText(String(opts.teamBScore).padStart(2, '0'), barX + 1006, barY + 45);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 28px "Plus Jakarta Sans", "Noto Sans Devanagari", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(opts.teamBName.toUpperCase(), barX + 1594, barY + 44);
    ctx.textAlign = 'left';

    // Elevated Center Circular Raid Timer Emblem
    ctx.beginPath();
    ctx.arc(960, barY + 34, 68, 0, Math.PI * 2);
    ctx.fillStyle = '#09090B';
    ctx.fill();
    ctx.strokeStyle = opts.doOrDie ? '#EF4444' : '#FACC15';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.fillStyle = opts.doOrDie ? '#FCA5A5' : '#A1A1AA';
    ctx.font = '700 15px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(opts.doOrDie ? 'DO-OR-DIE' : opts.halfLabel, 960, barY + 12);

    ctx.fillStyle = opts.raidSeconds <= 10 ? '#EF4444' : '#FACC15';
    ctx.font = '800 42px "JetBrains Mono", monospace';
    ctx.fillText(`${String(opts.raidSeconds).padStart(2, '0')}s`, 960, barY + 49);

    // Bottom ticker line inside pill
    ctx.fillStyle = '#E4E4E7';
    ctx.font = '600 18px "Noto Sans Devanagari", "DM Sans", sans-serif';
    ctx.fillText(opts.subtitle, 960, barY + 96);
    ctx.textAlign = 'left';

    triggerCanvasDownload(canvas, 'star-event-live-kabaddi-style2-tv-1920x1080.png');
    return;
  }

  // STYLE 1: Shahi Arena Frame (Classic Red & Gold Border)
  const borderGrad = ctx.createLinearGradient(0, 0, 1920, 1080);
  borderGrad.addColorStop(0, '#DC2626');
  borderGrad.addColorStop(0.5, '#FACC15');
  borderGrad.addColorStop(1, '#B91C1C');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 10;
  ctx.strokeRect(18, 18, 1884, 1044);

  // Top-left LIVE KABADDI bug
  drawRoundedRect(ctx, 48, 42, 260, 56, 10);
  ctx.fillStyle = '#DC2626';
  ctx.fill();
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(opts.tag, 76, 70);

  // Top-right Brand Title Badge
  drawRoundedRect(ctx, 1290, 42, 582, 56, 10);
  ctx.fillStyle = 'rgba(12, 10, 14, 0.88)';
  ctx.fill();
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#FACC15';
  ctx.font = '700 24px "Noto Sans Devanagari", "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(opts.title, 1846, 70);
  ctx.textAlign = 'left';

  // Bottom broadcast overlay bar
  const barX = 64;
  const barY = 892;
  const barW = 1792;
  const barH = 144;

  drawRoundedRect(ctx, barX, barY, barW, barH, 18);
  const bgGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY + barH);
  bgGrad.addColorStop(0, 'rgba(30, 8, 12, 0.94)');
  bgGrad.addColorStop(0.5, 'rgba(15, 15, 22, 0.96)');
  bgGrad.addColorStop(1, 'rgba(30, 8, 12, 0.94)');
  ctx.fillStyle = bgGrad;
  ctx.fill();
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  ctx.fillStyle = '#FACC15';
  ctx.fillRect(barX + 18, barY, barW - 36, 4);

  // Team A Score Block
  drawRoundedRect(ctx, barX + 20, barY + 18, 600, 72, 12);
  const teamAGrad = ctx.createLinearGradient(barX + 20, barY + 18, barX + 620, barY + 90);
  teamAGrad.addColorStop(0, '#991B1B');
  teamAGrad.addColorStop(1, '#DC2626');
  ctx.fillStyle = teamAGrad;
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 30px "Plus Jakarta Sans", "Noto Sans Devanagari", sans-serif';
  ctx.fillText(opts.teamAName.toUpperCase(), barX + 44, barY + 55);

  ctx.fillStyle = '#FACC15';
  ctx.font = '800 44px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(String(opts.teamAScore).padStart(2, '0'), barX + 596, barY + 56);
  ctx.textAlign = 'left';

  // Center Raid Timer + Half Badge
  drawRoundedRect(ctx, barX + 644, barY + 14, 504, 80, 12);
  ctx.fillStyle = '#09090B';
  ctx.fill();
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = '#A1A1AA';
  ctx.font = '700 18px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`RAID TIMER · ${opts.halfLabel.toUpperCase()}`, barX + 896, barY + 37);

  ctx.fillStyle = opts.raidSeconds <= 10 ? '#EF4444' : '#FACC15';
  ctx.font = '800 42px "JetBrains Mono", monospace';
  ctx.fillText(`${String(opts.raidSeconds).padStart(2, '0')}s`, barX + 896, barY + 72);
  ctx.textAlign = 'left';

  // Team B Score Block
  drawRoundedRect(ctx, barX + 1172, barY + 18, 600, 72, 12);
  const teamBGrad = ctx.createLinearGradient(barX + 1172, barY + 18, barX + 1772, barY + 90);
  teamBGrad.addColorStop(0, '#1E3A8A');
  teamBGrad.addColorStop(1, '#1D4ED8');
  ctx.fillStyle = teamBGrad;
  ctx.fill();

  ctx.fillStyle = '#FACC15';
  ctx.font = '800 44px "JetBrains Mono", monospace';
  ctx.fillText(String(opts.teamBScore).padStart(2, '0'), barX + 1196, barY + 56);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 30px "Plus Jakarta Sans", "Noto Sans Devanagari", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(opts.teamBName.toUpperCase(), barX + 1748, barY + 55);
  ctx.textAlign = 'left';

  // Subtitle Strip
  ctx.fillStyle = 'rgba(250, 204, 21, 0.14)';
  ctx.fillRect(barX + 20, barY + 102, barW - 40, 30);

  ctx.fillStyle = '#FEF08A';
  ctx.font = '600 20px "Noto Sans Devanagari", "DM Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(opts.subtitle, barX + barW / 2, barY + 118);
  ctx.textAlign = 'left';

  triggerCanvasDownload(canvas, 'star-event-live-kabaddi-style1-classic-1920x1080.png');
}

/**
 * Generates a 1920x1080 transparent-center PNG overlay for OBS / vMix
 * supporting Style 1 (Shahi Marigold Frame) and Style 2 (Minimal Cinematic Ribbon).
 */
export function downloadHaldiOverlayPng(opts: HaldiOverlayExportOptions) {
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

    triggerCanvasDownload(canvas, 'star-event-live-haldi-style2-ribbon-1920x1080.png');
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

  triggerCanvasDownload(canvas, 'star-event-live-haldi-style1-shahi-1920x1080.png');
}
