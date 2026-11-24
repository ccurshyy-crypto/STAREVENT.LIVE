import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSupabaseClient,
  SUPABASE_KABADDI_SPORT,
  SUPABASE_SCOREBOARD_TABLE,
} from '../lib/supabaseClient';
import {
  computeLiveCountdown,
  createDefaultSupabaseKabaddiState,
  KabaddiBroadcastCallout,
  KabaddiCalloutType,
  KabaddiTeamSide,
  mergeKabaddiStateFromPayload,
  sanitizeKabaddiMatchId,
  SupabaseKabaddiState,
} from '../types/supabaseKabaddi';
import type { KabaddiHalf } from '../types/overlay';

export type SupabaseSyncStatus = 'connecting' | 'live' | 'permission_required' | 'error';

export const SUPABASE_RLS_SQL = `GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.live_scoreboards TO anon, authenticated;

ALTER TABLE public.live_scoreboards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public kabaddi scoreboards" ON public.live_scoreboards;
CREATE POLICY "Allow public kabaddi scoreboards"
  ON public.live_scoreboards
  FOR ALL
  TO anon, authenticated
  USING (sport = 'kabaddi')
  WITH CHECK (sport = 'kabaddi');

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_scoreboards;`;

type JsonColumnName = 'data' | 'state' | 'payload';
const CANDIDATE_JSON_COLUMNS: JsonColumnName[] = ['data', 'state', 'payload'];

function storageKey(matchId: string): string {
  return `starevent_sb_kabaddi_v1_${matchId}`;
}

function historyStorageKey(matchId: string): string {
  return `starevent_sb_kabaddi_hist_v1_${matchId}`;
}

function loadLocalSnapshot(matchId: string): SupabaseKabaddiState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(matchId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return mergeKabaddiStateFromPayload(matchId, parsed);
  } catch {
    return null;
  }
}

function saveLocalSnapshot(matchId: string, state: SupabaseKabaddiState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(matchId), JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

function loadLocalHistory(matchId: string): SupabaseKabaddiState[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(historyStorageKey(matchId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(-30).map((item) => mergeKabaddiStateFromPayload(matchId, item));
  } catch {
    return [];
  }
}

function saveLocalHistory(matchId: string, list: SupabaseKabaddiState[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(historyStorageKey(matchId), JSON.stringify(list.slice(-30)));
  } catch {
    // Ignore storage quota errors
  }
}

function extractStateFromRow(
  matchId: string,
  row: Record<string, unknown>
): SupabaseKabaddiState | null {
  if (!row || typeof row !== 'object') return null;
  if (row.sport && String(row.sport).toLowerCase() !== SUPABASE_KABADDI_SPORT) {
    return null;
  }

  for (const col of CANDIDATE_JSON_COLUMNS) {
    const candidate = row[col];
    if (candidate && typeof candidate === 'object') {
      return mergeKabaddiStateFromPayload(matchId, candidate);
    }
    if (typeof candidate === 'string' && candidate.trim().startsWith('{')) {
      try {
        return mergeKabaddiStateFromPayload(matchId, JSON.parse(candidate));
      } catch {
        // ignore invalid JSON string
      }
    }
  }

  // Fallback for flat column table schemas
  const flatMapped: Partial<SupabaseKabaddiState> = {
    matchId,
    sport: 'kabaddi',
    teamAName: typeof row.team_a_name === 'string' ? row.team_a_name : undefined,
    teamACode: typeof row.team_a_code === 'string' ? row.team_a_code : undefined,
    teamAScore: typeof row.team_a_score === 'number' ? row.team_a_score : undefined,
    teamBName: typeof row.team_b_name === 'string' ? row.team_b_name : undefined,
    teamBCode: typeof row.team_b_code === 'string' ? row.team_b_code : undefined,
    teamBScore: typeof row.team_b_score === 'number' ? row.team_b_score : undefined,
    updatedAt:
      typeof row.updated_at === 'string'
        ? Date.parse(row.updated_at) || Date.now()
        : typeof row.updated_at === 'number'
          ? row.updated_at
          : Date.now(),
  };

  return mergeKabaddiStateFromPayload(matchId, flatMapped);
}

interface UseSupabaseKabaddiRoomOptions {
  matchId: string;
  readOnly?: boolean;
}

export function useSupabaseKabaddiRoom({
  matchId: rawMatchId,
  readOnly = false,
}: UseSupabaseKabaddiRoomOptions) {
  const matchId = sanitizeKabaddiMatchId(rawMatchId);

  const [state, setState] = useState<SupabaseKabaddiState>(
    () => loadLocalSnapshot(matchId) ?? createDefaultSupabaseKabaddiState(matchId)
  );
  const [history, setHistory] = useState<SupabaseKabaddiState[]>(() =>
    readOnly ? [] : loadLocalHistory(matchId)
  );
  const [syncStatus, setSyncStatus] = useState<SupabaseSyncStatus>('connecting');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const stateRef = useRef<SupabaseKabaddiState>(state);
  stateRef.current = state;

  const detectedColumnRef = useRef<JsonColumnName>('data');
  const bcRef = useRef<BroadcastChannel | null>(null);
  const lastRemoteTsRef = useRef<number>(0);

  // Reset local view when matchId changes
  useEffect(() => {
    const cached = loadLocalSnapshot(matchId) ?? createDefaultSupabaseKabaddiState(matchId);
    setState(cached);
    stateRef.current = cached;
    lastRemoteTsRef.current = cached.updatedAt;
    if (!readOnly) {
      setHistory(loadLocalHistory(matchId));
    }
    setSyncStatus('connecting');
    setSyncError(null);
  }, [matchId, readOnly]);

  const applyIncomingState = useCallback(
    (incoming: SupabaseKabaddiState) => {
      if (incoming.updatedAt < lastRemoteTsRef.current) return;
      lastRemoteTsRef.current = incoming.updatedAt;
      stateRef.current = incoming;
      setState(incoming);
      saveLocalSnapshot(matchId, incoming);
    },
    [matchId]
  );

  // Same-origin instant mirror channel (pairs with Supabase Realtime)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(`star_kabaddi_room_${matchId}`);
    bcRef.current = channel;
    channel.onmessage = (event) => {
      const payload = event.data as { type?: string; state?: SupabaseKabaddiState } | null;
      if (payload?.type === 'state' && payload.state) {
        const merged = mergeKabaddiStateFromPayload(matchId, payload.state);
        applyIncomingState(merged);
      }
    };
    return () => {
      channel.close();
      bcRef.current = null;
    };
  }, [matchId, applyIncomingState]);

  const upsertToSupabase = useCallback(
    async (nextState: SupabaseKabaddiState) => {
      const supabase = getSupabaseClient();
      setIsSyncing(true);

      const columnsToTry: JsonColumnName[] = [
        detectedColumnRef.current,
        ...CANDIDATE_JSON_COLUMNS.filter((c) => c !== detectedColumnRef.current),
      ];

      let lastErr: { code?: string; message?: string } | null = null;

      for (const col of columnsToTry) {
        const rowPayload: Record<string, unknown> = {
          match_id: matchId,
          sport: SUPABASE_KABADDI_SPORT,
          [col]: nextState,
          updated_at: new Date(nextState.updatedAt).toISOString(),
        };

        const { error } = await supabase
          .from(SUPABASE_SCOREBOARD_TABLE)
          .upsert(rowPayload, { onConflict: 'match_id' });

        if (!error) {
          detectedColumnRef.current = col;
          setSyncStatus('live');
          setSyncError(null);
          setIsSyncing(false);
          return true;
        }

        lastErr = error;
        // If column doesn't exist (PGRST204 / 42703), try the next candidate JSON column name
        if (
          error.code === 'PGRST204' ||
          error.code === '42703' ||
          String(error.message || '').toLowerCase().includes(`'${col}'`)
        ) {
          continue;
        }
        break;
      }

      setIsSyncing(false);
      if (lastErr?.code === '42501') {
        setSyncStatus('permission_required');
        setSyncError('Supabase table permissions required for anon access on live_scoreboards.');
      } else if (lastErr) {
        setSyncStatus('error');
        setSyncError(lastErr.message || 'Unable to sync with Supabase.');
      }
      return false;
    },
    [matchId]
  );

  // Initial fetch + Supabase Realtime postgres_changes subscription filtered strictly by match_id
  useEffect(() => {
    let active = true;
    const supabase = getSupabaseClient();

    const fetchInitial = async () => {
      try {
        const { data, error } = await supabase
          .from(SUPABASE_SCOREBOARD_TABLE)
          .select('*')
          .eq('match_id', matchId)
          .eq('sport', SUPABASE_KABADDI_SPORT)
          .maybeSingle();

        if (!active) return;

        if (error) {
          if (error.code === '42501') {
            setSyncStatus('permission_required');
            setSyncError('Supabase anon SELECT/UPSERT policy needed on public.live_scoreboards.');
          } else {
            setSyncStatus('error');
            setSyncError(error.message);
          }
          return;
        }

        setSyncStatus('live');
        setSyncError(null);

        if (data && typeof data === 'object') {
          const row = data as Record<string, unknown>;
          for (const col of CANDIDATE_JSON_COLUMNS) {
            if (col in row) {
              detectedColumnRef.current = col;
              break;
            }
          }
          const parsed = extractStateFromRow(matchId, row);
          if (parsed) {
            applyIncomingState(parsed);
          }
        } else if (!readOnly) {
          // Initialize isolated match room row on Supabase when controller opens a fresh room
          const initial = stateRef.current;
          void upsertToSupabase(initial);
        }
      } catch (err) {
        if (!active) return;
        setSyncStatus('error');
        setSyncError(err instanceof Error ? err.message : 'Network error connecting to Supabase.');
      }
    };

    void fetchInitial();

    const channel = supabase
      .channel(`live_scoreboards:kabaddi:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: SUPABASE_SCOREBOARD_TABLE,
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          if (!active) return;
          const nextRow = payload.new as Record<string, unknown> | undefined;
          if (!nextRow || Object.keys(nextRow).length === 0) return;
          if (
            nextRow.sport &&
            String(nextRow.sport).toLowerCase() !== SUPABASE_KABADDI_SPORT
          ) {
            return;
          }
          const parsed = extractStateFromRow(matchId, nextRow);
          if (parsed) {
            applyIncomingState(parsed);
          }
        }
      )
      .subscribe((status) => {
        if (!active) return;
        if (status === 'SUBSCRIBED') {
          setSyncStatus((prev) => (prev === 'permission_required' ? prev : 'live'));
        }
      });

    // Periodic lightweight resync on overlay in case WebSocket briefly dropped on vMix PC
    const pollTimer = readOnly
      ? window.setInterval(() => {
          void fetchInitial();
        }, 12_000)
      : null;

    return () => {
      active = false;
      if (pollTimer) window.clearInterval(pollTimer);
      void supabase.removeChannel(channel);
    };
  }, [matchId, readOnly, applyIncomingState, upsertToSupabase]);

  // Core commit function: optimistic state + BroadcastChannel + immediate Supabase upsert
  const commitState = useCallback(
    (
      updater: (prev: SupabaseKabaddiState) => SupabaseKabaddiState,
      options: { recordHistory?: boolean; actionLabel?: string } = {}
    ) => {
      const prev = stateRef.current;
      const now = Date.now();
      const updatedRaw = updater(prev);
      const next: SupabaseKabaddiState = {
        ...updatedRaw,
        matchId,
        sport: 'kabaddi',
        updatedAt: Math.max(now, prev.updatedAt + 1),
        lastActionLabel: options.actionLabel ?? updatedRaw.lastActionLabel,
      };

      if (options.recordHistory && !readOnly) {
        setHistory((prevHist) => {
          const nextHist = [...prevHist.slice(-29), prev];
          saveLocalHistory(matchId, nextHist);
          return nextHist;
        });
      }

      lastRemoteTsRef.current = next.updatedAt;
      stateRef.current = next;
      setState(next);
      saveLocalSnapshot(matchId, next);

      try {
        bcRef.current?.postMessage({ type: 'state', state: next });
      } catch {
        // Ignore broadcast error
      }

      void upsertToSupabase(next);
    },
    [matchId, readOnly, upsertToSupabase]
  );

  // --- High-level Kabaddi Controller Actions ---

  const updateFields = useCallback(
    (patch: Partial<SupabaseKabaddiState>, recordHistory = false) => {
      commitState((prev) => ({ ...prev, ...patch }), { recordHistory });
    },
    [commitState]
  );

  const triggerCallout = useCallback(
    (
      type: KabaddiCalloutType,
      team: KabaddiTeamSide | null,
      customLabel?: string,
      sublabel?: string,
      durationMs = 4800
    ) => {
      const now = Date.now();
      commitState(
        (prev) => {
          const teamName =
            team === 'A' ? prev.teamAName : team === 'B' ? prev.teamBName : '';
          const label = customLabel || (teamName ? `${type} · ${teamName}` : type);
          const callout: KabaddiBroadcastCallout = {
            id: now,
            type,
            team,
            label,
            sublabel,
            expiresAt: now + durationMs,
          };
          return { ...prev, callout };
        },
        { recordHistory: false, actionLabel: type }
      );
    },
    [commitState]
  );

  const clearCallout = useCallback(() => {
    commitState((prev) => ({ ...prev, callout: null }), { recordHistory: false });
  }, [commitState]);

  const addRaidPoints = useCallback(
    (team: KabaddiTeamSide, points: number) => {
      const safePts = Math.max(1, Math.min(10, Math.floor(points)));
      const now = Date.now();
      commitState(
        (prev) => {
          const isA = team === 'A';
          const scorerName = isA ? prev.teamAName : prev.teamBName;
          const isSuperRaid = safePts >= 3;
          const nextAPlayers = isA
            ? Math.min(7, prev.teamAPlayersOnMat + safePts)
            : Math.max(0, prev.teamAPlayersOnMat - safePts);
          const nextBPlayers = isA
            ? Math.max(0, prev.teamBPlayersOnMat - safePts)
            : Math.min(7, prev.teamBPlayersOnMat + safePts);

          const callout: KabaddiBroadcastCallout | null = isSuperRaid
            ? {
                id: now,
                type: 'SUPER RAID',
                team,
                label: `SUPER RAID +${safePts}`,
                sublabel: scorerName,
                expiresAt: now + 5200,
              }
            : prev.callout;

          return {
            ...prev,
            teamAScore: isA ? prev.teamAScore + safePts : prev.teamAScore,
            teamARaidPoints: isA ? prev.teamARaidPoints + safePts : prev.teamARaidPoints,
            teamAPlayersOnMat: nextAPlayers,
            teamBScore: isA ? prev.teamBScore : prev.teamBScore + safePts,
            teamBRaidPoints: isA ? prev.teamBRaidPoints : prev.teamBRaidPoints + safePts,
            teamBPlayersOnMat: nextBPlayers,
            doOrDie: false,
            doOrDieTeam: null,
            callout,
          };
        },
        { recordHistory: true, actionLabel: `${team} Raid +${safePts}` }
      );
    },
    [commitState]
  );

  const addBonusPoint = useCallback(
    (team: KabaddiTeamSide) => {
      const now = Date.now();
      commitState(
        (prev) => {
          const isA = team === 'A';
          const scorerName = isA ? prev.teamAName : prev.teamBName;
          return {
            ...prev,
            teamAScore: isA ? prev.teamAScore + 1 : prev.teamAScore,
            teamABonusPoints: isA ? prev.teamABonusPoints + 1 : prev.teamABonusPoints,
            teamBScore: isA ? prev.teamBScore : prev.teamBScore + 1,
            teamBBonusPoints: isA ? prev.teamBBonusPoints : prev.teamBBonusPoints + 1,
            callout: {
              id: now,
              type: 'BONUS',
              team,
              label: 'BONUS POINT +1',
              sublabel: scorerName,
              expiresAt: now + 3500,
            },
          };
        },
        { recordHistory: true, actionLabel: `${team} Bonus +1` }
      );
    },
    [commitState]
  );

  const addTacklePoint = useCallback(
    (team: KabaddiTeamSide, isSuperTackle: boolean) => {
      const pts = isSuperTackle ? 2 : 1;
      const now = Date.now();
      commitState(
        (prev) => {
          const isA = team === 'A';
          const defenderName = isA ? prev.teamAName : prev.teamBName;
          const nextAPlayers = isA
            ? Math.min(7, prev.teamAPlayersOnMat + 1)
            : Math.max(0, prev.teamAPlayersOnMat - 1);
          const nextBPlayers = isA
            ? Math.max(0, prev.teamBPlayersOnMat - 1)
            : Math.min(7, prev.teamBPlayersOnMat + 1);

          return {
            ...prev,
            teamAScore: isA ? prev.teamAScore + pts : prev.teamAScore,
            teamATacklePoints: isA ? prev.teamATacklePoints + pts : prev.teamATacklePoints,
            teamAPlayersOnMat: nextAPlayers,
            teamBScore: isA ? prev.teamBScore : prev.teamBScore + pts,
            teamBTacklePoints: isA ? prev.teamBTacklePoints : prev.teamBTacklePoints + pts,
            teamBPlayersOnMat: nextBPlayers,
            doOrDie: false,
            doOrDieTeam: null,
            callout: isSuperTackle
              ? {
                  id: now,
                  type: 'SUPER TACKLE',
                  team,
                  label: 'SUPER TACKLE +2',
                  sublabel: defenderName,
                  expiresAt: now + 5200,
                }
              : prev.callout,
          };
        },
        {
          recordHistory: true,
          actionLabel: `${team} ${isSuperTackle ? 'Super Tackle +2' : 'Tackle +1'}`,
        }
      );
    },
    [commitState]
  );

  const triggerAllOut = useCallback(
    (scoringTeam: KabaddiTeamSide) => {
      const now = Date.now();
      commitState(
        (prev) => {
          const isA = scoringTeam === 'A';
          const scorerName = isA ? prev.teamAName : prev.teamBName;
          const victimName = isA ? prev.teamBName : prev.teamAName;
          return {
            ...prev,
            teamAScore: isA ? prev.teamAScore + 2 : prev.teamAScore,
            teamALonaPoints: isA ? prev.teamALonaPoints + 2 : prev.teamALonaPoints,
            teamBScore: isA ? prev.teamBScore : prev.teamBScore + 2,
            teamBLonaPoints: isA ? prev.teamBLonaPoints : prev.teamBLonaPoints + 2,
            // Restore all-out team back to 7 players on mat
            teamAPlayersOnMat: isA ? prev.teamAPlayersOnMat : 7,
            teamBPlayersOnMat: isA ? 7 : prev.teamBPlayersOnMat,
            doOrDie: false,
            doOrDieTeam: null,
            callout: {
              id: now,
              type: 'ALL OUT',
              team: scoringTeam,
              label: `ALL OUT! +2 LONA`,
              sublabel: `${scorerName} · ${victimName} ALL OUT`,
              expiresAt: now + 6000,
            },
          };
        },
        { recordHistory: true, actionLabel: `${scoringTeam} All Out +2` }
      );
    },
    [commitState]
  );

  const adjustScore = useCallback(
    (team: KabaddiTeamSide, delta: number) => {
      commitState(
        (prev) => ({
          ...prev,
          teamAScore: team === 'A' ? Math.max(0, prev.teamAScore + delta) : prev.teamAScore,
          teamBScore: team === 'B' ? Math.max(0, prev.teamBScore + delta) : prev.teamBScore,
        }),
        { recordHistory: true, actionLabel: `${team} Score ${delta > 0 ? `+${delta}` : delta}` }
      );
    },
    [commitState]
  );

  const setPlayersOnMat = useCallback(
    (team: KabaddiTeamSide, count: number) => {
      const safe = Math.max(0, Math.min(7, Math.floor(count)));
      commitState(
        (prev) => ({
          ...prev,
          teamAPlayersOnMat: team === 'A' ? safe : prev.teamAPlayersOnMat,
          teamBPlayersOnMat: team === 'B' ? safe : prev.teamBPlayersOnMat,
        }),
        { recordHistory: true, actionLabel: `${team} Players: ${safe}` }
      );
    },
    [commitState]
  );

  // Raid Timer controls (30s countdown)
  const startRaidTimer = useCallback(() => {
    const now = Date.now();
    commitState(
      (prev) => {
        const currentRem = computeLiveCountdown(prev.raidSeconds, prev.raidRunning, prev.raidUpdatedAt, now);
        const startFrom = currentRem <= 0 ? prev.raidDuration || 30 : currentRem;
        return {
          ...prev,
          raidSeconds: startFrom,
          raidRunning: true,
          raidUpdatedAt: now,
        };
      },
      { recordHistory: false, actionLabel: 'Raid Timer Started' }
    );
  }, [commitState]);

  const pauseRaidTimer = useCallback(() => {
    const now = Date.now();
    commitState(
      (prev) => {
        const currentRem = computeLiveCountdown(prev.raidSeconds, prev.raidRunning, prev.raidUpdatedAt, now);
        return {
          ...prev,
          raidSeconds: currentRem,
          raidRunning: false,
          raidUpdatedAt: now,
        };
      },
      { recordHistory: false, actionLabel: 'Raid Timer Paused' }
    );
  }, [commitState]);

  const resetRaidTimer = useCallback(
    (autoStart = false) => {
      const now = Date.now();
      commitState(
        (prev) => ({
          ...prev,
          raidSeconds: prev.raidDuration || 30,
          raidRunning: autoStart,
          raidUpdatedAt: now,
        }),
        { recordHistory: false, actionLabel: 'Raid Timer Reset (30s)' }
      );
    },
    [commitState]
  );

  // Match Clock controls
  const toggleMatchTimer = useCallback(() => {
    const now = Date.now();
    commitState(
      (prev) => {
        const currentRem = computeLiveCountdown(prev.matchSeconds, prev.matchRunning, prev.matchUpdatedAt, now);
        if (prev.matchRunning) {
          return { ...prev, matchSeconds: currentRem, matchRunning: false, matchUpdatedAt: now };
        }
        return {
          ...prev,
          matchSeconds: currentRem <= 0 ? 20 * 60 : currentRem,
          matchRunning: true,
          matchUpdatedAt: now,
        };
      },
      { recordHistory: false }
    );
  }, [commitState]);

  const setMatchSeconds = useCallback(
    (seconds: number) => {
      const now = Date.now();
      const clamped = Math.max(0, Math.min(7200, Math.floor(seconds)));
      commitState(
        (prev) => ({
          ...prev,
          matchSeconds: clamped,
          matchUpdatedAt: now,
        }),
        { recordHistory: false }
      );
    },
    [commitState]
  );

  const setHalf = useCallback(
    (half: KabaddiHalf) => {
      commitState((prev) => ({ ...prev, half }), {
        recordHistory: true,
        actionLabel: `Half: ${half}`,
      });
    },
    [commitState]
  );

  const setDoOrDie = useCallback(
    (team: KabaddiTeamSide | null) => {
      const now = Date.now();
      commitState(
        (prev) => {
          const isTurningOn = team !== null && (prev.doOrDieTeam !== team || !prev.doOrDie);
          const teamName = team === 'A' ? prev.teamAName : team === 'B' ? prev.teamBName : '';
          return {
            ...prev,
            doOrDie: isTurningOn,
            doOrDieTeam: isTurningOn ? team : null,
            callout: isTurningOn
              ? {
                  id: now,
                  type: 'DO OR DIE',
                  team,
                  label: 'DO OR DIE RAID',
                  sublabel: teamName,
                  expiresAt: now + 4500,
                }
              : prev.callout?.type === 'DO OR DIE'
                ? null
                : prev.callout,
          };
        },
        { recordHistory: false, actionLabel: team ? `Do-or-Die (${team})` : 'Do-or-Die Off' }
      );
    },
    [commitState]
  );

  const undoLastAction = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    const remaining = history.slice(0, -1);
    setHistory(remaining);
    saveLocalHistory(matchId, remaining);

    commitState(() => ({ ...previous, callout: null }), {
      recordHistory: false,
      actionLabel: 'Undo Applied',
    });
  }, [history, matchId, commitState]);

  const resetMatch = useCallback(() => {
    const now = Date.now();
    commitState(
      (prev) => ({
        ...createDefaultSupabaseKabaddiState(matchId),
        tournamentTitle: prev.tournamentTitle,
        subtitle: prev.subtitle,
        teamAName: prev.teamAName,
        teamACode: prev.teamACode,
        teamAColor: prev.teamAColor,
        teamBName: prev.teamBName,
        teamBCode: prev.teamBCode,
        teamBColor: prev.teamBColor,
        matchUpdatedAt: now,
        raidUpdatedAt: now,
        updatedAt: now,
      }),
      { recordHistory: true, actionLabel: 'Match Reset' }
    );
  }, [matchId, commitState]);

  return {
    matchId,
    state,
    syncStatus,
    syncError,
    isSyncing,
    canUndo: history.length > 0,
    undoCount: history.length,
    updateFields,
    addRaidPoints,
    addBonusPoint,
    addTacklePoint,
    triggerAllOut,
    adjustScore,
    setPlayersOnMat,
    startRaidTimer,
    pauseRaidTimer,
    resetRaidTimer,
    toggleMatchTimer,
    setMatchSeconds,
    setHalf,
    setDoOrDie,
    triggerCallout,
    clearCallout,
    undoLastAction,
    resetMatch,
  };
}
