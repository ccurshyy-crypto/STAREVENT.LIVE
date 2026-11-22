import { FormEvent, useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogIn,
  LogOut,
  MonitorPlay,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X,
} from 'lucide-react';
import {
  formatCredentialsCopyText,
  generateLoginIdBase,
  generateSecurePassword,
  OperatorUserAccount,
  ProvisionedCredentials,
  SUPER_ADMIN_EMAIL,
  useAuth,
} from '../context/AuthContext';
import { Language } from '../data/content';
import { FIREBASE_CONSOLE_AUTH_URL } from '../firebase';

interface AccountPortalModalProps {
  open: boolean;
  initialTab?: 'operator' | 'admin';
  lang: Language;
  onClose: () => void;
  onOpenUserScoreboard: (matchRoomId: string, uid?: string) => void;
}

function parseAuthError(err: unknown): { message: string; isEmailAuthDisabled: boolean } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('auth/operation-not-allowed')) {
    return {
      isEmailAuthDisabled: true,
      message:
        'Email/Password Sign-In is not enabled yet in your Firebase Console. Click the button below → Enable "Email/Password" → Save, then click Create User again.',
    };
  }
  if (raw.includes('auth/invalid-credential') || raw.includes('auth/wrong-password') || raw.includes('auth/user-not-found')) {
    return {
      isEmailAuthDisabled: false,
      message: 'Invalid Login ID or Password. Please check your credentials and try again.',
    };
  }
  if (raw.includes('auth/popup-closed-by-user')) {
    return {
      isEmailAuthDisabled: false,
      message: 'Google Sign-In popup was closed before completing sign-in.',
    };
  }
  if (raw.includes('auth/weak-password')) {
    return {
      isEmailAuthDisabled: false,
      message: 'Password must be at least 6 characters long.',
    };
  }
  if (raw.includes('auth/too-many-requests')) {
    return {
      isEmailAuthDisabled: false,
      message: 'Too many attempts. Please wait a moment and try again.',
    };
  }
  return {
    isEmailAuthDisabled: false,
    message: raw.replace(/^Firebase:\s*/i, ''),
  };
}

export function AccountPortalModal({
  open,
  initialTab = 'operator',
  lang,
  onClose,
  onOpenUserScoreboard,
}: AccountPortalModalProps) {
  const {
    firebaseUser,
    isSuperAdmin,
    userAccount,
    managedUsers,
    usersLoading,
    signInSuperAdminWithGoogle,
    signInOperatorWithLoginId,
    signUpOperatorUser,
    signOutUser,
    resolveUniqueLoginId,
    createOperatorUser,
    resetOperatorPassword,
    toggleOperatorStatus,
    deleteOperatorAccount,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'operator' | 'signup' | 'admin'>(initialTab);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Operator Login form state
  const [loginIdInput, setLoginIdInput] = useState('');
  const [loginPasswordInput, setLoginPasswordInput] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Self-Service User Sign Up form state
  const [signupFullName, setSignupFullName] = useState('');
  const [signupPreviewLoginId, setSignupPreviewLoginId] = useState('');
  const [signupCheckingId, setSignupCheckingId] = useState(false);
  const [signupPasswordMode, setSignupPasswordMode] = useState<'manual' | 'auto'>('manual');
  const [signupManualPassword, setSignupManualPassword] = useState('');
  const [signupAutoPassword, setSignupAutoPassword] = useState(() => generateSecurePassword(12));
  const [showSignupPassword, setShowSignupPassword] = useState(true);
  const [signupBusy, setSignupBusy] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupNeedsEmailSetup, setSignupNeedsEmailSetup] = useState(false);
  const [signupCredentials, setSignupCredentials] = useState<ProvisionedCredentials | null>(null);

  // Super Admin Create User form state
  const [fullNameInput, setFullNameInput] = useState('');
  const [previewLoginId, setPreviewLoginId] = useState('');
  const [checkingLoginId, setCheckingLoginId] = useState(false);
  const [passwordMode, setPasswordMode] = useState<'auto' | 'manual'>('auto');
  const [autoPasswordDraft, setAutoPasswordDraft] = useState(() => generateSecurePassword(12));
  const [manualPasswordInput, setManualPasswordInput] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(true);
  const [createBusy, setCreateBusy] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [needsEmailProviderSetup, setNeedsEmailProviderSetup] = useState(false);

  // Post-Creation / Post-Reset Credentials Display Card
  const [latestCredentials, setLatestCredentials] = useState<ProvisionedCredentials | null>(null);
  const [showLatestPassword, setShowLatestPassword] = useState(true);

  // Password Reset Drawer state (Super Admin only)
  const [resetTarget, setResetTarget] = useState<OperatorUserAccount | null>(null);
  const [resetPasswordMode, setResetPasswordMode] = useState<'auto' | 'manual'>('auto');
  const [resetAutoDraft, setResetAutoDraft] = useState(() => generateSecurePassword(12));
  const [resetManualInput, setResetManualInput] = useState('');
  const [resetBusy, setResetBusy] = useState(false);

  // Inline Delete Confirmation state
  const [confirmDeleteUid, setConfirmDeleteUid] = useState<string | null>(null);
  const [rowBusyUid, setRowBusyUid] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (isSuperAdmin) {
      setActiveTab('admin');
    } else if (userAccount) {
      setActiveTab('operator');
    } else {
      setActiveTab(initialTab);
    }
  }, [open, initialTab, isSuperAdmin, userAccount]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  // Live preview unique Login ID from Full Name (checks collisions like CRUSHYY → CRUSHYY01)
  useEffect(() => {
    if (!isSuperAdmin) return;
    const trimmed = fullNameInput.trim();
    if (trimmed.length < 2) {
      setPreviewLoginId('');
      setCheckingLoginId(false);
      return;
    }

    const immediateBase = generateLoginIdBase(trimmed);
    setPreviewLoginId(immediateBase);
    setCheckingLoginId(true);

    let cancelled = false;
    const timer = window.setTimeout(() => {
      resolveUniqueLoginId(trimmed)
        .then((resolved) => {
          if (!cancelled) {
            setPreviewLoginId(resolved);
          }
        })
        .catch(() => {
          // Keep immediate base preview
        })
        .finally(() => {
          if (!cancelled) setCheckingLoginId(false);
        });
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [fullNameInput, isSuperAdmin, resolveUniqueLoginId, managedUsers.length]);

  // Live preview unique Login ID during Self-Service Sign Up
  useEffect(() => {
    if (activeTab !== 'signup') return;
    const trimmed = signupFullName.trim();
    if (trimmed.length < 2) {
      setSignupPreviewLoginId('');
      setSignupCheckingId(false);
      return;
    }

    const immediateBase = generateLoginIdBase(trimmed);
    setSignupPreviewLoginId(immediateBase);
    setSignupCheckingId(true);

    let cancelled = false;
    const timer = window.setTimeout(() => {
      resolveUniqueLoginId(trimmed)
        .then((resolved) => {
          if (!cancelled) setSignupPreviewLoginId(resolved);
        })
        .catch(() => {
          // Keep base preview
        })
        .finally(() => {
          if (!cancelled) setSignupCheckingId(false);
        });
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [signupFullName, activeTab, resolveUniqueLoginId]);

  if (!open) return null;

  const copyValue = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((curr) => (curr === key ? null : curr));
      }, 2200);
    } catch {
      setCopiedKey(null);
    }
  };

  const handleOperatorLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginBusy(true);
    try {
      const account = await signInOperatorWithLoginId(loginIdInput, loginPasswordInput);
      setLoginPasswordInput('');
      onOpenUserScoreboard(account.matchRoomId, account.uid);
      onClose();
    } catch (err) {
      setLoginError(parseAuthError(err).message);
    } finally {
      setLoginBusy(false);
    }
  };

  const handleOperatorSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setSignupError(null);
    setSignupNeedsEmailSetup(false);

    const passwordToUse =
      signupPasswordMode === 'manual' ? signupManualPassword.trim() : signupAutoPassword;

    if (signupFullName.trim().length < 2) {
      setSignupError('Please enter your Full Name (at least 2 characters).');
      return;
    }
    if (passwordToUse.length < 6) {
      setSignupError('Password must be at least 6 characters long.');
      return;
    }

    setSignupBusy(true);
    try {
      const creds = await signUpOperatorUser({
        fullName: signupFullName.trim(),
        password: passwordToUse,
      });
      setSignupCredentials(creds);
      setSignupFullName('');
      setSignupPreviewLoginId('');
      setSignupManualPassword('');
      setSignupAutoPassword(generateSecurePassword(12));
    } catch (err) {
      const parsed = parseAuthError(err);
      setSignupError(parsed.message);
      setSignupNeedsEmailSetup(parsed.isEmailAuthDisabled);
    } finally {
      setSignupBusy(false);
    }
  };

  const handleSuperAdminGoogleLogin = async () => {
    setAdminError(null);
    setNeedsEmailProviderSetup(false);
    setLoginBusy(true);
    try {
      await signInSuperAdminWithGoogle();
    } catch (err) {
      setAdminError(parseAuthError(err).message);
    } finally {
      setLoginBusy(false);
    }
  };

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setNeedsEmailProviderSetup(false);

    const passwordToUse =
      passwordMode === 'manual' ? manualPasswordInput.trim() : autoPasswordDraft;

    if (fullNameInput.trim().length < 2) {
      setAdminError('Please enter Full Name first (at least 2 characters).');
      return;
    }
    if (passwordToUse.length < 6) {
      setAdminError('Password must be at least 6 characters long.');
      return;
    }

    setCreateBusy(true);
    try {
      const creds = await createOperatorUser({
        fullName: fullNameInput.trim(),
        manualPassword: passwordToUse,
      });
      setLatestCredentials(creds);
      setShowLatestPassword(true);
      setFullNameInput('');
      setPreviewLoginId('');
      setManualPasswordInput('');
      setAutoPasswordDraft(generateSecurePassword(12));
    } catch (err) {
      const parsed = parseAuthError(err);
      setAdminError(parsed.message);
      setNeedsEmailProviderSetup(parsed.isEmailAuthDisabled);
    } finally {
      setCreateBusy(false);
    }
  };

  const handleConfirmPasswordReset = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setAdminError(null);
    setNeedsEmailProviderSetup(false);

    const nextPass =
      resetPasswordMode === 'manual' ? resetManualInput.trim() : resetAutoDraft;
    if (nextPass.length < 6) {
      setAdminError('New password must be at least 6 characters.');
      return;
    }

    setResetBusy(true);
    try {
      const creds = await resetOperatorPassword(resetTarget, nextPass);
      setLatestCredentials(creds);
      setShowLatestPassword(true);
      setResetTarget(null);
      setResetManualInput('');
      setResetAutoDraft(generateSecurePassword(12));
    } catch (err) {
      const parsed = parseAuthError(err);
      setAdminError(parsed.message);
      setNeedsEmailProviderSetup(parsed.isEmailAuthDisabled);
    } finally {
      setResetBusy(false);
    }
  };

  const handleToggleStatus = async (account: OperatorUserAccount) => {
    setRowBusyUid(account.uid);
    setAdminError(null);
    try {
      await toggleOperatorStatus(account);
    } catch (err) {
      setAdminError(parseAuthError(err).message);
    } finally {
      setRowBusyUid(null);
    }
  };

  const handleDeleteUser = async (account: OperatorUserAccount) => {
    setRowBusyUid(account.uid);
    setAdminError(null);
    try {
      await deleteOperatorAccount(account);
      setConfirmDeleteUid(null);
    } catch (err) {
      setAdminError(parseAuthError(err).message);
    } finally {
      setRowBusyUid(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="User Login & Super Admin Account Console"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/82 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-[#0E1018] border border-white/15 shadow-[0_28px_80px_rgba(0,0,0,0.85)] text-[#F4F4F5]"
      >
        {/* Top Header */}
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-[#121521]/95 backdrop-blur-md border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FACC15]/20 to-[#EF4444]/20 border border-[#FACC15]/40 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#FACC15]" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-extrabold text-white">
                {lang === 'mr'
                  ? 'युझर लॉगिन व सुपर अ‍ॅडमिन अकाउंट सिस्टम'
                  : 'User Login & Super Admin Accounts'}
              </h2>
              <p className="text-xs text-zinc-400">
                Firebase Authentication · Isolated Scoreboards &amp; Dedicated vMix URLs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {firebaseUser && (
              <button
                type="button"
                onClick={() => void signOutUser()}
                className="btn-glass-pro inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-200 hover:text-white"
              >
                <LogOut className="w-3.5 h-3.5 text-[#EF4444]" aria-hidden="true" />
                <span>Sign Out</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close portal"
              className="w-9 h-9 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Role Mode Switcher */}
        <div className="px-5 pt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex flex-wrap p-1 rounded-xl bg-[#151927] border border-white/10 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('operator')}
              className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                activeTab === 'operator'
                  ? 'bg-[#2563EB] text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4" aria-hidden="true" />
              <span>Login</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('signup')}
              className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                activeTab === 'signup'
                  ? 'bg-[#16A34A] text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" aria-hidden="true" />
              <span>Sign Up</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                activeTab === 'admin'
                  ? 'bg-[#DC2626] text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-[#FACC15]" aria-hidden="true" />
              <span>Super Admin</span>
            </button>
          </div>

          {firebaseUser && (
            <div className="text-xs font-mono text-zinc-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#4ADE80]" />
              {isSuperAdmin ? (
                <span className="text-[#FACC15] font-bold">
                  SUPER ADMIN · {firebaseUser.email}
                </span>
              ) : userAccount ? (
                <span className="text-[#38BDF8] font-bold">
                  {userAccount.fullName} ({userAccount.loginId})
                </span>
              ) : (
                <span>{firebaseUser.email}</span>
              )}
            </div>
          )}
        </div>

        <div className="p-5 space-y-6">
          {/* ==============================================================
              TAB 1: OPERATOR LOGIN & ISOLATED SCOREBOARD CARD
             ============================================================== */}
          {activeTab === 'operator' && (
            <div className="space-y-5">
              {userAccount ? (
                <div className="rounded-2xl bg-[#131929] border border-[#38BDF8]/35 p-5 sm:p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-mono font-bold text-[#4ADE80]">
                        AUTHENTICATED OPERATOR SESSION
                      </p>
                      <h3 className="font-display text-xl font-extrabold text-white mt-1">
                        {userAccount.fullName}
                      </h3>
                      <p className="text-xs font-mono text-zinc-400 mt-0.5">
                        Login ID: <span className="text-[#FACC15] font-bold">{userAccount.loginId}</span> · Match ID:{' '}
                        <span className="text-white font-bold">{userAccount.matchRoomId}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenUserScoreboard(userAccount.matchRoomId, userAccount.uid);
                        onClose();
                      }}
                      className="btn-gold-pro inline-flex items-center gap-2 px-5 py-3 text-sm font-extrabold rounded-xl"
                    >
                      <MonitorPlay className="w-4 h-4" aria-hidden="true" />
                      <span>Open My Scoreboard</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl bg-[#0B0E17] border border-white/10 p-4 space-y-2">
                      <p className="text-[11px] font-mono font-bold text-[#FACC15]">
                        MY SEPARATE SCOREBOARD URL
                      </p>
                      <p className="text-xs font-mono text-zinc-300 break-all">
                        {userAccount.scoreboardUrl}
                      </p>
                      <button
                        type="button"
                        onClick={() => copyValue('op-sb', userAccount.scoreboardUrl)}
                        className="btn-glass-pro inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg"
                      >
                        {copiedKey === 'op-sb' ? (
                          <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-[#FACC15]" />
                        )}
                        <span>{copiedKey === 'op-sb' ? 'Copied!' : 'Copy Scoreboard URL'}</span>
                      </button>
                    </div>

                    <div className="rounded-xl bg-[#0B0E17] border border-white/10 p-4 space-y-2">
                      <p className="text-[11px] font-mono font-bold text-[#38BDF8]">
                        MY SEPARATE vMix OVERLAY URL (TRANSPARENT)
                      </p>
                      <p className="text-xs font-mono text-zinc-300 break-all">
                        {userAccount.vmixOverlayUrl}
                      </p>
                      <button
                        type="button"
                        onClick={() => copyValue('op-vmix', userAccount.vmixOverlayUrl)}
                        className="btn-glass-pro inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg"
                      >
                        {copiedKey === 'op-vmix' ? (
                          <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-[#38BDF8]" />
                        )}
                        <span>{copiedKey === 'op-vmix' ? 'Copied!' : 'Copy vMix URL'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleOperatorLogin}
                  className="max-w-lg mx-auto rounded-2xl bg-[#131724] border border-white/12 p-6 space-y-5"
                >
                  <div className="space-y-1">
                    <h3 className="font-display text-lg font-extrabold text-white">
                      Operator User Sign In
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Enter the unique Login ID and Password given by Super Admin to open your isolated Kabaddi Scoreboard &amp; vMix URL.
                    </p>
                  </div>

                  {loginError && (
                    <div className="rounded-xl bg-red-500/12 border border-red-500/40 px-3.5 py-2.5 text-xs text-red-200 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label
                      htmlFor="operator-login-id"
                      className="block text-xs font-bold text-zinc-300 uppercase tracking-wider"
                    >
                      Unique Login ID
                    </label>
                    <input
                      id="operator-login-id"
                      type="text"
                      value={loginIdInput}
                      onChange={(e) =>
                        setLoginIdInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                      }
                      placeholder="e.g. BHARATNIRGUDA or CRUSHYY01"
                      autoComplete="username"
                      required
                      className="w-full px-4 py-3 text-sm font-mono font-bold tracking-wider uppercase bg-[#0A0D15] border border-white/15 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FACC15]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="operator-login-password"
                      className="block text-xs font-bold text-zinc-300 uppercase tracking-wider"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="operator-login-password"
                        type={showLoginPassword ? 'text' : 'password'}
                        value={loginPasswordInput}
                        onChange={(e) => setLoginPasswordInput(e.target.value)}
                        placeholder="Enter your unique password"
                        autoComplete="current-password"
                        required
                        className="w-full pl-4 pr-11 py-3 text-sm font-mono bg-[#0A0D15] border border-white/15 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FACC15]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((v) => !v)}
                        aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loginBusy}
                    className="btn-primary-pro w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-extrabold rounded-xl disabled:opacity-60"
                  >
                    <LogIn className="w-4 h-4" aria-hidden="true" />
                    <span>{loginBusy ? 'Signing In...' : 'Sign In & Open My Scoreboard'}</span>
                  </button>

                  <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-zinc-400">New user? Create your own account first:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginError(null);
                        setActiveTab('signup');
                      }}
                      className="font-bold text-[#4ADE80] hover:text-white transition-colors"
                    >
                      Sign Up / Create Account →
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ==============================================================
              TAB 2: SELF-SERVICE USER SIGN UP (CREATE ACCOUNT → THEN LOGIN)
             ============================================================== */}
          {activeTab === 'signup' && (
            <div className="space-y-5">
              {signupCredentials ? (
                <div className="rounded-2xl bg-gradient-to-br from-[#0F231B] via-[#101C28] to-[#171226] border-2 border-[#4ADE80]/60 p-5 sm:p-6 space-y-5 shadow-[0_18px_50px_rgba(16,185,129,0.2)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="inline-flex items-center gap-1.5 text-xs font-mono font-extrabold text-[#4ADE80]">
                        <Sparkles className="w-4 h-4" aria-hidden="true" />
                        <span>ACCOUNT CREATED! SAVE DETAILS &amp; LOGIN NOW</span>
                      </p>
                      <h3 className="font-display text-xl font-extrabold text-white">
                        {signupCredentials.fullName}
                      </h3>
                      <p className="text-xs text-zinc-300">
                        Your unique Login ID, Password, separate Scoreboard URL &amp; vMix Overlay URL are ready. Copy them, then click Login Now!
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        copyValue('signup-copy-all', formatCredentialsCopyText(signupCredentials))
                      }
                      className="btn-gold-pro inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-extrabold rounded-xl"
                    >
                      {copiedKey === 'signup-copy-all' ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      <span>
                        {copiedKey === 'signup-copy-all' ? 'ALL DETAILS COPIED!' : 'COPY ALL DETAILS'}
                      </span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl bg-black/40 border border-white/10 p-3.5">
                      <p className="text-[10px] font-mono uppercase text-zinc-400">Full Name</p>
                      <p className="text-sm font-bold text-white mt-1">
                        {signupCredentials.fullName}
                      </p>
                    </div>

                    <div className="rounded-xl bg-black/40 border border-[#FACC15]/35 p-3.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-mono uppercase text-[#FACC15]">
                          Your Unique Login ID
                        </p>
                        <p className="text-sm font-mono font-extrabold text-white mt-1 truncate">
                          {signupCredentials.loginId}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyValue('su-id', signupCredentials.loginId)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-200 shrink-0"
                        title="Copy Login ID"
                      >
                        {copiedKey === 'su-id' ? (
                          <Check className="w-4 h-4 text-[#4ADE80]" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className="rounded-xl bg-black/40 border border-[#4ADE80]/35 p-3.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-mono uppercase text-[#4ADE80]">
                          Your Password
                        </p>
                        <p className="text-sm font-mono font-extrabold text-white mt-1 truncate">
                          {signupCredentials.password}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyValue('su-pw', signupCredentials.password)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-200 shrink-0"
                        title="Copy Password"
                      >
                        {copiedKey === 'su-pw' ? (
                          <Check className="w-4 h-4 text-[#4ADE80]" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-xl bg-black/40 border border-white/10 p-3.5 space-y-1.5">
                      <p className="text-[10px] font-mono uppercase text-[#FACC15]">
                        Separate Scoreboard URL
                      </p>
                      <p className="text-xs font-mono text-zinc-200 break-all">
                        {signupCredentials.scoreboardUrl}
                      </p>
                    </div>
                    <div className="rounded-xl bg-black/40 border border-white/10 p-3.5 space-y-1.5">
                      <p className="text-[10px] font-mono uppercase text-[#38BDF8]">
                        Separate vMix Overlay URL (Transparent)
                      </p>
                      <p className="text-xs font-mono text-zinc-200 break-all">
                        {signupCredentials.vmixOverlayUrl}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginIdInput(signupCredentials.loginId);
                        setLoginPasswordInput('');
                        setSignupCredentials(null);
                        setActiveTab('operator');
                      }}
                      className="btn-primary-pro inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-extrabold rounded-xl"
                    >
                      <LogIn className="w-4 h-4" aria-hidden="true" />
                      <span>Login Now with {signupCredentials.loginId} →</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSignupCredentials(null)}
                      className="btn-glass-pro px-4 py-3 text-xs font-bold rounded-xl text-zinc-200"
                    >
                      Create Another Account
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleOperatorSignUp}
                  className="max-w-lg mx-auto rounded-2xl bg-[#131724] border border-[#4ADE80]/30 p-6 space-y-5"
                >
                  <div className="space-y-1">
                    <h3 className="font-display text-lg font-extrabold text-white">
                      Create New Account (Sign Up)
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Enter your Full Name and set a Password. Your unique Login ID, separate Scoreboard, and dedicated vMix Overlay URL will be generated automatically!
                    </p>
                  </div>

                  {signupError && (
                    <div className="rounded-xl bg-red-500/12 border border-red-500/40 px-3.5 py-3 text-xs text-red-200 space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <span>{signupError}</span>
                      </div>
                      {signupNeedsEmailSetup && (
                        <a
                          href={FIREBASE_CONSOLE_AUTH_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-gold-pro inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-extrabold rounded-lg"
                        >
                          <span>Enable Email/Password in Firebase Console</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label
                      htmlFor="signup-fullname"
                      className="block text-xs font-bold text-zinc-200"
                    >
                      1. Full Name *
                    </label>
                    <input
                      id="signup-fullname"
                      type="text"
                      value={signupFullName}
                      onChange={(e) => setSignupFullName(e.target.value)}
                      placeholder="e.g. Bharat Nirguda / Papya Khadke"
                      required
                      className="w-full px-4 py-3 text-sm bg-[#0A0D15] border border-white/15 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#4ADE80]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-200">
                      2. Your Auto-Generated Unique Login ID
                    </label>
                    <div className="w-full px-4 py-3 text-sm font-mono font-extrabold bg-[#0A0D15]/80 border border-[#FACC15]/30 rounded-xl flex items-center justify-between gap-2">
                      <span className={signupPreviewLoginId ? 'text-[#FACC15]' : 'text-zinc-500'}>
                        {signupPreviewLoginId || 'Type your Full Name above...'}
                      </span>
                      {signupCheckingId ? (
                        <span className="text-[10px] text-zinc-400">Checking...</span>
                      ) : signupPreviewLoginId ? (
                        <span className="text-[10px] text-[#4ADE80]">AVAILABLE</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-3 rounded-xl bg-[#0B0E17] border border-white/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-zinc-200">
                        3. Choose Password (min 6 chars)
                      </span>
                      <div className="inline-flex p-0.5 rounded-lg bg-[#151A28] border border-white/10">
                        <button
                          type="button"
                          onClick={() => setSignupPasswordMode('manual')}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                            signupPasswordMode === 'manual'
                              ? 'bg-[#38BDF8] text-black'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          My Password
                        </button>
                        <button
                          type="button"
                          onClick={() => setSignupPasswordMode('auto')}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                            signupPasswordMode === 'auto'
                              ? 'bg-[#FACC15] text-black'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          Auto Strong
                        </button>
                      </div>
                    </div>

                    {signupPasswordMode === 'manual' ? (
                      <div className="relative">
                        <input
                          id="signup-password"
                          type={showSignupPassword ? 'text' : 'password'}
                          value={signupManualPassword}
                          onChange={(e) => setSignupManualPassword(e.target.value)}
                          placeholder="Create a strong password (min 6 chars)"
                          minLength={6}
                          required
                          className="w-full pl-4 pr-11 py-3 text-sm font-mono bg-[#121625] border border-[#38BDF8]/40 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#4ADE80]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword((v) => !v)}
                          aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                        >
                          {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type={showSignupPassword ? 'text' : 'password'}
                          readOnly
                          value={signupAutoPassword}
                          className="flex-1 min-w-[180px] px-3.5 py-2.5 text-sm font-mono font-bold bg-[#121625] border border-[#4ADE80]/35 rounded-xl text-[#4ADE80]"
                        />
                        <button
                          type="button"
                          onClick={() => setSignupAutoPassword(generateSecurePassword(12))}
                          className="btn-glass-pro inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold rounded-xl"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-[#FACC15]" />
                          <span>New</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={signupBusy}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-extrabold rounded-xl bg-gradient-to-b from-[#22C55E] to-[#16A34A] hover:from-[#4ADE80] hover:to-[#22C55E] text-white border border-[#86EFAC]/50 shadow-[0_10px_24px_-8px_rgba(34,197,94,0.75)] transition-all active:scale-95 disabled:opacity-60"
                  >
                    <UserPlus className="w-4 h-4" aria-hidden="true" />
                    <span>{signupBusy ? 'Creating Account...' : 'Sign Up & Create My Account'}</span>
                  </button>

                  <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-zinc-400">Already have an account?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSignupError(null);
                        setActiveTab('operator');
                      }}
                      className="font-bold text-[#38BDF8] hover:text-white transition-colors"
                    >
                      Go to Login →
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ==============================================================
              TAB 2: SUPER ADMIN ACCOUNT CREATION & USER MANAGER
             ============================================================== */}
          {activeTab === 'admin' && (
            <div className="space-y-6">
              {!isSuperAdmin ? (
                <div className="max-w-lg mx-auto rounded-2xl bg-[#131724] border border-[#FACC15]/30 p-6 text-center space-y-5">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FACC15]/15 border border-[#FACC15]/40 flex items-center justify-center">
                    <Lock className="w-7 h-7 text-[#FACC15]" aria-hidden="true" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-display text-xl font-extrabold text-white">
                      Super Admin Restricted Area
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                      Only the verified Super Admin (<span className="font-mono text-[#FACC15]">{SUPER_ADMIN_EMAIL}</span>) can create operator accounts, generate unique Login IDs, and reset passwords.
                    </p>
                  </div>

                  {adminError && (
                    <div className="rounded-xl bg-red-500/12 border border-red-500/40 px-3.5 py-2.5 text-xs text-red-200 text-left flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span>{adminError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSuperAdminGoogleLogin}
                    disabled={loginBusy}
                    className="btn-gold-pro w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-extrabold rounded-xl disabled:opacity-60"
                  >
                    <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                    <span>
                      {loginBusy ? 'Verifying Super Admin...' : 'Sign In as Super Admin (Google)'}
                    </span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Error Banner + One-Click Firebase Auth Setup Helper */}
                  {adminError && (
                    <div className="rounded-2xl bg-red-500/12 border border-red-500/40 p-4 space-y-3">
                      <div className="flex items-start gap-2.5 text-xs sm:text-sm text-red-200">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <span>{adminError}</span>
                      </div>
                      {needsEmailProviderSetup && (
                        <div className="flex flex-wrap items-center gap-3 pl-6">
                          <a
                            href={FIREBASE_CONSOLE_AUTH_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-gold-pro inline-flex items-center gap-2 px-4 py-2 text-xs font-extrabold rounded-lg"
                          >
                            <span>Open Firebase Console → Enable Email/Password</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <span className="text-[11px] text-zinc-400">
                            Authentication → Sign-in method → Email/Password → Enable → Save
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* POST-CREATION / POST-RESET CREDENTIALS CARD (SHOWN IMMEDIATELY ON SCREEN) */}
                  {latestCredentials && (
                    <div className="rounded-2xl bg-gradient-to-br from-[#0F231B] via-[#101C28] to-[#171226] border-2 border-[#4ADE80]/60 p-5 sm:p-6 space-y-5 shadow-[0_18px_50px_rgba(16,185,129,0.2)]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="inline-flex items-center gap-1.5 text-xs font-mono font-extrabold text-[#4ADE80]">
                            <Sparkles className="w-4 h-4" aria-hidden="true" />
                            <span>
                              {latestCredentials.isPasswordReset
                                ? 'PASSWORD RESET SUCCESSFUL · NEW CREDENTIALS READY'
                                : 'NEW USER CREATED · SAVE & SHARE THESE CREDENTIALS'}
                            </span>
                          </p>
                          <h3 className="font-display text-xl font-extrabold text-white">
                            {latestCredentials.fullName}
                          </h3>
                          <p className="text-[11px] text-zinc-400">
                            Password is stored securely in Firebase Authentication only (never stored in plain text in the database). Copy these details now.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              copyValue('copy-all', formatCredentialsCopyText(latestCredentials))
                            }
                            className="btn-gold-pro inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-extrabold rounded-xl"
                          >
                            {copiedKey === 'copy-all' ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                            <span>
                              {copiedKey === 'copy-all' ? 'ALL DETAILS COPIED!' : 'COPY ALL DETAILS'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setLatestCredentials(null)}
                            aria-label="Dismiss credentials card"
                            className="w-9 h-9 rounded-lg border border-white/15 bg-black/30 hover:bg-black/50 text-zinc-300 flex items-center justify-center"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="rounded-xl bg-black/40 border border-white/10 p-3.5">
                          <p className="text-[10px] font-mono uppercase text-zinc-400">Full Name</p>
                          <p className="text-sm font-bold text-white mt-1">
                            {latestCredentials.fullName}
                          </p>
                        </div>

                        <div className="rounded-xl bg-black/40 border border-[#FACC15]/35 p-3.5 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-mono uppercase text-[#FACC15]">
                              Unique Login ID
                            </p>
                            <p className="text-sm font-mono font-extrabold text-white mt-1 truncate">
                              {latestCredentials.loginId}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyValue('cred-id', latestCredentials.loginId)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-200 shrink-0"
                            title="Copy Login ID"
                          >
                            {copiedKey === 'cred-id' ? (
                              <Check className="w-4 h-4 text-[#4ADE80]" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        <div className="rounded-xl bg-black/40 border border-[#4ADE80]/35 p-3.5 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-mono uppercase text-[#4ADE80]">
                              Unique Password
                            </p>
                            <p className="text-sm font-mono font-extrabold text-white mt-1 truncate">
                              {showLatestPassword ? latestCredentials.password : '••••••••••••'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setShowLatestPassword((v) => !v)}
                              className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-200"
                              title={showLatestPassword ? 'Hide' : 'Show'}
                            >
                              {showLatestPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => copyValue('cred-pw', latestCredentials.password)}
                              className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-200"
                              title="Copy Password"
                            >
                              {copiedKey === 'cred-pw' ? (
                                <Check className="w-4 h-4 text-[#4ADE80]" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-xl bg-black/40 border border-white/10 p-3.5 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] font-mono uppercase text-[#FACC15]">
                              Separate Scoreboard URL
                            </p>
                            <button
                              type="button"
                              onClick={() => copyValue('cred-sb', latestCredentials.scoreboardUrl)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FACC15] hover:text-white"
                            >
                              {copiedKey === 'cred-sb' ? (
                                <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                              <span>{copiedKey === 'cred-sb' ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                          <p className="text-xs font-mono text-zinc-200 break-all">
                            {latestCredentials.scoreboardUrl}
                          </p>
                        </div>

                        <div className="rounded-xl bg-black/40 border border-white/10 p-3.5 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] font-mono uppercase text-[#38BDF8]">
                              Separate vMix Overlay URL (Transparent)
                            </p>
                            <button
                              type="button"
                              onClick={() => copyValue('cred-vmix', latestCredentials.vmixOverlayUrl)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#38BDF8] hover:text-white"
                            >
                              {copiedKey === 'cred-vmix' ? (
                                <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                              <span>{copiedKey === 'cred-vmix' ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                          <p className="text-xs font-mono text-zinc-200 break-all">
                            {latestCredentials.vmixOverlayUrl}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CREATE NEW USER FORM */}
                  <form
                    onSubmit={handleCreateUser}
                    className="rounded-2xl bg-[#131724] border border-white/12 p-5 sm:p-6 space-y-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <UserPlus className="w-5 h-5 text-[#FACC15]" aria-hidden="true" />
                        <h3 className="font-display text-base sm:text-lg font-extrabold text-white">
                          Create New Operator User
                        </h3>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-400">
                        Auto Login ID + Unique Secure Password + Separate vMix Room
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Step 1: Full Name */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor="admin-new-fullname"
                          className="block text-xs font-bold text-zinc-200"
                        >
                          1. Full Name *
                        </label>
                        <input
                          id="admin-new-fullname"
                          type="text"
                          value={fullNameInput}
                          onChange={(e) => setFullNameInput(e.target.value)}
                          placeholder="e.g. Bharat Nirguda / Papya Khadke / CRUSHYY"
                          required
                          className="w-full px-4 py-3 text-sm bg-[#0A0D15] border border-white/15 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FACC15]"
                        />
                      </div>

                      {/* Step 2: Live Auto-Generated Login ID Preview */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-zinc-200">
                          2. Auto-Generated Unique Login ID
                        </label>
                        <div className="w-full px-4 py-3 text-sm font-mono font-extrabold bg-[#0A0D15]/80 border border-[#FACC15]/30 rounded-xl flex items-center justify-between gap-2">
                          <span className={previewLoginId ? 'text-[#FACC15]' : 'text-zinc-500'}>
                            {previewLoginId || 'Enter Full Name first...'}
                          </span>
                          {checkingLoginId ? (
                            <span className="text-[10px] text-zinc-400">Checking...</span>
                          ) : previewLoginId ? (
                            <span className="text-[10px] text-[#4ADE80]">UNIQUE READY</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Step 3: Password Mode (Auto Secure Random OR Manual) */}
                    <div className="space-y-3 rounded-xl bg-[#0B0E17] border border-white/10 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-zinc-200">
                          3. User Password (Firebase Auth · Never Stored in Plain Text)
                        </span>
                        <div className="inline-flex p-0.5 rounded-lg bg-[#151A28] border border-white/10">
                          <button
                            type="button"
                            onClick={() => setPasswordMode('auto')}
                            className={`px-3 py-1 text-[11px] font-bold rounded-md transition-colors ${
                              passwordMode === 'auto'
                                ? 'bg-[#FACC15] text-black'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            Auto Secure Random
                          </button>
                          <button
                            type="button"
                            onClick={() => setPasswordMode('manual')}
                            className={`px-3 py-1 text-[11px] font-bold rounded-md transition-colors ${
                              passwordMode === 'manual'
                                ? 'bg-[#38BDF8] text-black'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            Set Manually
                          </button>
                        </div>
                      </div>

                      {passwordMode === 'auto' ? (
                        <div className="flex flex-wrap items-center gap-2.5">
                          <div className="relative flex-1 min-w-[200px]">
                            <input
                              type={showCreatePassword ? 'text' : 'password'}
                              readOnly
                              value={autoPasswordDraft}
                              className="w-full pl-3.5 pr-10 py-2.5 text-sm font-mono font-bold bg-[#121625] border border-[#4ADE80]/35 rounded-xl text-[#4ADE80]"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCreatePassword((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                            >
                              {showCreatePassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAutoPasswordDraft(generateSecurePassword(12))}
                            className="btn-glass-pro inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-xl"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-[#FACC15]" />
                            <span>Regenerate</span>
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <input
                            type={showCreatePassword ? 'text' : 'password'}
                            value={manualPasswordInput}
                            onChange={(e) => setManualPasswordInput(e.target.value)}
                            placeholder="Enter manual password (min 6 characters)"
                            minLength={6}
                            required
                            className="w-full pl-4 pr-11 py-2.5 text-sm font-mono bg-[#121625] border border-[#38BDF8]/40 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FACC15]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCreatePassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                          >
                            {showCreatePassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={createBusy}
                      className="btn-primary-pro w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-extrabold rounded-xl disabled:opacity-60"
                    >
                      <UserPlus className="w-4 h-4" aria-hidden="true" />
                      <span>{createBusy ? 'Creating User Account...' : 'Create User Account'}</span>
                    </button>
                  </form>

                  {/* INLINE SUPER ADMIN PASSWORD RESET MODAL/DRAWER */}
                  {resetTarget && (
                    <form
                      onSubmit={handleConfirmPasswordReset}
                      className="rounded-2xl bg-[#1A1525] border-2 border-[#FACC15]/55 p-5 space-y-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <KeyRound className="w-5 h-5 text-[#FACC15]" />
                          <div>
                            <h4 className="font-display text-sm sm:text-base font-extrabold text-white">
                              Reset Password for {resetTarget.fullName} ({resetTarget.loginId})
                            </h4>
                            <p className="text-[11px] text-zinc-400">
                              Keeps the exact same Login ID, Scoreboard URL, vMix URL, and match data intact.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setResetTarget(null)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setResetPasswordMode('auto')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                            resetPasswordMode === 'auto'
                              ? 'bg-[#FACC15] text-black'
                              : 'bg-white/5 text-zinc-300'
                          }`}
                        >
                          Auto-Generate Secure Password
                        </button>
                        <button
                          type="button"
                          onClick={() => setResetPasswordMode('manual')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                            resetPasswordMode === 'manual'
                              ? 'bg-[#38BDF8] text-black'
                              : 'bg-white/5 text-zinc-300'
                          }`}
                        >
                          Manual New Password
                        </button>
                      </div>

                      {resetPasswordMode === 'auto' ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={resetAutoDraft}
                            className="flex-1 min-w-[200px] px-3.5 py-2.5 text-sm font-mono font-bold bg-[#0B0E17] border border-[#4ADE80]/40 rounded-xl text-[#4ADE80]"
                          />
                          <button
                            type="button"
                            onClick={() => setResetAutoDraft(generateSecurePassword(12))}
                            className="btn-glass-pro inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold rounded-xl"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-[#FACC15]" />
                            <span>Regenerate</span>
                          </button>
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={resetManualInput}
                          onChange={(e) => setResetManualInput(e.target.value)}
                          placeholder="Enter new password (min 6 chars)"
                          minLength={6}
                          required
                          className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#0B0E17] border border-[#38BDF8]/40 rounded-xl text-white placeholder:text-zinc-500"
                        />
                      )}

                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="submit"
                          disabled={resetBusy}
                          className="btn-gold-pro inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-extrabold rounded-xl disabled:opacity-60"
                        >
                          <KeyRound className="w-4 h-4" />
                          <span>{resetBusy ? 'Resetting Password...' : 'Confirm Password Reset'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setResetTarget(null)}
                          className="px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {/* MANAGED USERS LIST */}
                  <div className="rounded-2xl bg-[#131724] border border-white/12 p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-[#38BDF8]" aria-hidden="true" />
                        <h3 className="font-display text-base font-extrabold text-white">
                          Created User Accounts ({managedUsers.length})
                        </h3>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-400">
                        Passwords hidden · Firebase Auth Secured
                      </span>
                    </div>

                    {usersLoading ? (
                      <p className="text-xs text-zinc-400 py-6 text-center">
                        Loading operator accounts...
                      </p>
                    ) : managedUsers.length === 0 ? (
                      <p className="text-xs text-zinc-400 py-6 text-center">
                        No operator accounts created yet. Enter a Full Name above to create your first user!
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {managedUsers.map((acc) => {
                          const isDisabled = acc.status === 'disabled';
                          const isBusy = rowBusyUid === acc.uid;
                          return (
                            <div
                              key={acc.uid}
                              className={`rounded-xl border p-4 space-y-3 transition-colors ${
                                isDisabled
                                  ? 'bg-[#120F14] border-red-500/25 opacity-75'
                                  : 'bg-[#0B0E17] border-white/10 hover:border-white/20'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="space-y-0.5 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-display text-sm sm:text-base font-bold text-white">
                                      {acc.fullName}
                                    </p>
                                    <span className="font-mono text-xs font-extrabold text-[#FACC15] bg-[#FACC15]/10 border border-[#FACC15]/30 px-2 py-0.5 rounded-md">
                                      {acc.loginId}
                                    </span>
                                    <span
                                      className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                        isDisabled
                                          ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                                          : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                      }`}
                                    >
                                      {isDisabled ? 'DISABLED' : 'ACTIVE'}
                                    </span>
                                  </div>
                                  <p className="text-[11px] font-mono text-zinc-400">
                                    Match Room: <span className="text-zinc-200">{acc.matchRoomId}</span> · Pass Rev v{acc.passwordVersion || 1}
                                  </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onOpenUserScoreboard(acc.matchRoomId, acc.uid);
                                      onClose();
                                    }}
                                    className="btn-glass-pro inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg text-[#4ADE80]"
                                  >
                                    <MonitorPlay className="w-3.5 h-3.5" />
                                    <span>Open Board</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setResetTarget(acc);
                                      setResetAutoDraft(generateSecurePassword(12));
                                      setResetManualInput('');
                                    }}
                                    className="btn-glass-pro inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg text-[#FACC15]"
                                  >
                                    <KeyRound className="w-3.5 h-3.5" />
                                    <span>Reset Password</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => void handleToggleStatus(acc)}
                                    className="btn-glass-pro inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg text-zinc-200 disabled:opacity-50"
                                  >
                                    {isDisabled ? (
                                      <>
                                        <UserCheck className="w-3.5 h-3.5 text-[#4ADE80]" />
                                        <span>Enable</span>
                                      </>
                                    ) : (
                                      <>
                                        <UserX className="w-3.5 h-3.5 text-amber-400" />
                                        <span>Disable</span>
                                      </>
                                    )}
                                  </button>

                                  {confirmDeleteUid === acc.uid ? (
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => void handleDeleteUser(acc)}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-500 text-white"
                                    >
                                      <span>Confirm Delete</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteUid(acc.uid)}
                                      className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-300"
                                      title="Delete account"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-white/8 text-[11px] font-mono">
                                <div className="flex items-center justify-between gap-2 bg-black/30 rounded-lg px-3 py-2">
                                  <span className="text-zinc-400 truncate">
                                    Scoreboard: <span className="text-zinc-200">{acc.scoreboardUrl}</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => copyValue(`sb-${acc.uid}`, acc.scoreboardUrl)}
                                    className="text-[#FACC15] hover:text-white shrink-0"
                                    title="Copy Scoreboard URL"
                                  >
                                    {copiedKey === `sb-${acc.uid}` ? (
                                      <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                                <div className="flex items-center justify-between gap-2 bg-black/30 rounded-lg px-3 py-2">
                                  <span className="text-zinc-400 truncate">
                                    vMix URL: <span className="text-zinc-200">{acc.vmixOverlayUrl}</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => copyValue(`vmix-${acc.uid}`, acc.vmixOverlayUrl)}
                                    className="text-[#38BDF8] hover:text-white shrink-0"
                                    title="Copy vMix Overlay URL"
                                  >
                                    {copiedKey === `vmix-${acc.uid}` ? (
                                      <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
