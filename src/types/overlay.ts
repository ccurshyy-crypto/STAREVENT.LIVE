export type OverlayMode = 'kabaddi' | 'haldi';

export type OverlayStyle = 'classic' | 'modern' | 'demo';

export type OverlayBackground = 'transparent' | 'green' | 'blue';

export type LogoCorner = 'top-right' | 'top-left';

export type KabaddiHalf = '1ST HALF' | '2ND HALF' | 'HALF TIME' | 'FULL TIME';

export function normalizeStyleForMode(mode: OverlayMode, style?: string): OverlayStyle {
  if (mode === 'kabaddi') {
    return style === 'demo' ? 'demo' : 'classic';
  }
  return style === 'modern' ? 'modern' : 'classic';
}

export interface LiveOverlayState {
  roomId: string;
  mode: OverlayMode;
  style: OverlayStyle;
  visible: boolean;
  showLogo: boolean;
  logoCorner: LogoCorner;
  customLogoUrl: string;
  updatedAt: number;
  // Kabaddi Scoreboard state (Curved Dual-Logo Pro Scoreboard)
  kabaddiTitle: string;
  kabaddiSubtitle: string;
  kabaddiTag: string;
  teamAName: string;
  teamACode: string;
  teamAColor: string;
  teamAScore: number;
  teamALogoUrl: string;
  teamAYellowCards: number;
  teamARedCards: number;
  teamABinEndAt: number | null;
  teamBName: string;
  teamBCode: string;
  teamBColor: string;
  teamBScore: number;
  teamBLogoUrl: string;
  teamBYellowCards: number;
  teamBRedCards: number;
  teamBBinEndAt: number | null;
  matchSeconds: number;
  matchRunning: boolean;
  matchUpdatedAt: number;
  raidSeconds: number;
  raidRunning: boolean;
  raidUpdatedAt: number;
  kabaddiHalf: KabaddiHalf;
  doOrDie: boolean;
  kabaddiAlert: string | null;
  // Haldi & Wedding Ceremony Overlay state (2 Styles)
  haldiTag: string;
  haldiHeader: string;
  haldiTitle: string;
  haldiSubtitle: string;
}

export function createDefaultOverlayState(roomId = 'star-live-1'): LiveOverlayState {
  const now = Date.now();
  return {
    roomId,
    mode: 'kabaddi',
    style: 'classic',
    visible: true,
    showLogo: false,
    logoCorner: 'top-right',
    customLogoUrl: '',
    updatedAt: now,
    kabaddiTitle: 'भव्य कबड्डी महासंग्राम २०२६',
    kabaddiSubtitle: 'थेट प्रक्षेपण • Neral & Karjat Live',
    kabaddiTag: 'LIVE KABADDI',
    teamAName: 'NERAL LIONS',
    teamACode: 'NER',
    teamAColor: '#C8102E',
    teamAScore: 24,
    teamALogoUrl: '',
    teamAYellowCards: 0,
    teamARedCards: 0,
    teamABinEndAt: null,
    teamBName: 'KARJAT WARRIORS',
    teamBCode: 'KAR',
    teamBColor: '#131D8A',
    teamBScore: 21,
    teamBLogoUrl: '',
    teamBYellowCards: 0,
    teamBRedCards: 0,
    teamBBinEndAt: null,
    matchSeconds: 30,
    matchRunning: true,
    matchUpdatedAt: now,
    raidSeconds: 30,
    raidRunning: false,
    raidUpdatedAt: now,
    kabaddiHalf: '1ST HALF',
    doOrDie: false,
    kabaddiAlert: null,
    haldiTag: 'HALDI & WEDDING',
    haldiHeader: '|| श्री गणेशाय नमः || शुभ हळदी व लग्न समारंभ',
    haldiTitle: 'देशमुख कुटुंब — शुभ हळदी व लग्न समारंभ',
    haldiSubtitle: 'थेट प्रक्षेपण • दिनांक व ठिकाण',
  };
}
