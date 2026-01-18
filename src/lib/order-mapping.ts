/**
 * Maps SessionOrder (from API/Real-time DB) with items to API Order shape
 * so PostOrderView can display order details for any participant.
 */

import type { Order as APIOrder, OrderItem } from '@/types/api/order';
import type { SessionOrder, SessionOrderItem } from '@/types/api/session';

export function mapSessionOrderToAPIOrder(
  o: SessionOrder & { items?: SessionOrderItem[] },
  sessionId: string,
  businessId: string,
  spaceId: string
): APIOrder & { _placedAt?: number } {
  const items: OrderItem[] = (o.items ?? []).map((it) => ({
    itemId: it.itemId,
    name: it.name,
    quantity: it.quantity,
    variantIndex: it.variantIndex ?? 0,
    variantName: '',
    variantPrice: it.variantPrice ?? it.unitPrice ?? 0,
    addOns: [],
    addonsTotalPrice: it.addonsTotalPrice ?? 0,
    unitPrice: it.unitPrice ?? it.variantPrice ?? 0,
    itemTotal: it.itemTotal ?? (it.unitPrice ?? 0) * it.quantity,
  }));

  return {
    id: o.orderId,
    sessionId,
    sessionUserId: o.sessionUserId,
    businessId,
    spaceId,
    items,
    total: o.total ?? items.reduce((s, i) => s + i.itemTotal, 0),
    payment: { type: 'cash', paid: false },
    status: o.status || 'pending',
    _placedAt: 0, // no edit countdown for orders loaded from API
  };
}
