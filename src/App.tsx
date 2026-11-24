import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccountPortalModal } from './components/AccountPortalModal';
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
import { OverlayOutputView } from './components/OverlayOutputView';
import { OverlaysPage } from './components/OverlaysPage';
import { PackagesPage } from './components/PackagesPage';
import { PartnerAdSection } from './components/PartnerAdSection';
import { ServicesPage } from './components/ServicesPage';
import { StingerOverlaysOfferSection } from './components/StingerOverlaysOfferSection';
import { StudioSpotlightSection } from './components/StudioSpotlightSection';
import { SupabaseKabaddiControllerView } from './components/SupabaseKabaddiControllerView';
import { SupabaseKabaddiOverlayView } from './components/SupabaseKabaddiOverlayView';
import { UserControlPanelView } from './components/UserControlPanelView';
import { UserCricketOverlayView } from './components/UserCricketOverlayView';
import { UserScoreboardOverlayView } from './components/UserScoreboardOverlayView';
import { EventCategoryId, Language } from './data/content';
import { sanitizeKabaddiMatchId } from './types/supabaseKabaddi';
import {
  OVERLAY_PRODUCTS,
  OverlaySku,
  PendingOverlayOrder,
  VerifiedOverlayToken,
} from './data/overlayCatalog';
import { sanitizeRoomIdClient } from './hooks/useOverlaySync';
import {
  LiveOverlayState,
  normalizeStyleForMode,
  OverlayBackground,
  OverlayMode,
  OverlayStyle,
} from './types/overlay';

const VALID_OVERLAY_MODES: OverlayMode[] = ['kabaddi', 'cricket', 'haldi'];
const VERIFIED_TOKENS_KEY = 'star_event_verified_tokens_v2';
const PENDING_ORDERS_KEY = 'star_event_pending_orders_v2';

function loadStoredTokens(): VerifiedOverlayToken[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(VERIFIED_TOKENS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const validSkus = new Set<OverlaySku>(OVERLAY_PRODUCTS.map((p) => p.sku));
    const now = Date.now();
    return parsed.filter(
      (item): item is VerifiedOverlayToken =>
        Boolean(item) &&
        validSkus.has(item.sku) &&
        typeof item.orderId === 'string' &&
        typeof item.unlockCode === 'string' &&
        typeof item.expiresAt === 'number' &&
        item.expiresAt > now
    );
  } catch {
    return [];
  }
}

function saveStoredTokens(tokens: VerifiedOverlayToken[]) {
  try {
    window.localStorage.setItem(VERIFIED_TOKENS_KEY, JSON.stringify(tokens));
  } catch {
    // Ignore quota errors
  }
}

function loadPendingOrders(): Partial<Record<OverlaySku, PendingOverlayOrder>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PENDING_ORDERS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function savePendingOrders(orders: Partial<Record<OverlaySku, PendingOverlayOrder>>) {
  try {
    window.localStorage.setItem(PENDING_ORDERS_KEY, JSON.stringify(orders));
  } catch {
    // Ignore quota errors
  }
}

type PageRoute = MainPageRoute;

function getInitialPage(): PageRoute {
  if (typeof window === 'undefined') return 'home';
  if (window.location.pathname.startsWith('/services')) return 'services';
  if (window.location.pathname.startsWith('/overlays')) return 'overlays';
  if (window.location.pathname.startsWith('/packages')) return 'packages';
  if (window.location.pathname.startsWith('/booking')) return 'booking';
  return 'home';
}

function parseUserScoreboardRoute(): { targetUid: string; background: OverlayBackground } | null {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(/^\/scoreboard\/([A-Za-z0-9_-]{3,128})\/?$/);
  if (!match) return null;
  const params = new URLSearchParams(window.location.search);
  const bgParam = params.get('bg')?.toLowerCase();
  const background: OverlayBackground =
    bgParam === 'green' ? 'green' : bgParam === 'blue' ? 'blue' : 'transparent';
  return { targetUid: decodeURIComponent(match[1]), background };
}

function parseUserControlRoute(): { targetUid: string } | null {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(/^\/control\/([A-Za-z0-9_-]{3,128})\/?$/);
  if (!match) return null;
  return { targetUid: decodeURIComponent(match[1]) };
}

function parseSupabaseControlRoute(): { matchId: string } | null {
  if (typeof window === 'undefined') return null;
  if (!/^\/control\/?$/i.test(window.location.pathname)) return null;
  const params = new URLSearchParams(window.location.search);
  const rawId = params.get('id') || params.get('match') || params.get('room');
  return { matchId: sanitizeKabaddiMatchId(rawId, 'KBD-101') };
}

function parseSupabaseOverlayRoute(): { matchId: string } | null {
  if (typeof window === 'undefined') return null;
  if (!/^\/overlay\/?$/i.test(window.location.pathname)) return null;
  const params = new URLSearchParams(window.location.search);
  // Keep legacy ?overlay=kabaddi|haldi working untouched
  if (params.get('overlay')) return null;
  const rawId = params.get('id') || params.get('match') || params.get('room');
  return { matchId: sanitizeKabaddiMatchId(rawId, 'KBD-101') };
}

function parseUserCricketOverlayRoute(): { targetUid: string; background: OverlayBackground } | null {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(/^\/cricket-overlay\/([A-Za-z0-9_-]{3,128})\/?$/);
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

  // Also support clean path URLs like /overlay/kabaddi or /overlay/haldi
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
  const token = params.get('token')?.trim().toUpperCase() || undefined;
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

  return { mode, style, roomId, background, token, lockMode, lockStyle, urlOverrides };
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
  const userScoreboardRoute = useMemo(() => parseUserScoreboardRoute(), []);
  const userCricketOverlayRoute = useMemo(() => parseUserCricketOverlayRoute(), []);
  const supabaseOverlayRoute = useMemo(() => parseSupabaseOverlayRoute(), []);
  const overlayRoute = useMemo(() => parseOverlayRoute(), []);
  const remoteRoute = useMemo(() => parseRemoteRoute(), []);

  const [controlTargetUid, setControlTargetUid] = useState<string | null>(
    () => parseUserControlRoute()?.targetUid ?? null
  );
  const [supabaseControlMatchId, setSupabaseControlMatchId] = useState<string | null>(
    () => parseSupabaseControlRoute()?.matchId ?? null
  );
  const [lang, setLang] = useState<Language>('en');
  const [currentPage, setCurrentPage] = useState<PageRoute>(() => getInitialPage());
  const [previewMode, setPreviewMode] = useState<PreviewMode>('kabaddi');
  const [activeStyle, setActiveStyle] = useState<OverlayStyle>('classic');
  const [verifiedTokens, setVerifiedTokens] = useState<VerifiedOverlayToken[]>([]);
  const [pendingOrders, setPendingOrders] = useState<
    Partial<Record<OverlaySku, PendingOverlayOrder>>
  >(() => loadPendingOrders());
  const [selectedEvent, setSelectedEvent] = useState<EventCategoryId>('kabaddi');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('multi-cam-pro');
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [selectedBookingDate, setSelectedBookingDate] = useState<string>('');
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountModalTab, setAccountModalTab] = useState<'operator' | 'admin'>('operator');
  const [forcedMatchRoomId, setForcedMatchRoomId] = useState<string | null>(null);

  const unlockedSkus = useMemo(
    () => verifiedTokens.map((t) => t.sku),
    [verifiedTokens]
  );

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const handleVerifiedUnlock = useCallback(
    (incoming: VerifiedOverlayToken | VerifiedOverlayToken[]) => {
      const list = Array.isArray(incoming) ? incoming : [incoming];
      if (list.length === 0) return;
      setVerifiedTokens((prev) => {
        const incomingSkus = new Set(list.map((t) => t.sku));
        const next = [...prev.filter((t) => !incomingSkus.has(t.sku)), ...list];
        saveStoredTokens(next);
        return next;
      });
    },
    []
  );

  const handlePendingOrderChange = useCallback(
    (sku: OverlaySku, order: PendingOverlayOrder | null) => {
      setPendingOrders((prev) => {
        const next = { ...prev };
        if (order) {
          next[sku] = order;
        } else {
          delete next[sku];
        }
        savePendingOrders(next);
        return next;
      });
    },
    []
  );

  // On mount: strictly verify stored tokens & check pending orders against the server!
  useEffect(() => {
    if (
      userScoreboardRoute ||
      userCricketOverlayRoute ||
      supabaseOverlayRoute ||
      overlayRoute ||
      remoteRoute
    ) {
      return;
    }
    let active = true;

    const validateOnServer = async () => {
      const stored = loadStoredTokens();
      if (stored.length > 0) {
        try {
          const res = await fetch('/api/overlay/validate-tokens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tokens: stored }),
          });
          const data = await res.json();
          if (active && res.ok && Array.isArray(data?.verified)) {
            setVerifiedTokens(data.verified);
            saveStoredTokens(data.verified);
          }
        } catch {
          // Keep locked until server validates
        }
      }

      const pendingMap = loadPendingOrders();
      const entries = Object.entries(pendingMap) as Array<[OverlaySku, PendingOverlayOrder]>;
      for (const [sku, ord] of entries) {
        if (!ord?.orderId) continue;
        try {
          const res = await fetch(`/api/overlay/orders/${encodeURIComponent(ord.orderId)}/status`);
          const data = await res.json();
          if (!active || !res.ok || !data?.order) continue;
          const serverOrder = data.order as PendingOverlayOrder;
          if (serverOrder.status === 'approved' && serverOrder.unlockCode && serverOrder.expiresAt) {
            if (serverOrder.expiresAt > Date.now()) {
              handleVerifiedUnlock({
                sku,
                orderId: serverOrder.orderId,
                unlockCode: serverOrder.unlockCode,
                expiresAt: serverOrder.expiresAt,
              });
            }
            handlePendingOrderChange(sku, null);
          } else if (serverOrder.status === 'rejected' || serverOrder.status === 'revoked') {
            handlePendingOrderChange(sku, null);
          }
        } catch {
          // Ignore intermittent failures
        }
      }
    };

    validateOnServer();
    const recheckTimer = window.setInterval(validateOnServer, 45_000);
    return () => {
      active = false;
      window.clearInterval(recheckTimer);
    };
  }, [
    userScoreboardRoute,
    userCricketOverlayRoute,
    supabaseOverlayRoute,
    overlayRoute,
    remoteRoute,
    handlePendingOrderChange,
    handleVerifiedUnlock,
  ]);

  // Automatic 24-hour expiry watcher: re-locks overlays the exact second expiresAt passes
  useEffect(() => {
    if (verifiedTokens.length === 0) return;

    const pruneExpired = () => {
      const now = Date.now();
      setVerifiedTokens((prev) => {
        const active = prev.filter((t) => t.expiresAt > now);
        if (active.length !== prev.length) {
          saveStoredTokens(active);
          return active;
        }
        return prev;
      });
    };

    pruneExpired();
    const interval = window.setInterval(pruneExpired, 1000);
    return () => window.clearInterval(interval);
  }, [verifiedTokens.length]);

  useEffect(() => {
    const handlePopState = () => {
      setControlTargetUid(parseUserControlRoute()?.targetUid ?? null);
      setSupabaseControlMatchId(parseSupabaseControlRoute()?.matchId ?? null);
      setCurrentPage(getInitialPage());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 1. Per-user pure transparent vMix / OBS Kabaddi Scoreboard Overlay (`/scoreboard/{USER_UID}`)
  if (userScoreboardRoute) {
    return (
      <UserScoreboardOverlayView
        targetUid={userScoreboardRoute.targetUid}
        background={userScoreboardRoute.background}
      />
    );
  }

  // 1b. Per-user pure transparent vMix / OBS Single Cricket Scoreboard Overlay (`/cricket-overlay/{USER_UID}`)
  if (userCricketOverlayRoute) {
    return (
      <UserCricketOverlayView
        targetUid={userCricketOverlayRoute.targetUid}
        background={userCricketOverlayRoute.background}
      />
    );
  }

  // 1c. Supabase Realtime 1920x1080 transparent Kabaddi vMix Overlay (`/overlay?id=MATCH_ID`)
  if (supabaseOverlayRoute) {
    return <SupabaseKabaddiOverlayView matchId={supabaseOverlayRoute.matchId} />;
  }

  // 2. Legacy OBS/vMix transparent overlay routes (`/overlay/kabaddi`, `/overlay/haldi`)
  if (overlayRoute) {
    return (
      <OverlayOutputView
        initialMode={overlayRoute.mode}
        initialStyle={overlayRoute.style}
        roomId={overlayRoute.roomId}
        background={overlayRoute.background}
        token={overlayRoute.token}
        lockMode={overlayRoute.lockMode}
        lockStyle={overlayRoute.lockStyle}
        urlOverrides={overlayRoute.urlOverrides}
      />
    );
  }

  // 3. Dedicated mobile remote controller route
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
    const isPageChange = currentPage !== 'overlays';
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
    const isPageChange = currentPage !== 'services' || Boolean(controlTargetUid);
    setControlTargetUid(null);
    if (window.location.pathname !== '/services') {
      window.history.pushState({}, '', '/services');
    }
    setCurrentPage('services');
    if (isPageChange) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const navigateToPackages = () => {
    const isPageChange = currentPage !== 'packages' || Boolean(controlTargetUid);
    setControlTargetUid(null);
    if (window.location.pathname !== '/packages') {
      window.history.pushState({}, '', '/packages');
    }
    setCurrentPage('packages');
    if (isPageChange) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const navigateToBooking = () => {
    const isPageChange = currentPage !== 'booking' || Boolean(controlTargetUid);
    setControlTargetUid(null);
    if (window.location.pathname !== '/booking') {
      window.history.pushState({}, '', '/booking');
    }
    setCurrentPage('booking');
    if (isPageChange) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const navigateHome = (sectionId?: string) => {
    const wasOnHome = currentPage === 'home' && !controlTargetUid && !supabaseControlMatchId;
    setControlTargetUid(null);
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

  const navigateToUserControl = (uid: string) => {
    const cleanUid = uid.trim();
    if (!cleanUid) return;
    const isPageChange = controlTargetUid !== cleanUid;
    const targetPath = `/control/${encodeURIComponent(cleanUid)}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    setSupabaseControlMatchId(null);
    setControlTargetUid(cleanUid);
    if (isPageChange) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const navigateToSupabaseKabaddiControl = (rawMatchId = 'KBD-101') => {
    const cleanId = sanitizeKabaddiMatchId(rawMatchId, 'KBD-101');
    const targetUrl = `/control?id=${encodeURIComponent(cleanId)}`;
    const currentFull = `${window.location.pathname}${window.location.search}`;
    if (currentFull !== targetUrl) {
      window.history.pushState({}, '', targetUrl);
    }
    setControlTargetUid(null);
    setSupabaseControlMatchId(cleanId);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handlePreviewEvent = (mode: PreviewMode) => {
    setControlTargetUid(null);
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

  const handleOpenAccountPortal = (tab: 'operator' | 'admin' = 'operator') => {
    setAccountModalTab(tab);
    setAccountModalOpen(true);
  };

  const handleOpenUserScoreboard = (matchRoomId: string, uid?: string) => {
    if (uid && uid.trim()) {
      navigateToUserControl(uid);
      return;
    }
    setControlTargetUid(null);
    setForcedMatchRoomId(matchRoomId);
    setPreviewMode('kabaddi');
    setActiveStyle('classic');
    const targetPath = `/overlays?match=${encodeURIComponent(matchRoomId)}`;
    window.history.pushState({}, '', targetPath);
    setCurrentPage('overlays');
    window.setTimeout(() => {
      const el = document.getElementById('studio');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 90);
  };

  // 4. Supabase Realtime Isolated Kabaddi Controller (`/control?id=MATCH_ID`)
  if (supabaseControlMatchId) {
    return (
      <SupabaseKabaddiControllerView
        matchId={supabaseControlMatchId}
        onChangeMatchId={navigateToSupabaseKabaddiControl}
        onNavigateHome={() => navigateHome('top')}
      />
    );
  }

  // 4b. Protected per-user Admin Control Panel (`/control/{USER_UID}`)
  if (controlTargetUid) {
    return (
      <>
        <UserControlPanelView
          targetUid={controlTargetUid}
          lang={lang}
          onNavigateHome={() => navigateHome('top')}
          onNavigateToControl={navigateToUserControl}
          onOpenAccountPortal={handleOpenAccountPortal}
        />
        <AccountPortalModal
          open={accountModalOpen}
          initialTab={accountModalTab}
          lang={lang}
          onClose={() => setAccountModalOpen(false)}
          onOpenUserScoreboard={handleOpenUserScoreboard}
        />
      </>
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
        onOpenAccountPortal={handleOpenAccountPortal}
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
            unlockedSkus={unlockedSkus}
            verifiedTokens={verifiedTokens}
            pendingOrders={pendingOrders}
            onPendingOrderChange={handlePendingOrderChange}
            onVerifiedUnlock={handleVerifiedUnlock}
            onBackHome={() => navigateHome('top')}
            onBookFromOverlay={handleBookEvent}
            forcedMatchRoomId={forcedMatchRoomId}
            onOpenAccountPortal={handleOpenAccountPortal}
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

      <AccountPortalModal
        open={accountModalOpen}
        initialTab={accountModalTab}
        lang={lang}
        onClose={() => setAccountModalOpen(false)}
        onOpenUserScoreboard={handleOpenUserScoreboard}
      />
    </div>
  );
}
