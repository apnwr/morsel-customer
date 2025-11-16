'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSplit } from '@/contexts/SplitContext';
import { useCart } from '@/contexts/CartContext';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Plus, AlertCircle, X } from 'lucide-react';
import { modalVariants, backdropVariants } from '@/lib/animations';

interface SplitSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SplitSettingsModal({ isOpen, onClose }: SplitSettingsModalProps) {
  const { split, setSplitMode, addMockParticipant, removeParticipant, updateShare, calculateSplit, validateSplitShares } = useSplit();
  const { cart } = useCart();
  
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

  const handleAddParticipant = () => {
    addMockParticipant();
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
            className="relative w-full bg-white rounded-t-3xl shadow-xl max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
        {/* Header with Total and Save Button */}
        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 z-10">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-3xl font-bold">${cart.total.toFixed(2)}</p>
            </div>
            <Button
              onClick={handleSave}
              variant="primary"
              size="md"
              className="rounded-full px-6"
            >
              Save
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Payment Mode Options */}
          <div>
            <h3 className="font-semibold mb-3">Payment Mode</h3>
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

          {/* Participants Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">
                {split.mode === 'even' ? 'Split Evenly' : split.mode === 'custom' ? 'Custom Split' : 'Participants'}
              </h3>
              <button
                onClick={handleAddParticipant}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-black transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add person
              </button>
            </div>

            {/* Participants Grid */}
            {split.participants.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {split.participants.map((participant) => {
                  const amount = split.shares[participant.id] || 0;
                  const localAmount = localShares[participant.id] || '0.00';

                  return (
                    <div key={participant.id} className="flex flex-col items-center relative">
                      {/* Remove Button */}
                      <button
                        onClick={() => removeParticipant(participant.id)}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10"
                        aria-label={`Remove ${participant.name}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                      
                      <Avatar
                        name={participant.name}
                        color={participant.avatar}
                        size="lg"
                      />
                      <span className="text-xs text-gray-600 mt-2 truncate max-w-full text-center">
                        {participant.name}
                      </span>
                      
                      {split.mode === 'custom' ? (
                        <div className="mt-2 w-full">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                              $
                            </span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={localAmount}
                              onChange={(e) => handleShareChange(participant.id, e.target.value)}
                              onBlur={() => handleShareBlur(participant.id)}
                              className="w-full pl-5 pr-2 py-1 text-sm font-semibold text-center border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm font-semibold mt-2">
                          ${amount.toFixed(2)}
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* Add Participant Button */}
                <button
                  onClick={handleAddParticipant}
                  className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-full">
                    <Plus className="w-8 h-8 text-gray-400" />
                  </div>
                  <span className="text-xs text-gray-500 mt-2">Add</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-4">No participants yet</p>
                <Button onClick={handleAddParticipant} variant="secondary" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add first participant
                </Button>
              </div>
            )}
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
