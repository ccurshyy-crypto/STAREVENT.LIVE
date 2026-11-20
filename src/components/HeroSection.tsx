import { useState } from 'react';
import { ArrowRight, Play, Video } from 'lucide-react';
import { Language, STUDIO_CONTACT, UI_COPY } from '../data/content';
import { SpinningLogoVideo } from './SpinningLogoVideo';

interface HeroSectionProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  onOpenOverlays: () => void;
}

export function HeroSection({ lang, onChangeLang, onOpenOverlays }: HeroSectionProps) {
  const [bannerError, setBannerError] = useState(false);

  return (
    <section id="top" className="relative pt-8 pb-16 sm:pt-12 sm:pb-20 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top studio utility row: auspicious line + domain + language switcher */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-8 border-b border-white/10">
          <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm text-zinc-400">
            <span className="font-medium text-[#FACC15]">{STUDIO_CONTACT.invocation}</span>
            <span aria-hidden="true" className="text-zinc-600">·</span>
            <span className="font-mono text-zinc-300">{STUDIO_CONTACT.domain}</span>
            <span aria-hidden="true" className="text-zinc-600">·</span>
            <span>YouTube · Facebook · Instagram</span>
          </div>

          <div
            role="group"
            aria-label="Language selection"
            className="inline-flex items-center p-1 bg-[#141418] border border-white/10 rounded-lg shrink-0"
          >
            <button
              type="button"
              onClick={() => onChangeLang('mr')}
              aria-pressed={lang === 'mr'}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] ${
                lang === 'mr'
                  ? 'bg-[#DC2626] text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              मराठी
            </button>
            <button
              type="button"
              onClick={() => onChangeLang('en')}
              aria-pressed={lang === 'en'}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] ${
                lang === 'en'
                  ? 'bg-[#DC2626] text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Hero Proposition & Focal Official Studio Banner */}
        <div className="pt-10 lg:pt-12 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-4">
              <SpinningLogoVideo
                className="w-16 h-16 sm:w-20 sm:h-20"
                resolution={220}
                label="Star Event Live official 3D rotating logo"
              />
              <div className="space-y-0.5">
                <p className="font-display text-sm sm:text-base font-extrabold tracking-tight text-white">
                  {STUDIO_CONTACT.brand}
                </p>
                <p className="text-xs text-zinc-400 font-mono tabular-nums">
                  {STUDIO_CONTACT.founderName} · {STUDIO_CONTACT.phoneDisplay}
                </p>
              </div>
            </div>

            <h1 className="font-display font-extrabold tracking-tight text-white text-[clamp(2.15rem,3.6vw,3.35rem)] leading-[1.12]">
              {UI_COPY.hero.headline[lang]}
            </h1>

            <p className="text-base sm:text-[17px] leading-relaxed text-zinc-300 max-w-xl">
              {UI_COPY.hero.subcopy[lang]}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href="#book"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 text-sm font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B]"
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
                className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-semibold text-zinc-200 hover:text-white border border-white/15 hover:border-white/30 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] tabular-nums"
              >
                <Play className="w-4 h-4 text-[#FACC15] shrink-0" aria-hidden="true" />
                <span>{UI_COPY.hero.secondaryCta[lang]}</span>
              </a>
            </div>

            <p className="pt-2 text-sm text-zinc-400">
              {lang === 'mr' ? STUDIO_CONTACT.promiseMr : STUDIO_CONTACT.promiseEn}
            </p>
          </div>

          {/* Focal Official Studio Banner Display */}
          <div className="lg:col-span-7">
            <figure className="bg-[#121216] border border-white/12 rounded-2xl p-3 sm:p-4">
              {!bannerError ? (
                <div className="overflow-hidden rounded-xl bg-[#0B0B0E]">
                  <img
                    src={STUDIO_CONTACT.bannerPath}
                    alt="Star Event Live official banner showcasing live streaming for cricket matches, haldi, birthday, wedding, and all other events on YouTube, Facebook, and Instagram. Contact 9890175727."
                    referrerPolicy="no-referrer"
                    onError={() => setBannerError(true)}
                    className="w-full h-auto block object-contain"
                  />
                </div>
              ) : (
                <div className="aspect-[2/1] rounded-xl bg-gradient-to-br from-[#2B080A] via-[#131317] to-[#0B0F1A] border border-white/10 flex flex-col items-center justify-center p-8 text-center">
                  <Video className="w-10 h-10 text-[#FACC15] mb-3" aria-hidden="true" />
                  <p className="font-display text-2xl font-extrabold text-white">
                    {STUDIO_CONTACT.brand}
                  </p>
                  <p className="text-sm text-zinc-300 mt-2">
                    {STUDIO_CONTACT.promiseMr}
                  </p>
                  <p className="font-mono text-base font-bold text-[#FACC15] mt-3 tabular-nums">
                    {STUDIO_CONTACT.phoneDisplay}
                  </p>
                </div>
              )}

              <figcaption className="mt-3 px-1 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                <span>{UI_COPY.hero.bannerCaption[lang]}</span>
                <span className="font-mono text-zinc-300 tabular-nums">
                  {lang === 'mr' ? 'संपर्क:' : 'Hotline:'} {STUDIO_CONTACT.phoneDisplay}
                </span>
              </figcaption>
            </figure>
          </div>
        </div>

        {/* Full-width 4-column studio capability strip below hero */}
        <div className="mt-12 pt-8 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {UI_COPY.hero.stats.map((stat) => (
            <div key={stat.value} className="space-y-1.5">
              <p className="font-mono text-lg sm:text-xl font-bold text-[#FACC15] tabular-nums">
                {stat.value}
              </p>
              <p className="text-sm font-semibold text-white">{stat.label[lang]}</p>
              <p className="text-xs text-zinc-400 leading-relaxed">{stat.detail[lang]}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
