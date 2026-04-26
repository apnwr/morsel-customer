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
import { useLocale } from '@/contexts/LocaleContext';
import Image from 'next/image';
import { useSession } from '@/contexts/SessionContext';
import { getFromStorage } from '@/mocks/mockStorage';
import { TipSelector, getStoredTip } from '@/components/cart/TipSelector';
import { ParticipantsList } from '@/components/session/ParticipantsList';
import { prefetchSDK } from '@/lib/peach-payments/sdk-loader';
import { useFlowType } from '@/hooks/useFlowType';
import type { Order as APIOrder, OrderItem } from '@/types/api/order';
import type { SessionBill } from '@/types/api/bill';

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
  bill?: SessionBill | null;
  onOrderMoreFood: () => void;
}

export function PostOrderView({ orderId, orderData, bill, onOrderMoreFood }: PostOrderViewProps) {
  const router = useRouter();
  const { formatPrice } = useLocale();
  const { sessionData, splitPaymentStatus, isParticipantPaid } = useSession();
  const flowType = useFlowType();

  // Current user
  const currentSessionUserId = getFromStorage<string>('morsel_session_user_id');

  // Load item images, dietary info, and kitchen note from stored order data
  const { itemImages, itemDietary, kitchenNote } = useMemo(() => {
    const storedOrder = getFromStorage<APIOrder & {
      _itemParticipants?: Record<string, string>;
      _itemImages?: Record<string, string>;
      _itemDietary?: Record<string, { allergens?: string[]; dietary?: string[] }>;
      _kitchenNote?: string;
    }>(
      `morsel_order_${orderId}`
    );
    return {
      itemImages: storedOrder?._itemImages || {},
      itemDietary: storedOrder?._itemDietary || {},
      kitchenNote: storedOrder?._kitchenNote || '',
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

  const orderTotal = orderData?.total || 0;
  // Bill total WITHOUT tips — used for split calculation so tip isn't double-counted.
  // Each participant adds their own tip separately via totalWithTip.
  const billTotalWithoutTip = bill ? (bill.total - (bill.totalTip || 0)) : orderTotal;
  const billTotal = billTotalWithoutTip;

  const userAmount = useMemo(() => {
    // Server-first: use the authoritative split share when it exists. This is what /payment charges.
    if (splitPaymentStatus && currentSessionUserId) {
      const serverEntry = splitPaymentStatus.find((s) => s.sessionUserId === currentSessionUserId);
      if (serverEntry && typeof serverEntry.amount === 'number') {
        return serverEntry.amount;
      }
    }

    // No server split yet → default to even split across session participants.
    // Deliberately ignore local SplitContext.shares, which can be stale per-device.
    const apiParticipants = sessionData?.session?.participants ?? [];
    if (apiParticipants.length > 1 && billTotal > 0) {
      return Math.round((billTotal / apiParticipants.length) * 100) / 100;
    }

    return billTotal;
  }, [splitPaymentStatus, currentSessionUserId, sessionData?.session?.participants, billTotal]);

  // Tip state — read from localStorage initially
  const [tipAmount, setTipAmount] = useState(() => getStoredTip().amount);

  // Total including tip
  const totalWithTip = Math.round((userAmount + tipAmount) * 100) / 100;

  // Check if current user's split is paid
  const isCurrentUserPaid = currentSessionUserId ? isParticipantPaid(currentSessionUserId) : false;
  const allSplitsPaid = splitPaymentStatus != null && splitPaymentStatus.length > 0 && splitPaymentStatus.every(s => s.paid);

  // Prefetch SDK + route so /payment opens instantly
  useEffect(() => {
    prefetchSDK();
    router.prefetch('/payment');
  }, [router]);

  const handlePayNow = useCallback(() => {
    const params = new URLSearchParams({
      amount: String(totalWithTip),
      tip: String(tipAmount),
    });
    router.push(`/payment?${params.toString()}`);
  }, [router, totalWithTip, tipAmount]);

  return (
    <>
      <div className="max-w-2xl mx-auto p-4 px-4 bg-[#F7F8F8]">
        {/* 1. PREPARING Status Badge — full width */}
        {remainingTime > 0 && (
          <div className="mb-6">
            <div
              className="w-full flex items-center justify-center py-3 rounded-full border-2 border-red-400"
            >
              <span
                className="text-red-400 text-[14px] font-bold uppercase tracking-[0.2em]"
                style={{ fontFamily: 'Lato, sans-serif' }}
              >
                Preparing
              </span>
            </div>
          </div>
        )}

        {/* 2. Order Items */}
        <div className="mb-6">
          <div className="flex flex-col gap-[15px]">
            {orderData?.items?.map((item: OrderItem, idx: number) => {
              const dietaryType = getDietaryTypeFromStoredData(itemDietary[item.itemId]);
              const itemImage = itemImages[item.itemId];

              const addonLabels = item.addOns
                ?.flatMap((addon) => addon.selectedOptions?.map((o) => o.name) || [])
                .filter(Boolean);

              return (
                <div key={idx} className="flex flex-col gap-2">
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
                        <div className="w-full h-full flex items-center justify-center text-xl">&#x1F37D;&#xFE0F;</div>
                      )}
                    </div>
                    {dietaryType && <DietarySymbol dietaryType={dietaryType} />}
                    <div className="flex flex-col gap-1 min-w-0">
                      <h4
                        className="text-black text-[14px] leading-normal font-bold truncate"
                        style={{ fontFamily: 'Lato, sans-serif' }}
                      >
                        {item.name}{item.quantity > 1 ? `, x${item.quantity}` : ''}
                      </h4>
                      <p
                        className="text-black text-[14px] leading-normal font-medium opacity-50"
                        style={{ fontFamily: 'Helvetica Neue, sans-serif' }}
                      >
                        {item.itemTotal != null ? formatPrice(item.itemTotal) : formatPrice(0)}
                      </p>
                    </div>
                  </div>
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

        {/* 3. Kitchen Note Display */}
        {kitchenNote && (
          <div className="mb-6">
            <div
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full border-2 border-[#ECECEC] bg-white"
            >
              <span
                className="text-black text-[14px] font-medium"
                style={{ fontFamily: 'Lato, sans-serif' }}
              >
                {kitchenNote}
              </span>
            </div>
          </div>
        )}

        {/* 4. Tip Section */}
        <div className="mb-6">
          <TipSelector
            subtotal={orderTotal}
            onTipChange={(tip) => setTipAmount(tip.amount)}
            sessionId={sessionData?.session?.id}
            sessionUserId={currentSessionUserId || undefined}
          />
        </div>

        {/* 5. Split / Participants Card (hidden in area flow) */}
        {flowType !== 'area' && (
          <div className="mb-6">
            <ParticipantsList totalOverride={billTotal} />
          </div>
        )}

        {/* 6. Bill Section */}
        <div className="mb-6">
          <h3
            className="text-black text-[20px] leading-[1.22] font-bold mb-3"
            style={{ fontFamily: 'Helvetica Neue, sans-serif', fontWeight: 700 }}
          >
            Bill
          </h3>
          <div className="flex flex-col gap-2 w-full">
            {/* Items total */}
            <div className="flex items-center justify-between w-full">
              <span className="text-black text-[12px] font-normal" style={{ fontFamily: 'Lato, sans-serif' }}>
                Items total
              </span>
              <span className="text-black text-[12px] font-normal" style={{ fontFamily: 'Lato, sans-serif' }}>
                {formatPrice(bill?.subtotal ?? orderTotal)}
              </span>
            </div>

            {/* Individual tax lines */}
            {bill?.taxes && Object.entries(bill.taxes).map(([taxId, tax]) => (
              <div key={taxId} className="flex items-center justify-between w-full">
                <span className="text-black text-[12px] font-normal" style={{ fontFamily: 'Lato, sans-serif' }}>
                  {tax.name} ({tax.percentage}%)
                </span>
                <span className="text-black text-[12px] font-normal" style={{ fontFamily: 'Lato, sans-serif' }}>
                  {formatPrice(tax.amount)}
                </span>
              </div>
            ))}

            {/* Individual charge lines */}
            {bill?.charges && Object.entries(bill.charges).map(([chargeId, charge]) => (
              <div key={chargeId} className="flex items-center justify-between w-full">
                <span className="text-black text-[12px] font-normal" style={{ fontFamily: 'Lato, sans-serif' }}>
                  {charge.name}
                </span>
                <span className="text-black text-[12px] font-normal" style={{ fontFamily: 'Lato, sans-serif' }}>
                  {formatPrice(charge.amount)}
                </span>
              </div>
            ))}

            {/* Discount — only when > 0 */}
            {(bill?.totalDiscount ?? 0) > 0 && (
              <div className="flex items-center justify-between w-full">
                <span className="text-green-700 text-[12px] font-normal" style={{ fontFamily: 'Lato, sans-serif' }}>
                  Discount
                </span>
                <span className="text-green-700 text-[12px] font-normal" style={{ fontFamily: 'Lato, sans-serif' }}>
                  -{formatPrice(bill?.totalDiscount ?? 0)}
                </span>
              </div>
            )}

            {/* Tip */}
            <div className="flex items-center justify-between w-full">
              <span className="text-black text-[12px] font-normal" style={{ fontFamily: 'Lato, sans-serif' }}>
                Tip
              </span>
              <span className="text-black text-[12px] font-normal" style={{ fontFamily: 'Lato, sans-serif' }}>
                {formatPrice(tipAmount)}
              </span>
            </div>

            {/* Grand total */}
            <div className="flex items-center justify-between w-full pt-2 border-t border-gray-200">
              <span
                className="text-black text-[16px] font-medium"
                style={{ fontFamily: 'Helvetica Neue, sans-serif', fontWeight: 500 }}
              >
                Grand total
              </span>
              <span
                className="text-black text-[16px] font-medium"
                style={{ fontFamily: 'Helvetica Neue, sans-serif', fontWeight: 500 }}
              >
                {formatPrice(billTotalWithoutTip + tipAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Pay Now CTA */}
      <div
        className="fixed left-0 right-0 z-20 rounded-t-[30px] overflow-hidden flex justify-center"
        style={{
          bottom: 0,
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
      >
        <button
          onClick={isCurrentUserPaid ? undefined : handlePayNow}
          disabled={isCurrentUserPaid}
          className={`w-full max-w-2xl h-[70px] box-content flex items-center justify-between px-[22px] transition-all disabled:cursor-not-allowed ${
            isCurrentUserPaid
              ? 'bg-green-600 text-white'
              : 'bg-black text-white disabled:opacity-50'
          }`}
          style={{
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
            fontFamily: 'Helvetica Neue, sans-serif',
            fontWeight: 700,
            fontSize: '20px',
            lineHeight: '1.22',
          }}
        >
          <span className="flex-shrink-0">
            {isCurrentUserPaid ? 'Paid' : 'Pay Now'}
          </span>
          <span className="flex-shrink-0">
            {formatPrice(totalWithTip)}
          </span>
        </button>
      </div>
    </>
  );
}
