export type Language = 'en' | 'mr' | 'hi' | 'gu';

export const LANGUAGE_OPTIONS: Array<{
  id: Language;
  label: string;
  nativeLabel: string;
  shortCode: string;
}> = [
  { id: 'en', label: 'English', nativeLabel: 'English', shortCode: 'EN' },
  { id: 'mr', label: 'Marathi', nativeLabel: 'मराठी', shortCode: 'MR' },
  { id: 'hi', label: 'Hindi', nativeLabel: 'हिंदी', shortCode: 'HI' },
  { id: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી', shortCode: 'GU' },
];

export function tLang<T>(map: { en: T; mr: T; hi?: T; gu?: T }, lang: Language): T {
  return map[lang] ?? map.en;
}

export type EventCategoryId = 'cricket' | 'kabaddi' | 'wedding' | 'haldi' | 'birthday' | 'other';

export type PlatformId = 'youtube-public' | 'youtube-unlisted' | 'led-wall';

export interface CustomOverlayPromptConfig {
  title: string;
  subtitle: string;
  tag: string;
  imagePrompt: string;
}

export const CUSTOM_OVERLAY_PROMPTS: Record<'kabaddi' | 'wedding', CustomOverlayPromptConfig> = {
  kabaddi: {
    title: 'STAR EVENT LIVE • कबड्डी महासंग्राम',
    subtitle: 'थेट प्रक्षेपण • Neral & Karjat Live • 9890175727',
    tag: 'LIVE KABADDI',
    imagePrompt:
      '1920x1080 transparent Kabaddi broadcast bottom overlay, red and gold arena border, space for team scores and raid timer, clear center',
  },
  wedding: {
    title: 'STAR EVENT LIVE • शुभ विवाह सोहळा',
    subtitle: 'थेट प्रक्षेपण • Wedding Live Broadcast • 9890175727',
    tag: 'WEDDING LIVE',
    imagePrompt:
      '1920x1080 transparent wedding live bottom frame, shahi maroon and gold ornamental border, Marathi calligraphic header space, clear center',
  },
};

export interface EventService {
  id: EventCategoryId;
  index: string;
  title: Record<Language, string>;
  subtitle: Record<Language, string>;
  meta: Record<Language, string[]>;
  description: Record<Language, string>;
  deliverables: Record<Language, string[]>;
  image?: string;
  imageAlt?: string;
  imagePosition?: string;
  imageFit?: 'cover' | 'contain';
  wide?: boolean;
  fullSpan?: boolean;
  previewMode?: 'kabaddi' | 'haldi';
}

export interface ProductionPackage {
  id: string;
  name: Record<Language, string>;
  idealFor: Record<Language, string>;
  priceRange: Record<Language, string>;
  basePrice: number;
  cameras: Record<Language, string>;
  platforms: Record<Language, string>;
  features: Record<Language, string[]>;
  featured?: boolean;
}

export interface AddOnOption {
  id: string;
  label: Record<Language, string>;
  price: number;
}

export interface ClientCaseStudy {
  id: string;
  eventTitle: Record<Language, string>;
  category: Record<Language, string>;
  metric: Record<Language, string>;
  summary: Record<Language, string>;
  attribution: Record<Language, string>;
}

export const STUDIO_CONTACT = {
  brand: 'STAR EVENT LIVE',
  domain: 'starevent.live',
  founderName: 'Bharat Nirguda',
  phoneDisplay: '9890175727',
  phoneHref: 'tel:+919890175727',
  whatsappNumber: '919890175727',
  bannerPath: '/assets/optimized/hero-banner.webp',
  promoPosterPath: '/assets/optimized/promo-poster.webp',
  logoVideoPath: '/assets/optimized/logo-rotation.mp4',
  stingerVideoPath: '/assets/optimized/stinger-web.mp4',
  upiQrPath: '/assets/aistudio/WhatsApp_Image_2026-11-19_at_2.32.59_AM_c3b23480.jpeg',
  upiId: 'crushyyphotography@oksbi',
  upiPayeeName: 'Crushyyphotography',
  youtubeUrl: 'https://youtube.com/@stareventlive01?si=-IocoxT5fJemBNPu',
  youtubeHandle: '@stareventlive01',
  instagramAccounts: [
    {
      handle: '@stareventlive',
      url: 'https://www.instagram.com/stareventlive?bqrl=MTNrZWZlejRlZmtnNg==',
    },
    {
      handle: '@crushyy___01',
      url: 'https://www.instagram.com/crushyy___01?hvrq=ZG95NW5jbDIyZG82',
    },
  ],
  invocation: '|| श्री गणेशाय नमः ||',
  promiseMr: 'तुमचा कार्यक्रम... आमची जबाबदारी... आठवणी राहतील कायमच्या',
  promiseEn: 'Your event... our responsibility... memories that last forever.',
  promise: {
    en: 'Your event... our responsibility... memories that last forever.',
    mr: 'तुमचा कार्यक्रम... आमची जबाबदारी... आठवणी राहतील कायमच्या',
    hi: 'आपका कार्यक्रम... हमारी जिम्मेदारी... यादें रहेंगी हमेशा के लिए।',
    gu: 'તમારો કાર્યક્રમ... અમારી જવાબદારી... યાદો રહેશે હંમેશા માટે.',
  } as Record<Language, string>,
};

export const UI_COPY = {
  nav: {
    home: { en: 'Home', mr: 'होम', hi: 'होम', gu: 'હોમ' },
    services: { en: 'Services', mr: 'सेवा', hi: 'सेवाएं', gu: 'સેવાઓ' },
    studio: { en: 'Overlays', mr: 'ओव्हरले', hi: 'ओवरले', gu: 'ઓવરલે' },
    packages: { en: 'Packages', mr: 'पॅकेजेस', hi: 'पैकेज', gu: 'પેકેજ' },
    book: {
      en: 'Booking Ur Order',
      mr: 'Booking Ur Order',
      hi: 'Booking Ur Order',
      gu: 'Booking Ur Order',
    },
    callCta: {
      en: 'Call 9890175727',
      mr: 'कॉल 9890175727',
      hi: 'कॉल 9890175727',
      gu: 'કૉલ 9890175727',
    },
  },
  hero: {
    headline: {
      en: 'Broadcast-Grade Live Streaming for Every Event',
      mr: 'आपल्या सर्व प्रकारच्या कार्यक्रमांचे हाय-क्वालिटी थेट प्रक्षेपण',
      hi: 'हर कार्यक्रम के लिए ब्रॉडकास्ट-ग्रेड लाइव स्ट्रीमिंग',
      gu: 'દરેક કાર્યક્રમ માટે બ્રોડકાસ્ટ-ગ્રેડ લાઇવ સ્ટ્રીમિંગ',
    },
    subcopy: {
      en: '4K multi-camera setups, custom on-screen scoreboards and lower-thirds, full HD recording, and professional editing streamed live on YouTube (@stareventlive01).',
      mr: 'क्रिकेट सामने, कबड्डी स्पर्धा, लग्न समारंभ, हळदी, वाढदिवस आणि इतर सर्व कार्यक्रमांसाठी 4K मल्टी-कॅमेरा सेटअप, कस्टम स्क्रीन ग्राफिक्स, रेकॉर्डिंग आणि एडिटिंगसह YouTube (@stareventlive01) वर थेट प्रक्षेपण.',
      hi: 'क्रिकेट मैच, कबड्डी टूर्नामेंट, शादी, हल्दी, जन्मदिन और सभी आयोजनों के लिए 4K मल्टी-कैमरा सेटअप, कस्टम स्क्रीन ग्राफिक्स, रिकॉर्डिंग और एडिटिंग के साथ YouTube (@stareventlive01) पर लाइव स्ट्रीमिंग।',
      gu: 'ક્રિકેટ મેચ, કબડ્ડી ટુર્નામેન્ટ, લગ્ન, હળદી, જન્મદિવસ અને તમામ કાર્યક્રમો માટે 4K મલ્ટી-કેમેરા સેટઅપ, કસ્ટમ સ્ક્રીન ગ્રાફિક્સ, રેકોર્ડિંગ અને એડિટિંગ સાથે YouTube (@stareventlive01) પર લાઇવ સ્ટ્રીમિંગ.',
    },
    primaryCta: {
      en: 'Book Your Event',
      mr: 'कार्यक्रम बुक करा',
      hi: 'इवेंट बुक करें',
      gu: 'કાર્યક્રમ બુક કરો',
    },
    secondaryCta: {
      en: "Overlays Store (₹1 Today's Offer)",
      mr: 'ओव्हरले पहा (आजची ऑफर ₹1)',
      hi: 'ओवरले स्टोर (₹1 आज का ऑफर)',
      gu: 'ઓવરલે સ્ટોર (₹1 આજની ઓફર)',
    },
    bannerCaption: {
      en: 'Official Studio Banner · 4K LIVE on YouTube (@stareventlive01)',
      mr: 'अधिकृत स्टुडिओ बॅनर · YouTube (@stareventlive01) वर 4K LIVE उपलब्ध',
      hi: 'आधिकारिक स्टूडियो बैनर · YouTube (@stareventlive01) पर 4K LIVE उपलब्ध',
      gu: 'સત્તાવાર સ્ટુડિયો બેનર · YouTube (@stareventlive01) પર 4K LIVE ઉપલબ્ધ',
    },
    stats: [
      {
        value: '4K / 60fps',
        label: {
          en: 'High-Quality Camera Setup',
          mr: 'हाय क्वालिटी कॅमेरा सेटअप',
          hi: 'हाई-क्वालिटी कैमरा सेटअप',
          gu: 'હાઇ-ક્વોલિટી કેમેરા સેટઅપ',
        },
        detail: {
          en: 'Broadcast camcorders & cinema lenses',
          mr: 'ब्रॉडकास्ट कॅमकॉर्डर व जिम्बल रिंग',
          hi: 'ब्रॉडकास्ट कैमकॉर्डर और जिम्बल सेटअप',
          gu: 'બ્રોડકાસ્ટ કેમકોર્ડર અને જિમ્બલ સેટઅપ',
        },
      },
      {
        value: 'YouTube Live',
        label: {
          en: 'Uninterrupted Live Streaming',
          mr: 'अखंडित थेट प्रक्षेपण',
          hi: 'बिना रुकावट लाइव स्ट्रीमिंग',
          gu: 'અવિરત લાઇવ સ્ટ્રીમિંગ',
        },
        detail: {
          en: 'YouTube @stareventlive01 · 1080p / 4K',
          mr: 'YouTube @stareventlive01 · 1080p / 4K',
          hi: 'YouTube @stareventlive01 · 1080p / 4K',
          gu: 'YouTube @stareventlive01 · 1080p / 4K',
        },
      },
      {
        value: 'Live GFX',
        label: {
          en: 'Custom On-Screen Graphics',
          mr: 'कस्टम स्क्रीन ग्राफिक्स',
          hi: 'कस्टम ऑन-स्क्रीन ग्राफिक्स',
          gu: 'કસ્ટમ ઓન-સ્ક્રીન ગ્રાફિક્સ',
        },
        detail: {
          en: 'Live scoreboards, titles & branding',
          mr: 'क्रिकेट स्कोअरबोर्ड, नावे व लोगो',
          hi: 'लाइव स्कोरबोर्ड, टाइटल और लोगो',
          gu: 'લાઇવ સ્કોરબોર્ડ, ટાઇટલ અને લોગો',
        },
      },
      {
        value: 'End-to-End',
        label: {
          en: 'Dedicated Production Crew',
          mr: 'प्रोफेशनल टीम द्वारे सेवा',
          hi: 'प्रोफेशनल प्रोडक्शन टीम',
          gu: 'પ્રોફેશનલ પ્રોડક્શન ટીમ',
        },
        detail: {
          en: 'Live broadcast · Recording · Editing',
          mr: 'लाईव्ह प्रक्षेपण · रेकॉर्डिंग · एडिटिंग',
          hi: 'लाइव प्रसारण · रिकॉर्डिंग · एडिटिंग',
          gu: 'લાઇવ પ્રસારણ · રેકોર્ડિંગ · એડિટિંગ',
        },
      },
    ],
  },
  servicesSection: {
    kicker: {
      en: 'Event Coverage · Production Capabilities',
      mr: 'आमच्या सेवा · इव्हेंट कव्हरेज',
      hi: 'हमारी सेवाएं · इवेंट कवरेज',
      gu: 'અમારી સેવાઓ · ઇવેન્ટ કવરેજ',
    },
    heading: {
      en: 'Tailored Broadcast Setups for Every Occasion',
      mr: 'प्रत्येक कार्यक्रमासाठी खास ब्रॉडकास्ट सेटअप',
      hi: 'हर आयोजन के लिए खास ब्रॉडकास्ट सेटअप',
      gu: 'દરેક પ્રસંગ માટે ખાસ બ્રોડકાસ્ટ સેટઅપ',
    },
    intro: {
      en: 'From packed night cricket tournaments to family wedding rituals, our crew delivers uninterrupted feeds, clean mixer audio, and permanent archival recordings.',
      mr: 'क्रीडा स्पर्धा असो वा कौटुंबिक सोहळा — आमची अनुभवी टीम प्रत्येक क्षण स्पष्ट व्हिडिओ आणि स्वच्छ ऑडिओसह जगाच्या कानाकोपऱ्यात पोहोचवते.',
      hi: 'चाहे नाइट क्रिकेट टूर्नामेंट हो या पारिवारिक शादी समारोह — हमारी अनुभवी टीम हर पल को साफ वीडियो और ऑडियो के साथ दुनिया भर में लाइव पहुंचाती है।',
      gu: 'નાઇટ ક્રિકેટ ટુર્નામેન્ટ હોય કે પારિવારિક લગ્ન પ્રસંગ — અમારી અનુભવી ટીમ દરેક ક્ષણને સ્પષ્ટ વિડિયો અને ઓડિયો સાથે વિશ્વભરમાં લાઇવ પહોંચાડે છે.',
    },
    previewBtn: {
      en: 'Open Overlay (₹1 Offer)',
      mr: 'ओव्हरले पहा (₹1 ऑफर)',
      hi: 'ओवरले देखें (₹1 ऑफर)',
      gu: 'ઓવરલે જુઓ (₹1 ઓફર)',
    },
    selectBtn: {
      en: 'Book This Event',
      mr: 'बुकिंगसाठी निवडा',
      hi: 'यह इवेंट बुक करें',
      gu: 'આ ઇવેન્ટ બુક કરો',
    },
  },
  studioSection: {
    kicker: {
      en: 'Live Overlay Studio · OBS & vMix Ready',
      mr: 'लाईव्ह ओव्हरले स्टुडिओ · OBS व vMix सपोर्ट',
      hi: 'लाइव ओवरले स्टूडियो · OBS और vMix रेडी',
      gu: 'લાઇવ ઓવરલે સ્ટુડિયો · OBS અને vMix રેડી',
    },
    heading: {
      en: 'Kabaddi Pro Scoreboard & Haldi-Wedding Overlays',
      mr: 'कबड्डी प्रो स्कोअरबोर्ड आणि हळदी-लग्न ओव्हरले',
      hi: 'कबड्डी प्रो स्कोरबोर्ड और हल्दी-शादी ओवरले',
      gu: 'કબડ્ડી પ્રો સ્કોરબોર્ડ અને હળદી-લગ્ન ઓવરલે',
    },
    intro: {
      en: 'FREE Kabaddi Demo Scoreboard (with small STAR EVENT LIVE watermark), watermark-free Kabaddi Pro Scoreboard (30s timer), and 2 Haldi & Wedding overlays for OBS Studio & vMix.',
      mr: 'मोफत कबड्डी डेमो स्कोअरबोर्ड (छोट्या STAR EVENT LIVE वॉटरमार्कसह), वॉटरमार्क-फ्री कबड्डी प्रो स्कोअरबोर्ड (30s टायमर) आणि हळदी-लग्न समारंभ ओव्हरले (2 स्टाईल) — OBS व vMix साठी थेट कंट्रोल.',
      hi: 'फ्री कबड्डी डेमो स्कोरबोर्ड (छोटे STAR EVENT LIVE वॉटरमार्क के साथ), वॉटरमार्क-फ्री कबड्डी प्रो स्कोरबोर्ड (30s टाइमर), और OBS व vMix के लिए 2 हल्दी-शादी ओवरले।',
      gu: 'ફ્રી કબડ્ડી ડેમો સ્કોરબોર્ડ (નાના STAR EVENT LIVE વોટરમાર્ક સાથે), વોટરમાર્ક-ફ્રી કબડ્ડી પ્રો સ્કોરબોર્ડ (30s ટાઈમર), અને OBS તથા vMix માટે 2 હળદી-લગ્ન ઓવરલે.',
    },
  },
  packagesSection: {
    kicker: {
      en: 'Production Packages · Flexible Setup',
      mr: 'प्रॉडक्शन पॅकेजेस · पारदर्शक अंदाज',
      hi: 'प्रोडक्शन पैकेज · पारदर्शी कीमत',
      gu: 'પ્રોડક્શન પેકેજ · પારદર્શક કિંમત',
    },
    heading: {
      en: 'Choose a Broadcast Setup Built for Your Venue',
      mr: 'कार्यक्रमाच्या गरजेनुसार योग्य पॅकेज निवडा',
      hi: 'अपने कार्यक्रम के अनुसार सही पैकेज चुनें',
      gu: 'તમારા કાર્યક્રમ મુજબ યોગ્ય પેકેજ પસંદ કરો',
    },
    intro: {
      en: 'Select a base package and customize optional camera angles, drone feeds, or LED wall output before sending your booking request.',
      mr: 'एकल कॅमेरा कौटुंबिक लाईव्हपासून ते मल्टी-कॅमेरा टूर्नामेंट ब्रॉडकास्टपर्यंत सर्व पर्याय उपलब्ध आहेत. अतिरिक्त सेवा जोडून तात्काळ अंदाज मिळवा.',
      hi: 'सिंगल कैमरा फैमिली लाइव से लेकर मल्टी-कैमरा टूर्नामेंट ब्रॉडकास्ट तक सभी विकल्प उपलब्ध हैं। अतिरिक्त सेवाएं जोड़कर तुरंत अनुमान पाएं।',
      gu: 'સિંગલ કેમેરા ફેમિલી લાઇવથી મલ્ટી-કેમેરા ટુર્નામેન્ટ બ્રોડકાસ્ટ સુધીના તમામ વિકલ્પો ઉપલબ્ધ છે. વધારાની સેવાઓ ઉમેરીને તરત અંદાજ મેળવો.',
    },
    addonsHeading: {
      en: 'Optional Production Add-ons',
      mr: 'अतिरिक्त प्रॉडक्शन पर्याय (ऐच्छिक)',
      hi: 'अतिरिक्त प्रोडक्शन विकल्प (वैकल्पिक)',
      gu: 'વધારાના પ્રોડક્શન વિકલ્પો (વૈકલ્પિક)',
    },
    selectPackageBtn: {
      en: 'Select Package',
      mr: 'हे पॅकेज बुक करा',
      hi: 'पैकेज चुनें',
      gu: 'પેકેજ પસંદ કરો',
    },
    proofKicker: {
      en: 'Verified Broadcast Outcomes',
      mr: 'ग्राहक अनुभव · यशस्वी प्रक्षेपणे',
      hi: 'ग्राहक अनुभव · सफल लाइव प्रसारण',
      gu: 'ગ્રાહક અનુભવ · સફળ લાઇવ પ્રસારણ',
    },
    proofHeading: {
      en: 'Proven Reliability Across Live Venues',
      mr: 'हजारो दर्शकांपर्यंत अखंडित थेट प्रक्षेपण',
      hi: 'हजारों दर्शकों तक बिना रुकावट लाइव प्रसारण',
      gu: 'હજારો દર્શકો સુધી અવિરત લાઇવ પ્રસારણ',
    },
  },
  bookingSection: {
    kicker: {
      en: 'Direct Booking · Neral & Karjat · starevent.live',
      mr: 'थेट संपर्क व बुकिंग · Neral & Karjat · starevent.live',
      hi: 'डायरेक्ट बुकिंग · Neral & Karjat · starevent.live',
      gu: 'ડાયરેક્ટ બુકિંગ · Neral & Karjat · starevent.live',
    },
    heading: {
      en: 'Reserve Your Event Broadcast Date',
      mr: 'तुमच्या कार्यक्रमाची तारीख आजच निश्चित करा',
      hi: 'अपने कार्यक्रम की तारीख आज ही बुक करें',
      gu: 'તમારા કાર્યક્રમની તારીખ આજે જ બુક કરો',
    },
    intro: {
      en: 'Submit your event details below or call 9890175727 directly. Our production coordinator will confirm crew availability and venue internet setup.',
      mr: 'खालील माहिती भरा किंवा थेट 9890175727 वर कॉल करा. आमची टीम तुम्हाला कॅमेरा सेटअप, नेटवर्क तपासणी आणि वेळेचे नियोजन कळवेल.',
      hi: 'नीचे विवरण भरें या सीधे 9890175727 पर कॉल करें। हमारी टीम कैमरा सेटअप, नेटवर्क जांच और समय की पुष्टि करेगी।',
      gu: 'નીચે વિગતો ભરો અથવા સીધા 9890175727 પર કૉલ કરો. અમારી ટીમ કેમેરા સેટઅપ અને નેટવર્ક આયોજનની પુષ્ટિ કરશે.',
    },
  },
};

export const EVENT_SERVICES: EventService[] = [
  {
    id: 'cricket',
    index: '01.',
    title: {
      en: 'Cricket Matches & Tournaments',
      mr: 'क्रिकेट सामने',
      hi: 'क्रिकेट मैच और टूर्नामेंट',
      gu: 'ક્રિકેટ મેચ અને ટુર્નામેન્ટ',
    },
    subtitle: {
      en: 'Full broadcast coverage for day-night & leather/tennis ball tournaments',
      mr: 'डे-नाईट व टेनिस बॉल स्पर्धांसाठी पूर्ण ब्रॉडकास्ट',
      hi: 'डे-नाइट और टेनिस/लेदर बॉल स्पर्धाओं के लिए पूरा ब्रॉडकास्ट',
      gu: 'ડે-નાઇટ અને ટેનિસ/લેધર બોલ ટુર્નામેન્ટ માટે સંપૂર્ણ બ્રોડકાસ્ટ',
    },
    meta: {
      en: ['Multi-cam pitch angles', 'Ball-by-ball scoreboard', 'Sponsor tickers'],
      mr: ['मल्टी-कॅमेरा अँगल', 'लाईव्ह स्कोअरबोर्ड', 'स्पॉन्सर बॅनर्स'],
      hi: ['मल्टी-कैमरा एंगल', 'लाइव स्कोरबोर्ड', 'स्पॉन्सर बैनर'],
      gu: ['મલ્ટી-કેમેરા એંગલ', 'લાઇવ સ્કોરબોર્ડ', 'સ્પોન્સર બેનર'],
    },
    description: {
      en: 'Dedicated pitch and outfield camera rigs paired with live ball-by-ball scoreboards, FOUR/SIX/WICKET triggers, sponsor lower-thirds, and high-bitrate YouTube tournament streaming.',
      mr: 'पिच कॅमेरा, बाउंड्री शॉट्स, रिअल-टाईम स्कोअर ग्राफिक्स, चौकार-षटकार अॅनिमेशन, प्लेअर स्टॅट्स आणि YouTube वर हजारो दर्शकांसाठी अखंडित स्ट्रीमिंग.',
      hi: 'पिच और बाउंड्री कैमरा सेटअप, लाइव बॉल-बाय-बॉल स्कोरबोर्ड, चौका-छक्का और विकेट एनिमेशन, स्पॉन्सर बैनर और YouTube पर बिना रुकावट लाइव स्ट्रीमिंग।',
      gu: 'પિચ અને બાઉન્ડ્રી કેમેરા સેટઅપ, લાઇવ બોલ-બાય-બોલ સ્કોરબોર્ડ, ચોગ્ગા-છગ્ગા અને વિકેટ એનિમેશન, સ્પોન્સર બેનર અને YouTube પર અવિરત સ્ટ્રીમિંગ.',
    },
    deliverables: {
      en: ['Live scorecard & run-rate graphics', 'Match highlights & trophy ceremony coverage'],
      mr: ['लाईव्ह स्कोअरकार्ड व रन-रेट ग्राफिक्स', 'मॅच हायलाइट्स व बक्षीस वितरण कव्हरेज'],
      hi: ['लाइव स्कोरकार्ड और रन-रेट ग्राफिक्स', 'मैच हाइलाइट्स और पुरस्कार वितरण कवरेज'],
      gu: ['લાઇવ સ્કોરકાર્ડ અને રન-રેટ ગ્રાફિક્સ', 'મેચ હાઇલાઇટ્સ અને ઇનામ વિતરણ કવરેજ'],
    },
    image: '/assets/optimized/service-cricket.webp',
    imageAlt:
      'Star Event Live outdoor sunset cricket tournament live broadcast desk and switching monitor on the ground',
    imagePosition: 'object-[50%_72%]',
  },
  {
    id: 'kabaddi',
    index: '02.',
    title: {
      en: 'Kabaddi Tournaments',
      mr: 'कबड्डी महासंग्राम',
      hi: 'कबड्डी महासंग्राम',
      gu: 'કબડ્ડી ટુર્નામેન્ટ',
    },
    subtitle: {
      en: 'Night arena coverage for Neral, Karjat & district Kabaddi leagues',
      mr: 'नेरळ, कर्जत व जिल्हास्तरीय रात्रीच्या कबड्डी स्पर्धा',
      hi: 'नेरल, कर्जत और जिला स्तरीय नाइट कबड्डी प्रतियोगिताएं',
      gu: 'નેરલ, કર્જત અને જિલ્લા સ્તરીય નાઇટ કબડ્ડી સ્પર્ધાઓ',
    },
    meta: {
      en: ['30s Raid Timer', 'Red & gold arena GFX', 'Live team scores'],
      mr: ['रेड टायमर 30s', 'लाल-सोनेरी अरेना फ्रेम', 'लाईव्ह स्कोअर'],
      hi: ['30s रेड टाइमर', 'रेड-गोल्ड एरीना फ्रेम', 'लाइव टीम स्कोर'],
      gu: ['30s રેઇડ ટાઈમર', 'રેડ-ગોલ્ડ એરીના ફ્રેમ', 'લાઇવ ટીમ સ્કોર'],
    },
    description: {
      en: 'Fast-action multi-angle coverage of mat and mud Kabaddi arenas with live 30-second raid timers, Do-or-Die indicators, team scoreboards, and sponsor lower-thirds.',
      mr: 'मॅट किंवा मातीच्या मैदानावरील प्रत्येक रेड, सुपर टॅकल आणि ऑल-आऊटचे अचूक थेट प्रक्षेपण. 30-सेकंद रेड टायमर व टीम स्कोअर ग्राफिक्ससह YouTube वर LIVE.',
      hi: 'मैट और मिट्टी के मैदान पर हर रेड, सुपर टैकल और ऑल-आउट का सटीक लाइव प्रसारण। 30-सेकंड रेड टाइमर और टीम स्कोरबोर्ड के साथ YouTube LIVE।',
      gu: 'મેટ અને માટીના મેદાન પર દરેક રેઇડ, સુપર ટેકલ અને ઓલ-આઉટનું સચોટ લાઇવ પ્રસારણ. 30-સેકન્ડ રેઇડ ટાઈમર અને ટીમ સ્કોરબોર્ડ સાથે YouTube LIVE.',
    },
    deliverables: {
      en: ['Live Kabaddi arena scoreboard overlay', 'Super Raid, Tackle & match summary graphics'],
      mr: ['कबड्डी अरेना स्कोअरबोर्ड ओव्हरले', 'सुपर रेड, टॅकल व मॅच समरी ग्राफिक्स'],
      hi: ['कबड्डी एरीना स्कोरबोर्ड ओवरले', 'सुपर रेड, टैकल और मैच समरी ग्राफिक्स'],
      gu: ['કબડ્ડી એરીના સ્કોરબોર્ડ ઓવરલે', 'સુપર રેઇડ, ટેકલ અને મેચ સમરી ગ્રાફિક્સ'],
    },
    image: '/assets/optimized/service-kabaddi.webp',
    imageAlt:
      'Star Event Live night floodlit tournament dual-screen live broadcast console beside the arena and audience',
    imagePosition: 'object-center',
    previewMode: 'kabaddi',
  },
  {
    id: 'haldi',
    index: '03.',
    title: {
      en: 'Haldi Ceremonies',
      mr: 'हळदी समारंभ',
      hi: 'हल्दी समारोह',
      gu: 'હળદી સમારંભ',
    },
    subtitle: {
      en: 'Vibrant wireless coverage of festive family rituals',
      mr: 'रंगीत आणि आनंददायी क्षणांचे जिवंत प्रक्षेपण',
      hi: 'रंगीन और खुशनुमा पारिवारिक पलों का लाइव प्रसारण',
      gu: 'રંગીન અને આનંદમય પારિવારિક પ્રસંગોનું જીવંત પ્રસારણ',
    },
    meta: {
      en: ['Wireless gimbal cam', 'Rich color profile', 'Highlight reel edit'],
      mr: ['रोमिंग जिम्बल कॅमेरा', 'कलर-ग्रेडेड फीड', 'रील एडिट'],
      hi: ['वायरलेस जिम्बल कैमरा', 'रिच कलर फीड', 'हाइलाइट रील एडिट'],
      gu: ['વાયરલેસ જિમ્બલ કેમેરા', 'રિચ કલર ફીડ', 'હાઇલાઇટ રીલ એડિટ'],
    },
    description: {
      en: 'Smooth roaming camera movement through crowded courtyards, balanced outdoor exposure, live YouTube broadcasting, and shareable celebration highlights.',
      mr: 'हळदीच्या प्रत्येक पारंपरिक विधीचे आणि नृत्याचे स्थिर जिम्बल कॅमेऱ्याने थेट प्रक्षेपण. सोहळ्यानंतर लगेच शेअर करता येतील असे हायलाइट्स.',
      hi: 'हल्दी की हर रस्म और डांस का स्मूथ जिम्बल कैमरे से लाइव प्रसारण और कार्यक्रम के तुरंत बाद शेयर करने योग्य हाइलाइट्स।',
      gu: 'હળદીની દરેક પરંપરાગત વિધિ અને નૃત્યનું સ્મૂધ જિમ્બલ કેમેરાથી લાઇવ પ્રસારણ અને તરત શેર કરી શકાય તેવા હાઇલાઇટ્સ.',
    },
    deliverables: {
      en: ['Festive ceremonial frame overlay', 'YouTube Live public or unlisted stream link'],
      mr: ['उत्सवी मराठी टायटल फ्रेम', 'YouTube Live पब्लिक किंवा प्रायव्हेट लिंक सेटअप'],
      hi: ['उत्सव थीम टाइटल फ्रेम', 'YouTube Live पब्लिक या प्राइवेट लिंक सेटअप'],
      gu: ['ઉત્સવ થીમ ટાઇટલ ફ્રેમ', 'YouTube Live પબ્લિક અથવા પ્રાઇવેટ લિંક સેટઅપ'],
    },
    image: '/assets/optimized/service-haldi.webp',
    imageAlt:
      'Star Event Live Haldi ceremony night live streaming setup with Sony NXCAM broadcast camera, DJ mixer, and live monitor',
    imagePosition: 'object-center',
    previewMode: 'haldi',
  },
  {
    id: 'wedding',
    index: '04.',
    title: {
      en: 'Wedding Ceremonies',
      mr: 'शुभ विवाह सोहळा',
      hi: 'शुभ विवाह समारोह',
      gu: 'શુભ લગ્ન સમારંભ',
    },
    subtitle: {
      en: 'Shahi maroon & gold live stream connecting family everywhere',
      mr: 'शाही मरून-सोनेरी फ्रेमसह देश-विदेशातील नातेवाईकांसाठी LIVE',
      hi: 'शाही मरून-गोल्ड फ्रेम के साथ देश-विदेश के परिजनों के लिए LIVE',
      gu: 'શાહી મરૂન-ગોલ્ડ ફ્રેમ સાથે દેશ-વિદેશના પરિવારજનો માટે LIVE',
    },
    meta: {
      en: ['4K capture', 'Clean audio mixer feed', 'Shahi ornamental frame'],
      mr: ['4K कॅमेरा', 'डायरेक्ट ऑडिओ', 'शाही बॉर्डर फ्रेम'],
      hi: ['4K कैमरा', 'डायरेक्ट ऑडियो मिक्सर', 'शाही बॉर्डर फ्रेम'],
      gu: ['4K કેમેરા', 'ડાયરેક્ટ ઓડિયો મિક્સર', 'શાહી બોર્ડર ફ્રેમ'],
    },
    description: {
      en: 'Uninterrupted coverage of Mangalashtaka, Saptapadi, and reception moments with Shahi maroon & gold calligraphic title banners and crisp soundboard audio.',
      mr: 'सप्तपदी, मंगलाष्टके आणि रिसेप्शनचे स्पष्ट थेट प्रक्षेपण. मराठी सुलेखनासह वधू-वरांच्या नावाचे शाही स्क्रीन ग्राफिक्स आणि प्रायव्हेट किंवा पब्लिक लिंकची सोय.',
      hi: 'फेरे, मंगलाष्टक और रिसेप्शन का स्पष्ट लाइव प्रसारण। वर-वधू के नाम वाले शाही स्क्रीन ग्राफिक्स और प्राइवेट या पब्लिक लिंक की सुविधा।',
      gu: 'સપ્તપદી, મંગળાષ્ટક અને રિસેપ્શનનું સ્પષ્ટ લાઇવ પ્રસારણ. વર-વધૂના નામ સાથે શાહી સ્ક્રીન ગ્રાફિક્સ અને પ્રાઇવેટ કે પબ્લિક લિંકની સુવિધા.',
    },
    deliverables: {
      en: ['Shahi wedding overlay frame', 'Full edited ceremony recording'],
      mr: ['शाही विवाह ओव्हरले फ्रेम', 'पूर्ण सोहळ्याचे एडिटेड व्हिडिओ रेकॉर्डिंग'],
      hi: ['शाही विवाह ओवरले फ्रेम', 'संपूर्ण समारोह की एडिटेड वीडियो रिकॉर्डिंग'],
      gu: ['શાહી લગ્ન ઓવરલે ફ્રેમ', 'સંપૂર્ણ પ્રસંગનું એડિટેડ વિડિયો રેકોર્ડિંગ'],
    },
    image: '/assets/optimized/service-wedding.webp',
    imageAlt:
      'Star Event Live wedding mandap coverage with professional broadcast camcorder on tripod capturing the ceremony',
    imagePosition: 'object-[50%_54%]',
  },
  {
    id: 'birthday',
    index: '05.',
    title: {
      en: 'Birthday Celebrations',
      mr: 'वाढदिवस',
      hi: 'जन्मदिन समारोह',
      gu: 'જન્મદિવસ ઉજવણી',
    },
    subtitle: {
      en: 'Personalized live streams for milestone birthdays',
      mr: 'कौटुंबिक सोहळ्यासाठी आकर्षक लाईव्ह फ्रेम',
      hi: 'पारिवारिक उत्सव के लिए आकर्षक लाइव फ्रेम',
      gu: 'પારિવારિક ઉજવણી માટે આકર્ષક લાઇવ ફ્રેમ',
    },
    meta: {
      en: ['Custom birthday frame', 'Cake-cutting closeups', 'Fast video edit'],
      mr: ['कस्टम बर्थडे फ्रेम', 'केक कटिंग क्लोजअप', 'फास्ट एडिटिंग'],
      hi: ['कस्टम बर्थडे फ्रेम', 'केक कटिंग क्लोजअप', 'फास्ट एडिटिंग'],
      gu: ['કસ્ટમ બર્થડે ફ્રેમ', 'કેક કટિંગ ક્લોઝઅપ', 'ફાસ્ટ એડિટિંગ'],
    },
    description: {
      en: 'Custom on-screen birthday greetings, warm low-light camera capture for indoor banquets, live guest wishes, and cleanly edited keepsake video delivery.',
      mr: 'वाढदिवसाचे नाव व शुभेच्छा ग्राफिक्ससह YouTube वर थेट प्रक्षेपण, पूर्ण रेकॉर्डिंग आणि आठवणी जपणारे व्हिडिओ एडिटिंग.',
      hi: 'जन्मदिन के नाम और शुभकामना ग्राफिक्स के साथ YouTube पर लाइव स्ट्रीमिंग, पूरी रिकॉर्डिंग और यादगार वीडियो एडिटिंग।',
      gu: 'જન્મદિવસના નામ અને શુભેચ્છા ગ્રાફિક્સ સાથે YouTube પર લાઇવ સ્ટ્રીમિંગ, સંપૂર્ણ રેકોર્ડિંગ અને યાદગાર વિડિયો એડિટિંગ.',
    },
    deliverables: {
      en: ['Personalized birthday screen graphics', 'Full recording & short highlight film'],
      mr: ['पर्सनलाइज्ड वाढदिवस ग्राफिक्स', 'पूर्ण रेकॉर्डिंग व शॉर्ट हायलाइट व्हिडिओ'],
      hi: ['पर्सनलाइज्ड बर्थडे ग्राफिक्स', 'पूरी रिकॉर्डिंग और शॉर्ट हाइलाइट वीडियो'],
      gu: ['પર્સનલાઇઝ્ડ બર્થડે ગ્રાફિક્સ', 'સંપૂર્ણ રેકોર્ડિંગ અને શોર્ટ હાઇલાઇટ વિડિયો'],
    },
    image: '/assets/optimized/service-birthday.webp',
    imageAlt:
      'Star Event Live OBS streaming, editing, and studio audio desk setup for birthday broadcasts and highlight reels',
    imagePosition: 'object-center',
  },
  {
    id: 'other',
    index: '06.',
    title: {
      en: 'All Other Events',
      mr: 'इतर सर्व कार्यक्रम',
      hi: 'अन्य सभी कार्यक्रम',
      gu: 'અન્ય તમામ કાર્યક્રમો',
    },
    subtitle: {
      en: 'Cultural festivals, stage shows, corporate & community gatherings',
      mr: 'सांस्कृतिक, धार्मिक, राजकीय व कॉर्पोरेट इव्हेंट्स',
      hi: 'सांस्कृतिक, धार्मिक, स्टेज शो और कॉर्पोरेट इवेंट्स',
      gu: 'સાંસ્કૃતિક, ધાર્મિક, સ્ટેજ શો અને કોર્પોરેટ ઇવેન્ટ્સ',
    },
    meta: {
      en: ['Stage & LED wall feed', 'YouTube Live HD', 'On-site technical crew'],
      mr: ['स्टेज व LED आउटपुट', 'YouTube Live HD', 'ऑन-साईट टीम'],
      hi: ['स्टेज व LED वॉल फीड', 'YouTube Live HD', 'ऑन-साइट टेक्निकल टीम'],
      gu: ['સ્ટેજ અને LED વોલ ફીડ', 'YouTube Live HD', 'ઓન-સાઇટ ટેકનિકલ ટીમ'],
    },
    description: {
      en: 'Dependable live switching for inaugurations, Kirtan and spiritual discourses, Ganeshotsav programs, college fests, conferences, and large stage productions.',
      mr: 'उद्घाटन सोहळे, कीर्तन-प्रवचन, गणेशोत्सव, शाळा-महाविद्यालयीन स्नेहसंमेलन, सेमिनार आणि सांस्कृतिक कार्यक्रमांसाठी विश्वासार्ह थेट प्रक्षेपण.',
      hi: 'उद्घाटन समारोह, कीर्तन-प्रवचन, गणेशोत्सव, कॉलेज फेस्ट, सेमिनार और बड़े सांस्कृतिक कार्यक्रमों के लिए भरोसेमंद लाइव प्रसारण।',
      gu: 'ઉદ્ઘાટન સમારોહ, કીર્તન-પ્રવચન, ગણેશોત્સવ, કોલેજ ફેસ્ટ, સેમિનાર અને સાંસ્કૃતિક કાર્યક્રમો માટે વિશ્વસનીય લાઇવ પ્રસારણ.',
    },
    deliverables: {
      en: ['Live video feed to venue LED walls', 'Speaker lower-thirds & event announcements'],
      mr: ['LED वॉलसाठी थेट व्हिडिओ आउटपुट', 'स्पीकर नेम-प्लेट व इव्हेंट टिकर'],
      hi: ['LED वॉल के लिए सीधा वीडियो आउटपुट', 'स्पीकर नेम-प्लेट और इवेंट टिकर'],
      gu: ['LED વોલ માટે સીધું વિડિયો આઉટપુટ', 'સ્પીકર નેમ-પ્લેટ અને ઇવેન્ટ ટિકર'],
    },
    image: '/assets/optimized/promo-poster.webp',
    imageAlt:
      'Star Event Live official poster — Capture, Stream, Share. Your Event, Our Coverage for all cultural, religious, sports, and community events',
    imageFit: 'contain',
    fullSpan: true,
  },
];

export const PRODUCTION_PACKAGES: ProductionPackage[] = [
  {
    id: 'single-cam-live',
    name: {
      en: 'Essential Single-Cam Live',
      mr: 'सिंगल कॅमेरा लाईव्ह',
      hi: 'सिंगल कैमरा लाइव',
      gu: 'સિંગલ કેમેરા લાઇવ',
    },
    idealFor: {
      en: 'Birthdays, Haldi ceremonies, intimate family & community events',
      mr: 'वाढदिवस, हळदी समारंभ, छोटे कौटुंबिक व धार्मिक कार्यक्रम',
      hi: 'जन्मदिन, हल्दी समारोह, छोटे पारिवारिक और धार्मिक आयोजन',
      gu: 'જન્મદિવસ, હળદી સમારંભ, નાના પારિવારિક અને ધાર્મિક પ્રસંગો',
    },
    priceRange: {
      en: 'From ₹6,500',
      mr: '₹6,500 पासून',
      hi: '₹6,500 से शुरू',
      gu: '₹6,500 થી શરૂ',
    },
    basePrice: 6500,
    cameras: {
      en: '1 High-Quality 4K Broadcast Camera',
      mr: '1 हाय-क्वालिटी 4K ब्रॉडकास्ट कॅमेरा',
      hi: '1 हाई-क्वालिटी 4K ब्रॉडकास्ट कैमरा',
      gu: '1 હાઇ-ક્વોલિટી 4K બ્રોડકાસ્ટ કેમેરા',
    },
    platforms: {
      en: 'Live on YouTube (@stareventlive01)',
      mr: 'YouTube (@stareventlive01) वर LIVE',
      hi: 'YouTube (@stareventlive01) पर LIVE',
      gu: 'YouTube (@stareventlive01) પર LIVE',
    },
    features: {
      en: [
        '1080p Full HD live stream + full master recording',
        'Custom event title banner & lower-third graphics',
        'Direct soundboard audio feed for clear speech & music',
        'Dedicated camera operator & stream technician',
      ],
      mr: [
        '1080p Full HD थेट प्रक्षेपण व संपूर्ण रेकॉर्डिंग',
        'कस्टम इव्हेंट टायटल व स्क्रीन ग्राफिक्स',
        'डायरेक्ट माईक / साउंड मिक्सर ऑडिओ कनेक्शन',
        'अनुभवी कॅमेरा ऑपरेटर व स्ट्रीमिंग इंजिनिअर',
      ],
      hi: [
        '1080p Full HD लाइव स्ट्रीम + संपूर्ण मास्टर रिकॉर्डिंग',
        'कस्टम इवेंट टाइटल बैनर और लोअर-थर्ड ग्राफिक्स',
        'साफ आवाज के लिए डायरेक्ट साउंड मिक्सर ऑडियो कनेक्शन',
        'अनुभवी कैमरा ऑपरेटर और स्ट्रीमिंग इंजीनियर',
      ],
      gu: [
        '1080p Full HD લાઇવ સ્ટ્રીમ + સંપૂર્ણ માસ્ટર રેકોર્ડિંગ',
        'કસ્ટમ ઇવેન્ટ ટાઇટલ બેનર અને લોઅર-થર્ડ ગ્રાફિક્સ',
        'સ્પષ્ટ અવાજ માટે ડાયરેક્ટ સાઉન્ડ મિક્સર ઓડિયો કનેક્શન',
        'અનુભવી કેમેરા ઓપરેટર અને સ્ટ્રીમિંગ એન્જિનિયર',
      ],
    },
  },
  {
    id: 'multi-cam-pro',
    name: {
      en: 'Multi-Cam Pro Broadcast',
      mr: 'मल्टी-कॅमेरा प्रो ब्रॉडकास्ट',
      hi: 'मल्टी-कैमरा प्रो ब्रॉडकास्ट',
      gu: 'મલ્ટી-કેમેરા પ્રો બ્રોડકાસ્ટ',
    },
    idealFor: {
      en: 'Weddings, receptions, cultural stage shows & corporate launches',
      mr: 'लग्न समारंभ, रिसेप्शन, सांस्कृतिक कार्यक्रम व कॉर्पोरेट स्टेज शो',
      hi: 'शादी समारोह, रिसेप्शन, सांस्कृतिक स्टेज शो और कॉर्पोरेट इवेंट',
      gu: 'લગ્ન સમારંભ, રિસેપ્શન, સાંસ્કૃતિક સ્ટેજ શો અને કોર્પોરેટ ઇવેન્ટ',
    },
    priceRange: {
      en: 'From ₹14,500',
      mr: '₹14,500 पासून',
      hi: '₹14,500 से शुरू',
      gu: '₹14,500 થી શરૂ',
    },
    basePrice: 14500,
    cameras: {
      en: '2–3 Pro Cameras + Live Vision Switcher',
      mr: '2–3 प्रोफेशनल कॅमेरे + लाईव्ह स्विचर',
      hi: '2–3 प्रोफेशनल कैमरे + लाइव स्विचर',
      gu: '2–3 પ્રોફેશનલ કેમેરા + લાઇવ સ્વિચર',
    },
    platforms: {
      en: 'YouTube Live 4K + Public / Unlisted Link',
      mr: 'YouTube Live 4K + प्रायव्हेट / पब्लिक लिंक',
      hi: 'YouTube Live 4K + पब्लिक / प्राइवेट लिंक',
      gu: 'YouTube Live 4K + પબ્લિક / પ્રાઇવેટ લિંક',
    },
    featured: true,
    features: {
      en: [
        'Real-time multi-angle switching (wide, closeup & roaming gimbal)',
        'Custom multilingual title overlays, logos & scrolling tickers',
        'Dual-network bonding backup for uninterrupted streaming',
        'Complete post-event video editing + shareable highlight film',
      ],
      mr: [
        'लाईव्ह मल्टी-अँगल स्विचिंग (वाइड + क्लोजअप + जिम्बल)',
        'कस्टम मराठी/इंग्रजी टायटल्स, लोगो आणि टिकर ग्राफिक्स',
        'ड्युअल नेटवर्क बॅकअप (अखंडित प्रक्षेपणासाठी)',
        'संपूर्ण कार्यक्रमाचे प्रोफेशनल एडिटिंग व हायलाइट व्हिडिओ',
      ],
      hi: [
        'रियल-टाइम मल्टी-एंगल स्विचिंग (वाइड + क्लोजअप + जिम्बल)',
        'कस्टम टाइटल ओवरले, लोगो और स्क्रॉलिंग टिकर ग्राफिक्स',
        'बिना रुकावट स्ट्रीमिंग के लिए डुअल नेटवर्क बैकअप',
        'कार्यक्रम के बाद संपूर्ण वीडियो एडिटिंग और हाइलाइट फिल्म',
      ],
      gu: [
        'રિયલ-ટાઇમ મલ્ટી-એંગલ સ્વિચિંગ (વાઇડ + ક્લોઝઅપ + જિમ્બલ)',
        'કસ્ટમ ટાઇટલ ઓવરલે, લોગો અને સ્ક્રોલિંગ ટિકર ગ્રાફિક્સ',
        'અવિરત સ્ટ્રીમિંગ માટે ડ્યુઅલ નેટવર્ક બેકઅપ',
        'કાર્યક્રમ પછી સંપૂર્ણ વિડિયો એડિટિંગ અને હાઇલાઇટ ફિલ્મ',
      ],
    },
  },
  {
    id: 'cricket-tournament',
    name: {
      en: 'Cricket Tournament Pro',
      mr: 'क्रिकेट टूर्नामेंट ब्रॉडकास्ट',
      hi: 'क्रिकेट टूर्नामेंट प्रो',
      gu: 'ક્રિકેટ ટુર્નામેન્ટ પ્રો',
    },
    idealFor: {
      en: 'Day-night cricket leagues, district & village tournaments',
      mr: 'डे-नाईट क्रिकेट स्पर्धा, ग्रामीण व जिल्हास्तरीय टूर्नामेंट्स',
      hi: 'डे-नाइट क्रिकेट लीग, ग्रामीण और जिला स्तरीय टूर्नामेंट',
      gu: 'ડે-નાઇટ ક્રિકેટ લીગ, ગ્રામીણ અને જિલ્લા સ્તરીય ટુર્નામેન્ટ',
    },
    priceRange: {
      en: 'From ₹12,000 / day',
      mr: '₹12,000 / दिवस पासून',
      hi: '₹12,000 / दिन से शुरू',
      gu: '₹12,000 / દિવસથી શરૂ',
    },
    basePrice: 12000,
    cameras: {
      en: '2–4 Pitch, Boundary & Dugout Cameras',
      mr: '2–4 पिच, बाउंड्री व डगआउट कॅमेरे',
      hi: '2–4 पिच, बाउंड्री और डगआउट कैमरे',
      gu: '2–4 પિચ, બાઉન્ડ્રી અને ડગઆઉટ કેમેરા',
    },
    platforms: {
      en: 'YouTube Live + Ground LED Screen Feed',
      mr: 'YouTube Live + ग्राउंड LED स्क्रीन फीड',
      hi: 'YouTube Live + ग्राउंड LED स्क्रीन फीड',
      gu: 'YouTube Live + ગ્રાઉન્ડ LED સ્ક્રીન ફીડ',
    },
    features: {
      en: [
        'Live ball-by-ball scoreboard, striker stats & run-rate bar',
        'Animated FOUR, SIX, WICKET alerts & sponsor ad slates',
        'Instant action replay & post-match summary scorecards',
        'Dedicated live scorer & full field broadcast crew',
      ],
      mr: [
        'लाईव्ह बॉल-बाय-बॉल स्कोअरबोर्ड व रन-रेट ग्राफिक्स',
        'चौकार, षटकार, विकेट अॅनिमेशन व स्पॉन्सर जाहिराती',
        'रिप्ले कॅप्चर व मॅच समरी ग्राफिक कार्ड्स',
        'संपूर्ण स्पर्धेसाठी डेडिकेटेड स्कोअरर व ब्रॉडकास्ट टीम',
      ],
      hi: [
        'लाइव बॉल-बाय-बॉल स्कोरबोर्ड, स्ट्राइकर स्टैट्स और रन-रेट बार',
        'एनिमेटेड चौका, छक्का, विकेट अलर्ट और स्पॉन्सर विज्ञापन',
        'इंस्टेंट रीप्ले और मैच समरी ग्राफिक कार्ड्स',
        'डेडिकेटेड लाइव स्कोरर और पूरी फील्ड ब्रॉडकास्ट टीम',
      ],
      gu: [
        'લાઇવ બોલ-બાય-બોલ સ્કોરબોર્ડ, સ્ટ્રાઇકર સ્ટેટ્સ અને રન-રેટ બાર',
        'એનિમેટેડ ચોગ્ગા, છગ્ગા, વિકેટ એલર્ટ અને સ્પોન્સર જાહેરાતો',
        'ઇન્સ્ટન્ટ રીપ્લે અને મેચ સમરી ગ્રાફિક કાર્ડ્સ',
        'ડેડિકેટેડ લાઇવ સ્કોરર અને સંપૂર્ણ ફિલ્ડ બ્રોડકાસ્ટ ટીમ',
      ],
    },
  },
];

export const ADDON_OPTIONS: AddOnOption[] = [
  {
    id: 'extra-camera',
    label: {
      en: 'Additional 4K Camera + Operator',
      mr: 'अतिरिक्त 4K कॅमेरा + ऑपरेटर',
      hi: 'अतिरिक्त 4K कैमरा + ऑपरेटर',
      gu: 'વધારાનો 4K કેમેરા + ઓપરેટર',
    },
    price: 3500,
  },
  {
    id: 'drone-feed',
    label: {
      en: 'Drone Aerial Live Feed',
      mr: 'ड्रोन एरियल लाईव्ह फीड',
      hi: 'ड्रोन एरियल लाइव फीड',
      gu: 'ડ્રોન એરિયલ લાઇવ ફીડ',
    },
    price: 4500,
  },
  {
    id: 'led-output',
    label: {
      en: 'Venue LED Wall Live Output',
      mr: 'व्हेन्यू LED वॉल लाईव्ह आउटपुट',
      hi: 'वेन्यू LED वॉल लाइव आउटपुट',
      gu: 'વેન્યુ LED વોલ લાઇવ આઉટપુટ',
    },
    price: 2500,
  },
  {
    id: 'same-day-edit',
    label: {
      en: 'Same-Day Highlight Reel Edit',
      mr: 'सेम-डे हायलाइट रील एडिटिंग',
      hi: 'सेम-डे हाइलाइट रील एडिटिंग',
      gu: 'સેમ-ડે હાઇલાઇટ રીલ એડિટિંગ',
    },
    price: 3000,
  },
];

export const CLIENT_OUTCOMES: ClientCaseStudy[] = [
  {
    id: 'premier-cup',
    eventTitle: {
      en: 'Taluka Day-Night Cricket Championship',
      mr: 'तालुका डे-नाईट क्रिकेट महासंग्राम',
      hi: 'तालुका डे-नाइट क्रिकेट महासंग्राम',
      gu: 'તાલુકા ડે-નાઇટ ક્રિકેટ મહાસંગ્રામ',
    },
    category: {
      en: 'Cricket Tournament · 3-Camera Rig',
      mr: 'क्रिकेट सामने · 3-कॅमेरा सेटअप',
      hi: 'क्रिकेट टूर्नामेंट · 3-कैमरा सेटअप',
      gu: 'ક્રિકેટ ટુર્નામેન્ટ · 3-કેમેરા સેટઅપ',
    },
    metric: {
      en: '38,400+ Live Viewers across 4 Days',
      mr: '38,400+ थेट दर्शक (4 दिवस)',
      hi: '38,400+ लाइव दर्शक (4 दिन)',
      gu: '38,400+ લાઇવ દર્શકો (4 દિવસ)',
    },
    summary: {
      en: 'Broadcast 24 consecutive matches on YouTube with zero stream drops, real-time ball-by-ball score overlays, and local sponsor ad integration.',
      mr: 'तीन कॅमेरे, बॉल-बाय-बॉल स्कोअरबोर्ड आणि स्थानिक प्रायोजकांच्या स्क्रीन ग्राफिक्ससह YouTube वर एकही सेकंड खंड न पडता 24 सामन्यांचे प्रक्षेपण.',
      hi: 'तीन कैमरों, बॉल-बाय-बॉल स्कोरबोर्ड और स्थानीय स्पॉन्सर ग्राफिक्स के साथ YouTube पर बिना किसी रुकावट के 24 मैचों का लाइव प्रसारण।',
      gu: 'ત્રણ કેમેરા, બોલ-બાય-બોલ સ્કોરબોર્ડ અને સ્થાનિક સ્પોન્સર ગ્રાફિક્સ સાથે YouTube પર એક પણ સેકન્ડ વિક્ષેપ વિના 24 મેચનું લાઇવ પ્રસારણ.',
    },
    attribution: {
      en: 'Sandeep Jadhav · Tournament Organizer, Krida Mandal',
      mr: 'संदीप जाधव · स्पर्धा संयोजक, क्रीडा मंडळ',
      hi: 'संदीप जाधव · टूर्नामेंट आयोजक, क्रीड़ा मंडल',
      gu: 'સંદીપ જાધવ · ટુર્નામેન્ટ આયોજક, ક્રીડા મંડળ',
    },
  },
  {
    id: 'deshmukh-wedding',
    eventTitle: {
      en: 'Deshmukh Family Wedding & Haldi',
      mr: 'देशमुख कुटुंब लग्न व हळदी समारंभ',
      hi: 'देशमुख परिवार शादी और हल्दी समारोह',
      gu: 'દેશમુખ પરિવાર લગ્ન અને હળદી સમારંભ',
    },
    category: {
      en: 'Wedding & Haldi · YouTube Live 4K',
      mr: 'लग्न व हळदी · YouTube Live 4K',
      hi: 'शादी व हल्दी · YouTube Live 4K',
      gu: 'લગ્ન અને હળદી · YouTube Live 4K',
    },
    metric: {
      en: '210+ Remote Relatives Joined Live',
      mr: '210+ कुटुंबीय परदेशातून थेट सहभागी',
      hi: '210+ परिजन देश-विदेश से लाइव जुड़े',
      gu: '210+ પરિવારજનો દેશ-વિદેશથી લાઇવ જોડાયા',
    },
    summary: {
      en: 'Family members in Pune, Mumbai, and the US watched both Haldi and wedding vows with direct mixer audio and received the edited film the next day.',
      mr: 'पुणे, मुंबई आणि अमेरिकेतील नातेवाईकांना मंगलाष्टके व हळदी सोहळा स्पष्ट आवाजात व 4K दर्जात पाहता आला; दुसऱ्याच दिवशी एडिटेड व्हिडिओ मिळाला.',
      hi: 'पुणे, मुंबई और अमेरिका के रिश्तेदारों ने साफ ऑडियो और 4K क्वालिटी में हल्दी और शादी देखी और अगले ही दिन एडिटेड वीडियो मिल गया।',
      gu: 'પુણે, મુંબઈ અને અમેરિકાના સંબંધીઓએ સ્પષ્ટ ઓડિયો અને 4K ક્વોલિટીમાં હળદી અને લગ્ન નિહાળ્યા અને બીજા જ દિવસે એડિટેડ વિડિયો મળી ગયો.',
    },
    attribution: {
      en: 'Rajendra Deshmukh · Family Host',
      mr: 'राजेंद्र देशमुख · कुटुंब प्रमुख',
      hi: 'राजेंद्र देशमुख · परिवार प्रमुख',
      gu: 'રાજેન્દ્ર દેશમુખ · પરિવાર મુખ્ય',
    },
  },
  {
    id: 'cultural-utsav',
    eventTitle: {
      en: 'Sarvajanik Cultural Festival & Kirtan',
      mr: 'सार्वजनिक सांस्कृतिक महोत्सव व कीर्तन सोहळा',
      hi: 'सार्वजनिक सांस्कृतिक महोत्सव और कीर्तन समारोह',
      gu: 'સાર્વજનિક સાંસ્કૃતિક મહોત્સવ અને કીર્તન સમારોહ',
    },
    category: {
      en: 'Stage Event · YouTube Live + LED Feed',
      mr: 'इतर कार्यक्रम · YouTube Live + LED',
      hi: 'स्टेज इवेंट · YouTube Live + LED फीड',
      gu: 'સ્ટેજ ઇવેન્ટ · YouTube Live + LED ફીડ',
    },
    metric: {
      en: '6-Hour Uninterrupted YouTube HD Live',
      mr: 'YouTube वर 6 तास अखंड Full HD LIVE',
      hi: 'YouTube पर 6 घंटे लगातार Full HD LIVE',
      gu: 'YouTube પર 6 કલાક સતત Full HD LIVE',
    },
    summary: {
      en: 'Managed dual LED wall feeds alongside uninterrupted YouTube Live broadcasting with live speaker lower-thirds throughout the evening.',
      mr: 'स्टेजवरील प्रमुख पाहुण्यांची नावे, कार्यक्रमाचे वेळापत्रक आणि ग्राउंडवरील दोन LED स्क्रीनवर थेट व्हिडिओ आउटपुट अचूकपणे हाताळले.',
      hi: 'स्टेज के मुख्य अतिथियों के नाम, कार्यक्रम शेड्यूल और ग्राउंड की दो LED स्क्रीन पर लाइव वीडियो आउटपुट बखूबी संभाला।',
      gu: 'સ્ટેજના મુખ્ય મહેમાનોના નામ, કાર્યક્રમ સમયપત્રક અને ગ્રાઉન્ડની બે LED સ્ક્રીન પર લાઇવ વિડિયો આઉટપુટ સચોટ રીતે સંભાળ્યું.',
    },
    attribution: {
      en: 'Pravin Kulkarni · Cultural Committee Secretary',
      mr: 'प्रवीण कुलकर्णी · सांस्कृतिक समिती सचिव',
      hi: 'प्रवीण कुलकर्णी · सांस्कृतिक समिति सचिव',
      gu: 'પ્રવીણ કુલકર્ણી · સાંસ્કૃતિક સમિતિ સચિવ',
    },
  },
];
