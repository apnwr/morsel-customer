'use client';

import React, { useState, useEffect } from 'react';
import { useSplit } from '@/contexts/SplitContext';
import { useCart } from '@/contexts/CartContext';
import { Avatar } from '@/components/ui/Avatar';
import { ChevronRight, Settings } from 'lucide-react';
import { SplitSettingsModal } from '@/components/order/SplitSettingsModal';

export function SplitSection() {
  const { split, calculateSplit } = useSplit();
  const { cart } = useCart();
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Recalculate split when cart total changes
  // Pass cart for 'self' mode to calculate user's own items total
  useEffect(() => {
    if (split.participants.length > 0) {
      calculateSplit(cart.total, cart);
    }
  }, [cart, split.participants.length, calculateSplit]);

  const getModeLabel = () => {
    switch (split.mode) {
      case 'even':
        return 'Split evenly';
      case 'custom':
        return 'Custom split';
      case 'all':
        return 'Pay for everyone';
      case 'self':
        return 'Pay for self';
      default:
        return 'Split bill';
    }
  };

  return (
    <>
      <div className="border-b border-gray-200 pb-4 mb-4">
        {/* Header Button */}
        <div className="flex items-center justify-between py-2">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-2 flex-1 hover:opacity-70 transition-opacity"
          >
            <span className="font-medium text-base">{getModeLabel()}</span>
            {split.participants.length > 0 && (
              <span className="text-sm text-gray-500">
                ({split.participants.length})
              </span>
            )}
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          
          {/* Settings Button */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Split settings"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Participants Grid */}
        {split.participants.length > 0 && (
          <div className="flex gap-4 mt-4 overflow-x-auto pb-2">
            {split.participants.map((participant) => {
              const amount = split.shares[participant.id] || 0;
              
              return (
                <div key={participant.id} className="flex flex-col items-center min-w-[80px]">
                  <Avatar
                    name={participant.name}
                    color={participant.avatar}
                    size="md"
                  />
                  <span className="text-xs text-gray-600 mt-2 truncate max-w-[80px]">
                    {participant.name}
                  </span>
                  <span className="text-sm font-semibold mt-1">
                    ${amount.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Split Settings Modal */}
      <SplitSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </>
  );
}
