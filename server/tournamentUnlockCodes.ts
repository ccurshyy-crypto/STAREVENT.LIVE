import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';

export const TOURNAMENT_PRICE_PER_DAY_INR = 99;
export const MIN_TOURNAMENT_UNLOCK_DAYS = 1;
export const MAX_TOURNAMENT_UNLOCK_DAYS = 365;

export type TournamentCodeStatus = 'ACTIVE' | 'REDEEMED' | 'USED' | 'REVOKED';

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
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const FALLBACK_STORE_PATH = path.join('/tmp', 'starevent-tournament-unlock-codes.json');
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const memoryStore = new Map<string, TournamentUnlockCodeRecord>();
const codeLocks = new Map<string, Promise<unknown>>();
let diskLoaded = false;

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
  memoryStore.set(record.code, record);
  flushDiskStore();

  if (!supabaseAdmin) return;
  try {
    await supabaseAdmin.from('tournament_unlock_codes').upsert(
      {
        code: record.code,
        duration_days: record.duration_days,
        price_per_day_inr: record.price_per_day_inr,
        total_price_inr: record.total_price_inr,
        assigned_customer_id: record.assigned_customer_id,
        customer_label: record.customer_label,
        status: record.status,
        created_by: record.created_by,
        created_at: record.created_at,
        redeemed_by_customer_id: record.redeemed_by_customer_id,
        redeemed_by_name: record.redeemed_by_name,
        redeemed_at: record.redeemed_at,
        consumed_tournament_id: record.consumed_tournament_id,
        consumed_tournament_name: record.consumed_tournament_name,
        consumed_dates: record.consumed_dates,
        consumed_at: record.consumed_at,
        revoked_at: record.revoked_at,
        updated_at: record.updated_at,
      },
      { onConflict: 'code' }
    );
  } catch {
    // Gracefully fall back to disk/memory cache if SQL migration has not been run yet
  }
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
        const rec = data as TournamentUnlockCodeRecord;
        memoryStore.set(rec.code, rec);
        return rec;
      }
    } catch {
      // Fall back to disk/memory store
    }
  }

  return memoryStore.get(code) ?? null;
}

export async function listAllTournamentCodes(
  supabaseAdmin: SupabaseClient | null
): Promise<TournamentUnlockCodeRecord[]> {
  ensureDiskLoaded();
  const merged = new Map<string, TournamentUnlockCodeRecord>(memoryStore);

  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('tournament_unlock_codes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (!error && Array.isArray(data)) {
        for (const row of data) {
          const rec = row as TournamentUnlockCodeRecord;
          if (rec?.code) {
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
  const record: TournamentUnlockCodeRecord = {
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
  };

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
    if (existing.status === 'USED') {
      return {
        ok: false,
        status: 409,
        error: 'This code was already used to create a tournament and cannot be revoked.',
      };
    }
    if (existing.status === 'REVOKED') {
      return { ok: true, status: 200, record: existing };
    }

    const nowIso = new Date().toISOString();
    const updated: TournamentUnlockCodeRecord = {
      ...existing,
      status: 'REVOKED',
      revoked_at: nowIso,
      updated_at: nowIso,
    };
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
  const activePasses = owned.filter((r) => r.status === 'REDEEMED');
  const usedPasses = owned.filter((r) => r.status === 'USED');
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

    if (existing.status === 'USED') {
      return {
        ok: false,
        status: 409,
        error: 'This Tournament Unlock Code has already been used to create a tournament.',
      };
    }

    if (existing.status === 'REDEEMED') {
      if (existing.redeemed_by_customer_id === cleanCustomerId) {
        return { ok: true, status: 200, pass: existing };
      }
      return {
        ok: false,
        status: 409,
        error: 'This Tournament Unlock Code has already been redeemed by another account.',
      };
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
    const updated: TournamentUnlockCodeRecord = {
      ...existing,
      status: 'REDEEMED',
      redeemed_by_customer_id: cleanCustomerId,
      redeemed_by_name: String(params.customerName || cleanCustomerId).trim().slice(0, 120),
      redeemed_at: nowIso,
      updated_at: nowIso,
    };

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
    if (existing.status === 'USED') {
      return {
        ok: false,
        status: 409,
        error: 'This Tournament Unlock Code was already used for another tournament.',
      };
    }
    if (existing.status !== 'REDEEMED' || existing.redeemed_by_customer_id !== cleanCustomerId) {
      return {
        ok: false,
        status: 403,
        error: 'Please redeem a valid Admin Tournament Unlock Code on your account first.',
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
    const updated: TournamentUnlockCodeRecord = {
      ...existing,
      status: 'USED',
      consumed_tournament_id: cleanTournamentId,
      consumed_tournament_name: cleanTournamentName,
      consumed_dates: cleanDates,
      consumed_at: nowIso,
      updated_at: nowIso,
    };

    await persistCodeRecord(params.supabaseAdmin, updated);
    return { ok: true, status: 200, pass: updated };
  });
}
