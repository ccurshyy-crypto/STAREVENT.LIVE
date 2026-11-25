import { useCallback, useEffect, useRef, useState } from 'react';
import { createInitialCricketSuiteState } from '../data/cricketSampleData';
import {
  getSupabaseClient,
  SUPABASE_SCOREBOARD_TABLE,
} from '../lib/supabaseClient';
import { CricketSuiteState } from '../types/cricketSuite';

const STORAGE_PREFIX = 'starevent_cricket_suite_v1:';
const CHANNEL_PREFIX = 'starevent_cricket_overlay:';

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
  return `cricket_suite_${sanitizeUid(uid)}`;
}

function loadFromLocalStorage(uid: string): CricketSuiteState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(getStorageKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CricketSuiteState> | null;
    if (!parsed || !Array.isArray(parsed.matches) || !Array.isArray(parsed.teams)) {
      return null;
    }
    return parsed as CricketSuiteState;
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
    return loadFromLocalStorage(uid) ?? createInitialCricketSuiteState(uid, userLabel);
  });
  const [syncStatus, setSyncStatus] = useState<'supabase' | 'local'>('local');
  const channelRef = useRef<BroadcastChannel | null>(null);
  const pushTimerRef = useRef<number | null>(null);
  const isRemoteRef = useRef(false);

  // Reload when UID switches
  useEffect(() => {
    const stored = loadFromLocalStorage(uid);
    setState(stored ?? createInitialCricketSuiteState(uid, userLabel));
  }, [uid, userLabel]);

  // Setup BroadcastChannel for instant same-browser cross-tab sync (Controller <-> /overlay)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(`${CHANNEL_PREFIX}${uid}`);
    channelRef.current = ch;

    ch.onmessage = (evt) => {
      const incoming = evt.data as CricketSuiteState | undefined;
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
  }, [uid]);

  // Try initial fetch + realtime subscription from Supabase live_scoreboards
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
          const remoteState = data?.data as CricketSuiteState | undefined;
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
        // Fallback smoothly to localStorage + BroadcastChannel
      }
    };

    void pullRemote();

    const rtChannel = supabase
      .channel(`cricket_suite_${matchRowId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: SUPABASE_SCOREBOARD_TABLE,
          filter: `match_id=eq.${matchRowId}`,
        },
        (payload) => {
          const row = payload.new as { data?: CricketSuiteState } | undefined;
          const remoteState = row?.data;
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
  }, [uid]);

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
      }, 120);
    },
    [uid]
  );

  const updateState = useCallback(
    (updater: (prev: CricketSuiteState) => CricketSuiteState) => {
      setState((prev) => {
        const nextRaw = updater(prev);
        const next: CricketSuiteState = {
          ...nextRaw,
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

  const resetDemoData = useCallback(() => {
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

  // Also ensure initial state is saved to localStorage so opening /overlay?uid=... immediately has data
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
    resetDemoData,
  };
}

/**
 * Lightweight real-time listener specifically for the standalone `/overlay?uid=<user_id>` page.
 * Syncs instantly via BroadcastChannel + localStorage `storage` events + Supabase Realtime.
 */
export function useCricketOverlayListener(rawUid: string) {
  const uid = sanitizeUid(rawUid);
  const [state, setState] = useState<CricketSuiteState | null>(() => {
    return loadFromLocalStorage(uid);
  });

  useEffect(() => {
    const stored = loadFromLocalStorage(uid);
    setState(stored);

    // 1. BroadcastChannel (instant cross-tab)
    let ch: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      ch = new BroadcastChannel(`${CHANNEL_PREFIX}${uid}`);
      ch.onmessage = (evt) => {
        const incoming = evt.data as CricketSuiteState | undefined;
        if (incoming && typeof incoming.updatedAt === 'number') {
          setState(incoming);
        }
      };
    }

    // 2. Storage event fallback
    const onStorage = (evt: StorageEvent) => {
      if (evt.key !== getStorageKey(uid)) return;
      if (!evt.newValue) {
        setState(null);
        return;
      }
      try {
        const parsed = JSON.parse(evt.newValue) as CricketSuiteState;
        if (parsed && typeof parsed.updatedAt === 'number') {
          setState(parsed);
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('storage', onStorage);

    // 3. Supabase Realtime (cross-device / vMix & OBS Browser Source)
    const matchRowId = getSupabaseMatchId(uid);
    const supabase = getSupabaseClient();

    void (async () => {
      try {
        const { data, error } = await supabase
          .from(SUPABASE_SCOREBOARD_TABLE)
          .select('data')
          .eq('match_id', matchRowId)
          .maybeSingle();
        if (!error) {
          setState((data?.data as CricketSuiteState | undefined) ?? null);
        }
      } catch {
        // local state already loaded
      }
    })();

    const rtChannel = supabase
      .channel(`cricket_overlay_view_${matchRowId}`)
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
          const row = payload.new as { data?: CricketSuiteState | null } | undefined;
          setState(row?.data ?? null);
        }
      )
      .subscribe();

    return () => {
      ch?.close();
      window.removeEventListener('storage', onStorage);
      void supabase.removeChannel(rtChannel);
    };
  }, [uid]);

  return { uid, state };
}
