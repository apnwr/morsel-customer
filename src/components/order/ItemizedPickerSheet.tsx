'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useSplit } from '@/contexts/SplitContext';
import { useSession } from '@/contexts/SessionContext';
import { Minus, Plus, Loader2, Check } from 'lucide-react';
import { modalVariants, backdropVariants } from '@/lib/animations';
import { getFromStorage } from '@/mocks/mockStorage';
import { STORAGE_KEYS } from '@/lib/storage-keys';
import { sessionService } from '@/services/session.service';
import { useSessionBill } from '@/hooks/useSessionBill';
import type { SessionOrder, SessionOrderItem, SessionDetail } from '@/types/api/session';
import type { SplitEntry } from '@/types/api/split';

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

/** A claim (committed on the server) on one unit of an item */
type ServerClaimEntry = {
  sessionUserId: string;
  name: string;
  qty: number;
  paid: boolean;
};

const itemKey = (orderId: string | undefined, itemId: string, variantIndex?: number | null) =>
  `${orderId ?? ''}_${itemId}_${variantIndex ?? 0}`;

export function ItemizedPickerSheet({ isOpen, onClose, onConfirm, sessionId, total }: ItemizedPickerSheetProps) {
  const { split, itemizedSelections, setItemizedSelection, updateShare } = useSplit();
  const { splitPaymentStatus } = useSession();
  const { formatPrice } = useLocale();

  const currentSessionUserId = getFromStorage<string>(STORAGE_KEYS.SESSION_USER_ID);

  // Bill comes from the shared cache (useSessionBill); no per-mount fetch.
  // Sessions on this page are already polled, so the cache is usually warm
  // by the time the picker opens.
  const { bill } = useSessionBill();

  // Session detail (orders + items) is still fetched explicitly when the
  // sheet opens, so we get the freshest items list at the moment of save.
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- fetch + loading indicator on sheet open */
  useEffect(() => {
    if (!isOpen || !sessionId) return;

    let cancelled = false;
    setIsLoadingItems(true);

    sessionService
      .getSessionById(sessionId)
      .then((sessionRes) => {
        if (cancelled) return;
        setSessionDetail(sessionRes.data);
      })
      .catch((err) => {
        console.error('[ItemizedPickerSheet] Failed to fetch session detail:', err);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingItems(false);
      });

    return () => { cancelled = true; };
  }, [isOpen, sessionId]);
  /* eslint-enable react-hooks/set-state-in-effect */

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

  // Local selection state: key → quantity selected by current user (draft)
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);

  // Participant name lookup by sessionUserId (authoritative: session participants)
  const nameBySessionUserId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of sessionDetail?.participants ?? []) {
      if (p.sessionUserId) map[p.sessionUserId] = p.guestName || 'Guest';
    }
    return map;
  }, [sessionDetail?.participants]);

  // Current user's server-committed split entry (if any)
  const myServerSplit: SplitEntry | null = useMemo(() => {
    if (!splitPaymentStatus || !currentSessionUserId) return null;
    return splitPaymentStatus.find((s) => s.sessionUserId === currentSessionUserId) ?? null;
  }, [splitPaymentStatus, currentSessionUserId]);

  // Server truth: claims per item key across ALL participants
  const serverClaimsByKey: Record<string, ServerClaimEntry[]> = useMemo(() => {
    const map: Record<string, ServerClaimEntry[]> = {};
    if (!splitPaymentStatus) return map;
    for (const s of splitPaymentStatus) {
      if (!s.items || !s.sessionUserId) continue;
      for (const it of s.items) {
        if (!it.orderId) continue;
        const key = itemKey(it.orderId, it.itemId, it.variantIndex);
        if (!map[key]) map[key] = [];
        map[key].push({
          sessionUserId: s.sessionUserId,
          name: nameBySessionUserId[s.sessionUserId] || 'Guest',
          qty: it.quantity || 0,
          paid: !!s.paid,
        });
      }
    }
    return map;
  }, [splitPaymentStatus, nameBySessionUserId]);

  /** Qty of this key claimed on the server by everyone except the current user */
  const othersQty = useCallback((key: string) => {
    const entries = serverClaimsByKey[key];
    if (!entries) return 0;
    return entries
      .filter((e) => e.sessionUserId !== currentSessionUserId)
      .reduce((sum, e) => sum + e.qty, 0);
  }, [serverClaimsByKey, currentSessionUserId]);

  /** First "other" claimant for this key (for display attribution) */
  const firstOtherClaim = useCallback((key: string): ServerClaimEntry | null => {
    const entries = serverClaimsByKey[key];
    if (!entries) return null;
    return entries.find((e) => e.sessionUserId !== currentSessionUserId) ?? null;
  }, [serverClaimsByKey, currentSessionUserId]);

  /** True if any "other" claim on this key is marked paid */
  const isPaidByOthers = useCallback((key: string): boolean => {
    const entries = serverClaimsByKey[key];
    if (!entries) return false;
    return entries.some((e) => e.sessionUserId !== currentSessionUserId && e.paid);
  }, [serverClaimsByKey, currentSessionUserId]);

  /** Qty of this key that the current user has saved on the server */
  const mineServerQty = useCallback((key: string): number => {
    const entries = serverClaimsByKey[key];
    if (!entries) return 0;
    return entries
      .filter((e) => e.sessionUserId === currentSessionUserId)
      .reduce((sum, e) => sum + e.qty, 0);
  }, [serverClaimsByKey, currentSessionUserId]);

  // Initialize draft when sheet opens: prefer user's own server split, then localStorage draft.
  /* eslint-disable react-hooks/set-state-in-effect -- initialization from async-fetched session data */
  useEffect(() => {
    if (!isOpen || !currentSessionUserId) return;

    const initial: Record<string, number> = {};

    if (myServerSplit?.items && myServerSplit.items.length > 0) {
      for (const it of myServerSplit.items) {
        if (!it.orderId) continue;
        const key = itemKey(it.orderId, it.itemId, it.variantIndex);
        initial[key] = (initial[key] || 0) + (it.quantity || 0);
      }
    } else {
      const existingItemIds = itemizedSelections[currentSessionUserId] || [];
      for (const item of allItems) {
        const count = existingItemIds.filter((id) => id === item.key).length;
        if (count > 0) initial[item.key] = Math.min(count, item.quantity);
      }
    }

    setSelections(initial);
    setConflictNotice(null);
  }, [isOpen, currentSessionUserId, allItems, itemizedSelections, myServerSplit]);
  /* eslint-enable react-hooks/set-state-in-effect */

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

  const handleConfirm = async () => {
    if (!currentSessionUserId || isSaving) return;
    setIsSaving(true);
    setConflictNotice(null);

    // Refetch session for freshest server claims before committing
    let freshDetail: SessionDetail | null = null;
    try {
      const res = await sessionService.getSessionById(sessionId);
      freshDetail = res.data;
    } catch (err) {
      console.warn('[ItemizedPickerSheet] Conflict pre-check fetch failed:', err);
      // Soft-fail: fall through to commit with current state
    }

    // Build fresh othersQty map keyed by itemKey
    const freshOthersByKey: Record<string, number> = {};
    for (const s of freshDetail?.splits ?? []) {
      if (!s.items || !s.sessionUserId) continue;
      if (s.sessionUserId === currentSessionUserId) continue;
      for (const it of s.items) {
        if (!it.orderId) continue;
        const k = itemKey(it.orderId, it.itemId, it.variantIndex);
        freshOthersByKey[k] = (freshOthersByKey[k] || 0) + (it.quantity || 0);
      }
    }

    // Cap selections against fresh availability
    let hadConflict = false;
    const adjusted: Record<string, number> = {};
    for (const item of allItems) {
      const draft = selections[item.key] || 0;
      if (draft === 0) continue;
      const maxAllowed = Math.max(0, item.quantity - (freshOthersByKey[item.key] || 0));
      if (draft > maxAllowed) {
        hadConflict = true;
        if (maxAllowed > 0) adjusted[item.key] = maxAllowed;
      } else {
        adjusted[item.key] = draft;
      }
    }

    if (hadConflict) {
      setSelections(adjusted);
      if (freshDetail) setSessionDetail(freshDetail);
      setConflictNotice('Someone else claimed some of your items. Your selection has been updated — please review and confirm.');
      setIsSaving(false);
      return;
    }

    // No conflict — commit local draft + propagate up
    const itemIds: string[] = [];
    for (const [key, qty] of Object.entries(selections)) {
      for (let i = 0; i < qty; i++) itemIds.push(key);
    }

    setItemizedSelection(currentSessionUserId, itemIds);

    const newShares: Record<string, number> = {};
    newShares[currentSessionUserId] = selectedTotal;
    updateShare(currentSessionUserId, selectedTotal);

    let totalClaimed = selectedTotal;
    const unclaimedParticipants: string[] = [];
    for (const p of split.participants) {
      if (p.id === currentSessionUserId) continue;
      const theirItems = itemizedSelections[p.id] || [];
      if (theirItems.length > 0) {
        const existingShare = split.shares[p.id] || 0;
        newShares[p.id] = existingShare;
        updateShare(p.id, existingShare);
        totalClaimed += existingShare;
      } else {
        unclaimedParticipants.push(p.id);
      }
    }

    const remaining = Math.max(0, total - totalClaimed);
    if (unclaimedParticipants.length > 0) {
      const perUnclaimed = Math.round((remaining / unclaimedParticipants.length) * 100) / 100;
      for (const id of unclaimedParticipants) {
        newShares[id] = perUnclaimed;
        updateShare(id, perUnclaimed);
      }
    }

    setIsSaving(false);
    onConfirm(newShares);
  };

  // Available quantity for an item (total qty minus what other participants already claimed on server)
  const getAvailableQty = (item: SessionItem): number => {
    return Math.max(0, item.quantity - othersQty(item.key));
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
                    const otherClaim = firstOtherClaim(item.key);
                    const paidByOther = isPaidByOthers(item.key);
                    const savedByMe = mineServerQty(item.key);
                    const isFullyClaimed = availableQty === 0;
                    const lineTotal = selectedQty * item.unitPrice;

                    // Decide the primary badge for this row
                    let badgeText: string | null = null;
                    let badgeTone: 'paid' | 'claimed' | 'mine' | null = null;
                    if (paidByOther && otherClaim) {
                      badgeText = `Paid by ${otherClaim.name}`;
                      badgeTone = 'paid';
                    } else if (otherClaim) {
                      badgeText = `Claimed by ${otherClaim.name}`;
                      badgeTone = 'claimed';
                    } else if (savedByMe > 0) {
                      badgeText = 'Your saved selection';
                      badgeTone = 'mine';
                    }

                    const badgeClass =
                      badgeTone === 'paid'
                        ? 'text-green-700'
                        : badgeTone === 'claimed'
                          ? 'text-orange-500'
                          : 'text-blue-600';

                    return (
                      <div
                        key={item.key}
                        className={`flex items-center justify-between h-[67px] ${isFullyClaimed ? 'opacity-60' : ''}`}
                      >
                        {/* Left: Item Info */}
                        <div className="flex gap-[5px] items-center w-[178px]">
                          <div className="w-[47px] h-[47px] rounded-[12px] bg-[#F8F8F8] shrink-0 flex items-center justify-center text-xl relative">
                            <span>&#x1F37D;&#xFE0F;</span>
                            {badgeTone === 'paid' && (
                              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-600 flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" strokeWidth={3} />
                              </span>
                            )}
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
                            {badgeText && (
                              <p className={`text-[10px] ${badgeClass}`}>{badgeText}</p>
                            )}
                          </div>
                        </div>

                        {/* Right: Quantity Stepper + Line Total (hidden when fully claimed by others) */}
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

            {/* Conflict notice */}
            {conflictNotice && (
              <div className="fixed left-0 right-0 z-20 flex justify-center" style={{ bottom: 86 }}>
                <div className="w-full max-w-2xl mx-4 px-4 py-3 rounded-xl bg-orange-50 border border-orange-200 text-[12px] text-orange-800">
                  {conflictNotice}
                </div>
              </div>
            )}

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
                disabled={isSaving || selectedTotal <= 0}
                className="w-full max-w-2xl h-[70px] box-content bg-black text-white flex items-center justify-between px-[22px] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
                  fontFamily: 'Helvetica Neue, sans-serif',
                  fontWeight: 700,
                  fontSize: '20px',
                }}
              >
                <span className="flex items-center gap-2">
                  {isSaving && <Loader2 className="w-5 h-5 animate-spin" />}
                  {isSaving ? 'Checking…' : 'Confirm Selection'}
                </span>
                <span>{formatPrice(selectedTotal)}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
