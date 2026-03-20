'use client';

import { usePathname } from 'next/navigation';
import Image from 'next/image';

/**
 * Footer visibility config.
 * Set a path to `false` to hide the footer on that page.
 * All pages show the footer by default.
 */
const FOOTER_HIDDEN_PAGES: string[] = [
  // '/some-page', // example: hide footer on a specific page
];

export function Footer() {
  const pathname = usePathname();

  // Hide footer on configured pages
  if (FOOTER_HIDDEN_PAGES.includes(pathname)) {
    return null;
  }

  return (
    <footer className="flex flex-col items-center gap-6 pt-[60px] pb-[90px]">
      {/* Powered by + Logo */}
      <div className="flex flex-col items-center gap-1">
        <span
          className="text-[10px] font-bold text-black"
          style={{ fontFamily: 'Lato, sans-serif' }}
        >
          Powered by
        </span>
        <Image
          src="/icons/morsel_text_logo.svg"
          alt="morsel"
          width={76}
          height={17}
          className="object-contain"
        />
      </div>

      {/* Legal text */}
      <p
        className="text-[10px] text-black text-center"
        style={{ fontFamily: 'Lato, sans-serif', lineHeight: 'normal' }}
      >
        By using morsel app, you agree to our{' '}
        <span className="font-bold">Privacy policy</span> and{' '}
        <span className="font-bold">Terms of Use.</span>
      </p>
    </footer>
  );
}
