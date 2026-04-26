# Session Sync + Payment Refactor — Change Log

Single reference for all the changes shipped in this work cycle. Pairs with `itemized-split-and-payment-flow.md` (flow diagrams).

---

## Scope

Three intertwined problem areas tackled in one pass:

1. **Payment flow** — modal-based checkout moved to a dedicated `/payment` page
2. **Itemized split** — cross-device awareness of item claims
3. **State sync** — closing the "local state diverges from server" gaps across the app

---

## File-by-file diff summary

### New files

| File | Purpose |
|---|---|
| `src/app/payment/page.tsx` | Dedicated payment route; handles query-param amount/tip, refresh-on-mount, server-share validation |
| `src/components/payment/PeachCheckoutView.tsx` | Full-page Peach widget host (extracted from modal body) |
| `docs/itemized-split-and-payment-flow.md` | Flow diagrams (ASCII) for sessions, splits, picker, payment |
| `docs/session-sync-and-payment-refactor.md` | This file |

### Deleted files

| File | Reason |
|---|---|
| `src/components/payment/PeachCheckoutModal.tsx` | Replaced by `PeachCheckoutView` + `/payment` route |

### Modified files (by area)

**Payment flow**
- `src/components/order/PostOrderView.tsx` — Pay Now → `router.push('/payment?…')`; server-first `userAmount`; modal state + `onPaymentResult` prop removed; `router.prefetch('/payment')` on mount
- `src/app/orders/page.tsx` — hydrates `paymentResult/amount/tip` from query via lazy `useState`; strips query after
- `src/app/my-tab/page.tsx` — Pay Now wired (was dead); server-first `payNowAmount`
- `src/app/test-payment/page.tsx` — uses `PeachCheckoutView` instead of deleted modal
- `src/hooks/usePeachCheckout.ts` — opt-in override that trusts Peach `result.code` regex when backend wrongly reports `success: false`
- `src/lib/config.ts` — `NEXT_PUBLIC_PEACH_TRUST_CLIENT` flag (dev-only)
- `.env.local` — flag enabled locally

**Itemized split / SplitSettings**
- `src/components/order/ItemizedPickerSheet.tsx` — reads `splitPaymentStatus` + `serverSplitConfig` from `SessionContext`; four row states (Available / Claimed by X / Paid by X / Your saved selection); save-time conflict refetch; rehydrates draft from server first
- `src/components/order/SplitSettingsModal.tsx` — mode-switch locked when `serverSplitConfig.type` exists; itemized remains interactive; async save with error surface; pending/disabled button states
- `src/contexts/SplitContext.tsx` — `syncSplitToServer` returns `Promise<void>` and rethrows on failure
- `src/types/api/split.ts` — `SplitItemDetail` gains `orderId`/`variantIndex`; `SplitConfig.remainingItems` properly typed

**State-sync (server-first reads)**
- `src/components/session/ParticipantsList.tsx` — mode label + per-participant amount read from server first
- `src/components/order/PaymentResultView.tsx` — participant shares + mode label server-first
- `src/components/order/PostOrderView.tsx` — `userAmount` server-first
- `src/app/my-tab/page.tsx` — `payNowAmount` server-first

**Error surfacing / rollback**
- `src/components/cart/TipSelector.tsx` — `syncError` state + inline message when tip POST fails
- `src/contexts/CartContext.tsx` — `syncQueueWithAPI` returns success boolean; `addItem`/`removeItem`/`updateQuantity`/`clearCart` snapshot the previous cart and roll back on POST failure; exposes `cartSyncError` + `clearCartSyncError`
- `src/components/layout/Header.tsx` — cart snackbar widened to accept `sync-error` variant, shows "Couldn't save — try again"

**Session lifecycle**
- `src/contexts/SessionContext.tsx` — `clearSession` now also clears `morsel_cart`, `morsel_kitchen_note`, `morsel_tip`, `morsel_menu_items_cache` so state doesn't leak across sessions

---

## Behavior changes

### Payment

- **Old**: Pay Now opened `PeachCheckoutModal`. Browser back closed the modal, no deep linking, layout constrained to 90 vh.
- **New**: Pay Now → `/payment` full-page. Back button works natively. `beforeunload` guard while `creating` / `loading-sdk` / `verifying` / `success`. Success → `router.replace('/orders?paymentResult=success&…')` and `PaymentResultView` hydrates from the query (then strips it). Failure stays on `/payment` with inline retry.

### Itemized split

- **Old**: Picker read "what others claimed" from local `itemizedSelections` (per-device only). Two phones could both claim the same item.
- **New**: Picker reads cross-device truth from `splitPaymentStatus`. Claimed items display the claimant's name; paid items show a green check. User's own saved items prefill as editable draft. Before saving, a pre-POST refetch caps user drafts against fresh availability and shows a soft conflict banner.

### Split mode lock

- **Old**: Anyone could change the mode at any time; last write wins silently.
- **New**: Once `serverSplitConfig.type` is set, mode-switching UI is hidden on other devices. Itemized stays interactive (others can claim remaining items). Non-itemized modes render read-only with a "Close" button.

### Server-first display

`ParticipantsList`, `PaymentResultView`, `PostOrderView.userAmount`, and `/my-tab` now prefer `splitPaymentStatus[me].amount` and `serverSplitConfig.type` over local `SplitContext` for display. This fixes the cross-device divergence where two phones at the same table showed different modes and amounts.

### Error surfacing + rollback

- **Split sync**: `SplitSettingsModal` awaits the POST and keeps itself open on failure with an inline error. Save button shows "Saving…" while pending.
- **Tip sync**: small orange inline message under the tip buttons on failure; clears on the next successful sync.
- **Cart sync**: optimistic add/remove is rolled back on POST failure. Header shows "Couldn't save — try again" in its snackbar slot.

### Session lifecycle

- **Old**: `clearSession` left behind `morsel_cart`, `morsel_kitchen_note`, `morsel_tip`, `morsel_menu_items_cache`. If a user logged out and into a different session (different table), stale state leaked.
- **New**: those keys are cleared too.

### Payment amount validation

- **New**: `/payment` refreshes session once on mount. If `splitPaymentStatus[me].amount` differs from the query amount (minus tip) by more than 1 cent, we show a "Split changed" screen with "Continue with {newAmount}" and "Back to order" buttons. Prevents charging a stale amount when another participant changed the split between Pay Now tap and widget render.

---

## UX risk review

Honest answer: **yes, there are a few places the new behavior is visibly different from the old one.** None of them regress correctness; a few change the *feel* of edge cases. Calling them out so there are no surprises.

### Risks I'd actually watch

1. **Cart rollback can feel janky on flaky networks.**
   - Before: `addItem` silently kept the local state even when the queue POST failed — user saw the right total, server was out of sync, no feedback.
   - Now: the item visibly reverts and a "Couldn't save — try again" toast appears.
   - Net correctness: better (no silent drift into an unchargeable cart). Perceived smoothness: slightly worse on bad networks. Acceptable trade.

2. **SplitSettingsModal stays open on save failure.**
   - Before: modal closed immediately regardless of sync outcome.
   - Now: modal stays open, shows error, user can retry.
   - Risk: if the backend is slow (>2 s), the "Saving…" state feels like a hang. `syncSplitToServer` has no timeout — should the user be able to cancel after, say, 10 s? Not done yet. Worth flagging if you see it in testing.

3. **`/payment` refresh-on-mount adds a small latency before the Peach widget mounts.**
   - We already prefetch the SDK; the extra `refreshSessionData()` runs in parallel. In practice <200 ms, but it's a new synchronous dependency. Users on poor networks will notice.
   - If you want to skip the validation for the initial payment (when no split exists yet), we can gate it on `splitPaymentStatus != null`. Right now it runs always.

4. **`clearSession` now wipes `morsel_menu_items_cache`.**
   - Positive: stops cross-restaurant menu leakage.
   - Negative: first menu page after log-in is a cache miss. Acceptable but worth knowing.

5. **Server-first display can flip mid-frame when polling returns.**
   - Before a poll, `ParticipantsList` may show local `split.mode`; after the poll, it reflects `serverSplitConfig.type`. If they disagree, the label visibly changes. This is intended — the local display is now only a best-effort fallback — but you could see a "Split evenly" → "Pay for items" flicker right after the initiator saves on the other device.

### Risks I consciously did NOT address (scope)

- **Real-time split updates** — still a 10 s poll. A Firebase listener would close the window; not in scope.
- **Kitchen note sync** — still per-device, baked into the order at `confirmOrder`. Needs a product decision (shared note vs. per-participant). Flagged in the audit.
- **`_placedAt` countdown on non-placer devices** — participants other than the placer see no timer. Needs backend to return `placedAt` in the session orders response.
- **Concurrent POST `/split` race at the backend** — client does a pre-POST refetch mitigation, but ultimate arbitration is backend's job. If backend accepts the second POST and overwrites the first, we surface whatever the next poll returns.
- **Backend verify endpoint** for Peach — returns `success: false` for valid Peach success codes like `000.100.110`. Client has a dev-only override (`NEXT_PUBLIC_PEACH_TRUST_CLIENT=1`). Production fix is backend-side.

### Places I checked that should NOT regress

- `Header`, `Footer` — untouched except for the snackbar variant widening
- `Cart page`, `Menu page` — no changes
- `Order lifecycle` — `confirmOrder`, order fetching, order merging — all untouched
- `Auth / session join flow` — only the `clearSession` list was extended
- `Split modes other than itemized` — the read-only lock is a non-breaking restriction (users already couldn't change modes server-side without side-effects)
- `Failing Peach path` — retry UI is unchanged; we just navigate on success

---

## Behavior verification checklist

If you're testing this end-to-end:

- [ ] Single-device: tap Pay Now on `/orders` → land on `/payment` → complete payment → back on `/orders` with success UI. Refresh `/orders` — success screen doesn't replay.
- [ ] Single-device: tap Pay Now on `/my-tab` → same flow.
- [ ] Two devices: A sets mode "Split evenly". B's SplitSettingsModal opens, shows "Your tablemate set the split" lock. B cannot switch modes.
- [ ] Two devices: A sets mode "Pay for items" + claims item X. B's picker shows item X as "Claimed by {A's name}" with qty hidden.
- [ ] Two devices: A claims item X. B claims item X simultaneously. B's Confirm button triggers pre-POST refetch, caps B's claim to 0, shows orange banner, bails.
- [ ] Network flake: cart `addItem` during offline → item appears then reverts, header snackbar shows "Couldn't save — try again".
- [ ] Network flake: SplitSettingsModal Save during offline → error shown, modal stays open, retry works once online.
- [ ] `/payment` with stale amount: A starts payment with R 584.38, B changes the split, A's `/payment` shows "Split changed" screen with new amount.
- [ ] Log out → log back into a different session: cart, kitchen note, tip are all reset.
- [ ] Failed Peach verification in dev with `NEXT_PUBLIC_PEACH_TRUST_CLIENT=1`: console warns, user lands on success flow.

---

## Follow-ups (deferred)

See the "Risks I consciously did NOT address" section above. The audit in the conversation that produced this refactor also covered:

- Firebase real-time subscriptions (replace 10s poll)
- Backend-side Peach result-code regex fix (removes need for client override)
- Shared kitchen note model (product decision)
- Retry/timeout UI for slow `syncSplitToServer`
- Bundle-size follow-up on the `/payment` route once the Peach SDK chunk is dominant
