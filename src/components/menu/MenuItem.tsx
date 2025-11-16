'use client';

import React, { useState } from 'react';
import { MenuItem as MenuItemType } from '@/types/menu';
import { useCart } from '@/contexts/CartContext';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/Skeleton';
import { Minus, Plus } from 'lucide-react';
import { VariationSelectionModal } from './VariationSelectionModal';

interface MenuItemProps {
  item: MenuItemType;
  onAdd: (item: MenuItemType) => void;
}

export const MenuItem = React.memo(function MenuItem({ item, onAdd }: MenuItemProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [showVariationModal, setShowVariationModal] = useState(false);
  const { cart, updateQuantity, removeItem } = useCart();

  // Find ALL cart items for this menu item (including customized versions)
  const cartItemsForThisMenuItem = cart.items.filter(ci => ci.menuItem.id === item.id);
  
  // Calculate total quantity across all variations
  const totalQuantityInCart = cartItemsForThisMenuItem.reduce((sum, ci) => sum + ci.quantity, 0);
  
  // Find the non-customized version (if exists)
  const plainCartItem = cartItemsForThisMenuItem.find(ci => ci.customizations.length === 0);

  const handleClick = () => {
    onAdd(item);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (item.isCustomizable) {
      // For customizable items, always open the modal
      onAdd(item);
    } else {
      // For non-customizable items, just increment
      if (plainCartItem) {
        updateQuantity(plainCartItem.id, plainCartItem.quantity + 1);
      }
    }
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (item.isCustomizable) {
      // Check if there are multiple variations or a single item with quantity > 1
      const hasMultipleVariations = cartItemsForThisMenuItem.length > 1;
      const hasSingleItemWithMultipleQuantity = cartItemsForThisMenuItem.length === 1 && cartItemsForThisMenuItem[0].quantity > 1;
      
      if (hasMultipleVariations || hasSingleItemWithMultipleQuantity) {
        // Open variation selection modal
        setShowVariationModal(true);
      } else if (cartItemsForThisMenuItem.length === 1) {
        // Only one variation with quantity 1, just remove it
        removeItem(cartItemsForThisMenuItem[0].id);
      }
    } else {
      // For non-customizable items, just decrement
      if (plainCartItem) {
        if (plainCartItem.quantity === 1) {
          removeItem(plainCartItem.id);
        } else {
          updateQuantity(plainCartItem.id, plainCartItem.quantity - 1);
        }
      }
    }
  };

  const handleVariationRemove = (cartItemId: string) => {
    removeItem(cartItemId);
  };

  const handleVariationDecrement = (cartItemId: string) => {
    const cartItem = cart.items.find(ci => ci.id === cartItemId);
    if (cartItem) {
      updateQuantity(cartItemId, cartItem.quantity - 1);
    }
  };

  return (
    <article 
      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
      aria-label={`${item.name}, $${item.price.toFixed(2)}`}
    >
      {/* Food Image */}
      <div className="relative w-16 h-16 shrink-0">
        {imageLoading && (
          <Skeleton variant="circular" className="absolute inset-0" />
        )}
        <Image
          src={item.image}
          alt={`${item.name} dish`}
          fill
          className="rounded-full object-cover"
          sizes="64px"
          onLoad={() => setImageLoading(false)}
        />
      </div>

      {/* Item Details */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-base truncate">{item.name}</h3>
        <p className="text-sm text-gray-500 line-clamp-1">{item.description}</p>
        
        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap" role="list" aria-label="Item tags">
            {item.tags.map((tag) => (
              <span
                key={tag}
                role="listitem"
                className="text-xs px-2 py-0.5 bg-white rounded-full text-gray-600 capitalize"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        
        <p className="text-sm text-gray-600 mt-1" aria-label={`Price: ${item.price.toFixed(2)} dollars`}>
          ${item.price.toFixed(2)}
        </p>
      </div>

      {/* Add Button or Quantity Controls */}
      {totalQuantityInCart === 0 ? (
        <button
          onClick={handleClick}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          aria-label={item.isCustomizable ? `Customize ${item.name}` : `Add ${item.name} to cart`}
        >
          Add
        </button>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 bg-black text-white rounded-lg">
          <button
            onClick={handleDecrement}
            className="w-6 h-6 flex items-center justify-center hover:bg-gray-800 rounded transition-colors"
            aria-label={`Decrease quantity of ${item.name}`}
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium min-w-[20px] text-center">
            {totalQuantityInCart}
          </span>
          <button
            onClick={handleIncrement}
            className="w-6 h-6 flex items-center justify-center hover:bg-gray-800 rounded transition-colors"
            aria-label={`Increase quantity of ${item.name}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Variation Selection Modal */}
      {showVariationModal && (
        <VariationSelectionModal
          isOpen={showVariationModal}
          onClose={() => setShowVariationModal(false)}
          cartItems={cartItemsForThisMenuItem}
          onRemove={handleVariationRemove}
          onDecrement={handleVariationDecrement}
        />
      )}
    </article>
  );
});
