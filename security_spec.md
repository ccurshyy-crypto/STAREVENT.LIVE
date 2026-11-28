# Security Specification — Star Event Live (Firestore)

## 1. Data Invariants

### A. Live Cricket Scoreboard Sync (`/liveScoreboards/{roomId}` & `/matches/{matchId}`)
1. **Strict Room Ownership**: Every `/liveScoreboards/{roomId}` document is bound to its verified Firebase Auth creator via an immutable `ownerUid == request.auth.uid` field. No other user can update or delete that room.
2. **Master Gate Relational Binding**: Every `/liveScoreboards/{roomId}/matches/{matchId}` subcollection document validates parent room ownership via `get()` / `getAfter()` on `/liveScoreboards/{roomId}` and enforces atomicity (`existsAfter()`) on creation.
3. **Zero PII in Broadcast Documents**: Strict `keys().hasOnly(...)` allowlists reject any shadow/PII fields.
4. **Public Exact-Key OBS/vMix Reads Only**: OBS Studio and vMix browser sources can perform exact-key `get` on `/liveScoreboards/{roomId}` or `/liveScoreboards/{roomId}/matches/{matchId}` using a valid ID, while `list` queries are strictly denied (`allow list: if false`).
5. **Verified Auth & Strict Server Timestamps**: All writes require `request.auth != null && request.auth.token.email_verified == true`. `createdAt` must equal `request.time` on create and remain immutable on update; `updatedAt` must equal `request.time` on every write.
6. **Bounded Scoring Values & Arrays**: `runs` (`0..9999`), `wickets` (`0..10`), `legalBalls` (`0..6000`), `extrasTotal` (`0..999`), `target` (`0..9999`), `revision` (`>= 1`), `teams` list (`size() <= 4`), and every string field have strict `.size()` upper bounds.
7. **Terminal State Locking**: Once `matchStatus` transitions to `'archived'`, regular scorers can no longer mutate the document.
8. **Admin Isolation**: `/admins/{adminUid}` denies all client writes (`allow create, update, delete: if false`) and checks `email_verified == true` for bootstrapped owner admin `crushyyphotography@gmail.com`.

### B. Tournament Unlock Codes (`/tournamentUnlockCodes/{codeId}`)
9. **Admin-Only Code Generation & Revocation**: Only verified admins (`isAdmin()`) can create or revoke documents in `/tournamentUnlockCodes/{codeId}`. Customers can never generate codes, alter duration, price (`amount == durationDays * 99`), expiry (`expiresAt`), `lockedCustomerId`, or `createdBy`.
10. **Unique Code = Document ID**: `id == unlockCode == codeId` with strict format `^[A-Z0-9\-]+$` (`6..40` chars), guaranteeing zero duplicate codes.
11. **Server-Side Expiry Enforcement**: Customer redemption requires `existing().status == 'ACTIVE' && request.time < existing().expiresAt`. Client clock tampering cannot redeem an expired code.
12. **Single-Redemption & Single-Tournament Atomicity**:
    - Redemption atomically transitions `ACTIVE -> REDEEMED`, sets `redeemedAt == request.time`, `redeemedBy`, `redeemedByUid == request.auth.uid`, and `updatedAt == request.time`.
    - Tournament binding atomically sets `tournamentId` + `tournamentName` ONCE (`existing().tournamentId == null && existing().redeemedByUid == request.auth.uid`).
    - Once redeemed and bound (or revoked/expired), no non-admin mutation is ever allowed.
13. **Zero Deletion / Complete Historical Audit**: `allow delete: if false` preserves every active, redeemed, expired, and revoked code permanently in Firestore.
14. **Query Isolation (`allow list`)**: Only the verified owner admin can list all codes; verified customers can ONLY list documents where `resource.data.redeemedByUid == request.auth.uid`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Cross-Tenant Score Hijack**: User B attempts to `update` `/liveScoreboards/ROOM_A` owned by User A (`runs: 500`).
2. **Owner UID Spoofing on Create**: User A attempts to `create` `/liveScoreboards/ROOM_X` with `ownerUid: "USER_B"`.
3. **Immutable Owner Transfer on Update**: User A attempts to change `ownerUid` on `/liveScoreboards/ROOM_A` to `"USER_B"`.
4. **Shadow / Ghost Field Injection**: User A writes `{ isVerified: true, password: "leak" }` alongside valid fields into `/liveScoreboards/ROOM_A` or `/tournamentUnlockCodes/TRN-3D-AAAA-BBBB`.
5. **Unauthenticated Write**: Unauthenticated client attempts to `create` or `update` `/liveScoreboards/ROOM_A` or `/tournamentUnlockCodes/TRN-3D-AAAA-BBBB`.
6. **Collection Scraping (`list`)**: Regular customer attempts unbounded `list` on `/liveScoreboards` or `/tournamentUnlockCodes` without `where('redeemedByUid', '==', uid)`.
7. **Unverified Admin Email Spoof**: Authenticated user with `email: "crushyyphotography@gmail.com"` and `email_verified: false` attempts to create or list `/tournamentUnlockCodes`.
8. **Customer Code Generation Escalation**: Non-admin customer attempts to `create` `/tournamentUnlockCodes/TRN-30D-HACK-9999`.
9. **Customer Price / Duration / Expiry Tampering**: Customer attempts to `update` `durationDays`, `amount`, or `expiresAt` during redemption.
10. **Expired Code Redemption**: Customer attempts to redeem an `ACTIVE` code whose `expiresAt <= request.time`.
11. **Double Redemption / Second Tournament Hijack**: Customer attempts to re-redeem a `REDEEMED` code, spoof `redeemedByUid`, or overwrite an already-set `tournamentId`.
12. **Historical Code Deletion / Self-Assigned Admin Escalation**: Any user (even admin) attempts `delete` on `/tournamentUnlockCodes/{codeId}`, or regular user attempts `create` on `/admins/{theirUid}`.
