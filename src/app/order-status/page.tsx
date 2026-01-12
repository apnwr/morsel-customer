"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Order Status Redirect Page
 *
 * This page has been replaced by the unified cart page at /cart.
 * It now redirects to /cart with the orderId as a query parameter.
 *
 * Backward compatibility: Old links to /order-status?orderId=xxx will redirect to /cart?orderId=xxx
 */
function OrderStatusRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const orderId = searchParams.get("orderId");
    const redirectUrl = orderId ? `/cart?orderId=${orderId}` : "/cart";

    console.log("[OrderStatus] Redirecting to unified cart page:", redirectUrl);
    router.replace(redirectUrl);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F8F8]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}

export default function OrderStatusRedirect() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8F8]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <OrderStatusRedirectContent />
    </Suspense>
  );
}
