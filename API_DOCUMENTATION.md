# API Documentation

This document contains all API endpoints, their usage, request/response structures, and integration details for the Morsel Customer application.

---

## Base Configuration

**Base URL**: `https://us-central1-morsel-db7d8.cloudfunctions.net/app/api/v1`

**Environment Variable**: `NEXT_PUBLIC_API_BASE_URL`

**Location**:
- `.env.local` (local development)
- `.env.example` (template)

**Config File**: `src/lib/config.ts`

---

## API Client

**Location**: `src/lib/api/client.ts`

### Features
- Singleton pattern (`apiClient`)
- Automatic JSON parsing
- Custom error handling with `APIError` class
- Support for all HTTP methods: GET, POST, PUT, DELETE, PATCH

### Usage Example
```typescript
import { apiClient } from '@/lib/api/client';

// GET request
const data = await apiClient.get<ResponseType>('/endpoint');

// POST request
const result = await apiClient.post<ResponseType>('/endpoint', { body: 'data' });
```

### Error Handling
```typescript
try {
  const data = await apiClient.get('/endpoint');
} catch (error) {
  if (error instanceof APIError) {
    console.error(error.status, error.message, error.data);
  }
}
```

---

## Endpoints

### 1. Get Ordering Session by Space ID

**Endpoint**: `/ordering-session/space/{spaceId}`

**Method**: `GET`

**Description**: Fetches ordering session data including space details, business information, and current session status when a customer scans a QR code.

**Service**: `src/services/session.service.ts`

**Service Method**: `sessionService.getSessionBySpaceId(spaceId)`

#### Request

**URL Parameters**:
- `spaceId` (string, required): The unique identifier for the space (table/counter)

**Example**:
```typescript
GET /ordering-session/space/MzIc4dAkf8Z4Aw9DKHAY
```

#### Response

**Status Code**: `200 OK`

**Response Type**: `OrderingSessionResponse`

**Type Definition**: `src/types/api/session.ts`

```typescript
interface OrderingSessionResponse {
  data: {
    space: Space;
    business: Business;
    session: null | any;
    participantsCount: number;
  }
}
```

#### Response Example

```json
{
  "data": {
    "space": {
      "id": "MzIc4dAkf8Z4Aw9DKHAY",
      "name": "Counter top",
      "type": "counter",
      "number": 1,
      "capacity": 4,
      "customField": "",
      "businessId": "vQX9lFoJTwpYBhF5v4aZ",
      "areaId": "q82IcuEkdmsvgrpy7JPf",
      "status": "available",
      "qrIdentifier": "bab3966c5b3033088a06b3f604d42c07",
      "qrCodeUrl": "space/bab3966c5b3033088a06b3f604d42c07",
      "currentOrders": [],
      "createdAt": {
        "_seconds": 1760022835,
        "_nanoseconds": 721000000
      },
      "updatedAt": {
        "_seconds": 1760022835,
        "_nanoseconds": 721000000
      }
    },
    "business": {
      "id": "vQX9lFoJTwpYBhF5v4aZ",
      "email": "piyushpp4@gmail.com",
      "businessDes": "restr-bar",
      "displayName": "AYUSH",
      "businessName": "PATIO-Desi",
      "businessType": "Restaurant",
      "businessPhone": "9560166829",
      "selectedPlanGroup": "Asia",
      "selectedPlanGroupId": "APXXBjtErQUD33S1zVpr",
      "selectedPlanId": "",
      "selectedPlanName": "",
      "status": "active",
      "businessId": "",
      "name": "PATIO-Desi",
      "type": "Restaurant",
      "adminId": "qWBamav3lhNOPST4paK7tPcY0al2",
      "subscription": {
        "tier": "trial",
        "startDate": {
          "_seconds": 1759344609,
          "_nanoseconds": 120000000
        },
        "expiryDate": {
          "_seconds": 1760554209,
          "_nanoseconds": 120000000
        }
      },
      "createdAt": {
        "_seconds": 1759344609,
        "_nanoseconds": 120000000
      },
      "updatedAt": {
        "_seconds": 1759344609,
        "_nanoseconds": 120000000
      }
    },
    "session": null,
    "participantsCount": 0
  }
}
```

#### Data Usage in UI

| Field | Usage | Component |
|-------|-------|-----------|
| `business.businessName` | Display restaurant name | Login Page (Logo) |
| `space.name` | Display space name (e.g., "Counter top") | Login Page (Table info) |
| `space.id` | Store in SessionContext | Space Page |
| `business.id` | Store in SessionContext | Space Page |

#### Integration Flow

```
1. User scans QR code
   ↓
2. Redirected to /space/{spaceId}
   ↓
3. Space page calls sessionService.getSessionBySpaceId()
   ↓
4. Response stored in SessionContext (localStorage)
   ↓
5. User redirected to /login
   ↓
6. Login page displays business.businessName and space.name
```

#### State Management

**Context**: `SessionContext` (`src/contexts/SessionContext.tsx`)

**Storage**: `localStorage` (key: `morsel_session_data`)

**Hook**: `useSession()`

**Methods**:
- `setSessionData(data)` - Store session data
- `clearSession()` - Clear session data
- `sessionData` - Access current session data
- `isLoading` - Loading state

#### Usage Example

```typescript
import { useSession } from '@/contexts/SessionContext';
import { sessionService } from '@/services/session.service';

function MyComponent() {
  const { sessionData, setSessionData } = useSession();

  useEffect(() => {
    const fetchSession = async () => {
      const response = await sessionService.getSessionBySpaceId('MzIc4dAkf8Z4Aw9DKHAY');
      setSessionData(response.data);
    };
    fetchSession();
  }, []);

  return (
    <div>
      {sessionData?.business.businessName}
      {sessionData?.space.name}
    </div>
  );
}
```

#### Error Handling

**Possible Errors**:
- `404`: Space ID not found
- `500`: Server error
- Network error: Connection failed

**Error Display**: Space page shows error message with "Go to Home" button

---

## Type Definitions

### Location
`src/types/api/session.ts`

### Key Types

#### Space
```typescript
interface Space {
  id: string;
  name: string;
  type: 'counter' | 'table' | string;
  number: number;
  capacity: number;
  customField: string;
  businessId: string;
  areaId: string;
  status: 'available' | 'occupied' | string;
  qrIdentifier: string;
  qrCodeUrl: string;
  currentOrders: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### Business
```typescript
interface Business {
  id: string;
  email: string;
  businessDes: string;
  displayName: string;
  businessName: string;
  businessType: string;
  businessPhone: string;
  selectedPlanGroup: string;
  selectedPlanGroupId: string;
  selectedPlanId: string;
  selectedPlanName: string;
  status: 'active' | 'inactive' | string;
  businessId: string;
  name: string;
  type: string;
  adminId: string;
  subscription: Subscription;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### Timestamp
```typescript
interface Timestamp {
  _seconds: number;
  _nanoseconds: number;
}
```

---

## File Structure

```
src/
├── lib/
│   ├── api/
│   │   ├── client.ts          # Base API client
│   │   └── endpoints.ts       # Endpoint constants
│   └── config.ts              # Environment config
├── services/
│   ├── session.service.ts     # Session API service
│   ├── menu.service.ts        # Menu & Items API service
│   └── order.service.ts       # Queue & Order API service
├── contexts/
│   ├── SessionContext.tsx     # Session state management
│   └── CartContext.tsx        # Cart state with queue sync
├── types/
│   └── api/
│       ├── session.ts         # Session API types
│       ├── menu.ts            # Menu & Items API types
│       └── order.ts           # Queue & Order API types
├── mocks/
│   └── api/
│       ├── menuData.ts        # Hardcoded menu data
│       └── itemsData.ts       # Hardcoded items data
├── components/
│   └── cart/
│       └── BillModal.tsx      # Payment selection & order confirmation
└── app/
    ├── space/
    │   └── [spaceId]/
    │       └── page.tsx       # Space page (Session API caller)
    ├── menu/
    │   └── page.tsx           # Menu page (Menu/Items API)
    └── cart/
        └── page.tsx           # Cart page (Queue/Order API)
```

---

## Testing

### Current Setup

**Hardcoded Space ID**: `MzIc4dAkf8Z4Aw9DKHAY`

**Location**: `src/app/page.tsx` (line 15)

### Test Flow

1. Visit `http://localhost:3000`
2. Redirected to `/space/MzIc4dAkf8Z4Aw9DKHAY`
3. API call made automatically
4. Redirected to `/login`
5. Verify:
   - Restaurant logo shows "PATIO-Desi"
   - Space name shows "Counter top"

---

## Future APIs (To Be Documented)

- [x] Session Start API
- [x] Menu APIs (Currently using hardcoded data)
- [x] Items APIs (Currently using hardcoded data)
- [x] Queue/Cart APIs (Upsert pattern)
- [x] Order Confirmation API
- [ ] Order Status/Tracking APIs
- [ ] Payment Processing APIs
- [ ] Authentication APIs
- [ ] Customer Profile APIs

---

### 2. Start Ordering Session

**Endpoint**: `/ordering-session/start`

**Method**: `POST`

**Description**: Creates an active ordering session for a customer. This must be called after the customer scans a QR code and before they can start ordering. Returns a session ID that is used for all subsequent queue and order operations.

**Service**: `src/services/session.service.ts`

**Service Method**: `sessionService.startSession(data)`

#### Request

**Body**:
```typescript
{
  spaceId: string;
  guestName: string;
  patronId?: string; // Optional, for authenticated users
}
```

**Example**:
```typescript
POST /ordering-session/start

Body:
{
  "spaceId": "MzIc4dAkf8Z4Aw9DKHAY",
  "guestName": "John Doe"
}
```

#### Response

**Status Code**: `200 OK`

**Response Type**: `StartSessionResponse`

**Type Definition**: `src/types/api/session.ts`

```typescript
interface StartSessionResponse {
  data: Session;
}

interface Session {
  id: string;
  spaceId: string;
  businessId: string;
  status: 'active' | 'completed' | 'cancelled' | string;
  participants: SessionParticipant[];
  orders: string[];
  createdAt?: Timestamp;
  expiresAt?: string;
}

interface SessionParticipant {
  sessionUserId: string;
  guestName: string;
  patronId?: string;
  joinedAt?: Timestamp;
}
```

#### Response Example

```json
{
  "data": {
    "id": "session_1234567890",
    "spaceId": "MzIc4dAkf8Z4Aw9DKHAY",
    "businessId": "vQX9lFoJTwpYBhF5v4aZ",
    "status": "active",
    "participants": [
      {
        "sessionUserId": "user_1234567890_xyz",
        "guestName": "John Doe"
      }
    ],
    "orders": [],
    "expiresAt": "2025-12-04T15:00:00Z"
  }
}
```

#### Data Usage in UI

| Field | Usage | Component |
|-------|-------|-----------|
| `session.id` | Used for queue and order API calls | CartContext (queue sync) |
| `session.status` | Display session status | Session tracking |
| `session.participants` | Show who's at the table | Participant list |
| `session.businessId` | Business context | Menu/order operations |

#### Integration Flow

```
1. User scans QR code
   ↓
2. GET /ordering-session/space/{spaceId}
   (Get space and business info)
   ↓
3. User enters name on /login page
   ↓
4. POST /ordering-session/start
   (Creates active session)
   ↓
5. session.id stored in SessionContext
   ↓
6. Navigate to /menu
   ↓
7. User adds items → Queue API uses session.id ✓
```

#### State Management

**Context**: `SessionContext` (`src/contexts/SessionContext.tsx`)

**Storage**: `localStorage` (key: `morsel_session_data`)

**Updated After**: Login page submission

**Used By**: CartContext for queue/order operations

#### Usage Example

```typescript
import { sessionService } from '@/services/session.service';
import { useSession } from '@/contexts/SessionContext';

function LoginPage() {
  const { sessionData, setSessionData } = useSession();

  const handleLogin = async (guestName: string) => {
    // Start the session
    const sessionResponse = await sessionService.startSession({
      spaceId: sessionData.space.id,
      guestName,
    });

    // Update context with active session
    setSessionData({
      ...sessionData,
      session: sessionResponse.data,
    });

    // Now user can order - session.id available for queue API
    router.push('/menu');
  };
}
```

#### Error Handling

**Possible Errors**:
- `400`: Invalid request (missing spaceId or guestName)
- `404`: Space not found
- `409`: Session already exists for this space
- `500`: Server error

**Error Display**: Shows error message, allows user to continue in offline mode (queue sync will be skipped)

#### Notes

- Session must be started **before** user can add items to cart
- Without active session, queue sync will be skipped (offline mode)
- Session ID is required for both queue and order confirmation APIs
- Multiple participants can join the same session at a table
- Session auto-expires after configured time period

---

### 3. Get Active Menus by Business ID

**Endpoint**: `/business/menus/active/{businessId}`

**Method**: `GET`

**Description**: Fetches all active menu categories for a business **with items already populated**. The API returns complete menu objects with their items nested inside the `items` array, eliminating the need for separate item fetching and client-side joining.

**Service**: `src/services/menu.service.ts`

**Service Method**: `menuService.getMenuByBusinessId(businessId)` or `menuService.getMenusWithItems(businessId)`

#### Request

**URL Parameters**:
- `businessId` (string, required): The business identifier

**Example**:
```typescript
GET /business/menus/active/vQX9lFoJTwpYBhF5v4aZ
```

#### Response

**Status Code**: `200 OK`

**Response Type**: `MenuResponse`

**Type Definition**: `src/types/api/menu.ts`

```typescript
interface MenuResponse {
  data: Menu[];
}

interface Menu {
  id: string;
  businessId: string;
  name: string;
  description: string;
  type: 'food' | 'beverage' | 'dessert' | 'mixed' | string;
  availability: {
    startTime: string;
    endTime: string;
    days: string[] | string;
  };
  status: 'active' | 'inactive' | string;
  createdAt: Timestamp;
  tags: string[];
  itemIds: string[];
  updatedAt: Timestamp;
  items?: MenuItem[]; // Items are populated in the response
}

interface MenuItem {
  id: string;
  businessId: string;
  name: string;
  description: string;
  type: 'main' | 'dessert' | 'beverage' | 'appetizer' | string;
  price: number;
  preparationTime: string;
  category: string;
  allergens: string[];
  dietary: string[];
  variants: ItemVariant[];
  addons: ItemAddon[];
  createdAt: Timestamp;
  status: 'active' | 'inactive' | string;
  updatedAt: Timestamp;
}
```

#### Response Example

```json
{
  "data": [
    {
      "id": "886Wmds3KhbuDmhHkjxK",
      "businessId": "vQX9lFoJTwpYBhF5v4aZ",
      "name": "Christmas Special",
      "description": "christmas pro",
      "type": "mixed",
      "availability": {
        "startTime": "10:00",
        "endTime": "12:00",
        "days": ["sunday", "saturday"]
      },
      "status": "active",
      "createdAt": {
        "_seconds": 1759700644,
        "_nanoseconds": 788000000
      },
      "tags": [],
      "itemIds": ["IswAs9mWtL6i97PIlaGt", "cWPT8QwFt5ovyEpJ7yGo", "I9AfVT5TGmcJBy6MXxob"],
      "updatedAt": {
        "_seconds": 1760022667,
        "_nanoseconds": 679000000
      },
      "items": [
        {
          "id": "IswAs9mWtL6i97PIlaGt",
          "businessId": "vQX9lFoJTwpYBhF5v4aZ",
          "name": "Ice cream",
          "description": "ice-creams",
          "type": "dessert",
          "price": 12,
          "preparationTime": "10 minutes",
          "category": "ice-creams",
          "allergens": [],
          "dietary": [],
          "variants": [],
          "addons": [],
          "status": "active",
          "createdAt": {
            "_seconds": 1759697467,
            "_nanoseconds": 561000000
          },
          "updatedAt": {
            "_seconds": 1764725499,
            "_nanoseconds": 271000000
          }
        },
        {
          "id": "cWPT8QwFt5ovyEpJ7yGo",
          "businessId": "vQX9lFoJTwpYBhF5v4aZ",
          "name": "Chicken Burger",
          "description": "A delicious chicken burger with fresh veggies and vegan cheese.",
          "type": "main",
          "price": 14.99,
          "preparationTime": "15 minutes",
          "category": "Vegan",
          "allergens": ["soy", "gluten"],
          "dietary": ["vegan", "gluten-free"],
          "variants": [
            { "name": "Regular", "price": 12.99 },
            { "name": "Double Patty", "price": 15.99 }
          ],
          "addons": [
            { "name": "Avocado", "price": 2 },
            { "name": "Extra Cheese", "price": 1.5 }
          ],
          "status": "active",
          "createdAt": {
            "_seconds": 1759697970,
            "_nanoseconds": 817000000
          },
          "updatedAt": {
            "_seconds": 1764725503,
            "_nanoseconds": 91000000
          }
        }
      ]
    }
  ]
}
```

#### Data Usage in UI

| Field | Usage | Component |
|-------|-------|-----------|
| `name` | Display menu category name | Menu Page (Accordion) |
| `description` | Display menu description | Menu Page |
| `type` | Determine category icon | Menu Page (icon mapping) |
| `status` | Filter active menus only | Menu Page |
| `items` | Display menu items directly | Menu Page |
| `items[].name` | Display item name | MenuItem Component |
| `items[].price` | Display item price | MenuItem Component |
| `items[].variants` | Show size/variant options | Customization Modal |
| `items[].addons` | Show add-on options | Customization Modal |

#### Important Notes

- **Items are pre-populated**: The API returns `items` array with complete item objects, eliminating the need to fetch items separately via `/items/business/{businessId}`
- **No client-side joining needed**: Previously, the service would fetch menus and items separately, then join them. Now the API does this on the backend
- **Simplified service**: `getMenusWithItems()` now simply returns the API data directly without additional processing

---

### 3. Get Items by Business ID (Hardcoded Data)

**Endpoint**: `/items/business/{businessId}` *(Not yet available - using hardcoded data)*

**Method**: `GET`

**Description**: Fetches all menu items for a business. Currently using hardcoded data but structured for easy API integration.

**Service**: `src/services/menu.service.ts`

**Service Method**: `menuService.getItemsByBusinessId(businessId)`

**Hardcoded Data**: `src/mocks/api/itemsData.ts`

#### Request

**URL Parameters**:
- `businessId` (string, required): The business identifier

**Example**:
```typescript
GET /items/business/vQX9lFoJTwpYBhF5v4aZ
```

#### Response

**Status Code**: `200 OK`

**Response Type**: `ItemsResponse`

**Type Definition**: `src/types/api/menu.ts`

```typescript
interface ItemsResponse {
  data: MenuItem[];
}

interface MenuItem {
  id: string;
  businessId: string;
  name: string;
  description: string;
  type: 'main' | 'dessert' | 'beverage' | 'appetizer' | string;
  price: number;
  preparationTime: string;
  category: string;
  allergens: string[];
  dietary: string[];
  variants: ItemVariant[];
  addons: ItemAddon[];
  createdAt: Timestamp;
  status: 'active' | 'inactive' | string;
  updatedAt: Timestamp;
}

interface ItemVariant {
  name: string;
  price: number;
}

interface ItemAddon {
  name: string;
  price: number;
}
```

#### Response Example (Hardcoded Data)

```json
{
  "data": [
    {
      "id": "Hjl7s21cxdfsOiV2OCUf",
      "businessId": "vQX9lFoJTwpYBhF5v4aZ",
      "name": "Cafe Latte",
      "description": "A delicious coffee.",
      "type": "main",
      "price": 17.99,
      "preparationTime": "15 minutes",
      "category": "Drinks",
      "allergens": ["soy", "gluten"],
      "dietary": ["gluten-free"],
      "variants": [
        {
          "name": "Regular",
          "price": 12.99
        },
        {
          "name": "Double shot",
          "price": 15.99
        }
      ],
      "addons": [
        {
          "name": "Irish flavour",
          "price": 2
        }
      ],
      "createdAt": {
        "_seconds": 1759698049,
        "_nanoseconds": 728000000
      },
      "status": "active",
      "updatedAt": {
        "_seconds": 1760021293,
        "_nanoseconds": 655000000
      }
    }
  ]
}
```

#### Data Usage in UI

| Field | Usage | Component |
|-------|-------|-----------|
| `name` | Display item name | Menu Item Card |
| `description` | Display item description | Menu Item Card |
| `price` | Display base price | Menu Item Card |
| `status` | Filter active items only | Menu Page |
| `variants` | Show size/variant options | Customization Modal |
| `addons` | Show add-on options | Customization Modal |
| `allergens` | Display allergen info | Menu Item Details |

#### Integration Flow

```
1. User navigates to /menu
   ↓
2. Menu page checks for sessionData
   ↓
3. If sessionData exists:
   - Call menuService.getMenusWithItems(businessId)
   - Fetches both menus and items in parallel
   - Combines them (menus with populated items)
   ↓
4. Display menus with their items
   ↓
5. If no sessionData:
   - Fall back to mock data
```

#### State Management

**Service**: `menuService` (`src/services/menu.service.ts`)

**Toggle**: `USE_HARDCODED_DATA = true` (line 13)

**Methods**:
- `getMenuByBusinessId(businessId)` - Fetch menus
- `getItemsByBusinessId(businessId)` - Fetch items
- `getMenusWithItems(businessId)` - Fetch and combine both

#### Usage Example

```typescript
import { menuService } from '@/services/menu.service';

// Get menus with populated items
const menusWithItems = await menuService.getMenusWithItems(businessId);

menusWithItems.forEach((menu) => {
  console.log(`Menu: ${menu.name}`);
  menu.items.forEach((item) => {
    console.log(`  - ${item.name}: $${item.price}`);
  });
});
```

---

### 4. Update Queue (Upsert Cart)

**Endpoint**: `/ordering-session/session/{sessionId}/queue`

**Method**: `POST`

**Description**: Updates the customer's queue with current cart items. This is an upsert operation - called every time the cart changes (add/remove/update). Items are stored temporarily in the session queue but NOT sent to the kitchen until confirmed.

**Service**: `src/services/order.service.ts`

**Service Method**: `orderService.updateQueue(sessionId, data)`

#### Request

**URL Parameters**:
- `sessionId` (string, required): The ordering session ID

**Body**:
```typescript
{
  sessionUserId: string;
  items: Array<{
    itemId: string;
    quantity: number;
  }>;
}
```

**Example**:
```typescript
POST /ordering-session/session/abc123/queue

Body:
{
  "sessionUserId": "user_1234567890_xyz",
  "items": [
    {
      "itemId": "Hjl7s21cxdfsOiV2OCUf",
      "quantity": 2
    },
    {
      "itemId": "cWPT8QwFt5ovyEpJ7yGo",
      "quantity": 1
    }
  ]
}
```

#### Response

**Status Code**: `200 OK`

**Response Type**: `QueueUpdateResponse`

**Type Definition**: `src/types/api/order.ts`

```typescript
interface QueueUpdateResponse {
  message: string;
  queue: {
    sessionUserId: string;
    items: QueueItem[];
    updatedAt: string;
  };
}
```

#### Response Example

```json
{
  "message": "Queue updated successfully",
  "queue": {
    "sessionUserId": "user_1234567890_xyz",
    "items": [
      {
        "itemId": "Hjl7s21cxdfsOiV2OCUf",
        "quantity": 2
      },
      {
        "itemId": "cWPT8QwFt5ovyEpJ7yGo",
        "quantity": 1
      }
    ],
    "updatedAt": "2024-12-03T10:30:00Z"
  }
}
```

#### Integration Flow

```
1. User adds/removes/updates cart items
   ↓
2. CartContext's syncQueueWithAPI() is triggered
   ↓
3. Cart items grouped by menuItem.id and quantities summed
   ↓
4. sessionUserId retrieved/generated from localStorage
   ↓
5. POST to /ordering-session/session/{sessionId}/queue
   ↓
6. Queue updated on backend
   ↓
7. Items stored temporarily (NOT sent to kitchen)
```

#### Notes

- This is an **upsert operation** - replaces entire queue for the user
- Called automatically after every cart operation
- Items NOT sent to kitchen until order is confirmed
- If API call fails, cart continues working offline
- sessionUserId is generated per device/user and stored in localStorage

---

### 5. Confirm Order

**Endpoint**: `/ordering-session/session/{sessionId}/queue/confirm`

**Method**: `POST`

**Description**: Confirms the order and sends it to the kitchen. This creates a single order from all items in the queue, sends to kitchen preparation, and clears the queue.

**Service**: `src/services/order.service.ts`

**Service Method**: `orderService.confirmOrder(sessionId, data)`

#### Request

**URL Parameters**:
- `sessionId` (string, required): The ordering session ID

**Body**:
```typescript
{
  sessionUserId: string;
  paymentType: 'cash' | 'card' | 'upi' | string;
}
```

**Example**:
```typescript
POST /ordering-session/session/abc123/queue/confirm

Body:
{
  "sessionUserId": "user_1234567890_xyz",
  "paymentType": "upi"
}
```

#### Response

**Status Code**: `200 OK`

**Response Type**: `OrderConfirmResponse`

**Type Definition**: `src/types/api/order.ts`

```typescript
interface OrderConfirmResponse {
  data: Order;
}

interface Order {
  id: string;
  sessionId: string;
  sessionUserId: string;
  businessId: string;
  spaceId: string;
  patronId?: string | null;
  guestName?: string | null;
  items: OrderItem[];
  total: number;
  payment: PaymentInfo;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
}

interface OrderItem {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface PaymentInfo {
  type: 'cash' | 'card' | 'upi';
  paid: boolean;
}
```

#### Response Example

```json
{
  "data": {
    "id": "QLVWaGEJCIZjQQWtUIG2",
    "sessionId": "kpsX6OtT0NkNcaXhMwSt",
    "sessionUserId": "user_1764891388991_0mwuau8le",
    "businessId": "vQX9lFoJTwpYBhF5v4aZ",
    "spaceId": "MzIc4dAkf8Z4Aw9DKHAY",
    "patronId": null,
    "guestName": null,
    "items": [
      {
        "itemId": "Hjl7s21cxdfsOiV2OCUf",
        "name": "Cafe Latte",
        "quantity": 2,
        "unitPrice": 17.99,
        "totalPrice": 35.98
      },
      {
        "itemId": "cWPT8QwFt5ovyEpJ7yGo",
        "name": "Chicken Burger",
        "quantity": 1,
        "unitPrice": 14.99,
        "totalPrice": 14.99
      }
    ],
    "total": 50.97,
    "payment": {
      "type": "upi",
      "paid": false
    },
    "status": "confirmed"
  }
}
```

#### Data Usage in UI

| Field | Usage | Component |
|-------|-------|-----------|
| `data.id` | Display order number | Order Summary Page |
| `data.status` | Show order status | Order Tracking |
| `data.items` | Display ordered items | Order Summary |
| `data.total` | Show final amount | Order Summary |
| `data.payment.type` | Display payment method | Order Summary |
| `data.payment.paid` | Show payment status | Order Summary |

#### Integration Flow

```
1. User clicks "Confirm Order" in Bill Modal
   ↓
2. User selects payment type (cash/card/UPI)
   ↓
3. CartContext.confirmOrder(paymentType) called
   ↓
4. Validates session and cart not empty
   ↓
5. POST to /ordering-session/session/{sessionId}/queue/confirm
   ↓
6. Backend:
   - Creates order from queue
   - Sends to kitchen
   - Clears queue
   ↓
7. Cart cleared locally
   ↓
8. Navigate to order summary page
```

#### Error Handling

**Possible Errors**:
- `400`: Invalid request (empty cart, missing sessionUserId)
- `404`: Session not found
- `500`: Server error

**Error Display**: Alert shown to user with error message

#### State Management

**Context**: `CartContext` (`src/contexts/CartContext.tsx`)

**Methods**:
- `confirmOrder(paymentType)` - Confirm order and clear cart
- Returns `{ orderId: string, success: boolean }`

#### Usage Example

```typescript
import { useCart } from '@/contexts/CartContext';

function BillModal() {
  const { confirmOrder } = useCart();
  const [selectedPayment, setSelectedPayment] = useState('cash');

  const handleConfirm = async () => {
    try {
      const result = await confirmOrder(selectedPayment);
      if (result.success) {
        router.push('/order-summary');
      }
    } catch (error) {
      alert(error.message);
    }
  };

  return <button onClick={handleConfirm}>Confirm Order</button>;
}
```

---

## Queue Pattern Architecture

### Overview

The queue-based order system allows customers to:
1. Add/remove items freely without immediately sending to kitchen
2. Review and modify their order before final confirmation
3. Select payment method at confirmation time
4. Submit a single consolidated order to the kitchen

### Sequence Diagram

```
Customer              CartContext           API                    Kitchen
   |                      |                  |                        |
   |-- Add Item --------->|                  |                        |
   |                      |-- POST queue --->|                        |
   |                      |<-- Updated ------|                        |
   |                      |                  |                        |
   |-- Add Another ------>|                  |                        |
   |                      |-- POST queue --->|                        |
   |                      |<-- Updated ------|                        |
   |                      |                  |                        |
   |-- Remove Item ------>|                  |                        |
   |                      |-- POST queue --->|                        |
   |                      |<-- Updated ------|                        |
   |                      |                  |                        |
   |-- Confirm Order ---->|                  |                        |
   |                      |-- POST confirm ->|                        |
   |                      |                  |-- Send to kitchen ---->|
   |                      |<-- Order --------|                        |
   |<-- Navigate ---------|                  |                        |
   |    (Order Summary)   |                  |                        |
```

### Key Features

1. **Upsert Pattern**: Queue API replaces entire queue for user on each call
2. **Offline Resilience**: Cart continues working if queue sync fails
3. **Per-User Queue**: Each sessionUserId has independent queue
4. **Single Order**: All queue items combined into one order on confirm
5. **Atomic Confirmation**: Order creation, kitchen notification, and queue clearing happen together

### sessionUserId Generation

The `sessionUserId` is a unique identifier per device/user:

```typescript
// Generated format: user_{timestamp}_{random}
const sessionUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Stored in localStorage
localStorage.setItem('morsel_session_user_id', sessionUserId);
```

**Purpose**:
- Identifies individual users within a shared session (multi-user table)
- Persists across page reloads
- Allows multiple people at same table to have separate queues

---

## Changelog

### 2025-12-06 (Update 7)
- **Updated**: Menu endpoint from `/menu/business/{businessId}` to `/business/menus/active/{businessId}`
- **Enabled**: Real API calls for menu data (changed `USE_HARDCODED_DATA = false`)
- **Updated**: Menu type to include `items?: MenuItem[]` - API now returns populated items
- **Simplified**: `getMenusWithItems()` method - no longer needs to fetch items separately or do client-side joining
- **Removed**: Client-side menu/items joining logic - API does this on the backend
- **Updated**: API documentation with complete response structure showing nested items
- **Note**: Menu API now returns complete data structure, eliminating need for separate items API call

### 2025-12-05 (Update 6)
- **Fixed**: Order confirmation response type to match actual API structure
- **Updated**: `OrderConfirmResponse` type from `{ message, order }` to `{ data: Order }`
- **Updated**: `Order` interface to match actual response (removed timestamps, added `payment` object, changed `totalAmount` to `total`)
- **Updated**: `OrderItem` interface to use `unitPrice` and `totalPrice` instead of single `price` field
- **Fixed**: CartContext to access `response.data.id` instead of `response.order.id`
- **Updated**: API documentation with correct response structure and examples

### 2025-12-05 (Update 5)
- **Updated**: Queue endpoint path from `/session/{sessionId}/queue` to `/ordering-session/session/{sessionId}/queue`
- **Updated**: Confirm order endpoint path from `/session/{sessionId}/queue/confirm` to `/ordering-session/session/{sessionId}/queue/confirm`
- **Updated**: All API documentation to reflect new endpoint paths
- **Note**: Service layer and CartContext remain unchanged - automatically using new paths via endpoints.ts

### 2025-12-05 (Update 4)
- **Added**: Session Start API - POST `/ordering-session/start`
- **Created**: Session interface and participant types
- **Updated**: Login page to call startSession before ordering
- **Updated**: CartContext to use `session.id` from active session
- **Updated**: SessionContext to store active session
- **Added**: Offline mode fallback if session start fails
- **Added**: Loading states for session start
- **Updated**: Complete session lifecycle documentation

### 2024-12-03 (Update 3)
- **Added**: Queue API - POST `/session/{sessionId}/queue`
- **Added**: Confirm Order API - POST `/session/{sessionId}/queue/confirm`
- **Created**: Order service with queue management
- **Created**: Type definitions for Order and Queue
- **Updated**: CartContext to sync with queue API automatically
- **Integrated**: Payment type selection in Bill Modal
- **Updated**: Cart page to use confirmOrder flow
- **Added**: Queue pattern architecture documentation

### 2024-12-03 (Update 2)
- **Added**: Menu API structure (currently hardcoded)
- **Added**: Items API structure (currently hardcoded)
- **Created**: Menu service with toggle for hardcoded/API data
- **Created**: Type definitions for Menu and MenuItem
- **Integrated**: Menu page to display API-structured data
- **Updated**: Header to show table number and participant count
- **Added**: Hardcoded data files for menu and items

### 2024-12-03 (Initial)
- **Added**: Ordering Session API (`/ordering-session/space/{spaceId}`)
- **Created**: Base API client with error handling
- **Created**: SessionContext for state management
- **Created**: Type definitions for Space and Business
- **Integrated**: Login page to display API data

---

## Notes

- All environment variables prefixed with `NEXT_PUBLIC_` are accessible in client-side code
- Session data is persisted in localStorage for offline access
- API client automatically handles JSON parsing and error responses
- All timestamps from API are in Firestore format (`_seconds`, `_nanoseconds`)

---

**Last Updated**: 2025-12-03
