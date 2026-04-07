/**
 * Payment Service
 * Handles Peach Payments API calls
 */

import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
  CreateEmbeddedCheckoutRequest,
  CreateEmbeddedCheckoutResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
} from '@/types/api/payment';

export const paymentService = {
  /**
   * Create a Peach embedded checkout session.
   * Returns checkoutId and transactionId for rendering the widget.
   */
  createEmbeddedCheckout: async (
    data: CreateEmbeddedCheckoutRequest
  ): Promise<CreateEmbeddedCheckoutResponse> => {
    return apiClient.post<CreateEmbeddedCheckoutResponse>(
      endpoints.payment.createEmbeddedCheckout(),
      data
    );
  },

  /**
   * Verify a completed checkout and settle the transaction.
   * On success, backend marks split as paid and sends receipt.
   */
  verifyPayment: async (
    data: VerifyPaymentRequest
  ): Promise<VerifyPaymentResponse> => {
    return apiClient.post<VerifyPaymentResponse>(
      endpoints.payment.verify(),
      data
    );
  },
};
