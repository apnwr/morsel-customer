'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { MenuItem as MenuItemType } from '@/types/menu';
import { useCart } from '@/contexts/CartContext';
import { Minus, Plus } from 'lucide-react';
import Image from 'next/image';
import { VariationSelectionModal } from './VariationSelectionModal';
import { RepeatCustomizationSheet } from './RepeatCustomizationSheet';
import { TruncatedDescription } from '@/components/ui/TruncatedDescription';

interface MenuItemProps {
  item: MenuItemType;
  onAdd: (item: MenuItemType) => void;
}

export const MenuItem = React.memo(function MenuItem({ item, onAdd }: MenuItemProps) {
  const { formatPrice } = useLocale();
  const [showVariationModal, setShowVariationModal] = useState(false);
  const [showRepeatSheet, setShowRepeatSheet] = useState(false);
  const { cart, updateQuantity, removeItem, addItem } = useCart();

  // Find ALL cart items for this menu item (including customized versions)
  const cartItemsForThisMenuItem = useMemo(() => 
    cart.items.filter(ci => ci.menuItem.id === item.id),
    [cart.items, item.id]
  );
  
  // Calculate total quantity across all variations
  const totalQuantityInCart = useMemo(() => 
    cartItemsForThisMenuItem.reduce((sum, ci) => sum + ci.quantity, 0),
    [cartItemsForThisMenuItem]
  );
  
  // Find the non-customized version (if exists)
  const plainCartItem = useMemo(() => 
    cartItemsForThisMenuItem.find(ci => ci.customizations.length === 0),
    [cartItemsForThisMenuItem]
  );

  // Get the last added cart item for this menu item (for repeat functionality)
  const lastCartItem = useMemo(() => 
    cartItemsForThisMenuItem[cartItemsForThisMenuItem.length - 1],
    [cartItemsForThisMenuItem]
  );

  /**
   * Unified ADD handler - triggered by clicking the item card, "Add" button, or "+" button
   * - Non-customizable (not in cart): Add directly to cart
   * - Non-customizable (in cart): Increment quantity directly
   * - Customizable (not in cart): Open customization modal
   * - Customizable (in cart): Show "Repeat Last" / "I'll Choose" sheet
   */
  const handleAddToCart = useCallback((e?: React.MouseEvent) => {
    // Stop propagation if called from a button click
    e?.stopPropagation();

    if (!item.isCustomizable) {
      // Non-customizable items
      if (plainCartItem) {
        // Already in cart - increment quantity directly
        updateQuantity(plainCartItem.id, plainCartItem.quantity + 1);
      } else {
        // Not in cart - add directly
        addItem(item, [], undefined, 1);
      }
    } else {
      // Customizable items
      if (lastCartItem) {
        // Already in cart - show repeat/customize choice
        setShowRepeatSheet(true);
      } else {
        // Not in cart - open customization modal
        onAdd(item);
      }
    }
  }, [item, plainCartItem, lastCartItem, updateQuantity, addItem, onAdd]);

  /**
   * Handle decrement (- button)
   * - Customizable with multiple variations or qty > 1: Show variation selection modal
   * - Single variation with qty 1: Remove directly
   * - Non-customizable: Decrement or remove
   */
  const handleDecrement = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (item.isCustomizable) {
      // Check if there are multiple variations or a single item with quantity > 1
      const hasMultipleVariations = cartItemsForThisMenuItem.length > 1;
      const hasSingleItemWithMultipleQuantity = cartItemsForThisMenuItem.length === 1 && cartItemsForThisMenuItem[0].quantity > 1;
      
      if (hasMultipleVariations || hasSingleItemWithMultipleQuantity) {
        // Open variation selection modal to let user choose which one to decrement
        setShowVariationModal(true);
      } else if (cartItemsForThisMenuItem.length === 1) {
        // Only one variation with quantity 1, just remove it
        removeItem(cartItemsForThisMenuItem[0].id);
      }
    } else {
      // Non-customizable items: Simple decrement
      if (plainCartItem) {
        if (plainCartItem.quantity === 1) {
          removeItem(plainCartItem.id);
        } else {
          updateQuantity(plainCartItem.id, plainCartItem.quantity - 1);
        }
      }
    }
  }, [item.isCustomizable, cartItemsForThisMenuItem, plainCartItem, removeItem, updateQuantity]);

  /**
   * Handle "Repeat Last" action from RepeatCustomizationSheet
   * Adds the same item with the same customizations and spice level
   */
  const handleRepeatLast = useCallback(() => {
    if (lastCartItem) {
      addItem(item, lastCartItem.customizations, lastCartItem.notes, 1, lastCartItem.spiceLevel);
    }
  }, [item, lastCartItem, addItem]);

  /**
   * Handle "I'll Choose" action from RepeatCustomizationSheet
   * Opens the full customization modal
   */
  const handleCustomize = useCallback(() => {
    onAdd(item);
  }, [item, onAdd]);

  const handleVariationRemove = useCallback((cartItemId: string) => {
    removeItem(cartItemId);
  }, [removeItem]);

  const handleVariationDecrement = useCallback((cartItemId: string) => {
    const cartItem = cart.items.find(ci => ci.id === cartItemId);
    if (cartItem) {
      updateQuantity(cartItemId, cartItem.quantity - 1);
    }
  }, [cart.items, updateQuantity]);

  const handleVariationIncrement = useCallback((cartItemId: string) => {
    const cartItem = cart.items.find(ci => ci.id === cartItemId);
    if (cartItem) {
      updateQuantity(cartItemId, cartItem.quantity + 1);
    }
  }, [cart.items, updateQuantity]);

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

  const hasImage = item.image && item.image.trim() !== '';

  // Add button / quantity stepper. Same controls in two layouts:
  //   - 'overlay'    → absolute-positioned over the image's bottom edge
  //   - 'standalone' → inline in a right-side column when there is no image
  const renderControls = (variant: 'overlay' | 'standalone') => {
    const positionCls =
      variant === 'overlay' ? 'absolute bottom-[-12px] left-1/2 -translate-x-1/2' : '';

    if (totalQuantityInCart === 0) {
      return (
        <button
          onClick={handleAddToCart}
          className={`${positionCls} flex items-center justify-center px-3 py-1.5 bg-white border border-black rounded-full text-xs font-bold text-black hover:bg-gray-50 active:scale-95 transition-all whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 min-w-[70px] h-[28px] shadow-sm`}
          style={{ fontFamily: 'Lato, sans-serif', letterSpacing: '0.02em' }}
          aria-label={item.isCustomizable ? `Customize ${item.name}` : `Add ${item.name} to cart`}
        >
          <span>Add</span>
        </button>
      );
    }

    return (
      <div
        className={`${positionCls} flex items-center justify-center gap-2 px-2 py-1.5 bg-black text-white rounded-full min-w-[70px] h-[28px] shadow-md`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleDecrement}
          className="w-5 h-5 flex items-center justify-center hover:bg-gray-800 rounded-full transition-colors shrink-0 active:scale-90"
          aria-label={`Decrease quantity of ${item.name}`}
        >
          <Minus className="w-3 h-3" />
        </button>
        <span
          className="text-xs font-semibold min-w-[18px] text-center flex-1 tabular-nums cursor-pointer"
          onClick={handleAddToCart}
          role="button"
          aria-label={`${totalQuantityInCart} in cart, click to add more`}
        >
          {totalQuantityInCart}
        </span>
        <button
          onClick={handleAddToCart}
          className="w-5 h-5 flex items-center justify-center hover:bg-gray-800 rounded-full transition-colors shrink-0 active:scale-90"
          aria-label={`Add more ${item.name}`}
        >
          <Plus className="w-3 h-3" strokeWidth={2.5} />
        </button>
      </div>
    );
  };

  return (
    <article
      className={`flex flex-row-reverse items-start gap-3 w-full cursor-pointer pt-4 ${hasImage ? 'pb-7' : 'pb-4'}`}
      aria-label={`${item.name}, ${formatPrice(item.price)}`}
      onClick={handleAddToCart}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleAddToCart();
        }
      }}
    >
      {hasImage ? (
        // Static gray background acts as the image placeholder while loading —
        // replaces a per-row useState + onLoad handler. Image with `fill` +
        // object-cover covers it once decoded; no animation runs underneath
        // a loaded image, so we don't pay for hidden shimmer.
        <div className="relative w-[40%] aspect-square shrink-0 bg-gray-100 rounded-2xl">
          <Image
            src={item.image}
            alt={`${item.name} dish`}
            fill
            className="rounded-2xl object-cover border-2 border-white shadow-sm"
            sizes="(max-width: 640px) 40vw, (max-width: 768px) 35vw, 30vw"
            priority={false}
          />
          {renderControls('overlay')}
        </div>
      ) : (
        // Match the image column's 40% width so the standalone Add button's centerline
        // aligns with the overlay Add button on rows that do have images.
        <div className="w-[40%] shrink-0 flex items-center justify-center self-center">
          {renderControls('standalone')}
        </div>
      )}

      {/* Item Details */}
      <div className="flex-1 min-w-0 pt-1 flex flex-col justify-between">
        <div>
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
                <div 
                  className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-red-600"
                />
              )}
            </div>
          )}
          <h3 
            className="font-bold text-base text-black mb-1.5 line-clamp-2 leading-tight"
            style={{ fontFamily: 'Lato, sans-serif' }}
          >
            {item.name}
          </h3>
          {item.description && (
            <div
              className="text-xs text-gray-500 mb-2 leading-relaxed"
              style={{ fontFamily: 'Lato, sans-serif', letterSpacing: '0.01em' }}
            >
              <TruncatedDescription
                description={item.description}
                maxLength={180}
              />
            </div>
          )}
        </div>
        
        <div>
          {/* Price */}
          <p 
            className="text-base font-bold text-black mb-2"
            style={{ fontFamily: 'Lato, sans-serif' }}
            aria-label={`Price: ${formatPrice(item.price)}`}
          >
            {formatPrice(item.price)}
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
      
      {/* Variation Selection Modal - For adjusting quantity of customizable items */}
      {showVariationModal && (
        <VariationSelectionModal
          isOpen={showVariationModal}
          onClose={() => setShowVariationModal(false)}
          cartItems={cartItemsForThisMenuItem}
          onRemove={handleVariationRemove}
          onDecrement={handleVariationDecrement}
          onIncrement={handleVariationIncrement}
        />
      )}

      {/* Repeat Customization Sheet - For incrementing customizable items already in cart */}
      {showRepeatSheet && lastCartItem && (
        <RepeatCustomizationSheet
          isOpen={showRepeatSheet}
          onClose={() => setShowRepeatSheet(false)}
          item={item}
          lastCartItem={lastCartItem}
          onRepeatLast={handleRepeatLast}
          onCustomize={handleCustomize}
        />
      )}
    </article>
  );
});
