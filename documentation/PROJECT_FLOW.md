# MORSEL Customer - Project Flow Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Application Flow](#application-flow)
5. [API Reference](#api-reference)
6. [State Management](#state-management)
7. [Routing Structure](#routing-structure)
8. [Key Components](#key-components)
9. [Services Layer](#services-layer)
10. [Custom Hooks](#custom-hooks)
11. [Data Types & Models](#data-types--models)
12. [Real-Time Synchronization](#real-time-synchronization)
13. [LocalStorage Keys](#localstorage-keys)
14. [Environment Variables](#environment-variables)

---

## Project Overview

**MORSEL Customer** is a modern food ordering application for restaurant customers. The tagline "Enjoy every meal, not the math" captures its focus on simplifying restaurant ordering and bill splitting.

### Key Features
- QR code-based table/space identification
- Multi-participant shared ordering session
- Real-time cart synchronization across participants
- Menu browsing with customization options (variants, add-ons, spice levels)
- Bill splitting (even, pay-for-self, pay-for-all, custom)
- Order tracking with real-time status updates

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.0.8 | App Router, client-side components |
| React | 19.2.0 | UI framework |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 4 | Styling |
| Firebase | - | Real-time database & anonymous auth |
| Framer Motion | 12.23.24 | Animations |
| Lucide React | - | Icons |

---

## Project Structure

```
src/
├── app/                          # Next.js App Router (routes)
│   ├── page.tsx                  # Home page (QR scan prompt)
│   ├── layout.tsx                # Root layout with context providers
│   ├── space/[spaceId]/          # QR scan result + LoginModal
│   ├── login/                    # Redirect guard (legacy)
│   ├── menu/                     # Browse menu & add items to cart
│   ├── cart/                     # View cart & pre-order view
│   ├── order-summary/            # Order summary & payment
│   ├── order-status/             # Order tracking
│   ├── my-tab/                   # View personal tab & split bill
│   └── globals.css               # Global Tailwind styles
│
├── components/
│   ├── layout/                   # Header, ThemeProvider, DebugPanel
│   ├── menu/                     # MenuAccordion, MenuItem, SearchBar
│   ├── cart/                     # PreOrderView, CartItems
│   ├── order/                    # Customization, Payment, PostOrder modals
│   ├── session/                  # LoginModal, OrderTabs, participant management
│   ├── ui/                       # Button, Badge, Avatar, Modal, etc.
│   └── providers/                # FirebaseAuthProvider
│
├── contexts/                     # React Context API state management
│   ├── SessionContext.tsx        # Ordering session & participants
│   ├── CartContext.tsx           # Shared cart with sync logic
│   ├── RestaurantContext.tsx     # Restaurant/space info
│   ├── OrderContext.tsx          # Order placement & timer
│   ├── SplitContext.tsx          # Bill splitting logic
│   └── index.ts                  # Re-exports
│
├── services/                     # API service layer
│   ├── session.service.ts        # Session CRUD operations
│   ├── order.service.ts          # Queue & order confirmation
│   └── menu.service.ts           # Menu & items fetching
│
├── lib/
│   ├── api/
│   │   ├── client.ts             # HTTP client with error handling
│   │   └── endpoints.ts          # Centralized API endpoints
│   ├── firebase/
│   │   ├── config.ts             # Firebase initialization
│   │   ├── realtime.service.ts   # Real-time DB listeners
│   │   └── index.ts              # Exports
│   ├── validation.ts             # Input validation helpers
│   ├── split-utils.ts            # Bill split calculations
│   ├── order-mapping.ts          # Type transformations
│   ├── config.ts                 # App configuration
│   └── utils.ts                  # Utility functions
│
├── hooks/                        # Custom React hooks
│   ├── useSessionValidation.ts   # Check session active & not expired
│   ├── useNavigationGuard.ts     # Redirect if missing context
│   ├── useCartPageState.ts       # Unified cart page logic
│   └── useTimerSync.ts           # Timer synchronization
│
├── types/
│   ├── api/                      # API response types
│   │   ├── session.ts            # Session, participant, space types
│   │   ├── order.ts              # Order, queue item types
│   │   └── menu.ts               # Menu, item types
│   ├── menu.ts                   # MenuItem, CustomOption types
│   ├── cart.ts                   # Cart, CartItem types
│   ├── order.ts                  # Order state types
│   ├── restaurant.ts             # Restaurant context types
│   └── index.ts                  # Re-exports
│
├── mocks/                        # Mock data for development
│   ├── menuData.ts               # Mock menu structure
│   ├── mockOrders.ts             # Mock order generation
│   ├── mockStorage.ts            # localStorage wrapper
│   └── mockSplit.ts              # Mock participant generation
│
└── public/                       # Static assets (images, icons)
```

---

## Application Flow

### Complete User Journey Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER JOURNEY                                   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────┐
│   HOME (/)  │  "Scan QR code to start"
└──────┬──────┘
       │ User scans QR code
       ↓
┌──────────────────────────────────────────────────────────────┐
│ SPACE (/space/[spaceId])                                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Shows restaurant info + LoginModal (bottom sheet)     │  │
│  │  - Enter name, select dining type                      │  │
│  │  - "Continue as Guest" button                          │  │
│  └────────────────────────────────────────────────────────┘  │
│  → GET /ordering-session/space/{spaceId}                     │
│  → POST /ordering-session/start (on submit)                  │
└──────┬───────────────────────────────────────────────────────┘
       │                       (Creates or joins existing session)
       ↓
┌──────────────────────────┐
│    MENU (/menu)          │  Browse menu, add items to cart
└──────┬───────────────────┘  → GET /business/menus/active/{businessId}
       │                       → POST /queue (sync cart)
       │                       ← Firebase real-time updates
       ↓
┌──────────────────────────┐
│    CART (/cart)          │  Review shared cart (all participants)
│  ┌────────────────────┐  │
│  │   PRE-ORDER VIEW   │  │  Shows items before order placed
│  └────────────────────┘  │
└──────┬───────────────────┘
       │ "Place Order"
       ↓ → POST /queue/confirm
┌──────────────────────────┐
│    CART (/cart)          │
│  ┌────────────────────┐  │
│  │  POST-ORDER VIEW   │  │  Shows order status & timer
│  └────────────────────┘  │  ← Firebase real-time status updates
└──────┬───────────────────┘
       │
       ├─→ "Order More Food" → back to /menu
       │
       ↓ "Pay Now"
┌──────────────────────────┐
│  MY TAB (/my-tab)        │  View personal tab, split bill
└──────┬───────────────────┘  Calculate split amounts
       │
       ↓ Complete Payment
┌──────────────────────────┐
│   SESSION ENDED          │  → PUT /session/{sessionId}/end
└──────────────────────────┘
```

---

### Phase 1: QR Code Scan → Login

**Route Flow**: `/` → `/space/[spaceId]` (with LoginModal) → `/menu`

> **Note**: Login is handled via a bottom-sheet modal on the space page to prevent
> back button issues where pressing back would show login again and create duplicate participants.

#### Step 1: Home Page (`/`)
- Displays animated "morsel" logo
- Shows QR code scan prompt
- If active session exists in localStorage, redirects to `/menu`

#### Step 2: Space Page with Login Modal (`/space/[spaceId]`)
```
User scans QR code
       ↓
App extracts spaceId from URL
       ↓
Check if user already has active session
  → If yes: redirect to /menu (handles back button case)
       ↓
API Call: GET /ordering-session/space/{spaceId}
       ↓
Returns: { space, business, session (if exists) }
       ↓
Sets preview session (ephemeral, NOT persisted)
       ↓
Shows restaurant/space info on page background
       ↓
Opens LoginModal (bottom sheet) with:
  - Name input field
  - Dining type toggle (dine-in/takeaway)
  - "Continue as Guest" button
       ↓
User enters name and clicks "Continue as Guest"
       ↓
API Call: POST /ordering-session/start
Payload: { spaceId, guestName }
       ↓
Backend logic:
  - If active session exists for space → joins it
  - Otherwise → creates new session
       ↓
Returns: Session with participants[] (including current user)
       ↓
Saves to localStorage:
  - morsel_session_data
  - morsel_session_user_id (critical for cart sync)
  - morsel_customer_name
  - morsel_dining_type
       ↓
Sets RestaurantContext from API data
       ↓
router.replace('/menu')  ← Uses replace to prevent back button issues
```

#### Login Page (`/login`) - Redirect Guard
The `/login` page now acts as a safety guard:
- If user has active session → redirects to `/menu`
- If user has preview session → redirects back to `/space/[spaceId]`
- If no session → redirects to `/` (home)

---

### Phase 2: Browsing Menu & Adding Items

**Route**: `/menu`

#### Menu Loading Flow
```
Page mounts
       ↓
Validate restaurant context (navigation guard)
       ↓
Validate session active & not expired
       ↓
API Call: GET /business/menus/active/{businessId}
       ↓
Process menus:
  - Direct items flow: Menu → Items
  - Sections flow: Menu → Sections → Items
       ↓
Display categorized menu items
       ↓
Enable search functionality
```

#### Adding Item to Cart Flow
```
User clicks menu item
       ↓
Opens CustomizationModal (lazy-loaded)
       ↓
Shows item details:
  - Name, price, image
  - Allergens, dietary info
  - Customization options:
    • Variants (radio select)
    • Add-ons (checkbox/radio)
    • Spice level (if enabled)
  - Quantity selector
       ↓
User clicks "Add to Cart"
       ↓
CartContext.addItem():
  1. Cache full menu item for later restoration
  2. Merge with existing identical item (if same itemId, no customizations)
  3. Tag item with sessionUserId
  4. Recalculate totals
       ↓
Sync with API: POST /session/{sessionId}/queue
Payload: { sessionUserId, items: QueueItem[] }
(Only syncs current user's items)
       ↓
Firebase listener notifies other participants
       ↓
Other participants' carts update in real-time
```

---

### Phase 3: Cart Review & Order Placement

**Route**: `/cart`

#### Pre-Order View (Cart exists, no order placed)
```
Display Participants Card (dark theme):
  - Participant avatars, names, split amounts (top)
  - Split mode label + "Change" button (bottom)
  - Description text explaining current split
  - Tapping card opens SplitSettingsModal
       ↓
Display shared cart items (all participants)
       ↓
Group items by participant
       ↓
User can modify own items:
  - Change quantity
  - Edit customizations
  - Remove items
       ↓
Each modification syncs to API
       ↓
Kitchen note input (optional)
       ↓
Bill section: Items total, Taxes, Delivery, Packing, Grand total, My Share
       ↓
Footer: "Powered by morsel" + legal text
       ↓
Fixed bottom bar: "Place Order" + amount + arrow
```

#### Order Placement Flow
```
User clicks "Place Order"
       ↓
Final cart sync to API
       ↓
API Call: POST /session/{sessionId}/queue/confirm
Payload: { sessionUserId, paymentType }
       ↓
CartContext:
  1. Clear cart
  2. Store order locally with timestamp
  3. Refresh session (get updated orders array)
       ↓
Switch to Post-Order View
```

#### Post-Order View
```
Display order confirmation
       ↓
Show order tracking timer
       ↓
Real-time status updates from Firebase:
  - pending → confirmed → preparing → ready → completed
       ↓
Options:
  - "Order More Food" → /menu
  - "Pay Now" → /my-tab
```

---

### Phase 4: Bill Splitting & Payment

**Route**: `/my-tab`

#### Tab View Flow
```
Load current user's ordered items
       ↓
Sync participants from API
       ↓
Calculate total from ALL confirmed orders
       ↓
Display split options:
  - Even split: Total ÷ participants
  - Pay for self: User pays own items
  - Pay for everyone: User pays entire bill
  - Custom: Manual per-person amounts
       ↓
Show participant list with amounts
       ↓
"Pay Now" button
```

#### Payment Flow
```
User clicks "Pay Now"
       ↓
Opens PaymentModal
       ↓
Select payment method
       ↓
Confirm payment
       ↓
API Call: PUT /session/{sessionId}/end
       ↓
Clear all localStorage
       ↓
Show success message
       ↓
Redirect to home
```

---

## API Reference

**Base URL**: `process.env.NEXT_PUBLIC_API_BASE_URL`

### Session Endpoints

| Method | Endpoint | Purpose | Request Body | Response |
|--------|----------|---------|--------------|----------|
| GET | `/ordering-session/space/{spaceId}` | Get session preview by QR code | - | `{ space, business, session? }` |
| POST | `/ordering-session/start` | Create or join session | `{ spaceId, guestName }` | `{ data: Session }` |
| GET | `/ordering-session/session/{sessionId}` | Get full session details | - | `{ data: Session }` |
| PUT | `/ordering-session/session/{sessionId}/end` | End session after payment | `{ sessionUserId, reason }` | `{ success: true }` |

### Menu Endpoints

| Method | Endpoint | Purpose | Request Body | Response |
|--------|----------|---------|--------------|----------|
| GET | `/business/menus/active/{businessId}` | Fetch all active menus with items | - | `{ data: MenuWithItems[] }` |
| GET | `/items/business/{businessId}` | Fetch all items for business | - | `{ data: MenuItem[] }` |

### Order Endpoints

| Method | Endpoint | Purpose | Request Body | Response |
|--------|----------|---------|--------------|----------|
| POST | `/ordering-session/session/{sessionId}/queue` | Sync cart queue (upsert) | `{ sessionUserId, items[] }` | `{ message, queue }` |
| POST | `/ordering-session/session/{sessionId}/queue/confirm` | Confirm and place order | `{ sessionUserId, paymentType }` | `{ data: Order }` |

### Request/Response Examples

#### Start Session
```typescript
// Request
POST /ordering-session/start
{
  "spaceId": "space_123",
  "guestName": "John Doe"
}

// Response
{
  "data": {
    "id": "session_456",
    "spaceId": "space_123",
    "businessId": "business_789",
    "status": "active",
    "participants": [
      {
        "sessionUserId": "user_abc",
        "guestName": "John Doe",
        "joinedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "orders": [],
    "expiresAt": "2024-01-15T14:30:00Z"
  }
}
```

#### Update Queue
```typescript
// Request
POST /ordering-session/session/{sessionId}/queue
{
  "sessionUserId": "user_abc",
  "items": [
    {
      "itemId": "item_123",
      "quantity": 2,
      "variantIndex": 0,
      "addOns": [
        {
          "addonIndex": 0,
          "selectedOptions": [0, 1]
        }
      ],
      "spiceLevel": "Hot"
    }
  ]
}

// Response
{
  "message": "Queue updated",
  "queue": {
    "sessionUserId": "user_abc",
    "items": [...],
    "updatedAt": "2024-01-15T10:35:00Z"
  }
}
```

#### Confirm Order
```typescript
// Request
POST /ordering-session/session/{sessionId}/queue/confirm
{
  "sessionUserId": "user_abc",
  "paymentType": "cash"
}

// Response
{
  "data": {
    "id": "order_xyz",
    "sessionId": "session_456",
    "sessionUserId": "user_abc",
    "items": [...],
    "total": 45.99,
    "status": "confirmed",
    "payment": {
      "type": "cash",
      "paid": false
    }
  }
}
```

---

## State Management

The application uses React Context API for state management with 6 context providers.

### Provider Hierarchy

```
FirebaseAuthProvider
└── SessionProvider
    └── RestaurantProvider
        └── ThemeProvider
            └── CartProvider
                └── OrderProvider
                    └── SplitProvider
                        └── {children}
                        └── DebugPanelWrapper
```

**Source**: `src/app/layout.tsx`

### SessionContext

**File**: `/src/contexts/SessionContext.tsx`

**Purpose**: Manage ordering session & real-time participants

**State**:
| Property | Type | Description |
|----------|------|-------------|
| `previewSession` | Session | Ephemeral session from QR scan |
| `sessionData` | Session | Active session (persisted) |
| `activeOrderId` | string | Currently viewed order tab |

**Methods**:
| Method | Description |
|--------|-------------|
| `setPreviewSession()` | Store QR scan data (not persisted) |
| `setSessionData()` | Save session to localStorage |
| `refreshSessionData()` | Fetch latest session from API |
| `endSession()` | Call API to mark session complete |
| `isSessionActive()` | Check if status === 'active' |
| `isSessionExpired()` | Check expiry timestamp |

**Real-time Sync**:
- Firebase listener: `subscribeToParticipantsBySpace()`
- Fallback: Polling every 10 seconds

---

### CartContext

**File**: `/src/contexts/CartContext.tsx`

**Purpose**: Shared cart with multi-participant sync

**State**:
| Property | Type | Description |
|----------|------|-------------|
| `cart` | Cart | Items, subtotal, tax, total |
| `lastCartAction` | object | Track "X item(s) added/removed" |

**Methods**:
| Method | Description |
|--------|-------------|
| `addItem()` | Add to cart + sync with API |
| `removeItem()` | Remove from cart + sync with API |
| `updateQuantity()` | Change item quantity |
| `confirmOrder()` | Convert cart to confirmed order |
| `syncCartFromQueue()` | Fetch shared queue from API |

**Key Logic**:
- Each item tagged with `sessionUserId` (tracks who added it)
- Only syncs current user's items to API (prevents overwriting others)
- Merges ALL participants' items for display
- Tax rate: 0 (inclusive pricing)
- Caches menu items with customOptions for restoration

**Real-time Sync**:
- Firebase listener: `subscribeToOrderQueue()`
- Fallback: Polling every 15 seconds

---

### RestaurantContext

**File**: `/src/contexts/RestaurantContext.tsx`

**Purpose**: Store space/restaurant information

**State**:
| Property | Type | Description |
|----------|------|-------------|
| `context` | RestaurantContext | Restaurant, branch, table info |

**Methods**:
| Method | Description |
|--------|-------------|
| `setContext()` | Save restaurant data |
| `clearContext()` | Clear on session end |

---

### OrderContext

**File**: `/src/contexts/OrderContext.tsx`

**Purpose**: Legacy order state for order-summary flow

**State**:
| Property | Type | Description |
|----------|------|-------------|
| `order` | Order | Order object with timer |
| `remainingTime` | number | Timer countdown (seconds) |

**Methods**:
| Method | Description |
|--------|-------------|
| `placeOrder()` | Create new order with timer |
| `startTimer()` | Start countdown |
| `resetOrder()` | Clear order |

---

### SplitContext

**File**: `/src/contexts/SplitContext.tsx`

**Purpose**: Bill splitting logic

**State**:
| Property | Type | Description |
|----------|------|-------------|
| `split` | SplitBill | Mode, participants, shares, validity |
| `mode` | SplitMode | 'even' \| 'custom' \| 'self' \| 'all' |

**Methods**:
| Method | Description |
|--------|-------------|
| `setSplitMode()` | Change split strategy |
| `calculateSplit()` | Compute shares based on mode |
| `addParticipant()` | Add person to split |
| `updateShare()` | Manually set person's amount |

**Split Modes**:
| Mode | Description |
|------|-------------|
| `even` | Total ÷ number of participants |
| `self` | User pays own items, others split remainder |
| `all` | User pays entire bill |
| `custom` | Manual per-person amounts |

---

## Routing Structure

| Route | File | Purpose | Guards |
|-------|------|---------|--------|
| `/` | `app/page.tsx` | Home - QR scan prompt | None |
| `/space/[spaceId]` | `app/space/[spaceId]/page.tsx` | QR result + LoginModal (join session) | Redirects to /menu if active session |
| `/login` | `app/login/page.tsx` | Redirect guard (legacy) | Redirects based on session state |
| `/menu` | `app/menu/page.tsx` | Browse menu, add items | Session + Restaurant |
| `/cart` | `app/cart/page.tsx` | View cart, place order | Session |
| `/order-summary` | `app/order-summary/page.tsx` | Order summary & payment | Active order |
| `/order-status` | `app/order-status/page.tsx` | Redirects to `/cart` | None |
| `/order-status/[orderId]` | `app/order-status/[orderId]/page.tsx` | Track specific order | None |
| `/my-tab` | `app/my-tab/page.tsx` | View personal tab & split | Session |

---

## Key Components

### Layout Components

| Component | File | Purpose |
|-----------|------|---------|
| `Header` | `components/layout/Header.tsx` | Sticky top bar with logo, cart icon, navigation |
| `ThemeProvider` | `components/layout/ThemeProvider.tsx` | Theme context (dark/light mode) |
| `DebugPanel` | `components/layout/DebugPanel.tsx` | Development-only debug info |

### Menu Components

| Component | File | Purpose |
|-----------|------|---------|
| `MenuAccordion` | `components/menu/MenuAccordion.tsx` | Collapsible category section |
| `MenuItem` | `components/menu/MenuItem.tsx` | Individual item card |
| `SearchBar` | `components/menu/SearchBar.tsx` | Sticky search bar at bottom |
| `CustomizationModal` | `components/order/CustomizationModal.tsx` | Customization options form |

### Cart Components

| Component | File | Purpose |
|-----------|------|---------|
| `PreOrderView` | `components/cart/PreOrderView.tsx` | Cart page before order (participants, items, kitchen note, bill, place order) |
| `CartItem` | `components/cart/CartItem.tsx` | Individual item with quantity controls, dietary indicator, participant badge |
| `BillSection` | `components/cart/BillSection.tsx` | Itemized bill: totals, taxes, delivery, packing, grand total, My Share |
| `DeleteConfirmationModal` | `components/cart/DeleteConfirmationModal.tsx` | Confirm item removal when quantity reaches 0 |

### Session Components

| Component | File | Purpose |
|-----------|------|---------|
| `ParticipantsList` | `components/session/ParticipantsList.tsx` | Dark card with participant avatars/amounts, split mode label, Change button |
| `LoginModal` | `components/session/LoginModal.tsx` | Bottom sheet login form (name, dining type) |
| `OrderTabs` | `components/session/OrderTabs.tsx` | Switch between multiple orders |

### Order Components

| Component | File | Purpose |
|-----------|------|---------|
| `PostOrderView` | `components/order/PostOrderView.tsx` | Order status after confirmation |
| `OrderTimer` | `components/order/OrderTimer.tsx` | Countdown timer |
| `PaymentModal` | `components/order/PaymentModal.tsx` | Payment method selection |
| `SplitSettingsModal` | `components/order/SplitSettingsModal.tsx` | Bill split configuration |

### UI Components

| Component | File | Purpose |
|-----------|------|---------|
| `Button` | `components/ui/Button.tsx` | Reusable button with variants |
| `Avatar` | `components/ui/Avatar.tsx` | User avatar with initials |
| `Badge` | `components/ui/Badge.tsx` | Tag/label component |
| `Modal` | `components/ui/Modal.tsx` | Base modal container |
| `LoadingSpinner` | `components/ui/LoadingSpinner.tsx` | Loading indicator |

---

## Services Layer

### Session Service

**File**: `/src/services/session.service.ts`

```typescript
sessionService.getSessionBySpaceId(spaceId)  // GET /space/{spaceId}
sessionService.startSession(data)             // POST /start
sessionService.getSessionById(sessionId)      // GET /session/{sessionId}
sessionService.endSession(sessionId, data)    // PUT /session/{sessionId}/end
```

### Order Service

**File**: `/src/services/order.service.ts`

```typescript
orderService.updateQueue(sessionId, payload)    // POST /session/{sessionId}/queue
orderService.confirmOrder(sessionId, payload)   // POST /session/{sessionId}/queue/confirm
```

### Menu Service

**File**: `/src/services/menu.service.ts`

```typescript
menuService.getMenuByBusinessId(businessId)     // GET /menus/active/{businessId}
menuService.getItemsByBusinessId(businessId)    // GET /items/business/{businessId}
menuService.getMenusWithItems(businessId)       // Returns menus with populated items
```

### API Client

**File**: `/src/lib/api/client.ts`

- Generic HTTP client with error handling
- Methods: `get<T>()`, `post<T>()`, `put<T>()`, `patch<T>()`, `delete<T>()`
- Automatically adds `Content-Type: application/json`
- Throws `APIError` with status code & data

---

## Custom Hooks

### useSessionValidation

**File**: `/src/hooks/useSessionValidation.ts`

- Validates session is active & not expired
- Redirects to home if invalid
- Called on every protected page

### useNavigationGuard

**File**: `/src/hooks/useNavigationGuard.ts`

- `useRequireRestaurantContext()`: Redirects if no restaurant context
- `useRequireActiveOrder()`: Redirects if no active order

### useCartPageState

**File**: `/src/hooks/useCartPageState.ts`

- Unified cart page logic
- Tracks `pageState`: 'pre-order' | 'post-order'
- Manages order tabs & loading

### useTimerSync

**File**: `/src/hooks/useTimerSync.ts`

- Synchronizes timer on page load
- Prevents timer jumps when navigating

---

## Data Types & Models

### Session Types

**File**: `/src/types/api/session.ts`

```typescript
interface Session {
  id: string
  spaceId: string
  businessId: string
  status: 'active' | 'completed' | 'cancelled'
  participants: SessionParticipant[]
  orders: string[] | SessionOrder[]
  expiresAt?: string
}

interface SessionParticipant {
  sessionUserId: string
  guestName: string
  patronId?: string
  joinedAt?: Timestamp
}

interface SessionOrderQueue {
  sessionUserId: string
  items: SessionQueueItem[]
  updatedAt: Timestamp
}
```

### Order Types

**File**: `/src/types/api/order.ts`

```typescript
interface Order {
  id: string
  sessionId: string
  sessionUserId: string
  guestName?: string
  items: OrderItem[]
  total: number
  payment: { type: 'cash' | 'card' | 'upi', paid: boolean }
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed'
}

interface QueueItem {
  itemId: string
  quantity: number
  variantIndex?: number
  addOns?: OrderItemAddon[]
  spiceLevel?: string
}
```

### Menu Types

**File**: `/src/types/api/menu.ts`

```typescript
interface MenuWithItems {
  id: string
  name: string
  items: MenuItem[]
  sections?: Section[]
  visibility: 'active' | 'inactive'
}

interface MenuItem {
  id: string
  name: string
  price: number
  description: string
  variants?: Variant[]
  addons: Addon[]
  spiceLevelEnabled?: boolean
  spiceLevels?: string[]
}

interface Addon {
  name: string
  minOptions: number
  maxOptions: number
  options: AddonOption[]
}
```

### Cart Types

**File**: `/src/types/cart.ts`

```typescript
interface Cart {
  items: CartItem[]
  subtotal: number
  tax: number  // Always 0 (inclusive pricing)
  total: number
}

interface CartItem {
  id: string
  menuItem: MenuItem
  quantity: number
  customizations: Customization[]
  itemTotal: number
  sessionUserId?: string  // Tracks who added item
  spiceLevel?: string
}

interface Customization {
  optionId: string
  choiceId: string
  priceModifier: number
}
```

---

## Real-Time Synchronization

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    REAL-TIME SYNC FLOW                          │
└─────────────────────────────────────────────────────────────────┘

Local Changes              Firebase Realtime         Polling Fallback
     ↓                           ↓                         ↓
User adds item     →    syncQueueWithAPI()    →   subscribeToOrderQueue()
  (CartContext)          [API: POST queue]        [Real-time listener]
                                                         ↓
                                                   (every 15s)
                                                 getSessionById()
                                                [Merge all participants]
                                                [Update local cart]
```

### Firebase Integration

**File**: `/src/lib/firebase/realtime.service.ts`

**Listeners**:
| Function | Purpose | Fallback |
|----------|---------|----------|
| `subscribeToOrderQueue()` | Real-time cart updates | Polling every 15s |
| `subscribeToParticipantsBySpace()` | Real-time participant updates | Polling every 10s |

**Flow**:
```
1. Try Firebase subscription
   ↓
2. If successful → real-time updates
   ↓
3. If fails → activate polling fallback
```

---

## LocalStorage Keys

| Key | Type | Purpose |
|-----|------|---------|
| `morsel_session_data` | Session | Active session persistence |
| `morsel_session_user_id` | string | Identify current user (UUID) |
| `morsel_active_order_id` | string | Track active order tab |
| `morsel_customer_name` | string | Remember guest name |
| `morsel_dining_type` | 'dine-in' \| 'takeaway' | Order type preference |
| `morsel_auth_method` | 'guest' \| 'google' \| 'apple' | Auth method used |
| `morsel_restaurant_context` | RestaurantContext | Space/business info |
| `morsel_cart` | Cart | Cart state persistence |
| `morsel_split` | SplitBill | Bill split settings |
| `morsel_order_${orderId}` | Order | Confirmed order details |
| `morsel_menu_items_cache` | Map<itemId, MenuItem> | Cache for customOptions |

---

## Environment Variables

```bash
# Required
NEXT_PUBLIC_API_BASE_URL=https://api.example.com

# Firebase (optional - for real-time features)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

---

## Special Features

### Multi-Participant Ordering
- Multiple customers at same table share a session
- Each can order independently
- Shared cart view shows all items
- Items tagged with who added them

### Bill Splitting
- 4 modes: even, self, all, custom
- Real-time recalculation
- Validates shares sum to total
- Syncs with API participants

### Spice Level Selection
- Per-item spice level selector (if enabled)
- Stored in cart items
- Synced with queue to API
- Retrieved when reconstructing cart

### Order Tracking
- Post-order view with countdown timer
- Status updates from Firebase real-time DB
- Multiple order tabs (switch between orders)
- ETA display

---

## Error Handling

- `APIError` class with status codes
- Try-catch blocks in all async operations
- User-facing error messages
- Graceful fallbacks (Firebase → polling)
- Development console logging

---

---

## Pricing Model

### Variants vs Add-ons (Industry Standard)

The application follows the industry standard pricing model used by Zomato, Swiggy, UberEats, and DoorDash:

| Type | Display | Example | Behavior |
|------|---------|---------|----------|
| **Variants** (Size, Type) | Flat/absolute price | `Small - $10.00`, `Large - $15.00` | Replaces base price |
| **Add-ons** (Toppings, Extras) | Incremental price | `Extra Cheese - +$2.00` | Adds to base price |

### Price Calculation Flow

```
1. User selects variant (e.g., "Large" at $15.00)
   → Base price becomes $15.00

2. User selects add-ons (e.g., "Extra Cheese" +$2.00, "Bacon" +$3.00)
   → Add-ons total = $5.00

3. Final item price = Variant price + Add-ons
   → $15.00 + $5.00 = $20.00

4. With quantity (e.g., 2)
   → Total = $20.00 × 2 = $40.00
```

### Why This Approach?

- **Variants are different products**: A "Large Pizza" is fundamentally different from a "Small Pizza" - different portions, different costs
- **Add-ons are extras**: "Extra Cheese" is an addition on top of whatever size you chose
- **User clarity**: Showing flat prices for variants helps users compare options easily

### Implementation Details

- Variants are identified by `optionId === 'variant'` or `optionId.startsWith('variant')`
- `CustomizationModal.tsx`: Shows flat prices for variants, `+$X` for add-ons
- `CartContext.tsx`: `calculateItemTotal()` uses variant price as base, adds add-on prices

---

*Last updated: 2026-02-01*
