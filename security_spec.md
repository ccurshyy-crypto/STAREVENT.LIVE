# Security Specification — Per-User Isolated Kabaddi Scoreboard

## 1. Data Invariants
1. Every registered user owns a strictly isolated namespace `/users/{userId}/...` bound to their Firebase Auth UID (`request.auth.uid == userId`).
2. User A can NEVER read `/users/{userB}/profile/main`, `/users/{userB}/undoHistory/stack`, or `/users/{userB}/scoreHistory/*`.
3. User A can NEVER create, update, or delete ANY document under `/users/{userB}/...`.
4. Unauthenticated vMix / OBS Browser Input at `/scoreboard/{userId}` can ONLY perform exact-key `get` on non-PII broadcast documents `/users/{userId}/scoreboard/current` and `/users/{userId}/settings/main`; `list` and all writes are strictly denied to unauthenticated clients.
5. Passwords are NEVER stored in any Firestore document (strict `keys().hasOnly(...)` allowlists on every entity).
6. Scores are bounded (`0..999`), players on mat are bounded (`0..7`), string fields and arrays (`teamAStarting7.size() <= 7`, `undoHistory.entries.size() <= 40`) have mandatory upper bounds.
7. `scoreHistory` is strictly append-only (`allow update: if false`).
8. Users cannot elevate their own role to `super_admin` or disable/enable other accounts.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Cross-Tenant Score Hijack**: User A updates `/users/USER_B/scoreboard/current` with `{ teamAScore: 99 }`.
2. **Cross-Tenant Settings Overwrite**: User A updates `/users/USER_B/settings/main` with `{ teamAName: "HACKED" }`.
3. **Cross-Tenant Profile Read (PII Leak)**: User A reads `/users/USER_B/profile/main`.
4. **Cross-Tenant Undo Tampering**: User A reads or writes `/users/USER_B/undoHistory/stack`.
5. **Unauthenticated Scoreboard Write**: Anonymous client writes `/users/USER_A/scoreboard/current`.
6. **Unauthenticated Collection Scraping**: Anonymous client calls `list` on `/users/USER_A/scoreboard` or `/users/USER_A/settings` or `/userAccounts`.
7. **Shadow Field Injection (Password Leak)**: User A writes `{ password: "secret" }` into `/users/USER_A/profile/main` or `/userAccounts/USER_A`.
8. **Role Escalation**: User A creates `/users/USER_A/profile/main` or `/userAccounts/USER_A` with `{ role: "super_admin" }`.
9. **Owner UID Spoofing**: User A writes `/users/USER_A/scoreboard/current` with `{ ownerUid: "USER_B" }`.
10. **Out-of-Bounds Resource Exhaustion**: User A writes `{ teamAScore: 999999 }` or `{ teamAPlayersOnMat: 50 }` or `undoHistory.entries` with 100 elements.
11. **Path Variable ID Poisoning**: Client writes to `/users/USER_A/scoreboard/../../evil` or an invalid 300-char docId.
12. **Audit Log Mutation**: User A calls `update` on `/users/USER_A/scoreHistory/evt1` to falsify score history.
