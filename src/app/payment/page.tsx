'use client';

import { Suspense, useEffect, useMemo, useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { useRequireRestaurantContext } from '@/hooks/useNavigationGuard';
import { useSessionValidation } from '@/hooks/useSessionValidation';
import { useSession } from '@/contexts/SessionContext';
import { useLocale } from '@/contexts/LocaleContext';
import { getFromStorage } from '@/mocks/mockStorage';
import { STORAGE_KEYS } from '@/lib/storage-keys';
import { PeachCheckoutView } from '@/components/payment/PeachCheckoutView';
import OrdersLoading from '../orders/loading';

export const dynamic = 'force-dynamic';

function PaymentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantContext = useRequireRestaurantContext();
  useSessionValidation();
  const { sessionData, splitPaymentStatus, refreshSessionData } = useSession();
  const { formatPrice } = useLocale();

  const sessionId = sessionData?.session?.id;
  const participants = sessionData?.session?.participants;
  console.log("participants", participants)
  const currentSessionUserId = getFromStorage<string>(STORAGE_KEYS.SESSION_USER_ID) || undefined;

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

  // Locate the current user's server-side split once. Used for:
  //  - splitIdentifier on create-checkout: keep the legacy index-string semantic
  //    that the existing payment-intent backend expects.
  //  - splitId on verify-payment: pass the server UUID when present so the
  //    backend can mark the correct entry paid (additive, optional).
  const myServerSplit = useMemo(() => {
    if (!splitPaymentStatus || !currentSessionUserId) return null;
    return splitPaymentStatus.find((s) => s.sessionUserId === currentSessionUserId) ?? null;
  }, [splitPaymentStatus, currentSessionUserId]);

  const participantsIndex = useMemo(() => {
    if (!participants || !currentSessionUserId) return undefined;
    return participants.findIndex((p) => p.sessionUserId === currentSessionUserId);
  }, [participants, currentSessionUserId]);

  const currentUserSplitId = useMemo(() => {
    if (!splitPaymentStatus || participantsIndex === null) return undefined;
    return splitPaymentStatus.find((s) => s.index === participantsIndex)?.splitId || undefined;
  }, [splitPaymentStatus, participantsIndex]);

  const splitIdentifier = useMemo(() => {
    if (!myServerSplit) return undefined;
    return String(myServerSplit.index);
  }, [myServerSplit]);
  console.log("splitPaymentStatus", splitPaymentStatus, currentSessionUserId)
  const splitId = myServerSplit?.splitId;

  // Refresh once on mount so we have the freshest splitPaymentStatus before creating
  // checkout. Wait for the refresh to resolve before flipping hasRefreshed — otherwise
  // the amount-mismatch guard runs against stale state and can flash a false positive.
  const [hasRefreshed, setHasRefreshed] = useState(false);
  useEffect(() => {
    if (hasRefreshed) return;
    let cancelled = false;
    refreshSessionData().finally(() => {
      if (!cancelled) setHasRefreshed(true);
    });
    return () => { cancelled = true; };
  }, [hasRefreshed, refreshSessionData]);

  // Server-authoritative share amount (without tip). If present, validate against the
  // query param so we don't charge the user a stale amount after a concurrent split change.
  const serverShare = useMemo(() => {
    if (!myServerSplit) return null;
    return typeof myServerSplit.amount === 'number' ? myServerSplit.amount : null;
  }, [myServerSplit]);

  const expectedShare = Math.round((amount - tipAmount) * 100) / 100;
  const amountMismatch =
    hasRefreshed &&
    serverShare != null &&
    Math.abs(expectedShare - serverShare) > 0.01;

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

  const handleAcceptNewAmount = useCallback(() => {
    if (serverShare == null) return;
    const updated = Math.round((serverShare + tipAmount) * 100) / 100;
    const params = new URLSearchParams({
      amount: String(updated),
      tip: String(tipAmount),
    });
    router.replace(`/payment?${params.toString()}`);
  }, [router, serverShare, tipAmount]);

  if (!restaurantContext || !restaurantContext.restaurant) {
    return null;
  }

  if (!sessionId || amount <= 0) {
    return <OrdersLoading />;
  }

  if (amountMismatch && serverShare != null) {
    const newTotal = Math.round((serverShare + tipAmount) * 100) / 100;
    return (
      <div className="min-h-dvh bg-white flex flex-col items-center justify-center px-6 gap-4">
        <AlertCircle className="w-10 h-10 text-orange-500" />
        <h1
          className="text-xl font-bold text-black text-center"
          style={{ fontFamily: 'Helvetica Neue, sans-serif' }}
        >
          Split changed
        </h1>
        <p className="text-sm text-gray-600 text-center max-w-xs">
          Your share has been updated to <span className="font-bold">{formatPrice(newTotal)}</span>.
          Review before continuing.
        </p>
        <button
          onClick={handleAcceptNewAmount}
          className="mt-2 h-12 px-10 min-w-[240px] bg-black text-white rounded-xl font-bold text-base active:scale-95 transition-transform"
          style={{ fontFamily: 'Helvetica Neue, sans-serif' }}
        >
          Continue with {formatPrice(newTotal)}
        </button>
        <button
          onClick={() => router.replace('/orders')}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Back to order
        </button>
      </div>
    );
  }

  return (
    <PeachCheckoutView
      onPaymentResult={handleResult}
      onBack={handleBack}
      sessionId={sessionId}
      sessionUserId={currentSessionUserId}
      splitIdentifier={String(participantsIndex)}
      splitId={currentUserSplitId}
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
