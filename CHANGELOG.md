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

### Footer Component (New)

**Files**: `src/components/layout/Footer.tsx`, `src/app/layout.tsx`, `public/icons/morsel_text_logo.svg`

1. **Created `Footer` component**
   - "Powered by" text + morsel text logo (SVG, red)
   - Legal text: "By using morsel app, you agree to our **Privacy policy** and **Terms of Use.**"
   - 60px top padding, 24px gap between sections, centered layout

2. **Added morsel text logo SVG** at `public/icons/morsel_text_logo.svg`

3. **Page visibility config**
   - `FOOTER_HIDDEN_PAGES` array in Footer.tsx controls which pages hide the footer
   - Currently shown on all pages (empty hide list)
   - Add a path string to the array to hide footer on that page

4. **Footer placed inside individual pages** (not root layout)
   - Added to `src/app/menu/page.tsx`, `src/app/cart/page.tsx`, `src/app/my-tab/page.tsx`
   - Ensures footer scrolls within each page's content area
   - 90px bottom padding clears fixed bottom bars

### Participants Card Redesign

**File**: `src/components/session/ParticipantsList.tsx`

1. **Dark theme card**
   - Background changed from white (`bg-white` with border) to black (`bg-black`)
   - All text colors updated to white / white with opacity

2. **Layout reorder to match Figma**
   - Participant avatars, names, and amounts render at the **top** of the card
   - "Split evenly" label + "Change" button + description text render **below** participants

3. **Replaced "Edit" badge + Share icon with "Change" button**
   - New pill-style button with `Settings` icon + "Change" text in `bg-white/20`
   - Removed `Share2` icon and `handleShare` function

4. **Added description text**
   - Below the split mode label: "The bill is going to be split evenly, click on this card to change these settings."
   - Dynamic text adapts to current split mode

5. **Updated empty/invite state**
   - Invite button restyled for dark background (`bg-white/10`, `border-white/30`, inverted icon)

### Cart Page (PreOrderView) Updates

**File**: `src/components/cart/PreOrderView.tsx`

1. **Removed Preparation Time counter**
   - Removed the chef emoji + dotted line + time display section
   - Removed the `totalPreparationTime` useMemo computation
   - Preparation time was not part of the Figma cart design

2. **Removed bottom padding from cart content container**
   - Removed `pb-24` from the main content wrapper

3. **Adjusted spacing**
   - Kitchen note section: added `mt-1` for tighter spacing after cart items
   - Bill section: increased top margin from `mt-4` to `mt-6` for better visual separation

4. **Added Tip Selector**
   - Three preset tip buttons: `😃 20%`, `😊 10%` (default selected), `0% ☹️`
   - Selected tip gets black bg + white text; unselected gets white bg + `#ECECEC` border
   - "Custom Tip" button expands into a number input with "Set" button
   - Self-contained local state — does not affect cart total or place order amount

5. **"Place Order" bottom bar updates**
   - Capitalized to "Place Order" (was "Place order")
   - Rounded corners increased from `rounded-t-xl` to `rounded-t-[30px]`
   - Removed `border-t` and diagonal arrow SVG icon
   - Updated padding to `px-[22px]`, font weight to 700 (bold)

### Header — Right Icon Update

**File**: `src/components/layout/Header.tsx`

7. **Replaced right icon with hamburger menu**
   - Removed `/icons/icons.png` image
   - Added inline SVG hamburger icon (3 horizontal bars)
   - Button styled as 50px circle with `border-[3px] border-[#ECECEC] bg-[#F8F8F8]`
   - `onRightIconClick` callback unchanged — existing navigation still works

---

### Documentation Consolidation

1. **Created single documentation file**: `documentation/PROJECT_FLOW.md`
   - Comprehensive project flow covering all features, API, state, components, and types

2. **Deleted 29 redundant documentation files**
   - 24 root-level `.md` files (API_DOCUMENTATION, SESSION_ARCHITECTURE, FIREBASE_SETUP, etc.)
   - 5 `src/lib/*.md` files (ACCESSIBILITY_GUIDE, ERROR_HANDLING_SUMMARY, etc.)

3. **Simplified `README.md`**
   - Trimmed to quick-start guide pointing to `documentation/PROJECT_FLOW.md`
