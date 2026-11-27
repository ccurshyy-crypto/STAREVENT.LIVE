import { useEffect, useState } from 'react';
import { BookingCalendarSection } from './components/BookingCalendarSection';
import { BookingPage } from './components/BookingPage';
import { BookingSection } from './components/BookingSection';
import { BroadcastStingerSection } from './components/BroadcastStingerSection';
import { Footer } from './components/Footer';
import { HeroSection } from './components/HeroSection';
import { HomeAnimatedBackground } from './components/HomeAnimatedBackground';
import { Navbar, MainPageRoute } from './components/Navbar';
import { NewThemesShowcaseSection } from './components/NewThemesShowcaseSection';
import { OverlayAccessModal } from './components/OverlayAccessModal';
import { OverlaysPage } from './components/OverlaysPage';
import { PackagesPage } from './components/PackagesPage';
import { PartnerAdSection } from './components/PartnerAdSection';
import { ServicesPage } from './components/ServicesPage';
import { SoftwareOffersSection } from './components/SoftwareOffersSection';
import { StingerOverlaysOfferSection } from './components/StingerOverlaysOfferSection';
import { StudioSpotlightSection } from './components/StudioSpotlightSection';
import { OwnerAdminPage } from './components/OwnerAdminPage';
import { StandaloneOverlayPage } from './components/cricket/StandaloneOverlayPage';
import { KabaddiControlDashboard } from './components/kabaddi/KabaddiControlDashboard';
import { StandaloneKabaddiOverlayPage } from './components/kabaddi/StandaloneKabaddiOverlayPage';
import { ScrollDotNav } from './components/ScrollDotNav';
import { useOverlayAccess } from './context/OverlayAccessContext';
import { EventCategoryId, Language } from './data/content';

type PageRoute = MainPageRoute;

function isStandaloneOverlayRoute(): boolean {
  if (typeof window === 'undefined') return false;
  return /^\/overlay\/?$/i.test(window.location.pathname);
}

function isStandaloneKabaddiOverlayRoute(): boolean {
  if (typeof window === 'undefined') return false;
  return /^\/kabaddi-overlay\/?$/i.test(window.location.pathname);
}

function isOwnerAdminRoute(): boolean {
  if (typeof window === 'undefined') return false;
  return /^\/owner-admin\/?$/i.test(window.location.pathname);
}

function getOverlayUidFromUrl(): string {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  return (params.get('id') || params.get('uid') || '').trim();
}

function getOverlayMatchIdFromUrl(): string {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  return params.get('match') || '';
}

function getInitialPage(): PageRoute {
  if (typeof window === 'undefined') return 'home';
  if (window.location.pathname.startsWith('/services')) return 'services';
  if (window.location.pathname.startsWith('/overlays')) return 'overlays';
  if (window.location.pathname.startsWith('/kabaddi')) return 'kabaddi';
  if (window.location.pathname.startsWith('/packages')) return 'packages';
  if (window.location.pathname.startsWith('/booking')) return 'booking';
  return 'home';
}

export default function App() {
  const [standaloneOverlay, setStandaloneOverlay] = useState<boolean>(() =>
    isStandaloneOverlayRoute()
  );
  const [standaloneKabaddiOverlay, setStandaloneKabaddiOverlay] = useState<boolean>(() =>
    isStandaloneKabaddiOverlayRoute()
  );
  const [ownerAdminRoute, setOwnerAdminRoute] = useState<boolean>(() =>
    isOwnerAdminRoute()
  );
  const [overlayUid, setOverlayUid] = useState<string>(() => getOverlayUidFromUrl());
  const [overlayMatchId, setOverlayMatchId] = useState<string>(() =>
    getOverlayMatchIdFromUrl()
  );
  const [lang, setLang] = useState<Language>('en');
  const [currentPage, setCurrentPage] = useState<PageRoute>(() => getInitialPage());
  const [selectedEvent, setSelectedEvent] = useState<EventCategoryId>('kabaddi');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('multi-cam-pro');
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [selectedBookingDate, setSelectedBookingDate] = useState<string>('');
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const { session, isUnlocked } = useOverlayAccess();
  const isDashboardFullscreen = currentPage === 'overlays' && isUnlocked;

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const handlePopState = () => {
      setStandaloneOverlay(isStandaloneOverlayRoute());
      setStandaloneKabaddiOverlay(isStandaloneKabaddiOverlayRoute());
      setOwnerAdminRoute(isOwnerAdminRoute());
      setOverlayUid(getOverlayUidFromUrl());
      setOverlayMatchId(getOverlayMatchIdFromUrl());
      setCurrentPage(getInitialPage());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navigateToOverlays = () => {
    const isPageChange = currentPage !== 'overlays';
    if (window.location.pathname !== '/overlays') {
      window.history.pushState({}, '', '/overlays');
    }
    setCurrentPage('overlays');
    if (isPageChange) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const navigateToKabaddi = () => {
    const isPageChange = currentPage !== 'kabaddi';
    if (window.location.pathname !== '/kabaddi') {
      window.history.pushState({}, '', '/kabaddi');
    }
    setCurrentPage('kabaddi');
    if (isPageChange) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const navigateToServices = () => {
    const isPageChange = currentPage !== 'services';
    if (window.location.pathname !== '/services') {
      window.history.pushState({}, '', '/services');
    }
    setCurrentPage('services');
    if (isPageChange) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const navigateToPackages = () => {
    const isPageChange = currentPage !== 'packages';
    if (window.location.pathname !== '/packages') {
      window.history.pushState({}, '', '/packages');
    }
    setCurrentPage('packages');
    if (isPageChange) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const navigateToBooking = () => {
    const isPageChange = currentPage !== 'booking';
    if (window.location.pathname !== '/booking') {
      window.history.pushState({}, '', '/booking');
    }
    setCurrentPage('booking');
    if (isPageChange) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const navigateHome = (sectionId?: string) => {
    setOwnerAdminRoute(false);
    setStandaloneOverlay(false);
    setStandaloneKabaddiOverlay(false);
    const wasOnHome =
      currentPage === 'home' &&
      !ownerAdminRoute &&
      !standaloneOverlay &&
      !standaloneKabaddiOverlay;
    const targetUrl = sectionId && sectionId !== 'top' ? `/#${sectionId}` : '/';
    if (
      window.location.pathname !== '/' ||
      (sectionId && window.location.hash !== `#${sectionId}`)
    ) {
      window.history.pushState({}, '', targetUrl);
    }

    if (!wasOnHome) {
      setCurrentPage('home');
      window.setTimeout(() => {
        if (!sectionId || sectionId === 'top') {
          window.scrollTo({ top: 0, behavior: 'auto' });
        } else {
          scrollToSection(sectionId);
        }
      }, 60);
    } else if (!sectionId || sectionId === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      scrollToSection(sectionId);
    }
  };

  const handleBookEvent = (category: EventCategoryId) => {
    setSelectedEvent(category);
    if (category === 'cricket' || category === 'kabaddi') {
      setSelectedPackageId('cricket-tournament');
    } else if (category === 'wedding' || category === 'other') {
      setSelectedPackageId('multi-cam-pro');
    } else {
      setSelectedPackageId('single-cam-live');
    }
    navigateToBooking();
  };

  const handleToggleAddOn = (addonId: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  const handleSelectPackage = (packageId: string) => {
    setSelectedPackageId(packageId);
    navigateToBooking();
  };

  const handleSelectDateForBooking = (isoDate: string) => {
    setSelectedBookingDate(isoDate);
  };

  const handleOpenAccessModal = () => {
    setAccessModalOpen(true);
  };

  const navigateToOwnerAdmin = () => {
    setAccessModalOpen(false);
    setStandaloneOverlay(false);
    if (window.location.pathname !== '/owner-admin') {
      window.history.pushState({}, '', '/owner-admin');
    }
    setOwnerAdminRoute(true);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  if (standaloneOverlay) {
    return (
      <StandaloneOverlayPage
        uid={overlayUid}
        matchId={overlayMatchId || undefined}
      />
    );
  }

  if (standaloneKabaddiOverlay) {
    return <StandaloneKabaddiOverlayPage uid={overlayUid || 'STAR-KABADDI'} />;
  }

  if (ownerAdminRoute) {
    return <OwnerAdminPage onBackHome={() => navigateHome('top')} />;
  }

  return (
    <div className="site-animated-ui relative min-h-screen bg-[#3B0207] text-white flex flex-col overflow-x-clip">
      <HomeAnimatedBackground />

      {!isDashboardFullscreen && (
        <Navbar
          lang={lang}
          onChangeLang={setLang}
          currentPage={currentPage}
          onNavigateHome={navigateHome}
          onNavigateServices={navigateToServices}
          onNavigateOverlays={navigateToOverlays}
          onNavigateKabaddi={navigateToKabaddi}
          onNavigatePackages={navigateToPackages}
          onNavigateBooking={navigateToBooking}
          onOpenAccessModal={handleOpenAccessModal}
        />
      )}

      <main className="relative z-10 flex-1">
        <div key={currentPage} className="page-transition-enter">
          {currentPage === 'services' ? (
            <ServicesPage
              lang={lang}
              onBookEvent={handleBookEvent}
              onBackHome={() => navigateHome('top')}
            />
          ) : currentPage === 'overlays' ? (
            <OverlaysPage
              lang={lang}
              onBackHome={() => navigateHome('top')}
            />
          ) : currentPage === 'kabaddi' ? (
            <KabaddiControlDashboard
              uid={session?.accessId || 'STAR-KABADDI'}
              onBackHome={() => navigateHome('top')}
            />
          ) : currentPage === 'packages' ? (
            <PackagesPage
              lang={lang}
              selectedPackageId={selectedPackageId}
              selectedAddOns={selectedAddOns}
              onToggleAddOn={handleToggleAddOn}
              onSelectPackage={handleSelectPackage}
              onBackHome={() => navigateHome('top')}
              onGoToBooking={navigateToBooking}
            />
          ) : currentPage === 'booking' ? (
            <BookingPage
              lang={lang}
              selectedEvent={selectedEvent}
              onChangeEvent={setSelectedEvent}
              selectedPackageId={selectedPackageId}
              onChangePackage={setSelectedPackageId}
              selectedAddOns={selectedAddOns}
              selectedDate={selectedBookingDate}
              onChangeDate={setSelectedBookingDate}
              onOpenPackages={navigateToPackages}
              onBackHome={() => navigateHome('top')}
            />
          ) : (
            <>
              <StingerOverlaysOfferSection
                lang={lang}
                onOpenOverlays={navigateToOverlays}
              />

              <NewThemesShowcaseSection
                lang={lang}
                onOpenOverlays={navigateToOverlays}
              />

              <SoftwareOffersSection lang={lang} />

              <BookingCalendarSection
                lang={lang}
                heading="BOOKING UR ORDER"
                onSelectDateForBooking={handleSelectDateForBooking}
              />

              <HeroSection
                lang={lang}
                onOpenOverlays={navigateToOverlays}
              />

              <PartnerAdSection
                lang={lang}
                onBookNow={navigateToBooking}
              />

              <StudioSpotlightSection
                lang={lang}
                onBookNow={navigateToBooking}
              />

              <BroadcastStingerSection
                lang={lang}
                onOpenOverlays={navigateToOverlays}
              />

              <BookingSection
                lang={lang}
                selectedEvent={selectedEvent}
                onChangeEvent={setSelectedEvent}
                selectedPackageId={selectedPackageId}
                onChangePackage={setSelectedPackageId}
                selectedAddOns={selectedAddOns}
                selectedDate={selectedBookingDate}
                onChangeDate={setSelectedBookingDate}
                onOpenPackages={navigateToPackages}
              />
            </>
          )}
        </div>
      </main>

      {!isDashboardFullscreen && (
        <Footer
          lang={lang}
          onNavigateHome={navigateHome}
          onNavigateServices={navigateToServices}
          onNavigateOverlays={navigateToOverlays}
          onNavigatePackages={navigateToPackages}
          onNavigateBooking={navigateToBooking}
          onOpenOwnerAdmin={navigateToOwnerAdmin}
        />
      )}

      <ScrollDotNav
        pageKey={`${currentPage}-${isDashboardFullscreen ? 'suite' : 'site'}`}
        variant={
          isDashboardFullscreen || currentPage === 'kabaddi'
            ? 'orange-suite'
            : 'crimson-gold'
        }
      />

      <OverlayAccessModal
        open={accessModalOpen}
        onClose={() => setAccessModalOpen(false)}
        onUnlockedSuccess={navigateToOverlays}
        onOpenOwnerAdmin={navigateToOwnerAdmin}
      />
    </div>
  );
}
