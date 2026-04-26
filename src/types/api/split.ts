/**
 * API Types for Split Bill
 * POST /ordering-session/session/{sessionId}/split
 */

export type SplitType = 'equal' | 'participant' | 'custom' | 'itemized';

/**
 * Request payload for calculating a split
 */
export interface SplitCalculateRequest {
  type: SplitType;
  /** Number of equal splits (used for 'equal' type) */
  numberOfSplits?: number;
  /** Array of amounts per split (used for 'custom' type) */
  amounts?: number[];
  /** Selected items with quantity (used for 'itemized' type) */
  itemIds?: Array<{ itemId: string; orderId: string; quantity: number }>;
  /** sessionUserId of the participant performing the split (used for 'itemized' type) */
  sessionUserId?: string;
}

/**
 * Add-on attached to a split item, mirrors the order item shape.
 */
export interface SplitItemAddOn {
  addonIndex?: number;
  addonName?: string;
  selectedOptions?: Array<{ name: string; price: number }>;
  optionsTotalPrice?: number;
}

/**
 * Item detail within an itemized split (returned by both POST /split and GET /session.splits[].items[])
 */
export interface SplitItemDetail {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  itemTotal?: number;
  /** Legacy/alternate name for itemTotal — keep for back-compat */
  totalPrice?: number;
  variantIndex?: number | null;
  variantName?: string | null;
  variantPrice?: number;
  addOns?: SplitItemAddOn[];
  addonsTotalPrice?: number;
  /** Which order this item belongs to — required to reconstruct the picker row key */
  orderId?: string;
}

/**
 * Individual split entry in the API response.
 * Newer responses include splitId, type, and per-participant tax/charges/tip.
 */
export interface SplitEntry {
  /** Server-assigned UUID for this split — preferred over `index` for payment correlation */
  splitId?: string;
  /** Mode this split was committed under. All splits in a session share the same type. */
  type?: SplitType;
  index: number;
  amount: number;
  /** Per-participant pro-rata tax (newer responses) */
  tax?: number;
  /** Per-participant pro-rata service charges (newer responses) */
  charges?: number;
  /** Per-participant tip captured at split time (newer responses) */
  tip?: number;
  paid: boolean;
  paidAt: string | null;
  paidBy: string | null;
  method: string | null;
  sessionUserId: string | null;
  items?: SplitItemDetail[];
}

/**
 * An item still available to be claimed in an itemized split.
 * Returned under splitConfig.remainingItems (legacy GET shape).
 */
export interface SplitRemainingItem {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  itemTotal: number;
  variantIndex?: number | null;
  variantName?: string | null;
  variantPrice?: number;
  addOns?: SplitItemAddOn[];
  addonsTotalPrice?: number;
  orderId?: string;
}

/**
 * Response from POST /ordering-session/session/{sessionId}/split
 */
export interface SplitCalculateResponse {
  data: {
    total: number;
    splits: SplitEntry[];
    allPaid: boolean;
    /** Remaining unpaid total across all splits (newer responses) */
    remainingTotal?: number;
    /** Sum already paid across splits (newer responses) */
    totalPaid?: number;
  };
}

/**
 * Split configuration stored on the session (legacy GET /session shape).
 * The cleaner POST /split response no longer includes this object — its `type`
 * is now carried per-split. Treat all fields as optional and prefer SplitEntry
 * fields when both are available.
 */
export interface SplitConfig {
  type: SplitType;
  itemIds?: Array<{ itemId: string; orderId: string; quantity: number }> | string[];
  itemizedSplit?: boolean;
  remainingItems?: SplitRemainingItem[];
  numberOfSplits?: number;
  amounts?: number[];
  /** sessionUserId of whoever initiated the itemized split */
  sessionUserId?: string;
  splitTaxes?: Record<string, number>;
  splitCharges?: Record<string, number>;
  splitTips?: Record<string, number>;
}
