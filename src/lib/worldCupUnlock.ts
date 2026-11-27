import { useCallback, useEffect, useState } from 'react';
import { useOverlayAccess } from '../context/OverlayAccessContext';

export const WORLDCUP_PRODUCT_NAME = 'WorldCup Scoreboard';
export const WORLDCUP_FIXED_PRICE_INR = 149;
export const WORLDCUP_FIXED_CURRENCY = 'INR';

export interface ServerWorldCupStatus {
  loading: boolean;
  unlocked: boolean;
  authenticated: boolean;
  cashfreeConfigured: boolean;
  customerId: string | null;
  grantSource: 'cashfree' | 'admin_manual' | null;
  orderId: string | null;
  cfPaymentId: string | null;
  unlockedAt: string | null;
  expiresAt: string | null;
}

export interface CreateCashfreeOrderResponse {
  ok: boolean;
  alreadyUnlocked?: boolean;
  unlocked?: boolean;
  orderId?: string;
  paymentSessionId?: string;
  amount?: number;
  currency?: string;
  mode?: 'production';
  configRequired?: boolean;
  error?: string;
}

export interface VerifyCashfreeOrderResponse {
  ok: boolean;
  unlocked: boolean;
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
  orderId?: string;
  cfPaymentId?: string | null;
  amount?: number;
  currency?: string;
  verifiedAt?: string | null;
  message?: string;
  error?: string;
}

/**
 * Queries authoritative backend database for the signed-in customer's
 * WorldCup Scoreboard unlock entitlement. Never trusts localStorage or client state.
 */
export async function fetchServerWorldCupStatus(
  authHeaders: Record<string, string>
): Promise<ServerWorldCupStatus> {
  try {
    const res = await fetch('/api/payments/worldcup/status', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: authHeaders,
    });
    if (res.status === 401) {
      return {
        loading: false,
        unlocked: false,
        authenticated: false,
        cashfreeConfigured: false,
        customerId: null,
        grantSource: null,
        orderId: null,
        cfPaymentId: null,
        unlockedAt: null,
        expiresAt: null,
      };
    }
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok || !json?.ok) {
      return {
        loading: false,
        unlocked: false,
        authenticated: true,
        cashfreeConfigured: false,
        customerId: null,
        grantSource: null,
        orderId: null,
        cfPaymentId: null,
        unlockedAt: null,
        expiresAt: null,
      };
    }

    return {
      loading: false,
      unlocked: json.unlocked === true,
      authenticated: true,
      cashfreeConfigured: json.cashfreeConfigured === true,
      customerId: typeof json.customerId === 'string' ? json.customerId : null,
      grantSource:
        json.grantSource === 'cashfree' || json.grantSource === 'admin_manual'
          ? json.grantSource
          : null,
      orderId: typeof json.orderId === 'string' ? json.orderId : null,
      cfPaymentId: typeof json.cfPaymentId === 'string' ? json.cfPaymentId : null,
      unlockedAt: typeof json.unlockedAt === 'string' ? json.unlockedAt : null,
      expiresAt: typeof json.expiresAt === 'string' ? json.expiresAt : null,
    };
  } catch {
    return {
      loading: false,
      unlocked: false,
      authenticated: false,
      cashfreeConfigured: false,
      customerId: null,
      grantSource: null,
      orderId: null,
      cfPaymentId: null,
      unlockedAt: null,
      expiresAt: null,
    };
  }
}

/**
 * Read-only backend entitlement check used by Standalone OBS / vMix overlay pages.
 */
export async function fetchOverlayWorldCupEntitlement(uid: string): Promise<boolean> {
  const clean = String(uid || '').trim();
  if (!clean) return false;
  try {
    const res = await fetch(`/api/payments/worldcup/entitlement/${encodeURIComponent(clean)}`, {
      method: 'GET',
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const json = (await res.json().catch(() => null)) as { ok?: boolean; unlocked?: boolean } | null;
    return Boolean(json?.ok && json?.unlocked === true);
  } catch {
    return false;
  }
}

export async function createCashfreeWorldCupOrder(
  authHeaders: Record<string, string>,
  customerContact?: { customerEmail?: string; customerPhone?: string }
): Promise<CreateCashfreeOrderResponse> {
  const res = await fetch('/api/payments/worldcup/create-order', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({
      customerEmail: customerContact?.customerEmail || '',
      customerPhone: customerContact?.customerPhone || '',
    }),
  });
  const json = (await res.json().catch(() => null)) as CreateCashfreeOrderResponse | null;
  if (!json) {
    return { ok: false, error: 'Invalid server response while creating Cashfree order.' };
  }
  return json;
}

export async function verifyCashfreeWorldCupOrder(
  authHeaders: Record<string, string>,
  orderId: string
): Promise<VerifyCashfreeOrderResponse> {
  const res = await fetch('/api/payments/worldcup/verify', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({ orderId }),
  });
  const json = (await res.json().catch(() => null)) as VerifyCashfreeOrderResponse | null;
  if (!json) {
    return {
      ok: false,
      unlocked: false,
      error: 'Invalid server response while verifying Cashfree payment.',
    };
  }
  return json;
}

// Broadcast in-tab refresh event when a server-verified unlock succeeds
const UNLOCK_REFRESH_EVENT = 'starevent:worldcup-unlock-refresh';

export function emitWorldCupUnlockRefresh(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(UNLOCK_REFRESH_EVENT));
  }
}

/**
 * Authoritative React hook that checks WorldCup unlock status strictly against
 * the backend database via GET /api/payments/worldcup/status.
 */
export function useWorldCupServerUnlock(): {
  status: ServerWorldCupStatus;
  refresh: () => Promise<ServerWorldCupStatus>;
} {
  const { session, getPaymentAuthHeaders } = useOverlayAccess();
  const [status, setStatus] = useState<ServerWorldCupStatus>({
    loading: true,
    unlocked: false,
    authenticated: false,
    cashfreeConfigured: false,
    customerId: null,
    grantSource: null,
    orderId: null,
    cfPaymentId: null,
    unlockedAt: null,
    expiresAt: null,
  });

  const refresh = useCallback(async () => {
    const headers = await getPaymentAuthHeaders();
    const next = await fetchServerWorldCupStatus(headers);
    setStatus(next);
    return next;
  }, [getPaymentAuthHeaders]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const headers = await getPaymentAuthHeaders();
      const next = await fetchServerWorldCupStatus(headers);
      if (active) setStatus(next);
    };
    void load();

    const onRefresh = () => {
      void load();
    };
    window.addEventListener(UNLOCK_REFRESH_EVENT, onRefresh);
    return () => {
      active = false;
      window.removeEventListener(UNLOCK_REFRESH_EVENT, onRefresh);
    };
  }, [session?.accessId, getPaymentAuthHeaders]);

  return { status, refresh };
}

export function formatUnlockTimestamp(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
