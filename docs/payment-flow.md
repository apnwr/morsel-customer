# Payment Flow — Peach Payments Integration

## Status

| Milestone | Status |
|-----------|--------|
| Types, service, endpoints | Done |
| SDK loader (prefetch + lazy load) | Done |
| State machine hook (`usePeachCheckout`) | Done |
| Checkout modal (`PeachCheckoutModal`) | Done |
| Integration into orders page (`PostOrderView`) | Done |
| Success/failure screens (`PaymentResultView`) | Done (existing, no changes needed) |
| Test page (`/test-payment`) | Done |
| Peach sandbox credentials stored via Secrets API | **Blocked — needs Peach sandbox credentials** |
| End-to-end live test | **Blocked — waiting on credentials** |

### What's Blocking

The backend returns `"Peach credentials not found in Secret Manager"` when calling `POST /payments/peach-payments/embedded`. This means Peach sandbox credentials have not been stored yet.

**To unblock**, a business admin needs to:
1. Get sandbox credentials from [Peach Payments sandbox dashboard](https://sandbox-dashboard.peachpayments.com)
2. Store them via the Secrets API:
```bash
curl -X POST https://us-central1-morsel-db7d8.cloudfunctions.net/app/api/v1/business/secrets \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <firebase-jwt>' \
  -d '{
    "name": "PEACH_PAYMENTS_KEYS",
    "ciphertext": "{\"entityId\":\"<your-entity-id>\",\"clientSecret\":\"<your-client-secret>\",\"clientId\":\"<your-client-id>\",\"merchantId\":\"<your-merchant-id>\"}",
    "description": "Peach Payments sandbox credentials"
  }'
```

Once stored, the full flow will work end-to-end.

---

## Overview

Payment is handled via **Peach Payments Embedded Checkout**, which renders a secure payment widget directly in the app (no redirect to a payment gateway). The widget supports card payments, stored cards, and other methods configured in the Peach dashboard.

Each business stores their own Peach credentials via the **Secrets API**. The backend retrieves these credentials server-side when creating checkout sessions and verifying payments — the customer app never accesses secrets directly.

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  One-time Setup (Business Dashboard)                                 │
│                                                                      │
│  Admin → POST /business/secrets                                      │
│          name: "PEACH_PAYMENTS_KEYS"                                 │
│          ciphertext: encrypted { entityId, clientSecret,             │
│                                  clientId, merchantId }              │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────┐     POST /payments/peach-payments/embedded
│  Client (React)  │ ──────────────────────────────────────────► Backend
│                  │ ◄──────── { checkoutId, entityId, transactionId }
│                  │                                      ↑
│                  │                   Backend internally fetches
│                  │                   GET /business/secrets/PEACH_PAYMENTS_KEYS
│                  │                   and uses credentials to call Peach API
│                  │
│  Checkout.initiate({ checkoutId, key: entityId })
│  checkout.render(container)
│                  │
│  [User completes payment in widget]
│                  │
│  onCompleted →   │     POST /payments/peach-payments/verify
│                  │ ──────────────────────────────────────────► Backend
│                  │ ◄────────────── { success, status, verification }
│                  │                                      ↑
│                  │                   Backend uses same Peach credentials
│                  │                   to verify with Peach
└─────────────────┘
```

## Integration — Orders Page Flow

```
User on /orders page (PostOrderView)
  │
  │ useEffect → prefetchSDK()  (preloads Peach script on page mount)
  │
  ├─ Taps "Pay Now"
  │   → setIsCheckoutOpen(true)
  │   → PeachCheckoutModal slides up (bottom sheet, lazy-loaded)
  │
  ├─ Modal lifecycle:
  │   creating    → skeleton loader ("Preparing checkout...")
  │   loading-sdk → skeleton loader ("Loading payment form...")
  │   ready       → Peach widget renders in container
  │   rendered    → user interacts with payment form
  │   verifying   → overlay spinner ("Processing payment...")
  │   success     → brief flash → onPaymentResult('success')
  │   failed/error → error message + "Try Again" button
  │   cancelled   → "Payment Cancelled" + "Try Again"
  │   expired     → "Checkout Expired" + "Try Again"
  │
  ├─ On success:
  │   → Modal closes
  │   → orders/page.tsx sets paymentResult='success'
  │   → Renders PaymentResultView (success screen)
  │   → "Get Receipt" button
  │
  ├─ On failure (verify returned failed):
  │   → Modal closes
  │   → orders/page.tsx sets paymentResult='failure'
  │   → Renders PaymentResultView (failure screen)
  │   → "Retry Payment" → resets to PostOrderView → "Pay Now" again
  │
  └─ On cancel/close modal:
      → Modal closes, stays on PostOrderView
      → User can tap "Pay Now" again (fresh checkoutId)
```

## APIs

### 1. Create Embedded Checkout Session

**`POST /payments/peach-payments/embedded`**

Creates a Peach embedded checkout session for payment. Backend retrieves Peach credentials from stored business secrets, calls Peach API, and returns `checkoutId`, `entityId`, and `transactionId`.

**Request:**
```json
{
  "sessionId": "string (required) — Ordering session ID",
  "sessionUserId": "string (optional) — Participant ID for multi-participant sessions",
  "splitIdentifier": "string (optional) — Split ID or index for a specific split"
}
```

**Response (200):**
```json
{
  "checkout": {
    "checkoutId": "string — Peach embedded checkout ID",
    "checkoutUrl": "string — URL/widget endpoint for embedded checkout",
    "entityId": "string — Peach entity ID (from business secrets), used as `key` in Checkout.initiate()"
  },
  "transactionId": "string — Created/used transaction ID"
}
```

**Errors:**
- `400` — Invalid request parameters
- `404` — Session, order, or transaction not found

**Auth:** Bearer token (Firebase JWT)

---

### 2. Verify & Settle Payment

**`POST /payments/peach-payments/verify`**

Verifies the status of a Peach embedded checkout and settles the transaction if successful. On success: marks split as paid (if applicable), updates order statuses, and sends receipt.

**Request:**
```json
{
  "checkoutId": "string (required) — Peach checkout ID to verify",
  "transactionId": "string (optional) — Transaction ID, can be looked up by checkoutId",
  "clientId": "string (optional) — Client identifier for per-client Peach credentials",
  "phone": "string (optional) — Phone number for receipt notification",
  "splitId": "string (optional) — Split ID to mark as paid",
  "sessionUserId": "string (optional) — Participant ID for multi-participant sessions"
}
```

**Response (200):**
```json
{
  "success": true,
  "status": "success | failed",
  "verification": { "...full Peach verification response..." },
  "transactionId": "string — Associated transaction ID"
}
```

**Errors:**
- `400` — Missing checkoutId or invalid parameters
- `404` — Transaction or checkout not found

**Auth:** Bearer token (Firebase JWT)

---

### 3. Store Business Secret

**`POST /business/secrets`**

Stores encrypted credentials for a business. The platform stores ciphertext as-is and does not decrypt. Used by business admins to configure Peach Payments credentials.

**Request:**
```json
{
  "name": "PEACH_PAYMENTS_KEYS",
  "ciphertext": "{\"entityId\":\"...\",\"clientSecret\":\"...\",\"clientId\":\"...\",\"merchantId\":\"...\"}",
  "description": "Peach Payments credentials for business"
}
```

**Response:** `201` — Secret stored successfully

**Errors:**
- `400` — Missing required fields
- `401` — Unauthorized
- `403` — Forbidden

**Auth:** Bearer token (Firebase JWT)

**Note:** This is a business dashboard API — not called from the customer app.

---

### 4. Retrieve Business Secret

**`GET /business/secrets/{name}`**

Retrieves stored ciphertext for a secret. Used by the backend server-side to get Peach credentials when processing payments.

**Response (200):**
```json
{
  "secret": {
    "name": "PEACH_PAYMENTS_KEYS",
    "ciphertext": "...",
    "description": "Peach Payments credentials for business"
  }
}
```

**Note:** Server-to-server only. The customer app does not call this endpoint.

---

## Credentials Flow

```
1. Business admin stores Peach credentials:
   POST /business/secrets { name: "PEACH_PAYMENTS_KEYS", ciphertext: encrypted(...) }

2. Customer taps "Pay Now":
   POST /payments/peach-payments/embedded { sessionId }
     → Backend: GET /business/secrets/PEACH_PAYMENTS_KEYS
     → Backend: Decrypts → uses entityId/clientSecret to call Peach API
     → Returns: { checkoutId, entityId, transactionId }

3. Client renders widget:
   Checkout.initiate({ checkoutId, key: entityId })

4. User completes payment:
   POST /payments/peach-payments/verify { checkoutId }
     → Backend: Uses same Peach credentials to verify with Peach
     → Returns: { success, status }
```

## Client Implementation

### Files

| File | Purpose |
|------|---------|
| `src/types/api/payment.ts` | Request/response types + checkout state machine types |
| `src/lib/peach-payments/types.ts` | TypeScript declarations for Peach SDK global `Checkout` object |
| `src/lib/peach-payments/sdk-loader.ts` | Lazy SDK loader (`prefetchSDK`, `loadSDK`, `resetSDKLoader`) |
| `src/services/payment.service.ts` | API service for create + verify endpoints |
| `src/hooks/usePeachCheckout.ts` | State machine hook managing full checkout lifecycle |
| `src/components/payment/CheckoutSkeleton.tsx` | Loading skeleton while SDK loads |
| `src/components/payment/PeachCheckoutModal.tsx` | Bottom-sheet modal rendering the Peach widget |
| `src/components/order/PostOrderView.tsx` | Orders page — "Pay Now" opens `PeachCheckoutModal` |
| `src/app/test-payment/page.tsx` | Test page with mock scenarios (delete before production) |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/api/endpoints.ts` | Added `payment` endpoint group |
| `src/lib/config.ts` | Added `peachPayments` config block |
| `src/components/order/PostOrderView.tsx` | Replaced simulated payment with `PeachCheckoutModal` |
| `docs/api-docs.yaml` | Added Payments + Secrets API specs |

### Entity ID Resolution

The `key` parameter in `Checkout.initiate()` is resolved in this order:
1. **`entityId` from create checkout response** — per-business, from stored secrets (preferred)
2. **`NEXT_PUBLIC_PEACH_PAYMENTS_ENTITY_KEY` env var** — global fallback for development/testing

### State Machine

```
idle → creating → ready → rendered → verifying → success
                                   → cancelled
                                   → expired
                   ↓                → failed
                 error              → error

Any terminal state → idle (via retry, creates NEW checkoutId)
```

### Performance

1. **SDK Prefetch** — `prefetchSDK()` injects `<link rel="preload">` early (when user views orders page)
2. **Parallel Init** — API call + SDK load fire concurrently via `Promise.all`
3. **Lazy Modal** — Component loaded via `next/dynamic({ ssr: false })`
4. **Ref-based Render** — Widget renders the instant the DOM container is available

### Peach SDK Reference

- **Sandbox script:** `https://sandbox-checkout.peachpayments.com/js/checkout.js`
- **Production script:** `https://checkout.peachpayments.com/js/checkout.js`
- **Init:** `Checkout.initiate({ checkoutId, key: entityId, eventHandlers, customisations })`
- **Render:** `checkout.render(element)` — renders into a DOM element
- **Unmount:** `checkout.unmount()` — removes the widget
- **Constraint:** Same `checkoutId` cannot be reused for another render attempt

### Environment Variables

```
NEXT_PUBLIC_PEACH_PAYMENTS_ENTITY_KEY=<fallback-entity-key-for-dev>
NEXT_PUBLIC_PEACH_PAYMENTS_SANDBOX=true
```
