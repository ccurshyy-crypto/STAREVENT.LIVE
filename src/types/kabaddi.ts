export type KabaddiTeamSide = 'A' | 'B';

export type KabaddiTeamColor =
  | 'crimson'
  | 'royal-blue'
  | 'gold'
  | 'emerald'
  | 'purple'
  | 'saffron';

export type KabaddiHalf = '1ST HALF' | 'HALF TIME' | '2ND HALF' | 'FULL TIME' | 'TIE BREAKER';

export type KabaddiAlertType =
  | 'NONE'
  | 'SUPER_RAID'
  | 'SUPER_TACKLE'
  | 'ALL_OUT'
  | 'BONUS'
  | 'DO_OR_DIE'
  | 'TIME_OUT'
  | 'TV_REVIEW'
  | 'HALF_TIME'
  | 'FULL_TIME';

export type KabaddiCardView = 'NONE' | 'VERSUS' | 'SUMMARY';

export interface KabaddiTeamState {
  name: string;
  shortName: string;
  color: KabaddiTeamColor;
  score: number;
  playersOnMat: number; // 0..7 (<=3 triggers SUPER TACKLE ON)
  allOuts: number;
  raidPoints: number;
  tacklePoints: number;
  bonusPoints: number;
  timeoutsLeft: number; // 0..2
  emptyRaids: number; // 0..2 (2 means next raid is DO OR DIE)
}

export interface KabaddiTimerState {
  durationSec: number;
  remainingSec: number;
  running: boolean;
  startedAtMs: number | null;
}

export interface KabaddiAlertState {
  type: KabaddiAlertType;
  teamSide?: KabaddiTeamSide | null;
  title: string;
  subtitle: string;
  pointsBadge?: string;
  triggeredAtMs: number;
  expiresAtMs: number;
}

export interface KabaddiScoreboardState {
  version: 1;
  uid: string;
  revision: number;
  updatedAt: number;
  lastModifiedByDevice?: string;
  tournamentName: string;
  matchLabel: string;
  tickerText: string;
  half: KabaddiHalf;
  raidingTeam: KabaddiTeamSide | null;
  teamA: KabaddiTeamState;
  teamB: KabaddiTeamState;
  matchClock: KabaddiTimerState;
  raidClock: KabaddiTimerState;
  showScoreboard: boolean;
  activeCard: KabaddiCardView;
  alert: KabaddiAlertState | null;
}

export const KABADDI_TEAM_PALETTES: Record<
  KabaddiTeamColor,
  {
    label: string;
    bgGradient: string;
    border: string;
    badgeBg: string;
    accentText: string;
    swatch: string;
  }
> = {
  crimson: {
    label: 'Crimson Red',
    bgGradient: 'linear-gradient(135deg, #B91C1C 0%, #7F040A 100%)',
    border: '#F87171',
    badgeBg: '#DC2626',
    accentText: '#FEE2E2',
    swatch: '#DC2626',
  },
  'royal-blue': {
    label: 'Royal Blue',
    bgGradient: 'linear-gradient(135deg, #1D4ED8 0%, #0F2366 100%)',
    border: '#60A5FA',
    badgeBg: '#2563EB',
    accentText: '#DBEAFE',
    swatch: '#2563EB',
  },
  gold: {
    label: 'Star Gold',
    bgGradient: 'linear-gradient(135deg, #CA8A04 0%, #713F12 100%)',
    border: '#FFE600',
    badgeBg: '#EAB308',
    accentText: '#FEF9C3',
    swatch: '#EAB308',
  },
  emerald: {
    label: 'Emerald',
    bgGradient: 'linear-gradient(135deg, #047857 0%, #064E3B 100%)',
    border: '#34D399',
    badgeBg: '#059669',
    accentText: '#D1FAE5',
    swatch: '#059669',
  },
  purple: {
    label: 'Royal Purple',
    bgGradient: 'linear-gradient(135deg, #7E22CE 0%, #3B0764 100%)',
    border: '#C084FC',
    badgeBg: '#9333EA',
    accentText: '#F3E8FF',
    swatch: '#9333EA',
  },
  saffron: {
    label: 'Saffron Orange',
    bgGradient: 'linear-gradient(135deg, #EA580C 0%, #9A3412 100%)',
    border: '#FDBA74',
    badgeBg: '#F97316',
    accentText: '#FFEDD5',
    swatch: '#F97316',
  },
};

export function createInitialKabaddiState(uid: string): KabaddiScoreboardState {
  return {
    version: 1,
    uid,
    revision: 1,
    updatedAt: Date.now(),
    tournamentName: 'STAR EVENT LIVE KABADDI CHASHAK 2026',
    matchLabel: 'MATCH 01 · FINAL',
    tickerText: 'LIVE ON YOUTUBE @STAREVENTLIVE01 · BOOKING: 9890175727',
    half: '1ST HALF',
    raidingTeam: 'A',
    teamA: {
      name: 'NERAL WARRIORS',
      shortName: 'NER',
      color: 'crimson',
      score: 0,
      playersOnMat: 7,
      allOuts: 0,
      raidPoints: 0,
      tacklePoints: 0,
      bonusPoints: 0,
      timeoutsLeft: 2,
      emptyRaids: 0,
    },
    teamB: {
      name: 'KARJAT LIONS',
      shortName: 'KAR',
      color: 'royal-blue',
      score: 0,
      playersOnMat: 7,
      allOuts: 0,
      raidPoints: 0,
      tacklePoints: 0,
      bonusPoints: 0,
      timeoutsLeft: 2,
      emptyRaids: 0,
    },
    matchClock: {
      durationSec: 20 * 60,
      remainingSec: 20 * 60,
      running: false,
      startedAtMs: null,
    },
    raidClock: {
      durationSec: 30,
      remainingSec: 30,
      running: false,
      startedAtMs: null,
    },
    showScoreboard: true,
    activeCard: 'NONE',
    alert: null,
  };
}

export function computeLiveTimerSeconds(timer: KabaddiTimerState, nowMs = Date.now()): number {
  if (!timer.running || !timer.startedAtMs) {
    return Math.max(0, Math.round(timer.remainingSec));
  }
  const elapsedSec = Math.max(0, (nowMs - timer.startedAtMs) / 1000);
  return Math.max(0, Math.ceil(timer.remainingSec - elapsedSec));
}

export function formatClockMMSS(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
