import {
  calcRunRate,
  computeBattingCard,
  computeBowlingCard,
  computeOversBreakdown,
  formatOvers,
  getTeamColorHex,
  getTeamTextColorHex,
  type BattingRowStats,
  type BowlingRowStats,
} from '../data/cricketSampleData';
import type {
  BallEvent,
  CricketMatch,
  FallOfWicket,
  InningsState,
  Player,
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

export interface PartnershipRow {
  wicketNumber: number;
  batter1Id: string;
  batter1Name: string;
  batter2Id: string;
  batter2Name: string;
  runs: number;
  balls: number;
  isUnbroken: boolean;
}

export interface OverByOverRow {
  overNumber: number;
  runsInOver: number;
  wicketsInOver: number;
  totalRuns: number;
  totalWickets: number;
  totalScoreLabel: string;
  crr: string;
  balls: BallEvent[];
}

export interface FullInningsReport {
  inningsIndex: 0 | 1;
  battingTeam?: Team;
  bowlingTeam?: Team;
  teamName: string;
  teamShortName: string;
  bowlingTeamName: string;
  bowlingTeamShortName: string;
  runs: number;
  wickets: number;
  legalBalls: number;
  maxOvers: number;
  oversDisplay: string;
  oversCompact: string;
  scoreLabel: string;
  runRate: string;
  hasScore: boolean;
  battingCard: BattingRowStats[];
  didNotBat: Player[];
  bowlingCard: BowlingRowStats[];
  extras: {
    byes: number;
    legByes: number;
    wides: number;
    noBalls: number;
    penalty: number;
    total: number;
  };
  fallOfWickets: FallOfWicket[];
  partnerships: PartnershipRow[];
  overByOver: OverByOverRow[];
  fours: number;
  sixes: number;
  powerplayOvers: number;
  powerplayScore: { runs: number; wickets: number } | null;
}

export interface PlayerOfMatchSummary {
  playerId: string;
  playerName: string;
  teamName: string;
  teamShortName: string;
  runs: number;
  balls: number;
  batted: boolean;
  isOut: boolean;
  wickets: number;
  runsConceded: number;
  bowlingOvers: string;
  bowled: boolean;
  bowlingFigures: string;
  performanceSummary: string;
}

export interface MatchStatisticsSummary {
  highestIndividualScore: {
    playerName: string;
    teamShortName: string;
    runs: number;
    balls: number;
    isOut: boolean;
  } | null;
  bestBowlingFigures: {
    playerName: string;
    teamShortName: string;
    wickets: number;
    runs: number;
    overs: string;
  } | null;
  totalSixes: number;
  totalFours: number;
  totalBoundaries: number;
  highestPartnership: {
    runs: number;
    balls: number;
    batter1Name: string;
    batter2Name: string;
    teamShortName: string;
  } | null;
  totalRuns: number;
  totalWickets: number;
  powerplayOvers: number;
  powerplayInn1: { teamShortName: string; runs: number; wickets: number } | null;
  powerplayInn2: { teamShortName: string; runs: number; wickets: number } | null;
}

export interface FullMatchReport {
  summary: MatchSummaryData;
  matchFormat: string;
  tossWinnerName: string;
  tossDecisionLabel: string;
  teamAName: string;
  teamBName: string;
  innings1: FullInningsReport;
  innings2: FullInningsReport;
  statistics: MatchStatisticsSummary;
  playerOfMatch: PlayerOfMatchSummary | null;
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

  // Preserve explicit special outcomes (No Result, Drawn, Super Over, DLS, Abandoned)
  if (
    rawUpper.includes('NO RESULT') ||
    rawUpper.includes('DRAWN') ||
    rawUpper.includes('DRAW') ||
    rawUpper.includes('SUPER OVER') ||
    rawUpper.includes('DLS') ||
    rawUpper.includes('D/L') ||
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

// =============================================================================
// COMPLETE BALL-BY-BALL FULL MATCH REPORT ENGINE (ALL 13 SECTIONS)
// =============================================================================

function getPowerplayOversCount(maxOvers: number): number {
  if (maxOvers <= 4) return 1;
  if (maxOvers <= 6) return 2;
  if (maxOvers <= 10) return 3;
  if (maxOvers <= 25) return 6;
  return 10;
}

function deriveFallOfWickets(
  inn: InningsState,
  battingTeam: Team | undefined
): FallOfWicket[] {
  if (Array.isArray(inn.fallOfWickets) && inn.fallOfWickets.length > 0) {
    return inn.fallOfWickets;
  }
  const playerMap = new Map<string, string>();
  battingTeam?.players.forEach((p) => playerMap.set(p.id, p.name));

  const out: FallOfWicket[] = [];
  let cumRuns = 0;
  let cumWickets = 0;
  let cumLegal = 0;
  for (const b of inn.balls) {
    cumRuns += b.totalRuns;
    if (b.isLegal) cumLegal += 1;
    if (b.isWicket && b.wicketType !== 'Retired Hurt') {
      cumWickets += 1;
      const pid = b.dismissedPlayerId || b.strikerId;
      out.push({
        wicketNumber: cumWickets,
        scoreAtFall: cumRuns,
        oversAtFall: formatOvers(cumLegal),
        playerId: pid,
        playerName: playerMap.get(pid) || 'Batter',
        wicketType: b.wicketType || 'Bowled',
      });
    }
  }
  return out;
}

function computePartnershipsFromBalls(
  inn: InningsState,
  battingTeam: Team | undefined
): PartnershipRow[] {
  if (inn.balls.length === 0) return [];
  const playerMap = new Map<string, string>();
  battingTeam?.players.forEach((p) => playerMap.set(p.id, p.name));

  const rows: PartnershipRow[] = [];
  let wicketNumber = 1;
  let currentRuns = 0;
  let currentBalls = 0;
  let b1 = inn.balls[0]?.strikerId || inn.strikerId || '';
  let b2 = inn.balls[0]?.nonStrikerId || inn.nonStrikerId || '';
  let hasActivity = false;

  for (const ball of inn.balls) {
    if (!b1 && ball.strikerId) b1 = ball.strikerId;
    if (!b2 && ball.nonStrikerId) b2 = ball.nonStrikerId;
    if (b1 && b2 && b1 === b2 && ball.nonStrikerId && ball.nonStrikerId !== b1) {
      b2 = ball.nonStrikerId;
    }

    currentRuns += ball.totalRuns;
    if (ball.isLegal) currentBalls += 1;
    hasActivity = true;

    if (ball.isWicket && ball.wicketType !== 'Retired Hurt') {
      const p1Id = ball.strikerId || b1;
      const p2Id = ball.nonStrikerId || b2;
      rows.push({
        wicketNumber,
        batter1Id: p1Id,
        batter1Name: playerMap.get(p1Id) || 'Batter 1',
        batter2Id: p2Id,
        batter2Name: playerMap.get(p2Id) || 'Batter 2',
        runs: currentRuns,
        balls: currentBalls,
        isUnbroken: false,
      });
      wicketNumber += 1;
      currentRuns = 0;
      currentBalls = 0;
      b1 = '';
      b2 = '';
      hasActivity = false;
    }
  }

  if (hasActivity) {
    const p1Id = b1 || inn.strikerId;
    const p2Id = b2 || inn.nonStrikerId;
    rows.push({
      wicketNumber,
      batter1Id: p1Id,
      batter1Name: playerMap.get(p1Id) || 'Batter 1',
      batter2Id: p2Id,
      batter2Name: playerMap.get(p2Id) || 'Batter 2',
      runs: currentRuns,
      balls: currentBalls,
      isUnbroken: true,
    });
  }

  return rows;
}

function computeFullOverByOver(inn: InningsState): OverByOverRow[] {
  const breakdown = computeOversBreakdown(inn);
  if (breakdown.length === 0) return [];
  const rows: OverByOverRow[] = [];
  let cumRuns = 0;
  let cumWickets = 0;
  let cumLegalBalls = 0;

  for (const ov of breakdown) {
    cumRuns += ov.runsInOver;
    cumWickets += ov.wicketsInOver;
    const legalInOver = ov.balls.filter((b) => b.isLegal).length;
    cumLegalBalls += legalInOver;
    rows.push({
      overNumber: ov.overNumber,
      runsInOver: ov.runsInOver,
      wicketsInOver: ov.wicketsInOver,
      totalRuns: cumRuns,
      totalWickets: cumWickets,
      totalScoreLabel: `${cumRuns}/${cumWickets}`,
      crr: calcRunRate(cumRuns, cumLegalBalls),
      balls: ov.balls,
    });
  }
  return rows;
}

function computePowerplayScore(
  inn: InningsState,
  ppOvers: number
): { runs: number; wickets: number } | null {
  if (inn.balls.length === 0 || ppOvers <= 0) return null;
  let runs = 0;
  let wickets = 0;
  let hasBallInPp = false;
  for (const b of inn.balls) {
    if (b.over < ppOvers) {
      hasBallInPp = true;
      runs += b.totalRuns;
      if (b.isWicket && b.wicketType !== 'Retired Hurt') {
        wickets += 1;
      }
    }
  }
  return hasBallInPp ? { runs, wickets } : null;
}

function buildFullInningsReport(
  match: CricketMatch,
  inn: InningsState,
  inningsIndex: 0 | 1,
  teamMap: Map<string, Team>
): FullInningsReport {
  const battingTeam = teamMap.get(inn.battingTeamId);
  const bowlingTeam = teamMap.get(inn.bowlingTeamId);

  const battingCard = computeBattingCard(inn, battingTeam);
  const bowlingCard = computeBowlingCard(inn, bowlingTeam).filter(
    (bw) => bw.legalBalls > 0 || bw.runs > 0 || bw.wickets > 0 || bw.wides > 0 || bw.noBalls > 0
  );

  const battedIds = new Set(battingCard.map((b) => b.playerId));
  const xiIds =
    (inn.battingTeamId === match.team1Id ? match.playingXI1 : match.playingXI2) ?? [];
  const squadPool =
    battingTeam?.players.filter((p) =>
      xiIds.length > 0 ? xiIds.includes(p.id) : true
    ) ?? [];
  const didNotBat = squadPool.filter((p) => !battedIds.has(p.id));

  const extrasObj = inn.extras ?? { bye: 0, lb: 0, wd: 0, nb: 0, penalty: 0 };
  const extrasTotal =
    (extrasObj.bye || 0) +
    (extrasObj.lb || 0) +
    (extrasObj.wd || 0) +
    (extrasObj.nb || 0) +
    (extrasObj.penalty || 0);

  const fours = battingCard.reduce((acc, b) => acc + b.fours, 0);
  const sixes = battingCard.reduce((acc, b) => acc + b.sixes, 0);
  const ppOvers = getPowerplayOversCount(inn.maxOvers || match.oversPerInnings || 20);
  const hasScore =
    inn.balls.length > 0 || inn.runs > 0 || inn.wickets > 0 || inn.completed;

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
    bowlingTeamName: (bowlingTeam?.name || 'BOWLING TEAM').toUpperCase(),
    bowlingTeamShortName: (
      bowlingTeam?.shortName ||
      bowlingTeam?.name?.slice(0, 3) ||
      'BWL'
    ).toUpperCase(),
    runs: inn.runs,
    wickets: inn.wickets,
    legalBalls: inn.legalBalls,
    maxOvers: inn.maxOvers,
    oversDisplay: formatOvers(inn.legalBalls),
    oversCompact: formatBroadcastOvers(inn.legalBalls),
    scoreLabel: formatBroadcastTeamScore(inn.runs, inn.wickets),
    runRate: calcRunRate(inn.runs, inn.legalBalls),
    hasScore,
    battingCard,
    didNotBat,
    bowlingCard,
    extras: {
      byes: extrasObj.bye || 0,
      legByes: extrasObj.lb || 0,
      wides: extrasObj.wd || 0,
      noBalls: extrasObj.nb || 0,
      penalty: extrasObj.penalty || 0,
      total: extrasTotal,
    },
    fallOfWickets: deriveFallOfWickets(inn, battingTeam),
    partnerships: computePartnershipsFromBalls(inn, battingTeam),
    overByOver: computeFullOverByOver(inn),
    fours,
    sixes,
    powerplayOvers: ppOvers,
    powerplayScore: computePowerplayScore(inn, ppOvers),
  };
}

export function computeFullMatchReport(
  match: CricketMatch,
  tournament: Tournament | undefined,
  group: TournamentGroup | undefined,
  teamMap: Map<string, Team>,
  channelTitle = 'STAR EVENT LIVE'
): FullMatchReport {
  const summary = extractMatchSummaryData(match, tournament, group, teamMap, channelTitle);
  const innings1 = buildFullInningsReport(match, match.innings[0], 0, teamMap);
  const innings2 = buildFullInningsReport(match, match.innings[1], 1, teamMap);

  // Match Statistics across both innings
  const allBatters = [
    ...innings1.battingCard.map((b) => ({
      ...b,
      teamShortName: innings1.teamShortName,
    })),
    ...innings2.battingCard.map((b) => ({
      ...b,
      teamShortName: innings2.teamShortName,
    })),
  ].filter((b) => b.balls > 0 || b.runs > 0);

  allBatters.sort((a, b) => b.runs - a.runs || a.balls - b.balls);
  const topBatter = allBatters[0] ?? null;

  const allBowlers = [
    ...innings1.bowlingCard.map((bw) => ({
      ...bw,
      teamShortName: innings1.bowlingTeamShortName,
    })),
    ...innings2.bowlingCard.map((bw) => ({
      ...bw,
      teamShortName: innings2.bowlingTeamShortName,
    })),
  ].filter((bw) => bw.legalBalls > 0 || bw.wickets > 0 || bw.runs > 0);

  allBowlers.sort(
    (a, b) => b.wickets - a.wickets || a.runs - b.runs || b.legalBalls - a.legalBalls
  );
  const bestBowler = allBowlers[0] ?? null;

  const allPartnerships = [
    ...innings1.partnerships.map((p) => ({
      ...p,
      teamShortName: innings1.teamShortName,
    })),
    ...innings2.partnerships.map((p) => ({
      ...p,
      teamShortName: innings2.teamShortName,
    })),
  ];
  allPartnerships.sort((a, b) => b.runs - a.runs || a.balls - b.balls);
  const bestPartnership = allPartnerships[0] ?? null;

  const totalFours = innings1.fours + innings2.fours;
  const totalSixes = innings1.sixes + innings2.sixes;
  const ppOvers = getPowerplayOversCount(match.oversPerInnings || innings1.maxOvers || 20);

  const statistics: MatchStatisticsSummary = {
    highestIndividualScore: topBatter
      ? {
          playerName: topBatter.playerName,
          teamShortName: topBatter.teamShortName,
          runs: topBatter.runs,
          balls: topBatter.balls,
          isOut: topBatter.isOut,
        }
      : null,
    bestBowlingFigures: bestBowler
      ? {
          playerName: bestBowler.playerName,
          teamShortName: bestBowler.teamShortName,
          wickets: bestBowler.wickets,
          runs: bestBowler.runs,
          overs: formatBroadcastOvers(bestBowler.legalBalls),
        }
      : null,
    totalSixes,
    totalFours,
    totalBoundaries: totalFours + totalSixes,
    highestPartnership: bestPartnership
      ? {
          runs: bestPartnership.runs,
          balls: bestPartnership.balls,
          batter1Name: bestPartnership.batter1Name,
          batter2Name: bestPartnership.batter2Name,
          teamShortName: bestPartnership.teamShortName,
        }
      : null,
    totalRuns: innings1.runs + innings2.runs,
    totalWickets: innings1.wickets + innings2.wickets,
    powerplayOvers: ppOvers,
    powerplayInn1: innings1.powerplayScore
      ? { teamShortName: innings1.teamShortName, ...innings1.powerplayScore }
      : null,
    powerplayInn2: innings2.powerplayScore
      ? { teamShortName: innings2.teamShortName, ...innings2.powerplayScore }
      : null,
  };

  // Player of the Match performance aggregation
  let playerOfMatch: PlayerOfMatchSummary | null = null;
  if (match.playerOfMatchId) {
    const t1 = teamMap.get(match.team1Id);
    const t2 = teamMap.get(match.team2Id);
    const p1 = t1?.players.find((p) => p.id === match.playerOfMatchId);
    const p2 = t2?.players.find((p) => p.id === match.playerOfMatchId);
    const player = p1 || p2;
    const team = p1 ? t1 : t2;
    if (player) {
      const batRow =
        innings1.battingCard.find((b) => b.playerId === player.id) ||
        innings2.battingCard.find((b) => b.playerId === player.id);
      const bowlRow =
        innings1.bowlingCard.find((bw) => bw.playerId === player.id) ||
        innings2.bowlingCard.find((bw) => bw.playerId === player.id);

      const batted = Boolean(batRow && (batRow.balls > 0 || batRow.runs > 0 || batRow.isOut));
      const bowled = Boolean(bowlRow && (bowlRow.legalBalls > 0 || bowlRow.wickets > 0));
      const runs = batRow?.runs ?? 0;
      const balls = batRow?.balls ?? 0;
      const isOut = batRow?.isOut ?? false;
      const wickets = bowlRow?.wickets ?? 0;
      const runsConceded = bowlRow?.runs ?? 0;
      const bowlingOvers = bowlRow ? formatBroadcastOvers(bowlRow.legalBalls) : '0';
      const bowlingFigures = bowled ? `${wickets}-${runsConceded} (${bowlingOvers})` : '—';

      const perfParts: string[] = [];
      if (batted) perfParts.push(`${runs}${!isOut ? '*' : ''} (${balls}b)`);
      if (bowled) perfParts.push(`${wickets}/${runsConceded} (${bowlingOvers} ov)`);

      playerOfMatch = {
        playerId: player.id,
        playerName: player.name,
        teamName: team?.name || 'Team',
        teamShortName: team?.shortName || 'TM',
        runs,
        balls,
        batted,
        isOut,
        wickets,
        runsConceded,
        bowlingOvers,
        bowled,
        bowlingFigures,
        performanceSummary: perfParts.length > 0 ? perfParts.join('  &  ') : 'Match Impact Player',
      };
    }
  }

  const tossWinner = teamMap.get(match.tossWinnerId);
  const teamA = teamMap.get(match.team1Id);
  const teamB = teamMap.get(match.team2Id);
  const formatLabel =
    tournament?.matchFormat ||
    (match.oversPerInnings === 10
      ? 'T10'
      : match.oversPerInnings === 20
        ? 'T20'
        : match.oversPerInnings === 50
          ? 'ODI'
          : `${match.oversPerInnings} Overs`);

  return {
    summary,
    matchFormat: formatLabel,
    tossWinnerName: tossWinner?.name || 'Not Recorded',
    tossDecisionLabel:
      match.tossDecision === 'Bat' ? 'Batting' : match.tossDecision === 'Bowl' ? 'Bowling' : '—',
    teamAName: teamA?.name || 'Team A',
    teamBName: teamB?.name || 'Team B',
    innings1,
    innings2,
    statistics,
    playerOfMatch,
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
// 1920 x 1080 HD BROADCAST PNG & MULTI-PAGE PDF EXPORTER (Zero External Deps)
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

async function renderBroadcastSummaryCanvas(
  data: MatchSummaryData
): Promise<HTMLCanvasElement> {
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

  ctx.fillStyle = '#38BDF8';
  ctx.fillRect(frameX, frameY + headerH - 5, frameW, 5);

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

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 54px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('MATCH SUMMARY', textStartX, frameY + 76);

  ctx.fillStyle = '#E0F2FE';
  ctx.font = '800 24px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(fitCanvasText(ctx, data.tournamentName, 940), textStartX, frameY + 114);

  if (data.groupVenueLine) {
    ctx.fillStyle = '#7DD3FC';
    ctx.font = '700 19px "DM Sans", system-ui, sans-serif';
    ctx.fillText(
      fitCanvasText(ctx, `${data.groupVenueLine}  ·  ${data.matchLabel}`, 940),
      textStartX,
      frameY + 144
    );
  }

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

    ctx.save();
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 14);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.clip();

    const stripH = 74;
    const stripGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY);
    stripGrad.addColorStop(0, '#0C246B');
    stripGrad.addColorStop(0.6, '#143FA8');
    stripGrad.addColorStop(1, '#0284C7');
    ctx.fillStyle = stripGrad;
    ctx.fillRect(cardX, cardY, cardW, stripH);

    drawFlagOrBadge(ctx, inn.battingTeam, teamFlagImg, `T${inn.inningsIndex + 1}`, cardX + 24, cardY + 15, 68, 44);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 34px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(fitCanvasText(ctx, inn.teamName, 920), cardX + 112, cardY + stripH / 2 + 1);

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

    const tableTopY = cardY + stripH;
    const tableH = cardH - stripH;
    const midX = cardX + cardW / 2;

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(midX, tableTopY);
    ctx.lineTo(midX, cardY + cardH);
    ctx.stroke();

    const rowCount = 4;
    const rowH = tableH / rowCount;

    for (let i = 1; i < rowCount; i++) {
      const ry = tableTopY + rowH * i;
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cardX, ry);
      ctx.lineTo(cardX + cardW, ry);
      ctx.stroke();
    }

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
        if (idx % 2 === 1) {
          ctx.fillStyle = '#F8FAFC';
          ctx.fillRect(cardX, tableTopY + rowH * idx, cardW / 2 - 1, rowH);
        }
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#0A1C4E';
        ctx.font = '800 27px "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.fillText(fitCanvasText(ctx, b.playerName.toUpperCase(), cardW / 2 - 260), cardX + 32, cy);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#475569';
        ctx.font = '700 24px "JetBrains Mono", monospace';
        const ballsStr = `(${b.balls})`;
        ctx.fillText(ballsStr, midX - 28, cy);
        const ballsW = ctx.measureText(ballsStr).width;

        ctx.fillStyle = '#0A1C4E';
        ctx.font = '900 30px "JetBrains Mono", monospace';
        const runsStr = `${b.runs}${!b.isOut ? '*' : ''}`;
        ctx.fillText(runsStr, midX - 28 - ballsW - 14, cy);
      });
    }

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

        ctx.textAlign = 'right';
        ctx.fillStyle = '#475569';
        ctx.font = '700 24px "JetBrains Mono", monospace';
        const ovText = `(${bw.oversCompact})`;
        ctx.fillText(ovText, cardX + cardW - 28, cy);
        const ovW = ctx.measureText(ovText).width;

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

  ctx.save();
  drawRoundedRect(ctx, frameX, frameY, frameW, frameH, 22);
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.75)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  return canvas;
}

function renderDetailedScorecardPageCanvas(
  report: FullMatchReport,
  inn: FullInningsReport
): HTMLCanvasElement {
  const W = 1920;
  const H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, W, H);

  // Header Strip
  const hdrGrad = ctx.createLinearGradient(0, 0, W, 110);
  hdrGrad.addColorStop(0, '#071B5E');
  hdrGrad.addColorStop(0.6, '#0E3CA8');
  hdrGrad.addColorStop(1, '#0284C7');
  ctx.fillStyle = hdrGrad;
  ctx.fillRect(0, 0, W, 112);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 34px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    `${inn.inningsIndex === 0 ? '1ST INNINGS' : '2ND INNINGS'} SCORECARD — ${inn.teamName}`,
    48,
    46
  );

  ctx.fillStyle = '#BAE6FD';
  ctx.font = '700 20px "DM Sans", system-ui, sans-serif';
  ctx.fillText(
    `${report.summary.tournamentName}  ·  ${report.summary.matchLabel}  ·  ${report.summary.dateLabel}`,
    48,
    84
  );

  ctx.textAlign = 'right';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 42px "JetBrains Mono", monospace';
  ctx.fillText(`${inn.scoreLabel} (${inn.oversDisplay} OV)`, W - 48, 50);
  ctx.fillStyle = '#BAE6FD';
  ctx.font = '700 18px "JetBrains Mono", monospace';
  ctx.fillText(`RUN RATE: ${inn.runRate}`, W - 48, 86);

  // Left: Batting Table (1080px wide)
  const batX = 48;
  const batY = 136;
  const batW = 1080;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(batX, batY, batW, 690);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.strokeRect(batX, batY, batW, 690);

  ctx.fillStyle = '#0C246B';
  ctx.fillRect(batX, batY, batW, 46);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 18px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('BATSMAN', batX + 18, batY + 24);
  ctx.fillText('HOW OUT', batX + 340, batY + 24);
  ctx.textAlign = 'right';
  ctx.fillText('R', batX + 710, batY + 24);
  ctx.fillText('B', batX + 785, batY + 24);
  ctx.fillText('4s', batX + 860, batY + 24);
  ctx.fillText('6s', batX + 935, batY + 24);
  ctx.fillText('SR', batX + batW - 18, batY + 24);

  const visibleBat = inn.battingCard.slice(0, 11);
  visibleBat.forEach((b, idx) => {
    const ry = batY + 46 + idx * 46;
    if (idx % 2 === 1) {
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(batX + 1, ry, batW - 2, 46);
    }
    ctx.strokeStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.moveTo(batX, ry + 46);
    ctx.lineTo(batX + batW, ry + 46);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#0A1C4E';
    ctx.font = '800 20px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(
      fitCanvasText(ctx, `${b.playerName.toUpperCase()}${!b.isOut ? ' *' : ''}`, 305),
      batX + 18,
      ry + 24
    );
    ctx.fillStyle = '#475569';
    ctx.font = '600 17px "DM Sans", system-ui, sans-serif';
    ctx.fillText(fitCanvasText(ctx, b.dismissalText, 300), batX + 340, ry + 24);

    ctx.textAlign = 'right';
    ctx.font = '800 20px "JetBrains Mono", monospace';
    ctx.fillStyle = '#0A1C4E';
    ctx.fillText(String(b.runs), batX + 710, ry + 24);
    ctx.fillStyle = '#334155';
    ctx.font = '600 19px "JetBrains Mono", monospace';
    ctx.fillText(String(b.balls), batX + 785, ry + 24);
    ctx.fillText(String(b.fours), batX + 860, ry + 24);
    ctx.fillText(String(b.sixes), batX + 935, ry + 24);
    ctx.fillText(b.sr, batX + batW - 18, ry + 24);
  });

  // Extras & Total footer inside batting card
  const footerY = batY + 572;
  ctx.fillStyle = '#EFF6FF';
  ctx.fillRect(batX + 1, footerY, batW - 2, 54);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0A1C4E';
  ctx.font = '800 19px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(
    `EXTRAS: ${inn.extras.total}  (B ${inn.extras.byes}, LB ${inn.extras.legByes}, WD ${inn.extras.wides}, NB ${inn.extras.noBalls}, P ${inn.extras.penalty})`,
    batX + 18,
    footerY + 28
  );

  ctx.fillStyle = '#0C246B';
  ctx.fillRect(batX + 1, footerY + 54, batW - 2, 62);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 24px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(
    `TOTAL: ${inn.scoreLabel}  (${inn.oversDisplay} OVERS, RR ${inn.runRate})`,
    batX + 18,
    footerY + 86
  );

  // Right: Bowling Table + Fall of Wickets + Partnerships
  const rightX = batX + batW + 32;
  const rightW = W - rightX - 48;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(rightX, batY, rightW, 400);
  ctx.strokeStyle = '#CBD5E1';
  ctx.strokeRect(rightX, batY, rightW, 400);

  ctx.fillStyle = '#0C246B';
  ctx.fillRect(rightX, batY, rightW, 46);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 18px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`BOWLING (${inn.bowlingTeamShortName})`, rightX + 16, batY + 24);
  ctx.textAlign = 'right';
  ctx.fillText('O', rightX + 345, batY + 24);
  ctx.fillText('M', rightX + 405, batY + 24);
  ctx.fillText('R', rightX + 470, batY + 24);
  ctx.fillText('W', rightX + 530, batY + 24);
  ctx.fillText('ECO', rightX + 615, batY + 24);
  ctx.fillText('WD/NB', rightX + rightW - 14, batY + 24);

  inn.bowlingCard.slice(0, 7).forEach((bw, idx) => {
    const ry = batY + 46 + idx * 48;
    if (idx % 2 === 1) {
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(rightX + 1, ry, rightW - 2, 48);
    }
    ctx.strokeStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.moveTo(rightX, ry + 48);
    ctx.lineTo(rightX + rightW, ry + 48);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#0A1C4E';
    ctx.font = '800 19px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(fitCanvasText(ctx, bw.playerName.toUpperCase(), 265), rightX + 16, ry + 25);

    ctx.textAlign = 'right';
    ctx.font = '600 18px "JetBrains Mono", monospace';
    ctx.fillStyle = '#334155';
    ctx.fillText(bw.overs, rightX + 345, ry + 25);
    ctx.fillText(String(bw.maidens), rightX + 405, ry + 25);
    ctx.fillText(String(bw.runs), rightX + 470, ry + 25);
    ctx.fillStyle = '#0D47B8';
    ctx.font = '900 20px "JetBrains Mono", monospace';
    ctx.fillText(String(bw.wickets), rightX + 530, ry + 25);
    ctx.fillStyle = '#334155';
    ctx.font = '600 18px "JetBrains Mono", monospace';
    ctx.fillText(bw.economy, rightX + 615, ry + 25);
    ctx.fillText(`${bw.wides}/${bw.noBalls}`, rightX + rightW - 14, ry + 25);
  });

  // Fall of Wickets box
  const fowY = batY + 422;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(rightX, fowY, rightW, 268);
  ctx.strokeStyle = '#CBD5E1';
  ctx.strokeRect(rightX, fowY, rightW, 268);

  ctx.fillStyle = '#0284C7';
  ctx.fillRect(rightX, fowY, rightW, 42);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 18px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('FALL OF WICKETS', rightX + 16, fowY + 22);

  ctx.fillStyle = '#0A1C4E';
  ctx.font = '700 18px "DM Sans", system-ui, sans-serif';
  if (inn.fallOfWickets.length === 0) {
    ctx.fillStyle = '#64748B';
    ctx.fillText('No wickets fell in this innings.', rightX + 16, fowY + 80);
  } else {
    inn.fallOfWickets.slice(0, 10).forEach((f, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const fx = rightX + 16 + col * (rightW / 2 - 8);
      const fy = fowY + 72 + row * 38;
      ctx.fillStyle = '#0A1C4E';
      ctx.fillText(
        fitCanvasText(
          ctx,
          `${f.wicketNumber}-${f.scoreAtFall} (${f.playerName}, ${f.oversAtFall})`,
          rightW / 2 - 24
        ),
        fx,
        fy
      );
    });
  }

  // Bottom Banner: Result + POM
  const bottomY = 856;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(48, bottomY, W - 96, 176);
  ctx.strokeStyle = '#CBD5E1';
  ctx.strokeRect(48, bottomY, W - 96, 176);

  ctx.fillStyle = '#0C246B';
  ctx.fillRect(48, bottomY, W - 96, 46);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 20px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('MATCH RESULT & HIGHLIGHTS', 68, bottomY + 24);

  ctx.fillStyle = '#0D47B8';
  ctx.font = '900 30px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(report.summary.resultHeadline, 68, bottomY + 92);

  ctx.fillStyle = '#334155';
  ctx.font = '700 20px "DM Sans", system-ui, sans-serif';
  const pomLine = report.playerOfMatch
    ? `Player of the Match: ${report.playerOfMatch.playerName} (${report.playerOfMatch.teamShortName}) — ${report.playerOfMatch.performanceSummary}`
    : `Toss: ${report.tossWinnerName} elected to ${report.tossDecisionLabel}  ·  Format: ${report.matchFormat}`;
  ctx.fillText(fitCanvasText(ctx, pomLine, W - 140), 68, bottomY + 138);

  return canvas;
}

/**
 * Pure TypeScript PDF 1.4 multi-page JPEG builder (zero dependencies).
 * Bundles 16:9 landscape Canvas renders into a crisp downloadable .pdf file.
 */
function buildPdfBlobFromJpegPages(jpegBytesList: Uint8Array[], widthPx: number, heightPx: number): Blob {
  // Landscape A4-ish 16:9 points: 842 x 473.625 pt
  const pageW = 842;
  const pageH = Math.round((pageW * heightPx) / widthPx * 100) / 100;

  const chunks: Uint8Array[] = [];
  const encoder = new TextEncoder();
  const offsets: number[] = [0]; // object 0
  let totalLen = 0;

  const pushStr = (s: string) => {
    const b = encoder.encode(s);
    chunks.push(b);
    totalLen += b.length;
  };
  const pushBytes = (b: Uint8Array) => {
    chunks.push(b);
    totalLen += b.length;
  };

  pushStr('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  // Object layout:
  // 1: Catalog
  // 2: Pages
  // For each page i (0..n-1):
  //   pageObj = 3 + i*3
  //   imgObj  = 4 + i*3
  //   cntObj  = 5 + i*3
  const n = jpegBytesList.length;
  const pageIds: number[] = [];
  for (let i = 0; i < n; i++) pageIds.push(3 + i * 3);

  const startObj = (id: number) => {
    offsets[id] = totalLen;
    pushStr(`${id} 0 obj\n`);
  };

  startObj(1);
  pushStr('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  startObj(2);
  pushStr(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${n} >>\nendobj\n`);

  for (let i = 0; i < n; i++) {
    const pageId = 3 + i * 3;
    const imgId = 4 + i * 3;
    const cntId = 5 + i * 3;
    const imgBytes = jpegBytesList[i];
    const contentStream = `q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ\n`;
    const contentBytes = encoder.encode(contentStream);

    startObj(pageId);
    pushStr(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 ${imgId} 0 R >> >> /Contents ${cntId} 0 R >>\nendobj\n`
    );

    startObj(imgId);
    pushStr(
      `<< /Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.length} >>\nstream\n`
    );
    pushBytes(imgBytes);
    pushStr('\nendstream\nendobj\n');

    startObj(cntId);
    pushStr(`<< /Length ${contentBytes.length} >>\nstream\n`);
    pushBytes(contentBytes);
    pushStr('endstream\nendobj\n');
  }

  const xrefOffset = totalLen;
  const totalObjs = 2 + n * 3;
  pushStr(`xref\n0 ${totalObjs + 1}\n`);
  pushStr('0000000000 65535 f \n');
  for (let id = 1; id <= totalObjs; id++) {
    pushStr(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  }
  pushStr(`trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const merged = new Uint8Array(totalLen);
  let pos = 0;
  for (const c of chunks) {
    merged.set(c, pos);
    pos += c.length;
  }
  return new Blob([merged], { type: 'application/pdf' });
}

function canvasToJpegBytes(canvas: HTMLCanvasElement, quality = 0.92): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(new Error('Could not encode JPEG page.'));
          return;
        }
        const buf = await blob.arrayBuffer();
        resolve(new Uint8Array(buf));
      },
      'image/jpeg',
      quality
    );
  });
}

export async function renderMatchSummaryToPngBlob(
  data: MatchSummaryData
): Promise<Blob> {
  const canvas = await renderBroadcastSummaryCanvas(data);
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

export async function downloadMatchSummaryPdf(report: FullMatchReport): Promise<void> {
  const page1Canvas = await renderBroadcastSummaryCanvas(report.summary);
  const page2Canvas = renderDetailedScorecardPageCanvas(report, report.innings1);
  const page3Canvas = renderDetailedScorecardPageCanvas(report, report.innings2);

  const [jpg1, jpg2, jpg3] = await Promise.all([
    canvasToJpegBytes(page1Canvas, 0.93),
    canvasToJpegBytes(page2Canvas, 0.92),
    canvasToJpegBytes(page3Canvas, 0.92),
  ]);

  const pdfBlob = buildPdfBlobFromJpegPages([jpg1, jpg2, jpg3], 1920, 1080);
  const url = URL.createObjectURL(pdfBlob);
  const slug = `${report.summary.innings1.teamShortName}-vs-${report.summary.innings2.teamShortName}-${report.summary.matchLabel}`
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
  const a = document.createElement('a');
  a.href = url;
  a.download = `match-summary-${slug}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
