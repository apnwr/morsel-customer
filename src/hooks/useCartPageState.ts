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
import type { RestaurantContext } from '@/types/restaurant';
import type { SessionOrder } from '@/types/api/session';

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
  const { sessionData, setActiveOrderId } = useSession();
  const { cart, confirmOrder, clearCart } = useCart();
  const { placeOrder: placeOrderLegacy } = useOrder();
  const { split } = useSplit();

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
    console.log('[useCartPageState] Placing order...');

    try {
      const result = await confirmOrder('cash');

      console.log('[useCartPageState] Order confirmation result:', result);

      if (result.success && result.orderId) {
        // Update legacy OrderContext for backward compatibility
        if (restaurantContext) {
          const customerName = getFromStorage<string>('morsel_customer_name') || 'Guest';
          const diningType = getFromStorage<'dine-in' | 'takeaway' | 'delivery'>('morsel_dining_type') || 'dine-in';
          placeOrderLegacy(restaurantContext, customerName, diningType, cart, split);
        }

        // Set active order ID
        setActiveOrderId(result.orderId);

        // Navigate first, then clear state to avoid empty cart flash
        router.push(`/orders?orderId=${result.orderId}`);

        // Clear cart and ephemeral order state after navigation is initiated
        clearCart();
        setInStorage('morsel_kitchen_note', '');
        setInStorage('morsel_tip', { percentage: 10, amount: 0 });

        setIsConfirming(false);
      } else {
        console.error('[useCartPageState] Order confirmation failed:', result);
        alert('Failed to confirm order. Please try again.');
        setIsConfirming(false);
      }
    } catch (error) {
      console.error('[useCartPageState] Order confirmation error:', error);
      alert(error instanceof Error ? error.message : 'Failed to confirm order. Please try again.');
      setIsConfirming(false);
    }
  }, [confirmOrder, clearCart, restaurantContext, cart, split, placeOrderLegacy, setActiveOrderId, isConfirming, router]);

  return {
    cartItemsCount: cart.items.length,
    allOrderIds,
    isConfirming,
    handlePlaceOrder,
  };
}
