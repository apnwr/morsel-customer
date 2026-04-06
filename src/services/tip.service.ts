/**
 * Tip Service
 * Syncs participant tips to the server
 */

import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { TipsResponse } from '@/types/api/tip';

export const tipService = {
  /**
   * Add or update tip for a specific participant
   * POST /ordering-session/session/{sessionId}/tip/participant
   */
  addOrUpdateParticipantTip: async (
    sessionId: string,
    sessionUserId: string,
    tip: number
  ): Promise<void> => {
    await apiClient.post(endpoints.tip.participant(sessionId), {
      sessionUserId,
      tip,
    });
  },

  /**
   * Remove tip for a specific participant
   * DELETE /ordering-session/session/{sessionId}/tip/participant
   */
  removeParticipantTip: async (
    sessionId: string,
    sessionUserId: string
  ): Promise<void> => {
    await apiClient.delete(endpoints.tip.participant(sessionId), {
      body: JSON.stringify({ sessionUserId }),
    });
  },

  /**
   * Get all tips for a session, optionally filtered by participant
   * GET /ordering-session/session/{sessionId}/tips
   */
  getTips: async (
    sessionId: string,
    sessionUserId?: string
  ): Promise<TipsResponse> => {
    const url = sessionUserId
      ? `${endpoints.tip.getAll(sessionId)}?sessionUserId=${sessionUserId}`
      : endpoints.tip.getAll(sessionId);
    return apiClient.get<TipsResponse>(url);
  },
};
