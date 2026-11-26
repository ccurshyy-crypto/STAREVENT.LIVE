import { type MouseEvent, useState } from 'react';
import { KeyRound, LockOpen, Menu, Phone, X } from 'lucide-react';
import { useOverlayAccess } from '../context/OverlayAccessContext';
import { Language, STUDIO_CONTACT, UI_COPY } from '../data/content';
import { LanguageSwitcher } from './LanguageSwitcher';

export type MainPageRoute = 'home' | 'services' | 'overlays' | 'kabaddi' | 'packages' | 'booking';

interface NavbarProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  currentPage: MainPageRoute;
  onNavigateHome: (sectionId?: string) => void;
  onNavigateServices: () => void;
  onNavigateOverlays: () => void;
  onNavigateKabaddi: () => void;
  onNavigatePackages: () => void;
  onNavigateBooking: () => void;
  onOpenAccessModal: () => void;
}

export function Navbar({
  lang,
  onChangeLang,
  currentPage,
  onNavigateHome,
  onNavigateServices,
  onNavigateOverlays,
  onNavigateKabaddi,
  onNavigatePackages,
  onNavigateBooking,
  onOpenAccessModal,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { session, isUnlocked } = useOverlayAccess();

  const navItems: Array<{
    id: string;
    href: string;
    label: string;
    page?: MainPageRoute;
  }> = [
    { id: 'top', href: '/', label: UI_COPY.nav.home[lang], page: 'home' },
    { id: 'services', href: '/services', label: UI_COPY.nav.services[lang], page: 'services' },
    { id: 'overlays', href: '/overlays', label: UI_COPY.nav.studio[lang], page: 'overlays' },
    {
      id: 'kabaddi',
      href: '/kabaddi',
      label: lang === 'mr' ? 'कबड्डी' : lang === 'hi' ? 'कबड्डी' : lang === 'gu' ? 'કબડ્ડી' : 'Kabaddi',
      page: 'kabaddi',
    },
    { id: 'packages', href: '/packages', label: UI_COPY.nav.packages[lang], page: 'packages' },
    { id: 'book', href: '/booking', label: UI_COPY.nav.book[lang], page: 'booking' },
  ];

  const handleNavClick = (
    e: MouseEvent<HTMLAnchorElement>,
    item: (typeof navItems)[number]
  ) => {
    e.preventDefault();
    setMobileOpen(false);
    if (item.page === 'home') {
      onNavigateHome('top');
    } else if (item.page === 'services') {
      onNavigateServices();
    } else if (item.page === 'overlays') {
      onNavigateOverlays();
    } else if (item.page === 'kabaddi') {
      onNavigateKabaddi();
    } else if (item.page === 'packages') {
      onNavigatePackages();
    } else if (item.page === 'booking') {
      onNavigateBooking();
    } else {
      onNavigateHome(item.id);
    }
  };

  return (
    <header className="sticky top-0 z-40 topbar-animated-bg backdrop-blur-md border-b border-[#FFE600]/35">
      {/* Subtle animated crimson-gold bottom accent beam */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden"
      >
        <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-[#FFE600] via-50% to-[#E11D1D] opacity-90 topbar-beam-sweep" />
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto min-h-[60px] sm:min-h-[68px] py-2 px-2.5 sm:px-4 lg:px-6 xl:px-8 flex items-center justify-between gap-2 lg:gap-3">
        {/* Zone 1: Star Event Live Brand (never clipped on mobile or desktop) */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setMobileOpen(false);
            onNavigateHome('top');
          }}
          className="inline-flex items-center gap-1.5 sm:gap-2.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600] rounded-xl"
        >
          <span className="w-8 h-8 min-[380px]:w-9 min-[380px]:h-9 sm:w-10 sm:h-10 xl:w-11 xl:h-11 rounded-full bg-black p-[1.5px] ring-2 ring-[#FFE600]/85 shadow-[0_0_16px_rgba(255,230,0,0.45)] flex items-center justify-center shrink-0 overflow-hidden">
            <img
              src={STUDIO_CONTACT.logoImagePath}
              alt="Star Event Live Official Logo"
              loading="eager"
              decoding="async"
              className="w-full h-full object-cover rounded-full"
            />
          </span>
          <span className="flex flex-col leading-none shrink-0">
            <span className="font-display text-[13px] min-[380px]:text-[15px] sm:text-lg xl:text-xl font-black tracking-tight flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
              <span className="text-[#FFE600] drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]">STAR EVENT</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#E11D1D] text-white text-[9px] min-[380px]:text-[10px] sm:text-xs font-black tracking-wide border border-white/25 shadow-sm shrink-0">
                LIVE
              </span>
            </span>
            <span className="hidden sm:block font-mono text-[10px] text-[#FFE8D6]/80 tracking-wider mt-0.5">
              starevent.live
            </span>
          </span>
        </a>

        {/* Zone 2: Desktop Navigation */}
        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex items-center justify-center gap-3.5 xl:gap-5 2xl:gap-6 text-[13px] xl:text-sm font-semibold text-white min-w-0"
        >
          {navItems.map((item) => {
            const isActive = Boolean(item.page && currentPage === item.page);
            return (
              <a
                key={item.id}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                onClick={(e) => handleNavClick(e, item)}
                className={`py-1.5 transition-colors duration-150 whitespace-nowrap shrink-0 border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600] ${
                  isActive
                    ? 'text-[#FFE600] border-[#FFE600]'
                    : 'text-white/95 hover:text-[#FFE600] border-transparent hover:border-[#FFE600]/80'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Language + Overlay Access + Call + Mobile Menu */}
        <div className="flex items-center gap-1 sm:gap-1.5 xl:gap-2 shrink-0">
          <LanguageSwitcher lang={lang} onChangeLang={onChangeLang} variant="dropdown" />

          <button
            type="button"
            onClick={onOpenAccessModal}
            className={`min-h-[36px] sm:min-h-[38px] inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] ${
              isUnlocked
                ? 'bg-emerald-950/90 hover:bg-emerald-900 text-emerald-200 border border-emerald-400/45'
                : 'btn-glass-pro text-zinc-100'
            }`}
          >
            {isUnlocked && session ? (
              <>
                <LockOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                <span className="max-w-[52px] min-[420px]:max-w-[78px] lg:max-w-[84px] xl:max-w-[110px] truncate font-mono text-[11px] sm:text-xs">
                  {session.accessId}
                </span>
              </>
            ) : (
              <>
                <KeyRound className="w-3.5 h-3.5 text-[#FFE600] shrink-0" aria-hidden="true" />
                <span className="hidden xl:inline">Unlock Overlays</span>
                <span className="xl:hidden">Unlock</span>
              </>
            )}
          </button>

          <a
            href={STUDIO_CONTACT.phoneHref}
            className="btn-primary-pro hidden sm:inline-flex min-h-[38px] items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] tabular-nums"
          >
            <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden 2xl:inline">{UI_COPY.nav.callCta[lang]}</span>
            <span className="2xl:hidden">Call</span>
          </a>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="lg:hidden inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-white/18 bg-white/[0.05] text-zinc-100 hover:text-white hover:border-[#FACC15]/60 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Responsive Mobile & Tablet Drawer */}
      {mobileOpen && (
        <nav
          aria-label="Mobile navigation"
          className="lg:hidden bg-[#070B28]/98 backdrop-blur-md border-t border-[#FFE600]/25 px-4 py-4 space-y-1.5 shadow-2xl"
        >
          {navItems.map((item) => {
            const isActive = Boolean(item.page && currentPage === item.page);
            return (
              <a
                key={item.id}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                onClick={(e) => handleNavClick(e, item)}
                className={`block min-h-[44px] px-4 py-2.5 text-base font-semibold rounded-xl transition-colors ${
                  isActive
                    ? 'text-[#FFE600] bg-[#FFE600]/12 border border-[#FFE600]/40'
                    : 'text-white hover:text-[#FFE600] hover:bg-white/8'
                }`}
              >
                {item.label}
              </a>
            );
          })}

          <div className="pt-2 border-t border-white/10">
            <a
              href={STUDIO_CONTACT.phoneHref}
              className="btn-primary-pro w-full min-h-[46px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl tabular-nums"
            >
              <Phone className="w-4 h-4 text-[#FACC15]" aria-hidden="true" />
              <span>{UI_COPY.nav.callCta[lang]}</span>
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
