import { useCallback, useEffect, useRef, useState } from 'react';
import { createInitialCricketSuiteState } from '../data/cricketSampleData';
import {
  getSupabaseClient,
  SUPABASE_SCOREBOARD_TABLE,
} from '../lib/supabaseClient';
import { CricketSuiteState } from '../types/cricketSuite';

const STORAGE_PREFIX = 'starevent_cricket_suite_v2:';
const CHANNEL_PREFIX = 'starevent_cricket_overlay_v2:';

export function sanitizeUid(raw: string | null | undefined): string {
  const cleaned = String(raw || '')
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 48);
  return cleaned || 'STAR-101';
}

function getStorageKey(uid: string): string {
  return `${STORAGE_PREFIX}${sanitizeUid(uid)}`;
}

function getSupabaseMatchId(uid: string): string {
  return `cricket_suite_v2_${sanitizeUid(uid)}`;
}

function normalizeLoadedState(
  raw: Partial<CricketSuiteState> | null | undefined,
  uid: string,
  userLabel?: string
): CricketSuiteState | null {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.matches) || !Array.isArray(raw.teams)) {
    return null;
  }
  const base = createInitialCricketSuiteState(uid, userLabel);
  return {
    ...base,
    ...raw,
    version: 2,
    uid,
    user: {
      ...base.user,
      ...(raw.user || {}),
      customThemeColors: {
        ...base.user.customThemeColors,
        ...(raw.user?.customThemeColors || {}),
      },
    },
    overlay: {
      ...base.overlay,
      ...(raw.overlay || {}),
    },
    pointTableOverrides: Array.isArray(raw.pointTableOverrides) ? raw.pointTableOverrides : [],
    pointTableAuditLog: Array.isArray(raw.pointTableAuditLog) ? raw.pointTableAuditLog : [],
    fieldPositions:
      Array.isArray(raw.fieldPositions) && raw.fieldPositions.length > 0
        ? raw.fieldPositions
        : base.fieldPositions,
  };
}

function loadFromLocalStorage(uid: string, userLabel?: string): CricketSuiteState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(getStorageKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CricketSuiteState> | null;
    return normalizeLoadedState(parsed, uid, userLabel);
  } catch {
    return null;
  }
}

function saveToLocalStorage(uid: string, state: CricketSuiteState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getStorageKey(uid), JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Per-user isolated Cricket Suite store with instant localStorage + BroadcastChannel sync
 * and automatic Supabase Realtime (`live_scoreboards`) sync whenever available.
 */
export function useCricketSuiteStore(rawUid: string, userLabel?: string) {
  const uid = sanitizeUid(rawUid);
  const [state, setState] = useState<CricketSuiteState>(() => {
    return loadFromLocalStorage(uid, userLabel) ?? createInitialCricketSuiteState(uid, userLabel);
  });
  const [syncStatus, setSyncStatus] = useState<'supabase' | 'local'>('local');
  const channelRef = useRef<BroadcastChannel | null>(null);
  const pushTimerRef = useRef<number | null>(null);
  const isRemoteRef = useRef(false);

  useEffect(() => {
    const stored = loadFromLocalStorage(uid, userLabel);
    setState(stored ?? createInitialCricketSuiteState(uid, userLabel));
  }, [uid, userLabel]);

  // Same-browser instant cross-tab sync (Controller / Scoring <-> /overlay)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(`${CHANNEL_PREFIX}${uid}`);
    channelRef.current = ch;

    ch.onmessage = (evt) => {
      const incoming = normalizeLoadedState(
        evt.data as Partial<CricketSuiteState> | undefined,
        uid,
        userLabel
      );
      if (incoming && typeof incoming.updatedAt === 'number') {
        setState((prev) => {
          if (incoming.updatedAt <= prev.updatedAt) return prev;
          isRemoteRef.current = true;
          saveToLocalStorage(uid, incoming);
          return incoming;
        });
      }
    };

    return () => {
      ch.close();
      channelRef.current = null;
    };
  }, [uid, userLabel]);

  // Supabase Realtime sync (`live_scoreboards` keyed strictly by uid)
  useEffect(() => {
    let mounted = true;
    const matchRowId = getSupabaseMatchId(uid);
    const supabase = getSupabaseClient();

    const pullRemote = async () => {
      try {
        const { data, error } = await supabase
          .from(SUPABASE_SCOREBOARD_TABLE)
          .select('data, updated_at')
          .eq('match_id', matchRowId)
          .maybeSingle();

        if (!mounted) return;
        if (!error) {
          setSyncStatus('supabase');
          const remoteState = normalizeLoadedState(
            data?.data as Partial<CricketSuiteState> | undefined,
            uid,
            userLabel
          );
          if (remoteState && typeof remoteState.updatedAt === 'number') {
            setState((prev) => {
              if (remoteState.updatedAt <= prev.updatedAt) return prev;
              isRemoteRef.current = true;
              saveToLocalStorage(uid, remoteState);
              return remoteState;
            });
          }
        }
      } catch {
        // Local sync remains active
      }
    };

    void pullRemote();

    const rtChannel = supabase
      .channel(`cricket_suite_v2_${matchRowId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: SUPABASE_SCOREBOARD_TABLE,
          filter: `match_id=eq.${matchRowId}`,
        },
        (payload) => {
          const row = payload.new as { data?: Partial<CricketSuiteState> } | undefined;
          const remoteState = normalizeLoadedState(row?.data, uid, userLabel);
          if (remoteState && typeof remoteState.updatedAt === 'number') {
            setSyncStatus('supabase');
            setState((prev) => {
              if (remoteState.updatedAt <= prev.updatedAt) return prev;
              isRemoteRef.current = true;
              saveToLocalStorage(uid, remoteState);
              return remoteState;
            });
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(rtChannel);
    };
  }, [uid, userLabel]);

  const pushToSupabase = useCallback(
    (nextState: CricketSuiteState) => {
      if (pushTimerRef.current) {
        window.clearTimeout(pushTimerRef.current);
      }
      pushTimerRef.current = window.setTimeout(async () => {
        try {
          const supabase = getSupabaseClient();
          const { error } = await supabase.from(SUPABASE_SCOREBOARD_TABLE).upsert(
            {
              match_id: getSupabaseMatchId(uid),
              sport: 'cricket',
              data: nextState,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'match_id' }
          );
          if (!error) {
            setSyncStatus('supabase');
          }
        } catch {
          // Local sync already succeeded
        }
      }, 100);
    },
    [uid]
  );

  const updateState = useCallback(
    (updater: (prev: CricketSuiteState) => CricketSuiteState) => {
      setState((prev) => {
        const nextRaw = updater(prev);
        const next: CricketSuiteState = {
          ...nextRaw,
          version: 2,
          uid,
          updatedAt: Date.now(),
        };
        saveToLocalStorage(uid, next);
        try {
          channelRef.current?.postMessage(next);
        } catch {
          // Ignore closed channel
        }
        pushToSupabase(next);
        return next;
      });
    },
    [uid, pushToSupabase]
  );

  const resetAllData = useCallback(() => {
    const fresh = createInitialCricketSuiteState(uid, userLabel);
    setState(fresh);
    saveToLocalStorage(uid, fresh);
    try {
      channelRef.current?.postMessage(fresh);
    } catch {
      // ignore
    }
    pushToSupabase(fresh);
  }, [uid, userLabel, pushToSupabase]);

  useEffect(() => {
    if (isRemoteRef.current) {
      isRemoteRef.current = false;
      return;
    }
    saveToLocalStorage(uid, state);
  }, [uid, state]);

  return {
    uid,
    state,
    syncStatus,
    updateState,
    resetDemoData: resetAllData,
  };
}

/**
 * Public real-time listener for `/overlay?uid=<user_id>&match=<optional_match_id>`.
 * Works WITHOUT login and stays 100% blank when no saved state exists.
 */
export function useCricketOverlayListener(rawUid: string) {
  const uid = sanitizeUid(rawUid);
  const [state, setState] = useState<CricketSuiteState | null>(() => {
    return loadFromLocalStorage(uid);
  });

  useEffect(() => {
    const stored = loadFromLocalStorage(uid);
    setState(stored);

    let ch: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      ch = new BroadcastChannel(`${CHANNEL_PREFIX}${uid}`);
      ch.onmessage = (evt) => {
        const incoming = normalizeLoadedState(
          evt.data as Partial<CricketSuiteState> | undefined,
          uid
        );
        if (incoming) setState(incoming);
      };
    }

    const onStorage = (evt: StorageEvent) => {
      if (evt.key !== getStorageKey(uid)) return;
      if (!evt.newValue) {
        setState(null);
        return;
      }
      try {
        const parsed = normalizeLoadedState(
          JSON.parse(evt.newValue) as Partial<CricketSuiteState>,
          uid
        );
        if (parsed) setState(parsed);
      } catch {
        // ignore
      }
    };
    window.addEventListener('storage', onStorage);

    const matchRowId = getSupabaseMatchId(uid);
    const supabase = getSupabaseClient();

    const fetchLatest = async () => {
      try {
        const { data, error } = await supabase
          .from(SUPABASE_SCOREBOARD_TABLE)
          .select('data')
          .eq('match_id', matchRowId)
          .maybeSingle();
        if (!error) {
          const parsed = normalizeLoadedState(
            data?.data as Partial<CricketSuiteState> | undefined,
            uid
          );
          if (parsed) setState(parsed);
        }
      } catch {
        // Local state already loaded
      }
    };

    void fetchLatest();

    const onOnline = () => {
      void fetchLatest();
    };
    window.addEventListener('online', onOnline);

    const rtChannel = supabase
      .channel(`cricket_overlay_v2_view_${matchRowId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: SUPABASE_SCOREBOARD_TABLE,
          filter: `match_id=eq.${matchRowId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setState(null);
            return;
          }
          const row = payload.new as { data?: Partial<CricketSuiteState> | null } | undefined;
          const parsed = normalizeLoadedState(row?.data, uid);
          setState(parsed);
        }
      )
      .subscribe();

    return () => {
      ch?.close();
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('online', onOnline);
      void supabase.removeChannel(rtChannel);
    };
  }, [uid]);

  return { uid, state };
}
