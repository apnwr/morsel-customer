'use client';

import { Suspense, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRequireRestaurantContext } from '@/hooks/useNavigationGuard';
import { useSessionValidation } from '@/hooks/useSessionValidation';
import { useSession } from '@/contexts/SessionContext';
import { getFromStorage } from '@/mocks/mockStorage';
import { PeachCheckoutView } from '@/components/payment/PeachCheckoutView';
import OrdersLoading from '../orders/loading';

export const dynamic = 'force-dynamic';

function PaymentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantContext = useRequireRestaurantContext();
  useSessionValidation();
  const { sessionData, splitPaymentStatus } = useSession();

  const sessionId = sessionData?.session?.id;
  const currentSessionUserId = getFromStorage<string>('morsel_session_user_id') || undefined;

  const amount = useMemo(() => {
    const raw = searchParams.get('amount');
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [searchParams]);

  const tipAmount = useMemo(() => {
    const raw = searchParams.get('tip');
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [searchParams]);

  const splitIdentifier = useMemo(() => {
    if (!splitPaymentStatus || !currentSessionUserId) return undefined;
    const entry = splitPaymentStatus.find((s) => s.sessionUserId === currentSessionUserId);
    return entry ? String(entry.index) : undefined;
  }, [splitPaymentStatus, currentSessionUserId]);

  // Redirect if we don't have what we need to charge
  useEffect(() => {
    if (!sessionId || amount <= 0) {
      router.replace('/orders');
    }
  }, [sessionId, amount, router]);

  const handleResult = useCallback(
    (result: 'success' | 'failure') => {
      const params = new URLSearchParams({
        paymentResult: result,
        amount: String(amount),
        tip: String(tipAmount),
      });
      router.replace(`/orders?${params.toString()}`);
    },
    [router, amount, tipAmount]
  );

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  if (!restaurantContext || !restaurantContext.restaurant) {
    return null;
  }

  if (!sessionId || amount <= 0) {
    return <OrdersLoading />;
  }

  return (
    <PeachCheckoutView
      onPaymentResult={handleResult}
      onBack={handleBack}
      sessionId={sessionId}
      sessionUserId={currentSessionUserId}
      splitIdentifier={splitIdentifier}
      amount={amount}
    />
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<OrdersLoading />}>
      <PaymentPageContent />
    </Suspense>
  );
}
