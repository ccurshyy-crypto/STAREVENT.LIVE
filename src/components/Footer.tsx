import { Language, STUDIO_CONTACT, UI_COPY } from '../data/content';
import { SpinningLogoVideo } from './SpinningLogoVideo';

interface FooterProps {
  lang: Language;
  onNavigateHome: (sectionId?: string) => void;
  onNavigateOverlays: () => void;
  onOpenAdmin: () => void;
}

export function Footer({
  lang,
  onNavigateHome,
  onNavigateOverlays,
  onOpenAdmin,
}: FooterProps) {
  return (
    <footer className="border-t border-white/10 bg-[#09090B] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <SpinningLogoVideo
              className="w-12 h-12"
              resolution={160}
              label="Star Event Live 3D logo"
            />
            <div className="space-y-1">
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigateHome('top');
                }}
                className="font-display text-lg font-extrabold tracking-tight text-white inline-block"
              >
                <span className="text-[#FACC15]">STAR EVENT</span>{' '}
                <span className="text-[#EF4444]">LIVE</span>
              </a>
              <p className="text-xs sm:text-sm text-zinc-400">
                {lang === 'mr' ? STUDIO_CONTACT.promiseMr : STUDIO_CONTACT.promiseEn}
              </p>
            </div>
          </div>

          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap items-center gap-6 text-xs sm:text-sm text-zinc-400"
          >
            <a
              href="/#services"
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome('services');
              }}
              className="hover:text-white transition-colors whitespace-nowrap"
            >
              {UI_COPY.nav.services[lang]}
            </a>
            <a
              href="/overlays"
              onClick={(e) => {
                e.preventDefault();
                onNavigateOverlays();
              }}
              className="hover:text-white transition-colors whitespace-nowrap"
            >
              {UI_COPY.nav.studio[lang]}
            </a>
            <a
              href="/#packages"
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome('packages');
              }}
              className="hover:text-white transition-colors whitespace-nowrap"
            >
              {UI_COPY.nav.packages[lang]}
            </a>
            <a
              href="/#book"
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome('book');
              }}
              className="hover:text-white transition-colors whitespace-nowrap"
            >
              {UI_COPY.nav.book[lang]}
            </a>
          </nav>
        </div>

        <div className="pt-6 border-t border-white/8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-500">
          <p className="font-mono text-zinc-400">
            {STUDIO_CONTACT.domain} · YouTube · Facebook · Instagram Live
          </p>
          <div className="flex flex-wrap items-center gap-3 font-mono text-zinc-400 tabular-nums">
            <span>
              {lang === 'mr' ? 'संपर्क:' : 'Contact:'}{' '}
              <a
                href={STUDIO_CONTACT.phoneHref}
                className="text-[#FACC15] hover:text-white transition-colors"
              >
                {STUDIO_CONTACT.phoneDisplay}
              </a>{' '}
              · © {new Date().getFullYear()} {STUDIO_CONTACT.brand}
            </span>
            <span aria-hidden="true" className="text-zinc-700">·</span>
            <button
              type="button"
              onClick={onOpenAdmin}
              className="text-zinc-500 hover:text-[#FACC15] transition-colors whitespace-nowrap"
            >
              {lang === 'mr' ? 'ओनर व्हेरिफाय' : 'Owner Verify'}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
