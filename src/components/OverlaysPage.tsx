import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Clock, Eye, Lock, LockOpen, RefreshCw } from 'lucide-react';
import { EventCategoryId, Language, STUDIO_CONTACT, tLang } from '../data/content';
import {
  formatRemainingTime,
  OVERLAY_PRODUCTS,
  OverlayPlanId,
  OverlayProduct,
  OverlaySku,
  PendingOverlayOrder,
  VerifiedOverlayToken,
} from '../data/overlayCatalog';
import { OverlayMode, OverlayStyle } from '../types/overlay';
import { HaldiFestiveOverlayBar } from './HaldiFestiveOverlayBar';
import { KabaddiScoreboardBar } from './KabaddiScoreboardBar';
import { LanguageSwitcher } from './LanguageSwitcher';
import { LiveStudioPreview } from './LiveStudioPreview';
import { OverlayCheckoutModal } from './OverlayCheckoutModal';

interface OverlaysPageProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  activeMode: OverlayMode;
  onChangeMode: (mode: OverlayMode) => void;
  activeStyle: OverlayStyle;
  onChangeStyle: (style: OverlayStyle) => void;
  unlockedSkus: OverlaySku[];
  verifiedTokens: VerifiedOverlayToken[];
  pendingOrders: Partial<Record<OverlaySku, PendingOverlayOrder>>;
  onPendingOrderChange: (sku: OverlaySku, order: PendingOverlayOrder | null) => void;
  onVerifiedUnlock: (tokens: VerifiedOverlayToken | VerifiedOverlayToken[]) => void;
  onBackHome: () => void;
  onBookFromOverlay: (category: EventCategoryId) => void;
}

function OverlayMiniPreview({ mode, style }: { mode: OverlayMode; style: OverlayStyle }) {
  if (mode === 'kabaddi') {
    return (
      <div
        className="relative aspect-video w-full rounded-xl overflow-hidden flex flex-col justify-between p-2.5 border border-white/15"
        style={{
          backgroundColor: '#18181B',
          backgroundImage:
            'linear-gradient(45deg, #27272A 25%, transparent 25%), linear-gradient(-45deg, #27272A 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #27272A 75%), linear-gradient(-45deg, transparent 75%, #27272A 75%)',
          backgroundSize: '18px 18px',
          backgroundPosition: '0 0, 0 9px, 9px -9px, -9px 0px',
        }}
      >
        <div className="my-auto text-center">
          <span className="font-mono text-[9px] text-zinc-200 bg-black/65 px-2.5 py-0.5 rounded border border-white/10">
            {style === 'demo'
              ? 'FREE DEMO · SMALL WATERMARK'
              : '1920×1080 DUAL-LOGO SCOREBOARD'}
          </span>
        </div>
        <KabaddiScoreboardBar
          variant="mini"
          teamAName="NERAL"
          teamACode="NER"
          teamAColor="#C8102E"
          teamAScore={24}
          teamBName="KARJAT"
          teamBCode="KAR"
          teamBColor="#131D8A"
          teamBScore={21}
          matchSeconds={30}
          halfLabel="1ST HALF"
          showDemoWatermark={style === 'demo'}
        />
      </div>
    );
  }

  if (style === 'festive') {
    return (
      <div
        className="relative aspect-video w-full rounded-xl overflow-hidden flex flex-col justify-between p-2.5 border border-[#FACC15]/45"
        style={{
          backgroundColor: '#18181B',
          backgroundImage:
            'linear-gradient(45deg, #27272A 25%, transparent 25%), linear-gradient(-45deg, #27272A 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #27272A 75%), linear-gradient(-45deg, transparent 75%, #27272A 75%)',
          backgroundSize: '18px 18px',
          backgroundPosition: '0 0, 0 9px, 9px -9px, -9px 0px',
        }}
      >
        <div className="my-auto text-center">
          <span className="font-mono text-[9px] text-[#FEF08A] bg-black/70 px-2.5 py-0.5 rounded border border-[#FACC15]/35">
            ANIMATED · FULL CUSTOM TEXT &amp; MOTION
          </span>
        </div>
        <HaldiFestiveOverlayBar
          variant="mini"
          leftText="शुभ विवाह..."
          centerMain="हळदी"
          centerSub="समारंभ"
          rightText="Haldi Ceremony"
          animation="festive"
          theme="royal-maroon"
          showDecor
          showPetals={false}
        />
      </div>
    );
  }

  const isClassic = style === 'classic';
  return (
    <div
      className={`relative aspect-video w-full rounded-xl overflow-hidden flex flex-col justify-between p-3 ${
        isClassic
          ? 'border-2 border-[#FACC15] shadow-[inset_0_0_0_3px_#B45309]'
          : 'border border-white/15'
      }`}
      style={{
        backgroundColor: '#18181B',
        backgroundImage:
          'linear-gradient(45deg, #27272A 25%, transparent 25%), linear-gradient(-45deg, #27272A 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #27272A 75%), linear-gradient(-45deg, transparent 75%, #27272A 75%)',
        backgroundSize: '18px 18px',
        backgroundPosition: '0 0, 0 9px, 9px -9px, -9px 0px',
      }}
    >
      {/* Mini top bar */}
      <div className="flex items-center justify-between gap-2">
        {isClassic ? (
          <>
            <span className="bg-[#B45309] border border-[#FACC15] text-[#FEF08A] px-1.5 py-0.5 rounded text-[8px] font-mono font-bold">
              HALDI & WEDDING
            </span>
            <span className="bg-[#78350F] border border-[#FACC15] text-[#FEF08A] px-2 py-0.5 rounded-full text-[8px] font-bold truncate">
              शुभ हळदी व लग्न समारंभ
            </span>
          </>
        ) : (
          <span className="ml-auto bg-[#180F06]/90 border border-[#FACC15] text-[#FACC15] px-2 py-0.5 rounded-full text-[8px] font-bold">
            शुभ हळदी व लग्न समारंभ
          </span>
        )}
      </div>

      {/* Clear center indicator */}
      <div className="my-auto text-center" />

      {/* Mini bottom bar */}
      {isClassic ? (
        <div className="bg-gradient-to-r from-[#78350F] via-[#B45309] to-[#78350F] border border-[#FACC15] rounded-md px-3 py-1.5 text-center">
          <p className="text-[10px] font-bold text-white truncate leading-normal py-0.5">
            देशमुख कुटुंब — हळदी व लग्न समारंभ
          </p>
          <p className="text-[8px] text-[#FEF08A] truncate leading-normal">
            थेट प्रक्षेपण • दिनांक व ठिकाण
          </p>
        </div>
      ) : (
        <div className="w-[88%] mx-auto bg-gradient-to-r from-[#221204]/95 via-[#92400E]/95 to-[#221204]/95 border border-[#FDE047] rounded-full px-3 py-1.5 flex items-center justify-between gap-2">
          <span className="w-1.5 h-1.5 rotate-45 bg-[#FACC15] shrink-0" />
          <p className="text-[9px] font-bold text-white truncate leading-normal py-0.5 text-center flex-1">
            देशमुख कुटुंब — हळदी व लग्न समारंभ
          </p>
          <span className="w-1.5 h-1.5 rotate-45 bg-[#FACC15] shrink-0" />
        </div>
      )}
    </div>
  );
}

export function OverlaysPage({
  lang,
  onChangeLang,
  activeMode,
  onChangeMode,
  activeStyle,
  onChangeStyle,
  unlockedSkus,
  verifiedTokens,
  pendingOrders,
  onPendingOrderChange,
  onVerifiedUnlock,
  onBackHome,
  onBookFromOverlay,
}: OverlaysPageProps) {
  const [filterMode, setFilterMode] = useState<'all' | OverlayMode>('all');
  const [checkoutProduct, setCheckoutProduct] = useState<OverlayProduct | null>(null);
  const [checkoutPlanId, setCheckoutPlanId] = useState<OverlayPlanId>('1day');
  const [nowTs, setNowTs] = useState(() => Date.now());

  const hasPendingOrders = Object.values(pendingOrders).some((ord) => ord?.status === 'pending');

  useEffect(() => {
    if (verifiedTokens.length === 0 && !hasPendingOrders) return;
    const id = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [verifiedTokens.length, hasPendingOrders]);

  // Auto-verify Cashfree return redirect (?cf_order_id=OVL-...) via backend PG API
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cfOrderId = params.get('cf_order_id')?.trim();
    if (!cfOrderId) return;

    let cancelled = false;
    fetch(`/api/payment/cashfree/verify?orderId=${encodeURIComponent(cfOrderId)}`, {
      cache: 'no-store',
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const order = data?.order;
        if (data?.paid && order?.status === 'approved' && order?.unlockCode && order?.sku) {
          onVerifiedUnlock({
            sku: order.sku as OverlaySku,
            orderId: order.orderId,
            unlockCode: order.unlockCode,
            planId: order.planId,
            expiresAt:
              order.expiresAt || Date.now() + (order.durationHours || 24) * 60 * 60 * 1000,
          });
          onPendingOrderChange(order.sku as OverlaySku, null);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          const url = new URL(window.location.href);
          url.searchParams.delete('cf_order_id');
          window.history.replaceState({}, '', url.toString());
        }
      });

    return () => {
      cancelled = true;
    };
  }, [onVerifiedUnlock, onPendingOrderChange]);

  const visibleProducts =
    filterMode === 'all'
      ? OVERLAY_PRODUCTS
      : OVERLAY_PRODUCTS.filter((p) => p.mode === filterMode);

  const handleOpenPreview = (product: OverlayProduct) => {
    onChangeMode(product.mode);
    onChangeStyle(product.style);
    const el = document.getElementById('studio');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleOpenCheckout = (product: OverlayProduct, planId: OverlayPlanId = '1day') => {
    if (product.isFreeDemo) {
      handleOpenPreview(product);
      return;
    }
    setCheckoutPlanId(planId);
    setCheckoutProduct(product);
  };

  const handleRequestPurchaseBySku = (sku: OverlaySku) => {
    const prod = OVERLAY_PRODUCTS.find((p) => p.sku === sku) ?? OVERLAY_PRODUCTS[0];
    handleOpenCheckout(prod, '1day');
  };

  return (
    <div className="text-[#F4F4F5]">
      {/* Dedicated Overlays Store Hero & Catalog */}
      <section className="pt-8 pb-16 sm:pt-12 sm:pb-20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Breadcrumb + Language Switcher */}
          <div className="relative overflow-hidden rounded-xl border border-[#FACC15]/25 studio-strip-animated-bg backdrop-blur-md px-4 sm:px-5 py-3 shadow-[0_8px_28px_rgba(0,0,0,0.4)]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-[#FACC15]/14 to-transparent studio-strip-sheen"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[1.5px] overflow-hidden"
            >
              <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-[#EF4444] to-[#FACC15] opacity-75 topbar-beam-sweep" />
            </div>

            <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={onBackHome}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-200 hover:text-white transition-colors whitespace-nowrap"
              >
                <ArrowLeft className="w-4 h-4 text-[#FACC15]" aria-hidden="true" />
                <span>
                  {tLang(
                    {
                      en: 'Back to Home',
                      mr: 'मुख्य पृष्ठावर परत जा',
                      hi: 'होम पेज पर वापस जाएं',
                      gu: 'હોમ પેજ પર પાછા જાઓ',
                    },
                    lang
                  )}
                </span>
              </button>

              <LanguageSwitcher lang={lang} onChangeLang={onChangeLang} variant="inline" />
            </div>
          </div>

          {/* Store Header */}
          <div className="pt-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
            <div className="max-w-3xl space-y-3.5">
              <p className="text-xs sm:text-sm font-medium text-[#FACC15]">
                {tLang(
                  {
                    en: `Today's Special Offer · ${STUDIO_CONTACT.domain} · Just ₹1 (1 Day / 24 Hours)`,
                    mr: `आजची खास ऑफर · ${STUDIO_CONTACT.domain} · फक्त ₹1 (1 दिवस / 24 तास)`,
                    hi: `आज का खास ऑफर · ${STUDIO_CONTACT.domain} · सिर्फ ₹1 (1 दिन / 24 घंटे)`,
                    gu: `આજની ખાસ ઓફર · ${STUDIO_CONTACT.domain} · માત્ર ₹1 (1 દિવસ / 24 કલાક)`,
                  },
                  lang
                )}
              </p>
              <h1
                className={`font-display font-extrabold text-white text-[clamp(1.95rem,3.4vw,3.05rem)] ${
                  lang !== 'en'
                    ? 'leading-[1.38] tracking-normal'
                    : 'leading-[1.16] tracking-tight'
                }`}
              >
                {tLang(
                  {
                    en: 'Live Overlays for OBS & vMix',
                    mr: 'OBS आणि vMix साठी लाईव्ह ओव्हरले',
                    hi: 'OBS और vMix के लिए लाइव ओवरले',
                    gu: 'OBS અને vMix માટે લાઇવ ઓવરલે',
                  },
                  lang
                )}
              </h1>
              <p className="text-sm sm:text-base text-zinc-400 leading-[1.72] max-w-2xl">
                {tLang(
                  {
                    en: "Try the FREE Kabaddi Demo Scoreboard (small STAR EVENT LIVE watermark & 30s timer), or unlock watermark-free Kabaddi Pro & Haldi/Wedding overlays for ₹1 (Today's Offer) — instant automatic unlock for 1 Day (24 hours), then auto-expires.",
                    mr: 'मोफत कबड्डी डेमो स्कोअरबोर्ड (छोट्या STAR EVENT LIVE वॉटरमार्कसह · 30s टायमर), वॉटरमार्क-फ्री कबड्डी प्रो स्कोअरबोर्ड आणि हळदी व लग्न समारंभ ओव्हरले (2 स्टाईल). आजची ऑफर: फक्त ₹1 पेमेंट करा, लगेच आपोआप अनलॉक होईल आणि 1 दिवसानंतर (24 तास) आपोआप एक्सपायर होईल.',
                    hi: 'फ्री कबड्डी डेमो स्कोरबोर्ड (छोटे STAR EVENT LIVE वॉटरमार्क और 30s टाइमर के साथ) आज़माएं, या सिर्फ ₹1 (आज का ऑफर) में वॉटरमार्क-फ्री कबड्डी प्रो और हल्दी-शादी ओवरले 1 दिन (24 घंटे) के लिए अनलॉक करें।',
                    gu: 'ફ્રી કબડ્ડી ડેમો સ્કોરબોર્ડ (નાના STAR EVENT LIVE વોટરમાર્ક અને 30s ટાઈમર સાથે) અજમાવો, અથવા માત્ર ₹1 (આજની ઓફર) માં વોટરમાર્ક-ફ્રી કબડ્ડી પ્રો અને હળદી-લગ્ન ઓવરલે 1 દિવસ (24 કલાક) માટે અનલોક કરો.',
                  },
                  lang
                )}
              </p>
            </div>

            {/* Filter tabs */}
            <div
              role="group"
              aria-label="Filter overlays"
              className="flex flex-wrap items-center gap-1 p-1 bg-[#141418] border border-white/10 rounded-xl shrink-0"
            >
              {(
                [
                  { id: 'all', label: { en: 'All (5)', mr: 'सर्व (5)', hi: 'सभी (5)', gu: 'બધા (5)' } },
                  { id: 'kabaddi', label: { en: 'Kabaddi (2)', mr: 'कबड्डी (2)', hi: 'कबड्डी (2)', gu: 'કબડ્ડી (2)' } },
                  { id: 'haldi', label: { en: 'Haldi & Wedding (3)', mr: 'हळदी व लग्न (3)', hi: 'हल्दी और शादी (3)', gu: 'હળદી અને લગ્ન (3)' } },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterMode(tab.id)}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    filterMode === tab.id
                      ? 'bg-[#DC2626] text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab.label[lang]}
                </button>
              ))}
            </div>
          </div>

          {/* Overlay Product Cards (Free Kabaddi Demo + Paid ₹99 / 1 Day Overlays) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visibleProducts.map((product) => {
              const isFreeDemo = Boolean(product.isFreeDemo);
              const token = verifiedTokens.find((t) => t.sku === product.sku && t.expiresAt > nowTs);
              const isUnlocked = isFreeDemo || Boolean(token && unlockedSkus.includes(product.sku));
              const pendingOrder = pendingOrders[product.sku];
              const isPending = !isFreeDemo && !isUnlocked && pendingOrder?.status === 'pending';
              const isActiveInStudio =
                activeMode === product.mode && activeStyle === product.style;

              return (
                <article
                  key={product.sku}
                  className={`bg-[#121216]/84 backdrop-blur-sm border rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-5 transition-colors ${
                    isActiveInStudio
                      ? 'border-[#FACC15]/80'
                      : isFreeDemo
                        ? 'border-[#4ADE80]/40 hover:border-[#4ADE80]/70'
                        : 'border-white/12 hover:border-white/25'
                  }`}
                >
                  <div className="space-y-4">
                    <OverlayMiniPreview mode={product.mode} style={product.style} />

                    {/* Unboxed inline metadata */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {product.meta[lang].map((m, idx) => (
                          <span key={m} className="inline-flex items-center gap-1.5">
                            {idx > 0 && (
                              <span aria-hidden="true" className="text-zinc-600">
                                ·
                              </span>
                            )}
                            <span>{m}</span>
                          </span>
                        ))}
                      </div>
                      <span
                        className={`font-mono font-bold tabular-nums ${
                          isFreeDemo || isUnlocked ? 'text-[#4ADE80]' : 'text-[#FACC15]'
                        }`}
                      >
                        {isFreeDemo
                          ? lang === 'mr'
                            ? 'मोफत डेमो'
                            : 'FREE DEMO'
                          : isUnlocked && token
                            ? `${formatRemainingTime(token.expiresAt, nowTs)} LEFT`
                            : lang === 'mr'
                              ? 'आजची ऑफर ₹1 · 1 दिवस'
                              : "TODAY'S OFFER ₹1 · 1 DAY"}
                      </span>
                    </div>

                    <div>
                      <h2 className="font-display text-lg sm:text-xl font-bold text-white leading-[1.38]">
                        {product.title[lang]}
                      </h2>
                      <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 leading-relaxed">
                        {product.subtitle[lang]}
                      </p>
                    </div>

                    {/* Pricing Row: Free Demo OR Single Clean 1-Day ₹1 Auto-Unlock Offer */}
                    <div className="pt-3 border-t border-white/10">
                      {isFreeDemo ? (
                        <div className="flex flex-wrap items-baseline justify-between gap-3">
                          <div className="flex items-baseline gap-2.5">
                            <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#4ADE80] tabular-nums">
                              {lang === 'mr' ? 'मोफत (FREE)' : 'FREE · ₹0'}
                            </span>
                            <span className="text-xs text-zinc-400">
                              {lang === 'mr'
                                ? 'छोटा STAR EVENT LIVE वॉटरमार्क'
                                : 'Small STAR EVENT LIVE Watermark'}
                            </span>
                          </div>
                          <span className="font-mono text-xs font-semibold text-[#4ADE80]">
                            DEMO
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-baseline justify-between gap-3">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#FACC15] tabular-nums">
                              ₹{product.salePrice}
                            </span>
                            <span className="font-mono text-sm text-zinc-500 line-through tabular-nums">
                              ₹{product.originalPrice}
                            </span>
                            <span className="text-xs text-zinc-400">
                              {lang === 'mr' ? '/ 1 दिवस (24 तास)' : '/ 1 Day (24 Hours)'}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] font-semibold text-[#4ADE80]">
                            {lang === 'mr' ? 'ऑटो अनलॉक · 24h नंतर एक्सपायर' : 'AUTO-UNLOCK · 24H EXPIRY'}
                          </span>
                        </div>
                      )}
                    </div>

                    <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                      {product.features[lang].map((feat) => (
                        <li key={feat} className="flex items-start gap-2.5">
                          <Check
                            className={`w-4 h-4 shrink-0 mt-1 ${
                              isFreeDemo ? 'text-[#4ADE80]' : 'text-[#FACC15]'
                            }`}
                            aria-hidden="true"
                          />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-3">
                    {isFreeDemo ? (
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(product)}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold text-black bg-[#4ADE80] hover:bg-[#22C55E] rounded-lg transition-colors whitespace-nowrap"
                      >
                        <LockOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>
                          {lang === 'mr' ? 'मोफत वापरा · स्टुडिओत उघडा' : 'Use Free · Open in Studio'}
                        </span>
                      </button>
                    ) : isUnlocked ? (
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(product)}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-lg transition-colors whitespace-nowrap"
                      >
                        <LockOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>
                          {lang === 'mr' ? 'अनलॉक · स्टुडिओत उघडा' : 'Unlocked · Open in Studio'}
                        </span>
                      </button>
                    ) : isPending ? (
                      <button
                        type="button"
                        onClick={() => handleOpenCheckout(product, pendingOrder?.planId || '1day')}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold text-[#FACC15] bg-[#1D160B] hover:bg-[#291F0F] border border-[#FACC15]/50 rounded-lg transition-colors whitespace-nowrap"
                      >
                        {(pendingOrder?.qrCloseBy || (pendingOrder ? pendingOrder.createdAt + 30 * 60 * 1000 : 0)) <= nowTs ? (
                          <>
                            <RefreshCw className="w-4 h-4 shrink-0" aria-hidden="true" />
                            <span>
                              {lang === 'mr' ? 'QR एक्सपायर · Refresh QR करा' : 'QR Expired · Refresh QR'}
                            </span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
                            <span>
                              {lang === 'mr'
                                ? `₹${pendingOrder?.amount || 1} प्रतीक्षेत · Transaction ID टाका`
                                : `₹${pendingOrder?.amount || 1} Pending · Verify / Refresh QR`}
                            </span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenCheckout(product, '1day')}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-lg transition-colors whitespace-nowrap tabular-nums"
                      >
                        <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>
                          {lang === 'mr'
                            ? '₹1 भरा आणि अनलॉक करा (1 दिवस)'
                            : 'Pay ₹1 & Unlock (1 Day)'}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenPreview(product)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-3 text-xs sm:text-sm font-semibold text-zinc-200 hover:text-white border border-white/15 hover:border-white/30 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <Eye className="w-4 h-4 text-[#FACC15] shrink-0" aria-hidden="true" />
                      <span>{lang === 'mr' ? 'लाईव्ह प्रिव्ह्यू' : 'Live Preview'}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Embedded Live Overlay Control Desk & Paid OBS/vMix URL Studio */}
      <LiveStudioPreview
        lang={lang}
        activeMode={activeMode}
        onChangeMode={onChangeMode}
        activeStyle={activeStyle}
        onChangeStyle={onChangeStyle}
        unlockedSkus={unlockedSkus}
        verifiedTokens={verifiedTokens}
        onRequestPurchase={handleRequestPurchaseBySku}
        onBookFromPreview={onBookFromOverlay}
      />

      {/* Verified Multi-Plan Auto QR Checkout Modal */}
      <OverlayCheckoutModal
        lang={lang}
        product={checkoutProduct}
        initialPlanId={checkoutPlanId}
        existingPendingOrder={
          checkoutProduct ? pendingOrders[checkoutProduct.sku] ?? null : null
        }
        onClose={() => setCheckoutProduct(null)}
        onPendingOrderChange={(order) => {
          if (checkoutProduct) {
            onPendingOrderChange(checkoutProduct.sku, order);
          }
        }}
        onVerifiedUnlock={onVerifiedUnlock}
      />
    </div>
  );
}
