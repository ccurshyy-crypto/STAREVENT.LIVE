import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createDefaultOverlayState,
  type KabaddiGraphicPanel,
  type KabaddiHalf,
  type KabaddiMatchStatus,
  type KabaddiTimeoutTeam,
  type LiveOverlayState,
  type RemoteHistoryInfo,
} from '../src/types/overlay.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SERVER_BOOT_ID = `srv-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;

const MAX_HISTORY_STEPS = 40;
const MAX_TRACKED_TX_IDS = 250;

function resolveRoomsFilePath(): string {
  const localDataDir = path.resolve(__dirname, '..', 'data');
  try {
    fs.mkdirSync(localDataDir, { recursive: true });
    fs.accessSync(localDataDir, fs.constants.W_OK);
    return path.join(localDataDir, 'overlay-rooms.json');
  } catch {
    return path.join('/tmp', 'star-event-overlay-rooms.json');
  }
}

const ROOMS_FILE = resolveRoomsFilePath();

export function sanitizeRoomId(raw: string): string {
  const cleaned = String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '')
    .slice(0, 40);
  return cleaned || 'star-live-1';
}

export function getFirebaseDbBaseUrl(): string | null {
  const raw = (
    process.env.FIREBASE_DATABASE_URL ||
    process.env.VITE_FIREBASE_DATABASE_URL ||
    ''
  ).trim();
  if (!raw || !/^https:\/\/.+\.firebaseio\.com|^https:\/\/.+\.firebasedatabase\.app/i.test(raw)) {
    return null;
  }
  return raw.replace(/\/+$/, '');
}

function getFirebaseAuthQuery(): string {
  const secret = (process.env.FIREBASE_DATABASE_SECRET || '').trim();
  return secret ? `?auth=${encodeURIComponent(secret)}` : '';
}

export interface RoomRecord {
  state: LiveOverlayState;
  version: number;
  lastTxId?: string;
}

const rooms = new Map<string, LiveOverlayState>();
const roomVersions = new Map<string, number>();
const roomUndoStacks = new Map<string, LiveOverlayState[]>();
const roomRedoStacks = new Map<string, LiveOverlayState[]>();
const roomProcessedTxIds = new Map<string, string[]>();
const activeAlertTimers = new Map<string, ReturnType<typeof setTimeout>>();

let roomSaveTimer: ReturnType<typeof setTimeout> | null = null;
let loadedFromDisk = false;

export function loadPersistedRooms() {
  if (loadedFromDisk) return;
  loadedFromDisk = true;
  try {
    if (!fs.existsSync(ROOMS_FILE)) return;
    const raw = fs.readFileSync(ROOMS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      for (const [key, val] of Object.entries(parsed)) {
        if (val && typeof val === 'object') {
          const safeId = sanitizeRoomId(key);
          rooms.set(safeId, {
            ...createDefaultOverlayState(safeId),
            ...(val as Partial<LiveOverlayState>),
            roomId: safeId,
          });
          roomVersions.set(safeId, 1);
        }
      }
    }
  } catch {
    // Ignore corrupt cache
  }
}

export function scheduleSaveRooms(immediate = false) {
  const writeNow = () => {
    roomSaveTimer = null;
    try {
      const dir = path.dirname(ROOMS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const obj: Record<string, LiveOverlayState> = {};
      for (const [k, v] of rooms.entries()) {
        obj[k] = v;
      }
      fs.writeFileSync(ROOMS_FILE, JSON.stringify(obj), 'utf-8');
    } catch (err) {
      console.error('Failed to persist overlay rooms:', err);
    }
  };

  if (immediate) {
    if (roomSaveTimer) {
      clearTimeout(roomSaveTimer);
      roomSaveTimer = null;
    }
    writeNow();
    return;
  }

  if (roomSaveTimer) return;
  roomSaveTimer = setTimeout(writeNow, 250);
}

export async function pushRoomToFirebase(roomId: string, state: LiveOverlayState, version: number): Promise<void> {
  const baseUrl = getFirebaseDbBaseUrl();
  if (!baseUrl) return;
  const safeId = sanitizeRoomId(roomId);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    await fetch(
      `${baseUrl}/kabaddi_matches/${encodeURIComponent(safeId)}.json${getFirebaseAuthQuery()}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state,
          version,
          serverBootId: SERVER_BOOT_ID,
          updatedAt: state.updatedAt,
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
  } catch {
    // Non-fatal fallback; local/WS state remains authoritative
  }
}

export async function pullRoomFromFirebase(roomId: string): Promise<RoomRecord | null> {
  const baseUrl = getFirebaseDbBaseUrl();
  if (!baseUrl) return null;
  const safeId = sanitizeRoomId(roomId);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      `${baseUrl}/kabaddi_matches/${encodeURIComponent(safeId)}.json${getFirebaseAuthQuery()}`,
      { cache: 'no-store', signal: controller.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      state?: Partial<LiveOverlayState>;
      version?: number;
    } | null;
    if (!data || !data.state || typeof data.state !== 'object') return null;

    const merged: LiveOverlayState = {
      ...createDefaultOverlayState(safeId),
      ...data.state,
      roomId: safeId,
    };
    const remoteVer = typeof data.version === 'number' && data.version > 0 ? data.version : 1;
    const localState = rooms.get(safeId);
    const localVer = roomVersions.get(safeId) ?? 0;

    if (!localState || merged.updatedAt > localState.updatedAt || remoteVer > localVer) {
      rooms.set(safeId, merged);
      roomVersions.set(safeId, Math.max(remoteVer, localVer));
    }

    return {
      state: rooms.get(safeId)!,
      version: roomVersions.get(safeId) ?? 1,
    };
  } catch {
    return null;
  }
}

export function getOrCreateRoom(roomId: string): LiveOverlayState {
  loadPersistedRooms();
  const safeId = sanitizeRoomId(roomId);
  let state = rooms.get(safeId);
  if (!state) {
    state = createDefaultOverlayState(safeId);
    rooms.set(safeId, state);
    roomVersions.set(safeId, 1);
  }
  return state;
}

export function getRoomVersion(roomId: string): number {
  const safeId = sanitizeRoomId(roomId);
  return roomVersions.get(safeId) ?? 1;
}

export function hasRoom(roomId: string): boolean {
  return rooms.has(sanitizeRoomId(roomId));
}

export function getHistoryInfo(roomId: string): RemoteHistoryInfo {
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

export function computeLiveMatchSeconds(state: LiveOverlayState, now: number): number {
  if (!state.matchRunning) return Math.max(0, state.matchSeconds);
  const elapsed = Math.floor(Math.max(0, now - state.matchUpdatedAt) / 1000);
  return Math.max(0, state.matchSeconds - elapsed);
}

export function computeLiveRaidSeconds(state: LiveOverlayState, now: number): number {
  if (!state.raidRunning) return Math.max(0, state.raidSeconds);
  const elapsed = Math.floor(Math.max(0, now - state.raidUpdatedAt) / 1000);
  return Math.max(0, state.raidSeconds - elapsed);
}

function snapshotStateForHistory(state: LiveOverlayState, now: number): LiveOverlayState {
  return {
    ...state,
    matchSeconds: computeLiveMatchSeconds(state, now),
    raidSeconds: computeLiveRaidSeconds(state, now),
    kabaddiAlert: null,
  };
}

function isDuplicateTx(roomId: string, txId?: string): boolean {
  if (!txId || !txId.trim()) return false;
  const list = roomProcessedTxIds.get(roomId);
  return Boolean(list && list.includes(txId));
}

function recordTx(roomId: string, txId?: string) {
  if (!txId || !txId.trim()) return;
  let list = roomProcessedTxIds.get(roomId);
  if (!list) {
    list = [];
    roomProcessedTxIds.set(roomId, list);
  }
  list.push(txId);
  if (list.length > MAX_TRACKED_TX_IDS) {
    list.splice(0, list.length - MAX_TRACKED_TX_IDS);
  }
}

export interface MutationOptions {
  recordHistory?: boolean;
  txId?: string;
  sourceClientId?: string;
  immediateSave?: boolean;
  onBroadcast?: (roomId: string, state: LiveOverlayState, meta?: { txId?: string; sourceClientId?: string }) => void;
}

export interface MutationResult {
  state: LiveOverlayState;
  version: number;
  serverNow: number;
  serverBootId: string;
  history: RemoteHistoryInfo;
  duplicate?: boolean;
  txId?: string;
  sourceClientId?: string;
}

export function applyOverlayPatchEngine(
  roomId: string,
  rawPatch: Partial<LiveOverlayState>,
  options: MutationOptions = {}
): MutationResult {
  const safeId = sanitizeRoomId(roomId);
  const current = getOrCreateRoom(safeId);
  const now = Date.now();

  if (isDuplicateTx(safeId, options.txId)) {
    return {
      state: current,
      version: getRoomVersion(safeId),
      serverNow: now,
      serverBootId: SERVER_BOOT_ID,
      history: getHistoryInfo(safeId),
      duplicate: true,
      txId: options.txId,
      sourceClientId: options.sourceClientId,
    };
  }

  recordTx(safeId, options.txId);

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

  // Normalize timer timestamps strictly against authoritative server clock (zero clock skew across PCs)
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

  // Clamp numerical Kabaddi fields safely
  if (typeof normalizedPatch.teamAScore === 'number') {
    normalizedPatch.teamAScore = Math.max(0, Math.round(normalizedPatch.teamAScore));
  }
  if (typeof normalizedPatch.teamBScore === 'number') {
    normalizedPatch.teamBScore = Math.max(0, Math.round(normalizedPatch.teamBScore));
  }
  if (typeof normalizedPatch.teamAPlayersOnMat === 'number') {
    normalizedPatch.teamAPlayersOnMat = Math.max(0, Math.min(7, Math.round(normalizedPatch.teamAPlayersOnMat)));
  }
  if (typeof normalizedPatch.teamBPlayersOnMat === 'number') {
    normalizedPatch.teamBPlayersOnMat = Math.max(0, Math.min(7, Math.round(normalizedPatch.teamBPlayersOnMat)));
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
  scheduleSaveRooms(Boolean(options.immediateSave));
  void pushRoomToFirebase(safeId, nextState, nextVersion);

  options.onBroadcast?.(safeId, nextState, {
    txId: options.txId,
    sourceClientId: options.sourceClientId,
  });

  return {
    state: nextState,
    version: nextVersion,
    serverNow: now,
    serverBootId: SERVER_BOOT_ID,
    history: getHistoryInfo(safeId),
    txId: options.txId,
    sourceClientId: options.sourceClientId,
  };
}

function scheduleAlertClear(
  roomId: string,
  ms: number,
  onBroadcast?: MutationOptions['onBroadcast']
) {
  const prev = activeAlertTimers.get(roomId);
  if (prev) clearTimeout(prev);
  const timer = setTimeout(() => {
    activeAlertTimers.delete(roomId);
    const curr = rooms.get(roomId);
    if (curr && curr.kabaddiAlert) {
      applyOverlayPatchEngine(
        roomId,
        { kabaddiAlert: null },
        { recordHistory: false, onBroadcast }
      );
    }
  }, ms);
  activeAlertTimers.set(roomId, timer);
}

export function applyKabaddiActionEngine(
  roomId: string,
  action: string,
  payload: Record<string, unknown> = {},
  options: MutationOptions = {}
): MutationResult {
  const safeId = sanitizeRoomId(roomId);
  const current = getOrCreateRoom(safeId);
  const now = Date.now();

  if (isDuplicateTx(safeId, options.txId)) {
    return {
      state: current,
      version: getRoomVersion(safeId),
      serverNow: now,
      serverBootId: SERVER_BOOT_ID,
      history: getHistoryInfo(safeId),
      duplicate: true,
      txId: options.txId,
      sourceClientId: options.sourceClientId,
    };
  }

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
      if (alertText) patch.kabaddiAlert = alertText;
      const res = applyOverlayPatchEngine(safeId, patch, options);
      if (alertText && !options.immediateSave) scheduleAlertClear(safeId, 2200, options.onBroadcast);
      return res;
    }

    case 'raid': {
      const delta = Math.max(-6, Math.min(6, Math.round(Number(payload.points ?? payload.delta ?? 1))));
      const label =
        delta >= 3
          ? `SUPER RAID! +${delta} ${teamLabel}`
          : delta > 0
            ? `${teamLabel} · RAID +${delta}`
            : null;
      const patch: Partial<LiveOverlayState> =
        team === 'A'
          ? {
              mode: 'kabaddi',
              teamAScore: Math.max(0, current.teamAScore + delta),
              teamARaidPoints: Math.max(0, (current.teamARaidPoints ?? 0) + delta),
              ...(label ? { kabaddiAlert: label } : {}),
            }
          : {
              mode: 'kabaddi',
              teamBScore: Math.max(0, current.teamBScore + delta),
              teamBRaidPoints: Math.max(0, (current.teamBRaidPoints ?? 0) + delta),
              ...(label ? { kabaddiAlert: label } : {}),
            };
      const res = applyOverlayPatchEngine(safeId, patch, options);
      if (label && !options.immediateSave) scheduleAlertClear(safeId, 2000, options.onBroadcast);
      return res;
    }

    case 'bonus': {
      const delta = Math.max(-4, Math.min(4, Math.round(Number(payload.points ?? payload.delta ?? 1))));
      const label = delta > 0 ? `${teamLabel} · BONUS +${delta}` : null;
      const patch: Partial<LiveOverlayState> =
        team === 'A'
          ? {
              mode: 'kabaddi',
              teamAScore: Math.max(0, current.teamAScore + delta),
              teamABonusPoints: Math.max(0, (current.teamABonusPoints ?? 0) + delta),
              ...(label ? { kabaddiAlert: label } : {}),
            }
          : {
              mode: 'kabaddi',
              teamBScore: Math.max(0, current.teamBScore + delta),
              teamBBonusPoints: Math.max(0, (current.teamBBonusPoints ?? 0) + delta),
              ...(label ? { kabaddiAlert: label } : {}),
            };
      const res = applyOverlayPatchEngine(safeId, patch, options);
      if (label && !options.immediateSave) scheduleAlertClear(safeId, 2000, options.onBroadcast);
      return res;
    }

    case 'lona': {
      const delta = Math.max(-5, Math.min(5, Math.round(Number(payload.points ?? payload.delta ?? 2))));
      const label = delta > 0 ? `ALL OUT / LONA +${delta} · ${teamLabel}` : null;
      const patch: Partial<LiveOverlayState> =
        team === 'A'
          ? {
              mode: 'kabaddi',
              teamAScore: Math.max(0, current.teamAScore + delta),
              teamALonaPoints: Math.max(0, (current.teamALonaPoints ?? 0) + delta),
              ...(delta > 0 ? { teamBPlayersOnMat: 7 } : {}),
              ...(label ? { kabaddiAlert: label } : {}),
            }
          : {
              mode: 'kabaddi',
              teamBScore: Math.max(0, current.teamBScore + delta),
              teamBLonaPoints: Math.max(0, (current.teamBLonaPoints ?? 0) + delta),
              ...(delta > 0 ? { teamAPlayersOnMat: 7 } : {}),
              ...(label ? { kabaddiAlert: label } : {}),
            };
      const res = applyOverlayPatchEngine(safeId, patch, options);
      if (label && !options.immediateSave) scheduleAlertClear(safeId, 2500, options.onBroadcast);
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
      const res = applyOverlayPatchEngine(safeId, patch, options);
      if (!options.immediateSave) scheduleAlertClear(safeId, 2200, options.onBroadcast);
      return res;
    }

    case 'all_out': {
      const pts = Math.max(1, Math.min(4, Math.round(Number(payload.points ?? 2))));
      const label = `ALL OUT! +${pts} ${teamLabel}`;
      const patch: Partial<LiveOverlayState> =
        team === 'A'
          ? {
              mode: 'kabaddi',
              teamAScore: current.teamAScore + pts,
              teamALonaPoints: Math.max(0, (current.teamALonaPoints ?? 0) + pts),
              teamBPlayersOnMat: 7,
              kabaddiAlert: label,
            }
          : {
              mode: 'kabaddi',
              teamBScore: current.teamBScore + pts,
              teamBLonaPoints: Math.max(0, (current.teamBLonaPoints ?? 0) + pts),
              teamAPlayersOnMat: 7,
              kabaddiAlert: label,
            };
      const res = applyOverlayPatchEngine(safeId, patch, options);
      if (!options.immediateSave) scheduleAlertClear(safeId, 2600, options.onBroadcast);
      return res;
    }

    case 'players_on_mat': {
      const count = Math.max(0, Math.min(7, Math.round(Number(payload.count ?? 7))));
      return applyOverlayPatchEngine(
        safeId,
        team === 'A' ? { mode: 'kabaddi', teamAPlayersOnMat: count } : { mode: 'kabaddi', teamBPlayersOnMat: count },
        options
      );
    }

    case 'card': {
      const card = String(payload.card || 'yellow').toLowerCase();
      if (card === 'yellow') {
        const res = applyOverlayPatchEngine(
          safeId,
          team === 'A'
            ? {
                mode: 'kabaddi',
                teamAYellowCards: (current.teamAYellowCards ?? 0) + 1,
                teamABinEndAt: now + 2 * 60 * 1000,
                kabaddiAlert: `YELLOW CARD · ${teamLabel} (2 MIN BIN)`,
              }
            : {
                mode: 'kabaddi',
                teamBYellowCards: (current.teamBYellowCards ?? 0) + 1,
                teamBBinEndAt: now + 2 * 60 * 1000,
                kabaddiAlert: `YELLOW CARD · ${teamLabel} (2 MIN BIN)`,
              },
          options
        );
        if (!options.immediateSave) scheduleAlertClear(safeId, 2400, options.onBroadcast);
        return res;
      }
      if (card === 'red') {
        const res = applyOverlayPatchEngine(
          safeId,
          team === 'A'
            ? {
                mode: 'kabaddi',
                teamARedCards: (current.teamARedCards ?? 0) + 1,
                kabaddiAlert: `RED CARD · ${teamLabel}`,
              }
            : {
                mode: 'kabaddi',
                teamBRedCards: (current.teamBRedCards ?? 0) + 1,
                kabaddiAlert: `RED CARD · ${teamLabel}`,
              },
          options
        );
        if (!options.immediateSave) scheduleAlertClear(safeId, 2400, options.onBroadcast);
        return res;
      }
      const res = applyOverlayPatchEngine(
        safeId,
        team === 'A'
          ? {
              mode: 'kabaddi',
              teamAGreenCards: (current.teamAGreenCards ?? 0) + 1,
              kabaddiAlert: `GREEN CARD WARNING · ${teamLabel}`,
            }
          : {
              mode: 'kabaddi',
              teamBGreenCards: (current.teamBGreenCards ?? 0) + 1,
              kabaddiAlert: `GREEN CARD WARNING · ${teamLabel}`,
            },
        options
      );
      if (!options.immediateSave) scheduleAlertClear(safeId, 2200, options.onBroadcast);
      return res;
    }

    case 'do_or_die': {
      const next = typeof payload.active === 'boolean' ? payload.active : !current.doOrDie;
      return applyOverlayPatchEngine(safeId, { mode: 'kabaddi', doOrDie: next }, options);
    }

    case 'graphic_panel': {
      const validPanels: KabaddiGraphicPanel[] = [
        'none',
        'starting7',
        'player_stats',
        'match_stats',
        'knockout',
        'substitutions',
        'winners',
      ];
      const panel = validPanels.includes(payload.panel as KabaddiGraphicPanel)
        ? (payload.panel as KabaddiGraphicPanel)
        : 'none';
      return applyOverlayPatchEngine(
        safeId,
        { mode: 'kabaddi', visible: true, kabaddiGraphicPanel: panel },
        options
      );
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
      const res = applyOverlayPatchEngine(
        safeId,
        {
          mode: 'kabaddi',
          matchStatus: 'TIMEOUT',
          timeoutTeam: target,
          matchRunning: false,
          matchSeconds: liveMatchSec,
          raidRunning: false,
          raidSeconds: liveRaidSec,
          kabaddiAlert: timeoutTitle,
        },
        options
      );
      if (!options.immediateSave) scheduleAlertClear(safeId, 2600, options.onBroadcast);
      return res;
    }

    case 'clear_timeout': {
      return applyOverlayPatchEngine(
        safeId,
        {
          matchStatus: 'LIVE',
          timeoutTeam: null,
          kabaddiAlert: null,
        },
        options
      );
    }

    case 'half': {
      const validHalves: KabaddiHalf[] = ['1ST HALF', '2ND HALF', 'HALF TIME', 'FULL TIME'];
      const half = validHalves.includes(payload.half as KabaddiHalf)
        ? (payload.half as KabaddiHalf)
        : '1ST HALF';
      const nextStatus: KabaddiMatchStatus =
        half === 'HALF TIME' ? 'HALF TIME' : half === 'FULL TIME' ? 'FULL TIME' : 'LIVE';
      const shouldPause = half === 'HALF TIME' || half === 'FULL TIME';
      return applyOverlayPatchEngine(
        safeId,
        {
          kabaddiHalf: half,
          matchStatus: nextStatus,
          timeoutTeam: null,
          ...(shouldPause
            ? { matchRunning: false, matchSeconds: computeLiveMatchSeconds(current, now) }
            : {}),
        },
        options
      );
    }

    case 'status': {
      const validStatuses: KabaddiMatchStatus[] = ['LIVE', 'PAUSED', 'TIMEOUT', 'HALF TIME', 'FULL TIME'];
      const status = validStatuses.includes(payload.status as KabaddiMatchStatus)
        ? (payload.status as KabaddiMatchStatus)
        : 'LIVE';
      const shouldPause = status !== 'LIVE';
      return applyOverlayPatchEngine(
        safeId,
        {
          matchStatus: status,
          timeoutTeam: status === 'TIMEOUT' ? current.timeoutTeam || 'OFFICIAL' : null,
          ...(status === 'HALF TIME' ? { kabaddiHalf: 'HALF TIME' } : {}),
          ...(status === 'FULL TIME' ? { kabaddiHalf: 'FULL TIME' } : {}),
          ...(shouldPause
            ? { matchRunning: false, matchSeconds: computeLiveMatchSeconds(current, now) }
            : {}),
        },
        options
      );
    }

    case 'timer_toggle': {
      const liveSec = computeLiveMatchSeconds(current, now);
      if (current.matchRunning) {
        return applyOverlayPatchEngine(
          safeId,
          {
            matchRunning: false,
            matchSeconds: liveSec,
            matchStatus: current.matchStatus === 'LIVE' ? 'PAUSED' : current.matchStatus,
          },
          options
        );
      }
      const fallbackDur = current.kabaddiMatchDuration || 1200;
      return applyOverlayPatchEngine(
        safeId,
        {
          matchRunning: true,
          matchSeconds: liveSec === 0 ? fallbackDur : liveSec,
          matchStatus: 'LIVE',
          timeoutTeam: null,
        },
        options
      );
    }

    case 'timer_set': {
      const sec = Math.max(0, Math.min(99 * 60, Math.round(Number(payload.seconds ?? 1200))));
      const autoStart = payload.autoStart !== false;
      return applyOverlayPatchEngine(
        safeId,
        {
          matchSeconds: sec,
          matchRunning: autoStart,
          matchStatus: autoStart ? 'LIVE' : current.matchStatus === 'LIVE' ? 'PAUSED' : current.matchStatus || 'PAUSED',
          timeoutTeam: autoStart ? null : current.timeoutTeam,
        },
        options
      );
    }

    case 'timer_adjust': {
      const delta = Math.max(-600, Math.min(600, Math.round(Number(payload.delta ?? 0))));
      const liveSec = computeLiveMatchSeconds(current, now);
      return applyOverlayPatchEngine(
        safeId,
        {
          matchSeconds: Math.max(0, Math.min(99 * 60, liveSec + delta)),
        },
        options
      );
    }

    case 'timer_reset': {
      const sec = Math.max(0, Math.min(99 * 60, Math.round(Number(payload.seconds ?? current.kabaddiMatchDuration ?? 1200))));
      const autoStart = payload.autoStart === true;
      return applyOverlayPatchEngine(
        safeId,
        {
          matchSeconds: sec,
          matchRunning: autoStart,
          matchStatus: autoStart ? 'LIVE' : 'PAUSED',
          timeoutTeam: null,
        },
        options
      );
    }

    case 'raid_toggle': {
      const liveRaid = computeLiveRaidSeconds(current, now);
      const dur = current.kabaddiRaidDuration || 30;
      if (current.raidRunning) {
        return applyOverlayPatchEngine(safeId, { raidRunning: false, raidSeconds: liveRaid }, options);
      }
      return applyOverlayPatchEngine(
        safeId,
        {
          raidRunning: true,
          raidSeconds: liveRaid === 0 ? dur : liveRaid,
        },
        options
      );
    }

    case 'raid_reset': {
      const dur = Math.max(5, Math.min(90, Math.round(Number(payload.seconds ?? current.kabaddiRaidDuration ?? 30))));
      return applyOverlayPatchEngine(safeId, { raidRunning: false, raidSeconds: dur }, options);
    }

    case 'swap': {
      return applyOverlayPatchEngine(
        safeId,
        {
          teamAName: current.teamBName,
          teamACode: current.teamBCode,
          teamAColor: current.teamBColor,
          teamAScore: current.teamBScore,
          teamARaidPoints: current.teamBRaidPoints ?? 0,
          teamABonusPoints: current.teamBBonusPoints ?? 0,
          teamATacklePoints: current.teamBTacklePoints ?? 0,
          teamALonaPoints: current.teamBLonaPoints ?? 0,
          teamAPlayersOnMat: current.teamBPlayersOnMat ?? 7,
          teamALogoUrl: current.teamBLogoUrl,
          teamAGreenCards: current.teamBGreenCards ?? 0,
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
          teamBLonaPoints: current.teamALonaPoints ?? 0,
          teamBPlayersOnMat: current.teamAPlayersOnMat ?? 7,
          teamBLogoUrl: current.teamALogoUrl,
          teamBGreenCards: current.teamAGreenCards ?? 0,
          teamBYellowCards: current.teamAYellowCards,
          teamBRedCards: current.teamARedCards,
          teamBBinEndAt: current.teamABinEndAt,
        },
        options
      );
    }

    case 'undo': {
      recordTx(safeId, options.txId);
      const undoStack = roomUndoStacks.get(safeId);
      if (!undoStack || undoStack.length === 0) {
        return {
          state: current,
          version: getRoomVersion(safeId),
          serverNow: now,
          serverBootId: SERVER_BOOT_ID,
          history: getHistoryInfo(safeId),
          txId: options.txId,
          sourceClientId: options.sourceClientId,
        };
      }
      const prevSnapshot = undoStack.pop()!;
      let redoStack = roomRedoStacks.get(safeId);
      if (!redoStack) {
        redoStack = [];
        roomRedoStacks.set(safeId, redoStack);
      }
      redoStack.push(snapshotStateForHistory(current, now));
      if (redoStack.length > MAX_HISTORY_STEPS) redoStack.shift();

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
      scheduleSaveRooms(Boolean(options.immediateSave));
      void pushRoomToFirebase(safeId, restored, nextVersion);
      options.onBroadcast?.(safeId, restored, {
        txId: options.txId,
        sourceClientId: options.sourceClientId,
      });
      return {
        state: restored,
        version: nextVersion,
        serverNow: now,
        serverBootId: SERVER_BOOT_ID,
        history: getHistoryInfo(safeId),
        txId: options.txId,
        sourceClientId: options.sourceClientId,
      };
    }

    case 'redo': {
      recordTx(safeId, options.txId);
      const redoStack = roomRedoStacks.get(safeId);
      if (!redoStack || redoStack.length === 0) {
        return {
          state: current,
          version: getRoomVersion(safeId),
          serverNow: now,
          serverBootId: SERVER_BOOT_ID,
          history: getHistoryInfo(safeId),
          txId: options.txId,
          sourceClientId: options.sourceClientId,
        };
      }
      const nextSnapshot = redoStack.pop()!;
      let undoStack = roomUndoStacks.get(safeId);
      if (!undoStack) {
        undoStack = [];
        roomUndoStacks.set(safeId, undoStack);
      }
      undoStack.push(snapshotStateForHistory(current, now));
      if (undoStack.length > MAX_HISTORY_STEPS) undoStack.shift();

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
      scheduleSaveRooms(Boolean(options.immediateSave));
      void pushRoomToFirebase(safeId, restored, nextVersion);
      options.onBroadcast?.(safeId, restored, {
        txId: options.txId,
        sourceClientId: options.sourceClientId,
      });
      return {
        state: restored,
        version: nextVersion,
        serverNow: now,
        serverBootId: SERVER_BOOT_ID,
        history: getHistoryInfo(safeId),
        txId: options.txId,
        sourceClientId: options.sourceClientId,
      };
    }

    case 'reset': {
      const matchDur = current.kabaddiMatchDuration || 1200;
      const raidDur = current.kabaddiRaidDuration || 30;
      return applyOverlayPatchEngine(
        safeId,
        {
          teamAScore: 0,
          teamBScore: 0,
          teamARaidPoints: 0,
          teamABonusPoints: 0,
          teamATacklePoints: 0,
          teamALonaPoints: 0,
          teamAPlayersOnMat: 7,
          teamBRaidPoints: 0,
          teamBBonusPoints: 0,
          teamBTacklePoints: 0,
          teamBLonaPoints: 0,
          teamBPlayersOnMat: 7,
          teamAGreenCards: 0,
          teamAYellowCards: 0,
          teamARedCards: 0,
          teamBGreenCards: 0,
          teamBYellowCards: 0,
          teamBRedCards: 0,
          teamABinEndAt: null,
          teamBBinEndAt: null,
          matchSeconds: matchDur,
          matchRunning: false,
          raidSeconds: raidDur,
          raidRunning: false,
          kabaddiHalf: '1ST HALF',
          matchStatus: 'LIVE',
          timeoutTeam: null,
          doOrDie: false,
          kabaddiAlert: null,
          kabaddiGraphicPanel: 'none',
        },
        options
      );
    }

    default:
      return {
        state: current,
        version: getRoomVersion(safeId),
        serverNow: now,
        serverBootId: SERVER_BOOT_ID,
        history: getHistoryInfo(safeId),
        txId: options.txId,
        sourceClientId: options.sourceClientId,
      };
  }
}
