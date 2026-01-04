'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSplit } from '@/contexts/SplitContext';
import { useCart } from '@/contexts/CartContext';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Plus, AlertCircle, X } from 'lucide-react';
import { modalVariants, backdropVariants } from '@/lib/animations';
import { getFromStorage } from '@/mocks/mockStorage';

interface SplitSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SplitSettingsModal({ isOpen, onClose }: SplitSettingsModalProps) {
  const { split, setSplitMode, removeParticipant, updateShare, calculateSplit, validateSplitShares } = useSplit();
  const { cart } = useCart();

  // Get current user's sessionUserId to show "You" instead of name
  const currentSessionUserId = getFromStorage<string>('morsel_session_user_id');

  // Initialize local shares from split.shares
  const initializeLocalShares = () => {
    const shares: Record<string, string> = {};
    split.participants.forEach((p) => {
      shares[p.id] = (split.shares[p.id] || 0).toFixed(2);
    });
    return shares;
  };

  const [localShares, setLocalShares] = useState<Record<string, string>>(initializeLocalShares);
  const [validationError, setValidationError] = useState<string>('');

  // Calculate current sum for real-time validation feedback
  const getCurrentSum = () => {
    return Object.values(split.shares).reduce((sum, val) => sum + val, 0);
  };

  const currentSum = getCurrentSum();
  const difference = cart.total - currentSum;
  const isValidSum = Math.abs(difference) < 0.01; // Allow for rounding errors

  // Reset local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalShares(initializeLocalShares());
      setValidationError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Recalculate split when mode changes or participants change
  useEffect(() => {
    if (isOpen && split.mode !== 'custom') {
      calculateSplit(cart.total);
    }
  }, [isOpen, split.mode, split.participants.length, cart.total, calculateSplit]);

  // Update local shares when split.shares changes (for non-custom modes)
  useEffect(() => {
    if (isOpen && split.mode !== 'custom') {
      setLocalShares(initializeLocalShares());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, split.shares, split.mode]);

  const handleModeChange = (mode: 'even' | 'custom' | 'self' | 'all') => {
    setSplitMode(mode);
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
    
    // Update context with validated number
    updateShare(participantId, numValue);
    
    // Update local state with formatted value
    setLocalShares((prev) => ({
      ...prev,
      [participantId]: numValue.toFixed(2),
    }));
  };

  const handleSave = () => {
    // For custom mode, validate that shares sum to total
    if (split.mode === 'custom') {
      const isValid = validateSplitShares(cart.total);
      
      if (!isValid) {
        const sum = Object.values(split.shares).reduce((acc, val) => acc + val, 0);
        const difference = cart.total - sum;
        setValidationError(
          `Split amounts must equal $${cart.total.toFixed(2)}. Current difference: $${Math.abs(difference).toFixed(2)}`
        );
        return;
      }
    }

    // Save and close
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
              <p className="text-2xl font-black">${cart.total.toFixed(2)}</p>
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
                {split.mode === 'even' ? 'Split evenly' : split.mode === 'custom' ? 'Custom split' : split.mode === 'all' ? 'Pay for everyone' : 'Pay for self'}
              </h3>
              <p className="text-[10px] leading-tight text-black opacity-40">
                {split.mode === 'even' ? 'The bill will be divided equally among all participants.' : split.mode === 'custom' ? 'Each participant pays a custom amount.' : split.mode === 'all' ? 'You will pay for everyone in this session.' : 'You will only pay for your own items.'}
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
                    const amount = split.shares[participant.id] || 0;
                    const localAmount = localShares[participant.id] || '0.00';
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

                        {split.mode === 'custom' ? (
                          <div className="w-[60px]">
                            <div className="relative">
                              <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] font-black text-black">
                                $
                              </span>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={localAmount}
                                onChange={(e) => handleShareChange(participant.id, e.target.value)}
                                onBlur={() => handleShareBlur(participant.id)}
                                className="w-full pl-3 pr-1 py-1 text-xs font-black text-center text-black border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-lg font-black text-center text-black leading-tight">
                            ${amount.toFixed(2)}
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
          {split.mode === 'custom' && split.participants.length > 0 && (
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
                  ${currentSum.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Required Total:</span>
                <span className="text-lg font-bold text-gray-900">
                  ${cart.total.toFixed(2)}
                </span>
              </div>
              {!isValidSum && (
                <div className="flex items-center justify-between pt-2 border-t border-orange-300">
                  <span className="text-sm font-medium text-orange-700">Difference:</span>
                  <span className="text-lg font-bold text-orange-600">
                    ${Math.abs(difference).toFixed(2)} {difference > 0 ? 'short' : 'over'}
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

          {/* Payment Mode Options */}
          <div>
            {/* <h3 className="font-semibold mb-3">Payment Mode</h3> */}
            <div className="space-y-2">
              <button
                onClick={() => handleModeChange('all')}
                className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors ${
                  split.mode === 'all'
                    ? 'bg-black text-white'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <span className="font-medium">Pay for everyone</span>
                {split.mode === 'all' && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>

              <button
                onClick={() => handleModeChange('even')}
                className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors ${
                  split.mode === 'even'
                    ? 'bg-black text-white'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <span className="font-medium">Split evenly</span>
                {split.mode === 'even' && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>

              <button
                onClick={() => handleModeChange('custom')}
                className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors ${
                  split.mode === 'custom'
                    ? 'bg-black text-white'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <span className="font-medium">Custom split</span>
                {split.mode === 'custom' && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
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
    </AnimatePresence>
  );
}
