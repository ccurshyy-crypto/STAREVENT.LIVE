import { useCallback, useEffect, useRef, useState } from 'react';
import { createInitialCricketSuiteState } from '../data/cricketSampleData';
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
    Boolean(state.user?.channelLogoUrl?.trim())
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
        raw.user?.userTheme === 'worldcup' || raw.user?.userTheme === 'tata-ipl-2022'
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

  const isHydratedRef = useRef(false);
  const remoteRevisionRef = useRef(0);
  const remoteHasDataRef = useRef(false);
  const stateRef = useRef<CricketSuiteState>(state);
  stateRef.current = state;

  const channelRef = useRef<BroadcastChannel | null>(null);
  const pushTimerRef = useRef<number | null>(null);
  const isPushingRef = useRef(false);
  const needsRepushRef = useRef(false);

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

        // Guard 2: Optimistic remote check before overwriting when recovering from offline
        // or when base revision may be behind another device.
        const supabase = getSupabaseClient();
        const matchRowId = getSupabaseMatchId(uid);

        if (!record.allowDestructiveReset) {
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
      }, 150);
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

  // Single deduplicated Supabase Realtime subscription + focus/reconnect resync
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
      setSyncStatus('offline');
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // Flush any debounced edit before mobile browser suspends the tab
        if (pushTimerRef.current) {
          window.clearTimeout(pushTimerRef.current);
          pushTimerRef.current = null;
          void flushPendingToCloud();
        }
      } else if (document.visibilityState === 'visible') {
        void pullLatestFromCloud();
      }
    };

    const onWindowFocus = () => {
      void pullLatestFromCloud();
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('focus', onWindowFocus);
    document.addEventListener('visibilitychange', onVisibility);

    // Periodic safety pull (6s) for mobile browsers that throttle background WebSockets
    const resyncTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void pullLatestFromCloud();
      }
    }, 6000);

    return () => {
      mounted = false;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('focus', onWindowFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(resyncTimer);
      void supabase.removeChannel(rtChannel);
    };
  }, [uid, shouldAcceptRemoteUpdate, flushPendingToCloud, hydrateFromCloud]);

  // Step 6: Allow editing ONLY after cloud hydration has completed
  const updateState = useCallback(
    (updater: (prev: CricketSuiteState) => CricketSuiteState) => {
      if (!uid || !isHydratedRef.current) return;

      const baseRev = Math.max(remoteRevisionRef.current, getRevision(stateRef.current));

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
        scheduleCloudPush(next, baseRev, false);
        return next;
      });
    },
    [uid, scheduleCloudPush]
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
    scheduleCloudPush(fresh, baseRev, true);
  }, [uid, scheduleCloudPush]);

  const syncNow = useCallback(() => {
    if (!isHydratedRef.current) {
      void hydrateFromCloud();
      return;
    }
    if (loadPendingSync(uid, userLabelRef.current)) {
      void flushPendingToCloud();
    } else {
      void hydrateFromCloud();
    }
  }, [uid, hydrateFromCloud, flushPendingToCloud]);

  return {
    uid,
    state,
    loadStatus,
    loadError,
    isHydrated: loadStatus === 'ready' || loadStatus === 'offline-cache',
    syncStatus,
    isOffline,
    hasPendingSync,
    updateState,
    resetDemoData: resetAllData,
    retryLoad: hydrateFromCloud,
    syncNow,
  };
}

/**
 * Public real-time listener for `/overlay?id=<access_id>` (also supports `?uid=<access_id>`).
 * Works WITHOUT login inside vMix / OBS Studio and stays 100% transparent when no id or no data exists.
 */
export function useCricketOverlayListener(rawUid: string) {
  const requestedUid = sanitizeUid(rawUid);
  const [resolvedRoomId, setResolvedRoomId] = useState<string>(requestedUid);
  const [state, setState] = useState<CricketSuiteState | null>(null);

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

    // Show cached copy immediately if available on same browser, then immediately refresh from cloud
    const cached = loadFromLocalCache(activeRoom) ?? loadFromLocalCache(requestedUid);
    if (cached) {
      setState(cached);
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
      if (
        evt.key !== getCacheStorageKey(activeRoom) &&
        evt.key !== getCacheStorageKey(requestedUid)
      ) {
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

    const fetchLatest = async () => {
      const res = await fetchAuthoritativeRemoteState(requestedUid);
      if (!mounted || !res.ok) return;
      if (res.canonicalMatchId && res.canonicalMatchId !== resolvedRoomId) {
        setResolvedRoomId(res.canonicalMatchId);
      }
      if (res.state) {
        setState((prev) => {
          if (!prev) return res.state;
          const nextRev = getRevision(res.state);
          const prevRev = getRevision(prev);
          if (nextRev > prevRev) return res.state;
          if (nextRev === prevRev && getUpdatedAt(res.state) >= getUpdatedAt(prev)) {
            return res.state;
          }
          // Always allow cloud to replace an empty state
          if (!hasMeaningfulUserData(prev) && hasMeaningfulUserData(res.state)) {
            return res.state;
          }
          return prev;
        });
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

    // Lightweight fallback poll so long-running vMix/OBS Browser Sources never go stale
    const pollTimer = window.setInterval(() => {
      void fetchLatest();
    }, 5000);

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
          if (payload.eventType === 'DELETE') {
            setState(null);
            return;
          }
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
            setState(parsed);
          }
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
