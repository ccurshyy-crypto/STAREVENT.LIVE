import { Language } from './content';
import { normalizeStyleForMode, OverlayMode, OverlayStyle } from '../types/overlay';

export type OverlaySku = 'kabaddi-demo' | 'kabaddi-classic' | 'haldi-classic' | 'haldi-modern';

export type OverlayPlanId = '1day' | '1week' | '1month';

export interface OverlayPlan {
  id: OverlayPlanId;
  price: number;
  originalPrice: number;
  durationHours: number;
  shortLabel: Record<Language, string>;
  label: Record<Language, string>;
  badge?: Record<Language, string>;
  desc: Record<Language, string>;
}

export const OVERLAY_PLANS: OverlayPlan[] = [
  {
    id: '1day',
    price: 1,
    originalPrice: 49,
    durationHours: 24,
    shortLabel: { mr: '1 दिवस', en: '1 Day' },
    label: { mr: 'आजची ऑफर · 1 दिवस (₹1)', en: "Today's Offer · 1 Day (₹1)" },
    badge: { mr: 'आजची ऑफर', en: "TODAY'S OFFER" },
    desc: { mr: 'आजची खास ऑफर · 24 तास पूर्ण ॲक्सेस', en: "Today's special offer · 24 hours full access" },
  },
  {
    id: '1week',
    price: 149,
    originalPrice: 299,
    durationHours: 168,
    shortLabel: { mr: '1 आठवडा', en: '1 Week' },
    label: { mr: '1 आठवडा पास (₹149)', en: '1 Week Pass (₹149)' },
    badge: { mr: 'लोकप्रिय', en: 'POPULAR' },
    desc: { mr: '7 दिवस पूर्ण ॲक्सेस · टूर्नामेंटसाठी बेस्ट', en: '7 days full access · Best for tournaments' },
  },
  {
    id: '1month',
    price: 1499,
    originalPrice: 2499,
    durationHours: 720,
    shortLabel: { mr: '1 महिना', en: '1 Month' },
    label: { mr: '1 महिना पास (₹1,499)', en: '1 Month Pass (₹1,499)' },
    badge: { mr: 'प्रो स्टुडिओ', en: 'PRO STUDIO' },
    desc: { mr: '30 दिवस पूर्ण ॲक्सेस · अनलिमिटेड शो', en: '30 days full access · Unlimited broadcasts' },
  },
];

export function getOverlayPlan(planId?: string): OverlayPlan {
  return OVERLAY_PLANS.find((p) => p.id === planId) ?? OVERLAY_PLANS[0];
}

export interface OverlayProduct {
  sku: OverlaySku;
  mode: OverlayMode;
  style: OverlayStyle;
  isFreeDemo?: boolean;
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
  planId?: OverlayPlanId;
  expiresAt: number;
}

export interface PendingOverlayOrder {
  orderId: string;
  cfOrderId?: string;
  sku: OverlaySku;
  planId?: OverlayPlanId;
  durationHours?: number;
  utrRef: string;
  amount: number;
  paymentMethod?: 'cashfree_qr' | 'upi_manual' | 'owner_key';
  gatewayEnv?: 'sandbox' | 'production';
  paymentSessionId?: string;
  gatewayQrImageUrl?: string;
  upiIntentUrl?: string;
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
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
  }
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

export function getOverlaySku(mode: OverlayMode, style: OverlayStyle): OverlaySku {
  const safeStyle = normalizeStyleForMode(mode, style);
  return `${mode}-${safeStyle}` as OverlaySku;
}

export const OVERLAY_PRODUCTS: OverlayProduct[] = [
  {
    sku: 'kabaddi-demo',
    mode: 'kabaddi',
    style: 'demo',
    isFreeDemo: true,
    originalPrice: 0,
    salePrice: 0,
    title: {
      mr: 'कबड्डी डेमो स्कोअरबोर्ड (मोफत · छोटा वॉटरमार्क)',
      en: 'Kabaddi Demo Scoreboard (FREE · Small Watermark)',
    },
    subtitle: {
      mr: 'OBS व vMix साठी मोफत वापरा — स्कोअरबोर्डवर छोटा STAR EVENT LIVE वॉटरमार्क राहील',
      en: 'Free live scoreboard for OBS & vMix — includes a small STAR EVENT LIVE watermark',
    },
    meta: {
      mr: ['100% मोफत डेमो', 'छोटा वॉटरमार्क', 'OBS & vMix URL'],
      en: ['100% FREE Demo', 'Small Watermark', 'OBS & vMix URL'],
    },
    features: {
      mr: [
        'कोणत्याही पेमेंट शिवाय थेट OBS / vMix URL व 1920×1080 PNG मोफत मिळवा',
        'दोन्ही बाजूचे टीम लोगो, 30s टायमर, +1/-1, Bonus, All Out, Yellow/Red कार्ड्स व Sin Bin',
        'स्कोअरबोर्डवर छोटा STAR EVENT LIVE वॉटरमार्क राहील (वॉटरमार्क फ्री प्रो आजची ऑफर फक्त ₹1 / 1 दिवस)',
      ],
      en: [
        'Free OBS / vMix Browser Source URL & 1920×1080 PNG export — no payment needed',
        'Dual team logos, 30s timer, +1/-1, Bonus, All Out, Yellow/Red cards & Sin Bin',
        "Displays a small STAR EVENT LIVE watermark (watermark-free Pro is ₹1 for 1 Day today)",
      ],
    },
  },
  {
    sku: 'kabaddi-classic',
    mode: 'kabaddi',
    style: 'classic',
    originalPrice: 49,
    salePrice: 1,
    title: {
      mr: 'कबड्डी प्रो स्कोअरबोर्ड (वॉटरमार्क-फ्री · 30s टायमर)',
      en: 'Kabaddi Pro Scoreboard (Watermark-Free · 30s Timer)',
    },
    subtitle: {
      mr: 'कर्व्ह्ड ड्युअल-कलर स्कोअरबोर्ड + दोन्ही बाजू टीम लोगो + प्रो कंट्रोल डेस्क',
      en: 'Curved dual-color broadcast bar + left & right team logos + pro control desk',
    },
    meta: {
      mr: ['दोन्ही बाजू लोगो', '30s टायमर', 'ऑटो QR अनलॉक'],
      en: ['Dual Team Logos', '30s Timer', 'Auto QR Unlock'],
    },
    features: {
      mr: [
        'डाव्या व उजव्या दोन्ही बाजूंनी कस्टम टीम लोगो अपलोड व टीम कलर पिकर',
        '30s लाईव्ह टायमर, +1/-1, Bonus, All Out, Super Tackle, Super Raid, Yellow/Red कार्ड्स व Sin Bin',
        'आजची ऑफर: फक्त ₹1 पेमेंट करा — 1 दिवसासाठी (24 तास) आपोआप अनलॉक, नंतर ऑटो एक्सपायर',
      ],
      en: [
        'Upload custom Left & Right team logos and customize both wing colors live',
        'Live 30s timer, +1/-1, Bonus, All Out, Super Tackle, Super Raid, Yellow/Red cards & Sin Bin',
        "Today's Offer: Pay ₹1 — instant automatic unlock for 1 Day (24 hours), then auto-expires",
      ],
    },
  },
  {
    sku: 'haldi-classic',
    mode: 'haldi',
    style: 'classic',
    originalPrice: 49,
    salePrice: 1,
    title: {
      mr: 'हळदी व लग्न समारंभ · स्टाईल 1 (शाही गोल्ड फ्रेम)',
      en: 'Haldi & Wedding · Style 1 (Shahi Gold Frame)',
    },
    subtitle: {
      mr: 'झेंडू-सोनेरी कॉर्नर फ्रेम + हळदी व लग्नासाठी मराठी टॉप बॅनर + लाईव्ह टायटल',
      en: 'Turmeric-gold ornamental corners + Haldi & Wedding Marathi header + live banner',
    },
    meta: {
      mr: ['हळदी व लग्न', 'OBS & vMix URL', '1 दिवस ऑटो अनलॉक'],
      en: ['Haldi & Wedding', 'OBS & vMix URL', '1-Day Auto Unlock'],
    },
    features: {
      mr: [
        'हळदी किंवा शुभ विवाह (वधू-वर / कुटुंबाचे नाव) एका क्लिकमध्ये कस्टमाईज करा',
        'OBS Studio व vMix साठी थेट ट्रान्सपरंट लिंक (वॉटरमार्क-फ्री क्लियर सेंटर)',
        'आजची ऑफर: फक्त ₹1 (1 दिवस / 24 तास) — पेमेंट होताच ऑटो अनलॉक, 24h नंतर एक्सपायर',
      ],
      en: [
        'One-click presets & live editing for Haldi & Wedding bride/groom/family names',
        'Ready-to-paste OBS & vMix transparent browser URL (clean watermark-free center)',
        "Today's Offer: Just ₹1 (1 Day / 24h) — instant auto-unlock on payment, auto-expires after 24h",
      ],
    },
  },
  {
    sku: 'haldi-modern',
    mode: 'haldi',
    style: 'modern',
    originalPrice: 49,
    salePrice: 1,
    title: {
      mr: 'हळदी व लग्न समारंभ · स्टाईल 2 (सिनेमॅटिक रिबन)',
      en: 'Haldi & Wedding · Style 2 (Cinematic Ribbon)',
    },
    subtitle: {
      mr: 'क्लिन ओपन स्क्रीन + हळदी व लग्नासाठी फ्लोटिंग गोल्डन रिबन टायटल',
      en: 'Clean open frame + floating warm-gold lower-third ribbon for Haldi & Wedding',
    },
    meta: {
      mr: ['हळदी व लग्न', 'OBS & vMix URL', '1 दिवस ऑटो अनलॉक'],
      en: ['Haldi & Wedding', 'OBS & vMix URL', '1-Day Auto Unlock'],
    },
    features: {
      mr: [
        '4K जिम्बल हळदी व लग्न शॉट्ससाठी बॉर्डरलेस क्लिन लोअर-थर्ड रिबन डिझाइन',
        'YouTube Live साठी रिअल-टाईम हळदी / लग्न टायटल सिंक (OBS व vMix)',
        'आजची ऑफर: फक्त ₹1 (1 दिवस / 24 तास) — पेमेंट होताच ऑटो अनलॉक, 24h नंतर एक्सपायर',
      ],
      en: [
        'Uncluttered floating ribbon crafted for 4K gimbal Haldi & Wedding shots',
        'Live Haldi & Wedding title updates synced directly to OBS and vMix',
        "Today's Offer: Just ₹1 (1 Day / 24h) — instant auto-unlock on payment, auto-expires after 24h",
      ],
    },
  },
];
