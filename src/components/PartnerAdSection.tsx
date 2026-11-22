import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Instagram,
  MapPin,
  Maximize2,
  Phone,
  Radio,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import { Language, tLang } from '../data/content';
import { ScrollReveal } from './ScrollReveal';

interface PartnerAdSectionProps {
  lang: Language;
  onBookNow: () => void;
  onOpenHaldiOverlay: () => void;
}

interface PartnerSlide {
  id: 'sahyadri' | 'ravi-mobile';
  imagePath: string;
  imageAlt: string;
  brandName: string;
  brandShort: string;
  categoryTag: Record<Language, string>;
  headline: Record<Language, string>;
  description: Record<Language, string>;
  highlights: Array<{
    num: string;
    title: Record<Language, string>;
    detail: Record<Language, string>;
  }>;
  phonePrimary?: { display: string; href: string };
  phoneSecondary?: { display: string; href: string };
  instagram?: { handle: string; url: string };
  address?: Record<Language, string>;
}

const PARTNER_SLIDES: PartnerSlide[] = [
  {
    id: 'sahyadri',
    imagePath: '/assets/aistudio/image_5ff83c99.png',
    imageAlt:
      'Sahyadri Event Live official promotional poster — Haldi, Wedding, Cricket and all other events live on YouTube',
    brandName: 'SAHYADRI EVENT LIVE',
    brandShort: 'Sahyadri Event Live',
    categoryTag: {
      en: 'YouTube Live Broadcast',
      mr: 'YouTube लाईव्ह प्रक्षेपण',
      hi: 'YouTube लाइव प्रसारण',
      gu: 'YouTube લાઇવ પ્રસારણ',
    },
    headline: {
      en: 'Every Celebration Live on Your Screen — Haldi, Wedding & Cricket',
      mr: 'प्रत्येक सोहळा... LIVE तुमच्या स्क्रीनवर! — सह्याद्री इव्हेंट लाईव्ह',
      hi: 'हर समारोह... LIVE आपकी स्क्रीन पर! — सह्याद्री इवेंट लाइव',
      gu: 'દરેક પ્રસંગ... LIVE તમારી સ્ક્રીન પર! — સહ્યાદ્રી ઇવેન્ટ લાઇવ',
    },
    description: {
      en: 'Give every special moment a dedicated live broadcast experience. From colorful Haldi ceremonies and grand Weddings to thrilling Cricket tournaments, enjoy smooth Full HD YouTube Live streaming with custom graphics.',
      mr: 'आपल्या प्रत्येक क्षणाला आता मिळणार लाईव्हचा स्पेशल अनुभव. हळदी, लग्न, क्रिकेट आणि इतर सर्व धमाकेदार इव्हेंट आता लाईव्ह — आम्ही करतो लाईव्ह, तुम्ही फक्त एन्जॉय करा!',
      hi: 'अपने हर खास पल को दें लाइव प्रसारण का स्पेशल अनुभव। हल्दी, शादी, क्रिकेट और अन्य सभी धमाकेदार इवेंट अब एक ही चैनल पर लाइव — हम करते हैं लाइव, आप बस एन्जॉय करें!',
      gu: 'તમારી દરેક ખાસ પળને આપો લાઇવ પ્રસારણનો સ્પેશિયલ અનુભવ. હળદી, લગ્ન, ક્રિકેટ અને અન્ય તમામ શાનદાર ઇવેન્ટ્સ હવે લાઇવ — અમે કરીએ છીએ લાઇવ, તમે બસ એન્જોય કરો!',
    },
    highlights: [
      {
        num: '01',
        title: {
          en: 'Haldi & Wedding Live Telecast',
          mr: 'हळदी व लग्न समारंभ लाईव्ह प्रक्षेपण',
          hi: 'हल्दी और शादी समारोह लाइव प्रसारण',
          gu: 'હળદી અને લગ્ન સમારંભ લાઇવ પ્રસારણ',
        },
        detail: {
          en: 'Multi-camera HD streaming with traditional Haldi & Wedding animated overlays for family worldwide.',
          mr: 'कुटुंब व पाहुण्यांसाठी पारंपरिक हळदी-लग्न अ‍ॅनिमेटेड ओव्हरलेसह मल्टि-कॅमेरा HD लाईव्ह स्ट्रीमिंग.',
          hi: 'परिवार और मेहमानों के लिए पारंपरिक हल्दी-शादी एनिमेटेड ओवरले के साथ मल्टी-कैमरा HD लाइव स्ट्रीमिंग।',
          gu: 'પરિવાર અને મહેમાનો માટે પરંપરાગત હળદી-લગ્ન એનિમેટેડ ઓવરલે સાથે મલ્ટી-કેમેરા HD લાઇવ સ્ટ્રીમિંગ.',
        },
      },
      {
        num: '02',
        title: {
          en: 'Cricket & Local Sports Tournaments',
          mr: 'क्रिकेट व स्थानिक क्रीडा स्पर्धा लाईव्ह',
          hi: 'क्रिकेट और स्थानीय खेल टूर्नामेंट लाइव',
          gu: 'ક્રિકેટ અને સ્થાનિક રમત ટુર્નામેન્ટ લાઇવ',
        },
        detail: {
          en: 'Ball-by-ball scoreboard graphics, stadium replays, and nonstop YouTube Live broadcast coverage.',
          mr: 'बॉल-बाय-बॉल स्कोअरबोर्ड ग्राफिक्स, रिप्ले आणि नॉनस्टॉप YouTube लाईव्ह कव्हरेज.',
          hi: 'बॉल-बाय-बॉल स्कोरबोर्ड ग्राफिक्स, रीप्ले और नॉनस्टॉप YouTube लाइव कवरेज।',
          gu: 'બોલ-બાય-બોલ સ્કોરબોર્ડ ગ્રાફિક્સ, રીપ્લે અને નોનસ્ટોપ YouTube લાઇવ કવરેજ.',
        },
      },
      {
        num: '03',
        title: {
          en: 'All Cultural & Grand Events on One Channel',
          mr: 'सर्व धमाकेदार इव्हेंट एकाच चॅनेलवर लाईव्ह',
          hi: 'सभी शानदार इवेंट एक ही चैनल पर लाइव',
          gu: 'તમામ શાનદાર ઇવેન્ટ્સ એક જ ચેનલ પર લાઇવ',
        },
        detail: {
          en: 'We handle cameras, switching, sound, and stream stability — you simply enjoy every moment.',
          mr: 'आम्ही करतो लाईव्ह, तुम्ही फक्त एन्जॉय करा — कॅमेरा, साऊंड आणि क्लियर YouTube स्ट्रीमची पूर्ण जबाबदारी.',
          hi: 'हम करते हैं लाइव, आप बस एन्जॉय करें — कैमरा, साउंड और क्लियर YouTube स्ट्रीम की पूरी जिम्मेदारी।',
          gu: 'અમે કરીએ છીએ લાઇવ, તમે બસ એન્જોય કરો — કેમેરા, સાઉન્ડ અને ક્લિયર YouTube સ્ટ્રીમની સંપૂર્ણ જવાબદારી.',
        },
      },
    ],
  },
  {
    id: 'ravi-mobile',
    imagePath: '/assets/aistudio/IMG_0985_de6ca52a.PNG',
    imageAlt:
      'रवि मोबाईल रिपेरींग (Ravi Mobile Repairing) — Machine combo touchpad replacement, hardware & software mobile repair, and accessories. Contact 7888041810 / 9011231497, Boradpada, Chargaon, Ambernath, Thane 421503.',
    brandName: 'रवि मोबाईल रिपेरींग · RAVI MOBILE REPAIRING',
    brandShort: 'रवि मोबाईल रिपेरींग',
    categoryTag: {
      en: 'Mobile Repair & Accessories',
      mr: 'मोबाईल रिपेरींग व अ‍ॅक्सेसरीज',
      hi: 'मोबाइल रिपेयरिंग व एक्सेसरीज़',
      gu: 'મોબાઈલ રિપેરિંગ અને એક્સેસરીઝ',
    },
    headline: {
      en: 'Ravi Mobile Repairing — Machine Combo Touchpad, Hardware & Software Service',
      mr: 'रवि मोबाईल रिपेरींग — कॉम्बो टचपॅड मशिनद्वारे बदलून मिळेल!',
      hi: 'रवि मोबाइल रिपेयरिंग — मशीन द्वारा कॉम्बो टचपैड रिप्लेसमेंट और सभी मोबाइल रिपेयर',
      gu: 'રવિ મોબાઈલ રિપેરિંગ — મશીન દ્વારા કોમ્બો ટચપેડ અને તમામ મોબાઈલ રિપેરિંગ',
    },
    description: {
      en: 'Trusted smartphone repair center for precision machine-fitted combo touchpads, complete hardware & software troubleshooting, and genuine mobile accessories at fair prices.',
      mr: 'कॉम्बो चे टचपॅड मशिनद्वारे बदलून मिळेल. सर्व प्रकारचे मोबाईल दुरूस्ती, हार्डवेअर व सॉफ्टवेअर तसेच सर्व मोबाईलच्या अ‍ॅक्सेसरीज योग्य दरात मिळतील.',
      hi: 'कॉम्बो का टचपैड मशीन द्वारा बदला जाएगा। सभी प्रकार की मोबाइल रिपेयरिंग, हार्डवेयर व सॉफ्टवेयर सर्विस और सभी मोबाइल एक्सेसरीज़ उचित दाम पर उपलब्ध हैं।',
      gu: 'કોમ્બોનું ટચપેડ મશીન દ્વારા બદલી આપવામાં આવશે. તમામ પ્રકારના મોબાઈલ રિપેરિંગ, હાર્ડવેર અને સોફ્ટવેર તેમજ તમામ મોબાઈલ એક્સેસરીઝ યોગ્ય દરે મળશે.',
    },
    highlights: [
      {
        num: '01',
        title: {
          en: 'Machine Combo & Touchpad Glass Replacement',
          mr: 'कॉम्बो चे टचपॅड मशिनद्वारे बदलून मिळेल',
          hi: 'मशीन द्वारा कॉम्बो टचपैड रिप्लेसमेंट',
          gu: 'મશીન દ્વારા કોમ્બો ટચપેડ રિપ્લેસમેન્ટ',
        },
        detail: {
          en: 'Clean, factory-finish OCA machine lamination for broken screens and touchpads without replacing the full original display.',
          mr: 'अत्याधुनिक मशिनद्वारे अचूक आणि सुरक्षित टचपॅड व कॉम्बो रिप्लेसमेंट सर्व्हिस.',
          hi: 'आधुनिक मशीन से सुरक्षित और परफेक्ट फिनिश के साथ कॉम्बो टचपैड रिप्लेसमेंट।',
          gu: 'આધુનિક મશીન દ્વારા ચોક્કસ અને સુરક્ષિત ટચપેડ અને કોમ્બો રિપ્લેસમેન્ટ.',
        },
      },
      {
        num: '02',
        title: {
          en: 'All Mobile Hardware & Software Repair',
          mr: 'सर्व प्रकारचे मोबाईल हार्डवेअर व सॉफ्टवेअर दुरूस्ती',
          hi: 'सभी मोबाइल हार्डवेयर और सॉफ्टवेयर रिपेयरिंग',
          gu: 'તમામ મોબાઈલ હાર્ડવેર અને સોફ્ટવેર રિપેરિંગ',
        },
        detail: {
          en: 'Fast diagnosis for charging issues, motherboard IC work, battery replacement, software flashing, and unlocking.',
          mr: 'सर्व ब्रँडच्या मोबाईलसाठी विश्वासार्ह हार्डवेअर, आयसी, बॅटरी व सॉफ्टवेअर दुरूस्ती.',
          hi: 'चार्जिंग, मदरबोर्ड, बैटरी और सॉफ्टवेयर से जुड़ी सभी समस्याओं का भरोसेमंद समाधान।',
          gu: 'ચાર્જિંગ, મધરબોર્ડ, બેટરી અને સોફ્ટવેરને લગતી તમામ સમસ્યાઓનું વિશ્વસનીય સમાધાન.',
        },
      },
      {
        num: '03',
        title: {
          en: 'Mobile Accessories at Reasonable Rates',
          mr: 'सर्व मोबाईल अ‍ॅक्सेसरीज योग्य दरात उपलब्ध',
          hi: 'सभी मोबाइल एक्सेसरीज़ उचित दाम पर',
          gu: 'તમામ મોબાઈલ એક્સેસરીઝ યોગ્ય ભાવે ઉપલબ્ધ',
        },
        detail: {
          en: 'Tempered glass, stylish back covers, fast chargers, cables, Bluetooth earbuds, neckbands & headphones.',
          mr: 'टेम्पर्ड ग्लास, स्टायलिश कव्हर्स, फास्ट चार्जर, हेडफोन्स व इअरबड्स योग्य दरात.',
          hi: 'टेम्पर्ड ग्लास, बैक कवर, फास्ट चार्जर, हेडफोन और ईयरबड्स उचित दाम पर।',
          gu: 'ટેમ્પર્ડ ગ્લાસ, બેક કવર, ફાસ્ટ ચાર્જર, હેડફોન અને ઇયરબડ્સ યોગ્ય ભાવે.',
        },
      },
    ],
    phonePrimary: { display: '7888041810', href: 'tel:+917888041810' },
    phoneSecondary: { display: '9011231497', href: 'tel:+919011231497' },
    instagram: {
      handle: '@ravi.mobile_repairing',
      url: 'https://www.instagram.com/ravi.mobile_repairing/',
    },
    address: {
      en: 'At Boradpada, Post Chargaon, Tal. Ambernath, Dist. Thane - 421503',
      mr: 'पत्ता- मु. बोराडपाडा, पो. चरगाव, ता. अंबरनाथ, जि. ठाणे - ४२१ ५०३',
      hi: 'पता- मु. बोराडपाडा, पो. चरगाव, ता. अंबरनाथ, जि. ठाणे - 421503',
      gu: 'સરનામું- મુ. બોરાડપાડા, પો. ચરગાવ, તા. અંબરનાથ, જિ. થાણે - 421503',
    },
  },
];

export function PartnerAdSection({
  lang,
  onBookNow,
  onOpenHaldiOverlay,
}: PartnerAdSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const activeSlide = PARTNER_SLIDES[activeIndex] ?? PARTNER_SLIDES[0];

  // Auto-rotate between partner advertisement banners smoothly every 5.5 seconds
  useEffect(() => {
    if (isPaused || lightboxOpen) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % PARTNER_SLIDES.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [isPaused, lightboxOpen]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowRight') {
        setActiveIndex((prev) => (prev + 1) % PARTNER_SLIDES.length);
      }
      if (e.key === 'ArrowLeft') {
        setActiveIndex((prev) => (prev - 1 + PARTNER_SLIDES.length) % PARTNER_SLIDES.length);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxOpen]);

  const goPrev = () => {
    setActiveIndex((prev) => (prev - 1 + PARTNER_SLIDES.length) % PARTNER_SLIDES.length);
  };

  const goNext = () => {
    setActiveIndex((prev) => (prev + 1) % PARTNER_SLIDES.length);
  };

  return (
    <section
      id="featured-advertisement"
      aria-label="Featured Partner Advertisements"
      className="py-16 sm:py-24 border-b border-white/10 bg-[#090B12]/36 backdrop-blur-[2px]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#121420]/78 backdrop-blur-md border border-[#FACC15]/25 rounded-2xl p-5 sm:p-8 lg:p-10 space-y-6">
          {/* Top Partner Switcher Strip (shows both ads rotating + lets user jump directly) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div className="flex flex-wrap items-center gap-2">
              {PARTNER_SLIDES.map((slide, idx) => {
                const isSelected = idx === activeIndex;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all duration-200 ${
                      isSelected
                        ? 'bg-[#FACC15]/15 border-[#FACC15] text-[#FACC15] shadow-[0_0_20px_rgba(250,204,21,0.18)]'
                        : 'bg-white/[0.03] border-white/12 text-zinc-400 hover:text-white hover:border-white/25'
                    }`}
                  >
                    <span className="font-mono text-[10px] opacity-80">0{idx + 1}</span>
                    <span>{slide.brandShort}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-zinc-400">
                {activeIndex + 1} / {PARTNER_SLIDES.length} · Auto-Changing
              </span>
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous advertisement"
                className="w-8 h-8 rounded-lg border border-white/15 bg-white/5 hover:bg-white/12 text-zinc-200 hover:text-white flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Next advertisement"
                className="w-8 h-8 rounded-lg border border-white/15 bg-white/5 hover:bg-white/12 text-zinc-200 hover:text-white flex items-center justify-center transition-colors"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left: Smooth Cross-Fading Promotional Advertisement Poster Stage */}
            <ScrollReveal direction="left" className="lg:col-span-5">
              <div className="studio-card-animate relative group rounded-xl overflow-hidden bg-[#09090D] border border-[#FACC15]/35 shadow-[0_20px_48px_rgba(0,0,0,0.58)]">
                {/* Fixed aspect frame so both posters cross-fade cleanly without layout jump */}
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="relative block w-full aspect-[3/4] sm:aspect-[4/5] bg-[#0B0D14] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
                  aria-label={tLang(
                    {
                      en: `View full size ${activeSlide.brandShort} advertisement poster`,
                      mr: `${activeSlide.brandShort} जाहिरात बॅनर पूर्ण आकारात पहा`,
                      hi: `${activeSlide.brandShort} विज्ञापन बैनर पूरा देखें`,
                      gu: `${activeSlide.brandShort} જાહેરાત બેનર પૂર્ણ કદમાં જુઓ`,
                    },
                    lang
                  )}
                >
                  {PARTNER_SLIDES.map((slide, idx) => {
                    const isCurrent = idx === activeIndex;
                    const hasErr = Boolean(failedImages[slide.id]);
                    return (
                      <div
                        key={slide.id}
                        aria-hidden={!isCurrent}
                        className={`absolute inset-0 flex items-center justify-center p-1.5 transition-all duration-700 ease-out ${
                          isCurrent
                            ? 'opacity-100 scale-100 z-10'
                            : 'opacity-0 scale-[1.03] z-0 pointer-events-none'
                        }`}
                      >
                        {!hasErr ? (
                          <img
                            src={slide.imagePath}
                            alt={slide.imageAlt}
                            referrerPolicy="no-referrer"
                            loading={idx === 0 ? 'eager' : 'lazy'}
                            decoding="async"
                            onError={() =>
                              setFailedImages((prev) => ({ ...prev, [slide.id]: true }))
                            }
                            className="w-full h-full object-contain rounded-lg transition-transform duration-500 group-hover:scale-[1.015]"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-[#0F172A] via-[#172554] to-[#09090B] rounded-lg">
                            {slide.id === 'sahyadri' ? (
                              <Radio className="w-10 h-10 text-[#FACC15] mb-3" aria-hidden="true" />
                            ) : (
                              <Smartphone
                                className="w-10 h-10 text-[#FACC15] mb-3"
                                aria-hidden="true"
                              />
                            )}
                            <p className="font-display text-2xl font-extrabold text-white">
                              {slide.brandShort}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Bottom controls overlay on poster */}
                  <div className="absolute bottom-3 inset-x-3 z-20 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/75 backdrop-blur-sm border border-white/15">
                      {PARTNER_SLIDES.map((s, idx) => (
                        <span
                          key={s.id}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            idx === activeIndex ? 'w-6 bg-[#FACC15]' : 'w-2 bg-white/35'
                          }`}
                        />
                      ))}
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg transition-colors group-hover:border-[#FACC15]">
                      <Maximize2 className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
                      <span>
                        {tLang(
                          {
                            en: 'Full Poster',
                            mr: 'पूर्ण बॅनर पहा',
                            hi: 'पूरा बैनर देखें',
                            gu: 'પૂર્ણ બેનર જુઓ',
                          },
                          lang
                        )}
                      </span>
                    </span>
                  </div>
                </button>
              </div>
            </ScrollReveal>

            {/* Right: Synchronized Editorial Details & Direct CTAs for Active Partner Ad */}
            <ScrollReveal
              direction="right"
              delay={100}
              className="lg:col-span-7 flex flex-col justify-between space-y-6"
            >
              <div key={activeSlide.id} className="space-y-6 page-transition-enter">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#FACC15]">
                    <span>
                      {tLang(
                        {
                          en: 'Featured Advertisement',
                          mr: 'विशेष जाहिरात (Advertisement)',
                          hi: 'विशेष विज्ञापन (Advertisement)',
                          gu: 'ખાસ જાહેરાત (Advertisement)',
                        },
                        lang
                      )}
                    </span>
                    <span aria-hidden="true" className="text-zinc-600">
                      ·
                    </span>
                    <span className="text-zinc-200 font-bold">{activeSlide.brandName}</span>
                    <span aria-hidden="true" className="text-zinc-600">
                      ·
                    </span>
                    <span className="text-zinc-400">{activeSlide.categoryTag[lang]}</span>
                  </div>

                  <h2
                    className={`font-display text-2xl sm:text-4xl font-extrabold text-white ${
                      lang !== 'en'
                        ? 'leading-[1.35] tracking-normal'
                        : 'leading-[1.16] tracking-tight'
                    }`}
                  >
                    {activeSlide.headline[lang]}
                  </h2>

                  <p className="text-sm sm:text-base text-zinc-300 leading-[1.72] max-w-2xl">
                    {activeSlide.description[lang]}
                  </p>
                </div>

                {/* Clean Hairline-Separated Feature List */}
                <div className="divide-y divide-white/10 border-y border-white/10">
                  {activeSlide.highlights.map((item) => (
                    <div key={item.num} className="py-4 flex items-start gap-4">
                      <span className="font-mono text-xs font-bold text-[#FACC15] tabular-nums pt-1 shrink-0">
                        {item.num}.
                      </span>
                      <div className="space-y-1">
                        <h3 className="font-display text-sm sm:text-base font-bold text-white leading-snug">
                          {item.title[lang]}
                        </h3>
                        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                          {item.detail[lang]}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {activeSlide.address && (
                  <p className="inline-flex items-start gap-2 text-xs sm:text-sm text-zinc-300">
                    <MapPin className="w-4 h-4 text-[#FACC15] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{activeSlide.address[lang]}</span>
                  </p>
                )}

                {/* Direct Action Buttons tailored to the active Partner Ad */}
                <div className="flex flex-wrap items-center gap-3.5 pt-1">
                  {activeSlide.id === 'sahyadri' ? (
                    <>
                      <button
                        type="button"
                        onClick={onBookNow}
                        className="btn-primary-pro inline-flex items-center gap-2 px-6 py-3.5 text-sm font-bold rounded-xl whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
                      >
                        <span>
                          {tLang(
                            {
                              en: 'Book Live Coverage',
                              mr: 'लाईव्ह कव्हरेज बुक करा',
                              hi: 'लाइव कवरेज बुक करें',
                              gu: 'લાઇવ કવરેજ બુક કરો',
                            },
                            lang
                          )}
                        </span>
                        <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={onOpenHaldiOverlay}
                        className="btn-gold-pro inline-flex items-center gap-2 px-5 py-3.5 text-sm font-bold rounded-xl whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
                      >
                        <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>
                          {tLang(
                            {
                              en: 'Customize Haldi Animated Overlay',
                              mr: 'हळदी अ‍ॅनिमेटेड ओव्हरले कस्टमाईज करा',
                              hi: 'हल्दी एनिमेटेड ओवरले कस्टमाइज़ करें',
                              gu: 'હળદી એનિમેટેડ ઓવરલે કસ્ટમાઇઝ કરો',
                            },
                            lang
                          )}
                        </span>
                      </button>
                    </>
                  ) : (
                    <>
                      {activeSlide.phonePrimary && (
                        <a
                          href={activeSlide.phonePrimary.href}
                          className="btn-primary-pro inline-flex items-center gap-2 px-5 py-3.5 text-sm font-bold rounded-xl whitespace-nowrap shrink-0 tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
                        >
                          <Phone className="w-4 h-4 shrink-0" aria-hidden="true" />
                          <span>Call {activeSlide.phonePrimary.display}</span>
                        </a>
                      )}
                      {activeSlide.phoneSecondary && (
                        <a
                          href={activeSlide.phoneSecondary.href}
                          className="btn-gold-pro inline-flex items-center gap-2 px-5 py-3.5 text-sm font-bold rounded-xl whitespace-nowrap shrink-0 tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
                        >
                          <Phone className="w-4 h-4 shrink-0" aria-hidden="true" />
                          <span>Call {activeSlide.phoneSecondary.display}</span>
                        </a>
                      )}
                      {activeSlide.instagram && (
                        <a
                          href={activeSlide.instagram.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-glass-pro inline-flex items-center gap-2 px-4 py-3.5 text-sm font-bold text-zinc-100 rounded-xl whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
                        >
                          <Instagram className="w-4 h-4 text-[#F472B6] shrink-0" aria-hidden="true" />
                          <span>{activeSlide.instagram.handle}</span>
                        </a>
                      )}
                    </>
                  )}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>

      {/* Fullscreen Poster Lightbox Modal with Prev/Next */}
      {lightboxOpen && !failedImages[activeSlide.id] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${activeSlide.brandShort} Full Advertisement Poster`}
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-black/88 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full max-h-[92vh] flex flex-col items-center gap-3"
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label="Close poster preview"
              className="absolute -top-3 -right-3 z-20 w-10 h-10 rounded-full bg-[#18181D] border border-white/25 text-white hover:border-[#FACC15] hover:text-[#FACC15] flex items-center justify-center transition-colors shadow-xl"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            <img
              src={activeSlide.imagePath}
              alt={activeSlide.imageAlt}
              referrerPolicy="no-referrer"
              className="max-h-[82vh] w-auto max-w-full rounded-xl border border-[#FACC15]/40 shadow-2xl object-contain"
            />

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={goPrev}
                className="btn-glass-pro inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg text-white"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev Ad</span>
              </button>
              <span className="font-mono text-xs text-zinc-300">
                {activeIndex + 1} / {PARTNER_SLIDES.length} · {activeSlide.brandShort}
              </span>
              <button
                type="button"
                onClick={goNext}
                className="btn-glass-pro inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg text-white"
              >
                <span>Next Ad</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
