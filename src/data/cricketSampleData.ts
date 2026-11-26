import {
  BallEvent,
  CricketMatch,
  CricketSuiteState,
  ExtraType,
  FieldPositionSpot,
  InningsState,
  OverlayThemeId,
  PointTableEntry,
  Team,
  TeamColorTag,
  WicketType,
} from '../types/cricketSuite';

export const TEAM_COLOR_MAP: Record<
  TeamColorTag,
  { label: string; bg: string; text: string; hex: string }
> = {
  Light_yellow: {
    label: 'Light Yellow',
    bg: 'bg-yellow-100 border-yellow-400',
    text: 'text-yellow-900',
    hex: '#FACC15',
  },
  Light_brown: {
    label: 'Light Brown',
    bg: 'bg-amber-100 border-amber-500',
    text: 'text-amber-900',
    hex: '#B45309',
  },
  Light_pink: {
    label: 'Light Pink',
    bg: 'bg-pink-100 border-pink-400',
    text: 'text-pink-900',
    hex: '#EC4899',
  },
  Blue: {
    label: 'Blue',
    bg: 'bg-blue-100 border-blue-500',
    text: 'text-blue-900',
    hex: '#2563EB',
  },
  Light_blue: {
    label: 'Light Blue',
    bg: 'bg-sky-100 border-sky-400',
    text: 'text-sky-900',
    hex: '#0EA5E9',
  },
  Defoult: {
    label: 'Default',
    bg: 'bg-slate-100 border-slate-400',
    text: 'text-slate-800',
    hex: '#475569',
  },
  Crimson_red: {
    label: 'Crimson Red',
    bg: 'bg-red-100 border-red-500',
    text: 'text-red-900',
    hex: '#DC2626',
  },
  Metallic_gold: {
    label: 'Metallic Gold',
    bg: 'bg-amber-100 border-amber-400',
    text: 'text-amber-900',
    hex: '#D97706',
  },
  Emerald_green: {
    label: 'Emerald Green',
    bg: 'bg-emerald-100 border-emerald-500',
    text: 'text-emerald-900',
    hex: '#059669',
  },
  Royal_purple: {
    label: 'Royal Purple',
    bg: 'bg-purple-100 border-purple-500',
    text: 'text-purple-900',
    hex: '#7C3AED',
  },
};

export interface ScoreboardBarStyle {
  number: number;
  outerBorder: string;
  outerGlow: string;
  leftBadgeBg: string;
  leftBadgeText: string;
  batterPanelBg: string;
  batterPanelText: string;
  scorePillBg: string;
  scorePillText: string;
  scorePillBorder: string;
  scoreBottomBg?: string;
  scoreBottomText?: string;
  bowlerPanelBg: string;
  bowlerPanelText: string;
  rightBadgeBg: string;
  rightBadgeText: string;
  ballMode?: 'outline' | 'colored' | 'solid-white' | 'cric-astra';
  sunburstRight?: boolean;
  isWidescreen?: boolean;
  isTataIpl2022?: boolean;
}

export interface BroadcastThemeConfig {
  id: OverlayThemeId;
  name: string;
  subtitle: string;
  primary: string;
  secondary: string;
  accent: string;
  surface: string;
  textOnPrimary: string;
  category?: 'pro-scoreboard' | 'classic';
  barStyle?: ScoreboardBarStyle;
}

export const BROADCAST_THEMES: BroadcastThemeConfig[] = [
  // ================= FEATURED: 2021-2022 TATA IPL ANIMATED PATTI =================
  {
    id: 'tata-ipl-2022',
    name: 'TATA IPL 2022 Animated Patti',
    subtitle: 'Home Page Crimson · Royal Navy · Gold Animated Broadcast Patti & Event Stingers',
    primary: '#6B0208',
    secondary: '#D4080F',
    accent: '#FFE600',
    surface: '#1A030D',
    textOnPrimary: '#FFFFFF',
    category: 'pro-scoreboard',
    barStyle: {
      number: 0,
      outerBorder: '#FFE600',
      outerGlow: 'rgba(239, 26, 26, 0.55)',
      leftBadgeBg: 'linear-gradient(180deg, #8F0812, #070B28)',
      leftBadgeText: '#FFFFFF',
      batterPanelBg: 'linear-gradient(180deg, #1B0518, #070B28)',
      batterPanelText: '#FFFFFF',
      scorePillBg: 'linear-gradient(180deg, #FFF04D 0%, #FFE600 52%, #F5B800 100%)',
      scorePillText: '#070B28',
      scorePillBorder: '#FFE600',
      bowlerPanelBg: 'linear-gradient(90deg, #EF1A1A 0%, #C4070D 54%, #6B0208 100%)',
      bowlerPanelText: '#FFFFFF',
      rightBadgeBg: 'linear-gradient(180deg, #8F0812, #070B28)',
      rightBadgeText: '#FFE600',
      ballMode: 'colored',
      isWidescreen: true,
      isTataIpl2022: true,
    },
  },
  // ================= 15 PRO BROADCAST SCOREBOARD THEMES =================
  {
    id: 'champions-trophy-2025',
    name: 'Champions Trophy 2025',
    subtitle: 'Royal Blue · Crisp White · Deep Navy Score Pill & Gold',
    primary: '#0D228A',
    secondary: '#0B63F6',
    accent: '#F5C518',
    surface: '#091540',
    textOnPrimary: '#FFFFFF',
    category: 'pro-scoreboard',
    barStyle: {
      number: 1,
      outerBorder: '#93C5FD',
      outerGlow: 'rgba(59,130,246,0.45)',
      leftBadgeBg: 'linear-gradient(135deg, #1D6DF8, #0B46C5)',
      leftBadgeText: '#FFFFFF',
      batterPanelBg: 'linear-gradient(180deg, #FFFFFF, #EDF2F7)',
      batterPanelText: '#0F172A',
      scorePillBg: 'linear-gradient(180deg, #1E3A9A 0%, #09135A 100%)',
      scorePillText: '#FFFFFF',
      scorePillBorder: '#93C5FD',
      bowlerPanelBg: 'linear-gradient(180deg, #FFFFFF, #EDF2F7)',
      bowlerPanelText: '#0F172A',
      rightBadgeBg: 'linear-gradient(135deg, #FDE047, #EAB308)',
      rightBadgeText: '#0F172A',
      ballMode: 'outline',
    },
  },
  {
    id: 'cwc-25',
    name: 'CWC 25',
    subtitle: 'Electric Blue · White Strip · Burgundy Score Pill & Gold',
    primary: '#7A0E3F',
    secondary: '#0F62FE',
    accent: '#FACC15',
    surface: '#3B0721',
    textOnPrimary: '#FFFFFF',
    category: 'pro-scoreboard',
    barStyle: {
      number: 2,
      outerBorder: '#E2E8F0',
      outerGlow: 'rgba(136,19,55,0.45)',
      leftBadgeBg: 'linear-gradient(135deg, #1E6BFF, #0B47C9)',
      leftBadgeText: '#FFFFFF',
      batterPanelBg: 'linear-gradient(180deg, #FFFFFF, #F1F5F9)',
      batterPanelText: '#0F172A',
      scorePillBg: 'linear-gradient(180deg, #9D174D 0%, #4C0519 100%)',
      scorePillText: '#FFFFFF',
      scorePillBorder: '#FBCFE8',
      bowlerPanelBg: 'linear-gradient(180deg, #FFFFFF, #F1F5F9)',
      bowlerPanelText: '#0F172A',
      rightBadgeBg: 'linear-gradient(135deg, #FDE047, #EAB308)',
      rightBadgeText: '#0F172A',
      ballMode: 'outline',
    },
  },
  {
    id: 'wcl',
    name: 'WCL',
    subtitle: 'Lime Green Badges · Azure Batting · Aqua-Mint Center & Gold',
    primary: '#0B63F6',
    secondary: '#22D3EE',
    accent: '#A3E635',
    surface: '#0B2545',
    textOnPrimary: '#FFFFFF',
    category: 'pro-scoreboard',
    barStyle: {
      number: 3,
      outerBorder: '#7DD3FC',
      outerGlow: 'rgba(56,189,248,0.45)',
      leftBadgeBg: 'linear-gradient(135deg, #BEF264, #65A30D)',
      leftBadgeText: '#0F172A',
      batterPanelBg: 'linear-gradient(90deg, #0A5CE8, #1D4ED8)',
      batterPanelText: '#FFFFFF',
      scorePillBg: 'linear-gradient(135deg, #67E8F9 0%, #D9F99D 100%)',
      scorePillText: '#0F172A',
      scorePillBorder: '#BAE6FD',
      bowlerPanelBg: 'linear-gradient(180deg, #FDE047, #EAB308)',
      bowlerPanelText: '#0F172A',
      rightBadgeBg: 'linear-gradient(135deg, #A3E635, #4D7C0F)',
      rightBadgeText: '#0F172A',
      ballMode: 'outline',
    },
  },
  {
    id: 'cwc-23-2',
    name: 'CWC 23 - 2.0',
    subtitle: 'Cobalt Blue · Crisp White · Royal Purple Center & Color Balls',
    primary: '#6B21A8',
    secondary: '#1D4ED8',
    accent: '#FACC15',
    surface: '#2E1065',
    textOnPrimary: '#FFFFFF',
    category: 'pro-scoreboard',
    barStyle: {
      number: 4,
      outerBorder: '#C084FC',
      outerGlow: 'rgba(147,51,234,0.45)',
      leftBadgeBg: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
      leftBadgeText: '#FFFFFF',
      batterPanelBg: 'linear-gradient(180deg, #FFFFFF, #F1F5F9)',
      batterPanelText: '#0F172A',
      scorePillBg: 'linear-gradient(180deg, #7E22CE 0%, #3B0764 100%)',
      scorePillText: '#FFFFFF',
      scorePillBorder: '#E9D5FF',
      bowlerPanelBg: 'linear-gradient(180deg, #FFFFFF, #F1F5F9)',
      bowlerPanelText: '#0F172A',
      rightBadgeBg: 'linear-gradient(135deg, #FDE047, #EAB308)',
      rightBadgeText: '#0F172A',
      ballMode: 'colored',
    },
  },
  {
    id: 'cric-sky-sports',
    name: 'CricSkySports',
    subtitle: 'Glossy Sky Blue · Midnight Navy Pill · Metallic Amber Gold',
    primary: '#0B5ED7',
    secondary: '#0E1F82',
    accent: '#F59E0B',
    surface: '#0A1647',
    textOnPrimary: '#FFFFFF',
    category: 'pro-scoreboard',
    barStyle: {
      number: 5,
      outerBorder: '#60A5FA',
      outerGlow: 'rgba(37,99,235,0.45)',
      leftBadgeBg: 'linear-gradient(180deg, #2563EB, #0C3EA8)',
      leftBadgeText: '#FFFFFF',
      batterPanelBg: 'linear-gradient(180deg, #1D63ED, #0B3EA8)',
      batterPanelText: '#FFFFFF',
      scorePillBg: 'linear-gradient(180deg, #1725A8 0%, #070E52 100%)',
      scorePillText: '#FFFFFF',
      scorePillBorder: '#93C5FD',
      bowlerPanelBg: 'linear-gradient(180deg, #EAB308 0%, #92400E 100%)',
      bowlerPanelText: '#FFFFFF',
      rightBadgeBg: 'linear-gradient(180deg, #D97706 0%, #78350F 100%)',
      rightBadgeText: '#FFFFFF',
      ballMode: 'solid-white',
    },
  },
  {
    id: 'cric-fusion',
    name: 'CricFusion',
    subtitle: 'Metallic Navy Badge · Clean White · Indigo Pill & Brushed Gold',
    primary: '#1E1B8B',
    secondary: '#0F172A',
    accent: '#D97706',
    surface: '#0F172A',
    textOnPrimary: '#FFFFFF',
    category: 'pro-scoreboard',
    barStyle: {
      number: 6,
      outerBorder: '#CBD5E1',
      outerGlow: 'rgba(148,163,184,0.4)',
      leftBadgeBg: 'linear-gradient(180deg, #1E3A8A, #090D24)',
      leftBadgeText: '#FFFFFF',
      batterPanelBg: 'linear-gradient(180deg, #FFFFFF, #E2E8F0)',
      batterPanelText: '#0F172A',
      scorePillBg: 'linear-gradient(180deg, #312E81 0%, #110F54 100%)',
      scorePillText: '#FFFFFF',
      scorePillBorder: '#A5B4FC',
      bowlerPanelBg: 'linear-gradient(180deg, #FFFFFF, #E2E8F0)',
      bowlerPanelText: '#0F172A',
      rightBadgeBg: 'linear-gradient(180deg, #EAB308, #854D0E)',
      rightBadgeText: '#FFFFFF',
      ballMode: 'outline',
    },
  },
  {
    id: 'emerging-asia-cup',
    name: 'Emerging Asia Cup',
    subtitle: 'White Left Badge · Royal Blue Bat · Silver Ice Pill & Gold',
    primary: '#0C1DB8',
    secondary: '#E2E8F0',
    accent: '#FACC15',
    surface: '#0B1659',
    textOnPrimary: '#FFFFFF',
    category: 'pro-scoreboard',
    barStyle: {
      number: 7,
      outerBorder: '#93C5FD',
      outerGlow: 'rgba(59,130,246,0.45)',
      leftBadgeBg: 'linear-gradient(180deg, #FFFFFF, #CBD5E1)',
      leftBadgeText: '#0F172A',
      batterPanelBg: 'linear-gradient(180deg, #1D4ED8, #0A1680)',
      batterPanelText: '#FFFFFF',
      scorePillBg: 'linear-gradient(180deg, #F8FAFC 0%, #CBD5E1 100%)',
      scorePillText: '#0F172A',
      scorePillBorder: '#FFFFFF',
      bowlerPanelBg: 'linear-gradient(180deg, #FDE047, #EAB308)',
      bowlerPanelText: '#0F172A',
      rightBadgeBg: 'linear-gradient(180deg, #FACC15, #CA8A04)',
      rightBadgeText: '#0F172A',
      ballMode: 'outline',
    },
  },
  {
    id: 'sa20',
    name: 'SA20',
    subtitle: 'Vivid Azure · Split Navy/White Score Pill · Canary Yellow & Magenta',
    primary: '#0B63F6',
    secondary: '#0D1B6E',
    accent: '#FACC15',
    surface: '#0A194E',
    textOnPrimary: '#FFFFFF',
    category: 'pro-scoreboard',
    barStyle: {
      number: 8,
      outerBorder: '#60A5FA',
      outerGlow: 'rgba(37,99,235,0.45)',
      leftBadgeBg: 'linear-gradient(180deg, #2563EB, #0E4BC8)',
      leftBadgeText: '#FFFFFF',
      batterPanelBg: 'linear-gradient(180deg, #2563EB, #1250D2)',
      batterPanelText: '#FFFFFF',
      scorePillBg: 'linear-gradient(180deg, #1E3A8A 0%, #09134D 100%)',
      scorePillText: '#FFFFFF',
      scorePillBorder: '#93C5FD',
      scoreBottomBg: '#F8FAFC',
      scoreBottomText: '#0F172A',
      bowlerPanelBg: 'linear-gradient(180deg, #FDE047, #EAB308)',
      bowlerPanelText: '#0F172A',
      rightBadgeBg: 'linear-gradient(180deg, #FACC15, #D97706)',
      rightBadgeText: '#0F172A',
      ballMode: 'colored',
    },
  },
  {
    id: 'jio-cinema',
    name: 'Jio Cinema',
    subtitle: 'Full Cobalt Broadcast Blue · Neon Cyan Center Score Pill',
    primary: '#0284C7',
    secondary: '#1D4ED8',
    accent: '#22D3EE',
    surface: '#0C2D6B',
    textOnPrimary: '#FFFFFF',
    category: 'pro-scoreboard',
    barStyle: {
      number: 9,
      outerBorder: '#38BDF8',
      outerGlow: 'rgba(34,211,238,0.5)',
      leftBadgeBg: 'linear-gradient(180deg, #0EA5E9, #1D4ED8)',
      leftBadgeText: '#FFFFFF',
      batterPanelBg: 'linear-gradient(180deg, #0284C7, #1E40AF)',
      batterPanelText: '#FFFFFF',
      scorePillBg: 'linear-gradient(180deg, #67E8F9 0%, #06B6D4 100%)',
      scorePillText: '#0F172A',
      scorePillBorder: '#CFFAFE',
      bowlerPanelBg: 'linear-gradient(180deg, #0284C7, #1E40AF)',
      bowlerPanelText: '#FFFFFF',
      rightBadgeBg: 'linear-gradient(180deg, #0EA5E9, #1D4ED8)',
      rightBadgeText: '#FFFFFF',
      ballMode: 'outline',
    },
  },
  {
    id: 'ipl-classic',
    name: 'IPL',
    subtitle: 'Jet Black Badge · Electric Blue Score · Gold Bowling & Sunburst',
    primary: '#0B5ED7',
    secondary: '#09090B',
    accent: '#FACC15',
    surface: '#09090B',
    textOnPrimary: '#FFFFFF',
    category: 'pro-scoreboard',
    barStyle: {
      number: 10,
      outerBorder: '#93C5FD',
      outerGlow: 'rgba(59,130,246,0.45)',
      leftBadgeBg: 'linear-gradient(180deg, #27272A, #09090B)',
      leftBadgeText: '#FFFFFF',
      batterPanelBg: 'linear-gradient(180deg, #2563EB, #1D4ED8)',
      batterPanelText: '#FFFFFF',
      scorePillBg: 'linear-gradient(180deg, #1E40AF 0%, #0A145E 100%)',
      scorePillText: '#FFFFFF',
      scorePillBorder: '#93C5FD',
      bowlerPanelBg: 'linear-gradient(180deg, #FDE047, #EAB308)',
      bowlerPanelText: '#0F172A',
      rightBadgeBg: '#09090B',
      rightBadgeText: '#FFFFFF',
      ballMode: 'outline',
      sunburstRight: true,
    },
  },
  {
    id: 'world-t20',
    name: 'World T20',
    subtitle: 'Pure White Left Badge · Deep Sapphire Strip · Midnight Navy',
    primary: '#0E249A',
    secondary: '#1D4ED8',
    accent: '#60A5FA',
    surface: '#070D36',
    textOnPrimary: '#FFFFFF',
    category: 'pro-scoreboard',
    barStyle: {
      number: 11,
      outerBorder: '#60A5FA',
      outerGlow: 'rgba(59,130,246,0.5)',
      leftBadgeBg: 'linear-gradient(180deg, #FFFFFF, #E2E8F0)',
      leftBadgeText: '#0F172A',
      batterPanelBg: 'linear-gradient(180deg, #1D4ED8, #0A1878)',
      batterPanelText: '#FFFFFF',
      scorePillBg: 'linear-gradient(180deg, #1E3A8A 0%, #091254 100%)',
      scorePillText: '#FFFFFF',
      scorePillBorder: '#93C5FD',
      bowlerPanelBg: 'linear-gradient(180deg, #1725A8, #070E4B)',
      bowlerPanelText: '#FFFFFF',
      rightBadgeBg: 'linear-gradient(180deg, #0D1454, #050826)',
      rightBadgeText: '#FFFFFF',
      ballMode: 'outline',
    },
  },
  {
    id: 'bbl-on-star',
    name: 'BBL on Star',
    subtitle: 'Steel Blue · Glossy Carbon Black Score · Dark Bronze Gold',
    primary: '#0F172A',
    secondary: '#1E40AF',
    accent: '#F59E0B',
    surface: '#090D16',
    textOnPrimary: '#FFFFFF',
    category: 'pro-scoreboard',
    barStyle: {
      number: 12,
      outerBorder: '#94A3B8',
      outerGlow: 'rgba(245,158,11,0.35)',
      leftBadgeBg: 'linear-gradient(180deg, #1D4ED8, #0B1E4A)',
      leftBadgeText: '#FFFFFF',
      batterPanelBg: 'linear-gradient(180deg, #1E293B, #090D16)',
      batterPanelText: '#FFFFFF',
      scorePillBg: 'linear-gradient(180deg, #1E293B 0%, #020617 100%)',
      scorePillText: '#FFFFFF',
      scorePillBorder: '#94A3B8',
      bowlerPanelBg: 'linear-gradient(180deg, #854D0E 0%, #422006 100%)',
      bowlerPanelText: '#FFFFFF',
      rightBadgeBg: 'linear-gradient(180deg, #A16207 0%, #451A03 100%)',
      rightBadgeText: '#FFFFFF',
      ballMode: 'outline',
    },
  },
  {
    id: 'ipl-25-pro',
    name: 'IPL 25',
    subtitle: 'Vibrant Blue Badge · White Batting · Royal Blue Pill & Gold',
    primary: '#0E249A',
    secondary: '#1D63ED',
    accent: '#FACC15',
    surface: '#0B1659',
    textOnPrimary: '#FFFFFF',
    category: 'pro-scoreboard',
    barStyle: {
      number: 13,
      outerBorder: '#93C5FD',
      outerGlow: 'rgba(59,130,246,0.45)',
      leftBadgeBg: 'linear-gradient(180deg, #2563EB, #1D4ED8)',
      leftBadgeText: '#FFFFFF',
      batterPanelBg: 'linear-gradient(180deg, #FFFFFF, #F1F5F9)',
      batterPanelText: '#0F172A',
      scorePillBg: 'linear-gradient(180deg, #1E40AF 0%, #091566 100%)',
      scorePillText: '#FFFFFF',
      scorePillBorder: '#60A5FA',
      bowlerPanelBg: 'linear-gradient(180deg, #FDE047, #EAB308)',
      bowlerPanelText: '#0F172A',
      rightBadgeBg: 'linear-gradient(180deg, #FACC15, #CA8A04)',
      rightBadgeText: '#0F172A',
      ballMode: 'outline',
    },
  },
  {
    id: 'hotstar',
    name: 'Hotstar',
    subtitle: 'Electric Azure · White Bat · Midnight Navy Pill & Gold Bowling',
    primary: '#0A1566',
    secondary: '#0B63F6',
    accent: '#FACC15',
    surface: '#070E42',
    textOnPrimary: '#FFFFFF',
    category: 'pro-scoreboard',
    barStyle: {
      number: 14,
      outerBorder: '#38BDF8',
      outerGlow: 'rgba(56,189,248,0.45)',
      leftBadgeBg: 'linear-gradient(180deg, #2563EB, #0C4BD6)',
      leftBadgeText: '#FFFFFF',
      batterPanelBg: 'linear-gradient(180deg, #FFFFFF, #EDF2F7)',
      batterPanelText: '#0F172A',
      scorePillBg: 'linear-gradient(180deg, #1725A8 0%, #060C45 100%)',
      scorePillText: '#FFFFFF',
      scorePillBorder: '#60A5FA',
      bowlerPanelBg: 'linear-gradient(180deg, #FDE047, #EAB308)',
      bowlerPanelText: '#0F172A',
      rightBadgeBg: 'linear-gradient(180deg, #FACC15, #CA8A04)',
      rightBadgeText: '#0F172A',
      ballMode: 'outline',
    },
  },
  {
    id: 'cric-astra',
    name: 'CricAstra',
    subtitle: 'Widescreen Pro Bar · Neon Blue Glow · Gold Over Strip & Bronze',
    primary: '#0A146E',
    secondary: '#0B63F6',
    accent: '#FACC15',
    surface: '#060B3B',
    textOnPrimary: '#FFFFFF',
    category: 'pro-scoreboard',
    barStyle: {
      number: 15,
      outerBorder: '#38BDF8',
      outerGlow: 'rgba(56,189,248,0.55)',
      leftBadgeBg: 'linear-gradient(180deg, #2563EB, #0B46C5)',
      leftBadgeText: '#FFFFFF',
      batterPanelBg: 'linear-gradient(180deg, #151E8C, #070B4A)',
      batterPanelText: '#FFFFFF',
      scorePillBg: 'linear-gradient(180deg, #0D1B6E 0%, #04082E 100%)',
      scorePillText: '#FFFFFF',
      scorePillBorder: '#38BDF8',
      bowlerPanelBg: 'linear-gradient(180deg, #151E8C, #070B4A)',
      bowlerPanelText: '#FFFFFF',
      rightBadgeBg: 'linear-gradient(180deg, #CA8A04 0%, #713F12 100%)',
      rightBadgeText: '#FFFFFF',
      ballMode: 'cric-astra',
      isWidescreen: true,
    },
  },

  // ================= 9 CLASSIC BROADCAST THEMES =================
  {
    id: 'cpl-2026',
    name: 'CPL 2026',
    subtitle: 'Caribbean Indigo & Solar Gold',
    primary: '#1E1B4B',
    secondary: '#DC2626',
    accent: '#FACC15',
    surface: '#0F172A',
    textOnPrimary: '#FFFFFF',
    category: 'classic',
  },
  {
    id: 'wpl-2025',
    name: 'WPL 2025',
    subtitle: 'Royal Magenta & Electric Blue',
    primary: '#3B0764',
    secondary: '#DB2777',
    accent: '#38BDF8',
    surface: '#1E1B4B',
    textOnPrimary: '#FFFFFF',
    category: 'classic',
  },
  {
    id: 'tri-nation-series',
    name: 'Tri-Nation Series',
    subtitle: 'Deep Navy & Championship Amber',
    primary: '#0F172A',
    secondary: '#0369A1',
    accent: '#F59E0B',
    surface: '#1E293B',
    textOnPrimary: '#FFFFFF',
    category: 'classic',
  },
  {
    id: 'ipl-2025',
    name: 'IPL 2025',
    subtitle: 'Cobalt Broadcast Blue & Metallic Gold',
    primary: '#1D4ED8',
    secondary: '#1E3A8A',
    accent: '#FBBF24',
    surface: '#0B1120',
    textOnPrimary: '#FFFFFF',
    category: 'classic',
  },
  {
    id: 'ipl-2023-dynamic',
    name: 'IPL 2023 Dynamic',
    subtitle: 'Dynamic Azure, Crimson & Gold Trim',
    primary: '#303F9F',
    secondary: '#E11D48',
    accent: '#FDE047',
    surface: '#111827',
    textOnPrimary: '#FFFFFF',
    category: 'classic',
  },
  {
    id: 'psl-2025',
    name: 'PSL 2025',
    subtitle: 'Emerald Stadium Green & Gold',
    primary: '#064E3B',
    secondary: '#059669',
    accent: '#FACC15',
    surface: '#022C22',
    textOnPrimary: '#FFFFFF',
    category: 'classic',
  },
  {
    id: 'emerging-asia-cup-2024',
    name: 'Emerging Asia Cup 2024',
    subtitle: 'Teal Oceanic & Bright Coral',
    primary: '#115E59',
    secondary: '#0F766E',
    accent: '#FB923C',
    surface: '#042F2E',
    textOnPrimary: '#FFFFFF',
    category: 'classic',
  },
  {
    id: 't20-world-cup-2024',
    name: 'T20 World Cup 2024',
    subtitle: 'Midnight Navy & Neon Rose',
    primary: '#0B132B',
    secondary: '#E11D48',
    accent: '#38BDF8',
    surface: '#1C2541',
    textOnPrimary: '#FFFFFF',
    category: 'classic',
  },
  {
    id: 'world-cup-2019',
    name: 'World Cup 2019',
    subtitle: 'Classic Slate Blue & Crimson',
    primary: '#1E3A8A',
    secondary: '#B91C1C',
    accent: '#F8FAFC',
    surface: '#0F172A',
    textOnPrimary: '#FFFFFF',
    category: 'classic',
  },
];

export function getThemePalette(
  themeId: OverlayThemeId | string,
  custom?: { enabled: boolean; primary: string; secondary: string; accent: string }
): BroadcastThemeConfig {
  const base =
    BROADCAST_THEMES.find((t) => t.id === themeId) ?? BROADCAST_THEMES[0];
  if (custom?.enabled) {
    return {
      ...base,
      primary: custom.primary || base.primary,
      secondary: custom.secondary || base.secondary,
      accent: custom.accent || base.accent,
      barStyle: undefined,
    };
  }
  return base;
}

export function formatOvers(legalBalls: number): string {
  const safe = Math.max(0, Math.floor(legalBalls));
  const overs = Math.floor(safe / 6);
  const balls = safe % 6;
  return `${overs}.${balls}`;
}

export function calcRunRate(runs: number, legalBalls: number): string {
  if (legalBalls <= 0) return '0.00';
  return ((runs * 6) / legalBalls).toFixed(2);
}

export function calcStrikeRate(runs: number, balls: number): string {
  if (balls <= 0) return '0.00';
  return ((runs / balls) * 100).toFixed(1);
}

export function getBallPillLabel(ball: BallEvent): string {
  if (ball.isWicket) {
    return ball.totalRuns > 0 ? `W+${ball.totalRuns}` : 'W';
  }
  if (ball.extraType === 'WD') {
    return ball.extraRuns > 1 ? `WD+${ball.extraRuns - 1}` : 'WD';
  }
  if (ball.extraType === 'NB') {
    const bat = ball.runsOffBat;
    return bat > 0 ? `NB+${bat}` : 'NB';
  }
  if (ball.extraType === 'LB') {
    return `LB${ball.extraRuns}`;
  }
  if (ball.extraType === 'BYE') {
    return `B${ball.extraRuns}`;
  }
  if (ball.extraType === 'PENALTY') {
    return `P+${ball.extraRuns}`;
  }
  if (ball.isDcl) {
    return `${ball.runsOffBat}D`;
  }
  return String(ball.runsOffBat);
}

export interface BattingRowStats {
  playerId: string;
  playerName: string;
  battingPosition: number;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  sr: string;
  isOut: boolean;
  dismissalText: string;
  isStriker: boolean;
  isNonStriker: boolean;
}

export interface BowlingRowStats {
  playerId: string;
  playerName: string;
  legalBalls: number;
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
  wides: number;
  noBalls: number;
  economy: string;
  isCurrentBowler: boolean;
}

export function computeBattingCard(
  innings: InningsState,
  battingTeam: Team | undefined
): BattingRowStats[] {
  const playerMap = new Map<string, string>();
  battingTeam?.players.forEach((p) => playerMap.set(p.id, p.name));

  const order: string[] = [];
  const pushUnique = (id: string) => {
    if (id && !order.includes(id)) order.push(id);
  };

  innings.battingOrder.forEach(pushUnique);
  innings.balls.forEach((b) => {
    pushUnique(b.strikerId);
    pushUnique(b.nonStrikerId);
  });
  pushUnique(innings.strikerId);
  pushUnique(innings.nonStrikerId);

  const statsMap = new Map<
    string,
    {
      runs: number;
      balls: number;
      fours: number;
      sixes: number;
      isOut: boolean;
      dismissalText: string;
    }
  >();

  order.forEach((id) =>
    statsMap.set(id, {
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      isOut: false,
      dismissalText: 'not out',
    })
  );

  for (const b of innings.balls) {
    const rec = statsMap.get(b.strikerId);
    if (rec) {
      if (b.extraType !== 'WD' && b.extraType !== 'PENALTY') {
        rec.balls += 1;
      }
      rec.runs += b.runsOffBat;
      if (b.isBoundary4) rec.fours += 1;
      if (b.isBoundary6) rec.sixes += 1;
    }
    if (b.isWicket) {
      const outId = b.dismissedPlayerId || b.strikerId;
      const outRec = statsMap.get(outId);
      if (outRec) {
        if (b.wicketType === 'Retired Hurt') {
          outRec.isOut = false;
          outRec.dismissalText = 'retired hurt';
        } else {
          outRec.isOut = true;
          const wt = b.wicketType || 'Out';
          outRec.dismissalText = b.fielderName ? `${wt} (${b.fielderName})` : wt;
        }
      }
    }
  }

  return order.map((id, idx) => {
    const s = statsMap.get(id)!;
    const off = innings.battingStatOffsets?.[id];
    const runs = Math.max(0, s.runs + (off?.runs ?? 0));
    const balls = Math.max(0, s.balls + (off?.balls ?? 0));
    const fours = Math.max(0, s.fours + (off?.fours ?? 0));
    const sixes = Math.max(0, s.sixes + (off?.sixes ?? 0));
    return {
      playerId: id,
      playerName: playerMap.get(id) || 'Batter',
      battingPosition: idx + 1,
      runs,
      balls,
      fours,
      sixes,
      sr: calcStrikeRate(runs, balls),
      isOut: s.isOut,
      dismissalText: s.dismissalText,
      isStriker: id === innings.strikerId && !s.isOut,
      isNonStriker: id === innings.nonStrikerId && !s.isOut,
    };
  });
}

export function computeBowlingCard(
  innings: InningsState,
  bowlingTeam: Team | undefined
): BowlingRowStats[] {
  const playerMap = new Map<string, string>();
  bowlingTeam?.players.forEach((p) => playerMap.set(p.id, p.name));

  const order: string[] = [];
  const pushUnique = (id: string) => {
    if (id && !order.includes(id)) order.push(id);
  };
  innings.balls.forEach((b) => pushUnique(b.bowlerId));
  pushUnique(innings.bowlerId);

  const statsMap = new Map<
    string,
    {
      legalBalls: number;
      runs: number;
      wickets: number;
      wides: number;
      noBalls: number;
      overRuns: Map<number, { legal: number; conceded: number }>;
    }
  >();

  order.forEach((id) =>
    statsMap.set(id, {
      legalBalls: 0,
      runs: 0,
      wickets: 0,
      wides: 0,
      noBalls: 0,
      overRuns: new Map(),
    })
  );

  for (const b of innings.balls) {
    const rec = statsMap.get(b.bowlerId);
    if (!rec) continue;
    if (b.isLegal) rec.legalBalls += 1;

    let bowlerRuns = 0;
    if (b.extraType === 'WD') {
      bowlerRuns = b.extraRuns;
      rec.wides += 1;
    } else if (b.extraType === 'NB') {
      bowlerRuns = b.runsOffBat + b.extraRuns;
      rec.noBalls += 1;
    } else if (b.extraType === 'none') {
      bowlerRuns = b.runsOffBat;
    }
    rec.runs += bowlerRuns;

    if (
      b.isWicket &&
      b.wicketType !== 'Run Out' &&
      b.wicketType !== 'Retired Hurt' &&
      b.wicketType !== 'Retired Out' &&
      b.wicketType !== 'Time Out' &&
      b.wicketType !== 'Obstructing the Field' &&
      b.wicketType !== 'Mankad Runout'
    ) {
      rec.wickets += 1;
    }

    const ovEntry = rec.overRuns.get(b.over) ?? { legal: 0, conceded: 0 };
    if (b.isLegal) ovEntry.legal += 1;
    ovEntry.conceded += bowlerRuns;
    rec.overRuns.set(b.over, ovEntry);
  }

  return order.map((id) => {
    const s = statsMap.get(id)!;
    let maidensBase = 0;
    s.overRuns.forEach((ov) => {
      if (ov.legal === 6 && ov.conceded === 0) maidensBase += 1;
    });
    const off = innings.bowlingStatOffsets?.[id];
    const legalBalls = Math.max(0, s.legalBalls + (off?.legalBalls ?? 0));
    const maidens = Math.max(0, maidensBase + (off?.maidens ?? 0));
    const runs = Math.max(0, s.runs + (off?.runs ?? 0));
    const wickets = Math.max(0, s.wickets + (off?.wickets ?? 0));
    return {
      playerId: id,
      playerName: playerMap.get(id) || 'Bowler',
      legalBalls,
      overs: formatOvers(legalBalls),
      maidens,
      runs,
      wickets,
      wides: s.wides,
      noBalls: s.noBalls,
      economy: calcRunRate(runs, legalBalls),
      isCurrentBowler: id === innings.bowlerId,
    };
  });
}

export function computeOversBreakdown(innings: InningsState): Array<{
  overNumber: number;
  bowlerId: string;
  balls: BallEvent[];
  runsInOver: number;
  wicketsInOver: number;
  extrasInOver: number;
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
    const wicketsInOver = balls.filter((b) => b.isWicket && b.wicketType !== 'Retired Hurt').length;
    const extrasInOver = balls.reduce((acc, b) => acc + b.extraRuns, 0);
    cumRuns += runsInOver;
    cumWkts += wicketsInOver;
    return {
      overNumber: ov + 1,
      bowlerId: balls[0]?.bowlerId || innings.bowlerId,
      balls,
      runsInOver,
      wicketsInOver,
      extrasInOver,
      cumulativeRuns: cumRuns,
      cumulativeWickets: cumWkts,
    };
  });
}

export function computePartnershipsList(
  innings: InningsState,
  battingTeam: Team | undefined
): Array<{
  wicketNumber: number;
  batter1Name: string;
  batter2Name: string;
  runs: number;
  balls: number;
  isActive: boolean;
}> {
  const playerMap = new Map<string, string>();
  battingTeam?.players.forEach((p) => playerMap.set(p.id, p.name));

  const list: Array<{
    wicketNumber: number;
    batter1Name: string;
    batter2Name: string;
    runs: number;
    balls: number;
    isActive: boolean;
  }> = [];

  let wicketIdx = 1;
  let runs = 0;
  let balls = 0;
  let pairA = innings.battingOrder[0] || innings.strikerId;
  let pairB = innings.battingOrder[1] || innings.nonStrikerId;

  for (const b of innings.balls) {
    if (!pairA) pairA = b.strikerId;
    if (!pairB) pairB = b.nonStrikerId;
    runs += b.totalRuns;
    if (b.isLegal) balls += 1;

    if (b.isWicket && b.wicketType !== 'Retired Hurt') {
      list.push({
        wicketNumber: wicketIdx,
        batter1Name: playerMap.get(b.strikerId) || 'Batter 1',
        batter2Name: playerMap.get(b.nonStrikerId) || 'Batter 2',
        runs,
        balls,
        isActive: false,
      });
      wicketIdx += 1;
      runs = 0;
      balls = 0;
      pairA = '';
      pairB = '';
    }
  }

  if (innings.balls.length > 0 || (innings.strikerId && innings.nonStrikerId)) {
    list.push({
      wicketNumber: wicketIdx,
      batter1Name: playerMap.get(innings.strikerId) || 'Striker',
      batter2Name: playerMap.get(innings.nonStrikerId) || 'Non-Striker',
      runs,
      balls,
      isActive: !innings.completed,
    });
  }

  return list;
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
  // Prevent invalid scoring after match/innings completion, while awaiting next bowler/batter, or before players are assigned
  const currentInnCheck = match.innings[match.currentInningsIndex];
  if (
    match.status === 'completed' ||
    currentInnCheck.completed ||
    currentInnCheck.pendingBowlerChange ||
    currentInnCheck.pendingNewBatter ||
    !currentInnCheck.strikerId ||
    !currentInnCheck.nonStrikerId ||
    !currentInnCheck.bowlerId
  ) {
    return match;
  }

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
    status: 'live',
    innings: [
      structuredClone(match.innings[0]),
      structuredClone(match.innings[1]),
    ] as [InningsState, InningsState],
    undoStack: [...match.undoStack.slice(-59), snapshot],
  };

  const inn = nextMatch.innings[nextMatch.currentInningsIndex];
  const extraType: ExtraType = input.extraType ?? 'none';
  const runsOffBat = Math.max(0, Math.floor(input.runsOffBat ?? 0));
  const extraRuns = Math.max(0, Math.floor(input.extraRuns ?? 0));
  const isLegal = extraType !== 'WD' && extraType !== 'NB' && extraType !== 'PENALTY';
  const totalRuns = runsOffBat + extraRuns;
  const currentOver = Math.floor(inn.legalBalls / 6);
  const ballInOver = isLegal ? (inn.legalBalls % 6) + 1 : inn.legalBalls % 6;

  // Deterministic wagon wheel coordinates
  const angleSeed = (inn.balls.length * 67 + runsOffBat * 43 + 35) % 360;
  const distSeed =
    runsOffBat >= 6 ? 0.94 : runsOffBat === 4 ? 0.88 : runsOffBat > 0 ? 0.56 : 0.28;

  const isActualDismissal = Boolean(input.isWicket && input.wicketType !== 'Retired Hurt');

  const ballEvent: BallEvent = {
    id: `b_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    over: currentOver,
    ballInOver,
    isLegal,
    runsOffBat,
    extraType,
    extraRuns,
    totalRuns,
    isBoundary4:
      input.isBoundary4 !== undefined
        ? input.isBoundary4
        : runsOffBat === 4 && extraType === 'none',
    isBoundary6:
      input.isBoundary6 !== undefined
        ? input.isBoundary6
        : runsOffBat === 6 && extraType === 'none',
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

  if (inn.strikerId && !inn.battingOrder.includes(inn.strikerId)) {
    inn.battingOrder.push(inn.strikerId);
  }
  if (inn.nonStrikerId && !inn.battingOrder.includes(inn.nonStrikerId)) {
    inn.battingOrder.push(inn.nonStrikerId);
  }

  inn.balls.push(ballEvent);
  inn.runs += totalRuns;
  if (isLegal) inn.legalBalls += 1;

  if (extraType === 'WD') inn.extras.wd += extraRuns;
  if (extraType === 'NB') inn.extras.nb += extraRuns;
  if (extraType === 'LB') inn.extras.lb += extraRuns;
  if (extraType === 'BYE') inn.extras.bye += extraRuns;
  if (extraType === 'PENALTY') inn.extras.penalty += extraRuns;

  if (ballEvent.isWicket) {
    const battingTeam = teams.find((t) => t.id === inn.battingTeamId);
    const dismissedId = ballEvent.dismissedPlayerId || inn.strikerId;
    const dismissedPlayer = battingTeam?.players.find((p) => p.id === dismissedId);

    if (isActualDismissal) {
      inn.wickets = Math.min(10, inn.wickets + 1);
      inn.fallOfWickets.push({
        wicketNumber: inn.wickets,
        scoreAtFall: inn.runs,
        oversAtFall: formatOvers(inn.legalBalls),
        playerId: dismissedId,
        playerName: dismissedPlayer?.name || 'Batter',
        wicketType: ballEvent.wicketType || 'Bowled',
      });
    }

    // Do NOT auto-pick next batter silently; only assign if scorer explicitly chose a valid, not-out incoming batter
    const rawIncomingId = (input.nextBatterId || '').trim();
    const alreadyOutIds = new Set(inn.fallOfWickets.map((f) => f.playerId));
    const isValidIncoming =
      Boolean(rawIncomingId) &&
      rawIncomingId !== dismissedId &&
      rawIncomingId !== inn.strikerId &&
      rawIncomingId !== inn.nonStrikerId &&
      !alreadyOutIds.has(rawIncomingId);

    if (isValidIncoming) {
      if (!inn.battingOrder.includes(rawIncomingId)) {
        inn.battingOrder.push(rawIncomingId);
      }
      if (dismissedId === inn.nonStrikerId) {
        inn.nonStrikerId = rawIncomingId;
      } else {
        inn.strikerId = rawIncomingId;
      }
    } else {
      // Clear dismissed batter slot so scoring pauses until scorer selects or adds the next batter
      if (dismissedId === inn.nonStrikerId) {
        inn.nonStrikerId = '';
      } else {
        inn.strikerId = '';
      }
    }

    // Rotate strike if odd runs were completed before dismissal (e.g. run out)
    if (runsOffBat % 2 === 1 && !ballEvent.isDcl) {
      const tmp = inn.strikerId;
      inn.strikerId = inn.nonStrikerId;
      inn.nonStrikerId = tmp;
    }
  } else {
    // Rotate strike on odd completed runs
    const runsForStrikeSwap =
      extraType === 'WD'
        ? Math.max(0, extraRuns - 1)
        : extraType === 'NB'
          ? runsOffBat + Math.max(0, extraRuns - 1)
          : extraType === 'BYE' || extraType === 'LB'
            ? extraRuns
            : runsOffBat;

    if (runsForStrikeSwap % 2 === 1 && !ballEvent.isDcl) {
      const tmp = inn.strikerId;
      inn.strikerId = inn.nonStrikerId;
      inn.nonStrikerId = tmp;
    }
  }

  // Over completion (6 legal balls) swaps strike automatically
  const isOverCompletedNow = isLegal && inn.legalBalls > 0 && inn.legalBalls % 6 === 0;
  if (isOverCompletedNow) {
    const tmp = inn.strikerId;
    inn.strikerId = inn.nonStrikerId;
    inn.nonStrikerId = tmp;
  }

  // Check innings / match completion conditions
  const maxBalls = inn.maxOvers * 6;
  const battingTeamObj = teams.find((t) => t.id === inn.battingTeamId);
  const bowlingTeamObj = teams.find((t) => t.id === inn.bowlingTeamId);
  const maxWickets = battingTeamObj && battingTeamObj.players.length >= 6
    ? Math.min(10, battingTeamObj.players.length - 1)
    : 10;

  if (nextMatch.currentInningsIndex === 0) {
    if (inn.legalBalls >= maxBalls || inn.wickets >= maxWickets) {
      inn.completed = true;
      nextMatch.innings[1].target = inn.runs + 1;
      nextMatch.status = 'innings_break';
      nextMatch.resultText = `Innings Break · Target ${inn.runs + 1} Runs`;
    } else {
      nextMatch.resultText = `1st Innings Live · ${battingTeamObj?.shortName || 'Team 1'} ${inn.runs}/${inn.wickets} (${formatOvers(inn.legalBalls)})`;
    }
  } else {
    const target = inn.target ?? nextMatch.innings[0].runs + 1;
    if (inn.runs >= target) {
      inn.completed = true;
      nextMatch.status = 'completed';
      const wktsLeft = Math.max(1, maxWickets - inn.wickets);
      nextMatch.resultText = `${battingTeamObj?.name || 'Team 2'} won by ${wktsLeft} wickets`;
    } else if (inn.legalBalls >= maxBalls || inn.wickets >= maxWickets) {
      inn.completed = true;
      nextMatch.status = 'completed';
      const diff = nextMatch.innings[0].runs - inn.runs;
      if (diff > 0) {
        nextMatch.resultText = `${bowlingTeamObj?.name || 'Team 1'} won by ${diff} runs`;
      } else if (diff === 0) {
        nextMatch.resultText = 'Match Tied';
      } else {
        const wktsLeft = Math.max(1, maxWickets - inn.wickets);
        nextMatch.resultText = `${battingTeamObj?.name || 'Team 2'} won by ${wktsLeft} wickets`;
      }
    } else {
      const need = Math.max(0, target - inn.runs);
      const remBalls = Math.max(0, maxBalls - inn.legalBalls);
      nextMatch.resultText = `${battingTeamObj?.shortName || 'Team 2'} need ${need} runs in ${remBalls} balls`;
    }
  }

  // Trigger mandatory bowler change pause when 6 legal balls complete an over (and innings/match continues)
  if (inn.completed || nextMatch.status === 'completed') {
    inn.pendingBowlerChange = false;
    inn.pendingNewBatter = false;
    inn.pendingBatterSlot = undefined;
  } else {
    if (isOverCompletedNow) {
      inn.pendingBowlerChange = true;
      inn.lastCompletedOverNumber = Math.floor(inn.legalBalls / 6);
      inn.previousOverBowlerId = inn.bowlerId;
    } else {
      inn.pendingBowlerChange = false;
    }

    if (!inn.strikerId || !inn.nonStrikerId) {
      inn.pendingNewBatter = true;
      inn.pendingBatterSlot = !inn.strikerId ? 'striker' : 'nonStriker';
    } else {
      inn.pendingNewBatter = false;
      inn.pendingBatterSlot = undefined;
    }
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
    matchCompletedConfirmed: last.status === 'completed' ? match.matchCompletedConfirmed : false,
    resultText: last.resultText,
    undoStack: match.undoStack.slice(0, -1),
  };
}

export function computeCurrentPartnership(innings: InningsState): {
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
} {
  let runs = 0;
  let balls = 0;
  let fours = 0;
  let sixes = 0;
  for (let i = innings.balls.length - 1; i >= 0; i--) {
    const b = innings.balls[i];
    if (b.isWicket && b.wicketType !== 'Retired Hurt') break;
    runs += b.totalRuns;
    if (b.isLegal) balls += 1;
    if (b.isBoundary4) fours += 1;
    if (b.isBoundary6) sixes += 1;
  }
  return { runs, balls, fours, sixes };
}

export interface PlayerAggregateStat {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  teamShort: string;
  matches: number;
  inningsBatted: number;
  runs: number;
  ballsFaced: number;
  notOuts: number;
  highestScore: number;
  fours: number;
  sixes: number;
  wickets: number;
  oversBowledBalls: number;
  runsConceded: number;
  bestBowlingWkts: number;
  bestBowlingRuns: number;
  pomCount: number;
  mvpPoints: number;
}

export function computeTournamentStats(
  state: CricketSuiteState,
  tournamentId?: string
): PlayerAggregateStat[] {
  const targetTourId = tournamentId || state.activeTournamentId;
  const matches = targetTourId
    ? state.matches.filter((m) => m.tournamentId === targetTourId)
    : state.matches;
  const teamMap = new Map(state.teams.map((t) => [t.id, t]));
  const map = new Map<string, PlayerAggregateStat>();

  const ensurePlayer = (playerId: string, teamId: string): PlayerAggregateStat => {
    const existing = map.get(playerId);
    if (existing) return existing;
    const team = teamMap.get(teamId);
    const pObj = team?.players.find((p) => p.id === playerId);
    const fresh: PlayerAggregateStat = {
      playerId,
      playerName: pObj?.name || 'Player',
      teamId,
      teamName: team?.name || 'Team',
      teamShort: team?.shortName || 'TM',
      matches: 0,
      inningsBatted: 0,
      runs: 0,
      ballsFaced: 0,
      notOuts: 0,
      highestScore: 0,
      fours: 0,
      sixes: 0,
      wickets: 0,
      oversBowledBalls: 0,
      runsConceded: 0,
      bestBowlingWkts: 0,
      bestBowlingRuns: 999,
      pomCount: 0,
      mvpPoints: 0,
    };
    map.set(playerId, fresh);
    return fresh;
  };

  for (const m of matches) {
    const appeared = new Set<string>();
    if (m.playerOfMatchId) {
      const t1Has = teamMap.get(m.team1Id)?.players.some((p) => p.id === m.playerOfMatchId);
      const pomTeamId = t1Has ? m.team1Id : m.team2Id;
      const rec = ensurePlayer(m.playerOfMatchId, pomTeamId);
      rec.pomCount += 1;
    }

    for (const inn of m.innings) {
      if (!inn.balls.length) continue;
      const batTeam = teamMap.get(inn.battingTeamId);
      const bowlTeam = teamMap.get(inn.bowlingTeamId);

      const batRows = computeBattingCard(inn, batTeam);
      for (const row of batRows) {
        if (row.balls === 0 && !row.isOut && row.runs === 0) continue;
        const rec = ensurePlayer(row.playerId, inn.battingTeamId);
        rec.inningsBatted += 1;
        rec.runs += row.runs;
        rec.ballsFaced += row.balls;
        if (!row.isOut) rec.notOuts += 1;
        rec.fours += row.fours;
        rec.sixes += row.sixes;
        if (row.runs > rec.highestScore) rec.highestScore = row.runs;
        appeared.add(row.playerId);
      }

      const bowlRows = computeBowlingCard(inn, bowlTeam);
      for (const row of bowlRows) {
        if (row.legalBalls === 0 && row.runs === 0 && row.wickets === 0) continue;
        const rec = ensurePlayer(row.playerId, inn.bowlingTeamId);
        rec.wickets += row.wickets;
        rec.oversBowledBalls += row.legalBalls;
        rec.runsConceded += row.runs;
        if (
          row.wickets > rec.bestBowlingWkts ||
          (row.wickets === rec.bestBowlingWkts && row.runs < rec.bestBowlingRuns)
        ) {
          rec.bestBowlingWkts = row.wickets;
          rec.bestBowlingRuns = row.runs;
        }
        appeared.add(row.playerId);
      }
    }

    appeared.forEach((pid) => {
      const rec = map.get(pid);
      if (rec) rec.matches += 1;
    });
  }

  const list = Array.from(map.values()).map((r) => ({
    ...r,
    bestBowlingRuns: r.bestBowlingRuns === 999 ? 0 : r.bestBowlingRuns,
    mvpPoints: r.runs + r.fours * 2 + r.sixes * 4 + r.wickets * 25 + r.pomCount * 20,
  }));

  return list;
}

export interface PlayerBattingPositionRow {
  key: string;
  teamId: string;
  teamName: string;
  playerId: string;
  playerName: string;
  battingPosition: number;
  innings: number;
  runs: number;
  balls: number;
  outs: number;
  average: string;
  strikeRate: string;
}

export function computePlayerBattingPositions(
  state: CricketSuiteState,
  tournamentId?: string
): PlayerBattingPositionRow[] {
  const targetTourId = tournamentId || state.activeTournamentId;
  const matches = targetTourId
    ? state.matches.filter((m) => m.tournamentId === targetTourId)
    : state.matches;
  const teamMap = new Map(state.teams.map((t) => [t.id, t]));

  const acc = new Map<
    string,
    {
      teamId: string;
      teamName: string;
      playerId: string;
      playerName: string;
      battingPosition: number;
      innings: number;
      runs: number;
      balls: number;
      outs: number;
    }
  >();

  for (const m of matches) {
    for (const inn of m.innings) {
      if (!inn.balls.length) continue;
      const batTeam = teamMap.get(inn.battingTeamId);
      const batCard = computeBattingCard(inn, batTeam);
      for (const row of batCard) {
        if (row.balls === 0 && row.runs === 0 && !row.isOut) continue;
        const key = `${row.playerId}__pos${row.battingPosition}`;
        const existing = acc.get(key) ?? {
          teamId: inn.battingTeamId,
          teamName: batTeam?.name || 'Team',
          playerId: row.playerId,
          playerName: row.playerName,
          battingPosition: row.battingPosition,
          innings: 0,
          runs: 0,
          balls: 0,
          outs: 0,
        };
        existing.innings += 1;
        existing.runs += row.runs;
        existing.balls += row.balls;
        if (row.isOut) existing.outs += 1;
        acc.set(key, existing);
      }
    }
  }

  return Array.from(acc.entries())
    .map(([key, item]) => ({
      key,
      ...item,
      average:
        item.outs > 0
          ? (item.runs / item.outs).toFixed(2)
          : item.runs > 0
            ? `${item.runs}.00*`
            : '0.00',
      strikeRate: calcStrikeRate(item.runs, item.balls),
    }))
    .sort((a, b) => a.battingPosition - b.battingPosition || b.runs - a.runs);
}

export function computePointTableRows(
  state: CricketSuiteState,
  tournamentId?: string
): Array<PointTableEntry & { teamName: string; teamShort: string; groupName: string }> {
  const targetTourId = tournamentId || state.activeTournamentId;
  const tourTeams = targetTourId
    ? state.teams.filter((t) => t.tournamentId === targetTourId)
    : state.teams;
  const groups = state.groups.filter((g) => !targetTourId || g.tournamentId === targetTourId);
  const completedMatches = state.matches.filter(
    (m) => (!targetTourId || m.tournamentId === targetTourId) && m.status === 'completed'
  );

  const overrideMap = new Map(
    state.pointTableOverrides
      .filter((o) => !targetTourId || o.tournamentId === targetTourId)
      .map((o) => [o.teamId, o])
  );

  return tourTeams
    .map((team) => {
      const grp = groups.find((g) => g.teamIds.includes(team.id));
      const override = overrideMap.get(team.id);
      if (override) {
        return {
          ...override,
          teamName: team.name,
          teamShort: team.shortName,
          groupName: grp?.name || 'General',
        };
      }

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
        const inn1 = m.innings[0];
        const inn2 = m.innings[1];
        const myInn = inn1.battingTeamId === team.id ? inn1 : inn2;
        const oppInn = inn1.battingTeamId === team.id ? inn2 : inn1;

        runsFor += myInn.runs;
        oversFor += Math.max(
          0.1,
          myInn.wickets >= 10 ? myInn.maxOvers : myInn.legalBalls / 6
        );
        runsAgainst += oppInn.runs;
        oversAgainst += Math.max(
          0.1,
          oppInn.wickets >= 10 ? oppInn.maxOvers : oppInn.legalBalls / 6
        );

        if (myInn.runs > oppInn.runs) won += 1;
        else if (myInn.runs < oppInn.runs) lost += 1;
        else tied += 1;
      }

      const nrr =
        oversFor > 0 && oversAgainst > 0
          ? Number((runsFor / oversFor - runsAgainst / oversAgainst).toFixed(3))
          : 0;

      return {
        teamId: team.id,
        tournamentId: team.tournamentId,
        groupId: grp?.id || 'general',
        played,
        won,
        lost,
        tied,
        nr: 0,
        points: won * 2 + tied,
        nrr,
        teamName: team.name,
        teamShort: team.shortName,
        groupName: grp?.name || 'General',
      };
    })
    .sort((a, b) => b.points - a.points || b.nrr - a.nrr);
}

export const DEFAULT_FIELD_POSITIONS: FieldPositionSpot[] = [
  { id: 'wk', label: 'WK', x: 50, y: 74, playerId: null },
  { id: 'slip', label: '1st Slip', x: 58, y: 74, playerId: null },
  { id: 'point', label: 'Point', x: 78, y: 52, playerId: null },
  { id: 'cover', label: 'Extra Cover', x: 76, y: 34, playerId: null },
  { id: 'midoff', label: 'Mid Off', x: 62, y: 24, playerId: null },
  { id: 'midon', label: 'Mid On', x: 38, y: 24, playerId: null },
  { id: 'midwkt', label: 'Mid Wicket', x: 22, y: 36, playerId: null },
  { id: 'sqleg', label: 'Square Leg', x: 20, y: 54, playerId: null },
  { id: 'fineleg', label: 'Fine Leg', x: 34, y: 80, playerId: null },
  { id: 'thirdman', label: 'Third Man', x: 68, y: 82, playerId: null },
  { id: 'longon', label: 'Long On', x: 32, y: 12, playerId: null },
];

/**
 * Clean blank initial workspace state:
 * Zero demo tournaments, zero dummy teams, zero dummy players, zero dummy matches.
 * Only user-entered records appear.
 */
export function createInitialCricketSuiteState(
  uid: string,
  userLabel?: string
): CricketSuiteState {
  const now = new Date();
  const startLabel = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const endDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  const endLabel = endDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return {
    version: 2,
    updatedAt: 0,
    revision: 0,
    uid,
    user: {
      userName: userLabel || uid,
      userEmail: 'stareventlive01@gmail.com',
      userMobile: '9890175727',
      userTheme: 'tata-ipl-2022',
      customThemeColors: {
        enabled: false,
        primary: '#303F9F',
        secondary: '#E11D48',
        accent: '#FACC15',
      },
      subscriptionStartDate: startLabel,
      subscriptionEndDate: endLabel,
      planName: 'Pro Broadcast',
      balanceTournaments: 50,
      channelTitle: 'STAR EVENT LIVE',
      channelLogoUrl: '',
      defaultOvers: 6,
      watermarkText: 'STAREVENT.LIVE',
    },
    activeTournamentId: '',
    activeMatchId: '',
    tournaments: [],
    groups: [],
    teams: [],
    matches: [],
    pointTableOverrides: [],
    pointTableAuditLog: [],
    fieldPositions: DEFAULT_FIELD_POSITIONS.map((spot) => ({ ...spot, playerId: null })),
    overlay: {
      showPlayerPhoto: true,
      showTeamLogo: true,
      showChannelLogo: true,
      autoTransition: true,
      bottomScoreMode: 'Score',
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
