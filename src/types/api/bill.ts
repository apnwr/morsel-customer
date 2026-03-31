/**
 * API Types for Session Bill
 * GET /ordering-session/session/{sessionId}/bill
 */

export interface BillTax {
  name: string;
  percentage: number;
  amount: number;
}

export interface BillCharge {
  name: string;
  type: 'percentage' | 'fixed' | string;
  amount: number;
}

export interface SessionBill {
  subtotal: number;
  taxes: Record<string, BillTax>;
  totalTax: number;
  charges: Record<string, BillCharge>;
  totalCharges: number;
  tip: { total: number };
  totalTip: number;
  discount: { total: number };
  totalDiscount: number;
  total: number;
  itemCount: number;
  orderCount: number;
}

export interface SessionBillResponse {
  data: SessionBill & {
    session: unknown;
    orders: unknown[];
  };
}
