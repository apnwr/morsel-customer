/**
 * PreOrderView Component
 *
 * Displays cart UI when order has not been placed yet (pre-order state)
 * Shows participants, cart items, kitchen note, bill, and place order button
 *
 * Extracted from /cart/page.tsx for use in unified cart/order-status page
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useSplit } from '@/contexts/SplitContext';
import { useSession } from '@/contexts/SessionContext';
import { ParticipantsList } from '@/components/session/ParticipantsList';
import { CartItem } from '@/components/cart/CartItem';
import { CartItem as CartItemType, Customization } from '@/types/cart';
import { BillSection } from '@/components/cart/BillSection';
import { EmptyState } from '@/components/ui/EmptyState';
import { getFromStorage } from '@/mocks/mockStorage';

// Lazy load CustomizationModal
const CustomizationModal = dynamic(
  () =>
    import('@/components/order/CustomizationModal').then((mod) => ({
      default: mod.CustomizationModal,
    })),
  { ssr: false }
);

interface PreOrderViewProps {
  onPlaceOrder: () => Promise<void>;
  isPlacingOrder: boolean;
}

export function PreOrderView({ onPlaceOrder, isPlacingOrder }: PreOrderViewProps) {
  const router = useRouter();
  const { cart, updateQuantity, removeItem, addItem } = useCart();
  const { split } = useSplit();
  const { sessionData } = useSession();

  const [kitchenNote, setKitchenNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [itemToCustomize, setItemToCustomize] = useState<CartItemType | null>(null);

  // Current user's session ID
  const currentSessionUserId = getFromStorage<string>('morsel_session_user_id');

  // Mark as client-side on mount
  useState(() => {
    setIsClient(true);
  });

  // Handle quantity updates
  const handleUpdateQuantity = useCallback(
    (itemId: string, quantity: number) => {
      if (quantity === 0) {
        removeItem(itemId);
      } else {
        updateQuantity(itemId, quantity);
      }
    },
    [removeItem, updateQuantity]
  );

  // Handle customize button click
  const handleCustomize = useCallback(
    (item: CartItemType) => {
      setItemToCustomize(item);
    },
    []
  );

  // Handle updating customizations from modal
  const handleUpdateCustomizations = useCallback(
    (customizations: Customization[], quantity: number) => {
      if (!itemToCustomize) return;

      removeItem(itemToCustomize.id);
      addItem(itemToCustomize.menuItem, customizations, itemToCustomize.notes, quantity);
      setItemToCustomize(null);
    },
    [itemToCustomize, removeItem, addItem]
  );

  // Calculate user's amount based on split settings
  const userAmount = useMemo(() => {
    if (!split.participants || split.participants.length === 0) {
      return cart.total;
    }

    const currentUser = split.participants.find((p) => p.id === currentSessionUserId);

    if (!currentUser) {
      return cart.total;
    }

    return split.shares[currentUser.id] ?? cart.total;
  }, [split, cart.total, currentSessionUserId]);

  // Calculate total preparation time (max from all items)
  const totalPreparationTime = useMemo(() => {
    if (!cart.items || cart.items.length === 0) {
      return 0;
    }

    const prepTimes = cart.items.map((item) => {
      const prepTime = item.menuItem.preparationTime;
      const numericValue = parseInt(prepTime?.replace(/\D/g, '') || '0', 10);
      return numericValue;
    });

    return Math.max(...prepTimes, 0);
  }, [cart.items]);

  // Empty state
  if (!isClient || cart.items.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-120px)] px-4 bg-[#F7F8F8]">
        <EmptyState
          icon="🛒"
          title="Your cart is empty"
          description="Add items from the menu to get started"
          actionLabel="Browse Menu"
          onAction={() => router.push('/menu')}
        />
      </div>
    );
  }

  return (
    <>
      {/* Cart Content */}
      <div className="max-w-2xl mx-auto p-4 px-4 bg-[#F7F8F8] pb-24">
        {/* Participants List */}
        <div className="mb-4">
          <ParticipantsList />
        </div>

        {/* Cart Items */}
        <div className="space-y-2 pb-4 mb-1">
          {cart.items.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              onUpdateQuantity={handleUpdateQuantity}
              onCustomize={handleCustomize}
              sessionData={sessionData}
            />
          ))}
        </div>

        {/* Note to Kitchen */}
        <div className="border-3 border-[#ECECEC] py-2 px-4 rounded-[30px] w-auto">
          {!showNoteInput ? (
            <button
              onClick={() => setShowNoteInput(true)}
              className="w-[100%] flex justify-center items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <span className="text-sm">Add a note to the kitchen</span>
              <span className="text-xl">👩‍🍳</span>
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">👩‍🍳</span>
                <span className="text-sm font-medium">Note to kitchen</span>
              </div>
              <textarea
                value={kitchenNote}
                onChange={(e) => setKitchenNote(e.target.value)}
                placeholder="e.g., No onions, extra spicy..."
                className="w-full px-4 py-3 border border-gray-200 rounded-[24px] resize-none focus:outline-none focus:border-[#000000]"
                rows={3}
                maxLength={200}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{kitchenNote.length}/200</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowNoteInput(false);
                      setKitchenNote('');
                    }}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowNoteInput(false)}
                    className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-900 active:scale-95 transition-all"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Display saved note */}
          {kitchenNote && !showNoteInput && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-700 flex-1">{kitchenNote}</p>
                <button
                  onClick={() => setShowNoteInput(true)}
                  className="text-xs text-purple-600 hover:text-purple-700 shrink-0"
                >
                  Edit
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Preparation Time counter */}
        <div className="relative flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors py-6">
          <span className="text-xl flex-shrink-0">👩‍🍳</span>
          <span className="border-b-2 border-dotted border-[#25A75C] flex-1 h-[8px]" />
          <span className="text-sm flex-shrink-0 text-right text-[#25A75C] font-bold whitespace-nowrap">
            {isClient && totalPreparationTime > 0 ? `${totalPreparationTime}mins` : '--'}
          </span>
        </div>

        {/* Bill Section */}
        <div className="mt-4">
          <BillSection userAmount={userAmount} />
        </div>
      </div>

      {/* Place Order Button */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t rounded-t-xl overflow-hidden flex justify-center px-2 sm:px-0">
        <button
          onClick={onPlaceOrder}
          disabled={isPlacingOrder}
          className="w-full max-w-2xl h-[70px] bg-black text-white flex items-center justify-between px-4 sm:px-6 gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            fontFamily: 'Helvetica Neue, sans-serif',
            fontWeight: 500,
            fontSize: '20px',
            lineHeight: '1.22',
          }}
        >
          <span className="flex-shrink-0">
            {isPlacingOrder ? 'Placing order...' : 'Place order'}
          </span>
          <span className="flex-shrink-0 text-center min-w-[80px]">
            $ {isClient ? userAmount.toFixed(2) : '0.00'}
          </span>
          <div className="flex-shrink-0 flex items-center justify-end w-[25px]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="25"
              height="25"
              viewBox="0 0 25 25"
              fill="none"
            >
              <path
                d="M4.84766 19.6943L19.6969 4.8451"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10.0039 4.84522L19.6941 4.84522L19.6913 14.5326"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </button>
      </div>

      {/* Customization Modal */}
      {itemToCustomize && (
        <CustomizationModal
          item={itemToCustomize.menuItem}
          isOpen={!!itemToCustomize}
          onClose={() => setItemToCustomize(null)}
          onAddToCart={handleUpdateCustomizations}
          lastCustomizations={itemToCustomize.customizations}
          existingQuantityInCart={itemToCustomize.quantity}
        />
      )}
    </>
  );
}
