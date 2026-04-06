/**
 * API Types for Split Bill
 * POST /ordering-session/session/{sessionId}/split
 */

/**
 * Request payload for calculating a split
 */
export interface SplitCalculateRequest {
  type: 'equal' | 'participant' | 'custom' | 'itemized';
  /** Number of equal splits (used for 'equal' type) */
  numberOfSplits?: number;
  /** Array of amounts per split (used for 'custom' type) */
  amounts?: number[];
  /** Flat array of selected item IDs (used for 'itemized' type) */
  itemIds?: string[];
}

/**
 * Individual split entry in the API response
 */
export interface SplitEntry {
  index: number;
  amount: number;
  paid: boolean;
  paidAt: string | null;
  paidBy: string | null;
  method: string | null;
  sessionUserId: string | null;
  items?: SplitItemDetail[];
}

/**
 * Item detail within an itemized split
 */
export interface SplitItemDetail {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  variantName?: string;
  addOns?: Array<{ name: string; price: number }>;
}

/**
 * Response from POST /ordering-session/session/{sessionId}/split
 */
export interface SplitCalculateResponse {
  data: {
    total: number;
    splits: SplitEntry[];
    allPaid: boolean;
  };
}

/**
 * Split configuration stored on the session
 * Returned by GET /ordering-session/session/{sessionId}
 */
export interface SplitConfig {
  type: 'equal' | 'participant' | 'custom' | 'itemized';
  itemIds?: string[];
  itemizedSplit?: boolean;
  remainingItems?: any[];
  numberOfSplits?: number;
  amounts?: number[];
}
