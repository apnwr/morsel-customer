# Backend Split Schema — Proposal

Target: the `splits` and `splitConfig` objects returned by `GET /ordering-session/session/{id}` and `POST /ordering-session/session/{id}/split`.

Two problems to solve:

1. **Data-correctness bug** — `POST /split` currently replaces the whole splits record instead of upserting per-participant. In a 3-participant session, we lost 2 of 3 saves.
2. **Schema bloat** — the response mixes four different concerns (config / per-participant state / initial intent / derived view). Fields are redundant and some fields carry stale data.

---

## 1. The upsert bug (fix this first)

### Reproduction
- Session has 3 participants: Sandeep, Ayush, Piyush.
- Sandeep `POST /split` with itemized items → server stores one split for Sandeep.
- Ayush `POST /split` with itemized items → server should **add** Ayush's entry. Instead, the response shows `splits[]` containing **only** the later writer (Piyush).
- Piyush (who per the user narrative hadn't claimed) appears to have the only surviving split.

### Evidence from the pasted session response
```json
"splits": [
  {
    "sessionUserId": "51c84955-…",    // Piyush only
    "index": 0,
    "items": [ /* 2 items */ ]
  }
],
"splitConfig": {
  "sessionUserId": "51c84955-…",       // initiator claim is single
  "numberOfSplits": 3,                  // implies 3 slots were intended
  "amounts": [1504.17, 1504.17, 1504.17]// but only 1 was actually persisted
}
```

`numberOfSplits: 3` + 3 amounts + 1 split entry = the backend knows 3 were expected but only stored the last write.

### Required backend behaviour

For itemized splits:
- `POST /split` with a given `sessionUserId` must **upsert that participant's entry** in `splits[]`, keyed on `sessionUserId`.
- Other participants' existing entries must not be touched.
- The response's `splits[]` must contain **every participant that has committed a split so far**, not just the most recent writer.
- `splitConfig.itemIds` (if we keep it — see §2) must be the **union** of all claimed items across all splits, not just the latest POSTer's.

For equal/custom/participant splits:
- The first `POST /split` with `type ≠ itemized` creates one split entry per participant, populated from `amounts[]`.
- Subsequent POSTs of the same type may rebalance. Mode changes (equal→custom) should be guarded — we've already restricted this on the client via `serverModeLocked`, but backend should reject cross-mode writes with 409 when splits already exist, to prevent accidental destruction.

### Rejection semantics
- If someone tries to claim an item already in another split's `items[]`, reject with 409 (conflict).
- If `type` differs from the current `splitConfig.type`, reject with 409.

---

## 2. Schema cleanup

### What the current response contains

```jsonc
{
  "splitConfig": {
    "type": "itemized",
    "numberOfSplits": 3,              // ← stale; just a hint at creation time
    "amounts": [1504.17, 1504.17, 1504.17], // ← stale; doesn't match actual splits
    "itemIds": [ /* flat list of all claimed items */ ], // ← redundant with splits[].items
    "sessionUserId": "51c84955-…",    // ← ambiguous name; is this "initiator"?
    "itemizedSplit": true,            // ← redundant with type === 'itemized'
    "remainingItems": [ /* … */ ],    // ← derived from orders - splits[].items
    "splitTaxes": { "0": 172.5 },     // ← per-split data keyed by index; belongs inline on splits[i]
    "splitCharges": { "0": 181.67 },
    "splitTips": { "0": 0 }
  },
  "splits": [
    { "index": 0, "sessionUserId": "…", "amount": 1504.17, "tax": 172.5, … }
  ]
}
```

Four concerns tangled together:
- **Config** (how the bill is being split): `type`
- **Per-participant state**: `splits[]` entries
- **Initial intent at creation**: `numberOfSplits`, `amounts` (only useful at `POST` time, useless afterwards)
- **Derived view data**: `remainingItems`, `itemIds`, per-split `tax/charges/tip` duplicates

### What the client actually reads

From the frontend code:
- `serverSplitConfig.type` — used in `SplitSettingsModal`, `ParticipantsList`, `PaymentResultView` for the mode label.
- `serverSplitConfig.remainingItems` — not currently read but planned.
- `splits[].sessionUserId` — used everywhere for per-participant amounts + payment routing.
- `splits[].amount` — displayed as Pay Now amount.
- `splits[].items` — used by `ItemizedPickerSheet` to determine claimed-by-others.
- `splits[].paid`, `paidAt`, `paidBy` — used in `isParticipantPaid`, `PaymentResultView`.
- `splits[].index` — used as `splitIdentifier` for `POST /payments/peach-payments/embedded`.

### What the client deliberately ignores

- `splitConfig.numberOfSplits`, `amounts`, `itemIds`, `splitTaxes`, `splitCharges`, `splitTips`, `itemizedSplit` — none of these are read.

Removing them is a pure cleanup; no client changes required.

---

## 3. Proposed schema

```typescript
// Top-level on the session response
interface Session {
  // …existing fields…
  splitState?: SplitState;          // absent when no split has been created
}

interface SplitState {
  // Backend only knows three structural modes. 'participant' (pay for self) and
  // 'all' (pay for everyone) are CLIENT-SIDE UI PRESETS — the client expresses
  // them using type='custom' with appropriate amounts. See §3.5.
  type: 'equal' | 'custom' | 'itemized';
  initiatedBy: string;              // sessionUserId of whoever first POSTed /split
  initiatedAt: Timestamp;
  version: number;                  // bumped on every mutation; used for optimistic concurrency (§11)

  splits: Split[];                  // per-participant commitments
  remainingItems: OrderItem[];      // derived; items not in any split (itemized only)

  // Derived aggregates — purely for client convenience, computable from splits[]
  allPaid: boolean;
  totalPaid: number;
  remainingTotal: number;
}

interface Split {
  splitId: string;                  // stable, primary identity
  index: number;                    // stable integer, 0-based; used for payment routing
  sessionUserId: string | null;     // null = unassigned slot (rare; for pre-allocated equal splits where a participant hasn't joined yet)

  // Itemized mode only
  items: SplitItem[];

  // Financial breakdown — always present, always the truth
  subtotal: number;                 // for itemized: sum of item totals; else: from POST payload
  tax: number;
  charges: number;
  tip: number;
  amount: number;                   // total = subtotal + tax + charges + tip

  // Payment state
  paid: boolean;
  paidAt: Timestamp | null;
  paidBy: string | null;            // who tendered (can differ from sessionUserId for "pay for others")
  method: 'card' | 'cash' | 'upi' | null;
  transactionId: string | null;
}

interface SplitItem {
  itemId: string;
  orderId: string;
  variantIndex: number;
  quantity: number;
  unitPrice: number;
  itemTotal: number;
  name: string;
  variantName?: string | null;
  variantPrice?: number;
  addOns?: Array<{ name: string; price: number }>;
  addonsTotalPrice?: number;
}
```

### What we removed

- `splitConfig.numberOfSplits` → derivable from `splits.length`
- `splitConfig.amounts` → derivable from `splits[].amount`
- `splitConfig.itemIds` → derivable from `flatMap(splits, s => s.items)`
- `splitConfig.splitTaxes`, `splitCharges`, `splitTips` → moved inline to each `Split`
- `splitConfig.itemizedSplit` → just `type === 'itemized'`
- `splitConfig.sessionUserId` → renamed to `initiatedBy` for clarity

### What we kept

- `type`, `remainingItems`, per-participant `splits[]`, payment state.

### What we promoted to the top

`allPaid`, `totalPaid`, `remainingTotal` — the consumer always wants these; they were in the split response but not the session response.

---

## 3.5. Why `participant` and `all` collapse into `custom`

Currently the backend has four modes: `equal`, `custom`, `participant`, `itemized`. The `participant` and `all` modes are **UI affordances, not distinct data shapes**:

| UI preset | How it's expressed | Canonical data |
|---|---|---|
| "Pay for everyone" (`all`) | One participant's amount = billTotal; others = 0 | `type: 'custom'`, amounts distributed |
| "Pay for self" (`participant`) | Each participant's amount = their own items' total + pro-rata tax/charges | `type: 'custom'`, amounts distributed |

Both are just specific `amounts[]` vectors under `type: 'custom'`. Keeping them as distinct backend modes causes real bugs:

- **"Pay for self" mode doesn't compose.** If Alice picks "pay for self," the data model assumes one initiator — but what if Bob also wants to pay for himself? The mode is conceptually per-participant but the schema is per-session.
- **"Pay for everyone" has the same issue.** Two participants can't both claim "I'll pay," so the mode has no ordering semantics.

Recommendation: **drop `participant` and `all` from the backend**. The client maps UI presets to `custom` amounts, posts those, and renders the preset label back by matching the amounts shape. This also simplifies mode-lock logic: only three states to guard (equal / custom / itemized).

Migration: client already sends amounts for all modes today, so this is a server-side simplification with no client wire change beyond removing two enum cases.

---

## 4. Sample response — before vs. after

Scenario: Sandeep, Ayush, Piyush at Table 2. All three have claimed items.

### Before (today, with the upsert bug fixed)

```jsonc
{
  "splitConfig": {
    "type": "itemized",
    "numberOfSplits": 3,
    "amounts": [1200, 800, 1504.17],
    "itemIds": [ /* all 7 claimed items */ ],
    "itemizedSplit": true,
    "sessionUserId": "…sandeep…",
    "splitTaxes": { "0": 120, "1": 80, "2": 172.5 },
    "splitCharges": { "0": 130, "1": 90, "2": 181.67 },
    "splitTips": { "0": 0, "1": 0, "2": 0 },
    "remainingItems": []
  },
  "splits": [
    { "index": 0, "sessionUserId": "…sandeep…", "amount": 1200, "tax": 120, "charges": 130, "tip": 0, "items": [ … ], "paid": false, … },
    { "index": 1, "sessionUserId": "…ayush…",   "amount": 800,  "tax": 80,  "charges": 90,  "tip": 0, "items": [ … ], "paid": false, … },
    { "index": 2, "sessionUserId": "…piyush…",  "amount": 1504.17, "tax": 172.5, "charges": 181.67, "tip": 0, "items": [ … ], "paid": false, … }
  ]
}
```

Observations: redundant data in three places (config.amounts, splits[].amount, config.splitTaxes/etc.).

### After

```jsonc
{
  "splitState": {
    "type": "itemized",
    "initiatedBy": "…sandeep…",
    "initiatedAt": "2026-04-20T…",

    "splits": [
      { "splitId": "…", "index": 0, "sessionUserId": "…sandeep…", "subtotal": 950,  "tax": 120, "charges": 130, "tip": 0, "amount": 1200, "items": [ … ], "paid": false, "paidAt": null, "paidBy": null, "method": null, "transactionId": null },
      { "splitId": "…", "index": 1, "sessionUserId": "…ayush…",   "subtotal": 630,  "tax": 80,  "charges": 90,  "tip": 0, "amount": 800,  "items": [ … ], "paid": false, "paidAt": null, "paidBy": null, "method": null, "transactionId": null },
      { "splitId": "…", "index": 2, "sessionUserId": "…piyush…",  "subtotal": 1150, "tax": 172.5, "charges": 181.67, "tip": 0, "amount": 1504.17, "items": [ … ], "paid": false, "paidAt": null, "paidBy": null, "method": null, "transactionId": null }
    ],

    "remainingItems": [],
    "allPaid": false,
    "totalPaid": 0,
    "remainingTotal": 3504.17
  }
}
```

One truth per field, no redundancy.

---

## 5. Migration path (backward compatibility)

To minimise risk:

1. **Backend dual-writes both schemas for one release**: include the new `splitState` object at the top level, but keep the old `splits` and `splitConfig` structure intact.
2. **Client reads `splitState` if present, falls back to the legacy shape otherwise**. The client code that needs changing:
   - `SessionContext.tsx` — `setSplitPaymentStatus(session.splitState?.splits ?? session.splits)`, `setServerSplitConfig(session.splitState ?? session.splitConfig)`.
   - Types updated in `src/types/api/session.ts` and `src/types/api/split.ts`.
3. **Deploy client with dual-read**.
4. **Deploy backend with new schema as primary**, removing redundant fields from the response in a subsequent release.
5. **Remove legacy-shape fallback** in client when backend is stable.

This avoids any moment where client and backend disagree about shape.

---

## 6. Payment routing implications

Currently:
- Client sends `splitIdentifier: String(splits[me].index)` to `POST /payments/peach-payments/embedded`.
- Backend resolves `index` → `splitId` → charge.

Recommendation: **move to `splitId` as the canonical identifier**.
- Indexes are fragile (if backend ever reindexes, client's cached identifier becomes wrong).
- `splitId` is a UUID — stable, unambiguous.
- Accept both `splitIdentifier` (legacy) and `splitId` for one release, then deprecate.

---

## 7. Summary of asks to backend team

### Must-fix (data correctness)
1. Upsert semantics on `POST /split` — preserve other participants' splits when one participant updates theirs.
2. Reject cross-mode writes with 409 when splits already exist.
3. Reject item claims that overlap with other participants' committed splits with 409.
4. New `DELETE /ordering-session/session/{id}/split` endpoint — see §8.
5. **Idempotency-Key header** on all mutating endpoints (`POST /split`, `DELETE /split`, `POST /payments/...`) — see §11.
6. **Authz check**: POST body's `sessionUserId` must match authenticated caller — see §13.
7. **Block payment when `remainingItems.length > 0`** (itemized) — 409 with `UNCLAIMED_ITEMS` code — see §8.5.
8. **Rounding contract**: backend guarantees `subtotal + tax + charges + tip === amount` — see §12.

### Should-fix (schema cleanup)
9. Remove `splitConfig.numberOfSplits`, `amounts`, `itemIds`, `splitTaxes`, `splitCharges`, `splitTips`, `itemizedSplit`.
10. Rename `splitConfig.sessionUserId` → `initiatedBy`.
11. Promote `allPaid`, `totalPaid`, `remainingTotal`, `canPay` to the top of `splitState`.
12. Return `splitState` as a single top-level object containing splits + config + derived aggregates.
13. **Collapse `type: 'participant' | 'all'` into `'custom'`** — see §3.5.
14. Remove `sessionTips` from response; `splits[i].tip` is canonical — see §12.
15. Add `splitState.version` integer for optimistic concurrency — see §11.

### Nice-to-have (future-proofing)
16. Accept `splitId` on the payment-create endpoint alongside `splitIdentifier`.
17. Include `paidBy` and `transactionId` on every split once payment settles.
18. ETag / 304 support on `GET /session` — see §14.
19. Rate limiting on mutating endpoints — see §13.

---

## 8. Mode change & reset

### Policy

> **Once any participant has committed a split, the split mode is immutable for all participants — including the initiator.** Mode changes require an explicit Reset action.

No one is privileged. The "first POSTer" is not a manager. Treating them as one creates weird UX asymmetries and invites rug-pull scenarios.

### Allowed per-participant edits (no mode change)

Any participant can re-POST `/split` to modify **their own** claim, subject to:
- Their split is not `paid: true`.
- The new items don't overlap with other participants' committed `splits[i].items`.
- The submitted `type` matches the current `splitState.type` (no silent mode conversion).

Backend rejects with 409 on any of these violations. Upsert keyed by `sessionUserId`.

### Mode change via Reset

To switch mode (e.g. itemized → equal), the split must be reset first:

**New endpoint:** `DELETE /ordering-session/session/{id}/split`

Semantics:
- Clears `splitState` entirely — removes all `splits[]` and `splitState.type`.
- Requires `splitState.allPaid === false` (can't reset after anyone has paid). Reject with 409 otherwise.
- Requires the caller to be a session participant (`sessionUserId` present in `participants`).
- Returns the session with `splitState: null`.
- Any participant can call it — no "initiator only" restriction. The destructive confirmation lives on the client.

After a successful DELETE, the next `POST /split` creates a fresh `splitState` with whatever mode the new caller picks.

### Why not alternatives

- **P1 (current — no reset at all):** If the mode is wrong, participants are stuck. They can only end the session and start over, losing orders + tips.
- **P2 (only initiator can change mode before others commit):** "First POSTer wins" is arbitrary. If Sandeep saved first but only wanted to buy a coffee and left, his mode choice still binds everyone. Fragile.
- **P3 (anyone can change mode silently):** Silent mode changes destroy other participants' work without their knowledge. The explicit Reset endpoint achieves the same flexibility with transparency.

### Client UX implications

- `SplitSettingsModal` in the locked state currently shows: *"Your tablemate set the split to X. You can claim any remaining items."*
- Add a secondary **"Reset split"** link below that message.
- Tapping it opens a confirmation sheet: *"This will clear everyone's claims so the bill can be split a different way. Any paid splits prevent reset."*
- Backend enforcement is the ultimate guard — client confirmation is just UX politeness.

### Interactions with payment

- Reset is forbidden when any split is paid. If one participant has paid and others want to change mode, that's impossible — the paid amount is frozen, the remaining bill must still split by the existing rule.
- This matches restaurant reality: once you've given the server your card, you don't get to renegotiate the bill.

### Summary

| Action | Who can do it | Gate |
|---|---|---|
| Edit own items (itemized) | The owner of that split | Not yet paid + no overlap with others' claims |
| Edit own amount (custom) | The owner of that split | Not yet paid |
| Switch mode | No one directly — must Reset first | `allPaid === false` |
| Reset split (DELETE) | Any session participant | `allPaid === false`, with explicit client confirmation |

---

## 8.5. Incomplete coverage (itemized) — orphan items

In itemized mode, participants claim a subset of items each. It is possible — and in practice common — for the set union of all claims to be a strict subset of the ordered items. The leftover appears in `splitState.remainingItems`.

The question: **what happens when a participant tries to pay while `remainingItems.length > 0`?**

Three options, in increasing complexity:

1. **Block payment until all items claimed.** Backend rejects `POST /payments/peach-payments/embedded` with 409 when `remainingItems.length > 0`. Client shows a banner: "X items still unclaimed — someone needs to claim them before payment." Simple, safe, but blocks early payers.
2. **Pro-rata distribute remainingItems cost across existing splits at payment time.** Backend recomputes each split's `amount` on first payment to include a share of `remainingItems`. Complex, changes amounts under the user, but unblocks.
3. **Last-payer takes the remainder.** As participants pay, their amount is the original; when only one unpaid split remains, its amount is recomputed to include `remainingItems`. Simple and matches social norms ("whoever pays last picks up the rest") but surprises the last payer.

**Recommendation: option 1** for v1. Safest and most transparent. UI affordance: a prominent "Claim the rest" button on the Pay Now bar that opens the itemized picker when any items are unclaimed. A later iteration can add option 3 as a setting.

Backend contract:
- `POST /payments/...` returns 409 with body `{ code: 'UNCLAIMED_ITEMS', remainingItemsCount: N }` when the session has itemized splits with unclaimed items.
- `splitState.canPay: boolean` — derived field that's `true` iff the session is payable right now. Saves the client from computing.

---

## 9. Open questions for backend team

1. Should `Reset split` be logged/audited? Who did what, when.
2. Mid-session order mutation (staff adds/refunds via dashboard) while a split is committed — is the mutation blocked, or does it invalidate the split, or does `remainingItems` absorb the delta? See §10.

---

## 10. Participant + order lifecycle

Rules for what happens when session membership or order contents change after a split is committed.

### Participant joins after split exists

| Mode | Behaviour |
|---|---|
| `equal` | New participant is **not auto-added** to `splits[]`. Existing shares are frozen. The new participant sees `splitState` as read-only with no slot for themselves. They can hit "Reset split" if all existing splits are unpaid. |
| `custom` | Same — frozen. |
| `itemized` | New participant can immediately claim any remaining items via `POST /split`. No rebalancing needed. |

### Participant leaves after claiming / committing

| Scenario | Behaviour |
|---|---|
| Left, never committed a split | No change to `splitState`. |
| Left, committed but unpaid, `equal`/`custom` | Their split stays with `sessionUserId` set to the departed user. Backend does not auto-delete. Requires Reset to reallocate. |
| Left, committed but unpaid, `itemized` | Their items **go back to `remainingItems`** so the remaining participants can re-claim. Backend sets the departed user's split to deleted. |
| Left, already paid | Split stays as `paid: true, paidBy: <user>` forever. Leaving is effectively checkout. |

### Order mutation mid-split

Staff-side changes to orders after a split exists are currently an undocumented path.

| Mutation | Recommended backend behaviour |
|---|---|
| Item **added** to an order | Added to `remainingItems` (itemized) or added to `totalAmount` with a rebalance warning (`equal`/`custom`). In equal mode, amounts auto-recompute. In custom, bumps it into an "unbalanced" state — backend sets `splitState.unbalanced: true` and UI prompts the user to reconcile. |
| Item **removed/refunded** and it was in a split | Backend removes from the split's `items[]`, recomputes that split's `amount`. If `paid: true`, do NOT modify — refund is handled separately. |
| Quantity changed | Same reconciliation as add/remove by delta. |

This is backend logic, not client. The client's job is to honor whatever `splitState` says on next poll.

### Session expiry / end

When `session.status` flips to `ended`, `splitState` freezes. No further `POST`/`DELETE`. Client shows read-only summary.

---

## 11. Idempotency & concurrency

### Idempotency keys

Every mutating request (`POST /split`, `DELETE /split`, `POST /payments/...`) MUST accept an `Idempotency-Key` header. If a request with the same key arrives twice, the backend returns the original response (cached for 24h) rather than re-executing.

Frontend behaviour: generate a fresh UUIDv4 per user action, attach on first attempt, reuse on retry.

Without this, network retries after a timeout cause:
- Duplicate splits
- Double-charges on payment
- Double-resets (harmless but noisy)

### Optimistic concurrency

`splitState.version` increments on every mutation. Clients send `If-Match: <version>` on all mutations:

- `POST /split` with `If-Match: 5` → server checks current version is 5, processes → returns version 6.
- If server's current is ≥ 6, return 412 Precondition Failed. Client refetches and prompts the user: "The split was updated by someone else. Review and try again."

This closes the "concurrent writers" window without server-side locks. Pairs well with the 10s polling cadence — most conflicts are detected on save, not discovered later.

### Pay + Reset race

Backend serialises via a session-level lock OR uses the version guard above:

- Pay call includes `If-Match: <version>` taken at Pay Now time.
- If someone Reset between render and Pay, version bumped, Pay returns 412.
- Client shows "Split was changed — refresh and try again" screen.

This resolves §9 question (4).

---

## 12. Data contracts

Invariants the backend must uphold and the client may rely on without recomputation.

### Rounding

For every split:
```
amount === subtotal + tax + charges + tip   (exact, to 2 decimal places)
```
Backend is responsible for consistent rounding. Client MUST NOT recompute from components; floating-point addition in JS drifts and produces off-by-one-cent bugs.

Corollary: `Σ splits[i].amount + (any remainingItems allocation) === sessionTotal`.

### Charge allocation

Session-level charges (`sessionCharges`: service fee, packaging) are distributed across splits. Rule:

- **`equal` / `custom` mode:** each charge split evenly across `splits.length`. Rounding residue goes to the first split (index 0).
- **`itemized` mode:** pro-rata by each split's `subtotal` / `sum(subtotals)`. Rounding residue to index 0.

This must be documented so client can explain the breakdown.

### Tip as single source of truth

Remove `sessionTips` from the response. `splits[i].tip` is the only canonical tip field. The backend internally maintains the mapping; response exposes only splits.

Rationale: two sources of truth for the same amount invite bugs. `sessionTips` is only useful for pre-split tip draft, which the client handles locally.

### Tax allocation

Same rules as charges. Document in the response spec.

---

## 13. Authorization

### Who can do what

| Action | Required identity |
|---|---|
| `GET /session` | Any session participant (JWT `sessionUserId` must be in `session.participants[]`) |
| `POST /split` with `sessionUserId: X` | Authenticated user's `sessionUserId` must equal X |
| `DELETE /split` | Any session participant |
| `POST /payments/...` with `sessionUserId: X, splitId: Y` | Authenticated user must be `sessionUserId: X` OR must be paying on behalf of (record as `paidBy: <caller>`) — depends on product call |

**Critical:** a participant must not be able to POST a split with another participant's `sessionUserId`. The server validates this from the auth context, not the request body.

### Rate limiting

- `POST /split`: 10 req/min per session participant
- `DELETE /split`: 3 req/min per session
- `POST /payments/...`: 5 req/min per session participant

Not urgent, but flag for backend hardening.

---

## 14. Performance

### Current baseline

- Client polls `GET /session` every 10 s.
- Response is the full session object: orders, items, participants, splits, tips, charges. For a 6-person table with 15 items this is ~8 KB.

Acceptable, but worth improving once the correctness work lands.

### Recommended follow-ups (not blocking)

1. **ETag / 304 Not Modified.** Backend computes ETag from `splitState.version + session.updatedAt`. Client sends `If-None-Match: <etag>`. Backend returns 304 with empty body if unchanged. ~90% of polls in an idle session hit this path.
2. **Firebase Realtime Database listener** on `splitState` only. Client subscribes to `sessions/{id}/splitState` and applies patches; poll becomes fallback. Sub-second updates; kills the 10 s stale window.
3. **Partial response** — `GET /session?fields=splitState,participants` for targeted polling. Low priority if ETag is in place.

### Payload discipline

Once the schema cleanup in §2 lands, response size drops ~30% (removal of redundant `numberOfSplits` / `amounts` / `itemIds` / `splitTaxes` / `splitCharges` / `splitTips`). Directly improves poll cost.

---
