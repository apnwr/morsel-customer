'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SplashScreen() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger fade-in animation
    setIsVisible(true);

    // Auto-redirect to login after 1.5 seconds
    const timer = setTimeout(() => {
      router.push('/login');
    }, 1500);

    return () => clearTimeout(timer);
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
