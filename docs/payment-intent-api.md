# Payment-Intent API — Alternate Architecture (Proposed)

Analysis of the YAML spec shared by the API team on 2026-04-18. It describes a **different payment architecture** from what the client currently uses.

**TL;DR**
- Two of four concepts (Secrets) are already in the project.
- The remaining four (PaymentIntent → SimplePurchase / EmbeddedCheckout → ConfirmPayment) are a decoupled alternative to our current single-step checkout — **not wired up** in this codebase.
- **Adopting this spec does NOT fix the current *"Peach credentials not found in Secret Manager"* error.** That error is a data-provisioning issue (see `peach-credentials-issue.md`) and exists regardless of which payment architecture is used.
- The YAML is schema-complete but path-incomplete — real paths must come from the backend team before we can implement.

---

## 1. What the new spec defines

| Artifact | Purpose |
|---|---|
| `SecretPayload` / `SecretResponse` | Already documented in `api-docs.yaml`. Nothing new. |
| `PaymentIntentRequest/Response` | **New.** Create a transaction envelope from `orderIds` + `totals`, get back a `transactionId`. |
| `SimplePurchaseRequest` | **New.** Charge a card directly against a `transactionId`. Card details sent inline (PCI-risky). |
| `EmbeddedCheckoutRequest/Response` | **New.** Hosted-widget checkout bound to a `transactionId`. |
| `ConfirmPaymentRequest` + `TransactionModel` | **New.** Settle an already-initiated gateway transaction by `gatewayTransactionId`. |

The source YAML defined these as `components.schemas` only — no `paths:`. See `docs/payment-intent-api.yaml` for our best-guess path mapping (paths marked as **inferred**).

---

## 2. Architecture comparison

### Current (monolithic)
```
Client ──▶ POST /payments/peach-payments/embedded
              body: { sessionId, sessionUserId, splitIdentifier? }
       ◀──── { checkout: {checkoutId, checkoutUrl, entityId}, transactionId }

       (Peach widget renders, user pays)

Client ──▶ POST /payments/peach-payments/verify
              body: { checkoutId, transactionId?, splitId?, sessionUserId? }
       ◀──── { success, status, verification, transactionId }
```
**Two round trips. Backend decides everything from `sessionId`.**

### Proposed (decoupled)
```
Client ──▶ POST /payment-intents            (inferred path)
              body: { orderIds, sessionId, totals, currency, payerId, splits }
       ◀──── { id: transactionId, totals, ... }

       Client picks ONE of:
         A) POST /simple-purchase   { transactionId, card{...}, clientId? }
         B) POST /embedded-checkout { transactionId, returnUrl, clientId? }
            (user completes widget)
            POST /confirm-payment   { gatewayTransactionId, clientId? }
```
**Three round trips for the widget flow. Client computes totals + selects payment method explicitly.**

### Trade-offs

| Dimension | Current (1-step) | Proposed (2-step) |
|---|---|---|
| Round trips | 2 (create + verify) | 3 (intent + checkout + confirm) |
| Latency for Pay Now | Faster | Slower |
| Client complexity | Low — backend computes totals | Higher — client must send `totals` correctly |
| Flexibility | Card via widget only | Card-direct, widget, or external gateway |
| Retry/partial-pay | Tied to checkoutId | `transactionId` outlives any single checkout attempt |
| Fits split-bill flow | Yes (`splitIdentifier` on request) | Unclear — spec mentions `splits[]` inside intent but no per-split settlement |
| PCI scope | No card data touches client | `/simple-purchase` sends raw PAN → PCI DSS scope expands if used |

---

## 3. Does adopting this spec fix the credentials issue?

**No.**

The error *"Peach credentials not found in Secret Manager"* fires when the backend cannot find `PEACH_PAYMENTS_KEYS` for the business that owns the session. In both architectures, the backend must eventually:

1. Look up the business from `sessionId` (current) or `orderIds/sessionId` (proposed).
2. Fetch Peach credentials from Secret Manager for that business.
3. Call Peach APIs.

Step 2 is where our flow bails — and moving to the new architecture doesn't eliminate step 2.

The only potential escape hatch in the new spec is the `clientId` field on `SimplePurchase`, `EmbeddedCheckout`, and `ConfirmPayment`:

> `clientId: Optional client identifier to fetch per-client keys from KeyStore`

This suggests a separate "KeyStore" keyed by a client identifier (possibly a Peach partner/integrator account, or a platform-level sandbox account). If such a KeyStore exists and a patron-accessible `clientId` is provisioned, it could bypass the per-business lookup. **But:**

- We have no documentation for KeyStore.
- We don't know who provisions `clientId` or how clients obtain it.
- Our current `/payments/peach-payments/verify` already accepts `clientId` for a similar purpose — it's never been used.
- This would need a backend conversation before it's actionable.

**Conclusion:** the real fix is still `POST /business/secrets` for business `vQX9lFoJTwpYBhF5v4aZ`. See `peach-credentials-issue.md` §8.

---

## 4. Is the new API live on the backend today?

Unknown from the client side. We can only observe:

- Paths are **not in our `api-docs.yaml`** (which is the canonical spec for the backend we consume).
- `src/lib/api/endpoints.ts` has no entries for them.
- The source YAML is path-incomplete — it may be an early design artifact, not a shipping API.

**Action:** before any implementation, ping the backend team to confirm (a) whether these endpoints exist on the server, (b) the real paths, and (c) whether the current `/payments/peach-payments/*` endpoints are being deprecated.

---

## 5. What's in this repo vs the new spec

| Spec item | In project? | Location |
|---|---|---|
| `POST /business/secrets` | ✅ | `api-docs.yaml:2720`, `api-docs.md` |
| `GET /business/secrets/{name}` | ✅ | `api-docs.yaml:2769`, `api-docs.md` |
| `POST /payment-intents` | ❌ | — |
| `POST /simple-purchase` | ❌ | — |
| `POST /embedded-checkout` (standalone) | ❌ | — |
| `POST /confirm-payment` | ❌ | — |
| `POST /payments/peach-payments/embedded` (current) | ✅ | `endpoints.ts:45`, `api-docs.yaml:2607` |
| `POST /payments/peach-payments/verify` (current) | ✅ | `endpoints.ts:46`, `api-docs.yaml:2658` |

The two documented flows do not overlap by path — they're parallel designs.

---

## 6. Plan

### Immediate (keep shipping today)
1. **Do not migrate.** Current client code is correct and aligned with the live `/payments/peach-payments/*` endpoints.
2. **Unblock Pay Now** by seeding `PEACH_PAYMENTS_KEYS` for business `vQX9lFoJTwpYBhF5v4aZ` via `POST /business/secrets`. See `peach-credentials-issue.md` §8.
3. **Keep this spec** (`docs/payment-intent-api.yaml` + `payment-intent-api.md`) as a reference artifact only.

### Short term (within this sprint, if backend confirms the new endpoints ship)
1. Get confirmed paths from backend — replace the inferred placeholders in `docs/payment-intent-api.yaml`.
2. Ask backend whether `clientId` + KeyStore can act as a fallback when per-business secrets are missing. If yes, this becomes an alternative unblocker path.
3. Document `clientId` provisioning (who mints it, where it's stored client-side).

### Medium term (only if we commit to migrating)
1. Introduce a new `paymentService.createPaymentIntent()` + `settleByWidget()` + `confirm()` trio alongside the current service — do not delete the old one until cutover is complete.
2. Split the `usePeachCheckout` state machine: `creating-intent → widget-ready → widget-complete → confirming → success`.
3. Decide whether to use `/simple-purchase` at all. Recommendation: **skip it** — the PCI scope expansion is not worth it for a customer-facing Next.js app.
4. Plan a feature-flag cutover per environment (dev → staging → prod) so we can revert if Peach integration behaves differently under the new flow.
5. Deprecate `/payments/peach-payments/*` usage from the client last, after verifying feature parity (split payments, participant-scoped checkouts, session-level receipts).

### Decision criteria (do-not / do-migrate)
Migrate **only if** the backend team confirms one of the following:
- The existing `/payments/peach-payments/*` endpoints are being retired.
- The new architecture exposes functionality we need (e.g., pre-authorization holds, partial captures, per-order settlement) that the current endpoint cannot provide.
- The `clientId`/KeyStore mechanism cleanly solves a cross-tenant concern we currently hack around.

Absent those, the current architecture wins on round-trip count, client simplicity, and PCI scope. Stick with it.

---

## 7. Open questions for the backend team

1. Are `/payment-intents`, `/simple-purchase`, `/embedded-checkout`, `/confirm-payment` live, planned, or speculative?
2. What is the `KeyStore` (mentioned in `clientId` descriptions) and how is it provisioned?
3. If we pass `clientId` on the *existing* `/payments/peach-payments/verify`, what does it do today?
4. Does the new intent architecture support session-level splits (itemized / equal / per-participant) natively, or would we need to call `/payment-intents` per participant?
5. What happens to an orphan `transactionId` if the client creates the intent and never settles it? TTL? Manual cleanup?

---

## 8. Related docs

- `docs/peach-credentials-issue.md` — explains the current blocker (credentials missing for business).
- `docs/payment-flow.md` — architecture of the **current** Peach integration.
- `docs/api-docs.yaml` / `docs/api-docs.md` — canonical spec for what's actually wired up today.
- `docs/payment-intent-api.yaml` — machine-readable form of this alternate spec.
