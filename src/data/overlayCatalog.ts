import { Language } from './content';
import {
  BannerThemeId,
  normalizeStyleForMode,
  OverlayMode,
  OverlayStyle,
} from '../types/overlay';

export type OverlaySku =
  | 'kabaddi-classic'
  | 'kabaddi-modern'
  | 'haldi-classic'
  | 'haldi-modern'
  | 'banner-theme1'
  | 'banner-theme2'
  | 'banner-theme3'
  | 'banner-theme4';

export interface BannerThemeConfig {
  id: BannerThemeId;
  name: Record<Language, string>;
  shortDesc: Record<Language, string>;
  stripGradientCss: string;
  canvasStops: [string, string, string];
  leftBoxBorder: string;
  leftBoxBg: string;
  rightBarBorder: string;
  rightBarBg: string;
  defaultTitleColor: string;
  defaultSubtitleColor: string;
  accentGlow: string;
}

export const BANNER_THEMES: Record<BannerThemeId, BannerThemeConfig> = {
  theme1: {
    id: 'theme1',
    name: {
      mr: 'थीम 1 · रॉयल पर्पल-सायन',
      en: 'Theme 1 · Royal Purple & Cyan',
    },
    shortDesc: {
      mr: 'क्रिकेट स्पर्धा सिग्नेचर पट्टी',
      en: 'Signature tournament purple-to-cyan bar',
    },
    stripGradientCss:
      'linear-gradient(95deg, #2B1336 0%, #242147 36%, #185A82 68%, #22A8C9 100%)',
    canvasStops: ['#2B1336', '#1D3E6B', '#22A8C9'],
    leftBoxBorder: '#FFFFFF',
    leftBoxBg: 'rgba(20, 12, 34, 0.55)',
    rightBarBorder: '#FACC15',
    rightBarBg: 'rgba(14, 34, 66, 0.42)',
    defaultTitleColor: '#FF9F0A',
    defaultSubtitleColor: '#FFFFFF',
    accentGlow: 'rgba(250, 204, 21, 0.45)',
  },
  theme2: {
    id: 'theme2',
    name: {
      mr: 'थीम 2 · शाही क्रिमसन-गोल्ड',
      en: 'Theme 2 · Shahi Crimson & Gold',
    },
    shortDesc: {
      mr: 'लाल-सोनेरी अरेना ब्रॉडकास्ट पट्टी',
      en: 'Bold crimson & metallic gold broadcast bar',
    },
    stripGradientCss:
      'linear-gradient(95deg, #3B070C 0%, #8C1319 42%, #471412 72%, #A16207 100%)',
    canvasStops: ['#3B070C', '#8C1319', '#A16207'],
    leftBoxBorder: '#FACC15',
    leftBoxBg: 'rgba(26, 5, 9, 0.62)',
    rightBarBorder: '#FDE047',
    rightBarBg: 'rgba(32, 10, 10, 0.48)',
    defaultTitleColor: '#FDE047',
    defaultSubtitleColor: '#FFFFFF',
    accentGlow: 'rgba(239, 68, 68, 0.5)',
  },
  theme3: {
    id: 'theme3',
    name: {
      mr: 'थीम 3 · एमराल्ड स्टेडियम नाईट',
      en: 'Theme 3 · Emerald Stadium Night',
    },
    shortDesc: {
      mr: 'मिडनाईट नेव्ही-हिरवी ग्राउंड थीम',
      en: 'Midnight navy to stadium emerald turf bar',
    },
    stripGradientCss:
      'linear-gradient(95deg, #09142B 0%, #0F2F4F 40%, #065F46 76%, #10B981 100%)',
    canvasStops: ['#09142B', '#0D4352', '#10B981'],
    leftBoxBorder: '#E2FBF2',
    leftBoxBg: 'rgba(6, 17, 36, 0.62)',
    rightBarBorder: '#FACC15',
    rightBarBg: 'rgba(6, 42, 42, 0.48)',
    defaultTitleColor: '#FACC15',
    defaultSubtitleColor: '#FFFFFF',
    accentGlow: 'rgba(16, 185, 129, 0.48)',
  },
  theme4: {
    id: 'theme4',
    name: {
      mr: 'थीम 4 · भगवा-शाही सुवर्ण उत्सव',
      en: 'Theme 4 · Saffron & Royal Gold',
    },
    shortDesc: {
      mr: 'भगवा-मरून उत्सव व स्पर्धा पट्टी',
      en: 'Festive saffron-gold to royal burgundy bar',
    },
    stripGradientCss:
      'linear-gradient(95deg, #5C1D0B 0%, #C2410C 42%, #7C1D42 75%, #4A044E 100%)',
    canvasStops: ['#5C1D0B', '#C2410C', '#5B1152'],
    leftBoxBorder: '#FEF08A',
    leftBoxBg: 'rgba(42, 12, 6, 0.58)',
    rightBarBorder: '#FACC15',
    rightBarBg: 'rgba(46, 8, 38, 0.48)',
    defaultTitleColor: '#FEF08A',
    defaultSubtitleColor: '#FFFFFF',
    accentGlow: 'rgba(249, 115, 22, 0.5)',
  },
};

export const BANNER_THEME_LIST: BannerThemeConfig[] = [
  BANNER_THEMES.theme1,
  BANNER_THEMES.theme2,
  BANNER_THEMES.theme3,
  BANNER_THEMES.theme4,
];

export interface OverlayProduct {
  sku: OverlaySku;
  mode: OverlayMode;
  style: OverlayStyle;
  originalPrice: number;
  salePrice: number;
  title: Record<Language, string>;
  subtitle: Record<Language, string>;
  meta: Record<Language, string[]>;
  features: Record<Language, string[]>;
}

export const OVERLAY_ACCESS_HOURS = 24;

export interface VerifiedOverlayToken {
  sku: OverlaySku;
  orderId: string;
  unlockCode: string;
  expiresAt: number;
}

export interface PendingOverlayOrder {
  orderId: string;
  sku: OverlaySku;
  utrRef: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  unlockCode?: string;
  rejectionReason?: string;
  createdAt: number;
  verifiedAt?: number;
  expiresAt?: number;
}

export function formatRemainingTime(expiresAt: number, now = Date.now()): string {
  const diffMs = Math.max(0, expiresAt - now);
  if (diffMs <= 0) return '00:00:00';
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

export function getOverlaySku(mode: OverlayMode, style: OverlayStyle): OverlaySku {
  const safeStyle = normalizeStyleForMode(mode, style);
  return `${mode}-${safeStyle}` as OverlaySku;
}

export const OVERLAY_PRODUCTS: OverlayProduct[] = [
  {
    sku: 'banner-theme1',
    mode: 'banner',
    style: 'theme1',
    originalPrice: 149,
    salePrice: 99,
    title: {
      mr: 'अॅनिमेटेड बॉटम फ्रेम · थीम 1 (रॉयल पर्पल-सायन)',
      en: 'Animated Bottom Frame · Theme 1 (Royal Purple-Cyan)',
    },
    subtitle: {
      mr: 'क्रिकेट/स्पर्धा सिग्नेचर बॉटम पट्टी + गोल्डन ट्रॉफी + पूर्ण कस्टमाईज',
      en: 'Signature tournament bottom strip + golden trophy + full live customization',
    },
    meta: {
      mr: ['अॅनिमेटेड बॉटम फ्रेम', 'OBS & vMix URL', 'पूर्ण कस्टमाईज'],
      en: ['Animated Bottom Frame', 'OBS & vMix URL', 'Full Customizer'],
    },
    features: {
      mr: [
        'डावीकडील नाव, उजवीकडील स्पर्धा/हळदी/लग्न टायटल, रंग व आयकॉन लाईव्ह बदला',
        'स्मूथ ग्रेडियंट व लाईट-शीन अॅनिमेशनसह 1920×1080 ट्रान्सपरंट आउटपुट',
        'तुमचा स्वतःचा कस्टम लोगो अपलोड करण्याची सुविधा (वॉटरमार्क फ्री) + PNG डाउनलोड',
      ],
      en: [
        'Customize left title, right subtitle, colors & Cricket/Haldi/Wedding icon live',
        'Smooth animated gradient & light-sheen sweep on 1920×1080 transparent output',
        'Watermark-free frame with optional custom logo upload + 1920×1080 PNG export',
      ],
    },
  },
  {
    sku: 'banner-theme2',
    mode: 'banner',
    style: 'theme2',
    originalPrice: 149,
    salePrice: 99,
    title: {
      mr: 'अॅनिमेटेड बॉटम फ्रेम · थीम 2 (शाही क्रिमसन-गोल्ड)',
      en: 'Animated Bottom Frame · Theme 2 (Shahi Crimson-Gold)',
    },
    subtitle: {
      mr: 'लाल-सोनेरी हाय-इम्पॅक्ट बॉटम फ्रेम + ट्रॉफी + अॅनिमेटेड ग्लो',
      en: 'High-impact crimson & gold bottom frame + trophy + animated sheen',
    },
    meta: {
      mr: ['अॅनिमेटेड बॉटम फ्रेम', 'OBS & vMix URL', 'शाही क्रिमसन'],
      en: ['Animated Bottom Frame', 'OBS & vMix URL', 'Shahi Crimson'],
    },
    features: {
      mr: [
        'क्रिकेट, कबड्डी आणि रात्रीच्या स्पर्धांसाठी आकर्षक लाल-सोनेरी थीम',
        'मराठी किंवा इंग्रजी दोन्ही नावे व रंग रिअल-टाईममध्ये बदलता येतात',
        'OBS Studio व vMix साठी थेट लिंक + 1920×1080 PNG डाउनलोड',
      ],
      en: [
        'Bold crimson & gold palette built for night cricket & kabaddi broadcasts',
        'Live Marathi or English text & color editing synced instantly to stream',
        'Direct OBS/vMix Browser Source URL + 1920×1080 transparent PNG export',
      ],
    },
  },
  {
    sku: 'banner-theme3',
    mode: 'banner',
    style: 'theme3',
    originalPrice: 149,
    salePrice: 99,
    title: {
      mr: 'अॅनिमेटेड बॉटम फ्रेम · थीम 3 (एमराल्ड स्टेडियम)',
      en: 'Animated Bottom Frame · Theme 3 (Emerald Stadium)',
    },
    subtitle: {
      mr: 'मिडनाईट नेव्ही-एमराल्ड ग्राउंड बॉटम पट्टी + अॅनिमेटेड टायटल',
      en: 'Midnight navy-to-emerald stadium lower-third + animated shine',
    },
    meta: {
      mr: ['अॅनिमेटेड बॉटम फ्रेम', 'OBS & vMix URL', 'स्टेडियम थीम'],
      en: ['Animated Bottom Frame', 'OBS & vMix URL', 'Stadium Night'],
    },
    features: {
      mr: [
        'आउटडोअर व डे-नाईट क्रिकेट-कबड्डी मॅचेससाठी फ्रेश स्टेडियम लूक',
        'क्रिकेट, कबड्डी, ट्रॉफी, कलश किंवा लग्न आयकॉन एका क्लिकमध्ये बदला',
        'अखंड लाईव्ह सिंक (OBS & vMix) + तुमचा कस्टम लोगो अपलोड + PNG डाउनलोड',
      ],
      en: [
        'Crisp stadium turf emerald & navy styling for outdoor & floodlit matches',
        'Switch left emblem between Cricket, Kabaddi, Trophy, Kalash, Wedding, or None',
        'Live SSE sync for OBS & vMix + custom logo upload + 1920×1080 PNG',
      ],
    },
  },
  {
    sku: 'banner-theme4',
    mode: 'banner',
    style: 'theme4',
    originalPrice: 149,
    salePrice: 99,
    title: {
      mr: 'अॅनिमेटेड बॉटम फ्रेम · थीम 4 (भगवा-शाही सुवर्ण)',
      en: 'Animated Bottom Frame · Theme 4 (Saffron Royal Gold)',
    },
    subtitle: {
      mr: 'भगवा-मरून उत्सवी बॉटम पट्टी — स्पर्धा, सांस्कृतिक व सोहळ्यांसाठी',
      en: 'Festive saffron & royal burgundy bottom frame for sports & cultural events',
    },
    meta: {
      mr: ['अॅनिमेटेड बॉटम फ्रेम', 'OBS & vMix URL', 'उत्सवी थीम'],
      en: ['Animated Bottom Frame', 'OBS & vMix URL', 'Festive Gold'],
    },
    features: {
      mr: [
        'टेनिस क्रिकेट, कबड्डी, सांस्कृतिक महोत्सव आणि कौटुंबिक कार्यक्रमांसाठी योग्य',
        'सर्व मजकूर, रंग, ट्रॉफी आणि लोगो पूर्णपणे कस्टमाईज करता येतो',
        'अॅनिमेटेड ब्रॉडकास्ट आउटपुट (OBS/vMix) + 1920×1080 PNG डाउनलोड',
      ],
      en: [
        'Ideal for local championships, cultural festivals, Kirtan & celebrations',
        'Full control over title, subtitle, colors, icon, trophy, logo & animation',
        'Animated OBS/vMix transparent URL + 1920×1080 transparent PNG export',
      ],
    },
  },
  {
    sku: 'kabaddi-classic',
    mode: 'kabaddi',
    style: 'classic',
    originalPrice: 149,
    salePrice: 99,
    title: {
      mr: 'कबड्डी प्रो स्कोअरबोर्ड · स्टाईल 1 (बॉटम कर्व्ह्ड बार)',
      en: 'Kabaddi Pro Scoreboard · Style 1 (Bottom Curved Bar)',
    },
    subtitle: {
      mr: 'कर्व्ह्ड ड्युअल-कलर स्कोअरबोर्ड + दोन्ही बाजू टीम लोगो + प्रो कंट्रोल डेस्क',
      en: 'Curved dual-color broadcast bar + left & right team logos + pro control desk',
    },
    meta: {
      mr: ['दोन्ही बाजू लोगो', 'OBS & vMix URL', 'प्रो कंट्रोल UI'],
      en: ['Dual Team Logos', 'OBS & vMix URL', 'Pro Control UI'],
    },
    features: {
      mr: [
        'डाव्या व उजव्या दोन्ही बाजूंनी कस्टम टीम लोगो अपलोड व टीम कलर पिकर',
        'प्रो कंट्रोल पॅनेल: +1/-1, Bonus, All Out, Super Tackle, Super Raid, Yellow/Red कार्ड्स व Sin Bin टायमर',
        'OBS Studio व vMix ट्रान्सपरंट Browser Source URL + 1920×1080 PNG डाउनलोड',
      ],
      en: [
        'Upload custom Left & Right team logos and customize both wing colors live',
        'Pro control UI: +1/-1, Bonus, All Out, Super Tackle, Super Raid, Yellow/Red cards & Sin Bin timer',
        'Live transparent OBS & vMix Browser Source URL + 1920×1080 PNG export',
      ],
    },
  },
  {
    sku: 'kabaddi-modern',
    mode: 'kabaddi',
    style: 'modern',
    originalPrice: 149,
    salePrice: 99,
    title: {
      mr: 'कबड्डी प्रो स्कोअरबोर्ड · स्टाईल 2 (टॉप TV बग)',
      en: 'Kabaddi Pro Scoreboard · Style 2 (Top TV Broadcast Bug)',
    },
    subtitle: {
      mr: 'वरच्या बाजूला फ्लोटिंग कर्व्ह्ड स्कोअरबोर्ड + मॅच क्लॉक + दोन्ही टीम लोगो',
      en: 'Top-mounted curved TV broadcast bug + live match clock + dual team logos',
    },
    meta: {
      mr: ['दोन्ही बाजू लोगो', 'OBS & vMix URL', 'टॉप TV पोझिशन'],
      en: ['Dual Team Logos', 'OBS & vMix URL', 'Top TV Position'],
    },
    features: {
      mr: [
        'कबड्डी मॅट पूर्ण मोकळे दिसण्यासाठी वरच्या बाजूला कर्व्ह्ड TV स्कोअरबोर्ड',
        '20:00 मॅच क्लॉक, 30s रेड टायमर, DO-OR-DIE व दोन्ही बाजूचे कस्टम लोगो',
        'Alpha Transparent आणि Chroma Green/Blue दोन्ही आउटपुट सपोर्ट',
      ],
      en: [
        'Top-positioned curved TV scorebar keeping the entire kabaddi mat unobstructed',
        'Live 20:00 match clock, 30s raid clock, DO-OR-DIE badge & dual team logos',
        'Supports Alpha Transparent, Chroma Green & Chroma Blue outputs',
      ],
    },
  },
  {
    sku: 'haldi-classic',
    mode: 'haldi',
    style: 'classic',
    originalPrice: 149,
    salePrice: 99,
    title: {
      mr: 'हळदी व लग्न समारंभ · स्टाईल 1 (शाही गोल्ड फ्रेम)',
      en: 'Haldi & Wedding · Style 1 (Shahi Gold Frame)',
    },
    subtitle: {
      mr: 'झेंडू-सोनेरी कॉर्नर फ्रेम + हळदी व लग्नासाठी मराठी टॉप बॅनर + लाईव्ह टायटल',
      en: 'Turmeric-gold ornamental corners + Haldi & Wedding Marathi header + live banner',
    },
    meta: {
      mr: ['हळदी व लग्न', 'OBS & vMix URL', 'मराठी सुलेखन'],
      en: ['Haldi & Wedding', 'OBS & vMix URL', 'Marathi Titles'],
    },
    features: {
      mr: [
        'हळदी किंवा शुभ विवाह (वधू-वर / कुटुंबाचे नाव) एका क्लिकमध्ये कस्टमाईज करा',
        'OBS Studio व vMix साठी थेट ट्रान्सपरंट लिंक (वॉटरमार्क-फ्री क्लियर सेंटर)',
        'तुमचा कस्टम लोगो जोडण्याची सोय + 1920×1080 ट्रान्सपरंट PNG डाउनलोड',
      ],
      en: [
        'One-click presets & live editing for Haldi & Wedding bride/groom/family names',
        'Ready-to-paste OBS & vMix transparent browser URL (clean watermark-free center)',
        'Optional custom logo upload + instant 1920×1080 transparent PNG export',
      ],
    },
  },
  {
    sku: 'haldi-modern',
    mode: 'haldi',
    style: 'modern',
    originalPrice: 149,
    salePrice: 99,
    title: {
      mr: 'हळदी व लग्न समारंभ · स्टाईल 2 (सिनेमॅटिक रिबन)',
      en: 'Haldi & Wedding · Style 2 (Cinematic Ribbon)',
    },
    subtitle: {
      mr: 'क्लिन ओपन स्क्रीन + हळदी व लग्नासाठी फ्लोटिंग गोल्डन रिबन टायटल',
      en: 'Clean open frame + floating warm-gold lower-third ribbon for Haldi & Wedding',
    },
    meta: {
      mr: ['हळदी व लग्न', 'OBS & vMix URL', 'सिनेमॅटिक स्टाईल'],
      en: ['Haldi & Wedding', 'OBS & vMix URL', 'Cinematic Look'],
    },
    features: {
      mr: [
        '4K जिम्बल हळदी व लग्न शॉट्ससाठी बॉर्डरलेस क्लिन लोअर-थर्ड रिबन डिझाइन',
        'YouTube Live साठी रिअल-टाईम हळदी / लग्न टायटल सिंक (OBS व vMix)',
        'वॉटरमार्क-फ्री आउटपुट + स्वतःचा कस्टम लोगो अपलोड व 1920×1080 PNG डाउनलोड',
      ],
      en: [
        'Uncluttered floating ribbon crafted for 4K gimbal Haldi & Wedding shots',
        'Live Haldi & Wedding title updates synced directly to OBS and vMix',
        'Watermark-free output + optional custom logo upload & 1920×1080 PNG export',
      ],
    },
  },
];
