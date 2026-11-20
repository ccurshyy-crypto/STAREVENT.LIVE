import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Lock,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import { Language, STUDIO_CONTACT } from '../data/content';
import { OVERLAY_PRODUCTS } from '../data/overlayCatalog';

interface AdminOrderRecord {
  orderId: string;
  sku: string;
  amount: number;
  originalPrice: number;
  buyerName: string;
  buyerPhone: string;
  utrRef: string;
  proofImage?: string;
  status: 'pending' | 'approved' | 'rejected';
  unlockCode?: string;
  rejectionReason?: string;
  createdAt: number;
  verifiedAt?: number;
}

interface AdminOrdersModalProps {
  lang: Language;
  open: boolean;
  onClose: () => void;
}

export function AdminOrdersModal({ lang, open, onClose }: AdminOrdersModalProps) {
  const [pin, setPin] = useState('');
  const [authenticatedPin, setAuthenticatedPin] = useState<string | null>(null);
  const [orders, setOrders] = useState<AdminOrderRecord[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewProof, setPreviewProof] = useState<string | null>(null);

  const fetchOrders = useCallback(async (activePin: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/orders', {
        headers: { 'x-admin-pin': activePin },
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        if (res.status === 401) {
          setAuthenticatedPin(null);
        }
        setError(data?.error || 'Invalid Owner PIN.');
        return;
      }
      setAuthenticatedPin(activePin);
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch {
      setError('Could not load orders from server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && authenticatedPin) {
      fetchOrders(authenticatedPin);
    }
  }, [open, authenticatedPin, fetchOrders]);

  if (!open) return null;

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('Please enter Owner PIN.');
      return;
    }
    fetchOrders(pin.trim());
  };

  const handleApprove = async (orderId: string) => {
    if (!authenticatedPin) return;
    setActionId(orderId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': authenticatedPin,
        },
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setError(data?.error || 'Approval failed.');
        return;
      }
      setOrders((prev) => prev.map((o) => (o.orderId === orderId ? data.order : o)));
    } catch {
      setError('Failed to approve order.');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (orderId: string) => {
    if (!authenticatedPin) return;
    setActionId(orderId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': authenticatedPin,
        },
        body: JSON.stringify({
          reason: '₹99 payment not received on crushyyphotography@oksbi for this UTR.',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setError(data?.error || 'Rejection failed.');
        return;
      }
      setOrders((prev) => prev.map((o) => (o.orderId === orderId ? data.order : o)));
    } catch {
      setError('Failed to reject order.');
    } finally {
      setActionId(null);
    }
  };

  const handleCopy = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1800);
    } catch {
      setCopiedId(null);
    }
  };

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const approvedCount = orders.filter((o) => o.status === 'approved').length;
  const rejectedCount = orders.filter((o) => o.status === 'rejected').length;
  const visibleOrders = orders.filter((o) => o.status === filter);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-verify-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl bg-[#121216] border border-white/15 rounded-2xl p-5 sm:p-7 space-y-5 my-auto max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close owner panel"
          className="absolute top-4 right-4 w-9 h-9 inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1 pr-10">
          <p className="text-xs font-mono font-semibold text-[#FACC15]">
            OWNER PAYMENT VERIFICATION · {STUDIO_CONTACT.upiId}
          </p>
          <h3 id="admin-verify-title" className="font-display text-xl sm:text-2xl font-bold text-white">
            {lang === 'mr' ? '₹99 UPI पेमेंट मंजुरी पॅनेल' : '₹99 UPI Payment Approval Console'}
          </h3>
          <p className="text-xs text-zinc-400">
            {lang === 'mr'
              ? 'तुमच्या GPay मध्ये ₹99 जमा झाल्याची खात्री करून Approve दाबा — ग्राहकाचा ओव्हरले लगेच अनलॉक होईल.'
              : 'Check your Google Pay app for ₹99 matching the 12-digit UTR below, then click Approve to unlock the buyer live.'}
          </p>
        </div>

        {!authenticatedPin ? (
          <form onSubmit={handleLogin} className="max-w-sm space-y-4 py-4">
            <div className="space-y-1.5">
              <label htmlFor="owner-admin-pin" className="block text-xs font-medium text-zinc-300">
                Owner Verification PIN
              </label>
              <input
                id="owner-admin-pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter Owner PIN"
                className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#18181D] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
              />
            </div>

            {error && <p className="text-xs text-[#F87171]">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-lg transition-colors"
            >
              <Lock className="w-4 h-4" aria-hidden="true" />
              <span>{loading ? 'Checking...' : 'Open Verification Panel'}</span>
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Filter bar + Refresh */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 bg-[#0D0D11] border border-white/10 rounded-xl">
                {(
                  [
                    { id: 'pending', label: `Pending (${pendingCount})` },
                    { id: 'approved', label: `Approved (${approvedCount})` },
                    { id: 'rejected', label: `Rejected (${rejectedCount})` },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFilter(t.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                      filter === t.id ? 'bg-[#DC2626] text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => fetchOrders(authenticatedPin)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:text-white border border-white/15 rounded-lg"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#FACC15] ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {error && <p className="text-xs text-[#F87171]">{error}</p>}

            {visibleOrders.length === 0 ? (
              <div className="bg-[#0D0D11] border border-white/10 rounded-xl p-8 text-center text-sm text-zinc-400">
                No {filter} ₹99 overlay payment requests right now.
              </div>
            ) : (
              <div className="space-y-3">
                {visibleOrders.map((ord) => {
                  const prod = OVERLAY_PRODUCTS.find((p) => p.sku === ord.sku);
                  const sendCodeWhatsapp = ord.unlockCode
                    ? `https://wa.me/91${ord.buyerPhone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(
                        `STAR EVENT LIVE: Your ₹99 payment for ${prod?.title.en || ord.sku} is verified! Order ID: ${ord.orderId}. Your permanent Unlock Code is: ${ord.unlockCode}`
                      )}`
                    : null;

                  return (
                    <div
                      key={ord.orderId}
                      className="bg-[#0D0D11] border border-white/12 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                            <span className="font-bold text-[#FACC15]">{ord.orderId}</span>
                            <span className="text-zinc-600">·</span>
                            <span className="text-white font-bold">₹{ord.amount}</span>
                            <span className="text-zinc-600">·</span>
                            <span className="text-zinc-400">
                              {new Date(ord.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-white">
                            {prod ? prod.title[lang] : ord.sku}
                          </p>
                          <p className="text-xs text-zinc-300">
                            {ord.buyerName} · <span className="font-mono">{ord.buyerPhone}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2 bg-[#17171E] border border-white/10 rounded-lg px-3 py-1.5">
                          <div>
                            <span className="block text-[10px] text-zinc-400">12-Digit UTR</span>
                            <span className="font-mono text-xs font-bold text-[#FACC15] tabular-nums">
                              {ord.utrRef}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(ord.orderId, ord.utrRef)}
                            aria-label="Copy UTR"
                            className="p-1 text-zinc-300 hover:text-white"
                          >
                            {copiedId === ord.orderId ? (
                              <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {ord.proofImage && (
                        <div className="flex items-center gap-3 pt-1">
                          <img
                            src={ord.proofImage}
                            alt="Uploaded UPI payment screenshot"
                            className="w-16 h-16 object-cover rounded-lg border border-white/15 cursor-pointer"
                            onClick={() => setPreviewProof(ord.proofImage || null)}
                          />
                          <button
                            type="button"
                            onClick={() => setPreviewProof(ord.proofImage || null)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FACC15] hover:text-white"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>View Full Payment Screenshot</span>
                          </button>
                        </div>
                      )}

                      {ord.status === 'pending' ? (
                        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            disabled={actionId === ord.orderId}
                            onClick={() => handleApprove(ord.orderId)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-black bg-[#4ADE80] hover:bg-[#22C55E] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
                          >
                            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                            <span>Confirm ₹99 Received & Unlock</span>
                          </button>

                          <button
                            type="button"
                            disabled={actionId === ord.orderId}
                            onClick={() => handleReject(ord.orderId)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#FCA5A5] hover:text-white border border-[#EF4444]/40 hover:bg-[#EF4444]/20 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
                          >
                            <XCircle className="w-4 h-4" aria-hidden="true" />
                            <span>Reject (Not Paid)</span>
                          </button>
                        </div>
                      ) : ord.status === 'approved' && ord.unlockCode ? (
                        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                          <div className="inline-flex items-center gap-2 text-xs">
                            <ShieldCheck className="w-4 h-4 text-[#4ADE80]" />
                            <span className="text-zinc-400">Unlock Code:</span>
                            <span className="font-mono font-bold text-[#FACC15]">
                              {ord.unlockCode}
                            </span>
                          </div>

                          {sendCodeWhatsapp && (
                            <a
                              href={sendCodeWhatsapp}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-lg whitespace-nowrap"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp Code to Buyer</span>
                            </a>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-[#F87171] pt-1 border-t border-white/10">
                          {ord.rejectionReason || 'Rejected'}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Fullscreen Proof Lightbox */}
        {previewProof && (
          <div
            onClick={() => setPreviewProof(null)}
            className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          >
            <img
              src={previewProof}
              alt="Full payment receipt screenshot"
              className="max-w-full max-h-[85vh] rounded-xl border border-white/20"
            />
          </div>
        )}
      </div>
    </div>
  );
}
