import {
  computeBattingCard,
  computeBowlingCard,
  getTeamColorHex,
  getTeamTextColorHex,
} from '../data/cricketSampleData';
import type {
  CricketMatch,
  InningsState,
  Team,
  Tournament,
  TournamentGroup,
} from '../types/cricketSuite';

export interface SummaryBatterRow {
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  isOut: boolean;
}

export interface SummaryBowlerRow {
  playerId: string;
  playerName: string;
  wickets: number;
  runs: number;
  legalBalls: number;
  oversCompact: string;
}

export interface SummaryInningsBlock {
  inningsIndex: 0 | 1;
  battingTeam?: Team;
  bowlingTeam?: Team;
  teamName: string;
  teamShortName: string;
  bowlingTeamShortName: string;
  runs: number;
  wickets: number;
  legalBalls: number;
  maxOvers: number;
  oversCompact: string;
  scoreLabel: string;
  hasScore: boolean;
  topBatters: SummaryBatterRow[];
  topBowlers: SummaryBowlerRow[];
}

export interface MatchSummaryData {
  matchId: string;
  matchLabel: string;
  stageBadge: string;
  dateLabel: string;
  venue: string;
  status: CricketMatch['status'];
  tournamentName: string;
  tournamentLogoUrl?: string;
  groupVenueLine: string;
  channelTitle: string;
  innings1: SummaryInningsBlock;
  innings2: SummaryInningsBlock;
  resultHeadline: string;
  tossLine: string;
}

/**
 * Formats overs like international TV broadcasts:
 * 54 legal balls -> "9", 47 legal balls -> "7.5", 281 legal balls -> "46.5"
 */
export function formatBroadcastOvers(legalBalls: number): string {
  const safeBalls = Math.max(0, Math.floor(legalBalls));
  const fullOvers = Math.floor(safeBalls / 6);
  const remBalls = safeBalls % 6;
  return remBalls === 0 ? `${fullOvers}` : `${fullOvers}.${remBalls}`;
}

/**
 * Formats team score clearly showing both total runs and wickets (e.g. 232/8, 232/10).
 */
export function formatBroadcastTeamScore(runs: number, wickets: number): string {
  return `${runs}/${wickets}`;
}

/**
 * Automatically calculates broadcast match result from live scoring innings data.
 */
export function computeBroadcastMatchResult(
  match: CricketMatch,
  inn1: InningsState,
  inn2: InningsState,
  inn1Team: Team | undefined,
  inn2Team: Team | undefined
): string {
  const rawResult = (match.resultText || '').trim();
  const rawUpper = rawResult.toUpperCase();

  // Preserve explicit special outcomes (No Result, Drawn, Super Over, Abandoned)
  if (
    rawUpper.includes('NO RESULT') ||
    rawUpper.includes('DRAWN') ||
    rawUpper.includes('DRAW') ||
    rawUpper.includes('SUPER OVER') ||
    rawUpper.includes('ABANDONED')
  ) {
    return rawUpper;
  }

  const t1Name = (inn1Team?.name || inn1Team?.shortName || 'TEAM 1').toUpperCase();
  const t2Name = (inn2Team?.name || inn2Team?.shortName || 'TEAM 2').toUpperCase();
  const playingCount = Math.max(
    2,
    inn2Team?.players?.length ||
      (inn2.battingTeamId === match.team1Id
        ? match.playingXI1.length
        : match.playingXI2.length) ||
      11
  );
  const maxWickets = Math.max(1, Math.min(10, playingCount - 1));

  const inn2HasStarted =
    inn2.balls.length > 0 || inn2.runs > 0 || inn2.wickets > 0 || inn2.completed;
  const isFinished =
    match.status === 'completed' || (inn1.completed && inn2.completed);

  if (isFinished) {
    if (!inn2HasStarted) {
      return rawUpper && rawUpper !== 'NOT STARTED' && rawUpper !== 'LIVE'
        ? rawUpper
        : 'NO RESULT';
    }
    if (inn1.runs > inn2.runs) {
      const margin = inn1.runs - inn2.runs;
      return `${t1Name} WON BY ${margin} ${margin === 1 ? 'RUN' : 'RUNS'}`;
    }
    if (inn2.runs > inn1.runs) {
      const wicketsLeft = Math.max(1, maxWickets - inn2.wickets);
      return `${t2Name} WON BY ${wicketsLeft} ${
        wicketsLeft === 1 ? 'WICKET' : 'WICKETS'
      }`;
    }
    return 'MATCH TIED';
  }

  // Live 2nd innings chase status
  if (inn2HasStarted || match.currentInningsIndex === 1) {
    const target = inn2.target ?? inn1.runs + 1;
    const needRuns = Math.max(0, target - inn2.runs);
    const totalBalls = inn2.maxOvers * 6;
    const remBalls = Math.max(0, totalBalls - inn2.legalBalls);
    if (needRuns === 0 && inn2.runs >= target) {
      const wicketsLeft = Math.max(1, maxWickets - inn2.wickets);
      return `${t2Name} WON BY ${wicketsLeft} ${
        wicketsLeft === 1 ? 'WICKET' : 'WICKETS'
      }`;
    }
    return `${t2Name} NEED ${needRuns} ${needRuns === 1 ? 'RUN' : 'RUNS'} FROM ${remBalls} ${
      remBalls === 1 ? 'BALL' : 'BALLS'
    }`;
  }

  // Live 1st innings status
  if (inn1.balls.length > 0 || inn1.runs > 0) {
    return `${t1Name} ${inn1.runs}/${inn1.wickets} (${formatBroadcastOvers(
      inn1.legalBalls
    )} OV) · 1ST INNINGS IN PROGRESS`;
  }

  return rawUpper && rawUpper !== 'NOT STARTED' ? rawUpper : 'MATCH YET TO START';
}

function buildInningsSummary(
  inn: InningsState,
  inningsIndex: 0 | 1,
  teamMap: Map<string, Team>
): SummaryInningsBlock {
  const battingTeam = teamMap.get(inn.battingTeamId);
  const bowlingTeam = teamMap.get(inn.bowlingTeamId);

  const hasScore =
    inn.balls.length > 0 || inn.runs > 0 || inn.wickets > 0 || inn.completed;

  const topBatters: SummaryBatterRow[] = computeBattingCard(inn, battingTeam)
    .filter((b) => b.balls > 0 || b.runs > 0 || b.isOut)
    .sort(
      (a, b) =>
        b.runs - a.runs ||
        a.balls - b.balls ||
        Number(a.isOut) - Number(b.isOut) ||
        a.battingPosition - b.battingPosition
    )
    .slice(0, 4)
    .map((b) => ({
      playerId: b.playerId,
      playerName: b.playerName,
      runs: b.runs,
      balls: b.balls,
      isOut: b.isOut,
    }));

  const topBowlers: SummaryBowlerRow[] = computeBowlingCard(inn, bowlingTeam)
    .filter((bw) => bw.legalBalls > 0 || bw.runs > 0 || bw.wickets > 0)
    .sort(
      (a, b) =>
        b.wickets - a.wickets ||
        a.runs - b.runs ||
        b.legalBalls - a.legalBalls
    )
    .slice(0, 4)
    .map((bw) => ({
      playerId: bw.playerId,
      playerName: bw.playerName,
      wickets: bw.wickets,
      runs: bw.runs,
      legalBalls: bw.legalBalls,
      oversCompact: formatBroadcastOvers(bw.legalBalls),
    }));

  return {
    inningsIndex,
    battingTeam,
    bowlingTeam,
    teamName: (battingTeam?.name || `TEAM ${inningsIndex + 1}`).toUpperCase(),
    teamShortName: (
      battingTeam?.shortName ||
      battingTeam?.name?.slice(0, 3) ||
      `T${inningsIndex + 1}`
    ).toUpperCase(),
    bowlingTeamShortName: (
      bowlingTeam?.shortName ||
      bowlingTeam?.name ||
      'BOWLING'
    ).toUpperCase(),
    runs: inn.runs,
    wickets: inn.wickets,
    legalBalls: inn.legalBalls,
    maxOvers: inn.maxOvers,
    oversCompact: formatBroadcastOvers(inn.legalBalls),
    scoreLabel: formatBroadcastTeamScore(inn.runs, inn.wickets),
    hasScore,
    topBatters,
    topBowlers,
  };
}

export function extractMatchSummaryData(
  match: CricketMatch,
  tournament: Tournament | undefined,
  group: TournamentGroup | undefined,
  teamMap: Map<string, Team>,
  channelTitle = 'STAR EVENT LIVE'
): MatchSummaryData {
  const inn1 = match.innings[0];
  const inn2 = match.innings[1];
  const innings1 = buildInningsSummary(inn1, 0, teamMap);
  const innings2 = buildInningsSummary(inn2, 1, teamMap);

  const resultHeadline = computeBroadcastMatchResult(
    match,
    inn1,
    inn2,
    innings1.battingTeam,
    innings2.battingTeam
  );

  const tournamentName = (
    tournament?.name ||
    channelTitle ||
    'CRICKET TOURNAMENT'
  ).toUpperCase();

  const groupPart = group?.name
    ? group.name.toUpperCase()
    : match.stageBadge
      ? match.stageBadge.toUpperCase()
      : '';
  const venuePart = (match.venue || tournament?.location || '').trim().toUpperCase();
  const groupVenueLine = [groupPart, venuePart].filter(Boolean).join(', ');

  const tossWinner = teamMap.get(match.tossWinnerId);
  const tossLine =
    match.tossCompleted && tossWinner
      ? `TOSS: ${tossWinner.name.toUpperCase()} ELECTED TO ${match.tossDecision.toUpperCase()}`
      : '';

  return {
    matchId: match.id,
    matchLabel: match.matchLabel,
    stageBadge: match.stageBadge,
    dateLabel: match.dateLabel,
    venue: match.venue || tournament?.location || '',
    status: match.status,
    tournamentName,
    tournamentLogoUrl: tournament?.logoUrl,
    groupVenueLine,
    channelTitle: (channelTitle || 'STAR EVENT LIVE').toUpperCase(),
    innings1,
    innings2,
    resultHeadline,
    tossLine,
  };
}

export function buildWhatsAppMatchSummaryText(data: MatchSummaryData): string {
  const lines: string[] = [];
  lines.push(`*MATCH SUMMARY — ${data.tournamentName}*`);
  if (data.groupVenueLine) {
    lines.push(`${data.groupVenueLine} · ${data.matchLabel}`);
  } else {
    lines.push(`${data.matchLabel}`);
  }
  lines.push('');

  const appendInnings = (inn: SummaryInningsBlock) => {
    lines.push(
      `*${inn.teamName}: ${inn.hasScore ? inn.scoreLabel : '0/0'}* (${
        inn.hasScore ? `${inn.oversCompact} ov` : 'Yet to bat'
      })`
    );
    if (inn.topBatters.length > 0) {
      inn.topBatters.forEach((b) => {
        lines.push(`• ${b.playerName.toUpperCase()} – ${b.runs}${!b.isOut ? '*' : ''} (${b.balls})`);
      });
    }
    if (inn.topBowlers.length > 0) {
      lines.push(`_Bowling (${inn.bowlingTeamShortName}):_`);
      inn.topBowlers.forEach((bw) => {
        lines.push(
          `• ${bw.playerName.toUpperCase()} – ${bw.wickets}-${bw.runs} (${bw.oversCompact})`
        );
      });
    }
    lines.push('');
  };

  appendInnings(data.innings1);
  appendInnings(data.innings2);

  lines.push(`*RESULT: ${data.resultHeadline}*`);
  lines.push(`— ${data.channelTitle}`);
  return lines.join('\n');
}

export function getWhatsAppShareUrl(data: MatchSummaryData): string {
  const text = buildWhatsAppMatchSummaryText(data);
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

// =============================================================================
// 1920 x 1080 HD BROADCAST PNG EXPORTER (Native HTML5 Canvas — Zero External Deps)
// =============================================================================

function loadImageSafe(url?: string): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = window.setTimeout(() => resolve(null), 4000);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawFlagOrBadge(
  ctx: CanvasRenderingContext2D,
  team: Team | undefined,
  img: HTMLImageElement | null,
  fallbackCode: string,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.save();
  drawRoundedRect(ctx, x, y, w, h, 8);
  ctx.clip();

  const code = (team?.shortName || fallbackCode || 'TM').trim().toUpperCase();

  if (img) {
    const scale = Math.max(w / img.width, h / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  } else if (code === 'IND' || code === 'INDIA') {
    ctx.fillStyle = '#FF9933';
    ctx.fillRect(x, y, w, h / 3);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y + h / 3, w, h / 3);
    ctx.fillStyle = '#138808';
    ctx.fillRect(x, y + (2 * h) / 3, w, h / 3);
    ctx.strokeStyle = '#000080';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, h * 0.13, 0, Math.PI * 2);
    ctx.stroke();
  } else if (code === 'SA' || code === 'RSA') {
    ctx.fillStyle = '#E03C31';
    ctx.fillRect(x, y, w, h / 2);
    ctx.fillStyle = '#001489';
    ctx.fillRect(x, y + h / 2, w, h / 2);
    ctx.fillStyle = '#007749';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w * 0.44, y + h / 2);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.14);
    ctx.lineTo(x + w * 0.3, y + h / 2);
    ctx.lineTo(x, y + h * 0.86);
    ctx.closePath();
    ctx.fill();
  } else {
    const bg = team ? getTeamColorHex(team) : '#1D4ED8';
    const fg = team ? getTeamTextColorHex(team) : '#FFFFFF';
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, bg);
    grad.addColorStop(1, '#091845');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = fg;
    ctx.font = `900 ${Math.round(h * 0.44)}px "Plus Jakarta Sans", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(code.slice(0, 3), x + w / 2, y + h / 2 + 1);
  }

  ctx.restore();
  ctx.save();
  drawRoundedRect(ctx, x, y, w, h, 8);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();
}

function fitCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

export async function renderMatchSummaryToPngBlob(
  data: MatchSummaryData
): Promise<Blob> {
  const W = 1920;
  const H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is not available.');
  }

  const [tourLogo, flag1, flag2] = await Promise.all([
    loadImageSafe(data.tournamentLogoUrl),
    loadImageSafe(data.innings1.battingTeam?.logoUrl),
    loadImageSafe(data.innings2.battingTeam?.logoUrl),
  ]);

  // 1. OUTER BROADCAST BLUE-CYAN STUDIO CANVAS BACKGROUND
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#041240');
  bgGrad.addColorStop(0.45, '#0B2D8A');
  bgGrad.addColorStop(0.8, '#0284C7');
  bgGrad.addColorStop(1, '#062063');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Diagonal broadcast light streaks
  ctx.save();
  ctx.fillStyle = 'rgba(56, 189, 248, 0.10)';
  ctx.beginPath();
  ctx.moveTo(W * 0.62, 0);
  ctx.lineTo(W * 0.84, 0);
  ctx.lineTo(W * 0.64, H);
  ctx.lineTo(W * 0.42, H);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.beginPath();
  ctx.moveTo(W * 0.86, 0);
  ctx.lineTo(W * 0.96, 0);
  ctx.lineTo(W * 0.76, H);
  ctx.lineTo(W * 0.66, H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Main Broadcast Frame Container
  const frameX = 64;
  const frameY = 44;
  const frameW = W - 128;
  const frameH = H - 88;

  ctx.save();
  ctx.shadowColor = 'rgba(2, 8, 30, 0.55)';
  ctx.shadowBlur = 42;
  ctx.shadowOffsetY = 16;
  drawRoundedRect(ctx, frameX, frameY, frameW, frameH, 22);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.restore();

  // Clip everything inside the rounded broadcast frame
  ctx.save();
  drawRoundedRect(ctx, frameX, frameY, frameW, frameH, 22);
  ctx.clip();

  // 2. TOP HEADER: BLUE & CYAN GRADIENT
  const headerH = 166;
  const hdrGrad = ctx.createLinearGradient(frameX, frameY, frameX + frameW, frameY + headerH);
  hdrGrad.addColorStop(0, '#071B5E');
  hdrGrad.addColorStop(0.5, '#0D47B8');
  hdrGrad.addColorStop(1, '#06B6D4');
  ctx.fillStyle = hdrGrad;
  ctx.fillRect(frameX, frameY, frameW, headerH);

  // Subtle cyan accent line under header
  ctx.fillStyle = '#38BDF8';
  ctx.fillRect(frameX, frameY + headerH - 5, frameW, 5);

  // Left: Tournament logo / emblem
  let textStartX = frameX + 46;
  if (tourLogo) {
    const logoSize = 96;
    const logoY = frameY + (headerH - logoSize) / 2;
    ctx.save();
    drawRoundedRect(ctx, textStartX, logoY, logoSize, logoSize, 14);
    ctx.clip();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(textStartX, logoY, logoSize, logoSize);
    ctx.drawImage(tourLogo, textStartX, logoY, logoSize, logoSize);
    ctx.restore();
    textStartX += logoSize + 28;
  } else {
    // Sleek Broadcast Monogram Emblem
    const emblemSize = 86;
    const emblemY = frameY + (headerH - emblemSize) / 2;
    ctx.save();
    drawRoundedRect(ctx, textStartX, emblemY, emblemSize, emblemSize, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(186,230,253,0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 32px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SE', textStartX + emblemSize / 2, emblemY + emblemSize / 2 + 2);
    ctx.restore();
    textStartX += emblemSize + 26;
  }

  // Heading: MATCH SUMMARY + Tournament + Group/Venue
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 54px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('MATCH SUMMARY', textStartX, frameY + 76);

  ctx.fillStyle = '#E0F2FE';
  ctx.font = '800 24px "Plus Jakarta Sans", system-ui, sans-serif';
  const tourTitleFit = fitCanvasText(ctx, data.tournamentName, 940);
  ctx.fillText(tourTitleFit, textStartX, frameY + 114);

  if (data.groupVenueLine) {
    ctx.fillStyle = '#7DD3FC';
    ctx.font = '700 19px "DM Sans", system-ui, sans-serif';
    ctx.fillText(
      fitCanvasText(ctx, `${data.groupVenueLine}  ·  ${data.matchLabel}`, 940),
      textStartX,
      frameY + 144
    );
  }

  // Right side of header: Team Flags + VS + Channel Branding
  const flagW = 94;
  const flagH = 60;
  const flagY = frameY + 38;
  const rightPad = frameX + frameW - 46;
  drawFlagOrBadge(ctx, data.innings2.battingTeam, flag2, 'T2', rightPad - flagW, flagY, flagW, flagH);
  ctx.fillStyle = '#BAE6FD';
  ctx.font = '900 22px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VS', rightPad - flagW - 28, flagY + flagH / 2 + 1);
  drawFlagOrBadge(
    ctx,
    data.innings1.battingTeam,
    flag1,
    'T1',
    rightPad - flagW * 2 - 56,
    flagY,
    flagW,
    flagH
  );

  ctx.fillStyle = '#E0F2FE';
  ctx.font = '800 18px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(data.channelTitle, rightPad, frameY + 136);

  // 3. BODY AREA: TWO CRISP WHITE SCORECARD SECTIONS
  const resultBannerH = 98;
  const bodyY = frameY + headerH;
  const bodyH = frameH - headerH - resultBannerH;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(frameX, bodyY, frameW, bodyH);

  const drawInningsSection = (
    inn: SummaryInningsBlock,
    teamFlagImg: HTMLImageElement | null,
    sectionTopY: number,
    sectionH: number
  ) => {
    const padX = 36;
    const cardX = frameX + padX;
    const cardW = frameW - padX * 2;
    const cardY = sectionTopY + 18;
    const cardH = sectionH - 26;

    // White Scorecard Container
    ctx.save();
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 14);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.clip();

    // Team Header Bar (Broadcast Royal Navy / Blue Strip)
    const stripH = 74;
    const stripGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY);
    stripGrad.addColorStop(0, '#0C246B');
    stripGrad.addColorStop(0.6, '#143FA8');
    stripGrad.addColorStop(1, '#0284C7');
    ctx.fillStyle = stripGrad;
    ctx.fillRect(cardX, cardY, cardW, stripH);

    // Team Flag + Name
    drawFlagOrBadge(ctx, inn.battingTeam, teamFlagImg, `T${inn.inningsIndex + 1}`, cardX + 24, cardY + 15, 68, 44);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 34px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(fitCanvasText(ctx, inn.teamName, 920), cardX + 112, cardY + stripH / 2 + 1);

    // Right side: Overs + Score
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 40px "JetBrains Mono", "Plus Jakarta Sans", monospace';
    const scoreStr = inn.hasScore ? inn.scoreLabel : '0/0';
    ctx.fillText(scoreStr, cardX + cardW - 28, cardY + stripH / 2 + 1);
    const scoreWidth = ctx.measureText(scoreStr).width;

    ctx.fillStyle = '#BAE6FD';
    ctx.font = '800 24px "Plus Jakarta Sans", system-ui, sans-serif';
    const ovStr = inn.hasScore ? `${inn.oversCompact} OVERS` : 'YET TO BAT';
    ctx.fillText(ovStr, cardX + cardW - 28 - scoreWidth - 32, cardY + stripH / 2 + 2);

    // Split Left (Batting) & Right (Bowling)
    const tableTopY = cardY + stripH;
    const tableH = cardH - stripH;
    const midX = cardX + cardW / 2;

    // Vertical Center Divider
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(midX, tableTopY);
    ctx.lineTo(midX, cardY + cardH);
    ctx.stroke();

    const rowCount = 4;
    const rowH = tableH / rowCount;

    // Horizontal Row Separators across both columns
    for (let i = 1; i < rowCount; i++) {
      const ry = tableTopY + rowH * i;
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cardX, ry);
      ctx.lineTo(cardX + cardW, ry);
      ctx.stroke();
    }

    // Left: Top 4 Batters
    if (inn.topBatters.length === 0) {
      ctx.fillStyle = '#64748B';
      ctx.font = '600 24px "DM Sans", system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        inn.hasScore ? 'No batting entries recorded yet.' : 'Innings yet to start.',
        cardX + 32,
        tableTopY + tableH / 2
      );
    } else {
      inn.topBatters.forEach((b, idx) => {
        const cy = tableTopY + rowH * idx + rowH / 2 + 1;
        // Alternate faint row tint
        if (idx % 2 === 1) {
          ctx.fillStyle = '#F8FAFC';
          ctx.fillRect(cardX, tableTopY + rowH * idx, cardW / 2 - 1, rowH);
        }
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#0A1C4E';
        ctx.font = '800 27px "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.fillText(fitCanvasText(ctx, b.playerName.toUpperCase(), cardW / 2 - 260), cardX + 32, cy);

        // Balls in brackets on far right of left pane
        ctx.textAlign = 'right';
        ctx.fillStyle = '#475569';
        ctx.font = '700 24px "JetBrains Mono", monospace';
        const ballsStr = `(${b.balls})`;
        ctx.fillText(ballsStr, midX - 28, cy);
        const ballsW = ctx.measureText(ballsStr).width;

        // Runs + optional * for not out
        ctx.fillStyle = '#0A1C4E';
        ctx.font = '900 30px "JetBrains Mono", monospace';
        const runsStr = `${b.runs}${!b.isOut ? '*' : ''}`;
        ctx.fillText(runsStr, midX - 28 - ballsW - 14, cy);
      });
    }

    // Right: Best 4 Bowlers
    if (inn.topBowlers.length === 0) {
      ctx.fillStyle = '#64748B';
      ctx.font = '600 24px "DM Sans", system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        inn.hasScore ? 'No bowling figures recorded yet.' : 'Bowling yet to begin.',
        midX + 32,
        tableTopY + tableH / 2
      );
    } else {
      inn.topBowlers.forEach((bw, idx) => {
        const cy = tableTopY + rowH * idx + rowH / 2 + 1;
        if (idx % 2 === 1) {
          ctx.fillStyle = '#F8FAFC';
          ctx.fillRect(midX + 1, tableTopY + rowH * idx, cardW / 2 - 1, rowH);
        }
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#0A1C4E';
        ctx.font = '800 27px "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.fillText(
          fitCanvasText(ctx, bw.playerName.toUpperCase(), cardW / 2 - 280),
          midX + 32,
          cy
        );

        // Overs in brackets
        ctx.textAlign = 'right';
        ctx.fillStyle = '#475569';
        ctx.font = '700 24px "JetBrains Mono", monospace';
        const ovText = `(${bw.oversCompact})`;
        ctx.fillText(ovText, cardX + cardW - 28, cy);
        const ovW = ctx.measureText(ovText).width;

        // Wickets-Runs
        ctx.fillStyle = '#0C3194';
        ctx.font = '900 30px "JetBrains Mono", monospace';
        ctx.fillText(`${bw.wickets}-${bw.runs}`, cardX + cardW - 28 - ovW - 14, cy);
      });
    }

    ctx.restore();
  };

  const halfBodyH = bodyH / 2;
  drawInningsSection(data.innings1, flag1, bodyY, halfBodyH);
  drawInningsSection(data.innings2, flag2, bodyY + halfBodyH - 4, halfBodyH);

  // 4. BOTTOM BLUE RESULT BANNER
  const bannerY = frameY + frameH - resultBannerH;
  const resGrad = ctx.createLinearGradient(frameX, bannerY, frameX + frameW, bannerY);
  resGrad.addColorStop(0, '#071B5E');
  resGrad.addColorStop(0.3, '#0F3FA8');
  resGrad.addColorStop(0.5, '#0284C7');
  resGrad.addColorStop(0.7, '#0F3FA8');
  resGrad.addColorStop(1, '#071B5E');
  ctx.fillStyle = resGrad;
  ctx.fillRect(frameX, bannerY, frameW, resultBannerH);

  ctx.fillStyle = '#38BDF8';
  ctx.fillRect(frameX, bannerY, frameW, 4);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 40px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    fitCanvasText(ctx, data.resultHeadline, frameW - 96),
    frameX + frameW / 2,
    bannerY + resultBannerH / 2 + 2
  );

  ctx.restore();

  // Outer Frame Border
  ctx.save();
  drawRoundedRect(ctx, frameX, frameY, frameW, frameH, 22);
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.75)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Could not generate PNG image.'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}

export async function downloadMatchSummaryPng(data: MatchSummaryData): Promise<void> {
  const blob = await renderMatchSummaryToPngBlob(data);
  const url = URL.createObjectURL(blob);
  const slug = `${data.innings1.teamShortName}-vs-${data.innings2.teamShortName}-${data.matchLabel}`
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
  const a = document.createElement('a');
  a.href = url;
  a.download = `match-summary-${slug}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
