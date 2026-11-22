import { type MouseEvent, useState } from 'react';
import { Menu, Phone, ShieldCheck, UserCircle2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Language, STUDIO_CONTACT, UI_COPY } from '../data/content';
import { LanguageSwitcher } from './LanguageSwitcher';

export type MainPageRoute = 'home' | 'services' | 'overlays' | 'packages';

interface NavbarProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  currentPage: MainPageRoute;
  onNavigateHome: (sectionId?: string) => void;
  onNavigateServices: () => void;
  onNavigateOverlays: () => void;
  onNavigatePackages: () => void;
  onOpenAccountPortal: (tab?: 'operator' | 'admin') => void;
}

export function Navbar({
  lang,
  onChangeLang,
  currentPage,
  onNavigateHome,
  onNavigateServices,
  onNavigateOverlays,
  onNavigatePackages,
  onOpenAccountPortal,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isSuperAdmin, userAccount } = useAuth();

  const navItems: Array<{
    id: string;
    href: string;
    label: string;
    page?: MainPageRoute;
  }> = [
    { id: 'top', href: '/', label: UI_COPY.nav.home[lang], page: 'home' },
    { id: 'services', href: '/services', label: UI_COPY.nav.services[lang], page: 'services' },
    { id: 'overlays', href: '/overlays', label: UI_COPY.nav.studio[lang], page: 'overlays' },
    { id: 'packages', href: '/packages', label: UI_COPY.nav.packages[lang], page: 'packages' },
    { id: 'book', href: '/#book', label: UI_COPY.nav.book[lang] },
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
    } else if (item.page === 'packages') {
      onNavigatePackages();
    } else {
      onNavigateHome(item.id);
    }
  };

  return (
    <header className="sticky top-0 z-40 topbar-animated-bg backdrop-blur-md border-b border-[#FACC15]/25">
      {/* Subtle animated crimson-gold bottom accent beam */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden"
      >
        <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-[#FACC15] via-50% to-[#EF4444] opacity-85 topbar-beam-sweep" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto min-h-[72px] py-2 px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4">
        {/* Zone 1: Prominent Star Event Live Emblem + Large Bold Name */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setMobileOpen(false);
            onNavigateHome('top');
          }}
          className="inline-flex items-center gap-2.5 sm:gap-3 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] rounded-xl"
        >
          <span
            aria-hidden="true"
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-[#FACC15] via-[#DC2626] to-[#7F1D1D] p-[2px] shadow-[0_0_18px_rgba(250,204,21,0.45)] flex items-center justify-center shrink-0"
          >
            <span className="w-full h-full rounded-full bg-[#13060A] flex flex-col items-center justify-center leading-none">
              <span className="text-[#FACC15] text-base sm:text-lg leading-none">★</span>
              <span className="font-display text-[7px] sm:text-[8px] font-black tracking-wider text-white">
                LIVE
              </span>
            </span>
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-lg sm:text-2xl font-black tracking-tight">
              <span className="text-[#FACC15]">STAR EVENT</span>{' '}
              <span className="text-[#EF4444]">LIVE</span>
            </span>
            <span className="hidden sm:block font-mono text-[10px] text-zinc-400 tracking-wider mt-0.5">
              starevent.live
            </span>
          </span>
        </a>

        {/* Zone 2: Desktop & Tablet Navigation */}
        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex items-center gap-6 text-sm font-semibold text-zinc-200"
        >
          {navItems.map((item) => {
            const isActive = Boolean(item.page && currentPage === item.page);
            return (
              <a
                key={item.id}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                onClick={(e) => handleNavClick(e, item)}
                className={`py-1.5 transition-colors duration-150 whitespace-nowrap shrink-0 border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] ${
                  isActive
                    ? 'text-[#FACC15] border-[#FACC15]'
                    : 'text-zinc-200 hover:text-white border-transparent hover:border-[#FACC15]/70'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Language + Login/Admin + Call + Mobile/Tablet Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <LanguageSwitcher lang={lang} onChangeLang={onChangeLang} variant="dropdown" />

          <button
            type="button"
            onClick={() => onOpenAccountPortal(isSuperAdmin ? 'admin' : 'operator')}
            className={`min-h-[40px] inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] ${
              isSuperAdmin
                ? 'btn-gold-pro text-black'
                : userAccount
                  ? 'bg-[#172554] hover:bg-[#1E3A8A] text-[#93C5FD] border border-[#38BDF8]/45'
                  : 'btn-glass-pro text-zinc-100'
            }`}
          >
            {isSuperAdmin ? (
              <>
                <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Admin</span>
              </>
            ) : userAccount ? (
              <>
                <UserCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="max-w-[76px] sm:max-w-[100px] truncate font-mono text-xs">
                  {userAccount.loginId}
                </span>
              </>
            ) : (
              <>
                <UserCircle2 className="w-4 h-4 text-[#FACC15] shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">Login / Sign Up</span>
                <span className="sm:hidden">Login</span>
              </>
            )}
          </button>

          <a
            href={STUDIO_CONTACT.phoneHref}
            className="btn-primary-pro hidden sm:inline-flex min-h-[40px] items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] tabular-nums"
          >
            <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden xl:inline">{UI_COPY.nav.callCta[lang]}</span>
            <span className="xl:hidden">Call</span>
          </a>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-white/18 bg-white/[0.05] text-zinc-100 hover:text-white hover:border-[#FACC15]/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Responsive Mobile & Tablet Drawer */}
      {mobileOpen && (
        <nav
          aria-label="Mobile navigation"
          className="lg:hidden bg-[#120A10]/98 backdrop-blur-md border-t border-white/10 px-4 py-4 space-y-1.5 shadow-2xl"
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
                    ? 'text-[#FACC15] bg-[#FACC15]/12 border border-[#FACC15]/30'
                    : 'text-zinc-100 hover:text-white hover:bg-white/6'
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
