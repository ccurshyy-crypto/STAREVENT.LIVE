import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { createInitialCricketSuiteState } from '../data/cricketSampleData';
import {
  auth,
  signInWithGooglePopup,
  signOutFirebaseAuth,
  subscribeFirebaseAuth,
} from '../firebase';
import {
  applyLiveDocToSuiteState,
  commitLiveScoreboardTransaction,
  generateActionId,
  subscribeLiveScoreboardDoc,
  type FirestoreConnectionStatus,
} from '../lib/firestoreLiveSync';
import {
  getSupabaseClient,
  SUPABASE_SCOREBOARD_TABLE,
} from '../lib/supabaseClient';
import { CricketSuiteState, OverlayThemeId } from '../types/cricketSuite';

const CACHE_STORAGE_PREFIX = 'starevent_cricket_suite_v2:';
const PENDING_STORAGE_PREFIX = 'starevent_cricket_pending_v2:';
const CHANNEL_PREFIX = 'starevent_cricket_overlay_v2:';

// Unique per-tab device identifier so Realtime echoes from this tab are ignored
// while updates from any other device (Desktop <-> Mobile) are applied immediately
// regardless of device clock skew.
const CLIENT_DEVICE_ID = (() => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // Fallback below
  }
  return `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
})();

export type WorkspaceLoadStatus = 'loading' | 'ready' | 'offline-cache' | 'error';

export function sanitizeUid(raw: string | null | undefined): string {
  return String(raw || '')
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 48);
}

function escapeLikePattern(raw: string): string {
  return raw.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

function getCacheStorageKey(uid: string): string {
  return `${CACHE_STORAGE_PREFIX}${sanitizeUid(uid)}`;
}

function getPendingStorageKey(uid: string): string {
  return `${PENDING_STORAGE_PREFIX}${sanitizeUid(uid)}`;
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

function hasMeaningfulUserData(state: CricketSuiteState | null | undefined): boolean {
  if (!state) return false;
  return (
    state.tournaments.length > 0 ||
    state.teams.length > 0 ||
    state.matches.length > 0 ||
    state.groups.length > 0 ||
    state.pointTableOverrides.length > 0 ||
    Boolean(state.user?.channelLogoUrl?.trim()) ||
    state.user?.userTheme === 'worldcup' ||
    state.user?.userTheme === 'lightning-pro' ||
    Boolean(state.user?.worldcupUnlockExpiresAt) ||
    Boolean(state.user?.customThemeColors?.enabled)
  );
}

function getRevision(state: CricketSuiteState | null | undefined): number {
  if (!state) return 0;
  return typeof state.revision === 'number' && Number.isFinite(state.revision)
    ? state.revision
    : 0;
}

function getUpdatedAt(state: CricketSuiteState | null | undefined): number {
  if (!state) return 0;
  return typeof state.updatedAt === 'number' && Number.isFinite(state.updatedAt)
    ? state.updatedAt
    : 0;
}

function normalizeLoadedState(
  raw: Partial<CricketSuiteState> | null | undefined,
  uid: string,
  userLabel?: string,
  serverUpdatedAtIso?: string | null
): CricketSuiteState | null {
  if (
    !uid ||
    !raw ||
    typeof raw !== 'object' ||
    !Array.isArray(raw.matches) ||
    !Array.isArray(raw.teams)
  ) {
    return null;
  }

  const base = createInitialCricketSuiteState(uid, userLabel);
  const parsedServerTs = serverUpdatedAtIso ? Date.parse(serverUpdatedAtIso) : NaN;
  const rawUpdatedAt =
    typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt) ? raw.updatedAt : 0;
  const resolvedUpdatedAt =
    rawUpdatedAt > 0
      ? rawUpdatedAt
      : Number.isFinite(parsedServerTs)
        ? parsedServerTs
        : 0;

  const rawRevision =
    typeof raw.revision === 'number' && Number.isFinite(raw.revision) && raw.revision >= 0
      ? raw.revision
      : resolvedUpdatedAt > 0
        ? 1
        : 0;

  return {
    ...base,
    ...raw,
    version: 2,
    uid,
    updatedAt: resolvedUpdatedAt,
    revision: rawRevision,
    lastModifiedByDevice:
      typeof raw.lastModifiedByDevice === 'string' ? raw.lastModifiedByDevice : undefined,
    user: {
      ...base.user,
      ...(raw.user || {}),
      userTheme:
        raw.user?.userTheme === 'worldcup' ||
        raw.user?.userTheme === 'lightning-pro' ||
        raw.user?.userTheme === 'tata-ipl-2022'
          ? (raw.user.userTheme as OverlayThemeId)
          : 'tata-ipl-2022',
      customThemeColors: {
        ...base.user.customThemeColors,
        ...(raw.user?.customThemeColors || {}),
      },
    },
    overlay: {
      ...base.overlay,
      ...(raw.overlay || {}),
    },
    tournaments: Array.isArray(raw.tournaments) ? raw.tournaments : [],
    groups: Array.isArray(raw.groups) ? raw.groups : [],
    teams: Array.isArray(raw.teams) ? raw.teams : [],
    matches: Array.isArray(raw.matches) ? raw.matches : [],
    pointTableOverrides: Array.isArray(raw.pointTableOverrides) ? raw.pointTableOverrides : [],
    pointTableAuditLog: Array.isArray(raw.pointTableAuditLog) ? raw.pointTableAuditLog : [],
    fieldPositions:
      Array.isArray(raw.fieldPositions) && raw.fieldPositions.length > 0
        ? raw.fieldPositions
        : base.fieldPositions,
  };
}

/**
 * Selects the best authoritative cloud state when checking both the direct
 * `match_id = access_id` row and any pre-existing `cricket_suite_v2_<access_id>` row.
 * Guarantees an accidental blank shell never hides real saved tournaments/teams/matches.
 */
function pickBestRemoteState(
  directState: CricketSuiteState | null,
  legacyState: CricketSuiteState | null
): { state: CricketSuiteState | null; fromLegacyOnly: boolean } {
  if (directState && legacyState) {
    const directHasData = hasMeaningfulUserData(directState);
    const legacyHasData = hasMeaningfulUserData(legacyState);

    if (directHasData && !legacyHasData) {
      return { state: directState, fromLegacyOnly: false };
    }
    if (legacyHasData && !directHasData) {
      return { state: legacyState, fromLegacyOnly: true };
    }

    const directRev = getRevision(directState);
    const legacyRev = getRevision(legacyState);
    if (directRev !== legacyRev) {
      return directRev > legacyRev
        ? { state: directState, fromLegacyOnly: false }
        : { state: legacyState, fromLegacyOnly: true };
    }

    return getUpdatedAt(directState) >= getUpdatedAt(legacyState)
      ? { state: directState, fromLegacyOnly: false }
      : { state: legacyState, fromLegacyOnly: true };
  }

  if (directState) return { state: directState, fromLegacyOnly: false };
  if (legacyState) return { state: legacyState, fromLegacyOnly: true };
  return { state: null, fromLegacyOnly: false };
}

/**
 * Merges two states non-destructively by stable record `id` when an offline device
 * reconnects and another device has written newer updates in the meantime.
 */
function mergeById<T extends { id: string }>(remoteList: T[], localList: T[]): T[] {
  const byId = new Map<string, T>();
  for (const item of remoteList) {
    if (item?.id) byId.set(item.id, item);
  }
  for (const item of localList) {
    if (item?.id) byId.set(item.id, item);
  }
  return Array.from(byId.values());
}

function mergeStatesNonDestructively(
  remote: CricketSuiteState,
  localPending: CricketSuiteState,
  uid: string
): CricketSuiteState {
  const mergedTournaments = mergeById(remote.tournaments, localPending.tournaments);
  const mergedGroups = mergeById(remote.groups, localPending.groups);
  const mergedTeams = mergeById(remote.teams, localPending.teams);

  // For matches, prefer the version with more recorded balls or newer local pending edits
  const matchesMap = new Map(remote.matches.map((m) => [m.id, m]));
  for (const localMatch of localPending.matches) {
    const remoteMatch = matchesMap.get(localMatch.id);
    if (!remoteMatch) {
      matchesMap.set(localMatch.id, localMatch);
    } else {
      const localBalls =
        localMatch.innings[0].balls.length + localMatch.innings[1].balls.length;
      const remoteBalls =
        remoteMatch.innings[0].balls.length + remoteMatch.innings[1].balls.length;
      if (localBalls >= remoteBalls) {
        matchesMap.set(localMatch.id, localMatch);
      }
    }
  }

  return {
    ...remote,
    ...localPending,
    version: 2,
    uid,
    revision: Math.max(getRevision(remote), getRevision(localPending)) + 1,
    updatedAt: Math.max(Date.now(), getUpdatedAt(remote) + 1),
    lastModifiedByDevice: CLIENT_DEVICE_ID,
    tournaments: mergedTournaments,
    groups: mergedGroups,
    teams: mergedTeams,
    matches: Array.from(matchesMap.values()),
    activeTournamentId:
      localPending.activeTournamentId ||
      remote.activeTournamentId ||
      mergedTournaments[0]?.id ||
      '',
    activeMatchId:
      localPending.activeMatchId ||
      remote.activeMatchId ||
      Array.from(matchesMap.values())[0]?.id ||
      '',
  };
}

function loadFromLocalCache(uid: string, userLabel?: string): CricketSuiteState | null {
  if (typeof window === 'undefined' || !uid) return null;
  try {
    const raw = window.localStorage.getItem(getCacheStorageKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CricketSuiteState> | null;
    return normalizeLoadedState(parsed, uid, userLabel);
  } catch {
    return null;
  }
}

function saveToLocalCache(uid: string, state: CricketSuiteState): void {
  if (typeof window === 'undefined' || !uid) return;
  try {
    window.localStorage.setItem(getCacheStorageKey(uid), JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

interface PendingSyncRecord {
  state: CricketSuiteState;
  baseRevision: number;
  allowDestructiveReset?: boolean;
  queuedAt: number;
}

function loadPendingSync(uid: string, userLabel?: string): PendingSyncRecord | null {
  if (typeof window === 'undefined' || !uid) return null;
  try {
    const raw = window.localStorage.getItem(getPendingStorageKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingSyncRecord> | null;
    if (!parsed?.state) return null;
    const normalized = normalizeLoadedState(parsed.state, uid, userLabel);
    if (!normalized) return null;
    return {
      state: normalized,
      baseRevision:
        typeof parsed.baseRevision === 'number' && Number.isFinite(parsed.baseRevision)
          ? parsed.baseRevision
          : 0,
      allowDestructiveReset: Boolean(parsed.allowDestructiveReset),
      queuedAt:
        typeof parsed.queuedAt === 'number' && Number.isFinite(parsed.queuedAt)
          ? parsed.queuedAt
          : Date.now(),
    };
  } catch {
    return null;
  }
}

function savePendingSync(uid: string, record: PendingSyncRecord | null): void {
  if (typeof window === 'undefined' || !uid) return;
  try {
    if (record) {
      window.localStorage.setItem(getPendingStorageKey(uid), JSON.stringify(record));
    } else {
      window.localStorage.removeItem(getPendingStorageKey(uid));
    }
  } catch {
    // Ignore storage quota errors
  }
}

interface RemoteFetchResult {
  ok: boolean;
  state: CricketSuiteState | null;
  fromLegacyOnly: boolean;
  canonicalMatchId: string;
  errorMessage?: string;
}

async function fetchAuthoritativeRemoteState(
  uid: string,
  userLabel?: string
): Promise<RemoteFetchResult> {
  const matchRowId = getSupabaseMatchId(uid);
  const legacyRowId = getLegacySupabaseMatchId(uid);
  const supabase = getSupabaseClient();

  try {
    // Single round-trip query for both direct `access_id` and any pre-existing legacy row
    const { data, error } = await supabase
      .from(SUPABASE_SCOREBOARD_TABLE)
      .select('match_id, data, updated_at')
      .in('match_id', [matchRowId, legacyRowId]);

    if (error) {
      return {
        ok: false,
        state: null,
        fromLegacyOnly: false,
        canonicalMatchId: matchRowId,
        errorMessage: error.message || 'Could not reach cloud database.',
      };
    }

    const rows = Array.isArray(data) ? data : [];
    const directRow = rows.find((r) => String(r.match_id) === matchRowId);
    const legacyRow = rows.find((r) => String(r.match_id) === legacyRowId);

    const directState = directRow
      ? normalizeLoadedState(
          directRow.data as Partial<CricketSuiteState> | undefined,
          uid,
          userLabel,
          typeof directRow.updated_at === 'string' ? directRow.updated_at : null
        )
      : null;

    const legacyState = legacyRow
      ? normalizeLoadedState(
          legacyRow.data as Partial<CricketSuiteState> | undefined,
          uid,
          userLabel,
          typeof legacyRow.updated_at === 'string' ? legacyRow.updated_at : null
        )
      : null;

    const picked = pickBestRemoteState(directState, legacyState);
    if (picked.state) {
      return {
        ok: true,
        state: picked.state,
        fromLegacyOnly: picked.fromLegacyOnly,
        canonicalMatchId: matchRowId,
      };
    }

    // Case-insensitive safety lookup (in case a record was saved with different letter casing)
    const ilikeRes = await supabase
      .from(SUPABASE_SCOREBOARD_TABLE)
      .select('match_id, data, updated_at')
      .ilike('match_id', escapeLikePattern(matchRowId));

    if (ilikeRes.error) {
      return {
        ok: false,
        state: null,
        fromLegacyOnly: false,
        canonicalMatchId: matchRowId,
        errorMessage: ilikeRes.error.message || 'Could not verify cloud data.',
      };
    }

    const ilikeRows = Array.isArray(ilikeRes.data) ? ilikeRes.data : [];
    const exactCaseInsensitive = ilikeRows.find(
      (r) => String(r.match_id || '').trim().toLowerCase() === matchRowId.toLowerCase()
    );
    if (exactCaseInsensitive?.data) {
      const normalized = normalizeLoadedState(
        exactCaseInsensitive.data as Partial<CricketSuiteState>,
        uid,
        userLabel,
        typeof exactCaseInsensitive.updated_at === 'string'
          ? exactCaseInsensitive.updated_at
          : null
      );
      return {
        ok: true,
        state: normalized,
        fromLegacyOnly: false,
        canonicalMatchId: String(exactCaseInsensitive.match_id || matchRowId),
      };
    }

    // Confirmed by cloud database: no record exists yet for this account
    return {
      ok: true,
      state: null,
      fromLegacyOnly: false,
      canonicalMatchId: matchRowId,
    };
  } catch (err) {
    return {
      ok: false,
      state: null,
      fromLegacyOnly: false,
      canonicalMatchId: matchRowId,
      errorMessage:
        err instanceof Error ? err.message : 'Network error while loading cloud data.',
    };
  }
}

/**
 * Cloud-first, per-user isolated Cricket Suite store.
 *
 * Guarantees:
 * 1. Waits for Supabase (`live_scoreboards`, `match_id = access_id`) hydration BEFORE allowing edits.
 * 2. Never initializes an empty `Date.now()` state over existing cloud data.
 * 3. Protects against destructive empty overwrites and clock skew using monotonic revisions + device IDs.
 * 4. Preserves pending edits offline and auto-syncs safely when internet reconnects.
 */
export function useCricketSuiteStore(rawUid: string, userLabel?: string) {
  const uid = sanitizeUid(rawUid);
  const userLabelRef = useRef<string | undefined>(userLabel);
  userLabelRef.current = userLabel;

  const [state, setState] = useState<CricketSuiteState>(() =>
    createInitialCricketSuiteState(uid, userLabel)
  );
  const [loadStatus, setLoadStatus] = useState<WorkspaceLoadStatus>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'pending' | 'offline'>(
    'syncing'
  );
  const [isOffline, setIsOffline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [hasPendingSync, setHasPendingSync] = useState<boolean>(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(() => auth.currentUser);
  const [firestoreStatus, setFirestoreStatus] = useState<FirestoreConnectionStatus>(() =>
    typeof navigator !== 'undefined' && !navigator.onLine
      ? 'offline'
      : auth.currentUser?.emailVerified
        ? 'reconnecting'
        : 'auth-required'
  );
  const [lastSyncLatencyMs, setLastSyncLatencyMs] = useState<number | null>(null);

  const isHydratedRef = useRef(false);
  const remoteRevisionRef = useRef(0);
  const remoteHasDataRef = useRef(false);
  const stateRef = useRef<CricketSuiteState>(state);
  stateRef.current = state;

  const channelRef = useRef<BroadcastChannel | null>(null);
  const pushTimerRef = useRef<number | null>(null);
  const isPushingRef = useRef(false);
  const needsRepushRef = useRef(false);
  const wasOfflineRef = useRef(false);

  // High-speed sequential Firestore transaction queue (zero debounce)
  const fsInFlightRef = useRef(false);
  const fsQueuedCommitRef = useRef<{ state: CricketSuiteState; actionId: string } | null>(null);
  const fsConnectedRef = useRef(false);
  const lastCommittedActionIdRef = useRef<string>('');

  const shouldAcceptRemoteUpdate = useCallback(
    (incoming: CricketSuiteState, current: CricketSuiteState): boolean => {
      // Ignore echo of our own exact push from this same browser tab
      if (
        incoming.lastModifiedByDevice === CLIENT_DEVICE_ID &&
        getRevision(incoming) <= getRevision(current)
      ) {
        return false;
      }

      // Never let a blank uninitialized template replace real saved data
      if (
        !hasMeaningfulUserData(incoming) &&
        hasMeaningfulUserData(current) &&
        getRevision(incoming) <= getRevision(current)
      ) {
        return false;
      }

      const incomingRev = getRevision(incoming);
      const currentRev = getRevision(current);

      // Prefer monotonic revision (immune to Mobile vs Desktop clock skew!)
      if (incomingRev > currentRev) return true;
      if (incomingRev < currentRev && currentRev > 0) return false;

      // Same revision (e.g. legacy rows without revision): accept if from another device or newer timestamp
      if (
        incoming.lastModifiedByDevice &&
        incoming.lastModifiedByDevice !== CLIENT_DEVICE_ID
      ) {
        return true;
      }
      return getUpdatedAt(incoming) > getUpdatedAt(current);
    },
    []
  );

  const flushPendingToCloud = useCallback(
    async (explicitRecord?: PendingSyncRecord) => {
      if (!uid || !isHydratedRef.current) return;
      if (isPushingRef.current) {
        needsRepushRef.current = true;
        return;
      }

      const record = explicitRecord ?? loadPendingSync(uid, userLabelRef.current);
      if (!record) {
        setHasPendingSync(false);
        return;
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOffline(true);
        setSyncStatus('offline');
        setHasPendingSync(true);
        return;
      }

      isPushingRef.current = true;
      needsRepushRef.current = false;
      const pushedRevision = getRevision(record.state);
      const pushedQueuedAt = record.queuedAt;
      setSyncStatus('syncing');

      try {
        let candidateState = record.state;

        // Guard 1: Never allow an accidental blank payload to wipe existing cloud data
        // unless the user explicitly confirmed a full workspace reset.
        if (
          !record.allowDestructiveReset &&
          remoteHasDataRef.current &&
          !hasMeaningfulUserData(candidateState)
        ) {
          savePendingSync(uid, null);
          setHasPendingSync(false);
          const refreshed = await fetchAuthoritativeRemoteState(uid, userLabelRef.current);
          if (refreshed.ok && refreshed.state) {
            remoteRevisionRef.current = getRevision(refreshed.state);
            remoteHasDataRef.current = hasMeaningfulUserData(refreshed.state);
            setState(refreshed.state);
            saveToLocalCache(uid, refreshed.state);
          }
          setSyncStatus('synced');
          return;
        }

        // Guard 2: Optimistic remote check before overwriting ONLY when recovering from
        // offline or when local baseRevision may lag another device (saves a full round-trip
        // on fast consecutive scoring clicks!).
        const supabase = getSupabaseClient();
        const matchRowId = getSupabaseMatchId(uid);

        const needsPreWriteMergeCheck =
          !record.allowDestructiveReset &&
          (wasOfflineRef.current || record.baseRevision < remoteRevisionRef.current);

        if (needsPreWriteMergeCheck) {
          const check = await supabase
            .from(SUPABASE_SCOREBOARD_TABLE)
            .select('data, updated_at')
            .eq('match_id', matchRowId)
            .maybeSingle();

          if (!check.error && check.data?.data) {
            const currentRemote = normalizeLoadedState(
              check.data.data as Partial<CricketSuiteState>,
              uid,
              userLabelRef.current,
              typeof check.data.updated_at === 'string' ? check.data.updated_at : null
            );

            if (currentRemote) {
              const latestRemoteRev = getRevision(currentRemote);
              remoteHasDataRef.current =
                remoteHasDataRef.current || hasMeaningfulUserData(currentRemote);

              // If another device saved a newer revision while this device was offline/stale,
              // merge non-destructively instead of overwriting newer cloud records!
              if (
                latestRemoteRev > record.baseRevision &&
                currentRemote.lastModifiedByDevice !== CLIENT_DEVICE_ID
              ) {
                candidateState = mergeStatesNonDestructively(
                  currentRemote,
                  candidateState,
                  uid
                );
              } else {
                const nextRev = Math.max(latestRemoteRev, getRevision(candidateState)) + 1;
                candidateState = {
                  ...candidateState,
                  revision: nextRev,
                  lastModifiedByDevice: CLIENT_DEVICE_ID,
                };
              }
            }
          }
        }

        const { error } = await supabase.from(SUPABASE_SCOREBOARD_TABLE).upsert(
          {
            match_id: matchRowId,
            sport: 'cricket',
            data: candidateState,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'match_id' }
        );

        if (error) {
          setSyncStatus('pending');
          setHasPendingSync(true);
          return;
        }

        remoteRevisionRef.current = Math.max(
          remoteRevisionRef.current,
          getRevision(candidateState)
        );
        remoteHasDataRef.current = hasMeaningfulUserData(candidateState);
        saveToLocalCache(uid, candidateState);

        // Only clear the pending queue if no newer edit was queued while this upsert was in flight
        const latestPending = loadPendingSync(uid, userLabelRef.current);
        const hasNewerPending =
          Boolean(latestPending) &&
          (getRevision(latestPending?.state) > pushedRevision ||
            (latestPending?.queuedAt ?? 0) > pushedQueuedAt);

        if (hasNewerPending) {
          needsRepushRef.current = true;
          setHasPendingSync(true);
        } else {
          savePendingSync(uid, null);
          setHasPendingSync(false);
          setIsOffline(false);
          wasOfflineRef.current = false;
          setSyncStatus('synced');
        }

        // Keep local React state aligned if a non-destructive merge occurred and no newer local edits exist
        if (!hasNewerPending && candidateState !== record.state) {
          setState(candidateState);
          try {
            channelRef.current?.postMessage(candidateState);
          } catch {
            // ignore
          }
        }
      } catch {
        setSyncStatus(
          typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'pending'
        );
        setHasPendingSync(true);
      } finally {
        isPushingRef.current = false;
        if (needsRepushRef.current) {
          needsRepushRef.current = false;
          window.setTimeout(() => {
            void flushPendingToCloud();
          }, 80);
        }
      }
    },
    [uid]
  );

  const scheduleCloudPush = useCallback(
    (nextState: CricketSuiteState, baseRevision: number, allowDestructiveReset = false) => {
      if (!uid || !isHydratedRef.current) return;

      const record: PendingSyncRecord = {
        state: nextState,
        baseRevision,
        allowDestructiveReset,
        queuedAt: Date.now(),
      };
      savePendingSync(uid, record);
      setHasPendingSync(true);

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOffline(true);
        setSyncStatus('offline');
        return;
      }

      if (pushTimerRef.current) {
        window.clearTimeout(pushTimerRef.current);
      }
      setSyncStatus('syncing');
      pushTimerRef.current = window.setTimeout(() => {
        pushTimerRef.current = null;
        void flushPendingToCloud();
      }, 40);
    },
    [uid, flushPendingToCloud]
  );

  // Hydrate strictly from cloud database BEFORE enabling editing
  const hydrateFromCloud = useCallback(async () => {
    if (!uid) {
      setLoadStatus('error');
      setLoadError('No active Account ID found. Please sign in again.');
      return;
    }

    isHydratedRef.current = false;
    setLoadStatus('loading');
    setLoadError(null);
    setSyncStatus('syncing');

    const result = await fetchAuthoritativeRemoteState(uid, userLabelRef.current);
    const pending = loadPendingSync(uid, userLabelRef.current);
    const cached = loadFromLocalCache(uid, userLabelRef.current);

    if (!result.ok) {
      // NEVER treat a network/database failure as an empty database!
      if (pending?.state) {
        isHydratedRef.current = true;
        remoteRevisionRef.current = pending.baseRevision;
        remoteHasDataRef.current = hasMeaningfulUserData(pending.state);
        setState(pending.state);
        setHasPendingSync(true);
        setIsOffline(true);
        setSyncStatus('offline');
        setLoadStatus('offline-cache');
        setLoadError(result.errorMessage || 'Offline — showing saved local changes.');
        return;
      }

      if (cached && hasMeaningfulUserData(cached)) {
        isHydratedRef.current = true;
        remoteRevisionRef.current = getRevision(cached);
        remoteHasDataRef.current = true;
        setState(cached);
        setIsOffline(true);
        setSyncStatus('offline');
        setLoadStatus('offline-cache');
        setLoadError(result.errorMessage || 'Offline — showing last synced backup.');
        return;
      }

      setIsOffline(true);
      setSyncStatus('offline');
      setLoadStatus('error');
      setLoadError(
        result.errorMessage ||
          'Unable to connect to the Star Event Live database. Please check your internet connection and retry.'
      );
      return;
    }

    // Cloud fetch succeeded!
    setIsOffline(false);

    if (result.state) {
      let resolvedState = result.state;
      remoteRevisionRef.current = getRevision(result.state);
      remoteHasDataRef.current = hasMeaningfulUserData(result.state);

      // If this device had unsaved offline edits queued from before, merge safely & push
      if (pending?.state) {
        resolvedState = mergeStatesNonDestructively(result.state, pending.state, uid);
        isHydratedRef.current = true;
        setState(resolvedState);
        saveToLocalCache(uid, resolvedState);
        setLoadStatus('ready');
        setHasPendingSync(true);
        void flushPendingToCloud({
          state: resolvedState,
          baseRevision: getRevision(result.state),
          queuedAt: Date.now(),
        });
        return;
      }

      isHydratedRef.current = true;
      setState(resolvedState);
      saveToLocalCache(uid, resolvedState);
      setLoadStatus('ready');
      setHasPendingSync(false);
      setSyncStatus('synced');

      // One-time non-destructive migration: if existing data lived ONLY under legacy
      // `cricket_suite_v2_<uid>`, mirror it cleanly to `match_id = <uid>` so mobile,
      // desktop, and `/overlay?id=<uid>` all share the exact canonical room key.
      if (result.fromLegacyOnly) {
        const supabase = getSupabaseClient();
        void supabase.from(SUPABASE_SCOREBOARD_TABLE).upsert(
          {
            match_id: getSupabaseMatchId(uid),
            sport: 'cricket',
            data: resolvedState,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'match_id' }
        );
      }
      return;
    }

    // Cloud confirmed NO saved row exists yet for this brand-new account.
    // Check if there are pending offline edits on this device; otherwise start clean WITHOUT
    // writing an empty row to the database until the user actually creates data.
    if (pending?.state && hasMeaningfulUserData(pending.state)) {
      isHydratedRef.current = true;
      remoteRevisionRef.current = 0;
      remoteHasDataRef.current = false;
      setState(pending.state);
      saveToLocalCache(uid, pending.state);
      setLoadStatus('ready');
      void flushPendingToCloud(pending);
      return;
    }

    const freshBlank = createInitialCricketSuiteState(uid, userLabelRef.current);
    isHydratedRef.current = true;
    remoteRevisionRef.current = 0;
    remoteHasDataRef.current = false;
    setState(freshBlank);
    setLoadStatus('ready');
    setHasPendingSync(false);
    setSyncStatus('synced');
  }, [uid, flushPendingToCloud]);

  // Step 1-5: Run initial cloud hydration whenever authenticated `uid` changes
  useEffect(() => {
    void hydrateFromCloud();
    return () => {
      isHydratedRef.current = false;
      if (pushTimerRef.current) {
        window.clearTimeout(pushTimerRef.current);
        pushTimerRef.current = null;
      }
    };
  }, [hydrateFromCloud]);

  // Flush queued Firestore atomic transaction sequentially (zero debounce, 100-300ms live push)
  const flushFirestoreQueue = useCallback(async () => {
    if (!uid || !isHydratedRef.current) return;
    if (fsInFlightRef.current) return;

    const currentAuthUser = auth.currentUser;
    if (!currentAuthUser || !currentAuthUser.emailVerified) {
      setFirestoreStatus(
        typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'auth-required'
      );
      return;
    }

    const nextItem = fsQueuedCommitRef.current;
    if (!nextItem) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setFirestoreStatus('offline');
      return;
    }

    fsQueuedCommitRef.current = null;
    fsInFlightRef.current = true;
    setFirestoreStatus('syncing');

    try {
      const res = await commitLiveScoreboardTransaction({
        roomId: uid,
        state: nextItem.state,
        actionId: nextItem.actionId,
        deviceId: CLIENT_DEVICE_ID,
      });

      if (res.ok) {
        lastCommittedActionIdRef.current = nextItem.actionId;
        fsConnectedRef.current = true;
        if (typeof res.committedRevision === 'number') {
          remoteRevisionRef.current = Math.max(remoteRevisionRef.current, res.committedRevision);
        }
        if (typeof res.latencyMs === 'number') {
          setLastSyncLatencyMs(res.latencyMs);
        }
        if (!fsQueuedCommitRef.current) {
          setFirestoreStatus('connected');
        }
      } else if (res.offline) {
        // Keep latest state queued for automatic flush on reconnect
        if (!fsQueuedCommitRef.current) {
          fsQueuedCommitRef.current = nextItem;
        }
        fsConnectedRef.current = false;
        setFirestoreStatus('offline');
      } else if (res.permissionDenied) {
        fsConnectedRef.current = false;
        setFirestoreStatus('auth-required');
      } else {
        fsConnectedRef.current = false;
        setFirestoreStatus('reconnecting');
      }
    } finally {
      fsInFlightRef.current = false;
      if (
        fsQueuedCommitRef.current &&
        (typeof navigator === 'undefined' || navigator.onLine)
      ) {
        void flushFirestoreQueue();
      }
    }
  }, [uid]);

  const enqueueFirestoreCommit = useCallback(
    (nextState: CricketSuiteState, actionId: string) => {
      if (!uid || !isHydratedRef.current) return;
      fsQueuedCommitRef.current = { state: nextState, actionId };
      void flushFirestoreQueue();
    },
    [uid, flushFirestoreQueue]
  );

  // Track Firebase Auth user and immediately bootstrap live Firestore sync upon sign-in
  useEffect(() => {
    const unsubscribe = subscribeFirebaseAuth((user) => {
      setFirebaseUser(user);
      if (user && user.emailVerified) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          setFirestoreStatus('offline');
        } else {
          setFirestoreStatus('syncing');
          if (uid && isHydratedRef.current && stateRef.current.matches.length > 0) {
            enqueueFirestoreCommit(stateRef.current, generateActionId('init'));
          } else {
            setFirestoreStatus('connected');
          }
        }
      } else {
        fsConnectedRef.current = false;
        setFirestoreStatus(
          typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'auth-required'
        );
      }
    });
    return unsubscribe;
  }, [uid, enqueueFirestoreCommit]);

  // Trigger initial Firestore sync once hydration finishes if Firebase Auth is already signed in
  useEffect(() => {
    if (
      loadStatus === 'ready' &&
      uid &&
      firebaseUser?.emailVerified &&
      stateRef.current.matches.length > 0
    ) {
      enqueueFirestoreCommit(stateRef.current, generateActionId('hydrate'));
    }
  }, [loadStatus, uid, firebaseUser, enqueueFirestoreCommit]);

  const connectFirebaseLive = useCallback(async () => {
    try {
      setFirestoreStatus('syncing');
      const user = await signInWithGooglePopup();
      setFirebaseUser(user);
      if (user?.emailVerified && uid && isHydratedRef.current) {
        enqueueFirestoreCommit(stateRef.current, generateActionId('connect'));
      }
      return { ok: true as const, user };
    } catch (err) {
      setFirestoreStatus(
        typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'auth-required'
      );
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : 'Google Sign-In was cancelled.',
      };
    }
  }, [uid, enqueueFirestoreCommit]);

  const disconnectFirebaseLive = useCallback(async () => {
    await signOutFirebaseAuth();
    fsConnectedRef.current = false;
    setFirestoreStatus('auth-required');
  }, []);

  // Single-document Firebase Cloud Firestore real-time `onSnapshot` listener for multi-device sync
  useEffect(() => {
    if (!uid) return;
    let mounted = true;

    const unsubscribe = subscribeLiveScoreboardDoc({
      roomId: uid,
      onStatusChange: (status) => {
        if (!mounted) return;
        const hasVerifiedAuth = Boolean(auth.currentUser?.emailVerified);
        if (status === 'connected') {
          fsConnectedRef.current = hasVerifiedAuth;
          setFirestoreStatus(hasVerifiedAuth ? 'connected' : 'auth-required');
        } else if (status === 'offline') {
          fsConnectedRef.current = false;
          setFirestoreStatus('offline');
        } else if (hasVerifiedAuth) {
          setFirestoreStatus(status);
        }
      },
      onData: ({ doc: liveDoc }) => {
        if (!mounted || !isHydratedRef.current) return;
        // Ignore echoes of our own tab's writes
        if (
          liveDoc.deviceId === CLIENT_DEVICE_ID &&
          (liveDoc.lastActionId === lastCommittedActionIdRef.current ||
            liveDoc.revision <= getRevision(stateRef.current))
        ) {
          return;
        }
        setState((prev) => {
          const currentRev = getRevision(prev);
          if (liveDoc.revision <= currentRev && liveDoc.deviceId === CLIENT_DEVICE_ID) {
            return prev;
          }
          if (liveDoc.revision < currentRev && currentRev > 0) {
            return prev;
          }
          const merged = applyLiveDocToSuiteState(prev, liveDoc, uid);
          remoteRevisionRef.current = Math.max(remoteRevisionRef.current, getRevision(merged));
          remoteHasDataRef.current =
            remoteHasDataRef.current || hasMeaningfulUserData(merged);
          saveToLocalCache(uid, merged);
          try {
            channelRef.current?.postMessage(merged);
          } catch {
            // ignore
          }
          return merged;
        });
      },
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [uid]);

  // Same-browser instant cross-tab sync (Dashboard <-> /overlay?id=<access_id>)
  useEffect(() => {
    if (!uid || typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(`${CHANNEL_PREFIX}${uid.toUpperCase()}`);
    channelRef.current = ch;

    ch.onmessage = (evt) => {
      if (!isHydratedRef.current) return;
      const incoming = normalizeLoadedState(
        evt.data as Partial<CricketSuiteState> | undefined,
        uid,
        userLabelRef.current
      );
      if (!incoming) return;
      setState((prev) => {
        if (!shouldAcceptRemoteUpdate(incoming, prev)) return prev;
        remoteRevisionRef.current = Math.max(remoteRevisionRef.current, getRevision(incoming));
        remoteHasDataRef.current =
          remoteHasDataRef.current || hasMeaningfulUserData(incoming);
        saveToLocalCache(uid, incoming);
        return incoming;
      });
    };

    return () => {
      ch.close();
      channelRef.current = null;
    };
  }, [uid, shouldAcceptRemoteUpdate]);

  // Single deduplicated Supabase Realtime subscription + reconnect resync
  useEffect(() => {
    if (!uid) return;
    let mounted = true;
    const matchRowId = getSupabaseMatchId(uid);
    const supabase = getSupabaseClient();

    const applyIncomingRemote = (
      rawPayload: Partial<CricketSuiteState> | null | undefined,
      serverUpdatedAtIso?: string | null
    ) => {
      if (!mounted || !isHydratedRef.current) return;
      const incoming = normalizeLoadedState(
        rawPayload,
        uid,
        userLabelRef.current,
        serverUpdatedAtIso
      );
      if (!incoming) return;

      setState((prev) => {
        if (!shouldAcceptRemoteUpdate(incoming, prev)) return prev;
        remoteRevisionRef.current = Math.max(remoteRevisionRef.current, getRevision(incoming));
        remoteHasDataRef.current =
          remoteHasDataRef.current || hasMeaningfulUserData(incoming);
        saveToLocalCache(uid, incoming);
        try {
          channelRef.current?.postMessage(incoming);
        } catch {
          // ignore
        }
        return incoming;
      });
      setSyncStatus('synced');
      setIsOffline(false);
    };

    const pullLatestFromCloud = async () => {
      if (!mounted || !isHydratedRef.current) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;

      // Flush pending local edits first so they aren't overwritten
      if (loadPendingSync(uid, userLabelRef.current)) {
        await flushPendingToCloud();
        return;
      }

      const res = await fetchAuthoritativeRemoteState(uid, userLabelRef.current);
      if (!mounted || !res.ok || !res.state) return;
      applyIncomingRemote(res.state);
    };

    const rtChannel = supabase
      .channel(`live_scoreboard_sync_${matchRowId}_${CLIENT_DEVICE_ID.slice(0, 8)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: SUPABASE_SCOREBOARD_TABLE,
          filter: `match_id=eq.${matchRowId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') return;
          const row = payload.new as
            | { data?: Partial<CricketSuiteState>; updated_at?: string }
            | undefined;
          applyIncomingRemote(row?.data, row?.updated_at ?? null);
        }
      )
      .subscribe();

    const onOnline = () => {
      setIsOffline(false);
      wasOfflineRef.current = true;
      if (auth.currentUser?.emailVerified) {
        setFirestoreStatus('reconnecting');
        if (fsQueuedCommitRef.current) {
          void flushFirestoreQueue();
        } else if (isHydratedRef.current && stateRef.current.matches.length > 0) {
          enqueueFirestoreCommit(stateRef.current, generateActionId('reconnect'));
        }
      }
      if (!isHydratedRef.current) {
        void hydrateFromCloud();
      } else if (loadPendingSync(uid, userLabelRef.current)) {
        void flushPendingToCloud();
      } else {
        void pullLatestFromCloud();
      }
    };

    const onOffline = () => {
      setIsOffline(true);
      wasOfflineRef.current = true;
      setSyncStatus('offline');
      fsConnectedRef.current = false;
      setFirestoreStatus('offline');
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (pushTimerRef.current) {
          window.clearTimeout(pushTimerRef.current);
          pushTimerRef.current = null;
          void flushPendingToCloud();
        }
        if (fsQueuedCommitRef.current) {
          void flushFirestoreQueue();
        }
      } else if (document.visibilityState === 'visible') {
        if (!fsConnectedRef.current) {
          void pullLatestFromCloud();
        } else if (fsQueuedCommitRef.current) {
          void flushFirestoreQueue();
        }
      }
    };

    const onWindowFocus = () => {
      if (!fsConnectedRef.current) {
        void pullLatestFromCloud();
      }
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('focus', onWindowFocus);
    document.addEventListener('visibilitychange', onVisibility);

    // Only run background safety pull when Firestore live onSnapshot is NOT connected
    const resyncTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !fsConnectedRef.current) {
        void pullLatestFromCloud();
      }
    }, 8000);

    return () => {
      mounted = false;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('focus', onWindowFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(resyncTimer);
      void supabase.removeChannel(rtChannel);
    };
  }, [
    uid,
    shouldAcceptRemoteUpdate,
    flushPendingToCloud,
    hydrateFromCloud,
    flushFirestoreQueue,
    enqueueFirestoreCommit,
  ]);

  // Optimistic local UI update + instant atomic Firestore transaction + background workspace save
  const updateState = useCallback(
    (
      updater: (prev: CricketSuiteState) => CricketSuiteState,
      options?: { actionId?: string }
    ) => {
      if (!uid || !isHydratedRef.current) return;

      const baseRev = Math.max(remoteRevisionRef.current, getRevision(stateRef.current));
      const actionId = options?.actionId || generateActionId('upd');

      setState((prev) => {
        const nextRaw = updater(prev);
        const nextRevision = Math.max(baseRev, getRevision(prev)) + 1;
        const next: CricketSuiteState = {
          ...nextRaw,
          version: 2,
          uid,
          revision: nextRevision,
          updatedAt: Date.now(),
          lastModifiedByDevice: CLIENT_DEVICE_ID,
        };
        saveToLocalCache(uid, next);
        try {
          channelRef.current?.postMessage(next);
        } catch {
          // Ignore closed channel
        }
        // Immediate atomic Firestore live sync (zero debounce!)
        enqueueFirestoreCommit(next, actionId);
        // Background full-workspace persistence
        scheduleCloudPush(next, baseRev, false);
        return next;
      });
    },
    [uid, enqueueFirestoreCommit, scheduleCloudPush]
  );

  // Explicit user-confirmed full workspace reset (never triggered automatically on login)
  const resetAllData = useCallback(() => {
    if (!uid || !isHydratedRef.current) return;
    const baseRev = Math.max(remoteRevisionRef.current, getRevision(stateRef.current));
    const freshBase = createInitialCricketSuiteState(uid, userLabelRef.current);
    const fresh: CricketSuiteState = {
      ...freshBase,
      revision: baseRev + 1,
      updatedAt: Date.now(),
      lastModifiedByDevice: CLIENT_DEVICE_ID,
    };
    setState(fresh);
    saveToLocalCache(uid, fresh);
    try {
      channelRef.current?.postMessage(fresh);
    } catch {
      // ignore
    }
    enqueueFirestoreCommit(fresh, generateActionId('reset'));
    scheduleCloudPush(fresh, baseRev, true);
  }, [uid, enqueueFirestoreCommit, scheduleCloudPush]);

  const syncNow = useCallback(() => {
    if (auth.currentUser?.emailVerified && uid && isHydratedRef.current) {
      enqueueFirestoreCommit(stateRef.current, generateActionId('sync'));
    }
    if (!isHydratedRef.current) {
      void hydrateFromCloud();
      return;
    }
    if (loadPendingSync(uid, userLabelRef.current)) {
      void flushPendingToCloud();
    } else {
      void hydrateFromCloud();
    }
  }, [uid, hydrateFromCloud, flushPendingToCloud, enqueueFirestoreCommit]);

  return {
    uid,
    state,
    loadStatus,
    loadError,
    isHydrated: loadStatus === 'ready' || loadStatus === 'offline-cache',
    syncStatus,
    isOffline,
    hasPendingSync,
    firebaseUser,
    firestoreStatus,
    lastSyncLatencyMs,
    connectFirebaseLive,
    disconnectFirebaseLive,
    updateState,
    resetDemoData: resetAllData,
    retryLoad: hydrateFromCloud,
    syncNow,
  };
}

/**
 * Public real-time listener for `/overlay?id=<access_id>` (also supports `?uid=<access_id>&match=<matchId>`).
 * Works WITHOUT login inside vMix / OBS Studio and stays 100% transparent when no id or no data exists.
 *
 * Primary channel: Firebase Cloud Firestore single-document `onSnapshot` listener
 * (`/liveScoreboards/{roomId}` or `/liveScoreboards/{roomId}/matches/{matchId}`)
 * for 100-300ms real-time updates with zero polling and zero flickering on reconnect.
 */
export function useCricketOverlayListener(rawUid: string, rawMatchId?: string) {
  const requestedUid = sanitizeUid(rawUid);
  const requestedMatchId = rawMatchId ? sanitizeUid(rawMatchId) : undefined;
  const [resolvedRoomId, setResolvedRoomId] = useState<string>(requestedUid);
  const [state, setState] = useState<CricketSuiteState | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<FirestoreConnectionStatus>('reconnecting');
  const firestoreActiveRef = useRef(false);

  useEffect(() => {
    setResolvedRoomId(requestedUid);
    if (!requestedUid) {
      setState(null);
    }
  }, [requestedUid]);

  useEffect(() => {
    if (!requestedUid) {
      setState(null);
      return;
    }

    const activeRoom = resolvedRoomId || requestedUid;
    let mounted = true;
    firestoreActiveRef.current = false;

    // Show cached copy immediately if available on same browser (zero blank frame)
    const cached = loadFromLocalCache(activeRoom) ?? loadFromLocalCache(requestedUid);
    if (cached) {
      setState((prev) => prev ?? cached);
    }

    // 1. PRIMARY: Firebase Cloud Firestore single-document `onSnapshot` listener
    // Listens ONLY to the active room doc or specific match doc; auto-unsubscribes on match change.
    const unsubscribeFirestore = subscribeLiveScoreboardDoc({
      roomId: activeRoom,
      matchId: requestedMatchId,
      onStatusChange: (status) => {
        if (!mounted) return;
        setConnectionStatus(status);
      },
      onData: ({ doc: liveDoc }) => {
        if (!mounted) return;
        firestoreActiveRef.current = true;
        setState((prev) => {
          const prevRev = getRevision(prev);
          if (prev && liveDoc.revision < prevRev && prevRev > 0) {
            return prev;
          }
          return applyLiveDocToSuiteState(prev, liveDoc, activeRoom);
        });
      },
    });

    // 2. INSTANT SAME-BROWSER CHANNEL (0ms when scorer & preview are in same browser)
    let ch: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      ch = new BroadcastChannel(`${CHANNEL_PREFIX}${requestedUid.toUpperCase()}`);
      ch.onmessage = (evt) => {
        const incoming = normalizeLoadedState(
          evt.data as Partial<CricketSuiteState> | undefined,
          activeRoom
        );
        if (!incoming) return;
        setState((prev) => {
          if (!prev) return incoming;
          if (getRevision(incoming) >= getRevision(prev)) return incoming;
          return prev;
        });
      };
    }

    const onStorage = (evt: StorageEvent) => {
      if (
        evt.key !== getCacheStorageKey(activeRoom) &&
        evt.key !== getCacheStorageKey(requestedUid)
      ) {
        return;
      }
      if (!evt.newValue) return;
      try {
        const parsed = normalizeLoadedState(
          JSON.parse(evt.newValue) as Partial<CricketSuiteState>,
          activeRoom
        );
        if (parsed) {
          setState((prev) => {
            if (!prev || getRevision(parsed) >= getRevision(prev)) return parsed;
            return prev;
          });
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('storage', onStorage);

    // 3. FALLBACK: Supabase Realtime + initial hydrate (only polls if Firestore hasn't delivered yet)
    const supabase = getSupabaseClient();

    const fetchLatest = async () => {
      const res = await fetchAuthoritativeRemoteState(requestedUid);
      if (!mounted || !res.ok) return;
      if (res.canonicalMatchId && res.canonicalMatchId !== resolvedRoomId) {
        setResolvedRoomId(res.canonicalMatchId);
      }
      if (res.state) {
        const remoteState = res.state;
        setState((prev) => {
          if (!prev) return remoteState;
          const nextRev = getRevision(remoteState);
          const prevRev = getRevision(prev);
          if (nextRev > prevRev) return remoteState;
          if (nextRev === prevRev && getUpdatedAt(remoteState) >= getUpdatedAt(prev)) {
            return remoteState;
          }
          if (
            (remoteState.user.userTheme !== prev.user.userTheme ||
              remoteState.user.worldcupUnlockExpiresAt !== prev.user.worldcupUnlockExpiresAt) &&
            getUpdatedAt(remoteState) > getUpdatedAt(prev)
          ) {
            return remoteState;
          }
          if (!hasMeaningfulUserData(prev) && hasMeaningfulUserData(remoteState)) {
            return remoteState;
          }
          return prev;
        });
      }
    };

    void fetchLatest();

    const onOnline = () => {
      setConnectionStatus('reconnecting');
      if (!firestoreActiveRef.current) {
        void fetchLatest();
      }
    };
    const onOffline = () => {
      setConnectionStatus('offline');
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !firestoreActiveRef.current) {
        void fetchLatest();
      }
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisibility);

    // Zero polling when Firestore live onSnapshot is active; lightweight fallback only if not yet on Firestore
    const pollTimer = window.setInterval(() => {
      if (!firestoreActiveRef.current) {
        void fetchLatest();
      }
    }, 6000);

    const rtChannel = supabase
      .channel(`live_overlay_view_${activeRoom}_${CLIENT_DEVICE_ID.slice(0, 8)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: SUPABASE_SCOREBOARD_TABLE,
          filter: `match_id=eq.${activeRoom}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') return;
          const row = payload.new as
            | { data?: Partial<CricketSuiteState> | null; updated_at?: string }
            | undefined;
          const parsed = normalizeLoadedState(
            row?.data,
            activeRoom,
            undefined,
            row?.updated_at ?? null
          );
          if (parsed) {
            setState((prev) => {
              if (!prev || getRevision(parsed) >= getRevision(prev)) return parsed;
              return prev;
            });
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      unsubscribeFirestore();
      ch?.close();
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(pollTimer);
      void supabase.removeChannel(rtChannel);
    };
  }, [requestedUid, requestedMatchId, resolvedRoomId]);

  return { uid: resolvedRoomId || requestedUid, state, connectionStatus };
}
