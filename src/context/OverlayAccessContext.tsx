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
}

interface OverlayAccessContextValue {
  session: UnlockedOverlaySession | null;
  isUnlocked: boolean;
  isReady: boolean;
  unlockWithCredentials: (loginId: string, password: string) => Promise<UnlockResult>;
  lockAndLogout: () => void;
}

const OverlayAccessContext = createContext<OverlayAccessContextValue | null>(null);

export function OverlayAccessProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<UnlockedOverlaySession | null>(() =>
    loadStoredSession()
  );
  const [isReady, setIsReady] = useState(false);

  const lockAndLogout = useCallback(() => {
    setSession(null);
    persistSession(null);
    try {
      const supabase = getSupabaseClient();
      void supabase.auth.signOut();
    } catch {
      // Ignore signOut errors
    }
  }, []);

  // Re-verify active Supabase Auth session or legacy Access ID on load
  useEffect(() => {
    let active = true;

    const verifySession = async () => {
      try {
        const supabase = getSupabaseClient();

        // 1. Check active Supabase Auth session first
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

        // 2. Otherwise check stored session
        const current = loadStoredSession();
        if (!current) {
          setSession(null);
          return;
        }

        // If previously signed in via Supabase Auth but session is gone/revoked, lock immediately
        if (current.authType === 'supabase_auth') {
          setSession(null);
          persistSession(null);
          return;
        }

        // 3. Re-verify legacy Access ID against overlay_access_keys
        const { data, error } = await supabase
          .from(SUPABASE_ACCESS_KEYS_TABLE)
          .select('access_id, label, is_active')
          .eq('access_id', current.accessId)
          .maybeSingle();

        if (!active) return;

        if (!error) {
          if (!data || !data.is_active) {
            setSession(null);
            persistSession(null);
          } else {
            const refreshed: UnlockedOverlaySession = {
              accessId: String(data.access_id),
              label: typeof data.label === 'string' ? data.label : '',
              unlockedAt: current.unlockedAt,
              authType: 'access_key',
            };
            setSession(refreshed);
            persistSession(refreshed);
          }
        }
      } catch {
        // Keep cached session if offline
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
      const trimmedRaw = String(rawLoginId || '').trim();
      const trimmedPass = String(rawPassword || '').trim();

      if (!trimmedRaw || !trimmedPass) {
        return {
          ok: false,
          error: 'Please enter both Login ID and Password.',
        };
      }

      const supabase = getSupabaseClient();

      // 1. Supabase Authentication login for admin-created Email + Password accounts
      if (trimmedRaw.includes('@')) {
        const email = trimmedRaw.toLowerCase().slice(0, 254);
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
          return { ok: true };
        } catch {
          return {
            ok: false,
            error: 'Network error while signing in. Please try again.',
          };
        }
      }

      // 2. Legacy Client Access ID login via overlay_access_keys (backward compatible)
      const trimmedId = sanitizeAccessIdInput(trimmedRaw);
      const upperId = trimmedId.toUpperCase();

      try {
        const candidateIds = trimmedId === upperId ? [trimmedId] : [trimmedId, upperId];

        const { data, error } = await supabase
          .from(SUPABASE_ACCESS_KEYS_TABLE)
          .select('access_id, password, label, is_active')
          .in('access_id', candidateIds);

        if (error) {
          return {
            ok: false,
            error: 'Could not verify Login ID right now. Please try again.',
          };
        }

        const rows = (Array.isArray(data) ? data : []) as OverlayAccessKeyRow[];
        const matched = rows.find((row) => String(row.password || '').trim() === trimmedPass);

        if (!matched) {
          return {
            ok: false,
            error: 'Invalid Login ID or Password. Please check with Star Event Live.',
          };
        }

        if (!matched.is_active) {
          return {
            ok: false,
            error: 'This account is currently inactive. Contact Star Event Live.',
          };
        }

        const nextSession: UnlockedOverlaySession = {
          accessId: String(matched.access_id),
          label: typeof matched.label === 'string' ? matched.label : '',
          unlockedAt: Date.now(),
          authType: 'access_key',
        };

        setSession(nextSession);
        persistSession(nextSession);
        return { ok: true };
      } catch {
        return {
          ok: false,
          error: 'Network error while verifying credentials. Please try again.',
        };
      }
    },
    []
  );

  const value = useMemo<OverlayAccessContextValue>(
    () => ({
      session,
      isUnlocked: Boolean(session),
      isReady,
      unlockWithCredentials,
      lockAndLogout,
    }),
    [session, isReady, unlockWithCredentials, lockAndLogout]
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
