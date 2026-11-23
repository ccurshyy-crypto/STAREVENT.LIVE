import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createDefaultOverlayState,
  LiveOverlayState,
  RemoteHistoryInfo,
  RemotePresenceInfo,
} from '../types/overlay';

export type SyncTransport = 'ws' | 'firebase' | 'sse' | 'poll' | 'offline';
export type ConnectionStatus = 'live' | 'reconnecting' | 'offline';

interface UseOverlaySyncOptions {
  roomId: string;
  initialOverrides?: Partial<LiveOverlayState>;
  /** Set true inside OBS / vMix output view for display-role WebSocket + zero-skew sync */
  readOnly?: boolean;
  /** Role on WebSocket server: 'display' (vMix/OBS), 'studio' (PC desk), 'controller' (PIN remote) */
  role?: 'display' | 'studio' | 'controller';
  /** In-memory Bearer session token for PIN-protected remote controllers */
  remoteToken?: string;
  /** Friendly device label shown in live presence list */
  deviceName?: string;
  /** Called if server rejects or expires the remote controller session */
  onAuthError?: (message: string) => void;
}

export function sanitizeRoomIdClient(raw: string): string {
  const cleaned = String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '')
    .slice(0, 40);
  return cleaned || 'star-live-1';
}

function createUniqueClientId(): string {
  return `cli-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getClientFirebaseDbUrl(): string | null {
  try {
    const raw = String(
      (import.meta as unknown as { env?: Record<string, string | undefined> }).env
        ?.VITE_FIREBASE_DATABASE_URL || ''
    ).trim();
    if (!raw || !/^https:\/\/.+\.firebaseio\.com|^https:\/\/.+\.firebasedatabase\.app/i.test(raw)) {
      return null;
    }
    return raw.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

function buildWebSocketUrl(params: URLSearchParams): string | null {
  if (typeof window === 'undefined') return null;
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws/kabaddi?${params.toString()}`;
}

interface PendingActionItem {
  action: string;
  payload: Record<string, unknown>;
  txId: string;
}

interface PendingPatchItem {
  patch: Partial<LiveOverlayState>;
  txId: string;
}

export function useOverlaySync({
  roomId,
  initialOverrides,
  readOnly = false,
  role,
  remoteToken,
  deviceName,
  onAuthError,
}: UseOverlaySyncOptions) {
  const safeRoom = sanitizeRoomIdClient(roomId);
  const resolvedRole: 'display' | 'studio' | 'controller' =
    role ?? (readOnly ? 'display' : 'studio');

  const [state, setState] = useState<LiveOverlayState>(() => ({
    ...createDefaultOverlayState(safeRoom),
    ...initialOverrides,
  }));
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('reconnecting');
  const [transport, setTransport] = useState<SyncTransport>('offline');
  const [connectedDisplays, setConnectedDisplays] = useState(0);
  const [connectedControllers, setConnectedControllers] = useState(0);
  const [controllerNames, setControllerNames] = useState<string[]>([]);
  const [history, setHistory] = useState<RemoteHistoryInfo>({
    canUndo: false,
    canRedo: false,
    undoCount: 0,
    redoCount: 0,
  });

  const clientIdRef = useRef<string>(createUniqueClientId());
  const txSeqRef = useRef<number>(0);
  const lastVersionRef = useRef<number>(0);
  const lastBootIdRef = useRef<string>('');
  const lastUpdatedAtRef = useRef<number>(0);
  const serverClockOffsetRef = useRef<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const stateRef = useRef<LiveOverlayState>(state);
  stateRef.current = state;

  const onAuthErrorRef = useRef(onAuthError);
  onAuthErrorRef.current = onAuthError;

  // Coalesced sequential write queue + offline action queue (with unique txId per item)
  const pendingPatchRef = useRef<PendingPatchItem | null>(null);
  const pendingActionsRef = useRef<PendingActionItem[]>([]);
  const inFlightHttpRef = useRef<boolean>(false);

  const nextTxId = useCallback(() => {
    txSeqRef.current += 1;
    return `${clientIdRef.current}-${txSeqRef.current}`;
  }, []);

  const applyServerPayload = useCallback(
    (payload: {
      state?: LiveOverlayState;
      version?: number;
      serverNow?: number;
      serverBootId?: string;
      txId?: string;
      sourceClientId?: string;
      connectedDisplays?: number;
      presence?: RemotePresenceInfo;
      history?: RemoteHistoryInfo;
      unchanged?: boolean;
    }) => {
      if (typeof payload.serverNow === 'number') {
        serverClockOffsetRef.current = payload.serverNow - Date.now();
      }
      if (payload.presence) {
        setConnectedDisplays(payload.presence.displays);
        setConnectedControllers(payload.presence.controllers);
        setControllerNames(payload.presence.controllerNames ?? []);
      } else if (typeof payload.connectedDisplays === 'number') {
        setConnectedDisplays(payload.connectedDisplays);
      }
      if (payload.history) {
        setHistory(payload.history);
      }

      const incomingBootId = typeof payload.serverBootId === 'string' ? payload.serverBootId : '';
      const bootChanged = Boolean(
        incomingBootId && lastBootIdRef.current && incomingBootId !== lastBootIdRef.current
      );

      if (payload.unchanged || !payload.state) {
        if (incomingBootId && !lastBootIdRef.current) {
          lastBootIdRef.current = incomingBootId;
        }
        return;
      }

      const incomingVersion = typeof payload.version === 'number' ? payload.version : 0;
      const incomingUpdatedAt =
        typeof payload.state.updatedAt === 'number' ? payload.state.updatedAt : 0;

      // Never allow an older timestamp (including from another Cloud Run instance or cold restart)
      // to roll back a newer score or state.
      if (
        incomingUpdatedAt > 0 &&
        lastUpdatedAtRef.current > 0 &&
        incomingUpdatedAt < lastUpdatedAtRef.current
      ) {
        return;
      }

      // On controllers/studio, never overwrite local state while manual actions or patches are queued/in-flight
      if (
        !readOnly &&
        (pendingActionsRef.current.length > 0 ||
          pendingPatchRef.current !== null ||
          inFlightHttpRef.current)
      ) {
        if (!bootChanged && incomingVersion > lastVersionRef.current) {
          lastVersionRef.current = incomingVersion;
        }
        return;
      }

      // Drop stale or duplicate versions from the same server instance
      if (
        !bootChanged &&
        incomingVersion > 0 &&
        lastVersionRef.current > 0 &&
        incomingVersion <= lastVersionRef.current
      ) {
        return;
      }

      // If another instance booted with a default/older room state (same or lower timestamp), ignore it
      if (bootChanged && lastUpdatedAtRef.current > 0 && incomingUpdatedAt <= lastUpdatedAtRef.current) {
        return;
      }

      if (incomingBootId) {
        lastBootIdRef.current = incomingBootId;
      }
      if (incomingVersion > 0) {
        lastVersionRef.current = incomingVersion;
      }
      if (incomingUpdatedAt > 0) {
        lastUpdatedAtRef.current = incomingUpdatedAt;
      }

      setState((prev) => ({
        ...prev,
        ...payload.state,
        roomId: safeRoom,
      }));
    },
    [readOnly, safeRoom]
  );

  // Mirror state directly to Firebase Realtime Database when VITE_FIREBASE_DATABASE_URL is configured
  const pushFirebaseFallback = useCallback(
    async (nextState: LiveOverlayState, version: number) => {
      const fbUrl = getClientFirebaseDbUrl();
      if (!fbUrl) return;
      try {
        await fetch(`${fbUrl}/kabaddi_matches/${encodeURIComponent(safeRoom)}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            state: nextState,
            version,
            serverBootId: lastBootIdRef.current || 'firebase',
            updatedAt: nextState.updatedAt,
          }),
        });
      } catch {
        // Non-fatal
      }
    },
    [safeRoom]
  );

  // Flush queued patches & actions via open WebSocket OR authenticated HTTP endpoint
  const flushWriteQueue = useCallback(async () => {
    if (resolvedRole === 'display') return;

    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      if (pendingActionsRef.current.length > 0) {
        const queued = [...pendingActionsRef.current];
        pendingActionsRef.current = [];
        for (const item of queued) {
          try {
            ws.send(
              JSON.stringify({
                type: 'action',
                action: item.action,
                payload: item.payload,
                txId: item.txId,
                clientId: clientIdRef.current,
              })
            );
          } catch {
            pendingActionsRef.current.unshift(item);
            break;
          }
        }
      }
      if (pendingPatchRef.current) {
        const item = pendingPatchRef.current;
        pendingPatchRef.current = null;
        try {
          ws.send(
            JSON.stringify({
              type: 'patch',
              patch: item.patch,
              txId: item.txId,
              clientId: clientIdRef.current,
            })
          );
        } catch {
          pendingPatchRef.current = item;
        }
      }
      return;
    }

    if (inFlightHttpRef.current) return;

    const nextAction = pendingActionsRef.current.shift() ?? null;
    const nextPatch = nextAction ? null : pendingPatchRef.current;
    if (!nextAction && !nextPatch) return;
    if (nextPatch) pendingPatchRef.current = null;

    inFlightHttpRef.current = true;

    try {
      const isRemote = resolvedRole === 'controller';
      const url = isRemote
        ? `/api/remote/match/${encodeURIComponent(safeRoom)}/update`
        : `/api/overlay/${encodeURIComponent(safeRoom)}`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (isRemote && remoteToken) {
        headers.Authorization = `Bearer ${remoteToken}`;
      }

      const body = nextAction
        ? {
            action: nextAction.action,
            payload: nextAction.payload,
            txId: nextAction.txId,
            clientId: clientIdRef.current,
          }
        : nextPatch
          ? {
              patch: nextPatch.patch,
              txId: nextPatch.txId,
              clientId: clientIdRef.current,
            }
          : null;

      if (!body) return;

      const res = await fetch(url, {
        method: 'POST',
        headers,
        cache: 'no-store',
        body: JSON.stringify(body),
      });

      if (res.status === 401 && isRemote) {
        onAuthErrorRef.current?.('Remote PIN session expired. Please sign in again.');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setConnected(true);
        setConnectionStatus('live');
        applyServerPayload(data);
        if (data?.state) {
          void pushFirebaseFallback(data.state, Number(data.version || lastVersionRef.current + 1));
        }
      } else {
        // If backend HTTP returned an error, still push to Firebase RTDB if configured
        const fbUrl = getClientFirebaseDbUrl();
        if (fbUrl && nextPatch) {
          void pushFirebaseFallback(stateRef.current, lastVersionRef.current + 1);
        } else {
          // Re-queue for retry on transient error
          if (nextAction) {
            pendingActionsRef.current.unshift(nextAction);
          } else if (nextPatch) {
            pendingPatchRef.current = pendingPatchRef.current
              ? {
                  patch: { ...nextPatch.patch, ...pendingPatchRef.current.patch },
                  txId: pendingPatchRef.current.txId,
                }
              : nextPatch;
          }
        }
      }
    } catch {
      // Offline — keep item queued with its original txId so reconnect flushes without duplicating
      if (nextAction) {
        pendingActionsRef.current.unshift(nextAction);
      } else if (nextPatch) {
        pendingPatchRef.current = pendingPatchRef.current
          ? {
              patch: { ...nextPatch.patch, ...pendingPatchRef.current.patch },
              txId: pendingPatchRef.current.txId,
            }
          : nextPatch;
      }
      setConnectionStatus('reconnecting');
    } finally {
      inFlightHttpRef.current = false;
      if (pendingActionsRef.current.length > 0 || pendingPatchRef.current) {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
        window.setTimeout(() => {
          void flushWriteQueue();
        }, 250);
      }
    }
  }, [resolvedRole, safeRoom, remoteToken, applyServerPayload, pushFirebaseFallback]);

  // Primary WebSocket (/ws/kabaddi) + Optional Firebase RTDB SSE + Server SSE + Resilient Safety Polling
  useEffect(() => {
    if (resolvedRole === 'controller' && !remoteToken) {
      setConnected(false);
      setConnectionStatus('offline');
      setTransport('offline');
      return;
    }

    let isCancelled = false;
    let ws: WebSocket | null = null;
    let wsReconnectTimer: number | null = null;
    let wsPingTimer: number | null = null;
    let wsPongTimeout: number | null = null;
    let wsBackoffMs = 1000;
    let eventSource: EventSource | null = null;
    let sseReconnectTimer: number | null = null;
    let fbSource: EventSource | null = null;
    let fbReconnectTimer: number | null = null;
    let pollTimer: number | null = null;
    let safetyPollTimer: number | null = null;
    let channel: BroadcastChannel | null = null;
    let wsOpen = false;
    let fbOpen = false;

    lastVersionRef.current = 0;
    lastBootIdRef.current = '';
    lastUpdatedAtRef.current = 0;
    setConnectionStatus('reconnecting');

    // Same-browser tab mirror (bonus zero-latency preview; never the sole sync layer)
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel(`star-event-overlay-${safeRoom}`);
        channel.onmessage = (evt) => {
          if (isCancelled) return;
          const incoming = evt.data as LiveOverlayState | undefined;
          if (incoming && incoming.roomId === safeRoom) {
            if (
              !readOnly &&
              (pendingPatchRef.current !== null ||
                pendingActionsRef.current.length > 0 ||
                inFlightHttpRef.current)
            ) {
              return;
            }
            if (incoming.updatedAt && incoming.updatedAt <= lastUpdatedAtRef.current) return;
            if (incoming.updatedAt) lastUpdatedAtRef.current = incoming.updatedAt;
            setState((prev) => ({
              ...prev,
              ...incoming,
            }));
          }
        };
      } catch {
        channel = null;
      }
    }

    const pollOnce = async (forceFull = false) => {
      if (isCancelled) return;
      if (wsOpen && !forceFull) return;

      try {
        const params = new URLSearchParams();
        if (!forceFull && lastVersionRef.current > 0) {
          params.set('v', String(lastVersionRef.current));
        }
        if (lastBootIdRef.current) {
          params.set('boot', lastBootIdRef.current);
        }
        if (resolvedRole === 'display') {
          params.set('viewer', clientIdRef.current);
        }
        params.set('_t', String(Date.now()));

        const res = await fetch(
          `/api/overlay/${encodeURIComponent(safeRoom)}?${params.toString()}`,
          { cache: 'no-store' }
        );
        if (!res.ok || isCancelled) return;
        const payload = await res.json();
        if (isCancelled) return;
        setConnected(true);
        setConnectionStatus('live');
        if (!wsOpen && !fbOpen) setTransport((curr) => (curr === 'sse' ? 'sse' : 'poll'));
        applyServerPayload(payload);
      } catch {
        if (!wsOpen && !fbOpen && !isCancelled) {
          setConnectionStatus('reconnecting');
          setTransport('offline');
        }
      }
    };

    const scheduleWsReconnect = () => {
      if (isCancelled || wsReconnectTimer !== null) return;
      const delay = wsBackoffMs;
      wsBackoffMs = Math.min(5000, Math.round(wsBackoffMs * 1.5));
      wsReconnectTimer = window.setTimeout(() => {
        wsReconnectTimer = null;
        connectWebSocket();
      }, delay);
    };

    const connectWebSocket = () => {
      if (isCancelled || typeof WebSocket === 'undefined') return;
      if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
        return;
      }

      const params = new URLSearchParams();
      params.set('room', safeRoom);
      params.set('role', resolvedRole);
      params.set('clientId', clientIdRef.current);
      if (remoteToken) params.set('token', remoteToken);
      if (deviceName) params.set('device', deviceName);

      const wsUrl = buildWebSocketUrl(params);
      if (!wsUrl) return;

      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isCancelled) return;
          wsOpen = true;
          wsBackoffMs = 1000;
          setConnected(true);
          setConnectionStatus('live');
          setTransport('ws');

          // Request authoritative state immediately on every connect/reconnect + flush offline queue
          try {
            ws?.send(JSON.stringify({ type: 'request_sync' }));
          } catch {
            // ignore
          }
          void flushWriteQueue();

          if (wsPingTimer !== null) window.clearInterval(wsPingTimer);
          wsPingTimer = window.setInterval(() => {
            if (!ws || ws.readyState !== WebSocket.OPEN) return;
            try {
              ws.send(JSON.stringify({ type: 'ping' }));
              // Watchdog: if vMix / NAT silently dropped the socket without onclose, force reconnect in 8s
              if (wsPongTimeout !== null) window.clearTimeout(wsPongTimeout);
              wsPongTimeout = window.setTimeout(() => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                  try {
                    ws.close();
                  } catch {
                    // ignore
                  }
                }
              }, 8000);
            } catch {
              // ignore
            }
          }, 10000);
        };

        ws.onmessage = (event) => {
          if (isCancelled) return;
          try {
            const msg = JSON.parse(event.data);
            if (msg?.type === 'auth_error') {
              onAuthErrorRef.current?.(msg.error || 'Unauthorized remote session.');
              return;
            }
            if (msg?.type === 'pong') {
              if (wsPongTimeout !== null) {
                window.clearTimeout(wsPongTimeout);
                wsPongTimeout = null;
              }
              if (typeof msg.serverNow === 'number') {
                serverClockOffsetRef.current = msg.serverNow - Date.now();
              }
              // Self-heal immediately if server reports a newer version or new boot ID
              const remoteVer = typeof msg.version === 'number' ? msg.version : 0;
              const remoteBoot = typeof msg.serverBootId === 'string' ? msg.serverBootId : '';
              if (
                (remoteBoot && lastBootIdRef.current && remoteBoot !== lastBootIdRef.current) ||
                (remoteVer > 0 && remoteVer > lastVersionRef.current)
              ) {
                try {
                  ws?.send(JSON.stringify({ type: 'request_sync' }));
                } catch {
                  // ignore
                }
              }
              return;
            }
            if (msg?.type === 'sync') {
              if (wsPongTimeout !== null) {
                window.clearTimeout(wsPongTimeout);
                wsPongTimeout = null;
              }
              setConnected(true);
              setConnectionStatus('live');
              setTransport('ws');
              applyServerPayload(msg);
            }
          } catch {
            // ignore malformed frame
          }
        };

        ws.onclose = (evt) => {
          wsOpen = false;
          if (wsRef.current === ws) wsRef.current = null;
          if (wsPingTimer !== null) {
            window.clearInterval(wsPingTimer);
            wsPingTimer = null;
          }
          if (wsPongTimeout !== null) {
            window.clearTimeout(wsPongTimeout);
            wsPongTimeout = null;
          }
          if (isCancelled) return;
          if (evt.code === 4001) {
            onAuthErrorRef.current?.('Remote Admin PIN session expired. Please sign in again.');
            setConnected(false);
            setConnectionStatus('offline');
            setTransport('offline');
            return;
          }
          setConnectionStatus(fbOpen ? 'live' : 'reconnecting');
          setTransport((curr) => (curr === 'ws' ? (fbOpen ? 'firebase' : 'poll') : curr));
          // Immediately fall back to HTTP snapshot while WS reconnects
          void pollOnce(true);
          scheduleWsReconnect();
        };

        ws.onerror = () => {
          try {
            ws?.close();
          } catch {
            // ignore
          }
        };
      } catch {
        scheduleWsReconnect();
      }
    };

    // Optional native Firebase Realtime Database real-time SSE listener (ideal for Vercel serverless!)
    const connectFirebaseStream = () => {
      const fbUrl = getClientFirebaseDbUrl();
      if (!fbUrl || isCancelled || typeof EventSource === 'undefined') return;
      try {
        fbSource = new EventSource(`${fbUrl}/kabaddi_matches/${encodeURIComponent(safeRoom)}.json`);
        const handleFbEvent = (evt: MessageEvent) => {
          if (isCancelled) return;
          try {
            const parsed = JSON.parse(evt.data);
            const record = parsed?.data;
            if (record && record.state && typeof record.state === 'object') {
              fbOpen = true;
              setConnected(true);
              setConnectionStatus('live');
              if (!wsOpen) setTransport('firebase');
              applyServerPayload({
                state: record.state,
                version: typeof record.version === 'number' ? record.version : undefined,
                serverBootId: typeof record.serverBootId === 'string' ? record.serverBootId : 'firebase',
              });
            }
          } catch {
            // ignore keep-alive
          }
        };
        fbSource.addEventListener('put', handleFbEvent as EventListener);
        fbSource.addEventListener('patch', handleFbEvent as EventListener);
        fbSource.onopen = () => {
          if (!isCancelled) {
            fbOpen = true;
            setConnected(true);
            setConnectionStatus('live');
            if (!wsOpen) setTransport('firebase');
          }
        };
        fbSource.onerror = () => {
          fbOpen = false;
          if (isCancelled) return;
          fbSource?.close();
          fbSource = null;
          fbReconnectTimer = window.setTimeout(connectFirebaseStream, 3000);
        };
      } catch {
        // non-fatal
      }
    };

    const connectSSE = () => {
      if (isCancelled || typeof EventSource === 'undefined') return;
      try {
        eventSource = new EventSource(
          `/api/overlay/${encodeURIComponent(safeRoom)}/stream?_t=${Date.now()}`
        );

        eventSource.onopen = () => {
          if (!isCancelled) {
            setConnected(true);
            setConnectionStatus('live');
            if (!wsOpen && !fbOpen) setTransport('sse');
          }
        };

        eventSource.onmessage = (event) => {
          if (isCancelled) return;
          try {
            const payload = JSON.parse(event.data);
            setConnected(true);
            setConnectionStatus('live');
            applyServerPayload(payload);
          } catch {
            // ignore heartbeat
          }
        };

        eventSource.onerror = () => {
          if (isCancelled) return;
          eventSource?.close();
          eventSource = null;
          sseReconnectTimer = window.setTimeout(connectSSE, 4000);
        };
      } catch {
        // Fallback polling keeps OBS & vMix synced
      }
    };

    const handleOnline = () => {
      if (!isCancelled) {
        wsBackoffMs = 1000;
        if (!wsOpen) connectWebSocket();
        void pollOnce(true);
        void flushWriteQueue();
      }
    };
    const handleOffline = () => {
      if (!isCancelled) {
        setConnectionStatus('offline');
      }
    };
    const handleVisibility = () => {
      if (!isCancelled && document.visibilityState === 'visible') {
        if (!wsOpen) connectWebSocket();
        void pollOnce(true);
        void flushWriteQueue();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibility);

    // 1. Immediate initial state snapshot
    void pollOnce(true);
    // 2. Real-time WebSocket connection (primary)
    connectWebSocket();
    // 3. Optional Firebase RTDB cloud stream (if VITE_FIREBASE_DATABASE_URL is set)
    connectFirebaseStream();
    // 4. Resilient SSE stream backup
    connectSSE();
    // 5. Fast polling fallback when WebSocket isn't OPEN (650ms for vMix/OBS displays!)
    pollTimer = window.setInterval(() => {
      void pollOnce(false);
    }, readOnly ? 650 : 2000);
    // 6. Low-overhead safety reconcile every 5s on displays even when WS is open (guarantees zero drift)
    if (readOnly) {
      safetyPollTimer = window.setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ type: 'request_sync' }));
          } catch {
            void pollOnce(true);
          }
        } else {
          void pollOnce(false);
        }
      }, 5000);
    }

    return () => {
      isCancelled = true;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
      }
      wsRef.current = null;
      eventSource?.close();
      fbSource?.close();
      channel?.close();
      if (wsReconnectTimer !== null) window.clearTimeout(wsReconnectTimer);
      if (wsPingTimer !== null) window.clearInterval(wsPingTimer);
      if (wsPongTimeout !== null) window.clearTimeout(wsPongTimeout);
      if (sseReconnectTimer !== null) window.clearTimeout(sseReconnectTimer);
      if (fbReconnectTimer !== null) window.clearTimeout(fbReconnectTimer);
      if (pollTimer !== null) window.clearInterval(pollTimer);
      if (safetyPollTimer !== null) window.clearInterval(safetyPollTimer);
    };
  }, [safeRoom, resolvedRole, readOnly, remoteToken, deviceName, applyServerPayload, flushWriteQueue]);

  // Push partial state updates optimistically + send via WebSocket (or HTTP fallback) with unique txId
  const updateState = useCallback(
    (patch: Partial<LiveOverlayState>) => {
      if (resolvedRole === 'display') return;
      const now = Date.now();
      lastUpdatedAtRef.current = now;

      setState((prev) => {
        const next: LiveOverlayState = {
          ...prev,
          ...patch,
          roomId: safeRoom,
          updatedAt: now,
        };

        if (typeof BroadcastChannel !== 'undefined') {
          try {
            const ch = new BroadcastChannel(`star-event-overlay-${safeRoom}`);
            ch.postMessage(next);
            ch.close();
          } catch {
            // ignore
          }
        }

        return next;
      });

      const txId = nextTxId();
      pendingPatchRef.current = pendingPatchRef.current
        ? {
            patch: { ...pendingPatchRef.current.patch, ...patch },
            txId,
          }
        : { patch: { ...patch }, txId };
      void flushWriteQueue();
    },
    [resolvedRole, safeRoom, flushWriteQueue, nextTxId]
  );

  // Send atomic Kabaddi action (raid, bonus, lona, tackle, players_on_mat, card, timeout, timer_toggle, etc.)
  const sendAction = useCallback(
    (action: string, payload: Record<string, unknown> = {}) => {
      if (resolvedRole === 'display') return;
      const txId = nextTxId();
      pendingActionsRef.current.push({ action, payload, txId });
      void flushWriteQueue();
    },
    [resolvedRole, flushWriteQueue, nextTxId]
  );

  const getServerNow = useCallback(() => Date.now() + serverClockOffsetRef.current, []);

  return {
    state,
    updateState,
    sendAction,
    connected,
    connectionStatus,
    transport,
    connectedDisplays,
    connectedControllers,
    controllerNames,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    undoCount: history.undoCount,
    redoCount: history.redoCount,
    roomId: safeRoom,
    getServerNow,
  };
}
