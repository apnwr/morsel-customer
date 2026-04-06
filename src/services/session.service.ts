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
  EndSessionRequest,
  EndSessionResponse,
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

  /**
   * Start an area-scoped single-user session (and optionally place an order)
   * POST /ordering-session/session/area-single-order
   * @param data - Area session data with areaId, guestName, and optional items
   */
  startAreaSession: async (
    data: {
      areaId: string;
      guestName: string;
      sessionId?: string;
      patronId?: string;
      items?: Array<{
        itemId: string;
        quantity: number;
        variantIndex?: number;
        addOns?: Array<{ addonIndex: number }>;
      }>;
      paymentType?: string;
      businessId?: string;
    }
  ): Promise<StartSessionResponse> => {
    return apiClient.post<StartSessionResponse>(
      endpoints.area.startSession(),
      data
    );
  },

  /**
   * End an active ordering session
   * Marks the session as completed/ended
   * @param sessionId - The session ID to end
   * @param data - End session data with sessionUserId and optional reason
   * @returns End session response with updated status
   */
  endSession: async (
    sessionId: string,
    data: EndSessionRequest
  ): Promise<EndSessionResponse> => {
    return apiClient.put<EndSessionResponse>(
      endpoints.orderingSession.end(sessionId),
      data
    );
  },
};
