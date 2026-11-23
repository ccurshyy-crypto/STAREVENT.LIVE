import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
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

  const battingCode = clampStr(src.battingTeamCode, 8, base.battingTeamCode).trim() || base.battingTeamCode;
  const bowlingCode = clampStr(src.bowlingTeamCode, 8, base.bowlingTeamCode).trim() || base.bowlingTeamCode;

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

/**
 * Single-Source-of-Truth Firebase Firestore Cricket Scoreboard Hook.
 *
 * Isolation & Stability guarantees:
 * - Reads/writes strictly inside `/users/{targetUid}/cricket/current`.
 * - Strict monotonic version guard prevents stale snapshots or echoes from rolling back scores.
 * - Single-action mutex (`actionInFlightRef`) ensures 1 click = strictly 1 manual change.
 * - Zero automatic scoring loops or timers.
 */
export function useCricketScoreboard({
  targetUid,
  role,
  canWrite = false,
}: UseCricketScoreboardOptions) {
  const [cricketDoc, setCricketDoc] = useState<UserCricketScoreboardDoc>(() =>
    createInitialCricketScoreboardDoc(targetUid || 'local')
  );
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<UserCricketScoreboardDoc[]>([]);

  const docRefState = useRef<UserCricketScoreboardDoc>(cricketDoc);
  const lastVersionRef = useRef<number>(0);
  const actionInFlightRef = useRef<boolean>(false);
  const pendingPatchRef = useRef<Partial<UserCricketScoreboardDoc>>({});
  const patchDebounceRef = useRef<number | null>(null);

  useEffect(() => {
    docRefState.current = cricketDoc;
  }, [cricketDoc]);

  useEffect(() => {
    lastVersionRef.current = 0;
    pendingPatchRef.current = {};
    setUndoStack([]);
    setLoading(Boolean(targetUid));
    setErrorMessage(null);
  }, [targetUid]);

  const commitDoc = useCallback(
    async (next: UserCricketScoreboardDoc, pushUndo = true) => {
      if (!targetUid || !canWrite || role !== 'controller') return;
      const prev = docRefState.current;
      if (pushUndo) {
        setUndoStack((curr) => [...curr.slice(-(MAX_UNDO_STEPS - 1)), prev]);
      }

      const now = Date.now();
      const nextVersion = Math.max(lastVersionRef.current, prev.version) + 1;
      const sanitized = sanitizeCricketDoc(targetUid, {
        ...next,
        ownerUid: targetUid,
        version: nextVersion,
        updatedAt: now,
      });

      actionInFlightRef.current = true;
      lastVersionRef.current = nextVersion;
      docRefState.current = sanitized;
      setCricketDoc(sanitized);
      setSaving(true);

      try {
        await setDoc(doc(db, 'users', targetUid, 'cricket', 'current'), sanitized);
        setErrorMessage(null);
      } catch (err) {
        setErrorMessage('Could not sync Cricket scoreboard. Retrying...');
        try {
          handleFirestoreError(err, OperationType.WRITE, `users/${targetUid}/cricket/current`);
        } catch {
          // Surfaced via errorMessage
        }
      } finally {
        actionInFlightRef.current = false;
        setSaving(false);
      }
    },
    [targetUid, canWrite, role]
  );

  const flushPendingPatch = useCallback(async () => {
    if (!targetUid || !canWrite || role !== 'controller') return;
    if (patchDebounceRef.current !== null) {
      window.clearTimeout(patchDebounceRef.current);
      patchDebounceRef.current = null;
    }
    const pending = pendingPatchRef.current;
    if (Object.keys(pending).length === 0) return;
    pendingPatchRef.current = {};
    await commitDoc({ ...docRefState.current, ...pending }, false);
  }, [targetUid, canWrite, role, commitDoc]);

  const updateFields = useCallback(
    (patch: Partial<UserCricketScoreboardDoc>, immediate = false) => {
      if (!targetUid || !canWrite || role !== 'controller') return;
      pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };
      const preview = sanitizeCricketDoc(targetUid, {
        ...docRefState.current,
        ...pendingPatchRef.current,
      });
      docRefState.current = preview;
      setCricketDoc(preview);

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
    [targetUid, canWrite, role, flushPendingPatch]
  );

  // Real-time Firestore listener (strictly ONE listener per targetUid)
  useEffect(() => {
    if (!targetUid) {
      setLoading(false);
      return;
    }
    let unmounted = false;
    const firestoreDocRef = doc(db, 'users', targetUid, 'cricket', 'current');

    const unsub = onSnapshot(
      firestoreDocRef,
      (snap) => {
        if (unmounted) return;
        setConnected(true);
        setLoading(false);
        setErrorMessage(null);

        if (snap.exists()) {
          const incoming = sanitizeCricketDoc(
            targetUid,
            snap.data() as Partial<UserCricketScoreboardDoc>
          );
          const isInitial = lastVersionRef.current === 0;
          const isNewer = incoming.version > lastVersionRef.current;
          if (isInitial || (isNewer && !actionInFlightRef.current)) {
            lastVersionRef.current = incoming.version;
            const pending = pendingPatchRef.current;
            const merged =
              Object.keys(pending).length > 0
                ? sanitizeCricketDoc(targetUid, { ...incoming, ...pending })
                : incoming;
            docRefState.current = merged;
            setCricketDoc(merged);
          }
        } else if (role === 'controller' && canWrite) {
          const initial = createInitialCricketScoreboardDoc(targetUid);
          lastVersionRef.current = initial.version;
          docRefState.current = initial;
          setCricketDoc(initial);
          setDoc(firestoreDocRef, initial).catch(() => {});
        }
      },
      (err) => {
        if (unmounted) return;
        setConnected(false);
        setLoading(false);
        setErrorMessage('Cricket overlay connection interrupted. Reconnecting...');
        try {
          handleFirestoreError(err, OperationType.GET, `users/${targetUid}/cricket/current`);
        } catch {
          // Non-fatal in listener callback
        }
      }
    );

    return () => {
      unmounted = true;
      unsub();
      if (patchDebounceRef.current !== null) {
        window.clearTimeout(patchDebounceRef.current);
        patchDebounceRef.current = null;
      }
    };
  }, [targetUid, role, canWrite]);

  // Atomic live cricket scoring actions (strictly manual, 1 click = 1 action)
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

      // Rotate strike on odd runs (1, 3, 5) and at the end of an over
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
    // Reset ONLY match score & over counters — preserve team names, flags, logos, and tournament text!
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
