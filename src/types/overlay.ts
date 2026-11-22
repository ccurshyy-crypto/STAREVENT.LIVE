export type OverlayMode = 'kabaddi' | 'haldi';

export type OverlayStyle = 'classic' | 'modern' | 'demo' | 'festive' | 'wedding';

export type HaldiAnimationMode = 'festive' | 'shimmer' | 'petals' | 'beat' | 'static';

export type HaldiColorTheme = 'royal-maroon' | 'turmeric-gold' | 'saffron-red' | 'emerald-gold';

export type HaldiAnimSpeed = 'slow' | 'normal' | 'fast';

export type WeddingBottomAnimation = 'gentle' | 'shimmer' | 'petals' | 'static';

export type OverlayBackground = 'transparent' | 'green' | 'blue';

export type LogoCorner = 'top-right' | 'top-left';

export type KabaddiHalf = '1ST HALF' | '2ND HALF' | 'HALF TIME' | 'FULL TIME';

export type KabaddiMatchStatus = 'LIVE' | 'PAUSED' | 'TIMEOUT' | 'HALF TIME' | 'FULL TIME';

export type KabaddiTimeoutTeam = 'A' | 'B' | 'OFFICIAL' | null;

export type KabaddiGraphicPanel =
  | 'none'
  | 'starting7'
  | 'player_stats'
  | 'match_stats'
  | 'knockout'
  | 'substitutions'
  | 'winners';

export interface RemotePresenceInfo {
  displays: number;
  controllers: number;
  controllerNames?: string[];
}

export interface RemoteHistoryInfo {
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
}

export function normalizeStyleForMode(mode: OverlayMode, style?: string): OverlayStyle {
  if (mode === 'kabaddi') {
    return style === 'demo' ? 'demo' : 'classic';
  }
  if (style === 'wedding') return 'wedding';
  if (style === 'festive') return 'festive';
  if (style === 'modern') return 'modern';
  return 'classic';
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
  // Kabaddi Scoreboard & vMix/OBS Broadcast Controller state
  kabaddiTitle: string;
  kabaddiSubtitle: string;
  kabaddiTag: string;
  kabaddiVenue?: string;
  kabaddiLeague?: string;
  kabaddiEvent?: string;
  kabaddiMatchType?: string;
  teamAName: string;
  teamACode: string;
  teamAColor: string;
  teamAScore: number;
  teamARaidPoints?: number;
  teamABonusPoints?: number;
  teamATacklePoints?: number;
  teamALonaPoints?: number;
  teamAPlayersOnMat?: number;
  teamALogoUrl: string;
  teamAGreenCards?: number;
  teamAYellowCards: number;
  teamARedCards: number;
  teamABinEndAt: number | null;
  teamAStarting7?: string[];
  teamBName: string;
  teamBCode: string;
  teamBColor: string;
  teamBScore: number;
  teamBRaidPoints?: number;
  teamBBonusPoints?: number;
  teamBTacklePoints?: number;
  teamBLonaPoints?: number;
  teamBPlayersOnMat?: number;
  teamBLogoUrl: string;
  teamBGreenCards?: number;
  teamBYellowCards: number;
  teamBRedCards: number;
  teamBBinEndAt: number | null;
  teamBStarting7?: string[];
  matchSeconds: number;
  matchRunning: boolean;
  matchUpdatedAt: number;
  kabaddiMatchDuration?: number;
  raidSeconds: number;
  raidRunning: boolean;
  raidUpdatedAt: number;
  kabaddiRaidDuration?: number;
  kabaddiHalf: KabaddiHalf;
  matchStatus?: KabaddiMatchStatus;
  timeoutTeam?: KabaddiTimeoutTeam;
  doOrDie: boolean;
  kabaddiAlert: string | null;
  kabaddiGraphicPanel?: KabaddiGraphicPanel;
  championTeam?: string;
  runnerUpTeam?: string;
  thirdPlaceTeam?: string;
  fourthPlaceTeam?: string;
  // Haldi & Wedding Ceremony Overlay state
  haldiTag: string;
  haldiHeader: string;
  haldiTitle: string;
  haldiSubtitle: string;
  haldiLeftText: string;
  haldiCenterMain: string;
  haldiCenterSub: string;
  haldiRightText: string;
  haldiAnimation: HaldiAnimationMode;
  haldiTheme: HaldiColorTheme;
  haldiAnimSpeed: HaldiAnimSpeed;
  haldiShowTopHeader: boolean;
  haldiShowDecor: boolean;
  haldiShowPetals: boolean;
  // Royal Customizable Wedding Frame Overlay state (name, color & subtle bottom animation)
  weddingGroomName?: string;
  weddingBrideName?: string;
  weddingConnector?: string;
  weddingEventLabel?: string;
  weddingDateVenue?: string;
  weddingTopHeader?: string;
  weddingPrimaryColor?: string;
  weddingAccentColor?: string;
  weddingTextColor?: string;
  weddingBottomAnim?: WeddingBottomAnimation;
  weddingShowTopHeader?: boolean;
  weddingShowCornerFrame?: boolean;
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
    kabaddiTitle: 'STAR EVENT KABADDI CHAMPIONSHIP 2026',
    kabaddiSubtitle: 'Live Broadcast · Neral & Karjat Arena',
    kabaddiTag: 'LIVE KABADDI',
    kabaddiVenue: 'NERAL GROUND',
    kabaddiLeague: 'PRO KABADDI',
    kabaddiEvent: 'SEASON 2026',
    kabaddiMatchType: 'LEAGUE MATCH',
    teamAName: 'NERAL LIONS',
    teamACode: 'NER',
    teamAColor: '#C8102E',
    teamAScore: 24,
    teamARaidPoints: 14,
    teamABonusPoints: 4,
    teamATacklePoints: 4,
    teamALonaPoints: 2,
    teamAPlayersOnMat: 6,
    teamALogoUrl: '',
    teamAGreenCards: 0,
    teamAYellowCards: 0,
    teamARedCards: 0,
    teamABinEndAt: null,
    teamAStarting7: ['ROHIT P.', 'SANKET M.', 'VIKAS K.', 'OMKAR D.', 'PRATIK S.', 'AKASH J.', 'SWAPNIL R.'],
    teamBName: 'KARJAT WARRIORS',
    teamBCode: 'KAR',
    teamBColor: '#131D8A',
    teamBScore: 21,
    teamBRaidPoints: 12,
    teamBBonusPoints: 3,
    teamBTacklePoints: 4,
    teamBLonaPoints: 2,
    teamBPlayersOnMat: 5,
    teamBLogoUrl: '',
    teamBGreenCards: 0,
    teamBYellowCards: 0,
    teamBRedCards: 0,
    teamBBinEndAt: null,
    teamBStarting7: ['SAHIL G.', 'YASH T.', 'ADITYA B.', 'MAYUR N.', 'TEJAS P.', 'KUNAL V.', 'SHUBHAM D.'],
    matchSeconds: 1200,
    matchRunning: false,
    matchUpdatedAt: now,
    kabaddiMatchDuration: 1200,
    raidSeconds: 30,
    raidRunning: false,
    raidUpdatedAt: now,
    kabaddiRaidDuration: 30,
    kabaddiHalf: '1ST HALF',
    matchStatus: 'LIVE',
    timeoutTeam: null,
    doOrDie: false,
    kabaddiAlert: null,
    kabaddiGraphicPanel: 'none',
    championTeam: 'NERAL LIONS',
    runnerUpTeam: 'KARJAT WARRIORS',
    thirdPlaceTeam: 'BADLAPUR TIGERS',
    fourthPlaceTeam: 'PANVEL KINGS',
    haldiTag: 'HALDI & WEDDING',
    haldiHeader: '|| श्री गणेशाय नमः || शुभ हळदी व लग्न समारंभ',
    haldiTitle: 'देशमुख कुटुंब — शुभ हळदी व लग्न समारंभ',
    haldiSubtitle: 'थेट प्रक्षेपण • दिनांक व ठिकाण',
    haldiLeftText: 'शुभ विवाह...',
    haldiCenterMain: 'हळदी',
    haldiCenterSub: 'समारंभ',
    haldiRightText: 'Haldi Ceremony',
    haldiAnimation: 'festive',
    haldiTheme: 'royal-maroon',
    haldiAnimSpeed: 'normal',
    haldiShowTopHeader: false,
    haldiShowDecor: true,
    haldiShowPetals: true,
    weddingGroomName: 'चि. रोहित',
    weddingBrideName: 'चि. सौ. कां. प्रिया',
    weddingConnector: 'व',
    weddingEventLabel: 'शुभ विवाह सोहळा',
    weddingDateVenue: 'थेट प्रक्षेपण • दिनांक व ठिकाण',
    weddingTopHeader: '|| श्री गणेशाय नमः ||',
    weddingPrimaryColor: '#6B0F26',
    weddingAccentColor: '#F5C542',
    weddingTextColor: '#FFFFFF',
    weddingBottomAnim: 'gentle',
    weddingShowTopHeader: true,
    weddingShowCornerFrame: true,
  };
}
