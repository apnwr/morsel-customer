/**
 * Bill Service
 * Fetches the session bill from the API
 */

import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { SessionBill, SessionBillResponse } from '@/types/api/bill';

export const billService = {
  /**
   * Get bill for an ordering session
   * Returns complete bill with taxes, charges, discounts, and grand total
   */
  getSessionBill: async (sessionId: string): Promise<SessionBill> => {
    const response = await apiClient.get<SessionBillResponse>(
      endpoints.bill.getBySessionId(sessionId)
    );
    // Extract bill fields from data (which also contains session/orders we don't need here)
    const d = response.data;
    return {
      subtotal: d.subtotal,
      taxes: d.taxes,
      totalTax: d.totalTax,
      charges: d.charges,
      totalCharges: d.totalCharges,
      tip: d.tip,
      totalTip: d.totalTip,
      discount: d.discount,
      totalDiscount: d.totalDiscount,
      total: d.total,
      itemCount: d.itemCount,
      orderCount: d.orderCount,
      itemTotalWithoutTax: d.itemTotalWithoutTax,
    };
  },
};
