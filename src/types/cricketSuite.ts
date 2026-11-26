export type TeamColorTag =
  | 'Light_yellow'
  | 'Light_brown'
  | 'Light_pink'
  | 'Blue'
  | 'Light_blue'
  | 'Defoult'
  | 'Crimson_red'
  | 'Metallic_gold'
  | 'Emerald_green'
  | 'Royal_purple';

export type PlayerRole = 'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket-Keeper';

export type MatchStageBadge =
  | 'LEAGUE'
  | 'GENERAL'
  | 'QUATER'
  | 'SEMI FINAL'
  | 'FINAL'
  | 'QUALIFIER-1'
  | 'QUALIFIER-2'
  | 'ELIMINATOR';

export type BallType = 'Tennis' | 'Leather' | 'Soft Tennis' | 'Rubber';

export type TournamentType =
  | 'League + Knockout'
  | 'Knockout'
  | 'League'
  | 'Tri-Series'
  | 'Bilateral';

export type MatchFormat = 'T10' | 'T20' | 'Limited Overs' | 'Box Cricket' | 'ODI';

export type ExtraType = 'none' | 'WD' | 'NB' | 'LB' | 'BYE' | 'PENALTY';

export const WICKET_TYPES = [
  'Bowled',
  'Caught',
  'C & B',
  'LBW',
  'Run Out',
  'Stumped',
  'Hit Wicket',
  'Retired Hurt',
  'Time Out',
  'Retired Out',
  'Obstructing the Field',
  'Mankad Runout',
  'Hit Ball Twice',
] as const;

export type WicketType = (typeof WICKET_TYPES)[number];

export type OverlayThemeId = 'tata-ipl-2022';

export interface CustomThemeColors {
  enabled: boolean;
  primary: string;
  secondary: string;
  accent: string;
}

export interface UserAccountDetails {
  userName: string;
  userEmail: string;
  userMobile: string;
  userTheme: OverlayThemeId;
  customThemeColors: CustomThemeColors;
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  planName: string;
  balanceTournaments: number;
  channelTitle: string;
  channelLogoUrl: string;
  defaultOvers: number;
  watermarkText: string;
}

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  battingStyle: string;
  bowlingStyle: string;
  jerseyNo: number;
  photoUrl?: string;
  isCaptain?: boolean;
  isWicketKeeper?: boolean;
}

export interface Team {
  id: string;
  tournamentId: string;
  name: string;
  shortName: string;
  place: string;
  colorTag: TeamColorTag;
  customColor?: string;
  textColor?: string;
  logoUrl?: string;
  players: Player[];
}

export interface TournamentGroup {
  id: string;
  tournamentId: string;
  name: string;
  teamIds: string[];
}

export interface Tournament {
  id: string;
  name: string;
  shortName: string;
  logoUrl?: string;
  location: string;
  tournamentType: TournamentType;
  ballType: BallType;
  matchFormat: MatchFormat;
  oversPerInnings: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  status: 'active' | 'completed' | 'upcoming';
}

export interface BallEvent {
  id: string;
  over: number; // 0-indexed over number
  ballInOver: number; // 1..6 for legal balls
  isLegal: boolean;
  runsOffBat: number;
  extraType: ExtraType;
  extraRuns: number;
  totalRuns: number;
  isBoundary4: boolean;
  isBoundary6: boolean;
  isDcl?: boolean;
  isWicket: boolean;
  wicketType?: WicketType;
  dismissedPlayerId?: string;
  fielderName?: string;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  wagonAngle: number; // 0-359 degrees
  wagonDistance: number; // 0.25-0.96
  timestamp: number;
}

export interface FallOfWicket {
  wicketNumber: number;
  scoreAtFall: number;
  oversAtFall: string;
  playerId: string;
  playerName: string;
  wicketType: WicketType;
}

export interface InningsState {
  battingTeamId: string;
  bowlingTeamId: string;
  runs: number;
  wickets: number;
  legalBalls: number;
  maxOvers: number;
  target: number | null;
  extras: {
    wd: number;
    nb: number;
    lb: number;
    bye: number;
    penalty: number;
  };
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  battingOrder: string[];
  balls: BallEvent[];
  fallOfWickets: FallOfWicket[];
  completed: boolean;
  manualRunsOffset?: number;
  manualWicketsOffset?: number;
  battingStatOffsets?: Record<
    string,
    { runs: number; balls: number; fours: number; sixes: number }
  >;
  bowlingStatOffsets?: Record<
    string,
    { legalBalls: number; maidens: number; runs: number; wickets: number }
  >;
  pendingBowlerChange?: boolean;
  lastCompletedOverNumber?: number;
  previousOverBowlerId?: string;
  pendingNewBatter?: boolean;
  pendingBatterSlot?: 'striker' | 'nonStriker';
}

export type MatchStatus = 'not_started' | 'live' | 'innings_break' | 'completed';

export interface MatchSnapshot {
  currentInningsIndex: 0 | 1;
  innings: [InningsState, InningsState];
  status: MatchStatus;
  resultText: string;
}

export interface CricketMatch {
  id: string;
  tournamentId: string;
  groupId?: string;
  stageBadge: MatchStageBadge;
  dayLabel: string;
  matchLabel: string;
  team1Id: string;
  team2Id: string;
  dateLabel: string;
  startsAt: string;
  endsAt: string;
  venue: string;
  ballType: BallType;
  tossWinnerId: string;
  tossDecision: 'Bat' | 'Bowl';
  tossCompleted?: boolean;
  oversPerInnings: number;
  status: MatchStatus;
  matchCompletedConfirmed?: boolean;
  resultText: string;
  currentInningsIndex: 0 | 1;
  innings: [InningsState, InningsState];
  playingXI1: string[];
  playingXI2: string[];
  playerOfMatchId: string;
  undoStack: MatchSnapshot[];
  createdAt?: number;
}

export interface PointTableEntry {
  teamId: string;
  tournamentId: string;
  groupId: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  nr: number;
  points: number;
  nrr: number;
}

export interface PointTableAuditEntry {
  id: string;
  timestamp: number;
  tournamentId: string;
  teamId: string;
  teamName: string;
  actor: string;
  summary: string;
  reason: string;
}

export interface FieldPositionSpot {
  id: string;
  label: string;
  x: number;
  y: number;
  playerId: string | null;
}

export const BOTTOM_SCORE_MODES = [
  'EMPTY',
  'Score',
  'Bottom Need',
  'Last 15 Balls',
  'Toss',
  'Need',
  'Versus',
  'Versus With Logo',
  'Current Partnership',
  'Result',
  'Projected Score',
  'Mini Curr. Partnership',
  'Mini Match Comparison',
  'Mini Player Position',
  "6's",
  "4's",
  'Tournament Name',
  'Last Wicket',
  'Last Bowler',
] as const;

export type BottomScoreMode = (typeof BOTTOM_SCORE_MODES)[number];

export const MATCH_STATS_MODES = [
  'Batting card',
  'Mini Batting card',
  'Bowling card',
  'Mini Bowling card',
  '1st inn Batting card',
  '1st inn Bowling card',
  '1st Inn Wagonwheel',
  '2nd Inn Wagonwheel',
  'Player Position',
  '1st Inn Runs Map',
  '2nd Inn Runs Map',
  '1st Inn Runs Wagonwheel',
  '2nd Inn Runs Wagonwheel',
  'Batting Playing XI',
  'Bowling Playing XI',
  'Both Playing XI',
  'Match Summary',
  'Match Comparison',
] as const;

export type MatchStatsMode = (typeof MATCH_STATS_MODES)[number];

export const BATSMAN_STATS_MODES = [
  'profile',
  'Name',
  'batsman',
  'tournament',
  'Wagon Wheel',
  'Tournament Wagon Wheel',
  'Against Teams',
  'Highlight',
  'Head Batsman Curr.',
  'Head Batsman Tour.',
  'Head Last Ball',
] as const;

export type BatsmanStatsMode = (typeof BATSMAN_STATS_MODES)[number];

export const BOWLER_STATS_MODES = [
  'profile',
  'Name',
  'bowler',
  'tournament',
  'Against Teams',
  'Highlight',
  'Head Bowler Curr.',
  'Head Bowler Tour.',
  'Head Last Ball',
] as const;

export type BowlerStatsMode = (typeof BOWLER_STATS_MODES)[number];

export const TRANSITION_OVERLAYS = [
  'Six',
  'Four',
  'Wicket',
  'Wide',
  'Noball',
  'Free Hit',
  'Fair Delivery',
] as const;

export type TransitionOverlayType = (typeof TRANSITION_OVERLAYS)[number];

export const HIGHLIGHT_MODES = [
  '1st inning',
  '2nd inning',
  '1st inn FOW',
  '2nd inn FOW',
  'CR Partnership',
] as const;

export type HighlightMode = (typeof HIGHLIGHT_MODES)[number];

export const TOURNAMENT_STAT_MODES = [
  'T10 batsman',
  'T10 wickets',
  'T10 6s',
  'T10 4s',
  'T10 Highest Scorer',
  'T10 Valuable Player',
] as const;

export type TournamentStatMode = (typeof TOURNAMENT_STAT_MODES)[number];

export type MainOverlayCard =
  | { kind: 'NONE' }
  | { kind: 'MATCH_STATS'; mode: MatchStatsMode }
  | { kind: 'BATSMAN_STATS'; mode: BatsmanStatsMode; playerId: string }
  | { kind: 'BOWLER_STATS'; mode: BowlerStatsMode; playerId: string }
  | { kind: 'HIGHLIGHTS'; mode: HighlightMode }
  | { kind: 'GRAPHS'; mode: 'manhatt' | 'worm' }
  | { kind: 'POINTS_TABLE'; groupId: string | 'ALL' }
  | { kind: 'DAY_WISE'; day: string }
  | { kind: 'CUSTOM_MESSAGE'; tab: 'CUSTOM MSG' | 'OTHER'; heading: string; description: string }
  | { kind: 'TOURNAMENT_STATS'; mode: TournamentStatMode }
  | {
      kind: 'TEAM_PLAYER_STATS';
      teamId: string;
      playerId: string;
      category: 'batting' | 'bowling';
      mode: string;
    }
  | { kind: 'PLAYER_OF_MATCH'; playerId: string; display: 'Name' | 'Stats' };

export interface OverlayControlState {
  showPlayerPhoto: boolean;
  showTeamLogo: boolean;
  showChannelLogo: boolean;
  autoTransition: boolean;
  bottomScoreMode: BottomScoreMode;
  mainCard: MainOverlayCard;
  activeTransition: {
    type: TransitionOverlayType;
    id: number;
  } | null;
  selectedBatsmanId: string;
  selectedBowlerId: string;
  selectedTeamForStatsId: string;
  selectedTeamPlayerId: string;
  selectedPomPlayerId: string;
  customMsgTab: 'CUSTOM MSG' | 'OTHER';
  customMsgHeading: string;
  customMsgDescription: string;
}

export interface CricketSuiteState {
  version: number;
  updatedAt: number;
  revision?: number;
  lastModifiedByDevice?: string;
  uid: string;
  user: UserAccountDetails;
  activeTournamentId: string;
  activeMatchId: string;
  tournaments: Tournament[];
  groups: TournamentGroup[];
  teams: Team[];
  matches: CricketMatch[];
  pointTableOverrides: PointTableEntry[];
  pointTableAuditLog: PointTableAuditEntry[];
  fieldPositions: FieldPositionSpot[];
  overlay: OverlayControlState;
}

export type SidebarRoute =
  | 'home'
  | 'kabaddi'
  | 'tournament'
  | 'tournament-groups'
  | 'tournament-teams'
  | 'team'
  | 'match'
  | 'scoring'
  | 'overlay'
  | 'point-table'
  | 'runrate'
  | 'player-position'
  | 'theme'
  | 'statistics'
  | 'setting'
  | 'account';
