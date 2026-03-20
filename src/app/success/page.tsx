'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';

export default function SuccessPage() {
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
        <div className="w-24 h-24 rounded-full bg-[#D1FAE5] flex items-center justify-center">
          <Check className="w-12 h-12 text-[#059669]" strokeWidth={3} />
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h1
            className="text-[24px] font-bold text-black"
            style={{ fontFamily: 'Lato, sans-serif' }}
          >
            Order Placed!
          </h1>
          <p
            className="text-sm text-gray-500"
            style={{ fontFamily: 'Lato, sans-serif' }}
          >
            Your order has been successfully placed. Sit back and relax!
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col items-center gap-3 w-full max-w-xs mt-4">
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 bg-black text-white text-sm font-bold rounded-[30px]"
            style={{ fontFamily: 'Lato, sans-serif' }}
          >
            Back to Menu
          </button>
          <button
            onClick={() => router.push('/')}
            className="text-sm font-semibold text-black underline"
            style={{ fontFamily: 'Lato, sans-serif' }}
          >
            View Order Status
          </button>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
