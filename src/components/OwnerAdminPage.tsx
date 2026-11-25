import { FormEvent, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { AdminAccessKeysPanel } from './AdminAccessKeysPanel';

interface OwnerAdminPageProps {
  onBackHome: () => void;
}

interface AdminAuthStatus {
  configured: boolean;
  claimed: boolean;
  requiresClaim: boolean;
}

/**
 * Private Owner-Only Admin Route (`/owner-admin`).
 * Never linked or exposed in normal user UI, navbar, sidebar, header, or client login screens.
 * Admin Bearer session token is kept strictly in React memory (never localStorage/sessionStorage).
 */
export function OwnerAdminPage({ onBackHome }: OwnerAdminPageProps) {
  const [statusLoading, setStatusLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState<AdminAuthStatus>({
    configured: false,
    claimed: false,
    requiresClaim: false,
  });

  // Ephemeral in-memory Bearer token (never persisted in Web Storage)
  const [adminToken, setAdminToken] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadStatus = async () => {
      setStatusLoading(true);
      try {
        const res = await fetch('/api/admin/status', { cache: 'no-store' });
        if (!res.ok) throw new Error('Unable to reach owner admin service.');
        const data = (await res.json()) as AdminAuthStatus;
        if (active) {
          setAuthStatus(data);
        }
      } catch {
        if (active) {
          setErrorMsg('Could not verify owner admin status. Please refresh and try again.');
        }
      } finally {
        if (active) setStatusLoading(false);
      }
    };
    void loadStatus();
    return () => {
      active = false;
    };
  }, []);

  const handleClaimOwnerPassword = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const trimmed = password.trim();
    if (trimmed.length < 8) {
      setErrorMsg('Choose an owner password of at least 8 characters.');
      return;
    }
    if (trimmed !== confirmPassword.trim()) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: trimmed }),
      });
      const data = (await res.json()) as { ok?: boolean; token?: string; error?: string };
      if (!res.ok || !data.ok || !data.token) {
        setErrorMsg(data.error || 'Could not save owner admin password.');
        return;
      }
      setAdminToken(data.token);
      setAuthStatus({ configured: false, claimed: true, requiresClaim: false });
      setPassword('');
      setConfirmPassword('');
    } catch {
      setErrorMsg('Network error while setting up owner admin access.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOwnerLogin = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const trimmed = password.trim();
    if (!trimmed) {
      setErrorMsg('Enter your owner admin password.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: trimmed }),
      });
      const data = (await res.json()) as { ok?: boolean; token?: string; error?: string };
      if (!res.ok || !data.ok || !data.token) {
        setErrorMsg(data.error || 'Invalid owner admin password.');
        return;
      }
      setAdminToken(data.token);
      setPassword('');
    } catch {
      setErrorMsg('Network error while verifying owner admin password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLockAdmin = async () => {
    const token = adminToken;
    setAdminToken(null);
    if (token) {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Ignore network errors on logout
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#09090D] text-[#F4F4F5] py-8 sm:py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs sm:text-sm font-semibold text-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#FFE600]" aria-hidden="true" />
            <span>Back to Star Event Live</span>
          </button>

          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Owner Restricted Route
          </span>
        </div>

        <div className="rounded-2xl bg-[#111116] border border-[#FFE600]/35 overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.85)]">
          <div className="h-1 w-full bg-gradient-to-r from-[#DC2626] via-[#FFE600] to-[#DC2626]" />

          <div className="p-5 sm:p-8">
            {statusLoading ? (
              <div className="py-12 text-center space-y-2">
                <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#FFE600]">
                  Star Event Live · Owner Access
                </p>
                <p className="text-sm text-zinc-400">Checking owner session...</p>
              </div>
            ) : adminToken ? (
              <AdminAccessKeysPanel onLockAdmin={() => void handleLockAdmin()} />
            ) : authStatus.requiresClaim ? (
              <div className="max-w-md mx-auto space-y-5">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-[#DC2626]/20 border border-[#FFE600]/45 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-[#FFE600]" aria-hidden="true" />
                  </div>
                  <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#FFE600]">
                    First-Run Owner Setup
                  </p>
                  <h1 className="font-display text-2xl font-black text-white">
                    Claim Owner Admin Access
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-400">
                    Set your private owner password to lock the ID &amp; Password Generator exclusively to you. You can also set <span className="font-mono text-zinc-200">ADMIN_PASSCODE</span> in server secrets to override this anytime.
                  </p>
                </div>

                {errorMsg && (
                  <div
                    role="alert"
                    className="rounded-xl bg-red-950/75 border border-red-500/50 px-4 py-2.5 text-xs font-semibold text-red-100 text-center"
                  >
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleClaimOwnerPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="owner-claim-password"
                      className="block text-xs font-bold uppercase tracking-wider text-zinc-300"
                    >
                      New Owner Password (min 8 chars)
                    </label>
                    <div className="relative">
                      <input
                        id="owner-claim-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create strong owner password"
                        className="w-full pl-4 pr-11 py-3 rounded-xl bg-[#09090D] border border-white/15 focus:border-[#FFE600] focus:outline-none text-sm text-white placeholder:text-zinc-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="owner-claim-confirm"
                      className="block text-xs font-bold uppercase tracking-wider text-zinc-300"
                    >
                      Confirm Owner Password
                    </label>
                    <input
                      id="owner-claim-confirm"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter owner password"
                      className="w-full px-4 py-3 rounded-xl bg-[#09090D] border border-white/15 focus:border-[#FFE600] focus:outline-none text-sm text-white placeholder:text-zinc-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#FFE600] hover:bg-[#FEF08A] disabled:opacity-60 text-[#09090D] font-display font-black text-sm uppercase tracking-wide transition-colors"
                  >
                    <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{submitting ? 'Claiming...' : 'Set Password & Open Admin Panel'}</span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="max-w-md mx-auto space-y-5">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-[#DC2626]/20 border border-[#FFE600]/45 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-[#FFE600]" aria-hidden="true" />
                  </div>
                  <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#FFE600]">
                    STAR EVENT LIVE · OWNER ONLY
                  </p>
                  <h1 className="font-display text-2xl font-black text-white">
                    Owner Admin Login
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-400">
                    Sign in with your owner admin password to generate and manage client Access IDs.
                  </p>
                </div>

                {errorMsg && (
                  <div
                    role="alert"
                    className="rounded-xl bg-red-950/75 border border-red-500/50 px-4 py-2.5 text-xs font-semibold text-red-100 text-center"
                  >
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleOwnerLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="owner-admin-password"
                      className="block text-xs font-bold uppercase tracking-wider text-zinc-300"
                    >
                      Owner Admin Password
                    </label>
                    <div className="relative">
                      <input
                        id="owner-admin-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter owner admin password"
                        className="w-full pl-4 pr-11 py-3 rounded-xl bg-[#09090D] border border-white/15 focus:border-[#FFE600] focus:outline-none text-sm text-white placeholder:text-zinc-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#FFE600] hover:bg-[#FEF08A] disabled:opacity-60 text-[#09090D] font-display font-black text-sm uppercase tracking-wide transition-colors"
                  >
                    <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{submitting ? 'Verifying...' : 'Open Admin Panel'}</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
