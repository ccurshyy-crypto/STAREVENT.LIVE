import { ArrowUpRight, MonitorPlay } from 'lucide-react';
import {
  EVENT_SERVICES,
  EventCategoryId,
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
  return (
    <section id="services" className="py-20 sm:py-24 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="max-w-3xl space-y-3 mb-12">
          <p className="text-xs sm:text-sm font-medium text-[#FACC15]">
            {UI_COPY.servicesSection.kicker[lang]}
          </p>
          <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-white">
            {UI_COPY.servicesSection.heading[lang]}
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            {UI_COPY.servicesSection.intro[lang]}
          </p>
        </div>

        {/* Asymmetric bento grid for all 6 event types */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {EVENT_SERVICES.map((service) => (
            <article
              key={service.id}
              className={`group bg-[#121216] border border-white/10 hover:border-white/25 rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-colors duration-150 ${
                service.fullSpan
                  ? 'md:col-span-2 lg:col-span-3'
                  : service.wide
                    ? 'md:col-span-2'
                    : ''
              }`}
            >
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
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-white">
                    {service.title[lang]}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-zinc-300">
                    {service.subtitle[lang]}
                  </p>
                </div>

                <p className="text-sm text-zinc-400 leading-relaxed">
                  {service.description[lang]}
                </p>

                <ul className="pt-2 space-y-1.5 border-t border-white/8 text-xs sm:text-sm text-zinc-300">
                  {service.deliverables[lang].map((item) => (
                    <li key={item} className="flex items-start gap-2">
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
            </article>
          ))}
        </div>

        {/* 4 Core Production Capabilities from the banner */}
        <div className="mt-12 pt-10 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-1.5">
            <h4 className="text-sm font-bold text-white">
              {lang === 'mr' ? 'हाय क्वालिटी कॅमेरा सेटअप' : 'High-Quality Camera Setup'}
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {lang === 'mr'
                ? '4K ब्रॉडकास्ट कॅमकॉर्डर्स, टेलिफोटो झूम लेन्स आणि स्थिर ट्रायपॉड व जिम्बल सेटअप.'
                : '4K broadcast camcorders, telephoto pitch zoom lenses, and stabilized gimbal rigs.'}
            </p>
          </div>
          <div className="space-y-1.5">
            <h4 className="text-sm font-bold text-white">
              {lang === 'mr' ? 'प्रोफेशनल टीम द्वारे सेवा' : 'Experienced Production Crew'}
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {lang === 'mr'
                ? 'प्रशिक्षित कॅमेरामॅन, लाईव्ह व्हिजन स्विचर ऑपरेटर आणि ग्राफिक्स तंत्रज्ञांची संपूर्ण टीम.'
                : 'Trained camera operators, live vision mixers, and dedicated on-site stream engineers.'}
            </p>
          </div>
          <div className="space-y-1.5">
            <h4 className="text-sm font-bold text-white">
              {lang === 'mr' ? 'लाईव्ह प्रक्षेपण व रेकॉर्डिंग' : 'Live Broadcast & Archival Recording'}
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {lang === 'mr'
                ? 'YouTube, Facebook आणि Instagram वर एकाच वेळी थेट प्रक्षेपणासोबत सुरक्षित लोकल रेकॉर्डिंग.'
                : 'Simultaneous streaming to YouTube, Facebook, and Instagram paired with lossless local recording.'}
            </p>
          </div>
          <div className="space-y-1.5">
            <h4 className="text-sm font-bold text-white">
              {lang === 'mr' ? 'एडिटिंग व स्क्रीन ग्राफिक्स' : 'Video Editing & Screen Graphics'}
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {lang === 'mr'
                ? 'मराठी व इंग्रजी स्क्रीन टायटल्स, स्कोअरकार्ड, स्पॉन्सर बॅनर्स आणि कार्यक्रमानंतरचे प्रोफेशनल एडिटिंग.'
                : 'Custom Marathi & English lower-thirds, match scoreboards, sponsor slates, and post-event editing.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
