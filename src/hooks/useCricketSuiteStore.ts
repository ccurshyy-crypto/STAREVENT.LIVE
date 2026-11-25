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
  return String(raw || '')
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 48);
}

function escapeLikePattern(raw: string): string {
  return raw.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

function getStorageKey(uid: string): string {
  return `${STORAGE_PREFIX}${sanitizeUid(uid)}`;
}

/**
 * Isolated per-user Supabase `live_scoreboards` room key:
 * `match_id` equals the user's `access_id` directly (e.g. `STAREVENTLIVE35484`).
 */
export function getSupabaseMatchId(uid: string): string {
  return sanitizeUid(uid);
}

function getLegacySupabaseMatchId(uid: string): string {
  return `cricket_suite_v2_${sanitizeUid(uid)}`;
}

function normalizeLoadedState(
  raw: Partial<CricketSuiteState> | null | undefined,
  uid: string,
  userLabel?: string
): CricketSuiteState | null {
  if (!uid || !raw || typeof raw !== 'object' || !Array.isArray(raw.matches) || !Array.isArray(raw.teams)) {
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
  if (typeof window === 'undefined' || !uid) return null;
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
  if (typeof window === 'undefined' || !uid) return;
  try {
    window.localStorage.setItem(getStorageKey(uid), JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Per-user isolated Cricket Suite store with instant localStorage + BroadcastChannel sync
 * and automatic Supabase Realtime (`live_scoreboards`, `match_id = access_id`) sync.
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
    if (!uid) return;
    const stored = loadFromLocalStorage(uid, userLabel);
    setState(stored ?? createInitialCricketSuiteState(uid, userLabel));
  }, [uid, userLabel]);

  // Same-browser instant cross-tab sync (Controller / Scoring <-> /overlay?id=<access_id>)
  useEffect(() => {
    if (!uid || typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(`${CHANNEL_PREFIX}${uid.toUpperCase()}`);
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

  // Supabase Realtime sync (`live_scoreboards` keyed strictly by `match_id = user's access_id`)
  useEffect(() => {
    if (!uid) return;
    let mounted = true;
    const matchRowId = getSupabaseMatchId(uid);
    const legacyRowId = getLegacySupabaseMatchId(uid);
    const supabase = getSupabaseClient();

    const pullRemote = async () => {
      try {
        const { data, error } = await supabase
          .from(SUPABASE_SCOREBOARD_TABLE)
          .select('match_id, data, updated_at')
          .eq('match_id', matchRowId)
          .maybeSingle();

        if (!mounted) return;

        let remotePayload = data?.data as Partial<CricketSuiteState> | undefined;

        // Read-only backward-compatible fallback if user had older prefixed room data
        if (!error && !remotePayload) {
          const legacyRes = await supabase
            .from(SUPABASE_SCOREBOARD_TABLE)
            .select('data, updated_at')
            .eq('match_id', legacyRowId)
            .maybeSingle();
          if (!mounted) return;
          if (!legacyRes.error && legacyRes.data?.data) {
            remotePayload = legacyRes.data.data as Partial<CricketSuiteState>;
          }
        }

        if (!error) {
          setSyncStatus('supabase');
          const remoteState = normalizeLoadedState(remotePayload, uid, userLabel);
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
      .channel(`live_scoreboard_room_${matchRowId}`)
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
      if (!uid) return;
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
      if (!uid) return;
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
    if (!uid) return;
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
    if (!uid) return;
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
 * Public real-time listener for `/overlay?id=<access_id>` (also supports `?uid=<access_id>`).
 * Works WITHOUT login inside vMix / OBS Studio and stays 100% transparent when no id or no data exists.
 */
export function useCricketOverlayListener(rawUid: string) {
  const requestedUid = sanitizeUid(rawUid);
  const [resolvedRoomId, setResolvedRoomId] = useState<string>(requestedUid);
  const [state, setState] = useState<CricketSuiteState | null>(() => {
    return requestedUid ? loadFromLocalStorage(requestedUid) : null;
  });

  useEffect(() => {
    setResolvedRoomId(requestedUid);
  }, [requestedUid]);

  useEffect(() => {
    if (!requestedUid) {
      setState(null);
      return;
    }

    const activeRoom = resolvedRoomId || requestedUid;
    const stored = loadFromLocalStorage(activeRoom) ?? loadFromLocalStorage(requestedUid);
    if (stored) {
      setState(stored);
    }

    let ch: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      ch = new BroadcastChannel(`${CHANNEL_PREFIX}${requestedUid.toUpperCase()}`);
      ch.onmessage = (evt) => {
        const incoming = normalizeLoadedState(
          evt.data as Partial<CricketSuiteState> | undefined,
          activeRoom
        );
        if (incoming) setState(incoming);
      };
    }

    const onStorage = (evt: StorageEvent) => {
      if (evt.key !== getStorageKey(activeRoom) && evt.key !== getStorageKey(requestedUid)) {
        return;
      }
      if (!evt.newValue) {
        setState(null);
        return;
      }
      try {
        const parsed = normalizeLoadedState(
          JSON.parse(evt.newValue) as Partial<CricketSuiteState>,
          activeRoom
        );
        if (parsed) setState(parsed);
      } catch {
        // ignore
      }
    };
    window.addEventListener('storage', onStorage);

    const supabase = getSupabaseClient();
    let mounted = true;

    const fetchLatest = async () => {
      try {
        // 1. Direct isolated room match (`match_id = user's access_id`)
        const { data, error } = await supabase
          .from(SUPABASE_SCOREBOARD_TABLE)
          .select('match_id, data')
          .eq('match_id', activeRoom)
          .maybeSingle();

        if (!mounted) return;

        if (!error && data?.data) {
          const parsed = normalizeLoadedState(
            data.data as Partial<CricketSuiteState>,
            String(data.match_id || activeRoom)
          );
          if (parsed) setState(parsed);
          return;
        }

        // 2. Case-insensitive room resolution (e.g., `/overlay?id=stareventlive35484` -> `STAREVENTLIVE35484`)
        if (!error) {
          const ilikeRes = await supabase
            .from(SUPABASE_SCOREBOARD_TABLE)
            .select('match_id, data')
            .ilike('match_id', escapeLikePattern(requestedUid));

          if (!mounted) return;

          if (!ilikeRes.error && Array.isArray(ilikeRes.data)) {
            const exact = ilikeRes.data.find(
              (row) =>
                String(row.match_id || '').trim().toLowerCase() === requestedUid.toLowerCase()
            );
            if (exact?.data) {
              const canonicalId = String(exact.match_id).trim();
              if (canonicalId && canonicalId !== resolvedRoomId) {
                setResolvedRoomId(canonicalId);
              }
              const parsed = normalizeLoadedState(
                exact.data as Partial<CricketSuiteState>,
                canonicalId || activeRoom
              );
              if (parsed) setState(parsed);
              return;
            }
          }

          // 3. Backward-compatible fallback for older prefixed room rows
          const legacyRes = await supabase
            .from(SUPABASE_SCOREBOARD_TABLE)
            .select('data')
            .eq('match_id', getLegacySupabaseMatchId(requestedUid))
            .maybeSingle();

          if (!mounted) return;

          if (!legacyRes.error && legacyRes.data?.data) {
            const parsed = normalizeLoadedState(
              legacyRes.data.data as Partial<CricketSuiteState>,
              activeRoom
            );
            if (parsed) setState(parsed);
          }
        }
      } catch {
        // Local state remains active
      }
    };

    void fetchLatest();

    const onOnline = () => {
      void fetchLatest();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void fetchLatest();
      }
    };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibility);

    // Lightweight fallback poll so long-running vMix/OBS Browser Sources never go stale if WebSocket drops
    const pollTimer = window.setInterval(() => {
      void fetchLatest();
    }, 8000);

    const rtChannel = supabase
      .channel(`live_overlay_view_${activeRoom}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: SUPABASE_SCOREBOARD_TABLE,
          filter: `match_id=eq.${activeRoom}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setState(null);
            return;
          }
          const row = payload.new as { data?: Partial<CricketSuiteState> | null } | undefined;
          const parsed = normalizeLoadedState(row?.data, activeRoom);
          setState(parsed);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      ch?.close();
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(pollTimer);
      void supabase.removeChannel(rtChannel);
    };
  }, [requestedUid, resolvedRoomId]);

  return { uid: resolvedRoomId || requestedUid, state };
}
