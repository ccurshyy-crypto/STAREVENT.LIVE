import { useCallback, useEffect, useState } from 'react';
import { useOverlayAccess } from '../context/OverlayAccessContext';

export const TOURNAMENT_PRICE_PER_DAY_INR = 99;

export type TournamentCodeStatus = 'ACTIVE' | 'REDEEMED' | 'USED' | 'REVOKED';

export interface TournamentUnlockPass {
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

export interface TournamentUnlockStatusState {
  loading: boolean;
  authenticated: boolean;
  customerId: string | null;
  pricePerDayInr: number;
  activePasses: TournamentUnlockPass[];
  usedPasses: TournamentUnlockPass[];
}

async function parseTournamentApiResponse<T extends { ok?: boolean; error?: string }>(
  res: Response,
  actionLabel: string
): Promise<{ parsed: T | null; fallbackError: string }> {
  const rawText = await res.text().catch(() => '');
  const trimmed = rawText.trim();
  if (trimmed) {
    try {
      const json = JSON.parse(trimmed) as T;
      if (json && typeof json === 'object') {
        return { parsed: json, fallbackError: '' };
      }
    } catch {
      // Non-JSON payload
    }
  }
  return {
    parsed: null,
    fallbackError: `Server returned HTTP ${res.status} while ${actionLabel}. Please try again.`,
  };
}

export async function fetchTournamentUnlockStatus(
  authHeaders: Record<string, string>
): Promise<TournamentUnlockStatusState> {
  try {
    const res = await fetch('/api/tournaments/unlock/status', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...authHeaders,
      },
    });
    if (res.status === 401) {
      return {
        loading: false,
        authenticated: false,
        customerId: null,
        pricePerDayInr: TOURNAMENT_PRICE_PER_DAY_INR,
        activePasses: [],
        usedPasses: [],
      };
    }
    const { parsed } = await parseTournamentApiResponse<{
      ok?: boolean;
      authenticated?: boolean;
      customerId?: string;
      pricePerDayInr?: number;
      activePasses?: TournamentUnlockPass[];
      usedPasses?: TournamentUnlockPass[];
    }>(res, 'checking tournament unlock status');

    if (!res.ok || !parsed?.ok) {
      return {
        loading: false,
        authenticated: true,
        customerId: null,
        pricePerDayInr: TOURNAMENT_PRICE_PER_DAY_INR,
        activePasses: [],
        usedPasses: [],
      };
    }

    return {
      loading: false,
      authenticated: true,
      customerId: typeof parsed.customerId === 'string' ? parsed.customerId : null,
      pricePerDayInr:
        typeof parsed.pricePerDayInr === 'number'
          ? parsed.pricePerDayInr
          : TOURNAMENT_PRICE_PER_DAY_INR,
      activePasses: Array.isArray(parsed.activePasses) ? parsed.activePasses : [],
      usedPasses: Array.isArray(parsed.usedPasses) ? parsed.usedPasses : [],
    };
  } catch {
    return {
      loading: false,
      authenticated: false,
      customerId: null,
      pricePerDayInr: TOURNAMENT_PRICE_PER_DAY_INR,
      activePasses: [],
      usedPasses: [],
    };
  }
}

export async function redeemTournamentUnlockCode(
  authHeaders: Record<string, string>,
  code: string
): Promise<{
  ok: boolean;
  pass?: TournamentUnlockPass;
  activePasses?: TournamentUnlockPass[];
  usedPasses?: TournamentUnlockPass[];
  error?: string;
}> {
  const res = await fetch('/api/tournaments/unlock/redeem', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({ code: code.trim().toUpperCase() }),
  });

  const { parsed, fallbackError } = await parseTournamentApiResponse<{
    ok?: boolean;
    pass?: TournamentUnlockPass;
    activePasses?: TournamentUnlockPass[];
    usedPasses?: TournamentUnlockPass[];
    error?: string;
  }>(res, 'redeeming tournament unlock code');

  if (!parsed) {
    return { ok: false, error: fallbackError };
  }
  if (!res.ok || !parsed.ok) {
    return { ok: false, error: parsed.error || 'Invalid Tournament Unlock Code.' };
  }
  return {
    ok: true,
    pass: parsed.pass,
    activePasses: parsed.activePasses,
    usedPasses: parsed.usedPasses,
  };
}

export async function consumeTournamentUnlockPass(
  authHeaders: Record<string, string>,
  params: {
    code: string;
    tournamentId: string;
    tournamentName: string;
    selectedDates: string[];
  }
): Promise<{
  ok: boolean;
  pass?: TournamentUnlockPass;
  activePasses?: TournamentUnlockPass[];
  usedPasses?: TournamentUnlockPass[];
  error?: string;
}> {
  const res = await fetch('/api/tournaments/unlock/consume', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify(params),
  });

  const { parsed, fallbackError } = await parseTournamentApiResponse<{
    ok?: boolean;
    pass?: TournamentUnlockPass;
    activePasses?: TournamentUnlockPass[];
    usedPasses?: TournamentUnlockPass[];
    error?: string;
  }>(res, 'verifying tournament unlock pass');

  if (!parsed) {
    return { ok: false, error: fallbackError };
  }
  if (!res.ok || !parsed.ok) {
    return { ok: false, error: parsed.error || 'Could not consume tournament unlock code.' };
  }
  return {
    ok: true,
    pass: parsed.pass,
    activePasses: parsed.activePasses,
    usedPasses: parsed.usedPasses,
  };
}

const TOURNAMENT_UNLOCK_REFRESH_EVENT = 'starevent:tournament-unlock-refresh';

export function emitTournamentUnlockRefresh(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TOURNAMENT_UNLOCK_REFRESH_EVENT));
  }
}

export function useTournamentUnlockStatus(): {
  status: TournamentUnlockStatusState;
  refresh: () => Promise<TournamentUnlockStatusState>;
} {
  const { session, getPaymentAuthHeaders } = useOverlayAccess();
  const [status, setStatus] = useState<TournamentUnlockStatusState>({
    loading: true,
    authenticated: false,
    customerId: null,
    pricePerDayInr: TOURNAMENT_PRICE_PER_DAY_INR,
    activePasses: [],
    usedPasses: [],
  });

  const refresh = useCallback(async () => {
    const headers = await getPaymentAuthHeaders();
    const next = await fetchTournamentUnlockStatus(headers);
    setStatus(next);
    return next;
  }, [getPaymentAuthHeaders]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const headers = await getPaymentAuthHeaders();
      const next = await fetchTournamentUnlockStatus(headers);
      if (active) setStatus(next);
    };
    void load();

    const onRefresh = () => {
      void load();
    };
    window.addEventListener(TOURNAMENT_UNLOCK_REFRESH_EVENT, onRefresh);
    window.addEventListener('focus', onRefresh);
    return () => {
      active = false;
      window.removeEventListener(TOURNAMENT_UNLOCK_REFRESH_EVENT, onRefresh);
      window.removeEventListener('focus', onRefresh);
    };
  }, [session?.accessId, getPaymentAuthHeaders]);

  return { status, refresh };
}
