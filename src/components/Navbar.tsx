import { type MouseEvent, useState } from 'react';
import { Menu, Phone, ShieldCheck, UserCircle2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Language, STUDIO_CONTACT, UI_COPY } from '../data/content';
import { LanguageSwitcher } from './LanguageSwitcher';

interface NavbarProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  currentPage: 'home' | 'overlays' | 'packages';
  onNavigateHome: (sectionId?: string) => void;
  onNavigateOverlays: () => void;
  onNavigatePackages: () => void;
  onOpenAccountPortal: (tab?: 'operator' | 'admin') => void;
}

export function Navbar({
  lang,
  onChangeLang,
  currentPage,
  onNavigateHome,
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
    page?: 'home' | 'overlays' | 'packages';
  }> = [
    { id: 'top', href: '/', label: UI_COPY.nav.home[lang], page: 'home' },
    { id: 'services', href: '/#services', label: UI_COPY.nav.services[lang] },
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
    } else if (item.page === 'overlays') {
      onNavigateOverlays();
    } else if (item.page === 'packages') {
      onNavigatePackages();
    } else {
      onNavigateHome(item.id);
    }
  };

  return (
    <header className="sticky top-0 z-40 h-16 topbar-animated-bg backdrop-blur-md border-b border-[#FACC15]/20 overflow-x-clip">
      {/* Subtle animated crimson-gold light beam sweeping along the bottom edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden"
      >
        <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-[#FACC15] via-50% to-[#EF4444] opacity-85 topbar-beam-sweep" />
      </div>

      {/* Soft top edge glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FACC15]/45 to-transparent"
      />

      <div className="relative z-10 max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 lg:gap-8">
        {/* Zone 1: Single-element brand wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setMobileOpen(false);
            onNavigateHome('top');
          }}
          className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] rounded"
        >
          <span className="text-[#FACC15]">STAR EVENT</span>{' '}
          <span className="text-[#EF4444]">LIVE</span>
        </a>

        {/* Zone 2: Concise single-line text links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 lg:gap-7 text-sm font-medium text-zinc-300"
        >
          {navItems.map((item) => {
            const isActive = Boolean(item.page && currentPage === item.page);
            return (
              <a
                key={item.id}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                onClick={(e) => handleNavClick(e, item)}
                className={`py-1 transition-colors duration-150 whitespace-nowrap shrink-0 border-b focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] rounded-xs ${
                  isActive
                    ? 'text-white border-[#FACC15]'
                    : 'text-zinc-300 hover:text-white border-transparent hover:border-[#FACC15]'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Language Switcher + Account/Admin Button + Call CTA */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <LanguageSwitcher lang={lang} onChangeLang={onChangeLang} variant="dropdown" />

          <button
            type="button"
            onClick={() => onOpenAccountPortal(isSuperAdmin ? 'admin' : 'operator')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] ${
              isSuperAdmin
                ? 'btn-gold-pro'
                : userAccount
                  ? 'bg-[#172554] hover:bg-[#1E3A8A] text-[#93C5FD] border border-[#38BDF8]/45'
                  : 'btn-glass-pro text-zinc-100'
            }`}
          >
            {isSuperAdmin ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Admin</span>
              </>
            ) : userAccount ? (
              <>
                <UserCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="max-w-[92px] truncate font-mono text-xs">{userAccount.loginId}</span>
              </>
            ) : (
              <>
                <UserCircle2 className="w-3.5 h-3.5 text-[#FACC15] shrink-0" aria-hidden="true" />
                <span>Login</span>
              </>
            )}
          </button>

          <a
            href={STUDIO_CONTACT.phoneHref}
            className="btn-primary-pro inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B] tabular-nums"
          >
            <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden lg:inline">{UI_COPY.nav.callCta[lang]}</span>
            <span className="lg:hidden">Call</span>
          </a>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-white/15 text-zinc-200 hover:text-white hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile slide-down drawer */}
      {mobileOpen && (
        <nav
          aria-label="Mobile navigation"
          className="md:hidden bg-[#111115]/95 backdrop-blur-md border-b border-white/10 px-4 py-4 space-y-1"
        >
          {navItems.map((item) => {
            const isActive = Boolean(item.page && currentPage === item.page);
            return (
              <a
                key={item.id}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                onClick={(e) => handleNavClick(e, item)}
                className={`block px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'text-[#FACC15] bg-white/8'
                    : 'text-zinc-200 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
      )}
    </header>
  );
}
