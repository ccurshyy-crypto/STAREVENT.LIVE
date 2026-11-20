import { Language } from './content';
import { OverlayMode, OverlayStyle } from '../types/overlay';

export type OverlaySku = 'kabaddi-classic' | 'kabaddi-modern' | 'haldi-classic' | 'haldi-modern';

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

export interface VerifiedOverlayToken {
  sku: OverlaySku;
  orderId: string;
  unlockCode: string;
}

export interface PendingOverlayOrder {
  orderId: string;
  sku: OverlaySku;
  utrRef: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  unlockCode?: string;
  rejectionReason?: string;
  createdAt: number;
}

export function getOverlaySku(mode: OverlayMode, style: OverlayStyle): OverlaySku {
  return `${mode}-${style}` as OverlaySku;
}

export const OVERLAY_PRODUCTS: OverlayProduct[] = [
  {
    sku: 'kabaddi-classic',
    mode: 'kabaddi',
    style: 'classic',
    originalPrice: 149,
    salePrice: 99,
    title: {
      mr: 'कबड्डी महासंग्राम · स्टाईल 1 (शाही अरेना)',
      en: 'Kabaddi Mahasangram · Style 1 (Shahi Arena)',
    },
    subtitle: {
      mr: 'लाल-सोनेरी पूर्ण अरेना बॉर्डर + 30s रेड टायमर + 3D लोगो',
      en: 'Full red & gold arena border + 30s raid timer + 3D spinning logo',
    },
    meta: {
      mr: ['1920×1080 ट्रान्सपरंट', 'OBS & vMix URL', 'PNG डाउनलोड'],
      en: ['1920×1080 Transparent', 'OBS & vMix URL', 'PNG Export'],
    },
    features: {
      mr: [
        'OBS Studio व vMix साठी थेट ट्रान्सपरंट Browser Source URL',
        'लाईव्ह टीम स्कोअर, सुपर रेड +3, ऑल आऊट व 30s रेड टायमर कंट्रोल',
        '3D फिरणारा STAR EVENT LIVE लोगो व 1920×1080 PNG डाउनलोड',
      ],
      en: [
        'Live transparent OBS Browser Source & vMix Web Browser URL',
        'Real-time team scores, Super Raid +3, All Out & 30s raid clock',
        '3D rotating logo watermark + 1920×1080 transparent PNG download',
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
      mr: 'कबड्डी महासंग्राम · स्टाईल 2 (प्रो TV स्कोअरबार)',
      en: 'Kabaddi Mahasangram · Style 2 (Pro TV Scorebar)',
    },
    subtitle: {
      mr: 'ओपन फ्रेम TV कॅप्सूल + मध्यभागी गोल 30s रेड क्लॉक',
      en: 'Borderless TV sports bar + elevated round 30s raid clock',
    },
    meta: {
      mr: ['1920×1080 ट्रान्सपरंट', 'OBS & vMix URL', 'प्रो TV लूक'],
      en: ['1920×1080 Transparent', 'OBS & vMix URL', 'Pro TV Look'],
    },
    features: {
      mr: [
        'मॅट व ग्राउंड पूर्ण स्पष्ट दिसण्यासाठी बॉर्डरलेस फ्लोटिंग स्कोअरबार',
        'DO-OR-DIE रेड इंडिकेटरसह रिअल-टाईम सिंक (मोबाईलवरून कंट्रोल)',
        'Alpha Transparent आणि Chroma Green/Blue दोन्ही सपोर्ट',
      ],
      en: [
        'Open-viewport floating TV scorebar for unobstructed arena cameras',
        'Live DO-OR-DIE indicator synced from phone to streaming laptop',
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
      mr: 'शुभ हळदी समारंभ · स्टाईल 1 (शाही गोल्ड फ्रेम)',
      en: 'Haldi Ceremony · Style 1 (Shahi Marigold Frame)',
    },
    subtitle: {
      mr: 'झेंडू-सोनेरी कॉर्नर फ्रेम + मराठी टॉप बॅनर + लाईव्ह टायटल',
      en: 'Turmeric-gold ornamental corners + Marathi plaque + live banner',
    },
    meta: {
      mr: ['1920×1080 ट्रान्सपरंट', 'OBS & vMix URL', 'मराठी सुलेखन'],
      en: ['1920×1080 Transparent', 'OBS & vMix URL', 'Marathi Titles'],
    },
    features: {
      mr: [
        'कुटुंबाचे नाव, ठिकाण आणि संपर्क क्रमांक लाईव्ह बदलण्याची सुविधा',
        'OBS Studio व vMix साठी थेट ट्रान्सपरंट लिंक (क्लियर सेंटर)',
        'थेट 1920×1080 ट्रान्सपरंट PNG फ्रेम डाउनलोड उपलब्ध',
      ],
      en: [
        'Edit family name, header plaque, and venue strip live on air',
        'Ready-to-paste OBS & vMix transparent browser URL (clear center)',
        'Instant 1920×1080 transparent PNG frame export included',
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
      mr: 'शुभ हळदी समारंभ · स्टाईल 2 (सिनेमॅटिक रिबन)',
      en: 'Haldi Ceremony · Style 2 (Cinematic Ribbon)',
    },
    subtitle: {
      mr: 'क्लिन ओपन स्क्रीन + फ्लोटिंग गोल्डन-अंबर रिबन टायटल',
      en: 'Clean open frame + floating warm-amber & gold lower-third ribbon',
    },
    meta: {
      mr: ['1920×1080 ट्रान्सपरंट', 'OBS & vMix URL', 'सिनेमॅटिक स्टाईल'],
      en: ['1920×1080 Transparent', 'OBS & vMix URL', 'Cinematic Look'],
    },
    features: {
      mr: [
        '4K जिम्बल शॉट्ससाठी बॉर्डरलेस क्लिन लोअर-थर्ड रिबन डिझाइन',
        'YouTube, Facebook व Instagram लाईव्हसाठी रिअल-टाईम टायटल सिंक',
        '3D फिरणारा STAR EVENT LIVE लोगो व 1920×1080 PNG डाउनलोड',
      ],
      en: [
        'Uncluttered floating ribbon crafted for 4K gimbal Haldi shots',
        'Live title updates synced directly to OBS and vMix overlays',
        'Includes 3D spinning logo toggle & 1920×1080 PNG export',
      ],
    },
  },
];
