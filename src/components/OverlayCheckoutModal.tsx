import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { Language } from '../data/content';
import {
  getOverlayPlan,
  OverlayPlanId,
  OverlayProduct,
  PendingOverlayOrder,
  VerifiedOverlayToken,
} from '../data/overlayCatalog';

interface OverlayCheckoutModalProps {
  lang: Language;
  product: OverlayProduct | null;
  initialPlanId?: OverlayPlanId;
  existingPendingOrder?: PendingOverlayOrder | null;
  onClose: () => void;
  onPendingOrderChange: (order: PendingOverlayOrder | null) => void;
  onVerifiedUnlock: (tokens: VerifiedOverlayToken | VerifiedOverlayToken[]) => void;
}

export function OverlayCheckoutModal({
  lang,
  product,
  existingPendingOrder,
  onClose,
  onPendingOrderChange,
  onVerifiedUnlock,
}: OverlayCheckoutModalProps) {
  // Single clean 1-Day (24 Hours) auto-expiring pass — no Unlock Keys
  const plan = getOverlayPlan('1day');

  const [gatewayReady, setGatewayReady] = useState<boolean | null>(null);
  const [cashfreeEnv, setCashfreeEnv] = useState<'sandbox' | 'production'>('sandbox');
  const [creatingOrder, setCreatingOrder] = useState<boolean>(false);
  const [openingCheckout, setOpeningCheckout] = useState<boolean>(false);
  const [checkingStatus, setCheckingStatus] = useState<boolean>(false);
  const [gatewayQrUrl, setGatewayQrUrl] = useState<string | null>(null);
  const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<PendingOverlayOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  // Sync modal state whenever product opens/closes
  useEffect(() => {
    if (!product) {
      setActiveOrder(null);
      setGatewayQrUrl(null);
      setPaymentSessionId(null);
      setError(null);
      return;
    }

    if (
      existingPendingOrder &&
      existingPendingOrder.sku === product.sku &&
      existingPendingOrder.paymentMethod === 'cashfree_qr' &&
      existingPendingOrder.status === 'pending'
    ) {
      setActiveOrder(existingPendingOrder);
      setGatewayQrUrl(existingPendingOrder.gatewayQrImageUrl || null);
      setPaymentSessionId(existingPendingOrder.paymentSessionId || null);
    } else {
      setActiveOrder(null);
      setGatewayQrUrl(null);
      setPaymentSessionId(null);
    }
    setError(null);
  }, [product, existingPendingOrder]);

  // Initialize Cashfree PG order + dynamic UPI QR for 1 Day (24h) auto-unlock
  useEffect(() => {
    if (!product) return;
    let cancelled = false;

    const initCashfreeOrder = async () => {
      try {
        const cfgRes = await fetch('/api/payment/config', { cache: 'no-store' });
        const cfg = await cfgRes.json();
        if (cancelled) return;

        const enabled = Boolean(cfgRes.ok && cfg?.autoUnlockEnabled);
        setGatewayReady(enabled);
        setCashfreeEnv(cfg?.cashfreeEnv === 'production' ? 'production' : 'sandbox');

        if (!enabled) {
          setGatewayQrUrl(null);
          setPaymentSessionId(null);
          return;
        }

        // Reuse existing pending 1-day Cashfree order for this exact overlay
        if (
          activeOrder &&
          activeOrder.status === 'pending' &&
          activeOrder.paymentMethod === 'cashfree_qr' &&
          activeOrder.sku === product.sku &&
          activeOrder.amount === plan.price &&
          (activeOrder.gatewayQrImageUrl || activeOrder.paymentSessionId)
        ) {
          setGatewayQrUrl(activeOrder.gatewayQrImageUrl || null);
          setPaymentSessionId(activeOrder.paymentSessionId || null);
          return;
        }

        setCreatingOrder(true);
        setError(null);
        const res = await fetch('/api/payment/cashfree/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sku: product.sku,
            planId: '1day',
          }),
        });
        const data = await res.json();
        if (cancelled) return;

        if (res.ok && data?.mode === 'cashfree_auto' && data?.order) {
          const orderObj = data.order as PendingOverlayOrder;
          setGatewayQrUrl(data.qrImageUrl || orderObj.gatewayQrImageUrl || null);
          setPaymentSessionId(data.paymentSessionId || orderObj.paymentSessionId || null);
          setActiveOrder(orderObj);
          onPendingOrderChange(orderObj);
        } else if (!res.ok) {
          setError(data?.error || 'Could not initialize Cashfree payment order.');
        }
      } catch {
        if (!cancelled) {
          setGatewayReady(false);
          setError(
            lang === 'mr'
              ? 'पेमेंट सर्व्हरशी संपर्क होऊ शकला नाही. कृपया पुन्हा प्रयत्न करा.'
              : 'Unable to reach payment server. Please retry.'
          );
        }
      } finally {
        if (!cancelled) setCreatingOrder(false);
      }
    };

    initCashfreeOrder();
    return () => {
      cancelled = true;
    };
  }, [product, plan.price, retryTick]);

  // Real-time SSE + 3-second server verification polling -> auto-unlocks for 24 hours on confirmed payment
  useEffect(() => {
    if (!product || !activeOrder || activeOrder.status !== 'pending') return;

    const applyUpdate = (orderData: PendingOverlayOrder) => {
      setActiveOrder(orderData);
      if (orderData.status === 'approved' && orderData.unlockCode) {
        onPendingOrderChange(null);
        onVerifiedUnlock({
          sku: product.sku,
          orderId: orderData.orderId,
          unlockCode: orderData.unlockCode,
          planId: '1day',
          expiresAt: orderData.expiresAt || Date.now() + 24 * 60 * 60 * 1000,
        });
      } else if (orderData.status === 'rejected' || orderData.status === 'revoked') {
        onPendingOrderChange(null);
      } else {
        onPendingOrderChange(orderData);
      }
    };

    const es = new EventSource(
      `/api/overlay/orders/${encodeURIComponent(activeOrder.orderId)}/stream`
    );
    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed?.order) {
          applyUpdate(parsed.order as PendingOverlayOrder);
        }
      } catch {
        // Ignore malformed SSE packets
      }
    };

    const pollId = window.setInterval(async () => {
      try {
        const res = await fetch(
          `/api/payment/cashfree/verify?orderId=${encodeURIComponent(activeOrder.orderId)}`,
          { cache: 'no-store' }
        );
        const data = await res.json();
        if (res.ok && data?.order) {
          applyUpdate(data.order as PendingOverlayOrder);
        }
      } catch {
        // Retry next tick
      }
    }, 3000);

    return () => {
      es.close();
      window.clearInterval(pollId);
    };
  }, [product, activeOrder?.orderId, activeOrder?.status, onPendingOrderChange, onVerifiedUnlock]);

  if (!product) return null;

  const handleVerifyPaymentNow = async () => {
    if (!activeOrder) return;
    setCheckingStatus(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/payment/cashfree/verify?orderId=${encodeURIComponent(activeOrder.orderId)}`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (res.ok && data?.order) {
        const orderData = data.order as PendingOverlayOrder;
        setActiveOrder(orderData);
        if (orderData.status === 'approved' && orderData.unlockCode) {
          onPendingOrderChange(null);
          onVerifiedUnlock({
            sku: product.sku,
            orderId: orderData.orderId,
            unlockCode: orderData.unlockCode,
            planId: '1day',
            expiresAt: orderData.expiresAt || Date.now() + 24 * 60 * 60 * 1000,
          });
        }
      }
    } catch {
      setError(
        lang === 'mr'
          ? 'पेमेंट स्टेटस तपासता आला नाही. पुन्हा प्रयत्न करा.'
          : 'Could not verify payment status right now. Please retry.'
      );
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleLaunchCashfreeCheckout = async () => {
    if (!paymentSessionId || !activeOrder) return;
    setOpeningCheckout(true);
    setError(null);
    try {
      const w = window as unknown as {
        Cashfree?: (opts: { mode: 'sandbox' | 'production' }) => {
          checkout: (opts: { paymentSessionId: string; redirectTarget: string }) => Promise<{
            error?: { message?: string };
            paymentDetails?: unknown;
          }>;
        };
      };

      if (typeof w.Cashfree !== 'function') {
        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector<HTMLScriptElement>(
            'script[src="https://sdk.cashfree.com/js/v3/cashfree.js"]'
          );
          if (existing) {
            if (typeof w.Cashfree === 'function') {
              resolve();
              return;
            }
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(new Error('Cashfree SDK load failed')), {
              once: true,
            });
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Cashfree SDK load failed'));
          document.head.appendChild(script);
        });
      }

      if (typeof w.Cashfree !== 'function') {
        throw new Error('Cashfree checkout SDK unavailable.');
      }

      const cashfree = w.Cashfree({ mode: cashfreeEnv });
      const result = await cashfree.checkout({
        paymentSessionId,
        redirectTarget: '_modal',
      });

      if (result?.error?.message) {
        setError(result.error.message);
      }

      await handleVerifyPaymentNow();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not open Cashfree checkout modal. Please scan the QR code or retry.'
      );
    } finally {
      setOpeningCheckout(false);
    }
  };

  const isListening =
    Boolean(gatewayReady) &&
    activeOrder?.status === 'pending' &&
    Boolean(gatewayQrUrl || paymentSessionId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/82 backdrop-blur-sm overflow-y-auto"
    >
      <div className="relative w-full max-w-lg bg-[#121216] border border-white/15 rounded-2xl p-5 sm:p-7 space-y-5 my-auto max-h-[92vh] overflow-y-auto">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close checkout"
          className="absolute top-4 right-4 w-9 h-9 inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Product Header */}
        <div className="space-y-1.5 pr-8">
          <p className="text-xs font-mono font-semibold text-[#FACC15] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>
              {lang === 'mr'
                ? 'आजची ऑफर · पेमेंट होताच ऑटो अनलॉक (1 दिवस)'
                : "TODAY'S OFFER · INSTANT AUTO-UNLOCK (1 DAY)"}
            </span>
          </p>
          <h3 id="checkout-modal-title" className="font-display text-lg sm:text-2xl font-bold text-white">
            {product.title[lang]}
          </h3>
        </div>

        {/* 1-Day Pass Summary Bar */}
        <div className="bg-[#18150C] border border-[#FACC15]/40 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4ADE80]">
              {lang === 'mr' ? 'आजची खास ऑफर · 1 दिवस (24 तास)' : "TODAY'S OFFER · 1 DAY (24 HOURS)"}
            </span>
            <p className="text-xs text-zinc-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#FACC15] shrink-0" aria-hidden="true" />
              <span>
                {lang === 'mr'
                  ? '24 तासांनंतर आपोआप एक्सपायर व लॉक होईल'
                  : 'Full OBS & vMix access · Auto-expires after 24 hours'}
              </span>
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="block font-mono text-2xl sm:text-3xl font-extrabold text-[#FACC15] tabular-nums leading-none">
              ₹{plan.price}
            </span>
            <span className="font-mono text-xs text-zinc-500 line-through tabular-nums">
              ₹{plan.originalPrice}
            </span>
          </div>
        </div>

        {/* Verified & Unlocked State */}
        {activeOrder?.status === 'approved' ? (
          <div className="bg-[#0D1A12] border border-[#4ADE80]/40 rounded-xl p-5 space-y-4 text-center">
            <CheckCircle2 className="w-11 h-11 text-[#4ADE80] mx-auto" aria-hidden="true" />
            <div className="space-y-1">
              <h4 className="font-display text-lg font-bold text-white">
                {lang === 'mr'
                  ? 'पेमेंट यशस्वी! ओव्हरले 1 दिवसासाठी अनलॉक झाले'
                  : 'Payment Confirmed — Unlocked for 1 Day!'}
              </h4>
              <p className="text-xs text-zinc-300">
                {lang === 'mr'
                  ? 'तुमचा OBS / vMix लाईव्ह URL व 1920×1080 PNG एक्सपोर्ट सुरू झाला आहे. 24 तासांनंतर आपोआप एक्सपायर होईल.'
                  : 'Your live OBS / vMix Browser Source URL & 1920×1080 PNG export are now active and will auto-expire after 24 hours.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-5 text-sm font-semibold text-black bg-[#4ADE80] hover:bg-[#22C55E] rounded-lg transition-colors"
            >
              {lang === 'mr' ? 'स्टुडिओमध्ये जा व OBS/vMix URL कॉपी करा' : 'Continue to Studio'}
            </button>
          </div>
        ) : gatewayReady === false ? (
          /* Cashfree Gateway Not Yet Configured Notice */
          <div className="bg-[#181410] border border-[#FACC15]/35 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-2.5 text-xs text-zinc-200">
              <AlertCircle className="w-4 h-4 text-[#FACC15] shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <p className="font-bold text-white">
                  {lang === 'mr'
                    ? 'Cashfree पेमेंट गेटवे अद्याप सेट केलेले नाही'
                    : 'Cashfree Payment Gateway Not Configured Yet'}
                </p>
                <p className="text-zinc-400 leading-relaxed">
                  {lang === 'mr'
                    ? 'ऑटो ₹1 QR पेमेंट व 24 तासांच्या अनलॉकसाठी सर्व्हर Secrets मध्ये CASHFREE_CLIENT_ID आणि CASHFREE_CLIENT_SECRET जोडा.'
                    : 'Add CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET (with CASHFREE_ENV=sandbox or production) in environment settings to activate instant ₹1 payment and 24-hour auto-unlock.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRetryTick((t) => t + 1)}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-zinc-200 hover:text-white border border-white/15 hover:border-white/30 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
              <span>{lang === 'mr' ? 'पुन्हा तपासा' : 'Retry Connection'}</span>
            </button>
          </div>
        ) : (
          /* Active Cashfree Dynamic QR + Checkout Flow */
          <div className="space-y-4">
            <div className="bg-[#0D0D11] border border-white/12 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              {/* Dynamic Cashfree QR */}
              <div className="sm:col-span-5 flex flex-col items-center gap-2">
                <div className="bg-white rounded-xl p-2.5 w-44 sm:w-full max-w-[185px] aspect-square flex items-center justify-center shadow-md overflow-hidden">
                  {creatingOrder || gatewayReady === null ? (
                    <div className="flex flex-col items-center gap-2 text-zinc-700">
                      <Loader2 className="w-7 h-7 animate-spin text-[#DC2626]" />
                      <span className="text-[10px] font-mono font-bold">Creating Cashfree QR...</span>
                    </div>
                  ) : gatewayQrUrl ? (
                    <img
                      src={gatewayQrUrl}
                      alt={`Cashfree Dynamic UPI QR for ₹${plan.price}`}
                      className="w-full h-full object-contain rounded-lg block"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-2 text-zinc-700 gap-1.5">
                      <QrCode className="w-9 h-9 text-zinc-800" aria-hidden="true" />
                      <span className="text-[10px] font-mono font-bold leading-tight">
                        Use Cashfree Checkout Button
                      </span>
                    </div>
                  )}
                </div>

                <span className="font-mono text-[11px] font-bold text-[#FACC15] tabular-nums">
                  ₹{plan.price} · {lang === 'mr' ? '1 दिवस (24 तास)' : '1 Day (24h)'}
                </span>
              </div>

              {/* Payment Action & Live Auto-Unlock Listener */}
              <div className="sm:col-span-7 space-y-3">
                <div>
                  {cashfreeEnv === 'sandbox' && (
                    <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#FACC15] mb-1">
                      CASHFREE SANDBOX MODE
                    </p>
                  )}
                  <p className="text-xs font-bold text-white">
                    {lang === 'mr'
                      ? `₹${plan.price} पेमेंट करा — लगेच आपोआप अनलॉक होईल!`
                      : `Pay ₹${plan.price} — Unlocks Automatically!`}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                    {lang === 'mr'
                      ? 'GPay, PhonePe किंवा Paytm ने QR स्कॅन करा किंवा खालील Cashfree बटनावर क्लिक करा. पेमेंट कन्फर्म होताच 2-3 सेकंदात 24 तासांसाठी अनलॉक होईल.'
                      : 'Scan the UPI QR or click Cashfree Checkout below. Once payment confirms, this overlay unlocks automatically for 24 hours — no keys needed.'}
                  </p>
                </div>

                {paymentSessionId && (
                  <button
                    type="button"
                    onClick={handleLaunchCashfreeCheckout}
                    disabled={openingCheckout || creatingOrder}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap tabular-nums"
                  >
                    {openingCheckout ? (
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                    )}
                    <span>
                      {openingCheckout
                        ? lang === 'mr'
                          ? 'Cashfree उघडत आहे...'
                          : 'Opening Cashfree...'
                        : lang === 'mr'
                          ? `Cashfree ने ₹${plan.price} भरा`
                          : `Pay ₹${plan.price} via Cashfree Checkout`}
                    </span>
                  </button>
                )}

                {isListening && (
                  <div className="bg-[#0D1A12] border border-[#4ADE80]/40 rounded-lg px-3 py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-[#4ADE80] font-semibold">
                      <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-ping shrink-0" />
                      <span>
                        {lang === 'mr'
                          ? 'पेमेंटची वाट पाहत आहे (ऑटो अनलॉक)...'
                          : 'Waiting for payment (Auto-Unlock)...'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleVerifyPaymentNow}
                      disabled={checkingStatus}
                      className="text-[11px] font-mono font-bold text-[#FACC15] hover:text-white shrink-0"
                    >
                      {checkingStatus ? '...' : 'Verify'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-[#230B0D] border border-[#EF4444]/40 rounded-lg p-3 flex items-center justify-between gap-2 text-xs text-[#FCA5A5]">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveOrder(null);
                    setRetryTick((t) => t + 1);
                  }}
                  className="font-mono font-bold text-[#FACC15] hover:text-white shrink-0"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
