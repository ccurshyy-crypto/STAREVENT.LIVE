import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Tv,
  X,
} from 'lucide-react';
import { AdminAccessKeysPanel } from './AdminAccessKeysPanel';
import { GenerateUserPanel } from './GenerateUserPanel';

interface OwnerAdminPageProps {
  onBackHome: () => void;
}

interface AdminAuthStatus {
  configured: boolean;
  claimed: boolean;
  requiresClaim: boolean;
}

interface OverlayAccountDTO {
  loginId: string;
  assignedUser: string;
  uid: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function OverlayAccountsManager({
  adminToken,
  onLockAdmin,
}: {
  adminToken: string;
  onLockAdmin: () => void;
}) {
  const [accounts, setAccounts] = useState<OverlayAccountDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Create form
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [assignedUser, setAssignedUser] = useState('');
  const [uid, setUid] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit / Reset password modal state
  const [editingAccount, setEditingAccount] = useState<OverlayAccountDTO | null>(null);
  const [editAssignedUser, setEditAssignedUser] = useState('');
  const [editUid, setEditUid] = useState('');
  const [editNewPassword, setEditNewPassword] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/overlay-accounts', {
        headers: { Authorization: `Bearer ${adminToken}` },
        cache: 'no-store',
      });
      if (res.status === 401) {
        onLockAdmin();
        return;
      }
      const data = (await res.json()) as {
        ok?: boolean;
        accounts?: OverlayAccountDTO[];
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'Failed to load overlay accounts.');
        return;
      }
      setAccounts(data.accounts || []);
    } catch {
      setErrorMsg('Network error loading overlay accounts.');
    } finally {
      setLoading(false);
    }
  }, [adminToken, onLockAdmin]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSaving(true);
    try {
      const res = await fetch('/api/admin/overlay-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          loginId,
          password,
          assignedUser,
          uid: uid || loginId,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        account?: OverlayAccountDTO;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'Could not create overlay login.');
        return;
      }
      setSuccessMsg(
        `Created Overlay Login "${data.account?.loginId}" (password securely hashed on server).`
      );
      setLoginId('');
      setPassword('');
      setAssignedUser('');
      setUid('');
      await loadAccounts();
    } catch {
      setErrorMsg('Network error creating overlay login.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (acct: OverlayAccountDTO) => {
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/admin/overlay-accounts/${encodeURIComponent(acct.loginId)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ isActive: !acct.isActive }),
        }
      );
      if (res.ok) {
        await loadAccounts();
      }
    } catch {
      setErrorMsg('Failed to update overlay account status.');
    }
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/admin/overlay-accounts/${encodeURIComponent(editingAccount.loginId)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            assignedUser: editAssignedUser,
            uid: editUid,
            ...(editNewPassword.trim() ? { newPassword: editNewPassword.trim() } : {}),
          }),
        }
      );
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'Failed to update account.');
        return;
      }
      setEditingAccount(null);
      setEditNewPassword('');
      setSuccessMsg(`Updated Overlay Login "${editingAccount.loginId}".`);
      await loadAccounts();
    } catch {
      setErrorMsg('Network error updating account.');
    }
  };

  const handleDelete = async (id: string) => {
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/overlay-accounts/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        setConfirmDeleteId(null);
        await loadAccounts();
      }
    } catch {
      setErrorMsg('Failed to revoke overlay account.');
    }
  };

  const copyLoginId = (id: string) => {
    navigator.clipboard?.writeText(id).catch(() => {});
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Tv className="w-5 h-5 text-[#FFE600] shrink-0" aria-hidden="true" />
          <div>
            <h3 className="font-display text-base sm:text-lg font-black text-white leading-tight">
              Scoreboard Overlay Control Accounts
            </h3>
            <p className="text-[11px] font-mono text-zinc-400">
              Server-side scrypt hashed · Zero plaintext storage
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadAccounts()}
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

      <form
        onSubmit={handleCreate}
        className="rounded-xl bg-[#09090D] border border-[#FFE600]/30 p-4 space-y-3.5"
      >
        <p className="text-xs font-bold uppercase tracking-wider text-[#FFE600]">
          Create Overlay Controller Login
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-zinc-400">
              Overlay Login ID *
            </label>
            <input
              type="text"
              required
              value={loginId}
              onChange={(e) => setLoginId(e.target.value.toUpperCase())}
              placeholder="e.g. OVL-BHARAT01"
              className="w-full px-3 py-2 rounded-lg bg-[#15151C] border border-white/15 focus:border-[#FFE600] focus:outline-none text-xs font-mono text-[#FFE600] uppercase"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-zinc-400">
              Password (min 6 chars) *
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set operator password"
              className="w-full px-3 py-2 rounded-lg bg-[#15151C] border border-white/15 focus:border-[#FFE600] focus:outline-none text-xs text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-zinc-400">
              Assigned User Name
            </label>
            <input
              type="text"
              value={assignedUser}
              onChange={(e) => setAssignedUser(e.target.value)}
              placeholder="e.g. Bharat Nirguda"
              className="w-full px-3 py-2 rounded-lg bg-[#15151C] border border-white/15 focus:border-[#FFE600] focus:outline-none text-xs text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-zinc-400">
              Assigned Workspace UID (optional)
            </label>
            <input
              type="text"
              value={uid}
              onChange={(e) => setUid(e.target.value.toUpperCase())}
              placeholder="e.g. STAR-101"
              className="w-full px-3 py-2 rounded-lg bg-[#15151C] border border-white/15 focus:border-[#FFE600] focus:outline-none text-xs font-mono text-white uppercase"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF8C00] hover:bg-[#E87500] disabled:opacity-60 text-white font-display font-bold text-xs uppercase tracking-wide"
        >
          <Plus className="w-4 h-4 text-[#FFE600]" />
          <span>{saving ? 'Creating...' : 'Create Overlay Controller Account'}</span>
        </button>
      </form>

      <div className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Authorized Overlay Accounts ({accounts.length})
        </h4>

        {accounts.length === 0 ? (
          <div className="rounded-xl bg-[#09090D] border border-white/10 p-5 text-center text-xs text-zinc-400">
            No Overlay Controller accounts created yet. Create one above, or sign in on Scoreboard Overlay Control using Login ID <strong className="text-white">ADMIN</strong> with your owner password.
          </div>
        ) : (
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {accounts.map((acct) => (
              <div
                key={acct.loginId}
                className="rounded-xl border border-white/12 bg-[#0D0D13] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <KeyRound className="w-3.5 h-3.5 text-[#FFE600] shrink-0" />
                    <span className="font-mono text-sm font-black text-[#FFE600]">
                      {acct.loginId}
                    </span>
                    <span className="text-xs text-zinc-400">·</span>
                    <span className="text-xs font-semibold text-zinc-200">
                      {acct.assignedUser}
                    </span>
                    <span className="text-xs text-zinc-400">·</span>
                    <span
                      className={`text-[11px] font-bold ${
                        acct.isActive ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {acct.isActive ? 'Active' : 'Revoked / Inactive'}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-zinc-400">
                    Workspace UID: {acct.uid} · Password hashed (scrypt)
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => copyLoginId(acct.loginId)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-bold text-white"
                  >
                    {copiedId === acct.loginId ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-[#FFE600]" />
                    )}
                    Copy ID
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAccount(acct);
                      setEditAssignedUser(acct.assignedUser);
                      setEditUid(acct.uid);
                      setEditNewPassword('');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FF8C00]/20 hover:bg-[#FF8C00]/30 border border-[#FF8C00]/40 text-[11px] font-bold text-orange-200"
                  >
                    <Edit3 className="w-3 h-3" />
                    Edit / Reset Pass
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggleActive(acct)}
                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold ${
                      acct.isActive
                        ? 'bg-amber-950/60 hover:bg-amber-900/70 border-amber-500/40 text-amber-200'
                        : 'bg-emerald-950/60 hover:bg-emerald-900/70 border-emerald-500/40 text-emerald-200'
                    }`}
                  >
                    {acct.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  {confirmDeleteId !== acct.loginId ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(acct.loginId)}
                      aria-label={`Revoke ${acct.loginId}`}
                      className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 border border-red-500/35 text-red-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void handleDelete(acct.loginId)}
                        className="px-2 py-1.5 rounded-lg bg-red-600 text-[11px] font-bold text-white"
                      >
                        Revoke
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1.5 rounded-lg bg-white/10 text-[11px] font-bold text-zinc-200"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-md rounded-2xl bg-[#111116] border border-[#FFE600]/40 p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="font-display font-bold text-sm text-white">
                Edit Account · {editingAccount.loginId}
              </h4>
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs text-zinc-400">Assigned User</label>
                <input
                  type="text"
                  value={editAssignedUser}
                  onChange={(e) => setEditAssignedUser(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#09090D] border border-white/15 text-xs text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs text-zinc-400">Assigned Workspace UID</label>
                <input
                  type="text"
                  value={editUid}
                  onChange={(e) => setEditUid(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-lg bg-[#09090D] border border-white/15 text-xs font-mono text-white uppercase"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs text-zinc-400">
                  Reset Password (leave blank to keep current)
                </label>
                <input
                  type="password"
                  value={editNewPassword}
                  onChange={(e) => setEditNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                  className="w-full px-3 py-2 rounded-lg bg-[#09090D] border border-white/15 text-xs text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="px-4 py-2 rounded-lg bg-white/10 text-xs font-bold text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#FFE600] text-[#09090D] text-xs font-black"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
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

  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'access-keys' | 'overlay-accounts' | 'generate-users'
  >('access-keys');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [changePinOpen, setChangePinOpen] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [pinSaving, setPinSaving] = useState(false);
  const [pinFeedback, setPinFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    const loadStatus = async () => {
      setStatusLoading(true);
      try {
        const res = await fetch('/api/admin/status', { cache: 'no-store' });
        if (!res.ok) throw new Error('Unable to reach owner admin service.');
        const data = (await res.json()) as AdminAuthStatus;
        if (active) setAuthStatus(data);
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
    if (trimmed.length < 4) {
      setErrorMsg('Choose an owner PIN or password of at least 4 characters.');
      return;
    }
    if (trimmed !== confirmPassword.trim()) {
      setErrorMsg('PIN / Passwords do not match.');
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
    setChangePinOpen(false);
    setPinFeedback(null);
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

  const handleChangeOwnerPin = async (e: FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    setPinFeedback(null);
    const trimmedNext = newPinInput.trim();
    if (trimmedNext.length < 4) {
      setPinFeedback({ type: 'err', text: 'New PIN / password must be at least 4 characters.' });
      return;
    }
    setPinSaving(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          currentPassword: currentPinInput.trim(),
          newPassword: trimmedNext,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setPinFeedback({ type: 'err', text: data.error || 'Could not update owner PIN.' });
        return;
      }
      setCurrentPinInput('');
      setNewPinInput('');
      setPinFeedback({ type: 'ok', text: 'Owner Admin PIN updated successfully.' });
    } catch {
      setPinFeedback({ type: 'err', text: 'Network error while updating owner PIN.' });
    } finally {
      setPinSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3B0207] via-[#1C030C] to-[#070B28] text-[#F4F4F5] py-8 sm:py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl overlay-home-btn text-xs sm:text-sm font-semibold transition-all"
          >
            <ArrowLeft className="w-4 h-4 text-[#FFE600]" aria-hidden="true" />
            <span>Back to Star Event Live</span>
          </button>

          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#FFE600]">
            Star Event Live · Admin Panel
          </span>
        </div>

        <div className="rounded-2xl overlay-home-card overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-[#EF1A1A] via-[#FFE600] to-[#EF1A1A]" />

          <div className="p-5 sm:p-8">
            {statusLoading ? (
              <div className="py-12 text-center space-y-2">
                <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#FFE600]">
                  Star Event Live · Owner Access
                </p>
                <p className="text-sm text-rose-100/75">Checking owner session...</p>
              </div>
            ) : adminToken ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-[#0B0618]/80 border border-[#FACC15]/25">
                  <button
                    type="button"
                    onClick={() => setActiveTab('access-keys')}
                    className={`flex-1 min-w-[180px] px-4 py-2.5 rounded-lg text-xs font-extrabold transition-all ${
                      activeTab === 'access-keys'
                        ? 'overlay-home-btn-active text-white'
                        : 'overlay-home-btn'
                    }`}
                  >
                    Create User ID &amp; Password
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('overlay-accounts')}
                    className={`flex-1 min-w-[160px] px-4 py-2.5 rounded-lg text-xs font-extrabold transition-all ${
                      activeTab === 'overlay-accounts'
                        ? 'overlay-home-btn-active text-white'
                        : 'overlay-home-btn'
                    }`}
                  >
                    Overlay Accounts
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('generate-users')}
                    className={`flex-1 min-w-[160px] px-4 py-2.5 rounded-lg text-xs font-extrabold transition-all ${
                      activeTab === 'generate-users'
                        ? 'overlay-home-btn-active text-white'
                        : 'overlay-home-btn'
                    }`}
                  >
                    Email Auth Users
                  </button>
                  {!authStatus.configured && (
                    <button
                      type="button"
                      onClick={() => {
                        setChangePinOpen((v) => !v);
                        setPinFeedback(null);
                      }}
                      className="px-3.5 py-2.5 rounded-lg overlay-home-btn text-xs font-bold whitespace-nowrap inline-flex items-center gap-1.5"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-[#FFE600]" aria-hidden="true" />
                      <span>Change PIN</span>
                    </button>
                  )}
                </div>

                {changePinOpen && !authStatus.configured && (
                  <form
                    onSubmit={handleChangeOwnerPin}
                    className="rounded-xl bg-[#0B0618]/90 border border-[#FFE600]/35 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#FFE600]">
                        Update Owner Admin PIN / Password
                      </p>
                      <button
                        type="button"
                        onClick={() => setChangePinOpen(false)}
                        className="p-1 text-zinc-400 hover:text-white"
                        aria-label="Close change PIN form"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {pinFeedback && (
                      <div
                        role={pinFeedback.type === 'err' ? 'alert' : 'status'}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                          pinFeedback.type === 'ok'
                            ? 'bg-emerald-950/70 border border-emerald-500/45 text-emerald-200'
                            : 'bg-red-950/75 border border-red-500/50 text-red-100'
                        }`}
                      >
                        {pinFeedback.text}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="password"
                        required
                        value={currentPinInput}
                        onChange={(e) => setCurrentPinInput(e.target.value)}
                        placeholder="Current Owner PIN / Password"
                        className="w-full px-3 py-2 rounded-lg bg-[#15151C] border border-white/15 focus:border-[#FFE600] focus:outline-none text-xs text-white"
                      />
                      <input
                        type="password"
                        required
                        value={newPinInput}
                        onChange={(e) => setNewPinInput(e.target.value)}
                        placeholder="New Owner PIN (min 4 chars)"
                        className="w-full px-3 py-2 rounded-lg bg-[#15151C] border border-white/15 focus:border-[#FFE600] focus:outline-none text-xs text-white"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={pinSaving}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg btn-gold-pro disabled:opacity-60 text-[#070B28] font-display font-black text-xs uppercase tracking-wide"
                    >
                      <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{pinSaving ? 'Updating...' : 'Save New Owner PIN'}</span>
                    </button>
                  </form>
                )}

                {activeTab === 'access-keys' ? (
                  <AdminAccessKeysPanel onLockAdmin={() => void handleLockAdmin()} />
                ) : activeTab === 'overlay-accounts' ? (
                  <OverlayAccountsManager
                    adminToken={adminToken}
                    onLockAdmin={() => void handleLockAdmin()}
                  />
                ) : (
                  <GenerateUserPanel
                    adminToken={adminToken}
                    onLockAdmin={() => void handleLockAdmin()}
                  />
                )}
              </div>
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
                    Set your private owner password to manage Client Access IDs and Scoreboard Overlay Control accounts. You can also set <span className="font-mono text-zinc-200">ADMIN_PASSCODE</span> in server secrets to override this anytime.
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
                      New Owner PIN / Password (min 4 chars)
                    </label>
                    <div className="relative">
                      <input
                        id="owner-claim-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter 4+ digit PIN or password"
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
                      Confirm Owner PIN / Password
                    </label>
                    <input
                      id="owner-claim-confirm"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter PIN or password"
                      className="w-full px-4 py-3 rounded-xl bg-[#09090D] border border-white/15 focus:border-[#FFE600] focus:outline-none text-sm text-white placeholder:text-zinc-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl btn-gold-pro disabled:opacity-60 text-[#070B28] font-display font-black text-sm uppercase tracking-wide transition-colors"
                  >
                    <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{submitting ? 'Saving...' : 'Set PIN & Open Admin Panel'}</span>
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
                    Sign in with your owner admin password to manage Access IDs and Overlay Controller accounts.
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
                      Owner Admin PIN / Password
                    </label>
                    <div className="relative">
                      <input
                        id="owner-admin-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter owner admin PIN / password"
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
                    className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl btn-gold-pro disabled:opacity-60 text-[#070B28] font-display font-black text-sm uppercase tracking-wide transition-colors"
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
