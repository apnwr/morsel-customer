'use client';

/**
 * PeachCheckoutModal
 * Bottom-sheet modal rendering the Peach Payments embedded checkout widget.
 * Standalone — will be plugged into PostOrderView later.
 */

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Loader2, CheckCircle, Clock } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { usePeachCheckout } from '@/hooks/usePeachCheckout';
import { CheckoutSkeleton } from './CheckoutSkeleton';
import { modalVariants, backdropVariants } from '@/lib/animations';
import type { PeachCheckoutStatus } from '@/types/api/payment';

interface PeachCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentResult: (result: 'success' | 'failure', transactionId?: string) => void;
  sessionId: string;
  sessionUserId?: string;
  splitIdentifier?: string;
  splitId?: string;
  amount: number;
}

// States where closing the modal is safe
const CLOSABLE_STATES: PeachCheckoutStatus[] = [
  'idle', 'ready', 'rendered', 'failed', 'cancelled', 'expired', 'error',
];

// States that show the retry button
const RETRY_STATES: PeachCheckoutStatus[] = ['failed', 'cancelled', 'expired', 'error'];

// States that show the skeleton loader
const LOADING_STATES: PeachCheckoutStatus[] = ['creating', 'loading-sdk'];

export function PeachCheckoutModal({
  isOpen,
  onClose,
  onPaymentResult,
  sessionId,
  sessionUserId,
  splitIdentifier,
  splitId,
  amount,
}: PeachCheckoutModalProps) {
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
      // Brief delay so user sees the success state before modal transitions
      setTimeout(() => {
        onPaymentResult('success', transactionId);
      }, 1200);
    },
    onFailure: () => {
      // Don't auto-close on failure — user can retry
    },
  });

  // Auto-start checkout when modal opens
  useEffect(() => {
    if (isOpen && state.status === 'idle' && !hasStartedRef.current) {
      hasStartedRef.current = true;
      startCheckout();
    }
    if (!isOpen) {
      hasStartedRef.current = false;
    }
  }, [isOpen, state.status, startCheckout]);

  const canClose = CLOSABLE_STATES.includes(state.status);
  const showRetry = RETRY_STATES.includes(state.status);
  const showSkeleton = LOADING_STATES.includes(state.status);
  const showWidget = state.status === 'ready' || state.status === 'rendered';
  const showVerifying = state.status === 'verifying';
  const showSuccess = state.status === 'success';

  const handleClose = () => {
    if (canClose) onClose();
  };

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
    <AnimatePresence>
      {isOpen && (
        <div key="peach-checkout-modal" className="fixed inset-0 z-50 flex items-end">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50"
            onClick={handleClose}
            aria-hidden="true"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          />

          {/* Modal — bottom sheet */}
          <motion.div
            className="relative w-full bg-white rounded-t-3xl shadow-xl max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white rounded-t-3xl border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h2
                  className="text-lg font-bold text-black"
                  style={{ fontFamily: 'Helvetica Neue, sans-serif' }}
                >
                  Payment
                </h2>
                <p className="text-sm text-gray-500">{formatPrice(amount)}</p>
              </div>
              {canClose && (
                <button
                  onClick={handleClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              )}
            </div>

            {/* Content area */}
            <div className="min-h-[400px]">
              {/* Loading skeleton */}
              {showSkeleton && (
                <CheckoutSkeleton message={getLoadingMessage()} />
              )}

              {/* Peach widget container */}
              {(showWidget || showVerifying) && (
                <div className="relative">
                  <div ref={containerRef} id="peach-checkout-container" className="min-h-[400px]" />

                  {/* Verifying overlay */}
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

              {/* Success state */}
              {showSuccess && (
                <div className="flex flex-col items-center justify-center gap-4 py-16 px-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h3
                    className="text-xl font-bold text-black"
                    style={{ fontFamily: 'Helvetica Neue, sans-serif' }}
                  >
                    Payment Successful
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatPrice(amount)} paid
                  </p>
                </div>
              )}

              {/* Error / Retry states */}
              {showRetry && (() => {
                const cfg = getErrorConfig();
                if (!cfg) return null;
                return (
                  <div className="flex flex-col items-center justify-center gap-4 py-16 px-6">
                    {cfg.icon}
                    <h3
                      className="text-xl font-bold text-black"
                      style={{ fontFamily: 'Helvetica Neue, sans-serif' }}
                    >
                      {cfg.title}
                    </h3>
                    <p className="text-sm text-gray-500 text-center max-w-xs">
                      {cfg.message}
                    </p>
                    <button
                      onClick={retry}
                      className="mt-4 w-full max-w-xs h-12 bg-black text-white rounded-xl font-bold text-base transition-all active:scale-95"
                      style={{ fontFamily: 'Helvetica Neue, sans-serif' }}
                    >
                      Try Again
                    </button>
                    <button
                      onClick={handleClose}
                      className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                );
              })()}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
