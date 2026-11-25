import {
  BallEvent,
  CricketMatch,
  CricketSuiteState,
  ExtraType,
  FieldPositionSpot,
  InningsState,
  Player,
  PointTableEntry,
  Team,
  TeamColorTag,
  WicketType,
} from '../types/cricketSuite';

export const TEAM_COLOR_MAP: Record<
  TeamColorTag,
  { bg: string; text: string; hex: string; border: string }
> = {
  Light_yellow: {
    bg: 'bg-amber-300/20',
    text: 'text-amber-200',
    hex: '#FDE047',
    border: 'border-amber-300/45',
  },
  Light_brown: {
    bg: 'bg-amber-700/25',
    text: 'text-amber-300',
    hex: '#C28550',
    border: 'border-amber-600/45',
  },
  Light_pink: {
    bg: 'bg-pink-400/20',
    text: 'text-pink-200',
    hex: '#F472B6',
    border: 'border-pink-400/45',
  },
  Blue: {
    bg: 'bg-blue-600/25',
    text: 'text-blue-200',
    hex: '#2563EB',
    border: 'border-blue-500/45',
  },
  Light_blue: {
    bg: 'bg-sky-400/20',
    text: 'text-sky-200',
    hex: '#38BDF8',
    border: 'border-sky-400/45',
  },
  Defoult: {
    bg: 'bg-zinc-600/25',
    text: 'text-zinc-200',
    hex: '#A1A1AA',
    border: 'border-zinc-500/45',
  },
  Crimson_red: {
    bg: 'bg-red-600/25',
    text: 'text-red-200',
    hex: '#DC2626',
    border: 'border-red-500/45',
  },
  Metallic_gold: {
    bg: 'bg-yellow-500/25',
    text: 'text-yellow-200',
    hex: '#EAB308',
    border: 'border-yellow-400/45',
  },
};

export const DEFAULT_FIELD_POSITIONS: FieldPositionSpot[] = [
  { id: 'wk', label: 'Wicket Keeper', x: 50, y: 80, playerId: null },
  { id: 'slip', label: 'First Slip', x: 58, y: 78, playerId: null },
  { id: 'thirdman', label: 'Third Man', x: 76, y: 78, playerId: null },
  { id: 'point', label: 'Point', x: 79, y: 54, playerId: null },
  { id: 'cover', label: 'Extra Cover', x: 74, y: 34, playerId: null },
  { id: 'longoff', label: 'Long Off', x: 65, y: 15, playerId: null },
  { id: 'longon', label: 'Long On', x: 35, y: 15, playerId: null },
  { id: 'midwicket', label: 'Deep Mid Wicket', x: 20, y: 36, playerId: null },
  { id: 'squareleg', label: 'Square Leg', x: 21, y: 56, playerId: null },
  { id: 'fineleg', label: 'Fine Leg', x: 28, y: 78, playerId: null },
  { id: 'bowler', label: 'Bowler', x: 50, y: 33, playerId: null },
];

export function formatOvers(legalBalls: number): string {
  const safe = Math.max(0, Math.floor(legalBalls));
  return `${Math.floor(safe / 6)}.${safe % 6}`;
}

export function calcRunRate(runs: number, legalBalls: number): string {
  if (legalBalls <= 0) return '0.00';
  return ((runs * 6) / legalBalls).toFixed(2);
}

export function calcStrikeRate(runs: number, balls: number): string {
  if (balls <= 0) return '0.0';
  return ((runs / balls) * 100).toFixed(1);
}

export function calcEconomy(runsConceded: number, legalBalls: number): string {
  if (legalBalls <= 0) return '0.00';
  return ((runsConceded * 6) / legalBalls).toFixed(2);
}

export function getBallPillLabel(b: BallEvent): string {
  if (b.isWicket) {
    if (b.extraType === 'WD') return `W+WD`;
    if (b.extraType === 'NB') return `W+NB`;
    return b.runsOffBat > 0 ? `W+${b.runsOffBat}` : 'W';
  }
  if (b.isDcl) return `DCL${b.totalRuns > 0 ? `+${b.totalRuns}` : ''}`;
  if (b.extraType === 'WD') return b.totalRuns > 1 ? `WD+${b.totalRuns - 1}` : 'WD';
  if (b.extraType === 'NB') return b.runsOffBat > 0 ? `NB+${b.runsOffBat}` : 'NB';
  if (b.extraType === 'LB') return `LB${b.extraRuns}`;
  if (b.extraType === 'BYE') return `B${b.extraRuns}`;
  if (b.extraType === 'PENALTY') return `PEN+${b.extraRuns}`;
  return String(b.runsOffBat);
}

export interface BatterStats {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  sr: string;
  isOut: boolean;
  dismissalText: string;
}

export interface BowlerStats {
  playerId: string;
  name: string;
  legalBalls: number;
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
  economy: string;
  wides: number;
  noBalls: number;
}

export function computeBattingCard(innings: InningsState, battingTeam?: Team): BatterStats[] {
  const playerMap = new Map<string, Player>();
  battingTeam?.players.forEach((p) => playerMap.set(p.id, p));

  const orderedIds = Array.from(
    new Set([
      ...innings.battingOrder,
      innings.strikerId,
      innings.nonStrikerId,
      ...innings.balls.map((b) => b.strikerId),
    ].filter(Boolean))
  );

  return orderedIds.map((pid) => {
    const p = playerMap.get(pid);
    let runs = 0;
    let balls = 0;
    let fours = 0;
    let sixes = 0;
    let isOut = false;
    let dismissalText = 'not out';

    for (const b of innings.balls) {
      if (b.strikerId === pid) {
        if (b.extraType !== 'WD' && b.extraType !== 'PENALTY') {
          balls += 1;
        }
        runs += b.runsOffBat;
        if (b.isBoundary4 || b.runsOffBat === 4) fours += 1;
        if (b.isBoundary6 || b.runsOffBat === 6) sixes += 1;
      }
      if (b.isWicket && (b.dismissedPlayerId || b.strikerId) === pid) {
        isOut = true;
        const bowlerName = b.bowlerId;
        dismissalText = b.fielderName
          ? `${b.wicketType || 'Out'} (${b.fielderName})`
          : `${b.wicketType || 'Out'}`;
        void bowlerName;
      }
    }

    return {
      playerId: pid,
      name: p?.name || 'Batter',
      runs,
      balls,
      fours,
      sixes,
      sr: calcStrikeRate(runs, balls),
      isOut,
      dismissalText,
    };
  });
}

export function computeBowlingCard(innings: InningsState, bowlingTeam?: Team): BowlerStats[] {
  const playerMap = new Map<string, Player>();
  bowlingTeam?.players.forEach((p) => playerMap.set(p.id, p));

  const bowlerIds = Array.from(
    new Set([
      ...innings.balls.map((b) => b.bowlerId),
      innings.bowlerId,
    ].filter(Boolean))
  );

  return bowlerIds.map((pid) => {
    const p = playerMap.get(pid);
    const myBalls = innings.balls.filter((b) => b.bowlerId === pid);
    let legalBalls = 0;
    let runs = 0;
    let wickets = 0;
    let wides = 0;
    let noBalls = 0;

    // Group by over to detect maidens
    const overRunsMap = new Map<number, { legal: number; conceded: number }>();

    for (const b of myBalls) {
      if (b.isLegal) legalBalls += 1;
      const conceded =
        b.extraType === 'LB' || b.extraType === 'BYE' || b.extraType === 'PENALTY'
          ? 0
          : b.totalRuns;
      runs += conceded;
      if (b.extraType === 'WD') wides += 1;
      if (b.extraType === 'NB') noBalls += 1;
      if (
        b.isWicket &&
        b.wicketType !== 'Run Out' &&
        b.wicketType !== 'Retired Hurt' &&
        b.wicketType !== 'Time Out' &&
        b.wicketType !== 'Retired Out' &&
        b.wicketType !== 'Obstructing the Field'
      ) {
        wickets += 1;
      }

      const ovEntry = overRunsMap.get(b.over) ?? { legal: 0, conceded: 0 };
      if (b.isLegal) ovEntry.legal += 1;
      ovEntry.conceded += conceded;
      overRunsMap.set(b.over, ovEntry);
    }

    let maidens = 0;
    overRunsMap.forEach((v) => {
      if (v.legal === 6 && v.conceded === 0) maidens += 1;
    });

    return {
      playerId: pid,
      name: p?.name || 'Bowler',
      legalBalls,
      overs: formatOvers(legalBalls),
      maidens,
      runs,
      wickets,
      economy: calcEconomy(runs, legalBalls),
      wides,
      noBalls,
    };
  });
}

export function computeCurrentPartnership(innings: InningsState): {
  runs: number;
  balls: number;
} {
  let runs = 0;
  let balls = 0;
  for (let i = innings.balls.length - 1; i >= 0; i--) {
    const b = innings.balls[i];
    if (b.isWicket) break;
    runs += b.totalRuns;
    if (b.isLegal) balls += 1;
  }
  return { runs, balls };
}

export function computeOversBreakdown(innings: InningsState): Array<{
  overNumber: number; // 1-indexed
  bowlerId: string;
  balls: BallEvent[];
  runsInOver: number;
  wicketsInOver: number;
  cumulativeRuns: number;
  cumulativeWickets: number;
}> {
  const byOver = new Map<number, BallEvent[]>();
  for (const b of innings.balls) {
    const list = byOver.get(b.over) ?? [];
    list.push(b);
    byOver.set(b.over, list);
  }

  const sortedKeys = Array.from(byOver.keys()).sort((a, b) => a - b);
  let cumRuns = 0;
  let cumWkts = 0;

  return sortedKeys.map((ov) => {
    const balls = byOver.get(ov) ?? [];
    const runsInOver = balls.reduce((acc, b) => acc + b.totalRuns, 0);
    const wicketsInOver = balls.filter((b) => b.isWicket).length;
    cumRuns += runsInOver;
    cumWkts += wicketsInOver;
    return {
      overNumber: ov + 1,
      bowlerId: balls[0]?.bowlerId || innings.bowlerId,
      balls,
      runsInOver,
      wicketsInOver,
      cumulativeRuns: cumRuns,
      cumulativeWickets: cumWkts,
    };
  });
}

export interface DeliveryInput {
  runsOffBat?: number;
  extraType?: ExtraType;
  extraRuns?: number;
  isBoundary4?: boolean;
  isBoundary6?: boolean;
  isDcl?: boolean;
  isWicket?: boolean;
  wicketType?: WicketType;
  dismissedPlayerId?: string;
  fielderName?: string;
  nextBatterId?: string;
}

export function applyDeliveryToMatch(
  match: CricketMatch,
  input: DeliveryInput,
  teams: Team[]
): CricketMatch {
  const snapshot = {
    currentInningsIndex: match.currentInningsIndex,
    innings: [
      structuredClone(match.innings[0]),
      structuredClone(match.innings[1]),
    ] as [InningsState, InningsState],
    status: match.status,
    resultText: match.resultText,
  };

  const nextMatch: CricketMatch = {
    ...match,
    innings: [
      structuredClone(match.innings[0]),
      structuredClone(match.innings[1]),
    ] as [InningsState, InningsState],
    undoStack: [...match.undoStack.slice(-39), snapshot],
  };

  const inn = nextMatch.innings[nextMatch.currentInningsIndex];
  const extraType: ExtraType = input.extraType ?? 'none';
  const runsOffBat = Math.max(0, Math.floor(input.runsOffBat ?? 0));
  const extraRuns = Math.max(0, Math.floor(input.extraRuns ?? 0));
  const isLegal = extraType !== 'WD' && extraType !== 'NB' && extraType !== 'PENALTY';
  const totalRuns = runsOffBat + extraRuns;
  const currentOver = Math.floor(inn.legalBalls / 6);
  const ballInOver = isLegal ? (inn.legalBalls % 6) + 1 : (inn.legalBalls % 6);

  // Deterministic wagon wheel angle based on ball count & runs
  const angleSeed = (inn.balls.length * 67 + runsOffBat * 43 + 35) % 360;
  const distSeed =
    runsOffBat >= 6 ? 0.94 : runsOffBat === 4 ? 0.88 : runsOffBat > 0 ? 0.56 : 0.28;

  const ballEvent: BallEvent = {
    id: `b_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    over: currentOver,
    ballInOver,
    isLegal,
    runsOffBat,
    extraType,
    extraRuns,
    totalRuns,
    isBoundary4: Boolean(input.isBoundary4 || (runsOffBat === 4 && extraType === 'none')),
    isBoundary6: Boolean(input.isBoundary6 || (runsOffBat === 6 && extraType === 'none')),
    isDcl: Boolean(input.isDcl),
    isWicket: Boolean(input.isWicket),
    wicketType: input.wicketType,
    dismissedPlayerId: input.isWicket ? input.dismissedPlayerId || inn.strikerId : undefined,
    fielderName: input.fielderName,
    strikerId: inn.strikerId,
    nonStrikerId: inn.nonStrikerId,
    bowlerId: inn.bowlerId,
    wagonAngle: angleSeed,
    wagonDistance: distSeed,
    timestamp: Date.now(),
  };

  inn.balls.push(ballEvent);
  inn.runs += totalRuns;
  if (isLegal) inn.legalBalls += 1;

  if (extraType === 'WD') inn.extras.wd += extraRuns;
  if (extraType === 'NB') inn.extras.nb += extraRuns;
  if (extraType === 'LB') inn.extras.lb += extraRuns;
  if (extraType === 'BYE') inn.extras.bye += extraRuns;
  if (extraType === 'PENALTY') inn.extras.penalty += extraRuns;

  if (ballEvent.isWicket) {
    inn.wickets = Math.min(10, inn.wickets + 1);
    const battingTeam = teams.find((t) => t.id === inn.battingTeamId);
    const dismissedId = ballEvent.dismissedPlayerId || inn.strikerId;
    const dismissedPlayer = battingTeam?.players.find((p) => p.id === dismissedId);

    inn.fallOfWickets.push({
      wicketNumber: inn.wickets,
      scoreAtFall: inn.runs,
      oversAtFall: formatOvers(inn.legalBalls),
      playerId: dismissedId,
      playerName: dismissedPlayer?.name || 'Batter',
      wicketType: ballEvent.wicketType || 'Out' as WicketType,
    });

    if (input.nextBatterId) {
      if (!inn.battingOrder.includes(input.nextBatterId)) {
        inn.battingOrder.push(input.nextBatterId);
      }
      if (dismissedId === inn.nonStrikerId) {
        inn.nonStrikerId = input.nextBatterId;
      } else {
        inn.strikerId = input.nextBatterId;
      }
    }
  } else {
    // Rotate strike on odd runs scored off bat / bye / lb
    const runningRuns =
      extraType === 'WD'
        ? Math.max(0, extraRuns - 1)
        : extraType === 'NB'
          ? runsOffBat
          : totalRuns;
    if (runningRuns % 2 === 1 && extraType !== 'PENALTY') {
      const tmp = inn.strikerId;
      inn.strikerId = inn.nonStrikerId;
      inn.nonStrikerId = tmp;
    }
  }

  // End of over strike swap
  if (isLegal && inn.legalBalls > 0 && inn.legalBalls % 6 === 0) {
    const tmp = inn.strikerId;
    inn.strikerId = inn.nonStrikerId;
    inn.nonStrikerId = tmp;
  }

  // Auto-check 2nd innings chase completion
  if (nextMatch.currentInningsIndex === 1 && inn.target !== null) {
    const battingTeam = teams.find((t) => t.id === inn.battingTeamId);
    const bowlingTeam = teams.find((t) => t.id === inn.bowlingTeamId);
    if (inn.runs >= inn.target) {
      inn.completed = true;
      nextMatch.status = 'completed';
      const wktsLeft = Math.max(1, 10 - inn.wickets);
      nextMatch.resultText = `${battingTeam?.name || 'Team 2'} won by ${wktsLeft} wickets`;
    } else if (inn.legalBalls >= inn.maxOvers * 6 || inn.wickets >= 10) {
      inn.completed = true;
      nextMatch.status = 'completed';
      const diff = inn.target - 1 - inn.runs;
      if (diff === 0) {
        nextMatch.resultText = 'Match Tied';
      } else {
        nextMatch.resultText = `${bowlingTeam?.name || 'Team 1'} won by ${diff} runs`;
      }
    }
  } else if (nextMatch.status === 'upcoming') {
    nextMatch.status = 'live';
    nextMatch.resultText = 'Match is going on';
  }

  return nextMatch;
}

export function undoLastDelivery(match: CricketMatch): CricketMatch {
  if (!match.undoStack.length) return match;
  const last = match.undoStack[match.undoStack.length - 1];
  return {
    ...match,
    currentInningsIndex: last.currentInningsIndex,
    innings: last.innings,
    status: last.status,
    resultText: last.resultText,
    undoStack: match.undoStack.slice(0, -1),
  };
}

export function computeTournamentStats(state: CricketSuiteState, tournamentId: string) {
  const tourMatches = state.matches.filter((m) => m.tournamentId === tournamentId);
  const teamMap = new Map(state.teams.map((t) => [t.id, t]));
  const batMap = new Map<
    string,
    {
      playerId: string;
      name: string;
      teamName: string;
      teamShort: string;
      runs: number;
      balls: number;
      fours: number;
      sixes: number;
      innings: number;
      highest: number;
    }
  >();
  const bowlMap = new Map<
    string,
    {
      playerId: string;
      name: string;
      teamName: string;
      teamShort: string;
      wickets: number;
      runs: number;
      legalBalls: number;
      innings: number;
    }
  >();

  for (const m of tourMatches) {
    for (const inn of m.innings) {
      if (!inn.balls.length) continue;
      const batTeam = teamMap.get(inn.battingTeamId);
      const bowlTeam = teamMap.get(inn.bowlingTeamId);

      const batCards = computeBattingCard(inn, batTeam);
      for (const c of batCards) {
        if (c.balls === 0 && c.runs === 0) continue;
        const prev = batMap.get(c.playerId) ?? {
          playerId: c.playerId,
          name: c.name,
          teamName: batTeam?.name || '',
          teamShort: batTeam?.shortName || '',
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          innings: 0,
          highest: 0,
        };
        prev.runs += c.runs;
        prev.balls += c.balls;
        prev.fours += c.fours;
        prev.sixes += c.sixes;
        prev.innings += 1;
        prev.highest = Math.max(prev.highest, c.runs);
        batMap.set(c.playerId, prev);
      }

      const bowlCards = computeBowlingCard(inn, bowlTeam);
      for (const b of bowlCards) {
        if (b.legalBalls === 0 && b.runs === 0) continue;
        const prev = bowlMap.get(b.playerId) ?? {
          playerId: b.playerId,
          name: b.name,
          teamName: bowlTeam?.name || '',
          teamShort: bowlTeam?.shortName || '',
          wickets: 0,
          runs: 0,
          legalBalls: 0,
          innings: 0,
        };
        prev.wickets += b.wickets;
        prev.runs += b.runs;
        prev.legalBalls += b.legalBalls;
        prev.innings += 1;
        bowlMap.set(b.playerId, prev);
      }
    }
  }

  const batters = Array.from(batMap.values()).map((b) => ({
    ...b,
    sr: calcStrikeRate(b.runs, b.balls),
  }));
  const bowlers = Array.from(bowlMap.values()).map((b) => ({
    ...b,
    overs: formatOvers(b.legalBalls),
    eco: calcEconomy(b.runs, b.legalBalls),
  }));

  // MVP score = runs + wickets * 20 + sixes * 3 + fours * 1.5
  const mvpIds = new Set([...batMap.keys(), ...bowlMap.keys()]);
  const mvpList = Array.from(mvpIds)
    .map((pid) => {
      const bat = batMap.get(pid);
      const bowl = bowlMap.get(pid);
      const pts =
        (bat?.runs ?? 0) +
        (bowl?.wickets ?? 0) * 20 +
        (bat?.sixes ?? 0) * 3 +
        Math.round((bat?.fours ?? 0) * 1.5);
      return {
        playerId: pid,
        name: bat?.name || bowl?.name || 'Player',
        teamName: bat?.teamName || bowl?.teamName || '',
        teamShort: bat?.teamShort || bowl?.teamShort || '',
        runs: bat?.runs ?? 0,
        wickets: bowl?.wickets ?? 0,
        points: pts,
      };
    })
    .sort((a, b) => b.points - a.points);

  return {
    topRuns: [...batters].sort((a, b) => b.runs - a.runs).slice(0, 10),
    topWickets: [...bowlers].sort((a, b) => b.wickets - a.wickets || a.runs - b.runs).slice(0, 10),
    topSixes: [...batters].sort((a, b) => b.sixes - a.sixes || b.runs - a.runs).slice(0, 10),
    topFours: [...batters].sort((a, b) => b.fours - a.fours || b.runs - a.runs).slice(0, 10),
    highestScorers: [...batters].sort((a, b) => b.highest - a.highest).slice(0, 10),
    mvpList: mvpList.slice(0, 10),
  };
}

export function computePointTableRows(
  state: CricketSuiteState,
  tournamentId: string
): PointTableEntry[] {
  const existingOverrides = state.pointTableOverrides.filter(
    (r) => r.tournamentId === tournamentId
  );
  if (existingOverrides.length > 0) {
    return [...existingOverrides].sort((a, b) => b.points - a.points || b.nrr - a.nrr);
  }

  const tourTeams = state.teams.filter((t) => t.tournamentId === tournamentId);
  const tourGroups = state.groups.filter((g) => g.tournamentId === tournamentId);
  const completedMatches = state.matches.filter(
    (m) => m.tournamentId === tournamentId && m.status === 'completed'
  );

  return tourTeams
    .map((team) => {
      const grp = tourGroups.find((g) => g.teamIds.includes(team.id));
      let played = 0;
      let won = 0;
      let lost = 0;
      let tied = 0;
      let runsFor = 0;
      let oversFor = 0;
      let runsAgainst = 0;
      let oversAgainst = 0;

      for (const m of completedMatches) {
        if (m.team1Id !== team.id && m.team2Id !== team.id) continue;
        played += 1;
        const myInn = m.innings.find((i) => i.battingTeamId === team.id);
        const oppInn = m.innings.find((i) => i.battingTeamId !== team.id);
        const myRuns = myInn?.runs ?? 0;
        const oppRuns = oppInn?.runs ?? 0;
        runsFor += myRuns;
        oversFor += Math.max(1, (myInn?.legalBalls ?? 6) / 6);
        runsAgainst += oppRuns;
        oversAgainst += Math.max(1, (oppInn?.legalBalls ?? 6) / 6);

        if (myRuns > oppRuns) won += 1;
        else if (myRuns < oppRuns) lost += 1;
        else tied += 1;
      }

      const nrr =
        played > 0
          ? Number(((runsFor / oversFor) - (runsAgainst / oversAgainst)).toFixed(3))
          : 0;
      return {
        teamId: team.id,
        tournamentId,
        groupId: grp?.id ?? '',
        played,
        won,
        lost,
        tied,
        nr: 0,
        points: won * 2 + tied,
        nrr,
      };
    })
    .sort((a, b) => b.points - a.points || b.nrr - a.nrr);
}

function makeRoster(prefix: string, names: string[]): Player[] {
  const roles: Player['role'][] = [
    'Batsman',
    'Batsman',
    'Wicket-Keeper',
    'All-Rounder',
    'All-Rounder',
    'Batsman',
    'All-Rounder',
    'Bowler',
    'Bowler',
    'Bowler',
    'Bowler',
  ];
  return names.map((name, i) => ({
    id: `${prefix}_p${i + 1}`,
    name,
    role: roles[i % roles.length],
    battingStyle: i % 3 === 1 ? 'Left-Hand Bat' : 'Right-Hand Bat',
    bowlingStyle: i >= 7 ? 'Right-Arm Fast' : 'Right-Arm Offbreak',
    jerseyNo: [7, 18, 45, 10, 33, 99, 12, 24, 19, 11, 5][i % 11],
  }));
}

export function createInitialCricketSuiteState(uid: string, userLabel?: string): CricketSuiteState {
  const t1Id = 'tour_hanuman_4';
  const t2Id = 'tour_karjat_champions';

  const team1: Team = {
    id: 'team_chahuchiwadi',
    tournamentId: t1Id,
    name: 'जय हनुमान चाहूचीवाडी',
    shortName: 'JHC',
    place: 'चाहूचीवाडी',
    colorTag: 'Light_yellow',
    players: makeRoster('jhc', [
      'रोहित पाटील',
      'सागर निरगुडा',
      'ओंकार म्हात्रे',
      'प्रथमेश देशमुख',
      'निखिल जाधव',
      'मयूर पवार',
      'संदेश गायकवाड',
      'आकाश भोईर',
      'तेजस कदम',
      'विशाल घरत',
      'शुभम ठाकूर',
    ]),
  };

  const team2: Team = {
    id: 'team_neral_strikers',
    tournamentId: t1Id,
    name: 'नेरळ स्ट्रायकर्स',
    shortName: 'NST',
    place: 'नेरळ',
    colorTag: 'Blue',
    players: makeRoster('nst', [
      'प्रतीक भोईर',
      'सिद्धेश कांबळे',
      'अनिकेत राऊत',
      'सौरभ शिंदे',
      'हर्षल मोरे',
      'केतन तांबे',
      'गौरव पाटील',
      'अक्षय साळवी',
      'अभिषेक नाईक',
      'रोहन चव्हाण',
      'दिपक सावंत',
    ]),
  };

  const team3: Team = {
    id: 'team_karjat_kings',
    tournamentId: t1Id,
    name: 'कर्जत किंग्ज XI',
    shortName: 'KKX',
    place: 'कर्जत',
    colorTag: 'Light_pink',
    players: makeRoster('kkx', [
      'सूरज जाधव',
      'वैभव भगत',
      'गणेश पाटील',
      'करण म्हात्रे',
      'योगेश शेलार',
      'अमोल धुमाळ',
      'मंगेश कदम',
      'सचिन पवार',
      'प्रणय देशमुख',
      'निलेश राणे',
      'सुनील भोईर',
    ]),
  };

  const team4: Team = {
    id: 'team_matheran_warriors',
    tournamentId: t1Id,
    name: 'माथेरान वॉरियर्स',
    shortName: 'MTW',
    place: 'माथेरान',
    colorTag: 'Light_brown',
    players: makeRoster('mtw', [
      'अविनाश पवार',
      'चेतन मोरे',
      'राहुल काळे',
      'नितीन शिंदे',
      'स्वप्निल जाधव',
      'प्रसाद पाटील',
      'विकास म्हात्रे',
      'तुषार कदम',
      'अमित भगत',
      'विजय गायकवाड',
      'महेश सावंत',
    ]),
  };

  const team5: Team = {
    id: 'team_badlapur_titans',
    tournamentId: t1Id,
    name: 'बदलापूर टायटन्स',
    shortName: 'BDT',
    place: 'बदलापूर',
    colorTag: 'Light_blue',
    players: makeRoster('bdt', [
      'आदित्य जोशी',
      'किरण देशमुख',
      'सुमित पाटील',
      'पंकज राऊत',
      'अजय भोईर',
      'राजेश ठाकूर',
      'विवेक मोरे',
      'समीर कांबळे',
      'अर्जुन शिंदे',
      'मनोज पवार',
      'दीपक म्हात्रे',
    ]),
  };

  const team6: Team = {
    id: 'team_sahyadri_stars',
    tournamentId: t1Id,
    name: 'सह्याद्री स्टार्स',
    shortName: 'SHS',
    place: 'कळंब',
    colorTag: 'Defoult',
    players: makeRoster('shs', [
      'भारत निरगुडा',
      'रोशन पाटील',
      'विशाल म्हात्रे',
      'आकाश जाधव',
      'साहिल पवार',
      'निखिल भोईर',
      'संदिप कदम',
      'सौरभ गायकवाड',
      'प्रविण शिंदे',
      'अंकुश मोरे',
      'संतोष राऊत',
    ]),
  };

  const teams = [team1, team2, team3, team4, team5, team6];

  // Build realistic live match (MATCH 7 - QUALIFIER-1, DAY 4)
  const mkBall = (
    idx: number,
    over: number,
    ballInOver: number,
    runsOffBat: number,
    strikerId: string,
    nonStrikerId: string,
    bowlerId: string,
    opts?: Partial<BallEvent>
  ): BallEvent => {
    const extraType = opts?.extraType ?? 'none';
    const extraRuns = opts?.extraRuns ?? 0;
    const isLegal = extraType !== 'WD' && extraType !== 'NB' && extraType !== 'PENALTY';
    return {
      id: `seed_b_${idx}`,
      over,
      ballInOver,
      isLegal,
      runsOffBat,
      extraType,
      extraRuns,
      totalRuns: runsOffBat + extraRuns,
      isBoundary4: runsOffBat === 4 && extraType === 'none',
      isBoundary6: runsOffBat === 6 && extraType === 'none',
      isWicket: Boolean(opts?.isWicket),
      wicketType: opts?.wicketType,
      dismissedPlayerId: opts?.dismissedPlayerId,
      fielderName: opts?.fielderName,
      strikerId,
      nonStrikerId,
      bowlerId,
      wagonAngle: (idx * 53 + 25) % 360,
      wagonDistance: runsOffBat >= 6 ? 0.94 : runsOffBat === 4 ? 0.87 : 0.52,
      timestamp: Date.now() - (40 - idx) * 20000,
    };
  };

  // Match 7 - 1st innings complete: JHC scored 68/3 in 5.0 overs
  const m7Inn1Balls: BallEvent[] = [
    mkBall(1, 0, 1, 4, 'jhc_p1', 'jhc_p2', 'nst_p8'),
    mkBall(2, 0, 2, 1, 'jhc_p1', 'jhc_p2', 'nst_p8'),
    mkBall(3, 0, 3, 6, 'jhc_p2', 'jhc_p1', 'nst_p8'),
    mkBall(4, 0, 4, 0, 'jhc_p2', 'jhc_p1', 'nst_p8'),
    mkBall(5, 0, 5, 2, 'jhc_p2', 'jhc_p1', 'nst_p8'),
    mkBall(6, 0, 6, 4, 'jhc_p2', 'jhc_p1', 'nst_p8'),
    // Over 2
    mkBall(7, 1, 1, 1, 'jhc_p1', 'jhc_p2', 'nst_p9'),
    mkBall(8, 1, 2, 0, 'jhc_p2', 'jhc_p1', 'nst_p9', {
      isWicket: true,
      wicketType: 'Caught',
      dismissedPlayerId: 'jhc_p2',
      fielderName: 'प्रतीक भोईर',
    }),
    mkBall(9, 1, 3, 4, 'jhc_p3', 'jhc_p1', 'nst_p9'),
    mkBall(10, 1, 3, 0, 'jhc_p3', 'jhc_p1', 'nst_p9', { extraType: 'WD', extraRuns: 1 }),
    mkBall(11, 1, 4, 1, 'jhc_p3', 'jhc_p1', 'nst_p9'),
    mkBall(12, 1, 5, 6, 'jhc_p1', 'jhc_p3', 'nst_p9'),
    mkBall(13, 1, 6, 2, 'jhc_p1', 'jhc_p3', 'nst_p9'),
    // Over 3
    mkBall(14, 2, 1, 6, 'jhc_p3', 'jhc_p1', 'nst_p10'),
    mkBall(15, 2, 2, 4, 'jhc_p3', 'jhc_p1', 'nst_p10'),
    mkBall(16, 2, 3, 0, 'jhc_p3', 'jhc_p1', 'nst_p10', {
      isWicket: true,
      wicketType: 'Bowled',
      dismissedPlayerId: 'jhc_p3',
    }),
    mkBall(17, 2, 4, 1, 'jhc_p4', 'jhc_p1', 'nst_p10'),
    mkBall(18, 2, 5, 4, 'jhc_p1', 'jhc_p4', 'nst_p10'),
    mkBall(19, 2, 6, 1, 'jhc_p1', 'jhc_p4', 'nst_p10'),
    // Over 4
    mkBall(20, 3, 1, 2, 'jhc_p1', 'jhc_p4', 'nst_p11'),
    mkBall(21, 3, 2, 6, 'jhc_p1', 'jhc_p4', 'nst_p11'),
    mkBall(22, 3, 3, 1, 'jhc_p1', 'jhc_p4', 'nst_p11'),
    mkBall(23, 3, 4, 0, 'jhc_p4', 'jhc_p1', 'nst_p11', {
      isWicket: true,
      wicketType: 'Run Out',
      dismissedPlayerId: 'jhc_p4',
      fielderName: 'अक्षय साळवी',
    }),
    mkBall(24, 3, 5, 2, 'jhc_p5', 'jhc_p1', 'nst_p11'),
    mkBall(25, 3, 6, 4, 'jhc_p5', 'jhc_p1', 'nst_p11'),
    // Over 5
    mkBall(26, 4, 1, 1, 'jhc_p1', 'jhc_p5', 'nst_p8'),
    mkBall(27, 4, 2, 0, 'jhc_p5', 'jhc_p1', 'nst_p8'),
    mkBall(28, 4, 3, 1, 'jhc_p5', 'jhc_p1', 'nst_p8'),
    mkBall(29, 4, 4, 2, 'jhc_p1', 'jhc_p5', 'nst_p8'),
    mkBall(30, 4, 5, 1, 'jhc_p1', 'jhc_p5', 'nst_p8'),
    mkBall(31, 4, 6, 0, 'jhc_p5', 'jhc_p1', 'nst_p8'),
  ];

  // Match 7 - 2nd innings live: NST chasing 69, currently 34/1 in 2.3 overs
  const m7Inn2Balls: BallEvent[] = [
    mkBall(32, 0, 1, 4, 'nst_p1', 'nst_p2', 'jhc_p8'),
    mkBall(33, 0, 2, 1, 'nst_p1', 'nst_p2', 'jhc_p8'),
    mkBall(34, 0, 3, 6, 'nst_p2', 'nst_p1', 'jhc_p8'),
    mkBall(35, 0, 4, 0, 'nst_p2', 'nst_p1', 'jhc_p8'),
    mkBall(36, 0, 5, 2, 'nst_p2', 'nst_p1', 'jhc_p8'),
    mkBall(37, 0, 6, 1, 'nst_p2', 'nst_p1', 'jhc_p8'),
    // Over 2
    mkBall(38, 1, 1, 6, 'nst_p2', 'nst_p1', 'jhc_p9'),
    mkBall(39, 1, 2, 0, 'nst_p2', 'nst_p1', 'jhc_p9', {
      isWicket: true,
      wicketType: 'Caught',
      dismissedPlayerId: 'nst_p2',
      fielderName: 'रोहित पाटील',
    }),
    mkBall(40, 1, 3, 1, 'nst_p3', 'nst_p1', 'jhc_p9'),
    mkBall(41, 1, 4, 4, 'nst_p1', 'nst_p3', 'jhc_p9'),
    mkBall(42, 1, 5, 1, 'nst_p1', 'nst_p3', 'jhc_p9'),
    mkBall(43, 1, 6, 0, 'nst_p3', 'nst_p1', 'jhc_p9'),
    // Over 3 (in progress: 3 balls)
    mkBall(44, 2, 1, 4, 'nst_p1', 'nst_p3', 'jhc_p10'),
    mkBall(45, 2, 2, 0, 'nst_p1', 'nst_p3', 'jhc_p10', { extraType: 'WD', extraRuns: 1 }),
    mkBall(46, 2, 2, 2, 'nst_p1', 'nst_p3', 'jhc_p10'),
    mkBall(47, 2, 3, 1, 'nst_p1', 'nst_p3', 'jhc_p10'),
  ];

  const liveMatch: CricketMatch = {
    id: 'match_7',
    tournamentId: t1Id,
    stageBadge: 'QUALIFIER-1',
    dayLabel: 'DAY 4',
    matchLabel: 'MATCH 7',
    team1Id: team1.id,
    team2Id: team2.id,
    dateLabel: 'Sun, 15 November',
    startsAt: '04:15 PM',
    endsAt: '05:30 PM',
    tossWinnerId: team1.id,
    tossDecision: 'Bat',
    oversPerInnings: 5,
    status: 'live',
    resultText: 'Match is going on',
    currentInningsIndex: 1,
    playingXI1: team1.players.map((p) => p.id),
    playingXI2: team2.players.map((p) => p.id),
    playerOfMatchId: 'jhc_p1',
    undoStack: [],
    innings: [
      {
        battingTeamId: team1.id,
        bowlingTeamId: team2.id,
        runs: m7Inn1Balls.reduce((s, b) => s + b.totalRuns, 0),
        wickets: 3,
        legalBalls: 30,
        maxOvers: 5,
        target: null,
        extras: { wd: 1, nb: 0, lb: 0, bye: 0, penalty: 0 },
        strikerId: 'jhc_p1',
        nonStrikerId: 'jhc_p5',
        bowlerId: 'nst_p8',
        battingOrder: ['jhc_p1', 'jhc_p2', 'jhc_p3', 'jhc_p4', 'jhc_p5'],
        balls: m7Inn1Balls,
        fallOfWickets: [
          {
            wicketNumber: 1,
            scoreAtFall: 18,
            oversAtFall: '1.2',
            playerId: 'jhc_p2',
            playerName: 'सागर निरगुडा',
            wicketType: 'Caught',
          },
          {
            wicketNumber: 2,
            scoreAtFall: 42,
            oversAtFall: '2.3',
            playerId: 'jhc_p3',
            playerName: 'ओंकार म्हात्रे',
            wicketType: 'Bowled',
          },
          {
            wicketNumber: 3,
            scoreAtFall: 57,
            oversAtFall: '3.4',
            playerId: 'jhc_p4',
            playerName: 'प्रथमेश देशमुख',
            wicketType: 'Run Out',
          },
        ],
        completed: true,
      },
      {
        battingTeamId: team2.id,
        bowlingTeamId: team1.id,
        runs: m7Inn2Balls.reduce((s, b) => s + b.totalRuns, 0),
        wickets: 1,
        legalBalls: 15,
        maxOvers: 5,
        target: m7Inn1Balls.reduce((s, b) => s + b.totalRuns, 0) + 1,
        extras: { wd: 1, nb: 0, lb: 0, bye: 0, penalty: 0 },
        strikerId: 'nst_p3',
        nonStrikerId: 'nst_p1',
        bowlerId: 'jhc_p10',
        battingOrder: ['nst_p1', 'nst_p2', 'nst_p3'],
        balls: m7Inn2Balls,
        fallOfWickets: [
          {
            wicketNumber: 1,
            scoreAtFall: 20,
            oversAtFall: '1.2',
            playerId: 'nst_p2',
            playerName: 'सिद्धेश कांबळे',
            wicketType: 'Caught',
          },
        ],
        completed: false,
      },
    ],
  };

  // Match 6 - Completed match: Karjat Kings XI won by 5 runs vs Matheran Warriors
  const m6Inn1Balls: BallEvent[] = [
    mkBall(101, 0, 1, 6, 'kkx_p1', 'kkx_p2', 'mtw_p8'),
    mkBall(102, 0, 2, 4, 'kkx_p1', 'kkx_p2', 'mtw_p8'),
    mkBall(103, 0, 3, 2, 'kkx_p1', 'kkx_p2', 'mtw_p8'),
    mkBall(104, 0, 4, 6, 'kkx_p1', 'kkx_p2', 'mtw_p8'),
    mkBall(105, 0, 5, 1, 'kkx_p1', 'kkx_p2', 'mtw_p8'),
    mkBall(106, 0, 6, 4, 'kkx_p2', 'kkx_p1', 'mtw_p8'),
    mkBall(107, 1, 1, 6, 'kkx_p1', 'kkx_p2', 'mtw_p9'),
    mkBall(108, 1, 2, 4, 'kkx_p1', 'kkx_p2', 'mtw_p9'),
    mkBall(109, 1, 3, 0, 'kkx_p1', 'kkx_p2', 'mtw_p9', {
      isWicket: true,
      wicketType: 'Bowled',
      dismissedPlayerId: 'kkx_p1',
    }),
    mkBall(110, 1, 4, 6, 'kkx_p3', 'kkx_p2', 'mtw_p9'),
    mkBall(111, 1, 5, 4, 'kkx_p3', 'kkx_p2', 'mtw_p9'),
    mkBall(112, 1, 6, 2, 'kkx_p3', 'kkx_p2', 'mtw_p9'),
  ];

  const m6Inn2Balls: BallEvent[] = [
    mkBall(201, 0, 1, 4, 'mtw_p1', 'mtw_p2', 'kkx_p8'),
    mkBall(202, 0, 2, 6, 'mtw_p1', 'mtw_p2', 'kkx_p8'),
    mkBall(203, 0, 3, 1, 'mtw_p1', 'mtw_p2', 'kkx_p8'),
    mkBall(204, 0, 4, 4, 'mtw_p2', 'mtw_p1', 'kkx_p8'),
    mkBall(205, 0, 5, 2, 'mtw_p2', 'mtw_p1', 'kkx_p8'),
    mkBall(206, 0, 6, 1, 'mtw_p2', 'mtw_p1', 'kkx_p8'),
    mkBall(207, 1, 1, 6, 'mtw_p2', 'mtw_p1', 'kkx_p9'),
    mkBall(208, 1, 2, 4, 'mtw_p2', 'mtw_p1', 'kkx_p9'),
    mkBall(209, 1, 3, 0, 'mtw_p2', 'mtw_p1', 'kkx_p9', {
      isWicket: true,
      wicketType: 'Caught',
      dismissedPlayerId: 'mtw_p2',
      fielderName: 'सूरज जाधव',
    }),
    mkBall(210, 1, 4, 6, 'mtw_p3', 'mtw_p1', 'kkx_p9'),
    mkBall(211, 1, 5, 4, 'mtw_p3', 'mtw_p1', 'kkx_p9'),
    mkBall(212, 1, 6, 2, 'mtw_p3', 'mtw_p1', 'kkx_p9'),
  ];

  const completedMatch: CricketMatch = {
    id: 'match_6',
    tournamentId: t1Id,
    stageBadge: 'QUATER',
    dayLabel: 'DAY 4',
    matchLabel: 'MATCH 6',
    team1Id: team3.id,
    team2Id: team4.id,
    dateLabel: 'Sun, 15 November',
    startsAt: '02:30 PM',
    endsAt: '03:55 PM',
    tossWinnerId: team3.id,
    tossDecision: 'Bat',
    oversPerInnings: 2,
    status: 'completed',
    resultText: 'कर्जत किंग्ज XI won by 5 runs',
    currentInningsIndex: 1,
    playingXI1: team3.players.map((p) => p.id),
    playingXI2: team4.players.map((p) => p.id),
    playerOfMatchId: 'kkx_p1',
    undoStack: [],
    innings: [
      {
        battingTeamId: team3.id,
        bowlingTeamId: team4.id,
        runs: 45,
        wickets: 1,
        legalBalls: 12,
        maxOvers: 2,
        target: null,
        extras: { wd: 0, nb: 0, lb: 0, bye: 0, penalty: 0 },
        strikerId: 'kkx_p3',
        nonStrikerId: 'kkx_p2',
        bowlerId: 'mtw_p9',
        battingOrder: ['kkx_p1', 'kkx_p2', 'kkx_p3'],
        balls: m6Inn1Balls,
        fallOfWickets: [
          {
            wicketNumber: 1,
            scoreAtFall: 33,
            oversAtFall: '1.3',
            playerId: 'kkx_p1',
            playerName: 'सूरज जाधव',
            wicketType: 'Bowled',
          },
        ],
        completed: true,
      },
      {
        battingTeamId: team4.id,
        bowlingTeamId: team3.id,
        runs: 40,
        wickets: 1,
        legalBalls: 12,
        maxOvers: 2,
        target: 46,
        extras: { wd: 0, nb: 0, lb: 0, bye: 0, penalty: 0 },
        strikerId: 'mtw_p3',
        nonStrikerId: 'mtw_p1',
        bowlerId: 'kkx_p9',
        battingOrder: ['mtw_p1', 'mtw_p2', 'mtw_p3'],
        balls: m6Inn2Balls,
        fallOfWickets: [
          {
            wicketNumber: 1,
            scoreAtFall: 28,
            oversAtFall: '1.3',
            playerId: 'mtw_p2',
            playerName: 'चेतन मोरे',
            wicketType: 'Caught',
          },
        ],
        completed: true,
      },
    ],
  };

  // Match 5 - Upcoming / General Match
  const generalMatch: CricketMatch = {
    id: 'match_5',
    tournamentId: t1Id,
    stageBadge: 'GENERAL',
    dayLabel: 'DAY 4',
    matchLabel: 'MATCH 5',
    team1Id: team5.id,
    team2Id: team6.id,
    dateLabel: 'Sun, 15 November',
    startsAt: '05:45 PM',
    endsAt: '07:00 PM',
    tossWinnerId: team5.id,
    tossDecision: 'Bat',
    oversPerInnings: 5,
    status: 'upcoming',
    resultText: 'Match scheduled · Toss Ready',
    currentInningsIndex: 0,
    playingXI1: team5.players.map((p) => p.id),
    playingXI2: team6.players.map((p) => p.id),
    playerOfMatchId: 'shs_p1',
    undoStack: [],
    innings: [
      {
        battingTeamId: team5.id,
        bowlingTeamId: team6.id,
        runs: 0,
        wickets: 0,
        legalBalls: 0,
        maxOvers: 5,
        target: null,
        extras: { wd: 0, nb: 0, lb: 0, bye: 0, penalty: 0 },
        strikerId: team5.players[0].id,
        nonStrikerId: team5.players[1].id,
        bowlerId: team6.players[7].id,
        battingOrder: [team5.players[0].id, team5.players[1].id],
        balls: [],
        fallOfWickets: [],
        completed: false,
      },
      {
        battingTeamId: team6.id,
        bowlingTeamId: team5.id,
        runs: 0,
        wickets: 0,
        legalBalls: 0,
        maxOvers: 5,
        target: null,
        extras: { wd: 0, nb: 0, lb: 0, bye: 0, penalty: 0 },
        strikerId: team6.players[0].id,
        nonStrikerId: team6.players[1].id,
        bowlerId: team5.players[7].id,
        battingOrder: [team6.players[0].id, team6.players[1].id],
        balls: [],
        fallOfWickets: [],
        completed: false,
      },
    ],
  };

  return {
    version: 1,
    updatedAt: Date.now(),
    uid,
    user: {
      userName: userLabel || 'Bharat Nirguda (Star Event Live)',
      userEmail: 'stareventlive01@gmail.com',
      userMobile: '9890175727',
      userTheme: 'star-red-gold',
      subscriptionStartDate: '01-Nov-2026',
      subscriptionEndDate: '31-Oct-2027',
      planName: 'Yearly',
      balanceTournaments: 24,
      channelTitle: 'STAR EVENT LIVE',
      channelLogoUrl: '',
      defaultOvers: 5,
      watermarkText: 'STAREVENT.LIVE',
    },
    activeTournamentId: t1Id,
    activeMatchId: liveMatch.id,
    tournaments: [
      {
        id: t1Id,
        name: 'जय हनुमान क्रिकेट संघ चाहूचीवाडी पर्व 4',
        shortName: 'JHCS पर्व 4',
        location: 'चाहूचीवाडी, कर्जत',
        oversPerInnings: 5,
        startDate: '12 Nov 2026',
        endDate: '16 Nov 2026',
        isActive: true,
        status: 'active',
      },
      {
        id: t2Id,
        name: 'Star Event Live Champions Trophy 2026',
        shortName: 'SEL CT-26',
        location: 'नेरळ - कर्जत',
        oversPerInnings: 6,
        startDate: '01 Dec 2026',
        endDate: '06 Dec 2026',
        isActive: false,
        status: 'upcoming',
      },
    ],
    groups: [
      {
        id: 'grp_a',
        tournamentId: t1Id,
        name: 'Group A',
        teamIds: [team1.id, team2.id, team3.id],
      },
      {
        id: 'grp_b',
        tournamentId: t1Id,
        name: 'Group B',
        teamIds: [team4.id, team5.id, team6.id],
      },
    ],
    teams,
    matches: [liveMatch, completedMatch, generalMatch],
    pointTableOverrides: [],
    fieldPositions: DEFAULT_FIELD_POSITIONS.map((spot, idx) => ({
      ...spot,
      playerId: team1.players[idx]?.id ?? null,
    })),
    overlay: {
      showPlayerPhoto: false,
      showTeamLogo: false,
      showChannelLogo: false,
      autoTransition: false,
      bottomScoreMode: 'EMPTY',
      mainCard: { kind: 'NONE' },
      activeTransition: null,
      selectedBatsmanId: '',
      selectedBowlerId: '',
      selectedTeamForStatsId: '',
      selectedTeamPlayerId: '',
      selectedPomPlayerId: '',
      customMsgTab: 'CUSTOM MSG',
      customMsgHeading: '',
      customMsgDescription: '',
    },
  };
}
