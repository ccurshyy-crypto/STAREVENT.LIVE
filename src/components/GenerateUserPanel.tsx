import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  X,
} from 'lucide-react';

export interface ManagedSupabaseUser {
  userId: string;
  email: string;
  workspaceUid: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastSignInAt: string | null;
}

interface GenerateUserPanelProps {
  adminToken: string;
  onLockAdmin: () => void;
}

function secureRandomInt(maxExclusive: number): number {
  const arr = new Uint32Array(1);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(arr);
    return arr[0] % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

function generateStrongPassword(length = 14): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*?';
  const all = upper + lower + digits + symbols;

  const chars = [
    upper[secureRandomInt(upper.length)],
    lower[secureRandomInt(lower.length)],
    digits[secureRandomInt(digits.length)],
    symbols[secureRandomInt(symbols.length)],
  ];
  while (chars.length < length) {
    chars.push(all[secureRandomInt(all.length)]);
  }
  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    const tmp = chars[i];
    chars[i] = chars[j];
    chars[j] = tmp;
  }
  return chars.join('');
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

function formatCreatedDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function GenerateUserPanel({
  adminToken,
  onLockAdmin,
}: GenerateUserPanelProps) {
  const [users, setUsers] = useState<ManagedSupabaseUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [configRequired, setConfigRequired] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Create User Form State
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState(() => generateStrongPassword());
  const [showPassword, setShowPassword] = useState(true);
  const [creating, setCreating] = useState(false);

  // Last created credential banner (kept only in React memory)
  const [lastCreated, setLastCreated] = useState<{
    email: string;
    password: string;
    userId: string;
    workspaceUid: string;
  } | null>(null);

  // Copy feedback key
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Per-row busy / delete confirmation
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Reset Password Modal State
  const [resetTarget, setResetTarget] = useState<ManagedSupabaseUser | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(true);
  const [resetting, setResetting] = useState(false);

  const flashCopied = (key: string) => {
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 1800);
  };

  const handleCopy = async (value: string, key: string) => {
    if (!value.trim()) return;
    const ok = await copyToClipboard(value);
    if (ok) flashCopied(key);
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${adminToken}` },
        cache: 'no-store',
      });
      if (res.status === 401 || res.status === 403) {
        onLockAdmin();
        return;
      }
      const data = (await res.json()) as {
        ok?: boolean;
        users?: ManagedSupabaseUser[];
        configRequired?: boolean;
        error?: string;
      };
      if (data.configRequired) {
        setConfigRequired(true);
        setUsers([]);
        return;
      }
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'Failed to load Supabase Auth users.');
        return;
      }
      setConfigRequired(false);
      setUsers(data.users || []);
    } catch {
      setErrorMsg('Network error loading Supabase users.');
    } finally {
      setLoading(false);
    }
  }, [adminToken, onLockAdmin]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const email = emailInput.trim().toLowerCase();
    const password = passwordInput;

    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid Login ID (Email).');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ email, password }),
      });
      if (res.status === 401 || res.status === 403) {
        onLockAdmin();
        return;
      }
      const data = (await res.json()) as {
        ok?: boolean;
        user?: ManagedSupabaseUser;
        configRequired?: boolean;
        error?: string;
      };
      if (data.configRequired) {
        setConfigRequired(true);
        setErrorMsg(data.error || 'Supabase service role key is not configured on the server.');
        return;
      }
      if (!res.ok || !data.ok || !data.user) {
        setErrorMsg(data.error || 'Could not create Supabase user.');
        return;
      }

      setLastCreated({
        email: data.user.email,
        password,
        userId: data.user.userId,
        workspaceUid: data.user.workspaceUid,
      });
      setSuccessMsg(`Created Supabase user "${data.user.email}" successfully.`);
      setEmailInput('');
      setPasswordInput(generateStrongPassword());
      await loadUsers();
    } catch {
      setErrorMsg('Network error while creating user.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (user: ManagedSupabaseUser) => {
    setBusyUserId(user.userId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const nextActive = !user.isActive;
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(user.userId)}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ isActive: nextActive }),
        }
      );
      if (res.status === 401 || res.status === 403) {
        onLockAdmin();
        return;
      }
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'Failed to update account status.');
        return;
      }
      setSuccessMsg(
        `Account "${user.email}" is now ${nextActive ? 'Active' : 'Deactivated'}.`
      );
      await loadUsers();
    } catch {
      setErrorMsg('Network error updating account status.');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleOpenResetModal = (user: ManagedSupabaseUser) => {
    setResetTarget(user);
    setResetPasswordInput(generateStrongPassword());
    setShowResetPassword(true);
    setErrorMsg(null);
  };

  const handleSubmitResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (resetPasswordInput.length < 8) {
      setErrorMsg('New password must be at least 8 characters.');
      return;
    }

    setResetting(true);
    try {
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(resetTarget.userId)}/reset-password`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ password: resetPasswordInput }),
        }
      );
      if (res.status === 401 || res.status === 403) {
        onLockAdmin();
        return;
      }
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'Failed to reset password.');
        return;
      }

      setLastCreated({
        email: resetTarget.email,
        password: resetPasswordInput,
        userId: resetTarget.userId,
        workspaceUid: resetTarget.workspaceUid,
      });
      setSuccessMsg(`Password reset for "${resetTarget.email}". Copy it below to share.`);
      setResetTarget(null);
      setResetPasswordInput('');
    } catch {
      setErrorMsg('Network error resetting password.');
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteUser = async (user: ManagedSupabaseUser) => {
    setBusyUserId(user.userId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.userId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.status === 401 || res.status === 403) {
        onLockAdmin();
        return;
      }
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'Failed to delete user.');
        return;
      }
      setConfirmDeleteId(null);
      if (lastCreated?.userId === user.userId) {
        setLastCreated(null);
      }
      setSuccessMsg(`Deleted user "${user.email}" from Supabase Authentication.`);
      await loadUsers();
    } catch {
      setErrorMsg('Network error deleting user.');
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#FF8C00]/20 border border-[#FF8C00]/45 flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5 text-[#FF8C00]" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-display text-base sm:text-lg font-black text-white leading-tight">
              Generate User ID &amp; Password
            </h3>
            <p className="text-[11px] font-mono text-zinc-400">
              Supabase Authentication · Server-Side Admin API · Main Admin Only
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadUsers()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/12 text-xs font-semibold text-zinc-200 whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={onLockAdmin}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/70 border border-red-500/35 text-xs font-semibold text-red-200 whitespace-nowrap"
          >
            <Lock className="w-3.5 h-3.5" />
            Lock Admin
          </button>
        </div>
      </div>

      {/* Server Config Notice (only shown if SUPABASE_SERVICE_ROLE_KEY is missing in env) */}
      {configRequired && (
        <div className="rounded-xl bg-amber-950/60 border border-[#FF8C00]/50 p-4 space-y-2 text-xs text-amber-100">
          <div className="flex items-center gap-2 font-bold text-[#FF8C00]">
            <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Server Secret Required to Activate Supabase Admin API</span>
          </div>
          <p className="text-zinc-200 leading-relaxed">
            To keep your Supabase <code className="font-mono text-[#FFE600]">service_role</code> key strictly off the frontend, add{' '}
            <code className="font-mono text-[#FFE600]">SUPABASE_SERVICE_ROLE_KEY</code> (from your Supabase Dashboard → Project Settings → API) in{' '}
            <strong>Settings → Secrets</strong>, or configure{' '}
            <code className="font-mono text-[#FFE600]">SUPABASE_EDGE_FUNCTION_URL</code> +{' '}
            <code className="font-mono text-[#FFE600]">ADMIN_EDGE_SECRET</code> for the included{' '}
            <code className="font-mono text-zinc-300">admin-users</code> Edge Function.
          </p>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl bg-red-950/75 border border-red-500/50 px-4 py-2.5 text-xs font-medium text-red-100"
        >
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl bg-emerald-950/65 border border-emerald-500/45 px-4 py-2.5 text-xs font-medium text-emerald-100">
          {successMsg}
        </div>
      )}

      {/* Create User Form */}
      <form
        onSubmit={handleCreateUser}
        className="rounded-xl bg-[#09090D] border border-[#FF8C00]/40 p-4 sm:p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#FF8C00]">
            Create New User Account
          </span>
          <button
            type="button"
            onClick={() => setPasswordInput(generateStrongPassword())}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF8C00]/20 hover:bg-[#FF8C00]/30 border border-[#FF8C00]/40 text-xs font-bold text-orange-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#FF8C00]" aria-hidden="true" />
            <span>Generate Random Password</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Login ID (Email) */}
          <div className="space-y-1.5">
            <label
              htmlFor="admin-create-user-email"
              className="block text-xs font-semibold text-zinc-300"
            >
              Login ID (Email) *
            </label>
            <div className="flex items-center gap-2">
              <input
                id="admin-create-user-email"
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="operator@example.com"
                autoComplete="off"
                className="flex-1 min-w-0 px-3.5 py-2.5 rounded-lg bg-[#15151C] border border-white/15 focus:border-[#FF8C00] focus:outline-none text-xs sm:text-sm font-mono text-white placeholder:text-zinc-500"
              />
              <button
                type="button"
                disabled={!emailInput.trim()}
                onClick={() => void handleCopy(emailInput.trim(), 'form-email')}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-40 text-xs font-bold text-white whitespace-nowrap shrink-0"
              >
                {copiedKey === 'form-email' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#FF8C00]" />
                    <span>Copy Login ID</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="admin-create-user-password"
              className="block text-xs font-semibold text-zinc-300"
            >
              Password (min 8 chars) *
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <input
                  id="admin-create-user-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter or generate strong password"
                  autoComplete="new-password"
                  className="w-full pl-3.5 pr-9 py-2.5 rounded-lg bg-[#15151C] border border-white/15 focus:border-[#FF8C00] focus:outline-none text-xs sm:text-sm font-mono text-white placeholder:text-zinc-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="button"
                disabled={!passwordInput}
                onClick={() => void handleCopy(passwordInput, 'form-password')}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-40 text-xs font-bold text-white whitespace-nowrap shrink-0"
              >
                {copiedKey === 'form-password' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#FF8C00]" />
                    <span>Copy Password</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={creating}
          className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF8C00] hover:bg-[#E87500] disabled:opacity-60 text-white font-display font-bold text-xs sm:text-sm uppercase tracking-wide transition-colors"
        >
          <UserPlus className="w-4 h-4" aria-hidden="true" />
          <span>{creating ? 'Creating User in Supabase...' : 'Create User'}</span>
        </button>
      </form>

      {/* One-Time Copy-Ready Credentials Card after Creation or Reset */}
      {lastCreated && (
        <div className="rounded-xl bg-emerald-950/55 border border-emerald-400/45 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                Ready to Share · User Credentials
              </p>
              <p className="text-[11px] text-zinc-300">
                Copy and share these credentials with the user. Passwords are never displayed again after you leave this page.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLastCreated(null)}
              aria-label="Dismiss credentials card"
              className="p-1 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="flex items-center justify-between gap-2 rounded-lg bg-black/35 border border-white/10 px-3 py-2">
              <div className="min-w-0">
                <span className="text-[10px] uppercase text-zinc-400 block">Login ID (Email)</span>
                <span className="font-mono font-bold text-[#FFE600] truncate block">
                  {lastCreated.email}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void handleCopy(lastCreated.email, 'created-email')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#FF8C00] hover:bg-[#E87500] text-white text-[11px] font-bold shrink-0"
              >
                {copiedKey === 'created-email' ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>Copy Login ID</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-lg bg-black/35 border border-white/10 px-3 py-2">
              <div className="min-w-0">
                <span className="text-[10px] uppercase text-zinc-400 block">Password</span>
                <span className="font-mono font-bold text-white truncate block">
                  {lastCreated.password}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void handleCopy(lastCreated.password, 'created-pass')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#FF8C00] hover:bg-[#E87500] text-white text-[11px] font-bold shrink-0"
              >
                {copiedKey === 'created-pass' ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>Copy Password</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Management Table */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#FF8C00]" aria-hidden="true" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              User Management ({users.length})
            </h4>
          </div>
        </div>

        <div className="rounded-xl border border-white/12 bg-[#0D0D13] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#16161F] text-zinc-300 uppercase text-[11px] border-b border-white/10">
                <tr>
                  <th className="px-3.5 py-3">Login ID</th>
                  <th className="px-3.5 py-3">User ID</th>
                  <th className="px-3.5 py-3">Account Created Date</th>
                  <th className="px-3.5 py-3">Account Status</th>
                  <th className="px-3.5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {loading && users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                      Loading users from Supabase Authentication...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                      {configRequired
                        ? 'Configure SUPABASE_SERVICE_ROLE_KEY on the server to view and manage Supabase Auth users.'
                        : 'No Supabase Auth users created yet. Use the form above to generate your first Login ID & Password.'}
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isBusy = busyUserId === u.userId;
                    const isOwnerAdmin = u.role === 'owner_admin';
                    return (
                      <tr key={u.userId} className="hover:bg-white/[0.03] transition-colors">
                        <td className="px-3.5 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-white">
                              {u.email || '—'}
                            </span>
                            {u.email && (
                              <button
                                type="button"
                                onClick={() => void handleCopy(u.email, `row-email-${u.userId}`)}
                                aria-label={`Copy Login ID ${u.email}`}
                                className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-[#FF8C00]"
                              >
                                {copiedKey === `row-email-${u.userId}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                          {isOwnerAdmin && (
                            <span className="inline-block mt-0.5 text-[10px] font-bold uppercase text-[#FF8C00]">
                              Main Admin
                            </span>
                          )}
                        </td>

                        <td className="px-3.5 py-3 font-mono text-[11px] text-zinc-300">
                          <div className="truncate max-w-[165px]" title={u.userId}>
                            {u.userId}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            UID: {u.workspaceUid}
                          </div>
                        </td>

                        <td className="px-3.5 py-3 text-zinc-300 whitespace-nowrap tabular-nums">
                          {formatCreatedDate(u.createdAt)}
                        </td>

                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                              u.isActive
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                                : 'bg-red-500/15 text-red-300 border-red-500/35'
                            }`}
                          >
                            {u.isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </td>

                        <td className="px-3.5 py-3 text-right">
                          <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleOpenResetModal(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FF8C00]/20 hover:bg-[#FF8C00]/30 border border-[#FF8C00]/40 text-[11px] font-bold text-orange-200 whitespace-nowrap"
                            >
                              <KeyRound className="w-3 h-3" aria-hidden="true" />
                              <span>Reset Password</span>
                            </button>

                            {!isOwnerAdmin && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleToggleStatus(u)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold whitespace-nowrap ${
                                  u.isActive
                                    ? 'bg-amber-950/60 hover:bg-amber-900/70 border-amber-500/40 text-amber-200'
                                    : 'bg-emerald-950/60 hover:bg-emerald-900/70 border-emerald-500/40 text-emerald-200'
                                }`}
                              >
                                {u.isActive ? (
                                  <>
                                    <UserX className="w-3 h-3" aria-hidden="true" />
                                    <span>Deactivate</span>
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-3 h-3" aria-hidden="true" />
                                    <span>Activate</span>
                                  </>
                                )}
                              </button>
                            )}

                            {!isOwnerAdmin &&
                              (confirmDeleteId !== u.userId ? (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => setConfirmDeleteId(u.userId)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 border border-red-500/35 text-[11px] font-bold text-red-200 whitespace-nowrap"
                                >
                                  <Trash2 className="w-3 h-3" aria-hidden="true" />
                                  <span>Delete User</span>
                                </button>
                              ) : (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => void handleDeleteUser(u)}
                                    className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-[11px] font-bold text-white whitespace-nowrap"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2 py-1.5 rounded-lg bg-white/10 text-[11px] font-bold text-zinc-200"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Reset Password Modal */}
      {resetTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Reset User Password"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
        >
          <form
            onSubmit={handleSubmitResetPassword}
            className="w-full max-w-md rounded-2xl bg-[#111116] border border-[#FF8C00]/45 p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="min-w-0">
                <h4 className="font-display font-bold text-sm text-white">
                  Reset User Password
                </h4>
                <p className="text-[11px] font-mono text-[#FF8C00] truncate">
                  {resetTarget.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                aria-label="Close reset password dialog"
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="admin-reset-password-input"
                  className="text-xs font-semibold text-zinc-300"
                >
                  New Password (min 8 chars)
                </label>
                <button
                  type="button"
                  onClick={() => setResetPasswordInput(generateStrongPassword())}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FF8C00] hover:text-orange-300"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Generate Random</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  <input
                    id="admin-reset-password-input"
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={resetPasswordInput}
                    onChange={(e) => setResetPasswordInput(e.target.value)}
                    className="w-full pl-3 pr-9 py-2 rounded-lg bg-[#09090D] border border-white/15 focus:border-[#FF8C00] focus:outline-none text-xs font-mono text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword((v) => !v)}
                    aria-label={showResetPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white"
                  >
                    {showResetPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopy(resetPasswordInput, 'modal-reset-pass')}
                  className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold text-white shrink-0"
                >
                  {copiedKey === 'modal-reset-pass' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#FF8C00]" />
                  )}
                  <span>Copy</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="px-4 py-2 rounded-lg bg-white/10 text-xs font-bold text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resetting}
                className="px-4 py-2 rounded-lg bg-[#FF8C00] hover:bg-[#E87500] disabled:opacity-60 text-white text-xs font-bold"
              >
                {resetting ? 'Updating...' : 'Save New Password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
