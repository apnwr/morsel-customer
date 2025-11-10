/**
 * Application-wide constants for MORSEL Customer App
 */

// Timer Configuration
export const ORDER_TIMER_DURATION = 120; // 2 minutes in seconds
export const ORDER_ETA_MIN = 15; // Minimum ETA in minutes
export const ORDER_ETA_MAX = 25; // Maximum ETA in minutes

// Tax Configuration
export const TAX_RATE = 0.1; // 10% tax rate

// LocalStorage Keys
export const STORAGE_KEYS = {
  RESTAURANT_CONTEXT: 'morsel_restaurant_context',
  CART: 'morsel_cart',
  ORDER: 'morsel_order',
  SPLIT: 'morsel_split',
  CUSTOMER_NAME: 'morsel_customer_name',
  DINING_TYPE: 'morsel_dining_type',
  DEBUG_PANEL_ENABLED: 'enableDebugPanel',
} as const;

// Dining Types
export const DINING_TYPES = {
  DINE_IN: 'dine-in',
  TAKEAWAY: 'takeaway',
  DELIVERY: 'delivery',
} as const;

// Split Modes
export const SPLIT_MODES = {
  EVEN: 'even',
  CUSTOM: 'custom',
  SELF: 'self',
  ALL: 'all',
} as const;

// Order Status
export const ORDER_STATUS = {
  PENDING: 'pending',
  PLACED: 'placed',
  LOCKED: 'locked',
  COMPLETED: 'completed',
} as const;

// Validation Limits
export const VALIDATION = {
  MAX_NAME_LENGTH: 50,
  MIN_QUANTITY: 1,
  MAX_QUANTITY: 99,
  SPLIT_TOLERANCE: 0.01, // 1 cent tolerance for rounding
} as const;

// Animation Durations (in seconds)
export const ANIMATION = {
  SPLASH_DURATION: 1.5,
  MODAL_SLIDE_DURATION: 0.3,
  FADE_DURATION: 0.2,
} as const;

// Breakpoints (matching Tailwind)
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
} as const;
