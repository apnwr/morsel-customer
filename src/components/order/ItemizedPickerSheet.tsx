'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useSplit } from '@/contexts/SplitContext';
import { Minus, Plus, Loader2 } from 'lucide-react';
import { modalVariants, backdropVariants } from '@/lib/animations';
import { getFromStorage } from '@/mocks/mockStorage';
import { sessionService } from '@/services/session.service';
import { billService } from '@/services/bill.service';
import type { SessionOrder, SessionOrderItem, SessionDetail } from '@/types/api/session';
import type { SessionBill } from '@/types/api/bill';

interface ItemizedPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the computed shares so the parent can update its local state */
  onConfirm: (shares: Record<string, number>) => void;
  sessionId: string;
  total: number;
}

/** Flattened item from all orders in the session */
interface SessionItem {
  /** Unique key for this item row (orderId + itemId + variantIndex) */
  key: string;
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  itemTotal: number;
  orderedBy: string; // sessionUserId who placed the order
}

export function ItemizedPickerSheet({ isOpen, onClose, onConfirm, sessionId, total }: ItemizedPickerSheetProps) {
  const { split, itemizedSelections, setItemizedSelection, updateShare } = useSplit();
  const { formatPrice } = useLocale();

  const currentSessionUserId = getFromStorage<string>('morsel_session_user_id');

  // Fetch full session detail (with order items) and bill when sheet opens
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [bill, setBill] = useState<SessionBill | null>(null);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  useEffect(() => {
    if (!isOpen || !sessionId) return;

    let cancelled = false;
    setIsLoadingItems(true);

    Promise.all([
      sessionService.getSessionById(sessionId),
      billService.getSessionBill(sessionId).catch(() => null),
    ])
      .then(([sessionRes, billRes]) => {
        if (cancelled) return;
        setSessionDetail(sessionRes.data);
        if (billRes) setBill(billRes);
      })
      .catch((err) => {
        console.error('[ItemizedPickerSheet] Failed to fetch data:', err);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingItems(false);
      });

    return () => { cancelled = true; };
  }, [isOpen, sessionId]);

  // Flatten all session orders into a single item list
  const allItems: SessionItem[] = useMemo(() => {
    const orders = sessionDetail?.orders;
    if (!orders || !Array.isArray(orders)) return [];

    const items: SessionItem[] = [];
    for (const order of orders) {
      if (!order || typeof order === 'string') continue;
      const o = order as SessionOrder;
      if (!o.items || !Array.isArray(o.items)) continue;

      for (const item of o.items) {
        items.push({
          key: `${o.orderId}_${item.itemId}_${item.variantIndex ?? 0}`,
          itemId: item.itemId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          itemTotal: item.itemTotal,
          orderedBy: o.sessionUserId,
        });
      }
    }
    return items;
  }, [sessionDetail?.orders]);

  // Local selection state: key → quantity selected by current user
  const [selections, setSelections] = useState<Record<string, number>>({});

  // Initialize from existing itemizedSelections when sheet opens
  useEffect(() => {
    if (!isOpen || !currentSessionUserId) return;

    const existingItemIds = itemizedSelections[currentSessionUserId] || [];
    const initial: Record<string, number> = {};

    // Map itemIds back to keys — count occurrences
    for (const item of allItems) {
      const count = existingItemIds.filter((id) => id === item.key).length;
      if (count > 0) {
        initial[item.key] = Math.min(count, item.quantity);
      }
    }
    setSelections(initial);
  }, [isOpen, currentSessionUserId, allItems, itemizedSelections]);

  // Build set of items claimed by other participants
  const claimedByOthers: Record<string, { name: string; qty: number }> = useMemo(() => {
    const claimed: Record<string, { name: string; qty: number }> = {};
    for (const [participantId, itemIds] of Object.entries(itemizedSelections)) {
      if (participantId === currentSessionUserId) continue;
      const participant = split.participants.find((p) => p.id === participantId);
      const name = participant?.name || 'Someone';
      for (const id of itemIds) {
        if (!claimed[id]) {
          claimed[id] = { name, qty: 0 };
        }
        claimed[id].qty += 1;
      }
    }
    return claimed;
  }, [itemizedSelections, currentSessionUserId, split.participants]);

  // Calculate current user's selected subtotal (items only, before tax/charges)
  const selectedSubtotal = useMemo(() => {
    let sum = 0;
    for (const item of allItems) {
      const qty = selections[item.key] || 0;
      if (qty > 0) {
        sum += item.unitPrice * qty;
      }
    }
    return Math.round(sum * 100) / 100;
  }, [selections, allItems]);

  // Session subtotal (all items before tax/charges)
  const sessionSubtotal = bill?.subtotal || allItems.reduce((sum, item) => sum + item.itemTotal, 0);

  // Pro-rata proportion: your items / session items
  const proportion = sessionSubtotal > 0 ? selectedSubtotal / sessionSubtotal : 0;

  // Pro-rata tax and charges
  const yourTax = Math.round((bill?.totalTax || 0) * proportion * 100) / 100;
  const yourCharges = Math.round((bill?.totalCharges || 0) * proportion * 100) / 100;
  const yourDiscount = Math.round((bill?.totalDiscount || 0) * proportion * 100) / 100;

  // Your total = items + tax + charges - discount
  const selectedTotal = Math.round((selectedSubtotal + yourTax + yourCharges - yourDiscount) * 100) / 100;

  const remainingTotal = Math.round((total - selectedTotal) * 100) / 100;

  const handleIncrement = useCallback((key: string, maxQty: number) => {
    setSelections((prev) => {
      const current = prev[key] || 0;
      if (current >= maxQty) return prev;
      return { ...prev, [key]: current + 1 };
    });
  }, []);

  const handleDecrement = useCallback((key: string) => {
    setSelections((prev) => {
      const current = prev[key] || 0;
      if (current <= 0) return prev;
      const next = current - 1;
      if (next === 0) {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      }
      return { ...prev, [key]: next };
    });
  }, []);

  const handleToggle = useCallback((key: string, maxQty: number) => {
    setSelections((prev) => {
      const current = prev[key] || 0;
      if (current > 0) {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      }
      // Select all available quantity
      return { ...prev, [key]: maxQty };
    });
  }, []);

  const handleConfirm = () => {
    if (!currentSessionUserId) return;

    // Build itemIds array: repeat key by selected quantity
    const itemIds: string[] = [];
    for (const [key, qty] of Object.entries(selections)) {
      for (let i = 0; i < qty; i++) {
        itemIds.push(key);
      }
    }

    setItemizedSelection(currentSessionUserId, itemIds);

    // Build shares map respecting existing claims from other participants
    const newShares: Record<string, number> = {};

    // Current user pays for selected items (with pro-rata tax/charges)
    newShares[currentSessionUserId] = selectedTotal;
    updateShare(currentSessionUserId, selectedTotal);

    // Determine which other participants already have claims vs unclaimed
    let totalClaimed = selectedTotal;
    const unclaimedParticipants: string[] = [];

    for (const p of split.participants) {
      if (p.id === currentSessionUserId) continue;
      const theirItems = itemizedSelections[p.id] || [];
      if (theirItems.length > 0) {
        // Already claimed items — keep their existing share
        const existingShare = split.shares[p.id] || 0;
        newShares[p.id] = existingShare;
        updateShare(p.id, existingShare);
        totalClaimed += existingShare;
      } else {
        unclaimedParticipants.push(p.id);
      }
    }

    // Remaining goes to unclaimed participants evenly
    const remaining = Math.max(0, total - totalClaimed);
    if (unclaimedParticipants.length > 0) {
      const perUnclaimed = Math.round((remaining / unclaimedParticipants.length) * 100) / 100;
      for (const id of unclaimedParticipants) {
        newShares[id] = perUnclaimed;
        updateShare(id, perUnclaimed);
      }
    }

    // Pass computed shares to parent so it can update localShares immediately
    onConfirm(newShares);
  };

  // Available quantity for an item (total qty minus what others claimed)
  const getAvailableQty = (item: SessionItem): number => {
    const othersClaimed = claimedByOthers[item.key]?.qty || 0;
    return Math.max(0, item.quantity - othersClaimed);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div key="itemized-picker-sheet" className="fixed inset-0 z-[60] flex items-end">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
            aria-hidden="true"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          />

          <motion.div
            className="relative w-full bg-[#F7F8F8] rounded-t-[12px] shadow-xl h-[95vh] flex flex-col"
            role="dialog"
            aria-modal="true"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Header */}
            <div className="sticky top-0 bg-[#F7F8F8] rounded-t-[12px] px-[18px] py-[14px] z-10">
              <div className="flex items-center justify-between">
                <h2
                  className="text-[24px] text-black"
                  style={{ fontFamily: 'Lato, sans-serif', fontWeight: 900 }}
                >
                  Pay for Items
                </h2>
                <button
                  onClick={onClose}
                  className="text-[14px] font-medium text-black/60"
                >
                  Close
                </button>
              </div>
              <p
                className="text-[10px] text-black opacity-40 mt-1"
                style={{ fontFamily: 'Lato, sans-serif' }}
              >
                Pick the items you want to pay for. Other participants can claim the rest.
              </p>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto px-[17px] pt-[16px] pb-[100px]">
              <div className="flex flex-col gap-[20px]">
                {isLoadingItems ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                    <span className="ml-2 text-sm text-gray-500">Loading items...</span>
                  </div>
                ) : allItems.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">No items in this session yet.</p>
                  </div>
                ) : (
                  allItems.map((item) => {
                    const availableQty = getAvailableQty(item);
                    const selectedQty = selections[item.key] || 0;
                    const otherClaim = claimedByOthers[item.key];
                    const isFullyClaimed = availableQty === 0 && selectedQty === 0;
                    const lineTotal = selectedQty * item.unitPrice;

                    return (
                      <div
                        key={item.key}
                        className={`flex items-center justify-between h-[67px] ${isFullyClaimed ? 'opacity-70' : ''}`}
                      >
                        {/* Left: Item Info */}
                        <div className="flex gap-[5px] items-center w-[178px]">
                          <div className="w-[47px] h-[47px] rounded-[12px] bg-[#F8F8F8] shrink-0 flex items-center justify-center text-xl">
                            &#x1F37D;&#xFE0F;
                          </div>
                          <div className="flex flex-col gap-[4px] min-w-0">
                            <p
                              className="text-[14px] text-black truncate"
                              style={{ fontFamily: 'Lato, sans-serif', fontWeight: 700 }}
                            >
                              {item.name}
                            </p>
                            <p
                              className="text-[14px] text-black opacity-50"
                              style={{ fontFamily: 'Helvetica Neue, sans-serif', fontWeight: 500 }}
                            >
                              {formatPrice(item.unitPrice)}
                            </p>
                            {isFullyClaimed && otherClaim && (
                              <p className="text-[10px] text-orange-500">
                                Claimed by {otherClaim.name}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: Quantity Stepper + Line Total */}
                        {!isFullyClaimed && (
                          <div className="flex flex-col gap-[8px] items-end justify-center w-[106px]">
                            <div className="w-full bg-white border-2 border-black rounded-[12px] flex items-center justify-between px-[10px] py-[8px]">
                              <button
                                onClick={() => handleDecrement(item.key)}
                                disabled={selectedQty === 0}
                                className="w-[20px] h-[20px] flex items-center justify-center disabled:opacity-30"
                              >
                                <Minus className="w-[14px] h-[14px]" strokeWidth={2.5} />
                              </button>
                              <span
                                className="text-[20px] text-black"
                                style={{ fontFamily: 'Lato, sans-serif', fontWeight: 700 }}
                              >
                                {selectedQty}
                              </span>
                              <button
                                onClick={() => handleIncrement(item.key, availableQty)}
                                disabled={selectedQty >= availableQty}
                                className="w-[20px] h-[20px] flex items-center justify-center disabled:opacity-30"
                              >
                                <Plus className="w-[14px] h-[14px]" strokeWidth={2.5} />
                              </button>
                            </div>
                            <p
                              className="text-[12px] text-black"
                              style={{ fontFamily: 'Lato, sans-serif', fontWeight: 900 }}
                            >
                              {formatPrice(lineTotal)}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Bill Breakdown */}
                <div className="flex flex-col gap-[12px] mt-[22px]">
                  <h3
                    className="text-[20px] text-black"
                    style={{ fontFamily: 'Helvetica Neue, sans-serif', fontWeight: 700 }}
                  >
                    Bill
                  </h3>
                  <div className="flex flex-col gap-[16px]">
                    <div className="flex flex-col gap-[8px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-black" style={{ fontFamily: 'Lato, sans-serif' }}>Items total</span>
                        <span className="text-[12px] text-black" style={{ fontFamily: 'Lato, sans-serif' }}>{formatPrice(selectedSubtotal)}</span>
                      </div>
                      {yourTax > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] text-black" style={{ fontFamily: 'Lato, sans-serif' }}>Taxes</span>
                          <span className="text-[12px] text-black" style={{ fontFamily: 'Lato, sans-serif' }}>{formatPrice(yourTax)}</span>
                        </div>
                      )}
                      {yourCharges > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] text-black" style={{ fontFamily: 'Lato, sans-serif' }}>Service charge</span>
                          <span className="text-[12px] text-black" style={{ fontFamily: 'Lato, sans-serif' }}>{formatPrice(yourCharges)}</span>
                        </div>
                      )}
                      {yourDiscount > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] text-green-700" style={{ fontFamily: 'Lato, sans-serif' }}>Discount</span>
                          <span className="text-[12px] text-green-700" style={{ fontFamily: 'Lato, sans-serif' }}>-{formatPrice(yourDiscount)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-[8px] border-t border-gray-200">
                      <span
                        className="text-[16px] text-black"
                        style={{ fontFamily: 'Helvetica Neue, sans-serif', fontWeight: 500 }}
                      >
                        Grand total
                      </span>
                      <span
                        className="text-[16px] text-black"
                        style={{ fontFamily: 'Helvetica Neue, sans-serif', fontWeight: 500 }}
                      >
                        {formatPrice(selectedTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Bottom CTA */}
            <div
              className="fixed left-0 right-0 z-20 flex justify-center"
              style={{
                bottom: 0,
                transform: 'translateZ(0)',
              }}
            >
              <button
                onClick={handleConfirm}
                className="w-full max-w-2xl h-[70px] box-content bg-black text-white flex items-center justify-between px-[22px]"
                style={{
                  paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
                  fontFamily: 'Helvetica Neue, sans-serif',
                  fontWeight: 700,
                  fontSize: '20px',
                }}
              >
                <span>Pay Now</span>
                <span>{formatPrice(selectedTotal)}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
