import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Loader2,
  Lock,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import { useOverlayAccess } from '../../context/OverlayAccessContext';
import {
  createCashfreeWorldCupOrder,
  createOwnerUpiQrOrder,
  emitWorldCupUnlockRefresh,
  fetchServerWorldCupStatus,
  getPaidThemeConfig,
  type PaidThemeId,
  submitOwnerUpiQrProof,
  verifyCashfreeWorldCupOrder,
} from '../../lib/worldCupUnlock';

declare global {
  interface Window {
    Cashfree?: (opts: { mode: 'production' }) => {
      checkout: (opts: {
        paymentSessionId: string;
        redirectTarget?: '_modal' | '_self' | '_blank';
      }) => Promise<{ error?: { message?: string }; paymentDetails?: unknown } | void>;
    };
  }
}

export interface WorldCupUnlockModalProps {
  open: boolean;
  themeId?: PaidThemeId;
  onClose: () => void;
  onUnlockSuccess: (payload: {
    themeId: PaidThemeId;
    orderId: string;
    cfPaymentId: string | null;
  }) => void;
}

interface GeneratedUpiQrOrder {
  orderId: string;
  amount: number;
  currency: string;
  upiId: string;
  payeeName: string;
  upiUri: string;
  qrDataUrl: string;
  staticQrImageUrl: string;
}

export function WorldCupUnlockModal({
  open,
  themeId = 'worldcup',
  onClose,
  onUnlockSuccess,
}: WorldCupUnlockModalProps) {
  const { session, getPaymentAuthHeaders } = useOverlayAccess();
  const product = getPaidThemeConfig(themeId);

  // Payment Mode: Owner UPI QR is default; Cashfree appears if configured on server
  const [paymentTab, setPaymentTab] = useState<'upi-qr' | 'cashfree'>('upi-qr');
  const [cashfreeAvailable, setCashfreeAvailable] = useState(false);

  // Owner UPI QR State
  const [qrViewMode, setQrViewMode] = useState<'dynamic' | 'gpay-card'>('dynamic');
  const [qrLoading, setQrLoading] = useState(false);
  const [upiOrder, setUpiOrder] = useState<GeneratedUpiQrOrder | null>(null);
  const [utrInput, setUtrInput] = useState('');
  const [submittingProof, setSubmittingProof] = useState(false);
  const [pendingVerification, setPendingVerification] = useState<{
    orderId: string;
    utr: string;
  } | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Cashfree Production State
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState('');

  // Shared Feedback State
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verifiedSuccess, setVerifiedSuccess] = useState<{
    themeId: PaidThemeId;
    orderId: string;
    cfPaymentId: string | null;
  } | null>(null);

  const checkServerUnlockNow = useCallback(
    async (silent = false) => {
      if (!silent) {
        setCheckingStatus(true);
        setErrorMsg(null);
      }
      try {
        const authHeaders = await getPaymentAuthHeaders();
        const serverStatus = await fetchServerWorldCupStatus(authHeaders);
        setCashfreeAvailable(serverStatus.cashfreeConfigured);

        if (serverStatus.unlockedThemes[themeId]) {
          const detail = serverStatus.themeEntitlements[themeId];
          emitWorldCupUnlockRefresh();
          const payload = {
            themeId,
            orderId: detail?.orderId || upiOrder?.orderId || pendingVerification?.orderId || 'VERIFIED',
            cfPaymentId: detail?.cfPaymentId ?? null,
          };
          setVerifiedSuccess(payload);
          setPendingVerification(null);
          setStatusMessage(null);
          onUnlockSuccess(payload);
          return true;
        }
        if (!silent) {
          setStatusMessage(
            'Payment is still pending owner verification. Once confirmed on Crushyyphotography UPI, it unlocks automatically.'
          );
        }
      } catch {
        if (!silent) {
          setErrorMsg('Could not check unlock status right now. Please try again.');
        }
      } finally {
        if (!silent) {
          setCheckingStatus(false);
        }
      }
      return false;
    },
    [getPaymentAuthHeaders, onUnlockSuccess, pendingVerification?.orderId, themeId, upiOrder?.orderId]
  );

  const generateFreshUpiQr = useCallback(async () => {
    setQrLoading(true);
    setErrorMsg(null);
    setStatusMessage(null);
    try {
      const authHeaders = await getPaymentAuthHeaders();
      const [statusRes, qrRes] = await Promise.all([
        fetchServerWorldCupStatus(authHeaders),
        createOwnerUpiQrOrder(authHeaders, {
          themeId,
          customerEmail: session?.email || '',
        }),
      ]);
      setCashfreeAvailable(statusRes.cashfreeConfigured);

      if (qrRes.ok && qrRes.alreadyUnlocked && qrRes.unlocked) {
        emitWorldCupUnlockRefresh();
        const payload = {
          themeId,
          orderId: qrRes.orderId || 'VERIFIED',
          cfPaymentId: null,
        };
        setVerifiedSuccess(payload);
        onUnlockSuccess(payload);
        return;
      }

      if (!qrRes.ok || !qrRes.orderId || !qrRes.qrDataUrl || !qrRes.upiId) {
        setErrorMsg(qrRes.error || 'Could not generate UPI payment QR code.');
        return;
      }

      setUpiOrder({
        orderId: qrRes.orderId,
        amount: qrRes.amount ?? product.priceInr,
        currency: qrRes.currency || product.currency,
        upiId: qrRes.upiId,
        payeeName: qrRes.payeeName || 'Crushyyphotography',
        upiUri: qrRes.upiUri || '',
        qrDataUrl: qrRes.qrDataUrl,
        staticQrImageUrl:
          qrRes.staticQrImageUrl ||
          '/assets/aistudio/WhatsApp_Image_2026-11-19_at_2.32.59_AM_c3b23480.jpeg',
      });
    } catch {
      setErrorMsg('Network error generating your UPI QR code. Please retry.');
    } finally {
      setQrLoading(false);
    }
  }, [getPaymentAuthHeaders, onUnlockSuccess, product.currency, product.priceInr, session?.email, themeId]);

  useEffect(() => {
    if (!open) return;
    setErrorMsg(null);
    setStatusMessage(null);
    setVerifiedSuccess(null);
    setPendingVerification(null);
    setUtrInput('');
    setActiveOrderId(null);
    setPaymentTab('upi-qr');
    setQrViewMode('dynamic');
    void generateFreshUpiQr();
  }, [open, themeId, generateFreshUpiQr]);

  // Auto-poll backend while waiting for Owner verification so theme unlocks live immediately on approval
  useEffect(() => {
    if (!open || !pendingVerification || verifiedSuccess) return;
    const timer = window.setInterval(() => {
      void checkServerUnlockNow(true);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [open, pendingVerification, verifiedSuccess, checkServerUnlockNow]);

  const verifyWithBackend = useCallback(
    async (orderIdToVerify: string) => {
      setVerifying(true);
      setErrorMsg(null);
      setStatusMessage('Verifying payment directly with Cashfree Production server...');
      try {
        const authHeaders = await getPaymentAuthHeaders();
        const verifyRes = await verifyCashfreeWorldCupOrder(authHeaders, orderIdToVerify);

        if (verifyRes.ok && verifyRes.unlocked && verifyRes.paymentStatus === 'PAID') {
          const verifiedThemeId: PaidThemeId = verifyRes.themeId || themeId;
          const serverStatus = await fetchServerWorldCupStatus(authHeaders);
          if (serverStatus.unlockedThemes[verifiedThemeId]) {
            emitWorldCupUnlockRefresh();
            const payload = {
              themeId: verifiedThemeId,
              orderId: verifyRes.orderId || orderIdToVerify,
              cfPaymentId: verifyRes.cfPaymentId ?? null,
            };
            setVerifiedSuccess(payload);
            setStatusMessage(null);
            onUnlockSuccess(payload);
            return;
          }
        }

        const reason =
          verifyRes.error ||
          verifyRes.message ||
          'Payment is not confirmed as SUCCESS on Cashfree yet. Access remains locked.';
        setErrorMsg(reason);
        setStatusMessage(null);
      } catch {
        setErrorMsg('Could not reach payment verification server. Please retry.');
        setStatusMessage(null);
      } finally {
        setVerifying(false);
      }
    },
    [getPaymentAuthHeaders, onUnlockSuccess, themeId]
  );

  // If redirected back from Cashfree Checkout with ?cf_order_id=..., verify immediately on backend
  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const returnedOrderId = params.get('cf_order_id');
    const returnedTheme = params.get('cf_theme');
    if (
      returnedOrderId &&
      returnedOrderId.trim() &&
      (!returnedTheme || returnedTheme === themeId)
    ) {
      setPaymentTab('cashfree');
      setActiveOrderId(returnedOrderId.trim());
      void verifyWithBackend(returnedOrderId.trim());
    }
  }, [open, themeId, verifyWithBackend]);

  if (!open) return null;

  const handleCopyUpiId = async () => {
    const idToCopy = upiOrder?.upiId || 'crushyyphotography@oksbi';
    try {
      await navigator.clipboard.writeText(idToCopy);
      setCopiedUpi(true);
      window.setTimeout(() => setCopiedUpi(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleSubmitUtrProof = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMessage(null);

    if (!upiOrder?.orderId) {
      setErrorMsg('Please generate a QR order first.');
      return;
    }

    const cleanUtr = utrInput.replace(/\D/g, '');
    if (cleanUtr.length !== 12) {
      setErrorMsg('Enter the exact 12-digit numeric UPI UTR / Reference number from your payment receipt.');
      return;
    }

    setSubmittingProof(true);
    try {
      const authHeaders = await getPaymentAuthHeaders();
      const res = await submitOwnerUpiQrProof(authHeaders, {
        orderId: upiOrder.orderId,
        utr: cleanUtr,
      });

      if (!res.ok) {
        setErrorMsg(res.error || 'Could not submit payment reference.');
        return;
      }

      if (res.unlocked) {
        await checkServerUnlockNow(true);
        return;
      }

      // STRICT SECURITY: Remains LOCKED/PENDING until owner verifies receipt in Admin Panel
      setPendingVerification({
        orderId: res.orderId || upiOrder.orderId,
        utr: res.utr || cleanUtr,
      });
      setStatusMessage(null);
    } catch {
      setErrorMsg('Network error submitting payment reference. Please try again.');
    } finally {
      setSubmittingProof(false);
    }
  };

  const handleStartCashfreeCheckout = async () => {
    setErrorMsg(null);
    setStatusMessage(null);
    setCreatingOrder(true);

    try {
      const authHeaders = await getPaymentAuthHeaders();
      const orderRes = await createCashfreeWorldCupOrder(authHeaders, {
        themeId,
        customerEmail: session?.email || '',
        customerPhone: customerPhone.trim(),
      });

      if (orderRes.ok && orderRes.alreadyUnlocked && orderRes.unlocked) {
        emitWorldCupUnlockRefresh();
        const payload = {
          themeId,
          orderId: orderRes.orderId || 'VERIFIED',
          cfPaymentId: null,
        };
        setVerifiedSuccess(payload);
        onUnlockSuccess(payload);
        return;
      }

      if (!orderRes.ok || !orderRes.orderId || !orderRes.paymentSessionId) {
        setErrorMsg(
          orderRes.error ||
            'Could not create Cashfree Production order. Use Owner UPI QR payment instead.'
        );
        return;
      }

      setActiveOrderId(orderRes.orderId);

      if (typeof window === 'undefined' || typeof window.Cashfree !== 'function') {
        setErrorMsg(
          'Cashfree Production Checkout SDK failed to load. Please refresh the page and try again.'
        );
        return;
      }

      const cashfree = window.Cashfree({ mode: 'production' });
      setStatusMessage('Opening secure Cashfree Production Checkout...');

      const checkoutResult = await cashfree.checkout({
        paymentSessionId: orderRes.paymentSessionId,
        redirectTarget: '_modal',
      });

      if (checkoutResult && checkoutResult.error?.message) {
        setErrorMsg(checkoutResult.error.message);
        setStatusMessage(null);
      }

      await verifyWithBackend(orderRes.orderId);
    } catch {
      setErrorMsg('Network error starting Cashfree Checkout. Please try again.');
    } finally {
      setCreatingOrder(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="worldcup-unlock-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white border-2 border-[#FF8C00] shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="wo-header px-5 py-4 text-white flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-orange-100">
              <QrCode className="w-3.5 h-3.5 text-[#FFE600]" aria-hidden="true" />
              <span>Scan UPI QR · Verified Unlock</span>
            </div>
            <h3
              id="worldcup-unlock-modal-title"
              className="font-display font-black text-lg leading-tight text-white"
            >
              Unlock {product.productName} – ₹{product.priceInr}
            </h3>
            <p className="text-xs text-orange-50 font-medium">
              Pay ₹{product.priceInr} INR on Crushyyphotography UPI QR · Owner verified unlock
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close payment modal"
            className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        {verifiedSuccess ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h4 className="font-display font-black text-xl text-slate-900">
                Payment Verified · Unlocked!
              </h4>
              <p className="text-xs text-slate-600">
                Your ₹{product.priceInr} {product.currency} payment is verified on the server.{' '}
                {product.productName} is now active live on OBS &amp; vMix.
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-900 space-y-1 text-left">
              <p className="font-bold">
                Order ID: <span className="font-mono">{verifiedSuccess.orderId}</span>
              </p>
              {verifiedSuccess.cfPaymentId && (
                <p className="font-bold">
                  Payment Ref: <span className="font-mono">{verifiedSuccess.cfPaymentId}</span>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl wo-btn-primary text-white font-display font-black text-sm uppercase tracking-wider"
            >
              Start Using {product.shortName} Theme
            </button>
          </div>
        ) : pendingVerification ? (
          <div className="p-5 space-y-4">
            <div className="rounded-xl bg-amber-50 border border-amber-300 px-4 py-4 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-amber-100 border border-amber-400 text-amber-700 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6" aria-hidden="true" />
              </div>
              <h4 className="font-display font-black text-base text-slate-900">
                Payment Reference Submitted · Pending Verification
              </h4>
              <p className="text-xs text-slate-600">
                Your 12-digit UTR has been sent to the owner for verification on{' '}
                <strong className="text-slate-900">crushyyphotography@oksbi</strong>. As soon as
                the ₹{product.priceInr} receipt is approved, this screen unlocks automatically.
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-800 space-y-1">
              <p className="font-bold">
                Order ID: <span className="font-mono">{pendingVerification.orderId}</span>
              </p>
              <p className="font-bold">
                Submitted UTR: <span className="font-mono">{pendingVerification.utr}</span>
              </p>
              <p className="font-bold text-amber-700">
                Status: PENDING OWNER APPROVAL (Theme stays locked until verified)
              </p>
            </div>

            {statusMessage && (
              <div className="px-3.5 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
                {statusMessage}
              </div>
            )}

            {errorMsg && (
              <div
                role="alert"
                className="px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="button"
              disabled={checkingStatus}
              onClick={() => void checkServerUnlockNow(false)}
              className="w-full py-3 rounded-xl wo-btn-primary text-white font-display font-black text-xs uppercase tracking-wider inline-flex items-center justify-center gap-2"
            >
              <RefreshCw
                className={`w-4 h-4 ${checkingStatus ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>{checkingStatus ? 'Checking Server Status...' : 'Check Unlock Status Now'}</span>
            </button>

            <button
              type="button"
              onClick={() => setPendingVerification(null)}
              className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
            >
              Back to QR Code
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Fixed Server Price Card */}
            <div className="rounded-xl bg-[#FFF8EE] border border-[#FF8C00]/35 px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#C25E00]">
                  {product.productName}
                </p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="font-display font-black text-2xl text-slate-900 tabular-nums">
                    ₹{product.priceInr}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {product.currency} · Fixed Price
                  </span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-extrabold uppercase">
                <Lock className="w-3 h-3 text-[#FFE600]" aria-hidden="true" />
                Locked
              </span>
            </div>

            {/* Optional Payment Method Switcher if Cashfree Production keys are also configured */}
            {cashfreeAvailable && (
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPaymentTab('upi-qr')}
                  className={`py-2 rounded-lg text-xs font-extrabold transition-colors inline-flex items-center justify-center gap-1.5 ${
                    paymentTab === 'upi-qr'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5 text-[#FF8C00]" aria-hidden="true" />
                  <span>Direct UPI QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentTab('cashfree')}
                  className={`py-2 rounded-lg text-xs font-extrabold transition-colors inline-flex items-center justify-center gap-1.5 ${
                    paymentTab === 'cashfree'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 text-[#FF8C00]" aria-hidden="true" />
                  <span>Cashfree Auto</span>
                </button>
              </div>
            )}

            {paymentTab === 'upi-qr' ? (
              <div className="space-y-3.5">
                {/* Dynamic Amount QR vs Original GPay QR toggle */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-slate-900 truncate">
                        {upiOrder?.payeeName || 'Crushyyphotography'}
                      </p>
                      <p className="text-[11px] font-mono text-slate-600 truncate">
                        {upiOrder?.upiId || 'crushyyphotography@oksbi'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleCopyUpiId()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-[11px] font-bold text-slate-800 shrink-0"
                    >
                      {copiedUpi ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" aria-hidden="true" />
                          <span>Copy UPI</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* QR Toggle */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQrViewMode('dynamic')}
                      className={`py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                        qrViewMode === 'dynamic'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      Dynamic ₹{product.priceInr} QR
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrViewMode('gpay-card')}
                      className={`py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                        qrViewMode === 'gpay-card'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      Original GPay QR
                    </button>
                  </div>

                  {/* QR Image Box */}
                  <div className="flex flex-col items-center justify-center rounded-xl bg-white border border-slate-200 p-3 min-h-[228px]">
                    {qrLoading ? (
                      <div className="flex flex-col items-center gap-2 text-slate-500 text-xs font-semibold">
                        <Loader2 className="w-6 h-6 animate-spin text-[#FF8C00]" aria-hidden="true" />
                        <span>Generating ₹{product.priceInr} UPI QR...</span>
                      </div>
                    ) : qrViewMode === 'gpay-card' ? (
                      <img
                        src={
                          upiOrder?.staticQrImageUrl ||
                          '/assets/aistudio/WhatsApp_Image_2026-11-19_at_2.32.59_AM_c3b23480.jpeg'
                        }
                        alt="Crushyyphotography Google Pay UPI QR Code"
                        className="w-52 h-auto max-h-64 object-contain rounded-lg"
                      />
                    ) : upiOrder?.qrDataUrl ? (
                      <>
                        <img
                          src={upiOrder.qrDataUrl}
                          alt={`Scan to pay ₹${product.priceInr} to ${upiOrder.upiId}`}
                          className="w-48 h-48 object-contain"
                        />
                        <p className="mt-1.5 text-[11px] font-bold text-slate-700">
                          Scan with GPay / PhonePe / Paytm · Auto-fills{' '}
                          <span className="text-slate-950 font-black">₹{upiOrder.amount}</span>
                        </p>
                        <p className="text-[10px] font-mono text-slate-500">
                          Order Ref: {upiOrder.orderId}
                        </p>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void generateFreshUpiQr()}
                        className="px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold"
                      >
                        Retry QR Generation
                      </button>
                    )}
                  </div>

                  {upiOrder?.upiUri && (
                    <a
                      href={upiOrder.upiUri}
                      className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold uppercase tracking-wider inline-flex items-center justify-center gap-1.5"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-[#FFE600]" aria-hidden="true" />
                      <span>Pay ₹{product.priceInr} in UPI App</span>
                    </a>
                  )}
                </div>

                {/* Step 2: Submit 12-Digit UTR for Owner Verification (NEVER auto-unlocks) */}
                <form onSubmit={handleSubmitUtrProof} className="space-y-2.5">
                  <div>
                    <label
                      htmlFor="upi-qr-utr-input"
                      className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-700 mb-1"
                    >
                      Step 2 · Enter 12-Digit UPI UTR / Ref No. After Paying
                    </label>
                    <input
                      id="upi-qr-utr-input"
                      type="text"
                      inputMode="numeric"
                      maxLength={12}
                      required
                      value={utrInput}
                      onChange={(e) => setUtrInput(e.target.value.replace(/\D/g, '').slice(0, 12))}
                      placeholder="Enter 12-digit UTR number"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#FF8C00] focus:border-[#FF8C00]"
                    />
                  </div>

                  {errorMsg && (
                    <div
                      role="alert"
                      className="px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2"
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submittingProof || qrLoading || !upiOrder}
                    className="w-full py-3 rounded-xl wo-btn-primary disabled:opacity-60 text-white font-display font-black text-xs sm:text-sm uppercase tracking-wider inline-flex items-center justify-center gap-2 shadow-md"
                  >
                    {submittingProof ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        <span>Submitting for Verification...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                        <span>Submit UTR for Verification</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-[11px] text-slate-600 space-y-1">
                  <p className="font-bold text-slate-800 inline-flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                    <span>Zero Fake-UTR Bypass Security</span>
                  </p>
                  <p>
                    Entering a fake or reused UTR never unlocks access. Your theme unlocks
                    automatically as soon as the ₹{product.priceInr} payment is verified on{' '}
                    <strong className="text-slate-900">crushyyphotography@oksbi</strong>.
                  </p>
                </div>
              </div>
            ) : (
              /* Cashfree Production Checkout Tab */
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="cashfree-customer-phone"
                    className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-700 mb-1"
                  >
                    Mobile Number (For Cashfree Payment Receipt)
                  </label>
                  <input
                    id="cashfree-customer-phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile number"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#FF8C00] focus:border-[#FF8C00]"
                  />
                </div>

                {statusMessage && (
                  <div className="px-3.5 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
                    <span>{statusMessage}</span>
                  </div>
                )}

                {errorMsg && (
                  <div
                    role="alert"
                    className="px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={creatingOrder || verifying}
                  onClick={() => void handleStartCashfreeCheckout()}
                  className="w-full py-3.5 rounded-xl wo-btn-primary disabled:opacity-60 text-white font-display font-black text-sm uppercase tracking-wider inline-flex items-center justify-center gap-2 shadow-md"
                >
                  {creatingOrder ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span>Creating Cashfree Order...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" aria-hidden="true" />
                      <span>Pay ₹{product.priceInr} via Cashfree</span>
                    </>
                  )}
                </button>

                {activeOrderId && (
                  <button
                    type="button"
                    disabled={verifying}
                    onClick={() => void verifyWithBackend(activeOrderId)}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-extrabold uppercase tracking-wider inline-flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`}
                      aria-hidden="true"
                    />
                    <span>Re-Verify Order {activeOrderId} with Cashfree</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
