'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';

export default function FailurePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#F7F8F8] flex flex-col items-center justify-between px-6 py-10">
      {/* Main content */}
      <div className="flex flex-col items-center justify-center flex-1 gap-6">
        {/* Logo */}
        <Image
          src="/icons/morsel_logo.png"
          alt="morsel"
          width={60}
          height={60}
          className="object-contain"
        />

        {/* Status icon */}
        <div className="w-24 h-24 rounded-full bg-[#FEE2E2] flex items-center justify-center">
          <X className="w-12 h-12 text-[#DC2626]" strokeWidth={3} />
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h1
            className="text-[24px] font-bold text-black"
            style={{ fontFamily: 'Lato, sans-serif' }}
          >
            Something went wrong
          </h1>
          <p
            className="text-sm text-gray-500"
            style={{ fontFamily: 'Lato, sans-serif' }}
          >
            We couldn&apos;t process your request. Please try again.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col items-center gap-3 w-full max-w-xs mt-4">
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 bg-brand text-white text-sm font-bold rounded-[30px]"
            style={{ fontFamily: 'Lato, sans-serif' }}
          >
            Try Again
          </button>
          <button
            onClick={() => router.push('/')}
            className="text-sm font-semibold text-black underline"
            style={{ fontFamily: 'Lato, sans-serif' }}
          >
            Back to Menu
          </button>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
