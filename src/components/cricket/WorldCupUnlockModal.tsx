import { FormEvent, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  LockOpen,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { STUDIO_CONTACT } from '../../data/content';
import {
  buildWorldCupUpiUri,
  createWorldCupUnlockExpiryIso,
  fetchOwnerUpiConfig,
  formatWorldCupExpiryDate,
  generateWorldCupOrderId,
  getLocalOwnerUpiConfig,
  OwnerUpiConfig,
  WORLDCUP_OFFER_PRICE_INR,
  WORLDCUP_ORIGINAL_PRICE_INR,
  WORLDCUP_UNLOCK_DURATION_DAYS,
} from '../../lib/worldCupUnlock';

export interface WorldCupUnlockModalProps {
  open: boolean;
  onClose: () => void;
  onUnlockSuccess: (payload: {
    expiresAt: string;
    utr: string;
    orderId: string;
  }) => void;
}

export function WorldCupUnlockModal({
  open,
  onClose,
  onUnlockSuccess,
}: WorldCupUnlockModalProps) {
  const [upiConfig, setUpiConfig] = useState<OwnerUpiConfig>(() => getLocalOwnerUpiConfig());
  const [orderId, setOrderId] = useState<string>(() => generateWorldCupOrderId());
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrLoading, setQrLoading] = useState<boolean>(true);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);

  const [utrInput, setUtrInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [unlockedExpiry, setUnlockedExpiry] = useState<string | null>(null);

  // Fresh order + latest owner UPI config every time modal opens
  useEffect(() => {
    if (!open) return;
    let active = true;
    setOrderId(generateWorldCupOrderId());
    setUtrInput('');
    setErrorMsg(null);
    setVerifying(false);
    setUnlockedExpiry(null);
    setCopiedUpi(false);

    void fetchOwnerUpiConfig().then((cfg) => {
      if (active) setUpiConfig(cfg);
    });

    return () => {
      active = false;
    };
  }, [open]);

  const upiUri = useMemo(
    () =>
      buildWorldCupUpiUri({
        upiId: upiConfig.upiId,
        payeeName: upiConfig.payeeName,
        amountInr: WORLDCUP_OFFER_PRICE_INR,
        orderId,
      }),
    [upiConfig.upiId, upiConfig.payeeName, orderId]
  );

  // Generate dynamic UPI QR Code immediately when modal opens or UPI config updates
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setQrLoading(true);

    QRCode.toDataURL(upiUri, {
      width: 260,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (!cancelled) {
          setQrDataUrl(url);
          setQrLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrDataUrl('');
          setQrLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, upiUri]);

  if (!open) return null;

  const handleCopyUpi = () => {
    const text = upiConfig.upiId;
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(text).then(() => {
        setCopiedUpi(true);
        window.setTimeout(() => setCopiedUpi(false), 1800);
      });
      return;
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedUpi(true);
      window.setTimeout(() => setCopiedUpi(false), 1800);
    } catch {
      // ignore
    }
  };

  const handleConfirmPayment = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanUtr = utrInput.replace(/\D/g, '');
    if (cleanUtr.length < 12) {
      setErrorMsg('Please enter the 12-digit UPI UTR / Transaction Reference Number after paying ₹99.');
      return;
    }

    setVerifying(true);
    window.setTimeout(() => {
      const expiresAt = createWorldCupUnlockExpiryIso();
      setVerifying(false);
      setUnlockedExpiry(expiresAt);
      onUnlockSuccess({
        expiresAt,
        utr: cleanUtr.slice(0, 16),
        orderId,
      });
    }, 650);
  };

  const savingsInr = WORLDCUP_ORIGINAL_PRICE_INR - WORLDCUP_OFFER_PRICE_INR;
  const whatsappProofUrl = `https://wa.me/${STUDIO_CONTACT.whatsappNumber}?text=${encodeURIComponent(
    `Hello ${STUDIO_CONTACT.brand}, I paid ₹${WORLDCUP_OFFER_PRICE_INR} for WorldCup Scoreboard (2 Days Unlock). Order ID: ${orderId}${
      utrInput.trim() ? `, UTR: ${utrInput.trim()}` : ''
    }.`
  )}`;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="worldcup-unlock-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white border-2 border-[#FF8C00] shadow-2xl overflow-hidden my-auto">
        {/* Top Broadcast Orange Header */}
        <div className="wo-header px-5 py-4 text-white flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-orange-100">
              <Sparkles className="w-3.5 h-3.5 text-[#FFE600]" aria-hidden="true" />
              <span>Premium Broadcast Theme</span>
            </div>
            <h3
              id="worldcup-unlock-modal-title"
              className="font-display font-black text-lg leading-tight text-white"
            >
              Unlock WorldCup Scoreboard
            </h3>
            <p className="text-xs text-orange-50 font-medium">
              Instant QR Pay · Valid for {WORLDCUP_UNLOCK_DURATION_DAYS} Days (48 Hours)
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
        {unlockedExpiry ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h4 className="font-display font-black text-xl text-slate-900">
                WorldCup Unlocked!
              </h4>
              <p className="text-xs text-slate-600">
                Payment confirmed (₹{WORLDCUP_OFFER_PRICE_INR}). Your WorldCup Broadcast
                Scoreboard is now active live on OBS &amp; vMix.
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-900 space-y-1">
              <div className="flex items-center justify-center gap-1.5 font-extrabold">
                <Clock className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                <span>2 Days Pass Active</span>
              </div>
              <p className="font-semibold text-emerald-700">
                Valid until: {formatWorldCupExpiryDate(unlockedExpiry)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl wo-btn-primary text-white font-display font-black text-sm uppercase tracking-wider"
            >
              Start Using WorldCup Theme
            </button>
          </div>
        ) : (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Price Strip: ₹149 strikethrough -> ₹99 */}
            <div className="rounded-xl bg-[#FFF8EE] border border-[#FF8C00]/35 px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#C25E00]">
                  Limited Offer · 2 Days Access
                </p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-base font-bold text-slate-400 line-through">
                    ₹{WORLDCUP_ORIGINAL_PRICE_INR}
                  </span>
                  <span className="font-display font-black text-2xl text-slate-900">
                    ₹{WORLDCUP_OFFER_PRICE_INR}
                  </span>
                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                    SAVE ₹{savingsInr}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FF8C00] text-white text-[11px] font-black uppercase">
                  <Clock className="w-3 h-3" aria-hidden="true" />2 Days
                </span>
              </div>
            </div>

            {/* Generated Dynamic UPI QR Code Card */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex flex-col items-center text-center space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-800">
                <QrCode className="w-4 h-4 text-[#FF8C00]" aria-hidden="true" />
                <span>Scan &amp; Pay ₹{WORLDCUP_OFFER_PRICE_INR} via UPI</span>
              </div>

              <div className="p-2.5 rounded-xl bg-white border-2 border-[#FF8C00]/40 shadow-sm">
                {qrLoading ? (
                  <div className="w-[200px] h-[200px] flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="w-7 h-7 animate-spin text-[#FF8C00]" aria-hidden="true" />
                    <span className="text-[11px] font-semibold">Generating QR Code...</span>
                  </div>
                ) : qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`Pay ₹${WORLDCUP_OFFER_PRICE_INR} UPI QR Code for ${upiConfig.payeeName}`}
                    className="w-[200px] h-[200px] block rounded-md"
                  />
                ) : (
                  <div className="w-[200px] h-[200px] flex items-center justify-center text-xs text-red-600 font-semibold p-3">
                    Unable to render QR. Use UPI ID below.
                  </div>
                )}
              </div>

              <div className="w-full space-y-1.5">
                <p className="text-[11px] font-bold text-slate-700">
                  Payee: <span className="text-slate-950">{upiConfig.payeeName}</span>
                </p>
                <div className="flex items-center justify-center gap-1.5">
                  <code className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs font-mono font-bold text-slate-800">
                    {upiConfig.upiId}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-orange-50 border border-slate-300 text-[11px] font-bold text-slate-700"
                  >
                    {copiedUpi ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" aria-hidden="true" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[10px] font-semibold text-slate-500">
                  GPay · PhonePe · Paytm · BHIM · Any UPI App · Order: {orderId}
                </p>
              </div>

              <a
                href={upiUri}
                className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Open UPI App Directly (Pay ₹{WORLDCUP_OFFER_PRICE_INR})</span>
              </a>
            </div>

            {/* Payment Done Confirmation Form */}
            <form onSubmit={handleConfirmPayment} className="space-y-3">
              <div>
                <label
                  htmlFor="worldcup-utr-input"
                  className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-700 mb-1"
                >
                  Enter 12-Digit UPI UTR / Ref No. (After Payment)
                </label>
                <input
                  id="worldcup-utr-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={16}
                  value={utrInput}
                  onChange={(e) => {
                    setUtrInput(e.target.value.replace(/[^0-9]/g, ''));
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="e.g. 432198765432"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#FF8C00] focus:border-[#FF8C00]"
                />
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold"
                >
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={verifying}
                className="w-full py-3 rounded-xl wo-btn-primary disabled:opacity-60 text-white font-display font-black text-sm uppercase tracking-wider inline-flex items-center justify-center gap-2 shadow-md"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Verifying Payment...</span>
                  </>
                ) : (
                  <>
                    <LockOpen className="w-4 h-4" aria-hidden="true" />
                    <span>Payment Done — Unlock for 2 Days</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                  Instant 48h Activation
                </span>
                <a
                  href={whatsappProofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline"
                >
                  <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  Send Receipt on WhatsApp
                </a>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
