# Firestore Security Specification

## 1. Roles & Trust Boundaries
- **Super Admin**: Authenticated user with either:
  - Verified Google email `ccurshyy@gmail.com` (`request.auth.token.email == 'ccurshyy@gmail.com' && request.auth.token.email_verified == true`), OR
  - Existing document at `/admins/$(request.auth.uid)` with `role == 'super_admin'`.
- **Operator User**: Authenticated Firebase Auth Email/Password user provisioned by Super Admin (`role == 'user'`), strictly isolated to their own `/userAccounts/{uid}` (read-only `get`) and their own `/scoreboards/{roomId}` (`ownerUid == request.auth.uid`).
- **Unauthenticated Client**: Zero write access anywhere. Zero PII reads anywhere. Exact-key `get` allowed ONLY on `/loginLookup/{loginId}` (contains zero PII—only opaque synthetic auth alias and active status) to resolve versioned Login IDs on sign-in.

## 2. Core Invariants
1. **Zero Plaintext Passwords**: No `password`, `plainPassword`, `secret`, or `hash` fields are permitted in any Firestore document (`hasOnly` allowlist enforced on every collection).
2. **Super Admin Exclusivity**: Only Super Admin can create, list, update, disable, reset passwords for, or delete user accounts and `/loginLookup/{loginId}` reservations.
3. **Strict User Isolation**: Operator A can NEVER read, list, modify, or delete Operator B's `/userAccounts/{uidB}` or `/scoreboards/{roomB}`.
4. **Immutable Ownership & Identity**: Operator Users can NEVER change `ownerUid`, `ownerLoginId`, `roomId`, `createdAt`, or escalate `role` to `super_admin`.
5. **Default Deny**: Any unmatched path is denied (`allow read, write: if false`).

## 3. Red Team Attack Scenarios (Dirty Dozen)
- **Shadow Update**: Operator sends `update` with extra field `role: 'super_admin'` or `password: 'leak'` → **BLOCKED** by `keys().hasOnly(...)` and Super Admin gate on `/userAccounts`.
- **Email Spoofing**: Unverified account with `email == 'ccurshyy@gmail.com'` and `email_verified == false` tries to create user → **BLOCKED** by `request.auth.token.email_verified == true`.
- **PII Blanket / Scraping**: Unauthenticated user or Operator tries `list` on `/userAccounts` or `/loginLookup` or `/scoreboards` → **BLOCKED** (`allow list: if isSuperAdmin()`).
- **Cross-User Scoreboard Tampering**: Operator A updates `/scoreboards/{roomB}` where `ownerUid == uidB` → **BLOCKED** by `resource.data.ownerUid == request.auth.uid`.
- **Ownership Hijack**: Operator A updates their own `/scoreboards/{roomA}` changing `ownerUid` or `roomId` → **BLOCKED** by immutability checks.
- **Value Poisoning**: Scoreboard update with `teamAScore = -50`, `teamAScore = 99999`, or `stateJson.size() > 16000` → **BLOCKED** by type and range checks.
