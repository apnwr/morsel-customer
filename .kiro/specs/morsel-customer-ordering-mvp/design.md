# Design Document

## Overview

The MORSEL Customer-Facing Mock MVP is a Next.js 16 application built with React 19, TypeScript, and Tailwind CSS v4. The application operates entirely on frontend mock data with no backend dependencies, providing a complete restaurant ordering experience from menu browsing to mock payment. The architecture emphasizes client-side state management, localStorage persistence, and a component-based structure that can easily transition to API-driven data in future iterations.

### Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Runtime**: React 19.2.0
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4
- **Animation**: Framer Motion (to be added)
- **State Management**: React Context API + localStorage
- **Icons**: Lucide React (to be added)

### Key Design Principles

1. **Mock-First Architecture**: All data and business logic run on frontend mock data
2. **Offline-First**: Complete functionality without network requests
3. **State Persistence**: Critical state stored in localStorage for session continuity
4. **Component Isolation**: Reusable components with clear interfaces
5. **Theme Flexibility**: Dynamic theming based on active restaurant
6. **Mobile-First**: Responsive design optimized for mobile devices
7. **Developer Experience**: Debug panel for comprehensive testing capabilities

## Architecture

### Application Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Splash screen (/)
│   ├── login/
│   │   └── page.tsx            # Login/entry page
│   ├── menu/
│   │   └── page.tsx            # Menu browsing
│   ├── cart/
│   │   └── page.tsx            # Full-screen cart page
│   └── order-summary/
│       └── page.tsx            # Order summary & payment
├── components/
│   ├── layout/
│   │   ├── Header.tsx          # Sticky header with timer and cart total
│   │   └── DebugPanel.tsx      # Global debug controls (floating)
│   ├── menu/
│   │   ├── MenuAccordion.tsx   # Category accordion
│   │   ├── MenuItem.tsx        # Individual menu item card
│   │   ├── MenuNavPopup.tsx    # Quick category navigation
│   │   └── FilterPills.tsx     # Filter buttons (Filters, Bestseller, etc.)
│   ├── cart/
│   │   ├── CartItem.tsx        # Cart item with quantity controls
│   │   ├── SplitSection.tsx    # Split evenly expandable section
│   │   ├── ParticipantCard.tsx # Participant avatar and amount
│   │   └── BillModal.tsx       # Bill breakdown modal
│   ├── order/
│   │   ├── CustomizationModal.tsx  # Item customization (bottom sheet)
│   │   ├── SplitSettingsModal.tsx  # Split bill settings (bottom sheet)
│   │   ├── OrderTimer.tsx          # Countdown timer badge
│   │   ├── OrderStatusBanner.tsx   # Green "order is getting prepared" banner
│   │   ├── RunningTabs.tsx         # Running tabs section with participants
│   │   └── PaymentModal.tsx        # Mock payment success UI
│   └── ui/
│       ├── Button.tsx          # Reusable button (primary, secondary, pill)
│       ├── Modal.tsx           # Base modal component (bottom sheet)
│       ├── Avatar.tsx          # Circular avatar component
│       └── Badge.tsx           # Badge component (for timer, etc.)
├── contexts/
│   ├── AppContext.tsx          # Global app state
│   ├── RestaurantContext.tsx   # Restaurant/branch/table
│   ├── CartContext.tsx         # Cart management
│   └── OrderContext.tsx        # Order & timer state
├── mocks/
│   ├── restaurants.ts          # Restaurant data
│   ├── menuData.ts             # Menu items by restaurant
│   ├── mockOrders.ts           # Order logic helpers
│   ├── mockSplit.ts            # Split calculation helpers
│   └── mockStorage.ts          # localStorage utilities
├── types/
│   ├── restaurant.ts           # Restaurant types
│   ├── menu.ts                 # Menu item types
│   ├── cart.ts                 # Cart types
│   └── order.ts                # Order types
└── lib/
    ├── utils.ts                # Utility functions
    └── constants.ts            # App constants
```


### Routing Strategy

The application uses Next.js App Router with the following route structure:

| Route | Purpose | Key Features |
|-------|---------|--------------|
| `/` | Splash Screen | Auto-redirect after 1-2s |
| `/login` | Customer Entry | Name input, dining type selection, auth options |
| `/menu` | Menu Browsing | Category accordions, add to cart, filters |
| `/cart` | Cart Management | Full-screen cart, split evenly, quantity controls, bill button |
| `/order-summary` | Order Review | Order status, timer, running tabs, payment options |

**Note**: Item customization is handled via a modal overlay on the `/menu` route, not a separate route. The cart is a full-screen page (not a drawer) accessible from the menu header.

All routes are client-side rendered to support dynamic state management and localStorage access.

### State Management Architecture

The application uses a multi-context approach for state management:

#### 1. RestaurantContext
- **Purpose**: Manages active restaurant, branch, and table
- **State**: `{ restaurant, branch, table, themeColor }`
- **Persistence**: localStorage key `morsel_restaurant_context`
- **Consumers**: All pages, Header, DebugPanel

#### 2. CartContext
- **Purpose**: Manages cart items and calculations
- **State**: `{ items, subtotal, tax, total }`
- **Actions**: `addItem`, `removeItem`, `updateQuantity`, `clearCart`
- **Persistence**: localStorage key `morsel_cart`
- **Consumers**: Menu, Cart, OrderSummary

#### 3. OrderContext
- **Purpose**: Manages order state and timer
- **State**: `{ orderId, status, timer, eta, isEditable }`
- **Actions**: `placeOrder`, `startTimer`, `expireTimer`, `resetOrder`
- **Persistence**: localStorage key `morsel_order`
- **Consumers**: Cart, OrderSummary, DebugPanel

#### 4. SplitContext
- **Purpose**: Manages bill splitting
- **State**: `{ mode, participants, shares }`
- **Actions**: `setSplitMode`, `addParticipant`, `updateShare`, `validateSplit`
- **Persistence**: localStorage key `morsel_split`
- **Consumers**: Cart, SplitBillModal, OrderSummary

### Data Flow

```
User Action → Component Event → Context Action → State Update → localStorage → UI Re-render
```

Example: Adding item to cart
1. User clicks "Add" on MenuItem
2. MenuItem calls `cartContext.addItem(item)`
3. CartContext updates state and persists to localStorage
4. Header re-renders with new cart total
5. CartDrawer (if open) re-renders with new item

## Components and Interfaces

### Core Components

#### Header Component
```typescript
interface HeaderProps {
  showTimer?: boolean;
  showCart?: boolean;
  showBack?: boolean;
}

// Features:
// - Timer badge at top left (circular icon with time)
// - Cart total at top right (price with arrow icon)
// - Filter pills row (Filters, Bestseller, Desserts, etc.)
// - Sticky positioning with border-bottom
// - White background
// - Clickable cart total opens drawer

// Visual style:
// - Clean white background
// - Subtle bottom border (#E5E7EB)
// - Timer: circular gray background, small text
// - Cart: price + arrow, clickable
// - Filter pills: gray background, rounded-full, horizontal scroll
```

#### MenuAccordion Component
```typescript
interface MenuAccordionProps {
  category: MenuCategory;
  items: MenuItem[];
  onAddItem: (item: MenuItem) => void;
  isExpanded?: boolean;
}

// Features:
// - Category header with name and item count
// - Chevron icon (› or ∨) indicating expand state
// - Expandable/collapsible with smooth animation
// - Renders MenuItem components in list
// - Full-width clickable header

// Visual style:
// - Header: font-semibold, flex justify-between
// - Item count in parentheses (e.g., "Today's Specials (2)")
// - Chevron rotates on expand
// - Items appear with fade-in animation
```

#### MenuItem Component
```typescript
interface MenuItemProps {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
  showAddedBy?: string; // For collaborative view
}

// Features:
// - Circular food image (left side)
// - Item name and price
// - "Add" or "More" button (right side)
// - Optional tags (bestseller, spicy, etc.)
// - Tap to customize if customizable

// Visual style:
// - Horizontal layout with gap-3
// - Light gray background (#F9FAFB)
// - Rounded-xl corners
// - Image: w-16 h-16, rounded-full, object-cover
// - Name: font-medium
// - Price: text-sm text-gray-500
// - Button: white bg, border, rounded-lg, text-sm
// - Padding: p-3
```

#### CustomizationModal Component
```typescript
interface CustomizationModalProps {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (customizedItem: CartItem) => void;
}

// Features:
// - Bottom sheet style (slides up from bottom)
// - Item image and details at top
// - Option sections (e.g., "Meal Size")
// - Each option shows price
// - Quantity selector with -/+ buttons
// - Live price calculation
// - "Continue" button at bottom
// - Backdrop with click-to-close

// Visual style:
// - Rounded-t-3xl (top corners only)
// - Max height 90vh with scroll
// - Header: item image (circular), name, base price
// - Options: full-width buttons, rounded-xl
//   - Selected: bg-black text-white
//   - Unselected: bg-gray-50
// - Quantity: centered with border buttons
// - Continue button: black, full-width, rounded-xl
// - Sections separated by borders
```


#### CartDrawer Component
```typescript
interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Features:
// - Full-screen view (not a drawer, but a full page)
// - Timer badge at top left
// - Cart total at top right (clickable)
// - "Split evenly" expandable section
// - Participant avatars with individual amounts
// - Cart items list with:
//   - Avatar of who added the item
//   - Item name and price
//   - Quantity selector (- number +)
//   - "Customize" button for customizable items
// - "Add a note to the kitchen" section
// - Floating "Bill" button at bottom
// - Empty state when no items

// Visual style:
// - Full screen white background
// - Sticky header with timer and total
// - Split section with border-bottom
// - Cart items with avatar on left
// - Quantity controls: border buttons, rounded-lg
// - Customize button: gray background, rounded-full, small
// - Note section: border-top, with emoji
// - Bill button: fixed bottom, black, full-width (with margins)
// - Padding: p-4 for most sections
```

#### SplitBillModal Component
```typescript
interface SplitBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
}

// Features:
// - Bottom sheet style modal
// - Large total amount at top
// - "Save" button (black, rounded-full, top right)
// - "Split evenly" expandable section with chevron
// - Participant grid with circular avatars
//   - Shows name below avatar
//   - Shows individual amount below name
// - "+" button to invite/add participants
// - Payment mode options:
//   - "Pay for everyone"
//   - "Pay for self"
//   - "Custom"
// - Real-time calculation as participants change
// - Validation (sum must equal total)

// Visual style:
// - Bottom sheet: rounded-t-3xl
// - Total: text-2xl font-bold, centered
// - Save button: small, black, rounded-full
// - Participant section: border-bottom
// - Avatars: w-16 h-16, colored backgrounds (orange, blue, etc.)
// - Names: text-sm below avatar
// - Amounts: text-lg font-semibold
// - Add button: gray background, dashed border, "+" icon
// - Payment options: full-width, bg-gray-50, rounded-xl, p-4
// - Options stacked with gap-3
```

#### OrderTimer Component
```typescript
interface OrderTimerProps {
  startTime: number;
  duration: number; // in seconds
  onExpire: () => void;
  isEditable: boolean;
}

// Features:
// - Circular badge with timer icon
// - Time display (e.g., "23 mins")
// - Color changes based on state:
//   - Green when order is placed and editable
//   - Orange/yellow when time is running low
//   - Red when expired
// - Shows in header consistently
// - Calls onExpire when timer reaches 0

// Visual style:
// - Small circular badge: w-8 h-8
// - Background color based on state:
//   - bg-green-100 (editable/active)
//   - bg-orange-100 (warning)
//   - bg-red-100 (expired)
// - Icon: clock/timer emoji or icon
// - Time text: text-xs or text-sm
// - Positioned in top-left of header
```

#### BillBreakdown Component
```typescript
interface BillBreakdownProps {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  splitMode?: 'even' | 'custom' | 'self';
  participants?: Participant[];
}

// Features:
// - Shows itemized list
// - Displays subtotal, tax, total
// - Shows split breakdown if applicable
// - Each line item with quantity and price
// - Clear typography hierarchy

// Visual style:
// - Clean list layout
// - Divider lines between sections
// - Subtotal/tax/total in gray text
// - Grand total in bold, larger font
// - Padding: p-4
// - Border-top for summary section
```

#### BillModal Component
```typescript
interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaceOrder: () => void;
}

// Features:
// - Bottom sheet modal showing bill breakdown
// - Itemized list of all cart items
// - Subtotal, tax (10%), and total
// - Split information if applicable
// - "Place Order" button at bottom
// - "Edit Cart" option to go back

// Visual style:
// - Bottom sheet: rounded-t-3xl
// - Header: "Bill" title with close button
// - Items list: each item with name, qty, price
// - Summary section: border-top
//   - Subtotal: text-gray-600
//   - Tax: text-gray-600
//   - Total: font-bold, text-lg
// - Split section (if applicable): shows per-person amount
// - Place Order button: black, full-width, rounded-xl
// - Padding: p-6
```

#### DebugPanel Component
```typescript
interface DebugPanelProps {
  // No props - uses contexts directly
}

// Features:
// - Floating button (bottom-right)
// - Expandable panel with controls
// - Restaurant/branch/table switchers
// - Cart manipulation buttons
// - Order state controls
// - Quick navigation buttons
// - localStorage clear button
// - Conditional visibility based on env/localStorage

// Visual style:
// - Floating button: fixed bottom-4 right-4
// - Button: w-12 h-12, bg-purple-600, rounded-full, shadow-lg
// - Icon: gear/settings icon
// - Panel: slide-in from right, white bg, shadow-xl
// - Controls: grouped by category with dividers
// - Buttons: small, various colors for different actions
// - Only visible in development or when enabled
```

### UI Base Components

#### Button Component
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}
```

#### Modal Component
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
}

// Features:
// - Backdrop with click-to-close
// - Slide-up animation
// - Close button
// - Scroll handling for long content
```

#### Drawer Component
```typescript
interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  position?: 'left' | 'right' | 'bottom';
  children: React.ReactNode;
}

// Features:
// - Slide-in animation
// - Backdrop with click-to-close
// - Swipe-to-close (mobile)
```

## Data Models

### Restaurant Types

```typescript
interface Restaurant {
  id: string;
  name: string;
  themeColor: string;
  logo: string;
  branches: Branch[];
}

interface Branch {
  id: string;
  name: string;
  tables: number;
}

interface RestaurantContext {
  restaurant: Restaurant;
  branch: Branch;
  table: number;
}
```

### Menu Types

```typescript
interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  order: number;
}

interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  tags: string[];
  isCustomizable: boolean;
  customOptions?: CustomOption[];
}

interface CustomOption {
  id: string;
  name: string;
  type: 'radio' | 'checkbox';
  required: boolean;
  choices: CustomChoice[];
}

interface CustomChoice {
  id: string;
  label: string;
  priceModifier: number; // Can be positive or negative
}
```

### Cart Types

```typescript
interface CartItem {
  id: string; // Unique cart item ID
  menuItem: MenuItem;
  quantity: number;
  customizations: Customization[];
  notes?: string;
  itemTotal: number;
}

interface Customization {
  optionId: string;
  optionName: string;
  choiceId: string;
  choiceLabel: string;
  priceModifier: number;
}

interface Cart {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
}
```


### Order Types

```typescript
interface Order {
  id: string;
  restaurantContext: RestaurantContext;
  customerName: string;
  diningType: 'dine-in' | 'takeaway' | 'delivery';
  cart: Cart;
  split: SplitBill;
  status: 'pending' | 'placed' | 'locked' | 'completed';
  placedAt?: number; // timestamp
  timerDuration: number; // seconds
  timerExpiresAt?: number; // timestamp
  eta?: number; // minutes
  isEditable: boolean;
}
```

### Split Bill Types

```typescript
interface SplitBill {
  mode: 'even' | 'custom' | 'self';
  participants: Participant[];
  shares: Record<string, number>; // participantId -> amount
  isValid: boolean;
}

interface Participant {
  id: string;
  name: string;
  avatar: string;
  isMock: boolean;
}
```

### Mock Data Structure

```typescript
// restaurants.ts
export const restaurants: Restaurant[] = [
  {
    id: 'r1',
    name: 'La Brasserie',
    themeColor: '#E68E2E',
    logo: '/logos/brasserie.png',
    branches: [
      { id: 'b1', name: 'Main Dining', tables: 15 },
      { id: 'b2', name: 'Rooftop Lounge', tables: 8 },
    ],
  },
  {
    id: 'r2',
    name: 'Sushi Mori',
    themeColor: '#008080',
    logo: '/logos/sushi.png',
    branches: [
      { id: 'b1', name: 'Downtown', tables: 12 },
      { id: 'b2', name: 'Beachside', tables: 10 },
    ],
  },
  {
    id: 'r3',
    name: 'Casa di Pizza',
    themeColor: '#B82C2C',
    logo: '/logos/pizza.png',
    branches: [{ id: 'b1', name: 'City Center', tables: 20 }],
  },
];

// menuData.ts structure
export const menuData: Record<string, MenuCategory[]> = {
  r1: [ /* La Brasserie menu */ ],
  r2: [ /* Sushi Mori menu */ ],
  r3: [ /* Casa di Pizza menu */ ],
};

// Each restaurant has 4+ categories with 5-6 items each
// Example categories: Starters, Mains, Desserts, Beverages
// Some items have customOptions for size, preparation, etc.
```

## Error Handling

### localStorage Errors

```typescript
// Graceful fallback when localStorage is unavailable
try {
  localStorage.setItem(key, value);
} catch (error) {
  console.warn('localStorage unavailable, using memory state');
  // Fall back to in-memory state only
}
```

### Invalid State Recovery

```typescript
// Validate and sanitize data from localStorage
function loadCartFromStorage(): Cart {
  try {
    const stored = localStorage.getItem('morsel_cart');
    if (!stored) return getEmptyCart();
    
    const cart = JSON.parse(stored);
    // Validate structure
    if (!isValidCart(cart)) {
      console.warn('Invalid cart data, resetting');
      return getEmptyCart();
    }
    return cart;
  } catch (error) {
    console.error('Failed to load cart:', error);
    return getEmptyCart();
  }
}
```

### Timer Synchronization

```typescript
// Handle timer state when app is reopened
function syncOrderTimer(order: Order): Order {
  if (!order.timerExpiresAt) return order;
  
  const now = Date.now();
  if (now >= order.timerExpiresAt) {
    // Timer expired while app was closed
    return {
      ...order,
      status: 'locked',
      isEditable: false,
    };
  }
  
  // Timer still active
  return order;
}
```

### Split Validation

```typescript
// Ensure split shares equal total
function validateSplit(split: SplitBill, total: number): boolean {
  const sum = Object.values(split.shares).reduce((a, b) => a + b, 0);
  const tolerance = 0.01; // Allow 1 cent difference for rounding
  return Math.abs(sum - total) < tolerance;
}
```

### Navigation Guards

```typescript
// Prevent access to order-summary without active order
function OrderSummaryPage() {
  const { order } = useOrder();
  const router = useRouter();
  
  useEffect(() => {
    if (!order || order.status === 'pending') {
      router.push('/cart');
    }
  }, [order, router]);
  
  // ... rest of component
}
```

## Testing Strategy

### Component Testing Approach

1. **Unit Tests**: Test individual components in isolation
   - Button, Modal, Drawer base components
   - Utility functions (calculations, validations)
   - Mock data helpers

2. **Integration Tests**: Test component interactions
   - Menu → Cart flow
   - Cart → Split Bill flow
   - Order placement → Timer flow

3. **E2E Tests**: Test complete user flows
   - Full ordering flow: Login → Menu → Cart → Payment
   - Split bill scenarios
   - Debug panel functionality

### Key Test Scenarios

#### Cart Management
- Add item to cart
- Update item quantity
- Remove item from cart
- Calculate totals correctly (subtotal, tax, total)
- Persist cart to localStorage
- Restore cart from localStorage

#### Split Bill
- Split evenly among N participants
- Custom split with manual amounts
- Add/remove participants
- Validate sum equals total
- Handle edge cases (1 participant, 0 total)

#### Order Timer
- Start timer on order placement
- Countdown updates every second
- Lock order when timer expires
- Persist timer state across page refreshes
- Handle timer expiration while app is closed

#### Restaurant Context
- Switch restaurant updates theme
- Switch branch updates context
- Change table number
- Persist context to localStorage
- Load correct menu for active restaurant


#### Debug Panel
- Toggle visibility based on environment
- Switch restaurant/branch/table
- Add random items to cart
- Add mock participants
- Simulate order placement
- Expire timer manually
- Reset order state
- Clear localStorage
- Quick navigation to all routes

### Testing Tools

- **Vitest**: Unit and integration testing
- **React Testing Library**: Component testing
- **Playwright**: E2E testing (optional for MVP)

## UI/UX Design Patterns

### Mobile-First Responsive Design

```css
/* Breakpoints */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
```

All components designed for mobile first, then enhanced for larger screens.

### Design Language Overview

The MORSEL app follows a clean, modern design aesthetic with:
- **Minimalist layouts** with ample white space
- **Rounded corners** on cards, buttons, and inputs (8-16px radius)
- **Subtle shadows** for depth and hierarchy
- **Purple accent** (#8B5CF6 or similar) for primary branding
- **Black buttons** for primary actions with white text
- **Light gray backgrounds** (#F9FAFB) for sections
- **Clean typography** with clear hierarchy

### Splash Screen Design

```typescript
// Centered branding with tagline
<div className="flex flex-col items-center justify-center min-h-screen bg-white">
  <h1 className="text-5xl font-bold text-purple-600">morsel</h1>
  <p className="text-sm text-gray-500 mt-2">Enjoy every meal, not the math.</p>
</div>
```

### Login/Name Screen Design

```typescript
// Key elements:
// - Restaurant logo at top (rounded, with subtle shadow)
// - Table number display (e.g., "Table 15" with arrow icon)
// - Name input field with placeholder "Enter your name"
// - Dining type toggle pills (Dine-in, Take-Away, Delivery)
//   - Active: black background, white text
//   - Inactive: white background, gray text
// - Auth buttons stack:
//   - "Continue as Guest" (black, full width)
//   - "Continue with Google" (white with Google icon)
//   - "Continue with Apple" (white with Apple icon)
// - Native keyboard integration on mobile

const LoginScreen = () => (
  <div className="min-h-screen bg-white p-6">
    {/* Restaurant Logo */}
    <div className="flex justify-center mb-8">
      <div className="w-32 h-32 bg-gray-100 rounded-2xl shadow-sm" />
    </div>
    
    {/* Table Number */}
    <div className="mb-6">
      <div className="text-sm font-semibold mb-2">Table 15</div>
      <input 
        placeholder="Enter your name"
        className="w-full px-4 py-3 border border-gray-200 rounded-xl"
      />
    </div>
    
    {/* Dining Type Toggle */}
    <div className="flex gap-2 mb-6">
      <button className="px-4 py-2 bg-black text-white rounded-full text-sm">
        Dine-in
      </button>
      <button className="px-4 py-2 bg-white text-gray-600 rounded-full text-sm">
        Take-Away
      </button>
      <button className="px-4 py-2 bg-white text-gray-600 rounded-full text-sm">
        Delivery
      </button>
    </div>
    
    {/* Auth Buttons */}
    <div className="space-y-3">
      <button className="w-full py-3 bg-black text-white rounded-xl">
        Continue as Guest
      </button>
      <button className="w-full py-3 bg-white border border-gray-200 rounded-xl">
        Continue with Google
      </button>
      <button className="w-full py-3 bg-white border border-gray-200 rounded-xl">
        Continue with Apple
      </button>
    </div>
  </div>
);
```

### Menu Screen Design

```typescript
// Key elements:
// - Timer badge at top left (circular icon with time)
// - Cart total at top right (e.g., "$20.00" with arrow)
// - Filter pills below header (Filters, Bestseller, Desserts)
// - Expandable category sections with chevron icons
// - Menu items in horizontal scroll or grid
//   - Circular food image
//   - Item name and price
//   - "Add" or "More" button
// - Floating "Menu" button (bottom center, black pill)

const MenuScreen = () => (
  <div className="min-h-screen bg-white">
    {/* Header */}
    <div className="sticky top-0 bg-white border-b border-gray-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-100 rounded-full" />
          <span className="text-sm">$20.00</span>
        </div>
        <button className="text-sm">→</button>
      </div>
      
      {/* Filter Pills */}
      <div className="flex gap-2 overflow-x-auto">
        <button className="px-4 py-2 bg-gray-100 rounded-full text-sm whitespace-nowrap">
          Filters
        </button>
        <button className="px-4 py-2 bg-gray-100 rounded-full text-sm whitespace-nowrap">
          Bestseller
        </button>
        <button className="px-4 py-2 bg-gray-100 rounded-full text-sm whitespace-nowrap">
          Desserts
        </button>
      </div>
    </div>
    
    {/* Category Sections */}
    <div className="p-4">
      {/* Today's Specials */}
      <div className="mb-6">
        <button className="flex items-center justify-between w-full mb-3">
          <span className="font-semibold">Today's Specials (2)</span>
          <span>›</span>
        </button>
        
        {/* Menu Items */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <img className="w-16 h-16 rounded-full object-cover" />
            <div className="flex-1">
              <h3 className="font-medium">Salmon Steak Salad</h3>
              <p className="text-sm text-gray-500">$12.64</p>
            </div>
            <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm">
              More
            </button>
          </div>
        </div>
      </div>
      
      {/* More categories... */}
    </div>
    
    {/* Floating Menu Button */}
    <button className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-black text-white rounded-full shadow-lg">
      ☰ Menu
    </button>
  </div>
);
```

### Customization Modal Design

```typescript
// Key elements:
// - Slide up from bottom (sheet style)
// - Item details at top
// - Option sections (e.g., "Meal Size")
//   - Radio buttons or toggle pills
//   - Price displayed for each option
// - Quantity selector (- / number / +)
// - "Continue" button at bottom (black, full width)

const CustomizationModal = () => (
  <div className="fixed inset-0 bg-black/50 flex items-end">
    <div className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <img className="w-16 h-16 rounded-full" />
          <div>
            <h2 className="font-semibold">Salmon Steak Salad</h2>
            <p className="text-sm text-gray-500">$12.64</p>
          </div>
        </div>
      </div>
      
      {/* Options */}
      <div className="p-6">
        <h3 className="font-semibold mb-3">Meal Size</h3>
        <div className="space-y-2">
          <button className="w-full flex items-center justify-between p-4 bg-black text-white rounded-xl">
            <span>Half</span>
            <span>$12.64</span>
          </button>
          <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <span>Full</span>
            <span>$19.64</span>
          </button>
        </div>
        
        {/* Quantity */}
        <div className="mt-6">
          <h3 className="font-semibold mb-3">Quantity</h3>
          <div className="flex items-center gap-4">
            <button className="w-10 h-10 border border-gray-200 rounded-lg">−</button>
            <span className="text-lg font-medium">2</span>
            <button className="w-10 h-10 border border-gray-200 rounded-lg">+</button>
          </div>
        </div>
      </div>
      
      {/* Continue Button */}
      <div className="p-6 border-t border-gray-100">
        <button className="w-full py-4 bg-black text-white rounded-xl font-medium">
          Continue
        </button>
      </div>
    </div>
  </div>
);
```

### Cart Screen Design

```typescript
// Key elements:
// - Timer badge at top left (circular icon with time)
// - Cart total at top right (price with arrow, clickable)
// - "Split evenly" button with chevron (expandable)
// - Participant avatars when split is active
// - Cart items list with:
//   - Circular avatar of who added it
//   - Item name and price
//   - Quantity selector (- number +)
//   - "Customize" button if applicable
// - "Add a note to the kitchen" section with emoji
// - Floating "Bill" button at bottom (shows total)

const CartScreen = () => (
  <div className="min-h-screen bg-white pb-24">
    {/* Header */}
    <div className="sticky top-0 bg-white border-b border-gray-100 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-xs">⏱</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold">$24.88</span>
          <button>→</button>
        </div>
      </div>
    </div>
    
    {/* Split Evenly Section */}
    <div className="p-4 border-b border-gray-100">
      <button className="flex items-center justify-between w-full">
        <span className="font-medium">Split evenly</span>
        <span>›</span>
      </button>
      
      {/* Participants (when expanded) */}
      <div className="flex gap-4 mt-3">
        <div className="text-center">
          <div className="w-12 h-12 bg-orange-200 rounded-full mb-1" />
          <span className="text-xs">You</span>
          <div className="text-sm font-semibold">$18.44</div>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-200 rounded-full mb-1" />
          <span className="text-xs">Angela</span>
          <div className="text-sm font-semibold">$18.44</div>
        </div>
      </div>
    </div>
    
    {/* Cart Items */}
    <div className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-orange-200 rounded-full flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-medium">Salmon, Steak Fried</h3>
              <p className="text-sm text-gray-500">$12.64</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 border border-gray-200 rounded-lg">−</button>
              <span>1</span>
              <button className="w-8 h-8 border border-gray-200 rounded-lg">+</button>
            </div>
          </div>
          <button className="px-3 py-1 bg-gray-100 rounded-full text-xs">
            Customize →
          </button>
        </div>
        <div className="text-right">
          <div className="font-semibold">$12.64</div>
        </div>
      </div>
    </div>
    
    {/* Add Note Section */}
    <div className="p-4 border-t border-gray-100">
      <button className="flex items-center gap-2 text-gray-500">
        <span>🍳</span>
        <span className="text-sm">Add a note to the kitchen</span>
        <span className="ml-auto text-orange-500">23 mins</span>
      </button>
    </div>
    
    {/* Floating Bill Button */}
    <button className="fixed bottom-6 left-4 right-4 py-4 bg-black text-white rounded-xl font-medium shadow-lg">
      Bill
    </button>
  </div>
);
```

### Cart Split Settings Modal

```typescript
// Key elements:
// - Bottom sheet modal
// - Total amount at top (large, centered)
// - "Save" button (black, top right)
// - "Split evenly" section with chevron (expandable)
// - Participant list with avatars and names
// - Individual amounts shown
// - "Pay for everyone" option
// - "Pay for self" option
// - "Custom" option for manual split

const SplitSettingsModal = () => (
  <div className="fixed inset-0 bg-black/50 flex items-end">
    <div className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">$36.88</h2>
          <button className="px-6 py-2 bg-black text-white rounded-full text-sm">
            Save
          </button>
        </div>
      </div>
      
      {/* Split Evenly */}
      <div className="p-6 border-b border-gray-100">
        <button className="flex items-center justify-between w-full mb-4">
          <span className="font-semibold">Split evenly</span>
          <span>›</span>
        </button>
        
        <div className="flex gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-200 rounded-full mb-2" />
            <span className="text-sm">You</span>
            <div className="text-lg font-semibold">$18.44</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-200 rounded-full mb-2" />
            <span className="text-sm">Angela</span>
            <div className="text-lg font-semibold">$18.44</div>
          </div>
          <button className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full mb-2 flex items-center justify-center">
              <span className="text-2xl">+</span>
            </div>
            <span className="text-sm text-gray-500">Invite</span>
          </button>
        </div>
      </div>
      
      {/* Payment Options */}
      <div className="p-6 space-y-3">
        <button className="w-full p-4 bg-gray-50 rounded-xl text-left">
          Pay for everyone
        </button>
        <button className="w-full p-4 bg-gray-50 rounded-xl text-left">
          Pay for self
        </button>
        <button className="w-full p-4 bg-gray-50 rounded-xl text-left">
          Custom
        </button>
      </div>
    </div>
  </div>
);
```

### Order Placed / Order Summary Screen

```typescript
// Key elements:
// - Timer badge at top left (shows remaining time)
// - Cart total at top right
// - Green checkmark icon with "Your order is getting prepared!"
// - Editable timer message (can edit within X mins)
// - "Order Summary" section with items
//   - Each item shows avatar of who ordered
//   - Item name and price
//   - Quantity indicator
// - "Bring veggies on the side." note
// - "Running Tabs" section with split evenly toggle
// - Participant list with amounts
// - "Pay now" button for current user (black)
// - Other participants show amount and "Pay now" button
// - "Order more food?" section at bottom

const OrderSummaryScreen = () => (
  <div className="min-h-screen bg-white pb-24">
    {/* Header */}
    <div className="sticky top-0 bg-white border-b border-gray-100 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-xs">⏱</span>
          </div>
          <span className="text-sm text-green-600">23 mins</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold">$24.88</span>
          <button>→</button>
        </div>
      </div>
    </div>
    
    {/* Order Status */}
    <div className="p-6 bg-green-50 border-b border-green-100">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xl">✓</span>
        </div>
        <div>
          <h2 className="font-semibold mb-1">Your order is getting prepared!</h2>
          <p className="text-sm text-gray-600">
            You can edit your order within the next 2 mins. After that, 
            you can't cancel it and this order in the next 23 mins.
          </p>
        </div>
      </div>
    </div>
    
    {/* Order Summary */}
    <div className="p-6 border-b border-gray-100">
      <h3 className="font-semibold mb-4">Order Summary</h3>
      
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-200 rounded-full" />
          <div className="flex-1">
            <h4 className="font-medium">Salmon, Steak Fried</h4>
            <p className="text-sm text-gray-500">$12.64</p>
          </div>
          <span className="text-sm text-gray-500">1 item(s) of</span>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm">Bring veggies on the side.</p>
      </div>
    </div>
    
    {/* Running Tabs */}
    <div className="p-6 border-b border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Running Tabs</h3>
        <button className="flex items-center gap-2 text-sm">
          <span>Split evenly</span>
          <span>›</span>
        </button>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-200 rounded-full" />
            <span className="font-medium">You</span>
          </div>
          <span className="font-semibold">$100.00</span>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-200 rounded-full" />
            <span className="font-medium">Angela</span>
          </div>
          <span className="font-semibold">$100.00</span>
        </div>
      </div>
      
      {/* Pay Now Section */}
      <div className="mt-6 p-4 bg-gray-50 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-200 rounded-full" />
            <span className="font-semibold text-lg">$100.00</span>
          </div>
          <button className="px-6 py-2 bg-black text-white rounded-lg">
            Pay now
          </button>
        </div>
        <p className="text-xs text-gray-500">
          You can pay now or pay later at the end of your dining session. 
          A receipt image...
        </p>
      </div>
      
      {/* Other Participants */}
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between p-3 border border-gray-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-200 rounded-full" />
            <span className="font-semibold">$100.00</span>
          </div>
          <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm">
            Pay now
          </button>
        </div>
      </div>
    </div>
    
    {/* Order More Food */}
    <div className="p-6">
      <div className="p-4 bg-gray-50 rounded-xl text-center">
        <h4 className="font-semibold mb-1">Order more food?</h4>
        <p className="text-sm text-gray-600">
          Going back doesn't cancel your order. You can add more items 
          or go back to the table again.
        </p>
      </div>
    </div>
  </div>
);
```

### Animation Patterns

Using Framer Motion for smooth transitions:

```typescript
// Modal slide-up (sheet style)
const modalVariants = {
  hidden: { y: '100%' },
  visible: { y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } },
  exit: { y: '100%', transition: { duration: 0.2 } },
};

// Drawer slide-in
const drawerVariants = {
  hidden: { x: '100%' },
  visible: { x: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } },
  exit: { x: '100%', transition: { duration: 0.2 } },
};

// Accordion expand
const accordionVariants = {
  collapsed: { height: 0, opacity: 0 },
  expanded: { 
    height: 'auto', 
    opacity: 1,
    transition: { duration: 0.3, ease: 'easeInOut' }
  },
};

// Fade in
const fadeVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
};
```

### Color Palette

```typescript
// Base colors (from design screens)
const colors = {
  background: '#FFFFFF',
  surface: '#F9FAFB',      // Light gray backgrounds
  surfaceHover: '#F3F4F6',  // Slightly darker on hover
  text: {
    primary: '#111827',     // Black text
    secondary: '#6B7280',   // Gray text
    tertiary: '#9CA3AF',    // Light gray text
  },
  border: '#E5E7EB',        // Light borders
  primary: '#000000',       // Black for primary buttons
  accent: '#8B5CF6',        // Purple for branding
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
};

// Restaurant theme colors (dynamic)
// Applied to specific accent elements, not primary buttons
```

### Typography

```typescript
// Font families (from layout.tsx)
--font-geist-sans: Geist (primary)
--font-geist-mono: Geist Mono (prices/numbers)

// Scale (from design screens)
text-xs: 0.75rem     // Small labels
text-sm: 0.875rem    // Secondary text, buttons
text-base: 1rem      // Body text
text-lg: 1.125rem    // Emphasized text
text-xl: 1.25rem     // Subheadings
text-2xl: 1.5rem     // Section headings
text-3xl: 1.875rem   // Page titles
text-5xl: 3rem       // Splash screen logo

// Weights
font-normal: 400     // Body text
font-medium: 500     // Emphasized text
font-semibold: 600   // Headings
font-bold: 700       // Logo, important headings
```

### Spacing System

```typescript
// Consistent spacing using Tailwind scale
gap-2: 0.5rem   // Tight spacing (filter pills)
gap-3: 0.75rem  // Menu item spacing
gap-4: 1rem     // Default spacing
gap-6: 1.5rem   // Section spacing
gap-8: 2rem     // Large section spacing

// Padding
p-3: 0.75rem    // Compact padding (menu items)
p-4: 1rem       // Default padding (screen edges)
p-6: 1.5rem     // Comfortable padding (modals)

// Border radius
rounded-lg: 8px      // Small elements (buttons)
rounded-xl: 12px     // Medium elements (cards, inputs)
rounded-2xl: 16px    // Large elements (logo container)
rounded-3xl: 24px    // Modal tops
rounded-full: 9999px // Pills, circular images
```

### Button Styles

```typescript
// Primary button (black)
className="px-6 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-900 active:scale-95 transition-all"

// Secondary button (white with border)
className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 active:scale-95 transition-all"

// Pill button (toggle)
className="px-4 py-2 rounded-full text-sm font-medium transition-all"
// Active: bg-black text-white
// Inactive: bg-white text-gray-600

// Icon button
className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all"

// Floating action button
className="px-6 py-3 bg-black text-white rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all"
```

### Interactive States

```typescript
// Button states
default: bg-black text-white
hover: bg-gray-900 (slightly lighter)
active: scale-95 (press effect)
disabled: opacity-50 cursor-not-allowed

// Touch targets
min-height: 44px (iOS guideline)
min-width: 44px

// Focus states (for accessibility)
focus: ring-2 ring-purple-500 ring-offset-2
```

## Performance Considerations

### Code Splitting

```typescript
// Lazy load heavy components
const DebugPanel = dynamic(() => import('@/components/layout/DebugPanel'), {
  ssr: false,
});

const CustomizationModal = dynamic(
  () => import('@/components/order/CustomizationModal'),
  { ssr: false }
);
```

### Image Optimization

```typescript
// Use Next.js Image component
import Image from 'next/image';

<Image
  src={item.image}
  alt={item.name}
  width={300}
  height={200}
  className="rounded-lg"
  loading="lazy"
/>
```

### localStorage Optimization

```typescript
// Debounce localStorage writes
const debouncedSave = useMemo(
  () => debounce((data) => {
    localStorage.setItem(key, JSON.stringify(data));
  }, 500),
  []
);
```

### Memoization

```typescript
// Memoize expensive calculations
const cartTotal = useMemo(() => {
  return cart.items.reduce((sum, item) => sum + item.itemTotal, 0);
}, [cart.items]);

// Memoize callbacks
const handleAddItem = useCallback((item: MenuItem) => {
  addItem(item);
}, [addItem]);
```

## Security Considerations

### Input Validation

```typescript
// Sanitize user inputs
function sanitizeCustomerName(name: string): string {
  return name.trim().slice(0, 50); // Max 50 chars
}

// Validate numeric inputs
function validateQuantity(qty: number): number {
  return Math.max(1, Math.min(99, Math.floor(qty)));
}
```

### XSS Prevention

```typescript
// React automatically escapes content
// But be careful with dangerouslySetInnerHTML
// Avoid using it unless absolutely necessary

// If needed, use a sanitization library
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(dirty);
```

### localStorage Security

```typescript
// Don't store sensitive data in localStorage
// For this MVP, we only store:
// - Customer name (non-sensitive)
// - Cart items (non-sensitive)
// - Order state (non-sensitive)
// - Restaurant context (non-sensitive)

// In production with real payments:
// - Never store payment info in localStorage
// - Use secure, httpOnly cookies for auth tokens
// - Encrypt sensitive data before storage
```

## Accessibility

### Keyboard Navigation

- All interactive elements accessible via Tab
- Modal/drawer close on Escape
- Focus trap in modals
- Focus return after modal close

### Screen Reader Support

```typescript
// ARIA labels
<button aria-label="Add to cart">
  <PlusIcon />
</button>

// ARIA live regions for dynamic content
<div aria-live="polite" aria-atomic="true">
  {cartTotal} items in cart
</div>

// Semantic HTML
<nav>, <main>, <header>, <footer>
```

### Color Contrast

- Minimum 4.5:1 for normal text
- Minimum 3:1 for large text
- Test with theme colors to ensure compliance

### Touch Targets

- Minimum 44x44px for all interactive elements
- Adequate spacing between touch targets

## Future Backend Integration

### API Transition Strategy

The mock architecture is designed for easy transition to real APIs:

```typescript
// Current: Mock data import
import { restaurants } from '@/mocks/restaurants';

// Future: API fetch
const restaurants = await fetch('/api/restaurants').then(r => r.json());

// Abstraction layer
// src/lib/api.ts
export async function getRestaurants() {
  if (process.env.USE_MOCK_DATA) {
    return mockRestaurants;
  }
  return fetch('/api/restaurants').then(r => r.json());
}
```

### Data Persistence

```typescript
// Current: localStorage
localStorage.setItem('morsel_cart', JSON.stringify(cart));

// Future: API sync
await fetch('/api/cart', {
  method: 'POST',
  body: JSON.stringify(cart),
});
```

### Authentication

```typescript
// Current: Name input only
const customerName = localStorage.getItem('customer_name');

// Future: OAuth + JWT
const session = await getSession();
const customer = session.user;
```

### Payment Integration

```typescript
// Current: Mock modal
showPaymentSuccess();

// Future: Stripe/payment gateway
const paymentIntent = await stripe.confirmPayment({
  elements,
  confirmParams: { return_url: '/order-confirmation' },
});
```

## Deployment Considerations

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_ENABLE_DEBUG_PANEL=true
```

### Build Optimization

```bash
# Production build
npm run build

# Analyze bundle size
npm run build -- --analyze
```

### Hosting

- **Vercel**: Recommended for Next.js (zero-config)
- **Netlify**: Alternative with good Next.js support
- **AWS Amplify**: For AWS ecosystem integration

### Performance Targets

- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Lighthouse Score: > 90

## Development Workflow

### Setup

```bash
# Install dependencies
npm install

# Add required packages
npm install framer-motion lucide-react zustand

# Run development server
npm run dev
```

### Code Organization

- One component per file
- Co-locate types with components
- Group related components in folders
- Keep mock data separate from components

### Naming Conventions

- Components: PascalCase (MenuItem.tsx)
- Utilities: camelCase (calculateTotal.ts)
- Types: PascalCase (MenuItem, CartItem)
- Constants: UPPER_SNAKE_CASE (TAX_RATE)

### Git Workflow

- Feature branches: `feature/menu-accordion`
- Bug fixes: `fix/cart-total-calculation`
- Commit messages: Conventional Commits format

## Summary

This design provides a comprehensive blueprint for building the MORSEL Customer-Facing Mock MVP. The architecture emphasizes:

1. **Simplicity**: Mock data, no backend complexity
2. **Completeness**: Full ordering flow from splash to payment
3. **Testability**: Debug panel for comprehensive testing
4. **Maintainability**: Clear separation of concerns
5. **Scalability**: Easy transition to real APIs
6. **User Experience**: Mobile-first, smooth animations, intuitive flow

The implementation will deliver a production-like experience running entirely on the frontend, enabling thorough testing and validation before backend integration.
