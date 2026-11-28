import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trophy,
  XCircle,
} from 'lucide-react';
import {
  TOURNAMENT_PRICE_PER_DAY_INR,
  type TournamentUnlockPass,
} from '../lib/tournamentUnlock';

interface AdminTournamentCodesPanelProps {
  adminToken: string;
  onLockAdmin: () => void;
}

const QUICK_DAY_PRESETS = [1, 2, 3, 5, 7, 15, 30];

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminTournamentCodesPanel({
  adminToken,
  onLockAdmin,
}: AdminTournamentCodesPanelProps) {
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'ACTIVE' | 'REDEEMED' | 'EXPIRED' | 'REVOKED'
  >('ALL');
  const [codes, setCodes] = useState<TournamentUnlockPass[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [revokingCode, setRevokingCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Generator form state
  const [durationDays, setDurationDays] = useState<number>(3);
  const [customerLabel, setCustomerLabel] = useState('');
  const [assignedCustomerId, setAssignedCustomerId] = useState('');
  const [latestGenerated, setLatestGenerated] = useState<TournamentUnlockPass | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const safeDays = Math.max(1, Math.min(365, Math.floor(Number(durationDays) || 1)));
  const totalPriceInr = safeDays * TOURNAMENT_PRICE_PER_DAY_INR;

  const loadCodes = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/admin/tournament-codes?status=${encodeURIComponent(statusFilter)}`,
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
        codes?: TournamentUnlockPass[];
        error?: string;
      } | null;
      if (!res.ok || !json?.ok) {
        setErrorMsg(json?.error || 'Could not load tournament unlock codes.');
        return;
      }
      setCodes(Array.isArray(json.codes) ? json.codes : []);
    } catch {
      setErrorMsg('Network error loading tournament unlock codes.');
    } finally {
      setLoading(false);
    }
  }, [adminToken, onLockAdmin, statusFilter]);

  useEffect(() => {
    void loadCodes();
  }, [loadCodes]);

  const handleCopyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  const buildShareMessage = (rec: TournamentUnlockPass) =>
    `Star Event Live — Tournament Unlock Code\n` +
    `Code: ${rec.code}\n` +
    `Validity: ${rec.duration_days} Day${rec.duration_days === 1 ? '' : 's'} (₹${rec.total_price_inr} @ ₹${rec.price_per_day_inr}/day)\n` +
    `Benefit: Create unlimited new tournaments for ${rec.duration_days} day${rec.duration_days === 1 ? '' : 's'} after activation.\n` +
    (rec.assigned_customer_id ? `Account ID: ${rec.assigned_customer_id}\n` : '') +
    `Open Dashboard → Tournament → Create Tournament and enter this code to unlock.`;

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedbackMsg(null);
    setGenerating(true);

    try {
      const res = await fetch('/api/admin/tournament-codes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          durationDays: safeDays,
          customerLabel: customerLabel.trim(),
          assignedCustomerId: assignedCustomerId.trim() || undefined,
        }),
      });
      if (res.status === 401) {
        onLockAdmin();
        return;
      }
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        codeRecord?: TournamentUnlockPass;
        error?: string;
      } | null;
      if (!res.ok || !json?.ok || !json.codeRecord) {
        setErrorMsg(json?.error || 'Failed to generate tournament unlock code.');
        return;
      }
      setLatestGenerated(json.codeRecord);
      setFeedbackMsg(
        `Generated ${json.codeRecord.duration_days}-day Tournament Code (${json.codeRecord.code}) — ₹${json.codeRecord.total_price_inr}.`
      );
      setCustomerLabel('');
      setAssignedCustomerId('');
      await loadCodes();
    } catch {
      setErrorMsg('Network error generating tournament unlock code.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (code: string) => {
    setErrorMsg(null);
    setFeedbackMsg(null);
    setRevokingCode(code);
    try {
      const res = await fetch('/api/admin/tournament-codes/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ code }),
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
        setErrorMsg(json?.error || 'Could not revoke code.');
        return;
      }
      setFeedbackMsg(`Code ${code} has been revoked.`);
      if (latestGenerated?.code === code) {
        setLatestGenerated(null);
      }
      await loadCodes();
    } catch {
      setErrorMsg('Network error while revoking code.');
    } finally {
      setRevokingCode(null);
    }
  };

  const activeCount = codes.filter((c) => c.status === 'ACTIVE').length;
  const activePassCount = codes.filter(
    (c) => c.status === 'REDEEMED' && !c.is_expired
  ).length;
  const totalTournamentsCreated = codes.reduce(
    (sum, c) =>
      sum +
      (typeof c.tournaments_created_count === 'number'
        ? c.tournaments_created_count
        : c.consumed_tournament_name
          ? 1
          : 0),
    0
  );

  return (
    <div className="space-y-5">
      {/* Header Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-black text-lg sm:text-xl text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#FFE600]" aria-hidden="true" />
            <span>Tournament Unlock Codes (₹{TOURNAMENT_PRICE_PER_DAY_INR} / Day)</span>
          </h2>
          <p className="text-xs text-rose-100/75 mt-0.5">
            Select how many days to unlock for the customer. All scoreboard themes remain free &amp; unlocked.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadCodes()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg overlay-home-btn text-xs font-bold disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#FFE600] ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-[#0B0618]/85 border border-[#FFE600]/25 p-3.5">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Rate Per Day
          </p>
          <p className="font-mono font-black text-xl text-[#FFE600] mt-1 tabular-nums">
            ₹{TOURNAMENT_PRICE_PER_DAY_INR}/Day
          </p>
        </div>
        <div className="rounded-xl bg-[#0B0618]/85 border border-emerald-500/25 p-3.5">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Ready Codes
          </p>
          <p className="font-mono font-black text-xl text-emerald-400 mt-1 tabular-nums">
            {activeCount}
          </p>
        </div>
        <div className="rounded-xl bg-[#0B0618]/85 border border-amber-500/25 p-3.5">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Active Passes
          </p>
          <p className="font-mono font-black text-xl text-amber-300 mt-1 tabular-nums">
            {activePassCount}
          </p>
        </div>
        <div className="rounded-xl bg-[#0B0618]/85 border border-sky-500/25 p-3.5">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Tournaments Created
          </p>
          <p className="font-mono font-black text-xl text-sky-300 mt-1 tabular-nums">
            {totalTournamentsCreated}
          </p>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl bg-red-950/75 border border-red-500/50 px-4 py-3 text-xs font-semibold text-red-100 flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-300" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}

      {feedbackMsg && (
        <div
          role="status"
          className="rounded-xl bg-emerald-950/75 border border-emerald-500/45 px-4 py-3 text-xs font-semibold text-emerald-100 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-300" aria-hidden="true" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Generator Card */}
      <form
        onSubmit={handleGenerate}
        className="rounded-2xl bg-[#0B0618]/90 border border-[#FFE600]/35 p-4 sm:p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#FFE600]" aria-hidden="true" />
            <h3 className="font-display font-bold text-sm uppercase tracking-wider text-white">
              Generate New Tournament Unlock Code
            </h3>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-[#FFE600]/15 border border-[#FFE600]/40 text-[#FFE600] font-mono text-xs font-black tabular-nums">
            {safeDays} Day{safeDays === 1 ? '' : 's'} × ₹{TOURNAMENT_PRICE_PER_DAY_INR} = ₹{totalPriceInr}
          </span>
        </div>

        {/* Quick Days Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-rose-100/90">
            Select Tournament Unlock Duration (Days) *
          </label>
          <div className="flex flex-wrap gap-2">
            {QUICK_DAY_PRESETS.map((days) => {
              const active = safeDays === days;
              return (
                <button
                  key={days}
                  type="button"
                  onClick={() => setDurationDays(days)}
                  className={`px-3 py-2 rounded-lg text-xs font-extrabold transition-all tabular-nums border ${
                    active
                      ? 'bg-[#FFE600] text-[#070B28] border-[#FFE600] shadow-md'
                      : 'bg-[#151524] text-zinc-200 border-white/15 hover:border-[#FFE600]/60'
                  }`}
                >
                  {days} Day{days === 1 ? '' : 's'} · ₹{days * TOURNAMENT_PRICE_PER_DAY_INR}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label
              htmlFor="admin-tournament-days"
              className="block text-[11px] font-bold uppercase tracking-wider text-zinc-300"
            >
              Custom Days (1–365) *
            </label>
            <div className="relative">
              <Calendar
                className="w-4 h-4 text-[#FFE600] absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                id="admin-tournament-days"
                type="number"
                min={1}
                max={365}
                required
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#151524] border border-white/15 focus:border-[#FFE600] focus:outline-none text-sm font-mono font-bold text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="admin-tournament-label"
              className="block text-[11px] font-bold uppercase tracking-wider text-zinc-300"
            >
              Customer / Tournament Note
            </label>
            <input
              id="admin-tournament-label"
              type="text"
              maxLength={120}
              value={customerLabel}
              onChange={(e) => setCustomerLabel(e.target.value)}
              placeholder="e.g. Rahul Cricket Cup"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#151524] border border-white/15 focus:border-[#FFE600] focus:outline-none text-sm text-white placeholder:text-zinc-500"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="admin-tournament-uid"
              className="block text-[11px] font-bold uppercase tracking-wider text-zinc-300"
            >
              Lock to Customer ID (Optional)
            </label>
            <input
              id="admin-tournament-uid"
              type="text"
              maxLength={48}
              value={assignedCustomerId}
              onChange={(e) => setAssignedCustomerId(e.target.value.toUpperCase())}
              placeholder="Leave blank for any user"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#151524] border border-white/15 focus:border-[#FFE600] focus:outline-none text-sm font-mono uppercase text-white placeholder:text-zinc-500 placeholder:font-sans placeholder:normal-case"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="text-[11px] text-zinc-400">
            Customer enters this code once in <strong className="text-white">Create Tournament</strong> to create unlimited new tournaments for{' '}
            <strong className="text-[#FFE600]">{safeDays} day{safeDays === 1 ? '' : 's'}</strong> (auto-expires after {safeDays} day{safeDays === 1 ? '' : 's'}).
          </p>
          <button
            type="submit"
            disabled={generating}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl btn-gold-pro disabled:opacity-60 text-[#070B28] font-display font-black text-xs uppercase tracking-wider shadow-lg"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>
              {generating
                ? 'Generating...'
                : `Generate ${safeDays}-Day Code (₹${totalPriceInr})`}
            </span>
          </button>
        </div>
      </form>

      {/* Freshly Generated Code Highlight Box */}
      {latestGenerated && (
        <div className="rounded-2xl bg-emerald-950/60 border-2 border-emerald-400/70 p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-extrabold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span>Code Ready to Share</span>
            </div>
            <span className="text-xs font-mono font-bold text-[#FFE600]">
              {latestGenerated.duration_days} Day{latestGenerated.duration_days === 1 ? '' : 's'} · ₹{latestGenerated.total_price_inr}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-[#070B19] border border-emerald-500/35 px-4 py-3">
            <p className="font-mono font-black text-xl sm:text-2xl tracking-widest text-white select-all">
              {latestGenerated.code}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleCopyText(latestGenerated.code, 'latest-code')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#FFE600] hover:bg-yellow-300 text-[#070B28] text-xs font-black uppercase tracking-wide"
              >
                {copiedKey === 'latest-code' ? (
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>{copiedKey === 'latest-code' ? 'Copied!' : 'Copy Code'}</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  void handleCopyText(buildShareMessage(latestGenerated), 'latest-msg')
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
              >
                {copiedKey === 'latest-msg' ? (
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>{copiedKey === 'latest-msg' ? 'Message Copied!' : 'Copy Share Msg'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Codes Ledger */}
      <div className="rounded-2xl bg-[#0B0618]/85 border border-white/15 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display font-bold text-sm text-white">
            Generated Tournament Unlock Codes ({codes.length})
          </h3>
          <div className="flex flex-wrap items-center gap-1.5">
            {(['ALL', 'ACTIVE', 'REDEEMED', 'EXPIRED', 'REVOKED'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                  statusFilter === st
                    ? 'bg-[#FFE600] text-[#070B28]'
                    : 'bg-white/10 text-zinc-300 hover:bg-white/20'
                }`}
              >
                {st === 'REDEEMED' ? 'ACTIVE PASS' : st}
              </button>
            ))}
          </div>
        </div>

        {codes.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-400">
            No tournament unlock codes found for this filter. Generate one above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-zinc-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Code</th>
                  <th className="px-4 py-2.5">Duration &amp; Price</th>
                  <th className="px-4 py-2.5">Customer / Note</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Tournaments &amp; Validity</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {codes.map((c) => {
                  const isExpired = Boolean(c.is_expired) && c.status !== 'REVOKED';
                  const isActivePass = c.status === 'REDEEMED' && !isExpired;
                  const createdCount =
                    typeof c.tournaments_created_count === 'number'
                      ? c.tournaments_created_count
                      : c.consumed_tournament_name
                        ? 1
                        : 0;
                  const statusClasses =
                    c.status === 'ACTIVE'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : isActivePass
                        ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                        : isExpired || c.status === 'USED'
                          ? 'bg-sky-500/20 text-sky-200 border-sky-500/40'
                          : 'bg-red-500/20 text-red-200 border-red-500/40';
                  return (
                    <tr key={c.code} className="hover:bg-white/5">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white tracking-wider">
                            {c.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleCopyText(c.code, c.code)}
                            title="Copy code"
                            className="p-1 rounded bg-white/10 hover:bg-white/20 text-zinc-200"
                          >
                            {copiedKey === c.code ? (
                              <Check className="w-3 h-3 text-emerald-300" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          Created {formatDateTime(c.created_at)}
                        </p>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        <p className="font-bold text-[#FFE600]">
                          {c.duration_days} Day{c.duration_days === 1 ? '' : 's'}
                        </p>
                        <p className="text-[11px] text-zinc-300">
                          ₹{c.total_price_inr} (₹{c.price_per_day_inr}/day)
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-white">
                          {c.customer_label || 'General Customer'}
                        </p>
                        {c.assigned_customer_id && (
                          <p className="text-[10px] font-mono text-amber-300">
                            Locked to: {c.assigned_customer_id}
                          </p>
                        )}
                        {c.redeemed_by_customer_id && (
                          <p className="text-[10px] font-mono text-emerald-300">
                            Redeemed by: {c.redeemed_by_customer_id}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-extrabold uppercase tracking-wider ${statusClasses}`}
                        >
                          {c.status === 'ACTIVE'
                            ? 'Ready'
                            : isActivePass
                              ? `Active (${c.remaining_days ?? c.duration_days}d left)`
                              : isExpired || c.status === 'USED'
                                ? 'Expired'
                                : 'Revoked'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {createdCount > 0 || c.expires_at ? (
                          <div className="space-y-0.5">
                            {createdCount > 0 && (
                              <p className="font-semibold text-white">
                                {createdCount} Tournament{createdCount === 1 ? '' : 's'}
                                {c.consumed_tournament_name
                                  ? ` · Latest: ${c.consumed_tournament_name}`
                                  : ''}
                              </p>
                            )}
                            {c.expires_at && (
                              <p className="text-[10px] text-zinc-400">
                                {isExpired ? 'Expired ' : 'Valid till '}
                                {formatDateTime(c.expires_at)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {c.status === 'ACTIVE' || isActivePass ? (
                          <button
                            type="button"
                            disabled={revokingCode === c.code}
                            onClick={() => void handleRevoke(c.code)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-600/20 hover:bg-red-600/35 border border-red-500/40 text-red-200 text-[11px] font-bold disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{revokingCode === c.code ? 'Revoking...' : 'Revoke'}</span>
                          </button>
                        ) : (
                          <span className="text-zinc-600 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
