/**
 * Order API Type Definitions
 * Defines types for queue management and order confirmation
 */

/**
 * Queue Item
 * Represents an item in the customer's queue with variants and addons
 * POST /ordering-session/session/{sessionId}/queue
 */
export interface QueueItem {
  itemId: string;
  quantity: number;
  variantIndex?: number;        // Index of selected variant (0-based), defaults to 0
  addOns?: OrderItemAddon[];    // Array of addon selections with option indexes
  spiceLevel?: string;          // Selected spice level (e.g., "Mild", "Hot")
}

/**
 * Queue Update Request
 * Payload for updating the customer's queue (upsert operation)
 * POST /session/{sessionId}/queue
 */
export interface QueueUpdateRequest {
  sessionUserId: string;
  items: QueueItem[];
}

/**
 * Queue Update Response
 * Response after updating the queue
 */
export interface QueueUpdateResponse {
  message: string;
  queue: {
    sessionUserId: string;
    items: QueueItem[];
    updatedAt: string;
  };
}

/**
 * Order Item Addon
 * Represents an addon group with selected options for an order item
 */
export interface OrderItemAddon {
  addonIndex: number;          // Index of addon category (0-based)
  selectedOptions: number[];   // Array of selected option indices (integers)
}

/**
 * Order Confirm Item
 * Represents an item in the order confirmation payload
 */
export interface OrderConfirmItem {
  itemId: string;
  quantity: number;
  variantIndex: number;
  addOns: OrderItemAddon[];
}

/**
 * Queue Confirm Request
 * Payload for confirming the order and sending to kitchen
 * POST /session/{sessionId}/queue/confirm
 */
export interface QueueConfirmRequest {
  sessionUserId: string;
  paymentType: 'cash' | 'card' | 'upi' | string;
}

/**
 * Order Item Addon with Selected Options
 * Represents selected options within an addon group in a confirmed order
 */
export interface OrderItemAddonWithDetails {
  addonIndex: number;
  addonName: string;
  selectedOptions: Array<{
    name: string;
    price: number;
  }>;
  optionsTotalPrice: number;
}

/**
 * Order Item
 * Represents an item in a confirmed order
 */
export interface OrderItem {
  itemId: string;
  name: string;
  quantity: number;
  variantIndex: number;
  variantName: string;
  variantPrice: number;
  addOns: OrderItemAddonWithDetails[];
  addonsTotalPrice: number;
  unitPrice: number;
  itemTotal: number;
}

/**
 * Payment Info
 * Payment details for an order
 */
export interface PaymentInfo {
  type: 'cash' | 'card' | 'upi' | string;
  paid: boolean;
}

/**
 * Order
 * Represents a confirmed order
 */
export interface Order {
  id: string;
  sessionId: string;
  sessionUserId: string;
  businessId: string;
  spaceId: string;
  patronId?: string | null;
  guestName?: string | null;
  items: OrderItem[];
  total: number;
  payment: PaymentInfo;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled' | string;
}

/**
 * Order Confirm Response
 * Response after confirming the order
 */
export interface OrderConfirmResponse {
  data: Order;
}
