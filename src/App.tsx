import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Layers, LockOpen } from 'lucide-react';
import { AccountPortalModal } from './components/AccountPortalModal';
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
import { ScrollReveal } from './components/ScrollReveal';
import { ServicesPage } from './components/ServicesPage';
import { StudioSpotlightSection } from './components/StudioSpotlightSection';
import { UserControlPanelView } from './components/UserControlPanelView';
import { UserScoreboardOverlayView } from './components/UserScoreboardOverlayView';
import { EventCategoryId, Language, UI_COPY } from './data/content';
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

const VALID_OVERLAY_MODES: OverlayMode[] = ['kabaddi', 'haldi'];
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
  const overlayRoute = useMemo(() => parseOverlayRoute(), []);
  const remoteRoute = useMemo(() => parseRemoteRoute(), []);

  const [controlTargetUid, setControlTargetUid] = useState<string | null>(
    () => parseUserControlRoute()?.targetUid ?? null
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
    if (userScoreboardRoute || overlayRoute || remoteRoute) return;
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
  }, [userScoreboardRoute, overlayRoute, remoteRoute, handlePendingOrderChange, handleVerifiedUnlock]);

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
      setCurrentPage(getInitialPage());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 1. Per-user pure transparent vMix / OBS Scoreboard Overlay (`/scoreboard/{USER_UID}`)
  if (userScoreboardRoute) {
    return (
      <UserScoreboardOverlayView
        targetUid={userScoreboardRoute.targetUid}
        background={userScoreboardRoute.background}
      />
    );
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

  const navigateHome = (sectionId?: string) => {
    const wasOnHome = currentPage === 'home' && !controlTargetUid;
    setControlTargetUid(null);
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
    } else if (sectionId && sectionId !== 'top') {
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
    setControlTargetUid(cleanUid);
    if (isPageChange) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
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
    navigateHome('book');
  };

  const handleToggleAddOn = (addonId: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  const handleSelectPackage = (packageId: string) => {
    setSelectedPackageId(packageId);
    navigateHome('book');
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

  // 4. Protected per-user Admin Control Panel (`/control/{USER_UID}`)
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
    <div className="relative min-h-screen bg-[#07080F] text-[#F4F4F5] flex flex-col overflow-x-clip">
      <HomeAnimatedBackground />

      <Navbar
        lang={lang}
        onChangeLang={setLang}
        currentPage={currentPage}
        onNavigateHome={navigateHome}
        onNavigateServices={navigateToServices}
        onNavigateOverlays={() => navigateToOverlays()}
        onNavigatePackages={navigateToPackages}
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
            onGoToBooking={() => navigateHome('book')}
          />
        ) : (
          <>
            <HeroSection
              lang={lang}
              onOpenOverlays={() => navigateToOverlays()}
            />

            <PartnerAdSection
              lang={lang}
              onBookNow={() => navigateHome('book')}
              onOpenHaldiOverlay={() => navigateToOverlays('haldi', 'festive')}
            />

            <StudioSpotlightSection
              lang={lang}
              onBookNow={() => navigateHome('book')}
            />

            {/* Paid Transparent Overlays Store Callout Section — clicking opens /overlays page */}
            <section
              id="studio"
              className="py-12 sm:py-20 lg:py-24 border-b border-white/10 bg-[#090B12]/36 backdrop-blur-[2px]"
            >
              <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
                <ScrollReveal>
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 sm:gap-6 mb-8 sm:mb-10">
                  <div className="max-w-3xl space-y-3.5">
                    <p className="text-xs sm:text-sm font-medium text-[#FACC15]">
                      {UI_COPY.studioSection.kicker[lang]}
                    </p>
                    <h2
                      className={`font-display text-2xl sm:text-4xl font-bold text-white ${
                        lang === 'mr' ? 'leading-[1.38] tracking-normal' : 'leading-[1.2] tracking-tight'
                      }`}
                    >
                      {UI_COPY.studioSection.heading[lang]}
                    </h2>
                    <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
                      {lang === 'mr'
                        ? 'OBS Studio आणि vMix साठी मोफत कबड्डी डेमो, प्रो कबड्डी कंट्रोलर, कस्टम रॉयल वेडिंग फ्रेम आणि हळदी अ‍ॅनिमेटेड ओव्हरले — आजची ऑफर: फक्त ₹1 पेमेंट करा, 1 दिवसासाठी (24 तास) आपोआप अनलॉक होईल.'
                        : "FREE Kabaddi Demo, Pro vMix/OBS Kabaddi Controller, Customizable Royal Wedding Frame, and Animated Haldi Overlays for OBS & vMix — Today's Offer: Pay ₹1 for instant 1-Day (24h) auto-unlock."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigateToOverlays()}
                    className="btn-primary-pro w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 text-sm font-bold rounded-xl text-center sm:whitespace-nowrap shrink-0 self-stretch sm:self-start lg:self-auto tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
                  >
                    <Layers className="w-4 h-4 text-[#FACC15] shrink-0" aria-hidden="true" />
                    <span>
                      {lang === 'mr'
                        ? 'सर्व ओव्हरले पहा (आजची ऑफर ₹1)'
                        : "Open Overlays Store (Today's Offer ₹1)"}
                    </span>
                    <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                  </button>
                </div>
                </ScrollReveal>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {OVERLAY_PRODUCTS.map((product, idx) => {
                    const isUnlocked = Boolean(product.isFreeDemo) || unlockedSkus.includes(product.sku);
                    const styleBadge =
                      product.mode === 'kabaddi'
                        ? product.isFreeDemo
                          ? 'FREE DEMO'
                          : 'PRO SCOREBOARD'
                        : product.style === 'wedding'
                          ? 'WEDDING FRAME'
                          : product.style === 'festive'
                            ? 'ANIMATED ROYAL'
                            : product.style === 'classic'
                              ? 'STYLE 1'
                              : 'STYLE 2';
                    return (
                      <ScrollReveal key={product.sku} delay={(idx % 3) * 80} className="h-full">
                      <button
                        type="button"
                        onClick={() => navigateToOverlays(product.mode, product.style)}
                        className={`studio-card-animate w-full h-full group text-left bg-[#121216] border rounded-2xl p-5 flex flex-col justify-between gap-5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] ${
                          product.isFreeDemo
                            ? 'border-[#4ADE80]/40 hover:border-[#4ADE80]'
                            : 'border-white/10 hover:border-[#FACC15]/70'
                        }`}
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2 text-xs font-mono">
                            <span className="text-zinc-400">
                              {product.mode === 'kabaddi'
                                ? lang === 'mr'
                                  ? 'कबड्डी'
                                  : 'KABADDI'
                                : lang === 'mr'
                                  ? 'हळदी व लग्न'
                                  : 'HALDI & WEDDING'}{' '}
                              · {styleBadge}
                            </span>
                            {product.isFreeDemo ? (
                              <span className="text-[#4ADE80] font-bold">FREE</span>
                            ) : isUnlocked ? (
                              <span className="inline-flex items-center gap-1 text-[#4ADE80] font-bold">
                                <LockOpen className="w-3.5 h-3.5" aria-hidden="true" />
                                {lang === 'mr' ? 'अनलॉक' : 'OWNED'}
                              </span>
                            ) : (
                              <span className="text-[#4ADE80] font-semibold">
                                {lang === 'mr' ? 'आजची ऑफर ₹1' : "TODAY'S OFFER ₹1"}
                              </span>
                            )}
                          </div>

                          <h3 className="font-display text-base sm:text-lg font-bold text-white leading-[1.42] group-hover:text-[#FACC15] transition-colors">
                            {product.title[lang]}
                          </h3>
                          <p className="text-xs sm:text-[13px] text-zinc-400 leading-relaxed">
                            {product.subtitle[lang]}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                          {product.isFreeDemo ? (
                            <span className="font-mono text-xl font-extrabold text-[#4ADE80]">
                              {lang === 'mr' ? 'मोफत (FREE)' : 'FREE'}
                            </span>
                          ) : (
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-mono text-xl font-extrabold text-[#FACC15] tabular-nums">
                                ₹{product.salePrice}
                              </span>
                              <span className="font-mono text-xs text-zinc-500 line-through tabular-nums">
                                ₹{product.originalPrice}
                              </span>
                              <span className="text-[11px] text-zinc-400">
                                {lang === 'mr' ? '/ 1 दिवस (24 तास)' : '/ 1 Day (24h)'}
                              </span>
                            </div>
                          )}
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-200 group-hover:text-white whitespace-nowrap">
                            <span>{product.isFreeDemo ? (lang === 'mr' ? 'वापरा' : 'Use Free') : (lang === 'mr' ? 'उघडा' : 'Open')}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
                          </span>
                        </div>
                      </button>
                      </ScrollReveal>
                    );
                  })}
                </div>
              </div>
            </section>

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
