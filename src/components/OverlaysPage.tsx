import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Clock, Eye, Lock, LockOpen } from 'lucide-react';
import { EventCategoryId, Language, STUDIO_CONTACT } from '../data/content';
import {
  formatRemainingTime,
  OVERLAY_PRODUCTS,
  OverlayProduct,
  OverlaySku,
  PendingOverlayOrder,
  VerifiedOverlayToken,
} from '../data/overlayCatalog';
import { OverlayMode, OverlayStyle } from '../types/overlay';
import { KabaddiScoreboardBar } from './KabaddiScoreboardBar';
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
      <div className="my-auto text-center">
        <span className="font-mono text-[9px] text-zinc-200 bg-black/60 px-2 py-0.5 rounded border border-white/10">
          1920×1080 TRANSPARENT
        </span>
      </div>

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
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    if (verifiedTokens.length === 0) return;
    const id = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [verifiedTokens.length]);

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

  const handleRequestPurchaseBySku = (sku: OverlaySku) => {
    const prod = OVERLAY_PRODUCTS.find((p) => p.sku === sku) ?? OVERLAY_PRODUCTS[0];
    if (prod.isFreeDemo) {
      handleOpenPreview(prod);
      return;
    }
    setCheckoutProduct(prod);
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
                <span>{lang === 'mr' ? 'मुख्य पृष्ठावर परत जा' : 'Back to Home'}</span>
              </button>

              <div
                role="group"
                aria-label="Language selection"
                className="inline-flex items-center p-1 bg-black/55 border border-white/15 rounded-lg shrink-0"
              >
                <button
                  type="button"
                  onClick={() => onChangeLang('mr')}
                  aria-pressed={lang === 'mr'}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    lang === 'mr' ? 'bg-[#DC2626] text-white' : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  मराठी
                </button>
                <button
                  type="button"
                  onClick={() => onChangeLang('en')}
                  aria-pressed={lang === 'en'}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    lang === 'en' ? 'bg-[#DC2626] text-white' : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  English
                </button>
              </div>
            </div>
          </div>

          {/* Store Header */}
          <div className="pt-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
            <div className="max-w-3xl space-y-3.5">
              <p className="text-xs sm:text-sm font-medium text-[#FACC15]">
                {lang === 'mr'
                  ? `ओव्हरले स्टोअर · ${STUDIO_CONTACT.domain} · विशेष ऑफर ₹149 ऐवजी फक्त ₹99`
                  : `Broadcast Overlay Store · ${STUDIO_CONTACT.domain} · Launch Offer ₹99 (Was ₹149)`}
              </p>
              <h1
                className={`font-display font-extrabold text-white text-[clamp(1.95rem,3.4vw,3.05rem)] ${
                  lang === 'mr'
                    ? 'leading-[1.38] tracking-normal'
                    : 'leading-[1.16] tracking-tight'
                }`}
              >
                {lang === 'mr'
                  ? 'OBS आणि vMix साठी 1920×1080 ट्रान्सपरंट ओव्हरले'
                  : '1920×1080 Transparent Overlays for OBS & vMix'}
              </h1>
              <p className="text-sm sm:text-base text-zinc-400 leading-[1.72] max-w-2xl">
                {lang === 'mr'
                  ? 'मोफत कबड्डी डेमो स्कोअरबोर्ड (छोट्या STAR EVENT LIVE वॉटरमार्कसह · 30s टायमर), वॉटरमार्क-फ्री कबड्डी प्रो स्कोअरबोर्ड आणि हळदी व लग्न समारंभ ओव्हरले (2 स्टाईल). प्रो अनलॉक फक्त ₹99 / 1 दिवस.'
                  : 'Try the FREE Kabaddi Demo Scoreboard (with a small STAR EVENT LIVE watermark & 30s timer), or unlock the watermark-free Kabaddi Pro Scoreboard and 2 Haldi & Wedding overlays at ₹99 / 1 Day (was ₹149).'}
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
                  { id: 'all', label: { mr: 'सर्व (4)', en: 'All (4)' } },
                  { id: 'kabaddi', label: { mr: 'कबड्डी (2)', en: 'Kabaddi (2)' } },
                  { id: 'haldi', label: { mr: 'हळदी व लग्न (2)', en: 'Haldi & Wedding (2)' } },
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
                            ? 'मोफत · की शिवाय'
                            : 'FREE · NO KEY NEEDED'
                          : isUnlocked && token
                            ? `${formatRemainingTime(token.expiresAt, nowTs)} LEFT`
                            : lang === 'mr'
                              ? '1 दिवस पास · ₹50 सूट'
                              : '1 DAY PASS · SAVE ₹50'}
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

                    {/* Pricing Row: Free Demo OR Slashed ₹149 -> ₹99 / 1 Day */}
                    <div className="pt-3 border-t border-white/10 flex flex-wrap items-baseline justify-between gap-3">
                      {isFreeDemo ? (
                        <>
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
                        </>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-2.5">
                            <span className="font-mono text-base sm:text-lg text-zinc-500 line-through tabular-nums">
                              ₹{product.originalPrice}
                            </span>
                            <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#FACC15] tabular-nums">
                              ₹{product.salePrice}
                            </span>
                            <span className="text-xs text-zinc-400">
                              {lang === 'mr' ? '/ 1 दिवस वैध (Auto-Lock)' : '/ 1 Day (auto-locks)'}
                            </span>
                          </div>
                          <span className="font-mono text-xs font-semibold text-[#4ADE80] tabular-nums">
                            33% OFF
                          </span>
                        </>
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
                        onClick={() => setCheckoutProduct(product)}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold text-[#FACC15] bg-[#1D160B] hover:bg-[#291F0F] border border-[#FACC15]/50 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>
                          {lang === 'mr'
                            ? '₹99 व्हेरिफिकेशन प्रतीक्षेत · तपासा'
                            : '₹99 Verification Pending · Check'}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCheckoutProduct(product)}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-lg transition-colors whitespace-nowrap tabular-nums"
                      >
                        <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>
                          {lang === 'mr'
                            ? `₹${product.salePrice} पेमेंट करा व अनलॉक करा`
                            : `Pay ₹${product.salePrice} via UPI QR`}
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

      {/* Verified ₹99 UPI QR Checkout Modal */}
      <OverlayCheckoutModal
        lang={lang}
        product={checkoutProduct}
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
