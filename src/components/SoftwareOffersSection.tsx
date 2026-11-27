import { useState } from 'react';
import { MessageCircle, MonitorPlay, Phone, Sparkles } from 'lucide-react';
import { Language, STUDIO_CONTACT } from '../data/content';

interface SoftwareOfferItem {
  id: string;
  name: string;
  imagePath: string;
  originalPrice: number;
  offerPrice: number;
  savingsPercent: number;
  tagLine: Record<Language, string>;
  highlights: string[];
  featured?: boolean;
}

const SOFTWARE_OFFERS: readonly SoftwareOfferItem[] = [
  {
    id: 'vmix-pro-28',
    name: 'vMix Pro 28',
    imagePath: '/assets/aistudio/image_e97da978.png',
    originalPrice: 8000,
    offerPrice: 2999,
    savingsPercent: 63,
    featured: true,
    tagLine: {
      en: 'Windows Edition · Lifetime Validity',
      mr: 'विंडोज एडिशन · लाईफटाईम व्हॅलिडिटी',
      hi: 'विंडोज़ एडिशन · लाइफटाइम वैलिडिटी',
      gu: 'વિન્ડોઝ એડિશન · લાઇફટાઇમ વેલિડિટી',
    },
    highlights: ['4K Live Streaming', 'Instant Replay & Multi-View', 'Full NDI Support'],
  },
  {
    id: 'premiere-pro',
    name: 'Adobe Premiere Pro',
    imagePath: '/assets/aistudio/image_2aea9eba.png',
    originalPrice: 5000,
    offerPrice: 3999,
    savingsPercent: 20,
    tagLine: {
      en: 'Pro Video Editing Suite · Full Setup',
      mr: 'प्रो व्हिडिओ एडिटिंग सूट · फुल सेटअप',
      hi: 'प्रो वीडियो एडिटिंग सूट · फुल सेटअप',
      gu: 'પ્રો વિડિયો એડિટિંગ સૂટ · ફુલ સેટઅપ',
    },
    highlights: ['4K Multi-Cam Editing', 'Broadcast Color Grading', 'Fast Export Presets'],
  },
  {
    id: 'after-effects',
    name: 'Adobe After Effects',
    imagePath: '/assets/aistudio/image_e99b191c.png',
    originalPrice: 5000,
    offerPrice: 2999,
    savingsPercent: 40,
    tagLine: {
      en: 'Motion Graphics & Broadcast VFX',
      mr: 'मोशन ग्राफिक्स आणि ब्रॉडकास्ट VFX',
      hi: 'मोशन ग्राफिक्स और ब्रॉडकास्ट VFX',
      gu: 'મોશન ગ્રાફિક્સ અને બ્રોડકાસ્ટ VFX',
    },
    highlights: ['Stinger & Overlay Design', '3D Titles & Intros', 'Pro VFX Templates'],
  },
  {
    id: 'capcut-pro',
    name: 'CapCut Pro',
    imagePath: '/assets/aistudio/image_9959fdb0.png',
    originalPrice: 3000,
    offerPrice: 1999,
    savingsPercent: 33,
    tagLine: {
      en: 'Premium · Lifetime License',
      mr: 'प्रीमियम · लाईफटाईम लायसन्स',
      hi: 'प्रीमियम · लाइफटाइम लाइसेंस',
      gu: 'પ્રીમિયમ · લાઇફટાઇમ લાયસન્સ',
    },
    highlights: ['All Pro Effects Unlocked', 'Auto Captions & AI Tools', 'No Watermark 4K Export'],
  },
  {
    id: 'adobe-photoshop',
    name: 'Adobe Photoshop',
    imagePath: '/assets/aistudio/image_8dd93048.png',
    originalPrice: 6899,
    offerPrice: 2999,
    savingsPercent: 57,
    tagLine: {
      en: 'Pro Photo Editing & Banner Design',
      mr: 'प्रो फोटो एडिटिंग आणि बॅनर डिझाइन',
      hi: 'प्रो फोटो एडिटिंग और बैनर डिज़ाइन',
      gu: 'પ્રો ફોટો એડિટિંગ અને બેનર ડિઝાઇન',
    },
    highlights: ['Tournament Posters & Thumbnails', 'AI Retouch & Background Cut', 'Full Lifetime Setup Support'],
  },
];

interface SoftwareOffersSectionProps {
  lang: Language;
}

export function SoftwareOffersSection({ lang }: SoftwareOffersSectionProps) {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const sectionHeading =
    lang === 'mr'
      ? 'प्रो ब्रॉडकास्ट आणि एडिटिंग सॉफ्टवेअर महा-ऑफर'
      : lang === 'hi'
        ? 'प्रो ब्रॉडकास्ट और एडिटिंग सॉफ्टवेयर महा-ऑफ़र'
        : lang === 'gu'
          ? 'પ્રો બ્રોડકાસ્ટ અને એડિટિંગ સોફ્ટવેર મહા-ઓફર'
          : 'PRO BROADCAST & EDITING SOFTWARE OFFERS';

  const sectionSubtitle =
    lang === 'mr'
      ? 'vMix Pro, Premiere Pro, After Effects, CapCut Pro आणि Adobe Photoshop — थेट इन्स्टॉलेशन सपोर्टसह खास सवलतीच्या दरात.'
      : lang === 'hi'
        ? 'vMix Pro, Premiere Pro, After Effects, CapCut Pro और Adobe Photoshop — तुरंत सेटअप सपोर्ट के साथ स्पेशल डिस्काउंट प्राइस पर।'
        : lang === 'gu'
          ? 'vMix Pro, Premiere Pro, After Effects, CapCut Pro અને Adobe Photoshop — ઇન્સ્ટન્ટ સેટઅપ સપોર્ટ સાથે સ્પેશિયલ ડિસ્કાઉન્ટ ભાવે.'
          : 'vMix Pro, Premiere Pro, After Effects, CapCut Pro, and Adobe Photoshop at special discounted prices with full installation support.';

  const orderLabel =
    lang === 'mr'
      ? 'WhatsApp वर घ्या'
      : lang === 'hi'
        ? 'WhatsApp पर लें'
        : lang === 'gu'
          ? 'WhatsApp પર લો'
          : 'Buy on WhatsApp';

  return (
    <section
      id="software-offers"
      aria-labelledby="software-offers-heading"
      className="relative py-8 sm:py-12 border-b border-[#FFE600]/30"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        {/* Highlighted Animated Section Header */}
        <div className="relative overflow-hidden rounded-2xl overlay-home-card p-5 sm:p-7 text-center space-y-2.5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden"
          >
            <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-[#FFE600] to-[#EF1A1A] topbar-beam-sweep" />
          </div>

          <p className="inline-flex items-center justify-center gap-2 text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#FFE600]">
            <Sparkles className="w-3.5 h-3.5 text-[#FFE600] shrink-0" aria-hidden="true" />
            <span>LIMITED TIME SPECIAL PRICE DROP · STAR EVENT LIVE</span>
          </p>

          <h2
            id="software-offers-heading"
            className="font-display text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white [text-wrap:balance]"
          >
            <span className="text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.7)]">
              {sectionHeading}
            </span>
          </h2>

          <p className="text-xs sm:text-base text-rose-100/90 max-w-2xl mx-auto">
            {sectionSubtitle}
          </p>
        </div>

        {/* 5 Highlighted Product Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5">
          {SOFTWARE_OFFERS.map((item) => {
            const whatsappHref = `https://wa.me/${STUDIO_CONTACT.whatsappNumber}?text=${encodeURIComponent(
              `Hello Star Event Live, I want to buy ${item.name} at the special offer price of ₹${item.offerPrice.toLocaleString('en-IN')} Only (Original ₹${item.originalPrice.toLocaleString('en-IN')}). Please share installation details.`
            )}`;

            return (
              <article
                key={item.id}
                className={`group relative rounded-2xl overlay-home-card overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-1 ${
                  item.featured
                    ? 'ring-2 ring-[#FFE600] shadow-[0_0_32px_rgba(255,230,0,0.28)]'
                    : 'hover:border-[#FFE600]/75'
                }`}
              >
                {/* Top Strip */}
                <div className="overlay-home-header px-4 py-2.5 flex items-center justify-between gap-2">
                  <span className="font-display text-xs sm:text-sm font-black tracking-wide text-[#FFE600] uppercase truncate">
                    {item.name}
                  </span>
                  <span className="font-mono text-[11px] font-black text-white tabular-nums shrink-0">
                    SAVE {item.savingsPercent}%
                  </span>
                </div>

                {/* Product Box Artwork */}
                <div className="relative aspect-square w-full bg-gradient-to-b from-[#160515] via-[#0B0618] to-[#070B28] p-4 sm:p-5 flex items-center justify-center overflow-hidden border-b border-[#FFE600]/20">
                  {!failedImages[item.id] ? (
                    <img
                      src={item.imagePath}
                      alt={`${item.name} — Special Offer ₹${item.offerPrice} Only (Original ₹${item.originalPrice})`}
                      referrerPolicy="no-referrer"
                      loading="eager"
                      decoding="async"
                      onError={() =>
                        setFailedImages((prev) => ({ ...prev, [item.id]: true }))
                      }
                      className="w-full h-full object-contain drop-shadow-[0_14px_26px_rgba(0,0,0,0.75)] transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full rounded-xl bg-[#2A030E]/70 border border-[#FFE600]/25 flex flex-col items-center justify-center gap-2 p-4 text-center">
                      <MonitorPlay className="w-10 h-10 text-[#FFE600]" aria-hidden="true" />
                      <span className="font-display text-base font-black text-white">
                        {item.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Pricing & Highlights */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-2.5">
                    <div>
                      <h3 className="font-display text-lg sm:text-xl font-black text-white leading-tight">
                        {item.name}
                      </h3>
                      <p className="text-[11px] sm:text-xs font-medium text-rose-100/80 mt-0.5">
                        {item.tagLine[lang]}
                      </p>
                    </div>

                    {/* Slashed Price + Highlighted Offer Price */}
                    <div className="rounded-xl bg-[#070B28]/85 border border-[#FFE600]/35 px-3.5 py-2.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-sm sm:text-base font-bold text-rose-300/85 line-through decoration-2 decoration-[#EF1A1A] tabular-nums">
                          ₹{item.originalPrice.toLocaleString('en-IN')}
                        </span>
                        <span className="font-display text-2xl sm:text-3xl font-black text-[#FFE600] tabular-nums drop-shadow-[0_2px_10px_rgba(255,230,0,0.35)]">
                          ₹{item.offerPrice.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <span className="font-display text-xs font-black uppercase tracking-wider text-white">
                        Only
                      </span>
                    </div>

                    {/* Clean Unboxed Feature List */}
                    <ul className="space-y-1 text-xs text-rose-50/90">
                      {item.highlights.map((point) => (
                        <li key={point} className="flex items-center gap-2">
                          <span aria-hidden="true" className="text-[#FFE600] font-bold">
                            ·
                          </span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Direct WhatsApp Purchase Action */}
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                      item.featured
                        ? 'btn-gold-pro text-[#070B28]'
                        : 'btn-primary-pro text-white'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>
                      {orderLabel} · ₹{item.offerPrice.toLocaleString('en-IN')}
                    </span>
                  </a>
                </div>
              </article>
            );
          })}
        </div>

        {/* Bottom Direct Call & Bundle Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
          <p className="text-xs sm:text-sm font-semibold text-rose-100/90">
            Instant Remote Installation &amp; Activation Support Available ·{' '}
            <span className="text-[#FFE600] font-bold">All 5 Software Deals Active Today</span>
          </p>
          <a
            href={STUDIO_CONTACT.phoneHref}
            className="btn-gold-pro min-h-[42px] inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-black text-[#070B28] whitespace-nowrap tabular-nums"
          >
            <Phone className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Call {STUDIO_CONTACT.phoneDisplay}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
