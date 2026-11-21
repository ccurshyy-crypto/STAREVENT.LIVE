import { Language } from './content';
import { normalizeStyleForMode, OverlayMode, OverlayStyle } from '../types/overlay';

export type OverlaySku = 'kabaddi-classic' | 'haldi-classic' | 'haldi-modern';

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
    sku: 'kabaddi-classic',
    mode: 'kabaddi',
    style: 'classic',
    originalPrice: 149,
    salePrice: 99,
    title: {
      mr: 'कबड्डी प्रो स्कोअरबोर्ड (ड्युअल लोगो + 30:00 टायमर)',
      en: 'Kabaddi Pro Scoreboard (Dual Logo + 30:00 Timer)',
    },
    subtitle: {
      mr: 'कर्व्ह्ड ड्युअल-कलर स्कोअरबोर्ड + दोन्ही बाजू टीम लोगो + प्रो कंट्रोल डेस्क',
      en: 'Curved dual-color broadcast bar + left & right team logos + pro control desk',
    },
    meta: {
      mr: ['दोन्ही बाजू लोगो', '30:00 टायमर', 'OBS & vMix URL'],
      en: ['Dual Team Logos', '30:00 Timer', 'OBS & vMix URL'],
    },
    features: {
      mr: [
        'डाव्या व उजव्या दोन्ही बाजूंनी कस्टम टीम लोगो अपलोड व टीम कलर पिकर',
        '30:00 लाईव्ह मॅच क्लॉक, +1/-1, Bonus, All Out, Super Tackle, Super Raid, Yellow/Red कार्ड्स व Sin Bin टायमर',
        'OBS Studio व vMix ट्रान्सपरंट Browser Source URL + 1920×1080 PNG डाउनलोड',
      ],
      en: [
        'Upload custom Left & Right team logos and customize both wing colors live',
        'Live 30:00 match clock, +1/-1, Bonus, All Out, Super Tackle, Super Raid, Yellow/Red cards & Sin Bin timer',
        'Live transparent OBS & vMix Browser Source URL + 1920×1080 PNG export',
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
