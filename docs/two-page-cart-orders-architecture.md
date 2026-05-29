# Two-Page Architecture: `/cart` + `/orders`

> Morsel Customer App — March 2026

---

## Overview

The cart page has been split into two dedicated pages:

| Page       | Purpose                                          | Route     |
| ---------- | ------------------------------------------------ | --------- |
| **Cart**   | Items not yet placed (queue)                     | `/cart`   |
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

| From      | To        | Trigger                                                             |
| --------- | --------- | ------------------------------------------------------------------- |
| `/menu`   | `/cart`   | Header cart pill click                                              |
| `/cart`   | `/orders` | `handlePlaceOrder()` success → `router.push('/orders?orderId=...')` |
| `/cart`   | `/orders` | "View Ordered Items →" banner (when placed orders exist)            |
| `/orders` | `/menu`   | "Browse Menu" CTA button                                            |
| `/menu`   | `/orders` | `TotalBillCard` in Header (visible when `bill.subtotal > 0`)        |
| `/orders` | `/cart`   | Auto-redirect if no placed orders exist                             |

---

## Page Details

### `/cart` — Pre-Order (Queue)

**Renders:**

- `Header` with center label "Cart"
- "View Ordered Items →" banner (a `bg-brand` bar, not black) when placed orders exist, links to `/orders` (`cart/page.tsx:49-58`)
- `PreOrderView` — cart items, participants, bill section, tip selector
- Fixed "Place Order" CTA at bottom
- `EmptyState` when cart is empty with "Browse Menu" link
- `Footer`

**State hook:** `useCartPageState()`

```
Returns:
  cartItemsCount   — number of items in cart
  allOrderIds      — placed order IDs (for "View Ordered Items" banner)
  isConfirming     — true while order is being placed
  handlePlaceOrder — places order, then navigates to /orders
```

**After placing order** (`handlePlaceOrder` branches on flow type — `useCartPageState.ts:54-153`):

- **Area flow** (`flowType === 'area'`): `orderService.placeAreaOrder({ sessionId, areaId, guestName, items, paymentType: 'cash' })`, then `refreshSessionData()` to extract the orderId from the updated orders array.
- **Space flow** (default): `confirmOrder('cash', notes)` via CartContext, where `notes` is read from the kitchen-note storage key.

Then, common to both branches:

1. `setActiveOrderId(orderId)`
2. `router.push('/orders?orderId={orderId}')` — navigate first
3. Cart clear + kitchen-note/tip reset is **deferred** via `setTimeout(..., 1000)` (avoids an empty-cart flash before navigation completes)

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
  bill               — SessionBill from API (taxes, charges, grand total)
  orderDisplayLabel  — computed header text — but NOT consumed (see note)
  allOrderIds        — all placed order IDs
  isLoading          — true during initial load
```

> **Note:** there is no `handleOrderMoreFood` — it does not exist in the hook (`useOrdersPageState.ts:23-33`). Also, `orderDisplayLabel` is computed but **effectively dead**: `orders/page.tsx` hardcodes `centerLabel="Order Placed"` (`orders/page.tsx:98`) rather than consuming it.

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
5. mergeOrders(loadedOrders[], latestOrderId, sessionData.session.participants) → unified APIOrder
```

### How Orders Stay Updated

The /orders 30s interval polls the **bill** (`billService.getSessionBill`), not `refreshSessionData`. Session/participant polling is owned separately by `SessionContext` (every 10s).

```
/orders page mounts (useOrdersPageState.ts:54-87)
       |
       ├── fetchBill() — immediate getSessionBill(sessionId)
       |
       └── setInterval(fetchBill, 30000)
              polls the bill every 30s; SessionContext separately
              polls session data (orders, participants) every 10s
```

### Order Merge Logic (`mergeOrders`)

`mergeOrders(orders, latestOrderId, participants)` takes a third argument — `sessionData.session.participants` — used to stamp each merged item's `guestName` via `getParticipantName()` (`useOrdersPageState.ts:108,162`; `order-merging.ts:15`).

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

| Endpoint                                                   | Used By                                | Purpose                                  |
| ---------------------------------------------------------- | -------------------------------------- | ---------------------------------------- |
| `GET /ordering-session/session/{sessionId}`                | `useOrdersPageState`, `SessionContext` | Fetch session with orders, participants  |
| `POST /ordering-session/session/{sessionId}/queue`         | `CartContext`                          | Sync cart items to backend queue         |
| `POST /ordering-session/session/{sessionId}/queue/confirm` | `CartContext.confirmOrder()`           | Confirm order, returns full Order object |

### Firebase Realtime DB Paths (No Changes)

| Path                                                                   | Listener         | Purpose                    |
| ---------------------------------------------------------------------- | ---------------- | -------------------------- |
| `activeSessionsBySpace/{spaceId}/{sessionId}/sessionInfo/orderQueue`   | `CartContext`    | Real-time cart/queue sync  |
| `activeSessionsBySpace/{spaceId}/{sessionId}/sessionInfo/participants` | `SessionContext` | Real-time participant sync |

### localStorage Keys

| Key                       | Page      | Purpose                                        |
| ------------------------- | --------- | ---------------------------------------------- |
| `morsel_cart`             | `/cart`   | Current cart state (items, totals)             |
| `morsel_order_{orderId}`  | `/orders` | Cached order data per placed order             |
| `morsel_session_data`     | Both      | Full session data (orders array, participants) |
| `morsel_session_user_id`  | Both      | Current user's sessionUserId                   |
| `morsel_active_order_id`  | `/orders` | Last active order ID                           |
| `morsel_menu_items_cache` | `/cart`   | Menu items with customOptions for queue sync   |

---

## Files Changed

### New Files

| File                              | Purpose                               |
| --------------------------------- | ------------------------------------- |
| `src/app/orders/page.tsx`         | `/orders` route — unified orders view |
| `src/app/orders/loading.tsx`      | Skeleton loader for orders page       |
| `src/app/orders/error.tsx`        | Error boundary with "Try Again"       |
| `src/hooks/useOrdersPageState.ts` | Hook: load all orders, merge, poll    |
| `src/lib/order-merging.ts`        | `mergeOrders()` utility               |

### Modified Files

| File                               | Change                                                                                                                                                                                  |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/hooks/useCartPageState.ts`    | Simplified: cart-only, no order loading. `handlePlaceOrder` navigates to `/orders`                                                                                                      |
| `src/app/cart/page.tsx`            | Removed `PostOrderView`. Added "View Ordered Items →" banner. Always renders `PreOrderView` or `EmptyState`                                                                             |
| `src/components/layout/Header.tsx` | Right-side element on `/menu` is now `TotalBillCard` (shown when `bill.subtotal > 0`, links to `/orders`). The clipboard+badge orders icon is **commented out** (`Header.tsx:337-354`). |

### Unchanged Files

All backend APIs, Firebase structure, contexts (`CartContext`, `SessionContext`, `SplitContext`, `OrderContext`), services, types, `PreOrderView`, `layout.tsx`.

> `PostOrderView` and `BillSection` were **not** unchanged — both were heavily reworked in the deepak-new bill/split flow. `BillModal` no longer appears in these flows.

---

## Edge Cases

| Scenario                       | Behavior                                                             |
| ------------------------------ | -------------------------------------------------------------------- |
| Cart items + placed orders     | `/cart` shows cart + "View Ordered Items →" `bg-brand` banner at top |
| Place order from `/cart`       | Order cached → cart cleared → navigate to `/orders` (instant)        |
| Other participant places order | `/orders` polling catches it within 30s                              |
| No orders, visit `/orders`     | Auto-redirect to `/cart`                                             |
| No cart items, no orders       | `/cart` shows empty state with "Browse Menu"                         |
| Deep link `/orders?orderId=x`  | Orders page loads, sets activeOrderId, shows merged view             |
| Multiple orders in session     | All merged into one unified view (items concatenated, totals summed) |

---

## Header Behavior Per Page

| Page      | Left                           | Center                       | Right                                                         |
| --------- | ------------------------------ | ---------------------------- | ------------------------------------------------------------- |
| `/menu`   | Morsel logo + participant dots | (cart pill commented out)    | `TotalBillCard` when `bill.subtotal > 0` (links to `/orders`) |
| `/cart`   | Morsel logo + participant dots | "Cart" text                  | Hamburger                                                     |
| `/orders` | Morsel logo + participant dots | "Orders" text or order label | Hamburger                                                     |

---

## Performance

| Concern                 | Solution                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| Duplicate API calls     | `/cart` uses CartContext (queue sync). `/orders` uses its own `refreshSessionData` call. No overlap |
| Instant page transition | Order data cached to localStorage before `router.push('/orders')`                                   |
| Unnecessary re-renders  | `mergeOrders` result memoized via `useState`, only recomputed when `allOrderIds` changes            |
| Skeleton loaders        | Both `/cart/loading.tsx` and `/orders/loading.tsx` provide layout-matching skeletons                |
| Polling cleanup         | 30s interval cleared on unmount via `useEffect` cleanup                                             |
| `sessionUserId` reads   | Cached in `useRef` in CartContext — zero localStorage reads per cart operation                      |
| Menu search             | Uses `useDeferredValue` — input stays responsive while filtering runs in background                 |
