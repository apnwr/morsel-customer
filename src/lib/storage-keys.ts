/**
 * Single source of truth for localStorage keys used across the app.
 *
 * Centralizes the `morsel_*` namespace so adding a new key automatically
 * participates in clear-on-session-end via SESSION_SCOPED_KEYS.
 *
 * Usage:
 *   import { STORAGE_KEYS } from '@/lib/storage-keys';
 *   getFromStorage<string>(STORAGE_KEYS.SESSION_USER_ID);
 */

export const STORAGE_KEYS = {
  // Session lifecycle (cleared on session end)
  SESSION_DATA: 'morsel_session_data',
  SESSION_USER_ID: 'morsel_session_user_id',
  ACTIVE_ORDER_ID: 'morsel_active_order_id',
  CUSTOMER_NAME: 'morsel_customer_name',
  DINING_TYPE: 'morsel_dining_type',
  AUTH_METHOD: 'morsel_auth_method',
  FLOW_TYPE: 'morsel_flow_type',
  AREA_ID: 'morsel_area_id',
  RESTAURANT_CONTEXT: 'morsel_restaurant_context',

  // Per-order ephemeral state (cleared on session end so it doesn't leak)
  CART: 'morsel_cart',
  KITCHEN_NOTE: 'morsel_kitchen_note',
  TIP: 'morsel_tip',
  SPLIT: 'morsel_split',
  ITEMIZED_SELECTIONS: 'morsel_itemized_selections',
  MENU_ITEMS_CACHE: 'morsel_menu_items_cache',

  // Persistent across sessions
  ORDER: 'morsel_order',
  TABLE_NUMBER: 'morsel_table_number', // debug-panel only
} as const;

/**
 * Keys that SessionContext.clearSession iterates.
 *
 * IMPORTANT: when introducing a new session-scoped key, add it here so it's
 * cleaned up automatically. Forgetting to do so causes state leakage between
 * sessions/flows — the original motivation for centralizing this.
 *
 * Persistent keys (ORDER, TABLE_NUMBER) are intentionally excluded.
 */
export const SESSION_SCOPED_KEYS: ReadonlyArray<string> = [
  STORAGE_KEYS.SESSION_DATA,
  STORAGE_KEYS.SESSION_USER_ID,
  STORAGE_KEYS.ACTIVE_ORDER_ID,
  STORAGE_KEYS.CUSTOMER_NAME,
  STORAGE_KEYS.DINING_TYPE,
  STORAGE_KEYS.AUTH_METHOD,
  STORAGE_KEYS.FLOW_TYPE,
  STORAGE_KEYS.AREA_ID,
  STORAGE_KEYS.RESTAURANT_CONTEXT,
  STORAGE_KEYS.CART,
  STORAGE_KEYS.KITCHEN_NOTE,
  STORAGE_KEYS.TIP,
  STORAGE_KEYS.SPLIT,
  STORAGE_KEYS.ITEMIZED_SELECTIONS,
  STORAGE_KEYS.MENU_ITEMS_CACHE,
];
