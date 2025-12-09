'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SplashScreen() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Hardcoded space_id for testing (will be replaced by QR code scan)
    const HARDCODED_SPACE_ID = 'MzIc4dAkf8Z4Aw9DKHAY';

    // Trigger fade-in animation asynchronously to avoid cascading renders
    const fadeTimer = setTimeout(() => {
      setIsVisible(true);
    }, 10);

    // Auto-redirect to space page after 1.5 seconds
    const redirectTimer = setTimeout(() => {
      router.push(`/space/${HARDCODED_SPACE_ID}`);
    }, 1500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(redirectTimer);
    };
  }, [router]);

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
