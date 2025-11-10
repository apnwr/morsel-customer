# Implementation Plan

- [x] 1. Set up project dependencies and configuration
  - Install required packages: framer-motion, lucide-react
  - Configure Tailwind CSS with custom colors and design tokens
  - Set up path aliases and TypeScript configuration
  - _Requirements: All requirements depend on proper setup_

- [x] 2. Create mock data structure and utilities
  - [x] 2.1 Create restaurant mock data with 3 restaurants
    - Define Restaurant, Branch types
    - Create restaurants.ts with La Brasserie, Sushi Mori, Casa di Pizza
    - Include theme colors, logos, branches, and table counts
    - _Requirements: 13.1, 13.2, 14.1_
  
  - [x] 2.2 Create menu mock data for all restaurants
    - Define MenuItem, MenuCategory, CustomOption types
    - Create menuData.ts with 4+ categories per restaurant
    - Include 5-6 items per category with images, prices, tags
    - Add customization options for applicable items
    - _Requirements: 13.3, 13.4_
  
  - [x] 2.3 Create localStorage utility functions
    - Write mockStorage.ts with get/set/clear wrappers
    - Add error handling for localStorage unavailability
    - Implement data validation and sanitization
    - _Requirements: 13.5_
  
  - [x] 2.4 Create split calculation helper functions
    - Write mockSplit.ts with split calculation logic
    - Implement even split, custom split, and validation
    - Add participant management functions
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [x] 2.5 Create order timer helper functions
    - Write mockOrders.ts with timer logic
    - Implement ETA generation (15-25 mins random)
    - Add timer synchronization for page refreshes
    - _Requirements: 8.1, 8.2, 8.4_

- [x] 3. Create global state management with React Context
  - [x] 3.1 Create RestaurantContext
    - Implement context for restaurant, branch, table state
    - Add actions to switch restaurant/branch/table
    - Integrate localStorage persistence
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  
  - [x] 3.2 Create CartContext
    - Implement cart state with items array
    - Add actions: addItem, removeItem, updateQuantity, clearCart
    - Calculate subtotal, tax (10%), and total
    - Integrate localStorage persistence
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 7.1, 7.2, 7.5_
  
  - [x] 3.3 Create OrderContext
    - Implement order state with status, timer, ETA
    - Add actions: placeOrder, startTimer, expireTimer, resetOrder
    - Handle timer countdown and expiration
    - Integrate localStorage persistence
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [x] 3.4 Create SplitContext
    - Implement split state with mode, participants, shares
    - Add actions: setSplitMode, addParticipant, updateShare, validateSplit
    - Calculate per-person amounts
    - Integrate localStorage persistence
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4_

- [x] 4. Create base UI components
  - [x] 4.1 Create Button component
    - Implement variants: primary, secondary, pill, icon
    - Add sizes: sm, md, lg
    - Include loading and disabled states
    - Apply design system styles (black primary, white secondary)
    - _Requirements: All UI requirements_
  
  - [x] 4.2 Create Modal component
    - Implement bottom sheet style with slide-up animation
    - Add backdrop with click-to-close
    - Include close button and title
    - Handle scroll for long content
    - _Requirements: 6.1, 9.1, 11.2_
  
  - [x] 4.3 Create Avatar component
    - Implement circular avatar with colored backgrounds
    - Support initials or images
    - Add size variants
    - _Requirements: 10.1, 10.2, 10.4_
  
  - [x] 4.4 Create Badge component
    - Implement badge for timer and notifications
    - Support different colors and sizes
    - _Requirements: 8.1, 11.2_

- [x] 5. Implement Splash Screen
  - Create splash page component at app/page.tsx
  - Add MORSEL logo with purple branding
  - Include tagline "Enjoy every meal, not the math."
  - Implement 1-2 second delay with auto-redirect to /login
  - Add fade-in animation
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 6. Implement Login/Entry Page
  - [x] 6.1 Create login page component
    - Display restaurant logo and theme color
    - Show table number (from context)
    - Add name input field with placeholder
    - _Requirements: 3.1, 3.2_
  
  - [x] 6.2 Add dining type toggle
    - Create pill-style toggle buttons (Dine-in, Take-Away, Delivery)
    - Implement active/inactive states
    - Store selected dining type in state
    - _Requirements: 3.4_
  
  - [x] 6.3 Add authentication buttons
    - Create "Continue as Guest" button (primary black)
    - Create "Continue with Google" button (secondary with icon)
    - Create "Continue with Apple" button (secondary with icon)
    - _Requirements: 3.3_
  
  - [x] 6.4 Implement form submission
    - Validate name input (non-empty, max 50 chars)
    - Store customer name, dining type, and restaurant context in localStorage
    - Navigate to /menu on submit
    - _Requirements: 3.5, 3.6_


- [ ] 7. Implement Menu Page
  - [x] 7.1 Create menu page header
    - Add sticky header with timer badge and cart total
    - Implement cart total click to navigate to /cart
    - Add filter pills row (Filters, Bestseller, Desserts)
    - Apply restaurant theme color
    - _Requirements: 4.5, 4.6_
  
  - [x] 7.2 Create MenuAccordion component
    - Implement expandable category sections
    - Show category name and item count
    - Add chevron icon with rotation animation
    - Implement smooth expand/collapse animation
    - _Requirements: 4.1_
  
  - [x] 7.3 Create MenuItem component
    - Display circular food image, name, description, price
    - Show tags (spicy, bestseller, etc.)
    - Add "Add" or "More" button based on customizability
    - Apply light gray background and rounded corners
    - _Requirements: 4.2_
  
  - [x] 7.4 Implement menu data loading
    - Load menu data for active restaurant from mock data
    - Organize items by category
    - Render MenuAccordion for each category
    - _Requirements: 4.1, 4.2_
  
  - [x] 7.5 Add floating Menu button
    - Create floating button at bottom center
    - Implement MenuNavPopup for quick category navigation
    - Add smooth scroll to category on selection
    - _Requirements: 4.4_
  
  - [x] 7.6 Implement add to cart functionality
    - Handle "Add" button click for non-customizable items
    - Open CustomizationModal for customizable items
    - Update cart context and localStorage
    - Update cart total in header
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 8. Implement Item Customization Modal
  - [x] 8.1 Create CustomizationModal component
    - Implement bottom sheet style with slide-up animation
    - Display item image, name, and base price at top
    - Add backdrop with click-to-close
    - _Requirements: 6.1_
  
  - [x] 8.2 Add customization options
    - Render option sections (e.g., "Meal Size")
    - Display choices as full-width buttons
    - Show price for each choice
    - Implement selected state (black background)
    - _Requirements: 6.2_
  
  - [x] 8.3 Add quantity selector
    - Create -/+ buttons with number display
    - Validate quantity (min 1, max 99)
    - Update price calculation on quantity change
    - _Requirements: 6.3_
  
  - [x] 8.4 Implement live price calculation
    - Calculate total based on base price + option modifiers × quantity
    - Update displayed price in real-time
    - _Requirements: 6.4_
  
  - [x] 8.5 Add to cart from customization
    - Create "Continue" button at bottom
    - Build CartItem with customizations
    - Add to cart context
    - Close modal and update cart total
    - _Requirements: 6.5_

- [x] 9. Implement Cart Page
  - [x] 9.1 Create cart page component
    - Add sticky header with timer badge and cart total
    - Implement full-screen layout
    - _Requirements: 7.1_
  
  - [x] 9.2 Create SplitSection component
    - Implement "Split evenly" expandable section
    - Show participant avatars with names and amounts
    - Calculate even split automatically
    - Add chevron icon for expand/collapse
    - _Requirements: 9.1, 9.2_
  
  - [x] 9.3 Create CartItem component
    - Display avatar of who added the item (current user for MVP)
    - Show item name and price
    - Add quantity selector with -/+ buttons
    - Include "Customize" button for customizable items
    - Display customization summary
    - _Requirements: 7.1_
  
  - [x] 9.4 Implement cart item management
    - Handle quantity updates
    - Handle item removal (quantity to 0)
    - Recalculate totals on changes
    - Update localStorage
    - _Requirements: 7.1, 7.5_
  
  - [x] 9.5 Add note to kitchen section
    - Create input/button for adding kitchen notes
    - Display emoji icon
    - Store notes with cart
    - _Requirements: 7.1_
  
  - [x] 9.6 Create floating Bill button
    - Position at bottom with margins
    - Open BillModal on click
    - Show total amount
    - _Requirements: 7.2, 7.3_

- [x] 10. Implement Bill Modal and Order Placement
  - [x] 10.1 Create BillModal component
    - Implement bottom sheet with bill breakdown
    - Display itemized list with quantities and prices
    - Show subtotal, tax (10%), and total
    - Include split information if applicable
    - _Requirements: 7.2_
  
  - [x] 10.2 Add Place Order button
    - Create primary button at bottom of modal
    - Implement order placement logic
    - _Requirements: 7.3_
  
  - [x] 10.3 Implement order placement
    - Generate order ID
    - Start 2-minute countdown timer
    - Generate random ETA (15-25 mins)
    - Set order status to "placed"
    - Mark as editable
    - Save to localStorage
    - Navigate to /order-summary
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

- [x] 11. Implement Split Bill Settings Modal
  - [x] 11.1 Create SplitSettingsModal component
    - Implement bottom sheet style
    - Display large total amount at top
    - Add "Save" button (black, rounded-full)
    - _Requirements: 9.1_
  
  - [x] 11.2 Add split evenly section
    - Show participant grid with avatars
    - Display name and amount for each participant
    - Calculate even split automatically
    - Add "+" button to invite participants
    - _Requirements: 9.2, 9.3_
  
  - [x] 11.3 Implement add mock participant
    - Generate random name and avatar color
    - Add to participants list
    - Recalculate split amounts
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [x] 11.4 Add payment mode options
    - Create buttons for "Pay for everyone", "Pay for self", "Custom"
    - Implement mode switching
    - Update split calculations based on mode
    - _Requirements: 9.1_
  
  - [x] 11.5 Implement custom split mode
    - Add amount inputs for each participant
    - Validate sum equals total
    - Show error if validation fails
    - _Requirements: 9.3, 9.4_
  
  - [x] 11.6 Save split configuration
    - Update split context
    - Persist to localStorage
    - Close modal
    - _Requirements: 9.5_

- [x] 12. Implement Order Summary Page
  - [x] 12.1 Create order summary page component
    - Add sticky header with timer and cart total
    - Load order from context
    - Redirect to /cart if no active order
    - _Requirements: 11.1_
  
  - [x] 12.2 Create OrderStatusBanner component
    - Display green banner with checkmark icon
    - Show "Your order is getting prepared!" message
    - Include editable timer message
    - _Requirements: 11.1_
  
  - [x] 12.3 Create OrderTimer component
    - Implement countdown timer badge
    - Update every second
    - Change color based on time remaining
    - Call onExpire when timer reaches 0
    - _Requirements: 11.2, 11.3_
  
  - [x] 12.4 Display order summary section
    - List all ordered items with avatars
    - Show item names, prices, and quantities
    - Display kitchen notes if any
    - _Requirements: 11.1_
  
  - [x] 12.5 Create RunningTabs component
    - Display "Running Tabs" section
    - Show split evenly toggle/link
    - List all participants with amounts
    - _Requirements: 11.3_
  
  - [x] 12.6 Implement payment section
    - Show current user's payment card with amount
    - Add "Pay now" button (primary black)
    - Display other participants with their amounts
    - Show "Pay now" buttons for others (secondary)
    - _Requirements: 11.1, 11.2, 11.3_
  
  - [x] 12.7 Add order more food section
    - Create info card at bottom
    - Explain that going back doesn't cancel order
    - Provide option to add more items
    - _Requirements: 11.1_

- [x] 13. Implement Mock Payment
  - [x] 13.1 Create PaymentModal component
    - Implement modal with payment success message
    - Show "Payment simulated successfully" text
    - Include note about backend integration
    - Add "Start New Order" button
    - _Requirements: 12.1, 12.2, 12.3_
  
  - [x] 13.2 Implement payment flow
    - Open modal on "Pay now" click
    - Simulate payment processing (brief delay)
    - Show success message
    - _Requirements: 12.1, 12.2_
  
  - [x] 13.3 Implement order reset
    - Clear cart from context and localStorage
    - Clear order from context and localStorage
    - Clear split from context and localStorage
    - Navigate to /menu
    - _Requirements: 12.4, 12.5_

- [x] 14. Implement Debug Panel
  - [x] 14.1 Create DebugPanel component
    - Create floating button (bottom-right, purple)
    - Implement expandable panel with slide-in animation
    - Add conditional visibility based on env and localStorage
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_
  
  - [x] 14.2 Add restaurant controls
    - Create "Switch Restaurant" button to cycle through restaurants
    - Create "Switch Branch" button to cycle through branches
    - Create "Change Table" button to randomly assign table
    - Update context and reload menu on changes
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_
  
  - [x] 14.3 Add cart and order controls
    - Create "Add Random Item" button
    - Create "Add Mock Person" button
    - Create "Simulate Order Placed" button
    - Create "Expire Timer" button
    - Create "Reset Order" button
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_
  
  - [x] 14.4 Add state management controls
    - Create "Clear LocalStorage" button
    - Add quick navigation buttons (Login, Menu, Cart, Order Summary)
    - Implement navigation on button click
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

- [x] 15. Implement theme system and styling
  - [x] 15.1 Set up dynamic theming
    - Apply restaurant theme color as CSS variable
    - Update theme on restaurant change
    - Use theme color for accents (not primary buttons)
    - _Requirements: 14.2, 20.1, 20.2, 20.3, 20.4_
  
  - [x] 15.2 Apply design system styles
    - Implement color palette (black buttons, gray backgrounds)
    - Apply typography scale with Geist fonts
    - Use consistent spacing and border radius
    - Add hover and active states to interactive elements
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_
  
  - [x] 15.3 Add animations with Framer Motion
    - Implement modal slide-up animations
    - Add accordion expand/collapse animations
    - Create fade-in animations for page transitions
    - Add button press animations (scale-95)
    - _Requirements: 19.3_

- [x] 16. Implement error handling and edge cases
  - [x] 16.1 Add localStorage error handling
    - Wrap localStorage calls in try-catch
    - Fall back to in-memory state if unavailable
    - Show user-friendly error messages
    - _Requirements: All persistence requirements_
  
  - [x] 16.2 Add input validation
    - Validate customer name (non-empty, max length)
    - Validate quantity (1-99)
    - Validate split amounts (sum equals total)
    - Sanitize user inputs
    - _Requirements: 3.5, 9.4_
  
  - [x] 16.3 Handle timer synchronization
    - Check timer status on page load
    - Lock order if timer expired while app was closed
    - Resume countdown if timer still active
    - _Requirements: 8.4, 8.5_
  
  - [x] 16.4 Add navigation guards
    - Redirect to /cart if accessing /order-summary without order
    - Redirect to /login if no restaurant context
    - Handle browser back button appropriately
    - _Requirements: All navigation requirements_

- [x] 17. Polish and final touches
  - [x] 17.1 Add empty states
    - Create empty cart state with message and CTA
    - Add empty menu state (shouldn't happen with mock data)
    - _Requirements: 7.1_
  
  - [x] 17.2 Add loading states
    - Show loading spinner during navigation
    - Add skeleton loaders for images
    - _Requirements: 19.1_
  
  - [x] 17.3 Optimize performance
    - Lazy load DebugPanel component
    - Lazy load CustomizationModal
    - Optimize images with Next.js Image component
    - Memoize expensive calculations
    - _Requirements: 19.1, 19.2, 19.3_
  
  - [x] 17.4 Test responsive design
    - Verify mobile-first layout on various screen sizes
    - Test touch targets (min 44x44px)
    - Ensure horizontal scrolling works for filter pills
    - _Requirements: 19.1, 19.2, 19.4, 19.5_
  
  - [x] 17.5 Add accessibility features
    - Add ARIA labels to interactive elements
    - Implement keyboard navigation
    - Ensure color contrast meets WCAG standards
    - Add focus states to all interactive elements
    - Test with screen reader
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_
