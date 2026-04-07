"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useRequireRestaurantContext } from "@/hooks/useNavigationGuard";
import { useSessionValidation } from "@/hooks/useSessionValidation";
import { useOrdersPageState } from "@/hooks/useOrdersPageState";
import { useSession } from "@/contexts/SessionContext";
import { Header } from "@/components/layout/Header";
import { PostOrderView } from "@/components/order/PostOrderView";
import { PaymentResultView } from "@/components/order/PaymentResultView";
import { Footer } from "@/components/layout/Footer";
import OrdersLoading from "./loading";

export const dynamic = 'force-dynamic';

function OrdersPageContent() {
  const router = useRouter();
  const restaurantContext = useRequireRestaurantContext();
  useSessionValidation();
  const { endSession } = useSession();

  const [paymentResult, setPaymentResult] = useState<'success' | 'failure' | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentTip, setPaymentTip] = useState(0);

  const {
    orderData,
    bill,
    orderDisplayLabel,
    allOrderIds,
    isLoading,
    handleOrderMoreFood,
  } = useOrdersPageState();

  const handlePaymentResult = useCallback((result: 'success' | 'failure', amount: number, tipAmount: number) => {
    setPaymentResult(result);
    setPaymentAmount(amount);
    setPaymentTip(tipAmount);
  }, []);

  const handleBackToMenu = useCallback(async () => {
    await endSession('completed');
    router.push('/menu');
  }, [endSession, router]);

  const handleRetryPayment = useCallback(() => {
    setPaymentResult(null);
  }, []);

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

  // Payment result screen replaces everything
  if (paymentResult) {
    return (
      <PaymentResultView
        result={paymentResult}
        amount={paymentAmount}
        bill={bill}
        tipAmount={paymentTip}
        onBackToMenu={handleBackToMenu}
        onRetryPayment={handleRetryPayment}
      />
    );
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
          onPaymentResult={handlePaymentResult}
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
