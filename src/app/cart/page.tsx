"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { useOrder } from "@/contexts/OrderContext";
import { useSplit } from "@/contexts/SplitContext";
import { Header } from "@/components/layout/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { ParticipantsList } from "@/components/session/ParticipantsList";
import { CartItem } from "@/components/cart/CartItem";
import { CartItem as CartItemType } from "@/types/cart";
import { BillModal } from "@/components/cart/BillModal";
import { BillSection } from "@/components/cart/BillSection";
import { getFromStorage } from "@/mocks/mockStorage";
import { useRequireRestaurantContext } from "@/hooks/useNavigationGuard";
import { useSessionValidation } from "@/hooks/useSessionValidation";

export default function CartPage() {
  const router = useRouter();
  // Navigation guard - redirect to login if no restaurant context
  const restaurantContext = useRequireRestaurantContext();
  const { cart, updateQuantity, removeItem, confirmOrder } = useCart();
  const { order, placeOrder } = useOrder();
  const { split } = useSplit();

  // Session validation - checks session status and expiry
  useSessionValidation();

  // Get current user's sessionUserId
  const currentSessionUserId = getFromStorage<string>("morsel_session_user_id");
  const [kitchenNote, setKitchenNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Mark as client-side on mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle quantity updates - memoized to prevent unnecessary re-renders
  const handleUpdateQuantity = useCallback(
    (itemId: string, quantity: number) => {
      if (quantity === 0) {
        // Remove item if quantity is 0
        removeItem(itemId);
      } else {
        updateQuantity(itemId, quantity);
      }
    },
    [removeItem, updateQuantity]
  );

  // Handle customize button click - memoized
  const handleCustomize = useCallback((item: CartItemType) => {
    // TODO: Open customization modal with item details
    console.log("Customize item:", item);
  }, []);

  // Handle place order - memoized
  const handlePlaceOrder = useCallback(
    async (paymentType: "cash" | "card" | "upi") => {
      setIsConfirming(true);

      try {
        // Confirm order via API
        const result = await confirmOrder(paymentType);

        if (result.success) {
          // Close modal
          setShowBillModal(false);

          // Also update the old OrderContext for backward compatibility
          // Get customer name and dining type from localStorage
          const customerName =
            getFromStorage<string>("morsel_customer_name") || "Guest";
          const diningType =
            getFromStorage<"dine-in" | "takeaway" | "delivery">(
              "morsel_dining_type"
            ) || "dine-in";
          placeOrder(restaurantContext, customerName, diningType, cart, split);

          // Navigate to order summary
          router.push("/order-summary");
        }
      } catch (error) {
        console.error("Order confirmation failed:", error);
        // Show error to user - you might want to add a toast/alert here
        alert(
          error instanceof Error
            ? error.message
            : "Failed to confirm order. Please try again."
        );
      } finally {
        setIsConfirming(false);
      }
    },
    [confirmOrder, restaurantContext, cart, split, placeOrder, router]
  );

  // Calculate the amount user needs to pay based on split settings
  const getUserAmount = () => {
    // If no split participants or split mode is disabled, return full amount
    if (!split.participants || split.participants.length === 0) {
      console.log('[CartPage] 👤 No split participants, user pays full amount:', `$${cart.total.toFixed(2)}`);
      return cart.total;
    }

    // Find current user's participant entry
    const currentUser = split.participants.find(
      (p) => p.id === currentSessionUserId
    );

    // If current user not found in participants, return full amount
    if (!currentUser) {
      console.warn('[CartPage] ⚠️ Current user not found in split participants, paying full amount');
      return cart.total;
    }

    // Return user's share from split, default to full amount if not found
    const userShare = split.shares[currentUser.id] ?? cart.total;
    console.log('[CartPage] 💰 User share calculated:', {
      userId: currentSessionUserId?.substring(0, 8) + '...',
      userName: currentUser.name,
      userShare: `$${userShare.toFixed(2)}`,
      cartTotal: `$${cart.total.toFixed(2)}`,
      splitMode: split.mode,
      allShares: Object.entries(split.shares).map(([id, amount]) => ({
        id: id.substring(0, 8) + '...',
        name: split.participants.find(p => p.id === id)?.name || 'Unknown',
        amount: `$${amount.toFixed(2)}`
      }))
    });
    return userShare;
  };

  const userAmount = getUserAmount();

  // Calculate total preparation time: max prep time from all items + 15 mins
  const totalPreparationTime = useMemo(() => {
    if (!cart.items || cart.items.length === 0) {
      return 0;
    }

    // Extract preparation times from all items and find the maximum
    const prepTimes = cart.items.map((item) => {
      const prepTime = item.menuItem.preparationTime;
      // Parse the preparation time string to extract numeric value
      // Handles formats like "20", "20 mins", "20mins", etc.
      const numericValue = parseInt(prepTime?.replace(/\D/g, "") || "0", 10);
      return numericValue;
    });

    const maxPrepTime = Math.max(...prepTimes, 0);
    return maxPrepTime + 15; // Add 15 minutes to the maximum
  }, [cart.items]);

  // Don't render if no context (will redirect)
  if (!restaurantContext || !restaurantContext.restaurant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F7F8F8]">
      {/* Header */}
      <Header
        showTimer={!!order?.timerExpiresAt}
        showCart={true}
        showFilters={false}
        onRightIconClick={() => router.push("/menu")}
      />

      {/* Cart Content */}
      <div
        className={
          !isClient || cart.items.length === 0
            ? "flex items-center justify-center min-h-[calc(100vh-120px)] px-4 bg-[#F7F8F8]"
            : "max-w-2xl mx-auto p-4 px-4 bg-[#F7F8F8] pb-24"
        }
      >
        {!isClient || cart.items.length === 0 ? (
          <EmptyState
            icon="🛒"
            title="Your cart is empty"
            description="Add items from the menu to get started"
            actionLabel="Browse Menu"
            onAction={() => router.push("/menu")}
          />
        ) : (
          <>
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
                />
              ))}
            </div>

            {/* Note to Kitchen */}
            <div className="border-3 border-[#ECECEC] py-2 px-4 rounded-3xl w-fit">
              {!showNoteInput ? (
                <button
                  onClick={() => setShowNoteInput(true)}
                  className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <span className="text-sm">Add a note to the kitchen</span>
                  <span className="text-xl">👩‍🍳</span>
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
                          setKitchenNote("");
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
                    <p className="text-sm text-gray-700 flex-1">
                      {kitchenNote}
                    </p>
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
              <span className="text-xl w-[6%]">👩‍🍳</span>
              <span className="border-b-2 border-dotted border-[#25A75C] w-[74%] h-[8px]"/>
              <span className="text-sm w-auto text-right text-[#25A75C] font-bold">
                {isClient && totalPreparationTime > 0 ? ` ${totalPreparationTime}mins` : " --"}
              </span>
            </div>

            {/* Bill Section */}
            <div className="mt-4">
              <BillSection userAmount={userAmount} />
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
            Bill · ${isClient ? userAmount.toFixed(2) : "0.00"}
          </button>
        </div>
      )}

      {/* Bill Modal */}
      <BillModal
        isOpen={showBillModal}
        onClose={() => setShowBillModal(false)}
        onPlaceOrder={handlePlaceOrder}
        isConfirming={isConfirming}
      />
    </div>
  );
}
