import {
  CricketFlagId,
  formatCricketOvers,
  UserCricketScoreboardDoc,
} from '../types/overlay';

export type DismissalType =
  | 'bowled'
  | 'caught'
  | 'lbw'
  | 'run_out'
  | 'stumped'
  | 'hit_wicket'
  | 'retired_out'
  | 'obstructing_field';

export type ExtraType = 'wide' | 'noball' | 'bye' | 'legbye' | 'penalty';

export type DeliveryLegality = 'legal' | 'wide' | 'noball';

export type CricketMatchPhase = 'live' | 'innings_break' | 'super_over_break' | 'completed';

export interface CricketSquadPlayer {
  id: string;
  name: string;
}

export interface CricketTeamConfig {
  id: string;
  name: string;
  code: string;
  flagId: CricketFlagId;
  logoUrl: string;
  players: CricketSquadPlayer[];
}

export interface BatterInningsStat {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  out: boolean;
  dismissalText: string;
  battedOrder: number;
}

export interface BowlerInningsStat {
  playerId: string;
  name: string;
  balls: number;
  maidens: number;
  runs: number;
  wickets: number;
  wides: number;
  noBalls: number;
}

export interface FallOfWicket {
  wicketNumber: number;
  score: number;
  overs: string;
  batterName: string;
  dismissalText: string;
}

export interface ExtrasBreakdown {
  wide: number;
  noball: number;
  bye: number;
  legbye: number;
  penalty: number;
  total: number;
}

export interface BallEvent {
  id: string;
  inningsNumber: number;
  overNumber: number;
  ballInOver: number;
  notation: string;
  runsTotal: number;
  runsOffBat: number;
  extraType?: ExtraType;
  extraRuns: number;
  isLegalBall: boolean;
  isWicket: boolean;
  dismissalType?: DismissalType;
  dismissedBatterName?: string;
  strikerName: string;
  bowlerName: string;
  teamScoreAfter: number;
  wicketsAfter: number;
  oversAfter: string;
  timestamp: number;
}

export interface InningsState {
  inningsNumber: number; // 1, 2, 3 (SO 1), 4 (SO 2)
  isSuperOver: boolean;
  battingTeamIndex: 0 | 1;
  bowlingTeamIndex: 0 | 1;
  runs: number;
  wickets: number;
  legalBalls: number;
  maxOvers: number;
  maxWickets: number;
  target: number | null;
  extras: ExtrasBreakdown;
  batters: BatterInningsStat[];
  bowlers: BowlerInningsStat[];
  strikerId: string | null;
  nonStrikerId: string | null;
  currentBowlerId: string | null;
  lastCompletedOverBowlerId: string | null;
  currentOverBalls: string[];
  currentOverBowlerRuns: number;
  currentOverLegalBalls: number;
  partnershipRuns: number;
  partnershipBalls: number;
  fallOfWickets: FallOfWicket[];
  ballHistory: BallEvent[];
  completed: boolean;
}

export type PendingCricketAction =
  | {
      type: 'select_next_batter';
      vacatedSlot: 'striker' | 'nonStriker';
      dismissedName: string;
      dismissalText: string;
      overCompletedAfterBatter: boolean;
      completedOverNumber: number;
      maidenOver: boolean;
      blockedBowlerId: string | null;
    }
  | {
      type: 'select_next_bowler';
      completedOverNumber: number;
      maidenOver: boolean;
      blockedBowlerId: string | null;
    };

export interface CricketMatchResult {
  type: 'runs' | 'wickets' | 'tie' | 'super_over_win' | 'abandoned';
  winnerTeamIndex: 0 | 1 | null;
  summaryText: string;
  marginText: string;
}

export interface CricketMatchState {
  schemaVersion: 2;
  matchId: string;
  visible: boolean;
  tournamentText: string;
  maxOvers: number;
  maxWickets: number;
  superOverEnabled: boolean;
  teams: [CricketTeamConfig, CricketTeamConfig];
  phase: CricketMatchPhase;
  currentInningsIndex: number;
  innings: InningsState[];
  pendingAction: PendingCricketAction | null;
  result: CricketMatchResult | null;
  lastNotification: string | null;
  updatedAt: number;
}

export interface WicketInput {
  dismissalType: DismissalType;
  dismissedSlot: 'striker' | 'nonStriker';
  fielderName?: string;
  runsCompleted?: number;
  battersCrossed?: boolean;
  deliveryType?: DeliveryLegality;
}

export interface ExtraInput {
  extraType: ExtraType;
  runs: number; // For wide: additional runs (0..6); for noball: runs scored (0..6); for bye/legbye: runs (1..6); for penalty: runs (default 5)
  offBat?: boolean; // Only for noball: whether runs were scored off the bat
}

export const DISMISSAL_LABELS: Record<DismissalType, string> = {
  bowled: 'Bowled',
  caught: 'Caught',
  lbw: 'LBW',
  run_out: 'Run Out',
  stumped: 'Stumped',
  hit_wicket: 'Hit Wicket',
  retired_out: 'Retired Out',
  obstructing_field: 'Obstructing the Field',
};

const BOWLER_CREDIT_DISMISSALS: Set<DismissalType> = new Set([
  'bowled',
  'caught',
  'lbw',
  'stumped',
  'hit_wicket',
]);

function cloneState(state: CricketMatchState): CricketMatchState {
  return JSON.parse(JSON.stringify(state)) as CricketMatchState;
}

function makeDefaultPlayers(prefix: string, names: string[]): CricketSquadPlayer[] {
  return names.map((name, idx) => ({
    id: `${prefix}-p${idx + 1}`,
    name,
  }));
}

export function createInitialCricketMatch(ownerUid = 'local'): CricketMatchState {
  const now = Date.now();
  const teamA: CricketTeamConfig = {
    id: 'team-a',
    name: 'SRI LANKA',
    code: 'SL',
    flagId: 'SL',
    logoUrl: '',
    players: makeDefaultPlayers('a', [
      'CHAMIKA',
      'MAHESH',
      'PATHUM',
      'KUSAL',
      'SADEERA',
      'CHARITH',
      'DHANANJAYA',
      'DASUN',
      'WANINDU',
      'DUSHMANTHA',
      'DILSHAN',
    ]),
  };

  const teamB: CricketTeamConfig = {
    id: 'team-b',
    name: 'AFGHANISTAN',
    code: 'AFG',
    flagId: 'AFG',
    logoUrl: '',
    players: makeDefaultPlayers('b', [
      'GURBAZ',
      'IBRAHIM',
      'RAHMAT',
      'SHAHIDI',
      'OMARZAI',
      'NABI',
      'RASHID',
      'MUJEEB',
      'NAVEEN',
      'FAROOQI',
      'NOOR',
    ]),
  };

  const innings1 = createEmptyInnings({
    inningsNumber: 1,
    isSuperOver: false,
    battingTeamIndex: 0,
    bowlingTeamIndex: 1,
    battingTeam: teamA,
    bowlingTeam: teamB,
    maxOvers: 20,
    maxWickets: 10,
    target: null,
    strikerId: teamA.players[0].id,
    nonStrikerId: teamA.players[1].id,
    bowlerId: teamB.players[6].id, // RASHID
  });

  return {
    schemaVersion: 2,
    matchId: ownerUid || 'local',
    visible: true,
    tournamentText: 'STAR EVENT CRICKET LIVE · 2026',
    maxOvers: 20,
    maxWickets: 10,
    superOverEnabled: true,
    teams: [teamA, teamB],
    phase: 'live',
    currentInningsIndex: 0,
    innings: [innings1],
    pendingAction: null,
    result: null,
    lastNotification: null,
    updatedAt: now,
  };
}

export function createEmptyInnings(params: {
  inningsNumber: number;
  isSuperOver: boolean;
  battingTeamIndex: 0 | 1;
  bowlingTeamIndex: 0 | 1;
  battingTeam: CricketTeamConfig;
  bowlingTeam: CricketTeamConfig;
  maxOvers: number;
  maxWickets: number;
  target: number | null;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
}): InningsState {
  const strikerPlayer =
    params.battingTeam.players.find((p) => p.id === params.strikerId) ??
    params.battingTeam.players[0];
  const nonStrikerPlayer =
    params.battingTeam.players.find(
      (p) => p.id === params.nonStrikerId && p.id !== strikerPlayer.id
    ) ??
    params.battingTeam.players.find((p) => p.id !== strikerPlayer.id) ??
    params.battingTeam.players[1];
  const bowlerPlayer =
    params.bowlingTeam.players.find((p) => p.id === params.bowlerId) ??
    params.bowlingTeam.players[0];

  return {
    inningsNumber: params.inningsNumber,
    isSuperOver: params.isSuperOver,
    battingTeamIndex: params.battingTeamIndex,
    bowlingTeamIndex: params.bowlingTeamIndex,
    runs: 0,
    wickets: 0,
    legalBalls: 0,
    maxOvers: params.maxOvers,
    maxWickets: params.maxWickets,
    target: params.target,
    extras: { wide: 0, noball: 0, bye: 0, legbye: 0, penalty: 0, total: 0 },
    batters: [
      {
        playerId: strikerPlayer.id,
        name: strikerPlayer.name,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        out: false,
        dismissalText: 'not out',
        battedOrder: 1,
      },
      {
        playerId: nonStrikerPlayer.id,
        name: nonStrikerPlayer.name,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        out: false,
        dismissalText: 'not out',
        battedOrder: 2,
      },
    ],
    bowlers: [
      {
        playerId: bowlerPlayer.id,
        name: bowlerPlayer.name,
        balls: 0,
        maidens: 0,
        runs: 0,
        wickets: 0,
        wides: 0,
        noBalls: 0,
      },
    ],
    strikerId: strikerPlayer.id,
    nonStrikerId: nonStrikerPlayer.id,
    currentBowlerId: bowlerPlayer.id,
    lastCompletedOverBowlerId: null,
    currentOverBalls: [],
    currentOverBowlerRuns: 0,
    currentOverLegalBalls: 0,
    partnershipRuns: 0,
    partnershipBalls: 0,
    fallOfWickets: [],
    ballHistory: [],
    completed: false,
  };
}

export function getActiveInnings(match: CricketMatchState): InningsState {
  return match.innings[match.currentInningsIndex] ?? match.innings[0];
}

function ensureBatterStat(innings: InningsState, player: CricketSquadPlayer): BatterInningsStat {
  let stat = innings.batters.find((b) => b.playerId === player.id);
  if (!stat) {
    stat = {
      playerId: player.id,
      name: player.name,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      out: false,
      dismissalText: 'not out',
      battedOrder: innings.batters.length + 1,
    };
    innings.batters.push(stat);
  }
  return stat;
}

function ensureBowlerStat(innings: InningsState, player: CricketSquadPlayer): BowlerInningsStat {
  let stat = innings.bowlers.find((b) => b.playerId === player.id);
  if (!stat) {
    stat = {
      playerId: player.id,
      name: player.name,
      balls: 0,
      maidens: 0,
      runs: 0,
      wickets: 0,
      wides: 0,
      noBalls: 0,
    };
    innings.bowlers.push(stat);
  }
  return stat;
}

export function getAvailableNextBatters(
  match: CricketMatchState,
  innings: InningsState
): CricketSquadPlayer[] {
  const battingTeam = match.teams[innings.battingTeamIndex];
  const usedIds = new Set(innings.batters.map((b) => b.playerId));
  return battingTeam.players.filter((p) => !usedIds.has(p.id));
}

export function getAvailableNextBowlers(
  match: CricketMatchState,
  innings: InningsState,
  blockedBowlerId: string | null
): CricketSquadPlayer[] {
  const bowlingTeam = match.teams[innings.bowlingTeamIndex];
  const filtered = bowlingTeam.players.filter((p) => p.id !== blockedBowlerId);
  return filtered.length > 0 ? filtered : bowlingTeam.players;
}

export function computeRunRate(runs: number, legalBalls: number): string {
  if (legalBalls <= 0) return '0.00';
  return ((runs * 6) / legalBalls).toFixed(2);
}

export function computeRequiredRunRate(innings: InningsState): string | null {
  if (innings.target === null) return null;
  const needed = Math.max(0, innings.target - innings.runs);
  const ballsRemaining = Math.max(0, innings.maxOvers * 6 - innings.legalBalls);
  if (needed === 0) return '0.00';
  if (ballsRemaining === 0) return '—';
  return ((needed * 6) / ballsRemaining).toFixed(2);
}

export function computeStrikeRate(runs: number, balls: number): string {
  if (balls <= 0) return '0.0';
  return ((runs / balls) * 100).toFixed(1);
}

export function computeEconomy(runs: number, balls: number): string {
  if (balls <= 0) return '0.00';
  return ((runs * 6) / balls).toFixed(2);
}

function swapStrikerIds(innings: InningsState) {
  const prevStriker = innings.strikerId;
  innings.strikerId = innings.nonStrikerId;
  innings.nonStrikerId = prevStriker;
}

/** Evaluates whether the active innings or full match has automatically ended */
function evaluateInningsAndMatchState(match: CricketMatchState): boolean {
  const innings = getActiveInnings(match);
  const battingTeam = match.teams[innings.battingTeamIndex];
  const bowlingTeam = match.teams[innings.bowlingTeamIndex];
  const maxBalls = innings.maxOvers * 6;

  // 1. Target achieved immediately in a chasing innings (2nd innings OR 2nd Super Over innings)
  if (innings.target !== null && innings.runs >= innings.target) {
    innings.completed = true;
    match.pendingAction = null;
    match.phase = 'completed';
    const wicketsLeft = Math.max(1, innings.maxWickets - innings.wickets);
    const wicketWord = wicketsLeft === 1 ? 'WICKET' : 'WICKETS';
    match.result = {
      type: innings.isSuperOver ? 'super_over_win' : 'wickets',
      winnerTeamIndex: innings.battingTeamIndex,
      summaryText: innings.isSuperOver
        ? `${battingTeam.name} WON SUPER OVER`
        : `${battingTeam.name} WON BY ${wicketsLeft} ${wicketWord}`,
      marginText: innings.isSuperOver
        ? `Won Super Over by ${wicketsLeft} ${wicketWord.toLowerCase()}`
        : `Won by ${wicketsLeft} ${wicketWord.toLowerCase()}`,
    };
    match.lastNotification = match.result.summaryText;
    return true;
  }

  // 2. Check if innings ended by all-out OR overs completed
  const allOut = innings.wickets >= innings.maxWickets;
  const oversFinished = innings.legalBalls >= maxBalls;

  if (!allOut && !oversFinished) {
    return false;
  }

  innings.completed = true;
  match.pendingAction = null;

  // Case A: First innings of normal match finished -> Innings Break!
  if (!innings.isSuperOver && innings.inningsNumber === 1) {
    match.phase = 'innings_break';
    const target = innings.runs + 1;
    match.lastNotification = `1ST INNINGS COMPLETE · TARGET ${target}`;
    return true;
  }

  // Case B: First innings of Super Over finished -> Super Over Break!
  if (innings.isSuperOver && innings.inningsNumber % 2 === 1) {
    match.phase = 'super_over_break';
    const target = innings.runs + 1;
    match.lastNotification = `SUPER OVER 1ST INNINGS COMPLETE · TARGET ${target}`;
    return true;
  }

  // Case C: Second innings (or Super Over 2nd innings) finished without passing target
  if (innings.target !== null) {
    const firstInningsScore = innings.target - 1;
    if (innings.runs < firstInningsScore) {
      const margin = firstInningsScore - innings.runs;
      const runWord = margin === 1 ? 'RUN' : 'RUNS';
      match.phase = 'completed';
      match.result = {
        type: innings.isSuperOver ? 'super_over_win' : 'runs',
        winnerTeamIndex: innings.bowlingTeamIndex,
        summaryText: innings.isSuperOver
          ? `${bowlingTeam.name} WON SUPER OVER`
          : `${bowlingTeam.name} WON BY ${margin} ${runWord}`,
        marginText: innings.isSuperOver
          ? `Won Super Over by ${margin} ${runWord.toLowerCase()}`
          : `Won by ${margin} ${runWord.toLowerCase()}`,
      };
      match.lastNotification = match.result.summaryText;
      return true;
    }

    // Exact Tie!
    match.phase = 'completed';
    match.result = {
      type: 'tie',
      winnerTeamIndex: null,
      summaryText: innings.isSuperOver ? 'SUPER OVER TIED' : 'MATCH TIED',
      marginText: match.superOverEnabled
        ? 'Scores level — Ready for Super Over'
        : 'Scores level — Match Tied',
    };
    match.lastNotification = match.result.summaryText;
    return true;
  }

  return true;
}

/** Handles completion of an over after a legal ball when innings continues */
function handleOverCompletionIfNeeded(
  match: CricketMatchState,
  innings: InningsState,
  deferBowlerPromptToAfterBatter = false
): { overCompleted: boolean; completedOverNumber: number; maidenOver: boolean; blockedBowlerId: string | null } {
  if (innings.currentOverLegalBalls < 6) {
    return {
      overCompleted: false,
      completedOverNumber: Math.floor(innings.legalBalls / 6),
      maidenOver: false,
      blockedBowlerId: null,
    };
  }

  const completedOverNumber = Math.floor(innings.legalBalls / 6);
  const maidenOver = innings.currentOverBowlerRuns === 0;
  const bowler = innings.bowlers.find((b) => b.playerId === innings.currentBowlerId);
  if (bowler && maidenOver) {
    bowler.maidens += 1;
  }

  const blockedBowlerId = innings.currentBowlerId;
  innings.lastCompletedOverBowlerId = blockedBowlerId;
  innings.currentOverLegalBalls = 0;
  innings.currentOverBowlerRuns = 0;

  if (!deferBowlerPromptToAfterBatter) {
    // Rotate strike automatically at over completion
    swapStrikerIds(innings);
    match.pendingAction = {
      type: 'select_next_bowler',
      completedOverNumber,
      maidenOver,
      blockedBowlerId,
    };
    match.lastNotification = maidenOver
      ? `OVER ${completedOverNumber} COMPLETED · MAIDEN OVER!`
      : `OVER ${completedOverNumber} COMPLETED`;
  }

  return {
    overCompleted: true,
    completedOverNumber,
    maidenOver,
    blockedBowlerId,
  };
}

function formatDismissalText(
  dismissalType: DismissalType,
  bowlerName: string,
  fielderName?: string
): string {
  const cleanFielder = (fielderName || '').trim();
  const cleanBowler = (bowlerName || 'Bowler').trim();
  switch (dismissalType) {
    case 'bowled':
      return `b ${cleanBowler}`;
    case 'caught':
      return cleanFielder ? `c ${cleanFielder} b ${cleanBowler}` : `c & b ${cleanBowler}`;
    case 'lbw':
      return `lbw b ${cleanBowler}`;
    case 'stumped':
      return cleanFielder ? `st ${cleanFielder} b ${cleanBowler}` : `st b ${cleanBowler}`;
    case 'hit_wicket':
      return `hit wicket b ${cleanBowler}`;
    case 'run_out':
      return cleanFielder ? `run out (${cleanFielder})` : 'run out';
    case 'retired_out':
      return 'retired out';
    case 'obstructing_field':
      return 'obstructing the field';
  }
}

/**
 * 1. Record legal runs off the bat (0, 1, 2, 3, 4, 5, 6)
 */
export function applyBallRuns(state: CricketMatchState, runsScored: number): CricketMatchState {
  if (state.phase !== 'live' || state.pendingAction) return state;
  const safeRuns = Math.max(0, Math.min(7, Math.floor(runsScored)));
  const next = cloneState(state);
  const innings = getActiveInnings(next);
  const striker = innings.batters.find((b) => b.playerId === innings.strikerId);
  const bowler = innings.bowlers.find((b) => b.playerId === innings.currentBowlerId);
  if (!striker || !bowler) return state;

  // Start fresh over visual list if previous over had just completed
  if (innings.currentOverLegalBalls === 0 && innings.legalBalls > 0 && innings.legalBalls % 6 === 0) {
    innings.currentOverBalls = [];
  }

  const notation = safeRuns === 0 ? '•' : String(safeRuns);
  innings.runs += safeRuns;
  innings.legalBalls += 1;
  innings.currentOverLegalBalls += 1;
  innings.currentOverBowlerRuns += safeRuns;
  innings.currentOverBalls = [...innings.currentOverBalls, notation].slice(-12);

  striker.runs += safeRuns;
  striker.balls += 1;
  if (safeRuns === 4) striker.fours += 1;
  if (safeRuns === 6) striker.sixes += 1;

  bowler.balls += 1;
  bowler.runs += safeRuns;

  innings.partnershipRuns += safeRuns;
  innings.partnershipBalls += 1;

  const overNumber = Math.floor((innings.legalBalls - 1) / 6) + 1;
  const ballInOver = ((innings.legalBalls - 1) % 6) + 1;

  innings.ballHistory.push({
    id: `${innings.inningsNumber}-${Date.now()}-${innings.ballHistory.length}`,
    inningsNumber: innings.inningsNumber,
    overNumber,
    ballInOver,
    notation,
    runsTotal: safeRuns,
    runsOffBat: safeRuns,
    extraRuns: 0,
    isLegalBall: true,
    isWicket: false,
    strikerName: striker.name,
    bowlerName: bowler.name,
    teamScoreAfter: innings.runs,
    wicketsAfter: innings.wickets,
    oversAfter: formatCricketOvers(innings.legalBalls),
    timestamp: Date.now(),
  });

  // Odd runs rotate strike immediately
  if (safeRuns % 2 === 1) {
    swapStrikerIds(innings);
  }

  next.lastNotification =
    safeRuns === 4
      ? `FOUR! ${striker.name}`
      : safeRuns === 6
        ? `SIX! ${striker.name}`
        : null;

  // Check if innings or match ended (target achieved OR final ball of innings)
  const ended = evaluateInningsAndMatchState(next);
  if (!ended) {
    handleOverCompletionIfNeeded(next, innings, false);
  }

  next.updatedAt = Date.now();
  return next;
}

/**
 * 2. Record Extras (Wide, No Ball, Bye, Leg Bye, Penalty Runs) with exact ICC rules
 */
export function applyExtra(state: CricketMatchState, input: ExtraInput): CricketMatchState {
  if (state.phase !== 'live' || state.pendingAction) return state;
  const next = cloneState(state);
  const innings = getActiveInnings(next);
  const striker = innings.batters.find((b) => b.playerId === innings.strikerId);
  const bowler = innings.bowlers.find((b) => b.playerId === innings.currentBowlerId);
  if (!striker || !bowler) return state;

  if (innings.currentOverLegalBalls === 0 && innings.legalBalls > 0 && innings.legalBalls % 6 === 0) {
    innings.currentOverBalls = [];
  }

  const rawRuns = Math.max(0, Math.min(10, Math.floor(input.runs)));
  let runsTotal = 0;
  let runsOffBat = 0;
  let extraRuns = 0;
  let isLegalBall = false;
  let notation = '';
  let rotateOnRuns = 0;

  switch (input.extraType) {
    case 'wide': {
      // Wide = 1 penalty + any additional runs run/boundary; NOT a legal ball; charged to bowler
      runsTotal = 1 + rawRuns;
      extraRuns = runsTotal;
      isLegalBall = false;
      innings.extras.wide += runsTotal;
      innings.extras.total += runsTotal;
      innings.runs += runsTotal;
      bowler.runs += runsTotal;
      bowler.wides += 1;
      innings.currentOverBowlerRuns += runsTotal;
      innings.partnershipRuns += runsTotal;
      rotateOnRuns = rawRuns;
      notation = rawRuns > 0 ? `${runsTotal}WD` : 'WD';
      break;
    }
    case 'noball': {
      // No Ball = 1 extra + optional runs off bat (or byes); NOT a legal ball, batter faces ball!
      const offBat = input.offBat !== false;
      runsTotal = 1 + rawRuns;
      runsOffBat = offBat ? rawRuns : 0;
      extraRuns = offBat ? 1 : runsTotal;
      isLegalBall = false;

      innings.extras.noball += 1;
      if (!offBat && rawRuns > 0) {
        innings.extras.bye += rawRuns;
      }
      innings.extras.total += extraRuns;
      innings.runs += runsTotal;

      striker.balls += 1;
      if (offBat && rawRuns > 0) {
        striker.runs += rawRuns;
        if (rawRuns === 4) striker.fours += 1;
        if (rawRuns === 6) striker.sixes += 1;
      }

      const bowlerCharge = 1 + (offBat ? rawRuns : 0);
      bowler.runs += bowlerCharge;
      bowler.noBalls += 1;
      innings.currentOverBowlerRuns += bowlerCharge;
      innings.partnershipRuns += runsTotal;
      innings.partnershipBalls += 1;
      rotateOnRuns = rawRuns;
      notation = rawRuns > 0 ? `${runsTotal}NB` : 'NB';
      break;
    }
    case 'bye': {
      const byeRuns = Math.max(1, rawRuns);
      runsTotal = byeRuns;
      extraRuns = byeRuns;
      isLegalBall = true;
      innings.extras.bye += byeRuns;
      innings.extras.total += byeRuns;
      innings.runs += byeRuns;
      innings.legalBalls += 1;
      innings.currentOverLegalBalls += 1;
      striker.balls += 1;
      bowler.balls += 1;
      // Note: Byes do NOT add to bowler.runs or currentOverBowlerRuns (maiden preserved!)
      innings.partnershipRuns += byeRuns;
      innings.partnershipBalls += 1;
      rotateOnRuns = byeRuns;
      notation = `${byeRuns}B`;
      break;
    }
    case 'legbye': {
      const lbRuns = Math.max(1, rawRuns);
      runsTotal = lbRuns;
      extraRuns = lbRuns;
      isLegalBall = true;
      innings.extras.legbye += lbRuns;
      innings.extras.total += lbRuns;
      innings.runs += lbRuns;
      innings.legalBalls += 1;
      innings.currentOverLegalBalls += 1;
      striker.balls += 1;
      bowler.balls += 1;
      // Leg Byes do NOT add to bowler.runs or currentOverBowlerRuns (maiden preserved!)
      innings.partnershipRuns += lbRuns;
      innings.partnershipBalls += 1;
      rotateOnRuns = lbRuns;
      notation = `${lbRuns}LB`;
      break;
    }
    case 'penalty': {
      const penRuns = Math.max(1, rawRuns || 5);
      runsTotal = penRuns;
      extraRuns = penRuns;
      isLegalBall = false;
      innings.extras.penalty += penRuns;
      innings.extras.total += penRuns;
      innings.runs += penRuns;
      notation = `+${penRuns}P`;
      break;
    }
  }

  innings.currentOverBalls = [...innings.currentOverBalls, notation].slice(-12);

  const overNumber = Math.floor(Math.max(0, innings.legalBalls - (isLegalBall ? 1 : 0)) / 6) + 1;
  const ballInOver = isLegalBall
    ? ((innings.legalBalls - 1) % 6) + 1
    : innings.currentOverLegalBalls;

  innings.ballHistory.push({
    id: `${innings.inningsNumber}-${Date.now()}-${innings.ballHistory.length}`,
    inningsNumber: innings.inningsNumber,
    overNumber,
    ballInOver,
    notation,
    runsTotal,
    runsOffBat,
    extraType: input.extraType,
    extraRuns,
    isLegalBall,
    isWicket: false,
    strikerName: striker.name,
    bowlerName: bowler.name,
    teamScoreAfter: innings.runs,
    wicketsAfter: innings.wickets,
    oversAfter: formatCricketOvers(innings.legalBalls),
    timestamp: Date.now(),
  });

  if (rotateOnRuns % 2 === 1) {
    swapStrikerIds(innings);
  }

  next.lastNotification =
    input.extraType === 'noball'
      ? `NO BALL (+${runsTotal})`
      : input.extraType === 'wide'
        ? `WIDE (+${runsTotal})`
        : input.extraType === 'penalty'
          ? `PENALTY RUNS (+${runsTotal})`
          : null;

  const ended = evaluateInningsAndMatchState(next);
  if (!ended && isLegalBall) {
    handleOverCompletionIfNeeded(next, innings, false);
  }

  next.updatedAt = Date.now();
  return next;
}

/**
 * 3. Record Wicket with full dismissal handling, run-outs, crossed batters & illegal deliveries
 */
export function applyWicket(state: CricketMatchState, input: WicketInput): CricketMatchState {
  if (state.phase !== 'live' || state.pendingAction) return state;
  const next = cloneState(state);
  const innings = getActiveInnings(next);
  const striker = innings.batters.find((b) => b.playerId === innings.strikerId);
  const nonStriker = innings.batters.find((b) => b.playerId === innings.nonStrikerId);
  const bowler = innings.bowlers.find((b) => b.playerId === innings.currentBowlerId);
  if (!striker || !nonStriker || !bowler) return state;

  if (innings.currentOverLegalBalls === 0 && innings.legalBalls > 0 && innings.legalBalls % 6 === 0) {
    innings.currentOverBalls = [];
  }

  const deliveryType: DeliveryLegality = input.deliveryType ?? 'legal';
  const isLegalBall =
    deliveryType === 'legal' && input.dismissalType !== 'retired_out';
  const runsCompleted =
    input.dismissalType === 'run_out' || input.dismissalType === 'obstructing_field'
      ? Math.max(0, Math.min(4, Math.floor(input.runsCompleted ?? 0)))
      : 0;

  let extraRuns = 0;
  if (deliveryType === 'wide') {
    extraRuns = 1;
    innings.extras.wide += 1;
    innings.extras.total += 1;
    bowler.wides += 1;
    bowler.runs += 1;
    innings.currentOverBowlerRuns += 1;
  } else if (deliveryType === 'noball') {
    extraRuns = 1;
    innings.extras.noball += 1;
    innings.extras.total += 1;
    bowler.noBalls += 1;
    bowler.runs += 1;
    innings.currentOverBowlerRuns += 1;
  }

  const totalAddedRuns = runsCompleted + extraRuns;
  if (totalAddedRuns > 0) {
    innings.runs += totalAddedRuns;
  }

  // Batter runs & balls on the dismissal delivery
  if (runsCompleted > 0 && deliveryType !== 'wide') {
    striker.runs += runsCompleted;
    bowler.runs += runsCompleted;
    innings.currentOverBowlerRuns += runsCompleted;
  } else if (runsCompleted > 0 && deliveryType === 'wide') {
    innings.extras.wide += runsCompleted;
    innings.extras.total += runsCompleted;
    bowler.runs += runsCompleted;
    innings.currentOverBowlerRuns += runsCompleted;
  }

  if (isLegalBall) {
    innings.legalBalls += 1;
    innings.currentOverLegalBalls += 1;
    striker.balls += 1;
    bowler.balls += 1;
  } else if (deliveryType === 'noball') {
    striker.balls += 1;
  }

  // Determine which batter is dismissed
  const dismissedSlot: 'striker' | 'nonStriker' =
    input.dismissalType === 'run_out' || input.dismissalType === 'retired_out'
      ? input.dismissedSlot
      : 'striker';

  const dismissedBatter = dismissedSlot === 'striker' ? striker : nonStriker;
  const dismissalText = formatDismissalText(
    input.dismissalType,
    bowler.name,
    input.fielderName
  );

  dismissedBatter.out = true;
  dismissedBatter.dismissalText = dismissalText;

  innings.wickets = Math.min(innings.maxWickets, innings.wickets + 1);
  if (BOWLER_CREDIT_DISMISSALS.has(input.dismissalType)) {
    bowler.wickets += 1;
  }

  const notation =
    deliveryType === 'wide'
      ? 'W+WD'
      : deliveryType === 'noball'
        ? 'W+NB'
        : runsCompleted > 0
          ? `W+${runsCompleted}`
          : 'W';
  innings.currentOverBalls = [...innings.currentOverBalls, notation].slice(-12);

  innings.fallOfWickets.push({
    wicketNumber: innings.wickets,
    score: innings.runs,
    overs: formatCricketOvers(innings.legalBalls),
    batterName: dismissedBatter.name,
    dismissalText,
  });

  // Reset partnership after wicket falls
  innings.partnershipRuns = 0;
  innings.partnershipBalls = 0;

  const overNumber = Math.floor(Math.max(0, innings.legalBalls - (isLegalBall ? 1 : 0)) / 6) + 1;
  const ballInOver = isLegalBall
    ? ((innings.legalBalls - 1) % 6) + 1
    : innings.currentOverLegalBalls;

  innings.ballHistory.push({
    id: `${innings.inningsNumber}-${Date.now()}-${innings.ballHistory.length}`,
    inningsNumber: innings.inningsNumber,
    overNumber,
    ballInOver,
    notation,
    runsTotal: totalAddedRuns,
    runsOffBat: deliveryType === 'wide' ? 0 : runsCompleted,
    extraType: deliveryType === 'legal' ? undefined : deliveryType,
    extraRuns,
    isLegalBall,
    isWicket: true,
    dismissalType: input.dismissalType,
    dismissedBatterName: dismissedBatter.name,
    strikerName: striker.name,
    bowlerName: bowler.name,
    teamScoreAfter: innings.runs,
    wicketsAfter: innings.wickets,
    oversAfter: formatCricketOvers(innings.legalBalls),
    timestamp: Date.now(),
  });

  // Clear the dismissed batter from the crease and handle crossed batters for Run Out!
  let vacatedSlot: 'striker' | 'nonStriker' = dismissedSlot;
  if (input.dismissalType === 'run_out') {
    const crossed = Boolean(input.battersCrossed);
    if (dismissedSlot === 'striker') {
      // If batters crossed before striker was run out, surviving non-striker is now at striker end!
      if (crossed) {
        innings.strikerId = nonStriker.playerId;
        innings.nonStrikerId = null;
        vacatedSlot = 'nonStriker';
      } else {
        innings.strikerId = null;
        vacatedSlot = 'striker';
      }
    } else {
      // Non-striker run out: if they crossed, striker moved to non-striker end so new batter takes strike!
      if (crossed) {
        innings.nonStrikerId = striker.playerId;
        innings.strikerId = null;
        vacatedSlot = 'striker';
      } else {
        innings.nonStrikerId = null;
        vacatedSlot = 'nonStriker';
      }
    }
  } else {
    if (dismissedSlot === 'striker') {
      innings.strikerId = null;
    } else {
      innings.nonStrikerId = null;
    }
  }

  next.lastNotification = `WICKET! ${dismissedBatter.name} (${dismissalText})`;

  // Check if target achieved or all-out or overs finished
  const ended = evaluateInningsAndMatchState(next);
  if (!ended) {
    // Check if the over also completed on this wicket delivery
    const overInfo = isLegalBall
      ? handleOverCompletionIfNeeded(next, innings, true)
      : { overCompleted: false, completedOverNumber: overNumber, maidenOver: false, blockedBowlerId: null };

    next.pendingAction = {
      type: 'select_next_batter',
      vacatedSlot,
      dismissedName: dismissedBatter.name,
      dismissalText,
      overCompletedAfterBatter: overInfo.overCompleted,
      completedOverNumber: overInfo.completedOverNumber,
      maidenOver: overInfo.maidenOver,
      blockedBowlerId: overInfo.blockedBowlerId,
    };
  }

  next.updatedAt = Date.now();
  return next;
}

/**
 * 4. Select Next Batter after a Wicket (or add a custom player name to squad on the fly)
 */
export function selectNextBatter(
  state: CricketMatchState,
  playerIdOrNewName: { playerId?: string; newPlayerName?: string }
): CricketMatchState {
  if (state.pendingAction?.type !== 'select_next_batter') return state;
  const next = cloneState(state);
  const innings = getActiveInnings(next);
  const battingTeam = next.teams[innings.battingTeamIndex];
  const pending = next.pendingAction;
  if (pending?.type !== 'select_next_batter') return state;

  let chosen: CricketSquadPlayer | undefined;
  if (playerIdOrNewName.playerId) {
    chosen = battingTeam.players.find((p) => p.id === playerIdOrNewName.playerId);
  } else if (playerIdOrNewName.newPlayerName?.trim()) {
    const clean = playerIdOrNewName.newPlayerName.trim().toUpperCase().slice(0, 32);
    chosen = {
      id: `${battingTeam.id}-p${Date.now()}`,
      name: clean,
    };
    battingTeam.players.push(chosen);
  }
  if (!chosen) return state;

  ensureBatterStat(innings, chosen);

  if (pending.vacatedSlot === 'striker') {
    innings.strikerId = chosen.id;
  } else {
    innings.nonStrikerId = chosen.id;
  }

  // If the wicket happened on the 6th ball of the over, now rotate strike and open next-bowler prompt!
  if (pending.overCompletedAfterBatter) {
    swapStrikerIds(innings);
    next.pendingAction = {
      type: 'select_next_bowler',
      completedOverNumber: pending.completedOverNumber,
      maidenOver: pending.maidenOver,
      blockedBowlerId: pending.blockedBowlerId,
    };
    next.lastNotification = pending.maidenOver
      ? `OVER ${pending.completedOverNumber} COMPLETED · MAIDEN OVER!`
      : `OVER ${pending.completedOverNumber} COMPLETED · SELECT NEXT BOWLER`;
  } else {
    next.pendingAction = null;
    next.lastNotification = `NEW BATTER: ${chosen.name}`;
  }

  next.updatedAt = Date.now();
  return next;
}

/**
 * 5. Select Next Over Bowler (blocks consecutive overs by same bowler!)
 */
export function selectNextBowler(
  state: CricketMatchState,
  playerIdOrNewName: { playerId?: string; newPlayerName?: string }
): CricketMatchState {
  if (state.pendingAction?.type !== 'select_next_bowler') return state;
  const next = cloneState(state);
  const innings = getActiveInnings(next);
  const bowlingTeam = next.teams[innings.bowlingTeamIndex];
  const pending = next.pendingAction;
  if (pending?.type !== 'select_next_bowler') return state;
  const blockedId = pending.blockedBowlerId;

  let chosen: CricketSquadPlayer | undefined;
  if (playerIdOrNewName.playerId) {
    // Enforce cricket rule: same bowler cannot bowl consecutive overs (if another bowler exists)
    if (playerIdOrNewName.playerId === blockedId && bowlingTeam.players.length > 1) {
      return state;
    }
    chosen = bowlingTeam.players.find((p) => p.id === playerIdOrNewName.playerId);
  } else if (playerIdOrNewName.newPlayerName?.trim()) {
    const clean = playerIdOrNewName.newPlayerName.trim().toUpperCase().slice(0, 32);
    chosen = {
      id: `${bowlingTeam.id}-p${Date.now()}`,
      name: clean,
    };
    bowlingTeam.players.push(chosen);
  }
  if (!chosen) return state;

  ensureBowlerStat(innings, chosen);
  innings.currentBowlerId = chosen.id;
  innings.currentOverBalls = [];
  innings.currentOverBowlerRuns = 0;
  innings.currentOverLegalBalls = 0;

  next.pendingAction = null;
  next.lastNotification = `NEW OVER · BOWLER: ${chosen.name}`;
  next.updatedAt = Date.now();
  return next;
}

/**
 * 6. Start Second Innings (or Super Over 1st / 2nd Innings)
 */
export function startNextInnings(
  state: CricketMatchState,
  selection: { strikerId: string; nonStrikerId: string; bowlerId: string }
): CricketMatchState {
  if (state.phase !== 'innings_break' && state.phase !== 'super_over_break') {
    return state;
  }
  const next = cloneState(state);
  const prevInnings = getActiveInnings(next);
  const battingTeamIndex: 0 | 1 = prevInnings.bowlingTeamIndex;
  const bowlingTeamIndex: 0 | 1 = prevInnings.battingTeamIndex;
  const battingTeam = next.teams[battingTeamIndex];
  const bowlingTeam = next.teams[bowlingTeamIndex];
  const isSuperOver = state.phase === 'super_over_break';

  const newInnings = createEmptyInnings({
    inningsNumber: prevInnings.inningsNumber + 1,
    isSuperOver,
    battingTeamIndex,
    bowlingTeamIndex,
    battingTeam,
    bowlingTeam,
    maxOvers: isSuperOver ? 1 : next.maxOvers,
    maxWickets: isSuperOver ? 2 : next.maxWickets,
    target: prevInnings.runs + 1,
    strikerId: selection.strikerId,
    nonStrikerId: selection.nonStrikerId,
    bowlerId: selection.bowlerId,
  });

  next.innings.push(newInnings);
  next.currentInningsIndex = next.innings.length - 1;
  next.phase = 'live';
  next.pendingAction = null;
  next.result = null;
  next.lastNotification = isSuperOver
    ? `SUPER OVER CHASE · TARGET ${newInnings.target}`
    : `2ND INNINGS STARTED · TARGET ${newInnings.target}`;
  next.updatedAt = Date.now();
  return next;
}

/**
 * 7. Start Super Over after a Tied Match (1 over, 2 wickets per side)
 */
export function startSuperOver(
  state: CricketMatchState,
  selection: { strikerId: string; nonStrikerId: string; bowlerId: string }
): CricketMatchState {
  if (state.phase !== 'completed' || state.result?.type !== 'tie') return state;
  const next = cloneState(state);
  const lastInnings = getActiveInnings(next);
  // In ICC rules, the team that batted second bats FIRST in the Super Over!
  const battingTeamIndex: 0 | 1 = lastInnings.battingTeamIndex;
  const bowlingTeamIndex: 0 | 1 = lastInnings.bowlingTeamIndex;
  const battingTeam = next.teams[battingTeamIndex];
  const bowlingTeam = next.teams[bowlingTeamIndex];

  const superOverInnings = createEmptyInnings({
    inningsNumber: lastInnings.inningsNumber + 1,
    isSuperOver: true,
    battingTeamIndex,
    bowlingTeamIndex,
    battingTeam,
    bowlingTeam,
    maxOvers: 1,
    maxWickets: 2,
    target: null,
    strikerId: selection.strikerId,
    nonStrikerId: selection.nonStrikerId,
    bowlerId: selection.bowlerId,
  });

  next.innings.push(superOverInnings);
  next.currentInningsIndex = next.innings.length - 1;
  next.phase = 'live';
  next.pendingAction = null;
  next.result = null;
  next.lastNotification = `SUPER OVER LIVE · ${battingTeam.code} BATTING`;
  next.updatedAt = Date.now();
  return next;
}

/** Manual Strike Swap */
export function manualSwapStrike(state: CricketMatchState): CricketMatchState {
  if (state.phase !== 'live') return state;
  const next = cloneState(state);
  const innings = getActiveInnings(next);
  swapStrikerIds(innings);
  next.updatedAt = Date.now();
  return next;
}

/** Abandon Match / No Result */
export function abandonMatch(
  state: CricketMatchState,
  reason = 'Match Abandoned — No Result'
): CricketMatchState {
  const next = cloneState(state);
  next.phase = 'completed';
  next.pendingAction = null;
  next.result = {
    type: 'abandoned',
    winnerTeamIndex: null,
    summaryText: 'MATCH ABANDONED · NO RESULT',
    marginText: reason,
  };
  next.lastNotification = next.result.summaryText;
  next.updatedAt = Date.now();
  return next;
}

/** Update match/team configuration while preserving live scorecards & active player names */
export function updateMatchConfig(
  state: CricketMatchState,
  patch: {
    tournamentText?: string;
    maxOvers?: number;
    maxWickets?: number;
    superOverEnabled?: boolean;
    visible?: boolean;
    teamIndex?: 0 | 1;
    teamPatch?: Partial<CricketTeamConfig>;
  }
): CricketMatchState {
  const next = cloneState(state);
  if (typeof patch.tournamentText === 'string') {
    next.tournamentText = patch.tournamentText.slice(0, 80);
  }
  if (typeof patch.maxOvers === 'number' && Number.isFinite(patch.maxOvers)) {
    const clamped = Math.max(1, Math.min(500, Math.round(patch.maxOvers)));
    next.maxOvers = clamped;
    const active = getActiveInnings(next);
    if (!active.isSuperOver) {
      active.maxOvers = clamped;
    }
  }
  if (typeof patch.maxWickets === 'number' && Number.isFinite(patch.maxWickets)) {
    const clamped = Math.max(1, Math.min(10, Math.round(patch.maxWickets)));
    next.maxWickets = clamped;
    const active = getActiveInnings(next);
    if (!active.isSuperOver) {
      active.maxWickets = clamped;
    }
  }
  if (typeof patch.superOverEnabled === 'boolean') {
    next.superOverEnabled = patch.superOverEnabled;
  }
  if (typeof patch.visible === 'boolean') {
    next.visible = patch.visible;
  }
  if (patch.teamIndex !== undefined && patch.teamPatch) {
    const team = next.teams[patch.teamIndex];
    const updated: CricketTeamConfig = {
      ...team,
      ...patch.teamPatch,
      name: (patch.teamPatch.name ?? team.name).slice(0, 50),
      code: ((patch.teamPatch.code ?? team.code).toUpperCase().slice(0, 8) || team.code),
      logoUrl: (patch.teamPatch.logoUrl ?? team.logoUrl).slice(0, 180000),
      players: patch.teamPatch.players ?? team.players,
    };
    next.teams[patch.teamIndex] = updated;

    // Keep active batters/bowlers synced with renamed squad players!
    const nameMap = new Map(updated.players.map((p) => [p.id, p.name]));
    for (const inn of next.innings) {
      if (inn.battingTeamIndex === patch.teamIndex) {
        for (const b of inn.batters) {
          const newName = nameMap.get(b.playerId);
          if (newName) b.name = newName;
        }
      }
      if (inn.bowlingTeamIndex === patch.teamIndex) {
        for (const bw of inn.bowlers) {
          const newName = nameMap.get(bw.playerId);
          if (newName) bw.name = newName;
        }
      }
    }
  }

  next.updatedAt = Date.now();
  return next;
}

/** Rename an active batter or bowler directly and sync with squad roster */
export function renameSquadPlayer(
  state: CricketMatchState,
  teamIndex: 0 | 1,
  playerId: string,
  newName: string
): CricketMatchState {
  const next = cloneState(state);
  const clean = newName.slice(0, 36);
  const team = next.teams[teamIndex];
  const player = team.players.find((p) => p.id === playerId);
  if (player) {
    player.name = clean;
  }
  for (const inn of next.innings) {
    if (inn.battingTeamIndex === teamIndex) {
      const b = inn.batters.find((x) => x.playerId === playerId);
      if (b) b.name = clean;
    }
    if (inn.bowlingTeamIndex === teamIndex) {
      const bw = inn.bowlers.find((x) => x.playerId === playerId);
      if (bw) bw.name = clean;
    }
  }
  next.updatedAt = Date.now();
  return next;
}

/** Reset match to 0-0 (1st innings) while preserving team names, flags, logos, squads & tournament text */
export function resetCricketMatchKeepingTeams(state: CricketMatchState): CricketMatchState {
  const next = cloneState(state);
  const teamA = next.teams[0];
  const teamB = next.teams[1];
  const innings1 = createEmptyInnings({
    inningsNumber: 1,
    isSuperOver: false,
    battingTeamIndex: 0,
    bowlingTeamIndex: 1,
    battingTeam: teamA,
    bowlingTeam: teamB,
    maxOvers: next.maxOvers,
    maxWickets: next.maxWickets,
    target: null,
    strikerId: teamA.players[0]?.id ?? 'a-p1',
    nonStrikerId: teamA.players[1]?.id ?? 'a-p2',
    bowlerId: teamB.players[6]?.id ?? teamB.players[0]?.id ?? 'b-p1',
  });

  return {
    ...next,
    phase: 'live',
    currentInningsIndex: 0,
    innings: [innings1],
    pendingAction: null,
    result: null,
    lastNotification: 'NEW MATCH READY',
    updatedAt: Date.now(),
  };
}

/**
 * Projects the rich CricketMatchState into the flat Firestore document
 * (`UserCricketScoreboardDoc`) consumed instantaneously by vMix (`/cricket-overlay/{uid}`)
 * AND stores the full serialized `matchJson` so every screen & reload restores 100% state.
 */
export function projectMatchToFirestoreDoc(
  ownerUid: string,
  match: CricketMatchState,
  version: number
): UserCricketScoreboardDoc {
  const innings = getActiveInnings(match);
  const battingTeam = match.teams[innings.battingTeamIndex];
  const bowlingTeam = match.teams[innings.bowlingTeamIndex];

  const striker =
    innings.batters.find((b) => b.playerId === innings.strikerId) ??
    innings.batters.find((b) => !b.out) ??
    innings.batters[0];
  const nonStriker =
    innings.batters.find(
      (b) => b.playerId === innings.nonStrikerId && b.playerId !== striker?.playerId
    ) ??
    innings.batters.find((b) => !b.out && b.playerId !== striker?.playerId) ??
    innings.batters[1];

  // Keep Batter 1 & Batter 2 in stable display order (earlier battedOrder on top!) so rows don't jump on strike rotation!
  const pair = [striker, nonStriker].filter((x): x is BatterInningsStat => Boolean(x));
  pair.sort((a, b) => a.battedOrder - b.battedOrder);
  const topBatter = pair[0];
  const bottomBatter = pair[1];
  const strikerRow: 1 | 2 = bottomBatter && bottomBatter.playerId === innings.strikerId ? 2 : 1;

  const bowler =
    innings.bowlers.find((b) => b.playerId === innings.currentBowlerId) ??
    innings.bowlers[innings.bowlers.length - 1];

  // Build smart dynamic center broadcast banner line for vMix overlay:
  let dynamicBanner = match.tournamentText || 'STAR EVENT CRICKET LIVE';
  if (match.phase === 'completed' && match.result) {
    dynamicBanner = match.result.summaryText;
  } else if (match.phase === 'innings_break') {
    dynamicBanner = `INNINGS BREAK · TARGET ${innings.runs + 1}`;
  } else if (match.phase === 'super_over_break') {
    dynamicBanner = `SUPER OVER BREAK · TARGET ${innings.runs + 1}`;
  } else if (innings.target !== null) {
    const need = Math.max(0, innings.target - innings.runs);
    const ballsLeft = Math.max(0, innings.maxOvers * 6 - innings.legalBalls);
    dynamicBanner = `${battingTeam.code} NEED ${need} OFF ${ballsLeft} BALLS`;
  }

  // Strip base64 logos out of matchJson (they live in battingLogoUrl/bowlingLogoUrl) to keep matchJson compact!
  const compactMatch: CricketMatchState = {
    ...match,
    teams: [
      { ...match.teams[0], logoUrl: '' },
      { ...match.teams[1], logoUrl: '' },
    ],
  };

  let serialized = JSON.stringify(compactMatch);
  // Safety cap well within Firestore's 260KB rule limit even in 50-over matches
  if (serialized.length > 240000) {
    const trimmed = cloneState(compactMatch);
    for (const inn of trimmed.innings) {
      if (inn.ballHistory.length > 180) {
        inn.ballHistory = inn.ballHistory.slice(-180);
      }
    }
    serialized = JSON.stringify(trimmed).slice(0, 250000);
  }

  return {
    ownerUid,
    visible: match.visible,
    battingTeamName: battingTeam.name.slice(0, 50),
    battingTeamCode: (battingTeam.code || 'TMA').slice(0, 8),
    battingFlagId: battingTeam.flagId,
    battingLogoUrl: battingTeam.logoUrl.slice(0, 180000),
    bowlingTeamName: bowlingTeam.name.slice(0, 50),
    bowlingTeamCode: (bowlingTeam.code || 'TMB').slice(0, 8),
    bowlingFlagId: bowlingTeam.flagId,
    bowlingLogoUrl: bowlingTeam.logoUrl.slice(0, 180000),
    runs: innings.runs,
    wickets: innings.wickets,
    totalBalls: innings.legalBalls,
    maxOvers: innings.maxOvers,
    tournamentText: dynamicBanner.slice(0, 80),
    batter1Name: (topBatter?.name ?? 'BATTER 1').slice(0, 40),
    batter1Runs: topBatter?.runs ?? 0,
    batter1Balls: topBatter?.balls ?? 0,
    batter2Name: (bottomBatter?.name ?? 'BATTER 2').slice(0, 40),
    batter2Runs: bottomBatter?.runs ?? 0,
    batter2Balls: bottomBatter?.balls ?? 0,
    striker: strikerRow,
    bowlerName: (bowler?.name ?? 'BOWLER').slice(0, 40),
    bowlerWickets: bowler?.wickets ?? 0,
    bowlerRuns: bowler?.runs ?? 0,
    bowlerBalls: bowler?.balls ?? 0,
    currentOverBalls: innings.currentOverBalls.slice(-12),
    matchJson: serialized,
    version,
    updatedAt: match.updatedAt,
  };
}

/** Hydrates a CricketMatchState back from a Firestore UserCricketScoreboardDoc */
export function hydrateMatchFromFirestoreDoc(
  ownerUid: string,
  docData?: Partial<UserCricketScoreboardDoc> | null
): CricketMatchState {
  if (docData?.matchJson) {
    try {
      const parsed = JSON.parse(docData.matchJson) as CricketMatchState;
      if (parsed && parsed.schemaVersion === 2 && Array.isArray(parsed.innings) && parsed.innings.length > 0) {
        const active = parsed.innings[parsed.currentInningsIndex] ?? parsed.innings[0];
        // Re-attach team logos stored on top-level fields
        if (docData.battingLogoUrl) {
          parsed.teams[active.battingTeamIndex].logoUrl = docData.battingLogoUrl;
        }
        if (docData.bowlingLogoUrl) {
          parsed.teams[active.bowlingTeamIndex].logoUrl = docData.bowlingLogoUrl;
        }
        return parsed;
      }
    } catch {
      // Fall through to clean initial match
    }
  }

  // Upgrade any legacy flat doc seamlessly into a v2 engine state
  const base = createInitialCricketMatch(ownerUid);
  if (docData && typeof docData.battingTeamCode === 'string') {
    base.teams[0].code = docData.battingTeamCode;
    base.teams[0].name = docData.battingTeamName || docData.battingTeamCode;
    if (docData.battingFlagId) base.teams[0].flagId = docData.battingFlagId;
    if (docData.battingLogoUrl) base.teams[0].logoUrl = docData.battingLogoUrl;
    base.teams[1].code = docData.bowlingTeamCode || base.teams[1].code;
    base.teams[1].name = docData.bowlingTeamName || base.teams[1].name;
    if (docData.bowlingFlagId) base.teams[1].flagId = docData.bowlingFlagId;
    if (docData.bowlingLogoUrl) base.teams[1].logoUrl = docData.bowlingLogoUrl;
    if (typeof docData.maxOvers === 'number' && docData.maxOvers > 0) {
      base.maxOvers = docData.maxOvers;
      base.innings[0].maxOvers = docData.maxOvers;
    }
    if (typeof docData.tournamentText === 'string' && docData.tournamentText.trim()) {
      base.tournamentText = docData.tournamentText;
    }
  }
  return base;
}
