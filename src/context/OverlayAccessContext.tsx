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

interface UnlockResult {
  ok: boolean;
  error?: string;
}

interface OverlayAccessContextValue {
  session: UnlockedOverlaySession | null;
  isUnlocked: boolean;
  isReady: boolean;
  unlockWithCredentials: (accessId: string, password: string) => Promise<UnlockResult>;
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
  }, []);

  // Re-verify stored Access ID against Supabase overlay_access_keys so deactivated/deleted IDs lock automatically
  useEffect(() => {
    let active = true;
    const current = loadStoredSession();
    if (!current) {
      setIsReady(true);
      return;
    }

    const verifyStored = async () => {
      try {
        const supabase = getSupabaseClient();
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

    void verifyStored();
    return () => {
      active = false;
    };
  }, []);

  const unlockWithCredentials = useCallback(
    async (rawAccessId: string, rawPassword: string): Promise<UnlockResult> => {
      const trimmedId = sanitizeAccessIdInput(rawAccessId);
      const upperId = trimmedId.toUpperCase();
      const trimmedPass = String(rawPassword || '').trim();

      if (!trimmedId || !trimmedPass) {
        return {
          ok: false,
          error: 'Please enter both Access ID and Password.',
        };
      }

      try {
        const supabase = getSupabaseClient();
        const candidateIds = trimmedId === upperId ? [trimmedId] : [trimmedId, upperId];

        const { data, error } = await supabase
          .from(SUPABASE_ACCESS_KEYS_TABLE)
          .select('access_id, password, label, is_active')
          .in('access_id', candidateIds);

        if (error) {
          return {
            ok: false,
            error: 'Could not verify Access ID right now. Please try again.',
          };
        }

        const rows = (Array.isArray(data) ? data : []) as OverlayAccessKeyRow[];
        const matched = rows.find((row) => String(row.password || '').trim() === trimmedPass);

        if (!matched) {
          return {
            ok: false,
            error: 'Invalid Access ID or Password. Please check with Star Event Live.',
          };
        }

        if (!matched.is_active) {
          return {
            ok: false,
            error: 'This Access ID is currently inactive. Contact Star Event Live.',
          };
        }

        const nextSession: UnlockedOverlaySession = {
          accessId: String(matched.access_id),
          label: typeof matched.label === 'string' ? matched.label : '',
          unlockedAt: Date.now(),
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
