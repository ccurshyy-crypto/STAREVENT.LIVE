/**
 * Phase 0 Security TDD Test Suite — "Dirty Dozen" Payloads
 * Verifies that all 12 adversarial payloads against Star Event Live Firestore
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
    name: 'Immutable Owner Transfer on Update',
    operation: 'update',
    path: '/liveScoreboards/STAREVENT_ROOM_A',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    payload: { ownerUid: 'user_b' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow / Ghost Field Injection',
    operation: 'update',
    path: '/liveScoreboards/STAREVENT_ROOM_A',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    payload: { runs: 10, isVerified: true, password: 'leaked' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Unauthenticated Scoreboard Write',
    operation: 'update',
    path: '/liveScoreboards/STAREVENT_ROOM_A',
    auth: null,
    payload: { runs: 999 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Collection Scraping via List Query',
    operation: 'list',
    path: '/liveScoreboards',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Unverified Admin Email Spoof',
    operation: 'update',
    path: '/liveScoreboards/STAREVENT_ROOM_A',
    auth: { uid: 'spoof_uid', email: 'ccurshyy@gmail.com', email_verified: false },
    payload: { runs: 777 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Out-of-Bounds Value Poisoning',
    operation: 'update',
    path: '/liveScoreboards/STAREVENT_ROOM_A',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    payload: { wickets: 99, runs: -50, teams: Array.from({ length: 10 }, () => ({ id: 't' })) },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Path Variable ID Poisoning',
    operation: 'create',
    path: '/liveScoreboards/bad$$$id_with_special_chars_and_oversized_segment',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    payload: { ownerUid: 'user_a', runs: 0 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Client-Forged Timestamp Injection',
    operation: 'create',
    path: '/liveScoreboards/STAREVENT_ROOM_TIME',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    payload: { ownerUid: 'user_a', createdAt: '1999-01-01T00:00:00Z', updatedAt: '1999-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Terminal Archived State Mutation',
    operation: 'update',
    path: '/liveScoreboards/STAREVENT_ROOM_ARCHIVED',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    payload: { runs: 101, matchStatus: 'live' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Self-Assigned Admin Escalation',
    operation: 'create',
    path: '/admins/user_a',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    payload: { uid: 'user_a', role: 'admin' },
    expected: 'PERMISSION_DENIED',
  },
];
