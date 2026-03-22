/**
 * Hook for the /orders page — unified view of all placed orders in a session.
 *
 * Loads all order IDs from session, fetches missing orders from API,
 * merges them into a single APIOrder for display, and polls for updates.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/contexts/SessionContext';
import { useCart } from '@/contexts/CartContext';
import { getFromStorage, setInStorage } from '@/mocks/mockStorage';
import { sessionService } from '@/services/session.service';
import { mapSessionOrderToAPIOrder } from '@/lib/order-mapping';
import { mergeOrders } from '@/lib/order-merging';
import type { Order as APIOrder } from '@/types/api/order';
import type { SessionOrder } from '@/types/api/session';

const ORDERS_POLL_INTERVAL = 30000; // 30s — catch other participants' orders

export interface OrdersPageState {
  /** Merged order data — all placed orders combined */
  orderData: APIOrder | null;
  /** Display label for header (e.g. "Order - ABCDE" or "Orders (3)") */
  orderDisplayLabel: string | null;
  /** All placed order IDs in this session */
  allOrderIds: string[];
  isLoading: boolean;
  /** Navigate to /menu and clear active order */
  handleOrderMoreFood: () => void;
}

export function useOrdersPageState(): OrdersPageState {
  const router = useRouter();
  const { sessionData, setActiveOrderId, refreshSessionData } = useSession();
  const { clearCart } = useCart();

  const [orderData, setOrderData] = useState<APIOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // All order IDs from session
  const allOrderIds = useMemo(() => {
    return sessionData?.session?.orders?.map((o: string | SessionOrder) =>
      typeof o === 'string' ? o : o.orderId
    ) || [];
  }, [sessionData]);

  // Refresh session on mount to get latest orders (including from other participants)
  useEffect(() => {
    if (sessionData?.session?.id) {
      refreshSessionData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [sessionData?.session?.id]);

  // Poll for new orders from other participants
  useEffect(() => {
    if (!sessionData?.session?.id) return;

    pollRef.current = setInterval(() => {
      refreshSessionData();
    }, ORDERS_POLL_INTERVAL);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable interval based on session
  }, [sessionData?.session?.id]);

  // Load all orders and merge into unified view
  // Strategy: show cached data instantly, then always refresh from API
  useEffect(() => {
    if (allOrderIds.length === 0) {
      setOrderData(null);
      setIsLoading(false);
      return;
    }

    // 1. Show cached data immediately for fast UX
    const cachedOrders: APIOrder[] = [];
    for (const orderId of allOrderIds) {
      const stored = getFromStorage<APIOrder>(`morsel_order_${orderId}`);
      if (stored && stored.items?.length > 0) {
        cachedOrders.push(stored);
      }
    }

    if (cachedOrders.length > 0) {
      setOrderData(mergeOrders(cachedOrders, allOrderIds[allOrderIds.length - 1]));
    }

    // 2. Always fetch from API to get latest data (dashboard-added items, etc.)
    const sessionId = sessionData?.session?.id;
    const businessId = sessionData?.business?.id || sessionData?.business?.businessId;
    const spaceId = sessionData?.space?.id;

    if (!sessionId || !businessId || !spaceId) {
      // No session info — can only use cached data
      if (cachedOrders.length === 0) setOrderData(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    if (cachedOrders.length === 0) setIsLoading(true);

    sessionService
      .getSessionById(sessionId)
      .then((res) => {
        if (cancelled) return;
        const apiOrders = res.data?.orders ?? [];
        const freshOrders: APIOrder[] = [];

        for (const o of apiOrders) {
          const order = typeof o === 'object' && o && 'orderId' in o ? (o as SessionOrder) : null;
          if (order?.items && Array.isArray(order.items) && order.items.length > 0) {
            const key = `morsel_order_${order.orderId}`;
            const existing = getFromStorage<APIOrder>(key);
            const mapped = mapSessionOrderToAPIOrder(order, sessionId, businessId, spaceId);

            if (existing) {
              // Preserve client-only metadata while updating items from API
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const ext = existing as any;
              const updated = {
                ...mapped,
                _placedAt: ext._placedAt ?? 0,
                _itemParticipants: ext._itemParticipants ?? {},
                _itemImages: ext._itemImages ?? {},
                _itemDietary: ext._itemDietary ?? {},
                _kitchenNote: ext._kitchenNote ?? '',
              };
              setInStorage(key, updated);
              freshOrders.push(updated);
            } else {
              setInStorage(key, mapped);
              freshOrders.push(mapped);
            }
          }
        }

        if (freshOrders.length > 0) {
          setOrderData(mergeOrders(freshOrders, allOrderIds[allOrderIds.length - 1]));
        }
      })
      .catch(() => {
        // API failed — keep showing cached data (already set above)
        if (!cancelled && cachedOrders.length === 0) {
          setOrderData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [allOrderIds, sessionData?.session?.id, sessionData?.business?.id, sessionData?.business?.businessId, sessionData?.space?.id]);

  // Display label
  const orderDisplayLabel = useMemo(() => {
    if (allOrderIds.length === 0) return null;
    if (allOrderIds.length === 1) {
      const short = allOrderIds[0].slice(-5).toUpperCase();
      return `Order - ${short}`;
    }
    return `Orders (${allOrderIds.length})`;
  }, [allOrderIds]);

  // Navigate to menu — clear ephemeral order state
  const handleOrderMoreFood = useCallback(() => {
    setActiveOrderId(null);
    clearCart();
    // Clear tip and kitchen note so they don't leak into the next order
    setInStorage('morsel_kitchen_note', '');
    setInStorage('morsel_tip', { percentage: 10, amount: 0 });
    router.push('/menu');
  }, [setActiveOrderId, clearCart, router]);

  return {
    orderData,
    orderDisplayLabel,
    allOrderIds,
    isLoading,
    handleOrderMoreFood,
  };
}
