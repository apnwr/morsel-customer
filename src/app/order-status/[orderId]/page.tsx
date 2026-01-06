"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { getFromStorage } from "@/mocks/mockStorage";
import { useRequireRestaurantContext } from "@/hooks/useNavigationGuard";
import { useSessionValidation } from "@/hooks/useSessionValidation";
import { useSession } from "@/contexts/SessionContext";
import { useRestaurant } from "@/contexts/RestaurantContext";
import type { Order as APIOrder } from "@/types/api/order";
import { getMenuItemById } from "@/mocks/menuData";
import Image from "next/image";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { PaymentModal } from "@/components/order/PaymentModal";
import { SplitSettingsModal } from "@/components/order/SplitSettingsModal";
import { useSplit } from "@/contexts/SplitContext";

export default function OrderStatusPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;
  const restaurantContext = useRequireRestaurantContext();
  const { sessionData } = useSession();
  const { context } = useRestaurant();
  const { split } = useSplit();
  
  // Session validation
  useSessionValidation();

  const [orderData, setOrderData] = useState<APIOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [remainingTime, setRemainingTime] = useState(120); // 2 minutes default

  // Load order data from storage
  useEffect(() => {
    if (!orderId) return;

    const storedOrder = getFromStorage<APIOrder & { _placedAt?: number }>(`morsel_order_${orderId}`);
    if (storedOrder) {
      // Extract timestamp if available
      const { _placedAt, ...order } = storedOrder;
      setOrderData(order);
      
      // Calculate remaining time from when order was placed (2 minutes = 120 seconds)
      if (_placedAt) {
        const elapsed = Math.floor((Date.now() - _placedAt) / 1000);
        const remaining = Math.max(0, 120 - elapsed);
        setRemainingTime(remaining);
      } else {
        // Fallback to 120 seconds if timestamp not available
        setRemainingTime(120);
      }
    } else {
      // If order not found, redirect to menu
      router.push("/menu");
    }
    setIsLoading(false);
  }, [orderId, router]);

  // Timer countdown
  useEffect(() => {
    if (!orderData || remainingTime <= 0) return;

    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [orderData, remainingTime]);

  // Calculate total preparation time
  const totalPreparationTime = useMemo(() => {
    if (!orderData?.items) return 0;
    
    // Get max prep time from items (assuming 20 mins default per item + 15 mins)
    // In a real app, this would come from the menu items
    return 35; // Default preparation time
  }, [orderData]);

  // Get menu items for display
  const orderItemsWithDetails = useMemo(() => {
    if (!orderData?.items || !restaurantContext?.restaurant) return [];
    
    return orderData.items.map((item) => {
      const menuItem = getMenuItemById(restaurantContext.restaurant.id, item.itemId);
      return {
        ...item,
        menuItem,
        image: menuItem?.image || null,
      };
    });
  }, [orderData, restaurantContext]);

  // Calculate user amount (from split or full amount)
  const getUserAmount = () => {
    if (!orderData) return 0;
    
    // If split is active, calculate user's share
    if (split.participants && split.participants.length > 0) {
      const currentSessionUserId = getFromStorage<string>("morsel_session_user_id");
      const currentUser = split.participants.find((p) => p.id === currentSessionUserId);
      if (currentUser) {
        return split.shares[currentUser.id] ?? orderData.total;
      }
    }
    
    return orderData.total;
  };

  const userAmount = getUserAmount();
  const isEditable = remainingTime > 0;
  const minutes = Math.floor(remainingTime / 60);
  const seconds = remainingTime % 60;

  // Handle payment
  const handlePayNow = async () => {
    setIsProcessingPayment(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsProcessingPayment(false);
    setPaymentModalOpen(true);
  };

  // Handle start new order
  const handleStartNewOrder = () => {
    router.push("/menu");
  };

  // Don't render if no context
  if (!restaurantContext || !restaurantContext.restaurant) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F8F8] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order...</p>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return null;
  }

  // Get dining type and item count for display
  const diningType = getFromStorage<"dine-in" | "takeaway" | "delivery">("morsel_dining_type") || "dine-in";
  const itemCount = orderData.items.reduce((sum, item) => sum + item.quantity, 0);
  const splitMode = split.participants && split.participants.length > 1 ? "split evenly" : "";

  return (
    <div className="min-h-screen bg-[#F7F8F8]">
      {/* Header */}
      <Header
        showTimer={isEditable}
        showCart={true}
        showFilters={false}
        onRightIconClick={() => router.push("/menu")}
      />

      {/* Main Content */}
      <div className="max-w-2xl mx-auto p-4 px-4 bg-[#F7F8F8] pb-24">
        {/* Order Status Section */}
        <div className="mb-6">
          <div className="flex flex-col gap-3 mb-3">
            <div className="flex items-center gap-3">
              <span className="text-xl">👩‍🍳</span>
              <span
                className="text-black text-[16px] leading-[1.22] font-medium"
                style={{ fontFamily: "Helvetica Neue, sans-serif", fontWeight: 500 }}
              >
                Your order is getting prepared.
              </span>
            </div>
            <p
              className="text-black text-[12px] leading-[1.5] opacity-50"
              style={{ fontFamily: "Helvetica Neue, sans-serif" }}
            >
              Click on the cook-time tracker to see your running order. You can place another order while we prep this.
            </p>
          </div>

          {/* Timer and Edit Section */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <svg
                  width="59"
                  height="36"
                  viewBox="0 0 59 36"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="0.5"
                    y="0.5"
                    width="58"
                    height="35"
                    rx="17.5"
                    fill="#F0F0F0"
                    stroke="black"
                    strokeWidth="3"
                  />
                </svg>
                <span
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-black text-[12px] leading-[1.5] font-bold opacity-80"
                  style={{ fontFamily: "Helvetica Neue, sans-serif" }}
                >
                  {minutes} : {seconds.toString().padStart(2, "0")}
                </span>
              </div>
              {isEditable && (
                <button
                  className="flex items-center gap-2 px-3 py-2 bg-[#F0F0F0] rounded-[10px] border border-black"
                  onClick={() => router.push("/cart")}
                >
                  <span className="text-base">✏️</span>
                  <span
                    className="text-black text-[12px] leading-[1.22] font-bold"
                    style={{ fontFamily: "Helvetica Neue, sans-serif" }}
                  >
                    Edit
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Order Info */}
          <p
            className="text-black text-[12px] leading-[1.5] opacity-50"
            style={{ fontFamily: "Helvetica Neue, sans-serif" }}
          >
            {itemCount} item{itemCount !== 1 ? "s" : ""}, {diningType}
            {splitMode && `, ${splitMode}.`}
            {isEditable && (
              <>
                {" "}
                You can cancel / edit this order in the next {minutes} min{minutes !== 1 ? "s" : ""}.
              </>
            )}
          </p>
        </div>

        {/* Preparation Time Section */}
        <div className="relative flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors py-6 mb-4">
          <span className="text-xl w-[6%]">👩‍🍳</span>
          <span className="border-b-2 border-dotted border-[#25A75C] w-[74%] h-[8px]" />
          <span className="text-sm w-auto text-right text-[#25A75C] font-bold">
            {totalPreparationTime}mins
          </span>
        </div>

        {/* Order Summary Section */}
        <div className="mb-6">
          <h3
            className="text-black text-[20px] leading-[1.22] font-bold mb-4 opacity-80"
            style={{ fontFamily: "Helvetica Neue, sans-serif", fontWeight: 700 }}
          >
            Order Summary
          </h3>

          <div className="space-y-4">
            {orderItemsWithDetails.map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex items-start gap-2 flex-1">
                  {item.image ? (
                    <div className="relative w-[47px] h-[47px] rounded-xl overflow-hidden shrink-0">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-[47px] h-[47px] rounded-xl bg-gray-200 shrink-0" />
                  )}
                  <div className="flex-1">
                    <h4
                      className="text-black text-[14px] leading-[1.2] font-bold mb-1"
                      style={{ fontFamily: "Lato, sans-serif", fontWeight: 700 }}
                    >
                      {item.name}
                    </h4>
                    <p
                      className="text-black text-[14px] leading-[1.22] font-medium opacity-50"
                      style={{ fontFamily: "Helvetica Neue, sans-serif", fontWeight: 500 }}
                    >
                      $ {item.itemTotal.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Kitchen Note (if exists) */}
            {orderData.items.length > 0 && (
              <div className="mt-4 p-3 bg-white border-[3px] border-[#ECECEC] rounded-[30px]">
                <p
                  className="text-black text-[16px] leading-[1.2] font-bold"
                  style={{ fontFamily: "Lato, sans-serif", fontWeight: 700 }}
                >
                  Bring veggies on the side.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Running Tabs Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3
              className="text-black text-[20px] leading-[1.22] font-bold opacity-80"
              style={{ fontFamily: "Helvetica Neue, sans-serif", fontWeight: 700 }}
            >
              Running Tabs
            </h3>
            {split.participants && split.participants.length > 1 && (
              <button
                onClick={() => setIsSplitModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2 bg-white border-[2px] border-[#ECECEC] rounded-[30px]"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M10 3.33V16.67M3.33 10H16.67"
                    stroke="black"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <span
                  className="text-black text-[16px] leading-[1.2] font-bold"
                  style={{ fontFamily: "Lato, sans-serif", fontWeight: 700 }}
                >
                  Split evenly
                </span>
              </button>
            )}
          </div>

          {/* Participants List */}
          {split.participants && split.participants.length > 0 ? (
            <div className="space-y-3">
              {split.participants.map((participant) => {
                const amount = split.shares[participant.id] ?? 0;
                const currentSessionUserId = getFromStorage<string>("morsel_session_user_id");
                const isCurrentUser = participant.id === currentSessionUserId;
                
                return (
                  <div
                    key={participant.id}
                    className={`flex items-center justify-between p-2 px-4 rounded-[50px] ${
                      isCurrentUser
                        ? "bg-[#EAF8F8] border-[2px] border-[#D2EDED]"
                        : "bg-white border-[2px] border-[#DEDEDE]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar name={participant.name} size="sm" />
                      <span
                        className="text-black text-[16px] leading-[1.22] font-bold"
                        style={{ fontFamily: "Helvetica Neue, sans-serif", fontWeight: 700 }}
                      >
                        {participant.name}
                      </span>
                    </div>
                    <span
                      className="text-black text-[16px] leading-[1.22] font-bold opacity-80"
                      style={{ fontFamily: "Helvetica Neue, sans-serif", fontWeight: 700 }}
                    >
                      $ {amount.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 bg-white border-[2px] border-[#ECECEC] rounded-[30px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar name="You" size="sm" />
                  <span
                    className="text-black text-[16px] leading-[1.22] font-bold"
                    style={{ fontFamily: "Helvetica Neue, sans-serif", fontWeight: 700 }}
                  >
                    You
                  </span>
                </div>
                <span
                  className="text-black text-[16px] leading-[1.22] font-bold opacity-80"
                  style={{ fontFamily: "Helvetica Neue, sans-serif", fontWeight: 700 }}
                >
                  $ {orderData.total.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Payment Section */}
        <div className="mb-6 relative p-4 bg-[#E8E8E8] border-[2px] border-[#707070] rounded-[20px]">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              <div className="relative w-[42px] h-[42px] shrink-0">
                <div className="absolute inset-0 bg-[#F0F0F0] rounded-full shadow-[2px_2px_5px_rgba(0,0,0,0.2)]"></div>
                <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl">
                  💸
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4
                    className="text-black text-[20px] leading-[1.22] font-medium"
                    style={{ fontFamily: "Helvetica Neue, sans-serif", fontWeight: 500 }}
                  >
                    Pay now
                  </h4>
                  <span
                    className="text-black text-[20px] leading-[1.22] font-bold opacity-80"
                    style={{ fontFamily: "Helvetica Neue, sans-serif", fontWeight: 700 }}
                  >
                    $ {userAmount.toFixed(2)}
                  </span>
                </div>
                <p
                  className="text-black text-[11px] leading-[1.45] opacity-50"
                  style={{ fontFamily: "Helvetica Neue, sans-serif" }}
                >
                  Description short or a long one description or a place to add branded images
                </p>
              </div>
            </div>
            <button
              onClick={handlePayNow}
              disabled={isProcessingPayment}
              className="px-4 py-2 bg-black text-white rounded-[10px] hover:bg-gray-900 active:scale-95 transition-all shrink-0 ml-4"
            >
              <span
                className="text-white text-[16px] leading-[1.22] font-medium"
                style={{ fontFamily: "Helvetica Neue, sans-serif", fontWeight: 500 }}
              >
                {isProcessingPayment ? "Processing..." : "Pay now"}
              </span>
            </button>
          </div>
        </div>

        {/* Order More Food Section */}
        <div className="p-4 bg-[#E8E8E8] border-[2px] border-[#707070] rounded-[10px]">
          <h4
            className="text-black text-[20px] leading-[1.22] font-bold mb-2 opacity-80 text-center"
            style={{ fontFamily: "Helvetica Neue, sans-serif", fontWeight: 700 }}
          >
            Order more food?
          </h4>
          <p
            className="text-black text-[12px] leading-[1.5] opacity-50 text-center mb-4"
            style={{ fontFamily: "Helvetica Neue, sans-serif" }}
          >
            Description short or a long one description or a place to add branded images
          </p>
          <div className="flex gap-2 justify-center mb-4">
            <div className="w-[38px] h-[68px] bg-white border-[2px] border-[#EDEDED] rounded-[6px]"></div>
            <div className="w-[38px] h-[68px] bg-white border-[2px] border-[#EDEDED] rounded-[6px]"></div>
          </div>
          <button
            onClick={() => router.push("/menu")}
            className="w-full py-2 bg-white border-[2px] border-[#EDEDED] rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span
              className="text-black text-[14px] leading-[1.2] font-medium"
              style={{ fontFamily: "Lato, sans-serif", fontWeight: 500 }}
            >
              Back to Menu
            </span>
          </button>
        </div>
      </div>

      {/* Split Settings Modal */}
      {isSplitModalOpen && (
        <SplitSettingsModal
          isOpen={isSplitModalOpen}
          onClose={() => setIsSplitModalOpen(false)}
        />
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onStartNewOrder={handleStartNewOrder}
        amount={userAmount}
      />
    </div>
  );
}

