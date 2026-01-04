/**
 * Order Service
 * Handles queue management and order confirmation operations
 */

import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
  QueueUpdateRequest,
  QueueUpdateResponse,
  QueueConfirmRequest,
  OrderConfirmResponse,
} from '@/types/api/order';

/**
 * Order Service
 * Provides methods for managing customer queue and confirming orders
 */
export const orderService = {
  /**
   * Update Queue (Upsert)
   * Updates the customer's queue with current cart items
   * This is called whenever the cart changes (add/remove/update)
   *
   * @param sessionId - The ordering session ID
   * @param data - Queue update payload with sessionUserId and items (itemId, quantity)
   * @returns Updated queue information
   */
  updateQueue: async (
    sessionId: string,
    data: QueueUpdateRequest
  ): Promise<QueueUpdateResponse> => {
    return apiClient.post<QueueUpdateResponse>(
      endpoints.queue.update(sessionId),
      data
    );
  },

  /**
   * Confirm Order
   * Confirms the order and sends it to the kitchen
   * This clears the queue and creates a new order
   * Note: Queue must be synced before calling this (via updateQueue)
   *
   * @param sessionId - The ordering session ID
   * @param data - Confirmation payload with sessionUserId and paymentType only
   * @returns Confirmed order details
   */
  confirmOrder: async (
    sessionId: string,
    data: QueueConfirmRequest
  ): Promise<OrderConfirmResponse> => {
    return apiClient.post<OrderConfirmResponse>(
      endpoints.queue.confirm(sessionId),
      data
    );
  },
};
