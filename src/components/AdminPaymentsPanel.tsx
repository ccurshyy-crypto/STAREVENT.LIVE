import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  History,
  Lock,
  LockOpen,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  formatUnlockTimestamp,
  PAID_THEME_CATALOG,
  type PaidThemeId,
} from '../lib/worldCupUnlock';

interface AdminPaymentRow {
  order_id: string;
  customer_id: string;
  customer_email: string;
  customer_name: string;
  product_code?: string;
  product_name: string;
  expected_amount: number;
  currency: string;
  cf_order_id: string | null;
  cf_payment_id: string | null;
  payment_status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
  cashfree_raw_status: string | null;
  unlock_status: 'LOCKED' | 'UNLOCKED';
  verified_at: string | null;
  created_at: string;
}

interface AdminUnlockRow {
  customer_id: string;
  product_code?: string;
  unlock_status: 'LOCKED' | 'UNLOCKED';
  grant_source: 'cashfree' | 'admin_manual';
  order_id: string | null;
  cf_payment_id: string | null;
  unlocked_at: string;
  expires_at: string | null;
  granted_by: string | null;
  grant_reason: string | null;
  updated_at: string;
}

interface AdminAuditLogRow {
  id: string;
  actor: string;
  action: 'MANUAL_GRANT' | 'MANUAL_REVOKE';
  customer_id: string;
  reason: string;
  ip_address: string;
  created_at: string;
}

interface AdminPaymentsPanelProps {
  adminToken: string;
  onLockAdmin: () => void;
}

export function AdminPaymentsPanel({ adminToken, onLockAdmin }: AdminPaymentsPanelProps) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'FAILED'>('ALL');
  const [loading, setLoading] = useState(false);
  const [cashfreeConfigured, setCashfreeConfigured] = useState(false);
  const [payments, setPayments] = useState<AdminPaymentRow[]>([]);
  const [unlocks, setUnlocks] = useState<AdminUnlockRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Manual Grant Form (Admin-only with mandatory audit reason)
  const [grantCustomerId, setGrantCustomerId] = useState('');
  const [grantThemeId, setGrantThemeId] = useState<PaidThemeId>('worldcup');
  const [grantReason, setGrantReason] = useState('');
  const [grantDurationDays, setGrantDurationDays] = useState('');
  const [granting, setGranting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/admin/payments/worldcup?status=${encodeURIComponent(statusFilter)}`,
        {
          cache: 'no-store',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );
      if (res.status === 401) {
        onLockAdmin();
        return;
      }
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        cashfreeConfigured?: boolean;
        payments?: AdminPaymentRow[];
        unlocks?: AdminUnlockRow[];
        auditLogs?: AdminAuditLogRow[];
        error?: string;
      } | null;
      if (!res.ok || !json?.ok) {
        setErrorMsg(json?.error || 'Could not load Cashfree payment records.');
        return;
      }
      setCashfreeConfigured(Boolean(json.cashfreeConfigured));
      setPayments(Array.isArray(json.payments) ? json.payments : []);
      setUnlocks(Array.isArray(json.unlocks) ? json.unlocks : []);
      setAuditLogs(Array.isArray(json.auditLogs) ? json.auditLogs : []);
    } catch {
      setErrorMsg('Network error loading payment records.');
    } finally {
      setLoading(false);
    }
  }, [adminToken, onLockAdmin, statusFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleManualGrant = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedbackMsg(null);
    setGranting(true);
    try {
      const daysNum = grantDurationDays.trim() ? Number(grantDurationDays.trim()) : undefined;
      const selectedProduct = PAID_THEME_CATALOG[grantThemeId];
      const res = await fetch('/api/admin/payments/worldcup/manual-grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          customerId: grantCustomerId.trim(),
          themeId: grantThemeId,
          reason: grantReason.trim(),
          durationDays: Number.isFinite(daysNum) && (daysNum as number) > 0 ? daysNum : undefined,
        }),
      });
      if (res.status === 401) {
        onLockAdmin();
        return;
      }
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !json?.ok) {
        setErrorMsg(json?.error || 'Failed to grant manual access.');
        return;
      }
      setFeedbackMsg(
        `Manual ${selectedProduct.productName} unlock granted to ${grantCustomerId.trim().toUpperCase()} (audit logged).`
      );
      setGrantCustomerId('');
      setGrantReason('');
      setGrantDurationDays('');
      await loadData();
    } catch {
      setErrorMsg('Network error while granting manual access.');
    } finally {
      setGranting(false);
    }
  };

  const handleRevokeUnlock = async (customerId: string, productCode?: string) => {
    setErrorMsg(null);
    setFeedbackMsg(null);
    const themeId: PaidThemeId =
      productCode === 'lightning_pro_scoreboard' ? 'lightning-pro' : 'worldcup';
    const product = PAID_THEME_CATALOG[themeId];
    try {
      const res = await fetch('/api/admin/payments/worldcup/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          customerId,
          themeId,
          reason: `Admin revoked ${product.productName} unlock for ${customerId}`,
        }),
      });
      if (res.status === 401) {
        onLockAdmin();
        return;
      }
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) {
        setErrorMsg(json?.error || 'Failed to revoke unlock.');
        return;
      }
      setFeedbackMsg(`Revoked ${product.productName} access for ${customerId} (audit logged).`);
      await loadData();
    } catch {
      setErrorMsg('Network error while revoking access.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className="rounded-2xl border border-[#FFE600]/25 bg-black/45 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFE600]/15 border border-[#FFE600]/40 text-[#FFE600] flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-white">
              Cashfree Production Payments &amp; Audit Ledger
            </h3>
            <p className="text-xs text-zinc-400">
              Server-verified ₹149 WorldCup &amp; ₹79 Lightning Premier orders · Webhook HMAC-SHA256 verified · Zero UTR bypass
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
              cashfreeConfigured
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/70 border-amber-500/40 text-amber-200'
            }`}
          >
            {cashfreeConfigured
              ? 'Cashfree Production Active'
              : 'Set CASHFREE_APP_ID & CASHFREE_SECRET_KEY'}
          </span>
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl bg-red-950/70 border border-red-500/45 px-4 py-3 text-xs font-semibold text-red-100 flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}

      {feedbackMsg && (
        <div
          role="status"
          className="rounded-xl bg-emerald-950/70 border border-emerald-500/45 px-4 py-3 text-xs font-semibold text-emerald-100 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Payment Records Table */}
      <div className="rounded-2xl border border-white/10 bg-black/45 p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-display font-bold text-sm text-white">
            Payment Records ({payments.length})
          </h4>
          <div className="flex flex-wrap items-center gap-1.5">
            {(['ALL', 'PAID', 'PENDING', 'FAILED'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  statusFilter === st
                    ? 'bg-[#FFE600] text-slate-950'
                    : 'bg-white/10 text-zinc-300 hover:bg-white/15'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {payments.length === 0 ? (
          <p className="text-xs text-zinc-400 py-6 text-center">
            No Cashfree payment records found for filter "{statusFilter}".
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 uppercase text-[10px]">
                  <th className="py-2 pr-3">Order ID</th>
                  <th className="py-2 pr-3">Cashfree Payment ID</th>
                  <th className="py-2 pr-3">Customer</th>
                  <th className="py-2 pr-3">Theme</th>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Unlock</th>
                  <th className="py-2">Verified At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-zinc-200">
                {payments.map((p) => (
                  <tr key={p.order_id}>
                    <td className="py-2.5 pr-3 font-mono font-bold text-white">{p.order_id}</td>
                    <td className="py-2.5 pr-3 font-mono text-zinc-300">
                      {p.cf_payment_id || '—'}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="font-bold text-white">{p.customer_id}</span>
                    </td>
                    <td className="py-2.5 pr-3 font-semibold text-zinc-200">
                      {p.product_name || 'WorldCup Scoreboard'}
                    </td>
                    <td className="py-2.5 pr-3 font-bold tabular-nums">
                      ₹{p.expected_amount} {p.currency}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] ${
                          p.payment_status === 'PAID'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : p.payment_status === 'PENDING'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {p.payment_status === 'PAID' ? (
                          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                        ) : p.payment_status === 'PENDING' ? (
                          <Clock className="w-3 h-3" aria-hidden="true" />
                        ) : (
                          <XCircle className="w-3 h-3" aria-hidden="true" />
                        )}
                        {p.payment_status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={`inline-flex items-center gap-1 font-bold text-[10px] ${
                          p.unlock_status === 'UNLOCKED' ? 'text-emerald-300' : 'text-zinc-400'
                        }`}
                      >
                        {p.unlock_status === 'UNLOCKED' ? (
                          <LockOpen className="w-3 h-3" aria-hidden="true" />
                        ) : (
                          <Lock className="w-3 h-3" aria-hidden="true" />
                        )}
                        {p.unlock_status}
                      </span>
                    </td>
                    <td className="py-2.5 text-zinc-400">{formatUnlockTimestamp(p.verified_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin-Only Manual Grant Form (Requires mandatory audit reason) */}
      <div className="rounded-2xl border border-[#FFE600]/25 bg-black/45 p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#FFE600]" aria-hidden="true" />
          <div>
            <h4 className="font-display font-bold text-sm text-white">
              Manual Access Grant (Admin-Only · Audit Logged)
            </h4>
            <p className="text-[11px] text-zinc-400">
              Separately authenticated owner action. Every manual grant or revoke is recorded in the
              audit log.
            </p>
          </div>
        </div>

        <form onSubmit={handleManualGrant} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label
              htmlFor="admin-grant-customer-id"
              className="block text-[11px] font-bold uppercase text-zinc-300 mb-1"
            >
              Customer / Access ID
            </label>
            <input
              id="admin-grant-customer-id"
              type="text"
              required
              value={grantCustomerId}
              onChange={(e) => setGrantCustomerId(e.target.value)}
              placeholder="e.g. STAR-1001"
              className="w-full px-3 py-2 rounded-lg bg-zinc-950/90 border border-white/15 text-xs font-mono text-white"
            />
          </div>
          <div>
            <label
              htmlFor="admin-grant-theme"
              className="block text-[11px] font-bold uppercase text-zinc-300 mb-1"
            >
              Scoreboard Theme
            </label>
            <select
              id="admin-grant-theme"
              value={grantThemeId}
              onChange={(e) => setGrantThemeId(e.target.value as PaidThemeId)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950/90 border border-white/15 text-xs font-semibold text-white"
            >
              <option value="worldcup">WorldCup Scoreboard (₹149)</option>
              <option value="lightning-pro">Lightning Premier Scoreboard (₹79)</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="admin-grant-reason"
              className="block text-[11px] font-bold uppercase text-zinc-300 mb-1"
            >
              Audit Reason (Required)
            </label>
            <input
              id="admin-grant-reason"
              type="text"
              required
              minLength={5}
              value={grantReason}
              onChange={(e) => setGrantReason(e.target.value)}
              placeholder="e.g. Verified offline bank transfer"
              className="w-full px-3 py-2 rounded-lg bg-zinc-950/90 border border-white/15 text-xs text-white"
            />
          </div>
          <div>
            <label
              htmlFor="admin-grant-days"
              className="block text-[11px] font-bold uppercase text-zinc-300 mb-1"
            >
              Duration Days (Optional)
            </label>
            <input
              id="admin-grant-days"
              type="number"
              min={1}
              max={365}
              value={grantDurationDays}
              onChange={(e) => setGrantDurationDays(e.target.value)}
              placeholder="Blank = No expiry"
              className="w-full px-3 py-2 rounded-lg bg-zinc-950/90 border border-white/15 text-xs text-white"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              disabled={granting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FFE600] hover:bg-yellow-300 text-slate-950 text-xs font-black uppercase tracking-wider disabled:opacity-60"
            >
              <LockOpen className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {granting
                  ? 'Granting...'
                  : `Grant ${PAID_THEME_CATALOG[grantThemeId].shortName} Access (Log Audit)`}
              </span>
            </button>
          </div>
        </form>

        {/* Active Unlocks List */}
        {unlocks.length > 0 && (
          <div className="pt-3 border-t border-white/10 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
              Customer Unlock Records ({unlocks.length})
            </p>
            <div className="space-y-1.5">
              {unlocks.map((u) => {
                const isLightning = u.product_code === 'lightning_pro_scoreboard';
                const productLabel = isLightning ? 'Lightning Premier ₹79' : 'WorldCup ₹149';
                const rowKey = `${u.customer_id}::${u.product_code || 'worldcup_scoreboard'}`;
                return (
                  <div
                    key={rowKey}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-zinc-950/70 border border-white/10 px-3 py-2 text-xs"
                  >
                    <div className="space-y-0.5">
                      <span className="font-mono font-bold text-white">{u.customer_id}</span>
                      <span
                        className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isLightning
                            ? 'bg-fuchsia-500/20 text-fuchsia-300'
                            : 'bg-sky-500/20 text-sky-300'
                        }`}
                      >
                        {productLabel}
                      </span>
                      <span
                        className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          u.unlock_status === 'UNLOCKED'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {u.unlock_status}
                      </span>
                      <span className="ml-2 text-[11px] text-zinc-400">
                        Source: {u.grant_source}
                        {u.grant_reason ? ` · ${u.grant_reason}` : ''}
                      </span>
                    </div>
                    {u.unlock_status === 'UNLOCKED' && (
                      <button
                        type="button"
                        onClick={() => void handleRevokeUnlock(u.customer_id, u.product_code)}
                        className="px-2.5 py-1 rounded bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-200 text-[11px] font-bold"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Admin Audit Log */}
      <div className="rounded-2xl border border-white/10 bg-black/45 p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#FFE600]" aria-hidden="true" />
          <h4 className="font-display font-bold text-sm text-white">
            Admin Payment Audit Log ({auditLogs.length})
          </h4>
        </div>
        {auditLogs.length === 0 ? (
          <p className="text-xs text-zinc-400">No manual admin actions logged yet.</p>
        ) : (
          <div className="space-y-1.5">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-lg bg-zinc-950/70 border border-white/10 px-3 py-2 text-xs flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <span className="font-bold text-[#FFE600]">{log.action}</span>
                  <span className="mx-1.5 text-zinc-500">·</span>
                  <span className="font-mono font-bold text-white">{log.customer_id}</span>
                  <span className="mx-1.5 text-zinc-500">·</span>
                  <span className="text-zinc-300">{log.reason}</span>
                </div>
                <span className="text-[11px] text-zinc-400">
                  {formatUnlockTimestamp(log.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
