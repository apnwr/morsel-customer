'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSyncExternalStore } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/contexts/CartContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useOrder } from '@/contexts/OrderContext';
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
  /** When provided, renders this label in the center instead of "Cart" or the cart pill */
  centerLabel?: string;
}

export function Header({ showTimer = false, showCart = true, showFilters = false, showOrderTabs = false, tabs: propTabs, orderIds = [], activeOrderId = null, onTabClick, onRightIconClick, centerLabel }: HeaderProps) {
  const router = useRouter();
  const { formatPrice } = useLocale();
  const pathname = usePathname();
  const isCartPage = pathname === '/cart';
  const isOrdersPage = pathname === '/orders';
  const { cart, lastCartAction, clearLastCartAction } = useCart();
  const [snackbar, setSnackbar] = useState<{ type: 'added' | 'removed'; count: number } | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { order } = useOrder();
  const { sessionData } = useSession();
  const [remainingMinutes, setRemainingMinutes] = useState(0);

  const participantCount = sessionData?.participantsCount ?? 0;
  const placedOrdersCount = sessionData?.session?.orders?.length ?? 0;

  // Memoize participant dot positions — only recalculate when count changes
  const participantDots = useMemo(() => {
    return Array.from({ length: participantCount }).map((_, index) => {
      const angle = (index * 360) / participantCount - 90;
      const radian = (angle * Math.PI) / 180;
      return {
        x: 50 + 45 * Math.cos(radian),
        y: 50 + 45 * Math.sin(radian),
      };
    });
  }, [participantCount]);

  // Handle hydration using useSyncExternalStore (recommended React pattern)
  const mounted = useSyncExternalStore(
    () => () => {}, // subscribe (no-op)
    () => true, // client-side snapshot
    () => false // server-side snapshot
  );


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
  const baseHeight = 80;
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
        <div className="flex items-center justify-between">
          {/* Morsel Logo Circle with Participant Dots - Left */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => router.push('/my-tab')}
              className="relative w-[50px] h-[54px] flex items-end justify-center p-0 border-0 bg-transparent cursor-pointer hover:opacity-90 active:opacity-80 transition-opacity"
              aria-label="View my tab"
            >
              {/* Clasp dot at top */}
              <div
                className="absolute w-[10px] h-[10px] border-[3px] border-black bg-white rounded-full z-20"
                style={{ top: 0, left: '20px' }}
              />

              {/* Main circle */}
              <div className="relative w-[50px] h-[50px] flex items-center justify-center rounded-full">
                <div className="absolute inset-0 border-[3px] border-black bg-[#F8F8F8] rounded-full" />

                {/* Participant dots around the circle (positions memoized) */}
                {participantDots.map((dot, index) => (
                  <div
                    key={index}
                    className="absolute w-2 h-2 bg-black rounded-full"
                    style={{
                      left: `${dot.x}%`,
                      top: `${dot.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                ))}

                {/* Morsel logo inside circle */}
                <Image
                  src="/icons/morsel_logo.png"
                  alt="Morsel"
                  width={20}
                  height={20}
                  className="relative z-10 object-contain"
                />
              </div>
            </button>

            {/* Timer Badge */}
            {showTimer && order && order.timerExpiresAt && (
              <Badge variant="timer">
                {remainingMinutes} mins
              </Badge>
            )}
          </div>

          {/* Center element: centerLabel when provided, "Cart" on cart/orders page, cart pill elsewhere */}
          {centerLabel ? (
            <div className="shrink-0 h-[59px] flex items-center justify-center">
              <p
                className="text-[24px] font-bold text-black"
                style={{ fontFamily: 'Lato, sans-serif' }}
              >
                {centerLabel}
              </p>
            </div>
          ) : showCart && (
            isCartPage || isOrdersPage ? (
              <div className="shrink-0 h-[59px] flex items-center justify-center">
                <p
                  className="text-[24px] font-bold text-black"
                  style={{ fontFamily: 'Lato, sans-serif' }}
                >
                  {isOrdersPage ? 'Orders' : 'Cart'}
                </p>
              </div>
            ) : (
              <div className="relative shrink-0 h-[59px]">
                <span
                  className={`absolute -top-[2px] left-[18px] z-10 bg-[#F7F8F8] px-2 py-[2px] rounded-[20px] text-[13px] font-black ${isCartEmpty ? 'text-[#B2B2B2]' : 'text-black'}`}
                  style={{ fontFamily: 'Lato, sans-serif' }}
                >
                  View Cart
                </span>
                <button
                  onClick={handleCartClick}
                  className={`relative overflow-hidden w-[211px] h-[50px] bg-[#F8F8F8] rounded-[30px] transition-colors mt-[9px] ${
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
                          {isCartEmpty ? formatPrice(0) : formatPrice(cartTotal)}
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
              </div>
            )
          )}

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            {isCartPage || isOrdersPage ? (
              /* "Menu" text button on cart/orders pages */
              <button
                onClick={onRightIconClick}
                className="shrink-0 px-5 h-[44px] flex items-center justify-center rounded-full bg-black text-white text-[14px] font-bold"
                style={{ fontFamily: 'Lato, sans-serif' }}
                aria-label="Menu"
              >
                Menu
              </button>
            ) : (
              /* Orders icon on menu page — always visible, disabled when no orders */
              <button
                type="button"
                onClick={() => placedOrdersCount > 0 && router.push('/orders')}
                disabled={placedOrdersCount === 0}
                className={`relative w-[50px] h-[50px] flex items-center justify-center rounded-full border-[3px] ${
                  placedOrdersCount > 0
                    ? 'border-black bg-[#F8F8F8] cursor-pointer'
                    : 'border-[#ECECEC] bg-[#F8F8F8] opacity-40 cursor-default'
                }`}
                aria-label={placedOrdersCount > 0 ? `View ${placedOrdersCount} placed order${placedOrdersCount > 1 ? 's' : ''}` : 'No placed orders'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="9" y="3" width="6" height="4" rx="1" stroke="black" strokeWidth="2"/>
                  <path d="M9 12h6M9 16h4" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
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
