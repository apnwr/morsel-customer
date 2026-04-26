# Client Improvement Plan — Performance & Robustness

Date: 2026-04-26

Plan for incremental improvements to the customer client. Grouped into shippable tranches; ordered by ROI. None of these require backend changes except where called out (Tranche 4).

Each item lists **what**, **why**, **expected impact**, **risk**, and any prerequisites.

---

## Context

Touched the codebase to ship the session-sync + payment refactor and the new POST /split response shape. While in there, surfaced a set of follow-on improvements that fall into four buckets:

1. **Network reduction** — polling, redundant fetches, cart sync amplification
2. **Render efficiency** — context fan-out, set-state-in-effect, redundant memos
3. **Robustness** — race conditions in tip sync and payment deep-links
4. **Long-term simplification** — file size, type clarity, eventual move to realtime DB

Hot files (line counts) for grounding:

```
953  src/contexts/CartContext.tsx
626  src/components/order/ItemizedPickerSheet.tsx
550  src/components/order/SplitSettingsModal.tsx
502  src/contexts/SessionContext.tsx
494  src/contexts/SplitContext.tsx
```

51 localStorage operations across context files. 13 lint suppressions for `react-hooks/exhaustive-deps` and `set-state-in-effect`.

---

## Tranche 1 — High-impact, near-zero risk (ship first, ~1 day)

### 1.1 Pause polling when the page is hidden

- **Where:** `SessionContext.tsx` — the 10s `setInterval` in `setupPolling`.
- **What:** Wrap the interval with the Page Visibility API. Skip the fetch when `document.hidden`. On `visibilitychange → visible`, fire an immediate poll then resume the interval.
- **Why:** A 30-min dining session ≈ 180 GETs per device. A large fraction runs while the phone is locked or the browser is backgrounded.
- **Impact:** Server load down 40–60% per session. Battery friendlier. Faster cold-tab response on focus.
- **Risk:** Near-zero. Worst case: one extra second of stale data when returning to the tab.

### 1.2 Debounce `syncQueueWithAPI` (cart sync)

- **Where:** `CartContext.tsx` — `addItem`, `removeItem`, `updateQuantity`, `clearCart` fire immediately.
- **What:** Coalesce calls within 250–400ms into a single POST. The API takes the **full filtered cart**, so the latest call subsumes earlier ones.
- **Why:** Today, tapping `+` 5 times rapid-fire fires 5 POSTs that overwrite each other. The mutation-counter rollback fix prevents data loss but doesn't cut traffic.
- **Impact:** Up to 80% fewer POSTs during rapid taps; lower jitter.
- **Risk:** Low. Must flush the pending POST on:
  - `clearCart()` (force send)
  - Page navigation away from `/menu` or `/cart` (`pagehide` listener)
  - Session end
- **Note:** Keep the mutation counter — the latest debounced call's snapshot is the one that matters.

### 1.3 Cache `bill` per session+orders fingerprint

- **Where:** `billService.getSessionBill` — called from `PostOrderView`, `MyTab`, `ItemizedPickerSheet`, `PaymentResultView`.
- **What:** Memoize by `(sessionId, ordersFingerprint, tipsFingerprint)` in an in-memory map (or a small `BillContext` / `useSessionBill()` hook). Use the session response's `updatedAt` as part of the key for free invalidation.
- **Why:** Four components fetch independently. Opening the picker after viewing PostOrderView fetches twice in 2 seconds.
- **Impact:** 50–70% fewer bill GETs. Picker open latency drops noticeably.
- **Risk:** Low if invalidation is keyed correctly.

### 1.4 Drop the per-row `imageLoading` state in `MenuItem`

- **Where:** `MenuItem.tsx`.
- **What:** Replace `useState` + manual `onLoad` skeleton with Next/Image's built-in `placeholder="empty"` + CSS fade, or `placeholder="blur"` if backend can supply blurDataURL.
- **Why:** A menu with 80 items has 80 `useState`s firing on every load. Removes per-row state churn.
- **Impact:** Fewer re-renders during menu scroll/load. Mid-tier Android improvement most visible.
- **Risk:** Tiny visual diff possible — A/B in dev.

### 1.5 Throttle `setInStorage(STORAGE_KEY, cart)` writes

- **Where:** `CartContext.tsx` — the `useEffect` that writes JSON.stringify(cart) on every change.
- **What:** rAF-coalesce or 200ms throttle. Add `pagehide` listener to flush before tab close.
- **Why:** Cumulative `JSON.stringify` of full cart on slow devices is wasteful.
- **Impact:** Smoother taps on low-end Android.
- **Risk:** Need flush-on-`pagehide` or risk losing the last edit on force-kill. Trivial.

### 1.6 Centralize localStorage keys in a registry (paired with 1.5)

- **Where:** Strings scattered across `SessionContext.clearSession`, `CartContext`, `TipSelector`, etc.
- **What:** Single `src/lib/storage-keys.ts` exporting typed constants. `clearSession` iterates the registry rather than listing keys inline.
- **Why:** Adding a feature today means remembering to add a clear in `clearSession` — easy to miss. The recently-added 4 keys (`morsel_cart`, `morsel_kitchen_note`, `morsel_tip`, `morsel_menu_items_cache`) are evidence.
- **Impact:** Correctness — no more leaked state across sessions/flows.
- **Risk:** Pure refactor. Very low.

**Tranche 1 net effect:** ~50% fewer GETs, fewer POSTs on rapid taps, smoother perceived perf, less leak risk — without behavior change.

---

## Tranche 2 — Correctness & robustness (~half day)

### 2.1 Refactor `SplitContext.tsx:113` off `set-state-in-effect`

- **What:** The hydration `setSplit(prev => …)` runs on every server data change. Refactor toward derived state with `useMemo`, or move the merge into a reducer that consumers subscribe to.
- **Why:** The lint rule is correct — this is a cascading-render pattern. With React Compiler enabled, the compiler optimizes derived data better than effect-driven state.
- **Impact:** Fewer cascading renders on every poll. Currently every 10s = a setSplit + ParticipantsList + PostOrderView re-render even when nothing changed.
- **Risk:** Medium-low. The current code has a guard to skip when shares match — refactor must preserve that. Add unit tests before/after.

### 2.2 Tip-sync mutation counter

- **Where:** `TipSelector.tsx` — debounced sync, but rapid taps can interleave PUT vs DELETE.
- **What:** Use the same mutation-id pattern as the cart fix. Track the latest tip intent; only commit response state if our id is still latest.
- **Why:** User taps 18% (PUT), 0% (DELETE), 15% (PUT) within 1 second. Out-of-order responses can leave server at 0% while UI shows 15%.
- **Impact:** Eliminates a silent data inconsistency on the bill.
- **Risk:** Very low — same pattern proven for cart.

### 2.3 `/payment` deep-link before splits hydrate

- **Where:** `app/payment/page.tsx`.
- **What:** Until `hasRefreshed && splitPaymentStatus !== null`, render a small loading state instead of going straight to checkout creation.
- **Why:** Today the fallback is `splitIdentifier=undefined`, which works in single-pay sessions but is fragile in multi-split.
- **Impact:** Safer multi-split payments via deep-link / browser nav.
- **Risk:** Tiny — adds a one-pass loading state that resolves in ≤1 polling cycle.

### 2.4 ItemizedPickerSheet — drop redundant pre-commit `getSessionById`

- **Where:** `ItemizedPickerSheet.tsx` — extra session GET before saving "for freshest claims."
- **What:** Either call the existing `refreshSessionData()` (already exposed by SessionContext, awaitable) so claims surface through context, or rely entirely on the server's 409 conflict response (proposal doc §1) and skip the pre-check.
- **Why:** Removes a round-trip per save and drops the "soft-fail and proceed" branch.
- **Impact:** Save latency drops 100–400ms.
- **Risk:** Low if backend 409 is reliable. Can keep refresh as fallback.

---

## Tranche 3 — Architectural cleanups (~2–3 days)

### 3.1 Split `CartContext` (953 lines) into focused modules

- **What:** Extract:
  - `cart-totals.ts` (pure functions — already partially exists)
  - `cart-sync.ts` (queue mapping + POST + retry logic)
  - `cart-context.tsx` (state + dispatch + the rollback counter)
- **Why:** Easier to reason about, easier to memoize, and makes the React Compiler's job easier (smaller render trees).
- **Impact:** Maintenance + dev velocity. Marginal runtime gain unless paired with narrower context consumers.
- **Risk:** Medium — pure refactor, needs careful test pass.

### 3.2 Narrow context consumers — split `SessionContext` value

- **Where:** `SessionContext.tsx`.
- **What:** Today every `useSession()` consumer re-renders when *anything* in the session changes. Split into:
  - `SessionMetadataContext` (id, businessId, spaceId, expiresAt) — changes rarely
  - `SessionParticipantsContext` (participants, isParticipantPaid)
  - `SessionSplitContext` (splitPaymentStatus, serverSplitConfig, serverSplitType)
- **Why:** Polling churns the entire context value every 10s; consumers only caring about, say, `participants` re-render anyway.
- **Impact:** Fewer wasted renders across `Header`, `ParticipantsList`, `PostOrderView`. Most useful on lower-end devices.
- **Risk:** Medium — touches every `useSession()` call site. One-time cost, permanent benefit.

### 3.3 Drop `serverSplitConfig` from client state once backend stops returning it

- **What:** When proposal §2 lands on backend, simplify `serverSplitType` to `splitPaymentStatus?.[0]?.type ?? null`. Remove `SplitConfig` type. Remove the field from `SessionDetail`.
- **Why:** Less surface area, less code, less type maintenance.
- **Impact:** Code simplification only.
- **Risk:** None when backend has shipped the cleanup. Today: do nothing — keep the fallback.
- **Prerequisite:** Backend ships proposal §2.

### 3.4 Type-ify the looser response shapes

- **Where:** `session.ts` has `payments?: any[]`. Newly-seen response includes typed `tips`, `discount`, `sessionCharges`.
- **What:** Add proper types for `SessionTip`, `SessionDiscount`, `SessionCharge`, `SessionPayment`.
- **Why:** When eventually consumed (e.g., to skip the bill GET), they're typed. Also kills two existing lint errors.
- **Impact:** Long-term hygiene; opens the door to dropping `billService` in favor of session-derived totals.
- **Risk:** None.

---

## Tranche 4 — Future-facing (bigger lift, defer until needed)

### 4.1 Switch session sync from 10s polling to Firebase Realtime DB

- **Why:** TODOs in `SessionContext` already say so. Realtime drops median freshness gap from ~5s → ~250ms; server load drops dramatically; cart-sync echo-detection in `processOrderQueueData` becomes simpler.
- **Impact:** UX feels meaningfully more responsive in multi-device scenarios. Lower per-session cost.
- **Risk:** Significant — needs careful migration with a feature flag, fallback to polling on disconnect, and Firebase pricing review.
- **Suggested gating:** Build the abstraction so `SessionContext` can swap between polling and realtime via env flag. Ship behind a flag, A/B.

### 4.2 Replace `billService.getSessionBill` with derivation from session response

- **What:** The session response carries `sessionCharges`, `splits[].tax`, `splits[].charges`, `splits[].tip`, plus order item totals. Most of the bill is derivable; the only gap is per-tax-id breakdown.
- **Why:** Bill fetching is a separate API call repeated from 4 surfaces. Eliminating it removes a class of latency and inconsistency bugs (bill cache vs session cache divergence).
- **Impact:** One fewer endpoint. Faster initial render of `PostOrderView`.
- **Risk:** Medium — needs backend schema additions OR careful client-side reconstruction with tests against the existing bill endpoint.
- **Prerequisite:** Either backend adds tax breakdown to session, or we accept current bill endpoint as authoritative for that one piece.

### 4.3 React Compiler audit pass

- **What:** Project has `babel-plugin-react-compiler` enabled. Audit hand-written `useMemo`/`useCallback`; remove the ones the compiler now subsumes.
- **Why:** Less cognitive overhead; cleaner code. Compiler is generally smarter than hand-rolled deps arrays.
- **Impact:** Code clarity > runtime perf. Some redundant memoization can be removed.
- **Risk:** Low if measured. Pull guidance from the official compiler eslint plugin output.

---

## Recommended PR sequencing

**PR 1 — Tranche 1 (low-risk perf wins):**
- 1.1 Page-visibility-aware polling
- 1.2 Debounce cart sync
- 1.3 Bill cache
- 1.4 Drop MenuItem imageLoading state
- 1.5 Throttle cart localStorage write
- 1.6 Storage-key registry

**PR 2 — Tranche 2 (correctness hardening):**
- 2.1 Refactor SplitContext hydration
- 2.2 Tip-sync mutation counter
- 2.3 `/payment` loading-until-hydrated
- 2.4 Drop pre-commit picker fetch

**PR 3 — Tranche 3 (architectural):**
- 3.1 Split CartContext
- 3.2 Split SessionContext
- 3.4 Type-ify loose response shapes

**Defer:**
- 3.3 (waiting on backend proposal §2)
- 4.x (bigger initiatives, gated on team capacity)

---

## Measurement plan (set up before Tranche 1)

Without numbers, perf claims drift. ~15 minutes of setup pays back forever.

- **Network counter:** instrument an API client middleware that increments per-endpoint counters (`/session/{id}` GETs, `/queue` POSTs, `/bill` GETs) and logs to console every 60s in dev.
- **Render counter:** wrap `Header`, `ParticipantsList`, `PostOrderView`, `MenuItem` in a small dev-only render counter (or use React DevTools Profiler, sample a 60s session).
- **`/payment` TTI:** `performance.mark()` from route entry to `PeachCheckoutView` rendered.

Capture before/after for each tranche.

---

## Out-of-scope for this plan

- Backend changes (covered separately in `backend-split-schema-proposal.md`).
- Designs / visual updates.
- Test coverage expansion (worthwhile but a separate workstream).
- iOS/Android native wrappers if/when added.
