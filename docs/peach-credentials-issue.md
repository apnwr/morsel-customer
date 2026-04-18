# Peach Credentials Not Found — Issue Dossier

End-to-end walkthrough of the *"Peach credentials not found in Secret Manager"* error seen on **Pay Now**. Covers the UI symptom, network trace, backend flow, root cause, and resolution paths.

**Status:** Not a client bug. Business-side provisioning gap.
**First observed:** 2026-04-18, session `1xslNJINX5ruEey1FIAJ`, business `vQX9lFoJTwpYBhF5v4aZ`.

---

## 1. UI Symptom

Clicking **Pay Now** on the order screen opens the Peach checkout bottom sheet, which immediately transitions to an error state:

> **Something Went Wrong**
> Peach credentials not found in Secret Manager

This message is surfaced verbatim from the backend. The UI itself works correctly — it is faithfully showing an upstream error.

**Rendered by:** `src/components/payment/PeachCheckoutModal.tsx` when `usePeachCheckout` state transitions to `status: 'error'`.

---

## 2. Network Symptom

### Request
```http
POST /payments/peach-payments/embedded HTTP/1.1
Content-Type: application/json

{
  "sessionId": "1xslNJINX5ruEey1FIAJ",
  "sessionUserId": "d05262da-982a-4aea-8a39-b14509e4927f"
}
```

### Response
```json
{
  "success": false,
  "status": "error",
  "message": "Peach credentials not found in Secret Manager"
}
```

The request itself is well-formed:
- Matches the spec at `docs/api-docs.yaml:2607` (`/payments/peach-payments/embedded`).
- Matches the client's `CreateEmbeddedCheckoutRequest` type (`src/types/api/payment.ts`).
- Matches the payload produced in `usePeachCheckout.startCheckout()` (`src/hooks/usePeachCheckout.ts:161-168`).

No auth header is sent; the endpoint does not currently enforce `bearerAuth` despite declaring it in the spec.

---

## 3. Same API Works for the API Developer

A successful call against the same endpoint looks like:

### Developer's request
```json
{
  "sessionId": "XqG653LfHzZUQXNDUKSbE",
  "sessionUserId": "2e2ae373-fa22-4c45-ad96-bd92c06454ea"
}
```

### Developer's response (200)
```json
{
  "checkout": {
    "checkoutId": "773b1dc5dfa2495ead7d0b936e6c7877c",
    "entityId":   "8ac7a4c895d9a0020195db63cbd40250",
    "checkoutUrl":"https://testsecure.peachpayments.com/checkout?plugin=session&checkoutId=773b1dc5dfa2495ead7d0b936e6c7877c"
  },
  "transactionId": "1gb9f4nrXcVtBrPh33Of..."
}
```

### Side-by-side

| Field | Failing call | Working call |
|---|---|---|
| `sessionId` | `1xslNJINX5ruEey1FIAJ` | `XqG653LfHzZUQXNDUKSbE` |
| `sessionUserId` | `d05262da-…` | `2e2ae373-…` |
| Body shape | `{sessionId, sessionUserId}` | `{sessionId, sessionUserId}` |
| Auth header | none | none |
| Result | 4xx `Peach credentials not found` | 200 with checkout payload |

**The only meaningful difference is the `sessionId`**, which resolves to a different business on the backend.

### The tell-tale

The working response returns `entityId: 8ac7a4c895d9a0020195db63cbd40250`. That exact string appears in the OpenAPI spec at the `POST /business/secrets` example (`api-docs.yaml` under the `PeachPaymentsKeys` sample). In other words: the developer is testing against a **seeded business** where `POST /business/secrets` has been called with the canned sandbox credentials from the spec. Our failing business has never been seeded.

---

## 4. Backend Flow (what actually happens server-side)

```
POST /payments/peach-payments/embedded
     body: { sessionId, sessionUserId, splitIdentifier? }
  │
  ├─ 1. Load ordering session by sessionId
  │        session → { businessId, branchId, spaceId, orders, ... }
  │
  ├─ 2. Derive businessId from session
  │        failing:  businessId = "vQX9lFoJTwpYBhF5v4aZ"
  │        working:  businessId = "<dev-seeded-business-id>"
  │
  ├─ 3. Fetch credentials from Google Secret Manager
  │        key pattern (inferred): PEACH_PAYMENTS_KEYS_${businessId}
  │        value: ciphertext JSON → { entityId, clientId, clientSecret, merchantId, isSandbox }
  │
  ├─ 4a. Found → decrypt → call Peach Copyandpay API
  │        → return { checkout: {checkoutId, entityId, checkoutUrl}, transactionId }
  │
  └─ 4b. Missing → short-circuit with 4xx:
             { success: false, status: "error",
               message: "Peach credentials not found in Secret Manager" }
```

Step 3 is where our flow bails. Nothing else gets a chance to run.

---

## 5. Root Cause

The business `vQX9lFoJTwpYBhF5v4aZ` has never been onboarded to Peach Payments:

- No row in Google Secret Manager keyed to this business.
- `POST /business/secrets` with `name: "PEACH_PAYMENTS_KEYS"` was never called for this business admin's account.
- Therefore, any session under this business will fail at Pay Now until that's done.

This is a **data provisioning gap**, not a code defect. The customer-facing app cannot self-heal this — secret storage requires a business admin JWT.

---

## 6. Why the Client Is Not at Fault

Verified against source:

| Check | Location | Result |
|---|---|---|
| Request shape matches spec | `src/hooks/usePeachCheckout.ts:161-168` vs `api-docs.yaml:2607-2629` | ✅ Match |
| `sessionId` + `sessionUserId` sent correctly | `usePeachCheckout` options | ✅ |
| Error surfaced (not swallowed) | `usePeachCheckout.ts:190-193` | ✅ State transitions to `error` with backend message |
| UI renders error message | `PeachCheckoutModal` reads `state.error` | ✅ |
| `entityId` consumed from response | `usePeachCheckout.ts:85,176` | ✅ Used as `key` in `Checkout.initiate()` |

The request went out correctly, the response was a legitimate backend error, and the UI relayed it accurately.

---

## 7. Prerequisites for Pay Now to Work

For **any business** using the app, the following must be true before any patron can click Pay Now:

1. Business admin has obtained Peach credentials (sandbox or production) from the [Peach dashboard](https://sandbox-dashboard.peachpayments.com).
2. Business admin has called `POST /business/secrets` with:
   ```json
   {
     "name": "PEACH_PAYMENTS_KEYS",
     "ciphertext": "<encrypted JSON>",
     "description": "Peach Payments credentials"
   }
   ```
   where the plaintext JSON is:
   ```json
   {
     "entityId": "<from Peach>",
     "clientId": "<from Peach>",
     "clientSecret": "<from Peach>",
     "merchantId": "<from Peach>",
     "isSandbox": "true"
   }
   ```
3. The ciphertext is stored server-side in Google Secret Manager keyed to this business.
4. Any session created for this business can now complete Pay Now.

**One-time per business.** Once done, every session under that business works.

---

## 8. Resolution Paths

### A. Seed the current business (permanent fix)

Authenticated business admin runs:

```bash
curl -X POST 'https://us-central1-morsel-db7d8.cloudfunctions.net/app/api/v1/business/secrets' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <firebase-jwt-for-business-admin>' \
  -d '{
    "name": "PEACH_PAYMENTS_KEYS",
    "ciphertext": "{\"entityId\":\"<entity>\",\"clientSecret\":\"<secret>\",\"clientId\":\"<client>\",\"merchantId\":\"<merchant>\",\"isSandbox\":\"true\"}",
    "description": "Peach Payments sandbox credentials"
  }'
```

After this succeeds (201), replay the original `/embedded` curl — it will return 200 with `checkoutId` + `entityId`.

### B. Test against the developer's seeded business (verification only)

Start a session on a space belonging to the developer's pre-seeded business, use that `sessionId` in `/embedded`. Confirms the client stack is wired correctly and isolates the issue to "this specific business has no secrets." Useful for regression-testing the client without waiting on provisioning.

### C. Stub the credentials server-side (backend-only, for local dev)

If we maintain a local/dev copy of the Cloud Function, a developer can hard-code a fallback to sandbox credentials when the per-business secret is missing. Only acceptable for dev/staging — never production.

---

## 9. Optional Client Hardening

None of this is required, but worth considering:

### 9.1 Friendlier error copy

Current UI shows the raw backend string. For patrons, *"Peach credentials not found in Secret Manager"* is meaningless.

**Suggested mapping** in `PeachCheckoutModal`:

| Backend message contains | Show to user |
|---|---|
| `credentials not found` | *"Payments aren't set up for this restaurant yet. Please pay at the counter or contact staff."* |
| `checkout session expired` | *"Your payment window expired. Tap Retry to try again."* |
| anything else | *"Payment couldn't start. Please try again in a moment."* |

Keeps the raw message in the dev console for debugging but protects the customer experience.

### 9.2 Preflight check (over-engineering warning)

In theory the client could call `GET /business/secrets/PEACH_PAYMENTS_KEYS` up front and avoid showing Pay Now at all if missing — but that requires auth the patron doesn't have, and doubles the round trips. Not worth it; keep it reactive.

---

## 10. Verification Checklist

After seeding, confirm end-to-end with:

- [ ] `POST /business/secrets` returns 201
- [ ] `GET /business/secrets/PEACH_PAYMENTS_KEYS` returns the ciphertext
- [ ] `POST /payments/peach-payments/embedded` with the failing `sessionId` now returns 200 with `checkoutId` + `entityId`
- [ ] In the app, Pay Now opens the Peach widget (no error screen)
- [ ] Complete a test payment — widget `onCompleted` fires → `POST /payments/peach-payments/verify` returns `status: success` → order marked paid

---

## 11. Related Docs

- `docs/payment-flow.md` — architecture of the Peach integration, state machine diagrams
- `docs/api-docs.yaml` — full OpenAPI spec for `/payments/peach-payments/*` and `/business/secrets`
- `docs/api-docs.md` — endpoint cheatsheet (Payments - Peach, Secrets sections)
- `src/hooks/usePeachCheckout.ts` — client state machine
- `src/components/payment/PeachCheckoutModal.tsx` — UI surface for this error
