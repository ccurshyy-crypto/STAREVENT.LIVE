export type OverlayMode = 'kabaddi' | 'haldi' | 'banner';

export type BannerThemeId = 'theme1' | 'theme2' | 'theme3' | 'theme4';

export type OverlayStyle = 'classic' | 'modern' | BannerThemeId;

export type BannerIconType = 'cricket' | 'kabaddi' | 'trophy' | 'kalash' | 'wedding' | 'none';

export type OverlayBackground = 'transparent' | 'green' | 'blue';

export type LogoCorner = 'top-right' | 'top-left';

export type KabaddiHalf = '1ST HALF' | '2ND HALF' | 'HALF TIME' | 'FULL TIME';

export function isBannerTheme(style: string | undefined): style is BannerThemeId {
  return style === 'theme1' || style === 'theme2' || style === 'theme3' || style === 'theme4';
}

export function normalizeStyleForMode(mode: OverlayMode, style?: string): OverlayStyle {
  if (mode === 'banner') {
    return isBannerTheme(style) ? style : 'theme1';
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
  // Haldi & Wedding Ceremony Overlay state
  haldiTag: string;
  haldiHeader: string;
  haldiTitle: string;
  haldiSubtitle: string;
  // Animated Customizable Bottom Frame Banner (4 Themes)
  bannerTitle: string;
  bannerSubtitle: string;
  bannerIcon: BannerIconType;
  bannerTitleColor: string;
  bannerSubtitleColor: string;
  bannerShowTrophy: boolean;
  bannerShowBrandLogo: boolean;
  bannerAnimated: boolean;
}

export function createDefaultOverlayState(roomId = 'star-live-1'): LiveOverlayState {
  const now = Date.now();
  return {
    roomId,
    mode: 'banner',
    style: 'theme1',
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
    matchSeconds: 20 * 60,
    matchRunning: false,
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
    bannerTitle: 'जय हनुमान क्रिकेट संघ चाहूचीवाडी पर्व ४',
    bannerSubtitle: 'भव्य टेनिस स्पर्धा २०२६',
    bannerIcon: 'cricket',
    bannerTitleColor: '#FF9F0A',
    bannerSubtitleColor: '#FFFFFF',
    bannerShowTrophy: true,
    bannerShowBrandLogo: false,
    bannerAnimated: true,
  };
}
