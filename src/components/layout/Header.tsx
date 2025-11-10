'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useOrder } from '@/contexts/OrderContext';
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
  const [remainingMinutes, setRemainingMinutes] = useState(0);

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
        <div className="flex items-center justify-between mb-4">
          {/* Timer Badge */}
          <div className="flex items-center gap-2">
            {showTimer && order && order.timerExpiresAt && (
              <Badge variant="timer">
                {remainingMinutes} mins
              </Badge>
            )}
          </div>

          {/* Cart Total */}
          {showCart && (
            <button
              onClick={handleCartClick}
              className="flex items-center gap-2 hover:opacity-70 transition-opacity min-h-[44px] min-w-[44px] justify-end"
              aria-label="View cart"
            >
              <span className="font-semibold">${cart.total.toFixed(2)}</span>
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
