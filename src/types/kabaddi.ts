export type KabaddiTeamSide = 'A' | 'B';

export type KabaddiTeamColor =
  | 'crimson'
  | 'royal-blue'
  | 'gold'
  | 'emerald'
  | 'purple'
  | 'saffron';

export type KabaddiHalf = '1ST HALF' | 'HALF TIME' | '2ND HALF' | 'FULL TIME' | 'TIE BREAKER';

export type KabaddiOverlayThemeId =
  | 'royal-blue'
  | 'silver-navy'
  | 'crimson-noir'
  | 'saffron-chrome'
  | 'star-classic';

export const KABADDI_OVERLAY_THEMES: ReadonlyArray<{
  id: KabaddiOverlayThemeId;
  name: string;
  swatchPrimary: string;
  swatchSecondary: string;
}> = [
  { id: 'royal-blue', name: 'Royal Blue', swatchPrimary: '#1D4ED8', swatchSecondary: '#09090B' },
  { id: 'silver-navy', name: 'Silver Ocean', swatchPrimary: '#E5E7EB', swatchSecondary: '#062B45' },
  { id: 'crimson-noir', name: 'Red & Black', swatchPrimary: '#DC2626', swatchSecondary: '#111114' },
  { id: 'saffron-chrome', name: 'Orange Chrome', swatchPrimary: '#F97316', swatchSecondary: '#E5E7EB' },
  { id: 'star-classic', name: 'Star Classic', swatchPrimary: '#8F050E', swatchSecondary: '#FFE600' },
];

export type KabaddiAlertType =
  | 'NONE'
  | 'RAID_POINT'
  | 'TACKLE_POINT'
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

export interface KabaddiPlayer {
  id: string;
  number: number;
  name: string;
  status: 'in' | 'out';
  raidPoints: number;
  tacklePoints: number;
}

export interface KabaddiSubstitute {
  id: string;
  number: number;
  name: string;
}

export interface KabaddiLogEntry {
  id: string;
  timeLabel: string;
  text: string;
  side?: KabaddiTeamSide | null;
  kind?: 'raid' | 'tackle' | 'bonus' | 'allout' | 'timeout' | 'system';
}

export interface KabaddiTeamState {
  name: string;
  shortName: string;
  color: KabaddiTeamColor;
  customBgColor?: string;
  customTextColor?: string;
  score: number;
  playersOnMat: number; // 0..7 (<=3 triggers SUPER TACKLE ON)
  allOuts: number;
  raidPoints: number;
  tacklePoints: number;
  bonusPoints: number;
  timeoutsLeft: number; // 0..2
  emptyRaids: number; // 0..2 (2 means next raid is DO OR DIE)
  players?: KabaddiPlayer[];
  revivalQueue?: string[]; // Ordered FIFO player IDs waiting for revival
  substitutes?: KabaddiSubstitute[];
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
  selectedRaider?: { side: KabaddiTeamSide; playerId: string } | null;
  teamA: KabaddiTeamState;
  teamB: KabaddiTeamState;
  matchClock: KabaddiTimerState;
  raidClock: KabaddiTimerState;
  showScoreboard: boolean;
  overlayTheme?: KabaddiOverlayThemeId;
  activeCard: KabaddiCardView;
  alert: KabaddiAlertState | null;
  gameLog?: KabaddiLogEntry[];
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

export const KABADDI_CUSTOM_COLOR_SWATCHES: ReadonlyArray<{ label: string; hex: string }> = [
  { label: 'Royal Blue', hex: '#1D4ED8' },
  { label: 'Crimson Red', hex: '#DC2626' },
  { label: 'Saffron Orange', hex: '#EA580C' },
  { label: 'Emerald Green', hex: '#059669' },
  { label: 'Star Gold', hex: '#EAB308' },
  { label: 'Royal Purple', hex: '#7E22CE' },
  { label: 'Ocean Cyan', hex: '#0284C7' },
  { label: 'Hot Pink', hex: '#DB2777' },
  { label: 'Jet Black', hex: '#111827' },
  { label: 'Pure White', hex: '#F8FAFC' },
];

function parseHexRgb(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  return null;
}

function shiftHexLuminance(hex: string, factor: number): string {
  const rgb = parseHexRgb(hex);
  if (!rgb) return hex;
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const [r, g, b] = rgb.map((ch) =>
    factor >= 0 ? clamp(ch + (255 - ch) * factor) : clamp(ch * (1 + factor))
  );
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

export function isLightHexColor(hex: string): boolean {
  const rgb = parseHexRgb(hex);
  if (!rgb) return false;
  const [r, g, b] = rgb;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62;
}

export function resolveKabaddiTeamColors(team: KabaddiTeamState): {
  hasCustomBg: boolean;
  baseHex: string;
  bgGradient: string;
  borderHex: string;
  textColor: string;
  isDarkBg: boolean;
  dotAccentHex: string;
} {
  const preset = KABADDI_TEAM_PALETTES[team.color] || KABADDI_TEAM_PALETTES.saffron;
  const rawCustom = team.customBgColor?.trim();
  const hasCustomBg = Boolean(rawCustom && parseHexRgb(rawCustom));
  const baseHex = hasCustomBg && rawCustom ? rawCustom : preset.swatch;
  const isLight = isLightHexColor(baseHex);

  const bgGradient = hasCustomBg
    ? `linear-gradient(180deg, ${shiftHexLuminance(baseHex, 0.22)} 0%, ${baseHex} 48%, ${shiftHexLuminance(baseHex, -0.34)} 100%)`
    : preset.bgGradient;

  const borderHex = hasCustomBg ? shiftHexLuminance(baseHex, isLight ? -0.25 : 0.35) : preset.border;
  const customText = team.customTextColor?.trim();
  const textColor =
    customText && parseHexRgb(customText)
      ? customText
      : isLight
        ? '#0F172A'
        : '#FFFFFF';

  const dotAccentHex = isLight ? '#EA580C' : '#FFE600';

  return {
    hasCustomBg,
    baseHex,
    bgGradient,
    borderHex,
    textColor,
    isDarkBg: !isLight,
    dotAccentHex,
  };
}

export function createDefaultKabaddiPlayers(side: KabaddiTeamSide): KabaddiPlayer[] {
  return Array.from({ length: 7 }, (_, idx) => ({
    id: `${side.toLowerCase()}_p${idx + 1}`,
    number: idx + 1,
    name: `Player ${idx + 1}`,
    status: 'in' as const,
    raidPoints: 0,
    tacklePoints: 0,
  }));
}

export function createDefaultKabaddiSubstitutes(side: KabaddiTeamSide): KabaddiSubstitute[] {
  return Array.from({ length: 5 }, (_, idx) => ({
    id: `${side.toLowerCase()}_sub${idx + 8}`,
    number: idx + 8,
    name: `Sub ${idx + 8}`,
  }));
}

export function ensureKabaddiPlayers(
  team: KabaddiTeamState,
  side: KabaddiTeamSide
): KabaddiPlayer[] {
  if (Array.isArray(team.players) && team.players.length === 7) {
    return team.players;
  }
  const base = createDefaultKabaddiPlayers(side);
  const inCount = Math.max(0, Math.min(7, team.playersOnMat ?? 7));
  return base.map((p, idx) => ({
    ...p,
    status: idx < inCount ? 'in' : 'out',
  }));
}

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
    selectedRaider: null,
    teamA: {
      name: 'Team A',
      shortName: 'TMA',
      color: 'saffron',
      score: 0,
      playersOnMat: 7,
      allOuts: 0,
      raidPoints: 0,
      tacklePoints: 0,
      bonusPoints: 0,
      timeoutsLeft: 2,
      emptyRaids: 0,
      players: createDefaultKabaddiPlayers('A'),
      revivalQueue: [],
      substitutes: createDefaultKabaddiSubstitutes('A'),
    },
    teamB: {
      name: 'Team B',
      shortName: 'TMB',
      color: 'crimson',
      score: 0,
      playersOnMat: 7,
      allOuts: 0,
      raidPoints: 0,
      tacklePoints: 0,
      bonusPoints: 0,
      timeoutsLeft: 2,
      emptyRaids: 0,
      players: createDefaultKabaddiPlayers('B'),
      revivalQueue: [],
      substitutes: createDefaultKabaddiSubstitutes('B'),
    },
    matchClock: {
      durationSec: 40 * 60,
      remainingSec: 40 * 60,
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
    overlayTheme: 'royal-blue',
    activeCard: 'NONE',
    alert: null,
    gameLog: [],
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
