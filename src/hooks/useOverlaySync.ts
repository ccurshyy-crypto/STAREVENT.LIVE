import { useCallback, useEffect, useRef, useState } from 'react';
import { createDefaultOverlayState, LiveOverlayState } from '../types/overlay';

interface UseOverlaySyncOptions {
  roomId: string;
  initialOverrides?: Partial<LiveOverlayState>;
  /** Set true inside OBS / vMix output view for aggressive fast-polling + zero-skew sync */
  readOnly?: boolean;
}

export function sanitizeRoomIdClient(raw: string): string {
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9-_]/g, '').slice(0, 40);
  return cleaned || 'star-live-1';
}

function createViewerId(): string {
  return `v-${Math.random().toString(36).slice(2, 10)}`;
}

export function useOverlaySync({
  roomId,
  initialOverrides,
  readOnly = false,
}: UseOverlaySyncOptions) {
  const safeRoom = sanitizeRoomIdClient(roomId);
  const [state, setState] = useState<LiveOverlayState>(() => ({
    ...createDefaultOverlayState(safeRoom),
    ...initialOverrides,
  }));
  const [connected, setConnected] = useState(false);
  const [connectedDisplays, setConnectedDisplays] = useState(1);

  const viewerIdRef = useRef<string>(createViewerId());
  const lastVersionRef = useRef<number>(0);
  const lastLocalWriteRef = useRef<number>(0);
  const serverClockOffsetRef = useRef<number>(0);

  // Coalesced sequential write queue so rapid +1/+1 clicks or typing never arrive out of order
  const pendingPatchRef = useRef<Partial<LiveOverlayState> | null>(null);
  const inFlightRef = useRef<boolean>(false);

  const applyServerPayload = useCallback(
    (payload: {
      state?: LiveOverlayState;
      version?: number;
      serverNow?: number;
      connectedDisplays?: number;
      unchanged?: boolean;
    }) => {
      if (typeof payload.serverNow === 'number') {
        serverClockOffsetRef.current = payload.serverNow - Date.now();
      }
      if (typeof payload.connectedDisplays === 'number') {
        setConnectedDisplays(payload.connectedDisplays);
      }
      if (payload.unchanged || !payload.state) return;

      const incomingVersion = typeof payload.version === 'number' ? payload.version : 0;
      if (incomingVersion > 0 && incomingVersion < lastVersionRef.current) {
        return;
      }

      // In controller mode, avoid clobbering optimistic local edits while a write is actively in flight
      if (!readOnly && (inFlightRef.current || pendingPatchRef.current)) {
        return;
      }
      if (!readOnly && Date.now() - lastLocalWriteRef.current < 180) {
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

  // Subscribe via Initial Fetch + SSE Stream + Fast No-Cache Polling + BroadcastChannel
  useEffect(() => {
    let isCancelled = false;
    let eventSource: EventSource | null = null;
    let reconnectTimer: number | null = null;
    let pollTimer: number | null = null;
    let channel: BroadcastChannel | null = null;

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
      try {
        const params = new URLSearchParams();
        if (!forceFull && lastVersionRef.current > 0) {
          params.set('v', String(lastVersionRef.current));
        }
        if (readOnly) {
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
        applyServerPayload(payload);
      } catch {
        // Keep trying on next poll interval
      }
    };

    const connectSSE = () => {
      if (isCancelled || typeof EventSource === 'undefined') return;
      try {
        eventSource = new EventSource(
          `/api/overlay/${encodeURIComponent(safeRoom)}/stream?_t=${Date.now()}`
        );

        eventSource.onopen = () => {
          if (!isCancelled) setConnected(true);
        };

        eventSource.onmessage = (event) => {
          if (isCancelled) return;
          try {
            const payload = JSON.parse(event.data);
            setConnected(true);
            applyServerPayload(payload);
          } catch {
            // ignore malformed heartbeat
          }
        };

        eventSource.onerror = () => {
          if (isCancelled) return;
          eventSource?.close();
          eventSource = null;
          reconnectTimer = window.setTimeout(connectSSE, 2000);
        };
      } catch {
        // Fallback polling keeps OBS & vMix synced even without EventSource
      }
    };

    // 1. Immediate full fetch so OBS/vMix shows exact live score on first frame
    pollOnce(true);
    // 2. Live SSE push stream for instant <50ms updates
    connectSSE();
    // 3. Rock-solid fast no-cache polling fallback (650ms in OBS/vMix, 2500ms in Studio)
    pollTimer = window.setInterval(() => {
      pollOnce(false);
    }, readOnly ? 650 : 2500);

    return () => {
      isCancelled = true;
      eventSource?.close();
      channel?.close();
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
      if (pollTimer !== null) {
        window.clearInterval(pollTimer);
      }
    };
  }, [safeRoom, readOnly, applyServerPayload]);

  const flushWriteQueue = useCallback(async () => {
    if (inFlightRef.current) return;
    const nextPatch = pendingPatchRef.current;
    if (!nextPatch) return;

    pendingPatchRef.current = null;
    inFlightRef.current = true;

    try {
      const res = await fetch(`/api/overlay/${encodeURIComponent(safeRoom)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(nextPatch),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data?.serverNow === 'number') {
          serverClockOffsetRef.current = data.serverNow - Date.now();
        }
        if (typeof data?.version === 'number' && data.version > lastVersionRef.current) {
          lastVersionRef.current = data.version;
        }
        if (typeof data?.connectedDisplays === 'number') {
          setConnectedDisplays(data.connectedDisplays);
        }
        setConnected(true);
      }
    } catch {
      // BroadcastChannel still keeps same-machine tabs in sync
    } finally {
      inFlightRef.current = false;
      if (pendingPatchRef.current) {
        flushWriteQueue();
      }
    }
  }, [safeRoom]);

  // Push partial state updates optimistically + send sequentially to server & BroadcastChannel
  const updateState = useCallback(
    (patch: Partial<LiveOverlayState>) => {
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
            // ignore channel error
          }
        }

        return next;
      });

      pendingPatchRef.current = pendingPatchRef.current
        ? { ...pendingPatchRef.current, ...patch }
        : { ...patch };
      flushWriteQueue();
    },
    [safeRoom, flushWriteQueue]
  );

  const getServerNow = useCallback(() => Date.now() + serverClockOffsetRef.current, []);

  return {
    state,
    updateState,
    connected,
    connectedDisplays,
    roomId: safeRoom,
    getServerNow,
  };
}
