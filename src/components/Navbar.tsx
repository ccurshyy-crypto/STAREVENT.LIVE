import { type MouseEvent, useState } from 'react';
import { Menu, Phone, X } from 'lucide-react';
import { Language, STUDIO_CONTACT, UI_COPY } from '../data/content';

interface NavbarProps {
  lang: Language;
  currentPage: 'home' | 'overlays';
  onNavigateHome: (sectionId?: string) => void;
  onNavigateOverlays: () => void;
}

export function Navbar({
  lang,
  currentPage,
  onNavigateHome,
  onNavigateOverlays,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: Array<{
    id: string;
    href: string;
    label: string;
    isOverlays?: boolean;
  }> = [
    { id: 'services', href: '/#services', label: UI_COPY.nav.services[lang] },
    { id: 'overlays', href: '/overlays', label: UI_COPY.nav.studio[lang], isOverlays: true },
    { id: 'packages', href: '/#packages', label: UI_COPY.nav.packages[lang] },
    { id: 'book', href: '/#book', label: UI_COPY.nav.book[lang] },
  ];

  const handleNavClick = (
    e: MouseEvent<HTMLAnchorElement>,
    item: (typeof navItems)[number]
  ) => {
    e.preventDefault();
    setMobileOpen(false);
    if (item.isOverlays) {
      onNavigateOverlays();
    } else {
      onNavigateHome(item.id);
    }
  };

  return (
    <header className="sticky top-0 z-40 h-16 bg-[#09090B]/92 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
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

        {/* Zone 2: 4 concise single-line text links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-300"
        >
          {navItems.map((item) => {
            const isActive = Boolean(item.isOverlays && currentPage === 'overlays');
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

        {/* Zone 3: Single primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href={STUDIO_CONTACT.phoneHref}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B] tabular-nums"
          >
            <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{UI_COPY.nav.callCta[lang]}</span>
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
          className="md:hidden bg-[#111115] border-b border-white/10 px-4 py-4 space-y-1"
        >
          {navItems.map((item) => {
            const isActive = Boolean(item.isOverlays && currentPage === 'overlays');
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
