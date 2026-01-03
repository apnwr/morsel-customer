'use client';

import React, { useState } from 'react';
import { MenuItem as MenuItemType } from '@/types/menu';
import { useCart } from '@/contexts/CartContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { Minus } from 'lucide-react';
import Image from 'next/image';
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
    // Always open modal to show item details
    onAdd(item);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Always open modal to allow user to either:
    // 1. Add more quantity of existing item
    // 2. Add item with new customization
    onAdd(item);
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

  // Generate initials from item name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const hasImage = item.image && item.image.trim() !== '';

  return (
    <article
      className="flex items-start gap-3 w-full pb-3"
      aria-label={`${item.name}, $${item.price.toFixed(2)}`}
    >
      {/* Food Image Container - 100x100px with Add Button */}
      <div className="relative w-[100px] h-[100px] shrink-0">
        {hasImage ? (
          <>
            {imageLoading && (
              <Skeleton className="absolute inset-0 rounded-xl" />
            )}
            <Image
              src={item.image}
              alt={`${item.name} dish`}
              fill
              className="rounded-xl object-cover border-2 border-white"
              sizes="100px"
              onLoad={() => setImageLoading(false)}
            />
          </>
        ) : (
          <div className="w-full h-full rounded-xl bg-[#E7E7E7] border-2 border-white flex items-center justify-center">
            <span className="text-lg font-bold text-purple-600">
              {getInitials(item.name)}
            </span>
          </div>
        )}
        
        {/* Add Button or Quantity Controls - Positioned at bottom of image */}
        {totalQuantityInCart === 0 ? (
          <button
            onClick={handleClick}
            className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 flex items-center justify-center gap-[10px] px-2 py-1 bg-white border border-black rounded-[30px] text-[10px] font-bold text-black hover:bg-gray-50 transition-colors whitespace-nowrap focus:outline-none w-[60px] h-[24px]"
            style={{ fontFamily: 'Lato, sans-serif', letterSpacing: '0.02em' }}
            aria-label={item.isCustomizable ? `Customize ${item.name}` : `Add ${item.name} to cart`}
          >
            <span>Add</span>
            {/* <Image
              src="/icons/Plus.png"
              alt="Add"
              width={10}
              height={10}
              className="shrink-0"
            /> */}
          </button>
        ) : (
          <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 flex items-center justify-center gap-1 px-1.5 py-1 bg-black text-white rounded-[30px] w-[60px] h-[24px]">
            <button
              onClick={handleDecrement}
              className="w-4 h-4 flex items-center justify-center hover:bg-gray-800 rounded transition-colors shrink-0"
              aria-label={`Decrease quantity of ${item.name}`}
            >
              <Minus className="w-2.5 h-2.5" />
            </button>
            <span className="text-[10px] font-medium min-w-[16px] text-center flex-1">
              {totalQuantityInCart}
            </span>
            <button
              onClick={handleIncrement}
              className="w-4 h-4 flex items-center justify-center hover:bg-gray-800 rounded transition-colors shrink-0"
              aria-label={`Increase quantity of ${item.name}`}
            >
              <Image
                src="/icons/Plus.png"
                alt="Increase"
                width={10}
                height={10}
                className="w-2.5 h-2.5"
              />
            </button>
          </div>
        )}
      </div>

      {/* Item Details */}
      <div className="flex-1 min-w-0 pt-0.5">
        <h3 
          className="font-bold text-sm text-black truncate mb-1"
          style={{ fontFamily: 'Lato, sans-serif', lineHeight: '1.2em' }}
        >
          {item.name}
        </h3>
        <p 
          className="text-[10px] text-black line-clamp-2 mb-3"
          style={{ fontFamily: 'Lato, sans-serif', lineHeight: '1.2em', letterSpacing: '0.02em', opacity: 0.4 }}
        >
          {item.description}
        </p>
        
        {/* Price */}
        <p 
          className="text-sm font-bold text-black mb-2"
          style={{ fontFamily: 'Lato, sans-serif', lineHeight: '1.2em' }}
          aria-label={`Price: ${item.price.toFixed(2)} dollars`}
        >
          $ {item.price.toFixed(2)}
        </p>
        
        {/* Tags - Regular tags, allergens, and dietary info */}
        {(item.tags.length > 0 || (item.allergens && item.allergens.length > 0) || (item.dietary && item.dietary.length > 0)) && (
          <div className="flex gap-2 flex-wrap" role="list" aria-label="Item tags">
            {/* Regular tags */}
            {item.tags.map((tag) => (
              <span
                key={tag}
                role="listitem"
                className="inline-flex items-center px-2 py-0.5 bg-gray-100 rounded-[30px] text-[10px] font-normal text-black capitalize"
                style={{ fontFamily: 'Lato, sans-serif', letterSpacing: '0.02em' }}
              >
                {tag}
              </span>
            ))}
            {/* Allergens */}
            {item.allergens && item.allergens.map((allergen) => (
              <span
                key={`allergen-${allergen}`}
                role="listitem"
                className="inline-flex items-center px-2 py-0.5 bg-gray-100 rounded-[30px] text-[10px] font-normal text-black capitalize"
                style={{ fontFamily: 'Lato, sans-serif', letterSpacing: '0.02em' }}
              >
                {allergen}
              </span>
            ))}
            {/* Dietary info */}
            {item.dietary && item.dietary.map((diet) => (
              <span
                key={`dietary-${diet}`}
                role="listitem"
                className="inline-flex items-center px-2 py-0.5 bg-gray-100 rounded-[30px] text-[10px] font-normal text-black capitalize"
                style={{ fontFamily: 'Lato, sans-serif', letterSpacing: '0.02em' }}
              >
                {diet}
              </span>
            ))}
          </div>
        )}
      </div>
      
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
