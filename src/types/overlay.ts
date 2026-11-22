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
  sponsorName?: string;
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
    sponsorName: '',
    teamAName: 'NERAL LIONS',
    teamACode: 'NER',
    teamAColor: '#C8102E',
    teamAScore: 0,
    teamARaidPoints: 0,
    teamABonusPoints: 0,
    teamATacklePoints: 0,
    teamALonaPoints: 0,
    teamAPlayersOnMat: 7,
    teamALogoUrl: '',
    teamAGreenCards: 0,
    teamAYellowCards: 0,
    teamARedCards: 0,
    teamABinEndAt: null,
    teamAStarting7: ['PLAYER 1', 'PLAYER 2', 'PLAYER 3', 'PLAYER 4', 'PLAYER 5', 'PLAYER 6', 'PLAYER 7'],
    teamBName: 'KARJAT WARRIORS',
    teamBCode: 'KAR',
    teamBColor: '#131D8A',
    teamBScore: 0,
    teamBRaidPoints: 0,
    teamBBonusPoints: 0,
    teamBTacklePoints: 0,
    teamBLonaPoints: 0,
    teamBPlayersOnMat: 7,
    teamBLogoUrl: '',
    teamBGreenCards: 0,
    teamBYellowCards: 0,
    teamBRedCards: 0,
    teamBBinEndAt: null,
    teamBStarting7: ['PLAYER 1', 'PLAYER 2', 'PLAYER 3', 'PLAYER 4', 'PLAYER 5', 'PLAYER 6', 'PLAYER 7'],
    matchSeconds: 30,
    matchRunning: false,
    matchUpdatedAt: now,
    kabaddiMatchDuration: 30,
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

// ===============================================================
// Per-User Isolated Firestore Document Models (/users/{uid}/...)
// ===============================================================

export interface UserLiveScoreboardDoc {
  ownerUid: string;
  visible: boolean;
  teamAScore: number;
  teamARaidPoints: number;
  teamABonusPoints: number;
  teamATacklePoints: number;
  teamALonaPoints: number;
  teamAPlayersOnMat: number;
  teamAGreenCards: number;
  teamAYellowCards: number;
  teamARedCards: number;
  teamABinEndAt: number | null;
  teamBScore: number;
  teamBRaidPoints: number;
  teamBBonusPoints: number;
  teamBTacklePoints: number;
  teamBLonaPoints: number;
  teamBPlayersOnMat: number;
  teamBGreenCards: number;
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
  matchStatus: KabaddiMatchStatus;
  timeoutTeam: KabaddiTimeoutTeam;
  doOrDie: boolean;
  kabaddiAlert: string | null;
  kabaddiGraphicPanel: KabaddiGraphicPanel;
  version: number;
  updatedAt: number;
}

export interface UserScoreboardSettingsDoc {
  ownerUid: string;
  teamAName: string;
  teamACode: string;
  teamAColor: string;
  teamALogoUrl: string;
  teamAStarting7: string[];
  teamBName: string;
  teamBCode: string;
  teamBColor: string;
  teamBLogoUrl: string;
  teamBStarting7: string[];
  kabaddiTitle: string;
  kabaddiSubtitle: string;
  kabaddiTag: string;
  kabaddiVenue: string;
  kabaddiLeague: string;
  kabaddiEvent: string;
  kabaddiMatchType: string;
  sponsorName: string;
  championTeam: string;
  runnerUpTeam: string;
  thirdPlaceTeam: string;
  fourthPlaceTeam: string;
  version: number;
  updatedAt: number;
}

export interface UserUndoSnapshot {
  teamAScore: number;
  teamARaidPoints: number;
  teamABonusPoints: number;
  teamATacklePoints: number;
  teamALonaPoints: number;
  teamAPlayersOnMat: number;
  teamAGreenCards: number;
  teamAYellowCards: number;
  teamARedCards: number;
  teamABinEndAt: number | null;
  teamBScore: number;
  teamBRaidPoints: number;
  teamBBonusPoints: number;
  teamBTacklePoints: number;
  teamBLonaPoints: number;
  teamBPlayersOnMat: number;
  teamBGreenCards: number;
  teamBYellowCards: number;
  teamBRedCards: number;
  teamBBinEndAt: number | null;
  kabaddiHalf: KabaddiHalf;
  doOrDie: boolean;
  label: string;
  savedAt: number;
}

export interface UserUndoHistoryDoc {
  ownerUid: string;
  entries: UserUndoSnapshot[];
  updatedAt: number;
}

export function createInitialUserScoreboardDoc(ownerUid: string): UserLiveScoreboardDoc {
  const now = Date.now();
  return {
    ownerUid,
    visible: true,
    teamAScore: 0,
    teamARaidPoints: 0,
    teamABonusPoints: 0,
    teamATacklePoints: 0,
    teamALonaPoints: 0,
    teamAPlayersOnMat: 7,
    teamAGreenCards: 0,
    teamAYellowCards: 0,
    teamARedCards: 0,
    teamABinEndAt: null,
    teamBScore: 0,
    teamBRaidPoints: 0,
    teamBBonusPoints: 0,
    teamBTacklePoints: 0,
    teamBLonaPoints: 0,
    teamBPlayersOnMat: 7,
    teamBGreenCards: 0,
    teamBYellowCards: 0,
    teamBRedCards: 0,
    teamBBinEndAt: null,
    matchSeconds: 30,
    matchRunning: false,
    matchUpdatedAt: now,
    raidSeconds: 30,
    raidRunning: false,
    raidUpdatedAt: now,
    kabaddiHalf: '1ST HALF',
    matchStatus: 'LIVE',
    timeoutTeam: null,
    doOrDie: false,
    kabaddiAlert: null,
    kabaddiGraphicPanel: 'none',
    version: 1,
    updatedAt: now,
  };
}

export function createInitialUserSettingsDoc(
  ownerUid: string,
  customTitle?: string
): UserScoreboardSettingsDoc {
  const now = Date.now();
  return {
    ownerUid,
    teamAName: 'TEAM A',
    teamACode: 'TMA',
    teamAColor: '#C8102E',
    teamALogoUrl: '',
    teamAStarting7: ['PLAYER 1', 'PLAYER 2', 'PLAYER 3', 'PLAYER 4', 'PLAYER 5', 'PLAYER 6', 'PLAYER 7'],
    teamBName: 'TEAM B',
    teamBCode: 'TMB',
    teamBColor: '#131D8A',
    teamBLogoUrl: '',
    teamBStarting7: ['PLAYER 1', 'PLAYER 2', 'PLAYER 3', 'PLAYER 4', 'PLAYER 5', 'PLAYER 6', 'PLAYER 7'],
    kabaddiTitle: (customTitle || 'LIVE KABADDI CHAMPIONSHIP').slice(0, 120),
    kabaddiSubtitle: 'LIVE KABADDI BROADCAST',
    kabaddiTag: 'LIVE KABADDI',
    kabaddiVenue: 'MAIN GROUND',
    kabaddiLeague: 'KABADDI LEAGUE',
    kabaddiEvent: 'SEASON 2026',
    kabaddiMatchType: 'LEAGUE MATCH',
    sponsorName: '',
    championTeam: 'TEAM A',
    runnerUpTeam: 'TEAM B',
    thirdPlaceTeam: '',
    fourthPlaceTeam: '',
    version: 1,
    updatedAt: now,
  };
}

export function mergeUserDocsToOverlayState(
  ownerUid: string,
  scoreDoc: UserLiveScoreboardDoc,
  settingsDoc: UserScoreboardSettingsDoc
): LiveOverlayState {
  const base = createDefaultOverlayState(ownerUid);
  return {
    ...base,
    roomId: ownerUid,
    mode: 'kabaddi',
    style: 'classic',
    visible: scoreDoc.visible,
    updatedAt: Math.max(scoreDoc.updatedAt, settingsDoc.updatedAt),
    // Permanent settings (NEVER overwritten by score actions/reset/undo)
    kabaddiTitle: settingsDoc.kabaddiTitle,
    kabaddiSubtitle: settingsDoc.kabaddiSubtitle,
    kabaddiTag: settingsDoc.kabaddiTag || 'LIVE KABADDI',
    kabaddiVenue: settingsDoc.kabaddiVenue || '',
    kabaddiLeague: settingsDoc.kabaddiLeague || '',
    kabaddiEvent: settingsDoc.kabaddiEvent || '',
    kabaddiMatchType: settingsDoc.kabaddiMatchType || '',
    sponsorName: settingsDoc.sponsorName || '',
    teamAName: settingsDoc.teamAName,
    teamACode: settingsDoc.teamACode,
    teamAColor: settingsDoc.teamAColor,
    teamALogoUrl: settingsDoc.teamALogoUrl || '',
    teamAStarting7: settingsDoc.teamAStarting7?.length ? settingsDoc.teamAStarting7 : base.teamAStarting7,
    teamBName: settingsDoc.teamBName,
    teamBCode: settingsDoc.teamBCode,
    teamBColor: settingsDoc.teamBColor,
    teamBLogoUrl: settingsDoc.teamBLogoUrl || '',
    teamBStarting7: settingsDoc.teamBStarting7?.length ? settingsDoc.teamBStarting7 : base.teamBStarting7,
    championTeam: settingsDoc.championTeam || '',
    runnerUpTeam: settingsDoc.runnerUpTeam || '',
    thirdPlaceTeam: settingsDoc.thirdPlaceTeam || '',
    fourthPlaceTeam: settingsDoc.fourthPlaceTeam || '',
    // Live match scoreboard fields
    teamAScore: scoreDoc.teamAScore,
    teamARaidPoints: scoreDoc.teamARaidPoints ?? 0,
    teamABonusPoints: scoreDoc.teamABonusPoints ?? 0,
    teamATacklePoints: scoreDoc.teamATacklePoints ?? 0,
    teamALonaPoints: scoreDoc.teamALonaPoints ?? 0,
    teamAPlayersOnMat: scoreDoc.teamAPlayersOnMat,
    teamAGreenCards: scoreDoc.teamAGreenCards ?? 0,
    teamAYellowCards: scoreDoc.teamAYellowCards ?? 0,
    teamARedCards: scoreDoc.teamARedCards ?? 0,
    teamABinEndAt: scoreDoc.teamABinEndAt ?? null,
    teamBScore: scoreDoc.teamBScore,
    teamBRaidPoints: scoreDoc.teamBRaidPoints ?? 0,
    teamBBonusPoints: scoreDoc.teamBBonusPoints ?? 0,
    teamBTacklePoints: scoreDoc.teamBTacklePoints ?? 0,
    teamBLonaPoints: scoreDoc.teamBLonaPoints ?? 0,
    teamBPlayersOnMat: scoreDoc.teamBPlayersOnMat,
    teamBGreenCards: scoreDoc.teamBGreenCards ?? 0,
    teamBYellowCards: scoreDoc.teamBYellowCards ?? 0,
    teamBRedCards: scoreDoc.teamBRedCards ?? 0,
    teamBBinEndAt: scoreDoc.teamBBinEndAt ?? null,
    matchSeconds: scoreDoc.matchSeconds,
    matchRunning: scoreDoc.matchRunning,
    matchUpdatedAt: scoreDoc.matchUpdatedAt,
    kabaddiMatchDuration: 30,
    raidSeconds: scoreDoc.raidSeconds,
    raidRunning: scoreDoc.raidRunning,
    raidUpdatedAt: scoreDoc.raidUpdatedAt,
    kabaddiRaidDuration: 30,
    kabaddiHalf: scoreDoc.kabaddiHalf,
    matchStatus: scoreDoc.matchStatus ?? 'LIVE',
    timeoutTeam: scoreDoc.timeoutTeam ?? null,
    doOrDie: scoreDoc.doOrDie,
    kabaddiAlert: scoreDoc.kabaddiAlert ?? null,
    kabaddiGraphicPanel: scoreDoc.kabaddiGraphicPanel ?? 'none',
  };
}

