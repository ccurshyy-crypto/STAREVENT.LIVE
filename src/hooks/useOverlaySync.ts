import { useCallback, useEffect, useRef, useState } from 'react';
import { createDefaultOverlayState, LiveOverlayState } from '../types/overlay';

interface UseOverlaySyncOptions {
  roomId: string;
  initialOverrides?: Partial<LiveOverlayState>;
}

export function sanitizeRoomIdClient(raw: string): string {
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9-_]/g, '').slice(0, 40);
  return cleaned || 'star-live-1';
}

export function useOverlaySync({ roomId, initialOverrides }: UseOverlaySyncOptions) {
  const safeRoom = sanitizeRoomIdClient(roomId);
  const [state, setState] = useState<LiveOverlayState>(() => ({
    ...createDefaultOverlayState(safeRoom),
    ...initialOverrides,
  }));
  const [connected, setConnected] = useState(false);
  const [connectedDisplays, setConnectedDisplays] = useState(1);
  const lastLocalWriteRef = useRef<number>(0);

  // Subscribe to Server-Sent Events (/api/overlay/:roomId/stream) + BroadcastChannel
  useEffect(() => {
    let isCancelled = false;
    let eventSource: EventSource | null = null;
    let reconnectTimer: number | null = null;
    let channel: BroadcastChannel | null = null;

    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(`star-event-overlay-${safeRoom}`);
      channel.onmessage = (evt) => {
        if (evt.data && evt.data.roomId === safeRoom) {
          setState((prev) => ({
            ...prev,
            ...evt.data,
          }));
        }
      };
    }

    const connectSSE = () => {
      if (isCancelled) return;
      try {
        eventSource = new EventSource(`/api/overlay/${encodeURIComponent(safeRoom)}/stream`);

        eventSource.onopen = () => {
          if (!isCancelled) setConnected(true);
        };

        eventSource.onmessage = (event) => {
          if (isCancelled) return;
          try {
            const payload = JSON.parse(event.data);
            if (payload?.state) {
              // Avoid clobbering brand-new local optimistic writes within 120ms
              if (Date.now() - lastLocalWriteRef.current > 120 || payload.state.updatedAt >= lastLocalWriteRef.current) {
                setState((prev) => ({
                  ...prev,
                  ...payload.state,
                }));
              }
            }
            if (typeof payload?.connectedDisplays === 'number') {
              setConnectedDisplays(payload.connectedDisplays);
            }
          } catch {
            // ignore malformed heartbeat
          }
        };

        eventSource.onerror = () => {
          if (isCancelled) return;
          setConnected(false);
          eventSource?.close();
          reconnectTimer = window.setTimeout(connectSSE, 2000);
        };
      } catch {
        setConnected(false);
      }
    };

    connectSSE();

    return () => {
      isCancelled = true;
      eventSource?.close();
      channel?.close();
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
    };
  }, [safeRoom]);

  // Push partial state updates optimistically + broadcast via SSE server & BroadcastChannel
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

      fetch(`/api/overlay/${encodeURIComponent(safeRoom)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && typeof data.connectedDisplays === 'number') {
            setConnectedDisplays(data.connectedDisplays);
            setConnected(true);
          }
        })
        .catch(() => {
          // BroadcastChannel still keeps same-machine OBS/vMix in sync
        });
    },
    [safeRoom]
  );

  return {
    state,
    updateState,
    connected,
    connectedDisplays,
    roomId: safeRoom,
  };
}
