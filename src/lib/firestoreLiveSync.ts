import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  type FieldValue,
  type Timestamp,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  calcRunRate,
  createInitialCricketSuiteState,
  formatOvers,
} from '../data/cricketSampleData';
import type {
  CricketMatch,
  CricketSuiteState,
  OverlayControlState,
  OverlayThemeId,
  Team,
  Tournament,
} from '../types/cricketSuite';

const ID_CLEAN_RE = /[^a-zA-Z0-9_-]/g;

export function sanitizeFirestoreDocId(raw: string, maxLen = 64): string {
  const cleaned = String(raw || '')
    .trim()
    .replace(ID_CLEAN_RE, '_')
    .slice(0, maxLen);
  return cleaned || 'default_room';
}

function clampString(val: unknown, maxLen: number): string {
  return String(val ?? '').slice(0, maxLen);
}

function clampInt(val: unknown, min: number, max: number): number {
  const n = Math.floor(Number(val));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function stripUndefinedDeep<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v !== undefined) {
      out[k] = stripUndefinedDeep(v);
    }
  }
  return out as T;
}

export interface LiveTournamentSummary {
  id: string;
  name: string;
  format: string;
  oversPerInnings: number;
  startDate: string;
  endDate: string;
  status: string;
  isActive: boolean;
  venue: string;
}

export interface FirestoreLiveScoreboardDoc {
  roomId: string;
  ownerUid: string;
  activeMatchId: string;
  matchStatus: 'upcoming' | 'live' | 'completed' | 'archived';
  runs: number;
  wickets: number;
  oversText: string;
  legalBalls: number;
  extrasTotal: number;
  target: number;
  crr: string;
  rrr: string;
  strikerName: string;
  nonStrikerName: string;
  bowlerName: string;
  battingTeamCode: string;
  bowlingTeamCode: string;
  themeId: OverlayThemeId;
  revision: number;
  lastActionId: string;
  deviceId: string;
  matchState: CricketMatch;
  teams: Team[];
  overlayState: OverlayControlState;
  tournamentSummary: LiveTournamentSummary;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

export interface FirestoreLiveMatchDoc
  extends Omit<FirestoreLiveScoreboardDoc, 'activeMatchId'> {
  matchId: string;
}

export type FirestoreConnectionStatus =
  | 'connected'
  | 'syncing'
  | 'reconnecting'
  | 'offline'
  | 'auth-required';

export function generateActionId(prefix = 'act'): string {
  const rand = Math.random().toString(36).slice(2, 9);
  return sanitizeFirestoreDocId(`${prefix}_${Date.now().toString(36)}_${rand}`, 80);
}

function resolveThemeId(raw: unknown): OverlayThemeId {
  if (raw === 'worldcup' || raw === 'lightning-pro' || raw === 'tata-ipl-2022') {
    return raw;
  }
  return 'tata-ipl-2022';
}

function resolveMatchStatus(raw: unknown): 'upcoming' | 'live' | 'completed' | 'archived' {
  if (raw === 'upcoming' || raw === 'not_started') return 'upcoming';
  if (raw === 'completed') return 'completed';
  if (raw === 'archived') return 'archived';
  return 'live';
}

function findPlayerName(teams: Team[], playerId: string | null | undefined): string {
  if (!playerId) return '';
  for (const team of teams) {
    const found = team.players.find((p) => p.id === playerId);
    if (found) return found.name;
  }
  return '';
}

function buildCoreScoreboardPayload(
  state: CricketSuiteState,
  roomId: string,
  ownerUid: string,
  actionId: string,
  deviceId: string,
  revision: number
): {
  activeMatchId: string;
  core: Omit<FirestoreLiveScoreboardDoc, 'activeMatchId' | 'createdAt' | 'updatedAt'>;
} | null {
  const activeMatch =
    state.matches.find((m) => m.id === state.activeMatchId) ?? state.matches[0];
  if (!activeMatch) return null;

  const activeMatchId = sanitizeFirestoreDocId(activeMatch.id, 128);
  const inn = activeMatch.innings[activeMatch.currentInningsIndex] ?? activeMatch.innings[0];
  const playingTeams = state.teams
    .filter((t) => t.id === activeMatch.team1Id || t.id === activeMatch.team2Id)
    .slice(0, 4);

  const batTeam = playingTeams.find((t) => t.id === inn.battingTeamId) ?? playingTeams[0];
  const bowlTeam = playingTeams.find((t) => t.id === inn.bowlingTeamId) ?? playingTeams[1];

  const extrasTotal =
    (inn.extras?.wd ?? 0) +
    (inn.extras?.nb ?? 0) +
    (inn.extras?.bye ?? 0) +
    (inn.extras?.lb ?? 0) +
    (inn.extras?.penalty ?? 0);

  const crrVal = calcRunRate(inn.runs, inn.legalBalls);
  const oversLimit = inn.maxOvers || activeMatch.oversPerInnings || 20;
  const maxBalls = Math.max(1, oversLimit * 6);
  const ballsRemaining = Math.max(0, maxBalls - inn.legalBalls);
  const targetVal = activeMatch.currentInningsIndex === 1 ? Math.max(0, inn.target ?? 0) : 0;
  const runsNeeded = targetVal > 0 ? Math.max(0, targetVal - inn.runs) : 0;
  const rrrVal =
    targetVal > 0 && ballsRemaining > 0
      ? ((runsNeeded / ballsRemaining) * 6).toFixed(2)
      : '';

  const tournament = state.tournaments.find((t) => t.id === activeMatch.tournamentId);
  const tournamentSummary: LiveTournamentSummary = {
    id: clampString(tournament?.id || activeMatch.tournamentId || 'default', 128),
    name: clampString(tournament?.name || 'Live Tournament', 120),
    format: clampString(tournament?.matchFormat || 'T20', 24),
    oversPerInnings: clampInt(
      tournament?.oversPerInnings ?? activeMatch.oversPerInnings ?? 20,
      1,
      100
    ),
    startDate: clampString(tournament?.startDate || '', 32),
    endDate: clampString(tournament?.endDate || '', 32),
    status: clampString(tournament?.status || 'active', 24),
    isActive: tournament ? Boolean(tournament.isActive) : true,
    venue: clampString(tournament?.location || activeMatch.venue || '', 120),
  };

  // Keep Firestore live doc ultra-compact (<30KB) for 100-300ms broadcast sync
  // while preserving recent undo snapshots for cross-device undo support.
  const leanMatch: CricketMatch = {
    ...activeMatch,
    undoStack: Array.isArray(activeMatch.undoStack)
      ? activeMatch.undoStack.slice(-5)
      : [],
  };

  const cleanMatch = stripUndefinedDeep(leanMatch);
  const cleanTeams = stripUndefinedDeep(playingTeams);
  const cleanOverlay = stripUndefinedDeep(state.overlay);

  return {
    activeMatchId,
    core: {
      roomId: sanitizeFirestoreDocId(roomId, 64),
      ownerUid: sanitizeFirestoreDocId(ownerUid, 128),
      matchStatus: resolveMatchStatus(activeMatch.status),
      runs: clampInt(inn.runs, 0, 9999),
      wickets: clampInt(inn.wickets, 0, 10),
      oversText: clampString(formatOvers(inn.legalBalls) || '0.0', 16),
      legalBalls: clampInt(inn.legalBalls, 0, 6000),
      extrasTotal: clampInt(extrasTotal, 0, 999),
      target: clampInt(targetVal, 0, 9999),
      crr: clampString(crrVal || '0.00', 12),
      rrr: clampString(rrrVal, 12),
      strikerName: clampString(findPlayerName(playingTeams, inn.strikerId), 80),
      nonStrikerName: clampString(findPlayerName(playingTeams, inn.nonStrikerId), 80),
      bowlerName: clampString(findPlayerName(playingTeams, inn.bowlerId), 80),
      battingTeamCode: clampString(batTeam?.shortName || '', 16),
      bowlingTeamCode: clampString(bowlTeam?.shortName || '', 16),
      themeId: resolveThemeId(state.user?.userTheme),
      revision: clampInt(revision, 1, 100000000),
      lastActionId: sanitizeFirestoreDocId(actionId, 80),
      deviceId: sanitizeFirestoreDocId(deviceId, 80),
      matchState: cleanMatch,
      teams: cleanTeams,
      overlayState: cleanOverlay,
      tournamentSummary,
    },
  };
}

export interface TransactionCommitResult {
  ok: boolean;
  deduplicated?: boolean;
  committedRevision?: number;
  latencyMs?: number;
  offline?: boolean;
  permissionDenied?: boolean;
  skippedNoMatch?: boolean;
}

/**
 * Atomically commits the active match scoreboard state to Firestore inside a
 * single `runTransaction` touching both `/liveScoreboards/{roomId}` and
 * `/liveScoreboards/{roomId}/matches/{matchId}`.
 *
 * Prevents:
 * - Duplicate runs from accidental double clicks (`lastActionId` idempotency guard)
 * - Out-of-order overwrites from multiple devices (monotonic `revision`)
 * - Orphaned match docs (atomic parent + child write)
 */
export async function commitLiveScoreboardTransaction(params: {
  roomId: string;
  state: CricketSuiteState;
  actionId: string;
  deviceId: string;
}): Promise<TransactionCommitResult> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    return { ok: false, permissionDenied: true };
  }

  const cleanRoomId = sanitizeFirestoreDocId(params.roomId, 64);
  const built = buildCoreScoreboardPayload(
    params.state,
    cleanRoomId,
    currentUser.uid,
    params.actionId,
    params.deviceId,
    Math.max(1, params.state.revision || 1)
  );
  if (!built) {
    return { ok: true, skippedNoMatch: true };
  }

  const roomPath = `liveScoreboards/${cleanRoomId}`;
  const matchPath = `liveScoreboards/${cleanRoomId}/matches/${built.activeMatchId}`;
  const roomRef = doc(db, 'liveScoreboards', cleanRoomId);
  const matchRef = doc(db, 'liveScoreboards', cleanRoomId, 'matches', built.activeMatchId);
  const startedAt = performance.now();

  try {
    let deduplicated = false;
    let committedRevision = built.core.revision;

    await runTransaction(db, async (tx) => {
      const [roomSnap, matchSnap] = await Promise.all([tx.get(roomRef), tx.get(matchRef)]);

      if (roomSnap.exists()) {
        const existingData = roomSnap.data() as Partial<FirestoreLiveScoreboardDoc>;
        if (existingData.lastActionId === built.core.lastActionId) {
          deduplicated = true;
          committedRevision = Number(existingData.revision) || built.core.revision;
          return;
        }
        const existingRev = Number(existingData.revision) || 0;
        committedRevision = Math.max(existingRev + 1, built.core.revision);
      } else {
        committedRevision = Math.max(1, built.core.revision);
      }

      const nowStamp = serverTimestamp();
      const roomCreatedAt =
        roomSnap.exists() && roomSnap.data()?.createdAt
          ? roomSnap.data().createdAt
          : nowStamp;
      const matchCreatedAt =
        matchSnap.exists() && matchSnap.data()?.createdAt
          ? matchSnap.data().createdAt
          : nowStamp;

      const resolvedOwnerUid =
        roomSnap.exists() && typeof roomSnap.data()?.ownerUid === 'string'
          ? String(roomSnap.data().ownerUid)
          : currentUser.uid;

      const roomPayload: FirestoreLiveScoreboardDoc = {
        ...built.core,
        ownerUid: resolvedOwnerUid,
        activeMatchId: built.activeMatchId,
        revision: committedRevision,
        createdAt: roomCreatedAt,
        updatedAt: nowStamp,
      };

      const matchPayload: FirestoreLiveMatchDoc = {
        ...built.core,
        ownerUid: resolvedOwnerUid,
        matchId: built.activeMatchId,
        revision: committedRevision,
        createdAt: matchCreatedAt,
        updatedAt: nowStamp,
      };

      tx.set(roomRef, roomPayload);
      tx.set(matchRef, matchPayload);
    });

    return {
      ok: true,
      deduplicated,
      committedRevision,
      latencyMs: Math.max(1, Math.round(performance.now() - startedAt)),
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (
      msg.includes('offline') ||
      msg.includes('unavailable') ||
      msg.includes('failed to get document because the client is offline') ||
      msg.includes('network')
    ) {
      return { ok: false, offline: true };
    }
    if (msg.includes('permission') || msg.includes('insufficient')) {
      try {
        handleFirestoreError(error, OperationType.WRITE, `${roomPath} -> ${matchPath}`);
      } catch {
        return { ok: false, permissionDenied: true };
      }
    }
    return { ok: false };
  }
}

/**
 * Converts a lean Firestore live broadcast document into a complete
 * `CricketSuiteState` suitable for `BroadcastOverlayCanvas` or merging into
 * an already-loaded scorer workspace without touching other matches/tournaments.
 */
export function applyLiveDocToSuiteState(
  prevState: CricketSuiteState | null,
  liveDoc: FirestoreLiveScoreboardDoc | FirestoreLiveMatchDoc,
  roomId: string
): CricketSuiteState {
  const base = prevState ?? createInitialCricketSuiteState(roomId);
  const liveMatch = liveDoc.matchState;
  const liveTeams = Array.isArray(liveDoc.teams) ? liveDoc.teams : [];

  const nextTeamsMap = new Map<string, Team>();
  for (const t of base.teams) {
    if (t?.id) nextTeamsMap.set(t.id, t);
  }
  for (const t of liveTeams) {
    if (t?.id) nextTeamsMap.set(t.id, t);
  }

  const nextMatchesMap = new Map<string, CricketMatch>();
  for (const m of base.matches) {
    if (m?.id) nextMatchesMap.set(m.id, m);
  }
  if (liveMatch?.id) {
    nextMatchesMap.set(liveMatch.id, liveMatch);
  }

  const nextTournaments = [...base.tournaments];
  if (
    liveDoc.tournamentSummary?.id &&
    !nextTournaments.some((t) => t.id === liveDoc.tournamentSummary.id)
  ) {
    const sum = liveDoc.tournamentSummary;
    const synthesized: Tournament = {
      id: sum.id,
      name: sum.name || 'Live Tournament',
      shortName: (sum.name || 'LIVE').slice(0, 8).toUpperCase(),
      location: sum.venue || '',
      tournamentType: 'League + Knockout',
      ballType: 'Tennis',
      matchFormat: (sum.format as Tournament['matchFormat']) || 'T20',
      oversPerInnings: sum.oversPerInnings || 20,
      startDate: sum.startDate || '',
      endDate: sum.endDate || '',
      tournamentDates: sum.startDate ? [sum.startDate] : [],
      status: (sum.status as Tournament['status']) || 'active',
      isActive: sum.isActive ?? true,
    };
    nextTournaments.push(synthesized);
  }

  const updatedAtMs =
    liveDoc.updatedAt && typeof (liveDoc.updatedAt as Timestamp).toMillis === 'function'
      ? (liveDoc.updatedAt as Timestamp).toMillis()
      : Date.now();

  const resolvedActiveMatchId =
    'activeMatchId' in liveDoc && liveDoc.activeMatchId
      ? liveDoc.activeMatchId
      : liveMatch?.id || base.activeMatchId;

  return {
    ...base,
    version: 2,
    uid: roomId,
    revision: Math.max(base.revision || 0, liveDoc.revision || 1),
    updatedAt: Math.max(base.updatedAt || 0, updatedAtMs),
    lastModifiedByDevice: liveDoc.deviceId,
    activeMatchId: resolvedActiveMatchId,
    activeTournamentId: liveMatch?.tournamentId || base.activeTournamentId,
    tournaments: nextTournaments,
    teams: Array.from(nextTeamsMap.values()),
    matches: Array.from(nextMatchesMap.values()),
    user: {
      ...base.user,
      userTheme: resolveThemeId(liveDoc.themeId),
    },
    overlay: {
      ...base.overlay,
      ...(liveDoc.overlayState || {}),
    },
  };
}

export interface LiveSnapshotEvent {
  doc: FirestoreLiveScoreboardDoc | FirestoreLiveMatchDoc;
  fromCache: boolean;
  hasPendingWrites: boolean;
}

/**
 * Attaches a single-document real-time `onSnapshot` listener ONLY to the
 * active room document (`/liveScoreboards/{roomId}`) or specific match document
 * (`/liveScoreboards/{roomId}/matches/{matchId}`).
 *
 * Guarantees:
 * - Zero collection-wide reads
 * - Zero polling loops
 * - Automatic WebChannel reconnection after temporary internet drops
 * - Immediate cleanup on unmount or active match change
 */
export function subscribeLiveScoreboardDoc(params: {
  roomId: string;
  matchId?: string;
  onData: (event: LiveSnapshotEvent) => void;
  onStatusChange?: (status: FirestoreConnectionStatus) => void;
}): () => void {
  const cleanRoomId = sanitizeFirestoreDocId(params.roomId, 64);
  const cleanMatchId = params.matchId
    ? sanitizeFirestoreDocId(params.matchId, 128)
    : undefined;

  const targetPath = cleanMatchId
    ? `liveScoreboards/${cleanRoomId}/matches/${cleanMatchId}`
    : `liveScoreboards/${cleanRoomId}`;

  const docRef = cleanMatchId
    ? doc(db, 'liveScoreboards', cleanRoomId, 'matches', cleanMatchId)
    : doc(db, 'liveScoreboards', cleanRoomId);

  const unsubscribe = onSnapshot(
    docRef,
    { includeMetadataChanges: true },
    (snapshot) => {
      const fromCache = snapshot.metadata.fromCache;
      const hasPendingWrites = snapshot.metadata.hasPendingWrites;

      if (hasPendingWrites) {
        params.onStatusChange?.('syncing');
      } else if (fromCache) {
        params.onStatusChange?.(
          typeof navigator !== 'undefined' && !navigator.onLine
            ? 'offline'
            : 'reconnecting'
        );
      } else {
        params.onStatusChange?.('connected');
      }

      if (!snapshot.exists()) return;
      const raw = snapshot.data() as FirestoreLiveScoreboardDoc | FirestoreLiveMatchDoc;
      if (!raw || typeof raw !== 'object' || !raw.matchState) return;

      params.onData({
        doc: raw,
        fromCache,
        hasPendingWrites,
      });
    },
    (error) => {
      const msg = error?.message?.toLowerCase() || '';
      if (msg.includes('offline') || msg.includes('unavailable')) {
        params.onStatusChange?.('offline');
        return;
      }
      params.onStatusChange?.('reconnecting');
      try {
        handleFirestoreError(error, OperationType.GET, targetPath);
      } catch {
        // Logged via structured FirestoreErrorInfo without blanking live overlay
      }
    }
  );

  return unsubscribe;
}
