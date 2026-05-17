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
import { useLocale } from '@/contexts/LocaleContext';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';
import { useSession } from '@/contexts/SessionContext';
import { CartItem } from '@/components/cart/CartItem';
import { CartItem as CartItemType, Customization } from '@/types/cart';
import { BillSection } from '@/components/cart/BillSection';
import { EmptyState } from '@/components/ui/EmptyState';
import { getFromStorage, setInStorage } from '@/mocks/mockStorage';
import { STORAGE_KEYS } from '@/lib/storage-keys';

// Lazy load CustomizationModal
const CustomizationModal = dynamic(
  () =>
    import('@/components/order/CustomizationModal').then((mod) => ({
      default: mod.CustomizationModal,
    })),
  { ssr: false }
);

const KITCHEN_NOTE_KEY = STORAGE_KEYS.KITCHEN_NOTE;

interface PreOrderViewProps {
  onPlaceOrder: () => Promise<void>;
  isPlacingOrder: boolean;
}

export function PreOrderView({ onPlaceOrder, isPlacingOrder }: PreOrderViewProps) {
  const router = useRouter();
  const { formatPrice } = useLocale();
  const { cart, updateQuantity, removeItem, addItem } = useCart();
  const { sessionData } = useSession();

  const [kitchenNote, setKitchenNote] = useState(() => getFromStorage<string>(KITCHEN_NOTE_KEY) || '');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [isBillExpanded, setIsBillExpanded] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [itemToCustomize, setItemToCustomize] = useState<CartItemType | null>(null);

  // Current user's session ID
  const currentSessionUserId = getFromStorage<string>(STORAGE_KEYS.SESSION_USER_ID);

  // My items vs others' items
  const myItems = useMemo(
    () => cart.items.filter((item) => !item.sessionUserId || item.sessionUserId === currentSessionUserId),
    [cart.items, currentSessionUserId]
  );

  const othersItems = useMemo(
    () => cart.items.filter((item) => item.sessionUserId && item.sessionUserId !== currentSessionUserId),
    [cart.items, currentSessionUserId]
  );

  // Group others' items by participant
  const othersGrouped = useMemo(() => {
    const groups: { sessionUserId: string; guestName: string; items: CartItemType[] }[] = [];
    const seen = new Map<string, number>();

    for (const item of othersItems) {
      const uid = item.sessionUserId!;
      if (!seen.has(uid)) {
        const participant = sessionData?.session?.participants?.find((p) => p.sessionUserId === uid);
        seen.set(uid, groups.length);
        groups.push({ sessionUserId: uid, guestName: participant?.guestName || 'Guest', items: [item] });
      } else {
        groups[seen.get(uid)!].items.push(item);
      }
    }
    return groups;
  }, [othersItems, sessionData]);

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


  // Persist kitchen note to localStorage
  const handleSaveNote = useCallback(() => {
    setShowNoteInput(false);
    setInStorage(KITCHEN_NOTE_KEY, kitchenNote);
  }, [kitchenNote]);

  const handleCancelNote = useCallback(() => {
    setShowNoteInput(false);
    setKitchenNote('');
    setInStorage(KITCHEN_NOTE_KEY, '');
  }, []);

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
      <div className="max-w-2xl mx-auto p-4 px-4 bg-[#F7F8F8]">
        {/* Bill Section — Collapsible Card */}
        <div className="mb-4 border-2 border-[#ECECEC] rounded-[20px] bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => setIsBillExpanded(!isBillExpanded)}
            className="w-full flex items-center justify-between px-4 py-3"
          >
            <span
              className="text-black font-bold text-[16px]"
              style={{ fontFamily: 'Lato, sans-serif' }}
            >
              Total {formatPrice(cart.total)}
            </span>
            <svg
              width="12"
              height="8"
              viewBox="0 0 12 8"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`transition-transform ${isBillExpanded ? 'rotate-180' : ''}`}
            >
              <path d="M1 1.5L6 6.5L11 1.5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {isBillExpanded && (
            <div className="px-4 pb-4">
              <BillSection userAmount={cart.total} />
            </div>
          )}
        </div>

        {/* My Cart */}
        {myItems.length > 0 ? (
          <div className="space-y-2 pb-4 mb-1">
            {myItems.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onUpdateQuantity={handleUpdateQuantity}
                onCustomize={handleCustomize}
                sessionData={sessionData}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 px-4 mb-4 border-2 border-dashed border-gray-200 rounded-[20px] bg-white">
            <span className="text-2xl mb-2">🛒</span>
            <p className="text-sm font-semibold text-gray-500">Your cart is empty</p>
            <button
              onClick={() => router.push('/menu')}
              className="mt-2 text-xs text-black underline"
            >
              Browse Menu
            </button>
          </div>
        )}

        {/* Table Orders — read-only view of other participants' items */}
        {othersGrouped.length > 0 && (
          <div className="mb-4">
            <p
              className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-1"
              style={{ fontFamily: 'Lato, sans-serif' }}
            >
              Table Orders
            </p>
            <div className="border-2 border-[#ECECEC] rounded-[20px] bg-white overflow-hidden">
              {othersGrouped.map((group, groupIndex) => (
                <div
                  key={group.sessionUserId}
                  className={groupIndex > 0 ? 'border-t border-[#ECECEC]' : ''}
                >
                  <div className="px-4 pt-3 pb-1">
                    <span
                      className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-semibold rounded-full"
                      style={{ fontFamily: 'Lato, sans-serif' }}
                    >
                      {group.guestName}
                    </span>
                  </div>
                  {group.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-4 py-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="shrink-0 w-[36px] h-[36px] rounded-[10px] overflow-hidden bg-gray-100">
                          {item.menuItem.image ? (
                            <Image
                              src={item.menuItem.image}
                              alt={item.menuItem.name}
                              width={36}
                              height={36}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200" />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span
                            className="text-sm font-bold truncate"
                            style={{ fontFamily: 'Lato, sans-serif' }}
                          >
                            {item.menuItem.name}
                          </span>
                          <span
                            className="text-xs opacity-50"
                            style={{ fontFamily: 'Helvetica Neue, sans-serif', fontWeight: 500 }}
                          >
                            {formatPrice(item.menuItem.price)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className="text-sm font-bold px-3 py-1 border-2 border-gray-200 rounded-[10px]"
                          style={{ fontFamily: 'Lato, sans-serif' }}
                        >
                          ×{item.quantity}
                        </span>
                        <span
                          className="text-xs font-black"
                          style={{ fontFamily: 'Lato, sans-serif', fontWeight: 900 }}
                        >
                          {formatPrice(item.itemTotal)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Note to Kitchen */}
        <div className="border-3 border-[#ECECEC] py-2 px-3 rounded-[30px] mt-1 w-fit">
          {!showNoteInput ? (
            <button
              onClick={() => setShowNoteInput(true)}
              className="w-[100%] flex justify-center items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <span className="text-sm">Add a note to the kitchen</span>
              <span className="text-xl">&#x1F469;&#x200D;&#x1F373;</span>
            </button>
          ) : (
            <div className="space-y-2 w-[80vw]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">&#x1F469;&#x200D;&#x1F373;</span>
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
                    onClick={handleCancelNote}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNote}
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
      </div>

      {/* Place Order Button */}
      <div
        className="fixed left-0 right-0 z-20 flex justify-center"
        style={{
          bottom: 0,
          // iOS Safari fixed positioning fix
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
      >
        <button
          onClick={onPlaceOrder}
          disabled={isPlacingOrder || myItems.length === 0}
          className="w-full max-w-2xl h-[70px] box-content bg-brand text-white flex items-center justify-between px-[22px] transition-colors disabled:bg-gray-500 disabled:opacity-100 disabled:cursor-not-allowed"
          style={{
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
            fontFamily: 'Helvetica Neue, sans-serif',
            fontWeight: 700,
            fontSize: '20px',
            lineHeight: '1.22',
          }}
        >
          <span className="flex-shrink-0">
            {isPlacingOrder ? 'Placing order...' : 'Place Order'}
          </span>
          <span className="flex-shrink-0">
            {isClient ? formatPrice(cart.total) : formatPrice(0)}
          </span>
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
