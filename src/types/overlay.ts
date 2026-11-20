export type OverlayMode = 'kabaddi' | 'haldi';

export type OverlayStyle = 'classic' | 'modern';

export type OverlayBackground = 'transparent' | 'green' | 'blue';

export type LogoCorner = 'top-right' | 'top-left';

export interface LiveOverlayState {
  roomId: string;
  mode: OverlayMode;
  style: OverlayStyle;
  visible: boolean;
  showLogo: boolean;
  logoCorner: LogoCorner;
  updatedAt: number;
  // Kabaddi Scoreboard state
  kabaddiTitle: string;
  kabaddiSubtitle: string;
  kabaddiTag: string;
  teamAName: string;
  teamAScore: number;
  teamBName: string;
  teamBScore: number;
  raidSeconds: number;
  raidRunning: boolean;
  raidUpdatedAt: number;
  kabaddiHalf: '1ST HALF' | '2ND HALF';
  doOrDie: boolean;
  kabaddiAlert: string | null;
  // Haldi Ceremony Overlay state
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
    showLogo: true,
    logoCorner: 'top-right',
    updatedAt: now,
    kabaddiTitle: 'STAR EVENT LIVE • कबड्डी महासंग्राम',
    kabaddiSubtitle: 'थेट प्रक्षेपण • Neral & Karjat Live • 9890175727',
    kabaddiTag: 'LIVE KABADDI',
    teamAName: 'NERAL LIONS',
    teamAScore: 24,
    teamBName: 'KARJAT WARRIORS',
    teamBScore: 21,
    raidSeconds: 30,
    raidRunning: false,
    raidUpdatedAt: now,
    kabaddiHalf: '2ND HALF',
    doOrDie: false,
    kabaddiAlert: null,
    haldiTag: 'HALDI LIVE',
    haldiHeader: 'STAR EVENT LIVE • शुभ हळदी समारंभ',
    haldiTitle: 'देशमुख कुटुंब — हळदी समारंभ',
    haldiSubtitle: 'थेट प्रक्षेपण • Neral & Karjat Live • 9890175727',
  };
}
