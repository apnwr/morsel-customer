import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/contexts/SessionContext';

/**
 * Hook for validating session status and expiry on protected pages
 *
 * Features:
 * - Validates session on mount
 * - Periodic validation every 30 seconds (configurable)
 * - Validates on window focus (when user returns to tab)
 * - Automatic redirect to login if session is invalid/expired
 * - Performance optimized with caching and intervals
 *
 * @param options.checkInterval - Interval in ms for periodic checks (default: 30000ms / 30s)
 * @param options.redirectTo - Path to redirect to if session invalid (default: '/login')
 * @param options.onSessionInvalid - Optional callback when session becomes invalid
 */
export function useSessionValidation(options?: {
  checkInterval?: number;
  redirectTo?: string;
  onSessionInvalid?: (reason: string) => void;
}) {
  const router = useRouter();
  const { validateSession, endSession, isLoading } = useSession();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckRef = useRef<number>(0);

  const checkInterval = options?.checkInterval || 30000; // 30 seconds
  const redirectTo = options?.redirectTo || '/login';
  const MIN_CHECK_GAP = 5000; // Minimum 5 seconds between checks for performance

  // Validation function with performance optimization
  const performValidation = useCallback(async () => {
    // Skip if loading
    if (isLoading) return;

    // Performance: Skip if last check was too recent (within MIN_CHECK_GAP)
    const now = Date.now();
    if (now - lastCheckRef.current < MIN_CHECK_GAP) {
      return;
    }

    lastCheckRef.current = now;

    // Validate session
    const validation = validateSession();

    if (!validation.isValid) {
      console.log('[Session Validation] Session invalid:', validation.reason);

      // Call optional callback
      if (options?.onSessionInvalid) {
        options.onSessionInvalid(validation.reason || 'unknown');
      }

      // End session with appropriate reason
      // If session expired, use 'timeout' reason
      // Otherwise use 'cancelled' for other invalid states
      const endReason = validation.reason === 'session_expired' ? 'timeout' : 'cancelled';
      await endSession(endReason);

      // Redirect to login
      router.push(redirectTo);
    }
  }, [validateSession, endSession, router, redirectTo, isLoading, options]);

  // Initial validation on mount
  useEffect(() => {
    if (!isLoading) {
      performValidation();
    }
  }, [isLoading, performValidation]);

  // Set up periodic validation
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up new interval
    intervalRef.current = setInterval(() => {
      performValidation();
    }, checkInterval);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkInterval, performValidation]);

  // Validate on window focus (user returns to tab)
  useEffect(() => {
    const handleFocus = () => {
      performValidation();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [performValidation]);

  // Return validation function for manual checks if needed
  return { validateSession: performValidation };
}
