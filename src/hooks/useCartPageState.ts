/**
 * Custom hook for managing unified cart/order-status page state
 *
 * Determines whether to show pre-order UI (cart) or post-order UI (order status)
 * based on active order ID and localStorage data.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/contexts/SessionContext';
import { useCart } from '@/contexts/CartContext';
import { useOrder } from '@/contexts/OrderContext';
import { useSplit } from '@/contexts/SplitContext';
import { getFromStorage, setInStorage } from '@/mocks/mockStorage';
import { sessionService } from '@/services/session.service';
import { mapSessionOrderToAPIOrder } from '@/lib/order-mapping';
import type { Order as APIOrder } from '@/types/api/order';
import type { RestaurantContext } from '@/types/restaurant';
import type { SessionOrder } from '@/types/api/session';

export type PageState = 'pre-order' | 'post-order';

export interface TabInfo {
  id: string | null; // null indicates "New Order" tab
  label: string;
  isNewOrder: boolean;
  itemCount?: number;
  total?: number;
}

export interface CartPageState {
  // State
  pageState: PageState;
  activeOrderId: string | null;
  orderData: APIOrder | null;
  orderDisplayLabel: string | null;
  allOrderIds: string[];
  cartItemsCount: number;
  tabsToShow: TabInfo[];
  isLoading: boolean;

  // Actions
  handlePlaceOrder: () => Promise<void>;
  handleOrderMoreFood: () => void;
  handleTabSwitch: (orderId: string | null) => void; // null = new order tab
}

export function useCartPageState(): CartPageState {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sessionData, activeOrderId, setActiveOrderId, refreshSessionData } = useSession();
  const { cart, confirmOrder, clearCart } = useCart();
  const { placeOrder: placeOrderLegacy } = useOrder();
  const { split } = useSplit();

  const [orderData, setOrderData] = useState<APIOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Get restaurant context for legacy order tracking
  const restaurantContext = getFromStorage<RestaurantContext>('morsel_restaurant_context');

  // Get all order IDs from session
  const allOrderIds = useMemo(() => {
    return sessionData?.session?.orders?.map((o: string | SessionOrder) => (typeof o === 'string' ? o : o.orderId)) || [];
  }, [sessionData]);

  // On cart mount, refresh session so we get latest order IDs (including orders placed by other participants) and persist orders with items
  useEffect(() => {
    if (sessionData?.session?.id) {
      refreshSessionData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when session is available
  }, [sessionData?.session?.id]);

  // Handle URL query param for orderId (deep linking)
  useEffect(() => {
    const queryOrderId = searchParams.get('orderId');
    if (queryOrderId && queryOrderId !== activeOrderId) {
      setActiveOrderId(queryOrderId);
    }
  }, [searchParams, activeOrderId, setActiveOrderId]);

  // Load order data when activeOrderId changes. Use localStorage first; if missing (e.g. order placed by another participant), fetch from session API when orders include items.
  useEffect(() => {
    if (!activeOrderId) {
      setOrderData(null);
      setIsLoading(false);
      return;
    }

    const storedOrder = getFromStorage<APIOrder>(`morsel_order_${activeOrderId}`);
    if (storedOrder) {
      setOrderData(storedOrder);
      setIsLoading(false);
      return;
    }

    const sessionId = sessionData?.session?.id;
    const businessId = sessionData?.business?.id || sessionData?.business?.businessId;
    const spaceId = sessionData?.space?.id;

    if (!sessionId || !businessId || !spaceId) {
      setOrderData(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    sessionService
      .getSessionById(sessionId)
      .then((res) => {
        if (cancelled) return;
        const orders = res.data?.orders ?? [];
        const o = orders.find(
          (x: string | SessionOrder) =>
            (typeof x === 'object' && x && (x as SessionOrder).orderId === activeOrderId) || x === activeOrderId
        ) as SessionOrder | undefined;
        if (o && typeof o === 'object' && Array.isArray(o.items) && o.items.length > 0) {
          const mapped = mapSessionOrderToAPIOrder(o, sessionId, businessId, spaceId);
          setInStorage(`morsel_order_${activeOrderId}`, mapped);
          setOrderData(mapped);
        } else {
          setOrderData(null);
        }
      })
      .catch(() => {
        if (!cancelled) setOrderData(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeOrderId, sessionData?.session?.id, sessionData?.business?.id, sessionData?.business?.businessId, sessionData?.space?.id]);

  // Compute display label from last 5 chars of the active order ID
  const orderDisplayLabel = useMemo(() => {
    if (!activeOrderId) return null;
    const short = activeOrderId.slice(-5).toUpperCase();
    return `Order - ${short}`;
  }, [activeOrderId]);

  // Determine page state: pre-order or post-order
  const pageState: PageState = useMemo(() => {
    // If we have an active order and order data exists, show post-order state
    if (activeOrderId && orderData) {
      return 'post-order';
    }

    // Otherwise, show pre-order state (cart)
    return 'pre-order';
  }, [activeOrderId, orderData]);

  // Build tabs array
  const tabsToShow = useMemo((): TabInfo[] => {
    const tabs: TabInfo[] = [];

    // Add tabs for all placed orders
    allOrderIds.forEach((orderId, index) => {
      const storedOrder = getFromStorage<APIOrder>(`morsel_order_${orderId}`);

      tabs.push({
        id: orderId,
        label: `Order #${index + 1}`,
        isNewOrder: false,
        itemCount: storedOrder?.items?.length || 0,
        total: storedOrder?.total || 0,
      });
    });

    // Add "New Order" tab if cart has items and there are placed orders
    if (cart.items.length > 0 && allOrderIds.length > 0) {
      tabs.push({
        id: null,
        label: 'New Order',
        isNewOrder: true,
        itemCount: cart.items.length,
        total: cart.total,
      });
    }

    // Only show tabs if there are 2 or more (including new order tab)
    return tabs.length >= 2 ? tabs : [];
  }, [allOrderIds, cart.items.length, cart.total]);

  // Handle place order
  const handlePlaceOrder = useCallback(async () => {
    if (isConfirming) return;

    setIsConfirming(true);
    console.log('[useCartPageState] 🛒 Placing order...');

    try {
      // Confirm order via API
      const result = await confirmOrder('cash');

      console.log('[useCartPageState] Order confirmation result:', result);

      if (result.success && result.orderId) {
        // Update legacy OrderContext for backward compatibility
        if (restaurantContext) {
          const customerName = getFromStorage<string>('morsel_customer_name') || 'Guest';
          const diningType = getFromStorage<'dine-in' | 'takeaway' | 'delivery'>('morsel_dining_type') || 'dine-in';
          placeOrderLegacy(restaurantContext, customerName, diningType, cart, split);
        }

        // Set active order ID to show post-order state
        // NO NAVIGATION - just state change
        console.log('[useCartPageState] ✅ Order placed successfully, setting activeOrderId:', result.orderId);
        setActiveOrderId(result.orderId);

        // Update URL for deep linking
        const newUrl = `/cart?orderId=${result.orderId}`;
        window.history.replaceState(null, '', newUrl);

        setIsConfirming(false);
      } else {
        console.error('[useCartPageState] ❌ Order confirmation failed:', result);
        alert('Failed to confirm order. Please try again.');
        setIsConfirming(false);
      }
    } catch (error) {
      console.error('[useCartPageState] ❌ Order confirmation error:', error);
      alert(error instanceof Error ? error.message : 'Failed to confirm order. Please try again.');
      setIsConfirming(false);
    }
  }, [confirmOrder, restaurantContext, cart, split, placeOrderLegacy, setActiveOrderId, isConfirming]);

  // Handle order more food
  const handleOrderMoreFood = useCallback(() => {
    console.log('[useCartPageState] 🍔 Order more food clicked');

    // Clear active order ID
    setActiveOrderId(null);

    // Clear cart
    clearCart();

    // Navigate to menu
    router.push('/menu');
  }, [setActiveOrderId, clearCart, router]);

  // Handle tab switch
  const handleTabSwitch = useCallback((orderId: string | null) => {
    console.log('[useCartPageState] 🔄 Switching to tab:', orderId || 'New Order');

    if (orderId === null) {
      // Switching to "New Order" tab - clear active order
      setActiveOrderId(null);
      window.history.replaceState(null, '', '/cart');
    } else {
      // Switching to a placed order tab
      setActiveOrderId(orderId);
      window.history.replaceState(null, '', `/cart?orderId=${orderId}`);
    }
  }, [setActiveOrderId]);

  return {
    pageState,
    activeOrderId,
    orderData,
    orderDisplayLabel,
    allOrderIds,
    cartItemsCount: cart.items.length,
    tabsToShow,
    isLoading,
    handlePlaceOrder,
    handleOrderMoreFood,
    handleTabSwitch,
  };
}
