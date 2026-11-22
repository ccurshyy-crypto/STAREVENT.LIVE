import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  doc,
  onSnapshot,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  createInitialUserScoreboardDoc,
  createInitialUserSettingsDoc,
  KabaddiGraphicPanel,
  KabaddiHalf,
  KabaddiTimeoutTeam,
  LiveOverlayState,
  mergeUserDocsToOverlayState,
  UserLiveScoreboardDoc,
  UserScoreboardSettingsDoc,
  UserUndoHistoryDoc,
  UserUndoSnapshot,
} from '../types/overlay';

const MAX_UNDO_HISTORY = 40;
const SETTINGS_SAVE_DEBOUNCE_MS = 280;
const ACTION_GUARD_MS = 110;

export type ScoreKind = 'point' | 'raid' | 'bonus' | 'tackle' | 'lona';

export interface UseUserScoreboardOptions {
  targetUid: string;
  role: 'controller' | 'overlay';
  canWrite?: boolean;
  defaultTournamentTitle?: string;
}

function clampInt(val: unknown, min: number, max: number, fallback: number): number {
  const n = typeof val === 'number' && Number.isFinite(val) ? Math.round(val) : fallback;
  return Math.max(min, Math.min(max, n));
}

function sanitizeSettingsForFirestore(
  ownerUid: string,
  raw: UserScoreboardSettingsDoc
): UserScoreboardSettingsDoc {
  const cleanSquad = (list?: string[]) =>
    (Array.isArray(list) ? list : [])
      .slice(0, 7)
      .map((item) => String(item ?? '').slice(0, 60));

  return {
    ownerUid,
    teamAName: String(raw.teamAName ?? '').slice(0, 60),
    teamACode: String(raw.teamACode ?? '').slice(0, 8),
    teamAColor: String(raw.teamAColor || '#C8102E').slice(0, 20),
    teamALogoUrl: String(raw.teamALogoUrl ?? '').slice(0, 179000),
    teamAStarting7: cleanSquad(raw.teamAStarting7),
    teamBName: String(raw.teamBName ?? '').slice(0, 60),
    teamBCode: String(raw.teamBCode ?? '').slice(0, 8),
    teamBColor: String(raw.teamBColor || '#131D8A').slice(0, 20),
    teamBLogoUrl: String(raw.teamBLogoUrl ?? '').slice(0, 179000),
    teamBStarting7: cleanSquad(raw.teamBStarting7),
    kabaddiTitle: String(raw.kabaddiTitle ?? '').slice(0, 120),
    kabaddiSubtitle: String(raw.kabaddiSubtitle ?? '').slice(0, 140),
    kabaddiTag: String(raw.kabaddiTag ?? 'LIVE KABADDI').slice(0, 40),
    kabaddiVenue: String(raw.kabaddiVenue ?? '').slice(0, 80),
    kabaddiLeague: String(raw.kabaddiLeague ?? '').slice(0, 80),
    kabaddiEvent: String(raw.kabaddiEvent ?? '').slice(0, 80),
    kabaddiMatchType: String(raw.kabaddiMatchType ?? '').slice(0, 80),
    sponsorName: String(raw.sponsorName ?? '').slice(0, 100),
    championTeam: String(raw.championTeam ?? '').slice(0, 60),
    runnerUpTeam: String(raw.runnerUpTeam ?? '').slice(0, 60),
    thirdPlaceTeam: String(raw.thirdPlaceTeam ?? '').slice(0, 60),
    fourthPlaceTeam: String(raw.fourthPlaceTeam ?? '').slice(0, 60),
    version: clampInt(raw.version, 0, 100000000, 1),
    updatedAt: clampInt(raw.updatedAt, 0, 9999999999999, Date.now()),
  };
}

function sanitizeScoreboardForFirestore(
  ownerUid: string,
  raw: UserLiveScoreboardDoc
): UserLiveScoreboardDoc {
  return {
    ownerUid,
    visible: Boolean(raw.visible),
    teamAScore: clampInt(raw.teamAScore, 0, 999, 0),
    teamARaidPoints: clampInt(raw.teamARaidPoints, 0, 999, 0),
    teamABonusPoints: clampInt(raw.teamABonusPoints, 0, 999, 0),
    teamATacklePoints: clampInt(raw.teamATacklePoints, 0, 999, 0),
    teamALonaPoints: clampInt(raw.teamALonaPoints, 0, 999, 0),
    teamAPlayersOnMat: clampInt(raw.teamAPlayersOnMat, 0, 7, 7),
    teamAGreenCards: clampInt(raw.teamAGreenCards, 0, 99, 0),
    teamAYellowCards: clampInt(raw.teamAYellowCards, 0, 99, 0),
    teamARedCards: clampInt(raw.teamARedCards, 0, 99, 0),
    teamABinEndAt: raw.teamABinEndAt ? clampInt(raw.teamABinEndAt, 0, 9999999999999, 0) : null,
    teamBScore: clampInt(raw.teamBScore, 0, 999, 0),
    teamBRaidPoints: clampInt(raw.teamBRaidPoints, 0, 999, 0),
    teamBBonusPoints: clampInt(raw.teamBBonusPoints, 0, 999, 0),
    teamBTacklePoints: clampInt(raw.teamBTacklePoints, 0, 999, 0),
    teamBLonaPoints: clampInt(raw.teamBLonaPoints, 0, 999, 0),
    teamBPlayersOnMat: clampInt(raw.teamBPlayersOnMat, 0, 7, 7),
    teamBGreenCards: clampInt(raw.teamBGreenCards, 0, 99, 0),
    teamBYellowCards: clampInt(raw.teamBYellowCards, 0, 99, 0),
    teamBRedCards: clampInt(raw.teamBRedCards, 0, 99, 0),
    teamBBinEndAt: raw.teamBBinEndAt ? clampInt(raw.teamBBinEndAt, 0, 9999999999999, 0) : null,
    matchSeconds: clampInt(raw.matchSeconds, 0, 3600, 30),
    matchRunning: Boolean(raw.matchRunning),
    matchUpdatedAt: clampInt(raw.matchUpdatedAt, 0, 9999999999999, Date.now()),
    raidSeconds: clampInt(raw.raidSeconds, 0, 60, 30),
    raidRunning: Boolean(raw.raidRunning),
    raidUpdatedAt: clampInt(raw.raidUpdatedAt, 0, 9999999999999, Date.now()),
    kabaddiHalf: raw.kabaddiHalf || '1ST HALF',
    matchStatus: raw.matchStatus || 'LIVE',
    timeoutTeam: raw.timeoutTeam ? (String(raw.timeoutTeam).slice(0, 20) as KabaddiTimeoutTeam) : null,
    doOrDie: Boolean(raw.doOrDie),
    kabaddiAlert: raw.kabaddiAlert ? String(raw.kabaddiAlert).slice(0, 120) : null,
    kabaddiGraphicPanel: (raw.kabaddiGraphicPanel || 'none') as KabaddiGraphicPanel,
    version: clampInt(raw.version, 0, 100000000, 1),
    updatedAt: clampInt(raw.updatedAt, 0, 9999999999999, Date.now()),
  };
}

function captureUndoSnapshot(scoreDoc: UserLiveScoreboardDoc, label: string): UserUndoSnapshot {
  return {
    teamAScore: scoreDoc.teamAScore,
    teamARaidPoints: scoreDoc.teamARaidPoints ?? 0,
    teamABonusPoints: scoreDoc.teamABonusPoints ?? 0,
    teamATacklePoints: scoreDoc.teamATacklePoints ?? 0,
    teamALonaPoints: scoreDoc.teamALonaPoints ?? 0,
    teamAPlayersOnMat: scoreDoc.teamAPlayersOnMat,
    teamAGreenCards: scoreDoc.teamAGreenCards ?? 0,
    teamAYellowCards: scoreDoc.teamAYellowCards ?? 0,
    teamARedCards: scoreDoc.teamARedCards ?? 0,
    teamABinEndAt: scoreDoc.teamABinEndAt ?? null,
    teamBScore: scoreDoc.teamBScore,
    teamBRaidPoints: scoreDoc.teamBRaidPoints ?? 0,
    teamBBonusPoints: scoreDoc.teamBBonusPoints ?? 0,
    teamBTacklePoints: scoreDoc.teamBTacklePoints ?? 0,
    teamBLonaPoints: scoreDoc.teamBLonaPoints ?? 0,
    teamBPlayersOnMat: scoreDoc.teamBPlayersOnMat,
    teamBGreenCards: scoreDoc.teamBGreenCards ?? 0,
    teamBYellowCards: scoreDoc.teamBYellowCards ?? 0,
    teamBRedCards: scoreDoc.teamBRedCards ?? 0,
    teamBBinEndAt: scoreDoc.teamBBinEndAt ?? null,
    kabaddiHalf: scoreDoc.kabaddiHalf,
    doOrDie: scoreDoc.doOrDie,
    label: label.slice(0, 48),
    savedAt: Date.now(),
  };
}

export function computeLiveClockSeconds(
  seconds: number,
  running: boolean,
  updatedAt: number,
  nowMs: number
): number {
  if (!running) return Math.max(0, Math.round(seconds));
  const elapsed = Math.max(0, Math.floor((nowMs - updatedAt) / 1000));
  return Math.max(0, Math.round(seconds) - elapsed);
}

/**
 * Single-Source-of-Truth Firebase Firestore Real-Time Scoreboard Hook.
 *
 * Isolation guarantees:
 * - Reads/writes strictly inside `/users/{targetUid}/scoreboard/current`,
 *   `/users/{targetUid}/settings/main`, `/users/{targetUid}/undoHistory/stack`,
 *   and `/users/{targetUid}/scoreHistory/{eventId}`.
 * - Settings (team names, player names, logos, tournament, match title, sponsor) are
 *   stored independently from live score state, so Reset Score and Undo can NEVER
 *   overwrite or erase manual text!
 * - Stale snapshots are ignored via monotonic `version` checks + dirty-field protection.
 * - Single-action mutex (`actionInFlightRef` + `ACTION_GUARD_MS`) guarantees 1 click = 1 change.
 */
export function useUserScoreboard({
  targetUid,
  role,
  canWrite = false,
  defaultTournamentTitle,
}: UseUserScoreboardOptions) {
  const [scoreDoc, setScoreDoc] = useState<UserLiveScoreboardDoc>(() =>
    createInitialUserScoreboardDoc(targetUid)
  );
  const [settingsDoc, setSettingsDoc] = useState<UserScoreboardSettingsDoc>(() =>
    createInitialUserSettingsDoc(targetUid, defaultTournamentTitle)
  );
  const [undoEntries, setUndoEntries] = useState<UserUndoSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const scoreRef = useRef<UserLiveScoreboardDoc>(scoreDoc);
  const settingsRef = useRef<UserScoreboardSettingsDoc>(settingsDoc);
  const undoEntriesRef = useRef<UserUndoSnapshot[]>(undoEntries);
  const lastScoreVersionRef = useRef<number>(0);
  const lastSettingsVersionRef = useRef<number>(0);
  const scoreLoadedRef = useRef(false);
  const settingsLoadedRef = useRef(false);

  // Strict single-action mutex to prevent duplicate score/undo/dot mutations
  const actionInFlightRef = useRef(false);
  const lastActionStampRef = useRef(0);

  // Manual text editing protection: pending local edits are NEVER overwritten by echoes
  const pendingSettingsPatchRef = useRef<Partial<UserScoreboardSettingsDoc>>({});
  const settingsDebounceRef = useRef<number | null>(null);
  const alertClearTimerRef = useRef<number | null>(null);

  useEffect(() => {
    scoreRef.current = scoreDoc;
  }, [scoreDoc]);

  useEffect(() => {
    settingsRef.current = settingsDoc;
  }, [settingsDoc]);

  useEffect(() => {
    undoEntriesRef.current = undoEntries;
  }, [undoEntries]);

  // Reset local refs cleanly if targetUid changes
  useEffect(() => {
    scoreLoadedRef.current = false;
    settingsLoadedRef.current = false;
    lastScoreVersionRef.current = 0;
    lastSettingsVersionRef.current = 0;
    pendingSettingsPatchRef.current = {};
    setLoading(true);
    setErrorMessage(null);
  }, [targetUid]);

  // Flush any queued manual text/settings changes to `/users/{targetUid}/settings/main`
  const flushSettingsNow = useCallback(async () => {
    if (!canWrite || role !== 'controller' || !targetUid) return;
    if (settingsDebounceRef.current !== null) {
      window.clearTimeout(settingsDebounceRef.current);
      settingsDebounceRef.current = null;
    }

    const pending = pendingSettingsPatchRef.current;
    const keys = Object.keys(pending);
    if (keys.length === 0) return;

    const now = Date.now();
    const nextVersion = Math.max(lastSettingsVersionRef.current, settingsRef.current.version) + 1;
    const merged: UserScoreboardSettingsDoc = sanitizeSettingsForFirestore(targetUid, {
      ...settingsRef.current,
      ...pending,
      ownerUid: targetUid,
      version: nextVersion,
      updatedAt: now,
    });

    // Snapshot & clear pending queue before async write
    pendingSettingsPatchRef.current = {};
    lastSettingsVersionRef.current = nextVersion;
    settingsRef.current = merged;
    setSettingsDoc(merged);
    setSavingSettings(true);

    try {
      await setDoc(doc(db, 'users', targetUid, 'settings', 'main'), merged);
      setLastSavedAt(now);
      setErrorMessage(null);
    } catch (err) {
      // Restore pending keys on transient failure so user text is never lost
      pendingSettingsPatchRef.current = { ...pending, ...pendingSettingsPatchRef.current };
      setErrorMessage('Could not save settings to cloud. Retrying...');
      try {
        handleFirestoreError(err, OperationType.WRITE, `users/${targetUid}/settings/main`);
      } catch {
        // Already surfaced cleanly via errorMessage
      }
    } finally {
      setSavingSettings(false);
    }
  }, [canWrite, role, targetUid]);

  // Attach strictly ONE set of Firestore real-time listeners per targetUid
  useEffect(() => {
    if (!targetUid) return;

    let unmounted = false;
    const scoreDocRef = doc(db, 'users', targetUid, 'scoreboard', 'current');
    const settingsDocRef = doc(db, 'users', targetUid, 'settings', 'main');
    const undoDocRef = doc(db, 'users', targetUid, 'undoHistory', 'stack');

    const markReadyIfBothLoaded = () => {
      if (!unmounted && scoreLoadedRef.current && settingsLoadedRef.current) {
        setLoading(false);
      }
    };

    // 1. Live Scoreboard listener (scores, dots, clocks, alerts)
    const unsubScore = onSnapshot(
      scoreDocRef,
      (snap) => {
        if (unmounted) return;
        scoreLoadedRef.current = true;
        setConnected(true);
        setErrorMessage(null);

        if (snap.exists()) {
          const incoming = sanitizeScoreboardForFirestore(
            targetUid,
            snap.data() as UserLiveScoreboardDoc
          );
          // Prevent stale snapshots from overwriting newer local writes
          if (incoming.version >= lastScoreVersionRef.current) {
            lastScoreVersionRef.current = incoming.version;
            scoreRef.current = incoming;
            setScoreDoc(incoming);
          }
        } else if (role === 'controller' && canWrite) {
          // Initialize ONLY if no saved document exists yet!
          const initial = createInitialUserScoreboardDoc(targetUid);
          lastScoreVersionRef.current = initial.version;
          scoreRef.current = initial;
          setScoreDoc(initial);
          setDoc(scoreDocRef, initial).catch(() => {});
        }
        markReadyIfBothLoaded();
      },
      (err) => {
        if (unmounted) return;
        setConnected(false);
        setLoading(false);
        setErrorMessage('Live scoreboard connection interrupted. Reconnecting...');
        try {
          handleFirestoreError(err, OperationType.GET, `users/${targetUid}/scoreboard/current`);
        } catch {
          // Non-fatal in listener callback
        }
      }
    );

    // 2. Permanent Settings listener (team names, player names, logos, tournament, sponsor)
    const unsubSettings = onSnapshot(
      settingsDocRef,
      (snap) => {
        if (unmounted) return;
        settingsLoadedRef.current = true;
        setConnected(true);

        if (snap.exists()) {
          const incoming = sanitizeSettingsForFirestore(
            targetUid,
            snap.data() as UserScoreboardSettingsDoc
          );
          if (incoming.version >= lastSettingsVersionRef.current) {
            lastSettingsVersionRef.current = incoming.version;
            // Preserve any field the operator is actively typing right now!
            const pending = pendingSettingsPatchRef.current;
            const merged =
              Object.keys(pending).length > 0 ? { ...incoming, ...pending } : incoming;
            settingsRef.current = merged;
            setSettingsDoc(merged);
          }
        } else if (role === 'controller' && canWrite) {
          // Initialize defaults ONLY when no saved settings doc exists!
          const initial = createInitialUserSettingsDoc(targetUid, defaultTournamentTitle);
          lastSettingsVersionRef.current = initial.version;
          settingsRef.current = initial;
          setSettingsDoc(initial);
          setDoc(settingsDocRef, initial).catch(() => {});
        }
        markReadyIfBothLoaded();
      },
      (err) => {
        if (unmounted) return;
        setLoading(false);
        try {
          handleFirestoreError(err, OperationType.GET, `users/${targetUid}/settings/main`);
        } catch {
          // Non-fatal in listener callback
        }
      }
    );

    // 3. Per-User Private Undo History listener (controller only)
    let unsubUndo: (() => void) | null = null;
    if (role === 'controller' && canWrite) {
      unsubUndo = onSnapshot(
        undoDocRef,
        (snap) => {
          if (unmounted) return;
          if (snap.exists()) {
            const data = snap.data() as UserUndoHistoryDoc;
            const list = Array.isArray(data.entries) ? data.entries.slice(-MAX_UNDO_HISTORY) : [];
            undoEntriesRef.current = list;
            setUndoEntries(list);
          } else {
            undoEntriesRef.current = [];
            setUndoEntries([]);
          }
        },
        () => {
          // Ignore non-fatal undo listener error
        }
      );
    }

    return () => {
      unmounted = true;
      unsubScore();
      unsubSettings();
      if (unsubUndo) unsubUndo();
      if (settingsDebounceRef.current !== null) {
        window.clearTimeout(settingsDebounceRef.current);
        settingsDebounceRef.current = null;
      }
      if (alertClearTimerRef.current !== null) {
        window.clearTimeout(alertClearTimerRef.current);
        alertClearTimerRef.current = null;
      }
    };
  }, [targetUid, role, canWrite, defaultTournamentTitle]);

  // Flush pending manual text before tab closes or hides
  useEffect(() => {
    if (role !== 'controller' || !canWrite) return;
    const handleBeforeUnload = () => {
      void flushSettingsNow();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void flushSettingsNow();
      }
    };
    window.addEventListener('pagehide', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [role, canWrite, flushSettingsNow]);

  // Permanent Manual Text & Branding Updater (NEVER reverts while typing!)
  const updateSettings = useCallback(
    (patch: Partial<UserScoreboardSettingsDoc>, immediate = false) => {
      if (!canWrite || role !== 'controller' || !targetUid) return;
      pendingSettingsPatchRef.current = {
        ...pendingSettingsPatchRef.current,
        ...patch,
      };

      // Optimistically update local UI immediately so inputs feel instantaneous
      const nextLocal: UserScoreboardSettingsDoc = {
        ...settingsRef.current,
        ...patch,
        ownerUid: targetUid,
      };
      settingsRef.current = nextLocal;
      setSettingsDoc(nextLocal);

      if (settingsDebounceRef.current !== null) {
        window.clearTimeout(settingsDebounceRef.current);
        settingsDebounceRef.current = null;
      }

      if (immediate) {
        void flushSettingsNow();
      } else {
        settingsDebounceRef.current = window.setTimeout(() => {
          settingsDebounceRef.current = null;
          void flushSettingsNow();
        }, SETTINGS_SAVE_DEBOUNCE_MS);
      }
    },
    [canWrite, role, targetUid, flushSettingsNow]
  );

  // Internal atomic scoreboard writer with optional Undo push + Score History log
  const commitScoreboardMutation = useCallback(
    async (
      mutator: (current: UserLiveScoreboardDoc, now: number) => UserLiveScoreboardDoc,
      options?: {
        pushUndoLabel?: string;
        historyAction?: string;
        historyTeam?: string;
        historyDelta?: number;
        skipActionGuard?: boolean;
        autoClearAlertMs?: number;
      }
    ) => {
      if (!canWrite || role !== 'controller' || !targetUid) return false;

      const now = Date.now();
      if (!options?.skipActionGuard) {
        if (actionInFlightRef.current) return false;
        if (now - lastActionStampRef.current < ACTION_GUARD_MS) return false;
      }

      actionInFlightRef.current = true;
      lastActionStampRef.current = now;

      const prevDoc = scoreRef.current;
      const nextVersion = Math.max(lastScoreVersionRef.current, prevDoc.version) + 1;
      const mutated = sanitizeScoreboardForFirestore(targetUid, {
        ...mutator(prevDoc, now),
        ownerUid: targetUid,
        version: nextVersion,
        updatedAt: now,
      });

      const nextUndoEntries = options?.pushUndoLabel
        ? [...undoEntriesRef.current, captureUndoSnapshot(prevDoc, options.pushUndoLabel)].slice(
            -MAX_UNDO_HISTORY
          )
        : undoEntriesRef.current;

      // Optimistic local state update with version lock
      lastScoreVersionRef.current = nextVersion;
      scoreRef.current = mutated;
      setScoreDoc(mutated);
      if (options?.pushUndoLabel) {
        undoEntriesRef.current = nextUndoEntries;
        setUndoEntries(nextUndoEntries);
      }

      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'users', targetUid, 'scoreboard', 'current'), mutated);

        if (options?.pushUndoLabel) {
          const undoDoc: UserUndoHistoryDoc = {
            ownerUid: targetUid,
            entries: nextUndoEntries,
            updatedAt: now,
          };
          batch.set(doc(db, 'users', targetUid, 'undoHistory', 'stack'), undoDoc);
        }

        if (options?.historyAction) {
          const eventId = `evt_${now}_${nextVersion}`;
          batch.set(doc(db, 'users', targetUid, 'scoreHistory', eventId), {
            ownerUid: targetUid,
            action: options.historyAction.slice(0, 60),
            ...(options.historyTeam ? { team: options.historyTeam.slice(0, 12) } : {}),
            ...(typeof options.historyDelta === 'number'
              ? { delta: clampInt(options.historyDelta, -99, 99, 0) }
              : {}),
            teamAScore: mutated.teamAScore,
            teamBScore: mutated.teamBScore,
            teamAPlayersOnMat: mutated.teamAPlayersOnMat,
            teamBPlayersOnMat: mutated.teamBPlayersOnMat,
            createdAt: now,
          });
        }

        await batch.commit();
        setErrorMessage(null);

        // Optional auto-clear for transient broadcast alert banners
        if (options?.autoClearAlertMs && mutated.kabaddiAlert) {
          if (alertClearTimerRef.current !== null) {
            window.clearTimeout(alertClearTimerRef.current);
          }
          const alertTextSnapshot = mutated.kabaddiAlert;
          alertClearTimerRef.current = window.setTimeout(() => {
            alertClearTimerRef.current = null;
            if (scoreRef.current.kabaddiAlert === alertTextSnapshot) {
              void commitScoreboardMutation(
                (curr) => ({ ...curr, kabaddiAlert: null }),
                { skipActionGuard: true }
              );
            }
          }, options.autoClearAlertMs);
        }

        return true;
      } catch (err) {
        setErrorMessage('Sync failed. Please check internet connection.');
        try {
          handleFirestoreError(err, OperationType.WRITE, `users/${targetUid}/scoreboard/current`);
        } catch {
          // Handled via errorMessage
        }
        return false;
      } finally {
        actionInFlightRef.current = false;
      }
    },
    [canWrite, role, targetUid]
  );

  // 1. Exact Score Delta (1 click = strictly 1 score mutation!)
  const applyScoreDelta = useCallback(
    async (team: 'A' | 'B', kind: ScoreKind, delta: number) => {
      const safeDelta = clampInt(delta, -10, 10, 0);
      if (safeDelta === 0) return false;
      const teamName =
        team === 'A' ? settingsRef.current.teamAName || 'TEAM A' : settingsRef.current.teamBName || 'TEAM B';

      let alertLabel: string | null = null;
      if (safeDelta >= 3 && (kind === 'raid' || kind === 'lona')) {
        alertLabel = `SUPER RAID +${safeDelta} · ${teamName}`;
      } else if (kind === 'bonus' && safeDelta > 0) {
        alertLabel = `BONUS +${safeDelta} · ${teamName}`;
      } else if (kind === 'tackle' && safeDelta >= 2) {
        alertLabel = `SUPER TACKLE +${safeDelta} · ${teamName}`;
      } else if (kind === 'lona' && safeDelta > 0) {
        alertLabel = `ALL OUT +${safeDelta} · ${teamName}`;
      }

      return commitScoreboardMutation(
        (curr) => {
          if (team === 'A') {
            return {
              ...curr,
              teamAScore: Math.max(0, Math.min(999, curr.teamAScore + safeDelta)),
              teamARaidPoints:
                kind === 'raid'
                  ? Math.max(0, (curr.teamARaidPoints ?? 0) + safeDelta)
                  : curr.teamARaidPoints ?? 0,
              teamABonusPoints:
                kind === 'bonus'
                  ? Math.max(0, (curr.teamABonusPoints ?? 0) + safeDelta)
                  : curr.teamABonusPoints ?? 0,
              teamATacklePoints:
                kind === 'tackle'
                  ? Math.max(0, (curr.teamATacklePoints ?? 0) + safeDelta)
                  : curr.teamATacklePoints ?? 0,
              teamALonaPoints:
                kind === 'lona'
                  ? Math.max(0, (curr.teamALonaPoints ?? 0) + safeDelta)
                  : curr.teamALonaPoints ?? 0,
              kabaddiAlert: alertLabel ?? curr.kabaddiAlert,
            };
          }
          return {
            ...curr,
            teamBScore: Math.max(0, Math.min(999, curr.teamBScore + safeDelta)),
            teamBRaidPoints:
              kind === 'raid'
                ? Math.max(0, (curr.teamBRaidPoints ?? 0) + safeDelta)
                : curr.teamBRaidPoints ?? 0,
            teamBBonusPoints:
              kind === 'bonus'
                ? Math.max(0, (curr.teamBBonusPoints ?? 0) + safeDelta)
                : curr.teamBBonusPoints ?? 0,
            teamBTacklePoints:
              kind === 'tackle'
                ? Math.max(0, (curr.teamBTacklePoints ?? 0) + safeDelta)
                : curr.teamBTacklePoints ?? 0,
            teamBLonaPoints:
              kind === 'lona'
                ? Math.max(0, (curr.teamBLonaPoints ?? 0) + safeDelta)
                : curr.teamBLonaPoints ?? 0,
            kabaddiAlert: alertLabel ?? curr.kabaddiAlert,
          };
        },
        {
          pushUndoLabel: `Team ${team} ${safeDelta > 0 ? `+${safeDelta}` : safeDelta} (${kind})`,
          historyAction: `score_${kind}`,
          historyTeam: team,
          historyDelta: safeDelta,
          autoClearAlertMs: alertLabel ? 4200 : undefined,
        }
      );
    },
    [commitScoreboardMutation]
  );

  // 2. Player-Out Dot System (1 click = strictly 1 dot change, saved to Undo stack!)
  const setPlayersOnMat = useCallback(
    async (team: 'A' | 'B', count: number) => {
      const clamped = clampInt(count, 0, 7, 7);
      const currentCount =
        team === 'A' ? scoreRef.current.teamAPlayersOnMat : scoreRef.current.teamBPlayersOnMat;
      if (clamped === currentCount) return false;

      return commitScoreboardMutation(
        (curr) =>
          team === 'A'
            ? { ...curr, teamAPlayersOnMat: clamped }
            : { ...curr, teamBPlayersOnMat: clamped },
        {
          pushUndoLabel: `Team ${team} Players ${currentCount}→${clamped}`,
          historyAction: 'players_on_mat',
          historyTeam: team,
          historyDelta: clamped - currentCount,
        }
      );
    },
    [commitScoreboardMutation]
  );

  const playerOut = useCallback(
    async (team: 'A' | 'B') => {
      const currentCount =
        team === 'A' ? scoreRef.current.teamAPlayersOnMat : scoreRef.current.teamBPlayersOnMat;
      if (currentCount <= 0) return false;
      return setPlayersOnMat(team, currentCount - 1);
    },
    [setPlayersOnMat]
  );

  // 3. Dedicated All-Out Action (+2 to scoring team, revives opponent's 7 dots, saves Undo!)
  const triggerAllOut = useCallback(
    async (scoringTeam: 'A' | 'B') => {
      const teamName =
        scoringTeam === 'A'
          ? settingsRef.current.teamAName || 'TEAM A'
          : settingsRef.current.teamBName || 'TEAM B';
      return commitScoreboardMutation(
        (curr) => {
          if (scoringTeam === 'A') {
            return {
              ...curr,
              teamAScore: Math.min(999, curr.teamAScore + 2),
              teamALonaPoints: (curr.teamALonaPoints ?? 0) + 2,
              teamBPlayersOnMat: 7,
              kabaddiAlert: `ALL OUT +2 · ${teamName}`,
            };
          }
          return {
            ...curr,
            teamBScore: Math.min(999, curr.teamBScore + 2),
            teamBLonaPoints: (curr.teamBLonaPoints ?? 0) + 2,
            teamAPlayersOnMat: 7,
            kabaddiAlert: `ALL OUT +2 · ${teamName}`,
          };
        },
        {
          pushUndoLabel: `All Out +2 Team ${scoringTeam}`,
          historyAction: 'all_out',
          historyTeam: scoringTeam,
          historyDelta: 2,
          autoClearAlertMs: 4500,
        }
      );
    },
    [commitScoreboardMutation]
  );

  // 4. Dedicated Multi-Step UNDO (Restores exact previous score & dots, NEVER touches settings!)
  const undoLastAction = useCallback(async () => {
    if (!canWrite || role !== 'controller' || !targetUid) return false;
    if (undoEntriesRef.current.length === 0) return false;
    const now = Date.now();
    if (actionInFlightRef.current || now - lastActionStampRef.current < ACTION_GUARD_MS) {
      return false;
    }

    actionInFlightRef.current = true;
    lastActionStampRef.current = now;

    const stack = [...undoEntriesRef.current];
    const previous = stack.pop();
    if (!previous) {
      actionInFlightRef.current = false;
      return false;
    }

    const nextVersion = Math.max(lastScoreVersionRef.current, scoreRef.current.version) + 1;
    const restored = sanitizeScoreboardForFirestore(targetUid, {
      ...scoreRef.current,
      teamAScore: previous.teamAScore,
      teamARaidPoints: previous.teamARaidPoints,
      teamABonusPoints: previous.teamABonusPoints,
      teamATacklePoints: previous.teamATacklePoints,
      teamALonaPoints: previous.teamALonaPoints,
      teamAPlayersOnMat: previous.teamAPlayersOnMat,
      teamAGreenCards: previous.teamAGreenCards,
      teamAYellowCards: previous.teamAYellowCards,
      teamARedCards: previous.teamARedCards,
      teamABinEndAt: previous.teamABinEndAt,
      teamBScore: previous.teamBScore,
      teamBRaidPoints: previous.teamBRaidPoints,
      teamBBonusPoints: previous.teamBBonusPoints,
      teamBTacklePoints: previous.teamBTacklePoints,
      teamBLonaPoints: previous.teamBLonaPoints,
      teamBPlayersOnMat: previous.teamBPlayersOnMat,
      teamBGreenCards: previous.teamBGreenCards,
      teamBYellowCards: previous.teamBYellowCards,
      teamBRedCards: previous.teamBRedCards,
      teamBBinEndAt: previous.teamBBinEndAt,
      kabaddiHalf: previous.kabaddiHalf,
      doOrDie: previous.doOrDie,
      kabaddiAlert: null,
      version: nextVersion,
      updatedAt: now,
    });

    lastScoreVersionRef.current = nextVersion;
    scoreRef.current = restored;
    undoEntriesRef.current = stack;
    setScoreDoc(restored);
    setUndoEntries(stack);

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', targetUid, 'scoreboard', 'current'), restored);
      batch.set(doc(db, 'users', targetUid, 'undoHistory', 'stack'), {
        ownerUid: targetUid,
        entries: stack,
        updatedAt: now,
      });
      batch.set(doc(db, 'users', targetUid, 'scoreHistory', `undo_${now}_${nextVersion}`), {
        ownerUid: targetUid,
        action: 'undo',
        teamAScore: restored.teamAScore,
        teamBScore: restored.teamBScore,
        teamAPlayersOnMat: restored.teamAPlayersOnMat,
        teamBPlayersOnMat: restored.teamBPlayersOnMat,
        createdAt: now,
      });
      await batch.commit();
      setErrorMessage(null);
      return true;
    } catch (err) {
      setErrorMessage('Undo sync failed. Please try again.');
      try {
        handleFirestoreError(err, OperationType.WRITE, `users/${targetUid}/undoHistory/stack`);
      } catch {
        // Handled cleanly
      }
      return false;
    } finally {
      actionInFlightRef.current = false;
    }
  }, [canWrite, role, targetUid]);

  // 5. Dedicated RESET SCORE (Resets scores to 0, dots to 7, clocks to 30s; NEVER deletes names/logos/settings!)
  const resetMatchScore = useCallback(async () => {
    if (!canWrite || role !== 'controller' || !targetUid) return false;
    if (actionInFlightRef.current) return false;

    actionInFlightRef.current = true;
    const now = Date.now();
    lastActionStampRef.current = now;

    const nextVersion = Math.max(lastScoreVersionRef.current, scoreRef.current.version) + 1;
    const freshScore = sanitizeScoreboardForFirestore(targetUid, {
      ...createInitialUserScoreboardDoc(targetUid),
      visible: scoreRef.current.visible,
      version: nextVersion,
      updatedAt: now,
    });

    lastScoreVersionRef.current = nextVersion;
    scoreRef.current = freshScore;
    undoEntriesRef.current = [];
    setScoreDoc(freshScore);
    setUndoEntries([]);

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', targetUid, 'scoreboard', 'current'), freshScore);
      batch.set(doc(db, 'users', targetUid, 'undoHistory', 'stack'), {
        ownerUid: targetUid,
        entries: [],
        updatedAt: now,
      });
      batch.set(doc(db, 'users', targetUid, 'scoreHistory', `reset_${now}_${nextVersion}`), {
        ownerUid: targetUid,
        action: 'reset_score',
        teamAScore: 0,
        teamBScore: 0,
        teamAPlayersOnMat: 7,
        teamBPlayersOnMat: 7,
        createdAt: now,
      });
      await batch.commit();
      setErrorMessage(null);
      return true;
    } catch (err) {
      setErrorMessage('Reset failed. Please try again.');
      try {
        handleFirestoreError(err, OperationType.WRITE, `users/${targetUid}/scoreboard/current`);
      } catch {
        // Handled cleanly
      }
      return false;
    } finally {
      actionInFlightRef.current = false;
    }
  }, [canWrite, role, targetUid]);

  // 6. Clocks, Half, Timeout, Do-or-Die, Cards, Visibility, Graphic Slates
  const toggleMatchTimer = useCallback(() => {
    return commitScoreboardMutation((curr, now) => {
      const liveSec = computeLiveClockSeconds(
        curr.matchSeconds,
        curr.matchRunning,
        curr.matchUpdatedAt,
        now
      );
      const nextRunning = !curr.matchRunning;
      return {
        ...curr,
        matchSeconds: liveSec <= 0 && nextRunning ? 30 : liveSec,
        matchRunning: nextRunning,
        matchUpdatedAt: now,
        matchStatus: nextRunning ? 'LIVE' : 'PAUSED',
      };
    });
  }, [commitScoreboardMutation]);

  const resetMatchTimer = useCallback(
    (seconds = 30, autoStart = false) => {
      return commitScoreboardMutation((curr, now) => ({
        ...curr,
        matchSeconds: clampInt(seconds, 0, 3600, 30),
        matchRunning: autoStart,
        matchUpdatedAt: now,
        matchStatus: autoStart ? 'LIVE' : 'PAUSED',
      }));
    },
    [commitScoreboardMutation]
  );

  const toggleRaidTimer = useCallback(() => {
    return commitScoreboardMutation((curr, now) => {
      const liveSec = computeLiveClockSeconds(
        curr.raidSeconds,
        curr.raidRunning,
        curr.raidUpdatedAt,
        now
      );
      const nextRunning = !curr.raidRunning;
      return {
        ...curr,
        raidSeconds: liveSec <= 0 && nextRunning ? 30 : liveSec,
        raidRunning: nextRunning,
        raidUpdatedAt: now,
      };
    });
  }, [commitScoreboardMutation]);

  const resetRaidTimer = useCallback(() => {
    return commitScoreboardMutation((curr, now) => ({
      ...curr,
      raidSeconds: 30,
      raidRunning: false,
      raidUpdatedAt: now,
    }));
  }, [commitScoreboardMutation]);

  const setHalf = useCallback(
    (half: KabaddiHalf) => {
      return commitScoreboardMutation(
        (curr) => ({
          ...curr,
          kabaddiHalf: half,
          matchStatus:
            half === 'HALF TIME' ? 'HALF TIME' : half === 'FULL TIME' ? 'FULL TIME' : curr.matchStatus,
        }),
        { pushUndoLabel: `Half → ${half}` }
      );
    },
    [commitScoreboardMutation]
  );

  const setTimeoutTeam = useCallback(
    (target: KabaddiTimeoutTeam) => {
      return commitScoreboardMutation((curr, now) => {
        const liveMatch = computeLiveClockSeconds(
          curr.matchSeconds,
          curr.matchRunning,
          curr.matchUpdatedAt,
          now
        );
        const liveRaid = computeLiveClockSeconds(
          curr.raidSeconds,
          curr.raidRunning,
          curr.raidUpdatedAt,
          now
        );
        return {
          ...curr,
          timeoutTeam: target,
          matchRunning: target ? false : curr.matchRunning,
          matchSeconds: liveMatch,
          matchUpdatedAt: now,
          raidRunning: target ? false : curr.raidRunning,
          raidSeconds: liveRaid,
          raidUpdatedAt: now,
          matchStatus: target ? 'TIMEOUT' : 'LIVE',
          kabaddiAlert: target ? `TIMEOUT · ${target === 'OFFICIAL' ? 'OFFICIAL' : `TEAM ${target}`}` : null,
        };
      });
    },
    [commitScoreboardMutation]
  );

  const setDoOrDie = useCallback(
    (active: boolean) => {
      return commitScoreboardMutation(
        (curr) => ({
          ...curr,
          doOrDie: active,
          kabaddiAlert: active ? 'DO OR DIE RAID' : null,
        }),
        { pushUndoLabel: active ? 'Do-or-Die ON' : 'Do-or-Die OFF', autoClearAlertMs: active ? 4200 : undefined }
      );
    },
    [commitScoreboardMutation]
  );

  const issueCard = useCallback(
    (team: 'A' | 'B', card: 'green' | 'yellow' | 'red') => {
      const teamName =
        team === 'A' ? settingsRef.current.teamAName || 'TEAM A' : settingsRef.current.teamBName || 'TEAM B';
      return commitScoreboardMutation(
        (curr, now) => {
          if (team === 'A') {
            return {
              ...curr,
              teamAGreenCards: (curr.teamAGreenCards ?? 0) + (card === 'green' ? 1 : 0),
              teamAYellowCards: (curr.teamAYellowCards ?? 0) + (card === 'yellow' ? 1 : 0),
              teamARedCards: (curr.teamARedCards ?? 0) + (card === 'red' ? 1 : 0),
              teamABinEndAt: card === 'yellow' ? now + 120_000 : curr.teamABinEndAt,
              kabaddiAlert: `${card.toUpperCase()} CARD · ${teamName}`,
            };
          }
          return {
            ...curr,
            teamBGreenCards: (curr.teamBGreenCards ?? 0) + (card === 'green' ? 1 : 0),
            teamBYellowCards: (curr.teamBYellowCards ?? 0) + (card === 'yellow' ? 1 : 0),
            teamBRedCards: (curr.teamBRedCards ?? 0) + (card === 'red' ? 1 : 0),
            teamBBinEndAt: card === 'yellow' ? now + 120_000 : curr.teamBBinEndAt,
            kabaddiAlert: `${card.toUpperCase()} CARD · ${teamName}`,
          };
        },
        {
          pushUndoLabel: `${card.toUpperCase()} Card Team ${team}`,
          historyAction: `card_${card}`,
          historyTeam: team,
          autoClearAlertMs: 4200,
        }
      );
    },
    [commitScoreboardMutation]
  );

  const setVisible = useCallback(
    (visible: boolean) => {
      return commitScoreboardMutation((curr) => ({ ...curr, visible }));
    },
    [commitScoreboardMutation]
  );

  const setGraphicPanel = useCallback(
    (panel: KabaddiGraphicPanel) => {
      return commitScoreboardMutation((curr) => ({
        ...curr,
        visible: true,
        kabaddiGraphicPanel: panel,
      }));
    },
    [commitScoreboardMutation]
  );

  const triggerAlert = useCallback(
    (label: string) => {
      return commitScoreboardMutation(
        (curr) => ({ ...curr, kabaddiAlert: label.slice(0, 120) }),
        { autoClearAlertMs: 4200 }
      );
    },
    [commitScoreboardMutation]
  );

  // Swap Team A and Team B atomically across scoreboard + settings
  const swapTeams = useCallback(async () => {
    if (!canWrite || role !== 'controller' || !targetUid) return false;
    await flushSettingsNow();
    if (actionInFlightRef.current) return false;

    actionInFlightRef.current = true;
    const now = Date.now();
    lastActionStampRef.current = now;

    const s = scoreRef.current;
    const cfg = settingsRef.current;
    const nextScoreVer = Math.max(lastScoreVersionRef.current, s.version) + 1;
    const nextCfgVer = Math.max(lastSettingsVersionRef.current, cfg.version) + 1;

    const swappedScore = sanitizeScoreboardForFirestore(targetUid, {
      ...s,
      teamAScore: s.teamBScore,
      teamARaidPoints: s.teamBRaidPoints,
      teamABonusPoints: s.teamBBonusPoints,
      teamATacklePoints: s.teamBTacklePoints,
      teamALonaPoints: s.teamBLonaPoints,
      teamAPlayersOnMat: s.teamBPlayersOnMat,
      teamAGreenCards: s.teamBGreenCards,
      teamAYellowCards: s.teamBYellowCards,
      teamARedCards: s.teamBRedCards,
      teamABinEndAt: s.teamBBinEndAt,
      teamBScore: s.teamAScore,
      teamBRaidPoints: s.teamARaidPoints,
      teamBBonusPoints: s.teamABonusPoints,
      teamBTacklePoints: s.teamATacklePoints,
      teamBLonaPoints: s.teamALonaPoints,
      teamBPlayersOnMat: s.teamAPlayersOnMat,
      teamBGreenCards: s.teamAGreenCards,
      teamBYellowCards: s.teamAYellowCards,
      teamBRedCards: s.teamARedCards,
      teamBBinEndAt: s.teamABinEndAt,
      version: nextScoreVer,
      updatedAt: now,
    });

    const swappedSettings = sanitizeSettingsForFirestore(targetUid, {
      ...cfg,
      teamAName: cfg.teamBName,
      teamACode: cfg.teamBCode,
      teamAColor: cfg.teamBColor,
      teamALogoUrl: cfg.teamBLogoUrl,
      teamAStarting7: cfg.teamBStarting7,
      teamBName: cfg.teamAName,
      teamBCode: cfg.teamACode,
      teamBColor: cfg.teamAColor,
      teamBLogoUrl: cfg.teamALogoUrl,
      teamBStarting7: cfg.teamAStarting7,
      version: nextCfgVer,
      updatedAt: now,
    });

    lastScoreVersionRef.current = nextScoreVer;
    lastSettingsVersionRef.current = nextCfgVer;
    scoreRef.current = swappedScore;
    settingsRef.current = swappedSettings;
    setScoreDoc(swappedScore);
    setSettingsDoc(swappedSettings);

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', targetUid, 'scoreboard', 'current'), swappedScore);
      batch.set(doc(db, 'users', targetUid, 'settings', 'main'), swappedSettings);
      await batch.commit();
      setErrorMessage(null);
      return true;
    } catch {
      setErrorMessage('Could not swap teams.');
      return false;
    } finally {
      actionInFlightRef.current = false;
    }
  }, [canWrite, role, targetUid, flushSettingsNow]);

  // Combined LiveOverlayState view for KabaddiScoreboardBar & VmixKabaddiController
  const overlayState: LiveOverlayState = useMemo(
    () => mergeUserDocsToOverlayState(targetUid, scoreDoc, settingsDoc),
    [targetUid, scoreDoc, settingsDoc]
  );

  return {
    state: overlayState,
    scoreDoc,
    settingsDoc,
    loading,
    connected,
    savingSettings,
    lastSavedAt,
    errorMessage,
    canUndo: undoEntries.length > 0,
    undoCount: undoEntries.length,
    lastUndoLabel: undoEntries.length > 0 ? undoEntries[undoEntries.length - 1].label : null,
    updateSettings,
    flushSettingsNow,
    applyScoreDelta,
    setPlayersOnMat,
    playerOut,
    triggerAllOut,
    undoLastAction,
    resetMatchScore,
    toggleMatchTimer,
    resetMatchTimer,
    toggleRaidTimer,
    resetRaidTimer,
    setHalf,
    setTimeoutTeam,
    setDoOrDie,
    issueCard,
    setVisible,
    setGraphicPanel,
    triggerAlert,
    swapTeams,
  };
}
