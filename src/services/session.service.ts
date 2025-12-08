/**
 * Ordering Session Service
 * Handles all ordering session related API calls
 */

import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
  OrderingSessionResponse,
  StartSessionRequest,
  StartSessionResponse,
  SessionDetailResponse,
} from '@/types/api/session';

export const sessionService = {
  /**
   * Get ordering session by space ID
   * @param spaceId - The space identifier from QR code
   * @returns Ordering session data including space, business, and session info
   */
  getSessionBySpaceId: async (
    spaceId: string
  ): Promise<OrderingSessionResponse> => {
    return apiClient.get<OrderingSessionResponse>(
      endpoints.orderingSession.getBySpaceId(spaceId)
    );
  },

  /**
   * Start a new ordering session
   * Creates an active session for the customer to begin ordering
   * @param data - Session start data with spaceId and guestName
   * @returns New session data with session ID
   */
  startSession: async (
    data: StartSessionRequest
  ): Promise<StartSessionResponse> => {
    return apiClient.post<StartSessionResponse>(
      endpoints.orderingSession.start(),
      data
    );
  },

  /**
   * Get session details by session ID
   * Fetches detailed session information including participants, orders, and queue
   * @param sessionId - The session ID
   * @returns Detailed session data with participants
   */
  getSessionById: async (
    sessionId: string
  ): Promise<SessionDetailResponse> => {
    return apiClient.get<SessionDetailResponse>(
      endpoints.orderingSession.getBySessionId(sessionId)
    );
  },
};
