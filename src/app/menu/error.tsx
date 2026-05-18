'use client';

import { useEffect } from 'react';

export default function MenuError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[MenuPage] Error boundary caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F7F8F8] flex flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl mb-4">:(</div>
      <h2
        className="text-xl font-bold text-black mb-2"
        style={{ fontFamily: 'Lato, sans-serif' }}
      >
        Couldn&apos;t load the menu
      </h2>
      <p
        className="text-sm text-gray-500 mb-6"
        style={{ fontFamily: 'Lato, sans-serif' }}
      >
        Something went wrong while loading the menu. Please try again.
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 bg-brand text-white font-bold rounded-full text-sm"
        style={{ fontFamily: 'Lato, sans-serif' }}
      >
        Try Again
      </button>
    </div>
  );
}
