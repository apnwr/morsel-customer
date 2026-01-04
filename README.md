# Morsel Customer App

A modern restaurant ordering application built with Next.js, featuring real-time session management, collaborative ordering, and intelligent bill splitting.

## Features

### Core Functionality
- **Menu Browsing**: Navigate through categorized menus with sections and subsections
- **Item Customization**: Select variants (size, type) and addons with real-time price calculation
- **Shopping Cart**: Add, remove, and modify items with quantity management
- **Bill Splitting**: Flexible splitting options (even split, custom amounts, pay for self, pay for all)
- **Session Management**: Multi-user sessions with real-time participant synchronization
- **Order Management**: Place orders with payment type selection and order tracking
- **Preparation Time**: Dynamic calculation based on menu items (max prep time + 15 mins)

### User Experience
- **Responsive Design**: Mobile-first UI with Tailwind CSS
- **Real-time Updates**: Automatic synchronization of participants and orders
- **Session Validation**: Automatic checks for expired or invalid sessions
- **Navigation Guards**: Protected routes with context validation
- **Optimized Performance**: Memoized calculations and efficient state management

## Getting Started

### 1. Environment Setup

Copy the `.env.example` file to `.env.local`:

```bash
cp .env.example .env.local
```

Required environment variables:
```env
NEXT_PUBLIC_API_BASE_URL=your_api_base_url
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Run the Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### 4. Build for Production

```bash
npm run build
npm run start
```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **UI Components**:
  - Framer Motion for animations
  - Lucide React for icons
  - Next.js Image for optimized images
- **API Client**: Custom fetch-based client with error handling
- **Validation**: Custom validation utilities

## API Documentation

Comprehensive API documentation is available in [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

This document includes:
- Base URL configuration
- All API endpoints with request/response structures
- Type definitions
- Integration flow
- Usage examples
- Error handling

**Always update this documentation when making API-related changes.**

## Project Structure

```
src/
├── app/                           # Next.js app router pages
│   ├── cart/                     # Cart page with bill splitting
│   ├── login/                    # Login and session creation
│   ├── menu/                     # Menu browsing and item selection
│   ├── order-summary/            # Order confirmation and tracking
│   └── session-join/             # Join existing sessions
├── components/                    # React components
│   ├── cart/                     # Cart-related components
│   │   ├── BillModal.tsx        # Payment type selection modal
│   │   ├── BillSection.tsx      # Bill breakdown display
│   │   ├── CartItem.tsx         # Individual cart item with controls
│   │   └── DeleteConfirmationModal.tsx
│   ├── layout/                   # Layout components
│   │   └── Header.tsx           # Shared header with timer/cart
│   ├── menu/                     # Menu-related components
│   │   ├── CustomizationModal.tsx  # Item customization interface
│   │   ├── MenuItem.tsx         # Menu item card
│   │   └── MenuNavPopup.tsx     # Category navigation popup
│   ├── order/                    # Order-related components
│   │   └── SplitSettingsModal.tsx  # Bill splitting configuration
│   ├── session/                  # Session-related components
│   │   └── ParticipantsList.tsx # Real-time participant list with amounts
│   └── ui/                       # Reusable UI components
│       ├── Avatar.tsx           # User avatar with color generation
│       └── EmptyState.tsx       # Empty state placeholder
├── contexts/                      # React contexts for state management
│   ├── CartContext.tsx          # Cart state and operations
│   ├── OrderContext.tsx         # Order management
│   ├── SessionContext.tsx       # Session data and validation
│   └── SplitContext.tsx         # Bill splitting logic
├── hooks/                         # Custom React hooks
│   ├── useNavigationGuard.ts    # Protected route guards
│   └── useSessionValidation.ts  # Session validation hook
├── lib/                           # Utilities and configurations
│   ├── api/                      # API client and endpoints
│   │   ├── client.ts            # Fetch wrapper with error handling
│   │   └── endpoints.ts         # API endpoint constants
│   ├── config.ts                # Environment configuration
│   └── validation.ts            # Input validation utilities
├── services/                      # API services
│   ├── menu.service.ts          # Menu API operations
│   ├── order.service.ts         # Order API operations
│   └── session.service.ts       # Session API operations
├── types/                         # TypeScript type definitions
│   ├── api/                      # API response types
│   │   ├── menu.ts              # Menu and item types
│   │   ├── order.ts             # Order and queue types
│   │   └── session.ts           # Session and participant types
│   ├── cart.ts                   # Cart and split types
│   └── menu.ts                   # Menu domain types
└── mocks/                         # Mock data for development
    ├── mockStorage.ts            # LocalStorage wrapper
    └── mockSplit.ts              # Bill splitting utilities
```

## State Management

### Context Providers

The app uses React Context API for global state management:

#### CartContext
- Manages shopping cart items and totals
- Handles add/remove/update operations
- Syncs cart queue with API
- Calculates subtotal, tax (10%), and total
- Provides order confirmation functionality

#### SplitContext
- Manages bill splitting configuration
- Supports multiple split modes:
  - **Even Split**: Divides bill equally among participants
  - **Custom Split**: Manual amount assignment per participant
  - **Pay for Self**: User pays nothing, others split evenly
  - **Pay for All**: User pays entire bill
- Validates split calculations
- Persists split data to localStorage

#### SessionContext
- Manages active session data
- Tracks session participants in real-time
- Provides session refresh functionality
- Handles session expiry

#### OrderContext
- Legacy order management (backward compatibility)
- Tracks order history
- Manages dining preferences

### Key State Flows

1. **Adding Items to Cart**:
   - User selects item from menu
   - Customizes variants/addons if available
   - Item added to cart with calculated price
   - Cart synced with API queue
   - Split calculation triggered

2. **Bill Splitting**:
   - API provides current session participants
   - Stale participants removed from split
   - New participants added to split
   - Split calculated based on mode
   - User's share displayed in cart

3. **Order Confirmation**:
   - User selects payment type
   - Order confirmed via API
   - Session data refreshed
   - Cart cleared
   - Navigate to order summary

## Key Features Implementation

### Real-time Participant Synchronization

The app implements a robust participant sync mechanism:
- Fetches session details every 10 seconds
- Refreshes on window focus
- Uses API participants as source of truth
- Removes stale participants (mock data or previous sessions)
- Adds new participants dynamically
- Recalculates split when participants change

### Dynamic Preparation Time

Calculates estimated preparation time:
```typescript
// Finds max prep time from all cart items + 15 mins buffer
maxPrepTime = Math.max(...allItemPrepTimes) + 15
```

### Stale Participant Detection

A participant is considered "stale" if:
- Exists in local split state
- NOT present in API session response
- Marked as mock data (`isMock: true`)
- From a previous session

### Cart Total Calculation

```typescript
subtotal = sum of all item totals
tax = subtotal × 0.10 (10%)
total = subtotal + tax
```

### Performance Optimizations

- `useMemo` for expensive calculations (prep time, cart totals)
- `useCallback` for memoized event handlers
- Efficient state updates with batch operations
- Conditional rendering based on client-side hydration

## Development Guidelines

### Adding New Features

1. Create types in `src/types/`
2. Add API service in `src/services/`
3. Create UI components in `src/components/`
4. Update context if needed
5. Document API changes in `API_DOCUMENTATION.md`

### Best Practices

- Always validate user input
- Use TypeScript strict mode
- Implement error boundaries for critical sections
- Add comprehensive logging for debugging
- Follow React best practices (hooks, memoization)
- Keep components small and focused
- Use semantic HTML elements
- Ensure accessibility (ARIA labels, keyboard navigation)

### Debugging

The app includes comprehensive console logging:
- `[CartContext]` - Cart operations and calculations
- `[SplitContext]` - Bill splitting logic
- `[ParticipantsList]` - Participant sync operations
- `[CartPage]` - User amount calculations

Enable these logs to trace state changes and identify issues.

## Common Tasks

### Add a New Menu Item Type

1. Update `MenuItem` type in `src/types/api/menu.ts`
2. Update menu service in `src/services/menu.service.ts`
3. Update UI in `src/components/menu/MenuItem.tsx`

### Add a New Split Mode

1. Add mode to `SplitBill` type in `src/types/cart.ts`
2. Implement calculation in `SplitContext.calculateSplit`
3. Add UI option in `SplitSettingsModal`

### Add a New API Endpoint

1. Add endpoint constant in `src/lib/api/endpoints.ts`
2. Create service method in appropriate service file
3. Add types in `src/types/api/`
4. Document in `API_DOCUMENTATION.md`

## Troubleshooting

### Cart not updating
- Check if session is valid
- Verify API queue sync is working
- Check console for CartContext logs

### Split calculations incorrect
- Verify participant count matches API
- Check for stale participants
- Review SplitContext logs

### Session expired
- User will be redirected to login
- Check session expiry time
- Verify API session endpoint

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [React Context API](https://react.dev/reference/react/createContext)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript](https://www.typescriptlang.org/docs/)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
