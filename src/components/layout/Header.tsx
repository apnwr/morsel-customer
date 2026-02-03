'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/contexts/CartContext';
import { useOrder } from '@/contexts/OrderContext';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useSession } from '@/contexts/SessionContext';
import { Badge } from '@/components/ui/Badge';
import { OrderTabs, TabInfo } from '@/components/session/OrderTabs';
import Image from 'next/image';

const SNACKBAR_DURATION_MS = 2000;

interface HeaderProps {
  showTimer?: boolean;
  showCart?: boolean;
  showFilters?: boolean;
  showOrderTabs?: boolean;
  /** Full tab info array - use this for rich tab data (preferred) */
  tabs?: TabInfo[];
  /** Simple order IDs - used if tabs is not provided */
  orderIds?: string[];
  activeOrderId?: string | null;
  onTabClick?: (orderId: string | null) => void;
  onRightIconClick?: () => void;
}

export function Header({ showTimer = false, showCart = true, showFilters = false, showOrderTabs = false, tabs: propTabs, orderIds = [], activeOrderId = null, onTabClick, onRightIconClick }: HeaderProps) {
  const router = useRouter();
  const { cart, lastCartAction, clearLastCartAction } = useCart();
  const [snackbar, setSnackbar] = useState<{ type: 'added' | 'removed'; count: number } | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    return context?.table?.toString() || '15';
  };

  const tableNumber = getTableNumber();
  const participantCount = sessionData?.participantsCount ?? 0;

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

  // Consume lastCartAction (add/remove) once when cart CTA is shown: display snackbar and clear context.
  // Defer setState to avoid synchronous cascading renders (React recommendation).
  useEffect(() => {
    if (showCart && lastCartAction && !snackbar) {
      const { type, count } = lastCartAction;
      clearLastCartAction();
      queueMicrotask(() => setSnackbar({ type, count }));
    }
  }, [showCart, lastCartAction, snackbar, clearLastCartAction]);

  // Auto-dismiss snackbar after SNACKBAR_DURATION_MS; cleanup on unmount
  useEffect(() => {
    if (!snackbar) return;
    dismissTimerRef.current = setTimeout(() => setSnackbar(null), SNACKBAR_DURATION_MS);
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [snackbar]);

  const handleCartClick = () => {
    router.push('/cart');
  };

  // Show subtotal (without tax) in header, tax is added in cart page
  const cartTotal = mounted ? cart.subtotal : 0;
  const isCartEmpty = cartTotal === 0;

  // Use provided tabs or convert orderIds to TabInfo format for OrderTabs
  const tabs = propTabs || orderIds.map((orderId, index) => ({
    id: orderId,
    label: `Order #${index + 1}`,
    isNewOrder: false,
  }));

  // Calculate header height for spacer (base ~70px + tabs ~50px + filters ~60px)
  const hasOrderTabs = showOrderTabs && tabs.length > 0 && onTabClick;
  const baseHeight = 70;
  const tabsHeight = hasOrderTabs ? 50 : 0;
  const filtersHeight = showFilters ? 60 : 0;
  const totalHeight = baseHeight + tabsHeight + filtersHeight;

  return (
    <>
      {/* Spacer to prevent content from being hidden behind fixed header */}
      <div style={{ height: totalHeight }} aria-hidden="true" />
      
      {/* Fixed Header */}
      <div 
        className="fixed top-0 left-0 right-0 bg-[#F7F8F8] z-40" 
        style={{ 
          // iOS Safari fixed positioning fix
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
      >
        {/* Order Tabs - Show when multiple orders exist */}
        {hasOrderTabs && (
          <OrderTabs
            tabs={tabs}
            activeTabId={activeOrderId}
            onTabClick={onTabClick}
          />
        )}

        <div className="px-[18px] py-[10px] border-b border-gray-100">
        <div className="flex items-center justify-center gap-[23px]">
          {/* Table Number Circle - clickable, navigates to My Tab */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => router.push('/my-tab')}
              className="relative w-[50px] h-[50px] flex items-center justify-center mt-1 p-0 border-0 bg-transparent cursor-pointer rounded-full hover:opacity-90 active:opacity-80 transition-opacity"
              aria-label="View table details"
            >
              <div className="absolute inset-0 border-[3px] border-black rounded-full" />

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
            </button>
            
            {/* Timer Badge */}
            {showTimer && order && order.timerExpiresAt && (
              <Badge variant="timer">
                {remainingMinutes} mins
              </Badge>
            )}
          </div>

          {/* Cart Total - Center; one slide at a time: default (price+arrow) or snackbar ("X items added/removed"). Cyclic ladder: outgoing slides up, incoming slides up from below. */}
          {showCart && (
            <button
              onClick={handleCartClick}
              className={`relative overflow-hidden w-[211px] h-[50px] bg-[#F8F8F8] rounded-[30px] transition-colors shrink-0 ${
                isCartEmpty
                  ? 'border-[3px] border-[#B2B2B2]'
                  : 'border-[3px] border-black'
              }`}
              aria-label="View cart"
            >
              <AnimatePresence initial={false} mode="sync">
                {snackbar ? (
                  <motion.div
                    key="snackbar"
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '-100%' }}
                    transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                    className="absolute inset-0 flex items-center justify-center px-3"
                  >
                    <span
                      className="text-sm font-bold text-black"
                      style={{ fontFamily: 'Lato, sans-serif', lineHeight: 1.2 }}
                    >
                      {snackbar.count} item{snackbar.count === 1 ? '' : 's'} {snackbar.type === 'added' ? 'added' : 'removed'}
                    </span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="default"
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '-100%' }}
                    transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                    className="absolute inset-0 flex items-center justify-between px-3"
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
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          )}

          {/* Icon Button - Right */}
          <button
            onClick={onRightIconClick}
            className="shrink-0 w-[50px] h-[50px] flex items-center justify-center"
          >
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
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2 mt-4">
            <button className="px-[18px] py-2 bg-[#FFFFFF] rounded-full text-sm whitespace-nowrap hover:bg-gray-200 transition-colors min-h-[44px]">
              Filters
            </button>
            <button className="px-[18px] py-2 bg-[#FFFFFF] rounded-full text-sm whitespace-nowrap hover:bg-gray-200 transition-colors min-h-[44px]">
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
    </>
  );
}
