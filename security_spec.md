# Security Specification — ShopLedger Firestore Rules

## 1. Data Invariants
1. **Strict Ownership Isolation**: Every receipt at `/users/{userId}/receipts/{receiptId}` and private shop setting at `/users/{userId}/private/{docId}` belongs exclusively to `userId` (`request.auth.uid == userId` and `data.ownerId == request.auth.uid`).
2. **Verified Identity**: All writes require a signed-in user with `request.auth.token.email_verified == true`.
3. **Immutable Ownership & Creation Time**: `ownerId` and `createdAt` cannot be modified after creation.
4. **Server Timestamp Enforcement**: `createdAt` (on create) and `updatedAt` (on create/update) must equal `request.time`.
5. **Volumetric & Schema Guardrails**: All string and list fields enforce strict maximum lengths and key allowlists (`hasAll` + `hasOnly`) to prevent shadow fields and Denial-of-Wallet payloads.

## 2. The "Dirty Dozen" Payloads (Rejected by Rules)
1. Unauthenticated read or write to `/users/u1/receipts/R-0101`.
2. Authenticated user `u2` attempting `get` or `list` on `/users/u1/receipts`.
3. Authenticated user `u1` with `email_verified: false` attempting `create` on `/users/u1/receipts/R-0101`.
4. Spoofed `ownerId`: User `u1` creating `/users/u1/receipts/R-0101` with `ownerId: "u2"`.
5. Shadow field injection: Adding `isAdmin: true` to a receipt document.
6. Oversized string attack: `vendor` exceeding 200 characters.
7. Invalid enum value: `status: "auto_approved"` (not in `['confirmed', 'needs_review', 'possible_duplicate']`).
8. Invalid category enum: `category: "Crypto"` (not in the 6 allowed categories).
9. Forged client timestamp: `createdAt` or `updatedAt` not matching `request.time`.
10. Mutating immutable `ownerId` or `createdAt` during an `update` on `/users/u1/receipts/R-0101`.
11. Non-owner reading PII at `/users/u1/private/settings`.
12. Poisoned path ID: `receiptId` containing spaces, slashes, or >128 characters.
