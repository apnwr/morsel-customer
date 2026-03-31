"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRequireRestaurantContext } from "@/hooks/useNavigationGuard";
import { useSessionValidation } from "@/hooks/useSessionValidation";
import { useOrdersPageState } from "@/hooks/useOrdersPageState";
import { Header } from "@/components/layout/Header";
import { PostOrderView } from "@/components/order/PostOrderView";
import { Footer } from "@/components/layout/Footer";
import OrdersLoading from "./loading";

export const dynamic = 'force-dynamic';

function OrdersPageContent() {
  const router = useRouter();
  const restaurantContext = useRequireRestaurantContext();
  useSessionValidation();

  const {
    orderData,
    bill,
    orderDisplayLabel,
    allOrderIds,
    isLoading,
    handleOrderMoreFood,
  } = useOrdersPageState();

  // Redirect to /cart if no orders exist
  useEffect(() => {
    if (!isLoading && allOrderIds.length === 0) {
      router.replace('/cart');
    }
  }, [isLoading, allOrderIds.length, router]);

  if (!restaurantContext || !restaurantContext.restaurant) {
    return null;
  }

  // Still loading or about to redirect
  if (isLoading || allOrderIds.length === 0) {
    return <OrdersLoading />;
  }

  return (
    <div className="min-h-screen bg-[#F7F8F8] overflow-x-hidden">
      <Header
        showTimer={false}
        showCart={false}
        showFilters={false}
        onRightIconClick={() => router.push("/menu")}
        centerLabel="Order Placed"
      />

      {orderData ? (
        <PostOrderView
          key={orderData.id}
          orderId={orderData.id}
          orderData={orderData}
          bill={bill}
          onOrderMoreFood={handleOrderMoreFood}
        />
      ) : (
        <OrdersLoading />
      )}

      <Footer />
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersLoading />}>
      <OrdersPageContent />
    </Suspense>
  );
}
