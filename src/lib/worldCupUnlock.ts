import { useCallback, useEffect, useState } from 'react';
import { useOverlayAccess } from '../context/OverlayAccessContext';

export type PaidThemeId = 'worldcup' | 'lightning-pro';

export interface PaidThemeCatalogItem {
  themeId: PaidThemeId;
  productCode: string;
  productName: string;
  shortName: string;
  priceInr: number;
  currency: 'INR';
}

export const PAID_THEME_CATALOG: Record<PaidThemeId, PaidThemeCatalogItem> = {
  worldcup: {
    themeId: 'worldcup',
    productCode: 'worldcup_scoreboard',
    productName: 'WorldCup Scoreboard',
    shortName: 'WorldCup',
    priceInr: 149,
    currency: 'INR',
  },
  'lightning-pro': {
    themeId: 'lightning-pro',
    productCode: 'lightning_pro_scoreboard',
    productName: 'Lightning Premier Scoreboard',
    shortName: 'Lightning Premier',
    priceInr: 79,
    currency: 'INR',
  },
};

export const WORLDCUP_PRODUCT_NAME = PAID_THEME_CATALOG.worldcup.productName;
export const WORLDCUP_FIXED_PRICE_INR = PAID_THEME_CATALOG.worldcup.priceInr;
export const LIGHTNING_PRO_FIXED_PRICE_INR = PAID_THEME_CATALOG['lightning-pro'].priceInr;
export const WORLDCUP_FIXED_CURRENCY = 'INR';

export function isPaidThemeId(themeId: string | null | undefined): themeId is PaidThemeId {
  return themeId === 'worldcup' || themeId === 'lightning-pro';
}

export function getPaidThemeConfig(themeId: PaidThemeId): PaidThemeCatalogItem {
  return PAID_THEME_CATALOG[themeId] ?? PAID_THEME_CATALOG.worldcup;
}

export interface ThemeEntitlementDetail {
  unlocked: boolean;
  grantSource: 'cashfree' | 'admin_manual' | null;
  orderId: string | null;
  cfPaymentId: string | null;
  unlockedAt: string | null;
  expiresAt: string | null;
}

export interface ServerWorldCupStatus {
  loading: boolean;
  unlocked: boolean;
  unlockedThemes: Record<PaidThemeId, boolean>;
  themeEntitlements: Record<PaidThemeId, ThemeEntitlementDetail>;
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
  themeId?: PaidThemeId;
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
  themeId?: PaidThemeId;
  unlockedThemes?: Record<PaidThemeId, boolean>;
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
  orderId?: string;
  cfPaymentId?: string | null;
  amount?: number;
  currency?: string;
  verifiedAt?: string | null;
  message?: string;
  error?: string;
}

const EMPTY_DETAIL: ThemeEntitlementDetail = {
  unlocked: false,
  grantSource: null,
  orderId: null,
  cfPaymentId: null,
  unlockedAt: null,
  expiresAt: null,
};

function makeEmptyStatus(authenticated = false, loading = false): ServerWorldCupStatus {
  return {
    loading,
    unlocked: false,
    unlockedThemes: {
      worldcup: false,
      'lightning-pro': false,
    },
    themeEntitlements: {
      worldcup: { ...EMPTY_DETAIL },
      'lightning-pro': { ...EMPTY_DETAIL },
    },
    authenticated,
    cashfreeConfigured: false,
    customerId: null,
    grantSource: null,
    orderId: null,
    cfPaymentId: null,
    unlockedAt: null,
    expiresAt: null,
  };
}

function parseEntitlementDetail(raw: unknown): ThemeEntitlementDetail {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_DETAIL };
  const obj = raw as Record<string, unknown>;
  return {
    unlocked: obj.unlocked === true,
    grantSource:
      obj.grantSource === 'cashfree' || obj.grantSource === 'admin_manual'
        ? obj.grantSource
        : null,
    orderId: typeof obj.orderId === 'string' ? obj.orderId : null,
    cfPaymentId: typeof obj.cfPaymentId === 'string' ? obj.cfPaymentId : null,
    unlockedAt: typeof obj.unlockedAt === 'string' ? obj.unlockedAt : null,
    expiresAt: typeof obj.expiresAt === 'string' ? obj.expiresAt : null,
  };
}

export function isThemeUnlockedInStatus(
  themeId: string,
  status: Pick<ServerWorldCupStatus, 'unlockedThemes'>
): boolean {
  if (!isPaidThemeId(themeId)) return true;
  return status.unlockedThemes[themeId] === true;
}

/**
 * Queries authoritative backend database for the signed-in customer's
 * paid scoreboard theme entitlements. Never trusts localStorage or client state.
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
      return makeEmptyStatus(false, false);
    }
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok || !json?.ok) {
      return makeEmptyStatus(true, false);
    }

    const rawUnlockedThemes =
      json.unlockedThemes && typeof json.unlockedThemes === 'object'
        ? (json.unlockedThemes as Record<string, unknown>)
        : {};
    const worldcupUnlocked =
      rawUnlockedThemes.worldcup === true || json.unlocked === true;
    const lightningProUnlocked = rawUnlockedThemes['lightning-pro'] === true;

    const rawEntitlements =
      json.themeEntitlements && typeof json.themeEntitlements === 'object'
        ? (json.themeEntitlements as Record<string, unknown>)
        : {};

    const wcDetail: ThemeEntitlementDetail = rawEntitlements.worldcup
      ? parseEntitlementDetail(rawEntitlements.worldcup)
      : {
          unlocked: worldcupUnlocked,
          grantSource:
            json.grantSource === 'cashfree' || json.grantSource === 'admin_manual'
              ? json.grantSource
              : null,
          orderId: typeof json.orderId === 'string' ? json.orderId : null,
          cfPaymentId: typeof json.cfPaymentId === 'string' ? json.cfPaymentId : null,
          unlockedAt: typeof json.unlockedAt === 'string' ? json.unlockedAt : null,
          expiresAt: typeof json.expiresAt === 'string' ? json.expiresAt : null,
        };

    const lpDetail: ThemeEntitlementDetail = rawEntitlements['lightning-pro']
      ? parseEntitlementDetail(rawEntitlements['lightning-pro'])
      : { ...EMPTY_DETAIL, unlocked: lightningProUnlocked };

    return {
      loading: false,
      unlocked: worldcupUnlocked,
      unlockedThemes: {
        worldcup: worldcupUnlocked,
        'lightning-pro': lightningProUnlocked,
      },
      themeEntitlements: {
        worldcup: wcDetail,
        'lightning-pro': lpDetail,
      },
      authenticated: true,
      cashfreeConfigured: json.cashfreeConfigured === true,
      customerId: typeof json.customerId === 'string' ? json.customerId : null,
      grantSource: wcDetail.grantSource,
      orderId: wcDetail.orderId,
      cfPaymentId: wcDetail.cfPaymentId,
      unlockedAt: wcDetail.unlockedAt,
      expiresAt: wcDetail.expiresAt,
    };
  } catch {
    return makeEmptyStatus(false, false);
  }
}

/**
 * Read-only backend entitlement check used by Standalone OBS / vMix overlay pages.
 */
export async function fetchOverlayThemeEntitlements(
  uid: string
): Promise<Record<PaidThemeId, boolean>> {
  const clean = String(uid || '').trim();
  if (!clean) {
    return { worldcup: false, 'lightning-pro': false };
  }
  try {
    const res = await fetch(`/api/payments/worldcup/entitlement/${encodeURIComponent(clean)}`, {
      method: 'GET',
      cache: 'no-store',
    });
    if (!res.ok) return { worldcup: false, 'lightning-pro': false };
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      unlocked?: boolean;
      unlockedThemes?: Record<string, unknown>;
    } | null;
    if (!json?.ok) return { worldcup: false, 'lightning-pro': false };
    return {
      worldcup: Boolean(json.unlockedThemes?.worldcup === true || json.unlocked === true),
      'lightning-pro': Boolean(json.unlockedThemes?.['lightning-pro'] === true),
    };
  } catch {
    return { worldcup: false, 'lightning-pro': false };
  }
}

export async function fetchOverlayWorldCupEntitlement(uid: string): Promise<boolean> {
  const res = await fetchOverlayThemeEntitlements(uid);
  return res.worldcup;
}

export async function createCashfreeWorldCupOrder(
  authHeaders: Record<string, string>,
  customerContact?: {
    themeId?: PaidThemeId;
    customerEmail?: string;
    customerPhone?: string;
  }
): Promise<CreateCashfreeOrderResponse> {
  const res = await fetch('/api/payments/worldcup/create-order', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({
      themeId: customerContact?.themeId || 'worldcup',
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

export interface CreateUpiQrOrderResponse {
  ok: boolean;
  alreadyUnlocked?: boolean;
  unlocked?: boolean;
  themeId?: PaidThemeId;
  productName?: string;
  orderId?: string;
  amount?: number;
  currency?: string;
  upiId?: string;
  payeeName?: string;
  upiUri?: string;
  qrDataUrl?: string;
  staticQrImageUrl?: string;
  error?: string;
}

export interface SubmitUpiQrProofResponse {
  ok: boolean;
  unlocked: boolean;
  paymentStatus?: string;
  orderId?: string;
  utr?: string;
  message?: string;
  error?: string;
}

export async function createOwnerUpiQrOrder(
  authHeaders: Record<string, string>,
  params: { themeId?: PaidThemeId; customerEmail?: string }
): Promise<CreateUpiQrOrderResponse> {
  const res = await fetch('/api/payments/upi-qr/create-order', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({
      themeId: params.themeId || 'worldcup',
      customerEmail: params.customerEmail || '',
    }),
  });
  const json = (await res.json().catch(() => null)) as CreateUpiQrOrderResponse | null;
  if (!json) {
    return { ok: false, error: 'Invalid server response while generating UPI QR code.' };
  }
  return json;
}

export async function submitOwnerUpiQrProof(
  authHeaders: Record<string, string>,
  params: { orderId: string; utr: string }
): Promise<SubmitUpiQrProofResponse> {
  const res = await fetch('/api/payments/upi-qr/submit-proof', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({
      orderId: params.orderId,
      utr: params.utr,
    }),
  });
  const json = (await res.json().catch(() => null)) as SubmitUpiQrProofResponse | null;
  if (!json) {
    return {
      ok: false,
      unlocked: false,
      error: 'Invalid server response while submitting payment UTR reference.',
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
 * Authoritative React hook that checks paid theme unlock status strictly against
 * the backend database via GET /api/payments/worldcup/status.
 */
export function useWorldCupServerUnlock(): {
  status: ServerWorldCupStatus;
  refresh: () => Promise<ServerWorldCupStatus>;
} {
  const { session, getPaymentAuthHeaders } = useOverlayAccess();
  const [status, setStatus] = useState<ServerWorldCupStatus>(() =>
    makeEmptyStatus(false, true)
  );

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
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const returnedOrderId = params.get('cf_order_id')?.trim();
        if (returnedOrderId) {
          await verifyCashfreeWorldCupOrder(headers, returnedOrderId).catch(() => null);
          params.delete('cf_order_id');
          const cleanSearch = params.toString();
          const nextUrl = `${window.location.pathname}${cleanSearch ? `?${cleanSearch}` : ''}${window.location.hash}`;
          window.history.replaceState({}, '', nextUrl);
        }
      }
      const next = await fetchServerWorldCupStatus(headers);
      if (active) setStatus(next);
    };
    void load();

    const onRefresh = () => {
      void load();
    };
    window.addEventListener(UNLOCK_REFRESH_EVENT, onRefresh);
    window.addEventListener('focus', onRefresh);
    return () => {
      active = false;
      window.removeEventListener(UNLOCK_REFRESH_EVENT, onRefresh);
      window.removeEventListener('focus', onRefresh);
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
