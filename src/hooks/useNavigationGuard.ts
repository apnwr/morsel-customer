/**
 * Navigation guard hooks
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useOrder } from '@/contexts/OrderContext';

/**
 * Redirect to home if no restaurant context
 * This is used on pages that require context (menu, cart, etc.)
 */
export function useRequireRestaurantContext() {
  const router = useRouter();
  const { context } = useRestaurant();

  useEffect(() => {
    if (!context || !context.restaurant) {
      console.log('[useRequireRestaurantContext] ⚠️ No restaurant context found. Redirecting to home (user must scan QR code)');
      router.push('/');
    }
  }, [context, router]);

  return context;
}

/**
 * Redirect to cart if no active order
 */
export function useRequireActiveOrder() {
  const router = useRouter();
  const { order } = useOrder();

  useEffect(() => {
    if (!order || order.status === 'pending') {
      console.log('No active order found. Redirecting to cart.');
      router.push('/cart');
    }
  }, [order, router]);

  return order;
}

/**
 * Redirect to menu if accessing cart with empty cart
 */
export function useRequireCartItems() {
  const router = useRouter();
  const { order } = useOrder();

  useEffect(() => {
    // Only redirect if there's no active order
    // (if there's an active order, we want to show the order summary)
    if (!order || order.status === 'pending') {
      // This guard is optional - we can allow empty cart page
      // Commenting out for now as it might be too restrictive
      // if (cart.items.length === 0) {
      //   console.log('Cart is empty. Redirecting to menu.');
      //   router.push('/menu');
      // }
    }
  }, [order, router]);
}

/**
 * Handle browser back button appropriately
 * This is more of a utility to track navigation
 */
export function useBackButtonHandler(onBack?: () => void) {
  useEffect(() => {
    const handlePopState = () => {
      if (onBack) {
        onBack();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onBack]);
}
