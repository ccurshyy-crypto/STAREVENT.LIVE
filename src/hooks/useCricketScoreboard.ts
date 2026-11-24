import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSupabaseClient,
  SUPABASE_CRICKET_SPORT,
  SUPABASE_SCOREBOARD_TABLE,
} from '../lib/supabaseClient';
import {
  CricketFlagId,
  createInitialCricketScoreboardDoc,
  UserCricketScoreboardDoc,
} from '../types/overlay';

export interface UseCricketScoreboardOptions {
  targetUid: string;
  role: 'controller' | 'overlay';
  canWrite?: boolean;
}

const VALID_FLAGS: Set<CricketFlagId> = new Set([
  'SL',
  'AFG',
  'IND',
  'AUS',
  'ENG',
  'PAK',
  'NZ',
  'SA',
  'WI',
  'BAN',
  'CUSTOM',
]);

const MAX_UNDO_STEPS = 30;

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.max(min, Math.min(max, n));
}

function clampStr(value: unknown, maxLen: number, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  return value.slice(0, maxLen);
}

function sanitizeRoomKey(raw: string): string {
  const cleaned = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, '-')
    .slice(0, 40);
  return cleaned || 'CRK-101';
}

function storageKey(roomKey: string): string {
  return `starevent_sb_cricket_v1_${roomKey}`;
}

function sanitizeCricketDoc(
  ownerUid: string,
  raw?: Partial<UserCricketScoreboardDoc> | null
): UserCricketScoreboardDoc {
  const base = createInitialCricketScoreboardDoc(ownerUid);
  const src = raw ?? {};
  const battingFlagId: CricketFlagId =
    typeof src.battingFlagId === 'string' && VALID_FLAGS.has(src.battingFlagId as CricketFlagId)
      ? (src.battingFlagId as CricketFlagId)
      : base.battingFlagId;
  const bowlingFlagId: CricketFlagId =
    typeof src.bowlingFlagId === 'string' && VALID_FLAGS.has(src.bowlingFlagId as CricketFlagId)
      ? (src.bowlingFlagId as CricketFlagId)
      : base.bowlingFlagId;

  const ballsList = Array.isArray(src.currentOverBalls)
    ? src.currentOverBalls
        .filter((b): b is string => typeof b === 'string' && b.trim().length > 0)
        .map((b) => b.trim().slice(0, 8))
        .slice(0, 16)
    : base.currentOverBalls;

  const battingCode =
    clampStr(src.battingTeamCode, 8, base.battingTeamCode).trim() || base.battingTeamCode;
  const bowlingCode =
    clampStr(src.bowlingTeamCode, 8, base.bowlingTeamCode).trim() || base.bowlingTeamCode;

  return {
    ownerUid,
    visible: typeof src.visible === 'boolean' ? src.visible : true,
    battingTeamName: clampStr(src.battingTeamName, 50, base.battingTeamName),
    battingTeamCode: battingCode,
    battingFlagId,
    battingLogoUrl: clampStr(src.battingLogoUrl, 180000, ''),
    bowlingTeamName: clampStr(src.bowlingTeamName, 50, base.bowlingTeamName),
    bowlingTeamCode: bowlingCode,
    bowlingFlagId,
    bowlingLogoUrl: clampStr(src.bowlingLogoUrl, 180000, ''),
    runs: clampInt(src.runs, 0, 9999, base.runs),
    wickets: clampInt(src.wickets, 0, 10, base.wickets),
    totalBalls: clampInt(src.totalBalls, 0, 6000, base.totalBalls),
    maxOvers: clampInt(src.maxOvers, 1, 500, base.maxOvers),
    tournamentText: clampStr(src.tournamentText, 80, base.tournamentText),
    batter1Name: clampStr(src.batter1Name, 40, base.batter1Name),
    batter1Runs: clampInt(src.batter1Runs, 0, 999, base.batter1Runs),
    batter1Balls: clampInt(src.batter1Balls, 0, 999, base.batter1Balls),
    batter2Name: clampStr(src.batter2Name, 40, base.batter2Name),
    batter2Runs: clampInt(src.batter2Runs, 0, 999, base.batter2Runs),
    batter2Balls: clampInt(src.batter2Balls, 0, 999, base.batter2Balls),
    striker: src.striker === 2 ? 2 : 1,
    bowlerName: clampStr(src.bowlerName, 40, base.bowlerName),
    bowlerWickets: clampInt(src.bowlerWickets, 0, 10, base.bowlerWickets),
    bowlerRuns: clampInt(src.bowlerRuns, 0, 999, base.bowlerRuns),
    bowlerBalls: clampInt(src.bowlerBalls, 0, 600, base.bowlerBalls),
    currentOverBalls: ballsList,
    version: clampInt(src.version, 0, 100000000, base.version),
    updatedAt: clampInt(src.updatedAt, 0, 9999999999999, base.updatedAt),
  };
}

function loadLocalCricketDoc(roomKey: string): UserCricketScoreboardDoc | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(roomKey));
    if (!raw) return null;
    return sanitizeCricketDoc(roomKey, JSON.parse(raw) as Partial<UserCricketScoreboardDoc>);
  } catch {
    return null;
  }
}

function saveLocalCricketDoc(roomKey: string, doc: UserCricketScoreboardDoc) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(roomKey), JSON.stringify(doc));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Supabase Realtime Cricket Scoreboard Hook (`live_scoreboards`, `sport = 'cricket'`).
 * Includes instant local BroadcastChannel sync for same-origin preview windows.
 */
export function useCricketScoreboard({
  targetUid,
  role,
  canWrite = false,
}: UseCricketScoreboardOptions) {
  const roomKey = sanitizeRoomKey(targetUid);
  const matchRowId = `CRK-${roomKey}`;

  const [cricketDoc, setCricketDoc] = useState<UserCricketScoreboardDoc>(
    () => loadLocalCricketDoc(roomKey) ?? createInitialCricketScoreboardDoc(roomKey)
  );
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<UserCricketScoreboardDoc[]>([]);

  const docRefState = useRef<UserCricketScoreboardDoc>(cricketDoc);
  const lastVersionRef = useRef<number>(cricketDoc.version);
  const pendingPatchRef = useRef<Partial<UserCricketScoreboardDoc>>({});
  const patchDebounceRef = useRef<number | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    docRefState.current = cricketDoc;
  }, [cricketDoc]);

  useEffect(() => {
    const cached = loadLocalCricketDoc(roomKey) ?? createInitialCricketScoreboardDoc(roomKey);
    docRefState.current = cached;
    lastVersionRef.current = cached.version;
    pendingPatchRef.current = {};
    setCricketDoc(cached);
    setUndoStack([]);
    setLoading(false);
    setErrorMessage(null);
  }, [roomKey]);

  const applyIncoming = useCallback(
    (incoming: UserCricketScoreboardDoc) => {
      if (incoming.version < lastVersionRef.current) return;
      lastVersionRef.current = incoming.version;
      const pending = pendingPatchRef.current;
      const merged =
        Object.keys(pending).length > 0
          ? sanitizeCricketDoc(roomKey, { ...incoming, ...pending })
          : incoming;
      docRefState.current = merged;
      setCricketDoc(merged);
      saveLocalCricketDoc(roomKey, merged);
    },
    [roomKey]
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(`star_cricket_room_${roomKey}`);
    bcRef.current = ch;
    ch.onmessage = (event) => {
      const payload = event.data as { doc?: UserCricketScoreboardDoc } | null;
      if (payload?.doc) {
        applyIncoming(sanitizeCricketDoc(roomKey, payload.doc));
      }
    };
    return () => {
      ch.close();
      bcRef.current = null;
    };
  }, [roomKey, applyIncoming]);

  const commitDoc = useCallback(
    async (next: UserCricketScoreboardDoc, pushUndo = true) => {
      if (!canWrite || role !== 'controller') return;
      const prev = docRefState.current;
      if (pushUndo) {
        setUndoStack((curr) => [...curr.slice(-(MAX_UNDO_STEPS - 1)), prev]);
      }

      const now = Date.now();
      const nextVersion = Math.max(lastVersionRef.current, prev.version) + 1;
      const sanitized = sanitizeCricketDoc(roomKey, {
        ...next,
        ownerUid: roomKey,
        version: nextVersion,
        updatedAt: now,
      });

      lastVersionRef.current = nextVersion;
      docRefState.current = sanitized;
      setCricketDoc(sanitized);
      saveLocalCricketDoc(roomKey, sanitized);
      try {
        bcRef.current?.postMessage({ doc: sanitized });
      } catch {
        // Ignore broadcast error
      }

      setSaving(true);
      try {
        const supabase = getSupabaseClient();
        const { error } = await supabase.from(SUPABASE_SCOREBOARD_TABLE).upsert(
          {
            match_id: matchRowId,
            sport: SUPABASE_CRICKET_SPORT,
            data: sanitized,
            updated_at: new Date(now).toISOString(),
          },
          { onConflict: 'match_id' }
        );
        if (!error) {
          setConnected(true);
          setErrorMessage(null);
        }
      } catch {
        // Keep local sync working seamlessly
      } finally {
        setSaving(false);
      }
    },
    [roomKey, matchRowId, canWrite, role]
  );

  const flushPendingPatch = useCallback(async () => {
    if (!canWrite || role !== 'controller') return;
    if (patchDebounceRef.current !== null) {
      window.clearTimeout(patchDebounceRef.current);
      patchDebounceRef.current = null;
    }
    const pending = pendingPatchRef.current;
    if (Object.keys(pending).length === 0) return;
    pendingPatchRef.current = {};
    await commitDoc({ ...docRefState.current, ...pending }, false);
  }, [canWrite, role, commitDoc]);

  const updateFields = useCallback(
    (patch: Partial<UserCricketScoreboardDoc>, immediate = false) => {
      if (!canWrite || role !== 'controller') return;
      pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };
      const preview = sanitizeCricketDoc(roomKey, {
        ...docRefState.current,
        ...pendingPatchRef.current,
      });
      docRefState.current = preview;
      setCricketDoc(preview);
      saveLocalCricketDoc(roomKey, preview);

      if (immediate) {
        void flushPendingPatch();
        return;
      }

      if (patchDebounceRef.current !== null) {
        window.clearTimeout(patchDebounceRef.current);
      }
      patchDebounceRef.current = window.setTimeout(() => {
        void flushPendingPatch();
      }, 320);
    },
    [roomKey, canWrite, role, flushPendingPatch]
  );

  // Supabase initial fetch + Realtime postgres_changes listener
  useEffect(() => {
    let active = true;
    const supabase = getSupabaseClient();

    const fetchInitial = async () => {
      try {
        const { data, error } = await supabase
          .from(SUPABASE_SCOREBOARD_TABLE)
          .select('*')
          .eq('match_id', matchRowId)
          .eq('sport', SUPABASE_CRICKET_SPORT)
          .maybeSingle();

        if (!active) return;
        setLoading(false);
        if (!error) {
          setConnected(true);
          const payload =
            data && typeof data === 'object'
              ? ((data as Record<string, unknown>).data ??
                  (data as Record<string, unknown>).state)
              : null;
          if (payload && typeof payload === 'object') {
            applyIncoming(
              sanitizeCricketDoc(roomKey, payload as Partial<UserCricketScoreboardDoc>)
            );
          }
        }
      } catch {
        if (active) setLoading(false);
      }
    };

    void fetchInitial();

    const channel = supabase
      .channel(`live_scoreboards:cricket:${matchRowId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: SUPABASE_SCOREBOARD_TABLE,
          filter: `match_id=eq.${matchRowId}`,
        },
        (payload) => {
          if (!active) return;
          const row = payload.new as Record<string, unknown> | undefined;
          const rawData = row?.data ?? row?.state;
          if (rawData && typeof rawData === 'object') {
            applyIncoming(
              sanitizeCricketDoc(roomKey, rawData as Partial<UserCricketScoreboardDoc>)
            );
          }
        }
      )
      .subscribe((status) => {
        if (active && status === 'SUBSCRIBED') {
          setConnected(true);
        }
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
      if (patchDebounceRef.current !== null) {
        window.clearTimeout(patchDebounceRef.current);
        patchDebounceRef.current = null;
      }
    };
  }, [roomKey, matchRowId, applyIncoming]);

  const recordRuns = useCallback(
    async (runsScored: number) => {
      await flushPendingPatch();
      const cur = docRefState.current;
      const isStriker1 = cur.striker === 1;
      const nextBalls = cur.totalBalls + 1;
      const nextBowlerBalls = cur.bowlerBalls + 1;
      const label = runsScored === 0 ? '•' : String(runsScored);
      const nextOver =
        cur.totalBalls > 0 && cur.totalBalls % 6 === 0
          ? [label]
          : [...cur.currentOverBalls, label].slice(-12);

      let nextStriker: 1 | 2 = cur.striker;
      if (runsScored % 2 === 1) {
        nextStriker = nextStriker === 1 ? 2 : 1;
      }
      if (nextBalls % 6 === 0) {
        nextStriker = nextStriker === 1 ? 2 : 1;
      }

      await commitDoc({
        ...cur,
        runs: cur.runs + runsScored,
        totalBalls: nextBalls,
        batter1Runs: isStriker1 ? cur.batter1Runs + runsScored : cur.batter1Runs,
        batter1Balls: isStriker1 ? cur.batter1Balls + 1 : cur.batter1Balls,
        batter2Runs: !isStriker1 ? cur.batter2Runs + runsScored : cur.batter2Runs,
        batter2Balls: !isStriker1 ? cur.batter2Balls + 1 : cur.batter2Balls,
        striker: nextStriker,
        bowlerRuns: cur.bowlerRuns + runsScored,
        bowlerBalls: nextBowlerBalls,
        currentOverBalls: nextOver,
      });
    },
    [commitDoc, flushPendingPatch]
  );

  const recordWicket = useCallback(async () => {
    await flushPendingPatch();
    const cur = docRefState.current;
    const isStriker1 = cur.striker === 1;
    const nextBalls = cur.totalBalls + 1;
    const nextOver =
      cur.totalBalls > 0 && cur.totalBalls % 6 === 0
        ? ['W']
        : [...cur.currentOverBalls, 'W'].slice(-12);

    await commitDoc({
      ...cur,
      wickets: Math.min(10, cur.wickets + 1),
      totalBalls: nextBalls,
      batter1Balls: isStriker1 ? cur.batter1Balls + 1 : cur.batter1Balls,
      batter2Balls: !isStriker1 ? cur.batter2Balls + 1 : cur.batter2Balls,
      bowlerWickets: Math.min(10, cur.bowlerWickets + 1),
      bowlerBalls: cur.bowlerBalls + 1,
      currentOverBalls: nextOver,
    });
  }, [commitDoc, flushPendingPatch]);

  const recordExtra = useCallback(
    async (kind: 'WD' | 'NB' | 'B' | 'LB', extraRuns = 1) => {
      await flushPendingPatch();
      const cur = docRefState.current;
      const isLegalBall = kind === 'B' || kind === 'LB';
      const nextBalls = isLegalBall ? cur.totalBalls + 1 : cur.totalBalls;
      const nextBowlerBalls = isLegalBall ? cur.bowlerBalls + 1 : cur.bowlerBalls;
      const bowlerChargedRuns = kind === 'WD' || kind === 'NB' ? extraRuns : 0;
      const label = extraRuns > 1 ? `${extraRuns}${kind}` : kind;
      const nextOver =
        isLegalBall && cur.totalBalls > 0 && cur.totalBalls % 6 === 0
          ? [label]
          : [...cur.currentOverBalls, label].slice(-12);

      await commitDoc({
        ...cur,
        runs: cur.runs + extraRuns,
        totalBalls: nextBalls,
        bowlerRuns: cur.bowlerRuns + bowlerChargedRuns,
        bowlerBalls: nextBowlerBalls,
        currentOverBalls: nextOver,
      });
    },
    [commitDoc, flushPendingPatch]
  );

  const adjustManual = useCallback(
    async (delta: { runs?: number; wickets?: number; balls?: number }) => {
      await flushPendingPatch();
      const cur = docRefState.current;
      await commitDoc({
        ...cur,
        runs: Math.max(0, cur.runs + (delta.runs ?? 0)),
        wickets: Math.max(0, Math.min(10, cur.wickets + (delta.wickets ?? 0))),
        totalBalls: Math.max(0, cur.totalBalls + (delta.balls ?? 0)),
      });
    },
    [commitDoc, flushPendingPatch]
  );

  const swapStrike = useCallback(async () => {
    await flushPendingPatch();
    const cur = docRefState.current;
    await commitDoc({
      ...cur,
      striker: cur.striker === 1 ? 2 : 1,
    });
  }, [commitDoc, flushPendingPatch]);

  const startNewOver = useCallback(async () => {
    await flushPendingPatch();
    const cur = docRefState.current;
    await commitDoc({
      ...cur,
      currentOverBalls: [],
      striker: cur.striker === 1 ? 2 : 1,
    });
  }, [commitDoc, flushPendingPatch]);

  const swapInnings = useCallback(async () => {
    await flushPendingPatch();
    const cur = docRefState.current;
    await commitDoc({
      ...cur,
      battingTeamName: cur.bowlingTeamName,
      battingTeamCode: cur.bowlingTeamCode,
      battingFlagId: cur.bowlingFlagId,
      battingLogoUrl: cur.bowlingLogoUrl,
      bowlingTeamName: cur.battingTeamName,
      bowlingTeamCode: cur.battingTeamCode,
      bowlingFlagId: cur.battingFlagId,
      bowlingLogoUrl: cur.battingLogoUrl,
      runs: 0,
      wickets: 0,
      totalBalls: 0,
      batter1Runs: 0,
      batter1Balls: 0,
      batter2Runs: 0,
      batter2Balls: 0,
      striker: 1,
      bowlerWickets: 0,
      bowlerRuns: 0,
      bowlerBalls: 0,
      currentOverBalls: [],
    });
  }, [commitDoc, flushPendingPatch]);

  const toggleVisible = useCallback(async () => {
    await flushPendingPatch();
    const cur = docRefState.current;
    await commitDoc({ ...cur, visible: !cur.visible }, false);
  }, [commitDoc, flushPendingPatch]);

  const undoLast = useCallback(async () => {
    if (undoStack.length === 0) return;
    await flushPendingPatch();
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((curr) => curr.slice(0, -1));
    await commitDoc(previous, false);
  }, [undoStack, commitDoc, flushPendingPatch]);

  const resetScore = useCallback(async () => {
    await flushPendingPatch();
    const cur = docRefState.current;
    await commitDoc({
      ...cur,
      runs: 0,
      wickets: 0,
      totalBalls: 0,
      batter1Runs: 0,
      batter1Balls: 0,
      batter2Runs: 0,
      batter2Balls: 0,
      striker: 1,
      bowlerWickets: 0,
      bowlerRuns: 0,
      bowlerBalls: 0,
      currentOverBalls: [],
    });
  }, [commitDoc, flushPendingPatch]);

  return {
    doc: cricketDoc,
    loading,
    connected,
    saving,
    errorMessage,
    canUndo: undoStack.length > 0,
    undoCount: undoStack.length,
    updateFields,
    flushPendingPatch,
    recordRuns,
    recordWicket,
    recordExtra,
    adjustManual,
    swapStrike,
    startNewOver,
    swapInnings,
    toggleVisible,
    undoLast,
    resetScore,
  };
}
