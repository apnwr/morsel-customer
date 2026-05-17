/**
 * Peach Payments API Types
 */

// ==================== API Request/Response ====================

export interface CreateEmbeddedCheckoutRequest {
  sessionId: string;
  sessionUserId?: string;
  splitIdentifier?: string;
  splitId?: string;
}

export interface CreateEmbeddedCheckoutResponse {
  checkout: {
    checkoutId: string;
    checkoutUrl: string;
    /** Peach entity ID — used as `key` in Checkout.initiate(). Returned by backend from stored business secrets. */
    entityId?: string;
  };
  transactionId: string;
}

export interface VerifyPaymentRequest {
  checkoutId: string;
  transactionId?: string;
  clientId?: string;
  phone?: string;
  splitId?: string;
  sessionUserId?: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  status: 'success' | 'failed';
  verification: Record<string, unknown>;
  transactionId: string;
}

// ==================== Checkout State Machine ====================

export type PeachCheckoutStatus =
  | 'idle'
  | 'creating'
  | 'loading-sdk'
  | 'ready'
  | 'rendered'
  | 'verifying'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'error';

export interface PeachCheckoutState {
  status: PeachCheckoutStatus;
  checkoutId: string | null;
  transactionId: string | null;
  error: string | null;
}
