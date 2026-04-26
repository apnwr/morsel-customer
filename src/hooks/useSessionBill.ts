'use client';

/**
 * useSessionBill — shared bill access for components that want the current
 * session's bill without managing their own fetch.
 *
 * Backed by `lib/bill-cache.ts`. Concurrent consumers share a single Promise;
 * resolved values are reused until the order list changes. The polling
 * consumer (`useOrdersPageState`) keeps the cache warm with periodic
 * fetches, so a fresh bill propagates to all hook consumers automatically.
 *
 * Implemented with `useSyncExternalStore` so we read the cache as derived
 * state — no setState-in-effect, no cascading renders.
 */

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useSession } from '@/contexts/SessionContext';
import type { SessionBill } from '@/types/api/bill';
import {
  deriveBillCacheKey,
  getCachedBill,
  peekCachedBill,
  subscribeToBillCache,
} from '@/lib/bill-cache';

interface UseSessionBillResult {
  bill: SessionBill | null;
  isLoading: boolean;
}

export function useSessionBill(): UseSessionBillResult {
  const { sessionData } = useSession();
  const sessionId = sessionData?.session?.id ?? null;

  // Derived from orders only. Tip-driven bill changes are picked up via the
  // polling consumer's `setCachedBill` writes — no second fetch on this hook.
  const cacheKey = useMemo(
    () => deriveBillCacheKey(sessionData?.session?.orders),
    [sessionData?.session?.orders],
  );

  // Read the cache as an external store. Re-renders when the cache is
  // mutated (fetch resolves / setCachedBill called / invalidated).
  const subscribe = useCallback(
    (onChange: () => void) => subscribeToBillCache(onChange),
    [],
  );
  const getSnapshot = useCallback(
    () => (sessionId ? peekCachedBill(sessionId, cacheKey) : null),
    [sessionId, cacheKey],
  );
  const bill = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Kick off a fetch on cache miss. The fetch writes to the cache on
  // resolution, which triggers a re-render via the subscribe path above.
  useEffect(() => {
    if (!sessionId) return;
    if (peekCachedBill(sessionId, cacheKey) !== null) return;
    getCachedBill(sessionId, cacheKey);
  }, [sessionId, cacheKey]);

  // We're "loading" only when there's a session, no cached bill, and a
  // fetch was kicked off. The hook surfaces this so callers can show a
  // skeleton if they want; reading `bill === null` alone would conflate
  // "no session" with "still loading".
  const isLoading = sessionId !== null && bill === null;

  return { bill, isLoading };
}
