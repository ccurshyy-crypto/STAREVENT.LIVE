import { FormEvent, useState } from 'react';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
} from 'lucide-react';
import { useOverlayAccess } from '../context/OverlayAccessContext';
import { Language, tLang } from '../data/content';
import { CricketSuiteApp } from './cricket/CricketSuiteApp';

interface OverlaysPageProps {
  lang: Language;
  onBackHome: () => void;
}

export function OverlaysPage({ lang, onBackHome }: OverlaysPageProps) {
  const { session, isUnlocked, isReady, unlockWithCredentials, lockAndLogout } =
    useOverlayAccess();

  const [accessIdInput, setAccessIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleUnlockSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginBusy(true);
    const res = await unlockWithCredentials(accessIdInput, passwordInput);
    setLoginBusy(false);

    if (!res.ok) {
      setLoginError(res.error || 'Invalid Access ID or Password.');
      return;
    }

    setAccessIdInput('');
    setPasswordInput('');
  };

  if (!isReady) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 text-[#F4F4F5]">
        <div className="bg-[#111116] border border-white/15 rounded-2xl px-8 py-6 text-center space-y-2 shadow-2xl">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#FFE600]">
            Star Event Live · Overlay Access
          </p>
          <p className="text-sm text-zinc-300">Verifying overlay access...</p>
        </div>
      </div>
    );
  }

  // Locked Gate: ONLY Access ID + Password + Unlock Overlays (zero admin UI visible to users)
  if (!isUnlocked || !session) {
    return (
      <div className="min-h-[75vh] text-[#F4F4F5] py-8 sm:py-14 px-3 sm:px-6 lg:px-8">
        <div className="max-w-lg mx-auto space-y-5">
          <div className="flex items-center justify-start">
            <button
              type="button"
              onClick={onBackHome}
              className="btn-glass-pro inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-zinc-100 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600]"
            >
              <ArrowLeft className="w-4 h-4 text-[#FFE600]" aria-hidden="true" />
              <span>
                {tLang(
                  {
                    en: 'Back to Home',
                    mr: 'मुख्य पृष्ठावर परत जा',
                    hi: 'होम पेज पर वापस जाएं',
                    gu: 'હોમ પેજ પર પાછા જાઓ',
                  },
                  lang
                )}
              </span>
            </button>
          </div>

          <div className="bg-[#111116] border border-[#FFE600]/35 rounded-2xl overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.78)]">
            <div className="h-1 w-full bg-gradient-to-r from-[#DC2626] via-[#FFE600] to-[#DC2626]" />

            <div className="p-5 sm:p-8 space-y-6">
              <div className="text-center space-y-2.5">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[#DC2626]/20 border border-[#FFE600]/45 flex items-center justify-center">
                  <Lock className="w-7 h-7 text-[#FFE600]" aria-hidden="true" />
                </div>
                <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#FFE600]">
                  STAR EVENT LIVE · OVERLAY ACCESS
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-black text-white leading-tight">
                  User Login
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400">
                  Sign in with the Login ID and Password provided by the Main Admin to open your dashboard, live scoring, and overlay links.
                </p>
              </div>

              {loginError && (
                <div
                  role="alert"
                  className="bg-red-950/75 border border-red-500/50 rounded-xl px-4 py-3 text-xs sm:text-sm font-medium text-red-100"
                >
                  {loginError}
                </div>
              )}

              <form onSubmit={handleUnlockSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="overlays-access-id"
                    className="block text-xs font-bold uppercase tracking-wider text-zinc-300"
                  >
                    Login ID (Access ID)
                  </label>
                  <input
                    id="overlays-access-id"
                    type="text"
                    autoComplete="username"
                    value={accessIdInput}
                    onChange={(e) => setAccessIdInput(e.target.value)}
                    placeholder="e.g. STAREVENTLIVE35484"
                    className="w-full px-4 py-3 rounded-xl bg-[#09090D] border border-white/15 focus:border-[#FF8C00] focus:outline-none text-sm font-mono text-white placeholder:text-zinc-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="overlays-access-password"
                    className="block text-xs font-bold uppercase tracking-wider text-zinc-300"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="overlays-access-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
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
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginBusy}
                  className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#FFE600] to-[#FACC15] hover:from-[#FEF08A] hover:to-[#FFE600] disabled:opacity-60 text-[#09090D] font-display font-black text-sm sm:text-base uppercase tracking-wide transition-colors"
                >
                  <LockOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{loginBusy ? 'Verifying...' : 'Unlock Overlays'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Unlocked State: Complete User Dashboard, Live Scoring & Single Permanent Overlay Link
  return (
    <CricketSuiteApp
      session={session}
      onLogout={lockAndLogout}
      onBackHome={onBackHome}
    />
  );
}
