import type { KabaddiHalf } from './overlay';

export type KabaddiTeamSide = 'A' | 'B';

export type KabaddiCalloutType =
  | 'SUPER RAID'
  | 'SUPER TACKLE'
  | 'ALL OUT'
  | 'DO OR DIE'
  | 'BONUS';

export interface KabaddiBroadcastCallout {
  id: number;
  type: KabaddiCalloutType;
  team: KabaddiTeamSide | null;
  label: string;
  sublabel?: string;
  expiresAt: number;
}

export interface SupabaseKabaddiState {
  matchId: string;
  sport: 'kabaddi';
  tournamentTitle: string;
  subtitle: string;

  teamAName: string;
  teamACode: string;
  teamAColor: string;
  teamAScore: number;
  teamARaidPoints: number;
  teamABonusPoints: number;
  teamATacklePoints: number;
  teamALonaPoints: number;
  teamAPlayersOnMat: number;

  teamBName: string;
  teamBCode: string;
  teamBColor: string;
  teamBScore: number;
  teamBRaidPoints: number;
  teamBBonusPoints: number;
  teamBTacklePoints: number;
  teamBLonaPoints: number;
  teamBPlayersOnMat: number;

  half: KabaddiHalf;
  matchSeconds: number;
  matchRunning: boolean;
  matchUpdatedAt: number;

  raidSeconds: number;
  raidDuration: number;
  raidRunning: boolean;
  raidUpdatedAt: number;

  doOrDie: boolean;
  doOrDieTeam: KabaddiTeamSide | null;

  callout: KabaddiBroadcastCallout | null;
  visible: boolean;
  updatedAt: number;
  lastActionLabel?: string;
}

export const KABADDI_TEAM_COLOR_PRESETS = [
  { label: 'Broadcast Red', value: '#C8102E' },
  { label: 'Royal Blue', value: '#131D8A' },
  { label: 'Saffron Gold', value: '#D97706' },
  { label: 'Emerald', value: '#047857' },
  { label: 'Crimson Dark', value: '#881337' },
  { label: 'Deep Indigo', value: '#3730A3' },
  { label: 'Teal Steel', value: '#0F766E' },
  { label: 'Carbon Black', value: '#18181B' },
] as const;

export function sanitizeKabaddiMatchId(raw: string | null | undefined, fallback = 'KBD-101'): string {
  const cleaned = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return cleaned.length >= 2 ? cleaned : fallback;
}

export function generateRandomKabaddiMatchId(): string {
  const num = Math.floor(100 + Math.random() * 900);
  return `KBD-${num}`;
}

export function deriveShortCode(name: string, fallback: string): string {
  const letters = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  if (letters.length === 0) return fallback;
  if (letters.length === 1) return letters[0].slice(0, 3);
  return (letters[0][0] + letters[1].slice(0, 2)).slice(0, 3);
}

export function createDefaultSupabaseKabaddiState(matchId: string): SupabaseKabaddiState {
  const now = Date.now();
  return {
    matchId: sanitizeKabaddiMatchId(matchId),
    sport: 'kabaddi',
    tournamentTitle: 'STAR EVENT LIVE · KABADDI',
    subtitle: 'LIVE BROADCAST',

    teamAName: 'NERAL WARRIORS',
    teamACode: 'NER',
    teamAColor: '#C8102E',
    teamAScore: 0,
    teamARaidPoints: 0,
    teamABonusPoints: 0,
    teamATacklePoints: 0,
    teamALonaPoints: 0,
    teamAPlayersOnMat: 7,

    teamBName: 'KARJAT TITANS',
    teamBCode: 'KAR',
    teamBColor: '#131D8A',
    teamBScore: 0,
    teamBRaidPoints: 0,
    teamBBonusPoints: 0,
    teamBTacklePoints: 0,
    teamBLonaPoints: 0,
    teamBPlayersOnMat: 7,

    half: '1ST HALF',
    matchSeconds: 20 * 60,
    matchRunning: false,
    matchUpdatedAt: now,

    raidSeconds: 30,
    raidDuration: 30,
    raidRunning: false,
    raidUpdatedAt: now,

    doOrDie: false,
    doOrDieTeam: null,

    callout: null,
    visible: true,
    updatedAt: now,
  };
}

export function computeLiveCountdown(
  baseSeconds: number,
  running: boolean,
  updatedAt: number,
  nowMs: number = Date.now()
): number {
  const safeBase = Math.max(0, Math.floor(Number.isFinite(baseSeconds) ? baseSeconds : 0));
  if (!running) return safeBase;
  const elapsedSec = Math.floor(Math.max(0, nowMs - updatedAt) / 1000);
  return Math.max(0, safeBase - elapsedSec);
}

export function mergeKabaddiStateFromPayload(
  matchId: string,
  raw: unknown
): SupabaseKabaddiState {
  const base = createDefaultSupabaseKabaddiState(matchId);
  if (!raw || typeof raw !== 'object') return base;
  const src = raw as Partial<SupabaseKabaddiState>;

  const validHalves: KabaddiHalf[] = ['1ST HALF', '2ND HALF', 'HALF TIME', 'FULL TIME'];
  const half: KabaddiHalf = validHalves.includes(src.half as KabaddiHalf)
    ? (src.half as KabaddiHalf)
    : base.half;

  const clampScore = (v: unknown, fb = 0) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(999, Math.floor(v))) : fb;
  const clampPlayers = (v: unknown, fb = 7) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(7, Math.floor(v))) : fb;
  const clampSec = (v: unknown, fb: number, max = 3600) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : fb;

  const callout: KabaddiBroadcastCallout | null =
    src.callout &&
    typeof src.callout === 'object' &&
    typeof src.callout.id === 'number' &&
    typeof src.callout.label === 'string' &&
    typeof src.callout.expiresAt === 'number'
      ? {
          id: src.callout.id,
          type: src.callout.type || 'SUPER RAID',
          team: src.callout.team === 'A' || src.callout.team === 'B' ? src.callout.team : null,
          label: src.callout.label,
          sublabel: typeof src.callout.sublabel === 'string' ? src.callout.sublabel : undefined,
          expiresAt: src.callout.expiresAt,
        }
      : null;

  return {
    matchId: sanitizeKabaddiMatchId(src.matchId || matchId),
    sport: 'kabaddi',
    tournamentTitle:
      typeof src.tournamentTitle === 'string' && src.tournamentTitle.trim()
        ? src.tournamentTitle.slice(0, 64)
        : base.tournamentTitle,
    subtitle:
      typeof src.subtitle === 'string' ? src.subtitle.slice(0, 48) : base.subtitle,

    teamAName:
      typeof src.teamAName === 'string' && src.teamAName.trim()
        ? src.teamAName.slice(0, 32)
        : base.teamAName,
    teamACode:
      typeof src.teamACode === 'string' && src.teamACode.trim()
        ? src.teamACode.toUpperCase().slice(0, 4)
        : base.teamACode,
    teamAColor:
      typeof src.teamAColor === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(src.teamAColor)
        ? src.teamAColor
        : base.teamAColor,
    teamAScore: clampScore(src.teamAScore, base.teamAScore),
    teamARaidPoints: clampScore(src.teamARaidPoints, base.teamARaidPoints),
    teamABonusPoints: clampScore(src.teamABonusPoints, base.teamABonusPoints),
    teamATacklePoints: clampScore(src.teamATacklePoints, base.teamATacklePoints),
    teamALonaPoints: clampScore(src.teamALonaPoints, base.teamALonaPoints),
    teamAPlayersOnMat: clampPlayers(src.teamAPlayersOnMat, base.teamAPlayersOnMat),

    teamBName:
      typeof src.teamBName === 'string' && src.teamBName.trim()
        ? src.teamBName.slice(0, 32)
        : base.teamBName,
    teamBCode:
      typeof src.teamBCode === 'string' && src.teamBCode.trim()
        ? src.teamBCode.toUpperCase().slice(0, 4)
        : base.teamBCode,
    teamBColor:
      typeof src.teamBColor === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(src.teamBColor)
        ? src.teamBColor
        : base.teamBColor,
    teamBScore: clampScore(src.teamBScore, base.teamBScore),
    teamBRaidPoints: clampScore(src.teamBRaidPoints, base.teamBRaidPoints),
    teamBBonusPoints: clampScore(src.teamBBonusPoints, base.teamBBonusPoints),
    teamBTacklePoints: clampScore(src.teamBTacklePoints, base.teamBTacklePoints),
    teamBLonaPoints: clampScore(src.teamBLonaPoints, base.teamBLonaPoints),
    teamBPlayersOnMat: clampPlayers(src.teamBPlayersOnMat, base.teamBPlayersOnMat),

    half,
    matchSeconds: clampSec(src.matchSeconds, base.matchSeconds, 7200),
    matchRunning: Boolean(src.matchRunning),
    matchUpdatedAt:
      typeof src.matchUpdatedAt === 'number' && Number.isFinite(src.matchUpdatedAt)
        ? src.matchUpdatedAt
        : base.matchUpdatedAt,

    raidSeconds: clampSec(src.raidSeconds, base.raidSeconds, 60),
    raidDuration: clampSec(src.raidDuration, 30, 60) || 30,
    raidRunning: Boolean(src.raidRunning),
    raidUpdatedAt:
      typeof src.raidUpdatedAt === 'number' && Number.isFinite(src.raidUpdatedAt)
        ? src.raidUpdatedAt
        : base.raidUpdatedAt,

    doOrDie: Boolean(src.doOrDie),
    doOrDieTeam: src.doOrDieTeam === 'A' || src.doOrDieTeam === 'B' ? src.doOrDieTeam : null,

    callout,
    visible: typeof src.visible === 'boolean' ? src.visible : true,
    updatedAt:
      typeof src.updatedAt === 'number' && Number.isFinite(src.updatedAt)
        ? src.updatedAt
        : base.updatedAt,
    lastActionLabel:
      typeof src.lastActionLabel === 'string' ? src.lastActionLabel.slice(0, 60) : undefined,
  };
}
