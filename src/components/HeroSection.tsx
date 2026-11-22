import { useState } from 'react';
import { ArrowRight, ExternalLink, Instagram, Phone, Play, Video, Youtube } from 'lucide-react';
import { Language, STUDIO_CONTACT, UI_COPY } from '../data/content';
import { SpinningLogoVideo } from './SpinningLogoVideo';

interface HeroSectionProps {
  lang: Language;
  onOpenOverlays: () => void;
}

export function HeroSection({ lang, onOpenOverlays }: HeroSectionProps) {
  const [bannerError, setBannerError] = useState(false);

  return (
    <section id="top" className="relative pt-5 pb-12 sm:pt-8 sm:pb-16 lg:pb-20 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7 sm:space-y-9">
        {/* Top Auspicious Studio Ribbon */}
        <div className="relative overflow-hidden rounded-2xl border border-[#FACC15]/30 studio-strip-animated-bg px-4 sm:px-6 py-4 shadow-[0_12px_32px_rgba(0,0,0,0.48)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FACC15]/65 to-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden"
          >
            <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-[#EF4444] to-[#FACC15] opacity-85 topbar-beam-sweep" />
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-full flex items-center justify-center gap-3 sm:gap-5">
              <span
                aria-hidden="true"
                className="hidden sm:block h-[1.5px] w-16 md:w-28 bg-gradient-to-r from-transparent via-[#FACC15]/60 to-[#FACC15]"
              />
              <p className="font-display text-xl sm:text-3xl md:text-4xl font-extrabold tracking-normal [word-spacing:0.12em] text-center leading-[1.4] ganesh-invocation-text select-none">
                {STUDIO_CONTACT.invocation}
              </p>
              <span
                aria-hidden="true"
                className="hidden sm:block h-[1.5px] w-16 md:w-28 bg-gradient-to-l from-transparent via-[#FACC15]/60 to-[#FACC15]"
              />
            </div>

            <div className="mt-3 pt-2.5 w-full border-t border-white/10 flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1.5 text-xs sm:text-sm text-zinc-200">
              <span className="font-mono text-zinc-100">{STUDIO_CONTACT.domain}</span>
              <span aria-hidden="true" className="text-zinc-500">·</span>
              <a
                href={STUDIO_CONTACT.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-semibold text-white hover:text-[#FACC15] transition-colors whitespace-nowrap"
              >
                <Youtube className="w-4 h-4 text-[#EF4444] shrink-0" aria-hidden="true" />
                <span>YouTube ({STUDIO_CONTACT.youtubeHandle})</span>
              </a>
              {STUDIO_CONTACT.instagramAccounts.map((ig) => (
                <span key={ig.handle} className="inline-flex items-center gap-2.5">
                  <span aria-hidden="true" className="text-zinc-500">·</span>
                  <a
                    href={ig.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-semibold text-white hover:text-[#FACC15] transition-colors whitespace-nowrap"
                  >
                    <Instagram className="w-3.5 h-3.5 text-[#F472B6] shrink-0" aria-hidden="true" />
                    <span>{ig.handle}</span>
                  </a>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* BIG STAR EVENT LIVE LOGO + NAME HERO HEADER (Responsive Mobile / Tablet / Desktop) */}
        <div className="flex flex-col items-center text-center space-y-5">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <SpinningLogoVideo
              className="w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36"
              resolution={156}
              label="Star Event Live official 3D rotating logo"
            />
            <div className="space-y-1.5 text-center sm:text-left">
              <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-none">
                <span className="text-[#FACC15] drop-shadow-[0_3px_18px_rgba(250,204,21,0.35)]">
                  STAR EVENT
                </span>{' '}
                <span className="text-[#EF4444] drop-shadow-[0_3px_18px_rgba(239,68,68,0.4)]">
                  LIVE
                </span>
              </h1>
              <p className="text-sm sm:text-base md:text-lg font-semibold text-zinc-200">
                {UI_COPY.hero.headline[lang]}
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-xs sm:text-sm text-zinc-300 font-mono tabular-nums">
                <span>{STUDIO_CONTACT.founderName}</span>
                <span aria-hidden="true" className="text-zinc-600">·</span>
                <a
                  href={STUDIO_CONTACT.phoneHref}
                  className="inline-flex items-center gap-1.5 text-[#FACC15] font-bold hover:text-white transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{STUDIO_CONTACT.phoneDisplay}</span>
                </a>
              </div>
            </div>
          </div>

          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl">
            {UI_COPY.hero.subcopy[lang]}
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
            <a
              href="#book"
              className="btn-primary-pro w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-sm sm:text-base font-bold rounded-xl whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
            >
              <span>{UI_COPY.hero.primaryCta[lang]}</span>
              <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
            </a>

            <a
              href="/overlays"
              onClick={(e) => {
                e.preventDefault();
                onOpenOverlays();
              }}
              className="btn-gold-pro w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm sm:text-base font-extrabold text-black rounded-xl whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white tabular-nums"
            >
              <Play className="w-4 h-4 text-[#991B1B] shrink-0" aria-hidden="true" />
              <span>{UI_COPY.hero.secondaryCta[lang]}</span>
            </a>
          </div>
        </div>

        {/* BIG FULL-WIDTH OFFICIAL STAR EVENT LIVE BANNER */}
        <figure className="w-full bg-[#140A0E]/92 border border-[#FACC15]/35 rounded-2xl p-2 sm:p-3.5 lg:p-4 shadow-[0_24px_64px_rgba(0,0,0,0.68)]">
          {!bannerError ? (
            <div className="overflow-hidden rounded-xl bg-[#0B0609]">
              <img
                src={STUDIO_CONTACT.bannerPath}
                alt="Star Event Live official banner — Cricket, Kabaddi, Haldi, Birthday, Wedding & All Events Live on YouTube (@stareventlive01). Contact 9890175727."
                referrerPolicy="no-referrer"
                loading="eager"
                decoding="async"
                fetchPriority="high"
                onError={() => setBannerError(true)}
                className="w-full h-auto block object-contain"
              />
            </div>
          ) : (
            <div className="aspect-[2/1] rounded-xl bg-gradient-to-br from-[#3B070B] via-[#17090D] to-[#0B0912] border border-white/10 flex flex-col items-center justify-center p-8 text-center">
              <Video className="w-12 h-12 text-[#FACC15] mb-3" aria-hidden="true" />
              <p className="font-display text-3xl font-extrabold text-white">
                {STUDIO_CONTACT.brand}
              </p>
              <p className="font-mono text-lg font-bold text-[#FACC15] mt-3 tabular-nums">
                {STUDIO_CONTACT.phoneDisplay}
              </p>
            </div>
          )}

          <figcaption className="mt-3 px-1 sm:px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm text-zinc-300">
            <span className="font-medium">{UI_COPY.hero.bannerCaption[lang]}</span>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={STUDIO_CONTACT.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-semibold text-[#FACC15] hover:text-white transition-colors whitespace-nowrap"
              >
                <Youtube className="w-4 h-4 text-[#EF4444] shrink-0" aria-hidden="true" />
                <span>
                  {lang === 'mr'
                    ? 'YouTube चॅनेल पहा'
                    : lang === 'hi'
                      ? 'YouTube चैनल देखें'
                      : lang === 'gu'
                        ? 'YouTube ચેનલ જુઓ'
                        : 'Watch on YouTube'}
                </span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              </a>
              <span aria-hidden="true" className="text-zinc-600">·</span>
              <a
                href={STUDIO_CONTACT.phoneHref}
                className="font-mono font-bold text-[#FACC15] hover:text-white tabular-nums"
              >
                {STUDIO_CONTACT.phoneDisplay}
              </a>
            </div>
          </figcaption>
        </figure>

        {/* Responsive 4-Column Capability Strip */}
        <div className="pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-7">
          {UI_COPY.hero.stats.map((stat) => (
            <div
              key={stat.value}
              className="rounded-xl bg-white/[0.03] border border-white/8 p-4 space-y-1.5"
            >
              <p className="font-mono text-lg sm:text-xl font-bold text-[#FACC15] tabular-nums">
                {stat.value}
              </p>
              <p className="text-sm font-semibold text-white leading-snug">{stat.label[lang]}</p>
              <p className="text-xs sm:text-[13px] text-zinc-400 leading-relaxed">
                {stat.detail[lang]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
