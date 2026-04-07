/**
 * Peach Payments SDK Loader
 * Lazy-loads the Peach Payments checkout.js script with singleton pattern
 */

import { config } from '../config';

const SANDBOX_URL = 'https://sandbox-checkout.peachpayments.com/js/checkout.js';
const PRODUCTION_URL = 'https://checkout.peachpayments.com/js/checkout.js';

let sdkPromise: Promise<void> | null = null;

function getSDKUrl(): string {
  return config.peachPayments.sandbox ? SANDBOX_URL : PRODUCTION_URL;
}

/**
 * Preload the SDK script without executing it.
 * Call this early (e.g., when order page mounts) for zero-cost warm-up.
 */
export function prefetchSDK(): void {
  if (typeof document === 'undefined') return;

  const url = getSDKUrl();
  const existing = document.querySelector(`link[href="${url}"]`);
  if (existing) return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'script';
  link.href = url;
  document.head.appendChild(link);
}

/**
 * Load and execute the SDK script. Returns a singleton promise —
 * calling multiple times will not inject duplicate scripts.
 */
/**
 * Reset the SDK loader state. Used in tests when injecting a fake window.Checkout.
 */
export function resetSDKLoader(): void {
  sdkPromise = null;
}

export function loadSDK(): Promise<void> {
  if (sdkPromise) return sdkPromise;

  if (typeof window !== 'undefined' && window.Checkout) {
    sdkPromise = Promise.resolve();
    return sdkPromise;
  }

  sdkPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = getSDKUrl();
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      sdkPromise = null; // Allow retry on failure
      reject(new Error('Failed to load Peach Payments SDK'));
    };
    document.head.appendChild(script);
  });

  return sdkPromise;
}
