import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  getSupabaseClient,
  SUPABASE_ACCESS_KEYS_TABLE,
} from '../lib/supabaseClient';

export interface OverlayAccessKeyRow {
  id?: string | number;
  access_id: string;
  password: string;
  label: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface UnlockedOverlaySession {
  accessId: string;
  label: string;
  unlockedAt: number;
  authType?: 'supabase_auth' | 'access_key';
  userId?: string;
  email?: string;
}

const STORAGE_KEY = 'starevent_overlay_access_v1';

function loadStoredSession(): UnlockedOverlaySession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UnlockedOverlaySession> | null;
    if (!parsed || typeof parsed.accessId !== 'string' || !parsed.accessId.trim()) {
      return null;
    }
    return {
      accessId: parsed.accessId.trim(),
      label: typeof parsed.label === 'string' ? parsed.label : '',
      unlockedAt:
        typeof parsed.unlockedAt === 'number' && Number.isFinite(parsed.unlockedAt)
          ? parsed.unlockedAt
          : Date.now(),
      authType:
        parsed.authType === 'supabase_auth' || parsed.authType === 'access_key'
          ? parsed.authType
          : 'access_key',
      userId: typeof parsed.userId === 'string' ? parsed.userId : undefined,
      email: typeof parsed.email === 'string' ? parsed.email : undefined,
    };
  } catch {
    return null;
  }
}

function persistSession(session: UnlockedOverlaySession | null) {
  if (typeof window === 'undefined') return;
  try {
    if (session) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore localStorage quota/privacy errors
  }
}

function escapeLikePattern(raw: string): string {
  return raw.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export function sanitizeAccessIdInput(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/\s+/g, '')
    .slice(0, 48);
}

function deriveWorkspaceUidFromAuthUser(
  userId: string,
  profileUid?: string | null,
  metaUid?: unknown
): string {
  if (typeof profileUid === 'string' && profileUid.trim().length >= 3) {
    return profileUid.trim().toUpperCase().slice(0, 32);
  }
  if (typeof metaUid === 'string' && metaUid.trim().length >= 3) {
    return metaUid.trim().toUpperCase().slice(0, 32);
  }
  return `USR-${userId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

interface UnlockResult {
  ok: boolean;
  error?: string;
  session?: UnlockedOverlaySession;
}

interface OverlayAccessContextValue {
  session: UnlockedOverlaySession | null;
  isUnlocked: boolean;
  isReady: boolean;
  isOwnerAccount: boolean;
  ownerGateToken: string;
  unlockWithCredentials: (loginId: string, password: string) => Promise<UnlockResult>;
  lockAndLogout: () => void;
  getPaymentAuthHeaders: () => Promise<Record<string, string>>;
}

const OverlayAccessContext = createContext<OverlayAccessContextValue | null>(null);

export function OverlayAccessProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<UnlockedOverlaySession | null>(() =>
    loadStoredSession()
  );
  const [customerBearerToken, setCustomerBearerToken] = useState<string>('');
  const [isOwnerAccount, setIsOwnerAccount] = useState<boolean>(false);
  const [ownerGateToken, setOwnerGateToken] = useState<string>('');
  const [isReady, setIsReady] = useState(false);

  const lockAndLogout = useCallback(() => {
    setSession(null);
    setCustomerBearerToken('');
    setIsOwnerAccount(false);
    setOwnerGateToken('');
    persistSession(null);
    void fetch('/api/customer-auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    }).catch(() => {});
    try {
      const supabase = getSupabaseClient();
      void supabase.auth.signOut();
    } catch {
      // Ignore signOut errors
    }
  }, []);

  const getPaymentAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {
      'X-Requested-With': 'XMLHttpRequest',
    };
    if (customerBearerToken) {
      headers['Authorization'] = `Bearer ${customerBearerToken}`;
      return headers;
    }
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const accessToken = data?.session?.access_token;
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
    } catch {
      // Fall back to HttpOnly session cookie sent via credentials: 'include'
    }
    return headers;
  }, [customerBearerToken]);

  // Keep session synchronized across open browser tabs (login & logout)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (evt: StorageEvent) => {
      if (evt.key !== STORAGE_KEY) return;
      setSession(loadStoredSession());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Re-verify active session against Supabase overlay_access_keys (or Supabase Auth) on load
  useEffect(() => {
    let active = true;

    const verifySession = async () => {
      try {
        // 0. Always check server-verified HttpOnly owner gate cookie (never trust localStorage)
        let serverOwnerAuthorized = false;
        try {
          const gateRes = await fetch('/api/admin/gate-status', {
            cache: 'no-store',
            credentials: 'include',
          });
          const gateJson = (await gateRes.json().catch(() => null)) as {
            authorized?: boolean;
          } | null;
          serverOwnerAuthorized = Boolean(gateRes.ok && gateJson?.authorized);
        } catch {
          serverOwnerAuthorized = false;
        }
        if (!active) return;
        setIsOwnerAccount(serverOwnerAuthorized);

        const supabase = getSupabaseClient();
        const current = loadStoredSession();

        // 1. If stored session is an overlay_access_keys session, re-verify it directly
        if (current && current.authType !== 'supabase_auth') {
          if (serverOwnerAuthorized) {
            setSession(current);
            return;
          }

          const cleanId = current.accessId.trim();
          const { data, error } = await supabase
            .from(SUPABASE_ACCESS_KEYS_TABLE)
            .select('access_id, label, is_active')
            .ilike('access_id', escapeLikePattern(cleanId));

          if (!active) return;

          if (!error) {
            const rows = (Array.isArray(data) ? data : []) as Array<{
              access_id: string;
              label: string | null;
              is_active: boolean;
            }>;
            const exactRow = rows.find(
              (r) => String(r.access_id || '').trim().toLowerCase() === cleanId.toLowerCase()
            );

            if (!exactRow || exactRow.is_active !== true) {
              setSession(null);
              persistSession(null);
            } else {
              const refreshed: UnlockedOverlaySession = {
                accessId: String(exactRow.access_id).trim(),
                label: typeof exactRow.label === 'string' ? exactRow.label : '',
                unlockedAt: current.unlockedAt,
                authType: 'access_key',
              };
              setSession(refreshed);
              persistSession(refreshed);
            }
          }
          return;
        }

        // 2. Check active Supabase Auth session (for email-based accounts)
        const { data: authData } = await supabase.auth.getUser();
        if (!active) return;

        if (authData?.user) {
          const authUser = authData.user;
          let profileUid: string | null = null;
          let profileName: string | null = null;
          let profileActive = true;

          try {
            const { data: prof } = await supabase
              .from('profiles')
              .select('uid, full_name, is_active')
              .eq('id', authUser.id)
              .maybeSingle();
            if (prof) {
              profileUid = typeof prof.uid === 'string' ? prof.uid : null;
              profileName = typeof prof.full_name === 'string' ? prof.full_name : null;
              if (prof.is_active === false) profileActive = false;
            }
          } catch {
            // profiles table may not be migrated yet; fall back to user_metadata
          }

          if (!active) return;

          if (!profileActive || authUser.user_metadata?.is_active === false) {
            await supabase.auth.signOut();
            if (active) {
              setSession(null);
              persistSession(null);
            }
            return;
          }

          const workspaceUid = deriveWorkspaceUidFromAuthUser(
            authUser.id,
            profileUid,
            authUser.user_metadata?.uid
          );
          const refreshed: UnlockedOverlaySession = {
            accessId: workspaceUid,
            label: profileName || authUser.email || workspaceUid,
            unlockedAt: Date.now(),
            authType: 'supabase_auth',
            userId: authUser.id,
            email: authUser.email || undefined,
          };
          setSession(refreshed);
          persistSession(refreshed);
          return;
        }

        // 3. No active session
        setSession(null);
        if (current?.authType === 'supabase_auth') {
          persistSession(null);
        }
      } catch {
        // Keep cached localStorage session if offline
      } finally {
        if (active) setIsReady(true);
      }
    };

    void verifySession();
    return () => {
      active = false;
    };
  }, []);

  const unlockWithCredentials = useCallback(
    async (rawLoginId: string, rawPassword: string): Promise<UnlockResult> => {
      const trimmedId = String(rawLoginId || '').trim();
      const trimmedPass = String(rawPassword || '').trim();

      if (!trimmedId || !trimmedPass) {
        return {
          ok: false,
          error: 'Please enter both Login ID and Password.',
        };
      }

      const supabase = getSupabaseClient();

      const hasWildcardChars = /[*%]/.test(trimmedId);

      // 0. Check server-side single Owner Admin account authentication first (no secrets in browser)
      if (!hasWildcardChars && !trimmedId.includes('@')) {
        try {
          const srvRes = await fetch('/api/customer-auth/login', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({ loginId: trimmedId, password: trimmedPass }),
          });
          const srvJson = (await srvRes.json().catch(() => null)) as {
            ok?: boolean;
            token?: string;
            customerId?: string;
            label?: string;
            isOwnerAccount?: boolean;
            ownerGateToken?: string;
          } | null;

          if (srvRes.ok && srvJson?.ok && srvJson.isOwnerAccount === true) {
            if (typeof srvJson.token === 'string') {
              setCustomerBearerToken(srvJson.token);
            }
            setIsOwnerAccount(true);
            setOwnerGateToken(
              typeof srvJson.ownerGateToken === 'string' ? srvJson.ownerGateToken : ''
            );
            const nextSession: UnlockedOverlaySession = {
              accessId: String(srvJson.customerId || trimmedId).trim().toUpperCase(),
              label: typeof srvJson.label === 'string' ? srvJson.label : '',
              unlockedAt: Date.now(),
              authType: 'access_key',
            };
            setSession(nextSession);
            persistSession(nextSession);
            return { ok: true, session: nextSession };
          }
        } catch {
          // Continue to Supabase client key verification below
        }
      }

      // 1. Primary unified verification directly against Supabase `overlay_access_keys`
      //    (`.ilike('access_id', inputId.trim())` with wildcard protection, `is_active === true`, and trimmed password match)
      if (!hasWildcardChars) {
        try {
          const { data, error } = await supabase
            .from(SUPABASE_ACCESS_KEYS_TABLE)
            .select('access_id, password, label, is_active')
            .ilike('access_id', escapeLikePattern(trimmedId));

          if (!error && Array.isArray(data) && data.length > 0) {
            const rows = data as OverlayAccessKeyRow[];
            const exactIdRows = rows.filter(
              (row) => String(row.access_id || '').trim().toLowerCase() === trimmedId.toLowerCase()
            );

            if (exactIdRows.length > 0) {
              const matched = exactIdRows.find(
                (row) => String(row.password || '').trim() === trimmedPass
              );

              if (!matched) {
                return {
                  ok: false,
                  error: 'Invalid Login ID or Password. Please check with Star Event Live.',
                };
              }

              if (matched.is_active !== true) {
                return {
                  ok: false,
                  error: 'This account is currently inactive. Contact Star Event Live.',
                };
              }

              const canonicalAccessId = String(matched.access_id).trim();
              setIsOwnerAccount(false);
              setOwnerGateToken('');
              // Establish server-verified customer session (HttpOnly cookie + in-memory Bearer token)
              try {
                const srvRes = await fetch('/api/customer-auth/login', {
                  method: 'POST',
                  credentials: 'include',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                  },
                  body: JSON.stringify({ loginId: trimmedId, password: trimmedPass }),
                });
                const srvJson = (await srvRes.json().catch(() => null)) as {
                  ok?: boolean;
                  token?: string;
                } | null;
                if (srvRes.ok && srvJson?.ok && typeof srvJson.token === 'string') {
                  setCustomerBearerToken(srvJson.token);
                }
              } catch {
                // Non-fatal if offline; payment endpoints enforce server auth when invoked
              }

              const nextSession: UnlockedOverlaySession = {
                accessId: canonicalAccessId,
                label: typeof matched.label === 'string' ? matched.label : '',
                unlockedAt: Date.now(),
                authType: 'access_key',
              };

              setSession(nextSession);
              persistSession(nextSession);
              return { ok: true, session: nextSession };
            }
          } else if (error && !trimmedId.includes('@')) {
            return {
              ok: false,
              error: 'Could not verify Login ID right now. Please try again.',
            };
          }
        } catch {
          if (!trimmedId.includes('@')) {
            return {
              ok: false,
              error: 'Network error while verifying credentials. Please try again.',
            };
          }
        }
      }

      // 2. Fallback: Supabase Authentication login for admin-created Email + Password accounts
      if (trimmedId.includes('@')) {
        const email = trimmedId.toLowerCase().slice(0, 254);
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password: trimmedPass,
          });

          if (error || !data?.user) {
            const msg = error?.message?.toLowerCase() || '';
            if (msg.includes('ban') || msg.includes('deactivat') || msg.includes('disabled')) {
              return {
                ok: false,
                error: 'This account has been deactivated by the administrator.',
              };
            }
            return {
              ok: false,
              error: 'Invalid Login ID or Password. Please check with the administrator.',
            };
          }

          const authUser = data.user;
          let profileUid: string | null = null;
          let profileName: string | null = null;
          let profileActive = true;

          try {
            const { data: prof } = await supabase
              .from('profiles')
              .select('uid, full_name, is_active')
              .eq('id', authUser.id)
              .maybeSingle();
            if (prof) {
              profileUid = typeof prof.uid === 'string' ? prof.uid : null;
              profileName = typeof prof.full_name === 'string' ? prof.full_name : null;
              if (prof.is_active === false) profileActive = false;
            }
          } catch {
            // Fall back to user_metadata if profiles table not yet migrated
          }

          if (!profileActive || authUser.user_metadata?.is_active === false) {
            await supabase.auth.signOut();
            return {
              ok: false,
              error: 'This account has been deactivated by the administrator.',
            };
          }

          const workspaceUid = deriveWorkspaceUidFromAuthUser(
            authUser.id,
            profileUid,
            authUser.user_metadata?.uid
          );

          const nextSession: UnlockedOverlaySession = {
            accessId: workspaceUid,
            label: profileName || authUser.email || workspaceUid,
            unlockedAt: Date.now(),
            authType: 'supabase_auth',
            userId: authUser.id,
            email: authUser.email || email,
          };

          setSession(nextSession);
          persistSession(nextSession);
          return { ok: true, session: nextSession };
        } catch {
          return {
            ok: false,
            error: 'Network error while signing in. Please try again.',
          };
        }
      }

      return {
        ok: false,
        error: 'Invalid Login ID or Password. Please check with Star Event Live.',
      };
    },
    []
  );

  const value = useMemo<OverlayAccessContextValue>(
    () => ({
      session,
      isUnlocked: Boolean(session),
      isReady,
      isOwnerAccount,
      ownerGateToken,
      unlockWithCredentials,
      lockAndLogout,
      getPaymentAuthHeaders,
    }),
    [
      session,
      isReady,
      isOwnerAccount,
      ownerGateToken,
      unlockWithCredentials,
      lockAndLogout,
      getPaymentAuthHeaders,
    ]
  );

  return (
    <OverlayAccessContext.Provider value={value}>
      {children}
    </OverlayAccessContext.Provider>
  );
}

export function useOverlayAccess(): OverlayAccessContextValue {
  const ctx = useContext(OverlayAccessContext);
  if (!ctx) {
    throw new Error('useOverlayAccess must be used inside <OverlayAccessProvider>');
  }
  return ctx;
}
