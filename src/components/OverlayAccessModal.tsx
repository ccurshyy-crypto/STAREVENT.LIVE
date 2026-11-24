import { FormEvent, useEffect, useState } from 'react';
import {
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LockOpen,
  LogOut,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useOverlayAccess } from '../context/OverlayAccessContext';
import { AdminAccessKeysPanel } from './AdminAccessKeysPanel';

interface OverlayAccessModalProps {
  open: boolean;
  initialView?: 'login' | 'admin';
  onClose: () => void;
  onUnlockedSuccess?: () => void;
}

export function OverlayAccessModal({
  open,
  initialView = 'login',
  onClose,
  onUnlockedSuccess,
}: OverlayAccessModalProps) {
  const { session, isUnlocked, unlockWithCredentials, lockAndLogout } = useOverlayAccess();
  const [view, setView] = useState<'login' | 'admin'>(initialView);
  const [accessId, setAccessId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setView(initialView);
      setErrorMsg(null);
    }
  }, [open, initialView]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    const res = await unlockWithCredentials(accessId, password);
    setSubmitting(false);

    if (!res.ok) {
      setErrorMsg(res.error || 'Invalid Access ID or Password.');
      return;
    }

    setAccessId('');
    setPassword('');
    onClose();
    onUnlockedSuccess?.();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Overlay Access"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-[#111116] border border-[#FFE600]/40 shadow-[0_24px_70px_rgba(0,0,0,0.85)] overflow-hidden my-auto">
        {/* Top Crimson-Gold Accent */}
        <div className="h-1 w-full bg-gradient-to-r from-[#DC2626] via-[#FFE600] to-[#DC2626]" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3 bg-[#15151C]">
          <div className="flex items-center gap-2">
            {view === 'admin' ? (
              <ShieldCheck className="w-5 h-5 text-[#FFE600]" aria-hidden="true" />
            ) : (
              <KeyRound className="w-5 h-5 text-[#FFE600]" aria-hidden="true" />
            )}
            <span className="font-display font-black text-sm sm:text-base text-white tracking-wide uppercase">
              {view === 'admin' ? 'Admin Panel' : 'Overlay Access'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setView((prev) => (prev === 'admin' ? 'login' : 'admin'));
                setErrorMsg(null);
              }}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-bold text-[#FFE600] whitespace-nowrap"
            >
              {view === 'admin' ? 'Client Unlock' : 'Admin Panel'}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {view === 'admin' ? (
            <AdminAccessKeysPanel />
          ) : isUnlocked && session ? (
            <div className="space-y-5 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-400/45 flex items-center justify-center">
                <LockOpen className="w-7 h-7 text-emerald-400" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#FFE600]">
                  Full Overlays Unlocked
                </p>
                <h2 className="font-display text-2xl font-black text-white">
                  {session.accessId}
                </h2>
                {session.label && (
                  <p className="text-sm text-zinc-400">{session.label}</p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                {onUnlockedSuccess && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onUnlockedSuccess();
                    }}
                    className="flex-1 min-h-[46px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#FFE600] hover:bg-[#FEF08A] text-[#09090D] font-display font-black text-sm uppercase tracking-wide"
                  >
                    Open Overlays Studio
                  </button>
                )}
                <button
                  type="button"
                  onClick={lockAndLogout}
                  className="flex-1 min-h-[46px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#DC2626] hover:bg-[#EF4444] text-white font-display font-bold text-sm uppercase tracking-wide"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  Lock / Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-xl bg-[#DC2626]/20 border border-[#FFE600]/45 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-[#FFE600]" aria-hidden="true" />
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-black text-white">
                  Unlock Overlays &amp; Scoreboards
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400">
                  Enter your Star Event Live Access ID and Password.
                </p>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="rounded-xl bg-red-950/75 border border-red-500/50 px-4 py-3 text-xs sm:text-sm font-medium text-red-100"
                >
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="modal-access-id"
                    className="block text-xs font-bold uppercase tracking-wider text-zinc-300"
                  >
                    Access ID
                  </label>
                  <input
                    id="modal-access-id"
                    type="text"
                    autoComplete="username"
                    value={accessId}
                    onChange={(e) => setAccessId(e.target.value)}
                    placeholder="e.g. STAR-101"
                    className="w-full px-4 py-3 rounded-xl bg-[#09090D] border border-white/15 focus:border-[#FFE600] focus:outline-none text-sm font-mono text-white placeholder:text-zinc-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="modal-access-password"
                    className="block text-xs font-bold uppercase tracking-wider text-zinc-300"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="modal-access-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full pl-4 pr-11 py-3 rounded-xl bg-[#09090D] border border-white/15 focus:border-[#FFE600] focus:outline-none text-sm text-white placeholder:text-zinc-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-white rounded-lg"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#FFE600] to-[#FACC15] hover:from-[#FEF08A] hover:to-[#FFE600] disabled:opacity-60 text-[#09090D] font-display font-black text-sm sm:text-base uppercase tracking-wide transition-colors"
                >
                  <LockOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{submitting ? 'Verifying...' : 'Unlock Overlays'}</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
