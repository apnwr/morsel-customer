'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Cart, CartItem, Customization } from '@/types/cart';
import { MenuItem } from '@/types/menu';
import { getFromStorage, setInStorage } from '@/mocks/mockStorage';
import { sanitizeQuantity } from '@/lib/validation';
import { useSession } from '@/contexts/SessionContext';
import { orderService } from '@/services/order.service';
import type { QueueItem, OrderItemAddon } from '@/types/api/order';

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

  const result = {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100,
  };

  console.log('[CartContext] 💵 Cart totals calculated:', {
    itemsCount: items.length,
    itemTotals: items.map(item => `${item.menuItem.name}: $${item.itemTotal.toFixed(2)} (qty: ${item.quantity})`),
    subtotal: `$${result.subtotal.toFixed(2)}`,
    tax: `$${result.tax.toFixed(2)} (${(TAX_RATE * 100).toFixed(0)}%)`,
    total: `$${result.total.toFixed(2)}`
  });

  return result;
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
    console.log('[CartContext] 🔄 syncQueueWithAPI called with', cartItems.length, 'items');

    // Only sync if we have an active session
    if (!sessionData?.session?.id) {
      console.warn('[CartContext] ⚠️ Active session not available, skipping queue sync');
      console.log('[CartContext] Session data:', sessionData);
      return;
    }

    console.log('[CartContext] ✅ Session available:', sessionData.session.id);

    try {
      // Convert cart items to queue items format with variants and addons
      // Each cart item becomes a separate queue item (no grouping by itemId)
      const queueItems: QueueItem[] = cartItems.map((cartItem) => {
        // Extract variant index from customizations
        let variantIndex = 0;
        const variantCustomization = cartItem.customizations.find(
          (c) => c.optionId === 'variant'
        );
        if (variantCustomization) {
          const match = variantCustomization.choiceId.match(/variant-(\d+)/);
          if (match) {
            variantIndex = parseInt(match[1], 10);
          }
        }

        // Group addons by addon index and collect selected options
        const addonsMap = new Map<number, Set<number>>();

        cartItem.customizations.forEach((customization) => {
          // Skip variant customizations
          if (customization.optionId === 'variant') {
            return;
          }

          // Parse addon group index from optionId (e.g., "addon-group-0" -> 0)
          const groupMatch = customization.optionId.match(/addon-group-(\d+)/);
          if (groupMatch) {
            const addonIndex = parseInt(groupMatch[1], 10);

            // Parse option index from choiceId (e.g., "addon-0-2" -> 2)
            const optionMatch = customization.choiceId.match(/addon-\d+-(\d+)/);
            if (optionMatch) {
              const optionIndex = parseInt(optionMatch[1], 10);

              // Add to map
              if (!addonsMap.has(addonIndex)) {
                addonsMap.set(addonIndex, new Set());
              }
              addonsMap.get(addonIndex)!.add(optionIndex);
            }
          }
        });

        // Convert map to array format, sorted by addon index
        const addOns: OrderItemAddon[] = Array.from(addonsMap.entries())
          .sort(([a], [b]) => a - b)
          .map(([addonIndex, optionsSet]) => ({
            addonIndex,
            selectedOptions: Array.from(optionsSet).sort((a, b) => a - b),
          }));

        console.log('[CartContext] 📦 Adding to queue:', {
          itemId: cartItem.menuItem.id,
          name: cartItem.menuItem.name,
          quantity: cartItem.quantity,
          variantIndex,
          addOns: addOns.length > 0 ? addOns : []
        });

        return {
          itemId: cartItem.menuItem.id,
          quantity: cartItem.quantity,
          variantIndex,
          addOns,
        };
      });

      // Generate or retrieve sessionUserId (unique per user/device)
      let sessionUserId = getFromStorage<string>('morsel_session_user_id');
      if (!sessionUserId) {
        sessionUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setInStorage('morsel_session_user_id', sessionUserId);
        console.log('[CartContext] Generated new sessionUserId:', sessionUserId);
      } else {
        console.log('[CartContext] Using existing sessionUserId:', sessionUserId.substring(0, 8) + '...');
      }

      // Log the complete payload structure
      const payload = {
        sessionUserId,
        items: queueItems,
      };

      console.log('[CartContext] 📤 Queue API Payload Structure:', {
        sessionId: sessionData.session.id,
        itemsCount: queueItems.length,
      });

      console.log('[CartContext] 📋 Full Payload (matching API documentation):',
        JSON.stringify(payload, null, 2)
      );

      // Sync with API
      const response = await orderService.updateQueue(sessionData.session.id, payload);

      console.log('[CartContext] ✅ Queue synced successfully:', response);
    } catch (error) {
      console.error('[CartContext] ❌ Failed to sync queue with API:', error);
      if (error instanceof Error) {
        console.error('[CartContext] Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
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

      // Log the order confirmation payload for debugging
      console.log('[CartContext] 📦 Confirming order with payload:', {
        sessionUserId: sessionUserId.substring(0, 8) + '...',
        paymentType
      });

      // Confirm the order via API (queue must already be synced)
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

      // Store order data temporarily for order-status page with timestamp
      const orderWithTimestamp = {
        ...response.data,
        _placedAt: Date.now(), // Store when order was placed for timer calculation
      };
      setInStorage(`morsel_order_${response.data.id}`, orderWithTimestamp);

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
