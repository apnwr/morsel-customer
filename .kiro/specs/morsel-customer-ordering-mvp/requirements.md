# Requirements Document

## Introduction

MORSEL is a restaurant management and POS platform. This specification defines a fully functional, mock-driven customer-facing ordering web application that operates entirely on frontend mock data and local state without backend APIs. The application enables customers to browse menus, customize orders, manage cart items, split bills, and complete mock payments. A global debug panel allows testers to switch between restaurants, branches, and tables for comprehensive testing scenarios.

## Glossary

- **MORSEL Platform**: The restaurant management and point-of-sale system
- **Customer App**: The web application used by restaurant customers to place orders
- **Mock Data**: Frontend-only data structures simulating backend responses
- **Debug Panel**: A floating interface providing testing controls and state manipulation
- **Order Timer**: A countdown mechanism allowing order edits within a specified timeframe
- **Split Bill**: Feature allowing multiple participants to divide payment responsibility
- **Dining Type**: The service mode selected by customer (Dine-In, Takeaway, or Delivery)
- **Restaurant Context**: The active restaurant, branch, and table combination
- **Cart State**: The collection of selected menu items with customizations and quantities
- **Local State**: Application data persisted in browser localStorage

## Requirements

### Requirement 1: Application Navigation Flow

**User Story:** As a customer, I want to navigate through a complete ordering flow from splash screen to payment, so that I can experience the full restaurant ordering process.

#### Acceptance Criteria

1. WHEN the Customer App loads, THE Customer App SHALL display a splash screen for 1 to 2 seconds before navigating to the login route
2. WHEN a customer completes login, THE Customer App SHALL navigate to the menu route with restaurant context stored
3. WHEN a customer adds items to cart and proceeds to checkout, THE Customer App SHALL navigate through cart, order summary, and payment routes in sequence
4. WHEN a customer completes a mock payment, THE Customer App SHALL display a success message and provide an option to start a new order
5. THE Customer App SHALL maintain navigation state across all route transitions

### Requirement 2: Splash Screen Display

**User Story:** As a customer, I want to see a branded splash screen when the app loads, so that I know the application is initializing.

#### Acceptance Criteria

1. THE Customer App SHALL display an animated splash screen showing the MORSEL logo or restaurant logo
2. THE Customer App SHALL show the splash screen for a duration between 1 and 2 seconds
3. WHEN the splash screen duration completes, THE Customer App SHALL automatically navigate to the login page

### Requirement 3: Customer Login and Context Selection

**User Story:** As a customer, I want to enter my name and select my dining preferences, so that my order is personalized and properly categorized.

#### Acceptance Criteria

1. THE Customer App SHALL display the active restaurant logo and theme color on the login page
2. THE Customer App SHALL provide an input field labeled "Enter your name"
3. THE Customer App SHALL provide authentication options including "Continue as Guest", "Continue with Google", and "Continue with Apple"
4. THE Customer App SHALL provide a toggle for selecting dining type among Dine-In, Takeaway, and Delivery
5. WHEN a customer submits the login form, THE Customer App SHALL store the customer name, dining type, and restaurant context in localStorage
6. WHEN a customer submits the login form, THE Customer App SHALL navigate to the menu page

### Requirement 4: Menu Display and Navigation

**User Story:** As a customer, I want to browse a categorized menu with detailed item information, so that I can make informed ordering decisions.

#### Acceptance Criteria

1. THE Customer App SHALL display menu items organized by expandable category accordions
2. THE Customer App SHALL display for each menu item the name, description, price, image, and tags
3. THE Customer App SHALL provide an "Add" button for each menu item
4. THE Customer App SHALL display a floating "Menu" button that opens a category navigation popup
5. THE Customer App SHALL display a sticky header showing the current table number and cart total
6. WHEN a customer clicks the cart total, THE Customer App SHALL open the cart drawer

### Requirement 5: Menu Item Addition to Cart

**User Story:** As a customer, I want to add menu items to my cart with a single action, so that I can quickly build my order.

#### Acceptance Criteria

1. WHEN a customer clicks the "Add" button on a non-customizable menu item, THE Customer App SHALL add the item to the cart with quantity 1
2. WHEN a customer clicks the "Add" button on a customizable menu item, THE Customer App SHALL open the customization modal
3. WHEN an item is added to cart, THE Customer App SHALL update the cart total in the sticky header
4. THE Customer App SHALL persist cart state to localStorage after each addition

### Requirement 6: Item Customization

**User Story:** As a customer, I want to customize menu items with available options, so that my order matches my preferences.

#### Acceptance Criteria

1. WHEN a customizable item is selected, THE Customer App SHALL display a customization modal with available options
2. THE Customer App SHALL display customization options including size variations, preparation styles, and other item-specific choices
3. THE Customer App SHALL provide a quantity selector within the customization modal
4. WHEN a customer modifies customization options, THE Customer App SHALL update the displayed price in real-time
5. WHEN a customer confirms customization, THE Customer App SHALL add the customized item to the cart and close the modal

### Requirement 7: Cart Management

**User Story:** As a customer, I want to review and manage items in my cart, so that I can verify my order before placing it.

#### Acceptance Criteria

1. THE Customer App SHALL display all cart items with quantity, customization summary, and notes
2. THE Customer App SHALL calculate and display subtotal, tax at 10 percent, and total amount
3. THE Customer App SHALL provide a "Split Bill" button to initiate bill splitting
4. THE Customer App SHALL provide a "Place Order" button to submit the order
5. THE Customer App SHALL persist cart state to localStorage after each modification

### Requirement 8: Order Placement and Timer

**User Story:** As a customer, I want to place my order with a grace period for edits, so that I can make last-minute changes if needed.

#### Acceptance Criteria

1. WHEN a customer places an order, THE Customer App SHALL start a 2-minute countdown timer
2. WHEN a customer places an order, THE Customer App SHALL generate a mock estimated time of arrival between 15 and 25 minutes
3. WHILE the order timer is active, THE Customer App SHALL allow the customer to edit the order
4. WHEN the order timer expires, THE Customer App SHALL lock the order and prevent further edits
5. THE Customer App SHALL persist the order state and timer status to localStorage

### Requirement 9: Bill Splitting Functionality

**User Story:** As a customer, I want to split the bill with my dining companions, so that we can share payment responsibility fairly.

#### Acceptance Criteria

1. THE Customer App SHALL provide split modes including "Split evenly", "Custom split", and "Pay for self and "Pay for Everybody"
2. WHEN split evenly mode is selected, THE Customer App SHALL divide the total amount equally among all participants
3. WHEN custom split mode is selected, THE Customer App SHALL allow manual share input for each participant
4. THE Customer App SHALL validate that the sum of all participant shares equals the full order total
5. THE Customer App SHALL persist split configuration to localStorage until order reset

### Requirement 10: Mock Participant Management

**User Story:** As a customer, I want to add mock participants to test bill splitting, so that I can verify split calculations work correctly.

#### Acceptance Criteria

1. THE Customer App SHALL provide an "Add Mock Person" button within the split bill interface
2. WHEN a mock person is added, THE Customer App SHALL generate a random name and avatar
3. WHEN a mock person is added, THE Customer App SHALL recalculate the split amounts to include the new participant
4. THE Customer App SHALL display all participants with their respective payment shares

### Requirement 11: Order Summary and Payment

**User Story:** As a customer, I want to review my complete order and payment split before completing payment, so that I can confirm all details are correct.

#### Acceptance Criteria

1. THE Customer App SHALL display the complete order with all items, quantities, and customizations
2. THE Customer App SHALL display the active countdown timer with remaining edit time
3. THE Customer App SHALL display the split summary showing each participant's payment amount
4. WHEN the timer is active, THE Customer App SHALL allow order modifications
5. WHEN the timer has expired, THE Customer App SHALL prevent order modifications

### Requirement 12: Mock Payment Processing

**User Story:** As a customer, I want to complete a simulated payment, so that I can experience the full checkout flow.

#### Acceptance Criteria

1. THE Customer App SHALL provide a "Pay Now" button on the order summary page
2. WHEN a customer clicks "Pay Now", THE Customer App SHALL display a mock payment modal
3. THE Customer App SHALL display a success message stating "Payment simulated successfully. Backend integration coming soon."
4. THE Customer App SHALL provide a "Start New Order" button after payment completion
5. WHEN "Start New Order" is clicked, THE Customer App SHALL reset the cart and order state in localStorage

### Requirement 13: Mock Data Structure

**User Story:** As a developer, I want well-structured mock data for restaurants, menus, and orders, so that the application behaves realistically without backend dependencies.

#### Acceptance Criteria

1. THE Customer App SHALL include mock data for at least 3 restaurants with unique names, theme colors, and logos
2. THE Customer App SHALL include for each restaurant at least 2 branches with unique names and table counts
3. THE Customer App SHALL include for each restaurant at least 4 menu categories with 5 to 6 items per category
4. THE Customer App SHALL include customization options for applicable menu items
5. THE Customer App SHALL provide helper functions for order timer logic, split calculations, and localStorage operations

### Requirement 14: Restaurant Context Management

**User Story:** As a tester, I want to switch between different restaurants, branches, and tables, so that I can test the application across various scenarios.

#### Acceptance Criteria

1. THE Customer App SHALL maintain the active restaurant, branch, and table as application context
2. THE Customer App SHALL apply the active restaurant's theme color as the UI accent color
3. THE Customer App SHALL display the active restaurant's logo on the login page
4. THE Customer App SHALL load the active restaurant's menu data on the menu page
5. THE Customer App SHALL persist restaurant context to localStorage

### Requirement 15: Debug Panel Visibility and Access

**User Story:** As a tester, I want to access a debug panel with testing controls, so that I can manipulate application state for comprehensive testing.

#### Acceptance Criteria

1. THE Customer App SHALL display a floating debug button in the bottom-right corner of all screens
2. WHEN the environment is development, THE Customer App SHALL make the debug panel visible by default
3. WHEN the localStorage key "enableDebugPanel" is set to "true", THE Customer App SHALL make the debug panel visible
4. WHEN a tester clicks the debug button, THE Customer App SHALL open the debug panel interface
5. THE Customer App SHALL maintain debug panel visibility state across navigation

### Requirement 16: Debug Panel Restaurant Controls

**User Story:** As a tester, I want to switch restaurants and branches through the debug panel, so that I can test different restaurant configurations.

#### Acceptance Criteria

1. THE Customer App SHALL provide a "Switch Restaurant" control that cycles through all mock restaurants
2. WHEN a restaurant is switched, THE Customer App SHALL update the active restaurant context and reload the menu
3. THE Customer App SHALL provide a "Switch Branch" control that cycles through branches of the active restaurant
4. WHEN a branch is switched, THE Customer App SHALL update the active branch context
5. THE Customer App SHALL provide a "Change Table" control that randomly assigns a table number within the branch's table range

### Requirement 17: Debug Panel Cart and Order Controls

**User Story:** As a tester, I want to manipulate cart and order state through the debug panel, so that I can test various ordering scenarios quickly.

#### Acceptance Criteria

1. THE Customer App SHALL provide an "Add Random Item" control that adds a random menu item to the cart
2. THE Customer App SHALL provide an "Add Mock Person" control that adds a random participant to the bill split
3. THE Customer App SHALL provide a "Simulate Order Placed" control that starts the 2-minute order timer
4. THE Customer App SHALL provide an "Expire Timer" control that immediately ends the order timer and locks the order
5. THE Customer App SHALL provide a "Reset Order" control that clears the current order while preserving restaurant context

### Requirement 18: Debug Panel State Management Controls

**User Story:** As a tester, I want to reset application state through the debug panel, so that I can start fresh testing scenarios.

#### Acceptance Criteria

1. THE Customer App SHALL provide a "Clear LocalStorage" control that removes all persisted application data
2. WHEN localStorage is cleared, THE Customer App SHALL reset to initial application state
3. THE Customer App SHALL provide quick navigation buttons for routes including login, menu, cart, and order-summary
4. WHEN a quick navigation button is clicked, THE Customer App SHALL navigate to the specified route immediately

### Requirement 19: Responsive Mobile-First Design

**User Story:** As a customer using a mobile device, I want the application to be optimized for mobile screens, so that I have a smooth ordering experience.

#### Acceptance Criteria

1. THE Customer App SHALL implement a mobile-first responsive design using TailwindCSS
2. THE Customer App SHALL ensure all interactive elements are touch-friendly with appropriate sizing
3. THE Customer App SHALL use smooth transitions via Framer Motion for state changes
4. THE Customer App SHALL maintain sticky positioning for cart total and timer elements
5. THE Customer App SHALL apply a clean, minimalist design aesthetic

### Requirement 20: Theme Customization per Restaurant

**User Story:** As a customer, I want to see restaurant-specific branding throughout the app, so that the experience feels personalized to the establishment.

#### Acceptance Criteria

1. THE Customer App SHALL apply the active restaurant's theme color as the primary accent color throughout the interface
2. THE Customer App SHALL display the active restaurant's logo on the login page
3. THE Customer App SHALL maintain consistent theme color usage across all pages and components
4. WHEN the restaurant context changes, THE Customer App SHALL update the theme color immediately
