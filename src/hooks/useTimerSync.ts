/**
 * Hook to handle timer synchronization on page load
 */

import { useEffect } from 'react';
import { useOrder } from '@/contexts/OrderContext';
import { isTimerExpired } from '@/mocks/mockOrders';

export function useTimerSync() {
  const { order, expireTimer } = useOrder();

  useEffect(() => {
    // Check timer status on mount
    if (order && order.status === 'placed' && order.timerExpiresAt) {
      if (isTimerExpired(order)) {
        // Timer expired while app was closed - lock the order
        console.log('Timer expired while app was closed. Locking order.');
        expireTimer();
      } else {
        // Timer still active - resume countdown
        console.log('Timer still active. Resuming countdown.');
      }
    }
  }, []); // Only run on mount

  return null;
}
