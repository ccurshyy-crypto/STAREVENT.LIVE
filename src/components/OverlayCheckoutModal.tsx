import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
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
import { PaymentInstructions } from './PaymentInstructions';

interface OverlayCheckoutModalProps {
  lang: Language;
  product: OverlayProduct | null;
  initialPlanId?: OverlayPlanId;
  existingPendingOrder?: PendingOverlayOrder | null;
  onClose: () => void;
  onPendingOrderChange: (order: PendingOverlayOrder | null) => void;
  onVerifiedUnlock: (tokens: VerifiedOverlayToken | VerifiedOverlayToken[]) => void;
}

type PaymentUiStatus =
  | 'initializing'
  | 'awaiting'
  | 'verifying'
  | 'pending'
  | 'failed'
  | 'expired'
  | 'success';

function formatCountdown(msRemaining: number): string {
  const totalSec = Math.max(0, Math.floor(msRemaining / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatDateTime(timestamp?: number): string {
  if (!timestamp) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleString();
  }
}

export function OverlayCheckoutModal({
  lang,
  product,
  existingPendingOrder,
  onClose,
  onPendingOrderChange,
  onVerifiedUnlock,
}: OverlayCheckoutModalProps) {
  const plan = getOverlayPlan('1day');

  const [gatewayReady, setGatewayReady] = useState<boolean | null>(null);
  const [cashfreeEnv, setCashfreeEnv] = useState<'sandbox' | 'production'>('sandbox');
  const [creatingOrder, setCreatingOrder] = useState<boolean>(false);
  const [refreshingQr, setRefreshingQr] = useState<boolean>(false);
  const [openingCheckout, setOpeningCheckout] = useState<boolean>(false);
  const [verifyingTx, setVerifyingTx] = useState<boolean>(false);

  const [gatewayQrUrl, setGatewayQrUrl] = useState<string | null>(null);
  const [upiIntentUrl, setUpiIntentUrl] = useState<string | undefined>(undefined);
  const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null);
  const [qrCloseBy, setQrCloseBy] = useState<number | null>(null);
  const [countdownMs, setCountdownMs] = useState<number>(0);

  const [activeOrder, setActiveOrder] = useState<PendingOverlayOrder | null>(null);
  // Dedicated success order state so clearing pendingOrders in parent NEVER wipes the Payment Successful receipt
  const [confirmedSuccessOrder, setConfirmedSuccessOrder] = useState<PendingOverlayOrder | null>(null);
  const [verifiedTxDisplay, setVerifiedTxDisplay] = useState<string>('');

  const [transactionIdInput, setTransactionIdInput] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentUiStatus>('initializing');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  const activeSkuRef = useRef<string | null>(null);
  const initialPendingRef = useRef<PendingOverlayOrder | null>(null);
  initialPendingRef.current = existingPendingOrder ?? null;

  const commitVerifiedOrder = useCallback(
    (orderData: PendingOverlayOrder, explicitVerifiedTx?: string) => {
      if (!product || orderData.status !== 'approved' || !orderData.unlockCode) return;

      const activatedAt = orderData.verifiedAt || Date.now();
      const expiresAt = orderData.expiresAt || activatedAt + 24 * 60 * 60 * 1000;
      const verifiedOrder: PendingOverlayOrder = {
        ...orderData,
        verifiedAt: activatedAt,
        expiresAt,
      };
      const finalTxId =
        explicitVerifiedTx ||
        orderData.verifiedTransactionId ||
        orderData.cfPaymentId ||
        orderData.utrRef ||
        orderData.cfOrderId ||
        orderData.orderId;

      setConfirmedSuccessOrder(verifiedOrder);
      setVerifiedTxDisplay(finalTxId);
      setActiveOrder(verifiedOrder);
      setPaymentStatus('success');
      setError(null);
      setStatusNotice(null);

      onPendingOrderChange(null);
      onVerifiedUnlock({
        sku: product.sku,
        orderId: verifiedOrder.orderId,
        unlockCode: verifiedOrder.unlockCode!,
        planId: '1day',
        expiresAt,
      });
    },
    [product, onPendingOrderChange, onVerifiedUnlock]
  );

  const createFreshCashfreeOrder = useCallback(
    async (sku: string, previousOrderId?: string) => {
      const isRefresh = Boolean(previousOrderId);
      if (isRefresh) {
        setRefreshingQr(true);
      } else {
        setCreatingOrder(true);
      }
      setError(null);
      setStatusNotice(null);
      setPaymentStatus('initializing');

      try {
        const res = await fetch('/api/payment/cashfree/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sku,
            planId: '1day',
            ...(previousOrderId ? { previousOrderId } : {}),
          }),
        });
        const data = await res.json();

        if (res.ok && data?.mode === 'cashfree_auto' && data?.order) {
          const orderObj = data.order as PendingOverlayOrder;
          const nextCloseBy = Number(data.closeBy || orderObj.qrCloseBy || Date.now() + 30 * 60 * 1000);
          const enrichedOrder: PendingOverlayOrder = {
            ...orderObj,
            gatewayQrImageUrl: data.qrImageUrl || orderObj.gatewayQrImageUrl,
            upiIntentUrl: data.upiIntentUrl || orderObj.upiIntentUrl,
            paymentSessionId: data.paymentSessionId || orderObj.paymentSessionId,
            qrCloseBy: nextCloseBy,
          };

          setGatewayQrUrl(enrichedOrder.gatewayQrImageUrl || null);
          setUpiIntentUrl(enrichedOrder.upiIntentUrl);
          setPaymentSessionId(enrichedOrder.paymentSessionId || null);
          setQrCloseBy(nextCloseBy);
          setCountdownMs(Math.max(0, nextCloseBy - Date.now()));
          setActiveOrder(enrichedOrder);
          setTransactionIdInput('');
          setPaymentStatus('awaiting');
          onPendingOrderChange(enrichedOrder);
          return;
        }

        if (res.ok && data?.mode === 'direct_upi' && data?.autoUnlockEnabled === false) {
          setGatewayReady(false);
          setGatewayQrUrl(null);
          setPaymentSessionId(null);
          return;
        }

        setPaymentStatus('failed');
        setError(
          data?.error ||
            (lang === 'mr'
              ? 'Cashfree QR तयार करता आला नाही. कृपया पुन्हा प्रयत्न करा.'
              : 'Could not create Cashfree payment order. Please click Refresh QR to retry.')
        );
      } catch {
        setPaymentStatus('failed');
        setError(
          lang === 'mr'
            ? 'पेमेंट सर्व्हरशी संपर्क होऊ शकला नाही. कृपया पुन्हा प्रयत्न करा.'
            : 'Unable to reach payment server. Please check connection and retry.'
        );
      } finally {
        setCreatingOrder(false);
        setRefreshingQr(false);
      }
    },
    [lang, onPendingOrderChange]
  );

  // Reset modal state ONLY when the selected overlay product changes or closes
  useEffect(() => {
    const nextSku = product?.sku ?? null;
    if (!nextSku) {
      activeSkuRef.current = null;
      setConfirmedSuccessOrder(null);
      setVerifiedTxDisplay('');
      setActiveOrder(null);
      setGatewayQrUrl(null);
      setUpiIntentUrl(undefined);
      setPaymentSessionId(null);
      setQrCloseBy(null);
      setTransactionIdInput('');
      setError(null);
      setStatusNotice(null);
      setPaymentStatus('initializing');
      return;
    }

    if (activeSkuRef.current !== nextSku) {
      activeSkuRef.current = nextSku;
      setConfirmedSuccessOrder(null);
      setVerifiedTxDisplay('');
      setTransactionIdInput('');
      setError(null);
      setStatusNotice(null);
    }
  }, [product?.sku]);

  // Initialize Cashfree config & order when modal opens or user clicks retry
  useEffect(() => {
    if (!product || confirmedSuccessOrder) return;
    let cancelled = false;

    const initCheckout = async () => {
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

        // Reuse existing non-expired pending Cashfree ₹1 order on first open
        const existing = initialPendingRef.current;
        const existingCloseBy = existing?.qrCloseBy || (existing ? existing.createdAt + 28 * 60 * 1000 : 0);
        if (
          retryTick === 0 &&
          existing &&
          existing.status === 'pending' &&
          existing.paymentMethod === 'cashfree_qr' &&
          existing.sku === product.sku &&
          existing.amount === plan.price &&
          existingCloseBy > Date.now() + 60_000 &&
          (existing.gatewayQrImageUrl || existing.paymentSessionId)
        ) {
          setActiveOrder(existing);
          setGatewayQrUrl(existing.gatewayQrImageUrl || null);
          setUpiIntentUrl(existing.upiIntentUrl);
          setPaymentSessionId(existing.paymentSessionId || null);
          setQrCloseBy(existingCloseBy);
          setCountdownMs(Math.max(0, existingCloseBy - Date.now()));
          setPaymentStatus('awaiting');
          return;
        }

        await createFreshCashfreeOrder(product.sku);
      } catch {
        if (!cancelled) {
          setPaymentStatus('failed');
          setError(
            lang === 'mr'
              ? 'पेमेंट सर्व्हरशी संपर्क होऊ शकला नाही. कृपया पुन्हा प्रयत्न करा.'
              : 'Unable to reach payment server. Please retry.'
          );
        }
      }
    };

    initCheckout();
    return () => {
      cancelled = true;
    };
  }, [product?.sku, plan.price, retryTick, confirmedSuccessOrder, createFreshCashfreeOrder, lang]);

  // Live QR Expiry Countdown ticker
  useEffect(() => {
    if (!qrCloseBy || confirmedSuccessOrder) return;

    const tick = () => {
      const remaining = Math.max(0, qrCloseBy - Date.now());
      setCountdownMs(remaining);
      if (remaining <= 0) {
        setPaymentStatus((prev) => (prev === 'success' ? prev : 'expired'));
      }
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [qrCloseBy, confirmedSuccessOrder]);

  // Real-time SSE + 4-second background Cashfree status check (automatically unlocks when Cashfree confirms PAID)
  useEffect(() => {
    if (
      !product ||
      !activeOrder ||
      activeOrder.status !== 'pending' ||
      confirmedSuccessOrder ||
      paymentStatus === 'expired'
    ) {
      return;
    }

    const handleServerOrder = (orderData: PendingOverlayOrder, verifiedTx?: string, cfStatus?: string) => {
      if (orderData.status === 'approved' && orderData.unlockCode) {
        commitVerifiedOrder(orderData, verifiedTx);
      } else if (
        orderData.status === 'rejected' ||
        orderData.status === 'revoked' ||
        cfStatus === 'EXPIRED' ||
        cfStatus === 'TERMINATED'
      ) {
        setPaymentStatus('expired');
        onPendingOrderChange(null);
      } else if (cfStatus === 'FAILED') {
        setPaymentStatus('failed');
      }
    };

    const es = new EventSource(
      `/api/overlay/orders/${encodeURIComponent(activeOrder.orderId)}/stream`
    );
    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed?.order) {
          handleServerOrder(parsed.order as PendingOverlayOrder);
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
          handleServerOrder(
            data.order as PendingOverlayOrder,
            data.verifiedTransactionId,
            data.cashfreeStatus
          );
        }
      } catch {
        // Silent retry on next poll interval
      }
    }, 4000);

    return () => {
      es.close();
      window.clearInterval(pollId);
    };
  }, [
    product,
    activeOrder?.orderId,
    activeOrder?.status,
    confirmedSuccessOrder,
    paymentStatus,
    commitVerifiedOrder,
    onPendingOrderChange,
  ]);

  if (!product) return null;

  const handleRefreshQr = async () => {
    if (creatingOrder || refreshingQr) return;
    await createFreshCashfreeOrder(product.sku, activeOrder?.orderId);
  };

  // Authoritative Transaction ID submission -> verified against Cashfree PG API on server
  const handleSubmitTransactionId = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;

    const cleanedTx = transactionIdInput.trim().replace(/\s+/g, '');
    if (!cleanedTx) {
      setError(
        lang === 'mr'
          ? 'कृपया तुमच्या UPI अ‍ॅपमधील Transaction ID (UTR) टाका.'
          : 'Please enter your Transaction ID (UTR) from your UPI app.'
      );
      return;
    }

    if (!/^[A-Za-z0-9_-]{6,64}$/.test(cleanedTx)) {
      setError(
        lang === 'mr'
          ? 'अवैध Transaction ID फॉरमॅट. कृपया 6 ते 64 अक्षरी योग्य UTR / Transaction ID टाका.'
          : 'Invalid Transaction ID format. Enter the 6–64 character UTR or Cashfree Transaction ID.'
      );
      return;
    }

    setVerifyingTx(true);
    setPaymentStatus('verifying');
    setError(null);
    setStatusNotice(null);

    try {
      const res = await fetch('/api/payment/cashfree/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: activeOrder.orderId,
          transactionId: cleanedTx,
        }),
      });
      const data = await res.json();

      if (res.ok && data?.paid && data?.order?.status === 'approved' && data?.order?.unlockCode) {
        commitVerifiedOrder(data.order as PendingOverlayOrder, data.verifiedTransactionId);
        return;
      }

      if (!res.ok) {
        setPaymentStatus(data?.cashfreeStatus === 'EXPIRED' ? 'expired' : 'failed');
        setError(
          data?.error ||
            (lang === 'mr'
              ? 'Transaction ID व्हेरिफाय करता आला नाही. कृपया तपासून पुन्हा प्रयत्न करा.'
              : 'Transaction ID verification failed. Please double-check and try again.')
        );
        return;
      }

      const cfStatus = String(data?.cashfreeStatus || '').toUpperCase();
      if (cfStatus === 'EXPIRED' || cfStatus === 'TERMINATED') {
        setPaymentStatus('expired');
        setError(
          data?.message ||
            'This QR order has expired. Please click REFRESH QR to generate a fresh code.'
        );
      } else if (cfStatus === 'FAILED') {
        setPaymentStatus('failed');
        setError(
          data?.message || 'Payment failed on Cashfree. Please retry or click REFRESH QR.'
        );
      } else {
        setPaymentStatus('pending');
        setStatusNotice(
          data?.message ||
            (lang === 'mr'
              ? 'Cashfree कडून अद्याप ₹1 पेमेंट कन्फर्म झालेले नाही. पेमेंट पूर्ण करून पुन्हा व्हेरिफाय करा.'
              : 'Cashfree has not confirmed a successful ₹1 payment for this order yet. Complete the UPI payment first, then submit again.')
        );
      }
    } catch {
      setPaymentStatus('failed');
      setError(
        lang === 'mr'
          ? 'पेमेंट व्हेरिफिकेशन करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.'
          : 'Could not reach payment verification server. Please retry.'
      );
    } finally {
      setVerifyingTx(false);
    }
  };

  const handleLaunchCashfreeCheckout = async () => {
    if (!paymentSessionId || !activeOrder || paymentStatus === 'expired') return;
    setOpeningCheckout(true);
    setError(null);
    setStatusNotice(null);

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

      // Authoritatively verify payment on backend right after Cashfree modal closes
      setVerifyingTx(true);
      setPaymentStatus('verifying');
      const verifyRes = await fetch(
        `/api/payment/cashfree/verify?orderId=${encodeURIComponent(activeOrder.orderId)}`,
        { cache: 'no-store' }
      );
      const verifyData = await verifyRes.json();
      if (
        verifyRes.ok &&
        verifyData?.paid &&
        verifyData?.order?.status === 'approved' &&
        verifyData?.order?.unlockCode
      ) {
        commitVerifiedOrder(
          verifyData.order as PendingOverlayOrder,
          verifyData.verifiedTransactionId
        );
      } else {
        const cfStatus = String(verifyData?.cashfreeStatus || '').toUpperCase();
        if (cfStatus === 'FAILED') {
          setPaymentStatus('failed');
          setError(verifyData?.message || 'Payment failed or was cancelled.');
        } else if (cfStatus === 'EXPIRED' || cfStatus === 'TERMINATED') {
          setPaymentStatus('expired');
        } else {
          setPaymentStatus('awaiting');
          if (verifyData?.message) setStatusNotice(verifyData.message);
        }
      }
    } catch (err) {
      setPaymentStatus('failed');
      setError(
        err instanceof Error
          ? err.message
          : 'Could not open Cashfree checkout modal. Please scan the QR code or retry.'
      );
    } finally {
      setOpeningCheckout(false);
      setVerifyingTx(false);
    }
  };

  const isExpired = paymentStatus === 'expired' || (qrCloseBy !== null && countdownMs <= 0);
  const isLowTime = qrCloseBy !== null && countdownMs > 0 && countdownMs < 120_000;

  const statusMeta: Record<
    PaymentUiStatus,
    { label: string; dotClass: string; textClass: string; bgClass: string }
  > = {
    initializing: {
      label: lang === 'mr' ? 'QR तयार होत आहे...' : 'GENERATING QR...',
      dotClass: 'bg-[#FACC15] animate-pulse',
      textClass: 'text-[#FACC15]',
      bgClass: 'bg-[#18150C] border-[#FACC15]/35',
    },
    awaiting: {
      label: lang === 'mr' ? 'पेमेंटची प्रतीक्षा (Awaiting Payment)' : 'AWAITING PAYMENT',
      dotClass: 'bg-[#FACC15] animate-ping',
      textClass: 'text-[#FACC15]',
      bgClass: 'bg-[#18150C] border-[#FACC15]/35',
    },
    verifying: {
      label: lang === 'mr' ? 'पेमेंट व्हेरिफाय होत आहे...' : 'VERIFYING PAYMENT...',
      dotClass: 'bg-[#38BDF8] animate-ping',
      textClass: 'text-[#38BDF8]',
      bgClass: 'bg-[#0C1722] border-[#38BDF8]/40',
    },
    pending: {
      label: lang === 'mr' ? 'पेमेंट प्रलंबित (Pending)' : 'PAYMENT PENDING',
      dotClass: 'bg-[#FB923C] animate-pulse',
      textClass: 'text-[#FB923C]',
      bgClass: 'bg-[#1E130A] border-[#FB923C]/40',
    },
    failed: {
      label: lang === 'mr' ? 'पेमेंट अयशस्वी (Failed)' : 'PAYMENT FAILED',
      dotClass: 'bg-[#EF4444]',
      textClass: 'text-[#FCA5A5]',
      bgClass: 'bg-[#230B0D] border-[#EF4444]/40',
    },
    expired: {
      label: lang === 'mr' ? 'QR एक्सपायर झाला (Refresh करा)' : 'QR EXPIRED · CLICK REFRESH QR',
      dotClass: 'bg-[#EF4444]',
      textClass: 'text-[#FCA5A5]',
      bgClass: 'bg-[#230B0D] border-[#EF4444]/40',
    },
    success: {
      label: lang === 'mr' ? 'पेमेंट यशस्वी · अनलॉक झाले!' : 'PAYMENT VERIFIED · UNLOCKED',
      dotClass: 'bg-[#4ADE80]',
      textClass: 'text-[#4ADE80]',
      bgClass: 'bg-[#0D1A12] border-[#4ADE80]/40',
    },
  };

  const currentStatus = statusMeta[paymentStatus];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl bg-[#121216] border border-white/15 rounded-2xl p-4 sm:p-6 space-y-5 my-auto max-h-[94vh] overflow-y-auto shadow-2xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close checkout"
          className="absolute top-3.5 right-3.5 w-9 h-9 inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1.5 pr-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#FACC15]">
              <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>
                {lang === 'mr'
                  ? 'STAR EVENT LIVE · 24 तास ऑटो अनलॉक'
                  : 'STAR EVENT LIVE · 24-HOUR AUTO-UNLOCK'}
              </span>
            </span>
            {gatewayReady !== false && cashfreeEnv === 'sandbox' && (
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FACC15]/15 border border-[#FACC15]/40 text-[#FACC15]">
                Cashfree Sandbox Mode
              </span>
            )}
          </div>
          <h3 id="checkout-modal-title" className="font-display text-lg sm:text-2xl font-bold text-white">
            {product.title[lang]}
          </h3>
        </div>

        {/* Amount & 24-Hour Pass Banner */}
        <div className="bg-[#18150C] border border-[#FACC15]/40 rounded-xl px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#4ADE80]">
              {lang === 'mr' ? 'आजची ऑफर · 1 दिवस (24 तास)' : "TODAY'S OFFER · 24-HOUR ACCESS PASS"}
            </p>
            <p className="text-xs text-zinc-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#FACC15] shrink-0" aria-hidden="true" />
              <span>
                {lang === 'mr'
                  ? 'पेमेंट व्हेरिफाय होताच 24 तासांसाठी अनलॉक व नंतर ऑटो लॉक'
                  : 'Unlocks immediately after Cashfree verification · Auto-locks after 24 hours'}
              </span>
            </p>
          </div>
          <div className="flex items-baseline gap-2 shrink-0">
            <span className="font-mono text-xs text-zinc-500 line-through tabular-nums">
              ₹{plan.originalPrice}
            </span>
            <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#FACC15] tabular-nums leading-none">
              ₹{plan.price}
            </span>
          </div>
        </div>

        {/* ============================================================
            PAYMENT SUCCESSFUL SCREEN
        ============================================================ */}
        {confirmedSuccessOrder ? (
          <div className="bg-[#0B1710] border border-[#4ADE80]/45 rounded-2xl p-5 sm:p-7 space-y-6">
            <div className="text-center space-y-3">
              <div className="relative inline-flex items-center justify-center">
                <span className="absolute inline-flex h-16 w-16 rounded-full bg-[#4ADE80]/25 animate-ping" />
                <span className="relative w-16 h-16 rounded-full bg-[#4ADE80]/15 border-2 border-[#4ADE80] inline-flex items-center justify-center">
                  <CheckCircle2 className="w-9 h-9 text-[#4ADE80]" aria-hidden="true" />
                </span>
              </div>
              <div className="space-y-1">
                <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#4ADE80]">
                  CASHFREE VERIFIED RECEIPT
                </p>
                <h4 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  PAYMENT SUCCESSFUL!
                </h4>
                <p className="text-xs sm:text-sm text-zinc-300">
                  {lang === 'mr'
                    ? 'तुमचा ओव्हरले 24 तासांसाठी अनलॉक झाला आहे. OBS / vMix URL आता लाईव्ह वापरा.'
                    : 'Your overlay is now unlocked for 24 hours with full OBS / vMix Browser Source access.'}
                </p>
              </div>
            </div>

            {/* Structured Receipt Details */}
            <div className="bg-[#0D0D11] border border-white/12 rounded-xl divide-y divide-white/10">
              <div className="px-4 py-3 flex items-center justify-between gap-4 text-xs sm:text-sm">
                <span className="text-zinc-400">Amount Paid</span>
                <span className="font-mono font-extrabold text-[#FACC15] text-base tabular-nums">
                  ₹{confirmedSuccessOrder.amount}
                </span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between gap-4 text-xs sm:text-sm">
                <span className="text-zinc-400">Transaction ID</span>
                <span className="font-mono font-bold text-white break-all text-right">
                  {verifiedTxDisplay}
                </span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between gap-4 text-xs sm:text-sm">
                <span className="text-zinc-400">Access Status</span>
                <span className="inline-flex items-center gap-1.5 font-mono font-extrabold text-[#4ADE80] uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-[#4ADE80]" />
                  UNLOCKED
                </span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between gap-4 text-xs sm:text-sm">
                <span className="text-zinc-400">Activation Time</span>
                <span className="font-mono font-semibold text-zinc-100 text-right tabular-nums">
                  {formatDateTime(confirmedSuccessOrder.verifiedAt)}
                </span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between gap-4 text-xs sm:text-sm">
                <span className="text-zinc-400">Expiry Time</span>
                <span className="font-mono font-semibold text-[#FACC15] text-right tabular-nums">
                  {formatDateTime(confirmedSuccessOrder.expiresAt)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 px-5 text-sm font-bold text-black bg-[#4ADE80] hover:bg-[#22C55E] rounded-xl transition-colors"
            >
              {lang === 'mr' ? 'स्टुडिओमध्ये जा व OBS / vMix URL कॉपी करा' : 'Continue to Studio & Copy OBS / vMix URL'}
            </button>
          </div>
        ) : gatewayReady === false ? (
          /* Cashfree Gateway Not Configured Notice */
          <div className="bg-[#181410] border border-[#FACC15]/35 rounded-xl p-5 space-y-4">
            <div className="flex items-start gap-3 text-xs sm:text-sm text-zinc-200">
              <AlertCircle className="w-5 h-5 text-[#FACC15] shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <p className="font-bold text-white">
                  {lang === 'mr'
                    ? 'Cashfree पेमेंट गेटवे अद्याप सेट केलेले नाही'
                    : 'Cashfree Payment Gateway Not Configured Yet'}
                </p>
                <p className="text-zinc-400 leading-relaxed">
                  {lang === 'mr'
                    ? 'ऑटो ₹1 QR पेमेंट व 24 तासांच्या अनलॉकसाठी सर्व्हर Secrets मध्ये CASHFREE_CLIENT_ID आणि CASHFREE_CLIENT_SECRET जोडा.'
                    : 'Add CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET (with CASHFREE_ENV=sandbox or production) in server environment settings to activate ₹1 QR payment and 24-hour unlock.'}
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
          /* ============================================================
             ACTIVE CASHFREE QR + INSTRUCTIONS + TRANSACTION ID FLOW
          ============================================================ */
          <div className="space-y-4">
            {/* Payment Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-mono font-bold tracking-wider ${currentStatus.bgClass} ${currentStatus.textClass}`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${currentStatus.dotClass}`} />
                <span>{currentStatus.label}</span>
              </div>

              {activeOrder?.orderId && (
                <span className="font-mono text-[11px] text-zinc-400">
                  Order: <strong className="text-zinc-200">{activeOrder.orderId}</strong>
                </span>
              )}
            </div>

            {/* Main 2-Column Responsive Layout: Left Large QR, Right Instructions + Checkout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              {/* LEFT: Large Dynamic QR Code + Real-Time Countdown Below QR + Refresh QR */}
              <div className="md:col-span-5 bg-[#0D0D11] border border-white/12 rounded-xl p-4 flex flex-col items-center gap-3.5">
                <div className="relative bg-white rounded-xl p-3 w-52 sm:w-56 aspect-square flex items-center justify-center shadow-lg overflow-hidden">
                  {creatingOrder || refreshingQr || (gatewayReady === null && !error) ? (
                    <div className="flex flex-col items-center gap-2 text-zinc-700">
                      <Loader2 className="w-8 h-8 animate-spin text-[#DC2626]" />
                      <span className="text-[11px] font-mono font-bold text-center">
                        {refreshingQr ? 'Generating Fresh QR...' : 'Creating Cashfree QR...'}
                      </span>
                    </div>
                  ) : gatewayQrUrl ? (
                    <>
                      <img
                        src={gatewayQrUrl}
                        alt={`Cashfree Dynamic UPI QR for ₹${plan.price}`}
                        className={`w-full h-full object-contain rounded-lg block transition-opacity ${
                          isExpired ? 'opacity-20 blur-[2px]' : 'opacity-100'
                        }`}
                      />
                      {isExpired && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 p-3 text-center gap-2">
                          <span className="font-mono text-xs font-extrabold uppercase text-[#FCA5A5]">
                            QR EXPIRED
                          </span>
                          <button
                            type="button"
                            onClick={handleRefreshQr}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-md"
                          >
                            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>REFRESH QR</span>
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-2 text-zinc-700 gap-1.5">
                      <QrCode className="w-10 h-10 text-zinc-800" aria-hidden="true" />
                      <span className="text-[11px] font-mono font-bold leading-tight">
                        Use Cashfree Checkout or Refresh QR
                      </span>
                    </div>
                  )}
                </div>

                {/* Real-Time QR Expiry Countdown Timer Directly Below QR Code */}
                {qrCloseBy && (
                  <div
                    role="timer"
                    aria-live="polite"
                    className={`w-full rounded-lg border px-3 py-2.5 space-y-2 transition-colors ${
                      isExpired
                        ? 'bg-[#230B0D] border-[#EF4444]/45 text-[#FCA5A5]'
                        : isLowTime
                          ? 'bg-[#1E130A] border-[#FB923C]/45 text-[#FDBA74]'
                          : 'bg-[#14141A] border-[#FACC15]/30 text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold">
                        <Clock
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isExpired
                              ? 'text-[#EF4444]'
                              : isLowTime
                                ? 'text-[#FB923C]'
                                : 'text-[#FACC15]'
                          }`}
                          aria-hidden="true"
                        />
                        <span>
                          {isExpired
                            ? lang === 'mr'
                              ? 'QR कोड एक्सपायर झाला'
                              : 'QR Code Expired'
                            : lang === 'mr'
                              ? 'QR एक्सपायर वेळ'
                              : 'QR Expires In'}
                        </span>
                      </span>
                      <span
                        className={`font-mono text-sm font-extrabold tabular-nums ${
                          isExpired
                            ? 'text-[#FCA5A5]'
                            : isLowTime
                              ? 'text-[#FB923C]'
                              : 'text-[#FACC15]'
                        }`}
                      >
                        {isExpired ? '00:00' : formatCountdown(countdownMs)}
                      </span>
                    </div>

                    {/* Visual Expiry Progress Bar */}
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          isExpired
                            ? 'bg-[#EF4444]'
                            : isLowTime
                              ? 'bg-[#FB923C]'
                              : 'bg-[#FACC15]'
                        }`}
                        style={{
                          width: `${Math.min(100, Math.max(0, (countdownMs / (30 * 60 * 1000)) * 100))}%`,
                        }}
                      />
                    </div>

                    <p className="text-[10px] leading-snug text-zinc-400">
                      {isExpired
                        ? lang === 'mr'
                          ? 'हा QR आता कालबाह्य झाला आहे. नवीन QR साठी खालील REFRESH QR क्लिक करा.'
                          : 'This QR can no longer be used. Click REFRESH QR below to generate a new code.'
                        : lang === 'mr'
                          ? 'वेळ संपल्यानंतर नवीन QR साठी REFRESH QR क्लिक करा.'
                          : 'Refresh QR below once the timer expires to generate a fresh code.'}
                    </p>
                  </div>
                )}

                <div className="text-center space-y-0.5">
                  <p className="font-mono text-sm font-extrabold text-[#FACC15] tabular-nums">
                    PAY ₹{plan.price} · DYNAMIC UPI QR
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    GPay · PhonePe · Paytm · BHIM · Cashfree
                  </p>
                </div>

                {/* REFRESH QR + Cashfree Checkout Buttons */}
                <div className="w-full space-y-2">
                  <button
                    type="button"
                    onClick={handleRefreshQr}
                    disabled={creatingOrder || refreshingQr || verifyingTx}
                    className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-white bg-white/8 hover:bg-white/15 border border-white/20 hover:border-[#FACC15]/60 disabled:opacity-50 rounded-lg transition-colors"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 text-[#FACC15] ${refreshingQr ? 'animate-spin' : ''}`}
                      aria-hidden="true"
                    />
                    <span>{refreshingQr ? 'Refreshing QR...' : 'REFRESH QR'}</span>
                  </button>

                  {paymentSessionId && !isExpired && (
                    <button
                      type="button"
                      onClick={handleLaunchCashfreeCheckout}
                      disabled={openingCheckout || creatingOrder || refreshingQr || verifyingTx}
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
                            ? `Cashfree Checkout ने ₹${plan.price} भरा`
                            : `Pay ₹${plan.price} via Cashfree Checkout`}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* RIGHT: Payment Instructions + Transaction ID Submission */}
              <div className="md:col-span-7 space-y-4">
                <PaymentInstructions
                  lang={lang}
                  amount={plan.price}
                  upiIntentUrl={upiIntentUrl}
                  orderId={activeOrder?.orderId}
                />

                {/* Transaction ID Verification Form */}
                <form
                  onSubmit={handleSubmitTransactionId}
                  className="bg-[#0D0D11] border border-white/12 rounded-xl p-4 space-y-3"
                >
                  <div className="space-y-1">
                    <label
                      htmlFor="cashfree-tx-id-input"
                      className="block font-display text-xs sm:text-sm font-bold text-white"
                    >
                      {lang === 'mr'
                        ? 'Transaction ID / UPI UTR नंबर टाका'
                        : 'Enter Transaction ID / UPI UTR'}
                    </label>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      {lang === 'mr'
                        ? 'पेमेंट केल्यानंतर तुमचा UTR / Transaction ID सबमिट करा. आमचा सर्व्हर थेट Cashfree API वरून पेमेंट व्हेरिफाय करून 24 तासांसाठी अनलॉक करेल.'
                        : 'After paying ₹1, enter your UPI UTR or Cashfree Transaction ID. Our server verifies it directly with Cashfree before unlocking.'}
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <input
                      id="cashfree-tx-id-input"
                      type="text"
                      value={transactionIdInput}
                      onChange={(e) => {
                        setTransactionIdInput(e.target.value);
                        if (error) setError(null);
                      }}
                      disabled={verifyingTx || creatingOrder || refreshingQr || isExpired}
                      placeholder={
                        lang === 'mr'
                          ? 'उदा. 432619847521 किंवा Cashfree Payment ID'
                          : 'e.g. 432619847521 or Cashfree Payment ID'
                      }
                      autoComplete="off"
                      className="w-full px-3.5 py-2.5 text-sm font-mono text-white placeholder:text-zinc-500 bg-[#15151C] border border-white/15 focus:border-[#FACC15] focus:outline-none rounded-lg disabled:opacity-50"
                    />

                    <button
                      type="submit"
                      disabled={
                        verifyingTx ||
                        creatingOrder ||
                        refreshingQr ||
                        !activeOrder ||
                        isExpired
                      }
                      className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-xs sm:text-sm font-mono font-extrabold uppercase tracking-wider text-black bg-[#FACC15] hover:bg-[#EAB308] disabled:opacity-50 rounded-lg transition-colors"
                    >
                      {verifyingTx ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
                          <span>VERIFYING PAYMENT...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                          <span>SUBMIT TRANSACTION ID</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* VERIFYING PAYMENT Loading Animation */}
                  {verifyingTx && (
                    <div className="bg-[#0C1722] border border-[#38BDF8]/40 rounded-lg p-3 flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-[#38BDF8] animate-spin shrink-0" aria-hidden="true" />
                      <div className="space-y-0.5">
                        <p className="font-mono text-xs font-bold text-[#38BDF8] uppercase tracking-wider">
                          VERIFYING PAYMENT
                        </p>
                        <p className="text-[11px] text-zinc-300">
                          {lang === 'mr'
                            ? 'Cashfree सर्व्हरवरून तुमचा Transaction ID व ₹1 पेमेंट तपासत आहे...'
                            : 'Checking order status, amount, and Transaction ID directly with Cashfree...'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Pending / Informational Notice */}
                  {statusNotice && !verifyingTx && (
                    <div className="bg-[#1E130A] border border-[#FB923C]/40 rounded-lg p-3 flex items-start gap-2.5 text-xs text-[#FDBA74]">
                      <Clock className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{statusNotice}</span>
                    </div>
                  )}

                  {/* Error Notification */}
                  {error && !verifyingTx && (
                    <div className="bg-[#230B0D] border border-[#EF4444]/40 rounded-lg p-3 flex items-start justify-between gap-2.5 text-xs text-[#FCA5A5]">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{error}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRefreshQr}
                        className="font-mono font-bold text-[#FACC15] hover:text-white shrink-0"
                      >
                        Refresh QR
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
