# Cart to Payment Flow - Morsel Customer App

Complete end-to-end flow from cart page through order placement to payment result.

---

## High-Level Flow

```
                         CART PAGE (/cart)
                              |
                    +---------+---------+
                    |                   |
               Empty State        PreOrderView
                    |                   |
                    |         [User clicks "Place Order"]
                    |                   |
                    |         +---------+---------+
                    |         |                   |
                    |    Area Flow           Space Flow
                    |         |                   |
                    |   placeAreaOrder()    confirmOrder()
                    |         |                   |
                    |         +--------+----------+
                    |                  |
                    |          setActiveOrderId()
                    |                  |
                    |          router.push('/orders')
                    |                  |
                    |           clearCart() + resetTip()
                    |                  |
                    |         ORDERS PAGE (/orders)
                    |                  |
                    |      +-----+-----+-----+
                    |      |           |     |
                    |  Load Cache  Polling   Bill Poll
                    |      |       (10s)     (30s)
                    |      +-----+-----+-----+
                    |                  |
                    |          PostOrderView
                    |           (items, tip, split, bill)
                    |                  |
                    |        [User clicks "Pay Now"]
                    |                  |
                    |         Simulate Payment (1.5s)
                    |                  |
                    |         +--------+--------+
                    |         |                 |
                    |      Success           Failure
                    |         |                 |
                    |   PaymentResultView  PaymentResultView
                    |         |                 |
                    |   "Get Receipt"     "Retry Payment"
                    |         |                 |
                    |   "Back to Menu"     Goes back to
                    |         |            PostOrderView
                    |   endSession()
                    |         |
                    |    router.push('/menu')
```

---

## Phase 1: Cart Page

### Entry Point

```
/cart (src/app/cart/page.tsx)
  |
  +-- useRequireRestaurantContext()   // Guard: must have restaurant
  +-- useSessionValidation()          // Guard: must have active session
  +-- useCartPageState()              // Main state hook
       |
       +-- Returns:
       |     cartItemsCount    (number)
       |     allOrderIds       (string[])
       |     isConfirming      (boolean)
       |     handlePlaceOrder  (function)
       |
       +-- Contexts Used:
             useSession()   --> sessionData, setActiveOrderId, refreshSessionData
             useCart()      --> cart, confirmOrder, clearCart
             useOrder()    --> placeOrder (legacy)
             useSplit()    --> split
             useFlowType() --> 'area' | 'space'
```

### Cart State (CartContext)

```
CartContext (src/contexts/CartContext.tsx)
  |
  +-- State:
  |     cart: {
  |       items: CartItem[],
  |       subtotal: number,
  |       tax: number,
  |       total: number
  |     }
  |
  +-- Key Methods:
  |     addItem(item)        --> syncQueueWithAPI()
  |     removeItem(itemId)   --> syncQueueWithAPI()
  |     updateQuantity()     --> syncQueueWithAPI()
  |     confirmOrder(type)   --> POST /queue/confirm
  |     clearCart()           --> empties cart
  |
  +-- Real-time Sync:
  |     Firebase Realtime DB listener (for cart/queue only)
  |       path: activeSessionsBySpace/{spaceId}/{sessionId}/orderQueue
  |     Polling fallback (every 15s)
  |
  +-- Storage: localStorage['morsel_cart']
```

### Pre-Order View Display

```
PreOrderView (src/components/cart/PreOrderView.tsx)
  |
  +-- My Cart Items
  |     Items where sessionUserId === currentUser OR no sessionUserId
  |     Each item: image, name, variant, addons, quantity controls, price
  |
  +-- Table Orders (multi-user sessions)
  |     Grouped by participant
  |     Read-only display of others' items
  |
  +-- Bill Section
  |     Items total .............. $XX.XX
  |     Taxes .................... $XX.XX
  |     Delivery charge .......... $XX.XX
  |     Restaurant Packing fees .. $XX.XX
  |     ─────────────────────────────────
  |     Grand total .............. $XX.XX
  |
  +-- Kitchen Note (optional)
  |     Persisted to localStorage['morsel_kitchen_note']
  |
  +-- [Place Order] Button (fixed bottom)
        Disabled if: isPlacingOrder || myItems.length === 0
        Shows: cart total price
```

---

## Phase 2: Order Placement

### Flow Branching

```
handlePlaceOrder()  (src/hooks/useCartPageState.ts)
  |
  +-- Read from localStorage:
  |     morsel_session_user_id  --> sessionUserId
  |     morsel_customer_name    --> guestName
  |     morsel_dining_type      --> dineType
  |     morsel_area_id          --> areaId (area flow only)
  |
  +-- Flow Type?
       |
       +-- AREA FLOW ─────────────────────────────────+
       |                                               |
       |   orderService.placeAreaOrder({               |
       |     sessionId, areaId, guestName,             |
       |     items: QueueItem[], paymentType: 'cash'   |
       |   })                                          |
       |                                               |
       |   API: POST /ordering-session/session/        |
       |        area-single-order                      |
       |                                               |
       +── SPACE FLOW ────────────────────────────────+
       |                                               |
       |   CartContext.confirmOrder('cash')             |
       |     |                                         |
       |     +-- orderService.confirmOrder(sessionId, {|
       |           sessionUserId, paymentType: 'cash'  |
       |         })                                    |
       |                                               |
       |     API: POST /ordering-session/session/      |
       |          {sessionId}/queue/confirm             |
       |                                               |
       |     +-- Stores order locally:                 |
       |         localStorage['morsel_order_{orderId}']|
       |                                               |
       +───────────────────────────────────────────────+
       |
       +-- Post-Placement (both flows):
             |
             1. setActiveOrderId(orderId)
             2. refreshSessionData()  [non-blocking]
             3. router.push('/orders?orderId={orderId}')
             4. clearCart()
             5. Clear: kitchen note, tip
```

### Queue Sync Detail (Space Flow)

```
Queue must be synced BEFORE confirmOrder() is called.
Queue syncs happen automatically on every cart change.

syncQueueWithAPI()  (CartContext)
  |
  +-- Filter: only current user's items
  +-- Convert CartItem[] --> QueueItem[]
  +-- API: POST /ordering-session/session/{sessionId}/queue
        Payload: { sessionUserId, items: QueueItem[] }
```

---

## Phase 3: Orders Page (Post-Order)

### Data Loading

```
/orders (src/app/orders/page.tsx)
  |
  +-- useOrdersPageState()  (src/hooks/useOrdersPageState.ts)
       |
       +-- Step 1: Load Cached Order
       |     localStorage['morsel_order_{orderId}']
       |     --> Immediate display (fast UX)
       |
       +-- Step 2: Session data from SessionContext polling (10s)
       |     GET /ordering-session/session/{sessionId}
       |     --> participants, orders, splits, splitConfig, timezone, currency
       |
       +-- Step 3: Bill polling (30s) — bill-specific, no session data
       |     GET /ordering-session/session/{sessionId}/bill
       |     --> SessionBill { subtotal, taxes, charges, tip, discount, total }
       |
       +-- Step 4: Order merging
             mergeOrders(orders, latestOrderId) → single APIOrder
```

---

## Phase 4: PostOrderView Display

```
PostOrderView (src/components/order/PostOrderView.tsx)
  |
  +-- Contexts:
  |     useSession()  --> sessionData, splitPaymentStatus, isParticipantPaid
  |     useSplit()    --> split (mode, participants, shares)
  |     useLocale()   --> formatPrice
  |     useFlowType() --> 'area' | 'space'
  |
  +-- Display Sections:
  |     1. "PREPARING" Badge (120s countdown)
  |     2. Order Items (images, dietary symbols, addons)
  |     3. Kitchen Note
  |     4. Tip Selector → syncs to server via POST /tip/participant
  |     5. Participants Card (split mode, shares, paid badges)
  |     6. Bill Section (subtotal, taxes, charges, tip, grand total)
  |     7. [Pay Now] Button (shows user's split share + their tip)
```

---

## Phase 4a: Money Calculation (CRITICAL — Tip Double-Pay Prevention)

```
PROBLEM: bill.total from server INCLUDES all participant tips (totalTip).
If we split bill.total and then add local tip, tip is counted twice.

SOLUTION: Split on tip-free base, each participant adds only their own tip.

┌─────────────────────────────────────────────────────────────┐
│                    SERVER BILL RESPONSE                      │
│                                                             │
│  bill.subtotal    = Rs 194.99  (items only)                 │
│  bill.totalTax    = Rs  98.47  (all taxes)                  │
│  bill.totalCharges= Rs  48.75  (service, state, etc.)       │
│  bill.totalTip    = Rs  39.00  (ALL participants' tips)     │
│  bill.totalDiscount= Rs  0.00                               │
│  bill.total       = Rs 381.21  (includes tips!)             │
│                                                             │
│  billTotalWithoutTip = bill.total - bill.totalTip           │
│                      = Rs 381.21 - Rs 39.00                 │
│                      = Rs 342.21  ← used for split base     │
└─────────────────────────────────────────────────────────────┘

PER-PARTICIPANT CALCULATION:
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  billTotalWithoutTip = bill.total - bill.totalTip           │
│                                                             │
│  userAmount (split share):                                  │
│    hasValidShares?                                          │
│      YES → split.shares[currentUser.id]                     │
│      NO  → billTotalWithoutTip / participants.length        │
│                                                             │
│  tipAmount = LOCAL tip (from this participant only)          │
│                                                             │
│  totalWithTip = userAmount + tipAmount  ← Pay Now amount    │
│                                                             │
│  EXAMPLE (2 participants, even split):                      │
│    billTotalWithoutTip = Rs 342.21                          │
│    A's userAmount = Rs 171.11                               │
│    A's tipAmount  = Rs 19.50 (A's own tip)                  │
│    A's Pay Now    = Rs 190.61                               │
│    B's userAmount = Rs 171.10                               │
│    B's tipAmount  = Rs 19.50 (B's own tip)                  │
│    B's Pay Now    = Rs 190.60                               │
│    Total collected = Rs 381.21 ✓ (matches bill.total)       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

BILL SECTION DISPLAY (per participant):
  Items total ........ bill.subtotal    (Rs 194.99)
  CGST (15%) ......... bill.taxes[x]    (Rs 29.25)
  GG (23%) ........... bill.taxes[y]    (Rs 44.85)
  Service charge ..... bill.charges[z]  (Rs 19.50)
  Tip ................ tipAmount        (Rs 19.50 — LOCAL, their own)
  ─────────────────────────────────
  Grand total ........ billTotalWithoutTip + tipAmount
                       (NOT bill.total + tipAmount — that would double-count)
```

### Split Share Calculation Priority

```
userAmount calculation (PostOrderView):
  |
  +-- No participants? → billTotalWithoutTip (solo, full bill minus tips)
  |
  +-- hasValidShares? (at least one participant has share > 0)
  |     |
  |     +-- YES + splitForTotal matches → split.shares[currentUser.id]
  |     |     (even if share is 0 — e.g. itemized where other paid all)
  |     |
  |     +-- NO → even split: billTotalWithoutTip / participants.length
  |
  +-- Then: totalWithTip = userAmount + LOCAL tipAmount
```

---

## Phase 4b: Tip Flow

```
TIP API ENDPOINTS:
  POST   /session/{id}/tip/participant  → { sessionUserId, tip }  (add/update)
  DELETE /session/{id}/tip/participant  → { sessionUserId }        (remove)
  GET    /session/{id}/tips             → { tips[], totalTipAmount }

FLOW:
  User taps "10%"
    |
    1. IMMEDIATE: setInStorage('morsel_tip', { percentage: 10, amount: X })
    2. IMMEDIATE: onTipChange({ percentage: 10, amount: X }) → parent updates
    3. DEBOUNCED (500ms): POST /tip/participant { sessionUserId, tip: X }
    |     → Server stores this participant's tip
    |     → Next bill poll (30s) reflects updated totalTipAmount
    |     → bill.total will include new tip, but we subtract bill.totalTip

  User taps "0%"
    |
    1. IMMEDIATE: localStorage + parent update
    2. DEBOUNCED (500ms): DELETE /tip/participant { sessionUserId }
    |     → Server removes this participant's tip

  Other participant:
    |
    → Bill polling (30s) returns updated bill.totalTip / bill.total
    → Their own tip is independent (each manages their own)
    → billTotalWithoutTip recalculated on each bill poll
    → Split shares unchanged (tip doesn't affect split base)
```

---

## Phase 5: Payment

### Payment Trigger

```
[User clicks "Pay Now"]
  |
  handlePayNow()  (PostOrderView)
  |
  +-- setIsProcessingPayment(true)
  +-- await simulate(1500ms)
  +-- onPaymentResult('success', totalWithTip, tipAmount)
        |
        Calls back to orders/page.tsx:
          setPaymentResult('success')
          setPaymentAmount(totalWithTip)
          setPaymentTip(tipAmount)
```

### Payment Result Rendering

```
orders/page.tsx
  |
  +-- paymentResult !== null?
       |
       +-- YES: Render PaymentResultView (replaces entire page)
       +-- NO:  Render Header + PostOrderView + Footer
```

---

## Phase 6: Payment Result Screen

```
PaymentResultView (src/components/order/PaymentResultView.tsx)
  |
  +-- Uses same <Header> component as orders page
  +-- Same content layout: max-w-2xl mx-auto p-4 px-4
  +-- Same bill rendering pattern as PostOrderView
  |
  +-- Determines variant:
  |     allPaid = splitPaymentStatus.every(s => s.paid)
  |
  |     SUCCESS + partial → Red banner + Google Reviews + Participants + Bill
  |     SUCCESS + allPaid → Red banner + Google Reviews + Participants (no bill)
  |     FAILURE           → Red banner + Bill + Participants + Retry CTA
  |
  +-- Participants Card:
  |     Paid → avatar 40% opacity, "Paid" overlay, amount strikethrough
  |     Unpaid → normal avatar, normal amount
  |
  +-- Bottom CTA:
        Success → "Get Receipt" (stub)
        Failure → "Retry Payment" → setPaymentResult(null) → back to PostOrderView

  "Back to Menu" (via Header):
    → endSession('completed')
    → clearSession() (all localStorage keys)
    → router.push('/menu')
```

---

## Split Sync Flow (Cross-Participant)

```
PARTICIPANT A saves split
  |
  1. SplitSettingsModal.handleSave()
  |    setSplitMode() + updateShare() × N → SplitContext updated
  |    setSplitForTotal() → SplitContext updated
  |    setInStorage('morsel_split') → localStorage
  |
  2. syncSplitToServer(sessionId, mode, shares, participants)
  |    POST /session/{id}/split
  |    Payload: { type, numberOfSplits, amounts, itemIds }
  |    → Server stores splitConfig + calculates splits[]
  |
  3. refreshSessionData() (on POST success)
  |    GET /session/{id}
  |    → Updates splitPaymentStatus + serverSplitConfig in SessionContext
  |
  4. SplitContext hydration effect triggers
  |    Maps server splits[].amount → split.shares by participant index
  |    Updates mode from serverSplitConfig.type
  |    → A's screen shows server-calculated values

PARTICIPANT B (within 10s polling cycle)
  |
  5. SessionContext.pollParticipants() [every 10s]
  |    GET /session/{id}
  |    → splitPaymentStatus + serverSplitConfig updated
  |
  6. SplitContext hydration effect triggers on B's device
  |    Same index-based mapping
  |    → B's screen shows same mode + shares as A

  CONFLICT: Last-write-wins. Whoever saves last, their config replaces.
  LATENCY: A sees immediately, B sees within 10s.
```

### Split Hydration Detail

```
SplitContext hydration effect watches: [serverSplitConfig, splitPaymentStatus]
  |
  +-- Guard: skip if no config or no splits or no participants
  |
  +-- Map server type → local mode:
  |     'equal' → 'even', 'participant' → 'self',
  |     'custom' → 'custom', 'itemized' → 'items'
  |
  +-- Map splits to shares by INDEX (sessionUserId may be null):
  |     sorted by splits[].index
  |     splits[0].amount → participants[0].id
  |     splits[1].amount → participants[1].id
  |
  +-- Dedup: skip setState if mode + all shares already match
  +-- Update: { mode, shares, splitForTotal, isValid }
```

### Itemized Split (Item-Claim Model)

```
Participant A opens ItemizedPickerSheet
  |
  +-- Fetches session detail (items from all orders)
  +-- Shows all items with quantity steppers
  +-- Items claimed by others shown as locked (via claimedByOthers)
  |
  A picks items → handleConfirm()
  |
  +-- A's share = selectedTotal (items + pro-rata tax/charges)
  +-- Other participants WITH existing claims → keep their share
  +-- Other participants WITHOUT claims → (total - claimed) / count
  |
  +-- setItemizedSelection(A.id, itemIds) → localStorage
  +-- syncSplitToServer() → POST /split with flat itemIds + amounts
  |
  Participant B opens picker later
  |
  +-- claimedByOthers computed from itemizedSelections
  +-- A's items shown as locked
  +-- B picks from remaining → same flow
```

---

## Data Sync Architecture

```
SINGLE SOURCE OF TRUTH: Server (polled, not Firebase for session data)

┌──────────────────────────────────────────────────────────────┐
│                    POLLING ARCHITECTURE                       │
│                                                              │
│  SessionContext    every 10s   GET /session/{id}              │
│    → participants, splits, splitConfig, orders                │
│    → timezone, currency                                      │
│    → Consumers: SplitContext, ParticipantsList, PostOrderView │
│                                                              │
│  useOrdersPageState every 30s  GET /session/{id}/bill        │
│    → SessionBill (taxes, charges, tips, total)               │
│    → Bill-only, no session data (handled by SessionContext)   │
│                                                              │
│  CartContext       every 15s   Firebase orderQueue            │
│    → Shared cart items across participants                    │
│    → Falls back to polling if Firebase unavailable            │
│                                                              │
│  TipSelector       on change   POST/DELETE /tip/participant   │
│    → Per-participant tip (debounced 500ms)                    │
│    → Reflected in next bill poll (30s)                        │
│                                                              │
│  TOTAL API CALLS: ~9/min (6 session + 2 bill + 1 cart)       │
└──────────────────────────────────────────────────────────────┘

TODO: Switch SessionContext to Firebase Realtime DB when it includes
split data. ParticipantsList already reads from SessionContext (no
separate polling). CartContext still uses Firebase independently.
```

---

## API Endpoints Summary

```
ENDPOINT                                          METHOD  WHEN CALLED
──────────────────────────────────────────────────────────────────────────
SESSION
/ordering-session/space/{spaceId}                 GET     QR scan
/ordering-session/start                           POST    Join session
/ordering-session/session/{sessionId}             GET     Polling (10s)
/ordering-session/session/{sessionId}/end         PUT     End session

ORDERS
/ordering-session/session/{sessionId}/queue       POST    Cart item sync
/ordering-session/session/{sessionId}/queue/confirm POST  Place order
/ordering-session/session/area-single-order       POST    Place order (area)

BILL
/ordering-session/session/{sessionId}/bill        GET     Bill polling (30s)

SPLIT
/ordering-session/session/{sessionId}/split       POST    Save split config
/ordering-session/session/{sessionId}/split/{i}/pay PUT   Mark paid (business)

TIP
/ordering-session/session/{sessionId}/tip/participant POST   Add/update tip
/ordering-session/session/{sessionId}/tip/participant DELETE Remove tip
/ordering-session/session/{sessionId}/tips            GET    Get all tips

MENU
/business/menus/active/{businessId}               GET     Load menu
/items/business/{businessId}                      GET     Load items
```

---

## Context Dependency Map

```
                    +──────────────────+
                    |   LocaleContext   |
                    | formatPrice()    |
                    | setLocale()      |
                    +────────+─────────+
                             |
              +--------------+--------------+
              |              |              |
     +--------v──────+ +────v────────+ +───v───────────+
     | SessionContext | | CartContext  | | SplitContext   |
     |               | |             | |                |
     | sessionData   | | cart        | | split (mode,   |
     | splitPayment  | | addItem()   | |   shares,      |
     |   Status      | | removeItem()| |   participants)|
     | serverSplit   | | confirmOrder| | syncToServer() |
     |   Config      | | clearCart() | | hydration from |
     | isParticipant | | syncQueue() | |   server       |
     |   Paid()      | |             | |                |
     | pollParticip- | | Firebase +  | | Reads from     |
     |   ants (10s)  | | poll (15s)  | |  SessionContext |
     | refreshData() | |             | |                |
     | endSession()  | |             | |                |
     +───────+───────+ +──────+──────+ +───────+────────+
             |                |                 |
             +────────────────+─────────────────+
                              |
                    +---------v──────────+
                    |    OrderContext     |
                    |  (legacy wrapper)  |
                    +────────────────────+
```

---

## localStorage Keys Reference

```
KEY                              TYPE              LIFECYCLE
──────────────────────────────────────────────────────────────────────
morsel_session_data              OrderingSessionData  Join → End session
morsel_session_user_id           string               Join → End session
morsel_active_order_id           string | null         Order placed → New order
morsel_customer_name             string               Login → End session
morsel_dining_type               string               Login → End session
morsel_auth_method               string               Login → End session
morsel_flow_type                 'area' | 'space'     QR scan → End session
morsel_area_id                   string               Area flow → End session
morsel_restaurant_context        object               QR scan → End session

morsel_cart                      Cart                 Items added → clearCart()
morsel_kitchen_note              string               Entered → Order placed
morsel_tip                       {%,amount}           Selected → Synced to server
morsel_order_{orderId}           APIOrder + metadata  Order confirmed → Persisted

morsel_split                     SplitBill            Split configured → End session
morsel_itemized_selections       Record<id,ids[]>     Itemized picker → End session
```
