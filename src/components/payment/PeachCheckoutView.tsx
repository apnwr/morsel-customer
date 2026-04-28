'use client';

import { useEffect, useRef } from 'react';
import { X, AlertCircle, Loader2, CheckCircle, Clock, ChevronLeft } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { usePeachCheckout } from '@/hooks/usePeachCheckout';
import { CheckoutSkeleton } from './CheckoutSkeleton';
import type { PeachCheckoutStatus } from '@/types/api/payment';

interface PeachCheckoutViewProps {
  onPaymentResult: (result: 'success' | 'failure', transactionId?: string) => void;
  onBack: () => void;
  sessionId: string;
  sessionUserId?: string;
  splitIdentifier?: string;
  splitId?: string;
  amount: number;
}

const RETRY_STATES: PeachCheckoutStatus[] = ['failed', 'cancelled', 'expired', 'error'];
const LOADING_STATES: PeachCheckoutStatus[] = ['creating', 'loading-sdk'];
const BLOCKING_STATES: PeachCheckoutStatus[] = ['creating', 'loading-sdk', 'verifying', 'success'];

export function PeachCheckoutView({
  onPaymentResult,
  onBack,
  sessionId,
  sessionUserId,
  splitIdentifier,
  splitId,
  amount,
}: PeachCheckoutViewProps) {
  const { formatPrice } = useLocale();
  const hasStartedRef = useRef(false);

  const {
    state,
    startCheckout,
    retry,
    containerRef,
  } = usePeachCheckout({
    sessionId,
    sessionUserId,
    splitIdentifier,
    splitId,
    onSuccess: (transactionId) => {
      setTimeout(() => {
        onPaymentResult('success', transactionId);
      }, 1200);
    },
    onFailure: () => {
      // User can retry on the page
    },
  });

  useEffect(() => {
    if (state.status === 'idle' && !hasStartedRef.current) {
      hasStartedRef.current = true;
      startCheckout();
    }
  }, [state.status, startCheckout]);

  // Block browser navigation while payment is in-flight
  useEffect(() => {
    if (!BLOCKING_STATES.includes(state.status)) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state.status]);

  const showRetry = RETRY_STATES.includes(state.status);
  const showSkeleton = LOADING_STATES.includes(state.status);
  const showWidget = state.status === 'ready' || state.status === 'rendered';
  const showVerifying = state.status === 'verifying';
  const showSuccess = state.status === 'success';
  const canGoBack = !BLOCKING_STATES.includes(state.status);

  const getLoadingMessage = () => {
    if (state.status === 'creating') return 'Preparing checkout...';
    if (state.status === 'loading-sdk') return 'Loading payment form...';
    return undefined;
  };

  const getErrorConfig = () => {
    switch (state.status) {
      case 'failed':
        return {
          icon: <AlertCircle className="w-10 h-10 text-red-500" />,
          title: 'Payment Failed',
          message: state.error || 'Your payment could not be processed. Please try again.',
        };
      case 'cancelled':
        return {
          icon: <X className="w-10 h-10 text-gray-500" />,
          title: 'Payment Cancelled',
          message: 'You cancelled the payment. Tap below to try again.',
        };
      case 'expired':
        return {
          icon: <Clock className="w-10 h-10 text-amber-500" />,
          title: 'Checkout Expired',
          message: 'The checkout session timed out. Please try again.',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-10 h-10 text-red-500" />,
          title: 'Something Went Wrong',
          message: state.error || 'An unexpected error occurred. Please try again.',
        };
      default:
        return null;
    }
  };

  return (
    // h-dvh (not min-h-dvh) so the height chain is *definite* — the embedded
    // Peach widget's `height: inherit` / `height: 100%` rely on every ancestor
    // resolving to a real pixel height. With min-h-dvh, percentage heights
    // collapse and the widget defaults to its 360px min-height floor.
    <div className="h-dvh bg-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={canGoBack ? onBack : undefined}
            disabled={!canGoBack}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 active:opacity-80 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Back"
          >
            <ChevronLeft className="w-6 h-6 text-black" strokeWidth={2.5} />
          </button>
          <div className="flex-1">
            <h1
              className="text-lg font-bold text-black"
              style={{ fontFamily: 'Helvetica Neue, sans-serif' }}
            >
              Payment
            </h1>
            <p className="text-sm text-gray-500">{formatPrice(amount)}</p>
          </div>
        </div>
      </div>

      {/* Content — stretches to fill remaining viewport */}
      <div className="flex-1 flex flex-col max-w-2xl w-full mx-auto">
        {showSkeleton && <CheckoutSkeleton message={getLoadingMessage()} />}

        {(showWidget || showVerifying) && (
          <div className="relative flex-1 flex flex-col">
            <div
              ref={containerRef}
              id="peach-checkout-container"
              className="flex-1 w-full"
            />
            {showVerifying && (
              <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-black animate-spin" />
                <p
                  className="text-sm font-medium text-gray-700"
                  style={{ fontFamily: 'Helvetica Neue, sans-serif' }}
                >
                  Processing payment...
                </p>
              </div>
            )}
          </div>
        )}

        {showSuccess && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h3
              className="text-xl font-bold text-black"
              style={{ fontFamily: 'Helvetica Neue, sans-serif' }}
            >
              Payment Successful
            </h3>
            <p className="text-sm text-gray-500">{formatPrice(amount)} paid</p>
          </div>
        )}

        {showRetry && (() => {
          const cfg = getErrorConfig();
          if (!cfg) return null;
          return (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
              {cfg.icon}
              <h3
                className="text-xl font-bold text-black"
                style={{ fontFamily: 'Helvetica Neue, sans-serif' }}
              >
                {cfg.title}
              </h3>
              <p className="text-sm text-gray-500 text-center max-w-xs">{cfg.message}</p>
              <button
                onClick={retry}
                className="mt-4 h-12 px-10 min-w-[240px] bg-black text-white rounded-xl font-bold text-base transition-all active:scale-95"
                style={{ fontFamily: 'Helvetica Neue, sans-serif' }}
              >
                Try Again
              </button>
              <button
                onClick={onBack}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
