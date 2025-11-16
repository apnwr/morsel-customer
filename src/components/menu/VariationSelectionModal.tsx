'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { CartItem } from '@/types/cart';
import { Minus } from 'lucide-react';

interface VariationSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onRemove: (cartItemId: string) => void;
  onDecrement: (cartItemId: string) => void;
}

export function VariationSelectionModal({
  isOpen,
  onClose,
  cartItems,
  onRemove,
  onDecrement,
}: VariationSelectionModalProps) {
  const handleRemoveClick = (item: CartItem) => {
    if (item.quantity === 1) {
      onRemove(item.id);
    } else {
      onDecrement(item.id);
    }
    
    // Close modal if this was the last variation
    if (cartItems.length === 1 && item.quantity === 1) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select variation to remove">
      <div className="space-y-3">
        {cartItems.map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div className="flex-1">
              <h4 className="font-medium text-base mb-1">{item.menuItem.name}</h4>
              
              {/* Show customizations if any */}
              {item.customizations.length > 0 && (
                <div className="text-xs text-gray-600 mb-1">
                  {item.customizations.map((c) => c.choiceLabel).join(', ')}
                </div>
              )}
              
              {/* Show notes if any */}
              {item.notes && (
                <div className="text-xs text-gray-500 italic">
                  Note: {item.notes}
                </div>
              )}
              
              <div className="text-sm text-gray-600 mt-1">
                Quantity: {item.quantity} × ${item.menuItem.price.toFixed(2)} = ${item.itemTotal.toFixed(2)}
              </div>
            </div>
            
            <button
              onClick={() => handleRemoveClick(item)}
              className="ml-3 w-10 h-10 flex items-center justify-center bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
              aria-label={`Remove one ${item.menuItem.name}`}
            >
              <Minus className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
