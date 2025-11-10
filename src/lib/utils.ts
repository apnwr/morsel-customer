/**
 * Utility functions for MORSEL Customer App
 */

type ClassValue = string | number | boolean | undefined | null | ClassValue[];

/**
 * Merge class names (utility for conditional classes)
 */
export function cn(...inputs: ClassValue[]): string {
  return inputs
    .flat()
    .filter((x) => typeof x === 'string' && x.length > 0)
    .join(' ');
}

/**
 * Format currency value
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format time in minutes and seconds
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format time in a human-readable way (e.g., "23 mins")
 */
export function formatTimeHuman(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  if (mins === 0) return `${seconds} secs`;
  return `${mins} min${mins !== 1 ? 's' : ''}`;
}

/**
 * Generate a random ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a random number between min and max (inclusive)
 */
export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  return input.trim().slice(0, 200);
}

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely parse JSON from localStorage
 */
export function safeJSONParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, percentage: number): number {
  return value * percentage;
}

/**
 * Round to 2 decimal places
 */
export function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}
