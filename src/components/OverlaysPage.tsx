import { useState } from 'react';
import { ArrowLeft, Check, Clock, Eye, Lock, LockOpen } from 'lucide-react';
import { EventCategoryId, Language, STUDIO_CONTACT } from '../data/content';
import {
  OVERLAY_PRODUCTS,
  OverlayProduct,
  OverlaySku,
  PendingOverlayOrder,
  VerifiedOverlayToken,
} from '../data/overlayCatalog';
import { OverlayMode, OverlayStyle } from '../types/overlay';
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
  pendingOrders: Partial<Record<OverlaySku, PendingOverlayOrder>>;
  onPendingOrderChange: (sku: OverlaySku, order: PendingOverlayOrder | null) => void;
  onVerifiedUnlock: (token: VerifiedOverlayToken) => void;
  onBackHome: () => void;
  onBookFromOverlay: (category: EventCategoryId) => void;
}

function OverlayMiniPreview({ mode, style }: { mode: OverlayMode; style: OverlayStyle }) {
  const isClassic = style === 'classic';
  return (
    <div
      className={`relative aspect-video w-full rounded-xl overflow-hidden flex flex-col justify-between p-3 ${
        isClassic
          ? mode === 'kabaddi'
            ? 'border-2 border-[#FACC15] shadow-[inset_0_0_0_2px_#DC2626]'
            : 'border-2 border-[#FACC15] shadow-[inset_0_0_0_3px_#B45309]'
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
        {mode === 'kabaddi' ? (
          isClassic ? (
            <>
              <span className="bg-[#DC2626] border border-[#FACC15] text-white px-1.5 py-0.5 rounded text-[8px] font-mono font-bold">
                LIVE KABADDI
              </span>
              <span className="bg-[#0B0A0E]/90 border border-[#FACC15]/80 text-[#FACC15] px-2 py-0.5 rounded text-[8px] font-bold truncate">
                कबड्डी महासंग्राम
              </span>
            </>
          ) : (
            <>
              <span className="bg-[#0A0C12]/90 border border-[#FACC15] rounded-full px-2 py-0.5 text-[8px] font-mono font-bold text-[#FACC15]">
                LIVE · STAR EVENT
              </span>
              <span className="bg-[#0A0C12]/85 border border-white/20 rounded-full px-2 py-0.5 text-[8px] text-zinc-200 truncate">
                PRO TV MODE
              </span>
            </>
          )
        ) : isClassic ? (
          <>
            <span className="bg-[#B45309] border border-[#FACC15] text-[#FEF08A] px-1.5 py-0.5 rounded text-[8px] font-mono font-bold">
              HALDI LIVE
            </span>
            <span className="bg-[#78350F] border border-[#FACC15] text-[#FEF08A] px-2 py-0.5 rounded-full text-[8px] font-bold truncate">
              शुभ हळदी समारंभ
            </span>
          </>
        ) : (
          <span className="ml-auto bg-[#180F06]/90 border border-[#FACC15] text-[#FACC15] px-2 py-0.5 rounded-full text-[8px] font-bold">
            STAR EVENT LIVE
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
      {mode === 'kabaddi' ? (
        isClassic ? (
          <div className="bg-[#12080B]/95 border border-[#FACC15] rounded-md overflow-hidden">
            <div className="grid grid-cols-12 items-center text-[9px] font-mono font-extrabold">
              <div className="col-span-5 bg-[#DC2626] px-2 py-1 flex justify-between text-white">
                <span className="truncate">NERAL</span>
                <span className="text-[#FACC15]">24</span>
              </div>
              <div className="col-span-2 bg-[#09090B] py-1 text-center text-[#FACC15]">30s</div>
              <div className="col-span-5 bg-[#1D4ED8] px-2 py-1 flex justify-between text-white">
                <span className="text-[#FACC15]">21</span>
                <span className="truncate">KARJAT</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-[92%] mx-auto bg-[#0A0C14]/95 border border-[#FACC15] rounded-full px-1.5 py-1 flex items-center justify-between gap-1 text-[8px] font-mono font-extrabold">
            <span className="flex-1 bg-[#EF4444] text-white rounded-full px-2 py-0.5 flex justify-between">
              <span>NERAL</span>
              <span className="text-[#FEF08A]">24</span>
            </span>
            <span className="w-7 h-7 -my-2 rounded-full bg-[#09090B] border border-[#FACC15] text-[#FACC15] inline-flex items-center justify-center shrink-0">
              30s
            </span>
            <span className="flex-1 bg-[#0284C7] text-white rounded-full px-2 py-0.5 flex justify-between">
              <span className="text-[#FEF08A]">21</span>
              <span>KARJAT</span>
            </span>
          </div>
        )
      ) : isClassic ? (
        <div className="bg-gradient-to-r from-[#78350F] via-[#B45309] to-[#78350F] border border-[#FACC15] rounded-md px-3 py-1.5 text-center">
          <p className="text-[10px] font-bold text-white truncate">देशमुख कुटुंब — हळदी समारंभ</p>
          <p className="text-[8px] text-[#FEF08A] truncate">Neral & Karjat Live • 9890175727</p>
        </div>
      ) : (
        <div className="w-[88%] mx-auto bg-gradient-to-r from-[#221204]/95 via-[#92400E]/95 to-[#221204]/95 border border-[#FDE047] rounded-full px-3 py-1.5 flex items-center justify-between gap-2">
          <span className="w-1.5 h-1.5 rotate-45 bg-[#FACC15] shrink-0" />
          <p className="text-[9px] font-bold text-white truncate text-center flex-1">
            देशमुख कुटुंब — हळदी समारंभ
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
  pendingOrders,
  onPendingOrderChange,
  onVerifiedUnlock,
  onBackHome,
  onBookFromOverlay,
}: OverlaysPageProps) {
  const [filterMode, setFilterMode] = useState<'all' | OverlayMode>('all');
  const [checkoutProduct, setCheckoutProduct] = useState<OverlayProduct | null>(null);

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
    setCheckoutProduct(prod);
  };

  return (
    <div className="bg-[#09090B] text-[#F4F4F5]">
      {/* Dedicated Overlays Store Hero & Catalog */}
      <section className="pt-8 pb-16 sm:pt-12 sm:pb-20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Breadcrumb + Language Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
            <button
              type="button"
              onClick={onBackHome}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-300 hover:text-white transition-colors whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4 text-[#FACC15]" aria-hidden="true" />
              <span>{lang === 'mr' ? 'मुख्य पृष्ठावर परत जा' : 'Back to Home'}</span>
            </button>

            <div
              role="group"
              aria-label="Language selection"
              className="inline-flex items-center p-1 bg-[#141418] border border-white/10 rounded-lg shrink-0"
            >
              <button
                type="button"
                onClick={() => onChangeLang('mr')}
                aria-pressed={lang === 'mr'}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  lang === 'mr' ? 'bg-[#DC2626] text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                मराठी
              </button>
              <button
                type="button"
                onClick={() => onChangeLang('en')}
                aria-pressed={lang === 'en'}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  lang === 'en' ? 'bg-[#DC2626] text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* Store Header */}
          <div className="pt-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
            <div className="max-w-3xl space-y-3">
              <p className="text-xs sm:text-sm font-medium text-[#FACC15]">
                {lang === 'mr'
                  ? `ओव्हरले स्टोअर · ${STUDIO_CONTACT.domain} · विशेष ऑफर ₹149 ऐवजी फक्त ₹99`
                  : `Broadcast Overlay Store · ${STUDIO_CONTACT.domain} · Launch Offer ₹99 (Was ₹149)`}
              </p>
              <h1 className="font-display font-extrabold tracking-tight text-white text-[clamp(2rem,3.6vw,3.2rem)] leading-[1.12]">
                {lang === 'mr'
                  ? 'OBS आणि vMix साठी 1920×1080 ट्रान्सपरंट ओव्हरले'
                  : '1920×1080 Transparent Overlays for OBS & vMix'}
              </h1>
              <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl">
                {lang === 'mr'
                  ? 'कबड्डी महासंग्राम स्कोअरबोर्ड आणि शुभ हळदी समारंभाचे 2-2 खास डिझाईन. प्रत्येक ओव्हरले ₹149 कट करून फक्त ₹99 मध्ये त्वरित अनलॉक करा — थेट OBS/vMix URL आणि PNG डाउनलोडसह.'
                  : 'Two distinct broadcast styles each for Kabaddi Scoreboard and Haldi Live. Unlock any overlay for ₹99 (slashed from ₹149) with instant OBS Browser Source URL, vMix URL, live sync, and PNG download.'}
              </p>
            </div>

            {/* Filter tabs */}
            <div
              role="group"
              aria-label="Filter overlays"
              className="flex items-center gap-1 p-1 bg-[#141418] border border-white/10 rounded-xl shrink-0"
            >
              {(
                [
                  { id: 'all', label: { mr: 'सर्व (4)', en: 'All (4)' } },
                  { id: 'kabaddi', label: { mr: 'कबड्डी (2)', en: 'Kabaddi (2)' } },
                  { id: 'haldi', label: { mr: 'हळदी (2)', en: 'Haldi (2)' } },
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

          {/* 4 Paid Overlay Product Cards (₹149 slashed to ₹99) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visibleProducts.map((product) => {
              const isUnlocked = unlockedSkus.includes(product.sku);
              const pendingOrder = pendingOrders[product.sku];
              const isPending = !isUnlocked && pendingOrder?.status === 'pending';
              const isActiveInStudio =
                activeMode === product.mode && activeStyle === product.style;

              return (
                <article
                  key={product.sku}
                  className={`bg-[#121216] border rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-5 transition-colors ${
                    isActiveInStudio ? 'border-[#FACC15]/80' : 'border-white/12 hover:border-white/25'
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
                        className={`font-mono font-bold ${
                          isUnlocked ? 'text-[#4ADE80]' : 'text-[#FACC15]'
                        }`}
                      >
                        {isUnlocked
                          ? lang === 'mr'
                            ? 'अनलॉक केलेले'
                            : 'UNLOCKED'
                          : lang === 'mr'
                            ? '₹50 सूट'
                            : 'SAVE ₹50'}
                      </span>
                    </div>

                    <div>
                      <h2 className="font-display text-lg sm:text-xl font-bold text-white">
                        {product.title[lang]}
                      </h2>
                      <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                        {product.subtitle[lang]}
                      </p>
                    </div>

                    {/* Slashed Pricing Row: ₹149 -> ₹99 */}
                    <div className="pt-3 border-t border-white/10 flex flex-wrap items-baseline justify-between gap-3">
                      <div className="flex items-baseline gap-2.5">
                        <span className="font-mono text-base sm:text-lg text-zinc-500 line-through tabular-nums">
                          ₹{product.originalPrice}
                        </span>
                        <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#FACC15] tabular-nums">
                          ₹{product.salePrice}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {lang === 'mr' ? '/ एकदाच पेमेंट' : '/ one-time'}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-semibold text-[#4ADE80] tabular-nums">
                        33% OFF
                      </span>
                    </div>

                    <ul className="space-y-1.5 text-xs sm:text-sm text-zinc-300">
                      {product.features[lang].map((feat) => (
                        <li key={feat} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-[#FACC15] shrink-0 mt-0.5" aria-hidden="true" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-3">
                    {isUnlocked ? (
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
