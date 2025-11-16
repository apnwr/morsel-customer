'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useOrder } from '@/contexts/OrderContext';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { Badge } from '@/components/ui/Badge';

interface HeaderProps {
  showTimer?: boolean;
  showCart?: boolean;
  showFilters?: boolean;
}

export function Header({ showTimer = false, showCart = true, showFilters = false }: HeaderProps) {
  const router = useRouter();
  const { cart } = useCart();
  const { order } = useOrder();
  const { context } = useRestaurant();
  const [remainingMinutes, setRemainingMinutes] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [tableNumber, setTableNumber] = useState('15');

  // Handle hydration
  useEffect(() => {
    setMounted(true);
    // Load table number from localStorage
    const stored = localStorage.getItem('morsel_table_number');
    if (stored) {
      setTableNumber(stored);
    }
    
    // Listen for storage changes
    const handleStorageChange = () => {
      const updated = localStorage.getItem('morsel_table_number');
      if (updated) {
        setTableNumber(updated);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Update timer every second
  useEffect(() => {
    if (showTimer && order && order.timerExpiresAt) {
      const updateTimer = () => {
        const remaining = Math.ceil((order.timerExpiresAt! - Date.now()) / 60000);
        setRemainingMinutes(Math.max(0, remaining));
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);

      return () => clearInterval(interval);
    }
  }, [showTimer, order]);

  const handleCartClick = () => {
    router.push('/cart');
  };

  return (
    <div className="sticky top-0 bg-white border-b border-gray-100 z-10">
      <div className="p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          {/* Table Number Circle */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <div className="absolute inset-0 border-2 border-black rounded-full"></div>
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black rounded-full"></div>
              <span className="text-lg font-bold">{tableNumber}</span>
            </div>
            
            {/* Timer Badge */}
            {showTimer && order && order.timerExpiresAt && (
              <Badge variant="timer">
                {remainingMinutes} mins
              </Badge>
            )}
          </div>

          {/* Restaurant Name */}
          <div className="flex-1 text-center min-w-0">
            <h1 className="text-lg font-semibold truncate">{context.restaurant.name}</h1>
          </div>

          {/* Cart Total */}
          {showCart && (
            <button
              onClick={handleCartClick}
              className="flex items-center gap-2 px-6 py-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors min-h-[44px] shrink-0"
              aria-label="View cart"
            >
              <span className="font-semibold text-lg text-gray-600">
                ${mounted ? cart.total.toFixed(2) : '0.00'}
              </span>
              <span className="text-gray-400">→</span>
            </button>
          )}
        </div>

        {/* Filter Pills */}
        {showFilters && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2">
            <button className="px-4 py-2 bg-gray-100 rounded-full text-sm whitespace-nowrap hover:bg-gray-200 transition-colors min-h-[44px]">
              Filters
            </button>
            <button className="px-4 py-2 bg-gray-100 rounded-full text-sm whitespace-nowrap hover:bg-gray-200 transition-colors min-h-[44px]">
              Bestseller
            </button>
            <button className="px-4 py-2 bg-gray-100 rounded-full text-sm whitespace-nowrap hover:bg-gray-200 transition-colors min-h-[44px]">
              Desserts
            </button>
            <button className="px-4 py-2 bg-gray-100 rounded-full text-sm whitespace-nowrap hover:bg-gray-200 transition-colors min-h-[44px]">
              Vegetarian
            </button>
            <button className="px-4 py-2 bg-gray-100 rounded-full text-sm whitespace-nowrap hover:bg-gray-200 transition-colors min-h-[44px]">
              Spicy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
