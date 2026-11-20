import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Layers, LockOpen } from 'lucide-react';
import { AdminOrdersModal } from './components/AdminOrdersModal';
import { BookingSection } from './components/BookingSection';
import { Footer } from './components/Footer';
import { HeroSection } from './components/HeroSection';
import { PreviewMode } from './components/LiveStudioPreview';
import { Navbar } from './components/Navbar';
import { OverlayOutputView } from './components/OverlayOutputView';
import { OverlaysPage } from './components/OverlaysPage';
import { PackagesSection } from './components/PackagesSection';
import { ServicesSection } from './components/ServicesSection';
import { EventCategoryId, Language, UI_COPY } from './data/content';
import {
  OVERLAY_PRODUCTS,
  OverlaySku,
  PendingOverlayOrder,
  VerifiedOverlayToken,
} from './data/overlayCatalog';
import { sanitizeRoomIdClient } from './hooks/useOverlaySync';
import { LiveOverlayState, OverlayBackground, OverlayMode, OverlayStyle } from './types/overlay';

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
    return parsed.filter(
      (item): item is VerifiedOverlayToken =>
        Boolean(item) &&
        validSkus.has(item.sku) &&
        typeof item.orderId === 'string' &&
        typeof item.unlockCode === 'string'
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

function getInitialPage(): 'home' | 'overlays' {
  if (typeof window === 'undefined') return 'home';
  return window.location.pathname.startsWith('/overlays') ? 'overlays' : 'home';
}

function getInitialAdminOpen(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return window.location.pathname.startsWith('/admin') || params.get('admin') === '1';
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
  const style: OverlayStyle = styleParam === 'modern' ? 'modern' : 'classic';

  const bgParam = params.get('bg')?.toLowerCase();
  const background: OverlayBackground =
    bgParam === 'green' ? 'green' : bgParam === 'blue' ? 'blue' : 'transparent';

  const roomId = sanitizeRoomIdClient(params.get('room') || 'star-live-1');
  const lockMode = params.get('lock') === '1' || Boolean(pathOverlay);
  const lockStyle = params.get('lock') === '1';

  const urlOverrides: Partial<LiveOverlayState> = {};
  const teamA = params.get('teamA');
  const teamB = params.get('teamB');
  const title = params.get('title');
  const subtitle = params.get('subtitle');
  const haldi = params.get('haldi');
  const haldiSub = params.get('haldiSub');

  if (teamA) urlOverrides.teamAName = teamA;
  if (teamB) urlOverrides.teamBName = teamB;
  if (title) urlOverrides.kabaddiTitle = title;
  if (subtitle) urlOverrides.kabaddiSubtitle = subtitle;
  if (haldi) urlOverrides.haldiTitle = haldi;
  if (haldiSub) urlOverrides.haldiSubtitle = haldiSub;

  return { mode, style, roomId, background, lockMode, lockStyle, urlOverrides };
}

export default function App() {
  const overlayRoute = useMemo(() => parseOverlayRoute(), []);

  const [lang, setLang] = useState<Language>('mr');
  const [currentPage, setCurrentPage] = useState<'home' | 'overlays'>(() => getInitialPage());
  const [adminOpen, setAdminOpen] = useState<boolean>(() => getInitialAdminOpen());
  const [previewMode, setPreviewMode] = useState<PreviewMode>('kabaddi');
  const [activeStyle, setActiveStyle] = useState<OverlayStyle>('classic');
  const [verifiedTokens, setVerifiedTokens] = useState<VerifiedOverlayToken[]>([]);
  const [pendingOrders, setPendingOrders] = useState<
    Partial<Record<OverlaySku, PendingOverlayOrder>>
  >(() => loadPendingOrders());
  const [selectedEvent, setSelectedEvent] = useState<EventCategoryId>('kabaddi');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('multi-cam-pro');
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

  const unlockedSkus = useMemo(
    () => verifiedTokens.map((t) => t.sku),
    [verifiedTokens]
  );

  const handleVerifiedUnlock = useCallback((token: VerifiedOverlayToken) => {
    setVerifiedTokens((prev) => {
      if (prev.some((t) => t.sku === token.sku && t.unlockCode === token.unlockCode)) {
        return prev;
      }
      const next = [...prev.filter((t) => t.sku !== token.sku), token];
      saveStoredTokens(next);
      return next;
    });
  }, []);

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
    if (overlayRoute) return;
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
          if (serverOrder.status === 'approved' && serverOrder.unlockCode) {
            handleVerifiedUnlock({
              sku,
              orderId: serverOrder.orderId,
              unlockCode: serverOrder.unlockCode,
            });
            handlePendingOrderChange(sku, null);
          } else if (serverOrder.status === 'rejected') {
            handlePendingOrderChange(sku, null);
          }
        } catch {
          // Ignore intermittent failures
        }
      }
    };

    validateOnServer();
    return () => {
      active = false;
    };
  }, [overlayRoute, handlePendingOrderChange, handleVerifiedUnlock]);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(getInitialPage());
      if (window.location.pathname.startsWith('/admin')) {
        setAdminOpen(true);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // If opened as an OBS Browser Source or vMix Web Browser Input, render pure transparent overlay only
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

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navigateToOverlays = (mode?: PreviewMode, style?: OverlayStyle) => {
    if (mode) setPreviewMode(mode);
    if (style) setActiveStyle(style);
    if (window.location.pathname !== '/overlays') {
      window.history.pushState({}, '', '/overlays');
    }
    setCurrentPage('overlays');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateHome = (sectionId?: string) => {
    const targetUrl = sectionId && sectionId !== 'top' ? `/#${sectionId}` : '/';
    if (window.location.pathname !== '/' || (sectionId && window.location.hash !== `#${sectionId}`)) {
      window.history.pushState({}, '', targetUrl);
    }

    if (currentPage !== 'home') {
      setCurrentPage('home');
      window.setTimeout(() => {
        if (!sectionId || sectionId === 'top') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const handlePreviewEvent = (mode: PreviewMode) => {
    navigateToOverlays(mode);
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

  return (
    <div className="min-h-screen bg-[#09090B] text-[#F4F4F5] flex flex-col">
      <Navbar
        lang={lang}
        currentPage={currentPage}
        onNavigateHome={navigateHome}
        onNavigateOverlays={() => navigateToOverlays()}
      />

      <main className="flex-1">
        {currentPage === 'overlays' ? (
          <OverlaysPage
            lang={lang}
            onChangeLang={setLang}
            activeMode={previewMode}
            onChangeMode={setPreviewMode}
            activeStyle={activeStyle}
            onChangeStyle={setActiveStyle}
            unlockedSkus={unlockedSkus}
            pendingOrders={pendingOrders}
            onPendingOrderChange={handlePendingOrderChange}
            onVerifiedUnlock={handleVerifiedUnlock}
            onBackHome={() => navigateHome('top')}
            onBookFromOverlay={handleBookEvent}
          />
        ) : (
          <>
            <HeroSection
              lang={lang}
              onChangeLang={setLang}
              onOpenOverlays={() => navigateToOverlays()}
            />

            <ServicesSection
              lang={lang}
              onPreviewEvent={handlePreviewEvent}
              onBookEvent={handleBookEvent}
            />

            {/* Paid Transparent Overlays Store Callout Section — clicking opens /overlays page */}
            <section id="studio" className="py-20 sm:py-24 border-b border-white/10 bg-[#0C0C0F]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
                  <div className="max-w-3xl space-y-3">
                    <p className="text-xs sm:text-sm font-medium text-[#FACC15]">
                      {UI_COPY.studioSection.kicker[lang]}
                    </p>
                    <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-white">
                      {UI_COPY.studioSection.heading[lang]}
                    </h2>
                    <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
                      {lang === 'mr'
                        ? 'OBS Studio आणि vMix साठी रेडी-टू-युज 1920×1080 ट्रान्सपरंट कबड्डी स्कोअरबोर्ड आणि हळदी ओव्हरले — प्रत्येकी 2 प्रोफेशनल डिझाईन. विशेष लॉन्च ऑफरमध्ये ₹149 कट करून फक्त ₹99.'
                        : 'Ready-to-use 1920×1080 transparent Kabaddi Scoreboard and Haldi Live overlays for OBS Studio & vMix — 2 broadcast styles each. Launch offer slashed from ₹149 to ₹99.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigateToOverlays()}
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 text-sm font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 self-start lg:self-auto tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
                  >
                    <Layers className="w-4 h-4 text-[#FACC15] shrink-0" aria-hidden="true" />
                    <span>
                      {lang === 'mr'
                        ? 'सर्व ओव्हरले पहा — ₹99'
                        : 'Open Overlays Store — ₹99'}
                    </span>
                    <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {OVERLAY_PRODUCTS.map((product) => {
                    const isUnlocked = unlockedSkus.includes(product.sku);
                    return (
                      <button
                        key={product.sku}
                        type="button"
                        onClick={() => navigateToOverlays(product.mode, product.style)}
                        className="group text-left bg-[#121216] border border-white/10 hover:border-[#FACC15]/70 rounded-2xl p-5 flex flex-col justify-between gap-5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2 text-xs font-mono">
                            <span className="text-zinc-400">
                              {product.mode === 'kabaddi'
                                ? lang === 'mr'
                                  ? 'कबड्डी'
                                  : 'KABADDI'
                                : lang === 'mr'
                                  ? 'हळदी'
                                  : 'HALDI'}{' '}
                              · {product.style === 'classic' ? 'STYLE 1' : 'STYLE 2'}
                            </span>
                            {isUnlocked ? (
                              <span className="inline-flex items-center gap-1 text-[#4ADE80] font-bold">
                                <LockOpen className="w-3.5 h-3.5" aria-hidden="true" />
                                {lang === 'mr' ? 'अनलॉक' : 'OWNED'}
                              </span>
                            ) : (
                              <span className="text-[#4ADE80] font-semibold">33% OFF</span>
                            )}
                          </div>

                          <h3 className="font-display text-base sm:text-lg font-bold text-white group-hover:text-[#FACC15] transition-colors">
                            {product.title[lang]}
                          </h3>
                          <p className="text-xs text-zinc-400 leading-relaxed">
                            {product.subtitle[lang]}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono text-sm text-zinc-500 line-through tabular-nums">
                              ₹{product.originalPrice}
                            </span>
                            <span className="font-mono text-xl font-extrabold text-[#FACC15] tabular-nums">
                              ₹{product.salePrice}
                            </span>
                          </div>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-200 group-hover:text-white whitespace-nowrap">
                            <span>{lang === 'mr' ? 'उघडा' : 'Open'}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <PackagesSection
              lang={lang}
              selectedPackageId={selectedPackageId}
              selectedAddOns={selectedAddOns}
              onToggleAddOn={handleToggleAddOn}
              onSelectPackage={handleSelectPackage}
            />

            <BookingSection
              lang={lang}
              selectedEvent={selectedEvent}
              onChangeEvent={setSelectedEvent}
              selectedPackageId={selectedPackageId}
              onChangePackage={setSelectedPackageId}
              selectedAddOns={selectedAddOns}
            />
          </>
        )}
      </main>

      <Footer
        lang={lang}
        onNavigateHome={navigateHome}
        onNavigateOverlays={() => navigateToOverlays()}
        onOpenAdmin={() => setAdminOpen(true)}
      />

      {/* Owner PIN-Protected ₹99 UPI Payment Verification Console */}
      <AdminOrdersModal
        lang={lang}
        open={adminOpen}
        onClose={() => {
          setAdminOpen(false);
          if (window.location.pathname.startsWith('/admin')) {
            window.history.pushState({}, '', '/overlays');
            setCurrentPage('overlays');
          }
        }}
      />
    </div>
  );
}
