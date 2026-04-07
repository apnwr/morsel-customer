/**
 * Hook for the /cart page — manages pre-order (queue) state only.
 *
 * After placing an order, navigates to /orders.
 * Order viewing logic lives in useOrdersPageState.
 */

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/contexts/SessionContext';
import { useCart } from '@/contexts/CartContext';
import { useOrder } from '@/contexts/OrderContext';
import { useSplit } from '@/contexts/SplitContext';
import { getFromStorage, setInStorage } from '@/mocks/mockStorage';
import { useFlowType } from '@/hooks/useFlowType';
import { orderService } from '@/services/order.service';
import type { RestaurantContext } from '@/types/restaurant';
import type { SessionOrder } from '@/types/api/session';
import type { QueueItem } from '@/types/api/order';

export interface CartPageState {
  /** Number of items currently in the cart */
  cartItemsCount: number;
  /** All placed order IDs in this session (used for "View Orders" banner) */
  allOrderIds: string[];
  /** Whether order is being confirmed */
  isConfirming: boolean;
  /** Place the order and navigate to /orders */
  handlePlaceOrder: () => Promise<void>;
}

export function useCartPageState(): CartPageState {
  const router = useRouter();
  const { sessionData, setActiveOrderId, refreshSessionData } = useSession();
  const { cart, confirmOrder, clearCart } = useCart();
  const { placeOrder: placeOrderLegacy } = useOrder();
  const { split } = useSplit();
  const flowType = useFlowType();

  const [isConfirming, setIsConfirming] = useState(false);

  const restaurantContext = getFromStorage<RestaurantContext>('morsel_restaurant_context');

  // All placed order IDs from session
  const allOrderIds = useMemo(() => {
    return sessionData?.session?.orders?.map((o: string | SessionOrder) =>
      typeof o === 'string' ? o : o.orderId
    ) || [];
  }, [sessionData]);

  // Place order → navigate to /orders
  const handlePlaceOrder = useCallback(async () => {
    if (isConfirming) return;

    setIsConfirming(true);
    console.log('[useCartPageState] Placing order...', { flowType });

    try {
      let orderId: string;

      if (flowType === 'area') {
        // Area flow: use area-single-order API with items
        const areaId = getFromStorage<string>('morsel_area_id');
        const guestName = getFromStorage<string>('morsel_customer_name') || 'Guest';
        const sessionId = sessionData?.session?.id;

        if (!areaId) throw new Error('Area ID not found. Please scan the QR code again.');
        if (!sessionId) throw new Error('Session not found. Please scan the QR code again.');

        const items: QueueItem[] = cart.items.map((item) => ({
          itemId: item.menuItem.id,
          quantity: item.quantity,
          variantIndex: 0,
          addOns: [],
        }));

        const response = await orderService.placeAreaOrder({
          sessionId,
          areaId,
          guestName,
          items,
          paymentType: 'cash',
        });

        console.log('[useCartPageState] Area order response:', JSON.stringify(response));

        // Try to get orderId from response — structure may vary
        orderId = response?.data?.id
          || (response?.data as any)?.orderId
          || (response as any)?.orderId
          || (response as any)?.id;

        // Refresh session to get updated orders array (also extracts orderId if missing)
        try {
          await refreshSessionData();
          // If orderId still missing, get latest order from refreshed session
          if (!orderId && sessionData?.session?.orders?.length) {
            const orders = sessionData.session.orders;
            const lastOrder = orders[orders.length - 1];
            orderId = typeof lastOrder === 'string' ? lastOrder : (lastOrder as any)?.orderId;
          }
        } catch { /* non-blocking */ }

        if (!orderId) {
          console.warn('[useCartPageState] Could not extract orderId from area order response');
        }
        console.log('[useCartPageState] Area order placed:', orderId);
      } else {
        // Space flow: use queue/confirm
        const result = await confirmOrder('cash');
        console.log('[useCartPageState] Order confirmation result:', result);

        if (!result.success || !result.orderId) {
          console.error('[useCartPageState] Order confirmation failed:', result);
          alert('Failed to confirm order. Please try again.');
          setIsConfirming(false);
          return;
        }

        orderId = result.orderId;

        // Update legacy OrderContext for backward compatibility
        if (restaurantContext) {
          const customerName = getFromStorage<string>('morsel_customer_name') || 'Guest';
          const diningType = getFromStorage<'dine-in' | 'takeaway' | 'delivery'>('morsel_dining_type') || 'dine-in';
          placeOrderLegacy(restaurantContext, customerName, diningType, cart, split);
        }
      }

      // Set active order ID
      setActiveOrderId(orderId);

      // Navigate first, then clear state to avoid empty cart flash
      router.push(`/orders?orderId=${orderId}`);

      // Clear cart and ephemeral order state after navigation is initiated
      clearCart();
      setInStorage('morsel_kitchen_note', '');
      setInStorage('morsel_tip', { percentage: 10, amount: 0 });

      setIsConfirming(false);
    } catch (error) {
      console.error('[useCartPageState] Order error:', error);
      alert(error instanceof Error ? error.message : 'Failed to place order. Please try again.');
      setIsConfirming(false);
    }
  }, [confirmOrder, clearCart, restaurantContext, cart, split, placeOrderLegacy, setActiveOrderId, isConfirming, router, flowType, sessionData?.session?.id, refreshSessionData]);

  return {
    cartItemsCount: cart.items.length,
    allOrderIds,
    isConfirming,
    handlePlaceOrder,
  };
}
