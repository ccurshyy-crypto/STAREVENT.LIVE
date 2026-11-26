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

interface OverlayAccessModalProps {
  open: boolean;
  onClose: () => void;
  onUnlockedSuccess?: () => void;
  onOpenOwnerAdmin?: () => void;
}

export function OverlayAccessModal({
  open,
  onClose,
  onUnlockedSuccess,
  onOpenOwnerAdmin,
}: OverlayAccessModalProps) {
  const { session, isUnlocked, unlockWithCredentials, lockAndLogout } = useOverlayAccess();
  const [accessId, setAccessId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setErrorMsg(null);
    }
  }, [open]);

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
      <div className="relative w-full max-w-lg rounded-2xl wo-card text-slate-900 overflow-hidden my-auto shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 wo-header flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-white" aria-hidden="true" />
            <span className="font-display font-black text-sm sm:text-base text-white tracking-wide uppercase">
              Overlay Access
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-white/90 hover:text-white hover:bg-white/15"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {isUnlocked && session ? (
            <div className="space-y-5 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <LockOpen className="w-7 h-7 text-emerald-600" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#FF8C00]">
                  Full Overlays Unlocked
                </p>
                <h2 className="font-display text-2xl font-black text-slate-900">
                  {session.accessId}
                </h2>
                {session.label && (
                  <p className="text-sm text-slate-500">{session.label}</p>
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
                    className="flex-1 min-h-[46px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl wo-btn-primary text-white font-display font-black text-sm uppercase tracking-wide"
                  >
                    Open Overlays Workspace
                  </button>
                )}
                <button
                  type="button"
                  onClick={lockAndLogout}
                  className="flex-1 min-h-[46px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-display font-bold text-sm uppercase tracking-wide transition-colors"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  Lock / Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-xl bg-[#FFF3E0] border border-[#FF8C00]/30 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-[#FF8C00]" aria-hidden="true" />
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-black text-slate-900">
                  User Login
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Enter the Login ID and Password provided by the Main Admin.
                </p>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs sm:text-sm font-medium text-red-700"
                >
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="modal-access-id"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    Login ID (Access ID)
                  </label>
                  <input
                    id="modal-access-id"
                    type="text"
                    autoComplete="username"
                    value={accessId}
                    onChange={(e) => setAccessId(e.target.value)}
                    placeholder="e.g. STAREVENTLIVE35484"
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 focus:border-[#FF8C00] focus:outline-none text-sm font-mono text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="modal-access-password"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700"
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
                      className="w-full pl-4 pr-11 py-3 rounded-xl bg-white border border-slate-300 focus:border-[#FF8C00] focus:outline-none text-sm text-slate-900 placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-[#FF8C00] rounded-lg"
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
                  className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl wo-btn-primary disabled:opacity-60 text-white font-display font-black text-sm sm:text-base uppercase tracking-wide"
                >
                  <LockOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{submitting ? 'Verifying...' : 'Unlock Overlays'}</span>
                </button>
              </form>
            </div>
          )}

          {onOpenOwnerAdmin && (
            <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500">
                Main Admin? Create &amp; manage user IDs:
              </span>
              <button
                type="button"
                onClick={onOpenOwnerAdmin}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg wo-btn-soft text-xs font-bold whitespace-nowrap"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#FF8C00]" aria-hidden="true" />
                <span>Open Admin Panel</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
