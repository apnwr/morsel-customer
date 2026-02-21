# Changelog

All notable changes on this branch are documented here.

---

## [Unreleased]

### Header Redesign

**File**: `src/components/layout/Header.tsx`

1. **Replaced table number with Morsel logo**
   - Removed the table number/space name text from inside the left circle
   - Added `morsel_logo.png` (20x20) centered inside the circle instead
   - Kept the circle border (3px black) and participant dots on the circumference

2. **Added clasp dot decoration**
   - Small 10x10 circle with black border and white fill at the top of the main circle
   - Matches the pendant/tag design from Figma

3. **Added "View Cart" label on non-cart pages**
   - Floating label appears above the cart pill on menu, my-tab, and other pages
   - Label is grey (`#B2B2B2`) when cart is empty, black when items are present
   - Positioned on the left side of the pill
   - Hidden on the cart page (`/cart`)

4. **Cart page shows "Cart" title instead of pill**
   - Center element on `/cart` page displays bold "Cart" text (24px, Lato font)
   - On all other pages, the cart pill with price + arrow is shown

5. **Fixed layout shift between pages**
   - Both center variants (text and pill) wrapped in a fixed `h-[59px]` container
   - Left and right elements no longer shift vertically when navigating between pages

6. **Changed flex layout to `justify-between`**
   - Header row uses `justify-between` instead of `justify-center` with gap
   - Ensures left (logo), center (cart/text), and right (menu icon) stay pinned to edges

### Documentation Consolidation

1. **Created single documentation file**: `documentation/PROJECT_FLOW.md`
   - Comprehensive project flow covering all features, API, state, components, and types

2. **Deleted 29 redundant documentation files**
   - 24 root-level `.md` files (API_DOCUMENTATION, SESSION_ARCHITECTURE, FIREBASE_SETUP, etc.)
   - 5 `src/lib/*.md` files (ACCESSIBILITY_GUIDE, ERROR_HANDLING_SUMMARY, etc.)

3. **Simplified `README.md`**
   - Trimmed to quick-start guide pointing to `documentation/PROJECT_FLOW.md`
