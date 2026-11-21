import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  KeyRound,
  LockOpen,
  MessageCircle,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { Language, STUDIO_CONTACT } from '../data/content';
import {
  OverlayProduct,
  OverlaySku,
  PendingOverlayOrder,
  VerifiedOverlayToken,
} from '../data/overlayCatalog';

interface OverlayCheckoutModalProps {
  lang: Language;
  product: OverlayProduct | null;
  existingPendingOrder?: PendingOverlayOrder | null;
  onClose: () => void;
  onPendingOrderChange: (order: PendingOverlayOrder | null) => void;
  onVerifiedUnlock: (tokens: VerifiedOverlayToken | VerifiedOverlayToken[]) => void;
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
  if (
    /^(\d)\1{11}$/.test(utr) ||
    fakePatterns.has(utr) ||
    new Set(utr.split('')).size < 4 ||
    /(\d)\1{6,}/.test(utr)
  ) {
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
  const [tab, setTab] = useState<'pay' | 'key'>('pay');
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

  useEffect(() => {
    if (!product) {
      setActiveOrder(null);
      setError(null);
      setKeyError(null);
      setShowUtrForm(false);
      return;
    }
    if (existingPendingOrder && existingPendingOrder.sku === product.sku) {
      setActiveOrder(existingPendingOrder);
      setTab('pay');
    } else {
      setActiveOrder(null);
    }
    setError(null);
    setKeyError(null);
  }, [product, existingPendingOrder]);

  // Real-time SSE listener if user submitted an optional UTR request
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

  const whatsappPaymentHref = `https://wa.me/${STUDIO_CONTACT.whatsappNumber}?text=${encodeURIComponent(
    `Hello Star Event Live! I have paid ₹${product.salePrice} on UPI (${STUDIO_CONTACT.upiId}) for ${product.title.en} (${product.sku}). Attaching my payment screenshot here — please send my Unlock Key.`
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

  const handleVerifyUnlockKey = async (e: FormEvent) => {
    e.preventDefault();
    const cleaned = unlockKeyInput.trim().toUpperCase();
    if (cleaned.length < 8) {
      setKeyError(
        lang === 'mr'
          ? 'कृपया पेमेंटनंतर मालकाकडून मिळालेली वैध Unlock Key प्रविष्ट करा (उदा. STAR-XXXX-XXXX-XXXX).'
          : 'Please enter the valid Unlock Key given by the owner after payment (e.g. STAR-XXXX-XXXX-XXXX).'
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
              : 'Invalid or expired Unlock Key. Please check the key from WhatsApp.')
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

    const utrError = validateUtrClient(cleanedUtr, lang);
    if (utrError) {
      setError(utrError);
      return;
    }

    if (!proofImage) {
      setError(
        lang === 'mr'
          ? 'खोट्या पेमेंटपासून सुरक्षेसाठी ₹99 UPI पेमेंटचा खरा स्क्रीनशॉट अपलोड करणे अनिवार्य आहे.'
          : 'Uploading your real ₹99 UPI payment screenshot is mandatory.'
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
              ? '₹99 पेमेंटनंतर मिळालेल्या UNLOCK KEY ने अनलॉक होते'
              : 'UNLOCKS WITH OWNER-ISSUED KEY AFTER ₹99 PAYMENT'}
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
                ? `₹${savings} सूट · 24 तास वैध`
                : `Save ₹${savings} · 24 Hours Pass`}
            </span>
          </div>
        </div>

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
            <span>{lang === 'mr' ? '1. ₹99 UPI पेमेंट' : '1. Pay ₹99 via QR'}</span>
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
                  ? 'पेमेंट झाल्यावर WhatsApp वर मिळालेली Unlock Key येथे टाका'
                  : 'Enter the Unlock Key you received after payment'}
              </p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {lang === 'mr'
                  ? '₹99 पेमेंट कन्फर्म झाल्यावर ओनर तुम्हाला एक युनिक Key (STAR-XXXX-XXXX-XXXX) देतील. ती येथे टाकताच ओव्हरले लगेच अनलॉक होईल.'
                  : 'After your ₹99 payment is confirmed, the owner sends you a unique Unlock Key (STAR-XXXX-XXXX-XXXX). Paste it below to unlock immediately.'}
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

            <div className="text-center pt-1">
              <a
                href={whatsappPaymentHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-[#4ADE80] transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {lang === 'mr'
                    ? 'अजून Key मिळाली नाही? WhatsApp वर पेमेंट स्क्रीनशॉट पाठवा'
                    : "Don't have a key yet? Send ₹99 screenshot on WhatsApp"}
                </span>
              </a>
            </div>
          </form>
        ) : activeOrder?.status === 'approved' ? (
          <div className="bg-[#0D1A12] border border-[#4ADE80]/40 rounded-xl p-5 space-y-4 text-center">
            <CheckCircle2 className="w-10 h-10 text-[#4ADE80] mx-auto" aria-hidden="true" />
            <div className="space-y-1">
              <h4 className="font-display text-lg font-bold text-white">
                {lang === 'mr'
                  ? 'ओव्हरले यशस्वीरित्या अनलॉक झाले!'
                  : 'Overlay Unlocked Successfully!'}
              </h4>
              <p className="text-xs text-zinc-300">
                {lang === 'mr'
                  ? 'आता तुम्ही OBS Browser Source URL, vMix URL आणि 1920×1080 PNG वापरू शकता.'
                  : 'Your OBS URL, vMix URL, and 1920×1080 PNG export are active now.'}
              </p>
            </div>
            {activeOrder.unlockCode && (
              <div className="bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 inline-block space-y-1">
                <p className="text-[11px] text-zinc-400">Your Unlock Key</p>
                <p className="font-mono text-base font-extrabold text-[#FACC15] tracking-wider">
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
        ) : activeOrder?.status === 'pending' ? (
          <div className="space-y-4">
            <div className="bg-[#17130B] border border-[#FACC15]/45 rounded-xl p-5 space-y-3">
              <div className="flex items-start gap-3">
                <Clock className="w-6 h-6 text-[#FACC15] shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1">
                  <h4 className="font-display text-base font-bold text-white">
                    {lang === 'mr'
                      ? 'पेमेंट तपासणी प्रतीक्षेत आहे — Key मिळताच अनलॉक करा'
                      : 'Payment Submitted — Waiting for Owner Key'}
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {lang === 'mr'
                      ? 'ओनर पेमेंट तपासून तुम्हाला Unlock Key देतील. Key मिळाल्यावर खालील बॉक्समध्ये टाका किंवा चेक स्टेटस वर क्लिक करा.'
                      : 'Once your ₹99 payment is verified, the owner will send your Unlock Key. Enter it below or tap Check Status.'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10 text-xs">
                <div>
                  <span className="text-zinc-400 block">Order ID</span>
                  <span className="font-mono font-bold text-white">{activeOrder.orderId}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block">Submitted UTR</span>
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
                <span>{lang === 'mr' ? 'WhatsApp वर Key मागा' : 'Get Key on WhatsApp'}</span>
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
              onClick={() => setTab('key')}
              className="w-full py-2.5 text-xs font-bold text-[#FACC15] border border-[#FACC15]/40 hover:bg-[#FACC15]/10 rounded-lg transition-colors"
            >
              {lang === 'mr' ? 'Key मिळाली आहे? येथे टाकून अनलॉक करा' : 'Already received Key? Enter Key to Unlock'}
            </button>
          </div>
        ) : (
          /* Main Step 1 -> Step 2 (WhatsApp) -> Step 3 (Enter Owner Key) Flow */
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

            {/* Step 1: Google Pay UPI QR Code Box */}
            <div className="bg-[#0D0D11] border border-white/12 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-5 flex justify-center">
                <div className="bg-white rounded-xl p-2 w-44 sm:w-full max-w-[180px] shadow-md">
                  <img
                    src={STUDIO_CONTACT.upiQrPath}
                    alt={`Google Pay UPI QR Code for ${STUDIO_CONTACT.upiId}`}
                    className="w-full h-auto rounded-lg block object-contain"
                  />
                </div>
              </div>

              <div className="sm:col-span-7 space-y-3">
                <div>
                  <p className="text-xs font-bold text-white">
                    {lang === 'mr'
                      ? 'पायरी 1 · QR स्कॅन करून ₹99 पेमेंट करा'
                      : 'Step 1 · Scan QR & Pay ₹99 via UPI'}
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

            {/* Step 2: Send Payment Screenshot on WhatsApp to Receive Unlock Key */}
            <div className="bg-[#0D1A12] border border-[#4ADE80]/35 rounded-xl p-4 space-y-2.5">
              <p className="text-xs font-bold text-white">
                {lang === 'mr'
                  ? 'पायरी 2 · पेमेंट स्क्रीनशॉट WhatsApp करा व तुमची Unlock Key मिळवा'
                  : 'Step 2 · Send Payment Screenshot on WhatsApp to Get Your Unlock Key'}
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
                    ? 'WhatsApp वर स्क्रीनशॉट पाठवा (Unlock Key घ्या)'
                    : 'Send Payment Screenshot on WhatsApp'}
                </span>
              </a>
            </div>

            {/* Step 3: Direct Unlock Key Entry Box right inside the modal! */}
            <form
              onSubmit={handleVerifyUnlockKey}
              noValidate
              className="bg-[#16130B] border border-[#FACC15]/45 rounded-xl p-4 space-y-3"
            >
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-[#FACC15] flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    {lang === 'mr'
                      ? 'पायरी 3 · पेमेंटनंतर मिळालेली Unlock Key टाका'
                      : 'Step 3 · Enter Your Unlock Key to Unlock'}
                  </span>
                </p>
                <p className="text-[11px] text-zinc-400">
                  {lang === 'mr'
                    ? 'पेमेंट कन्फर्म झाल्यावर मिळालेली Key टाकताच ओव्हरले लगेच अनलॉक होईल.'
                    : 'Paste the Unlock Key received after payment — unlocks instantly.'}
                </p>
              </div>

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

            {/* Optional Collapsible Website UTR Proof Submission */}
            <div className="border-t border-white/10 pt-2">
              <button
                type="button"
                onClick={() => setShowUtrForm((v) => !v)}
                className="w-full flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-200 py-1.5 transition-colors"
              >
                <span>
                  {lang === 'mr'
                    ? 'किंवा येथे 12 अंकी UTR व स्क्रीनशॉट सबमिट करा (पर्यायी)'
                    : 'Or submit 12-digit UTR & receipt directly here (Optional)'}
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
                          (lang === 'mr' ? '₹99 स्क्रीनशॉट अपलोड *' : 'Upload Receipt *')}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProofUpload}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  {error && <p className="text-xs text-[#F87171]">{error}</p>}

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
                          ? 'UTR प्रूफ सबमिट करा'
                          : 'Submit UTR Receipt'}
                    </span>
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
