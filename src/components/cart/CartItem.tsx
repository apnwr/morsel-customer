'use client';

import React, { useState } from 'react';
import { CartItem as CartItemType } from '@/types/cart';
import { Avatar } from '@/components/ui/Avatar';
import { Minus, Plus } from 'lucide-react';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onCustomize?: (item: CartItemType) => void;
}

export const CartItem = React.memo(function CartItem({ item, onUpdateQuantity, onCustomize }: CartItemProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDecrement = () => {
    const newQuantity = item.quantity - 1;
    if (newQuantity === 0) {
      // Show confirmation modal
      setShowDeleteModal(true);
    } else if (newQuantity >= 1) {
      onUpdateQuantity(item.id, newQuantity);
    }
  };

  const handleConfirmDelete = () => {
    onUpdateQuantity(item.id, 0);
  };

  const handleIncrement = () => {
    const newQuantity = item.quantity + 1;
    if (newQuantity <= 99) {
      onUpdateQuantity(item.id, newQuantity);
    }
  };

  // Format customizations for display
  const customizationSummary = item.customizations.length > 0
    ? item.customizations.map((c) => c.choiceLabel).join(', ')
    : null;

  return (
    <article 
      className="flex items-start gap-3 py-3"
      aria-label={`${item.menuItem.name}, quantity ${item.quantity}, total $${item.itemTotal.toFixed(2)}`}
    >
      {/* Avatar - showing current user for MVP */}
      <div className="shrink-0" aria-hidden="true">
        <Avatar name="You" color="#FFA500" size="sm" />
      </div>

      {/* Item Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-base truncate">
              {item.menuItem.name}
            </h3>
            <p className="text-sm text-gray-500" aria-label={`Unit price: ${item.menuItem.price.toFixed(2)} dollars`}>
              ${item.menuItem.price.toFixed(2)}
            </p>
          </div>

          {/* Quantity Controls */}
          <div 
            className="flex items-center gap-2 shrink-0" 
            role="group" 
            aria-label={`Quantity controls for ${item.menuItem.name}`}
          >
            <button
              onClick={handleDecrement}
              className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              aria-label={`Decrease quantity of ${item.menuItem.name}`}
            >
              <Minus className="w-4 h-4" />
            </button>
            <span 
              className="text-base font-medium min-w-[20px] text-center"
              aria-label={`Quantity: ${item.quantity}`}
              role="status"
            >
              {item.quantity}
            </span>
            <button
              onClick={handleIncrement}
              disabled={item.quantity >= 99}
              className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={`Increase quantity of ${item.menuItem.name}`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Customization Summary */}
        {customizationSummary && (
          <p className="text-xs text-gray-500 mb-2" aria-label={`Customizations: ${customizationSummary}`}>
            {customizationSummary}
          </p>
        )}

        {/* Customize Button (only for customizable items) */}
        {item.menuItem.isCustomizable && onCustomize && (
          <button
            onClick={() => onCustomize(item)}
            className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium hover:bg-gray-200 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            aria-label={`Customize ${item.menuItem.name}`}
          >
            Customize →
          </button>
        )}

        {/* Notes */}
        {item.notes && (
          <p className="text-xs text-gray-600 mt-2 italic" aria-label={`Special note: ${item.notes}`}>
            Note: {item.notes}
          </p>
        )}
      </div>

      {/* Item Total */}
      <div className="text-right shrink-0">
        <div className="font-semibold text-base" aria-label={`Item total: ${item.itemTotal.toFixed(2)} dollars`}>
          ${item.itemTotal.toFixed(2)}
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        itemName={item.menuItem.name}
      />
    </article>
  );
});
