import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  KeyRound,
  Loader2,
  LockOpen,
  MessageCircle,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { Language, STUDIO_CONTACT } from '../data/content';
import {
  getOverlayPlan,
  OVERLAY_PLANS,
  OverlayPlanId,
  OverlayProduct,
  OverlaySku,
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

function validateUtrClient(utr: string, amount: number, lang: Language): string | null {
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
  if (
    /^(\d)\1{11}$/.test(utr) ||
    fakePatterns.has(utr) ||
    new Set(utr.split('')).size < 4 ||
    /(\d)\1{6,}/.test(utr)
  ) {
    return lang === 'mr'
      ? `खोटा / चुकीचा UTR नंबर स्वीकारला जात नाही. फक्त खऱ्या ₹${amount} UPI पेमेंटचा UTR टाका.`
      : `Fake or invalid UTR pattern blocked. Enter the real 12-digit UTR from your ₹${amount} UPI receipt.`;
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
  initialPlanId = '1day',
  existingPendingOrder,
  onClose,
  onPendingOrderChange,
  onVerifiedUnlock,
}: OverlayCheckoutModalProps) {
  const [tab, setTab] = useState<'pay' | 'key'>('pay');
  const [selectedPlanId, setSelectedPlanId] = useState<OverlayPlanId>(initialPlanId);
  const [autoGatewayEnabled, setAutoGatewayEnabled] = useState<boolean>(false);
  const [creatingQr, setCreatingQr] = useState<boolean>(false);
  const [gatewayQrUrl, setGatewayQrUrl] = useState<string | null>(null);
  const [dynamicUpiQrUrl, setDynamicUpiQrUrl] = useState<string | null>(null);

  const [showUtrForm, setShowUtrForm] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [utrRef, setUtrRef] = useState('');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [proofFileName, setProofFileName] = useState<string>('');
  const [unlockKeyInput, setUnlockKeyInput] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifyingKey, setVerifyingKey] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [activeOrder, setActiveOrder] = useState<PendingOverlayOrder | null>(null);

  const selectedPlan = getOverlayPlan(selectedPlanId);

  // Sync modal reset when opened for a product
  useEffect(() => {
    if (!product) {
      setActiveOrder(null);
      setGatewayQrUrl(null);
      setError(null);
      setKeyError(null);
      setShowUtrForm(false);
      return;
    }

    if (existingPendingOrder && existingPendingOrder.sku === product.sku) {
      setActiveOrder(existingPendingOrder);
      if (existingPendingOrder.planId) {
        setSelectedPlanId(existingPendingOrder.planId);
      }
      if (existingPendingOrder.gatewayQrImageUrl) {
        setGatewayQrUrl(existingPendingOrder.gatewayQrImageUrl);
      }
      setTab('pay');
    } else {
      setActiveOrder(null);
      setGatewayQrUrl(null);
      setSelectedPlanId(initialPlanId);
    }
    setError(null);
    setKeyError(null);
  }, [product, existingPendingOrder, initialPlanId]);

  // Fetch gateway config + generate live Razorpay QR (when configured) OR crisp amount-locked dynamic UPI QR
  useEffect(() => {
    if (!product) return;
    let cancelled = false;

    const upiString = `upi://pay?pa=${encodeURIComponent(STUDIO_CONTACT.upiId)}&pn=${encodeURIComponent(
      STUDIO_CONTACT.upiPayeeName
    )}&am=${selectedPlan.price}&cu=INR&tn=${encodeURIComponent(
      `StarEventLive-${product.sku}-${selectedPlan.id}`
    )}`;

    // Always generate crisp amount-locked dynamic UPI QR locally as immediate visual/fallback
    QRCode.toDataURL(upiString, {
      width: 320,
      margin: 2,
      color: { dark: '#09090B', light: '#FFFFFF' },
    })
      .then((dataUrl) => {
        if (!cancelled) setDynamicUpiQrUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setDynamicUpiQrUrl(null);
      });

    // Check server gateway config & auto-generate Razorpay live QR if configured
    const initGatewayQr = async () => {
      try {
        const cfgRes = await fetch('/api/payment/config');
        const cfg = await cfgRes.json();
        if (cancelled) return;
        const enabled = Boolean(cfgRes.ok && cfg?.autoUnlockEnabled);
        setAutoGatewayEnabled(enabled);

        if (!enabled) {
          setGatewayQrUrl(null);
          return;
        }

        // Reuse existing pending Razorpay QR if it matches the exact SKU & selected plan
        if (
          activeOrder &&
          activeOrder.status === 'pending' &&
          activeOrder.paymentMethod === 'razorpay_qr' &&
          activeOrder.sku === product.sku &&
          activeOrder.planId === selectedPlan.id &&
          activeOrder.gatewayQrImageUrl
        ) {
          setGatewayQrUrl(activeOrder.gatewayQrImageUrl);
          return;
        }

        setCreatingQr(true);
        setError(null);
        const qrRes = await fetch('/api/payment/qr/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sku: product.sku,
            planId: selectedPlan.id,
          }),
        });
        const qrData = await qrRes.json();
        if (cancelled) return;

        if (qrRes.ok && qrData?.mode === 'razorpay_auto' && qrData?.order && qrData?.qrImageUrl) {
          const orderObj = qrData.order as PendingOverlayOrder;
          setGatewayQrUrl(qrData.qrImageUrl);
          setActiveOrder(orderObj);
          onPendingOrderChange(orderObj);
        } else if (!qrRes.ok) {
          setError(qrData?.error || 'Could not generate automatic QR code.');
        }
      } catch {
        if (!cancelled) setAutoGatewayEnabled(false);
      } finally {
        if (!cancelled) setCreatingQr(false);
      }
    };

    initGatewayQr();
    return () => {
      cancelled = true;
    };
  }, [product, selectedPlan.id, selectedPlan.price]);

  // Real-time SSE + 3-second automatic server check -> auto-unlocks the instant QR payment settles!
  useEffect(() => {
    if (!product || !activeOrder || activeOrder.status !== 'pending') return;

    const applyUpdate = (orderData: PendingOverlayOrder) => {
      setActiveOrder(orderData);
      if (orderData.status === 'approved' && orderData.unlockCode) {
        const fallbackHours = orderData.durationHours || selectedPlan.durationHours;
        onPendingOrderChange(null);
        onVerifiedUnlock({
          sku: product.sku,
          orderId: orderData.orderId,
          unlockCode: orderData.unlockCode,
          planId: orderData.planId || selectedPlan.id,
          expiresAt: orderData.expiresAt || Date.now() + fallbackHours * 60 * 60 * 1000,
        });
      } else if (orderData.status === 'rejected' || orderData.status === 'revoked') {
        onPendingOrderChange(null);
      } else {
        onPendingOrderChange(orderData);
      }
    };

    const es = new EventSource(`/api/overlay/orders/${encodeURIComponent(activeOrder.orderId)}/stream`);
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

    // Backup poll every 3s for automatic Razorpay QR settlement detection
    const pollId = window.setInterval(async () => {
      try {
        const res = await fetch(
          `/api/overlay/orders/${encodeURIComponent(activeOrder.orderId)}/status`,
          { cache: 'no-store' }
        );
        const data = await res.json();
        if (res.ok && data?.order) {
          applyUpdate(data.order as PendingOverlayOrder);
        }
      } catch {
        // retry next tick
      }
    }, 3000);

    return () => {
      es.close();
      window.clearInterval(pollId);
    };
  }, [
    product,
    activeOrder?.orderId,
    activeOrder?.status,
    selectedPlan.durationHours,
    selectedPlan.id,
    onPendingOrderChange,
    onVerifiedUnlock,
  ]);

  if (!product) return null;

  const isManualPending =
    activeOrder?.status === 'pending' && activeOrder.paymentMethod !== 'razorpay_qr';
  const isAutoQrListening =
    autoGatewayEnabled &&
    activeOrder?.status === 'pending' &&
    activeOrder.paymentMethod === 'razorpay_qr' &&
    Boolean(gatewayQrUrl);

  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(STUDIO_CONTACT.upiId)}&pn=${encodeURIComponent(
    STUDIO_CONTACT.upiPayeeName
  )}&am=${selectedPlan.price}&cu=INR&tn=${encodeURIComponent(
    `StarEventLive-${product.sku}-${selectedPlan.id}`
  )}`;

  const whatsappPaymentHref = `https://wa.me/${STUDIO_CONTACT.whatsappNumber}?text=${encodeURIComponent(
    `Hello Star Event Live! I have paid ₹${selectedPlan.price} (${selectedPlan.label.en}) on UPI (${STUDIO_CONTACT.upiId}) for ${product.title.en} (${product.sku}). Attaching my payment screenshot — please activate/send my Unlock Key.`
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

  const handleSelectPlan = (planId: OverlayPlanId) => {
    if (planId === selectedPlanId) return;
    setSelectedPlanId(planId);
    setError(null);
    if (activeOrder?.status === 'pending' && activeOrder.paymentMethod === 'razorpay_qr') {
      setActiveOrder(null);
      setGatewayQrUrl(null);
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

  const handleVerifyUnlockKey = async (e: FormEvent) => {
    e.preventDefault();
    const cleaned = unlockKeyInput.trim().toUpperCase();
    if (cleaned.length < 8) {
      setKeyError(
        lang === 'mr'
          ? 'कृपया पेमेंटनंतर मिळालेली वैध Unlock Key प्रविष्ट करा (उदा. STAR-XXXX-XXXX-XXXX).'
          : 'Please enter a valid Unlock Key (e.g. STAR-XXXX-XXXX-XXXX).'
      );
      return;
    }

    setKeyError(null);
    setVerifyingKey(true);
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
        setKeyError(
          data?.error ||
            (lang === 'mr'
              ? 'ही Unlock Key चुकीची आहे किंवा वैधता संपली आहे.'
              : 'Invalid or expired Unlock Key.')
        );
        return;
      }

      const skusToUnlock: OverlaySku[] =
        Array.isArray(data.unlockedSkus) && data.unlockedSkus.length > 0
          ? (data.unlockedSkus as OverlaySku[])
          : [product.sku];

      const expiresAt = Number(data.expiresAt) || Date.now() + 24 * 60 * 60 * 1000;
      const tokens: VerifiedOverlayToken[] = skusToUnlock.map((sku) => ({
        sku,
        orderId: data.orderId,
        unlockCode: data.unlockCode,
        planId: data.planId,
        expiresAt,
      }));

      onPendingOrderChange(null);
      onVerifiedUnlock(tokens);
      setUnlockKeyInput('');
      onClose();
    } catch {
      setKeyError(
        lang === 'mr'
          ? 'सर्व्हरशी संपर्क होऊ शकला नाही. कृपया पुन्हा प्रयत्न करा.'
          : 'Network error while verifying Unlock Key.'
      );
    } finally {
      setVerifyingKey(false);
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

    const utrError = validateUtrClient(cleanedUtr, selectedPlan.price, lang);
    if (utrError) {
      setError(utrError);
      return;
    }

    if (!proofImage) {
      setError(
        lang === 'mr'
          ? `खोट्या पेमेंटपासून सुरक्षेसाठी ₹${selectedPlan.price} UPI पेमेंटचा खरा स्क्रीनशॉट अपलोड करणे अनिवार्य आहे.`
          : `Uploading your real ₹${selectedPlan.price} UPI payment screenshot is mandatory.`
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
          planId: selectedPlan.id,
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
      onPendingOrderChange(orderData);
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
      const res = await fetch(
        `/api/overlay/orders/${encodeURIComponent(activeOrder.orderId)}/status`,
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
            planId: orderData.planId || selectedPlan.id,
            expiresAt:
              orderData.expiresAt || Date.now() + (orderData.durationHours || 24) * 60 * 60 * 1000,
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

        {/* Product Header */}
        <div className="space-y-1.5 pr-8">
          <p className="text-xs font-mono font-semibold text-[#FACC15] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>
              {autoGatewayEnabled
                ? lang === 'mr'
                  ? 'QR पेमेंट होताच ओव्हरले आपोआप अनलॉक होईल'
                  : 'AUTO-UNLOCKS INSTANTLY ON VERIFIED QR PAYMENT'
                : lang === 'mr'
                  ? 'प्लॅन निवडा · QR स्कॅन करा व अनलॉक करा'
                  : 'SELECT PLAN · SCAN AMOUNT-LOCKED QR TO UNLOCK'}
            </span>
          </p>
          <h3 id="checkout-modal-title" className="font-display text-lg sm:text-2xl font-bold text-white">
            {product.title[lang]}
          </h3>
        </div>

        {/* 3-Plan Selector: 1 Day ₹49 | 1 Week ₹149 | 1 Month ₹1,499 */}
        {activeOrder?.status !== 'approved' && !isManualPending && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-300">
              {lang === 'mr' ? 'तुमचा प्लॅन निवडा (Validity Plan):' : 'Choose Your Validity Plan:'}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {OVERLAY_PLANS.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => handleSelectPlan(plan.id)}
                    aria-pressed={isSelected}
                    className={`relative rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? 'bg-[#1D170B] border-[#FACC15] shadow-[0_0_0_1px_rgba(250,204,21,0.5)]'
                        : 'bg-[#0D0D11] border-white/12 hover:border-white/30'
                    }`}
                  >
                    {plan.badge && (
                      <span className="inline-block font-mono text-[9px] font-bold uppercase tracking-wider text-[#4ADE80] mb-0.5">
                        {plan.badge[lang]}
                      </span>
                    )}
                    <p className="text-xs font-bold text-white leading-tight">
                      {plan.shortLabel[lang]}
                    </p>
                    <p className="font-mono text-lg sm:text-xl font-extrabold text-[#FACC15] tabular-nums mt-1 leading-none">
                      ₹{plan.price.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-1 leading-snug">
                      {plan.id === '1day'
                        ? lang === 'mr'
                          ? '24 तास वैध'
                          : '24 Hours'
                        : plan.id === '1week'
                          ? lang === 'mr'
                            ? '7 दिवस वैध'
                            : '7 Days'
                          : lang === 'mr'
                            ? '30 दिवस वैध'
                            : '30 Days'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-[#0D0D11] border border-white/10 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setTab('pay');
              setError(null);
              setKeyError(null);
            }}
            className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              tab === 'pay' ? 'bg-[#DC2626] text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>
              {lang === 'mr'
                ? `1. ₹${selectedPlan.price} QR पेमेंट`
                : `1. Pay ₹${selectedPlan.price} QR`}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('key');
              setError(null);
              setKeyError(null);
            }}
            className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              tab === 'key' ? 'bg-[#FACC15] text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{lang === 'mr' ? '2. Unlock Key टाका' : '2. Enter Unlock Key'}</span>
          </button>
        </div>

        {tab === 'key' ? (
          <form onSubmit={handleVerifyUnlockKey} noValidate className="space-y-4">
            <div className="bg-[#0D0D11] border border-[#FACC15]/30 rounded-xl p-4 space-y-1.5">
              <p className="text-xs font-bold text-white">
                {lang === 'mr'
                  ? 'पेमेंटनंतर मिळालेली Unlock Key येथे टाका'
                  : 'Enter your Unlock Key to activate immediately'}
              </p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {lang === 'mr'
                  ? 'तुमच्याकडे आधीपासून Unlock Key (STAR-XXXX-XXXX-XXXX) असल्यास ती येथे टाका — 1 दिवस / 1 आठवडा / 1 महिना वैधतेनुसार लगेच अनलॉक होईल.'
                  : 'Paste your verified Unlock Key (STAR-XXXX-XXXX-XXXX) to unlock this overlay for your paid plan duration.'}
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="unlock-key-tab-input" className="block text-xs text-zinc-300 font-medium">
                {lang === 'mr' ? 'तुमची Unlock Key *' : 'Your Unlock Key *'}
              </label>
              <input
                id="unlock-key-tab-input"
                type="text"
                autoFocus
                value={unlockKeyInput}
                onChange={(e) => setUnlockKeyInput(e.target.value.toUpperCase())}
                placeholder="STAR-XXXX-XXXX-XXXX"
                className="w-full px-4 py-3 text-base font-mono font-bold uppercase tracking-wider bg-[#18181D] border border-[#FACC15]/50 rounded-xl text-[#FACC15] placeholder:text-zinc-500 focus:outline-none focus:border-[#FACC15]"
              />
            </div>

            {keyError && <p className="text-xs text-[#F87171]">{keyError}</p>}

            <button
              type="submit"
              disabled={verifyingKey}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] disabled:opacity-60 rounded-xl transition-colors whitespace-nowrap"
            >
              <LockOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                {verifyingKey
                  ? lang === 'mr'
                    ? 'Key तपासत आहे...'
                    : 'Verifying Key...'
                  : lang === 'mr'
                    ? 'Key तपासा व ओव्हरले अनलॉक करा'
                    : 'Verify Key & Unlock Overlay'}
              </span>
            </button>
          </form>
        ) : activeOrder?.status === 'approved' ? (
          <div className="bg-[#0D1A12] border border-[#4ADE80]/40 rounded-xl p-5 space-y-4 text-center">
            <CheckCircle2 className="w-10 h-10 text-[#4ADE80] mx-auto" aria-hidden="true" />
            <div className="space-y-1">
              <h4 className="font-display text-lg font-bold text-white">
                {lang === 'mr'
                  ? 'पेमेंट कन्फर्म झाले — ओव्हरले आपोआप अनलॉक झाले!'
                  : 'Payment Verified — Overlay Unlocked Automatically!'}
              </h4>
              <p className="text-xs text-zinc-300">
                {lang === 'mr'
                  ? `${getOverlayPlan(activeOrder.planId).label.mr} सक्रिय झाले आहे. आता OBS व vMix लिंक थेट वापरा.`
                  : `${getOverlayPlan(activeOrder.planId).label.en} is now active. Your OBS & vMix URLs are ready!`}
              </p>
            </div>
            {activeOrder.unlockCode && (
              <div className="bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 inline-block space-y-1">
                <p className="text-[11px] text-zinc-400">Saved Unlock Key</p>
                <p className="font-mono text-base font-extrabold text-[#FACC15] tracking-wider select-all">
                  {activeOrder.unlockCode}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-4 text-sm font-semibold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-lg transition-colors"
            >
              {lang === 'mr' ? 'OBS / vMix लिंक उघडा' : 'Open OBS / vMix URLs Now'}
            </button>
          </div>
        ) : isManualPending ? (
          <div className="space-y-4">
            <div className="bg-[#17130B] border border-[#FACC15]/45 rounded-xl p-5 space-y-3">
              <div className="flex items-start gap-3">
                <Clock className="w-6 h-6 text-[#FACC15] shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1">
                  <h4 className="font-display text-base font-bold text-white">
                    {lang === 'mr'
                      ? `₹${activeOrder.amount} पेमेंट तपासणी सुरू आहे — मंजूर होताच ऑटो अनलॉक होईल`
                      : `₹${activeOrder.amount} Verification Pending — Auto-Unlocks on Approval`}
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {lang === 'mr'
                      ? 'ही विंडो उघडी ठेवा — पेमेंट कन्फर्म होताच स्क्रीन आपोआप अनलॉक होईल, किंवा WhatsApp वरून Key घ्या.'
                      : 'Keep this window open — your overlay unlocks automatically the moment payment is verified.'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/10 text-xs">
                <div>
                  <span className="text-zinc-400 block">Order ID</span>
                  <span className="font-mono font-bold text-white">{activeOrder.orderId}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block">Plan</span>
                  <span className="font-mono font-bold text-[#4ADE80]">
                    ₹{activeOrder.amount} · {getOverlayPlan(activeOrder.planId).shortLabel[lang]}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block">UTR</span>
                  <span className="font-mono font-bold text-[#FACC15] tabular-nums">
                    {activeOrder.utrRef}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <a
                href={whatsappPaymentHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg transition-colors whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{lang === 'mr' ? 'WhatsApp वर कन्फर्म करा' : 'Confirm on WhatsApp'}</span>
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
          </div>
        ) : (
          /* Main QR Payment Flow */
          <div className="space-y-4">
            {(activeOrder?.status === 'rejected' || activeOrder?.status === 'revoked') && (
              <div className="bg-[#230B0D] border border-[#EF4444]/50 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-[#FCA5A5]">
                <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-bold text-white">
                    {lang === 'mr' ? 'पेमेंट नाकारले / की लॉक झाली' : 'Payment Rejected / Key Locked'}
                  </p>
                  <p className="mt-0.5">{activeOrder.rejectionReason}</p>
                </div>
              </div>
            )}

            {/* Live QR Box */}
            <div className="bg-[#0D0D11] border border-white/12 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-5 flex flex-col items-center gap-2">
                <div className="bg-white rounded-xl p-2.5 w-44 sm:w-full max-w-[190px] aspect-square flex items-center justify-center shadow-md overflow-hidden">
                  {creatingQr ? (
                    <div className="flex flex-col items-center gap-2 text-zinc-700">
                      <Loader2 className="w-7 h-7 animate-spin text-[#DC2626]" />
                      <span className="text-[10px] font-mono font-bold">Creating Live QR...</span>
                    </div>
                  ) : isAutoQrListening && gatewayQrUrl ? (
                    <img
                      src={gatewayQrUrl}
                      alt={`Bank-Verified Auto-Unlock UPI QR for ₹${selectedPlan.price}`}
                      className="w-full h-full object-contain rounded-lg block"
                    />
                  ) : dynamicUpiQrUrl ? (
                    <img
                      src={dynamicUpiQrUrl}
                      alt={`Amount-locked UPI QR for ₹${selectedPlan.price}`}
                      className="w-full h-full object-contain rounded-lg block"
                    />
                  ) : (
                    <img
                      src={STUDIO_CONTACT.upiQrPath}
                      alt={`UPI QR Code for ${STUDIO_CONTACT.upiId}`}
                      className="w-full h-full object-contain rounded-lg block"
                    />
                  )}
                </div>

                <span className="font-mono text-[11px] font-bold text-[#FACC15] tabular-nums">
                  ₹{selectedPlan.price.toLocaleString('en-IN')} · {selectedPlan.shortLabel[lang]}
                </span>
              </div>

              <div className="sm:col-span-7 space-y-3">
                <div>
                  <p className="text-xs font-bold text-white">
                    {isAutoQrListening
                      ? lang === 'mr'
                        ? `QR स्कॅन करून ₹${selectedPlan.price} भरा — पेमेंट होताच ऑटो अनलॉक!`
                        : `Scan & Pay ₹${selectedPlan.price} — Auto-Unlocks Instantly!`
                      : lang === 'mr'
                        ? `QR स्कॅन करून ₹${selectedPlan.price} (${selectedPlan.shortLabel.mr}) पेमेंट करा`
                        : `Scan QR & Pay ₹${selectedPlan.price} (${selectedPlan.shortLabel.en})`}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                    {isAutoQrListening
                      ? lang === 'mr'
                        ? 'बँक-व्हेरिफाईड ऑटो QR सक्रिय आहे. GPay, PhonePe किंवा Paytm ने पेमेंट होताच 2-3 सेकंदात ओव्हरले आपोआप अनलॉक होईल.'
                        : 'Live bank-verified QR active. Pay via GPay, PhonePe or Paytm and this screen unlocks automatically in 2–3 seconds.'
                      : lang === 'mr'
                        ? `अचूक ₹${selectedPlan.price} रक्कम QR मध्ये सेट केली आहे. GPay, PhonePe किंवा Paytm ने स्कॅन करा.`
                        : `Exact ₹${selectedPlan.price} amount is pre-filled in this UPI QR for GPay, PhonePe & Paytm.`}
                  </p>
                </div>

                {isAutoQrListening ? (
                  <div className="bg-[#0D1A12] border border-[#4ADE80]/40 rounded-lg px-3 py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-[#4ADE80] font-semibold">
                      <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-ping shrink-0" />
                      <span>
                        {lang === 'mr'
                          ? 'पेमेंटची वाट पाहत आहे (ऑटो अनलॉक चालू)...'
                          : 'Listening for payment (Auto-Unlock ON)...'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleManualStatusCheck}
                      disabled={checkingStatus}
                      className="text-[11px] font-mono font-bold text-[#FACC15] hover:text-white shrink-0"
                    >
                      {checkingStatus ? '...' : 'Refresh'}
                    </button>
                  </div>
                ) : (
                  <>
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
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-lg transition-colors whitespace-nowrap tabular-nums"
                    >
                      <span>
                        {lang === 'mr'
                          ? `मोबाईल UPI अॅपने ₹${selectedPlan.price} भरा`
                          : `Pay ₹${selectedPlan.price} in UPI App`}
                      </span>
                    </a>
                  </>
                )}
              </div>
            </div>

            {error && <p className="text-xs text-[#F87171]">{error}</p>}

            {/* When Razorpay isn't configured yet, show clear honest verification steps (Zero Fake Fraud!) */}
            {!isAutoQrListening && (
              <>
                <div className="bg-[#0D1A12] border border-[#4ADE80]/30 rounded-xl p-3.5 space-y-2">
                  <p className="text-xs font-bold text-white">
                    {lang === 'mr'
                      ? `पेमेंट झाल्यावर स्क्रीनशॉट पाठवा (₹${selectedPlan.price} · ${selectedPlan.shortLabel.mr})`
                      : `After Paying ₹${selectedPlan.price} (${selectedPlan.shortLabel.en}), Verify & Unlock`}
                  </p>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {lang === 'mr'
                      ? 'खोट्या पेमेंटपासून सुरक्षेसाठी पेमेंट कन्फर्म झाल्यावरच अनलॉक होते. (ऑटो-अनलॉक गेटवेसाठी ओनर Secrets मध्ये Razorpay Keys जोडू शकतात.)'
                      : 'Anti-fraud verified unlock: instant automatic QR unlock activates once Razorpay keys are set in Secrets, or verify via WhatsApp / UTR below.'}
                  </p>
                  <a
                    href={whatsappPaymentHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-bold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg transition-colors whitespace-nowrap"
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>
                      {lang === 'mr'
                        ? `WhatsApp वर ₹${selectedPlan.price} स्क्रीनशॉट पाठवा`
                        : `Send ₹${selectedPlan.price} Screenshot on WhatsApp`}
                    </span>
                  </a>
                </div>

                {/* Direct Unlock Key Entry Box */}
                <form
                  onSubmit={handleVerifyUnlockKey}
                  noValidate
                  className="bg-[#16130B] border border-[#FACC15]/45 rounded-xl p-4 space-y-3"
                >
                  <p className="text-xs font-bold text-[#FACC15] flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>
                      {lang === 'mr'
                        ? 'Unlock Key मिळाली आहे? येथे टाका'
                        : 'Have an Unlock Key? Enter to Unlock Instantly'}
                    </span>
                  </p>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      aria-label="Enter Unlock Key"
                      value={unlockKeyInput}
                      onChange={(e) => setUnlockKeyInput(e.target.value.toUpperCase())}
                      placeholder="STAR-XXXX-XXXX-XXXX"
                      className="flex-1 min-w-0 px-3.5 py-2.5 text-sm font-mono font-bold uppercase tracking-wider bg-[#0D0D11] border border-white/15 rounded-lg text-[#FACC15] placeholder:text-zinc-500 focus:outline-none focus:border-[#FACC15]"
                    />
                    <button
                      type="submit"
                      disabled={verifyingKey}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <LockOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>
                        {verifyingKey
                          ? lang === 'mr'
                            ? 'तपासत आहे...'
                            : 'Checking...'
                          : lang === 'mr'
                            ? 'अनलॉक करा'
                            : 'Unlock Now'}
                      </span>
                    </button>
                  </div>

                  {keyError && <p className="text-xs text-[#F87171]">{keyError}</p>}
                </form>

                {/* Optional Collapsible Website UTR Proof Submission (Auto-unlocks live via SSE on approval) */}
                <div className="border-t border-white/10 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowUtrForm((v) => !v)}
                    className="w-full flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-200 py-1.5 transition-colors"
                  >
                    <span>
                      {lang === 'mr'
                        ? `किंवा येथे ₹${selectedPlan.price} चे 12 अंकी UTR व स्क्रीनशॉट सबमिट करा`
                        : `Or submit 12-digit UTR & ₹${selectedPlan.price} receipt here`}
                    </span>
                    {showUtrForm ? (
                      <ChevronUp className="w-4 h-4 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 shrink-0" />
                    )}
                  </button>

                  {showUtrForm && (
                    <form onSubmit={handleSubmitOrder} noValidate className="space-y-3 pt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={buyerName}
                          onChange={(e) => setBuyerName(e.target.value)}
                          placeholder={lang === 'mr' ? 'तुमचे नाव *' : 'Your Name *'}
                          className="w-full px-3 py-2 text-xs bg-[#18181D] border border-white/15 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FACC15]"
                        />
                        <input
                          type="tel"
                          value={buyerPhone}
                          onChange={(e) => setBuyerPhone(e.target.value)}
                          placeholder={lang === 'mr' ? 'मोबाईल नंबर *' : 'Mobile Number *'}
                          className="w-full px-3 py-2 text-xs font-mono bg-[#18181D] border border-white/15 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FACC15]"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={12}
                          value={utrRef}
                          onChange={(e) => setUtrRef(e.target.value.replace(/\D/g, '').slice(0, 12))}
                          placeholder={lang === 'mr' ? '12 अंकी UPI UTR नंबर *' : '12-Digit UPI UTR *'}
                          className="w-full px-3 py-2 text-xs font-mono bg-[#18181D] border border-white/15 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FACC15]"
                        />

                        <label className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-[#18181D] hover:bg-[#22222B] border border-dashed border-[#FACC15]/50 rounded-lg cursor-pointer text-zinc-200 truncate">
                          <Upload className="w-3.5 h-3.5 text-[#FACC15] shrink-0" aria-hidden="true" />
                          <span className="truncate">
                            {proofFileName ||
                              (lang === 'mr'
                                ? `₹${selectedPlan.price} स्क्रीनशॉट अपलोड *`
                                : `Upload ₹${selectedPlan.price} Receipt *`)}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleProofUpload}
                            className="sr-only"
                          />
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-60 rounded-lg transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>
                          {submitting
                            ? lang === 'mr'
                              ? 'सबमिट होत आहे...'
                              : 'Submitting...'
                            : lang === 'mr'
                              ? `₹${selectedPlan.price} (${selectedPlan.shortLabel.mr}) प्रूफ सबमिट करा`
                              : `Submit ₹${selectedPlan.price} (${selectedPlan.shortLabel.en}) Receipt`}
                        </span>
                      </button>
                    </form>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
