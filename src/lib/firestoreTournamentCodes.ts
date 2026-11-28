import {
  collection,
  doc,
  getDocsFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';

export const TOURNAMENT_UNLOCK_CODES_COLLECTION = 'tournamentUnlockCodes';
export const TOURNAMENT_PRICE_PER_DAY_INR = 99;
export const MIN_TOURNAMENT_UNLOCK_DAYS = 1;
export const MAX_TOURNAMENT_UNLOCK_DAYS = 365;
export const OWNER_ADMIN_EMAIL = 'ccurshyy@gmail.com';
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export type FirestoreUnlockCodeStatus =
  | 'ACTIVE'
  | 'REDEEMED'
  | 'USED'
  | 'EXPIRED'
  | 'REVOKED';

export interface FirestoreTournamentUnlockCode {
  id: string;
  unlockCode: string;
  durationDays: number;
  amount: number;
  customerNote: string;
  lockedCustomerId: string | null;
  status: FirestoreUnlockCodeStatus;
  effectiveStatus: FirestoreUnlockCodeStatus;
  createdAtIso: string;
  expiresAtIso: string;
  expiresAtMs: number;
  redeemedAtIso: string | null;
  redeemedBy: string | null;
  redeemedByUid: string | null;
  tournamentId: string | null;
  tournamentName: string | null;
  createdBy: string;
  updatedAtIso: string;
  isExpired: boolean;
  remainingDays: number;
}

export interface LegacySupabaseCodeRow {
  code: string;
  duration_days: number;
  price_per_day_inr?: number;
  total_price_inr?: number;
  assigned_customer_id?: string | null;
  customer_label?: string | null;
  status?: string;
  created_at?: string | null;
  redeemed_by_customer_id?: string | null;
  redeemed_by_name?: string | null;
  redeemed_at?: string | null;
  consumed_tournament_id?: string | null;
  consumed_tournament_name?: string | null;
  revoked_at?: string | null;
}

export function isFirebaseOwnerAdminUser(user: User | null | undefined): boolean {
  if (!user || !user.emailVerified || !user.email) return false;
  return user.email.trim().toLowerCase() === OWNER_ADMIN_EMAIL;
}

export function normalizeUnlockCode(raw: string): string {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 40);
}

export function sanitizeLockedCustomerId(raw: string | null | undefined): string | null {
  const clean = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 48);
  return clean.length >= 2 ? clean : null;
}

function randomCodeSegment(length: number): string {
  const bytes = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

export function buildUnlockCodeString(durationDays: number): string {
  return `TRN-${durationDays}D-${randomCodeSegment(4)}-${randomCodeSegment(4)}`;
}

function toIsoString(val: unknown, fallbackIso: string): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (val && typeof val === 'object' && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    try {
      return (val as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return fallbackIso;
    }
  }
  if (typeof val === 'string' && val.trim()) {
    const parsed = Date.parse(val);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  }
  return fallbackIso;
}

function toNullableIsoString(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const iso = toIsoString(val, '');
  return iso || null;
}

function toTimestampMs(val: unknown): number {
  if (val instanceof Timestamp) return val.toMillis();
  if (val && typeof val === 'object' && 'toMillis' in val && typeof (val as { toMillis: () => number }).toMillis === 'function') {
    try {
      return (val as { toMillis: () => number }).toMillis();
    } catch {
      return 0;
    }
  }
  if (typeof val === 'string') {
    const parsed = Date.parse(val);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function mapDocToUnlockCode(
  docId: string,
  data: DocumentData,
  nowMs: number = Date.now()
): FirestoreTournamentUnlockCode {
  const nowIso = new Date(nowMs).toISOString();
  const durationDays = Math.max(
    MIN_TOURNAMENT_UNLOCK_DAYS,
    Math.min(MAX_TOURNAMENT_UNLOCK_DAYS, Math.floor(Number(data.durationDays) || 1))
  );
  const amount =
    typeof data.amount === 'number' && Number.isFinite(data.amount)
      ? Math.floor(data.amount)
      : durationDays * TOURNAMENT_PRICE_PER_DAY_INR;

  const createdAtIso = toIsoString(data.originalCreatedAt ?? data.createdAt, nowIso);
  const createdAtMs = Date.parse(createdAtIso) || nowMs;
  const rawExpiresMs = toTimestampMs(data.expiresAt);
  const expiresAtMs = rawExpiresMs > 0 ? rawExpiresMs : createdAtMs + durationDays * MS_PER_DAY;
  const expiresAtIso = new Date(expiresAtMs).toISOString();

  const rawStatus = String(data.status || 'ACTIVE').toUpperCase();
  const storedStatus: FirestoreUnlockCodeStatus =
    rawStatus === 'REDEEMED' ||
    rawStatus === 'USED' ||
    rawStatus === 'EXPIRED' ||
    rawStatus === 'REVOKED'
      ? rawStatus
      : 'ACTIVE';

  const isTimeExpired = nowMs >= expiresAtMs;
  const isExpired =
    storedStatus === 'EXPIRED' || (storedStatus === 'ACTIVE' && isTimeExpired);

  const effectiveStatus: FirestoreUnlockCodeStatus =
    storedStatus === 'REVOKED'
      ? 'REVOKED'
      : storedStatus === 'REDEEMED' || storedStatus === 'USED'
        ? storedStatus
        : isExpired
          ? 'EXPIRED'
          : 'ACTIVE';

  const remainingMs = Math.max(0, expiresAtMs - nowMs);
  const remainingDays =
    effectiveStatus === 'ACTIVE'
      ? Math.max(1, Math.ceil(remainingMs / MS_PER_DAY))
      : 0;

  return {
    id: String(data.id || docId),
    unlockCode: String(data.unlockCode || docId),
    durationDays,
    amount,
    customerNote: typeof data.customerNote === 'string' ? data.customerNote : '',
    lockedCustomerId:
      typeof data.lockedCustomerId === 'string' && data.lockedCustomerId.trim()
        ? data.lockedCustomerId.trim().toUpperCase()
        : null,
    status: storedStatus,
    effectiveStatus,
    createdAtIso,
    expiresAtIso,
    expiresAtMs,
    redeemedAtIso: toNullableIsoString(data.redeemedAt),
    redeemedBy:
      typeof data.redeemedBy === 'string' && data.redeemedBy.trim()
        ? data.redeemedBy.trim()
        : null,
    redeemedByUid:
      typeof data.redeemedByUid === 'string' && data.redeemedByUid.trim()
        ? data.redeemedByUid.trim()
        : null,
    tournamentId:
      typeof data.tournamentId === 'string' && data.tournamentId.trim()
        ? data.tournamentId.trim()
        : null,
    tournamentName:
      typeof data.tournamentName === 'string' && data.tournamentName.trim()
        ? data.tournamentName.trim()
        : null,
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : '',
    updatedAtIso: toIsoString(data.updatedAt, createdAtIso),
    isExpired,
    remainingDays,
  };
}

/**
 * Generates a unique random Tournament Unlock Code and permanently saves it
 * in Cloud Firestore (`tournamentUnlockCodes/{unlockCode}`) inside an atomic transaction.
 * Never resolves until Firestore confirms the write.
 */
export async function generateTournamentUnlockCodeInFirestore(params: {
  durationDays: number;
  customerNote?: string;
  lockedCustomerId?: string;
}): Promise<FirestoreTournamentUnlockCode> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    throw new Error('Please sign in with your verified Admin Google account first.');
  }
  if (!isFirebaseOwnerAdminUser(currentUser)) {
    throw new Error(`Only the verified Admin account (${OWNER_ADMIN_EMAIL}) can generate unlock codes.`);
  }

  const days = Math.floor(Number(params.durationDays));
  if (!Number.isFinite(days) || days < MIN_TOURNAMENT_UNLOCK_DAYS || days > MAX_TOURNAMENT_UNLOCK_DAYS) {
    throw new Error(
      `Duration must be between ${MIN_TOURNAMENT_UNLOCK_DAYS} and ${MAX_TOURNAMENT_UNLOCK_DAYS} days.`
    );
  }

  const amount = days * TOURNAMENT_PRICE_PER_DAY_INR;
  const customerNote = String(params.customerNote || '').trim().slice(0, 120);
  const lockedCustomerId = sanitizeLockedCustomerId(params.lockedCustomerId);

  let lastError: unknown = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const unlockCode = buildUnlockCodeString(days);
    const codeRef = doc(db, TOURNAMENT_UNLOCK_CODES_COLLECTION, unlockCode);
    const nowMs = Date.now();
    const expiresAtMs = nowMs + days * MS_PER_DAY;
    const expiresAtTs = Timestamp.fromMillis(expiresAtMs);

    try {
      const created = await runTransaction(db, async (tx) => {
        const snap = await tx.get(codeRef);
        if (snap.exists()) {
          return null;
        }
        const payload = {
          id: unlockCode,
          unlockCode,
          durationDays: days,
          amount,
          customerNote,
          lockedCustomerId,
          status: 'ACTIVE' as const,
          createdAt: serverTimestamp(),
          expiresAt: expiresAtTs,
          redeemedAt: null,
          redeemedBy: null,
          redeemedByUid: null,
          tournamentId: null,
          tournamentName: null,
          createdBy: currentUser.uid,
          updatedAt: serverTimestamp(),
        };
        tx.set(codeRef, payload);
        return payload;
      });

      if (created) {
        return mapDocToUnlockCode(
          unlockCode,
          {
            ...created,
            createdAt: Timestamp.fromMillis(nowMs),
            updatedAt: Timestamp.fromMillis(nowMs),
          },
          nowMs
        );
      }
    } catch (error) {
      lastError = error;
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `${TOURNAMENT_UNLOCK_CODES_COLLECTION}/${unlockCode}`
      );
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Could not generate a unique tournament unlock code in Firestore.');
}

/**
 * Real-time onSnapshot subscription for the Admin Panel.
 * Automatically updates across browser refreshes, restarts, and multiple devices.
 */
export function subscribeAllTournamentUnlockCodes(params: {
  pageSize: number;
  onData: (codes: FirestoreTournamentUnlockCode[], hasMore: boolean) => void;
  onError: (err: Error) => void;
}): Unsubscribe {
  const safeLimit = Math.max(10, Math.min(500, Math.floor(params.pageSize)));
  const q = query(
    collection(db, TOURNAMENT_UNLOCK_CODES_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(safeLimit + 1)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const nowMs = Date.now();
      const allDocs = snapshot.docs.map((d) =>
        mapDocToUnlockCode(d.id, d.data(), nowMs)
      );
      const hasMore = allDocs.length > safeLimit;
      const sliced = hasMore ? allDocs.slice(0, safeLimit) : allDocs;
      params.onData(sliced, hasMore);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, TOURNAMENT_UNLOCK_CODES_COLLECTION);
      } catch (wrapped) {
        params.onError(
          wrapped instanceof Error ? wrapped : new Error(String(error))
        );
      }
    }
  );
}

/**
 * Forces a fresh read directly from Cloud Firestore servers (bypassing local cache).
 */
export async function refreshTournamentUnlockCodesFromServer(
  pageSize: number
): Promise<{ codes: FirestoreTournamentUnlockCode[]; hasMore: boolean }> {
  const safeLimit = Math.max(10, Math.min(500, Math.floor(pageSize)));
  const q = query(
    collection(db, TOURNAMENT_UNLOCK_CODES_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(safeLimit + 1)
  );

  try {
    const snapshot = await getDocsFromServer(q);
    const nowMs = Date.now();
    const allDocs = snapshot.docs.map((d) =>
      mapDocToUnlockCode(d.id, d.data(), nowMs)
    );
    const hasMore = allDocs.length > safeLimit;
    return {
      codes: hasMore ? allDocs.slice(0, safeLimit) : allDocs,
      hasMore,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, TOURNAMENT_UNLOCK_CODES_COLLECTION);
  }
}

/**
 * Persists EXPIRED status in Firestore for ACTIVE codes whose expiresAt has passed.
 * Never deletes records.
 */
export async function syncExpiredActiveCodesInFirestore(
  codes: FirestoreTournamentUnlockCode[]
): Promise<number> {
  const currentUser = auth.currentUser;
  if (!isFirebaseOwnerAdminUser(currentUser)) return 0;

  const toExpire = codes
    .filter((c) => c.status === 'ACTIVE' && c.isExpired)
    .slice(0, 20);
  let updatedCount = 0;

  for (const item of toExpire) {
    const ref = doc(db, TOURNAMENT_UNLOCK_CODES_COLLECTION, item.id);
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) return;
        const data = snap.data();
        const expiresMs = toTimestampMs(data.expiresAt);
        if (data.status === 'ACTIVE' && expiresMs > 0 && Date.now() >= expiresMs) {
          tx.update(ref, {
            status: 'EXPIRED',
            updatedAt: serverTimestamp(),
          });
          updatedCount += 1;
        }
      });
    } catch {
      // Ignore individual race/clock skew errors; computed status still shows EXPIRED
    }
  }
  return updatedCount;
}

/**
 * Admin manually revokes a code in Firestore. Historical record is preserved forever.
 */
export async function revokeTournamentUnlockCodeInFirestore(
  code: string
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!isFirebaseOwnerAdminUser(currentUser)) {
    throw new Error('Only the verified Admin account can revoke unlock codes.');
  }
  const cleanCode = normalizeUnlockCode(code);
  if (!cleanCode) {
    throw new Error('Invalid unlock code.');
  }
  const ref = doc(db, TOURNAMENT_UNLOCK_CODES_COLLECTION, cleanCode);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) {
        throw new Error('Tournament unlock code not found in Firestore.');
      }
      const data = snap.data();
      if (data.status === 'REVOKED') return;
      tx.update(ref, {
        status: 'REVOKED',
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      throw error;
    }
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `${TOURNAMENT_UNLOCK_CODES_COLLECTION}/${cleanCode}`
    );
  }
}

/**
 * Subscribes to a customer's own redeemed passes in Firestore (strict Pillar 8 query).
 */
export function subscribeCustomerTournamentPassesInFirestore(params: {
  firebaseUid: string;
  onData: (
    activePasses: FirestoreTournamentUnlockCode[],
    usedPasses: FirestoreTournamentUnlockCode[]
  ) => void;
  onError: (err: Error) => void;
}): Unsubscribe {
  const q = query(
    collection(db, TOURNAMENT_UNLOCK_CODES_COLLECTION),
    where('redeemedByUid', '==', params.firebaseUid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const nowMs = Date.now();
      const owned = snapshot.docs
        .map((d) => mapDocToUnlockCode(d.id, d.data(), nowMs))
        .sort((a, b) =>
          String(b.redeemedAtIso || b.createdAtIso).localeCompare(
            String(a.redeemedAtIso || a.createdAtIso)
          )
        );
      // An active pass is a redeemed code that has not yet been bound to a tournament
      const activePasses = owned.filter(
        (c) => c.status === 'REDEEMED' && !c.tournamentId
      );
      const usedPasses = owned.filter(
        (c) => Boolean(c.tournamentId) || c.status === 'USED' || c.status === 'REVOKED'
      );
      params.onData(activePasses, usedPasses);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, TOURNAMENT_UNLOCK_CODES_COLLECTION);
      } catch (wrapped) {
        params.onError(
          wrapped instanceof Error ? wrapped : new Error(String(error))
        );
      }
    }
  );
}

/**
 * Customer atomically redeems an ACTIVE, unexpired unlock code via Firestore Transaction.
 * Server-side Firestore Security Rules verify `request.time < existing().expiresAt` and
 * `existing().status == 'ACTIVE'`, preventing double redemption & simultaneous device races.
 */
export async function redeemTournamentUnlockCodeInFirestore(params: {
  code: string;
  customerIdentifiers: string[];
  customerDisplayLabel: string;
}): Promise<{ ok: boolean; pass?: FirestoreTournamentUnlockCode; error?: string }> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    return {
      ok: false,
      error: 'Please sign in with your verified Google account to redeem this unlock code.',
    };
  }

  const cleanCode = normalizeUnlockCode(params.code);
  if (!cleanCode || cleanCode.length < 6) {
    return {
      ok: false,
      error: 'Please enter a valid Admin Tournament Unlock Code (e.g. TRN-3D-XXXX-XXXX).',
    };
  }

  const normalizedIds = new Set(
    [
      ...params.customerIdentifiers,
      currentUser.uid,
      currentUser.email || '',
    ]
      .map((id) => sanitizeLockedCustomerId(id) || String(id || '').trim().toUpperCase())
      .filter(Boolean)
  );

  const redeemedByLabel = String(
    params.customerDisplayLabel || currentUser.email || currentUser.uid
  )
    .trim()
    .slice(0, 120);

  const ref = doc(db, TOURNAMENT_UNLOCK_CODES_COLLECTION, cleanCode);

  try {
    const redeemedDoc = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) {
        throw new Error('CODE_NOT_FOUND');
      }
      const data = snap.data();
      const mapped = mapDocToUnlockCode(cleanCode, data, Date.now());

      if (mapped.status === 'REVOKED') {
        throw new Error('CODE_REVOKED');
      }
      if (mapped.status === 'REDEEMED' || mapped.status === 'USED') {
        throw new Error('CODE_ALREADY_REDEEMED');
      }
      if (mapped.status === 'EXPIRED' || mapped.isExpired) {
        throw new Error('CODE_EXPIRED');
      }
      if (mapped.status !== 'ACTIVE') {
        throw new Error('CODE_INVALID_STATUS');
      }
      if (mapped.lockedCustomerId && !normalizedIds.has(mapped.lockedCustomerId)) {
        throw new Error(`CODE_LOCKED:${mapped.lockedCustomerId}`);
      }

      tx.update(ref, {
        status: 'REDEEMED',
        redeemedAt: serverTimestamp(),
        redeemedBy: redeemedByLabel,
        redeemedByUid: currentUser.uid,
        updatedAt: serverTimestamp(),
      });

      const nowIso = new Date().toISOString();
      return {
        ...mapped,
        status: 'REDEEMED' as const,
        effectiveStatus: 'REDEEMED' as const,
        redeemedAtIso: nowIso,
        redeemedBy: redeemedByLabel,
        redeemedByUid: currentUser.uid,
        updatedAtIso: nowIso,
      };
    });

    return { ok: true, pass: redeemedDoc };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'CODE_NOT_FOUND') {
      return {
        ok: false,
        error: 'Invalid Tournament Unlock Code. Please check the code provided by Admin.',
      };
    }
    if (msg === 'CODE_REVOKED') {
      return {
        ok: false,
        error: 'This Tournament Unlock Code has been revoked by Admin and cannot be redeemed.',
      };
    }
    if (msg === 'CODE_ALREADY_REDEEMED') {
      return {
        ok: false,
        error: 'This Tournament Unlock Code has already been redeemed and cannot be used again.',
      };
    }
    if (msg === 'CODE_EXPIRED') {
      return {
        ok: false,
        error: 'This Tournament Unlock Code has expired. Please request a new code from Admin.',
      };
    }
    if (msg.startsWith('CODE_LOCKED:')) {
      const lockedId = msg.slice('CODE_LOCKED:'.length);
      return {
        ok: false,
        error: `This code is locked to Customer ID ${lockedId} and cannot be used on your account.`,
      };
    }
    if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('insufficient')) {
      return {
        ok: false,
        error: 'Code could not be redeemed (it may have expired on the server or been redeemed by another device).',
      };
    }
    try {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `${TOURNAMENT_UNLOCK_CODES_COLLECTION}/${cleanCode}`
      );
    } catch {
      // Return friendly message to UI after structured logging
    }
    return {
      ok: false,
      error: 'Could not redeem unlock code right now. Please check your connection and try again.',
    };
  }
}

/**
 * Atomically binds a redeemed pass to the exact single tournament created.
 * Enforces one-code = one-tournament via Firestore transaction & Security Rules.
 */
export async function bindTournamentToUnlockCodeInFirestore(params: {
  code: string;
  tournamentId: string;
  tournamentName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    return {
      ok: false,
      error: 'Please sign in with your verified Google account to create a tournament.',
    };
  }

  const cleanCode = normalizeUnlockCode(params.code);
  const cleanTourId = String(params.tournamentId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 80);
  const cleanTourName = String(params.tournamentName || '').trim().slice(0, 160);

  if (!cleanCode || !cleanTourId || !cleanTourName) {
    return { ok: false, error: 'Missing tournament or unlock code details.' };
  }

  const ref = doc(db, TOURNAMENT_UNLOCK_CODES_COLLECTION, cleanCode);

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) {
        throw new Error('CODE_NOT_FOUND');
      }
      const data = snap.data();
      if (data.status === 'REVOKED') {
        throw new Error('CODE_REVOKED');
      }
      if (data.status !== 'REDEEMED' || data.redeemedByUid !== currentUser.uid) {
        throw new Error('CODE_NOT_OWNED');
      }
      if (data.tournamentId) {
        throw new Error('CODE_ALREADY_BOUND');
      }

      tx.update(ref, {
        tournamentId: cleanTourId,
        tournamentName: cleanTourName,
        updatedAt: serverTimestamp(),
      });
    });

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'CODE_ALREADY_BOUND') {
      return {
        ok: false,
        error: 'This unlock code has already been used for a tournament and cannot unlock another.',
      };
    }
    if (msg === 'CODE_REVOKED') {
      return {
        ok: false,
        error: 'This unlock code was revoked by Admin.',
      };
    }
    if (msg === 'CODE_NOT_OWNED' || msg === 'CODE_NOT_FOUND') {
      return {
        ok: false,
        error: 'Valid redeemed unlock pass not found on your account.',
      };
    }
    try {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `${TOURNAMENT_UNLOCK_CODES_COLLECTION}/${cleanCode}`
      );
    } catch {
      // Structured error logged
    }
    return {
      ok: false,
      error: 'Could not bind tournament to unlock code in Firestore. Please retry.',
    };
  }
}

/**
 * Migrates legacy Supabase tournament_unlock_codes rows into Firestore
 * idempotently (skips duplicates, preserves dates/status/customer info,
 * never deletes Supabase data).
 */
export async function migrateLegacySupabaseCodesToFirestore(
  rows: LegacySupabaseCodeRow[]
): Promise<{
  totalFound: number;
  migratedCount: number;
  skippedDuplicates: number;
  failedCount: number;
}> {
  const currentUser = auth.currentUser;
  if (!isFirebaseOwnerAdminUser(currentUser) || !currentUser) {
    throw new Error('Only the verified Admin Google account can migrate legacy codes.');
  }

  let migratedCount = 0;
  let skippedDuplicates = 0;
  let failedCount = 0;

  for (const row of rows) {
    const cleanCode = normalizeUnlockCode(row.code);
    if (!cleanCode || cleanCode.length < 6) {
      failedCount += 1;
      continue;
    }

    const durationDays = Math.max(
      MIN_TOURNAMENT_UNLOCK_DAYS,
      Math.min(MAX_TOURNAMENT_UNLOCK_DAYS, Math.floor(Number(row.duration_days) || 1))
    );
    const amount = durationDays * TOURNAMENT_PRICE_PER_DAY_INR;
    const origCreatedMs = row.created_at && Number.isFinite(Date.parse(row.created_at))
      ? Date.parse(row.created_at)
      : Date.now();
    const expiresAtMs = origCreatedMs + durationDays * MS_PER_DAY;
    const rawStatus = String(row.status || 'ACTIVE').toUpperCase();

    let status: FirestoreUnlockCodeStatus = 'ACTIVE';
    if (rawStatus === 'REVOKED') status = 'REVOKED';
    else if (rawStatus === 'REDEEMED' || rawStatus === 'USED') status = 'REDEEMED';
    else if (Date.now() >= expiresAtMs) status = 'EXPIRED';

    const redeemedAtMs =
      row.redeemed_at && Number.isFinite(Date.parse(row.redeemed_at))
        ? Date.parse(row.redeemed_at)
        : null;

    const cleanTourId = row.consumed_tournament_id
      ? String(row.consumed_tournament_id)
          .trim()
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .slice(0, 80)
      : null;

    const cleanTourName = row.consumed_tournament_name
      ? String(row.consumed_tournament_name).trim().slice(0, 160)
      : null;

    const ref = doc(db, TOURNAMENT_UNLOCK_CODES_COLLECTION, cleanCode);
    try {
      const inserted = await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists()) return false;

        tx.set(ref, {
          id: cleanCode,
          unlockCode: cleanCode,
          durationDays,
          amount,
          customerNote: String(row.customer_label || '').trim().slice(0, 120),
          lockedCustomerId: sanitizeLockedCustomerId(row.assigned_customer_id),
          status,
          createdAt: serverTimestamp(),
          originalCreatedAt: Timestamp.fromMillis(origCreatedMs),
          expiresAt: Timestamp.fromMillis(expiresAtMs),
          redeemedAt: redeemedAtMs ? Timestamp.fromMillis(redeemedAtMs) : null,
          redeemedBy:
            row.redeemed_by_customer_id || row.redeemed_by_name
              ? String(row.redeemed_by_customer_id || row.redeemed_by_name)
                  .trim()
                  .slice(0, 120)
              : null,
          redeemedByUid: null,
          tournamentId: cleanTourId,
          tournamentName: cleanTourName,
          createdBy: currentUser.uid,
          updatedAt: serverTimestamp(),
        });
        return true;
      });
      if (inserted) migratedCount += 1;
      else skippedDuplicates += 1;
    } catch {
      failedCount += 1;
    }
  }

  return {
    totalFound: rows.length,
    migratedCount,
    skippedDuplicates,
    failedCount,
  };
}
