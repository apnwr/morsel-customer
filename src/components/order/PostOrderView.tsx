/**
 * PostOrderView Component
 *
 * Displays order status UI after order has been placed (post-order state)
 * Shows order status, timer, items, running tabs, payment section
 *
 * Extracted from /order-status/page.tsx for use in unified cart/order-status page
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useSession } from '@/contexts/SessionContext';
import { useSplit } from '@/contexts/SplitContext';
import { getFromStorage } from '@/mocks/mockStorage';
import { PaymentModal } from '@/components/order/PaymentModal';
import { SplitSettingsModal } from '@/components/order/SplitSettingsModal';
import { isSplitApplicableForTotal } from '@/lib/split-utils';
import type { Order as APIOrder, OrderItem } from '@/types/api/order';
import type { SessionParticipant } from '@/types/api/session';

// Helper function to get dietary type from stored dietary data
const getDietaryTypeFromStoredData = (storedDietary: { allergens?: string[]; dietary?: string[] } | undefined) => {
  if (!storedDietary) return null;
  
  const allDietaryInfo = [
    ...(storedDietary.allergens || []),
    ...(storedDietary.dietary || [])
  ].map(d => d.toLowerCase());
  
  if (allDietaryInfo.some(d => d === 'non-vegetarian' || d === 'non vegetarian' || d === 'nonvegetarian')) {
    return 'non-vegetarian';
  }
  if (allDietaryInfo.some(d => d === 'vegetarian' || d === 'veg')) {
    return 'vegetarian';
  }
  return null;
};

// Dietary Symbol Component
const DietarySymbol = ({ dietaryType }: { dietaryType: 'vegetarian' | 'non-vegetarian' }) => (
  <div 
    className={`w-4 h-4 flex items-center justify-center rounded-[3px] border-[1.5px] bg-white shrink-0 ${
      dietaryType === 'vegetarian' 
        ? 'border-green-600' 
        : 'border-red-600'
    }`}
    aria-label={dietaryType === 'vegetarian' ? 'Vegetarian' : 'Non-vegetarian'}
    title={dietaryType === 'vegetarian' ? 'Vegetarian' : 'Non-vegetarian'}
  >
    {dietaryType === 'vegetarian' ? (
      <div className="w-2 h-2 rounded-full bg-green-600" />
    ) : (
      <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-red-600" />
    )}
  </div>
);

interface PostOrderViewProps {
  orderId: string;
  orderData: APIOrder;
  onOrderMoreFood: () => void;
}

export function PostOrderView({ orderId, orderData, onOrderMoreFood }: PostOrderViewProps) {
  const router = useRouter();
  const { sessionData, endSession } = useSession();
  const { split, calculateSplit } = useSplit();

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);

  // Current user
  const currentSessionUserId = getFromStorage<string>('morsel_session_user_id');
  const currentUserName = getFromStorage<string>('morsel_customer_name') || 'You';
  const diningType = getFromStorage<'dine-in' | 'takeaway' | 'delivery'>('morsel_dining_type') || 'dine-in';


  // Load item participants, images, and dietary info mapping (derived from orderId)
  const { itemParticipants, itemImages, itemDietary } = useMemo(() => {
    const storedOrder = getFromStorage<APIOrder & { 
      _itemParticipants?: Record<string, string>;
      _itemImages?: Record<string, string>;
      _itemDietary?: Record<string, { allergens?: string[]; dietary?: string[] }>;
    }>(
      `morsel_order_${orderId}`
    );
    return {
      itemParticipants: storedOrder?._itemParticipants || {},
      itemImages: storedOrder?._itemImages || {},
      itemDietary: storedOrder?._itemDietary || {},
    };
  }, [orderId]);

  // Track remaining time for countdown. Use _placedAt only when > 0 (ours); orders from API use _placedAt=0, so no countdown.
  const [remainingTime, setRemainingTime] = useState(() => {
    const storedOrder = getFromStorage<APIOrder & { _placedAt?: number }>(`morsel_order_${orderId}`);
    const p = storedOrder?._placedAt;
    const placedAt = p != null && p > 0 ? p : 0;
    const elapsed = placedAt > 0 ? Math.floor((Date.now() - placedAt) / 1000) : 999;
    return Math.max(0, 120 - elapsed);
  });

  // Countdown timer effect - manages interval subscription
  useEffect(() => {
    if (remainingTime <= 0) return;

    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        const next = Math.max(0, prev - 1);
        if (next <= 0) {
          clearInterval(interval);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingTime]);

  // Calculate order details
  const itemCount = orderData?.items?.length || 0;
  const isEditable = remainingTime > 0;

  // Split mode label
  const splitMode = useMemo(() => {
    if (!split || !split.mode) return null;
    const modes: Record<string, string> = {
      even: 'Split evenly',
      custom: 'Custom split',
      self: 'Pay for yourself',
      all: 'Pay for everyone',
    };
    return modes[split.mode] || null;
  }, [split]);

  // Get participant name
  const getParticipantName = useCallback(
    (sessionUserId: string): string => {
      if (sessionUserId === currentSessionUserId) return 'You';

      const participant = sessionData?.session?.participants?.find(
        (p: SessionParticipant) => p.sessionUserId === sessionUserId
      );

      if (participant?.guestName) {
        const nameParts = participant.guestName.trim().split(/\s+/);
        if (nameParts.length === 1) {
          return nameParts[0];
        }
        const firstName = nameParts[0];
        const surnameInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase();
        return `${firstName} ${surnameInitial}.`;
      }

      return 'Guest';
    },
    [currentSessionUserId, sessionData]
  );

  const orderTotal = orderData?.total || 0;
  const useSplitShares = isSplitApplicableForTotal(split.splitForTotal, orderTotal);

  const handleOpenSplitModal = useCallback(() => {
    calculateSplit(orderTotal);
    setIsSplitModalOpen(true);
  }, [calculateSplit, orderTotal]);

  // Calculate user amount; use split.shares only when they were calculated for this order's total
  const userAmount = useMemo(() => {
    if (!split.participants || split.participants.length === 0) {
      return orderTotal;
    }

    const currentUser = split.participants.find((p) => p.id === currentSessionUserId);
    if (!currentUser) {
      return orderTotal;
    }

    if (useSplitShares && typeof split.shares[currentUser.id] === 'number') {
      return split.shares[currentUser.id];
    }
    return orderTotal;
  }, [split.participants, split.shares, useSplitShares, orderTotal, currentSessionUserId]);

  // Handle payment
  const handlePayNow = useCallback(async () => {
    setIsProcessingPayment(true);
    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsProcessingPayment(false);
    setPaymentModalOpen(true);
  }, []);

  // Handle payment modal close
  const handlePaymentModalClose = useCallback(() => {
    setPaymentModalOpen(false);
  }, []);

  // Handle end session
  const handleEndSession = useCallback(async () => {
    await endSession();
    router.push('/');
  }, [endSession, router]);

  return (
    <>
      <div className="max-w-2xl mx-auto p-4 px-4 bg-[#F7F8F8] pb-32">
        {/* Order Status Section — visible only while timer is running */}
        {remainingTime > 0 && (
          <div className="mb-6">
            <div className="flex flex-col gap-2 mb-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">👩‍🍳</span>
                <span
                  className="text-black text-[16px] leading-[1.22] font-medium"
                  style={{
                    fontFamily: 'Helvetica Neue, sans-serif',
                    fontWeight: 500,
                  }}
                >
                  Your order is getting prepared.
                </span>
              </div>
              <p
                className="text-black text-[12px] leading-[18px] opacity-50"
                style={{ fontFamily: 'Helvetica Neue, sans-serif' }}
              >
                Click on the cook-time tracker to see your running order. You can place another order while we prep this.
              </p>
            </div>

            {/* Edit + Timer row */}
            <div className="flex items-center gap-3">
              {orderData?.sessionUserId === currentSessionUserId && (
                <div className="flex items-center gap-2 px-4 py-2 bg-[#F0F0F0] rounded-[10px]">
                  <span className="text-base">✏️</span>
                  <span
                    className="text-black text-[12px] font-bold"
                    style={{ fontFamily: 'Helvetica Neue, sans-serif' }}
                  >
                    Edit
                  </span>
                </div>
              )}
              <div className="relative">
                <svg width="59" height="36" viewBox="0 0 59 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="0.5" y="0.5" width="58" height="35" rx="17.5" fill="black" stroke="black" />
                </svg>
                <span
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-[14px] font-bold"
                  style={{ fontFamily: 'Helvetica Neue, sans-serif' }}
                >
                  {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="mb-6">
          <h2
            className="text-black text-[20px] leading-normal font-bold opacity-80 mb-4"
            style={{ fontFamily: 'Helvetica Neue, sans-serif', fontWeight: 700 }}
          >
            Order Summary
          </h2>
          <div className="flex flex-col gap-[15px]">
            {orderData?.items?.map((item: OrderItem, idx: number) => {
              const dietaryType = getDietaryTypeFromStoredData(itemDietary[item.itemId]);
              const itemImage = itemImages[item.itemId];

              // Collect all selected addon option names
              const addonLabels = item.addOns
                ?.flatMap((addon) => addon.selectedOptions?.map((o) => o.name) || [])
                .filter(Boolean);

              return (
                <div key={idx} className="flex flex-col gap-2">
                  {/* Item row */}
                  <div className="flex items-center gap-[5px]">
                    <div className="relative w-[47px] h-[47px] flex-shrink-0 rounded-[12px] overflow-hidden bg-[#F8F8F8]">
                      {itemImage ? (
                        <Image
                          src={itemImage}
                          alt={item.name || 'Item'}
                          fill
                          sizes="47px"
                          style={{ objectFit: 'cover' }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>
                      )}
                    </div>
                    {dietaryType && <DietarySymbol dietaryType={dietaryType} />}
                    <div className="flex flex-col gap-1 min-w-0">
                      <h4
                        className="text-black text-[14px] leading-normal font-bold truncate"
                        style={{ fontFamily: 'Lato, sans-serif' }}
                      >
                        {item.name}{item.quantity > 1 ? `, ×${item.quantity}` : ''}
                      </h4>
                      <p
                        className="text-black text-[14px] leading-normal font-medium opacity-50"
                        style={{ fontFamily: 'Helvetica Neue, sans-serif' }}
                      >
                        $ {item.itemTotal?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                  {/* Addon details below item */}
                  {addonLabels && addonLabels.length > 0 && (
                    <p
                      className="text-black text-[12px] leading-normal"
                      style={{ fontFamily: 'Lato, sans-serif' }}
                    >
                      {addonLabels.join(', ')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Running Tabs - Split Section */}
        {split.participants && split.participants.length >= 2 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-black text-[20px] leading-[1.22] font-bold"
                style={{ fontFamily: 'Helvetica Neue, sans-serif', fontWeight: 700 }}
              >
                Running Tabs
              </h3>
              <button
                onClick={handleOpenSplitModal}
                className="flex gap-2 items-center text-[16px] font-bold text-[#000] border-[2px] rounded-[30px] px-4 py-2  border-[2px] border-[#ECECEC]"
                style={{ fontFamily: 'Helvetica Neue, sans-serif' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
  <path d="M1.66537 15C1.66537 14.3056 1.90842 13.7153 2.39453 13.2292C2.88064 12.7431 3.47092 12.5 4.16537 12.5C4.26259 12.5 4.36328 12.5069 4.46745 12.5208C4.57161 12.5347 4.66536 12.5556 4.7487 12.5833L8.16537 6.70833C7.95703 6.47222 7.79384 6.20833 7.67578 5.91667C7.55773 5.625 7.4987 5.31944 7.4987 5C7.4987 4.30556 7.74175 3.71528 8.22787 3.22917C8.71398 2.74306 9.30425 2.5 9.9987 2.5C10.6931 2.5 11.2834 2.74306 11.7695 3.22917C12.2556 3.71528 12.4987 4.30556 12.4987 5C12.4987 5.31945 12.4397 5.625 12.3216 5.91667C12.2036 6.20833 12.0404 6.47222 11.832 6.70833L15.2487 12.5833C15.332 12.5556 15.4258 12.5347 15.5299 12.5208C15.6341 12.5069 15.7348 12.5 15.832 12.5C16.5265 12.5 17.1168 12.7431 17.6029 13.2292C18.089 13.7153 18.332 14.3056 18.332 15C18.332 15.6944 18.089 16.2847 17.6029 16.7708C17.1168 17.2569 16.5265 17.5 15.832 17.5C15.1376 17.5 14.5473 17.2569 14.0612 16.7708C13.5751 16.2847 13.332 15.6944 13.332 15C13.332 14.6806 13.3911 14.375 13.5091 14.0833C13.6272 13.7917 13.7904 13.5278 13.9987 13.2917L10.582 7.41667C10.4987 7.44444 10.4049 7.46528 10.3008 7.47917C10.1966 7.49306 10.0959 7.5 9.9987 7.5C9.90148 7.5 9.80078 7.49306 9.69661 7.47917C9.59245 7.46528 9.4987 7.44444 9.41537 7.41667L5.9987 13.2917C6.20703 13.5278 6.37023 13.7917 6.48828 14.0833C6.60634 14.375 6.66537 14.6806 6.66537 15C6.66537 15.6944 6.42231 16.2847 5.9362 16.7708C5.45009 17.2569 4.85981 17.5 4.16537 17.5C3.47092 17.5 2.88064 17.2569 2.39453 16.7708C1.90842 16.2847 1.66537 15.6944 1.66537 15ZM14.9987 15C14.9987 15.2361 15.0786 15.434 15.2383 15.5938C15.398 15.7535 15.5959 15.8333 15.832 15.8333C16.0681 15.8333 16.2661 15.7535 16.4258 15.5938C16.5855 15.434 16.6654 15.2361 16.6654 15C16.6654 14.7639 16.5855 14.566 16.4258 14.4063C16.2661 14.2465 16.0681 14.1667 15.832 14.1667C15.5959 14.1667 15.398 14.2465 15.2383 14.4063C15.0786 14.566 14.9987 14.7639 14.9987 15ZM9.16537 5C9.16537 5.23611 9.24523 5.43403 9.40495 5.59375C9.56467 5.75347 9.76259 5.83333 9.9987 5.83333C10.2348 5.83333 10.4327 5.75347 10.5924 5.59375C10.7522 5.43403 10.832 5.23611 10.832 5C10.832 4.76389 10.7522 4.56597 10.5924 4.40625C10.4327 4.24653 10.2348 4.16667 9.9987 4.16667C9.76259 4.16667 9.56467 4.24653 9.40495 4.40625C9.24523 4.56597 9.16537 4.76389 9.16537 5ZM3.33203 15C3.33203 15.2361 3.41189 15.434 3.57162 15.5938C3.73134 15.7535 3.92925 15.8333 4.16537 15.8333C4.40148 15.8333 4.59939 15.7535 4.75911 15.5938C4.91884 15.434 4.9987 15.2361 4.9987 15C4.9987 14.7639 4.91884 14.566 4.75911 14.4063C4.59939 14.2465 4.40148 14.1667 4.16537 14.1667C3.92925 14.1667 3.73134 14.2465 3.57162 14.4063C3.41189 14.566 3.33203 14.7639 3.33203 15Z" fill="#1D1B20"/>
</svg>
                {splitMode || 'Split evenly'}
              </button>
            </div>
            <div className="grid grid-cols gap-3">
              {split.participants.map((participant) => {
                const amount =
                  useSplitShares && typeof split.shares[participant.id] === 'number'
                    ? split.shares[participant.id]
                    : orderTotal / split.participants.length;
                const isCurrentUser = participant.id === currentSessionUserId;
                const initials = participant.name.charAt(0).toUpperCase();

                return (
                  <div
                    key={participant.id}
                    className={` flex justify-between items-center p-4 rounded-[50px] border-[2px] ${isCurrentUser ? 'border-[#D2EDED]' : 'bg-white border-[#DEDEDE]'}`}
                    style={isCurrentUser ? { backgroundColor: 'rgba(0, 255, 0, 0.1)' } : {}}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">
                        {initials}
                      </div>
                      <span className="text-[14px] font-medium" style={{ fontFamily: 'Helvetica Neue, sans-serif' }}>
                        {isCurrentUser ? 'You' : participant.name}
                      </span>
                    </div>
                    <p className="text-[18px] font-bold text-black" style={{ fontFamily: 'Helvetica Neue, sans-serif' }}>
                      $ {amount.toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Payment Section */}
        <div className="mb-6">
          <div className="p-5 bg-white rounded-[20px] border-[2px] border-[#70707030]">
            <div className="flex items-center justify-between border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-lg">
                  {currentUserName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span
                    className="text-black text-[20px] leading-[1.22] font-bold block"
                    style={{ fontFamily: 'Helvetica Neue, sans-serif', fontWeight: 700 }}
                  >
                    $ {userAmount.toFixed(2)}
                  </span>
                </div>
              </div>
              <button
                onClick={handlePayNow}
                disabled={isProcessingPayment}
                className="px-6 py-3 bg-black text-white rounded-[20px] hover:bg-gray-900 active:scale-95 transition-all"
              >
                <span
                  className="text-white text-[16px] leading-[1.22] font-medium"
                  style={{ fontFamily: 'Helvetica Neue, sans-serif', fontWeight: 500 }}
                >
                  {isProcessingPayment ? 'Processing...' : 'Pay now'}
                </span>
              </button>
            </div>

            {/* <div className="pt-3">
              <div className="flex items-start gap-3 mb-2">
                <span className="text-2xl">💸</span>
                <div className="flex-1">
                  <h4
                    className="text-black text-[16px] leading-[1.22] font-medium mb-1"
                    style={{ fontFamily: 'Helvetica Neue, sans-serif', fontWeight: 500 }}
                  >
                    Pay now
                  </h4>
                  <p
                    className="text-black text-[11px] leading-[1.45] opacity-50"
                    style={{ fontFamily: 'Helvetica Neue, sans-serif' }}
                  >
                    Complete your payment to finalize the order
                  </p>
                </div>
              </div>
            </div> */}
          </div>
        </div>

        {/* Browse Menu CTA — matches my-tab page style, same action as onOrderMoreFood */}
        <button
          type="button"
          onClick={onOrderMoreFood}
          className="w-full rounded-[12px] py-4 px-5 bg-white border-[2px] border-black text-black text-[18px] font-bold hover:bg-gray-50 active:opacity-90 transition-all text-center"
          style={{ fontFamily: 'Lato, sans-serif', lineHeight: 1.2 }}
          aria-label="Browse menu"
        >
          Browse Menu
        </button>
      </div>

      {/* Modals */}
      {paymentModalOpen && (
        <PaymentModal
          isOpen={paymentModalOpen}
          onClose={handlePaymentModalClose}
          onStartNewOrder={onOrderMoreFood}
          onPaymentComplete={handleEndSession}
          amount={userAmount}
        />
      )}

      {isSplitModalOpen && (
        <SplitSettingsModal
          isOpen={isSplitModalOpen}
          onClose={() => setIsSplitModalOpen(false)}
          total={orderTotal}
        />
      )}
    </>
  );
}
