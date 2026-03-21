# Two-Page Architecture: `/cart` + `/orders`

> Morsel Customer App — March 2026

---

## Overview

The cart page has been split into two dedicated pages:

| Page | Purpose | Route |
|------|---------|-------|
| **Cart** | Items not yet placed (queue) | `/cart` |
| **Orders** | Unified view of ALL placed orders in the session | `/orders` |

---

## Navigation Flow

```
/menu  ──>  /cart  ──>  (place order)  ──>  /orders
  ^                                            |
  |                                            |
  +<──────  "Browse Menu" CTA  <───────────────+
```

### Trigger Map

| From | To | Trigger |
|------|----|---------|
| `/menu` | `/cart` | Header cart pill click |
| `/cart` | `/orders` | `handlePlaceOrder()` success → `router.push('/orders')` |
| `/cart` | `/orders` | "View Orders" banner (when placed orders exist) |
| `/orders` | `/menu` | "Browse Menu" CTA button |
| `/menu` | `/orders` | Orders icon in Header (visible when placed orders > 0) |
| `/orders` | `/cart` | Auto-redirect if no placed orders exist |

---

## Page Details

### `/cart` — Pre-Order (Queue)

**Renders:**
- `Header` with center label "Cart"
- "View Orders" banner (black bar) when placed orders exist, links to `/orders`
- `PreOrderView` — cart items, participants, bill section, tip selector
- Fixed "Place Order" CTA at bottom
- `EmptyState` when cart is empty with "Browse Menu" link
- `Footer`

**State hook:** `useCartPageState()`

```
Returns:
  cartItemsCount   — number of items in cart
  allOrderIds      — placed order IDs (for "View Orders" banner)
  isConfirming     — true while order is being placed
  handlePlaceOrder — confirms order, then navigates to /orders
```

**After placing order:**
1. `confirmOrder('cash')` via CartContext
2. Order cached to `morsel_order_{orderId}` in localStorage
3. Cart cleared
4. Session refreshed (new order appears in session.orders)
5. `router.push('/orders?orderId={orderId}')` — navigates to orders page

---

### `/orders` — Post-Order (Unified View)

**Renders:**
- `Header` with center label (e.g. "Order - ABCDE" or "Orders (3)")
- `PostOrderView` — order status, countdown timer, items list, running tabs, payment, split
- "Browse Menu" CTA button
- `Footer`

**State hook:** `useOrdersPageState()`

```
Returns:
  orderData          — merged APIOrder (all orders combined)
  orderDisplayLabel  — header text
  allOrderIds        — all placed order IDs
  isLoading          — true during initial load
  handleOrderMoreFood — clears state, navigates to /menu
```

**Auto-redirect:** If `allOrderIds.length === 0` after loading, redirects to `/cart`.

---

## Data Flow

### How Orders Are Loaded

```
1. Read allOrderIds from sessionData.session.orders
          |
2. For each orderId:
   Try localStorage: morsel_order_{orderId}
          |
   Found?──YES──> Add to loadedOrders[]
          |
          NO
          |
3. Fetch missing orders via:
   GET /ordering-session/session/{sessionId}
          |
4. Map each SessionOrder → APIOrder via mapSessionOrderToAPIOrder()
   Cache to localStorage
          |
5. mergeOrders(loadedOrders[], latestOrderId) → unified APIOrder
```

### How Orders Stay Updated

```
/orders page mounts
       |
       ├── refreshSessionData() — immediate, get latest orders
       |
       └── setInterval(refreshSessionData, 30000)
              polls every 30s for orders from other participants
```

### Order Merge Logic (`mergeOrders`)

```
Input:  [Order A (3 items, Rs 450), Order B (2 items, Rs 200)]
Output: Single APIOrder {
          id: latestOrderId,
          items: [...A.items, ...B.items],   // 5 items concatenated
          total: 650.00,                      // summed
          _itemParticipants: {...A, ...B},    // merged maps
          _itemImages: {...A, ...B},
          _itemDietary: {...A, ...B},
          _placedAt: min(A._placedAt, B._placedAt)
        }
```

---

## APIs Used (No Backend Changes)

| Endpoint | Used By | Purpose |
|----------|---------|---------|
| `GET /ordering-session/session/{sessionId}` | `useOrdersPageState`, `SessionContext` | Fetch session with orders, participants |
| `POST /ordering-session/session/{sessionId}/queue` | `CartContext` | Sync cart items to backend queue |
| `POST /ordering-session/session/{sessionId}/queue/confirm` | `CartContext.confirmOrder()` | Confirm order, returns full Order object |

### Firebase Realtime DB Paths (No Changes)

| Path | Listener | Purpose |
|------|----------|---------|
| `activeSessionsBySpace/{spaceId}/{sessionId}/sessionInfo/orderQueue` | `CartContext` | Real-time cart/queue sync |
| `activeSessionsBySpace/{spaceId}/{sessionId}/sessionInfo/participants` | `SessionContext` | Real-time participant sync |

### localStorage Keys

| Key | Page | Purpose |
|-----|------|---------|
| `morsel_cart` | `/cart` | Current cart state (items, totals) |
| `morsel_order_{orderId}` | `/orders` | Cached order data per placed order |
| `morsel_session_data` | Both | Full session data (orders array, participants) |
| `morsel_session_user_id` | Both | Current user's sessionUserId |
| `morsel_active_order_id` | `/orders` | Last active order ID |
| `morsel_menu_items_cache` | `/cart` | Menu items with customOptions for queue sync |

---

## Files Changed

### New Files

| File | Purpose |
|------|---------|
| `src/app/orders/page.tsx` | `/orders` route — unified orders view |
| `src/app/orders/loading.tsx` | Skeleton loader for orders page |
| `src/app/orders/error.tsx` | Error boundary with "Try Again" |
| `src/hooks/useOrdersPageState.ts` | Hook: load all orders, merge, poll |
| `src/lib/order-merging.ts` | `mergeOrders()` utility |

### Modified Files

| File | Change |
|------|--------|
| `src/hooks/useCartPageState.ts` | Simplified: cart-only, no order loading. `handlePlaceOrder` navigates to `/orders` |
| `src/app/cart/page.tsx` | Removed `PostOrderView`. Added "View Orders" banner. Always renders `PreOrderView` or `EmptyState` |
| `src/components/layout/Header.tsx` | Added orders icon (clipboard + badge) on `/menu` page when placed orders exist. Shows "Orders" center label on `/orders` page |

### Unchanged Files

All backend APIs, Firebase structure, contexts (`CartContext`, `SessionContext`, `SplitContext`, `OrderContext`), services, types, `PostOrderView`, `PreOrderView`, `BillSection`, `BillModal`, `layout.tsx`.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Cart items + placed orders | `/cart` shows cart + black "View Orders" banner at top |
| Place order from `/cart` | Order cached → cart cleared → navigate to `/orders` (instant) |
| Other participant places order | `/orders` polling catches it within 30s |
| No orders, visit `/orders` | Auto-redirect to `/cart` |
| No cart items, no orders | `/cart` shows empty state with "Browse Menu" |
| Deep link `/orders?orderId=x` | Orders page loads, sets activeOrderId, shows merged view |
| Multiple orders in session | All merged into one unified view (items concatenated, totals summed) |

---

## Header Behavior Per Page

| Page | Left | Center | Right |
|------|------|--------|-------|
| `/menu` | Morsel logo + participant dots | Cart pill (price + arrow) | Orders icon (if orders exist) + Hamburger |
| `/cart` | Morsel logo + participant dots | "Cart" text | Hamburger |
| `/orders` | Morsel logo + participant dots | "Orders" text or order label | Hamburger |

---

## Performance

| Concern | Solution |
|---------|----------|
| Duplicate API calls | `/cart` uses CartContext (queue sync). `/orders` uses its own `refreshSessionData` call. No overlap |
| Instant page transition | Order data cached to localStorage before `router.push('/orders')` |
| Unnecessary re-renders | `mergeOrders` result memoized via `useState`, only recomputed when `allOrderIds` changes |
| Skeleton loaders | Both `/cart/loading.tsx` and `/orders/loading.tsx` provide layout-matching skeletons |
| Polling cleanup | 30s interval cleared on unmount via `useEffect` cleanup |
| `sessionUserId` reads | Cached in `useRef` in CartContext — zero localStorage reads per cart operation |
| Menu search | Uses `useDeferredValue` — input stays responsive while filtering runs in background |
