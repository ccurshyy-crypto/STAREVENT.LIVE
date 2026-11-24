import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Instagram,
  Maximize2,
  Phone,
  X,
} from 'lucide-react';
import { Language } from '../data/content';

interface PartnerAdSectionProps {
  lang: Language;
  onBookNow?: () => void;
  onOpenHaldiOverlay?: () => void;
}

interface AdBannerSlide {
  id: 'sahyadri' | 'ravi-mobile' | 'pavan-events';
  imagePath: string;
  imageAlt: string;
  phones: Array<{ display: string; href: string }>;
  instagram: { handle: string; url: string };
}

const AD_BANNERS: AdBannerSlide[] = [
  {
    id: 'sahyadri',
    imagePath: '/assets/aistudio/image_5ff83c99.png',
    imageAlt: 'Sahyadri Event Live Advertisement Banner',
    phones: [{ display: '81497 95828', href: 'tel:+918149795828' }],
    instagram: {
      handle: '@sahyadrieventlive_5050',
      url: 'https://www.instagram.com/sahyadrieventlive_5050?hvrq=MXAwbHlsYzYxNzFkcA==',
    },
  },
  {
    id: 'ravi-mobile',
    imagePath: '/assets/aistudio/IMG_0985_de6ca52a.PNG',
    imageAlt: 'Ravi Mobile Repairing Advertisement Banner',
    phones: [
      { display: '7888041810', href: 'tel:+917888041810' },
      { display: '9011231497', href: 'tel:+919011231497' },
    ],
    instagram: {
      handle: '@ravi.mobile_repairing',
      url: 'https://www.instagram.com/ravi.mobile_repairing/',
    },
  },
  {
    id: 'pavan-events',
    imagePath: '/assets/aistudio/WhatsApp_Image_2026-11-23_at_9.00.33_AM_7efa46fa.jpeg',
    imageAlt: 'Pavan Events Advertisement Banner',
    phones: [{ display: '9028975078', href: 'tel:+919028975078' }],
    instagram: {
      handle: '@pavan.event.management',
      url: 'https://www.instagram.com/pavan.event.management/',
    },
  },
];

export function PartnerAdSection({ lang: _lang }: PartnerAdSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const activeSlide = AD_BANNERS[activeIndex] ?? AD_BANNERS[0];

  // Auto-rotate seamlessly inside the single showcase frame every 3 seconds
  useEffect(() => {
    if (isPaused || lightboxOpen) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % AD_BANNERS.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [isPaused, lightboxOpen]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowRight') {
        setActiveIndex((prev) => (prev + 1) % AD_BANNERS.length);
      }
      if (e.key === 'ArrowLeft') {
        setActiveIndex((prev) => (prev - 1 + AD_BANNERS.length) % AD_BANNERS.length);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxOpen]);

  const goPrev = () => {
    setActiveIndex((prev) => (prev - 1 + AD_BANNERS.length) % AD_BANNERS.length);
  };

  const goNext = () => {
    setActiveIndex((prev) => (prev + 1) % AD_BANNERS.length);
  };

  const handleDesktopMouseEnter = () => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches
    ) {
      setIsPaused(true);
    }
  };

  return (
    <section
      id="featured-advertisement"
      aria-label="Advertise"
      className="py-10 sm:py-16 lg:py-20 border-b border-white/10"
      onMouseEnter={handleDesktopMouseEnter}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 space-y-5 sm:space-y-8">
        {/* BIG BOLD ADVERTISE HEADING */}
        <h2 className="font-display text-3xl sm:text-5xl md:text-6xl font-black text-center tracking-[0.08em] uppercase text-[#FFE600] drop-shadow-[0_4px_20px_rgba(0,0,0,0.65)]">
          ADVERTISE
        </h2>

        {/* SINGLE BIG AUTO-CHANGING BANNER SHOWCASE */}
        <div className="bg-[#0A1033]/92 border border-[#FFE600]/40 rounded-2xl p-2.5 sm:p-5 shadow-[0_24px_60px_rgba(0,0,0,0.65)] space-y-4 sm:space-y-5">
          {/* Rotating Single Image Stage */}
          <div className="relative group rounded-xl overflow-hidden bg-[#070B28] border border-white/15">
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label="View full advertisement banner"
              className="relative block w-full aspect-[4/5] sm:aspect-[4/4] md:aspect-[16/13] max-h-[680px] mx-auto bg-[#070B28] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600]"
            >
              {AD_BANNERS.map((slide, idx) => {
                const isCurrent = idx === activeIndex;
                return (
                  <div
                    key={slide.id}
                    aria-hidden={!isCurrent}
                    className={`absolute inset-0 flex items-center justify-center p-1 sm:p-2 transition-opacity duration-500 ease-out ${
                      isCurrent ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                    }`}
                  >
                    <img
                      src={slide.imagePath}
                      alt={slide.imageAlt}
                      referrerPolicy="no-referrer"
                      loading="eager"
                      decoding="async"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>
                );
              })}

              {/* Full View icon corner hint */}
              <span className="pointer-events-none absolute top-3 right-3 z-20 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-black/75 border border-white/20 text-[#FACC15]">
                <Maximize2 className="w-4 h-4" aria-hidden="true" />
              </span>
            </button>

            {/* Left / Right Manual Switch Controls */}
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous advertisement"
              className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/75 hover:bg-black border border-white/25 text-white hover:text-[#FACC15] flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
            >
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next advertisement"
              className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/75 hover:bg-black border border-white/25 text-white hover:text-[#FACC15] flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
            >
              <ChevronRight className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* Slide Progress Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 border border-white/15">
              {AD_BANNERS.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`Show advertisement ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === activeIndex ? 'w-7 bg-[#FACC15]' : 'w-2.5 bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* ONLY PHONE NUMBER & INSTAGRAM ID — FIXED-HEIGHT STABLE ROW (ZERO LAYOUT SHIFT) */}
          <div className="pt-1 pb-1.5 px-1 sm:px-2 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-center gap-2.5 sm:gap-4 min-h-[116px] sm:min-h-[60px]">
            <div
              className={`grid gap-2 sm:gap-3 w-full sm:w-auto ${
                activeSlide.phones.length > 1 ? 'grid-cols-2 sm:flex sm:flex-row' : 'grid-cols-1'
              }`}
            >
              {activeSlide.phones.map((phone) => (
                <a
                  key={phone.display}
                  href={phone.href}
                  className={`btn-primary-pro w-full sm:w-auto min-h-[50px] sm:min-h-[54px] inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl font-mono font-black text-white tracking-wide tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] ${
                    activeSlide.phones.length > 1
                      ? 'px-2.5 sm:px-5 py-2.5 sm:py-3 text-sm min-[400px]:text-base sm:text-xl'
                      : 'px-4 sm:px-6 py-2.5 sm:py-3 text-lg sm:text-2xl'
                  }`}
                >
                  <Phone className="w-4 h-4 sm:w-6 sm:h-6 text-[#FACC15] shrink-0" aria-hidden="true" />
                  <span className="truncate">{phone.display}</span>
                </a>
              ))}
            </div>

            <a
              href={activeSlide.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold-pro w-full sm:w-auto min-h-[50px] sm:min-h-[54px] inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-display text-base sm:text-2xl font-black text-black tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white min-w-0"
            >
              <Instagram className="w-5 h-5 sm:w-6 sm:h-6 text-[#9D174D] shrink-0" aria-hidden="true" />
              <span className="truncate">{activeSlide.instagram.handle}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Fullscreen Lightbox */}
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Full Advertisement Banner"
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full max-h-[92vh] flex flex-col items-center gap-4"
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label="Close advertisement preview"
              className="absolute top-2 right-2 sm:-top-3 sm:-right-3 z-20 w-10 h-10 rounded-full bg-[#DC2626] text-white flex items-center justify-center shadow-xl"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            <img
              src={activeSlide.imagePath}
              alt={activeSlide.imageAlt}
              referrerPolicy="no-referrer"
              className="max-h-[82vh] w-auto max-w-full rounded-xl border border-[#FACC15]/40 object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
}
