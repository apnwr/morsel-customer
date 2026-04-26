'use client';

/**
 * LoadingScreen — branded full-screen loading state.
 *
 * Renders the Morsel logo with a gentle breath animation and an animated
 * "Loading…" caption. CSS keyframes only — no JS animation loop, no
 * framer-motion. Respects `prefers-reduced-motion` (handled globally in
 * globals.css). Image is loaded with `priority` so this screen paints
 * fast on cold starts.
 */

import Image from 'next/image';

interface LoadingScreenProps {
  /** Caption shown under the logo. Defaults to "Loading". */
  message?: string;
  /**
   * 'fixed' (default) covers the full viewport with z-index 50.
   * 'inline' fills its parent (use inside flex/grid layouts).
   */
  variant?: 'fixed' | 'inline';
}

export function LoadingScreen({
  message = 'Loading',
  variant = 'fixed',
}: LoadingScreenProps) {
  const containerCls =
    variant === 'fixed'
      ? 'fixed inset-0 z-50 bg-[#F7F8F8] flex flex-col items-center justify-center gap-4'
      : 'w-full h-full min-h-[60vh] bg-[#F7F8F8] flex flex-col items-center justify-center gap-4';

  return (
    <div className={containerCls} role="status" aria-live="polite">
      <Image
        src="/icons/morsel_logo.png"
        alt=""
        width={80}
        height={74}
        priority
        className="animate-morsel-breath"
        aria-hidden="true"
      />
      <p
        className="flex items-baseline text-base font-medium text-gray-500 tracking-wide"
        style={{ fontFamily: 'Lato, sans-serif' }}
      >
        <span>{message}</span>
        <span className="morsel-loading-dots ml-0.5" aria-hidden="true">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </p>
      <span className="sr-only">{message}</span>
    </div>
  );
}
