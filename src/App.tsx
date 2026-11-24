import { useEffect, useMemo, useState } from 'react';
import { BookingCalendarSection } from './components/BookingCalendarSection';
import { BookingPage } from './components/BookingPage';
import { BookingSection } from './components/BookingSection';
import { BroadcastStingerSection } from './components/BroadcastStingerSection';
import { Footer } from './components/Footer';
import { HeroSection } from './components/HeroSection';
import { HomeAnimatedBackground } from './components/HomeAnimatedBackground';
import { KabaddiRemoteController } from './components/KabaddiRemoteController';
import { PreviewMode } from './components/LiveStudioPreview';
import { Navbar, MainPageRoute } from './components/Navbar';
import { OverlayAccessModal } from './components/OverlayAccessModal';
import { OverlayOutputView } from './components/OverlayOutputView';
import { OverlaysPage } from './components/OverlaysPage';
import { PackagesPage } from './components/PackagesPage';
import { PartnerAdSection } from './components/PartnerAdSection';
import { ServicesPage } from './components/ServicesPage';
import { StingerOverlaysOfferSection } from './components/StingerOverlaysOfferSection';
import { StudioSpotlightSection } from './components/StudioSpotlightSection';
import { SupabaseKabaddiControllerView } from './components/SupabaseKabaddiControllerView';
import { SupabaseKabaddiOverlayView } from './components/SupabaseKabaddiOverlayView';
import { UserCricketOverlayView } from './components/UserCricketOverlayView';
import { EventCategoryId, Language } from './data/content';
import { sanitizeRoomIdClient } from './hooks/useOverlaySync';
import {
  LiveOverlayState,
  normalizeStyleForMode,
  OverlayBackground,
  OverlayMode,
  OverlayStyle,
} from './types/overlay';
import { sanitizeKabaddiMatchId } from './types/supabaseKabaddi';

const VALID_OVERLAY_MODES: OverlayMode[] = ['kabaddi', 'cricket', 'haldi'];

type PageRoute = MainPageRoute;

function getInitialPage(): PageRoute {
  if (typeof window === 'undefined') return 'home';
  if (window.location.pathname.startsWith('/services')) return 'services';
  if (window.location.pathname.startsWith('/overlays')) return 'overlays';
  if (window.location.pathname.startsWith('/packages')) return 'packages';
  if (window.location.pathname.startsWith('/booking')) return 'booking';
  return 'home';
}

function parseSupabaseControlRoute(): { matchId: string } | null {
  if (typeof window === 'undefined') return null;
  const pathMatch = window.location.pathname.match(/^\/control(?:\/([A-Za-z0-9_-]{2,64}))?\/?$/i);
  if (!pathMatch) return null;
  const params = new URLSearchParams(window.location.search);
  const rawId = params.get('id') || params.get('match') || params.get('room') || pathMatch[1];
  return { matchId: sanitizeKabaddiMatchId(rawId, 'KBD-101') };
}

function parseSupabaseOverlayRoute(): { matchId: string } | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  // Keep legacy ?overlay=kabaddi|haldi working untouched
  if (params.get('overlay')) return null;

  const isOverlayRoot = /^\/overlay\/?$/i.test(window.location.pathname);
  const scoreboardMatch = window.location.pathname.match(/^\/scoreboard\/([A-Za-z0-9_-]{2,64})\/?$/i);

  if (!isOverlayRoot && !scoreboardMatch) return null;
  const rawId =
    params.get('id') || params.get('match') || params.get('room') || scoreboardMatch?.[1];
  return { matchId: sanitizeKabaddiMatchId(rawId, 'KBD-101') };
}

function parseUserCricketOverlayRoute(): { targetUid: string; background: OverlayBackground } | null {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(/^\/cricket-overlay\/([A-Za-z0-9_-]{2,128})\/?$/);
  if (!match) return null;
  const params = new URLSearchParams(window.location.search);
  const bgParam = params.get('bg')?.toLowerCase();
  const background: OverlayBackground =
    bgParam === 'green' ? 'green' : bgParam === 'blue' ? 'blue' : 'transparent';
  return { targetUid: decodeURIComponent(match[1]), background };
}

function parseOverlayRoute() {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const queryOverlay = params.get('overlay')?.toLowerCase();

  // Support clean path URLs like /overlay/kabaddi or /overlay/haldi
  const pathMatch = window.location.pathname.match(/^\/overlay\/([a-z]+)\/?$/i);
  const pathOverlay = pathMatch ? pathMatch[1].toLowerCase() : null;

  const rawMode = queryOverlay || pathOverlay;
  if (!rawMode) return null;

  const mode: OverlayMode = VALID_OVERLAY_MODES.includes(rawMode as OverlayMode)
    ? (rawMode as OverlayMode)
    : 'kabaddi';

  const styleParam = params.get('style')?.toLowerCase();
  const style: OverlayStyle = normalizeStyleForMode(mode, styleParam);

  const bgParam = params.get('bg')?.toLowerCase();
  const background: OverlayBackground =
    bgParam === 'green' ? 'green' : bgParam === 'blue' ? 'blue' : 'transparent';

  const roomId = sanitizeRoomIdClient(params.get('match') || params.get('room') || 'star-live-1');
  const lockMode = params.get('lock') === '1' || Boolean(pathOverlay);
  const lockStyle = params.get('lock') === '1';

  const urlOverrides: Partial<LiveOverlayState> = {};
  const teamA = params.get('teamA');
  const teamB = params.get('teamB');
  const title = params.get('title');
  const subtitle = params.get('subtitle');
  const haldi = params.get('haldi');
  const haldiSub = params.get('haldiSub');
  const leftText = params.get('leftText');
  const centerMain = params.get('centerMain');
  const centerSub = params.get('centerSub');
  const rightText = params.get('rightText');

  if (teamA) urlOverrides.teamAName = teamA;
  if (teamB) urlOverrides.teamBName = teamB;
  if (title) urlOverrides.kabaddiTitle = title;
  if (subtitle) urlOverrides.kabaddiSubtitle = subtitle;
  if (haldi) urlOverrides.haldiTitle = haldi;
  if (haldiSub) urlOverrides.haldiSubtitle = haldiSub;
  if (leftText) urlOverrides.haldiLeftText = leftText;
  if (centerMain) urlOverrides.haldiCenterMain = centerMain;
  if (centerSub) urlOverrides.haldiCenterSub = centerSub;
  if (rightText) urlOverrides.haldiRightText = rightText;

  return { mode, style, roomId, background, lockMode, lockStyle, urlOverrides };
}

function parseRemoteRoute() {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const queryRemote = params.get('remote') === '1' || params.get('remote') === 'true';
  const pathMatch = window.location.pathname.match(/^\/remote(?:\/([a-z0-9-_]+))?\/?$/i);

  if (!queryRemote && !pathMatch) return null;

  const matchId = params.get('match') || params.get('room') || (pathMatch?.[1] ?? '') || '';
  const lanMode = params.get('mode')?.toLowerCase() === 'lan';
  return { matchId, lanMode };
}

export default function App() {
  const userCricketOverlayRoute = useMemo(() => parseUserCricketOverlayRoute(), []);
  const supabaseOverlayRoute = useMemo(() => parseSupabaseOverlayRoute(), []);
  const overlayRoute = useMemo(() => parseOverlayRoute(), []);
  const remoteRoute = useMemo(() => parseRemoteRoute(), []);

  const [supabaseControlMatchId, setSupabaseControlMatchId] = useState<string | null>(
    () => parseSupabaseControlRoute()?.matchId ?? null
  );
  const [lang, setLang] = useState<Language>('en');
  const [currentPage, setCurrentPage] = useState<PageRoute>(() => getInitialPage());
  const [previewMode, setPreviewMode] = useState<PreviewMode>('kabaddi');
  const [activeStyle, setActiveStyle] = useState<OverlayStyle>('classic');
  const [selectedEvent, setSelectedEvent] = useState<EventCategoryId>('kabaddi');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('multi-cam-pro');
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [selectedBookingDate, setSelectedBookingDate] = useState<string>('');
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [accessModalView, setAccessModalView] = useState<'login' | 'admin'>('login');

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const handlePopState = () => {
      setSupabaseControlMatchId(parseSupabaseControlRoute()?.matchId ?? null);
      setCurrentPage(getInitialPage());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 1. Supabase Realtime Cricket Overlay (`/cricket-overlay/{ROOM_ID}`)
  if (userCricketOverlayRoute) {
    return (
      <UserCricketOverlayView
        targetUid={userCricketOverlayRoute.targetUid}
        background={userCricketOverlayRoute.background}
      />
    );
  }

  // 2. Supabase Realtime 1920x1080 transparent Kabaddi vMix Overlay (`/overlay?id=MATCH_ID`)
  if (supabaseOverlayRoute) {
    return <SupabaseKabaddiOverlayView matchId={supabaseOverlayRoute.matchId} />;
  }

  // 3. OBS/vMix transparent overlay routes (`/overlay/kabaddi`, `/overlay/haldi`, `?overlay=...`)
  if (overlayRoute) {
    return (
      <OverlayOutputView
        initialMode={overlayRoute.mode}
        initialStyle={overlayRoute.style}
        roomId={overlayRoute.roomId}
        background={overlayRoute.background}
        lockMode={overlayRoute.lockMode}
        lockStyle={overlayRoute.lockStyle}
        urlOverrides={overlayRoute.urlOverrides}
      />
    );
  }

  // 4. Dedicated mobile remote controller route
  if (remoteRoute) {
    return (
      <KabaddiRemoteController
        initialMatchId={remoteRoute.matchId}
        initialLanMode={remoteRoute.lanMode}
      />
    );
  }

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navigateToOverlays = (mode?: PreviewMode, style?: OverlayStyle) => {
    const isPageChange = currentPage !== 'overlays' || Boolean(supabaseControlMatchId);
    setSupabaseControlMatchId(null);
    const nextMode = mode ?? previewMode;
    if (mode) setPreviewMode(mode);
    if (style) {
      setActiveStyle(normalizeStyleForMode(nextMode, style));
    } else if (mode) {
      setActiveStyle(normalizeStyleForMode(mode, activeStyle));
    }
    if (window.location.pathname !== '/overlays') {
      window.history.pushState({}, '', '/overlays');
    }
    setCurrentPage('overlays');
    if (isPageChange) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const navigateToServices = () => {
    const isPageChange = currentPage !== 'services' || Boolean(supabaseControlMatchId);
    setSupabaseControlMatchId(null);
    if (window.location.pathname !== '/services') {
      window.history.pushState({}, '', '/services');
    }
    setCurrentPage('services');
    if (isPageChange) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const navigateToPackages = () => {
    const isPageChange = currentPage !== 'packages' || Boolean(supabaseControlMatchId);
    setSupabaseControlMatchId(null);
    if (window.location.pathname !== '/packages') {
      window.history.pushState({}, '', '/packages');
    }
    setCurrentPage('packages');
    if (isPageChange) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const navigateToBooking = () => {
    const isPageChange = currentPage !== 'booking' || Boolean(supabaseControlMatchId);
    setSupabaseControlMatchId(null);
    if (window.location.pathname !== '/booking') {
      window.history.pushState({}, '', '/booking');
    }
    setCurrentPage('booking');
    if (isPageChange) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const navigateHome = (sectionId?: string) => {
    const wasOnHome = currentPage === 'home' && !supabaseControlMatchId;
    setSupabaseControlMatchId(null);
    const targetUrl = sectionId && sectionId !== 'top' ? `/#${sectionId}` : '/';
    if (window.location.pathname !== '/' || (sectionId && window.location.hash !== `#${sectionId}`)) {
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

  const navigateToSupabaseKabaddiControl = (rawMatchId = 'KBD-101') => {
    const cleanId = sanitizeKabaddiMatchId(rawMatchId, 'KBD-101');
    const targetUrl = `/control?id=${encodeURIComponent(cleanId)}`;
    const currentFull = `${window.location.pathname}${window.location.search}`;
    if (currentFull !== targetUrl) {
      window.history.pushState({}, '', targetUrl);
    }
    setSupabaseControlMatchId(cleanId);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handlePreviewEvent = (mode: PreviewMode) => {
    setSupabaseControlMatchId(null);
    navigateToOverlays(mode, mode === 'haldi' ? 'festive' : undefined);
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

  const handleOpenAccessModal = (view: 'login' | 'admin' = 'login') => {
    setAccessModalView(view);
    setAccessModalOpen(true);
  };

  // 5. Supabase Realtime Isolated Kabaddi Controller (`/control?id=MATCH_ID`)
  if (supabaseControlMatchId) {
    return (
      <SupabaseKabaddiControllerView
        matchId={supabaseControlMatchId}
        onChangeMatchId={navigateToSupabaseKabaddiControl}
        onNavigateHome={() => navigateHome('top')}
      />
    );
  }

  return (
    <div className="relative min-h-screen bg-[#3B0207] text-white flex flex-col overflow-x-clip">
      <HomeAnimatedBackground />

      <Navbar
        lang={lang}
        onChangeLang={setLang}
        currentPage={currentPage}
        onNavigateHome={navigateHome}
        onNavigateServices={navigateToServices}
        onNavigateOverlays={() => navigateToOverlays()}
        onNavigatePackages={navigateToPackages}
        onNavigateBooking={navigateToBooking}
        onOpenAccessModal={handleOpenAccessModal}
      />

      <main className="relative z-10 flex-1">
        <div key={currentPage} className="page-transition-enter">
          {currentPage === 'services' ? (
            <ServicesPage
              lang={lang}
              onPreviewEvent={handlePreviewEvent}
              onBookEvent={handleBookEvent}
              onBackHome={() => navigateHome('top')}
            />
          ) : currentPage === 'overlays' ? (
            <OverlaysPage
              lang={lang}
              activeMode={previewMode}
              onChangeMode={setPreviewMode}
              activeStyle={activeStyle}
              onChangeStyle={setActiveStyle}
              onBackHome={() => navigateHome('top')}
              onBookFromOverlay={handleBookEvent}
              onOpenKabaddiControl={() => navigateToSupabaseKabaddiControl('KBD-101')}
              onOpenAccessModal={handleOpenAccessModal}
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
                onOpenOverlays={() => navigateToOverlays()}
              />

              <BookingCalendarSection
                lang={lang}
                heading="BOOKING UR ORDER"
                onSelectDateForBooking={handleSelectDateForBooking}
              />

              <HeroSection
                lang={lang}
                onOpenOverlays={() => navigateToOverlays()}
                onOpenKabaddiControl={() => navigateToSupabaseKabaddiControl('KBD-101')}
              />

              <PartnerAdSection
                lang={lang}
                onBookNow={navigateToBooking}
                onOpenHaldiOverlay={() => navigateToOverlays('haldi', 'festive')}
              />

              <StudioSpotlightSection
                lang={lang}
                onBookNow={navigateToBooking}
              />

              <BroadcastStingerSection
                lang={lang}
                onOpenOverlays={() => navigateToOverlays()}
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

      <Footer
        lang={lang}
        onNavigateHome={navigateHome}
        onNavigateServices={navigateToServices}
        onNavigateOverlays={() => navigateToOverlays()}
        onNavigatePackages={navigateToPackages}
        onNavigateBooking={navigateToBooking}
      />

      <OverlayAccessModal
        open={accessModalOpen}
        initialView={accessModalView}
        onClose={() => setAccessModalOpen(false)}
        onUnlockedSuccess={() => navigateToOverlays()}
      />
    </div>
  );
}
