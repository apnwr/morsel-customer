'use client';

/**
 * CheckoutSkeleton
 * Mimics a payment form shape while the Peach Payments SDK loads.
 */

export function CheckoutSkeleton({ message }: { message?: string }) {
  return (
    <div className="flex flex-col gap-4 p-6 animate-pulse">
      {/* Card number field */}
      <div className="space-y-2">
        <div className="h-3 w-24 bg-gray-200 rounded" />
        <div className="h-12 w-full bg-gray-100 rounded-lg" />
      </div>

      {/* Expiry + CVV row */}
      <div className="flex gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-3 w-16 bg-gray-200 rounded" />
          <div className="h-12 w-full bg-gray-100 rounded-lg" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-3 w-12 bg-gray-200 rounded" />
          <div className="h-12 w-full bg-gray-100 rounded-lg" />
        </div>
      </div>

      {/* Name on card */}
      <div className="space-y-2">
        <div className="h-3 w-28 bg-gray-200 rounded" />
        <div className="h-12 w-full bg-gray-100 rounded-lg" />
      </div>

      {/* Submit button */}
      <div className="h-12 w-full bg-gray-200 rounded-lg mt-2" />

      {/* Loading message */}
      {message && (
        <p className="text-sm text-gray-500 text-center">{message}</p>
      )}
    </div>
  );
}
