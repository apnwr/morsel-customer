# Payments Reliability Plan

Systemic resolution strategy for the *"Peach credentials not found in Secret Manager"* class of errors. Frames the issue as a **tenant-provisioning gap**, not a payment bug, and prescribes a layered fix.

**Audience:** engineering leads, backend, frontend, ops.
**Status:** proposal — drafted 2026-04-18, no code changes yet.
**Prerequisite reading:** `docs/peach-credentials-issue.md` (the specific incident), `docs/payment-flow.md` (current architecture).

---

## 1. Framing

> A business can turn on ordering before it's been configured to accept payment.

That inconsistency is the real defect. A patron scans a QR, places orders, and only at Pay Now do we discover the business was never fully provisioned. Fixing this at the payment layer is symptom-treatment; fixing it at the onboarding layer prevents the entire class of errors.

**Two states are currently independent but must be coupled:**

| State | Governs |
|---|---|
| `business.canTakeOrders` | Ordering UI, QR, menu, cart, split |
| `business.canAcceptPayments` (needs `PEACH_PAYMENTS_KEYS`) | Pay Now, checkout widget, receipt |

Today: a business can be in `canTakeOrders=true`, `canAcceptPayments=false`. That's the bug.
Goal: `canTakeOrders ⇒ canAcceptPayments` by construction.

---

## 2. Target Flow

### Broken (today)
```
Patron scans QR
  └─ opens menu + orders freely
       └─ Pay Now
            └─ POST /payments/peach-payments/embedded
                 └─ 4xx "Peach credentials not found in Secret Manager"
                      └─ UI: "Something Went Wrong" (cryptic)
```

### Correct (target)
```
Business admin signs up
  └─ onboarding wizard (REQUIRED STEPS)
       ├─ Create branches/spaces
       ├─ Configure menu + taxes
       └─ Connect Peach Payments  ◄── blocks "Go Live" until POST /business/secrets succeeds
             └─ business.canAcceptPayments = true
                  └─ QR codes become active
                       └─ Patron flows work end-to-end

                  (if credentials are ever wiped)
                       └─ alert fires
                       └─ QR shows maintenance page
                       └─ existing sessions show "Pay at counter" fallback
```

---

## 3. Five-Layer Strategy

Each layer is independently useful; together they eliminate the bug class.

### Layer 1 — Prevent (backend + product)

Make half-provisioned state impossible.

| Standard | Implementation | Priority |
|---|---|---|
| Required-before-go-live checklist | `business.onboardingComplete` flips only when all prerequisites present (spaces, menu, **secrets**). QR scan hits a friendly "Coming soon" page otherwise. | **P0** |
| Atomic onboarding wizard | Business dashboard blocks "Go Live" button until `POST /business/secrets` with `PEACH_PAYMENTS_KEYS` returns 201. | **P0** |
| Server-side idempotency guard | `/business/activate` endpoint re-verifies secrets exist server-side — never trusts the client flag alone. | **P0** |
| Environment-scoped defaults | Dev/staging auto-seed a shared sandbox `PEACH_PAYMENTS_KEYS` for new businesses. Prod stays strict. | P1 |

**Outcome:** any business that can take orders can always take payment.

### Layer 2 — Detect (backend + ops)

Find the broken state before a patron does.

| Standard | Implementation | Priority |
|---|---|---|
| Per-business health probe | Nightly job iterates active businesses, confirms `PEACH_PAYMENTS_KEYS` exists and decrypts. Alert on misses. | **P0** |
| Session-load observability | Log (don't block) `payments.configured: false` when a session is created for a business missing secrets. Surface count on an ops dashboard. | P1 |
| Synthetic checkout probe | Sandbox `/embedded` call once per day per env against a canary session. Paging oncall on regression. | P2 |
| Error-rate alert on `/embedded` | Alert when >1% of `/embedded` calls return `credentials not found` over a rolling window. | **P0** |

**Outcome:** engineering sees this before customers do.

### Layer 3 — Surface (frontend + product)

When credentials truly aren't there — communicate clearly, offer alternatives.

| Standard | Implementation | Priority |
|---|---|---|
| Structured error codes | Backend returns `{ code: "PAYMENTS_NOT_CONFIGURED", message, retriable: false }`. Frontend maps codes → copy, not raw strings. | **P0** |
| User-friendly copy | "Payments aren't set up for this restaurant yet. Please pay at the counter." — not the raw backend string. | **P0** |
| Graceful fallback CTAs | *Pay at counter* / *Notify staff* buttons when payments are unavailable. Order is placed; settlement moves offline. | P1 |
| Preflight session flag | Session response carries `paymentsEnabled: boolean`. Client hides Pay Now entirely when `false`; shows inline notice. | **P0** |
| Retry-on-landing | If creds get seeded while the patron sits on the fallback screen, a silent refresh re-enables Pay Now. | P2 |

**Outcome:** even in a broken state, the user has a coherent path and the UI never shows a technical error.

### Layer 4 — Recover (ops + backend)

When something breaks, recovery is scripted and fast.

| Standard | Implementation | Priority |
|---|---|---|
| Runbook | Single markdown: "If `/embedded` returns `credentials not found`, run X." | **P0** ✅ partially in `peach-credentials-issue.md` |
| Self-service reseed UI | Business admin dashboard screen that runs `POST /business/secrets` end-to-end — no curl. | P1 |
| Audit log | Every call to `POST /business/secrets` logs `{ businessId, name, actor, timestamp }` (never ciphertext). | P1 |
| Scheduled key rotation | Quarterly rotation: encrypt new creds, `POST` overwrites, old revoked. | P2 |

**Outcome:** MTTR is minutes, not hours.

### Layer 5 — Harden (security)

Because it's secrets.

| Standard | Implementation | Priority |
|---|---|---|
| Client-side encryption standard | Documented algorithm (AES-256-GCM), key-pair layout, public-key location. Today: opaque ciphertext → flexible but audit-unfriendly. | P1 |
| Least-privilege JWT scope | Only `owner`/`billing_admin` roles can call `POST /business/secrets`. | **P0** if not already enforced |
| Secret Manager versioning | Rely on GCP Secret Manager version history for rollback. Document which version is "live." | P2 |
| Log scrubbing / pre-commit | Hook prevents plaintext creds or JWTs from landing in repos or logs. Ciphertext is safe. | P1 |

**Outcome:** the security posture matches what the system is actually storing.

---

## 4. Priority Order (impact-per-effort)

If forced to ship five things in order:

| # | Change | Owner | Why |
|---|---|---|---|
| 1 | `paymentsEnabled` flag in session response | backend + frontend | Removes user-hostile failure path immediately. Zero round trips for unconfigured sessions. |
| 2 | Structured error codes on Peach endpoints | backend + frontend | One-time backend change; permanent frontend simplification; unlocks #3. |
| 3 | "Go Live" gate requires `PEACH_PAYMENTS_KEYS` | backend + business dashboard | Closes the systemic hole — prevents all future instances of this bug. |
| 4 | Error-rate alert on `credentials not found` | ops | Minutes-to-detect for any regression. |
| 5 | Self-service Payment Setup page | business dashboard | Long-term operational win; retires the curl workflow. |

Everything else in §3 is incrementally good but not load-bearing.

---

## 5. Performance Analysis

The systemic fix is **faster** than the current flow.

| Metric | Today (failing Pay Now) | After preflight flag |
|---|---|---|
| Network calls when payments unconfigured | 1 failed POST per attempt | 0 — flag read from session data already fetched |
| Time to show correct UI | ~400–1200ms (backend round trip + error handling) | Instant (same request as session load) |
| Cognitive load on patron | High (cryptic technical error) | Low (clear fallback action) |
| Backend load per misconfigured business | 1 hit per patron × per attempt | Zero |
| Retry amplification risk | Users retry button → more failed requests | None — button is hidden |

Hiding the doomed button is both better UX *and* cheaper.

---

## 6. Anti-patterns (explicit don'ts)

| ❌ Don't | Why |
|---|---|
| Hard-code sandbox keys as prod fallback | Silently charges the wrong merchant. Catastrophic. |
| Retry the failed Pay Now endlessly | Spirals backend load on a state that needs human action. |
| Migrate to payment-intent architecture to "fix" this | Same Secret Manager lookup. Doesn't help. See `payment-intent-api.md` §3. |
| Block the whole ordering flow when creds are missing | Lose revenue for no reason. Gate *settlement*, not ordering. |
| Patron-side `GET /business/secrets` preflight | Patrons don't have the JWT; leaks config state. Put the flag in the session response instead. |
| Show raw backend error to customers | Support-ticket magnet and minor info disclosure. |
| One-off ad-hoc curl to seed each business | Doesn't scale. Build the self-service screen. |

---

## 7. Rollout Sequencing

A suggested 3-sprint plan. Each sprint is independently shippable.

### Sprint 1 — User-facing safety net
- [ ] Session response includes `paymentsEnabled: boolean`.
- [ ] Client hides Pay Now and shows "Pay at counter" when `false`.
- [ ] Backend returns `{ code, message, retriable }` error shape on `/embedded`.
- [ ] Client maps `PAYMENTS_NOT_CONFIGURED` → friendly copy.
- [ ] Runbook updates (`peach-credentials-issue.md`).

### Sprint 2 — Provisioning gate + observability
- [ ] Onboarding wizard blocks "Go Live" until `PEACH_PAYMENTS_KEYS` is stored.
- [ ] Server-side activation endpoint verifies secrets exist.
- [ ] Nightly health probe across all active businesses.
- [ ] Error-rate alert on `/embedded` misconfig returns.
- [ ] Audit log entries on `POST /business/secrets`.

### Sprint 3 — Self-service + hardening
- [ ] Business dashboard "Payment Setup" screen (encrypts + POSTs in one flow).
- [ ] Least-privilege JWT scope audit on `/business/secrets`.
- [ ] Client-side encryption standard documented (algorithm, key-pair, rotation).
- [ ] Pre-commit + log scrubber for plaintext creds.
- [ ] Synthetic probe in sandbox.

---

## 8. Verification Checklist

After rollout, the system is "correct" when **all** of these hold:

- [ ] A newly-signed-up business cannot flip to "active" without secrets.
- [ ] A patron-facing session response includes `paymentsEnabled`.
- [ ] Pay Now button is never rendered when `paymentsEnabled === false`.
- [ ] Revoking a business's `PEACH_PAYMENTS_KEYS` triggers an alert within 5 minutes.
- [ ] Re-adding creds through the dashboard re-enables Pay Now without a redeploy.
- [ ] Raw backend error strings never appear in the customer UI.
- [ ] `POST /business/secrets` calls are recorded in the audit log with actor + timestamp.
- [ ] Synthetic probe in staging catches regressions in under 24h.

---

## 9. Related Docs

- `docs/peach-credentials-issue.md` — incident dossier for the failing session.
- `docs/payment-flow.md` — current Peach architecture.
- `docs/payment-intent-api.md` + `.yaml` — alternate API spec analysis (does NOT solve this issue).
- `docs/api-docs.yaml` / `docs/api-docs.md` — canonical API spec.

---

## 10. Bottom Line

> **Correct:** treat payment credentials as first-class onboarding state. Couple "can take orders" with "can accept payments" atomically.
>
> **Standards-based:** structured error codes, feature flags on session responses, environment-scoped defaults, idempotent provisioning, self-service admin surfaces, synthetic probes, audit logs.
>
> **Best performance:** preflight via the session response — zero round trips, zero failed UI states, zero customer confusion.

Highest-leverage, client-only change we can ship today: the `paymentsEnabled` flag + friendly error copy (Sprint 1 items). Requires a small backend companion change (flag in session response, structured error on `/embedded`). Everything else follows.
