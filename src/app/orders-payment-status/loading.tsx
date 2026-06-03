import { LoadingScreen } from '@/components/ui/LoadingScreen';

/**
 * Next.js convention: loading UI for /orders. Also imported as
 * `OrdersLoading` by /payment for its Suspense fallback and by
 * /orders/page.tsx for its in-page loading state — keeping the default
 * export shape preserves those consumers.
 *
 * Uses the shared branded LoadingScreen for consistency with the rest of
 * the app's page-level loading states.
 */
export default function OrdersLoading() {
  return <LoadingScreen />;
}
