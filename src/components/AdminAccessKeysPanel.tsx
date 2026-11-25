import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { OverlayAccessKeyRow } from '../context/OverlayAccessContext';
import {
  getSupabaseClient,
  SUPABASE_ACCESS_KEYS_TABLE,
} from '../lib/supabaseClient';

interface AdminAccessKeysPanelProps {
  onLockAdmin: () => void;
}

function secureRandomInt(maxExclusive: number): number {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    return arr[0] % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

function generateRandomAccessId(): string {
  const digits = 1000 + secureRandomInt(9000);
  return `STAR-${digits}`;
}

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += chars[secureRandomInt(chars.length)];
  }
  return out;
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
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

export function AdminAccessKeysPanel({ onLockAdmin }: AdminAccessKeysPanelProps) {
  const [keys, setKeys] = useState<OverlayAccessKeyRow[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Generator fields
  const [labelInput, setLabelInput] = useState('');
  const [accessIdInput, setAccessIdInput] = useState(() => generateRandomAccessId());
  const [passwordInput, setPasswordInput] = useState(() => generateRandomPassword());
  const [justCreated, setJustCreated] = useState<OverlayAccessKeyRow | null>(null);

  const fetchKeys = useCallback(async () => {
    setLoadingKeys(true);
    setErrorMsg(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from(SUPABASE_ACCESS_KEYS_TABLE)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Retry without ordering if created_at column does not exist
        const retry = await supabase.from(SUPABASE_ACCESS_KEYS_TABLE).select('*');
        if (retry.error) {
          setErrorMsg(retry.error.message || 'Could not load overlay_access_keys.');
        } else {
          setKeys((retry.data as OverlayAccessKeyRow[]) || []);
        }
      } else {
        setKeys((data as OverlayAccessKeyRow[]) || []);
      }
    } catch {
      setErrorMsg('Network error loading keys from Supabase.');
    } finally {
      setLoadingKeys(false);
    }
  }, []);

  useEffect(() => {
    void fetchKeys();
  }, [fetchKeys]);

  const handleRandomize = () => {
    setAccessIdInput(generateRandomAccessId());
    setPasswordInput(generateRandomPassword());
  };

  const handleCreateKey = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanId = accessIdInput
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '')
      .slice(0, 32);
    const cleanPass = passwordInput.trim().slice(0, 48);
    const cleanLabel = labelInput.trim().slice(0, 64);

    if (cleanId.length < 3) {
      setErrorMsg('Access ID must be at least 3 characters (letters, numbers, - or _).');
      return;
    }
    if (cleanPass.length < 4) {
      setErrorMsg('Password must be at least 4 characters.');
      return;
    }

    setSaving(true);
    try {
      const supabase = getSupabaseClient();
      const payload = {
        access_id: cleanId,
        password: cleanPass,
        label: cleanLabel || 'Client Access',
        is_active: true,
      };

      const { data, error } = await supabase
        .from(SUPABASE_ACCESS_KEYS_TABLE)
        .insert(payload)
        .select('*')
        .maybeSingle();

      if (error) {
        if (error.code === '23505') {
          setErrorMsg(`Access ID "${cleanId}" already exists. Click Random or pick another ID.`);
        } else {
          setErrorMsg(error.message || 'Failed to save Access ID in Supabase.');
        }
        return;
      }

      const createdRow: OverlayAccessKeyRow = (data as OverlayAccessKeyRow) || payload;
      setJustCreated(createdRow);
      setLabelInput('');
      setAccessIdInput(generateRandomAccessId());
      setPasswordInput(generateRandomPassword());
      await fetchKeys();
    } catch {
      setErrorMsg('Network error while saving Access ID.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (row: OverlayAccessKeyRow) => {
    setBusyId(row.access_id);
    setErrorMsg(null);
    try {
      const supabase = getSupabaseClient();
      const nextActive = !row.is_active;
      const { error } = await supabase
        .from(SUPABASE_ACCESS_KEYS_TABLE)
        .update({ is_active: nextActive })
        .eq('access_id', row.access_id);

      if (error) {
        setErrorMsg(error.message || 'Failed to update status.');
      } else {
        setKeys((prev) =>
          prev.map((item) =>
            item.access_id === row.access_id ? { ...item, is_active: nextActive } : item
          )
        );
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteKey = async (accessId: string) => {
    setBusyId(accessId);
    setErrorMsg(null);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from(SUPABASE_ACCESS_KEYS_TABLE)
        .delete()
        .eq('access_id', accessId);

      if (error) {
        setErrorMsg(error.message || 'Failed to delete Access ID.');
      } else {
        setKeys((prev) => prev.filter((item) => item.access_id !== accessId));
        setConfirmDeleteId(null);
        if (justCreated?.access_id === accessId) {
          setJustCreated(null);
        }
      }
    } finally {
      setBusyId(null);
    }
  };

  const formatShareBundle = (row: OverlayAccessKeyRow) => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://starevent.live';
    return [
      'STAR EVENT LIVE — Overlay Access',
      row.label ? `Client: ${row.label}` : null,
      `Access ID: ${row.access_id}`,
      `Password: ${row.password}`,
      `Open Overlays: ${origin}/overlays`,
    ]
      .filter(Boolean)
      .join('\n');
  };

  const handleCopyBundle = async (row: OverlayAccessKeyRow, key: string) => {
    const ok = await copyText(formatShareBundle(row));
    if (ok) {
      setCopiedId(key);
      window.setTimeout(() => setCopiedId((prev) => (prev === key ? null : prev)), 2000);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#FFE600] shrink-0" aria-hidden="true" />
          <div>
            <h3 className="font-display text-base sm:text-lg font-black text-white leading-tight">
              Access ID Generator
            </h3>
            <p className="text-[11px] font-mono text-zinc-400">
              Supabase · overlay_access_keys
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchKeys()}
            disabled={loadingKeys}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/12 text-xs font-semibold text-zinc-200 whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingKeys ? 'animate-spin' : ''}`} />
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

      {/* One-Click Generator Form */}
      <form
        onSubmit={handleCreateKey}
        className="rounded-xl bg-[#09090D] border border-[#FFE600]/30 p-4 space-y-3.5"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#FFE600]">
            Create New Client Access ID
          </span>
          <button
            type="button"
            onClick={handleRandomize}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-bold text-white whitespace-nowrap"
          >
            <RefreshCw className="w-3 h-3 text-[#FFE600]" />
            Random Pair
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-zinc-400">
              Client / Event Label
            </label>
            <input
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              placeholder="e.g. Bharat Nirguda"
              maxLength={64}
              className="w-full px-3 py-2 rounded-lg bg-[#15151C] border border-white/15 focus:border-[#FFE600] focus:outline-none text-xs text-white placeholder:text-zinc-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-zinc-400">
              Access ID
            </label>
            <input
              type="text"
              value={accessIdInput}
              onChange={(e) => setAccessIdInput(e.target.value.toUpperCase())}
              placeholder="STAR-101"
              maxLength={32}
              className="w-full px-3 py-2 rounded-lg bg-[#15151C] border border-white/15 focus:border-[#FFE600] focus:outline-none text-xs font-mono font-bold text-[#FFE600] uppercase"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-zinc-400">
              Password
            </label>
            <input
              type="text"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Password"
              maxLength={48}
              className="w-full px-3 py-2 rounded-lg bg-[#15151C] border border-white/15 focus:border-[#FFE600] focus:outline-none text-xs font-mono font-bold text-white"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#EF4444] disabled:opacity-60 text-white font-display font-black text-xs sm:text-sm uppercase tracking-wide transition-colors"
        >
          <Plus className="w-4 h-4 text-[#FFE600]" />
          <span>{saving ? 'Saving to Supabase...' : 'Generate & Save Access Key'}</span>
        </button>
      </form>

      {/* Newly Created Copy-Ready Banner */}
      {justCreated && (
        <div className="rounded-xl bg-emerald-950/55 border border-emerald-400/45 p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5 text-xs">
            <p className="font-bold text-emerald-300">
              New Access Key Created &amp; Active
            </p>
            <p className="font-mono text-white">
              ID: <strong className="text-[#FFE600]">{justCreated.access_id}</strong> · Pass:{' '}
              <strong>{justCreated.password}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleCopyBundle(justCreated, 'created')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#FFE600] hover:bg-[#FEF08A] text-[#09090D] font-display font-black text-xs whitespace-nowrap"
          >
            {copiedId === 'created' ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied for Client
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy ID &amp; Password
              </>
            )}
          </button>
        </div>
      )}

      {/* Existing Access Keys List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Saved Access Keys ({keys.length})
          </h4>
        </div>

        {loadingKeys && keys.length === 0 ? (
          <p className="text-xs text-zinc-400 py-6 text-center">
            Loading access keys from Supabase...
          </p>
        ) : keys.length === 0 ? (
          <div className="rounded-xl bg-[#09090D] border border-white/10 p-5 text-center text-xs text-zinc-400">
            No Access IDs created yet. Click <strong>Generate &amp; Save Access Key</strong> above to create your first client login.
          </div>
        ) : (
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {keys.map((row) => {
              const isRevealed = Boolean(revealedPasswords[row.access_id]);
              const isBusy = busyId === row.access_id;
              const isConfirmingDelete = confirmDeleteId === row.access_id;

              return (
                <div
                  key={row.access_id}
                  className={`rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    row.is_active
                      ? 'bg-[#0D0D13] border-white/12'
                      : 'bg-[#0A0A0E] border-red-500/25 opacity-75'
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <KeyRound className="w-3.5 h-3.5 text-[#FFE600] shrink-0" />
                      <span className="font-mono text-sm font-black text-[#FFE600]">
                        {row.access_id}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                          row.is_active
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35'
                            : 'bg-red-500/20 text-red-300 border border-red-500/35'
                        }`}
                      >
                        {row.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                      {row.label && <span className="text-zinc-200 font-medium">{row.label}</span>}
                      <span className="inline-flex items-center gap-1 font-mono">
                        <span>Pass:</span>
                        <strong className="text-white">
                          {isRevealed ? row.password : '••••••••'}
                        </strong>
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedPasswords((prev) => ({
                              ...prev,
                              [row.access_id]: !prev[row.access_id],
                            }))
                          }
                          aria-label={isRevealed ? 'Hide password' : 'Show password'}
                          className="p-0.5 text-zinc-400 hover:text-white"
                        >
                          {isRevealed ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handleCopyBundle(row, row.access_id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-bold text-white whitespace-nowrap"
                    >
                      {copiedId === row.access_id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-[#FFE600]" />
                          Copy
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleToggleActive(row)}
                      className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold whitespace-nowrap ${
                        row.is_active
                          ? 'bg-amber-950/60 hover:bg-amber-900/70 border-amber-500/40 text-amber-200'
                          : 'bg-emerald-950/60 hover:bg-emerald-900/70 border-emerald-500/40 text-emerald-200'
                      }`}
                    >
                      {row.is_active ? 'Disable' : 'Activate'}
                    </button>

                    {!isConfirmingDelete ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setConfirmDeleteId(row.access_id)}
                        aria-label={`Delete ${row.access_id}`}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 border border-red-500/35 text-red-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleDeleteKey(row.access_id)}
                          className="px-2 py-1.5 rounded-lg bg-[#DC2626] hover:bg-[#EF4444] text-[11px] font-black text-white whitespace-nowrap"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1.5 rounded-lg bg-white/10 text-[11px] font-bold text-zinc-200 whitespace-nowrap"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
