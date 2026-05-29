# My Tab Page (`/my-tab`)

> Morsel Customer App — March 2026

---

## Overview

The My Tab page provides a summary view of the current dining session — showing the table name, split/participants card, a link to Google Reviews, and a fixed "Pay Now" bar at the bottom. It reuses the shared `ParticipantsList` component (same as the orders page) for split management.

**Route:** `/my-tab`

---

## Page Layout (Top → Bottom)

| Section              | Description                                                                                                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Sticky Top Bar**   | Back button (chevron, `router.back()`) + centered Morsel text logo (`morsel_text_logo.svg`, 76×17px — same size as Footer logo)                                                                                                |
| **Table Name**       | `h1` showing `sessionData.space.name` (e.g. "Table 15"), falls back to "Table"                                                                                                                                                 |
| **ParticipantsList** | Shared black card component — shows participant avatars, per-person amounts, split mode label, and "Change" settings button. Opens `SplitSettingsModal` on tap. Handles its own participant sync (Firebase + polling fallback) |
| **Google Reviews**   | Centered placeholder link (198×112px gray card) pointing to a hardcoded Google Maps URL                                                                                                                                        |
| **Browse Menu**      | Full-width outlined CTA button → navigates to `/menu`                                                                                                                                                                          |
| **Pay Now Bar**      | Fixed bottom black bar (70px, rounded-t-30px) showing "Pay Now {amount}" + diagonal arrow icon                                                                                                                                 |
| **Footer**           | Standard app footer                                                                                                                                                                                                            |

---

## Navigation

| From      | To            | Trigger                                       |
| --------- | ------------- | --------------------------------------------- |
| `/my-tab` | Previous page | Back chevron (`router.back()`)                |
| `/my-tab` | `/payment`    | "Pay Now" bar → `/payment?amount=...&tip=...` |
| `/my-tab` | `/menu`       | "Browse Menu" CTA button                      |
| `/my-tab` | External      | Google Reviews link (opens in new tab)        |

---

## Data Flow

### Bill Total

There is **no** `ordersTotal` state and **no** manual summation of `session.orders[].total`. The page reads the bill total straight from `useSessionBill()` (`my-tab/page.tsx:39-40`):

```ts
const { bill } = useSessionBill();
const billTotal = bill?.total ?? 0;
```

`useSessionBill()` goes through the shared bill cache, so concurrent consumers de-dupe to a single fetch.

### Pay Now Amount Calculation

Server-first. The page reads the current user's amount from `splitPaymentStatus` (via `useSession()`), falls back to an even share, and **ignores** local `split.shares`. `isSplitApplicableForTotal` / `split-utils` is no longer imported here (`my-tab/page.tsx:47-59`).

```
evenShare  = billTotal / max(1, apiParticipants.length)
serverAmount = splitPaymentStatus.find(s => s.sessionUserId === me)?.amount ?? null

payNowAmount = flowType === 'area'
                 ? billTotal                          // area flow: pay the whole bill
                 : serverAmount != null
                     ? serverAmount                    // server-provided split share
                     : evenShare                       // fallback
```

### ParticipantsList (Delegated)

The `ParticipantsList` component handles its own data lifecycle:

- Fetches session details independently
- Syncs API participants into `SplitContext`
- Uses Firebase Realtime DB for live participant updates (falls back to 10s polling)
- Recalculates split when cart total or participants change
- Renders its own `SplitSettingsModal`

Note: `ParticipantsList` is **hidden in the area flow** (`flowType !== 'area'` guard — `my-tab/page.tsx:117`), since area orders are single-participant with no split.

---

## Pay Now / Payment Navigation

`handlePayNow` (`my-tab/page.tsx:67-76`) adds the stored tip and routes to the `/payment` route:

```ts
const tipAmount = getStoredTip().amount;
const totalWithTip = round((payNowAmount + tipAmount) * 100) / 100;
router.push(`/payment?amount=${totalWithTip}&tip=${tipAmount}`);
```

An effect (`my-tab/page.tsx:62-65`) prefetches the Peach SDK (`prefetchSDK()`) and the `/payment` route so the payment screen opens instantly.

---

## State

| State                  | Type                  | Source                                  | Purpose                                       |
| ---------------------- | --------------------- | --------------------------------------- | --------------------------------------------- |
| `bill`                 | `SessionBill \| null` | `useSessionBill()`                      | Provides `bill.total` (the bill total)        |
| `sessionData`          | `SessionData`         | `useSession()` context                  | Provides session ID, space name, participants |
| `splitPaymentStatus`   | array                 | `useSession()` context                  | Server-provided per-user pay amounts          |
| `flowType`             | `'space' \| 'area'`   | `useFlowType()`                         | Branches Pay Now amount and ParticipantsList  |
| `currentSessionUserId` | `string`              | localStorage (`morsel_session_user_id`) | Identifies current user for share lookup      |

There is **no** `useSplit()` in this page.

### Derived Values

| Value             | Derivation                                                     |
| ----------------- | -------------------------------------------------------------- |
| `apiParticipants` | `sessionData.session.participants` (memoized)                  |
| `billTotal`       | `bill?.total ?? 0`                                             |
| `evenShare`       | `billTotal / max(1, apiParticipants.length)`                   |
| `tableLabel`      | `sessionData.space.name ?? "Table"`                            |
| `serverAmount`    | `splitPaymentStatus.find(s => s.sessionUserId === me)?.amount` |
| `payNowAmount`    | `area` → `billTotal`; else `serverAmount ?? evenShare`         |

---

## Guards

| Guard                           | Purpose                                                     |
| ------------------------------- | ----------------------------------------------------------- |
| `useRequireRestaurantContext()` | Redirects if no restaurant context (user hasn't scanned QR) |
| `useSessionValidation()`        | Validates active session exists                             |

---

## APIs Used

| Endpoint                          | Purpose                                  |
| --------------------------------- | ---------------------------------------- |
| Bill fetch via `useSessionBill()` | Provides `bill.total` (shared, de-duped) |

---

## Components Used

| Component          | Source                                  | Purpose                                          |
| ------------------ | --------------------------------------- | ------------------------------------------------ |
| `ParticipantsList` | `@/components/session/ParticipantsList` | Split card with avatars, amounts, settings modal |
| `Footer`           | `@/components/layout/Footer`            | Standard app footer                              |

---

## Files

| File                                          | Purpose                                                      |
| --------------------------------------------- | ------------------------------------------------------------ |
| `src/app/my-tab/page.tsx`                     | Page component                                               |
| `src/components/session/ParticipantsList.tsx` | Shared split/participants card (also used on orders page)    |
| `src/components/order/SplitSettingsModal.tsx` | Modal for changing split mode (rendered by ParticipantsList) |
| `src/hooks/useSessionBill.ts`                 | Provides `bill.total` via the shared bill cache              |
| `src/components/cart/TipSelector.tsx`         | `getStoredTip()` — read at Pay Now time                      |

---

## Edge Cases

| Scenario                          | Behavior                                            |
| --------------------------------- | --------------------------------------------------- |
| No session ID                     | `billTotal` is 0; Pay Now disabled                  |
| Bill not yet loaded               | `bill?.total ?? 0` → `billTotal` is 0               |
| No participants                   | `evenShare` = `billTotal / 1` (full amount)         |
| No server amount for current user | Falls back to even share                            |
| Area flow                         | `payNowAmount = billTotal`; ParticipantsList hidden |
