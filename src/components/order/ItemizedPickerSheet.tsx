'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useSplit } from '@/contexts/SplitContext';
import { Button } from '@/components/ui/Button';
import { Check, Lock, Minus, Plus, Loader2 } from 'lucide-react';
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

    // Build shares map
    const newShares: Record<string, number> = {};

    // Current user pays for selected items (with pro-rata tax/charges)
    newShares[currentSessionUserId] = selectedTotal;
    updateShare(currentSessionUserId, selectedTotal);

    // Distribute remaining among others evenly
    const others = split.participants.filter((p) => p.id !== currentSessionUserId);
    if (others.length > 0) {
      const perOther = Math.round((remainingTotal / others.length) * 100) / 100;
      others.forEach((p) => {
        newShares[p.id] = perOther;
        updateShare(p.id, perOther);
      });
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
        <div className="fixed inset-0 z-[60] flex items-end">
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
            className="relative w-full bg-white rounded-t-[12px] shadow-xl max-h-[85vh] flex flex-col"
            role="dialog"
            aria-modal="true"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white p-6 pb-4 z-10 border-b border-gray-100">
              <h2 className="text-xl font-black text-black">Select items to pay for</h2>
              <p className="text-xs text-black/40 mt-1">
                Pick the items you want to pay for. Other participants can claim the rest.
              </p>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
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
                  const isSelected = selectedQty > 0;
                  const otherClaim = claimedByOthers[item.key];
                  const isFullyClaimed = availableQty === 0 && selectedQty === 0;

                  return (
                    <div
                      key={item.key}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-colors ${
                        isFullyClaimed
                          ? 'border-gray-200 bg-gray-50 opacity-60'
                          : isSelected
                            ? 'border-black bg-gray-50'
                            : 'border-gray-200 bg-white'
                      }`}
                    >
                      {/* Checkbox / Lock */}
                      <button
                        onClick={() => !isFullyClaimed && handleToggle(item.key, availableQty)}
                        disabled={isFullyClaimed}
                        className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                          isFullyClaimed
                            ? 'bg-gray-200'
                            : isSelected
                              ? 'bg-black'
                              : 'border-2 border-gray-300'
                        }`}
                      >
                        {isFullyClaimed ? (
                          <Lock className="w-3.5 h-3.5 text-gray-400" />
                        ) : isSelected ? (
                          <Check className="w-4 h-4 text-white" />
                        ) : null}
                      </button>

                      {/* Item Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-black truncate">{item.name}</p>
                        <p className="text-xs text-black/40">
                          {formatPrice(item.unitPrice)} each
                          {otherClaim && !isFullyClaimed && (
                            <span className="ml-2 text-orange-500">
                              {otherClaim.qty} claimed by {otherClaim.name}
                            </span>
                          )}
                          {isFullyClaimed && otherClaim && (
                            <span className="ml-1">Claimed by {otherClaim.name}</span>
                          )}
                        </p>
                      </div>

                      {/* Quantity Stepper (for items with qty > 1) */}
                      {!isFullyClaimed && item.quantity > 1 ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDecrement(item.key)}
                            disabled={selectedQty === 0}
                            className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center disabled:opacity-30"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-sm font-bold w-6 text-center">
                            {selectedQty}/{availableQty}
                          </span>
                          <button
                            onClick={() => handleIncrement(item.key, availableQty)}
                            disabled={selectedQty >= availableQty}
                            className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center disabled:opacity-30"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : !isFullyClaimed ? (
                        <span className="text-sm font-bold text-black">
                          {formatPrice(item.unitPrice)}
                        </span>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-6 space-y-3">
              {/* Breakdown */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-black/40">Items</span>
                  <span className="text-xs font-medium text-black/60">{formatPrice(selectedSubtotal)}</span>
                </div>
                {yourTax > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-black/40">Tax</span>
                    <span className="text-xs font-medium text-black/60">+{formatPrice(yourTax)}</span>
                  </div>
                )}
                {yourCharges > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-black/40">Charges</span>
                    <span className="text-xs font-medium text-black/60">+{formatPrice(yourCharges)}</span>
                  </div>
                )}
                {yourDiscount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-green-600">Discount</span>
                    <span className="text-xs font-medium text-green-600">-{formatPrice(yourDiscount)}</span>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-sm font-medium text-black/60">Your total</span>
                <span className="text-xl font-black text-black">{formatPrice(selectedTotal)}</span>
              </div>
              {remainingTotal > 0.01 && (
                <p className="text-xs text-orange-500">
                  {formatPrice(remainingTotal)} remaining — will be split among other participants
                </p>
              )}
              <Button
                onClick={handleConfirm}
                variant="primary"
                size="lg"
                className="w-full rounded-[40px]"
              >
                Confirm Selection
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
