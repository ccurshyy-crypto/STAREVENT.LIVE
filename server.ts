import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import {
  createDefaultOverlayState,
  type KabaddiHalf,
  type KabaddiMatchStatus,
  type KabaddiTimeoutTeam,
  type LiveOverlayState,
  type RemoteHistoryInfo,
  type RemotePresenceInfo,
} from './src/types/overlay.ts';

import {
  activateOrderAndSubscription,
  findApprovedOrderByUnlockCode,
  findPaymentOrderByProofHash,
  findPaymentOrderByUtr,
  generateOrderId,
  generateUnlockCode,
  getOrderExpiresAt,
  getPaymentDbPath,
  getPaymentOrderById,
  getSubscriptionByUnlockCode,
  isOrderActive,
  listPaymentOrders,
  orderCoversSku,
  rejectPaymentOrder,
  resolvePlan,
  revokeOrderAndSubscription,
  SERVER_PLANS,
  toPublicOrderSummary,
  upsertPaymentOrder,
  upsertSubscriptionForOrder,
  VALID_SKUS,
  type OrderStatus,
  type PaymentOrderRecord,
  type PlanId,
  type ServerPlan,
} from './server/paymentDb.ts';
import {
  createCashfreeOrderAndQr,
  getCashfreePublicConfig,
  processCashfreeWebhookPayload,
  verifyCashfreeOrderOnServer,
  verifyCashfreeWebhookSignature,
} from './server/cashfree.ts';

export type { OrderStatus };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';
const ENV_ADMIN_PIN = (process.env.OVERLAY_ADMIN_PIN || '').trim();
const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

interface StoredAdminAuth {
  salt: string;
  hash: string;
  createdAt: number;
}

const DATA_DIR = path.resolve(__dirname, 'data');
const ROOMS_FILE = path.join(DATA_DIR, 'overlay-rooms.json');
const REMOTE_MATCHES_FILE = path.join(DATA_DIR, 'remote-matches.json');
const ADMIN_AUTH_FILE = path.join(DATA_DIR, 'admin-auth.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadAdminAuth(): StoredAdminAuth | null {
  try {
    if (!fs.existsSync(ADMIN_AUTH_FILE)) return null;
    const raw = fs.readFileSync(ADMIN_AUTH_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.salt === 'string' && typeof parsed.hash === 'string') {
      return parsed as StoredAdminAuth;
    }
    return null;
  } catch {
    return null;
  }
}

function saveAdminAuth(record: StoredAdminAuth) {
  ensureDataDir();
  fs.writeFileSync(ADMIN_AUTH_FILE, JSON.stringify(record, null, 2), 'utf-8');
}

function hashPasswordScrypt(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function safeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Active owner session tokens (stored in server memory only)
const adminSessions = new Map<string, number>(); // token -> expiresAt
// Simple brute-force throttle for admin login
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function createAdminSession(): string {
  const token = crypto.randomBytes(32).toString('hex');
  adminSessions.set(token, Date.now() + ADMIN_SESSION_TTL_MS);
  return token;
}

function isAdminSessionValid(token: string): boolean {
  const exp = adminSessions.get(token);
  if (!exp) return false;
  if (exp <= Date.now()) {
    adminSessions.delete(token);
    return false;
  }
  return true;
}

function getAuthSource(): 'env' | 'claimed' | 'unclaimed' {
  if (ENV_ADMIN_PIN.length > 0) return 'env';
  return loadAdminAuth() ? 'claimed' : 'unclaimed';
}

function verifyOwnerPassword(candidate: string): boolean {
  const trimmed = candidate.trim();
  if (!trimmed) return false;
  if (ENV_ADMIN_PIN.length > 0) {
    return safeEqualStrings(trimmed, ENV_ADMIN_PIN);
  }
  const stored = loadAdminAuth();
  if (!stored) return false;
  const computed = hashPasswordScrypt(trimmed, stored.salt);
  return safeEqualStrings(computed, stored.hash);
}

function requireAdminAuth(req: express.Request, res: express.Response): boolean {
  const authHeader = String(req.headers.authorization || '').trim();
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    if (isAdminSessionValid(token)) {
      return true;
    }
  }

  // Backward-compatible PIN header if ENV pin is configured
  const headerPin = String(req.headers['x-admin-pin'] || '').trim();
  if (headerPin && verifyOwnerPassword(headerPin)) {
    return true;
  }

  res.status(401).json({ ok: false, error: 'Owner authentication required. Please sign in.' });
  return false;
}

function isFakeUtr(utr: string): boolean {
  if (!/^\d{12}$/.test(utr)) return true;
  const fakePatterns = new Set([
    '123456789012',
    '012345678901',
    '987654321098',
    '123456123456',
    '111111222222',
    '112233445566',
    '999999888888',
  ]);
  return (
    /^(\d)\1{11}$/.test(utr) ||
    fakePatterns.has(utr) ||
    new Set(utr.split('')).size < 4 ||
    /(\d)\1{6,}/.test(utr)
  );
}

// Authoritative server-side room store for OBS & vMix Browser Sources (persisted to disk)
const rooms = new Map<string, LiveOverlayState>();
const roomVersions = new Map<string, number>();
const sseClients = new Map<string, Set<express.Response>>();
const pollViewers = new Map<string, Map<string, number>>(); // roomId -> (viewerId -> lastSeenMs)
let roomSaveTimer: ReturnType<typeof setTimeout> | null = null;

// Real-time WebSocket clients per Match/Room ID (vMix/OBS displays + Mobile/Tablet/Laptop controllers)
const wsDisplays = new Map<string, Set<WebSocket>>();
const wsControllers = new Map<string, Map<WebSocket, { deviceName: string; connectedAt: number }>>();

// Persisted PIN-protected Remote Matches & in-memory authenticated controller sessions
interface StoredRemoteMatch {
  matchId: string;
  salt: string;
  pinHash: string;
  createdAt: number;
  updatedAt: number;
}

interface RemoteControllerSession {
  matchId: string;
  deviceName: string;
  expiresAt: number;
}

const REMOTE_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const remoteMatches = new Map<string, StoredRemoteMatch>();
const remoteSessions = new Map<string, RemoteControllerSession>();
const remoteAuthAttempts = new Map<string, { count: number; resetAt: number }>();

function loadRemoteMatches() {
  try {
    if (!fs.existsSync(REMOTE_MATCHES_FILE)) return;
    const raw = fs.readFileSync(REMOTE_MATCHES_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      for (const [key, val] of Object.entries(parsed)) {
        const rec = val as Partial<StoredRemoteMatch>;
        if (rec && typeof rec.salt === 'string' && typeof rec.pinHash === 'string') {
          const safeId = sanitizeRoomId(key);
          remoteMatches.set(safeId, {
            matchId: safeId,
            salt: rec.salt,
            pinHash: rec.pinHash,
            createdAt: typeof rec.createdAt === 'number' ? rec.createdAt : Date.now(),
            updatedAt: typeof rec.updatedAt === 'number' ? rec.updatedAt : Date.now(),
          });
        }
      }
    }
  } catch {
    // ignore corrupt cache
  }
}

function saveRemoteMatches() {
  try {
    ensureDataDir();
    const obj: Record<string, StoredRemoteMatch> = {};
    for (const [k, v] of remoteMatches.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(REMOTE_MATCHES_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist remote matches:', err);
  }
}

function generateUniqueMatchId(): string {
  for (let i = 0; i < 20; i++) {
    const id = `kbd-${crypto.randomInt(1000, 9999)}`;
    if (!remoteMatches.has(id)) return id;
  }
  return `kbd-${crypto.randomBytes(3).toString('hex')}`;
}

function createRemoteSession(matchId: string, deviceName: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  remoteSessions.set(token, {
    matchId,
    deviceName: deviceName.trim().slice(0, 32) || 'Remote Controller',
    expiresAt: Date.now() + REMOTE_SESSION_TTL_MS,
  });
  return token;
}

function validateRemoteSession(token: string, expectedMatchId: string): RemoteControllerSession | null {
  if (!token) return null;
  const session = remoteSessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    remoteSessions.delete(token);
    return null;
  }
  if (session.matchId !== expectedMatchId) return null;
  return session;
}

function extractBearerToken(req: express.Request): string {
  const authHeader = String(req.headers.authorization || '').trim();
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return '';
}

function getLocalLanAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const entries of Object.values(interfaces)) {
    if (!entries) continue;
    for (const entry of entries) {
      if (entry.family === 'IPv4' && !entry.internal && entry.address) {
        ips.push(entry.address);
      }
    }
  }
  return Array.from(new Set(ips));
}

function loadPersistedRooms() {
  try {
    if (!fs.existsSync(ROOMS_FILE)) return;
    const raw = fs.readFileSync(ROOMS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      for (const [key, val] of Object.entries(parsed)) {
        if (val && typeof val === 'object') {
          const safeId = sanitizeRoomId(key);
          rooms.set(safeId, { ...createDefaultOverlayState(safeId), ...(val as Partial<LiveOverlayState>), roomId: safeId });
          roomVersions.set(safeId, 1);
        }
      }
    }
  } catch {
    // ignore corrupt cache
  }
}

function scheduleSaveRooms() {
  if (roomSaveTimer) return;
  roomSaveTimer = setTimeout(() => {
    roomSaveTimer = null;
    try {
      ensureDataDir();
      const obj: Record<string, LiveOverlayState> = {};
      for (const [k, v] of rooms.entries()) {
        obj[k] = v;
      }
      fs.writeFileSync(ROOMS_FILE, JSON.stringify(obj), 'utf-8');
    } catch (err) {
      console.error('Failed to persist overlay rooms:', err);
    }
  }, 250);
}

function getConnectedDisplayCount(roomId: string): number {
  const wsDispSet = wsDisplays.get(roomId);
  let activeWsDisplays = 0;
  if (wsDispSet) {
    for (const sock of wsDispSet) {
      if (sock.readyState === WebSocket.OPEN) {
        activeWsDisplays += 1;
      } else {
        wsDispSet.delete(sock);
      }
    }
  }
  const sseCount = sseClients.get(roomId)?.size ?? 0;
  const viewers = pollViewers.get(roomId);
  let activePollCount = 0;
  if (viewers) {
    const cutoff = Date.now() - 6000;
    for (const [vid, ts] of viewers.entries()) {
      if (ts < cutoff) {
        viewers.delete(vid);
      } else {
        activePollCount += 1;
      }
    }
  }
  return Math.max(activeWsDisplays, sseCount, activePollCount);
}

function getRemotePresence(roomId: string): RemotePresenceInfo {
  const displays = getConnectedDisplayCount(roomId);
  const ctrlMap = wsControllers.get(roomId);
  const names: string[] = [];
  if (ctrlMap) {
    for (const [sock, meta] of ctrlMap.entries()) {
      if (sock.readyState === WebSocket.OPEN) {
        names.push(meta.deviceName);
      } else {
        ctrlMap.delete(sock);
      }
    }
  }
  return {
    displays,
    controllers: names.length,
    controllerNames: names.slice(0, 12),
  };
}

// Initialize SQLite payment & subscription database and SSE client map
getPaymentDbPath();
const orderSseClients = new Map<string, Set<express.Response>>();

function sanitizeRoomId(raw: string): string {
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9-_]/g, '').slice(0, 40);
  return cleaned || 'star-live-1';
}

loadPersistedRooms();
loadRemoteMatches();

function getOrCreateRoom(roomId: string): LiveOverlayState {
  const safeId = sanitizeRoomId(roomId);
  let state = rooms.get(safeId);
  if (!state) {
    state = createDefaultOverlayState(safeId);
    rooms.set(safeId, state);
    roomVersions.set(safeId, 1);
  }
  return state;
}

function getRoomVersion(roomId: string): number {
  const safeId = sanitizeRoomId(roomId);
  return roomVersions.get(safeId) ?? 1;
}

const MAX_HISTORY_STEPS = 40;
const roomUndoStacks = new Map<string, LiveOverlayState[]>();
const roomRedoStacks = new Map<string, LiveOverlayState[]>();

function getHistoryInfo(roomId: string): RemoteHistoryInfo {
  const safeId = sanitizeRoomId(roomId);
  const undoCount = roomUndoStacks.get(safeId)?.length ?? 0;
  const redoCount = roomRedoStacks.get(safeId)?.length ?? 0;
  return {
    canUndo: undoCount > 0,
    canRedo: redoCount > 0,
    undoCount,
    redoCount,
  };
}

function snapshotStateForHistory(state: LiveOverlayState, now: number): LiveOverlayState {
  return {
    ...state,
    matchSeconds: computeLiveMatchSeconds(state, now),
    raidSeconds: computeLiveRaidSeconds(state, now),
    kabaddiAlert: null,
  };
}

function broadcastRoomState(roomId: string, state: LiveOverlayState) {
  const version = getRoomVersion(roomId);
  const serverNow = Date.now();
  const presence = getRemotePresence(roomId);
  const history = getHistoryInfo(roomId);
  const connectedDisplays = presence.displays;

  const wsPayload = JSON.stringify({
    type: 'sync',
    state,
    version,
    serverNow,
    connectedDisplays,
    presence,
    history,
  });

  const dispSet = wsDisplays.get(roomId);
  if (dispSet && dispSet.size > 0) {
    for (const sock of dispSet) {
      if (sock.readyState === WebSocket.OPEN) {
        try {
          sock.send(wsPayload);
        } catch {
          dispSet.delete(sock);
        }
      } else {
        dispSet.delete(sock);
      }
    }
  }

  const ctrlMap = wsControllers.get(roomId);
  if (ctrlMap && ctrlMap.size > 0) {
    for (const sock of ctrlMap.keys()) {
      if (sock.readyState === WebSocket.OPEN) {
        try {
          sock.send(wsPayload);
        } catch {
          ctrlMap.delete(sock);
        }
      } else {
        ctrlMap.delete(sock);
      }
    }
  }

  const clients = sseClients.get(roomId);
  if (!clients || clients.size === 0) return;

  const ssePayload = JSON.stringify({
    state,
    version,
    serverNow,
    connectedDisplays,
    presence,
    history,
  });

  for (const res of clients) {
    try {
      res.write(`data: ${ssePayload}\n\n`);
    } catch {
      clients.delete(res);
    }
  }
}

function applyOverlayPatch(
  roomId: string,
  rawPatch: Partial<LiveOverlayState>,
  options: { recordHistory?: boolean } = {}
) {
  const safeId = sanitizeRoomId(roomId);
  const current = getOrCreateRoom(safeId);
  const now = Date.now();
  const patchKeys = Object.keys(rawPatch);
  const isOnlyAlertClear =
    patchKeys.length === 1 && patchKeys[0] === 'kabaddiAlert' && rawPatch.kabaddiAlert === null;
  const shouldRecord = options.recordHistory !== false && patchKeys.length > 0 && !isOnlyAlertClear;

  if (shouldRecord) {
    let undoStack = roomUndoStacks.get(safeId);
    if (!undoStack) {
      undoStack = [];
      roomUndoStacks.set(safeId, undoStack);
    }
    undoStack.push(snapshotStateForHistory(current, now));
    if (undoStack.length > MAX_HISTORY_STEPS) {
      undoStack.shift();
    }
    roomRedoStacks.set(safeId, []);
  }

  // Normalize timer timestamps against server clock so OBS/vMix on other PCs never suffer clock skew
  const normalizedPatch: Partial<LiveOverlayState> = { ...rawPatch };
  if (
    typeof rawPatch.matchSeconds === 'number' ||
    typeof rawPatch.matchRunning === 'boolean' ||
    typeof rawPatch.matchUpdatedAt === 'number'
  ) {
    normalizedPatch.matchUpdatedAt = now;
  }
  if (
    typeof rawPatch.raidSeconds === 'number' ||
    typeof rawPatch.raidRunning === 'boolean' ||
    typeof rawPatch.raidUpdatedAt === 'number'
  ) {
    normalizedPatch.raidUpdatedAt = now;
  }

  const nextState: LiveOverlayState = {
    ...current,
    ...normalizedPatch,
    roomId: safeId,
    updatedAt: now,
  };

  const nextVersion = getRoomVersion(safeId) + 1;
  rooms.set(safeId, nextState);
  roomVersions.set(safeId, nextVersion);
  scheduleSaveRooms();
  broadcastRoomState(safeId, nextState);

  return {
    state: nextState,
    version: nextVersion,
    serverNow: now,
    presence: getRemotePresence(safeId),
    history: getHistoryInfo(safeId),
  };
}

function computeLiveMatchSeconds(state: LiveOverlayState, now: number): number {
  if (!state.matchRunning) return Math.max(0, state.matchSeconds);
  const elapsed = Math.floor(Math.max(0, now - state.matchUpdatedAt) / 1000);
  return Math.max(0, state.matchSeconds - elapsed);
}

function computeLiveRaidSeconds(state: LiveOverlayState, now: number): number {
  if (!state.raidRunning) return Math.max(0, state.raidSeconds);
  const elapsed = Math.floor(Math.max(0, now - state.raidUpdatedAt) / 1000);
  return Math.max(0, state.raidSeconds - elapsed);
}

const activeAlertTimers = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleAlertClear(roomId: string, ms = 2200) {
  const prev = activeAlertTimers.get(roomId);
  if (prev) clearTimeout(prev);
  const timer = setTimeout(() => {
    activeAlertTimers.delete(roomId);
    const curr = rooms.get(roomId);
    if (curr && curr.kabaddiAlert) {
      applyOverlayPatch(roomId, { kabaddiAlert: null }, { recordHistory: false });
    }
  }, ms);
  activeAlertTimers.set(roomId, timer);
}

function applyKabaddiRemoteAction(
  roomId: string,
  action: string,
  payload: Record<string, unknown> = {}
) {
  const safeId = sanitizeRoomId(roomId);
  const current = getOrCreateRoom(safeId);
  const now = Date.now();
  const team = payload.team === 'B' ? 'B' : 'A';
  const teamLabel = team === 'A' ? current.teamAName || 'TEAM A' : current.teamBName || 'TEAM B';

  switch (action) {
    case 'score': {
      const delta = Math.max(-10, Math.min(10, Math.round(Number(payload.delta || 0))));
      const alertText = typeof payload.alert === 'string' ? payload.alert.trim().slice(0, 60) : '';
      const patch: Partial<LiveOverlayState> =
        team === 'A'
          ? { mode: 'kabaddi', teamAScore: Math.max(0, current.teamAScore + delta) }
          : { mode: 'kabaddi', teamBScore: Math.max(0, current.teamBScore + delta) };
      if (alertText) {
        patch.kabaddiAlert = alertText;
      }
      const res = applyOverlayPatch(safeId, patch);
      if (alertText) scheduleAlertClear(safeId);
      return res;
    }

    case 'raid': {
      const pts = Math.max(1, Math.min(6, Math.round(Number(payload.points || 1))));
      const label = pts >= 3 ? `SUPER RAID! +${pts} ${teamLabel}` : `${teamLabel} · RAID +${pts}`;
      const patch: Partial<LiveOverlayState> =
        team === 'A'
          ? {
              mode: 'kabaddi',
              teamAScore: Math.max(0, current.teamAScore + pts),
              teamARaidPoints: Math.max(0, (current.teamARaidPoints ?? 0) + pts),
              kabaddiAlert: label,
            }
          : {
              mode: 'kabaddi',
              teamBScore: Math.max(0, current.teamBScore + pts),
              teamBRaidPoints: Math.max(0, (current.teamBRaidPoints ?? 0) + pts),
              kabaddiAlert: label,
            };
      const res = applyOverlayPatch(safeId, patch);
      scheduleAlertClear(safeId);
      return res;
    }

    case 'bonus': {
      const label = `${teamLabel} · BONUS +1`;
      const patch: Partial<LiveOverlayState> =
        team === 'A'
          ? {
              mode: 'kabaddi',
              teamAScore: current.teamAScore + 1,
              teamABonusPoints: Math.max(0, (current.teamABonusPoints ?? 0) + 1),
              kabaddiAlert: label,
            }
          : {
              mode: 'kabaddi',
              teamBScore: current.teamBScore + 1,
              teamBBonusPoints: Math.max(0, (current.teamBBonusPoints ?? 0) + 1),
              kabaddiAlert: label,
            };
      const res = applyOverlayPatch(safeId, patch);
      scheduleAlertClear(safeId);
      return res;
    }

    case 'tackle': {
      const pts = Math.max(1, Math.min(3, Math.round(Number(payload.points || 1))));
      const label = pts >= 2 ? `SUPER TACKLE! +${pts} ${teamLabel}` : `${teamLabel} · TACKLE +${pts}`;
      const patch: Partial<LiveOverlayState> =
        team === 'A'
          ? {
              mode: 'kabaddi',
              teamAScore: current.teamAScore + pts,
              teamATacklePoints: Math.max(0, (current.teamATacklePoints ?? 0) + pts),
              kabaddiAlert: label,
            }
          : {
              mode: 'kabaddi',
              teamBScore: current.teamBScore + pts,
              teamBTacklePoints: Math.max(0, (current.teamBTacklePoints ?? 0) + pts),
              kabaddiAlert: label,
            };
      const res = applyOverlayPatch(safeId, patch);
      scheduleAlertClear(safeId);
      return res;
    }

    case 'all_out': {
      const label = `ALL OUT! +2 ${teamLabel}`;
      const patch: Partial<LiveOverlayState> =
        team === 'A'
          ? { mode: 'kabaddi', teamAScore: current.teamAScore + 2, kabaddiAlert: label }
          : { mode: 'kabaddi', teamBScore: current.teamBScore + 2, kabaddiAlert: label };
      const res = applyOverlayPatch(safeId, patch);
      scheduleAlertClear(safeId, 2600);
      return res;
    }

    case 'timeout': {
      const rawTarget = String(payload.target || 'OFFICIAL').toUpperCase();
      const target: KabaddiTimeoutTeam =
        rawTarget === 'A' ? 'A' : rawTarget === 'B' ? 'B' : 'OFFICIAL';
      const liveMatchSec = computeLiveMatchSeconds(current, now);
      const liveRaidSec = computeLiveRaidSeconds(current, now);
      const timeoutTitle =
        target === 'A'
          ? `TIMEOUT · ${current.teamAName || 'TEAM A'}`
          : target === 'B'
            ? `TIMEOUT · ${current.teamBName || 'TEAM B'}`
            : 'OFFICIAL TIMEOUT';
      const res = applyOverlayPatch(safeId, {
        mode: 'kabaddi',
        matchStatus: 'TIMEOUT',
        timeoutTeam: target,
        matchRunning: false,
        matchSeconds: liveMatchSec,
        raidRunning: false,
        raidSeconds: liveRaidSec,
        kabaddiAlert: timeoutTitle,
      });
      scheduleAlertClear(safeId, 2600);
      return res;
    }

    case 'clear_timeout': {
      return applyOverlayPatch(safeId, {
        matchStatus: 'LIVE',
        timeoutTeam: null,
        kabaddiAlert: null,
      });
    }

    case 'half': {
      const validHalves: KabaddiHalf[] = ['1ST HALF', '2ND HALF', 'HALF TIME', 'FULL TIME'];
      const half = validHalves.includes(payload.half as KabaddiHalf)
        ? (payload.half as KabaddiHalf)
        : '1ST HALF';
      const nextStatus: KabaddiMatchStatus =
        half === 'HALF TIME' ? 'HALF TIME' : half === 'FULL TIME' ? 'FULL TIME' : 'LIVE';
      const shouldPause = half === 'HALF TIME' || half === 'FULL TIME';
      return applyOverlayPatch(safeId, {
        kabaddiHalf: half,
        matchStatus: nextStatus,
        timeoutTeam: null,
        ...(shouldPause
          ? { matchRunning: false, matchSeconds: computeLiveMatchSeconds(current, now) }
          : {}),
      });
    }

    case 'status': {
      const validStatuses: KabaddiMatchStatus[] = ['LIVE', 'PAUSED', 'TIMEOUT', 'HALF TIME', 'FULL TIME'];
      const status = validStatuses.includes(payload.status as KabaddiMatchStatus)
        ? (payload.status as KabaddiMatchStatus)
        : 'LIVE';
      const shouldPause = status !== 'LIVE';
      return applyOverlayPatch(safeId, {
        matchStatus: status,
        timeoutTeam: status === 'TIMEOUT' ? current.timeoutTeam || 'OFFICIAL' : null,
        ...(status === 'HALF TIME' ? { kabaddiHalf: 'HALF TIME' } : {}),
        ...(status === 'FULL TIME' ? { kabaddiHalf: 'FULL TIME' } : {}),
        ...(shouldPause
          ? { matchRunning: false, matchSeconds: computeLiveMatchSeconds(current, now) }
          : {}),
      });
    }

    case 'timer_toggle': {
      const liveSec = computeLiveMatchSeconds(current, now);
      if (current.matchRunning) {
        return applyOverlayPatch(safeId, {
          matchRunning: false,
          matchSeconds: liveSec,
          matchStatus: current.matchStatus === 'LIVE' ? 'PAUSED' : current.matchStatus,
        });
      }
      return applyOverlayPatch(safeId, {
        matchRunning: true,
        matchSeconds: liveSec === 0 ? 30 : liveSec,
        matchStatus: 'LIVE',
        timeoutTeam: null,
      });
    }

    case 'timer_set': {
      const sec = Math.max(0, Math.min(99 * 60, Math.round(Number(payload.seconds ?? 30))));
      const autoStart = payload.autoStart !== false;
      return applyOverlayPatch(safeId, {
        matchSeconds: sec,
        matchRunning: autoStart,
        matchStatus: autoStart ? 'LIVE' : current.matchStatus || 'PAUSED',
        timeoutTeam: autoStart ? null : current.timeoutTeam,
      });
    }

    case 'timer_adjust': {
      const delta = Math.max(-600, Math.min(600, Math.round(Number(payload.delta ?? 0))));
      const liveSec = computeLiveMatchSeconds(current, now);
      return applyOverlayPatch(safeId, {
        matchSeconds: Math.max(0, Math.min(99 * 60, liveSec + delta)),
      });
    }

    case 'raid_toggle': {
      const liveRaid = computeLiveRaidSeconds(current, now);
      if (current.raidRunning) {
        return applyOverlayPatch(safeId, { raidRunning: false, raidSeconds: liveRaid });
      }
      return applyOverlayPatch(safeId, {
        raidRunning: true,
        raidSeconds: liveRaid === 0 ? 30 : liveRaid,
      });
    }

    case 'raid_reset': {
      return applyOverlayPatch(safeId, { raidRunning: false, raidSeconds: 30 });
    }

    case 'swap': {
      return applyOverlayPatch(safeId, {
        teamAName: current.teamBName,
        teamACode: current.teamBCode,
        teamAColor: current.teamBColor,
        teamAScore: current.teamBScore,
        teamARaidPoints: current.teamBRaidPoints ?? 0,
        teamABonusPoints: current.teamBBonusPoints ?? 0,
        teamATacklePoints: current.teamBTacklePoints ?? 0,
        teamALogoUrl: current.teamBLogoUrl,
        teamAYellowCards: current.teamBYellowCards,
        teamARedCards: current.teamBRedCards,
        teamABinEndAt: current.teamBBinEndAt,
        teamBName: current.teamAName,
        teamBCode: current.teamACode,
        teamBColor: current.teamAColor,
        teamBScore: current.teamAScore,
        teamBRaidPoints: current.teamARaidPoints ?? 0,
        teamBBonusPoints: current.teamABonusPoints ?? 0,
        teamBTacklePoints: current.teamATacklePoints ?? 0,
        teamBLogoUrl: current.teamALogoUrl,
        teamBYellowCards: current.teamAYellowCards,
        teamBRedCards: current.teamARedCards,
        teamBBinEndAt: current.teamABinEndAt,
      });
    }

    case 'timer_reset': {
      const sec = Math.max(0, Math.min(99 * 60, Math.round(Number(payload.seconds ?? 30))));
      const autoStart = payload.autoStart === true;
      return applyOverlayPatch(safeId, {
        matchSeconds: sec,
        matchRunning: autoStart,
        matchStatus: autoStart ? 'LIVE' : 'PAUSED',
        timeoutTeam: null,
      });
    }

    case 'undo': {
      const undoStack = roomUndoStacks.get(safeId);
      if (!undoStack || undoStack.length === 0) {
        return {
          state: current,
          version: getRoomVersion(safeId),
          serverNow: now,
          presence: getRemotePresence(safeId),
          history: getHistoryInfo(safeId),
        };
      }
      const prevSnapshot = undoStack.pop()!;
      let redoStack = roomRedoStacks.get(safeId);
      if (!redoStack) {
        redoStack = [];
        roomRedoStacks.set(safeId, redoStack);
      }
      redoStack.push(snapshotStateForHistory(current, now));
      if (redoStack.length > MAX_HISTORY_STEPS) {
        redoStack.shift();
      }
      const restored: LiveOverlayState = {
        ...prevSnapshot,
        roomId: safeId,
        kabaddiAlert: null,
        matchUpdatedAt: now,
        raidUpdatedAt: now,
        updatedAt: now,
      };
      const nextVersion = getRoomVersion(safeId) + 1;
      rooms.set(safeId, restored);
      roomVersions.set(safeId, nextVersion);
      scheduleSaveRooms();
      broadcastRoomState(safeId, restored);
      return {
        state: restored,
        version: nextVersion,
        serverNow: now,
        presence: getRemotePresence(safeId),
        history: getHistoryInfo(safeId),
      };
    }

    case 'redo': {
      const redoStack = roomRedoStacks.get(safeId);
      if (!redoStack || redoStack.length === 0) {
        return {
          state: current,
          version: getRoomVersion(safeId),
          serverNow: now,
          presence: getRemotePresence(safeId),
          history: getHistoryInfo(safeId),
        };
      }
      const nextSnapshot = redoStack.pop()!;
      let undoStack = roomUndoStacks.get(safeId);
      if (!undoStack) {
        undoStack = [];
        roomUndoStacks.set(safeId, undoStack);
      }
      undoStack.push(snapshotStateForHistory(current, now));
      if (undoStack.length > MAX_HISTORY_STEPS) {
        undoStack.shift();
      }
      const restored: LiveOverlayState = {
        ...nextSnapshot,
        roomId: safeId,
        kabaddiAlert: null,
        matchUpdatedAt: now,
        raidUpdatedAt: now,
        updatedAt: now,
      };
      const nextVersion = getRoomVersion(safeId) + 1;
      rooms.set(safeId, restored);
      roomVersions.set(safeId, nextVersion);
      scheduleSaveRooms();
      broadcastRoomState(safeId, restored);
      return {
        state: restored,
        version: nextVersion,
        serverNow: now,
        presence: getRemotePresence(safeId),
        history: getHistoryInfo(safeId),
      };
    }

    case 'reset': {
      return applyOverlayPatch(safeId, {
        teamAScore: 0,
        teamBScore: 0,
        teamARaidPoints: 0,
        teamABonusPoints: 0,
        teamATacklePoints: 0,
        teamBRaidPoints: 0,
        teamBBonusPoints: 0,
        teamBTacklePoints: 0,
        teamAYellowCards: 0,
        teamARedCards: 0,
        teamBYellowCards: 0,
        teamBRedCards: 0,
        teamABinEndAt: null,
        teamBBinEndAt: null,
        matchSeconds: 30,
        matchRunning: true,
        raidSeconds: 30,
        raidRunning: false,
        kabaddiHalf: '1ST HALF',
        matchStatus: 'LIVE',
        timeoutTeam: null,
        doOrDie: false,
        kabaddiAlert: null,
      });
    }

    default:
      return {
        state: current,
        version: getRoomVersion(safeId),
        serverNow: now,
        presence: getRemotePresence(safeId),
        history: getHistoryInfo(safeId),
      };
  }
}

function notifyOrderWatchers(order: PaymentOrderRecord) {
  const clients = orderSseClients.get(order.orderId);
  if (!clients || clients.size === 0) return;
  const payload = JSON.stringify({ order: toPublicOrderSummary(order) });
  for (const res of clients) {
    try {
      res.write(`data: ${payload}\n\n`);
    } catch {
      clients.delete(res);
    }
  }
}

function getExpressRequestBaseUrl(req: express.Request): string {
  const envUrl = (process.env.APP_URL || '').trim();
  if (envUrl) return envUrl.replace(/\/+$/, '');
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http')
    .split(',')[0]
    .trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`)
    .split(',')[0]
    .trim();
  return `${proto}://${host}`;
}

async function startServer() {
  const app = express();
  // Allow up to 1.5MB for compressed payment screenshot proof or team logos, and capture rawBody for Cashfree webhook HMAC
  app.use(
    express.json({
      limit: '1.5mb',
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
      },
    })
  );

  // Allow OBS / vMix local browser inputs to fetch public overlay state cleanly
  // Never set wildcard CORS on authenticated /api/admin or /api/remote/match endpoints
  app.use('/api', (req, res, next) => {
    if (
      !req.path.startsWith('/admin') &&
      !req.path.startsWith('/remote/match') &&
      !req.path.startsWith('/payment/cashfree/webhook')
    ) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }
    }
    next();
  });

  // Payment gateway config & plans info (Cashfree PG API - Sandbox/Production)
  app.get('/api/payment/config', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(getCashfreePublicConfig());
  });

  // Create Cashfree PG payment order + dynamic UPI QR securely on the backend
  const handleCreateCashfreeOrder = async (req: express.Request, res: express.Response) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const result = await createCashfreeOrderAndQr({
      sku: String(body.sku || ''),
      planId: body.planId ? String(body.planId) : undefined,
      buyerName: body.buyerName ? String(body.buyerName) : undefined,
      buyerPhone: body.buyerPhone ? String(body.buyerPhone) : undefined,
      buyerEmail: body.buyerEmail ? String(body.buyerEmail) : undefined,
      baseUrl: getExpressRequestBaseUrl(req),
    });

    const { statusCode, ...payload } = result;
    res.setHeader('Cache-Control', 'no-store');
    res.status(statusCode).json(payload);
  };

  app.post('/api/payment/cashfree/create-order', handleCreateCashfreeOrder);
  app.post('/api/payment/qr/create', handleCreateCashfreeOrder);

  // Authoritative server-side Cashfree payment verification (queries Cashfree PG API directly)
  const handleVerifyCashfreePayment = async (req: express.Request, res: express.Response) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const orderId = String(
      req.query.orderId || req.query.order_id || body.orderId || body.order_id || ''
    ).trim();

    const result = await verifyCashfreeOrderOnServer(orderId, { force: true });
    res.setHeader('Cache-Control', 'no-store');

    if (!result.ok) {
      res.status(result.statusCode).json({ ok: false, paid: false, error: result.error });
      return;
    }

    if (result.paid && result.order) {
      notifyOrderWatchers(result.order);
    }

    res.status(result.statusCode).json({
      ok: true,
      paid: result.paid,
      cashfreeStatus: result.cashfreeStatus,
      order: result.order ? toPublicOrderSummary(result.order) : undefined,
    });
  };

  app.get('/api/payment/cashfree/verify', handleVerifyCashfreePayment);
  app.post('/api/payment/cashfree/verify', handleVerifyCashfreePayment);

  // Cashfree signed webhook: Base64(HMAC-SHA256(CASHFREE_CLIENT_SECRET, timestamp + rawBody))
  app.post('/api/payment/cashfree/webhook', (req, res) => {
    const rawTs = req.headers['x-webhook-timestamp'];
    const rawSig = req.headers['x-webhook-signature'];
    const timestamp = Array.isArray(rawTs) ? String(rawTs[0] || '') : String(rawTs || '');
    const signature = Array.isArray(rawSig) ? String(rawSig[0] || '') : String(rawSig || '');
    const rawBody = (req as express.Request & { rawBody?: Buffer }).rawBody;

    if (!rawBody || rawBody.length === 0) {
      res.status(400).json({ ok: false, error: 'Missing raw webhook payload.' });
      return;
    }

    const sigCheck = verifyCashfreeWebhookSignature(rawBody, timestamp, signature);
    if (!sigCheck.valid) {
      const status = sigCheck.reason?.includes('not configured') ? 503 : 401;
      res.status(status).json({ ok: false, error: sigCheck.reason || 'Invalid webhook signature.' });
      return;
    }

    const processed = processCashfreeWebhookPayload(req.body);
    if (processed.handled && processed.unlockedOrder) {
      notifyOrderWatchers(processed.unlockedOrder);
    }

    res.json({ ok: true, handled: processed.handled, eventType: processed.eventType });
  });

  // ---------------------------------------------------------------------------
  // OWNER AUTHENTICATION ENDPOINTS (One-Time Setup / Sign In / Sign Out)
  // ---------------------------------------------------------------------------
  app.get('/api/admin/auth-status', (_req, res) => {
    res.json({ ok: true, source: getAuthSource() });
  });

  app.post('/api/admin/setup', (req, res) => {
    if (getAuthSource() !== 'unclaimed') {
      res.status(409).json({
        ok: false,
        error: 'Owner password is already configured. Please sign in.',
      });
      return;
    }

    const password = String(req.body?.password || '').trim();
    if (password.length < 6 || password.length > 100) {
      res.status(400).json({
        ok: false,
        error: 'Choose a strong owner password between 6 and 100 characters.',
      });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPasswordScrypt(password, salt);
    saveAdminAuth({ salt, hash, createdAt: Date.now() });

    const token = createAdminSession();
    res.json({ ok: true, token });
  });

  app.post('/api/admin/login', (req, res) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const record = loginAttempts.get(ip);
    if (record && record.resetAt > now && record.count >= 12) {
      res.status(429).json({
        ok: false,
        error: 'Too many failed login attempts. Please wait 5 minutes and try again.',
      });
      return;
    }

    const password = String(req.body?.password || '').trim();
    if (!verifyOwnerPassword(password)) {
      const nextCount = record && record.resetAt > now ? record.count + 1 : 1;
      loginAttempts.set(ip, { count: nextCount, resetAt: now + 5 * 60 * 1000 });
      res.status(401).json({ ok: false, error: 'Incorrect Owner Password.' });
      return;
    }

    loginAttempts.delete(ip);
    const token = createAdminSession();
    res.json({ ok: true, token });
  });

  app.post('/api/admin/logout', (req, res) => {
    const authHeader = String(req.headers.authorization || '').trim();
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      adminSessions.delete(authHeader.slice(7).trim());
    }
    res.json({ ok: true });
  });

  // ---------------------------------------------------------------------------
  // CUSTOMER PAYMENT SUBMISSION & UNLOCK KEY VERIFICATION
  // ---------------------------------------------------------------------------
  // 1. Submit a direct UPI payment proof -> creates PENDING order in SQLite (NEVER auto-unlocks!)
  app.post('/api/overlay/orders', (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const sku = String(body.sku || '').trim();
    const plan = resolvePlan(body.planId);
    const buyerName = String(body.buyerName || '').trim().slice(0, 80);
    const buyerPhone = String(body.buyerPhone || '').replace(/\D/g, '').slice(0, 15);
    const utrRef = String(body.utrRef || '').replace(/\D/g, '').slice(0, 12);
    const rawProof = typeof body.proofImage === 'string' ? body.proofImage : '';
    const proofImage =
      rawProof.startsWith('data:image/') && rawProof.length <= 900_000 ? rawProof : undefined;

    if (!VALID_SKUS.has(sku)) {
      res.status(400).json({ ok: false, error: 'Invalid overlay selection.' });
      return;
    }
    if (buyerName.length < 2) {
      res.status(400).json({ ok: false, error: 'Please enter your full name.' });
      return;
    }
    if (buyerPhone.length < 10) {
      res.status(400).json({ ok: false, error: 'Please enter a valid 10-digit mobile number.' });
      return;
    }
    if (isFakeUtr(utrRef)) {
      res.status(400).json({
        ok: false,
        error: 'Invalid or fake 12-digit UPI UTR blocked. Enter your real UPI receipt UTR.',
      });
      return;
    }
    if (!proofImage) {
      res.status(400).json({
        ok: false,
        error: `Please attach your real ₹${plan.amount} UPI payment screenshot.`,
      });
      return;
    }

    const proofHash = crypto.createHash('sha256').update(proofImage).digest('hex');

    // Block reusing a rejected/fraudulent UTR or duplicate screenshot
    const duplicate = findPaymentOrderByUtr(utrRef);
    if (duplicate) {
      if (duplicate.status === 'pending' && duplicate.sku === sku && duplicate.buyerPhone === buyerPhone) {
        res.json({ ok: true, order: toPublicOrderSummary(duplicate), existing: true });
        return;
      }
      res.status(409).json({
        ok: false,
        error:
          duplicate.status === 'rejected' || duplicate.status === 'revoked'
            ? `This UTR was rejected / blocked. Please pay real ₹${plan.amount} and try again.`
            : 'This 12-digit UPI UTR has already been used.',
      });
      return;
    }

    const duplicateProof = findPaymentOrderByProofHash(proofHash);
    if (duplicateProof) {
      res.status(409).json({
        ok: false,
        error: 'This payment screenshot was already submitted. Duplicate receipts are blocked.',
      });
      return;
    }

    const order: PaymentOrderRecord = {
      orderId: generateOrderId(),
      sku,
      planId: plan.id,
      durationHours: plan.durationHours,
      amount: plan.amount,
      originalPrice: plan.originalPrice,
      currency: 'INR',
      buyerName,
      buyerPhone,
      utrRef,
      proofImage,
      proofHash,
      paymentMethod: 'upi_manual',
      status: 'pending',
      createdAt: Date.now(),
    };

    upsertPaymentOrder(order);

    res.status(201).json({
      ok: true,
      order: toPublicOrderSummary(order),
    });
  });

  // 2. Poll current payment verification status (auto-checks Cashfree PG API if applicable)
  app.get('/api/overlay/orders/:orderId/status', async (req, res) => {
    const orderId = String(req.params.orderId || '').trim().toUpperCase();
    let order = getPaymentOrderById(orderId);
    if (!order) {
      res.status(404).json({ ok: false, error: 'Order not found.' });
      return;
    }
    if (order.paymentMethod === 'cashfree_qr' && order.status === 'pending') {
      const verified = await verifyCashfreeOrderOnServer(order.orderId);
      if (verified.order) {
        order = verified.order;
        if (verified.paid) {
          notifyOrderWatchers(order);
        }
      }
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, order: toPublicOrderSummary(order) });
  });

  // 3. Real-time SSE stream for instant auto-unlock the second Cashfree payment settles
  app.get('/api/overlay/orders/:orderId/stream', (req, res) => {
    const orderId = String(req.params.orderId || '').trim().toUpperCase();
    const order = getPaymentOrderById(orderId);
    if (!order) {
      res.status(404).json({ ok: false, error: 'Order not found.' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let clients = orderSseClients.get(orderId);
    if (!clients) {
      clients = new Set();
      orderSseClients.set(orderId, clients);
    }
    clients.add(res);

    res.write(`data: ${JSON.stringify({ order: toPublicOrderSummary(order) })}\n\n`);

    let gatewayPoll: ReturnType<typeof setInterval> | null = null;
    if (order.paymentMethod === 'cashfree_qr' && order.status === 'pending') {
      gatewayPoll = setInterval(() => {
        const latest = getPaymentOrderById(orderId);
        if (!latest || latest.status !== 'pending') {
          if (gatewayPoll) clearInterval(gatewayPoll);
          return;
        }
        verifyCashfreeOrderOnServer(orderId)
          .then((result) => {
            if (result.paid && result.order) {
              notifyOrderWatchers(result.order);
            }
          })
          .catch(() => {});
      }, 3500);
    }

    const heartbeat = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(heartbeat);
      }
    }, 20000);

    req.on('close', () => {
      clearInterval(heartbeat);
      if (gatewayPoll) clearInterval(gatewayPoll);
      clients?.delete(res);
    });
  });

  // 4. Verify an Unlock Key (STAR-XXXX-XXXX-XXXX) -> unlocks single overlay OR all overlays!
  app.post('/api/overlay/verify-unlock', (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const code = String(body.unlockCode || '').trim().toUpperCase();
    const requestedSku = String(body.sku || '').trim();

    if (!code) {
      res.status(400).json({ ok: false, error: 'Please enter your Unlock Key.' });
      return;
    }

    const match = findApprovedOrderByUnlockCode(code, requestedSku || undefined);

    if (!match || !match.unlockCode) {
      const wrongSkuMatch = findApprovedOrderByUnlockCode(code);
      if (wrongSkuMatch) {
        res.status(403).json({
          ok: false,
          error:
            'This Unlock Key is valid for a different overlay. Please select the matching overlay.',
        });
        return;
      }

      res.status(403).json({
        ok: false,
        error: 'Invalid or locked Unlock Key. Pay via QR (₹1 Today Offer / ₹149 / ₹1,499) to unlock.',
      });
      return;
    }

    const expiresAt = getOrderExpiresAt(match);
    if (expiresAt <= Date.now()) {
      res.status(403).json({
        ok: false,
        expired: true,
        error:
          'This Unlock Key has expired and auto-locked. Please select a fresh plan (₹1 Today Offer / ₹149 / ₹1,499).',
      });
      return;
    }

    const unlockedSkus = match.sku === 'all' ? Array.from(VALID_SKUS) : [match.sku];

    res.json({
      ok: true,
      sku: match.sku,
      planId: match.planId || '1day',
      unlockedSkus,
      orderId: match.orderId,
      unlockCode: match.unlockCode,
      expiresAt,
    });
  });

  // 5. Server-side validation of locally cached unlock tokens (auto-drops expired/revoked tokens)
  app.post('/api/overlay/validate-tokens', (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const tokens = Array.isArray(body.tokens) ? body.tokens : [];
    const now = Date.now();
    const verified: Array<{
      sku: string;
      orderId: string;
      unlockCode: string;
      planId?: PlanId;
      expiresAt: number;
    }> = [];

    for (const item of tokens) {
      if (!item || typeof item !== 'object') continue;
      const sku = String(item.sku || '');
      const orderId = String(item.orderId || '').toUpperCase();
      const unlockCode = String(item.unlockCode || '').toUpperCase();
      if (!VALID_SKUS.has(sku) || !orderId || !unlockCode) continue;

      const match = getPaymentOrderById(orderId);
      if (
        match &&
        isOrderActive(match, now) &&
        orderCoversSku(match, sku) &&
        match.unlockCode?.toUpperCase() === unlockCode
      ) {
        verified.push({
          sku,
          orderId: match.orderId,
          unlockCode: match.unlockCode,
          planId: match.planId,
          expiresAt: getOrderExpiresAt(match),
        });
      }
    }

    res.json({ ok: true, verified });
  });

  // 5b. Live OBS / vMix Browser Source access check (enforces DB subscription expiry)
  app.get('/api/overlay/access', (req, res) => {
    const sku = String(req.query.sku || '').trim();
    const token = String(req.query.token || '').trim().toUpperCase();
    const now = Date.now();

    res.setHeader('Cache-Control', 'no-store');

    if (sku === 'kabaddi-demo') {
      res.json({ ok: true, active: true, freeDemo: true, sku: 'kabaddi-demo' });
      return;
    }

    if (!token) {
      res.status(403).json({ ok: false, active: false, reason: 'missing_token' });
      return;
    }

    const sub = getSubscriptionByUnlockCode(token);
    if (sub) {
      if (sub.status === 'revoked') {
        res.status(403).json({ ok: false, active: false, reason: 'revoked' });
        return;
      }
      if (sku && sub.sku !== 'all' && sub.sku !== sku) {
        res.status(403).json({ ok: false, active: false, reason: 'sku_mismatch' });
        return;
      }
      if (sub.expiresAt <= now) {
        res.status(403).json({ ok: false, active: false, reason: 'expired', expiresAt: sub.expiresAt });
        return;
      }
      res.json({
        ok: true,
        active: true,
        sku: sku || sub.sku,
        planId: sub.planId,
        expiresAt: sub.expiresAt,
      });
      return;
    }

    const match = findApprovedOrderByUnlockCode(token, sku || undefined);
    if (!match) {
      res.status(403).json({ ok: false, active: false, reason: 'invalid_token' });
      return;
    }

    const expiresAt = getOrderExpiresAt(match);
    if (expiresAt <= now) {
      res.status(403).json({ ok: false, active: false, reason: 'expired', expiresAt });
      return;
    }

    res.json({ ok: true, active: true, sku: sku || match.sku, planId: match.planId, expiresAt });
  });

  // ---------------------------------------------------------------------------
  // OWNER ADMIN ENDPOINTS (Generate Unlock Keys, Approve/Reject/Revoke)
  // ---------------------------------------------------------------------------
  // 6. Owner Admin: list all keys & payment verification requests from SQLite DB
  app.get('/api/admin/orders', (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    const now = Date.now();
    const enriched = listPaymentOrders().map((o) => {
      const expiresAt = o.status === 'approved' ? getOrderExpiresAt(o) : undefined;
      return {
        ...o,
        expiresAt,
        isExpired: Boolean(expiresAt && expiresAt <= now),
      };
    });
    res.json({ ok: true, orders: enriched });
  });

  // 6b. Owner Admin: Direct 1-Click Unlock Key Generator (after real payment received!)
  app.post('/api/admin/keys/generate', (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const sku = String(body.sku || 'all').trim();
    const buyerName = String(body.buyerName || 'Verified Customer').trim().slice(0, 80) || 'Verified Customer';
    const buyerPhone = String(body.buyerPhone || '').replace(/\D/g, '').slice(0, 15);
    const note = String(body.note || '').trim().slice(0, 40);

    const matchedPlan =
      typeof body.planId === 'string' && body.planId in SERVER_PLANS
        ? SERVER_PLANS[body.planId as PlanId]
        : null;
    const rawHours = Number(body.durationHours);
    const durationHours = matchedPlan
      ? matchedPlan.durationHours
      : Number.isFinite(rawHours)
        ? Math.max(1, Math.min(720, Math.round(rawHours)))
        : 24;
    const inferredPlan: ServerPlan =
      matchedPlan ||
      (durationHours >= 720
        ? SERVER_PLANS['1month']
        : durationHours >= 168
          ? SERVER_PLANS['1week']
          : SERVER_PLANS['1day']);

    if (sku !== 'all' && !VALID_SKUS.has(sku)) {
      res.status(400).json({ ok: false, error: 'Invalid overlay selection for Unlock Key.' });
      return;
    }

    const now = Date.now();
    const unlockCode = generateUnlockCode();
    const order: PaymentOrderRecord = {
      orderId: generateOrderId(),
      sku,
      planId: inferredPlan.id,
      durationHours,
      amount: inferredPlan.amount,
      originalPrice: inferredPlan.originalPrice,
      currency: 'INR',
      buyerName,
      buyerPhone,
      utrRef: note || `KEY-${inferredPlan.id.toUpperCase()}`,
      paymentMethod: 'owner_key',
      status: 'approved',
      unlockCode,
      createdAt: now,
      verifiedAt: now,
      expiresAt: now + durationHours * 60 * 60 * 1000,
    };

    upsertPaymentOrder(order);
    upsertSubscriptionForOrder(order);

    res.status(201).json({
      ok: true,
      order: {
        ...order,
        isExpired: false,
      },
    });
  });

  // 7. Owner Admin: approve UPI payment request -> generates Unlock Key & starts paid plan validity
  app.post('/api/admin/orders/:orderId/approve', (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    const orderId = String(req.params.orderId || '').trim().toUpperCase();
    const order = getPaymentOrderById(orderId);
    if (!order) {
      res.status(404).json({ ok: false, error: 'Order not found.' });
      return;
    }

    // Optional last-4 UTR double check if provided by owner console
    const confirmLast4 = String(req.body?.confirmUtrLast4 || '').replace(/\D/g, '').trim();
    if (confirmLast4 && order.utrRef.length === 12 && !order.utrRef.endsWith(confirmLast4)) {
      res.status(400).json({
        ok: false,
        error: 'Last 4 digits did not match this order UTR. Please re-check your GPay/Bank receipt.',
      });
      return;
    }

    const activated = activateOrderAndSubscription(order.orderId);
    if (!activated) {
      res.status(500).json({ ok: false, error: 'Failed to activate order subscription.' });
      return;
    }
    notifyOrderWatchers(activated.order);

    res.json({
      ok: true,
      order: {
        ...activated.order,
        isExpired: false,
      },
    });
  });

  // 8. Owner Admin: reject unpaid / invalid UTR request
  app.post('/api/admin/orders/:orderId/reject', (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    const orderId = String(req.params.orderId || '').trim().toUpperCase();
    const reason = String(req.body?.reason || '').trim().slice(0, 140);
    const updated = rejectPaymentOrder(orderId, reason);
    if (!updated) {
      res.status(404).json({ ok: false, error: 'Order not found.' });
      return;
    }
    notifyOrderWatchers(updated);
    res.json({ ok: true, order: updated });
  });

  // 9. Owner Admin: immediately revoke & lock an active Unlock Key & subscription
  app.post('/api/admin/orders/:orderId/revoke', (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    const orderId = String(req.params.orderId || '').trim().toUpperCase();
    const reason = String(req.body?.reason || '').trim().slice(0, 140);
    const updated = revokeOrderAndSubscription(orderId, reason);
    if (!updated) {
      res.status(404).json({ ok: false, error: 'Order not found.' });
      return;
    }
    notifyOrderWatchers(updated);
    res.json({ ok: true, order: updated });
  });

  // ---------------------------------------------------------------------------
  // KABADDI MULTI-DEVICE REMOTE CONTROL SYSTEM (Match ID + Secure PIN + LAN)
  // ---------------------------------------------------------------------------
  app.get('/api/remote/network-info', (_req, res) => {
    const lanIps = getLocalLanAddresses();
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      ok: true,
      port: PORT,
      lanIps,
      lanUrls: lanIps.map((ip) => `http://${ip}:${PORT}`),
    });
  });

  app.get('/api/remote/match/:matchId/info', (req, res) => {
    const matchId = sanitizeRoomId(req.params.matchId);
    const hasPin = remoteMatches.has(matchId);
    const state = getOrCreateRoom(matchId);
    const presence = getRemotePresence(matchId);
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      ok: true,
      matchId,
      pinProtected: hasPin,
      presence,
      summary: {
        teamAName: state.teamAName,
        teamBName: state.teamBName,
        teamAScore: state.teamAScore,
        teamBScore: state.teamBScore,
        kabaddiHalf: state.kabaddiHalf,
        matchStatus: state.matchStatus || 'LIVE',
      },
    });
  });

  // Create or configure a Match ID with a server-hashed Admin PIN (scrypt + random salt)
  app.post('/api/remote/match/create', (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const requestedMatch = typeof body.matchId === 'string' ? body.matchId.trim() : '';
    const matchId = requestedMatch ? sanitizeRoomId(requestedMatch) : generateUniqueMatchId();
    const pin = String(body.pin || '').trim();
    const currentPin = String(body.currentPin || '').trim();
    const deviceName = String(body.deviceName || 'vMix PC Operator').trim().slice(0, 32);

    if (pin.length < 4 || pin.length > 12) {
      res.status(400).json({
        ok: false,
        error: 'Admin PIN must be between 4 and 12 characters/digits.',
      });
      return;
    }

    const existing = remoteMatches.get(matchId);
    if (existing) {
      const bearer = extractBearerToken(req);
      const validSession = validateRemoteSession(bearer, matchId);
      const validCurrentPin =
        currentPin.length > 0 &&
        safeEqualStrings(hashPasswordScrypt(currentPin, existing.salt), existing.pinHash);
      if (!validSession && !validCurrentPin) {
        res.status(403).json({
          ok: false,
          error: 'This Match ID is already PIN-protected. Enter current PIN or generate a new Match ID.',
        });
        return;
      }
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const pinHash = hashPasswordScrypt(pin, salt);
    const now = Date.now();

    remoteMatches.set(matchId, {
      matchId,
      salt,
      pinHash,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    saveRemoteMatches();

    // Ensure room exists in Kabaddi mode
    const state = getOrCreateRoom(matchId);
    const token = createRemoteSession(matchId, deviceName);
    const presence = getRemotePresence(matchId);

    res.status(201).json({
      ok: true,
      matchId,
      pinProtected: true,
      token,
      state,
      version: getRoomVersion(matchId),
      serverNow: now,
      presence,
    });
  });

  // Authenticate any remote device (mobile, tablet, laptop) with Match ID + Admin PIN
  app.post('/api/remote/match/auth', (req, res) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const attempts = remoteAuthAttempts.get(ip);
    if (attempts && attempts.resetAt > now && attempts.count >= 15) {
      res.status(429).json({
        ok: false,
        error: 'Too many incorrect PIN attempts. Please wait 5 minutes and try again.',
      });
      return;
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const rawMatchId = String(body.matchId || '').trim();
    const pin = String(body.pin || '').trim();
    const deviceName = String(body.deviceName || 'Remote Controller').trim().slice(0, 32);

    if (!rawMatchId) {
      res.status(400).json({ ok: false, error: 'Please enter a valid Match ID.' });
      return;
    }

    const matchId = sanitizeRoomId(rawMatchId);
    const stored = remoteMatches.get(matchId);
    if (!stored) {
      res.status(404).json({
        ok: false,
        error:
          'Match ID has no Admin PIN configured yet. Open Kabaddi Studio on the vMix PC -> Remote Control -> Set PIN first.',
      });
      return;
    }

    const computed = hashPasswordScrypt(pin, stored.salt);
    if (!pin || !safeEqualStrings(computed, stored.pinHash)) {
      const nextCount = attempts && attempts.resetAt > now ? attempts.count + 1 : 1;
      remoteAuthAttempts.set(ip, { count: nextCount, resetAt: now + 5 * 60 * 1000 });
      res.status(401).json({ ok: false, error: 'Incorrect Admin PIN for this Match ID.' });
      return;
    }

    remoteAuthAttempts.delete(ip);
    const token = createRemoteSession(matchId, deviceName);
    const state = getOrCreateRoom(matchId);
    const presence = getRemotePresence(matchId);

    res.json({
      ok: true,
      matchId,
      token,
      deviceName,
      state,
      version: getRoomVersion(matchId),
      serverNow: now,
      presence,
      history: getHistoryInfo(matchId),
    });
  });

  app.post('/api/remote/match/:matchId/logout', (req, res) => {
    const token = extractBearerToken(req);
    if (token) {
      remoteSessions.delete(token);
    }
    res.json({ ok: true });
  });

  // Authenticated HTTP fallback write endpoint for remote controllers (when WebSocket is temporarily reconnecting)
  app.post('/api/remote/match/:matchId/update', (req, res) => {
    const matchId = sanitizeRoomId(req.params.matchId);
    const token = extractBearerToken(req);
    const session = validateRemoteSession(token, matchId);
    if (!session) {
      res.status(401).json({ ok: false, error: 'Remote session expired or unauthorized. Please re-enter Admin PIN.' });
      return;
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    let result;
    if (typeof body.action === 'string' && body.action.trim()) {
      result = applyKabaddiRemoteAction(
        matchId,
        body.action.trim(),
        body.payload && typeof body.payload === 'object' ? body.payload : {}
      );
    } else if (body.patch && typeof body.patch === 'object') {
      result = applyOverlayPatch(matchId, body.patch as Partial<LiveOverlayState>);
    } else {
      result = applyOverlayPatch(matchId, body as Partial<LiveOverlayState>);
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json({
      ok: true,
      state: result.state,
      version: result.version,
      serverNow: result.serverNow,
      connectedDisplays: result.presence.displays,
      presence: result.presence,
      history: result.history,
    });
  });

  // ---------------------------------------------------------------------------
  // LIVE BROADCAST OVERLAY SYNC (OBS & vMix WebSocket + SSE + Fast Polling)
  // ---------------------------------------------------------------------------
  app.get('/api/overlay/:roomId', (req, res) => {
    const roomId = sanitizeRoomId(req.params.roomId);
    const state = getOrCreateRoom(roomId);
    const version = getRoomVersion(roomId);
    const sinceVersion = Number(req.query.v || 0);
    const viewerId = String(req.query.viewer || '').trim().slice(0, 40);

    if (viewerId) {
      let viewers = pollViewers.get(roomId);
      if (!viewers) {
        viewers = new Map();
        pollViewers.set(roomId, viewers);
      }
      viewers.set(viewerId, Date.now());
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const presence = getRemotePresence(roomId);
    const history = getHistoryInfo(roomId);
    const connectedDisplays = presence.displays;
    const serverNow = Date.now();

    if (sinceVersion > 0 && sinceVersion === version) {
      res.json({ unchanged: true, version, serverNow, connectedDisplays, presence, history });
      return;
    }

    res.json({ state, version, serverNow, connectedDisplays, presence, history });
  });

  app.post('/api/overlay/:roomId', (req, res) => {
    const roomId = sanitizeRoomId(req.params.roomId);
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const result =
      typeof body.action === 'string' && body.action.trim()
        ? applyKabaddiRemoteAction(
            roomId,
            body.action.trim(),
            body.payload && typeof body.payload === 'object' ? body.payload : {}
          )
        : applyOverlayPatch(roomId, body as Partial<LiveOverlayState>);

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json({
      state: result.state,
      version: result.version,
      serverNow: result.serverNow,
      connectedDisplays: result.presence.displays,
      presence: result.presence,
      history: result.history,
    });
  });

  app.get('/api/overlay/:roomId/stream', (req, res) => {
    const roomId = sanitizeRoomId(req.params.roomId);
    const state = getOrCreateRoom(roomId);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-store, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let clients = sseClients.get(roomId);
    if (!clients) {
      clients = new Set();
      sseClients.set(roomId, clients);
    }
    clients.add(res);

    res.write('retry: 1500\n');
    broadcastRoomState(roomId, state);

    const heartbeat = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(heartbeat);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      clients?.delete(res);
      if (clients && clients.size > 0) {
        broadcastRoomState(roomId, getOrCreateRoom(roomId));
      }
    });
  });

  // Long-lived browser caching for pre-optimized web media assets
  app.use(
    '/assets/optimized',
    express.static(path.resolve(__dirname, 'public/assets/optimized'), {
      maxAge: '365d',
      immutable: true,
    })
  );

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  // Attach real WebSocketServer strictly on /ws/kabaddi so Vite's upgrade path is untouched
  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1.5 * 1024 * 1024 });

  httpServer.on('upgrade', (request, socket, head) => {
    try {
      const parsedUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
      if (parsedUrl.pathname !== '/ws/kabaddi') {
        return;
      }
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } catch {
      socket.destroy();
    }
  });

  wss.on('connection', (ws, request) => {
    const parsedUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    const roomId = sanitizeRoomId(parsedUrl.searchParams.get('room') || 'star-live-1');
    const rawRole = (parsedUrl.searchParams.get('role') || 'display').toLowerCase();
    const role: 'display' | 'controller' | 'studio' =
      rawRole === 'controller' ? 'controller' : rawRole === 'studio' ? 'studio' : 'display';
    const token = (parsedUrl.searchParams.get('token') || '').trim();
    const deviceName = (parsedUrl.searchParams.get('device') || 'Remote Controller').trim().slice(0, 32);

    // Enforce Admin PIN session validation for remote controllers
    let authenticatedDevice = deviceName;
    if (role === 'controller') {
      const session = validateRemoteSession(token, roomId);
      if (!session) {
        try {
          ws.send(JSON.stringify({ type: 'auth_error', error: 'Invalid or expired remote session.' }));
        } catch {
          // ignore
        }
        ws.close(4001, 'Unauthorized');
        return;
      }
      authenticatedDevice = session.deviceName || deviceName;
    }

    if (role === 'display') {
      let set = wsDisplays.get(roomId);
      if (!set) {
        set = new Set();
        wsDisplays.set(roomId, set);
      }
      set.add(ws);
    } else if (role === 'controller') {
      let map = wsControllers.get(roomId);
      if (!map) {
        map = new Map();
        wsControllers.set(roomId, map);
      }
      map.set(ws, { deviceName: authenticatedDevice, connectedAt: Date.now() });
    } else {
      // Studio dashboard listens to live updates & presence without inflating vMix display count
      let map = wsControllers.get(roomId);
      if (!map) {
        map = new Map();
        wsControllers.set(roomId, map);
      }
      map.set(ws, { deviceName: 'Studio Desk', connectedAt: Date.now() });
    }

    let isAlive = true;
    ws.on('pong', () => {
      isAlive = true;
    });

    const pingInterval = setInterval(() => {
      if (!isAlive) {
        clearInterval(pingInterval);
        ws.terminate();
        return;
      }
      isAlive = false;
      try {
        ws.ping();
      } catch {
        clearInterval(pingInterval);
      }
    }, 20000);

    // Broadcast updated presence + authoritative state immediately to everyone in this match
    const initialState = getOrCreateRoom(roomId);
    broadcastRoomState(roomId, initialState);

    ws.on('message', (rawData) => {
      if (role === 'display') return; // vMix/OBS displays are strictly read-only

      let msg: {
        type?: string;
        patch?: Partial<LiveOverlayState>;
        action?: string;
        payload?: Record<string, unknown>;
      };
      try {
        msg = JSON.parse(rawData.toString('utf8'));
      } catch {
        return;
      }

      if (msg.type === 'ping') {
        try {
          ws.send(JSON.stringify({ type: 'pong', serverNow: Date.now() }));
        } catch {
          // ignore
        }
        return;
      }

      if (role === 'controller') {
        // Re-check token validity on write in case session expired
        if (!validateRemoteSession(token, roomId)) {
          try {
            ws.send(JSON.stringify({ type: 'auth_error', error: 'Remote session expired.' }));
          } catch {
            // ignore
          }
          ws.close(4001, 'Session expired');
          return;
        }
      }

      if (msg.type === 'patch' && msg.patch && typeof msg.patch === 'object') {
        applyOverlayPatch(roomId, msg.patch);
      } else if (msg.type === 'action' && typeof msg.action === 'string') {
        applyKabaddiRemoteAction(
          roomId,
          msg.action,
          msg.payload && typeof msg.payload === 'object' ? msg.payload : {}
        );
      }
    });

    ws.on('close', () => {
      clearInterval(pingInterval);
      wsDisplays.get(roomId)?.delete(ws);
      wsControllers.get(roomId)?.delete(ws);
      const curr = rooms.get(roomId);
      if (curr) {
        broadcastRoomState(roomId, curr);
      }
    });

    ws.on('error', () => {
      clearInterval(pingInterval);
      wsDisplays.get(roomId)?.delete(ws);
      wsControllers.get(roomId)?.delete(ws);
    });
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Star Event Live server running on http://0.0.0.0:${PORT} (WebSocket /ws/kabaddi enabled)`);
  });
}

startServer();
