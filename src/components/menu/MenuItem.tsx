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
      className="flex items-start gap-3 w-full pb-4"
      aria-label={`${item.name}, $${item.price.toFixed(2)}`}
    >
      {/* Food Image Container - 40% width with aspect ratio for responsive sizing */}
      <div className="relative w-[40%] aspect-square shrink-0">
        {hasImage ? (
          <>
            {imageLoading && (
              <Skeleton className="absolute inset-0 rounded-2xl" />
            )}
            <Image
              src={item.image}
              alt={`${item.name} dish`}
              fill
              className="rounded-2xl object-cover border-2 border-white shadow-sm"
              sizes="(max-width: 640px) 40vw, (max-width: 768px) 35vw, 30vw"
              onLoad={() => setImageLoading(false)}
              priority={false}
            />
          </>
        ) : (
          <div className="w-full h-full rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-white shadow-sm flex items-center justify-center">
            <span className="text-2xl font-bold text-purple-600/80">
              {getInitials(item.name)}
            </span>
          </div>
        )}
        
        {/* Add Button or Quantity Controls - Positioned at bottom of image */}
        {totalQuantityInCart === 0 ? (
          <button
            onClick={handleClick}
            className="absolute bottom-[-12px] left-1/2 -translate-x-1/2 flex items-center justify-center gap-[10px] px-3 py-1.5 bg-white border border-black rounded-full text-xs font-bold text-black hover:bg-gray-50 active:scale-95 transition-all whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 min-w-[70px] h-[28px] shadow-sm"
            style={{ fontFamily: 'Lato, sans-serif', letterSpacing: '0.02em' }}
            aria-label={item.isCustomizable ? `Customize ${item.name}` : `Add ${item.name} to cart`}
          >
            <span>Add</span>
          </button>
        ) : (
          <div className="absolute bottom-[-12px] left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 px-2 py-1.5 bg-black text-white rounded-full min-w-[70px] h-[28px] shadow-md">
            <button
              onClick={handleDecrement}
              className="w-5 h-5 flex items-center justify-center hover:bg-gray-800 rounded-full transition-colors shrink-0 active:scale-90"
              aria-label={`Decrease quantity of ${item.name}`}
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-xs font-semibold min-w-[18px] text-center flex-1 tabular-nums">
              {totalQuantityInCart}
            </span>
            <button
              onClick={handleIncrement}
              className="w-5 h-5 flex items-center justify-center hover:bg-gray-800 rounded-full transition-colors shrink-0 active:scale-90"
              aria-label={`Increase quantity of ${item.name}`}
            >
              <Image
                src="/icons/Plus.png"
                alt="Increase"
                width={12}
                height={12}
                style={{
                  filter: 'invert(1)',
                }}
                className="w-3 h-3"
              />
            </button>
          </div>
        )}
      </div>

      {/* Item Details */}
      <div className="flex-1 min-w-0 pt-1 flex flex-col justify-between">
        <div>
          <h3 
            className="font-bold text-base text-black mb-1.5 line-clamp-2 leading-tight"
            style={{ fontFamily: 'Lato, sans-serif' }}
          >
            {item.name}
          </h3>
          {item.description && (
            <p 
              className="text-xs text-gray-500 line-clamp-2 mb-2 leading-relaxed"
              style={{ fontFamily: 'Lato, sans-serif', letterSpacing: '0.01em' }}
            >
              {item.description}
            </p>
          )}
        </div>
        
        <div>
          {/* Price */}
          <p 
            className="text-base font-bold text-black mb-2"
            style={{ fontFamily: 'Lato, sans-serif' }}
            aria-label={`Price: ${item.price.toFixed(2)} dollars`}
          >
            ${item.price.toFixed(2)}
          </p>
          
          {/* Tags - Regular tags, allergens, and dietary info */}
          {(item.tags.length > 0 || (item.allergens && item.allergens.length > 0) || (item.dietary && item.dietary.length > 0)) && (
            <div className="flex gap-1.5 flex-wrap" role="list" aria-label="Item tags">
              {/* Regular tags */}
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  role="listitem"
                  className="inline-flex items-center px-2.5 py-1 bg-white/80 backdrop-blur-sm rounded-full text-[11px] font-medium text-gray-700 capitalize shadow-sm"
                  style={{ fontFamily: 'Lato, sans-serif', letterSpacing: '0.01em' }}
                >
                  {tag}
                </span>
              ))}
              {/* Allergens */}
              {item.allergens && item.allergens.map((allergen) => (
                <span
                  key={`allergen-${allergen}`}
                  role="listitem"
                  className="inline-flex items-center px-2.5 py-1 bg-amber-50 rounded-full text-[11px] font-medium text-amber-700 capitalize shadow-sm"
                  style={{ fontFamily: 'Lato, sans-serif', letterSpacing: '0.01em' }}
                >
                  {allergen}
                </span>
              ))}
              {/* Dietary info */}
              {item.dietary && item.dietary.map((diet) => (
                <span
                  key={`dietary-${diet}`}
                  role="listitem"
                  className="inline-flex items-center px-2.5 py-1 bg-green-50 rounded-full text-[11px] font-medium text-green-700 capitalize shadow-sm"
                  style={{ fontFamily: 'Lato, sans-serif', letterSpacing: '0.01em' }}
                >
                  {diet}
                </span>
              ))}
            </div>
          )}
        </div>
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
