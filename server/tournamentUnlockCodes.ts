import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';

export const TOURNAMENT_PRICE_PER_DAY_INR = 99;
export const MIN_TOURNAMENT_UNLOCK_DAYS = 1;
export const MAX_TOURNAMENT_UNLOCK_DAYS = 365;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type TournamentCodeStatus = 'ACTIVE' | 'REDEEMED' | 'USED' | 'REVOKED';

export interface CreatedTournamentEntry {
  id: string;
  name: string;
  dates: string[];
  created_at: string;
}

export interface TournamentUnlockCodeRecord {
  code: string;
  duration_days: number;
  price_per_day_inr: number;
  total_price_inr: number;
  assigned_customer_id: string | null;
  customer_label: string;
  status: TournamentCodeStatus;
  created_by: string;
  created_at: string;
  redeemed_by_customer_id: string | null;
  redeemed_by_name: string | null;
  redeemed_at: string | null;
  consumed_tournament_id: string | null;
  consumed_tournament_name: string | null;
  consumed_dates: string[] | null;
  consumed_at: string | null;
  revoked_at: string | null;
  updated_at: string;
  // Multi-tournament day-pass computed & runtime fields
  expires_at?: string | null;
  is_expired?: boolean;
  remaining_days?: number;
  tournaments_created_count?: number;
  created_tournaments?: CreatedTournamentEntry[];
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const FALLBACK_STORE_PATH = path.join('/tmp', 'starevent-tournament-unlock-codes.json');
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const memoryStore = new Map<string, TournamentUnlockCodeRecord>();
const codeLocks = new Map<string, Promise<unknown>>();
let diskLoaded = false;

export function enrichTournamentCodeRecord(
  record: TournamentUnlockCodeRecord,
  nowMs: number = Date.now()
): TournamentUnlockCodeRecord {
  const safeDays = Math.max(
    MIN_TOURNAMENT_UNLOCK_DAYS,
    Math.min(MAX_TOURNAMENT_UNLOCK_DAYS, Math.floor(Number(record.duration_days) || 1))
  );

  // Build normalized list of tournaments created with this pass
  const existingList: CreatedTournamentEntry[] = Array.isArray(record.created_tournaments)
    ? record.created_tournaments.filter(
        (item): item is CreatedTournamentEntry =>
          Boolean(item && typeof item.id === 'string' && typeof item.name === 'string')
      )
    : [];

  if (
    existingList.length === 0 &&
    record.consumed_tournament_id &&
    record.consumed_tournament_name
  ) {
    existingList.push({
      id: record.consumed_tournament_id,
      name: record.consumed_tournament_name,
      dates: Array.isArray(record.consumed_dates) ? record.consumed_dates : [],
      created_at: record.consumed_at || record.updated_at || record.created_at,
    });
  }

  let expiresAtIso: string | null = null;
  let isExpired = false;
  let remainingDays = safeDays;

  if (record.redeemed_at) {
    const redeemedMs = Date.parse(record.redeemed_at);
    if (Number.isFinite(redeemedMs)) {
      const expiresMs = redeemedMs + safeDays * MS_PER_DAY;
      expiresAtIso = new Date(expiresMs).toISOString();
      const diffMs = expiresMs - nowMs;
      if (diffMs <= 0) {
        isExpired = true;
        remainingDays = 0;
      } else {
        isExpired = false;
        remainingDays = Math.max(1, Math.ceil(diffMs / MS_PER_DAY));
      }
    }
  }

  // Legacy passes previously marked 'USED' are still active if within their N-day window
  const normalizedStatus: TournamentCodeStatus =
    record.status === 'USED' && record.redeemed_at && !isExpired ? 'REDEEMED' : record.status;

  return {
    ...record,
    duration_days: safeDays,
    status: normalizedStatus,
    expires_at: expiresAtIso,
    is_expired: record.status === 'REVOKED' ? false : isExpired,
    remaining_days: record.status === 'REVOKED' ? 0 : remainingDays,
    tournaments_created_count: Math.max(
      existingList.length,
      typeof record.tournaments_created_count === 'number' ? record.tournaments_created_count : 0
    ),
    created_tournaments: existingList,
  };
}

export function isTournamentPassActive(
  record: TournamentUnlockCodeRecord,
  nowMs: number = Date.now()
): boolean {
  const enriched = enrichTournamentCodeRecord(record, nowMs);
  if (enriched.status === 'REVOKED') return false;
  if (!enriched.redeemed_by_customer_id || !enriched.redeemed_at) return false;
  return !enriched.is_expired;
}

function ensureDiskLoaded(): void {
  if (diskLoaded) return;
  diskLoaded = true;
  try {
    if (fs.existsSync(FALLBACK_STORE_PATH)) {
      const raw = fs.readFileSync(FALLBACK_STORE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === 'object' && typeof (item as TournamentUnlockCodeRecord).code === 'string') {
            const rec = item as TournamentUnlockCodeRecord;
            memoryStore.set(rec.code.toUpperCase(), rec);
          }
        }
      }
    }
  } catch {
    // Ignore disk read errors (e.g. read-only serverless /tmp)
  }
}

function flushDiskStore(): void {
  try {
    const all = Array.from(memoryStore.values());
    const tmpPath = `${FALLBACK_STORE_PATH}.${process.pid}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(all, null, 2), 'utf8');
    fs.renameSync(tmpPath, FALLBACK_STORE_PATH);
  } catch {
    // Ignore disk write errors on read-only filesystems
  }
}

async function withCodeLock<T>(codeKey: string, task: () => Promise<T>): Promise<T> {
  const prev = codeLocks.get(codeKey) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chained = prev.then(() => next);
  codeLocks.set(codeKey, chained);
  await prev;
  try {
    return await task();
  } finally {
    release();
    if (codeLocks.get(codeKey) === chained) {
      codeLocks.delete(codeKey);
    }
  }
}

export function normalizeUnlockCode(raw: unknown): string {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 40);
}

export function sanitizeOptionalCustomerId(raw: unknown): string | null {
  const clean = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 48);
  return clean.length >= 2 ? clean : null;
}

function randomCodeSegment(length: number): string {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

export function buildTournamentCodeString(durationDays: number): string {
  return `TRN-${durationDays}D-${randomCodeSegment(4)}-${randomCodeSegment(4)}`;
}

async function persistCodeRecord(
  supabaseAdmin: SupabaseClient | null,
  record: TournamentUnlockCodeRecord
): Promise<void> {
  ensureDiskLoaded();
  const enriched = enrichTournamentCodeRecord(record);
  memoryStore.set(enriched.code, enriched);
  flushDiskStore();

  if (!supabaseAdmin) return;
  try {
    // Persist strictly to columns present in public.tournament_unlock_codes
    const dbStatus: TournamentCodeStatus =
      enriched.status === 'REVOKED'
        ? 'REVOKED'
        : enriched.redeemed_at
          ? 'REDEEMED'
          : 'ACTIVE';
    await supabaseAdmin.from('tournament_unlock_codes').upsert(
      {
        code: enriched.code,
        duration_days: enriched.duration_days,
        price_per_day_inr: enriched.price_per_day_inr,
        total_price_inr: enriched.total_price_inr,
        assigned_customer_id: enriched.assigned_customer_id,
        customer_label: enriched.customer_label,
        status: dbStatus,
        created_by: enriched.created_by,
        created_at: enriched.created_at,
        redeemed_by_customer_id: enriched.redeemed_by_customer_id,
        redeemed_by_name: enriched.redeemed_by_name,
        redeemed_at: enriched.redeemed_at,
        consumed_tournament_id: enriched.consumed_tournament_id,
        consumed_tournament_name: enriched.consumed_tournament_name,
        consumed_dates: enriched.consumed_dates,
        consumed_at: enriched.consumed_at,
        revoked_at: enriched.revoked_at,
        updated_at: enriched.updated_at,
      },
      { onConflict: 'code' }
    );
  } catch {
    // Gracefully fall back to disk/memory cache if SQL migration has not been run yet
  }
}

function mergeWithCachedHistory(
  dbRec: TournamentUnlockCodeRecord
): TournamentUnlockCodeRecord {
  const cached = memoryStore.get(dbRec.code);
  if (!cached || !Array.isArray(cached.created_tournaments) || cached.created_tournaments.length === 0) {
    return enrichTournamentCodeRecord(dbRec);
  }
  return enrichTournamentCodeRecord({
    ...dbRec,
    created_tournaments: cached.created_tournaments,
    tournaments_created_count: Math.max(
      cached.created_tournaments.length,
      cached.tournaments_created_count ?? 0
    ),
  });
}

export async function getTournamentCodeRecord(
  supabaseAdmin: SupabaseClient | null,
  rawCode: string
): Promise<TournamentUnlockCodeRecord | null> {
  ensureDiskLoaded();
  const code = normalizeUnlockCode(rawCode);
  if (!code) return null;

  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('tournament_unlock_codes')
        .select('*')
        .eq('code', code)
        .maybeSingle();
      if (!error && data) {
        const rec = mergeWithCachedHistory(data as TournamentUnlockCodeRecord);
        memoryStore.set(rec.code, rec);
        return rec;
      }
    } catch {
      // Fall back to disk/memory store
    }
  }

  const local = memoryStore.get(code);
  return local ? enrichTournamentCodeRecord(local) : null;
}

export async function listAllTournamentCodes(
  supabaseAdmin: SupabaseClient | null
): Promise<TournamentUnlockCodeRecord[]> {
  ensureDiskLoaded();
  const merged = new Map<string, TournamentUnlockCodeRecord>();
  for (const [k, v] of memoryStore.entries()) {
    merged.set(k, enrichTournamentCodeRecord(v));
  }

  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('tournament_unlock_codes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (!error && Array.isArray(data)) {
        for (const row of data) {
          const raw = row as TournamentUnlockCodeRecord;
          if (raw?.code) {
            const rec = mergeWithCachedHistory(raw);
            merged.set(rec.code, rec);
            memoryStore.set(rec.code, rec);
          }
        }
      }
    } catch {
      // Fall back to disk/memory store
    }
  }

  return Array.from(merged.values()).sort((a, b) =>
    String(b.created_at || '').localeCompare(String(a.created_at || ''))
  );
}

export async function generateTournamentUnlockCode(params: {
  supabaseAdmin: SupabaseClient | null;
  durationDays: number;
  assignedCustomerId?: string | null;
  customerLabel?: string;
}): Promise<TournamentUnlockCodeRecord> {
  ensureDiskLoaded();
  const days = Math.floor(Number(params.durationDays));
  if (!Number.isFinite(days) || days < MIN_TOURNAMENT_UNLOCK_DAYS || days > MAX_TOURNAMENT_UNLOCK_DAYS) {
    throw new Error(
      `Tournament duration must be between ${MIN_TOURNAMENT_UNLOCK_DAYS} and ${MAX_TOURNAMENT_UNLOCK_DAYS} days.`
    );
  }

  let code = buildTournamentCodeString(days);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const existing = await getTournamentCodeRecord(params.supabaseAdmin, code);
    if (!existing) break;
    code = buildTournamentCodeString(days);
  }

  const nowIso = new Date().toISOString();
  const record = enrichTournamentCodeRecord({
    code,
    duration_days: days,
    price_per_day_inr: TOURNAMENT_PRICE_PER_DAY_INR,
    total_price_inr: days * TOURNAMENT_PRICE_PER_DAY_INR,
    assigned_customer_id: sanitizeOptionalCustomerId(params.assignedCustomerId),
    customer_label: String(params.customerLabel || '').trim().slice(0, 120),
    status: 'ACTIVE',
    created_by: 'owner_admin',
    created_at: nowIso,
    redeemed_by_customer_id: null,
    redeemed_by_name: null,
    redeemed_at: null,
    consumed_tournament_id: null,
    consumed_tournament_name: null,
    consumed_dates: null,
    consumed_at: null,
    revoked_at: null,
    updated_at: nowIso,
    created_tournaments: [],
    tournaments_created_count: 0,
  });

  await persistCodeRecord(params.supabaseAdmin, record);
  return record;
}

export async function revokeTournamentUnlockCode(params: {
  supabaseAdmin: SupabaseClient | null;
  code: string;
}): Promise<{ ok: boolean; status: number; record?: TournamentUnlockCodeRecord; error?: string }> {
  const cleanCode = normalizeUnlockCode(params.code);
  if (!cleanCode) {
    return { ok: false, status: 400, error: 'Valid unlock code is required.' };
  }

  return withCodeLock(cleanCode, async () => {
    const existing = await getTournamentCodeRecord(params.supabaseAdmin, cleanCode);
    if (!existing) {
      return { ok: false, status: 404, error: 'Tournament unlock code not found.' };
    }
    if (existing.status === 'REVOKED') {
      return { ok: true, status: 200, record: existing };
    }
    if (existing.is_expired) {
      return {
        ok: false,
        status: 409,
        error: 'This code has already expired and no longer allows creating tournaments.',
      };
    }

    const nowIso = new Date().toISOString();
    const updated = enrichTournamentCodeRecord({
      ...existing,
      status: 'REVOKED',
      revoked_at: nowIso,
      updated_at: nowIso,
    });
    await persistCodeRecord(params.supabaseAdmin, updated);
    return { ok: true, status: 200, record: updated };
  });
}

export async function getCustomerTournamentPasses(
  supabaseAdmin: SupabaseClient | null,
  customerId: string
): Promise<{
  activePasses: TournamentUnlockCodeRecord[];
  usedPasses: TournamentUnlockCodeRecord[];
}> {
  const cleanId = sanitizeOptionalCustomerId(customerId);
  if (!cleanId) return { activePasses: [], usedPasses: [] };

  const all = await listAllTournamentCodes(supabaseAdmin);
  const owned = all.filter((r) => r.redeemed_by_customer_id === cleanId);
  const activePasses = owned.filter((r) => isTournamentPassActive(r));
  const usedPasses = owned.filter(
    (r) => !isTournamentPassActive(r) && r.status !== 'ACTIVE'
  );
  return { activePasses, usedPasses };
}

export async function redeemTournamentUnlockCode(params: {
  supabaseAdmin: SupabaseClient | null;
  code: string;
  customerId: string;
  customerName: string;
}): Promise<{
  ok: boolean;
  status: number;
  pass?: TournamentUnlockCodeRecord;
  error?: string;
}> {
  const cleanCode = normalizeUnlockCode(params.code);
  const cleanCustomerId = sanitizeOptionalCustomerId(params.customerId);
  if (!cleanCode || cleanCode.length < 6) {
    return {
      ok: false,
      status: 400,
      error: 'Please enter a valid Admin Tournament Unlock Code (e.g. TRN-3D-XXXX-XXXX).',
    };
  }
  if (!cleanCustomerId) {
    return { ok: false, status: 401, error: 'Customer authentication required.' };
  }

  return withCodeLock(cleanCode, async () => {
    const existing = await getTournamentCodeRecord(params.supabaseAdmin, cleanCode);
    if (!existing) {
      return {
        ok: false,
        status: 404,
        error: 'Invalid Tournament Unlock Code. Please check the code provided by Admin.',
      };
    }

    if (existing.status === 'REVOKED') {
      return {
        ok: false,
        status: 403,
        error: 'This Tournament Unlock Code has been revoked by Admin.',
      };
    }

    // Already redeemed previously
    if (existing.redeemed_by_customer_id) {
      if (existing.redeemed_by_customer_id !== cleanCustomerId) {
        return {
          ok: false,
          status: 409,
          error: 'This Tournament Unlock Code has already been redeemed by another account.',
        };
      }
      if (existing.is_expired) {
        return {
          ok: false,
          status: 409,
          error: `This ${existing.duration_days}-day Tournament Unlock Code has expired. Please request a new code from Admin.`,
        };
      }
      // Still valid for this same customer (including legacy USED records still within N days)
      if (existing.status !== 'REDEEMED') {
        const restored = enrichTournamentCodeRecord({
          ...existing,
          status: 'REDEEMED',
          updated_at: new Date().toISOString(),
        });
        await persistCodeRecord(params.supabaseAdmin, restored);
        return { ok: true, status: 200, pass: restored };
      }
      return { ok: true, status: 200, pass: existing };
    }

    if (
      existing.assigned_customer_id &&
      existing.assigned_customer_id !== cleanCustomerId
    ) {
      return {
        ok: false,
        status: 403,
        error: `This code is reserved for Customer ID ${existing.assigned_customer_id} and cannot be used on your account.`,
      };
    }

    const nowIso = new Date().toISOString();
    const updated = enrichTournamentCodeRecord({
      ...existing,
      status: 'REDEEMED',
      redeemed_by_customer_id: cleanCustomerId,
      redeemed_by_name: String(params.customerName || cleanCustomerId).trim().slice(0, 120),
      redeemed_at: nowIso,
      updated_at: nowIso,
    });

    await persistCodeRecord(params.supabaseAdmin, updated);
    return { ok: true, status: 200, pass: updated };
  });
}

export async function consumeTournamentUnlockPass(params: {
  supabaseAdmin: SupabaseClient | null;
  code: string;
  customerId: string;
  tournamentId: string;
  tournamentName: string;
  selectedDates: string[];
}): Promise<{
  ok: boolean;
  status: number;
  pass?: TournamentUnlockCodeRecord;
  error?: string;
}> {
  const cleanCode = normalizeUnlockCode(params.code);
  const cleanCustomerId = sanitizeOptionalCustomerId(params.customerId);
  const cleanTournamentId = String(params.tournamentId || '').trim().slice(0, 80);
  const cleanTournamentName = String(params.tournamentName || '').trim().slice(0, 160);
  const cleanDates = Array.from(
    new Set(
      (Array.isArray(params.selectedDates) ? params.selectedDates : [])
        .map((d) => String(d || '').trim())
        .filter((d) => ISO_DATE_REGEX.test(d))
    )
  ).sort();

  if (!cleanCode) {
    return { ok: false, status: 400, error: 'Tournament Unlock Code is required to create a tournament.' };
  }
  if (!cleanCustomerId) {
    return { ok: false, status: 401, error: 'Customer authentication required.' };
  }
  if (!cleanTournamentId || !cleanTournamentName) {
    return { ok: false, status: 400, error: 'Tournament name and ID are required.' };
  }
  if (cleanDates.length === 0) {
    return { ok: false, status: 400, error: 'At least one valid tournament date is required.' };
  }

  return withCodeLock(cleanCode, async () => {
    const existing = await getTournamentCodeRecord(params.supabaseAdmin, cleanCode);
    if (!existing) {
      return { ok: false, status: 404, error: 'Tournament Unlock Code not found.' };
    }
    if (existing.status === 'REVOKED') {
      return { ok: false, status: 403, error: 'This Tournament Unlock Code has been revoked.' };
    }
    if (existing.redeemed_by_customer_id !== cleanCustomerId || !existing.redeemed_at) {
      return {
        ok: false,
        status: 403,
        error: 'Please redeem a valid Admin Tournament Unlock Code on your account first.',
      };
    }
    if (existing.is_expired) {
      return {
        ok: false,
        status: 403,
        error: `Your ${existing.duration_days}-day Tournament Unlock Pass has expired. Please enter a new code from Admin.`,
      };
    }

    if (cleanDates.length > existing.duration_days) {
      return {
        ok: false,
        status: 400,
        error: `Your unlock code allows up to ${existing.duration_days} day${existing.duration_days === 1 ? '' : 's'} (₹${existing.total_price_inr} @ ₹${existing.price_per_day_inr}/day). You selected ${cleanDates.length} days.`,
      };
    }

    const nowIso = new Date().toISOString();
    const prevList = Array.isArray(existing.created_tournaments)
      ? existing.created_tournaments
      : [];
    const nextList = [
      {
        id: cleanTournamentId,
        name: cleanTournamentName,
        dates: cleanDates,
        created_at: nowIso,
      },
      ...prevList.filter((item) => item.id !== cleanTournamentId),
    ].slice(0, 100);

    // Keep status = 'REDEEMED' so customer can keep creating unlimited new tournaments
    // throughout all N unlocked days until expires_at!
    const updated = enrichTournamentCodeRecord({
      ...existing,
      status: 'REDEEMED',
      consumed_tournament_id: cleanTournamentId,
      consumed_tournament_name: cleanTournamentName,
      consumed_dates: cleanDates,
      consumed_at: nowIso,
      updated_at: nowIso,
      created_tournaments: nextList,
      tournaments_created_count: nextList.length,
    });

    await persistCodeRecord(params.supabaseAdmin, updated);
    return { ok: true, status: 200, pass: updated };
  });
}
