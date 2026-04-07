/**
 * Split Service
 * Syncs split settings to the server
 */

import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { SplitCalculateRequest, SplitCalculateResponse } from '@/types/api/split';

export const splitService = {
  /**
   * Calculate and persist a split for a session
   * POST /ordering-session/session/{sessionId}/split
   */
  calculateSplit: async (
    sessionId: string,
    payload: SplitCalculateRequest
  ): Promise<SplitCalculateResponse> => {
    return apiClient.post<SplitCalculateResponse>(
      endpoints.split.calculate(sessionId),
      payload
    );
  },
};
