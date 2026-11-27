import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useOverlayAccess } from '../../context/OverlayAccessContext';
import {
  createCashfreeWorldCupOrder,
  emitWorldCupUnlockRefresh,
  fetchServerWorldCupStatus,
  getPaidThemeConfig,
  type PaidThemeId,
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

export function WorldCupUnlockModal({
  open,
  themeId = 'worldcup',
  onClose,
  onUnlockSuccess,
}: WorldCupUnlockModalProps) {
  const { session, getPaymentAuthHeaders } = useOverlayAccess();
  const product = getPaidThemeConfig(themeId);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verifiedSuccess, setVerifiedSuccess] = useState<{
    themeId: PaidThemeId;
    orderId: string;
    cfPaymentId: string | null;
  } | null>(null);
  const [customerPhone, setCustomerPhone] = useState('');

  useEffect(() => {
    if (!open) return;
    setErrorMsg(null);
    setStatusMessage(null);
    setVerifiedSuccess(null);
    setActiveOrderId(null);
  }, [open, themeId]);

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
          // Double-confirm entitlement directly from backend database
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
      setActiveOrderId(returnedOrderId.trim());
      void verifyWithBackend(returnedOrderId.trim());
    }
  }, [open, themeId, verifyWithBackend]);

  if (!open) return null;

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
            'Could not create Cashfree Production order. Please ensure Cashfree Production keys are configured on the server.'
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

      // Always verify strictly on backend with Cashfree Production API after checkout closes
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
              <Sparkles className="w-3.5 h-3.5 text-[#FFE600]" aria-hidden="true" />
              <span>Cashfree Verified Checkout</span>
            </div>
            <h3
              id="worldcup-unlock-modal-title"
              className="font-display font-black text-lg leading-tight text-white"
            >
              Unlock {product.productName} – ₹{product.priceInr}
            </h3>
            <p className="text-xs text-orange-50 font-medium">
              Server-verified Cashfree Production payment · Instant unlock on SUCCESS
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
                Cashfree confirmed your ₹{product.priceInr} {product.currency}{' '}
                payment on the server. {product.productName} is now active live on OBS &amp; vMix.
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-900 space-y-1 text-left">
              <p className="font-bold">
                Order ID: <span className="font-mono">{verifiedSuccess.orderId}</span>
              </p>
              {verifiedSuccess.cfPaymentId && (
                <p className="font-bold">
                  Cashfree Payment ID:{' '}
                  <span className="font-mono">{verifiedSuccess.cfPaymentId}</span>
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
        ) : (
          <div className="p-5 space-y-4">
            {/* Fixed Server Price Card */}
            <div className="rounded-xl bg-[#FFF8EE] border border-[#FF8C00]/35 px-4 py-3.5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#C25E00]">
                  {product.productName}
                </p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="font-display font-black text-2xl text-slate-900 tabular-nums">
                    ₹{product.priceInr}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {product.currency} · Server Fixed Price
                  </span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-extrabold uppercase">
                <Lock className="w-3 h-3 text-[#FFE600]" aria-hidden="true" />
                Locked
              </span>
            </div>

            {/* Optional Phone for Cashfree UPI/Cards prefill */}
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
                  <CreditCard className="w-4 h-4" aria-hidden="true" />
                  <span>Unlock {product.productName} – ₹{product.priceInr}</span>
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

            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-[11px] text-slate-600 space-y-1">
              <p className="font-bold text-slate-800 inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                <span>100% Server-Verified Cashfree Production Security</span>
              </p>
              <p>
                Supports UPI, GPay, PhonePe, Paytm, Cards &amp; NetBanking. Access unlocks
                automatically only after Cashfree confirms{' '}
                <strong className="text-slate-900">SUCCESS</strong> for ₹{product.priceInr}{' '}
                {product.currency}.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
