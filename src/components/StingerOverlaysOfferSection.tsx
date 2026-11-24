import { useEffect, useState } from 'react';
import {
  Maximize2,
  MessageCircle,
  Phone,
  Play,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { Language, STUDIO_CONTACT } from '../data/content';

interface StingerVideoItem {
  id: string;
  src: string;
  title: string;
  subtitle: Record<Language, string>;
}

const STINGER_VIDEOS: readonly StingerVideoItem[] = [
  {
    id: 'stinger-four',
    src: '/assets/aistudio/ovarly_1_7a133683.mp4',
    title: 'FOUR Stinger',
    subtitle: {
      en: 'Cricket Boundary 4 Animation · vMix / OBS',
      mr: 'क्रिकेट चौकार स्टिंगर · vMix / OBS',
      hi: 'क्रिकेट चौका स्टिंगर · vMix / OBS',
      gu: 'ક્રિકેટ ચોગ્ગો સ્ટિંગર · vMix / OBS',
    },
  },
  {
    id: 'stinger-sixer',
    src: '/assets/aistudio/ovarly_2_21d01fa1.mp4',
    title: 'SIXER Stinger',
    subtitle: {
      en: 'Cricket Maximum 6 Animation · vMix / OBS',
      mr: 'क्रिकेट षटकार स्टिंगर · vMix / OBS',
      hi: 'क्रिकेट छक्का स्टिंगर · vMix / OBS',
      gu: 'ક્રિકેટ છગ્ગો સ્ટિંગર · vMix / OBS',
    },
  },
  {
    id: 'stinger-out',
    src: '/assets/aistudio/ovarly_3_ad7f3144.mp4',
    title: 'OUT / Wicket Stinger',
    subtitle: {
      en: 'Cricket Wicket Dismissal Transition',
      mr: 'क्रिकेट विकेट आउट स्टिंगर ट्रान्झिशन',
      hi: 'क्रिकेट विकेट आउट स्टिंगर ट्रांज़िशन',
      gu: 'ક્રિકેટ વિકેટ આઉટ સ્ટિંગર ટ્રાન્ઝિશન',
    },
  },
  {
    id: 'stinger-replay',
    src: '/assets/aistudio/ovarly_4_918a4f65.mp4',
    title: 'REPLAY & Brand Stinger',
    subtitle: {
      en: 'Instant Replay Wipe + Custom Channel Logo',
      mr: 'इंस्टंट रिप्ले वाईप + कस्टम चॅनेल लोगो',
      hi: 'इंस्टेंट रिप्ले वाइप + कस्टम चैनल लोगो',
      gu: 'ઇન્સ્ટન્ટ રિપ્લે વાઇપ + કસ્ટમ ચેનલ લોગો',
    },
  },
];

interface StingerOverlaysOfferSectionProps {
  lang: Language;
  onOpenOverlays: () => void;
}

export function StingerOverlaysOfferSection({
  lang,
  onOpenOverlays,
}: StingerOverlaysOfferSectionProps) {
  const [activePreview, setActivePreview] = useState<StingerVideoItem | null>(null);
  const [previewMuted, setPreviewMuted] = useState(false);

  useEffect(() => {
    if (!activePreview) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActivePreview(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activePreview]);

  const orderWhatsappHref = `https://wa.me/${STUDIO_CONTACT.whatsappNumber}?text=${encodeURIComponent(
    'Hello Star Event Live, I want to order Stinger and Overlays (Only ₹99). Please share details.'
  )}`;

  return (
    <section
      id="top"
      aria-labelledby="stinger-offer-heading"
      className="relative pt-5 pb-8 sm:pt-9 sm:pb-12 border-b border-[#FFE600]/25"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-5 sm:space-y-7">
        {/* Bold Top Offer Banner Header */}
        <div className="text-center space-y-2.5">
          <h1
            id="stinger-offer-heading"
            className="font-display text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.1] uppercase"
          >
            <span className="text-white drop-shadow-[0_3px_16px_rgba(0,0,0,0.7)]">
              STINGER AND OVERLAYS
            </span>{' '}
            <span className="text-[#FFE600] drop-shadow-[0_4px_20px_rgba(0,0,0,0.75)]">
              ONLY ON 99RS
            </span>
          </h1>
          <p className="text-xs sm:text-base font-medium text-white/90 max-w-2xl mx-auto">
            {lang === 'mr'
              ? 'vMix आणि OBS Studio साठी रेडी-टू-यूज क्रिकेट FOUR, SIXER, OUT आणि REPLAY स्टिंगर व ओव्हरले फक्त ₹99 मध्ये.'
              : lang === 'hi'
                ? 'vMix और OBS Studio के लिए रेडी-टू-यूज़ क्रिकेट FOUR, SIXER, OUT और REPLAY स्टिंगर व ओवरले सिर्फ़ ₹99 में।'
                : lang === 'gu'
                  ? 'vMix અને OBS Studio માટે રેડી-ટુ-યુઝ ક્રિકેટ FOUR, SIXER, OUT અને REPLAY સ્ટિંગર અને ઓવરલે માત્ર ₹99 માં.'
                  : 'Broadcast-ready vMix & OBS Cricket FOUR, SIXER, OUT, and REPLAY stinger transitions & overlays for only ₹99.'}
          </p>
        </div>

        {/* 4 Uploaded Stinger Videos Showcase Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {STINGER_VIDEOS.map((item) => (
            <article
              key={item.id}
              className="group bg-[#0B0B12]/95 border border-[#FFE600]/35 hover:border-[#FFE600]/80 rounded-2xl overflow-hidden shadow-[0_18px_42px_rgba(0,0,0,0.58)] flex flex-col transition-colors"
            >
              <button
                type="button"
                onClick={() => {
                  setPreviewMuted(false);
                  setActivePreview(item);
                }}
                aria-label={`Play ${item.title} full screen`}
                className="relative aspect-video w-full bg-black overflow-hidden block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600]"
              >
                <video
                  src={item.src}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-cover block"
                />
                <span className="pointer-events-none absolute top-2.5 right-2.5 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-black/75 border border-white/20 text-[#FFE600] opacity-90 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
              </button>

              <div className="p-3 sm:p-3.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-display text-sm sm:text-base font-extrabold text-white truncate">
                    {item.title}
                  </h2>
                  <p className="text-[11px] sm:text-xs text-white/75 truncate mt-0.5">
                    {item.subtitle[lang]}
                  </p>
                </div>
                <span className="font-mono text-sm sm:text-base font-black text-[#FFE600] tabular-nums shrink-0">
                  ₹99
                </span>
              </div>
            </article>
          ))}
        </div>

        {/* Direct Action Strip */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-2.5 sm:gap-3.5">
          <a
            href={orderWhatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold-pro min-h-[46px] inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 text-sm sm:text-base font-black text-black rounded-xl whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {lang === 'mr'
                ? '₹99 मध्ये WhatsApp वर ऑर्डर करा'
                : lang === 'hi'
                  ? '₹99 में WhatsApp पर ऑर्डर करें'
                  : lang === 'gu'
                    ? '₹99 માં WhatsApp પર ઓર્ડર કરો'
                    : 'Get Stinger & Overlays — ₹99 on WhatsApp'}
            </span>
          </a>

          <a
            href={STUDIO_CONTACT.phoneHref}
            className="btn-primary-pro min-h-[46px] inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl whitespace-nowrap tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600]"
          >
            <Phone className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{STUDIO_CONTACT.phoneDisplay}</span>
          </a>

          <button
            type="button"
            onClick={onOpenOverlays}
            className="btn-glass-pro min-h-[46px] inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600]"
          >
            <Play className="w-4 h-4 text-[#FFE600] shrink-0" aria-hidden="true" />
            <span>
              {lang === 'mr'
                ? 'लाईव्ह ओव्हरले स्टुडिओ'
                : lang === 'hi'
                  ? 'लाइव ओवरले स्टूडियो'
                  : lang === 'gu'
                    ? 'લાઇવ ઓવરલે સ્ટુડિયો'
                    : 'Open Live Overlays'}
            </span>
          </button>
        </div>
      </div>

      {/* Fullscreen Video Preview Modal */}
      {activePreview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activePreview.title}
          onClick={() => setActivePreview(null)}
          className="fixed inset-0 z-50 bg-black/92 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl bg-[#0B0B12] border border-[#FFE600]/45 rounded-2xl p-3 sm:p-5 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-base sm:text-lg font-extrabold text-white truncate">
                  {activePreview.title} · <span className="text-[#FFE600]">Only ₹99</span>
                </p>
                <p className="text-xs text-white/75 truncate">{activePreview.subtitle[lang]}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setPreviewMuted((m) => !m)}
                  aria-label={previewMuted ? 'Unmute video' : 'Mute video'}
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                >
                  {previewMuted ? (
                    <VolumeX className="w-4 h-4 text-white/75" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-[#FFE600]" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreview(null)}
                  aria-label="Close video preview"
                  className="w-10 h-10 rounded-xl bg-[#E11D1D] hover:bg-[#B91C1C] text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/10">
              <video
                key={activePreview.id}
                src={activePreview.src}
                autoPlay
                controls
                muted={previewMuted}
                loop
                playsInline
                className="w-full h-full object-contain block"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span className="text-xs sm:text-sm font-semibold text-white/85">
                Stinger &amp; Overlays Only on <span className="text-[#FFE600] font-bold">₹99</span> · {STUDIO_CONTACT.brand}
              </span>
              <a
                href={`https://wa.me/${STUDIO_CONTACT.whatsappNumber}?text=${encodeURIComponent(
                  `Hello Star Event Live, I want to buy the ${activePreview.title} (Stinger & Overlays Only ₹99).`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold-pro min-h-[42px] inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-black text-black rounded-xl whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Order on WhatsApp (₹99)</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
