import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createDefaultOverlayState,
  LiveOverlayState,
  RemotePresenceInfo,
} from '../types/overlay';

export type SyncTransport = 'ws' | 'sse' | 'poll' | 'offline';

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
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9-_]/g, '').slice(0, 40);
  return cleaned || 'star-live-1';
}

function createViewerId(): string {
  return `v-${Math.random().toString(36).slice(2, 10)}`;
}

function buildWebSocketUrl(params: URLSearchParams): string | null {
  if (typeof window === 'undefined') return null;
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws/kabaddi?${params.toString()}`;
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
  const [transport, setTransport] = useState<SyncTransport>('offline');
  const [connectedDisplays, setConnectedDisplays] = useState(0);
  const [connectedControllers, setConnectedControllers] = useState(0);
  const [controllerNames, setControllerNames] = useState<string[]>([]);

  const viewerIdRef = useRef<string>(createViewerId());
  const lastVersionRef = useRef<number>(0);
  const lastLocalWriteRef = useRef<number>(0);
  const serverClockOffsetRef = useRef<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const onAuthErrorRef = useRef(onAuthError);
  onAuthErrorRef.current = onAuthError;

  // Coalesced sequential write queue + offline action queue
  const pendingPatchRef = useRef<Partial<LiveOverlayState> | null>(null);
  const pendingActionsRef = useRef<Array<{ action: string; payload?: Record<string, unknown> }>>([]);
  const inFlightRef = useRef<boolean>(false);

  const applyServerPayload = useCallback(
    (payload: {
      state?: LiveOverlayState;
      version?: number;
      serverNow?: number;
      connectedDisplays?: number;
      presence?: RemotePresenceInfo;
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
      if (payload.unchanged || !payload.state) return;

      const incomingVersion = typeof payload.version === 'number' ? payload.version : 0;
      if (incomingVersion > 0 && incomingVersion < lastVersionRef.current) {
        return;
      }

      // Avoid clobbering rapid optimistic edits while a local HTTP write is actively in flight
      if (!readOnly && (inFlightRef.current || pendingPatchRef.current)) {
        return;
      }
      if (!readOnly && Date.now() - lastLocalWriteRef.current < 150) {
        return;
      }

      if (incomingVersion > 0) {
        lastVersionRef.current = incomingVersion;
      }
      setState((prev) => ({
        ...prev,
        ...payload.state,
      }));
    },
    [readOnly]
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
            ws.send(JSON.stringify({ type: 'action', action: item.action, payload: item.payload || {} }));
          } catch {
            pendingActionsRef.current.unshift(item);
            break;
          }
        }
      }
      if (pendingPatchRef.current) {
        const nextPatch = pendingPatchRef.current;
        pendingPatchRef.current = null;
        try {
          ws.send(JSON.stringify({ type: 'patch', patch: nextPatch }));
        } catch {
          pendingPatchRef.current = nextPatch;
        }
      }
      return;
    }

    if (inFlightRef.current) return;

    const nextAction = pendingActionsRef.current.shift() ?? null;
    const nextPatch = nextAction ? null : pendingPatchRef.current;
    if (!nextAction && !nextPatch) return;
    if (nextPatch) pendingPatchRef.current = null;

    inFlightRef.current = true;

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
        ? { action: nextAction.action, payload: nextAction.payload || {} }
        : isRemote
          ? { patch: nextPatch }
          : nextPatch;

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
        if (typeof data?.serverNow === 'number') {
          serverClockOffsetRef.current = data.serverNow - Date.now();
        }
        if (typeof data?.version === 'number' && data.version > lastVersionRef.current) {
          lastVersionRef.current = data.version;
        }
        if (data?.presence) {
          setConnectedDisplays(data.presence.displays);
          setConnectedControllers(data.presence.controllers);
          setControllerNames(data.presence.controllerNames ?? []);
        } else if (typeof data?.connectedDisplays === 'number') {
          setConnectedDisplays(data.connectedDisplays);
        }
        if (data?.state && nextAction) {
          setState((prev) => ({ ...prev, ...data.state }));
        }
        setConnected(true);
      }
    } catch {
      // Keep item queued if offline so reconnect flushes automatically
      if (nextAction) {
        pendingActionsRef.current.unshift(nextAction);
      } else if (nextPatch) {
        pendingPatchRef.current = pendingPatchRef.current
          ? { ...nextPatch, ...pendingPatchRef.current }
          : nextPatch;
      }
    } finally {
      inFlightRef.current = false;
      if (pendingActionsRef.current.length > 0 || pendingPatchRef.current) {
        // Defer retry slightly if offline
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
        flushWriteQueue();
      }
    }
  }, [resolvedRole, safeRoom, remoteToken]);

  // Primary WebSocket (/ws/kabaddi) + Resilient SSE + Fast Polling + BroadcastChannel
  useEffect(() => {
    if (resolvedRole === 'controller' && !remoteToken) {
      setConnected(false);
      setTransport('offline');
      return;
    }

    let isCancelled = false;
    let ws: WebSocket | null = null;
    let wsReconnectTimer: number | null = null;
    let wsPingTimer: number | null = null;
    let eventSource: EventSource | null = null;
    let sseReconnectTimer: number | null = null;
    let pollTimer: number | null = null;
    let channel: BroadcastChannel | null = null;
    let wsOpen = false;

    lastVersionRef.current = 0;

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel(`star-event-overlay-${safeRoom}`);
        channel.onmessage = (evt) => {
          if (isCancelled) return;
          if (evt.data && evt.data.roomId === safeRoom) {
            if (!readOnly && (inFlightRef.current || pendingPatchRef.current)) return;
            setState((prev) => ({
              ...prev,
              ...evt.data,
            }));
          }
        };
      } catch {
        channel = null;
      }
    }

    const pollOnce = async (forceFull = false) => {
      if (isCancelled) return;
      // When WebSocket is actively OPEN, skip redundant frequent polling except initial fetch
      if (wsOpen && !forceFull) return;

      try {
        const params = new URLSearchParams();
        if (!forceFull && lastVersionRef.current > 0) {
          params.set('v', String(lastVersionRef.current));
        }
        if (resolvedRole === 'display') {
          params.set('viewer', viewerIdRef.current);
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
        if (!wsOpen) setTransport((curr) => (curr === 'sse' ? 'sse' : 'poll'));
        applyServerPayload(payload);
      } catch {
        if (!wsOpen && !isCancelled) {
          setTransport('offline');
        }
      }
    };

    const connectWebSocket = () => {
      if (isCancelled || typeof WebSocket === 'undefined') return;
      const params = new URLSearchParams();
      params.set('room', safeRoom);
      params.set('role', resolvedRole);
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
          setConnected(true);
          setTransport('ws');
          // Flush any actions/patches queued while offline or reconnecting
          flushWriteQueue();

          if (wsPingTimer !== null) window.clearInterval(wsPingTimer);
          wsPingTimer = window.setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(JSON.stringify({ type: 'ping' }));
              } catch {
                // ignore
              }
            }
          }, 15000);
        };

        ws.onmessage = (event) => {
          if (isCancelled) return;
          try {
            const msg = JSON.parse(event.data);
            if (msg?.type === 'auth_error') {
              onAuthErrorRef.current?.(msg.error || 'Unauthorized remote session.');
              return;
            }
            if (msg?.type === 'pong' && typeof msg.serverNow === 'number') {
              serverClockOffsetRef.current = msg.serverNow - Date.now();
              return;
            }
            if (msg?.type === 'sync') {
              setConnected(true);
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
          if (isCancelled) return;
          if (evt.code === 4001) {
            onAuthErrorRef.current?.('Remote Admin PIN session expired. Please sign in again.');
            setConnected(false);
            setTransport('offline');
            return;
          }
          setTransport((curr) => (curr === 'ws' ? 'poll' : curr));
          wsReconnectTimer = window.setTimeout(connectWebSocket, 1500);
        };

        ws.onerror = () => {
          try {
            ws?.close();
          } catch {
            // ignore
          }
        };
      } catch {
        wsReconnectTimer = window.setTimeout(connectWebSocket, 2500);
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
            if (!wsOpen) setTransport('sse');
          }
        };

        eventSource.onmessage = (event) => {
          if (isCancelled) return;
          try {
            const payload = JSON.parse(event.data);
            setConnected(true);
            applyServerPayload(payload);
          } catch {
            // ignore heartbeat
          }
        };

        eventSource.onerror = () => {
          if (isCancelled) return;
          eventSource?.close();
          eventSource = null;
          sseReconnectTimer = window.setTimeout(connectSSE, 3000);
        };
      } catch {
        // Fallback polling keeps OBS & vMix synced
      }
    };

    const handleOnline = () => {
      if (!isCancelled) {
        if (!wsOpen) connectWebSocket();
        pollOnce(true);
        flushWriteQueue();
      }
    };
    window.addEventListener('online', handleOnline);

    // 1. Immediate initial state snapshot
    pollOnce(true);
    // 2. Real-time WebSocket connection (primary)
    connectWebSocket();
    // 3. Resilient SSE stream backup
    connectSSE();
    // 4. Fast polling fallback (active only when WebSocket isn't OPEN)
    pollTimer = window.setInterval(() => {
      pollOnce(false);
    }, readOnly ? 750 : 2500);

    return () => {
      isCancelled = true;
      window.removeEventListener('online', handleOnline);
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
      }
      wsRef.current = null;
      eventSource?.close();
      channel?.close();
      if (wsReconnectTimer !== null) window.clearTimeout(wsReconnectTimer);
      if (wsPingTimer !== null) window.clearInterval(wsPingTimer);
      if (sseReconnectTimer !== null) window.clearTimeout(sseReconnectTimer);
      if (pollTimer !== null) window.clearInterval(pollTimer);
    };
  }, [safeRoom, resolvedRole, readOnly, remoteToken, deviceName, applyServerPayload, flushWriteQueue]);

  // Push partial state updates optimistically + send via WebSocket (or HTTP fallback)
  const updateState = useCallback(
    (patch: Partial<LiveOverlayState>) => {
      if (resolvedRole === 'display') return;
      const now = Date.now();
      lastLocalWriteRef.current = now;

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

      pendingPatchRef.current = pendingPatchRef.current
        ? { ...pendingPatchRef.current, ...patch }
        : { ...patch };
      flushWriteQueue();
    },
    [resolvedRole, safeRoom, flushWriteQueue]
  );

  // Send atomic Kabaddi action (raid, bonus, tackle, timeout, timer_toggle, etc.) directly to server
  const sendAction = useCallback(
    (action: string, payload: Record<string, unknown> = {}) => {
      if (resolvedRole === 'display') return;
      lastLocalWriteRef.current = Date.now();
      pendingActionsRef.current.push({ action, payload });
      flushWriteQueue();
    },
    [resolvedRole, flushWriteQueue]
  );

  const getServerNow = useCallback(() => Date.now() + serverClockOffsetRef.current, []);

  return {
    state,
    updateState,
    sendAction,
    connected,
    transport,
    connectedDisplays,
    connectedControllers,
    controllerNames,
    roomId: safeRoom,
    getServerNow,
  };
}
