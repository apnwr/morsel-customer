# SDLC Action Plan

> Source: full-team SDLC review on 2026-05-20 (Architect, Frontend, Data, Code Quality, QA, Docs).
>
> **Order of attack:** Tasks 1 and 2 are the security P0s — they're the only items on this list where the failure mode is "another customer can read/write your session." Land them before the engineering swimlanes (Tasks 3–5). Both need backend coordination, so open the conversation now.

---

## Task 1 — Lock down Firebase RTDB rules

**Severity:** P0 — data integrity / unauthorized access.

**Goal:** Make the deployed RTDB ruleset match the paths the client actually reads, and scope access to participants of the same session — not to "any signed-in anonymous user."

**Why:** Two compounding problems found in the audit.

1. `firebase-database-rules.json` declares rules under `/sessions/$sessionId/...`, but the live client reads `/activeSessionsBySpace/{spaceId}/{sessionId}/sessionInfo/...` (`src/lib/firebase/realtime.service.ts:423,545,780`). The active path has **no matching rule in this file**. Either the deployed ruleset has been edited out of band (drift between repo and prod), or the listeners only work because the deployed rules are permissive in ways this file doesn't show.
2. The rules that DO exist (for `/sessions/$sessionId`) grant `.read` and `.write` to **any** `auth != null` client. Since the app uses Firebase Anonymous Auth, any visitor to the site qualifies. There is no `auth.uid` check tying a write to a specific participant. A hostile client knowing `sessionId` could overwrite another session's `orderQueue`, `splits`, `status`, or `expiresAt`.

This is exploitable today.

**Scope (client side):**

1. **Audit deployed vs. file** — pull the live ruleset (`firebase database:get / --pretty` against the project) and diff against `firebase-database-rules.json`. Document the actual current state in `docs/realtime-database.md`.
2. **Rewrite rules** to cover the real path:
   - `activeSessionsBySpace/$spaceId/$sessionId/sessionInfo` — read allowed only if the requester's `auth.uid` (or the `sessionUserId` claim once minted server-side, see Task 2) is present in `participants/`.
   - `orderQueue/$sessionUserId` — write allowed only when `auth.uid` matches the path segment.
   - Tighten `.validate` on `participants/`, `orderQueue/`, status transitions.
   - Add `.indexOn` for any field the backend queries on.
3. **Deploy via `firebase deploy --only database`** to a staging project first; verify the existing client still works against staging (the one live listener is `subscribeToOrderQueue` from `CartContext.tsx:477`).
4. **Add a CI check** that `firebase database:get` against staging diffs cleanly against `firebase-database-rules.json` — so this drift can't happen again silently.
5. **Remove the dead legacy listeners** from `src/lib/firebase/realtime.service.ts` once you've confirmed they're truly unused — they read paths that won't exist under the new rules and will start throwing if anyone re-wires them.

**Scope (backend side — separate ticket):**

- Make sure the backend's writer service uses an authenticated path (admin SDK, no rules) so tightening client rules doesn't break ingest.
- If the eventual plan is for the client to read with a real signed identity (Task 2), align the rule shape to that identity now so this isn't re-done.

**Acceptance:**

- Repo's `firebase-database-rules.json` matches deployed ruleset exactly.
- A test using `@firebase/rules-unit-testing` proves: (a) a participant can read their own session, (b) a participant of _another_ session cannot read this one, (c) a non-participant cannot write `orderQueue/$sessionUserId`.
- The one live listener (`CartContext → subscribeToOrderQueue`) still works against the new rules in staging.
- `docs/realtime-database.md` updated with accurate active-path tree + the new rule shape.

**Effort:** 3–5 days client + emulator tests; backend ticket runs in parallel.

**Files touched:** `firebase-database-rules.json`, `src/lib/firebase/realtime.service.ts` (delete dead listeners), `docs/realtime-database.md`, new emulator test under `src/lib/firebase/__tests__/`.

**Open questions for backend before starting:**

- What is the deployed ruleset right now? (Repo file is almost certainly not it.)
- Who/what writes `activeSessionsBySpace/.../orderQueue` — admin SDK or a cloud function? (Confirms admin path bypasses rules.)
- Do we plan to mint a per-participant signed token soon (Task 2)? If yes, scope rules to that identity now.

---

## Task 2 — Add authenticated identity to API calls

**Severity:** P0 — impersonation / account takeover.

**Goal:** Every request to the backend carries a signed identity that the server validates. Stop trusting `sessionUserId` in the body as proof of who's calling.

**Why:** `src/lib/api/client.ts:44-47` sets only `Content-Type: application/json` — no `Authorization` header, ever. `sessionUserId` (a plain UUID stashed in localStorage) is sent in request bodies and treated as identity. Anyone with `sessionId` + a participant's `sessionUserId` (both leak via URL and devtools) can:

- Place an order as that participant (`POST /queue/confirm`)
- Save a split as that participant (`POST /session/{id}/split`)
- Settle a payment against that participant's split (`POST /payments/peach-payments/embedded`)

`docs/session-flow.md:153-156` acknowledges this ("no JWTs, no signed tokens"). `docs/payment-flow.md:151,187` claims the opposite ("Auth: Bearer token (Firebase JWT)") — that doc is wrong and needs to be corrected as part of this ticket.

**Scope (client side):**

1. **Pick the auth mechanism with backend.** Three realistic options, in order of preference:
   - **Firebase ID token** — the SDK is already initialized; `firebaseAuth.currentUser.getIdToken()` gives a signed JWT. Backend verifies with Firebase Admin SDK. Minimal new infra.
   - **Server-issued session JWT** — backend mints one at `POST /ordering-session/start`, client stores it (short-lived; refreshed via `/ordering-session/session/{id}` polling). More work but plays nicer if you ever move off Firebase auth.
   - **HMAC of (sessionId, sessionUserId, timestamp)** with a per-session shared secret — only if a JWT path is infeasible.
2. **Wire the header into the API client** — `src/lib/api/client.ts`. Add a getter (`getAuthToken()`) the client calls before each request. Token source set once in the FirebaseAuthProvider init.
3. **Handle token refresh** — Firebase ID tokens expire after 1 hour. Refresh on 401 from any endpoint; retry the original request once.
4. **Remove `sessionUserId` from request bodies** where it's now redundant (the server can derive it from the token). Keep it for endpoints where it identifies a _target_ user (not the caller), e.g., tipping another participant.
5. **Fix `docs/payment-flow.md` and `docs/session-flow.md`** to reflect the new reality. Update `docs/realtime-database.md` rules section to reference the same identity.
6. **Lock down the `sessionUserId` in localStorage** — at minimum, key it by `sessionId` so cross-session reuse fails fast.

**Scope (backend side — separate ticket):**

- Verify `Authorization: Bearer <token>` on every endpoint listed in `src/lib/api/endpoints.ts`.
- Reject requests where the token's subject doesn't match the `sessionUserId` of any path/body parameter.
- Return `401` with a clear code so the client can trigger refresh.

**Acceptance:**

- Every outbound request from `src/lib/api/client.ts` carries `Authorization: Bearer <token>`.
- A test proves: removing or tampering the token gets a 401; mismatched subject (token says A, request body says B) gets a 403.
- Manual test: open two browsers as different participants in the same session; try to settle each other's split — backend rejects.
- All three docs (`payment-flow.md`, `session-flow.md`, `realtime-database.md`) reflect the new auth model.
- The "no JWTs" line in `session-flow.md:153-156` is deleted.

**Effort:** 1 week client + 1 week backend (parallelizable after the contract is agreed).

**Files touched:** `src/lib/api/client.ts`, `src/components/providers/FirebaseAuthProvider.tsx`, `src/contexts/SessionContext.tsx` (token retrieval/refresh trigger), all `src/services/*.service.ts` (drop redundant `sessionUserId` from bodies where appropriate), three docs.

**Open questions for backend before starting:**

- Firebase ID token vs. server-minted JWT — which fits the existing service?
- Is there appetite to require auth on `GET /ordering-session/space/{spaceId}` (the pre-login QR fetch)? If not, that endpoint stays anonymous and the rest get locked down.
- Do we need to support multi-device per participant (same user, two phones)? Affects whether one token = one device or one token = one participant.

---

## Task 3 — Safety net first

**Goal:** Get a baseline of automated tests + CI in place so Tasks 4–5 are safe to attempt.

**Why:** This is a payments app with zero tests, no CI, and recent merged work (MOR-245, Apr 26 refactor) that shipped untested. Every other change is currently a leap of faith. The split math, validation, and payment state machine are all pure logic — testing them is cheap and high-value.

**Scope:**

1. **Add Vitest + React Testing Library**
   - Add `vitest`, `@vitest/ui`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` to devDependencies.
   - Add `test` and `test:watch` scripts to `package.json`.
   - Create `vitest.config.ts` with `jsdom` environment.

2. **Unit tests for pure logic** (highest ROI):
   - `src/mocks/mockSplit.ts` — `calculateEvenSplit`, `validateSplit`, `createCustomSplit` (rounding correction, floating-point edges, single participant, zero total).
   - `src/lib/validation.ts` — `validateSplitAmounts`, `sanitizeSplitAmount` (negative, NaN, Infinity, $0.01 tolerance boundary).
   - `src/lib/menu-availability.ts` — overnight ranges, DST boundary, `days: "all"`, malformed input.
   - `src/lib/currencies.ts` — `formatPrice` across INR / USD / MUR / ZAR.
   - `src/lib/split-utils.ts`, `src/lib/order-merging.ts`.

3. **State-machine test for `usePeachCheckout`** — mock `paymentService.createEmbeddedCheckout` and `verifyPayment`; verify every transition (`idle → creating → ready → rendered → verifying → success | failed | cancelled | expired | error`). Cover the four critical paths: success, verify-throws, Peach-cancel, network-timeout.

4. **Playwright smoke for the money path**
   - Add `@playwright/test`.
   - Three specs only (not the full suite):
     - QR → session join → add to cart → place order.
     - Place order → split (even) → initiate payment (mock `POST /payments/peach-payments/embedded`).
     - Mock `verifyPayment` failure → verify retry CTA + error state.

5. **Minimal CI** — add `.github/workflows/test.yml`:
   - `pnpm install --frozen-lockfile` (also: pick one of `pnpm`/`yarn` and delete the other lockfile; CLAUDE.md says pnpm but `yarn.lock` + `.yarn/` exist).
   - `pnpm typecheck` (already scripted).
   - `pnpm lint` (already scripted; consider `--max-warnings 0` — currently 58 problems, so first land tests, then turn the screw).
   - `pnpm test` (Vitest).
   - Playwright smoke against `next start` of a production build.

**Acceptance:**

- `pnpm test` green with at least 60 unit tests covering the files above.
- Playwright smoke runs against a built app in CI.
- One real regression caught by the suite before this task closes (proves the tests aren't toothless).

**Effort:** 1–2 weeks (one engineer).

**Files touched:** `package.json`, `vitest.config.ts` (new), `playwright.config.ts` (new), `.github/workflows/test.yml` (new), `src/**/*.test.ts` (new files only — no production code changes in this swimlane).

**Out of scope:** Component tests for big React trees, accessibility scans, Lighthouse CI — defer to a follow-up.

---

## Task 4 — Payment reliability

**Goal:** Make the cart-confirm and payment flow idempotent and recoverable. Eliminate the "user got charged but app says verification failed" scenario.

**Why:** The audit found no `Idempotency-Key` on `POST /queue/confirm`, `POST /payments/peach-payments/embedded`, or `POST /payments/peach-payments/verify`. On flaky mobile data, a retry can duplicate orders or mint a new Peach checkout against an already-charged transaction. `usePeachCheckout.ts:133-137` surfaces "Verification failed" if `verifyPayment` throws — even when the bank has moved money — with no reconciliation path. Money loss / double-charge risk.

**Requires backend coordination.** Open the conversation with the backend team early.

**Scope:**

1. **Client-side idempotency keys**
   - Generate a UUID per logical operation (cart confirm, embedded-checkout create, verify) in `src/lib/api/client.ts` or per service.
   - Send as `Idempotency-Key` header.
   - Persist the key for the lifetime of the operation; reuse on retry within the same session-user.
   - Wait for backend to confirm endpoints respect the header.

2. **Idempotent retry on `verifyPayment` failure**
   - Currently `usePeachCheckout.ts:133-137` goes to `error` state and stops.
   - Change to: retry `verifyPayment` up to 3 times with backoff if the error is a network/5xx (not a verified `success: false`).
   - On terminal failure, transition to a new `unverified` state (distinct from `failed`).

3. **`unverified` UX** — `PeachCheckoutView` shows a non-dismissable banner: "Payment may have completed. Don't pay again. Transaction ID: `{transactionId}`. Contact support." Include a tap-to-copy CTA on the txn id. Block any further "Pay" attempts for this split until the user explicitly resets (which calls reconciliation).

4. **Reconciliation endpoint** — coordinate with backend on `GET /payments/peach-payments/status?transactionId=...` so the client can resolve the unverified state on next foreground / next session load.

5. **Replace `alert()` with snackbar** on order-placement errors (`useCartPageState.ts:116,147`). The existing snackbar variant (`sync-error` per `Header.tsx`) covers this — reuse it.

6. **Lock the `trustClientResultCode` flag** — `config.ts:18-20` already gates it to non-prod; add a build-time assertion that throws if the flag is true in a production build. Currently only soft-checked.

7. **Optional but recommended:** add a `paymentsEnabled` feature flag per branch so an outage doesn't crash all clients (per `docs/payments-reliability-plan.md`).

**Acceptance:**

- A network drop simulated mid-`verify` does NOT show "Verification failed" — it shows the unverified-status banner with the txn id.
- Three consecutive `POST /payments/peach-payments/embedded` calls from the same client with the same idempotency key produce one Peach checkout id (backend-validated).
- `alert()` no longer fires anywhere in the cart/order flow.
- A test in the Task 1 suite proves each behavior above.

**Effort:** 1–2 weeks client-side, plus backend work (separate ticket on their board).

**Files touched:** `src/lib/api/client.ts`, `src/hooks/usePeachCheckout.ts`, `src/components/payment/PeachCheckoutView.tsx`, `src/services/payment.service.ts`, `src/hooks/useCartPageState.ts`, `src/lib/config.ts`.

**Open backend questions** (resolve before starting):

- Is `POST /payments/peach-payments/embedded` already idempotent on retry, or does it mint a new checkoutId each call?
- Does a `GET /payments/peach-payments/status?transactionId=...` (or equivalent reconciliation) exist?
- `splitIdentifier` vs `splitId` — which field name does the backend accept on `POST .../embedded`? (Currently `usePeachCheckout.ts:182` passes `splitId` into a field documented as `splitIdentifier`.)

---

## Task 5 — Architecture cleanup

**Goal:** Reduce the structural debt that's making every feature take longer than it should.

**Why:** The Architect and Frontend agents independently flagged the same five things: provider hell (8 levels), dual order state (`OrderContext` vs `SessionContext.orders`), over-memoization fighting the React Compiler, god files (5 over 600 LOC), and tsconfig that's strict-in-name-only. None of these is shipping-broken today, but each one will add hours to the next 10 PRs.

**Scope:**

1. **Deprecate `OrderContext` entirely**
   - It duplicates `SessionContext.orders[]` and can diverge silently.
   - Move the timer logic into a `useOrderTimer(orderId)` hook reading from `SessionContext`.
   - Delete `src/contexts/OrderContext.tsx` and remove it from the provider stack in `src/app/layout.tsx:46-63`.

2. **Split `SessionContext`**
   - Today: one context with 18 fields in `useMemo` deps (`SessionContext.tsx:472`); any field change re-renders every consumer.
   - Split into:
     - `SessionMetaContext` — stable IDs (`sessionId`, `spaceId`, `businessId`), changes rarely.
     - `SessionDataContext` — `participants`, `orders`, `splits`, `paymentStatus`, polled.
   - Consumers that need only IDs subscribe to the meta context and stop re-rendering on data churn.

3. **Strip manual memoization fighting the compiler**
   - `babel-plugin-react-compiler` is on (`package.json:18`).
   - Audit with the official `react-compiler-healthcheck` tool.
   - Remove the custom `memo` comparators at `src/app/menu/page.tsx:70` and `:269` first — they actively undermine the compiler.
   - Then sweep `useMemo` / `useCallback` in `SessionContext`, `CartContext`, `SplitContext` — keep only those wrapping genuinely expensive computation (with a one-line comment justifying each).

4. **Decompose god files**
   - `src/contexts/CartContext.tsx` (1,051 LOC) → split into `cart-state`, `cart-queue-sync` hook, `cart-totals` memos.
   - `src/lib/firebase/realtime.service.ts` (881 LOC) → extract `createSubscription<T>(path, parse)` helper; the four `subscribeTo*` fns become 30 lines each.
   - `src/app/menu/page.tsx` (717 LOC) → extract `useMenuSearch`, `useMenuNavigation` hooks.

5. **Rename misleading files**
   - `src/mocks/mockSplit.ts` → `src/lib/split-math.ts` (it's production code, not a mock).
   - `src/mocks/mockStorage.ts` → `src/lib/storage.ts`.
   - Update all imports.

6. **Tighten `tsconfig.json`**
   - Add `noUncheckedIndexedAccess` (this will surface real Firebase-array bugs at `realtime.service.ts:570-578` and other sparse-array sites — fix them as they appear).
   - Add `exactOptionalPropertyTypes`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`.
   - Land in a separate PR per flag if needed.

7. **Type the API client**
   - `src/lib/api/client.ts:12,92,104,120` — replace `any` with `<TReq, TRes>` generics; `APIError.data: unknown` instead of `any`.

8. **Global error boundary**
   - Add an error boundary at the root layout (`src/app/layout.tsx`) with a fallback UI that surfaces a "Reload" CTA and reports the error.
   - Wrap each top-level provider with a smaller boundary so one context error doesn't crash the whole tree.

9. **Listener-leak fix** (carried over from audit)
   - Move `initializeFirebaseAuth()` out of every `subscribeTo*` body into a module-level promise; subscribe functions await it once. Fixes the race where the returned cleanup runs before `unsubscribeRef` is populated (`realtime.service.ts:416-511`).

**Acceptance:**

- `OrderContext` deleted; nothing references it.
- `pnpm typecheck` passes with the tightened tsconfig.
- Provider stack drops from 8 to 6 levels (or fewer).
- No file in `src/` over 500 LOC (except mock data fixtures).
- Re-renders on a single `participants` update touch SessionDataContext consumers only — verified with React DevTools profiler.

**Effort:** 2–3 weeks (one engineer, several PRs).

**Files touched:** Provider stack, all context files, `realtime.service.ts`, `menu/page.tsx`, `CartContext.tsx`, `tsconfig.json`, `lib/api/client.ts`, plus rename ripples.

---

## Riders (alongside whichever swimlane is active)

These are small enough to fold into PRs touching nearby code; don't make them their own swimlane:

- **Docs cleanup** — rewrite the 5 stale docs (`payment-flow.md`, `my-tab-page-architecture.md`, `cart-to-payment-flow.md`, `peach-credentials-issue.md`, `documentation/PROJECT_FLOW.md`); archive `post-order-view-redesign.md`; delete root `CHANGELOG.md` (frozen Feb 2026, superseded by `docs/CHANGELOG.md`); move proposals to `/docs/proposals/`. Half a day.
- **Console-log purge / production gate** — add `compiler.removeConsole` in `next.config.ts`, or introduce a `src/lib/logger.ts` that no-ops in production. 277 calls today.
- **Accessibility: focus traps + nested-role fix** — implement a `useFocusTrap` hook; apply to all bottom sheets. Remove nested `role="button"` in `MenuItem.tsx:219-231`. Add `aria-label` to lock icons in itemized picker. One day.

---

## What this plan is NOT

- A complete P0/P1 backlog — only the highest-priority items are tickets here. The remaining audit findings (provider hell granular fixes, listener-leak microbugs, console-log purge, etc.) live in the SDLC review notes, not as discrete tickets yet.
- A doc rewrite — that's a rider, not a swimlane.
- Comprehensive — Task 3 in particular has more candidate cleanups than listed; we're picking the highest-leverage ones.
