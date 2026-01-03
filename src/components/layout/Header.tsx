'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useOrder } from '@/contexts/OrderContext';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useSession } from '@/contexts/SessionContext';
import { Badge } from '@/components/ui/Badge';
import Image from 'next/image';

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
  const { sessionData } = useSession();
  const [remainingMinutes, setRemainingMinutes] = useState(0);

  // Handle hydration using useSyncExternalStore (recommended React pattern)
  const mounted = useSyncExternalStore(
    () => () => {}, // subscribe (no-op)
    () => true, // client-side snapshot
    () => false // server-side snapshot
  );

  // Extract table number from space name or use fallback
  const getTableNumber = () => {
    if (sessionData?.space.name) {
      // Try to extract number from the end of the name (e.g., "Counter top 5" -> "5")
      const match = sessionData.space.name.match(/\d+$/);
      if (match) {
        return match[0];
      }
      // If no number found, return "XX"
      return 'XX';
    }
    // Fallback to context table or default
    return context.table?.toString() || '15';
  };

  const tableNumber = getTableNumber();
  const participantCount = (sessionData?.participantsCount ?? 0) + 1;

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

  const cartTotal = mounted ? cart.total : 0;
  const isCartEmpty = cartTotal === 0;

  return (
    <div className="sticky top-0 bg-[#F7F8F8] border-b border-gray-100 z-10">
      <div className="px-[18px] py-[10px]">
        <div className="flex items-center justify-center gap-[23px] mb-4">
          {/* Table Number Circle */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative w-[50px] h-[50px] flex items-center justify-center mt-1">
              <div className="absolute inset-0 border-[3px] border-black rounded-full"></div>

              {/* Participant dots around the circle */}
              {Array.from({ length: participantCount }).map((_, index) => {
                const angle = (index * 360) / participantCount - 90; // Start from top
                const radian = (angle * Math.PI) / 180;
                const x = 50 + 45 * Math.cos(radian); // 45% of radius for positioning
                const y = 50 + 45 * Math.sin(radian);

                return (
                  <div
                    key={index}
                    className="absolute w-2 h-2 bg-black rounded-full"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                );
              })}

              <span 
                className="text-xl font-bold relative z-10"
                style={{ fontFamily: 'Lato, sans-serif', letterSpacing: '0.12em' }}
              >
                {tableNumber}
              </span>
            </div>
            
            {/* Timer Badge */}
            {showTimer && order && order.timerExpiresAt && (
              <Badge variant="timer">
                {remainingMinutes} mins
              </Badge>
            )}
          </div>

          {/* Cart Total - Center */}
          {showCart && (
            <button
              onClick={handleCartClick}
              className={`flex items-center justify-between w-[211px] h-[50px] px-3 py-[11px] bg-[#F8F8F8] rounded-[30px] transition-colors shrink-0 ${
                isCartEmpty 
                  ? 'border-[3px] border-[#B2B2B2]' 
                  : 'border-[3px] border-black'
              }`}
              aria-label="View cart"
            >
              <span 
                className={`text-xl font-black ${
                  isCartEmpty ? 'text-[#B2B2B2]' : 'text-black'
                }`}
                style={{ fontFamily: 'Lato, sans-serif', lineHeight: '1.2em' }}
              >
                $ {isCartEmpty ? '00.00' : cartTotal.toFixed(2)}
              </span>
              <Image
                src="/icons/Diagonal_Arrow.png"
                alt="Cart"
                width={24}
                height={24}
                className={`shrink-0 ${isCartEmpty ? 'opacity-40' : ''}`}
              />
            </button>
          )}

          {/* Icon Button - Right */}
          <button className="shrink-0 w-[50px] h-[50px] flex items-center justify-center">
            <Image
              src="/icons/icons.png"
              alt="Menu"
              width={50}
              height={50}
              className="object-contain"
            />
          </button>
        </div>

        {/* Filter Pills */}
        {showFilters && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2">
            <button className="px-[18px] py-2 bg-[#FFFFFF] rounded-full text-sm whitespace-nowrap hover:bg-gray-200 transition-colors min-h-[44px]">
              Filters
            </button>
            <button className="px-[8px] py-2 bg-[#FFFFFF] rounded-full text-sm whitespace-nowrap hover:bg-gray-200 transition-colors min-h-[44px]">
              Bestseller
            </button>
            {/* <button className="px-4 py-2 bg-gray-100 rounded-full text-sm whitespace-nowrap hover:bg-gray-200 transition-colors min-h-[44px]">
              Desserts
            </button>
            <button className="px-4 py-2 bg-gray-100 rounded-full text-sm whitespace-nowrap hover:bg-gray-200 transition-colors min-h-[44px]">
              Vegetarian
            </button>
            <button className="px-4 py-2 bg-gray-100 rounded-full text-sm whitespace-nowrap hover:bg-gray-200 transition-colors min-h-[44px]">
              Spicy
            </button> */}
          </div>
        )}
      </div>
    </div>
  );
}
