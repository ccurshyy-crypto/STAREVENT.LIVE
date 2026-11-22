import { useEffect, useState } from 'react';
import { ArrowRight, Maximize2, Radio, Sparkles, X } from 'lucide-react';
import { Language, tLang } from '../data/content';
import { ScrollReveal } from './ScrollReveal';

interface PartnerAdSectionProps {
  lang: Language;
  onBookNow: () => void;
  onOpenHaldiOverlay: () => void;
}

const PARTNER_POSTER_PATH = '/assets/aistudio/image_5ff83c99.png';

const COVERAGE_ITEMS: Array<{
  num: string;
  title: Record<Language, string>;
  detail: Record<Language, string>;
}> = [
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
];

export function PartnerAdSection({
  lang,
  onBookNow,
  onOpenHaldiOverlay,
}: PartnerAdSectionProps) {
  const [posterError, setPosterError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxOpen]);

  return (
    <section
      id="featured-advertisement"
      aria-label="Featured Broadcast Advertisement"
      className="py-16 sm:py-24 border-b border-white/10 bg-[#0B0B0F]/82 backdrop-blur-[2px]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#121216] border border-[#FACC15]/25 rounded-2xl p-5 sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left: Official SAHYADRI EVENT LIVE Promotional Advertisement Poster */}
            <ScrollReveal direction="left" className="lg:col-span-5">
              <div className="studio-card-animate relative group rounded-xl overflow-hidden bg-[#09090D] border border-[#FACC15]/30 shadow-[0_20px_48px_rgba(0,0,0,0.58)]">
                {!posterError ? (
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
                    aria-label={tLang(
                      {
                        en: 'View full size Sahyadri Event Live advertisement poster',
                        mr: 'सह्याद्री इव्हेंट लाईव्ह जाहिरात बॅनर पूर्ण आकारात पहा',
                        hi: 'सह्याद्री इवेंट लाइव विज्ञापन बैनर पूरा देखें',
                        gu: 'સહ્યાદ્રી ઇવેન્ટ લાઇવ જાહેરાત બેનર પૂર્ણ કદમાં જુઓ',
                      },
                      lang
                    )}
                  >
                    <img
                      src={PARTNER_POSTER_PATH}
                      alt="Sahyadri Event Live official promotional poster — Haldi, Wedding, Cricket and all other events live on YouTube"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                      onError={() => setPosterError(true)}
                      className="w-full h-auto block object-contain transition-transform duration-300 group-hover:scale-[1.015]"
                    />
                    <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg transition-colors group-hover:border-[#FACC15]">
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
                  </button>
                ) : (
                  <div className="aspect-[2/3] flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-[#0F172A] via-[#172554] to-[#09090B]">
                    <Radio className="w-10 h-10 text-[#FACC15] mb-3" aria-hidden="true" />
                    <p className="font-display text-2xl font-extrabold text-white">
                      SAHYADRI EVENT LIVE
                    </p>
                    <p className="text-sm text-[#FACC15] mt-2">
                      हळदी · लग्न · क्रिकेट आणि इतर सर्व इव्हेंट
                    </p>
                  </div>
                )}
              </div>
            </ScrollReveal>

            {/* Right: Featured Advertisement Editorial Copy & Direct CTAs */}
            <ScrollReveal direction="right" delay={100} className="lg:col-span-7 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                {/* Unboxed quiet metadata line (Zero-pill discipline) */}
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
                  <span aria-hidden="true" className="text-zinc-600">·</span>
                  <span className="text-zinc-300">SAHYADRI EVENT LIVE</span>
                  <span aria-hidden="true" className="text-zinc-600">·</span>
                  <span className="text-zinc-400">YouTube Live Broadcast</span>
                </div>

                <h2
                  className={`font-display text-2xl sm:text-4xl font-extrabold text-white ${
                    lang !== 'en' ? 'leading-[1.35] tracking-normal' : 'leading-[1.16] tracking-tight'
                  }`}
                >
                  {tLang(
                    {
                      en: 'Every Celebration Live on Your Screen — Haldi, Wedding & Cricket',
                      mr: 'प्रत्येक सोहळा... LIVE तुमच्या स्क्रीनवर! — सह्याद्री इव्हेंट लाईव्ह',
                      hi: 'हर समारोह... LIVE आपकी स्क्रीन पर! — सह्याद्री इवेंट लाइव',
                      gu: 'દરેક પ્રસંગ... LIVE તમારી સ્ક્રીન પર! — સહ્યાદ્રી ઇવેન્ટ લાઇવ',
                    },
                    lang
                  )}
                </h2>

                <p className="text-sm sm:text-base text-zinc-300 leading-[1.72] max-w-2xl">
                  {tLang(
                    {
                      en: 'Give every special moment a dedicated live broadcast experience. From colorful Haldi ceremonies and grand Weddings to thrilling Cricket tournaments, enjoy smooth Full HD YouTube Live streaming with custom graphics.',
                      mr: 'आपल्या प्रत्येक क्षणाला आता मिळणार लाईव्हचा स्पेशल अनुभव. हळदी, लग्न, क्रिकेट आणि इतर सर्व धमाकेदार इव्हेंट आता लाईव्ह — आम्ही करतो लाईव्ह, तुम्ही फक्त एन्जॉय करा!',
                      hi: 'अपने हर खास पल को दें लाइव प्रसारण का स्पेशल अनुभव। हल्दी, शादी, क्रिकेट और अन्य सभी धमाकेदार इवेंट अब एक ही चैनल पर लाइव — हम करते हैं लाइव, आप बस एन्जॉय करें!',
                      gu: 'તમારી દરેક ખાસ પળને આપો લાઇવ પ્રસારણનો સ્પેશિયલ અનુભવ. હળદી, લગ્ન, ક્રિકેટ અને અન્ય તમામ શાનદાર ઇવેન્ટ્સ હવે લાઇવ — અમે કરીએ છીએ લાઇવ, તમે બસ એન્જોય કરો!',
                    },
                    lang
                  )}
                </p>
              </div>

              {/* Clean Hairline-Separated Editorial Feature List */}
              <div className="divide-y divide-white/10 border-y border-white/10">
                {COVERAGE_ITEMS.map((item) => (
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

              {/* Direct Functional Action Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-1">
                <button
                  type="button"
                  onClick={onBookNow}
                  className="cta-btn-animate inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
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
                  className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-semibold text-[#FACC15] bg-[#1B150A] hover:bg-[#271E0D] border border-[#FACC15]/45 rounded-lg transition-all duration-200 hover:-translate-y-0.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
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
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>

      {/* Fullscreen Poster Lightbox Modal */}
      {lightboxOpen && !posterError && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Sahyadri Event Live Full Advertisement Poster"
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-black/88 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full max-h-[92vh] flex flex-col items-center"
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label="Close poster preview"
              className="absolute -top-3 -right-3 z-10 w-10 h-10 rounded-full bg-[#18181D] border border-white/25 text-white hover:border-[#FACC15] hover:text-[#FACC15] flex items-center justify-center transition-colors shadow-xl"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
            <img
              src={PARTNER_POSTER_PATH}
              alt="Sahyadri Event Live full advertisement banner"
              referrerPolicy="no-referrer"
              className="max-h-[88vh] w-auto max-w-full rounded-xl border border-[#FACC15]/40 shadow-2xl object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
}
