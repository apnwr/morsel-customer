# Itemized Split & Payment — End-to-End Flow

How a session becomes a bill, a bill becomes splits, and splits become payments — across two or more participants on separate devices.

Scope: the refactor covered by the `/payment` page, the itemized picker cross-device awareness, and the SplitSettingsModal mode lock.

---

## 1. Participant lifecycle (one session, two phones)

```
   Device A (Ayush)               Backend (Firebase Functions)            Device B (tablemate)
   ──────────────                 ──────────────────────────             ────────────────────
        │                                    │                                    │
        │── scan QR ──────────────▶ /session/start                                │
        │                                    │                                    │
        │◀── sessionId ───────────────────────                                    │
        │                                    │                                    │
        │── add items → place order ▶ /orders                                     │
        │                                    │                                    │
        │                                    │◀─── scan QR ──────────────────────│
        │                                    │                                    │
        │                                    │─── sessionId ────────────────────▶│
        │                                    │                                    │
        │                    poll every 10s  │  poll every 10s                    │
        │◀── session update ──────────────────────── session update ─────────────▶│
        │    participants:[A, B]                     participants:[A, B]          │
        │    orders:[A's order]                      orders:[A's order]           │
```

`SessionContext` on each device polls `/session/{sessionId}` every 10 s and writes the result to local state. All cross-device awareness downstream flows from this poll.

---

## 2. Split modes — decision tree

```
                       user opens SplitSettingsModal
                                    │
                    ┌───────────────┴───────────────┐
         serverSplitConfig == null           serverSplitConfig.type set
         (no one set a mode yet)                      │
                    │                   ┌─────────────┼─────────────┐
                    │                  'itemized'                 other
                    │                   │                           │
             FREE CHOICE          PICKER AVAILABLE              READ-ONLY
             (all 5 modes          (claim remaining              (assigned
              selectable)           items only)                   share only)
                    │                   │                           │
                    ▼                   ▼                           ▼
              Save → POST        Pick → POST /split          Close button
              /split             (your own splitId)          (no Save)
```

Option 4C, implemented in `SplitSettingsModal.tsx`:

- `serverModeLocked = !!serverSplitConfig?.type`
- Mode-switching buttons hidden when locked
- When `serverIsItemized`, a "Pick items to pay for" button still opens `ItemizedPickerSheet`
- Primary button label flips from "Save" → "Close" when locked **and** not itemized

---

## 3. Itemized picker — source of truth

```
                 ItemizedPickerSheet
                         │
       ┌─────────────────┼──────────────────┐
       │                 │                  │
  allItems         splitPaymentStatus   local itemizedSelections
  (from session    (from SessionCtx,    (localStorage, per-device)
   orders[])        polled every 10s)
                         │                  │
                         ▼                  ▼
               serverClaimsByKey      draft selections
               ─────────────────      ────────────────
               cross-device truth     current-user uncommitted

                         │
                         ▼
                 row state per item:
                 ┌─────────────────┐
                 │ Available        │  ← not in any split → full qty pickable
                 │ Claimed by X     │  ← in others' splits, paid:false → dim+badge, qty hidden
                 │ Paid by X        │  ← in others' splits, paid:true  → dim+green check badge
                 │ Your saved       │  ← in own server split           → editable, "saved" badge
                 └─────────────────┘
```

Per-item state is derived in `ItemizedPickerSheet.tsx`:

- `othersQty(key)` — sum of qty across `splitPaymentStatus[*].items` where `sessionUserId !== me`
- `firstOtherClaim(key)` — for attribution badge ("Claimed by Ayush Test2Multi")
- `isPaidByOthers(key)` — any `paid === true` among others
- `mineServerQty(key)` — user's own committed qty (drives "Your saved selection" badge)
- `getAvailableQty(item) = max(0, item.quantity − othersQty(key))`

Participant names come from `sessionDetail.participants[].guestName`, **not** from local `SplitContext.participants` (which may be stale per-device).

---

## 4. Save-time conflict check

Race condition: user B drafts items X + Y while user A, simultaneously, commits item X.

```
   Device B                                         Backend
   ────────                                         ───────
   draft = [X, Y]                                      │
                                                       │◀── A commits X
   user taps "Confirm Selection"                       │
                  │                                    │
                  ├── refetch /session ───────────────▶│
                  │                                    │
                  │◀── splits[] now includes A's X ────│
                  │
                  ├── compute othersQty fresh
                  │
                  │   X → othersQty 1, availQty 0
                  │   Y → othersQty 0, availQty 1
                  │
                  │   draft[X] (1) > avail (0)  →  CONFLICT
                  │
                  │   adjusted = {Y: 1}          (X dropped)
                  │
                  ├── setSelections(adjusted)
                  ├── setConflictNotice("Someone else claimed...")
                  │
                  └── do NOT fire onConfirm — user must re-confirm
```

Implemented in `handleConfirm`:

1. Pre-check: `await sessionService.getSessionById(sessionId)`
2. Rebuild `freshOthersByKey` from the just-fetched `splits[]`
3. Cap each drafted qty against `item.quantity − freshOthersByKey[key]`
4. If anything was capped → orange banner, re-render, bail out
5. Otherwise → propagate shares to parent via `onConfirm(newShares)`

The backend is still the arbiter on the subsequent POST; this is a UX guard, not a correctness guarantee.

---

## 5. Post-order display amount (server-first fallback)

```
  PostOrderView userAmount derivation
  ───────────────────────────────────
       │
       ▼
  splitPaymentStatus[me]?  ── yes ──▶ use serverEntry.amount  ◀── authoritative
       │
       no
       │
       ▼
  local split.shares[me]?  ── yes ──▶ use local share
       │
       no
       │
       ▼
  participants > 1?        ── yes ──▶ even-split fallback
       │
       no
       │
       ▼
  return billTotal (solo bill)
```

Keeps displayed amount consistent with what `/payment` charges, because `/payment` independently derives the same `splitIdentifier` → server split amount.

---

## 6. Payment flow (post-refactor)

```
  Pay Now (on /orders or /my-tab)
        │
        │  router.push('/payment?amount=X&tip=Y')
        ▼
  /payment  ───────  PeachCheckoutView
        │
        │  1. createEmbeddedCheckout ─► Peach API
        │  2. Peach SDK mounts widget in container
        │  3. user fills card, submits
        │  4. onCompleted → paymentService.verifyPayment
        │
        ├─ verifyPayment success
        │        │
        │        ▼
        │   router.replace('/orders?paymentResult=success&amount=X&tip=Y')
        │        │
        │        ▼
        │   PaymentResultView  ── "Back to Menu" / "Receipt"
        │
        └─ verifyPayment failure
                 │
                 ├─ Peach result.code indicates success + TRUST_CLIENT flag set?
                 │       │
                 │       yes ──▶ treat as success, navigate  (DEV ONLY)
                 │       no  ──▶ show "Payment Failed" with Try Again / Cancel
                 │
                 └─ stays on /payment; beforeunload blocks refresh while verifying
```

- `POST /payments/peach-payments/embedded` creates checkout (returns checkoutId, transactionId, entityId)
- `POST /payments/peach-payments/verify` returns `{success, status, verification, transactionId}`
- **Known backend bug**: returns `success: false` for test-mode Peach codes like `000.100.110`. Client-side escape hatch (`NEXT_PUBLIC_PEACH_TRUST_CLIENT=1`) trusts the regex `^(000\.000\.|000\.100\.1|000\.[36]|000\.400\.[1][12]0)` until backend is fixed.

---

## 7. State ownership — where each piece lives

```
  ┌─────────────────────────────────────────────────────────────┐
  │ SessionContext                                              │
  │   sessionData (polled /session)                             │
  │   splitPaymentStatus = sessionData.splits  ◀── CROSS-DEVICE │
  │   serverSplitConfig   = sessionData.splitConfig             │
  └─────────────────────────────────────────────────────────────┘
                    │                    │
                    ▼                    ▼
  ┌──────────────────────┐   ┌──────────────────────────────────┐
  │ ItemizedPickerSheet  │   │ SplitSettingsModal               │
  │   serverClaimsByKey  │   │   serverModeLocked               │
  │   myServerSplit      │   │   serverIsItemized               │
  │   selections (draft) │   │   mode buttons hidden when locked│
  └──────────────────────┘   └──────────────────────────────────┘
                    │
                    ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ SplitContext (LOCAL, per-device)                            │
  │   split.participants, split.shares, split.mode              │
  │   itemizedSelections   ◀── NOW DRAFT-ONLY, not authoritative│
  │   syncSplitToServer()  ◀── POST /split                      │
  └─────────────────────────────────────────────────────────────┘
                    │
                    ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ /payment  (PeachCheckoutView)                               │
  │   splitIdentifier = splitPaymentStatus[me].index (SERVER)   │
  │   amount          = query param (display)                   │
  │   real charge     = backend derives from splitId server-side│
  └─────────────────────────────────────────────────────────────┘
```

Key inversion: before this work, "what others have claimed" was read from local `itemizedSelections`. Now it's read from `splitPaymentStatus` (server). `itemizedSelections` is demoted to a per-device draft cache.

---

## 8. Files touched by this refactor

| File | What changed |
|---|---|
| `src/components/payment/PeachCheckoutView.tsx` | new full-page checkout (replaces modal) |
| `src/app/payment/page.tsx` | new route hosting the view |
| `src/components/order/PostOrderView.tsx` | Pay Now → router.push('/payment'); server-first userAmount |
| `src/app/orders/page.tsx` | hydrates paymentResult from query; strips query after |
| `src/app/my-tab/page.tsx` | wires Pay Now button (was dead) |
| `src/components/order/ItemizedPickerSheet.tsx` | server claims + conflict check + row states |
| `src/components/order/SplitSettingsModal.tsx` | mode lock when server split active |
| `src/hooks/usePeachCheckout.ts` | trustClientResultCode override (dev) |
| `src/lib/config.ts` | `NEXT_PUBLIC_PEACH_TRUST_CLIENT` flag |
| `src/types/api/split.ts` | SplitItemDetail gains orderId/variantIndex; remainingItems typed |
| `src/components/payment/PeachCheckoutModal.tsx` | deleted |

---

## 9. Known limits / follow-ups

- Real-time split updates: still polled every 10 s. Swap to Firebase Realtime listener if latency complaints surface.
- Backend `/payments/peach-payments/verify` needs the Peach result-code regex — frontend override is a stopgap.
- `/split` is the only split mutation endpoint; no DELETE or PATCH. Re-save relies on upsert-by-sessionUserId semantics (Q1=A assumption) — confirm by running the curl twice.
- `splitConfig.type !== 'itemized'` renders read-only; users cannot switch modes back to `free choice` without manual reset. If that becomes a product need, add a "Reset split" action that clears server config.
