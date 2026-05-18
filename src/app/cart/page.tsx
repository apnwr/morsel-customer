"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { useRequireRestaurantContext } from "@/hooks/useNavigationGuard";
import { useSessionValidation } from "@/hooks/useSessionValidation";
import { useCartPageState } from "@/hooks/useCartPageState";
import { Header } from "@/components/layout/Header";
import { PreOrderView } from "@/components/cart/PreOrderView";
import { EmptyState } from "@/components/ui/EmptyState";
import { Footer } from "@/components/layout/Footer";
import CartLoading from "./loading";

export const dynamic = 'force-dynamic';

function CartPageContent() {
  const router = useRouter();
  const restaurantContext = useRequireRestaurantContext();
  useSessionValidation();

  const {
    cartItemsCount,
    allOrderIds,
    isConfirming,
    handlePlaceOrder,
  } = useCartPageState();

  if (!restaurantContext || !restaurantContext.restaurant) {
    return null;
  }

  const hasPlacedOrders = allOrderIds.length > 0;
  const showEmptyState = cartItemsCount === 0 && !isConfirming;

  return (
    <div className="min-h-screen bg-[#F7F8F8] overflow-x-hidden">
      <Header
        showTimer={false}
        showCart={true}
        showFilters={false}
        onRightIconClick={() => router.push("/menu")}
      />

      {/* Banner: link to /orders when placed orders exist */}
      {hasPlacedOrders && (
        <button
          type="button"
          onClick={() => router.push('/orders')}
          className="w-full h-[44px] flex items-center justify-center bg-brand text-white text-sm font-bold"
          style={{ fontFamily: 'Lato, sans-serif', lineHeight: 1 }}
        >
          View Ordered Items &rarr;
        </button>
      )}

      {showEmptyState ? (
        <div className="flex items-center justify-center min-h-[calc(100vh-120px)] px-4">
          <EmptyState
            icon="🛒"
            title="Your cart is empty"
            description="Add items from the menu to get started"
            actionLabel="Browse Menu"
            onAction={() => router.push("/menu")}
          />
        </div>
      ) : (
        <PreOrderView
          onPlaceOrder={handlePlaceOrder}
          isPlacingOrder={isConfirming}
        />
      )}

      <Footer />
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={<CartLoading />}>
      <CartPageContent />
    </Suspense>
  );
}
