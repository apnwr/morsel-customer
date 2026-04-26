/**
 * In-memory bill cache shared across components.
 *
 * Why: `billService.getSessionBill` is called from several mount paths
 * (my-tab, picker, orders-page polling, etc.). Without a cache, opening the
 * picker right after viewing orders fires two GETs within seconds for the
 * same data. This module:
 *   - de-dupes concurrent fetches (same sessionId → same Promise)
 *   - serves resolved values when nothing has changed (key-based)
 *   - lets the polling consumer publish fresh data so other consumers see
 *     updates without re-fetching
 *
 * No backend changes — uses what `GET /bill/:sessionId` already returns.
 *
 * Cache lifetime is per-tab (in-memory Map). On full reload the cache
 * resets, which is fine — sessions are short.
 */

import type { SessionBill } from '@/types/api/bill';
import type { SessionOrder } from '@/types/api/session';
import { billService } from '@/services/bill.service';

interface BillCacheEntry {
  /** Derived from orders; cache hits when this matches the requested key. */
  key: string;
  /** In-flight or resolved fetch. Multiple callers await the same Promise. */
  promise: Promise<SessionBill | null>;
  /** Last resolved value; null while fetch is in-flight or after a failure. */
  bill: SessionBill | null;
}

const cache = new Map<string, BillCacheEntry>();

/**
 * Subscribers notified whenever the cache is mutated. Powers
 * `useSyncExternalStore` in `useSessionBill`, so consumers re-render when
 * the polling consumer publishes a fresh bill or when an in-flight fetch
 * resolves.
 */
const subscribers = new Set<() => void>();

function notify(): void {
  subscribers.forEach((cb) => cb());
}

export function subscribeToBillCache(callback: () => void): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

/**
 * Derive a cache key from the session's order list. When the list changes
 * (new order placed, existing modified) the key changes and a fetch fires.
 * Sorted to be order-agnostic.
 */
export function deriveBillCacheKey(
  orders: ReadonlyArray<string | SessionOrder> | undefined,
): string {
  if (!orders || orders.length === 0) return '';
  const ids = orders.map((o) => (typeof o === 'string' ? o : o.orderId));
  return [...ids].sort().join(',');
}

/**
 * Read (or fetch) the bill for a session at the given cache key.
 *
 * - Same `(sessionId, cacheKey)` as a current entry → returns its Promise
 *   (de-dupes concurrent fetches; serves cached resolved value).
 * - Different key → invalidates and kicks off a fresh fetch.
 *
 * Returns `null` on fetch failure; never throws.
 */
export function getCachedBill(
  sessionId: string,
  cacheKey: string,
): Promise<SessionBill | null> {
  const existing = cache.get(sessionId);
  if (existing && existing.key === cacheKey) {
    return existing.promise;
  }
  const promise = billService
    .getSessionBill(sessionId)
    .then((bill) => bill as SessionBill | null)
    .catch((err) => {
      console.error('[bill-cache] fetch failed:', err);
      return null;
    });
  const entry: BillCacheEntry = { key: cacheKey, promise, bill: null };
  cache.set(sessionId, entry);
  promise.then((bill) => {
    if (cache.get(sessionId) === entry) {
      entry.bill = bill;
      notify();
    }
  });
  return promise;
}

/**
 * Publish a freshly-fetched bill into the cache.
 *
 * Used by the polling consumer (`useOrdersPageState`) so its periodic GETs
 * keep the cache warm — other consumers reading via the hook see updates
 * without firing their own fetch.
 */
export function setCachedBill(
  sessionId: string,
  cacheKey: string,
  bill: SessionBill | null,
): void {
  cache.set(sessionId, {
    key: cacheKey,
    promise: Promise.resolve(bill),
    bill,
  });
  notify();
}

/**
 * Drop the cached entry for a session (or all sessions when omitted).
 * Useful around session-end cleanup; not needed in normal flows.
 */
export function invalidateBillCache(sessionId?: string): void {
  if (sessionId !== undefined) cache.delete(sessionId);
  else cache.clear();
  notify();
}

/**
 * Synchronously read the last resolved bill, if any. Returns null when no
 * fetch has resolved yet for this session/key. Useful for SSR-friendly
 * initial render in hooks.
 */
export function peekCachedBill(
  sessionId: string,
  cacheKey: string,
): SessionBill | null {
  const existing = cache.get(sessionId);
  if (existing && existing.key === cacheKey) return existing.bill;
  return null;
}
