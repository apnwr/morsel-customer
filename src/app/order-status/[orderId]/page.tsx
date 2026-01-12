"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

/**
 * Legacy Dynamic Route Redirect
 *
 * This route /order-status/[orderId] is deprecated.
 * All order status views have been unified into /cart.
 *
 * Old: /order-status/abc123
 * New: /cart?orderId=abc123
 */
export default function LegacyOrderStatusPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;

  useEffect(() => {
    if (orderId) {
      console.log("[LegacyOrderStatusPage] Redirecting to unified cart page:", orderId);
      router.replace(`/cart?orderId=${orderId}`);
    } else {
      router.replace("/cart");
    }
  }, [orderId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F8F8]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
