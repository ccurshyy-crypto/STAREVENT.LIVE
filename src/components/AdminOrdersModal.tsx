import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  Ban,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  KeyRound,
  Lock,
  LogOut,
  MessageCircle,
  PlusCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import { Language, STUDIO_CONTACT } from '../data/content';
import { formatRemainingTime, OVERLAY_PRODUCTS } from '../data/overlayCatalog';

interface AdminOrderRecord {
  orderId: string;
  sku: string;
  amount: number;
  originalPrice: number;
  buyerName: string;
  buyerPhone: string;
  utrRef: string;
  proofImage?: string;
  proofHash?: string;
  paymentMethod?: 'cashfree_qr' | 'upi_manual' | 'owner_key';
  gatewayEnv?: 'sandbox' | 'production';
  planId?: '1day' | '1week' | '1month';
  durationHours?: number;
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  unlockCode?: string;
  rejectionReason?: string;
  createdAt: number;
  verifiedAt?: number;
  expiresAt?: number;
  isExpired?: boolean;
}

interface AdminOrdersModalProps {
  lang: Language;
  open: boolean;
  onClose: () => void;
}

const DURATION_OPTIONS = [
  { planId: '1day', hours: 24, label: { mr: '1 दिवस — ₹49 (1 Day)', en: '1 Day — ₹49' } },
  { planId: '1week', hours: 168, label: { mr: '1 आठवडा — ₹149 (1 Week)', en: '1 Week — ₹149' } },
  { planId: '1month', hours: 720, label: { mr: '1 महिना — ₹1,499 (1 Month)', en: '1 Month — ₹1,499' } },
];

export function AdminOrdersModal({ lang, open, onClose }: AdminOrdersModalProps) {
  const [authSource, setAuthSource] = useState<'loading' | 'unclaimed' | 'claimed' | 'env'>('loading');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  // Bearer session token is kept strictly in React memory (never persisted to localStorage)
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [orders, setOrders] = useState<AdminOrderRecord[]>([]);
  const [filter, setFilter] = useState<'approved' | 'pending' | 'rejected'>('approved');
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmLast4ByOrder, setConfirmLast4ByOrder] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewProof, setPreviewProof] = useState<string | null>(null);

  // Direct Owner Key Generator state
  const [genSku, setGenSku] = useState<string>('all');
  const [genHours, setGenHours] = useState<number>(24);
  const [genName, setGenName] = useState('');
  const [genPhone, setGenPhone] = useState('');
  const [generatingKey, setGeneratingKey] = useState(false);
  const [lastGeneratedOrder, setLastGeneratedOrder] = useState<AdminOrderRecord | null>(null);

  const checkAuthStatus = useCallback(async () => {
    setAuthSource('loading');
    setError(null);
    try {
      const res = await fetch('/api/admin/auth-status');
      const data = await res.json();
      if (res.ok && data?.ok) {
        setAuthSource(
          data.source === 'env' ? 'env' : data.source === 'claimed' ? 'claimed' : 'unclaimed'
        );
      } else {
        setAuthSource('claimed');
      }
    } catch {
      setError('Could not connect to verification server.');
      setAuthSource('claimed');
    }
  }, []);

  const fetchOrders = useCallback(async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        if (res.status === 401) {
          setSessionToken(null);
        }
        setError(data?.error || 'Owner session invalid.');
        return;
      }
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch {
      setError('Could not load orders from server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (sessionToken) {
      fetchOrders(sessionToken);
    } else {
      checkAuthStatus();
    }
  }, [open, sessionToken, fetchOrders, checkAuthStatus]);

  if (!open) return null;

  const getSkuLabel = (sku: string) => {
    if (sku === 'all') {
      return lang === 'mr' ? '★ सर्व ओव्हरले (All Overlays Master Key)' : '★ All Overlays (Master Key)';
    }
    const prod = OVERLAY_PRODUCTS.find((p) => p.sku === sku);
    return prod ? prod.title[lang] : sku;
  };

  const buildWhatsappKeyLink = (ord: AdminOrderRecord) => {
    if (!ord.unlockCode) return null;
    const digits = (ord.buyerPhone || '').replace(/\D/g, '').slice(-10);
    const base = digits.length === 10 ? `https://wa.me/91${digits}` : 'https://wa.me/';
    const prodName = ord.sku === 'all' ? 'All Overlays' : OVERLAY_PRODUCTS.find((p) => p.sku === ord.sku)?.title.en || ord.sku;
    const msg = `STAR EVENT LIVE — Payment Received!\nOverlay: ${prodName}\nYour Unlock Key: ${ord.unlockCode}\n\nOpen Overlays -> Enter Unlock Key -> Paste this key to unlock instantly.`;
    return `${base}?text=${encodeURIComponent(msg)}`;
  };

  const handleFirstRunSetup = async (e: FormEvent) => {
    e.preventDefault();
    const pwd = passwordInput.trim();
    if (pwd.length < 6) {
      setError('Choose a strong owner password with at least 6 characters.');
      return;
    }
    if (pwd !== confirmPasswordInput.trim()) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data?.token) {
        setError(data?.error || 'Could not set owner password.');
        return;
      }
      setPasswordInput('');
      setConfirmPasswordInput('');
      setAuthSource('claimed');
      setSessionToken(data.token);
    } catch {
      setError('Network error during owner setup.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setError('Please enter your Owner Password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data?.token) {
        setError(data?.error || 'Incorrect Owner Password.');
        return;
      }
      setPasswordInput('');
      setSessionToken(data.token);
    } catch {
      setError('Could not verify owner login.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (sessionToken) {
      fetch('/api/admin/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
      }).catch(() => {});
    }
    setSessionToken(null);
    setOrders([]);
    setLastGeneratedOrder(null);
  };

  const handleGenerateKey = async (e: FormEvent) => {
    e.preventDefault();
    if (!sessionToken) return;
    setGeneratingKey(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/keys/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          sku: genSku,
          durationHours: genHours,
          buyerName: genName.trim() || 'Paid Customer',
          buyerPhone: genPhone.replace(/\D/g, '').slice(0, 15),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data?.order) {
        if (res.status === 401) setSessionToken(null);
        setError(data?.error || 'Could not generate unlock key.');
        return;
      }
      const created = data.order as AdminOrderRecord;
      setLastGeneratedOrder(created);
      setOrders((prev) => [created, ...prev]);
      setGenName('');
      setGenPhone('');
      setFilter('approved');
    } catch {
      setError('Network error while generating unlock key.');
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleApprove = async (ord: AdminOrderRecord) => {
    if (!sessionToken) return;
    const typedLast4 = (confirmLast4ByOrder[ord.orderId] || '').replace(/\D/g, '').trim();
    if (ord.utrRef.length === 12 && typedLast4.length !== 4) {
      setError(
        lang === 'mr'
          ? 'मंजूर करण्यापूर्वी तुमच्या Google Pay / बँक अॅपमधील UTR चे शेवटचे 4 अंक टाका.'
          : 'Confirm the last 4 digits of the verified UTR from your GPay/Bank app first.'
      );
      return;
    }

    setActionId(ord.orderId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(ord.orderId)}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ confirmUtrLast4: typedLast4 }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        if (res.status === 401) setSessionToken(null);
        setError(data?.error || 'Approval failed.');
        return;
      }
      setOrders((prev) => prev.map((o) => (o.orderId === ord.orderId ? data.order : o)));
      setLastGeneratedOrder(data.order);
      setConfirmLast4ByOrder((prev) => {
        const next = { ...prev };
        delete next[ord.orderId];
        return next;
      });
    } catch {
      setError('Failed to approve order.');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (orderId: string) => {
    if (!sessionToken) return;
    setActionId(orderId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          reason:
            'Real UPI payment not received on crushyyphotography@oksbi for this UTR. UTR blocked.',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        if (res.status === 401) setSessionToken(null);
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

  const handleRevoke = async (orderId: string) => {
    if (!sessionToken) return;
    setActionId(orderId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          reason: 'Unlock Key revoked & locked by owner.',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        if (res.status === 401) setSessionToken(null);
        setError(data?.error || 'Revoke failed.');
        return;
      }
      setOrders((prev) => prev.map((o) => (o.orderId === orderId ? data.order : o)));
      if (lastGeneratedOrder?.orderId === orderId) {
        setLastGeneratedOrder(null);
      }
    } catch {
      setError('Failed to revoke key.');
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
  const rejectedCount = orders.filter((o) => o.status === 'rejected' || o.status === 'revoked').length;
  const visibleOrders = orders.filter((o) =>
    filter === 'rejected'
      ? o.status === 'rejected' || o.status === 'revoked'
      : o.status === filter
  );

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
            OWNER UNLOCK KEY CONSOLE · {STUDIO_CONTACT.upiId}
          </p>
          <h3 id="admin-verify-title" className="font-display text-xl sm:text-2xl font-bold text-white">
            {lang === 'mr'
              ? 'ओनर की जनरेटर व पेमेंट पॅनेल (₹49 / ₹149 / ₹1,499)'
              : 'Owner Unlock Key & Payment Console (₹49 / ₹149 / ₹1,499)'}
          </h3>
          <p className="text-xs text-zinc-400">
            {lang === 'mr'
              ? 'तुमच्या Google Pay मध्ये पेमेंट आल्यावर 1 दिवस (₹49), 1 आठवडा (₹149) किंवा 1 महिना (₹1,499) साठी Unlock Key तयार करा किंवा ऑटो-QR ऑर्डर्स पहा.'
              : 'Track automatic Cashfree QR unlocks or generate verified 1-Day (₹49), 1-Week (₹149), or 1-Month (₹1,499) Unlock Keys in 1 click.'}
          </p>
        </div>

        {!sessionToken ? (
          authSource === 'loading' ? (
            <div className="py-8 text-sm text-zinc-400">Checking owner security status...</div>
          ) : authSource === 'unclaimed' ? (
            <form onSubmit={handleFirstRunSetup} className="max-w-md space-y-4 py-3">
              <div className="bg-[#18120B] border border-[#FACC15]/40 rounded-xl p-3.5 text-xs text-zinc-300 space-y-1">
                <p className="font-bold text-[#FACC15]">
                  {lang === 'mr' ? 'प्रथमच ओनर पासवर्ड सेट करा' : 'One-Time Owner Password Setup'}
                </p>
                <p>
                  {lang === 'mr'
                    ? 'फक्त तुम्हालाच Unlock Key तयार करता यावी म्हणून तुमचा स्वतःचा सुरक्षित पासवर्ड सेट करा (किमान 6 अक्षरे).'
                    : 'Set your private owner password (min 6 characters) so only you can generate Unlock Keys after real payments.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="owner-setup-password" className="block text-xs font-medium text-zinc-300">
                  New Owner Password (min 6 chars)
                </label>
                <input
                  id="owner-setup-password"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter strong private password"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#18181D] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="owner-setup-confirm" className="block text-xs font-medium text-zinc-300">
                  Confirm Owner Password
                </label>
                <input
                  id="owner-setup-confirm"
                  type="password"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#18181D] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                />
              </div>

              {error && <p className="text-xs text-[#F87171]">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-lg transition-colors"
              >
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                <span>{loading ? 'Securing...' : 'Save Owner Password & Open'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="max-w-sm space-y-4 py-4">
              <div className="space-y-1.5">
                <label htmlFor="owner-admin-pin" className="block text-xs font-medium text-zinc-300">
                  Owner Password
                </label>
                <input
                  id="owner-admin-pin"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter Owner Password"
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
                <span>{loading ? 'Verifying...' : 'Sign In to Key Panel'}</span>
              </button>
            </form>
          )
        ) : (
          <div className="space-y-5">
            {/* 1-CLICK DIRECT UNLOCK KEY GENERATOR */}
            <form
              onSubmit={handleGenerateKey}
              className="bg-[#0D1117] border border-[#FACC15]/40 rounded-2xl p-4 sm:p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#FACC15]" aria-hidden="true" />
                  <span>
                    {lang === 'mr'
                      ? 'पेमेंट मिळाल्यावर नवीन Unlock Key तयार करा'
                      : 'Generate New Unlock Key (After Payment Received)'}
                  </span>
                </p>
                <span className="font-mono text-[11px] text-[#4ADE80]">SERVER-VERIFIED KEY</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="gen-key-sku" className="block text-xs text-zinc-400">
                    {lang === 'mr' ? 'कोणता ओव्हरले अनलॉक करायचा?' : 'Overlay to Unlock'}
                  </label>
                  <select
                    id="gen-key-sku"
                    value={genSku}
                    onChange={(e) => setGenSku(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-[#161C24] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                  >
                    <option value="all">
                      {lang === 'mr'
                        ? '★ सर्व ओव्हरले (All Overlays Master Key)'
                        : '★ All Overlays (Master Key)'}
                    </option>
                    {OVERLAY_PRODUCTS.filter((p) => !p.isFreeDemo).map((p) => (
                      <option key={p.sku} value={p.sku}>
                        {p.title[lang]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="gen-key-duration" className="block text-xs text-zinc-400">
                    {lang === 'mr' ? 'की वैधता (Validity)' : 'Key Validity'}
                  </label>
                  <select
                    id="gen-key-duration"
                    value={genHours}
                    onChange={(e) => setGenHours(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-semibold bg-[#161C24] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                  >
                    {DURATION_OPTIONS.map((opt) => (
                      <option key={opt.hours} value={opt.hours}>
                        {opt.label[lang]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="gen-key-name" className="block text-xs text-zinc-400">
                    {lang === 'mr' ? 'ग्राहकाचे नाव (ऐच्छिक)' : 'Customer Name (Optional)'}
                  </label>
                  <input
                    id="gen-key-name"
                    type="text"
                    value={genName}
                    onChange={(e) => setGenName(e.target.value)}
                    placeholder={lang === 'mr' ? 'उदा. रोहित पाटील' : 'e.g. Rohit Patil'}
                    className="w-full px-3 py-2 text-xs bg-[#161C24] border border-white/15 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FACC15]"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="gen-key-phone" className="block text-xs text-zinc-400">
                    {lang === 'mr' ? 'WhatsApp नंबर (ऐच्छिक — थेट पाठवण्यासाठी)' : 'WhatsApp Number (Optional)'}
                  </label>
                  <input
                    id="gen-key-phone"
                    type="tel"
                    value={genPhone}
                    onChange={(e) => setGenPhone(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    placeholder="9890XXXXXX"
                    className="w-full px-3 py-2 text-xs font-mono bg-[#161C24] border border-white/15 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FACC15]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={generatingKey}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
              >
                <PlusCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  {generatingKey
                    ? lang === 'mr'
                      ? 'की तयार होत आहे...'
                      : 'Generating Key...'
                    : lang === 'mr'
                      ? 'नवीन Unlock Key तयार करा'
                      : 'Generate Unlock Key'}
                </span>
              </button>

              {/* Newly Generated Key Highlight Box */}
              {lastGeneratedOrder?.unlockCode && (
                <div className="bg-[#0D1C12] border border-[#4ADE80]/50 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-semibold text-[#4ADE80]">
                        {lang === 'mr'
                          ? 'नवीन Unlock Key तयार झाली — ही Key ग्राहकाला पाठवा:'
                          : 'New Unlock Key Ready — Share this Key with the customer:'}
                      </p>
                      <p className="font-mono text-lg sm:text-2xl font-black text-[#FACC15] tracking-wider mt-1 select-all">
                        {lastGeneratedOrder.unlockCode}
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {getSkuLabel(lastGeneratedOrder.sku)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy('latest-key', lastGeneratedOrder.unlockCode!)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-lg transition-colors whitespace-nowrap"
                      >
                        {copiedId === 'latest-key' ? (
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>{copiedId === 'latest-key' ? 'Key Copied!' : 'Copy Key'}</span>
                      </button>

                      {buildWhatsappKeyLink(lastGeneratedOrder) && (
                        <a
                          href={buildWhatsappKeyLink(lastGeneratedOrder)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg transition-colors whitespace-nowrap"
                        >
                          <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{lang === 'mr' ? 'WhatsApp वर पाठवा' : 'Send on WhatsApp'}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </form>

            {/* Filter bar + Refresh + Sign Out */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 bg-[#0D0D11] border border-white/10 rounded-xl">
                {(
                  [
                    { id: 'approved', label: `Active Keys (${approvedCount})` },
                    { id: 'pending', label: `Pending UTR (${pendingCount})` },
                    { id: 'rejected', label: `Revoked / Blocked (${rejectedCount})` },
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

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchOrders(sessionToken)}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:text-white border border-white/15 rounded-lg whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#FACC15] ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white border border-white/15 rounded-lg whitespace-nowrap"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Lock Panel</span>
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-[#F87171]">{error}</p>}

            {visibleOrders.length === 0 ? (
              <div className="bg-[#0D0D11] border border-white/10 rounded-xl p-8 text-center text-sm text-zinc-400">
                {filter === 'approved'
                  ? lang === 'mr'
                    ? 'अद्याप कोणतीही Unlock Key तयार केलेली नाही. वरून नवीन Key तयार करा.'
                    : 'No issued Unlock Keys yet. Generate one above after receiving payment.'
                  : `No ${filter} requests right now.`}
              </div>
            ) : (
              <div className="space-y-3">
                {visibleOrders.map((ord) => {
                  const expired = Boolean(
                    ord.isExpired || (ord.expiresAt && ord.expiresAt <= Date.now())
                  );
                  const sendCodeWhatsapp = buildWhatsappKeyLink(ord);

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
                          <p className="text-sm font-bold text-white">{getSkuLabel(ord.sku)}</p>
                          <p className="text-xs text-zinc-300">
                            {ord.buyerName}
                            {ord.buyerPhone ? (
                              <>
                                {' '}
                                · <span className="font-mono">{ord.buyerPhone}</span>
                              </>
                            ) : null}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 bg-[#17171E] border border-white/10 rounded-lg px-3 py-1.5">
                          <div>
                            <span className="block text-[10px] text-zinc-400">
                              {ord.paymentMethod === 'owner_key' ? 'Owner Issued' : '12-Digit UTR'}
                            </span>
                            <span className="font-mono text-xs font-bold text-[#FACC15] tabular-nums">
                              {ord.utrRef}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(ord.orderId, ord.unlockCode || ord.utrRef)}
                            aria-label="Copy"
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

                      {ord.proofImage ? (
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <img
                            src={ord.proofImage}
                            alt="Uploaded UPI payment screenshot"
                            className="w-16 h-16 object-cover rounded-lg border border-white/15 cursor-pointer"
                            onClick={() => setPreviewProof(ord.proofImage || null)}
                          />
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => setPreviewProof(ord.proofImage || null)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FACC15] hover:text-white"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Inspect Full Payment Screenshot</span>
                            </button>
                            <p className="text-[11px] font-mono text-[#4ADE80]">
                              Unique Receipt Hash Verified
                            </p>
                          </div>
                        </div>
                      ) : (
                        ord.paymentMethod === 'upi_manual' && (
                          <p className="text-xs text-[#F87171] flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>No screenshot attached — verify carefully in bank app!</span>
                          </p>
                        )
                      )}

                      {ord.status === 'pending' ? (
                        <div className="pt-3 border-t border-white/10 space-y-2.5">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={4}
                              aria-label="Type last 4 digits of UTR from your GPay app"
                              value={confirmLast4ByOrder[ord.orderId] || ''}
                              onChange={(e) =>
                                setConfirmLast4ByOrder((prev) => ({
                                  ...prev,
                                  [ord.orderId]: e.target.value.replace(/\D/g, '').slice(0, 4),
                                }))
                              }
                              placeholder="Last 4 digits from GPay"
                              className="w-44 px-3 py-2 text-xs font-mono bg-[#18181D] border border-[#FACC15]/45 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FACC15] tabular-nums"
                            />

                            <button
                              type="button"
                              disabled={actionId === ord.orderId}
                              onClick={() => handleApprove(ord)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-black bg-[#4ADE80] hover:bg-[#22C55E] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
                            >
                              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                              <span>Confirm ₹{ord.amount} & Unlock</span>
                            </button>

                            <button
                              type="button"
                              disabled={actionId === ord.orderId}
                              onClick={() => handleReject(ord.orderId)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#FCA5A5] hover:text-white border border-[#EF4444]/40 hover:bg-[#EF4444]/20 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
                            >
                              <XCircle className="w-4 h-4" aria-hidden="true" />
                              <span>Reject & Block UTR</span>
                            </button>
                          </div>
                        </div>
                      ) : ord.status === 'approved' && ord.unlockCode ? (
                        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <ShieldCheck
                              className={`w-4 h-4 ${expired ? 'text-[#F87171]' : 'text-[#4ADE80]'}`}
                            />
                            <span className="text-zinc-400">Key:</span>
                            <span className="font-mono font-bold text-[#FACC15] select-all">
                              {ord.unlockCode}
                            </span>
                            <span className="text-zinc-600">·</span>
                            {expired ? (
                              <span className="font-mono font-bold text-[#F87171]">
                                EXPIRED (AUTO-LOCKED)
                              </span>
                            ) : ord.expiresAt ? (
                              <span className="font-mono font-semibold text-[#4ADE80] tabular-nums">
                                ACTIVE · {formatRemainingTime(ord.expiresAt)} LEFT
                              </span>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopy(`key-${ord.orderId}`, ord.unlockCode!)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 hover:text-white border border-white/15 rounded-lg whitespace-nowrap"
                            >
                              {copiedId === `key-${ord.orderId}` ? (
                                <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                              <span>{copiedId === `key-${ord.orderId}` ? 'Copied' : 'Copy Key'}</span>
                            </button>

                            {!expired && (
                              <button
                                type="button"
                                disabled={actionId === ord.orderId}
                                onClick={() => handleRevoke(ord.orderId)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#FCA5A5] hover:text-white border border-[#EF4444]/40 hover:bg-[#EF4444]/20 rounded-lg whitespace-nowrap"
                              >
                                <Ban className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Revoke & Lock</span>
                              </button>
                            )}

                            {sendCodeWhatsapp && (
                              <a
                                href={sendCodeWhatsapp}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg whitespace-nowrap"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>WhatsApp Key</span>
                              </a>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-[#F87171] pt-1 border-t border-white/10">
                          {ord.status === 'revoked' ? 'REVOKED · ' : 'BLOCKED · '}
                          {ord.rejectionReason || 'Rejected / Fraud Blocked'}
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
