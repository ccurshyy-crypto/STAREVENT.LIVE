export type Language = 'mr' | 'en';

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
};

export const UI_COPY = {
  nav: {
    home: { mr: 'होम', en: 'Home' },
    services: { mr: 'सेवा', en: 'Services' },
    studio: { mr: 'ओव्हरले', en: 'Overlays' },
    packages: { mr: 'पॅकेजेस', en: 'Packages' },
    book: { mr: 'बुकिंग', en: 'Book' },
    callCta: { mr: 'कॉल 9890175727', en: 'Call 9890175727' },
  },
  hero: {
    headline: {
      mr: 'आपल्या सर्व प्रकारच्या कार्यक्रमांचे हाय-क्वालिटी थेट प्रक्षेपण',
      en: 'Broadcast-Grade Live Streaming for Every Event',
    },
    subcopy: {
      mr: 'क्रिकेट सामने, कबड्डी स्पर्धा, लग्न समारंभ, हळदी, वाढदिवस आणि इतर सर्व कार्यक्रमांसाठी 4K मल्टी-कॅमेरा सेटअप, कस्टम स्क्रीन ग्राफिक्स, रेकॉर्डिंग आणि एडिटिंगसह YouTube (@stareventlive01) वर थेट प्रक्षेपण.',
      en: '4K multi-camera setups, custom on-screen scoreboards and lower-thirds, full HD recording, and professional editing streamed live on YouTube (@stareventlive01).',
    },
    primaryCta: { mr: 'कार्यक्रम बुक करा', en: 'Book Your Event' },
    secondaryCta: { mr: 'ओव्हरले पहा (₹99)', en: 'Overlays Store (₹99)' },
    bannerCaption: {
      mr: 'अधिकृत स्टुडिओ बॅनर · YouTube (@stareventlive01) वर 4K LIVE उपलब्ध',
      en: 'Official Studio Banner · 4K LIVE on YouTube (@stareventlive01)',
    },
    stats: [
      {
        value: '4K / 60fps',
        label: { mr: 'हाय क्वालिटी कॅमेरा सेटअप', en: 'High-Quality Camera Setup' },
        detail: { mr: 'ब्रॉडकास्ट कॅमकॉर्डर व जिम्बल रिंग', en: 'Broadcast camcorders & cinema lenses' },
      },
      {
        value: 'YouTube Live',
        label: { mr: 'अखंडित थेट प्रक्षेपण', en: 'Uninterrupted Live Streaming' },
        detail: { mr: 'YouTube @stareventlive01 · 1080p / 4K', en: 'YouTube @stareventlive01 · 1080p / 4K' },
      },
      {
        value: 'Live GFX',
        label: { mr: 'कस्टम स्क्रीन ग्राफिक्स', en: 'Custom On-Screen Graphics' },
        detail: { mr: 'क्रिकेट स्कोअरबोर्ड, नावे व लोगो', en: 'Live scoreboards, titles & branding' },
      },
      {
        value: 'End-to-End',
        label: { mr: 'प्रोफेशनल टीम द्वारे सेवा', en: 'Dedicated Production Crew' },
        detail: { mr: 'लाईव्ह प्रक्षेपण · रेकॉर्डिंग · एडिटिंग', en: 'Live broadcast · Recording · Editing' },
      },
    ],
  },
  servicesSection: {
    kicker: { mr: 'आमच्या सेवा · इव्हेंट कव्हरेज', en: 'Event Coverage · Production Capabilities' },
    heading: {
      mr: 'प्रत्येक कार्यक्रमासाठी खास ब्रॉडकास्ट सेटअप',
      en: 'Tailored Broadcast Setups for Every Occasion',
    },
    intro: {
      mr: 'क्रीडा स्पर्धा असो वा कौटुंबिक सोहळा — आमची अनुभवी टीम प्रत्येक क्षण स्पष्ट व्हिडिओ आणि स्वच्छ ऑडिओसह जगाच्या कानाकोपऱ्यात पोहोचवते.',
      en: 'From packed night cricket tournaments to family wedding rituals, our crew delivers uninterrupted feeds, clean mixer audio, and permanent archival recordings.',
    },
    previewBtn: { mr: 'ओव्हरले पहा (₹99)', en: 'Open Overlay (₹99)' },
    selectBtn: { mr: 'बुकिंगसाठी निवडा', en: 'Book This Event' },
  },
  studioSection: {
    kicker: { mr: 'लाईव्ह ओव्हरले स्टुडिओ · OBS व vMix सपोर्ट', en: 'Live Overlay Studio · OBS & vMix Ready' },
    heading: {
      mr: 'कबड्डी प्रो स्कोअरबोर्ड आणि हळदी-लग्न ओव्हरले',
      en: 'Kabaddi Pro Scoreboard & Haldi-Wedding Overlays',
    },
    intro: {
      mr: 'वॉटरमार्क-फ्री 1920×1080 ट्रान्सपरंट कबड्डी प्रो स्कोअरबोर्ड (दोन्ही बाजू लोगो + 30:00 टायमर) आणि हळदी व लग्न समारंभ ओव्हरले (2 स्टाईल) — OBS Studio व vMix साठी थेट कंट्रोल.',
      en: 'Control watermark-free 1920×1080 transparent Kabaddi Pro Scoreboard (dual team logos + 30:00 timer) and 2 Haldi & Wedding overlays for OBS Studio & vMix.',
    },
  },
  packagesSection: {
    kicker: { mr: 'प्रॉडक्शन पॅकेजेस · पारदर्शक अंदाज', en: 'Production Packages · Flexible Setup' },
    heading: {
      mr: 'कार्यक्रमाच्या गरजेनुसार योग्य पॅकेज निवडा',
      en: 'Choose a Broadcast Setup Built for Your Venue',
    },
    intro: {
      mr: 'एकल कॅमेरा कौटुंबिक लाईव्हपासून ते मल्टी-कॅमेरा टूर्नामेंट ब्रॉडकास्टपर्यंत सर्व पर्याय उपलब्ध आहेत. अतिरिक्त सेवा जोडून तात्काळ अंदाज मिळवा.',
      en: 'Select a base package and customize optional camera angles, drone feeds, or LED wall output before sending your booking request.',
    },
    addonsHeading: { mr: 'अतिरिक्त प्रॉडक्शन पर्याय (ऐच्छिक)', en: 'Optional Production Add-ons' },
    selectPackageBtn: { mr: 'हे पॅकेज बुक करा', en: 'Select Package' },
    proofKicker: { mr: 'ग्राहक अनुभव · यशस्वी प्रक्षेपणे', en: 'Verified Broadcast Outcomes' },
    proofHeading: {
      mr: 'हजारो दर्शकांपर्यंत अखंडित थेट प्रक्षेपण',
      en: 'Proven Reliability Across Live Venues',
    },
  },
  bookingSection: {
    kicker: { mr: 'थेट संपर्क व बुकिंग · Neral & Karjat · starevent.live', en: 'Direct Booking · Neral & Karjat · starevent.live' },
    heading: {
      mr: 'तुमच्या कार्यक्रमाची तारीख आजच निश्चित करा',
      en: 'Reserve Your Event Broadcast Date',
    },
    intro: {
      mr: 'खालील माहिती भरा किंवा थेट 9890175727 वर कॉल करा. आमची टीम तुम्हाला कॅमेरा सेटअप, नेटवर्क तपासणी आणि वेळेचे नियोजन कळवेल.',
      en: 'Submit your event details below or call 9890175727 directly. Our production coordinator will confirm crew availability and venue internet setup.',
    },
  },
};

export const EVENT_SERVICES: EventService[] = [
  {
    id: 'cricket',
    index: '01.',
    title: { mr: 'क्रिकेट सामने', en: 'Cricket Matches & Tournaments' },
    subtitle: {
      mr: 'डे-नाईट व टेनिस बॉल स्पर्धांसाठी पूर्ण ब्रॉडकास्ट',
      en: 'Full broadcast coverage for day-night & leather/tennis ball tournaments',
    },
    meta: {
      mr: ['मल्टी-कॅमेरा अँगल', 'लाईव्ह स्कोअरबोर्ड', 'स्पॉन्सर बॅनर्स'],
      en: ['Multi-cam pitch angles', 'Ball-by-ball scoreboard', 'Sponsor tickers'],
    },
    description: {
      mr: 'पिच कॅमेरा, बाउंड्री शॉट्स, रिअल-टाईम स्कोअर ग्राफिक्स, चौकार-षटकार अॅनिमेशन, प्लेअर स्टॅट्स आणि YouTube वर हजारो दर्शकांसाठी अखंडित स्ट्रीमिंग.',
      en: 'Dedicated pitch and outfield camera rigs paired with live ball-by-ball scoreboards, FOUR/SIX/WICKET triggers, sponsor lower-thirds, and high-bitrate YouTube tournament streaming.',
    },
    deliverables: {
      mr: ['लाईव्ह स्कोअरकार्ड व रन-रेट ग्राफिक्स', 'मॅच हायलाइट्स व बक्षीस वितरण कव्हरेज'],
      en: ['Live scorecard & run-rate graphics', 'Match highlights & trophy ceremony coverage'],
    },
    image: '/assets/optimized/service-cricket.webp',
    imageAlt:
      'Star Event Live outdoor sunset cricket tournament live broadcast desk and switching monitor on the ground',
    imagePosition: 'object-[50%_72%]',
  },
  {
    id: 'kabaddi',
    index: '02.',
    title: { mr: 'कबड्डी महासंग्राम', en: 'Kabaddi Tournaments' },
    subtitle: {
      mr: 'नेरळ, कर्जत व जिल्हास्तरीय रात्रीच्या कबड्डी स्पर्धा',
      en: 'Night arena coverage for Neral, Karjat & district Kabaddi leagues',
    },
    meta: {
      mr: ['रेड टायमर 30s', 'लाल-सोनेरी अरेना फ्रेम', 'लाईव्ह स्कोअर'],
      en: ['30s Raid Timer', 'Red & gold arena GFX', 'Live team scores'],
    },
    description: {
      mr: 'मॅट किंवा मातीच्या मैदानावरील प्रत्येक रेड, सुपर टॅकल आणि ऑल-आऊटचे अचूक थेट प्रक्षेपण. 30-सेकंद रेड टायमर व टीम स्कोअर ग्राफिक्ससह YouTube वर LIVE.',
      en: 'Fast-action multi-angle coverage of mat and mud Kabaddi arenas with live 30-second raid timers, Do-or-Die indicators, team scoreboards, and sponsor lower-thirds.',
    },
    deliverables: {
      mr: ['1920×1080 ट्रान्सपरंट कबड्डी अरेना ओव्हरले', 'सुपर रेड, टॅकल व मॅच समरी ग्राफिक्स'],
      en: ['1920×1080 transparent Kabaddi arena overlay', 'Super Raid, Tackle & match summary graphics'],
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
    title: { mr: 'हळदी समारंभ', en: 'Haldi Ceremonies' },
    subtitle: {
      mr: 'रंगीत आणि आनंददायी क्षणांचे जिवंत प्रक्षेपण',
      en: 'Vibrant wireless coverage of festive family rituals',
    },
    meta: {
      mr: ['रोमिंग जिम्बल कॅमेरा', 'कलर-ग्रेडेड फीड', 'रील एडिट'],
      en: ['Wireless gimbal cam', 'Rich color profile', 'Highlight reel edit'],
    },
    description: {
      mr: 'हळदीच्या प्रत्येक पारंपरिक विधीचे आणि नृत्याचे स्थिर जिम्बल कॅमेऱ्याने थेट प्रक्षेपण. सोहळ्यानंतर लगेच शेअर करता येतील असे हायलाइट्स.',
      en: 'Smooth roaming camera movement through crowded courtyards, balanced outdoor exposure, live YouTube broadcasting, and shareable celebration highlights.',
    },
    deliverables: {
      mr: ['उत्सवी मराठी टायटल फ्रेम', 'YouTube Live पब्लिक किंवा प्रायव्हेट लिंक सेटअप'],
      en: ['Festive ceremonial frame overlay', 'YouTube Live public or unlisted stream link'],
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
    title: { mr: 'शुभ विवाह सोहळा', en: 'Wedding Ceremonies' },
    subtitle: {
      mr: 'शाही मरून-सोनेरी फ्रेमसह देश-विदेशातील नातेवाईकांसाठी LIVE',
      en: 'Shahi maroon & gold live stream connecting family everywhere',
    },
    meta: {
      mr: ['4K कॅमेरा', 'डायरेक्ट ऑडिओ', 'शाही बॉर्डर फ्रेम'],
      en: ['4K capture', 'Clean audio mixer feed', 'Shahi ornamental frame'],
    },
    description: {
      mr: 'सप्तपदी, मंगलाष्टके आणि रिसेप्शनचे स्पष्ट थेट प्रक्षेपण. मराठी सुलेखनासह वधू-वरांच्या नावाचे शाही स्क्रीन ग्राफिक्स आणि प्रायव्हेट किंवा पब्लिक लिंकची सोय.',
      en: 'Uninterrupted coverage of Mangalashtaka, Saptapadi, and reception moments with Shahi maroon & gold Marathi calligraphic title banners and crisp soundboard audio.',
    },
    deliverables: {
      mr: ['1920×1080 शाही विवाह ओव्हरले फ्रेम', 'पूर्ण सोहळ्याचे एडिटेड व्हिडिओ रेकॉर्डिंग'],
      en: ['1920×1080 Shahi wedding overlay frame', 'Full edited ceremony recording'],
    },
    image: '/assets/optimized/service-wedding.webp',
    imageAlt:
      'Star Event Live wedding mandap coverage with professional broadcast camcorder on tripod capturing the ceremony',
    imagePosition: 'object-[50%_54%]',
  },
  {
    id: 'birthday',
    index: '05.',
    title: { mr: 'वाढदिवस', en: 'Birthday Celebrations' },
    subtitle: {
      mr: 'कौटुंबिक सोहळ्यासाठी आकर्षक लाईव्ह फ्रेम',
      en: 'Personalized live streams for milestone birthdays',
    },
    meta: {
      mr: ['कस्टम बर्थडे फ्रेम', 'केक कटिंग क्लोजअप', 'फास्ट एडिटिंग'],
      en: ['Custom birthday frame', 'Cake-cutting closeups', 'Fast video edit'],
    },
    description: {
      mr: 'वाढदिवसाचे नाव व शुभेच्छा ग्राफिक्ससह YouTube वर थेट प्रक्षेपण, पूर्ण रेकॉर्डिंग आणि आठवणी जपणारे व्हिडिओ एडिटिंग.',
      en: 'Custom on-screen birthday greetings, warm low-light camera capture for indoor banquets, live guest wishes, and cleanly edited keepsake video delivery.',
    },
    deliverables: {
      mr: ['पर्सनलाइज्ड वाढदिवस ग्राफिक्स', 'पूर्ण रेकॉर्डिंग व शॉर्ट हायलाइट व्हिडिओ'],
      en: ['Personalized birthday screen graphics', 'Full recording & short highlight film'],
    },
    image: '/assets/optimized/service-birthday.webp',
    imageAlt:
      'Star Event Live OBS streaming, editing, and studio audio desk setup for birthday broadcasts and highlight reels',
    imagePosition: 'object-center',
  },
  {
    id: 'other',
    index: '06.',
    title: { mr: 'इतर सर्व कार्यक्रम', en: 'All Other Events' },
    subtitle: {
      mr: 'सांस्कृतिक, धार्मिक, राजकीय व कॉर्पोरेट इव्हेंट्स',
      en: 'Cultural festivals, stage shows, corporate & community gatherings',
    },
    meta: {
      mr: ['स्टेज व LED आउटपुट', 'YouTube Live HD', 'ऑन-साईट टीम'],
      en: ['Stage & LED wall feed', 'YouTube Live HD', 'On-site technical crew'],
    },
    description: {
      mr: 'उद्घाटन सोहळे, कीर्तन-प्रवचन, गणेशोत्सव, शाळा-महाविद्यालयीन स्नेहसंमेलन, सेमिनार आणि सांस्कृतिक कार्यक्रमांसाठी विश्वासार्ह थेट प्रक्षेपण.',
      en: 'Dependable live switching for inaugurations, Kirtan and spiritual discourses, Ganeshotsav programs, college fests, conferences, and large stage productions.',
    },
    deliverables: {
      mr: ['LED वॉलसाठी थेट व्हिडिओ आउटपुट', 'स्पीकर नेम-प्लेट व इव्हेंट टिकर'],
      en: ['Live video feed to venue LED walls', 'Speaker lower-thirds & event announcements'],
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
    name: { mr: 'सिंगल कॅमेरा लाईव्ह', en: 'Essential Single-Cam Live' },
    idealFor: {
      mr: 'वाढदिवस, हळदी समारंभ, छोटे कौटुंबिक व धार्मिक कार्यक्रम',
      en: 'Birthdays, Haldi ceremonies, intimate family & community events',
    },
    priceRange: { mr: '₹6,500 पासून', en: 'From ₹6,500' },
    basePrice: 6500,
    cameras: { mr: '1 हाय-क्वालिटी 4K ब्रॉडकास्ट कॅमेरा', en: '1 High-Quality 4K Broadcast Camera' },
    platforms: { mr: 'YouTube (@stareventlive01) वर LIVE', en: 'Live on YouTube (@stareventlive01)' },
    features: {
      mr: [
        '1080p Full HD थेट प्रक्षेपण व संपूर्ण रेकॉर्डिंग',
        'कस्टम इव्हेंट टायटल व स्क्रीन ग्राफिक्स',
        'डायरेक्ट माईक / साउंड मिक्सर ऑडिओ कनेक्शन',
        'अनुभवी कॅमेरा ऑपरेटर व स्ट्रीमिंग इंजिनिअर',
      ],
      en: [
        '1080p Full HD live stream + full master recording',
        'Custom event title banner & lower-third graphics',
        'Direct soundboard audio feed for clear speech & music',
        'Dedicated camera operator & stream technician',
      ],
    },
  },
  {
    id: 'multi-cam-pro',
    name: { mr: 'मल्टी-कॅमेरा प्रो ब्रॉडकास्ट', en: 'Multi-Cam Pro Broadcast' },
    idealFor: {
      mr: 'लग्न समारंभ, रिसेप्शन, सांस्कृतिक कार्यक्रम व कॉर्पोरेट स्टेज शो',
      en: 'Weddings, receptions, cultural stage shows & corporate launches',
    },
    priceRange: { mr: '₹14,500 पासून', en: 'From ₹14,500' },
    basePrice: 14500,
    cameras: { mr: '2–3 प्रोफेशनल कॅमेरे + लाईव्ह स्विचर', en: '2–3 Pro Cameras + Live Vision Switcher' },
    platforms: { mr: 'YouTube Live 4K + प्रायव्हेट / पब्लिक लिंक', en: 'YouTube Live 4K + Public / Unlisted Link' },
    featured: true,
    features: {
      mr: [
        'लाईव्ह मल्टी-अँगल स्विचिंग (वाइड + क्लोजअप + जिम्बल)',
        'कस्टम मराठी/इंग्रजी टायटल्स, लोगो आणि टिकर ग्राफिक्स',
        'ड्युअल नेटवर्क बॅकअप (अखंडित प्रक्षेपणासाठी)',
        'संपूर्ण कार्यक्रमाचे प्रोफेशनल एडिटिंग व हायलाइट व्हिडिओ',
      ],
      en: [
        'Real-time multi-angle switching (wide, closeup & roaming gimbal)',
        'Custom Marathi/English title overlays, logos & scrolling tickers',
        'Dual-network bonding backup for uninterrupted streaming',
        'Complete post-event video editing + shareable highlight film',
      ],
    },
  },
  {
    id: 'cricket-tournament',
    name: { mr: 'क्रिकेट टूर्नामेंट ब्रॉडकास्ट', en: 'Cricket Tournament Pro' },
    idealFor: {
      mr: 'डे-नाईट क्रिकेट स्पर्धा, ग्रामीण व जिल्हास्तरीय टूर्नामेंट्स',
      en: 'Day-night cricket leagues, district & village tournaments',
    },
    priceRange: { mr: '₹12,000 / दिवस पासून', en: 'From ₹12,000 / day' },
    basePrice: 12000,
    cameras: { mr: '2–4 पिच, बाउंड्री व डगआउट कॅमेरे', en: '2–4 Pitch, Boundary & Dugout Cameras' },
    platforms: { mr: 'YouTube Live + ग्राउंड LED स्क्रीन फीड', en: 'YouTube Live + Ground LED Screen Feed' },
    features: {
      mr: [
        'लाईव्ह बॉल-बाय-बॉल स्कोअरबोर्ड व रन-रेट ग्राफिक्स',
        'चौकार, षटकार, विकेट अॅनिमेशन व स्पॉन्सर जाहिराती',
        'रिप्ले कॅप्चर व मॅच समरी ग्राफिक कार्ड्स',
        'संपूर्ण स्पर्धेसाठी डेडिकेटेड स्कोअरर व ब्रॉडकास्ट टीम',
      ],
      en: [
        'Live ball-by-ball scoreboard, striker stats & run-rate bar',
        'Animated FOUR, SIX, WICKET alerts & sponsor ad slates',
        'Instant action replay & post-match summary scorecards',
        'Dedicated live scorer & full field broadcast crew',
      ],
    },
  },
];

export const ADDON_OPTIONS: AddOnOption[] = [
  {
    id: 'extra-camera',
    label: { mr: 'अतिरिक्त 4K कॅमेरा + ऑपरेटर', en: 'Additional 4K Camera + Operator' },
    price: 3500,
  },
  {
    id: 'drone-feed',
    label: { mr: 'ड्रोन एरियल लाईव्ह फीड', en: 'Drone Aerial Live Feed' },
    price: 4500,
  },
  {
    id: 'led-output',
    label: { mr: 'व्हेन्यू LED वॉल लाईव्ह आउटपुट', en: 'Venue LED Wall Live Output' },
    price: 2500,
  },
  {
    id: 'same-day-edit',
    label: { mr: 'सेम-डे हायलाइट रील एडिटिंग', en: 'Same-Day Highlight Reel Edit' },
    price: 3000,
  },
];

export const CLIENT_OUTCOMES: ClientCaseStudy[] = [
  {
    id: 'premier-cup',
    eventTitle: { mr: 'तालुका डे-नाईट क्रिकेट महासंग्राम', en: 'Taluka Day-Night Cricket Championship' },
    category: { mr: 'क्रिकेट सामने · 3-कॅमेरा सेटअप', en: 'Cricket Tournament · 3-Camera Rig' },
    metric: { mr: '38,400+ थेट दर्शक (4 दिवस)', en: '38,400+ Live Viewers across 4 Days' },
    summary: {
      mr: 'तीन कॅमेरे, बॉल-बाय-बॉल स्कोअरबोर्ड आणि स्थानिक प्रायोजकांच्या स्क्रीन ग्राफिक्ससह YouTube वर एकही सेकंड खंड न पडता 24 सामन्यांचे प्रक्षेपण.',
      en: 'Broadcast 24 consecutive matches on YouTube with zero stream drops, real-time ball-by-ball score overlays, and local sponsor ad integration.',
    },
    attribution: {
      mr: 'संदीप जाधव · स्पर्धा संयोजक, क्रीडा मंडळ',
      en: 'Sandeep Jadhav · Tournament Organizer, Krida Mandal',
    },
  },
  {
    id: 'deshmukh-wedding',
    eventTitle: { mr: 'देशमुख कुटुंब लग्न व हळदी समारंभ', en: 'Deshmukh Family Wedding & Haldi' },
    category: { mr: 'लग्न व हळदी · YouTube Live 4K', en: 'Wedding & Haldi · YouTube Live 4K' },
    metric: { mr: '210+ कुटुंबीय परदेशातून थेट सहभागी', en: '210+ Remote Relatives Joined Live' },
    summary: {
      mr: 'पुणे, मुंबई आणि अमेरिकेतील नातेवाईकांना मंगलाष्टके व हळदी सोहळा स्पष्ट आवाजात व 4K दर्जात पाहता आला; दुसऱ्याच दिवशी एडिटेड व्हिडिओ मिळाला.',
      en: 'Family members in Pune, Mumbai, and the US watched both Haldi and wedding vows with direct mixer audio and received the edited film the next day.',
    },
    attribution: {
      mr: 'राजेंद्र देशमुख · कुटुंब प्रमुख',
      en: 'Rajendra Deshmukh · Family Host',
    },
  },
  {
    id: 'cultural-utsav',
    eventTitle: { mr: 'सार्वजनिक सांस्कृतिक महोत्सव व कीर्तन सोहळा', en: 'Sarvajanik Cultural Festival & Kirtan' },
    category: { mr: 'इतर कार्यक्रम · YouTube Live + LED', en: 'Stage Event · YouTube Live + LED Feed' },
    metric: { mr: 'YouTube वर 6 तास अखंड Full HD LIVE', en: '6-Hour Uninterrupted YouTube HD Live' },
    summary: {
      mr: 'स्टेजवरील प्रमुख पाहुण्यांची नावे, कार्यक्रमाचे वेळापत्रक आणि ग्राउंडवरील दोन LED स्क्रीनवर थेट व्हिडिओ आउटपुट अचूकपणे हाताळले.',
      en: 'Managed dual LED wall feeds alongside uninterrupted YouTube Live broadcasting with live speaker lower-thirds throughout the evening.',
    },
    attribution: {
      mr: 'प्रवीण कुलकर्णी · सांस्कृतिक समिती सचिव',
      en: 'Pravin Kulkarni · Cultural Committee Secretary',
    },
  },
];
