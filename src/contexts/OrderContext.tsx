'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Order } from '@/types/order';
import { Cart, SplitBill } from '@/types/cart';
import { RestaurantContext as RestaurantContextType } from '@/types/restaurant';
import { getFromStorage, setInStorage } from '@/mocks/mockStorage';
import {
  ORDER_TIMER_DURATION,
  generateOrderId,
  generateETA,
  syncOrderTimer,
  isTimerExpired,
  getRemainingTime,
} from '@/mocks/mockOrders';

const STORAGE_KEY = 'morsel_order';

interface OrderState {
  order: Order | null;
  remainingTime: number;
  placeOrder: (
    restaurantContext: RestaurantContextType,
    customerName: string,
    diningType: 'dine-in' | 'takeaway' | 'delivery',
    cart: Cart,
    split: SplitBill
  ) => void;
  startTimer: () => void;
  expireTimer: () => void;
  resetOrder: () => void;
  updateOrder: (updates: Partial<Order>) => void;
}

const OrderContext = createContext<OrderState | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [order, setOrder] = useState<Order | null>(() => {
    // Initialize from localStorage and sync timer
    const stored = getFromStorage<Order>(STORAGE_KEY);
    
    if (stored) {
      return syncOrderTimer(stored);
    }
    
    return null;
  });
  
  const [remainingTime, setRemainingTime] = useState<number>(() => {
    const stored = getFromStorage<Order>(STORAGE_KEY);
    if (stored && stored.status === 'placed' && !isTimerExpired(stored)) {
      return getRemainingTime(stored);
    }
    return 0;
  });

  // Save to localStorage whenever order changes
  useEffect(() => {
    if (order) {
      setInStorage(STORAGE_KEY, order);
    } else {
      setInStorage(STORAGE_KEY, null);
    }
  }, [order]);

  // Timer countdown effect
  useEffect(() => {
    if (!order || order.status !== 'placed' || !order.timerExpiresAt) {
      return;
    }

    const interval = setInterval(() => {
      const remaining = getRemainingTime(order);
      setRemainingTime(remaining);

      if (remaining <= 0) {
        // Timer expired
        setOrder((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            status: 'locked',
            isEditable: false,
          };
        });
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [order]);

  const placeOrder = useCallback(
    (
      restaurantContext: RestaurantContextType,
      customerName: string,
      diningType: 'dine-in' | 'takeaway' | 'delivery',
      cart: Cart,
      split: SplitBill
    ) => {
      const now = Date.now();
      const expiresAt = now + ORDER_TIMER_DURATION * 1000;

      const newOrder: Order = {
        id: generateOrderId(),
        restaurantContext,
        customerName,
        diningType,
        cart,
        split,
        status: 'placed',
        placedAt: now,
        timerDuration: ORDER_TIMER_DURATION,
        timerExpiresAt: expiresAt,
        eta: generateETA(),
        isEditable: true,
      };

      setOrder(newOrder);
      setRemainingTime(ORDER_TIMER_DURATION);
    },
    []
  );

  const startTimer = useCallback(() => {
    if (!order) return;

    const now = Date.now();
    const expiresAt = now + ORDER_TIMER_DURATION * 1000;

    setOrder({
      ...order,
      status: 'placed',
      placedAt: now,
      timerExpiresAt: expiresAt,
      eta: generateETA(),
      isEditable: true,
    });

    setRemainingTime(ORDER_TIMER_DURATION);
  }, [order]);

  const expireTimer = useCallback(() => {
    if (!order) return;

    setOrder({
      ...order,
      status: 'locked',
      isEditable: false,
      timerExpiresAt: Date.now(),
    });

    setRemainingTime(0);
  }, [order]);

  const resetOrder = useCallback(() => {
    setOrder(null);
    setRemainingTime(0);
  }, []);

  const updateOrder = useCallback((updates: Partial<Order>) => {
    setOrder((prev) => {
      if (!prev) return null;
      return { ...prev, ...updates };
    });
  }, []);

  const value: OrderState = {
    order,
    remainingTime,
    placeOrder,
    startTimer,
    expireTimer,
    resetOrder,
    updateOrder,
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
}
