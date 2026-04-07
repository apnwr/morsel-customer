/**
 * Receipt Service
 * Fetches HTML receipt from the server
 */

import { config } from '@/lib/config';
import { endpoints } from '@/lib/api/endpoints';

export const receiptService = {
  /**
   * Generate receipt for a session (returns HTML string)
   * GET /ordering-session/session/{sessionId}/receipt?sessionUserId=...
   */
  getReceipt: async (sessionId: string, sessionUserId?: string): Promise<string> => {
    let url = `${config.api.baseUrl}${endpoints.receipt.generate(sessionId)}`;
    if (sessionUserId) {
      url += `?sessionUserId=${encodeURIComponent(sessionUserId)}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to generate receipt: ${response.status}`);
    }
    return response.text();
  },
};
