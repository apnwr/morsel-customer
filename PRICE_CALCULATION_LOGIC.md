# Price Calculation Logic

This document explains how prices are calculated throughout the customer app, including base prices, variants, addons, and taxes.

---

## 📊 Price Structure Overview

```
Base Item Price
    ↓
+ Variant Price Modifier (if selected)
    ↓
+ Addon Price Modifiers (sum of all selected addons)
    ↓
= Unit Price (price per single item)
    ↓
× Quantity
    ↓
= Item Total
    ↓
Sum all items → Subtotal
    ↓
+ Tax (8% of Subtotal)
    ↓
= Final Total
```

---

## 🔢 Calculation Functions

### 1. **calculateItemTotal** - [src/contexts/CartContext.tsx:41-50](src/contexts/CartContext.tsx#L41-L50)

**Purpose:** Calculate the total price for a single cart item including all customizations.

```typescript
function calculateItemTotal(
  menuItem: MenuItem,
  customizations: Customization[],
  quantity: number
): number {
  let total = menuItem.price;  // Start with base price

  // Add all customization price modifiers (variants + addons)
  customizations.forEach((custom) => {
    total += custom.priceModifier;
  });

  return total * quantity;  // Multiply by quantity
}
```

**Example:**
```
Burger (base): $10
Variant (Large): +$2
Addon (Extra Cheese): +$1
Addon (Bacon): +$1.50
Quantity: 2

Calculation:
Unit Price = $10 + $2 + $1 + $1.50 = $14.50
Item Total = $14.50 × 2 = $29.00
```

---

### 2. **calculateCartTotals** - [src/contexts/CartContext.tsx:52-57](src/contexts/CartContext.tsx#L52-L57)

**Purpose:** Calculate cart subtotal, tax, and final total.

```typescript
const TAX_RATE = 0.08; // 8% tax rate

function calculateCartTotals(items: CartItem[]): {
  subtotal: number;
  tax: number;
  total: number
} {
  // Sum all item totals
  const subtotal = items.reduce((sum, item) => sum + item.itemTotal, 0);

  // Calculate tax (8% of subtotal)
  const tax = subtotal * TAX_RATE;

  // Final total (subtotal + tax)
  const total = subtotal + tax;

  return { subtotal, tax, total };
}
```

**Example:**
```
Item 1: $29.00
Item 2: $15.00
-----------------
Subtotal: $44.00
Tax (8%): $3.52
-----------------
Total: $47.52
```

---

## 💰 Price Display Locations

### 1. **Menu Page** - Base Prices
- Shows only base item price
- No variant/addon modifiers shown here
- Location: Menu item cards

### 2. **Customization Modal** - Variant & Addon Prices
- **Variants:** Show as `+ $X.XX` (price difference from base)
- **Addons:** Show as `+ $X.XX` (additional cost)
- Only show if `priceModifier > 0` (free addons don't show price)
- Location: [src/components/order/CustomizationModal.tsx:462-471](src/components/order/CustomizationModal.tsx#L462-L471)

**Display Logic:**
```typescript
{choice.priceModifier > 0 && (
  <span className="font-bold text-sm">
    +${choice.priceModifier.toFixed(2)}
  </span>
)}
```

**Examples:**
```
Variant - Small: $10.00 (base price, no modifier shown)
Variant - Large: + $2.00 (shows modifier)

Addon - Ketchup: (free, no price shown)
Addon - Extra Cheese: + $1.00 (shows modifier)
```

### 3. **Header Cart Button** - Subtotal (NO TAX)
- Shows **subtotal only** (before tax)
- Updates in real-time as items added
- Location: [src/components/layout/Header.tsx:136](src/components/layout/Header.tsx#L136)

**Display:**
```
🛒 $44.00
```

### 4. **Cart Page** - Full Breakdown
- **Subtotal:** Sum of all item totals (no tax)
- **Tax:** 8% of subtotal
- **Total:** Subtotal + Tax
- Location: Cart page bill section

**Display:**
```
Subtotal:    $44.00
Tax (8%):     $3.52
──────────────────
Total:       $47.52
```

---

## 🔄 Data Flow

### Step 1: User Adds Item to Cart

```
Menu Page
    ↓
User clicks "Add" on item
    ↓
CustomizationModal opens
    ↓
User selects:
  - Variant: Large (+$2)
  - Addons: Extra Cheese (+$1), Bacon (+$1.50)
    ↓
User clicks "Add to Cart"
    ↓
CartContext.addItem() called
```

### Step 2: Price Calculation

```typescript
// 1. Build customizations array
const customizations = [
  { optionId: 'variant', priceModifier: 2.00 },
  { optionId: 'addon-0', priceModifier: 1.00 },
  { optionId: 'addon-1', priceModifier: 1.50 }
];

// 2. Calculate item total
const itemTotal = calculateItemTotal(
  menuItem,        // { price: 10.00 }
  customizations,  // [2.00, 1.00, 1.50]
  quantity         // 2
);
// Result: (10 + 2 + 1 + 1.50) × 2 = $29.00

// 3. Add to cart items
cart.items.push({
  id: 'item_123',
  menuItem: menuItem,
  quantity: 2,
  customizations: customizations,
  itemTotal: 29.00  // ← Stored value
});

// 4. Recalculate cart totals
const totals = calculateCartTotals(cart.items);
// Result: { subtotal: 44.00, tax: 3.52, total: 47.52 }
```

### Step 3: Display Updates

```
Header: Shows $44.00 (subtotal, no tax)
Cart Page: Shows full breakdown with tax
```

---

## 🎯 Customization Types

### Radio Buttons (Single Selection) - Variants
- **Used for:** Size variants (Small, Medium, Large)
- **Selection:** Only one can be selected
- **Price Display:** `+ $X.XX` for non-zero prices
- **Example:**
  ```
  ○ Small    (no price - base price)
  ○ Medium   + $2.00
  ○ Large    + $4.00
  ```

### Checkboxes (Multiple Selection) - Addons
- **Used for:** Extra toppings, sauces, etc.
- **Selection:** Multiple can be selected (up to maxSelection)
- **Price Display:** `+ $X.XX` for non-zero prices
- **Example:**
  ```
  ☐ Ketchup       (free, no price)
  ☐ Mayo          (free, no price)
  ☑ Extra Cheese  + $1.00
  ☑ Bacon         + $1.50
  ```

---

## 🧮 Real-World Example

### Scenario: Two Friends Ordering

**User A Orders:**
- Classic Burger (Base: $10)
  - Size: Large (+$2)
  - Extra Cheese (+$1)
  - Quantity: 1
- Item Total: $13.00

**User B Orders:**
- Fries (Base: $5)
  - Quantity: 2
- Item Total: $10.00

**Cart Calculation:**
```
Item 1 (User A): $13.00
Item 2 (User B): $10.00
────────────────────────
Subtotal:        $23.00
Tax (8%):         $1.84
────────────────────────
Total:           $24.84
```

**Display:**
- **Header:** Shows `$23.00` (subtotal only)
- **Cart Page:** Shows full breakdown with `$24.84` total

---

## 🔍 API Integration

### Queue Sync Payload

When syncing to the API, the frontend sends:

```json
{
  "sessionUserId": "user_123",
  "items": [
    {
      "itemId": "burger_001",
      "quantity": 1,
      "variantIndex": 2,  // Large (index of variant in array)
      "addOns": [
        {
          "addonIndex": 0,  // Cheese addon category
          "selectedOptions": [1]  // Extra cheese option
        }
      ]
    }
  ]
}
```

**Backend Response:**
Backend returns detailed pricing breakdown:

```json
{
  "orderQueue": [
    {
      "items": [
        {
          "itemId": "burger_001",
          "name": "Classic Burger",
          "quantity": 1,
          "variantIndex": 2,
          "variantName": "Large",
          "variantPrice": 12.00,  // Base + variant
          "addOns": [
            {
              "addonIndex": 0,
              "addonName": "Cheese",
              "selectedOptions": [
                { "name": "Extra Cheese", "price": 1.00 }
              ],
              "optionsTotalPrice": 1.00
            }
          ],
          "addonsTotalPrice": 1.00,
          "unitPrice": 13.00,  // variantPrice + addons
          "itemTotal": 13.00   // unitPrice × quantity
        }
      ]
    }
  ]
}
```

---

## 📝 Important Notes

1. **Tax is ONLY applied at cart level** - Individual item prices don't include tax
2. **Free addons/variants don't show prices** - Only display if `priceModifier > 0`
3. **Variant pricing is relative** - Variants show price difference from base, not absolute price
4. **Header shows subtotal** - Makes it clear what the food costs before tax
5. **Cart shows total with tax** - Final amount user will pay
6. **Price modifiers are cumulative** - All customization costs add together

---

## 🛠️ Testing Price Calculations

**Test Case 1: Simple Item**
```
Item: Fries ($5)
No customizations
Quantity: 1

Expected:
- Item Total: $5.00
- If only item in cart:
  - Header: $5.00
  - Cart Subtotal: $5.00
  - Cart Tax: $0.40
  - Cart Total: $5.40
```

**Test Case 2: Complex Item**
```
Item: Burger ($10)
Variant: Large (+$2)
Addons: Extra Cheese (+$1), Bacon (+$1.50)
Quantity: 2

Expected:
- Unit Price: $10 + $2 + $1 + $1.50 = $14.50
- Item Total: $14.50 × 2 = $29.00
- If only item in cart:
  - Header: $29.00
  - Cart Subtotal: $29.00
  - Cart Tax: $2.32
  - Cart Total: $31.32
```

**Test Case 3: Multiple Items**
```
Item 1: Burger ($13) × 1 = $13.00
Item 2: Fries ($5) × 2 = $10.00

Expected:
- Cart Subtotal: $23.00
- Cart Tax: $1.84
- Cart Total: $24.84
- Header: $23.00
```

---

## 🔧 Related Files

1. **Price Calculation:**
   - [src/contexts/CartContext.tsx:41-57](src/contexts/CartContext.tsx#L41-L57)

2. **Price Display:**
   - [src/components/order/CustomizationModal.tsx:462-471](src/components/order/CustomizationModal.tsx#L462-L471)
   - [src/components/layout/Header.tsx:71-136](src/components/layout/Header.tsx#L71-L136)

3. **Type Definitions:**
   - [src/types/cart.ts](src/types/cart.ts)
   - [src/types/menu.ts](src/types/menu.ts)

---

## 📊 Tax Rate Configuration

**Current Tax Rate:** 8% (0.08)

To change the tax rate, update the constant in [src/contexts/CartContext.tsx:38](src/contexts/CartContext.tsx#L38):

```typescript
const TAX_RATE = 0.08; // Change this value (0.08 = 8%)
```

This will automatically update all calculations throughout the app.
