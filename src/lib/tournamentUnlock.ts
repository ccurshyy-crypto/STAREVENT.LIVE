import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { auth, signInWithGooglePopup, subscribeFirebaseAuth } from '../firebase';
import { useOverlayAccess } from '../context/OverlayAccessContext';
import {
  bindTournamentToUnlockCodeInFirestore,
  redeemTournamentUnlockCodeInFirestore,
  subscribeCustomerTournamentPassesInFirestore,
  TOURNAMENT_PRICE_PER_DAY_INR,
  type FirestoreTournamentUnlockCode,
  type FirestoreUnlockCodeStatus,
} from './firestoreTournamentCodes';

export { TOURNAMENT_PRICE_PER_DAY_INR };

export type TournamentCodeStatus = FirestoreUnlockCodeStatus;

export interface TournamentUnlockPass {
  id: string;
  code: string;
  duration_days: number;
  price_per_day_inr: number;
  total_price_inr: number;
  assigned_customer_id: string | null;
  customer_label: string;
  status: TournamentCodeStatus;
  created_by: string;
  created_at: string;
  expires_at: string;
  is_expired: boolean;
  remaining_days: number;
  redeemed_by_customer_id: string | null;
  redeemed_by_uid: string | null;
  redeemed_at: string | null;
  consumed_tournament_id: string | null;
  consumed_tournament_name: string | null;
  updated_at: string;
}

export interface TournamentUnlockStatusState {
  loading: boolean;
  authenticated: boolean;
  firebaseReady: boolean;
  firebaseEmail: string | null;
  customerId: string | null;
  pricePerDayInr: number;
  activePasses: TournamentUnlockPass[];
  usedPasses: TournamentUnlockPass[];
}

export function mapFirestorePassToLegacyShape(
  rec: FirestoreTournamentUnlockCode
): TournamentUnlockPass {
  return {
    id: rec.id,
    code: rec.unlockCode,
    duration_days: rec.durationDays,
    price_per_day_inr: TOURNAMENT_PRICE_PER_DAY_INR,
    total_price_inr: rec.amount,
    assigned_customer_id: rec.lockedCustomerId,
    customer_label: rec.customerNote,
    status: rec.effectiveStatus,
    created_by: rec.createdBy,
    created_at: rec.createdAtIso,
    expires_at: rec.expiresAtIso,
    is_expired: rec.isExpired,
    remaining_days: rec.remainingDays,
    redeemed_by_customer_id: rec.redeemedBy,
    redeemed_by_uid: rec.redeemedByUid,
    redeemed_at: rec.redeemedAtIso,
    consumed_tournament_id: rec.tournamentId,
    consumed_tournament_name: rec.tournamentName,
    updated_at: rec.updatedAtIso,
  };
}

export async function ensureCustomerFirebaseAuth(): Promise<{
  ok: boolean;
  user?: User;
  error?: string;
}> {
  const existing = auth.currentUser;
  if (existing && existing.emailVerified) {
    return { ok: true, user: existing };
  }
  try {
    const user = await signInWithGooglePopup();
    if (!user.emailVerified) {
      return {
        ok: false,
        error: 'Your Google account email must be verified to redeem unlock codes.',
      };
    }
    return { ok: true, user };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('popup-closed')) {
      return {
        ok: false,
        error: 'Google sign-in popup was closed. Please sign in to verify and redeem your code.',
      };
    }
    return {
      ok: false,
      error: 'Please sign in with Google to verify your account with Firebase.',
    };
  }
}

export async function redeemTournamentUnlockCode(
  code: string,
  customerIdentifiers: string[],
  customerDisplayLabel: string
): Promise<{
  ok: boolean;
  pass?: TournamentUnlockPass;
  error?: string;
}> {
  const authCheck = await ensureCustomerFirebaseAuth();
  if (!authCheck.ok || !authCheck.user) {
    return { ok: false, error: authCheck.error || 'Firebase sign-in required.' };
  }

  const res = await redeemTournamentUnlockCodeInFirestore({
    code,
    customerIdentifiers,
    customerDisplayLabel:
      customerDisplayLabel || authCheck.user.email || authCheck.user.uid,
  });

  if (!res.ok || !res.pass) {
    return { ok: false, error: res.error || 'Invalid Tournament Unlock Code.' };
  }

  emitTournamentUnlockRefresh();
  return {
    ok: true,
    pass: mapFirestorePassToLegacyShape(res.pass),
  };
}

export async function consumeTournamentUnlockPass(params: {
  code: string;
  tournamentId: string;
  tournamentName: string;
}): Promise<{
  ok: boolean;
  error?: string;
}> {
  const authCheck = await ensureCustomerFirebaseAuth();
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error || 'Firebase sign-in required.' };
  }

  const res = await bindTournamentToUnlockCodeInFirestore(params);
  if (!res.ok) {
    return { ok: false, error: res.error || 'Could not lock tournament to unlock code.' };
  }

  emitTournamentUnlockRefresh();
  return { ok: true };
}

const TOURNAMENT_UNLOCK_REFRESH_EVENT = 'starevent:tournament-unlock-refresh';

export function emitTournamentUnlockRefresh(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TOURNAMENT_UNLOCK_REFRESH_EVENT));
  }
}

export function useTournamentUnlockStatus(): {
  status: TournamentUnlockStatusState;
  refresh: () => Promise<void>;
  signInFirebase: () => Promise<{ ok: boolean; error?: string }>;
} {
  const { session } = useOverlayAccess();
  const [fbUser, setFbUser] = useState<User | null>(() => auth.currentUser);
  const [fbAuthChecked, setFbAuthChecked] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [status, setStatus] = useState<TournamentUnlockStatusState>({
    loading: true,
    authenticated: false,
    firebaseReady: false,
    firebaseEmail: null,
    customerId: session?.accessId ?? null,
    pricePerDayInr: TOURNAMENT_PRICE_PER_DAY_INR,
    activePasses: [],
    usedPasses: [],
  });

  useEffect(() => {
    const unsub = subscribeFirebaseAuth((user) => {
      setFbUser(user);
      setFbAuthChecked(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const onRefresh = () => setReloadTick((t) => t + 1);
    window.addEventListener(TOURNAMENT_UNLOCK_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(TOURNAMENT_UNLOCK_REFRESH_EVENT, onRefresh);
  }, []);

  useEffect(() => {
    if (!fbAuthChecked) return;

    if (!fbUser || !fbUser.emailVerified) {
      setStatus({
        loading: false,
        authenticated: Boolean(session?.accessId),
        firebaseReady: false,
        firebaseEmail: null,
        customerId: session?.accessId ?? null,
        pricePerDayInr: TOURNAMENT_PRICE_PER_DAY_INR,
        activePasses: [],
        usedPasses: [],
      });
      return;
    }

    const unsub = subscribeCustomerTournamentPassesInFirestore({
      firebaseUid: fbUser.uid,
      onData: (active, used) => {
        setStatus({
          loading: false,
          authenticated: true,
          firebaseReady: true,
          firebaseEmail: fbUser.email || null,
          customerId: session?.accessId || fbUser.email || fbUser.uid,
          pricePerDayInr: TOURNAMENT_PRICE_PER_DAY_INR,
          activePasses: active.map(mapFirestorePassToLegacyShape),
          usedPasses: used.map(mapFirestorePassToLegacyShape),
        });
      },
      onError: () => {
        setStatus((prev) => ({
          ...prev,
          loading: false,
          firebaseReady: true,
          firebaseEmail: fbUser.email || null,
        }));
      },
    });

    return () => unsub();
  }, [fbAuthChecked, fbUser, session?.accessId, reloadTick]);

  const refresh = useCallback(async () => {
    setReloadTick((t) => t + 1);
  }, []);

  const signInFirebase = useCallback(async () => {
    const res = await ensureCustomerFirebaseAuth();
    if (res.ok && res.user) {
      setFbUser(res.user);
      setReloadTick((t) => t + 1);
      return { ok: true };
    }
    return { ok: false, error: res.error };
  }, []);

  return { status, refresh, signInFirebase };
}
