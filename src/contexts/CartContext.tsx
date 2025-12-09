'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Cart, CartItem, Customization } from '@/types/cart';
import { MenuItem } from '@/types/menu';
import { getFromStorage, setInStorage } from '@/mocks/mockStorage';
import { sanitizeQuantity } from '@/lib/validation';
import { useSession } from '@/contexts/SessionContext';
import { orderService } from '@/services/order.service';
import type { QueueItem } from '@/types/api/order';

const STORAGE_KEY = 'morsel_cart';
const TAX_RATE = 0.1; // 10% tax

interface CartState {
  cart: Cart;
  addItem: (menuItem: MenuItem, customizations?: Customization[], notes?: string, quantity?: number) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
  confirmOrder: (paymentType: 'cash' | 'card' | 'upi' | string) => Promise<{ orderId: string; success: boolean }>;
}

const CartContext = createContext<CartState | undefined>(undefined);

function getEmptyCart(): Cart {
  return {
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
  };
}

function calculateItemTotal(menuItem: MenuItem, customizations: Customization[], quantity: number): number {
  let total = menuItem.price;
  
  // Add customization price modifiers
  customizations.forEach((custom) => {
    total += custom.priceModifier;
  });
  
  return total * quantity;
}

function calculateCartTotals(items: CartItem[]): { subtotal: number; tax: number; total: number } {
  const subtotal = items.reduce((sum, item) => sum + item.itemTotal, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

function generateCartItemId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `cart_${timestamp}_${random}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { sessionData, refreshSessionData } = useSession();
  const [cart, setCart] = useState<Cart>(() => {
    // Initialize from localStorage or use empty cart
    const stored = getFromStorage<Cart>(STORAGE_KEY);

    if (stored && Array.isArray(stored.items)) {
      return stored;
    }

    return getEmptyCart();
  });

  /**
   * Sync Queue with API
   * Converts cart items to queue items and syncs with the backend
   * This is called after every cart operation
   */
  const syncQueueWithAPI = async (cartItems: CartItem[]) => {
    // Only sync if we have an active session
    if (!sessionData?.session?.id) {
      console.log('Active session not available, skipping queue sync');
      return;
    }

    try {
      // Convert cart items to queue items format
      // Group by menu item ID and sum quantities
      const queueItemsMap = new Map<string, number>();

      cartItems.forEach((cartItem) => {
        const itemId = cartItem.menuItem.id;
        const currentQuantity = queueItemsMap.get(itemId) || 0;
        queueItemsMap.set(itemId, currentQuantity + cartItem.quantity);
      });

      // Convert map to array of QueueItems
      const queueItems: QueueItem[] = Array.from(queueItemsMap.entries()).map(
        ([itemId, quantity]) => ({
          itemId,
          quantity,
        })
      );

      // Generate or retrieve sessionUserId (unique per user/device)
      let sessionUserId = getFromStorage<string>('morsel_session_user_id');
      if (!sessionUserId) {
        sessionUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setInStorage('morsel_session_user_id', sessionUserId);
      }

      // Sync with API
      await orderService.updateQueue(sessionData.session.id, {
        sessionUserId,
        items: queueItems,
      });

      console.log('Queue synced successfully');
    } catch (error) {
      console.error('Failed to sync queue with API:', error);
      // Continue working offline - don't block cart operations
    }
  };

  // Save to localStorage whenever cart changes
  useEffect(() => {
    setInStorage(STORAGE_KEY, cart);
  }, [cart]);

  const addItem = (menuItem: MenuItem, customizations: Customization[] = [], notes?: string, quantity: number = 1) => {
    const validQuantity = sanitizeQuantity(quantity);
    
    // Check if the same item (without customizations) already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.menuItem.id === menuItem.id && 
              item.customizations.length === 0 && 
              customizations.length === 0
    );

    let newItems: CartItem[];

    if (existingItemIndex !== -1 && customizations.length === 0) {
      // Item exists and has no customizations - update quantity
      newItems = cart.items.map((item, index) => {
        if (index === existingItemIndex) {
          const newQuantity = item.quantity + validQuantity;
          return {
            ...item,
            quantity: newQuantity,
            itemTotal: calculateItemTotal(item.menuItem, item.customizations, newQuantity),
          };
        }
        return item;
      });
    } else {
      // New item or has customizations - add as new entry
      const newCartItem: CartItem = {
        id: generateCartItemId(),
        menuItem,
        quantity: validQuantity,
        customizations,
        notes,
        itemTotal: calculateItemTotal(menuItem, customizations, validQuantity),
      };
      newItems = [...cart.items, newCartItem];
    }

    const totals = calculateCartTotals(newItems);

    const newCart = {
      items: newItems,
      ...totals,
    };

    setCart(newCart);

    // Sync with queue API
    syncQueueWithAPI(newItems);
  };

  const removeItem = (cartItemId: string) => {
    const newItems = cart.items.filter((item) => item.id !== cartItemId);
    const totals = calculateCartTotals(newItems);

    const newCart = {
      items: newItems,
      ...totals,
    };

    setCart(newCart);

    // Sync with queue API
    syncQueueWithAPI(newItems);
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    // Validate and sanitize quantity
    const validQuantity = sanitizeQuantity(quantity);

    const newItems = cart.items.map((item) => {
      if (item.id === cartItemId) {
        const itemTotal = calculateItemTotal(item.menuItem, item.customizations, validQuantity);
        return {
          ...item,
          quantity: validQuantity,
          itemTotal,
        };
      }
      return item;
    });

    const totals = calculateCartTotals(newItems);

    const newCart = {
      items: newItems,
      ...totals,
    };

    setCart(newCart);

    // Sync with queue API
    syncQueueWithAPI(newItems);
  };

  const clearCart = () => {
    setCart(getEmptyCart());

    // Sync with queue API (empty cart)
    syncQueueWithAPI([]);
  };

  const getItemCount = (): number => {
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  const confirmOrder = async (paymentType: 'cash' | 'card' | 'upi' | string): Promise<{ orderId: string; success: boolean }> => {
    // Validate session data
    if (!sessionData?.session?.id) {
      throw new Error('Active session not available. Please login again.');
    }

    // Validate cart is not empty
    if (cart.items.length === 0) {
      throw new Error('Cart is empty. Please add items before confirming order.');
    }

    try {
      // ✅ Get sessionUserId from storage (provided by API during login)
      const sessionUserId = getFromStorage<string>('morsel_session_user_id');
      if (!sessionUserId) {
        throw new Error('Session user ID not found. Please login again.');
      }

      // Confirm the order via API
      const response = await orderService.confirmOrder(sessionData.session.id, {
        sessionUserId,
        paymentType,
      });

      console.log('[CartContext] Order confirmed successfully:', {
        orderId: response.data.id,
        status: response.data.status,
        total: response.data.total,
      });

      // ✅ Refresh session data to get updated orders array
      try {
        await refreshSessionData();
        console.log('[CartContext] Session data refreshed after order confirmation');

        // Verify order appears in session (optional verification)
        // This will be logged in refreshSessionData
      } catch (refreshError) {
        console.warn('[CartContext] Failed to refresh session after order confirmation:', refreshError);
        // Don't throw - continue even if refresh fails
      }

      // Clear the cart on successful order confirmation
      clearCart();

      return {
        orderId: response.data.id,
        success: true,
      };
    } catch (error) {
      console.error('Failed to confirm order:', error);
      throw new Error('Failed to confirm order. Please try again.');
    }
  };

  const value: CartState = {
    cart,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getItemCount,
    confirmOrder,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
