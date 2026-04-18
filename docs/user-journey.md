# User Journey

Complete flow from QR scan to payment in the morsel-customer app.

---

## Phase 1: QR Scan → Login

### Home (`/`)
- Branding page with "Scan QR code from your table" prompt
- If active session exists in localStorage → auto-redirects to `/menu`

### Space Page (`/space/{spaceId}`)
- URL comes from QR code on the table
- Calls `GET /ordering-session/space/{spaceId}` → receives space, business, and existing session (if any)
- Stores result as **preview session** (ephemeral, not persisted)
- Shows restaurant logo, business name, table info, participant count
- Opens **LoginModal** bottom sheet

### LoginModal
- Name input only
- On "Continue as Guest":
  1. Calls `POST /ordering-session/start` with `{ spaceId, guestName }`
  2. Backend either creates a new session or joins existing active session for that space
  3. Extracts `sessionUserId` from returned participants array
  4. Persists to localStorage:
     - `morsel_session_data` — full session object
     - `morsel_session_user_id` — current user's UUID
     - `morsel_customer_name` — guest name
  5. Sets RestaurantContext + SessionContext
  6. Navigates to `/menu` (replace, prevents back button issues)

### Login Guard (`/login`)
- Safety redirect: active session → `/menu`, preview session → `/space/{spaceId}`, nothing → `/`

---

## Phase 2: Menu Browsing (`/menu`)

### Page Load
- Guards: `useRequireRestaurantContext()` + `useSessionValidation()`
- Fetches menus: `GET /business/menus/active/{businessId}`
- Two rendering paths:
  - **Sections flow**: Menu → Sections → Items (if menu has active sections)
  - **Direct items flow**: Menu → Items (flat list)
- Menu availability check (feature-toggled, currently off)
- Real-time Firebase listener for participants

### Adding an Item
1. Tap item → opens **CustomizationModal**
2. Modal shows: image, description, allergens, dietary info, price
3. Customization options:
   - **Variants** (radio, required) — replaces base price
   - **Add-ons** (checkbox/radio) — additive pricing
   - **Spice level** (if enabled)
   - Quantity selector
4. "Add to Cart" →
   - `CartContext.addItem()` — stores item tagged with `sessionUserId`
   - Syncs to API: `POST /ordering-session/session/{sessionId}/queue`
   - Only syncs current user's items (prevents overwriting others)
   - Firebase broadcasts update to all participants

### Search
- Prefix-based search across all items
- Deferred value for responsive typing
- Shows "No items found" empty state when no matches

---

## Phase 3: Cart & Order Placement (`/cart`)

### Pre-Order View (cart has items, no order placed yet)

| Section | Description |
|---------|-------------|
| Order banner | "View Ordered Items →" link (if previous orders exist) |
| Bill card | Subtotal, taxes, fees, grand total, "My Share" |
| Participants card | Avatars with split amounts, split mode label, "Change" button |
| Cart items | **My Items** section + **Others' Items** grouped by participant |
| Kitchen note | Optional text input, persists to localStorage |
| Tip selector | 0%, 10%, 20% presets + custom |
| Place Order button | Fixed bottom bar |

### Item Controls
- Quantity +/- buttons (own items only)
- Delete with confirmation modal
- Others' items shown read-only with participant badge

### Place Order Flow
1. Final cart sync → `POST /session/{sessionId}/queue`
2. Confirm order → `POST /session/{sessionId}/queue/confirm` with `{ sessionUserId, paymentType }`
3. Backend creates Order from queue, sets status to confirmed
4. Cart cleared, order stored locally with timestamp
5. View switches to Post-Order

### Post-Order View (after order placed)
- **OrderTabs**: switch between multiple orders
- **Status banner**: countdown timer + current status (pending → confirmed → preparing → ready → completed)
- **Order items list**: read-only
- **Actions**: "Order More Food" → `/menu`, "View my tab / Pay Now" → `/my-tab`

---

## Phase 4: Bill Splitting & Payment (`/my-tab`)

### Split Modes (managed by SplitContext)

| Mode | Logic |
|------|-------|
| **Even** (default) | Total ÷ participants |
| **Pay for Self** | Current user pays own items total, remainder split evenly among others |
| **Pay for Everyone** | Current user pays full bill, others $0 |
| **Custom** | Manual amounts per participant, validated to sum to total |

### Page Layout
- Table label (e.g. "Table 5")
- ParticipantsList dark card with avatars, amounts, split mode
- SplitSettingsModal for changing mode
- Browse menu button → `/menu`
- Fixed "Pay Now" bar with user's owed amount

### Payment Flow
1. "Pay Now" → PaymentModal (method selection)
2. Calls `PUT /ordering-session/session/{sessionId}/end` with `{ sessionUserId, reason: 'completed' }`
3. Clears all localStorage keys
4. Redirects to `/`

---

## Session Lifecycle

```
User scans QR → Preview Session (ephemeral)
     ↓
User joins → Active Session (persisted)
     ↓
User orders → Orders created within session
     ↓
User pays → Session ended (completed)
     ↓
All local data cleared → Back to home
```

### Session States
- **active** — ordering in progress
- **completed** — payment done, session ended
- **expired** — 4-hour timeout (default)
- **cancelled** — manually ended

---

## Multi-Participant Ordering

- Multiple customers scan the same table's QR → join the same session
- Each adds items independently, tagged with their `sessionUserId`
- Cart shows "My Items" vs "Others' Items" with participant badges
- Real-time sync via Firebase (or polling fallback)
- Only own items are editable
- Bill split calculated across all participants

---

## Real-Time Sync

| Data | Firebase Listener | Polling Fallback |
|------|-------------------|------------------|
| Session info + participants + timezone | `subscribeToSessionInfo` (60s full node) | `getSessionById()` every 10s |
| Order queue (cart items) | `subscribeToOrderQueue` | `getSessionById()` every 15s |
| Participants (bill split UI) | `subscribeToParticipantsBySpace` | `getSessionById()` every 10s |

---

## Route Map

| Route | Purpose | Guards |
|-------|---------|--------|
| `/` | Home — QR scan prompt | Redirects if active session |
| `/space/[spaceId]` | QR result + login | Redirects if active session |
| `/login` | Redirect safety guard | Based on session state |
| `/menu` | Browse menu, add items | RestaurantContext + SessionValidation |
| `/cart` | Cart, place order, track orders | SessionValidation |
| `/my-tab` | Bill splitting + payment | SessionValidation |
| `/order-status/[orderId]` | Legacy redirect → `/cart` | None |

---

## Context Provider Hierarchy

```
FirebaseAuthProvider
  └─ LocaleProvider (currency, timezone)
    └─ SessionProvider (session, participants, real-time sync)
      └─ RestaurantProvider (business, branch, space info)
        └─ ThemeProvider
          └─ CartProvider (cart items, queue sync)
            └─ OrderProvider (order timer state)
              └─ SplitProvider (bill split calculation)
```

---

## localStorage Keys

| Key | Contents | Set When |
|-----|----------|----------|
| `morsel_session_data` | Full session object | User joins session |
| `morsel_session_user_id` | Current user's UUID | User joins session |
| `morsel_customer_name` | Guest name | Login |
| `morsel_auth_method` | guest / google / apple | Login |
| `morsel_restaurant_context` | Business, branch, space info | Login |
| `morsel_cart` | Cart items array | Item added/removed |
| `morsel_active_order_id` | Currently viewed order tab | Order placed |
| `morsel_order_{orderId}` | Individual order details | Order placed |
| `morsel_split` | Split mode + shares | Split changed |
| `morsel_kitchen_note` | Kitchen instructions text | User types note |
| `morsel_menu_items_cache` | Menu items with customOptions | Menu loaded |
