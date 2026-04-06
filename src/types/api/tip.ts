/**
 * API Types for Tips
 * POST/DELETE /ordering-session/session/{sessionId}/tip/participant
 * GET /ordering-session/session/{sessionId}/tips
 */

export interface TipEntry {
  sessionUserId: string;
  tip: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TipsResponse {
  data: {
    sessionId: string;
    tips: TipEntry[];
    totalTipAmount: number;
  };
}
