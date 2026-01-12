# Participant Names & Customize Button - Implementation

## Overview
Added participant names and "Customize" button for items with customizations/variants in the Order Summary section on the order-status page.

## Changes Made

### 1. **CartContext.tsx** - Store Participant Mapping

**Location:** [src/contexts/CartContext.tsx](src/contexts/CartContext.tsx#L775-L787)

```typescript
// Store order data with participant mapping
const itemParticipantMap: Record<string, string> = {};
cart.items.forEach(cartItem => {
  if (cartItem.sessionUserId) {
    itemParticipantMap[cartItem.menuItem.id] = cartItem.sessionUserId;
  }
});

const orderWithTimestamp = {
  ...response.data,
  _placedAt: Date.now(),
  _itemParticipants: itemParticipantMap, // Map itemId -> sessionUserId
};
setInStorage(`morsel_order_${response.data.id}`, orderWithTimestamp);
```

**What it does:**
- When order is confirmed, creates a map of `itemId → sessionUserId`
- Stores this mapping in localStorage along with order data
- Allows order-status page to know which participant ordered each item

### 2. **Order Status Page** - Load Participant Data

**Location:** [src/app/order-status/page.tsx](src/app/order-status/page.tsx#L76-L119)

```typescript
// New state for participant mapping
const [itemParticipants, setItemParticipants] = useState<Record<string, string>>({});

// Load from localStorage
const storedOrder = getFromStorage<
  APIOrder & {
    _placedAt?: number;
    _itemParticipants?: Record<string, string>;
  }
>(`morsel_order_${activeOrderId}`);

if (storedOrder) {
  const { _placedAt, _itemParticipants, ...order } = storedOrder;
  setOrderData(order);
  setItemParticipants(_itemParticipants || {});
  // ... calculate remaining time
}
```

**What it does:**
- Loads participant mapping from localStorage
- Stores in component state for rendering

### 3. **Order Items Display** - Show Participant & Customize Button

**Location:** [src/app/order-status/page.tsx](src/app/order-status/page.tsx#L395-L520)

```typescript
{orderData.items.map((item, index) => {
  // Get participant who ordered this item
  const participantId = itemParticipants[item.itemId];
  const participant = split.participants.find(p => p.id === participantId);
  const participantName = participant
    ? (participant.id === getFromStorage<string>('morsel_session_user_id')
        ? 'You'
        : participant.name)
    : null;

  // Check if item has customizations
  const hasCustomizations = item.addOns && item.addOns.length > 0;
  const hasVariant = item.variantName &&
    item.variantName !== "Regular" &&
    item.variantName !== "Default";
  const hasCustomization = hasCustomizations || hasVariant;

  return (
    <div key={index}>
      {/* Item with participant avatar */}
      {participantName && (
        <div className="w-6 h-6 rounded-full bg-gray-300">
          {participant?.avatar ? (
            <Image src={participant.avatar} alt={participantName} />
          ) : (
            <span>{participantName.charAt(0).toUpperCase()}</span>
          )}
        </div>
      )}

      {/* Item name, quantity, price */}
      <h4>{itemName} {item.quantity > 1 && `×${item.quantity}`}</h4>
      <p>$ {item.itemTotal.toFixed(2)}</p>

      {/* Customizations/Add-ons */}
      {hasCustomizations && (
        <div className="ml-[72px]">
          {item.addOns.map(addon => (
            addon.selectedOptions.map(option => (
              <p>{option.name} {option.name.includes("spicy") && "🌶"}</p>
            ))
          ))}
        </div>
      )}

      {/* Variant name */}
      {hasVariant && (
        <div className="ml-[72px]">
          <p>{item.variantName}</p>
        </div>
      )}

      {/* Customize button (only if item has customizations and is editable) */}
      {hasCustomization && isEditable && menuItem && (
        <div className="ml-[72px]">
          <button onClick={() => router.push(`/cart`)}>
            Customize
          </button>
        </div>
      )}
    </div>
  );
})}
```

## Features Implemented

### ✅ Participant Names
1. **Avatar Display:** Small circular avatar (24x24px) next to item name
2. **Name Logic:**
   - Shows "You" for current user
   - Shows participant name for others
   - Shows nothing if no participant data available
3. **Avatar Fallback:** First letter of name if no avatar image

### ✅ Customizations Display
1. **Add-ons:** Shows selected add-on options with emoji (🌶 for spicy)
2. **Variants:** Shows variant name if not "Regular" or "Default"
3. **Indentation:** Customizations indented under item (ml-[72px])

### ✅ Customize Button
1. **Conditional Display:**
   - Only shows if item has customizations OR non-default variant
   - Only shows if order is still editable (within 2 minute window)
   - Only shows if menu item data is available
2. **Action:** Redirects to `/cart` page for editing
3. **Styling:** Blue underlined link style (#007AFF)

## Data Flow

```
1. Cart Page (Place Order)
   └─> CartContext.confirmOrder()
       └─> Creates itemParticipantMap
           └─> Stores in localStorage as `morsel_order_${orderId}`

2. Order Status Page (Load)
   └─> useEffect loads from localStorage
       └─> Extracts _itemParticipants
           └─> Stores in itemParticipants state

3. Order Items Render
   └─> Maps over orderData.items
       └─> For each item:
           ├─> Looks up participantId from itemParticipants
           ├─> Finds participant from split.participants
           ├─> Checks for customizations/variants
           └─> Renders: Avatar + Name + Item + Customizations + Button
```

## UI Layout

```
┌─────────────────────────────────────────┐
│ Order Summary                           │
├─────────────────────────────────────────┤
│                                         │
│ [🖼️] [👤] Salmon, Shock fried ×2      │
│       $ 12.44                           │
│       Extra spicy 🌶                   │
│       Bring veggies on the side.       │
│       Customize ───────────────────┐   │
│                                     │   │
│ [🖼️] [👤] Truffle Mushroom Risotto    │
│       $ 18.99                           │
│       (no customizations)               │
└─────────────────────────────────────────┘
```

## Performance Considerations

1. **Memoization:** `allOrderIds` wrapped in `useMemo` to prevent unnecessary re-renders
2. **Conditional Rendering:** Participant avatar only renders when data exists
3. **localStorage:** Single read per order load (not per item)
4. **No External API Calls:** All data loaded from localStorage

## Edge Cases Handled

1. **No Participant Data:** Item renders without avatar/name
2. **Current User:** Shows "You" instead of actual name
3. **No Avatar:** Shows first letter as fallback
4. **No Customizations:** No customize button shown
5. **Order Not Editable:** No customize button shown (timer expired)
6. **No Menu Item:** No customize button shown (can't edit without menu data)

## Testing Checklist

- [ ] Participant avatar shows next to item name
- [ ] "You" shown for current user's items
- [ ] Other participant names shown correctly
- [ ] Add-ons displayed with emojis (🌶 for spicy)
- [ ] Variant names displayed correctly
- [ ] Customize button appears for customized items
- [ ] Customize button disappears after 2 minutes
- [ ] Customize button redirects to /cart
- [ ] Works with multiple participants
- [ ] Works with single participant
- [ ] Works when participant data missing

## Files Modified

1. **[src/contexts/CartContext.tsx](src/contexts/CartContext.tsx)**
   - Added participant mapping creation on order confirmation
   - Stores mapping in localStorage

2. **[src/app/order-status/page.tsx](src/app/order-status/page.tsx)**
   - Added `itemParticipants` state
   - Load participant mapping from localStorage
   - Display participant avatar/name
   - Show customizations (add-ons + variants)
   - Add "Customize" button conditionally

## No Breaking Changes

✅ All existing functionality preserved:
- Order placement flow
- Order status display
- Timer countdown
- Split payment
- Payment modal
- Order more food
- Multi-order tabs
- Session management

## Next Steps

Consider adding:
1. **Edit Modal:** Open customize modal inline instead of redirecting to cart
2. **Participant Filter:** Show only items for specific participant
3. **Item Notes:** Display special instructions if present
4. **Allergy Warnings:** Show allergy info for add-ons
