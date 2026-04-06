'use client';

import React, { useState, useEffect } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useSplit } from '@/contexts/SplitContext';
import { useCart } from '@/contexts/CartContext';
import { useSession } from '@/contexts/SessionContext';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Plus, AlertCircle, X } from 'lucide-react';
import { modalVariants, backdropVariants } from '@/lib/animations';
import { getFromStorage } from '@/mocks/mockStorage';
import { ItemizedPickerSheet } from '@/components/order/ItemizedPickerSheet';

interface SplitSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When set (e.g. from my-tab with orders total), used instead of cart.total for all calculations and display. Keeps split flow synced when opened from places that use a different total. */
  total?: number;
}

export function SplitSettingsModal({ isOpen, onClose, total }: SplitSettingsModalProps) {
  const { split, setSplitMode, setSplitForTotal, removeParticipant, updateShare, syncSplitToServer, itemizedSelections } = useSplit();
  const { cart } = useCart();
  const { sessionData } = useSession();
  const { formatPrice } = useLocale();
  const [showItemizedPicker, setShowItemizedPicker] = useState(false);
  const sessionId = sessionData?.session?.id;

  const effectiveTotal = typeof total === 'number' ? total : cart.total;

  // Get current user's sessionUserId to show "You" instead of name
  const currentSessionUserId = getFromStorage<string>('morsel_session_user_id');

  // Calculate user's own items total for "Pay for self" mode
  // No tax included - total is just the item prices
  const userItemsSubtotal = cart.items
    .filter(item => item.sessionUserId === currentSessionUserId)
    .reduce((sum, item) => sum + item.itemTotal, 0);
  const userItemsTotal = Math.round(userItemsSubtotal * 100) / 100;

  // Initialize local shares from split.shares
  const initializeLocalShares = () => {
    const shares: Record<string, string> = {};
    split.participants.forEach((p) => {
      shares[p.id] = (split.shares[p.id] || 0).toFixed(2);
    });
    return shares;
  };

  const [localMode, setLocalMode] = useState<'even' | 'custom' | 'self' | 'all' | 'items'>(split.mode);
  const [localShares, setLocalShares] = useState<Record<string, string>>(initializeLocalShares);
  const [validationError, setValidationError] = useState<string>('');

  // Calculate current sum for real-time validation feedback from LOCAL state
  const getCurrentSum = () => {
    return Object.values(localShares).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  };

  const currentSum = getCurrentSum();
  const difference = effectiveTotal - currentSum;
  const isValidSum = Math.abs(difference) < 0.01; // Allow for rounding errors

  // Reset local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalMode(split.mode);
      setLocalShares(initializeLocalShares());
      setValidationError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Calculate local shares when local mode changes (but not for custom or items mode)
  useEffect(() => {
    if (!isOpen || localMode === 'custom' || localMode === 'items') return;

    const newLocalShares: Record<string, string> = {};

    if (split.participants.length === 0) {
      setLocalShares(newLocalShares);
      return;
    }

    switch (localMode) {
      case 'even': {
        const amountPerPerson = effectiveTotal / split.participants.length;
        split.participants.forEach(p => {
          newLocalShares[p.id] = amountPerPerson.toFixed(2);
        });
        break;
      }
      case 'all': {
        split.participants.forEach(p => {
          if (p.id === currentSessionUserId) {
            newLocalShares[p.id] = effectiveTotal.toFixed(2);
          } else {
            newLocalShares[p.id] = '0.00';
          }
        });
        break;
      }
      case 'self': {
        // "Pay for self" - current user pays only for their own items
        // Others split the remaining amount evenly
        const othersCount = split.participants.filter(p => p.id !== currentSessionUserId).length;
        const remainingTotal = effectiveTotal - userItemsTotal;
        const amountPerOther = othersCount > 0 ? remainingTotal / othersCount : 0;
        split.participants.forEach(p => {
          if (p.id === currentSessionUserId) {
            newLocalShares[p.id] = userItemsTotal.toFixed(2);
          } else {
            newLocalShares[p.id] = amountPerOther.toFixed(2);
          }
        });
        break;
      }
    }

    setLocalShares(newLocalShares);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, localMode, split.participants.length, effectiveTotal, userItemsTotal]);

  const handleModeChange = (mode: 'even' | 'custom' | 'self' | 'all' | 'items') => {
    // Only update local mode - don't update context until Save is clicked
    setLocalMode(mode);
    setValidationError('');
  };

  const handleShareChange = (participantId: string, value: string) => {
    // Allow empty string or valid number input
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setLocalShares((prev) => ({
        ...prev,
        [participantId]: value,
      }));
    }
  };

  const handleShareBlur = (participantId: string) => {
    const value = localShares[participantId];
    const numValue = parseFloat(value) || 0;

    // Only update local state with formatted value - don't update context yet
    // Context will be updated when user clicks Save
    setLocalShares((prev) => ({
      ...prev,
      [participantId]: numValue.toFixed(2),
    }));
  };

  const handleSave = () => {
    // For custom mode, validate that shares sum to total
    if (localMode === 'custom') {
      // Validate local shares (not context shares)
      const localSum = Object.values(localShares).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
      const isValid = Math.abs(effectiveTotal - localSum) < 0.01;

      if (!isValid) {
        // If validation fails, automatically switch to even split mode
        console.log('[SplitSettingsModal] Custom split validation failed, switching to even split');
        setSplitMode('even');

        // Show a brief message that we switched to even split
        setValidationError('Invalid custom split. Switched to even split.');

        // Clear error and close after a longer delay to ensure state updates propagate
        setTimeout(() => {
          setValidationError('');
          onClose();
        }, 1500);
        return;
      }

      // If valid, update mode and all shares in context from local state
      console.log('[SplitSettingsModal] Custom split is valid, updating context');
      setSplitMode(localMode);
      Object.entries(localShares).forEach(([participantId, value]) => {
        const numValue = parseFloat(value) || 0;
        updateShare(participantId, numValue);
      });
    } else {
      // For non-custom modes, update mode first, then shares
      console.log('[SplitSettingsModal] Saving mode:', localMode);
      setSplitMode(localMode);

      // Update all shares from local state
      Object.entries(localShares).forEach(([participantId, value]) => {
        const numValue = parseFloat(value) || 0;
        updateShare(participantId, numValue);
      });
    }

    setSplitForTotal(effectiveTotal);

    // Sync to server in background — pass values explicitly to avoid stale closures
    if (sessionId) {
      const sharesSnapshot: Record<string, number> = {};
      Object.entries(localShares).forEach(([id, val]) => {
        sharesSnapshot[id] = parseFloat(val) || 0;
      });
      syncSplitToServer(sessionId, localMode, sharesSnapshot, split.participants);
    }

    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end">
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

          {/* Modal content - bottom sheet style */}
          <motion.div
            className="relative w-full bg-white rounded-t-[12px] shadow-xl max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
        {/* Header with Total and Save Button */}
        <div className="sticky top-0 bg-white p-6 pb-0 z-10">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-2xl font-black">{formatPrice(effectiveTotal)}</p>
            </div>
            <Button
              onClick={handleSave}
              variant="primary"
              size="md"
              className="rounded-[40px] px-10"
            >
              Save
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Participants List - Horizontal Scroll (Cart Page Style) */}
          <div className="border-[3px] border-[#ECECEC] rounded-[30px] bg-white p-5">
            {/* Split Mode Info */}
            <div className="mb-4">
              <h3 className="font-bold text-xl leading-tight text-black">
                {localMode === 'even' ? 'Split evenly' : localMode === 'custom' ? 'Custom split' : localMode === 'all' ? 'Pay for everyone' : localMode === 'items' ? 'Pay for items' : 'Pay for self'}
              </h3>
              <p className="text-[10px] leading-tight text-black opacity-40">
                {localMode === 'even' ? 'The bill will be divided equally among all participants.' : localMode === 'custom' ? 'Each participant pays a custom amount.' : localMode === 'all' ? 'You will pay for everyone in this session.' : localMode === 'items' ? 'Each participant pays for what they ordered.' : 'You will only pay for your own items.'}
              </p>
            </div>

            {/* Participants Row */}
            <div className="flex items-start gap-5 overflow-x-auto pb-2 -mx-5 px-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {split.participants.length > 0 ? (
                <>
                  {[...split.participants].sort((a, b) => {
                    // Sort to put current user first
                    const aIsCurrent = a.id === currentSessionUserId;
                    const bIsCurrent = b.id === currentSessionUserId;
                    if (aIsCurrent && !bIsCurrent) return -1;
                    if (!aIsCurrent && bIsCurrent) return 1;
                    return 0;
                  }).map((participant) => {
                    const localAmount = localShares[participant.id] || '0.00';
                    const amount = parseFloat(localAmount) || 0;
                    const isYou = participant.id === currentSessionUserId;
                    const displayName = isYou ? 'You' : participant.name;

                    return (
                      <div
                        key={participant.id}
                        className="flex flex-col items-center gap-2 min-w-[60px] flex-shrink-0 relative"
                      >
                        {/* Remove Button - Only show for mock participants */}
                        {participant.isMock && (
                          <button
                            onClick={() => removeParticipant(participant.id)}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10"
                            aria-label={`Remove ${participant.name}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}

                        <Avatar
                          name={participant.name}
                          className="w-[50px] h-[50px]"
                        />
                        <span className="text-xs font-black text-center text-black leading-tight">
                          {displayName}
                        </span>

                        {localMode === 'custom' ? (
                          <div className="w-[80px]">
                            <div className="relative">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={`$${localAmount}`}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/^\$/, '');
                                  handleShareChange(participant.id, val);
                                }}
                                onBlur={() => handleShareBlur(participant.id)}
                                autoFocus={isYou}
                                className="w-full px-1 py-1 text-lg font-black text-center text-black bg-transparent focus:outline-none focus:bg-gray-50 rounded-lg transition-colors"
                                aria-label={`Amount for ${displayName}`}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-lg font-black text-center text-black leading-tight">
                            {formatPrice(amount)}
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {/* Add Participant Button */}
                  <button
                    onClick={() => console.log('Add clicked')}
                    className="flex flex-col items-center gap-2 min-w-[60px] flex-shrink-0"
                  >
                    <div className="w-[50px] h-[50px] rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                      <Plus className="w-6 h-6 text-gray-400" />
                    </div>
                    <span className="text-xs font-black text-center text-black leading-tight opacity-40">
                      Add
                    </span>
                    <span className="text-lg font-black text-center text-transparent leading-tight select-none">
                      $0.00
                    </span>
                  </button>
                </>
              ) : (
                /* Empty state */
                <div className="w-full text-center py-4">
                  <p className="text-sm text-gray-500 mb-3">No participants yet</p>
                  <button
                    onClick={() => console.log('Add clicked')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Add participant</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Real-time Validation for Custom Split */}
          {localMode === 'custom' && split.participants.length > 0 && (
            <div className={`p-4 rounded-xl border-2 ${
              isValidSum
                ? 'bg-green-50 border-green-200'
                : 'bg-orange-50 border-orange-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Current Total:</span>
                <span className={`text-lg font-bold ${
                  isValidSum ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {formatPrice(currentSum)}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Required Total:</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatPrice(effectiveTotal)}
                </span>
              </div>
              {!isValidSum && (
                <div className="flex items-center justify-between pt-2 border-t border-orange-300">
                  <span className="text-sm font-medium text-orange-700">Difference:</span>
                  <span className="text-lg font-bold text-orange-600">
                    {formatPrice(Math.abs(difference))} {difference > 0 ? 'short' : 'over'}
                  </span>
                </div>
              )}
              <p className={`text-xs mt-2 ${
                isValidSum ? 'text-green-600' : 'text-orange-600'
              }`}>
                {isValidSum
                  ? '✓ Split is valid'
                  : '⚠ Adjust amounts to match the total'}
              </p>
            </div>
          )}

          {/* Payment Mode Options - Show only the 3 options that are NOT currently selected */}
          <div>
            {/* <h3 className="font-semibold mb-3">Payment Mode</h3> */}
            <div className="space-y-2">
              {localMode !== 'all' && (
                <button
                  onClick={() => handleModeChange('all')}
                  className="w-full flex items-center justify-between p-4 rounded-xl transition-colors bg-gray-50 hover:bg-gray-100"
                >
                  <span className="font-medium">Pay for everyone</span>
                </button>
              )}

              {localMode !== 'even' && (
                <button
                  onClick={() => handleModeChange('even')}
                  className="w-full flex items-center justify-between p-4 rounded-xl transition-colors bg-gray-50 hover:bg-gray-100"
                >
                  <span className="font-medium">Split evenly</span>
                </button>
              )}

              {localMode !== 'custom' && (
                <button
                  onClick={() => handleModeChange('custom')}
                  className="w-full flex items-center justify-between p-4 rounded-xl transition-colors bg-gray-50 hover:bg-gray-100"
                >
                  <span className="font-medium">Custom split</span>
                </button>
              )}

              {localMode !== 'self' && (
                <button
                  onClick={() => handleModeChange('self')}
                  className="w-full flex items-center justify-between p-4 rounded-xl transition-colors bg-gray-50 hover:bg-gray-100"
                >
                  <span className="font-medium">Pay for self</span>
                </button>
              )}

              {localMode !== 'items' && (
                <button
                  onClick={() => {
                    handleModeChange('items');
                    setShowItemizedPicker(true);
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-xl transition-colors bg-gray-50 hover:bg-gray-100"
                >
                  <span className="font-medium">Pay for items</span>
                </button>
              )}
            </div>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{validationError}</p>
            </div>
          )}
        </div>
          </motion.div>
        </div>
      )}

      {/* Itemized Picker Sheet */}
      <ItemizedPickerSheet
        isOpen={showItemizedPicker}
        onClose={() => setShowItemizedPicker(false)}
        onConfirm={(shares) => {
          setShowItemizedPicker(false);
          // Update localShares immediately with picker's computed values
          const updatedLocalShares: Record<string, string> = {};
          Object.entries(shares).forEach(([id, amount]) => {
            updatedLocalShares[id] = amount.toFixed(2);
          });
          setLocalShares(updatedLocalShares);
        }}
        sessionId={sessionId || ''}
        total={effectiveTotal}
      />
    </AnimatePresence>
  );
}
