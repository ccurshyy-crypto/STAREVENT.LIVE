import { useEffect, useState } from 'react';
import { ArrowRight, ExternalLink, Instagram, Maximize2, Phone, Video, X, Youtube } from 'lucide-react';
import { Language, STUDIO_CONTACT } from '../data/content';

interface StudioSpotlightSectionProps {
  lang: Language;
  onBookNow: () => void;
}

const SPOTLIGHT_PILLARS: Array<{
  index: string;
  title: Record<Language, string>;
  detail: Record<Language, string>;
}> = [
  {
    index: '01.',
    title: { mr: 'लाईव्ह स्ट्रीमिंग', en: 'Live Streaming' },
    detail: {
      mr: '4K व Full HD मल्टी-कॅमेरा स्विचिंग आणि ड्युअल नेटवर्क बॅकअपसह अखंड प्रक्षेपण.',
      en: '4K & Full HD multi-camera vision switching backed by dual-network redundancy.',
    },
  },
  {
    index: '02.',
    title: { mr: 'इव्हेंट कव्हरेज', en: 'Event Coverage' },
    detail: {
      mr: 'लग्न, हळदी, वाढदिवस, सांस्कृतिक व धार्मिक सोहळ्यांचे संपूर्ण व्हिडिओ व ऑडिओ कव्हरेज.',
      en: 'Complete video and clean mixer-audio coverage for weddings, Haldi, birthdays & stage events.',
    },
  },
  {
    index: '03.',
    title: { mr: 'YouTube लाईव्ह', en: 'YouTube Live' },
    detail: {
      mr: 'अधिकृत YouTube (@stareventlive01) चॅनेलवर पब्लिक किंवा प्रायव्हेट लिंकद्वारे थेट प्रक्षेपण.',
      en: 'Stream live on our official YouTube (@stareventlive01) channel or via private family links.',
    },
  },
  {
    index: '04.',
    title: { mr: 'क्रीडा व इतर स्पर्धा', en: 'Sports & More' },
    detail: {
      mr: 'डे-नाईट क्रिकेट व कबड्डी स्पर्धांसाठी रिअल-टाईम स्कोअरबोर्ड, रेड टायमर व स्पॉन्सर ग्राफिक्स.',
      en: 'Day-night Cricket & Kabaddi tournaments with live scoreboards, raid timers & sponsor slates.',
    },
  },
];

export function StudioSpotlightSection({ lang, onBookNow }: StudioSpotlightSectionProps) {
  const [posterError, setPosterError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen]);

  return (
    <section
      id="spotlight"
      className="py-20 sm:py-24 border-b border-white/10 bg-[#09090B]/60 backdrop-blur-[2px]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left: Official Promotional Poster */}
          <div className="lg:col-span-5">
            <figure className="group bg-[#121216] border border-[#FACC15]/25 rounded-2xl p-3 sm:p-4 shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
              {!posterError ? (
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  aria-label={
                    lang === 'mr'
                      ? 'स्टार इव्हेंट लाईव्ह अधिकृत पोस्टर मोठ्या आकारात पहा'
                      : 'View Star Event Live official poster in full screen'
                  }
                  className="relative block w-full aspect-square overflow-hidden rounded-xl bg-[#0B0B0E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
                >
                  <img
                    src={STUDIO_CONTACT.promoPosterPath}
                    alt="Star Event Live promotional poster featuring Bharat Nirguda (9890175727) — Capture, Stream, Share. Your Event, Our Coverage: Live Streaming, Event Coverage, YouTube Live, Sports & More."
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    decoding="async"
                    onError={() => setPosterError(true)}
                    className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
                  />
                  <span className="pointer-events-none absolute right-3 bottom-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/75 border border-white/15 text-xs font-semibold text-zinc-100 opacity-90 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
                    <span>{lang === 'mr' ? 'पूर्ण पहा' : 'Full View'}</span>
                  </span>
                </button>
              ) : (
                <div className="aspect-square rounded-xl bg-gradient-to-br from-[#2B080A] via-[#131317] to-[#0B0F1A] border border-white/10 flex flex-col items-center justify-center p-8 text-center">
                  <Video className="w-10 h-10 text-[#FACC15] mb-3" aria-hidden="true" />
                  <p className="font-display text-2xl font-extrabold text-white">
                    {STUDIO_CONTACT.brand}
                  </p>
                  <p className="text-sm text-zinc-300 mt-2">
                    {lang === 'mr' ? 'कॅप्चर · स्ट्रीम · शेअर' : 'Capture · Stream · Share'}
                  </p>
                  <p className="font-mono text-base font-bold text-[#FACC15] mt-3 tabular-nums">
                    {STUDIO_CONTACT.founderName} · {STUDIO_CONTACT.phoneDisplay}
                  </p>
                </div>
              )}

              <figcaption className="mt-3 px-1 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                <span>
                  {STUDIO_CONTACT.founderName} · {STUDIO_CONTACT.brand}
                </span>
                <span className="font-mono text-[#FACC15] tabular-nums">
                  {STUDIO_CONTACT.phoneDisplay}
                </span>
              </figcaption>
            </figure>
          </div>

          {/* Right: Editorial Brand Story & Capabilities */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-3.5">
              <p className="text-xs sm:text-sm font-medium text-[#FACC15]">
                {lang === 'mr'
                  ? 'कॅप्चर · स्ट्रीम · शेअर · अधिकृत स्टुडिओ प्रोफाइल'
                  : 'Capture · Stream · Share · Official Studio Spotlight'}
              </p>
              <h2
                className={`font-display text-2xl sm:text-4xl font-bold text-white [text-wrap:balance] ${
                  lang === 'mr' ? 'leading-[1.38] tracking-normal' : 'leading-[1.2] tracking-tight'
                }`}
              >
                {lang === 'mr'
                  ? 'तुमचा कार्यक्रम, आमचे विश्वासार्ह थेट कव्हरेज'
                  : 'Your Event, Our Broadcast Coverage'}
              </h2>
              <p className="text-sm sm:text-base text-zinc-300 leading-[1.75] max-w-2xl">
                {lang === 'mr'
                  ? 'भारत निरगुडा यांच्या नेतृत्वाखाली Star Event Live तुमचे प्रत्येक क्रीडा सामने, लग्न-हळदी सोहळे आणि सांस्कृतिक कार्यक्रम प्रोफेशनल कॅमेरा टीम, स्वच्छ ऑडिओ आणि अखंड YouTube लाईव्हसह जगासमोर सादर करते.'
                  : 'Led by Bharat Nirguda, Star Event Live brings broadcast-grade multi-camera rigs, clean mixer audio, and custom live graphics to every sports tournament, wedding ceremony, and community stage across Maharashtra.'}
              </p>
            </div>

            {/* 4 Broadcast Pillars matching the poster */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 pt-6 border-t border-white/10">
              {SPOTLIGHT_PILLARS.map((pillar) => (
                <div key={pillar.index} className="space-y-2">
                  <h3 className="font-display text-base font-bold text-white leading-snug">
                    <span className="font-mono text-sm text-[#FACC15] mr-2 tabular-nums">
                      {pillar.index}
                    </span>
                    {pillar.title[lang]}
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    {pillar.detail[lang]}
                  </p>
                </div>
              ))}
            </div>

            {/* Direct Action Row */}
            <div className="pt-2 flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={onBookNow}
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B]"
              >
                <span>{lang === 'mr' ? 'कार्यक्रम बुक करा' : 'Book Your Coverage'}</span>
                <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              </button>

              <a
                href={STUDIO_CONTACT.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-semibold text-zinc-200 hover:text-white border border-white/15 hover:border-[#EF4444]/60 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
              >
                <Youtube className="w-4 h-4 text-[#EF4444] shrink-0" aria-hidden="true" />
                <span>{STUDIO_CONTACT.youtubeHandle}</span>
                <ExternalLink className="w-3.5 h-3.5 text-zinc-400 shrink-0" aria-hidden="true" />
              </a>

              {STUDIO_CONTACT.instagramAccounts.map((ig) => (
                <a
                  key={ig.handle}
                  href={ig.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-3.5 text-sm font-semibold text-zinc-200 hover:text-white border border-white/15 hover:border-[#F472B6]/60 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
                >
                  <Instagram className="w-4 h-4 text-[#F472B6] shrink-0" aria-hidden="true" />
                  <span>{ig.handle}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400 shrink-0" aria-hidden="true" />
                </a>
              ))}

              <a
                href={STUDIO_CONTACT.phoneHref}
                className="inline-flex items-center gap-2 px-4 py-3.5 text-sm font-mono font-bold text-[#FACC15] hover:text-white transition-colors whitespace-nowrap shrink-0 tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] rounded-lg"
              >
                <Phone className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{STUDIO_CONTACT.phoneDisplay}</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Full-resolution Poster Lightbox Modal */}
      {lightboxOpen && !posterError && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lang === 'mr' ? 'स्टार इव्हेंट लाईव्ह अधिकृत पोस्टर' : 'Star Event Live Official Poster'}
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-black/88 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-[#121216] border border-[#FACC15]/30 rounded-2xl p-3 sm:p-4 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label={lang === 'mr' ? 'बंद करा' : 'Close'}
              className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white flex items-center justify-center shadow-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            <div className="overflow-hidden rounded-xl bg-[#0B0B0E]">
              <img
                src={STUDIO_CONTACT.promoPosterPath}
                alt="Star Event Live official promotional poster — Bharat Nirguda 9890175727"
                referrerPolicy="no-referrer"
                className="w-full h-auto max-h-[80vh] object-contain mx-auto"
              />
            </div>

            <div className="mt-3 px-1 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-300">
              <span>
                {STUDIO_CONTACT.brand} · {STUDIO_CONTACT.founderName}
              </span>
              <a
                href={STUDIO_CONTACT.phoneHref}
                className="font-mono font-bold text-[#FACC15] hover:text-white transition-colors tabular-nums"
              >
                {lang === 'mr' ? 'थेट कॉल:' : 'Direct Hotline:'} {STUDIO_CONTACT.phoneDisplay}
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
