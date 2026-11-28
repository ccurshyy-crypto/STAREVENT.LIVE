import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  MessageCircle,
  MonitorPlay,
  Play,
  Tv,
  X,
} from 'lucide-react';
import { Language, STUDIO_CONTACT } from '../data/content';
import type { KabaddiOverlayThemeId } from '../types/kabaddi';

import royalBlueImg from '../assets/images/kabaddi_theme_royal_blue_1795875995838.jpg';
import silverOceanImg from '../assets/images/kabaddi_theme_silver_ocean_1795875996506.jpg';
import crimsonNoirImg from '../assets/images/kabaddi_theme_crimson_noir_1795875998390.jpg';
import orangeChromeImg from '../assets/images/kabaddi_theme_orange_chrome_1795876000853.jpg';
import starClassicImg from '../assets/images/kabaddi_theme_star_classic_1795876006790.jpg';

interface KabaddiThemeShowcaseItem {
  id: KabaddiOverlayThemeId;
  indexLabel: string;
  name: string;
  swatchPrimary: string;
  swatchSecondary: string;
  imageSrc: string;
  imageAlt: string;
  editionLabel: Record<Language, string>;
  tagline: Record<Language, string>;
  highlights: Record<Language, string[]>;
  whatsappText: string;
}

const KABADDI_THEME_SHOWCASE: readonly KabaddiThemeShowcaseItem[] = [
  {
    id: 'royal-blue',
    indexLabel: '01',
    name: 'Royal Blue Pro',
    swatchPrimary: '#1D4ED8',
    swatchSecondary: '#09090B',
    imageSrc: royalBlueImg,
    imageAlt:
      'Royal Blue Pro Live Kabaddi Broadcast Scoreboard Theme with metallic silver trim, jet-black score chamber, 7-player mat dots, and bottom match timer',
    editionLabel: {
      en: 'Metallic Silver & Royal Blue · Jet-Black Center Scorebox',
      mr: 'मेटॅलिक सिल्व्हर व रॉयल ब्लू · जेट-ब्लॅक सेंटर स्कोअरबॉक्स',
      hi: 'मैटेलिक सिल्वर और रॉयल ब्लू · जेट-ब्लैक सेंटर स्कोरबॉक्स',
      gu: 'મેટાલિક સિલ્વર અને રોયલ બ્લુ · જેટ-બ્લેક સેન્ટર સ્કોરબોક્સ',
    },
    tagline: {
      en: 'Glossy royal blue team wings wrapped in brushed silver trim with a high-contrast black center score chamber, live 30-second raid clock, and docked bottom timer tab.',
      mr: 'ब्रश्ड सिल्व्हर बॉर्डरसह ग्लॉसी रॉयल ब्लू टीम विंग्ज, हाय-कॉन्ट्रास्ट ब्लॅक सेंटर स्कोअर बॉक्स, लाईव्ह 30 सेकंद रेड क्लॉक आणि बॉटम टायमर टॅब.',
      hi: 'ब्रश्ड सिल्वर ट्रिम के साथ ग्लॉसी रॉयल ब्लू टीम विंग्स, हाई-कंट्रास्ट ब्लैक सेंटर स्कोर बॉक्स, लाइव 30-सेकंड रेड क्लॉक और बॉटम टाइमर टैब।',
      gu: 'બ્રશ્ડ સિલ્વર ટ્રિમ સાથે ગ્લોસી રોયલ બ્લુ ટીમ વિંગ્સ, હાઇ-કોન્ટ્રાસ્ટ બ્લેક સેન્ટર સ્કોર બોક્સ, લાઇવ 30-સેકન્ડ રેડ ક્લોક અને બોટમ ટાઇમર ટેબ.',
    },
    highlights: {
      en: [
        '7-Player Mat Dots with Auto Super Tackle Indicator',
        'In-Bar Super Raid, All Out & Do-Or-Die Wipe Animations',
        'OBS Studio & vMix 16:9 Full HD Transparent Ready',
      ],
      mr: [
        '7-प्लेअर मॅट डॉट्स आणि ऑटो सुपर टॅकल इंडिकेटर',
        'इन-बार सुपर रेड, ऑल आऊट आणि डू-ऑर-डाय अ‍ॅनिमेशन',
        'OBS Studio व vMix 16:9 Full HD ट्रान्सपरंट रेडी',
      ],
      hi: [
        '7-प्लेयर मैट डॉट्स और ऑटो सुपर टैकल इंडिकेटर',
        'इन-बार सुपर रेड, ऑल आउट और डू-ऑर-डाई एनीमेशन',
        'OBS Studio व vMix 16:9 Full HD ट्रांसपेरेंट रेडी',
      ],
      gu: [
        '7-પ્લેયર મેટ ડોટ્સ અને ઓટો સુપર ટેકલ ઇન્ડિકેટર',
        'ઇન-બાર સુપર રેડ, ઓલ આઉટ અને ડુ-ઓર-ડાઇ એનિમેશન',
        'OBS Studio અને vMix 16:9 Full HD ટ્રાન્સપરન્ટ રેડી',
      ],
    },
    whatsappText:
      'Hello Star Event Live, I saw the Royal Blue Pro Kabaddi Scoreboard Theme on your home page and want to use it for my live kabaddi broadcast.',
  },
  {
    id: 'silver-navy',
    indexLabel: '02',
    name: 'Silver Ocean',
    swatchPrimary: '#E5E7EB',
    swatchSecondary: '#062B45',
    imageSrc: silverOceanImg,
    imageAlt:
      'Silver Ocean Live Kabaddi Broadcast Scoreboard Theme with brushed chrome team panels, deep ocean navy score basin, and sky-blue trapezoid clock',
    editionLabel: {
      en: 'Brushed Chrome & Deep Ocean Navy · Sky-Blue Time Core',
      mr: 'ब्रश्ड क्रोम व डीप ओशन नेव्ही · स्काय-ब्लू टाइम कोअर',
      hi: 'ब्रश्ड क्रोम और डीप ओशन नेवी · स्काई-ब्लू टाइम कोर',
      gu: 'બ્રશ્ડ ક્રોમ અને ડીપ ઓશન નેવી · સ્કાય-બ્લુ ટાઇમ કોર',
    },
    tagline: {
      en: 'Daylight-legible brushed silver team panels paired with a deep ocean navy score basin and an inverted sky-blue trapezoid clock for clean league broadcasts.',
      mr: 'दिवसाही स्पष्ट दिसणारे ब्रश्ड सिल्व्हर टीम पॅनल्स, डीप ओशन नेव्ही स्कोअर बेसिन आणि स्काय-ब्लू ट्रॅपेझॉइड क्लॉकसह प्रीमियम लीग लूक.',
      hi: 'दिन में भी बिल्कुल साफ दिखने वाले ब्रश्ड सिल्वर टीम पैनल, डीप ओशन नेवी स्कोर बेसिन और स्काई-ब्लू ट्रैपेज़ॉइड क्लॉक के साथ प्रीमियम लीग लुक।',
      gu: 'દિવસમાં પણ સ્પષ્ટ દેખાતા બ્રશ્ડ સિલ્વર ટીમ પેનલ્સ, ડીપ ઓશન નેવી સ્કોર બેસિન અને સ્કાય-બ્લુ ટ્રેપેઝોઇડ ક્લોક સાથે પ્રીમિયમ લીગ લુક.',
    },
    highlights: {
      en: [
        'High-Contrast Silver Chrome Wings for Bright Arenas',
        'Inverted Sky-Blue Match Clock & Live Half Display',
        'Custom Team Color & Player Revival Queue Sync',
      ],
      mr: [
        'ब्राइट अरेना व आउटडोअर मॅचसाठी हाय-कॉन्ट्रास्ट सिल्व्हर विंग्ज',
        'स्काय-ब्लू मॅच क्लॉक आणि लाईव्ह हाफ डिस्प्ले',
        'कस्टम टीम कलर आणि प्लेअर रिव्हायव्हल क्यू सिंक',
      ],
      hi: [
        'ब्राइट एरीना और आउटडोर मैच के लिए हाई-कंट्रास्ट सिल्वर विंग्स',
        'स्काई-ब्लू मैच क्लॉक और लाइव हाफ डिस्प्ले',
        'कस्टम टीम कलर और प्लेयर रिवाइवल क्यू सिंक',
      ],
      gu: [
        'બ્રાઇટ એરેના અને આઉટડોર મેચ માટે હાઇ-કોન્ટ્રાસ્ટ સિલ્વર વિંગ્સ',
        'સ્કાય-બ્લુ મેચ ક્લોક અને લાઇવ હાફ ડિસ્પ્લે',
        'કસ્ટમ ટીમ કલર અને પ્લેયર રિવાઇવલ ક્યૂ સિંક',
      ],
    },
    whatsappText:
      'Hello Star Event Live, I saw the Silver Ocean Kabaddi Scoreboard Theme on your home page and want to use it for my live kabaddi broadcast.',
  },
  {
    id: 'crimson-noir',
    indexLabel: '03',
    name: 'Red & Black Noir',
    swatchPrimary: '#DC2626',
    swatchSecondary: '#111114',
    imageSrc: crimsonNoirImg,
    imageAlt:
      'Red and Black Noir Live Kabaddi Broadcast Scoreboard Theme with crimson outer rails, matte black wings, raised LIVE tab, and white trapezoid TIME clock',
    editionLabel: {
      en: 'Crimson Rail & Carbon Black · Raised LIVE Tab',
      mr: 'क्रिमसन रेल व कार्बन ब्लॅक · रेज्ड LIVE टॅब',
      hi: 'क्रिमसन रेल और कार्बन ब्लैक · रेज़्ड LIVE टैब',
      gu: 'ક્રિમસન રેલ અને કાર્બન બ્લેક · રેઝ્ડ LIVE ટેબ',
    },
    tagline: {
      en: 'Night-arena matte black broadcast bar framed in sweeping crimson borders with a pure white inverted TIME centerpiece and brushed silver base rail.',
      mr: 'नाइट टूर्नामेंटसाठी मॅट ब्लॅक ब्रॉडकास्ट बार — क्रिमसन बॉर्डर, शुद्ध पांढरे TIME क्लॉक आणि ब्रश्ड सिल्व्हर बॉटम रेलसह.',
      hi: 'नाइट टूर्नामेंट के लिए मैट ब्लैक ब्रॉडकास्ट बार — क्रिमसन बॉर्डर, शुद्ध व्हाइट TIME क्लॉक और ब्रश्ड सिल्वर बॉटम रेल के साथ।',
      gu: 'નાઇટ ટુર્નામેન્ટ માટે મેટ બ્લેક બ્રોડકાસ્ટ બાર — ક્રિમસન બોર્ડર, પ્યોર વ્હાઇટ TIME ક્લોક અને બ્રશ્ડ સિલ્વર બોટમ રેલ સાથે.',
    },
    highlights: {
      en: [
        'Raised Crimson LIVE Top Tab & Swept Side Frames',
        'Pure White Inverted Trapezoid Match Timer',
        'Instant Raid Point & Tackle Point In-Bar Wipes',
      ],
      mr: [
        'रेज्ड क्रिमसन LIVE टॉप टॅब व स्वेप्ट साइड फ्रेम्स',
        'प्युअर व्हाइट इनव्हर्टेड ट्रॅपेझॉइड मॅच टायमर',
        'इन्स्टंट रेड पॉइंट व टॅकल पॉइंट इन-बार अ‍ॅनिमेशन',
      ],
      hi: [
        'रेज़्ड क्रिमसन LIVE टॉप टैब और स्वेप्ट साइड फ्रेम्स',
        'प्योर व्हाइट इनवर्टेड ट्रैपेज़ॉइड मैच टाइमर',
        'इंस्टेंट रेड पॉइंट और टैकल पॉइंट इन-बार एनीमेशन',
      ],
      gu: [
        'રેઝ્ડ ક્રિમસન LIVE ટોપ ટેબ અને સ્વેપ્ટ સાઇડ ફ્રેમ્સ',
        'પ્યોર વ્હાઇટ ઇન્વર્ટેડ ટ્રેપેઝોઇડ મેચ ટાઇમર',
        'ઇન્સ્ટન્ટ રેડ પોઇન્ટ અને ટેકલ પોઇન્ટ ઇન-બાર એનિમેશન',
      ],
    },
    whatsappText:
      'Hello Star Event Live, I saw the Red & Black Noir Kabaddi Scoreboard Theme on your home page and want to use it for my live kabaddi broadcast.',
  },
  {
    id: 'saffron-chrome',
    indexLabel: '04',
    name: 'Orange Chrome',
    swatchPrimary: '#F97316',
    swatchSecondary: '#E5E7EB',
    imageSrc: orangeChromeImg,
    imageAlt:
      'Orange Chrome Live Kabaddi Broadcast Scoreboard Theme with raised saffron top clock tab, curved metallic silver shell, and sweeping orange score basin',
    editionLabel: {
      en: 'Saffron Orange & Metallic Chrome · Curved Score Basin',
      mr: 'सॅफ्रॉन ऑरेंज व मेटॅलिक क्रोम · कर्व्ह्ड स्कोअर बेसिन',
      hi: 'सैफ्रॉन ऑरेंज और मैटेलिक क्रोम · कर्व्ड स्कोर बेसिन',
      gu: 'સેફ્રોન ઓરેન્જ અને મેટાલિક ક્રોમ · કર્વ્ડ સ્કોર બેસિન',
    },
    tagline: {
      en: 'Sweeping curved chrome housing topped by a raised saffron clock tab, glossy silver team capsules, and a bold orange-to-gold central score deck.',
      mr: 'कर्व्ह्ड मेटॅलिक क्रोम बॉडी, वर सॅफ्रॉन क्लॉक टॅब, ग्लॉसी सिल्व्हर टीम कॅप्सूल्स आणि आकर्षक ऑरेंज-गोल्ड सेंट्रल स्कोअर डेक.',
      hi: 'कर्व्ड मैटेलिक क्रोम बॉडी, ऊपर सैफ्रॉन क्लॉक टैब, ग्लॉसी सिल्वर टीम कैप्सूल और बोल्ड ऑरेंज-गोल्ड सेंट्रल स्कोर डेक।',
      gu: 'કર્વ્ડ મેટાલિક ક્રોમ બોડી, ઉપર સેફ્રોન ક્લોક ટેબ, ગ્લોસી સિલ્વર ટીમ કેપ્સ્યુલ્સ અને બોલ્ડ ઓરેન્જ-ગોલ્ડ સેન્ટ્રલ સ્કોર ડેક.',
    },
    highlights: {
      en: [
        'Raised Saffron Match Clock & Full-Width Orange Rim',
        'Glossy Silver Team Capsules with Mat Dot Counters',
        'Bold High-Visibility Central Score Basin',
      ],
      mr: [
        'रेज्ड सॅफ्रॉन मॅच क्लॉक व फुल-विड्थ ऑरेंज रिम',
        'ग्लॉसी सिल्व्हर टीम कॅप्सूल्स व मॅट डॉट काउंटर्स',
        'बोल्ड हाय-व्हिजिबिलिटी सेंट्रल स्कोअर बेसिन',
      ],
      hi: [
        'रेज़्ड सैफ्रॉन मैच क्लॉक और फुल-विड्थ ऑरेंज रिम',
        'ग्लॉसी सिल्वर टीम कैप्सूल और मैट डॉट काउंटर्स',
        'बोल्ड हाई-विजिबिलिटी सेंट्रल स्कोर बेसिन',
      ],
      gu: [
        'રેઝ્ડ સેફ્રોન મેચ ક્લોક અને ફુલ-વિડ્થ ઓરેન્જ રિમ',
        'ગ્લોસી સિલ્વર ટીમ કેપ્સ્યુલ્સ અને મેટ ડોટ કાઉન્ટર્સ',
        'બોલ્ડ હાઇ-વિઝિબિલિટી સેન્ટ્રલ સ્કોર બેસિન',
      ],
    },
    whatsappText:
      'Hello Star Event Live, I saw the Orange Chrome Kabaddi Scoreboard Theme on your home page and want to use it for my live kabaddi broadcast.',
  },
  {
    id: 'star-classic',
    indexLabel: '05',
    name: 'Star Classic Gold',
    swatchPrimary: '#8F050E',
    swatchSecondary: '#FFE600',
    imageSrc: starClassicImg,
    imageAlt:
      'Star Classic Gold Live Kabaddi Broadcast Scoreboard Theme with crimson red, midnight navy, and championship gold 5-column layout with All Out and Timeout counters',
    editionLabel: {
      en: 'Championship Crimson, Navy & Gold · 5-Column Pro Bar',
      mr: 'चॅम्पियनशिप क्रिमसन, नेव्ही व गोल्ड · 5-कॉलम प्रो बार',
      hi: 'चैंपियनशिप क्रिमसन, नेवी और गोल्ड · 5-कॉलम प्रो बार',
      gu: 'ચેમ્પિયનશિપ ક્રિમસન, નેવી અને ગોલ્ડ · 5-કોલમ પ્રો બાર',
    },
    tagline: {
      en: 'Signature Star Event Live 5-column championship kabaddi scoreboard displaying live All Outs, Timeouts, active Raider beacon, and full match stats.',
      mr: 'STAR EVENT LIVE ची सिग्नेचर 5-कॉलम चॅम्पियनशिप कबड्डी स्कोअरबोर्ड थीम — ऑल आऊट, टाइमआऊट, सक्रिय रेडर आणि पूर्ण मॅच स्टॅट्ससह.',
      hi: 'STAR EVENT LIVE की सिग्नेचर 5-कॉलम चैंपियनशिप कबड्डी स्कोरबोर्ड थीम — ऑल आउट, टाइमआउट, एक्टिव रेडर और फुल मैच स्टैट्स के साथ।',
      gu: 'STAR EVENT LIVE ની સિગ્નેચર 5-કોલમ ચેમ્પિયનશિપ કબડ્ડી સ્કોરબોર્ડ થીમ — ઓલ આઉટ, ટાઇમઆઉટ, એક્ટિવ રેડર અને ફુલ મેચ સ્ટેટ્સ સાથે.',
    },
    highlights: {
      en: [
        'Dedicated All-Out (AO) & Timeout (TO) Live Counters',
        'Active Raider Gold Beacon & 30s Raid Timer',
        'Versus Card & Full Match Summary Graphic Sync',
      ],
      mr: [
        'डेडिकेटेड ऑल-आऊट (AO) व टाइमआऊट (TO) काउंटर्स',
        'अ‍ॅक्टिव्ह रेडर गोल्ड बीकन व 30s रेड टायमर',
        'व्हर्सेस कार्ड व फुल मॅच समरी ग्राफिक सिंक',
      ],
      hi: [
        'डेडिकेटेड ऑल-आउट (AO) और टाइमआउट (TO) काउंटर्स',
        'एक्टिव रेडर गोल्ड बीकन और 30s रेड टाइमर',
        'वर्सेस कार्ड और फुल मैच समरी ग्राफिक सिंक',
      ],
      gu: [
        'ડેડિકેટેડ ઓલ-આઉટ (AO) અને ટાઇમઆઉટ (TO) કાઉન્ટર્સ',
        'એક્ટિવ રેડર ગોલ્ડ બીકન અને 30s રેડ ટાઇમર',
        'વર્સેસ કાર્ડ અને ફુલ મેચ સમરી ગ્રાફિક સિંક',
      ],
    },
    whatsappText:
      'Hello Star Event Live, I saw the Star Classic Gold Kabaddi Scoreboard Theme on your home page and want to use it for my live kabaddi broadcast.',
  },
];

interface KabaddiThemesShowcaseSectionProps {
  lang: Language;
  onOpenKabaddi: (themeId?: KabaddiOverlayThemeId) => void;
}

export function KabaddiThemesShowcaseSection({
  lang,
  onOpenKabaddi,
}: KabaddiThemesShowcaseSectionProps) {
  const [activeZoomIndex, setActiveZoomIndex] = useState<number | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const activeZoom =
    activeZoomIndex !== null ? KABADDI_THEME_SHOWCASE[activeZoomIndex] : null;

  useEffect(() => {
    if (activeZoomIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveZoomIndex(null);
      } else if (e.key === 'ArrowRight') {
        setActiveZoomIndex((prev) =>
          prev === null ? null : (prev + 1) % KABADDI_THEME_SHOWCASE.length
        );
      } else if (e.key === 'ArrowLeft') {
        setActiveZoomIndex((prev) =>
          prev === null
            ? null
            : (prev - 1 + KABADDI_THEME_SHOWCASE.length) %
              KABADDI_THEME_SHOWCASE.length
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeZoomIndex]);

  const kickerText =
    lang === 'mr'
      ? 'कबड्डी लाईव्ह ब्रॉडकास्ट थीम्स · 5 प्रो स्कोअरबोर्ड डिझाइन्स · OBS व vMix रेडी'
      : lang === 'hi'
        ? 'कबड्डी लाइव ब्रॉडकास्ट थीम्स · 5 प्रो स्कोरबोर्ड डिज़ाइन्स · OBS व vMix रेडी'
        : lang === 'gu'
          ? 'કબડ્ડી લાઇવ બ્રોડકાસ્ટ થીમ્સ · 5 પ્રો સ્કોરબોર્ડ ડિઝાઇન્સ · OBS અને vMix રેડી'
          : 'Live Kabaddi Broadcast Themes · 5 Pro Scoreboard Designs · OBS & vMix Ready';

  const headingText =
    lang === 'mr'
      ? '5 प्रो कबड्डी लाईव्ह स्कोअरबोर्ड थीम्स'
      : lang === 'hi'
        ? '5 प्रो कबड्डी लाइव स्कोरबोर्ड थीम्स'
        : lang === 'gu'
          ? '5 પ્રો કબડ્ડી લાઇવ સ્કોરબોર્ડ થીમ્સ'
          : '5 Pro Kabaddi Live Scoreboard Themes';

  const subcopyText =
    lang === 'mr'
      ? 'STAR EVENT LIVE कबड्डी सॉफ्टवेअरमधील सर्व 5 नवीन ब्रॉडकास्ट स्कोअरबोर्ड थीम्स पहा — Royal Blue, Silver Ocean, Red & Black, Orange Chrome आणि Star Classic Gold. एक क्लिकमध्ये लाईव्ह स्ट्रीमसाठी वापरा.'
      : lang === 'hi'
        ? 'STAR EVENT LIVE कबड्डी सॉफ्टवेयर में जोड़ी गई सभी 5 प्रो ब्रॉडकास्ट स्कोरबोर्ड थीम्स देखें — Royal Blue, Silver Ocean, Red & Black, Orange Chrome और Star Classic Gold। एक क्लिक में लाइव स्ट्रीम पर चलाएं।'
        : lang === 'gu'
          ? 'STAR EVENT LIVE કબડ્ડી સોફ્ટવેરમાં ઉમેરાયેલી તમામ 5 પ્રો બ્રોડકાસ્ટ સ્કોરબોર્ડ થીમ્સ જુઓ — Royal Blue, Silver Ocean, Red & Black, Orange Chrome અને Star Classic Gold.'
          : 'Explore all 5 live Kabaddi broadcast scoreboard themes built inside Star Event Live — Royal Blue, Silver Ocean, Red & Black Noir, Orange Chrome, and Star Classic Gold. Launch any theme live in one click.';

  const useThemeLabel =
    lang === 'mr'
      ? 'लाईव्ह थीम वापरा'
      : lang === 'hi'
        ? 'लाइव थीम चलाएं'
        : lang === 'gu'
          ? 'લાઇવ થીમ વાપરો'
          : 'Use Theme Live';

  const previewLabel =
    lang === 'mr'
      ? 'HD झूम'
      : lang === 'hi'
        ? 'HD ज़ूम'
        : lang === 'gu'
          ? 'HD ઝૂમ'
          : 'HD Preview';

  const whatsappLabel =
    lang === 'mr'
      ? 'WhatsApp'
      : lang === 'hi'
        ? 'WhatsApp'
        : lang === 'gu'
          ? 'WhatsApp'
          : 'WhatsApp';

  const featuredThemes = KABADDI_THEME_SHOWCASE.slice(0, 2);
  const secondaryThemes = KABADDI_THEME_SHOWCASE.slice(2);

  const renderThemeCard = (
    theme: KabaddiThemeShowcaseItem,
    globalIndex: number,
    featured: boolean
  ) => {
    const whatsappHref = `https://wa.me/${STUDIO_CONTACT.whatsappNumber}?text=${encodeURIComponent(
      theme.whatsappText
    )}`;

    return (
      <article
        key={theme.id}
        className="group relative rounded-2xl overlay-home-card border border-[#FFE600]/45 hover:border-[#FFE600] overflow-hidden flex flex-col justify-between transition-transform duration-200 hover:-translate-y-1 shadow-[0_20px_48px_rgba(0,0,0,0.58)]"
      >
        {/* Top Header Bar */}
        <div className="overlay-home-header px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2.5">
            <span className="font-mono text-sm font-black text-[#FFE600] tabular-nums shrink-0">
              {theme.indexLabel}.
            </span>
            <h3 className="font-display text-base sm:text-lg font-black text-white tracking-tight truncate">
              {theme.name}
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1" aria-hidden="true">
              <span
                className="w-3 h-3 rounded-sm border border-white/50"
                style={{ backgroundColor: theme.swatchPrimary }}
              />
              <span
                className="w-3 h-3 rounded-sm border border-white/50"
                style={{ backgroundColor: theme.swatchSecondary }}
              />
            </span>
            <span className="font-mono text-[11px] font-bold text-[#FFE600] whitespace-nowrap">
              16:9 HD
            </span>
          </div>
        </div>

        {/* Image + Content Body */}
        <div className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col justify-between">
          <div className="space-y-3.5">
            {/* Clickable 16:9 Broadcast Theme Image */}
            <button
              type="button"
              onClick={() => setActiveZoomIndex(globalIndex)}
              aria-label={`View ${theme.name} full HD broadcast preview`}
              className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/15 bg-[#070B22] block text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600]"
            >
              {!failedImages[theme.id] ? (
                <img
                  src={theme.imageSrc}
                  alt={theme.imageAlt}
                  referrerPolicy="no-referrer"
                  loading="eager"
                  decoding="async"
                  onError={() =>
                    setFailedImages((prev) => ({ ...prev, [theme.id]: true }))
                  }
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                <div
                  className="w-full h-full flex flex-col items-center justify-center gap-2 px-4 text-center"
                  style={{
                    background: `linear-gradient(135deg, ${theme.swatchPrimary} 0%, ${theme.swatchSecondary} 100%)`,
                  }}
                >
                  <MonitorPlay
                    className="w-9 h-9 text-[#FFE600]"
                    aria-hidden="true"
                  />
                  <span className="font-display text-base font-black text-white">
                    {theme.name}
                  </span>
                </div>
              )}

              {/* Subtle bottom contrast scrim + zoom affordance */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/70 via-black/25 to-transparent"
              />
              <span
                aria-hidden="true"
                className="absolute top-2.5 right-2.5 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-black/75 border border-white/25 text-[#FFE600]"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </span>
            </button>

            {/* Clean Unboxed Metadata & Description */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[#FFE600]/95">
                {theme.editionLabel[lang]}
              </p>
              <p
                className={`${
                  featured ? 'text-xs sm:text-sm' : 'text-xs sm:text-[13px]'
                } text-rose-50/90 leading-relaxed`}
              >
                {theme.tagline[lang]}
              </p>
            </div>

            {/* Clean Unboxed Feature Specs */}
            <ul className="pt-3 border-t border-white/10 space-y-1.5 text-xs text-rose-50/90">
              {theme.highlights[lang].map((point) => (
                <li key={point} className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className="text-[#FFE600] font-black leading-4"
                  >
                    ·
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Working Action Row */}
          <div className="pt-3 border-t border-[#FFE600]/20 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenKabaddi(theme.id)}
              className="btn-gold-pro flex-1 min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black text-[#070B28] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Play className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{useThemeLabel}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveZoomIndex(globalIndex)}
              className="btn-glass-pro min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600]"
            >
              <Maximize2
                className="w-3.5 h-3.5 text-[#FFE600] shrink-0"
                aria-hidden="true"
              />
              <span>{previewLabel}</span>
            </button>

            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary-pro min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600]"
            >
              <MessageCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{whatsappLabel}</span>
            </a>
          </div>
        </div>
      </article>
    );
  };

  return (
    <section
      id="kabaddi-themes"
      aria-labelledby="kabaddi-themes-heading"
      className="relative py-10 sm:py-14 border-b border-[#FFE600]/30"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        {/* Section Banner Header */}
        <div className="relative overflow-hidden rounded-2xl overlay-home-card p-5 sm:p-7 text-center space-y-2.5 shadow-[0_20px_54px_rgba(0,0,0,0.55)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FFE600]/80 to-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden"
          >
            <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-[#FFE600] to-[#EF1A1A] topbar-beam-sweep" />
          </div>

          <p className="text-xs font-semibold tracking-wide text-[#FFE600]">
            {kickerText}
          </p>

          <h2
            id="kabaddi-themes-heading"
            className="font-display text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.15] text-white [text-wrap:balance]"
          >
            {headingText}
          </h2>

          <p className="text-xs sm:text-base text-rose-100/90 max-w-3xl mx-auto leading-relaxed">
            {subcopyText}
          </p>
        </div>

        {/* Marquee Row: 2 Large Featured Kabaddi Themes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-stretch">
          {featuredThemes.map((theme, idx) => renderThemeCard(theme, idx, true))}
        </div>

        {/* Secondary Row: 3 Additional Pro Kabaddi Themes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 items-stretch">
          {secondaryThemes.map((theme, idx) =>
            renderThemeCard(theme, idx + featuredThemes.length, false)
          )}
        </div>

        {/* Bottom Kabaddi Broadcast Capabilities Proof Strip */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl bg-[#070B28]/80 border border-[#FFE600]/25 px-4 sm:px-6 py-3.5 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2.5 gap-y-1 text-xs sm:text-sm text-rose-50/90">
            <Tv className="w-4 h-4 text-[#FFE600] shrink-0" aria-hidden="true" />
            <span className="font-bold text-white">All 5 Kabaddi Themes Included</span>
            <span aria-hidden="true" className="text-[#FFE600]/60">
              ·
            </span>
            <span>30s Raid Clock · 7-Player Mat Dots · Super Raid &amp; All Out Wipes</span>
          </div>

          <button
            type="button"
            onClick={() => onOpenKabaddi()}
            className="text-xs sm:text-sm font-extrabold text-[#FFE600] hover:text-white transition-colors whitespace-nowrap underline underline-offset-4"
          >
            {lang === 'mr'
              ? 'कबड्डी कंट्रोल स्टुडिओ उघडा →'
              : lang === 'hi'
                ? 'कबड्डी कंट्रोल स्टूडियो खोलें →'
                : lang === 'gu'
                  ? 'કબડ્ડી કંટ્રોલ સ્ટુડિયો ખોલો →'
                  : 'Open Kabaddi Control Studio →'}
          </button>
        </div>
      </div>

      {/* Fullscreen HD Lightbox Modal with Prev / Next Theme Switching */}
      {activeZoom && activeZoomIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activeZoom.name}
          onClick={() => setActiveZoomIndex(null)}
          className="fixed inset-0 z-50 bg-black/92 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl bg-[#090C24] border border-[#FFE600]/55 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-base sm:text-xl font-black text-white truncate">
                  {activeZoom.indexLabel}. {activeZoom.name}
                </p>
                <p className="text-xs text-[#FFE600]/90 truncate">
                  {activeZoom.editionLabel[lang]}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveZoomIndex(null)}
                aria-label="Close Kabaddi theme preview"
                className="w-10 h-10 rounded-xl bg-[#E11D1D] hover:bg-[#B91C1C] text-white flex items-center justify-center transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/15 bg-black">
              <img
                src={activeZoom.imageSrc}
                alt={activeZoom.imageAlt}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />

              <button
                type="button"
                onClick={() =>
                  setActiveZoomIndex(
                    (activeZoomIndex - 1 + KABADDI_THEME_SHOWCASE.length) %
                      KABADDI_THEME_SHOWCASE.length
                  )
                }
                aria-label="Previous Kabaddi theme"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-black/75 hover:bg-black border border-white/25 text-white flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveZoomIndex(
                    (activeZoomIndex + 1) % KABADDI_THEME_SHOWCASE.length
                  )
                }
                aria-label="Next Kabaddi theme"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-black/75 hover:bg-black border border-white/25 text-white flex items-center justify-center transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="space-y-1 max-w-xl">
                <p className="text-xs sm:text-sm text-rose-100/90">
                  {activeZoom.tagline[lang]}
                </p>
                <p className="text-xs font-mono text-zinc-400 tabular-nums">
                  Theme {activeZoomIndex + 1} / {KABADDI_THEME_SHOWCASE.length}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const chosenId = activeZoom.id;
                  setActiveZoomIndex(null);
                  onOpenKabaddi(chosenId);
                }}
                className="btn-gold-pro min-h-[42px] inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-black text-[#070B28] rounded-xl whitespace-nowrap"
              >
                <Play className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{useThemeLabel}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
