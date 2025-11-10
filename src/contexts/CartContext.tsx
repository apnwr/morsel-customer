'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Cart, CartItem, Customization } from '@/types/cart';
import { MenuItem } from '@/types/menu';
import { getFromStorage, setInStorage } from '@/mocks/mockStorage';
import { sanitizeQuantity } from '@/lib/validation';

const STORAGE_KEY = 'morsel_cart';
const TAX_RATE = 0.1; // 10% tax

interface CartState {
  cart: Cart;
  addItem: (menuItem: MenuItem, customizations?: Customization[], notes?: string, quantity?: number) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
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
  const [cart, setCart] = useState<Cart>(() => {
    // Initialize from localStorage or use empty cart
    const stored = getFromStorage<Cart>(STORAGE_KEY);
    
    if (stored && Array.isArray(stored.items)) {
      return stored;
    }
    
    return getEmptyCart();
  });

  // Save to localStorage whenever cart changes
  useEffect(() => {
    setInStorage(STORAGE_KEY, cart);
  }, [cart]);

  const addItem = (menuItem: MenuItem, customizations: Customization[] = [], notes?: string, quantity: number = 1) => {
    const validQuantity = sanitizeQuantity(quantity);
    
    const newCartItem: CartItem = {
      id: generateCartItemId(),
      menuItem,
      quantity: validQuantity,
      customizations,
      notes,
      itemTotal: calculateItemTotal(menuItem, customizations, validQuantity),
    };

    const newItems = [...cart.items, newCartItem];
    const totals = calculateCartTotals(newItems);

    setCart({
      items: newItems,
      ...totals,
    });
  };

  const removeItem = (cartItemId: string) => {
    const newItems = cart.items.filter((item) => item.id !== cartItemId);
    const totals = calculateCartTotals(newItems);

    setCart({
      items: newItems,
      ...totals,
    });
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

    setCart({
      items: newItems,
      ...totals,
    });
  };

  const clearCart = () => {
    setCart(getEmptyCart());
  };

  const getItemCount = (): number => {
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  const value: CartState = {
    cart,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getItemCount,
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
