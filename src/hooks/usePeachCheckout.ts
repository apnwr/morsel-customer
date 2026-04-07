'use client';

/**
 * usePeachCheckout Hook
 * State machine managing the full Peach Payments embedded checkout lifecycle.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { loadSDK } from '@/lib/peach-payments/sdk-loader';
import { config } from '@/lib/config';
import { paymentService } from '@/services/payment.service';
import type { PeachCheckoutState, PeachCheckoutStatus } from '@/types/api/payment';
import type { PeachCheckoutInstance, PeachCompletedEventData } from '@/lib/peach-payments/types';

interface UsePeachCheckoutOptions {
  sessionId: string;
  sessionUserId?: string;
  splitIdentifier?: string;
  splitId?: string;
  onSuccess?: (transactionId: string) => void;
  onFailure?: (error: string) => void;
}

interface UsePeachCheckoutReturn {
  state: PeachCheckoutState;
  startCheckout: () => Promise<void>;
  retry: () => Promise<void>;
  containerRef: React.RefCallback<HTMLDivElement>;
  isWidgetMounted: boolean;
}

const INITIAL_STATE: PeachCheckoutState = {
  status: 'idle',
  checkoutId: null,
  transactionId: null,
  error: null,
};

export function usePeachCheckout({
  sessionId,
  sessionUserId,
  splitIdentifier,
  splitId,
  onSuccess,
  onFailure,
}: UsePeachCheckoutOptions): UsePeachCheckoutReturn {
  const [state, setState] = useState<PeachCheckoutState>(INITIAL_STATE);
  const instanceRef = useRef<PeachCheckoutInstance | null>(null);
  const [isWidgetMounted, setIsWidgetMounted] = useState(false);
  const containerElRef = useRef<HTMLDivElement | null>(null);

  // Store latest callbacks in refs to avoid stale closures
  const onSuccessRef = useRef(onSuccess);
  const onFailureRef = useRef(onFailure);
  onSuccessRef.current = onSuccess;
  onFailureRef.current = onFailure;

  // Store checkout data in refs for use in SDK callbacks (avoids stale closure)
  const checkoutDataRef = useRef<{ checkoutId: string; transactionId: string; entityId?: string } | null>(null);

  const setStatus = useCallback((status: PeachCheckoutStatus, error?: string) => {
    setState(prev => ({ ...prev, status, error: error ?? null }));
  }, []);

  const unmountWidget = useCallback(() => {
    if (instanceRef.current) {
      try {
        instanceRef.current.unmount();
      } catch {
        // Widget may already be unmounted
      }
      instanceRef.current = null;
    }
    setIsWidgetMounted(false);
  }, []);

  const renderWidget = useCallback((element: HTMLDivElement, checkoutId: string) => {
    if (!window.Checkout) {
      setStatus('error', 'Payment SDK not available');
      return;
    }

    try {
      // Use entityId from API response (per-business), fall back to global config (dev/testing)
      const entityKey = checkoutDataRef.current?.entityId || config.peachPayments.entityKey || undefined;

      const instance = window.Checkout.initiate({
        checkoutId,
        key: entityKey,
        eventHandlers: {
          onCompleted: async (_event: PeachCompletedEventData) => {
            setStatus('verifying');
            try {
              const data = checkoutDataRef.current;
              if (!data) throw new Error('Missing checkout data');

              const result = await paymentService.verifyPayment({
                checkoutId: data.checkoutId,
                transactionId: data.transactionId,
                sessionUserId,
                splitId,
              });

              if (result.success && result.status === 'success') {
                setState({
                  status: 'success',
                  checkoutId: data.checkoutId,
                  transactionId: result.transactionId,
                  error: null,
                });
                onSuccessRef.current?.(result.transactionId);
              } else {
                setStatus('failed', 'Payment verification failed');
                onFailureRef.current?.('Payment verification failed');
              }
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Verification failed';
              setStatus('error', message);
              onFailureRef.current?.(message);
            }
          },
          onCancelled: () => {
            setStatus('cancelled');
          },
          onExpired: () => {
            setStatus('expired', 'Checkout session expired');
          },
          onError: (event) => {
            const message = event?.result?.description || 'Payment failed';
            setStatus('failed', message);
            onFailureRef.current?.(message);
          },
        },
        customisations: {
          showCancelButton: true,
          showAmountField: true,
          theme: {
            brand: { primary: '#000000' },
          },
          card: {
            submitButtonText: 'Pay Now',
          },
        },
      });

      instance.render(element);
      instanceRef.current = instance;
      setIsWidgetMounted(true);
      setStatus('rendered');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to render checkout';
      setStatus('error', message);
    }
  }, [sessionUserId, splitId, setStatus]);

  const startCheckout = useCallback(async () => {
    setStatus('creating');

    try {
      // Fire API call and SDK load in parallel
      const [checkoutResponse] = await Promise.all([
        paymentService.createEmbeddedCheckout({
          sessionId,
          sessionUserId,
          splitIdentifier,
        }),
        loadSDK(),
      ]);

      const { checkout, transactionId } = checkoutResponse;

      // Store in refs for SDK callbacks
      checkoutDataRef.current = {
        checkoutId: checkout.checkoutId,
        transactionId,
        entityId: checkout.entityId,
      };

      setState({
        status: 'ready',
        checkoutId: checkout.checkoutId,
        transactionId,
        error: null,
      });

      // If container is already mounted, render immediately
      if (containerElRef.current) {
        renderWidget(containerElRef.current, checkout.checkoutId);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create checkout';
      setStatus('error', message);
    }
  }, [sessionId, sessionUserId, splitIdentifier, setStatus, renderWidget]);

  const retry = useCallback(async () => {
    unmountWidget();
    checkoutDataRef.current = null;
    setState(INITIAL_STATE);
    // startCheckout will be called by the useEffect that watches isOpen,
    // or the component can call it directly
    await startCheckout();
  }, [unmountWidget, startCheckout]);

  // Ref callback — when DOM element mounts AND state is ready, render the widget
  const containerRef = useCallback(
    (element: HTMLDivElement | null) => {
      containerElRef.current = element;
      if (element && state.status === 'ready' && state.checkoutId && !isWidgetMounted) {
        renderWidget(element, state.checkoutId);
      }
    },
    [state.status, state.checkoutId, isWidgetMounted, renderWidget]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unmountWidget();
    };
  }, [unmountWidget]);

  return {
    state,
    startCheckout,
    retry,
    containerRef,
    isWidgetMounted,
  };
}
