'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useOrder } from '@/contexts/OrderContext';
import { useSplit } from '@/contexts/SplitContext';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SplitSection } from '@/components/cart/SplitSection';
import { CartItem } from '@/components/cart/CartItem';
import { CartItem as CartItemType } from '@/types/cart';
import { BillModal } from '@/components/cart/BillModal';
import { getFromStorage } from '@/mocks/mockStorage';
import { useRequireRestaurantContext } from '@/hooks/useNavigationGuard';

export default function CartPage() {
  const router = useRouter();
  // Navigation guard - redirect to login if no restaurant context
  const restaurantContext = useRequireRestaurantContext();
  const { cart, updateQuantity, removeItem, clearCart } = useCart();
  const { order, placeOrder } = useOrder();
  const { split } = useSplit();
  const [kitchenNote, setKitchenNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [isClient, setIsClient] = useState(false);

  // Update current time every second
  useEffect(() => {
    // Mark as client-side
    setIsClient(true);
    
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle quantity updates - memoized to prevent unnecessary re-renders
  const handleUpdateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity === 0) {
      // Remove item if quantity is 0
      removeItem(itemId);
    } else {
      updateQuantity(itemId, quantity);
    }
  }, [removeItem, updateQuantity]);

  // Handle customize button click - memoized
  const handleCustomize = useCallback((item: CartItemType) => {
    // TODO: Open customization modal with item details
    console.log('Customize item:', item);
  }, []);

  // Handle place order - memoized
  const handlePlaceOrder = useCallback(() => {
    // Get customer name and dining type from localStorage
    const customerName = getFromStorage<string>('morsel_customer_name') || 'Guest';
    const diningType = getFromStorage<'dine-in' | 'takeaway' | 'delivery'>('morsel_dining_type') || 'dine-in';
    
    // Place the order
    placeOrder(restaurantContext, customerName, diningType, cart, split);
    
    // Clear the cart after placing order
    clearCart();
    
    // Close modal and navigate to order summary
    setShowBillModal(false);
    router.push('/order-summary');
  }, [restaurantContext, cart, split, placeOrder, clearCart, router]);

  // Calculate remaining time based on current time
  const getRemainingTime = () => {
    if (!order || !order.timerExpiresAt) return null;
    
    const remaining = Math.max(0, Math.floor((order.timerExpiresAt - currentTime) / 1000));
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const remainingTime = getRemainingTime();

  // Don't render if no context (will redirect)
  if (!restaurantContext || !restaurantContext.restaurant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 p-4 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {/* Timer Badge */}
          <div className="flex items-center gap-2">
            {isClient && remainingTime && (
              <Badge variant="timer">
                {remainingTime}
              </Badge>
            )}
          </div>
          
          {/* Cart Total */}
          <button 
            onClick={() => router.push('/menu')}
            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
          >
            <span className="font-semibold text-lg">
              ${isClient ? cart.total.toFixed(2) : '0.00'}
            </span>
            <span className="text-gray-400">→</span>
          </button>
        </div>
      </div>

      {/* Cart Content */}
      <div className={cart.items.length === 0 ? "flex items-center justify-center min-h-[calc(100vh-120px)] px-4" : "max-w-2xl mx-auto p-4"}>
        {cart.items.length === 0 ? (
          <EmptyState
            icon="🛒"
            title="Your cart is empty"
            description="Add items from the menu to get started"
            actionLabel="Browse Menu"
            onAction={() => router.push('/menu')}
          />
        ) : (
          <>
            {/* Split Section */}
            <SplitSection />
            
            {/* Cart Items */}
            <div className="space-y-2 border-b border-gray-100 pb-4 mb-4">
              {cart.items.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  onUpdateQuantity={handleUpdateQuantity}
                  onCustomize={handleCustomize}
                />
              ))}
            </div>
            
            {/* Note to Kitchen */}
            <div className="border-t border-gray-100 pt-4">
              {!showNoteInput ? (
                <button
                  onClick={() => setShowNoteInput(true)}
                  className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <span className="text-xl">🍳</span>
                  <span className="text-sm">Add a note to the kitchen</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🍳</span>
                    <span className="text-sm font-medium">Note to kitchen</span>
                  </div>
                  <textarea
                    value={kitchenNote}
                    onChange={(e) => setKitchenNote(e.target.value)}
                    placeholder="e.g., No onions, extra spicy..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={3}
                    maxLength={200}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {kitchenNote.length}/200
                    </span>
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
          </>
        )}
      </div>

      {/* Floating Bill Button */}
      {cart.items.length > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-20 flex justify-center">
          <button
            onClick={() => setShowBillModal(true)}
            className="w-full max-w-2xl py-4 bg-black text-white rounded-xl font-medium shadow-lg hover:bg-gray-900 active:scale-95 transition-all"
          >
            Bill · ${cart.total.toFixed(2)}
          </button>
        </div>
      )}

      {/* Bill Modal */}
      <BillModal
        isOpen={showBillModal}
        onClose={() => setShowBillModal(false)}
        onPlaceOrder={handlePlaceOrder}
      />
    </div>
  );
}
