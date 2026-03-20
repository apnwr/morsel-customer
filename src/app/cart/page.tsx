"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { useRequireRestaurantContext } from "@/hooks/useNavigationGuard";
import { useSessionValidation } from "@/hooks/useSessionValidation";
import { useCartPageState } from "@/hooks/useCartPageState";
import { Header } from "@/components/layout/Header";
import { PreOrderView } from "@/components/cart/PreOrderView";
import { PostOrderView } from "@/components/order/PostOrderView";
import { EmptyState } from "@/components/ui/EmptyState";
import { Footer } from "@/components/layout/Footer";

// Disable static generation since we use search params
export const dynamic = 'force-dynamic';

function CartPageContent() {
  const router = useRouter();

  // Navigation guard - redirect to login if no restaurant context
  const restaurantContext = useRequireRestaurantContext();

  // Session validation - checks session status and expiry
  useSessionValidation();

  // Use unified cart page state hook
  const {
    pageState,
    activeOrderId,
    orderData,
    orderDisplayLabel,
    cartItemsCount,
    tabsToShow,
    isLoading,
    handlePlaceOrder,
    handleOrderMoreFood,
    handleTabSwitch,
  } = useCartPageState();

  // Don't render if no context (will redirect)
  if (!restaurantContext || !restaurantContext.restaurant) {
    return null;
  }

  // Show loading: initial mount, or when fetching an order (e.g. another participant's) by tab
  const showInitialLoading =
    (isLoading && !orderData && cartItemsCount === 0) || (!!activeOrderId && !orderData && isLoading);

  // Empty state - no orders and no cart items (only in pre-order state)
  const showEmptyState = pageState === 'pre-order' && cartItemsCount === 0 && !isLoading;

  return (
    <div className="min-h-screen bg-[#F7F8F8] overflow-x-hidden">
      {/* Header - always mounted, with order tabs when multiple orders exist */}
      <Header
        showTimer={false}
        showCart={true}
        showFilters={false}
        showOrderTabs={tabsToShow.length > 0}
        tabs={tabsToShow}
        activeOrderId={activeOrderId}
        onTabClick={handleTabSwitch}
        onRightIconClick={() => router.push("/menu")}
        centerLabel={pageState === 'post-order' ? orderDisplayLabel ?? undefined : undefined}
      />

      {/* Content area */}
      {showInitialLoading ? (
        <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
          <p>Loading...</p>
        </div>
      ) : showEmptyState ? (
        <div className="flex items-center justify-center min-h-[calc(100vh-120px)] px-4">
          <EmptyState
            icon="🛒"
            title="Your cart is empty"
            description="Add items from the menu to get started"
            actionLabel="Browse Menu"
            onAction={() => router.push("/menu")}
          />
        </div>
      ) : pageState === 'pre-order' ? (
        <PreOrderView
          onPlaceOrder={handlePlaceOrder}
          isPlacingOrder={false}
        />
      ) : orderData ? (
        <PostOrderView
          key={activeOrderId}
          orderId={activeOrderId!}
          orderData={orderData}
          onOrderMoreFood={handleOrderMoreFood}
        />
      ) : null}

      <Footer />
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F7F8F8] flex items-center justify-center">
        <p>Loading...</p>
      </div>
    }>
      <CartPageContent />
    </Suspense>
  );
}
