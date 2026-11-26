import { STUDIO_CONTACT } from '../data/content';
import { getSupabaseClient, SUPABASE_SCOREBOARD_TABLE } from './supabaseClient';
import type { UserAccountDetails } from '../types/cricketSuite';

export const WORLDCUP_ORIGINAL_PRICE_INR = 149;
export const WORLDCUP_OFFER_PRICE_INR = 49;
export const WORLDCUP_UNLOCK_DURATION_DAYS = 1;
export const WORLDCUP_UNLOCK_DURATION_MS = WORLDCUP_UNLOCK_DURATION_DAYS * 24 * 60 * 60 * 1000;

const OWNER_UPI_STORAGE_KEY = 'star_event_live_owner_upi_v1';
const OWNER_UPI_SUPABASE_DOC_ID = 'star_event_live_owner_upi_config_v1';

export interface OwnerUpiConfig {
  upiId: string;
  payeeName: string;
  updatedAt?: string;
}

const ENV_UPI_ID = (import.meta.env.VITE_OWNER_UPI_ID as string | undefined)?.trim();
const ENV_UPI_NAME = (import.meta.env.VITE_OWNER_UPI_NAME as string | undefined)?.trim();

export const DEFAULT_OWNER_UPI_CONFIG: OwnerUpiConfig = {
  upiId: ENV_UPI_ID || `${STUDIO_CONTACT.phoneDisplay}@ybl`,
  payeeName: ENV_UPI_NAME || STUDIO_CONTACT.brand,
};

export function sanitizeUpiId(raw: string): string {
  return raw.trim().replace(/\s+/g, '').slice(0, 80);
}

export function isValidUpiId(raw: string): boolean {
  const clean = sanitizeUpiId(raw);
  return /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z0-9]{2,32}$/.test(clean);
}

export function getLocalOwnerUpiConfig(): OwnerUpiConfig {
  if (typeof window === 'undefined') return DEFAULT_OWNER_UPI_CONFIG;
  try {
    const raw = window.localStorage.getItem(OWNER_UPI_STORAGE_KEY);
    if (!raw) return DEFAULT_OWNER_UPI_CONFIG;
    const parsed = JSON.parse(raw) as Partial<OwnerUpiConfig>;
    const upiId = typeof parsed.upiId === 'string' && isValidUpiId(parsed.upiId)
      ? sanitizeUpiId(parsed.upiId)
      : DEFAULT_OWNER_UPI_CONFIG.upiId;
    const payeeName =
      typeof parsed.payeeName === 'string' && parsed.payeeName.trim()
        ? parsed.payeeName.trim().slice(0, 60)
        : DEFAULT_OWNER_UPI_CONFIG.payeeName;
    return { upiId, payeeName, updatedAt: parsed.updatedAt };
  } catch {
    return DEFAULT_OWNER_UPI_CONFIG;
  }
}

export function saveLocalOwnerUpiConfig(config: OwnerUpiConfig): OwnerUpiConfig {
  const clean: OwnerUpiConfig = {
    upiId: isValidUpiId(config.upiId)
      ? sanitizeUpiId(config.upiId)
      : DEFAULT_OWNER_UPI_CONFIG.upiId,
    payeeName: config.payeeName.trim().slice(0, 60) || DEFAULT_OWNER_UPI_CONFIG.payeeName,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(OWNER_UPI_STORAGE_KEY, JSON.stringify(clean));
    } catch {
      // ignore storage quota errors
    }
  }
  return clean;
}

export async function fetchOwnerUpiConfig(): Promise<OwnerUpiConfig> {
  const local = getLocalOwnerUpiConfig();
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(SUPABASE_SCOREBOARD_TABLE)
      .select('data')
      .eq('match_id', OWNER_UPI_SUPABASE_DOC_ID)
      .maybeSingle();

    if (!error && data && typeof data.data === 'object' && data.data !== null) {
      const remote = data.data as Partial<OwnerUpiConfig>;
      if (typeof remote.upiId === 'string' && isValidUpiId(remote.upiId)) {
        return saveLocalOwnerUpiConfig({
          upiId: remote.upiId,
          payeeName:
            typeof remote.payeeName === 'string' && remote.payeeName.trim()
              ? remote.payeeName
              : DEFAULT_OWNER_UPI_CONFIG.payeeName,
        });
      }
    }
  } catch {
    // Fallback cleanly to local/default config
  }
  return local;
}

export async function saveOwnerUpiConfigRemote(
  config: OwnerUpiConfig
): Promise<{ saved: OwnerUpiConfig; syncedCloud: boolean }> {
  const saved = saveLocalOwnerUpiConfig(config);
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from(SUPABASE_SCOREBOARD_TABLE).upsert(
      {
        match_id: OWNER_UPI_SUPABASE_DOC_ID,
        data: saved,
        updated_at: saved.updatedAt,
      },
      { onConflict: 'match_id' }
    );
    return { saved, syncedCloud: !error };
  } catch {
    return { saved, syncedCloud: false };
  }
}

export function generateWorldCupOrderId(): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `SELWC${rand}`;
}

export function buildWorldCupUpiUri(params: {
  upiId: string;
  payeeName: string;
  amountInr?: number;
  orderId: string;
}): string {
  const amount = (params.amountInr ?? WORLDCUP_OFFER_PRICE_INR).toFixed(2);
  const upiId = sanitizeUpiId(params.upiId) || DEFAULT_OWNER_UPI_CONFIG.upiId;
  const payeeName = params.payeeName.trim() || DEFAULT_OWNER_UPI_CONFIG.payeeName;
  const note = `WorldCup Scoreboard 1 Day Unlock (${params.orderId})`;
  return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    payeeName
  )}&am=${amount}&cu=INR&tr=${encodeURIComponent(params.orderId)}&tn=${encodeURIComponent(note)}`;
}

export function isWorldCupUnlocked(
  user: Partial<UserAccountDetails> | null | undefined,
  nowMs = Date.now()
): boolean {
  const raw = user?.worldcupUnlockExpiresAt;
  if (!raw || typeof raw !== 'string') return false;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) && parsed > nowMs;
}

export function createWorldCupUnlockExpiryIso(fromMs = Date.now()): string {
  return new Date(fromMs + WORLDCUP_UNLOCK_DURATION_MS).toISOString();
}

export function formatWorldCupRemainingTime(
  expiresAt?: string | null,
  nowMs = Date.now()
): string {
  if (!expiresAt) return 'Locked';
  const target = Date.parse(expiresAt);
  if (!Number.isFinite(target)) return 'Locked';
  const diffMs = target - nowMs;
  if (diffMs <= 0) return 'Expired';

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h left`;
  }
  if (hours > 0) {
    return `${hours}h ${mins}m left`;
  }
  return `${Math.max(1, mins)}m left`;
}

export function formatWorldCupExpiryDate(expiresAt?: string | null): string {
  if (!expiresAt) return '—';
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
