"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

function OrdersPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantContext = useRequireRestaurantContext();
  useSessionValidation();
  const { endSession } = useSession();

  // Hydrate payment result from query on first render; useSearchParams on /orders is read-only here
  const [paymentResult, setPaymentResult] = useState<'success' | 'failure' | null>(() => {
    const r = searchParams.get('paymentResult');
    return r === 'success' || r === 'failure' ? r : null;
  });
  const paymentAmount = useMemo(() => {
    const n = Number(searchParams.get('amount') || 0);
    return Number.isFinite(n) ? n : 0;
  }, [searchParams]);
  const paymentTip = useMemo(() => {
    const n = Number(searchParams.get('tip') || 0);
    return Number.isFinite(n) ? n : 0;
  }, [searchParams]);

  const {
    orderData,
    bill,
    allOrderIds,
    isLoading,
  } = useOrdersPageState();

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
  return null
}

export default OrdersPaymentPage