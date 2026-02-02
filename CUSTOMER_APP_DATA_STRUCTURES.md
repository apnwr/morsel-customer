# Customer App Data Structures Documentation

This document describes the data structures used in the Morsel system that the customer-facing web app (Next.js) needs to implement. It covers business branding assets (logos, images) and menu item addons.

---

## Table of Contents

1. [Business Branding & Assets](#business-branding--assets)
   - [Business Logo](#business-logo)
   - [Menu Item Images](#menu-item-images)
   - [Variant Images](#variant-images)
2. [Menu Item Addons](#menu-item-addons)
   - [Addon Structure](#addon-structure)
   - [Selection Rules](#selection-rules)
   - [Implementation Guidelines](#implementation-guidelines)
   - [Complete Next.js Component Example](#complete-nextjs-component-example)

---

## Business Branding & Assets

### Business Logo

The business logo is uploaded via the dashboard and stored in Firebase Storage. It's accessible through the business API response.

#### API Response Structure

```typescript
interface Business {
  id: string;
  name: string;
  displayName: string;
  logo?: string;  // Firebase Storage URL - publicly accessible
  // ... other fields
}
```

#### Example Response

```json
{
  "id": "business_abc123",
  "name": "Pizza Palace",
  "displayName": "Pizza Palace",
  "logo": "https://firebasestorage.googleapis.com/v0/b/morsel-db7d8.appspot.com/o/business_abc123%2Flogo%2F1705123456_abc123_logo.png?alt=media&token=xyz"
}
```

#### Storage Path Structure

```
{businessId}/logo/{timestamp}_{random}_{filename}.{ext}
```

Example: `business_abc123/logo/1705123456_abc123_company_logo.png`

#### Usage in Customer App (Next.js)

```tsx
import Image from 'next/image';

function BusinessHeader({ business }: { business: Business }) {
  return (
    <div className="flex items-center gap-4">
      {business.logo ? (
        <Image 
          src={business.logo} 
          alt={`${business.displayName} logo`}
          width={80}
          height={80}
          className="object-contain rounded-lg"
          unoptimized  // Required for external Firebase URLs
        />
      ) : (
        <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-400">
            {business.displayName?.charAt(0) || 'B'}
          </span>
        </div>
      )}
      <h1 className="text-xl font-bold">{business.displayName}</h1>
    </div>
  );
}
```

#### Important Notes

- Logo URL is a direct Firebase Storage URL with access token
- URLs are long-lived but may expire; handle 403 errors gracefully
- Logo may be `undefined` or `null` if not uploaded - always provide a fallback
- Recommended to cache the image locally after first fetch

---

### Menu Item Images

Menu items can have multiple images. The new format uses `item_images` array with both URL and storage path.

#### API Response Structure

```typescript
interface MenuItem {
  id: string;
  name: string;
  price: number;
  // New format (preferred)
  item_images?: Array<{
    url: string;   // Firebase Storage URL - publicly accessible
    path: string;  // Storage path (for internal use)
  }>;
  // Legacy formats (may still exist in older data)
  images?: string[];  // Array of URLs
  image?: string;     // Single URL
}
```

#### Example Response

```json
{
  "id": "item_xyz789",
  "name": "Margherita Pizza",
  "price": 299,
  "item_images": [
    {
      "url": "https://firebasestorage.googleapis.com/v0/b/morsel-db7d8.appspot.com/o/business_abc123%2Fbranches%2Fbranch_456%2Fitems%2Fitem_xyz789%2F1705123456_photo1.jpg?alt=media&token=xyz",
      "path": "business_abc123/branches/branch_456/items/item_xyz789/1705123456_photo1.jpg"
    },
    {
      "url": "https://firebasestorage.googleapis.com/v0/b/morsel-db7d8.appspot.com/o/business_abc123%2Fbranches%2Fbranch_456%2Fitems%2Fitem_xyz789%2F1705123457_photo2.jpg?alt=media&token=abc",
      "path": "business_abc123/branches/branch_456/items/item_xyz789/1705123457_photo2.jpg"
    }
  ]
}
```

#### Storage Path Structure

```
{businessId}/branches/{branchId}/items/{itemId}/{timestamp}_{random}_{filename}.{ext}
```

#### Helper Function to Get Item Image

```typescript
// Handle all image formats for backward compatibility
function getItemImageUrl(item: MenuItem): string | undefined {
  // 1. Check item_images (new format with { url, path } objects)
  if (item.item_images && Array.isArray(item.item_images) && item.item_images.length > 0) {
    const firstImage = item.item_images[0];
    if (typeof firstImage === 'object' && firstImage.url) {
      return firstImage.url;
    }
  }
  
  // 2. Check images array (legacy format)
  if (item.images && Array.isArray(item.images) && item.images.length > 0) {
    return item.images[0];
  }
  
  // 3. Check single image field (oldest legacy format)
  if (item.image) {
    return item.image;
  }
  
  return undefined;
}

// Get all images
function getAllItemImages(item: MenuItem): string[] {
  // New format
  if (item.item_images && Array.isArray(item.item_images) && item.item_images.length > 0) {
    return item.item_images
      .filter(img => typeof img === 'object' && img.url)
      .map(img => img.url);
  }
  
  // Legacy array format
  if (item.images && Array.isArray(item.images)) {
    return item.images;
  }
  
  // Legacy single image
  if (item.image) {
    return [item.image];
  }
  
  return [];
}
```

---

### Variant Images

Menu item variants can also have their own images.

#### Structure

```typescript
interface Variant {
  name: string;
  price: number;
  description?: string;
  images?: Array<{
    url: string;
    path: string;
  }>;
}
```

#### Example

```json
{
  "name": "Large",
  "price": 399,
  "description": "12 inch pizza",
  "images": [
    {
      "url": "https://firebasestorage.googleapis.com/...",
      "path": "business_abc123/branches/branch_456/items/item_xyz789/variants/large_photo.jpg"
    }
  ]
}
```

---

## Menu Item Addons

Each menu item can have an `addons` array containing addon groups. Each addon group represents a category of add-ons (e.g., "Extra Cheese", "Toppings", "Sauces").

### Addon Structure

```typescript
interface MenuItem {
  id: string;
  name: string;
  price: number;
  // ... other item fields
  addons?: AddonGroup[];
}

interface AddonGroup {
  add_on_title: string;      // Display name for the addon group
  min_selection: number;     // Minimum selections required (0 = optional)
  max_selection: number;     // Maximum selections allowed
  add_on_options: AddonOption[];  // Available options
}

interface AddonOption {
  name: string;   // Option name (e.g., "Mozzarella")
  price: number;  // Additional price for this option
}
```

### Example JSON Response

```json
{
  "id": "item_123",
  "name": "Margherita Pizza",
  "price": 299,
  "item_images": [
    {
      "url": "https://firebasestorage.googleapis.com/...",
      "path": "business_abc123/branches/branch_456/items/item_123/photo.jpg"
    }
  ],
  "addons": [
    {
      "add_on_title": "Make it Extra Cheesy - Optional",
      "min_selection": 0,
      "max_selection": 3,
      "add_on_options": [
        { "name": "Mozzarella", "price": 60 },
        { "name": "Cheddar", "price": 60 },
        { "name": "Feta", "price": 60 }
      ]
    },
    {
      "add_on_title": "Choose Your Sauce",
      "min_selection": 1,
      "max_selection": 1,
      "add_on_options": [
        { "name": "Marinara", "price": 0 },
        { "name": "BBQ", "price": 20 },
        { "name": "Garlic Butter", "price": 20 }
      ]
    },
    {
      "add_on_title": "Extra Toppings",
      "min_selection": 0,
      "max_selection": 5,
      "add_on_options": [
        { "name": "Pepperoni", "price": 40 },
        { "name": "Mushrooms", "price": 30 },
        { "name": "Olives", "price": 30 },
        { "name": "Jalapeños", "price": 25 }
      ]
    }
  ]
}
```

### Selection Rules

| min_selection | max_selection | Behavior | UI Suggestion |
|---------------|---------------|----------|---------------|
| `0` | `1` | Optional single-select | Radio buttons (can be cleared) |
| `1` | `1` | Required single-select | Radio buttons (must choose one) |
| `0` | `N` | Optional multi-select | Checkboxes (0 to N options) |
| `1` | `N` | Required multi-select | Checkboxes (at least 1, up to N) |
| `M` | `N` | Must select M to N options | Checkboxes with counter |

### Implementation Guidelines

#### 1. UI Display Rules

```typescript
function getAddonGroupConfig(group: AddonGroup) {
  const isRequired = group.min_selection >= 1;
  const isSingleSelect = group.max_selection === 1;
  
  return {
    isRequired,
    isSingleSelect,
    badge: isRequired ? 'Required' : 'Optional',
    hint: isSingleSelect 
      ? 'Choose one' 
      : `Select up to ${group.max_selection}`,
    inputType: isSingleSelect ? 'radio' : 'checkbox',
  };
}
```

#### 2. Price Calculation

```typescript
function calculateItemTotal(
  basePrice: number,
  quantity: number,
  selectedAddons: Array<{ groupIndex: number; optionIndex: number }>,
  addonGroups: AddonGroup[]
): number {
  let addonTotal = 0;
  
  for (const selection of selectedAddons) {
    const group = addonGroups[selection.groupIndex];
    const option = group.add_on_options[selection.optionIndex];
    addonTotal += option.price;
  }
  
  return (basePrice + addonTotal) * quantity;
}
```

#### 3. Validation Before Order

```typescript
function validateAddonSelections(
  addonGroups: AddonGroup[],
  selections: Map<number, number[]>  // groupIndex -> selected option indices
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  addonGroups.forEach((group, groupIndex) => {
    const selectedCount = selections.get(groupIndex)?.length || 0;
    
    if (selectedCount < group.min_selection) {
      errors.push(
        `"${group.add_on_title}" requires at least ${group.min_selection} selection(s)`
      );
    }
    
    if (selectedCount > group.max_selection) {
      errors.push(
        `"${group.add_on_title}" allows maximum ${group.max_selection} selection(s)`
      );
    }
  });
  
  return { valid: errors.length === 0, errors };
}
```

#### 4. Order Payload Structure

When submitting an order, include selected addons:

```typescript
interface OrderItem {
  itemId: string;
  quantity: number;
  selectedAddons?: SelectedAddon[];
  specialInstructions?: string;
}

interface SelectedAddon {
  groupName: string;      // The add_on_title
  optionName: string;     // The selected option name
  price: number;          // Price of the selected option
}
```

**Example Order Payload:**

```json
{
  "items": [
    {
      "itemId": "item_123",
      "quantity": 2,
      "selectedAddons": [
        {
          "groupName": "Make it Extra Cheesy - Optional",
          "optionName": "Mozzarella",
          "price": 60
        },
        {
          "groupName": "Make it Extra Cheesy - Optional",
          "optionName": "Cheddar",
          "price": 60
        },
        {
          "groupName": "Choose Your Sauce",
          "optionName": "BBQ",
          "price": 20
        }
      ],
      "specialInstructions": "Extra crispy crust please"
    }
  ]
}
```

### Complete Next.js Component Example

```tsx
'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';

interface ItemDetailProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem, quantity: number, selectedAddons: SelectedAddon[]) => void;
}

export function ItemDetailView({ item, onAddToCart }: ItemDetailProps) {
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState<Map<number, number[]>>(new Map());
  
  const imageUrl = useMemo(() => getItemImageUrl(item), [item]);
  
  const handleOptionToggle = (groupIndex: number, optionIndex: number) => {
    const group = item.addons![groupIndex];
    const currentSelections = selections.get(groupIndex) || [];
    
    let newSelections: number[];
    
    if (group.max_selection === 1) {
      // Single select - replace or clear
      newSelections = currentSelections.includes(optionIndex) ? [] : [optionIndex];
    } else {
      // Multi select - toggle
      if (currentSelections.includes(optionIndex)) {
        newSelections = currentSelections.filter(i => i !== optionIndex);
      } else if (currentSelections.length < group.max_selection) {
        newSelections = [...currentSelections, optionIndex];
      } else {
        return; // Max reached
      }
    }
    
    const updated = new Map(selections);
    updated.set(groupIndex, newSelections);
    setSelections(updated);
  };
  
  const validation = useMemo(() => {
    if (!item.addons) return { valid: true, errors: [] };
    return validateAddonSelections(item.addons, selections);
  }, [item.addons, selections]);
  
  const totalPrice = useMemo(() => {
    if (!item.addons) return item.price * quantity;
    
    const selectedAddons: Array<{ groupIndex: number; optionIndex: number }> = [];
    selections.forEach((optionIndices, groupIndex) => {
      optionIndices.forEach(optionIndex => {
        selectedAddons.push({ groupIndex, optionIndex });
      });
    });
    
    return calculateItemTotal(item.price, quantity, selectedAddons, item.addons);
  }, [item, quantity, selections]);
  
  const handleAddToCart = () => {
    if (!validation.valid) return;
    
    const selectedAddons: SelectedAddon[] = [];
    selections.forEach((optionIndices, groupIndex) => {
      const group = item.addons![groupIndex];
      optionIndices.forEach(optionIndex => {
        const option = group.add_on_options[optionIndex];
        selectedAddons.push({
          groupName: group.add_on_title,
          optionName: option.name,
          price: option.price,
        });
      });
    });
    
    onAddToCart(item, quantity, selectedAddons);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden max-w-2xl mx-auto">
      {/* Item Image */}
      {imageUrl && (
        <div className="relative w-full h-64">
          <Image 
            src={imageUrl} 
            alt={item.name}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}
      
      {/* Item Info */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
          <span className="text-xl font-semibold text-gray-700">
            ${(item.price / 100).toFixed(2)}
          </span>
        </div>
        {item.description && (
          <p className="text-gray-600 mb-6">{item.description}</p>
        )}
      </div>
      
      {/* Addon Groups */}
      {item.addons?.map((group, groupIndex) => {
        const config = getAddonGroupConfig(group);
        const selectedIndices = selections.get(groupIndex) || [];
        
        return (
          <div key={groupIndex} className="border-t-8 border-gray-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                {group.add_on_title}
              </h3>
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                config.isRequired 
                  ? 'bg-red-100 text-red-700' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {config.badge}
              </span>
            </div>
            
            {group.max_selection > 1 && (
              <p className="text-sm text-gray-500 mb-3">
                {selectedIndices.length}/{group.max_selection} selected
              </p>
            )}
            
            <div className="space-y-2">
              {group.add_on_options.map((option, optionIndex) => {
                const isSelected = selectedIndices.includes(optionIndex);
                const isDisabled = !isSelected && selectedIndices.length >= group.max_selection;
                
                return (
                  <button
                    key={optionIndex}
                    type="button"
                    onClick={() => handleOptionToggle(groupIndex, optionIndex)}
                    disabled={isDisabled}
                    className={`w-full flex items-center p-3 rounded-lg border transition-colors ${
                      isSelected 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {/* Radio or Checkbox indicator */}
                    <div className={`w-5 h-5 mr-3 border-2 flex items-center justify-center ${
                      config.isSingleSelect ? 'rounded-full' : 'rounded'
                    } ${isSelected ? 'border-red-500 bg-red-500' : 'border-gray-300'}`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    
                    <span className="flex-1 text-left text-gray-900">{option.name}</span>
                    
                    {option.price > 0 && (
                      <span className="text-gray-500">
                        +${(option.price / 100).toFixed(2)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      
      {/* Quantity Selector */}
      <div className="border-t border-gray-200 p-6">
        <div className="flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xl font-bold"
          >
            -
          </button>
          <span className="text-xl font-semibold w-8 text-center">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity(quantity + 1)}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xl font-bold"
          >
            +
          </button>
        </div>
      </div>
      
      {/* Validation Errors */}
      {validation.errors.length > 0 && (
        <div className="mx-6 mb-4 p-4 bg-red-50 rounded-lg">
          {validation.errors.map((error, idx) => (
            <p key={idx} className="text-red-600 text-sm">{error}</p>
          ))}
        </div>
      )}
      
      {/* Add to Cart Button */}
      <div className="p-6 pt-0">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!validation.valid}
          className={`w-full py-4 rounded-xl text-white font-semibold text-lg transition-colors ${
            validation.valid 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          Add to Cart - ${(totalPrice / 100).toFixed(2)}
        </button>
      </div>
    </div>
  );
}
```

---

## Field Reference

### Business Fields

| Field | Type | Description |
|-------|------|-------------|
| `logo` | `string?` | Firebase Storage URL for business logo |

### Menu Item Fields

| Field | Type | Description |
|-------|------|-------------|
| `item_images` | `Array<{url, path}>?` | New format - array of image objects |
| `images` | `string[]?` | Legacy format - array of URLs |
| `image` | `string?` | Oldest legacy format - single URL |
| `addons` | `AddonGroup[]?` | Array of addon groups |

### Addon Group Fields

| Field | Type | Description |
|-------|------|-------------|
| `add_on_title` | `string` | Display name for the addon group |
| `min_selection` | `number` | Minimum required selections (0 = optional) |
| `max_selection` | `number` | Maximum allowed selections |
| `add_on_options` | `AddonOption[]` | List of available options |

### Addon Option Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Option display name |
| `price` | `number` | Additional price for this option |

---

## Notes

- All image URLs are Firebase Storage URLs with access tokens
- Prices may be in cents or decimal format - confirm with backend
- Always handle cases where images/addons are undefined or empty
- The `add_on_title` may include hints like "Optional" or "Required" - display as-is

### Next.js Image Configuration

To use Firebase Storage URLs with Next.js Image component, add to `next.config.ts`:

```typescript
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/v0/b/**',
      },
    ],
  },
};
```

Alternatively, use `unoptimized` prop on Image components for external URLs:

```tsx
<Image src={url} alt="..." unoptimized />
```
