'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/contexts/SessionContext';
import { useRestaurant } from '@/contexts/RestaurantContext';

export default function HomePage() {
  const router = useRouter();
  const { sessionData } = useSession();
  const { context } = useRestaurant();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger fade-in animation
    const fadeTimer = setTimeout(() => {
      setIsVisible(true);
    }, 10);

    // Check if user already has an active session
    if (sessionData?.session?.id && context) {
      console.log('[HomePage] ✅ Active session found, redirecting to menu');
      const redirectTimer = setTimeout(() => {
        router.push('/menu');
      }, 1500);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(redirectTimer);
      };
    }

    return () => {
      clearTimeout(fadeTimer);
    };
  }, [router, sessionData, context]);

  // If user has active session, show loading
  if (sessionData?.session?.id && context) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div
          className={`flex flex-col items-center transition-opacity duration-700 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <h1 className="text-5xl font-bold text-purple-600">morsel</h1>
          <p className="text-sm text-gray-500 mt-2">Enjoy every meal, not the math.</p>
        </div>
      </div>
    );
  }

  // No active session - show QR code scan prompt
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6">
      <div
        className={`flex flex-col w-full items-center text-center transition-opacity duration-700 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <h1 className="text-5xl font-bold text-purple-600 mb-4">morsel</h1>
        <p className="text-sm text-gray-500 mb-12">Enjoy every meal, not the math.</p>

        {/* QR Code Icon */}
        <div className="mb-8">
          <svg
            className="w-32 h-32 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
            />
          </svg>
        </div>

        {/* Instructions */}
        <h2 className="text-2xl font-semibold text-gray-800 mb-3">
          Please Scan QR Code
        </h2>
        <p className="text-gray-600">
          To start ordering, scan the QR code on your table using your camera app.
        </p>

        {/* Development Note - Remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              <strong>Development Mode:</strong> QR codes should contain URLs like:
              <br />
              <code className="text-xs">yourapp.com/space/[spaceId]</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
