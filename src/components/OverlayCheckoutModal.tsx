import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  KeyRound,
  LockOpen,
  MessageCircle,
  QrCode,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { Language, STUDIO_CONTACT } from '../data/content';
import {
  OverlayProduct,
  PendingOverlayOrder,
  VerifiedOverlayToken,
} from '../data/overlayCatalog';

interface OverlayCheckoutModalProps {
  lang: Language;
  product: OverlayProduct | null;
  existingPendingOrder?: PendingOverlayOrder | null;
  onClose: () => void;
  onPendingOrderChange: (order: PendingOverlayOrder | null) => void;
  onVerifiedUnlock: (token: VerifiedOverlayToken) => void;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayCheckoutScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function validateUtrClient(utr: string, lang: Language): string | null {
  if (!/^\d{12}$/.test(utr)) {
    return lang === 'mr'
      ? 'कृपया GPay / PhonePe मधील अचूक 12 अंकी UPI UTR नंबर प्रविष्ट करा.'
      : 'Please enter the exact 12-digit UPI UTR / Reference Number.';
  }
  const fakePatterns = new Set([
    '123456789012',
    '012345678901',
    '987654321098',
    '123456123456',
    '111111222222',
    '112233445566',
    '999999888888',
  ]);
  if (/^(\d)\1{11}$/.test(utr) || fakePatterns.has(utr) || new Set(utr.split('')).size < 4 || /(\d)\1{6,}/.test(utr)) {
    return lang === 'mr'
      ? 'खोटा / चुकीचा UTR नंबर स्वीकारला जात नाही. फक्त खऱ्या ₹99 UPI पेमेंटचा UTR टाका.'
      : 'Fake or invalid UTR pattern blocked. Enter the real 12-digit UTR from your ₹99 UPI receipt.';
  }
  return null;
}

async function compressProofImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        const maxDim = 900;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result || ''));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

export function OverlayCheckoutModal({
  lang,
  product,
  existingPendingOrder,
  onClose,
  onPendingOrderChange,
  onVerifiedUnlock,
}: OverlayCheckoutModalProps) {
  const [tab, setTab] = useState<'pay' | 'code'>('pay');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [utrRef, setUtrRef] = useState('');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [proofFileName, setProofFileName] = useState<string>('');
  const [unlockCodeInput, setUnlockCodeInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [activeOrder, setActiveOrder] = useState<PendingOverlayOrder | null>(null);
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);

  // Check if instant bank-verified Razorpay gateway is configured on the server
  useEffect(() => {
    if (!product) return;
    let active = true;
    fetch('/api/payment/config')
      .then((res) => res.json())
      .then((data) => {
        if (active && data?.ok) {
          setRazorpayEnabled(Boolean(data.razorpayEnabled));
        }
      })
      .catch(() => {
        if (active) setRazorpayEnabled(false);
      });
    return () => {
      active = false;
    };
  }, [product]);

  // Sync existing pending order when modal opens for a SKU
  useEffect(() => {
    if (!product) {
      setActiveOrder(null);
      setError(null);
      return;
    }
    if (existingPendingOrder && existingPendingOrder.sku === product.sku) {
      setActiveOrder(existingPendingOrder);
      setTab('pay');
    } else {
      setActiveOrder(null);
    }
    setError(null);
  }, [product, existingPendingOrder]);

  // Real-time SSE listener while order is pending — unlocks ONLY when server confirms real ₹99 payment
  useEffect(() => {
    if (!product || !activeOrder || activeOrder.status !== 'pending') return;

    const es = new EventSource(`/api/overlay/orders/${encodeURIComponent(activeOrder.orderId)}/stream`);

    const applyUpdate = (orderData: PendingOverlayOrder) => {
      setActiveOrder(orderData);
      if (orderData.status === 'approved' && orderData.unlockCode) {
        onPendingOrderChange(null);
        onVerifiedUnlock({
          sku: product.sku,
          orderId: orderData.orderId,
          unlockCode: orderData.unlockCode,
          expiresAt: orderData.expiresAt || Date.now() + 24 * 60 * 60 * 1000,
        });
      } else if (orderData.status === 'rejected' || orderData.status === 'revoked') {
        onPendingOrderChange(null);
      } else {
        onPendingOrderChange(orderData);
      }
    };

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed?.order) {
          applyUpdate(parsed.order as PendingOverlayOrder);
        }
      } catch {
        // Ignore malformed events
      }
    };

    return () => {
      es.close();
    };
  }, [product, activeOrder?.orderId, activeOrder?.status, onPendingOrderChange, onVerifiedUnlock]);

  if (!product) return null;

  const savings = product.originalPrice - product.salePrice;
  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(STUDIO_CONTACT.upiId)}&pn=${encodeURIComponent(
    STUDIO_CONTACT.upiPayeeName
  )}&am=${product.salePrice}&cu=INR&tn=${encodeURIComponent(`StarEventLive-${product.sku}`)}`;

  const whatsappReceiptHref = `https://wa.me/${STUDIO_CONTACT.whatsappNumber}?text=${encodeURIComponent(
    `Hello Star Event Live, I paid ₹${product.salePrice} on UPI ${STUDIO_CONTACT.upiId} for ${product.title.en} (${product.sku}). Order ID: ${activeOrder?.orderId || '-'}, Name: ${buyerName || '-'}, Mobile: ${buyerPhone || '-'}. Please verify & unlock.`
  )}`;

  const handleCopyUpi = async () => {
    try {
      await navigator.clipboard.writeText(STUDIO_CONTACT.upiId);
      setCopiedUpi(true);
      window.setTimeout(() => setCopiedUpi(false), 2000);
    } catch {
      setCopiedUpi(false);
    }
  };

  const handleProofUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(
        lang === 'mr'
          ? 'कृपया पेमेंट स्क्रीनशॉट इमेज (JPG/PNG) निवडा.'
          : 'Please select a valid payment screenshot image (JPG/PNG).'
      );
      return;
    }
    try {
      const compressed = await compressProofImage(file);
      setProofImage(compressed);
      setProofFileName(file.name);
      setError(null);
    } catch {
      setError(
        lang === 'mr'
          ? 'स्क्रीनशॉट वाचता आला नाही. पुन्हा प्रयत्न करा.'
          : 'Could not read screenshot. Please try again.'
      );
    }
  };

  const handleRazorpayInstantPay = async () => {
    const cleanedPhone = buyerPhone.replace(/\D/g, '');
    if (buyerName.trim().length < 2 || cleanedPhone.length < 10) {
      setError(
        lang === 'mr'
          ? 'थेट पेमेंटसाठी कृपया तुमचे नाव आणि 10 अंकी मोबाईल नंबर भरा.'
          : 'Enter your name and 10-digit mobile number first for instant verified checkout.'
      );
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const loaded = await loadRazorpayCheckoutScript();
      if (!loaded || !window.Razorpay) {
        setError('Could not load Razorpay checkout. Please use UPI QR verification below.');
        return;
      }

      const orderRes = await fetch('/api/payment/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: product.sku,
          buyerName: buyerName.trim(),
          buyerPhone: cleanedPhone,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData?.ok) {
        setError(orderData?.error || 'Could not start online payment.');
        return;
      }

      const rzp = new window.Razorpay({
        key: orderData.razorpayKeyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'STAR EVENT LIVE',
        description: `${product.title.en} (24-Hour Pass)`,
        order_id: orderData.razorpayOrderId,
        prefill: {
          name: buyerName.trim(),
          contact: cleanedPhone,
        },
        theme: { color: '#DC2626' },
        handler: async (response: RazorpayResponse) => {
          try {
            const verifyRes = await fetch('/api/payment/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData?.ok || !verifyData?.order?.unlockCode) {
              setError(verifyData?.error || 'Bank verification failed. Overlay remains locked.');
              return;
            }
            const verifiedOrder = verifyData.order as PendingOverlayOrder;
            setActiveOrder(verifiedOrder);
            onPendingOrderChange(null);
            onVerifiedUnlock({
              sku: product.sku,
              orderId: verifiedOrder.orderId,
              unlockCode: verifiedOrder.unlockCode!,
              expiresAt: verifiedOrder.expiresAt || Date.now() + 24 * 60 * 60 * 1000,
            });
          } catch {
            setError('Could not verify payment with server.');
          }
        },
      });
      rzp.open();
    } catch {
      setError('Could not connect to payment gateway.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitOrder = async (e: FormEvent) => {
    e.preventDefault();
    const cleanedPhone = buyerPhone.replace(/\D/g, '');
    const cleanedUtr = utrRef.replace(/\D/g, '');

    if (buyerName.trim().length < 2) {
      setError(lang === 'mr' ? 'कृपया तुमचे नाव प्रविष्ट करा.' : 'Please enter your full name.');
      return;
    }
    if (cleanedPhone.length < 10) {
      setError(
        lang === 'mr'
          ? 'कृपया वैध 10 अंकी मोबाईल नंबर प्रविष्ट करा.'
          : 'Please enter a valid 10-digit mobile number.'
      );
      return;
    }

    const utrError = validateUtrClient(cleanedUtr, lang);
    if (utrError) {
      setError(utrError);
      return;
    }

    if (!proofImage) {
      setError(
        lang === 'mr'
          ? 'खोट्या पेमेंटपासून सुरक्षेसाठी ₹99 UPI पेमेंटचा खरा स्क्रीनशॉट अपलोड करणे अनिवार्य आहे.'
          : 'Uploading your real ₹99 UPI payment screenshot is mandatory to prevent fake submissions.'
      );
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/overlay/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: product.sku,
          buyerName: buyerName.trim(),
          buyerPhone: cleanedPhone,
          utrRef: cleanedUtr,
          proofImage,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data?.order) {
        setError(data?.error || 'Could not submit payment proof. Please check details.');
        return;
      }

      const orderData = data.order as PendingOverlayOrder;
      setActiveOrder(orderData);
      if (orderData.status === 'approved' && orderData.unlockCode) {
        onPendingOrderChange(null);
        onVerifiedUnlock({
          sku: product.sku,
          orderId: orderData.orderId,
          unlockCode: orderData.unlockCode,
          expiresAt: orderData.expiresAt || Date.now() + 24 * 60 * 60 * 1000,
        });
      } else {
        onPendingOrderChange(orderData);
      }
    } catch {
      setError(
        lang === 'mr'
          ? 'सर्व्हरशी संपर्क होऊ शकला नाही. कृपया पुन्हा प्रयत्न करा.'
          : 'Unable to reach verification server. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualStatusCheck = async () => {
    if (!activeOrder) return;
    setCheckingStatus(true);
    setError(null);
    try {
      const res = await fetch(`/api/overlay/orders/${encodeURIComponent(activeOrder.orderId)}/status`);
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
            expiresAt: orderData.expiresAt || Date.now() + 24 * 60 * 60 * 1000,
          });
        } else if (orderData.status === 'rejected' || orderData.status === 'revoked') {
          onPendingOrderChange(null);
        }
      }
    } catch {
      setError(lang === 'mr' ? 'स्टेटस तपासता आला नाही.' : 'Could not check status right now.');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleVerifyUnlockCode = async (e: FormEvent) => {
    e.preventDefault();
    const cleaned = unlockCodeInput.trim().toUpperCase();
    if (!cleaned.startsWith('STAR-') || cleaned.length < 14) {
      setError(
        lang === 'mr'
          ? 'कृपया पेमेंट कन्फर्म झाल्यावर मिळालेला वैध अनलॉक कोड प्रविष्ट करा (STAR-XXXX-XXXX-XXXX).'
          : 'Please enter your verified Unlock Code (e.g. STAR-XXXX-XXXX-XXXX).'
      );
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/overlay/verify-unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unlockCode: cleaned,
          sku: product.sku,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setError(
          data?.error ||
            (lang === 'mr'
              ? 'हा अनलॉक कोड अवैध आहे किंवा ₹99 पेमेंट अद्याप व्हेरिफाय झालेले नाही.'
              : 'Invalid unlock code or ₹99 payment not verified yet.')
        );
        return;
      }

      onPendingOrderChange(null);
      onVerifiedUnlock({
        sku: product.sku,
        orderId: data.orderId,
        unlockCode: data.unlockCode,
        expiresAt: Number(data.expiresAt) || Date.now() + 24 * 60 * 60 * 1000,
      });
      onClose();
    } catch {
      setError(
        lang === 'mr'
          ? 'कोड तपासताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.'
          : 'Network error while verifying code.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/82 backdrop-blur-sm overflow-y-auto"
    >
      <div className="relative w-full max-w-xl bg-[#121216] border border-white/15 rounded-2xl p-5 sm:p-7 space-y-5 my-auto max-h-[92vh] overflow-y-auto">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close checkout"
          className="absolute top-4 right-4 w-9 h-9 inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Product & Discounted Price Header */}
        <div className="space-y-1.5 pr-8">
          <p className="text-xs font-mono font-semibold text-[#FACC15]">
            {lang === 'mr'
              ? 'फक्त खऱ्या ₹99 पेमेंटनंतरच अनलॉक · ANTI-FRAUD PROTECTED'
              : 'REAL ₹99 PAYMENT VERIFICATION · ANTI-FRAUD PROTECTED'}
          </p>
          <h3 id="checkout-modal-title" className="font-display text-lg sm:text-2xl font-bold text-white">
            {product.title[lang]}
          </h3>

          <div className="pt-1 flex flex-wrap items-baseline gap-3">
            <span className="font-mono text-base sm:text-lg text-zinc-500 line-through tabular-nums">
              ₹{product.originalPrice}
            </span>
            <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#FACC15] tabular-nums">
              ₹{product.salePrice}
            </span>
            <span className="text-xs font-semibold text-[#4ADE80] tabular-nums">
              {lang === 'mr'
                ? `₹${savings} सूट · 24 तास अनलॉक`
                : `Save ₹${savings} · 24 Hours Pass`}
            </span>
          </div>
        </div>

        {/* Mode Switcher Tabs: Pay via QR vs Enter Unlock Code */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-[#0D0D11] border border-white/10 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setTab('pay');
              setError(null);
            }}
            className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              tab === 'pay' ? 'bg-[#DC2626] text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{lang === 'mr' ? '₹99 UPI पेमेंट' : 'Pay ₹99 Verified'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('code');
              setError(null);
            }}
            className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              tab === 'code' ? 'bg-[#DC2626] text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{lang === 'mr' ? 'अनलॉक कोड टाका' : 'Have Unlock Code?'}</span>
          </button>
        </div>

        {tab === 'code' ? (
          <form onSubmit={handleVerifyUnlockCode} noValidate className="space-y-4">
            <div className="bg-[#0D0D11] border border-white/10 rounded-xl p-4 space-y-1.5">
              <p className="text-xs font-semibold text-white">
                {lang === 'mr'
                  ? 'खरे ₹99 पेमेंट व्हेरिफाय झाल्यावर मिळालेला अनलॉक कोड प्रविष्ट करा'
                  : 'Enter your server-verified Unlock Code'}
              </p>
              <p className="text-xs text-zinc-400">
                {lang === 'mr'
                  ? 'फक्त व्हेरिफायड अनलॉक कोड (STAR-XXXX-XXXX-XXXX) चालेल.'
                  : 'Only verified codes issued after real ₹99 bank confirmation (STAR-XXXX-XXXX-XXXX) are accepted.'}
              </p>
            </div>

            <div className="space-y-1">
              <label htmlFor="unlock-code-input" className="block text-xs text-zinc-400">
                {lang === 'mr' ? 'व्हेरिफायड अनलॉक कोड *' : 'Verified Unlock Code *'}
              </label>
              <input
                id="unlock-code-input"
                type="text"
                value={unlockCodeInput}
                onChange={(e) => setUnlockCodeInput(e.target.value.toUpperCase())}
                placeholder="STAR-XXXX-XXXX-XXXX"
                className="w-full px-3.5 py-2.5 text-sm font-mono uppercase bg-[#18181D] border border-white/15 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FACC15]"
              />
            </div>

            {error && <p className="text-xs text-[#F87171]">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-black bg-[#FACC15] hover:bg-[#EAB308] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
            >
              <LockOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                {submitting
                  ? lang === 'mr'
                    ? 'तपासत आहे...'
                    : 'Verifying...'
                  : lang === 'mr'
                    ? 'कोड तपासा व ओव्हरले अनलॉक करा'
                    : 'Verify Code & Unlock Overlay'}
              </span>
            </button>
          </form>
        ) : activeOrder?.status === 'approved' ? (
          /* Verified & Unlocked Success View */
          <div className="bg-[#0D1A12] border border-[#4ADE80]/40 rounded-xl p-5 space-y-4 text-center">
            <CheckCircle2 className="w-10 h-10 text-[#4ADE80] mx-auto" aria-hidden="true" />
            <div className="space-y-1">
              <h4 className="font-display text-lg font-bold text-white">
                {lang === 'mr'
                  ? '₹99 खरे पेमेंट कन्फर्म — 24 तासांसाठी अनलॉक झाले!'
                  : '₹99 Real Payment Verified — Unlocked for 24 Hours!'}
              </h4>
              <p className="text-xs text-zinc-300">
                {lang === 'mr'
                  ? 'आता तुम्ही 24 तासांसाठी OBS Browser Source URL, vMix URL आणि 1920×1080 PNG वापरू शकता.'
                  : 'Your OBS URL, vMix URL, and 1920×1080 PNG export are active for 24 hours, then automatically lock.'}
              </p>
            </div>
            {activeOrder.unlockCode && (
              <div className="bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 inline-block space-y-1">
                <p className="text-[11px] text-zinc-400">
                  {lang === 'mr' ? 'तुमचा 24 तासांचा अनलॉक कोड' : 'Your 24-Hour Unlock Code'}
                </p>
                <p className="font-mono text-base font-extrabold text-[#FACC15] tracking-wider">
                  {activeOrder.unlockCode}
                </p>
                {activeOrder.expiresAt && (
                  <p className="text-[11px] font-mono text-zinc-400">
                    {lang === 'mr' ? 'वैधता समाप्त:' : 'Auto-locks at:'}{' '}
                    {new Date(activeOrder.expiresAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}
            <div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 text-sm font-semibold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-lg transition-colors"
              >
                {lang === 'mr' ? 'OBS / vMix लिंक उघडा' : 'Open OBS / vMix URLs Now'}
              </button>
            </div>
          </div>
        ) : activeOrder?.status === 'pending' ? (
          /* Waiting for Real ₹99 Bank Confirmation (NEVER auto-unlocks!) */
          <div className="space-y-4">
            <div className="bg-[#17130B] border border-[#FACC15]/45 rounded-xl p-5 space-y-3">
              <div className="flex items-start gap-3">
                <Clock className="w-6 h-6 text-[#FACC15] shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1">
                  <h4 className="font-display text-base font-bold text-white">
                    {lang === 'mr'
                      ? 'बँक / UPI पेमेंट व्हेरिफिकेशन प्रतीक्षेत आहे'
                      : 'Strict ₹99 Payment Verification Pending'}
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {lang === 'mr'
                      ? `${STUDIO_CONTACT.upiId} वर खरोखर ₹99 जमा झाल्याचे बँक/GPay मध्ये तपासून कन्फर्म झाल्यावरच ओव्हरले आपोआप अनलॉक होईल. खोटे पेमेंट किंवा चुकीचा UTR ब्लॉक केला जातो.`
                      : `This overlay stays strictly locked until real ₹99 receipt is matched in our bank / Google Pay statement for ${STUDIO_CONTACT.upiId}. Fake or unpaid UTRs are permanently blocked.`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10 text-xs">
                <div>
                  <span className="text-zinc-400 block">Order ID</span>
                  <span className="font-mono font-bold text-white">{activeOrder.orderId}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block">Submitted UTR (Masked)</span>
                  <span className="font-mono font-bold text-[#FACC15] tabular-nums">
                    {activeOrder.utrRef}
                  </span>
                </div>
              </div>
            </div>

            {error && <p className="text-xs text-[#F87171]">{error}</p>}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <a
                href={whatsappReceiptHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-lg transition-colors whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  {lang === 'mr'
                    ? 'जलद व्हेरिफिकेशनसाठी WhatsApp करा'
                    : 'Send Proof on WhatsApp (Fast Verify)'}
                </span>
              </a>

              <button
                type="button"
                onClick={handleManualStatusCheck}
                disabled={checkingStatus}
                className="inline-flex items-center justify-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold text-zinc-200 hover:text-white border border-white/15 hover:border-white/30 rounded-lg transition-colors whitespace-nowrap"
              >
                <RefreshCw
                  className={`w-4 h-4 text-[#FACC15] shrink-0 ${checkingStatus ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>{lang === 'mr' ? 'स्टेटस तपासा' : 'Check Status'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveOrder(null);
                onPendingOrderChange(null);
              }}
              className="w-full text-center text-xs text-zinc-400 hover:text-white underline-offset-4 hover:underline"
            >
              {lang === 'mr' ? 'दुसरा खरा UTR सबमिट करा' : 'Submit a different real payment'}
            </button>
          </div>
        ) : (
          /* Step 1 + Step 2: Strict Anti-Fraud Payment Form */
          <div className="space-y-5">
            {(activeOrder?.status === 'rejected' || activeOrder?.status === 'revoked') && (
              <div className="bg-[#230B0D] border border-[#EF4444]/50 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-[#FCA5A5]">
                <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-bold text-white">
                    {lang === 'mr'
                      ? 'पेमेंट व्हेरिफिकेशन नाकारले / ब्लॉक केले गेले'
                      : 'Payment Rejected / Blocked'}
                  </p>
                  <p className="mt-0.5">
                    {activeOrder.rejectionReason ||
                      'Real ₹99 payment was not received for that UTR. Please pay exact ₹99 via QR and submit a genuine receipt.'}
                  </p>
                </div>
              </div>
            )}

            {/* Anti-Fraud Notice Banner */}
            <div className="bg-[#18120B] border border-[#FACC15]/30 rounded-xl px-3.5 py-2.5 flex items-start gap-2.5 text-[11px] sm:text-xs text-zinc-300">
              <ShieldAlert className="w-4 h-4 text-[#FACC15] shrink-0 mt-0.5" aria-hidden="true" />
              <p className="leading-relaxed">
                {lang === 'mr'
                  ? 'सुरक्षा सूचना: खोटा UTR किंवा जुना स्क्रीनशॉट अपलोड केल्यास सिस्टीम आपोआप ब्लॉक करते. ₹99 बँक/UPI मध्ये जमा झाल्याची खात्री झाल्यावरच ओव्हरले अनलॉक होईल.'
                  : 'Anti-Fraud Protection: Fake UTRs and duplicate screenshots are automatically blocked. Overlay unlocks ONLY after real ₹99 bank/UPI settlement is verified.'}
              </p>
            </div>

            {/* Real Google Pay UPI QR Code Box */}
            <div className="bg-[#0D0D11] border border-white/12 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-5 flex justify-center">
                <div className="bg-white rounded-xl p-2 w-44 sm:w-full max-w-[185px] shadow-md">
                  <img
                    src={STUDIO_CONTACT.upiQrPath}
                    alt={`Google Pay UPI QR Code for ${STUDIO_CONTACT.upiId}`}
                    className="w-full h-auto rounded-lg block object-contain"
                  />
                </div>
              </div>

              <div className="sm:col-span-7 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-white">
                    {lang === 'mr'
                      ? 'पायरी 1 · हा QR स्कॅन करून अचूक ₹99 पेमेंट करा'
                      : 'Step 1 · Scan QR & Pay Exact ₹99'}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {lang === 'mr'
                      ? 'GPay, PhonePe, Paytm किंवा कोणत्याही UPI अॅपने पेमेंट करा.'
                      : 'Works with Google Pay, PhonePe, Paytm & any UPI app.'}
                  </p>
                </div>

                <div className="bg-[#16161C] border border-white/10 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="block text-[10px] text-zinc-400">UPI ID</span>
                    <span className="font-mono text-xs font-bold text-[#FACC15] break-all">
                      {STUDIO_CONTACT.upiId}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold bg-[#22222B] hover:bg-[#2C2C38] text-white rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    {copiedUpi ? (
                      <Check className="w-3.5 h-3.5 text-[#4ADE80]" aria-hidden="true" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    <span>{copiedUpi ? 'Copied' : 'Copy UPI'}</span>
                  </button>
                </div>

                <a
                  href={upiDeepLink}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-lg transition-colors whitespace-nowrap"
                >
                  <span>
                    {lang === 'mr' ? 'मोबाईल UPI अॅप उघडा (₹99)' : 'Pay ₹99 in UPI App (Mobile)'}
                  </span>
                </a>
              </div>
            </div>

            {/* Step 2: Strict 12-Digit UTR + MANDATORY Screenshot Proof Submission */}
            <form onSubmit={handleSubmitOrder} noValidate className="space-y-3.5">
              <p className="text-xs font-semibold text-white">
                {lang === 'mr'
                  ? 'पायरी 2 · ₹99 पेमेंट झाल्यानंतर 12 अंकी UTR आणि खरा स्क्रीनशॉट (अनिवार्य) सबमिट करा'
                  : 'Step 2 · Submit Real 12-Digit UPI UTR & Payment Screenshot (Mandatory)'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="buyer-name" className="block text-xs text-zinc-400">
                    {lang === 'mr' ? 'तुमचे नाव *' : 'Your Name *'}
                  </label>
                  <input
                    id="buyer-name"
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder={lang === 'mr' ? 'उदा. संकेत पाटील' : 'e.g. Sanket Patil'}
                    className="w-full px-3 py-2 text-sm bg-[#18181D] border border-white/15 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FACC15]"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="buyer-phone" className="block text-xs text-zinc-400">
                    {lang === 'mr' ? 'मोबाईल नंबर *' : 'Mobile Number *'}
                  </label>
                  <input
                    id="buyer-phone"
                    type="tel"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="9890XXXXXX"
                    className="w-full px-3 py-2 text-sm font-mono bg-[#18181D] border border-white/15 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FACC15] tabular-nums"
                  />
                </div>
              </div>

              {razorpayEnabled && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleRazorpayInstantPay}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-black bg-[#4ADE80] hover:bg-[#22C55E] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Zap className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>
                    {lang === 'mr'
                      ? '₹99 इन्स्टंट बँक-व्हेरिफायड पेमेंट (ऑटो अनलॉक)'
                      : 'Pay ₹99 Online (Instant Bank-Verified Unlock)'}
                  </span>
                </button>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="buyer-utr" className="block text-xs text-zinc-400">
                    {lang === 'mr' ? 'अचूक 12 अंकी UPI UTR नंबर *' : 'Exact 12-Digit UPI UTR *'}
                  </label>
                  <input
                    id="buyer-utr"
                    type="text"
                    inputMode="numeric"
                    maxLength={12}
                    value={utrRef}
                    onChange={(e) => setUtrRef(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    placeholder="432198765432"
                    className="w-full px-3 py-2 text-sm font-mono bg-[#18181D] border border-white/15 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FACC15] tabular-nums"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="payment-screenshot" className="block text-xs text-zinc-400">
                    {lang === 'mr' ? 'पेमेंट स्क्रीनशॉट (अनिवार्य) *' : 'Payment Screenshot (Required) *'}
                  </label>
                  <label
                    htmlFor="payment-screenshot"
                    className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-[#18181D] hover:bg-[#22222B] border border-dashed rounded-lg cursor-pointer transition-colors truncate ${
                      proofImage
                        ? 'border-[#4ADE80]/70 text-[#4ADE80]'
                        : 'border-[#FACC15]/50 text-zinc-200'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5 text-[#FACC15] shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      {proofFileName ||
                        (lang === 'mr' ? '₹99 स्क्रीनशॉट अपलोड करा *' : 'Upload ₹99 Receipt *')}
                    </span>
                  </label>
                  <input
                    id="payment-screenshot"
                    type="file"
                    accept="image/*"
                    onChange={handleProofUpload}
                    className="sr-only"
                  />
                </div>
              </div>

              {proofImage && (
                <div className="flex items-center gap-3 bg-[#0D0D11] border border-[#4ADE80]/30 rounded-lg p-2.5">
                  <img
                    src={proofImage}
                    alt="Uploaded UPI receipt preview"
                    className="w-12 h-12 rounded object-cover border border-white/15 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#4ADE80]">
                      {lang === 'mr' ? 'पेमेंट स्क्रीनशॉट जोडला गेला' : 'Payment Screenshot Attached'}
                    </p>
                    <p className="text-[11px] text-zinc-400 truncate">{proofFileName}</p>
                  </div>
                </div>
              )}

              {error && <p className="text-xs text-[#F87171]">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
              >
                <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  {submitting
                    ? lang === 'mr'
                      ? 'तपासणीसाठी सबमिट होत आहे...'
                      : 'Submitting for Verification...'
                    : lang === 'mr'
                      ? '₹99 पेमेंट प्रूफ सबमिट करा (व्हेरिफिकेशनसाठी)'
                      : 'Submit ₹99 Receipt for Verification'}
                </span>
              </button>

              <p className="text-[11px] text-zinc-400 text-center">
                {lang === 'mr'
                  ? 'बँक / GPay मध्ये ₹99 जमा झाल्याची खात्री होताच ओव्हरले 24 तासांसाठी अनलॉक होईल.'
                  : 'Unlocks strictly after real ₹99 credit is verified on crushyyphotography@oksbi, then auto-locks after 24 hours.'}
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
