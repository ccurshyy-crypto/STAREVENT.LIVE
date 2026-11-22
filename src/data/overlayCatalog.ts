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
    shortLabel: { en: '1 Day', mr: '1 दिवस', hi: '1 दिन', gu: '1 દિવસ' },
    label: {
      en: "Today's Offer · 1 Day (₹1)",
      mr: 'आजची ऑफर · 1 दिवस (₹1)',
      hi: 'आज का ऑफर · 1 दिन (₹1)',
      gu: 'આજની ઓફર · 1 દિવસ (₹1)',
    },
    badge: {
      en: "TODAY'S OFFER",
      mr: 'आजची ऑफर',
      hi: 'आज का ऑफर',
      gu: 'આજની ઓફર',
    },
    desc: {
      en: "Today's special offer · 24 hours full access",
      mr: 'आजची खास ऑफर · 24 तास पूर्ण ॲक्सेस',
      hi: 'आज का खास ऑफर · 24 घंटे पूरा एक्सेस',
      gu: 'આજની ખાસ ઓફર · 24 કલાક સંપૂર્ણ એક્સેસ',
    },
  },
  {
    id: '1week',
    price: 149,
    originalPrice: 299,
    durationHours: 168,
    shortLabel: { en: '1 Week', mr: '1 आठवडा', hi: '1 सप्ताह', gu: '1 અઠવાડિયું' },
    label: {
      en: '1 Week Pass (₹149)',
      mr: '1 आठवडा पास (₹149)',
      hi: '1 सप्ताह पास (₹149)',
      gu: '1 અઠવાડિયાનો પાસ (₹149)',
    },
    badge: { en: 'POPULAR', mr: 'लोकप्रिय', hi: 'लोकप्रिय', gu: 'લોકપ્રિય' },
    desc: {
      en: '7 days full access · Best for tournaments',
      mr: '7 दिवस पूर्ण ॲक्सेस · टूर्नामेंटसाठी बेस्ट',
      hi: '7 दिन पूरा एक्सेस · टूर्नामेंट के लिए बेस्ट',
      gu: '7 દિવસ સંપૂર્ણ એક્સેસ · ટુર્નામેન્ટ માટે બેસ્ટ',
    },
  },
  {
    id: '1month',
    price: 1499,
    originalPrice: 2499,
    durationHours: 720,
    shortLabel: { en: '1 Month', mr: '1 महिना', hi: '1 महीना', gu: '1 મહિનો' },
    label: {
      en: '1 Month Pass (₹1,499)',
      mr: '1 महिना पास (₹1,499)',
      hi: '1 महीना पास (₹1,499)',
      gu: '1 મહિનાનો પાસ (₹1,499)',
    },
    badge: { en: 'PRO STUDIO', mr: 'प्रो स्टुडिओ', hi: 'प्रो स्टूडियो', gu: 'પ્રો સ્ટુડિયો' },
    desc: {
      en: '30 days full access · Unlimited broadcasts',
      mr: '30 दिवस पूर्ण ॲक्सेस · अनलिमिटेड शो',
      hi: '30 दिन पूरा एक्सेस · अनलिमिटेड ब्रॉडकास्ट',
      gu: '30 દિવસ સંપૂર્ણ એક્સેસ · અનલિમિટેડ બ્રોડકાસ્ટ',
    },
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
  cfPaymentId?: string;
  sku: OverlaySku;
  planId?: OverlayPlanId;
  durationHours?: number;
  utrRef: string;
  verifiedTransactionId?: string;
  amount: number;
  paymentMethod?: 'cashfree_qr' | 'upi_manual' | 'owner_key';
  gatewayEnv?: 'sandbox' | 'production';
  paymentSessionId?: string;
  gatewayQrImageUrl?: string;
  upiIntentUrl?: string;
  qrCloseBy?: number;
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
      en: 'Kabaddi Demo Scoreboard (FREE · Small Watermark)',
      mr: 'कबड्डी डेमो स्कोअरबोर्ड (मोफत · छोटा वॉटरमार्क)',
      hi: 'कबड्डी डेमो स्कोरबोर्ड (फ्री · छोटा वॉटरमार्क)',
      gu: 'કબડ્ડી ડેમો સ્કોરબોર્ડ (ફ્રી · નાનો વોટરમાર્ક)',
    },
    subtitle: {
      en: 'Free live scoreboard for OBS & vMix — includes a small STAR EVENT LIVE watermark',
      mr: 'OBS व vMix साठी मोफत वापरा — स्कोअरबोर्डवर छोटा STAR EVENT LIVE वॉटरमार्क राहील',
      hi: 'OBS और vMix के लिए फ्री लाइव स्कोरबोर्ड — छोटे STAR EVENT LIVE वॉटरमार्क के साथ',
      gu: 'OBS અને vMix માટે ફ્રી લાઇવ સ્કોરબોર્ડ — નાના STAR EVENT LIVE વોટરમાર્ક સાથે',
    },
    meta: {
      en: ['100% FREE Demo', 'Small Watermark', 'OBS & vMix URL'],
      mr: ['100% मोफत डेमो', 'छोटा वॉटरमार्क', 'OBS & vMix URL'],
      hi: ['100% फ्री डेमो', 'छोटा वॉटरमार्क', 'OBS & vMix URL'],
      gu: ['100% ફ્રી ડેમો', 'નાનો વોટરમાર્ક', 'OBS & vMix URL'],
    },
    features: {
      en: [
        'Free OBS / vMix Browser Source URL & 1920×1080 PNG export — no payment needed',
        'Dual team logos, 30s timer, +1/-1, Bonus, All Out, Yellow/Red cards & Sin Bin',
        'Displays a small STAR EVENT LIVE watermark (watermark-free Pro is ₹1 for 1 Day today)',
      ],
      mr: [
        'कोणत्याही पेमेंट शिवाय थेट OBS / vMix URL व 1920×1080 PNG मोफत मिळवा',
        'दोन्ही बाजूचे टीम लोगो, 30s टायमर, +1/-1, Bonus, All Out, Yellow/Red कार्ड्स व Sin Bin',
        'स्कोअरबोर्डवर छोटा STAR EVENT LIVE वॉटरमार्क राहील (वॉटरमार्क फ्री प्रो आजची ऑफर फक्त ₹1 / 1 दिवस)',
      ],
      hi: [
        'बिना किसी पेमेंट के सीधा OBS / vMix URL और 1920×1080 PNG फ्री पाएं',
        'दोनों टीम के लोगो, 30s टाइमर, +1/-1, Bonus, All Out, Yellow/Red कार्ड और Sin Bin',
        'स्कोरबोर्ड पर छोटा STAR EVENT LIVE वॉटरमार्क रहेगा (वॉटरमार्क-फ्री प्रो आज ₹1 / 1 दिन)',
      ],
      gu: [
        'કોઈપણ પેમેન્ટ વિના સીધું OBS / vMix URL અને 1920×1080 PNG ફ્રી મેળવો',
        'બંને ટીમના લોગો, 30s ટાઈમર, +1/-1, Bonus, All Out, Yellow/Red કાર્ડ અને Sin Bin',
        'સ્કોરબોર્ડ પર નાનો STAR EVENT LIVE વોટરમાર્ક રહેશે (વોટરમાર્ક-ફ્રી પ્રો આજે ₹1 / 1 દિવસ)',
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
      en: 'Kabaddi Pro Scoreboard (Watermark-Free · 30s Timer)',
      mr: 'कबड्डी प्रो स्कोअरबोर्ड (वॉटरमार्क-फ्री · 30s टायमर)',
      hi: 'कबड्डी प्रो स्कोरबोर्ड (वॉटरमार्क-फ्री · 30s टाइमर)',
      gu: 'કબડ્ડી પ્રો સ્કોરબોર્ડ (વોટરમાર્ક-ફ્રી · 30s ટાઈમર)',
    },
    subtitle: {
      en: 'Curved dual-color broadcast bar + left & right team logos + pro control desk',
      mr: 'कर्व्ह्ड ड्युअल-कलर स्कोअरबोर्ड + दोन्ही बाजू टीम लोगो + प्रो कंट्रोल डेस्क',
      hi: 'कर्व्ड डुअल-कलर ब्रॉडकास्ट बार + दोनों टीम लोगो + प्रो कंट्रोल डेस्क',
      gu: 'કર્વ્ડ ડ્યુઅલ-કલર બ્રોડકાસ્ટ બાર + બંને ટીમ લોગો + પ્રો કંટ્રોલ ડેસ્ક',
    },
    meta: {
      en: ['Dual Team Logos', '30s Timer', 'Auto QR Unlock'],
      mr: ['दोन्ही बाजू लोगो', '30s टायमर', 'ऑटो QR अनलॉक'],
      hi: ['दोनों टीम लोगो', '30s टाइमर', 'ऑटो QR अनलॉक'],
      gu: ['બંને ટીમ લોગો', '30s ટાઈમર', 'ઓટો QR અનલોક'],
    },
    features: {
      en: [
        'Upload custom Left & Right team logos and customize both wing colors live',
        'Live 30s timer, +1/-1, Bonus, All Out, Super Tackle, Super Raid, Yellow/Red cards & Sin Bin',
        "Today's Offer: Pay ₹1 — instant automatic unlock for 1 Day (24 hours), then auto-expires",
      ],
      mr: [
        'डाव्या व उजव्या दोन्ही बाजूंनी कस्टम टीम लोगो अपलोड व टीम कलर पिकर',
        '30s लाईव्ह टायमर, +1/-1, Bonus, All Out, Super Tackle, Super Raid, Yellow/Red कार्ड्स व Sin Bin',
        'आजची ऑफर: फक्त ₹1 पेमेंट करा — 1 दिवसासाठी (24 तास) आपोआप अनलॉक, नंतर ऑटो एक्सपायर',
      ],
      hi: [
        'दोनों ओर कस्टम टीम लोगो अपलोड करें और लाइव टीम कलर चुनें',
        'लाइव 30s टाइमर, +1/-1, Bonus, All Out, Super Tackle, Super Raid, Yellow/Red कार्ड व Sin Bin',
        'आज का ऑफर: ₹1 पेमेंट करें — 1 दिन (24 घंटे) के लिए ऑटो अनलॉक, फिर ऑटो एक्सपायर',
      ],
      gu: [
        'બંને બાજુ કસ્ટમ ટીમ લોગો અપલોડ કરો અને લાઇવ ટીમ કલર બદલો',
        'લાઇવ 30s ટાઈમર, +1/-1, Bonus, All Out, Super Tackle, Super Raid, Yellow/Red કાર્ડ અને Sin Bin',
        'આજની ઓફર: ₹1 પેમેન્ટ કરો — 1 દિવસ (24 કલાક) માટે ઓટો અનલોક, પછી ઓટો એક્સપાયર',
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
      en: 'Haldi & Wedding · Style 1 (Shahi Gold Frame)',
      mr: 'हळदी व लग्न समारंभ · स्टाईल 1 (शाही गोल्ड फ्रेम)',
      hi: 'हल्दी और शादी समारोह · स्टाइल 1 (शाही गोल्ड फ्रेम)',
      gu: 'હળદી અને લગ્ન સમારંભ · સ્ટાઇલ 1 (શાહી ગોલ્ડ ફ્રેમ)',
    },
    subtitle: {
      en: 'Turmeric-gold ornamental corners + Haldi & Wedding header + live banner',
      mr: 'झेंडू-सोनेरी कॉर्नर फ्रेम + हळदी व लग्नासाठी मराठी टॉप बॅनर + लाईव्ह टायटल',
      hi: 'हल्दी-गोल्ड कॉर्नर फ्रेम + शादी व हल्दी टॉप बैनर + लाइव टाइटल',
      gu: 'હળદી-ગોલ્ડ કોર્નર ફ્રેમ + લગ્ન અને હળદી ટોપ બેનર + લાઇવ ટાઇટલ',
    },
    meta: {
      en: ['Haldi & Wedding', 'OBS & vMix URL', '1-Day Auto Unlock'],
      mr: ['हळदी व लग्न', 'OBS & vMix URL', '1 दिवस ऑटो अनलॉक'],
      hi: ['हल्दी व शादी', 'OBS & vMix URL', '1 दिन ऑटो अनलॉक'],
      gu: ['હળદી અને લગ્ન', 'OBS & vMix URL', '1 દિવસ ઓટો અનલોક'],
    },
    features: {
      en: [
        'One-click presets & live editing for Haldi & Wedding bride/groom/family names',
        'Ready-to-paste OBS & vMix transparent browser URL (clean watermark-free center)',
        "Today's Offer: Just ₹1 (1 Day / 24h) — instant auto-unlock on payment, auto-expires after 24h",
      ],
      mr: [
        'हळदी किंवा शुभ विवाह (वधू-वर / कुटुंबाचे नाव) एका क्लिकमध्ये कस्टमाईज करा',
        'OBS Studio व vMix साठी थेट ट्रान्सपरंट लिंक (वॉटरमार्क-फ्री क्लियर सेंटर)',
        'आजची ऑफर: फक्त ₹1 (1 दिवस / 24 तास) — पेमेंट होताच ऑटो अनलॉक, 24h नंतर एक्सपायर',
      ],
      hi: [
        'हल्दी या शादी (वर-वधू / परिवार का नाम) एक क्लिक में कस्टमाइज़ करें',
        'OBS Studio और vMix के लिए सीधा ट्रांसपेरेंट ब्राउज़र URL (वॉटरमार्क-फ्री)',
        'आज का ऑफर: सिर्फ ₹1 (1 दिन / 24 घंटे) — पेमेंट के बाद ऑटो अनलॉक, 24h बाद एक्सपायर',
      ],
      gu: [
        'હળદી અથવા શુભ લગ્ન (વર-વધૂ / પરિવારનું નામ) એક ક્લિકમાં કસ્ટમાઇઝ કરો',
        'OBS Studio અને vMix માટે સીધી ટ્રાન્સપરન્ટ બ્રાઉઝર URL (વોટરમાર્ક-ફ્રી)',
        'આજની ઓફર: માત્ર ₹1 (1 દિવસ / 24 કલાક) — પેમેન્ટ થતા જ ઓટો અનલોક, 24h પછી એક્સપાયર',
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
      en: 'Haldi & Wedding · Style 2 (Cinematic Ribbon)',
      mr: 'हळदी व लग्न समारंभ · स्टाईल 2 (सिनेमॅटिक रिबन)',
      hi: 'हल्दी और शादी समारोह · स्टाइल 2 (सिनेमैटिक रिबन)',
      gu: 'હળદી અને લગ્ન સમારંભ · સ્ટાઇલ 2 (સિનેમેટિક રિબન)',
    },
    subtitle: {
      en: 'Clean open frame + floating warm-gold lower-third ribbon for Haldi & Wedding',
      mr: 'क्लिन ओपन स्क्रीन + हळदी व लग्नासाठी फ्लोटिंग गोल्डन रिबन टायटल',
      hi: 'क्लीन ओपन फ्रेम + हल्दी और शादी के लिए फ्लोटिंग गोल्डन रिबन टाइटल',
      gu: 'ક્લીન ઓપન ફ્રેમ + હળદી અને લગ્ન માટે ફ્લોટિંગ ગોલ્ડન રિબન ટાઇટલ',
    },
    meta: {
      en: ['Haldi & Wedding', 'OBS & vMix URL', '1-Day Auto Unlock'],
      mr: ['हळदी व लग्न', 'OBS & vMix URL', '1 दिवस ऑटो अनलॉक'],
      hi: ['हल्दी व शादी', 'OBS & vMix URL', '1 दिन ऑटो अनलॉक'],
      gu: ['હળદી અને લગ્ન', 'OBS & vMix URL', '1 દિવસ ઓટો અનલોક'],
    },
    features: {
      en: [
        'Uncluttered floating ribbon crafted for 4K gimbal Haldi & Wedding shots',
        'Live Haldi & Wedding title updates synced directly to OBS and vMix',
        "Today's Offer: Just ₹1 (1 Day / 24h) — instant auto-unlock on payment, auto-expires after 24h",
      ],
      mr: [
        '4K जिम्बल हळदी व लग्न शॉट्ससाठी बॉर्डरलेस क्लिन लोअर-थर्ड रिबन डिझाइन',
        'YouTube Live साठी रिअल-टाईम हळदी / लग्न टायटल सिंक (OBS व vMix)',
        'आजची ऑफर: फक्त ₹1 (1 दिवस / 24 तास) — पेमेंट होताच ऑटो अनलॉक, 24h नंतर एक्सपायर',
      ],
      hi: [
        '4K जिम्बल हल्दी और शादी शॉट्स के लिए बॉर्डरलेस क्लीन लोअर-थर्ड रिबन डिज़ाइन',
        'YouTube Live के लिए रियल-टाइम हल्दी / शादी टाइटल सिंक (OBS और vMix)',
        'आज का ऑफर: सिर्फ ₹1 (1 दिन / 24 घंटे) — पेमेंट के बाद ऑटो अनलॉक, 24h बाद एक्सपायर',
      ],
      gu: [
        '4K જિમ્બલ હળદી અને લગ્ન શોટ્સ માટે બોર્ડરલેસ ક્લીન લોઅર-થર્ડ રિબન ડિઝાઇન',
        'YouTube Live માટે રિયલ-ટાઇમ હળદી / લગ્ન ટાઇટલ સિંક (OBS અને vMix)',
        'આજની ઓફર: માત્ર ₹1 (1 દિવસ / 24 કલાક) — પેમેન્ટ થતા જ ઓટો અનલોક, 24h પછી એક્સપાયર',
      ],
    },
  },
];
