import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Database,
  Eye,
  KeyRound,
  LogOut,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  X,
  XCircle,
} from 'lucide-react';
import {
  auth,
  getGoogleRedirectResult,
  signInWithGoogleRedirect,
  signOutFirebaseAuth,
  subscribeFirebaseAuth,
} from '../firebase';
import {
  generateTournamentUnlockCodeInFirestore,
  isFirebaseOwnerAdminUser,
  migrateLegacySupabaseCodesToFirestore,
  OWNER_ADMIN_EMAIL,
  refreshTournamentUnlockCodesFromServer,
  revokeTournamentUnlockCodeInFirestore,
  subscribeAllTournamentUnlockCodes,
  syncExpiredActiveCodesInFirestore,
  TOURNAMENT_PRICE_PER_DAY_INR,
  type FirestoreTournamentUnlockCode,
  type LegacySupabaseCodeRow,
} from '../lib/firestoreTournamentCodes';

interface AdminTournamentCodesPanelProps {
  adminToken: string;
  onLockAdmin: () => void;
}

type StatusFilter = 'ALL' | 'ACTIVE' | 'REDEEMED' | 'USED' | 'REVOKED' | 'EXPIRED';

const QUICK_DAY_PRESETS = [1, 2, 3, 5, 7, 15, 30];
const PAGE_STEP = 25;

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
  // Firebase Admin Authentication state (persisted automatically by Firebase SDK)
  const [fbUser, setFbUser] = useState<User | null>(() => auth.currentUser);
  const [fbAuthReady, setFbAuthReady] = useState(false);
  const [signingInFb, setSigningInFb] = useState(false);

  // Real-time Firestore state (never cleared on remount or network reconnect)
  const [allCodes, setAllCodes] = useState<FirestoreTournamentUnlockCode[]>([]);
  const [pageSize, setPageSize] = useState<number>(PAGE_STEP);
  const [hasMore, setHasMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [revokingCode, setRevokingCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Generator form state (preserves exact Star Event Live Admin layout)
  const [durationDays, setDurationDays] = useState<number>(3);
  const [customerLabel, setCustomerLabel] = useState('');
  const [assignedCustomerId, setAssignedCustomerId] = useState('');
  const [latestGenerated, setLatestGenerated] = useState<FirestoreTournamentUnlockCode | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // View Details modal
  const [detailsRecord, setDetailsRecord] = useState<FirestoreTournamentUnlockCode | null>(null);

  // Optional legacy Supabase migration state (non-destructive)
  const [legacyRows, setLegacyRows] = useState<LegacySupabaseCodeRow[]>([]);
  const [migratingLegacy, setMigratingLegacy] = useState(false);

  const isFirebaseAdmin = isFirebaseOwnerAdminUser(fbUser);
  const safeDays = Math.max(1, Math.min(365, Math.floor(Number(durationDays) || 1)));
  const totalPriceInr = safeDays * TOURNAMENT_PRICE_PER_DAY_INR;

  useEffect(() => {
    let active = true;
    let authStateInitialized = false;
    let redirectSettled = false;

    const markReadyIfDone = () => {
      if (active && authStateInitialized && redirectSettled) {
        setFbAuthReady(true);
      }
    };

    const unsub = subscribeFirebaseAuth((user) => {
      if (!active) return;
      setFbUser(user);
      authStateInitialized = true;
      markReadyIfDone();
    });

    void getGoogleRedirectResult().then((outcome) => {
      if (!active) return;
      if (outcome.error) {
        setErrorMsg(
          `Google sign-in redirect failed: ${outcome.error.message || 'Please check authorized redirect URLs and try again.'}`
        );
      } else if (outcome.user) {
        setFbUser(outcome.user);
        if (!isFirebaseOwnerAdminUser(outcome.user)) {
          setErrorMsg(
            `Signed in as ${outcome.user.email || 'unknown account'}, but Firestore Admin access is restricted to ${OWNER_ADMIN_EMAIL}.`
          );
        } else {
          setFeedbackMsg(`Connected to Firebase Cloud Firestore as ${outcome.user.email}.`);
        }
      }
      redirectSettled = true;
      setSigningInFb(false);
      markReadyIfDone();
    });

    return () => {
      active = false;
      unsub();
    };
  }, []);

  // Real-time Firestore onSnapshot listener for tournamentUnlockCodes
  useEffect(() => {
    if (!fbAuthReady || !isFirebaseAdmin) return;
    setLoading(true);
    setErrorMsg(null);

    const unsubscribe = subscribeAllTournamentUnlockCodes({
      pageSize,
      onData: (records, more) => {
        setAllCodes(records);
        setHasMore(more);
        setLoading(false);

        // Automatically persist EXPIRED status for any ACTIVE codes past expiresAt (never deletes)
        const hasStaleActive = records.some((r) => r.status === 'ACTIVE' && r.isExpired);
        if (hasStaleActive) {
          void syncExpiredActiveCodesInFirestore(records);
        }
      },
      onError: (err) => {
        setLoading(false);
        setErrorMsg(
          err.message.includes('permission')
            ? `Firestore permission denied. Please sign in with the verified Admin Google account (${OWNER_ADMIN_EMAIL}).`
            : 'Could not sync tournament unlock codes from Firebase Firestore.'
        );
      },
    });

    return () => unsubscribe();
  }, [fbAuthReady, isFirebaseAdmin, pageSize]);

  // Check once whether any legacy Supabase rows exist for non-destructive migration
  useEffect(() => {
    if (!isFirebaseAdmin || !adminToken) return;
    let active = true;
    const checkLegacy = async () => {
      try {
        const res = await fetch('/api/admin/tournament-codes/supabase-legacy', {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        if (res.status === 401) {
          onLockAdmin();
          return;
        }
        const json = (await res.json().catch(() => null)) as {
          ok?: boolean;
          rows?: LegacySupabaseCodeRow[];
        } | null;
        if (!active || !res.ok || !json?.ok || !Array.isArray(json.rows)) return;
        setLegacyRows(json.rows);
      } catch {
        // Legacy inspection is optional; Firestore remains primary
      }
    };
    void checkLegacy();
    return () => {
      active = false;
    };
  }, [isFirebaseAdmin, adminToken, onLockAdmin]);

  const unmigratedLegacyRows = useMemo(() => {
    if (legacyRows.length === 0) return [];
    const existingIds = new Set(allCodes.map((c) => c.unlockCode.toUpperCase()));
    return legacyRows.filter((r) => !existingIds.has(String(r.code || '').trim().toUpperCase()));
  }, [legacyRows, allCodes]);

  const handleFirebaseAdminSignIn = async () => {
    setErrorMsg(null);
    setFeedbackMsg(null);
    setSigningInFb(true);
    try {
      await signInWithGoogleRedirect();
    } catch (err) {
      setSigningInFb(false);
      setErrorMsg(
        err instanceof Error
          ? `Could not start Google redirect sign-in: ${err.message}`
          : 'Could not start Google redirect sign-in. Please check your Firebase redirect settings and try again.'
      );
    }
  };

  const handleRefreshFromServer = useCallback(async () => {
    if (!isFirebaseAdmin) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const { codes: fresh, hasMore: more } = await refreshTournamentUnlockCodesFromServer(pageSize);
      setAllCodes(fresh);
      setHasMore(more);
      const expiredSynced = await syncExpiredActiveCodesInFirestore(fresh);
      if (expiredSynced > 0) {
        const reFetched = await refreshTournamentUnlockCodesFromServer(pageSize);
        setAllCodes(reFetched.codes);
        setHasMore(reFetched.hasMore);
      }
    } catch {
      setErrorMsg('Could not refresh records from Firebase Firestore. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [isFirebaseAdmin, pageSize]);

  const handleMigrateLegacy = async () => {
    if (!isFirebaseAdmin || unmigratedLegacyRows.length === 0) return;
    setMigratingLegacy(true);
    setErrorMsg(null);
    setFeedbackMsg(null);
    try {
      const summary = await migrateLegacySupabaseCodesToFirestore(unmigratedLegacyRows);
      setFeedbackMsg(
        `Migrated ${summary.migratedCount} legacy code${summary.migratedCount === 1 ? '' : 's'} into Firebase Firestore (${summary.skippedDuplicates} already existed). Supabase data was preserved untouched.`
      );
      await handleRefreshFromServer();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to migrate legacy codes to Firestore.'
      );
    } finally {
      setMigratingLegacy(false);
    }
  };

  const handleCopyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  const buildShareMessage = (rec: FirestoreTournamentUnlockCode) =>
    `Star Event Live — Tournament Unlock Code\n` +
    `Code: ${rec.unlockCode}\n` +
    `Validity: ${rec.durationDays} Day${rec.durationDays === 1 ? '' : 's'} (₹${rec.amount} @ ₹${TOURNAMENT_PRICE_PER_DAY_INR}/day)\n` +
    `Valid Until: ${formatDateTime(rec.expiresAtIso)}\n` +
    (rec.lockedCustomerId ? `Locked Account ID: ${rec.lockedCustomerId}\n` : '') +
    `Open Dashboard → Tournament → Create Tournament and enter this code to unlock.`;

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedbackMsg(null);

    if (!isFirebaseAdmin) {
      setErrorMsg(
        `Please sign in with your verified Firebase Admin Google account (${OWNER_ADMIN_EMAIL}) first so codes save permanently in Cloud Firestore.`
      );
      return;
    }

    setGenerating(true);
    try {
      const created = await generateTournamentUnlockCodeInFirestore({
        durationDays: safeDays,
        customerNote: customerLabel.trim(),
        lockedCustomerId: assignedCustomerId.trim() || undefined,
      });

      // Only show success AFTER Firestore confirms the transaction save
      setLatestGenerated(created);
      setFeedbackMsg(
        `Saved ${created.durationDays}-day Tournament Code (${created.unlockCode}) permanently in Firebase Firestore — ₹${created.amount}.`
      );
      setCustomerLabel('');
      setAssignedCustomerId('');
    } catch (err) {
      setErrorMsg(
        err instanceof Error && !err.message.startsWith('{')
          ? err.message
          : 'Failed to save unlock code to Firebase Cloud Firestore. Please retry.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (code: string) => {
    setErrorMsg(null);
    setFeedbackMsg(null);
    setRevokingCode(code);
    try {
      await revokeTournamentUnlockCodeInFirestore(code);
      setFeedbackMsg(`Code ${code} has been revoked in Firebase Firestore (historical record preserved).`);
      if (latestGenerated?.unlockCode === code) {
        setLatestGenerated(null);
      }
      if (detailsRecord?.unlockCode === code) {
        setDetailsRecord((prev) =>
          prev ? { ...prev, status: 'REVOKED', effectiveStatus: 'REVOKED' } : null
        );
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error && !err.message.startsWith('{')
          ? err.message
          : 'Could not revoke unlock code in Firebase Firestore.'
      );
    } finally {
      setRevokingCode(null);
    }
  };

  // Counters computed directly from real-time Firestore records
  const activeCount = useMemo(
    () => allCodes.filter((c) => c.effectiveStatus === 'ACTIVE').length,
    [allCodes]
  );
  const redeemedCount = useMemo(
    () =>
      allCodes.filter(
        (c) => c.effectiveStatus === 'REDEEMED' || c.effectiveStatus === 'USED'
      ).length,
    [allCodes]
  );
  const usedCount = useMemo(
    () =>
      allCodes.filter(
        (c) => Boolean(c.tournamentId) || c.effectiveStatus === 'USED'
      ).length,
    [allCodes]
  );

  // Filter + Search
  const filteredCodes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allCodes.filter((c) => {
      if (statusFilter === 'ACTIVE' && c.effectiveStatus !== 'ACTIVE') return false;
      if (
        statusFilter === 'REDEEMED' &&
        c.effectiveStatus !== 'REDEEMED' &&
        c.effectiveStatus !== 'USED'
      ) {
        return false;
      }
      if (
        statusFilter === 'USED' &&
        !c.tournamentId &&
        c.effectiveStatus !== 'USED'
      ) {
        return false;
      }
      if (statusFilter === 'EXPIRED' && c.effectiveStatus !== 'EXPIRED') return false;
      if (statusFilter === 'REVOKED' && c.effectiveStatus !== 'REVOKED') return false;

      if (!q) return true;
      return (
        c.unlockCode.toLowerCase().includes(q) ||
        c.customerNote.toLowerCase().includes(q) ||
        (c.lockedCustomerId || '').toLowerCase().includes(q) ||
        (c.redeemedBy || '').toLowerCase().includes(q) ||
        (c.tournamentId || '').toLowerCase().includes(q) ||
        (c.tournamentName || '').toLowerCase().includes(q)
      );
    });
  }, [allCodes, statusFilter, searchQuery]);

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
            Permanently synced with Firebase Cloud Firestore (real-time multi-device ledger).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isFirebaseAdmin && fbUser?.email && (
            <button
              type="button"
              onClick={() => void signOutFirebaseAuth()}
              title={`Firebase Admin connected as ${fbUser.email}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-[11px] font-bold hover:bg-emerald-900/60"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              <span className="max-w-[160px] truncate">{fbUser.email}</span>
              <LogOut className="w-3 h-3 opacity-75" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleRefreshFromServer()}
            disabled={loading || !isFirebaseAdmin}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg overlay-home-btn text-xs font-bold disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#FFE600] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Firebase Admin Auth Connect Bar (shown only until Admin signs into Google Firebase Auth) */}
      {fbAuthReady && !isFirebaseAdmin && (
        <div className="rounded-2xl bg-[#0B0618]/90 border-2 border-[#FFE600]/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Database className="w-5 h-5 text-[#FFE600] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-xs sm:text-sm font-extrabold text-white">
                Connect Firebase Cloud Firestore Admin Account
              </p>
              <p className="text-[11px] text-zinc-300 mt-0.5">
                Sign in once with <span className="font-mono text-[#FFE600]">{OWNER_ADMIN_EMAIL}</span> to load, generate, and revoke permanent unlock codes in real time across all devices.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={signingInFb}
            onClick={() => void handleFirebaseAdminSignIn()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl btn-gold-pro disabled:opacity-60 text-[#070B28] font-display font-black text-xs uppercase tracking-wider shrink-0"
          >
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            <span>{signingInFb ? 'Redirecting...' : 'Sign in with Google'}</span>
          </button>
        </div>
      )}

      {/* Optional Non-Destructive Legacy Supabase Migration Banner */}
      {isFirebaseAdmin && unmigratedLegacyRows.length > 0 && (
        <div className="rounded-xl bg-amber-950/60 border border-amber-400/50 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-amber-100">
            <strong className="text-[#FFE600]">
              {unmigratedLegacyRows.length} legacy Supabase code
              {unmigratedLegacyRows.length === 1 ? '' : 's'} found.
            </strong>{' '}
            Import them into Firebase Firestore without duplicates (Supabase records stay untouched).
          </div>
          <button
            type="button"
            disabled={migratingLegacy}
            onClick={() => void handleMigrateLegacy()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#FFE600] hover:bg-yellow-300 text-[#070B28] text-xs font-black uppercase tracking-wide disabled:opacity-60"
          >
            <Database className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{migratingLegacy ? 'Migrating...' : 'Migrate to Firestore'}</span>
          </button>
        </div>
      )}

      {/* KPI Strip (Exact original 4-card layout) */}
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
            Active Codes
          </p>
          <p className="font-mono font-black text-xl text-emerald-400 mt-1 tabular-nums">
            {activeCount}
          </p>
        </div>
        <div className="rounded-xl bg-[#0B0618]/85 border border-amber-500/25 p-3.5">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Redeemed
          </p>
          <p className="font-mono font-black text-xl text-amber-300 mt-1 tabular-nums">
            {redeemedCount}
          </p>
        </div>
        <div className="rounded-xl bg-[#0B0618]/85 border border-sky-500/25 p-3.5">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Tournaments Created
          </p>
          <p className="font-mono font-black text-xl text-sky-300 mt-1 tabular-nums">
            {usedCount}
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

      {/* Generator Card (Exact existing Star Event Live black/purple + yellow buttons design) */}
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
            Remains <strong className="text-emerald-300">ACTIVE</strong> in Firebase Firestore for{' '}
            <strong className="text-[#FFE600]">
              {safeDays} day{safeDays === 1 ? '' : 's'}
            </strong>{' '}
            until redeemed, expired, or manually revoked.
          </p>
          <button
            type="submit"
            disabled={generating || !isFirebaseAdmin}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl btn-gold-pro disabled:opacity-60 text-[#070B28] font-display font-black text-xs uppercase tracking-wider shadow-lg"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>
              {generating
                ? 'Saving to Firebase...'
                : `Generate ${safeDays}-Day Code (₹${totalPriceInr})`}
            </span>
          </button>
        </div>
      </form>

      {/* Freshly Generated Code Highlight Box (Only shown AFTER Firestore confirms save) */}
      {latestGenerated && (
        <div className="rounded-2xl bg-emerald-950/60 border-2 border-emerald-400/70 p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-extrabold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span>Confirmed in Firebase · Code Ready to Share</span>
            </div>
            <span className="text-xs font-mono font-bold text-[#FFE600]">
              {latestGenerated.durationDays} Day{latestGenerated.durationDays === 1 ? '' : 's'} · ₹
              {latestGenerated.amount} · Expires {formatDateTime(latestGenerated.expiresAtIso)}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-[#070B19] border border-emerald-500/35 px-4 py-3">
            <p className="font-mono font-black text-xl sm:text-2xl tracking-widest text-white select-all">
              {latestGenerated.unlockCode}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleCopyText(latestGenerated.unlockCode, 'latest-code')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#FFE600] hover:bg-yellow-300 text-[#070B28] text-xs font-black uppercase tracking-wide"
              >
                {copiedKey === 'latest-code' ? (
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>{copiedKey === 'latest-code' ? 'Copied' : 'Copy Code'}</span>
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
                <span>{copiedKey === 'latest-msg' ? 'Message Copied' : 'Copy Share Msg'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Codes Ledger */}
      <div className="rounded-2xl bg-[#0B0618]/85 border border-white/15 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display font-bold text-sm text-white">
              Generated Tournament Unlock Codes ({filteredCodes.length}
              {filteredCodes.length !== allCodes.length ? ` of ${allCodes.length}` : ''})
            </h3>
            <div className="flex flex-wrap items-center gap-1.5">
              {(['ALL', 'ACTIVE', 'REDEEMED', 'USED', 'REVOKED', 'EXPIRED'] as const).map((st) => (
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
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Search Code or Customer */}
          <div className="relative">
            <Search
              className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by unlock code, customer note, locked ID, redeemed customer, or tournament ID..."
              className="w-full pl-9 pr-8 py-2 rounded-lg bg-[#151524] border border-white/12 focus:border-[#FFE600] focus:outline-none text-xs text-white placeholder:text-zinc-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {!isFirebaseAdmin ? (
          <div className="p-8 text-center text-xs text-zinc-400">
            Sign in with your verified Firebase Admin Google account above to load permanent records from Cloud Firestore.
          </div>
        ) : loading && allCodes.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-400">
            Loading tournament unlock codes from Firebase Cloud Firestore...
          </div>
        ) : filteredCodes.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-400">
            No tournament unlock codes match this filter. Generate one above.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-zinc-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-2.5">Code &amp; Dates</th>
                    <th className="px-4 py-2.5">Duration &amp; Amount</th>
                    <th className="px-4 py-2.5">Customer / Note</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Redemption &amp; Tournament</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredCodes.map((c) => {
                    const st = c.effectiveStatus;
                    const statusClasses =
                      st === 'ACTIVE'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : st === 'REDEEMED'
                          ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                          : st === 'USED'
                            ? 'bg-sky-500/20 text-sky-200 border-sky-500/40'
                            : st === 'EXPIRED'
                              ? 'bg-zinc-500/25 text-zinc-300 border-zinc-500/45'
                              : 'bg-red-500/20 text-red-200 border-red-500/40';
                    return (
                      <tr key={c.id} className="hover:bg-white/5">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white tracking-wider">
                              {c.unlockCode}
                            </span>
                            <button
                              type="button"
                              onClick={() => void handleCopyText(c.unlockCode, c.id)}
                              title="Copy code"
                              className="p-1 rounded bg-white/10 hover:bg-white/20 text-zinc-200"
                            >
                              {copiedKey === c.id ? (
                                <Check className="w-3 h-3 text-emerald-300" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <p className="text-[10px] text-zinc-400 mt-0.5">
                            Created: {formatDateTime(c.createdAtIso)}
                          </p>
                          <p className="text-[10px] text-amber-200/80">
                            Expires: {formatDateTime(c.expiresAtIso)}
                          </p>
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          <p className="font-bold text-[#FFE600]">
                            {c.durationDays} Day{c.durationDays === 1 ? '' : 's'}
                          </p>
                          <p className="text-[11px] text-zinc-300">
                            ₹{c.amount} (₹{TOURNAMENT_PRICE_PER_DAY_INR}/day)
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-white">
                            {c.customerNote || 'General Customer'}
                          </p>
                          {c.lockedCustomerId && (
                            <p className="text-[10px] font-mono text-amber-300">
                              Locked ID: {c.lockedCustomerId}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-extrabold uppercase tracking-wider ${statusClasses}`}
                          >
                            {st}
                          </span>
                          {st === 'ACTIVE' && (
                            <p className="text-[10px] text-emerald-300/80 mt-0.5 tabular-nums">
                              {c.remainingDays}d left
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {c.redeemedBy || c.tournamentId ? (
                            <div className="space-y-0.5">
                              {c.redeemedBy && (
                                <p className="text-[11px] font-semibold text-emerald-300">
                                  By: {c.redeemedBy}
                                </p>
                              )}
                              {c.redeemedAtIso && (
                                <p className="text-[10px] text-zinc-400">
                                  At: {formatDateTime(c.redeemedAtIso)}
                                </p>
                              )}
                              {c.tournamentId && (
                                <p className="text-[10px] font-mono text-sky-300">
                                  Tournament: {c.tournamentName || c.tournamentId} ({c.tournamentId})
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-zinc-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setDetailsRecord(c)}
                              title="View full record details"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-zinc-200 text-[11px] font-bold"
                            >
                              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Details</span>
                            </button>
                            {c.status !== 'REVOKED' && (
                              <button
                                type="button"
                                disabled={revokingCode === c.unlockCode}
                                onClick={() => void handleRevoke(c.unlockCode)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-600/20 hover:bg-red-600/35 border border-red-500/40 text-red-200 text-[11px] font-bold disabled:opacity-50"
                              >
                                <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>
                                  {revokingCode === c.unlockCode ? 'Revoking...' : 'Revoke'}
                                </span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <div className="px-4 py-3 border-t border-white/10 text-center">
                <button
                  type="button"
                  onClick={() => setPageSize((prev) => prev + PAGE_STEP)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-[#FFE600]"
                >
                  Load More Records
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* View Details Modal */}
      {detailsRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl bg-[#0B0618] border border-[#FFE600]/45 shadow-2xl overflow-hidden text-white">
            <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#FFE600]" aria-hidden="true" />
                <h4 className="font-display font-black text-sm uppercase tracking-wider">
                  Unlock Code Details
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setDetailsRecord(null)}
                aria-label="Close details modal"
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-lg bg-white/5 p-2.5">
                  <p className="text-[10px] text-zinc-400 uppercase">Unlock Code / Doc ID</p>
                  <p className="font-mono font-bold text-[#FFE600] mt-0.5 select-all">
                    {detailsRecord.unlockCode}
                  </p>
                </div>
                <div className="rounded-lg bg-white/5 p-2.5">
                  <p className="text-[10px] text-zinc-400 uppercase">Current Status</p>
                  <p className="font-bold text-white mt-0.5">{detailsRecord.effectiveStatus}</p>
                </div>
                <div className="rounded-lg bg-white/5 p-2.5">
                  <p className="text-[10px] text-zinc-400 uppercase">Duration &amp; Amount</p>
                  <p className="font-bold text-white mt-0.5 tabular-nums">
                    {detailsRecord.durationDays} Day{detailsRecord.durationDays === 1 ? '' : 's'} · ₹
                    {detailsRecord.amount}
                  </p>
                </div>
                <div className="rounded-lg bg-white/5 p-2.5">
                  <p className="text-[10px] text-zinc-400 uppercase">Locked Customer ID</p>
                  <p className="font-mono text-white mt-0.5">
                    {detailsRecord.lockedCustomerId || 'Any Customer'}
                  </p>
                </div>
                <div className="rounded-lg bg-white/5 p-2.5">
                  <p className="text-[10px] text-zinc-400 uppercase">Created At</p>
                  <p className="text-white mt-0.5">{formatDateTime(detailsRecord.createdAtIso)}</p>
                </div>
                <div className="rounded-lg bg-white/5 p-2.5">
                  <p className="text-[10px] text-zinc-400 uppercase">Expires At</p>
                  <p className="text-amber-200 mt-0.5">
                    {formatDateTime(detailsRecord.expiresAtIso)}
                  </p>
                </div>
                <div className="rounded-lg bg-white/5 p-2.5">
                  <p className="text-[10px] text-zinc-400 uppercase">Redeemed By</p>
                  <p className="text-emerald-300 mt-0.5">{detailsRecord.redeemedBy || '—'}</p>
                </div>
                <div className="rounded-lg bg-white/5 p-2.5">
                  <p className="text-[10px] text-zinc-400 uppercase">Redeemed At</p>
                  <p className="text-white mt-0.5">
                    {formatDateTime(detailsRecord.redeemedAtIso)}
                  </p>
                </div>
                <div className="col-span-2 rounded-lg bg-white/5 p-2.5">
                  <p className="text-[10px] text-zinc-400 uppercase">Customer / Tournament Note</p>
                  <p className="text-white mt-0.5">{detailsRecord.customerNote || '—'}</p>
                </div>
                <div className="col-span-2 rounded-lg bg-white/5 p-2.5">
                  <p className="text-[10px] text-zinc-400 uppercase">Tournament ID</p>
                  <p className="font-mono text-sky-300 mt-0.5">
                    {detailsRecord.tournamentId
                      ? `${detailsRecord.tournamentName ? `${detailsRecord.tournamentName} — ` : ''}${detailsRecord.tournamentId}`
                      : 'Not bound to a tournament yet'}
                  </p>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-white/10 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => void handleCopyText(buildShareMessage(detailsRecord), 'detail-msg')}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
              >
                {copiedKey === 'detail-msg' ? 'Message Copied' : 'Copy Share Msg'}
              </button>
              <button
                type="button"
                onClick={() => setDetailsRecord(null)}
                className="px-4 py-2 rounded-lg bg-[#FFE600] text-[#070B28] text-xs font-black uppercase"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
