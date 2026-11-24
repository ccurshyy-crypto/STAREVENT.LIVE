import { Instagram, Youtube } from 'lucide-react';
import { Language, STUDIO_CONTACT, UI_COPY } from '../data/content';
import { ScrollReveal } from './ScrollReveal';
import { SpinningLogoVideo } from './SpinningLogoVideo';

interface FooterProps {
  lang: Language;
  onNavigateHome: (sectionId?: string) => void;
  onNavigateServices: () => void;
  onNavigateOverlays: () => void;
  onNavigatePackages: () => void;
  onNavigateBooking: () => void;
}

export function Footer({
  lang,
  onNavigateHome,
  onNavigateServices,
  onNavigateOverlays,
  onNavigatePackages,
  onNavigateBooking,
}: FooterProps) {
  return (
    <footer className="relative z-10 border-t-2 border-[#FFE600]/45 bg-[#070B28]/96 py-12">
      <ScrollReveal>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <SpinningLogoVideo
              className="w-16 h-16 sm:w-20 sm:h-20"
              resolution={128}
              label="Star Event Live 3D logo"
            />
            <div className="space-y-1">
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigateHome('top');
                }}
                className="font-display text-xl sm:text-2xl font-black tracking-tight text-white inline-flex items-center gap-2"
              >
                <span className="text-[#FFE600]">STAR EVENT</span>
                <span className="px-2 py-0.5 rounded bg-[#E11D1D] text-white text-sm sm:text-base font-black border border-white/25">
                  LIVE
                </span>
              </a>
              <p className="text-xs sm:text-sm text-[#E2E8F8]/90 leading-relaxed">
                {STUDIO_CONTACT.promise[lang]}
              </p>
            </div>
          </div>

          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap items-center gap-5 sm:gap-6 text-xs sm:text-sm font-medium text-white/90"
          >
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome('top');
              }}
              className="hover:text-[#FFE600] transition-colors whitespace-nowrap"
            >
              {UI_COPY.nav.home[lang]}
            </a>
            <a
              href="/services"
              onClick={(e) => {
                e.preventDefault();
                onNavigateServices();
              }}
              className="hover:text-[#FFE600] transition-colors whitespace-nowrap"
            >
              {UI_COPY.nav.services[lang]}
            </a>
            <a
              href="/overlays"
              onClick={(e) => {
                e.preventDefault();
                onNavigateOverlays();
              }}
              className="hover:text-[#FFE600] transition-colors whitespace-nowrap"
            >
              {UI_COPY.nav.studio[lang]}
            </a>
            <a
              href="/packages"
              onClick={(e) => {
                e.preventDefault();
                onNavigatePackages();
              }}
              className="hover:text-[#FFE600] transition-colors whitespace-nowrap"
            >
              {UI_COPY.nav.packages[lang]}
            </a>
            <a
              href="/booking"
              onClick={(e) => {
                e.preventDefault();
                onNavigateBooking();
              }}
              className="hover:text-[#FFE600] transition-colors whitespace-nowrap"
            >
              {UI_COPY.nav.book[lang]}
            </a>
          </nav>
        </div>

        <div className="pt-6 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-white/75">
          <p className="font-mono text-white/85 flex flex-wrap items-center gap-2">
            <span>{STUDIO_CONTACT.domain}</span>
            <span aria-hidden="true" className="text-[#FFE600]/60">·</span>
            <a
              href={STUDIO_CONTACT.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-white hover:text-[#FFE600] transition-colors whitespace-nowrap"
            >
              <Youtube className="w-3.5 h-3.5 text-[#FF2E2E] shrink-0" aria-hidden="true" />
              <span>YouTube ({STUDIO_CONTACT.youtubeHandle})</span>
            </a>
            {STUDIO_CONTACT.instagramAccounts.map((ig) => (
              <span key={ig.handle} className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="text-[#FFE600]/60">·</span>
                <a
                  href={ig.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-white hover:text-[#FFE600] transition-colors whitespace-nowrap"
                >
                  <Instagram className="w-3.5 h-3.5 text-[#F472B6] shrink-0" aria-hidden="true" />
                  <span>{ig.handle}</span>
                </a>
              </span>
            ))}
          </p>
          <div className="flex flex-wrap items-center gap-3 font-mono text-white/85 tabular-nums">
            <span>
              {lang === 'mr' ? 'संपर्क:' : lang === 'hi' ? 'संपर्क:' : lang === 'gu' ? 'સંપર્ક:' : 'Contact:'}{' '}
              <a
                href={STUDIO_CONTACT.phoneHref}
                className="text-[#FFE600] font-bold hover:text-white transition-colors"
              >
                {STUDIO_CONTACT.phoneDisplay}
              </a>{' '}
              · © {new Date().getFullYear()} {STUDIO_CONTACT.brand}
            </span>
          </div>
        </div>
      </div>
      </ScrollReveal>
    </footer>
  );
}
