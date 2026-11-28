/**
 * Phase 0 Security TDD Test Suite — "Dirty Dozen" Payloads
 * Verifies that all adversarial payloads against Star Event Live Firestore
 * rules return PERMISSION_DENIED when executed against the Firebase Emulator.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  path: string;
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_PAYLOADS: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Cross-Tenant Score Hijack',
    operation: 'update',
    path: '/liveScoreboards/STAREVENT_ROOM_A',
    auth: { uid: 'user_attacker_b', email: 'attacker@example.com', email_verified: true },
    payload: { runs: 500, revision: 99 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Owner UID Spoofing on Create',
    operation: 'create',
    path: '/liveScoreboards/STAREVENT_ROOM_X',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    payload: { roomId: 'STAREVENT_ROOM_X', ownerUid: 'user_victim_b', runs: 0, wickets: 0 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Customer Code Generation Escalation',
    operation: 'create',
    path: '/tournamentUnlockCodes/TRN-30D-HACK-9999',
    auth: { uid: 'customer_a', email: 'customer@example.com', email_verified: true },
    payload: {
      id: 'TRN-30D-HACK-9999',
      unlockCode: 'TRN-30D-HACK-9999',
      durationDays: 30,
      amount: 2970,
      status: 'ACTIVE',
      createdBy: 'customer_a',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow / Ghost Field Injection on Unlock Code',
    operation: 'update',
    path: '/tournamentUnlockCodes/TRN-3D-ABCD-EFGH',
    auth: { uid: 'customer_a', email: 'customer@example.com', email_verified: true },
    payload: { status: 'REDEEMED', isAdminOverride: true, freeCredits: 999 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Unauthenticated Unlock Code Mutation',
    operation: 'update',
    path: '/tournamentUnlockCodes/TRN-3D-ABCD-EFGH',
    auth: null,
    payload: { status: 'REDEEMED', redeemedBy: 'anon' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Collection Scraping via Unbounded List Query',
    operation: 'list',
    path: '/tournamentUnlockCodes',
    auth: { uid: 'customer_a', email: 'customer@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Unverified Admin Email Spoof',
    operation: 'create',
    path: '/tournamentUnlockCodes/TRN-7D-SPOO-F123',
    auth: { uid: 'spoof_uid', email: 'ccurshyy@gmail.com', email_verified: false },
    payload: {
      id: 'TRN-7D-SPOO-F123',
      unlockCode: 'TRN-7D-SPOO-F123',
      durationDays: 7,
      amount: 693,
      status: 'ACTIVE',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Customer Price / Duration / Expiry Tampering',
    operation: 'update',
    path: '/tournamentUnlockCodes/TRN-1D-ABCD-EFGH',
    auth: { uid: 'customer_a', email: 'customer@example.com', email_verified: true },
    payload: {
      status: 'REDEEMED',
      durationDays: 365,
      amount: 0,
      redeemedBy: 'CUST1',
      redeemedByUid: 'customer_a',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Path Variable ID Poisoning',
    operation: 'create',
    path: '/tournamentUnlockCodes/bad$$$id_with_special_chars_and_oversized_segment',
    auth: { uid: 'admin_uid', email: 'ccurshyy@gmail.com', email_verified: true },
    payload: { status: 'ACTIVE', durationDays: 3, amount: 297 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Client-Forged Timestamp Injection on Redemption',
    operation: 'update',
    path: '/tournamentUnlockCodes/TRN-3D-ABCD-EFGH',
    auth: { uid: 'customer_a', email: 'customer@example.com', email_verified: true },
    payload: {
      status: 'REDEEMED',
      redeemedAt: '1999-01-01T00:00:00Z',
      redeemedBy: 'CUST1',
      redeemedByUid: 'customer_a',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Double Redemption / Second Tournament Hijack',
    operation: 'update',
    path: '/tournamentUnlockCodes/TRN-3D-REDE-EMED',
    auth: { uid: 'customer_b', email: 'b@example.com', email_verified: true },
    payload: {
      status: 'REDEEMED',
      redeemedBy: 'CUST2',
      redeemedByUid: 'customer_b',
      tournamentId: 'tour_second_attempt',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Historical Code Deletion & Admin Escalation',
    operation: 'delete',
    path: '/tournamentUnlockCodes/TRN-3D-ABCD-EFGH',
    auth: { uid: 'admin_uid', email: 'ccurshyy@gmail.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
];
