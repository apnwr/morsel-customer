# Post-Order View — Full Redesign Plan

## Figma Reference
https://www.figma.com/design/VjyQKw6hqVAPnNYp9tIhkO/Morsel?node-id=2078-32033

## Overview
Redesigning `PostOrderView` to match the Figma design. The post-order screen is shown after an order is confirmed. It lives at `/cart?orderId=xxx` and renders inside `src/components/order/PostOrderView.tsx`.

## Figma Design Sections (top to bottom)
1. Header — morsel logo + "Order - XXXXX" + hamburger
2. Order status banner — chef emoji + preparation text + description
3. Edit + Timer — edit pill + countdown timer in black pill
4. Order Summary — compact item rows with addons
5. Split card — dark card with avatars, amounts, split mode, change button
6. Bill — line-item breakdown + grand total
7. Tip selector — 20%/10%/0%/Custom Tip
8. Footer — "Powered by morsel"
9. Pay Now bar — sticky bottom, "Pay Now" + amount

---

## Steps

### Step 1: Header — "Order - XXXXX" center label [DONE]
Show the order ID (last 5 chars, uppercased) in the header center instead of "Cart" when in post-order state.

- Added `orderDisplayLabel` to `useCartPageState` — computed as `"Order - ${activeOrderId.slice(-5).toUpperCase()}"`
- Added `centerLabel` prop to `Header` component — when provided, renders label instead of "Cart" text or cart pill
- `cart/page.tsx` passes `centerLabel={orderDisplayLabel}` when `pageState === 'post-order'`

**Files changed:**
- `src/hooks/useCartPageState.ts`
- `src/components/layout/Header.tsx`
- `src/app/cart/page.tsx`

---

### Step 2: Order Summary — compact item rows + addon details [DONE]
Replaced white card item blocks with compact Figma-matching rows.

**Before:** White card blocks (`bg-white rounded-lg p-4`), 60px images, dietary icon above name, no addons shown.

**After:**
- No card background, items in a `flex flex-col gap-[15px]`
- 47px rounded thumbnail (`rounded-[12px]`)
- Dietary icon inline next to image
- Name: Lato Bold 14px
- Price: Helvetica Neue Medium 14px, opacity-50
- Addon selected options rendered below each item as text (e.g. "Extra spicy")

**File changed:** `src/components/order/PostOrderView.tsx`

---

### Step 3: Kitchen note — PRE-ORDER ONLY [NO CHANGE]
Kitchen note ("Add a note to kitchen") only exists in `PreOrderView` as local React state. It is not persisted or sent to the API. No changes needed for PostOrderView.

---

### Hide status section when timer ends [DONE]
Wrapped the order status banner + edit/timer section in `{remainingTime > 0 && (...)}`. When the 120-second countdown reaches 0, the entire status section disappears.

**File changed:** `src/components/order/PostOrderView.tsx`

---

### Step 4: Split section — dark card redesign [PENDING]
Replace current "Running Tabs" individual horizontal cards with Figma's single dark card.

**Current:** "Running Tabs" heading + split mode button at top + individual rounded cards per participant (border, initials avatar, name, amount).

**Figma target:** Single dark card (`bg-[#1a1a1a]`, `border-3 border-[#0c0c0c]`, `rounded-[30px]`) containing avatars, amounts, split label, change button, and description.

#### Sub-parts:

**4a: Dark card container**
- Replace "Running Tabs" heading + individual participant cards with a single dark wrapper
- `bg-[#1a1a1a] border-3 border-[#0c0c0c] rounded-[30px] px-5 py-5`
- Condition stays: only render when `split.participants.length >= 2`

**4b: Horizontal avatar row**
- Inside card: horizontal `flex gap-5` row of participants
- Each participant block: avatar circle (50px), name below (Lato Regular 12px, white, opacity-60), amount below (Lato Black 18px, white)
- Current user labeled "You", others show their name

**4c: Split mode label + Change pill**
- Below avatars: "Split evenly" text (Lato Bold 20px, white)
- Inline "Change" pill (`bg-[#343434] rounded-[20px] px-2 py-1`) with settings icon + "Change" text (Helvetica Neue Bold 12px, white, opacity-80)
- Change button opens `SplitSettingsModal` via existing `handleOpenSplitModal`

**4d: Description text**
- Below label: "The bill is going to be split evenly, click on this card to change these settings."
- Lato Regular 10px, white, opacity-80, tracking-[0.2px]

**4e: Real-time reactivity**
- No new wiring needed — SplitContext already updates from Firebase real-time listener / polling fallback
- Data flow: `Firebase/API -> SessionContext -> ParticipantsList -> SplitContext -> PostOrderView`
- The new UI reads from the same `split.participants` and `split.shares`

**File to change:** `src/components/order/PostOrderView.tsx`

---

### Step 5: Bill section — add to PostOrderView [PENDING]
**Current:** Not in PostOrderView. Only a payment card with avatar + "Pay now" button exists.

**Figma target:** Full bill breakdown — Items total, Taxes, Delivery charge, Restaurant Packing fees, Grand total.

**Problem:** Existing `BillSection` component reads from `useCart()` (cart context), but the cart is cleared after order placement. Post-order needs to read from `orderData`.

**Approach:** Create a standalone bill display in PostOrderView that reads from `orderData` directly. The order has `total` and per-item `itemTotal`. Taxes/delivery/packing fees shown as $0.00 (matching current BillSection behavior — these aren't implemented in the backend yet).

**File to change:** `src/components/order/PostOrderView.tsx`

---

### Step 6: Tip selector — add to PostOrderView [PENDING]
**Current:** `TipSelector` exists as a local function inside `PreOrderView`. Not available in PostOrderView.

**Approach:** Extract `TipSelector` into a shared component, then import in both views.

**Files to change:**
- `src/components/cart/TipSelector.tsx` — new file (extracted from PreOrderView)
- `src/components/cart/PreOrderView.tsx` — import shared TipSelector instead of local function
- `src/components/order/PostOrderView.tsx` — import and render TipSelector

---

### Step 7: Pay Now sticky footer [PENDING]
**Current:** Payment card with avatar circle + "Pay now" button inside a white bordered card. Separate "Browse Menu" CTA below.

**Figma target:** Sticky black bar at bottom — "Pay Now" on left, "$ amount" on right. Same pattern as PreOrderView's "Place Order" bar.

**Approach:** Replace the payment card + browse menu CTA with a fixed bottom bar:
- `fixed left-0 right-0 bottom-0 z-20 rounded-t-[30px]`
- `bg-black h-[70px] flex items-center justify-between px-[22px]`
- "Pay Now" left (Helvetica Neue Bold 20px, white), "$ XX.XX" right
- Click triggers existing `handlePayNow`

**File to change:** `src/components/order/PostOrderView.tsx`

---

### Step 8: Cleanup [PENDING]
- Remove old payment card section from PostOrderView
- Remove "Browse Menu" CTA button (replaced by Pay Now bar)
- Remove unused imports/variables
- Delete `src/app/success/page.tsx` and `src/app/failure/page.tsx` (from earlier plan, superseded by this Figma-based redesign)

**Files to change:**
- `src/components/order/PostOrderView.tsx`
- `src/app/success/page.tsx` (delete)
- `src/app/failure/page.tsx` (delete)

---

## Key Files Reference

| File | Role |
|------|------|
| `src/components/order/PostOrderView.tsx` | Main file — most changes here |
| `src/hooks/useCartPageState.ts` | Order display label, page state |
| `src/components/layout/Header.tsx` | Center label prop |
| `src/app/cart/page.tsx` | Passes props to Header |
| `src/contexts/SplitContext.tsx` | Split state (participants, shares, mode) |
| `src/contexts/SessionContext.tsx` | Session data, Firebase real-time sync |
| `src/components/cart/BillSection.tsx` | Reference for bill layout (reads from cart) |
| `src/components/cart/PreOrderView.tsx` | TipSelector source |
| `src/components/order/SplitSettingsModal.tsx` | Split settings modal (reused as-is) |
| `src/lib/split-utils.ts` | `isSplitApplicableForTotal` validation |

## Data Flow (Split + Real-time)
```
Firebase Realtime DB / Polling fallback (10s)
  -> SessionContext (participants update)
  -> ParticipantsList (syncs API participants)
  -> SplitContext (updates participants + recalculates shares)
  -> PostOrderView (reads split.participants, split.shares, split.mode)
```

## Verification (per step)
- `npx next build` passes after each step
- Visual check on `/cart?orderId=xxx` in browser
- Pre-order view (`/cart` with no order) still works unchanged
- Split section updates when participants join (real-time)
- Timer reaching 0 hides the status section
