/**
 * Utility for merging multiple placed orders into a single unified view.
 * Used by the /orders page to show all session orders as one combined order.
 */

import type { Order as APIOrder } from '@/types/api/order';

/**
 * Merge multiple placed orders into a single unified APIOrder.
 * Items are concatenated (not grouped) so each order's items remain distinct.
 * Totals are summed. The merged order uses the latestOrderId as its id.
 */
export function mergeOrders(orders: APIOrder[], latestOrderId: string): APIOrder | null {
  if (orders.length === 0) return null;
  if (orders.length === 1) return orders[0];

  const merged: APIOrder = {
    ...orders[0],
    id: latestOrderId,
    items: [],
    total: 0,
  };

  // Merge _itemParticipants, _itemImages, _itemDietary across all orders
  const mergedParticipants: Record<string, string> = {};
  const mergedImages: Record<string, string> = {};
  const mergedDietary: Record<string, { allergens?: string[]; dietary?: string[] }> = {};

  for (const order of orders) {
    if (order.items) {
      merged.items.push(...order.items);
    }
    merged.total += order.total || 0;

    // Merge metadata maps
    const ext = order as APIOrder & {
      _itemParticipants?: Record<string, string>;
      _itemImages?: Record<string, string>;
      _itemDietary?: Record<string, { allergens?: string[]; dietary?: string[] }>;
    };
    if (ext._itemParticipants) Object.assign(mergedParticipants, ext._itemParticipants);
    if (ext._itemImages) Object.assign(mergedImages, ext._itemImages);
    if (ext._itemDietary) Object.assign(mergedDietary, ext._itemDietary);
  }

  // Round total to avoid floating point drift
  merged.total = Math.round(merged.total * 100) / 100;

  // Attach merged metadata (cast via unknown to bypass strict index signature)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = merged as any;
  m._itemParticipants = mergedParticipants;
  m._itemImages = mergedImages;
  m._itemDietary = mergedDietary;

  // Use earliest _placedAt for countdown timer
  const placedTimes = orders
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map(o => (o as any)._placedAt as number)
    .filter(t => t && t > 0);
  m._placedAt = placedTimes.length > 0 ? Math.min(...placedTimes) : 0;

  // Merge kitchen notes (concatenate non-empty, deduplicated)
  const notes = orders
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map(o => (o as any)._kitchenNote as string)
    .filter(n => n && n.trim().length > 0);
  m._kitchenNote = [...new Set(notes)].join('; ');

  return merged;
}
