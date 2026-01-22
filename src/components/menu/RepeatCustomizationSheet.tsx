'use client';

import React, { useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { CartItem } from '@/types/cart';
import { MenuItem } from '@/types/menu';
import Image from 'next/image';

interface RepeatCustomizationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItem;
  lastCartItem: CartItem;
  onRepeatLast: () => void;
  onCustomize: () => void;
}

/**
 * Bottom sheet shown when user clicks "+" on a customizable item that's already in cart.
 * Offers two options: "Repeat Last" (quick add same customization) or "I'll Choose" (open full modal).
 * This mimics Zomato's UX for faster ordering of repeated items.
 */
export function RepeatCustomizationSheet({
  isOpen,
  onClose,
  item,
  lastCartItem,
  onRepeatLast,
  onCustomize,
}: RepeatCustomizationSheetProps) {
  // Format customizations for display
  const customizationSummary = lastCartItem.customizations.length > 0
    ? lastCartItem.customizations.map((c) => c.choiceLabel).join(', ')
    : 'No customizations';

  // Check for vegetarian/non-vegetarian status from allergens or dietary arrays
  const getDietaryType = useMemo(() => {
    const allDietaryInfo = [
      ...(item.allergens || []),
      ...(item.dietary || [])
    ].map(d => d.toLowerCase());
    
    if (allDietaryInfo.some(d => d === 'non-vegetarian' || d === 'non vegetarian' || d === 'nonvegetarian')) {
      return 'non-vegetarian';
    }
    if (allDietaryInfo.some(d => d === 'vegetarian' || d === 'veg')) {
      return 'vegetarian';
    }
    return null;
  }, [item.allergens, item.dietary]);

  // Get initials for placeholder image
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const hasImage = item.image && item.image.trim() !== '';

  const handleRepeatLast = (e: React.MouseEvent) => {
    // Prevent event from bubbling up to the MenuItem article which would trigger handleAddToCart
    e.stopPropagation();
    
    // Close modal first, then add item to prevent re-render issues
    onClose();
    // Use setTimeout to ensure modal closes before cart update triggers re-render
    setTimeout(() => {
      onRepeatLast();
    }, 0);
  };

  const handleCustomize = (e: React.MouseEvent) => {
    // Prevent event from bubbling up to the MenuItem article which would trigger handleAddToCart
    e.stopPropagation();
    
    // Close this sheet first, then open customization modal
    onClose();
    // Use setTimeout to ensure this modal closes before opening the next one
    setTimeout(() => {
      onCustomize();
    }, 0);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="p-4">
        {/* Header with item info */}
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
          {/* Item Image */}
          <div className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-gray-100">
            {hasImage ? (
              <Image
                src={item.image}
                alt={item.name}
                fill
                className="object-cover"
                sizes="48px"
              />
            ) : (
              <div className="w-full h-full bg-purple-100 flex items-center justify-center">
                <span className="text-purple-600 font-bold text-xs">
                  {getInitials(item.name)}
                </span>
              </div>
            )}
          </div>

          {/* Item Name */}
          <div className="flex-1 min-w-0">
            {/* Vegetarian/Non-Vegetarian Symbol */}
            {getDietaryType && (
              <div 
                className={`w-4 h-4 flex items-center justify-center rounded-[3px] border-[1.5px] bg-white mb-1 ${
                  getDietaryType === 'vegetarian' 
                    ? 'border-green-600' 
                    : 'border-red-600'
                }`}
                aria-label={getDietaryType === 'vegetarian' ? 'Vegetarian' : 'Non-vegetarian'}
                title={getDietaryType === 'vegetarian' ? 'Vegetarian' : 'Non-vegetarian'}
              >
                {getDietaryType === 'vegetarian' ? (
                  <div className="w-2 h-2 rounded-full bg-green-600" />
                ) : (
                  <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-red-600" />
                )}
              </div>
            )}
            <h3 className="font-bold text-base truncate">{item.name}</h3>
            <p className="text-sm text-gray-500">${item.price.toFixed(2)}</p>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {/* Repeat Last Option */}
          <button
            onClick={handleRepeatLast}
            className="w-full flex items-center justify-between p-4 bg-black text-white rounded-xl hover:bg-gray-900 active:scale-[0.98] transition-all"
          >
            <div className="flex-1 text-left">
              <span className="font-bold text-sm block">Repeat Last</span>
              <span className="text-xs text-gray-300 line-clamp-1">
                {customizationSummary}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-bold text-sm">
                {/* Show itemTotal / quantity to get unit price with customizations */}
                ${(lastCartItem.itemTotal / lastCartItem.quantity).toFixed(2)}
              </span>
              <Image
                src="/icons/Plus.png"
                alt="Add"
                width={16}
                height={16}
                style={{ filter: 'invert(1)' }}
              />
            </div>
          </button>

          {/* Customize Option */}
          <button
            onClick={handleCustomize}
            className="w-full flex items-center justify-between p-4 bg-white border-2 border-black rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all"
          >
            <span className="font-bold text-sm">I&apos;ll Choose</span>
            <Image
              src="/icons/Chevron.png"
              alt="Customize"
              width={16}
              height={16}
              className="rotate-90"
            />
          </button>
        </div>
      </div>
    </Modal>
  );
}
