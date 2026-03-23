# My Tab Page (`/my-tab`)

> Morsel Customer App — March 2026

---

## Overview

The My Tab page provides a summary view of the current dining session — showing the table name, split/participants card, a link to Google Reviews, and a fixed "Pay Now" bar at the bottom. It reuses the shared `ParticipantsList` component (same as the orders page) for split management.

**Route:** `/my-tab`

---

## Page Layout (Top → Bottom)

| Section | Description |
|---------|-------------|
| **Sticky Top Bar** | Back button (chevron, `router.back()`) + centered Morsel text logo (`morsel_text_logo.svg`, 76×17px — same size as Footer logo) |
| **Table Name** | `h1` showing `sessionData.space.name` (e.g. "Table 15"), falls back to "Table" |
| **ParticipantsList** | Shared black card component — shows participant avatars, per-person amounts, split mode label, and "Change" settings button. Opens `SplitSettingsModal` on tap. Handles its own participant sync (Firebase + polling fallback) |
| **Google Reviews** | Centered placeholder link (198×112px gray card) pointing to a hardcoded Google Maps URL |
| **Browse Menu** | Full-width outlined CTA button → navigates to `/menu` |
| **Pay Now Bar** | Fixed bottom black bar (70px, rounded-t-30px) showing "Pay Now {amount}" + diagonal arrow icon |
| **Footer** | Standard app footer |

---

## Navigation

| From | To | Trigger |
|------|----|---------|
| `/my-tab` | Previous page | Back chevron (`router.back()`) |
| `/my-tab` | `/menu` | "Browse Menu" CTA button |
| `/my-tab` | External | Google Reviews link (opens in new tab) |

---

## Data Flow

### Orders Total Calculation

```
1. Read sessionId from sessionData.session.id
         |
2. Fetch full session via:
   GET /ordering-session/session/{sessionId}
         |
3. Sum all order totals from session.orders[]
   (only objects with a `total` field are counted)
         |
4. Store result in ordersTotal state
```

### Pay Now Amount Calculation

```
1. evenShare = ordersTotal / max(1, apiParticipants.length)
         |
2. Check if split.shares are applicable for current ordersTotal
   via isSplitApplicableForTotal(split.splitForTotal, ordersTotal)
         |
3. If applicable AND current user has a share → use split.shares[userId]
   Otherwise → use evenShare
```

### ParticipantsList (Delegated)

The `ParticipantsList` component handles its own data lifecycle:
- Fetches session details independently
- Syncs API participants into `SplitContext`
- Uses Firebase Realtime DB for live participant updates (falls back to 10s polling)
- Recalculates split when cart total or participants change
- Renders its own `SplitSettingsModal`

---

## State

| State | Type | Source | Purpose |
|-------|------|--------|---------|
| `ordersTotal` | `number` | API fetch on mount | Sum of all placed order totals in session |
| `sessionData` | `SessionData` | `useSession()` context | Provides session ID, space name, participants |
| `split` | `SplitState` | `useSplit()` context | Current split mode, shares, participants |
| `currentSessionUserId` | `string` | localStorage (`morsel_session_user_id`) | Identifies current user for share lookup |

### Derived Values

| Value | Derivation |
|-------|-----------|
| `apiParticipants` | `sessionData.session.participants` (memoized) |
| `evenShare` | `ordersTotal / max(1, apiParticipants.length)` |
| `tableLabel` | `sessionData.space.name ?? "Table"` |
| `useSplitShares` | `isSplitApplicableForTotal(split.splitForTotal, ordersTotal)` |
| `payNowAmount` | Split share for current user if applicable, else `evenShare` |

---

## Guards

| Guard | Purpose |
|-------|---------|
| `useRequireRestaurantContext()` | Redirects if no restaurant context (user hasn't scanned QR) |
| `useSessionValidation()` | Validates active session exists |

---

## APIs Used

| Endpoint | Purpose |
|----------|---------|
| `GET /ordering-session/session/{sessionId}` | Fetch session orders to compute `ordersTotal` |

---

## Components Used

| Component | Source | Purpose |
|-----------|--------|---------|
| `ParticipantsList` | `@/components/session/ParticipantsList` | Split card with avatars, amounts, settings modal |
| `Footer` | `@/components/layout/Footer` | Standard app footer |

---

## Files

| File | Purpose |
|------|---------|
| `src/app/my-tab/page.tsx` | Page component |
| `src/components/session/ParticipantsList.tsx` | Shared split/participants card (also used on orders page) |
| `src/components/order/SplitSettingsModal.tsx` | Modal for changing split mode (rendered by ParticipantsList) |
| `src/lib/split-utils.ts` | `isSplitApplicableForTotal()` utility |

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No session ID | `ordersTotal` set to 0 |
| API fetch fails | `ordersTotal` falls back to 0 |
| No participants | `evenShare` = `ordersTotal / 1` (full amount) |
| Split shares not applicable for current total | Falls back to even share |
| Current user not found in split shares | Falls back to even share |
