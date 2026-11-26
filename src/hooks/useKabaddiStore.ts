import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabaseClient, SUPABASE_SCOREBOARD_TABLE } from '../lib/supabaseClient';
import { createInitialKabaddiState, KabaddiScoreboardState } from '../types/kabaddi';

const STORAGE_PREFIX = 'starevent_kabaddi_v1:';
const CHANNEL_PREFIX = 'starevent_kabaddi_channel_v1:';

const DEVICE_ID = (() => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // Fallback
  }
  return `kbd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
})();

export function sanitizeKabaddiUid(raw: string | null | undefined): string {
  const cleaned = String(raw || '')
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 48);
  return cleaned || 'STAR-KABADDI';
}

function getKabaddiRoomRowId(uid: string): string {
  return `kabaddi_${sanitizeKabaddiUid(uid)}`;
}

function loadLocalKabaddiState(uid: string): KabaddiScoreboardState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${uid}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<KabaddiScoreboardState>;
    if (!parsed || typeof parsed !== 'object' || !parsed.teamA || !parsed.teamB) {
      return null;
    }
    const base = createInitialKabaddiState(uid);
    return {
      ...base,
      ...parsed,
      uid,
      teamA: { ...base.teamA, ...parsed.teamA },
      teamB: { ...base.teamB, ...parsed.teamB },
      matchClock: { ...base.matchClock, ...parsed.matchClock },
      raidClock: { ...base.raidClock, ...parsed.raidClock },
    };
  } catch {
    return null;
  }
}

function saveLocalKabaddiState(uid: string, state: KabaddiScoreboardState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${uid}`, JSON.stringify(state));
  } catch {
    // Ignore quota errors
  }
}

function normalizeRemoteKabaddi(
  raw: unknown,
  uid: string
): KabaddiScoreboardState | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<KabaddiScoreboardState>;
  if (!candidate.teamA || !candidate.teamB) return null;
  const base = createInitialKabaddiState(uid);
  return {
    ...base,
    ...candidate,
    uid,
    teamA: { ...base.teamA, ...candidate.teamA },
    teamB: { ...base.teamB, ...candidate.teamB },
    matchClock: { ...base.matchClock, ...candidate.matchClock },
    raidClock: { ...base.raidClock, ...candidate.raidClock },
  };
}

/**
 * Real-time synchronized Kabaddi Scoreboard Store.
 * Syncs instantaneously across same-device tabs (BroadcastChannel + localStorage)
 * and across Mobile / Desktop / OBS Studio / vMix (Supabase `live_scoreboards`).
 */
export function useKabaddiStore(rawUid: string, readOnly = false) {
  const uid = sanitizeKabaddiUid(rawUid);
  const rowId = getKabaddiRoomRowId(uid);

  const [state, setState] = useState<KabaddiScoreboardState>(
    () => loadLocalKabaddiState(uid) ?? createInitialKabaddiState(uid)
  );
  const [history, setHistory] = useState<KabaddiScoreboardState[]>([]);
  const [syncing, setSyncing] = useState(false);

  const stateRef = useRef<KabaddiScoreboardState>(state);
  stateRef.current = state;

  const channelRef = useRef<BroadcastChannel | null>(null);
  const pushTimerRef = useRef<number | null>(null);

  const pushToCloud = useCallback(
    async (next: KabaddiScoreboardState) => {
      if (readOnly) return;
      setSyncing(true);
      try {
        const supabase = getSupabaseClient();
        await supabase.from(SUPABASE_SCOREBOARD_TABLE).upsert(
          {
            match_id: rowId,
            data: next,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'match_id' }
        );
      } catch {
        // Offline or network hiccup — local cache and BroadcastChannel remain intact
      } finally {
        setSyncing(false);
      }
    },
    [readOnly, rowId]
  );

  // Hydrate from Supabase + subscribe to Realtime + BroadcastChannel + storage events
  useEffect(() => {
    let active = true;
    const localInitial = loadLocalKabaddiState(uid) ?? createInitialKabaddiState(uid);
    setState(localInitial);

    // 1. Fetch latest from Supabase
    const hydrateFromCloud = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from(SUPABASE_SCOREBOARD_TABLE)
          .select('data')
          .eq('match_id', rowId)
          .maybeSingle();

        if (!active || error || !data?.data) return;
        const remote = normalizeRemoteKabaddi(data.data, uid);
        if (!remote) return;

        const curr = stateRef.current;
        if (
          readOnly ||
          remote.revision > curr.revision ||
          remote.updatedAt > curr.updatedAt
        ) {
          setState(remote);
          saveLocalKabaddiState(uid, remote);
        }
      } catch {
        // Ignore network errors on initial hydration
      }
    };
    void hydrateFromCloud();

    // 2. BroadcastChannel for instant 0ms same-browser sync
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel(`${CHANNEL_PREFIX}${uid}`);
      channelRef.current = bc;
      bc.onmessage = (ev: MessageEvent<KabaddiScoreboardState>) => {
        const incoming = normalizeRemoteKabaddi(ev.data, uid);
        if (!incoming) return;
        if (incoming.lastModifiedByDevice === DEVICE_ID && !readOnly) return;
        setState(incoming);
        saveLocalKabaddiState(uid, incoming);
      };
    }

    // 3. localStorage event fallback
    const onStorage = (ev: StorageEvent) => {
      if (ev.key !== `${STORAGE_PREFIX}${uid}` || !ev.newValue) return;
      try {
        const incoming = normalizeRemoteKabaddi(JSON.parse(ev.newValue), uid);
        if (incoming) setState(incoming);
      } catch {
        // Ignore malformed
      }
    };
    window.addEventListener('storage', onStorage);

    // 4. Supabase Realtime subscription for cross-device / OBS / vMix sync
    const supabase = getSupabaseClient();
    const realtimeChannel = supabase
      .channel(`kabaddi_live_${rowId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: SUPABASE_SCOREBOARD_TABLE,
          filter: `match_id=eq.${rowId}`,
        },
        (payload) => {
          const row = payload.new as { data?: unknown } | undefined;
          const incoming = normalizeRemoteKabaddi(row?.data, uid);
          if (!incoming) return;
          if (incoming.lastModifiedByDevice === DEVICE_ID && !readOnly) return;
          setState(incoming);
          saveLocalKabaddiState(uid, incoming);
        }
      )
      .subscribe();

    // Polling safety net for OBS/vMix standalone overlays (every 3.5s)
    const pollId = readOnly
      ? window.setInterval(() => {
          void hydrateFromCloud();
        }, 3500)
      : null;

    return () => {
      active = false;
      window.removeEventListener('storage', onStorage);
      if (bc) bc.close();
      channelRef.current = null;
      void supabase.removeChannel(realtimeChannel);
      if (pollId) window.clearInterval(pollId);
      if (pushTimerRef.current) window.clearTimeout(pushTimerRef.current);
    };
  }, [uid, rowId, readOnly]);

  const updateState = useCallback(
    (
      updater: (prev: KabaddiScoreboardState) => KabaddiScoreboardState,
      recordUndo = true
    ) => {
      if (readOnly) return;
      setState((prev) => {
        if (recordUndo) {
          setHistory((h) => [prev, ...h].slice(0, 25));
        }
        const rawNext = updater(prev);
        const next: KabaddiScoreboardState = {
          ...rawNext,
          uid,
          revision: (prev.revision || 0) + 1,
          updatedAt: Date.now(),
          lastModifiedByDevice: DEVICE_ID,
        };
        saveLocalKabaddiState(uid, next);
        try {
          channelRef.current?.postMessage(next);
        } catch {
          // Ignore closed channel
        }
        if (pushTimerRef.current) window.clearTimeout(pushTimerRef.current);
        pushTimerRef.current = window.setTimeout(() => {
          void pushToCloud(next);
        }, 120);
        return next;
      });
    },
    [pushToCloud, readOnly, uid]
  );

  const undo = useCallback(() => {
    if (readOnly) return;
    setHistory((prevHist) => {
      if (prevHist.length === 0) return prevHist;
      const [lastState, ...rest] = prevHist;
      const restored: KabaddiScoreboardState = {
        ...lastState,
        revision: (stateRef.current.revision || 0) + 1,
        updatedAt: Date.now(),
        lastModifiedByDevice: DEVICE_ID,
      };
      setState(restored);
      saveLocalKabaddiState(uid, restored);
      try {
        channelRef.current?.postMessage(restored);
      } catch {
        // Ignore
      }
      void pushToCloud(restored);
      return rest;
    });
  }, [pushToCloud, readOnly, uid]);

  return {
    uid,
    state,
    syncing,
    canUndo: history.length > 0,
    updateState,
    undo,
  };
}
