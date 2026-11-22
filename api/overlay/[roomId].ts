import {
  applyKabaddiActionEngine,
  applyOverlayPatchEngine,
  getHistoryInfo,
  getOrCreateRoom,
  getRoomVersion,
  pullRoomFromFirebase,
  pushRoomToFirebase,
  sanitizeRoomId,
  SERVER_BOOT_ID,
} from '../../server/overlaySyncEngine.ts';
import type { LiveOverlayState } from '../../src/types/overlay.ts';
import {
  getQueryParam,
  readJsonBody,
  sendJson,
  type VercelRequestLike,
  type VercelResponseLike,
} from '../_utils.ts';

// Track active display viewers on serverless runtime for presence counts
const viewerHeartbeats = new Map<string, Map<string, number>>();

function recordViewer(roomId: string, viewerId: string): number {
  const now = Date.now();
  let map = viewerHeartbeats.get(roomId);
  if (!map) {
    map = new Map();
    viewerHeartbeats.set(roomId, map);
  }
  if (viewerId) {
    map.set(viewerId, now);
  }
  const cutoff = now - 8000;
  let active = 0;
  for (const [id, ts] of map.entries()) {
    if (ts < cutoff) {
      map.delete(id);
    } else {
      active += 1;
    }
  }
  return active;
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const rawRoom = getQueryParam(req, 'roomId') || getQueryParam(req, 'room') || 'star-live-1';
  const roomId = sanitizeRoomId(rawRoom);

  if (req.method === 'GET') {
    const viewerId = getQueryParam(req, 'viewer').trim().slice(0, 40);
    const sinceVersion = Number(getQueryParam(req, 'v') || 0);
    const clientBootId = getQueryParam(req, 'boot').trim();

    // Sync from cloud Firebase RTDB if configured (ensures consistency across serverless instances)
    await pullRoomFromFirebase(roomId);

    const state = getOrCreateRoom(roomId);
    const version = getRoomVersion(roomId);
    const connectedDisplays = recordViewer(roomId, viewerId);
    const presence = { displays: connectedDisplays, controllers: 1, controllerNames: [] };
    const history = getHistoryInfo(roomId);
    const serverNow = Date.now();

    if (
      sinceVersion > 0 &&
      sinceVersion === version &&
      (!clientBootId || clientBootId === SERVER_BOOT_ID)
    ) {
      sendJson(res, 200, {
        unchanged: true,
        version,
        serverNow,
        serverBootId: SERVER_BOOT_ID,
        connectedDisplays,
        presence,
        history,
      });
      return;
    }

    sendJson(res, 200, {
      state,
      version,
      serverNow,
      serverBootId: SERVER_BOOT_ID,
      connectedDisplays,
      presence,
      history,
    });
    return;
  }

  if (req.method === 'POST') {
    await pullRoomFromFirebase(roomId);

    const body = await readJsonBody(req);
    const txId = typeof body.txId === 'string' ? body.txId.trim().slice(0, 64) : undefined;
    const sourceClientId =
      typeof body.clientId === 'string' ? body.clientId.trim().slice(0, 48) : undefined;

    let result;
    if (typeof body.action === 'string' && body.action.trim()) {
      result = applyKabaddiActionEngine(
        roomId,
        body.action.trim(),
        body.payload && typeof body.payload === 'object'
          ? (body.payload as Record<string, unknown>)
          : {},
        { txId, sourceClientId, immediateSave: true }
      );
    } else if (body.patch && typeof body.patch === 'object') {
      result = applyOverlayPatchEngine(roomId, body.patch as Partial<LiveOverlayState>, {
        txId,
        sourceClientId,
        immediateSave: true,
      });
    } else {
      const { txId: _t, clientId: _c, ...rest } = body;
      void _t;
      void _c;
      result = applyOverlayPatchEngine(roomId, rest as Partial<LiveOverlayState>, {
        txId,
        sourceClientId,
        immediateSave: true,
      });
    }

    // Ensure Firebase RTDB write completes before serverless lambda freezes
    await pushRoomToFirebase(roomId, result.state, result.version);

    const connectedDisplays = recordViewer(roomId, '');
    const presence = { displays: connectedDisplays, controllers: 1, controllerNames: [] };

    sendJson(res, 200, {
      ok: true,
      state: result.state,
      version: result.version,
      serverNow: result.serverNow,
      serverBootId: result.serverBootId,
      txId: result.txId,
      sourceClientId: result.sourceClientId,
      duplicate: Boolean(result.duplicate),
      connectedDisplays,
      presence,
      history: result.history,
    });
    return;
  }

  sendJson(res, 405, { ok: false, error: 'Method not allowed' });
}
