'use client';

import React, { useMemo } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { Modal } from '@/components/ui/Modal';
import { CartItem } from '@/types/cart';
import { Minus, Plus } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { getFromStorage } from '@/mocks/mockStorage';
import { STORAGE_KEYS } from '@/lib/storage-keys';

// Helper function to get dietary type
const getDietaryTypeFromItem = (menuItem: CartItem['menuItem']) => {
  const allDietaryInfo = [
    ...(menuItem.allergens || []),
    ...(menuItem.dietary || [])
  ].map(d => d.toLowerCase());
  
  if (allDietaryInfo.some(d => d === 'non-vegetarian' || d === 'non vegetarian' || d === 'nonvegetarian')) {
    return 'non-vegetarian';
  }
  if (allDietaryInfo.some(d => d === 'vegetarian' || d === 'veg')) {
    return 'vegetarian';
  }
  return null;
};

// Dietary Symbol Component
const DietarySymbol = ({ dietaryType }: { dietaryType: 'vegetarian' | 'non-vegetarian' }) => (
  <div 
    className={`w-3.5 h-3.5 flex items-center justify-center rounded-[2px] border-[1.5px] bg-white shrink-0 ${
      dietaryType === 'vegetarian' 
        ? 'border-green-600' 
        : 'border-red-600'
    }`}
    aria-label={dietaryType === 'vegetarian' ? 'Vegetarian' : 'Non-vegetarian'}
    title={dietaryType === 'vegetarian' ? 'Vegetarian' : 'Non-vegetarian'}
  >
    {dietaryType === 'vegetarian' ? (
      <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
    ) : (
      <div className="w-0 h-0 border-l-[3px] border-r-[3px] border-b-[5px] border-l-transparent border-r-transparent border-b-red-600" />
    )}
  </div>
);

// Helper function to generate a unique key for customizations (for grouping same items)
const getCustomizationKey = (customizations: CartItem['customizations']): string => {
  if (customizations.length === 0) return 'no-customizations';
  return customizations
    .map(c => `${c.optionId}:${c.choiceId}`)
    .sort()
    .join('|');
};

interface GroupedCartItem {
  key: string;
  items: CartItem[];
  totalQuantity: number;
  isOwnedByCurrentUser: boolean;
  ownerName?: string;
  customizationSummary: string;
}

interface VariationSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onRemove: (cartItemId: string) => void;
  onDecrement: (cartItemId: string) => void;
  onIncrement: (cartItemId: string) => void;
}

export function VariationSelectionModal({
  isOpen,
  onClose,
  cartItems,
  onRemove,
  onDecrement,
  onIncrement,
}: VariationSelectionModalProps) {
  const { formatPrice } = useLocale();
  const { sessionData } = useSession();
  
  // Get current user's sessionUserId
  const currentSessionUserId = useMemo(() => {
    return getFromStorage<string>(STORAGE_KEYS.SESSION_USER_ID) || '';
  }, []);

  // Get participant name by sessionUserId
  const getParticipantName = (sessionUserId: string | undefined): string => {
    if (!sessionUserId || !sessionData?.session?.participants) return 'Unknown';
    const participant = sessionData.session.participants.find(
      p => p.sessionUserId === sessionUserId
    );
    return participant?.guestName || 'Another guest';
  };

  // Group cart items by customization configuration and ownership
  const groupedItems = useMemo((): GroupedCartItem[] => {
    const groups = new Map<string, GroupedCartItem>();

    cartItems.forEach(item => {
      const isOwnedByCurrentUser = !item.sessionUserId || item.sessionUserId === currentSessionUserId;
      const customizationKey = getCustomizationKey(item.customizations);
      // Create a unique group key based on ownership and customization
      // Items from different users with same config should be separate groups
      // Include spice level in group key to separate items with different spice levels
      const groupKey = `${item.sessionUserId || 'self'}-${customizationKey}-${item.spiceLevel || 'no-spice'}`;

      if (groups.has(groupKey)) {
        const existing = groups.get(groupKey)!;
        existing.items.push(item);
        existing.totalQuantity += item.quantity;
      } else {
        // Build customization summary including spice level
        const parts: string[] = [];
        if (item.customizations.length > 0) {
          parts.push(item.customizations.map(c => c.choiceLabel).join(', '));
        }
        if (item.spiceLevel) {
          parts.push(`🌶️ ${item.spiceLevel}`);
        }
        const customizationSummary = parts.length > 0
          ? parts.join(' • ')
          : 'No customizations';

        groups.set(groupKey, {
          key: groupKey,
          items: [item],
          totalQuantity: item.quantity,
          isOwnedByCurrentUser,
          ownerName: isOwnedByCurrentUser ? undefined : getParticipantName(item.sessionUserId),
          customizationSummary,
        });
      }
    });

    return Array.from(groups.values());
  }, [cartItems, currentSessionUserId, sessionData?.session?.participants]);

  // Handle decrement for a group (reduces quantity by 1)
  const handleDecrementGroup = (e: React.MouseEvent, group: GroupedCartItem) => {
    e.stopPropagation();
    
    if (!group.isOwnedByCurrentUser) {
      return;
    }

    // Find the first item in the group to decrement
    const firstItem = group.items[0];
    
    if (group.totalQuantity === 1) {
      // Remove the item completely
      onRemove(firstItem.id);
      // Close modal if this was the last group
      if (groupedItems.length === 1) {
        onClose();
      }
    } else if (firstItem.quantity === 1) {
      // If first item has quantity 1, remove it (next item in group will take over)
      onRemove(firstItem.id);
    } else {
      // Decrement the first item's quantity
      onDecrement(firstItem.id);
    }
  };

  // Handle increment for a group (increases quantity by 1)
  const handleIncrementGroup = (e: React.MouseEvent, group: GroupedCartItem) => {
    e.stopPropagation();
    
    if (!group.isOwnedByCurrentUser) {
      return;
    }

    // Find the first item in the group to increment
    const firstItem = group.items[0];
    onIncrement(firstItem.id);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adjust quantity">
      <div className="space-y-3">
        {groupedItems.map((group) => {
          const firstItem = group.items[0];
          const dietaryType = getDietaryTypeFromItem(firstItem.menuItem);
          const unitPrice = firstItem.menuItem.price + 
            firstItem.customizations.reduce((sum, c) => sum + c.priceModifier, 0);

          return (
            <div
              key={group.key}
              className={`flex items-start justify-between p-4 rounded-xl transition-colors ${
                group.isOwnedByCurrentUser 
                  ? 'bg-gray-50 hover:bg-gray-100' 
                  : 'bg-amber-50 border border-amber-200'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {dietaryType && (
                    <DietarySymbol dietaryType={dietaryType} />
                  )}
                  <h4 className="font-medium text-base truncate">{firstItem.menuItem.name}</h4>
                </div>
                
                {/* Show customizations if any */}
                {firstItem.customizations.length > 0 && (
                  <div className="text-xs text-gray-600 mb-1 truncate">
                    {group.customizationSummary}
                  </div>
                )}
                
                {/* Show notes if any */}
                {firstItem.notes && (
                  <div className="text-xs text-gray-500 italic truncate">
                    Note: {firstItem.notes}
                  </div>
                )}
                
                {/* Price info */}
                <div className="text-sm text-gray-600 mt-1">
                  {group.totalQuantity} × {formatPrice(unitPrice)} = {formatPrice(unitPrice * group.totalQuantity)}
                </div>

                {/* Show owner info for items not owned by current user */}
                {!group.isOwnedByCurrentUser && (
                  <div className="mt-2 text-xs text-amber-700 font-medium">
                    Added by {group.ownerName} — you can&apos;t modify this
                  </div>
                )}
              </div>
              
              {/* Quantity controls for own items, disabled state for others' items */}
              {group.isOwnedByCurrentUser ? (
                <div className="ml-3 flex items-center gap-1 bg-black rounded-full px-2 py-1.5 shrink-0">
                  <button
                    onClick={(e) => handleDecrementGroup(e, group)}
                    className="w-7 h-7 flex items-center justify-center text-white hover:bg-gray-700 rounded-full transition-colors active:scale-95"
                    aria-label={`Remove one ${firstItem.menuItem.name}`}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="min-w-[28px] text-center font-semibold text-white text-sm tabular-nums">
                    {group.totalQuantity}
                  </span>
                  <button
                    onClick={(e) => handleIncrementGroup(e, group)}
                    className="w-7 h-7 flex items-center justify-center text-white hover:bg-gray-700 rounded-full transition-colors active:scale-95"
                    aria-label={`Add one more ${firstItem.menuItem.name}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="ml-3 flex items-center gap-1 bg-gray-200 rounded-full px-3 py-1.5 shrink-0">
                  <span className="min-w-[28px] text-center font-semibold text-gray-500 text-sm tabular-nums">
                    {group.totalQuantity}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
