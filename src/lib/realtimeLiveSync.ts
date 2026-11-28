import {
  calcRunRate,
  createInitialCricketSuiteState,
  formatOvers,
} from '../data/cricketSampleData';
import type {
  CricketMatch,
  CricketSuiteState,
  CustomThemeColors,
  OverlayControlState,
  OverlayThemeId,
  Team,
  Tournament,
} from '../types/cricketSuite';
import type {
  FirestoreConnectionStatus,
  LiveTournamentSummary,
} from './firestoreLiveSync';

const ID_CLEAN_RE = /[^a-zA-Z0-9_-]/g;

export function sanitizeLiveRoomId(raw: string): string {
  const cleaned = String(raw || '')
    .trim()
    .replace(ID_CLEAN_RE, '_')
    .slice(0, 64);
  return cleaned || 'default_room';
}

export interface CompactLiveScoreboardSnapshot {
  roomId: string;
  activeMatchId: string;
  revision: number;
  actionId: string;
  deviceId: string;
  updatedAt: number;
  runs: number;
  wickets: number;
  oversText: string;
  crr: string;
  target: number;
  themeId: OverlayThemeId;
  watermarkText?: string;
  channelTitle?: string;
  customThemeColors?: CustomThemeColors;
  matchState: CricketMatch | null;
  teams: Team[];
  overlayState: OverlayControlState;
  tournamentSummary: LiveTournamentSummary | null;
}

export interface LivePushResult {
  ok: boolean;
  revision?: number;
  deduplicated?: boolean;
  subscribers?: number;
  latencyMs?: number;
  offline?: boolean;
  status?: number;
}

export function buildCompactLiveSnapshot(params: {
  state: CricketSuiteState;
  roomId: string;
  actionId: string;
  deviceId: string;
}): CompactLiveScoreboardSnapshot {
  const cleanRoomId = sanitizeLiveRoomId(params.roomId);
  const { state } = params;
  const activeMatch =
    state.matches.find((m) => m.id === state.activeMatchId) ?? state.matches[0] ?? null;

  const playingTeams = activeMatch
    ? state.teams
        .filter((t) => t.id === activeMatch.team1Id || t.id === activeMatch.team2Id)
        .slice(0, 4)
    : state.teams.slice(0, 4);

  const inn = activeMatch
    ? activeMatch.innings[activeMatch.currentInningsIndex] ?? activeMatch.innings[0]
    : null;

  const targetVal =
    activeMatch && activeMatch.currentInningsIndex === 1 && inn
      ? Math.max(0, inn.target ?? 0)
      : 0;

  const tournament = activeMatch
    ? state.tournaments.find((t) => t.id === activeMatch.tournamentId)
    : state.tournaments[0];

  const tournamentSummary: LiveTournamentSummary | null = tournament
    ? {
        id: tournament.id,
        name: tournament.name || 'Live Tournament',
        format: tournament.matchFormat || 'T20',
        oversPerInnings: tournament.oversPerInnings || activeMatch?.oversPerInnings || 20,
        startDate: tournament.startDate || '',
        endDate: tournament.endDate || '',
        status: tournament.status || 'active',
        isActive: Boolean(tournament.isActive),
        venue: tournament.location || activeMatch?.venue || '',
      }
    : activeMatch
      ? {
          id: activeMatch.tournamentId || 'default',
          name: state.user?.channelTitle || 'Live Tournament',
          format: 'T20',
          oversPerInnings: activeMatch.oversPerInnings || 20,
          startDate: '',
          endDate: '',
          status: 'active',
          isActive: true,
          venue: activeMatch.venue || '',
        }
      : null;

  // Keep payload lean (~10-40 KB) so every ball pushes in 20-80ms across devices & OBS/vMix
  const leanMatch: CricketMatch | null = activeMatch
    ? {
        ...activeMatch,
        undoStack: Array.isArray(activeMatch.undoStack)
          ? activeMatch.undoStack.slice(-5)
          : [],
      }
    : null;

  return {
    roomId: cleanRoomId,
    activeMatchId: activeMatch?.id || '',
    revision: Math.max(1, Number(state.revision) || 1),
    actionId: params.actionId,
    deviceId: params.deviceId,
    updatedAt: Date.now(),
    runs: inn ? inn.runs : 0,
    wickets: inn ? inn.wickets : 0,
    oversText: inn ? formatOvers(inn.legalBalls) : '0.0',
    crr: inn ? calcRunRate(inn.runs, inn.legalBalls) : '0.00',
    target: targetVal,
    themeId: state.user?.userTheme || 'tata-ipl-2022',
    watermarkText: state.user?.watermarkText,
    channelTitle: state.user?.channelTitle,
    customThemeColors: state.user?.customThemeColors,
    matchState: leanMatch,
    teams: playingTeams,
    overlayState: state.overlay,
    tournamentSummary,
  };
}

export function applyCompactLiveSnapshotToSuiteState(
  prevState: CricketSuiteState | null,
  snap: CompactLiveScoreboardSnapshot,
  roomId: string
): CricketSuiteState {
  const base = prevState ?? createInitialCricketSuiteState(roomId);
  const liveMatch = snap.matchState;
  const liveTeams = Array.isArray(snap.teams) ? snap.teams : [];

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
    snap.tournamentSummary?.id &&
    !nextTournaments.some((t) => t.id === snap.tournamentSummary?.id)
  ) {
    const sum = snap.tournamentSummary;
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

  const resolvedActiveMatchId =
    snap.activeMatchId || liveMatch?.id || base.activeMatchId;

  return {
    ...base,
    version: 2,
    uid: roomId,
    revision: Math.max(base.revision || 0, snap.revision || 1),
    updatedAt: Math.max(base.updatedAt || 0, snap.updatedAt || Date.now()),
    lastModifiedByDevice: snap.deviceId || base.lastModifiedByDevice,
    activeMatchId: resolvedActiveMatchId,
    activeTournamentId: liveMatch?.tournamentId || base.activeTournamentId,
    tournaments: nextTournaments,
    teams: Array.from(nextTeamsMap.values()),
    matches: Array.from(nextMatchesMap.values()),
    user: {
      ...base.user,
      userTheme: snap.themeId || base.user.userTheme,
      watermarkText: snap.watermarkText ?? base.user.watermarkText,
      channelTitle: snap.channelTitle ?? base.user.channelTitle,
      customThemeColors: snap.customThemeColors ?? base.user.customThemeColors,
    },
    overlay: {
      ...base.overlay,
      ...(snap.overlayState || {}),
    },
  };
}

/**
 * Pushes a compact live scoreboard update to the Express Real-Time Broadcast Hub.
 * Zero popups, zero manual setup — immediately fans out via SSE to every connected
 * OBS/vMix overlay and scorer device in ~20-100ms.
 */
export async function pushRealtimeScoreboardUpdate(params: {
  roomId: string;
  state: CricketSuiteState;
  actionId: string;
  deviceId: string;
  forceReset?: boolean;
}): Promise<LivePushResult> {
  if (typeof window === 'undefined') return { ok: false };
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ok: false, offline: true };
  }

  const cleanRoomId = sanitizeLiveRoomId(params.roomId);
  const snapshot = buildCompactLiveSnapshot({
    state: params.state,
    roomId: cleanRoomId,
    actionId: params.actionId,
    deviceId: params.deviceId,
  });

  const startedAt = performance.now();
  const bodyStr = JSON.stringify({
    snapshot,
    forceReset: Boolean(params.forceReset),
  });

  try {
    const res = await fetch(`/api/live-sync/${encodeURIComponent(cleanRoomId)}`, {
      method: 'POST',
      credentials: 'include',
      keepalive: bodyStr.length < 60_000,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: bodyStr,
    });

    if (!res.ok) {
      return { ok: false, status: res.status };
    }

    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      revision?: number;
      deduplicated?: boolean;
      subscribers?: number;
    };

    return {
      ok: Boolean(data.ok),
      revision: typeof data.revision === 'number' ? data.revision : snapshot.revision,
      deduplicated: Boolean(data.deduplicated),
      subscribers: typeof data.subscribers === 'number' ? data.subscribers : 0,
      latencyMs: Math.max(1, Math.round(performance.now() - startedAt)),
    };
  } catch {
    return {
      ok: false,
      offline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    };
  }
}

export async function fetchLatestRealtimeSnapshot(
  roomId: string,
  matchId?: string
): Promise<CompactLiveScoreboardSnapshot | null> {
  if (typeof window === 'undefined') return null;
  const cleanRoomId = sanitizeLiveRoomId(roomId);
  const qs = matchId ? `?match=${encodeURIComponent(matchId)}` : '';
  try {
    const res = await fetch(
      `/api/live-sync/${encodeURIComponent(cleanRoomId)}/latest${qs}`,
      {
        method: 'GET',
        cache: 'no-store',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      }
    );
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      snapshot?: CompactLiveScoreboardSnapshot | null;
    } | null;
    return data?.ok && data.snapshot ? data.snapshot : null;
  } catch {
    return null;
  }
}

/**
 * Opens an automatic, self-healing Server-Sent Events (SSE) real-time stream
 * to `/api/live-sync/:roomId/stream`.
 *
 * Works natively in Chrome, Safari, Mobile browsers, OBS Studio Browser Source,
 * and vMix Web Browser with zero authentication popups and automatic reconnection.
 */
export function subscribeRealtimeScoreboardStream(params: {
  roomId: string;
  matchId?: string;
  onSnapshot: (snapshot: CompactLiveScoreboardSnapshot) => void;
  onStatusChange?: (status: FirestoreConnectionStatus) => void;
}): () => void {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
    return () => {};
  }

  const cleanRoomId = sanitizeLiveRoomId(params.roomId);
  const qs = params.matchId ? `?match=${encodeURIComponent(params.matchId)}` : '';
  const url = `/api/live-sync/${encodeURIComponent(cleanRoomId)}/stream${qs}`;

  let closed = false;
  let es: EventSource | null = null;
  let retryTimer: number | null = null;
  let retryDelayMs = 600;

  const clearRetry = () => {
    if (retryTimer !== null) {
      window.clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const handlePayload = (raw: string) => {
    try {
      const parsed = JSON.parse(raw) as CompactLiveScoreboardSnapshot;
      if (parsed && typeof parsed === 'object' && parsed.roomId) {
        params.onSnapshot(parsed);
      }
    } catch {
      // ignore malformed SSE frame
    }
  };

  const connect = () => {
    if (closed) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      params.onStatusChange?.('offline');
      return;
    }

    try {
      es?.close();
    } catch {
      // ignore
    }

    const source = new EventSource(url);
    es = source;

    source.addEventListener('connected', () => {
      if (closed) return;
      retryDelayMs = 600;
      params.onStatusChange?.('connected');
    });

    source.addEventListener('snapshot', (evt) => {
      if (closed) return;
      retryDelayMs = 600;
      params.onStatusChange?.('connected');
      handlePayload((evt as MessageEvent).data);
    });

    source.addEventListener('update', (evt) => {
      if (closed) return;
      retryDelayMs = 600;
      params.onStatusChange?.('connected');
      handlePayload((evt as MessageEvent).data);
    });

    source.onopen = () => {
      if (closed) return;
      retryDelayMs = 600;
      params.onStatusChange?.('connected');
    };

    source.onerror = () => {
      if (closed) return;
      try {
        source.close();
      } catch {
        // ignore
      }
      es = null;
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        params.onStatusChange?.('offline');
        return;
      }
      params.onStatusChange?.('reconnecting');
      clearRetry();
      const delay = retryDelayMs;
      retryDelayMs = Math.min(4000, Math.round(retryDelayMs * 1.6));
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        connect();
      }, delay);
    };
  };

  const onOnline = () => {
    if (closed) return;
    retryDelayMs = 600;
    params.onStatusChange?.('reconnecting');
    clearRetry();
    connect();
  };

  const onOffline = () => {
    if (closed) return;
    clearRetry();
    try {
      es?.close();
    } catch {
      // ignore
    }
    es = null;
    params.onStatusChange?.('offline');
  };

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  connect();

  return () => {
    closed = true;
    clearRetry();
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    try {
      es?.close();
    } catch {
      // ignore
    }
    es = null;
  };
}
