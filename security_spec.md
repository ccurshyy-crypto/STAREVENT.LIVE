# Security Specification — Star Event Live High-Speed Cricket Scoreboard Sync (Firestore)

## 1. Data Invariants
1. **Strict Room Ownership**: Every `/liveScoreboards/{roomId}` document is bound to its verified Firebase Auth creator via an immutable `ownerUid == request.auth.uid` field. No other user can update or delete that room.
2. **Master Gate Relational Binding**: Every `/liveScoreboards/{roomId}/matches/{matchId}` subcollection document validates parent room ownership via `get()` / `getAfter()` on `/liveScoreboards/{roomId}` and enforces atomicity (`existsAfter()`) on creation.
3. **Zero PII in Broadcast Documents**: Neither `/liveScoreboards/{roomId}` nor `/liveScoreboards/{roomId}/matches/{matchId}` stores emails, passwords, phone numbers, or account credentials — strict `keys().hasOnly(...)` allowlists reject any shadow/PII fields.
4. **Public Exact-Key OBS/vMix Reads Only**: OBS Studio and vMix browser sources can perform exact-key `get` on `/liveScoreboards/{roomId}` or `/liveScoreboards/{roomId}/matches/{matchId}` using a valid ID (`^[a-zA-Z0-9_\-]+$`, `<= 64/128` chars), while `list` queries are strictly denied (`allow list: if false`) to prevent scraping.
5. **Verified Auth & Strict Server Timestamps**: All writes require `request.auth != null && request.auth.token.email_verified == true`. `createdAt` must equal `request.time` on create and remain immutable on update; `updatedAt` must equal `request.time` on every write.
6. **Bounded Scoring Values & Arrays**: `runs` (`0..9999`), `wickets` (`0..10`), `legalBalls` (`0..6000`), `extrasTotal` (`0..999`), `target` (`0..9999`), `revision` (`>= 1`), `teams` list (`size() <= 4`), and every string field have strict `.size()` upper bounds.
7. **Terminal State Locking**: Once `matchStatus` transitions to `'archived'`, regular scorers can no longer mutate the document (`existing().matchStatus != 'archived' || isAdmin()`).
8. **Admin Isolation**: `/admins/{adminUid}` denies all client writes (`allow create, update, delete: if false`) and checks `email_verified == true` for bootstrapped owner admin `ccurshyy@gmail.com`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Cross-Tenant Score Hijack**: User B attempts to `update` `/liveScoreboards/ROOM_A` owned by User A (`runs: 500`).
2. **Owner UID Spoofing on Create**: User A attempts to `create` `/liveScoreboards/ROOM_X` with `ownerUid: "USER_B"`.
3. **Immutable Owner Transfer on Update**: User A attempts to change `ownerUid` on `/liveScoreboards/ROOM_A` to `"USER_B"`.
4. **Shadow / Ghost Field Injection**: User A writes `{ isVerified: true, password: "leak" }` alongside valid fields into `/liveScoreboards/ROOM_A`.
5. **Unauthenticated Write**: Unauthenticated OBS/visitor client attempts to `create` or `update` `/liveScoreboards/ROOM_A`.
6. **Collection Scraping (`list`)**: Unauthenticated or authenticated user attempts `list` on `/liveScoreboards` or `/liveScoreboards/ROOM_A/matches`.
7. **Unverified Email Spoof**: Authenticated user with `email: "ccurshyy@gmail.com"` and `email_verified: false` attempts to write `/liveScoreboards/ROOM_A`.
8. **Out-of-Bounds Value Poisoning**: User A updates `/liveScoreboards/ROOM_A` with `{ wickets: 99, runs: -50 }` or `teams` array with 10 entries.
9. **Path Variable ID Poisoning**: User A attempts to write to `/liveScoreboards/invalid$$$id` or a 200-character ID.
10. **Client-Forged Timestamp Injection**: User A creates `/liveScoreboards/ROOM_A` with a spoofed `createdAt` or `updatedAt` not equal to `request.time`.
11. **Terminal Archived State Mutation**: Non-admin owner attempts to update `/liveScoreboards/ROOM_A` after `matchStatus == 'archived'`.
12. **Self-Assigned Admin Escalation**: Regular user attempts to `create` `/admins/{theirUid}` with `{ uid: theirUid, role: "admin" }`.
