import { useEffect, useState } from 'react';
import { ArrowUpRight, Maximize2, MonitorPlay, Video, X } from 'lucide-react';
import {
  EVENT_SERVICES,
  EventCategoryId,
  EventService,
  Language,
  UI_COPY,
} from '../data/content';

interface ServicesSectionProps {
  lang: Language;
  onPreviewEvent: (mode: 'kabaddi' | 'haldi') => void;
  onBookEvent: (category: EventCategoryId) => void;
}

export function ServicesSection({
  lang,
  onPreviewEvent,
  onBookEvent,
}: ServicesSectionProps) {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [lightboxService, setLightboxService] = useState<EventService | null>(null);

  useEffect(() => {
    if (!lightboxService) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxService(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxService]);

  const featuredServices = EVENT_SERVICES.filter((s) => Boolean(s.image));
  const additionalServices = EVENT_SERVICES.filter((s) => !s.image);

  const renderCardBody = (service: EventService) => (
    <>
      <div className="space-y-4">
        {/* Clean editorial index + unboxed metadata */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
          <span className="font-mono font-semibold text-[#FACC15] tabular-nums">
            {service.index}
          </span>
          <div className="flex flex-wrap items-center gap-1.5 text-zinc-400">
            {service.meta[lang].map((item, idx) => (
              <span key={item} className="inline-flex items-center gap-1.5">
                {idx > 0 && (
                  <span aria-hidden="true" className="text-zinc-600">
                    ·
                  </span>
                )}
                <span>{item}</span>
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-display text-xl sm:text-2xl font-bold text-white leading-[1.38]">
            {service.title[lang]}
          </h3>
          <p className="mt-1.5 text-sm font-medium text-zinc-300 leading-relaxed">
            {service.subtitle[lang]}
          </p>
        </div>

        <p className="text-sm text-zinc-400 leading-[1.72]">
          {service.description[lang]}
        </p>

        <ul className="pt-3 space-y-2.5 border-t border-white/8 text-xs sm:text-sm text-zinc-300 leading-relaxed">
          {service.deliverables[lang].map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <span aria-hidden="true" className="text-[#EF4444] font-bold">
                —
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action row */}
      <div className="mt-6 pt-4 border-t border-white/8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onBookEvent(service.id)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
        >
          <span>{UI_COPY.servicesSection.selectBtn[lang]}</span>
          <ArrowUpRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        </button>

        {service.previewMode && (
          <button
            type="button"
            onClick={() => onPreviewEvent(service.previewMode!)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:text-white border border-white/12 hover:border-white/30 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
          >
            <MonitorPlay className="w-3.5 h-3.5 text-[#FACC15] shrink-0" aria-hidden="true" />
            <span>{UI_COPY.servicesSection.previewBtn[lang]}</span>
          </button>
        )}
      </div>
    </>
  );

  return (
    <section id="services" className="py-20 sm:py-24 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="max-w-3xl space-y-3.5 mb-12">
          <p className="text-xs sm:text-sm font-medium text-[#FACC15]">
            {UI_COPY.servicesSection.kicker[lang]}
          </p>
          <h2
            className={`font-display text-2xl sm:text-4xl font-bold text-white ${
              lang === 'mr' ? 'leading-[1.38] tracking-normal' : 'leading-[1.2] tracking-tight'
            }`}
          >
            {UI_COPY.servicesSection.heading[lang]}
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 leading-[1.72]">
            {UI_COPY.servicesSection.intro[lang]}
          </p>
        </div>

        {/* All 6 Event Services with real on-site & studio photography */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredServices.map((service) => {
            const hasFailed = Boolean(failedImages[service.id]);
            const isContain = service.imageFit === 'contain';
            return (
              <article
                key={service.id}
                className="group bg-[#121216] border border-white/10 hover:border-[#FACC15]/35 rounded-2xl overflow-hidden flex flex-col transition-colors duration-150"
              >
                {/* Real On-Site / Studio Photo */}
                {service.image && (
                  <div
                    className={`relative aspect-[16/10] w-full overflow-hidden border-b border-white/10 ${
                      isContain ? 'bg-black' : 'bg-[#0B0B0E]'
                    }`}
                  >
                    {!hasFailed ? (
                      <button
                        type="button"
                        onClick={() => setLightboxService(service)}
                        aria-label={
                          lang === 'mr'
                            ? `${service.title.mr} लाईव्ह सेटअप फोटो मोठ्या आकारात पहा`
                            : `View ${service.title.en} live setup photo in full size`
                        }
                        className="relative block w-full h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FACC15]"
                      >
                        <img
                          src={service.image}
                          alt={service.imageAlt || service.title[lang]}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          decoding="async"
                          onError={() =>
                            setFailedImages((prev) => ({ ...prev, [service.id]: true }))
                          }
                          className={`w-full h-full ${
                            isContain
                              ? 'object-contain'
                              : `object-cover ${service.imagePosition || 'object-center'}`
                          } transition-transform duration-300 ease-out group-hover:scale-[1.03]`}
                        />
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent"
                        />
                        <span className="pointer-events-none absolute left-4 bottom-3 font-mono text-xs font-semibold text-zinc-100 drop-shadow">
                          {service.index} {service.title[lang]}
                        </span>
                        <span className="pointer-events-none absolute right-3 bottom-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/70 border border-white/15 text-[11px] font-semibold text-zinc-100 opacity-90 group-hover:opacity-100 transition-opacity">
                          <Maximize2 className="w-3 h-3 text-[#FACC15]" aria-hidden="true" />
                          <span>{lang === 'mr' ? 'पूर्ण फोटो' : 'Full Photo'}</span>
                        </span>
                      </button>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#230B0D] via-[#131317] to-[#0B0F1A] flex flex-col items-center justify-center p-6 text-center">
                        <Video className="w-8 h-8 text-[#FACC15] mb-2" aria-hidden="true" />
                        <p className="font-display text-base font-bold text-white">
                          {service.title[lang]}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-6 flex-1 flex flex-col justify-between">
                  {renderCardBody(service)}
                </div>
              </article>
            );
          })}
        </div>

        {additionalServices.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {additionalServices.map((service) => (
              <article
                key={service.id}
                className="group bg-[#121216] border border-white/10 hover:border-white/25 rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-colors duration-150"
              >
                {renderCardBody(service)}
              </article>
            ))}
          </div>
        )}

        {/* 4 Core Production Capabilities from the banner */}
        <div className="mt-12 pt-10 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-white leading-snug">
              {lang === 'mr' ? 'हाय क्वालिटी कॅमेरा सेटअप' : 'High-Quality Camera Setup'}
            </h4>
            <p className="text-xs sm:text-[13px] text-zinc-400 leading-relaxed">
              {lang === 'mr'
                ? '4K ब्रॉडकास्ट कॅमकॉर्डर्स, टेलिफोटो झूम लेन्स आणि स्थिर ट्रायपॉड व जिम्बल सेटअप.'
                : '4K broadcast camcorders, telephoto pitch zoom lenses, and stabilized gimbal rigs.'}
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-white leading-snug">
              {lang === 'mr' ? 'प्रोफेशनल टीम द्वारे सेवा' : 'Experienced Production Crew'}
            </h4>
            <p className="text-xs sm:text-[13px] text-zinc-400 leading-relaxed">
              {lang === 'mr'
                ? 'प्रशिक्षित कॅमेरामॅन, लाईव्ह व्हिजन स्विचर ऑपरेटर आणि ग्राफिक्स तंत्रज्ञांची संपूर्ण टीम.'
                : 'Trained camera operators, live vision mixers, and dedicated on-site stream engineers.'}
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-white leading-snug">
              {lang === 'mr' ? 'लाईव्ह प्रक्षेपण व रेकॉर्डिंग' : 'Live Broadcast & Archival Recording'}
            </h4>
            <p className="text-xs sm:text-[13px] text-zinc-400 leading-relaxed">
              {lang === 'mr'
                ? 'YouTube (@stareventlive01) वर अखंडित 4K / Full HD थेट प्रक्षेपणासोबत सुरक्षित लोकल रेकॉर्डिंग.'
                : 'Uninterrupted 4K / Full HD streaming on YouTube (@stareventlive01) paired with lossless local recording.'}
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-white leading-snug">
              {lang === 'mr' ? 'एडिटिंग व स्क्रीन ग्राफिक्स' : 'Video Editing & Screen Graphics'}
            </h4>
            <p className="text-xs sm:text-[13px] text-zinc-400 leading-relaxed">
              {lang === 'mr'
                ? 'मराठी व इंग्रजी स्क्रीन टायटल्स, स्कोअरकार्ड, स्पॉन्सर बॅनर्स आणि कार्यक्रमानंतरचे प्रोफेशनल एडिटिंग.'
                : 'Custom Marathi & English lower-thirds, match scoreboards, sponsor slates, and post-event editing.'}
            </p>
          </div>
        </div>
      </div>

      {/* Full-size Photo Lightbox Modal */}
      {lightboxService && lightboxService.image && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightboxService.title[lang]}
          onClick={() => setLightboxService(null)}
          className="fixed inset-0 z-50 bg-black/88 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full bg-[#121216] border border-[#FACC15]/30 rounded-2xl p-3 sm:p-4 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setLightboxService(null)}
              aria-label={lang === 'mr' ? 'बंद करा' : 'Close'}
              className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white flex items-center justify-center shadow-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            <div className="overflow-hidden rounded-xl bg-[#0B0B0E]">
              <img
                src={lightboxService.image}
                alt={lightboxService.imageAlt || lightboxService.title[lang]}
                referrerPolicy="no-referrer"
                className="w-full h-auto max-h-[80vh] object-contain mx-auto"
              />
            </div>

            <div className="mt-3 px-1 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-300">
              <span>
                <span className="font-mono text-[#FACC15] font-semibold mr-1.5">
                  {lightboxService.index}
                </span>
                {lightboxService.title[lang]} · {lightboxService.subtitle[lang]}
              </span>
              <button
                type="button"
                onClick={() => {
                  const categoryId = lightboxService.id;
                  setLightboxService(null);
                  onBookEvent(categoryId);
                }}
                className="font-semibold text-[#FACC15] hover:text-white transition-colors whitespace-nowrap"
              >
                {UI_COPY.servicesSection.selectBtn[lang]} →
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
